/**
 * POST /api/v1/synthesize — Trigger pipeline run (Agent Loop)
 * POST /api/v1/synthesize/multipart — Trigger pipeline with file attachments
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PipelineRunStore } from '../store';
import type { PostgresPipelineRunStore } from '../store-postgres';
import { ServerConfig } from '../index';
import { PipelineStep } from '../../pipeline/product-pipeline';
import { runWithTrace } from '../../observability/logger';
import { sanitizePRDText, detectPromptInjection } from '../../input-governance/sanitization';
import { LLMClient } from '../../integrations/llm-client';
import { GiteaClient } from '../../integrations/gitea-client';
import { AttachmentProcessor } from '../../input/attachment-processor';
import { mergePRDContent } from '../../input/merger';
import { validateAttachment, validateAttachmentMIME, sanitizeExtractedText } from '../../input/sanitization-attachments';
import { MAX_FILE_SIZE, MAX_ATTACHMENT_COUNT } from '../../input/attachment-types';
import { evaluatePRDQuality } from '../../prd/prd-quality-check';
import { AINativePRDParser } from '../../prd/prd-parser';
import { PipelineStateMachine } from '../../pipeline/pipeline-state-machine';
import { CodeGenerationLoop, BudgetExhaustedError, type RequirementSpec } from '../../agents/code-generation-loop';
import { TaskGenerator } from '../../pipeline/task-generator';
import { TokenBudget } from '../../pipeline/token-budget';
import * as fs from 'fs';
import * as path from 'path';

export interface SynthesizeRequest {
  prdText: string;
  projectName?: string;
}

export interface SynthesizeResponse {
  jobId: string;
  status: 'queued' | 'running';
}

const MAX_PRD_LENGTH = 100_000;

function generateId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeProjectName(name: string | undefined): string {
  if (!name || !name.trim()) return `project_${Date.now()}`;
  const sanitized = name.trim().replace(/[^a-zA-Z0-9一-鿿_\-\s]/g, '').replace(/\s+/g, '-').slice(0, 64);
  return sanitized || `project_${Date.now()}`;
}

function validateSynthesizeRequest(body: SynthesizeRequest): string[] {
  const errors: string[] = [];
  if (!body || typeof body !== 'object') { errors.push('Request body must be a JSON object'); return errors; }
  if (!body.prdText) { errors.push('prdText is required'); }
  else if (typeof body.prdText !== 'string') { errors.push('prdText must be a string'); }
  else if (body.prdText.trim().length === 0) { errors.push('prdText must be non-empty'); }
  else if (body.prdText.length > MAX_PRD_LENGTH) { errors.push(`prdText exceeds maximum length of ${MAX_PRD_LENGTH} characters (got ${body.prdText.length})`); }
  return errors;
}

export function registerSynthesizeRoute(
  app: FastifyInstance,
  store: PipelineRunStore | PostgresPipelineRunStore,
  serverConfig: ServerConfig,
  llm: LLMClient,
  attachmentProcessor?: AttachmentProcessor,
): void {
  // ==========================================================================
  // JSON endpoint
  // ==========================================================================
  app.post('/api/v1/synthesize', async (request: FastifyRequest<{ Body: SynthesizeRequest }>, reply: FastifyReply) => {
    const validationErrors = validateSynthesizeRequest(request.body);
    if (validationErrors.length > 0) {
      return reply.code(400).send({ error: 'Bad Request', details: validationErrors });
    }

    let { prdText, projectName } = request.body;

    const sanitization = sanitizePRDText(prdText, MAX_PRD_LENGTH);
    prdText = sanitization.sanitized;

    const injectionPatterns = detectPromptInjection(prdText);
    if (injectionPatterns.length > 0) {
      if (serverConfig.blockPromptInjections) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Request contains potential prompt injection patterns', patterns: injectionPatterns });
      }
      app.log?.warn?.(`[synthesize] Prompt injection patterns detected: ${injectionPatterns.join(', ')}`);
    }

    const safeName = sanitizeProjectName(projectName);
    const jobId = generateId();
    await store.createRun(jobId, prdText, safeName);

    return runAgentPipeline(app, store, jobId, prdText, safeName, llm, reply);
  });

  // ==========================================================================
  // Multipart endpoint
  // ==========================================================================
  app.post('/api/v1/synthesize/multipart', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!attachmentProcessor) {
      return reply.code(501).send({ error: 'Attachment processing not configured' });
    }

    let prdText = '';
    let rawName = '';
    const fileParts: { filename: string; mimeType: string; size: number; content: Buffer }[] = [];

    try {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'field' && part.fieldname === 'prdText') { prdText = part.value as string; }
        else if (part.type === 'field' && part.fieldname === 'projectName') { rawName = part.value as string; }
        else if (part.type === 'file') {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) { chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); }
          fileParts.push({ filename: part.filename, mimeType: part.mimetype, size: chunks.reduce((s, c) => s + c.length, 0), content: Buffer.concat(chunks) });
        }
      }
    } catch (e) {
      return reply.code(400).send({ error: 'Failed to parse multipart request', details: e instanceof Error ? e.message : String(e) });
    }

    if (!prdText.trim() && fileParts.length === 0) {
      return reply.code(400).send({ error: 'Bad Request', details: ['prdText or at least one file is required'] });
    }
    if (fileParts.length > MAX_ATTACHMENT_COUNT) {
      return reply.code(400).send({ error: 'Bad Request', details: [`Maximum ${MAX_ATTACHMENT_COUNT} files allowed`] });
    }

    const allErrors: string[] = [];
    const validFiles: typeof fileParts = [];
    for (const f of fileParts) {
      const result = validateAttachment(f.filename, f.mimeType, f.size);
      if (result.valid) {
        try { const detected = validateAttachmentMIME(f.content, f.filename); validFiles.push({ ...f, mimeType: detected }); }
        catch (e) { allErrors.push(e instanceof Error ? e.message : String(e)); }
      } else { allErrors.push(...result.errors); }
    }
    if (allErrors.length > 0) return reply.code(400).send({ error: 'Bad Request', details: allErrors });

    const extractions = await attachmentProcessor.process(validFiles.map(f => ({ filename: f.filename, mimeType: f.mimeType, size: f.size, content: f.content })));
    const enrichedText = mergePRDContent(prdText, extractions);
    if (!enrichedText.trim()) return reply.code(400).send({ error: 'Bad Request', details: ['No usable content found'] });

    const sanitization = sanitizePRDText(enrichedText, MAX_PRD_LENGTH);
    const finalText = sanitization.sanitized;

    const injectionPatterns = detectPromptInjection(finalText);
    if (injectionPatterns.length > 0 && serverConfig.blockPromptInjections) {
      return reply.code(400).send({ error: 'Bad Request', message: 'Request contains potential prompt injection patterns' });
    }

    const safeName = sanitizeProjectName(rawName);
    const jobId = generateId();
    await store.createRun(jobId, finalText, safeName);

    return runAgentPipeline(app, store, jobId, finalText, safeName, llm, reply);
  });
}

// ============================================================================
// Agent Loop Pipeline Runner (replaces old 17-layer ProductPipeline)
// ============================================================================

async function runAgentPipeline(
  app: FastifyInstance,
  store: PipelineRunStore | PostgresPipelineRunStore,
  jobId: string,
  prdText: string,
  projectName: string,
  llm: LLMClient,
  reply: FastifyReply,
) {
  const persistedSteps: PipelineStep[] = [];
  await store.updateRun(jobId, { status: 'running' });

  // Fire-and-forget async execution
  (async () => {
    await runWithTrace(jobId, async () => {
      const outputDir = path.resolve(`./output/${projectName}`);
      fs.mkdirSync(outputDir, { recursive: true });

      try {
        // Step 1: PRD Quality Pre-Check
        const quality = evaluatePRDQuality(prdText);
        persistedSteps.push({ name: `Quality: ${quality.score}/100 (${quality.level})`, duration: 0, status: 'ok' });
        store.emitStep(jobId, { name: `PRD Quality: ${quality.score}/100`, duration: 0, status: 'ok' });

        if (quality.triggerGuidedMode) {
          await store.updateRun(jobId, { status: 'done' as any, result: { guidedMode: true, quality, message: 'PRD quality too low. Try guided mode.' } as any, steps: persistedSteps });
          return;
        }

        const sm = new PipelineStateMachine(jobId);
        await sm.transition('stage1_parsing');

        // Step 2: LLM-based PRD analysis (deepseek-chat — tested: 6 features in 4s)
        // PRD parse is the first LLM call in the pipeline — it consumes from the budget.
        // Restore previous budget state from store if available.
        const budget = new TokenBudget(jobId, {
          totalBudget: parseInt(process.env.TOKEN_BUDGET || '5000000', 10),
          warnThreshold: 0.7,
          blockThreshold: 0.9,
          hardBlockThreshold: 1.35,
        });
        const savedRecords = await Promise.resolve(store.loadBudgetRecords(jobId));
        if (savedRecords && savedRecords.length > 0) {
          const savedUsed = savedRecords.reduce((sum: number, r: { tokens: { totalTokens: number } }) => sum + r.tokens.totalTokens, 0);
          budget.importState(savedRecords as any, savedUsed);
        }

        // Step 2: LLM-based PRD analysis (deepseek-chat, max_tokens=16384)
        // Pre-evaluate budget before LLM call
        const prdPreEval = budget.preEvaluate(16_384);
        if (prdPreEval.band === 'hardBlock') {
          await store.updateRun(jobId, { status: 'failed', error: 'Token budget hard cap reached before PRD analysis', completedAt: Date.now(), steps: persistedSteps });
          await store.completeRun(jobId, false);
          return;
        }

        const parser = new AINativePRDParser({ llmClient: llm, model: 'deepseek-chat' });
        const prd = await parser.parse(prdText);

        // Record actual PRD parse token consumption from LLM response
        if (parser.lastUsage) {
          budget.consumeSync(
            { promptTokens: parser.lastUsage.prompt_tokens, completionTokens: parser.lastUsage.completion_tokens, totalTokens: parser.lastUsage.total_tokens },
            'deepseek-chat',
            'prd-parse',
            'analysis',
          );
        } else {
          // Fallback estimate if usage not available
          const prdPromptTokens = Math.ceil(prdText.length / 4);
          budget.consumeSync(
            { promptTokens: prdPromptTokens, completionTokens: 4_096, totalTokens: prdPromptTokens + 4_096 },
            'deepseek-chat',
            'prd-parse',
            'analysis',
          );
        }

        const allFeatures = prd.features && prd.features.length > 0 ? prd.features : [
          { id: 'f1', name: projectName, description: prdText.slice(0, 100), priority: 'P0' as const, status: 'draft' as const },
        ];
        store.emitStep(jobId, { name: `PRD Analysis: ${allFeatures.length} features`, duration: 0, status: 'ok' });

        // Step 3: Agent Loop Skeleton Generation
        persistedSteps.push({ name: 'Agent Loop: Start', duration: 0, status: 'ok' });
        store.emitStep(jobId, { name: 'Agent Loop: Generating skeleton...', duration: 0, status: 'ok' });

        const agentLoop = new CodeGenerationLoop(llm, { maxRetries: 2, maxTokens: 32_768 }, budget);
        // Budget is wired into CodeGenerationLoop — every generate() and fix() call
        // is pre-evaluated and consumed against the project-level TokenBudget.
        const taskGenerator = new TaskGenerator();

        const spec: RequirementSpec = {
          intent: projectName,
          features: allFeatures.map((f: any) => ({ id: f.id, name: f.name, description: f.description || f.name, priority: f.priority || 'P0' })),
          deploymentForm: 'web',
          context: { prdText },  // Full PRD available for Agent Loop reference
        };

        const t0 = Date.now();
        const result = await agentLoop.run(spec, outputDir);
        const elapsed = Date.now() - t0;

        persistedSteps.push({ name: `Generated ${result.output.files.length} files in ${result.rounds} round(s)`, duration: elapsed, status: result.success ? 'ok' : 'error' });
        store.emitStep(jobId, { name: `Done: ${result.output.files.length} files`, duration: elapsed, status: result.success ? 'ok' : 'error' });

        // Step 3: Generate TASK.md
        if (result.output.files.length > 0) {
          const pkg = taskGenerator.generate(result.output);
          const md = taskGenerator.toMarkdown(pkg);
          fs.writeFileSync(path.join(outputDir, 'TASK_FRONTEND.md'), md.frontend, 'utf-8');
          fs.writeFileSync(path.join(outputDir, 'TASK_BACKEND.md'), md.backend, 'utf-8');
        }

        // Step 4: Push to Gitea (best effort)
        let giteaUrl: string | undefined;
        try {
          const gitea = new GiteaClient({
            baseUrl: process.env.GITEA_URL || 'http://localhost:3001',
            username: process.env.GITEA_USERNAME || 'anfsf',
            password: process.env.GITEA_PASSWORD || 'anfsf123',
          });
          const repo = await gitea.createRepo(projectName, `ANFSF: ${projectName}`);
          giteaUrl = repo.html_url;
          for (const file of result.output.files.slice(0, 50)) {
            await gitea.pushFile(projectName, file.path, file.content, 'main', `[ANFSF] Initial: ${file.path}`);
          }
        } catch {
          app.log?.warn?.('[synthesize] Gitea push skipped (offline?)');
        }

        // Step 5: Persist budget records via store for crash recovery
        try {
          if (store.saveBudgetRecords) {
            const exported = budget.export();
            store.saveBudgetRecords(jobId, exported.records);
          }
        } catch (e) {
          app.log?.warn?.('[synthesize] Budget persist failed');
        }

        await sm.transition('stage1_done');

        const ok = result.success || (result.output.files.length >= 5 && result.rounds > 0);
        const budgetReport = budget.getReport();
        await store.updateRun(jobId, {
          status: ok ? 'done' : 'failed',
          result: {
            files: result.output.files.map(f => ({ path: f.path, size: f.content.length, type: 'code' })),
            rounds: result.rounds,
            tokenUsage: result.tokenUsage,
            giteaUrl,
            message: result.message,
            budgetExhausted: result.budgetExhausted,
            budget: {
              used: budgetReport.used,
              total: budgetReport.totalBudget,
              usageRate: budgetReport.usageRate,
              remaining: budgetReport.remaining,
              estimatedCost: budgetReport.estimatedCost,
            },
          } as any,
          steps: persistedSteps,
          error: result.success ? null : result.message,
          completedAt: Date.now(),
        });
        await store.completeRun(jobId, ok);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await store.updateRun(jobId, { status: 'failed', error: msg, completedAt: Date.now(), steps: persistedSteps });
        await store.completeRun(jobId, false);
      }
    });
  })().catch(e => {
    const msg = e instanceof Error ? e.message : String(e);
    app.log?.error?.(`[synthesize] unhandled error ${jobId}: ${msg}`);
    void (async () => { try { await store.updateRun(jobId, { status: 'failed', error: msg, completedAt: Date.now() }); } catch {} try { await store.completeRun(jobId, false); } catch {} })();
  });

  return reply.code(202).send({ jobId, status: 'running' } as SynthesizeResponse);
}
