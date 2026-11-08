#!/usr/bin/env bun
// Step 9's human reads (rulings 2, 3, 10 and 11): each batch is built as a page file and served on 127.0.0.1 behind a
// token; the answers are appended to data files. Prints counts only: a row, a page, an answer and a note are sealed.
import { randomBytes } from 'node:crypto'
import { appendFileSync, chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { gitOut } from './bugs.mjs'
import { ARMS } from './canary.mjs'
import { taskOf } from './ext.mjs'
import { check } from './input-check.mjs'
import { answerOk, answersFor, BATCHES, coldSwap, parseAnswers } from './lib/human.mjs'
import { loadTask } from './lib/task.mjs'
import { dataDir, labelLines, poolKeys, queueDraw, queuePools, readPairs, seedOf } from './oracle.mjs'

const USAGE = 'usage: bun bench/human.mjs swap [--drop <task,...>] | build <inputs|rerate-7.2|classify|classify-2|pairs> | build oracle-7.1 <task.json> | build labels <task.json> --log <file|dir> [--log <file|dir> ...] --attribution <file> | serve <batch> [--port <n>] | status'
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

// --- swap (ruling 3) ---
const SWAPPED = ['sample-7.1', 'sample-7.2', 'inputs']
function swap(data, drop) {
  const q = join(data, 'step9'), seed = seedOf(data), { pools } = queuePools(data, drop)
  const cold = new Set(tsvRows(join(data, 'ext/sample.tsv')).filter((r) => r.cold_setup === 'yes').map((r) => r.task))
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

function inputs(data) {
  return tsvRows(sampleOf(join(data, 'step9'), 'inputs')).map(({ task }) => {
    const input = read(join(data, task, 'input.md')), hits = check(input)
    return { key: task, task, parts: [part('input.md', input), part('interface.md', read(join(data, task, 'interface.md'))),
      part('input-check', hits.length ? `FAIL ${hits.length} hits` : 'PASS no code, test or source pointer')] }
  })
}

async function oracle71(data, taskFile) {
  if (!taskFile) throw new Error(USAGE)
  const q = join(data, 'step9'), tasks = readJson(join(data, 'tasks.json')) ?? {}, repo = (await loadTask(taskFile)).repo
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
const rerate = (data) => tsvRows(sampleOf(join(data, 'step9'), 'sample-7.2')).map((r) => classView(data, r.task, r.id))
// classify.tsv and the step 6 addition `<task>-classify.tsv`
const classify = (data) => readdirSync(join(data, 'step9')).filter((f) => /^(.+-)?classify\.tsv$/.test(f)).sort().flatMap((f) => tsvRows(join(data, 'step9', f))).map((r) => classView(data, r.task, r.id))
// the second batch's disputes: the disputed ids of each task's b2 rounds
const classify2 = (data) => queuePools(data).sets.flatMap(([, ts]) => ts).flatMap((t) =>
  (readJson(join(data, t, 'agreement.json'))?.splitRounds ?? []).filter((x) => x.name.includes('b2')).flatMap((x) => x.disputed ?? []).map((id) => classView(data, t, id)))

async function labels(data, taskFile, logs, attribution) {
  if (!taskFile || !logs.length || !attribution) throw new Error(USAGE)
  const repo = (await loadTask(taskFile)).repo, pairs = readPairs(join(data, 'sources')), logFiles = logs.flatMap(filesUnder)
  const naming = (files, sha7) => files.flatMap((f) => read(f).split('\n').filter((l) => l.includes(sha7)).map((l) => `${relative(data, f).startsWith('..') ? f : relative(data, f)}: ${l}`)).join('\n')
  const brief = read(join(data, 'briefs/label.md')), out = []
  for (const { commit, task } of tsvRows(join(data, 'step9/labels.tsv'))) {
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

const VIEWS = { inputs, 'oracle-7.1': oracle71, 'rerate-7.2': rerate, classify, 'classify-2': classify2, labels, pairs: pairsView }

async function build(data, batch, rest) {
  if (!Object.hasOwn(VIEWS, batch)) throw new Error(USAGE)
  const logs = [], pos = []
  let attribution = null
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--log' && rest[i + 1]) logs.push(rest[++i])
    else if (rest[i] === '--attribution' && rest[i + 1]) attribution = rest[++i]
    else pos.push(rest[i])
  }
  if (pos.length > 1 || (batch !== 'labels' && (logs.length || attribution))) throw new Error(USAGE)
  const rows = await VIEWS[batch](data, pos[0], logs, attribution)
  if (new Set(rows.map((r) => r.key)).size !== rows.length) throw new Error(`build ${batch}: a key is there twice`)
  const pages = join(data, 'step9/pages')
  mkdirSync(pages, { recursive: true })
  writeFileSync(join(pages, `${batch}.json`), JSON.stringify(rows.map(({ key, kind, parts }) => ({ key, ...(kind ? { kind } : {}), parts })), null, 2) + '\n')
  // the sealed record of what the user was shown (ruling 2): batch, task, key, once each
  const seen = join(data, 'step9/seen.tsv'), had = new Set(tsvRows(seen).map((r) => `${r.batch}\t${r.key}`))
  if (!existsSync(seen)) writeFileSync(seen, 'batch\ttask\tkey\n')
  const add = rows.filter((r) => !had.has(`${batch}\t${r.key}`)).map((r) => `${batch}\t${r.task}\t${r.key}\n`).join('')
  if (add) appendFileSync(seen, add)
  console.log(`build ${batch}: rows ${rows.length}, parts ${rows.reduce((s, r) => s + r.parts.length, 0)}`)
  return 0
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

export function serve(data, batch, port = 0) {
  if (!Object.hasOwn(BATCHES, batch)) throw new Error(USAGE)
  const pages = join(data, 'step9/pages'), rows = readJson(join(pages, `${batch}.json`))
  if (!Array.isArray(rows)) throw new Error(`no page for ${batch}: build it first`)
  const answers = join(data, 'step9/answers'), file = join(answers, `${batch}.tsv`), applied = join(answers, `${batch}.applied`)
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

function statusCmd(data) {
  const pages = join(data, 'step9/pages'), answers = join(data, 'step9/answers')
  for (const f of existsSync(pages) ? readdirSync(pages).filter((x) => x.endsWith('.json')).sort() : []) {
    const batch = f.slice(0, -5), keys = new Set((readJson(join(pages, f)) ?? []).map((r) => r.key))
    const given = existsSync(join(answers, `${batch}.tsv`)) ? parseAnswers(read(join(answers, `${batch}.tsv`))) : new Map()
    console.log(`status ${batch}: rows ${keys.size}, answered ${[...given.keys()].filter((k) => keys.has(k)).length}, applied ${existsSync(join(answers, `${batch}.applied`)) ? 'yes' : 'no'}`)
  }
  return 0
}

// a number is an exit code; serve returns its server, which keeps the process up
export async function human(args) {
  if (!process.env.HSTACK_BENCH_MACHINE) throw new Error('set HSTACK_BENCH_MACHINE to the machine file (for example .evidence/bench/machine.json)')
  const data = dataDir(), [cmd, batch, ...rest] = args
  if (cmd === 'swap' && (args.length === 1 || (args.length === 3 && batch === '--drop'))) return swap(data, args.length === 3 ? rest[0].split(',') : [])
  if (cmd === 'build' && batch) return build(data, batch, rest)
  if (cmd === 'serve' && batch && (rest.length === 0 || (rest.length === 2 && rest[0] === '--port' && /^\d+$/.test(rest[1])))) return serve(data, batch, rest.length ? Number(rest[1]) : 0)
  if (cmd === 'status' && args.length === 1) return statusCmd(data)
  throw new Error(USAGE)
}

if (import.meta.main) {
  try { const r = await human(process.argv.slice(2)); if (typeof r === 'number') process.exit(r) } catch (e) { console.error(e.message); process.exit(2) }
}
