import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

const run = promisify(execFile);

// Docker being off or missing just means no container match, so failures give "no output".
async function out(cmd, args) {
  try {
    return (await run(cmd, args)).stdout;
  } catch {
    return '';
  }
}

// lsof exits 1 with no output when nothing listens; any other failure must not look like a free port.
async function lsofListeners(port) {
  try {
    return (await run('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'])).stdout;
  } catch (err) {
    if (err.code === 1 && !err.stdout) return '';
    throw new Error(`Could not check who holds port ${port}: ${err.code === 'ENOENT' ? 'the lsof command was not found' : err.message}`);
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

async function processOwners(port) {
  const pids = [...new Set((await lsofListeners(port)).split('\n').map(Number).filter(Boolean))];
  return Promise.all(pids.map(async (pid) => {
    const cwd = (await out('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'])).split('\n').find((l) => l.startsWith('n'));
    // A listener whose folder we cannot read (other user, just exited) is still a holder, never "free".
    return { kind: 'process', pid, cwd: cwd ? cwd.slice(1) : null };
  }));
}

// Every holder of the port: the container if Docker publishes it, else each listening process.
export async function portOwners(port) {
  const box = await containerOwner(port);
  return box ? [box] : processOwners(port);
}

export async function portOwner(port) {
  return (await portOwners(port))[0] ?? null;
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
  if (owner.cwd === null) return false;
  const cwd = real(owner.cwd);
  return cwd === root || cwd.startsWith(root.endsWith(path.sep) ? root : root + path.sep);
}
