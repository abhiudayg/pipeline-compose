import { describe, it, expect, afterEach } from 'vitest';
import * as http from 'node:http';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  startDashboardServer,
  detectRepo,
  detectPr,
  type DashboardServerHandle,
} from './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pipelineFixture = path.resolve(__dirname, '../../../.github/pipelines/pipeline.yml');

function fetchHttp(url: string, options?: http.RequestOptions, body?: string): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options ?? {}, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          body: data,
        });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

describe('Dashboard Server', () => {
  let handle: DashboardServerHandle | null = null;

  afterEach(async () => {
    if (handle) {
      await handle.close();
      handle = null;
    }
  });

  it('serves dashboard HTML with Stitch UI components', async () => {
    handle = await startDashboardServer({
      pipelinePath: pipelineFixture,
      port: 0,
      live: false,
      fetchLiveFn: () => ({
        ci: { status: 'success', durationMs: 12500 },
      }),
    });

    const res = await fetchHttp(handle.url);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('Pipeline Compose :: Mission Control');
    expect(res.body).toContain('Wave Execution DAG');
    expect(res.body).toContain('stage-drawer');
  });

  it('returns resolved pipeline DAG JSON at /api/pipeline', async () => {
    handle = await startDashboardServer({
      pipelinePath: pipelineFixture,
      port: 0,
      live: false,
    });

    const res = await fetchHttp(`${handle.url}/api/pipeline`);
    expect(res.status).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.name).toBe('release');
    expect(Array.isArray(json.stages)).toBe(true);
    expect(json.stages.length).toBeGreaterThanOrEqual(1);
  });

  it('returns current state at /api/state', async () => {
    handle = await startDashboardServer({
      pipelinePath: pipelineFixture,
      port: 0,
      live: true,
      fetchLiveFn: () => ({
        ci: { status: 'success', durationMs: 4200 },
        'version-sync': { status: 'running' },
      }),
    });

    const res = await fetchHttp(`${handle.url}/api/state`);
    expect(res.status).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.ci?.status).toBe('success');
    expect(json.ci?.durationMs).toBe(4200);
    expect(json['version-sync']?.status).toBe('running');
  });

  it('streams Server-Sent Events at /api/events', async () => {
    handle = await startDashboardServer({
      pipelinePath: pipelineFixture,
      port: 0,
      live: true,
      pollSeconds: 1,
      fetchLiveFn: () => ({
        ci: { status: 'success' },
      }),
    });

    const initialChunk = await new Promise<string>((resolve, reject) => {
      const req = http.get(`${handle!.url}/api/events`, (res) => {
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toBe('text/event-stream');
        res.on('data', (chunk) => {
          resolve(chunk.toString());
          req.destroy();
        });
      });
      req.on('error', (err) => {
        if (!req.destroyed) reject(err);
      });
    });

    expect(initialChunk).toContain('retry: 3000');
    expect(initialChunk).toContain('data:');
  });

  it('handles /api/dispatch for stage execution', async () => {
    let dispatchedStage: string | undefined;

    handle = await startDashboardServer({
      pipelinePath: pipelineFixture,
      port: 0,
      live: false,
      dispatchFn: async (_pipeline, stageId) => {
        dispatchedStage = stageId;
        return { success: true, message: `Dispatched ${stageId}` };
      },
    });

    const res = await fetchHttp(
      `${handle.url}/api/dispatch`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      JSON.stringify({ stageId: 'ci' }),
    );

    expect(res.status).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(true);
    expect(dispatchedStage).toBe('ci');
  });

  it('renders repo and PR badges when repo and pr options are specified', async () => {
    handle = await startDashboardServer({
      pipelinePath: pipelineFixture,
      port: 0,
      live: false,
      repo: 'aeswibon/pipeline-action',
      pr: 104,
    });

    const res = await fetchHttp(handle.url);
    expect(res.status).toBe(200);
    expect(res.body).toContain('https://github.com/aeswibon/pipeline-action');
    expect(res.body).toContain('https://github.com/aeswibon/pipeline-action/pull/104');
    expect(res.body).toContain('PR #104');
    expect(res.body).toContain('pull_request #104');
  });

  it('detectRepo prioritizes explicit argument and handles environment', () => {
    expect(detectRepo('custom/repo')).toBe('custom/repo');
    const orig = process.env.GITHUB_REPOSITORY;
    try {
      process.env.GITHUB_REPOSITORY = 'env/repo';
      expect(detectRepo()).toBe('env/repo');
    } finally {
      process.env.GITHUB_REPOSITORY = orig;
    }
  });

  it('detectPr normalizes leading hash and reads env vars', () => {
    expect(detectPr('#99')).toBe('99');
    expect(detectPr(105)).toBe('105');
    const origRef = process.env.GITHUB_REF;
    try {
      process.env.GITHUB_REF = 'refs/pull/77/merge';
      expect(detectPr()).toBe('77');
    } finally {
      process.env.GITHUB_REF = origRef;
    }
  });

  it('returns 404 for unknown routes', async () => {
    handle = await startDashboardServer({
      pipelinePath: pipelineFixture,
      port: 0,
      live: false,
    });

    const res = await fetchHttp(`${handle.url}/api/unknown`);
    expect(res.status).toBe(404);
  });
});
