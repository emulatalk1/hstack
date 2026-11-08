// The four arms, the intervention count, the probe check, and the rules of the box (arguments, firewall, network check). Pure.
import { events } from './agent.mjs'

export const RESUMES = 5
export const API_HOSTS = ['api.anthropic.com', 'console.anthropic.com', 'platform.claude.com', 'claude.ai']
// WebSearch runs API-side, so the firewall cannot stop it and it could find the fix of a public PR
export const WEB_OFF = ['WebSearch', 'WebFetch']

const SHORT = 'Write no tests. Do not run or check your work. Stop after one pass.'

export function armArgs(arm, cfg) {
  const disallow = WEB_OFF
  if (arm === 'B') return { model: cfg.model, plugins: [], appendSystemPrompt: undefined, disallow }
  if (arm === 'B-') return { model: cfg.smallModel, plugins: [], appendSystemPrompt: SHORT, disallow }
  if (arm === 'H' || arm === 'W') return { model: cfg.model, plugins: cfg.plugins[arm], appendSystemPrompt: undefined, disallow }
  throw new Error(`arm ${arm} must be B, B-, H or W`)
}

export const countInterventions = ({ hookLines, resumes, abandoned }) => hookLines + resumes.filter((r) => r !== 'DONE').length + (abandoned ? 3 : 0)

export function initInfo(streamJson) {
  const init = events(streamJson).find((e) => e?.type === 'system' && e.subtype === 'init')
  if (!init) throw new Error('transcript has no init event')
  // builtin plugins load for every arm alike
  return { plugins: (init.plugins ?? []).filter((p) => p.path !== 'builtin').map((p) => p.name), commands: init.slash_commands ?? [], tools: init.tools ?? [],
    version: init.claude_code_version ?? null }
}

export function probeOk(arm, info, expectedPlugins, userSkills) {
  const got = [...info.plugins].sort(), want = [...expectedPlugins].sort()
  if (got.join('\n') !== want.join('\n')) return `plugins at init [${got}] differ from the arm's [${want}]`
  const web = info.tools.filter((t) => WEB_OFF.includes(t))
  if (web.length) return `arm ${arm} has a web tool at init: ${web.join(', ')}`
  if (arm !== 'B' && arm !== 'B-') return null
  const bad = info.commands.filter((c) => c.includes(':') || userSkills.includes(c))
  return bad.length ? `arm ${arm} loads a plugin command or user skill: ${bad.join(', ')}` : null
}

// Docker's default capabilities but CHOWN, DAC_OVERRIDE, FOWNER, KILL, SETUID, SETGID, which a task's own services may need in a box.
// NET_RAW above all: with it root sends AF_PACKET frames, which no iptables rule in the box sees.
export const CAP_DROPS = ['NET_RAW', 'MKNOD', 'SYS_CHROOT', 'SETFCAP', 'SETPCAP', 'AUDIT_WRITE', 'NET_BIND_SERVICE', 'FSETID'].flatMap((c) => ['--cap-drop', c])
export const KEPT_CAP_MASK = 0xebn // bits 0, 1, 3, 5, 6, 7: the six above, as CapEff shows them
// No -v, --mount, added capability, --pid, --ipc or --network, and no swap flag: the box has only its image and the firewall set from outside.
// env: the placeholder token and the proxy's address, never a secret (step 11 ruling 6)
export const boxArgs = ({ name, image, platform, hosts, limitSec, memoryGB, env = [] }) => ['create', '--name', name, '--platform', platform, '--memory', `${memoryGB}g`, ...CAP_DROPS,
  ...hosts.flatMap((h) => ['--add-host', `${h.host}:${h.ip}`]), ...env.flatMap((e) => ['-e', e]), '--entrypoint', 'sleep', image, String(limitSec)]

// both go into `sh -c`, so a value is checked before it is placed
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/, NAME = /^[A-Za-z0-9.-]+$/
const checked = (ok, what, v) => { if (!ok) throw new Error(`${what} ${JSON.stringify(v)} is not valid for the box's scripts`); return v }
const target = (t) => checked(IPV4.test(t?.ip) && Number.isInteger(t.port) && t.port > 0 && t.port < 65536, 'target', t)

// run in a helper that shares a container's network namespace; no DNS is open, the names are pinned by --add-host. IPv6 is dropped
// whole. out: the TCP targets the container may open; in: the peers that may open its port (the proxy's box)
export function fwScript({ out = [], in: inbound = [] }) {
  const all = (rule) => ['iptables', 'ip6tables'].map((c) => `${c} ${rule}`)
  return ['set -e',
    ...['INPUT', 'OUTPUT', 'FORWARD'].flatMap((ch) => all(`-P ${ch} DROP`)),
    ...all('-A OUTPUT -o lo -j ACCEPT'), ...all('-A INPUT -i lo -j ACCEPT'),
    ...all('-A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT'), ...all('-A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT'),
    ...out.map(target).map((t) => `iptables -A OUTPUT -p tcp --dport ${t.port} -d ${t.ip}/32 -j ACCEPT`),
    ...inbound.map(target).map((t) => `iptables -A INPUT -p tcp --dport ${t.port} -s ${t.ip}/32 -j ACCEPT`), ''].join('\n')
}

// busybox nc; one `reach|blocked <host>:<port>` line per target, then `v6 <n>`: the inet6 addresses on eth0. allowed [{ ip, port }]
export function netScript(allowed, blocked) {
  const targets = [...allowed.map(target).map((t) => [t.ip, t.port]),
    ...blocked.map((b) => [checked(NAME.test(b.host) && Number.isInteger(b.port), 'target', b) && b.host, b.port])]
  return [...targets.map(([h, p]) => `nc -zw4 ${h} ${p} && echo reach ${h}:${p} || echo blocked ${h}:${p}`),
    'echo v6 $(ip -6 addr show dev eth0 | grep -c inet6 || true)', ''].join('\n')
}

export function netOk(text, allowed, blocked) {
  if (!allowed.length) return 'no allowed target to prove the firewall lets the way out through'
  const lines = new Set(text.split('\n').map((l) => l.trim()))
  for (const t of allowed) if (!lines.has(`reach ${t.ip}:${t.port}`)) return `allowed address ${t.ip}:${t.port} does not answer`
  for (const b of blocked) {
    if (lines.has(`reach ${b.host}:${b.port}`)) return `${b.host}:${b.port} answers but must be blocked`
    if (!lines.has(`blocked ${b.host}:${b.port}`)) return `no result for ${b.host}:${b.port}`
  }
  const v6 = /^v6 (\d+)$/m.exec(text)
  if (!v6) return 'no IPv6 count in the network check'
  return Number(v6[1]) > 0 ? `the box has ${v6[1]} IPv6 address(es) on eth0` : null
}

// step 11 ruling 6: the proxy's port and the token the box holds instead of the real one
export const PROXY_PORT = 8080, PLACEHOLDER = 'bench-placeholder'
const AUTHS = ['authorization', 'x-api-key'], CLI_VARS = ['ANTHROPIC_AUTH_TOKEN', 'CLAUDE_CODE_OAUTH_TOKEN']
// arms.json `proxy`, what the probe found: the header the proxy sets, its betas, the variable the CLI reads the placeholder from.
// No default: no box runs before the probe has filled it
export function proxyConfig(p) {
  if (p === undefined) throw new Error('arms.json has no proxy { auth, betas, cliVar }: the probe fills it, and no box runs before it')
  if (!p || typeof p !== 'object' || !AUTHS.includes(p.auth) || !Array.isArray(p.betas) || !p.betas.every((b) => typeof b === 'string' && /^[A-Za-z0-9._-]+$/.test(b)) || !CLI_VARS.includes(p.cliVar)) {
    throw new Error(`arms.json proxy must be { auth: ${AUTHS.join('|')}, betas: [beta names], cliVar: ${CLI_VARS.join('|')} }`)
  }
  return { auth: p.auth, betas: p.betas, cliVar: p.cliVar }
}

// arms.json turnTimeoutSec: one number for every task, or one per set, { external, re } (re: the private set's stack)
export function turnLimit(v, set) {
  const sec = typeof v === 'number' ? v : v?.[set]
  if (!Number.isInteger(sec) || sec <= 0) throw new Error(`turnTimeoutSec must be a positive integer or { external, re } of them (no ${set} limit)`)
  return sec
}

// the proxy's counts file, `allowed <a> refused <r>` and ` <reason>=<n>` (upstream failures count under a reason, not as refused)
export function parseCounts(text) {
  const m = /^allowed (\d+) refused (\d+)((?: [a-z]+=\d+)*)\n?$/.exec(text)
  if (!m) throw new Error('the proxy counts file is not one counts line')
  return { allowed: Number(m[1]), refused: Number(m[2]), reasons: Object.fromEntries([...m[3].matchAll(/ ([a-z]+)=(\d+)/g)].map((x) => [x[1], Number(x[2])])) }
}
