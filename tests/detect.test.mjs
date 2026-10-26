import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { detectStack } from '../scripts/lib/detect.mjs';

test('the Electron fixture is stack B', () => {
  const s = detectStack('fixtures/electron');
  assert.equal(s.stack, 'B');
  assert.equal(s.packageManager, 'npm');
  assert.deepEqual(s.data.droppable, ['$PROBE_DATA_DIR']);
  assert.equal(s.data.kind, 'folder');
  assert.equal(s.devServer.port, null);
  assert.equal(s.compose, null);
  assert.equal(s.commands.install, 'npm ci');
});

test('the stack A fixture is stack A', () => {
  const s = detectStack('tests/fixtures/stack-a/real-estate');
  assert.equal(s.stack, 'A');
  assert.equal(s.packageManager, 'pnpm');
  assert.deepEqual(s.data.droppable, ['shop_dev', 'shop_dev_test']);
  assert.equal(s.devServer.port, 3000);
  assert.equal(s.compose, 'docker-compose.yml');
  assert.equal(s.data.seed, 'pnpm seed:demo');
  assert.equal(s.commands.oneTest.e2e, "pnpm test:e2e --project chromium -g '<title>'");
});

test('an empty folder is no stack', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hstack-'));
  try {
    assert.equal(detectStack(dir), null);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test('stack A without .env uses port 3000 and drops nothing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hstack-'));
  try {
    fs.cpSync('tests/fixtures/stack-a/real-estate', dir, { recursive: true });
    fs.rmSync(path.join(dir, '.env'));
    fs.rmSync(path.join(dir, 'docker-compose.yml'));
    const s = detectStack(dir);
    assert.equal(s.devServer.port, 3000);
    assert.deepEqual(s.data.droppable, []);
    assert.equal(s.compose, null);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test('stack A reads a custom port, quotes and ?query', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hstack-'));
  try {
    fs.cpSync('tests/fixtures/stack-a/real-estate', dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '.env'),
      '# note\n\nDATABASE_URL="postgres://u:p@h:5432/db1?sslmode=off"\nNEXT_PUBLIC_SERVER_URL=http://localhost:3100\n');
    const s = detectStack(dir);
    assert.equal(s.devServer.port, 3100);
    assert.deepEqual(s.data.droppable, ['db1', 'db1_test']);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});
