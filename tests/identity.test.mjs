import { test } from 'node:test';
import assert from 'node:assert/strict';
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
  assert.equal(projectName(a), projectName(a));
  assert.notEqual(projectName(a), projectName(b));
});

test('name is a valid Docker project name for "Đất Dự Án 2"', () => {
  const dir = path.join(tempDir(), 'Đất Dự Án 2');
  fs.mkdirSync(dir);
  const name = projectName(dir);
  assert.match(name, /^[a-z0-9][a-z0-9_-]*$/);
  assert.ok(name.startsWith('dat-du-an-2-'), name);
});

test('name starts with a letter or digit even when the folder starts with "_"', () => {
  const dir = path.join(tempDir(), '_foo');
  fs.mkdirSync(dir);
  const name = projectName(dir);
  assert.match(name, /^[a-z0-9][a-z0-9_-]*$/);
  assert.ok(name.startsWith('foo-'), name);
});

test('composeName reads plain, quoted and commented names', () => {
  const dir = tempDir();
  const write = (file, text) => {
    const p = path.join(dir, file);
    fs.writeFileSync(p, text);
    return p;
  };
  assert.equal(composeName(write('plain.yml', 'name: shop-1\nservices:\n  db:\n    image: x\n')), 'shop-1');
  assert.equal(composeName(write('quoted.yml', 'name: "shop-1"\n')), 'shop-1');
  assert.equal(composeName(write('comment.yml', "name: 'shop-1' # x\n")), 'shop-1');
  assert.equal(composeName(write('nested.yml', 'services:\n  web:\n    name: shop-1\n')), null);
});
