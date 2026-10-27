---
type: plan
title: "Benchmark inputs and replay readiness plan"
description: "Prereg step 3a (the filtered input, filter log and interface sheet of every real-estate task, each written by a sealed agent) and the three gaps to close before the sealed replays of step 3: an early patch check in replay, agent-replay run end to end once per layer, and the int and e2e layers run once with their baseline."
status: draft
generated: { by: claude-code/2.1.310, at: "2026-10-27T17:30:00+07:00" }
sources:
  - id: prereg
    resource: /plans/2026-10-27-benchmark-prereg.md
  - id: tools
    resource: /plans/2026-10-27-bench-tools.md
---

# Benchmark Inputs and Replay Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every `real-estate` task (p1 to p8e) has a filtered input, a filter log and an interface sheet, each written by an agent that mechanically cannot read anything but what it is given; and the replay tools are proven on the dev set for every layer step 3 will run.

**Architecture:** One new generic CLI, `bench/sealed-agent.mjs`, runs one headless agent whose only world is its prompt (no tools) or an export of one commit with read-only tools, and writes its reply to a file with a usage record. The filter and the interface-sheet writer both run through it. Two small fixes to the existing tools (an early patch check in `replay`, the task diff as a file for the review layer). The rest is data in `.evidence/bench/` and dev-mode runs of the existing tools.

**Tech Stack:** Bun 1.4.4+, `bun:test`, the `claude` CLI in print mode, git, the `real-estate` copy.

**Spec:** `docs/plans/2026-10-27-benchmark-prereg.md` (sections 5, 8.1, 8.2, 12 steps 3a and 3); the tools as built: `bench/README.md` and the bench tools ledger in `progress/progress.md`.

## Global Constraints

- Bun only, no new dependency; tests run with `bun test ./tests`. `bench/` names no customer and holds no customer data; briefs, inputs, sheets, bugs and results live under `.evidence/bench/` (gitignored), called `<data>` below. Set `HSTACK_BENCH_MACHINE=<data>/machine.json` for every bench command.
- The app is the copy `/Users/hbchuc/Documents/programing/vibe-code/outsourcing-hstack/real-estate` (`<copy>`); its harness repo is `/Users/hbchuc/Documents/programing/vibe-code/outsourcing-hstack` (`<harness>`). Never write under `/Users/hbchuc/Documents/programing/vibe-code/outsourcing/`. Read-only git commands on `<copy>` and `<harness>` are allowed.
- Never touch the databases `real_estate`, `real_estate_test`, `real_estate_hstack`, `real_estate_hstack_test`. Create only databases named `bench_*`. Never remove a container or a volume, by any route.
- Dev set only: the 20 bugs of `.evidence/replay.md`'s `replay_set` table, patches in `.evidence/replay/`. Never open a held-out patch, a sealed folder, or the `hunks` table of `.evidence/replay.md`. Never open an oracle except p8b's, and only where a step names it.
- The filter and the interface-sheet writer never see a fix commit, a later plan, a progress log or an oracle: they run only through `bench/sealed-agent.mjs`, and their prompt holds only what the step names.
- Each input and each interface sheet passes `bun bench/input-check.mjs`.
- Task ids are `p1 p2 p3 p4 p5 p6a p6b p6c p7b p7c p8a p8b p8b1 p8c p8d p8e`; a task's data folder is `<data>/<task>/` (p8b's existing `<data>/8b/` stays, reached through the symlink `<data>/p8b -> 8b`).
- Record each task's usage in `progress/progress.md` as earlier builds did: implementer and reviewer tokens and minutes, plus the summed usage of every sealed-agent and agent-replay run of the task (from their run records).
- Docs, briefs, logs and commit messages in English.

## Task table (verified while writing this plan)

End = the `n`-th commit after the base on `git rev-list --reverse --first-parent <base>..69ebe27` (linear history). Plan files are in `<harness>/docs/plans/`. "Steps in plan" = the plan has a `## Feature steps` section; otherwise its feature steps are the entries of `<harness>/progress/feature_list.json` whose `plan` is the plan's path.

| Task | Plan file | Base | n | End | Task diff (bytes) | Steps in plan |
|---|---|---|---|---|---|---|
| p1 | 2026-10-09-foundation.md | 691a723 | 16 | 7adfd47 | 709121 | no |
| p2 | 2026-10-09-properties.md | 7adfd47 | 12 | 5eced48 | 128791 | no |
| p3 | 2026-10-10-articles-pages.md | 5eced48 | 15 | be6c20b | 122220 | no |
| p4 | 2026-10-11-surveys.md | be6c20b | 18 | 9bb39ab | 156956 | no |
| p5 | 2026-10-12-matching.md | 8906318 | 9 | 31fcab0 | 81824 | no |
| p6a | 2026-10-13-requests-leads.md | 31fcab0 | 8 | d7f2fd3 | 133154 | no |
| p6b | 2026-10-13-notifications-sales-view.md | d7f2fd3 | 7 | 885c4c2 | 80434 | no |
| p6c | 2026-10-14-admin-polish.md | 885c4c2 | 10 | c8db5b7 | 136148 | no |
| p7b | 2026-10-16-carried-fixes-and-limits.md | 9354f4d | 6 | 3137149 | 85595 | yes |
| p7c | 2026-10-17-launch-readiness.md | 3137149 | 11 | 0b02f41 | 455368 | yes |
| p8a | 2026-10-18-brand-and-shell.md | 0b02f41 | 8 | d1ea76b | 461246 | yes |
| p8b | 2026-10-19-listings.md | d1ea76b | 7 | 1846450 | 803159 | yes |
| p8b1 | 2026-10-19-showcase-seed.md | 1846450 | 6 | 3e630e8 | 48995 | yes |
| p8c | 2026-10-19-detail-and-consultants.md | bf2eea3 | 8 | bee1c22 | 518642 | yes |
| p8d | 2026-10-20-home-and-journey.md | bee1c22 | 9 | d7695d6 | 618948 | yes |
| p8e | 2026-10-21-admin-theme.md | d7695d6 | 7 | a9c2377 | 517974 | yes |

p8b's end 1846450 differs from the pilot's 730509b only by one README line.

**Plan version (ruling, recorded in prereg section 5 by Task 3).** The current plan files carry edits made after their build (p6b: 8 lines, notes that point at later plans; p8b: "correction … after the final review"). The filter therefore reads each plan, and `feature_list.json`, at the harness commit `H` = `git -C <harness> rev-list -1 --before=<committer time of the task's first commit> HEAD`: the last harness state before the build started. Checked: p1 → 82c1204 (plan 2604 lines, 8 features), p6b → 6d0da55 (2001 lines, now 2009), p8b → 09dc37f (6668 lines), p8e → ba95ea9 ("Approve plan 8e").

## Review Focus

1. A plan whose head has no `## File map` heading at `H`, or a p1–p6c plan with no `feature_list.json` entry at `H`. Expected: stop and report that task, never a thin input. Test: Task 3 Step 2 refuses it.
2. A feature step silently lost by the filter (neither kept nor named in the log's dropped list). Expected: the ID accounting check fails. Test: Task 3 Step 5.
3. The sealed agent reads a file outside its folder (absolute path, Grep or Glob on `/`). Expected: denied; the reply lacks the canary word. Test: Task 1 Step 5.
4. A task diff over 1 MB (macOS ARG_MAX) or over the model's context. Expected: the review layer still starts and reads the diff from a file. Test: Task 2 'a task diff over 1 MB reaches the reviewer as a file'.
5. A reverse patch that does not apply. Expected: `replay` stops before the baseline; the layer command never runs. Test: Task 2 'a patch that does not reverse-apply stops before the baseline runs'.

---

### Task 1: Sealed agent runner

**Files:**
- Create: `bench/sealed-agent.mjs`
- Test: `tests/bench-sealed-agent.test.mjs` (a `claude` stub through `BENCH_CLAUDE`, as in `tests/bench-agent.test.mjs`)
- Modify: `bench/README.md` (one command line and one sentence)

**Interfaces:**
- Consumes: `withExport(task, commit|null, label, fn, root, { dropSettings })` (`bench/env.mjs`); `runClaude(opts, cwd, { timeoutSec, quiet })` (`bench/agent-replay.mjs`); `finalText`, `usage` (`bench/lib/agent.mjs`); `initInfo` (`bench/lib/arm.mjs`); `loadTask` (`bench/lib/task.mjs`).
- Produces: CLI `bun bench/sealed-agent.mjs <task.json> <label> --prompt <file> --out <file> [--at <commit>] [--tools <name,name,…>]` and `sealedAgent(args, { root }) -> Promise<0|1>`. Runs one `claude -p` with the prompt file's text, `permissionMode: 'default'`, `tools` = the list or `[]` (no tools), in `withExport(task, at ?? null, 'sealed-<label>', …, { dropSettings: true })` (an empty folder, or the files of `at` with no `.git`). Writes the final text to `--out` and `<out>.run.json` = `{ label, at, start, end, code, version, tools, usage, models }` (`version` and `tools` from the init event). Refuses when `--out` or `<out>.run.json` exists, when the label does not match `^[a-z0-9][a-z0-9_.-]*$`, or when the prompt file is missing. No result event or a non-zero exit: writes the run record, no `--out`, returns 1.

- [ ] **Step 1: Write the failing tests:** 'writes the reply to --out and version, tools, usage and models to the run record'; 'with no --tools the agent gets one empty --tools argument and an empty folder' (the stub logs its argv and the folder listing); '--at runs in an export of that commit with no .git and no .claude/settings.json'; 'refuses an existing --out or run record, a bad label and a missing prompt file, naming what is wrong'; 'no result event: exit 1, a run record with the code, no --out'.
- [ ] **Step 2: Run** `bun test tests/bench-sealed-agent.test.mjs` — expect FAIL (module not found).
- [ ] **Step 3: Implement** `bench/sealed-agent.mjs` (thin: argument parsing, the export, one `runClaude`, two writes). The agent's env is `agentEnv()` (no `BENCH_*`, no `HSTACK_BENCH_MACHINE`), which `runClaude` already applies.
- [ ] **Step 4: Run** `bun test ./tests` — expect every test to pass, output pristine.
- [ ] **Step 5: Seal probe with the real CLI.** Write a canary file `/tmp/hstack-bench-canary.txt` holding a random word. Run `--at 69ebe27 --tools Read,Grep,Glob` with a prompt asking to read that file, to Grep for the word under `/tmp` and to Glob `/tmp/hstack-bench-canary*`, and to reply with what it found or `DENIED`. Expected: the reply lacks the word; `tools` in the run record is exactly `Read, Grep, Glob` (plus nothing that can write or run commands). Run once more with no `--tools`; expected `tools: []`. Delete the canary. If the word appears, stop: the filter and sheet tasks cannot start.
- [ ] **Step 6: Commit** `git add bench/sealed-agent.mjs tests/bench-sealed-agent.test.mjs bench/README.md && git commit -m "Run one sealed agent that sees only its prompt or one commit's files"` (the probe result in the message body).

### Task 2: Two tool fixes before the sealed replays

**Files:**
- Modify: `bench/replay.mjs` (patch check before the baseline), `bench/agent-replay.mjs` (review diff as a file), `bench/README.md`
- Test: `tests/bench-replay.test.mjs`, `tests/bench-agent.test.mjs`

**Interfaces:**
- Consumes: `withWorktree(task, commit, label, fn, root)` (`bench/env.mjs`).
- Produces: `reverseApply(bug, sealed, { checkOnly = false } = {})`: with `checkOnly` it runs only `git apply -R --check`. `replay` calls it in `withWorktree(task, at, 'check-<id>', …)` before the baseline (before reading or running it), so a bad patch costs one checkout, not a full baseline. The review layer's folder holds one file, `task.diff` (`git diff --no-ext-diff --no-color <base> <end>`); the prompt is `<brief>\n\n## Input\n\n<input>\n\n## Diff of the task\n\nThe full diff of the task, from its base to its end, is the file task.diff in your working folder.\n`.

- [ ] **Step 1: Write the failing tests:** in `tests/bench-replay.test.mjs`, 'a patch that does not reverse-apply stops before the baseline runs' (the layer command appends to a marker file; assert the marker is absent, no baseline file is kept, exit non-zero; sealed: stderr is exactly `<id> patch does not apply`). In `tests/bench-agent.test.mjs`, change 'sealed review prints exactly "<id> caught"…' so it asserts the folder holds only `task.diff`, equal to the git diff, and the prompt does not contain the diff; add 'a task diff over 1 MB reaches the reviewer as a file' (a temp repo commit adding a 1.1 MB text file; the stub reports the size of `task.diff`).
- [ ] **Step 2: Run** `bun test tests/bench-replay.test.mjs tests/bench-agent.test.mjs` — expect the new and changed tests to FAIL.
- [ ] **Step 3: Implement** both changes. Update the `runClaude` shortcut comment (the diff no longer rides in argv; the input and the judge's description still do) and the README lines on `replay` and `agent-replay`.
- [ ] **Step 4: Run** `bun test ./tests` — expect all pass, output pristine.
- [ ] **Step 5: Commit** `git commit -m "Check the reverse patch before the baseline, and give the reviewer the task diff as a file"`

### Task 3: Filtered inputs and filter logs of every task (prereg step 3a)

**Files:**
- Create (gitignored): `<data>/tasks.json` (`{ "<task>": { plan, base, end, n, harness } }`, the task table above plus `H`); `<data>/briefs/filter.md`; per task `<data>/<task>/{filter-source.md, input.md, filter-log.md, filter*.run.json}`; symlink `<data>/p8b -> 8b`; `<data>/8b/input-pilot.md` and `filter-log-pilot.md` (the pilot's files, renamed).
- Modify: `docs/plans/2026-10-27-benchmark-prereg.md` section 5 (two sentences, see Step 1).

**Interfaces:**
- Consumes: `bun bench/sealed-agent.mjs` (Task 1), `bun bench/input-check.mjs`.
- Produces: `<data>/<task>/input.md` for all 16 tasks (consumed by agent-replay review and evaluator, run-arm, the classifiers of step 5); `<data>/tasks.json` (consumed by Task 4, by the bug files of step 3, by run-arm).

- [ ] **Step 1: Prereg note.** Add to section 5, after the filter rules: "The filter reads the plan, and for plans 1 to 6c the entries of the harness's feature list that belong to the plan (those plans keep their feature steps there, not in the plan), as they stood at the last harness commit before the task's first commit: later edits of a plan are output of its build or of later plans. Each filter runs as a sealed agent whose prompt is the rules and that source text, with no tool." Commit `git commit -m "Name the plan version and the feature-list source the input filter reads"`.
- [ ] **Step 2: Build each task's source text** into `<data>/<task>/filter-source.md` by script, without printing plan content: the plan at `H` (`git -C <harness> show <H>:docs/plans/<file>`) cut before its first `## File map` line; for p1–p6c, followed by `## Feature steps` rendered from the feature-list entries at `H` whose `plan` is `docs/plans/<file>`: one `### P<no>-F<i>: <description>` per entry and one `- P<no>-F<i>-S<j>: <step>` per step, in file order, `passes` dropped (`<no>` from the plan title, e.g. `Plan 6a` → `P6a`). Refuse a task whose plan has no `## File map` line or (p1–p6c) no entry at `H`. Spot-check 3 rendered IDs per p1–p6c task against `progress/test-coverage.md` at `H` (IDs only; print nothing else). Write `<data>/tasks.json`.
- [ ] **Step 3: Write `<data>/briefs/filter.md`**: prereg section 5's Keep / Drop whole / Strip / Mockups rules verbatim, plus: drop the `## Feature steps out of date` section and any feature group or feature-list entry that fixes an earlier plan (p7b: keep only its new part); keep every step ID verbatim on its step; the reply is the input, then a line `-----8<----- FILTER LOG`, then the log in the layout of `<data>/8b/filter-log-pilot.md` (kept sections with counts, dropped whole with reasons, dropped items inside kept sections quoted, stripped text by kind with counts and examples).
- [ ] **Step 4: Run the filter** per task: prompt file = the brief, then `## Source`, then `filter-source.md`; `bun bench/sealed-agent.mjs <data>/env/real-estate.json filter-<task> --prompt <prompt> --out <scratch>/<task>.reply` (no `--tools`); split the reply at the marker into `input.md` and `filter-log.md` (a reply without exactly one marker is rerun). Up to 4 tasks in parallel. p8b is filtered like the rest; its pilot files were renamed first.
- [ ] **Step 5: Check each task.** (a) `bun bench/input-check.mjs <data>/<task>/input.md` prints PASS. On hits, a fix run (`--out` `<scratch>/<task>.fix<k>.reply`, no tools) whose prompt lists the hits and the input and asks for the whole input back with only those lines rewritten to keep their meaning; at most 3 fix runs, each appended to the log under "Fix runs"; then stop and report. (b) ID accounting: every ID matching `\bP<no>-F\d+-S\d+\b` in `filter-source.md` occurs in `input.md` or in the log's dropped list; any other ID is a failure of the task. (c) `input.md` has a Goal and at least one feature step.
- [ ] **Step 6: Record** in `progress/progress.md`: per task, kept and dropped step counts, input-check result, fix runs, and the summed sealed-agent usage.

### Task 4: Interface sheets of every task

**Files:**
- Create (gitignored): `<data>/briefs/interface.md`; per task `<data>/<task>/{interface.md, interface*.run.json}`.

**Interfaces:**
- Consumes: `bun bench/sealed-agent.mjs` (Task 1), `<data>/<task>/input.md` and `<data>/tasks.json` (Task 3).
- Produces: `<data>/<task>/interface.md` (consumed with the input by run-arm and the classifiers; how the arm prompt joins the two is decided at prereg step 8).

- [ ] **Step 1: Write `<data>/briefs/interface.md`** from prereg section 5: list every public name of the features the input describes, read from the code in your folder (the task's end product): field labels, option texts, form accessible names, button and link texts, URL paths and query parameter keys, API paths and field names. Names only, no behaviour, no rule, no file path, no code. One `##` section per page or API path the input mentions, one bullet per name: `<kind>: "<name>"`. A name you cannot find in the code is left out, never guessed.
- [ ] **Step 2: Confirm the p8b check values in git, not in an oracle:** `git -C <copy> grep -c "Lọc bất động sản" 1846450`, `… "Biệt thự" 1846450` (expect hits) and `… "Tên địa điểm" 1846450` (expect none; d82f2b0 adds it later).
- [ ] **Step 3: Run** per task: prompt = the brief, then `## Input`, then `input.md`; `bun bench/sealed-agent.mjs <data>/env/real-estate.json interface-<task> --at <end> --tools Read,Grep,Glob --prompt <prompt> --out <data>/<task>/interface.md`. Up to 4 in parallel.
- [ ] **Step 4: Check each sheet:** `bun bench/input-check.mjs` PASS (fix runs as in Task 3 Step 5a); every bullet has the shape `<kind>: "<name>"`; p8b's sheet holds "Lọc bất động sản" and "Biệt thự" and not "Tên địa điểm". A sheet that fails the p8b check is rewritten by a new run with a corrected brief, never edited by hand.
- [ ] **Step 5: Record** in `progress/progress.md`: per task, the number of names, input-check result, and the summed usage.

### Task 5: Agent layers end to end on dev bugs (gap b)

**Files:**
- Create (gitignored): `<data>/env/real-estate/briefs/{review.md, audit.md, evaluator.md, SOURCES.md}`; `<data>/replay-dev/090f6f2-05-agent.json`, `<data>/replay-dev/eb2b016-11.json`, `<data>/replay-dev/eb2b016-11.patch`; `<data>/replay-dev/agent/` (the run records, moved).
- Modify (gitignored): `<data>/env/real-estate.json` (`layers.review`, `layers.audit`, `layers.evaluator`); `<data>/replay-dev/smoke.md` (a new section).

**Interfaces:**
- Consumes: `bun bench/agent-replay.mjs` (with Task 2's diff file), `<data>/p6b/input.md`, `<data>/p8b/input.md` (Task 3), `bun bench/env.mjs up`.
- Produces: the three layer briefs and the layer entries of the task file, which step 3 uses unchanged on every dev and held-out bug.

Bugs (dev set, owners from `<data>/tasks/<task>.tsv` rows of the fix commit's file): **090f6f2-05** ("send a staff email only to a user who still has the lead", `src/jobs/send-lead-email.ts`), owned by p6b (rows at old lines 40 and 82), the smallest task diff of the dev bugs; fix 090f6f2 is after p6b's end 885c4c2 and not in it (checked). **eb2b016-11** ("show 0 bedrooms of a building", the property card), owned by p8b (old line 73), the one bug the old blind evaluator caught (1 of 14 runs, `evaluator-review.md`).

- [ ] **Step 1: Briefs.** `review.md` = superpowers 7.0.0 `skills/subagent-driven-development/task-reviewer-prompt.md` with its placeholders filled for this setting (the requirement is the input below; the change is `task.diff`; no git, no tests to run); `audit.md` = ponytail 5.3.2 `skills/ponytail-audit/SKILL.md` with a first line "Audit the repository in your working folder."; `evaluator.md` = `.evidence/brief-new.md` cut to its exploratory and Global Constraints parts, with no repo, git, test log, step walk or fault check, plus: the app's URL is given below; log in with the demo users of the seed (their emails and passwords copied into the brief from `<copy>/src/seed/demo-data.ts` at 69ebe27); write Playwright scripts in your folder (`import { chromium } from 'playwright'`) and run them with `bun`; never run docker, psql or pnpm. Every brief ends: "End your reply with your findings, one per line: what is wrong, where, how to see it." `SOURCES.md` lists each source path, its version and sha256.
- [ ] **Step 2: Task file layers:** `review` and `audit`: `{ brief, tools: ["Read","Grep","Glob"] }`; `evaluator`: `{ brief, tools: ["Read","Write","Edit","Bash","Glob","Grep"], allow: ["Write","Edit","Bash(bun:*)","Bash(curl:*)"] }`.
- [ ] **Step 3: Bug files.** `090f6f2-05-agent.json` = `{ id: "090f6f2-05", task: "p6b", base: "d7f2fd3", end: "885c4c2", fix: "090f6f2", description }`; `eb2b016-11.json` = `{ id, task: "p8b", at: "69ebe27", patch: "eb2b016-11.patch", description }`; the patch in the fix direction, made as `smoke.md` says (apply `.evidence/replay/eb2b016-11.patch` to the 69ebe27 files in a scratch repo, take `git diff -R`); `git -C <copy> apply -R --check` in a scratch worktree at 69ebe27 passes. Each `description` = the bug's clause and test title from the `replay_set` row.
- [ ] **Step 4: Evaluator tool probe.** `bun bench/env.mjs up <data>/env/real-estate.json 69ebe27` in the background; in a fresh folder under `/tmp/hstack-bench/`, one `claude -p` with the evaluator's `tools`, `allow` and `--permission-mode default` (as `claudeArgs` builds them) asking it to `curl` the URL and print the status, then to write and `bun`-run a Playwright script that logs in as the first demo user and prints the admin page title. Expected: status 200, a title, no permission denial. Stop the app (Ctrl-C), `bun bench/env.mjs clean`. If Playwright cannot start a browser, stop and ask (no install from the network without the user).
- [ ] **Step 5: Run** in dev mode: `bun bench/agent-replay.mjs <data>/env/real-estate.json <data>/replay-dev/090f6f2-05-agent.json review`, the same with `audit`, then `… eb2b016-11.json evaluator`. Expected for each: exit 0, a verdict `caught` or `missed` (not `error`), the judge's quote, models and usage in the record. A verdict is not a test of the tools; an `error` is, and is fixed before the next run.
- [ ] **Step 6: Clean and move.** Move the three records from `<data>/results/` to `<data>/replay-dev/agent/` (agent-replay refuses an existing record, so step 3 must start without them). Check: no `bench_` database, nothing on :3000, `/tmp/hstack-bench` empty, `git -C <copy> status` clean.
- [ ] **Step 7: Record** in `smoke.md` (per layer: bug, verdict, quote, models, tokens, minutes; the evaluator: the old blind result) and the usage in `progress/progress.md`. Commit the README if Task 5 changed it.

### Task 6: int and e2e layers with their baseline (gap c)

**Files:**
- Modify (gitignored): `<data>/replay-dev/smoke.md` (a new section); outputs `<data>/replay-dev/<id>-<layer>.baseline-run.{out,err}`.

**Interfaces:**
- Consumes: `bun bench/replay.mjs` (with Task 2's patch check), `<data>/replay-dev/d82f2b0-05.json`, `<data>/replay-dev/d005fa5-03.json`.
- Produces: `<data>/results/baseline-re-69ebe27-int.xml` and `…-e2e.xml`, reused by step 3's held-out replays at 69ebe27.

- [ ] **Step 1: Run** `bun bench/replay.mjs <data>/env/real-estate.json <data>/replay-dev/d82f2b0-05.json int` (dev mode), output to the files above. Expected: the patch check passes at once, a kept int baseline, **missed** (old record: missed), the fix's own failing tests marked `(excluded)`.
- [ ] **Step 2: Run** the same for `d005fa5-03.json e2e` (about 40 minutes: baseline and bug run). Expected: **missed** (old record: missed; old valid run 391 passed, 10 skipped).
- [ ] **Step 3: Compare** with the old record and the first smoke. A different verdict, or a baseline with failing cases, is investigated (systematic-debugging) and explained in `smoke.md` before the task closes; a baseline failure that is a flaky test is recorded with its name, never deleted from the count.
- [ ] **Step 4: Clean check** as in Task 5 Step 6, and record the usage (wall clock; no agent tokens) in `progress/progress.md`.

## Not in this plan

The held-out extension and the sealed replays (step 3); the human read of 2 inputs (step 9); joining the input and the sheet in the arm prompt (step 8). Recorded risk for step 8: the p1–p6c feature steps keep the project's commands, some of which wipe Docker volumes (`docker compose … down -v`); arms must run with their own Docker before they get these inputs.
