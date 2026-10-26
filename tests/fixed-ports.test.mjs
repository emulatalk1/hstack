import { test, expect } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findFixedPorts } from '../scripts/lib/fixed-ports.mjs';

test('scans dot-files and dot-folders, skips build folders, and sorts by file then line', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hstack-'));
  try {
    await Bun.write(path.join(dir, 'src/b.ts'), 'x\nfetch("http://localhost:3001")\nfetch("http://127.0.0.1:3002")\n');
    await Bun.write(path.join(dir, 'src/.dot.ts'), 'fetch("http://localhost:3003")\n');
    await Bun.write(path.join(dir, 'src/.hid/a.ts'), 'fetch("http://localhost:3004")\n');
    await Bun.write(path.join(dir, 'src/node_modules/m.ts'), 'fetch("http://localhost:3005")\n');
    await Bun.write(path.join(dir, 'src/.next/n.ts'), 'fetch("http://localhost:3006")\n');
    expect(await findFixedPorts(dir)).toStrictEqual([
      { file: 'src/.dot.ts', line: 1, port: 3003 },
      { file: 'src/.hid/a.ts', line: 1, port: 3004 },
      { file: 'src/b.ts', line: 2, port: 3001 },
      { file: 'src/b.ts', line: 3, port: 3002 },
    ]);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test('finds the fixed base URL', async () => {
  const hits = await findFixedPorts('tests/fixtures/stack-a/real-estate');
  expect(hits).toStrictEqual([{ file: 'tests/e2e/helpers/login.ts', line: 3, port: 3000 }]);
  expect(await findFixedPorts('fixtures/electron')).toStrictEqual([]);
  expect(await findFixedPorts('tests/fixtures/stack-a')).toStrictEqual([]);
});
