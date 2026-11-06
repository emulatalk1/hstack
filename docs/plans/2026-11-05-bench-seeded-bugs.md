---
type: plan
title: "Seeded bugs plan"
description: "Prereg step 7: seed single-hunk bugs at edges on the reference of every external task and of nine real-estate tasks, each with a black-box check validated to fail on the bug and pass on the reference, sealed like the held-out set, with the rules for how the oracles, section 8.4 and H5 read them."
status: stable
generated: { by: claude-code/2.1.318, at: "2026-11-05T23:40:00+07:00" }
verified:
  - { by: claude-code-advisor/2.1.318, at: "2026-11-06T00:10:00+07:00" }
  - { by: human:emulatalk1, at: "2026-11-06T18:55:00+07:00" }
sources:
  - id: prereg
    resource: /plans/2026-10-27-benchmark-prereg.md
  - id: step-oracles
    resource: /plans/2026-11-05-bench-step-oracles.md
---

# Seeded Bugs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prereg section 12 step 7 done: for each of the 24 kept external tasks 3 seeded bugs and for 9 real-estate tasks 1 each (target 81), every bug a single-hunk commit on top of the reference, at an edge, with a black-box check that passes on the reference and fails on the bug; all of it sealed and hashed in `progress/step7-lock.md`.

**Architecture:** One new command, `bun bench/oracle.mjs seed`, in the shape of `step`: one sealed seeder per task writes candidates and their checks, the tool turns each candidate into a commit in a sealed bare repo, and `bench/grade.mjs` grades the task's `<task>/seeded/oracle/` as it is, at the reference and then at each bug. A second command, `kills`, grades the existing oracles at the kept bugs. Everything that reads a bug or a check is a sealed agent; the tools print only counts and verdicts.

**Tech Stack:** Bun 1.4.4+, `bun:test`, git (`init --bare` with alternates, `commit-tree`), the `claude` CLI through `bench/sealed-agent.mjs`, Docker through `bench/ext.mjs oracle-run`, Playwright (the real-estate scaffold), Postgres `bench_re`.

**Spec:** `docs/plans/2026-10-27-benchmark-prereg.md` sections 2 ("Applied at step 6" and its build addendum), 7.1 (rulings, addendum), 7.3, 8.2, 8.3, 8.4, 9.1, 10.2, 12 (steps 7–10); the locks `progress/step5-lock.md` (ruling 7: a seeded bug must be a commit) and `progress/step6-lock.md`; the tools as built: `bench/README.md`.

## Rulings the prereg leaves open (Task 1 registers them in section 8.3 before any seeder runs)

1. **Scope.** External: the 24 kept tasks of `<data>/ext/sample.tsv`. Real-estate: the 9 tasks that meet rule (b) at the step 5 lock, p1, p2, p3, p4, p6a, p8a, p8c, p8d, p8e, one bug each (the user's decision below). p8b is trial-only and p5, p6b, p6c, p7b, p7c do not meet rule (b) today, so none get a bug. A task the step 11 walk adds runs `seed` then, and the stick v1 lock is amended (section 2, the user's decision of 2026-11-05).
2. **Candidates and the kept bugs.** The seeder writes **5 candidates for an external task and 2 for a real-estate task**. The kept bugs are the first 3 (real-estate: 1) that end `valid`, in the order of `queuePick(ids, ids.length, seed)`, seed `hstack-bench-2026-10-27`. The tool grades in that order and stops at the count, so a spare is graded only when an earlier one was dropped. Section 8.3's "dropped" stands: a dropped bug is not fixed, and no seeder runs again because a verdict was bad. The spare is fixed up front because 81 is a power target (10.2): after this, a low count has no second round, and the lock reports the final n and its half-width.
3. **What the seeder sees (8.3: "only the reference solution and the requirement").** `<task>/input.md`, the files of the end commit (`--at <end>`, read only), and the list of changed ranges of `git diff -U0 --no-renames <base> <end>`, test files left out. For a working check it also gets mechanics: external, the task recipe and the serve recipe; real-estate, the scaffold and `briefs/oracle-re.md`. It never sees the oracle, the step oracle, `labels.json`, the interface sheet, `ext/sealed/`, the PR's text or another seeder's work. The end's export holds the PR's tests, which are part of the reference, so a seeded check may mirror one. That is harmless: seeded checks are in no H1 or H2 score, and `kills` (ruling 10) measures the overlap.
4. **The bug.** Each candidate is one edit `{ file, find, replace }` plus `edge` in `empty, null, duplicate, case, deleted, boundary`. An edit, not a diff, because an agent misnumbers hunks. The tool refuses a candidate, with one reason word, when: `edge` is not one of the six; `file` is a test path (`isTestPath` or the stack's `testPaths`) or is missing at the end; `find` does not occur exactly once in the file; `find` equals `replace`; `git diff -U0 <end> <bug>` has more or fewer than one hunk; or the hunk's line is not within 3 lines of a changed range. The last gate keeps a bug in code the task wrote: a suite written for the task has no reason to guard anything else. A refused candidate gets no commit and no run.
5. **Where a bug lives.** `<data>/seeded/repos/<key>.git`, a bare repo made by `git init --bare` whose `objects/info/alternates` points at the objects of the task's repo, with that repo's `shallow` file copied in on every `seedRepo` call when it has one (`<key>` = the repo folder's name, one per repo, so a repo with two tasks has one), with each bug a commit made by `hash-object`, `read-tree`, `update-index`, `write-tree` and `commit-tree -p <end>`, message `seeded`, author `bench`, a fixed date, under `refs/seeded/<bug id>`. Nothing is written to the real-estate copy or `ext/repos/`, so no `git log --all`, worktree or arm can reach a bug. The same edit gives the same sha. Grading goes through `<data>/env/seeded/<name>.json`, the task file with only `repo` changed. Tried by hand on a throwaway repo: the bare repo resolves a dangling end through its alternates, `worktree add` and `git archive HEAD` work, and the commit is missing from the source repo. A `git clone --bare --shared` is not used: of a shallow source it gives an empty repo, and every `ext/repos/*` is bare and shallow.
6. **The check.** New, one per candidate, written by the seeder in the same run (8.3: "comes with"), in `<task>/seeded/oracle/` with the rules of step 5 ruling 9: public interface, `PRECONDITION:` first, severity by the same rule. External folders have their own `runner.json`. The writer gates apply (`judge`, `runOnly`, `parseRunner`). Ids are `<end7>-T<n>`, numbered after the highest of that prefix in every `oracle/`, `step/oracle/` and `seeded/oracle/`. `origin` is `<file>::<edge>`, so the leak gate refuses a check that names the seeded file. `interface: none` is refused: a bug with no black-box check fails 8.3.
7. **Validation (8.3).** A check is judged against its own bug only. `grade --validate <end> --bad <b1> --bad <b2>` over one folder cannot be used: a check passes on the other bugs and would read `weak`. So the tool runs `grade <seeded env> <task>/seeded/oracle --at <commit> --sealed --reuse` at the end and at each bug, and takes `verdict({ ref, bad: <own bug's result>, base: 'pass' })`: `pass` then `fail` is `valid`, `pass` then `pass` is `weak`, anything else is `broken`. So `precondition` at the bug is `broken`: an edge bug leaves the feature there, unlike ruling 10's `absent-at-base`. A bug that stops the build or the start gives no result and is `error`, never `valid`. Verdicts go to `<task>/seeded/validation-<end7>.json` in the existing shape, so `grade` lists them under `excluded` when a product is graded.
8. **Mechanics (7.1, step 5 ruling 11).** The end is graded first. A check that does not pass there gets at most 2 rounds of the existing `fixRound` (`work/fix-seeded-<r>/`, with its comparer), each followed by a run at the end. Bugs are graded only after that, on a frozen folder. A check that still does not pass at the end is `broken`. A verdict at a bug gets no fixer. A run at the end that never gets ready, or gives no JUnit, is `not judged`: nothing is dropped, and the task is run again (a machine failure is never an out). A bug run with no JUnit reads `error`; a task with `error` in its `seed` line, or `not judged`, is run once more, after a prune when the cache is above 15 GB, and that result stands.
9. **In no score.** Seeded checks are not classified and are in neither H1 nor H2. `floorScore` never reads `<task>/seeded/`.
10. **Relation to the oracles (7.1, 8.4).** Section 7.1 says seeded bugs "add known-bad versions". They cannot be added to `--validate`: a check that guards another behaviour passes on a seeded bug, and it would read `weak`. So a seeded bug changes no verdict of step 5 or 6, and no lock file changes. The sentence is met by a recorded matrix: `kills` runs `grade <seeded env> <task>/oracle --at <end> --sealed --reuse` first, which is free where the end's grade is still good (every external task has one, as have the 9 real-estate tasks and the 5 of them with a step oracle), then the same `--at <bug>` for each kept bug, and for a task whose `step.json` names `step/oracle` the same on `<task>/step/oracle`. It writes `<task>/seeded/kills.json`: per bug, how many checks passed at the end and did not pass at the bug (a result of `error` does not count), out of how many, for the fix-commit oracle and the step oracle. `score <task> <bug>` works on those grades unchanged.
11. **How later steps read them.**
    - **7.3 (canary diagnosis):** `grade env/<task>.json <task>/seeded/oracle --at <product> --sealed`.
    - **8.4, the independent-oracle layer:** `kills.json`.
    - **8.4, weights and pairing:** the bug's `severity` (high 3, medium 2, low 1); McNemar pairs by bug id.
    - **8.4, discovery layers (review, audit):** the `agent-replay` of the held-out set, on the task's diff with the bug commit as its end, judged on the bug's `description`. The change to `agent-replay` belongs to the plan of step 13, not here.
    - **H5 and the arm's own test layers:** the user's decision below.
12. **Layout.** `<task>/seeded/` holds `oracle/`, `bugs.json`, `validation-<end7>.json`, `kills.json`, `grades/`, `logs/`, `work/`. A `bugs.json` entry is `{ id: "sb-<task>-<k>", task, base, end: <the bug commit>, fix: <the reference>, check, edge, severity, description, behaviour, hunk: { file, old }, edit, state: "kept"|"dropped"|"ungraded", why }`. `base`, `end`, `fix` and `description` are the names `readBug` and `agent-replay` use for a review or audit bug, so step 13 needs no translation. The `edit` rebuilds the commit if a sealed repo is lost. Grades of the existing oracles at a bug add `<task>/grades/<bug7>.json` and `<task>/step/grades/<bug7>.json`; these are new files, and nothing hashed in the step 5 or step 6 lock changes.
13. **Docker.** As the user's rules below, one external task at a time, with these measured costs.

## Decided by the user (asked with this plan)

Decided on 2026-11-06, as proposed: 1 bug on each of the 9 tasks; H5 by option 1, with `fail` at P counted as a miss; `kills` runs in this step (ruling 10), not at step 14.

- **Real-estate: which tasks and how the 9 spread.** Decided: 1 bug on each of the 9 tasks that meet rule (b) (p1, p2, p3, p4, p6a, p8a, p8c, p8d, p8e). They are the tasks sure to run (section 4.1 keeps at most 12, and at most 10 qualify; step 9 can only add), and nine tasks give nine independent bugs, where 3 × 3 gives correlated ones. Alternative: 3 bugs on each of 3 tasks by `queuePick`. p1–p4 have no step oracle, so `kills` has only the fix-commit oracle there. Nothing else differs.
- **How H5 and the arms' test layers read a seeded bug.** The prereg is silent, and a seeded bug sits on the reference while an arm's suite sits on the arm's product. The build below is the same under every option; this fixes the text registered in 8.3 and the plan of step 13. Decided: option 1.
  1. **Port, gated by the check.** For a product P and bug b with check c: grade c at P. `precondition` or `error`: b does not apply to P, not counted, the number reported. `fail`: the defect is already in P and P's suite passed with it. This option counts that as a miss, a choice: P has the edge wrong and its suite did not notice, though no bug was injected. The other choice is to leave it out as not applying, which raises the rate for a product that gets edges wrong. `pass`: one sealed porter (sees b's description and edit, and P's files) writes one edit on P; the port counts only when c passes at P and fails at P + edit; otherwise it does not apply. Then P's suite runs at P and at P + edit: caught when a test that passes at P fails there. This measures what H5 says, the suite guarding its own product. Cost: about 81 × 3 runs × 0.1M = 24M tokens per arm measured, plus the suite runs; section 11 has no row for it.
  2. **Apply the hunk to the product.** No agent, but the edit's `find` will rarely match another team's code, so most bugs would not apply.
  3. **Move the suite to the reference.** Copy P's test files onto the end and the bug and run them there: no agent, but a unit test that imports P's own module fails at the reference, so this measures how alike the two products are, and it marks down unit tests most.
  4. **Outcome only.** Grade `seeded/oracle` on P, catch = pass. No agent, and it runs anyway for 7.3, but it says whether P has the edge right, not whether P's suite would notice. It cannot be H5.

## Expected size

Measured, from the `at` of the step 5 grades (end, then base): one external run takes 1–16 min, mean 4.9, 117 min for one run of each of the 24 tasks. These were warm-cache runs, so cold ones after a prune take longer. Real-estate: about 2.3 min a run (step 6, 24 runs in 56 min).

| lane | runs | time |
|---|---|---|
| external `seed` | end 1, fixer passes about 0.4, bugs 3–5: about 5 per task, 120 | about 10 h |
| external `kills` | 3 per task, 72 | about 6 h |
| real-estate `seed` | end 1, bugs 1–2, fixers: about 3 per task, 27 | about 1 h |
| real-estate `kills` | 1 per bug, plus 1 for the 5 tasks with a step oracle: 14 | about 35 min |

**Disk.** Docker holds 7.6 GB of memory and a VM disk of about 58 GB, with 22.38 GB of build cache now. `oracle-run` removes its own images and containers by their recorded names when each run ends, so only the cache grows (step 5: about 6 GB/h). The driver runs `docker builder prune -f` before the first task, and before any task when the cache is above 15 GB (ruling 36). A task with `error` in its `seed` line, or `not judged`, is run once more (ruling 8 of this plan). `diskFloor` still stops at 15 GB free. Sealed repos use alternates, so they add a few MB.

**Tokens.** About 33 seeders and their fixers; 8.1M by section 11's 81 × 0.1M. Each task records what it took.

## Global Constraints

- Bun only, no new dependency in `bench/`; tests run with `bun test ./tests`, output pristine. `bench/` names no stack, tool, customer or task; briefs live in `<data>`. `<data>` = `/Users/hbchuc/Documents/programing/vibe-code/hstack/.evidence/bench` (gitignored, main checkout). Set `HSTACK_BENCH_MACHINE=<data>/machine.json` for every bench command.
- Never write under `/Users/hbchuc/Documents/programing/vibe-code/outsourcing/`. Never touch `real_estate*` databases; real-estate grading uses only `bench_re`, one grade at a time. `sh <data>/env/real-estate/pgsnap.sh` before and after each batch; the two lists must be equal.
- **Docker.** Never `prune`, `volume`, `compose` or `network`, except `docker builder prune -f`. Image or container removal only by the names a step recorded. Docker stays at 7.6 GB. External tasks run one at a time, which also covers the shared dummy ports (s2-08, s2-09, s2-10; s1-09's partner s1-08 is retired). The real-estate lane may run beside it.
- **External code.** Never run on the host. A commit is materialised only by `git archive` or a worktree under `/tmp/hstack-bench/`.
- **Sealing.** Sealed (read only by `bench/` tools and sealed agents): everything step 6 sealed, plus `<data>/seeded/`, `<task>/seeded/oracle/`, `bugs.json`, `work/` and `logs/`. The implementer, reviewer and controller read only `*.run.json`, the tools' printed lines, validation and grade verdicts (ids and results), `kills.json` and counts; never `cat`, `grep`, `git show` or list a sealed file's content. Never read `ext/raw/`, `ext/sealed/` or `heldout/`. `bun bench/bugs.mjs` runs only with `--usable`, `--fix-tally` or `--at-tally`. Replies to the user hold only counts and verdicts.
- Every grade of an oracle runs with `--sealed`.
- This session is not the plugin-design session (section 12, step 10); no agent that writes a bug or a check shares context with it.
- Sealed agents run only through `bench/sealed-agent.mjs`; the seeder gets `--settings` granting `Write` and `Edit` under its own output folder only.
- Record each task's usage in `progress/progress.md` (implementer and reviewer tokens and minutes, the sum of every sealed agent's `.run.json`, wall clock of the runs). Copy the SDD ledger into `progress/progress.md` before the final review. The plan goes `stable` only after the user approves the build.
- Docs, briefs, logs and commit messages in English.

## Review Focus

1. A check is judged against a bug that is not its own, so a good check reads `weak`, or a bug's result lands on another check. Expected: each check against its own bug only. Test: Task 2 'ownVerdict judges a check against its own bug only'; Task 4 'a check that passes on another bug stays valid'.
2. A bug that breaks the build or the start reads `valid` because every check failed. Expected: no JUnit, or a missing case, reads `error` and is dropped. Test: Task 4 'a bug with no results is error and the next spare is graded'.
3. A machine failure at the end drops bugs. Expected: `not judged`, nothing dropped, the rerun resumes. Test: Task 4 'an end run that never gets ready is not judged'.
4. A seed run changes a file the locks hashed, or writes to a source repo. Expected: writes only under `<task>/seeded/`, `<data>/seeded/`, `<data>/env/seeded/`. Test: Task 3 'a seeded commit exists only in the sealed repo'; Task 4 'seed writes only under seeded'.
5. A spare is kept out of order, or graded when the count is already met. Expected: `queuePick` order, stop at the count. Test: Task 4 'bugs are graded in queuePick order and stop at the count'.

---

### Task 1: Register the rulings

**Files:**
- Modify: `docs/plans/2026-10-27-benchmark-prereg.md` (section 8.3, a dated paragraph), `docs/plans/index.md`, `docs/log.md`

- [ ] **Step 1:** Write the 8.3 paragraph "Applied at step 7 (2026-11-05)": rulings 1–13, the user's two decisions as decided, ending "registered before any seeder runs; `bench/oracle.mjs seed` has not run". Add one line under 7.1's sentence on known-bad versions pointing to ruling 10, one under 8.4 pointing to ruling 11, and in H5's row or just below the table the reading the user chose. Add the plan to `docs/plans/index.md` and an **Update** line to `docs/log.md`. Commit `git commit -m "Register the seeded-bug rulings before any seeder runs"`.

### Task 2: Pure rules

**Files:**
- Modify: `bench/lib/oracle.mjs`, `bench/lib/score.mjs`, `tests/bench-oracle.test.mjs`, `tests/bench-score.test.mjs`

**Interfaces:**
- Produces:
  - `changedRanges(diff: string) -> [{ file, start, end }]`: the new-side ranges of a `-U0` diff (a pure deletion: `start` = `end` = the line it follows).
  - `inChanged({ file, old }, ranges, pad = 3) -> boolean`.
  - `applyEdit(text, find, replace) -> string | null`: null unless `find` occurs exactly once and differs from `replace`.
  - `EDGES = ['empty', 'null', 'duplicate', 'case', 'deleted', 'boundary']`.
  - `ownVerdict(end: result, bug: result) -> 'valid'|'weak'|'broken'|'error'`: `error` when `bug` is `error` and `end` is `pass`, else `verdict({ ref: end, bad: bug, base: 'pass' })`.
  - `killsOf(endGrade, bugGrade) -> { killed, of }`: over checks not in `excluded` that pass in `endGrade`, those whose result in `bugGrade` is `fail` or `precondition`.

- [ ] **Step 1: Write the failing tests:** 'changedRanges reads added, changed and deleted hunks'; 'inChanged takes a line within pad and refuses another file'; 'applyEdit refuses zero, two and identical matches'; 'ownVerdict judges a check against its own bug only' (`pass,fail` valid; `pass,pass` weak; `pass,precondition` broken; `pass,error` error; `fail,fail` broken); 'killsOf counts only checks that passed at the end and leaves out excluded and error'.
- [ ] **Step 2: Run** `bun test tests/bench-oracle.test.mjs tests/bench-score.test.mjs` — expect FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `bun test ./tests` — all pass, output pristine. Commit `git commit -m "Add the seeded-bug rules: changed ranges, one-match edits, a verdict per own bug, kills"`.

### Task 3: The sealed repo and the bug commit

**Files:**
- Modify: `bench/oracle.mjs`, `tests/bench-oracle.test.mjs`

**Interfaces:**
- Consumes: `applyEdit`, `diffHunks`, `changedRanges`, `inChanged`, `isTestPath`, `gitOut`, `loadTask`.
- Produces:
  - `seedRepo(data, taskFile) -> envFile`: makes `<data>/seeded/repos/<key>.git` when missing and writes `<data>/env/seeded/<name>.json`, the task file with only `repo` changed; idempotent.
  - `seedCommit(repo, end, { file, find, replace }, id, { base, testPaths }) -> { commit, hunk } | { why }`: the gates of ruling 4 (`why` one of `edge`, `test file`, `no file`, `find`, `hunks`, `outside`); the commit by the plumbing of ruling 5, `refs/seeded/<id>`, fixed author and date.
  - `highestOf` reads `seeded/oracle/manifest.json` too.

- [ ] **Step 1: Write the failing tests** (a real fixture repo): 'seedRepo makes a bare repo on the source's objects and an env file that differs only in repo'; 'seedRepo sees a dangling end through its alternates'; 'a seeded commit exists only in the sealed repo'; 'the same edit gives the same sha'; 'seedCommit refuses a test file, a two-hunk edit and a line outside the changed ranges'; 'a worktree of the sealed repo archives the bug at HEAD' (the path `oracle-run` takes); 'loadTask accepts the seeded env file'; 'highestOf counts seeded manifests'.
- [ ] **Step 2: Run** — FAIL; implement; `bun test ./tests` pass. Commit `git commit -m "Make seeded bugs commits in a sealed bare repo, with the gates of a single hunk in the task's code"`.

### Task 4: The seed and kills commands

**Files:**
- Modify: `bench/oracle.mjs`, `bench/README.md`, `tests/bench-oracle.test.mjs`
- Create (gitignored): `<data>/ext/briefs/seed.md`, `<data>/briefs/seed-re.md`

**Interfaces:**
- Consumes: `seedRepo`, `seedCommit`, `ownVerdict`, `killsOf`, `queuePick`, `writer`, `judge`, `parseRunner`, `runOnly`, `scaffoldInto`, `fixRound`, `notReadyOf`, `removeRecorded`, `taskCtx`, `clCtx`, `taskOf`.
- Produces:
  - `bun bench/oracle.mjs seed <task>` (external, 5 candidates, keep 3) and `seed <task.json> <task>` (real-estate, 2, keep 1), in order, each stage reusing its record:
    1. `seedRepo`; seeder `seed-<task>` into `seeded/work/seed/` through `writer`, tools `Read,Glob,Grep,Write,Edit`, `--at <end>`; prompt: the brief, external `ext/briefs/oracle.md` or real-estate `briefs/oracle-re.md`, the input fenced, the changed ranges, the count, the ids, the mechanics of ruling 3, the folder.
    2. `judge` (`() => task` as owner) and, for external, `runner.json`; then `seedCommit` per entry; accepted checks into `seeded/oracle/` when the writer ran or none is there yet (the `stepRe` pattern, so a rerun keeps a fixer's work), and the ids go into the seeder's run record and are read back from it (the `recIds` pattern, so a rerun after another task's manifest grew cannot renumber them); a real-estate folder gets `scaffoldInto`. `edge` and `edit` stay in `bugs.json`, not in the manifest.
    3. `grade` at the end; `not ready` or no JUnit there prints `<task> seed not judged` and exits 1.
    4. at most 2 `fixRound`s over checks that did not pass at the end, each followed by a grade at the end.
    5. over `queuePick` of the candidates that pass at the end: `grade` at the bug, `ownVerdict`, stop at the count. Writes `seeded/validation-<end7>.json` and `seeded/bugs.json`. External: `removeRecorded`.
  
    Prints only `<task> seed candidates=<c> refused=<r> pass-at-end=<p> fixer=<f> graded=<g> valid=<v> weak=<w> broken=<b> error=<e> kept=<k>`.
  - `bun bench/oracle.mjs kills <task>` / `kills <task.json> <task>`: ruling 10; writes `seeded/kills.json`; prints only `<task> kills bugs=<b> fix=<killed bugs>/<b> step=<killed bugs>/<b>|none`.

- [ ] **Step 1: Write the briefs.** `seed.md` and `seed-re.md`: you hold the reference solution and its requirement; propose the given number of bugs a builder could plausibly make at an edge the task's code handles, one each from `empty, null, duplicate, case, deleted, boundary` where you can, each inside the listed ranges; the six words name edges of the input or the data (`deleted` is how the code behaves when an item has been deleted, not code removed), and the feature stays, so the check's precondition still passes on the bug; an edit `{ file, find, replace }` with `find` copied exactly and unique in the file, one contiguous change; each with one black-box check under the rules below that passes on the reference and fails only because of this bug; `description` says the defect in one sentence and `behaviour` what the check asserts; ignore the rules below about rewriting a given test. No repo, stack or customer named.
- [ ] **Step 2: Write the failing tests** (fake agent, fake grade, fixture repo): 'seed writes only under seeded'; 'a refused candidate gets no commit and no run'; 'bugs are graded in queuePick order and stop at the count'; 'a check that passes on another bug stays valid'; 'a bug with no results is error and the next spare is graded'; 'a check that fails at the end gets a fixer round and bugs wait for it' (`fixRound` with an empty `bad`); 'a verdict at a bug gets no fixer'; 'an end run that never gets ready is not judged'; 'a rerun reuses the seeder record, the grades and a fixer's work and keeps the ids when another manifest grew'; 'validation lists a dropped check so grade excludes it'; 'seed and kills print only counts'; 'kills grades the step oracle only when step.json names it'.
- [ ] **Step 3: Run** — FAIL; implement; README: both commands; `bun test ./tests` pass. Commit `git commit -m "Add the seed and kills commands: bugs and checks by a sealed seeder, a verdict per own bug"`.

### Task 5: Pilot

- [ ] **Step 1:** `pgsnap`; `docker builder prune -f` (cache above 15 GB); run `seed` on the first kept task of each stack that is not a cold-setup repo and on p8a, one at a time; record each line and usage.
- [ ] **Step 2:** Read the lines. If a brief or tool must change, by a reason that depends on no bug's content, change it, void the pilot's `seeded/` folders unread, delete their refs with `git update-ref -d refs/seeded/<id>` (a same-sha commit would otherwise look kept), and rerun under one brief, as the step 6 lister was. A change is recorded as a ruling. Otherwise the pilot's results stand.

### Task 6: All tasks

**Files:**
- Create (gitignored): `<data>/logs/step7/run-ext.sh`, `run-re.sh`, `counts.mjs`
- Modify: `progress/progress.md`

- [ ] **Step 1:** Write the drivers: external one task at a time in `sample.tsv` order, the cache rule of "Disk" before each, a stop on exit 3; real-estate one at a time, `pgsnap` around the batch.
- [ ] **Step 2:** Run both lanes detached. Rerun each `not judged` task, and each task with `error` in its `seed` line, once. Record every line.
- [ ] **Step 3:** `counts.mjs` prints per task and per set: candidates, refused by reason word, valid, weak, broken, error, kept; kept by `edge` and `severity`. It prints no description, edit or file. Report the final n against 81 and its half-width at p = 0.3 (10.2). A task below its count is reported to the user, not reseeded.

### Task 7: Kills

- [ ] **Step 1:** Run `kills` for every task with a kept bug, the same two lanes and rules; record each line and the per-set shares: bugs the fix-commit oracle kills, bugs the step oracle kills.

### Task 8: Lock

**Files:**
- Create: `progress/step7-lock.md`
- Modify: `docs/log.md`, `progress/progress.md`

- [ ] **Step 1: Check:** every kept external task has `seeded/bugs.json` and `validation-<end7>.json`; a run of `for-each-ref refs/seeded` per sealed repo matches `bugs.json`; `bun test ./tests` pass; `git status --short bench` empty; `ext/repos/*` and the real-estate copy have no `refs/seeded` ref; `lock5-compare.mjs` and the same compare of the step 6 hashes report 0 changed (`docker.json` and `build/readiness.tsv`, which `oracle-run` rewrites, are in neither lock's hashes; a reused end grade is written back byte for byte, and this compare proves it); the Docker names left are those before the step; pgsnap lists equal.
- [ ] **Step 2: Write** `progress/step7-lock.md`: the rulings; per task the counts of Task 6; per set kept by edge and severity, final n and half-width; the `kills` shares; bug ids with commit sha (no content); `shasum -a 256` of every `seeded/` file, env file, brief and driver (paths relative to `<data>`); the `bench/` commit; open points.
- [ ] **Step 3: Record** usage in `progress/progress.md`; **Creation** line in `docs/log.md`; commit `git commit -m "Lock the seeded bugs of step 7 with verdicts, kills and hashes"`.

## Known limits

- The seeder writes the bug and its check together, so the check is the bug's own: it proves the bug is observable, not that it is one a builder would make, and `severity` is the seeder's judgement. No second labeller reads them (section 8.2 has one for the held-out set; 8.3 has none).
- A check that passes at the end once and fails at the bug once is `valid`: a flaky check can pass this. Section 13's rerun is the guard.
- A bug in a small PR has few places to sit, so a task may stay under its count.
- The sealed repos depend on their source through alternates: losing `ext/repos/` or the copy loses them, and `bugs.json`'s `edit` rebuilds them on the same sha.
- A step 9 second batch changes a real-estate `oracle/`, so its `kills` grades stop being reused and step 10 runs `kills` again for those tasks.
- A seeded bug is on the reference, not on an arm's product (see the H5 decision).
- `agent-replay` refuses a bug whose `fix` is inside its `end`, which every seeded bug is (the reference is the bug commit's parent), and the evaluator layer wants a `patch` file `bugs.json` does not hold. Both are changes for the plan of step 13.
- A bug at an edge the task's code does not handle cannot be seeded by editing it. A missing branch is reachable only by deleting one, so the seeded set leans to code that exists.

## Not in this plan

The canary (step 8); every human read (step 9, which gains nothing from this step); the hash of stick v1 (step 10); the H5 and layer tools (the plan of step 13); `agent-replay` over a seeded commit; any walk for more external tasks.
