# ANFSF Production Deployment Checklist

> Follow this checklist before deploying ANFSF to production.
> Estimated time: 30 minutes.

---

## Environment Variables

- [ ] `JWT_SECRET` — Set to a 32+ character random string (generated: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- [ ] `ANFSF_API_TOKEN` — Set to a static API token for machine-to-machine auth
- [ ] `LLM_API_KEY` — LLM provider API key
- [ ] `LLM_BASE_URL` — LLM provider base URL
- [ ] `ANFSF_ALLOWED_ORIGINS` — Comma-separated allowed CORS origins
- [ ] `ANFSF_PORT` — Server port (default: 3000)
- [ ] `ANFSF_HOST` — Server bind address (default: 0.0.0.0)
- [ ] `ANFSF_MODEL` — Default LLM model (default: qwen3.5-plus)
- [ ] `TOKEN_BUDGET` — Project token budget (default: 5000000)
- [ ] `ANFSF_DATA_RETENTION_DAYS` — Data retention period
- [ ] `LOG_LEVEL` — Logging level (info / warn / error)
- [ ] `LOG_FILE` — Log file path (optional, defaults to stdout)

## Database

- [ ] PostgreSQL (production): `DATABASE_URL` configured
- [ ] `.anfsf/` directory exists and is writable
- [ ] Regular backup configured: `pg_dump` for PostgreSQL, file copy for `.anfsf/`

## Security

- [ ] Default admin account verified removed (no `admin/admin`)
- [ ] HTTPS configured (reverse proxy: nginx / Caddy / Cloudflare)
- [ ] Rate limiting enabled (default: 5qps global, 2qps for LLM routes)
- [ ] CORS restricted to known frontend domains
- [ ] JWT_SECRET rotated periodically
- [ ] Audit log location: `.anfsf/audit-log.json` (last 10,000 entries)

## Monitoring

- [ ] Health endpoint available: `GET /health`
- [ ] Prometheus metrics available: `GET /metrics`
- [ ] Key alerts configured:
  - Pipeline failure rate > 10%
  - Token budget > 90%
  - LLM API error rate > 5%
  - Disk usage > 80%

## Operations

- [ ] Graceful shutdown tested: `kill <pid>` → log confirms clean exit
- [ ] Restart verified: JWT tokens remain valid (JWT_SECRET is stable)
- [ ] Swagger docs accessible: `GET /docs`
- [ ] Agent memory persists across restart (`agent-memory.json`)
- [ ] Token budget persists across restart (`token_budget_records` table)

## Frontend

- [ ] `VITE_ANFSF_API` env var set to backend API URL
- [ ] Login page accessible at `/login`
- [ ] Protected routes redirect to `/login` when unauthenticated
- [ ] Language toggle works (EN/中文)
- [ ] All navigation tabs render correctly

---

## Post-Deploy Smoke Test

```bash
# 1. Health check
curl http://localhost:3000/health

# 2. Register a new user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"deploy-test","password":"test123456"}'

# 3. Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"deploy-test","password":"test123456"}'

# 4. Access protected route with JWT
TOKEN=<jwt-from-login>
curl http://localhost:3000/api/v1/pipeline -H "Authorization: Bearer $TOKEN"

# 5. Swagger UI
curl http://localhost:3000/docs
```
