// Step 15's diagnosis of H4 (the plan's rulings 2–5, registered in the prereg's section 12 "Applied at step 15"). Pure: no fs, no git.
// Counts only: a histogram key outside a plain-name pattern is counted as <other>, so no transcript text leaves here. Names no task.
import { toolCalls, toolUses } from './agent.mjs'
import { bootstrapMean, canaryScore } from './score.mjs'

export const PARTS = ['oracle', 'reviewer', 'gate']
const INACTIVE = 44, EDGE = 15 // ruling 5's literals: half of H's 87 runs; 15 of the 29 tasks
const AGENT_KEY = /^[A-Za-z0-9_:.-]{1,64}$/, WORD_KEY = /^[a-z][a-z0-9_-]{0,31}$/
// the plugin script's heads (fix round 2: a superset of the six), an optional closing quote, whitespace, then its subcommand word (up to
// whitespace or a shell delimiter). An opening quote before `$H` or `${H}` needs no match of its own; `$HOME` and `$HX` never match
const HEAD = /(?:hstack\.sh|\$\{H\}|\$H)["']?\s+([^\s;&|()<>'"`]+)/g
// the loose count (decides nothing): the script or `$H`/`${H}` as a token anywhere, and the whole word `gate` anywhere
const LOOSE = (c) => /hstack\.sh|\$\{H\}|\$H(?![A-Za-z0-9_])/.test(c) && /(?<![A-Za-z0-9_.-])gate(?![A-Za-z0-9_.-])/.test(c)
const bump = (h, k, re) => { const key = re.test(k) ? k : '<other>'; h[key] = (h[key] ?? 0) + 1 }
const hist = () => Object.create(null) // a key such as `constructor` is a count like any other
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const sd = (xs) => (xs.length < 2 ? null : Math.sqrt(xs.reduce((a, x) => a + (x - mean(xs)) ** 2, 0) / (xs.length - 1)))
const r9 = (x) => Math.round(x * 1e9) / 1e9

// ruling 2 (O1): one run's turn texts. The totals count every call, as the record's toolUses; a part ran on its non-error calls (the
// decider); `called` counts its calls with a tool_result, errored or not (fix round 1), as do the histograms, so an errored gate shows
export function activity(turns) {
  const a = { oracle: 0, reviewer: 0, gate: 0, called: { oracle: 0, reviewer: 0, gate: 0 }, looseGate: 0, agentTotal: 0, bashTotal: 0, agentCalled: 0, bashCalled: 0,
    agentTypes: hist(), scriptWords: hist() }
  const count = (part, ok) => { a.called[part]++; if (ok) a[part]++ }
  for (const t of turns) {
    const n = toolUses(t)
    a.agentTotal += n.Agent ?? 0
    a.bashTotal += n.Bash ?? 0
    const agents = toolCalls(t, 'Agent'), bashes = toolCalls(t, 'Bash')
    a.agentCalled += agents.length // the calls with a tool_result: the check line shows the results were matched
    a.bashCalled += bashes.length
    for (const { input, ok } of agents) {
      const type = String(input.subagent_type ?? '')
      if (type === 'hstack:oracle') count('oracle', ok)
      if (type === 'hstack:reviewer') count('reviewer', ok)
      bump(a.agentTypes, type, AGENT_KEY)
    }
    for (const { input, ok } of bashes) {
      const command = String(input.command ?? ''), words = [...command.matchAll(HEAD)].map((m) => m[1])
      if (LOOSE(command)) a.looseGate++
      if (words.includes('gate')) count('gate', ok) // a call, counted once; the histogram counts each word
      for (const w of words) bump(a.scriptWords, w, WORD_KEY)
    }
  }
  return a
}
// per arm: the runs where each part ran (and was called), its mean calls per run, the histograms summed
export function summary(acts) {
  const add = (k) => acts.reduce((h, a) => { for (const [w, n] of Object.entries(a[k])) h[w] = (h[w] ?? 0) + n; return h }, hist())
  const per = (f) => Object.fromEntries(PARTS.map((p) => [p, f(p)]))
  return { runs: acts.length, ran: per((p) => acts.filter((a) => a[p] > 0).length), calls: per((p) => mean(acts.map((a) => a[p]))),
    called: { ran: per((p) => acts.filter((a) => a.called[p] > 0).length), calls: per((p) => mean(acts.map((a) => a.called[p]))) },
    loose: { gate: acts.filter((a) => a.looseGate > 0).length, calls: acts.reduce((n, a) => n + a.looseGate, 0) },
    agentTypes: add('agentTypes'), scriptWords: add('scriptWords') }
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// a results file name of the task's H or W run: filtered before any read, so no other arm's record is opened
export const hwRecord = (task, f) => new RegExp(`^${esc(task)}-[HW]-\\d+\\.json$`).test(f)

// ruling 3 (O2): `git diff --numstat` lines `added<TAB>deleted<TAB>path`; binary (`-`) counts 0; a quoted path is unquoted for isTest
export function numstatDistance(text, isTest) {
  const d = { code: 0, test: 0 }
  for (const l of text.split('\n').filter(Boolean)) {
    const m = /^(\d+|-)\t(\d+|-)\t(.+)$/.exec(l)
    if (!m) throw new Error('a numstat line is not <added> <deleted> <path>') // never quotes the line: it holds a product path
    const path = m[3].startsWith('"') ? m[3].slice(1, -1) : m[3]
    if (m[1] !== '-') d[isTest(path) ? 'test' : 'code'] += Number(m[1]) + Number(m[2])
  }
  return d
}
// a task's H–W pairs (between) and H–H, W–W pairs (within); a null sha leaves its pairs; each pair's dist once, for code and test
export async function taskDistance({ H, W }, dist) {
  const h = H.filter(Boolean), w = W.filter(Boolean), two = (xs) => xs.flatMap((a, i) => xs.slice(i + 1).map((b) => [a, b]))
  const between = h.flatMap((a) => w.map((b) => [a, b])), within = [...two(h), ...two(w)], pairs = { between: between.length, within: within.length }
  if (!between.length || !within.length) return { code: null, test: null, pairs }
  const run = async (ps) => { const out = []; for (const [a, b] of ps) out.push(await dist(a, b)); return out }
  const B = await run(between), Wi = await run(within)
  const side = (k) => { const b = mean(B.map((x) => x[k])), v = mean(Wi.map((x) => x[k])); return { between: b, within: v, r: Math.log((b + 1) / (v + 1)) } }
  return { code: side('code'), test: side('test'), pairs }
}
// the mean of r_t over the tasks with one, its 95% bootstrap; the tasks without are named
export function o2Line(perTask, side, seed) {
  const rs = perTask.filter((t) => t[side]).map((t) => t[side].r)
  return { tasks: rs.length, out: perTask.filter((t) => !t[side]).map((t) => t.task), ...(rs.length ? bootstrapMean(rs, seed) : { mean: null, lower: null, upper: null }) }
}

// ruling 4 (O3): rows are table rows of H and W only; a row is scored as analysis.mjs's isScored. Means r9-rounded before the bounds
export function scoreShape(rows, maxOf, tasks = [...new Set(rows.map((r) => r.task))]) {
  const perTask = [], out = [], spread = { H: [], W: [] }
  for (const task of tasks) {
    const v = Object.fromEntries(['H', 'W'].map((arm) => [arm, rows.filter((r) => r.task === task && r.arm === arm && (r.build !== null || r.requirement !== null)).map((r) => canaryScore(r.build, r.requirement))]))
    for (const arm of ['H', 'W']) if (v[arm].length >= 2) spread[arm].push(sd(v[arm]))
    if (!v.H.length || !v.W.length) { out.push(task); continue }
    const max = maxOf(task), h = r9(mean(v.H)), w = r9(mean(v.W)), d = r9(mean(v.H) - mean(v.W))
    perTask.push({ task, max, h, w, d, tie: Math.abs(d) < 1e-9, ceiling: h >= 0.9 * max && w >= 0.9 * max, floor: h <= 0.1 * max && w <= 0.1 * max })
  }
  const n = (k) => perTask.filter((t) => t[k]).length
  return { tasks: perTask.length, out, ties: n('tie'), ceiling: n('ceiling'), floor: n('floor'), edge: n('ceiling') + n('floor'),
    sdH: mean(spread.H), sdW: mean(spread.W), sdD: sd(perTask.map((t) => t.d)), perTask }
}

// ruling 5, in its order; a null lower bound is no trace. Inactive is decided on the non-error runs (`ran`); a control that found nothing,
// then a part called (errored included) in 44 or more runs, leave it unconfirmed (fix round 1)
export function outcome({ ran, called, edge, controlFound, codeLower, testLower }) {
  if (PARTS.every((p) => ran[p] < INACTIVE)) {
    if (!controlFound) return 'inactive or a detector fault (unconfirmed)'
    return PARTS.every((p) => called[p] < INACTIVE) ? 'inactive' : 'inactive (unconfirmed: called in 44 or more)'
  }
  if (edge >= EDGE) return 'little room'
  if (codeLower !== null && codeLower > 0) return 'a code trace'
  if (testLower !== null && testLower > 0) return 'a test trace only'
  return 'no trace'
}
