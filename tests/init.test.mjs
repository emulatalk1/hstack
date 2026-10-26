import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const REPO = path.resolve(import.meta.dirname, '..');
const INIT = path.join(REPO, 'scripts/init.mjs');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hstack-'));
}

function init(args) {
  const r = spawnSync(process.execPath, [INIT, ...args], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr, lines: r.stdout.split('\n') };
}

const manifestOf = (root) => path.join(root, '.hstack/manifest.json');
const readManifest = (root) => JSON.parse(fs.readFileSync(manifestOf(root), 'utf8'));

function stackA() {
  const root = tmp();
  fs.cpSync(path.join(REPO, 'tests/fixtures/stack-a'), root, { recursive: true });
  return root;
}

function stackB() {
  const root = tmp();
  for (const f of ['package.json', 'package-lock.json']) {
    fs.copyFileSync(path.join(REPO, 'fixtures/electron', f), path.join(root, f));
  }
  return root;
}

const listing = (dir) => fs.readdirSync(dir, { recursive: true }).sort();

test('init writes a stack B manifest with no warnings', () => {
  const root = stackB();
  try {
    const r = init([root]);
    assert.equal(r.code, 0, r.out);
    const m = readManifest(root);
    assert.equal(m.stack, 'B');
    assert.equal(m.app, '.');
    assert.equal(m.compose, null);
    assert.deepEqual(m.evaluators.models, ['opus', 'sonnet']);
    assert.equal(m.slots.audit, 'ponytail:ponytail-audit');
    assert.match(m.actor, /^claude-code\//);
    assert.equal(r.lines.filter((l) => l.startsWith('Warning: ')).length, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('init detects the app subfolder', () => {
  const root = stackA();
  try {
    assert.equal(init([root]).code, 0);
    assert.equal(readManifest(root).app, 'real-estate');
    fs.rmSync(path.join(root, '.hstack'), { recursive: true });
    fs.mkdirSync(path.join(root, 'other'));
    fs.writeFileSync(path.join(root, 'other/package.json'), '{}');
    const r = init([root]);
    assert.equal(r.code, 1);
    assert.match(r.out, /--app/);
    assert.equal(fs.existsSync(path.join(root, '.hstack')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('init on stack A warns about the fixed port and the compose name', () => {
  const root = stackA();
  try {
    const before = listing(path.join(root, 'real-estate'));
    const r = init([root]);
    assert.equal(r.code, 0, r.out);
    assert.deepEqual(listing(path.join(root, 'real-estate')), before);
    const m = readManifest(root);
    assert.equal(m.compose.file, 'real-estate/docker-compose.yml');
    assert.equal(m.compose.name, null);
    assert.equal(m.compose.matches, false);
    assert.match(r.out, /login\.ts line 3 has port 3000/);
    assert.match(r.out, /no project name/);
    assert.ok(r.lines.filter((l) => l.startsWith('Warning: ')).length >= 2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a second init does not overwrite', () => {
  const root = stackB();
  try {
    assert.equal(init([root]).code, 0);
    fs.writeFileSync(manifestOf(root), '{"edited":true}');
    const r = init([root]);
    assert.equal(r.code, 1);
    assert.match(r.out, /nothing changed/);
    assert.equal(fs.readFileSync(manifestOf(root), 'utf8'), '{"edited":true}');
    assert.equal(init([root, '--force']).code, 0);
    assert.equal(readManifest(root).stack, 'B');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('an empty folder writes nothing', () => {
  const root = tmp();
  try {
    assert.equal(init([root]).code, 1);
    assert.equal(fs.existsSync(path.join(root, '.hstack')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a folder with an unknown stack says so and writes nothing', () => {
  const root = tmp();
  try {
    fs.writeFileSync(path.join(root, 'package.json'), '{}');
    const r = init([root]);
    assert.equal(r.code, 1);
    assert.match(r.out, /no stack it knows/);
    assert.equal(fs.existsSync(path.join(root, '.hstack')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('an unknown flag or a missing --app value prints usage and exits 1', () => {
  assert.equal(init(['--nope']).code, 1);
  const r = init(['--app']);
  assert.equal(r.code, 1);
  assert.match(r.out, /Usage/);
});

test('init prints the docs bundle result when docs/ exists', () => {
  const root = tmp();
  try {
    fs.cpSync(path.join(REPO, 'tests/fixtures/stack-a'), root, { recursive: true });
    fs.cpSync(path.join(REPO, 'tests/fixtures/okf-bad/no-type'), path.join(root, 'docs'), { recursive: true });
    const r = init([root]);
    assert.equal(r.code, 0);
    assert.ok(r.lines.some((l) => l === 'Docs bundle: 1 errors.'));
    assert.ok(r.lines.every((l) => !l.startsWith('Warning: Docs')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
