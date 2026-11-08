#!/usr/bin/env bun
// Step 9's human reads (rulings 2, 3, 10 and 11): each batch is built as a page file and served on 127.0.0.1 behind a
// token; the answers are appended to data files. Prints counts only: a row, a page, an answer and a note are sealed.
import { createHash, randomBytes } from 'node:crypto'
import { appendFileSync, chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { gitOut } from './bugs.mjs'
import { ARMS } from './canary.mjs'
import { taskOf } from './ext.mjs'
import { check } from './input-check.mjs'
import { fellBack } from './lib/agent.mjs'
import { answerOk, answersFor, BATCHES, coldSwap, eventKey, events, historyKappa, humanText, lastAgentText, parseAnswers, planWindows, segments, toolLabel } from './lib/human.mjs'
import { queuePick } from './lib/oracle.mjs'
import { loadTask } from './lib/task.mjs'
import { clScored, dataDir, labelLines, poolKeys, queueDraw, queuePools, readPairs, seedOf } from './oracle.mjs'
import { sealedAgent } from './sealed-agent.mjs'

const USAGE = 'usage: bun bench/human.mjs swap [--drop <task,...>] | build <inputs|rerate-7.2|classify|classify-2|pairs> [--queue <dir>] | build oracle-7.1 <task.json> [--queue <dir>] | build labels <task.json> --log <file|dir> [--log <file|dir> ...] --attribution <file> [--queue <dir>] | serve <batch> [--port <n>] [--root] [--queue <dir>] | status [--queue <dir>] | history <transcripts dir> <task.json> | kappa history | apply <batch> [--queue <dir>] | recount [--drop <task,...>] | proxy <batch> <task.json> [--model <id>] [--chunk <n>] [--queue <dir>]'
const readJson = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')) } catch { return null } }
const read = (f) => readFileSync(f, 'utf8')
// a tsv with a header as objects; a file that is not there has no rows
const tsvRows = (f) => {
  if (!existsSync(f)) return []
  const [head, ...rows] = read(f).trim().split('\n').map((l) => l.split('\t'))
  return rows.filter((r) => r.join('')).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])))
}
// a sample's cold-swapped list when `swap` wrote one, else the locked file
const sampleOf = (q, stem) => join(q, existsSync(join(q, `${stem}-v2.tsv`)) ? `${stem}-v2.tsv` : `${stem}.tsv`)
const filesUnder = (p) => (statSync(p).isDirectory() ? readdirSync(p).sort().flatMap((f) => filesUnder(join(p, f))) : statSync(p).isFile() ? [p] : [])
const part = (title, text) => ({ title, text })
const coldOf = (data) => new Set(tsvRows(join(data, 'ext/sample.tsv')).filter((r) => r.cold_setup === 'yes').map((r) => r.task))

// --- swap (ruling 3) ---
const SWAPPED = ['sample-7.1', 'sample-7.2', 'inputs']
function swap(data, drop) {
  const q = join(data, 'step9'), seed = seedOf(data), { pools } = queuePools(data, drop)
  const cold = coldOf(data)
  let code = 0
  for (const stem of SWAPPED) {
    const f = join(q, `${stem}.tsv`), name = `${stem}.tsv`
    if (!existsSync(f)) throw new Error(`no step9/${name}`)
    const [head, ...locked] = read(f).trimEnd().split('\n'), cols = stem === 'inputs' ? 2 : 3
    // the pools must give the locked file again, row for row, as `oracle queue` drew it
    const again = queueDraw(pools[stem], seed).map((r) => r.slice(0, cols).join('\t'))
    if (again.join('\n') !== locked.join('\n')) { console.log(`swap ${name}: reproduced no`); code = 1; continue }
    const rows = locked.map((l) => l.split('\t')).map((r) => ({ set: r[0], key: r[cols - 1] }))
    const owner = new Map(pools[stem].sets.flatMap(([, items]) => [...poolKeys(items)]))
    const pool = new Map(pools[stem].sets.map(([g, items]) => [g, [...poolKeys(items).keys()]]))
    const n = new Map()
    for (const r of rows) n.set(r.set, (n.get(r.set) ?? 0) + 1)
    const out = coldSwap(rows, pool, n, (k) => cold.has(owner.get(k)), seed)
    const old = new Set(rows.map((r) => `${r.set}\t${r.key}`))
    writeFileSync(join(q, `${stem}-v2.tsv`), [head, ...out.map((r) => (cols === 2 ? [r.set, r.key] : [r.set, owner.get(r.key), r.key]).join('\t'))].join('\n') + '\n')
    console.log(`swap ${name}: reproduced yes, rows ${out.length}, replaced ${out.filter((r) => !old.has(`${r.set}\t${r.key}`)).length}`)
  }
  return code
}

// --- the views (decision 1's table): each row is { key, task, kind?, parts: [{ title, text }] } ---
// the entry's file (a grouped file whole), else its `<id>.*` files
function checkFiles(dir, e, task) {
  const fs = e.file ? [e.file].filter((f) => existsSync(join(dir, f))) : readdirSync(dir).filter((f) => f.startsWith(`${e.id}.`))
  if (!fs.length) throw new Error(`a row of ${task} has no check file`) // a read with no check shown would answer nothing
  return fs
}
// the test file a check came from at a commit, the lines holding its title marked `>> `; the origin only locates it
async function originTest(repo, ref, origin) {
  const [file, ...rest] = String(origin ?? '').split('::'), title = rest.join('::').trim()
  let text
  try { text = await gitOut(repo, 'show', `${ref}:${file.trim()}`) } catch { return 'the test file is not at this commit' }
  const lines = text.split('\n'), tries = [title, title.split(/\s+>\s+|::/).at(-1)].filter(Boolean)
  const t = tries.find((x) => lines.some((l) => l.includes(x)))
  return lines.map((l) => (t && l.includes(t) ? `>> ${l}` : `   ${l}`)).join('\n')
}

function inputs(data, q) {
  return tsvRows(sampleOf(q, 'inputs')).map(({ task }) => {
    const input = read(join(data, task, 'input.md')), hits = check(input)
    return { key: task, task, parts: [part('input.md', input), part('interface.md', read(join(data, task, 'interface.md'))),
      part('input-check', hits.length ? `FAIL ${hits.length} hits` : 'PASS no code, test or source pointer')] }
  })
}

async function oracle71(data, q, taskFile) {
  if (!taskFile) throw new Error(USAGE)
  const tasks = readJson(join(data, 'tasks.json')) ?? {}, repo = (await loadTask(taskFile)).repo
  const rows = [...tsvRows(sampleOf(q, 'sample-7.1')).map((r) => ({ ...r, step: false })), ...tsvRows(join(q, 'sample-7.1-step.tsv')).map((r) => ({ ...r, step: true }))]
  const out = []
  for (const { task, id, step } of rows) {
    const dir = join(data, task, step ? 'step/oracle' : 'oracle'), e = (readJson(join(dir, 'manifest.json')) ?? []).find((m) => m.id === id)
    if (!e) throw new Error(`oracle-7.1: a row has no manifest entry (${task})`)
    // a step check: the step's test at the task end; a task-repo check: its test at the fix commit; external: the PR's test at the end
    const [r, ref, where] = tasks[task] ? [repo, step ? tasks[task].end : e.fix_commit, step ? 'at the task end' : 'at the fix commit']
      : [(await loadTask(join(data, 'env', `${task}.json`))).repo, taskOf(join(data, 'ext'), task).end, 'at the task end']
    out.push({ key: id, task, parts: [
      ...checkFiles(dir, e, task).map((f) => part(`check ${f}`, read(join(dir, f)))),
      part('manifest', ['behaviour', 'interface', 'severity'].map((k) => `${k}: ${e[k]}`).join('\n')),
      part(`the test it came from, ${where} (>> marks its title)`, await originTest(r, ref, e.origin)),
    ] })
  }
  return out
}

// the classifier's folder of the round that rated the id: work/classify/ first, then the split and b2 rounds' folders
function classView(data, task, id) {
  const work = join(data, task, 'work'), names = existsSync(work) ? readdirSync(work).filter((n) => n.startsWith('classify') && existsSync(join(work, n, 'manifest.json'))) : []
  for (const n of names.sort((a, b) => (a === 'classify' ? -1 : b === 'classify' ? 1 : a < b ? -1 : 1))) {
    const dir = join(work, n), e = readJson(join(dir, 'manifest.json'))?.find((m) => m.id === id)
    if (!e) continue
    const entry = Object.fromEntries(['id', 'behaviour', 'interface', 'severity', 'file'].filter((k) => e[k] !== undefined).map((k) => [k, e[k]]))
    return { key: id, task, parts: [part('input.md', read(join(dir, 'input.md'))), part('interface.md', read(join(dir, 'interface.md'))),
      part('entry', JSON.stringify(entry, null, 2)), ...checkFiles(dir, e, task).map((f) => part(`check ${f}`, read(join(dir, f))))] }
  }
  throw new Error(`a row of ${task} is in no classify folder`)
}
const rerate = (data, q) => tsvRows(sampleOf(q, 'sample-7.2')).map((r) => classView(data, r.task, r.id))
// a classification batch's { task, id } rows: classify.tsv and the step 6 addition `<task>-classify.tsv`; classify-2, the
// second batch's disputes: the disputed ids of each task's b2 rounds
const classRows = (data, q, batch) => batch === 'classify'
  ? readdirSync(q).filter((f) => /^(.+-)?classify\.tsv$/.test(f)).sort().flatMap((f) => tsvRows(join(q, f)))
  : queuePools(data).sets.flatMap(([, ts]) => ts).flatMap((t) => (readJson(join(data, t, 'agreement.json'))?.splitRounds ?? []).filter((x) => x.name.includes('b2')).flatMap((x) => x.disputed ?? []).map((id) => ({ task: t, id })))
// a cold-setup task's disputes stay disputed and unread (decision 1 A, ruling 5); `cold` counts them for the count line
const classBatch = (batch) => (data, q) => {
  const all = classRows(data, q, batch), cold = coldOf(data), rows = all.filter((r) => !cold.has(r.task))
  return Object.assign(rows.map((r) => classView(data, r.task, r.id)), { cold: all.length - rows.length })
}

async function labels(data, q, taskFile, logs, attribution) {
  if (!taskFile || !logs.length || !attribution) throw new Error(USAGE)
  const repo = (await loadTask(taskFile)).repo, pairs = readPairs(join(data, 'sources')), logFiles = logs.flatMap(filesUnder)
  const naming = (files, sha7) => files.flatMap((f) => read(f).split('\n').filter((l) => l.includes(sha7)).map((l) => `${relative(data, f).startsWith('..') ? f : relative(data, f)}: ${l}`)).join('\n')
  const brief = read(join(data, 'briefs/label.md')), out = []
  for (const { commit, task } of tsvRows(join(q, 'labels.tsv'))) {
    const p = pairs.find((x) => x.commit === commit && x.task === task)
    if (!p) throw new Error(`labels: a row of ${task} has no pair in sources/pairs.tsv`)
    const { taskLine, lines } = await labelLines(data, repo, task, [p]), sha7 = commit.slice(0, 7)
    out.push({ key: `${task}:${commit}`, task, kind: p.kind, parts: [part('label brief', brief), part('the task and this pair', `${taskLine}\n\n${lines[0]}`),
      part('git show', await gitOut(repo, 'show', commit)), part('progress log lines naming it', naming(logFiles, sha7)), part('attribution lines naming it', naming([attribution], sha7))] })
  }
  return out
}

// one row per pair: each arm's diff of the task, in the arms' order
function pairsView(data) {
  const dir = join(data, 'canary/pairs'), files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.diff')).sort() : []
  const byTask = new Map()
  for (const f of files) {
    const arm = [...ARMS].sort((a, b) => b.length - a.length).find((a) => f.endsWith(`-${a}.diff`))
    if (!arm) throw new Error(`pairs: a diff names no arm`)
    const task = f.slice(0, -`-${arm}.diff`.length)
    byTask.set(task, [...(byTask.get(task) ?? []), [arm, f]])
  }
  return [...byTask].map(([task, fs]) => ({ key: task, task, parts: fs.sort((a, b) => ARMS.indexOf(a[0]) - ARMS.indexOf(b[0])).map(([arm, f]) => part(`arm ${arm}`, read(join(dir, f)))) }))
}

const VIEWS = { inputs, 'oracle-7.1': oracle71, 'rerate-7.2': rerate, classify: classBatch('classify'), 'classify-2': classBatch('classify-2'), labels, pairs: pairsView }

async function build(data, q, batch, rest) {
  if (!Object.hasOwn(VIEWS, batch)) throw new Error(USAGE)
  if (existsSync(join(q, 'answers', `${batch}.applied`))) { console.log(`build ${batch}: refused, the batch is applied`); return 1 }
  const logs = [], pos = []
  let attribution = null
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--log' && rest[i + 1]) logs.push(rest[++i])
    else if (rest[i] === '--attribution' && rest[i + 1]) attribution = rest[++i]
    else pos.push(rest[i])
  }
  if (pos.length > 1 || (batch !== 'labels' && (logs.length || attribution))) throw new Error(USAGE)
  const rows = await VIEWS[batch](data, q, pos[0], logs, attribution)
  writePage(q, batch, rows)
  console.log(`build ${batch}: rows ${rows.length}, parts ${rows.reduce((s, r) => s + r.parts.length, 0)}${rows.cold === undefined ? '' : `, cold left out ${rows.cold}`}`)
  return 0
}

// the batch's page file, and the sealed record of what the user was shown (ruling 2): batch, task, key, once each
function writePage(q, batch, rows) {
  if (new Set(rows.map((r) => r.key)).size !== rows.length) throw new Error(`build ${batch}: a key is there twice`)
  const pages = join(q, 'pages')
  mkdirSync(pages, { recursive: true })
  writeFileSync(join(pages, `${batch}.json`), JSON.stringify(rows.map(({ key, kind, parts }) => ({ key, ...(kind ? { kind } : {}), parts })), null, 2) + '\n')
  const seen = join(q, 'seen.tsv'), had = new Set(tsvRows(seen).map((r) => `${r.batch}\t${r.key}`))
  if (!existsSync(seen)) writeFileSync(seen, 'batch\ttask\tkey\n')
  const add = rows.filter((r) => !had.has(`${batch}\t${r.key}`)).map((r) => `${batch}\t${r.task}\t${r.key}\n`).join('')
  if (add) appendFileSync(seen, add)
}

// --- apply (rulings 2 and 4-6): every row answered, then the answers go into the files the tools read and the batch is frozen ---
const writeJson = (f, x) => writeFileSync(f, JSON.stringify(x, null, 2) + '\n')
const AGREES = { build: 'traceable', requirement: 'not traceable' } // an agreed label and the answer that agrees with it
// one gate line per set, in the order the sets first come; a set passes at 90% (ruling 6: 9 of 10, 18 of 20)
function gates(batch, list) {
  const pass = [...new Set(list.map((x) => x.set))].map((set) => {
    const xs = list.filter((x) => x.set === set), ok = xs.filter((x) => x.ok).length, p = ok * 10 >= xs.length * 9
    console.log(`gate ${batch} ${set} ${ok}/${xs.length} ${p ? 'pass' : 'stop'}`)
    return p
  })
  return pass.every(Boolean) ? 0 : 3
}
const counts = (batch, rows, ans) => BATCHES[batch].answers.map((a) => `${a} ${rows.filter((r) => ans.get(r.key) === a).length}`).join(', ')

// ruling 5: traceable -> build, not traceable and partly -> requirement, into labels.json only
const applyClass = (batch) => (data, q, rows, ans) => {
  const task = new Map(classRows(data, q, batch).map((r) => [r.id, r.task]))
  if (rows.some((r) => !task.has(r.key))) throw new Error(`apply ${batch}: a row is in no queue file`)
  const label = (r) => (ans.get(r.key) === 'traceable' ? 'build' : 'requirement')
  for (const t of new Set(rows.map((r) => task.get(r.key)))) {
    const f = join(data, t, 'labels.json')
    writeJson(f, { ...(readJson(f) ?? {}), ...Object.fromEntries(rows.filter((r) => task.get(r.key) === t).map((r) => [r.key, label(r)])) })
  }
  console.log(`apply ${batch}: rows ${rows.length}, build ${rows.filter((r) => label(r) === 'build').length}, requirement ${rows.filter((r) => label(r) === 'requirement').length}`)
  return 0
}

// ruling 6: `different` drops the check (a task-repo step check leaves step.json ids too); `unclear` counts against the gate only
function apply71(data, q, rows, ans) {
  const where = new Map([...tsvRows(sampleOf(q, 'sample-7.1')).map((r) => [r.id, { ...r, step: false }]), ...tsvRows(join(q, 'sample-7.1-step.tsv')).map((r) => [r.id, { ...r, set: 'task-repo-step', step: true }])])
  const list = rows.map((r) => ({ ...where.get(r.key), id: r.key, ok: ans.get(r.key) === 'same', drop: ans.get(r.key) === 'different' }))
  const fileOf = (x) => join(data, x.task, x.step ? 'step/oracle' : 'oracle', 'manifest.json')
  if (list.some((x) => !x.task || !readJson(fileOf(x))?.some((e) => e.id === x.id))) throw new Error('apply oracle-7.1: a row has no sample row or no manifest entry')
  for (const x of list.filter((y) => y.drop)) {
    writeJson(fileOf(x), readJson(fileOf(x)).map((e) => (e.id === x.id ? { ...e, dropped: true, drop_reason: 'human 7.1' } : e)))
    const sf = join(data, x.task, 'step.json'), st = readJson(sf) // score refuses an id its grade lacks; no replacement
    if (x.step && Array.isArray(st?.ids)) writeJson(sf, { ...st, ids: st.ids.filter((id) => id !== x.id) })
  }
  console.log(`apply oracle-7.1: rows ${rows.length}, ${counts('oracle-7.1', rows, ans)}`)
  return gates('oracle-7.1', list)
}

// ruling 6: the user's label against the agreed one; partly agrees with neither; no label changes
function apply72(data, q, rows, ans) {
  const where = new Map(tsvRows(sampleOf(q, 'sample-7.2')).map((r) => [r.id, r]))
  if (rows.some((r) => !where.has(r.key))) throw new Error('apply rerate-7.2: a row has no sample row')
  return gates('rerate-7.2', rows.map((r) => { const w = where.get(r.key); return { set: w.set, ok: AGREES[readJson(join(data, w.task, 'labels.json'))?.[r.key]] === ans.get(r.key) } }))
}

const APPLY = {
  classify: applyClass('classify'), 'classify-2': applyClass('classify-2'), 'oracle-7.1': apply71, 'rerate-7.2': apply72,
  inputs: (data, q, rows, ans) => { // a leak stops the plan
    const clean = rows.filter((r) => ans.get(r.key) === 'clean').length
    console.log(`gate inputs ${clean}/${rows.length} ${clean === rows.length ? 'pass' : 'stop'}`)
    return clean === rows.length ? 0 : 3
  },
  labels: (data, q, rows, ans) => { // ruling 4: the pairs called fix are the second batch
    const fix = rows.filter((r) => ans.get(r.key) === 'fix')
    writeFileSync(join(q, 'batch2.tsv'), ['commit\ttask\tkind', ...fix.map((r) => { const i = r.key.indexOf(':'); return [r.key.slice(i + 1), r.key.slice(0, i), r.kind].join('\t') })].join('\n') + '\n')
    console.log(`apply labels: rows ${rows.length}, fix ${fix.length}, not fix ${rows.length - fix.length}`)
    return 0
  },
  pairs: (data, q, rows, ans) => { console.log(`apply pairs: rows ${rows.length}, ${counts('pairs', rows, ans)}`); return 0 },
  history: (data, q, rows) => { console.log(`apply history: rows ${rows.length}`); return 0 }, // kappa history reads the answers
}

function apply(data, q, batch) {
  if (!Object.hasOwn(APPLY, batch)) throw new Error(USAGE)
  const rows = readJson(join(q, 'pages', `${batch}.json`))
  if (!Array.isArray(rows)) throw new Error(`no page for ${batch}: build it first`)
  const dir = join(q, 'answers'), file = join(dir, `${batch}.tsv`), applied = join(dir, `${batch}.applied`)
  const given = existsSync(file) ? parseAnswers(read(file)) : new Map(), ans = new Map()
  for (const r of rows) if (answerOk(batch, r, given.get(r.key)?.answer)) ans.set(r.key, given.get(r.key).answer)
  if (ans.size < rows.length) { console.log(`apply ${batch}: refused, unanswered ${rows.length - ans.size} of ${rows.length}`); return 1 }
  const sha = createHash('sha256').update(existsSync(file) ? readFileSync(file) : '').digest('hex')
  if (existsSync(applied) && read(applied).trim() !== sha) { console.log(`apply ${batch}: refused, the answers changed after apply`); return 1 }
  const code = APPLY[batch](data, q, rows, ans)
  mkdirSync(dir, { recursive: true })
  writeFileSync(applied, `${sha}\n`) // the server refuses every write from now on
  return code
}

// ruling 9: rule (b) per kept task of tasks.json (`--drop` leaves tasks out, as for `oracle pairs`): its scored checks, at least 3
function recount(data, drop) {
  const tasks = Object.keys(readJson(join(data, 'tasks.json')) ?? {})
  for (const t of drop) if (!tasks.includes(t)) throw new Error(`--drop ${t} is not a task of tasks.json`)
  const kept = tasks.filter((t) => !drop.includes(t)), n = new Map(kept.map((t) => [t, clScored({ dir: join(data, t) }).length]))
  for (const t of kept) console.log(`recount ${t} scored=${n.get(t)} meets ${n.get(t) >= 3 ? 'yes' : 'no'}`)
  console.log(`recount: meets ${kept.filter((t) => n.get(t) >= 3).length} of ${kept.length}`)
  return 0
}

// --- history (ruling 8): the user's past sessions mapped to the plans by time ---
// the entries of a session file, one per line (an unparsable line is `{}` so indexes stay the file's), and how many lines did not parse
function readSession(file) {
  let bad = 0
  const entries = read(file).split('\n').map((t) => {
    if (!t.trim()) return {}
    try { const x = JSON.parse(t); if (x && typeof x === 'object' && !Array.isArray(x)) return x } catch {}
    bad++
    return {}
  })
  return { entries, bad }
}
const HISTORY_N = 20

async function history(data, dir, taskFile) {
  if (!dir || !taskFile) throw new Error(USAGE)
  if (existsSync(join(data, 'step9/answers/history.applied'))) { console.log('history: refused, the batch is applied'); return 1 }
  const repo = (await loadTask(taskFile)).repo
  const tasks = Object.entries(readJson(join(data, 'tasks.json')) ?? {}).map(([task, t]) => ({ task, base: t.base, end: t.end }))
  if (!tasks.length) throw new Error('no tasks in tasks.json')
  const when = new Map()
  for (const sha of new Set(tasks.flatMap((t) => [t.base, t.end]))) {
    const at = new Date((await gitOut(repo, 'log', '-1', '--format=%cI', sha)).trim())
    if (Number.isNaN(at.getTime())) throw new Error('a commit of tasks.json has no commit time')
    when.set(sha, at)
  }
  // the folder's own *.jsonl only, read-only
  const files = readdirSync(dir).filter((f) => f.endsWith('.jsonl') && statSync(join(dir, f)).isFile()).sort()
  let bad = 0
  const sessions = files.map((f) => { const s = readSession(join(dir, f)); bad += s.bad; return { id: f.slice(0, -'.jsonl'.length), events: events(s.entries) } })
  const { segments: segs, outside } = segments(sessions, planWindows(tasks, (sha) => when.get(sha)))
  const byTask = new Map(tasks.map((t) => [t.task, segs.filter((s) => s.task === t.task)])) // each task's segments, by time
  for (const list of byTask.values()) list.forEach((s, k) => toolLabel(s, k === 0).forEach((tool, i) => { s.events[i].tool = tool }))
  mkdirSync(join(data, 'history'), { recursive: true })
  writeFileSync(join(data, 'history/segments.json'), JSON.stringify(segs.map(({ key, task, events: es }) => ({ key, task, events: es })), null, 2) + '\n')

  const picked = queuePick(segs.map((s) => s.key), HISTORY_N, seedOf(data)), bySeg = new Map(segs.map((s) => [s.key, s]))
  const rows = []
  for (const key of picked) {
    const seg = bySeg.get(key), list = byTask.get(seg.task), { entries } = readSession(join(dir, `${key.slice(seg.task.length + 1)}.jsonl`))
    seg.events.forEach((e, i) => rows.push({ key: eventKey(seg, i), task: seg.task, parts: [
      part('Agent, before', lastAgentText(entries, e.line)), part('Human', humanText(entries, e)),
      part('Where', `task ${seg.task}, session ${list.indexOf(seg) + 1} of ${list.length}, event ${i + 1} of ${seg.events.length}`)] }))
  }
  writePage(join(data, 'step9'), 'history', rows)

  const total = segs.reduce((n, s) => n + s.events.length, 0)
  console.log(`history: sessions ${sessions.length}, unparsable lines ${bad}, segments ${segs.length}, events ${total}, outside ${outside}, sample ${picked.length}, events in sample ${rows.length}`)
  for (const [task, list] of byTask) {
    const n = (label) => list.flatMap((s) => s.events).filter((e) => e.tool === label).length
    console.log(`history ${task} segments=${list.length} rule1=${n('rule 1')} rule2=${n('rule 2')} rule3=0 notcounted=${n('not counted')}`)
  }
  return 0
}

const fx = (x) => (typeof x === 'number' && !Number.isNaN(x) ? x.toFixed(2) : 'none')
// the tool's labels against the human's, over the sampled events that have a human answer; the gate is every sampled event answered and kappa >= 0.7
function kappaHistory(data) {
  const segs = readJson(join(data, 'history/segments.json'))
  if (!Array.isArray(segs)) throw new Error('no history/segments.json: run history first')
  const pick = new Set(queuePick(segs.map((s) => s.key), HISTORY_N, seedOf(data)))
  const tool = new Map(segs.filter((s) => pick.has(s.key)).flatMap((s) => s.events.map((e, i) => [eventKey(s, i), e.tool])))
  const file = join(data, 'step9/answers/history.tsv'), given = existsSync(file) ? parseAnswers(read(file)) : new Map()
  const keys = [...tool.keys()].filter((k) => BATCHES.history.answers.includes(given.get(k)?.answer))
  const s = keys.length ? historyKappa(keys.map((k) => given.get(k).answer), keys.map((k) => tool.get(k))) : {}
  const pass = keys.length === tool.size && s.kappa >= 0.7
  console.log(`history kappa=${fx(s.kappa)} raw=${fx(s.raw)} ac1=${fx(s.ac1)} n=${keys.length} answered=${keys.length}/${tool.size} gate ${pass ? 'pass' : 'stop'}`)
  return pass ? 0 : 3
}

// --- serve (ruling 11) ---
const PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Step 9 read</title>
<style>
:root { --bg: #fff; --fg: #1d1d1f; --muted: #6e6e73; --line: #d2d2d7; --box: #f5f5f7; --accent: #0a66c2; --on: #fff; }
@media (prefers-color-scheme: dark) { :root { --bg: #161617; --fg: #f5f5f7; --muted: #a1a1a6; --line: #3a3a3c; --box: #1f1f21; --accent: #4c9ffe; --on: #000; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.45 -apple-system, system-ui, sans-serif; }
main { max-width: 960px; margin: 0 auto; padding: 16px; }
header { display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; justify-content: space-between; }
h1 { font-size: 18px; margin: 0; } h2 { font-size: 15px; margin: 18px 0 6px; color: var(--muted); }
pre { margin: 0; padding: 10px; background: var(--box); border: 1px solid var(--line); border-radius: 6px; overflow: auto; max-height: 70vh; font: 13px/1.4 ui-monospace, Menlo, monospace; white-space: pre; }
.bar { position: sticky; bottom: 0; background: var(--bg); border-top: 1px solid var(--line); padding: 12px 0; margin-top: 18px; display: grid; gap: 10px; }
.answers, .nav { display: flex; flex-wrap: wrap; gap: 8px; }
button { font: inherit; padding: 8px 14px; border-radius: 6px; border: 1px solid var(--line); background: var(--box); color: var(--fg); cursor: pointer; }
button.on { background: var(--accent); color: var(--on); border-color: var(--accent); }
button:disabled { opacity: .5; cursor: default; }
textarea { width: 100%; min-height: 56px; font: inherit; padding: 8px; border-radius: 6px; border: 1px solid var(--line); background: var(--box); color: var(--fg); }
#msg { color: var(--muted); min-height: 1.2em; }
</style></head>
<body><main>
<header><h1 id="batch"></h1><span id="count"></span></header>
<div id="where"></div>
<div id="parts"></div>
<div class="bar">
<div id="given"></div>
<div class="answers" id="answers" role="group" aria-label="Answer"></div>
<label for="note">Note (optional)</label><textarea id="note" maxlength="2000"></textarea>
<div class="nav"><button id="prev">Previous</button><button id="next">Next</button></div>
<div id="msg" role="status"></div>
</div>
</main>
<script>
const $ = (id) => document.getElementById(id)
let d = null, i = 0
const el = (tag, text) => { const x = document.createElement(tag); x.textContent = text; return x }
function show() {
  const r = d.rows[i]
  $('batch').textContent = d.batch
  $('count').textContent = 'answered ' + d.rows.filter((x) => d.answers[x.key] !== undefined).length + ' of ' + d.rows.length
  $('where').textContent = 'row ' + (i + 1) + ' of ' + d.rows.length
  const parts = $('parts'); parts.replaceChildren()
  for (const p of r.parts) { parts.append(el('h2', p.title), el('pre', p.text)) }
  const box = $('answers'); box.replaceChildren()
  for (const a of r.answers) {
    const b = el('button', a)
    if (d.answers[r.key] === a) b.className = 'on'
    b.disabled = d.applied
    b.onclick = () => save(r, a)
    box.append(b)
  }
  const was = d.answers[r.key]
  $('given').textContent = was === undefined ? '' : 'answered: ' + was + (d.hasNote[r.key] ? ' (with a note)' : '')
  $('note').value = ''
  $('note').placeholder = was === undefined ? '' : 'leave empty to keep the earlier note'
  $('note').disabled = d.applied
  $('prev').disabled = i === 0
  $('next').disabled = i === d.rows.length - 1
  $('msg').textContent = d.applied ? 'This batch is applied: answers are closed.' : ''
  window.scrollTo(0, 0)
}
async function save(r, a) {
  const note = $('note').value
  $('msg').textContent = 'saving'
  const res = await fetch('answer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: r.key, answer: a, note }) })
  if (!res.ok) { $('msg').textContent = 'not saved (' + res.status + ')'; return }
  d.answers[r.key] = a
  d.hasNote[r.key] = d.hasNote[r.key] || note.trim() !== ''
  const next = d.rows.findIndex((x, k) => k > i && d.answers[x.key] === undefined)
  if (next >= 0) i = next
  show()
  $('msg').textContent = 'saved'
}
$('prev').onclick = () => { i--; show() }
$('next').onclick = () => { i++; show() }
fetch('data').then((x) => x.json()).then((x) => {
  d = x
  if (!d.rows.length) { $('batch').textContent = d.batch; $('count').textContent = 'no rows'; return }
  i = Math.max(0, d.rows.findIndex((r) => d.answers[r.key] === undefined))
  show()
})
</script>
</body></html>
`

export function serve(data, batch, port = 0, root = false, q = join(data, 'step9')) {
  if (!Object.hasOwn(BATCHES, batch)) throw new Error(USAGE)
  const pages = join(q, 'pages'), rows = readJson(join(pages, `${batch}.json`))
  if (!Array.isArray(rows)) throw new Error(`no page for ${batch}: build it first`)
  const answers = join(q, 'answers'), file = join(answers, `${batch}.tsv`), applied = join(answers, `${batch}.applied`)
  const byKey = new Map(rows.map((r) => [r.key, r]))
  const token = randomBytes(24).toString('hex'), tokenFile = join(pages, `${batch}.token`)
  writeFileSync(tokenFile, `${token}\n`, { mode: 0o600 })
  chmodSync(tokenFile, 0o600) // mode applies only when the file is created
  const base = `/${token}`
  const status = (n) => new Response(null, { status: n })
  const server = Bun.serve({
    hostname: '127.0.0.1', port, maxRequestBodySize: 64 * 1024,
    error: () => status(500), // logs nothing
    async fetch(req) {
      const path = new URL(req.url).pathname
      if (root && req.method === 'GET' && path === '/') return new Response(null, { status: 302, headers: { location: `${base}/` } }) // the preview pane loads `/`
      if (path === base) return new Response(null, { status: 302, headers: { location: `${base}/` } })
      if (req.method === 'GET' && path === `${base}/`) return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
      if (req.method === 'GET' && path === `${base}/data`) {
        const given = existsSync(file) ? parseAnswers(read(file)) : new Map()
        return Response.json({ batch, applied: existsSync(applied), rows: rows.map((r) => ({ ...r, answers: answersFor(batch, r) })),
          answers: Object.fromEntries([...given].filter(([k]) => byKey.has(k)).map(([k, v]) => [k, v.answer])),
          hasNote: Object.fromEntries([...given].filter(([k]) => byKey.has(k)).map(([k, v]) => [k, v.note.trim() !== ''])) }, { headers: { 'cache-control': 'no-store' } })
      }
      if (req.method === 'POST' && path === `${base}/answer`) {
        const b = await req.json().catch(() => null)
        if (!b || typeof b.key !== 'string' || !byKey.has(b.key) || typeof b.answer !== 'string' || !answerOk(batch, byKey.get(b.key), b.answer)) return status(400)
        if (existsSync(applied)) return status(409)
        let note = String(b.note ?? '').replace(/[\t\r\n]/g, ' ').slice(0, 2000)
        // an empty note keeps the key's earlier note: the page never gets a note back to resend it
        if (!note.trim() && existsSync(file)) note = parseAnswers(read(file)).get(b.key)?.note ?? ''
        mkdirSync(answers, { recursive: true })
        appendFileSync(file, `${b.key}\t${b.answer}\t${note}\t${new Date().toISOString()}\n`)
        return status(200)
      }
      return status(404)
    },
  })
  console.log(`serve ${batch} port ${server.port}`)
  return server
}

// --- proxy (the amendment of step 9): a sealed reader agent answers a batch in place of the user ---
const PROXY_MODEL = 'claude-fable-5-1', PROXY_CHUNK = 10, PROXY_MAX_BYTES = 900_000
const PROXY_HEAD = 'You read for the human reader of a benchmark. You have no tools: everything you need is in this prompt. Answer each row from what it shows.'
const TRACE_BRIEF = 'Each check\'s label is one of `traceable`, `not traceable`, `partly`. Here the rule\'s folder is not given: each check\'s input, sheet, entry and check file(s) are below, in this prompt. Reply in the format at the end of this prompt, which replaces any reply format the rule above names.'
const BRIEFS = {
  'oracle-7.1': 'Each row is one check written for a hidden test set, its manifest entry, and the test it was rewritten from (the lines holding that test\'s title are marked `>> `). Read the check next to its original test and say whether they check the same behaviour: `same`, `different`, or `unclear` when the row does not let you tell.',
  inputs: 'Each row is the input every agent of a benchmark is given for one task (the requirement and its interface sheet), with the result of a mechanical check. Say whether the input holds code, a test, a source or test file path, a test pointer or the solution: `leak` if it does, `clean` if it does not.',
  labels: 'Each row is one commit of a task, with the label brief the labellers had as its first part: apply that brief to this commit only. The answer depends on the pair\'s kind: a `later` pair is `fix` or `requirement change`, an `in-task` pair is `fix` or `build`; the answers each row takes are listed under it. Reply in the format at the end of this prompt, which replaces any reply format the label brief names.',
  pairs: 'Each row is one task done by two variants of a coding agent: the diff of arm B, then the diff of arm B-. Say whether B-\'s work is visibly worse than B\'s: `B- worse`, `same` (about the same), or `B- better`.',
  // section 9.3 of the prereg, verbatim: the rules and the not-counted list only, nothing of the tool's rule
  history: `Each row is one human input in a past session in which a human worked with a coding agent on a plan: the agent's last message before it, the human's input, and where it falls. Label each event by these rules.

Labelling rules (one intervention =):

1. each time the agent stops to wait for a human answer;
2. each time a human must edit a file, run a command or restart for the run to continue;
3. a run abandoned because it cannot continue = 3 interventions.

Not counted: the harness's own automatic reminders, permission requests already covered by allow rules.

Answer \`rule 1\`, \`rule 2\` or \`rule 3\` for the rule that makes the event an intervention, or \`not counted\`.`,
}
// a row still unanswered after the rerun: the answer that stops a gate or leaves a check out, never one that passes
const proxyDefault = (batch, row) => (batch === 'labels' ? answersFor(batch, row).find((a) => a !== 'fix')
  : { 'oracle-7.1': 'unclear', 'rerate-7.2': 'partly', classify: 'partly', 'classify-2': 'partly', inputs: 'leak', pairs: 'same', history: 'not counted' }[batch])
const fenceFor = (text) => '`'.repeat(Math.max(3, ...(String(text).match(/`+/g) ?? []).map((s) => s.length + 1)))
const listOf = (as) => as.map((a) => `\`${a}\``).join(', ')

// page order, at most n rows a chunk; history by segment (the key less its `:<line>` and `#n`), a segment never split
function proxyChunks(batch, rows, n) {
  const groups = []
  for (const r of rows) {
    const g = batch === 'history' ? r.key.replace(/#\d+$/, '').replace(/:\d+$/, '') : r.key
    if (groups.at(-1)?.g === g) groups.at(-1).rows.push(r)
    else groups.push({ g, rows: [r] })
  }
  const out = []
  for (const { rows: rs } of groups) {
    if (out.length && out.at(-1).length + rs.length <= n) out.at(-1).push(...rs)
    else out.push([...rs])
  }
  return out
}

function proxyPrompt(data, batch, rows) {
  const brief = batch === 'classify' || batch === 'classify-2' || batch === 'rerate-7.2'
    ? `${read(join(data, 'briefs/classify.md')).trimEnd()}\n\n${TRACE_BRIEF}` : BRIEFS[batch]
  const sets = rows.map((r) => answersFor(batch, r)), same = new Set(sets.map((s) => s.join('\t'))).size === 1
  const body = rows.map((r, i) => [`### ${r.key}`, ...(same ? [] : [`Answers this row takes: ${listOf(sets[i])}.`]),
    ...r.parts.map((p) => { const f = fenceFor(p.text); return `#### ${p.title}\n\n${f}\n${String(p.text).trimEnd()}\n${f}` })].join('\n\n')).join('\n\n')
  return `${PROXY_HEAD}\n\n${brief}\n\n## The rows (${rows.length})\n\n${body}\n\n## Your reply\n\n` +
    `Reply with one JSON array and nothing after it: \`[{ "key": "<key>", "answer": "<answer>", "note": "<one or two sentences on why>" }]\`, ` +
    `naming every key of this prompt (each \`###\` heading) exactly once.${same ? ` \`answer\` is one of ${listOf(sets[0])}.` : ' `answer` is one of the answers its row takes.'}\n`
}

// the valid answers of a reply; ok when every key is answered once with an answer its row takes and nothing else is there
function proxyReply(text, batch, rows) {
  // from the first `[`, the first span to a `]` (longest first) that parses as a non-empty array of objects: a `[1]` around it is skipped
  let arr = null
  const objects = (a) => Array.isArray(a) && a.length && a.every((e) => e && typeof e === 'object' && !Array.isArray(e))
  for (let i = text.indexOf('['); i >= 0 && !arr; i = text.indexOf('[', i + 1)) {
    for (let j = text.lastIndexOf(']'); j > i && !arr; j = text.lastIndexOf(']', j - 1)) {
      try { const a = JSON.parse(text.slice(i, j + 1)); if (objects(a)) arr = a } catch {}
    }
  }
  const got = new Map()
  if (!Array.isArray(arr)) return { got, ok: false }
  const items = arr.map((e) => ({ key: e?.key ?? e?.id, answer: e?.answer ?? e?.label, note: e?.note })), seen = new Map(), byKey = new Map(rows.map((r) => [r.key, r]))
  for (const e of items) seen.set(e.key, (seen.get(e.key) ?? 0) + 1)
  for (const e of items) if (byKey.has(e.key) && seen.get(e.key) === 1 && answerOk(batch, byKey.get(e.key), e.answer)) got.set(e.key, { answer: e.answer, note: e.note })
  return { got, ok: got.size === rows.length && items.length === rows.length }
}

const sha256 = (s) => createHash('sha256').update(s).digest('hex')
async function proxy(data, q, batch, rest, agent) {
  const [taskFile, ...flags] = rest, o = { model: PROXY_MODEL, chunk: String(PROXY_CHUNK) }
  if (!taskFile || taskFile.startsWith('--') || flags.length % 2) throw new Error(USAGE)
  for (let i = 0; i < flags.length; i += 2) {
    const k = flags[i].slice(2)
    if (!['--model', '--chunk'].includes(flags[i]) || !flags[i + 1]) throw new Error(USAGE)
    o[k] = flags[i + 1]
  }
  if (!/^[1-9]\d*$/.test(o.chunk)) throw new Error(USAGE)
  const rows = readJson(join(q, 'pages', `${batch}.json`))
  if (!Array.isArray(rows)) throw new Error(`no page for ${batch}: build it first`)
  const answers = join(q, 'answers'), file = join(answers, `${batch}.tsv`)
  if (existsSync(join(answers, `${batch}.applied`))) { console.log(`proxy ${batch}: refused, the batch is applied`); return 1 }
  const dir = join(q, 'proxy', batch), model = o.model
  const chunks = proxyChunks(batch, rows, Number(o.chunk)).map((rs, i) => ({ c: i + 1, rows: rs, text: proxyPrompt(data, batch, rs) }))
  // runClaude passes the prompt in argv (macOS ARG_MAX 1 MiB with the env): check every chunk before any run
  const big = chunks.find((x) => Buffer.byteLength(x.text) > PROXY_MAX_BYTES)
  if (big) { console.log(`proxy ${batch}: refused, chunk ${big.c} is ${Buffer.byteLength(big.text)} bytes, over ${PROXY_MAX_BYTES}; use a smaller --chunk`); return 1 }
  const outOf = (c, n) => join(dir, `${c}${n === 1 ? '' : '-2'}.reply.md`)
  // a run whose record exists was made with another prompt: nothing runs and nothing is written
  const stale = chunks.flatMap(({ c, text }) => [1, 2].map((n) => readJson(`${outOf(c, n)}.run.json`)).filter((x) => x && x.promptSha !== sha256(text))).length
  if (stale) { console.log(`proxy ${batch}: refused, ${stale} run(s) whose prompt differs from the one they ran with`); return 1 }
  mkdirSync(dir, { recursive: true })
  let runs = 0, failed = 0
  const final = new Map()
  for (const { c, rows: rs, text } of chunks) {
    const prompt = join(dir, `${c}.prompt.md`)
    writeFileSync(prompt, text)
    for (const n of [1, 2]) {
      const out = outOf(c, n), rec = `${out}.run.json`
      if (!existsSync(rec)) {
        rmSync(out, { force: true })
        await agent([taskFile, `proxy-${batch}-${c}${n === 1 ? '' : '-2'}`, '--prompt', prompt, '--out', out, '--model', model], { record: (s) => ({ fellBack: fellBack(s) }) })
        const x = readJson(rec)
        if (x) writeFileSync(rec, JSON.stringify({ ...x, promptSha: sha256(text) }, null, 2) + '\n')
      }
      runs++
      const x = readJson(rec), ran = x?.code === 0 && x.models?.includes(model) && !x.fellBack // another model is a failed run
      if (!ran) failed++
      const res = ran ? proxyReply(existsSync(out) ? read(out) : '', batch, rs) : { got: new Map(), ok: false }
      if (res.ok || n === 2) { for (const [k, v] of res.got) final.set(k, v); break }
    }
  }
  const given = existsSync(file) ? parseAnswers(read(file)) : new Map(), at = new Date().toISOString()
  const lines = rows.map((r) => {
    const v = final.get(r.key), answer = v ? v.answer : proxyDefault(batch, r)
    const note = `proxy ${model}${v ? '' : ' default'}: ${v ? String(v.note ?? '') : ''}`.replace(/[\t\r\n]/g, ' ').slice(0, 2000)
    const was = given.get(r.key)
    return was?.answer === answer && was.note === note ? '' : `${r.key}\t${answer}\t${note}\t${at}\n` // the same answer again is not appended
  }).join('')
  if (lines) { mkdirSync(answers, { recursive: true }); appendFileSync(file, lines) }
  console.log(`proxy ${batch} (${model}): chunks ${chunks.length}, runs ${runs}, failed runs ${failed}, answered ${final.size}/${rows.length}, defaulted ${rows.length - final.size}`)
  return 0
}

function statusCmd(q) {
  const pages = join(q, 'pages'), answers = join(q, 'answers')
  for (const f of existsSync(pages) ? readdirSync(pages).filter((x) => x.endsWith('.json')).sort() : []) {
    const batch = f.slice(0, -5), keys = new Set((readJson(join(pages, f)) ?? []).map((r) => r.key))
    const given = existsSync(join(answers, `${batch}.tsv`)) ? parseAnswers(read(join(answers, `${batch}.tsv`))) : new Map()
    console.log(`status ${batch}: rows ${keys.size}, answered ${[...given.keys()].filter((k) => keys.has(k)).length}, applied ${existsSync(join(answers, `${batch}.applied`)) ? 'yes' : 'no'}`)
  }
  return 0
}

// a number is an exit code; serve returns its server, which keeps the process up
export async function human(argv, { agent = sealedAgent } = {}) {
  if (!process.env.HSTACK_BENCH_MACHINE) throw new Error('set HSTACK_BENCH_MACHINE to the machine file (for example .evidence/bench/machine.json)')
  const data = dataDir()
  // `--queue <dir>`: where the reads of build, serve, status, apply and proxy live (default step 9's folder)
  let args = argv, q = join(data, 'step9')
  const qi = argv.indexOf('--queue')
  if (qi > 0 && ['build', 'serve', 'status', 'apply', 'proxy'].includes(argv[0])) {
    if (!argv[qi + 1]) throw new Error(USAGE)
    q = resolve(argv[qi + 1])
    args = argv.filter((_, i) => i !== qi && i !== qi + 1)
  }
  const [cmd, batch, ...rest] = args
  if (cmd === 'swap' && (args.length === 1 || (args.length === 3 && batch === '--drop'))) return swap(data, args.length === 3 ? rest[0].split(',') : [])
  if (cmd === 'build' && batch) return build(data, q, batch, rest)
  if (cmd === 'serve' && batch) {
    const root = rest.includes('--root'), o = rest.filter((x) => x !== '--root'), ok = rest.length - o.length <= 1
    if (ok && (o.length === 0 || (o.length === 2 && o[0] === '--port' && /^\d+$/.test(o[1])))) return serve(data, batch, o.length ? Number(o[1]) : 0, root, q)
  }
  if (cmd === 'status' && args.length === 1) return statusCmd(q)
  if (cmd === 'history' && args.length === 3) return history(data, batch, rest[0])
  if (cmd === 'kappa' && batch === 'history' && args.length === 2) return kappaHistory(data)
  if (cmd === 'apply' && args.length === 2) return apply(data, q, batch)
  if (cmd === 'proxy' && Object.hasOwn(BATCHES, batch ?? '')) return proxy(data, q, batch, rest, agent)
  if (cmd === 'recount' && (args.length === 1 || (args.length === 3 && batch === '--drop'))) return recount(data, args.length === 3 ? rest[0].split(',') : [])
  throw new Error(USAGE)
}

if (import.meta.main) {
  try { const r = await human(process.argv.slice(2)); if (typeof r === 'number') process.exit(r) } catch (e) { console.error(e.message); process.exit(2) }
}
