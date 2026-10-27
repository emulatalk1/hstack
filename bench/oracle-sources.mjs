#!/usr/bin/env bun
// Lists the later commits whose source hunks change lines a task's commits wrote.
// Usage: bun bench/oracle-sources.mjs <repo> <task-commits comma-separated> [last-commit, default HEAD]
// Rule (pre-registered): a hunk belongs to the task when a line it removes, or for a pure
// addition the old line it is inserted after, was last written by a task commit (git blame at the parent).
// Tests, docs and generated files are not source; the output says whether the commit also changes tests.
import { $ } from 'bun'

const [repo, taskArg, last = 'HEAD'] = Bun.argv.slice(2)
if (!repo || !taskArg) {
  console.error('usage: oracle-sources.mjs <repo> <task-commits,...> [last-commit]')
  process.exit(2)
}
const git = (...a) => $`git -C ${repo} ${a}`.quiet().text()
const full = async (s) => (await git('rev-parse', s)).trim()
const task = await Promise.all(taskArg.split(',').map(full))
const taskSet = new Set(task)
const notSource = (f) => /^(tests?|docs)\//.test(f) || /\.(md|snap|png|jpe?g|webp|svg|ico)$/.test(f) ||
  /(importMap\.js|payload-types\.ts|migrations\/.*\.json)$/.test(f)

// later commits = after the last task commit, up to `last`, oldest first
const tip = task.at(-1)
const later = (await git('rev-list', '--reverse', `${tip}..${last}`)).split('\n').filter(Boolean)

export function hunks(diff) {
  const out = []
  let file = null
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) file = line === '+++ /dev/null' ? null : line.slice(6)
    else if (line.startsWith('--- ') && line !== '--- /dev/null') file = line.slice(6)
    const m = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)
    if (m && file) out.push({ file, a: +m[1], b: m[2] === undefined ? 1 : +m[2], c: +m[3] })
  }
  return out
}

console.log(['commit', 'file', 'old_lines', 'task_lines', 'tests_changed', 'subject'].join('\t'))
for (const c of later) {
  const parents = (await git('rev-list', '--parents', '-n1', c)).trim().split(' ')
  if (parents.length !== 2) continue // skip merges and the root
  const changed = (await git('diff', '--name-only', `${c}^`, c)).split('\n').filter(Boolean)
  const tests = changed.some((f) => /^tests?\//.test(f))
  const subject = (await git('log', '-1', '--format=%s', c)).trim().slice(0, 120)
  const diff = await git('diff', '-U0', '--no-renames', `${c}^`, c)
  for (const h of hunks(diff)) {
    if (notSource(h.file)) continue
    const start = h.a
    const count = h.b === 0 ? 1 : h.b
    if (start < 1) continue // insertion at the top of a file: no old line to blame
    let blame
    try {
      blame = await git('blame', '-l', '-s', '-L', `${start},+${count}`, `${c}^`, '--', h.file)
    } catch {
      continue // file created in this commit
    }
    const owners = blame.split('\n').filter(Boolean).map((l) => l.replace(/^\^/, '').slice(0, 40))
    const mine = owners.filter((o) => taskSet.has(o)).length
    if (mine) console.log([c.slice(0, 7), h.file, `${start},${count}`, mine, tests ? 'yes' : 'no', subject].join('\t'))
  }
}
