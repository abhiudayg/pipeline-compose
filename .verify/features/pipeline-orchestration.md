# Pipeline Orchestration

Cross-repository and intra-repository workflow DAG execution inside GitHub Actions that executes stages in dependency order, aggregates stage outputs via artifacts, enforces mutual exclusion via global locks, and caches previous attempt outputs via attempt-scoped smart rerun.

## Sub-features

- `stage-wave-dispatch`: Partitions pipeline stages into concurrent execution waves using Kahn's topological sort.
  - Intent: Run independent stages in parallel while respecting `needs:` dependencies.
  - Behaviour: Computes in-degree for all stages and groups zero-dependency nodes into sequential waves.
  - Outcome: Concurrently dispatches workflow jobs per wave via GitHub Actions REST API.
- `artifact-context-merge`: Out-of-band stage data transmission via short-lived workflow artifacts.
  - Intent: Pass structured outputs between stages across repository boundaries without size limits.
  - Behaviour: `pipeline-compose-export` writes `outputs.json` to an artifact; orchestrator downloads and merges into `context.<stage>.*`.
  - Outcome: Downstream stages receive dynamic inputs evaluated from upstream stage outputs.
- `smart-rerun-cache`: Reuses prior attempt outputs when stage inputs and workflow digests remain unchanged.
  - Intent: Prevent redundant execution of expensive succeeded stages on workflow retry.
  - Behaviour: Computes SHA-256 fingerprint over inputs, ref, and workflow file; reuses attempt-1 outputs on attempt-2+.
  - Outcome: Skips dispatch of unchanged stages and logs saved execution time.
- `global-concurrency-lock`: Cross-repository mutual exclusion protecting shared environments.
  - Intent: Prevent concurrent pipeline runs from conflicting over shared deployment targets.
  - Behaviour: Performs atomic compare-and-swap lock acquisition on a designated lock repository.
  - Outcome: Overlapping pipeline executions are serialized or safely failed without race conditions.

## How to get to it (user POV)

- Action entry: Include `uses: abhiudayg/pipeline-compose-run@v1` in an entry workflow pointing to `.github/pipelines/pipeline.yml`.
- Output export: Add `uses: abhiudayg/pipeline-compose-export@v1` with `stage_id` and `outputs` JSON in stage workflows.
- CLI simulation: Run `pipeline-compose validate <pipeline.yml> --simulate` to preview wave execution order and skip decisions.

## Verification Suites (Targeted Test Commands)

- **Unit Tests:** `cd pipeline-compose && pnpm test packages/action-run/src/orchestrator.test.ts`
- **Wave Ordering Tests:** `cd pipeline-compose && pnpm test packages/core/src/compile/stage-waves.test.ts`
- **Smart Rerun Tests:** `cd pipeline-compose && pnpm test packages/core/src/lib/smart-rerun.test.ts`
- **Allowlisted Verification:** `.verify/run.sh unit`
- **Preconditions:** Node.js >= 20, pnpm >= 10, repository dependencies installed via `pnpm install`.

### 1. **wave-partitioning** — stages without mutual dependencies execute in parallel waves.
- **Request:** `pnpm test packages/core/src/compile/stage-waves.test.ts`
- **Why:** Proves that stages with zero shared dependencies partition into concurrent waves.
- **Expected:** `3 passed (3)` with all wave grouping assertions verified.
- **Impact:** Guarantees parallelization correctness across multi-stage DAGs.

### 2. **orchestrator-dispatch-and-artifacts** — orchestrator runs stages, polls runs, and merges artifact outputs.
- **Request:** `pnpm test packages/action-run/src/orchestrator.test.ts`
- **Why:** Proves the orchestrator dispatch loop, polling mechanism, context merge, and smart rerun cache in isolation.
- **Expected:** `13 passed (13)` with mock GitHub API client.
- **Impact:** Confirms runtime orchestration works end-to-end without live GitHub credentials.

## Gotchas

- Orchestrator runner remains active and billable during the entire duration of all downstream stages (orchestrator polling overhead).
- Global concurrency lock files commit to Git history unless directed to a dedicated lock repository.
- Sub-pipeline nesting is strictly hard-capped at depth 1.

## Code

- `pipeline-compose/packages/action-run/src/orchestrator.ts`
- `pipeline-compose/packages/action-run/src/github.ts`
- `pipeline-compose/packages/action-run/src/smart-rerun.ts`
- `pipeline-compose/packages/action-run/src/global-lock-enforce.ts`
- `pipeline-compose/packages/action-export/src/outputs.ts`
- `pipeline-compose/packages/action-export/src/index.ts`
- `pipeline-compose/packages/core/src/compile/stage-waves.ts`
- `pipeline-compose/packages/core/src/lib/smart-rerun.ts`
- `pipeline-compose/packages/core/src/lib/global-lock.ts`
