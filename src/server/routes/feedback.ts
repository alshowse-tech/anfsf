/**
 * ANFSF Feedback & Optimization API (T-303)
 *
 * GET    /api/v1/feedback/lessons       — List retrospective lessons
 * POST   /api/v1/feedback/lessons       — Add a lesson (auto-creates FixRecord for UI/UX issues)
 * GET    /api/v1/feedback/fixes         — List fix records
 * PATCH  /api/v1/feedback/fixes/:id     — Update fix status
 * GET    /api/v1/feedback/snapshots     — List version snapshots
 * POST   /api/v1/feedback/snapshots     — Create snapshot
 * POST   /api/v1/feedback/rollback      — Execute rollback
 * GET    /api/v1/feedback/freeze        — Check freeze status
 * POST   /api/v1/feedback/freeze        — Create freeze
 * DELETE /api/v1/feedback/freeze/:id    — Cancel freeze
 */

import { FastifyInstance } from 'fastify';
import {
  RetrospectiveEngine,
  type Lesson,
} from '../../skills/retrospective-engine';
import { RollbackManager } from '../../core/evolution/rollback-manager';
import type { EvolutionProposal } from '../../core/evolution/framework';
import { FreezeManager, type FreezeType } from '../../core/evolution/freeze-manager';
import { FixEngine, type FixRecord, type FixLevel, type ProblemType } from '../../pipeline/fix-engine';

const retrospective = new RetrospectiveEngine();
const rollback = new RollbackManager();
const freezeManager = new FreezeManager();

const lessons: Lesson[] = [];
const fixRecords: FixRecord[] = [];

export function registerFeedbackRoutes(app: FastifyInstance, fixEngine?: FixEngine): void {
  // --- Lessons ---

  app.get('/api/v1/feedback/lessons', async (request, reply) => {
    const query = request.query as { category?: string; limit?: string } | undefined;
    const limit = query?.limit ? parseInt(query.limit, 10) : 50;
    const category = query?.category as Lesson['category'] | undefined;
    let filtered = [...lessons];
    if (category) filtered = filtered.filter(l => l.category === category);
    return { lessons: filtered.slice(0, limit), total: filtered.length };
  });

  app.post('/api/v1/feedback/lessons', async (request, reply) => {
    const body = request.body as {
      category: Lesson['category'];
      title: string;
      description: string;
      action: Lesson['action'];
      confidence?: number;
      projectId?: string;
      file?: string;
      line?: number;
    };
    if (!body.category || !body.title || !body.description || !body.action) {
      return reply.code(400).send({ error: 'Bad Request', details: ['category, title, description, and action are required'] });
    }
    const lesson: Lesson = {
      category: body.category,
      title: body.title,
      description: body.description,
      action: body.action,
      confidence: body.confidence ?? 0.8,
    };
    lessons.push(lesson);

    // Auto-create FixRecord for UI/UX/quality feedback attached to a project
    if (fixEngine && body.projectId && ['ux', 'quality', 'performance'].includes(body.category)) {
      const categoryToProblem: Record<string, ProblemType> = {
        ux: 'conditional_flaw',
        quality: 'style_deviation',
        performance: 'algorithm_issue',
      };
      const fixResult = fixEngine.createFix({
        projectId: body.projectId,
        source: body.action === 'avoid' ? 'modified' : 'generated',
        problemType: categoryToProblem[body.category] || 'style_deviation',
        file: body.file || 'unknown',
        line: body.line || 0,
        description: '[PM Feedback] ' + body.description,
        feedbackId: `lesson_${Date.now()}`,
      });
      fixRecords.push(fixResult.record);
    }

    return reply.code(201).send({ lesson });
  });

  // --- Fix Records ---

  app.get('/api/v1/feedback/fixes', async (request, reply) => {
    const query = request.query as { projectId?: string; status?: string } | undefined;
    let filtered = [...fixRecords];
    if (query?.projectId) filtered = filtered.filter(f => f.projectId === query.projectId);
    if (query?.status) filtered = filtered.filter(f => f.fixStatus === query.status);
    return { fixes: filtered, total: filtered.length };
  });

  app.patch('/api/v1/feedback/fixes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { fixStatus?: FixRecord['fixStatus']; fixedBy?: string };
    const fix = fixRecords.find(f => f.id === id);
    if (!fix) return reply.code(404).send({ error: 'Fix record not found', id });
    if (body.fixStatus) fix.fixStatus = body.fixStatus;
    if (body.fixedBy) { fix.fixedBy = body.fixedBy; fix.fixedAt = Date.now(); }
    return { fix };
  });

  // --- Snapshots ---

  app.get('/api/v1/feedback/snapshots', async (_request, _reply) => {
    const snapshots = rollback.getAllSnapshots();
    return { snapshots };
  });

  app.post('/api/v1/feedback/snapshots', async (request, reply) => {
    const body = request.body as { description: string; riskScore?: number; budgetImpact?: number; state?: Record<string, unknown>; kpiSnapshot?: Record<string, number> };
    if (!body.description) return reply.code(400).send({ error: 'Bad Request', details: ['description is required'] });
    const snapshot = rollback.createSnapshot(
      { id: `snap-${Date.now()}`, description: body.description, kpiImpact: {} as EvolutionProposal['kpiImpact'], riskScore: body.riskScore ?? 0.3, budgetImpact: body.budgetImpact ?? 0, changes: [] },
      body.state || {},
      body.kpiSnapshot || {},
      [],
    );
    return reply.code(201).send({ snapshot });
  });

  // --- Rollback ---

  app.post('/api/v1/feedback/rollback', async (request, reply) => {
    const body = request.body as { targetVersion: string; reason?: string; currentState?: Record<string, unknown> };
    if (!body.targetVersion) return reply.code(400).send({ error: 'Bad Request', details: ['targetVersion is required'] });
    const plan = rollback.planRollback(body.targetVersion, body.currentState || {});
    if (!plan) return reply.code(404).send({ error: 'Snapshot not found', targetVersion: body.targetVersion });
    return { plan };
  });

  app.post('/api/v1/feedback/rollback/execute', async (request, reply) => {
    const body = request.body as { plan: unknown };
    if (!body.plan) return reply.code(400).send({ error: 'Bad Request', details: ['plan is required'] });
    const result = await rollback.executeRollback(body.plan as any, async () => {});
    return { execution: result };
  });

  // --- Freeze ---

  app.get('/api/v1/feedback/freeze', async (_request, _reply) => {
    const status = freezeManager.check();
    return { freeze: status };
  });

  app.post('/api/v1/feedback/freeze', async (request, reply) => {
    const body = request.body as { type: FreezeType; reason: string; durationMs?: number; endAt?: number; createdBy?: string };
    if (!body.type || !body.reason) return reply.code(400).send({ error: 'Bad Request', details: ['type and reason are required'] });
    const entry = freezeManager.createFreeze({ type: body.type, reason: body.reason, durationMs: body.durationMs, endAt: body.endAt, createdBy: body.createdBy || 'system' });
    return reply.code(201).send({ freeze: entry });
  });

  app.delete('/api/v1/feedback/freeze/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const cancelled = freezeManager.cancelFreeze(id);
    if (!cancelled) return reply.code(404).send({ error: 'Freeze not found', id });
    return { message: 'Freeze cancelled' };
  });
}
