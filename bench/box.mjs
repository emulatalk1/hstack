#!/usr/bin/env bun
// The arm box, the only place an arm agent runs (rulings 2, 3, 5, 6, 13 of step 8): the task's serve image plus the arm layer,
// nothing mounted, six capabilities kept and none of them over the network, the firewall set from outside and checked from outside before the CLI goes in. Any failure
// on the way in removes what was made and throws: a run with no box does not happen. `proof` prints the boundary's table.
import { existsSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { git, ROOT, withExport } from './env.mjs'
import { daemon, dataOf, diskFloor, dockerDiskFree, imageBuilder, must, recordDocker, removeRecorded, serveRecipe, sp, taskOf, word } from './ext.mjs'
import { claudeArgs, finalText } from './lib/agent.mjs'
import { API_HOSTS, boxArgs, CAP_DROPS, fwScript, initInfo, KEPT_CAP_MASK, netOk, netScript, RESUMES, WEB_OFF } from './lib/arm.mjs'
import { runGroup } from './lib/proc.mjs'
import { loadTask } from './lib/task.mjs'

const USAGE = 'usage: bun bench/box.mjs proof <task>'
const FW = 'bench-arm/fw:1', MEMORY_GB = 6, CLI = '/arm/claude', SETTINGS = '/arm/settings.json'
// never from a registry: the helper gets NET_ADMIN, and a tag missing here must fall through to the local build
export const FW_RUN = ['docker', 'run', '--rm', '--pull', 'never']
const ENV = ['IS_SANDBOX=1', 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1', 'DISABLE_TELEMETRY=1', 'DISABLE_AUTOUPDATER=1']
const MAX_ARG = 131072 // Linux MAX_ARG_STRLEN: a turn's script is one argument of sh -c
const NO_PLUGINS = 'the box takes no plugin dir yet: that is the plan of step 11'
// the product repo is the agent's: none of its hooks or fsmonitor runs
const SAFE = ['-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false']
const BENCH = [...SAFE, '-c', 'user.name=bench', '-c', 'user.email=bench@localhost', '-c', 'commit.gpgsign=false']
const GIT = ['git', '-C', '/work', ...BENCH]
const SKIP = 'skipped: no box.env'

// ruling 2's layer. Appended FROM the serve image; a git archive has no .git, but a recipe's own step may have made one
export const ARM_LAYER = ['RUN rm -rf /work/.git /work/.bench.Dockerfile /work/.bench.Dockerfile.dockerignore /work/.bench-test.sh',
  'RUN command -v git >/dev/null || (apt-get update && apt-get install -y --no-install-recommends git)']

// `ip -4 route` and resolv.conf, as the box sees them, to the targets of ruling 3. port: a throwaway listener on the host, so no
// check ever connects to a real service there. outside: the public targets, which a test on a bridge replaces
export function blockedTargets(text, port, outside = [{ host: '1.1.1.1', port: 443 }, { host: 'github.com', port: 443 }]) {
  const gateway = /^default via (\S+)/m.exec(text)?.[1], resolvers = [...text.matchAll(/^nameserver\s+(\S+)/gm)].map((m) => m[1])
  if (!gateway) throw new Error('no gateway in the box to check')
  if (!resolvers.length) throw new Error('no resolver in the box to check')
  return [...outside, { host: 'host.docker.internal', port }, { host: gateway, port }, ...resolvers.map((host) => ({ host, port: 53 }))]
}

// fn(port) with something listening on the host on an ephemeral port, closed in every outcome
export async function withListener(fn) {
  const listener = Bun.listen({ hostname: '127.0.0.1', port: 0, socket: { open(s) { s.end() }, data() {} } })
  try { return await fn(listener.port) } finally { listener.stop(true) }
}

// the kernel's own answer: a tool that is not there fails too, and proves nothing
export const rootRefused = (r) => r.code !== 0 && /not permitted|denied/i.test(r.err)
export const vsockRefused = (r) => r.code !== 0 && /(Permission|OS)Error/.test(r.err)

// fwScript takes IPv4 only, so a name that has none cannot be allowed
export async function pinHosts(names, lookup = (h, o) => Bun.dns.lookup(h, o)) {
  const pinned = await Promise.all(names.map(async (host) => {
    const found = await lookup(host, { family: 4 }).catch(() => [])
    if (!found.length) throw new Error(`${host} has no IPv4 address`)
    return found.map((a) => ({ host, ip: a.address }))
  }))
  return pinned.flat()
}

// the fresh repo of an export, as the agent sees it: every exported file is tracked in the task repo, ignored or not
export async function freshRepo(dir, base) {
  await git(dir, 'init', '-q')
  await git(dir, ...SAFE, 'add', '-A', '-f')
  await git(dir, ...BENCH, 'commit', '-q', '--no-verify', '--allow-empty', '-m', `base ${base.slice(0, 7)}`)
}

// docker cp keeps a symlink as a link: what the box planted must never be followed on the host
export async function cpOut(box, from, to) {
  await must(['docker', 'cp', `${box}:${from}`, to], `docker cp out of ${box}`, { quiet: true })
  if (lstatSync(to).isFile()) return
  rmSync(to, { recursive: true, force: true })
  throw new Error(`${from} in ${box} is not a plain file`)
}

// root with the box's capabilities in the box's network namespace, from an image that has the tools whatever the box's has
const twin = (box, argv) => sp([...FW_RUN, ...CAP_DROPS, '--network', `container:${box}`, FW, ...argv])
const helper = (box, script, what, flags = []) => must([...FW_RUN, ...flags, '--network', `container:${box}`, FW, 'sh', '-c', script], what, { timeoutSec: 600 })
export const rulesCommand = (box, script) => [...FW_RUN, '--cap-add', 'NET_ADMIN', '--network', `container:${box}`, FW, 'sh', '-c', script]

async function fwImage(scratch) {
  if ((await sp([...FW_RUN, '--network', 'none', FW, 'python3', '-V'])).code === 0) return // an older tag has no python3
  await scratch('fw', null, async (dir) => {
    writeFileSync(join(dir, 'Dockerfile'), 'FROM alpine:3.22\nRUN apk add --no-cache iptables python3\n')
    await must(['docker', 'build', '--progress=plain', '-t', FW, dir], `the build of ${FW}`, { timeoutSec: 600 })
  })
}

// data, task (its file: .repo), id (the task's name), name (the run's), base, repoGit (host path of the fresh .git), cli (host
// path), turnTimeoutSec. inj: hosts [{ host, ip }], helper (a function of the rules script or an argv: replaces only the step
// that sets the rules), cli, blocked [{ host, port }] (replaces ruling 3's public targets: a test on a bridge has no internet to
// answer them), graceSec (the host's limit past turnTimeoutSec, 120)
export async function enterBox({ data, task, id, name, base, repoGit, cli, turnTimeoutSec, pluginDirs = [] }, inj = {}) {
  if (pluginDirs.length) throw new Error(NO_PLUGINS)
  const ext = join(data, 'ext'), t = taskOf(ext, id)
  if (base !== t.base) throw new Error(`the box of ${id} is at its base ${t.base}, not ${base}`) // so its build logs hold base files only
  const { recipe, serveDockerfile } = serveRecipe(ext, t)
  const sha7 = base.slice(0, 7), box = `bench-ext-${t.slug}-arm-${name}`
  const serveTag = `bench-ext/${t.slug}:${sha7}-serve`, armTag = `bench-ext/${t.slug}:${sha7}-arm`
  const envFile = join(data, 'arm/box.env'), build = join(data, id, 'build')
  mkdirSync(build, { recursive: true })
  const record = (f) => recordDocker(join(data, id, 'docker.json'), f)
  const leave = () => removeRecorded(data, id, t.slug)
  let seq = 0, turns = 0
  const scratch = (what, commit, fn) => withExport({ name: t.key, repo: task.repo }, commit, `${what}-${t.slug}-${process.pid}-${seq++}`, fn)
  const inBox = (argv, what) => must(['docker', 'exec', '-w', '/work', box, ...argv], what, { timeoutSec: 600, quiet: true })
  const cpIn = (from, to) => must(['docker', 'cp', from, `${box}:${to}`], `docker cp into ${box}`, { quiet: true })
  const commit = async (msg) => {
    await inBox([...GIT, 'add', '-A'], 'git add in the box') // never -f: ignored build outputs stay out
    await inBox([...GIT, 'commit', '-q', '--no-verify', '--allow-empty', '-m', msg], 'git commit in the box')
  }

  try {
    const low = await diskFloor(id, inj)
    if (low) throw new Error(low)
    await fwImage(scratch)
    const image = imageBuilder({ record, scratch, recipe, diskFree: inj.diskFree ?? dockerDiskFree })
    // n as oracle-run counts it, which records the same serve tag, so no log is overwritten
    const n = record(() => {}).images.filter((i) => i.name === serveTag).length + 1
    await image(serveTag, serveDockerfile, base, join(build, `${sha7}-${n}.serve.build.log`))
    const imageId = await image(armTag, `FROM ${serveTag}\n${ARM_LAYER.join('\n')}\n`, null, join(build, `${sha7}-${n}.arm.build.log`))

    const hosts = inj.hosts ?? await pinHosts(API_HOSTS), ips = [...new Set(hosts.map((h) => h.ip))]
    record((d) => d.containers.push(box))
    await must(['docker', ...boxArgs({ name: box, image: armTag, platform: recipe.platform, hosts, limitSec: (RESUMES + 2) * turnTimeoutSec + 600, memoryGB: MEMORY_GB })], `docker create ${box}`)
    await must(['docker', 'start', box], `docker start ${box}`)

    // a restart gives the box a new namespace with no rules: alive() fails, and nothing runs in it
    const startedAt = (await must(['docker', 'inspect', '-f', '{{.State.StartedAt}}', box], `docker inspect ${box}`)).trim()
    const alive = async () => (await sp(['docker', 'inspect', '-f', '{{.State.StartedAt}} {{.State.Running}}', box])).out.trim() === `${startedAt} true`
    const killed = async () => {
      await sp(['docker', 'kill', box]) // this run created it
      await daemon() // a dead daemon is the machine's failure and throws
      return { out: '', code: 'killed' }
    }
    const rules = fwScript(ips)
    await (typeof inj.helper === 'function' ? inj.helper(rules) : must(inj.helper ?? rulesCommand(box, rules), 'the firewall rules', { timeoutSec: 600 }))
    // always the real helper: a rule step that did nothing must fail here
    const routes = await helper(box, 'ip -4 route; cat /etc/resolv.conf', 'the box\'s routes')
    await withListener(async (port) => {
      const blocked = blockedTargets(routes, port, inj.blocked)
      const why = netOk(await helper(box, netScript(ips, blocked), 'the network check'), ips, blocked)
      if (why) throw new Error(`the firewall does not hold, run refused: ${why}`)
    })

    await inBox(['mkdir', '-p', '/arm'], 'mkdir in the box')
    await cpIn(inj.cli ?? cli, CLI)
    await scratch('in', null, async (dir) => {
      const settings = join(dir, 'settings.json'), tar = join(dir, 'git.tar')
      writeFileSync(settings, '{}\n')
      await cpIn(settings, SETTINGS)
      // COPYFILE_DISABLE: macOS tar would add ._* sidecars
      await must(['env', 'COPYFILE_DISABLE=1', 'tar', '-C', dirname(repoGit), '-cf', tar, basename(repoGit)], 'tar of the fresh .git')
      await cpIn(tar, '/arm/git.tar')
    })
    await inBox(['tar', '-xf', '/arm/git.tar', '-C', '/work'], 'tar in the box')
    await inBox(['rm', '/arm/git.tar'], 'rm in the box')
    await inBox(['git', 'config', '--global', '--add', 'safe.directory', '/work'], 'git config in the box')
    await commit('env')
    const envCommit = (await inBox([...GIT, 'rev-parse', 'HEAD'], 'git rev-parse in the box')).trim()

    const turn = async (opts) => {
      if (opts.pluginDirs?.length) throw new Error(NO_PLUGINS)
      if (!existsSync(envFile)) throw new Error(`${envFile} is missing`)
      if (!(await alive())) return killed()
      const file = `/arm/turn-${turns++}`
      const line = ['timeout', '-k', '30', String(turnTimeoutSec), CLI, ...claudeArgs({ ...opts, settings: SETTINGS })].map(word).join(' ')
      const script = `${line} >${file}.out 2>${file}.err </dev/null` // in files: a background server cannot hold a pipe
      if (Buffer.byteLength(script) >= MAX_ARG) throw new Error(`a turn of ${Buffer.byteLength(script)} bytes is too long for one argument`)
      const started = Date.now()
      const { code } = await runGroup(['docker', 'exec', '-w', '/work', '--env-file', envFile, ...ENV.flatMap((e) => ['-e', e]), box, 'sh', '-c', script],
        { timeoutSec: turnTimeoutSec + (inj.graceSec ?? 120), stdout: 'ignore', stderr: 'ignore' })
      const ran = Date.now() - started
      if (code === 'timeout' || !(await alive())) return killed()
      const out = await scratch('out', null, async (dir) => {
        await cpOut(box, `${file}.out`, join(dir, 'turn.out'))
        return readFileSync(join(dir, 'turn.out'), 'utf8')
      })
      // 137 before the limit is not timeout's kill: the kernel took the CLI for memory
      return { out, code: code === 124 || (code === 137 && ran >= turnTimeoutSec * 1000) ? 'timeout' : code === 137 ? 'memory' : code }
    }

    const product = async (destFile) => {
      if (!(await alive())) return { code: (await killed()).code }
      // ends what the agent left running (it spares PID 1 and this sh, and fails when there is nothing else), so no process swaps the bundle or moves HEAD
      // meanwhile; repo-level config the agent wrote still applies to the git calls below, so product-supplied code can run in the box (not on the host: it only fetches objects)
      await inBox(['sh', '-c', 'kill -9 -1; true'], 'kill in the box')
      await inBox(['rm', '-f', '/work/.git/index.lock'], 'rm in the box') // a turn cut in a git command leaves it
      await commit(name)
      await inBox([...GIT, 'bundle', 'create', '/arm/product.bundle', 'HEAD'], 'git bundle in the box')
      await cpOut(box, '/arm/product.bundle', destFile)
      return { code: 0 }
    }

    return { envCommit, turn, product, leave, box: { name: box, image: imageId, memoryGB: MEMORY_GB, ips, routes } }
  } catch (e) {
    await leave()
    throw e
  }
}

// one line per target, `open`, `refused` (a refusal is an answer) or `silent`, then the same for DNS. busybox nc -v prints nothing
// on a refusal and says why on a timeout, a drop or a bad name
const answersScript = (targets) => [...targets.map(({ host, port }) => `r=$(nc -vw4 ${host} ${port} </dev/null 2>&1) && echo open ${host}:${port} || case "$r" in '') echo refused ${host}:${port};; *) echo silent ${host}:${port};; esac`),
  'nslookup host.docker.internal >/dev/null 2>&1 && echo open dns || echo silent dns', ''].join('\n')
const answers = (text) => new Map(text.trim().split('\n').map((l) => l.split(' ').reverse()))

async function proofRows(b, { data, repo, token, cfg, print, port, outside }) {
  const box = b.box.name, rows = [], targets = blockedTargets(b.box.routes, port, outside)
  const row = (name, why) => {
    const result = why === null ? 'ok' : why === SKIP ? SKIP : 'FAILED'
    rows.push({ row: name, result, detail: why })
    print(`${name} ${result}`)
  }
  const inBox = (script) => must(['docker', 'exec', box, 'sh', '-c', `${script}\ntrue`], 'a check in the box', { quiet: true })

  const paths = [data, repo, join(data, 'seeded'), ROOT, join(homedir(), '.claude')]
  const present = (await inBox(paths.map((p) => `test -e ${word(p)} && echo ${word(p)}`).join('\n'))).trim()
  row('host paths absent', present ? `present: ${present.replaceAll('\n', ' ')}` : null)

  const c = JSON.parse(await must(['docker', 'inspect', box], 'docker inspect'))[0], [, cap] = /CapEff:\s*([0-9a-f]+)/.exec(await inBox('cat /proc/self/status'))
  const open = [c.Mounts.length && 'a mount', c.HostConfig.CapAdd?.length && 'an added capability', c.HostConfig.Privileged && 'privileged',
    (await inBox('test -e /var/run/docker.sock && echo yes')).trim() && 'the Docker socket', BigInt(`0x${cap}`) !== KEPT_CAP_MASK && `CapEff ${cap}`].filter(Boolean)
  row('no mount, no socket, only the six capabilities', open.length ? open.join(', ') : null)

  const names = (await inBox('env | cut -d= -f1')).split('\n').filter((n) => /^(BENCH_|PG|DATABASE_URL$|HSTACK_BENCH_MACHINE$)/.test(n))
  row('no bench or database env', names.length ? `present: ${names.join(' ')}` : null)

  const key = (t) => `${t.host}:${t.port}`, keys = [...targets.map(key), 'dns'], script = answersScript(targets)
  const before = answers(await must([...FW_RUN, FW, 'sh', '-c', script], 'the check with no rules', { timeoutSec: 600 }))
  const after = answers(await helper(box, script, 'the check under the rules'))
  const unproved = keys.filter((k) => (before.get(k) ?? 'silent') === 'silent'), through = keys.filter((k) => after.get(k) !== 'silent')
  row('blocked targets', unproved.length || through.length ? `no answer with no rules: [${unproved}]; answer under the rules: [${through}]` : null)

  const [v6, policy] = (await helper(box, "ip -6 addr show dev eth0 | grep -c inet6\nip6tables -S | grep -c '^-P OUTPUT DROP'\ntrue", 'the IPv6 check', ['--cap-add', 'NET_ADMIN'])).trim().split('\n')
  row('no IPv6 route out', v6 === '0' && policy === '1' ? null : `${v6} address(es) on eth0, ${policy} DROP policy`)

  if (!token) {
    row('the API answers', SKIP)
    row('init lists no web tool', SKIP)
  } else {
    const tries = []
    for (const model of [cfg.model, cfg.smallModel]) tries.push({ model, ...await b.turn({ prompt: 'Reply OK.', model, permissionMode: 'bypassPermissions', disallow: WEB_OFF }) })
    const tool = (r) => initInfo(r.out).tools.filter((x) => WEB_OFF.includes(x))
    const failed = (f) => tries.flatMap((r) => { try { return f(r) } catch (e) { return [`${r.model}: ${e.message}`] } })
    const dead = failed((r) => { finalText(r.out); return r.code === 0 ? [] : [`${r.model}: exit ${r.code}`] })
    const web = failed((r) => (tool(r).length ? [`${r.model}: ${tool(r)}`] : []))
    row('the API answers', dead.length ? dead.join('; ') : null)
    row('init lists no web tool', web.length ? web.join('; ') : null)
  }

  const iptables = rootRefused(await twin(box, ['iptables', '-P', 'OUTPUT', 'ACCEPT'])), link = rootRefused(await twin(box, ['ip', 'link', 'set', 'eth0', 'down']))
  row('root cannot undo it', iptables && link ? null : `${iptables ? '' : 'iptables was not refused '}${link ? '' : 'ip link was not refused'}`)

  row('no vsock', vsockRefused(await twin(box, ['python3', '-c', 'import socket; socket.socket(40, 1)'])) ? null : 'AF_VSOCK was not refused')

  const local = targets.filter((t) => t.port === port).map(key), named = key({ host: 'host.docker.internal', port })
  const closed = local.filter((k) => (before.get(k) ?? 'silent') === 'silent' || after.get(k) !== 'silent')
  const strings = Number((await inBox("env | grep -ic 'real_estate' || true")).trim())
  row('a real database is out of reach', before.get(named) === 'open' && !closed.length && !strings ? null : `the host with no rules: ${before.get(named)}; not proved: [${closed}]; ${strings} real_estate string(s) in the env`)
  return rows
}

// a row that did not run proves nothing: only an all-ok table exits 0
export const proofCode = (rows) => (rows.every((r) => r.result === 'ok') ? 0 : 1)
export async function proof(id, inj, print) {
  const data = dataOf(inj.data), t = taskOf(join(data, 'ext'), id), name = `${id}-proof`
  const cfg = JSON.parse(readFileSync(join(data, 'arms.json'), 'utf8')), task = await loadTask(join(data, 'env', `${id}.json`))
  return withExport(task, t.base, name, async (dir) => {
    await freshRepo(dir, t.base)
    const b = await enterBox({ data, task, id, name, base: t.base, repoGit: join(dir, '.git'), cli: join(data, cfg.cli), turnTimeoutSec: cfg.turnTimeoutSec }, inj)
    let rows
    try {
      rows = await withListener((port) => proofRows(b, { data, repo: task.repo, token: existsSync(join(data, 'arm/box.env')), cfg, print, port, outside: inj.blocked }))
    } finally { await b.leave() }
    writeFileSync(join(data, 'arm', `proof-${id}.json`), JSON.stringify({ task: id, rows }, null, 2) + '\n')
    return proofCode(rows)
  })
}

export async function main(argv, inj = {}, print = (s) => console.log(s)) {
  try {
    if (argv[0] !== 'proof' || argv.length !== 2) throw new Error(USAGE)
    return await proof(argv[1], inj, print)
  } catch (e) { console.error(e.message); return 2 }
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
