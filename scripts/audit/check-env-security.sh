#!/usr/bin/env bash
# ============================================================================
# Layer 0-2: .env security audit
#
# Verifies that no real API keys are present in the .env file.
# Also checks that .env is properly gitignored and not tracked.
#
# Usage:   bash scripts/audit/check-env-security.sh
# ============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

ISSUES=0

echo "=== .env Security Audit ==="
echo ""

# 1. Check for real API key patterns
if [ -f .env ]; then
  # Check for common API key patterns (sk-, sk-ant-, etc.)
  if grep -qE '^[A-Z_]+=sk-[a-zA-Z0-9]{5,}' .env 2>/dev/null; then
    echo -e "  ${RED}FAIL${NC}  Real API key found in .env"
    grep -nE '^[A-Z_]+=sk-[a-zA-Z0-9]{5,}' .env
    ISSUES=$((ISSUES + 1))
  else
    echo -e "  ${GREEN}PASS${NC}  No real API keys in .env"
  fi

  # 2. Check for hardcoded passwords
  if grep -qE 'PASSWORD=anfsf123|PASSWORD=admin|PASSWORD=password' .env 2>/dev/null; then
    echo -e "  ${RED}FAIL${NC}  Default/hardcoded password found in .env"
    ISSUES=$((ISSUES + 1))
  else
    echo -e "  ${GREEN}PASS${NC}  No default passwords in .env"
  fi
else
  echo -e "  ${RED}FAIL${NC}  .env file missing (create from .env.example: cp .env.example .env)"
  ISSUES=$((ISSUES + 1))
fi

# 3. Check .env is gitignored
if grep -qE '^\.env$' .gitignore 2>/dev/null; then
  echo -e "  ${GREEN}PASS${NC}  .env is in .gitignore"
else
  echo -e "  ${RED}FAIL${NC}  .env NOT in .gitignore"
  ISSUES=$((ISSUES + 1))
fi

# 4. Check .env is NOT tracked by git
if git ls-files .env 2>/dev/null | grep -q .env; then
  echo -e "  ${RED}FAIL${NC}  .env is tracked by git (git rm --cached .env)"
  ISSUES=$((ISSUES + 1))
else
  echo -e "  ${GREEN}PASS${NC}  .env is not tracked by git"
fi

# 5. Check .env.example exists
if [ -f .env.example ]; then
  echo -e "  ${GREEN}PASS${NC}  .env.example exists"
else
  echo -e "  ${RED}FAIL${NC}  .env.example is missing"
  ISSUES=$((ISSUES + 1))
fi

echo ""
echo "Result: $ISSUES issue(s) found"
if [ "$ISSUES" -gt 0 ]; then
  exit 1
fi
