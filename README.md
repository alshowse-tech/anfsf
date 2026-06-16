# ANFSF — Autonomous Non-Fungible Software Factory

ANFSF is an autonomous software factory that transforms Product Requirements Documents (PRDs) into production-ready software through a cognitive pipeline of specialized roles, quality gates, and economic optimization.

## Features

- **PRD-to-Software Pipeline**: Submit a PRD, receive synthesised design documents with quality scores
- **Role-Based Synthesis**: Specialized roles (architect, developer, reviewer) with economics-driven task assignment
- **Four-Gate Quality System**: Compile, security, hallucination, and quality gates ensure output correctness
- **Domain Knowledge Layer**: Built-in knowledge of frontend UI, backend architecture, and DevOps
- **Structured Observability**: JSON logging with trace ID propagation across the full request lifecycle
- **React Frontend**: Web UI for PRD submission, real-time progress tracking via SSE, and result review
- **REST API**: Full HTTP API with rate limiting and bearer token authentication
- **Economics Scoring**: Cost optimization across role assignment with cross-role interface cost analysis

## Prerequisites

- Node.js 20+
- npm 10+
- An LLM API key (DashScope/Qwen, DeepSeek, or compatible)

## Installation

```bash
git clone <repo-url> && cd anfsf
npm install
```

## Configuration

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `LLM_API_KEY` | Yes | — | API key for your LLM provider |
| `ANFSF_MODEL` | No | `qwen3.5-plus` | LLM model to use |
| `ANFSF_HOST` | No | `0.0.0.0` | Server bind address |
| `ANFSF_PORT` | No | `3000` | Server port |
| `ANFSF_API_TOKEN` | No | — | Bearer token for API auth |
| `ANFSF_RATE_LIMIT_QPS` | No | `5` | Max requests/second per client |
| `ANFSF_RATE_LIMIT_BURST` | No | `10` | Burst allowance |
| `LOG_LEVEL` | No | `info` | Log level: debug, info, warn, error |
| `DATABASE_URL` | No | — | PostgreSQL URL (empty = SQLite) |

## Running

### Development

```bash
# Build the TypeScript sources
npm run build

# Start the API server
npm run server

# Or with auto-rebuild on changes:
npx tsx watch src/server/index.ts

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Frontend

```bash
cd web
npm run dev
```

### Production (Docker)

```bash
# Build the image
docker build -t anfsf .

# Run the container
docker run -d -p 3000:3000 \
  -e LLM_API_KEY=your-key \
  -e ANFSF_MODEL=qwen3.5-plus \
  anfsf
```

### Production (Docker Compose — full stack with PostgreSQL, Prometheus, Grafana)

```bash
docker compose up -d
```

### Production (Node.js)

```bash
npm run build
node dist/server/index.js
```

## API

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/synthesize` | Submit a PRD for synthesis (JSON body) |
| POST | `/api/v1/synthesize/multipart` | Submit PRD with file attachments (multipart) |
| GET | `/api/v1/pipeline` | List recent pipeline runs |
| GET | `/api/v1/pipeline/:id/status` | Get status of a specific run |
| GET | `/api/v1/pipeline/:id/stream` | SSE stream for real-time progress |
| GET | `/health` | Liveness check (process alive) |
| GET | `/ready` | Readiness check (LLM, DB, disk) |
| GET | `/metrics` | Prometheus metrics |

### Synthesize PRD

```bash
curl -X POST http://localhost:3000/api/v1/synthesize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"prdText": "Build a todo app with categories"}'
```

Returns a `jobId` for tracking the pipeline job.

### Stream Progress

```bash
curl http://localhost:3000/api/v1/pipeline/<runId>/stream
```

Server-Sent Events stream with step-by-step progress.

### Health Check

```bash
curl http://localhost:3000/health
curl http://localhost:3000/ready  # includes LLM, DB, disk checks
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — System architecture (five-stage state machine + Agent Loop)
- [REFACTOR-FIX](docs/ANFSF-REFACTOR-FIX.md) — **Current system status audit (start here)**
- [INDEX](docs/INDEX.md) — Complete document and code index with runtime status
- [Blueprint](docs/ANFSF-BLUEPRINT.md) — 13-step workflow and gap analysis
- [Development Path](docs/ANFSF-DEVELOPMENT-PATH.md) — Locked architecture decisions
- [Technical Design](docs/TECHNICAL-DESIGN.md) — State machine, Agent Loop, LLM provider design
- [Implementation Plan](docs/IMPLEMENTATION-PLAN.md) — Phase 1 task specifications
- [API Spec](docs/API-SPEC.md) — REST API endpoint definitions
- [Database Schema](docs/DATABASE-SCHEMA.md) — Database table definitions
- [Runbook](docs/RUNBOOK.md) — Deployment, monitoring, backup, troubleshooting
- [Interlayer Protocol](docs/INTERLAYER-PROTOCOL.md) — 17-layer protocol definitions (⚠️ theoretical, not fully in runtime)

> ⚠️ The old 17-layer architecture description has been replaced by the five-stage state machine.
> See [REFACTOR-FIX](docs/ANFSF-REFACTOR-FIX.md) for the current runtime status.

## Project Structure

```
src/
  server/            — Fastify HTTP API, middleware, routes
    middleware/      — Auth, rate-limit, tracing
    routes/          — synthesize, pipeline, metrics, health
  agents/            — Agent OS, state machine, coordination, memory
  cli/               — CLI entry point
  core/              — Core cognitive engine
    domain-knowledge/ — Built-in domain expertise
    evolution/        — Role evolution, rollback, introspection
    graph/            — Dependency graph, caching, heatmap
    quality/          — Quality gate implementations
    contract/         — API contract engine
  governance/        — Control plane and input governance
  harness/           — Agent and evolution harnesses
  input/             — Multi-format PRD processing (images, CSV, PDF)
  input-governance/  — Sanitization, injection detection
  integrations/      — LLM client (multi-provider), GraphRAG, MCP
  observability/     — Structured logging and Prometheus metrics
  pipeline/          — 17-layer pipeline orchestrator
  prd/               — PRD parser
  req-graph/         — Requirements graph engine
  skills/            — Cognitive skills registry (12+ skills)
  storage/           — File store, knowledge base, change log
  templates/         — Code templates
  ui/                — UI component generation
  mcp/               — Model Context Protocol bus
web/
  src/
    components/      — React UI components
    hooks/           — SSE, run queries
    api/             — Typed API client
  nginx.conf         — Production nginx config
infra/
  grafana/           — Grafana dashboards
scripts/             — Backup, migration, utilities
.github/workflows/   — CI/CD pipeline (lint, test, build, deploy)
docs/                — Architecture and runbook documentation
```

## Troubleshooting

### Server won't start

- Ensure `LLM_API_KEY` is set in `.env`
- Check port availability: `lsof -i :3000`
- Verify Node.js version: `node --version` (must be 20+)

### Pipeline runs fail immediately

- Confirm LLM API key is valid and has credits
- Check `/ready` endpoint for detailed diagnostics
- Review logs: `docker logs anfsf-backend`

### PostgreSQL connection issues

- Ensure `DATABASE_URL` is correctly formatted
- Check container health: `docker compose ps`
- Test connectivity: `docker exec anfsf-postgres pg_isready -U anfsf`

### Frontend can't reach API

- Verify `VITE_ANFSF_API` environment variable or that API is at `http://localhost:3000`
- Check CORS settings in `ANFSF_ALLOWED_ORIGINS`

### Rate limiting errors (429)

- Default: 5 requests/sec with burst of 10
- Adjust via `ANFSF_RATE_LIMIT_QPS` and `ANFSF_RATE_LIMIT_BURST`
- Check `X-RateLimit-Remaining` header on responses

## License

MIT
