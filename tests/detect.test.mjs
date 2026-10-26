import { test, expect } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { detectStack } from '../scripts/lib/detect.mjs';

test('the Electron fixture is stack B', () => {
  const s = detectStack('fixtures/electron');
  expect(s.stack).toBe('B');
  expect(s.packageManager).toBe('npm');
  expect(s.data.droppable).toStrictEqual(['$PROBE_DATA_DIR']);
  expect(s.data.kind).toBe('folder');
  expect(s.devServer.port).toBe(null);
  expect(s.compose).toBe(null);
  expect(s.commands.install).toBe('npm ci');
});

test('the stack A fixture is stack A', () => {
  const s = detectStack('tests/fixtures/stack-a/real-estate');
  expect(s.stack).toBe('A');
  expect(s.packageManager).toBe('pnpm');
  expect(s.data.droppable).toStrictEqual(['shop_dev', 'shop_dev_test']);
  expect(s.devServer.port).toBe(3000);
  expect(s.compose).toBe('docker-compose.yml');
  expect(s.data.seed).toBe('pnpm seed:demo');
  expect(s.commands.oneTest.e2e).toBe("pnpm test:e2e --project chromium -g '<title>'");
});

test('an empty folder is no stack', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hstack-'));
  try {
    expect(detectStack(dir)).toBe(null);
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
    expect(s.devServer.port).toBe(3000);
    expect(s.data.droppable).toStrictEqual([]);
    expect(s.compose).toBe(null);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test('stack A reads a custom port, quotes and ?query', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hstack-'));
  try {
    fs.cpSync('tests/fixtures/stack-a/real-estate', dir, { recursive: true });
    await Bun.write(path.join(dir, '.env'),
      '# note\n\nDATABASE_URL="postgres://u:p@h:5432/db1?sslmode=off"\nNEXT_PUBLIC_SERVER_URL=http://localhost:3100\n');
    const s = detectStack(dir);
    expect(s.devServer.port).toBe(3100);
    expect(s.data.droppable).toStrictEqual(['db1', 'db1_test']);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});
