---
type: plan
title: "Held-out set and layer replay plan"
description: "Prereg step 3: sweep the framework identifiers out of the 16 inputs, extend the held-out set by a sealed agent, replay the existing layers (test layers and the evaluator on held-out, review and audit on dev plus held-out, each bug given to the task that introduced it), and lock the result."
status: draft
generated: { by: claude-code/2.1.310, at: "2026-10-28T00:10:00+07:00" }
sources:
  - id: prereg
    resource: /plans/2026-10-27-benchmark-prereg.md
  - id: tools
    resource: /plans/2026-10-27-bench-tools.md
  - id: inputs
    resource: /plans/2026-10-27-bench-inputs.md
---

# Held-out Set and Layer Replay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prereg section 12 step 3 done and locked: the 16 inputs hold no framework identifier, the held-out set is complete and sealed, and every existing layer has a replay result on the sets the prereg names, committed with hashes.

**Architecture:** Two small CLIs and one flag. `bench/bugs.mjs` turns a folder of bug files into replay-ready ones (owner task from the blame tables, patch check) and says which layers each bug can feed, printing only counts and opaque ids in sealed mode. `bench/replay-summary.mjs` counts the verdicts. `bench/sealed-agent.mjs` gains `--settings`, so the held-out extension agent can read git history and write only into the sealed folder. Everything else is data in `<data>` and runs of the existing `replay` and `agent-replay`.

**Tech Stack:** Bun 1.4.4+, `bun:test`, the `claude` CLI 2.1.310 in print mode, git, the `real-estate` copy, Docker Postgres `real-estate-postgres-1` (read-only queries only).

**Spec:** `docs/plans/2026-10-27-benchmark-prereg.md` (sections 5, 7.1, 8.1, 8.2, 8.4, 12 step 3); the tools as built: `bench/README.md` and the "bench tools" and "bench inputs plan" sections of `progress/progress.md`.

**Decision the user sees here (data, not choice):** review and audit run on **18 of the 20 dev bugs**, not 20. Ownership from `<data>/tasks/<task>.tsv` gives no task to two: `d005fa5-03` (its fix is inside p6a, so p6a's end product already holds the fix; `agent-replay` refuses it) and `0870afc-04` (its lines were last written by the fix commit 24c426f, which belongs to no task). Task 3 records this rule in prereg §8.2 before any run.

## Global Constraints

- Bun only, no new dependency; tests run with `bun test ./tests`, output pristine. `bench/` names no customer and holds no customer data. `<data>` = `/Users/hbchuc/Documents/programing/vibe-code/hstack/.evidence/bench` (gitignored, in the main checkout; absolute paths from the worktree). Set `HSTACK_BENCH_MACHINE=<data>/machine.json` for every bench command.
- The app is the copy `/Users/hbchuc/Documents/programing/vibe-code/outsourcing-hstack/real-estate` (`<copy>`), its harness repo `/Users/hbchuc/Documents/programing/vibe-code/outsourcing-hstack` (`<harness>`). Never write under `/Users/hbchuc/Documents/programing/vibe-code/outsourcing/`. `git -C <copy> status` is clean after every task.
- Never touch the databases `real_estate`, `real_estate_test`, `real_estate_hstack`, `real_estate_hstack_test`. Create only `bench_*` databases. Never remove a container or a volume, by any route. Postgres is read only through `docker exec real-estate-postgres-1 psql -U postgres -Atc "<select>"` outside the task scripts.
- **Sealing.** The held-out folder is `<data>/heldout/` (`<sealed>`). No implementer, reviewer or controller opens, lists, greps or hashes-and-prints anything under it except through `bun bench/bugs.mjs … --sealed`, `bun bench/replay-summary.mjs` and the lock's `shasum` list (Task 6). Nobody runs `git show`, `git log -p`, `git diff` or `git blame` on the held-out commits named in prereg §8.2 (29f4daf, 36d089b, 400f58a, 5b6646d, 89583d2, b5b3cec) or on any commit a held-out bug file names. Never read `.evidence/replay.md` above its `## replay_set` line. Every held-out run uses `--sealed`; its stderr goes to `<sealed>/logs/`; nobody reads `/tmp/hstack-bench/*.log` while or after a held-out evaluator runs.
- Held-out bug ids are opaque: `ho-01`, `ho-02`, … (a `<sha7>-NN` id would name the fix commit in `results/`).
- Every bug file's `patch` is in the fix's direction at `at` = `69ebe27`: `replay` and `agent-replay` apply it with `git apply -R`, and `git apply -R --check` at 69ebe27 must pass.
- Sealed agents (sweep, fix runs, extension) run only through `bench/sealed-agent.mjs`; their prompt holds only what the step names.
- Record each task's usage in `progress/progress.md` as earlier builds did: implementer and reviewer tokens and minutes, plus the summed usage of every sealed-agent and agent-replay run of the task (from their records; for the held-out folder, the usage line `bugs.mjs --sealed` prints).
- Docs, briefs, logs and commit messages in English.

## Dev ownership (computed while writing this plan)

Rule: a bug's hunks are `{ file, old }` with `old` the start of the hunk's old side in `git diff -U0 --no-renames <fix>^ <fix>` (a pure addition gives the line it follows). A tsv row matches a hunk when `commit` = the fix's 7-char sha, `file` matches and `old_lines` starts at `old`. The owner is the task with the most `task_lines` summed over the bug's matching rows; a tie goes to the earlier task in `tasks.json`. With no row, a fix commit inside a task's range (`base..end`, first parent) makes that task the owner with the fix in its end. A bug whose owner's `end` contains the fix is out of review and audit; a bug with no owner is out of review, audit and the evaluator (it has no input). Test layers take every bug whose patch applies.

| bug | owner | why |
|---|---|---|
| 69ebe27-01, 24c426f-19 | p8d | one row each |
| dd56b84-22 | p8d | p8d 2 lines, p8c 1 |
| 090f6f2-03 | p8d | p8d 2 lines, p6b 1 |
| 4e58ba5-13 | p1 | |
| 4e58ba5-19 | p8b1 | |
| d82f2b0-05, d82f2b0-22, d82f2b0-25, eb2b016-11 | p8b | |
| 6cedf96-05, 24c426f-03 | p6a | |
| e41d45f-04, 24c426f-04 | p6c | |
| eb2b016-13 | p8e | |
| eb2b016-02 | p8c | |
| 24c426f-13 | p2 | |
| 090f6f2-05 | p6b | |
| d005fa5-03 | p6a, fix in end | no row; d005fa5 is inside p6a (31fcab0..d7f2fd3) |
| 0870afc-04 | none | no row; lines 80–82 of `src/lib/lead-request.ts` at 0870afc^ blame to 24c426f |

## Review Focus

1. A held-out detail reaches a person through a sealed run's error text (a `fix … is a merge commit` or `git … failed` message names the commit or the file). Expected: sealed stderr goes only to `<sealed>/logs/`; `bugs.mjs --sealed` prints no path, line, sha or description. Test: Task 3 'sealed mode prints counts and opaque ids only'.
2. The extension agent writes outside the sealed folder or changes the copy (path-scoped allow rules not honoured, `git checkout`). Expected: denied. Test: Task 4 Step 4 probe.
3. A new input-check rule flags public interface (an HTTP header, CSS, `tel:`, an API or CSV field name), so a fix run deletes a name a check needs. Expected: no hit. Test: Task 1 'leaves headers, CSS, phone links and API field names alone'.
4. A bug whose hunks span two tasks, or whose fix is inside a task, gets the wrong owner and the reviewer reads the wrong diff. Expected: the rule above. Test: Task 3 'owner is the task with the most tsv lines…' and 'a fix inside a task's range…'.
5. Two batches running at once leave a `bench_*` database behind or a protected name changes. Expected: each batch's `pg_database` snapshots are equal once `bench_*` names are removed, and none remains after the last batch. Test: Task 5 Step 6.

---

### Task 1: Sweep framework identifiers out of the inputs (item 4)

**Files:**
- Modify: `bench/input-check.mjs` (`RULES`), `tests/bench-input-check.test.mjs`
- Create (gitignored): `<data>/briefs/sweep.md`; per task `<data>/<task>/sweep.reply.md` (+ `.run.json`), fix-run replies and records beside the earlier ones, `<data>/<task>/superseded/input-pre-sweep.md`; a "Sweep" section appended to each touched `filter-log.md`.

**Interfaces:**
- Consumes: `bun bench/sealed-agent.mjs` (no `--tools`), `<data>/<task>/{input.md, interface.md}`.
- Produces: the 16 swept inputs read by every later task; `RULES` with three new entries: `config value`, `module specifier`, `framework name`.

The class to remove: a name from a framework's or library's own API that says how the app is built: config keys and values, route exports, query options, module specifiers, framework functions, hooks and admin component slots (the human read found `idType: 'uuid'`, `overrideAccess: false`, `draft: true`, `revalidate = 600`, `generateStaticParams`, `next/image` in p3; a grep while writing this plan finds the same kind in p5 and p8b, and `agentRules`, `serverExternalPackages`, `isrFlushToDisk`, `searchParams`, `beforeDashboard`, `beforeNavLinks`, `images: { unoptimized: true }`, `push: false` elsewhere). Kept (§5 public interface): URL paths, query keys, UI text, REST API paths and JSON field names (`propertyType`, `externalId`, `totalDocs`), HTTP headers, meta tags and schema.org keys, CSV column names, environment variable names, the project's CLI commands, browser DOM expressions that say how a page is measured.

- [ ] **Step 1: Write the failing tests** in `tests/bench-input-check.test.mjs`: 'flags framework config values, module specifiers and named framework identifiers' — each of `` `idType: 'uuid'` ``, `` `overrideAccess: false` ``, `` `draft: true` ``, `` `revalidate = 600` ``, `` `dynamic = 'force-dynamic'` ``, `` `images: { unoptimized: true }` `` hits `config value`; `` `next/image` `` and `` `react-dom/server.edge` `` hit `module specifier`; `generateStaticParams` and `searchParams` (bare or backticked) hit `framework name`. 'leaves headers, CSS, phone links and API field names alone' — no hit on `` `Cache-Control: private, no-cache` ``, `` `x-nextjs-cache: HIT` ``, `` `min-width: 0` ``, `` `prefers-reduced-motion: reduce` ``, `` `tel:+84900000001` ``, `` `/_next/image` ``, `` `SCHEMA_PUSH=false` ``, `` `propertyType` ``, `` `externalId, title, price` ``, `` `subject:"Lê Thị Cúc"` ``, `` `trang/[n]` ``.
- [ ] **Step 2: Run** `bun test tests/bench-input-check.test.mjs` — expect the two new tests to FAIL.
- [ ] **Step 3: Implement** the three rules. `config value`: a backticked span that is a lowercase-led, optionally dotted name, then `: ` or ` = `, then a code literal (`true`, `false`, `null`, a number, a quote, `[` or `{`). `module specifier`: a backticked span `<pkg>/<sub>` that starts with a lowercase letter or `@` (a URL path starts with `/`). `framework name`: a word-bounded list, seeded with `generateStaticParams`, `generateMetadata`, `searchParams`, `overrideAccess`, `idType`, `renderToStaticMarkup`, `serverExternalPackages`, `isrFlushToDisk`, `agentRules`, `beforeDashboard`, `beforeNavLinks`, `prodMigrations`, `force-dynamic`, `use server`; shortcut comment: `shortcut: names the real-estate inputs showed (Next.js and Payload); widen when another stack's inputs show more`.
- [ ] **Step 4: Run** `bun test ./tests` — all pass, output pristine. Commit `git commit -m "Flag framework config values, module specifiers and framework names in task inputs"`.
- [ ] **Step 5: Sweep.** Write `<data>/briefs/sweep.md`: the class and the kept list above, then: "List every line of the input below that holds a name of the first kind. One line per name: `<line number>: <the name>`. Reply NONE when there is none." Per task, prompt = brief + `## Input` + `input.md`, `bun bench/sealed-agent.mjs <data>/env/real-estate.json sweep-<task> --prompt <p> --out <data>/<task>/sweep.reply.md` (no tools, up to 4 in parallel). Hits of a task = the sweep reply's names ∪ `bun bench/input-check.mjs` hits of the input. A name the sweep found that no rule flags is added to the `framework name` list (amend the Step 4 commit's rule list in a new commit with its test line), unless it is in the kept list (record it in the task's log as "kept: <name>, <kind>").
- [ ] **Step 6: Fix runs.** Copy each input with hits to `superseded/input-pre-sweep.md` first. One sealed fix run per such input (no tools), prompt: the hits by line, the input, and "Rewrite only these lines so they state the behaviour the name produces, as a visitor, a user or an API client sees it; keep every step ID, URL, UI text, API field name and number; return the whole input." At most 3 fix runs per task; append each to `filter-log.md` under "Sweep" (hits, the rewritten lines old → new).
- [ ] **Step 7: Check each of the 16 tasks.** (a) `bun bench/input-check.mjs <input>` PASS. (b) The set of `P<no>-F<i>-S<j>` IDs is unchanged. (c) `diff` old vs new touches only hit lines. (d) The set of backticked spans starting with `/` and of double-quoted strings is unchanged, except spans the hits named; else a new fix run naming the lost name. (e) Sheets still match: `bun bench/input-check.mjs <data>/<task>/interface.md` PASS, and no sheet bullet's name is a hit name; a failing sheet gets a sealed fix run (no tools) that drops only those bullets, as the inputs build did. (f) `git -C <copy> status` clean.
- [ ] **Step 8: Record** in `progress/progress.md`: per task, hits (sweep / rule), names kept, fix runs, sheet changes, summed sealed usage. Commit `git commit -m "Record the framework identifier sweep of the 16 inputs"`.

### Task 2: Readiness before the runs (item 3)

**Files:**
- Create (gitignored): `<data>/env/real-estate/pgsnap.sh`, `<data>/env/judge-probe.json`, `<data>/env/judge-probe/review.md`, `<data>/replay-dev/results-pre-step3/`, `<data>/replay-dev/judge-probe/`
- Modify: `progress/progress.md`

**Interfaces:**
- Consumes: `bun bench/agent-replay.mjs`, `<data>/replay-dev/eb2b016-11.json`.
- Produces: `sh <data>/env/real-estate/pgsnap.sh <out>` (writes the sorted `datname` list of `pg_database`, one per line; exit non-zero when the query fails); an empty `<data>/results/`.

- [ ] **Step 1: Playwright.** `ls ~/.bun/install/cache | grep '^playwright@1.64.1'` lists it. In a fresh folder under `/tmp/hstack-bench/pw-check/`, a script that does what `evaluator.md` says (`import { chromium } from 'playwright@1.64.1'`, launch with the brief's `executablePath`, open `about:blank`, print `browser.version()`), run as `bun --prefer-offline <file>` with `agentEnv()`'s variables. Expected: a version line, no download. If it fails, stop and ask (no install).
- [ ] **Step 2: pgsnap.** Write `pgsnap.sh` (`docker exec real-estate-postgres-1 psql -U postgres -Atc "select datname from pg_database order by 1"`). Run it into `<data>/replay-dev/pg-<time>.txt`; record which of the four protected names exist (expected today: `real_estate_test` absent) and that no `bench_*` name exists.
- [ ] **Step 3: Empty results.** Move `<data>/results/*` (the three baselines) to `<data>/replay-dev/results-pre-step3/`. `ls <data>/results` prints nothing. Step 3's runs rebuild the baselines (about 35 minutes).
- [ ] **Step 4: Judge "caught" path with the real CLI.** `judge-probe.json` = `real-estate.json` with `layers.review` = `{ brief: "judge-probe/review.md", tools: [] }`; the brief: "Reply with exactly this one finding and nothing else: On the property list card, a building (an apartment or a townhouse) with 0 bedrooms shows a dash in the bedrooms entry instead of 0." Run `bun bench/agent-replay.mjs <data>/env/judge-probe.json <data>/replay-dev/eb2b016-11.json review` (dev mode). Expected: exit 0, `eb2b016-11 caught`, a non-empty `quote:` line, the record's `models.judge` set. Move the record to `replay-dev/judge-probe/`; `results/` is empty again.
- [ ] **Step 5: Deferred minors marked "fix before step 3".** Check and record each as settled: review.md old-harness text and the `Reviewed:`/no-narration contradiction (bench inputs ledger, Task 5) — `grep -n -E 'controller|plan-mandated' review.md` prints nothing and lines 27 and 95–96 agree (fixed by the final fix wave); the patch check before the baseline (bench tools ledger, "Final: parked") — built in bench inputs Task 2; the judge caught path — Step 4. Any item that does not check out is fixed in this task.
- [ ] **Step 6: Record** in `progress/progress.md` (probe output, snapshot, judge probe usage); commit.

### Task 3: Bug files: owner and patch check

**Files:**
- Create: `bench/bugs.mjs`, `tests/bench-bugs.test.mjs`
- Modify: `bench/README.md` (command line, bug file fields), `docs/plans/2026-10-27-benchmark-prereg.md` §8.2 (ownership note)
- Create (gitignored): `<data>/replay-dev/bugs/<id>.{json,patch}` for the 20 dev bugs

**Interfaces:**
- Consumes: `readBug`, `reverseApply(bug, sealed, { checkOnly: true })` (`bench/replay.mjs`); `withWorktree` (`bench/env.mjs`); `resolveCommit` (`bench/grade.mjs`); `loadTask`; `<data>/tasks.json`, `<data>/tasks/<task>.tsv`.
- Produces: CLI `bun bench/bugs.mjs <task.json> <folder> [--sealed] [--usable <unit|int|e2e|evaluator|review|audit>]` and `bugs(args, { root }) -> Promise<0|1>`. Reads every `<folder>/*.json` except `*.run.json`: `{ id, fix, at, patch, description, hunks: [{ file, old }], kind?, severity?, source?, dropped? }`. Writes into each file `task`, `base`, `end` (from `tasks.json`; `task: null` with no owner) and `out`: `null`, `"dropped"`, `"patch does not apply"`, `"fix is a merge commit"`, `"no owner"` or `"fix in end"` (first that holds, in this order). Usable: test layers `out` ∈ {null, "no owner", "fix in end"}; evaluator `out` ∈ {null, "fix in end"}; review and audit `out` null. `--usable` prints only the usable bug file paths, one per line. Dev mode prints `<id> task=<task|none> out=<out|ok>` per bug, then the totals. Sealed mode prints only totals: bugs, by `source`, `kind`, `severity`, owner task, `out` reason, usable per layer; the ids whose `out` is `patch does not apply` or `fix is a merge commit`; and `usage <input>/<output>/<cacheRead>/<cacheWrite> models <list>` summed over `<folder>/*.run.json`. Exit 1 when a file is not a valid bug file (sealed: `<file name> invalid`).

- [ ] **Step 1: Write the failing tests** (temp copy repo, temp data folder with `machine.json`, `tasks.json` and two tsv files, as `tests/bench-replay.test.mjs` builds its fixtures): 'owner is the task with the most tsv lines over the bug's hunks, ties to the earlier task'; 'a fix inside a task's range with no tsv row makes that task the owner, out "fix in end"'; 'no tsv row and no range: task null, out "no owner", usable for test layers only'; 'a patch that does not reverse-apply at at is out of every layer'; 'a dropped bug is counted and never usable'; '--usable review lists only bugs with out null, one path per line'; 'sealed mode prints counts and opaque ids only' (stdout holds no hunk file path, no fix sha, no description word, no line number of a hunk); 'usage sums every run record in the folder'.
- [ ] **Step 2: Run** `bun test tests/bench-bugs.test.mjs` — expect FAIL (module not found).
- [ ] **Step 3: Implement** `bench/bugs.mjs`. One `withWorktree(task, at, 'check-<id>', reverseApply(bug, sealed, { checkOnly: true }))` per bug; sealed: git's output ignored (reverseApply already does). Fix-in-end by `git merge-base --is-ancestor <fix> <end>`; task range by `git rev-list --first-parent <base>..<end>`.
- [ ] **Step 4: Run** `bun test ./tests` — all pass, output pristine. Update `bench/README.md`. Commit `git commit -m "Give each bug file its owner task and say which layers it can feed"`.
- [ ] **Step 5: Prereg note** (before any run): add to §8.2 the ownership rule of this plan's "Dev ownership" section and its result ("review and audit run on 18 of the 20 dev bugs: d005fa5-03 has its fix inside p6a, 0870afc-04 has no owner"), held-out ids are opaque, and the held-out bug file holds its hunk positions so ownership needs no reading of the patch. Commit `git commit -m "Register the owner rule of the step 3 replays and the 18 dev bugs it gives review and audit"`.
- [ ] **Step 6: Dev bug files.** For each `replay_set` row: `<id>.json` = `{ id, fix: <sha>, at: "69ebe27", patch: "<id>.patch", description, hunks, kind }`, `description` = the clause and test title as in `<data>/replay-dev/eb2b016-11.json`; `hunks` = the `-U0` hunks of `<fix>^..<fix>` in the row's file whose new side overlaps the row's lines; the patch in the fix direction made as `smoke.md` says (the four existing conversions in `replay-dev/` are reused). Run `bun bench/bugs.mjs <data>/env/real-estate.json <data>/replay-dev/bugs` (dev mode). Expected: every patch applies, and owners and `out` exactly as the "Dev ownership" table; `--usable review` lists 18. A difference is investigated before the task closes.
- [ ] **Step 7: Record** in `progress/progress.md`; commit.

### Task 4: Held-out extension by a sealed agent (item 1)

**Files:**
- Modify: `bench/sealed-agent.mjs` (`--settings`), `tests/bench-sealed-agent.test.mjs`, `bench/README.md`
- Create (gitignored): `<data>/briefs/extension.md`, `<data>/briefs/extension-settings.json`, `<data>/briefs/extension-probe-settings.json`, `<data>/env/real-estate-long.json` (`real-estate.json` with `timeoutSec: 21600`), `<data>/replay-dev/extension-probe/`; the sealed folder `<sealed>/` (written only by the sealed agent and `bugs.mjs`)

**Interfaces:**
- Consumes: `bun bench/bugs.mjs` (Task 3).
- Produces: `sealed-agent … --settings <file>` (passed as `settings` to `runClaude`, so `claudeArgs` adds `--settings <abs path>`; refused when the file is missing; the run record gains `settings`); `<sealed>/ho-NN.{json,patch}` in the bug file shape of Task 3, with `source` `catalog` or `extension`, `kind`, `severity`, and `seen: true` on the catalog's `b5b3cec-01`.

- [ ] **Step 1: Write the failing tests:** 'passes --settings as an absolute path and records it'; 'refuses a missing settings file, naming it'.
- [ ] **Step 2: Run** `bun test tests/bench-sealed-agent.test.mjs` — expect FAIL.
- [ ] **Step 3: Implement**; `bun test ./tests` all pass; README line; commit `git commit -m "Let a sealed agent run with a settings file"`.
- [ ] **Step 4: Probe the permissions with the real CLI.** `extension-probe-settings.json` = the Step 5 settings with `<data>/replay-dev/extension-probe/` in place of `<sealed>`. Run `--at 69ebe27 --tools Read,Write,Edit,Bash,Glob,Grep --settings <probe settings>` with a prompt that asks, each step reported as `done` or `DENIED`: write `<probe dir>/ok.txt`; write `/tmp/hstack-bench-outside.txt`; `git -C <copy> log -1 --format=%s 69ebe27`; `git -C <copy> branch probe-x`; copy `<data>/replay-dev/eb2b016-11.patch` into the probe dir and run `git apply -R --check <probe dir>/eb2b016-11.patch`; read the first line of `<harness>/progress/progress.md`. Expected: done, DENIED (file absent), done, DENIED (`git -C <copy> branch --list probe-x` empty), done, done. `git -C <copy> status` clean. Any other result: stop, record it, fix the settings, rerun.
- [ ] **Step 5: Settings and brief.** `extension-settings.json`: `permissions.additionalDirectories` = `<sealed>`, `<harness>`; `allow` (an absolute path in a rule starts with `//`) = `Edit(//Users/hbchuc/Documents/programing/vibe-code/hstack/.evidence/bench/heldout/**)`, `Read(//Users/hbchuc/Documents/programing/vibe-code/outsourcing-hstack/**)`, `Read(//Users/hbchuc/Documents/programing/vibe-code/hstack/.evidence/replay.md)`, and `Bash(…:*)` prefixes for `git -C <copy>` `log`, `show`, `diff`, `blame`, `rev-list`, `grep`; `git -C <harness>` `log`, `show`; `git apply -R --check`; `grep`, `head`, `wc`. `extension.md` says: you are building the held-out set of a bug replay; never edit any file outside `<sealed>`, and run git only as `git -C <repo> …` with no pipes. (1) Catalog part: from the `hunks` table of `.evidence/replay.md`, every row whose commit is none of the 11 commits of its `replay_set` table and not 730509b, with `reverts_cleanly = yes` and a same-commit test (expected 10). (2) Extension part: commits of `<copy>` up to 69ebe27 that the catalog did not consider (its notes name the 36 candidates it considered): commits its grep missed, the fix plans 7a, 7b, 9 and 10, the carried fix waves; read their subjects, and for who found what, the entries of `<harness>/progress/`. Take each source hunk (no tests, docs, generated files, comment- or whitespace-only hunks) that restores behaviour the code intended (a fix, not a requirement change), has a test added or changed in the same commit that checks it, and whose patch passes the check; skip merge commits, the 11 dev commits and 730509b. For each bug write `ho-NN.json` (numbered in commit order, catalog first) = `{ id, source, fix, at: "69ebe27", patch: "ho-NN.patch", hunks: [{ file, old }], kind, severity, description }` and `ho-NN.patch`: `hunks` from `git -C <copy> diff -U0 --no-renames <fix>^ <fix>` (`old` = the old-side start of the hunk header); `kind` one of UI, logic, validation, data, other; `severity` high (data lost or corrupted, a security or privacy leak, money or legal facts wrong, a main flow blocked), medium (wrong behaviour a user sees or stored data changed, with a way around), low (looks, wording, a rare edge); `description` = the commit subject's clause and the test title, quoted, as in this example: `"show 0 bedrooms of a building". Test title: "…"`; the patch is the fix hunk **in the fix's direction** (removed lines = the buggy code, added lines = the fix) with context lines as they are at 69ebe27, so that `git apply -R --check <sealed>/ho-NN.patch` passes in your working folder (the files of 69ebe27). A hunk that cannot be made to pass is not written. Reply only with counts by part, kind and severity.
- [ ] **Step 6: Run** `bun bench/sealed-agent.mjs <data>/env/real-estate-long.json extension --at 69ebe27 --tools Read,Write,Edit,Bash,Glob,Grep --settings <data>/briefs/extension-settings.json --prompt <data>/briefs/extension.md --out <sealed>/extension.reply.md`. Nobody reads the reply.
- [ ] **Step 7: Check:** `bun bench/bugs.mjs <data>/env/real-estate.json <sealed> --sealed`. Expected: `source catalog` = 10, no invalid file, no id with a patch that does not apply. Ids that fail go back to the agent in one sealed fix run (same flags, label `extension-fix1`, `--out <sealed>/extension-fix1.reply.md`, a prompt naming the ids and asking to fix each patch or set `"dropped": "<reason>"`); at most 2 fix runs, then `bugs.mjs` counts what remains. A catalog count other than 10 stops the task (report the number only). `git -C <copy> status` clean; `ls /tmp/hstack-bench-outside.txt` absent.
- [ ] **Step 8: Record** in `progress/progress.md` only what `bugs.mjs --sealed` printed (counts, usable per layer, usage); commit.

### Task 5: Replay runs (item 2)

**Files:**
- Create (gitignored): `<data>/env/real-estate/batch.sh`; `<data>/results/<id>-<layer>.{json,out}`, `<data>/results/baseline-re-69ebe27-<layer>.xml`; `<data>/replay-dev/pg/<batch>-{before,after}.txt`; `<sealed>/logs/`
- Modify: `progress/progress.md`

**Interfaces:**
- Consumes: `bun bench/replay.mjs`, `bun bench/agent-replay.mjs`, `bun bench/bugs.mjs --usable`, `pgsnap.sh` (Task 2), the swept inputs (Task 1).
- Produces: one verdict per (bug, layer): test layers `results/<id>-<layer>.out` (the CLI's stdout, last line `<id> caught|missed|error`), agent layers `results/<id>-<layer>.json` (agent-replay's record); consumed by Task 6.

- [ ] **Step 1: Write `batch.sh <layer> <bug folder> [--sealed]`:** snapshot to `replay-dev/pg/<layer>-<folder name>-before.txt`; for each path of `bun bench/bugs.mjs <data>/env/real-estate.json <folder> --usable <layer>`: run `replay.mjs` (unit, int, e2e; stdout to `results/<id>-<layer>.out`) or `agent-replay.mjs` (evaluator, review, audit), passing `--sealed` through; with `--sealed` stderr goes to `<sealed>/logs/<id>-<layer>.err`, else to `replay-dev/logs/`; a verdict `error` renames the `.out` or `.json` to `.error1.*` and reruns once; a second `error` stays. Then the after snapshot, and a check that before and after are equal once `bench_*` names are removed (else exit 1 and stop every batch).
- [ ] **Step 2: Test batches, one at a time** (port 3000, `bench_re`): `sh batch.sh unit <sealed> --sealed`, then `int`, then `e2e`. The first bug of each layer builds its baseline; a baseline with failing cases is recorded with the names of those cases (dev mode is not used on held-out, so the count comes from the baseline file).
- [ ] **Step 3: Evaluator batch** after the test batches: `sh batch.sh evaluator <sealed> --sealed`.
- [ ] **Step 4: Review and audit batches**, alongside Steps 2–3, at most 4 claude processes at once in all: `sh batch.sh review <data>/replay-dev/bugs` and `sh batch.sh audit <data>/replay-dev/bugs` (dev mode: findings and quote kept for the human check of prereg step 9), then `review` and `audit` on `<sealed> --sealed`.
- [ ] **Step 5: Expected counts:** `.out` files = 3 × usable test-layer bugs; evaluator records = usable evaluator bugs; review and audit records = 18 dev + usable held-out each. No `error` left unexplained: each is recorded with its layer and whether the rerun cleared it.
- [ ] **Step 6: Clean check** after the last batch: `bun bench/env.mjs clean`; no `bench_*` in a fresh snapshot; nothing on :3000; `/tmp/hstack-bench` empty; `git -C <copy> status` clean, one worktree.
- [ ] **Step 7: Record** in `progress/progress.md`: per batch, wall clock, runs, reruns, summed usage of its records.

### Task 6: Summary and lock

**Files:**
- Create: `bench/replay-summary.mjs`, `tests/bench-replay-summary.test.mjs`, `progress/step3-lock.md`
- Modify: `bench/README.md`, `docs/log.md`, `docs/plans/index.md`

**Interfaces:**
- Consumes: `results/` (Task 5), the bug folders.
- Produces: CLI `bun bench/replay-summary.mjs <results dir> --set <name>=<bug folder> [--set …]` printing markdown: per layer and set, n (records), caught, missed, error, catch rate over caught + missed; `unit+int` = a bug caught by either; per set with severities, the severity-weighted catch rate (high 3, medium 2, low 1; error runs left out); per layer, summed `layer` + `judge` usage (input/output/cacheRead/cacheWrite) and models; a per-bug table of ids and verdicts. It never prints a description, quote, finding, fix, file or hunk, even when a record or bug file holds one.

- [ ] **Step 1: Write the failing tests:** 'counts caught, missed and error per layer and set'; 'unit+int counts a bug caught by either'; 'weighted rate uses 3/2/1 and leaves error runs out'; 'prints no description, quote or finding even when the files hold them' (fixture record with `findings` and `quote`, bug file with `description`).
- [ ] **Step 2: Run** `bun test tests/bench-replay-summary.test.mjs` — expect FAIL.
- [ ] **Step 3: Implement**; `bun test ./tests` all pass; README line; commit.
- [ ] **Step 4: Lock file** `progress/step3-lock.md`: the summary for `--set dev=<data>/replay-dev/bugs --set heldout=<sealed>`, next to the dev results that stand (unit + int 1/20, e2e 0/15, evaluator 1/14, review 17/20 by the record); the commit of `bench/` (`git rev-parse HEAD`, `git status --short bench` empty); `shasum -a 256` of every file under `<sealed>` except `logs/`, of `results/*`, of the 16 inputs and sheets, `briefs/*`, `env/real-estate/briefs/*`, `env/real-estate.json` and `tasks.json` (paths relative to `<data>`; the held-out names are opaque).
- [ ] **Step 5: Commit** `git commit -m "Lock the step 3 replay result with the hashes of the held-out set"`; add the plan to `docs/plans/index.md` and the build to `docs/log.md`. From this commit the held-out commits may be opened as oracle sources (prereg §8.2, step 5).

## Known limits

- The `framework name` rule is a list from these 16 inputs; another stack needs its own names (the shape rules are generic).
- An `old` hunk position written by the extension agent is trusted; a wrong one gives a wrong owner, which no person may check before the lock.
- The extension agent's eligibility judgements (fix or requirement change, test that checks it) are one agent's; prereg §6.1's two-labeller rule applies to oracle sources, not to the replay set.
- Review and audit run once per bug: one sample, no repeat.
- The evaluator's shell can still reach the app worktree's `.env` (a `bench_` database); the guard is the empty env and the brief, as before.

## Not in this plan

Labelling and opening the held-out commits as oracle sources (step 5); the keep/drop judgement of each layer by §8.4 (it needs the seeded bugs of step 7); the human read of the dev review quotes (step 9).
