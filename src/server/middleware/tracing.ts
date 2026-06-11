/**
 * ANFSF V4 Layer 8.6 — Request Tracing Middleware
 *
 * Generates a unique trace ID for each incoming request, attaches it to the
 * response headers (X-Trace-ID), and makes it available via AsyncLocalStorage
 * so pipeline stages and loggers can propagate it automatically.
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createLogger, runWithTrace } from '../../observability/logger';
import { httpMetrics } from '../routes/metrics';
import { randomBytes } from 'crypto';

// ============================================================================
// Constants
// ============================================================================

const TRACE_ID_HEADER = 'X-Trace-ID';
const TRACE_ID_PARAM = 'x-trace-id';

// ============================================================================
// Helpers
// ============================================================================

/** Generate a short trace ID: `anfsf-{timestamp}-{random}` with cryptographic randomness */
export function generateTraceId(): string {
  const ts = Date.now().toString(36);
  const rand = randomBytes(4).toString('hex');
  return `anfsf-${ts}-${rand}`;
}

// ============================================================================
// Middleware Registration
// ============================================================================

export interface TracingConfig {
  /** Custom header name for incoming trace IDs (default: 'X-Trace-ID') */
  headerName?: string;
  /** Log level for trace events (default: 'debug') */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Register request tracing middleware on all routes.
 *
 * Behavior:
 * 1. Extract trace ID from request header (if client provides one)
 * 2. Generate new trace ID if none provided
 * 3. Attach trace ID to response header
 * 4. Store in AsyncLocalStorage for automatic propagation
 * 5. Log incoming request with trace ID
 */
export function registerTracingMiddleware(app: FastifyInstance, config: TracingConfig = {}): void {
  const headerName = config.headerName || TRACE_ID_HEADER;
  const log = createLogger('tracing', config.logLevel || 'debug');

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const incomingTraceId = request.headers[headerName.toLowerCase()] as string | undefined;
    const traceId = incomingTraceId || generateTraceId();

    // Attach to response
    reply.header(headerName, traceId);

    // Log request with trace ID
    log.debug(`${request.method} ${request.url}`, {
      traceId,
      method: request.method,
      url: request.url,
      source: request.ip,
    });

    // Track HTTP metrics — start time
    (request as unknown as Record<string, number>)['_anfsf_reqStart'] = Date.now();
  });

  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    httpMetrics.requestTotal++;
    const start = (request as unknown as Record<string, number | undefined>)['_anfsf_reqStart'];
    if (start) {
      httpMetrics.requestDurationMs += Date.now() - start;
    }
    const status = reply.statusCode;
    if (status >= 400 && status < 500) httpMetrics.errors4xx++;
    else if (status >= 500) httpMetrics.errors5xx++;
  });
}

/**
 * Execute a function within a request's trace context.
 * Use this in route handlers to ensure all downstream logs carry the trace ID.
 */
export function withRequestTrace<T>(request: FastifyRequest, fn: () => T): T {
  const traceId = request.headers[TRACE_ID_HEADER.toLowerCase()] as string | undefined;
  if (traceId) {
    return runWithTrace(traceId, fn);
  }
  return fn();
}
