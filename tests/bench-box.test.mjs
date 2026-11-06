import { test, expect, afterAll } from 'bun:test'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { ARM_LAYER, blockedTargets, cpOut, enterBox, freshRepo, main, pinHosts } from '../bench/box.mjs'
import { withExport } from '../bench/env.mjs'
import { API_HOSTS, RESUMES } from '../bench/lib/arm.mjs'
import { releaseRoot } from './bench-root.mjs'

// A fixture repo and data folder stand in for a task; a sh stub stands in for the CLI, and two alpine containers on the
// default bridge stand in for an allowed and a denied address, so nothing here needs the internet once the fixture image is
// cached. Tests that use Docker need BENCH_EXT_DOCKER=1. Everything a box made goes by its own leave; the stand-ins and the
// names of the 'only those' test are removed here by name. bench-arm/fw:1 stays: step 8's lock removes it (ruling 13).
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
  env) echo "$IS_SANDBOX $CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC $DISABLE_TELEMETRY $DISABLE_AUTOUPDATER $BOX_TEST"; echo "$*"; pwd ;;
  change) echo agent > src/agent.txt; echo more > dist/agent.bin ;;
  hang) echo late > src/late.txt; setsid sleep 1000 & sleep 1000 ;;
  'Reply OK.')
    case "$*" in *webby*) t='"WebSearch"' ;; *) t='"Bash"' ;; esac
    echo "{\\"type\\":\\"system\\",\\"subtype\\":\\"init\\",\\"tools\\":[$t],\\"plugins\\":[],\\"slash_commands\\":[]}"
    echo '{"type":"result","is_error":false,"result":"OK"}' ;;
  *) echo "$2" ;;
esac
`
const SAMPLE_HEAD = 'task\tstack\ttier\trank\tid\turl\tpr\tissue\tbase\tend\tmethod\tf2p\tedit_history\tplatform\tcold_setup'
const id = 's1-01'
const made = [] // what `setup` made
function setup({ token = true } = {}) {
  const owner = `fx${rand()}`, data = join(tmp, owner), ext = join(data, 'ext'), key = `${owner}__app`, slug = `${key}__1`
  for (const d of [join(ext, 'tasks', slug), join(ext, 'serve', key), join(data, 'arm'), join(data, 'env')]) mkdirSync(d, { recursive: true })
  writeFileSync(join(data, 'machine.json'), JSON.stringify({ forbid: { paths: [] } }))
  writeFileSync(join(ext, 'sample.tsv'), [SAMPLE_HEAD, `${id}\ts1\t1\t1\t${owner}/app#1\tu\t1\t11\t${base}\t${base}\tsingle\t1\tnone\t${platform}\tyes`, ''].join('\n'))
  writeFileSync(join(ext, 'tasks', slug, 'task-recipe.json'), JSON.stringify(recipe))
  writeFileSync(join(ext, 'serve', key, 'serve.json'), JSON.stringify({ layer: [], start: '', ready: 'true', notes: '', briefSha: null }))
  writeFileSync(join(data, 'arm/claude'), stub)
  chmodSync(join(data, 'arm/claude'), 0o755)
  if (token) writeFileSync(join(data, 'arm/box.env'), 'BOX_TEST=from-env-file\n')
  writeFileSync(join(data, 'env', `${id}.json`), JSON.stringify({ name: id, repo: fx, db: null, port: 49152, start: null, ready: null, setup: [], teardown: [], oracle: 'true', junit: 'j.xml' }))
  const s = { data, slug, armTag: `bench-ext/${slug}:${base.slice(0, 7)}-arm`, serveTag: `bench-ext/${slug}:${base.slice(0, 7)}-serve`, boxName: (n) => `bench-ext-${slug}-arm-${n}` }
  made.push(s)
  return s
}
const bye = []
const seen = (kind, name) => docker(kind, 'inspect', name).exitCode === 0
const running = (name) => text(docker('inspect', '-f', '{{.State.Running}}', name)) === 'true'

// two listeners on the default bridge
const allowedName = `bench-box-test-${rand()}-allowed`, deniedName = `bench-box-test-${rand()}-denied`
const standIns = DOCKER ? [allowedName, deniedName] : []
for (const n of standIns) docker('run', '-d', '--rm', '--name', n, 'alpine:3.22', 'nc', '-lk', '-p', '443', '-e', '/bin/cat')
const addr = (n) => text(docker('inspect', '-f', '{{.NetworkSettings.Networks.bridge.IPAddress}}', n))
const allowed = DOCKER ? addr(allowedName) : null, denied = DOCKER ? addr(deniedName) : null
const hosts = () => API_HOSTS.map((host) => ({ host, ip: allowed }))
const denyOnly = [{ host: denied, port: 443 }]

afterAll(async () => {
  await first?.then((f) => f.b.leave(), () => {}) // gone already unless a test failed before its leave
  for (const f of bye) f()
  for (const n of standIns) docker('kill', n) // --rm takes it away
  rmSync(tmp, { recursive: true, force: true })
  dropRoot()
}, 120000)

// a fresh repo as run-arm makes it, handed to enterBox while the export exists
async function enter(s, name, inj = {}, over = {}) {
  const task = { name: id, repo: fx }
  return withExport(task, base, `${name}-${rand()}`, async (dir) => {
    await freshRepo(dir, base)
    return enterBox({ data: s.data, task, id, name, base, repoGit: join(dir, '.git'), cli: join(s.data, 'arm/claude'), turnTimeoutSec: 3, ...over },
      { hosts: hosts(), diskFree: async () => 100, ...inj })
  })
}

// the one box most tests share: built once, its firewall checked against the whole list of ruling 3, left at the end
let first
const shared = () => (first ??= (async () => {
  const s = setup(), name = `${id}-B-1`, b = await enter(s, name)
  return { s, b, box: s.boxName(name), inBox: (...a) => docker('exec', s.boxName(name), ...a) }
})())

// --- no Docker ---

test('the arm layer takes the bench files and any .git out of /work and installs git when the image has none', () => {
  const lines = ARM_LAYER.join('\n')
  for (const f of ['.bench.Dockerfile', '.bench.Dockerfile.dockerignore', '.bench-test.sh', '.git']) expect(lines).toContain(`/work/${f}`)
  expect(lines).toContain('command -v git')
})

test('the blocked targets are the five of ruling 3, gateway and resolver from the box', () => {
  expect(blockedTargets('default via 172.17.0.1 dev eth0\n172.17.0.0/16 dev eth0\n# x\nnameserver 192.168.65.7\n')).toEqual([{ host: '1.1.1.1', port: 443 }, { host: 'github.com', port: 443 },
    { host: 'host.docker.internal', port: 5432 }, { host: '172.17.0.1', port: 5432 }, { host: '192.168.65.7', port: 53 }])
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

test('a plugin dir is refused before anything runs', async () => {
  await expect(enterBox({ pluginDirs: ['/p'] })).rejects.toThrow(/plugin/)
})

test('a base other than the task\'s is refused', async () => {
  const s = setup()
  await expect(enterBox({ data: s.data, task: { name: id, repo: fx }, id, name: 'x', base: 'f'.repeat(40) })).rejects.toThrow(/base/)
})

// --- the box ---

dtest('a box holds no host path', async () => {
  const { s, box, inBox } = await shared()
  for (const p of [s.data, fx, '/tmp/hstack-bench', join(homedir(), '.claude'), '/var/run/docker.sock']) expect(inBox('test', '-e', p).exitCode).toBe(1)
  expect(text(docker('inspect', '-f', '{{len .Mounts}} {{.HostConfig.CapAdd}} {{.HostConfig.Privileged}} {{.HostConfig.Memory}}', box))).toBe(`0 [] false ${6 * 2 ** 30}`)
}, 600000)

dtest('the box ends by itself after (RESUMES + 2) turns and 600 s', async () => {
  const { box } = await shared()
  expect(text(docker('inspect', '-f', '{{.Path}} {{index .Args 0}}', box))).toBe(`sleep ${(RESUMES + 2) * 3 + 600}`)
}, 600000)

dtest('the allowed address answers and the denied one does not', async () => {
  const { inBox } = await shared()
  expect(docker('run', '--rm', 'alpine:3.22', 'nc', '-zw4', denied, '443').exitCode).toBe(0) // it does answer a box with no rules
  expect(inBox('nc', '-zw4', allowed, '443').exitCode).toBe(0)
  expect(inBox('nc', '-zw4', denied, '443').exitCode).not.toBe(0)
  expect(inBox('nc', '-zw4', 'api.anthropic.com', '443').exitCode).toBe(0) // by the pinned name, no DNS
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
dtest('root in the box cannot send a raw frame past the rules', async () => {
  const { box, inBox } = await shared()
  const cap = /CapEff:\s*([0-9a-f]+)/.exec(text(inBox('cat', '/proc/1/status')))[1]
  expect((BigInt(`0x${cap}`) >> 13n) & 1n).toBe(0n) // CAP_NET_RAW, which AF_PACKET needs
  expect(text(docker('inspect', '-f', '{{.HostConfig.CapDrop}}', box))).toBe('[CAP_NET_RAW]')
}, 600000)

dtest('a firewall that does not hold refuses the run before any turn', async () => {
  const s = setup(), name = `${id}-B-2`
  // the CLI path does not exist: past the check its docker cp would throw another message. The check runs from the real helper
  await expect(enter(s, name, { helper: async () => {}, blocked: denyOnly }, { cli: join(s.data, 'arm/none') })).rejects.toThrow(/must be blocked/)
  expect(seen('container', s.boxName(name))).toBe(false)
  expect(seen('image', s.armTag)).toBe(false)
}, 600000)

dtest('a rule step that fails refuses the run', async () => {
  const s = setup(), name = `${id}-B-3`
  await expect(enter(s, name, { helper: ['sh', '-c', 'exit 3'], blocked: denyOnly }, { cli: join(s.data, 'arm/none') })).rejects.toThrow(/firewall.*exit 3/)
  expect(seen('container', s.boxName(name))).toBe(false)
}, 600000)

dtest('a turn gets the box env and the env file, in /work, with the box\'s settings', async () => {
  const { b } = await shared()
  const r = await b.turn({ prompt: 'env', model: 'm', settings: '/host/settings.json' })
  expect(r.code).toBe(0)
  const [env, args, cwd] = r.out.trim().split('\n')
  expect(env).toBe('1 1 1 1 from-env-file')
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

dtest('a turn with a plugin dir is refused', async () => {
  const { b } = await shared()
  await expect(b.turn({ prompt: 'read', pluginDirs: ['/p'] })).rejects.toThrow(/plugin/)
}, 600000)

dtest('a missing box.env throws before any Docker call', async () => {
  const { s, b } = await shared(), f = join(s.data, 'arm/box.env'), keep = readFileSync(f)
  rmSync(f)
  await expect(b.turn({ prompt: 'read' })).rejects.toThrow(/box\.env/)
  writeFileSync(f, keep)
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
  const { b } = await shared()
  await b.turn({ prompt: 'change' })
  const over = await b.turn({ prompt: 'hang' })
  const bundle = join(tmp, 'product.bundle')
  await b.product(bundle)
  const repo = join(tmp, 'product.git')
  hostGit(tmp, 'init', '-q', '--bare', repo)
  hostGit(repo, '-c', 'gc.auto=0', 'fetch', '-q', bundle, 'HEAD:refs/heads/p')
  return { over, repo, files: hostGit(repo, 'ls-tree', '-r', '--name-only', 'p').split('\n') }
}

dtest('a turn over its limit returns, the product comes back, and leave ends what is left', async () => {
  const { box, inBox, b } = await shared()
  const started = Date.now(), { over, files } = await (product ??= fetchProduct())
  expect(over.code).toBe('timeout')
  expect(Date.now() - started).toBeLessThan(60000) // the limit is 3 s; -k 30 was not needed
  expect(files).toContain('src/late.txt') // written in the turn that was cut
  expect(text(inBox('sh', '-c', 'ps -o args | grep -c "^sleep 1000" || true'))).not.toBe('0') // left running by the cut turn
  await b.leave()
  expect(seen('container', box)).toBe(false)
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
    await expect(b.product(join(tmp, `dead-${rand()}`))).rejects.toThrow(/in the box/)
  } finally { await b.leave() }
  expect(seen('container', box)).toBe(false)
}, 600000)

dtest('leave removes the box and its images by their recorded names, and only those', async () => {
  const s = setup(), name = `${id}-B-4`, b = await enter(s, name, { blocked: denyOnly }), box = s.boxName(name)
  const otherImage = `bench-ext/${s.slug}:other`, otherBox = `bench-ext-${s.slug}-other`
  expect(docker('tag', 'alpine:3.22', otherImage).exitCode).toBe(0)
  expect(docker('create', '--name', otherBox, 'alpine:3.22').exitCode).toBe(0)
  bye.push(() => { docker('rm', otherBox); docker('rmi', otherImage) })
  const record = JSON.parse(readFileSync(join(s.data, id, 'docker.json'), 'utf8'))
  expect(record.containers).toEqual([box])
  expect(record.images.map((i) => i.name)).toEqual([s.serveTag, s.armTag])
  expect(record.images.every((i) => i.id)).toBe(true)
  expect(existsSync(join(s.data, id, 'build', `${base.slice(0, 7)}-1.arm.build.log`))).toBe(true)
  expect(existsSync(join(s.data, id, 'build', `${base.slice(0, 7)}-1.serve.build.log`))).toBe(true)
  await b.leave()
  await b.leave() // a caller's finally after a refusal that already left
  for (const [kind, n] of [['container', box], ['image', s.serveTag], ['image', s.armTag]]) expect(seen(kind, n)).toBe(false)
  for (const [kind, n] of [['container', otherBox], ['image', otherImage], ['image', 'bench-arm/fw:1'], ['image', 'alpine:3.22'], ['container', allowedName]]) expect(seen(kind, n)).toBe(true)
}, 600000)

// --- the proof ---

const prove = async (s) => {
  const lines = [], before = process.env.HSTACK_BENCH_MACHINE
  process.env.HSTACK_BENCH_MACHINE = join(s.data, 'machine.json')
  try {
    const code = await main(['proof', id], { data: s.data, hosts: hosts(), blocked: [...denyOnly, { host: denied, port: 444 }], diskFree: async () => 100 }, (l) => lines.push(l)) // 444 refuses: an answer
    return { code, lines, record: JSON.parse(readFileSync(join(s.data, 'arm', `proof-${id}.json`), 'utf8')) }
  } finally {
    if (before === undefined) delete process.env.HSTACK_BENCH_MACHINE
    else process.env.HSTACK_BENCH_MACHINE = before
  }
}
const ROWS = ['host paths absent', 'no mount, capability or socket', 'no bench or database env', 'blocked targets', 'no IPv6 route out', 'the API answers', 'init lists no web tool', 'root cannot undo it', 'a real database is out of reach']
const arms = (s, smallModel) => writeFileSync(join(s.data, 'arms.json'), JSON.stringify({ model: 'm', smallModel, cli: 'arm/claude', turnTimeoutSec: 5 }))

dtest('proof with no token skips the real-turn rows and passes on the rest', async () => {
  const s = setup({ token: false })
  arms(s, 's')
  const { code, lines, record } = await prove(s)
  expect(lines).toEqual(ROWS.map((r) => (r === 'the API answers' || r === 'init lists no web tool' ? `${r} skipped: no box.env` : `${r} ok`)))
  expect(code).toBe(0)
  expect(record.rows.map((r) => r.row)).toEqual(ROWS)
  expect(seen('container', s.boxName(`${id}-proof`))).toBe(false)
}, 600000)

dtest('proof with a token runs both models and a web tool at init fails it', async () => {
  const s = setup()
  arms(s, 'webby')
  const { code, lines, record } = await prove(s)
  expect(lines).toContain('the API answers ok')
  expect(lines).toContain('init lists no web tool FAILED')
  expect(code).toBe(1)
  expect(record.rows.find((r) => r.row === 'init lists no web tool').detail).toContain('webby')
  expect(JSON.stringify(record)).not.toContain('from-env-file')
  expect(seen('container', s.boxName(`${id}-proof`))).toBe(false)
}, 600000)

test('proof takes one task', async () => {
  const errors = [], err = console.error
  console.error = (m) => errors.push(m)
  try { expect(await main(['proof'], {}, () => {})).toBe(2) } finally { console.error = err }
  expect(errors[0]).toContain('usage')
})
