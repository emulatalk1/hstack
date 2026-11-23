#!/usr/bin/env bun
// hstack run state and the three hooks. TypeScript, run with Bun; git is the only other program it needs (gh for three
// feedback verbs). State lives outside the work tree and outside .git (Claude Code guards writes into .git), in
// ${HSTACK_STATE:-$HOME/.hstack} (or /tmp/.hstack without HOME)/<checksum of the git dir>, so it is never committed
// and never part of the product.
// Feedback: each stumble of a run is recorded in S/feedback/, and the user reports what they find with `feedback add`.
// Only `feedback post`, which the user invokes, sends anything out: a description the user has read in full, and fixed
// fields; never an entry's detail.
// Every string in this file is a byte string (one char per byte, latin1): an entry or a description is checked as
// bytes, so no encoding can drop or change what the checks should refuse. b() and u() convert at the edges.
// usage: hstack.ts dir|repo [<path>]|home|start|spec <file>|spec --drop|approve|takeup [--with-commits]|phase <name> [skipped: <why>]|records-check <feature list> <coverage file>|ruled|missing|lock <file>...|gate|elapsed|times [--all]|done|hook-start|hook-prompt|hook-stop
//        hstack.ts feedback add <kind> <phase|none> <description on stdin|describe <id> <description on stdin
//        hstack.ts feedback draft|post <id> <code>|dismiss <id>...|label|collect
import { appendFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { isatty } from 'node:tty'
import { cksum } from './lib/cksum.ts'

const PHASES = 'spec setup oracle implement gate review explore mutate final records'.split(' ')
// the first four are what a run does (escaped-bug: a bug in the product that the loop let through); the last three are
// about hstack itself, as its user reports them
const KINDS = 'setup-failure intervention escaped-bug cost bug update enhancement'.split(' ')
const MAX_BLOCKS = 3

const b = (s: string) => Buffer.from(s, 'utf8').toString('latin1')
const u = (s: string) => Buffer.from(s, 'latin1').toString('utf8')
// the playbook of the plugin this script is part of: an agent whose context no longer holds it reads it there (the
// agent cannot invoke the skill)
const PLAYBOOK = (() => { const d = b(import.meta.dir); return `${d.slice(0, d.lastIndexOf('/'))}/skills/build/SKILL.md` })()
const env = (k: string) => (process.env[k] === undefined ? '' : b(process.env[k] as string))
const put = (s: string) => { process.stdout.write(Buffer.from(s + '\n', 'latin1')) }
const err = (s: string) => { process.stderr.write(Buffer.from(s + '\n', 'latin1')) }
const die = (s: string): never => { err(s); process.exit(1) }

const isFile = (p: string) => { try { return statSync(u(p)).isFile() } catch { return false } }
const isLink = (p: string) => { try { return lstatSync(u(p)).isSymbolicLink() } catch { return false } }
const rd = (p: string) => readFileSync(u(p), 'latin1')
const rdOr = (p: string, d = '') => { try { return rd(p) } catch { return d } }
const wr = (p: string, s: string) => writeFileSync(u(p), s, 'latin1')
const ap = (p: string, s: string) => appendFileSync(u(p), s, 'latin1')
const mkdirp = (p: string) => mkdirSync(u(p), { recursive: true })
const ls = (p: string) => { try { return readdirSync(u(p)).map(b).sort() } catch { return [] as string[] } } // byte order, as a glob in the C locale
const lines = (s: string) => (s === '' ? [] : s.replace(/\n$/, '').split('\n'))
const first = (p: string) => lines(rdOr(p))[0] ?? ''
const base = (p: string) => p.slice(p.lastIndexOf('/') + 1)
const now = () => Math.floor(Date.now() / 1000)
const stamp = () => { const d = new Date(), z = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}` }
const int = (s: string) => { if (!/^-?[0-9]+$/.test(s.trim())) throw new Error('not a number'); return Number(s.trim()) }

function run(cmd: string, args: string[], stdin?: string) {
  const r = Bun.spawnSync([cmd, ...args.map(u)], { stdin: stdin === undefined ? 'ignore' : Buffer.from(stdin, 'latin1'), stdout: 'pipe', stderr: 'pipe' })
  return { code: r.exitCode, out: r.stdout.toString('latin1').replace(/\n+$/, '') }
}
const git = (...args: string[]) => run('git', args)

const LAUNCH = b(process.cwd()) // where the command was typed: state() may change into the code repository
const ROOT = env('HSTACK_STATE') || `${env('HOME') || '/tmp'}/.hstack`
const cd = (dir: string) => { try { process.chdir(u(dir)); return true } catch { return false } }
const toplevel = () => { const t = git('rev-parse', '--show-toplevel'); return t.code === 0 ? t.out : '' }
let G = '', S = '', pointerError = ''
// The code repository is the one the session is in, unless the top of that repository (the records home) holds
// .hstack/repo: one line, the relative path of the code repository. Everything below reads the code repository.
function state(): boolean {
  let home = toplevel()
  if (home && isFile(`${home}/.hstack/repo`)) {
    const v = first(`${home}/.hstack/repo`).trim()
    // a folder of the home is not a repository of its own: its top would be the home
    if (v === '' || !cd(`${home}/${v}`) || toplevel() === '' || toplevel() === home) { pointerError = `hstack: .hstack/repo names ${v}, which is not a git repository`; return false }
  } else home = ''
  const g = git('rev-parse', '--absolute-git-dir')
  if (g.code !== 0) return false
  G = g.out
  S = `${ROOT}/${cksum(G)}`
  try { mkdirp(S); wr(`${S}/repo`, G + '\n') } catch { return false }
  // the work tree's folder: a description must not name its path. Kept as it was when there is no work tree here.
  const top = toplevel()
  // every pathspec below (test-paths, record-paths, the paths given to lock) is relative to the top, wherever the command was typed
  if (top) { wr(`${S}/top`, top + '\n'); cd(top) }
  // the records home is set when a pointer is followed. A call from inside the code repository finds no pointer
  // there and must not make the code repository the home, or records would be written into it.
  if (home) wr(`${S}/home`, home + '\n')
  else if (top && !isFile(`${S}/home`)) wr(`${S}/home`, top + '\n')
  return true
}

const inList = (x: string | undefined, list: string[]) => x !== undefined && /^[a-z-]+$/.test(x) && list.includes(x)
const count = (re: RegExp, file: string) => lines(rdOr(file)).filter((l) => re.test(l)).length

// A feedback entry: the fields a posted draft may hold, an empty line, then detail that never leaves this machine.
// The fields are a snapshot, because start moves the state they come from. Silent: its callers are phase and the stop hook.
let E = ''
function record(kind: string, phase: string, detail: string, bare = false) {
  E = `${S}/feedback/${stamp()}-${process.pid}`
  let head = ''
  try {
    mkdirp(`${S}/feedback`)
    try { // a broken state file ends the snapshot, never the phase or the hook that called
      const v = /"version": *"([^"]*)"/.exec(rdOr(`${b(import.meta.dir)}/../.claude-plugin/plugin.json`))
      head += `version=${v ? v[1] : ''}\nkind=${kind}\nphase=${phase}\n`
      if (isFile(`${S}/started`) && !bare) {
        const end = isFile(`${S}/ended`) ? int(rd(`${S}/ended`)) : now()
        const e = Math.trunc((end - int(rd(`${S}/started`))) / 60)
        if (e <= 1440) head += `elapsed=${e}\n` // past a day it is the age of a stalled run, not a run's time
        const blocks = Math.min(isFile(`${S}/stop-blocks`) ? int(rd(`${S}/stop-blocks`)) : 0, MAX_BLOCKS)
        const locks = count(/^/, `${S}/locks`) // the loop locks once, then once per dispute round
        head += `oracle_files=${count(/^/, `${S}/oracle.lock`)}\nstop_blocks=${blocks}\ndispute_rounds=${locks > 0 ? locks - 1 : 0}\n`
        head += `skipped_phases=${count(/ skipped: /, `${S}/phases`)}\nreview_rounds=${ls(S).filter((f) => /^review-.*\.md$/.test(f)).length}\n`
        head += `unavailable_capabilities=${count(/unavailable:/, `${S}/capabilities.md`)}\n`
      }
      head += `\n${detail}\n`
    } catch { /* what was read before the broken file stays */ }
    wr(E, head)
  } catch { /* silent */ }
}

// The only gate between an entry and GitHub. A draft has two parts, both checked here:
// - the fields: the entry's head under fixed labels. Every line must be an allowed label with a value of the allowed
//   shape, so a path, a name or any other text in the head refuses the whole entry.
// - the description: the text beside the entry (<entry>.md), which the user reads in full before the yes. That reading
//   is the guard; the script only nets the commonest leaks: a path of this machine, a line or a reason copied from an
//   entry's detail, a character that would show the user something else than is posted, a text too long for a question.
const LABELS: [string, string][] = [['version', 'plugin version'], ['kind', 'kind'], ['phase', 'phase'], ['elapsed', 'elapsed minutes'], ['oracle_files', 'locked oracle files'],
  ['stop_blocks', 'stop-hook blocks'], ['dispute_rounds', 'dispute rounds'], ['skipped_phases', 'skipped phases'], ['review_rounds', 'review rounds'], ['unavailable_capabilities', 'unavailable capabilities']]
const ALLOWED = new RegExp(`^(plugin version: [0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}|phase: (${PHASES.join('|')}|none)|kind: (${KINDS.join('|')})|(elapsed minutes|locked oracle files|stop-hook blocks|dispute rounds|skipped phases|review rounds|unavailable capabilities): [0-9]{1,5})$`)
type Draft = { rc: 0 | 1 | 2; why: string; kind: string; phase: string; title: string; body: string; warn: string }
const lower = (s: string) => s.replace(/[A-Z]/g, (c) => c.toLowerCase()) // ASCII only: the text is bytes
const cut = (s: string, mark: string) => { const i = s.indexOf(mark); return i < 0 ? s : s.slice(i + mark.length) } // ${s#*mark}
const main = (gitdir: string) => { const i = gitdir.lastIndexOf('/.git'); return i < 0 ? gitdir : gitdir.slice(0, i) } // ${gitdir%/.git*}
function draft(f: string): Draft {
  const d: Draft = { rc: 1, why: 'a field outside the allowed ones', kind: '', phase: '', title: '', body: '', warn: '' }
  const all = lines(rdOr(f))
  const end = all.indexOf('')
  const fields = (end < 0 ? all : all.slice(0, end)).map((l) => { for (const [k, label] of LABELS) if (l.startsWith(k + '=')) return `${label}: ${l.slice(k.length + 1)}`; return l })
  if (fields.length === 0 || fields.some((l) => !ALLOWED.test(l))) return d
  const names = fields.map((l) => l.split(':')[0])
  if (new Set(names).size !== names.length) return d
  const field = (k: string) => { const l = fields.find((x) => x.startsWith(k + ': ')); return l === undefined ? undefined : l.slice(k.length + 2) }
  if (['plugin version', 'phase', 'kind'].some((k) => field(k) === undefined)) return d
  d.kind = field('kind') as string; d.phase = field('phase') as string

  d.why = 'the description is not a plain file'
  if (isLink(f + '.md')) return d
  if (!isFile(f + '.md')) return { ...d, rc: 2 }
  const text = rd(f + '.md').replace(/\n+$/, '')
  const tl = text.split('\n')
  const summary = tl[0]
  const rest = tl.slice(1); while (rest.length && rest[0] === '') rest.shift()
  d.why = 'the description needs a first line, its summary, of at most 200 bytes'
  if (!/[^ \t\n\v\f\r]/.test(summary) || summary.length > 200) return d
  d.why = 'the description is over 1500 bytes'
  if (text.length > 1500) return d
  // a CR or an escape would show the user another text than the one that is posted
  d.why = 'the description holds a control character'
  if (/[\x00-\x08\x0b-\x1f\x7f]/.test(text)) return d
  // gh gets the text as an argument, which is a string: bytes that are no UTF-8 would be posted as other bytes than shown
  d.why = 'the description is not valid UTF-8'
  if (b(u(text)) !== text) return d
  // the entry's project, and the project of the session that runs this
  d.why = 'the description holds a path of this machine'
  const dir = f.slice(0, f.lastIndexOf('/feedback/'))
  const top = first(`${dir}/top`), mainDir = main(first(`${dir}/repo`)), homeDir = first(`${dir}/home`) // the records home: another folder in the two-repository layout
  for (const p of [env('HOME'), mainDir, top, homeDir, main(G), S ? first(`${S}/top`) : '', S ? first(`${S}/home`) : '']) if (p.length > 1 && text.includes(p)) return d
  // every entry of this project, posted and dismissed ones too, so a stumble's reason cannot come back in through a new report:
  // a whole detail line, or what follows "skipped: " or "unavailable: " in it, when over 24 bytes
  d.why = "the description copies from an entry's local detail"
  for (const sub of ['', 'posted/', 'dismissed/']) for (const name of ls(`${dir}/feedback/${sub}`)) {
    if (/[^0-9-]/.test(name) || !isFile(`${dir}/feedback/${sub}${name}`)) continue
    const el = rd(`${dir}/feedback/${sub}${name}`).split('\n'); el.pop() // a last line without its newline is not read
    const blank = el.indexOf('', 1) // sed '1,/^$/d': the empty line is looked for from the second line on
    for (const l of blank < 0 ? [] : el.slice(blank + 1)) for (const c of [l, cut(l, ' skipped: '), cut(l, 'unavailable: ')]) {
      if (c.startsWith('posted: ')) continue
      if (c.length > 24 && text.includes(c)) return d
    }
  }
  for (const name of [base(top), base(mainDir), base(homeDir)]) // the work tree's folder, and the main checkout's when this is a worktree
    if (name.length >= 4 && lower(text).includes(lower(name))) { d.warn = name; break }
  d.title = `[feedback] ${d.phase} ${d.kind}: ${summary}`
  d.body = rest.length ? `${rest.join('\n')}\n\n---\n${fields.join('\n')}` : fields.join('\n')
  return { ...d, rc: 0 }
}

const entries = () => git('status', '--porcelain', '-uall', '-z').out.split('\0').filter((e) => e !== '') // -z: a name with a space or a letter outside ASCII comes as it is
const porcelain = () => { const o = git('status', '--porcelain').out; return o === '' ? '' : o + '\n' }
const fingerprint = () => `${git('rev-parse', '-q', '--verify', 'HEAD').out} ${run('git', ['hash-object', '--stdin'], porcelain()).out}`
function missing(): string {
  const have = lines(rdOr(`${S}/phases`))
  // a phase line is "<name>" or "<name> skipped: <why>"; a run recorded by 0.3.1 or earlier named implement "build"
  return PHASES.filter((p) => !have.some((l) => new RegExp(`^${p === 'implement' ? '(implement|build)' : p}( skipped: .+)?$`).test(l))).join(' ')
}
// the time of each step: a mark per line of phases, in a file of its own (the Stop gate compares the lines of phases whole).
// Silent: a mark that cannot be written never stops the step from being recorded.
const mark = (line: string) => {
  try { ap(`${S}/phase-times`, `${now()} ${line}\n`) } catch { /* the time is the lesser file */ }
  try { wr(`${S}/last-head`, git('rev-parse', '-q', '--verify', 'HEAD').out + '\n') } catch { /* takeup then counts from the base */ } // where the run stood at its last step
}
// one run's lines for `times`: a line per mark, then the total; the first mark is measured from `started`
const timesOf = (dir: string): string[] => {
  let prev: number
  try { prev = int(rd(`${dir}/started`)) } catch { return ['no times recorded'] }
  const start = prev, out: string[] = []
  let last = prev
  for (const l of lines(rdOr(`${dir}/phase-times`))) {
    const m = /^([0-9]+) (.+)$/.exec(l)
    if (!m) continue
    const t = Number(m[1])
    out.push(`${m[2].split(' ')[0]} ${(Math.max(0, t - prev) / 60).toFixed(1)}${m[2].includes(' skipped: ') ? ' skipped' : ''}`)
    prev = t; last = t
  }
  return out.length ? [...out, `total ${(Math.max(0, last - start) / 60).toFixed(1)}`] : ['no times recorded']
}
// The stash is one stack for the whole repository, shared by every worktree, the user's checkout and every other
// session. start records its entries in the state file stash-base, one line each, "<commit> <message>"; gate and done
// print a line for each entry that has come or gone since. A line says what changed, never who did it.
const stashNow = () => { const l = git('stash', 'list', '--format=%H %gs'); return l.code === 0 ? lines(l.out) : null } // null: git cannot read the stash
const commitOf = (entry: string) => entry.slice(0, entry.indexOf(' '))
const messageOf = (entry: string) => entry.slice(entry.indexOf(' ') + 1)
// changes: the lines of gate and done. note: why nothing was compared, which gate alone says
const stashReport = (): { note: string; changes: string[] } => {
  // a run that an earlier version of this script started recorded no stash; an empty stash is a record, an empty one
  // (with no run started there is no start to speak of, and nothing is said)
  if (!isFile(`${S}/stash-base`)) return { note: isFile(`${S}/base`) ? 'stash: not recorded at start, not compared' : '', changes: [] }
  const was = lines(rd(`${S}/stash-base`)).filter((l) => /^[0-9a-f]{40,64} /.test(l)), is = stashNow() // a line that is no entry is not compared
  if (!is) return { note: 'stash: could not be read, not compared', changes: [] } // never a line that calls every entry gone
  const not = (list: string[]) => (e: string) => !list.map(commitOf).includes(commitOf(e)) // an entry is its commit, wherever it stands in the stack
  // the commit stands in the line: an entry that is gone can still be looked at by it while git keeps the commit
  const line = (what: string) => (e: string) => `STASH ${what}: ${messageOf(e)} (${commitOf(e)})`
  return { note: '', changes: [...is.filter(not(was)).map(line('ADDED')), ...was.filter(not(is)).map(line('GONE'))] }
}
const recorded = (step: string) => lines(rdOr(`${S}/phases`)).some((l) => l === step || l.startsWith(`${step} skipped: `))
// a spec waits from `spec <file>` until `approve`: state file `spec` holds its path, its hash and the code repository's fingerprint
const waiting = () => isFile(`${S}/spec`) && !recorded('spec')
// an approved run that is not finished: of this session, or of an earlier one when the folder holds `stale`
const unfinished = () => recorded('spec') && !isFile(`${S}/done`)
// the time in which no session worked on the run, since the stop hook last ran, comes off the clock (a take-up, a resume)
const idleOff = () => { try { const t = now(), idle = t - int(rd(`${S}/last-stop`)); if (idle > 0) { wr(`${S}/started`, `${int(rd(`${S}/started`)) + idle}\n`); wr(`${S}/last-stop`, `${t}\n`) } } catch { /* no stop recorded: nothing to take off */ } } // once: the time taken off is not taken off again
const offClock = () => { try { wr(`${S}/started`, `${int(rd(`${S}/started`)) + now() - int(rd(`${S}/spec-asked`))}\n`) } catch { /* no clock to correct */ } }
const recordsChanged = () => { const ok = lines(rdOr(`${S}/records-ok`)); return ok[0] === 'checked' && ok.slice(1).some((l) => { const [hash, ...f] = l.split(' '); return git('hash-object', '--', f.join(' ')).out !== hash }) }
const moveRun = () => { // an earlier run goes to old/<time>/; what belongs to the repository and to the user's reports stays
  if (!isFile(`${S}/base`)) return
  let old = `${S}/old/${stamp()}`
  for (let i = 2; existsSync(u(old)); i++) old = `${S}/old/${stamp()}-${i}` // two runs moved in one second: a folder each, nothing written over
  mkdirp(old)
  for (const f of ls(S)) if (!f.startsWith('.') && !['old', 'repo', 'top', 'home', 'session-head', 'turn', 'stop-blocks', 'feedback', 'evidence', 'mockups'].includes(f)) renameSync(u(`${S}/${f}`), u(`${old}/${f}`))
}
const stdin = () => { const chunks: Buffer[] = [], buf = Buffer.alloc(65536); for (;;) { let n = 0; try { n = readSync(0, buf, 0, buf.length, null) } catch (e) { if ((e as { code?: string }).code === 'EAGAIN') continue; break } if (n <= 0) break; chunks.push(Buffer.from(buf.subarray(0, n))) } return Buffer.concat(chunks).toString('latin1') }

// the folder a hook judges: the one the session works in, the cwd of the hook's input (it follows a session moved into
// a worktree), else the project's folder, else here
const hookDir = (input: string) => {
  try { const c = (JSON.parse(u(input)) as { cwd?: unknown }).cwd; if (typeof c === 'string' && c !== '' && existsSync(c)) return b(c) } catch { /* no JSON: the project's folder */ }
  return env('CLAUDE_PROJECT_DIR') || '.'
}

const argv = process.argv.slice(2).map(b)
const cmd = argv.shift() ?? ''

if (cmd === 'hook-start') {
  const input = stdin()
  if (cd(hookDir(input)) && state()) {
    // a new process gets its blocks back; a compaction inside one does not
    if (input.includes('"source":"startup"') || input.includes('"source":"resume"')) { wr(`${S}/stop-blocks`, '0\n'); rmSync(u(`${S}/pass`), { force: true }) }
    // a resume of the session whose approved run is not finished: the time in which nobody worked on it comes off its clock
    if (input.includes('"source":"resume"') && unfinished() && !isFile(`${S}/stale`)) idleOff()
    // only a new session sets the reference; a resume must keep it
    // a run that a new session finds is an earlier session's (stale): the stop hook judges it only by what this session changes
    if (input.includes('"source":"startup"')) { wr(`${S}/session-head`, fingerprint() + '\n'); if (isFile(`${S}/base`)) wr(`${S}/stale`, '') }
    // a turn left open (an interrupt: no stop hook ran; or a hold that the process did not outlive) is over when a new
    // session starts: its first message takes a new note. Like the reference, the note is kept at a resume, a clear, a
    // compaction and a fork: the builder's change in that turn is still held after them
    if (input.includes('"source":"startup"')) rmSync(u(`${S}/turn`), { force: true })
    // a session that finds no reference at all takes one, whatever started it: with none, every stop would hold
    if (!isFile(`${S}/session-head`)) wr(`${S}/session-head`, fingerprint() + '\n')
  } else if (pointerError) put(`${pointerError}: the stop gate is off until the file is right.`)
  put('hstack is installed. Its build loop runs only when the user invokes it, by typing /hstack:build with a request or with the name of a spec: never start it yourself, and do other work as it is asked, without it. It starts with a brainstorm with the user, then a spec that the user approves: your first message says what you understood and what you found, and the user\'s answer decides what comes next. For a build, the brainstorm is hstack\'s own skill, hstack:brainstorm, not another brainstorming skill. Nothing is built before the approval; after the approval, follow it to its last step, decide from the spec and the code, and write each decision down. A message that only rules on a point the record of the project lists as waiting for a ruling is not a build: write the ruling as the rules of the record say, commit those files by path, and run hstack.ts ruled.')
  // the name a spec is taken up by: its file name, without its folder and without .md
  const specName = (f: string) => base(f).replace(/\.md$/, '')
  if (S && waiting()) put(`A spec waits for the user's approval: ${first(`${S}/spec`)}. The user takes it up by typing /hstack:build ${specName(first(`${S}/spec`))}: the playbook's step 1 then finds the waiting spec, and the user's answer, whether it approves it, asks for changes to it or asks for a grill of it, is taken as its item "The user's next message". If the user answers it without that command, tell them to type it; do not approve the spec yourself. If the message is a question, answer it. Other work does not need it: the spec goes on waiting, and approve refuses it if the repository changes in the meantime.`)
  else if (S && isFile(`${S}/stale`) && unfinished()) put(`An approved hstack:build run of an earlier session is not finished: spec ${first(`${S}/spec`)}; steps not recorded: ${missing()}. The user goes on with it by typing /hstack:build ${specName(first(`${S}/spec`))}. Other work does not need it. Do not bring it up unless the user asks about it.`)
  process.exit(0)
}

// The prompt hook (UserPromptSubmit): the note of the repository's state when a turn starts, which the stop hook
// compares the turn's end with, so that what the user changed before the turn is not held against it.
// Claude Code runs this hook also for a message of another session, a report of a background agent and a scheduled
// task, which can arrive in the middle of a turn: the note is taken only when none is there, and the stop hook removes
// it when it lets the turn end. A note taken in the middle of a turn would take the builder's own change in.
// It prints nothing, whatever happens: Claude Code adds what this hook prints to the conversation, and an exit code
// of 2 would stop the user's message.
if (cmd === 'hook-prompt') {
  try {
    const input = stdin()
    if (cd(hookDir(input)) && state() && !isFile(`${S}/turn`)) wr(`${S}/turn`, fingerprint() + '\n')
  } catch { /* silent: without a note the stop hook compares with the session's reference, as before */ }
  process.exit(0)
}

if (cmd === 'hook-stop') {
  if (!(cd(hookDir(stdin())) && state())) process.exit(0)
  // the turn's note, when the prompt hook took one; without it the reference is the session's, as before the prompt hook
  const note = first(`${S}/turn`)
  const ref = note || first(`${S}/session-head`)
  // the turn ends: the next message of the user takes a new note. A stop that holds leaves the note, the turn goes on.
  const end = (): never => { rmSync(u(`${S}/turn`), { force: true }); process.exit(0) }
  // a turn the user spent on a feedback verb is not a build turn: it ends once, unblocked. Consumed on every stop,
  // so a pass never waits for a later one.
  // The turn is over for the note only when nothing changed in it: a change made in the turn of a feedback verb is
  // judged at the next stop, as it was when the session had one reference.
  if (isFile(`${S}/pass`)) { rmSync(u(`${S}/pass`), { force: true }); if (fingerprint() === ref) end(); process.exit(0) }
  const stale = isFile(`${S}/stale`)
  // this session worked on its run until now: the time after it, until a take-up or a resume, is nobody's work on the run
  if (isFile(`${S}/base`) && !isFile(`${S}/done`) && !stale) try { wr(`${S}/last-stop`, `${now()}\n`) } catch { /* the clock is the lesser file */ }
  let why = '', m = ''
  // a spec waits for the user: the turn may end, and that end is the proof that the user was shown it. This comes
  // before every other way out, the one for an earlier session's run too: a spec shown again in a new session must
  // get its stamp, or approve refuses for ever. Nothing is built while it waits.
  if (waiting()) {
    const fp = fingerprint()
    if (fp === (lines(rd(`${S}/spec`))[2] ?? '')) { if (!isFile(`${S}/spec-shown`)) wr(`${S}/spec-shown`, `${now()}\n`); end() }
    // a spec of an earlier session is not this session's: the turn ends, and approve refuses a repository that changed
    if (stale) end()
    why = "a spec waits for the user's approval and nothing is built before it. If the changes made since the spec was shown are yours, undo them and end the turn as the playbook's item 'Show it' says; if the user made them, run spec --drop and start again."
  }
  // the loop runs only when the user invokes it: with no run, after a finished run and beside a run of an earlier
  // session, whatever changed, the turn ends. Only a run of this session that is not finished is held.
  else if (!isFile(`${S}/base`) || isFile(`${S}/done`) || stale) end()
  else {
    // a run that 0.3.3 or earlier recorded has no spec line and no records line: an unfinished one cannot go on,
    // because phase would refuse
    m = missing()
    if (!recorded('spec') && rdOr(`${S}/phases`) !== '') { m = ''; why = 'an hstack:build run of an earlier version was left unfinished and cannot be continued. Run hstack:build from its start.' }
    else why = `the hstack:build run is not finished; steps not recorded: ${m}. Continue hstack:build from the first of them; if its playbook is not in your context, read ${PLAYBOOK}.`
  }
  let n = 0
  try { n = int(rdOr(`${S}/stop-blocks`, '0')) } catch { n = NaN }
  if (n >= MAX_BLOCKS) { // never loop: a capped gate costs less than a run that never ends
    // the gate giving up on a started run leaves it to a human: one entry per cap (the bump past the cap marks it)
    if (n === MAX_BLOCKS && isFile(`${S}/base`) && !stale) { wr(`${S}/stop-blocks`, `${n + 1}\n`); record('intervention', m.split(' ')[0] || 'final', '') }
    process.exit(0) // the gate gives up, the turn is not over for the note: what it held is held again when a new process gets its holds back
  }
  wr(`${S}/stop-blocks`, `${(Number.isNaN(n) ? 0 : n) + 1}\n`)
  // an approved spec is named only where there is one: not with no run, not while a spec waits for the approval
  put(`{"decision":"block","reason":"hstack: ${why}${recorded('spec') ? ' Decide from the approved spec and the code.' : ''} When finished, end with exactly the reply the task asked for."}`)
  process.exit(0)
}

if (cmd === 'feedback') {
  const REPO = env('HSTACK_FEEDBACK_REPO') || 'emulatalk1/hstack'
  if (/[^A-Za-z0-9_./-]/.test(REPO) || !/^[^/]+\/[^/]+$/.test(REPO)) die('hstack: HSTACK_FEEDBACK_REPO must be owner/name')
  const verb = argv.shift() ?? ''
  state()
  // the user is in this turn: the stop hook of the session's repository lets it end once
  if (['add', 'describe', 'draft', 'post', 'dismiss', 'label', 'collect'].includes(verb)) {
    const here = b(process.cwd()), keep = [G, S]
    if (cd(env('CLAUDE_PROJECT_DIR') || '.') && state()) wr(`${S}/pass`, '')
    cd(here); [G, S] = keep
  }
  let f = ''
  const kept = (msg: string): never => { put(`hstack: ${msg}; nothing posted.${f ? ` kept: ${f}` : ''}`); process.exit(1) }
  const gh = (...args: string[]) => run('gh', args)
  const needGh = () => {
    if (!Bun.which('gh')) kept('gh is not installed')
    if (gh('auth', 'status').code !== 0) kept('gh is not logged in')
  }
  const entry = (id: string | undefined) => { // sets f to an unposted entry's file, or exits. The id is checked before a path is built from it.
    if (id === undefined || id === '' || /[^0-9/-]/.test(id)) die(`usage: hstack.ts feedback ${verb} <id>..., the id as feedback draft printed it`)
    const i = id as string
    if (!/^[0-9]+\/[0-9]{8}-[0-9]{6}-[0-9]+$/.test(i)) die(`hstack: ${i} is not an entry id`)
    f = `${ROOT}/${i.slice(0, i.lastIndexOf('/'))}/feedback/${i.slice(i.indexOf('/') + 1)}`
    if (!isFile(f)) die(`hstack: no unposted entry ${i}`)
  }
  const describe = (file: string) => { // the description from stdin, kept as written; an empty one changes nothing
    if (isatty(0) || isLink(file + '.md')) return false
    const t = stdin().replace(/\n+$/, '')
    if (t === '') return false
    wr(file + '.md', t + '\n')
    return true
  }
  const code = (d: Draft) => cksum(`${REPO}\n${d.title}\n${d.body}\n`)
  switch (verb) {
    case 'add': {
      if (!S) die('hstack: not inside a git repository')
      const [kind, phase] = argv
      if (!(inList(kind, KINDS) && (phase === 'none' || inList(phase, PHASES)))) die(`usage: hstack.ts feedback add <${KINDS.join('|')}> <${PHASES.join('|')}|none>, the description on stdin`)
      // numbers only where a run stands behind the report: an idea, or a report outside the loop, has none; an escaped
      // bug belongs to a finished run, and without done the state is a newer run's
      const bare = kind === 'update' || kind === 'enhancement' || (kind === 'escaped-bug' && !isFile(`${S}/done`)) || phase === 'none'
      record(kind, phase, '', bare)
      if (!isFile(E)) die(`hstack: could not write ${E}`)
      put(`recorded: ${E}`)
      put(`id: ${base(S)}/${base(E)}`)
      if (!describe(E)) put(`no description yet: give one with feedback describe ${base(S)}/${base(E)}`)
      break
    }
    case 'describe':
      entry(argv[0])
      if (!describe(f)) die(`hstack: describe reads the description from stdin, and got none. kept: ${f}`)
      put(`described: ${f}`)
      break
    case 'draft': {
      let none = true
      for (const dirName of ls(ROOT)) for (const name of ls(`${ROOT}/${dirName}/feedback`)) {
        const file = `${ROOT}/${dirName}/feedback/${name}`, id = `${dirName}/${name}`
        if (!isFile(file) || /[^0-9/-]/.test(id)) continue // not an entry (a description, a stray file): a name is never printed as text
        none = false
        const d = draft(file)
        if (d.rc === 0) {
          put(`entry ${id}\nlocal: ${file}\nto: ${REPO}`)
          if (d.warn) put(`warning: the text names this project's folder (${d.warn}); check that it holds nothing of the customer's`)
          // body lines stand behind "| ", so no line of a description can pass for one of the lines around it
          put(`title: ${d.title}\n${d.body.split('\n').map((l) => '| ' + l).join('\n')}\nconfirm: ${code(d)}\n`)
        } else if (d.rc === 2) put(`undescribed ${id}: ${d.kind} at ${d.phase}\nlocal: ${file}\n`)
        // a refused entry is named, never shown: its lines may hold what must not be printed
        else put(`refused: ${file}: ${d.why}\nid: ${id}\n`)
      }
      if (none) put('no unposted feedback entry')
      break
    }
    case 'post': {
      // no text is passed in here: only an id and the code draft printed for the text the user read
      entry(argv[0])
      const d = draft(f)
      if (d.rc === 2) die(`hstack: no description: an issue needs one. Give it with feedback describe ${argv[0]}. kept: ${f}`)
      if (d.rc !== 0) die(`hstack: refused: ${d.why}. kept: ${f}`)
      if (String(code(d)) !== argv[1]) die(`hstack: the code is not the one of this draft and repository: run feedback draft and show it again. kept: ${f}`)
      needGh()
      const labels = gh('label', 'list', '--repo', REPO, '--limit', '1000', '--json', 'name', '--jq', '.[].name')
      if (labels.code !== 0) kept(`could not read the labels of ${REPO}`)
      if (!labels.out.split('\n').includes('feedback')) kept(`the label 'feedback' does not exist on ${REPO}. Ask the user; only on their yes run: hstack.ts feedback label`)
      const made = gh('issue', 'create', '--repo', REPO, '--label', 'feedback', '--title', d.title, '--body', d.body)
      if (made.code !== 0) kept('gh could not create the issue')
      const dir = f.slice(0, f.lastIndexOf('/'))
      mkdirp(`${dir}/posted`); ap(f, `posted: ${made.out}\n`)
      renameSync(u(f), u(`${dir}/posted/${base(f)}`)); renameSync(u(f + '.md'), u(`${dir}/posted/${base(f)}.md`))
      put(made.out)
      break
    }
    case 'dismiss': // off the list, not off the disk: stumbles the user will not post, or entries the script refuses
      if (argv.length === 0) die('usage: hstack.ts feedback dismiss <id>..., each id as feedback draft printed it')
      for (const id of argv) {
        entry(id)
        const dir = f.slice(0, f.lastIndexOf('/'))
        try { mkdirp(`${dir}/dismissed`); renameSync(u(f), u(`${dir}/dismissed/${base(f)}`)) } catch { die(`hstack: could not dismiss ${f}`) }
        if (existsSync(u(f + '.md')) || isLink(f + '.md')) renameSync(u(f + '.md'), u(`${dir}/dismissed/${base(f)}.md`))
        put(`dismissed: ${dir}/dismissed/${base(f)}`)
      }
      break
    case 'label': {
      needGh()
      const r = Bun.spawnSync(['gh', 'label', 'create', 'feedback', '--repo', u(REPO), '--description', 'Reports posted by hstack-feedback'], { stdout: 'inherit', stderr: 'inherit' })
      process.exit(r.exitCode)
    }
    case 'collect': {
      needGh()
      const open = gh('issue', 'list', '--repo', REPO, '--label', 'feedback', '--state', 'open', '--limit', '1000', '--json', 'number,title', '--jq', '.[] | "\\(.number)\\t\\(.title)"')
      if (open.code !== 0) kept(`could not list the issues of ${REPO}`)
      if (open.out === '') { put(`no open feedback issue on ${REPO}`); break }
      // "<phase> <kind>: <count>", then one line per issue; a title of another shape goes under "other"
      const rows = open.out.split('\n').map((l) => {
        const tab = l.indexOf('\t'), num = l.slice(0, tab), t = l.slice(tab + 1), m = /^\[feedback\] ([a-z]+) ([a-z-]+): /.exec(t)
        return m ? { k: `${m[1]} ${m[2]}`, num, t: t.slice(m[0].length) } : { k: 'other', num, t }
      }).sort((x, y) => (x.k < y.k ? -1 : x.k > y.k ? 1 : Number(x.num) - Number(y.num)))
      for (const k of [...new Set(rows.map((r) => r.k))]) { const g = rows.filter((r) => r.k === k); put(`${k}: ${g.length}\n${g.map((r) => `  #${r.num} ${r.t}`).join('\n')}`) }
      break
    }
    default: die('usage: hstack.ts feedback add <kind> <phase|none>|describe <id>|draft|post <id> <code>|dismiss <id>...|label|collect')
  }
  process.exit(0)
}

if (cmd === 'repo' && argv.length) { // name the code repository: once, from the records home
  const home = toplevel(), v = argv[0]
  if (!home) die('hstack: not inside a git repository')
  if (existsSync(u(`${home}/.hstack/repo`))) die(`hstack: ${home}/.hstack/repo exists and names ${first(`${home}/.hstack/repo`).trim()}`)
  if (v.startsWith('/') || v.includes('..')) die('hstack: repo takes a path relative to the records home, with no ..')
  const here = b(process.cwd())
  // not once a run is started here: the pointer moves the state folder, and the gate would look away from that run
  const inHome = state()
  if (inHome && isFile(`${S}/base`) && !isFile(`${S}/done`) && !isFile(`${S}/stale`)) die('hstack: a run is started in this folder: name the code repository before start, not in the middle of a run')
  const homeTurn = inHome ? `${S}/turn` : '', open = homeTurn !== '' && isFile(homeTurn) // the turn this command runs in: its note is in the home's state
  cd(here)
  // the top of a repository of its own: not a folder of the home, and not a folder inside another repository
  if (!cd(`${home}/${v}`) || toplevel() !== `${home}/${v}`.replace(/\/+$/, '')) die(`hstack: ${v} is not the top of a git repository of its own`)
  cd(here)
  mkdirp(`${home}/.hstack`); wr(`${home}/.hstack/repo`, v + '\n')
  if (!state()) die(pointerError)
  // what SessionStart does for a new session, for the code repository: this session started in the home's state
  wr(`${S}/stop-blocks`, '0\n'); wr(`${S}/session-head`, fingerprint() + '\n'); if (isFile(`${S}/base`)) wr(`${S}/stale`, '')
  // the note of the turn this command runs in moves with the session and is taken again here, so that the turn stays
  // open; a note left here by an interrupted turn of an earlier session is not this turn's
  rmSync(u(`${S}/turn`), { force: true })
  if (open) { rmSync(u(homeTurn), { force: true }); wr(`${S}/turn`, fingerprint() + '\n') }
  put(first(`${S}/top`))
  process.exit(0)
}

if (!state()) die(pointerError || 'hstack: not inside a git repository')

switch (cmd) {
  case 'dir': put(S); break
  case 'repo': put(first(`${S}/top`)); break
  case 'home': put(first(`${S}/home`)); break

  case 'start': {
    if (waiting()) { err(`a spec waits for the user's approval: ${first(`${S}/spec`)}`); put(S); break } // that run stays
    // an approved run of this session is finished, not started again: a second start would be a way out of it
    if (recorded('spec') && !isFile(`${S}/done`) && !isFile(`${S}/stale`)) die('hstack: the approved run is not finished: go on with it from its first unrecorded step. Only a new session can start another run in its place')
    moveRun()
    const head = git('rev-parse', '-q', '--verify', 'HEAD')
    wr(`${S}/base`, head.out === '' ? '' : head.out + '\n')
    if (head.code !== 0) die('hstack: the repository has no commit')
    wr(`${S}/started`, `${now()}\n`)
    wr(`${S}/phases`, '')
    wr(`${S}/base-status`, entries().join('\0')) // what the tree held before the run: spec compares with it
    const held = stashNow() // what the stash held before the run: gate and done compare with it. Not read, not recorded
    if (held) wr(`${S}/stash-base`, held.map((e) => e + '\n').join(''))
    put(S)
    break
  }

  case 'phase': {
    if (!argv[0]) die('usage: hstack.ts phase <name> [skipped: <why>]')
    const line = argv.join(' ')
    if (!/^[a-z]+( skipped: .+)?$/.test(line)) die( // one line: a name can never bring a second step in with a newline
      "hstack: a phase is '<name>' or '<name> skipped: <why>'")
    if (line === 'spec' || line.startsWith('spec skipped: ')) die('hstack: the spec step is recorded by approve, when the user has approved the spec')
    if (line.startsWith('records skipped: ')) die('hstack: the records step always runs: it is never recorded as skipped')
    if (line === 'records') { // the feature list and the coverage file are two files: they were checked against each other, as they are now
      if (!recorded('final')) die('hstack: records comes after final: the records say what the final check found')
      const ok = lines(rdOr(`${S}/records-ok`))
      if (ok.length === 0) die('hstack: run records-check <feature list> <coverage file> first (or records-check --none <why>)')
      if (recordsChanged()) die('hstack: a record changed after the check: run records-check again')
    }
    if (!recorded('spec')) die('hstack: no approved spec: show the user a spec (spec <file>), end the turn as the playbook says, and run approve when they approve it')
    try { ap(`${S}/phases`, line + '\n') } catch { process.exit(1) }
    mark(line)
    // a skipped step or an unavailable capability is a stumble. The why goes to the entry's detail only.
    const name = line.split(' ')[0]
    if (inList(name, PHASES)) {
      if (line === `${name} skipped: time` || new RegExp(`^${name} skipped: time[^a-z]`).test(line)) record('cost', name, line)
      else if (line.includes(' skipped: ')) record('setup-failure', name, line) // a guess: the loop names one such skip, a product nothing can run
      else if (name === 'setup') { const un = lines(rdOr(`${S}/capabilities.md`)).filter((l) => l.includes('unavailable:')); if (un.length) record('setup-failure', 'setup', un.join('\n')) }
    }
    break
  }

  case 'spec': {
    if (!isFile(`${S}/base`)) die('hstack: no run started: run start first')
    if (argv[0] === '--drop') { // the run ends here: nothing was built, and the session goes on as if no run had been started
      if (!waiting()) die('hstack: no spec waits: nothing to drop')
      // in the middle of a turn: the note is taken again with the session's reference, and the turn stays open, so
      // that a message that arrives later in this turn does not take a note with the builder's later change in it
      moveRun(); wr(`${S}/session-head`, fingerprint() + '\n'); rmSync(u(`${S}/stale`), { force: true })
      if (isFile(`${S}/turn`)) wr(`${S}/turn`, fingerprint() + '\n')
      put('dropped'); break
    }
    if (recorded('setup')) die('hstack: a spec is shown before setup')
    const file = argv[0] ? (argv[0].startsWith('/') ? argv[0] : `${LAUNCH}/${argv[0]}`) : '' // the spec is in the records home
    if (!file || !isFile(file) || rd(file) === '') die('usage: hstack.ts spec <file>|--drop, the file not empty')
    // nothing is built before the approval: the code repository is as start found it, but for the spec file itself
    const top = first(`${S}/top`), rel = file.startsWith(top + '/') ? file.slice(top.length + 1) : ''
    const status = entries().filter((e) => rel === '' || e.slice(3) !== rel).join('\0')
    if (git('rev-parse', '-q', '--verify', 'HEAD').out !== first(`${S}/base`) || status !== rdOr(`${S}/base-status`))
      die('hstack: nothing is built before the spec is approved. If these changes are yours, undo them; if the user made them, run spec --drop and start again')
    if (waiting() && isFile(`${S}/spec-asked`)) offClock() // every round of changes comes off the clock
    wr(`${S}/spec`, `${file}\n${git('hash-object', '--', file).out}\n${fingerprint()}\n`)
    wr(`${S}/spec-asked`, `${now()}\n`)
    rmSync(u(`${S}/spec-shown`), { force: true })
    put('the spec waits for the user: end this turn as the playbook says, and give the user the path of the spec, never its whole text')
    break
  }

  case 'approve': {
    if (!waiting()) die('hstack: no spec waits for approval')
    const [file, hash] = lines(rd(`${S}/spec`))
    if (!isFile(`${S}/spec-shown`)) die('hstack: the user has not seen this spec: end your turn first, as the playbook\'s item "Show it" says')
    if (!isFile(file) || git('hash-object', '--', file).out !== hash) die('hstack: the spec changed after it was shown: run spec again and show it')
    // the run's base is the commit at start: what changed since is not this run's, and must not be judged as its work
    if (fingerprint() !== (lines(rd(`${S}/spec`))[2] ?? '')) die('hstack: the code repository changed while the spec waited. If the changes are yours, undo them; if the user made them, delete the spec file unless they want it kept, run spec --drop, and start again')
    offClock()
    ap(`${S}/phases`, 'spec\n'); mark('spec')
    for (const f of ['stale', 'spec-asked', 'spec-shown']) rmSync(u(`${S}/${f}`), { force: true })
    put('approved')
    break
  }

  case 'takeup': { // an approved run of an earlier session, taken up by this one: the user typed /hstack:build <its spec's name>
    if (argv.length > 1 || (argv.length === 1 && argv[0] !== '--with-commits')) die('usage: hstack.ts takeup [--with-commits]')
    if (!isFile(`${S}/base`) || !unfinished()) die('hstack: no approved run that is not finished: nothing to take up')
    if (!isFile(`${S}/stale`)) die('hstack: the run is this session\'s: go on with it from its first unrecorded step')
    // the run's own commits (its base, its oracle's tests, where it stood at its last step) must still be in the history:
    // after a reset or a rewrite, its work and its tests are gone
    for (const c of [first(`${S}/base`), first(`${S}/oracle-commit`), first(`${S}/last-head`)].filter((c) => c !== ''))
      if (git('merge-base', '--is-ancestor', c, 'HEAD').code !== 0) die(`hstack: the run's commit ${c} is no longer in the history of HEAD: the run cannot go on. Start again with /hstack:build`)
    // the commits made since the run's last step may be another's work: the user decides whether the run takes them in
    // and so may a change left uncommitted in the folder
    const since = git('log', '--format=%h %s', `${first(`${S}/last-head`) || first(`${S}/base`)}..HEAD`).out
    const loose = git('status', '--porcelain').out
    if ((since !== '' || loose !== '') && argv[0] !== '--with-commits') {
      if (since !== '') put(`commits made since the run's last step:\n${since}`)
      if (loose !== '') put(`changes not committed:\n${loose}`)
      err('hstack: ask the user whether the run goes on with these in it; on their yes, run takeup --with-commits'); process.exit(2)
    }
    // this session's run from now on: the stop hook holds it, with its holds given back, and this session's reference
    rmSync(u(`${S}/stale`), { force: true }); wr(`${S}/stop-blocks`, '0\n'); wr(`${S}/session-head`, fingerprint() + '\n')
    idleOff()
    put(`taken up: go on from ${missing().split(' ')[0]}`)
    break
  }

  case 'ruled': { // the user ruled on a point of the record after a run: record files changed, and nothing else
    if (!isFile(`${S}/done`)) die('hstack: no finished run: a ruling is recorded after a run is done')
    if (git('status', '--porcelain').out !== '') die('hstack: commit the ruling first')
    const from = first(`${S}/done`), specs = (file: string) => lines(rdOr(`${S}/${file}`)).filter((l) => l !== '')
    const changed = (paths: string[]) => lines(git('diff', '--name-only', from, 'HEAD', '--', ...paths).out)
    const all = changed([]), records = specs('record-paths'), tests = specs('test-paths')
    // record-paths is the builder's own list, so it stops a mistake; a test file is refused whatever that list says
    const ok = new Set(records.length ? changed(records) : []), test = new Set(tests.length ? changed(tests) : [])
    const bad = all.filter((f) => !ok.has(f) || test.has(f))
    if (bad.length) die(`hstack: not a ruling: these files changed since the run was done and are no record files: ${bad.join(', ')}. For new work, run hstack:build from its start`)
    const head = git('rev-parse', 'HEAD').out
    wr(`${S}/done`, head + '\n')
    put(`ruling recorded at ${head}`)
    break
  }

  case 'records-check': { // every step of the feature list has its one row in the coverage file, and no row is without its step
    rmSync(u(`${S}/records-ok`), { force: true })
    if (argv[0] === '--none') {
      if (!argv[1]) die('usage: hstack.ts records-check --none <why this project has no feature list and coverage file to compare>')
      wr(`${S}/records-ok`, `none\n${argv.slice(1).join(' ')}\n`); put('no records to compare'); break
    }
    const [fl, cov] = argv.slice(0, 2).map((a) => (a.startsWith('/') ? a : `${LAUNCH}/${a}`))
    if (!fl || !cov || !isFile(fl) || !isFile(cov)) die('usage: hstack.ts records-check <feature list> <coverage file>')
    let features: { spec?: unknown; plan?: unknown; steps?: unknown }[] = []
    try { features = JSON.parse(u(rd(fl))) } catch { die(`hstack: ${fl} is not JSON`) }
    if (!Array.isArray(features) || features.some((f) => !f || !Array.isArray(f.steps) || typeof (f.spec ?? f.plan) !== 'string')) die(`hstack: ${fl} is no list of features, each with its spec or plan and its steps`)
    const LEVELS = ['full', 'partial', 'none', 'manual', 'setup', 'command']
    const bad: string[] = [], rows = new Map<string, string>(), sections = new Map<string, string>() // a spec's or plan's path -> the head of its IDs
    let head = '' // the section a row stands under
    for (const l of lines(rd(cov))) {
      const h = /^## (Spec|Plan) ([0-9]+[a-z]?(?:\.[0-9]+)?) \(`([^`]+)`\)/.exec(l), r = /^\| *((?:S|P)[0-9]+[a-z]?(?:\.[0-9]+)?-F[0-9]+-S[0-9]+) *\| *([^| ]*) *\|/.exec(l)
      if (h) { head = `${h[1] === 'Spec' ? 'S' : 'P'}${h[2]}`; if ([...sections.values()].includes(head)) bad.push(`DUPLICATE SECTION ${head}`); sections.set(h[3], head) } // the file is read as bytes: the path is one already
      if (r) {
        if (rows.has(r[1])) bad.push(`DUPLICATE ROW ${r[1]}`); rows.set(r[1], r[2]); if (!LEVELS.includes(r[2])) bad.push(`BAD COVERAGE ${r[1]}: ${r[2]}`)
        if (r[1].slice(0, r[1].indexOf('-F')) !== head) bad.push(`ROW UNDER ANOTHER SECTION ${r[1]}`)
      }
    }
    const here = b(process.cwd()); cd(fl.slice(0, fl.lastIndexOf('/'))); const top = toplevel(); cd(here)
    const nth = new Map<string, number>(), want = new Set<string>()
    let steps = 0
    for (const f of features) {
      const path = b((f.spec ?? f.plan) as string), head = sections.get(path)
      if (!isFile(`${top}/${path}`)) bad.push(`NO FILE ${path}`)
      if (!head) { if (!bad.includes(`NO SECTION ${path}`)) bad.push(`NO SECTION ${path}`); continue }
      const n = (nth.get(path) ?? 0) + 1; nth.set(path, n)
      ;(f.steps as unknown[]).forEach((_, i) => { steps++; const id = `${head}-F${n}-S${i + 1}`; want.add(id); if (!rows.has(id)) bad.push(`MISSING ROW ${id}`) })
    }
    for (const id of rows.keys()) if (!want.has(id)) bad.push(`EXTRA ROW ${id}`)
    // in a run, the check is of this run's records: one feature names the spec that the user approved
    const approved = recorded('spec') ? first(`${S}/spec`) : ''
    if (approved.startsWith(top + '/') && !features.some((f) => b((f.spec ?? f.plan) as string) === approved.slice(top.length + 1))) bad.push(`NO FEATURE for the approved spec ${approved.slice(top.length + 1)}`)
    if (bad.length) { for (const l of [...new Set(bad)]) put(l); process.exit(1) }
    wr(`${S}/records-ok`, `checked\n${git('hash-object', '--', fl).out} ${fl}\n${git('hash-object', '--', cov).out} ${cov}\n`)
    put(`records agree: ${features.length} features, ${steps} steps`)
    break
  }

  case 'missing': put(missing()); break

  case 'lock': {
    if (argv.length === 0) die('usage: hstack.ts lock <test file>...')
    let lock = ''
    for (const f of argv) {
      if (!isFile(f)) die(`hstack: ${f} is not a file`)
      lock += `${git('hash-object', '--', f).out} ${f}\n`
    }
    wr(`${S}/oracle.lock`, lock)
    ap(`${S}/locks`, '\n')
    put(`locked ${argv.length} file(s)`)
    break
  }

  case 'gate': {
    let bad = 0
    if (isFile(`${S}/oracle.lock`)) {
      const locked = lines(rd(`${S}/oracle.lock`))
      for (const l of locked) {
        const h = l.slice(0, l.indexOf(' ')), f = l.slice(l.indexOf(' ') + 1)
        if (!isFile(f)) { put(`ORACLE MISSING: ${f}`); bad = 1 } else if (git('hash-object', '--', f).out !== h) { put(`ORACLE CHANGED: ${f}`); bad = 1 }
      }
      if (!bad) put(`oracle: ${locked.length} locked file(s) unchanged`)
    } else put('oracle: no lock (the oracle step wrote no test)')
    const from = first(`${S}/base`)
    const paths = lines(rdOr(`${S}/test-paths`)).filter((p) => p !== '')
    if (rdOr(`${S}/test-paths`) !== '') {
      // pre-existing test files: deleted or renamed ones, and every removed or altered line; added lines pass
      const status = lines(git('diff', '-M', '--name-status', from, '--', ...paths).out)
      for (const l of status) if (/^(D|R)/.test(l)) put(`PRE-EXISTING TEST ${l}`)
      for (const l of status) if (/^M/.test(l)) {
        const f = l.split('\t')[1]
        for (const dl of lines(git('diff', '-U0', from, '--', f).out)) if (dl.startsWith('-') && !dl.startsWith('--- ')) put(`REMOVED ${f}: ${dl.slice(1)}`)
      }
    } else put('tests: no test-paths recorded, pre-existing tests not checked')
    const stash = stashReport()
    for (const l of [stash.note, ...stash.changes]) if (l) put(l) // information: the exit code is the one of the lines above
    process.exit(bad)
  }

  case 'elapsed': if (!isFile(`${S}/started`)) die('hstack: no run started: run start first'); put(String(Math.trunc((now() - int(rd(`${S}/started`))) / 60))); break

  case 'times': { // minutes of each step of this run; --all: of each run under old/ too, oldest first
    if (argv[0] === '--all') for (const d of ls(`${S}/old`)) { put(`run old/${d}`); for (const l of timesOf(`${S}/old/${d}`)) put(l) }
    if (argv[0] === '--all') put('run current')
    for (const l of timesOf(S)) put(l)
    break
  }

  case 'done': {
    const m = missing()
    if (m) die(`hstack: steps not recorded: ${m}`)
    if (git('status', '--porcelain').out !== '') die('hstack: commit every change first')
    if (recordsChanged()) die('hstack: a record changed after the check: run records-check again')
    const head = git('rev-parse', 'HEAD').out
    wr(`${S}/done`, head + '\n')
    wr(`${S}/ended`, `${now()}\n`)
    for (const l of stashReport().changes) put(l) // the lines gate prints: the run ends all the same
    put(`done at ${head}`)
    break
  }

  default: die('usage: hstack.ts dir|repo [<path>]|home|start|spec|approve|takeup|phase|records-check|ruled|missing|lock|gate|elapsed|times|done|feedback|hook-start|hook-prompt|hook-stop')
}
