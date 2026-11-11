#!/usr/bin/env bun
// H5 (step 13 ruling 9): do the test files an arm's run wrote catch the task's kept seeded bugs, ported onto its product P? Per bug: its check
// at P; on a pass, one sealed porter writes the bug's edit for P, committed in the sealed repo under refs/h5/<arm>-<run>/<bug> and kept only
// when the check fails there; then P's own test files run at P and at P + edit. Prints one count line; never a grade, a bug or a reply.
// Standing step 13 runs only; each bug in one class of the prereg's "Amended at step 13 (H5)"; only the machine's failure stops it.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { daemon, dataOf, DISK_FLOOR_GB, dockerDiskFree, suiteRun, taskOf } from './ext.mjs'
import { resolveCommit } from './grade.mjs'
import { readJunit } from './lib/junit.mjs'
import { caseId } from './lib/oracle.mjs'
import { loadTask } from './lib/task.mjs'
import { editCommit, hasResults, notReadyOf, once, resultIn, testFile } from './oracle.mjs'
import { floorOf } from './scored.mjs'
import { sealedAgent } from './sealed-agent.mjs'

const USAGE = 'usage: bun bench/h5.mjs <task> <arm> <run>'
const readJson = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')) } catch { return null } }
const fence = (text, lang = '') => `\`\`\`\`${lang}\n${text.trimEnd()}\n\`\`\`\`\n`
const boxFile = (data, task, dir = 'env/box') => join(data, dir, `${task}.json`)
const testPathsOf = (data, t) => readJson(join(data, 'ext/groups.json'))?.groups?.find((g) => g.id === t.stack)?.testPaths ?? []

// one sealed porter on P's files (the store's task file, read tools only) given the bug's description and edit and nothing else of it;
// its reply's edit through the seeder's gates, committed on P in the sealed repo (env/box-seeded's repo) under refs/h5/<run>/<bug>
// (h5 passes `<arm>-<run>` as run, so two arms never share a ref).
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

// the machine's failure (prereg, amended at step 13 (H5)): the daemon does not answer or the disk is under its floor; only this stops h5
const machineDownOf = async () => {
  try { await daemon() } catch { return true }
  const free = await dockerDiskFree().catch(() => null)
  return free !== null && free < DISK_FLOOR_GB
}

// grade.mjs in its own process: its stdout (a count line) is not this tool's; its exit code
const gradeCmd = async (args) => {
  const p = Bun.spawn([process.execPath, join(import.meta.dir, 'grade.mjs'), ...args], { stdin: 'ignore', stdout: 'ignore', stderr: 'ignore' })
  return p.exited
}

export async function h5(args, inj = {}) {
  const [task, arm, run] = args
  if (args.length !== 3 || !/^[a-z0-9][a-z0-9_-]*$/.test(task) || !/^[A-Za-z]+-?$/.test(arm) || !/^\d+$/.test(run)) throw new Error(USAGE)
  const { grade = gradeCmd, agent = sealedAgent, suite = (a) => suiteRun(a, { data: inj.data }), machineDown = machineDownOf, brief } = inj
  const data = dataOf(inj.data), t = taskOf(join(data, 'ext'), task), evDir = join(data, task, 'seeded'), work = join(evDir, 'h5', `${arm}-${run}`)
  const box = boxFile(data, task), seededBox = boxFile(data, task, 'env/box-seeded')
  if (!existsSync(seededBox)) throw new Error(`${task}: ${seededBox} is missing (ext box-env ${task} --seeded)`)
  const rec = readJson(join(data, 'results', `${task}-${arm}-${run}.json`))
  if (!rec?.branch) throw new Error(`${task} ${arm} ${run}: no record with a branch`)
  // only standing step 13 runs: no machine run, nothing at or under the task's step 13 floor (none for the task: nothing stands)
  if (rec.machine != null) throw new Error(`${task} ${arm} ${run}: a machine run is not read`)
  if (Number(run) <= (floorOf(data, task)[arm] ?? Infinity)) throw new Error(`${task} ${arm} ${run}: at or under the task's step 13 floor`)
  const bugs = readJson(join(evDir, 'bugs.json'))
  if (!Array.isArray(bugs)) throw new Error(`${task}: no seeded/bugs.json`)
  const { repo } = await loadTask(box), product = await resolveCommit(repo, `refs/heads/${rec.branch}`)
  // the suite the harness wrote: the test files the product added or changed since the commit the arm started from (the record's envCommit,
  // else the base; a deleted one is not there to run)
  const diff = Bun.spawnSync(['git', '-C', repo, 'diff', '--name-only', '-z', '--no-renames', '--diff-filter=ACMRT', rec.envCommit ?? t.base, product], { stdout: 'pipe', stderr: 'pipe' })
  if (diff.exitCode !== 0) throw new Error(`${task}: git diff of the start and the product failed (exit ${diff.exitCode})`)
  const testPaths = testPathsOf(data, t), files = diff.stdout.toString().split('\0').filter((f) => f && !f.includes('\n') && testFile(f, testPaths))
  for (const d of ['grades', 'suites']) mkdirSync(join(work, d), { recursive: true })
  const filesList = join(work, 'suite-files.txt')
  writeFileSync(filesList, files.map((f) => `${f}\n`).join(''))

  // the seeded oracle's grade at sha, through env: the grade when good(g), else, graded once more, null (its file removed so --reuse cannot
  // keep it). A grade that cannot run (exit 2) or a machine failure after a bad grade stops h5
  const gradeOut = (sha) => join(work, 'grades', `${sha.slice(0, 7)}.json`)
  const gradeAt = async (env, sha, good) => {
    const out = gradeOut(sha)
    for (let i = 0; i < 2; i++) {
      const code = await grade([env, join(evDir, 'oracle'), '--at', sha, '--sealed', '--reuse', '--out', out]), g = readJson(out)
      if (code === 2) throw new Error(`${task} ${arm} ${run}: grade failed at ${sha.slice(0, 7)}`)
      if (code === 0 && g?.commit === sha && good(g)) return g
      rmSync(out, { force: true })
      if (await machineDown()) throw new Error(`${task} ${arm} ${run}: the machine failed at ${sha.slice(0, 7)}`)
    }
    return null
  }
  // oracle-run's readiness line of this commit and oracle reads `not ready` or `timeout` (as oracle.mjs gradeAt reads it)
  const notReady = (sha) => notReadyOf(join(data, task), join(evDir, 'oracle'), [sha]).length > 0
  // the suite at sha: { status: ok|missing|timeout|memory, cases } (no case unless ok). A timeout runs once more when again; a machine failure
  // after a run that is not ok stops h5
  const suiteAt = async (env, sha, again = []) => {
    const out = join(work, 'suites', `${sha.slice(0, 7)}.xml`)
    for (let i = 0; ; i++) {
      const s = await suite([env, '--at', sha, '--files', filesList, '--out', out]), status = s === 'ok' && !existsSync(out) ? 'missing' : s
      if (status !== 'ok' && status !== 'missing' && (await machineDown())) throw new Error(`${task} ${arm} ${run}: the machine failed at ${sha.slice(0, 7)}`)
      if (i === 0 && again.includes(status)) continue
      return { status, cases: status === 'ok' ? readJunit(readFileSync(out, 'utf8')) : [] }
    }
  }
  // P's grade with no result twice: every check `error`, so every bug is not applicable
  const atP = await gradeAt(box, product, hasResults)
  let suiteP = null // P's suite, run once when the first ported bug needs it: { status, pass: the ids of its passing cases }
  const rows = []
  for (const bug of bugs.filter((b) => b.state === 'kept')) {
    // suite: P's suite state ok|missing|timeout|memory, or P + edit's when P's was ok and that one was not (missing-at-edit, memory-at-edit,
    // timeout-at-edit); null while no suite was needed for this bug
    const row = { bug: bug.id, at: resultIn(atP, bug.check), port: null, testFiles: files.length, suite: null, caught: null }
    rows.push(row)
    if (row.at === 'fail') row.caught = false
    if (row.at !== 'pass') continue
    const p = await portEdit({ data, task, bug, product, run: `${arm}-${run}`, work, agent, ...(brief ? { brief } : {}) })
    if (p.refused) { row.port = 'refused'; continue }
    // a not-ready grade at P + edit (all `error`, kept by --reuse) is graded once more; still not ready, the port is not judged
    const gE = await gradeAt(seededBox, p.commit, () => !notReady(p.commit))
    if (!gE && notReady(p.commit)) { row.port = 'notready'; continue }
    if (resultIn(gE, bug.check) !== 'fail') { row.port = 'not-applicable'; continue }
    row.port = 'ported'
    row.caught = false // a product with no test file misses it
    if (!files.length) continue
    if (!suiteP) { const r = await suiteAt(box, product, ['timeout', 'memory']); suiteP = { status: r.status, pass: new Set(r.cases.filter((c) => c.status === 'pass').map(caseId)) } }
    row.suite = suiteP.status
    if (suiteP.status !== 'ok') { row.caught = null; continue } // no JUnit at P, or a timeout or memory kill twice: nosuite, never a miss
    const atE = await suiteAt(seededBox, p.commit, ['timeout'])
    if (atE.status !== 'ok') { row.suite = `${atE.status}-at-edit`; row.caught = atE.status === 'timeout' ? true : null; continue } // a hang twice is a red build
    // caught: a case passing at P fails at P + edit or is absent there (its file no longer collects: a red build)
    const statusE = new Map(atE.cases.map((c) => [caseId(c), c.status]))
    row.caught = [...suiteP.pass].some((id) => !statusE.has(id) || statusE.get(id) === 'fail')
  }
  writeFileSync(join(evDir, 'h5', `${arm}-${run}.json`), JSON.stringify(rows, null, 2) + '\n')
  const n = (f) => rows.filter(f).length
  // each bug is exactly one of: caught, miss, na, refused, notready, nosuite (the README says what each means)
  console.log(`h5 ${task} ${arm} ${run} bugs=${rows.length} miss=${n((r) => r.caught === false)} ported=${n((r) => r.port === 'ported')} caught=${n((r) => r.caught === true)}`
    + ` na=${n((r) => r.at === 'precondition' || r.at === 'error' || r.port === 'not-applicable')} refused=${n((r) => r.port === 'refused')} notready=${n((r) => r.port === 'notready')}`
    + ` nosuite=${n((r) => r.port === 'ported' && r.caught === null)}`)
  return 0
}

if (import.meta.main) {
  try { process.exit(await h5(process.argv.slice(2))) } catch (e) { console.error(e.message); process.exit(2) }
}
