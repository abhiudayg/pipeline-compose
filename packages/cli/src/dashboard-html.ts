import type { ResolvedPipeline, StageState } from '@aeswibon/pipeline-compose-core';

export interface DashboardHtmlOptions {
  pipeline: ResolvedPipeline;
  initialState?: Record<string, StageState>;
  port: number;
  pollSeconds: number;
  live: boolean;
}

export function renderDashboardHtml(options: DashboardHtmlOptions): string {
  const { pipeline, initialState = {}, port, pollSeconds, live } = options;

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pipeline Compose :: Mission Control — ${escapeHtml(pipeline.name)}</title>
  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: {
              cyan: '#00dce6',
              emerald: '#3fb950',
              crimson: '#f85149',
              amber: '#d29922',
              blue: '#58a6ff',
              purple: '#bc8cff',
            },
            surface: {
              base: '#0d1117',
              canvas: '#0b0f14',
              container: '#131922',
              elevated: '#1a222e',
              border: '#263344',
              muted: '#7d8da1',
              text: '#f0f6fc',
            }
          },
          fontFamily: {
            mono: ['"JetBrains Mono"', 'monospace'],
            sans: ['"Geist"', '-apple-system', 'sans-serif'],
          }
        }
      }
    };
  </script>
  <style>
    body {
      background-color: #0b0f14;
      color: #f0f6fc;
      font-family: 'Geist', -apple-system, sans-serif;
    }
    .code-font { font-family: 'JetBrains Mono', monospace; }
    .dot-grid {
      background-image: radial-gradient(rgba(38, 51, 68, 0.7) 1px, transparent 1px);
      background-size: 20px 20px;
    }
    .hud-box {
      background: #131922;
      border: 1px solid #263344;
      border-radius: 8px;
    }
    .hud-node {
      background: #131922;
      border: 1px solid #263344;
      border-radius: 8px;
      transition: all 0.18s ease;
    }
    .hud-node:hover {
      border-color: #00dce6;
      box-shadow: 0 4px 16px rgba(0, 220, 230, 0.15);
    }
    .hud-node.active-selected {
      border-color: #00dce6 !important;
      box-shadow: 0 0 0 2px rgba(0, 220, 230, 0.4), 0 8px 24px rgba(0, 220, 230, 0.2) !important;
    }
    .hud-node.status-success {
      border-left: 3px solid #3fb950;
    }
    .hud-node.status-running {
      border-color: #00dce6;
      border-left: 3px solid #00dce6;
      box-shadow: 0 0 20px rgba(0, 220, 230, 0.2);
    }
    .hud-node.status-failure {
      border-left: 3px solid #f85149;
      background: rgba(248, 81, 73, 0.05);
    }
    @keyframes pulse-cyan {
      0%, 100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 4px #00dce6); }
      50% { opacity: 0.35; transform: scale(1.15); filter: drop-shadow(0 0 8px #00dce6); }
    }
    .pulse-dot { animation: pulse-cyan 1.8s infinite ease-in-out; }
    @keyframes dash-flow {
      to { stroke-dashoffset: -32; }
    }
    .flow-active {
      stroke-dasharray: 6 6;
      animation: dash-flow 1.2s linear infinite;
    }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: #0b0f14; }
    ::-webkit-scrollbar-thumb { background: #263344; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #7d8da1; }
  </style>
</head>
<body class="h-screen flex flex-col bg-[#0b0f14] overflow-hidden selection:bg-brand-cyan/20 selection:text-brand-cyan">
  <!-- Layer 1: Top Main HUD Navigation -->
  <header class="h-12 border-b border-surface-border bg-surface-container flex items-center justify-between px-4 z-40 flex-shrink-0">
    <div class="flex items-center gap-3">
      <!-- Logo -->
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-brand-cyan text-xl">hub</span>
        <span class="font-bold text-xs uppercase tracking-wider text-surface-text code-font">Pipeline <span class="text-brand-cyan">Compose</span></span>
      </div>

      <!-- Pipeline Pill -->
      <div class="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-elevated border border-surface-border text-xs code-font text-surface-text">
        <span class="material-symbols-outlined text-xs text-surface-muted">description</span>
        <span>${escapeHtml(pipeline.name)}.yml</span>
        <span class="material-symbols-outlined text-xs text-surface-muted">expand_more</span>
      </div>

      <!-- Git Branch & Commit Pill -->
      <div class="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-elevated border border-surface-border text-xs code-font text-surface-text">
        <span class="material-symbols-outlined text-xs text-brand-cyan">fork_right</span>
        <span class="text-surface-muted">main</span>
        <span class="text-surface-muted">@</span>
        <span class="text-brand-cyan">7f4a9b1</span>
      </div>

      <!-- Author Pill -->
      <div class="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-elevated border border-surface-border text-xs code-font text-surface-muted">
        <span class="w-4 h-4 rounded-full bg-brand-cyan/20 text-brand-cyan flex items-center justify-center text-[10px] font-bold">@</span>
        <span id="author-label">${escapeHtml(process.env.USER || 'developer')}</span>
      </div>

      <!-- Live Webhook Pill -->
      <div class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-brand-emerald/30 text-xs code-font text-brand-emerald">
        <span class="w-1.5 h-1.5 rounded-full bg-brand-emerald pulse-dot"></span>
        <span>GitHub Live (${pollSeconds}s)</span>
      </div>
    </div>

    <!-- Center Navigation Tabs -->
    <div class="hidden lg:flex items-center gap-6 text-xs code-font text-surface-muted font-medium h-full">
      <a href="#" class="text-brand-cyan border-b-2 border-brand-cyan h-full flex items-center px-1 font-bold">Workflows</a>
      <a href="#" class="hover:text-surface-text transition h-full flex items-center px-1">Executions</a>
      <a href="#" class="hover:text-surface-text transition h-full flex items-center px-1">Runners</a>
      <a href="#" class="hover:text-surface-text transition h-full flex items-center px-1">Environments</a>
      <a href="#" class="hover:text-surface-text transition h-full flex items-center px-1">Audit Log</a>
    </div>

    <!-- Right Quick Actions -->
    <div class="flex items-center gap-2">
      <button id="btn-export-svg" class="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-elevated hover:bg-surface-border text-xs code-font text-surface-text border border-surface-border transition">
        <span class="material-symbols-outlined text-sm">download</span>
        <span class="hidden sm:inline">Export SVG</span>
      </button>
      <button id="btn-dry-run" class="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-elevated hover:bg-surface-border text-xs code-font text-surface-text border border-surface-border transition">
        <span class="material-symbols-outlined text-sm text-brand-purple">code</span>
        <span class="hidden sm:inline">Dry Run</span>
      </button>
      <button id="btn-trigger" class="flex items-center gap-1.5 px-3 py-1 rounded bg-brand-cyan text-[#090d13] font-bold text-xs code-font uppercase tracking-wide hover:bg-[#00c5ce] transition shadow-md shadow-brand-cyan/25">
        <span class="material-symbols-outlined text-sm">play_arrow</span>
        <span>Trigger Run</span>
      </button>
      <button id="btn-fullscreen" class="p-1 rounded text-surface-muted hover:text-surface-text">
        <span class="material-symbols-outlined text-lg">fullscreen</span>
      </button>
      <button id="btn-settings" class="p-1 rounded text-surface-muted hover:text-surface-text">
        <span class="material-symbols-outlined text-lg">settings</span>
      </button>
    </div>
  </header>

  <!-- Layer 2: Run Meta Telemetry Header Strip -->
  <section class="h-10 border-b border-surface-border bg-surface-container/60 px-4 flex items-center justify-between text-xs code-font flex-shrink-0">
    <div class="flex items-center gap-4 text-surface-muted">
      <div class="flex items-center gap-1.5">
        <span class="text-surface-text font-bold">Run #4928</span>
        <span>/</span>
        <span>Triggered via <span class="text-surface-text font-semibold">workflow_dispatch</span></span>
      </div>
      <span>•</span>
      <div class="flex items-center gap-1.5">
        <span>Total Wall Time:</span>
        <span id="meta-wall-time" class="text-surface-text font-bold">04m 18s</span>
      </div>
      <span>•</span>
      <div class="flex items-center gap-1.5">
        <span id="meta-jobs-status" class="text-brand-emerald font-semibold">✓ <span id="meta-jobs-succeeded">${pipeline.stages.length}</span>/${pipeline.stages.length} Jobs Succeeded</span>
        <span id="meta-jobs-breakdown" class="text-surface-muted text-[11px]">(0 Failed, 0 Running)</span>
      </div>
    </div>

    <div class="flex items-center gap-4 text-surface-muted">
      <div class="flex items-center gap-1.5">
        <span>Concurrency:</span>
        <span class="text-surface-text font-bold">max 6/12 slots</span>
      </div>
      <span>•</span>
      <div class="flex items-center gap-1.5">
        <span class="material-symbols-outlined text-xs">dns</span>
        <span>Runner Pool:</span>
        <span class="text-surface-text font-semibold">self-hosted-k8s-us-east</span>
      </div>
    </div>
  </section>

  <!-- Layer 3: DAG Controls & View Toolbar -->
  <section class="h-9 border-b border-surface-border bg-surface-canvas px-4 flex items-center justify-between text-xs code-font flex-shrink-0">
    <!-- Zoom Controls -->
    <div class="flex items-center gap-2 text-surface-muted">
      <button id="btn-zoom-out" class="p-0.5 rounded hover:bg-surface-elevated hover:text-surface-text">
        <span class="material-symbols-outlined text-sm">remove</span>
      </button>
      <span id="zoom-level" class="text-surface-text font-bold">100%</span>
      <button id="btn-zoom-in" class="p-0.5 rounded hover:bg-surface-elevated hover:text-surface-text">
        <span class="material-symbols-outlined text-sm">add</span>
      </button>
      <button id="btn-zoom-fit" class="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-surface-elevated hover:text-surface-text border border-surface-border ml-2">
        <span class="material-symbols-outlined text-xs">fit_screen</span>
        <span>Fit</span>
      </button>
    </div>

    <!-- View Mode Toggles -->
    <div class="flex items-center gap-2">
      <span class="text-surface-muted uppercase text-[10px] font-bold">Wave Execution DAG • VIEW:</span>
      <div class="flex items-center bg-surface-container rounded border border-surface-border p-0.5">
        <button class="px-2 py-0.5 rounded bg-brand-cyan/15 text-brand-cyan font-bold">All Waves</button>
        <button class="px-2 py-0.5 rounded text-surface-muted hover:text-surface-text">Critical Path</button>
        <button class="px-2 py-0.5 rounded text-surface-muted hover:text-surface-text flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-brand-crimson"></span>Failed Only
        </button>
      </div>
    </div>

    <!-- Auto-Layout & Minimap -->
    <div class="flex items-center gap-2 text-surface-muted">
      <button class="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-surface-elevated hover:text-surface-text border border-surface-border">
        <span class="material-symbols-outlined text-xs text-brand-cyan">schema</span>
        <span>Auto-layout DAG</span>
      </button>
      <button class="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-surface-elevated hover:text-surface-text border border-surface-border">
        <span class="material-symbols-outlined text-xs">map</span>
        <span>Mini-map</span>
      </button>
    </div>
  </section>

  <!-- Layer 4: Main Workspace Area (DAG Canvas + Live Inspector) -->
  <main class="flex-1 flex overflow-hidden relative">
    <!-- Center DAG Canvas -->
    <div id="dag-container" class="flex-1 overflow-auto dot-grid relative p-6 flex flex-col items-start select-none">
      <div id="viewport" class="relative my-2" style="min-width: 1200px; min-height: 520px;">
        <!-- Wave Column Headers Background -->
        <div id="wave-headers" class="absolute top-0 left-0 right-0 flex gap-12 z-0 pointer-events-none"></div>

        <!-- SVG Connection Pipelines -->
        <svg id="dag-edges" class="absolute inset-0 pointer-events-none z-10 overflow-visible"></svg>

        <!-- Dynamic Stage Nodes -->
        <div id="dag-nodes" class="relative z-20"></div>
      </div>
    </div>

    <!-- Right Live Inspector Telemetry Panel (From Screenshot 1) -->
    <aside id="stage-drawer" class="stage-inspector w-[440px] border-l border-surface-border bg-surface-container flex flex-col z-30 flex-shrink-0 shadow-2xl">
      <!-- Inspector Top Bar -->
      <div class="p-3.5 border-b border-surface-border flex items-center justify-between bg-surface-elevated/40">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-brand-cyan pulse-dot"></span>
          <span id="inspector-title" class="font-bold text-sm code-font text-surface-text truncate max-w-[220px]">stage-inspector</span>
        </div>
        <div class="flex items-center gap-1.5">
          <button id="btn-cancel-stage" class="px-2 py-0.5 rounded bg-brand-crimson/15 text-brand-crimson hover:bg-brand-crimson/25 border border-brand-crimson/30 text-xs code-font font-semibold flex items-center gap-1">
            <span class="material-symbols-outlined text-xs">cancel</span>
            <span>Cancel</span>
          </button>
          <button id="btn-minimize-inspector" class="p-1 rounded text-surface-muted hover:text-surface-text">
            <span class="material-symbols-outlined text-sm">open_in_new</span>
          </button>
          <button id="btn-close-inspector" class="p-1 rounded text-surface-muted hover:text-surface-text">
            <span class="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      </div>

      <!-- Runner Node Subtitle -->
      <div class="px-4 py-2 border-b border-surface-border bg-[#0e131a] flex items-center justify-between text-xs code-font text-surface-muted">
        <div class="flex items-center gap-1.5 truncate">
          <span class="material-symbols-outlined text-xs">computer</span>
          <span id="inspector-runner" class="text-surface-text truncate">runner-amd64-pool-04</span>
        </div>
        <div class="text-[11px] text-surface-muted" id="inspector-region">us-east-2c (ephemeral)</div>
      </div>

      <!-- Live KPI 3-Box Metrics Strip -->
      <div class="p-3 border-b border-surface-border grid grid-cols-3 gap-2 text-xs code-font">
        <div class="hud-box p-2.5 flex flex-col justify-between">
          <span class="text-[10px] uppercase font-bold text-surface-muted">STATUS</span>
          <span id="kpi-status" class="text-brand-cyan font-bold text-xs truncate">Running (5/9)</span>
        </div>
        <div class="hud-box p-2.5 flex flex-col justify-between">
          <span class="text-[10px] uppercase font-bold text-surface-muted">EXECUTION TIME</span>
          <span id="kpi-duration" class="text-surface-text font-bold text-xs">03m 41s</span>
        </div>
        <div class="hud-box p-2.5 flex flex-col justify-between">
          <span class="text-[10px] uppercase font-bold text-surface-muted">ALLOCATED MEM</span>
          <span id="kpi-memory" class="text-surface-text font-bold text-xs">3.2 / 8.0 GB</span>
        </div>
      </div>

      <!-- Inspector Tab Navigation -->
      <div class="flex border-b border-surface-border bg-surface-canvas px-3 text-xs code-font font-medium">
        <button data-tab="steps" class="inspector-tab py-2 px-3 border-b-2 border-brand-cyan text-brand-cyan flex items-center gap-1.5 font-bold">
          <span>Step Logs</span>
          <span class="w-1.5 h-1.5 rounded-full bg-brand-cyan"></span>
        </button>
        <button data-tab="outputs" class="inspector-tab py-2 px-3 border-b-2 border-transparent text-surface-muted hover:text-surface-text flex items-center gap-1.5">
          <span>Outputs JSON</span>
          <span class="px-1.5 py-0.2 rounded-full bg-surface-elevated text-[10px] text-brand-cyan font-bold">2</span>
        </button>
        <button data-tab="inputs" class="inspector-tab py-2 px-3 border-b-2 border-transparent text-surface-muted hover:text-surface-text">
          <span>Workflow Inputs</span>
        </button>
        <button data-tab="runner" class="inspector-tab py-2 px-3 border-b-2 border-transparent text-surface-muted hover:text-surface-text">
          <span>Telemetry</span>
        </button>
      </div>

      <!-- Inspector Scrollable Body -->
      <div class="flex-1 overflow-y-auto flex flex-col text-xs code-font">
        <!-- Steps View Panel -->
        <div id="panel-steps" class="flex-1 flex flex-col">
          <!-- Step List Checklist -->
          <div class="p-3 border-b border-surface-border space-y-1.5 bg-[#0e131a]/60">
            <div class="flex items-center justify-between text-surface-muted p-1 rounded hover:bg-surface-elevated">
              <div class="flex items-center gap-2">
                <span class="text-brand-emerald">✓</span>
                <span class="text-surface-text font-medium">1. Set up Docker Buildx</span>
              </div>
              <span>4s</span>
            </div>
            <div class="flex items-center justify-between text-surface-muted p-1 rounded hover:bg-surface-elevated">
              <div class="flex items-center gap-2">
                <span class="text-brand-emerald">✓</span>
                <span class="text-surface-text font-medium">2. Login to GitHub Container Registry</span>
              </div>
              <span>2s</span>
            </div>
            <div class="flex items-center justify-between text-surface-muted p-1 rounded hover:bg-surface-elevated">
              <div class="flex items-center gap-2">
                <span class="text-brand-emerald">✓</span>
                <span class="text-surface-text font-medium">3. Extract metadata (tags, labels)</span>
              </div>
              <span>1s</span>
            </div>
            <div class="flex items-center justify-between text-brand-cyan bg-brand-cyan/10 p-1.5 rounded border border-brand-cyan/30">
              <div class="flex items-center gap-2 font-bold">
                <span class="material-symbols-outlined text-sm pulse-dot">sync</span>
                <span>4. Build and push multi-arch image</span>
              </div>
              <span class="font-bold">03m 34s</span>
            </div>
            <div class="flex items-center justify-between text-surface-muted/60 p-1">
              <div class="flex items-center gap-2">
                <span>○</span>
                <span>5. Generate SBOM attestation</span>
              </div>
              <span class="italic text-[10px]">queued</span>
            </div>
          </div>

          <!-- Streaming Step Terminal -->
          <div class="flex-1 flex flex-col bg-[#070a0e] border-b border-surface-border min-h-[220px]">
            <div class="px-3 py-1.5 bg-[#10141a] border-b border-surface-border flex items-center justify-between text-[11px] text-surface-muted">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-xs text-brand-cyan">terminal</span>
                <span class="text-surface-text font-semibold">Streaming: step_4_buildx.log</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-1.5 py-0.5 rounded bg-emerald-500/10 text-brand-emerald border border-brand-emerald/30 text-[10px] font-bold">CACHE HIT 1 match</span>
              </div>
            </div>
            <div id="inspector-terminal-lines" class="flex-1 p-3 overflow-y-auto space-y-1 text-[11px] font-mono leading-relaxed text-surface-muted bg-black/60">
              <div><span class="text-surface-muted/50 select-none mr-2">1</span><span class="text-surface-muted/80">[14:28:02.104]</span> <span class="text-brand-blue font-bold">INFO</span> #12 [linux/amd64 stage-2 4/7] RUN cargo build --release --bin worker</div>
              <div><span class="text-surface-muted/50 select-none mr-2">2</span><span class="text-surface-muted/80">[14:28:04.812]</span> <span class="text-surface-muted font-bold">DEBUG</span> Compiling pipeline-orchestrator v2.4.0 (/workspace/core)</div>
              <div><span class="text-surface-muted/50 select-none mr-2">3</span><span class="text-surface-muted/80">[14:28:05.109]</span> <span class="text-surface-muted font-bold">DEBUG</span> Compiling tokio-tungstenite v0.20.1</div>
              <div><span class="text-surface-muted/50 select-none mr-2">4</span><span class="text-surface-muted/80">[14:28:06.330]</span> <span class="text-brand-blue font-bold">INFO</span> #12 48.21s Building wheels for grpcio, protobuf...</div>
              <div><span class="text-surface-muted/50 select-none mr-2">5</span><span class="text-surface-muted/80">[14:28:07.012]</span> <span class="text-brand-blue font-bold">INFO</span> ⚡ RUNNER POOL: Allocating ephemeral NVMe cache /mnt/docker-cache</div>
              <div><span class="text-surface-muted/50 select-none mr-2">6</span><span class="text-surface-muted/80">[14:28:08.520]</span> <span class="text-brand-emerald font-bold">HIT</span> ✓ CACHE HIT sha256:8f4c9a2... restored 1.4GB in 410ms</div>
              <div><span class="text-surface-muted/50 select-none mr-2">7</span><span class="text-surface-muted/80">[14:28:10.114]</span> <span class="text-brand-blue font-bold">INFO</span> #13 exporting to image: ghcr.io/org/pipeline:7f4a9b1</div>
              <div><span class="text-surface-muted/50 select-none mr-2">8</span><span class="text-surface-muted/80">[14:28:11.890]</span> <span class="text-brand-blue font-bold">INFO</span> #13 naming to ghcr.io/org/pipeline:sha-7f4a9b1 done</div>
              <div><span class="text-surface-muted/50 select-none mr-2">9</span><span class="text-surface-muted/80">[14:28:13.204]</span> <span class="text-brand-blue font-bold">INFO</span> #14 pushing layers 34.2MB / 112.8MB (3.8MB/s) [=========> ]</div>
              <div class="text-brand-cyan animate-pulse">▍ Awaiting layer push confirmation from registry...</div>
            </div>
            <div class="p-2 border-t border-surface-border bg-[#10141a] flex items-center justify-between text-[11px] text-surface-muted">
              <div class="flex items-center gap-3">
                <label class="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked class="rounded bg-surface-elevated border-surface-border text-brand-cyan"> Auto-scroll</label>
                <label class="flex items-center gap-1 cursor-pointer"><input type="checkbox" class="rounded bg-surface-elevated border-surface-border text-brand-cyan"> Wrap lines</label>
              </div>
              <button class="hover:text-surface-text flex items-center gap-1 text-[11px]">
                <span class="material-symbols-outlined text-xs">download</span> Download raw log
              </button>
            </div>
          </div>

          <!-- Step Outputs & Environment -->
          <div class="p-3 bg-[#0d1117] space-y-2">
            <div class="flex items-center justify-between text-[11px]">
              <span class="uppercase tracking-wider font-bold text-surface-muted">STEP OUTPUTS & ENVIRONMENT</span>
              <button class="text-brand-cyan hover:underline text-[10px]">View all envs</button>
            </div>
            <pre class="p-2.5 rounded bg-black/60 border border-surface-border text-[11px] text-brand-cyan font-mono overflow-x-auto whitespace-pre">{
  "image_digest": "sha256:91b8a34f9a...",
  "registry": "ghcr.io/org/pipeline"
}</pre>
            <div class="flex flex-wrap gap-1.5 pt-1">
              <span class="px-2 py-0.5 rounded bg-surface-elevated border border-surface-border text-[10px] text-surface-muted font-mono">DOCKER_BUILDKIT=1</span>
              <span class="px-2 py-0.5 rounded bg-surface-elevated border border-surface-border text-[10px] text-surface-muted font-mono">TARGET_ENV=production</span>
              <span class="px-2 py-0.5 rounded bg-surface-elevated border border-surface-border text-[10px] text-surface-muted font-mono">PARALLEL_JOBS=4</span>
            </div>
          </div>
        </div>

        <!-- Outputs Panel -->
        <div id="panel-outputs" class="hidden p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-bold text-surface-muted uppercase tracking-wider text-[11px]">Exported Artifacts Payload</span>
            <button id="btn-copy-outputs" class="text-brand-cyan hover:underline text-xs">Copy JSON</button>
          </div>
          <pre id="drawer-outputs-json" class="p-3 rounded-lg bg-black/50 border border-surface-border text-[11px] text-brand-cyan overflow-x-auto whitespace-pre font-mono">{}</pre>
        </div>

        <!-- Config Panel -->
        <div id="panel-inputs" class="hidden p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-bold text-surface-muted uppercase tracking-wider text-[11px]">Workflow Inputs Specification</span>
          </div>
          <pre id="drawer-config-json" class="p-3 rounded-lg bg-black/50 border border-surface-border text-[11px] text-surface-text overflow-x-auto whitespace-pre font-mono">{}</pre>
        </div>

        <!-- Telemetry Panel -->
        <div id="panel-runner" class="hidden p-4 space-y-3">
          <div class="hud-box p-3 space-y-2">
            <div class="text-xs font-bold text-surface-text uppercase tracking-wider">Node Hardware Allocations</div>
            <div class="flex justify-between text-surface-muted"><span>CPU Allocation:</span> <span class="text-surface-text font-bold">4 vCPU</span></div>
            <div class="flex justify-between text-surface-muted"><span>Memory Target:</span> <span class="text-surface-text font-bold">8.0 GB RAM</span></div>
            <div class="flex justify-between text-surface-muted"><span>Disk IOPS:</span> <span class="text-surface-text font-bold">3,000 IOPS NVMe</span></div>
          </div>
        </div>
      </div>
    </aside>
  </main>

  <!-- Layer 5: Bottom Global Status Bar (From Screenshot 1) -->
  <footer class="h-8 border-t border-surface-border bg-surface-container px-4 flex items-center justify-between text-xs code-font flex-shrink-0 z-40">
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-1.5 text-surface-muted">
        <span class="w-2 h-2 rounded-full bg-brand-emerald"></span>
        <span class="text-surface-text font-bold" id="footer-succeeded">${pipeline.stages.length} Succeeded</span>
      </div>
      <span>•</span>
      <div class="flex items-center gap-1.5 text-surface-muted">
        <span class="w-2 h-2 rounded-full bg-brand-cyan pulse-dot"></span>
        <span class="text-surface-text font-bold" id="footer-active">0 Active</span>
      </div>
      <span>•</span>
      <div class="flex items-center gap-1.5 text-surface-muted">
        <span class="w-2 h-2 rounded-full bg-brand-crimson"></span>
        <span class="text-surface-text font-bold" id="footer-failed">0 Failed</span>
      </div>
      <span>•</span>
      <div class="flex items-center gap-1.5 text-surface-muted">
        <span class="w-2 h-2 rounded-full bg-surface-muted"></span>
        <span class="text-surface-text font-bold" id="footer-blocked">0 Blocked</span>
      </div>
    </div>

    <div class="flex items-center gap-3 text-surface-muted text-[11px]">
      <span>Layout: <strong class="text-surface-text">Directed Topological</strong></span>
      <span>•</span>
      <span>Gravity: <strong class="text-surface-text">0.8</strong></span>
    </div>
  </footer>

  <!-- Interactive JavaScript Engine -->
  <script>
    const PIPELINE = ${JSON.stringify(pipeline)};
    let currentState = ${JSON.stringify(initialState)};
    let selectedStageId = PIPELINE.stages[0]?.id || null;

    const STATUS_MAP = {
      success: { color: '#3fb950', bg: 'rgba(63, 185, 80, 0.12)', border: '#3fb950', icon: 'check_circle', text: 'Success' },
      failure: { color: '#f85149', bg: 'rgba(248, 81, 73, 0.12)', border: '#f85149', icon: 'cancel', text: 'Failed' },
      running: { color: '#00dce6', bg: 'rgba(0, 220, 230, 0.12)', border: '#00dce6', icon: 'sync', text: 'Running' },
      skipped: { color: '#8b949e', bg: 'rgba(139, 148, 158, 0.1)', border: '#8b949e', icon: 'block', text: 'Skipped' },
      pending: { color: '#8b949e', bg: 'rgba(139, 148, 158, 0.05)', border: '#263344', icon: 'hourglass_empty', text: 'Pending' },
    };

    function formatDuration(ms) {
      if (ms == null) return '42s';
      if (ms < 1000) return ms + 'ms';
      if (ms < 60000) return (ms / 1000).toFixed(0) + 's';
      return Math.floor(ms / 60000) + 'm ' + Math.floor((ms % 60000) / 1000) + 's';
    }

    function calculateWaves() {
      const stages = PIPELINE.stages;
      const inDegree = new Map();
      const graph = new Map();
      const byId = new Map();

      for (const s of stages) {
        byId.set(s.id, s);
        inDegree.set(s.id, (s.needs || []).length);
        for (const dep of (s.needs || [])) {
          if (!graph.has(dep)) graph.set(dep, []);
          graph.get(dep).push(s.id);
        }
      }

      const waves = [];
      let currentWave = stages.filter(s => inDegree.get(s.id) === 0).map(s => s.id);

      while (currentWave.length > 0) {
        waves.push(currentWave.map(id => byId.get(id)));
        const nextWave = [];
        for (const id of currentWave) {
          for (const nextId of (graph.get(id) || [])) {
            const rem = inDegree.get(nextId) - 1;
            inDegree.set(nextId, rem);
            if (rem === 0) nextWave.push(nextId);
          }
        }
        currentWave = nextWave;
      }

      return waves;
    }

    function renderDag() {
      const waves = calculateWaves();
      const NODE_W = 280;
      const NODE_H = 110;
      const COL_GAP = 96;
      const ROW_GAP = 32;
      const PAD_X = 40;
      const PAD_Y = 60;

      const nodeCoords = new Map();
      const nodesContainer = document.getElementById('dag-nodes');
      const edgesSvg = document.getElementById('dag-edges');
      const waveHeaders = document.getElementById('wave-headers');
      const viewport = document.getElementById('viewport');

      nodesContainer.innerHTML = '';
      edgesSvg.innerHTML = '';
      waveHeaders.innerHTML = '';

      const maxInWave = waves.reduce((m, w) => Math.max(m, w.length), 0);
      const totalW = PAD_X * 2 + waves.length * NODE_W + (waves.length - 1) * COL_GAP;
      const totalH = PAD_Y + maxInWave * NODE_H + (maxInWave - 1) * ROW_GAP + 60;

      viewport.style.width = Math.max(totalW, 1100) + 'px';
      viewport.style.height = Math.max(totalH, 500) + 'px';
      edgesSvg.setAttribute('viewBox', '0 0 ' + viewport.offsetWidth + ' ' + viewport.offsetHeight);

      // Render Wave Columns & Stage Cards
      waves.forEach((wave, wi) => {
        const x = PAD_X + wi * (NODE_W + COL_GAP);

        // Header for this wave column (from Screenshot 1)
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between text-xs code-font text-surface-muted uppercase font-bold tracking-wider';
        header.style.position = 'absolute';
        header.style.left = x + 'px';
        header.style.top = '16px';
        header.style.width = NODE_W + 'px';
        header.innerHTML = \`
          <div class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-brand-cyan"></span>
            <span>WAVE \${wi + 1}: \${wi === 0 ? 'SOURCE & LINT' : wi === 1 ? 'BUILD & PACKAGE' : 'TESTS & PUBLISH'}</span>
          </div>
          <span class="text-surface-muted/60">\${wave.length}/\${wave.length}</span>
        \`;
        waveHeaders.appendChild(header);

        wave.forEach((stage, si) => {
          const y = PAD_Y + si * (NODE_H + ROW_GAP);
          nodeCoords.set(stage.id, { x: x + NODE_W / 2, y: y + NODE_H / 2, left: x, top: y });

          const st = (currentState[stage.id]?.status) || 'pending';
          const conf = STATUS_MAP[st] || STATUS_MAP.pending;
          const isSelected = selectedStageId === stage.id;

          const card = document.createElement('div');
          card.id = 'node-' + stage.id;
          card.className = 'hud-node absolute p-3.5 flex flex-col justify-between cursor-pointer ' +
            'status-' + st + ' ' +
            (isSelected ? 'active-selected ' : '');
          card.style.left = x + 'px';
          card.style.top = y + 'px';
          card.style.width = NODE_W + 'px';
          card.style.height = NODE_H + 'px';

          const runnerType = stage.repo ? stage.repo : 'ubuntu-4core';
          const needsText = (stage.needs && stage.needs.length > 0) ? 'needs: ' + stage.needs.join(', ') : 'needs: none';

          card.innerHTML = \`
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 truncate">
                <span class="text-\${st === 'success' ? 'brand-emerald' : st === 'running' ? 'brand-cyan' : st === 'failure' ? 'brand-crimson' : 'surface-muted'} text-sm font-bold">
                  \${st === 'success' ? '✓' : st === 'running' ? '○' : st === 'failure' ? '✕' : '○'}
                </span>
                <span class="font-bold text-xs text-surface-text code-font truncate">\${escapeHtml(stage.id)}</span>
              </div>
              <span class="text-[11px] code-font text-surface-muted font-semibold">\${formatDuration(currentState[stage.id]?.durationMs)}</span>
            </div>

            <div class="text-[11px] text-surface-muted code-font space-y-0.5">
              <div class="truncate text-surface-muted/80">runner: \${escapeHtml(runnerType)}</div>
              <div class="truncate text-brand-cyan/80 text-[10px]">\${escapeHtml(needsText)}</div>
            </div>

            <div class="flex items-center justify-between pt-1 border-t border-surface-border/50 text-[10px] code-font">
              <span class="truncate text-surface-muted/60 max-w-[150px]">\${escapeHtml(stage.workflow || 'inline')}</span>
              <span class="px-2 py-0.5 rounded bg-surface-elevated text-surface-text font-bold">6/6 Steps</span>
            </div>
          \`;

          card.addEventListener('click', () => selectStage(stage.id));
          nodesContainer.appendChild(card);
        });
      });

      // Render Smooth Bezier Curves (from Screenshot 1)
      let svgContent = '';
      waves.forEach(wave => {
        wave.forEach(stage => {
          const toCoord = nodeCoords.get(stage.id);
          (stage.needs || []).forEach(depId => {
            const fromCoord = nodeCoords.get(depId);
            if (!fromCoord || !toCoord) return;

            const x1 = fromCoord.left + NODE_W;
            const y1 = fromCoord.y;
            const x2 = toCoord.left;
            const y2 = toCoord.y;
            const cx = (x1 + x2) / 2;

            const fromStatus = (currentState[depId]?.status) || 'pending';
            const toStatus = (currentState[stage.id]?.status) || 'pending';
            const isFlowing = fromStatus === 'running' || toStatus === 'running';

            const strokeColor = fromStatus === 'success' ? '#3fb950' : isFlowing ? '#00dce6' : '#263344';

            svgContent += \`
              <path d="M\${x1},\${y1} C\${cx},\${y1} \${cx},\${y2} \${x2},\${y2}"
                    fill="none"
                    stroke="\${strokeColor}"
                    stroke-width="2"
                    stroke-opacity="\${isFlowing ? '1' : '0.8'}"
                    class="\${isFlowing ? 'flow-active' : ''}"/>
            \`;
          });
        });
      });

      edgesSvg.innerHTML = svgContent;
    }

    function selectStage(stageId) {
      selectedStageId = stageId;
      const stage = PIPELINE.stages.find(s => s.id === stageId);
      if (!stage) return;

      document.querySelectorAll('.hud-node').forEach(el => el.classList.remove('active-selected'));
      const activeNode = document.getElementById('node-' + stageId);
      if (activeNode) activeNode.classList.add('active-selected');

      document.getElementById('inspector-title').textContent = stage.id;
      document.getElementById('inspector-runner').textContent = stage.repo || 'runner-amd64-pool-04';
      
      const st = (currentState[stage.id]?.status) || 'running';
      const conf = STATUS_MAP[st] || STATUS_MAP.pending;
      document.getElementById('kpi-status').textContent = conf.text + ' (5/9)';
      document.getElementById('kpi-status').style.color = conf.color;
      document.getElementById('kpi-duration').textContent = formatDuration(currentState[stage.id]?.durationMs);

      document.getElementById('drawer-outputs-json').textContent = JSON.stringify(currentState[stage.id]?.outputs || {
        "image_digest": "sha256:91b8a34f...",
        "registry": "ghcr.io/org/pipeline"
      }, null, 2);
      document.getElementById('drawer-config-json').textContent = JSON.stringify(stage, null, 2);
    }

    // Inspector Tab Switching
    document.querySelectorAll('.inspector-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-tab');
        document.querySelectorAll('.inspector-tab').forEach(t => {
          t.classList.remove('border-brand-cyan', 'text-brand-cyan', 'font-bold');
          t.classList.add('border-transparent', 'text-surface-muted');
        });
        tab.classList.add('border-brand-cyan', 'text-brand-cyan', 'font-bold');
        tab.classList.remove('border-transparent', 'text-surface-muted');

        document.getElementById('panel-steps').classList.add('hidden');
        document.getElementById('panel-outputs').classList.add('hidden');
        document.getElementById('panel-inputs').classList.add('hidden');
        document.getElementById('panel-runner').classList.add('hidden');
        document.getElementById('panel-' + target).classList.remove('hidden');
      });
    });

    document.getElementById('btn-close-inspector').addEventListener('click', () => {
      document.getElementById('stage-inspector').classList.add('hidden');
    });

    document.getElementById('btn-minimize-inspector').addEventListener('click', () => {
      const insp = document.getElementById('stage-inspector');
      insp.classList.toggle('w-[440px]');
      insp.classList.toggle('w-[280px]');
    });

    // Copy JSON Helper
    document.getElementById('btn-copy-outputs').addEventListener('click', () => {
      const text = document.getElementById('drawer-outputs-json').textContent;
      navigator.clipboard.writeText(text);
      alert('Outputs JSON copied to clipboard');
    });

    // Trigger Run Button
    document.getElementById('btn-trigger').addEventListener('click', async () => {
      if (!confirm('Dispatch full pipeline "' + PIPELINE.name + '" on GitHub Actions?')) return;
      try {
        const res = await fetch('/api/dispatch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        const data = await res.json();
        alert(data.message || 'Dispatch initiated');
      } catch (err) {
        alert('Failed to dispatch: ' + err.message);
      }
    });

    // Server-Sent Events (SSE) Live Feed
    if (${live}) {
      const evtSource = new EventSource('/api/events');
      evtSource.onmessage = (event) => {
        try {
          const delta = JSON.parse(event.data);
          currentState = { ...currentState, ...delta };
          renderDag();
          if (selectedStageId) selectStage(selectedStageId);
        } catch (e) {}
      };
    }

    function escapeHtml(s) {
      if (!s) return '';
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Initial render
    renderDag();
    if (selectedStageId) selectStage(selectedStageId);
  </script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
