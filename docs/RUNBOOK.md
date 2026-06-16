# ANFSF Operation Manual

> **版本**: 2.0 | **日期**: 2026-06-16 | **状态基准**: [REFACTOR-FIX](ANFSF-REFACTOR-FIX.md)

## Quick Start

```bash
# 1. Clone and configure
git clone <repo> && cd anfsf
cp .env.example .env
# Edit .env: set LLM_API_KEY and ANFSF_API_TOKEN

# 2. Install dependencies
npm install && cd web && npm install && cd ..

# 3. Start development servers
npm run server          # Backend on :3000
cd web && npm run dev   # Frontend on :8080

# 4. Or build and run full stack with Docker
make deploy             # SQLite mode
make deploy-pg          # Full stack with PostgreSQL
```

## Deployment

### Environment Variables

Copy `.env.example` to `.env` and set:

| Variable | Required | Example |
|----------|----------|---------|
| `LLM_API_KEY` | Yes | `sk-ds-xxxxxxxx` |
| `LLM_BASE_URL` | Auto | `https://api.deepseek.com/v1` (auto-detected from API key) |
| `ANFSF_MODEL` | No | `deepseek-v4-pro` |
| `ANFSF_API_TOKEN` | Recommended | `your-random-token-here` |
| `ANFSF_PORT` | No | `3000` |
| `ANFSF_HOST` | No | `0.0.0.0` |
| `DATABASE_URL` | Optional | `postgresql://user:pass@host:5432/db` |
| `ANFSF_RATE_LIMIT_QPS` | No | `5` |
| `ANFSF_RATE_LIMIT_BURST` | No | `10` |
| `ANFSF_BLOCK_INJECTIONS` | No | `true` |
| `ANFSF_DATA_RETENTION_DAYS` | No | `30` |
| `PG_POOL_MAX` | No | `5` |
| `PG_STATEMENT_TIMEOUT` | No | `30000` |
| `LOG_LEVEL` | No | `info` |

### Docker Compose (Full Stack)

```bash
make deploy-pg
# Starts: backend (3000), frontend (8080), postgres (internal),
#          redis (internal), prometheus (internal), grafana (3001)
```

### Docker (SQLite Mode)

```bash
make deploy
# Starts: backend (3000), frontend (8080)
# Data stored in .anfsf/runs.db
```

### Rolling Update

```bash
make build
make restart
# Verify: make health
```

### Rollback

```bash
make rollback
```

## Frontend Token Configuration

After the first deployment, configure the API token in the frontend:

1. Open the dashboard at `http://localhost:8080`
2. Click the key icon () in the navbar
3. Enter your `ANFSF_API_TOKEN` value
4. Token is saved to localStorage — persists across sessions

Without a token, `/api/v1/*` requests return `401 Unauthorized`.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/synthesize` | Yes | Run pipeline with JSON PRD |
| `POST` | `/api/v1/synthesize/multipart` | Yes | Run pipeline with files |
| `GET` | `/api/v1/pipeline` | Yes | List runs (supports `?limit=&offset=`) |
| `GET` | `/api/v1/pipeline/:id` | Yes | Run detail |
| `GET` | `/api/v1/pipeline/:id/status` | Yes | SSE progress stream |
| `GET` | `/health` | No | Liveness check |
| `GET` | `/ready` | No | Readiness check (LLM+DB+disk) |
| `GET` | `/metrics` | No | Prometheus metrics |

### Example: Submit PRD with files

```bash
curl -X POST http://localhost:3000/api/v1/synthesize/multipart \
  -H "Authorization: Bearer $ANFSF_API_TOKEN" \
  -F "prdText=Build a todo app" \
  -F "files[]=@screenshot.png" \
  -F "files[]=@data.csv"
# Returns: {"jobId":"run_123456_abcdef","status":"running"}
```

### Example: Stream progress via SSE

```bash
curl -N http://localhost:3000/api/v1/pipeline/run_123456_abcdef/status \
  -H "Authorization: Bearer $ANFSF_API_TOKEN"
# Streams: event: step\ndata: {"name":"PRD Parser","status":"ok",...}
```

## Monitoring

### Health Checks

| Endpoint | Check | Success Condition |
|----------|-------|-------------------|
| `GET /health` | Process alive | HTTP 200 |
| `GET /ready` | LLM + DB + disk | HTTP 200, `status: "ok"` |

Readiness checks verify:
- **LLM**: Successful minimal chat request (max_tokens: 1, cost ~$0.0001)
- **Database**: Connection alive and queryable
- **Disk**: `.anfsf/` directory writable, <90% usage

### Prometheus Metrics

Scrape `/metrics` at 15s interval:

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `anfsf_pipeline_total` | Counter | `status` | Total pipeline runs |
| `anfsf_pipeline_run_duration_seconds` | Histogram | - | Pipeline duration distribution |
| `anfsf_http_errors_total` | Counter | `type` (4xx/5xx) | HTTP errors |
| `anfsf_llm_tokens_total` | Counter | `type` | Cumulative LLM token usage |
| `anfsf_llm_cost_total` | Counter | `currency` | Cumulative LLM cost |
| `anfsf_circuit_breaker_state` | Gauge | - | LLM circuit breaker (0=closed, 1=open) |
| `anfsf_process_memory_bytes` | Gauge | `type` (rss/heap) | Process memory |
| `anfsf_http_request_duration_seconds` | Histogram | - | HTTP latency |
| `up` | Gauge | `job` | Service up/down |

### Grafana Dashboards

- Access: `http://localhost:3001`
- Default credentials: `admin` / password from `.env`
- Pre-provisioned dashboards in `infra/grafana/dashboards/`

### Alerts to Configure

| Metric | Condition | Severity |
|--------|-----------|----------|
| `anfsf_pipeline_total{status="failed"}` | Sudden increase | P1 |
| `anfsf_circuit_breaker_state` | Changes to 1 (open) | P1 |
| `anfsf_process_memory_bytes{type="rss"}` | Exceeds container limit | P2 |
| `anfsf_http_errors_total{type="5xx"}` | Rate increase | P2 |
| `up{job="anfsf"}` | Drops to 0 | P0 |

## Backup

### Automated Backup

```bash
bash scripts/backup.sh sqlite    # For SQLite mode
bash scripts/backup.sh postgres  # For PostgreSQL mode
```

Backup features:
- Parameterized paths via Makefile variables
- Backup verification (SQLite integrity check / pg_restore test)
- 30-day retention (auto-cleanup of old backups)
- Compressed output (.gz)

### Manual Restore

```bash
# SQLite
cp backups/runs.db.20240101_120000 .anfsf/runs.db

# PostgreSQL
docker exec -i anfsf-postgres psql -U anfsf anfsf < backups/anfsf.20240101_120000.sql
```

### Data Retention

- Pipeline runs auto-cleaned every 6 hours (configurable via `ANFSF_DATA_RETENTION_DAYS`, default: 30)
- Backups retained for 30 days
- Generated output in `output/` directory is not auto-cleaned

## Troubleshooting

### High Memory Usage

1. Check `anfsf_process_memory_bytes` metric
2. If RSS grows beyond container limit: `make restart`
3. Investigate: `docker stats anfsf-backend`

### LLM Circuit Breaker Open

1. Check `anfsf_circuit_breaker_state` (1 = open)
2. Verify LLM API key and provider status
3. Auto-recovery after 30s (half-open → probe → close on success)
4. Manual reset: call internal circuit breaker reset method

### Rate Limiting

- Check `X-RateLimit-Remaining` headers on responses
- Per-route limits: synthesize = 2 QPS (expensive LLM), pipeline = 10 QPS (cheap DB)
- Adjust: `ANFSF_RATE_LIMIT_QPS` and `ANFSF_RATE_LIMIT_BURST`
- Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### SSE Connections Dropping

- Idle timeout: 5 minutes (by design)
- Frontend auto-reconnects with exponential backoff (max 10 retries)
- Server cleans up subscriptions on disconnect

### Docker Container Won't Start

```bash
docker logs anfsf-backend 2>&1 | tail -50
docker inspect anfsf-backend | grep -A 20 Env
docker exec anfsf-postgres pg_isready -U anfsf  # DB connectivity
```

### Browser Shows Old Frontend

- Frontend uses hash-based cache busting
- If stale, force refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
- nginx serves `index.html` with `Cache-Control: no-cache, no-store, must-revalidate`

### Prompt Injection Blocked

- If `ANFSF_BLOCK_INJECTIONS=true` (default), requests with injection patterns return 400
- Set `ANFSF_BLOCK_INJECTIONS=false` to allow with warning log
- Check server logs: `[synthesize] Prompt injection patterns detected: ...`

### File Upload Fails

- Supported types: PNG, JPEG, WebP, CSV, TXT, Markdown, PDF
- Max file size: 5MB
- Max attachment count: 10
- Total request size: 20MB (bodyLimit)
- MIME verification via magic bytes (not just extension)

## Scaling

### Horizontal Scaling (Multiple Backend Instances)

- Use PostgreSQL (not SQLite) for shared state
- Redis for distributed rate limiting
- Shared `output/` directory via NFS or S3
- Load balancer with sticky sessions required for SSE

### Vertical Scaling

- Increase `PG_POOL_MAX` for more concurrent connections
- Increase container memory limit
- Adjust pipeline timeout via `PIPELINE_TIMEOUT_MS` for complex PRDs

### Multi-Provider LLM Setup

- Auto-detection: API key prefix determines provider (sk-ds- → DeepSeek, sk- → DashScope)
- Override: Set `LLM_BASE_URL` to any OpenAI-compatible endpoint
- Per-request model: Include `model` field in synthesize request body

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`):

1. **Lint**: ESLint + Prettier
2. **Type Check**: `tsc --noEmit` (backend + frontend)
3. **Test**: Jest (1385+ tests)
4. **Security**: Snyk vulnerability scan
5. **Coverage**: Codecov v5 upload
6. **Docker**: Build and push to GHCR (`ghcr.io/<org>/anfsf`)

### Local CI Check

```bash
make lint
make test
make build
```

## Documentation

- [Architecture](ARCHITECTURE.md) — System architecture (five-stage state machine + Agent Loop)
- [Runbook](RUNBOOK.md) — This document
- [REFACTOR-FIX](ANFSF-REFACTOR-FIX.md) — **Current system status audit** (start here)
- [API Spec](API-SPEC.md) — REST API endpoints
- [Database Schema](DATABASE-SCHEMA.md) — Database table definitions
- [Development Standards](DEVELOPMENT-STANDARDS.md) — Code style and Git workflow
- [INDEX](INDEX.md) — Complete document and code index with runtime status
