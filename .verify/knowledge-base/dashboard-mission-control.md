# Knowledge Base: Dashboard Mission Control

## Overview
The Dashboard Mission Control (`pipeline-compose dashboard` / `serve`) is a local web-based control room designed with the Google Stitch Cybernetic HUD aesthetic. It runs on a zero-dependency embedded Node `http` server, querying GitHub Actions runs and streaming live updates to the browser via Server-Sent Events (SSE).

## Architectural Principles
1. **Zero Production Dependencies**: Implemented strictly using Node standard libraries (`node:http`, `node:child_process`, `node:fs`, `node:path`), avoiding bulky web frameworks like Express or Vite.
2. **Push-Based Updates via SSE**: Clients connect once to `/api/events` (`text/event-stream`); the server polls GitHub Actions periodically and broadcasts state deltas.
3. **Resilient Port Allocation**: Automatically checks port availability and increments if port 4321 is occupied.
4. **Stitch Cybernetic Aesthetic**: Built with Tailwind CSS CDN, JetBrains Mono, and Geist typography, using Material Symbols and custom SVG bezier curves.

## API Specification
- `GET /`: Returns the single-page application dashboard HTML.
- `GET /api/pipeline`: Returns the parsed and validated `ResolvedPipeline` schema.
- `GET /api/state`: Returns the dictionary of stage states (`{ [stageId]: StageState }`).
- `GET /api/events`: SSE stream broadcasting initial state and periodic update deltas (`data: {...}\n\n`).
- `POST /api/dispatch`: Dispatches a workflow for the whole pipeline or a specific stage (`{ "stageId": "..." }`).
