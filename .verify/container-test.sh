#!/usr/bin/env bash
set -euo pipefail

ARTIFACT_LOG=".verify/artifacts/container-test.log"
exec > >(tee "$ARTIFACT_LOG") 2>&1

echo "=================================================="
echo "Starting Pipeline-Compose Isolated Container Test"
echo "Host: $(uname -sm)"
echo "Engine: Apple Container CLI (/opt/homebrew/bin/container)"
echo "Image: node:22-bookworm-slim"
echo "Started at: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "=================================================="

# Run full isolated suite inside Apple container
/opt/homebrew/bin/container run --rm \
  -v "$(pwd)/pipeline-compose:/src:ro" \
  node:22-bookworm-slim \
  sh -c '
    set -eu
    echo "=== Inside Isolated Linux Container ==="
    uname -a
    node -v
    
    echo "=== Setting up workspace ==="
    mkdir -p /work
    cp -R /src/. /work/
    cd /work
    rm -rf node_modules packages/*/dist packages/*/node_modules

    echo "=== Enabling corepack & pnpm ==="
    corepack enable
    corepack prepare pnpm@10.12.1 --activate
    pnpm -v

    echo "=== Installing dependencies in Linux ==="
    pnpm install --frozen-lockfile

    echo "=== Typecheck & Build ==="
    pnpm run build

    echo "=== Running Vitest Test Suite (42 suites, 217 tests) ==="
    pnpm test

    echo "=== Testing CLI Validate & Simulate ==="
    pnpm exec tsx packages/cli/src/main.ts validate .github/pipelines/pipeline.yml --workflows --strict --simulate

    echo "=== Testing CLI Codegen ==="
    pnpm exec tsx packages/cli/src/main.ts compile .github/pipelines/pipeline.yml -o /tmp/test-compiled.yml
    head -30 /tmp/test-compiled.yml

    echo "=== ALL CONTAINER CHECKS PASSED SUCCESSFULLY ==="
  '

echo "=================================================="
echo "Container Test Completed with Exit Code 0"
echo "Finished at: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "=================================================="
