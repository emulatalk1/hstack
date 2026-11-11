#!/usr/bin/env bun
// The scored runs (step 13): arms H, B and W (W on external tasks only), k = 3 standing runs per arm and task, on the tasks named in
// <data>/step13/tasks.txt. It is the trial's driver (bench/trial.mjs) with other slots and its own floor and attempts files under
// <data>/step13/. `report` prints counts only; `table` (the per-run scores) is step 14's and is refused until it registers.
// Nothing here names a task, a stack or a model.
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { aboveFloor, ATTEMPTS, attemptsOf, attemptKey, context, good, gradeFile, readJson, records, runStopped, Stop, standing } from './canary.mjs'
import { dataOf, PRIVATE_SET, taskOf } from './ext.mjs'
import { queuePick } from './lib/oracle.mjs'
import { ScoreMissing, scoreAt, seedOf } from './oracle.mjs'

const USAGE = 'usage: bun bench/scored.mjs run <task> | order | claim <lane> [--done <task> | --release] | report | table'
const K = 3, STALE_MS = 10 * 60000
const lines = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : [])
const tasksOf = (data) => lines(join(data, 'step13/tasks.txt'))
const boxFile = (data, task) => join(data, 'env/box', `${task}.json`)
// a file the lanes share is written whole or not at all: a temp file in the same folder, then a rename (a leftover temp file is never read)
const writeAtomic = (f, text) => { writeFileSync(`${f}.tmp`, text); renameSync(`${f}.tmp`, f) }
// a file the controller or a lane wrote must parse: missing is `fallback`, present but unreadable stops the command (exit 2)
const strictJson = (f, fallback, ok, what) => {
  if (!existsSync(f)) return fallback
  let v
  try { v = JSON.parse(readFileSync(f, 'utf8')) } catch { throw new Error(`${f} is not valid JSON`) }
  if (!ok(v)) throw new Error(`${f} is not ${what}`)
  return v
}
const isPrivate = (data, task) => taskOf(join(data, 'ext'), task).stack === PRIVATE_SET.stack
const armsOf = (data, task) => (isPrivate(data, task) ? ['H', 'B'] : ['H', 'B', 'W'])
const setOf = (data, task) => (isPrivate(data, task) ? PRIVATE_SET.key : 'external')

// the oracle kinds of a task, as scoreAt reads them: step/oracle only when step.json names it and has ids
const kindsOf = (data, task) => {
  const s = readJson(join(data, task, 'step.json'))
  if (!s || !Array.isArray(s.ids)) throw new Error(`${task}: ${join(task, 'step.json')} is missing or not a step.json`)
  return [{ oracle: 'oracle', grades: 'grades' }, ...(s.oracle === 'step/oracle' && s.ids.length ? [{ oracle: 'step/oracle', grades: 'step/grades' }] : [])]
}
// ruling 2: the highest run number per arm when `run` first touched the task; without one, no record counts.
// One file per task (and one attempts file per task): two lanes never share a read-modify-write.
const floorFile = (data, task) => join(data, 'step13/floor', `${task}.json`)
const attemptsFile = (task) => `step13/attempts/${task}.json`
export const floorOf = (data, task) => readJson(floorFile(data, task)) ?? { H: Infinity, B: Infinity, W: Infinity }
function setFloor(data, task) {
  if (existsSync(floorFile(data, task))) return // never overwritten
  const top = (arm) => Math.max(0, ...records(data, task).filter((r) => r.arm === arm).map((r) => r.run))
  mkdirSync(join(data, 'step13/floor'), { recursive: true })
  writeAtomic(floorFile(data, task), JSON.stringify({ H: top('H'), B: top('B'), W: top('W') }, null, 2) + '\n')
}
const opts = (data, task) => ({ slots: armsOf(data, task).flatMap((a) => Array.from({ length: K }, (_, i) => `${a}:${i + 1}`)), k: K, envDir: 'env/box', taskFile: boxFile, kinds: kindsOf, attempts: attemptsFile(task), floor: floorOf })

// ruling 3: the CLI version of the earliest machine-null record of the set (any task of tasks.txt, above its floor); a record of this task
// with another one stops the driver, before a run and after it, so a resume does not count a mismatched run. A machine run is not judged by it.
function checkVersion(data, task) {
  const live = (t) => aboveFloor(records(data, t), floorOf(data, t)).filter((r) => r.machine === null)
  const first = tasksOf(data).flatMap(live).sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0]
  if (first && live(task).some((r) => r.version !== first.version)) throw new Stop('version')
}

// the standing runs of the set, per task and arm
const standingOf = (c, task, cfg) => armsOf(c.data, task).flatMap((arm) => standing(aboveFloor(records(c.data, task), floorOf(c.data, task)), arm, cfg, K))
const finalKinds = (c, task, sha) => kindsOf(c.data, task).map((k) => ({ k, own: readJson(gradeFile(c.data, task, sha, k.grades))?.commit === sha, ok: good(c.data, task, sha, k.grades), tries: attemptsOf(c.data, attemptsFile(task))[attemptKey(k, sha)] ?? 0 }))

async function report(c) {
  const cfg = readJson(join(c.data, 'arms.json')), rows = {}
  for (const task of tasksOf(c.data)) {
    const set = setOf(c.data, task), recs = aboveFloor(records(c.data, task), floorOf(c.data, task)), stands = standingOf(c, task, cfg)
    for (const arm of armsOf(c.data, task)) {
      const row = (rows[`${set} ${arm}`] ??= { standing: 0, machine: {}, noresult: 0, versions: {}, tokens: 0, minutes: 0 })
      for (const r of recs.filter((x) => x.arm === arm && x.machine !== null)) row.machine[r.machine] = (row.machine[r.machine] ?? 0) + 1
      for (const r of stands.filter((x) => x.arm === arm)) {
        row.standing++
        row.versions[r.version ?? 'none'] = (row.versions[r.version ?? 'none'] ?? 0) + 1
        row.tokens += (r.usage?.input ?? 0) + (r.usage?.output ?? 0)
        row.minutes += (Date.parse(r.end) - Date.parse(r.start)) / 60000
        const sha = r.branch ? await c.sha(task, r.branch) : null
        if (sha && finalKinds(c, task, sha).some((x) => !x.ok && x.tries >= ATTEMPTS)) row.noresult++
      }
    }
  }
  for (const [key, r] of Object.entries(rows)) {
    console.log(`${key} standing=${r.standing} machine=${Object.entries(r.machine).map(([k, n]) => `${k}:${n}`).join(',') || 'none'} noresult=${r.noresult} versions=${Object.entries(r.versions).map(([k, n]) => `${k}:${n}`).join(',') || 'none'} tokens=${r.tokens} minutes=${r.minutes.toFixed(1)}`) // no interventions: H3's measure waits for step 14 (M-2)
  }
  return 0
}

// step 14's: the per-run scores of the standing runs, written to step13/table.json
async function table(c) {
  const registered = join(c.data, 'step14/registered')
  if (!existsSync(registered)) throw new Error(`table refused: ${registered} is missing (step 14 registers its plan first)`)
  const cfg = readJson(join(c.data, 'arms.json')), runs = []
  for (const task of tasksOf(c.data)) {
    for (const r of standingOf(c, task, cfg)) {
      const sha = await c.sha(task, r.branch)
      let s = null
      // a score only from a final grade: every kind good, or at its second attempt
      if (finalKinds(c, task, sha).every((x) => x.own && (x.ok || x.tries >= ATTEMPTS))) {
        try { s = scoreAt(c.data, task, sha) } catch (e) { if (!(e instanceof ScoreMissing)) throw e }
      }
      runs.push({ task, set: setOf(c.data, task), arm: r.arm, run: r.run, build: s?.build ?? null, requirement: s?.requirement ?? null, passed: s?.passed ?? null,
        tokens: (r.usage?.input ?? 0) + (r.usage?.output ?? 0), minutes: (Date.parse(r.end) - Date.parse(r.start)) / 60000, interventions: r.interventions ?? 0, end: r.reason ?? r.status })
    }
  }
  writeFileSync(join(c.data, 'step13/table.json'), JSON.stringify({ at: new Date().toISOString(), runs }, null, 2) + '\n')
  console.log(`table ${runs.length} runs`)
  return 0
}

// the one queue of the two lanes: `mkdir queue.lock` with a pid file, always removed; a lock older than 10 minutes whose pid is dead is reclaimed.
// shortcut: two reclaimers racing on one stale lock can both win, needs a crashed holder and a same-instant claim; upgrade to rename-then-mkdir if seen.
const alive = (pid) => { try { process.kill(pid, 0); return true } catch (e) { return e.code === 'EPERM' } }
async function locked(data, waitMs, fn) {
  const dir = join(data, 'step13/queue.lock'), t0 = Date.now()
  mkdirSync(join(data, 'step13'), { recursive: true })
  for (;;) {
    try { mkdirSync(dir); break } catch (e) {
      if (e.code !== 'EEXIST') throw e
      let age = 0, pid = NaN
      try { age = Date.now() - statSync(dir).mtimeMs; pid = Number(readFileSync(join(dir, 'pid'), 'utf8')) } catch {}
      if (age > STALE_MS && !alive(pid)) { rmSync(dir, { recursive: true, force: true }); continue }
      if (Date.now() - t0 > waitMs) throw new Error(`${dir} is held by pid ${pid}`)
      await Bun.sleep(25)
    }
  }
  try { writeFileSync(join(dir, 'pid'), String(process.pid)); return await fn() } finally { rmSync(dir, { recursive: true, force: true }) }
}

// prints the next task of `order` that is not done, not running and not excluded, else `none` (something is left) or `empty` (all done).
// --done <task> first moves the lane's task to done; --release clears it without that and claims nothing.
// Exclusions: never two private-set tasks at once; never two tasks of a group of <data>/step13/exclusive.json (a missing file: no groups).
async function claim(data, lane, flag, arg, waitMs) {
  const order = queuePick(tasksOf(data), tasksOf(data).length, seedOf(data)), groups = strictJson(join(data, 'step13/exclusive.json'), [], (v) => Array.isArray(v) && v.every((g) => Array.isArray(g) && g.every((t) => typeof t === 'string')), 'an array of arrays of task ids')
  return locked(data, waitMs, async () => {
    const f = join(data, 'step13/queue.json'), q = { done: [], running: {}, ...strictJson(f, {}, (v) => v && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.done ?? []) && typeof (v.running ?? {}) === 'object', '{ done: [], running: {} }') }
    const idle = () => (order.every((t) => q.done.includes(t)) ? 'empty' : 'none')
    let out
    if (flag === '--release') { delete q.running[lane]; out = idle() }
    else {
      if (flag === '--done') {
        if (q.running[lane] !== arg) throw new Error(`${lane} is not running ${arg}`)
        delete q.running[lane]
        q.done.push(arg)
      }
      const run = Object.values(q.running)
      const blocked = (t) => (isPrivate(data, t) && run.some((x) => isPrivate(data, x))) || groups.some((g) => g.includes(t) && g.some((x) => run.includes(x)))
      const next = q.running[lane] ? null : order.find((t) => !q.done.includes(t) && !run.includes(t) && !blocked(t))
      if (next) q.running[lane] = next
      out = next ?? idle()
    }
    writeAtomic(f, JSON.stringify(q, null, 2) + '\n')
    return out
  })
}

export async function scored(args, inj = {}) {
  const [cmd, task, ...rest] = args, data = dataOf(), c = context(data, 'env/box', { ...inj, prune: async () => {} }) // step 13's prune is the controller's, between tasks
  if (cmd === 'order' && args.length === 1) { const t = tasksOf(data); for (const x of queuePick(t, t.length, seedOf(data))) console.log(x); return 0 }
  if (cmd === 'claim' && /^[a-z0-9][a-z0-9_-]*$/.test(task ?? '') && (!rest.length || (rest[0] === '--done' && rest.length === 2) || (rest[0] === '--release' && rest.length === 1))) {
    console.log(await claim(data, task, rest[0], rest[1], inj.lockWaitMs ?? 30000))
    return 0
  }
  if (cmd === 'report' && args.length === 1) return report(c)
  if (cmd === 'table' && args.length === 1) return table(c)
  if (cmd === 'run' && /^[a-z0-9][a-z0-9_-]*$/.test(task ?? '') && !rest.length) {
    if (!tasksOf(data).includes(task)) throw new Error(`${task} is not in step13/tasks.txt`)
    if (!existsSync(boxFile(data, task))) throw new Error(`${task}: ${boxFile(data, task)} is missing (ext box-env)`)
    kindsOf(data, task) // throws on a step.json that is missing or not one
    setFloor(data, task)
    const runArm = c.runArm
    c.runArm = async (a) => { // the version is read once the run's record is written
      const code = await runArm(a)
      checkVersion(data, task)
      return code
    }
    try { checkVersion(data, task) } catch (e) {
      if (!(e instanceof Stop)) throw e
      console.log(`${task} stopped: ${e.message}`)
      return 3
    }
    return runStopped(c, task, opts(data, task))
  }
  throw new Error(USAGE)
}

if (import.meta.main) {
  try { process.exit(await scored(process.argv.slice(2))) } catch (e) { console.error(e.message); process.exit(2) }
}
