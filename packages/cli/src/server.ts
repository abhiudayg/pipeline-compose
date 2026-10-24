import * as http from 'node:http';
import { exec, execSync } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import {
  loadPipelineDocumentFromFile,
  validatePipelineDocument,
  listPipelineStates,
  buildVisualizeState,
  type ResolvedPipeline,
  type StageState,
} from '@aeswibon/pipeline-compose-core';
import { renderDashboardHtml } from './dashboard-html.js';

export interface DashboardServerOptions {
  pipelinePath: string;
  port?: number;
  pollSeconds?: number;
  live?: boolean;
  openBrowser?: boolean;
  stateDir?: string;
  fetchLiveFn?: (pipeline: ResolvedPipeline) => Record<string, StageState>;
  dispatchFn?: (pipeline: ResolvedPipeline, stageId?: string) => Promise<{ success: boolean; message: string }>;
}

export interface DashboardServerHandle {
  server: http.Server;
  port: number;
  url: string;
  close: () => Promise<void>;
}

function defaultFetchLive(pipeline: ResolvedPipeline): Record<string, StageState> {
  const state: Record<string, StageState> = {};
  const byRepo = new Map<string, Map<string, string>>();

  for (const stage of pipeline.stages) {
    if (!stage.workflow) continue;
    const repo = stage.repo || currentRepo();
    if (!repo) continue;
    if (!byRepo.has(repo)) byRepo.set(repo, new Map());
    byRepo.get(repo)!.set(stage.workflow, stage.id);
  }

  for (const [repo, workflows] of byRepo) {
    for (const [workflow, stageId] of workflows) {
      try {
        const raw = execSync(
          `gh api /repos/${repo}/actions/workflows/${encodeURIComponent(workflow)}/runs?per_page=1 --jq '.workflow_runs[0] | {conclusion, status, html_url, run_started_at, updated_at}'`,
          { encoding: 'utf8', timeout: 8000, stdio: ['pipe', 'pipe', 'ignore'] },
        );
        const data = JSON.parse(raw.trim() || '{}');
        const conclusion = data.conclusion ?? data.status;
        const status: 'success' | 'failure' | 'running' | 'skipped' =
          conclusion === 'success' ? 'success'
            : conclusion === 'failure' ? 'failure'
              : conclusion === 'cancelled' ? 'skipped'
                : 'running';

        let durationMs: number | undefined;
        if (data.run_started_at && data.updated_at) {
          durationMs = new Date(data.updated_at).getTime() - new Date(data.run_started_at).getTime();
        }

        state[stageId] = { status, durationMs };
      } catch {
        state[stageId] = { status: 'pending' };
      }
    }
  }

  return state;
}

function currentRepo(): string {
  try {
    const remote = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    const match = remote.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

async function defaultDispatch(
  pipeline: ResolvedPipeline,
  stageId?: string,
): Promise<{ success: boolean; message: string }> {
  try {
    if (stageId) {
      const stage = pipeline.stages.find((s) => s.id === stageId);
      if (!stage || !stage.workflow) {
        return { success: false, message: `Stage ${stageId} not found or has no workflow` };
      }
      const repo = stage.repo || currentRepo();
      const repoArg = repo ? `--repo "${repo}"` : '';
      execSync(`gh workflow run "${stage.workflow}" ${repoArg}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { success: true, message: `Dispatched stage ${stageId} (${stage.workflow})` };
    }

    const firstWaveStage = pipeline.stages.find((s) => !s.needs || s.needs.length === 0);
    if (!firstWaveStage || !firstWaveStage.workflow) {
      return { success: false, message: 'Could not determine initial workflow to dispatch' };
    }
    const repo = firstWaveStage.repo || currentRepo();
    const repoArg = repo ? `--repo "${repo}"` : '';
    execSync(`gh workflow run "${firstWaveStage.workflow}" ${repoArg}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, message: `Dispatched root workflow ${firstWaveStage.workflow}` };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Dispatch error: ${errorMsg}` };
  }
}

export function startDashboardServer(
  options: DashboardServerOptions,
): Promise<DashboardServerHandle> {
  const {
    pipelinePath,
    port = 4321,
    pollSeconds = 5,
    live = true,
    openBrowser = false,
    stateDir,
    fetchLiveFn = defaultFetchLive,
    dispatchFn = defaultDispatch,
  } = options;

  const absoluteTarget = path.resolve(pipelinePath);
  if (!fs.existsSync(absoluteTarget)) {
    throw new Error(`Pipeline file not found: ${pipelinePath}`);
  }

  const pipeline = loadPipelineDocumentFromFile(absoluteTarget);
  const resolved = validatePipelineDocument(pipeline);

  let currentState: Record<string, StageState> = {};

  if (stateDir) {
    const records = listPipelineStates(path.resolve(stateDir), resolved.name);
    currentState = buildVisualizeState(resolved, records);
  }

  if (live) {
    currentState = { ...fetchLiveFn(resolved), ...currentState };
  }

  const sseClients = new Set<http.ServerResponse>();

  let pollTimer: NodeJS.Timeout | null = null;
  if (live) {
    pollTimer = setInterval(() => {
      try {
        const delta = fetchLiveFn(resolved);
        currentState = { ...currentState, ...delta };
        const data = `data: ${JSON.stringify(delta)}\n\n`;
        for (const client of sseClients) {
          client.write(data);
        }
      } catch {
        // preserve server loop on polling error
      }
    }, pollSeconds * 1000);
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/') {
      const html = renderDashboardHtml({
        pipeline: resolved,
        initialState: currentState,
        port,
        pollSeconds,
        live,
      });
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(html);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/pipeline') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(resolved));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/state') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(currentState));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      });
      res.write(`retry: 3000\n\n`);
      res.write(`data: ${JSON.stringify(currentState)}\n\n`);

      sseClients.add(res);

      req.on('close', () => {
        sseClients.delete(res);
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/dispatch') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          const result = await dispatchFn(resolved, payload.stageId);
          res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: errorMsg }));
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  return new Promise((resolve, reject) => {
    let currentPort = port;
    let attempts = 0;
    const maxAttempts = 10;

    const tryListen = () => {
      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && attempts < maxAttempts) {
          attempts++;
          currentPort++;
          tryListen();
        } else {
          if (pollTimer) clearInterval(pollTimer);
          reject(err);
        }
      });

      server.listen(currentPort, () => {
        const address = server.address();
        const actualPort = typeof address === 'object' && address ? address.port : currentPort;
        const serverUrl = `http://localhost:${actualPort}`;

        if (openBrowser) {
          const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
          exec(`${openCmd} ${serverUrl}`);
        }

        resolve({
          server,
          port: actualPort,
          url: serverUrl,
          close: () => {
            if (pollTimer) clearInterval(pollTimer);
            for (const client of sseClients) {
              client.end();
            }
            sseClients.clear();
            return new Promise((done) => server.close(() => done()));
          },
        });
      });
    };

    tryListen();
  });
}
