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
  // the plugin installs nothing; the two below serve `bun x tsc --noEmit` in development only
  expect(Object.keys(pkg.devDependencies).sort()).toEqual(['@types/bun', 'typescript']);
});
