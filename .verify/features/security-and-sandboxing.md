# Security and Sandboxing

Defensive boundaries, path traversal guards, expression sandbox isolation, output sanitization, and in-memory decompression protecting the orchestrator against malicious inputs, prompt injection, and host compromise.

## Sub-features

- `path-traversal-defense`: Strict boundary checks preventing file access outside repository roots.
  - Intent: Prevent malicious sub-pipeline or workflow references from reading host sensitive files.
  - Behaviour: Validates resolved file targets against base directory paths using `path.resolve` and separator checks.
  - Outcome: Rejects paths containing traversal segments escaping the workspace.
- `expression-sandbox-isolation`: Pure expression evaluator immune to code execution and prototype pollution.
  - Intent: Evaluate `when:` conditions without exposing the runner to arbitrary JavaScript execution.
  - Behaviour: Uses strict tokenization and rejects prototype access (`__proto__`, `constructor`, `prototype`).
  - Outcome: Executes safe conditional expressions while blocking code injection and arbitrary execution.
- `in-memory-decompression`: Pure Node.js streaming decompression eliminating shell process invocation.
  - Intent: Extract stage artifact payloads without relying on vulnerable or missing host `unzip` binaries.
  - Behaviour: Parses ZIP headers and inflates payload buffers in-memory using `node:zlib` with a fallback mechanism.
  - Outcome: Safely extracts `outputs.json` across minimal containers, Windows, and Linux runners.
- `output-html-sanitization`: Context-aware XML/HTML entity escaping on all generated visual reports and SVG diagrams.
  - Intent: Prevent stored XSS and indirect prompt injection in pull request summaries and status dashboards.
  - Behaviour: Escapes `<`, `>`, `&`, `"`, and `'` on user-supplied strings before rendering HTML cards.
  - Outcome: Neutralizes adversarial markup and injection payloads embedded in branch or stage metadata.

## How to get to it (user POV)

- Expressions: Write conditional expressions in `when:` blocks using `${{ context.<stage>.<key> == 'val' }}` or `startsWith()`.
- Security verification: Run `.verify/run.sh security` to execute the full security and jailbreak suite.

## Verification Suites (Targeted Test Commands)

- **Security & Jailbreak Tests:** `cd pipeline-compose && pnpm test packages/core/src/compile/security.test.ts`
- **In-Memory Decompression Tests:** `cd pipeline-compose && pnpm test packages/action-run/src/github.test.ts`
- **Allowlisted Verification:** `.verify/run.sh security`
- **Preconditions:** Node.js >= 20, pnpm >= 10.

### 1. **traversal-and-sandbox-defenses** — rejects directory traversal and prototype pollution.
- **Request:** `pnpm test packages/core/src/compile/security.test.ts`
- **Why:** Proves that path traversal attacks, code injections, and prototype pollution are actively blocked.
- **Expected:** `7 passed (7)` with all security assertions verified.
- **Impact:** Shields GitHub Actions runners and CI environments from malicious PR inputs.

### 2. **pure-memory-decompression** — extracts outputs.json without shell execution.
- **Request:** `pnpm test packages/action-run/src/github.test.ts`
- **Why:** Proves that ZIP artifact extraction succeeds in memory using native `node:zlib`.
- **Expected:** `14 passed (14)` including `extractFileFromZipBuffer` suite.
- **Impact:** Eliminates host `unzip` process spawning and ensures compatibility in minimal container runners.

## Gotchas

- Global concurrency locks require `contents: write` token scope; ensure credentials adhere to least privilege.
- Expressions only support a strict whitelist of operators (`startsWith`, `contains`, `==`, `&&`, `||`); arbitrary logic must be encapsulated in stages.

## Code

- `pipeline-compose/packages/core/src/compile/security.test.ts`
- `pipeline-compose/packages/core/src/lib/expressions.ts`
- `pipeline-compose/packages/core/src/compile/sub-pipeline.ts`
- `pipeline-compose/packages/action-run/src/workflow-digest.ts`
- `pipeline-compose/packages/action-run/src/github.ts`
- `pipeline-compose/packages/core/src/compile/visualize.ts`
- `pipeline-compose/packages/core/src/lib/global-lock.ts`
