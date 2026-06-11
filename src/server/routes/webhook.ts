/**
 * ANFSF Server — Gitea Webhook Route
 *
 * Receives push events from Gitea, validates and deduplicates,
 * then triggers the code annotation pipeline.
 *
 * Task: T-201
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { GiteaClient } from '../../integrations/gitea-client';

// ============================================================================
// In-memory dedup store (Phase 1 — replace with DB in Phase 3)
// ============================================================================

const processedDeliveries = new Set<string>();
const MAX_DELIVERY_CACHE = 10_000;

function markProcessed(deliveryId: string): void {
  if (processedDeliveries.size >= MAX_DELIVERY_CACHE) {
    // Evict oldest entries (simple FIFO approximation)
    const toDelete = Math.floor(MAX_DELIVERY_CACHE * 0.2);
    let count = 0;
    for (const id of processedDeliveries) {
      if (count >= toDelete) break;
      processedDeliveries.delete(id);
      count++;
    }
  }
  processedDeliveries.add(deliveryId);
}

// ============================================================================
// Route Registration
// ============================================================================

export interface WebhookHandler {
  /** Called when a valid, non-duplicate push event is received */
  onPush: (event: ReturnType<typeof GiteaClient.parseWebhookPayload>) => Promise<void>;
}

export function registerWebhookRoute(
  app: FastifyInstance,
  handler: WebhookHandler,
): void {
  /**
   * POST /api/webhook/gitea
   *
   * Receives Gitea push events. Headers:
   *   X-Gitea-Event: push
   *   X-Gitea-Delivery: <uuid>
   */
  app.post('/api/webhook/gitea', async (request: FastifyRequest, reply: FastifyReply) => {
    // Validate event type
    const eventType = request.headers['x-gitea-event'];
    if (eventType !== 'push') {
      // Non-push events are acknowledged but ignored for now
      return reply.code(200).send({ status: 'ignored', reason: `event type: ${eventType}` });
    }

    // Validate delivery ID
    const deliveryId = request.headers['x-gitea-delivery'] as string | undefined;
    if (!deliveryId) {
      return reply.code(400).send({ status: 'error', message: 'Missing X-Gitea-Delivery header' });
    }

    // Dedup check
    if (GiteaClient.isDuplicate(deliveryId, processedDeliveries)) {
      return reply.code(200).send({ status: 'duplicate', deliveryId });
    }

    try {
      const payload = GiteaClient.parseWebhookPayload(
        typeof request.body === 'string' ? request.body : JSON.stringify(request.body),
      );

      markProcessed(deliveryId);

      // Fire-and-forget: trigger handler asynchronously
      handler.onPush(payload).catch(err => {
        console.error('[webhook] handler error:', err);
      });

      return reply.code(200).send({
        status: 'ok',
        deliveryId,
        commits: payload.commits.length,
      });
    } catch (error) {
      return reply.code(400).send({
        status: 'error',
        message: error instanceof Error ? error.message : 'Invalid payload',
      });
    }
  });
}
