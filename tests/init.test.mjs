import { test, expect } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '..');
const INIT = path.join(REPO, 'scripts/init.mjs');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hstack-'));
}

function init(args) {
  const r = Bun.spawnSync([process.execPath, INIT, ...args], { cwd: REPO });
  const stdout = r.stdout.toString();
  return { code: r.exitCode, out: stdout + r.stderr.toString(), lines: stdout.split('\n') };
}

const manifestOf = (root) => path.join(root, '.hstack/manifest.json');
const readManifest = (root) => Bun.file(manifestOf(root)).json();
const isDir = (p) => fs.statSync(p, { throwIfNoEntry: false })?.isDirectory() === true;

function stackA() {
  const root = tmp();
  fs.cpSync(path.join(REPO, 'tests/fixtures/stack-a'), root, { recursive: true });
  return root;
}

async function stackB() {
  const root = tmp();
  for (const f of ['package.json', 'package-lock.json']) {
    await Bun.write(path.join(root, f), Bun.file(path.join(REPO, 'fixtures/electron', f)));
  }
  return root;
}

const listing = (dir) => [...new Bun.Glob('**/*').scanSync({ cwd: dir, dot: true, onlyFiles: false })].sort();

test('init writes a stack B manifest with no warnings', async () => {
  const root = await stackB();
  try {
    const r = init([root]);
    expect(r.code).toBe(0);
    const m = await readManifest(root);
    expect(m.stack).toBe('B');
    expect(m.app).toBe('.');
    expect(m.compose).toBe(null);
    expect(m.evaluators.models).toStrictEqual(['opus', 'sonnet']);
    expect(m.slots.audit).toBe('ponytail:ponytail-audit');
    expect(m.actor).toMatch(/^claude-code\//);
    expect(r.lines.filter((l) => l.startsWith('Warning: ')).length).toBe(0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('init detects the app subfolder', async () => {
  const root = stackA();
  try {
    expect(init([root]).code).toBe(0);
    expect((await readManifest(root)).app).toBe('real-estate');
    fs.rmSync(path.join(root, '.hstack'), { recursive: true });
    await Bun.write(path.join(root, 'other/package.json'), '{}');
    const r = init([root]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/--app/);
    expect(isDir(path.join(root, '.hstack'))).toBe(false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('init on stack A warns about the fixed port and the compose name', async () => {
  const root = stackA();
  try {
    const before = listing(path.join(root, 'real-estate'));
    const r = init([root]);
    expect(r.code).toBe(0);
    expect(listing(path.join(root, 'real-estate'))).toStrictEqual(before);
    const m = await readManifest(root);
    expect(m.compose.file).toBe('real-estate/docker-compose.yml');
    expect(m.compose.name).toBe(null);
    expect(m.compose.matches).toBe(false);
    expect(r.out).toMatch(/login\.ts line 3 has port 3000/);
    expect(r.out).toMatch(/no project name/);
    expect(r.out).toMatch(/any other folder named real-estate\./);
    expect(r.lines.filter((l) => l.startsWith('Warning: ')).length >= 2).toBeTruthy();
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a second init does not overwrite', async () => {
  const root = await stackB();
  try {
    expect(init([root]).code).toBe(0);
    await Bun.write(manifestOf(root), '{"edited":true}');
    const r = init([root]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/nothing changed/);
    expect(await Bun.file(manifestOf(root)).text()).toBe('{"edited":true}');
    expect(init([root, '--force']).code).toBe(0);
    expect((await readManifest(root)).stack).toBe('B');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('an empty folder writes nothing', () => {
  const root = tmp();
  try {
    expect(init([root]).code).toBe(1);
    expect(isDir(path.join(root, '.hstack'))).toBe(false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a folder with an unknown stack says so and writes nothing', async () => {
  const root = tmp();
  try {
    await Bun.write(path.join(root, 'package.json'), '{}');
    const r = init([root]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/no stack it knows/);
    expect(isDir(path.join(root, '.hstack'))).toBe(false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('an unknown flag or a missing --app value prints usage and exits 1', () => {
  expect(init(['--nope']).code).toBe(1);
  const r = init(['--app']);
  expect(r.code).toBe(1);
  expect(r.out).toMatch(/Usage/);
});

test('init prints the docs bundle result when docs/ exists', () => {
  const root = tmp();
  try {
    fs.cpSync(path.join(REPO, 'tests/fixtures/stack-a'), root, { recursive: true });
    fs.cpSync(path.join(REPO, 'tests/fixtures/okf-bad/no-type'), path.join(root, 'docs'), { recursive: true });
    const r = init([root]);
    expect(r.code).toBe(0);
    expect(r.lines.some((l) => l === 'Docs bundle: 1 errors.')).toBeTruthy();
    expect(r.lines.every((l) => !l.startsWith('Warning: Docs'))).toBeTruthy();
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
