# ANFSF — Project Context for Claude Code

> This file provides essential context for Claude Code sessions working on ANFSF.

## Project Overview

ANFSF (Autonomous Non-Fungible Software Factory) converts PRDs into production-ready project skeletons through a five-stage state machine with an Agent Loop.

## Critical Context

### Runtime Status (as of 2026-06-16)

**~35% of written code is active in the runtime pipeline.** This is the single most important fact.

The active runtime path is:
```
POST /api/v1/synthesize
  → PRDQualityCheck → ConfidenceAnnotator → PipelineStateMachine (2 transitions)
  → CodeGenerationLoop (generate → verify → fix) → TaskGenerator → GiteaClient.push
```

Modules that exist but are **NOT** in this path:
- 18 Skills (SkillsRegistry registration is no-op)
- FixEngine, CommitVerifier, ContractWatcher (need webhook integration)
- ReleaseCheck, Archiver (need stage 4-5 integration)
- All 7 evolution modules (standby)
- ProjectDashboard, RequirementReview (not routed in frontend)

See [docs/ANFSF-REFACTOR-FIX.md](docs/ANFSF-REFACTOR-FIX.md) for the full audit.

### Architecture Shift

The system was originally designed as a 17-layer vertical pipeline. It has been refactored to a **five-stage state machine + Agent Loop** architecture. The old `product-pipeline.ts` (703 lines) still exists but is deprecated.

## Key Decisions (Locked, Do Not Override)

1. **Agent Loop does NOT generate business logic** — skeletons only, TODO comments for humans
2. **Stage 2 (dev) is a black box** — ANFSF does not interfere with developer's local IDE
3. **FixEngine three-level boundary** — generated/modified/new × style/type/interface/business
4. **Five-stage state machine** — created→parsing→locked→generating→done (only 2 transitions active currently)
5. **LLM provider is pluggable** — DeepSeek primary, DashScope fallback, configurable via env vars

## File Conventions

- Module files: `kebab-case.ts`
- Test files: `__tests__/*.test.ts` (same directory)
- React components: `PascalCase.tsx`
- Docs: `UPPERCASE.md` in `docs/`

## Common Commands

```bash
# Build
npm run build

# Dev server
npm run server

# Frontend
cd web && npm run dev

# Tests
npm test

# Type check
npx tsc --noEmit
```

## Test Baseline

- 1621 total tests (1615 passed, 1 pre-existing failure, 5 skipped)
- 4 test suites fail due to environment dependencies (compile-validator, auth, rate-limit, server)
- Full test pass rate: 99.6%

## Environment

- Node.js 20+, npm 10+
- Windows 11 Pro local development
- Gitea 1.25.4 at localhost:3001 for local testing
- SQLite by default, PostgreSQL optional
- LLM: DashScope (Qwen) or DeepSeek

## Document Map

Start with [docs/INDEX.md](docs/INDEX.md) for the full document index with runtime status annotations.

The most important document: [docs/ANFSF-REFACTOR-FIX.md](docs/ANFSF-REFACTOR-FIX.md) — the single source of truth for current system status.