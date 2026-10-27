import { existsSync, realpathSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'

const real = (p) => (existsSync(p) ? realpathSync(p) : p)
const under = (p, root) => p === root || p.startsWith(root.replace(/\/$/, '') + '/')
const bad = (field, why) => { throw new Error(`task ${field}: ${why}`) }
const str = (t, f) => (typeof t[f] === 'string' && t[f] !== '' ? t[f] : bad(f, 'must be a non-empty string'))
const list = (t, f) => {
  const v = t[f] ?? []
  return Array.isArray(v) && v.every((s) => typeof s === 'string') ? v : bad(f, 'must be an array of strings')
}

export function parseTask(t, machine) {
  if (!t || typeof t !== 'object' || Array.isArray(t)) bad('task', 'must be an object')
  if (typeof t.name !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/.test(t.name)) bad('name', 'must match ^[a-z0-9][a-z0-9_-]*$')
  if (typeof t.repo !== 'string' || !isAbsolute(t.repo)) bad('repo', 'must be an absolute path')
  // check the written, resolved and symlink-resolved forms so no spelling slips past the forbid list
  const repos = [resolve(t.repo), real(resolve(t.repo))]
  const forbid = machine?.forbid?.paths // fail closed: a machine file without a readable forbid list guards nothing
  if (!Array.isArray(forbid) || !forbid.every((f) => typeof f === 'string')) throw new Error('machine forbid.paths must be an array of strings')
  for (const f of forbid) {
    const roots = [resolve(f), real(resolve(f))]
    if (repos.some((r) => roots.some((root) => under(r, root)))) bad('repo', `is under forbidden path ${f}`)
  }
  if (t.db !== null && !(typeof t.db === 'string' && /^bench_[a-z0-9_]+$/.test(t.db))) bad('db', 'must be null or match ^bench_[a-z0-9_]+$')
  if (!Number.isInteger(t.port) || t.port < 1024 || t.port > 65535) bad('port', 'must be an integer from 1024 to 65535')
  const timeoutSec = t.timeoutSec ?? 1800
  if (!Number.isInteger(timeoutSec) || timeoutSec <= 0) bad('timeoutSec', 'must be a positive integer')
  if (t.testTitle !== undefined) {
    try { if (typeof t.testTitle !== 'string') throw 0; new RegExp(t.testTitle) } catch { bad('testTitle', 'must be a valid regex source string') }
  }
  const layers = t.layers ?? {}
  if (typeof layers !== 'object' || Array.isArray(layers)) bad('layers', 'must be an object')
  return {
    name: t.name, repo: t.repo, db: t.db, port: t.port,
    setup: list(t, 'setup'), start: str(t, 'start'), ready: str(t, 'ready'),
    oracle: str(t, 'oracle'), junit: str(t, 'junit'), teardown: list(t, 'teardown'),
    testTitle: t.testTitle, layers, timeoutSec,
  }
}

export async function loadTask(path) {
  const machinePath = process.env.HSTACK_BENCH_MACHINE
  if (!machinePath) throw new Error('set HSTACK_BENCH_MACHINE to the machine file (for example .evidence/bench/machine.json)')
  return parseTask(await Bun.file(path).json(), await Bun.file(machinePath).json())
}
