---
type: plan
title: "Benchmark tools plan"
description: "Step 2 of the benchmark pre-registration: the throwaway environment, the oracle grader, the bug replay for test and agent layers, and the arm runner with its fixed responder, all stack-agnostic, with stack details in task files."
status: draft
generated: { by: claude-code/2.1.310, at: "2026-10-27T10:55:00+07:00" }
sources:
  - id: prereg
    resource: /plans/2026-10-27-benchmark-prereg.md
---

# Benchmark Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The tools that section 12 step 2 of the pre-registration needs: run any task's product in a throwaway environment, grade it against a hidden oracle, replay a sealed bug against a layer, and run an arm (B, B−, H, W) headless with a fixed responder, recording interventions and usage.

**Architecture:** Generic Bun scripts in `bench/`; everything a stack needs (setup, start, ready check, oracle command, teardown, test-title pattern) lives in a JSON **task file** next to the task's data in `.evidence/bench/`. Results cross the boundary in one format: JUnit XML from the oracle or test command, read by one parser. Pure logic (parsing, scoring, verdicts, intervention counting) sits in `bench/lib/` with unit tests; the CLIs are thin.

**Tech Stack:** Bun 1.4.4+, `bun:test`, ES modules (`.mjs`), git worktrees, the `claude` CLI in print mode.

**Spec:** `docs/plans/2026-10-27-benchmark-prereg.md` (sections 3, 6.2, 7.1, 8.1, 9.1, 9.3, 12).

## Global Constraints

- Bun only, no new dependency; file I/O through `Bun.file`/`Bun.write`; shell through `Bun.$` or `Bun.spawn`. Tests run with `bun test ./tests`.
- `bench/` is not plugin content. It names no customer and holds no customer data: task files, oracles, patches and results live under `.evidence/bench/` (gitignored). Tool and stack names may appear only inside task files.
- Never write under a path listed in `forbid.paths` of `.evidence/bench/machine.json`; this machine lists `/Users/hbchuc/Documents/programing/vibe-code/outsourcing`. Read-only git commands there are allowed.
- A database name a task creates must match `^bench_[a-z0-9_]+$`; anything else is refused before any command runs. No tool ever removes a container or a volume.
- Throwaway worktrees live only under `/tmp/hstack-bench/`; cleanup removes only paths under that folder.
- Sealed mode (held-out and seeded bugs) prints only `<id> caught|missed`; it never prints a patch, a bug description or a finding.
- Docs and messages in English.

## Review Focus

1. A run killed half-way (Ctrl-C, crash) leaves the dev server and the worktree behind. Expected: the next run refuses with "port <n> busy" or "worktree <path> exists", and `bench/env.mjs clean` removes only `/tmp/hstack-bench/*` and stops only processes started from there. Test: Task 3 'refuses a busy port' and 'clean removes only its own folder'.
2. The oracle command crashes or times out and writes no JUnit file. Expected: every check of that run is `error`, never `pass`, and the grade says so. Test: Task 4 'a missing result file makes every check an error'.
3. A JUnit name or message with XML entities, quotes or Vietnamese letters (`&amp;`, `&quot;`, "Lọc bất động sản"). Expected: the name reads back exactly. Test: Task 1 'decodes entities and keeps Vietnamese letters'.
4. A check that fails at its precondition at the task base. Expected: verdict "feature absent at base", not "pre-existing". Test: Task 4 'a precondition failure at the base is not pre-existing'.
5. The agent ends its turn with a question instead of using a tool to ask. Expected: the runner's continue prompt answers it, and that counts as one intervention. Test: Task 7 'a run that stops without DONE counts one intervention per resume'.

---

### Task 1: JUnit reader

**Files:**
- Create: `bench/lib/junit.mjs`
- Test: `tests/bench-junit.test.mjs`

**Interfaces:**
- Produces: `readJunit(xml: string) -> Array<{ name: string, status: 'pass'|'fail'|'skip', message: string }>`; `checkId(name: string) -> string|null` (the leading id of a test name, pattern `^[0-9a-f]{7}-T\d+|^[A-Za-z0-9_.-]+-T\d+`, null when none).

- [ ] **Step 1: Write the failing tests**

```js
test('reads pass, fail and skip test cases', () => {
  const xml = `<testsuites><testsuite><testcase name="d82f2b0-T7 refuses spaces"/>
    <testcase name="d82f2b0-T8 trims"><failure message="Expected: 400">stack</failure></testcase>
    <testcase name="x-T1 later"><skipped/></testcase></testsuite></testsuites>`
  expect(readJunit(xml)).toEqual([
    { name: 'd82f2b0-T7 refuses spaces', status: 'pass', message: '' },
    { name: 'd82f2b0-T8 trims', status: 'fail', message: 'Expected: 400' },
    { name: 'x-T1 later', status: 'skip', message: '' },
  ])
})
test('decodes entities and keeps Vietnamese letters', () => {
  const xml = '<testcase name="a-T1 &quot;Lọc bất động sản&quot; &amp; Back"><error message="PRECONDITION: no form"/></testcase>'
  expect(readJunit(xml)).toEqual([{ name: 'a-T1 "Lọc bất động sản" & Back', status: 'fail', message: 'PRECONDITION: no form' }])
})
test('checkId takes the id at the start of a name', () => {
  expect(checkId('24c426f-T3 an import fails')).toBe('24c426f-T3')
  expect(checkId('no id here')).toBe(null)
})
```

- [ ] **Step 2: Run** `bun test tests/bench-junit.test.mjs` — expect FAIL (module not found).
- [ ] **Step 3: Implement** in `bench/lib/junit.mjs`. A regex over `<testcase ...>` elements (self-closing or not); `<failure>` and `<error>` both give `fail`, the `message` attribute (or, when absent, the element text) is the message; decode `&amp; &lt; &gt; &quot; &apos;` and numeric entities. Mark it `// shortcut: regex reader for the testcase subset of JUnit, not a full XML parser; replace if a runner emits CDATA names.`
- [ ] **Step 4: Run** the test — expect PASS.
- [ ] **Step 5: Commit** `git add bench/lib/junit.mjs tests/bench-junit.test.mjs && git commit -m "Read JUnit results for the benchmark tools"`

### Task 2: Task file and safety checks

**Files:**
- Create: `bench/lib/task.mjs`
- Test: `tests/bench-task.test.mjs`

**Interfaces:**
- Produces: `parseTask(json: object, machine: { forbid: { paths: string[] } }) -> Task` that throws `Error` with a message naming the field on a bad task; `Task = { name, repo, db, port, setup: string[], start: string, ready: string, oracle: string, junit: string, teardown: string[], testTitle?: string, timeoutSec: number }`. `db` is `null` when the task needs no database. Commands are shell strings run with env `BENCH_DIR`, `BENCH_DB`, `BENCH_PORT`, `BENCH_URL`, `BENCH_JUNIT`.

- [ ] **Step 1: Write the failing tests**

```js
const machine = { forbid: { paths: ['/work/outsourcing'] } }
const ok = { name: 're', repo: '/work/copy/real-estate', db: 'bench_re8b', port: 3000, setup: ['pnpm seed:demo'],
  start: 'pnpm dev', ready: 'http://localhost:3000/', oracle: 'playwright test', junit: 'junit.xml', teardown: [] }
test('accepts a valid task and defaults the timeout to 1800 s', () => {
  expect(parseTask(ok, machine).timeoutSec).toBe(1800)
})
test('refuses a database name outside bench_', () => {
  expect(() => parseTask({ ...ok, db: 'real_estate' }, machine)).toThrow('db')
  expect(() => parseTask({ ...ok, db: 'bench_x; drop' }, machine)).toThrow('db')
})
test('refuses a repo under a forbidden path', () => {
  expect(() => parseTask({ ...ok, repo: '/work/outsourcing/real-estate' }, machine)).toThrow('repo')
})
test('refuses a relative repo, a port outside 1024-65535 and a missing oracle', () => {
  expect(() => parseTask({ ...ok, repo: 'real-estate' }, machine)).toThrow('repo')
  expect(() => parseTask({ ...ok, port: 80 }, machine)).toThrow('port')
  expect(() => parseTask({ ...ok, oracle: '' }, machine)).toThrow('oracle')
})
```

- [ ] **Step 2: Run** `bun test tests/bench-task.test.mjs` — expect FAIL.
- [ ] **Step 3: Implement** `parseTask` in `bench/lib/task.mjs`. Forbidden test: the resolved repo path equals a forbidden path or starts with it plus `/`. Also export `loadTask(path: string) -> Promise<Task>` that reads the task file and the machine file named by env `HSTACK_BENCH_MACHINE` (this machine: `.evidence/bench/machine.json`), and fails with "set HSTACK_BENCH_MACHINE" when the variable is unset.
- [ ] **Step 4: Run** the test — expect PASS.
- [ ] **Step 5: Commit** `git commit -m "Parse benchmark task files and refuse unsafe ones"`

### Task 3: Throwaway environment

**Files:**
- Create: `bench/env.mjs`
- Test: `tests/bench-env.test.mjs` (uses a temporary git repo whose "app" is `bun -e` serving one page on the task port)

**Interfaces:**
- Consumes: `Task` (Task 2).
- Produces: `withEnv(task: Task, commit: string, fn: (env: { dir, url, db, junitPath }) => Promise<T>) -> Promise<T>`: refuses when the port is busy or the worktree path exists; `git -C <repo> worktree add --detach /tmp/hstack-bench/<task>-<commit7> <commit>`; runs `setup` in order; spawns `start` in its own process group; polls `ready` (HTTP 2xx–4xx counts as up) every 2 s up to `timeoutSec`; calls `fn`; in `finally` kills the process group, waits until the port is free, runs `teardown`, removes the worktree. `clean()` removes every worktree under `/tmp/hstack-bench/` through `git worktree remove --force` of its owning repo and kills processes whose cwd is under that folder. CLI: `bun bench/env.mjs up <task.json> <commit>` (prints the URL, stays until Ctrl-C) and `bun bench/env.mjs clean`.

- [ ] **Step 1: Write the failing tests:** 'starts the app at a commit, calls fn with its URL, and leaves no worktree or listener'; 'refuses a busy port' (a listener opened by the test on the task port; expect rejection with `port <n> busy` and no worktree created); 'stops the app and removes the worktree when fn throws'; 'clean removes only its own folder' (a file outside `/tmp/hstack-bench/` survives).
- [ ] **Step 2: Run** `bun test tests/bench-env.test.mjs` — expect FAIL.
- [ ] **Step 3: Implement** `withEnv` and `clean` in `bench/env.mjs`. Port check by trying `Bun.listen` on `127.0.0.1:<port>` and closing it. Process group: `Bun.spawn(['sh','-c',start], { detached: true })` and `process.kill(-pid)`.
- [ ] **Step 4: Run** the test — expect PASS.
- [ ] **Step 5: Commit** `git commit -m "Run a task product in a throwaway worktree and clean up after it"`

### Task 4: Scores, verdicts and the grader

**Files:**
- Create: `bench/lib/score.mjs`, `bench/grade.mjs`
- Test: `tests/bench-score.test.mjs`

**Interfaces:**
- Consumes: `readJunit`, `checkId` (Task 1); `withEnv` (Task 3).
- Produces:
  - `results(cases, ids) -> Map<id, 'pass'|'fail'|'precondition'|'error'>`: a failed case whose message contains `PRECONDITION` is `precondition`; an id with no case, or every id when `cases` is null (no JUnit file), is `error`.
  - `score(checks, res) -> { build: number|null, requirement: number|null, featureMissing: number, scored: number }` where `checks = [{ id, bucket: 'build'|'requirement'|'out', severity: 'high'|'medium'|'low' }]`, weights high 3, medium 2, low 1; `precondition` and `error` count as failed; `featureMissing` = share of scored checks with `precondition`; a bucket with no checks gives `null`.
  - `verdict({ ref, bad, base }) -> 'valid'|'weak'|'broken'|'pre-existing'|'absent-at-base'`: ref not `pass` → `broken`; bad `pass` → `weak`; base `fail` → `pre-existing`; base `precondition` → `absent-at-base` (a valid check whose feature is new); base `pass` or missing → `valid` (the bug came in with the task).
  - CLI `bun bench/grade.mjs <task.json> <oracle dir> --at <commit>` writes `<oracle dir>/../grades/<commit>.json` with per-check results and the score (bucket labels from `<oracle dir>/../labels.json`, severities from `manifest.json`); `--validate <ref> <bad> [--base <commit>]` runs all three and writes `validation.json` with each check's verdict.

- [ ] **Step 1: Write the failing tests**

```js
test('weights high 3, medium 2, low 1 and keeps the buckets apart', () => {
  const checks = [{ id: 'a', bucket: 'build', severity: 'high' }, { id: 'b', bucket: 'build', severity: 'low' },
    { id: 'c', bucket: 'requirement', severity: 'medium' }, { id: 'd', bucket: 'out', severity: 'high' }]
  const res = new Map([['a', 'pass'], ['b', 'fail'], ['c', 'precondition'], ['d', 'pass']])
  expect(score(checks, res)).toEqual({ build: 0.75, requirement: 0, featureMissing: 1 / 3, scored: 3 })
})
test('a missing result file makes every check an error', () => {
  expect([...results(null, ['a', 'b']).values()]).toEqual(['error', 'error'])
})
test('a precondition failure at the base is not pre-existing', () => {
  expect(verdict({ ref: 'pass', bad: 'fail', base: 'precondition' })).toBe('absent-at-base')
  expect(verdict({ ref: 'pass', bad: 'fail', base: 'fail' })).toBe('pre-existing')
  expect(verdict({ ref: 'pass', bad: 'fail', base: 'pass' })).toBe('valid')
  expect(verdict({ ref: 'pass', bad: 'pass' })).toBe('weak')
  expect(verdict({ ref: 'fail', bad: 'fail' })).toBe('broken')
})
```

- [ ] **Step 2: Run** `bun test tests/bench-score.test.mjs` — expect FAIL.
- [ ] **Step 3: Implement** the three functions in `bench/lib/score.mjs`, then the CLI in `bench/grade.mjs`, which runs the task's `oracle` command inside `withEnv` with `BENCH_URL` and `BENCH_JUNIT` set and reads the JUnit file it names.
- [ ] **Step 4: Run** the test — expect PASS.
- [ ] **Step 5: Commit** `git commit -m "Score oracle results and give each check its validation verdict"`

### Task 5: Replay for test layers

**Files:**
- Create: `bench/lib/replay.mjs`, `bench/replay.mjs`
- Test: `tests/bench-replay.test.mjs`

**Interfaces:**
- Consumes: `readJunit` (Task 1), `withEnv` (Task 3), `Task.testTitle`.
- Produces:
  - `addedTitles(diff: string, testTitle: string) -> string[]`: titles on `+` lines of files under a test folder (`tests?/`, `__tests__/`, `spec/`, or matching `.spec.`/`.test.`) whose text matches the regex `testTitle` (first capture group = title). Titles added **or changed** count (a changed line appears as `-` then `+`).
  - `caught(cases, excluded: string[]) -> boolean`: true when a case failed whose name contains none of the excluded titles (the "a catch counts only if the failing assertion existed before the fix" rule of 8.1).
  - CLI `bun bench/replay.mjs <task.json> <bug.json> <layer> [--sealed]`, `bug.json = { id, at, patch, fix }`: a worktree at `at`, `git apply -R <patch>`, `BENCH_EXCLUDE` = path of a file with one excluded title per line, run `layers.<layer>` of the task file, read JUnit, print `<id> caught|missed` (sealed) or the failing case names (dev).

- [ ] **Step 1: Write the failing tests**

```js
const vitest = String.raw`^\s*(?:it|test)(?:\.each\([^)]*\))?\(\s*['"\x60](.+?)['"\x60]`
test('takes added and changed test titles, not titles in source files', () => {
  const diff = ['+++ b/tests/unit/a.test.ts', "+  it('rejects a name of only spaces', () => {",
    "-  test('old title', () => {", "+  test('new title', () => {", '+++ b/src/a.ts', "+  it('not a test', () => {"].join('\n')
  expect(addedTitles(diff, vitest)).toEqual(['rejects a name of only spaces', 'new title'])
})
test('a failure of an excluded test is not a catch', () => {
  const cases = [{ name: 'suite > rejects a name of only spaces', status: 'fail', message: '' }, { name: 'other', status: 'pass', message: '' }]
  expect(caught(cases, ['rejects a name of only spaces'])).toBe(false)
  expect(caught([...cases, { name: 'older test', status: 'fail', message: '' }], ['rejects a name of only spaces'])).toBe(true)
})
```

- [ ] **Step 2: Run** `bun test tests/bench-replay.test.mjs` — expect FAIL.
- [ ] **Step 3: Implement** the two functions and the CLI. The task file gains `layers: { <name>: <command> }`; the command must honour `BENCH_EXCLUDE` (the task file for `real-estate` turns it into `--grep-invert` / `-t` options and keeps `--project chromium`, the known trap of 8.1).
- [ ] **Step 4: Run** the test — expect PASS.
- [ ] **Step 5: Commit** `git commit -m "Replay a bug against a test layer without the fix's own tests"`

### Task 6: Replay for agent layers, with a separate judge

**Files:**
- Create: `bench/lib/agent.mjs`, `bench/agent-replay.mjs`
- Test: `tests/bench-agent.test.mjs`

**Interfaces:**
- Consumes: `withEnv` (Task 3, only for the evaluator layer, which needs the app running).
- Produces:
  - `claudeArgs({ prompt, model, settings, pluginDirs, addDirs }) -> string[]`: `['-p', prompt, '--output-format', 'stream-json', '--verbose', '--setting-sources', 'project,local', '--strict-mcp-config', ...]`, `--model` when given, one `--plugin-dir` per plugin, one `--add-dir` per dir, `--settings` when given.
  - `finalText(streamJson: string) -> string` (the `result` field of the last `result` event) and `usage(streamJson: string) -> { input, output, cacheRead, cacheWrite, models: string[] }` (summed over `assistant` events' `message.usage`; `models` = distinct `message.model`).
  - `judgeVerdict(text: string) -> { caught: boolean, quote: string }` from the judge's reply, which must be one JSON object `{"caught": true|false, "quote": "..."}`; anything else throws.
  - CLI `bun bench/agent-replay.mjs <task.json> <bug.json> <layer> [--sealed]`: builds the layer's input (review: the requirement text plus the full task diff, base to task end, with the bug present; audit: the repo at that point; evaluator: the running app plus the requirement), runs the layer brief from `layers.<layer>.brief` with `claude`, then runs the judge, a separate `claude -p` that sees only the bug's sealed description and the layer's findings, and prints `<id> caught|missed` (sealed) or the quote (dev). Records `usage` per run in `<results>/<id>-<layer>.json`.

- [ ] **Step 1: Write the failing tests:** 'claudeArgs loads no user settings and no MCP servers, and one plugin dir per plugin' (assert `--setting-sources project,local` and `--strict-mcp-config` are present and `--plugin-dir` appears once per entry); 'finalText and usage read a stream-json transcript' (a 3-line fixture: system init, assistant with usage 10/5 and model `claude-x`, result 'done'); 'judgeVerdict accepts one JSON object and throws on prose'.
- [ ] **Step 2: Run** `bun test tests/bench-agent.test.mjs` — expect FAIL.
- [ ] **Step 3: Implement** in `bench/lib/agent.mjs` and the CLI in `bench/agent-replay.mjs`. The judge prompt says: "Did any finding describe this defect (same behaviour, same place)? Reply with one JSON object only."
- [ ] **Step 4: Run** the test — expect PASS.
- [ ] **Step 5: Commit** `git commit -m "Replay a bug against review, audit and evaluator, judged blind"`

### Task 7: Arm runner and fixed responder

**Files:**
- Create: `bench/responder-hook.mjs`, `bench/lib/arm.mjs`, `bench/run-arm.mjs`
- Test: `tests/bench-arm.test.mjs`

**Interfaces:**
- Consumes: `claudeArgs`, `finalText`, `usage` (Task 6).
- Produces:
  - `bench/responder-hook.mjs`: a PreToolUse hook (stdin = the hook JSON) for the matcher `AskUserQuestion`. It appends one line `{"t": <iso>, "tool": "AskUserQuestion"}` to the file in env `BENCH_INTERVENTIONS`, and prints `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason": <answer>}}`, where the answer is the fixed text of 9.3: "No more information; decide from the requirement." or, when the question lists options, "Take the first option: <label of the first option>."
  - `armArgs(arm: 'B'|'B-'|'H'|'W', cfg) -> { model, pluginDirs, appendSystemPrompt }`: B: no plugin; B−: `cfg.smallModel`, no plugin, append "Write no tests. Do not run or check your work. Stop after one pass."; H: `cfg.pluginDir`; W: `cfg.weakPluginDir`. All four use the same settings file holding only the responder hook.
  - `countInterventions({ hookLines: number, resumes: Array<'DONE'|'other'>, abandoned: boolean }) -> number` = hook lines + resumes that did not answer DONE + 3 if abandoned.
  - `pluginsAtInit(streamJson: string) -> string[]` (the plugin names in the `system`/`init` event) for the probe.
  - CLI `bun bench/run-arm.mjs <task.json> <arm> <run-no> --input <input.md>`: a worktree at the task base (no app start), `claude` with the input as the prompt, a fresh `--session-id`, then up to 5 resumes with "Continue until the task is done. When it is done, reply exactly DONE."; stops at DONE; abandons after the 5th non-DONE. Before the first prompt it runs a probe turn ("Reply OK.") and refuses to continue unless `pluginsAtInit` is `[]` for B and B− and contains `hstack` for H and W. Writes `<results>/<task>-<arm>-<n>.json` with interventions, usage, models, start and end time, and the product's commit (`git -C <worktree> commit -am` of whatever the agent left, then the worktree is kept until graded).

- [ ] **Step 1: Write the failing tests:** 'the hook denies the question with the fixed answer and logs it' (spawn the hook with a fixture stdin with no options and one with options `[{label:'A'},{label:'B'}]`; assert the reason texts and two lines in the log file); 'a run that stops without DONE counts one intervention per resume' (`countInterventions({ hookLines: 1, resumes: ['other','DONE'], abandoned: false })` is 2, and with `abandoned: true` and 5 `other` resumes is 1 + 5 + 3 = 9); 'B and B- load no plugin, H and W load theirs' (`armArgs`); 'pluginsAtInit reads the init event'.
- [ ] **Step 2: Run** `bun test tests/bench-arm.test.mjs` — expect FAIL.
- [ ] **Step 3: Implement** the hook, `bench/lib/arm.mjs` and the CLI. The settings file is written per run into the results folder: `{"hooks":{"PreToolUse":[{"matcher":"AskUserQuestion","hooks":[{"type":"command","command":"bun <abs path>/bench/responder-hook.mjs"}]}]}}`.
- [ ] **Step 4: Run** the test — expect PASS.
- [ ] **Step 5: Probe with the real CLI:** `bun bench/run-arm.mjs <a throwaway task with an empty repo> B 1 --input <a file saying "Create hello.txt with the word hi">`. Expected: the probe passes (no plugin at init), the run ends with DONE, `hello.txt` is committed in the product, interventions 0, usage and models recorded. Record the output in the commit message.
- [ ] **Step 6: Commit** `git commit -m "Run an arm headless with the fixed responder and count interventions"`

### Task 8: The `real-estate` task file and a check against the p8b pilot

**Files:**
- Create (gitignored): `.evidence/bench/machine.json`, `.evidence/bench/env/real-estate.json` (the task file for every `real-estate` task: the copy `outsourcing-hstack/real-estate` as `repo`, `db` `bench_re`, port 3000, setup = `pnpm install --offline --frozen-lockfile` when the lock changed, write `.env` from the copy's with `DATABASE_URL` on `BENCH_DB`, recreate the database inside the existing Postgres container, `pnpm seed:demo`; start `pnpm dev`; the curl warm-up of `/tmp/bench-8b-scripts/run.sh`; oracle = the oracle folder's Playwright with a JUnit reporter at `BENCH_JUNIT`; teardown = drop `BENCH_DB`; `layers.unit`, `layers.int`, `layers.e2e` with `BENCH_EXCLUDE` and `--project chromium`; `testTitle` as in Task 5).
- Modify (gitignored, test mechanics only, no assertion changes): `.evidence/bench/8b/oracle/*.spec.ts` gain a precondition assertion per check whose message starts with `PRECONDITION:` (the feature's page, form or endpoint exists); `playwright.config.ts` adds the JUnit reporter.
- Create: `bench/README.md` (one screen: the task-file fields, the env variables, the JUnit and `PRECONDITION:` contracts, the commands).

- [ ] **Step 1:** `bun bench/grade.mjs .evidence/bench/env/real-estate.json .evidence/bench/8b/oracle --validate d82f2b0 ce96581 --base d1ea76b` for the d82f2b0 checks, and the same per fix commit as in `validation.md` (reference = fix commit, bad = its parent; 730509b-T1: 730509b and 903f015).
- [ ] **Step 2: Compare** with `.evidence/bench/8b/validation.md` and its addendum. Expected: 17 checks not `weak`/`broken` and 3 `weak` (dd56b84-T3, 24c426f-T4, 24c426f-T5); at the base, 24c426f-T1, T2, T3, T6, T7 and d82f2b0-T1 `pre-existing`, the 9 checks of new features `absent-at-base`; d82f2b0-T4 and dd56b84-T2 settled by their precondition. Any other difference is a bug in the tools or in a precondition, to be fixed before the commit.
- [ ] **Step 3:** `bun bench/env.mjs clean`, then check that no `bench_` database, no listener on port 3000 and no worktree under `/tmp/hstack-bench/` is left, and that `git -C outsourcing-hstack/real-estate status` is clean.
- [ ] **Step 4: Commit** `bench/README.md` and record the comparison in `docs/log.md`: `git commit -m "Check the benchmark tools against the p8b pilot"`
