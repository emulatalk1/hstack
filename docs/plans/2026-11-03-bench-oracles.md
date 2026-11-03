---
type: plan
title: "Oracle preparation plan"
description: "Prereg step 5: check that each external web or desktop task can be served in a container, then, for every external task and every eligible real-estate task, label the oracle sources, rewrite their tests as black-box checks, write the interface sheets the external tasks lack, validate every check including the task-base run, and classify it twice."
status: draft
generated: { by: claude-code/2.1.310, at: "2026-11-03T23:30:00+07:00" }
sources:
  - id: prereg
    resource: /plans/2026-10-27-benchmark-prereg.md
  - id: external
    resource: /plans/2026-11-02-bench-external.md
  - id: tools
    resource: /plans/2026-10-27-bench-tools.md
---

# Oracle Preparation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prereg section 12 step 5 done: for the 24 external tasks (and any replacement ruling 14 brings) and the 15 real-estate tasks other than p8b, an oracle of black-box checks, each validated (7.1) and labelled by two classifiers (6.3), with the interface sheet (5) every task needs, so that step 6 can apply the H1 floor rule and step 7 can seed bugs against the same grader.

**Architecture:** One grader for both sets: `bench/grade.mjs` as it is, with three small changes (a task with no host app, a sealed mode, reuse of a run whose oracle has not changed). A real-estate task grades as before (worktree, `bench_` database, Playwright on the host). An external task's task file names no app; its `oracle` command is `bench/ext.mjs oracle-run`, which builds the commit in Docker from the task's step 4 recipe plus a serve layer and the oracle's runner layer, runs one `--network none` container that starts the app and runs the checks, and copies the JUnit out. Everything that reads oracle content (labels, rewrites, mechanics fixes, sheets, classifications) is a sealed agent run by a new CLI, `bench/oracle.mjs`, which prints only ids, verdicts and counts.

**Tech Stack:** Bun 1.4.4+, `bun:test`, git, Docker 29.9 on this arm64 Mac (7.6 GB, 8 CPUs), the `claude` CLI 2.1.310 through `bench/sealed-agent.mjs`, Playwright (the oracle's own copy, as p8b's).

**Spec:** `docs/plans/2026-10-27-benchmark-prereg.md` sections 4.1, 4.2 (rulings 10, 13, 14), 5, 6, 7.1, 7.2, 8.3, 12 (steps 5–7, 9, 10); the locks `progress/step3-lock.md` and `progress/step4-lock.md` (the superseding section and both addenda); the tools as built: `bench/README.md`.

## Rulings section 6 and 7 leave open (Task 1 registers them in the prereg before any oracle run)

1. **Scope.** External: the 24 tasks of `progress/step4/sample.tsv` and every replacement ruling 14 brings. Real-estate: the 15 tasks of `tasks.json` other than p8b, which is trial-only (section 12, step 10) and whose oracle step 6 reclassifies. The held-out commits (29f4daf, 36d089b, 400f58a, 5b6646d, 89583d2, b5b3cec) are open as oracle sources from the step 3 lock on; they unlock p1–p4, p6a and p8e.
2. **External task ids.** A task keeps its sample id (`s1-01` …) and its folder `<data>/<task>/`. A dropped task's id is retired; a replacement takes the next unused number of its stack (`s2-09`, …). The canary's "first 2 per stack" (7.3) and the cold-setup repo (ruling 13) are read over the kept tasks in sort order.
3. **External input.** `<data>/<task>/input.md` is `# <title>`, a blank line and the body of `ext/tasks/<slug>/issue.json`, verbatim (rule 6 of 4.2: the issue title and body only; the user's decision of 2026-11-02: code in the issue stays). `bench/input-check.mjs` runs on it and its hit count is recorded, not enforced.
4. **The task's recipe.** Each external task builds from the recipe its accepted step 4 check used, the reply named in the step 4 lock's final addendum (s2-02 from `ext/recipes/coder__xum/rounds/1.reply.md`, not `coder__xum/recipe.json`), parsed by a tool into `ext/tasks/<slug>/task-recipe.json`; the reply's SHA-256 must equal the lock's.
5. **Servable (ruling 10's step 5 check).** A serve recipe per repo, `{ layer, start, ready, notes }` (`layer`: Dockerfile lines after the task recipe, installing what serving and driving the app need; `start`: a POSIX sh body that starts every service and the app in the background with a fresh database and migrations applied; `ready`: a sh body that exits 0 once the app's public interface answers; `notes`: base URL, admin credentials, how a window is reached, for the oracle writer), written by a sealed agent that sees only the repo's files at the base, at most 3 rounds for the repo's first task and 1 for each further task, as for recipes. A round passes when, at the base and at the end, one container of the recipe plus `layer`, `--network none`, runs `start` and then `ready` exits 0 within 600 s. Logs at the base are readable and go to the next round; logs at the end hold the PR and are sealed, so a round that serves at the base and not at the end tells the next round only that. An S1 or S2 task with no passing round is `dropped not servable`; one killed for memory is `dropped out of memory` (reported to the user). S3 gets no serve check: its interface is the program or the public API, which its step 4 runs already reach; its serve recipe is `{ layer: [], start: "", ready: "true", notes: "" }`.
6. **Owner of a real-estate hunk.** A hunk `(commit, file, old start)` belongs to the task with the most `task_lines` over the rows of `tasks/<t>.tsv` that match it, a tie going to the earlier task of `tasks.json` (the `bugs.mjs` rule, applied per hunk). A commit inside a task's range (`base..end`, first parent) belongs to that task. A check belongs to the owner of the hunk it checks, so no check enters two oracles.
7. **Real-estate sources (6.1).** Candidate pairs `(commit, owner task)`: each later commit with `tests_changed` `yes` and a hunk a step 5 task owns, and each commit inside a step 5 task's range that changes a test file. Two sealed labellers label every pair on their own (batched by owner task), reading only the commit's subject and diff (`git show <sha>`, `git log -1 <sha>`), the harness progress log and `.evidence/attribution.md`: `fix` or `requirement change` for a later commit; `fix` (restores what the task's earlier commits intended, found after they were written) or `build` for an in-task commit. A pair both call `fix` is a source now. A disagreement goes to the human queue of step 9; a pair the human then calls `fix` is rewritten and validated in a second batch with the same tools, recorded as pending at this plan's lock.
8. **Task (c) check.** Before any label is spent, each real-estate task's end commit is read for data it loads from outside the repo (the prereg's example: `showcase-data/`); a task that needs such data is dropped with the evidence (file and line). Tasks are not dropped early for few hunks (p5, p7c): rule (b) is applied after validation.
9. **Black-box rewrite (6.2).** One sealed writer per real-estate source commit (its in-scope hunks with their owners, its test diff, the files at the fix) and one per external task (the PR's diff `base..end`, the PR's test file paths and fail-to-pass ids from `ext/sealed/<slug>/`, the serve recipe, the files at the end; never the issue). Every test the commit adds or changes that checks an in-scope hunk (external: any source hunk of the PR) becomes one check; a parametrized test is one check over all its parameters; there is no cap per task. One file per check, so a real-estate check can move between oracles; an external writer may group checks into one test target when each target is built separately (a compiled language's test binaries), each check still its own JUnit case. Public interface by kind: a web app through the browser, HTTP and the public API (logging in as a user would); a desktop app through its window (an automation tool driving the app), the files it writes and its command line; a CLI by running the program; a library through its public API only (a separate test target that imports the library by its public paths). A test with no public path stays in the manifest with `interface: none`. Each check asserts its precondition first, with a message starting `PRECONDITION:`. Severity: `high` when the failure loses or exposes data, crashes, or breaks the behaviour the commit is about; `medium` for a wrong result at an edge; `low` for wording, layout or a message.
10. **Validation (7.1).** Real-estate: `grade --validate <fix> --bad <fix>^ [--bad <owner end>, only when the fix is not in it] --base <owner base>`. External: `grade --validate <end> --bad <base>`, with no `--base`: the PR's parent is both the known-bad version and the task base, so a check that fails there is the task itself and the pre-existing bucket does not apply. In the external form (no `--base`), a failed precondition on the known-bad version gives `absent-at-base` (scored, as in the real-estate form): an issue that asks for a new feature fails at its base on the precondition, and `verdict` (a step 2 tool rule) would otherwise call every such check `broken`. With `--base` (real-estate), the known-bad versions hold the feature, so a failed precondition there still gives `broken` and goes to the fixer. A run is reused for another validation when its commit and the SHA-256 of the oracle folder are the same. A commit whose grade throws (no readable JUnit, a setup or start that fails at an old commit) gives `error` for its checks in that validation file, with the stage, and the task goes on.
11. **Mechanics (7.1: "mechanics may be fixed, assertions are never weakened").** A `broken` check gets at most 2 rounds of a sealed fixer that sees the check, the test it came from and its own output in the runs that broke it. A second sealed agent compares the fixed check with the one before and answers `same` or `changed` for what the assertions compare; only `same` is kept, otherwise the check stays `broken`. A weakened check that passes on a bad version reads `weak` and leaves the score anyway.
12. **Pre-existing moves (real-estate).** A `pre-existing` check moves to the task that introduced the bug: the latest earlier task whose end fails the check on its main assertion and whose base passes it or fails its precondition, found in one sweep after every task's first validation: all `pre-existing` checks in one temporary oracle, run once at each distinct boundary of `tasks.json` (bases and ends, newest first). The receiving task's oracle then gets the check, and only its base, end and the moved checks' fix commits are validated again. No such task, or p8b, or a dropped task: recorded as `pre-existing, moved to <task or none>`, not scored in this step.
13. **Keep rules.** A scored check is one whose verdict is `valid` or `absent-at-base` and whose interface is not `none`. Real-estate (b): at least 3 scored checks owned by the task, counted at the lock over the agreed sources (recounted after step 9). External: at least 1 scored check; otherwise `dropped no valid check` and ruling 14.
14. **External interface sheets (5).** One sealed agent per task, seeing the input and the files at the end, never the PR's tests or the oracle, with a stack-neutral brief whose kinds are the real-estate ones plus: menu item, keyboard shortcut, setting label, window title, command, subcommand, flag, environment variable, config key, public API name, output field. The tool deletes any line `bench/input-check.mjs` flags and records the count; the sheet then passes `input-check`. The 16 real-estate sheets of step 3a stand.
15. **Classifiers (6.3, 7.2).** Two sealed agents per task, each seeing only the task's input, its sheet, and the oracle (manifest without `fix_commit`, `origin`, `hunk` or `task`, and the check files, which the writer brief forbids to name their origin test or fix commit): `traceable`, `not traceable` or `partly`, with quotes. Agreed `traceable` → `build`, agreed `not traceable` → `requirement`, agreed `partly` → one sealed split round into two checks with new ids (validated and classified like any check; `partly` again → `requirement`). Disagreements stay unlabelled for step 9. κ, raw agreement and Gwet AC1 are reported per task and pooled per set, with the 7.2 usability test.
16. **Human queue (step 9), stored as data.** Label and classifier disagreements; 10 valid checks per stack and 10 for real-estate for the 7.1 read, and 20 agreed classifications per set for the 7.2 re-rating, each taken by `sortKey(<check id>, seed)` ascending; 2 inputs per set for the section 5 read, likewise.

## Decided by the user (asked with this plan)

- **Docker removal.** Step 5 builds images `bench-ext/<slug>:<sha7>-serve` and `bench-ext/<slug>:<sha7>-grade` and containers `bench-ext-<slug>-serve-<sha7>-<n>` and `bench-ext-<slug>-grade-<sha7>-<n>`. Proposed: each name is recorded in `<data>/<task>/docker.json` when created, and removed (`docker rm`, `docker rmi`, never `-f`) by that exact name as soon as the step that built it ends (a serve check, a validation pass), with the image digests kept, as `--remove-out` does (BuildKit's cache keeps the rebuild cheap); `docker builder prune -f` when the disk estimate is below the floor. Without it, 7.6 GB fills again within a few tasks.
- **Label disagreements.** Proposed: rewrite only agreed `fix` pairs now and leave disagreements to step 9 (a second batch then), so step 5 never waits on a person. The alternative is a pause in the middle of step 5 for the user to settle them.

Expected wall clock: days. External: up to 3 serve rounds per repo, two image builds per task (up to 45 minutes each, mostly cached) and one validation run per commit (up to 30 minutes), one task at a time on Docker. Real-estate: per task, a run at each source commit and at its parent plus the task's base and end, some hundreds of runs, sequential on one port and database (a few minutes each). The two sets run in parallel. Tokens: the prereg estimated 14M; the writer runs per source commit make it larger, and each task records what it took.

## Global Constraints

- Bun only, no new dependency in `bench/`; tests run with `bun test ./tests`, output pristine. `bench/` names no stack, tool or customer; briefs live in `<data>`. `<data>` = `/Users/hbchuc/Documents/programing/vibe-code/hstack/.evidence/bench` (gitignored, in the main checkout; absolute paths from the worktree). Set `HSTACK_BENCH_MACHINE=<data>/machine.json` for every bench command.
- Never write under `/Users/hbchuc/Documents/programing/vibe-code/outsourcing/`. Never touch the databases `real_estate`, `real_estate_test`, `real_estate_hstack`, `real_estate_hstack_test`; real-estate grading uses only `bench_re`. `sh <data>/env/real-estate/pgsnap.sh` before and after each batch of runs; the two lists must be equal.
- **Docker.** Never `prune` (except `docker builder prune -f` when the disk estimate is low), any `volume`, `compose` or `network` command, and never `rm`, `rmi`, `stop` or `kill` on a container or image step 4 or this plan did not create; this plan's own are removed only as the user decides above. No `-v`, `--mount`, `--privileged`, docker socket or host network: files enter and leave a container through `docker cp`. Every serve and grade container is `--network none`; builds have network, as in step 4. Docker stays at 7.6 GB and 8 CPUs.
- **External code.** Only inside `docker build` / `docker run`, never on the host. Clones stay bare; a commit is materialised only by `git archive` or a worktree under `/tmp/hstack-bench/`.
- **Sealing.** Sealed (read only by `bench/` tools and sealed agents): `<data>/heldout/`, `<data>/ext/raw/`, `<data>/ext/sealed/`, every `*.reply.md`, every prompt file a tool writes for an agent, every oracle folder (`manifest.json` and check files), `ext/tasks/*/issue.json`, `<task>/input.md` and `<task>/interface.md` (the step 9 human read is the exception), `<data>/<task>/work/`, `<data>/<task>/logs/`, `classify-*.json`, the source-label replies and the step 9 queue. The implementer, the reviewer and the controller read only `*.run.json`, the tools' printed lines, `validation-*.json` and `grades/*.json` verdicts (ids and results), counts, and the product-side logs of real-estate setup and start; they never `cat`, `grep` or list a sealed file's content. `bun bench/bugs.mjs` runs only with `--usable`, `--fix-tally` or `--at-tally`. The scaffolding of p8b's oracle is copied by a tool, not read; its manifest schema is taken from `bench/lib/score.mjs` and `bench/grade.mjs`. Replies to the user hold only counts and verdicts.
- This session is not the plugin-design session (section 12, step 10), and no agent that writes an oracle, a sheet or a label shares context with it.
- Sealed agents run only through `bench/sealed-agent.mjs`; an agent that writes files gets `--settings` granting `Write` and `Edit` under its own output folder only (the pattern of `briefs/extension-settings.json`), and every other agent replies with JSON and has `Read,Glob,Grep` at most.
- Record each task's usage in `progress/progress.md` as earlier builds did: implementer and reviewer tokens and minutes, the summed usage of every sealed agent of the task (from their `.run.json`), wall clock of the runs. Copy the SDD ledger into `progress/progress.md` before the final review. The plan goes `stable` only after the user approves the build.
- Docs, briefs, logs and commit messages in English.

## Review Focus

1. A sealed run's oracle output reaches the screen (check names, assertion messages), so the controller or a reviewer reads oracle content. Expected: `grade --sealed` prints only the counts line and the verdict line; the oracle command's stdout and stderr go to `<data>/<task>/logs/`. Test: Task 3 'sealed grade prints only counts and writes the oracle output to the log folder'.
2. A cached run is reused after the oracle changed (a fixer round, a split, a move), so a verdict describes an old check. Expected: reuse only when the oracle folder's SHA-256 equals the cached run's. Test: Task 3 'a changed check file makes the run happen again'.
3. A rewritten test lands in two tasks' oracles because its hunk has rows in several task tables. Expected: one owner per hunk. Test: Task 2 'hunkOwners gives each hunk one owner, ties to the earlier task'.
4. An external validation marks its checks `pre-existing` (a `--base <base>` run) or `broken` (a feature-request check fails at the base on its precondition). Expected: no `--base` for external tasks, and there a precondition failure on the known-bad version gives `absent-at-base`. Tests: Task 9 'an external task validates end against base with no base run'; Task 3 'absent at the known-bad version with no base run is absent-at-base'.
5. A fixer round loosens an assertion and the check becomes valid. Expected: only a `same` comparison is kept. Test: Task 9 'a fixed check the comparer calls changed stays broken'.

---

### Task 1: Register the rulings

**Files:**
- Modify: `docs/plans/2026-10-27-benchmark-prereg.md` (new paragraph "Rulings registered before the oracles (step 5)" at the end of section 7.1), `docs/log.md`, `docs/plans/index.md`

- [ ] **Step 1:** Write the prereg paragraph with rulings 1–16 above and the user's decisions, dated, ending "registered before any oracle run; `bench/oracle.mjs` has not run". Add the plan to `docs/plans/index.md` and an **Update** line to `docs/log.md`. Commit `git commit -m "Register the step 5 rulings for oracle preparation before any oracle run"`.

### Task 2: Pure rules

**Files:**
- Create: `bench/lib/oracle.mjs`, `tests/bench-oracle.test.mjs`

**Interfaces:**
- Produces:
  - `hunkOwners(rows: { task, commit, file, old, lines }[], order: string[]) -> Map<string, string>` keyed `` `${commit}\t${file}\t${old}` `` (`old` the start of `old_lines`), ruling 6. `bench/bugs.mjs` keeps its own owner logic.
  - `agreement(a: string[], b: string[], categories: string[]) -> { n, agree, raw, kappa, ac1, top }` (Cohen κ; Gwet AC1 over the given categories, the three of 6.3; `top` = the largest share of one label over both raters), and `usable(stats) -> boolean` = κ ≥ 0.6, or `top` > 0.8 and raw ≥ 0.85 and AC1 ≥ 0.7 (7.2, without the human part).
  - `mergeLabels(c1: { id, label }[], c2) -> { labels: { [id]: 'build'|'requirement' }, partly: string[], disputed: string[] }` (ruling 15).
  - `introducer(boundaries: { task, base, end }[]) -> string|null`: boundaries newest first, `base` and `end` grade results (`pass|fail|precondition|error`); the first task with `end` `fail` and `base` `pass` or `precondition` (ruling 12).
  - `oracleSha(files: { path, text }[]) -> string`: SHA-256 over the sorted paths and contents.
  - `queuePick(ids: string[], n: number, seed: string) -> string[]`: the first `n` by `sortKey(id, seed)` (`bench/lib/ext.mjs`).

- [ ] **Step 1: Write the failing tests:** 'hunkOwners gives each hunk one owner, ties to the earlier task'; 'agreement reproduces p8b' (25 checks, rater 1 traceable 1, partly 2, not 22, rater 2 0, 3, 22, 22 agree: raw 0.88, κ 0.44, AC1 0.87, as prereg §14 reports); 'usable takes the AC1 branch when one label covers more than 80%'; 'mergeLabels keeps agreed labels and lists partly and disputed'; 'introducer skips a task whose base already fails and returns null when none fits'; 'oracleSha changes with one byte of one file and not with file order'; 'queuePick is stable and seed-dependent'.
- [ ] **Step 2: Run** `bun test tests/bench-oracle.test.mjs` — expect FAIL (module not found).
- [ ] **Step 3: Implement** in `bench/lib/oracle.mjs`.
- [ ] **Step 4: Run** `bun test ./tests` — all pass, output pristine. Commit `git commit -m "Add the pure rules of oracle preparation: hunk owners, rater agreement, label merge, bug introducer"`.

### Task 3: Grade without a host app, sealed, with reuse

**Files:**
- Modify: `bench/lib/task.mjs`, `bench/lib/score.mjs`, `bench/grade.mjs`, `bench/README.md`, `tests/bench-env.test.mjs`, `tests/bench-task.test.mjs`, `tests/bench-score.test.mjs`

**Interfaces:**
- Consumes: `oracleSha` (Task 2), `withEnv(..., { start: false })`.
- Produces: `verdict` with no `base` gives `absent-at-base` when the ref passes and every bad is `fail` or `precondition` with at least one `precondition` (ruling 10); with a `base` it is unchanged; task field `start: null` with `ready: null` (no host app; `withEnv` gets `start: false`); `grade ... --sealed` (the oracle command's stdout and stderr to `<task dir>/logs/<sha7>-<n>.log`, setup and start logs as today; stdout only the counts line and, with `--validate`, the verdict line); `grade ... --reuse` (a commit whose `grades/<sha7>.json` records the same `oracleSha` and `junit` `ok` is not run again; every grade file records `oracleSha`, over the oracle folder without `node_modules`).

- [ ] **Step 1: Write the failing tests:** 'absent at the known-bad version with no base run is absent-at-base'; 'a precondition failure on a bad version with a base run is still broken'; 'a task with start null runs setup, oracle and teardown and no app'; 'start null needs ready null'; 'sealed grade prints only counts and writes the oracle output to the log folder'; 'reuse skips a run with the same oracle and commit'; 'a changed check file makes the run happen again'.
- [ ] **Step 2: Run** `bun test tests/bench-env.test.mjs tests/bench-task.test.mjs tests/bench-score.test.mjs` — expect FAIL.
- [ ] **Step 3: Implement**; README lines.
- [ ] **Step 4: Run** `bun test ./tests` — all pass. Commit `git commit -m "Grade a task with no host app, in a sealed mode, reusing a run of an unchanged oracle"`.

### Task 4: External task files and the serve check

**Files:**
- Modify: `bench/ext.mjs` (commands `task-env`, `serve`; `sample` keeps ids), `bench/lib/ext.mjs`, `bench/README.md`, `tests/bench-ext-check.test.mjs`, `tests/bench-ext.test.mjs`
- Create (gitignored): `<data>/ext/briefs/serve.md`, `<data>/ext/serve/<key>/{serve.json, rounds.tsv, rounds/}`, `<data>/ext/tasks/<slug>/task-recipe.json`, `<data>/env/<task>.json`, `<data>/<task>/{input.md, docker.json}`

**Interfaces:**
- Consumes: `parseRecipe`, the build and run code of `check` (extract a shared `build(...)` and `runContainer(...)` rather than copying), `sealedAgent`.
- Produces:
  - `bun bench/ext.mjs task-env <groups.json> <task> (--reply <reply file> --sha <sha256> | --from-meta)`: writes `task-recipe.json` (refuses a reply whose SHA differs; `--from-meta`, for a replacement, takes the repo's reply whose parsed recipe's SHA-256 equals `meta.json` `recipeSha`), `input.md` (ruling 3; prints `input-check hits=<n>`), and `env/<task>.json` = `{ name: <task>, repo: <the bare clone>, db: null, port: <49152 + index>, start: null, ready: null, setup: [], teardown: [], oracle: "bun <abs bench>/ext.mjs oracle-run <task>", junit: ".bench-junit.xml", timeoutSec: 7800 }` (two builds of up to 45 minutes each, cold after a prune, 10 minutes to ready and 30 to run, since `grade` bounds the whole oracle command by it).
  - `bun bench/ext.mjs serve <groups.json> <task>`: serve rounds (ruling 5) with `briefs/serve.md`; stdout `<task> servable rounds=<k>` or `<task> dropped <not servable|out of memory>` or `<task> error <stage>`; a drop appends `dropped` for the task's id to `walk.tsv`; base-side logs go to `ext/serve/<key>/rounds/`, end-side ones to `ext/sealed/<slug>/logs/`, and each image the check built is removed by exact name after it, digests kept (as decided). `serve.json` = `{ layer: string[], start, ready, notes, briefSha }`.
  - `sample` keeps the ids of the live `<data>/ext/sample.tsv` (else `progress/step4/sample.tsv`) for rows still sampled and numbers a new row after its stack's highest id (ruling 2).
  - `<data>/<task>/docker.json` = `{ images: [{ name, id }], containers: [name] }`, appended at each creation.

- [ ] **Step 1: Write `briefs/serve.md`** from ruling 5 (no repo, stack or PR named; names the container's memory and CPUs, `--network none`, the 600 s limit, the JSON shape, and that `notes` is read by someone who writes checks against the served app).
- [ ] **Step 2: Write the failing tests** (the step 4 fixture repo, a fixed hand-written serve JSON whose `start` runs `busybox httpd`; Docker tests gated by `BENCH_EXT_DOCKER=1`): 'task-env refuses a reply whose hash differs'; 'task-env --from-meta finds the reply by recipeSha'; 'task-env writes input.md verbatim and counts input-check hits'; 'serve passes when ready answers at base and end'; 'serve drops a task whose ready never answers, appending dropped to walk.tsv'; 'serve containers use no network'; 'sample keeps ids and numbers a replacement after the highest'.
- [ ] **Step 3: Run** `BENCH_EXT_DOCKER=1 bun test tests/bench-ext-check.test.mjs tests/bench-ext.test.mjs` — expect FAIL.
- [ ] **Step 4: Implement**; README lines; `bun test ./tests` all pass; commit `git commit -m "Write external task files and check that an external app can be served in a container"`.

### Task 5: Grade an external commit in Docker

**Files:**
- Modify: `bench/ext.mjs` (command `oracle-run`), `bench/README.md`, `tests/bench-ext-check.test.mjs`

**Interfaces:**
- Consumes: Task 3 (`start: null`), Task 4 (`task-recipe.json`, `serve.json`, `docker.json`).
- Produces: `bun bench/ext.mjs oracle-run <task>`, called by `grade` with `BENCH_DIR`, `BENCH_ORACLE`, `BENCH_JUNIT`: builds `bench-ext/<slug>:<sha7>-serve` from `git archive HEAD` of `BENCH_DIR` with the task recipe's Dockerfile and the serve `layer` (its log readable in `<data>/<task>/build/` at the base, sealed in `ext/sealed/<slug>/logs/` at any other commit), then `bench-ext/<slug>:<sha7>-grade` FROM it with the oracle's `runner.json` `layer` (sealed log; each build 45 minutes, the step 4 build rules and disk floor), creates `bench-ext-<slug>-grade-<sha7>-<n>` with `--network none` and the static command `sh /oracle/.bench-grade.sh`, `docker cp`s `BENCH_ORACLE` to `/oracle` and the grade script (first an empty JUnit at `/out/junit.xml`, so a run that never gets ready still has results and every check reads `error`; then `start`, wait for `ready` up to 600 s, then `runner.json` `run`, which rewrites `/out/junit.xml`), `docker start -a` (30 minutes), copies the JUnit to `BENCH_JUNIT`; on its own run limit, or on SIGTERM from `grade`, it `docker kill`s the container it named, as `check` does. The container's output goes to stderr, which a sealed grade logs; the one readable line it adds to `<data>/<task>/build/readiness.tsv` is `<sha7> ready|not ready|timeout`. `runner.json` = `{ layer: string[], run: string }`.

- [ ] **Step 1: Write the failing tests** (fixture: the served busybox app and an oracle of two sh checks writing JUnit, one passing at the end only): 'grade validates a fixture check valid with end against base'; 'a run that never gets ready gives every check error and the validation is still written'; 'the grade container uses no network and is recorded in docker.json'; 'removal deletes only names docker.json records' (a decoy `bench-ext-other` survives).
- [ ] **Step 2: Run** `BENCH_EXT_DOCKER=1 bun test tests/bench-ext-check.test.mjs` — expect FAIL.
- [ ] **Step 3: Implement**, with `bun bench/ext.mjs remove <task>` doing the removal the user decided; README lines; `bun test ./tests` all pass; record the fixture's Docker leftovers in `progress/progress.md`; commit `git commit -m "Grade an external commit in one offline container built from its recipe, serve layer and oracle runner"`.

### Task 6: Serve the 16 web and desktop tasks

**Files:**
- Create (gitignored): the records of Task 4 for every external task
- Modify: `progress/progress.md`; create `progress/step5/sample.tsv` and `walk.tsv` (copies of the live `<data>/ext/` files), only if a task is dropped. The step 4 copies are locked and never edited.

- [ ] **Step 1:** `task-env` for all 24 tasks, with the reply and hash of each from the step 4 lock's final addendum table (typed into `<data>/ext/step5-recipes.tsv`: `task slug reply sha256`); record the 24 `input-check` hit counts.
- [ ] **Step 2:** `serve` for s1-01 … s2-08 in id order, one at a time, `pgsnap` equal around the batch; write each S3 task's empty `serve.json`.
- [ ] **Step 3:** For each drop: `walk` the stack (ruling 14), then `sample`, `task-env --from-meta` and `serve` for the replacement, until each stack has 8 kept tasks; a stack whose list runs out: stop and ask. Record drops, replacements, rounds and usage.

### Task 7: Real-estate sources

**Files:**
- Modify: `bench/oracle.mjs` (create; command `label`), `bench/README.md`, `tests/bench-oracle.test.mjs`
- Create (gitignored): `<data>/briefs/label.md`, `<data>/briefs/label-settings.json`, `<data>/sources/{pairs.tsv, label-<r>-<task>.reply.md, labels.tsv}`

**Interfaces:**
- Consumes: `hunkOwners`, `sealedAgent`.
- Produces: `bun bench/oracle.mjs pairs` writes `pairs.tsv` (`commit task kind hunks`, `kind` `later` or `in-task`, ruling 7) and prints counts per task; `bun bench/oracle.mjs label <r> <task>` runs labeller `r` (1 or 2) on that task's pairs, reply = a JSON array `[{ commit, label }]`; `bun bench/oracle.mjs labels` merges into `labels.tsv` (`commit task kind l1 l2 source`, `source` `yes`, `no` or `step9`) and prints per task: pairs, agreed fix, agreed not fix, disputed.

- [ ] **Step 1: (c) check (ruling 8).** For each of the 15 tasks, read the end commit's loader and seed code for paths outside the repo; record per task `needs outside data: no` or `yes, <file>:<line>` in `progress/progress.md`; drop the `yes` tasks.
- [ ] **Step 2: Write `label.md`** from rulings 6–7 and `label-settings.json` (`git show <sha>` and `git log -1 <sha>` on the real-estate repo, `Read` on `outsourcing-hstack/progress/` and `.evidence/attribution.md`; no write).
- [ ] **Step 3: Write the failing tests:** 'pairs lists a later commit only with tests changed and a hunk a step 5 task owns'; 'pairs lists in-task commits that change a test file'; 'labels marks agreed fix as a source and a disagreement as step9'; 'label prints no reply text' (a fake agent's reply with a sentinel string does not reach stdout).
- [ ] **Step 4: Run** `bun test tests/bench-oracle.test.mjs` — FAIL; implement; `bun test ./tests` pass; commit `git commit -m "Pair real-estate source commits with their owner tasks and label them twice"`.
- [ ] **Step 5: Run** `pairs`, then `label 1` and `label 2` for every kept task, then `labels`; record counts and usage.

### Task 8: Write the oracles

**Files:**
- Modify: `bench/oracle.mjs` (command `write`), `bench/README.md`, `tests/bench-oracle.test.mjs`
- Create (gitignored): `<data>/briefs/oracle-re.md`, `<data>/ext/briefs/oracle.md`, their settings files, `<data>/oracle-scaffold/` (p8b's `playwright.config.ts` and `package.json` copied by the tool, one `bun install`), `<data>/<task>/oracle/`, `<data>/<task>/work/`

**Interfaces:**
- Produces: `bun bench/oracle.mjs write <commit|task>`: for a real-estate source commit, one writer run (ruling 9) into `work/<sha7>/`, then each check file (one per check, named by its id, importing only the test runner and the scaffold; every real-estate oracle folder holds the scaffold's `playwright.config.ts` and `package.json` and a `node_modules` symlink to `<data>/oracle-scaffold/node_modules`, which `oracle.sh` runs) and its manifest entry are moved into the oracle of the task that owns its hunk; for an external task, one writer into `work/write/`, then into `<task>/oracle/` with `runner.json`. Manifest entry = `{ id: "<sha7>-T<n>", fix_commit, task, hunk, origin, behaviour, interface, severity }` (`origin` the test it came from; `interface` `none` or the kind). Prints per run: checks written, per task, `interface: none`, by severity.

- [ ] **Step 1: Write the two briefs** from ruling 9 (the real-estate one also names the scaffold, the login through the public API and the `bench_re` app at `BASE_URL`; the external one names `runner.json`, `notes`, and that the checks run inside the app's container; both forbid a check file to name the test it came from or the fix commit).
- [ ] **Step 2: Write the failing tests:** 'write moves each check into the oracle of its hunk's owner'; 'write refuses a manifest entry with no severity or a duplicate id'; 'write prints no check name or behaviour'.
- [ ] **Step 3: Run** — FAIL; implement; `bun test ./tests` pass; commit `git commit -m "Rewrite source tests as black-box checks by sealed writers, one oracle per owner task"`.
- [ ] **Step 4: Run** `write` for every agreed real-estate source and every kept external task; record counts and usage.

### Task 9: Validate, fix mechanics, move pre-existing checks

**Files:**
- Modify: `bench/oracle.mjs` (command `validate`), `bench/README.md`, `tests/bench-oracle.test.mjs`
- Create (gitignored): `<data>/briefs/fix.md`, `<data>/briefs/compare.md`, `<data>/<task>/{validation-*.json, grades/, logs/, moves.json}`

**Interfaces:**
- Consumes: Tasks 2, 3, 5; `bun bench/grade.mjs ... --sealed --reuse`.
- Produces: `bun bench/oracle.mjs validate <task>`: pass 1, the validations of ruling 10 (real-estate: one per source commit with checks in the task; external: one); then one fixer round with its comparison for every `broken` check at once (ruling 11) and pass 2; a second round and pass 3; at most three passes, since each change of the oracle folder ends the reuse of its runs. `bun bench/oracle.mjs sweep` (real-estate): ruling 12's boundary sweep, the moves, and the receiving tasks' partial validation. External images are removed after each pass (as decided). A `grade` that exits non-zero for a commit is recorded as `error` for that commit's checks in `validation-<sha7>.json` (ids and the stage), and the task goes on. Prints per task: checks, valid, weak, broken, error, pre-existing (moved, not scored), absent-at-base, `interface: none`, fixer rounds, comparisons refused; and `<task> dropped no valid check` for an external task with none (ruling 13), appending `dropped` to `walk.tsv`.

- [ ] **Step 1: Write the failing tests** (fake `grade` and fake agents): 'an external task validates end against base with no base run'; 'a real-estate fix inside the task gets no end as a bad version'; 'a fixed check the comparer calls changed stays broken'; 'sweep runs each distinct boundary once and moves a pre-existing check to its introducer'; 'a fixer round covers every broken check before the next pass'; 'a grade that throws records error for that commit's checks and the task goes on'; 'an external task with no valid check is dropped'.
- [ ] **Step 2: Run** — FAIL; implement; `bun test ./tests` pass; commit `git commit -m "Validate each oracle check, fix only its mechanics, and move pre-existing checks to the task that introduced them"`.
- [ ] **Step 3: Run** `validate` on every task, then `sweep`: the real-estate lane (one task at a time on `bench_re`, `pgsnap` equal around each batch) and the external lane (one task at a time on Docker) in parallel. An external drop goes back to Task 6 Step 3 and then Tasks 8–9 for its replacement. Record counts and usage.

### Task 10: External interface sheets

**Files:**
- Modify: `bench/oracle.mjs` (command `sheet`), `bench/README.md`, `tests/bench-oracle.test.mjs`
- Create (gitignored): `<data>/ext/briefs/interface.md`, `<data>/<task>/interface.md`

**Interfaces:**
- Produces: `bun bench/oracle.mjs sheet <task>`: one sealed agent (ruling 14) at the end commit, `--tools Read,Glob,Grep`, the reply the sheet; lines `input-check` flags are deleted; prints `<task> sheet names=<n> deleted=<m> input-check=PASS`.

- [ ] **Step 1: Write the brief** (the real-estate brief's rules, stack-neutral, with ruling 14's kinds).
- [ ] **Step 2: Write the failing tests:** 'sheet deletes flagged lines and then passes input-check'; 'sheet prints no name'.
- [ ] **Step 3: Run** — FAIL; implement; `bun test ./tests` pass; commit `git commit -m "Write the external interface sheets from the end product, without the oracle"`.
- [ ] **Step 4: Run** `sheet` for every kept external task; record counts and usage.

### Task 11: Two classifiers

**Files:**
- Modify: `bench/oracle.mjs` (commands `classify`, `split`), `bench/README.md`, `tests/bench-oracle.test.mjs`
- Create (gitignored): `<data>/briefs/classify.md`, `<data>/briefs/split.md`, `<data>/<task>/{classify-1.json, classify-2.json, labels.json, agreement.json}`, `<data>/step9/`

**Interfaces:**
- Consumes: `agreement`, `usable`, `mergeLabels`, `queuePick`.
- Produces: `bun bench/oracle.mjs classify <task>` (both raters, then `labels.json` of agreed labels and `agreement.json`; prints per task: checks classified, build, requirement, partly, disputed, κ, raw, AC1); `bun bench/oracle.mjs split <task>` (one splitter run per agreed `partly` check, then `validate` and `classify` of the new checks only); `bun bench/oracle.mjs queue` (writes the step 9 queue of ruling 16 and prints its counts, with pooled agreement per set and `usable` yes or no). A set that is not `usable`: stop and tell the user; 7.2 then asks for a new classification rule, a prereg change.

- [ ] **Step 1: Write the briefs** (6.3 verbatim rules, the sheet clause, the reply shape `[{ id, label, quotes, steps }]`).
- [ ] **Step 2: Write the failing tests:** 'classify gives the raters the manifest without fix_commit, origin, hunk or task'; 'agreed partly goes to split and disputed stays unlabelled'; 'queue picks by seed and prints only counts'.
- [ ] **Step 3: Run** — FAIL; implement; `bun test ./tests` pass; commit `git commit -m "Classify every check twice, split agreed partly checks, and queue the human step"`.
- [ ] **Step 4: Run** `classify` and `split` for every kept task, then `queue`; record counts and usage.

### Task 12: Lock

**Files:**
- Create: `progress/step5-lock.md`
- Modify: `docs/log.md`, `progress/progress.md`, `progress/step5/sample.tsv` and `walk.tsv` if a task was dropped

- [ ] **Step 1: Check:** every kept task has an oracle, validations and two classifications; every external task's grade images and containers are gone as decided; `git status --short bench` empty.
- [ ] **Step 2: Write** `progress/step5-lock.md`: per task, sources considered, labelled fix, disputed, checks written, `interface: none`, valid, weak, broken, error, pre-existing (moved to), absent-at-base, build, requirement, disputed classifications, κ / raw / AC1; per set the pooled agreement and the median valid traceable checks per task (step 6 needs it); tasks dropped with reasons and their replacements, the new cold-setup repos and canary tasks; real-estate tasks meeting rule (b) now and the ones waiting on step 9; the step 9 queue counts; `shasum -a 256` of every oracle file, manifest, `labels.json`, `validation-*.json`, `classify-*.json`, sheet, input, brief, settings file, `serve.json`, `task-recipe.json`, `env/<task>.json`, `sources/*` and step 9 file (paths relative to `<data>`); the `bench/` commit; Docker left.
- [ ] **Step 3: Record** usage in `progress/progress.md`; **Creation** line in `docs/log.md`; commit `git commit -m "Lock the oracles of step 5 with their validations, classifications and hashes"`.

## Known limits

- The serve recipe is written from the base's files; a product that changes how it starts (new service, new setting) can fail to serve at a later commit, which reads as `error` for every check of that run.
- Desktop checks drive a window under a virtual display in a Linux container; an app whose behaviour differs on macOS or Windows is checked only on Linux.
- A library check is a separate test target; a crate or package whose public API cannot be compiled offline in the image falls to `interface: none`.
- The comparer guards mechanics fixes with one agent's judgement; the human 7.1 sample is the second guard.
- Real-estate grades at old commits run that commit's own setup; a commit whose setup no longer runs on this machine makes its checks `broken`.
- Pairs disputed by the labellers are rewritten only after step 9, so rule (b) counts at this lock are lower bounds.
- External input is the issue as written, links and screenshots included; a builder with no network cannot open them.

## Not in this plan

Reclassifying p8b and the H1 floor rule (step 6); seeded bugs (step 7, which reuses `grade` and `oracle-run`); the canary (step 8); every human read and settlement (step 9).
