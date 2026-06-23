#!/usr/bin/env bash
# ============================================================================
# Layer 0-1: synthesize.ts import audit
#
# Checks whether key modules are actually imported in synthesize.ts (the main
# runtime path).  "File exists + tests pass" does NOT mean "wired to runtime."
# This script answers the latter.
#
# Usage:   bash scripts/audit/check-imports.sh
# Output:  PASS (imported) / FAIL (not imported) per module
# ============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TARGET="src/server/routes/synthesize.ts"
PASS=0
FAIL=0

echo "=== synthesize.ts Import Audit ==="
echo ""

check_import() {
  local label="$1"
  local pattern="$2"
  if grep -q "$pattern" "$TARGET" 2>/dev/null; then
    echo -e "  ${GREEN}PASS${NC}  $label"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FAIL${NC}  $label — not imported in synthesize.ts"
    FAIL=$((FAIL + 1))
  fi
}

# ---- Core modules that SHOULD be imported (will grow over time) ----
check_import "CodeGenerationLoop"            "CodeGenerationLoop"
check_import "TokenBudget"                   "TokenBudget"
check_import "AINativePRDParser"             "AINativePRDParser"
check_import "TaskGenerator"                 "TaskGenerator"
check_import "PipelineStateMachine"          "PipelineStateMachine"
check_import "evaluatePRDQuality"            "evaluatePRDQuality"
check_import "GiteaClient"                   "GiteaClient"
check_import "sanitizePRDText"               "sanitizePRDText"
check_import "detectPromptInjection"         "detectPromptInjection"

# ---- Modules that are NOT expected to be imported yet (Phase 2+) ----
# These return FAIL but with exit code 0 (informational only)
echo ""
echo "  Future targets (not expected yet, informational only):"
check_import_future() {
  local label="$1"
  local pattern="$2"
  if grep -q "$pattern" "$TARGET" 2>/dev/null; then
    echo -e "  ${GREEN}READY${NC} $label — already imported (ahead of schedule)"
  else
    echo -e "  ${YELLOW}WAIT${NC} $label — Phase 2 target, not yet imported"
  fi
}
check_import_future "DevFixLoop"                    "DevFixLoop"
check_import_future "TestGenLoop"                   "TestGenLoop"
check_import_future "CodeQualityGuardSkill"         "CodeQualityGuardSkill"
check_import_future "HallucinationGuardSkill"       "HallucinationGuardSkill"

echo ""
echo "Result: $PASS required imports passed, $FAIL required imports failed"
if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}Some required imports are missing.${NC}"
  exit 1
fi
echo -e "${GREEN}All required imports present.${NC}"
