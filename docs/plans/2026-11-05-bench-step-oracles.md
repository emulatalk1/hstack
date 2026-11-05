---
type: plan
title: "Step oracle plan"
description: "Prereg step 6: reclassify p8b with its interface sheet, record the H1 floor-rule decision with its numbers, and build the step oracle every task's H1 build score then comes from (a filter of the external oracles, new black-box checks for the real-estate tasks), with the one scoring rule that steps 7, 8, 11, 13 and 14 reuse."
status: draft
generated: { by: claude-code/2.1.310, at: "2026-11-05T12:15:00+07:00" }
verified:
  - { by: claude-code-advisor/2.1.310, at: "2026-11-05T12:40:00+07:00" }
sources:
  - id: prereg
    resource: /plans/2026-10-27-benchmark-prereg.md
  - id: oracles
    resource: /plans/2026-11-03-bench-oracles.md
---

# Step Oracle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prereg section 12 step 6 done: p8b reclassified under the step 5 rules; the H1 floor rule's decision recorded with its numbers; for every external task and every real-estate task a step oracle (`<task>/step.json`) that H1's build score comes from; one scoring function for H1 and H2 under the floor rule.

**Architecture:** No new grader. An external step oracle is a list of ids over the task's existing `oracle/` (its checks are already rewritten per 6.2 and validated end against base in step 5), so a product is graded once and H1 reads a subset of that grade. A real-estate step oracle is a new folder `<task>/step/oracle/` of black-box checks rewritten from the tests the task's feature steps name, graded by `bench/grade.mjs` as it is (it reads labels and validations from the oracle's parent folder). New code is one command, `bun bench/oracle.mjs step`, with an external and a real-estate form, a `score` command, and two pure functions. Everything that reads oracle or test content is a sealed agent; the tools print ids, verdicts and counts only.

**Tech Stack:** Bun 1.4.4+, `bun:test`, git, the `claude` CLI 2.1.310 through `bench/sealed-agent.mjs`, Playwright (the oracle scaffold of step 5). No Docker call in this plan.

**Spec:** `docs/plans/2026-10-27-benchmark-prereg.md` sections 2 (the floor rule), 6.2, 6.3, 7.1 (with the step 5 rulings and the 2026-11-05 addendum), 7.2, 8.3, 9.1, 10.2, 12 (steps 6, 9–11) and 14; the lock `progress/step5-lock.md`; the tools as built: `bench/README.md`.

## The floor-rule decision (Task 1 records it in prereg section 2)

Counted from `labels.json` of every kept task at the step 5 lock (scored checks agreed `traceable`, split rounds included):

- **External (H1's set), 24 tasks:** sorted per-task counts `0,0,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,3,4,4,4,5,5,9`; median 2 (12th and 13th values). With all 9 disputed classifications counted `traceable`: `0,0,1,1,1,1,1,1,1,1,1,2,2,2,3,3,3,3,4,5,5,6,7,10`, median still 2. Step 9 cannot raise it to 5.
- **Real-estate, 14 kept tasks:** twelve 0s, 1, 4; median 0. With all 11 disputed classifications `traceable`: `0×7, 1×4, 2, 4, 6`, median 0.5. The 12 disputed source pairs sit in 6 tasks, so at most 6 of 14 could reach 5.
- p8b is trial-only and in neither count.

So the floor rule applies, now and after step 9: H1's build score comes from the step oracle, and every fix-commit check scores H2. Stated plainly: for an external task the floor rule adds no check. Its step oracle is a subset of the checks the classifiers already call `traceable` (the external oracle *is* the PR's tests). What changes there is H2, which now counts every fix-commit check. For real-estate the step oracle is a new source.

## Rulings the prereg leaves open (Task 1 registers them before any step oracle is built)

1. **Scope.** External: the 24 kept tasks of `<data>/ext/sample.tsv`. Real-estate: the 14 kept tasks and p8b. p8b is trial-only, but the trial run (section 12, step 11) measures σ_d of the build score on p8b, and under the floor rule that score comes from a step oracle. Retired ids (s1-08, s2-04, s2-06) and p8b1 get none.
2. **External step oracle (section 2: "the FAIL_TO_PASS tests the classifiers mark traceable").** The candidates are the task's scored checks (not `dropped`, interface not `none`, verdict `valid` or `absent-at-base`) labelled `build` in `labels.json` whose origin test is a fail-to-pass case of `ext/sealed/<slug>/f2p.json`. The origin is decided for **every** scored check, whatever its label, and the `build` filter applies only when the ids are chosen. The resolver's prompt is then the same when step 10 runs `step` again after step 9 moves labels, so its record is reused. A tool decides the origin with `f2pOf` (Task 2):
   - Exact match: the origin's test name (after its first `::`) equals a case name, or a case id ends with it after `::` or `.`. The result is `f2p`.
   - Otherwise both sides are cut to a last segment. The tool strips a trailing parameter part (`[…]` or `(…)`) and takes the last piece after `::`, `.`, `/`, ` > ` or ` › `. If that segment is among the fail-to-pass segments only, the result is `f2p`. If it is among the pass-to-pass segments only, the result is `p2p` and the check is out.
   - Anything else is `ask`. One sealed resolver per task with an `ask` reads those origin tests at the end commit and both case lists, never the check, and answers `f2p`, `p2p` or `unknown`. Only `f2p` is kept.

   No rewrite and no new validation are needed. These checks are the PR's tests already rewritten per 6.2, and step 5 validated them `--validate <end> --bad <base>`, which is the floor rule's "pass on the end product and fail at the task base". The ids are ordered by `queuePick(ids, 15, seed)`, seed `hstack-bench-2026-10-27`. No task has more than 9 candidates, so the cap binds nowhere today. Step 10 runs `step` again after step 9 settles the disputed classifications.

   The exploratory probe (`<data>/logs/step6/probe-f2p*.mjs`) counted the 55 `build` checks: 47 match exactly, and of the rest about 6 need the last-segment rule or the resolver.
3. **Real-estate step source (section 2: "a real-estate plan names one test per step").** The source is the test each feature step names in the time-correct plan text. That text is `<task>/filter-source.md`, which the step 3a filter read (for p1–p6c it holds the plan and its feature-list entries).
   - Only steps of features the filtered input keeps are listed. A feature group the filter dropped (a fix of an earlier plan) has no step check.
   - One sealed lister per task lists `[{ step, file, title }]`. It reads `filter-source.md` and `input.md` in its prompt and the files of the end commit (`--at <end>`).
   - The tool resolves each title at the end commit. The title must appear verbatim (`git grep -F`) in a file `isTestPath` accepts. The named file wins when it matches; otherwise exactly one test file must match. Anything else is `unresolved`.
   - Candidates are deduplicated by `<file>::<title>`.
   - `queuePick` over `<task>:<file>::<title>` takes the first 15 **before** any writing ("at most 15 per task chosen by seed").
   - A selected test whose check ends `weak`, `broken`, `error` or `interface: none` is out with no replacement.
4. **Real-estate rewrite (6.2).** One sealed writer per task at the end commit writes the step checks.
   - **Brief:** `briefs/oracle-re.md` (the step 5 rules: scaffold, public interface, `PRECONDITION:`, severity), headed by `briefs/step-re.md`.
   - **It sees:** the selected tests with their file at the end, and the scaffold.
   - **It never sees:** the step text, the input, a fix commit or the fix-commit oracle. The check rewrites the test, as 6.2 says.
   - **Ids** are `<end7>-T<n>`, numbered after the highest number of that prefix in every `<data>/*/oracle/` and `<data>/*/step/oracle/` manifest. The ends of p2 (5eced48) and p7b (3137149) are also step 5 source commits.
   - **Entries:** `{ id, fix_commit: <end>, task, step, origin: "<file>::<title>", behaviour, interface, severity }`.
   - **Gates:** the writer gates of step 5 ruling 9 (`judge`: id, fields, severity, kinds, file, imports, leak). An empty or all-`none` manifest is rerun once, and the second run stands (the step 5 build ruling 19).
5. **Real-estate validation (7.1, section 2).** `grade env/real-estate.json <task>/step/oracle --validate <end> --bad <base> --sealed --reuse`, with no `--base`, gives the verdicts.
   - A pass at the end with a fail or precondition at the base gives `valid` or `absent-at-base`. A pass at both gives `weak`. Any other result gives `broken`.
   - A base without the task file's `appFile` (p1's 691a723) is not run. Every check's bad result is `precondition`. This is the step 5 no-app ruling applied to the bad version, since a setup there throws.
   - `broken` checks get the fixer and comparer rounds of ruling 11 (`step/work/fix-<r>/`).
   - A step check is scored when it is `valid` or `absent-at-base`.
   - Real-estate step checks are not classified: section 2's classifier filter names external tasks only. `step/labels.json` labels every scored step check `build`.
6. **Layout.** A real-estate task gets `<task>/step/` with `oracle/`, `labels.json`, `validation-<end7>.json`, `grades/`, `logs/`, `work/` and `steps.json` (the resolved candidates).
   - Every task gets `<task>/step.json` = `{ oracle: "oracle" | "step/oracle", ids, candidates, seed }`.
   - The f2p decisions of an external task go to `<task>/step-f2p.json` (`[{ id, by: "exact"|"segment"|"resolver", verdict }]`).
   - Nothing of the step 5 lock changes: `oracle/`, `labels.json`, `agreement.json`, `validation-*.json` and `step9/*` keep their hashes. The exception is p8b's classification files (ruling 8).
7. **Scoring under the floor rule (9.1 as section 2 amends it).** `floorScore` (Task 2) is the one rule that steps 7, 8, 11, 13 and 14 use. Weighting is high 3, medium 2, low 1.
   - **H1 build** is the weighted pass share over `step.json` `ids`, read from the grade of `step.json`'s oracle at that commit.
   - **H2 requirement** is the weighted pass share over every check in the grade of the fix-commit oracle that is not in its `excluded` list, **whatever its label**. That includes `build`, `requirement`, `partly` and disputed checks: "all fix-commit checks then score H2". So step 9 changes only which external checks are in H1.
   - **Task passed** means every high and medium step check passes (9.1, literally). A task whose step checks are all `low` passes on that clause alone; the lock reports how many such tasks there are.
   - A task with no step id has no H1 score (`null`).
   - `grade`'s printed `build=` is not H1 once the floor rule applies.
8. **p8b reclassification (section 12 step 6, section 14).**
   - The trial's `classify-1.json` and `classify-2.json` move to `p8b/superseded/` (the tool would overwrite them).
   - Then `oracle classify env/real-estate.json p8b` runs under ruling 15 and the step 5 reading gate. It covers p8b's 9 scored checks: its step 2 validations stand, all 9 are `absent-at-base`, and the 8 `pre-existing` checks stay recorded under ruling 12.
   - An agreed `partly` stays `partly` with no split. The pilot oracle's checks share files that import a helper the writer rules refuse, so no split could pass the gates. p8b's labels feed no score under ruling 7.
   - κ, raw agreement and AC1 are reported next to section 14's trial numbers (κ 0.44, raw 0.88, AC1 0.87).
9. **Step 9 additions.** Two new files go in `<data>/step9/`:
   - `p8b-classify.tsv` holds p8b's disputed ids.
   - `sample-7.1-step.tsv` holds 10 scored real-estate step checks by `queuePick`. They are rewritten checks the 7.1 read has not sampled; external step checks already belong to the 7.1 pool.

   `oracle queue` is not run again: p8b now has an `agreement.json`, and a rerun would reshuffle the locked step 9 samples.

## Decided by the user (asked with this plan)

- **H1 on fewer than 24 external tasks.** s1-01 and s3-01 have no `traceable` check and no disputed one, so their step oracle is empty and H1 has no score for them. That leaves 22, or fewer if the resolver sends a task's only candidate out. Section 10.2 says N never drops below 24. Ruling 14 of step 4 reopens the walk only for a dropped task, and these two stay for H2–H4.

  Decided by the user on 2026-11-05: option 1, the proposal below.

  Proposed: register now that H1's N counts only tasks with a non-empty step oracle. When step 11 recomputes N (section 10.2), the walk of ruling 14 continues until that count meets N, which is at least 24. The added tasks go through the step 5 pipeline and this plan's `step`. Consequence: they arrive after step 7 and the stick v1 lock (step 10), so each needs its seeded bugs (step 7) run then and the lock amended. The N rule already foresees tasks added at step 11 with exactly these consequences, and a σ_d above 0.25 would send the walk on anyway, so one walk covers both.

  Alternatives: walk for 2 or more tasks now, before step 7. Each then runs the step 5 pipeline (serve, write, validate, sheet, classify, with Docker) inside step 6, and a later N rise still needs a second walk at step 11. Or report H1 on 22 as a registered deviation from 10.2.

Order: Tasks 3 and 4 grade nothing and can run beside Task 5's `bench_re` batch. Every real-estate end and every base but p1's already graded `junit ok` in step 5, so a step validation `error` is not expected from the product side.

Expected size: no Docker. Real-estate: 15 tasks, each a lister, a writer, at most 2 fixer rounds, and 2 grade runs per pass on `bench_re`, one task at a time. About 90 runs at most, a few minutes each. External: a resolver for perhaps 5 tasks. p8b: 2 raters. Tokens: roughly 5–8M, mostly the 15 writers; each task records what it took.

## Global Constraints

- Bun only, no new dependency in `bench/`; tests run with `bun test ./tests`, output pristine. `bench/` names no stack, tool, customer or task; briefs live in `<data>`. `<data>` = `/Users/hbchuc/Documents/programing/vibe-code/hstack/.evidence/bench` (gitignored, main checkout). Set `HSTACK_BENCH_MACHINE=<data>/machine.json` for every bench command.
- Never write under `/Users/hbchuc/Documents/programing/vibe-code/outsourcing/`. Never touch the databases `real_estate`, `real_estate_test`, `real_estate_hstack`, `real_estate_hstack_test`; real-estate grading uses only `bench_re`, one grade at a time (the grade worktree `re-grade-<sha7>` and port 3000 are shared). `sh <data>/env/real-estate/pgsnap.sh` before and after each batch of runs; the two lists must be equal.
- **Docker.** No Docker command in this plan. If a task finds it needs one, stop and ask.
- **External code.** Never run on the host. A commit is materialised only by `git archive` or a worktree under `/tmp/hstack-bench/` (the resolver's `--at <end>` through `sealed-agent`, read only).
- **Sealing.** Sealed (read only by `bench/` tools and sealed agents): everything step 5 sealed (`<data>/heldout/`, `ext/raw/`, `ext/sealed/`, every `*.reply.md`, every prompt file a tool writes, every oracle folder, `ext/tasks/*/issue.json`, `<task>/input.md`, `<task>/interface.md`, `<task>/filter-source.md`, `work/`, `logs/`, `classify-*.json`, the source-label replies, `step9/`), plus `<task>/step/oracle/`, `<task>/step/steps.json`, `<task>/step/work/` and `<task>/step/logs/`. The implementer, reviewer and controller read only `*.run.json`, the tools' printed lines, validation and grade verdicts (ids and results), `step.json`, `step-f2p.json` and counts; never `cat`, `grep` or list a sealed file's content. `bun bench/bugs.mjs` runs only with `--usable`, `--fix-tally` or `--at-tally`. Replies to the user hold only counts and verdicts.
- Every grade of an oracle runs with `--sealed`.
- This session is not the plugin-design session (section 12, step 10); no agent that writes a check, a list or a label shares context with it.
- Sealed agents run only through `bench/sealed-agent.mjs`; a writer gets `--settings` granting `Write` and `Edit` under its own output folder only; every other agent replies with JSON and has `Read,Glob,Grep` at most.
- Record each task's usage in `progress/progress.md` (implementer and reviewer tokens and minutes, the summed usage of every sealed agent from its `.run.json`, wall clock of the runs). Copy the SDD ledger into `progress/progress.md` before the final review. The plan goes `stable` only after the user approves the build.
- Docs, briefs, logs and commit messages in English.

## Review Focus

1. A step 6 command rewrites a file the step 5 lock hashed (`oracle/`, `labels.json`, `agreement.json`, a `validation-*.json`, `step9/` other than the two new files). Expected: `step` writes only under `<task>/step/`, `<task>/step.json` and `<task>/step-f2p.json`. Test: Task 4 'external step writes only step.json and step-f2p.json'; Task 5 'real-estate step writes only under step and step.json'.
2. The f2p matcher calls a pass-to-pass test `f2p`, or misses a parametrised fail-to-pass case. Expected: exact, then last segment in one list only, else `ask`. Test: Task 2 'f2pOf matches parametrised and qualified names and asks when a segment is in both lists'.
3. p1's base (no app) as the bad version throws in setup, so every step check reads `error` instead of `absent-at-base`. Expected: the base is not run and reads `precondition`. Test: Task 5 'a base with no app is not run and every step check reads precondition there'.
4. H2 drops a disputed or `partly` check, or counts an excluded (`weak`, `broken`, `error`, `pre-existing`) one. Expected: every non-excluded fix-commit check, whatever its label. Test: Task 2 'floorScore counts every scored fix check in requirement and only step ids in build'.
5. A step check id equals a fix-commit check id (the end is a source commit for p2 and p7b), so a grade, a fixer round or a later split confuses the two. Expected: numbering after the highest of that prefix in every oracle and step oracle. Test: Task 2 'nextNumber counts both oracle and step oracle manifests'.

---

### Task 1: Register the decision and the rulings

**Files:**
- Modify: `docs/plans/2026-10-27-benchmark-prereg.md` (section 2, a dated paragraph after the floor rule), `docs/plans/index.md`, `docs/log.md`

- [ ] **Step 1:** Write the section 2 paragraph "Applied at step 6 (2026-11-05)": the floor-rule decision with the numbers above, the plain statement on external tasks, rulings 1–9, and the user's decision on H1's N as decided; add to section 9.1 one line pointing to that paragraph for the scores under the floor rule; end "registered before any step oracle is built; `bench/oracle.mjs step` has not run". Add the plan to `docs/plans/index.md` and an **Update** line to `docs/log.md`. Commit `git commit -m "Register the H1 floor-rule decision and the step 6 rulings before any step oracle is built"`.

### Task 2: Pure rules and the score command

**Files:**
- Modify: `bench/lib/oracle.mjs`, `bench/lib/score.mjs`, `bench/oracle.mjs` (command `score`), `bench/README.md`, `tests/bench-oracle.test.mjs`, `tests/bench-score.test.mjs`

**Interfaces:**
- Produces:
  - `f2pOf(origin: string, f2p: string[], p2p: string[]) -> { verdict: 'f2p'|'p2p'|'ask', by: 'exact'|'segment'|null }` (ruling 2; case ids as `f2p.json` holds them, `classname::name` when they are objects).
  - `nextNumber(ids: string[], sha7: string) -> number`: the highest `n` of `<sha7>-T<n>` among `ids` (0 when none). `highestOf` in `bench/oracle.mjs` is rewritten over it and reads `step/oracle/manifest.json` too.
  - `floorScore(fix: grade file, step: grade file|null, ids: string[]) -> { build: number|null, requirement: number|null, passed: boolean|null }` (ruling 7; `step` null means the ids are read from `fix`; weights high 3, medium 2, low 1 from each grade check's `severity`).
  - `bun bench/oracle.mjs score <task> <sha>`: reads `<task>/step.json`, `<task>/grades/<sha7>.json` and, when `step.json` names `step/oracle`, `<task>/step/grades/<sha7>.json`; prints only `<task> <sha7> build=<b> requirement=<r> passed=<yes|no|none>` (two decimals or `none`); exit 1 when a grade file is missing.

- [ ] **Step 1: Write the failing tests:** 'f2pOf matches parametrised and qualified names and asks when a segment is in both lists' (cases: exact `classname::name`; `test_x[param]` vs origin `file::test_x`; a Jest `a › b` name; a segment in both lists → `ask`; only in p2p → `p2p`); 'nextNumber counts both oracle and step oracle manifests'; 'floorScore counts every scored fix check in requirement and only step ids in build' (a disputed and a `partly` check count in requirement, an excluded `weak` does not); 'floorScore gives null build and passed for no step id'; 'passed needs every high and medium step check to pass' (and is true for step checks that are all `low`); 'score prints only the counts line'.
- [ ] **Step 2: Run** `bun test tests/bench-oracle.test.mjs tests/bench-score.test.mjs` — expect FAIL.
- [ ] **Step 3: Implement**; README: the `score` command and the sentence that `grade`'s `build=` is not H1 under the floor rule.
- [ ] **Step 4: Run** `bun test ./tests` — all pass, output pristine. Commit `git commit -m "Add the floor-rule score, the fail-to-pass matcher and id numbering over step oracles"`.

### Task 3: p8b reclassified

**Files:**
- Create (gitignored): `p8b/superseded/trial-classify-1.json`, `trial-classify-2.json` (moved), `p8b/{classify-*.reply.md, classify-*.json, labels.json, agreement.json}`, `<data>/step9/p8b-classify.tsv`
- Modify: `progress/progress.md`

- [ ] **Step 1:** Move the two trial files with `mv` (not read). Check by count that p8b has 9 scored checks (a script in `<data>/logs/step6/` printing verdict counts only).
- [ ] **Step 2:** `bun bench/oracle.mjs classify <data>/env/real-estate.json p8b`; record its line.
- [ ] **Step 3:** Write `step9/p8b-classify.tsv` (`task id`, header) from `agreement.json` `disputed` by a script that prints only the row count. Record counts, κ/raw/AC1 next to section 14's, and usage.

### Task 4: External step oracles

**Files:**
- Modify: `bench/oracle.mjs` (command `step <task>`), `bench/README.md`, `tests/bench-oracle.test.mjs`
- Create (gitignored): `<data>/ext/briefs/f2p.md`, `<data>/<task>/{step.json, step-f2p.json, work/f2p.prompt.md, f2p.reply.md}`

**Interfaces:**
- Consumes: `f2pOf`, `queuePick`, `sealedAgent`, `taskOf`.
- Produces: `bun bench/oracle.mjs step <task>` for an external task (ruling 2): the scored checks from `oracle/manifest.json` and `validation-<end7>.json`; `f2pOf` per scored check (every label) against `ext/sealed/<slug>/f2p.json`; when any is `ask`, one resolver `f2p-<task>` (`sealed-agent env/<task>.json`, `--at <end>`, tools `Read,Glob,Grep`, prompt = `ext/briefs/f2p.md`, the `ask` origins and both case lists; reply `[{ origin, verdict }]`; a bad reply is run once more as `-2`; a record is reused under the `promptSha` rule of `write`); writes `step-f2p.json` (every scored check) and `step.json` (`oracle: "oracle"`, the `build`-labelled `f2p` ones, ids by `queuePick(…, 15, seed)`); prints only `<task> step candidates=<n> f2p=<k> p2p=<p> unknown=<u> ids=<i> resolver=<ran|reused|none>`.

- [ ] **Step 1: Write `ext/briefs/f2p.md`**: for each listed origin, open that test at the end commit and decide whether it is one of the fail-to-pass cases (`f2p`), one of the pass-to-pass cases (`p2p`), or neither can be told (`unknown`); reply only the JSON array; no repo, stack or task named.
- [ ] **Step 2: Write the failing tests** (fake agent, fixture data folder): 'external step writes only step.json and step-f2p.json'; 'step keeps only build-labelled scored checks whose origin is f2p'; 'the resolver runs only for ask origins and unknown is out'; 'ids are the first 15 by seed'; 'a rerun after labels.json changes reuses the resolver record and changes only ids'; 'step prints no origin or case name'.
- [ ] **Step 3: Run** — FAIL; implement; `bun test ./tests` pass; commit `git commit -m "Build an external task's step oracle from its traceable fail-to-pass checks"`.
- [ ] **Step 4: Run** `step` for the 24 kept external tasks; record per task candidates, f2p, out, ids and usage; list the tasks with 0 ids.

### Task 5: Real-estate step oracles

**Files:**
- Modify: `bench/oracle.mjs` (command `step <task.json> <task>`), `bench/README.md`, `tests/bench-oracle.test.mjs`
- Create (gitignored): `<data>/briefs/steps.md`, `<data>/briefs/step-re.md`, `<data>/<task>/step/…`, `<data>/<task>/step.json`

**Interfaces:**
- Consumes: `queuePick`, `nextNumber`, `judge`, `writer`, `scaffoldInto`, `fixRound`, `gradePass`'s pattern, `noAppAt`, `isTestPath`, `gitOut`, `loadTask`.
- Produces: `bun bench/oracle.mjs step <task.json> <task>` for a task of `tasks.json` (rulings 3–6), in order, each stage reusing its record:
  1. lister `steps-<task>` (`--at <end>`, tools `Read,Glob,Grep`, prompt `briefs/steps.md` with `filter-source.md` and `input.md` fenced; reply `[{ step, file, title }]`; bad reply once more as `-2`), resolved by the tool into `step/steps.json` (`[{ step, file, title, resolved: true|false }]`), deduplicated by `<file>::<title>`;
  2. pick: `queuePick` over `<task>:<file>::<title>` of the resolved ones, 15;
  3. writer `step-<task>` into `step/work/write/` (prompt `briefs/step-re.md`, `briefs/oracle-re.md`, the ids `<end7>-T<k+1>` … with their tests, `git show <end>:<file>` of each distinct file, the scaffold's top-level files, the folder), judged by the step 5 writer gates with the step's `origin`; accepted files into `step/oracle/` with the scaffold (`scaffoldInto`);
  4. validation: `grade <task.json> step/oracle --validate <end> --bad <base> --sealed --reuse` (a base without `appFile`: `grade --at <end>` only, and the validation file written with `bad: ["precondition"]` per check and `stage: "no app at base"`); a grade that throws gives `error` with its stage; at most 2 fixer rounds (ruling 11, labels `fix-step-<r>-<task>-<end7>`);
  5. `step/labels.json` (every scored step id `build`) and `step.json` (`oracle: "step/oracle"`, the scored ids).
  
  Prints only `<task> step listed=<n> resolved=<r> picked=<p> written=<w> refused=<f> none=<x> valid=<v> absent-at-base=<a> weak=<k> broken=<b> error=<e> fixer rounds=<r> ids=<i>`.

- [ ] **Step 1: Write the briefs.** `steps.md`: list every feature step of the features the filtered input keeps, with the test the source text names for it, file and title verbatim; leave out a step that names no test; no repo, stack or customer named. `step-re.md`: rewrite each listed test as one black-box check with the given id, following the rules below it; a test you cannot reach through the public interface is `interface: none`.
- [ ] **Step 2: Write the failing tests** (fake agent, fake grade, the step 5 fixture repo): 'real-estate step writes only under step and step.json'; 'a title that matches no test file, or two, is unresolved'; 'the pick happens before the writer and takes 15 by seed'; 'step ids number after the highest of that prefix'; 'a base with no app is not run and every step check reads precondition there'; 'a broken step check gets a fixer round and a changed one stays broken'; 'step prints no title, file or behaviour'.
- [ ] **Step 3: Run** — FAIL; implement; `bun test ./tests` pass; commit `git commit -m "Build a real-estate task's step oracle from the tests its feature steps name"`.
- [ ] **Step 4: Run** `step` for the 14 kept tasks and p8b, one at a time, `pgsnap` equal around the batch; record each line, the grade runs and usage.

### Task 6: Step 9 additions and lock

**Files:**
- Create: `progress/step6-lock.md`, `<data>/step9/sample-7.1-step.tsv`
- Modify: `docs/log.md`, `progress/progress.md`

- [ ] **Step 1:** Write `sample-7.1-step.tsv` (`set task id`): `queuePick` of 10 over every scored real-estate step id of the 14 kept tasks, by a script in `<data>/logs/step6/` that prints only the count.
- [ ] **Step 2: Check:** every kept task and p8b has `step.json`; real-estate ones have `step/validation-<end7>.json`; the step 5 lock's hashes of `oracle/`, `labels.json`, `agreement.json`, `validation-*.json` and `step9/*` (all but p8b's files and the two new ones) still match; `git status --short bench` empty; no Docker call was made.
- [ ] **Step 3: Write** `progress/step6-lock.md`: the floor-rule decision and its numbers; p8b's reclassification (classified, build, requirement, partly, disputed, κ/raw/AC1 beside section 14's); per external task candidates, f2p, out, ids; per real-estate task listed, resolved, picked, written, none, valid, absent-at-base, weak, broken, error, ids; per set the median of step ids per task, the tasks with none and the tasks whose step checks are all `low`; H1's N; the step 9 additions; the probe scripts; `shasum -a 256` of every `step.json`, `step-f2p.json`, `step/` file, brief and step 9 file (paths relative to `<data>`); the `bench/` commit.
- [ ] **Step 4: Record** usage in `progress/progress.md`; **Creation** line in `docs/log.md`; commit `git commit -m "Lock the step oracles of step 6 with the floor-rule decision and hashes"`.

## Known limits

- For external tasks the floor rule adds no check: H1 rests on a median of 2 checks per task, the near-binary build score of section 14 lesson 5. The N rule of step 11 is the guard.
- External step checks count in H1 and in H2 (ruling 7, the prereg's "all fix-commit checks then score H2").
- Real-estate step checks are not classified; a step test that pins a detail the input does not state still scores H1. The 7.1 sample of step checks is the human guard.
- The lister reads plan text that names tests in several forms; a step whose test it cannot name or the tool cannot resolve has no check, and a step of a dropped feature group listed by mistake would score H1.
- A step test rewritten at the end commit may fail there for a bug the task's later fixes found; it is then `broken` and out, so H1 does not measure that step.
- p8b keeps its step 2 validations (no end-product bad version, ruling 10 of step 5 came later); p8b is trial-only.
- The f2p resolver judges with one agent; `unknown` is out.

## Not in this plan

Seeded bugs (step 7, which grades with `grade` and scores with `score`); the canary (step 8); every human read and settlement (step 9); recounting the step oracles after step 9 and the stick v1 lock (step 10); any walk for more external tasks (as the user decides above).
