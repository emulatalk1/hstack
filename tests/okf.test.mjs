import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkBundle } from '../scripts/lib/okf.mjs';

const REPO = path.resolve(import.meta.dirname, '..');
const bad = (name) => path.join(REPO, 'tests/fixtures/okf-bad', name);
const NOW = new Date('2026-10-26T00:00:00Z');

test("this repo's docs bundle passes", () => {
  assert.deepEqual(checkBundle(path.join(REPO, 'docs'), NOW).errors, []);
});

test('a concept without type fails', () => {
  const r = checkBundle(bad('no-type'), NOW);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /concept\.md/);
  assert.match(r.errors[0], /type/);
  assert.deepEqual(r.warnings, []);
});

test('stable without a human verified fails', () => {
  const r = checkBundle(bad('stable-unverified'), NOW);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /concept\.md/);
  assert.match(r.errors[0], /human:/);
});

test('a dead source path fails and a stale adapter warns', () => {
  const r = checkBundle(bad('dead-source'), NOW);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /missing\.md/);
  assert.equal(r.warnings.length, 1);
  assert.match(r.warnings[0], /stale_after/);
  assert.deepEqual(checkBundle(bad('dead-source'), new Date('2025-01-01')).warnings, []);
});

test('index, log and unlisted-concept rules', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hstack-'));
  try {
    const put = (f, t) => {
      fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
      fs.writeFileSync(path.join(root, f), t);
    };
    put('index.md', '---\nokf_version: "0.2"\ntitle: x\n---\n* [A](a.md)\n');
    put('a.md', '---\ntype: note\n---\n');
    put('sub/b.md', '---\ntype: note\n---\n');
    put('sub/index.md', '---\ntype: x\n---\n');
    put('log.md', '## Oct 26\n## 2026-10-26\n* nothing linked\n* see [A](/a.md)\n');
    const r = checkBundle(root, NOW);
    assert.equal(r.errors.length, 4);
    assert.ok(r.errors.some((e) => /^index\.md has frontmatter/.test(e)));
    assert.ok(r.errors.some((e) => /^sub\/index\.md has frontmatter/.test(e)));
    assert.ok(r.errors.some((e) => /^sub\/b\.md is not listed/.test(e)));
    assert.ok(r.errors.some((e) => /Oct 26/.test(e)));
    assert.equal(r.warnings.length, 1);
    assert.match(r.warnings[0], /nothing linked/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('the CLI exits 1 for a missing folder and for errors, 0 for a clean bundle', () => {
  const run = (d) => spawnSync(process.execPath, [path.join(REPO, 'scripts/okf-check.mjs'), d], { encoding: 'utf8' });
  assert.equal(run(path.join(REPO, 'nope')).status, 1);
  assert.equal(run(bad('no-type')).status, 1);
  assert.equal(run(path.join(REPO, 'docs')).status, 0);
});

function bundleWith(concept) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hstack-'));
  fs.writeFileSync(path.join(root, 'index.md'), '* [X](x.md)\n');
  fs.writeFileSync(path.join(root, 'x.md'), `---\n${concept}\n---\n`);
  const r = checkBundle(root, NOW);
  fs.rmSync(root, { recursive: true, force: true });
  return r;
}

test('trailing comments do not hide a stable without a human verified', () => {
  const r = bundleWith('type: design # kind\nstatus: stable # approved');
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /human:/);
});

test('a stable concept with a human verified passes, in flow and list form', () => {
  const flow = bundleWith('type: design\nstatus: "stable"\nverified: { by: human:me, at: "2026-10-26" } # ok');
  const list = bundleWith('type: design\nstatus: stable\nverified:\n  - { by: claude-code-advisor/1, at: x }\n  - { by: human:me, at: x }');
  assert.deepEqual(flow.errors, []);
  assert.deepEqual(list.errors, []);
});

test('an unreadable stale_after warns', () => {
  const r = bundleWith('type: adapter\nstale_after: soon');
  assert.deepEqual(r.errors, []);
  assert.equal(r.warnings.length, 1);
  assert.match(r.warnings[0], /^x\.md has a stale_after date hstack cannot read: soon\./);
});
