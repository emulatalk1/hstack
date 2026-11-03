#!/usr/bin/env bun
// Oracle preparation of the task repo (step 5, ruling 7): pair each source commit with its owner task, label each
// pair twice by sealed agents, merge the labels; then rewrite each source's tests as black-box checks by sealed writers
// (ruling 9). Prints counts only: a reply, a manifest and a check are sealed.
import { copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, normalize, resolve } from 'node:path'
import { gitOut, readRows } from './bugs.mjs'
import { parseRunner, taskOf } from './ext.mjs'
import { okBashCommands } from './lib/agent.mjs'
import { hunkOwners } from './lib/oracle.mjs'
import { isTestPath } from './lib/replay.mjs'
import { loadTask } from './lib/task.mjs'
import { sealedAgent } from './sealed-agent.mjs'

const USAGE = 'usage: bun bench/oracle.mjs pairs <task.json> [--drop <task,...>] | label <task.json> <1|2> <task> | labels | write <task.json> <commit> | write <external task>'
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
async function runWriter(agent, { taskFile, label, at, prompt, text, out, dir, settings }) {
  const rec = `${out}.run.json`
  if (existsSync(rec)) { const r = readJson(rec); return r?.promptSha === sha256(text) ? { how: 'reused', code: r.code } : { how: 'reused', stale: true } }
  rmSync(dir, { recursive: true, force: true })
  rmSync(out, { force: true })
  for (const d of [dir, dirname(settings), dirname(prompt)]) mkdirSync(d, { recursive: true })
  writeFileSync(prompt, text)
  writeFileSync(settings, JSON.stringify({ permissions: { additionalDirectories: [dir], allow: [`Read(/${dir}/**)`, `Edit(/${dir}/**)`] } }, null, 2) + '\n')
  await agent([taskFile, label, '--prompt', prompt, '--out', out, '--at', at, '--tools', 'Read,Glob,Grep,Write,Edit', '--settings', settings])
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
      if (receives) {
        for (const f of scaffoldFiles) copyFileSync(join(scaffold, f), join(o, f))
        if (!lstatSync(join(o, 'node_modules'), { throwIfNoEntry: false })) symlinkSync(join(scaffold, 'node_modules'), join(o, 'node_modules'))
      }
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

export async function oracle(args, { agent = sealedAgent } = {}) {
  if (!process.env.HSTACK_BENCH_MACHINE) throw new Error('set HSTACK_BENCH_MACHINE to the machine file (for example .evidence/bench/machine.json)')
  const [cmd, taskPath, ...rest] = args
  if (cmd === 'pairs' && taskPath && (rest.length === 0 || (rest.length === 2 && rest[0] === '--drop'))) return pairs(taskPath, rest.length ? rest[1].split(',') : [])
  if (cmd === 'label' && taskPath && rest.length === 2) return label(taskPath, rest[0], rest[1], agent)
  if (cmd === 'labels' && args.length === 1) return labels()
  if (cmd === 'write' && taskPath && rest.length <= 1) return rest.length ? writeSource(taskPath, rest[0], agent) : writeTask(taskPath, agent)
  throw new Error(USAGE)
}

if (import.meta.main) {
  try { process.exit(await oracle(process.argv.slice(2))) } catch (e) { console.error(e.message); process.exit(2) }
}
