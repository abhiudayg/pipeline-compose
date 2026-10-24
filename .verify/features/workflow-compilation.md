# Workflow Compilation

Static compilation of declarative pipeline DAG definitions into standard GitHub Actions workflow YAML files with native needs dependencies, accompanied by offline validation, topological sorting, simulation, and monorepo task graph importing.

## Sub-features

- `yaml-workflow-codegen`: Emits native multi-job GitHub Actions workflows from pipeline definitions.
  - Intent: Provide single-repo teams with committed audit trails and native GitHub UX without an orchestrator runner.
  - Behaviour: Translates stage `needs:` and `${{ context.stage.output }}` into `${{ needs.stage.outputs.output }}`.
  - Outcome: Produces deterministic `.github/workflows/*.yml` files.
- `pipeline-schema-validation`: Enforces JSON schema constraints and catches DAG cycles ahead of execution.
  - Intent: Prevent invalid pipelines, schema v1 regressions, and cycles from reaching CI.
  - Behaviour: Evaluates definitions against Ajv JSON schemas and detects circular dependencies via topological sort.
  - Outcome: Emits clear error codes and fails pre-merge validation when defects exist.
- `monorepo-task-import`: Automatically converts Turborepo, Nx, or Rush task graphs into pipeline definitions.
  - Intent: Enable seamless adoption in monorepos without manual YAML authoring.
  - Behaviour: Reads package/task dependencies and builds equivalent stage DAGs.
  - Outcome: Emits valid `pipeline.yml` ready for orchestration or compilation.

## How to get to it (user POV)

- CLI compile: Run `pipeline-compose compile <pipeline.yml> -o .github/workflows/pipeline.yml` to generate workflow YAML.
- CLI validate: Run `pipeline-compose validate <pipeline.yml> --strict` to check schemas and DAG invariants.
- CLI import: Run `pipeline-compose import turbo --config turbo.json` to generate starter pipeline definitions.

## Verification Suites (Targeted Test Commands)

- **Codegen Unit Tests:** `cd pipeline-compose && pnpm test packages/core/src/compile/codegen.test.ts`
- **Schema Validation Tests:** `cd pipeline-compose && pnpm test packages/core/src/compile/validator.test.ts`
- **Monorepo Import Tests:** `cd pipeline-compose && pnpm test packages/core/src/import/monorepo-tasks.test.ts`
- **Allowlisted Verification:** `.verify/run.sh functional`
- **Preconditions:** Node.js >= 20, pnpm >= 10.

### 1. **codegen-native-wiring** — translates stage graph into native needs jobs.
- **Request:** `pnpm test packages/core/src/compile/codegen.test.ts`
- **Why:** Proves that pipeline YAML produces valid GitHub Actions workflow YAML with correct `needs:` dependencies.
- **Expected:** `3 passed (3)` with all workflow generation assertions satisfied.
- **Impact:** Ensures compile-path workflows execute accurately on standard GitHub Actions runners.

### 2. **schema-and-cycle-validation** — rejects schema v1 and cycles with deterministic errors.
- **Request:** `pnpm test packages/core/src/compile/validator.test.ts`
- **Why:** Proves that invalid structures and cyclic dependency graphs fail immediately before CI execution.
- **Expected:** `10 passed (10)` with strict schema checks.
- **Impact:** Prevents malformed or broken DAGs from being merged or executed.

## Gotchas

- Compiled workflows cannot dynamically invoke workflows across external repositories without static reusable workflow configurations.
- Sub-pipelines (`pipeline_file`) are not supported in compilation mode; they require the runtime orchestrator (`pipeline-compose-run`).

## Code

- `pipeline-compose/packages/action-compile/src/index.ts`
- `pipeline-compose/packages/cli/src/main.ts`
- `pipeline-compose/packages/core/src/compile/codegen.ts`
- `pipeline-compose/packages/core/src/compile/parser.ts`
- `pipeline-compose/packages/core/src/compile/validator.ts`
- `pipeline-compose/packages/core/src/compile/simulate.ts`
- `pipeline-compose/packages/core/src/compile/mermaid.ts`
- `pipeline-compose/packages/core/src/compile/workflow-init.ts`
- `pipeline-compose/packages/core/src/import/monorepo-tasks.ts`
