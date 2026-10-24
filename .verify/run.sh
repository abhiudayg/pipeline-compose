#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${1:-all}"
RUN_ID="$(date -u '+%Y%m%d-%H%M%S')"
LOG_DIR="$ROOT/.verify/artifacts"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/run-${RUN_ID}.log"

exec > >(tee "$LOG_FILE") 2>&1

echo "=================================================="
echo "agstack Verification Harness: pipeline-action"
echo "Phase Target: $TARGET"
echo "Run ID: $RUN_ID"
echo "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "=================================================="

run_doctor() {
  echo "--- Phase 1: Doctor ---"
  bash "$ROOT/.verify/doctor.sh"
}

run_unit() {
  echo "--- Phase 2: Unit Tests (Vitest) ---"
  cd "$ROOT/pipeline-compose"
  pnpm test
}

run_static() {
  echo "--- Phase 3: Static & Typecheck Build ---"
  cd "$ROOT/pipeline-compose"
  pnpm run build
}

run_functional() {
  echo "--- Phase 4: Functional CLI DAG & Compile ---"
  cd "$ROOT/pipeline-compose"
  pnpm exec tsx packages/cli/src/main.ts validate .github/pipelines/pipeline.yml --workflows --strict --simulate
  pnpm exec tsx packages/cli/src/main.ts compile .github/pipelines/pipeline.yml -o /tmp/verify-compiled.yml
  echo "Generated workflow compiled successfully."
}

run_security() {
  echo "--- Phase 5: Security Audit & Jailbreak Defense ---"
  cd "$ROOT/pipeline-compose"
  pnpm test packages/core/src/compile/security.test.ts
}

case "$TARGET" in
  doctor)
    run_doctor
    ;;
  unit)
    run_unit
    ;;
  static)
    run_static
    ;;
  functional)
    run_functional
    ;;
  security)
    run_security
    ;;
  all|"")
    run_doctor
    run_static
    run_unit
    run_functional
    run_security
    ;;
  *)
    echo "Unknown target phase: $TARGET" >&2
    echo "Usage: $0 [all|doctor|unit|static|functional|security]" >&2
    exit 1
    ;;
esac

echo "=================================================="
echo "Verification Suite Succeeded: Exit Code 0"
echo "Log preserved at: $LOG_FILE"
echo "=================================================="
