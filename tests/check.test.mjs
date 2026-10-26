import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const REPO = path.resolve(import.meta.dirname, '..');
const INIT = path.join(REPO, 'scripts/init.mjs');
const CHECK = path.join(REPO, 'scripts/check.mjs');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hstack-'));
const rm = (...dirs) => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true }));

function node(script, args, env = process.env) {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', env });
  return { code: r.status, out: r.stdout + r.stderr };
}

function initted(stack) {
  const root = tmp();
  if (stack === 'A') {
    fs.cpSync(path.join(REPO, 'tests/fixtures/stack-a'), root, { recursive: true });
  } else {
    for (const f of ['package.json', 'package-lock.json']) {
      fs.copyFileSync(path.join(REPO, 'fixtures/electron', f), path.join(root, f));
    }
  }
  assert.equal(node(INIT, [root]).code, 0);
  return root;
}

const check = (root, ...args) => node(CHECK, [root, ...args]);

test('drop allows the manifest\'s databases only', () => {
  const root = initted('A');
  try {
    assert.equal(check(root, 'drop', 'shop_dev').code, 0);
    const r = check(root, 'drop', 'real_estate');
    assert.equal(r.code, 1);
    assert.match(r.out, /shop_dev/);
  } finally {
    rm(root);
  }
});

test('a copied folder fails every check', () => {
  const x = initted('A');
  const y = tmp();
  try {
    fs.cpSync(x, y, { recursive: true });
    for (const args of [['drop', 'shop_dev'], ['docker'], ['port', '1']]) {
      const r = check(y, ...args);
      assert.equal(r.code, 1, args.join(' '));
      assert.match(r.out, /copied or moved/);
      assert.match(r.out, /init/);
    }
  } finally {
    rm(x, y);
  }
});

test('a folder without a manifest is refused', () => {
  const root = tmp();
  try {
    const r = check(root, 'drop', 'x');
    assert.equal(r.code, 1);
    assert.match(r.out, /No hstack manifest here\. Run init first\./);
  } finally {
    rm(root);
  }
});

test('usage errors print one line and exit 1', () => {
  const root = initted('A');
  try {
    for (const args of [['nope'], ['drop'], ['wipe'], ['port'], ['port', 'abc'], []]) {
      const r = check(root, ...args);
      assert.equal(r.code, 1, args.join(' '));
      assert.match(r.out, /^Usage: /);
      assert.equal(r.out.trim().split('\n').length, 1);
    }
  } finally {
    rm(root);
  }
});

test('docker is refused when the compose file has no matching name', () => {
  const root = initted('A');
  try {
    const r = check(root, 'docker');
    assert.equal(r.code, 1);
    assert.match(r.out, /no project name/);
  } finally {
    rm(root);
  }
});

test('docker is refused when there is no compose file, allowed when the name matches', () => {
  const b = initted('B');
  const a = initted('A');
  try {
    assert.equal(check(b, 'docker').code, 1);
    const file = path.join(a, 'real-estate/docker-compose.yml');
    const name = JSON.parse(fs.readFileSync(path.join(a, '.hstack/manifest.json'), 'utf8')).projectName;
    fs.writeFileSync(file, `name: ${name}\n` + fs.readFileSync(file, 'utf8'));
    assert.equal(check(a, 'docker').code, 0);
  } finally {
    rm(a, b);
  }
});

// A child that listens on 127.0.0.1 from the given folder and prints its port.
function listener(cwd) {
  const child = spawn(process.execPath, ['-e', "require('net').createServer().listen(0,'127.0.0.1',function(){console.log(this.address().port)})"], { cwd });
  return new Promise((resolve, reject) => {
    child.stdout.once('data', (d) => resolve({ child, port: Number(d.toString().trim()) }));
    child.once('error', reject);
  });
}

async function freePort() {
  const s = net.createServer();
  await new Promise((r) => s.listen(0, '127.0.0.1', r));
  const { port } = s.address();
  await new Promise((r) => s.close(r));
  return port;
}

test('port: free is allowed, our own listener is allowed, another folder\'s listener is refused', async () => {
  const root = initted('B');
  const other = tmp();
  const kids = [];
  try {
    assert.equal(check(root, 'port', String(await freePort())).code, 0);

    const ours = await listener(root);
    kids.push(ours.child);
    assert.equal(check(root, 'port', String(ours.port)).code, 0);

    const theirs = await listener(other);
    kids.push(theirs.child);
    const r = check(root, 'port', String(theirs.port));
    assert.equal(r.code, 1);
    assert.ok(r.out.includes(fs.realpathSync(other)), r.out);
    assert.match(r.out, /will not stop/);
  } finally {
    kids.forEach((k) => k.kill());
    rm(root, other);
  }
});

test('wipe allows only the data folder', () => {
  const root = initted('B');
  const env = { ...process.env };
  delete env.PROBE_DATA_DIR;
  try {
    assert.equal(node(CHECK, [root, 'wipe', path.join(root, 'data')], env).code, 0);
    for (const bad of [os.homedir(), root, os.tmpdir(), path.join(root, 'other'), path.join(root, 'data', '..')]) {
      const r = node(CHECK, [root, 'wipe', bad], env);
      assert.equal(r.code, 1, bad);
      assert.ok(r.out.includes(path.join(root, 'data')), r.out);
    }
  } finally {
    rm(root);
  }
});

test('wipe takes an env value only from a real temp folder', () => {
  const root = initted('B');
  const inTmp = fs.mkdtempSync('/tmp/hstack-'); // /private/tmp on macOS
  try {
    assert.equal(node(CHECK, [root, 'wipe', inTmp], { ...process.env, PROBE_DATA_DIR: inTmp }).code, 0);
    assert.equal(node(CHECK, [root, 'wipe', os.homedir()], { ...process.env, PROBE_DATA_DIR: os.homedir() }).code, 1);
  } finally {
    rm(root, inTmp);
  }
});

test('wipe ignores TMPDIR and env values inside .hstack', () => {
  const root = initted('B');
  const outside = fs.mkdtempSync(path.join(REPO, '.outside-'));
  try {
    const x = path.join(outside, 'x');
    fs.mkdirSync(x);
    const fake = { ...process.env, TMPDIR: outside, PROBE_DATA_DIR: x };
    assert.equal(node(CHECK, [root, 'wipe', x], fake).code, 1);
    const hstackDir = path.join(root, '.hstack');
    assert.equal(node(CHECK, [root, 'wipe', hstackDir], { ...process.env, PROBE_DATA_DIR: hstackDir }).code, 1);
  } finally {
    rm(root, outside);
  }
});

test('a malformed manifest is refused in plain words', () => {
  const root = initted('A');
  try {
    fs.writeFileSync(path.join(root, '.hstack/manifest.json'), '{nope');
    const r = check(root, 'drop', 'shop_dev');
    assert.equal(r.code, 1);
    assert.match(r.out, /could not be read\. Run init again with --force\./);
    assert.doesNotMatch(r.out, /at file:|Error/);
  } finally {
    rm(root);
  }
});

test('wipe is refused for a database project', () => {
  const root = initted('A');
  try {
    assert.equal(check(root, 'wipe', path.join(root, 'data')).code, 1);
  } finally {
    rm(root);
  }
});
