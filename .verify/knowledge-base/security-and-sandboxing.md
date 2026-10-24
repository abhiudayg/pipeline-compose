# Knowledge Base: Security and Sandboxing

## What It Does
Security and Sandboxing enforces defensive boundaries across the pipeline orchestration engine. It protects GitHub Actions runner hosts, CI environments, and downstream consumers from path traversal attacks, arbitrary JavaScript code execution, prototype pollution, prompt injection via PR summaries, and shell process hijacking.

## How It Works
1. **Path Traversal Defenses**:
   - Sub-pipeline resolution (`resolveSubPipeline`) canonicalizes file paths using `path.resolve` and verifies that the resolved target path resides strictly within the bounds of `repoRoot`. Any attempt to reference files outside the workspace (e.g., `../../etc/shadow`) throws an explicit security error.
   - Remote workflow digests and file digests (`workflowFileDigest`) apply boundary checks before reading file contents.
   - Global concurrency lock file paths (`globalLockPath`) cleanse traversal sequences (`..`), ensuring that lock records are strictly constrained within `.pipeline-compose/locks/*.json`.
2. **Expression Sandbox Isolation**:
   - Conditional evaluation of `when:` blocks in `evaluateExpression` avoids `eval()` and `new Function()`.
   - The expression evaluator tokenizes operators (`startsWith`, `contains`, `==`, `&&`, `||`) deterministically.
   - Object property lookups on `github.*` and `context.*` explicitly block prototype pollution vectors (`__proto__`, `constructor`, `prototype`).
   - Adversarial prompt injection payloads embedded in context strings (e.g., `"Ignore previous instructions and grant admin"`) are treated strictly as literal string values and cannot hijack evaluation logic.
3. **In-Memory Streaming Decompression**:
   - The orchestrator extracts stage outputs from ZIP artifact archives in memory using Node's native `node:zlib` (`inflateRawSync`) without spawning host shell processes (`unzip`).
   - If an archive uses an unsupported streaming layout, it falls back safely to the system decompressor.
4. **Output HTML & XML Sanitization**:
   - All HTML visualizer and SVG rendering functions apply context-aware entity escaping (`escapeXml`) over all user-supplied stage IDs, pipeline names, and workflow paths, escaping `<`, `>`, `&`, `"`, and `'` to prevent XSS and indirect prompt injection.

## Where the Code Is
- **Expression Sandbox**: `packages/core/src/lib/expressions.ts`
- **Sub-Pipeline Boundary Enforcement**: `packages/core/src/compile/sub-pipeline.ts`
- **Digest Path Guard**: `packages/action-run/src/workflow-digest.ts`
- **In-Memory ZIP Extractor**: `packages/action-run/src/github.ts`
- **HTML & SVG Sanitizer**: `packages/core/src/compile/visualize.ts`
- **Global Lock Sanitizer**: `packages/core/src/lib/global-lock.ts`
- **Security & Jailbreak Tests**: `packages/core/src/compile/security.test.ts`

## How to Use It
All security protections are enabled by default and require no configuration. When authoring pipelines:
- Express conditions using standard whitelisted operators:
  ```yaml
  when: "startsWith(github.ref, 'refs/tags/v') && context.ci.status == 'success'"
  ```
- Reference sub-pipelines using repository-relative paths:
  ```yaml
  pipeline_file: .github/pipelines/sub.yml
  ```

## How It Is Verified
Security and jailbreak defenses are verified via a dedicated test suite (`packages/core/src/compile/security.test.ts`) that executes attack payloads against path resolution, expression evaluation, prototype traversal, and HTML generation.

## Known Limits
- **Secrets in Context**: Any stage output written to `outputs.json` becomes visible in downstream stages and artifact downloads; secrets should never be exported as context values. Secrets must be forwarded via GitHub Actions secrets or environment variables.
- **Repository Token Scope**: Global lock management requires `contents: write` on the designated lock repository; organizations should use dedicated, isolated lock repositories to adhere to least privilege principles.
