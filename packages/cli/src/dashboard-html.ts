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
            },
            surface: {
              base: '#0d1117',
              container: '#161b22',
              elevated: '#21262d',
              border: '#30363d',
              muted: '#8b949e',
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
    body { background-color: #0d1117; color: #f0f6fc; font-family: 'Geist', -apple-system, sans-serif; }
    .code-font { font-family: 'JetBrains Mono', monospace; }
    .dag-node { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
    .dag-node:hover { transform: translateY(-2px); box-shadow: 0 8px 24px -4px rgba(0, 220, 230, 0.15); }
    .dag-node.active-selected { border-color: #00dce6 !important; box-shadow: 0 0 0 2px rgba(0, 220, 230, 0.4); }
    @keyframes pulse-cyan {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.15); }
    }
    .pulse-dot { animation: pulse-cyan 1.8s infinite ease-in-out; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #0d1117; }
    ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #8b949e; }
  </style>
</head>
<body class="min-h-screen flex flex-col bg-[#0d1117] overflow-x-hidden selection:bg-brand-cyan/20 selection:text-brand-cyan">
  <!-- Top Navigation Telemetry Bar -->
  <header class="h-16 border-b border-surface-border bg-surface-container/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-brand-cyan text-2xl">account_tree</span>
        <span class="font-bold tracking-wider text-sm text-surface-text uppercase code-font">Pipeline<span class="text-brand-cyan">::</span>Compose</span>
      </div>
      <div class="h-4 w-px bg-surface-border"></div>
      <div class="flex items-center gap-2">
        <span class="px-2.5 py-1 text-xs font-semibold rounded-md bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30 code-font">
          ${escapeHtml(pipeline.name)}
        </span>
        <span class="text-xs text-surface-muted code-font">(${pipeline.stages.length} stages)</span>
      </div>
    </div>

    <!-- Center Control Indicators -->
    <div class="flex items-center gap-3">
      <div id="connection-status" class="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-brand-emerald border border-brand-emerald/30">
        <span class="w-2 h-2 rounded-full bg-brand-emerald pulse-dot"></span>
        <span id="connection-text">${live ? 'GitHub SSE Active' : 'Offline Mode'}</span>
      </div>
      <div class="text-xs text-surface-muted code-font hidden sm:flex items-center gap-1 bg-surface-elevated px-2.5 py-1 rounded border border-surface-border">
        <span class="material-symbols-outlined text-sm">schedule</span>
        <span>Poll: ${pollSeconds}s</span>
      </div>
    </div>

    <!-- Right Action Center -->
    <div class="flex items-center gap-3">
      <button id="btn-refresh" class="p-2 rounded-lg bg-surface-elevated hover:bg-surface-border text-surface-muted hover:text-surface-text transition flex items-center" title="Refresh Now">
        <span class="material-symbols-outlined text-lg">refresh</span>
      </button>
      <button id="btn-trigger" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-cyan text-[#0d1117] font-semibold text-xs hover:bg-[#00c5ce] transition shadow-lg shadow-brand-cyan/20">
        <span class="material-symbols-outlined text-base">play_arrow</span>
        <span>Dispatch Run</span>
      </button>
    </div>
  </header>

  <!-- Main Viewport Layout -->
  <main class="flex-1 flex overflow-hidden relative">
    <!-- DAG Canvas Container -->
    <div id="dag-container" class="flex-1 overflow-auto p-8 relative flex flex-col items-start min-h-[calc(100vh-4rem)]">
      <div class="mb-4 flex items-center justify-between w-full max-w-7xl">
        <div class="flex items-center gap-2">
          <h2 class="text-xs font-bold text-surface-muted uppercase tracking-wider code-font">Wave Execution DAG</h2>
          <span class="text-xs text-surface-muted">— Auto-layout by topological dependencies</span>
        </div>
        <div class="flex items-center gap-3 text-xs">
          <div class="flex items-center gap-1.5 text-surface-muted"><span class="w-2 h-2 rounded-full bg-brand-emerald"></span>Success</div>
          <div class="flex items-center gap-1.5 text-surface-muted"><span class="w-2 h-2 rounded-full bg-brand-cyan"></span>Running</div>
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
      <div class="p-4 border-b border-surface-border flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-brand-cyan">terminal</span>
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
              <span>Duration</span>
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
            <button id="btn-dispatch-stage" class="w-full py-2 px-3 rounded-lg bg-surface-elevated hover:bg-surface-border border border-surface-border text-surface-text font-semibold transition flex items-center justify-center gap-2">
              <span class="material-symbols-outlined text-sm text-brand-cyan">play_arrow</span>
              <span>Dispatch This Stage</span>
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

  <!-- Interactive JavaScript -->
  <script>
    const PIPELINE = ${JSON.stringify(pipeline)};
    let currentState = ${JSON.stringify(initialState)};
    let selectedStageId = null;

    const STATUS_MAP = {
      success: { color: '#3fb950', bg: 'rgba(63, 185, 80, 0.12)', border: '#3fb950', icon: 'check_circle', text: 'Success' },
      failure: { color: '#f85149', bg: 'rgba(248, 81, 73, 0.12)', border: '#f85149', icon: 'cancel', text: 'Failed' },
      running: { color: '#00dce6', bg: 'rgba(0, 220, 230, 0.12)', border: '#00dce6', icon: 'sync', text: 'Running' },
      skipped: { color: '#8b949e', bg: 'rgba(139, 148, 158, 0.1)', border: '#8b949e', icon: 'block', text: 'Skipped' },
      pending: { color: '#8b949e', bg: 'rgba(139, 148, 158, 0.05)', border: '#30363d', icon: 'hourglass_empty', text: 'Pending' },
    };

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

    function renderDag() {
      const waves = calculateWaves();
      const NODE_W = 260;
      const NODE_H = 80;
      const COL_GAP = 64;
      const ROW_GAP = 24;
      const PAD_X = 32;
      const PAD_Y = 32;

      const nodeCoords = new Map();
      const nodesContainer = document.getElementById('dag-nodes');
      const edgesSvg = document.getElementById('dag-edges');
      const viewport = document.getElementById('viewport');

      nodesContainer.innerHTML = '';
      edgesSvg.innerHTML = '';

      const maxInWave = waves.reduce((m, w) => Math.max(m, w.length), 0);
      const totalW = PAD_X * 2 + waves.length * NODE_W + (waves.length - 1) * COL_GAP;
      const totalH = PAD_Y * 2 + maxInWave * NODE_H + (maxInWave - 1) * ROW_GAP;

      viewport.style.width = Math.max(totalW, 900) + 'px';
      viewport.style.height = Math.max(totalH, 440) + 'px';
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
          card.className = 'dag-node absolute rounded-xl p-3.5 flex flex-col justify-between cursor-pointer border ' +
            (isSelected ? 'active-selected ' : '') +
            'bg-surface-container hover:border-brand-cyan/60';
          card.style.left = x + 'px';
          card.style.top = y + 'px';
          card.style.width = NODE_W + 'px';
          card.style.height = NODE_H + 'px';
          card.style.borderColor = isSelected ? '#00dce6' : conf.border;

          card.innerHTML = \`
            <div class="flex items-center justify-between gap-2">
              <span class="font-bold text-xs text-surface-text code-font truncate">\${escapeHtml(stage.id)}</span>
              <span class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase code-font"
                    style="color: \${conf.color}; background-color: \${conf.bg};">
                \${st === 'running' ? '<span class="w-1.5 h-1.5 rounded-full bg-brand-cyan pulse-dot"></span>' : ''}
                \${conf.text}
              </span>
            </div>
            <div class="flex items-center justify-between text-[11px] text-surface-muted code-font">
              <span class="truncate max-w-[140px] text-[10px]">\${escapeHtml(stage.workflow || stage.run || 'inline')}</span>
              <span>\${formatDuration(currentState[stage.id]?.durationMs)}</span>
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
            const strokeColor = fromStatus === 'success' ? '#3fb950' : fromStatus === 'running' ? '#00dce6' : '#30363d';

            svgContent += \`
              <path d="M\${x1},\${y1} C\${cx},\${y1} \${cx},\${y2} \${x2},\${y2}"
                    fill="none"
                    stroke="\${strokeColor}"
                    stroke-width="2"
                    stroke-opacity="0.8"/>
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
        alert(data.message || 'Dispatch requested');
      } catch (err) {
        alert('Failed to dispatch: ' + err.message);
      }
    });

    document.getElementById('btn-dispatch-stage').addEventListener('click', async () => {
      if (!selectedStageId) return;
      if (!confirm('Dispatch individual stage "' + selectedStageId + '"?')) return;
      try {
        const res = await fetch('/api/dispatch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stageId: selectedStageId }) });
        const data = await res.json();
        alert(data.message || 'Stage dispatch requested');
      } catch (err) {
        alert('Failed to dispatch stage: ' + err.message);
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
      evtSource.onerror = () => {
        const statusPill = document.getElementById('connection-status');
        statusPill.className = 'flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-brand-amber border border-brand-amber/30';
        document.getElementById('connection-text').textContent = 'SSE Reconnecting...';
      };
      evtSource.onopen = () => {
        const statusPill = document.getElementById('connection-status');
        statusPill.className = 'flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-brand-emerald border border-brand-emerald/30';
        document.getElementById('connection-text').textContent = 'GitHub SSE Active';
      };
    }

    document.getElementById('btn-refresh').addEventListener('click', async () => {
      try {
        const res = await fetch('/api/state');
        currentState = await res.json();
        renderDag();
        if (selectedStageId) selectStage(selectedStageId);
      } catch (e) {}
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
