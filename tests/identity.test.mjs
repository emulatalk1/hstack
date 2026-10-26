import { test, expect } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { projectName, composeName } from '../scripts/lib/identity.mjs';

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hstack-'));

test('same path gives the same name; another path gives another name', () => {
  const a = path.join(tempDir(), 'shop');
  const b = path.join(tempDir(), 'shop');
  fs.mkdirSync(a);
  fs.mkdirSync(b);
  expect(projectName(a)).toBe(projectName(a));
  expect(projectName(a)).not.toBe(projectName(b));
});

test('name is a valid Docker project name for "Đất Dự Án 2"', () => {
  const dir = path.join(tempDir(), 'Đất Dự Án 2');
  fs.mkdirSync(dir);
  const name = projectName(dir);
  expect(name).toMatch(/^[a-z0-9][a-z0-9_-]*$/);
  expect(name.startsWith('dat-du-an-2-')).toBeTruthy();
});

test('name starts with a letter or digit even when the folder starts with "_"', () => {
  const dir = path.join(tempDir(), '_foo');
  fs.mkdirSync(dir);
  const name = projectName(dir);
  expect(name).toMatch(/^[a-z0-9][a-z0-9_-]*$/);
  expect(name.startsWith('foo-')).toBeTruthy();
});

test('composeName reads plain, quoted and commented names', async () => {
  const dir = tempDir();
  const write = async (file, text) => {
    const p = path.join(dir, file);
    await Bun.write(p, text);
    return p;
  };
  expect(await composeName(await write('plain.yml', 'name: shop-1\nservices:\n  db:\n    image: x\n'))).toBe('shop-1');
  expect(await composeName(await write('quoted.yml', 'name: "shop-1"\n'))).toBe('shop-1');
  expect(await composeName(await write('comment.yml', "name: 'shop-1' # x\n"))).toBe('shop-1');
  expect(await composeName(await write('empty-comment.yml', 'name: # c\n'))).toBe(null);
  expect(await composeName(await write('bom.yml', '\uFEFFname: shop-1\n'))).toBe('shop-1');
  expect(await composeName(await write('nested.yml', 'services:\n  web:\n    name: shop-1\n'))).toBe(null);
});
