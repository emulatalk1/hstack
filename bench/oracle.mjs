#!/usr/bin/env bun
// Oracle preparation of the task repo (step 5, ruling 7): pair each source commit with its owner task, label each
// pair twice by sealed agents, merge the labels. Prints counts only: a reply is sealed.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { gitOut, readRows } from './bugs.mjs'
import { hunkOwners } from './lib/oracle.mjs'
import { isTestPath } from './lib/replay.mjs'
import { loadTask } from './lib/task.mjs'
import { sealedAgent } from './sealed-agent.mjs'

const USAGE = 'usage: bun bench/oracle.mjs pairs <task.json> [--drop <task,...>] | label <task.json> <1|2> <task> | labels'
const LABELS = { later: ['fix', 'requirement change'], 'in-task': ['fix', 'build'] }
const PAIRS_HEAD = 'commit\ttask\tkind\thunks'

const dataDir = () => dirname(resolve(process.env.HSTACK_BENCH_MACHINE))
const readPairs = (src) => readFileSync(join(src, 'pairs.tsv'), 'utf8').split('\n').slice(1).filter(Boolean)
  .map((l) => { const [commit, task, kind, hunks] = l.split('\t'); return { commit, task, kind, hunks: hunks ? hunks.split(',') : [] } })

// { file, old } per hunk of a -U0 diff; a deleted file keeps its old path
function diffHunks(diff) {
  const out = []
  let file = null
  for (const line of diff.split('\n')) {
    if (line.startsWith('--- ')) file = line === '--- /dev/null' ? null : line.slice(6)
    else if (line.startsWith('+++ ') && line !== '+++ /dev/null') file = line.slice(6)
    const m = line.match(/^@@ -(\d+)/)
    if (m && file) out.push({ file, old: Number(m[1]) })
  }
  return out
}

async function pairs(taskPath, drop) {
  const { repo } = await loadTask(taskPath)
  const data = dataDir(), src = join(data, 'sources')
  const tasks = await Bun.file(join(data, 'tasks.json')).json(), order = Object.keys(tasks)
  for (const t of drop) if (!order.includes(t)) throw new Error(`--drop ${t} is not a task of tasks.json`)
  const keep = order.filter((t) => !drop.includes(t))
  const rows = readRows(data, tasks) // every task, dropped ones too: they still own their hunks
  const tested = new Set(rows.filter((r) => r.tests === 'yes').map((r) => r.commit))
  const found = new Map() // `${commit}\t${task}` -> pair
  const add = (commit, task, kind, hunks) => {
    const k = `${commit}\t${task}`, p = found.get(k) ?? { commit, task, kind, hunks: [] }
    if (p.kind !== kind) throw new Error(`${commit} is both a later and an in-task commit of ${task}`)
    p.hunks.push(...hunks.filter((h) => !p.hunks.includes(h)))
    found.set(k, p)
  }
  for (const t of keep) {
    for (const c of (await gitOut(repo, 'rev-list', '--reverse', '--first-parent', `${tasks[t].base}..${tasks[t].end}`)).split('\n').filter(Boolean)) {
      const files = (await gitOut(repo, 'diff', '--name-only', '--no-renames', `${c}^`, c)).split('\n').filter(Boolean)
      if (!files.some(isTestPath)) continue
      const hunks = diffHunks(await gitOut(repo, 'diff', '-U0', '--no-renames', `${c}^`, c)).filter((h) => !isTestPath(h.file))
      add(c.slice(0, 7), t, 'in-task', hunks.map((h) => `${h.file}:${h.old}`))
    }
  }
  for (const [k, t] of hunkOwners(rows, order)) {
    const [commit, file, old] = k.split('\t')
    if (tested.has(commit) && keep.includes(t)) add(commit, t, 'later', [`${file}:${old}`])
  }
  const list = [...found.values()].sort((a, b) => order.indexOf(a.task) - order.indexOf(b.task) || (a.kind === b.kind ? 0 : a.kind === 'in-task' ? -1 : 1))
  mkdirSync(src, { recursive: true })
  writeFileSync(join(src, 'pairs.tsv'), [PAIRS_HEAD, ...list.map((p) => [p.commit, p.task, p.kind, p.hunks.join(',')].join('\t'))].join('\n') + '\n')
  for (const t of keep) {
    const n = (kind) => list.filter((p) => p.task === t && p.kind === kind).length
    console.log(`${t}: in-task ${n('in-task')}, later ${n('later')}`)
  }
  console.log(`pairs: ${list.length}`)
  return 0
}

// the valid labels of a reply: the JSON array inside it (a code fence or prose around it is ignored); ok when every
// pair is labelled exactly once and nothing else is
function parseReply(text, list) {
  const got = new Map()
  let arr = null
  try { arr = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1)) } catch {}
  if (!Array.isArray(arr)) return { got, ok: false }
  const kinds = new Map(list.map((p) => [p.commit, p.kind])), seen = new Map()
  for (const e of arr) seen.set(e?.commit, (seen.get(e?.commit) ?? 0) + 1)
  for (const e of arr) if (kinds.has(e?.commit) && seen.get(e.commit) === 1 && LABELS[kinds.get(e.commit)].includes(e.label)) got.set(e.commit, e.label)
  return { got, ok: got.size === list.length && arr.length === list.length }
}

const runName = (r, task, n) => `label-${r}-${task}${n === 1 ? '' : '-2'}`
// the reply that counts: the rerun's when it ran, else the first run's
function finalReply(src, r, task) {
  for (const n of [2, 1]) {
    const out = join(src, `${runName(r, task, n)}.reply.md`)
    if (existsSync(`${out}.run.json`)) return { runs: n, text: existsSync(out) ? readFileSync(out, 'utf8') : '' }
  }
  return { runs: 0, text: '' }
}

async function label(taskPath, r, task, agent) {
  if (!['1', '2'].includes(r)) throw new Error(USAGE)
  const { repo } = await loadTask(taskPath)
  const data = dataDir(), src = join(data, 'sources')
  const tasks = await Bun.file(join(data, 'tasks.json')).json()
  const list = readPairs(src).filter((p) => p.task === task)
  if (!list.length) throw new Error(`no pairs of ${task} in pairs.tsv`)
  const subjects = new Map(readRows(data, tasks).map((x) => [x.commit, x.subject]))
  const lines = []
  for (const p of list) {
    const subject = p.kind === 'later' ? subjects.get(p.commit) : (await gitOut(repo, 'log', '-1', '--format=%s', p.commit)).trim()
    const hunks = p.hunks.length ? p.hunks.map((h) => { const i = h.lastIndexOf(':'); return `${h.slice(0, i)} line ${h.slice(i + 1)}` }).join(', ') : 'none (it changes test files only)'
    lines.push(`- ${p.commit} (${p.kind}): ${subject}\n  hunks: ${hunks}`)
  }
  const { no, plan, base, end } = tasks[task]
  const prompt = `${readFileSync(join(data, 'briefs/label.md'), 'utf8')}\n## The task\n\n${task}: plan ${no} (\`${plan}\`), its commits ${base}..${end} (first parent).\n\n## The commits (${list.length})\n\n${lines.join('\n')}\n`
  const promptFile = join(src, 'prompts', `label-${task}.md`)
  mkdirSync(dirname(promptFile), { recursive: true })
  // both labellers get the same text; it is written only when it differs, so a running labeller never sees it change
  if (!existsSync(promptFile) || readFileSync(promptFile, 'utf8') !== prompt) writeFileSync(promptFile, prompt)
  for (const n of [1, 2]) {
    const name = runName(r, task, n), out = join(src, `${name}.reply.md`)
    if (!existsSync(`${out}.run.json`)) await agent([taskPath, name, '--prompt', promptFile, '--out', out, '--tools', 'Read,Grep,Glob,Bash', '--settings', join(data, 'briefs/label-settings.json')])
    if (parseReply(existsSync(out) ? readFileSync(out, 'utf8') : '', list).ok) break
  }
  const { runs, text } = finalReply(src, r, task)
  console.log(`label ${r} ${task}: pairs ${list.length}, labelled ${parseReply(text, list).got.size}, runs ${runs}`)
  return 0
}

async function labels() {
  const src = join(dataDir(), 'sources'), list = readPairs(src)
  const got = new Map() // `${r}\t${task}` -> Map commit -> label
  const of = (r, p) => {
    const k = `${r}\t${p.task}`
    if (!got.has(k)) got.set(k, parseReply(finalReply(src, r, p.task).text, list.filter((q) => q.task === p.task)).got)
    return got.get(k).get(p.commit) ?? 'none'
  }
  const rows = list.map((p) => {
    const l1 = of(1, p), l2 = of(2, p)
    const source = l1 === 'fix' && l2 === 'fix' ? 'yes' : l1 !== 'none' && l2 !== 'none' && l1 !== 'fix' && l2 !== 'fix' ? 'no' : 'step9'
    return { ...p, l1, l2, source }
  })
  writeFileSync(join(src, 'labels.tsv'), ['commit\ttask\tkind\tl1\tl2\tsource', ...rows.map((x) => [x.commit, x.task, x.kind, x.l1, x.l2, x.source].join('\t'))].join('\n') + '\n')
  const count = (xs, s) => xs.filter((x) => x.source === s).length
  for (const t of [...new Set(rows.map((x) => x.task))]) {
    const xs = rows.filter((x) => x.task === t)
    console.log(`${t}: pairs ${xs.length}, agreed fix ${count(xs, 'yes')}, agreed not fix ${count(xs, 'no')}, disputed ${count(xs, 'step9')}`)
  }
  console.log(`total: pairs ${rows.length}, agreed fix ${count(rows, 'yes')}, agreed not fix ${count(rows, 'no')}, disputed ${count(rows, 'step9')}`)
  return 0
}

export async function oracle(args, { agent = sealedAgent } = {}) {
  if (!process.env.HSTACK_BENCH_MACHINE) throw new Error('set HSTACK_BENCH_MACHINE to the machine file (for example .evidence/bench/machine.json)')
  const [cmd, taskPath, ...rest] = args
  if (cmd === 'pairs' && taskPath && (rest.length === 0 || (rest.length === 2 && rest[0] === '--drop'))) return pairs(taskPath, rest.length ? rest[1].split(',') : [])
  if (cmd === 'label' && taskPath && rest.length === 2) return label(taskPath, rest[0], rest[1], agent)
  if (cmd === 'labels' && args.length === 1) return labels()
  throw new Error(USAGE)
}

if (import.meta.main) {
  try { process.exit(await oracle(process.argv.slice(2))) } catch (e) { console.error(e.message); process.exit(2) }
}
