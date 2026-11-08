#!/usr/bin/env bun
// The trial (step 11, ruling 12): arms H and B, k = 1, on the tasks named in <data>/trial/tasks.txt. It is the canary's driver (bench/canary.mjs)
// with other slots, one standing run per arm and the oracle kinds of the task, graded through env/box/<task>.json; `report` measures, it analyses nothing.
// Nothing here names a task, a stack or a model.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { aboveFloor, ATTEMPTS, attemptsOf, attemptKey, context, fx, gradeFile, good, readJson, records, runStopped, standing } from './canary.mjs'
import { dataOf } from './ext.mjs'
import { ScoreMissing, scoreAt } from './oracle.mjs'
import { pairedTasks } from './power.mjs'

const USAGE = 'usage: bun bench/trial.mjs run <task> | report'
const ARMS = ['B', 'H'], DELTA = 0.15, BASE_N = 24
const lines = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : [])
const stepOf = (data, task) => readJson(join(data, task, 'step.json'))

// sample standard deviation (n - 1); NaN under 2 values
export const sigmaD = (ds) => {
  if (ds.length < 2) return NaN
  const m = ds.reduce((a, b) => a + b, 0) / ds.length
  return Math.sqrt(ds.reduce((a, d) => a + (d - m) ** 2, 0) / (ds.length - 1))
}
// ruling 12 (10.2): 24 up to 0.25, else the 22 + 2 of section 10.2 recomputed
export const nRule = (sigma) => (sigma <= 0.25 ? BASE_N : Math.max(BASE_N, pairedTasks(sigma, DELTA) + 2))

const tsv = (data) => {
  const [head, ...rows] = readFileSync(join(data, 'ext/sample.tsv'), 'utf8').trim().split(/\r?\n/).map((l) => l.split('\t'))
  return rows.map((r) => Object.fromEntries(head.map((k, i) => [k, r[i]])))
}
const tasksOf = (data) => lines(join(data, 'trial/tasks.txt'))

// the oracle kinds of a task, as scoreAt reads them: step/oracle only when step.json names it and has ids
const kindsOf = (data, task) => {
  const s = stepOf(data, task)
  if (!s || !Array.isArray(s.ids)) throw new Error(`${task}: ${join(task, 'step.json')} is missing or not a step.json`)
  return [{ oracle: 'oracle', grades: 'grades' }, ...(s.oracle === 'step/oracle' && s.ids.length ? [{ oracle: 'step/oracle', grades: 'step/grades' }] : [])]
}
const boxFile = (data, task) => join(data, 'env/box', `${task}.json`)
// the floor: the highest number of any record of the task per arm when `run` first touched it (the canary's runs are under it). Without one, no record counts
const floorFile = (data) => join(data, 'trial/floor.json')
const floorOf = (data, task) => readJson(floorFile(data))?.[task] ?? { B: Infinity, H: Infinity }
const TRIAL = { slots: ['B:1', 'H:1'], k: 1, envDir: 'env/box', taskFile: boxFile, kinds: kindsOf, attempts: 'trial/attempts.json', floor: floorOf }
function setFloor(data, task) {
  const f = readJson(floorFile(data)) ?? {}
  if (f[task]) return // never overwritten
  const top = (arm) => Math.max(0, ...records(data, task).filter((r) => r.arm === arm).map((r) => r.run))
  mkdirSync(join(data, 'trial'), { recursive: true })
  writeFileSync(floorFile(data), JSON.stringify({ ...f, [task]: { H: top('H'), B: top('B') } }, null, 2) + '\n')
}

// why the trial cannot take this task, or null; `noStep` is the one reason `report` tells as not judged instead of refusing
function gate(data, task) {
  if (!tasksOf(data).includes(task)) return { why: `${task} is not in trial/tasks.txt` }
  const row = tsv(data).find((r) => r.task === task)
  if (row?.cold_setup === 'yes') return { why: `${task} is a cold-setup task` }
  if (lines(join(data, 'step11/walked.txt')).flatMap((l) => l.split(/\s+/)).includes(task)) return { why: `${task} is a walked task` }
  if (!existsSync(boxFile(data, task))) return { why: `${task}: ${boxFile(data, task)} is missing (ext box-env)` }
  kindsOf(data, task) // throws on a step.json that is missing or not one
  if (stepOf(data, task).ids.length === 0) return { why: `${task}: no step id`, noStep: true }
  return null
}
function refuse(data, task) {
  const g = gate(data, task)
  if (g) throw new Error(g.why)
}

// a score only from a final grade: every kind good, or at its second attempt with its file written (the canary's rule)
function scored(data, task, sha) {
  for (const k of kindsOf(data, task)) {
    const g = readJson(gradeFile(data, task, sha, k.grades))
    if (!(g?.commit === sha && (good(data, task, sha, k.grades) || (attemptsOf(data, TRIAL.attempts)[attemptKey(k, sha)] ?? 0) >= ATTEMPTS))) return null
  }
  try { return scoreAt(data, task, sha) } catch (e) { if (e instanceof ScoreMissing) return null; throw e }
}

async function report(c) {
  const cfg = readJson(join(c.data, 'arms.json')), tasks = tasksOf(c.data), runs = [], noStep = []
  for (const task of tasks) {
    const g = gate(c.data, task)
    if (g && !g.noStep) throw new Error(g.why)
    if (g) { noStep.push(g.why); continue }
    const recs = aboveFloor(records(c.data, task), floorOf(c.data, task))
    for (const arm of ARMS) {
      const rec = standing(recs, arm, cfg, 1)[0]
      if (!rec) { runs.push({ task, arm, run: null }); continue }
      let s = null
      s = scored(c.data, task, await c.sha(task, rec.branch))
      runs.push({ task, arm, run: rec.run, build: s?.build ?? null, requirement: s?.requirement ?? null, passed: s?.passed ?? null, scoreKnown: s !== null,
        tokens: (rec.usage?.input ?? 0) + (rec.usage?.output ?? 0), cache: rec.usage?.cacheRead ?? 0, cacheWrite: rec.usage?.cacheWrite ?? 0,
        minutes: (Date.parse(rec.end) - Date.parse(rec.start)) / 60000, interventions: rec.interventions ?? 0, end: rec.reason ?? rec.status })
    }
  }
  const judged = tasks.length > 0 && !noStep.length && runs.every((r) => r.scoreKnown)
  const buildOf = (t, a) => runs.find((r) => r.task === t && r.arm === a)?.build ?? 0 // a null term adds nothing, for both arms alike (canaryScore)
  const dOf = (t) => buildOf(t, 'H') - buildOf(t, 'B')
  const external = new Set(tsv(c.data).map((r) => r.task))
  const sigma = judged ? sigmaD(tasks.map(dOf)) : null, ext = judged ? sigmaD(tasks.filter((t) => external.has(t)).map(dOf)) : null
  const N = judged && Number.isFinite(sigma) ? nRule(sigma) : null
  const h1 = tsv(c.data).filter((r) => stepOf(c.data, r.task)?.ids?.length > 0).length
  const walk = N === null ? null : h1 < N
  mkdirSync(join(c.data, 'trial'), { recursive: true })
  writeFileSync(join(c.data, 'trial/report.json'), JSON.stringify({ at: new Date().toISOString(), judged, ...(noStep.length ? { reason: noStep } : {}), tasks: tasks.map((t) => ({ task: t, d: judged ? dOf(t) : null })),
    runs: runs.map(({ scoreKnown, ...r }) => r), sigma_d: sigma, sigma_d_ext: ext, n: tasks.length, N, h1_n: h1, walk }, null, 2) + '\n')
  const num = (x, d = 3) => (Number.isFinite(x) ? x.toFixed(d) : 'none')
  for (const r of runs) {
    if (r.run === null) { console.log(`${r.task} ${r.arm} no standing run`); continue }
    console.log(`${r.task} ${r.arm} build=${fx(r.build)} requirement=${fx(r.requirement)} passed=${r.passed === null ? 'none' : r.passed ? 'yes' : 'no'} tokens=${r.tokens} cache=${r.cache} minutes=${fx(r.minutes, 1)} interventions=${r.interventions} end=${String(r.end).replace(/\s+/g, '_')}`)
  }
  console.log(judged ? `trial sigma_d=${num(sigma)} sigma_d_ext=${num(ext)} n=${tasks.length} N=${N ?? 'none'} h1_n=${h1} walk=${walk === null ? 'none' : walk ? 'yes' : 'no'}` : `trial not judged${noStep.length ? `: ${noStep.join('; ')}` : ''}`)
  return 0
}

export async function trial(args, inj = {}) {
  const [cmd, task, ...rest] = args, data = dataOf(), c = context(data, TRIAL.envDir, inj)
  if (cmd === 'report' && args.length === 1) return report(c)
  if (cmd === 'run' && /^[a-z0-9][a-z0-9_-]*$/.test(task ?? '') && !rest.length) {
    refuse(data, task)
    setFloor(data, task)
    return runStopped(c, task, TRIAL)
  }
  throw new Error(USAGE)
}

if (import.meta.main) {
  try { process.exit(await trial(process.argv.slice(2))) } catch (e) { console.error(e.message); process.exit(2) }
}
