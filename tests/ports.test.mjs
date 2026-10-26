import { test, expect } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { portOwner, isOurs } from '../scripts/lib/ports.mjs';

const listen = () => Bun.listen({ hostname: '127.0.0.1', port: 0, socket: { data() {} } });

test('a port this test listens on belongs to this process', async () => {
  const server = listen();
  const { port } = server;
  try {
    const owner = await portOwner(port);
    expect(owner.kind).toBe('process');
    expect(owner.pid).toBe(process.pid);
    expect(isOurs(owner, process.cwd(), 'x')).toBe(true);
  } finally {
    server.stop(true);
  }
  expect(await portOwner(port)).toBe(null);
});

test('isOurs compares real paths and folder boundaries', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hstack-'));
  const sibling = dir + 'x';
  fs.mkdirSync(path.join(dir, 'app'));
  fs.mkdirSync(sibling);
  const real = fs.realpathSync(dir);
  expect(isOurs({ kind: 'process', pid: 1, cwd: real }, dir, 'x')).toBe(true);
  expect(isOurs({ kind: 'process', pid: 1, cwd: path.join(real, 'app') }, dir, 'x')).toBe(true);
  expect(isOurs({ kind: 'process', pid: 1, cwd: fs.realpathSync(sibling) }, dir, 'x')).toBe(false);
  expect(isOurs({ kind: 'process', pid: 1, cwd: null }, dir, 'x')).toBe(false);
  const box = { kind: 'container', name: 'c', project: 'p-1', workingDir: dir };
  expect(isOurs(box, dir, 'p-1')).toBe(true);
  expect(isOurs(box, dir, 'p-2')).toBe(false);
  expect(isOurs({ ...box, workingDir: null }, dir, 'p-1')).toBe(false);
  fs.rmSync(dir, { recursive: true });
  fs.rmSync(sibling, { recursive: true });
});

function publishedPort() {
  try {
    const r = Bun.spawnSync(['docker', 'ps', '--format', '{{.Names}}\t{{.Ports}}']);
    if (r.exitCode !== 0) return null;
    for (const line of r.stdout.toString().split('\n')) {
      const [name, ports = ''] = line.split('\t');
      const m = ports.match(/:(\d+)->/);
      if (m) return { name, port: Number(m[1]) };
    }
  } catch {}
  return null;
}

const published = publishedPort();
test.skipIf(!published)('a Docker-published port is reported as a container, never as a process', async () => {
  const owner = await portOwner(published.port);
  expect(owner.kind).toBe('container');
  expect(owner.name).toBe(published.name);
});
