# Knowledge Base: Workflow Compilation

## What It Does
Workflow Compilation converts pipeline YAML definitions into standard, static GitHub Actions workflow files with native `needs:` job dependencies. It is designed for single-repository topologies where organizations require committed workflow audit trails, native GitHub Actions visualization, and zero orchestrator runner overhead. The compiler is paired with an extensive offline CLI toolchain for validation, dry-run simulation, Mermaid diagram generation, and monorepo task graph imports.

## How It Works
1. **Schema & Cycle Validation**: The compiler reads `.github/pipelines/pipeline.yml` and validates it against `pipeline-v2.schema.json` via Ajv. It runs topological sorting to detect any circular dependencies or orphan stages before generating output.
2. **YAML Code Generation**: For each stage in the pipeline, the compiler generates a GitHub Actions job referencing the reusable workflow path (`uses: ./...`). Context references formatted as `${{ context.<stage>.<key> }}` are automatically translated into native job dependency references: `${{ needs.<stage>.outputs.<key> }}`.
3. **Parity Enforcement**: The compiled workflow includes a `compile-check` job verifying that the committed `.github/workflows/pipeline.yml` matches the output of `pipeline-compose compile` on every pull request, preventing configuration drift.
4. **Monorepo Task Graph Import**: The CLI toolchain can inspect existing monorepo build tools (Turborepo `turbo.json`, Nx `nx.json`, or Rush `command-line.json`) and generate an equivalent pipeline DAG automatically.

## Where the Code Is
- **Workflow Codegen**: `packages/core/src/compile/codegen.ts`
- **Schema & Policy Validator**: `packages/core/src/compile/validator.ts`, `packages/core/src/compile/validate-policy.ts`
- **Topological Sorting**: `packages/core/src/compile/topo-sort.ts`
- **Simulation Engine**: `packages/core/src/compile/simulate.ts`
- **Mermaid & Visualizer**: `packages/core/src/compile/mermaid.ts`, `packages/core/src/compile/visualize.ts`
- **Compile Action Wrapper**: `packages/action-compile/src/index.ts`
- **Monorepo Task Importers**: `packages/core/src/import/monorepo-tasks.ts`, `packages/core/src/import/render-import.ts`
- **CLI Entrypoint**: `packages/cli/src/main.ts`

## How to Use It
1. Run compilation from the repository root:
   ```bash
   pipeline-compose compile .github/pipelines/pipeline.yml -o .github/workflows/pipeline.yml
   ```
2. Commit the generated workflow:
   ```bash
   git add .github/workflows/pipeline.yml && git commit -m "chore: compile pipeline workflow"
   ```
3. Use the CLI to dry-run simulate execution:
   ```bash
   pipeline-compose validate .github/pipelines/pipeline.yml --simulate
   ```
4. Render an offline Mermaid diagram:
   ```bash
   pipeline-compose validate .github/pipelines/pipeline.yml --mermaid
   ```

## How It Is Verified
Verification is performed via unit test suites asserting exact AST parity between the generated YAML and expected GitHub Actions workflow syntax, schema validation tests against invalid fixtures, and CLI integration tests.

## Known Limits
- **Cross-Repository Limitation**: Compiled workflows rely on native GitHub Actions reusable workflows (`uses: ./...`); they cannot dynamically dispatch to cross-repository stages without pre-configuring reusable workflow permissions and static repository coordinates.
- **Sub-Pipeline Exclusion**: Nested sub-pipelines (`pipeline_file`) are not supported in compilation mode; they must be flattened or executed via `pipeline-compose-run`.
