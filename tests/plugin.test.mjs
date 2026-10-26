import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => JSON.parse(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'));

test('plugin and marketplace agree', () => {
  const plugin = read('.claude-plugin/plugin.json');
  const marketplace = read('.claude-plugin/marketplace.json');
  const pkg = read('package.json');

  assert.equal(plugin.name, 'hstack');
  assert.equal(marketplace.plugins[0].name, 'hstack');
  assert.equal(marketplace.plugins[0].source, './');
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.devDependencies, undefined);
});
