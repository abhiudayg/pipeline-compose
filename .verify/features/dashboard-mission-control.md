# Dashboard Mission Control

Interactive local web UI and Server-Sent Events (SSE) telemetry control room for real-time visualization, stage inspection, and GitHub Actions workflow dispatch.

## Sub-features

- `embedded-http-sse-server`: Native zero-dependency Node HTTP server serving the dashboard and streaming real-time status deltas.
  - Intent: Provide instant local mission control without requiring heavy web frameworks or external processes.
  - Behaviour: Binds to port 4321 (auto-incrementing if in use) and broadcasts GitHub run deltas every poll interval via `/api/events`.
  - Outcome: Enables real-time DAG state synchronization in local web browsers.
- `stitch-cybernetic-hud`: High-density dark telemetry UI built with the Stitch design system.
  - Intent: Deliver an aerospace-grade developer control room with clear visual hierarchy and status telemetry.
  - Behaviour: Renders wave-aligned DAG cards with pulsating cyan running badges, emerald successes, and bezier curve connectors.
  - Outcome: Provides immediate, high-fidelity insight into pipeline execution flow and stage statuses.
- `telemetry-stage-inspector`: Slide-over inspector drawer for examining stage configuration, artifacts, and logs.
  - Intent: Allow developers to drill into any stage to view inputs, JSON exports, and execution status.
  - Behaviour: Clicking any node highlights dependencies and opens the telemetry drawer with tabbed metadata and output inspectors.
  - Outcome: Simplifies debugging and tracing outputs across complex pipeline DAGs.
- `workflow-dispatch-gateway`: In-browser workflow triggering for entire pipelines or individual stages.
  - Intent: Allow manual execution directly from the local control room.
  - Behaviour: Dispatches workflows via GitHub Actions CLI bridge (`gh workflow run`) and confirms dispatch status in the UI.
  - Outcome: Closes the loop between pipeline observation and execution.

## How to get to it (user POV)

### 1. **dashboard-server-and-sse-verification** — unit and functional tests for HTTP routing and SSE streaming.
- **Request:** `pnpm test packages/cli/src/server.test.ts`
- **Why:** Verifies server startup, DAG JSON schema delivery, SSE delta broadcast, and stage dispatch without external network calls.
- **Expected:** `6 passed (6)`.
- **Impact:** Confirms the mission control server functions reliably across all endpoints.

### 2. **dashboard-cli-execution** — start the local dashboard from CLI.
- **Request:** `pnpm exec tsx packages/cli/src/main.ts dashboard .github/pipelines/pipeline.yml --no-live`
- **Why:** Tests CLI option parsing and server lifecycle.
- **Expected:** Server binds and prints URL `http://localhost:4321`.
- **Impact:** Ensures developers can launch the control room with a single command.

## Gotchas

- When `--live` is enabled, GitHub API rate limits apply based on the user's `gh auth` credentials.
- Auto-open browser requires supported OS commands (`open` on macOS, `xdg-open` on Linux, `start` on Windows).
- Offline mode (`--no-live`) displays static pipeline definition and local state without connecting to GitHub.

## Code

- `pipeline-compose/packages/cli/src/dashboard-html.ts`
- `pipeline-compose/packages/cli/src/server.ts`
- `pipeline-compose/packages/cli/src/server.test.ts`
- `pipeline-compose/packages/cli/src/main.ts`
- `pipeline-compose/packages/core/src/compile/visualize.ts`
