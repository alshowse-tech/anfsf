/**
 * POST /api/v1/synthesize — Trigger pipeline run
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PipelineRunStore } from '../store';
import { ServerConfig } from '../index';
import { ProductPipeline, PipelineConfig, PipelineStep } from '../../pipeline/product-pipeline';

export interface SynthesizeRequest {
  prdText: string;
  config?: Partial<PipelineConfig>;
}

export interface SynthesizeResponse {
  jobId: string;
  status: 'queued' | 'running';
}

function generateId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function registerSynthesizeRoute(
  app: FastifyInstance,
  store: PipelineRunStore,
  serverConfig: ServerConfig
): void {
  app.post('/api/v1/synthesize', async (request: FastifyRequest<{ Body: SynthesizeRequest }>, reply: FastifyReply) => {
    const { prdText, config } = request.body;

    if (!prdText || typeof prdText !== 'string' || prdText.trim().length === 0) {
      return reply.badRequest('prdText is required and must be a non-empty string');
    }

    const jobId = generateId();
    store.createRun(jobId, prdText);

    // Build pipeline config
    const pipelineConfig: PipelineConfig = {
      apiKey: config?.apiKey || serverConfig.apiKey || '',
      model: config?.model || serverConfig.defaultModel,
      outputDir: config?.outputDir || './output',
      uiFramework: config?.uiFramework,
      uiLibrary: config?.uiLibrary,
      backendFramework: config?.backendFramework,
      enableGuardChecks: config?.enableGuardChecks ?? true,
      enableQualityGate: config?.enableQualityGate ?? true,
      enableReasoning: config?.enableReasoning ?? true,
      enableCompileValidation: config?.enableCompileValidation ?? true,
      enableCodeQualityGate: config?.enableCodeQualityGate ?? false,
      detailPolisherConfig: config?.detailPolisherConfig,
      qualityGateMinScore: config?.qualityGateMinScore,
      onProgress: (step: PipelineStep) => {
        store.updateRun(jobId, { status: 'running' });
        store.emitStep(jobId, step);
      },
    };

    // Run pipeline asynchronously
    (async () => {
      try {
        const pipeline = new ProductPipeline(pipelineConfig);
        const result = await pipeline.run({ prdText });
        store.updateRun(jobId, {
          status: result.success ? 'done' : 'failed',
          result: result.output ?? null,
          steps: result.steps,
          error: result.success ? null : (result.output?.errors.join('; ') ?? 'Unknown error'),
          completedAt: Date.now(),
        });
        store.completeRun(jobId, result.success);
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        store.updateRun(jobId, {
          status: 'failed',
          error: err,
          completedAt: Date.now(),
        });
        store.completeRun(jobId, false);
      }
    })();

    return reply.code(202).send({ jobId, status: 'running' } as SynthesizeResponse);
  });
}
