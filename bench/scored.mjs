#!/usr/bin/env bun
// The scored runs (step 13): arms H, B and W (W on external tasks only), k = 3 standing runs per arm and task, on the tasks named in
// <data>/step13/tasks.txt. It is the trial's driver (bench/trial.mjs) with other slots and its own floor and attempts files under
// <data>/step13/. `report` prints counts only; `table` (the per-run scores) is step 14's and is refused until it registers.
// Nothing here names a task, a stack or a model.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { aboveFloor, ATTEMPTS, attemptsOf, attemptKey, context, good, gradeFile, readJson, records, runStopped, Stop, standing } from './canary.mjs'
import { dataOf, PRIVATE_SET, taskOf } from './ext.mjs'
import { queuePick } from './lib/oracle.mjs'
import { ScoreMissing, scoreAt, seedOf } from './oracle.mjs'

const USAGE = 'usage: bun bench/scored.mjs run <task> | order | report | table'
const K = 3, ATTEMPTS_FILE = 'step13/attempts.json'
const lines = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : [])
const tasksOf = (data) => lines(join(data, 'step13/tasks.txt'))
const boxFile = (data, task) => join(data, 'env/box', `${task}.json`)
const armsOf = (data, task) => (taskOf(join(data, 'ext'), task).stack === PRIVATE_SET.stack ? ['H', 'B'] : ['H', 'B', 'W'])
const setOf = (data, task) => (taskOf(join(data, 'ext'), task).stack === PRIVATE_SET.stack ? PRIVATE_SET.key : 'external')

// the oracle kinds of a task, as scoreAt reads them: step/oracle only when step.json names it and has ids
const kindsOf = (data, task) => {
  const s = readJson(join(data, task, 'step.json'))
  if (!s || !Array.isArray(s.ids)) throw new Error(`${task}: ${join(task, 'step.json')} is missing or not a step.json`)
  return [{ oracle: 'oracle', grades: 'grades' }, ...(s.oracle === 'step/oracle' && s.ids.length ? [{ oracle: 'step/oracle', grades: 'step/grades' }] : [])]
}
// ruling 2: the highest run number per arm when `run` first touched the task; without one, no record counts
const floorFile = (data) => join(data, 'step13/floor.json')
export const floorOf = (data, task) => readJson(floorFile(data))?.[task] ?? { H: Infinity, B: Infinity, W: Infinity }
function setFloor(data, task) {
  const f = readJson(floorFile(data)) ?? {}
  if (f[task]) return // never overwritten
  const top = (arm) => Math.max(0, ...records(data, task).filter((r) => r.arm === arm).map((r) => r.run))
  mkdirSync(join(data, 'step13'), { recursive: true })
  writeFileSync(floorFile(data), JSON.stringify({ ...f, [task]: { H: top('H'), B: top('B'), W: top('W') } }, null, 2) + '\n')
}
const opts = (data, task) => ({ slots: armsOf(data, task).flatMap((a) => Array.from({ length: K }, (_, i) => `${a}:${i + 1}`)), k: K, envDir: 'env/box', taskFile: boxFile, kinds: kindsOf, attempts: ATTEMPTS_FILE, floor: floorOf })

// ruling 3: the CLI version of the earliest machine-null record of the set (any task of tasks.txt, above its floor); a record of this task
// with another one stops the driver, before a run and after it, so a resume does not count a mismatched run. A machine run is not judged by it.
function checkVersion(data, task) {
  const live = (t) => aboveFloor(records(data, t), floorOf(data, t)).filter((r) => r.machine === null)
  const first = tasksOf(data).flatMap(live).sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0]
  if (first && live(task).some((r) => r.version !== first.version)) throw new Stop('version')
}

// the standing runs of the set, per task and arm
const standingOf = (c, task, cfg) => armsOf(c.data, task).flatMap((arm) => standing(aboveFloor(records(c.data, task), floorOf(c.data, task)), arm, cfg, K))
const finalKinds = (c, task, sha) => kindsOf(c.data, task).map((k) => ({ k, own: readJson(gradeFile(c.data, task, sha, k.grades))?.commit === sha, ok: good(c.data, task, sha, k.grades), tries: attemptsOf(c.data, ATTEMPTS_FILE)[attemptKey(k, sha)] ?? 0 }))

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

export async function scored(args, inj = {}) {
  const [cmd, task, ...rest] = args, data = dataOf(), c = context(data, 'env/box', inj)
  if (cmd === 'order' && args.length === 1) { const t = tasksOf(data); for (const x of queuePick(t, t.length, seedOf(data))) console.log(x); return 0 }
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
