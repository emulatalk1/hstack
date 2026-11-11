#!/usr/bin/env bun
// H5 (step 13 ruling 9): do the test files an arm's run wrote catch the task's kept seeded bugs, ported onto its product P? Per bug: its check
// at P; on a pass, one sealed porter writes the bug's edit for P, committed in the sealed repo under refs/h5/<run>/<bug> and kept only
// when the check fails there; then P's own test files run at P and at P + edit. Prints one count line; never a grade, a bug or a reply.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { dataOf, suiteRun, taskOf } from './ext.mjs'
import { resolveCommit } from './grade.mjs'
import { readJunit } from './lib/junit.mjs'
import { caseId } from './lib/oracle.mjs'
import { loadTask } from './lib/task.mjs'
import { editCommit, hasResults, once, resultIn, testFile } from './oracle.mjs'
import { sealedAgent } from './sealed-agent.mjs'

const USAGE = 'usage: bun bench/h5.mjs <task> <arm> <run>'
const readJson = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')) } catch { return null } }
const fence = (text, lang = '') => `\`\`\`\`${lang}\n${text.trimEnd()}\n\`\`\`\`\n`
const boxFile = (data, task, dir = 'env/box') => join(data, dir, `${task}.json`)
const testPathsOf = (data, t) => readJson(join(data, 'ext/groups.json'))?.groups?.find((g) => g.id === t.stack)?.testPaths ?? []

// one sealed porter on P's files (the store's task file, read tools only) given the bug's description and edit and nothing else of it;
// its reply's edit through the seeder's gates, committed on P in the sealed repo (env/box-seeded's repo) under refs/h5/<run>/<bug>.
// work holds the prompt and the reply: a rerun with the same prompt reuses them
export async function portEdit({ data, task, bug, product, run, work, agent = sealedAgent, brief = join(data, 'briefs/porter.md') }) {
  const t = taskOf(join(data, 'ext'), task), sealed = JSON.parse(readFileSync(boxFile(data, task, 'env/box-seeded'), 'utf8')).repo
  const edit = { file: bug.edit.file, find: bug.edit.find, replace: bug.edit.replace } // picked: nothing else of the bug goes in
  const text = [readFileSync(brief, 'utf8').trimEnd() + '\n', `## The bug\n\n${fence(bug.description, 'markdown')}`,
    `## Its edit on the commit it was written for\n\n${fence(JSON.stringify(edit, null, 2), 'json')}`].join('\n')
  const out = join(work, `${bug.id}.reply.md`), label = `h5-${basename(work)}-${bug.id}`.toLowerCase()
  mkdirSync(work, { recursive: true })
  const r = await once(agent, { prompt: join(work, `${bug.id}.prompt.md`), text, out }, [boxFile(data, task), label, '--at', product, '--tools', 'Read,Glob,Grep'])
  if (r.stale) throw new Error(`${task} h5: a porter run's prompt differs from the one it ran with`)
  // a run that did not end (a limit, a timeout) is the machine's, never a refusal: its record stays until removed
  if (r.code !== 0) throw new Error(`${task} h5: the porter run of ${bug.id} exited ${r.code}; remove ${out}.run.json to run it again`)
  if (!existsSync(out)) return { refused: 'no reply' }
  let e = null
  try { const reply = readFileSync(out, 'utf8'); e = JSON.parse(reply.slice(reply.indexOf('{'), reply.lastIndexOf('}') + 1)) } catch {}
  if (![e?.file, e?.find, e?.replace].every((s) => typeof s === 'string')) return { refused: 'reply' }
  const port = { file: e.file, find: e.find, replace: e.replace }
  const c = await editCommit(sealed, product, port, `refs/h5/${run}/${bug.id}`, { testPaths: testPathsOf(data, t), message: 'h5 port' })
    .catch(() => { throw new Error(`${task} h5: git failed on a port`) }) // its message may quote the edit
  return c.why ? { refused: c.why } : { edit: port, commit: c.commit }
}

// grade.mjs in its own process: its stdout (a count line) is not this tool's; its exit code
const gradeCmd = async (args) => {
  const p = Bun.spawn([process.execPath, join(import.meta.dir, 'grade.mjs'), ...args], { stdin: 'ignore', stdout: 'ignore', stderr: 'ignore' })
  return p.exited
}

export async function h5(args, inj = {}) {
  const [task, arm, run] = args
  if (args.length !== 3 || !/^[a-z0-9][a-z0-9_-]*$/.test(task) || !/^[A-Za-z]+-?$/.test(arm) || !/^\d+$/.test(run)) throw new Error(USAGE)
  const { grade = gradeCmd, agent = sealedAgent, suite = (a) => suiteRun(a, { data: inj.data }), brief } = inj
  const data = dataOf(inj.data), t = taskOf(join(data, 'ext'), task), evDir = join(data, task, 'seeded'), work = join(evDir, 'h5', `${arm}-${run}`)
  const box = boxFile(data, task), seededBox = boxFile(data, task, 'env/box-seeded')
  if (!existsSync(seededBox)) throw new Error(`${task}: ${seededBox} is missing (ext box-env ${task} --seeded)`)
  const rec = readJson(join(data, 'results', `${task}-${arm}-${run}.json`))
  if (!rec?.branch) throw new Error(`${task} ${arm} ${run}: no record with a branch`)
  const bugs = readJson(join(evDir, 'bugs.json'))
  if (!Array.isArray(bugs)) throw new Error(`${task}: no seeded/bugs.json`)
  const { repo } = await loadTask(box), product = await resolveCommit(repo, `refs/heads/${rec.branch}`)
  // the suite the harness wrote: the test files the product added or changed since the base (a deleted one is not there to run)
  const diff = Bun.spawnSync(['git', '-C', repo, 'diff', '--name-only', '-z', '--no-renames', '--diff-filter=ACMRT', t.base, product], { stdout: 'pipe', stderr: 'pipe' })
  if (diff.exitCode !== 0) throw new Error(`${task}: git diff of the base and the product failed (exit ${diff.exitCode})`)
  const testPaths = testPathsOf(data, t), files = diff.stdout.toString().split('\0').filter((f) => f && !f.includes('\n') && testFile(f, testPaths))
  for (const d of ['grades', 'suites']) mkdirSync(join(work, d), { recursive: true })
  const filesList = join(work, 'suite-files.txt')
  writeFileSync(filesList, files.map((f) => `${f}\n`).join(''))

  // the seeded oracle's grade at sha, through env; a grade that did not run, or (at P) gave no result at all, is no grade: a throw
  const gradeAt = async (env, sha, needResults) => {
    const out = join(work, 'grades', `${sha.slice(0, 7)}.json`)
    const code = await grade([env, join(evDir, 'oracle'), '--at', sha, '--sealed', '--reuse', '--out', out]), g = readJson(out)
    if (code !== 0 || g?.commit !== sha || (needResults && !hasResults(g))) {
      rmSync(out, { force: true }) // --reuse would keep a grade with no result
      throw new Error(`${task} ${arm} ${run}: no result at ${sha.slice(0, 7)}`)
    }
    return g
  }
  // the suite's cases at sha; none when it wrote no JUnit. A run killed for memory or time is the machine's: a throw
  const suiteAt = async (env, sha) => {
    const out = join(work, 'suites', `${sha.slice(0, 7)}.xml`), status = await suite([env, '--at', sha, '--files', filesList, '--out', out])
    if (status === 'memory' || status === 'timeout') throw new Error(`${task} ${arm} ${run}: the suite at ${sha.slice(0, 7)} ended: ${status}`)
    return existsSync(out) ? readJunit(readFileSync(out, 'utf8')) : []
  }
  const atP = await gradeAt(box, product, true)
  let suiteP = null
  const rows = []
  for (const bug of bugs.filter((b) => b.state === 'kept')) {
    const row = { bug: bug.id, at: resultIn(atP, bug.check), port: null, suite: files.length, caught: null }
    rows.push(row)
    if (row.at === 'fail') row.caught = false
    if (row.at !== 'pass') continue
    const p = await portEdit({ data, task, bug, product, run, work, agent, ...(brief ? { brief } : {}) })
    if (p.refused) { row.port = 'refused'; continue }
    if (resultIn(await gradeAt(seededBox, p.commit, false), bug.check) !== 'fail') { row.port = 'not-applicable'; continue }
    row.port = 'ported'
    row.caught = false // a product with no test file misses it
    if (!files.length) continue
    suiteP ??= new Set((await suiteAt(box, product)).filter((c) => c.status === 'pass').map(caseId))
    row.caught = (await suiteAt(seededBox, p.commit)).some((c) => c.status === 'fail' && suiteP.has(caseId(c)))
  }
  writeFileSync(join(evDir, 'h5', `${arm}-${run}.json`), JSON.stringify(rows, null, 2) + '\n')
  const n = (f) => rows.filter(f).length
  // each bug is caught, a miss (the check fails at P, or the port is not caught), not applicable (precondition or error at P, or a port
  // that does not fail the check) or refused (counted from the file)
  console.log(`h5 ${task} ${arm} ${run} bugs=${rows.length} miss=${n((r) => r.caught === false)} ported=${n((r) => r.port === 'ported')} caught=${n((r) => r.caught === true)} na=${n((r) => r.at === 'precondition' || r.at === 'error' || r.port === 'not-applicable')}`)
  return 0
}

if (import.meta.main) {
  try { process.exit(await h5(process.argv.slice(2))) } catch (e) { console.error(e.message); process.exit(2) }
}
