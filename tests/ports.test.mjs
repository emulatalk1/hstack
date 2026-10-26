import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { portOwner, isOurs } from '../scripts/lib/ports.mjs';

const listen = () =>
  new Promise((resolve) => {
    const server = net.createServer().listen(0, '127.0.0.1', () => resolve(server));
  });

test('a port this test listens on belongs to this process', async () => {
  const server = await listen();
  const { port } = server.address();
  const owner = await portOwner(port);
  assert.equal(owner.kind, 'process');
  assert.equal(owner.pid, process.pid);
  assert.equal(isOurs(owner, process.cwd(), 'x'), true);
  await new Promise((resolve) => server.close(resolve));
  assert.equal(await portOwner(port), null);
});

test('isOurs compares real paths and folder boundaries', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hstack-'));
  const sibling = dir + 'x';
  fs.mkdirSync(path.join(dir, 'app'));
  fs.mkdirSync(sibling);
  const real = fs.realpathSync(dir);
  assert.equal(isOurs({ kind: 'process', pid: 1, cwd: real }, dir, 'x'), true);
  assert.equal(isOurs({ kind: 'process', pid: 1, cwd: path.join(real, 'app') }, dir, 'x'), true);
  assert.equal(isOurs({ kind: 'process', pid: 1, cwd: fs.realpathSync(sibling) }, dir, 'x'), false);
  assert.equal(isOurs({ kind: 'process', pid: 1, cwd: null }, dir, 'x'), false);
  const box = { kind: 'container', name: 'c', project: 'p-1', workingDir: dir };
  assert.equal(isOurs(box, dir, 'p-1'), true);
  assert.equal(isOurs(box, dir, 'p-2'), false);
  assert.equal(isOurs({ ...box, workingDir: null }, dir, 'p-1'), false);
  fs.rmSync(dir, { recursive: true });
  fs.rmSync(sibling, { recursive: true });
});

function publishedPort() {
  try {
    const out = execFileSync('docker', ['ps', '--format', '{{.Names}}\t{{.Ports}}'], { encoding: 'utf8' });
    for (const line of out.split('\n')) {
      const [name, ports = ''] = line.split('\t');
      const m = ports.match(/:(\d+)->/);
      if (m) return { name, port: Number(m[1]) };
    }
  } catch {}
  return null;
}

const published = publishedPort();
test('a Docker-published port is reported as a container, never as a process', { skip: !published }, async () => {
  const owner = await portOwner(published.port);
  assert.equal(owner.kind, 'container');
  assert.equal(owner.name, published.name);
});
