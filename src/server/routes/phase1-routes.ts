/**
 * ANFSF Server — Phase 1 Integrated Routes (I-003, I-005, I-006)
 *
 * Consolidates:
 *   I-003: Requirement confirmation (lock → trigger skeleton generation)
 *   I-005: Test feedback → Fix engine (L1/L2/L3)
 *   I-006: Release check → Archive
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PipelineRunStore } from '../store';
import type { PostgresPipelineRunStore } from '../store-postgres';
import { FixEngine } from '../../pipeline/fix-engine';
import { RegressionRunner } from '../../pipeline/regression-runner';
import { ReleaseCheck } from '../../pipeline/release-check';
import { Archiver } from '../../pipeline/archiver';
import type { CodeSource } from '../../pipeline/code-annotator';
import type { ProblemType } from '../../pipeline/fix-engine';

// ============================================================================
// Types
// ============================================================================

interface ConfirmRequest {
  version: string;
  confirmedItems: Array<{
    itemId: string;
    action: 'confirmed' | 'modified' | 'rejected';
    modifiedValue?: string;
    note?: string;
  }>;
}

interface FeedbackRequest {
  testCaseId: string;
  result: 'passed' | 'failed';
  failureDetails?: {
    category: 'missing_feature' | 'behavior_mismatch' | 'style_issue' | 'performance' | 'other';
    description: string;
  };
  file?: string;
  line?: number;
}

interface ReleaseRequest {
  pmConfirmed: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function problemTypeFromCategory(cat: string): ProblemType {
  switch (cat) {
    case 'style_issue': return 'style_deviation';
    case 'behavior_mismatch': return 'conditional_flaw';
    case 'missing_feature': return 'business_logic';
    case 'performance': return 'algorithm_issue';
    default: return 'business_logic';
  }
}

// ============================================================================
// Route Registration
// ============================================================================

export function registerPhase1Routes(
  app: FastifyInstance,
  store: PipelineRunStore | PostgresPipelineRunStore,
): void {
  const fixEngine = new FixEngine();
  const regRunner = new RegressionRunner();
  const releaseCheck = new ReleaseCheck();
  const archiver = new Archiver();

  // In-memory stores for Phase 1 (DB-backed in Phase 3)
  const requirementStore = new Map<string, { version: string; items: unknown[]; lockedAt: number }>();
  const fixRecordsStore = new Map<string, import('../../pipeline/fix-engine').FixRecord[]>();
  const testResultsStore = new Map<string, Array<{ testId: string; passed: boolean }>>();

  // ==========================================================================
  // I-003: Requirement Confirmation
  // ==========================================================================

  app.put('/api/v1/pipeline/:jobId/requirements/confirm',
    async (request: FastifyRequest<{ Params: { jobId: string }; Body: ConfirmRequest }>, reply: FastifyReply) => {
      const { jobId } = request.params;
      const { version, confirmedItems } = request.body;

      const run = await store.getRun(jobId);
      if (!run) return reply.code(404).send({ error: 'NOT_FOUND', message: 'Project not found' });

      requirementStore.set(jobId, {
        version,
        items: confirmedItems,
        lockedAt: Date.now(),
      });

      return reply.code(200).send({
        status: 'ok',
        data: { version, lockedAt: new Date().toISOString(), lockedBy: 'pm' },
      });
    },
  );

  // ==========================================================================
  // I-005: Test Feedback → Fix Engine
  // ==========================================================================

  app.post('/api/v1/pipeline/:jobId/feedback',
    async (request: FastifyRequest<{ Params: { jobId: string }; Body: FeedbackRequest }>, reply: FastifyReply) => {
      const { jobId } = request.params;
      const fb = request.body;

      const run = await store.getRun(jobId);
      if (!run) return reply.code(404).send({ error: 'NOT_FOUND', message: 'Project not found' });

      // Determine code source based on file
      const source: CodeSource = fb.file
        ? (fb.file.includes('services/') || fb.file.includes('new') ? 'new' : 'generated')
        : 'generated';

      const problemType = fb.failureDetails
        ? problemTypeFromCategory(fb.failureDetails.category)
        : 'business_logic';

      const fix = fixEngine.createFix({
        projectId: jobId,
        source,
        problemType,
        file: fb.file || 'unknown',
        line: fb.line || 0,
        description: fb.failureDetails?.description || fb.testCaseId,
        testCaseId: fb.testCaseId,
      });

      // Store fix record
      const existing = fixRecordsStore.get(jobId) || [];
      existing.push(fix.record);
      fixRecordsStore.set(jobId, existing);

      return reply.code(200).send({
        status: 'ok',
        data: {
          feedbackId: fix.record.id,
          fixLevel: fix.level,
          fixStatus: fix.record.fixStatus,
          action: fix.action,
          suggestedDiff: fix.suggestedDiff,
        },
      });
    },
  );

  // ==========================================================================
  // I-005b: Confirm Fix
  // ==========================================================================

  app.put('/api/v1/pipeline/:jobId/fix/:fixId/confirm',
    async (request: FastifyRequest<{ Params: { jobId: string; fixId: string }; Body: { confirmedBy: string } }>, reply: FastifyReply) => {
      const { jobId, fixId } = request.params;
      const records = fixRecordsStore.get(jobId) || [];
      const record = records.find(r => r.id === fixId);

      if (!record) return reply.code(404).send({ error: 'NOT_FOUND', message: 'Fix record not found' });

      fixEngine.confirmFix(record, request.body.confirmedBy || 'pm');

      // Run regression
      const testResults = testResultsStore.get(jobId) || [];
      const regResult = await regRunner.run(jobId, record, testResults);

      return reply.code(200).send({
        status: 'ok',
        data: {
          fixStatus: 'confirmed',
          regression: {
            passed: regResult.passed,
            newFailures: regResult.newFailures,
          },
        },
      });
    },
  );

  // ==========================================================================
  // I-006: Release Check
  // ==========================================================================

  app.post('/api/v1/pipeline/:jobId/release',
    async (request: FastifyRequest<{ Params: { jobId: string }; Body: ReleaseRequest }>, reply: FastifyReply) => {
      const { jobId } = request.params;

      const run = await store.getRun(jobId);
      if (!run) return reply.code(404).send({ error: 'NOT_FOUND', message: 'Project not found' });

      const fixRecords = fixRecordsStore.get(jobId) || [];
      const testResults = testResultsStore.get(jobId) || [];

      const check = releaseCheck.check({
        projectId: jobId,
        fixRecords,
        testResults,
        changeRequests: [],
        frontendConfirmed: true,   // Phase 1: single user confirms
        backendConfirmed: true,
      });

      return reply.code(200).send({
        status: 'ok',
        data: {
          releaseId: `rel_${Date.now()}`,
          checkResults: {
            systemCheck: { passed: check.layers.system.passed, details: check.layers.system.items },
            pmCheck: { passed: request.body.pmConfirmed },
            roleCheck: { frontend: 'confirmed', backend: 'confirmed' },
          },
          releasable: check.releasable,
          blockers: check.blockers,
        },
      });
    },
  );

  // ==========================================================================
  // I-006b: Archive (triggered after release)
  // ==========================================================================

  app.post('/api/v1/pipeline/:jobId/archive',
    async (request: FastifyRequest<{ Params: { jobId: string } }>, reply: FastifyReply) => {
      const { jobId } = request.params;

      const run = await store.getRun(jobId);
      if (!run) return reply.code(404).send({ error: 'NOT_FOUND', message: 'Project not found' });

      const result = archiver.archive({
        projectId: jobId,
        projectName: (run as any).projectName || 'Untitled',
        stages: [],
        fixRecords: fixRecordsStore.get(jobId) || [],
        annotations: [],
        tokenByStage: {},
        totalTokens: 0,
        startTimestamp: run.startedAt,
        endTimestamp: Date.now(),
      });

      return reply.code(200).send({
        status: 'ok',
        data: {
          metrics: result.metrics,
          candidates: result.candidates.length,
          snapshotVersion: result.snapshotVersion,
        },
      });
    },
  );
}
