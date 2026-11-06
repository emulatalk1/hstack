// The four arms, the intervention count, the probe check, and the rules of the box (arguments, firewall, network check). Pure.
import { events } from './agent.mjs'

export const RESUMES = 5
export const API_HOSTS = ['api.anthropic.com', 'console.anthropic.com', 'platform.claude.com', 'claude.ai']
// WebSearch runs API-side, so the firewall cannot stop it and it could find the fix of a public PR
export const WEB_OFF = ['WebSearch', 'WebFetch']

const SHORT = 'Write no tests. Do not run or check your work. Stop after one pass.'

export function armArgs(arm, cfg) {
  const disallow = WEB_OFF
  if (arm === 'B') return { model: cfg.model, pluginDirs: [], appendSystemPrompt: undefined, disallow }
  if (arm === 'B-') return { model: cfg.smallModel, pluginDirs: [], appendSystemPrompt: SHORT, disallow }
  if (arm === 'H' || arm === 'W') return { model: cfg.model, pluginDirs: cfg.plugins[arm], appendSystemPrompt: undefined, disallow }
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

// No -v, --mount, added capability, --pid, --ipc or --network, and no swap flag: the box has only its image and the firewall set from
// outside. NET_RAW, a Docker default, goes: with it root sends AF_PACKET frames, which no iptables rule in the box sees.
export const boxArgs = ({ name, image, platform, hosts, limitSec, memoryGB }) => ['create', '--name', name, '--platform', platform, '--memory', `${memoryGB}g`, '--cap-drop', 'NET_RAW',
  ...hosts.flatMap((h) => ['--add-host', `${h.host}:${h.ip}`]), '--entrypoint', 'sleep', image, String(limitSec)]

// both go into `sh -c`, so a value is checked before it is placed
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/, NAME = /^[A-Za-z0-9.-]+$/
const checked = (ok, what, v) => { if (!ok) throw new Error(`${what} ${JSON.stringify(v)} is not valid for the box's scripts`); return v }

// run in a helper that shares the box's network namespace; no DNS is open, the names are pinned by --add-host. IPv6 is dropped whole.
export function fwScript(ips) {
  const all = (rule) => ['iptables', 'ip6tables'].map((c) => `${c} ${rule}`)
  return ['set -e',
    ...['INPUT', 'OUTPUT', 'FORWARD'].flatMap((ch) => all(`-P ${ch} DROP`)),
    ...all('-A OUTPUT -o lo -j ACCEPT'), ...all('-A INPUT -i lo -j ACCEPT'),
    ...all('-A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT'), ...all('-A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT'),
    ...ips.map((ip) => `iptables -A OUTPUT -p tcp --dport 443 -d ${checked(IPV4.test(ip), 'address', ip)}/32 -j ACCEPT`), ''].join('\n')
}

// busybox nc; one `reach|blocked <host>:<port>` line per target, then `v6 <n>`: the inet6 addresses on eth0
export function netScript(ips, blocked) {
  const targets = [...ips.map((ip) => [checked(IPV4.test(ip), 'address', ip), 443]),
    ...blocked.map((b) => [checked(NAME.test(b.host) && Number.isInteger(b.port), 'target', b) && b.host, b.port])]
  return [...targets.map(([h, p]) => `nc -zw4 ${h} ${p} && echo reach ${h}:${p} || echo blocked ${h}:${p}`),
    'echo v6 $(ip -6 addr show dev eth0 | grep -c inet6 || true)', ''].join('\n')
}

export function netOk(text, ips, blocked) {
  if (!ips.length) return 'no allowed address to prove the firewall lets the API through'
  const lines = new Set(text.split('\n').map((l) => l.trim()))
  for (const ip of ips) if (!lines.has(`reach ${ip}:443`)) return `allowed address ${ip}:443 does not answer`
  for (const b of blocked) {
    if (lines.has(`reach ${b.host}:${b.port}`)) return `${b.host}:${b.port} answers but must be blocked`
    if (!lines.has(`blocked ${b.host}:${b.port}`)) return `no result for ${b.host}:${b.port}`
  }
  const v6 = /^v6 (\d+)$/m.exec(text)
  if (!v6) return 'no IPv6 count in the network check'
  return Number(v6[1]) > 0 ? `the box has ${v6[1]} IPv6 address(es) on eth0` : null
}
