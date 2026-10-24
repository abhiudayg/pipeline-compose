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
              base: '#090d13',
              container: '#111620',
              elevated: '#181f2c',
              border: '#273142',
              muted: '#7d8b9f',
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
      background-color: #090d13;
      color: #f0f6fc;
      font-family: 'Geist', -apple-system, sans-serif;
      background-image: 
        radial-gradient(rgba(0, 220, 230, 0.04) 1px, transparent 1px),
        radial-gradient(rgba(39, 49, 66, 0.25) 1px, transparent 1px);
      background-size: 32px 32px, 8px 8px;
      background-position: 0 0, 16px 16px;
    }
    .code-font { font-family: 'JetBrains Mono', monospace; }
    .hud-card {
      background: linear-gradient(180deg, rgba(24, 31, 44, 0.85) 0%, rgba(17, 22, 32, 0.95) 100%);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(39, 49, 66, 0.8);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }
    .hud-card-active {
      border-color: rgba(0, 220, 230, 0.6) !important;
      box-shadow: 0 0 24px -2px rgba(0, 220, 230, 0.25) !important;
    }
    .dag-node {
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .dag-node:hover {
      transform: translateY(-2px);
      border-color: rgba(0, 220, 230, 0.7);
      box-shadow: 0 8px 24px -4px rgba(0, 220, 230, 0.2);
    }
    .dag-node.active-selected {
      border-color: #00dce6 !important;
      box-shadow: 0 0 0 2px rgba(0, 220, 230, 0.5), 0 8px 24px -2px rgba(0, 220, 230, 0.3) !important;
    }
    @keyframes pulse-cyan {
      0%, 100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 4px #00dce6); }
      50% { opacity: 0.35; transform: scale(1.2); filter: drop-shadow(0 0 8px #00dce6); }
    }
    .pulse-dot { animation: pulse-cyan 1.8s infinite ease-in-out; }
    @keyframes dash-flow {
      to { stroke-dashoffset: -32; }
    }
    .flow-active {
      stroke-dasharray: 8 8;
      animation: dash-flow 1.2s linear infinite;
    }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #090d13; }
    ::-webkit-scrollbar-thumb { background: #273142; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #7d8b9f; }
  </style>
</head>
<body class="min-h-screen flex flex-col bg-[#090d13] overflow-x-hidden selection:bg-brand-cyan/20 selection:text-brand-cyan">
  <!-- Top Mission Control Navigation HUD -->
  <header class="h-16 border-b border-surface-border bg-surface-container/90 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-brand-cyan text-2xl">rocket_launch</span>
        <span class="font-bold tracking-wider text-sm text-surface-text uppercase code-font">Pipeline<span class="text-brand-cyan">::</span>Control</span>
      </div>
      <div class="h-4 w-px bg-surface-border"></div>
      <div class="flex items-center gap-2">
        <span class="px-2.5 py-1 text-xs font-semibold rounded-md bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30 code-font">
          ${escapeHtml(pipeline.name)}
        </span>
        <span class="text-xs text-surface-muted code-font">(${pipeline.stages.length} stages)</span>
      </div>
    </div>

    <!-- Center HUD Telemetry Indicators -->
    <div class="hidden md:flex items-center gap-4">
      <div id="connection-status" class="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-brand-emerald border border-brand-emerald/30">
        <span class="w-2 h-2 rounded-full bg-brand-emerald pulse-dot"></span>
        <span id="connection-text">${live ? 'SSE Telemetry Active (5s)' : 'Offline Snapshot'}</span>
      </div>
      <div class="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-surface-elevated border border-surface-border code-font">
        <span class="text-surface-muted">DAG WAVES:</span>
        <span id="kpi-waves" class="text-brand-cyan font-bold">—</span>
      </div>
      <div class="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-surface-elevated border border-surface-border code-font">
        <span class="text-surface-muted">ACTIVE CONCURRENCY:</span>
        <span id="kpi-running" class="text-brand-cyan font-bold">0</span>
      </div>
    </div>

    <!-- Right Action Center -->
    <div class="flex items-center gap-3">
      <button id="btn-toggle-terminal" class="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-border text-surface-text text-xs code-font transition border border-surface-border flex items-center gap-1.5" title="Toggle Live Log Terminal">
        <span class="material-symbols-outlined text-sm text-brand-cyan">terminal</span>
        <span class="hidden sm:inline">Event Log</span>
      </button>
      <button id="btn-refresh" class="p-2 rounded-lg bg-surface-elevated hover:bg-surface-border text-surface-muted hover:text-surface-text transition flex items-center" title="Refresh Telemetry">
        <span class="material-symbols-outlined text-lg">refresh</span>
      </button>
      <button id="btn-trigger" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-cyan text-[#090d13] font-bold text-xs hover:bg-[#00c5ce] transition shadow-lg shadow-brand-cyan/25 uppercase tracking-wide code-font">
        <span class="material-symbols-outlined text-base">play_arrow</span>
        <span>Dispatch DAG</span>
      </button>
    </div>
  </header>

  <!-- Telemetry KPI Strip -->
  <section class="border-b border-surface-border bg-surface-container/40 px-6 py-3.5">
    <div class="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="hud-card p-3 rounded-lg flex items-center justify-between">
        <div>
          <div class="text-[10px] uppercase font-bold text-surface-muted code-font tracking-wider">Stages Completed</div>
          <div id="stat-completed" class="text-lg font-bold code-font text-brand-emerald">0 / ${pipeline.stages.length}</div>
        </div>
        <span class="material-symbols-outlined text-brand-emerald/40 text-2xl">check_circle</span>
      </div>
      <div class="hud-card p-3 rounded-lg flex items-center justify-between">
        <div>
          <div class="text-[10px] uppercase font-bold text-surface-muted code-font tracking-wider">Running In-Flight</div>
          <div id="stat-running" class="text-lg font-bold code-font text-brand-cyan">0</div>
        </div>
        <span class="material-symbols-outlined text-brand-cyan/40 text-2xl pulse-dot">sync</span>
      </div>
      <div class="hud-card p-3 rounded-lg flex items-center justify-between">
        <div>
          <div class="text-[10px] uppercase font-bold text-surface-muted code-font tracking-wider">Total Duration</div>
          <div id="stat-duration" class="text-lg font-bold code-font text-surface-text">—</div>
        </div>
        <span class="material-symbols-outlined text-surface-muted/40 text-2xl">timer</span>
      </div>
      <div class="hud-card p-3 rounded-lg flex items-center justify-between">
        <div>
          <div class="text-[10px] uppercase font-bold text-surface-muted code-font tracking-wider">Global Lock Repo</div>
          <div id="stat-lock" class="text-xs font-bold code-font text-surface-text truncate max-w-[120px]">${escapeHtml(pipeline.concurrency?.lock_repo || 'Same Repo')}</div>
        </div>
        <span class="material-symbols-outlined text-brand-amber/40 text-2xl">lock</span>
      </div>
    </div>
  </section>

  <!-- Main Viewport Layout -->
  <main class="flex-1 flex overflow-hidden relative">
    <!-- DAG Canvas Container -->
    <div id="dag-container" class="flex-1 overflow-auto p-8 relative flex flex-col items-start min-h-[calc(100vh-8rem)]">
      <div class="mb-4 flex items-center justify-between w-full max-w-7xl">
        <div class="flex items-center gap-2">
          <h2 class="text-xs font-bold text-surface-muted uppercase tracking-wider code-font">Wave Execution DAG</h2>
          <span class="text-xs text-surface-muted">— Kahn Topological Sort & Concurrency Boundaries</span>
        </div>
        <div class="flex items-center gap-3 text-xs">
          <div class="flex items-center gap-1.5 text-surface-muted"><span class="w-2 h-2 rounded-full bg-brand-emerald"></span>Success</div>
          <div class="flex items-center gap-1.5 text-surface-muted"><span class="w-2 h-2 rounded-full bg-brand-cyan pulse-dot"></span>Running</div>
          <div class="flex items-center gap-1.5 text-surface-muted"><span class="w-2 h-2 rounded-full bg-brand-crimson"></span>Failed</div>
          <div class="flex items-center gap-1.5 text-surface-muted"><span class="w-2 h-2 rounded-full bg-surface-muted"></span>Pending</div>
        </div>
      </div>

      <!-- Interactive Canvas -->
      <div id="viewport" class="relative my-4" style="min-width: 1000px; min-height: 480px;">
        <svg id="dag-edges" class="absolute inset-0 pointer-events-none z-0 overflow-visible"></svg>
        <div id="dag-nodes" class="relative z-10"></div>
      </div>
    </div>

    <!-- Slide-Over Stage Telemetry Drawer -->
    <aside id="stage-drawer" class="w-96 border-l border-surface-border bg-surface-container flex flex-col z-30 transition-transform duration-300 translate-x-full fixed right-0 top-16 bottom-0 shadow-2xl">
      <!-- Drawer Header -->
      <div class="p-4 border-b border-surface-border flex items-center justify-between bg-surface-elevated/40">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-brand-cyan">tune</span>
          <span id="drawer-stage-id" class="font-bold text-sm code-font truncate max-w-[200px]">stage-id</span>
        </div>
        <button id="btn-close-drawer" class="p-1 rounded text-surface-muted hover:text-surface-text hover:bg-surface-elevated">
          <span class="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      <!-- Drawer Tabs -->
      <div class="flex border-b border-surface-border bg-surface-base px-2">
        <button data-tab="telemetry" class="drawer-tab px-3 py-2 text-xs font-medium border-b-2 border-brand-cyan text-brand-cyan">Telemetry</button>
        <button data-tab="outputs" class="drawer-tab px-3 py-2 text-xs font-medium border-b-2 border-transparent text-surface-muted hover:text-surface-text">Outputs JSON</button>
        <button data-tab="workflow" class="drawer-tab px-3 py-2 text-xs font-medium border-b-2 border-transparent text-surface-muted hover:text-surface-text">Config</button>
      </div>

      <!-- Drawer Content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4 code-font text-xs">
        <!-- Telemetry Panel -->
        <div id="tab-telemetry" class="space-y-4">
          <div class="p-3 rounded-lg bg-surface-elevated border border-surface-border space-y-2">
            <div class="flex items-center justify-between text-surface-muted">
              <span>Status</span>
              <span id="drawer-status-pill" class="px-2 py-0.5 rounded font-semibold uppercase text-[10px] bg-emerald-500/10 text-brand-emerald">Pending</span>
            </div>
            <div class="flex items-center justify-between text-surface-muted">
              <span>Execution Time</span>
              <span id="drawer-duration" class="text-surface-text">—</span>
            </div>
            <div class="flex items-center justify-between text-surface-muted">
              <span>Repository</span>
              <span id="drawer-repo" class="text-surface-text truncate max-w-[180px]">—</span>
            </div>
            <div class="flex items-center justify-between text-surface-muted">
              <span>Workflow File</span>
              <span id="drawer-workflow" class="text-brand-cyan truncate max-w-[180px]">—</span>
            </div>
          </div>

          <div class="space-y-1.5">
            <span class="text-surface-muted text-[11px] uppercase tracking-wider font-semibold">Dependencies</span>
            <div id="drawer-needs" class="flex flex-wrap gap-1.5">
              <span class="text-surface-muted italic">None (Root Stage)</span>
            </div>
          </div>

          <div class="pt-2">
            <button id="btn-dispatch-stage" class="w-full py-2.5 px-3 rounded-lg bg-brand-cyan/15 hover:bg-brand-cyan/25 border border-brand-cyan/40 text-brand-cyan font-bold transition flex items-center justify-center gap-2 code-font uppercase text-xs">
              <span class="material-symbols-outlined text-sm">play_arrow</span>
              <span>Dispatch Stage</span>
            </button>
          </div>
        </div>

        <!-- Outputs Panel -->
        <div id="tab-outputs" class="hidden space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-surface-muted text-[11px] uppercase tracking-wider font-semibold">Exported Artifacts</span>
            <button id="btn-copy-outputs" class="text-brand-cyan hover:underline text-[10px]">Copy JSON</button>
          </div>
          <pre id="drawer-outputs-json" class="p-3 rounded-lg bg-surface-base border border-surface-border text-[11px] text-surface-text overflow-x-auto whitespace-pre font-mono">{}</pre>
        </div>

        <!-- Workflow Config Panel -->
        <div id="tab-workflow" class="hidden space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-surface-muted text-[11px] uppercase tracking-wider font-semibold">Stage Configuration</span>
          </div>
          <pre id="drawer-config-json" class="p-3 rounded-lg bg-surface-base border border-surface-border text-[11px] text-surface-text overflow-x-auto whitespace-pre font-mono">{}</pre>
        </div>
      </div>
    </aside>
  </main>

  <!-- Bottom Cybernetic Log HUD Console -->
  <footer id="terminal-console" class="border-t border-surface-border bg-surface-container/95 transition-all duration-300 h-44 flex flex-col z-20">
    <div class="px-4 py-2 border-b border-surface-border bg-surface-elevated/80 flex items-center justify-between">
      <div class="flex items-center gap-2 text-xs code-font">
        <span class="material-symbols-outlined text-sm text-brand-cyan">terminal</span>
        <span class="font-bold text-surface-text">LIVE TELEMETRY STREAM</span>
        <span class="text-surface-muted">— Real-time event log</span>
      </div>
      <div class="flex items-center gap-2">
        <button id="btn-clear-logs" class="text-[11px] text-surface-muted hover:text-surface-text code-font">Clear</button>
        <button id="btn-minimize-terminal" class="p-1 rounded text-surface-muted hover:text-surface-text">
          <span class="material-symbols-outlined text-sm">expand_more</span>
        </button>
      </div>
    </div>
    <div id="terminal-logs" class="flex-1 overflow-y-auto p-3 code-font text-[11px] text-surface-muted space-y-1 bg-black/40 font-mono">
      <div class="text-brand-cyan">[SYSTEM] Mission Control initialized for pipeline: ${escapeHtml(pipeline.name)}</div>
      <div class="text-surface-muted">[SYSTEM] Connected to local server port ${port}</div>
    </div>
  </footer>

  <!-- Interactive JavaScript Engine -->
  <script>
    const PIPELINE = ${JSON.stringify(pipeline)};
    let currentState = ${JSON.stringify(initialState)};
    let selectedStageId = null;

    const STATUS_MAP = {
      success: { color: '#3fb950', bg: 'rgba(63, 185, 80, 0.12)', border: '#3fb950', icon: 'check_circle', text: 'Success' },
      failure: { color: '#f85149', bg: 'rgba(248, 81, 73, 0.12)', border: '#f85149', icon: 'cancel', text: 'Failed' },
      running: { color: '#00dce6', bg: 'rgba(0, 220, 230, 0.12)', border: '#00dce6', icon: 'sync', text: 'Running' },
      skipped: { color: '#8b949e', bg: 'rgba(139, 148, 158, 0.1)', border: '#8b949e', icon: 'block', text: 'Skipped' },
      pending: { color: '#8b949e', bg: 'rgba(139, 148, 158, 0.05)', border: '#273142', icon: 'hourglass_empty', text: 'Pending' },
    };

    function appendLog(text, colorClass = 'text-surface-muted') {
      const container = document.getElementById('terminal-logs');
      const time = new Date().toISOString().substring(11, 19);
      const line = document.createElement('div');
      line.className = colorClass;
      line.textContent = '[' + time + '] ' + text;
      container.appendChild(line);
      container.scrollTop = container.scrollHeight;
    }

    function formatDuration(ms) {
      if (ms == null) return '—';
      if (ms < 1000) return ms + 'ms';
      if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
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

    function updateKpis(waves) {
      document.getElementById('kpi-waves').textContent = waves.length;

      let completedCount = 0;
      let runningCount = 0;
      let totalDurationMs = 0;

      for (const stage of PIPELINE.stages) {
        const s = currentState[stage.id];
        if (s?.status === 'success') completedCount++;
        if (s?.status === 'running') runningCount++;
        if (s?.durationMs) totalDurationMs += s.durationMs;
      }

      document.getElementById('stat-completed').textContent = completedCount + ' / ' + PIPELINE.stages.length;
      document.getElementById('stat-running').textContent = runningCount;
      document.getElementById('kpi-running').textContent = runningCount;
      document.getElementById('stat-duration').textContent = formatDuration(totalDurationMs);
    }

    function renderDag() {
      const waves = calculateWaves();
      updateKpis(waves);

      const NODE_W = 270;
      const NODE_H = 88;
      const COL_GAP = 72;
      const ROW_GAP = 28;
      const PAD_X = 36;
      const PAD_Y = 36;

      const nodeCoords = new Map();
      const nodesContainer = document.getElementById('dag-nodes');
      const edgesSvg = document.getElementById('dag-edges');
      const viewport = document.getElementById('viewport');

      nodesContainer.innerHTML = '';
      edgesSvg.innerHTML = '';

      const maxInWave = waves.reduce((m, w) => Math.max(m, w.length), 0);
      const totalW = PAD_X * 2 + waves.length * NODE_W + (waves.length - 1) * COL_GAP;
      const totalH = PAD_Y * 2 + maxInWave * NODE_H + (maxInWave - 1) * ROW_GAP;

      viewport.style.width = Math.max(totalW, 960) + 'px';
      viewport.style.height = Math.max(totalH, 460) + 'px';
      edgesSvg.setAttribute('viewBox', '0 0 ' + viewport.offsetWidth + ' ' + viewport.offsetHeight);

      // Render Wave Columns and Stage Cards
      waves.forEach((wave, wi) => {
        const x = PAD_X + wi * (NODE_W + COL_GAP);
        wave.forEach((stage, si) => {
          const y = PAD_Y + si * (NODE_H + ROW_GAP);
          nodeCoords.set(stage.id, { x: x + NODE_W / 2, y: y + NODE_H / 2, left: x, top: y });

          const st = (currentState[stage.id]?.status) || 'pending';
          const conf = STATUS_MAP[st] || STATUS_MAP.pending;
          const isSelected = selectedStageId === stage.id;

          const card = document.createElement('div');
          card.id = 'node-' + stage.id;
          card.className = 'dag-node absolute rounded-xl p-3.5 flex flex-col justify-between cursor-pointer hud-card ' +
            (isSelected ? 'active-selected ' : '') +
            (st === 'running' ? 'hud-card-active ' : '');
          card.style.left = x + 'px';
          card.style.top = y + 'px';
          card.style.width = NODE_W + 'px';
          card.style.height = NODE_H + 'px';
          card.style.borderColor = isSelected ? '#00dce6' : conf.border;

          card.innerHTML = \`
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5 truncate">
                <span class="text-[9px] px-1.5 py-0.5 rounded bg-surface-elevated text-surface-muted code-font font-bold">W-\${wi + 1}</span>
                <span class="font-bold text-xs text-surface-text code-font truncate">\${escapeHtml(stage.id)}</span>
              </div>
              <span class="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase code-font"
                    style="color: \${conf.color}; background-color: \${conf.bg}; border: 1px solid \${conf.color}33;">
                \${st === 'running' ? '<span class="w-1.5 h-1.5 rounded-full bg-brand-cyan pulse-dot"></span>' : ''}
                \${conf.text}
              </span>
            </div>
            <div class="flex items-center justify-between text-[11px] text-surface-muted code-font pt-1">
              <span class="truncate max-w-[150px] text-[10px] text-surface-muted/90">\${escapeHtml(stage.workflow || stage.run || 'inline')}</span>
              <span class="font-semibold text-surface-text">\${formatDuration(currentState[stage.id]?.durationMs)}</span>
            </div>
          \`;

          card.addEventListener('click', () => selectStage(stage.id));
          nodesContainer.appendChild(card);
        });
      });

      // Render Bezier Curves between Stages
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

            const strokeColor = fromStatus === 'success' ? '#3fb950' : isFlowing ? '#00dce6' : '#273142';

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

      document.querySelectorAll('.dag-node').forEach(el => el.classList.remove('active-selected'));
      const activeNode = document.getElementById('node-' + stageId);
      if (activeNode) activeNode.classList.add('active-selected');

      const drawer = document.getElementById('stage-drawer');
      drawer.classList.remove('translate-x-full');

      document.getElementById('drawer-stage-id').textContent = stage.id;
      const st = (currentState[stage.id]?.status) || 'pending';
      const conf = STATUS_MAP[st] || STATUS_MAP.pending;
      const pill = document.getElementById('drawer-status-pill');
      pill.textContent = conf.text;
      pill.style.color = conf.color;
      pill.style.backgroundColor = conf.bg;

      document.getElementById('drawer-duration').textContent = formatDuration(currentState[stage.id]?.durationMs);
      document.getElementById('drawer-repo').textContent = stage.repo || 'Local Repository';
      document.getElementById('drawer-workflow').textContent = stage.workflow || stage.run || 'Inline run';

      const needsContainer = document.getElementById('drawer-needs');
      if (!stage.needs || stage.needs.length === 0) {
        needsContainer.innerHTML = '<span class="text-surface-muted italic">None (Root Stage)</span>';
      } else {
        needsContainer.innerHTML = stage.needs.map(n => \`
          <span class="px-2 py-0.5 rounded bg-surface-elevated border border-surface-border text-surface-text text-[11px]">\${escapeHtml(n)}</span>
        \`).join('');
      }

      document.getElementById('drawer-outputs-json').textContent = JSON.stringify(currentState[stage.id]?.outputs || {}, null, 2);
      document.getElementById('drawer-config-json').textContent = JSON.stringify(stage, null, 2);

      appendLog('Selected stage ' + stageId + ' (status: ' + st + ')');
    }

    function closeDrawer() {
      selectedStageId = null;
      document.querySelectorAll('.dag-node').forEach(el => el.classList.remove('active-selected'));
      document.getElementById('stage-drawer').classList.add('translate-x-full');
    }

    // Tab Switching
    document.querySelectorAll('.drawer-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-tab');
        document.querySelectorAll('.drawer-tab').forEach(t => {
          t.classList.remove('border-brand-cyan', 'text-brand-cyan');
          t.classList.add('border-transparent', 'text-surface-muted');
        });
        tab.classList.add('border-brand-cyan', 'text-brand-cyan');
        tab.classList.remove('border-transparent', 'text-surface-muted');

        document.getElementById('tab-telemetry').classList.add('hidden');
        document.getElementById('tab-outputs').classList.add('hidden');
        document.getElementById('tab-workflow').classList.add('hidden');
        document.getElementById('tab-' + target).classList.remove('hidden');
      });
    });

    document.getElementById('btn-close-drawer').addEventListener('click', closeDrawer);

    // Terminal minimize/toggle
    let terminalOpen = true;
    function toggleTerminal() {
      const term = document.getElementById('terminal-console');
      terminalOpen = !terminalOpen;
      if (terminalOpen) {
        term.classList.remove('h-8');
        term.classList.add('h-44');
      } else {
        term.classList.remove('h-44');
        term.classList.add('h-8');
      }
    }
    document.getElementById('btn-toggle-terminal').addEventListener('click', toggleTerminal);
    document.getElementById('btn-minimize-terminal').addEventListener('click', toggleTerminal);
    document.getElementById('btn-clear-logs').addEventListener('click', () => {
      document.getElementById('terminal-logs').innerHTML = '';
      appendLog('Logs cleared');
    });

    // Copy JSON Helper
    document.getElementById('btn-copy-outputs').addEventListener('click', () => {
      const text = document.getElementById('drawer-outputs-json').textContent;
      navigator.clipboard.writeText(text);
      appendLog('Copied outputs JSON to clipboard', 'text-brand-cyan');
    });

    // Trigger Run Button
    document.getElementById('btn-trigger').addEventListener('click', async () => {
      if (!confirm('Dispatch full pipeline "' + PIPELINE.name + '" on GitHub Actions?')) return;
      appendLog('Initiating dispatch for pipeline: ' + PIPELINE.name + '...', 'text-brand-cyan');
      try {
        const res = await fetch('/api/dispatch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        const data = await res.json();
        appendLog('Dispatch outcome: ' + (data.message || 'Success'), data.success ? 'text-brand-emerald' : 'text-brand-crimson');
      } catch (err) {
        appendLog('Failed to dispatch: ' + err.message, 'text-brand-crimson');
      }
    });

    document.getElementById('btn-dispatch-stage').addEventListener('click', async () => {
      if (!selectedStageId) return;
      if (!confirm('Dispatch individual stage "' + selectedStageId + '"?')) return;
      appendLog('Initiating dispatch for stage: ' + selectedStageId + '...', 'text-brand-cyan');
      try {
        const res = await fetch('/api/dispatch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stageId: selectedStageId }) });
        const data = await res.json();
        appendLog('Stage dispatch outcome: ' + (data.message || 'Success'), data.success ? 'text-brand-emerald' : 'text-brand-crimson');
      } catch (err) {
        appendLog('Failed to dispatch stage: ' + err.message, 'text-brand-crimson');
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
          appendLog('Received live telemetry update from GitHub Actions');
        } catch (e) {}
      };
      evtSource.onerror = () => {
        const statusPill = document.getElementById('connection-status');
        statusPill.className = 'flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-brand-amber border border-brand-amber/30';
        document.getElementById('connection-text').textContent = 'SSE Reconnecting...';
        appendLog('SSE connection dropped, retrying in 3s...', 'text-brand-amber');
      };
      evtSource.onopen = () => {
        const statusPill = document.getElementById('connection-status');
        statusPill.className = 'flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-brand-emerald border border-brand-emerald/30';
        document.getElementById('connection-text').textContent = 'GitHub SSE Active';
        appendLog('Connected to GitHub Actions event stream', 'text-brand-emerald');
      };
    }

    document.getElementById('btn-refresh').addEventListener('click', async () => {
      appendLog('Manual telemetry poll requested...');
      try {
        const res = await fetch('/api/state');
        currentState = await res.json();
        renderDag();
        if (selectedStageId) selectStage(selectedStageId);
        appendLog('Manual refresh completed', 'text-brand-emerald');
      } catch (e) {
        appendLog('Manual refresh error: ' + e.message, 'text-brand-crimson');
      }
    });

    function escapeHtml(s) {
      if (!s) return '';
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Initial render
    renderDag();
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
