# ANFSF Architecture Documentation

> **版本**: 2.0 | **日期**: 2026-06-16 | **状态基准**: [REFACTOR-FIX](ANFSF-REFACTOR-FIX.md)
> **重要变更**: 本文档已从 17 层架构描述更新为当前实际运行的五阶段状态机 + Agent Loop 架构。
> 17 层理论架构文档保留在 [17层分析](ANFSF%2017%20层理论架构%20—%20逐层详细设计分析.md) 供参考，但不再反映当前系统。

## Overview

ANFSF (Autonomous Non-Fungible Software Factory) is a PRD-to-code platform that transforms Product Requirements Documents into production-ready project skeletons through a five-stage state machine with an Agent Loop for code generation and verification.

**Current runtime coverage**: ~35% of written code is active in the runtime pipeline. See [REFACTOR-FIX](ANFSF-REFACTOR-FIX.md) for details.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client Layer (Browser)                       │
│  React 18 + Vite + TailwindCSS + SSE Client                       │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐            │
│  │ PRDForm  │ │StageTabs │ │Settings   │ │HomeDash  │            │
│  │(text+files)│ │(6 stages)│ │(Modal)   │ │(Board)   │            │
│  └──────────┘ └──────────┘ └───────────┘ └──────────┘            │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐            │
│  │Require   │ │DevWork   │ │Verify     │ │Release   │            │
│  │Review    │ │space V2  │ │Panel      │ │Gate      │            │
│  └──────────┘ └──────────┘ └───────────┘ └──────────┘            │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTPS / SSE
                            │ Auth: Bearer Token
┌───────────────────────────▼─────────────────────────────────────────┐
│                        API Layer (Fastify)                          │
│  POST /api/v1/synthesize  |  GET /api/v1/pipeline  |  /health     │
│  POST /api/v1/synthesize/multipart  |  /:id/status (SSE) | /ready│
│  + /api/v1/tenants  |  /api/v1/config/gitea  |  /metrics           │
├───────────────────────────┬─────────────────────────────────────────┤
│                     Input Governance                                 │
│  AttachmentProcessor → Merger → Sanitization → Injection Detection │
├───────────────────────────▼─────────────────────────────────────────┤
│                Five-Stage State Machine                              │
│                                                                     │
│  Stage 0        Stage 1          Stage 2       Stage 3     Stage 4-5  │
│  Knowledge  →   Parse/Lock   →   Dev      →   Verify  →  Test/Archive│
│  (optional)     (Agent Loop)     (black box)  (commit     (PM review │
│                                  developer)    triggers)    + release) │
│       │              │               │           │           │        │
│       ▼              ▼               ▼           ▼           ▼        │
│   Checkpoint    Checkpoint      (Gitea)     Checkpoint   Checkpoint   │
├───────────────────────────────────────────────────────────────────────┤
│                     Agent Loop (Code Generation)                     │
│  Generate → Verify (tsc + quality + hallucination + security)       │
│           → Fix (max 3 rounds) → Annotate → Return                  │
│                                                                     │
│  ⚠️ Currently only CompileValidator is active in verification.     │
│    3 additional skills exist but are not registered.                 │
├───────────────────────────────────────────────────────────────────────┤
│                     Capability Providers (mostly standby)             │
│  Skills Registry (18 skills, ⚠️ registration is no-op)            │
│  Contract Engine ✅ | Graph Engine ✅ | Quality Gates ✅             │
│  Evolution Engine ⚠️ | LLM Client ✅ | GraphRAG ⚠️                │
├───────────────────────────────────────────────────────────────────────┤
│                     Storage & External                               │
│  SQLite (default) | PostgreSQL (optional) | Gitea (code repos)    │
│  Prometheus (:9090) | Grafana (:3001)                                │
└───────────────────────────────────────────────────────────────────────┘
```

## Active Runtime Path

The actual path a request takes through the running system:

```
POST /api/v1/synthesize
  → InputGovernance (sanitization, injection detection)
  → PipelineStateMachine (stage1_parsing → stage1_done)  ⚠️ only 2 transitions active
  → AINativePRDParser (LLM: deepseek-chat)
  → PRDQualityCheck (4-dimension scoring)
  → ConfidenceAnnotator (🟢🟡🔴 markers)
  → CodeGenerationLoop (generate → verify → fix, max 3 rounds)
    → VerificationRunner → CompileValidator (only active verifier)
  → TaskGenerator (TASK.md generation)
  → GiteaClient.pushFile (best effort, ⚠️ has SHA bug)
  → SSE progress events to frontend
```

Modules that exist but are **not** on this path (standby):
- CodeQualityGuardSkill, HallucinationGuardSkill, SecurityAuditorSkill
- GovernanceHarness, InputGovernance (not called from synthesize)
- FixEngine, CommitVerifier, ContractWatcher (need webhook integration)
- ReleaseCheck, Archiver (need stage 4-5 integration)
- All 7 evolution modules
- SkillsRegistry (18 skills, registration function is no-op)

See [REFACTOR-FIX](ANFSF-REFACTOR-FIX.md) Appendix A for the full standby module list.

## Frontend Components (`web/`)

**Active (23 components)**:

| Component | Purpose | Status |
|-----------|---------|--------|
| `App.tsx` | React Router layout with 6-stage navigation | ✅ |
| `PRDForm.tsx` | PRD text input + quality scoring + file upload | ✅ |
| `StageTabs.tsx` | 6-stage workflow navigation bar | ✅ |
| `HomeDashboard.tsx` | Project list + health overview | ✅ |
| `PipelineProgress.tsx` | 3-step Agent Loop progress + token/Gitea info | ✅ |
| `ResultView.tsx` | Code display with file tree + preview | ✅ |
| `SettingsModal.tsx` | System settings: tenants, members, Gitea | ✅ |
| `GiteaConfig.tsx` | Gitea URL/token configuration | ✅ |
| `MemberManager.tsx` | Member CRUD with 7 role types | ✅ |
| `RequirementReview.tsx` | PM requirement confirmation with confidence | ⚠️ not routed |
| `ProjectDashboard.tsx` | Five-stage progress dashboard | ⚠️ not routed |
| `DevWorkspaceV2.tsx` | Developer task workspace | ✅ |
| `VerifyPanel.tsx` | Verification result summary | ✅ |
| `ReleaseGate.tsx` | Three-layer release checks | ✅ |
| `EvolutionPanel.tsx` | Evolution analysis + knowledge base | ✅ |

## Backend Modules (`src/`)

### Active in Runtime

| Module | Purpose |
|--------|---------|
| `server/index.ts` | Fastify app, plugin registration |
| `server/routes/synthesize.ts` | POST /synthesize — main pipeline entry |
| `server/routes/pipeline.ts` | GET /pipeline — status and SSE |
| `server/routes/health.ts` | Health and readiness checks |
| `server/routes/metrics.ts` | Prometheus metrics |
| `server/routes/tenants.ts` | Tenant CRUD (7 endpoints) |
| `server/routes/gitea-config.ts` | Gitea configuration |
| `server/middleware/auth.ts` | Bearer token validation |
| `server/middleware/rate-limit.ts` | Per-route rate limiting |
| `server/middleware/tracing.ts` | Request trace IDs |
| `server/store.ts` | SQLite-backed run store |
| `pipeline/pipeline-state-machine.ts` | Five-stage state machine |
| `agents/code-generation-loop.ts` | Agent Loop for code generation |
| `agents/verification-runner.ts` | Verification tool orchestration |
| `prd/prd-parser.ts` | LLM-based PRD parsing |
| `prd/prd-quality-check.ts` | Four-dimension quality scoring |
| `prd/confidence-annotator.ts` | Confidence annotation (🟢🟡🔴) |
| `pipeline/skeleton-generator.ts` | Skeleton code generation |
| `pipeline/task-generator.ts` | TASK.md generation |
| `pipeline/token-budget.ts` | Token budget tracking |
| `pipeline/checkpoint.ts` | Checkpoint and recovery |
| `pipeline/code-annotator.ts` | Code source annotation |
| `pipeline/fix-engine.ts` | L1/L2/L3 fix matrix |
| `pipeline/release-check.ts` | Three-layer release checks |
| `pipeline/archiver.ts` | Project archiving |
| `integrations/llm-client.ts` | Multi-provider LLM client |
| `integrations/gitea-client.ts` | Gitea API client |
| `input/attachment-processor.ts` | Multi-format file processing |
| `input-governance/sanitization.ts` | HTML stripping, NFC normalization |
| `input-governance/governance.ts` | Prompt injection detection |
| `observability/logger.ts` | Structured logging |
| `observability/metrics.ts` | Prometheus metrics |

### Standby (written, tested, not in runtime)

Full list: see [REFACTOR-FIX](ANFSF-REFACTOR-FIX.md) Appendix A (P1: 5 modules, P2: 7 modules, P3: 9 modules, Standby: 6 modules).

## Data Flow

1. User submits PRD via web form (text + optional files)
2. Frontend sends `POST /api/v1/synthesize/multipart` with FormData
3. Backend validates files (MIME sniffing, size, count limits)
4. AttachmentProcessor extracts text from each file
5. Merger combines original text + all extractions → `enrichedText`
6. Sanitization: HTML stripping, NFC normalization, prompt injection detection
7. Run created in store (SQLite/PostgreSQL), run ID returned as `202 Accepted`
8. PipelineStateMachine: `stage1_parsing` → quality check → confidence annotation → `stage1_locked`
9. CodeGenerationLoop: generate → verify (CompileValidator) → fix (max 3 rounds) → `stage1_done`
10. TaskGenerator creates TASK.md, GiteaClient pushes skeleton (best effort)
11. Frontend connects via SSE to track progress
12. **Stages 2-5 are reserved but not yet integrated in the runtime pipeline**

## Security Model

- **Authentication**: Bearer token via `ANFSF_API_TOKEN` env var
- **Authorization**: All `/api/v1/*` routes require valid token; `/health`, `/ready`, `/metrics` are public
- **Rate Limiting**: Per-route token bucket — synthesize (2 QPS, burst 3), pipeline (10 QPS, burst 20)
- **Content Security**: Helmet with CSP
- **File Upload**: MIME whitelist, 5MB max, 10 files max, magic bytes verification
- **Input Sanitization**: HTML tag removal, entity decoding, Unicode NFC normalization, prompt injection detection
- **Circuit Breaker**: LLM failures ≥ 5 → open circuit → auto-recovery after 30s

## LLM Provider Support

| Provider | API Key Prefix | Base URL | Models |
|----------|---------------|----------|--------|
| DashScope (Qwen) | `sk-` | `dashscope.aliyuncs.com` | qwen3.5-plus, qwen3.5-turbo, qwen-max |
| DeepSeek | `sk-ds-`, `sk-deepseek-` | `api.deepseek.com` | deepseek-chat, deepseek-v4, deepseek-v4-pro, deepseek-r1 |

Auto-detection based on API key prefix; can be overridden via `LLM_BASE_URL`.

## Deployment

- **Backend**: Multi-stage Docker build (node:20.20.2-alpine, non-root user)
- **Frontend**: React build + nginx, port 8080
- **Database**: SQLite (default) or PostgreSQL (set DATABASE_URL)
- **Monitoring**: Prometheus (scrape 15s), Grafana (dashboards pre-provisioned)

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
| `LOG_LEVEL` | info | Log level |

## Documentation Index

- [REFACTOR-FIX](ANFSF-REFACTOR-FIX.md) — **Current system status audit** (start here)
- [ANFSF-OS-UI-REFACTOR](ANFSF-OS-UI-REFACTOR.md) — Frontend restructuring record
- [BLUEPRINT](ANFSF-BLUEPRINT.md) — 13-step workflow and gap analysis
- [DEVELOPMENT-PATH](ANFSF-DEVELOPMENT-PATH.md) — Locked architecture decisions
- [TECHNICAL-DESIGN](TECHNICAL-DESIGN.md) — State machine and Agent Loop design
- [IMPLEMENTATION-PLAN](IMPLEMENTATION-PLAN.md) — Phase 1 task specifications
- [INDEX](INDEX.md) — Full document and code index with runtime status
- [RUNBOOK](RUNBOOK.md) — Deployment and operations manual
- [API-SPEC](API-SPEC.md) — REST API endpoint definitions
- [DATABASE-SCHEMA](DATABASE-SCHEMA.md) — Database table definitions
- [17-Layer Analysis](../ANFSF%2017%20层理论架构%20—%20逐层详细设计分析.md) — Theoretical 17-layer architecture (⚠️ outdated, see note at top)