/**
 * ANFSF Server 鈥?Fastify HTTP API
 *
 * Exposes ANFSF pipeline as HTTP endpoints with SSE progress streaming
 * and Prometheus metrics.
 *
 * Database: SQLite (default) or PostgreSQL (when DATABASE_URL is set).
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import multipart from '@fastify/multipart';
import helmet from '@fastify/helmet';
import { registerSynthesizeRoute } from './routes/synthesize';
import { registerPipelineRoutes } from './routes/pipeline';
import { registerMetricsRoute, registerLLMMetrics, httpMetrics } from './routes/metrics';
import { registerHealthRoutes } from './routes/health';
import { registerConfirmationRoutes } from './routes/confirmation';
import { registerLLMPlaygroundRoutes } from './routes/llm-playground';
import { registerFeedbackRoutes } from './routes/feedback';
import { registerPhase1Routes } from './routes/phase1-routes';
import { registerAuthMiddleware } from './middleware/auth';
import { registerRateLimitMiddleware, type RateLimitConfig } from './middleware/rate-limit';
import { registerTracingMiddleware } from './middleware/tracing';
import { PipelineRunStore } from './store';
import { PostgresPipelineRunStore } from './store-postgres';
import { LLMClient } from '../integrations/llm-client';
import { GiteaClient } from '../integrations/gitea-client';
import { AttachmentProcessor } from '../input/attachment-processor';
import { createLogger } from '../observability/logger';
import * as path from 'path';
import { CheckpointManager, InMemoryCheckpointStore } from '../pipeline/checkpoint';
import { RoleManager } from './auth/roles';
import { registerWebhookRoute } from './routes/webhook';
import { registerKnowledgeRoutes } from './routes/knowledge';
import { registerDashboardRoutes } from './routes/dashboard';
import { registerUATRoutes } from './routes/uat-review';
import { registerTicketRoutes } from './routes/tickets';
import { registerWebhookRoutes } from './routes/webhooks';
import { registerProjectRoutes } from './routes/projects';
import { registerTenantRoutes } from './routes/tenants';
import { registerGiteaConfigRoutes } from './routes/gitea-config';
import { registerGiteaWebhookRoute } from './routes/webhook-gitea';
import { CodeAnnotator } from '../pipeline/code-annotator';
import { ContractWatcher } from '../pipeline/contract-watcher';
import { CommitVerifier } from '../pipeline/commit-verification';
import { FaultReporter } from '../pipeline/fault-reporter';
import { FixEngine } from '../pipeline/fix-engine';
import { MCPBus } from '../mcp/mcp-bus';
import { AgentOS } from '../agents/agent-os';
import { AgentRegistry } from '../agents/agent-registry';
import { AgentMemoryStore } from '../agents/agent-memory';
import { AgentHealthMonitor } from '../agents/agent-health-monitor';
import { OrchestrationHarness } from '../harness/orchestration-harness';
import { registerOrchestrateRoutes } from './routes/orchestrate';
import { SkillsRegistry } from '../skills/skills-registry';
import { registerAllFusionSkills } from '../skills';
import { SandboxExecutor } from '../skills/sandbox-executor';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { registerLLMConfigRoutes } from './routes/config-llm';
import { registerPipelineConfigRoutes } from './routes/config-pipeline';
import { registerRoleConfigRoutes } from './routes/config-roles';
import { registerEventsRoute } from './routes/events';
import { registerAuditLogRoutes } from './routes/audit-log';
import { registerAuthRoutes } from './routes/auth';
import { AppError } from './errors';
import { registerCLIRoutes } from './routes/cli';
import { registerSkillsRoutes } from './routes/skills';
import { EvolutionHarness } from '../harness/evolution-harness';
import { IntrospectionEngine } from '../core/evolution/introspection-engine';

/**
 * Module-level skills registry for route access.
 */
let _skillsRegistry: SkillsRegistry | null = null;
export function getSkillsRegistry(): SkillsRegistry | null {
  return _skillsRegistry;
}

// ============================================================================
// Global unhandled rejection / exception handlers 鈥?production FAIL fix
// ============================================================================

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  console.error('[FATAL] unhandledRejection:', msg);
  if (reason instanceof Error) console.error(reason.stack);
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err.message);
  console.error(err.stack);
});

// ============================================================================
// Startup environment validation 鈥?production FAIL fix
// ============================================================================

interface EnvValidationResult {
  ok: boolean;
  warnings: string[];
  errors: string[];
}

function validateEnv(): EnvValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const llmKey = process.env.LLM_API_KEY || '';
  if (!llmKey || llmKey === 'YOUR_API_KEY_HERE') {
    errors.push('LLM_API_KEY is not configured. Pipeline will fail on LLM calls.');
  }

  const baseUrl = process.env.LLM_BASE_URL || '';
  if (!baseUrl) {
    errors.push('LLM_BASE_URL is not configured.');
  }

  const port = process.env.ANFSF_PORT;
  if (port && (isNaN(parseInt(port, 10)) || parseInt(port, 10) < 1 || parseInt(port, 10) > 65535)) {
    errors.push(`ANFSF_PORT=${port} is not a valid port number.`);
  }

  const dataRetention = process.env.ANFSF_DATA_RETENTION_DAYS;
  if (dataRetention && (isNaN(parseInt(dataRetention, 10)) || parseInt(dataRetention, 10) < 1)) {
    errors.push(`ANFSF_DATA_RETENTION_DAYS=${dataRetention} must be a positive integer.`);
  }

  const apiToken = process.env.ANFSF_API_TOKEN || '';
  if (!apiToken) {
    warnings.push('ANFSF_API_TOKEN is empty 鈥?API routes are unprotected.');
  }

  const pgPassword = process.env.POSTGRES_PASSWORD || '';
  if (process.env.DATABASE_URL && pgPassword === 'anfsf_dev_password') {
    warnings.push('POSTGRES_PASSWORD is still set to the default dev password.');

  const jwtSecret = process.env.JWT_SECRET || '';
  if (!jwtSecret) {
    warnings.push('JWT_SECRET is empty - JWT tokens invalidated on server restart');
  }
  }

  return { ok: errors.length === 0, warnings, errors };
}

export interface ServerConfig {
  port?: number;
  host?: string;
  apiKey?: string;
  apiToken?: string;
  rateLimitQps?: number;
  rateLimitBurst?: number;
  defaultModel?: string;
  baseUrl?: string;
  allowedOrigins?: string;
  blockPromptInjections?: boolean;
  /** Skills registry for context compression */
  skillsRegistry?: SkillsRegistry;
  sandbox?: SandboxExecutor;
}

const DEFAULT_CONFIG: Required<ServerConfig> = {
  port: parseInt(process.env.ANFSF_PORT || '3000', 10),
  host: process.env.ANFSF_HOST || '0.0.0.0',
  apiKey: process.env.LLM_API_KEY || process.env.DASHSCOPE_API_KEY || '',
  apiToken: process.env.ANFSF_API_TOKEN || '',
  rateLimitQps: parseInt(process.env.ANFSF_RATE_LIMIT_QPS || '5', 10),
  rateLimitBurst: parseInt(process.env.ANFSF_RATE_LIMIT_BURST || '10', 10),
  defaultModel: process.env.ANFSF_MODEL || 'qwen3.5-plus',
  baseUrl: process.env.LLM_BASE_URL || '',
  allowedOrigins: process.env.ANFSF_ALLOWED_ORIGINS || '',
  blockPromptInjections: process.env.ANFSF_BLOCK_INJECTIONS !== 'false', // default to true in production
  skillsRegistry: undefined as any,
  sandbox: undefined as any,
};

export type AnfsfStore = PipelineRunStore | PostgresPipelineRunStore;

/**
 * Create the appropriate store based on environment.
 * DATABASE_URL set 鈫?PostgreSQL; otherwise 鈫?SQLite.
 */
export async function createStore(dbPath: string = '.anfsf/runs.db'): Promise<AnfsfStore> {
  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl) {
    console.log(`[store] Using PostgreSQL: ${dbUrl}`);
    const store = new PostgresPipelineRunStore(dbUrl);
    await store.init();

    // Run migrations
    try {
      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: dbUrl, max: 1 });
      const { runMigrations } = await import('./migrations');
      await runMigrations(pool);
      await pool.end();
    } catch (e) {
      console.warn('[store] Migration check skipped:', e instanceof Error ? e.message : String(e));
    }

    // Start periodic cleanup
    const retentionDays = parseInt(process.env.ANFSF_DATA_RETENTION_DAYS || '30', 10);
    if (retentionDays > 0) {
      store.startPeriodicCleanup(6, retentionDays);
    }

    return store;
  }

  console.log(`[store] Using SQLite: ${dbPath}`);
  const store = new PipelineRunStore(dbPath);

  // SQLite periodic cleanup
  const retentionDays = parseInt(process.env.ANFSF_DATA_RETENTION_DAYS || '30', 10);
  if (retentionDays > 0) {
    store.startPeriodicCleanup(6, retentionDays);
  }

  return store;
}

export async function createServer(config: ServerConfig = {}) {
  // Save original env so tests can temporarily override them
  const savedKey = process.env.LLM_API_KEY;
  const savedUrl = process.env.LLM_BASE_URL;
  process.env.LLM_API_KEY = config.apiKey || process.env.LLM_API_KEY || 'test-key';
  process.env.LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://api.test.local/v1';

  // Validate environment before proceeding
  const envResult = validateEnv();
  const log = createLogger('server');
  for (const w of envResult.warnings) log.warn(`[env] ${w}`);
  if (!envResult.ok) {
    for (const e of envResult.errors) log.error(`[env] ${e}`);
    // Restore env before throwing
    if (savedKey !== undefined) process.env.LLM_API_KEY = savedKey;
    if (savedUrl !== undefined) process.env.LLM_BASE_URL = savedUrl;
    throw new Error(`Environment validation failed:\n${envResult.errors.join('\n')}`);
  }
  log.info('[env] environment validation passed', { warnings: envResult.warnings.length });

  const resolved = { ...DEFAULT_CONFIG, ...config };
  const store = await createStore();

  // Shared LLMClient 鈥?single circuit breaker, shared token/cost tracking
  const llm = new LLMClient({
    apiKey: resolved.apiKey,
    baseUrl: resolved.baseUrl || undefined,
    defaultModel: resolved.defaultModel,
  });

  // --- Phase 1 new modules ---
  // Gitea client (config from env vars)
  const giteaUrl = process.env.GITEA_URL || 'http://localhost:3001';
  const giteaUser = process.env.GITEA_USERNAME || 'anfsf';
  const giteaPass = process.env.GITEA_PASSWORD || 'anfsf123';
  const gitea = new GiteaClient({ baseUrl: giteaUrl, username: giteaUser, password: giteaPass });

  // Checkpoint manager (in-memory for now, DB-backed in Phase 3)
  const checkpointStore = new InMemoryCheckpointStore();
  const checkpointMgr = new CheckpointManager(checkpointStore);

  // Role manager
  const roleMgr = new RoleManager();

  // Code annotation + contract watch + verification
  const codeAnnotator = new CodeAnnotator([]);
  const contractWatcher = new ContractWatcher();
  const commitVerifier = new CommitVerifier();
  const faultReporter = new FaultReporter();
  const fixEngine = new FixEngine();
  // Phase 7: Multi-Agent orchestration initialization
  const mcpBus = new MCPBus({ defaultTTL: 30000, enableIdempotency: true, enableTracing: true });
  const agentRegistry = new AgentRegistry();
  const agentMemory = new AgentMemoryStore({ persistencePath: '.anfsf/agent-memory.json' });
  const healthMonitor = new AgentHealthMonitor({ heartbeatTimeoutMs: 15000, healthCheckIntervalMs: 10000, resourceTrackingEnabled: false });
  const agentOS = new AgentOS();
  const orchestrationHarness = new OrchestrationHarness();
  orchestrationHarness.setAgentOS(agentOS);
  const codeGenEntry = agentRegistry.register({ name: 'code-generation', capabilities: [{ name: 'Code Generation', version: '1.0' }], metadata: { loopClass: 'CodeGenerationLoop' } });
  const testGenEntry = agentRegistry.register({ name: 'test-generation', capabilities: [{ name: 'Test Generation', version: '1.0' }], metadata: { loopClass: 'TestGenLoop' } });
  orchestrationHarness.registerAgent(codeGenEntry.id, { name: 'Code Generation Agent' });
  orchestrationHarness.registerAgent(testGenEntry.id, { name: 'Test Generation Agent' });

  // Attachment processor for multi-format PRD input
  const attachmentProcessor = new AttachmentProcessor(llm);

  // Phase 8: SkillsRegistry 鈥?register all fusion skills
  const skillsRegistry = new SkillsRegistry();
  registerAllFusionSkills(skillsRegistry);
  _skillsRegistry = skillsRegistry;
  resolved.skillsRegistry = skillsRegistry;

  // Phase A: SandboxExecutor for process isolation
  const sandbox = new SandboxExecutor({
    maxMemoryMB: 512,
    maxExecutionTimeMs: 120000,
  });
  resolved.sandbox = sandbox;
  log.info(`[skills] SkillsRegistry initialized with ${skillsRegistry.getSkillNames().length} skills`);

  // Phase 9: Evolution subsystem
  const evolutionHarness = new EvolutionHarness({ enableKPIOptimizer: true, enableDataFlywheel: true, enableProgressiveEvolution: true, kpiUpdateInterval: 300000, calibrationThreshold: 10 });
  const introspectionEngine = new IntrospectionEngine({
    sourceDirs: [path.resolve(__dirname, '..')],
    llmClient: llm,
  });

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
    bodyLimit: 20 * 1024 * 1024, // 20MB max to allow multiple file attachments
  });

  // Multipart form-data parsing for file uploads
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB per file
      files: 10,
    },
  });

  // CORS 鈥?default to allow local dev (localhost, 127.0.0.1) but restrict in prod
  const corsOrigins = resolved.allowedOrigins
    ? resolved.allowedOrigins.split(',').map(s => s.trim()).filter(Boolean)
    : [/^https?:\/\/localhost/, /^https?:\/\/127\.0\.0\.1/];
  await app.register(cors, { origin: corsOrigins });
  await app.register(sensible);

  // B2: OpenAPI/Swagger documentation
  await app.register(swagger, {
    openapi: {
      info: { title: 'ANFSF API', version: '1.0.0', description: 'Agent OS Platform' },
      servers: [{ url: 'http://localhost:' + String(resolved.port) }],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  // Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.)
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'", ...(resolved.baseUrl ? [resolved.baseUrl] : []), 'http://localhost:3000', 'http://localhost:8080'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    hsts: process.env.ANFSF_HOST !== '0.0.0.0' ? false : undefined, // only HSTS in production
  });

  // Auth middleware 鈥?protects /api/v1/* routes
  registerAuthMiddleware(app, resolved.apiToken);

  // Rate limiting 鈥?applies to /api/v1/* routes after auth
  // Per-route differentiated limits: expensive LLM routes get lower limits
  const rateLimitConfig: RateLimitConfig = {
    qps: resolved.rateLimitQps,
    burst: resolved.rateLimitBurst,
  };
  // Only add per-route overrides if not in test mode (allow tests to control limits)
  if (!process.env.JEST_WORKER_ID) {
    rateLimitConfig.routes = {
      '/api/v1/synthesize': { qps: 2, burst: 3 }, // expensive LLM calls
      '/api/v1/synthesize/multipart': { qps: 2, burst: 3 },
      '/api/v1/pipeline*': { qps: 10, burst: 20 }, // cheap DB lookups
      '/api/v1/llm/chat': { qps: 3, burst: 5 }, // LLM playground
      '/api/v1/feedback*': { qps: 5, burst: 10 }, // feedback ops
      '/api/v1/auth/*': { qps: 5, burst: 10 }, // login rate limit
    };
  }
  registerRateLimitMiddleware(app, rateLimitConfig);

  // Request tracing 鈥?all routes get trace IDs, tracks HTTP metrics
  registerTracingMiddleware(app);

  // Register routes
  registerSynthesizeRoute(app, store, resolved, llm, attachmentProcessor);
  registerPipelineRoutes(app, store);
  registerMetricsRoute(app, store);
  registerLLMMetrics(llm);
  registerConfirmationRoutes(app);
  registerLLMPlaygroundRoutes(app, llm, resolved);
  registerFeedbackRoutes(app, fixEngine);
  registerKnowledgeRoutes(app);
  registerDashboardRoutes(app);
  registerUATRoutes(app);
  registerTicketRoutes(app);
  registerWebhookRoutes(app);
  registerProjectRoutes(app);
  registerTenantRoutes(app, roleMgr);
  registerGiteaConfigRoutes(app);
  registerOrchestrateRoutes(app, orchestrationHarness, agentOS, store as any, llm);

  // Phase 5: Gitea DevFixLoop webhook
  registerGiteaWebhookRoute(app, store, llm);
  registerLLMConfigRoutes(app);
  registerPipelineConfigRoutes(app);
  registerRoleConfigRoutes(app);
  registerEventsRoute(app);
  registerAuditLogRoutes(app);
  registerAuthRoutes(app);
  registerCLIRoutes(app);
  registerSkillsRoutes(app);

  // Phase 1 integrated routes (requirement confirm, feedback鈫抐ix, release鈫抋rchive)
  registerPhase1Routes(app, store as PipelineRunStore);

  // Webhook route (Gitea push events 鈫?code annotation + verification)
  registerWebhookRoute(app, {
    onPush: async (event) => {
      const repo = event.repository?.name || 'unknown';
      log.info(`[webhook] push on ${repo}: ${event.commits?.length || 0} commits`);
      // Async handling: webhook acknowledges immediately, processing happens in background
      for (const commit of (event.commits || [])) {
        try {
          const diffs = await gitea.getDiff(repo, commit.sha);
          const result = codeAnnotator.annotate(commit, diffs, repo);
          log.info(`[annotator] ${repo}@${commit.sha.slice(0,7)}: ${result.summary.totalFiles} files`);
          const violations = contractWatcher.check(result.annotations);
          if (violations.violations.length > 0) {
            log.warn(`[contract] ${violations.violations.length} violations in ${repo}`);
          }
          const verifyReport = await commitVerifier.verify(repo, commit, diffs, '.');
          if (!verifyReport.passed) {
            const fault = faultReporter.generate(verifyReport);
            log.error(`[verify] ${repo}@${commit.sha.slice(0,7)}: ${fault.summary}`);
          }
        } catch (err) {
          log.error(`[webhook] error processing commit ${commit.sha?.slice(0, 7)}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    },
  });
  const isDeepSeek = resolved.baseUrl.includes('deepseek');
  const llmChatUrl = isDeepSeek
    ? `${resolved.baseUrl}/chat/completions`
    : `${resolved.baseUrl}/compatible-mode/v1/chat/completions`;

  registerHealthRoutes(app, {
    apiKey: resolved.apiKey,
    llmModel: resolved.defaultModel,
    llmChatUrl,
    dbPath: '.anfsf/runs.db',
    diskCheckPath: '.anfsf',
    store,
  });

  // Global error handler — formats all errors uniformly
  app.setErrorHandler((error: unknown, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.status).send({ error: error.code, message: error.message, details: error.details });
    }
    const verr = error as any;
    if (verr.validation) {
      return reply.code(400).send({ error: 'VALIDATION_ERROR', message: verr.message, details: (verr.validation || []).map((v: any) => v.message) });
    }
    app.log?.error?.({ err: error }, 'Unhandled error');
    return reply.code(500).send({ error: 'INTERNAL_ERROR', message: 'Internal server error' });
  });
  return {
    app,
    store,
    llm,
    async start() {
      await app.listen({ port: resolved.port, host: resolved.host });
      app.log.info(`ANFSF server listening on ${resolved.host}:${resolved.port}`);
    },
    async stop() {
      await app.close();
      if (store instanceof PostgresPipelineRunStore) {
        await store.close();
      } else {
        store.close();
      }
    },
  };
}

export type AnfsfServer = Awaited<ReturnType<typeof createServer>>;

// Allow running directly with ts-node or node (compiled)
const argvPath = (process.argv[1] || '').replace(/\\/g, '/');
if (argvPath.includes('server/index.ts') || argvPath.includes('server/index.js')) {
  async function main() {
    const srv = await createServer();

    const shutdown = async (signal: string) => {
      console.log(`[server] Received ${signal}, starting graceful shutdown...`);
      const forceExit = setTimeout(() => {
        console.error('[server] Forced shutdown after 30s timeout');
        process.exit(1);
      }, 30_000);
      try {
        await srv.stop();
        console.log('[server] Graceful shutdown complete');
      } catch (e) {
        console.error('[server] Shutdown error:', e);
      } finally {
        clearTimeout(forceExit);
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    await srv.start();
  }

  main().catch(err => {
    console.error('[startup] Failed to start ANFSF server:', err.message);
    process.exit(1);
  });
}






