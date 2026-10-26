import { test, expect } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '..');
const INIT = path.join(REPO, 'scripts/init.mjs');
const CHECK = path.join(REPO, 'scripts/check.mjs');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hstack-'));
const rm = (...dirs) => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true }));

function node(script, args, env = process.env) {
  const r = Bun.spawnSync([process.execPath, script, ...args], { cwd: REPO, env });
  return { code: r.exitCode, out: r.stdout.toString() + r.stderr.toString() };
}

async function initted(stack) {
  const root = tmp();
  if (stack === 'A') {
    fs.cpSync(path.join(REPO, 'tests/fixtures/stack-a'), root, { recursive: true });
  } else {
    for (const f of ['package.json', 'package-lock.json']) {
      await Bun.write(path.join(root, f), Bun.file(path.join(REPO, 'fixtures/electron', f)));
    }
  }
  expect(node(INIT, [root]).code).toBe(0);
  return root;
}

const check = (root, ...args) => node(CHECK, [root, ...args]);

test('drop allows the manifest\'s databases only', async () => {
  const root = await initted('A');
  try {
    expect(check(root, 'drop', 'shop_dev').code).toBe(0);
    const r = check(root, 'drop', 'real_estate');
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/shop_dev/);
  } finally {
    rm(root);
  }
});

test('a copied folder fails every check', async () => {
  const x = await initted('A');
  const y = tmp();
  try {
    fs.cpSync(x, y, { recursive: true });
    for (const args of [['drop', 'shop_dev'], ['docker'], ['port', '1']]) {
      const r = check(y, ...args);
      expect(r.code).toBe(1);
      expect(r.out).toMatch(/copied or moved/);
      expect(r.out).toMatch(/init/);
    }
  } finally {
    rm(x, y);
  }
});

test('a folder without a manifest is refused', async () => {
  const root = tmp();
  try {
    const r = check(root, 'drop', 'x');
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/No hstack manifest here\. Run init first\./);
  } finally {
    rm(root);
  }
});

test('usage errors print one line and exit 1', async () => {
  const root = await initted('A');
  try {
    for (const args of [['nope'], ['drop'], ['wipe'], ['port'], ['port', 'abc'], ['port', '0'], ['port', '65536'], ['port', '99999'], []]) {
      const r = check(root, ...args);
      expect(r.code).toBe(1);
      expect(r.out).toMatch(/^Usage: /);
      expect(r.out.trim().split('\n').length).toBe(1);
    }
  } finally {
    rm(root);
  }
});

test('docker is refused when the compose file has no matching name', async () => {
  const root = await initted('A');
  try {
    const r = check(root, 'docker');
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/no project name/);
  } finally {
    rm(root);
  }
});

test('docker is refused when there is no compose file, allowed when the name matches', async () => {
  const b = await initted('B');
  const a = await initted('A');
  try {
    expect(check(b, 'docker').code).toBe(1);
    const file = path.join(a, 'real-estate/docker-compose.yml');
    const name = (await Bun.file(path.join(a, '.hstack/manifest.json')).json()).projectName;
    await Bun.write(file, `name: ${name}\n` + await Bun.file(file).text());
    expect(check(a, 'docker').code).toBe(0);
  } finally {
    rm(a, b);
  }
});

// Stack A with a compose file whose name: matches, so only the extra cause under test can refuse it.
async function namedCompose() {
  const a = await initted('A');
  const file = path.join(a, 'real-estate/docker-compose.yml');
  const name = (await Bun.file(path.join(a, '.hstack/manifest.json')).json()).projectName;
  await Bun.write(file, `name: ${name}\n` + await Bun.file(file).text());
  return a;
}

test('docker is refused when Compose would pick another name or file', async () => {
  const a = await namedCompose();
  const envFile = path.join(a, 'real-estate/.env');
  const original = await Bun.file(envFile).text();
  try {
    expect(check(a, 'docker').code).toBe(0);
    for (const [line, cause] of [['COMPOSE_PROJECT_NAME=real-estate', /COMPOSE_PROJECT_NAME/], ['export COMPOSE_FILE=other.yml', /COMPOSE_FILE/]]) {
      await Bun.write(envFile, original + `\n${line}\n`);
      const r = check(a, 'docker');
      expect(r.code).toBe(1);
      expect(r.out).toMatch(cause);
    }
    await Bun.write(envFile, original + '\n# COMPOSE_PROJECT_NAME=real-estate\n');
    expect(check(a, 'docker').code).toBe(0);
    await Bun.write(envFile, original);
    for (const v of ['COMPOSE_PROJECT_NAME', 'COMPOSE_FILE']) {
      const r = node(CHECK, [a, 'docker'], { ...process.env, [v]: 'x' });
      expect(r.code).toBe(1);
      expect(r.out).toMatch(new RegExp(v));
    }
    await Bun.write(path.join(a, 'real-estate/compose.yaml'), 'services: {}\n');
    const r = check(a, 'docker');
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/compose\.yaml/);
  } finally {
    rm(a);
  }
});

// A child that listens on the given host and port (0 = any free one) from the given folder, and prints its port.
async function listener(cwd, host = '127.0.0.1', port = 0) {
  const code = `const s = Bun.listen({ hostname: '${host}', port: ${port}, socket: { data() {} } }); console.log(s.port);`;
  const child = Bun.spawn([process.execPath, '-e', code], { cwd, stdout: 'pipe' });
  const { value } = await child.stdout.getReader().read();
  return { child, port: Number(new TextDecoder().decode(value).trim()) };
}

function freePort() {
  const s = Bun.listen({ hostname: '127.0.0.1', port: 0, socket: { data() {} } });
  const { port } = s;
  s.stop(true);
  return port;
}

test('port: free is allowed, our own listener is allowed, another folder\'s listener is refused', async () => {
  const root = await initted('B');
  const other = tmp();
  const kids = [];
  try {
    expect(check(root, 'port', String(freePort())).code).toBe(0);

    const ours = await listener(root);
    kids.push(ours.child);
    expect(check(root, 'port', String(ours.port)).code).toBe(0);

    const theirs = await listener(other);
    kids.push(theirs.child);
    const r = check(root, 'port', String(theirs.port));
    expect(r.code).toBe(1);
    expect(r.out.includes(fs.realpathSync(other))).toBeTruthy();
    expect(r.out).toMatch(/will not stop/);
  } finally {
    kids.forEach((k) => k.kill());
    rm(root, other);
  }
});

const hasIPv6 = (() => {
  try {
    Bun.listen({ hostname: '::1', port: 0, socket: { data() {} } }).stop(true);
    return true;
  } catch {
    return false;
  }
})();

test.skipIf(!hasIPv6)('port: every listener must be ours, or the port is refused', async () => {
  const root = await initted('B');
  const other = tmp();
  const kids = [];
  try {
    const ours = await listener(root);
    kids.push(ours.child);
    const theirs = await listener(other, '::1', ours.port);
    kids.push(theirs.child);
    const r = check(root, 'port', String(ours.port));
    expect(r.code).toBe(1);
    expect(r.out.includes(fs.realpathSync(other))).toBeTruthy();
  } finally {
    kids.forEach((k) => k.kill());
    rm(root, other);
  }
});

test('wipe allows only the data folder', async () => {
  const root = await initted('B');
  const env = { ...process.env };
  delete env.PROBE_DATA_DIR;
  try {
    expect(node(CHECK, [root, 'wipe', path.join(root, 'data')], env).code).toBe(0);
    for (const bad of [os.homedir(), root, os.tmpdir(), path.join(root, 'other'), path.join(root, 'data', '..')]) {
      const r = node(CHECK, [root, 'wipe', bad], env);
      expect(r.code).toBe(1);
      expect(r.out.includes(path.join(root, 'data'))).toBeTruthy();
    }
  } finally {
    rm(root);
  }
});

test('wipe takes an env value only from a real temp folder', async () => {
  const root = await initted('B');
  const inTmp = fs.mkdtempSync('/tmp/hstack-'); // /private/tmp on macOS
  try {
    expect(node(CHECK, [root, 'wipe', inTmp], { ...process.env, PROBE_DATA_DIR: inTmp }).code).toBe(0);
    expect(node(CHECK, [root, 'wipe', os.homedir()], { ...process.env, PROBE_DATA_DIR: os.homedir() }).code).toBe(1);
  } finally {
    rm(root, inTmp);
  }
});

test('wipe ignores TMPDIR and env values inside .hstack', async () => {
  const root = await initted('B');
  const outside = fs.mkdtempSync(path.join(REPO, '.outside-'));
  try {
    const x = path.join(outside, 'x');
    fs.mkdirSync(x);
    const fake = { ...process.env, TMPDIR: outside, PROBE_DATA_DIR: x };
    expect(node(CHECK, [root, 'wipe', x], fake).code).toBe(1);
    const hstackDir = path.join(root, '.hstack');
    expect(node(CHECK, [root, 'wipe', hstackDir], { ...process.env, PROBE_DATA_DIR: hstackDir }).code).toBe(1);
  } finally {
    rm(root, outside);
  }
});

test('wipe never allows a folder that holds the project', async () => {
  const outer = fs.mkdtempSync('/tmp/hstack-');
  const root = path.join(outer, 'proj');
  try {
    fs.mkdirSync(root);
    for (const f of ['package.json', 'package-lock.json']) {
      await Bun.write(path.join(root, f), Bun.file(path.join(REPO, 'fixtures/electron', f)));
    }
    expect(node(INIT, [root]).code).toBe(0);
    const r = node(CHECK, [root, 'wipe', outer], { ...process.env, PROBE_DATA_DIR: outer });
    expect(r.code).toBe(1);
  } finally {
    rm(outer);
  }
});

test('a malformed manifest is refused in plain words', async () => {
  const root = await initted('A');
  try {
    for (const bad of ['{nope', 'null', '{}', '{"projectName":"x"}']) {
      await Bun.write(path.join(root, '.hstack/manifest.json'), bad);
      const r = check(root, 'drop', 'shop_dev');
      expect(r.code).toBe(1);
      expect(r.out).toMatch(/could not be read\. Run init again with --force\./);
      expect(r.out).not.toMatch(/at file:|Error/);
    }
  } finally {
    rm(root);
  }
});

test('wipe is refused for a database project', async () => {
  const root = await initted('A');
  try {
    expect(check(root, 'wipe', path.join(root, 'data')).code).toBe(1);
  } finally {
    rm(root);
  }
});

test('drop is refused for a folder project, which uses wipe', async () => {
  const root = await initted('B');
  try {
    const r = check(root, 'drop', '$PROBE_DATA_DIR');
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/folder/);
    expect(r.out).toMatch(/wipe/);
  } finally {
    rm(root);
  }
});
