#!/usr/bin/env bun
// Count the replay verdicts in <results dir> per layer and bug set, as markdown. It reads ids, verdicts, severities and
// usage only: never a description, quote, finding, fix, file or hunk, so it is safe on a sealed set.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const USAGE = 'usage: bun bench/replay-summary.mjs <results dir> --set <name>=<bug folder> [--set <name>=<bug folder> ...]'
const LAYERS = ['unit', 'int', 'e2e', 'evaluator', 'review', 'audit']
const EXT = { unit: 'out', int: 'out', e2e: 'out', evaluator: 'json', review: 'json', audit: 'json' }
const WEIGHT = { high: 3, medium: 2, low: 1 }
const FILE = new RegExp(`^(.+)-(${LAYERS.join('|')})(\\.error1)?\\.(out|json)$`)
const SHOWN_ID = /^(ho|[0-9a-f]{7})-\d+$/, MODEL = /^claude-[a-z0-9-]+$/ // anything else a file's writer chose prints as other-value
const USAGE_KEYS = ['input', 'output', 'cacheRead', 'cacheWrite']

const verdictOf = (v) => (v === 'caught' || v === 'missed' ? v : 'error')
const readJson = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return undefined } }
const rate = (c, m) => (c + m ? `${((100 * c) / (c + m)).toFixed(1)}%` : 'n/a')

// { id, severity } of every live bug file of a folder, and how many files were unreadable
function readBugs(folder) {
  const bugs = [], names = readdirSync(folder).filter((n) => n.endsWith('.json') && !n.endsWith('.run.json') && !/(^|-)done\.json$/.test(n)).sort()
  let invalid = 0
  for (const n of names) {
    const b = readJson(join(folder, n))
    if (typeof b?.id !== 'string' || !SHOWN_ID.test(b.id)) invalid++
    else if (!b.dropped) bugs.push({ id: b.id, severity: b.severity }) // a dropped bug is out of every set
  }
  return { bugs, invalid }
}

// results/ -> Map "<id>\0<layer>" -> { verdict, usage?, models? }; a good file wins over an .error1 one
function readResults(dir) {
  const got = new Map()
  for (const n of readdirSync(dir).sort()) {
    const m = FILE.exec(n)
    if (!m || EXT[m[2]] !== m[4]) continue
    const [, id, layer, err, ext] = m, key = `${id}\0${layer}`
    if (err) { if (!got.has(key)) got.set(key, { verdict: 'error' }); continue }
    if (ext === 'out') {
      const last = readFileSync(join(dir, n), 'utf8').split('\n').map((l) => l.trim()).filter(Boolean).at(-1)
      const [who, v] = last?.split(' ') ?? []
      got.set(key, { verdict: who === id && last.split(' ').length === 2 ? verdictOf(v) : 'error' })
    } else {
      const r = readJson(join(dir, n))
      got.set(key, { verdict: verdictOf(r?.verdict), usage: r?.usage, models: r?.models })
    }
  }
  return got
}

// unit+int: caught by either; else error if either errored (unknown), else missed
const either = (a, b) => {
  const vs = [a, b].filter(Boolean)
  return vs.includes('caught') ? 'caught' : !vs.length ? undefined : vs.includes('error') ? 'error' : 'missed'
}

function summarize(results, name, folder) {
  const { bugs, invalid } = readBugs(folder)
  const verdicts = bugs.map((b) => {
    const v = Object.fromEntries(LAYERS.map((l) => [l, results.get(`${b.id}\0${l}`)?.verdict]))
    return { ...b, v: { ...v, 'unit+int': either(v.unit, v.int) } }
  })
  const rows = [...LAYERS.slice(0, 3), 'unit+int', ...LAYERS.slice(3)]
  const out = [`## ${name}`, '', `bugs ${bugs.length}${invalid ? `, unreadable bug files ${invalid}` : ''}`, '', '| layer | n | caught | missed | error | catch rate |', '|---|---|---|---|---|---|']
  const count = (l, f = () => true) => ['caught', 'missed', 'error'].map((k) => verdicts.filter((b) => b.v[l] === k && f(b)).length)
  for (const l of rows) {
    const [c, m, e] = count(l)
    out.push(`| ${l} | ${c + m + e} | ${c} | ${m} | ${e} | ${rate(c, m)} |`)
  }
  if (verdicts.some((b) => WEIGHT[b.severity])) { // error runs and bugs without a severity are left out
    out.push('', 'Severity-weighted catch rate (high 3, medium 2, low 1; error runs left out):', '', '| layer | weighted caught | weighted caught + missed | rate |', '|---|---|---|---|')
    for (const l of rows) {
      const w = (k) => verdicts.filter((b) => b.v[l] === k).reduce((s, b) => s + (WEIGHT[b.severity] ?? 0), 0)
      out.push(`| ${l} | ${w('caught')} | ${w('caught') + w('missed')} | ${rate(w('caught'), w('missed'))} |`)
    }
  }
  const spent = LAYERS.map((l) => {
    const sum = Object.fromEntries(USAGE_KEYS.map((k) => [k, 0])), models = new Set()
    let n = 0
    for (const b of bugs) {
      const r = results.get(`${b.id}\0${l}`)
      if (!r?.usage) continue
      n++
      for (const part of ['layer', 'judge']) {
        for (const k of USAGE_KEYS) sum[k] += Number.isFinite(r.usage[part]?.[k]) ? r.usage[part][k] : 0
        for (const x of r.models?.[part] ?? []) models.add(typeof x === 'string' && MODEL.test(x) ? x : 'other-value')
      }
    }
    return n ? `| ${l} | ${n} | ${USAGE_KEYS.map((k) => sum[k]).join('/')} | ${[...models].sort().join(',') || 'none'} |` : undefined
  }).filter(Boolean)
  if (spent.length) out.push('', 'Usage (layer + judge, input/output/cacheRead/cacheWrite):', '', '| layer | records | usage | models |', '|---|---|---|---|', ...spent)
  out.push('', '| bug | ' + rows.join(' | ') + ' |', '|---|' + rows.map(() => '---|').join(''))
  for (const b of verdicts.sort((x, y) => (x.id < y.id ? -1 : 1))) out.push(`| ${b.id} | ${rows.map((l) => b.v[l] ?? '-').join(' | ')} |`)
  return out.join('\n')
}

export function replaySummary(args) {
  const sets = []
  let dir
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--set') {
      const m = /^([^=]+)=(.+)$/.exec(args[++i] ?? '')
      if (!m) throw new Error(USAGE)
      sets.push([m[1], m[2]])
    } else if (dir === undefined) dir = args[i]
    else throw new Error(USAGE)
  }
  if (!dir || !sets.length) throw new Error(USAGE)
  const results = readResults(dir)
  return `# Replay summary\n\n${sets.map(([n, f]) => summarize(results, n, f)).join('\n\n')}\n`
}

if (import.meta.main) {
  try { process.stdout.write(replaySummary(process.argv.slice(2))) } catch (e) { console.error(e.message); process.exit(2) }
}
