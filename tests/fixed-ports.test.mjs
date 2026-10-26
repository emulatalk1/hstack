import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findFixedPorts } from '../scripts/lib/fixed-ports.mjs';

test('finds the fixed base URL', () => {
  const hits = findFixedPorts('tests/fixtures/stack-a/real-estate');
  assert.deepEqual(hits, [{ file: 'tests/e2e/helpers/login.ts', line: 3, port: 3000 }]);
  assert.deepEqual(findFixedPorts('fixtures/electron'), []);
  assert.deepEqual(findFixedPorts('tests/fixtures/stack-a'), []);
});
