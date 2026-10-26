import { test, expect } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkBundle } from '../scripts/lib/okf.mjs';

const REPO = path.resolve(import.meta.dirname, '..');
const bad = (name) => path.join(REPO, 'tests/fixtures/okf-bad', name);
const NOW = new Date('2026-10-26T00:00:00Z');

test("this repo's docs bundle passes", async () => {
  expect((await checkBundle(path.join(REPO, 'docs'), NOW)).errors).toStrictEqual([]);
});

test('a concept without type fails', async () => {
  const r = await checkBundle(bad('no-type'), NOW);
  expect(r.errors.length).toBe(1);
  expect(r.errors[0]).toMatch(/concept\.md/);
  expect(r.errors[0]).toMatch(/type/);
  expect(r.warnings).toStrictEqual([]);
});

test('stable without a human verified fails', async () => {
  const r = await checkBundle(bad('stable-unverified'), NOW);
  expect(r.errors.length).toBe(1);
  expect(r.errors[0]).toMatch(/concept\.md/);
  expect(r.errors[0]).toMatch(/human:/);
});

test('a dead source path fails and a stale adapter warns', async () => {
  const r = await checkBundle(bad('dead-source'), NOW);
  expect(r.errors.length).toBe(1);
  expect(r.errors[0]).toMatch(/missing\.md/);
  expect(r.warnings.length).toBe(1);
  expect(r.warnings[0]).toMatch(/stale_after/);
  expect((await checkBundle(bad('dead-source'), new Date('2025-01-01'))).warnings).toStrictEqual([]);
});

test('index, log and unlisted-concept rules', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hstack-'));
  try {
    const put = (f, t) => Bun.write(path.join(root, f), t);
    await put('index.md', '---\nokf_version: "0.2"\ntitle: x\n---\n* [A](a.md)\n');
    await put('a.md', '---\ntype: note\n---\n');
    await put('sub/b.md', '---\ntype: note\n---\n');
    await put('sub/index.md', '---\ntype: x\n---\n');
    await put('log.md', '## Oct 26\n## 2026-10-26\n* nothing linked\n* see [A](/a.md)\n');
    const r = await checkBundle(root, NOW);
    expect(r.errors.length).toBe(4);
    expect(r.errors.some((e) => /^index\.md has frontmatter/.test(e))).toBeTruthy();
    expect(r.errors.some((e) => /^sub\/index\.md has frontmatter/.test(e))).toBeTruthy();
    expect(r.errors.some((e) => /^sub\/b\.md is not listed/.test(e))).toBeTruthy();
    expect(r.errors.some((e) => /Oct 26/.test(e))).toBeTruthy();
    expect(r.warnings.length).toBe(1);
    expect(r.warnings[0]).toMatch(/nothing linked/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('the CLI exits 1 for a missing folder and for errors, 0 for a clean bundle', () => {
  const run = (d) => Bun.spawnSync([process.execPath, 'scripts/okf-check.mjs', d], { cwd: REPO });
  expect(run(path.join(REPO, 'nope')).exitCode).toBe(1);
  expect(run(bad('no-type')).exitCode).toBe(1);
  expect(run(path.join(REPO, 'docs')).exitCode).toBe(0);
});

async function bundleWith(concept) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hstack-'));
  try {
    await Bun.write(path.join(root, 'index.md'), '* [X](x.md)\n');
    await Bun.write(path.join(root, 'x.md'), `---\n${concept}\n---\n`);
    return await checkBundle(root, NOW);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('trailing comments do not hide a stable without a human verified', async () => {
  const r = await bundleWith('type: design # kind\nstatus: stable # approved');
  expect(r.errors.length).toBe(1);
  expect(r.errors[0]).toMatch(/human:/);
});

test('a stable concept with a human verified passes, in flow and list form', async () => {
  const flow = await bundleWith('type: design\nstatus: "stable"\nverified: { by: human:me, at: "2026-10-26" } # ok');
  const list = await bundleWith('type: design\nstatus: stable\nverified:\n  - { by: claude-code-advisor/1, at: x }\n  - { by: human:me, at: x }');
  expect(flow.errors).toStrictEqual([]);
  expect(list.errors).toStrictEqual([]);
});

test('an unreadable stale_after warns', async () => {
  const r = await bundleWith('type: adapter\nstale_after: soon');
  expect(r.errors).toStrictEqual([]);
  expect(r.warnings.length).toBe(1);
  expect(r.warnings[0]).toMatch(/^x\.md has a stale_after date hstack cannot read: soon\./);
});

test('a comment right after the key leaves the value empty', async () => {
  const r = await bundleWith('type: # todo');
  expect(r.errors.length).toBe(1);
  expect(r.errors[0]).toMatch(/no type/);
});

test('a source path must stay inside the bundle and exist, with or without a leading slash or dot', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hstack-'));
  try {
    await Bun.write(path.join(root, 'design/real.md'), '---\ntype: note\n---\n');
    await Bun.write(path.join(root, 'index.md'), '* [X](x.md)\n* [Real](design/real.md)\n');
    const withSource = async (res) => {
      await Bun.write(path.join(root, 'x.md'), `---\ntype: adapter\nsources:\n  - id: s\n    resource: ${res}\n---\n`);
      return (await checkBundle(root, NOW)).errors.filter((e) => /^x\.md/.test(e));
    };
    expect(await withSource('design/real.md')).toStrictEqual([]);
    expect(await withSource('/design/real.md')).toStrictEqual([]);
    expect(await withSource('https://example.com/x')).toStrictEqual([]);
    expect(await withSource('design')).toStrictEqual([]);
    expect((await withSource('design/missing.md'))[0]).toMatch(/design\/missing\.md.*does not exist/);
    expect((await withSource('../../etc/hosts'))[0]).toMatch(/outside the bundle/);
    expect((await withSource('/../outside.md'))[0]).toMatch(/outside the bundle/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a dot-folder such as .git is not walked', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hstack-'));
  try {
    await Bun.write(path.join(root, 'index.md'), '* [X](x.md)\n');
    await Bun.write(path.join(root, 'x.md'), '---\ntype: note\n---\n');
    await Bun.write(path.join(root, '.git/x.md'), 'no frontmatter');
    expect((await checkBundle(root, NOW)).errors).toStrictEqual([]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
