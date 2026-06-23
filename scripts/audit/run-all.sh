#!/usr/bin/env bash
# ============================================================================
# Layer 0-5: Run all Layer 0 audits and produce a single summary report.
#
# Usage:   bash scripts/audit/run-all.sh
# ============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DIR="$(cd "$(dirname "$0")" && pwd)"
TOTAL=0
FAILED=0
declare -a RESULTS

run_one() {
  local label="$1"
  local script="$2"
  echo ""
  if bash "$script" 2>&1; then
    RESULTS+=("${GREEN}PASS${NC}  $label")
    TOTAL=$((TOTAL + 1))
  else
    RESULTS+=("${RED}FAIL${NC}  $label")
    TOTAL=$((TOTAL + 1))
    FAILED=$((FAILED + 1))
  fi
}

echo "═══════════════════════════════════════════════════════"
echo "  ANFSF Layer 0 Audit — Full Report"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════════════════"

run_one "Import audit (synthesize.ts)"        "$DIR/check-imports.sh"
run_one "Security audit (.env + .gitignore)"  "$DIR/check-env-security.sh"
run_one "Document claims (doc vs code)"       "$DIR/check-doc-claims.sh"
run_one "Runtime wiring (dead code scan)"     "$DIR/check-runtime-wiring.sh"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  SUMMARY"
echo "═══════════════════════════════════════════════════════"
for result in "${RESULTS[@]}"; do
  echo -e "  $result"
done
echo ""
echo "  Total checks: $TOTAL, Failed: $FAILED"
if [ "$FAILED" -gt 0 ]; then
  echo -e "  ${RED}Status: ISSUES FOUND — review before proceeding${NC}"
  exit 1
else
  echo -e "  ${GREEN}Status: ALL CLEAR${NC}"
fi
