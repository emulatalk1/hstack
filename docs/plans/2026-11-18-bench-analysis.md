---
type: plan
title: "Analysis plan"
description: "Prereg step 14: register every analysis rule the prereg leaves open before any score is opened, build the analysis on synthetic fixtures, then open the per-run table once and compute H4 first, H1–H3 with Holm, H5, pass^k, autonomy, the feature-missing rate and cost exactly per sections 9–10; report every deviation from the plan."
status: draft
generated: { by: claude-code/2.1.318, at: "2026-11-18T20:37:12+07:00" }
sources:
  - id: prereg
    resource: /plans/2026-10-27-benchmark-prereg.md
  - id: runs
    resource: /plans/2026-11-11-bench-scored-runs.md
---

# Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development for the code tasks (1 and 2), on synthetic fixtures only; registering, opening the table, running the analysis and the report are the controller's. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prereg section 12 step 14: "Grade and analyse exactly per sections 9–10; report every deviation from this plan." Nothing is graded again: every standing product has its final grade from step 13.

**Architecture:** Every rule that can move a result is written here and registered in the prereg (Task 0) before the analysis tool exists, and the tool is built and reviewed on synthetic rows (Tasks 1–2) before any score is opened. Then the controller writes `<data>/step14/registered`, which unlocks `scored.mjs table` (it refuses without it), runs `table` once and `analyse` once. `analyse` prints H4 first and prints no H−B comparison when H4 is not met.

**Tech Stack:** Bun 1.4.4+, `bun:test`, `bench/lib/score.mjs` (`floorScore`, `bootstrapMean`, `tInterval`, `canaryScore`), `bench/scored.mjs` (`table`), `bench/canary.mjs` (`records`, `standing`, `aboveFloor`).

**Spec:** prereg sections 2 (H1–H5, thresholds, the floor rule and "Applied at step 6" ruling 7, Holm, H4 as gate, real-estate secondary), 9 (9.1–9.3), 10.1, 12 step 14 and every paragraph "listed for step 14", 13, 15; `progress/step13-lock.md` (open points for step 14, deviations, known limits) and the earlier locks' deviations.

## What is analysed

| measure | set | tasks | arms | decides |
|---|---|---|---|---|
| H4 | external | the 29 `scored` rows of `progress/stick-v1/tasks-step11.tsv` | H − W | the gate for H1–H3 |
| H1 | external | the 24 of them with `h1_ids` > 0 (s1-01, s1-06, s3-01, s3-07, s3-09 have none) | H − B | Holm |
| H2, H3 | external | the 29 | H − B (H3 also H alone) | Holm |
| H5 | external + real-estate | the 38 (H's 114 standing H5 rows) | H | its own threshold (secondary) |
| the same as H1–H3 | real-estate | p1, p2, p3, p4, p6a, p8a, p8c, p8d, p8e (H1 only where the task has step ids) | H − B | nothing (secondary) |
| pass^1, pass^3, feature-missing, tokens, minutes | both | as their rule says | each arm | nothing |

"H2–H4 run on every kept task" is the prereg's own wording (step 11 deviations), which replaced the step 10 lock's "H4 … 24 tasks".

## Decision for the user (asked with this plan)

1. **Section 13 items 3–5** (13.3 the rerun of grading from stored products on another machine or by another person and 3 external tasks rerun from scratch; 13.4 the cold setup on s1-09, s2-09, s3-07; 13.5 the blind rating of 20 H/B pairs). Section 12 step 14 asks only for sections 9–10; the step 13 lock left these open for step 14. **(a) Recommended:** step 14 is the analysis and its report; 13.3–13.5 go to a step 15 plan, and the report says acceptance (section 13) is **not judged** until they are measured. Done within about a day. (b) Step 14 also builds and runs 13.3–13.5 (a regrade path for a second clone, 9 more runs, a cold-setup read of H's transcripts, two blind raters): about 3 more days, past Saturday, each with its own rules registered first.

## Rulings (Task 0 registers them in prereg section 12 as "Applied at step 14" before any change to `bench/`)

1. **Sets:** as "What is analysed". Acceptance reads only external tasks; real-estate is printed, with no Holm and no verdict.
2. **The runs:** the standing runs `scored.mjs table` writes (above the step 13 floor, `machine` runs out, k = 3), once, to `<data>/step13/table.json`. H5: the 114 standing rows, the last count line per task and run of `logs/step13/h5.out` (`logs/step13/h5-standing.out`; the four superseded lines of the store-overlap rerun out), read from `<task>/seeded/h5/H-<run>.json`: a bug is caught when `caught` is `true`, a miss when `false`.
3. **A run's score.** A run's score is `floorScore`'s (step 6 ruling 7) from its final grades, `table`'s rule and the canary's: every oracle kind's grade is the product's own and either good or at its second attempt, "whatever it gave" (canary), and "`noresult` after 2 attempts stands and is counted" (step 13 ruling 4): an `error` check is not passed, so an all-`error` grade scores what it gave. The lock's three `noresult` runs (s1-03 H-1 41df55b, s1-03 W-3 93ca515, p8e B-2 f63c791) all have such final grades, so all three are scored. A run without a final grade has no score and adds nothing (the lock lists none): a task's score in an arm is the mean over its scored runs, and a task with no scored run in an arm leaves that comparison, counted and named. Beside each H1, H2 and H4 line, the same mean with the `noresult` runs left out is printed, deciding nothing. H4's per-run score is `canaryScore` (a null term adds nothing, step 8 ruling 9).
4. **The interval:** `d_t` = the task's mean in one arm minus its mean in the other; the 95% percentile bootstrap over tasks (10,000 resamples of tasks, each task keeping its runs' mean; `bootstrapMean`'s PRNG) decides; Student's t interval (`tInterval`) is printed beside it and decides nothing (the canary extension had them disagree). Seeds: `hstack-bench-2026-10-27:step14:<name>`, `<name>` one of `H4`, `H1`, `H2`, `H3a`, `H3b`, `H5`, `H5-ext`, `H5-re`, `H5-no-sb-s2-07-4`, `passk-<set>-<arm>-<j>`, `re-<measure>`.
5. **H4 first:** `d_t` = H − W over the 29 tasks; met when the 95% lower bound > 0. Section 7.3 ruling 9's reading: `d` on build and on requirement apart is printed beside it, deciding nothing. Before the H4 line, `analyse` prints two integrity lines and stops before any score line when either differs: the runs without a score and the `noresult` runs, by name, against the lock (none, and the three of ruling 3); the H5 sums against the lock (caught 137, miss 54). Not met: H1–H3, real-estate's H − B, pass^k and the feature-missing table are neither printed nor written ("if H4 is not met, H1–H3 are not reported"); H4, H5, tokens and minutes are.
6. **H1–H3 and Holm.** H1: build, H − B, lower bound > 0, and the point estimate ≥ 0.10. H2: requirement, H − B, lower bound > 0. H3: (a) H's interventions per task (the mean of its runs' record `interventions` over **all** its standing runs, scored or not; all 315 standing records hold a number), upper bound ≤ 1.0; and (b) H − B interventions, upper bound ≤ 0.5. Each bound test has a bootstrap p over its 10,000 resample means, used only to order: for a lower test (`> threshold`) `min(1, 2·#{m ≤ threshold}/R)`, for an upper test (`≤ threshold`) `min(1, 2·#{m > threshold}/R)`; H3's p is the larger of (a) and (b). Holm at α = 0.05: the three ordered by p (ties by ID), the i-th (i = 1, 2, 3) is met when its two-sided (1 − α/(4 − i)) percentile interval clears its threshold(s), the first not met stops, and each one after it is not met. H1's point clause is applied after the step-down and does not stop it. The 95% intervals are printed for all three.
7. **pass^k (9.2):** per set and arm, over the tasks whose runs have a non-null `passed` (tasks with step ids): k = those runs, c the passed ones, pass^j = C(c, j)/C(k, j) for j = 1 and 3; a task with k < j leaves pass^j, counted; the mean over tasks with a 95% bootstrap. Decides nothing.
8. **H5:** per task, `caught` and `miss` summed over its 3 H rows; rate = Σcaught / Σ(caught + miss) over the tasks with caught + miss > 0; 95% bootstrap resampling those tasks (each resample's ratio of sums); met when the lower bound ≥ 0.5, on the pooled 38 tasks (H5's set in section 2). Printed apart, deciding nothing: external, real-estate, and the pooled rate without sb-s2-07-4 (section 8.3's note); the not applicable, refused, not ready and no suite counts beside it. The mutation score is not measured (step 13 decision 4 (a)); the report lists it.
9. **Also reported, deciding nothing:** the feature-missing rate (9.1) per set and arm, the mean over scored runs of the share of a run's scored checks that read `precondition` (its step ids and its non-excluded fix checks, one per id); tokens (input + output) and minutes per run over all standing runs, scored or not, per set and arm (two-lane minutes are not comparable with the trial's); end reasons counted.
10. **Order and sealing:** the analysis is built on synthetic rows only. After the user approves this plan, Task 0 registers it, and Tasks 1–2 are reviewed and committed, the controller writes `<data>/step14/registered` as `{ "plan": "<commit>", "tool": "<commit>", "at": "<iso>" }`, runs `table` then `analyse`, once each. Nobody opens `table.json`, a grade or a run's score before `analyse` prints. A fault found in the tool after that is fixed with a test, the analysis is run again, both outputs are kept, and the report lists it. Transcripts, products and grades are still not read by hand; nothing goes to a designer.
11. **The verdict:** per hypothesis, met or not met as rulings 5–8 give, in the prereg's words. Section 13 acceptance is "not judged" while any of its items is unmeasured. The stick is worded as the step 9 decision registers it ("locked; its sensitivity is **not validated**"), with the agent-only reads and the 7.2 gate measured by one model against two raters of another.
12. **The lock:** `stick hash` (output outside `<data>`) and `compare progress/stick-v1-step13.sha256 --reasons progress/step14/reasons.tsv`, expected changed 0 (step 14 adds `step13/table.json`, `step14/` and `logs/step14/`, and rewrites nothing).

**Seen before these rulings were written** (each a deviation the report lists): the H5 counts (caught 137, miss 54, not applicable 82, refused 15; `progress/step13-lock.md`) before ruling 8's interval; the three `noresult` runs, their arms and their grades' status counts (all `error` on the fix-commit oracle) before ruling 3. Ruling 3 is step 13 ruling 4 and `table`'s code as they stand; ruling 8 follows 10.1's resampling of tasks; neither was chosen by the numbers.

## Global Constraints

Branch `bench-step14` from `main` (8a19825); `<data>` = `/Users/hbchuc/Documents/programing/vibe-code/hstack/.evidence/bench`; `HSTACK_BENCH_MACHINE=<data>/machine.json`; Bun only, no new dependency, `bench/` names no stack, customer or task (the sb-s2-07-4 and set names come from arguments or data files, never code); every full test run is `bun test ./tests` teed to `<data>/logs/step14/tests-<n>.out`, pristine; `bootstrapMean`'s default output must stay equal (the canary and step 9 numbers rest on it); never touch `real_estate*` databases or `outsourcing/`; implementers work on fixtures only; docs and logs in English; push with `git -c http.postBuffer=524288000 push` when asked.

## Review Focus

1. A `noresult` run dropped from a deciding line (ruling 3 scores it), a run without a final grade counted, or a task with no scored run in one arm left in a paired mean. Tests: Task 2 'a noresult run with a final grade counts as scored…' and 'a run with no score adds nothing…'.
2. H1–H3 printed or written when H4 is not met. Test: Task 2 'H4 not met: no H minus B line'.
3. Holm stopping wrongly: a later hypothesis met after an earlier one failed, or H1's point clause stopping the step-down. Test: Task 2 'Holm steps down by p and stops at the first not met'.
4. `bootstrapMean` changed at its default. Test: Task 1 'the 95% interval is unchanged at the default level'.
5. pass^3 computed for a task with only 2 runs that have `passed`. Test: Task 2 'pass^j leaves a task with fewer than j runs'.

---

### Task 0: Register the rulings

**Files:** Modify `docs/plans/2026-10-27-benchmark-prereg.md` (section 12, "Applied at step 14 (<date>)" after the step 13 amendments), `docs/log.md`.

- [ ] **Step 1:** After the user's approval of this plan, write the paragraph: the decision as answered, rulings 1–12, and "Seen before these rulings were written". End: "Registered before any change to `bench/` for step 14 and before `<data>/step14/registered` exists; no score of a step 13 run has been opened." Commit.

### Task 1: Intervals at a level, a bootstrap p, a ratio bootstrap, the feature-missing share

**Files:** Modify `bench/lib/score.mjs`, `bench/scored.mjs` (`table`); Test `tests/bench-canary.test.mjs` (`bootstrapMean` is tested there), `tests/bench-score.test.mjs` (`floorScore`), `tests/bench-scored.test.mjs` (`table`).

**Interfaces:**
- Produces: `bootstrapMean(ds, seed, resamples = 10000, level = 0.95) -> { mean, lower, upper }` (lower = sorted means at `floor((1 − level)/2 · R)`, upper at `floor((1 + level)/2 · R)`, as today at 0.95); `bootstrapP(ds, seed, threshold, side: 'lower' | 'upper', resamples = 10000) -> number` (ruling 6, over the same resample means `bootstrapMean` draws for that seed); `bootstrapRatio(pairs: [num, den][], seed, resamples = 10000, level = 0.95) -> { rate, lower, upper }` (ruling 8); `floorScore(...)` adds `featureMissing: number | null` (ruling 9); `table` writes `featureMissing` and `noresult` (a kind's final grade not good, as `report` counts it) per run.

- [ ] **Step 1:** Tests: 'the 95% interval is unchanged at the default level' (a fixed `ds` and seed give the same `{ mean, lower, upper }` as before the change, values pasted from a run on the old code); 'a wider level gives a wider interval'; 'bootstrapP is 0 when every resample clears and 1 when none does', 'an upper test counts only means above the threshold' (a resample equal to it clears); 'bootstrapRatio of sums' (pairs `[[1,2],[3,4]]` give rate 4/6); 'featureMissing counts precondition once per id over step ids and non-excluded fix checks'; 'table marks a run noresult when a kind's final grade is not good'.
- [ ] **Step 2:** Run them; they fail. Implement (one shared resample routine); run `bun test ./tests` teed; pristine. Commit.

### Task 2: The analysis

**Files:** Create `bench/lib/analysis.mjs`; Modify `bench/scored.mjs` (an `analyse` command), `bench/README.md`; Test `tests/bench-analysis.test.mjs`.

**Interfaces:**
- Consumes: Task 1's functions; `table.json` rows `{ task, set, arm, run, build, requirement, passed, featureMissing, tokens, minutes, interventions, end }`.
- Produces: `analyse({ runs, h5, sets, expect, seed }) -> result` (pure): `sets` = `{ h1: [task], external: [task], realEstate: [task], h5Drop: [bugId] }`, `expect` = `{ noresult: ["<task> <arm>-<run>"], unscored: [], caught, miss }` (the integrity lines); `h5` = `[{ task, set, run, bugs: [{ bug, caught }] }]`; `result` = `{ integrity, h4, h1, h2, h3, holm, realEstate, passK, featureMissing, h5, cost, ends }`, nothing after `integrity` when it fails, the H − B parts absent when `h4.met` is false; `h4` also holds `build` and `requirement` paired lines. Each paired line: `{ tasks, out, mean, lower, upper, tLower, tUpper, p, met, withoutNoresult: { mean, lower, upper } }`. `scored.mjs analyse` refuses without `<data>/step14/registered` and without `<data>/step13/table.json`, takes `<tasks.tsv> --h5-drop <bugId> --expect <json>` (the sets from the tasks file; the dropped bug and the lock's expected names and sums as arguments, never in code), reads the H5 rows per `logs/step13/h5-standing.out`, writes `<data>/step14/analysis.json` and prints one line per measure, H4 first.

- [ ] **Step 1:** Tests on synthetic rows: 'a noresult run with a final grade counts as scored, and its without line leaves it out'; 'a run with no score adds nothing, and a task missing an arm leaves the pair'; 'interventions, tokens and minutes count every standing run, scored or not'; 'an integrity mismatch stops before H4'; 'H4 prints build and requirement apart'; 'H4 not met: no H minus B line' (result and printed lines); 'Holm steps down by p and stops at the first not met' (three hypotheses with known p, one failing in the middle); 'H1 needs its point at 0.10 after Holm'; 'H3 takes the larger p of its two bounds'; 'pass^j leaves a task with fewer than j runs' and 'pass^j is C(c,j)/C(k,j)' (c = 2, k = 3: pass^1 = 2/3, pass^3 = 0); 'H5 sums caught and miss per task, skips tasks with neither, and drops listed bugs only in the line without them'; 'the same seed gives the same result'; 'analyse refuses without registered'.
- [ ] **Step 2:** Run them; they fail. Implement; README gets the command and the rulings it follows. Run `bun test ./tests` teed; pristine. Commit.

### Task 3: The deviations list (controller; any time before Task 5)

**Files:** Create `progress/step14/deviations.md`.

- [ ] **Step 1:** Every deviation the prereg and the locks list for step 14: grep the prereg for "step 14" and "Deviation", and each `progress/step*-lock.md` for its deviations section; one line each with its source (file and section), grouped by step; the count per source written beside the grep's count. Add this plan's: the two "seen before" items, the H5 porter variance (the overlap rerun moved 2 of 6 re-ported bugs on fresh porter draws), the mutation score and the per-layer measures not measured, 13.3–13.5 per decision 1. Commit.

### Task 4: Register and run (controller)

- [ ] **Step 1:** Final review of Tasks 1–2 on the most capable model (the diff from `main`); fixes and a re-review. `bun test ./tests` teed, pristine; `git status --short bench tests` empty.
- [ ] **Step 2:** Write `<data>/step14/registered` (ruling 10). Run `bun bench/scored.mjs table`, then `bun bench/scored.mjs analyse progress/stick-v1/tasks-step11.tsv --h5-drop sb-s2-07-4 --expect '{"noresult":["s1-03 H-1","s1-03 W-3","p8e B-2"],"unscored":[],"caught":137,"miss":54}'`, output teed to `<data>/logs/step14/analyse.out`. A refusal or a crash stops for a fix under ruling 10.

### Task 5: The report and the lock

**Files:** Create `progress/step14/reasons.tsv`, `progress/stick-v1-step14.sha256`, `progress/step14-report.md`; Modify `docs/log.md`, `progress/progress.md`.

- [ ] **Step 1:** Ruling 12's hash and compare; any unexplained or missing stops.
- [ ] **Step 2:** `progress/step14-report.md`: the question (section 1); the runs (from the step 13 lock); H4 and, when met, H1–H3 with their 95% and Holm intervals, p, the zero lines and the verdict; H5 (pooled, per set, without sb-s2-07-4, the other classes); real-estate; pass^k; feature-missing; tokens and minutes; ruling 11's verdict and stick wording; not measured (mutation score, per-layer measures, 13.3–13.5 per decision 1); the deviations of Task 3; known limits (section 15, the locks', H5's single porter draw); the manifest. Advisor review; the user's approval; this plan `stable`.

## Known limits

- **One analysis, seen once:** a fault found after `analyse` prints is fixed and rerun in the open, both outputs kept; nothing is tuned to a result.
- **H5 is one porter draw per bug;** a redraw moved 2 of 6 bugs between not applicable and caught.
- **Two rules were written after counts were seen** (ruling 3, which restates step 13 ruling 4 and `table`; ruling 8, by 10.1's precedent).
- **A `noresult` product scores what its timed-out grade gave** (0 where every check is `error`): a grade timeout counts against the arm whose product it was; the line without them is printed beside.
- **The step 13 limits stand** (two-lane minutes, the store overlap rerun, agent-only reads of the stick).

## Not in this plan

Any new run or grade; 13.3–13.5 under decision 1 (a); the per-layer measures and discovery replays (step 13 decision 5); the mutation score; any change to the plugin, `arms.json`, an oracle, a seeded bug or a score rule.
