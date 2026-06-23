#!/usr/bin/env bash
# ============================================================================
# Layer 0-4: Runtime wiring audit
#
# Scans the agent-loop source to check whether declared subclasses and
# skills are actually reachable through the synthesize.ts execution path
# (not just "files that exist and have passing tests").
#
# Usage:   bash scripts/audit/check-runtime-wiring.sh
# ============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== Runtime Wiring Audit ==="
echo ""

PASS=0
FAIL=0
WARN=0

wired() {
  local label="$1"
  local pattern="$2"
  local target="${3:-src/server/routes/synthesize.ts}"
  if grep -q "$pattern" "$target" 2>/dev/null; then
    echo -e "  ${GREEN}WIRED${NC}  $label"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}DEAD${NC}   $label — code exists but NOT called in $target"
    FAIL=$((FAIL + 1))
  fi
}

echo "Agent Loop subclasses:"
wired "CodeGenerationLoop"  "CodeGenerationLoop"
wired "DevFixLoop"           "DevFixLoop"
wired "TestGenLoop"          "TestGenLoop"

echo ""
echo "Verification tools (in VerificationRunner.DEFAULT_TOOLS):"
wired "CompileValidator (tsc)"  "CompileValidator"  "src/agents/verification-runner.ts"

echo ""
echo "Pipeline modules called from synthesize.ts:"
wired "TokenBudget"          "TokenBudget"
wired "TaskGenerator"        "TaskGenerator"
wired "PipelineStateMachine" "PipelineStateMachine"

echo ""
echo "PRD processing:"
wired "evaluatePRDQuality"   "evaluatePRDQuality"
wired "AINativePRDParser"    "AINativePRDParser"

echo ""
echo "Git integration:"
wired "GiteaClient"          "GiteaClient"

echo ""
echo "Score: $PASS wired, $FAIL dead code paths"
if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}$FAIL modules are implemented but unreachable.${NC}"
  exit 1
fi
echo -e "${GREEN}All checked modules are wired to runtime.${NC}"
