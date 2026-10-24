# Knowledge Base: Pipeline Orchestration

## What It Does
Pipeline Orchestration provides a dynamic runtime engine for executing multi-stage, multi-repository GitHub Actions workflows according to a declarative directed acyclic graph (DAG) defined in `.github/pipelines/pipeline.yml`. It coordinates workflow dispatching across repositories, synchronizes parallel execution waves, passes structured output payloads between stages using short-lived GitHub Actions artifacts, enforces global cross-repo mutual exclusion, and skips redundant executions on workflow retries using smart rerun fingerprinting.

## How It Works
The orchestration lifecycle operates in four stages:
1. **DAG Parsing & Wave Grouping**: The orchestrator (`pipeline-compose-run`) parses the pipeline definition using `@aeswibon/pipeline-compose-core`. It validates stage schemas and computes dependency waves using Kahn's topological sorting algorithm. Stages within the same wave have zero inter-dependencies and are executed concurrently.
2. **Dynamic Dispatch & Polling**: For each wave, the orchestrator dispatches stage workflows using the GitHub Actions REST API (`workflow_dispatch`). It resolves repository tokens via PAT mappings or GitHub App installation tokens. It enters a 10-second polling loop inspecting workflow run conclusion states until all stages in the wave complete.
3. **Artifact-Backed Context Bus**: Stage workflows that declare outputs invoke `pipeline-compose-export`, which serializes the output object to `pipeline-compose/outputs.json` and uploads an artifact named `pipeline-compose-<stageId>` with a 1-day retention policy. Upon stage completion, the orchestrator downloads and parses the artifact in-memory, merging the key-value pairs into the global `context.<stage>.*` state.
4. **Smart Rerun Cache**: If a workflow fails and an operator clicks "Re-run failed jobs", the orchestrator detects `GITHUB_RUN_ATTEMPT > 1`. It computes a SHA-256 fingerprint for each stage based on inputs, ref, and workflow file digests. If the fingerprint matches the previous attempt's record, the stage is skipped and its previous outputs are reused.

## Where the Code Is
- **Runtime Orchestrator**: `packages/action-run/src/orchestrator.ts`
- **GitHub API Client & In-Memory Decompressor**: `packages/action-run/src/github.ts`
- **Token Resolution & GitHub App Integration**: `packages/action-run/src/repo-tokens.ts`, `packages/action-run/src/github-app.ts`
- **Smart Rerun Engine**: `packages/action-run/src/smart-rerun.ts`, `packages/core/src/lib/smart-rerun.ts`
- **Output Export Action**: `packages/action-export/src/index.ts`, `packages/action-export/src/outputs.ts`
- **DAG Wave Partitioning**: `packages/core/src/compile/stage-waves.ts`, `packages/core/src/compile/topo-sort.ts`

## How to Use It
1. Define a pipeline in `.github/pipelines/pipeline.yml`:
   ```yaml
   version: 2
   pipelines:
     release:
       stages:
         - id: build
           workflow: .github/workflows/build.yml
         - id: test
           workflow: .github/workflows/test.yml
           repo: my-org/e2e-tests
           needs: [build]
           inputs:
             tag: ${{ context.build.tag }}
   ```
2. In the target stage workflow, export outputs:
   ```yaml
   - uses: abhiudayg/pipeline-compose-export@v1
     with:
       stage_id: build
       outputs: '{"tag": "v1.2.3"}'
   ```
3. In the entry repository workflow, invoke the runner:
   ```yaml
   - uses: abhiudayg/pipeline-compose-run@v1
     with:
       pipeline_file: .github/pipelines/pipeline.yml
   ```

## How It Is Verified
Verification is driven through unit and mock orchestrator tests in Vitest. A virtual mock GitHub Actions client simulates workflow dispatches, run status polling, artifact downloads, and commit status transitions without requiring live GitHub credentials or network access.

## Known Limits
- **Orchestrator Idle Cost**: The orchestrator job remains active on a VM runner during the execution of all child stages, consuming billable minutes during long-running workflows.
- **Sub-Pipeline Depth**: Sub-pipeline nesting is capped at 1 level; nested pipelines cannot define child sub-pipelines.
- **Artifact Propagation Latency**: GitHub Actions artifacts occasionally experience brief propagation delays before becoming accessible via the REST API.
