#!/usr/bin/env bun
// The scored runs (step 13): arms H, B and W (W on external tasks only), k = 3 standing runs per arm and task, on the tasks named in
// <data>/step13/tasks.txt. It is the trial's driver (bench/trial.mjs) with other slots and its own floor and attempts files under
// <data>/step13/. `report` prints counts only; `table` (the per-run scores) is step 14's and is refused until it registers.
// `diagnose` (H and W only, counts only) is step 15's and is refused until it registers.
// Nothing here names a task, a stack or a model.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { aboveFloor, ATTEMPTS, attemptsOf, attemptKey, context, fx, good, gradeFile, readJson, records, runStopped, SEED, Stop, standing } from './canary.mjs'
import { dataOf, PRIVATE_SET, readTsv, taskOf } from './ext.mjs'
import { analyse } from './lib/analysis.mjs'
import { activity, hwRecord, numstatDistance, o2Line, outcome, PARTS, scoreShape, summary, taskDistance } from './lib/diagnose.mjs'
import { queuePick } from './lib/oracle.mjs'
import { isTestPath } from './lib/replay.mjs'
import { loadTask } from './lib/task.mjs'
import { ScoreMissing, scoreAt, seedOf } from './oracle.mjs'

const USAGE = 'usage: bun bench/scored.mjs run <task> | order | claim <lane> [--done <task> | --release] | report | table | analyse <tasks.tsv> --h5-drop <bug> --expect <json> | diagnose <tasks.tsv> --control <task>:H:<run>[,...]'
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
      const kinds = finalKinds(c, task, sha)
      // a score only from a final grade: every kind good, or at its second attempt
      if (kinds.every((x) => x.own && (x.ok || x.tries >= ATTEMPTS))) {
        try { s = scoreAt(c.data, task, sha) } catch (e) { if (!(e instanceof ScoreMissing)) throw e }
      }
      runs.push({ task, set: setOf(c.data, task), arm: r.arm, run: r.run, build: s?.build ?? null, requirement: s?.requirement ?? null, passed: s?.passed ?? null, featureMissing: s?.featureMissing ?? null,
        noresult: kinds.some((x) => !x.ok && x.tries >= ATTEMPTS), // as `report` counts it
        tokens: (r.usage?.input ?? 0) + (r.usage?.output ?? 0), minutes: (Date.parse(r.end) - Date.parse(r.start)) / 60000, interventions: r.interventions ?? 0, end: r.reason ?? r.status })
    }
  }
  writeFileSync(join(c.data, 'step13/table.json'), JSON.stringify({ at: new Date().toISOString(), runs }, null, 2) + '\n')
  console.log(`table ${runs.length} runs`)
  return 0
}

// step 14's analysis (bench/lib/analysis.mjs) of step13/table.json, once, after the plan registers: the sets from the tasks file, the H5 rows
// the standing file lists, the dropped bug and the lock's expected names and sums as arguments. Writes step14/analysis.json; prints one line
// per measure, the two integrity lines first, then H4; exit 3 when the integrity lines differ from the lock (no score line printed)
async function analyseCmd(data, tsv, drop, expectText) {
  const registered = join(data, 'step14/registered'), tableFile = join(data, 'step13/table.json'), standingFile = join(data, 'logs/step13/h5-standing.out')
  if (!existsSync(registered)) throw new Error(`analyse refused: ${registered} is missing (step 14 registers its plan first)`)
  if (!existsSync(tableFile)) throw new Error(`analyse refused: ${tableFile} is missing (run table first)`)
  if (!existsSync(standingFile)) throw new Error(`analyse refused: ${standingFile} is missing`)
  let expect
  try { expect = JSON.parse(expectText) } catch { throw new Error('--expect is not valid JSON') }
  const names = (x) => Array.isArray(x) && x.every((n) => typeof n === 'string')
  if (!names(expect?.noresult) || !names(expect?.unscored) || !Number.isInteger(expect?.caught) || !Number.isInteger(expect?.miss)) throw new Error('--expect must be { noresult: [names], unscored: [names], caught: <n>, miss: <n> }')
  const { runs } = strictJson(tableFile, null, (v) => Array.isArray(v?.runs), 'a table ({ runs: [...] })')
  const rows = readTsv(tsv)
  if (!rows.length || !['set', 'task', 'status', 'h1_ids'].every((k) => k in rows[0])) throw new Error(`${tsv}: needs the columns set, task, status and h1_ids`)
  const kept = rows.filter((r) => r.status === 'scored'), tasks = (f) => kept.filter(f).map((r) => r.task)
  const sets = { h1: tasks((r) => Number(r.h1_ids) > 0), external: tasks((r) => r.set === 'external'), realEstate: tasks((r) => r.set === PRIVATE_SET.key), h5Drop: [drop] }
  const seen = new Set(), h5 = lines(standingFile).map((l) => {
    const [tag, task, arm, run] = l.split(/\s+/)
    if (tag !== 'h5' || arm !== 'H' || !/^\d+$/.test(run ?? '')) throw new Error(`${standingFile}: not an H count line: ${l}`)
    if (seen.has(`${task} ${run}`)) throw new Error(`${standingFile}: ${task} H ${run} is listed twice`)
    seen.add(`${task} ${run}`)
    const set = sets.external.includes(task) ? 'external' : sets.realEstate.includes(task) ? PRIVATE_SET.key : null
    if (!set) throw new Error(`${standingFile}: ${task} is not a scored task of ${tsv}`)
    const f = join(data, task, 'seeded/h5', `${arm}-${run}.json`)
    return { task, set, run: Number(run), bugs: strictJson(f, null, Array.isArray, 'an array of H5 rows') ?? (() => { throw new Error(`${f} is missing`) })() }
  })
  if (!h5.some((x) => x.bugs.some((b) => b?.bug === drop))) throw new Error(`--h5-drop ${drop} matches no bug of the H5 rows`) // else 'without' would be the pooled line
  const result = analyse({ runs, h5, sets, expect, seed: `${SEED}:step14` })
  mkdirSync(join(data, 'step14'), { recursive: true })
  writeFileSync(join(data, 'step14/analysis.json'), JSON.stringify({ at: new Date().toISOString(), args: { tasks: tsv, h5Drop: sets.h5Drop, expect }, ...result }, null, 2) + '\n')
  for (const l of analysisLines(result, expect)) console.log(l)
  return result.integrity.ok ? 0 : 3
}
const f4 = (x) => fx(x, 4), list = (xs) => (xs.length ? xs.join(',') : 'none'), iv = (l) => `[${f4(l.lower)}, ${f4(l.upper)}]`
const lineText = (label, l) => `${label} tasks=${l.tasks} out=${list(l.out)} mean=${f4(l.mean)} 95%=${iv(l)} t=[${f4(l.tLower)}, ${f4(l.tUpper)}]` + (l.p === undefined ? '' : ` p=${f4(l.p)}`)
const without = (l) => ` | without noresult: tasks=${l.withoutNoresult.tasks} mean=${f4(l.withoutNoresult.mean)} 95%=${iv(l.withoutNoresult)}`
const h5Text = (label, l) => `H5 ${label} tasks=${l.tasks} skipped=${list(l.skipped)} caught=${l.caught} miss=${l.miss} rate=${f4(l.rate)} 95%=${iv(l)}`
const met = (m) => (m ? 'met' : 'not met')
export function analysisLines(r, expect) {
  const { runs: ir, h5: ih } = r.integrity, out = [
    `integrity runs unscored=${list(ir.unscored)} noresult=${list(ir.noresult)} expected unscored=${list(expect.unscored)} noresult=${list(expect.noresult)} ${ir.ok ? 'ok' : 'differs'}`,
    `integrity h5 caught=${ih.caught} miss=${ih.miss} expected caught=${expect.caught} miss=${expect.miss} ${ih.ok ? 'ok' : 'differs'}`]
  if (!r.integrity.ok) return [...out, 'analysis stopped: the integrity lines differ from the lock']
  out.push(`${lineText('H4 score H-W', r.h4)} ${met(r.h4.met)}${without(r.h4)}`, `${lineText('H4 build H-W', r.h4.build)} decides nothing`, `${lineText('H4 requirement H-W', r.h4.requirement)} decides nothing`)
  if (!r.h4.met) out.push(`H4 not met: H1-H3, ${PRIVATE_SET.key}, pass^k and feature-missing are not reported`)
  else {
    out.push(`${lineText('H1 build H-B', r.h1)} point>=0.10=${r.h1.point ? 'yes' : 'no'}${without(r.h1)}`, `${lineText('H2 requirement H-B', r.h2)}${without(r.h2)}`,
      lineText('H3a H interventions', r.h3.a), lineText('H3b interventions H-B', r.h3.b), `H3 p=${f4(r.h3.p)} (the larger of H3a and H3b)`)
    r.holm.forEach((h, i) => out.push(`holm ${i + 1} ${h.id} p=${f4(h.p)} level=${f4(h.level)} ${h.bounds.map(iv).join(' ')} ${met(h.met)}`))
    out.push(`verdict H1=${met(r.h1.met)} H2=${met(r.h2.met)} H3=${met(r.h3.met)}`)
    const re = r.realEstate
    out.push(`${lineText('re H1 build H-B', re.h1)}${without(re.h1)} decides nothing`, `${lineText('re H2 requirement H-B', re.h2)}${without(re.h2)} decides nothing`,
      `${lineText('re H3a H interventions', re.h3a)} decides nothing`, `${lineText('re H3b interventions H-B', re.h3b)} decides nothing`)
    for (const p of r.passK) out.push(`passk ${p.set} ${p.arm} j=${p.j} tasks=${p.tasks} out=${list(p.out)} mean=${f4(p.mean)} 95%=${iv(p)}`)
    for (const m of r.featureMissing) out.push(`featureMissing ${m.set} ${m.arm} runs=${m.runs} mean=${f4(m.mean)}`)
  }
  const { pooled, external, realEstate, without: w } = r.h5, c = pooled.classes
  out.push(`${h5Text('pooled', pooled)} ${met(pooled.met)} | na=${c.na} refused=${c.refused} notready=${c.notready} nosuite=${c.nosuite}`,
    h5Text('ext', external), h5Text('re', realEstate), h5Text(`without ${list(w.drop)}`, w))
  for (const x of r.cost) out.push(`cost ${x.set} ${x.arm} runs=${x.runs} tokens/run=${fx(x.tokens, 0)} minutes/run=${fx(x.minutes, 1)}`)
  for (const x of r.ends) out.push(`ends ${x.set} ${x.arm} ${Object.entries(x.ends).map(([k, n]) => `${k}:${n}`).join(',') || 'none'}`)
  return out
}

// step 15's diagnosis of H4 (bench/lib/diagnose.mjs), run once after the plan registers: H and W only, counts and names only. Reads the
// standing H and W runs of the tsv's scored external tasks (only H- and W-named records are opened), the control runs, their turns (the
// probe's is not the run's, as the record's toolUses), the products' numstat and table.json's H and W rows. The instrument checks print
// first; any failure is exit 3 with no reading and no file. Writes step15/diagnosis.json
async function diagnoseCmd(c, tsv, controlArg) {
  const { data } = c, registered = join(data, 'step15/registered'), tableFile = join(data, 'step13/table.json'), dir = join(data, 'results')
  if (!existsSync(registered)) throw new Error(`diagnose refused: ${registered} is missing (step 15 registers its plan first)`)
  if (!existsSync(tableFile)) throw new Error(`diagnose refused: ${tableFile} is missing`)
  const rows = readTsv(tsv)
  if (!rows.length || !['set', 'task', 'status', 'h1_ids'].every((k) => k in rows[0])) throw new Error(`${tsv}: needs the columns set, task, status and h1_ids`)
  const kept = rows.filter((r) => r.status === 'scored' && r.set === 'external'), tasks = kept.map((r) => r.task)
  const maxOf = (t) => (Number(kept.find((r) => r.task === t).h1_ids) > 0 ? 2 : 1), cfg = readJson(join(data, 'arms.json'))
  const files = existsSync(dir) ? readdirSync(dir) : [], name = (r) => `${r.task} ${r.arm}-${r.run}`
  const hw = (task) => files.filter((f) => hwRecord(task, f)).map((f) => readJson(join(dir, f))).filter(Boolean)
  const runs = tasks.flatMap((task) => ['H', 'W'].flatMap((arm) => standing(aboveFloor(hw(task), floorOf(data, task)), arm, cfg, K)))
  const named = controlArg.split(',')
  for (const x of named.filter((x, i) => named.indexOf(x) !== i)) throw new Error(`diagnose refused: control ${x.replace(/:H:/, ' H-')} is named twice`)
  const controls = named.map((x) => {
    const [task, arm, run] = x.split(':'), r = readJson(join(dir, `${task}-${arm}-${run}.json`))
    if (r?.task !== task || r.arm !== arm || r.run !== Number(run)) throw new Error(`diagnose refused: control ${task} ${arm}-${run} has no record`)
    if (aboveFloor([r], floorOf(data, task)).length) throw new Error(`diagnose refused: control ${task} ${arm}-${run} is above its floor (a standing run)`)
    return r
  })
  // the run's turn files: <n>-<label>.jsonl as run-arm writes them, the probe left out
  const turnsOf = (r) => {
    const d = typeof r.transcripts === 'string' && existsSync(r.transcripts) ? r.transcripts : null
    return d ? readdirSync(d).filter((f) => /^\d+-.+\.jsonl$/.test(f) && !/^\d+-probe\.jsonl$/.test(f)).map((f) => readFileSync(join(d, f), 'utf8')) : []
  }
  const all = [...runs.map((r) => ({ r })), ...controls.map((r) => ({ r, control: true }))].map((x) => { const t = turnsOf(x.r); return { ...x, turns: t.length, a: activity(t) } })
  const hPlugins = runs.filter((r) => r.arm === 'H').map((r) => JSON.stringify(r.plugins ?? null))
  const common = hPlugins.sort((a, b) => hPlugins.filter((x) => x === b).length - hPlugins.filter((x) => x === a).length)[0] // the most common value
  const short = tasks.flatMap((t) => ['H', 'W'].map((arm) => [t, arm, runs.filter((r) => r.task === t && r.arm === arm).length])).filter(([, , n]) => n !== K)
  const checks = [{ what: 'standing', of: `tasks=${tasks.length}`, bad: short.map(([t, arm, n]) => `${t} ${arm}=${n}`) }, ...Object.entries({ // K per arm: a missing floor file stands none
    transcripts: all.filter((x) => !x.turns),
    toolUses: all.filter((x) => x.a.agentTotal !== (x.r.toolUses?.Agent ?? 0) || x.a.bashTotal !== (x.r.toolUses?.Bash ?? 0)),
    'W parts': all.filter((x) => x.r.arm === 'W' && PARTS.some((p) => x.a[p] > 0)),
    'H plugins': all.filter((x) => x.r.arm === 'H' && JSON.stringify(x.r.plugins ?? null) !== common),
  }).map(([what, bad]) => ({ what, of: `runs=${all.length}`, bad: bad.map((x) => name(x.r)) }))]
  const total = (k) => all.reduce((n, x) => n + x.a[k], 0) // the toolUses check also shows that results were matched and Bash read
  checks.find((k) => k.what === 'toolUses').of += ` agent=${total('agentCalled')}/${total('agentTotal')} bash=${total('bashCalled')}/${total('bashTotal')} zeroBash=${all.filter((x) => !x.a.bashTotal).length}`
  for (const k of checks) console.log(`check ${k.what} ${k.of} ${k.bad.length ? `differs ${k.bad.join(',')}` : 'ok'}`)
  if (checks.some((k) => k.bad.length)) { console.log('diagnosis stopped: an instrument check failed'); return 3 }

  const o1 = Object.fromEntries(['H', 'W'].map((arm) => [arm, summary(all.filter((x) => !x.control && x.r.arm === arm).map((x) => x.a))]))
  const control = summary(all.filter((x) => x.control).map((x) => x.a)), found = PARTS.some((p) => control.ran[p] > 0)
  const perTask = []
  for (const task of tasks) {
    const { repo } = await loadTask(join(data, 'env/box', `${task}.json`)), shas = {}
    for (const arm of ['H', 'W']) { shas[arm] = []; for (const r of runs.filter((x) => x.task === task && x.arm === arm)) shas[arm].push(r.branch ? await c.sha(task, r.branch) : null) }
    perTask.push({ task, ...(await taskDistance(shas, async (a, b) => numstatDistance(await numstat(repo, a, b), isTestPath))) })
  }
  const o2 = { code: o2Line(perTask, 'code', `${SEED}:step15:O2-code`), test: o2Line(perTask, 'test', `${SEED}:step15:O2-test`), perTask }
  const { runs: trows } = strictJson(tableFile, null, (v) => Array.isArray(v?.runs), 'a table ({ runs: [...] })')
  const o3 = { max1: tasks.filter((t) => maxOf(t) === 1), ...scoreShape(trows.filter((r) => tasks.includes(r.task) && (r.arm === 'H' || r.arm === 'W')), maxOf, tasks) }
  const words = outcome({ ran: o1.H.ran, called: o1.H.called.ran, runs: o1.H.runs, edge: o3.edge, controlFound: found, codeLower: o2.code.lower, testLower: o2.test.lower })
  writeFileSync(join(data, 'step15/diagnosis.json'), JSON.stringify({ at: new Date().toISOString(), args: { tasks: tsv, control: controlArg }, checks, o1, control: { ...control, found }, o2, o3, outcome: words }, null, 2) + '\n')
  const hist = (h) => Object.keys(h).sort().map((k) => `${k}:${h[k]}`).join(',') || 'none', parts = (f) => PARTS.map((p) => `${p}=${f(p)}`).join(' ')
  for (const [arm, s] of Object.entries(o1)) {
    console.log(`O1 ${arm} runs=${s.runs} ${parts((p) => `${s.ran[p]}/${s.runs} called=${s.called.ran[p]}/${s.runs}`)} calls ${parts((p) => `${fx(s.calls[p])} called=${fx(s.called.calls[p])}`)}`)
    console.log(`O1 ${arm} loose gate=${s.loose.gate}/${s.runs} calls=${s.loose.calls}`)
    console.log(`O1 ${arm} agentTypes ${hist(s.agentTypes)}`)
    console.log(`O1 ${arm} scriptWords ${hist(s.scriptWords)}`)
  }
  console.log(`control runs=${control.runs} ${parts((p) => `${control.ran[p]} called=${control.called.ran[p]}`)} found=${found ? 'yes' : 'no'}`)
  console.log(`control loose gate=${control.loose.gate}/${control.runs} calls=${control.loose.calls}`)
  for (const side of ['code', 'test']) console.log(`O2 ${side} tasks=${o2[side].tasks} out=${list(o2[side].out)} mean=${f4(o2[side].mean)} 95%=${iv(o2[side])}`)
  console.log(`O3 tasks=${o3.tasks} out=${list(o3.out)} max1=${list(o3.max1)} ties=${o3.ties} ceiling=${o3.ceiling} floor=${o3.floor} sdH=${f4(o3.sdH)} sdW=${f4(o3.sdW)} sdD=${f4(o3.sdD)}`)
  console.log(`outcome ${words}`)
  return 0
}
// the products' distance: no external diff, no textconv, no rename lines; paths unquoted where git can; stderr is never told (it may name product paths)
async function numstat(repo, a, b) {
  const p = Bun.spawn(['git', '-C', repo, '-c', 'core.fsmonitor=false', '-c', 'core.quotePath=false', 'diff', '--numstat', '--no-renames', '--no-ext-diff', '--no-textconv', '--no-color', a, b, '--'], { stdout: 'pipe', stderr: 'pipe' })
  const [out, , code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited])
  if (code !== 0) throw new Error(`git diff --numstat ${a} ${b} failed (exit ${code})`)
  return out
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
  if (cmd === 'analyse' && args.length === 6 && rest[0] === '--h5-drop' && rest[1] && rest[2] === '--expect') return analyseCmd(data, task, rest[1], rest[3])
  if (cmd === 'diagnose' && args.length === 4 && rest[0] === '--control' && /^[a-z0-9][a-z0-9_-]*:H:\d+(,[a-z0-9][a-z0-9_-]*:H:\d+)*$/.test(rest[1])) return diagnoseCmd(c, task, rest[1])
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
