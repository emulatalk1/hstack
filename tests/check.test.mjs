import { test, expect } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '..');
const INIT = path.join(REPO, 'scripts/init.mjs');
const CHECK = path.join(REPO, 'scripts/check.mjs');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hstack-'));
const rm = (...dirs) => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true }));

// The child never inherits a COMPOSE_* variable from the shell, so results do not depend on it.
const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('COMPOSE_')));

function node(script, args, env = cleanEnv) {
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

const COMPOSE_NAMES = ['compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml'];

// Runs each case against a fresh named compose folder: it edits the folder, then expects exit 1 and a message naming the cause.
async function refusedWhen(cases) {
  const wrong = [];
  for (const [label, setup, cause, env] of cases) {
    const a = await namedCompose();
    try {
      await setup(path.join(a, 'real-estate'));
      const r = node(CHECK, [a, 'docker'], env ?? cleanEnv);
      if (r.code !== 1 || !cause.test(r.out)) wrong.push(`${label}: exit ${r.code}, said "${r.out.trim()}"`);
    } finally {
      rm(a);
    }
  }
  expect(wrong).toEqual([]);
}

const appendEnv = (line) => async (d) => Bun.write(path.join(d, '.env'), (await Bun.file(path.join(d, '.env')).text()) + `\n${line}\n`);
const appendCompose = (text) => async (d) => {
  const f = path.join(d, 'docker-compose.yml');
  await Bun.write(f, (await Bun.file(f).text()) + text);
};

test('docker is refused when a variable or .env line could change the name or the files', async () => {
  await refusedWhen([
    ['.env COMPOSE_PROJECT_NAME=', appendEnv('COMPOSE_PROJECT_NAME=real-estate'), /COMPOSE_PROJECT_NAME/],
    ['.env COMPOSE_PROJECT_NAME with a colon', appendEnv('COMPOSE_PROJECT_NAME: x'), /COMPOSE_PROJECT_NAME/],
    ['.env export COMPOSE_FILE', appendEnv('export COMPOSE_FILE=x'), /COMPOSE_FILE/],
    ['.env COMPOSE_ENV_FILES', appendEnv('COMPOSE_ENV_FILES=x'), /COMPOSE_ENV_FILES/],
    ...['COMPOSE_PROJECT_NAME', 'COMPOSE_FILE', 'COMPOSE_ENV_FILES'].map((v) => [`shell ${v}`, async () => {}, new RegExp(v), { ...cleanEnv, [v]: 'x' }]),
  ]);
});

test('docker is refused when another compose file or folder sits beside the checked one', async () => {
  const names = [...COMPOSE_NAMES, ...COMPOSE_NAMES.map((n) => n.replace('.y', '.override.y'))].filter((n) => n !== 'docker-compose.yml');
  await refusedWhen([
    ...names.map((n) => [n, async (d) => Bun.write(path.join(d, n), 'services: {}\n'), new RegExp(n.replace(/\./g, '\\.'))]),
    ['a folder named compose.yml', async (d) => fs.mkdirSync(path.join(d, 'compose.yml')), /compose\.yml/],
  ]);
});

test('docker is refused when the compose file is built in a way hstack does not read', async () => {
  await refusedWhen([
    ['a second document', appendCompose('---\nname: real-estate\n'), /document/],
    ['two top-level names', appendCompose('name: real-estate\n'), /more than one top-level/],
    ['a ... line', appendCompose('...\n'), /document/],
    ['include', appendCompose('include:\n  - other.yml\n'), /include:/],
    ['a merge key', appendCompose('<<: *x\n'), /<<:/],
  ]);
});

test('docker is allowed for a clean compose file and for harmless extras', async () => {
  const a = await namedCompose();
  const d = path.join(a, 'real-estate');
  try {
    expect(check(a, 'docker').code).toBe(0);
    const f = path.join(d, 'docker-compose.yml');
    const text = await Bun.file(f).text();
    await Bun.write(f, `# header\n\n---\n${text}`);
    expect(check(a, 'docker').code).toBe(0);
    await Bun.write(f, text);
    await appendEnv('COMPOSE_PROFILES=x\n# COMPOSE_PROJECT_NAME=real-estate')(d);
    expect(check(a, 'docker').code).toBe(0);
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

test('port: a missing lsof refuses', async () => {
  const root = await initted('A');
  try {
    const r = node(CHECK, [root, 'port', '1'], { ...process.env, PATH: '/nonexistent' });
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/lsof command was not found/);
  } finally {
    rm(root);
  }
});
