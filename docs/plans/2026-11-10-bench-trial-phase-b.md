---
type: plan
title: "Trial run plan, Phase B"
description: "Prereg step 11, Phase B: the plugin commit the designer handed over (hstack, 653af83, no dependencies) recorded in arms.json and probed in each trial box, the trial of arms H and B with k = 1 on s2-01, s3-02, p8b and p6c, σ_d and the N rule, more walk if N asks, and the step 11 lock. Adds the commit, its dependencies and the CLI of the day to the Phase A plan; changes no registered rule."
status: draft
generated: { by: claude-code/2.1.318, at: "2026-11-10T22:24:19+07:00" }
verified:
  - { by: claude-code-advisor/2.1.318, at: "2026-11-10T23:13:47+07:00" }
sources:
  - id: prereg
    resource: /plans/2026-10-27-benchmark-prereg.md
  - id: trial
    resource: /plans/2026-11-08-bench-trial.md
---

# Trial Run Implementation Plan, Phase B

> **For agentic workers:** every task here is the controller's (real data, the token, the box). No implementer or reviewer subagent gets the token, `<data>` write paths or real data (Phase A ruling 2 of the controller). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prereg section 12 step 11, Phase B, as the trial run plan (`docs/plans/2026-11-08-bench-trial.md`) sketched it (Tasks B1–B4) and registered it (prereg section 12, "Applied at step 11", rulings 1–14 and decisions 1–6): the plugin in `arms.json` and in the box, the trial (arms H and B, k = 1, 4 tasks), σ_d and N measured, the walk if N asks, and `progress/step11-lock.md`. Nothing is analysed.

**What this plan adds** (ruling 1: "adds only the plugin's commit, its dependencies and the CLI version of that day"):

| item | value |
|---|---|
| plugin | `hstack`, this repository (shared `.git`), branch `plugin-design` |
| commit | `653af835fd613e3eb25feb48e4ccc9bfb534ae6e` |
| paths | `.claude-plugin`, `agents`, `hooks`, `scripts`, `skills` (`commands`, `bin` and `.mcp.json` do not exist at this commit) |
| dependencies | none |
| CLI | 2.1.318 on the host (`claude --version`, 2026-11-10) and in `arms.json` (`arm/claude-2.1.318`): unchanged since Phase A, so no `cli` change is recorded |
| models | `claude-opus-5-5` (H and B), `claude-sonnet-5-5` (the small model), as `arms.json` holds them |

**Spec:** the trial run plan's "Phase B", rulings 1, 2, 3, 6, 8, 10–13 and decisions 1–4; prereg section 12 ("Applied at step 11", "Decided by the user on 2026-11-10"), 10.2, 11; `progress/step11a-lock.md` (open points, known limits, the controller's rulings 14 and 15); `bench/README.md`.

## What is reused

Everything Phase A built, unchanged: `loadArms` and the `plugins.H` entry shape (`bench/run-arm.mjs`), `pluginExport` with its allowlist, refusal and `sha256` (`bench/box.mjs`), the box with the proxy (form A), the probe of every run (`probeOk`: plugins at init equal the arm's, no web tool, no `AskUserQuestion`), `bench/trial.mjs run|report` with its gates (`trial/tasks.txt`, cold, walked, `env/box/<task>.json`, step ids) and its floor (`trial/floor.json`, so the canary's 24 earlier records of s2-01 and s3-02 do not count), the grade through `env/box/<task>.json`, `stick hash|compare`, and Task 11 step 3's probe script (`<data>/logs/step11/plugin-probe.mjs`), copied and re-pointed. Missing, and made here: the `arms.json` entry, `trial/tasks.txt`, the per-task H probe, the runs, the report, the lock.

## Facts the controller found at the handover

The controller listed the export's files, read `hooks/hooks.json` and counted runtime names in the skills; it wrote no plugin content. This plan sits in the repository the designer works in, so what bears on the plugin's design is not written here: it is in `<data>/logs/step11b/handover.md` (gitignored), for the user and the lock's controller only (decision 4).

- The export holds 21 files, none under `bench`, `progress`, `docs`, `tests`, `fixtures` or `.evidence`; the commit's full tree also holds those folders, and the allowlist leaves them out.
- One fact about what the export needs at run time against what the trial boxes hold: see `handover.md`. The box adds nothing for any arm.
- The designer's own e2e ran under `--permission-mode dontAsk`; every box turn runs under `bypassPermissions` (`bench/run-arm.mjs`). B1's probes are the first test of the plugin in the box's mode.

## Decisions for the user (asked with this plan)

1. **The three deferred minors of the Phase A lock** (open point: "before Phase B's first run, the Phase B follow-on plan must fix, or explicitly accept"). `listens()` lives in `bench/box.mjs` and the P OOM in `oracle-run` (`bench/ext.mjs`); ruling 1 makes any change to the box or `oracle-run` after Task 12 repeat the whole regrade (about 75 grades, three full runs in Phase A). **(a) Accept all three (recommended):**
   - `listens()` has no retry on a transient Docker error: a false negative kills the box, the run ends `machine killed` (`bench/run-arm.mjs`), and by step 8 ruling 11 it takes the next number. Cost: one rerun of that arm (up to 8 hours on a real-estate task). Every such run is counted in the lock.
   - A P OOM in split mode reads as O's timeout: a trial grade of p8b or p6c whose result is `noresult` or a timeout is told to the user (task, arm, kind, exit state; no check id) before the lock, and listed in it.
   - `--extra-round` grants one round per invocation: Phase B runs no rebuild round unless B3 walks; there it is invoked at most once per task and each call is counted in the ledger.
   (b) Fix them first: each fix with its test, then the regrade of Phase A's Task 12 again, before B2.
2. **The fact in `handover.md`.** Decision 4 (a) bars the controller from passing it to the designer, and keeping it out of this repository keeps that true after a merge. If you want the designer to know before the trial, that is a change of decision 4 only you can make; the plugin may then change before B2, and B1 starts again with the new commit. **(a) Recommended:** run as handed over; B4's lock (`progress/step11-lock.md`) names `logs/step11b/handover.md` by path only; its content is stated in the step 12 lock, after the plugin is locked.
3. **A pin for the commit.** `653af83` is reachable only through the branch `plugin-design`; if the designer rewrites it before step 12 locks the plugin, the commit `arms.json` records can be lost to `git gc`. **(a) Recommended:** the controller writes `refs/bench/plugins/hstack-653af83` in the shared `.git` (a ref only, no branch, nothing pushed). (b) No pin; the designer is asked, through you, not to rewrite the branch.

**Needs you:** approve this plan before B1's probes (they spend the token); answer decisions 1–3; and, if the token of 2026-11-09 no longer works (B1 step 4 shows it as a probe failure), a new one as decision 3 (a).

## Rulings of the controller for Phase B (none changes a registered rule)

1. **Task order:** s2-01, s3-02, p8b, p6c: external first (the sketch's B2), then the real-estate pair in decision 2's order. Within a task, `trial.mjs` orders the arms by ruling 12.
2. **A failed probe stops the trial for the user.** It costs one box and no product; its reason goes to the user (it is a run reason, not a score) and never to the designer. A probe of an H box is the same function `run-arm` calls before every run, so a run whose own probe fails is refused the same way.
3. **What reaches the user for the designer** is exactly the per-task and per-arm line of `trial.mjs report` (build, requirement, passed, tokens with cache apart, minutes, interventions, end), and only once the report is judged; nothing during the trial. σ_d and N are not in decision 4's list and are not relayed.

## Global Constraints

As the trial run plan's, with these names: build on `bench-step11b` from `main` (5211cfb); `<data>` = `/Users/hbchuc/Documents/programing/vibe-code/hstack/.evidence/bench`; logs of this phase in `<data>/logs/step11b/`; every full test run `bun test ./tests 2>&1 | tee <data>/logs/step11b/tests-<n>.out`. Sealing: the controller reads count lines, report lines and record fields only; no transcript of an arm (`results/*/*.jsonl`), no product, no grade output under `logs/`, no oracle or check. Docker: removal only by recorded names, never `-f`, never `prune` but `docker builder prune -f`. pgsnap before and after every real-estate lane. This session is not the plugin-design session: it takes no design request and writes no plugin content.

---

### Task B1: The plugin in the box

**Files:**
- Modify (gitignored): `<data>/arms.json` (`plugins.H`)
- Create (gitignored): `<data>/trial/tasks.txt`, `<data>/logs/step11b/arms-before.json`, `<data>/logs/step11b/plugin-export.mjs`, `<data>/logs/step11b/plugin-probe-h.mjs`, `<data>/logs/step11b/b1.out`

- [x] **Step 1: The export and its sha256.** `plugin-export.mjs` calls `pluginExport({ repo: <main checkout>, commit: 653af835…, paths, out })` with `out` in the session scratchpad (outside `<data>`), prints `files <n> sha256 <hex>`, and removes `out`. Expected: files 21, no refusal.
- [x] **Step 2: Record it (ruling 2).** Copy `arms.json` to `logs/step11b/arms-before.json`; set `plugins.H` to `[{ "name": "hstack", "repo": "../..", "commit": "653af835fd613e3eb25feb48e4ccc9bfb534ae6e", "paths": [".claude-plugin", "agents", "hooks", "scripts", "skills"], "sha256": "<step 1>" }]` (`repo` resolves from `arms.json`'s folder to the main checkout, whose `.git` holds the commit); `plugins.W` stays `[]`. Check: `loadArms` accepts the file and `pluginExport` of the loaded entry gives the recorded `sha256` (the check `run-arm` makes before every run).
- [x] **Step 3: The trial's tasks (decisions 1 and 2).** Write `trial/tasks.txt`: `s2-01`, `s3-02`, `p8b`, `p6c`, one per line. Check each passes `trial.mjs`'s gate: in the file, `cold_setup` not `yes`, not in `step11/walked.txt`, `env/box/<task>.json` present, step ids > 0 (s2-01 3, s3-02 5, p8b 12, p6c 8 at the handover).
- [ ] **Step 4: H's probe on each trial box.** `plugin-probe-h.mjs <task>` (Task 11 step 3's script, pointed at this checkout, the set's `turnTimeoutSec`, the plugin from `arms.json` through `pluginExport`): one H box per task, one `Reply OK.` turn under `bypassPermissions` with `WEB_OFF` disallowed and a turn limit of 1800 s (a controller parameter of this probe only; the runs keep the set's `turnTimeoutSec`), so a hook that keeps the turn from ending costs half an hour, not 4 or 8 hours, then `probeOk('H', initInfo(out), ['hstack'], [])`. Prints per task `turn exit <c> plugins <list> web <n> askUser <0|1> probe <ok|reason>` to `b1.out`; nothing else of the turn is read. Expected: exit 0, plugins `["hstack"]`, web 0, askUser 0, probe ok, on all 4. pgsnap around p8b and p6c. Remove the recorded names. Any other line stops for the user (ruling 2 of this plan).
- [ ] **Step 5:** Record in `progress/progress.md` ("Step 11 Phase B"): the entry, the sha256, the four probe lines. Commit `git commit -m "Record the hstack plugin for arm H and probe it in each trial box"`.

### Task B2: The trial

**Files:**
- Create (gitignored): `<data>/trial/` (written by `trial.mjs`), `<data>/logs/step11b/trial-<task>.out`, `report.out`

- [ ] **Step 1:** Per task, in this plan's order: `HSTACK_BENCH_MACHINE=<data>/machine.json bun bench/trial.mjs run <task> 2>&1 | tee <data>/logs/step11b/trial-<task>.out` (resumes on rerun). pgsnap before and after p8b and p6c.
- [ ] **Step 2: After each task:** the count lines only. A run ended by the machine takes the next number (step 8 ruling 11) and is counted; a `noresult` or timeout grade on p8b or p6c is told to the user (decision 1 (a)); a refusal or anything else stops for the user.
- [ ] **Step 3:** `bun bench/trial.mjs report | tee <data>/logs/step11b/report.out`. Expected: no `not judged`; the last line `trial sigma_d=<s> sigma_d_ext=<s> n=4 N=<N> h1_n=24 walk=<yes|no>`.
- [ ] **Step 4: To the designer, through the user** (decision 4 (a), ruling 3 of this plan): the 8 per-task and per-arm lines of `report.out` (build, requirement, passed, tokens, cache, minutes, interventions, end) and nothing else.
- [ ] **Step 5:** Record in `progress/progress.md`. Commit `git commit -m "Run the step 11 trial and record its report"`.

### Task B3: More walk if N asks

- [ ] **Step 1:** If `walk=no`, skip to B4. If `walk=yes`, Phase A's Task 13 with `ceil(N / 3)` kept tasks with step ids per stack, under the same rulings (10, the reader of decision 5, the disk rule, `groups-walk.json`, `cold_setup` restored), drivers copied to `logs/step11b/`.
- [ ] **Step 2:** Then ruling 11's hash and compare again (`stick hash --out <scratchpad>/stick-v1-step11b.sha256`, copied to `progress/`; `compare progress/stick-v1-step11.sha256 --reasons progress/step11/reasons.tsv`, widened for `arms.json` and `trial/` first, committed before the hash). Any `unexplained` or `missing` stops.

### Task B4: The step 11 lock

**Files:**
- Create: `progress/step11-lock.md`
- Modify: `docs/plans/2026-11-08-bench-trial.md` (Phase B points at this plan), `docs/log.md`, `progress/progress.md`

- [ ] **Step 1: The token** (ruling 13): the user revokes it; then `rm <data>/arm/box.env`, unread. Check the file is gone.
- [ ] **Step 2: The stick check** (when B3 did not walk): `stick compare progress/stick-v1-step11.sha256`. Expected: `changed 1` (`arms.json`), `missing 0`; the trial's records, grades, product refs and `trial/` files are new, transcripts and `*/docker.json` are left out by `stick hash`. Any other changed file stops for the user. No new manifest is written; step 12 locks the plugin.
- [ ] **Step 3:** Suite teed, pristine; `git status --short bench tests` empty; Docker: no `-serve`, `-runner-*`, `-product-*`, `-app-*`, `-grade-*`, `-make-*`, `-arm-` or `bench-arm-proxy-` name of this phase left; pgsnap equal.
- [ ] **Step 4:** Write `progress/step11-lock.md`: the plugin entry (name, commit, paths, sha256, dependencies none), the B1 probes, the 8 runs (CLI, models, tokens with cache apart, minutes, interventions, end, machine reruns), σ_d and σ_d over the 2 external tasks, N, `h1_n`, the walk if any, cost against section 11, what went to the designer, the accepted minors and what they cost, deviations, open points for step 12, known limits. Commit, final review of the branch, the user's approval; then this plan `stable`.

## Known limits

- **The fact in `handover.md`** bears on how H runs in every trial box; it is recorded there and not relayed (decision 2).
- **A plugin `Stop` hook that keeps a turn from ending** runs to the set's `turnTimeoutSec` (4 hours external, 8 real-estate); that time counts as H's minutes, and a cut turn is resumed as step 8's resume turns, each counted as an intervention.
- **The plugin's run state** (`$HOME/.hstack`, or `/tmp/.hstack` without `HOME`) lives in the box and leaves with it; it is not in the product bundle.
- **Accepted minors** (decision 1 (a)): a false `listens()` kill costs a rerun; a P OOM reads as a timeout and is told to the user; `--extra-round` per invocation.
- **M3 is open on s2-01** (`grade-mode` = `shared`) **and on s3-02** (no served interface); closed on p8b and p6c (Phase A lock).
- **σ_d from 4 tasks at k = 1 is a rough estimate;** N never drops below 24.
- **The trial tasks are seen** by the designer through their scores (4.2 ruling 13).

## Not in this plan

Any change to `grade`, `oracle-run`, the box, the proxy or `trial.mjs` (decision 1 (b) would add one, then the regrade); a design request or plugin content; arm W and the plugin lock (step 12); the scored runs (step 13); any analysis of H1–H5.
