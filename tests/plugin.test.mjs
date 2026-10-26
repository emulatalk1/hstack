import { test, expect } from 'bun:test';

const read = (file) => Bun.file(new URL(`../${file}`, import.meta.url)).json();

test('plugin and marketplace agree', async () => {
  const plugin = await read('.claude-plugin/plugin.json');
  const marketplace = await read('.claude-plugin/marketplace.json');
  const pkg = await read('package.json');

  expect(plugin.name).toBe('hstack');
  expect(marketplace.plugins[0].name).toBe('hstack');
  expect(marketplace.plugins[0].source).toBe('./');
  expect(pkg.dependencies).toBe(undefined);
  expect(pkg.devDependencies).toBe(undefined);
});
