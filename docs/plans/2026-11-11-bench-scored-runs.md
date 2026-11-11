---
type: plan
title: "Scored runs plan"
description: "Prereg step 13: run arms H, B and W with k = 3 on the 29 scored external tasks and H and B on the 9 scored real-estate tasks, in a seeded order, each product graded right after its run with every oracle kind; then port each seeded bug to H's products and run their own suites (H5). Records every run, failed ones included; analyses nothing (step 14)."
status: draft
generated: { by: claude-code/2.1.318, at: "2026-11-11T20:37:16+07:00" }
verified:
  - { by: claude-code-advisor/2.1.318, at: "2026-11-11T20:41:05+07:00" }
sources:
  - id: prereg
    resource: /plans/2026-10-27-benchmark-prereg.md
  - id: trial
    resource: /plans/2026-11-08-bench-trial.md
  - id: lock
    resource: /plans/2026-11-11-bench-plugin-lock.md
---

# Scored Runs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development for the code tasks (1 and 2); every run on real data, the token and the box is the controller's. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prereg section 12 step 13: "Run in the shuffled order, H and B in the same time window with the same model and CLI version (B runs of step 8 are not reused, because the model and CLI may have changed). Record every run, failed ones included." With W for H4 (section 3, section 2) and the seeded-bug port for H5 (section 8.3, the user's option 1 of 2026-11-06). Step 14 grades nothing new and analyses per sections 9–10.

**Architecture:** The trial's driver shape (`bench/canary.mjs` `runTask` with slots, a floor, an attempts file and the task's oracle kinds) runs every scored task with its own slot list and floor; each product is graded right after its run through `env/box/<task>.json`. The H5 lane reads only H's products after all runs: it grades each kept bug's seeded check at the product, has a sealed porter write the bug onto the product when the check passes there, commits that edit in a sealed repo, and runs the product's own test files at the product and at the ported commit in the product image with no network.

**Tech Stack:** Bun 1.4.4+, `bun:test`, Docker through the existing box and `oracle-run`, `bench/canary.mjs`, `bench/trial.mjs`, `bench/run-arm.mjs`, `bench/box.mjs`, `bench/ext.mjs`, `bench/oracle.mjs` (`score`, `seed`'s sealed repos), `bench/sealed-agent.mjs`.

**Spec:** prereg sections 2 (H1–H5, the floor rule, "Applied at step 6" ruling 7), 3, 8.3 ("Applied at step 7" rulings 5–12 and the user's decisions of 2026-11-06), 8.4, 9, 10.1, 12 steps 13–14, "Applied at step 8" rulings 10–13 (machine runs, order, Docker), "Applied at step 11" rulings 4–8 and 12, "Applied at step 12" (the lock and "no change from here"); `progress/step12-lock.md` (open points for step 13), `progress/step11a-lock.md` (open points, known limits), `progress/step11-lock.md`.

## What runs

| set | tasks | arms | k | runs |
|---|---|---|---|---|
| external | the 29 `scored` rows of `progress/stick-v1/tasks-step11.tsv` (24 with step ids, H1's N; s1-01, s1-06, s3-01, s3-07, s3-09 have none and score H2–H4) | H, B, W | 3 | 261 |
| real-estate | p1, p2, p3, p4, p6a, p8a, p8c, p8d, p8e (`scored`) | H, B | 3 | 54 |

Not run: s3-08 (dropped, decision (B) of 2026-11-10), the retired s1-08, s2-04, s2-06, the dropped real-estate tasks and the trial-only p8b. W runs only on external tasks: H4 is an external-set hypothesis and section 11 budgets W there only.

**Expected wall clock**, from the step 11 trial (one Docker job at a time, the user's decision of 2026-11-09): external about 4.3 h per task (H about 32 min, B 5, W assumed as H, 9 grades of about 6.5 min), about 125 h; real-estate about 8.8 h per task (H about 96 min, B 65, 6 grades of about 7 min), about 79 h; the runs about **205 h (8–9 days)**, then the H5 lane (Task 6) about 2–3 days. A turn may run to 4 h (external) or 8 h (real-estate) and a run to 5 resumes, so single tasks can take much longer.

## What is reused

Unchanged: the box (proxy form A, plugins as allowlist exports, real-estate services, the registry), `run-arm` (probe before every run, `probeOk`, records with `plugins`, `version`, `models`, `usage`, `interventions`, `machine`), the grade (product image, split or shared mode, readiness per oracle) through `env/box/<task>.json`, `gradeProduct` (attempts, `noresult`, never `--reuse`), `runTask` (slots by `queuePick`, machine runs take the next number, `MACHINE_RUNS`, an `api` machine stop), `kindsOf` (oracle kinds per `step.json`), `oracle score`, the seeded sealed repos and `seedRepo`, `sealed-agent.mjs`. Missing, and built here: a driver for the scored set (Task 1) and the H5 port and suite run (Task 2).

## Decisions for the user (asked with this plan)

**Decided by the user on 2026-11-11** ("theo advisor"): the plan approved, (a) of decisions 1–6.

1. **The order of tasks.** Section 10.1 shuffles arms within a task; step 13 says "the shuffled order". **(a) Recommended:** one list of the 38 tasks ordered by `queuePick(tasks, 38, seed)` (seed of `ext/groups.json`), external and real-estate mixed, so neither set nor stack sits at one end of the 8–9 days; within a task, `queuePick` over its slots (`H:1..3`, `B:1..3`, `W:1..3` or the 6 of real-estate), as the canary and the trial did. (b) External in `sample.tsv` order, then real-estate in `tasks.json` order (step 8 ruling 12's task order).
2. **Whose products H5 reads.** H5 is "the test suite the harness writes guards", threshold on H alone. **(a) Recommended:** H's 3 runs per task (about 96 bugs × 3 products). (b) H and B, B as a reference rate (twice the lane, about 4–5 days).
3. **The real-estate suite.** The real-estate recipe has no test script (`ext/tasks/real-estate/task-recipe.json` `test` exits 2: "runs no PR test script"), so a product's own tests cannot run there today. The recipe's `test` is baked into the images Phase A's regrade validated (`buildImage` writes it as `.bench-test.sh`), so the recipe stays byte-equal. **(a) Recommended:** the controller writes a separate script `ext/tasks/real-estate/suite.sh` (unit and e2e runner of the copy's `package.json`, Postgres and the SMTP sink from `services`, given files, JUnit to `/out`) as data before the runs, which `suite-run` copies in at run time; validated on the 9 tasks' ends (each end's own changed test files run and give a JUnit; at most 2 sealed rounds per failure, as ruling 4's rebuild rounds); if it cannot be made to run offline, real-estate leaves H5 and the lock says so. (b) H5 on external tasks only (87 bugs); a listed deviation from "external tasks + `real-estate`".
4. **H5's mutation score on changed lines.** Section 2 names it next to the catch rate; no threshold rides on it, and no bench tool measures mutation for three stacks. **(a) Recommended:** not measured in step 13; step 14 reports it only where H's own run recorded one, as a listed deviation. (b) A per-stack mutation runner as data (Stryker, mutmut or cargo-mutants per stack), run on H's products' changed lines; a new instrument, about 3 days to build and validate.
5. **The per-layer measures (8.4).** They need H−layer variants (H without one layer) and replays of the plugin's discovery layers (review, audit, exploration) on held-out and seeded bugs. Step 12 locked only H and W, and "no change from here" holds. Section 8.3 ruling 11 registered that "the change to `agent-replay` belongs to the plan of step 13"; (a) moves that to the later plan. **(a) Recommended:** out of step 13; a later plan, once step 14 has analysed H1–H5, with the user deciding whether the designer builds the variants (new commits, the step 12 lock amended); step 14 reports H1–H5 without them and lists it. The run transcripts kept by Task 5 are their evidence. (b) In step 13: the user reopens the designer for the variants before Task 5; the plugin lock is amended first.
6. **The three accepted minors of step 11** (`listens()` without a retry, a P OOM read as O's timeout, `--extra-round` per invocation). A fix to the box or `oracle-run` now means the Phase A regrade again (about 75 grades). **(a) Recommended:** accepted again, with the same counting (machine reruns, `noresult` or timeout grades told to the user). (b) Fix and regrade before Task 5.

## Rulings (Task 0 registers them in prereg section 12 as "Applied at step 13" before any change)

1. **The set and the arms:** as "What runs". k = 3 standing runs per arm and task: a run whose record has `machine` set takes the next number (step 8 ruling 11).
2. **Nothing earlier counts.** Each task gets a floor in `<data>/step13/floor.json` the first time the driver touches it (the highest run number per arm then); only runs above it count, so no canary, trial or probe run is reused ("B runs of step 8 are not reused"). Its own attempts file `<data>/step13/attempts.json`.
3. **Same model and CLI.** Every run's record must read `version` 2.1.318 and `models` only `claude-opus-5-5` (and `claude-sonnet-5-5` where the CLI calls its small model); `arms.json` is not edited (step 12 ruling 6). A run whose model fell back is `machine model` already; a record with another `version` stops the driver for the user.
4. **Grading:** each product right after its run, every oracle kind of the task (`oracle/`, and `step/oracle/` where `step.json` names it), through `env/box/<task>.json`, `--sealed`, never `--reuse` (so the reuse-key limit of the Phase A lock does not arise). `noresult` after 2 attempts stands and is counted.
5. **s1-11's make** (Phase A known limit): before s1-11's first run, its end is graded once with `--out <data>/logs/step13/s1-11-end.json`; a result that differs from its lock grade stops for the user.
6. **Order:** decision 1. One task at a time; one Docker job at a time; pgsnap before and after every real-estate task; `docker builder prune -f` when the cache is above 15 GB (the driver's rule).
7. **Stops:** the driver stops for the user on a refusal, an `api` machine run, `MACHINE_RUNS` machine runs in a row, a `version` change, or a pgsnap change; a `noresult` or timeout grade on a real-estate product is told to the user (decision 6).
8. **Evidence kept:** every record, run folder (transcripts) and product ref stays until step 14 locks; nothing is removed by name except Docker objects the tools recorded.
9. **H5 (section 8.3, option 1), per decision 2's products:** for product P and kept bug b with check c: grade `<task>/seeded/oracle` at P (`env/box/<task>.json`, `--sealed`). `precondition` or `error` for c: not applicable, counted. `fail`: a miss. `pass`: one sealed porter (sees b's `description` and `edit` and P's files, never c, the oracle or another bug) writes one edit `{ file, find, replace }` on P, refused by the seeder's gates (`find` once, not a test path, one hunk); the edit is committed on P in `<data>/seeded/repos/<key>.git` under `refs/h5/<run>/<bug>` (never in the arm's store; the sealed repo reaches P's objects through an alternates line to the store `env/box/<task>.json` names, added when missing: `seedRepo` points a real-estate sealed repo at the copy, not at `ext/repos/real-estate`), and every grade or suite run at P + edit goes through `env/box-seeded/<task>.json`, the box task file with only `repo` changed to the sealed repo (step 7 ruling 5's pattern); the port counts only when c passes at P and fails at P + edit, else not applicable, counted. Then P's suite runs: the test files `git diff --name-only <base> P` lists that `isTestPath` or the stack's `testPaths` accept, read as "the suite the harness writes" (H5's wording; the whole suite at P would credit the base's own tests to the arm). It runs at P and at P + edit through the recipe's `test` script in the product image with no network: caught when a test that passes at P fails at P + edit. A suite with no test file is a miss. Results to `<task>/seeded/h5/<arm>-<run>.json`; the H5 lane runs after all of Task 5. The rate and its interval are step 14's.
10. **Sealing:** the controller reads count lines, status lines, record fields and the report; no transcript, product, grade output, check, bug file or porter reply by hand. `scored.mjs report` prints counts only in step 13 (standing runs, machine runs, `noresult` grades per set and arm); the per-run score table is step 14's first act, after its plan is registered.
11. **No designer:** the plugin-design session is closed and the plugin is locked; nothing of step 13 goes to a designer.
12. **The manifest at the lock:** `stick hash` and `compare progress/stick-v1-step12.sha256 --reasons progress/step13/reasons.tsv`; expected changed 0 (step 13 adds files, it rewrites none that the step 12 manifest holds) the real-estate `suite.sh` of decision 3 (a) and `env/box-seeded/` are new files.

## Global Constraints

As the earlier steps': branch `bench-step13` from `main` (6fbbf1e); `<data>` = `/Users/hbchuc/Documents/programing/vibe-code/hstack/.evidence/bench`; `HSTACK_BENCH_MACHINE=<data>/machine.json`; Bun only, no new dependency, `bench/` names no stack, customer or task; every full test run teed to `<data>/logs/step13/tests-<n>.out`, pristine; Docker removal only by recorded names, never `-f`, no prune but `docker builder prune -f`; never touch `real_estate*` databases or `outsourcing/`; implementers work on fixtures only; docs and logs in English; push with `git -c http.postBuffer=524288000 push` when asked.

## Review Focus

1. A run below the floor counted, or a canary or trial run reused. Test: Task 1 'only runs above the step 13 floor stand'.
2. An arm graded with the wrong oracle kinds, or W run on a real-estate task. Test: Task 1 'slots follow the set'.
3. A porter that sees the check, or a port committed into the arm's store. Test: Task 2 'the porter's prompt holds no check' and 'a port lands only in the sealed repo'.
4. A suite run with network, or a suite that picks up the oracle's files. Test: Task 2 'the suite runs offline and only the product's test files'.

## Amendment: two lanes (the user's decision of 2026-11-11, "Ok bắt đầu đi")

Registered in the prereg ("Amended at step 13") before Docker is changed or any lane runs. Step 8 ruling 13's "one Docker job at a time" becomes, for step 13 only, **two lanes**, each running one task at a time. Reason: about 205 h of runs and 2–3 days of H5 on one lane, on a 32 GB, 8-CPU machine whose Docker has 7.7 GB and a 58 GB disk (13.2 GB free on 2026-11-11). Nothing of the measure changes: tasks, arms, k, slots, the order within a task, grading and scoring are as registered.

- **Resources (the user, in Docker Desktop, only when the controller says no job runs):** memory 16 GB (20 GB if the pilot's peak exceeds 13 GB), virtual disk limit 120 GB. Before that, with no job running: `docker builder prune -f`.
- **One queue:** both lanes claim the next task of `scored.mjs order` (decision 1's order) from one queue under a lock, so the global order is kept. Exclusions: never two private-set tasks at once (their P and O containers carry no memory cap; this rule is load-bearing); never two of s2-08, s2-09, s2-10 at once (shared dummy ports, step 7 ruling 13). A lane that meets an excluded task leaves it for the next claim and takes the next allowed one.
- **No shared read-modify-write:** the floor and the attempts move to one file per task (`step13/floor/<task>.json`, `step13/attempts/<task>.json`); `ext/removed.txt` is append-only already.
- **Prune:** the driver's own prune is off in step 13; each lane checks `<data>/step13/pause` between tasks; the controller creates it, waits for both lanes to stop at a task boundary, runs `docker builder prune -f`, removes it. The 15 GB disk floor stays as the stop.
- **The pilot (before any scored run), pass criteria registered now:** (1) four ends graded two at a time — an external and a private-set end side by side, twice (s2-01 and p8e, then s3-02 and p8c), each kind with `--sealed --out <data>/logs/step13/pilot/<task>-<kind>.json` (never a hashed grade file), compared by check id with the same task and kind of Phase A's third regrade (`<data>/logs/step11/regrade/<task>-<kind>.json`, made under this grade environment; the locks differ for p8e by decision (A)): every result equal; (2) then one H probe box of an external task and one of a private-set task at the same time: both `probe ok`; (3) no `machine memory` anywhere; (4) Docker memory sampled every 30 s (`docker stats --no-stream`), peak below 13 GB; disk free sampled every 30 s (`df` in `bench-arm/fw:1`), minimum above 30 GB. Any criterion missed: one lane, nothing lost.
- **During the runs:** after the first 24 hours, machine runs and `noresult` grades are counted against the step 11 trial's (0 and 0); a rise sends step 13 back to one lane. Going back to one lane loses nothing: the driver resumes.
- **H5 (Task 6)** runs in the same two lanes with the same exclusions.
- **Known limit:** run `minutes` under two lanes are not comparable with the trial's single-lane minutes; tokens, interventions and scores are unaffected.

---

### Task 0: Register the rulings

**Files:** Modify `docs/plans/2026-10-27-benchmark-prereg.md` (section 12, "Applied at step 13 (<date>)" after "Applied at step 12"), `docs/log.md`.

- [x] **Step 1:** Write the paragraph: the decisions as answered and rulings 1–12; end "Registered before any change to `bench/` for step 13 and before any step 13 run; `bench/scored.mjs` and the H5 tool do not exist." Commit.

### Task 1: The driver for the scored set

**Files:** Create `bench/scored.mjs`, `tests/bench-scored.test.mjs`; modify `bench/README.md`.

**Interfaces:**
- Consumes: `runTask`, `runStopped`, `context`, `gradeProduct`, `records`, `standing`, `aboveFloor` (`bench/canary.mjs`); `kindsOf`-like reading of `step.json` (as `bench/trial.mjs`); `taskOf` (`bench/ext.mjs`).
- Produces:
  - `bun bench/scored.mjs run <task>`: refuses a task not in `<data>/step13/tasks.txt`; sets the floor once (ruling 2); slots `H:1..3`, `B:1..3`, `W:1..3` for an external task and `H:1..3`, `B:1..3` for a real-estate one (`taskOf(...).stack`); `k` 3; `envDir` `env/box`; kinds per `step.json`; attempts `step13/attempts.json`; stops on a record whose `version` differs from the first standing record's (ruling 3).
  - `bun bench/scored.mjs order`: prints the task order of decision 1 (one task per line).
  - `bun bench/scored.mjs report`: prints per set and arm the count of standing runs, machine runs (by reason), `noresult` grades, tokens, minutes and interventions in sum; no score, mean or interval (ruling 10). `bun bench/scored.mjs table` (step 14's, refused unless `<data>/step14/registered` exists) writes the per-run scores.

- [ ] **Step 1: Write the failing tests:** 'the run refuses a task not in tasks.txt'; 'only runs above the step 13 floor stand' (a fixture with trial and canary records under the floor); 'slots follow the set' (external 9, real-estate 6, no W slot there); 'the order is queuePick over the tasks' (decision 1 (a)); 'a version change stops the driver'; 'the report prints counts and no score'; 'the table is refused before step 14 registers'.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** reusing `canary.mjs`; no change to `canary.mjs`, `trial.mjs`, `run-arm.mjs` or the box. **Step 4:** Suite teed — pass. Commit `git commit -m "Add the driver for the scored runs"`.

### Task 2: The H5 port and suite run

**Files:** Create `bench/h5.mjs`, `tests/bench-h5.test.mjs`, `briefs/porter.md` (in `<data>`, written by the controller from ruling 9); modify `bench/ext.mjs` (a `suite-run` command beside `oracle-run`, which is not changed), `bench/README.md`.

**Interfaces:**
- Produces:
  - `bun bench/ext.mjs suite-run <task-file> --at <commit> --files <list> --out <junit>`: builds the commit's product image as `oracle-run` does (the same `productImage`, the arm's network rules), runs the test script with the files (`ext/tasks/<slug>/suite.sh` when it exists, copied in at run time, else the recipe's `test`), copies `/out/junit.xml` out; no runner layer, no `/oracle`; names recorded and removed.
  - `bun bench/ext.mjs box-env <task> --seeded`: writes `env/box-seeded/<task>.json`, the box task file with `repo` = the task's sealed repo.
  - `portEdit({ data, task, bug, product }) -> { edit } | { refused: <reason> }`: one sealed agent run with `briefs/porter.md`, the bug's `description` and `edit`, `--at <product>`; the seeder's edit gates.
  - `bun bench/h5.mjs <task> <arm> <run>`: ruling 9 end to end; writes `<task>/seeded/h5/<arm>-<run>.json` = `[{ bug, at: 'pass'|'fail'|'precondition'|'error', port: 'ported'|'not-applicable'|'refused'|null, suite: <n test files>, caught: true|false|null }]`; prints one count line `h5 <task> <arm> <run> bugs=<n> miss=<m> ported=<p> caught=<c> na=<k>`.
- [ ] **Step 1: Write the failing tests:** 'a fail at the product is a miss with no porter'; 'the porter's prompt holds no check'; 'a port lands only in the sealed repo'; 'a port that does not flip the check is not applicable'; 'caught needs a test that passes at P and fails at P + edit'; 'the suite runs offline and only the product's test files' (gated `BENCH_EXT_DOCKER=1`, a fixture recipe whose test opens a socket: no result); 'a product with no test file is a miss'; 'box-env --seeded changes only repo'.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4:** Suites teed (and the gated one) — pass. Commit `git commit -m "Add the H5 port and the product suite run"`.

### Task 2b: Two lanes (the amendment)

**Files:** Modify `bench/scored.mjs`, `tests/bench-scored.test.mjs`, `bench/README.md`. No change to `bench/canary.mjs` or any other file.

**Interfaces:**
- `scored.mjs run <task>` passes `runTask` a per-task config: `floor` from `step13/floor/<task>.json`, `attempts: step13/attempts/<task>.json`; the context's `prune` is a no-op.
- `bun bench/scored.mjs claim <lane>`: under a lock (`mkdir <data>/step13/queue.lock`, removed in `finally`; a stale lock older than 10 minutes with no live pid is reclaimed), reads `step13/queue.json` (`{ done: [], running: { <lane>: <task> } }`, created from `order` on first use), clears the lane's previous task into `done` only when its `run` exited 0 (the lane passes `--done <task>`), and prints the next task of the order not done, not running, and not excluded by the amendment (a private-set task while another private-set task runs; s2-08, s2-09, s2-10 while one of them runs), or `none` when nothing is allowed now, or `empty` when all are done. A lane that stops on a non-zero exit keeps its task in `running` until the controller clears it (`claim <lane> --release`).
- [ ] **Step 1: Write the failing tests:** 'two tasks in parallel touch disjoint floor and attempts files'; 'claim keeps the global order'; 'claim never gives two private-set tasks at once'; 'claim never gives two of the shared-port tasks at once'; 'a stopped lane keeps its task until released'; 'prune is never called by run'.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4:** Suite teed — pass. Commit `git commit -m "Run the scored set in two lanes"`.

### Task 3: The real-estate suite (decision 3 (a) only; controller)

- [ ] **Step 1:** Write `ext/tasks/real-estate/suite.sh` (ruling 9's contract: given files, JUnit to `/out`, services up first, no network); the recipe stays byte-equal.
- [ ] **Step 2:** For each of the 9 tasks, `suite-run` at the end with the end's own changed test files: a JUnit with every case passing is expected. A failure gets at most 2 sealed rounds (the script's lines only, the base's log readable, the end's sealed); still failing, real-estate leaves H5 for that task and the lock lists it.

### Task 4: Pre-flight (controller)

- [ ] **Step 1:** `<data>/step13/tasks.txt` = the 38 tasks; `bun bench/scored.mjs order` to `logs/step13/order.out`.
- [ ] **Step 2:** s1-11's end check (ruling 5).
- [ ] **Step 2b:** `box-env <task> --seeded` for the 38 tasks. `suite-run` at each of the 29 external ends with the end's own changed test files: every case passing is expected (step 4 accepted each task on "PR tests pass at end"); a stack whose script cannot run offline in the product image stops for the user now, not after Task 5.
- [ ] **Step 3:** One H probe on one external and one real-estate box (step 12's script): `probe ok`; the token answers. Docker: no leftover name of an earlier step; build cache under 15 GB.

### Task 4b: The two-lane pilot (controller)

- [ ] **Step 1:** With no job running: `docker builder prune -f`; the user sets Docker memory 16 GB and disk 120 GB; `docker info` confirms.
- [ ] **Step 2:** The pilot of the amendment, with the samplers; results to `logs/step13/pilot/`. All four criteria met: two lanes. Any missed: one lane (`runs.sh` with one lane), recorded.

### Task 5: The runs (controller)

- [ ] **Step 1:** `logs/step13/runs.sh <lane>` (two lanes, or one if the pilot failed): loop `claim <lane>` → `bun bench/scored.mjs run <task>`, sleeping 5 minutes on `none`, ending on `empty`, waiting while `step13/pause` exists; teed to `logs/step13/run-<task>.out`, its status lines to `runs.out`, pgsnap around real-estate tasks, stop at the first exit that is not 0 (ruling 7). Started detached; resumable (a rerun picks up at the first slot without a standing run).
- [ ] **Step 2:** On each stop: the user is told the task, arm, run and the stop word, never a grade's content; the first move on `refused` or `api` is the host check of step 12 (a usage limit read as a probe refusal is how step 12 met it); the driver resumes after the user's answer.
- [ ] **Step 3:** At the end, `bun bench/scored.mjs report` to `logs/step13/report.out`. Record per day in `progress/progress.md`: tasks done, runs, machine runs, `noresult` grades.

### Task 6: The H5 lane (controller)

- [ ] **Step 1:** `briefs/porter.md` written; for every H run of Task 5 (decision 2), `bun bench/h5.mjs <task> H <run>`, external then real-estate (pgsnap around), count lines to `logs/step13/h5.out`.
- [ ] **Step 2:** Count: bugs read, misses, ported, caught, not applicable, refused. No rate (step 14).

### Task 7: The step 13 lock

**Files:** Create `progress/step13/reasons.tsv`, `progress/stick-v1-step13.sha256`, `progress/step13-lock.md`; modify `docs/log.md`, `progress/progress.md`.

- [ ] **Step 1:** Ruling 12's hash (outputs outside `<data>`) and compare; any unexplained or missing stops.
- [ ] **Step 2:** Suite teed; `git status --short bench tests` empty; Docker as earlier steps; pgsnap equal.
- [ ] **Step 3:** `progress/step13-lock.md`: the runs per set and arm (standing, machine, `noresult`), CLI and models read from the records, the stops and their answers, the H5 counts, the manifest, deviations, open points for step 14 (the analysis per sections 9–10, H4 first; 13.3's rerun; 13.4's cold setup read from H's transcripts on s1-09, s2-09 and s3-07; 13.5's blind rating; the per-layer measures of decision 5). Advisor review; the user's approval; this plan `stable`.

## Known limits

- **One Docker job at a time:** about 8–9 days of runs, then the H5 lane; a long turn or a resume chain can add a day.
- **W and H share the plugin's name** (`hstack`); records tell them apart by commit and sha256.
- **The trial tasks** (s2-01, s3-02, p6c is not in the set, p8b is not) were seen by the designer through scores; s2-01 and s3-02 run here like any task.
- **H5 reads only ported bugs** on products that pass the check; the not-applicable count is reported beside the rate.
- **The phase A and step 11 limits stand** (M3 open on the shared and in-process tasks, the proxy's beta header, registry addresses, the real-estate `--memory 6g`).

## Not in this plan

The analysis (step 14: H4 first, then H1–H3 with Holm, H5, pass^k, autonomy); 13.3's rerun on another machine, 13.4's cold-setup read, 13.5's blind rating; the per-layer measures and discovery replays (decision 5); any change to the plugin, `arms.json`, an oracle, a seeded bug or a score rule.
