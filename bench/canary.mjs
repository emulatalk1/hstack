#!/usr/bin/env bun
// The canary (step 8): B and B- on the first 2 tasks of each stack, k = 2 standing runs per arm. `run <task>` goes in queuePick order, each
// product graded right after its run, resuming from results/ and grades/; `report` scores and judges; `diagnose` (verdict fail only) is ruling 14.
// A run stands when its record has machine null and the arm's configured model. Nothing here names a task, a stack or a model.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { dataOf, DISK_FLOOR_GB, dockerDiskFree, daemon as dockerDaemon, must, oracleCommand, parseSize, sp, taskOf } from './ext.mjs'
import { grade as gradeRun, resolveCommit } from './grade.mjs'
import { armArgs } from './lib/arm.mjs'
import { queuePick } from './lib/oracle.mjs'
import { canaryScore, canaryVerdict, intervalVerdict } from './lib/score.mjs'
import { loadTask } from './lib/task.mjs'
import { scoreAt, seedOf } from './oracle.mjs'
import { runArm } from './run-arm.mjs'

const USAGE = 'usage: bun bench/canary.mjs run <task> | report | diagnose'
const SEED = 'hstack-bench-2026-10-27' // the extended verdict's bootstrap seed (prereg 7.3)
const K = 2, ATTEMPTS = 2, CACHE_LIMIT = 15e9, PAIRS = 3, MACHINE_RUNS = 2, ARMS = ['B', 'B-']
const readJson = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')) } catch { return null } }
const fx = (x, digits = 2) => (typeof x === 'number' ? x.toFixed(digits) : 'none')
class Stop extends Error {}

// ruling 1: the first 2 tasks of each stack in sample.tsv order
export function canaryTasks(data) {
  const [head, ...rows] = readFileSync(join(data, 'ext/sample.tsv'), 'utf8').trim().split('\n').map((l) => l.split('\t'))
  const task = head.indexOf('task'), stack = head.indexOf('stack'), seen = {}
  return rows.filter((r) => (seen[r[stack]] = (seen[r[stack]] ?? 0) + 1) <= K).map((r) => r[task])
}

// the extended canary (7.3, 2026-11-07): the kept tasks that are not cold-setup and not the canary's, in sample.tsv order
export function extendedTasks(data) {
  const [head, ...rows] = readFileSync(join(data, 'ext/sample.tsv'), 'utf8').trim().split('\n').map((l) => l.split('\t'))
  const task = head.indexOf('task'), cold = head.indexOf('cold_setup'), six = canaryTasks(data)
  return rows.filter((r) => r[cold] === 'no' && !six.includes(r[task])).map((r) => r[task])
}

const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const records = (data, task) => {
  const re = new RegExp(`^${reEsc(task)}-(B-?)-(\\d+)\\.json$`), dir = join(data, 'results')
  return (existsSync(dir) ? readdirSync(dir) : []).filter((f) => re.test(f)).map((f) => readJson(join(dir, f))).filter(Boolean)
}
// the k lowest-numbered runs of an arm that are not the machine's and ran on the arm's model now configured
const standing = (recs, arm, cfg) => recs.filter((r) => r.arm === arm && r.machine === null && r.model === (armArgs(arm, cfg).model ?? null)).sort((a, b) => a.run - b.run).slice(0, K)

const readiness = (data, task, sha7) => {
  const f = join(data, task, 'build/readiness.tsv')
  let last = null
  for (const l of existsSync(f) ? readFileSync(f, 'utf8').split('\n') : []) { const [s, r] = l.split('\t'); if (s === sha7 && r) last = r }
  return last
}
// the task file the grades use: the task's own with only `oracle` changed, so the oracle-run is this checkout's, not the one the
// task file (hashed in the locks) names. Written when missing or different; runArm keeps env/<task>.json, it never runs the oracle.
function canaryTaskFile(data, task) {
  const t = JSON.parse(readFileSync(join(data, 'env', `${task}.json`), 'utf8')), file = join(data, 'env/canary', `${task}.json`)
  const text = JSON.stringify({ ...t, oracle: oracleCommand(task) }, null, 2) + '\n'
  if (!existsSync(file) || readFileSync(file, 'utf8') !== text) { mkdirSync(join(data, 'env/canary'), { recursive: true }); writeFileSync(file, text) }
  return file
}
const gradeFile = (data, task, sha) => join(data, task, 'grades', `${sha.slice(0, 7)}.json`)
// a grade is good when it is this commit's, has a JUnit, the app got ready and some check gave a result (a runner that dies
// after ready leaves a placeholder JUnit, every check `error`)
const good = (data, task, sha) => {
  const g = readJson(gradeFile(data, task, sha))
  return g?.commit === sha && g.junit === 'ok' && readiness(data, task, sha.slice(0, 7)) === 'ready' && g.checks?.some((c) => c.result !== 'error') === true
}
const attemptsFile = (data) => join(data, 'canary/attempts.json')
const attemptsOf = (data) => readJson(attemptsFile(data)) ?? {}
function bump(data, sha) {
  const a = attemptsOf(data)
  a[sha] = (a[sha] ?? 0) + 1
  mkdirSync(join(data, 'canary'), { recursive: true })
  writeFileSync(attemptsFile(data), JSON.stringify(a, null, 2) + '\n')
}

// ruling 10: the machine's failure is the daemon or the disk, never a grade's result
async function machineDown(c) {
  try { await c.daemon() } catch { return true }
  const free = await Promise.resolve(c.diskFree()).catch(() => null)
  return free !== null && free < DISK_FLOOR_GB
}

// grade the run's product until it has a good grade or ATTEMPTS grades; { label, did }
async function gradeProduct(c, task, rec) {
  const sha = await shaOf(c, task, rec), env = canaryTaskFile(c.data, task), file = gradeFile(c.data, task, sha)
  let did = false
  while (!good(c.data, task, sha) && (attemptsOf(c.data)[sha] ?? 0) < ATTEMPTS) {
    did = true
    rmSync(file, { force: true }) // an attempt that writes nothing must not leave the one before it standing
    // a throw is never an attempt (its message may be sealed, so it is not printed): the driver stops
    try { await c.grade([env, join(c.data, task, 'oracle'), '--at', sha, '--sealed']) } catch { rmSync(file, { force: true }); throw new Stop('machine') }
    if (!good(c.data, task, sha) && (await machineDown(c))) { rmSync(file, { force: true }); throw new Stop('machine') } // an attempt the machine spoiled is not counted
    bump(c.data, sha)
  }
  // under --sealed a memory kill reads as no result, so it counts as noresult like any other
  return { did, label: good(c.data, task, sha) ? ((attemptsOf(c.data)[sha] ?? 0) > 1 ? 'again' : 'ok') : 'noresult' }
}

// every stop is exit 3: a throw is told on stderr and read as the machine's when the daemon or disk is down, else a refusal
async function stopOnThrow(c, fn) {
  try { return await fn() } catch (e) {
    if (e instanceof Stop) throw e
    console.error(e.message)
    throw new Stop((await machineDown(c)) ? 'machine' : 'refused')
  }
}
const shaOf = (c, task, rec) => stopOnThrow(c, () => c.sha(task, rec.branch))

async function runTask(c, task) {
  const cfg = readJson(join(c.data, 'arms.json')), env = join(c.data, 'env', `${task}.json`)
  const base = taskOf(join(c.data, 'ext'), task).base
  if ((await c.cacheBytes()) > CACHE_LIMIT) await c.prune()
  // ruling 12: the order of the 4 slots; the j-th slot of an arm is that arm's j-th standing run
  const seq = queuePick(['B:1', 'B:2', 'B-:1', 'B-:2'].map((s) => `${task}:${s}`), 4, seedOf(c.data)).map((s) => s.split(':')[1])
  const slot = {}
  for (const arm of seq) {
    const j = (slot[arm] = (slot[arm] ?? 0) + 1)
    let rec, ran = false, machineRuns = 0
    for (;;) {
      const recs = records(c.data, task), have = standing(recs, arm, cfg)
      if (have.length >= j) { rec = have[j - 1]; break }
      const n = Math.max(0, ...recs.filter((r) => r.arm === arm).map((r) => r.run)) + 1
      const code = await stopOnThrow(c, () => c.runArm([env, arm, String(n), '--input', join(c.data, task, 'input.md'), '--at', base]))
      ran = true
      if (code === 2) throw new Stop('refused')
      const made = records(c.data, task).find((r) => r.arm === arm && r.run === n)
      if (code === 3) {
        if (!made) throw new Stop('machine')
        if (made.machine === 'api') throw new Stop('api')
        if (made.machine === 'memory') console.log(`${task} ${arm} ${n} machine memory`) // the user is told
        if (++machineRuns >= MACHINE_RUNS) throw new Stop('machine') // the box keeps failing: stop before more tokens go
        continue // the machine's failure: the next number takes this slot's place
      }
      if (!standing(records(c.data, task), arm, cfg).some((r) => r.run === n)) throw new Error(`${task} ${arm} ${n}: the record does not stand after exit ${code}`)
    }
    const { did, label } = await gradeProduct(c, task, rec)
    if (ran || did) console.log(`${task} ${arm} ${rec.run} ${rec.status} grade=${label}`)
  }
  return 0
}

async function report(c) {
  const cfg = readJson(join(c.data, 'arms.json')), tasks = canaryTasks(c.data), extended = extendedTasks(c.data), runs = []
  for (const task of [...tasks, ...extended]) {
    const recs = records(c.data, task), stands = ARMS.flatMap((a) => standing(recs, a, cfg))
    for (const rec of ARMS.flatMap((a) => recs.filter((r) => r.arm === a).sort((x, y) => x.run - y.run))) {
      const row = { task, arm: rec.arm, run: rec.run, status: rec.status, machine: rec.machine ?? null, standing: stands.includes(rec),
        tokens: (rec.usage?.input ?? 0) + (rec.usage?.output ?? 0), cacheRead: rec.usage?.cacheRead ?? 0, minutes: (Date.parse(rec.end) - Date.parse(rec.start)) / 60000,
        toolUses: rec.toolUses ?? {}, envCommit: rec.envCommit ?? null, sha: null, build: null, requirement: null, score: null, noresult: false, memory: false }
      if (row.standing) {
        try {
          row.sha = await c.sha(task, rec.branch)
          const g = readJson(gradeFile(c.data, task, row.sha)), ok = good(c.data, task, row.sha)
          row.memory = readiness(c.data, task, row.sha.slice(0, 7)) === 'memory'
          // only a final grade scores: a good one, or the second attempt's whatever it gave; anything else is not judged
          if (g?.commit === row.sha && (ok || (attemptsOf(c.data)[row.sha] ?? 0) >= ATTEMPTS)) {
            const s = scoreAt(c.data, task, row.sha)
            Object.assign(row, { build: s.build, requirement: s.requirement, score: canaryScore(s.build, s.requirement), noresult: !ok })
          }
        } catch {} // no grade file yet: no score, and the verdict stays not judged
      }
      runs.push(row)
    }
  }
  const scoredRuns = runs.filter((r) => r.score !== null), v = canaryVerdict(scoredRuns.filter((r) => tasks.includes(r.task)))
  const ev = intervalVerdict(scoredRuns, extended, SEED), all = intervalVerdict(scoredRuns, [...tasks, ...extended], SEED)
  const extVerdict = ev.judged ? (ev.pass ? 'pass' : 'fail') : 'not judged'
  const spread = (task, k) => { const b = runs.filter((r) => r.task === task && r.arm === 'B' && r.standing && r.score !== null); return b.length === 2 ? Math.abs(b[0][k] - b[1][k]) : null }
  const rowOf = (vt) => (task) => ({ b: null, bMinus: null, d: null, dBuild: null, dRequirement: null, spread: null, favour: false, ...vt.find((t) => t.task === task), task,
    spreadTokens: spread(task, 'tokens'), spreadMinutes: spread(task, 'minutes'), noresult: runs.filter((r) => r.task === task && r.noresult).length })
  const rows = tasks.map(rowOf(v.tasks)), extRows = extended.map(rowOf(ev.tasks)).filter((t) => runs.some((r) => r.task === t.task))
  const six = runs.filter((r) => tasks.includes(r.task)), noresult = six.filter((r) => r.noresult).length, verdict = v.judged ? (v.pass ? 'pass' : 'fail') : 'not judged'
  mkdirSync(join(c.data, 'canary'), { recursive: true })
  writeFileSync(join(c.data, 'canary/report.json'), JSON.stringify({ at: new Date().toISOString(), tasks: rows, runs, mean: v.mean, favour: v.favour, judged: v.judged, verdict, noresult,
    extended: { ...ev, tasks: extRows, verdict: extVerdict }, all20: { mean: all.mean, lower: all.lower, upper: all.upper, favour: all.favour, judged: all.judged } }, null, 2) + '\n')
  const show = (t) => {
    console.log(`${t.task} b=${fx(t.b)} bMinus=${fx(t.bMinus)} d=${fx(t.d)} dBuild=${fx(t.dBuild)} dRequirement=${fx(t.dRequirement)} spread=${fx(t.spread)} spreadTokens=${fx(t.spreadTokens, 0)} spreadMinutes=${fx(t.spreadMinutes, 1)} noresult=${t.noresult}`)
    for (const r of runs.filter((x) => x.task === t.task)) {
      const tools = r.arm === 'B-' ? ` tools=${Object.entries(r.toolUses).map(([k, n]) => `${k}:${n}`).join(',') || 'none'}` : ''
      console.log(`${r.task} ${r.arm} ${r.run} tokens=${r.tokens} cacheRead=${r.cacheRead} minutes=${fx(r.minutes, 1)} status=${r.status} machine=${r.machine ?? (r.standing ? 'none' : 'superseded')} score=${fx(r.score)}${tools}`)
    }
  }
  rows.forEach(show)
  console.log(`noresult=${noresult}`)
  for (const r of runs.filter((x) => x.memory)) console.log(`${r.task} ${r.arm} ${r.run} killed for memory`) // told: --sealed cannot show it
  console.log(`canary mean=${fx(v.mean, 3)} favour=${v.favour}/${tasks.length} verdict=${verdict}`)
  extRows.forEach(show)
  console.log(`extended mean=${fx(ev.mean, 3)} lower=${fx(ev.lower, 6)} upper=${fx(ev.upper, 6)} t_lower=${fx(ev.tLower, 6)} t_upper=${fx(ev.tUpper, 6)} favour=${ev.favour}/${extended.length} verdict=${extVerdict}`)
  console.log(`all20 mean=${fx(all.mean, 3)} lower=${fx(all.lower, 6)} favour=${all.favour}/${tasks.length + extended.length} judged=${all.judged ? 'yes' : 'no'}`)
  return 0
}

// ruling 14: counts of the seeded grades of the B- products, and 3 B/B- pairs as git diffs for the user to read
async function diagnose(c) {
  const rep = readJson(join(c.data, 'canary/report.json'))
  if (rep?.verdict !== 'fail') throw new Error(`diagnose refused: the last report's verdict is ${rep?.verdict ?? 'missing'}, not fail`)
  const mine = rep.runs.filter((r) => r.standing && r.score !== null && rep.tasks.some((t) => t.task === r.task)) // the original six only
  for (const r of mine.filter((x) => x.arm === 'B-')) {
    const sha7 = r.sha.slice(0, 7)
    await c.grade([canaryTaskFile(c.data, r.task), join(c.data, r.task, 'seeded/oracle'), '--at', r.sha, '--sealed'])
    const g = readJson(join(c.data, r.task, 'seeded/grades', `${sha7}.json`))
    if (!g) { console.log(`${r.task} B- ${r.run} seeded no grade`); continue }
    const out = new Set((g.excluded ?? []).map((e) => e.id)), n = (k) => g.checks.filter((x) => !out.has(x.id) && x.result === k).length
    console.log(`${r.task} B- ${r.run} seeded pass=${n('pass')} fail=${n('fail')} precondition=${n('precondition')} error=${n('error')}`)
  }
  const rank = queuePick(rep.tasks.map((t) => t.task), rep.tasks.length, seedOf(c.data))
  const lowest = rep.tasks.filter((t) => t.d !== null).sort((a, b) => a.d - b.d || rank.indexOf(a.task) - rank.indexOf(b.task)).slice(0, PAIRS)
  mkdirSync(join(c.data, 'canary/pairs'), { recursive: true })
  for (const t of lowest) {
    for (const arm of ARMS) {
      const r = mine.filter((x) => x.task === t.task && x.arm === arm).sort((a, b) => a.run - b.run)[0]
      writeFileSync(join(c.data, 'canary/pairs', `${t.task}-${arm}.diff`), await c.diff(t.task, r.envCommit, r.sha))
    }
    console.log(`${t.task} pair d=${fx(t.d)}`)
  }
  return 0
}

// the diff reads the task repo with no external diff and no textconv: nothing the repo configures runs
async function gitDiff(data, task, from, to) {
  const { repo } = await loadTask(join(data, 'env', `${task}.json`))
  const p = Bun.spawn(['git', '-C', repo, '-c', 'core.fsmonitor=false', 'diff', '--no-ext-diff', '--no-textconv', '--no-color', from, to, '--'], { stdout: 'pipe', stderr: 'pipe' })
  const [out, err, code] = [await new Response(p.stdout).text(), await new Response(p.stderr).text(), await p.exited]
  if (code !== 0) throw new Error(`git diff ${from} ${to} failed (exit ${code}): ${err.trim()}`)
  return out
}

export async function canary(args, inj = {}) {
  const [cmd, task, ...rest] = args, data = dataOf()
  const c = { data, runArm, grade: gradeRun, daemon: dockerDaemon, diskFree: dockerDiskFree,
    cacheBytes: async () => { // the build cache row of `docker system df`; NaN when it cannot be told (no prune)
      const r = await sp(['docker', 'system', 'df', '--format', '{{.Type}}\t{{.Size}}'])
      const row = r.code ? null : r.out.split('\n').map((l) => l.split('\t')).find(([t]) => t === 'Build Cache')
      return row ? parseSize(row[1]) : NaN
    },
    prune: () => must(['docker', 'builder', 'prune', '-f'], 'docker builder prune', { timeoutSec: 1800 }),
    sha: async (t, branch) => resolveCommit((await loadTask(join(data, 'env', `${t}.json`))).repo, `refs/heads/${branch}`),
    diff: (t, from, to) => gitDiff(data, t, from, to), ...inj }
  if (cmd === 'report' && args.length === 1) return report(c)
  if (cmd === 'diagnose' && args.length === 1) return diagnose(c)
  if (cmd === 'run' && /^[a-z0-9][a-z0-9_-]*$/.test(task ?? '') && !rest.length) {
    try { return await runTask(c, task) } catch (e) {
      if (!(e instanceof Stop)) throw e
      console.log(`${task} stopped: ${e.message}`)
      return 3
    }
  }
  throw new Error(USAGE)
}

if (import.meta.main) {
  try { process.exit(await canary(process.argv.slice(2))) } catch (e) { console.error(e.message); process.exit(2) }
}
