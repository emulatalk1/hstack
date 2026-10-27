---
type: plan
title: "Measuring stick: pre-registration plan (Part 1)"
description: "Hypotheses, task set, oracle, validation, task and run counts, cost and acceptance thresholds of the benchmark that measures the hstack harness, registered before any run."
status: stable
generated: { by: claude-code/2.1.310, at: "2026-10-27T09:10:00+07:00" }
verified:
  - { by: claude-code-advisor/2.1.310, at: "2026-10-27T10:40:00+07:00" }
  - { by: human:emulatalk1, at: "2026-10-27T10:41:18+07:00" }
sources:
  - id: layers
    resource: /design/2026-10-26-layers.md
---

# Measuring stick: pre-registration plan (Part 1)

This plan is committed **before** any scored run. After the lock (section 12), any change to a hypothesis, measure, threshold, task set or k is a new commit with its reason, and the final report lists every such change.

The customer's raw data (plans, tests, patches, filtered inputs, oracles) lives in `.evidence/bench/` (gitignored). The scripts live in `bench/` of this repo; they take repo paths as arguments and hold no customer data. `bench/` is not plugin content.

## 1. Question

Does the harness produce output that meets the requirement, at higher quality than Claude Code without the plugin, with few human interventions, measured by a hidden oracle the harness cannot read? Which harness layers are worth keeping?

Not measured here: typing speed, UI polish beyond what the oracle checks, infrastructure cost beyond tokens and hours.

## 2. Hypotheses and thresholds (pre-registered)

Every comparison is paired on the same task, with a 95% confidence interval (section 10). "Met" means the lower bound of the interval clears the threshold, not the point estimate.

| ID | Hypothesis | Measure | Acceptance threshold | Set |
|---|---|---|---|---|
| H1 | The harness builds the stated requirement better than the baseline | build score (9.1) of H minus B | lower bound > 0 **and** point estimate ≥ 0.10 | external tasks |
| H2 | The harness raises spec edges the requirement does not state | requirement score (9.1) of H minus B | lower bound > 0 | external tasks |
| H3 | Autonomy is high enough | interventions per task of H (9.3) | upper bound ≤ 1.0, and H − B upper bound ≤ 0.5 | external tasks |
| H4 | The measuring stick discriminates | build + requirement score of H minus W (weak variant) | lower bound > 0 | external tasks |
| H5 | The test suite the harness writes guards | seeded-bug catch rate of that suite; mutation score on changed lines | seeded catch rate lower bound ≥ 0.5 | external tasks + `real-estate` |

Floor rule for H1 (pre-registered): once every task's checks are classified with the interface sheet (section 12, step 6), if the median number of **traceable** checks per task is below 5, H1's build score no longer comes from the fix-commit oracle but from a **step oracle**: the task's own tests for its feature steps (a `real-estate` plan names one test per step; for external tasks, the FAIL_TO_PASS tests the classifiers mark traceable), rewritten black-box per 6.2, at most 15 per task chosen by seed, validated to pass on the task's end product and fail at the task base. All fix-commit checks then score H2. H1's threshold stays.

H1, H2 and H3 are the three primary tests, with a Holm correction across them. H4 validates the stick: if H4 is not met, H1–H3 are not reported (the stick cannot tell a weak harness apart). H5 is secondary and reported on its own.

`real-estate` is a secondary set: its 20 bugs shaped the old design, so its results are reported but not used for acceptance.

## 3. Arms

| Arm | What it is |
|---|---|
| B | Claude Code without the plugin, same model, same task prompt, same tool permissions, no-human mode (9.3) |
| H | Claude Code with the hstack plugin at a locked commit |
| W | H with these off: the reviewer in its own context, the independent oracle, the gate against weakened tests. The builder reviews itself. This is the stick's canary |
| H−layer | H without one layer. Only used in the per-layer measures (section 8); not run end to end unless the budget allows |

Each run records: the model ID of every agent (read from the transcript, not from config), date and time, plugin commit, task base commit, input/output tokens, duration, number of questions to a human.

## 4. Task set

### 4.1 `real-estate` tasks (secondary set)

Each plan that adds features is one task. Its base commit is the commit just before the plan's first commit. Test-only plans (4.1, 7a.1) are not tasks. Fix plans (7a, 9, 10) and "Items carried" sections are not tasks: they are oracle sources for earlier tasks.

Oracle candidates: source hunks of later commits whose removed lines (or, for a pure addition, the old line just before the insertion) were written by the task's commits, by `git blame` at the parent (`bench/oracle-sources.mjs`). The "catalog" column counts only hunks of the 23 fix commits in `.evidence/replay.md`; most other candidates are later features rewriting old code (a requirement change, not a bug) and must be labelled (6.1).

| Task | Plan | Base commit | Commits | Candidate hunks (with test changes) | of which catalog | Catalog commits |
|---|---|---|---|---|---|---|
| p1 | 1 foundation | 691a723 | 16 | 158 | 15 | 0870afc 4e58ba5 89583d2 dd56b84 e41d45f |
| p2 | 2 properties | 7adfd47 | 12 | 187 | 33 | 24c426f 4e58ba5 89583d2 d82f2b0 e41d45f eb2b016 |
| p3 | 3 articles | 5eced48 | 15 | 139 | 20 | 89583d2 dd56b84 |
| p4 | 4 surveys | be6c20b | 18 | 147 | 5 | 090f6f2 5b6646d |
| p5 | 5 matching | 8906318 | 9 | 20 | 0 | — |
| p6a | 6a requests | 31fcab0 | 8 | 115 | 14 | 0870afc 24c426f 36d089b 6cedf96 dd56b84 |
| p6b | 6b notifications | d7f2fd3 | 7 | 68 | 6 | 090f6f2 6cedf96 dd56b84 |
| p6c | 6c admin polish | 885c4c2 | 10 | 60 | 26 | 24c426f 6cedf96 d82f2b0 dd56b84 e41d45f |
| p7b | 7b limits (new part only) | 9354f4d | 6 | 23 | 6 | 0870afc 24c426f d82f2b0 |
| p7c | 7c launch | 3137149 | 11 | 6 | 2 | 8eccb47 |
| p8a | 8a brand | 0b02f41 | 8 | 47 | 5 | 730509b d82f2b0 dd56b84 |
| p8b | 8b listings | d1ea76b | 7 | 50 | 30 | 24c426f d82f2b0 dd56b84 eb2b016 |
| p8b1 | 8b.1 showcase seed | 1846450 | 6 | 18 | 11 | 4e58ba5 |
| p8c | 8c detail | bf2eea3 | 8 | 43 | 9 | 24c426f dd56b84 eb2b016 |
| p8d | 8d home | bee1c22 | 9 | 44 | 41 | 090f6f2 24c426f 69ebe27 dd56b84 |
| p8e | 8e admin | d7695d6 | 7 | 17 | 16 | b5b3cec eb2b016 |

Rerun: `bun bench/oracle-sources.mjs <repo> <commit,...>`; each task's result is in `.evidence/bench/tasks/<task>.tsv`.

A task is kept when: (a) its filtered input passes `bench/input-check.mjs`; (b) after the fix / requirement-change labelling, at least 3 valid oracle checks remain **that belong to the task**, i.e. are not in the "pre-existing" bucket (7.1); (c) it needs no data outside the repo (for example the `showcase-data/` folder). Before the task-base rule, p5 and p7c were expected to fail (b), leaving 14. p8b gave about 1 task-owned check per 3 catalog hunks (9 or 11 of 30), so tasks with 6 or fewer catalog hunks (p4, p6b, p7b, p8a) may well fail, and the number kept may be only 8–10. The real number is fixed at step 10 of section 12 (stick v1). At most 12 tasks run: if more than 12 qualify, keep the 12 with the most valid oracle checks (ties: the earlier task). The final task list is committed before any run, with the reason each task was dropped.

`real-estate` is a private repo created after the models' knowledge cutoff (June 2026), so it is not in training data. It stays secondary for the reason in section 2.

### 4.2 External tasks (primary set, used for acceptance)

Selection rule, pre-registered, in the style of SWE-bench-Live:

1. Public repo with an open licence, active after 2026-07-01, runnable in a throwaway container.
2. Three clearly different stack groups, 8 tasks each: (S1) a web app with a database; (S2) a desktop app; (S3) a CLI or library in a language other than those of S1 and S2. Marked examples, not binding: S1 a Django or Rails app, S2 an Electron or Tauri app, S3 a Go CLI or a Rust library.
3. Each task is an issue and a merged PR, both created after 2026-07-01 (after the cutoff of every model in the experiment; the cutoff date is recorded with the model ID). The PR links the issue, adds or changes tests, and has at least one test that fails before the PR and passes after it.
4. At least 6 of the 8 repos in each group were never used in hstack. Every repo is brownfield. At least one repo per group serves the cold-setup test (section 13).
5. Sampling: list every candidate meeting 1–4, sort by the SHA-256 of `<owner>/<repo>#<PR number>` joined with the seed `hstack-bench-2026-10-27`, take from the top, at most 2 tasks per repo. The candidate list and the sample are committed before any run.
6. Input: the issue title and body only, plus the repo at the PR's parent commit. No PR description, review comments, or issue comments after the PR opened (they often hold the solution).
7. Oracle: the PR's tests, rewritten as black-box checks at the public interface (6.2). For a library the interface is its public API; for a CLI it is running the real program.

## 5. Input

Filter rules for a `real-estate` plan (tried on p8b, section 14):

- **Keep**, rewritten only to remove pointers: Goal; "User decisions" (drop bullets that only describe how the plan was written); "Global Constraints"; the "Feature steps" of new features.
- **Drop whole**: "Items carried", feature groups that fix earlier plans (for example P8b-F5), "Decisions taken in the scratch copy", "Changes from the design", "Review Focus", "Known limits", "File map", every Task, process instructions. Why "Review Focus", "Known limits" and "Decisions taken in the scratch copy" go: the plan writer drew them out after building the whole plan in a scratch copy (plan 8b: spikes of about 1.52M tokens; 8b's Known limits even hold byte sizes measured on the production build), so they are output of a build, not requirement. Deliberate consequence: an edge stated only in these sections scores the requirement step.
- **Strip inside kept text**: test pointers, source and test file paths and names, internal identifiers. **Keep** the public interface: URLs, query parameters, UI text, API paths, status codes, the project's CLI commands.
- **Mockups**: not given. A step that says "looks like the mockup" keeps its sentence with the tag `[visual, mockup not given]`; oracle checks that rest only on a mockup are out of the score.

The filter reads the plan, and for plans 1 to 6c the entries of the harness's feature list that belong to the plan (those plans keep their feature steps there, not in the plan), as they stood at the last harness commit before the task's first commit: later edits of a plan are output of its build or of later plans. Each filter runs as a sealed agent whose prompt is the rules and that source text, with no tool. A step whose whole text is a test pointer keeps, as a behaviour sentence, what its title states; a step with its own text loses both pointer and title (the title restates the step).

**Interface sheet.** Oracle checks need public names to run: field labels, the accessible name of a form, option texts, URL parameter keys, API field names. The filtered input does not state all of them (p8b: only 2 of the price and sort keys). If a builder picks other names, a check fails on the name, not the behaviour, and the requirement score mixes the two. So the input comes with an interface sheet: **every** public name of the features the task builds, read from the task's end product (p8b: 730509b): every label, option text, form accessible name, URL parameter key and API field name of the pages and endpoints the feature steps mention. Names only, no behaviour. The sheet is not built from the oracle checks (a selective list would tell the builder where the hidden checks look); it is compiled by an agent that has not read the oracle, and it must pass `bench/input-check.mjs`. A name that only exists after a fix commit (for example the label "Tên địa điểm" that d82f2b0 adds) is naturally absent from the sheet.

The filter (an agent) never sees fix commits, later plans, progress logs or the oracle. `bench/input-check.mjs` must print PASS on every input; it looks for code fences, source or test paths, source file names, test calls, test title pointers and code syntax. This is the machine evidence for "the input holds no code or test"; a human also reads 2 random inputs.

## 6. Oracle

### 6.1 Sources

- `real-estate`: candidates by the blame rule of 4.1, plus fix commits **inside** the task (the fix wave after the final review, for example 730509b of p8b), because the task's end product must be free of those bugs.
- Each candidate commit is labelled "fix" (restores behaviour the task intended) or "requirement change" (a later feature changes behaviour) by two independent agents, reading only the commit subject, the diff and the progress-log entry that records who found it (as `attribution.md` does). A human settles disagreements. Only "fix" enters the oracle.
- Fix plans and the content of fix commits never reach the builder's input.

### 6.2 Black-box rewrite

Each test a fix commit adds or changes, if it checks the behaviour of an in-scope hunk, is rewritten as a check that uses only the public interface: the browser, HTTP, the public REST API (logging in through the API as a user would), visible text, URLs; for a CLI, running the program; for a library, its public API. No import of app code, no internal function calls, no database reads. A unit or int test moves to where the behaviour shows to a user; if there is no public path, it stays in the manifest with `interface: none` and is not scored. Each check has a precondition step (does the feature exist) separate from its main assertion, to tell "feature missing" from "wrong at an edge".

The oracle lives outside the tree the builder can read and only runs after the build ends, by the grading script, in a throwaway environment (fresh database, own port).

### 6.3 Classifying each check

Two independent classifier agents, who see only the filtered input and the oracle:

- **traceable**: every assertion **and** every selector or setup value the check needs (labels, URL parameters, status words, numbers) is stated or directly implied by the input. With quotes and step IDs. → scores the build step.
- **not traceable**: a builder could meet the whole input and still fail this check. → scores the requirement step.
- **partly**: split into two checks at assertion level when possible; if not, it goes to the requirement bucket.

Public names in the interface sheet (section 5) count as stated by the input; classifiers judge behaviour only.

A human settles disagreements; agreement before settling (Cohen κ) is reported. The build and requirement numbers are never merged.

## 7. Validating the stick

### 7.1 Oracle

Each check has an explicit precondition step (6.2) and also runs at the **task base commit**. A check that fails at the base **after** passing its precondition tests a bug older than the task (the blame rule misattributed it because the task rewrote a neighbouring or the same line): it goes to the "pre-existing" bucket, counts in no score of this task, and moves to the oracle of the task that introduced it. Failing at the precondition is expected (the feature does not exist yet).

Each check must **fail on a known-bad version** (the parent of the fix commit, and the task's real end product) and **pass on the reference** (the fix commit), in the same run. A check that passes on both is "weak", one that fails on both is "broken"; both are out of the score (mechanics may be fixed, assertions are never weakened). A human confirms a sample of 10 checks per stack: reads each check next to its original test and says whether they check the same behaviour.

For external tasks: the reference is the PR's merge commit, the known-bad version its parent. Three seeded bugs per task (8.3) add known-bad versions.

### 7.2 Raters

- Traceability classification (6.3): κ between the two agents; a human settles every disagreement and re-rates a sample of 20 agreed checks. Usable when (κ ≥ 0.6, or, when one label covers more than 80%, raw agreement ≥ 85% and Gwet AC1 ≥ 0.7) and the human agrees with ≥ 90% of the agreed sample. Why the "or" branch: when nearly every check has the same label, κ is low even though the raters almost always agree (p8b, section 14). If not met, rewrite the classification rule and rerun before the lock.
- LLM judge (if used for the blind quality rating of section 13): calibrated on 30 outputs labelled by two humans; judge–human agreement reported; used only if it is no more than 0.1 below human–human agreement.
- Interventions (9.3): two humans label a sample of 20 transcripts independently by the rule set; κ ≥ 0.7 before one human labels the rest.

### 7.3 Weak variant

W (section 3) must score below H (H4). If not, the stick is not sensitive enough and H1–H3 are not reported.

Because the stick is finished before any plugin exists (section 12), it also gets a canary that needs no plugin: arm B against **B−**, Claude Code without the plugin on a smaller model tier, told to write no tests, run no self-check and stop after one pass. On 6 external tasks (the first 2 of each stack in the sorted list), k = 2, the stick passes when the mean of d = score(B) − score(B−) on build + requirement is > 0 **and** at least 5 of the 6 tasks favour B (with n = 6 a bootstrap bound is not reliable). If it fails, tell the two causes apart before changing anything: run B−'s products against the seeded-bug checks of those tasks and have a human read 3 B/B− pairs. If B− is visibly worse and the stick still cannot see it, fix the stick; if B− is not worse, make B− weaker and rerun. These runs also measure B's cost and its spread between runs of one task; they are not part of the H1–H3 analysis.

## 8. Per-layer measures

### 8.1 Replay

Turn the procedure of `.evidence/replay.md` into a script (`bench/replay`): apply the reverse patch at HEAD, drop every test the fix commit added (`it.each` included), run one layer, record caught or not; a catch counts only if the failing assertion existed before the fix. Keep the two known traps: dropping one test per fix is wrong; e2e must filter the right project.

### 8.2 Dev and held-out sets

- Dev: the 20 bugs of `replay.md` (they shaped the old design). Old results stand: unit + int 1/20, e2e 0/15, blind evaluator 1/14, review 17/20 by the record.
- Held-out: hunks outside the 11 dev commits with `reverts_cleanly = yes` and a same-commit test. The catalog gives 11; 730509b leaves because it is an oracle source of p8b (6.1), so **10** remain (29f4daf 1, 36d089b 1, 400f58a 1, 5b6646d 3, 89583d2 3, b5b3cec 1); counting only logic, validation and data kinds, **4**. On record: while orienting for this plan, the catalog clause of `b5b3cec-01` was shown on screen (not the patch); the hunk stays, marked "clause seen".
- Extension: an agent not involved in harness design reads the subjects and log entries of commits the catalog did not consider (commits that did not match its grep, fix plans 7a, 7b, 9, 10, carried waves), writes the fix hunks as reverse patches into a sealed folder, checks `git apply --check`, and reports only counts. No one designing the harness opens a held-out patch before grading; the grading script prints only caught / not caught.
- Owner of a bug (registered before any step 3 run; `bench/bugs.mjs`): a bug's hunks are `{ file, old }`, `old` the start of the hunk's old side in `git diff -U0 --no-renames <fix>^ <fix>` (a pure addition gives the line it follows). A row of a task's line table (`<data>/tasks/<task>.tsv`) matches a hunk when its commit is the fix's 7-char sha, its file is the hunk's file and its old lines start at `old`. The owner is the task with the most task lines summed over the bug's matching rows; a tie goes to the earlier task in `tasks.json`. With no row, a fix commit inside a task's range (`base..end`, first parent) makes that task the owner with the fix in its end. A bug whose owner's end contains the fix is out of review and audit (the end product already holds the fix); a bug with no owner is out of review, audit and the evaluator (it has no input). Result on the dev set: review and audit run on 18 of the 20 dev bugs: d005fa5-03 has its fix inside p6a, 0870afc-04 has no owner.
- Layer coverage: every layer runs on every held-out bug it can take, with no other subset: the test layers on every bug whose patch applies (dropped bugs and bugs whose fix is a merge commit excluded), the evaluator on every owned bug, review and audit on every owned bug whose fix is not in the owner's end. Held-out ids are opaque (`ho-01`, `ho-02`, …), and the held-out bug file holds its hunk positions, so ownership needs no reading of the patch.
- Order: the held-out replay is graded and locked before the held-out commits (29f4daf, 36d089b, 400f58a, 5b6646d, 89583d2, b5b3cec) are opened as oracle sources for `real-estate` tasks. Tasks that need them (p1–p4, p6a, p8e) wait until then.

### 8.3 Seeded bugs

A seeding agent (sees only the reference solution and the requirement) seeds single-hunk bugs at edges: empty, null, duplicate, letter case, deleted, boundary values. Each bug comes with a black-box check that fails on the bug and passes on the reference; a bug that fails this step is dropped. Target 81 seeded bugs (10.2): 3 per external task (72) plus 9 on `real-estate`. Sealed like the held-out set.

### 8.4 Two measures for two kinds of layer

- **Guard layers** (unit tests, e2e, mutation on changed lines, the independent oracle, the gate against weakened tests): severity-weighted catch rate (high 3, medium 2, low 1) on held-out + seeded bugs + oracle checks. Keep a layer if the catches **only that layer makes** (H vs H−layer, paired by bug, McNemar) have a confidence lower bound > 0.
- **Discovery layers** (chartered exploratory testing, task review, final review, whole-repo audit): real defects no other layer found, confirmed on a clean HEAD, per million tokens. Historical evaluator mark: 1 unique fixed defect per about 144k tokens (`yield.md`, repeats removed), about 6.9 per 1M. Keep a layer if its 95% Poisson lower bound is ≥ 50% of that mark (3.5 per 1M), or if it finds a high-severity defect no other layer finds.
- Review has a record of 17/20 (`attribution.md`) but was never measured in a replay; it is measured by the discovery measure like every layer.
- New layers: minimal version, measure, then keep or drop by the measure of their kind.

## 9. Measures

### 9.1 Score of one run

- Build score = weight of passed **traceable** checks / weight of all valid traceable checks.
- Requirement score = the same over **not traceable** checks.
- A check that fails at its precondition counts as failed and also counts toward "feature missing"; the feature-missing rate is reported on its own.
- Task passed = every high and medium severity build check passes, on the oracle H1 currently uses (the fix-commit oracle, or the step oracle if the floor rule of section 2 applies).

### 9.2 pass^k

With c passes in k runs of a task, the unbiased estimate of pass^j (j ≤ k) is C(c,j)/C(k,j), averaged over tasks; report pass^1 and pass^3 per arm, with bootstrap confidence intervals.

### 9.3 Autonomy

Benchmark runs have no human present. Whenever an agent asks a human (a question, a confirmation request, the stop-and-ask list), a fixed responder answers: "No more information; decide from the requirement", except that when the question offers fallback options it picks the first. Labelling rules (one intervention =):

1. each time the agent stops to wait for a human answer;
2. each time a human must edit a file, run a command or restart for the run to continue;
3. a run abandoned because it cannot continue = 3 interventions.

Not counted: the harness's own automatic reminders, permission requests already covered by allow rules. Historical baseline: transcripts of the outsourcing sessions, labelled by the same rules, one plan per task (bias: that was a real human with private knowledge).

## 10. Statistics

### 10.1 Runs and pairing

- k = 3 runs per task per arm. A task's score in an arm = the mean of its k runs.
- Paired comparison: d_t = score of H − score of B on task t. 95% interval for the mean of d by bootstrap over tasks (10,000 resamples, resampling tasks, keeping each task's k runs), with the t interval alongside.
- Seed: the order of arms on each task is shuffled by a fixed seed, so run time does not favour an arm.

### 10.2 Number of tasks (`bench/power.mjs`)

Formula: N = ((z₀.₉₇₅ + z₀.₈) · σ_d / Δ)², α = 0.05 two-sided, power 0.8.

| σ_d \ Δ | 0.10 | 0.15 | 0.20 |
|---|---|---|---|
| 0.15 | 18 | 8 | 5 |
| 0.20 | 32 | 14 | 8 |
| 0.25 | 50 | 22 | 13 |
| 0.30 | 71 | 32 | 18 |

Assumptions: Δ = 0.15 (the smallest build-score difference that matters), σ_d = 0.25 (not yet measured; middle of the table). That gives N = 22; add 2 for the normal approximation at small N: **24 external tasks**, 8 per stack.

N adjustment rule (pre-registered): the trial run (section 12, step 11) measures σ_d on 4 tasks. If the measured σ_d > 0.25, N is recomputed from the table (no budget cap, section 11). N never drops below 24 because a measured σ_d is small. The trial run is not analysed.

Bugs for the guard measure: n = z² p(1−p)/h². With p = 0.3 and half-width h = 0.1: **81 bugs** (10 held-out + 72 seeded on external tasks; 9 seeded on `real-estate` make up for the narrow logic-kind held-out).

## 11. Cost and budget

**Budget: no limit** (the user, 2026-10-27: "no budget limit, just finish it"). The plan runs to completion on the user's Claude Max 5x subscription; its weekly limit sets the pace, not the scope. The cut ladder below is therefore not used; any later cut is an explicit change to this plan, committed with its reason, never a silent drop of k, N or a comparison. The estimates below are for information only; each step records the usage it actually took (tokens from the transcripts and the change in the weekly limit shown by `/usage`), and the measured numbers replace the estimates.

Estimates; historical mark: outsourcing's plan 8b cost about 4.75M tokens (plan writing with spikes 2.97M, build 0.69M, final reviews 0.50M, fix wave 0.14M, two evaluators 0.46M; task reviews not recorded). The cost of B and of the new harness is not measured yet; the trial run measures both before the lock. Tokens count input and output, as the progress log records them.

| Item | Calculation | Tokens |
|---|---|---|
| External tasks, H and B | 24 tasks × 3 runs × (1.5M + 0.4M) | 137M |
| External tasks, W | 24 × 3 × 1.0M | 72M |
| `real-estate`, H and B | 12 tasks × 3 × (5M + 1.5M) | 234M |
| Oracle preparation (rewrite, validation, 2 classifications, labelling) | 12 `real-estate` tasks × 0.55M (measured on p8b) + 24 external tasks × 0.3M | 14M |
| Layer measures (81 seeded + 10 held-out; review 0.25M + exploratory 0.15M + batched audit 0.2M per bug) | 91 × 0.6M | 55M |
| Trial run | 4 tasks × 2 arms × 2M | 16M |
| Stick canary B vs B− (7.3) | 6 tasks × 2 runs × (0.4M + 0.3M) | 8.4M |
| **Total** |  | **about 536M** |

**Part 1 alone (the stick, before any plugin work):** oracle preparation 14M + held-out replay of tests, e2e and evaluator about 5M + blind review replay on 30 bugs with the full task diff (30 × 0.25M) 7.5M + audit replay (30 × about 1M) 30M + seeded bugs (81 × about 0.1M to seed and validate) 8M + canary 8.4M: **about 73M tokens**. Wall clock, 3 agents in parallel: oracle preparation for 36 tasks about 9 h, replays about 7 h, canary about 4 h, plus setting up a throwaway environment for each of the 3 external stacks (about a day each, not measured): **about 20 hours of agent work plus about 3 days of environment setup, 5–6 working days in all**, plus the human steps. Most of the 536M (the H, B and W rows) is Part 2 and cannot start before the plugin exists.

Hours: a plan-sized `real-estate` build takes about 5 hours for H and 1.5 for B; a PR-sized external task about 1.5 and 0.5. With 4 runs in parallel: about 60 hours for `real-estate`, 45 for external tasks (W included), plus about 10 for grading and layer measures: **about 115 wall-clock hours**.

Cut ladder (not in use while the budget has no limit; kept so that a later cut has a pre-registered order), in order; each step drops one named comparison and never lowers k or N of H1–H3:

1. W runs on 8 external tasks (3 per stack, at least 2), not 24: saves 48M. H4 must still be met on those 8.
2. `real-estate` down to 6 tasks (p6c, p8a, p8b, p8b1, p8c, p8d: catalog oracle and no held-out commit needed): saves 117M. This is the secondary set.
3. Drop `real-estate` end to end, keep only replay and seeded bugs on it: saves another 117M.
4. Discovery-layer measures only for exploratory and audit (review kept as is, no ablation, on its 17/20 record): saves about 23M.
5. Never cut: H and B on 24 external tasks with k = 3, oracle validation, the minimum H4, the held-out replay. If still over budget after step 4: stop and ask the user.

## 12. Run order and lock

The user chose on 2026-10-27 to finish the whole measuring stick before any plugin work (not the shorter path of a minimal stick and the plugin in parallel).

**Part 1: the measuring stick (no plugin exists yet)**

1. Commit this plan (status `draft`), advisor round, user approval (`stable`). From here the rules of sections 2–10 change only by a commit with its reason.
2. Build the tools: `bench/replay`, the oracle grading script, the fixed responder (9.3), a throwaway environment per stack (`docs/plans/2026-10-27-bench-tools.md`).
3a. Filter the input of every `real-estate` task (section 5). Moved ahead of step 3 on 2026-10-27, because the blind review replay gives the reviewer the filtered input of the task that introduced the bug, and the raw plan's Review Focus can name that bug. Filtering needs no fix commit, so the held-out set stays sealed.
3. Held-out set: the extension of 8.2 by a sealed agent, then the replay of the existing layers. Sets: unit + int, e2e and the blind evaluator run on held-out only (their dev results stand); review and the whole-repo audit were never replayed, so they run on dev (20) + held-out. Scope, pre-registered so the replay is not easier than real work: a blind task reviewer sees the requirement and the **full diff of the task that introduced the bug** (task base to task end, with the bug present), not the bug hunk; the audit sees the whole repo at that point. Lock the result.
4. External tasks: build the candidate list, sort it once by the rule of 4.2, commit the sample.
5. Oracles: for every external task and every eligible `real-estate` task (held-out commits only after step 3 is locked): oracle sources, black-box rewrite, the interface sheet, validation including the task-base run (7.1), two classifiers. Agents that write oracles, interface sheets and seeded bugs never share context with the session that will design the plugin.
6. Reclassify p8b with the interface sheet; with all tasks classified, apply the H1 floor rule (section 2) and, if it applies, write the step oracles.
7. Seeded bugs (8.3), validated and sealed.
8. Stick canary without the plugin (7.3): B against B− on 6 external tasks, k = 2.
9. Human steps: settle classifier disagreements, read the input and oracle samples (5, 7.1), check the intervention rules on historical transcripts (7.2).
10. Stick v1: commit the task lists, a hash of every oracle, seeded and held-out file, and the step-1 to step-9 results. Only then does Part 2 (the plugin) begin. The plugin designer never opens the content of oracles, seeded bugs or held-out patches; it sees only scores. Exception on record: the session that wrote this plan read p8b's whole oracle (manifest, behaviours, specs, base-run errors) and may design the plugin, so p8b is used only in the trial run (step 11, not analysed) and is never one of the scored `real-estate` tasks.

**Part 2: measuring the plugin (needs the plugin)**

11. Trial run: 2 `real-estate` tasks (p8b and one other) and 2 external tasks (the first of the sorted list), arms H and B, k = 1. Measure tokens, hours, σ_d; apply the N rule of 10.2. Not analysed.
12. Lock: the plugin commits of arms H and W, the model IDs, N. No change from here.
13. Run in the shuffled order, H and B in the same time window with the same model and CLI version (B runs of step 8 are not reused, because the model and CLI may have changed). Record every run, failed ones included.
14. Grade and analyse exactly per sections 9–10; report every deviation from this plan.

## 13. Acceptance thresholds (decided by neither the agent nor the user)

1. H1, H2, H3 meet the thresholds of section 2 on external tasks, after the Holm correction.
2. H4 is met: W scores below H.
3. Rerun: another machine (or another person) reruns the grading from the stored products and gets the same result for every check; 3 external tasks are rerun from scratch and score inside that task's interval.
4. Cold setup: on an unseen repo in each stack, H's setup finishes, every capability's probe and canary pass, and no human edits anything. No plugin file changes between stacks (compared by hash).
5. Blind rating: two raters who cannot tell which arm made which output (arm names, plugin files and harness traces removed from the diff) rate a sample of 20 pairs; H is preferred over B with a confidence lower bound > 50%.
6. After handing over a real project of another person: the number of bugs reported within 30 days, with the number of features (no threshold yet; tracked).

## 14. Trial on p8b (`real-estate` plan 8b, listings)

Run as a workflow with separated roles: the filter never sees fix commits; the oracle writer never sees the plan or the input; the two classifiers see neither each other, git, nor the original plan; the validator runs the oracle on the copy. Output in `.evidence/bench/8b/`.

Run on 2026-10-27, 5 agents, about 551k tokens, 45 minutes; validation ran on the `outsourcing-hstack` copy (a temporary worktree, the database `real_estate_bench8b` created fresh and dropped after), never touching `outsourcing` or the `real_estate` database.

**Input filter.** Kept Goal, 3 of 5 User decisions, 15 of 15 Global Constraints, 35 feature steps (F1 6, F2 7, F3 8, F4 14); dropped F5 (11 steps fixing plan 8a). Stripped inside kept text: 33 test pointers, 2 command and manual-class pointers, 11 file paths or names, 28 internal identifiers, 1 tool tag, 15 plan or task pointers. `bench/input-check.mjs`: the original plan has 4192 hits, the filtered input passes. Changed after the filter finished and before any classifier read it: the whole Known limits section dropped (section 5; recorded in `filter-log.md`, the old version kept aside). Still open: the human read of the input (section 5).

**Oracle.** 5 fix commits (d82f2b0, dd56b84, eb2b016, 24c426f, and 730509b inside the task) add or change 96 tests. 25 kept that check the behaviour of an in-scope hunk; 71 dropped (mostly checking code other tasks wrote: surveys, email, dashboard, leads). Of the 25, 5 have no public path (an unreadable update date, internal request reuse, a component's types), leaving 20 black-box checks that use only the browser and the public REST API. Severity of the 25: high 2, medium 8, low 15.

**Validation (7.1).** Of the 20 checks: **17 valid** (pass on the fix commit, fail on its parent), **3 weak** (dd56b84-T3, 24c426f-T4, 24c426f-T5: pass on both; they guard "keep what was right", they are not regressions), 0 broken. The validator fixed two mechanics and weakened no assertion: the import clean-up accepts 403 (the app forbids deleting imports by design), and the outline colour read is polled until the CSS transition ends. The real end product of plan 8b (730509b) passes 4 of 20: 730509b-T1 (fixed inside the task) and the 3 weak checks; it fails all 16 other valid checks. The human sample (7.1) is still open.

**Run at the task base d1ea76b** (on the advisor's advice, after the validation): 3 pass (exactly the 3 weak checks), 17 fail. Read from the first error line (the specs have no separate precondition step yet): 9 fail because the 8b feature does not exist yet; **6 fail on the main assertion although the feature exists** (24c426f-T1, T2, T3, T6, T7: the import reads a code cell as a number; d82f2b0-T1: the account page scrolls 60 px sideways), i.e. bugs older than 8b that the blame rule gave to 8b; 2 are unclear (d82f2b0-T4, dd56b84-T2: the card existed but 8b rebuilt it). So of the 17 valid checks, only 9 surely belong to 8b, plus 2 unclear. The task-base rule and the "pre-existing" bucket were added (7.1).

**Classification (6.3), two independent agents.** Agent 1: traceable 1, partly 2, not traceable 22. Agent 2: 0, 3, 22. Agreement 22/25 (88%), κ = 0.44, Gwet AC1 = 0.87. Three disagreements (730509b-T1, dd56b84-T3, 24c426f-T6) await a human.

**Lessons, already applied to this plan.** The interface sheet, the AC1 branch of the agreement threshold, the task-base rule and the H1 floor rule were all added **after** seeing the p8b results. So the p8b classification is a rule-tuning trial, not a confirmatory run; it must be rerun under the new rules before the lock.

1. On p8b nearly every bug the fix commits caught sits at an edge the input does not state: this task's oracle scores mostly the requirement step (22/25) and hardly the build step. This matches the old finding "tests only pin what the spec states".
2. Part of "not traceable" is public names, not behaviour: both agents note that the form's accessible name "Lọc bất động sản" and the option text "Biệt thự" are not in the input. The interface sheet (section 5) and the behaviour-only classification rule (6.3) were added.
3. κ is not usable when one label covers 88%: the raw-agreement + AC1 branch was added to the threshold (7.2).
4. The blame rule gave 6 of 17 valid checks to 8b wrongly. The task-base rule was added (7.1).
5. With 0–1 traceable checks per task, the build score is nearly binary and the N calculation of 10.2 does not describe it. The H1 floor rule was added (section 2).
6. Weak checks are a real kind (guarding what was right). They are out of the score as 7.1 says; no rule change.
7. Oracle preparation for a plan-sized task: about 0.55M tokens and 45 minutes, more than the 0.3M of section 11. Section 11 uses 0.55M for `real-estate` tasks.

**Not done on p8b:** explicit precondition steps in the specs; the interface sheet and the reclassification; a human read of the 2 unclear checks; human settling of the 3 disagreements; the human read of the input and the oracle sample; a real build of arm H or B (part of the trial run, section 12 step 11).

## 15. Known limits

- The token and hour estimates of section 11 are not measured; the trial run replaces them with measurements before the lock.
- The blame rule misses bugs of missing code where the task wrote no nearby line, and can misattribute when a hunk changes lines of several tasks.
- The fixed responder makes H's and B's autonomy comparable, but cannot measure the quality of an agent's questions.
- The `real-estate` oracle is exactly the bugs the old harness let through, so it leans toward the kinds of edge the old harness missed. Do not use it to compare the old harness with the new one; H and B both build fresh, so they remain comparable, but only external tasks count for acceptance.
- The plan author has read p8b's oracle; p8b is therefore trial-only (section 12, step 10).
- `real-estate` is one stack and greenfield only, in the sense that the old harness built the whole repo; only external tasks test generality.
- The interface sheet is read from an export of the task's end product: the export holds the repo, not its dependencies, so names the framework supplies (Payload's own admin labels and messages) are not in the sheet; checks that need them fall to the requirement bucket.
