import { test, expect, afterAll } from 'bun:test'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { ARM_LAYER, blockedTargets, cpOut, enterBox, freshRepo, FW_RUN, main, pinHosts, pluginExport, proofCode, rootRefused, rulesCommand, servicesUp, vsockRefused, withListener } from '../bench/box.mjs'
import { withExport } from '../bench/env.mjs'
import { productImage, removeRecorded, recordDocker } from '../bench/ext.mjs'
import { API_HOSTS, RESUMES } from '../bench/lib/arm.mjs'
import { releaseRoot } from './bench-root.mjs'

// A fixture repo and data folder stand in for a task; a sh stub stands in for the CLI, and containers on the default bridge
// stand in for the API (a Bun server that answers with the auth header it got: never the real API, never a real token), a denied
// address and the registry, so nothing here needs the internet once the fixture images are cached. Tests that use Docker need
// BENCH_EXT_DOCKER=1. Everything a box made goes by its own leave; the stand-ins and the names of the 'only those' test are
// removed here by name. bench-arm/fw:1 and bench-arm/proxy:1 stay: step 8's lock removes the first (ruling 13), the step 11 lock the second.
const DOCKER = process.env.BENCH_EXT_DOCKER === '1'
const dtest = DOCKER ? test : test.skip
const dropRoot = releaseRoot()
const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'bench-box-')))
const rand = () => Math.random().toString(36).slice(2, 8)
const docker = (...a) => Bun.spawnSync(['docker', ...a], { stdout: 'pipe', stderr: 'pipe' })
const text = (r) => r.stdout.toString().trim()
const hostGit = (dir, ...a) => {
  const r = Bun.spawnSync(['git', '-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { stdout: 'pipe', stderr: 'pipe' })
  if (r.exitCode) throw new Error(r.stderr.toString())
  return text(r)
}

const platform = process.arch === 'arm64' ? 'linux/arm64' : 'linux/amd64'
// coreutils: every task image has GNU timeout (exit 124); busybox's exits 143. iptables: so a refused rule is the missing
// capability, not a missing binary
const recipe = { platform, test: 'true\n', probe: ['src/a.txt'],
  dockerfile: 'FROM alpine:3.22\nRUN apk add --no-cache git coreutils iptables\nCOPY . /work\nWORKDIR /work\nRUN mkdir dist && echo built > dist/out.bin && echo image > made.txt\n' }

const fx = join(tmp, 'fixture')
mkdirSync(join(fx, 'src'), { recursive: true })
writeFileSync(join(fx, 'src/a.txt'), 'a\n')
writeFileSync(join(fx, '.gitignore'), 'dist/\n')
hostGit(fx, 'init', '-q'); hostGit(fx, 'add', '.'); hostGit(fx, 'commit', '-qm', 'base')
const base = hostGit(fx, 'rev-parse', 'HEAD')

// $2 is the prompt: claudeArgs starts with -p <prompt>
const stub = `#!/bin/sh
case "$2" in
  save) echo kept > "$HOME/session"; echo saved ;;
  read) cat "$HOME/session" ;;
  env) echo "$IS_SANDBOX $CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC $DISABLE_TELEMETRY $DISABLE_AUTOUPDATER $ANTHROPIC_AUTH_TOKEN $ANTHROPIC_BASE_URL $BOX_TEST"; echo "$*"; pwd ;;
  svc) cat /tmp/svc ;;
  change) echo agent > src/agent.txt; echo more > dist/agent.bin ;;
  hang) echo late > src/late.txt; setsid sleep 1000 & sleep 1000 ;;
  die) kill -9 $$ ;;
  stubborn) trap '' TERM; sleep 1000 ;;
  mark) touch "$HOME/marker" ;;
  'Reply OK.')
    case "$*" in *webby*) t='"WebSearch"' ;; *) t='"Bash"' ;; esac
    echo "{\\"type\\":\\"system\\",\\"subtype\\":\\"init\\",\\"tools\\":[$t],\\"plugins\\":[],\\"slash_commands\\":[]}"
    echo '{"type":"result","is_error":false,"result":"OK"}' ;;
  *) echo "$2" ;;
esac
`
const SAMPLE_HEAD = 'task\tstack\ttier\trank\tid\turl\tpr\tissue\tbase\tend\tmethod\tf2p\tedit_history\tplatform\tcold_setup'
const id = 's1-01', reId = 'p9z'
const PROXY = { auth: 'authorization', betas: [], cliVar: 'ANTHROPIC_AUTH_TOKEN' }
// the controller's <data>/arm/proxy/Dockerfile, the same lines
const PROXY_DOCKERFILE = 'FROM oven/bun:1.4.4-alpine@sha256:4cf82f5686b196504fe119db3fcd9185b191f82ece82c40680e597228ec6070a\nCOPY proxy.mjs /proxy/proxy.mjs\nRUN mkdir -p /out && chown bun /out\nUSER bun\nENTRYPOINT ["bun","/proxy/proxy.mjs","serve"]\n'
const made = [] // what `setup` made
// re: also a private-set task reId (tasks.json, the real-estate recipe and serve layer) with these services
function setup({ token = true, re, ready } = {}) {
  const owner = `fx${rand()}`, data = join(tmp, owner), ext = join(data, 'ext'), key = `${owner}__app`, slug = `${key}__1`
  for (const d of [join(ext, 'tasks', slug), join(ext, 'serve', key), join(data, 'arm'), join(data, 'env')]) mkdirSync(d, { recursive: true })
  writeFileSync(join(data, 'machine.json'), JSON.stringify({ forbid: { paths: [] } }))
  writeFileSync(join(ext, 'sample.tsv'), [SAMPLE_HEAD, `${id}\ts1\t1\t1\t${owner}/app#1\tu\t1\t11\t${base}\t${base}\tsingle\t1\tnone\t${platform}\tyes`, ''].join('\n'))
  writeFileSync(join(ext, 'tasks', slug, 'task-recipe.json'), JSON.stringify(recipe))
  writeFileSync(join(ext, 'serve', key, 'serve.json'), JSON.stringify({ layer: [], start: '', ready: 'true', notes: '', briefSha: null }))
  writeFileSync(join(data, 'arm/claude'), stub)
  chmodSync(join(data, 'arm/claude'), 0o755)
  if (token) writeFileSync(join(data, 'arm/box.env'), 'BOX_TEST=from-env-file\n')
  mkdirSync(join(data, 'arm/proxy')); writeFileSync(join(data, 'arm/proxy/Dockerfile'), PROXY_DOCKERFILE)
  writeFileSync(join(data, 'env', `${id}.json`), JSON.stringify({ name: id, repo: fx, db: null, port: 49152, start: null, ready: null, setup: [], teardown: [], oracle: 'true', junit: 'j.xml' }))
  if (re !== undefined) {
    for (const d of [join(ext, 'tasks/real-estate'), join(ext, 'serve/real-estate'), join(data, 'env/box')]) mkdirSync(d, { recursive: true })
    writeFileSync(join(data, 'tasks.json'), JSON.stringify({ [reId]: { base, end: base } }))
    writeFileSync(join(ext, 'tasks/real-estate/task-recipe.json'), JSON.stringify(recipe))
    writeFileSync(join(ext, 'serve/real-estate/serve.json'), JSON.stringify({ layer: [], start: 'true', ready: 'true', notes: '', briefSha: 'x', services: re, servicesReady: ready }))
    writeFileSync(join(data, 'env/box', `${reId}.json`), JSON.stringify({ name: reId, repo: fx, db: null, port: 50152, start: null, ready: null, setup: [], teardown: [], oracle: 'true', junit: 'j.xml' }))
  }
  const sl = re === undefined ? slug : 'real-estate'
  const s = { data, slug: sl, armTag: `bench-ext/${sl}:${base.slice(0, 7)}-arm`, serveTag: `bench-ext/${sl}:${base.slice(0, 7)}-serve`, boxName: (n) => `bench-ext-${sl}-arm-${n}`, proxyName: (n) => `bench-arm-proxy-bench-ext-${sl}-arm-${n}` }
  made.push(s)
  return s
}
const bye = []
const seen = (kind, name) => docker(kind, 'inspect', name).exitCode === 0
const running = (name) => text(docker('inspect', '-f', '{{.State.Running}}', name)) === 'true'

// listeners on the default bridge: the API stand-in (HTTP on 443, answering with the auth header it got), a denied address, the registry
const allowedName = `bench-box-test-${rand()}-allowed`, deniedName = `bench-box-test-${rand()}-denied`, registryName = `bench-box-test-${rand()}-registry`
const standIns = DOCKER ? [allowedName, deniedName, registryName] : []
if (DOCKER) {
  docker('run', '-d', '--rm', '--name', allowedName, 'oven/bun:1.4.4-alpine', 'bun', '-e', "Bun.serve({ port: 443, fetch: (r) => new Response(r.headers.get('authorization') ?? 'none') })")
  for (const n of [deniedName, registryName]) docker('run', '-d', '--rm', '--name', n, 'alpine:3.22', 'nc', '-lk', '-p', '443', '-e', '/bin/cat')
}
const addr = (n) => text(docker('inspect', '-f', '{{.NetworkSettings.Networks.bridge.IPAddress}}', n))
const allowed = DOCKER ? addr(allowedName) : null, denied = DOCKER ? addr(deniedName) : null, registry = DOCKER ? addr(registryName) : null
const hosts = () => API_HOSTS.map((host) => ({ host, ip: allowed }))
const registryHosts = () => [{ host: 'registry.npmjs.org', ip: registry }]
const UPSTREAM = 'http://api.anthropic.com:443' // the stand-in, by the name the proxy pins
const denyOnly = [{ host: denied, port: 443 }]

// a plugin folder: its manifest and one skill
const plugin = join(tmp, 'plugin')
mkdirSync(join(plugin, '.claude-plugin'), { recursive: true }); mkdirSync(join(plugin, 'skills/s1'), { recursive: true })
writeFileSync(join(plugin, '.claude-plugin/plugin.json'), '{"name":"hp"}\n'); writeFileSync(join(plugin, 'skills/s1/SKILL.md'), 'skill\n')

afterAll(async () => {
  await first?.then((f) => f.b.leave(), () => {}) // gone already unless a test failed before its leave
  for (const f of bye) f()
  for (const n of standIns) docker('kill', n) // --rm takes it away
  rmSync(tmp, { recursive: true, force: true })
  dropRoot()
}, 120000)

// a fresh repo as run-arm makes it, handed to enterBox while the export exists
async function enter(s, name, inj = {}, over = {}) {
  const task = { name: over.id ?? id, repo: fx }
  return withExport(task, base, `${name}-${rand()}`, async (dir) => {
    await freshRepo(dir, base)
    return enterBox({ data: s.data, task, id, name, base, repoGit: join(dir, '.git'), cli: join(s.data, 'arm/claude'), turnTimeoutSec: 3, proxy: PROXY, ...over },
      { hosts: hosts(), registryHosts: registryHosts(), upstream: UPSTREAM, diskFree: async () => 100, ...inj })
  })
}

// the one box most tests share: built once, its firewall checked against the whole list of ruling 3, left at the end
let first
const shared = () => (first ??= (async () => {
  const s = setup(), name = `${id}-H-1`, b = await enter(s, name, {}, { plugins: [{ name: 'hp', dir: plugin }] })
  return { s, b, box: s.boxName(name), proxy: s.proxyName(name), inBox: (...a) => docker('exec', s.boxName(name), ...a) }
})())

// --- no Docker ---

test('the arm layer takes the bench files and any .git out of /work and installs git when the image has none', () => {
  const lines = ARM_LAYER.join('\n')
  for (const f of ['.bench.Dockerfile', '.bench.Dockerfile.dockerignore', '.bench-test.sh', '.git']) expect(lines).toContain(`/work/${f}`)
  expect(lines).toContain('command -v git')
})

const ROUTES = 'default via 172.17.0.1 dev eth0\n172.17.0.0/16 dev eth0\n# x\nnameserver 192.168.65.7\n'
test('the blocked targets are the five of ruling 3: the host on the listener\'s port, gateway and resolver from the box', () => {
  const local = [{ host: 'host.docker.internal', port: 40001 }, { host: '172.17.0.1', port: 40001 }, { host: '192.168.65.7', port: 53 }]
  expect(blockedTargets(ROUTES, 40001)).toEqual([{ host: '1.1.1.1', port: 443 }, { host: 'github.com', port: 443 }, ...local])
  expect(blockedTargets(ROUTES, 40001, [{ host: '10.0.0.9', port: 443 }])).toEqual([{ host: '10.0.0.9', port: 443 }, ...local]) // a test on a bridge: only the public part is replaced
})

test('the helper is never pulled: the image that gets NET_ADMIN is the one built here', () => {
  expect(FW_RUN).toEqual(['docker', 'run', '--rm', '--pull', 'never'])
  expect(rulesCommand('b', 's').slice(0, 5)).toEqual(FW_RUN)
  const source = readFileSync(join(import.meta.dir, '../bench/box.mjs'), 'utf8')
  expect(source.split("'docker', 'run'").length - 1).toBe(1) // the one in FW_RUN: every run of the helper goes through it
})

test('nothing in the box tool names the port of the host\'s database', () => {
  expect(readFileSync(join(import.meta.dir, '../bench/box.mjs'), 'utf8')).not.toContain('5432')
})

test('the listener takes an ephemeral port and closes in every outcome', async () => {
  const connects = (port) => Bun.connect({ hostname: '127.0.0.1', port, socket: { data() {} } }).then((s) => (s.end(), true), () => false)
  let port
  expect(await withListener(async (p) => { port = p; expect(await connects(p)).toBe(true); return 'done' })).toBe('done')
  expect(port).toBeGreaterThan(1023)
  expect(await connects(port)).toBe(false)
  await expect(withListener(async (p) => { port = p; throw new Error('no') })).rejects.toThrow('no')
  expect(await connects(port)).toBe(false)
})

test('only the kernel\'s refusal counts: a tool that is not there proves nothing', () => {
  expect(rootRefused({ code: 2, err: 'ip: SIOCSIFFLAGS: Operation not permitted\n' })).toBe(true)
  expect(rootRefused({ code: 4, err: 'iptables: Could not fetch rule set generation id: Permission denied (you must be root)\n' })).toBe(true)
  expect(rootRefused({ code: 127, err: 'sh: ip: not found\n' })).toBe(false)
  expect(rootRefused({ code: 0, err: '' })).toBe(false)
})

test('a vsock open fails only by the OS: a missing python proves nothing', () => {
  expect(vsockRefused({ code: 1, err: 'PermissionError: [Errno 1] Operation not permitted\n' })).toBe(true)
  expect(vsockRefused({ code: 1, err: 'OSError: [Errno 97] Address family not supported by protocol\n' })).toBe(true)
  expect(vsockRefused({ code: 127, err: 'sh: python3: not found\n' })).toBe(false)
  expect(vsockRefused({ code: 0, err: '' })).toBe(false)
})

test('a box with no gateway or no resolver to check is refused', () => {
  expect(() => blockedTargets('nameserver 192.168.65.7\n')).toThrow(/gateway/)
  expect(() => blockedTargets('default via 172.17.0.1 dev eth0\n')).toThrow(/resolver/)
})

test('every API host is pinned to its IPv4 addresses', async () => {
  const lookup = async (host, o) => { expect(o).toEqual({ family: 4 }); return [{ address: `10.0.0.${host.length}` }, { address: '10.9.9.9' }] }
  expect(await pinHosts(['a', 'bb'], lookup)).toEqual([{ host: 'a', ip: '10.0.0.1' }, { host: 'a', ip: '10.9.9.9' }, { host: 'bb', ip: '10.0.0.2' }, { host: 'bb', ip: '10.9.9.9' }])
})

test('a name with no IPv4 address throws', async () => {
  await expect(pinHosts(['a'], async () => [])).rejects.toThrow(/a has no IPv4 address/)
  await expect(pinHosts(['a'], async () => { throw new Error('DNS_ENOTFOUND') })).rejects.toThrow(/a has no IPv4 address/)
})

// a repo that holds a plugin and the folders only the repo may hold: the locks, the prereg, the bench
const prepo = join(tmp, 'plugin-repo')
mkdirSync(prepo)
for (const [f, c] of [['.claude-plugin/plugin.json', '{"name":"hp"}\n'], ['skills/s1/SKILL.md', 'skill\n'], ['bench/box.mjs', 'x\n'], ['progress/lock.md', 'lock\n'], ['docs/prereg.md', 'p\n'],
  ['tests/t.mjs', 't\n'], ['fixtures/f.txt', 'f\n'], ['.evidence/e.txt', 'e\n'], ['README.md', 'r\n']]) { mkdirSync(join(prepo, f, '..'), { recursive: true }); writeFileSync(join(prepo, f), c) }
hostGit(prepo, 'init', '-q'); hostGit(prepo, 'add', '-f', '.'); hostGit(prepo, 'commit', '-qm', 'p')
const pcommit = hostGit(prepo, 'rev-parse', 'HEAD')

test('a plugin export with a repo-only path is refused', () => {
  for (const bad of [['skills', 'bench'], ['progress'], ['docs'], ['tests'], ['fixtures'], ['.evidence'], ['skills/../progress'], ['README.md'], ['.'], []]) {
    const out = join(tmp, `pe-${rand()}`)
    expect(() => pluginExport({ repo: prepo, commit: pcommit, paths: bad, out })).toThrow(/plugin export/)
    expect(() => pluginExport({ dir: prepo, version: '1.0.0', paths: bad, out })).toThrow(/plugin export/)
    expect(existsSync(out)).toBe(false)
  }
  // a component folder that holds a link would carry what it points at
  const linked = join(tmp, `linked-${rand()}`), out = join(tmp, `pe-${rand()}`)
  mkdirSync(join(linked, 'skills'), { recursive: true }); symlinkSync(join(prepo, 'progress'), join(linked, 'skills/progress'))
  expect(() => pluginExport({ dir: linked, version: '1', paths: ['skills'], out })).toThrow(/link/)
  expect(existsSync(out)).toBe(false)
  // an out that was there before the call is never removed, whatever refuses
  const kept = join(tmp, `kept-${rand()}`)
  mkdirSync(kept); writeFileSync(join(kept, 'mine.txt'), 'mine\n')
  for (const paths of [['skills'], ['bench'], []]) {
    expect(() => pluginExport({ repo: prepo, commit: pcommit, paths, out: kept })).toThrow(/plugin export/)
    expect(readFileSync(join(kept, 'mine.txt'), 'utf8')).toBe('mine\n')
  }
})

test('a plugin export is the same files and sha256 from a commit and from a folder', () => {
  const a = join(tmp, `pe-${rand()}`), b = join(tmp, `pe-${rand()}`), paths = ['.claude-plugin', 'skills']
  const fromRepo = pluginExport({ repo: prepo, commit: pcommit, paths, out: a }), fromDir = pluginExport({ dir: prepo, version: '1.0.0', paths, out: b })
  expect(fromRepo.files).toEqual(['.claude-plugin/plugin.json', 'skills/s1/SKILL.md'])
  expect(fromDir).toEqual(fromRepo)
  const sha = (x) => new Bun.CryptoHasher('sha256').update(x).digest('hex')
  expect(fromRepo.sha256).toBe(sha(`${sha('{"name":"hp"}\n')}  644  .claude-plugin/plugin.json\n${sha('skill\n')}  644  skills/s1/SKILL.md\n`))
  // the mode is part of it: the same bytes, executable, are another export
  const x = join(tmp, `px-${rand()}`), c = join(tmp, `pe-${rand()}`)
  mkdirSync(join(x, 'skills/s1'), { recursive: true }); mkdirSync(join(x, '.claude-plugin'))
  writeFileSync(join(x, '.claude-plugin/plugin.json'), '{"name":"hp"}\n'); writeFileSync(join(x, 'skills/s1/SKILL.md'), 'skill\n'); chmodSync(join(x, 'skills/s1/SKILL.md'), 0o755)
  expect(pluginExport({ dir: x, version: '1', paths, out: c }).sha256).not.toBe(fromRepo.sha256)
  rmSync(c, { recursive: true })
  expect(readFileSync(join(a, 'skills/s1/SKILL.md'), 'utf8')).toBe('skill\n')
  expect(existsSync(join(a, 'bench'))).toBe(false)
  for (const d of [a, b]) rmSync(d, { recursive: true })
})

test('a box with no box.env or no proxy settings is refused before any Docker call', async () => {
  const noDocker = { diskFree: async () => { throw new Error('reached Docker') } }
  for (const [s, over, want] of [[setup({ token: false }), { proxy: PROXY }, /box\.env/], [setup(), { proxy: undefined }, /proxy/], [setup(), { proxy: { ...PROXY, auth: 'cookie' } }, /proxy/]]) {
    await expect(enterBox({ data: s.data, task: { name: id, repo: fx }, id, name: 'x', base, ...over }, noDocker)).rejects.toThrow(want)
  }
})

test('a base other than the task\'s is refused', async () => {
  const s = setup()
  await expect(enterBox({ data: s.data, task: { name: id, repo: fx }, id, name: 'x', base: 'f'.repeat(40) })).rejects.toThrow(/base/)
})

// --- the box ---

dtest('a box holds no host path', async () => {
  const { s, box, inBox } = await shared()
  for (const p of [s.data, fx, '/tmp/hstack-bench', join(homedir(), '.claude'), '/var/run/docker.sock']) expect(inBox('test', '-e', p).exitCode).toBe(1)
  expect(text(docker('inspect', '-f', '{{len .Mounts}} {{.HostConfig.CapAdd}} {{.HostConfig.Privileged}} {{.HostConfig.Memory}} {{.HostConfig.RestartPolicy.Name}}', box))).toBe(`0 [] false ${6 * 2 ** 30} no`)
}, 600000)

dtest('the box ends by itself after (RESUMES + 2) turns and 600 s', async () => {
  const { box } = await shared()
  expect(text(docker('inspect', '-f', '{{.Path}} {{index .Args 0}}', box))).toBe(`sleep ${(RESUMES + 2) * 3 + 600}`)
}, 600000)

dtest('the box reaches only the proxy', async () => {
  const { b, inBox, proxy } = await shared(), p = b.box.proxy
  expect(p.name).toBe(proxy)
  for (const ip of [denied, allowed]) expect(docker('run', '--rm', 'alpine:3.22', 'nc', '-zw4', ip, '443').exitCode).toBe(0) // each answers a box with no rules
  expect(inBox('nc', '-zw4', p.ip, '8080').exitCode).toBe(0)
  expect(inBox('nc', '-zw4', allowed, '443').exitCode).not.toBe(0) // the API itself: only through the proxy
  expect(inBox('nc', '-zw4', denied, '443').exitCode).not.toBe(0)
  expect(text(inBox('sh', '-c', 'grep -c anthropic /etc/hosts || true'))).toBe('0') // the box pins no API name
  expect(docker('run', '--rm', 'alpine:3.22', 'nc', '-zw4', p.ip, '8080').exitCode).not.toBe(0) // the proxy answers the box alone
  const before = await b.proxyCounts()
  const post = (body) => inBox('wget', '-qO-', '--header', 'content-type: application/json', '--post-data', body, `http://${p.ip}:8080/v1/messages`)
  expect(text(post('{"model":"m","max_tokens":1,"messages":[]}'))).toBe('Bearer from-env-file') // the token reaches the API, from the proxy
  const tool = post('{"model":"m","max_tokens":1,"messages":[],"tools":[{"type":"web_search_20250305","name":"web_search"}]}')
  expect(tool.exitCode).not.toBe(0)
  expect(tool.stderr.toString()).toContain('403')
  const after = await b.proxyCounts()
  expect([after.allowed - before.allowed, after.refused - before.refused, (after.reasons.tool ?? 0) - (before.reasons.tool ?? 0)]).toEqual([1, 1, 1])
}, 600000)

dtest('the box env holds no token', async () => {
  const { b, box, inBox } = await shared()
  const env = text(inBox('env')), config = text(docker('inspect', '-f', '{{json .Config.Env}}', box))
  expect(env.split('\n')).toContain('ANTHROPIC_AUTH_TOKEN=bench-placeholder')
  expect(env.split('\n')).toContain(`ANTHROPIC_BASE_URL=http://${b.box.proxy.ip}:8080`)
  for (const t of [env, config]) { expect(t).not.toContain('from-env-file'); expect(t).not.toContain('BOX_TEST') }
  const [line] = (await b.turn({ prompt: 'env' })).out.trim().split('\n')
  expect(line).toBe(`1 1 1 1 bench-placeholder http://${b.box.proxy.ip}:8080 `) // a turn gets no box.env either
  expect(JSON.stringify(b.box)).not.toContain('from-env-file')
}, 600000)

dtest('the plugin dirs are copied into the box and reach the CLI as --plugin-dir', async () => {
  const { b, inBox } = await shared()
  const args = (await b.turn({ prompt: 'env', pluginDirs: ['/host/p'] })).out.trim().split('\n')[1]
  expect(args).toContain('--plugin-dir /arm/plugins/hp')
  expect(args).not.toContain('/host/p') // the box's own dirs only
  expect(text(inBox('cat', '/arm/plugins/hp/skills/s1/SKILL.md'))).toBe('skill')
  expect(text(inBox('cat', '/arm/plugins/hp/.claude-plugin/plugin.json'))).toBe('{"name":"hp"}')
}, 600000)

dtest('services are up only when servicesReady exits 0 in the box', async () => {
  const { box } = await shared()
  expect(await servicesUp(box, 'test -d /work')).toBeNull()
  expect(await servicesUp(box, 'exit 3')).toBe('servicesReady exited 3')
  expect(await servicesUp(box, undefined)).toBe('the serve recipe has no servicesReady')
}, 600000)

dtest('root in the box cannot change a rule', async () => {
  const { inBox } = await shared()
  const r = inBox('iptables', '-P', 'OUTPUT', 'ACCEPT')
  expect(r.exitCode).not.toBe(0)
  expect(r.stderr.toString()).toMatch(/denied|not permitted/i)
  expect(inBox('ip', 'link', 'set', 'eth0', 'down').stderr.toString()).toMatch(/not permitted/i)
  const cap = /CapEff:\s*([0-9a-f]+)/.exec(text(inBox('cat', '/proc/1/status')))[1]
  expect((BigInt(`0x${cap}`) >> 12n) & 1n).toBe(0n) // CAP_NET_ADMIN
  expect(inBox('nc', '-zw4', denied, '443').exitCode).not.toBe(0)
}, 600000)

// checked by hand on 2026-11-06: with the rules on and Docker's default NET_RAW, an AF_PACKET frame got a DNS answer from the resolver
dtest('the box keeps exactly the six capabilities of ruling 3, so no NET_RAW for a raw frame', async () => {
  const { inBox } = await shared()
  const cap = /CapEff:\s*([0-9a-f]+)/.exec(text(inBox('cat', '/proc/1/status')))[1]
  expect(BigInt(`0x${cap}`)).toBe(0xebn) // CHOWN 0, DAC_OVERRIDE 1, FOWNER 3, KILL 5, SETGID 6, SETUID 7
}, 600000)

dtest('a firewall that does not hold refuses the run before any turn', async () => {
  const s = setup(), name = `${id}-B-2`
  // the CLI path does not exist: past the check its docker cp would throw another message. The check runs from the real helper
  await expect(enter(s, name, { helper: async () => {}, blocked: denyOnly }, { cli: join(s.data, 'arm/none') })).rejects.toThrow(/must be blocked/)
  expect(seen('container', s.boxName(name))).toBe(false)
  expect(seen('container', s.proxyName(name))).toBe(false)
  expect(seen('image', s.armTag)).toBe(false)
}, 600000)

dtest('a rule step that fails refuses the run', async () => {
  const s = setup(), name = `${id}-B-3`
  await expect(enter(s, name, { helper: ['sh', '-c', 'exit 3'], blocked: denyOnly }, { cli: join(s.data, 'arm/none') })).rejects.toThrow(/firewall.*exit 3/)
  expect(seen('container', s.boxName(name))).toBe(false)
}, 600000)

dtest('a turn gets the box env, in /work, with the box\'s settings', async () => {
  const { b } = await shared()
  const r = await b.turn({ prompt: 'env', model: 'm', settings: '/host/settings.json' })
  expect(r.code).toBe(0)
  const [env, args, cwd] = r.out.trim().split('\n')
  expect(env.startsWith('1 1 1 1 bench-placeholder')).toBe(true)
  expect(args).toContain('--settings /arm/settings.json')
  expect(args).toContain('--model m')
  expect(cwd).toBe('/work')
}, 600000)

dtest('a prompt reaches the CLI as one word', async () => {
  const { b } = await shared()
  const prompt = 'it\'s "two" $HOME `words`\nand a line'
  expect((await b.turn({ prompt })).out).toBe(`${prompt}\n`)
}, 600000)

dtest('a prompt too long for one argument is refused, not sent', async () => {
  const { b } = await shared()
  await expect(b.turn({ prompt: 'x'.repeat(131072) })).rejects.toThrow(/too long/)
}, 600000)

dtest('a turn the kernel killed before the limit is memory, not the arm\'s timeout', async () => {
  const { b } = await shared()
  expect(await b.turn({ prompt: 'die' })).toMatchObject({ code: 'memory' })
}, 600000)

dtest('an exit 137 past the limit is the arm\'s timeout', async () => {
  const { b } = await shared()
  expect(await b.turn({ prompt: 'stubborn' })).toMatchObject({ code: 'timeout' }) // 3 s, then -k 30
}, 600000)

dtest('a session survives between turns', async () => {
  const { b } = await shared()
  expect((await b.turn({ prompt: 'save' })).out).toBe('saved\n')
  expect((await b.turn({ prompt: 'read' })).out).toBe('kept\n')
}, 600000)

dtest('a file the box planted is not followed on the host', async () => {
  const { s, box, inBox } = await shared(), dest = join(tmp, `planted-${rand()}`)
  inBox('ln', '-s', join(s.data, 'machine.json'), '/arm/planted')
  await expect(cpOut(box, '/arm/planted', dest)).rejects.toThrow(/not a plain file/)
  expect(existsSync(dest)).toBe(false)
  inBox('mkdir', '/arm/planted-dir')
  await expect(cpOut(box, '/arm/planted-dir', dest)).rejects.toThrow(/not a plain file/)
  expect(existsSync(dest)).toBe(false)
}, 600000)

dtest('the agent starts on a clean tree', async () => {
  const { b, inBox } = await shared()
  expect(text(inBox('git', '-C', '/work', 'status', '--porcelain'))).toBe('')
  expect(text(inBox('sh', '-c', 'ls -A /work | grep "^.bench" || true'))).toBe('')
  expect(text(inBox('git', '-C', '/work', 'log', '--format=%s'))).toBe(`env\nbase ${base.slice(0, 7)}`)
  expect(text(inBox('git', '-C', '/work', 'rev-parse', 'HEAD'))).toBe(b.envCommit)
  expect(text(inBox('git', '-C', '/work', 'show', '--format=', '--name-only', 'HEAD'))).toBe('made.txt') // what the image build changed
  expect(text(inBox('find', '/work/.git', '-name', '._*'))).toBe('') // no macOS tar sidecars
}, 600000)

// the last of the shared box: the agent's work, a turn over its limit, the product, leave
let product
const fetchProduct = async () => {
  const { b, inBox } = await shared()
  await b.turn({ prompt: 'change' })
  const over = await b.turn({ prompt: 'hang' })
  const left = () => text(inBox('sh', '-c', 'ps -o args | grep -c "^sleep 1000" || true'))
  const survivors = left(), bundle = join(tmp, 'product.bundle')
  expect(await b.product(bundle)).toEqual({ code: 0 })
  const afterProduct = left()
  const repo = join(tmp, 'product.git')
  hostGit(tmp, 'init', '-q', '--bare', repo)
  hostGit(repo, '-c', 'gc.auto=0', 'fetch', '-q', bundle, 'HEAD:refs/heads/p')
  return { over, repo, survivors, afterProduct, files: hostGit(repo, 'ls-tree', '-r', '--name-only', 'p').split('\n') }
}

dtest('a turn over its limit returns, the product comes back, and leave ends what is left', async () => {
  const { box, b, proxy } = await shared()
  const started = Date.now(), { over, files, survivors, afterProduct } = await (product ??= fetchProduct())
  expect(over.code).toBe('timeout')
  expect(Date.now() - started).toBeLessThan(60000) // the limit is 3 s; -k 30 was not needed
  expect(files).toContain('src/late.txt') // written in the turn that was cut
  expect(survivors).not.toBe('0') // the cut turn left it running
  expect(afterProduct).toBe('0') // none of the agent's processes lives through product: it could swap the bundle
  await b.leave()
  expect(seen('container', box)).toBe(false)
  expect(seen('container', proxy)).toBe(false)
}, 600000)

dtest('product gives a bundle of what the agent changed', async () => {
  const { b } = await shared(), { repo, files } = await product
  expect(files).toContain('src/agent.txt')
  expect(hostGit(repo, 'log', '--format=%s', 'p').split('\n').slice(1)).toEqual(['env', `base ${base.slice(0, 7)}`])
  expect(hostGit(repo, 'rev-parse', 'p~1')).toBe(b.envCommit)
}, 600000)

dtest('an ignored build output stays out of the bundle', async () => {
  const { files } = await product
  expect(files.filter((f) => f.startsWith('dist/'))).toEqual([])
  expect(files).toContain('made.txt')
}, 600000)

dtest('past the host\'s limit the box is killed, and a box that died gives killed too', async () => {
  const s = setup(), name = `${id}-B-5`, b = await enter(s, name, { blocked: denyOnly, graceSec: -2 }), box = s.boxName(name)
  try {
    expect(await b.turn({ prompt: 'hang' })).toEqual({ out: '', code: 'killed' })
    expect(running(box)).toBe(false)
    expect(await b.turn({ prompt: 'read' })).toEqual({ out: '', code: 'killed' })
    expect(await b.product(join(tmp, `dead-${rand()}`))).toEqual({ code: 'killed' })
  } finally { await b.leave() }
  expect(seen('container', box)).toBe(false)
}, 600000)

dtest('a box that restarted runs no turn', async () => {
  const s = setup(), name = `${id}-B-6`, b = await enter(s, name, { blocked: denyOnly }), box = s.boxName(name), dest = join(tmp, `restarted-${rand()}`)
  try {
    expect(docker('restart', '-t', '0', box).exitCode).toBe(0) // a new namespace: no rules
    expect(running(box)).toBe(true)
    expect(await b.turn({ prompt: 'mark' })).toEqual({ out: '', code: 'killed' })
    expect(running(box)).toBe(false)
    expect(docker('cp', `${box}:/root/marker`, join(tmp, `marker-${rand()}`)).exitCode).not.toBe(0) // the stub never ran
    expect(docker('start', box).exitCode).toBe(0)
    expect(await b.product(dest)).toEqual({ code: 'killed' })
    expect(running(box)).toBe(false)
    expect(existsSync(dest)).toBe(false)
  } finally { await b.leave() }
}, 600000)

dtest('a proxy that restarted or died kills the run', async () => {
  for (const [n, act] of [[7, ['restart', '-t', '0']], [8, ['kill']]]) {
    const s = setup(), name = `${id}-B-${n}`, b = await enter(s, name, { blocked: denyOnly }), box = s.boxName(name)
    try {
      expect(docker(...act, s.proxyName(name)).exitCode).toBe(0)
      expect(await b.turn({ prompt: 'mark' })).toEqual({ out: '', code: 'killed' })
      expect(running(box)).toBe(false)
      expect(await b.product(join(tmp, `p-${rand()}`))).toEqual({ code: 'killed' })
    } finally { await b.leave() }
    for (const c of [box, s.proxyName(name)]) expect(seen('container', c)).toBe(false)
  }
}, 600000)

dtest('leave removes the box and its images by their recorded names, and only those', async () => {
  const s = setup(), name = `${id}-B-4`
  writeFileSync(join(s.data, 'arm/docker.json'), JSON.stringify({ images: [{ name: 'bench-arm/proxy:1', id: 'sha256:earlier' }], containers: [] })) // an id an earlier proxy.mjs built
  const b = await enter(s, name, { blocked: denyOnly }), box = s.boxName(name)
  const otherImage = `bench-ext/${s.slug}:other`, otherBox = `bench-ext-${s.slug}-other`
  expect(docker('tag', 'alpine:3.22', otherImage).exitCode).toBe(0)
  expect(docker('create', '--name', otherBox, 'alpine:3.22').exitCode).toBe(0)
  bye.push(() => { docker('rm', otherBox); docker('rmi', otherImage) })
  const record = JSON.parse(readFileSync(join(s.data, id, 'docker.json'), 'utf8'))
  expect(record.containers).toEqual([s.proxyName(name), box])
  expect(record.images.map((i) => i.name)).toEqual([s.serveTag, s.armTag])
  expect(record.images.every((i) => i.id)).toBe(true)
  expect(existsSync(join(s.data, id, 'build', `${base.slice(0, 7)}-1.arm.build.log`))).toBe(true)
  expect(existsSync(join(s.data, id, 'build', `${base.slice(0, 7)}-1.serve.build.log`))).toBe(true)
  await b.leave()
  await b.leave() // a caller's finally after a refusal that already left
  for (const [kind, n] of [['container', box], ['container', s.proxyName(name)], ['image', s.serveTag], ['image', s.armTag]]) expect(seen(kind, n)).toBe(false)
  for (const [kind, n] of [['container', otherBox], ['image', otherImage], ['image', 'bench-arm/fw:1'], ['image', 'bench-arm/proxy:1'], ['image', 'alpine:3.22'], ['container', allowedName]]) expect(seen(kind, n)).toBe(true)
  const proxyIds = JSON.parse(readFileSync(join(s.data, 'arm/docker.json'), 'utf8')).images
  expect(proxyIds.map((i) => i.name)).toEqual(['bench-arm/proxy:1', 'bench-arm/proxy:1']) // the earlier id kept, this build's appended once, kept across runs
  expect(proxyIds[0].id).toBe('sha256:earlier')
  expect(proxyIds[1].id).toBe(text(docker('image', 'inspect', '-f', '{{.Id}}', 'bench-arm/proxy:1')))
}, 600000)

// --- the private set: services and the registry ---

dtest('the real-estate box and make container reach only the registry', async () => {
  const s = setup({ re: 'id -u > /tmp/svc' }), name = `${reId}-B-1`
  const b = await enter(s, name, { blocked: denyOnly }, { id: reId }), box = s.boxName(name), inBox = (...a) => docker('exec', box, ...a)
  try {
    expect(inBox('nc', '-zw4', registry, '443').exitCode).toBe(0)
    expect(inBox('nc', '-zw4', 'registry.npmjs.org', '443').exitCode).toBe(0) // by the pinned name, no DNS
    expect(inBox('nc', '-zw4', registry, '80').exitCode).not.toBe(0) // 443 only
    for (const ip of [allowed, denied]) expect(inBox('nc', '-zw4', ip, '443').exitCode).not.toBe(0)
    expect(inBox('nc', '-zw4', b.box.proxy.ip, '8080').exitCode).toBe(0)
    // the make container of a private-set product gets the same way out and no other
    const record = (f) => recordDocker(join(s.data, reId, 'docker.json'), f)
    const scratch = (what, commit, fn) => withExport({ name: 'real-estate', repo: fx }, commit, `${what}-${rand()}`, fn)
    const make = (line, n) => productImage({ t: { slug: 'real-estate', base }, commit: base, baseImage: s.serveTag, network: { ips: [registry], hosts: registryHosts(), blocked: denyOnly },
      lines: [line], repo: fx, osha8: 'abcdef12', n, platform, record, scratch, log: join(tmp, `make-${rand()}.log`), diskFree: async () => 100 })
    expect(await make(`nc -zw4 registry.npmjs.org 443 && ! nc -zw4 ${denied} 443 && ! nc -zw4 ${allowed} 443`, 1)).toBeTruthy()
    expect(await make(`nc -zw4 ${denied} 443`, 2)).toBe(false)
  } finally { await b.leave() }
  for (const n of [box, s.proxyName(name)]) expect(seen('container', n)).toBe(false)
}, 600000)

dtest('services run before the first turn and a failure refuses the box', async () => {
  const s = setup({ re: 'id -u > /tmp/svc' }), name = `${reId}-B-2`, b = await enter(s, name, { blocked: denyOnly }, { id: reId })
  try {
    expect((await b.turn({ prompt: 'svc' })).out).toBe('0\n') // ran, as root, before the turn
    expect(b.box.services).toBe('ok')
  } finally { await b.leave() }
  const f = setup({ re: 'echo starting; exit 4' }), fname = `${reId}-B-3`
  await expect(enter(f, fname, { blocked: denyOnly }, { id: reId })).rejects.toThrow(/services.*exit 4/)
  for (const n of [f.boxName(fname), f.proxyName(fname)]) expect(seen('container', n)).toBe(false)
  // an external task runs none
  const { b: ext } = await shared()
  expect(ext.box.services).toBeNull()
}, 600000)

// --- the proof ---

const prove = async (s, task = id) => {
  const lines = [], before = process.env.HSTACK_BENCH_MACHINE
  process.env.HSTACK_BENCH_MACHINE = join(s.data, 'machine.json')
  try {
    const code = await main(['proof', task], { data: s.data, hosts: hosts(), registryHosts: registryHosts(), upstream: UPSTREAM, blocked: [...denyOnly, { host: denied, port: 444 }], diskFree: async () => 100 }, (l) => lines.push(l)) // 444 refuses: an answer
    return { code, lines, record: existsSync(join(s.data, 'arm', `proof-${task}.json`)) ? JSON.parse(readFileSync(join(s.data, 'arm', `proof-${task}.json`), 'utf8')) : null }
  } finally {
    if (before === undefined) delete process.env.HSTACK_BENCH_MACHINE
    else process.env.HSTACK_BENCH_MACHINE = before
  }
}
const ROWS = ['host paths absent', 'no mount, no socket, only the six capabilities', 'no bench or database env', 'no token in the box env', 'blocked targets', 'the API is reached only through the proxy',
  'the proxy refuses a server tool', 'the proxy answers only the box', 'no IPv6 route out', 'the API answers', 'init lists no web tool', 'root cannot undo it', 'no vsock', 'a real database is out of reach']
const arms = (s, smallModel, o = {}) => writeFileSync(join(s.data, 'arms.json'), JSON.stringify({ model: 'm', smallModel, cli: 'arm/claude', turnTimeoutSec: 5, proxy: PROXY, ...o }))

test('proof with no box.env is refused before any Docker call', async () => {
  const s = setup({ token: false })
  arms(s, 's')
  const errors = [], err = console.error
  console.error = (m) => errors.push(m)
  try { expect((await prove(s)).code).toBe(2) } finally { console.error = err }
  expect(errors.join('\n')).toContain('box.env')
})

dtest('proof passes every row of a box that holds, and a web tool at init fails it', async () => {
  const s = setup()
  arms(s, 's')
  const ok = await prove(s)
  expect(ok.lines).toEqual(ROWS.map((r) => `${r} ok`))
  expect(ok.code).toBe(0)
  expect(ok.record.rows.map((r) => r.row)).toEqual(ROWS)
  expect(JSON.stringify(ok.record)).not.toContain('5432')
  arms(s, 'webby')
  const { code, lines, record } = await prove(s)
  expect(lines).toContain('the API answers ok')
  expect(lines).toContain('init lists no web tool FAILED')
  expect(code).toBe(1)
  expect(record.rows.find((r) => r.row === 'init lists no web tool').detail).toContain('webby')
  for (const r of [ok.record, record]) expect(JSON.stringify(r)).not.toContain('from-env-file')
  expect(seen('container', s.boxName(`${id}-proof`))).toBe(false)
  expect(seen('container', s.proxyName(`${id}-proof`))).toBe(false)
}, 600000)

dtest('proof of a real-estate box adds the services and the registry rows', async () => {
  const s = setup({ re: 'touch /tmp/svc-up', ready: 'test -f /tmp/svc-up' })
  arms(s, 's', { turnTimeoutSec: { external: 5, re: 7 } })
  const { code, lines, record } = await prove(s, reId)
  expect(lines).toEqual([...ROWS, 'services are up', 'only the registry answers'].map((r) => `${r} ok`))
  expect(code).toBe(0)
  expect(record.task).toBe(reId)
  // no servicesReady: the row cannot say the services are up
  const n = setup({ re: 'true' })
  arms(n, 's')
  const none = await prove(n, reId)
  expect(none.lines).toContain('services are up FAILED')
  expect(none.record.rows.find((r) => r.row === 'services are up').detail).toBe('the serve recipe has no servicesReady')
  expect(none.code).toBe(1)
  expect(seen('container', s.boxName(`${reId}-proof`))).toBe(false)
}, 600000)

test('proof exits non-zero when any row is not ok', () => {
  expect(proofCode([{ result: 'ok' }, { result: 'ok' }])).toBe(0)
  expect(proofCode([{ result: 'ok' }, { result: 'not run' }])).toBe(1)
  expect(proofCode([{ result: 'ok' }, { result: 'FAILED' }])).toBe(1)
})

test('proof takes one task', async () => {
  const errors = [], err = console.error
  console.error = (m) => errors.push(m)
  try { expect(await main(['proof'], {}, () => {})).toBe(2) } finally { console.error = err }
  expect(errors[0]).toContain('usage')
})
