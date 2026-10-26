import { test, expect } from 'bun:test';
import { findFixedPorts } from '../scripts/lib/fixed-ports.mjs';

test('finds the fixed base URL', async () => {
  const hits = await findFixedPorts('tests/fixtures/stack-a/real-estate');
  expect(hits).toStrictEqual([{ file: 'tests/e2e/helpers/login.ts', line: 3, port: 3000 }]);
  expect(await findFixedPorts('fixtures/electron')).toStrictEqual([]);
  expect(await findFixedPorts('tests/fixtures/stack-a')).toStrictEqual([]);
});
