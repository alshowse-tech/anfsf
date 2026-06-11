# ANFSF Architecture Documentation

## Overview

ANFSF (Autonomous N-Factor Software Factory) is a 17-layer autonomous software generation system that transforms product requirement documents (PRDs) into production-ready code. It features a Fastify backend with React frontend, supports multiple LLM providers, and includes full observability, security hardening, and multi-format PRD input (text, images, CSV, PDF).

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client Layer (Browser)                       │
│  React 18 + React Router + TailwindCSS + Mermaid.js + SSE Client   │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌─────────┐ │
│  │ PRDForm  │ │FileUpload│ │Progress   │ │ RunList  │ │ Mermaid │ │
│  │(text+files)│(drag+drop)│ │(SSE stream)│ │(paginated)│ │Diagram  │ │
│  └──────────┘ └──────────┘ └───────────┘ └──────────┘ └─────────┘ │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTPS / SSE (Server-Sent Events)
                            │ Auth: Bearer Token (ANFSF_API_TOKEN)
                            │ Rate Limit: per-route differentiated
┌───────────────────────────▼─────────────────────────────────────────┐
│                        API Layer (Fastify)                          │
│  Port 3000 | Non-root user | Helmet CSP | CORS | Multipart          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Middleware Stack:                                           │    │
│  │  1. CORS → 2. Sensible → 3. Multipart → 4. Helmet (CSP)    │    │
│  │  5. Auth (Bearer) → 6. Rate Limit → 7. Tracing             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌──────────┐ ┌────────────┐ ┌─────────┐ ┌────────────────────┐    │
│  │POST /api/│ │GET /api/   │ │GET /    │ │GET /health          │    │
│  │v1/synth. │ │v1/pipeline │ │metrics  │ │GET /ready           │    │
│  │POST /api/│ │GET /api/   │ │         │ │                     │    │
│  │v1/synth. │ │v1/pipeline │ │         │ │                     │    │
│  │/multipart│ │/:id/status │ │         │ │                     │    │
│  └──────────┘ └────────────┘ └─────────┘ └────────────────────┘    │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────────┐
│                     Input Governance Layer                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │AttachmentProcessor│  │Merger            │  │Sanitization      │  │
│  │• Image → Vision   │  │• Merge PRD text  │  │• Injection detect│  │
│  │• CSV → Markdown   │  │• + extractions   │  │• HTML strip      │  │
│  │• PDF → Text       │  │• Section markers │  │• NFC normalize   │  │
│  │• TXT/MD → Read    │  │                  │  │• Length limit    │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ enrichedText: string
┌───────────────────────────▼─────────────────────────────────────────┐
│                   17-Layer Cognitive Pipeline                       │
│                                                                     │
│  Layer 1-3:   PRD Parser → Quality Gate → Why-What-How Reasoner    │
│  Layer 4-6:   Graph IR → Architecture → UI Synthesis               │
│  Layer 7-9:   Code Gen → Compile Check → Code Quality Gate         │
│  Layer 10-12: Detail Polish → Retrospective → Safe Trend Scanner    │
│  Layer 13-15: Security Audit → Hybrid Retriever → Deep Reasoning    │
│  Layer 16-17: CD Pipeline → Human Confirmation                     │
│                                                                     │
│  Each layer:                                                        │
│    ┌─────────────────────────────────────────────────────────┐     │
│    │ Skill (LLM call) → Sandbox Execute → Quality Validate    │     │
│    │ On failure → Fix Loop → Retry (max N) → Escalate        │     │
│    └─────────────────────────────────────────────────────────┘     │
│                                                                     │
│  Skills Registry:                                                   │
│    HallucinationGuard, PolicyGuard, SecurityAuditor,               │
│    CodeQualityGuard, CD-Pipeline, MemoryConsolidation,             │
│    ContextCompressor, CitationTracer, RequirementRefiner,          │
│    RequirementCompiler, DeepReasoning, HybridRetriever             │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────────┐
│                      Integrations & Infrastructure                  │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐      │
│  │ LLM Client   │  │ GraphRAG     │  │ MCP Bus              │      │
│  │• Multi-provider│ │ Knowledge    │  │• Tool protocol       │      │
│  │• Circuit breaker│ │ retrieval    │  │• Cross-agent comm    │      │
│  │• Retry+backoff │ │ embeddings   │  │                      │      │
│  │• Token/cost   │ │ vector search│  │                      │      │
│  │  tracking     │ │              │  │                      │      │
│  └──────────────┘  └──────────────┘  └──────────────────────┘      │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │ Observability (Prometheus)                               │      │
│  │ • anfsf_pipeline_total (counter, by status)              │      │
│  │ • anfsf_pipeline_run_duration_seconds (histogram)        │      │
│  │ • anfsf_http_errors_total (counter, by type)             │      │
│  │ • anfsf_llm_tokens_total (counter, by type)              │      │
│  │ • anfsf_llm_cost_total (counter, currency)               │      │
│  │ • anfsf_circuit_breaker_state (gauge)                    │      │
│  │ • anfsf_process_memory_bytes (gauge, by type)            │      │
│  │ • anfsf_http_request_duration_seconds (histogram)        │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                     │
│  ┌────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ SQLite     │  │PostgreSQL│  │ Redis    │  │ Prometheus│        │
│  │ (default)  │  │(optional)│  │(rate lim)│  │ :9090    │        │
│  └────────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                        ┌──────────┐              │
│                                        │ Grafana  │              │
│                                        │ :3001    │              │
│                                        └──────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Details

### Frontend (`web/`)

| Component | Purpose |
|-----------|---------|
| `App.tsx` | React Router layout: `/`, `/progress`, `/history`, `/diagram` |
| `PRDForm.tsx` | PRD text input + FileUpload integration, FormData submission |
| `FileUpload.tsx` | Drag-and-drop, MIME filter, image/CSV preview, progress bar |
| `PipelineProgress.tsx` | SSE progress stream with exponential backoff reconnect |
| `RunList.tsx` | Paginated run history with Previous/Next |
| `RunResult.tsx` | Generated code display with download |
| `MermaidDiagram.tsx` | Pipeline architecture visualization |
| `ApiTokenSettings.tsx` | Nav dropdown for API token (localStorage) |
| `ErrorBoundary.tsx` | React Error Boundary with fallback UI |
| `useSSE.ts` | Custom hook: SSE with jitter backoff, idle timeout |
| `useRuns.ts` | Custom hook: paginated run queries |
| `api/client.ts` | Typed API client with auth headers, error class |

### Backend (`src/`)

| Module | Purpose |
|--------|---------|
| `server/index.ts` | Fastify app, plugin registration, config, lifecycle |
| `server/routes/synthesize.ts` | POST /synthesize (JSON) + /synthesize/multipart (file upload) |
| `server/routes/pipeline.ts` | GET /pipeline (list) + /:id/status (SSE stream) |
| `server/routes/metrics.ts` | GET /metrics (Prometheus format) |
| `server/routes/health.ts` | GET /health + /ready (LLM, DB, disk checks) |
| `server/middleware/auth.ts` | Bearer token validation for /api/v1/* |
| `server/middleware/rate-limit.ts` | Per-route token bucket with X-RateLimit-* headers |
| `server/middleware/tracing.ts` | Request trace IDs (X-Request-ID) |
| `server/store.ts` | SQLite-backed pipeline run store with SSE subscriptions |
| `server/store-postgres.ts` | PostgreSQL-backed store with connection pooling |
| `server/migrations.ts` | Schema migration runner for PostgreSQL |

### Input Layer (`src/input/`)

| Module | Purpose |
|--------|---------|
| `attachment-processor.ts` | Routes attachments by MIME: image→Vision OCR, CSV→Markdown, PDF→text, TXT→read |
| `attachment-types.ts` | Type definitions, allowed MIME types, limits (5MB, 10 files) |
| `sanitization-attachments.ts` | Magic bytes MIME sniffing, size validation, path traversal protection |
| `merger.ts` | Merges PRD text + all extractions with section markers |

### Input Governance (`src/input-governance/`)

| Module | Purpose |
|--------|---------|
| `sanitization.ts` | HTML tag stripping, entity decoding, NFC normalization, length limiting |
| `governance.ts` | Prompt injection detection and blocking |

### Pipeline (`src/pipeline/`)

| Module | Purpose |
|--------|---------|
| `product-pipeline.ts` | 17-layer orchestrator with quality gates, fix loops, and error escalation |

### Skills (`src/skills/`)

| Skill | Purpose |
|-------|---------|
| `why-what-how-reasoner.ts` | First-principles reasoning on PRD analysis |
| `hallucination-guard-skill.ts` | LLM output fact-checking |
| `security-auditor-skill.ts` | Generated code vulnerability scanning |
| `code-quality-guard-skill.ts` | Code style and quality validation |
| `policy-guard-skill.ts` | Compliance and policy enforcement |
| `detail-polisher.ts` | Generated code refinement and optimization |
| `sandbox-executor.ts` | Isolated code execution in sandbox |
| `skills-registry.ts` | Skill registration and dispatch |

### Core (`src/core/`)

| Module | Purpose |
|--------|---------|
| `graph/` | Graph IR types, traversal, caching, heatmap scoring |
| `evolution/` | Self-evolution: rollback, introspection, change budget, freeze |
| `quality/` | Compile validation, quality scoring |
| `guard-pipeline.ts` | Guard-enhanced pipeline with safety checks |

### Integrations (`src/integrations/`)

| Module | Purpose |
|--------|---------|
| `llm-client.ts` | Multi-provider LLM client with circuit breaker, retry, cost tracking, vision support |
| `graphrag.ts` | Knowledge graph retrieval with embeddings |

### Agents (`src/agents/`)

| Module | Purpose |
|--------|---------|
| `agent-os.ts` | Agent operating system with state machine, memory, health monitoring |
| `coordination-protocol.ts` | Multi-agent coordination and handoff |

## Data Flow

1. User submits PRD via web form (text + optional files)
2. Frontend sends `POST /api/v1/synthesize/multipart` with FormData
3. Backend validates files (MIME sniffing, size, count limits)
4. AttachmentProcessor extracts text from each file
5. Merger combines original text + all extractions → `enrichedText`
6. Sanitization: HTML stripping, NFC normalization, prompt injection detection
7. Run created in store (SQLite/PostgreSQL), run ID returned as `202 Accepted`
8. Pipeline runs asynchronously in background
9. Frontend connects via SSE to `GET /api/v1/pipeline/:id/status`
10. Each pipeline step emits progress events via SSE
11. Pipeline completes → result saved, SSE stream closes
12. User views generated code via RunResult component

## Security Model

```
Request → CORS check → Auth (Bearer token) → Rate Limit (per-route) → Tracing
                                                                    ↓
                                                          Helmet CSP headers
                                                          Input sanitization
                                                          Prompt injection filter
                                                          File MIME validation
                                                          Magic bytes verification
                                                          Path traversal prevention
```

- **Authentication**: Bearer token via `ANFSF_API_TOKEN` env var
- **Authorization**: All `/api/v1/*` routes require valid token; `/health`, `/ready`, `/metrics` are public
- **Rate Limiting**: Per-route token bucket — synthesize (2 QPS, burst 3), pipeline (10 QPS, burst 20)
- **Content Security**: Helmet with CSP (defaultSrc 'self', no frames, no objects)
- **File Upload**: MIME whitelist (png/jpeg/webp/csv/plain/markdown/pdf), 5MB max, 10 files max, magic bytes verification
- **Input Sanitization**: HTML tag removal, entity decoding, Unicode NFC normalization, prompt injection detection
- **Circuit Breaker**: LLM failures ≥ 5 → open circuit → auto-recovery after 30s

## LLM Provider Support

| Provider | API Key Prefix | Base URL | Models |
|----------|---------------|----------|--------|
| DashScope (Qwen) | `sk-` | `dashscope.aliyuncs.com` | qwen3.5-plus, qwen3.5-turbo, qwen-max |
| DeepSeek | `sk-ds-`, `sk-deepseek-` | `api.deepseek.com` | deepseek-chat, deepseek-v4, deepseek-v4-pro, deepseek-r1 |

Auto-detection based on API key prefix; can be overridden via `LLM_BASE_URL`.

## Deployment Architecture

```
docker-compose.yml services:
┌─────────────────┐  ┌──────────┐  ┌──────────┐
│ anfsf-backend   │  │postgres  │  │ redis    │
│ Port 3000 (host)│  │(internal)│  │(internal)│
│ HEALTHCHECK     │  │healthcheck│ │healthcheck│
└─────────────────┘  └──────────┘  └──────────┘

┌─────────────────┐  ┌──────────┐  ┌──────────┐
│ anfsf-frontend  │  │prometheus│  │ grafana  │
│ Port 8080 (host)│  │(internal)│  │Port 3001 │
│ HEALTHCHECK     │  │          │  │healthcheck│
└─────────────────┘  └──────────┘  └──────────┘
```

- **Backend**: Multi-stage Docker build (node:20.20.2-alpine, non-root user)
- **Frontend**: React build + nginx, port 8080, cache-busting for index.html
- **Database**: SQLite (default) or PostgreSQL (set DATABASE_URL)
- **Cache**: Redis (internal port, for rate limiting)
- **Monitoring**: Prometheus (scrape 15s), Grafana (dashboards pre-provisioned)

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `ANFSF_PORT` | 3000 | Backend HTTP port |
| `ANFSF_HOST` | 0.0.0.0 | Bind address |
| `ANFSF_API_TOKEN` | (empty) | Bearer token for API auth |
| `LLM_API_KEY` | (empty) | LLM provider API key |
| `LLM_BASE_URL` | (auto-detect) | LLM base URL override |
| `ANFSF_MODEL` | qwen3.5-plus | Default model |
| `ANFSF_RATE_LIMIT_QPS` | 5 | Global QPS limit |
| `ANFSF_RATE_LIMIT_BURST` | 10 | Global burst limit |
| `ANFSF_BLOCK_INJECTIONS` | true | Block prompt injection |
| `DATABASE_URL` | (empty) | PostgreSQL connection string |
| `ANFSF_DATA_RETENTION_DAYS` | 30 | Auto-cleanup old runs |
| `PG_POOL_MAX` | 5 | PostgreSQL max connections |
| `PG_STATEMENT_TIMEOUT` | 30000 | PostgreSQL statement timeout (ms) |
| `LOG_LEVEL` | info | Log level |
