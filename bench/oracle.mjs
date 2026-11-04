#!/usr/bin/env bun
// Oracle preparation of the task repo (step 5, ruling 7): pair each source commit with its owner task, label each
// pair twice by sealed agents, merge the labels; then rewrite each source's tests as black-box checks by sealed writers
// (ruling 9). Prints counts only: a reply, a manifest and a check are sealed.
import { copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, normalize, resolve } from 'node:path'
import { gitOut, readRows } from './bugs.mjs'
import { appendWalk, parseRunner, removeRecorded, taskOf } from './ext.mjs'
import { grade as gradeCmd } from './grade.mjs'
import { okBashCommands, okToolInputs } from './lib/agent.mjs'
import { check } from './input-check.mjs'
import { agreement, hunkOwners, introducer, mergeLabels, queuePick, usable } from './lib/oracle.mjs'
import { isTestPath } from './lib/replay.mjs'
import { verdict } from './lib/score.mjs'
import { loadTask } from './lib/task.mjs'
import { sealedAgent } from './sealed-agent.mjs'

const USAGE = 'usage: bun bench/oracle.mjs pairs <task.json> [--drop <task,...>] | label <task.json> <1|2> <task> | labels | write <task.json> <commit> | write <external task> | validate <task.json> <task> | validate <external task> | sweep <task.json> [--drop <task,...>] | sheet <external task> | classify [<task.json>] <task> | split [<task.json>] <task> | queue'
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
  // reading gate (controller ruling): the listed commits a run named in a `git -C <repo> show` that did not fail
  const commits = [...new Set(list.map((p) => p.commit))]
  const record = (stream) => {
    const shown = new Set()
    for (const c of okBashCommands(stream)) {
      const w = c.trim().split(/\s+/)
      if (w[0] !== 'git' || w[1] !== '-C' || w[2] !== repo || w[3] !== 'show') continue
      for (const x of w.slice(4)) if (/^[0-9a-f]{7,40}$/.test(x)) for (const k of commits) if (x.startsWith(k) || k.startsWith(x)) shown.add(k)
    }
    return { shown: shown.size }
  }
  const shownOf = async (n) => (await Bun.file(join(src, `${runName(r, task, n)}.reply.md.run.json`)).json().catch(() => ({}))).shown
  // one rerun when the reply is bad or the run did not show every commit (no count recorded: not shown); labels are not looked at
  for (const n of [1, 2]) {
    const name = runName(r, task, n), out = join(src, `${name}.reply.md`)
    if (!existsSync(`${out}.run.json`)) await agent([taskPath, name, '--prompt', promptFile, '--out', out, '--tools', 'Read,Grep,Glob,Bash', '--settings', join(data, 'briefs/label-settings.json')], { record })
    if (parseReply(existsSync(out) ? readFileSync(out, 'utf8') : '', list).ok && (await shownOf(n)) >= commits.length) break
  }
  const { runs, text } = finalReply(src, r, task)
  console.log(`label ${r} ${task}: pairs ${list.length}, labelled ${parseReply(text, list).got.size}, runs ${runs}, read ${(await shownOf(runs)) ?? 'unknown'}/${commits.length}`)
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
    // a pair a labeller left without a valid label is not a disagreement: it is unlabelled until a run labels it
    const source = l1 === 'none' || l2 === 'none' ? 'none' : l1 === 'fix' && l2 === 'fix' ? 'yes' : l1 !== 'fix' && l2 !== 'fix' ? 'no' : 'step9'
    return { ...p, l1, l2, source }
  })
  writeFileSync(join(src, 'labels.tsv'), ['commit\ttask\tkind\tl1\tl2\tsource', ...rows.map((x) => [x.commit, x.task, x.kind, x.l1, x.l2, x.source].join('\t'))].join('\n') + '\n')
  const line = (name, xs) => {
    const n = (s) => xs.filter((x) => x.source === s).length
    console.log(`${name}: pairs ${xs.length}, agreed fix ${n('yes')}, agreed not fix ${n('no')}, disputed ${n('step9')}, unlabelled ${n('none')}`)
  }
  for (const t of [...new Set(rows.map((x) => x.task))]) line(t, rows.filter((x) => x.task === t))
  for (const k of ['later', 'in-task']) line(k, rows.filter((x) => x.kind === k))
  line('total', rows)
  console.log(`source commits: ${new Set(rows.filter((x) => x.source === 'yes').map((x) => x.commit)).size}`)
  return rows.some((x) => x.source === 'none') ? 1 : 0
}

// --- write (ruling 9): one sealed writer per source commit or external task; each check goes to its owner's oracle ---
const SEVERITY = ['high', 'medium', 'low']
const KINDS = ['browser', 'http', 'api', 'window', 'files', 'cli', 'library', 'none']
const REASONS = ['id', 'duplicate id', 'fields', 'severity', 'interface', 'hunk', 'file', 'import', 'leak']
// the module specifiers a file names, and whether it loads one it does not name (a computed require or import)
const SPECIFIER = /\bfrom\s*['"`]([^'"`]+)['"`]|\brequire\s*\(\s*['"`]([^'"`]+)['"`]|\bimport\s*\(?\s*['"`]([^'"`]+)['"`]/g
const imports = (text) => [...text.matchAll(SPECIFIER)].map((m) => m[1] ?? m[2] ?? m[3])
const computedImport = (text) => /\b(?:require|import)\s*\(\s*[^'"`\s)]/.test(text)

// every file under dir, paths relative to it, without node_modules
const filesUnder = (dir, at = '') => (existsSync(join(dir, at)) ? readdirSync(join(dir, at), { withFileTypes: true }) : []).flatMap((e) =>
  e.name === 'node_modules' ? [] : e.isDirectory() ? filesUnder(dir, join(at, e.name)) : [join(at, e.name)])
const originPath = (o) => (typeof o === 'string' ? o.split('::')[0].trim() : '')
// a file names the fix commit or the path of a test the checks came from. Every id holds the sha7, and a writer whose
// runner cannot put a hyphen in a name writes it in other forms (`<sha7>_T1`, a `<sha7>-T*` pattern), so only 8 or
// more characters of the hash count as naming the commit
const leaks = (text, full, origins) => text.includes(full.slice(0, 8)) || origins.some((o) => text.includes(o))

// the writer's manifest, each entry with its file, its owner task and why it is refused (null: accepted); null when
// there is no manifest. A grouped entry (external) may name its file; otherwise the file is the one named `<id>.*`, or
// `<id><suffix>` exactly when the rules give a suffix. Rules (the task repo's, data): { suffix, imports, kinds }
function judge(dir, full, ownerOf, grouped, rules = {}) {
  const sha7 = full.slice(0, 7)
  let list = null
  try { list = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) } catch {}
  if (!Array.isArray(list)) return null
  const files = filesUnder(dir).filter((f) => f !== 'manifest.json'), origins = [...new Set(list.map((e) => originPath(e?.origin)).filter(Boolean))]
  const bad = new Set(files.filter((f) => leaks(readFileSync(join(dir, f), 'utf8'), full, origins)))
  const ids = list.map((e) => e?.id), idRe = new RegExp(`^${sha7}-T\\d+$`)
  const entries = list.map((e) => {
    const file = e?.interface === 'none' ? null : grouped && typeof e?.file === 'string' ? normalize(e.file)
      : rules.suffix ? `${e?.id}${rules.suffix}` : files.find((f) => basename(f).startsWith(`${e?.id}.`)) ?? ''
    const task = ownerOf(e?.hunk) ?? null
    const text = file !== null && files.includes(file) ? readFileSync(join(dir, file), 'utf8') : ''
    const why = typeof e?.id !== 'string' || !idRe.test(e.id) ? 'id'
      : ids.filter((x) => x === e.id).length > 1 ? 'duplicate id'
      : ![e.origin, e.behaviour].every((x) => typeof x === 'string' && x.trim()) ? 'fields'
      : !SEVERITY.includes(e.severity) ? 'severity'
      : !(rules.kinds ?? KINDS).includes(e.interface) ? 'interface'
      : !task ? 'hunk'
      : file !== null && !files.includes(file) ? 'file'
      : rules.imports && (computedImport(text) || imports(text).some((s) => !rules.imports.includes(s))) ? 'import'
      : file !== null && bad.has(file) ? 'leak' : null
    return { e, file, task, why }
  })
  return { entries, files, bad }
}

const entryOut = ({ e, file, task }, fix, withFile) => ({ id: e.id, fix_commit: fix, task, hunk: e.hunk, origin: e.origin, behaviour: e.behaviour, interface: e.interface, severity: e.severity, ...(withFile && file ? { file } : {}) })

function report(label, { how, code, runs }, entries) {
  const ok = entries.filter((x) => !x.why), n = (f) => ok.filter(f).length
  console.log(`write ${label}: writer ${how} code ${code}, entries ${entries.length}, written ${ok.length}, refused ${entries.length - ok.length}`)
  if (runs === 2) console.log('rerun: the first run left no entry or only interface none; the second run stands')
  const why = REASONS.map((r) => [r, entries.filter((x) => x.why === r).length]).filter(([, k]) => k)
  if (why.length) console.log(`refused: ${why.map(([r, k]) => `${r} ${k}`).join(', ')}`)
  console.log(`per task: ${[...new Set(ok.map((x) => x.task))].map((t) => `${t} ${n((x) => x.task === t)}`).join(', ') || 'none'}`)
  console.log(`interface none: ${n((x) => x.e.interface === 'none')}`)
  console.log(`severity: ${SEVERITY.map((s) => `${s} ${n((x) => x.e.severity === s)}`).join(', ')}`)
}

const sha256 = (s) => new Bun.CryptoHasher('sha256').update(s).digest('hex')
const readJson = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')) } catch { return null } }

// one writer run into `dir`, granted Write and Edit there only. The prompt file is written only when a writer runs, and
// its sha256 goes into the run record; a run whose record exists is reused only when today's prompt is the same
// fill: puts the folder's starting files in; reads: folders the writer may also read (never write)
async function runWriter(agent, { taskFile, label, at, prompt, text, out, dir, settings, fill, reads = [] }) {
  const prepare = () => {
    rmSync(dir, { recursive: true, force: true })
    for (const d of [dir, dirname(settings)]) mkdirSync(d, { recursive: true })
    fill?.(dir)
    writeFileSync(settings, JSON.stringify({ permissions: { additionalDirectories: [dir, ...reads], allow: [`Read(/${dir}/**)`, `Edit(/${dir}/**)`, ...reads.map((r) => `Read(/${r}/**)`)] } }, null, 2) + '\n')
  }
  return once(agent, { prompt, text, out, prepare }, [taskFile, label, '--at', at, '--tools', 'Read,Glob,Grep,Write,Edit', '--settings', settings])
}

// one sealed run whose record is reused only when today's prompt is the one it ran with (its sha256 in the record)
async function once(agent, { prompt, text, out, prepare }, args) {
  const rec = `${out}.run.json`
  if (existsSync(rec)) { const r = readJson(rec); return r?.promptSha === sha256(text) ? { how: 'reused', code: r.code } : { how: 'reused', stale: true } }
  prepare?.()
  rmSync(out, { force: true })
  mkdirSync(dirname(prompt), { recursive: true })
  writeFileSync(prompt, text)
  await agent([...args, '--prompt', prompt, '--out', out])
  const r = readJson(rec)
  if (r) writeFileSync(rec, JSON.stringify({ ...r, promptSha: sha256(text) }, null, 2) + '\n')
  return { how: 'ran', code: r?.code ?? null }
}

// controller ruling: a run that leaves no manifest, an empty one, or only `interface: none` entries is run once more
// (`-2`: same prompt, its own folder, reply and settings; the first record stays), and the second run stands
async function writer(agent, o) {
  const first = await runWriter(agent, o), l = readJson(join(o.dir, 'manifest.json'))
  if (first.stale || (Array.isArray(l) && l.some((e) => e?.interface !== 'none'))) return { ...first, dir: o.dir, runs: 1 }
  const two = { ...o, label: `${o.label}-2`, out: o.out.replace(/\.reply\.md$/, '-2.reply.md'), dir: `${o.dir}-2`, settings: o.settings.replace(/\.json$/, '-2.json') }
  return { ...(await runWriter(agent, two)), dir: two.dir, runs: 2 }
}
const staleLine = (label) => `write ${label}: refused 1 writer run whose prompt differs from the one it ran with`

const fence = (text, lang = '') => `\`\`\`\`${lang}\n${text.trimEnd()}\n\`\`\`\`\n`

// shortcut: a mkdir lock with no stale-lock recovery (a write killed inside the move leaves it); remove it by hand then
async function locked(lock, fn) {
  for (;;) {
    try { mkdirSync(lock); break } catch (e) { if (e.code !== 'EEXIST') throw e; await Bun.sleep(100) }
  }
  try { return fn() } finally { rmSync(lock, { recursive: true, force: true }) }
}

// the scaffold's top-level files copied into an oracle folder, its node_modules linked
function scaffoldInto(scaffold, o) {
  for (const e of readdirSync(scaffold, { withFileTypes: true })) if (e.isFile()) copyFileSync(join(scaffold, e.name), join(o, e.name))
  if (!lstatSync(join(o, 'node_modules'), { throwIfNoEntry: false })) symlinkSync(join(scaffold, 'node_modules'), join(o, 'node_modules'))
}

// a source commit of the task repo: its agreed pairs give the hunks in scope and their owners (ruling 6)
async function writeSource(taskPath, commit, agent) {
  if (!/^[0-9a-f]{7,40}$/.test(commit)) throw new Error(`${commit} is not a commit hash`)
  const { repo } = await loadTask(taskPath)
  const data = dataDir(), src = join(data, 'sources'), sha7 = commit.slice(0, 7), scaffold = join(data, 'oracle-scaffold')
  const yes = readFileSync(join(src, 'labels.tsv'), 'utf8').split('\n').slice(1).filter(Boolean).map((l) => l.split('\t')).filter((r) => r[5] === 'yes')
  const agreed = new Set(yes.map((r) => `${r[0]}\t${r[1]}`)), pairs = readPairs(src).filter((p) => p.commit === sha7 && agreed.has(`${p.commit}\t${p.task}`))
  if (!pairs.length) throw new Error(`${sha7} is not an agreed source commit of sources/labels.tsv`)
  const full = (await gitOut(repo, 'rev-parse', `${sha7}^{commit}`)).trim()
  // an in-range commit belongs to its task; a later pair's hunk keeps its own owner (it is listed after, so it wins)
  const scope = new Map()
  for (const p of [...pairs].sort((a, b) => (a.kind === 'in-task' ? 0 : 1) - (b.kind === 'in-task' ? 0 : 1)))
    for (const h of p.hunks.length ? p.hunks : p.kind === 'in-task' ? ['none'] : []) scope.set(h, p.task)
  const files = (await gitOut(repo, 'diff', '--name-only', '--no-renames', `${full}^`, full)).split('\n').filter(Boolean)
  const tests = files.filter(isTestPath), scoped = [...new Set([...scope.keys()].filter((h) => h !== 'none').map((h) => h.slice(0, h.lastIndexOf(':'))))]
  const work = join(data, 're-work'), dir = join(work, sha7), prompt = join(work, 'prompts', `${sha7}.md`)
  const scaffoldFiles = readdirSync(scaffold, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name)
  const rules = JSON.parse(readFileSync(join(data, 'briefs/oracle-re.json'), 'utf8'))
  const text = [
    readFileSync(join(data, 'briefs/oracle-re.md'), 'utf8').trimEnd() + '\n',
    `## The check ids\n\nPrefix \`${sha7}\`: the ids are \`${sha7}-T1\`, \`${sha7}-T2\`, ...\n`,
    `## The in-scope hunks and their owner tasks\n\n${[...scope].map(([h, t]) => h === 'none' ? `- \`none\` (task ${t}): the commit changes no source file of this task` : `- \`${h}\` (task ${t})`).join('\n')}\n`,
    `## The source changes of these hunks\n\n${scoped.length ? fence(await gitOut(repo, 'show', '--format=', '-U0', '--no-renames', full, '--', ...scoped), 'diff') : 'none\n'}`,
    `## The commit's test changes\n\n${tests.length ? fence(await gitOut(repo, 'show', '--format=', '--no-renames', full, '--', ...tests), 'diff') : 'none\n'}`,
    `## The scaffold\n\nEach check runs from an oracle folder that holds these files beside it, with their packages installed.\n\n${scaffoldFiles.map((f) => `### ${f}\n\n${fence(readFileSync(join(scaffold, f), 'utf8'))}`).join('\n')}`,
    `## Your output folder\n\n\`${dir}\`\n`,
  ].join('\n')
  const w = await writer(agent, { taskFile: taskPath, label: `write-${sha7}`, at: full, prompt, text, out: join(work, `${sha7}.reply.md`), dir, settings: join(work, 'settings', `${sha7}.json`) })
  if (w.stale) { console.log(staleLine(sha7)); return 1 }
  const res = judge(w.dir, full, (h) => scope.get(h), false, rules)
  if (!res) { console.log(`write ${sha7}: writer ${w.how} code ${w.code}, no manifest`); return 1 }
  const ok = res.entries.filter((x) => !x.why), owners = [...new Set([...yes.map((r) => r[1]), ...ok.map((x) => x.task)])]
  await locked(join(work, '.lock'), () => {
    for (const t of owners) { // this commit's earlier checks leave every oracle first, so a rerun replaces them
      const o = join(data, t, 'oracle'), mine = (id) => String(id).startsWith(`${sha7}-T`)
      const receives = ok.some((x) => x.task === t)
      if (!existsSync(o) && !receives) continue
      mkdirSync(o, { recursive: true })
      for (const f of readdirSync(o)) if (mine(f)) rmSync(join(o, f), { recursive: true, force: true })
      const kept = existsSync(join(o, 'manifest.json')) ? JSON.parse(readFileSync(join(o, 'manifest.json'), 'utf8')).filter((m) => !mine(m.id)) : []
      if (receives) scaffoldInto(scaffold, o)
      for (const x of ok.filter((y) => y.task === t)) if (x.file) copyFileSync(join(w.dir, x.file), join(o, basename(x.file)))
      writeFileSync(join(o, 'manifest.json'), JSON.stringify([...kept, ...ok.filter((x) => x.task === t).map((x) => entryOut(x, full, false))], null, 2) + '\n')
    }
  })
  report(sha7, w, res.entries)
  return 0
}

// an external task (ruling 9): one writer at the end, every source hunk of the PR in scope, its oracle replaced whole
async function writeTask(task, agent) {
  const data = dataDir(), ext = join(data, 'ext'), t = taskOf(ext, task), serveFile = join(ext, 'serve', t.key, 'serve.json')
  // its verdict is the last serve line of the task; a repo's serve.json alone may come from an earlier task of the repo
  const logTsv = join(ext, 'step5-logs/serve.tsv')
  const verdict = (existsSync(logTsv) ? readFileSync(logTsv, 'utf8').split('\n').map((l) => l.split('\t')).filter((r) => r[0] === task) : []).at(-1)?.[4] ?? ''
  if (!/ servable rounds=\d+$/.test(verdict) || !existsSync(serveFile)) { console.log(`${task} skipped no serve recipe`); return 0 }
  const taskFile = join(ext, 'env', `${t.key}.json`), { repo } = await loadTask(taskFile), sha7 = t.end.slice(0, 7)
  const group = JSON.parse(readFileSync(join(ext, 'groups.json'), 'utf8')).groups.find((g) => g.id === t.stack)
  const pr = JSON.parse(readFileSync(join(ext, 'sealed', t.slug, 'pr.json'), 'utf8'))
  const tests = (pr.pullRequest?.files?.nodes ?? []).map((f) => f.path).filter((f) => group.testPaths.some((p) => new RegExp(p).test(f)))
  const { f2p } = JSON.parse(readFileSync(join(ext, 'sealed', t.slug, 'f2p.json'), 'utf8'))
  const hunks = diffHunks(await gitOut(repo, 'diff', '-U0', '--no-renames', t.base, t.end)).filter((h) => !tests.includes(h.file)).map((h) => `${h.file}:${h.old}`)
  const { briefSha, ...sv } = JSON.parse(readFileSync(serveFile, 'utf8'))
  const recipe = JSON.parse(readFileSync(join(ext, 'tasks', t.slug, 'task-recipe.json'), 'utf8'))
  const work = join(data, task, 'work'), dir = join(work, 'write'), prompt = join(work, 'write.prompt.md')
  const list = (xs) => (xs.length ? xs.map((x) => `- \`${x}\``).join('\n') : 'none') + '\n'
  const text = [
    readFileSync(join(ext, 'briefs/oracle.md'), 'utf8').trimEnd() + '\n',
    `## The check ids\n\nPrefix \`${sha7}\`: the ids are \`${sha7}-T1\`, \`${sha7}-T2\`, ...\n`,
    `## The PR's source hunks\n\n${list(hunks)}`,
    `## The PR's test files\n\n${list(tests)}`,
    `## The fail-to-pass test ids\n\n${list(f2p ?? [])}`,
    `## The build recipe\n\nDockerfile (the repository's files are copied to \`/work\`):\n\n${fence(recipe.dockerfile, 'dockerfile')}\nIts test command:\n\n${fence(recipe.test, 'sh')}`,
    `## The serve recipe\n\n${fence(JSON.stringify(sv, null, 2), 'json')}`,
    `## The PR's diff (base to end)\n\n${fence(await gitOut(repo, 'diff', '--no-renames', t.base, t.end), 'diff')}`,
    `## Your output folder\n\n\`${dir}\` (copied to \`/oracle\` in the container)\n`,
  ].join('\n')
  const w = await writer(agent, { taskFile, label: `write-${task}`, at: t.end, prompt, text, out: join(work, 'write.reply.md'), dir, settings: join(work, 'write-settings.json') })
  if (w.stale) { console.log(staleLine(task)); return 1 }
  const res = judge(w.dir, t.end, (h) => (hunks.includes(h) ? task : null), true)
  if (!res) { console.log(`write ${task}: writer ${w.how} code ${w.code}, no manifest`); return 1 }
  let runner = null
  try { runner = parseRunner(readFileSync(join(w.dir, 'runner.json'), 'utf8')) } catch {}
  const runOnly = (l) => l.every((x, i) => /^RUN\s/.test(x.trim()) || (i > 0 && l[i - 1].trimEnd().endsWith('\\')))
  if (!runner || !runOnly(runner.layer) || res.bad.has('runner.json')) { console.log(`write ${task}: writer ${w.how} code ${w.code}, runner.json missing or invalid`); return 1 }
  const ok = res.entries.filter((x) => !x.why), used = new Set(ok.map((x) => x.file)), refused = new Set(res.entries.filter((x) => x.why).map((x) => x.file))
  const o = join(data, task, 'oracle')
  rmSync(o, { recursive: true, force: true })
  for (const f of res.files.filter((f) => !res.bad.has(f) && (used.has(f) || !refused.has(f)))) cpSync(join(w.dir, f), join(o, f))
  writeFileSync(join(o, 'manifest.json'), JSON.stringify(ok.map((x) => entryOut(x, t.end, true)), null, 2) + '\n')
  report(task, w, res.entries)
  return 0
}

// the brief's kinds (ruling 14): the real-estate sheet's twelve and eleven more
const SHEET_KINDS = ['field label', 'option text', 'form accessible name', 'button text', 'link text', 'URL path', 'query parameter key', 'API path', 'API field name', 'heading', 'placeholder', 'column header',
  'menu item', 'keyboard shortcut', 'setting label', 'window title', 'command', 'subcommand', 'flag', 'environment variable', 'config key', 'public API name', 'output field']
const BULLET = new RegExp(`^- (${SHEET_KINDS.join('|')}): "(.+)"$`)

// a reply as a sheet, from its title on: a `##` heading input-check flags becomes `## Unnamed section <its position>`
// (its bullets judged as any); a line input-check flags, a bullet
// that is not `- <kind>: "<name>"` and any other text line are `deleted`; a name `found` misses is `notfound`; a section
// left with no bullet is dropped. null when no title or no name is left
async function toSheet(reply, found) {
  const lines = reply.split('\n'), at = lines.findIndex((l) => l.trim() === '# Interface sheet')
  if (at < 0) return null
  const body = lines.slice(at + 1).map((l) => l.trimEnd()), flagged = new Set(check(body.join('\n')).map((h) => h.line - 1))
  const sections = []
  let cur = null, heads = 0, deleted = 0, notfound = 0
  for (const [i, l] of body.entries()) {
    if (!l.trim()) continue
    if (l.startsWith('## ')) {
      cur = { head: flagged.has(i) ? `## Unnamed section ${heads + 1}` : l, bullets: [] }
      sections.push(cur)
      heads++
      continue
    }
    const m = cur && !flagged.has(i) && BULLET.exec(l)
    if (!m) deleted++
    else if (await found(m[2])) cur.bullets.push(l)
    else notfound++
  }
  const kept = sections.filter((s) => s.bullets.length), names = kept.reduce((n, s) => n + s.bullets.length, 0)
  return names ? { text: ['# Interface sheet', ...kept.map((s) => `\n${s.head}\n${s.bullets.join('\n')}`)].join('\n') + '\n', names, deleted, notfound } : null
}

// a name is found when `git grep -F` at the commit names a file that is not a test (isTestPath or the stack's testPaths)
const foundOutsideTests = (repo, commit, testPaths) => async (name) => {
  const p = Bun.spawn(['git', '-C', repo, 'grep', '-F', '-l', '-z', '-e', name, commit, '--'], { stdout: 'pipe', stderr: 'ignore' })
  const [out, code] = [await new Response(p.stdout).text(), await p.exited]
  if (code > 1) throw new Error(`git grep failed (exit ${code})`)
  return out.split('\0').filter(Boolean).map((f) => f.slice(commit.length + 1)).some((f) => !isTestPath(f) && !testPaths.some((r) => new RegExp(r).test(f)))
}

// an external task's interface sheet (ruling 14): one sealed agent at the end, read-only, given the brief and the input
// only; a reply that is not a sheet is run once more (`-2`), and a run whose record exists is reused
async function sheet(task, agent) {
  const data = dataDir(), ext = join(data, 'ext'), t = taskOf(ext, task), dir = join(data, task), prompt = join(dir, 'work', 'interface.prompt.md')
  const text = `${readFileSync(join(ext, 'briefs/interface.md'), 'utf8').trimEnd()}\n\n## The input\n\n${fence(readFileSync(join(dir, 'input.md'), 'utf8'), 'markdown')}`
  const taskFile = join(ext, 'env', `${t.key}.json`), { repo } = await loadTask(taskFile)
  const group = JSON.parse(readFileSync(join(ext, 'groups.json'), 'utf8')).groups.find((g) => g.id === t.stack)
  const found = foundOutsideTests(repo, t.end, group?.testPaths ?? [])
  for (const [name, label] of [['interface', `sheet-${task}`], ['interface-2', `sheet-${task}-2`]]) {
    const out = join(dir, `${name}.reply.md`), rec = `${out}.run.json`
    if (!existsSync(rec)) {
      rmSync(out, { force: true })
      mkdirSync(dirname(prompt), { recursive: true })
      writeFileSync(prompt, text)
      await agent([taskFile, label, '--prompt', prompt, '--out', out, '--at', t.end, '--tools', 'Read,Glob,Grep'])
      const r = readJson(rec)
      if (r) writeFileSync(rec, JSON.stringify({ ...r, promptSha: sha256(text) }, null, 2) + '\n')
    } else if (readJson(rec)?.promptSha !== sha256(text)) { console.log(`${task} sheet refused a run whose prompt differs from the one it ran with`); return 1 }
    const s = existsSync(out) ? await toSheet(readFileSync(out, 'utf8'), found) : null
    if (!s) continue
    if (check(s.text).length) throw new Error(`${task} sheet still fails input-check`)
    writeFileSync(join(dir, 'interface.md'), s.text)
    console.log(`${task} sheet names=${s.names} deleted=${s.deleted} notfound=${s.notfound} input-check=PASS`)
    return 0
  }
  console.log(`${task} sheet failed`)
  return 1
}

// --- validate (rulings 10, 11, 13) and sweep (ruling 12). Prints ids, verdicts and counts only ---
const COUNTED = ['valid', 'weak', 'broken', 'error', 'pre-existing', 'absent-at-base']
const SCORED = ['valid', 'absent-at-base']
const manifestIn = (o) => JSON.parse(readFileSync(join(o, 'manifest.json'), 'utf8')).filter((m) => m.dropped !== true)
// a check's file: the one an external entry names, else the oracle's `<id>.*`
const checkFile = (o, m) => (m.interface === 'none' ? null : m.file ?? readdirSync(o).find((f) => f.startsWith(`${m.id}.`)) ?? null)
const validationOf = (evDir, ref) => readJson(join(evDir, `validation-${ref.slice(0, 7)}.json`))
const verdictIn = (evDir, m) => validationOf(evDir, m.fix_commit)?.checks?.find((x) => x.id === m.id)?.verdict
// the last sealed log of a commit's run (paths only, never read here)
const lastLog = (logs, sha7) => {
  const n = (existsSync(logs) ? readdirSync(logs) : []).map((f) => f.match(new RegExp(`^${sha7}-(\\d+)\\.log$`))?.[1]).filter(Boolean).map(Number)
  return n.length ? join(logs, `${sha7}-${Math.max(...n)}.log`) : null
}

// controller ruling: a commit without the task's app file holds no app, so nothing a task builds exists there
const noAppAt = ({ repo, appFile }, commit) => !!appFile && Bun.spawnSync(['git', '-C', repo, 'cat-file', '-e', `${commit}:${appFile}`]).exitCode !== 0

async function taskCtx(task, taskFile) {
  const data = dataDir(), tasks = JSON.parse(readFileSync(join(data, 'tasks.json'), 'utf8')), evDir = join(data, task)
  const c = { task, data, evDir, oracleDir: join(evDir, 'oracle') }
  if (tasks[task]) {
    if (!taskFile) throw new Error(`${task} is a task of tasks.json: give its task file (validate <task.json> <task>)`)
    const { repo, appFile } = await loadTask(taskFile)
    return { ...c, ext: false, taskFile, repo, appFile, base: tasks[task].base, end: tasks[task].end }
  }
  if (taskFile) throw new Error(USAGE)
  const t = taskOf(join(data, 'ext'), task)
  return { ...c, ext: true, taskFile: join(data, 'env', `${task}.json`), t, base: t.base, end: t.end }
}

// one validation per fix commit (task repo) or one for the task (external); refs: only these fix commits
async function groupsOf(c, refs) {
  const checks = manifestIn(c.oracleDir).filter((m) => m.interface !== 'none')
  if (c.ext) return [{ ref: c.end, ids: checks.map((m) => m.id), bad: [c.base], base: null }]
  const noApp = noAppAt(c, c.base)
  const out = []
  for (const fix of [...new Set(checks.map((m) => m.fix_commit))]) {
    if (refs && !refs.includes(fix)) continue
    const parent = (await gitOut(c.repo, 'rev-parse', `${fix}^`)).trim()
    const inTask = Bun.spawnSync(['git', '-C', c.repo, 'merge-base', '--is-ancestor', fix, c.end]).exitCode
    if (inTask > 1) throw new Error(`git merge-base --is-ancestor ${fix} ${c.end} failed`)
    out.push({ ref: fix, ids: checks.filter((m) => m.fix_commit === fix).map((m) => m.id), bad: inTask === 0 ? [parent] : [parent, c.end], base: c.base, noApp })
  }
  return out
}

// a grade that throws or exits non-zero gives `error` for that ref's checks, with the stage, and the task goes on
async function gradePass(c, groups, grade) {
  for (const g of groups) {
    const args = [c.taskFile, c.oracleDir, '--validate', g.ref, ...g.bad.flatMap((b) => ['--bad', b]), ...(g.base && !g.noApp ? ['--base', g.base] : []), '--sealed', '--reuse']
    let stage = null
    try { const code = await grade(args); if (code !== 0) stage = `grade exit ${code}` } catch (e) { stage = String(e?.message ?? e).split('\n')[0].slice(0, 300) }
    if (stage === null && g.noApp) { // the base is not run: its result is `precondition` for every check
      const f = join(c.evDir, `validation-${g.ref.slice(0, 7)}.json`), v = JSON.parse(readFileSync(f, 'utf8')), why = 'no app at base'
      const checks = v.checks.map((x) => ({ ...x, base: 'precondition', stage: why, verdict: verdict({ ref: x.ref, bad: x.bad, base: 'precondition' }) }))
      writeFileSync(f, JSON.stringify({ ...v, base: g.base, stage: why, checks }, null, 2) + '\n')
      console.log(`validation-${g.ref.slice(0, 7)} (${why}): ${checks.map((x) => `${x.id}=${x.verdict}`).join(' ')}`)
    }
    if (stage === null) continue
    writeFileSync(join(c.evDir, `validation-${g.ref.slice(0, 7)}.json`), JSON.stringify({ ref: g.ref, bad: g.bad, base: g.base, at: new Date().toISOString(), stage,
      checks: g.ids.map((id) => ({ id, verdict: 'error', stage })) }, null, 2) + '\n')
    console.log(`validation-${g.ref.slice(0, 7)}: error ${g.ids.length} (${stage})`)
  }
  if (c.ext) await removeRecorded(c.data, c.task, c.t.slug) // the user's decision of 2026-11-03: removed after each pass
}

// the comparer's verdicts: the JSON array in its reply; an id named twice or with another word has none
function compareReply(text) {
  let arr = null
  try { arr = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1)) } catch {}
  const got = new Map()
  if (!Array.isArray(arr)) return got
  for (const e of arr) if (['same', 'changed'].includes(e?.verdict)) got.set(e.id, got.has(e.id) ? null : e.verdict)
  return got
}

// ruling 11: one sealed fixer for a ref's broken checks, on a copy of the oracle; one comparer over every check file it
// changed (external: runner.json too); only a file whose every check the comparer calls `same` goes into the oracle
async function fixRound(c, round, g, broken, agent) {
  const sha7 = g.ref.slice(0, 7), work = join(c.evDir, 'work', `fix-${round}`), dir = join(work, sha7), logs = join(c.evDir, 'logs')
  const manifest = manifestIn(c.oracleDir), fileOf = new Map(manifest.map((m) => [m.id, checkFile(c.oracleDir, m)]))
  const runs = [g.ref, ...g.bad, ...(g.base ? [g.base] : [])].map((x) => lastLog(logs, x.slice(0, 7))).filter(Boolean)
  const text = [
    readFileSync(join(c.data, 'briefs/fix.md'), 'utf8').trimEnd() + '\n',
    `## The broken checks and their manifest entries\n\n${fence(JSON.stringify(manifest.filter((m) => broken.includes(m.id)), null, 2), 'json')}`,
    `## The logs of the runs that broke them\n\n${runs.length ? runs.map((f) => `- \`${f}\``).join('\n') : 'none'}\n`,
    `## Your folder\n\n\`${dir}\`: a copy of the oracle folder. Fix the checks there; nothing else is read back.\n`,
  ].join('\n')
  const w = await runWriter(agent, { taskFile: c.taskFile, label: `fix-${round}-${c.task}-${sha7}`, at: g.ref, prompt: join(work, `${sha7}.fix.prompt.md`), text,
    out: join(work, `${sha7}.fix.reply.md`), dir, settings: join(work, `${sha7}.settings.json`), reads: [logs],
    fill: (d) => cpSync(c.oracleDir, d, { recursive: true, verbatimSymlinks: true, filter: (f) => basename(f) !== 'node_modules' }) })
  if (w.stale) { console.log(`fix ${c.task} ${sha7} round ${round}: refused a fixer run whose prompt differs from the one it ran with`); return { changed: 0, kept: 0 } }
  const bytes = (f) => (existsSync(f) ? readFileSync(f) : null)
  const changed = [...new Set([...filesUnder(c.oracleDir), ...filesUnder(dir)])].filter((f) => { const a = bytes(join(c.oracleDir, f)), b = bytes(join(dir, f)); return !a || !b || !a.equals(b) })
  const scope = new Map() // a broken check's file -> every check it holds
  for (const id of broken) if (fileOf.get(id)) scope.set(fileOf.get(id), manifest.filter((m) => fileOf.get(m.id) === fileOf.get(id)).map((m) => m.id))
  if (c.ext) scope.set('runner.json', ['runner.json'])
  const items = changed.filter((f) => scope.has(f) && existsSync(join(c.oracleDir, f)) && existsSync(join(dir, f)))
  if (!items.length) return { changed: changed.length, kept: 0 }
  const ctext = [readFileSync(join(c.data, 'briefs/compare.md'), 'utf8').trimEnd() + '\n',
    ...items.map((f) => `## Item: ${scope.get(f).join(', ')}\n\n### Before\n\n${fence(readFileSync(join(c.oracleDir, f), 'utf8'))}\n### After\n\n${fence(readFileSync(join(dir, f), 'utf8'))}`)].join('\n')
  const out = join(work, `${sha7}.compare.reply.md`)
  const cr = await once(agent, { prompt: join(work, `${sha7}.compare.prompt.md`), text: ctext, out }, [c.taskFile, `compare-${round}-${c.task}-${sha7}`, '--tools', 'Read'])
  const said = cr.stale ? new Map() : compareReply(existsSync(out) ? readFileSync(out, 'utf8') : '')
  const keep = items.filter((f) => scope.get(f).every((id) => said.get(id) === 'same'))
  for (const f of keep) copyFileSync(join(dir, f), join(c.oracleDir, f))
  return { changed: changed.length, kept: keep.length }
}

// pass 1; then at most 2 fixer rounds, each over every broken check of the task, each followed by a pass over the refs it
// changed. refs (the sweep's receivers): only these fix commits, and no fixer round
async function validate(c, { grade, agent, refs }) {
  const groups = await groupsOf(c, refs), tally = { rounds: 0, changed: 0, kept: 0 }
  await gradePass(c, groups, grade)
  for (let round = 1; round <= 2 && !refs; round++) {
    const todo = groups.map((g) => ({ g, broken: g.ids.filter((id) => validationOf(c.evDir, g.ref)?.checks?.find((x) => x.id === id)?.verdict === 'broken') })).filter((x) => x.broken.length)
    if (!todo.length) break
    tally.rounds = round
    const again = []
    for (const { g, broken } of todo) {
      const x = await fixRound(c, round, g, broken, agent)
      tally.changed += x.changed
      tally.kept += x.kept
      if (x.kept) again.push(g)
    }
    if (again.length) await gradePass(c, again, grade) // nothing kept: the oracle is the same and every run would be reused
  }
  const all = manifestIn(c.oracleDir), checks = all.filter((m) => m.interface !== 'none'), v = new Map(checks.map((m) => [m.id, verdictIn(c.evDir, m)]))
  const n = (k) => checks.filter((m) => v.get(m.id) === k).length
  const moved = readJson(join(c.evDir, 'moves.json')) ?? []
  console.log(`${c.task}: checks ${checks.length}, ${COUNTED.map((k) => `${k} ${n(k)}`).join(', ')}, interface none ${all.length - checks.length}, fixer rounds ${tally.rounds}, changed ${tally.changed}, kept ${tally.kept}, refused ${tally.changed - tally.kept}`
    + (moved.length ? `, pre-existing moved out ${moved.filter((x) => x.moved).length} (${moved.filter((x) => x.moved).map((x) => `${x.id} to ${x.to}`).join(', ')})` : ''))
  // ruling 13; a task whose validation could not run is not judged: it is said, not dropped
  if (c.ext && !checks.some((m) => SCORED.includes(v.get(m.id)))) {
    if (n('error')) console.log(`${c.task} not judged: ${n('error')} checks error`)
    else { console.log(`${c.task} dropped no valid check`); appendWalk(join(c.data, 'ext'), c.t, 'dropped') }
  }
  return 0
}

// ruling 12: every pre-existing check in one temporary oracle, graded once at each distinct base and end of tasks.json
// (newest first); a check moves to the latest earlier task whose end fails it and whose base passes it or fails its
// precondition (none, or a dropped task: recorded only); each receiver is validated again for the moved fix commits
async function sweep(taskFile, drop, { grade, agent }) {
  const data = dataDir(), tasks = JSON.parse(readFileSync(join(data, 'tasks.json'), 'utf8')), order = Object.keys(tasks)
  for (const t of drop) if (!order.includes(t)) throw new Error(`--drop ${t} is not a task of tasks.json`)
  const pre = []
  for (const t of order.filter((x) => !drop.includes(x) && existsSync(join(data, x, 'oracle/manifest.json')))) {
    const o = join(data, t, 'oracle')
    for (const m of manifestIn(o)) if (m.interface !== 'none' && verdictIn(join(data, t), m) === 'pre-existing') pre.push({ t, m, file: checkFile(o, m) })
  }
  const sw = join(data, 'sweep'), so = join(sw, 'oracle')
  rmSync(so, { recursive: true, force: true })
  mkdirSync(so, { recursive: true })
  scaffoldInto(join(data, 'oracle-scaffold'), so)
  for (const p of pre) if (p.file) copyFileSync(join(data, p.t, 'oracle', p.file), join(so, p.file))
  writeFileSync(join(so, 'manifest.json'), JSON.stringify(pre.map((p) => p.m), null, 2) + '\n')
  const commits = pre.length ? [...new Set([...order].reverse().flatMap((t) => [tasks[t].end, tasks[t].base]))] : []
  const at = new Map()
  const app = await loadTask(taskFile)
  for (const x of commits) {
    if (noAppAt(app, x)) { at.set(x, new Map(pre.map((p) => [p.m.id, 'precondition']))); console.log(`sweep ${x}: no app, every check precondition`); continue }
    try { await grade([taskFile, so, '--at', x, '--sealed', '--reuse']) } catch (e) { console.log(`sweep ${x}: ${String(e?.message ?? e).split('\n')[0]}`); continue } // results stay error
    at.set(x, new Map((readJson(join(sw, 'grades', `${x.slice(0, 7)}.json`))?.checks ?? []).map((r) => [r.id, r.result])))
  }
  const res = (x, id) => at.get(x)?.get(id) ?? 'error'
  const moves = new Map(), receivers = new Map()
  for (const p of pre) {
    const earlier = order.slice(0, order.indexOf(p.t)).reverse().map((t) => ({ task: t, base: res(tasks[t].base, p.m.id), end: res(tasks[t].end, p.m.id) }))
    const to = introducer(earlier), moved = to !== null && !drop.includes(to)
    if (moved) {
      const from = join(data, p.t, 'oracle'), into = join(data, to, 'oracle')
      mkdirSync(into, { recursive: true })
      scaffoldInto(join(data, 'oracle-scaffold'), into)
      if (p.file) { copyFileSync(join(from, p.file), join(into, p.file)); rmSync(join(from, p.file)) }
      const kept = existsSync(join(into, 'manifest.json')) ? JSON.parse(readFileSync(join(into, 'manifest.json'), 'utf8')).filter((m) => m.id !== p.m.id) : []
      writeFileSync(join(into, 'manifest.json'), JSON.stringify([...kept, { ...p.m, task: to }], null, 2) + '\n')
      writeFileSync(join(from, 'manifest.json'), JSON.stringify(JSON.parse(readFileSync(join(from, 'manifest.json'), 'utf8')).filter((m) => m.id !== p.m.id), null, 2) + '\n')
      receivers.set(to, [...new Set([...(receivers.get(to) ?? []), p.m.fix_commit])])
    }
    moves.set(p.t, [...(moves.get(p.t) ?? []), { id: p.m.id, to, moved }])
    console.log(`${p.m.id} ${moved ? 'moved to' : 'recorded'} ${to ?? 'none'}`)
  }
  for (const [t, list] of moves) { // a rerun keeps the earlier moves of other checks
    const f = join(data, t, 'moves.json'), old = (readJson(f) ?? []).filter((x) => !list.some((y) => y.id === x.id))
    writeFileSync(f, JSON.stringify([...old, ...list], null, 2) + '\n')
  }
  const nMoved = [...moves.values()].flat().filter((x) => x.moved).length
  console.log(`sweep: pre-existing ${pre.length}, boundaries ${commits.length}, moved ${nMoved}, recorded ${pre.length - nMoved}`)
  for (const [t, refs] of receivers) await validate(await taskCtx(t, taskFile), { grade, agent, refs })
  return 0
}

// --- classify, split (ruling 15) and queue (ruling 16). Prints counts only: replies, labels, prompts and checks are sealed ---
const CLASS = ['traceable', 'not traceable', 'partly']
const CL_HIDDEN = ['fix_commit', 'origin', 'hunk', 'task'] // never shown to a classifier
const CL_SCORED = ['valid', 'absent-at-base'] // ruling 13
const SAMPLE_71 = ['valid', 'absent-at-base'] // the checks the 7.1 read samples from
const fx = (x) => (typeof x === 'number' ? x.toFixed(2) : 'none')

// a task of tasks.json needs its task file (the validate convention); an external task's is <data>/env/<task>.json
function clCtx(task, taskFile) {
  const data = dataDir(), dir = join(data, task), repoTasks = readJson(join(data, 'tasks.json')) ?? {}
  if (repoTasks[task]) {
    if (!taskFile) throw new Error(`${task} is a task of tasks.json: give its task file first`)
    return { data, task, dir, taskFile, ext: false }
  }
  if (taskFile) throw new Error(USAGE)
  taskOf(join(data, 'ext'), task)
  return { data, task, dir, taskFile: join(data, 'env', `${task}.json`), ext: true }
}

const clManifest = (c) => readJson(join(c.dir, 'oracle', 'manifest.json'))
const clVerdict = (c, e) => readJson(join(c.dir, `validation-${String(e.fix_commit).slice(0, 7)}.json`))?.checks?.find((x) => x.id === e.id)?.verdict
const clScored = (c) => (clManifest(c) ?? []).filter((e) => e.dropped !== true && e.interface !== 'none' && CL_SCORED.includes(clVerdict(c, e)))
const clFile = (c, e) => e.file ?? readdirSync(join(c.dir, 'oracle')).find((f) => f.startsWith(`${e.id}.`)) ?? null

// the valid labels of a classifier's reply; ok when every id is labelled exactly once and nothing else is
function classReply(text, ids) {
  let arr = null
  try { arr = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1)) } catch {}
  const got = new Map()
  if (!Array.isArray(arr)) return { got, ok: false }
  const seen = new Map()
  for (const e of arr) seen.set(e?.id, (seen.get(e?.id) ?? 0) + 1)
  for (const e of arr) if (ids.includes(e?.id) && seen.get(e.id) === 1 && CLASS.includes(e.label)) got.set(e.id, e.label)
  return { got, ok: got.size === ids.length && arr.length === ids.length }
}

// the reading a run did, counted into its record: successful Read calls, and those of a file under `dir`
const readCount = (dir) => (stream) => {
  const reads = okToolInputs(stream, 'Read')
  return { reads: reads.length, readsInFolder: reads.filter((i) => String(i.file_path ?? '').startsWith(`${dir}/`)).length }
}

// one rater: a bad reply is run once more (`-2`); the final reply's valid labels go to `<name>-<r>.json`. { failed }: the final run did not end with code 0 or its reply
// labels no check. prepare() builds the folder, the prompt and the settings, only when a run is to be made
async function rater(agent, c, name, r, text, prompt, prepare, ids) {
  for (const n of [1, 2]) {
    const out = join(c.dir, `${name}-${r}${n === 1 ? '' : '-2'}.reply.md`), rec = `${out}.run.json`
    if (!existsSync(rec)) {
      const { settings, dir } = prepare()
      await agent([c.taskFile, `${name}-${r}-${c.task}${n === 1 ? '' : '-2'}`, '--prompt', prompt, '--out', out, '--tools', 'Read,Glob,Grep', '--settings', settings], { record: readCount(dir) })
      const x = readJson(rec)
      if (x) writeFileSync(rec, JSON.stringify({ ...x, promptSha: sha256(text) }, null, 2) + '\n')
    }
    const res = classReply(existsSync(out) ? readFileSync(out, 'utf8') : '', ids)
    if (res.ok || n === 2) {
      if (!res.got.size || readJson(rec)?.code !== 0) return { failed: true }
      writeFileSync(join(c.dir, `${name}-${r}.json`), JSON.stringify(ids.filter((id) => res.got.has(id)).map((id) => ({ id, label: res.got.get(id) })), null, 2) + '\n')
      return { got: res.got }
    }
  }
}

// two raters over `entries` in a folder of the input, the sheet, the stripped manifest and their check files only
async function classRound(agent, c, name, entries) {
  const work = join(c.dir, 'work'), dir = join(work, name), ids = entries.map((e) => e.id)
  const text = `${readFileSync(join(c.data, 'briefs/classify.md'), 'utf8').trimEnd()}\n\n## The folder\n\n\`${dir}\`\n\n## The check ids (${ids.length})\n\n${ids.map((id) => `- \`${id}\``).join('\n')}\n`
  const prompt = join(work, `${name}.prompt.md`), settings = join(work, `${name}-settings.json`)
  let ready = null
  const prepare = () => ready ??= (() => {
    rmSync(dir, { recursive: true, force: true })
    mkdirSync(dir, { recursive: true })
    for (const f of ['input.md', 'interface.md']) copyFileSync(join(c.dir, f), join(dir, f))
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(entries.map((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !CL_HIDDEN.includes(k)))), null, 2) + '\n')
    for (const f of new Set(entries.map((e) => clFile(c, e)))) cpSync(join(c.dir, 'oracle', f), join(dir, f))
    writeFileSync(prompt, text)
    writeFileSync(settings, JSON.stringify({ permissions: { additionalDirectories: [dir], allow: [`Read(/${dir}/**)`] } }, null, 2) + '\n')
    return { settings, dir }
  })()
  // a run whose record exists was made with another prompt: nothing runs and the prompt stays
  const recs = [1, 2].flatMap((r) => ['', '-2'].map((x) => join(c.dir, `${name}-${r}${x}.reply.md.run.json`)))
  if (recs.some((f) => existsSync(f) && readJson(f)?.promptSha !== sha256(text))) return { stale: true }
  const rs = await Promise.all([1, 2].map((r) => rater(agent, c, name, r, text, prompt, prepare, ids)))
  if (rs.some((x) => x.failed)) return { failed: rs.map((x, i) => (x.failed ? i + 1 : 0)).filter(Boolean) }
  const [l1, l2] = rs.map((x) => x.got)
  const m = mergeLabels([...l1].map(([id, label]) => ({ id, label })), [...l2].map(([id, label]) => ({ id, label })))
  m.disputed.push(...ids.filter((id) => !l1.has(id) && !l2.has(id))) // a check neither rater labelled
  const both = ids.filter((id) => l1.has(id) && l2.has(id)) // agreement over the checks both raters labelled
  const stats = both.length ? agreement(both.map((id) => l1.get(id)), both.map((id) => l2.get(id)), CLASS) : null
  return { ...m, ids, stats }
}

const writeLabels = (c, add, drop = []) => {
  const f = join(c.dir, 'labels.json'), old = readJson(f) ?? {}
  for (const id of drop) delete old[id]
  writeFileSync(f, JSON.stringify({ ...old, ...add }, null, 2) + '\n')
}
const failedClass = (c, rs) => `${c.task} classify failed: rater ${rs.join(' and ')} has no labelled reply (no label, or a run that failed)`
const staleClass = (c) => `${c.task} classify refused a run whose prompt differs from the one it ran with`

async function classify(c, agent) {
  for (const f of ['input.md', 'interface.md', 'oracle/manifest.json']) if (!existsSync(join(c.dir, f))) { console.log(`${c.task} classify refused: no ${f}`); return 1 }
  const entries = clScored(c)
  if (!entries.length) { console.log(`${c.task} classify refused: no scored check`); return 1 }
  if (entries.some((e) => { const f = clFile(c, e); return !f || !existsSync(join(c.dir, 'oracle', f)) })) { console.log(`${c.task} classify refused: a scored check has no file`); return 1 }
  const r = await classRound(agent, c, 'classify', entries)
  if (r.stale || r.failed) { console.log(r.stale ? staleClass(c) : failedClass(c, r.failed)); return 1 }
  writeLabels(c, r.labels, r.ids)
  const old = readJson(join(c.dir, 'agreement.json'))
  writeFileSync(join(c.dir, 'agreement.json'), JSON.stringify({ ...r.stats, usable: r.stats ? usable(r.stats) : false, checks: r.ids.length, partly: r.partly, disputed: r.disputed, ...(old?.split ? { split: old.split } : {}) }, null, 2) + '\n')
  const v = Object.values(r.labels), s = r.stats ?? {}
  console.log(`${c.task} classified=${r.ids.length} build=${v.filter((x) => x === 'build').length} requirement=${v.filter((x) => x === 'requirement').length} partly=${r.partly.length} disputed=${r.disputed.length} kappa=${fx(s.kappa)} raw=${fx(s.raw)} ac1=${fx(s.ac1)}`)
  return 0
}

// the highest n of `<sha7>-T<n>` over every oracle of the data folder, dropped entries too: a source commit's checks
// can sit in several tasks' oracles. shortcut: no lock across tasks, so split one task at a time
function highestOf(data, sha7) {
  let max = 0
  for (const d of readdirSync(data)) for (const e of readJson(join(data, d, 'oracle', 'manifest.json')) ?? []) {
    const m = String(e?.id).match(/^(.+)-T(\d+)$/)
    if (m && m[1] === sha7) max = Math.max(max, Number(m[2]))
  }
  return max
}

// one sealed splitter for an agreed partly check; the two new entries (judged by the writer rules) or null
async function splitOne(agent, c, e, manifest) {
  const sha7 = e.id.slice(0, e.id.lastIndexOf('-T')), work = join(c.dir, 'work', `split-${e.id}`), inDir = join(work, 'in'), outDir = join(work, 'out')
  const out = join(work, 'split.reply.md'), rec = `${out}.run.json`, prompt = join(work, 'split.prompt.md'), settings = join(work, 'split-settings.json')
  const file = clFile(c, e), grouped = manifest.some((x) => x.id !== e.id && x.file !== undefined && x.file === e.file)
  // a run keeps the ids it was given (its record holds them), so a later split's ids never make its prompt stale
  const n = highestOf(c.data, sha7), ids = readJson(rec)?.ids ?? [`${sha7}-T${n + 1}`, `${sha7}-T${n + 2}`]
  const runner = c.ext && existsSync(join(c.dir, 'oracle/runner.json')) ? `## The runner\n\n${fence(readFileSync(join(c.dir, 'oracle/runner.json'), 'utf8'), 'json')}\n` : ''
  const text = [readFileSync(join(c.data, 'briefs/split.md'), 'utf8').trimEnd() + '\n',
    `## The oracle writer's rules\n\n${fence(readFileSync(join(c.data, c.ext ? 'ext/briefs/oracle.md' : 'briefs/oracle-re.md'), 'utf8'), 'markdown')}`,
    runner, `## The new check ids\n\n1. \`${ids[0]}\` (traceable)\n2. \`${ids[1]}\` (not traceable)\n`, `## Your folder\n\n\`${work}\`\n`].filter(Boolean).join('\n')
  if (!existsSync(rec)) {
    rmSync(work, { recursive: true, force: true })
    mkdirSync(outDir, { recursive: true })
    mkdirSync(dirname(join(inDir, file)), { recursive: true })
    for (const f of ['input.md', 'interface.md']) copyFileSync(join(c.dir, f), join(inDir, f))
    const shown = Object.fromEntries(Object.entries(e).filter(([k]) => !CL_HIDDEN.includes(k) && (k !== 'file' || grouped)))
    writeFileSync(join(inDir, 'entry.json'), JSON.stringify(shown, null, 2) + '\n')
    copyFileSync(join(c.dir, 'oracle', file), join(inDir, file))
    writeFileSync(prompt, text)
    writeFileSync(settings, JSON.stringify({ permissions: { additionalDirectories: [work], allow: [`Read(/${work}/**)`, `Edit(/${outDir}/**)`] } }, null, 2) + '\n')
    await agent([c.taskFile, `split-${c.task}-${e.id.toLowerCase()}`, '--prompt', prompt, '--out', out, '--tools', 'Read,Glob,Grep,Write,Edit', '--settings', settings], { record: readCount(inDir) })
    const x = readJson(rec)
    if (x) writeFileSync(rec, JSON.stringify({ ...x, promptSha: sha256(text), ids }, null, 2) + '\n')
  } else if (readJson(rec)?.promptSha !== sha256(text)) return { stale: true }
  const got = readJson(join(outDir, 'manifest.json'))
  if (!Array.isArray(got) || got.length !== 2 || got.some((x, i) => x?.id !== ids[i])) return null
  // the writer's fields come from the original; the splitter gives behaviour, severity and a grouped file
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(got.map((x) => ({ id: x.id, hunk: e.hunk, origin: e.origin, behaviour: x.behaviour, interface: e.interface, severity: x.severity, ...(grouped ? { file: x.file } : {}) })), null, 2) + '\n')
  const rules = c.ext ? {} : JSON.parse(readFileSync(join(c.data, 'briefs/oracle-re.json'), 'utf8'))
  const res = judge(outDir, e.fix_commit, (h) => (h === e.hunk ? e.task : null), c.ext, rules)
  if (!res || res.entries.some((x) => x.why) || (grouped && res.entries.some((x) => x.file !== normalize(file)))) return null
  return { entries: res.entries, outDir }
}

async function split(c, agent, validate) {
  const agr = readJson(join(c.dir, 'agreement.json'))
  if (!agr) { console.log(`${c.task} split refused: not classified`); return 1 }
  const o = join(c.dir, 'oracle'), tally = { split: 0, failed: 0, stale: 0 }
  for (const id of agr.partly) {
    const manifest = clManifest(c), e = manifest.find((x) => x.id === id)
    if (!e || e.dropped === true) continue // split already
    const s = await splitOne(agent, c, e, manifest)
    if (s?.stale) { tally.stale++; continue }
    if (!s) { tally.failed++; writeLabels(c, { [id]: 'requirement' }); continue } // 6.3: not splittable -> requirement
    for (const f of new Set(s.entries.map((x) => x.file))) { mkdirSync(dirname(join(o, f)), { recursive: true }); copyFileSync(join(s.outDir, f), join(o, f)) }
    const ids = s.entries.map((x) => x.e.id)
    writeFileSync(join(o, 'manifest.json'), JSON.stringify([...manifest.map((x) => (x.id === id ? { ...x, dropped: true, split_into: ids } : x)),
      ...s.entries.map((x) => entryOut(x, e.fix_commit, c.ext))], null, 2) + '\n')
    writeLabels(c, {}, [id])
    tally.split++
  }
  const made = (clManifest(c) ?? []).filter((x) => x.dropped === true && agr.partly.includes(x.id)).flatMap((x) => x.split_into ?? [])
  let r = null
  if (made.length) {
    // a new check with no verdict yet is validated (this run's, or one a failed validation left)
    if ((clManifest(c) ?? []).some((x) => made.includes(x.id) && clVerdict(c, x) === undefined)) {
      let why = null
      try { const code = await validate(c.ext ? [c.task] : [c.taskFile, c.task]); if (code !== 0) why = `exit ${code}` } catch (err) { why = String(err?.message ?? err).split('\n')[0] }
      if (why !== null) { console.log(`${c.task} split validate failed (${why}); the new checks are not classified`); return 1 }
    }
    const fresh = clScored(c).filter((x) => made.includes(x.id))
    if (fresh.length) {
      r = await classRound(agent, c, 'classify-split', fresh)
      if (r.stale || r.failed) { console.log(r.stale ? staleClass(c) : failedClass(c, r.failed)); return 1 }
      writeLabels(c, { ...r.labels, ...Object.fromEntries(r.partly.map((id) => [id, 'requirement'])) }, r.ids) // partly again -> requirement
      writeFileSync(join(c.dir, 'agreement.json'), JSON.stringify({ ...agr, split: { ...r.stats, checks: r.ids.length, partly: r.partly, disputed: r.disputed } }, null, 2) + '\n')
    }
  }
  const v = Object.values(r?.labels ?? {})
  console.log(`${c.task} split partly=${agr.partly.length} split=${tally.split} failed=${tally.failed} stale=${tally.stale} new=${made.length} classified=${r?.ids.length ?? 0} build=${v.filter((x) => x === 'build').length} requirement=${v.filter((x) => x === 'requirement').length + (r?.partly.length ?? 0)} disputed=${r?.disputed.length ?? 0}`)
  return tally.stale ? 1 : 0
}

const tsvOut = (f, head, rows) => writeFileSync(f, [head.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n') + '\n')

// ruling 16: the step 9 queue over the classified tasks of each set; exit 3 when a set's pooled agreement is not usable
async function queue() {
  const data = dataDir(), ext = join(data, 'ext'), q = join(data, 'step9')
  const seed = readJson(join(ext, 'groups.json'))?.seed
  if (!seed) throw new Error('no seed in ext/groups.json')
  const sampleFile = join(ext, 'sample.tsv'), [head, ...rows] = existsSync(sampleFile) ? readFileSync(sampleFile, 'utf8').trim().split('\n').map((l) => l.split('\t')) : [[]]
  const stackOf = new Map(rows.map((r) => [r[head.indexOf('task')], r[head.indexOf('stack')]]))
  const done = (t) => existsSync(join(data, t, 'agreement.json'))
  const sets = [['task-repo', Object.keys(readJson(join(data, 'tasks.json')) ?? {}).filter(done)], ['external', [...stackOf.keys()].filter(done)]]
  const ctx = (t) => ({ data, task: t, dir: join(data, t) })
  mkdirSync(q, { recursive: true })
  const src = join(data, 'sources/labels.tsv')
  const step9 = existsSync(src) ? readFileSync(src, 'utf8').split('\n').slice(1).filter(Boolean).map((l) => l.split('\t')).filter((r) => r[5] === 'step9').map((r) => r.slice(0, 3)) : []
  tsvOut(join(q, 'labels.tsv'), ['commit', 'task', 'kind'], step9)
  const disputed = sets.flatMap(([, ts]) => ts.flatMap((t) => { const a = readJson(join(data, t, 'agreement.json')); return [...a.disputed, ...(a.split?.disputed ?? [])].map((id) => [t, id]) }))
  tsvOut(join(q, 'classify.tsv'), ['task', 'id'], disputed)
  const pick = (name, ids, n) => { const owner = new Map(ids.map(([t, id]) => [id, t])); return queuePick([...owner.keys()], n, seed).map((id) => [name, owner.get(id), id]) }
  const groups = [['task-repo', sets[0][1]], ...[...new Set(sets[1][1].map((t) => stackOf.get(t)))].sort().map((s) => [s, sets[1][1].filter((t) => stackOf.get(t) === s)])]
  const s71 = groups.flatMap(([g, ts]) => pick(g, ts.flatMap((t) => (clManifest(ctx(t)) ?? []).filter((e) => e.dropped !== true && e.interface !== 'none' && SAMPLE_71.includes(clVerdict(ctx(t), e))).map((e) => [t, e.id])), 10))
  tsvOut(join(q, 'sample-7.1.tsv'), ['set', 'task', 'id'], s71)
  // 7.2: only checks both raters gave the same traceable or not traceable label, never a bucket a rule assigned
  const agreed = (t) => ['classify', 'classify-split'].flatMap((n) => {
    const l2 = new Map((readJson(join(data, t, `${n}-2.json`)) ?? []).map((x) => [x.id, x.label]))
    return (readJson(join(data, t, `${n}-1.json`)) ?? []).filter((x) => x.label !== 'partly' && l2.get(x.id) === x.label).map((x) => [t, x.id])
  })
  const s72 = sets.flatMap(([g, ts]) => pick(g, ts.flatMap(agreed), 20))
  tsvOut(join(q, 'sample-7.2.tsv'), ['set', 'task', 'id'], s72)
  const inputs = sets.flatMap(([g, ts]) => queuePick(ts, 2, seed).map((t) => [g, t]))
  tsvOut(join(q, 'inputs.tsv'), ['set', 'task'], inputs)
  console.log(`queue: labels ${step9.length}, classify ${disputed.length}, sample-7.1 ${s71.length}, sample-7.2 ${s72.length}, inputs ${inputs.length}`)
  const stop = []
  for (const [g, ts] of sets) {
    const a = [], b = []
    for (const t of ts) { // pooled over the main rounds: the checks both raters labelled
      const l2 = new Map((readJson(join(data, t, 'classify-2.json')) ?? []).map((x) => [x.id, x.label]))
      for (const x of readJson(join(data, t, 'classify-1.json')) ?? []) if (l2.has(x.id)) { a.push(x.label); b.push(l2.get(x.id)) }
    }
    if (!a.length) { console.log(`${g}: tasks ${ts.length}, checks 0`); continue }
    const s = agreement(a, b, CLASS), ok = usable(s)
    console.log(`${g}: tasks ${ts.length}, checks ${s.n}, kappa=${fx(s.kappa)} raw=${fx(s.raw)} ac1=${fx(s.ac1)} usable ${ok ? 'yes' : 'no'}`)
    if (!ok) stop.push(g)
  }
  for (const g of stop) console.log(`stop: ${g} not usable`)
  return stop.length ? 3 : 0
}

const validateCmd = (inj) => (a) => oracle(['validate', ...a], inj)

export async function oracle(args, inj = {}) {
  // inj.validate: split's validation of its new checks (tests inject one); by default this file's validate command
  const { agent = sealedAgent, grade = gradeCmd, validate: validateRun = validateCmd(inj) } = inj
  if (!process.env.HSTACK_BENCH_MACHINE) throw new Error('set HSTACK_BENCH_MACHINE to the machine file (for example .evidence/bench/machine.json)')
  const [cmd, taskPath, ...rest] = args
  if (cmd === 'pairs' && taskPath && (rest.length === 0 || (rest.length === 2 && rest[0] === '--drop'))) return pairs(taskPath, rest.length ? rest[1].split(',') : [])
  if (cmd === 'label' && taskPath && rest.length === 2) return label(taskPath, rest[0], rest[1], agent)
  if (cmd === 'labels' && args.length === 1) return labels()
  if (cmd === 'write' && taskPath && rest.length <= 1) return rest.length ? writeSource(taskPath, rest[0], agent) : writeTask(taskPath, agent)
  if (cmd === 'validate' && taskPath && rest.length <= 1) return validate(await (rest.length ? taskCtx(rest[0], taskPath) : taskCtx(taskPath)), { grade, agent })
  if (cmd === 'sweep' && taskPath && (rest.length === 0 || (rest.length === 2 && rest[0] === '--drop'))) return sweep(taskPath, rest.length ? rest[1].split(',') : [], { grade, agent })
  if (cmd === 'sheet' && taskPath && rest.length === 0) return sheet(taskPath, agent)
  if ((cmd === 'classify' || cmd === 'split') && taskPath && rest.length <= 1) {
    const c = rest.length ? clCtx(rest[0], taskPath) : clCtx(taskPath)
    return cmd === 'classify' ? classify(c, agent) : split(c, agent, validateRun)
  }
  if (cmd === 'queue' && args.length === 1) return queue()
  throw new Error(USAGE)
}

if (import.meta.main) {
  try { process.exit(await oracle(process.argv.slice(2))) } catch (e) { console.error(e.message); process.exit(2) }
}
