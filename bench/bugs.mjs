#!/usr/bin/env bun
// Give each bug file of a folder its owner task and say which layers it can feed (check mode), or list the bug files
// a layer can take (--usable: reads the written `out` only, so batches running at once can all call it).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { ROOT, withWorktree } from './env.mjs'
import { resolveCommit } from './grade.mjs'
import { loadTask } from './lib/task.mjs'
import { readBug, reverseApply } from './replay.mjs'

const USAGE = 'usage: bun bench/bugs.mjs <task.json> <folder> [--sealed] [--usable <unit|int|e2e|evaluator|review|audit>]'
const TESTS = [null, 'no owner', 'fix in end']
const USABLE = { unit: TESTS, int: TESTS, e2e: TESTS, evaluator: [null, 'fix in end'], review: [null], audit: [null] }

// exit code of a git command that answers yes (0) or no (1)
const gitCode = (repo, ...args) => Bun.spawn(['git', '-C', repo, ...args], { stdout: 'ignore', stderr: 'ignore' }).exited
async function gitOut(repo, ...args) {
  const p = Bun.spawn(['git', '-C', repo, ...args], { stdout: 'pipe', stderr: 'ignore' })
  const [out, code] = [await new Response(p.stdout).text(), await p.exited]
  if (code !== 0) throw new Error(`git ${args[0]} failed (exit ${code})`)
  return out
}

const opt = (v) => v === undefined || (typeof v === 'string' && v !== '')
async function readBugFile(path) {
  const bug = await readBug(path, ['fix', 'at', 'patch', 'description'])
  const ok = Array.isArray(bug.hunks) && bug.hunks.length > 0 &&
    bug.hunks.every((h) => typeof h?.file === 'string' && h.file !== '' && Number.isInteger(h.old) && h.old >= 0)
  if (!ok) throw new Error('bug hunks must be a non-empty array of { file, old } with old a line number')
  for (const f of ['kind', 'severity', 'source', 'dropped']) if (!opt(bug[f])) throw new Error(`bug ${f} must be a non-empty string when given`)
  return bug
}

// tsv rows of every task: { task, commit, file, old, lines }
function readRows(data, tasks) {
  return Object.keys(tasks).flatMap((t) => readFileSync(join(data, 'tasks', `${t}.tsv`), 'utf8').split('\n').slice(1).filter(Boolean).map((l) => {
    const [commit, file, old, lines] = l.split('\t')
    return { task: t, commit, file, old: Number(old.split(',')[0]), lines: Number(lines) }
  }))
}

const tally = (label, list) => {
  const n = new Map()
  for (const v of list) n.set(v, (n.get(v) ?? 0) + 1)
  return `${label}: ${[...n].sort(([a], [b]) => (a < b ? -1 : 1)).map(([v, c]) => `${v} ${c}`).join(', ')}`
}

export async function bugs(args, { root = ROOT } = {}) {
  const sealed = args.includes('--sealed')
  const pos = args.filter((a) => a !== '--sealed')
  const u = pos.indexOf('--usable'), layer = u >= 0 ? pos.splice(u, 2)[1] : undefined
  if (pos.length !== 2 || (u >= 0 && !Object.hasOwn(USABLE, layer))) throw new Error(USAGE)
  const [taskPath, folder] = pos
  const names = readdirSync(folder).filter((n) => n.endsWith('.json') && !n.endsWith('.run.json') && n !== 'done.json').sort()

  if (layer) { // no git, no worktree, no write
    const files = await Promise.all(names.map(async (n) => [n, await Bun.file(join(folder, n)).json()]))
    const missing = files.filter(([, b]) => b?.out === undefined)
    for (const [n] of missing) console.error(`${n} has no out: run the check first`)
    if (missing.length) return 1
    for (const [n, b] of files) if (USABLE[layer].includes(b.out)) console.log(join(folder, n))
    return 0
  }

  const task = await loadTask(taskPath)
  const data = dirname(resolve(process.env.HSTACK_BENCH_MACHINE))
  const tasks = await Bun.file(join(data, 'tasks.json')).json(), order = Object.keys(tasks)
  const rows = readRows(data, tasks)
  const ranges = new Map() // task -> Set of the full shas of base..end, first parent
  const range = async (t) => {
    if (!ranges.has(t)) ranges.set(t, new Set((await gitOut(task.repo, 'rev-list', '--first-parent', `${tasks[t].base}..${tasks[t].end}`)).split('\n').filter(Boolean)))
    return ranges.get(t)
  }

  // the owner: most tsv lines over the bug's hunks (ties: earlier task), else the task whose range holds the fix
  const owner = async (bug, fix) => {
    const lines = new Map()
    for (const r of rows) if (r.commit === fix.slice(0, 7) && bug.hunks.some((h) => h.file === r.file && h.old === r.old))
      lines.set(r.task, (lines.get(r.task) ?? 0) + r.lines)
    if (lines.size) return order.reduce((best, t) => ((lines.get(t) ?? -1) > (lines.get(best) ?? -1) ? t : best))
    for (const t of order) if ((await range(t)).has(fix)) return t
    return null
  }

  const done = [], fail = (n, e) => console.log(sealed ? `${n} invalid` : `${n} invalid: ${e.message}`)
  let code = 0
  for (const n of names) {
    const path = join(folder, n)
    try {
      const bug = await readBugFile(path)
      let t = null, out = null
      if (bug.dropped) out = 'dropped'
      else {
        const fix = await resolveCommit(task.repo, bug.fix)
        t = await owner(bug, fix)
        const applies = await withWorktree(task, bug.at, `check-${bug.id}`, (dir) => reverseApply(bug, sealed, { checkOnly: true })(dir).then(() => true, () => false), root)
        if (!applies) out = 'patch does not apply'
        else if ((await gitCode(task.repo, 'rev-parse', '-q', '--verify', `${fix}^2`)) === 0) out = 'fix is a merge commit'
        else if (!t) out = 'no owner'
        else {
          const c = await gitCode(task.repo, 'merge-base', '--is-ancestor', fix, tasks[t].end)
          if (c > 1) throw new Error(`git merge-base failed (exit ${c})`)
          if (c === 0) out = 'fix in end'
        }
      }
      // the raw file, not readBug's copy: that one holds the patch as an absolute path
      const { task: _t, base: _b, end: _e, out: _o, ...rest } = await Bun.file(path).json()
      await Bun.write(path, JSON.stringify({ ...rest, task: t, ...(t ? { base: tasks[t].base, end: tasks[t].end } : {}), out }, null, 2) + '\n')
      done.push({ ...bug, task: t, out })
      if (!sealed) console.log(`${bug.id} task=${t ?? 'none'} out=${out ?? 'ok'}`)
    } catch (e) {
      fail(n, e)
      code = 1
    }
  }

  const ids = (o) => done.filter((b) => b.out === o).map((b) => b.id).join(' ') || 'none'
  console.log(`bugs: ${done.length}`)
  for (const f of ['source', 'kind', 'severity', 'task']) console.log(tally(f, done.map((b) => b[f] ?? 'none')))
  console.log(tally('out', done.map((b) => b.out ?? 'ok')))
  console.log(`usable: ${Object.entries(USABLE).map(([l, outs]) => `${l} ${done.filter((b) => outs.includes(b.out)).length}`).join(', ')}`)
  console.log(`patch does not apply: ${ids('patch does not apply')}`)
  console.log(`fix is a merge commit: ${ids('fix is a merge commit')}`)
  const donePath = join(folder, 'done.json')
  if (existsSync(donePath)) console.log(`finished: ${await Bun.file(donePath).json().then((d) => d?.finished, () => 'invalid')}`)
  const sum = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, models = []
  for (const n of readdirSync(folder).filter((n) => n.endsWith('.run.json')).sort()) {
    try {
      const rec = await Bun.file(join(folder, n)).json()
      for (const k of Object.keys(sum)) if (!Number.isFinite(rec.usage[k])) throw new Error(`usage ${k} is not a number`)
      for (const k of Object.keys(sum)) sum[k] += rec.usage[k]
      for (const m of rec.models ?? []) if (!models.includes(m)) models.push(m)
    } catch (e) { fail(n, e); code = 1 }
  }
  console.log(`usage ${Object.values(sum).join('/')} models ${models.join(',') || 'none'}`)
  return code
}

if (import.meta.main) {
  try { process.exit(await bugs(process.argv.slice(2))) } catch (e) { console.error(e.message); process.exit(2) }
}
