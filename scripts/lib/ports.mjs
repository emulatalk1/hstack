import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

const run = promisify(execFile);

// Both tools fail when there is nothing to report (Docker off, no listener): treat that as "no output".
async function out(cmd, args) {
  try {
    return (await run(cmd, args)).stdout;
  } catch {
    return '';
  }
}

// Ports look like "127.0.0.1:5432->5432/tcp, [::]:8025->8025/tcp, 0.0.0.0:8000-8002->8000-8002/tcp".
function publishes(ports, port) {
  return ports.split(', ').some((entry) => {
    const m = entry.match(/:(\d+)(?:-(\d+))?->/);
    return m && port >= Number(m[1]) && port <= Number(m[2] ?? m[1]);
  });
}

async function containerOwner(port) {
  const format = '{{.Names}}\t{{.Ports}}\t{{.Label "com.docker.compose.project"}}\t{{.Label "com.docker.compose.project.working_dir"}}';
  for (const line of (await out('docker', ['ps', '--format', format])).split('\n')) {
    const [name, ports = '', project = '', workingDir = ''] = line.split('\t');
    if (name && publishes(ports, port)) {
      return { kind: 'container', name, project: project || null, workingDir: workingDir || null };
    }
  }
  return null;
}

async function processOwner(port) {
  const pids = await out('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t']);
  const pid = Number(pids.split('\n')[0]);
  if (!pid) return null;
  const cwd = (await out('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'])).split('\n').find((l) => l.startsWith('n'));
  return cwd ? { kind: 'process', pid, cwd: cwd.slice(1) } : null;
}

export async function portOwner(port) {
  return (await containerOwner(port)) ?? (await processOwner(port));
}

// lsof prints real paths (/private/var on macOS), so compare real paths.
function real(p) {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

export function isOurs(owner, dir, name) {
  const root = real(dir);
  if (owner.kind === 'container') {
    return owner.project === name && owner.workingDir !== null && real(owner.workingDir) === root;
  }
  const cwd = real(owner.cwd);
  return cwd === root || cwd.startsWith(root.endsWith(path.sep) ? root : root + path.sep);
}
