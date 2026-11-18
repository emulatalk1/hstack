import { test, expect, spyOn, afterAll } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { scored } from '../bench/scored.mjs'
import { activity, hwRecord, numstatDistance, outcome, scoreShape, taskDistance } from '../bench/lib/diagnose.mjs'
import { isTestPath } from '../bench/lib/replay.mjs'
import { toolUses } from '../bench/lib/agent.mjs'

const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'bench-diagnose-')))
afterAll(() => rmSync(tmp, { recursive: true, force: true }))

// one turn's stream-json: each call an assistant tool_use (sent twice, as the stream repeats a message) and its tool_result
let ids = 0
const turn = (calls, text = '') => [
  ...(text ? [{ type: 'assistant', message: { id: 'mt', content: [{ type: 'text', text }] } }] : []),
  ...calls.flatMap(({ name, input, error = false, cut = false }) => {
    const id = `tu_${++ids}`, a = { type: 'assistant', message: { id: `m${id}`, content: [{ type: 'tool_use', id, name, input }] } }
    return cut ? [a] : [a, a, { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: error, content: `${text} out` }] } }]
  }),
  { type: 'result', is_error: false, result: 'DONE' },
].map((e) => JSON.stringify(e)).join('\n') + '\n'
const agent = (type, error, cut) => ({ name: 'Agent', input: { subagent_type: type, prompt: 'p' }, error, cut })
const bash = (command, error, cut) => ({ name: 'Bash', input: { command }, error, cut })

test('activity counts Agent calls by subagent_type and Bash calls by the gate pattern', () => {
  const a = activity([
    turn([agent('hstack:oracle'), agent('hstack:oracle'), agent('hstack:reviewer', true), agent('general-purpose'), bash('sh "/p/scripts/hstack.sh" gate'), bash('$H lock a b && $H phase oracle')]),
    turn([agent('hstack:reviewer'), bash('ls'), bash('$H gate', true), { name: 'Write', input: {} }, agent('not a name!')]),
  ])
  // ran: non-error calls; called: every call with a tool_result, errored included, as the histograms
  expect(a).toEqual({ oracle: 2, reviewer: 1, gate: 1, called: { oracle: 2, reviewer: 2, gate: 2 }, agentTotal: 6, bashTotal: 4,
    agentTypes: { 'hstack:oracle': 2, 'general-purpose': 1, 'hstack:reviewer': 2, '<other>': 1 }, scriptWords: { gate: 2, lock: 1, phase: 1 } })
})

test('a call with no tool_result counts in the totals only, neither ran nor called', () => {
  const a = activity([turn([agent('hstack:oracle', false, true), bash('$H gate', false, true), agent('hstack:reviewer', true)])])
  expect([a.oracle, a.gate, a.reviewer, a.called, a.agentTotal, a.bashTotal]).toEqual([0, 0, 0, { oracle: 0, reviewer: 1, gate: 0 }, 2, 1])
  expect([a.agentTypes, a.scriptWords]).toEqual([{ 'hstack:reviewer': 1 }, {}])
})

test('only a command that runs the plugin script with gate counts, in each quoted form', () => {
  const gate = (c) => activity([turn([bash(c)])]).gate
  for (const c of ['sh /abs/scripts/hstack.sh gate', 'sh "/abs/scripts/hstack.sh" gate', "sh '/abs/scripts/hstack.sh' gate", '$H gate', '"$H" gate', '${H} gate',
    '$H gate > "$S/gate.txt" 2>&1', 'cd /r && $H gate; echo $?', 'sh -c "$H gate"', '$H  gate|tee x', '$H lock t.js && $H gate']) expect([c, gate(c)]).toEqual([c, 1])
  for (const c of ['$HOME gate', 'cat gate.md', 'git commit -m "add the gate"', '$H gates', '$H gate-x', '$H gate.sh', '$H phase gate', 'hstack.sh lock gate', 'ls ./gate',
    'echo $Hgate', '$H\tgatekeeper']) expect([c, gate(c)]).toEqual([c, 0])
  expect(activity([turn([bash('$H gate && $H gate')])]).gate).toBe(1) // one call, counted once
  expect(activity([turn([bash('$H start; "$H" elapsed; ${H} done; hstack.sh" ZQ; $H 9x')])]).scriptWords).toEqual({ start: 1, elapsed: 1, done: 1, '<other>': 2 })
})

test('numstat splits test and code files and counts binary as 0', () => {
  const text = ['3\t1\tsrc/a.js', '2\t0\ttests/a.test.js', '-\t-\tassets/logo.png', '5\t5\tsrc/b.spec.ts', '1\t1\tsrc/with\ttab.js', ''].join('\n')
  expect(numstatDistance(text, isTestPath)).toEqual({ code: 6, test: 12 })
  expect(numstatDistance('', isTestPath)).toEqual({ code: 0, test: 0 })
})

test('taskDistance uses 9 between and 6 within pairs', async () => {
  const seen = []
  const dist = async (a, b) => { seen.push(`${a}${b}`); return a[0] === b[0] ? { code: 1, test: 0 } : { code: 7, test: 3 } }
  const t = await taskDistance({ H: ['h1', 'h2', 'h3'], W: ['w1', 'w2', 'w3'] }, dist)
  expect(t.pairs).toEqual({ between: 9, within: 6 })
  expect(seen.length).toBe(15) // each pair once, for both code and test
  expect(t.code).toEqual({ between: 7, within: 1, r: Math.log(8 / 2) })
  expect(t.test).toEqual({ between: 3, within: 0, r: Math.log(4) })
  const one = await taskDistance({ H: ['h1', null, 'h3'], W: ['w1', 'w2', 'w3'] }, dist)
  expect(one.pairs).toEqual({ between: 6, within: 4 })
  const none = await taskDistance({ H: [null, null, null], W: ['w1', 'w2', 'w3'] }, dist)
  expect([none.code, none.test, none.pairs]).toEqual([null, null, { between: 0, within: 3 }])
  const noWithin = await taskDistance({ H: ['h1', null], W: ['w1', null] }, dist)
  expect([noWithin.code, noWithin.pairs]).toEqual([null, { between: 1, within: 0 }])
})

const base = { ran: { oracle: 80, reviewer: 80, gate: 80 }, called: { oracle: 80, reviewer: 80, gate: 80 }, runs: 87, edge: 3, controlFound: true, codeLower: -0.1, testLower: -0.1 }
test("outcome follows ruling 5's order", () => {
  const low = { oracle: 1, reviewer: 2, gate: 3 }
  expect(outcome({ ...base, ran: low, called: low, edge: 20, codeLower: 1, testLower: 1 })).toBe('inactive')
  expect(outcome({ ...base, ran: low, called: low, controlFound: false })).toBe('inactive or a detector fault (unconfirmed)')
  expect(outcome({ ...base, ran: low, called: { ...low, gate: 50 } })).toBe('inactive (unconfirmed: called in 44 or more)')
  expect(outcome({ ...base, ran: low, called: { ...low, gate: 50 }, controlFound: false })).toBe('inactive or a detector fault (unconfirmed)') // the control's wording first
  expect(outcome({ ...base, edge: 20, codeLower: 1, testLower: 1 })).toBe('little room')
  expect(outcome({ ...base, codeLower: 0.2, testLower: 1 })).toBe('a code trace')
  expect(outcome({ ...base, testLower: 0.2 })).toBe('a test trace only')
  expect(outcome(base)).toBe('no trace')
  expect(outcome({ ...base, codeLower: null, testLower: null })).toBe('no trace')
  expect(outcome({ ...base, controlFound: false })).toBe('no trace') // the control qualifies inactive only
})
test('inactive needs fewer than 44 in all three', () => {
  const at = (k, n) => ({ oracle: 43, reviewer: 43, gate: 43, ...(k ? { [k]: n } : {}) })
  expect(outcome({ ...base, ran: at(), called: at() })).toBe('inactive')
  for (const k of ['oracle', 'reviewer', 'gate']) {
    expect(outcome({ ...base, ran: at(k, 44), called: at(k, 44) })).toBe('no trace')
    expect(outcome({ ...base, ran: at(), called: at(k, 44) })).toBe('inactive (unconfirmed: called in 44 or more)') // called counts its own 44
  }
})
test('little room at 15', () => {
  expect(outcome({ ...base, edge: 15 })).toBe('little room')
  expect(outcome({ ...base, edge: 14 })).toBe('no trace')
})
test('a lower bound of 0 is not a trace', () => {
  expect(outcome({ ...base, codeLower: 0, testLower: 0 })).toBe('no trace')
  expect(outcome({ ...base, codeLower: 0, testLower: 1e-9 })).toBe('a test trace only')
})

test('scoreShape counts ties, ceiling and floor per task maximum, and the spreads', () => {
  const row = (task, arm, build, requirement) => ({ task, arm, build, requirement })
  const rows = [
    ...[[0.8, 1], [0.8, 1], [0.9, 0.9]].flatMap(([b, q]) => [row('a', 'H', b, q), row('a', 'W', b, q)]), // max 2, means 5.4/3 = 1.8: a ceiling tie
    row('b', 'H', 0.1, 0), row('b', 'W', 0, 0), row('b', 'W', null, null), // max 1: a floor; W's unscored run counts nothing
    row('c', 'H', 1, 1), row('c', 'W', 0, 0), row('c', 'W', 1, 0),
  ]
  const s = scoreShape(rows, (t) => (t === 'b' ? 1 : 2))
  expect([s.tasks, s.out, s.ties, s.ceiling, s.floor, s.edge]).toEqual([3, [], 1, 1, 1, 2])
  expect(s.perTask.map((t) => t.d)).toEqual([0, 0.1, 1.5])
  expect(s.sdH).toBeCloseTo(0, 9) // task a only: b and c have one scored H run each
  expect(s.sdW).toBeCloseTo(Math.SQRT1_2 / 2, 9) // tasks a (0) and c (0 and 1); b's unscored run adds none
  expect(s.sdD).toBeCloseTo(Math.sqrt(((0 - 1.6 / 3) ** 2 + (0.1 - 1.6 / 3) ** 2 + (1.5 - 1.6 / 3) ** 2) / 2), 9)
  expect(scoreShape([row('a', 'H', 1, 0)], () => 2).out).toEqual(['a'])
})

test('the record filter takes only H and W names of the task', () => {
  expect(['t1-H-1.json', 't1-W-12.json', 't1-B-1.json', 't1-B--1.json', 't10-H-1.json', 't1-H-1', 't1-H-1.json.tmp', 'xt1-H-1.json'].filter((f) => hwRecord('t1', f))).toEqual(['t1-H-1.json', 't1-W-12.json'])
})

// --- the command, on a synthetic data folder and a scratch repo ---

const MARK = 'ZqMark' // in transcripts and products: never in the output
const quiet = async (fn) => {
  const out = []
  const a = spyOn(console, 'log').mockImplementation((...x) => out.push(x.join(' ')))
  const b = spyOn(console, 'error').mockImplementation((...x) => out.push(x.join(' ')))
  try { return { code: await fn(), out: out.join('\n') } } catch (e) { return { code: 'threw', out: out.join('\n'), error: e.message } } finally { a.mockRestore(); b.mockRestore() }
}
const go = async (d, args) => {
  const prev = process.env.HSTACK_BENCH_MACHINE
  process.env.HSTACK_BENCH_MACHINE = join(d, 'machine.json')
  try { return await quiet(() => scored(args)) } finally { if (prev === undefined) delete process.env.HSTACK_BENCH_MACHINE; else process.env.HSTACK_BENCH_MACHINE = prev }
}
const git = (repo, ...a) => {
  const p = Bun.spawnSync(['git', '-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a])
  if (p.exitCode !== 0) throw new Error(`git ${a.join(' ')}: ${p.stderr}`)
}
const PLUGINS = [{ name: 'hstack', commit: 'c0', sha256: 's0' }]
const H_CALLS = [agent('hstack:oracle'), bash('sh "/p/scripts/hstack.sh" lock tests/x.test.js'), agent('hstack:reviewer'), bash('$H gate'), agent(`${MARK} free text`), bash(`hstack.sh ${MARK}`)]
const W_CALLS = [agent('general-purpose'), bash('git commit -m "the gate"'), bash('$H gate', true)] // an errored gate: called, not ran

// tasks t1 (h1_ids 2) and t2 (0) are external and scored; t3 is dropped; p1 is the private set's. c1 holds the control run, under its floor.
function world(name, { wCalls = W_CALLS, controlCalls = [agent('hstack:oracle')], skipRegistered = false, skipTable = false } = {}) {
  const d = join(tmp, name), repo = join(d, 'repo')
  for (const x of ['results', 'env/box', 'step13/floor', 'step15', 'repo']) mkdirSync(join(d, x), { recursive: true })
  writeFileSync(join(d, 'machine.json'), JSON.stringify({ forbid: { paths: [] } }))
  writeFileSync(join(d, 'arms.json'), JSON.stringify({ model: 'M', smallModel: 'S', cli: 'x', plugins: { H: [], W: [] } }))
  writeFileSync(join(d, 'tasks.tsv'), 'set\ttask\tstatus\th1_ids\nexternal\tt1\tscored\t2\nexternal\tt2\tscored\t0\nexternal\tt3\tdropped\t1\nreal-estate\tp1\tscored\t2\n')
  if (!skipRegistered) writeFileSync(join(d, 'step15/registered'), JSON.stringify({ plan: 'p', tool: 't', at: 'now' }))
  for (const t of ['t1', 't2', 'p1']) writeFileSync(join(d, 'step13/floor', `${t}.json`), JSON.stringify({ H: 0, B: 0, W: 0 }))
  writeFileSync(join(d, 'step13/floor/c1.json'), JSON.stringify({ H: 5, B: 0, W: 0 }))
  git(repo, 'init', '-q', '-b', 'main')
  mkdirSync(join(repo, 'src')); mkdirSync(join(repo, 'tests'))
  writeFileSync(join(repo, 'src/a.js'), 'a\n'.repeat(10)); writeFileSync(join(repo, 'tests/a.test.js'), 't\n')
  git(repo, 'add', '-A'); git(repo, 'commit', '-q', '-m', 'base')
  const rows = []
  const put = (task, arm, n, calls, { toolsOff = 0 } = {}) => {
    const label = `${task}-${arm}-${n}`, dir = join(d, 'results', label)
    mkdirSync(dir, { recursive: true })
    const turns = [turn(calls.slice(0, 2), MARK), turn(calls.slice(2), MARK)]
    writeFileSync(join(dir, '0-probe.jsonl'), turn([bash('ls')])) // the probe's calls are not the run's, as the record counts them
    turns.forEach((t, i) => writeFileSync(join(dir, `${i + 1}-${i ? `resume-${i}` : 'main'}.jsonl`), t))
    writeFileSync(join(dir, 'settings.json'), '{}\n')
    const tools = {}
    for (const t of turns) for (const [k, v] of Object.entries(toolUses(t))) tools[k] = (tools[k] ?? 0) + v
    if (toolsOff) tools.Agent = (tools.Agent ?? 0) + toolsOff
    let branch = null
    if (task !== 'c1') {
      branch = `bench/${label}`
      git(repo, 'checkout', '-q', '-B', branch, 'main')
      const lines = arm === 'H' ? [...Array(20)].map((_, i) => `h${i}`) : []
      writeFileSync(join(repo, 'src/a.js'), 'a\n'.repeat(10) + [...lines, `${arm}${n}`].join('\n') + '\n')
      if (arm === 'H') writeFileSync(join(repo, 'tests/a.test.js'), 't\nth1\nth2\n')
      writeFileSync(join(repo, `src/${MARK}.js`), `${MARK}\n`)
      git(repo, 'add', '-A'); git(repo, 'commit', '-q', '-m', `${MARK} commit`)
      git(repo, 'checkout', '-q', 'main')
    }
    writeFileSync(join(d, 'results', `${label}.json`), JSON.stringify({ task, arm, run: n, model: 'M', machine: null, status: 'done', plugins: arm === 'H' ? PLUGINS : [],
      transcripts: dir, toolUses: tools, branch, start: '2026-11-12T10:00:00.000Z', end: '2026-11-12T10:30:00.000Z' }))
  }
  for (const t of ['t1', 't2']) for (const n of [1, 2, 3]) { put(t, 'H', n, H_CALLS); put(t, 'W', n, wCalls) }
  put('c1', 'H', 1, controlCalls); put('c1', 'H', 2, []); put('c1', 'H', 3, []); put('c1', 'H', 4, [])
  for (const t of ['t1', 't2', 'p1']) for (const arm of ['H', 'W', 'B']) for (const n of [1, 2, 3]) {
    const s = { t1: { H: [1, 1], W: [0.5, 1], B: [0, 0] }, t2: { H: [1, 0], W: [1, 0], B: [0, 0] }, p1: { H: [0, 0], W: [0, 0], B: [1, 1] } }[t][arm]
    rows.push({ task: t, set: t === 'p1' ? 'real-estate' : 'external', arm, run: n, build: s[0], requirement: s[1], noresult: false })
  }
  if (!skipTable) writeFileSync(join(d, 'step13/table.json'), JSON.stringify({ runs: rows }))
  for (const t of ['t1', 't2', 'p1', 'c1']) writeFileSync(join(d, 'env/box', `${t}.json`), JSON.stringify({ name: t, repo, db: null, port: 4000, start: null, ready: null, setup: [], teardown: [], oracle: 'x', junit: 'j.xml' }))
  return { d, put }
}
const ARGS = (d) => ['diagnose', join(d, 'tasks.tsv'), '--control', 'c1:H:1,c1:H:2,c1:H:3,c1:H:4']

test('diagnose refuses without registered', async () => {
  for (const o of [{ skipRegistered: true }, { skipTable: true }]) {
    const { d } = world(`refuse-${Object.keys(o)[0]}`, o)
    writeFileSync(join(d, 'tasks.tsv'), 'not a tsv') // never read: the refusal comes first
    const r = await go(d, ARGS(d))
    expect(r.code).toBe('threw')
    expect(r.error).toContain('diagnose refused')
    expect(existsSync(join(d, 'step15/diagnosis.json'))).toBe(false)
  }
})

test('diagnose prints counts only', async () => {
  const { d } = world('counts')
  const r = await go(d, ARGS(d))
  expect(r.code).toBe(0)
  const lines = r.out.split('\n'), file = readFileSync(join(d, 'step15/diagnosis.json'), 'utf8')
  for (const text of [r.out, file]) expect(text.toLowerCase()).not.toContain(MARK.toLowerCase())
  expect(lines.findIndex((l) => l.startsWith('O1'))).toBeGreaterThan(lines.findLastIndex((l) => l.startsWith('check')))
  expect(lines.filter((l) => l.startsWith('check')).every((l) => l.endsWith(' ok'))).toBe(true)
  expect(lines).toContain('O1 H runs=6 oracle=6/6 called=6/6 reviewer=6/6 called=6/6 gate=6/6 called=6/6 calls oracle=1.00 called=1.00 reviewer=1.00 called=1.00 gate=1.00 called=1.00')
  expect(lines).toContain('O1 W runs=6 oracle=0/6 called=0/6 reviewer=0/6 called=0/6 gate=0/6 called=6/6 calls oracle=0.00 called=0.00 reviewer=0.00 called=0.00 gate=0.00 called=1.00')
  expect(lines).toContain('O1 H agentTypes <other>:6,hstack:oracle:6,hstack:reviewer:6')
  expect(lines).toContain('O1 H scriptWords <other>:6,gate:6,lock:6')
  expect(lines).toContain('O1 W scriptWords gate:6') // the errored gate shows in the histogram
  expect(lines).toContain('check standing tasks=2 ok')
  expect(lines).toContain('control runs=4 oracle=1 called=1 reviewer=0 called=0 gate=0 called=0 found=yes')
  const o2 = lines.find((l) => l.startsWith('O2 code')), r1 = Math.log((22 + 1) / (2 + 1)).toFixed(4)
  expect(o2).toBe(`O2 code tasks=2 out=none mean=${r1} 95%=[${r1}, ${r1}]`)
  expect(lines.find((l) => l.startsWith('O2 test'))).toBe('O2 test tasks=2 out=none mean=1.0986 95%=[1.0986, 1.0986]') // ln((2 + 1)/(0 + 1))
  expect(lines.find((l) => l.startsWith('O3'))).toBe('O3 tasks=2 out=none max1=t2 ties=1 ceiling=1 floor=0 sdH=0.0000 sdW=0.0000 sdD=0.3536') // B and private-set rows left out
  expect(lines.at(-1)).toBe('outcome inactive') // 6 runs are fewer than the registered 44
  const j = JSON.parse(file)
  expect([j.outcome, j.o1.H.ran, j.o1.W.called.ran, j.o2.code.tasks, j.o3.tasks]).toEqual(['inactive', { oracle: 6, reviewer: 6, gate: 6 }, { oracle: 0, reviewer: 0, gate: 6 }, 2, 2])
  expect(/\bB\b/.test(r.out) || /"B"/.test(file)).toBe(false)
})

test('diagnose never opens a B record', async () => {
  const { d } = world('b-record')
  // a B record that says it is an H run 1 with no transcripts and a toolUses no turn gives: read, it would stand and fail a check
  writeFileSync(join(d, 'results/t1-B-1.json'), JSON.stringify({ task: 't1', arm: 'H', run: 1, model: 'M', machine: null, plugins: PLUGINS, transcripts: join(d, 'nowhere'), toolUses: { Agent: 99 }, branch: null }))
  const r = await go(d, ARGS(d))
  expect(r.code).toBe(0)
  expect(r.out).toContain('O1 H runs=6 ')
})

test('a W run with a removed part stops before the reading', async () => {
  for (const [name, calls] of [['oracle', [agent('hstack:oracle')]], ['reviewer', [agent('hstack:reviewer')]], ['gate', [bash('$H gate')]]]) {
    const { d, put } = world(`w-${name}`)
    put('t2', 'W', 2, [...W_CALLS, ...calls])
    const r = await go(d, ARGS(d))
    expect(r.code).toBe(3)
    expect(r.out).toContain('t2 W-2')
    expect(r.out).not.toMatch(/^(O1|O2|O3|control|outcome)/m)
    expect(existsSync(join(d, 'step15/diagnosis.json'))).toBe(false)
  }
})

test('a toolUses mismatch, a run with no transcript or another plugin stops before the reading', async () => {
  const { d, put } = world('checks')
  put('t1', 'H', 3, H_CALLS, { toolsOff: 1 })
  rmSync(join(d, 'results/t2-W-1'), { recursive: true })
  const f = join(d, 'results/t2-H-2.json'), rec = JSON.parse(readFileSync(f, 'utf8'))
  writeFileSync(f, JSON.stringify({ ...rec, plugins: [{ ...PLUGINS[0], commit: 'c1' }] }))
  const r = await go(d, ARGS(d))
  expect(r.code).toBe(3)
  for (const n of ['t1 H-3', 't2 W-1', 't2 H-2']) expect(r.out).toContain(n)
  expect(r.out).not.toMatch(/^(O1|O2|O3|control|outcome)/m)
  expect(existsSync(join(d, 'step15/diagnosis.json'))).toBe(false)
})

test('a control run with no part prints inactive as unconfirmed; a control above its floor is refused', async () => {
  const { d } = world('control', { controlCalls: [] })
  const r = await go(d, ARGS(d))
  expect(r.code).toBe(0)
  expect(r.out).toContain('control runs=4 oracle=0 called=0 reviewer=0 called=0 gate=0 called=0 found=no')
  expect(r.out.split('\n').at(-1)).toBe('outcome inactive or a detector fault (unconfirmed)')
  const up = await go(d, ['diagnose', join(d, 'tasks.tsv'), '--control', 't1:H:1'])
  expect([up.code, up.error]).toEqual(['threw', 'diagnose refused: control t1 H-1 is above its floor (a standing run)'])
  const b = await go(d, ['diagnose', join(d, 'tasks.tsv'), '--control', 'c1:B:1'])
  expect(b.code).toBe('threw')
})

test('a task with no floor file or with 2 standing runs in an arm stops before the reading', async () => {
  const { d } = world('standing')
  rmSync(join(d, 'step13/floor/t2.json')) // no floor: no run of t2 stands
  rmSync(join(d, 'results/t1-W-3.json'))
  const r = await go(d, ARGS(d))
  expect(r.code).toBe(3)
  expect(r.out).toContain('check standing tasks=2 differs t1 W=2,t2 H=0,t2 W=0')
  expect(r.out).not.toMatch(/^(O1|O2|O3|control|outcome)/m)
  expect(existsSync(join(d, 'step15/diagnosis.json'))).toBe(false)
})
