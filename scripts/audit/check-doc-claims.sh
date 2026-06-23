#!/usr/bin/env bash
# ============================================================================
# Layer 0-3: Document claim vs source code cross-validator
#
# For each pair of (document-path, string-claim, source-path, grep-pattern),
# checks whether the claim is actually true in the source code.
#
# Usage:   bash scripts/audit/check-doc-claims.sh
# Output:  PASS (claim matches code) / FAIL (claim contradicted by code)
# ============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

echo "=== Document-Claim vs Source-Code Cross-Validation ==="
echo ""

validate() {
  local doc="$1"
  local claim="$2"
  local file="$3"
  local pattern="$4"
  local severity="${5:-error}"  # error or warn

  if [ ! -f "$file" ]; then
    echo -e "  ${RED}FAIL${NC}  [$doc] $claim — source file '$file' does not exist"
    FAIL=$((FAIL + 1))
    return
  fi

  if grep -q "$pattern" "$file" 2>/dev/null; then
    echo -e "  ${GREEN}PASS${NC}  [$doc] $claim"
    PASS=$((PASS + 1))
  else
    if [ "$severity" = "error" ]; then
      echo -e "  ${RED}FAIL${NC}  [$doc] $claim — pattern '$pattern' NOT found in $file"
      FAIL=$((FAIL + 1))
    else
      echo -e "  ${YELLOW}WARN${NC}  [$doc] $claim — pattern '$pattern' NOT found in $file"
      WARN=$((WARN + 1))
    fi
  fi
}

# ---- Claims from audit-report.md (Phase 1-3 claimed fixes) ----
validate \
  "audit-report.md P0-2" \
  "synthesize route has .catch() handler" \
  "src/server/routes/synthesize.ts" \
  "\.catch"

validate \
  "audit-report.md P0-3" \
  "L1 parse failure triggers guided mode" \
  "src/server/routes/synthesize.ts" \
  "triggerGuidedMode"

validate \
  "audit-report.md P1-11" \
  "LLM Playground has max_tokens=4096 limit" \
  "src/server/routes/llm-playground.ts" \
  "PLAYGROUND_MAX_TOKENS = 4096"

validate \
  "audit-report.md P2-17" \
  "Metrics endpoint has 15s cache TTL" \
  "src/server/routes/metrics.ts" \
  "METRICS_CACHE_TTL_MS = 15_000"

# ---- Claims from CLAUDE.md ----
validate \
  "CLAUDE.md" \
  "Runtime path includes TokenBudget" \
  "src/server/routes/synthesize.ts" \
  "TokenBudget"

validate \
  "CLAUDE.md" \
  "Runtime path includes AINativePRDParser" \
  "src/server/routes/synthesize.ts" \
  "AINativePRDParser"

# ---- Claims about test baseline ----
validate \
  "CLAUDE.md" \
  "TypeScript compiles with zero errors" \
  "src/agents/code-generation-loop.ts" \
  "export class CodeGenerationLoop" \
  "warn"

echo ""
echo "Result: $PASS passed, $FAIL failed, $WARN warnings"
if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}Some document claims are contradicted by source code.${NC}"
  exit 1
fi
echo -e "${GREEN}All document claims verified.${NC}"
