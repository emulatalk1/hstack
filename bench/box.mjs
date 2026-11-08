#!/usr/bin/env bun
// The arm box, the only place an arm agent runs (rulings 2, 3, 5, 6, 13 of step 8): the task's serve image plus the arm layer,
// nothing mounted, six capabilities kept and none of them over the network, the firewall set from outside and checked from outside before the CLI goes in. Any failure
// on the way in removes what was made and throws: a run with no box does not happen. `proof` prints the boundary's table.
// Step 11 (rulings 2, 6, 8): the token stays in a proxy container beside the box, the box reaches only that proxy (and, for the
// private set, the registry), an arm's plugins go in as an allowlist export, and a private-set task's services run before the first turn.
import { copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { git, ROOT, withExport } from './env.mjs'
import { daemon, dataOf, diskFloor, dockerDiskFree, imageBuilder, must, PRIVATE_SET, recordDocker, removeRecorded, serveRecipe, sp, taskOf, word } from './ext.mjs'
import { claudeArgs, finalText } from './lib/agent.mjs'
import { API_HOSTS, boxArgs, CAP_DROPS, fwScript, initInfo, KEPT_CAP_MASK, netOk, netScript, parseCounts, PLACEHOLDER, proxyConfig, PROXY_PORT, RESUMES, turnLimit, WEB_OFF } from './lib/arm.mjs'
import { runGroup } from './lib/proc.mjs'
import { loadTask } from './lib/task.mjs'

const USAGE = 'usage: bun bench/box.mjs proof <task>'
const FW = 'bench-arm/fw:1', PROXY = 'bench-arm/proxy:1', MEMORY_GB = 6, CLI = '/arm/claude', SETTINGS = '/arm/settings.json', PLUGINS = '/arm/plugins'
// never from a registry: the helper gets NET_ADMIN, and a tag missing here must fall through to the local build
export const FW_RUN = ['docker', 'run', '--rm', '--pull', 'never']
const ENV = ['IS_SANDBOX=1', 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1', 'DISABLE_TELEMETRY=1', 'DISABLE_AUTOUPDATER=1']
const MAX_ARG = 131072 // Linux MAX_ARG_STRLEN: a turn's script is one argument of sh -c
const PLUGIN_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/
// the product repo is the agent's: none of its hooks or fsmonitor runs
const SAFE = ['-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false']
const BENCH = [...SAFE, '-c', 'user.name=bench', '-c', 'user.email=bench@localhost', '-c', 'commit.gpgsign=false']
const GIT = ['git', '-C', '/work', ...BENCH]
const sha = (x) => new Bun.CryptoHasher('sha256').update(x).digest('hex')

// ruling 2's layer. Appended FROM the serve image; a git archive has no .git, but a recipe's own step may have made one
export const ARM_LAYER = ['RUN rm -rf /work/.git /work/.bench.Dockerfile /work/.bench.Dockerfile.dockerignore /work/.bench-test.sh',
  'RUN command -v git >/dev/null || (apt-get update && apt-get install -y --no-install-recommends git)']

// step 11 ruling 2: what of a plugin enters a box. Only its component folders, and never a path only the repo may hold (the locks,
// which name the cold repos, and the prereg): `git archive <commit> -- <paths>`, or the same folders of a plugin pinned by version.
// files: the exported paths, sorted; sha256: of one `<sha256 of the file>  <path>` line per file, in that order. A refusal leaves no out
export const PLUGIN_PATHS = ['.claude-plugin', 'skills', 'agents', 'commands', 'hooks', 'scripts', 'bin', '.mcp.json']
const REPO_ONLY = ['bench', 'progress', 'docs', 'tests', 'fixtures', '.evidence']
export function pluginExport({ repo, commit, dir, paths, out }) {
  const no = (why) => { rmSync(out, { recursive: true, force: true }); throw new Error(`plugin export refused: ${why}`) }
  if (!Array.isArray(paths) || !paths.length) no('paths must name the plugin\'s component folders')
  const repoOnly = paths.filter((p) => REPO_ONLY.includes(p)), other = paths.filter((p) => !PLUGIN_PATHS.includes(p))
  if (repoOnly.length) no(`${repoOnly.join(', ')} is the repo's, not the plugin's`)
  if (other.length) no(`${other.join(', ')} is not one of the component folders ${PLUGIN_PATHS.join(', ')}`)
  if (existsSync(out)) throw new Error(`plugin export: ${out} exists`)
  mkdirSync(out, { recursive: true })
  if (commit) {
    const a = Bun.spawnSync(['git', '-C', repo, 'archive', '--format=tar', commit, '--', ...paths], { stdout: 'pipe', stderr: 'pipe' })
    if (a.exitCode !== 0) no(`git archive ${commit.slice(0, 7)} failed (exit ${a.exitCode})`)
    if (Bun.spawnSync(['tar', '-x', '-C', out], { stdin: a.stdout, stderr: 'pipe' }).exitCode !== 0) no('tar -x failed')
  } else {
    for (const p of paths) {
      if (!existsSync(join(dir, p))) no(`${p} is not in ${dir}`)
      cpSync(join(dir, p), join(out, p), { recursive: true, verbatimSymlinks: true })
    }
  }
  const files = []
  const walk = (rel) => {
    for (const e of readdirSync(join(out, rel), { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name
      if (e.isSymbolicLink()) no(`${r} is a link`) // in the box it would point at whatever is there
      else if (e.isDirectory()) walk(r)
      else files.push(r)
    }
  }
  walk('')
  files.sort()
  const held = files.filter((f) => REPO_ONLY.includes(f.split('/')[0]))
  if (held.length) no(`it holds ${held[0]}`)
  return { files, sha256: sha(files.map((f) => `${sha(readFileSync(join(out, f)))}  ${f}\n`).join('')) }
}

// the token's value from box.env's one KEY=value line; never printed, and handed only to the proxy
export function readToken(file) {
  if (!existsSync(file)) throw new Error(`${file} is missing`)
  const text = readFileSync(file, 'utf8').trim(), eq = text.indexOf('=')
  if (eq < 1 || text.includes('\n') || eq === text.length - 1) throw new Error(`${file} must be one KEY=value line`)
  return text.slice(eq + 1)
}

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

export async function fwImage(scratch) {
  if ((await sp([...FW_RUN, '--network', 'none', FW, 'python3', '-V'])).code === 0) return // an older tag has no python3
  await scratch('fw', null, async (dir) => {
    writeFileSync(join(dir, 'Dockerfile'), 'FROM alpine:3.22\nRUN apk add --no-cache iptables python3\n')
    await must(['docker', 'build', '--progress=plain', '-t', FW, dir], `the build of ${FW}`, { timeoutSec: 600 })
  })
}

// the proxy's image, from the controller's <data>/arm/proxy/Dockerfile and this checkout's proxy.mjs, built from the cache on each
// box so it always holds this checkout's proxy. Its name is recorded in <data>/arm/docker.json and kept across runs, like the helper's
export async function proxyImage(scratch, data) {
  const file = join(data, 'arm/proxy/Dockerfile'), record = (f) => recordDocker(join(data, 'arm/docker.json'), f)
  if (!existsSync(file)) throw new Error(`${file} is missing: the proxy's image is built from it`)
  record((d) => { if (!d.images.some((i) => i.name === PROXY)) d.images.push({ name: PROXY, id: null }) })
  await scratch('proxy', null, async (dir) => {
    copyFileSync(file, join(dir, 'Dockerfile'))
    copyFileSync(join(import.meta.dir, 'proxy.mjs'), join(dir, 'proxy.mjs'))
    await must(['docker', 'build', '--progress=plain', '-t', PROXY, dir], `the build of ${PROXY}`, { timeoutSec: 600 })
  })
  const id = (await must(['docker', 'image', 'inspect', '-f', '{{.Id}}', PROXY], `docker image inspect ${PROXY}`)).trim()
  record((d) => { d.images.find((i) => i.name === PROXY).id = id })
}

// the rules of a container, checked from its own namespace by the real helper: each allowed target answers, and none of ruling 3's
// (outside, the host on a throwaway port, the gateway, the resolvers) nor of `more` does. Throws; gives the routes it read
export async function netCheck(name, allowed, { outside, more = [] } = {}) {
  const routes = await helper(name, 'ip -4 route; cat /etc/resolv.conf', `the routes of ${name}`)
  await withListener(async (port) => {
    const blocked = [...blockedTargets(routes, port, outside), ...more]
    const why = netOk(await helper(name, netScript(allowed, blocked), 'the network check'), allowed, blocked)
    if (why) throw new Error(`the firewall does not hold, run refused: ${why}`)
  })
  return routes
}

// data, task (its file: .repo), id (the task's name), name (the run's), base, repoGit (host path of the fresh .git), cli (host
// path), turnTimeoutSec, plugins [{ name, dir }] (exports, see pluginExport), proxy (arms.json's, see proxyConfig). inj: hosts
// [{ host, ip }] (the API's, pinned in the proxy), registryHosts (the private set's registry, pinned in the box), upstream (the
// proxy's, a test's stand-in), helper (a function of the rules script or an argv: replaces only the step that sets the box's rules),
// cli, blocked [{ host, port }] (replaces ruling 3's public targets: a test on a bridge has no internet to answer them), graceSec
// (the host's limit past turnTimeoutSec, 120)
export async function enterBox({ data, task, id, name, base, repoGit, cli, turnTimeoutSec, plugins = [], proxy: proxyCfg }, inj = {}) {
  const ext = join(data, 'ext'), t = taskOf(ext, id)
  if (base !== t.base) throw new Error(`the box of ${id} is at its base ${t.base}, not ${base}`) // so its build logs hold base files only
  const pcfg = proxyConfig(proxyCfg), token = readToken(join(data, 'arm/box.env')) // both before any Docker call
  for (const p of plugins) if (!PLUGIN_NAME.test(p.name ?? '')) throw new Error(`plugin name ${JSON.stringify(p.name)} must match ${PLUGIN_NAME.source}`)
  const { recipe, serveDockerfile, sv } = serveRecipe(ext, t), isPrivate = t.stack === PRIVATE_SET.stack
  const sha7 = base.slice(0, 7), box = `bench-ext-${t.slug}-arm-${name}`, proxy = `bench-arm-proxy-${box}`
  const serveTag = `bench-ext/${t.slug}:${sha7}-serve`, armTag = `bench-ext/${t.slug}:${sha7}-arm`
  const build = join(data, id, 'build')
  mkdirSync(build, { recursive: true })
  const record = (f) => recordDocker(join(data, id, 'docker.json'), f)
  const leave = () => removeRecorded(data, id, t.slug)
  let seq = 0, turns = 0
  const scratch = (what, commit, fn) => withExport({ name: t.key, repo: task.repo }, commit, `${what}-${t.slug}-${process.pid}-${seq++}`, fn)
  const inBox = (argv, what) => must(['docker', 'exec', '-w', '/work', box, ...argv], what, { timeoutSec: 600, quiet: true })
  const cpIn = (from, to) => must(['docker', 'cp', from, `${box}:${to}`], `docker cp into ${box}`, { quiet: true })
  const ipOf = async (c) => {
    const ip = (await must(['docker', 'inspect', '-f', '{{.NetworkSettings.Networks.bridge.IPAddress}}', c], `docker inspect ${c}`)).trim()
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) throw new Error(`${c} has no address on the default bridge`)
    return ip
  }
  const commit = async (msg) => {
    await inBox([...GIT, 'add', '-A'], 'git add in the box') // never -f: ignored build outputs stay out
    await inBox([...GIT, 'commit', '-q', '--no-verify', '--allow-empty', '-m', msg], 'git commit in the box')
  }

  try {
    const low = await diskFloor(id, inj)
    if (low) throw new Error(low)
    await fwImage(scratch)
    await proxyImage(scratch, data)
    const image = imageBuilder({ record, scratch, recipe, diskFree: inj.diskFree ?? dockerDiskFree })
    // n as oracle-run counts it, which records the same serve tag, so no log is overwritten
    const n = record(() => {}).images.filter((i) => i.name === serveTag).length + 1
    await image(serveTag, serveDockerfile, base, join(build, `${sha7}-${n}.serve.build.log`))
    const imageId = await image(armTag, `FROM ${serveTag}\n${ARM_LAYER.join('\n')}\n`, null, join(build, `${sha7}-${n}.arm.build.log`))

    const hosts = inj.hosts ?? await pinHosts(API_HOSTS), apiIps = [...new Set(hosts.map((h) => h.ip))]
    // decision 6 (a): the private set's boxes reach its registry, pinned now, on 443 only
    const regHosts = isPrivate ? inj.registryHosts ?? await pinHosts(PRIVATE_SET.registry) : [], regIps = [...new Set(regHosts.map((h) => h.ip))]
    const limitSec = (RESUMES + 2) * turnTimeoutSec + 600
    record((d) => d.containers.push(proxy, box))
    // the token goes in by a file only the create reads, so no argv or log holds it; the proxy ends by itself as the box does
    await scratch('token', null, async (dir) => {
      const f = join(dir, 'proxy.env')
      writeFileSync(f, `BENCH_PROXY_TOKEN=${token}\n`, { mode: 0o600 })
      try {
        await must(['docker', 'create', '--name', proxy, '--cap-drop', 'ALL', '--memory', '256m', ...hosts.flatMap((h) => ['--add-host', `${h.host}:${h.ip}`]), '--env-file', f,
          ...[`BENCH_PROXY_AUTH=${pcfg.auth}`, `BENCH_PROXY_BETAS=${pcfg.betas.join(',')}`, `BENCH_PROXY_PORT=${PROXY_PORT}`, `BENCH_PROXY_UPSTREAM=${inj.upstream ?? 'https://api.anthropic.com'}`].flatMap((e) => ['-e', e]),
          '--entrypoint', 'timeout', PROXY, String(limitSec), 'bun', '/proxy/proxy.mjs', 'serve'], `docker create ${proxy}`)
      } finally { rmSync(f, { force: true }) }
    })
    await must(['docker', 'start', proxy], `docker start ${proxy}`)
    const proxyIp = await ipOf(proxy)
    const env = [`${pcfg.cliVar}=${PLACEHOLDER}`, `ANTHROPIC_BASE_URL=http://${proxyIp}:${PROXY_PORT}`]
    await must(['docker', ...boxArgs({ name: box, image: armTag, platform: recipe.platform, hosts: regHosts, limitSec, memoryGB: MEMORY_GB, env })], `docker create ${box}`)
    await must(['docker', 'start', box], `docker start ${box}`)
    const boxIp = await ipOf(box)

    // a restart gives the box a new namespace with no rules: alive() fails, and nothing runs in it
    const startedAt = (await must(['docker', 'inspect', '-f', '{{.State.StartedAt}}', box], `docker inspect ${box}`)).trim()
    const alive = async () => (await sp(['docker', 'inspect', '-f', '{{.State.StartedAt}} {{.State.Running}}', box])).out.trim() === `${startedAt} true`
    const killed = async () => {
      await sp(['docker', 'kill', box]) // this run created it
      await daemon() // a dead daemon is the machine's failure and throws
      return { out: '', code: 'killed' }
    }
    const api = apiIps.map((ip) => ({ ip, port: 443 })), out = [{ ip: proxyIp, port: PROXY_PORT }, ...regIps.map((ip) => ({ ip, port: 443 }))]
    await must(rulesCommand(proxy, fwScript({ in: [{ ip: boxIp, port: PROXY_PORT }], out: api })), 'the proxy\'s firewall rules', { timeoutSec: 600 })
    const rules = fwScript({ out })
    await (typeof inj.helper === 'function' ? inj.helper(rules) : must(inj.helper ?? rulesCommand(box, rules), 'the firewall rules', { timeoutSec: 600 }))
    // the proxy may still be starting: give it a few seconds to listen before the check counts it silent
    await sp([...FW_RUN, '--network', `container:${box}`, FW, 'sh', '-c', `for i in $(seq 40); do nc -zw1 ${proxyIp} ${PROXY_PORT} && exit 0; sleep 0.25; done; exit 1`], 60)
    // always the real helper: a rule step that did nothing must fail here. The box must not reach the API but through the proxy
    const routes = await netCheck(box, out, { outside: inj.blocked, more: api.map(({ ip, port }) => ({ host: ip, port })) })
    await netCheck(proxy, api, { outside: inj.blocked })

    await inBox(['mkdir', '-p', PLUGINS], 'mkdir in the box')
    await cpIn(inj.cli ?? cli, CLI)
    for (const p of plugins) await cpIn(`${p.dir}/.`, `${PLUGINS}/${p.name}`)
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
    // ruling 8: what the box needs of the task's services (a database), once, as root, under the box's firewall; before the env
    // commit, so what they write is the agent's starting tree. A failure refuses the box
    if (isPrivate && sv.services) await must(['docker', 'exec', '-u', '0', '-w', '/work', box, 'sh', '-c', sv.services], 'the services', { timeoutSec: 600, quiet: true })
    await commit('env')
    const envCommit = (await inBox([...GIT, 'rev-parse', 'HEAD'], 'git rev-parse in the box')).trim()
    const pluginDirs = plugins.map((p) => `${PLUGINS}/${p.name}`)

    const turn = async (opts) => {
      if (!(await alive())) return killed()
      const file = `/arm/turn-${turns++}`
      // the box's plugins only: the dirs are the box's paths, not the caller's
      const line = ['timeout', '-k', '30', String(turnTimeoutSec), CLI, ...claudeArgs({ ...opts, pluginDirs, settings: SETTINGS })].map(word).join(' ')
      const script = `${line} >${file}.out 2>${file}.err </dev/null` // in files: a background server cannot hold a pipe
      if (Buffer.byteLength(script) >= MAX_ARG) throw new Error(`a turn of ${Buffer.byteLength(script)} bytes is too long for one argument`)
      const started = Date.now()
      const { code } = await runGroup(['docker', 'exec', '-w', '/work', ...ENV.flatMap((e) => ['-e', e]), box, 'sh', '-c', script],
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

    // the proxy's counts so far: allowed and refused requests and the reasons, never a header or a body
    const proxyCounts = async () => parseCounts(await must(['docker', 'exec', proxy, 'cat', '/out/proxy-counts.txt'], 'the proxy\'s counts', { quiet: true }))

    return { envCommit, turn, product, proxyCounts, leave, box: { name: box, image: imageId, memoryGB: MEMORY_GB, ips: out.map((o) => o.ip), routes,
      proxy: { name: proxy, ip: proxyIp, port: PROXY_PORT, ips: apiIps }, services: isPrivate && sv.services ? 'ok' : null } }
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
// a POST from the box's namespace by the helper's python, so no task image needs a client: the HTTP status, or `none`
const POST_PY = ['import sys, urllib.request as u, urllib.error as e', "r = u.Request(sys.argv[1], data=sys.argv[2].encode(), headers={'content-type': 'application/json'})",
  'try: print(u.urlopen(r, timeout=120).status)', 'except e.HTTPError as x: print(x.code)', "except Exception: print('none')"].join('\n')
// no model and no message: the API answers 400 and nothing is billed. A web search tool: the proxy must refuse it
const PLAIN = '{"max_tokens":1,"messages":[]}', SERVER_TOOL = '{"max_tokens":1,"messages":[],"tools":[{"type":"web_search_20250305","name":"web_search"}]}'

async function proofRows(b, { data, repo, token, cfg, print, port, outside, isPrivate }) {
  const box = b.box.name, rows = [], targets = blockedTargets(b.box.routes, port, outside), p = b.box.proxy
  const row = (name, why) => {
    const result = why === null ? 'ok' : 'FAILED'
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

  // step 11 ruling 6: the env the box was made with and the env a process in it sees hold the placeholder, and no value is the token
  const envLines = [...(await inBox('env')).split('\n'), ...(c.Config.Env ?? [])].filter(Boolean), tokenSha = sha(token)
  const leak = envLines.some((l) => l.includes(token) || sha(l.slice(l.indexOf('=') + 1)) === tokenSha), placeholder = envLines.includes(`${cfg.proxy.cliVar}=${PLACEHOLDER}`)
  row('no token in the box env', !leak && placeholder ? null : [leak && 'a value of the box env is the token', !placeholder && `no ${cfg.proxy.cliVar} placeholder`].filter(Boolean).join('; '))

  const key = (t) => `${t.host}:${t.port}`, keys = [...targets.map(key), 'dns'], script = answersScript(targets)
  const before = answers(await must([...FW_RUN, FW, 'sh', '-c', script], 'the check with no rules', { timeoutSec: 600 }))
  const after = answers(await helper(box, script, 'the check under the rules'))
  const unproved = keys.filter((k) => (before.get(k) ?? 'silent') === 'silent'), through = keys.filter((k) => after.get(k) !== 'silent')
  row('blocked targets', unproved.length || through.length ? `no answer with no rules: [${unproved}]; answer under the rules: [${through}]` : null)

  const url = `http://${p.ip}:${p.port}/v1/messages`, api = p.ips.map((ip) => ({ host: ip, port: 443 }))
  const post = async (body) => (await helper(box, `python3 -c ${word(POST_PY)} ${word(url)} ${word(body)}`, 'a request through the proxy')).trim()
  const direct = netOk(await helper(box, netScript([{ ip: p.ip, port: p.port }], api), 'the check of the API addresses'), [{ ip: p.ip, port: p.port }], api)
  let c0 = await b.proxyCounts(), status = await post(PLAIN), c1 = await b.proxyCounts()
  // any answer of the API: not the proxy's own refusal (403), upstream failure (502) or error (500), and counted as allowed
  const answered = /^\d+$/.test(status) && !['403', '500', '502'].includes(status) && c1.allowed === c0.allowed + 1
  row('the API is reached only through the proxy', !direct && answered ? null : [direct, !answered && `through the proxy: ${status}`].filter(Boolean).join('; '))
  c0 = c1; status = await post(SERVER_TOOL); c1 = await b.proxyCounts()
  const refused = status === '403' && c1.refused === c0.refused + 1 && (c1.reasons.tool ?? 0) === (c0.reasons.tool ?? 0) + 1
  row('the proxy refuses a server tool', refused ? null : `a web search tool through the proxy: ${status}, refused ${c0.refused} -> ${c1.refused}`)

  const [v6, policy] = (await helper(box, "ip -6 addr show dev eth0 | grep -c inet6\nip6tables -S | grep -c '^-P OUTPUT DROP'\ntrue", 'the IPv6 check', ['--cap-add', 'NET_ADMIN'])).trim().split('\n')
  row('no IPv6 route out', v6 === '0' && policy === '1' ? null : `${v6} address(es) on eth0, ${policy} DROP policy`)

  {
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

  if (isPrivate) {
    // services: their command exited 0, as root, before the first turn (enterBox refuses the box otherwise); it is not run twice
    row('services are up', b.box.services === 'ok' ? null : 'the services did not run')
    const reg = b.box.ips.filter((ip) => ip !== p.ip).map((ip) => ({ ip, port: 443 })), blocked = [...targets, ...api]
    row('only the registry answers', netOk(await helper(box, netScript(reg, blocked), 'the registry check'), reg, blocked))
  }
  return rows
}

// a row that did not run proves nothing: only an all-ok table exits 0
export const proofCode = (rows) => (rows.every((r) => r.result === 'ok') ? 0 : 1)
export async function proof(id, inj, print) {
  const data = dataOf(inj.data), t = taskOf(join(data, 'ext'), id), name = `${id}-proof`, isPrivate = t.stack === PRIVATE_SET.stack
  // step 11 ruling 9: the box task file when there is one
  const boxFile = join(data, 'env/box', `${id}.json`), task = await loadTask(existsSync(boxFile) ? boxFile : join(data, 'env', `${id}.json`))
  const cfg = JSON.parse(readFileSync(join(data, 'arms.json'), 'utf8')), turnTimeoutSec = turnLimit(cfg.turnTimeoutSec ?? 14400, isPrivate ? PRIVATE_SET.stack : 'external')
  return withExport(task, t.base, name, async (dir) => {
    await freshRepo(dir, t.base)
    const b = await enterBox({ data, task, id, name, base: t.base, repoGit: join(dir, '.git'), cli: join(data, cfg.cli), turnTimeoutSec, proxy: cfg.proxy }, inj)
    let rows
    try {
      rows = await withListener((port) => proofRows(b, { data, repo: task.repo, token: readToken(join(data, 'arm/box.env')), cfg, print, port, outside: inj.blocked, isPrivate }))
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
