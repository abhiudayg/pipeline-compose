import * as fs from 'node:fs';
import * as path from 'node:path';

export interface UpdateOptions {
  checkOnly?: boolean;
  force?: boolean;
}

const GITHUB_REPO = 'abhiudayg/pipeline-compose';
const REMOTE_MANIFEST_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/master/package.json`;
const REMOTE_BINARY_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/master/packages/cli/dist/index.js`;

export const CURRENT_VERSION = '1.17.2';

export async function runUpdate(options: UpdateOptions = {}): Promise<void> {
  const { checkOnly = false, force = false } = options;

  console.log(`Checking for updates (current: v${CURRENT_VERSION})...`);

  let remoteVersion = '';
  try {
    const res = await fetch(REMOTE_MANIFEST_URL, { headers: { 'User-Agent': 'pipeline-compose-cli' } });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = (await res.json()) as { version?: string };
    remoteVersion = data.version ?? '';
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Failed to check remote version: ${msg}`);
    process.exit(1);
  }

  if (!remoteVersion) {
    console.error('Could not determine remote version from repository manifest.');
    process.exit(1);
  }

  const isNewer = compareSemver(remoteVersion, CURRENT_VERSION) > 0;

  if (checkOnly) {
    if (isNewer) {
      console.log(`An update is available: v${CURRENT_VERSION} -> v${remoteVersion}`);
      console.log('Run `pipeline-compose update` to upgrade.');
    } else {
      console.log(`pipeline-compose is up to date (v${CURRENT_VERSION}).`);
    }
    return;
  }

  if (!isNewer && !force) {
    console.log(`pipeline-compose is already at the latest version (v${CURRENT_VERSION}).`);
    console.log('Run `pipeline-compose update --force` to re-download the latest release.');
    return;
  }

  const execPath = process.argv[1];
  if (!execPath) {
    console.error('Could not locate the running pipeline-compose executable.');
    process.exit(1);
  }

  let targetPath = '';
  try {
    targetPath = fs.realpathSync(execPath);
  } catch {
    targetPath = path.resolve(execPath);
  }

  if (targetPath.endsWith('.ts')) {
    console.log(`Running directly from source: ${targetPath}`);
    console.log('To update development workspace, run: git pull && pnpm run build');
    return;
  }

  console.log(`Downloading latest binary from ${GITHUB_REPO}...`);
  let binaryContent = '';
  try {
    const res = await fetch(REMOTE_BINARY_URL, { headers: { 'User-Agent': 'pipeline-compose-cli' } });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    binaryContent = await res.text();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Failed to download binary: ${msg}`);
    process.exit(1);
  }

  if (!binaryContent.startsWith('#!/usr/bin/env node') || binaryContent.length < 50_000) {
    console.error('Downloaded file failed integrity validation (invalid header or corrupted bundle).');
    process.exit(1);
  }

  const tmpPath = `${targetPath}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tmpPath, binaryContent, { mode: 0o755 });
    fs.renameSync(tmpPath, targetPath);
    console.log(`Successfully updated pipeline-compose to v${remoteVersion}!`);
    console.log(`Binary updated at: ${targetPath}`);
  } catch (err: unknown) {
    if (fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {}
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Failed to replace binary at ${targetPath}: ${msg}`);
    console.error('Try running with sudo or re-running the installation script.');
    process.exit(1);
  }
}

export function compareSemver(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);

  for (let i = 0; i < 3; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}
