#!/usr/bin/env bash
set -euo pipefail

echo "==> Running Doctor: Environment & Tooling Checks"

fail=0

if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node -v)
  echo "  [OK] node.js: $NODE_VER"
else
  echo "  [FAIL] node.js is not installed"
  fail=1
fi

if command -v pnpm >/dev/null 2>&1; then
  PNPM_VER=$(pnpm -v)
  echo "  [OK] pnpm: $PNPM_VER"
else
  echo "  [FAIL] pnpm is not installed"
  fail=1
fi

if command -v git >/dev/null 2>&1; then
  GIT_VER=$(git --version)
  echo "  [OK] git: $GIT_VER"
else
  echo "  [FAIL] git is not installed"
  fail=1
fi

if command -v /opt/homebrew/bin/container >/dev/null 2>&1 || command -v container >/dev/null 2>&1; then
  echo "  [OK] Apple container runtime available"
else
  echo "  [WARN] Apple container runtime not found in standard paths"
fi

if [[ $fail -ne 0 ]]; then
  echo "Doctor checks failed." >&2
  exit 1
fi

echo "Doctor checks passed successfully."
exit 0
