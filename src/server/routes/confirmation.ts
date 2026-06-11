/**
 * ANFSF Human Confirmation API
 *
 * GET    /api/v1/confirmation              — List pending confirmations
 * GET    /api/v1/confirmation/history      — Confirmation history
 * GET    /api/v1/confirmation/:id          — Get confirmation detail
 * POST   /api/v1/confirmation              — Create confirmation
 * POST   /api/v1/confirmation/:id/approve  — Approve
 * POST   /api/v1/confirmation/:id/reject   — Reject
 * POST   /api/v1/confirmation/:id/modify   — Request modification
 * POST   /api/v1/confirmation/batch-approve — Batch approve
 */

import { FastifyInstance } from 'fastify';
import {
  HumanConfirmation,
  type ConfirmationRequest,
  type ConfirmationResponse,
  type ModificationRequest,
} from '../../core/evolution/human-confirmation';
import type { EvolutionProposal } from '../../core/evolution/framework';

const confirmation = new HumanConfirmation();

export function registerConfirmationRoutes(app: FastifyInstance): void {
  // List pending confirmations
  app.get('/api/v1/confirmation', async (_request, _reply) => {
    const pending: ConfirmationRequest[] = [];
    for (const [, req] of (confirmation as any).requests) {
      if (req.status === 'pending') pending.push(req);
    }
    return { confirmations: pending };
  });

  // Confirmation history
  app.get('/api/v1/confirmation/history', async (_request, _reply) => {
    return { history: confirmation.getHistory() };
  });

  // Get confirmation detail
  app.get('/api/v1/confirmation/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const req = confirmation.getRequest(id);
    if (!req) {
      return reply.code(404).send({ error: 'Confirmation request not found', id });
    }
    return { confirmation: req };
  });

  // Create confirmation
  app.post('/api/v1/confirmation', async (request, reply) => {
    const body = request.body as {
      description: string;
      kpiImpact?: Record<string, number>;
      budgetImpact?: number;
      riskScore?: number;
      reviewer?: string;
      timeoutMs?: number;
      allowBatchApproval?: boolean;
    };
    if (!body.description) {
      return reply.code(400).send({ error: 'Bad Request', details: ['description is required'] });
    }
    const proposal: EvolutionProposal = {
      id: `prop-${Date.now()}`,
      description: body.description,
      kpiImpact: body.kpiImpact || {},
      budgetImpact: body.budgetImpact ?? 0,
      riskScore: body.riskScore ?? 0.5,
      changes: [],
    };
    const req = confirmation.createRequest(proposal, {
      reviewer: body.reviewer,
      timeoutMs: body.timeoutMs,
      allowBatchApproval: body.allowBatchApproval,
    });
    return reply.code(201).send({ confirmation: req });
  });

  // Approve
  app.post('/api/v1/confirmation/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { reviewer?: string; comments?: string } | undefined;
    const reviewer = body?.reviewer || 'system';
    const res = confirmation.approve(id, reviewer, body?.comments);
    if (!res) {
      return reply.code(404).send({ error: 'Confirmation not found or not pending', id });
    }
    return { confirmation: res };
  });

  // Reject
  app.post('/api/v1/confirmation/:id/reject', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { reviewer?: string; comments?: string } | undefined;
    const reviewer = body?.reviewer || 'system';
    const res = confirmation.reject(id, reviewer, body?.comments);
    if (!res) {
      return reply.code(404).send({ error: 'Confirmation not found or not pending', id });
    }
    return { confirmation: res };
  });

  // Modify
  app.post('/api/v1/confirmation/:id/modify', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      reviewer?: string;
      comments?: string;
      modifications: ModificationRequest[];
    };
    if (!body.modifications || !Array.isArray(body.modifications)) {
      return reply.code(400).send({ error: 'Bad Request', details: ['modifications array is required'] });
    }
    const reviewer = body.reviewer || 'system';
    const res = confirmation.modify(id, reviewer, body.modifications, body.comments);
    if (!res) {
      return reply.code(404).send({ error: 'Confirmation not found or not pending', id });
    }
    return { confirmation: res };
  });

  // Batch approve
  app.post('/api/v1/confirmation/batch-approve', async (request, reply) => {
    const body = request.body as { ids: string[]; reviewer?: string; comments?: string } | undefined;
    if (!body?.ids || !Array.isArray(body.ids)) {
      return reply.code(400).send({ error: 'Bad Request', details: ['ids array is required'] });
    }
    const reviewer = body.reviewer || 'system';
    const result = confirmation.batchApprove(body.ids, reviewer, body.comments);
    return { result };
  });
}
