# Step 6 lock

Locked 2026-11-05, after the last task of step 6 had run. `<data>` = `.evidence/bench` (gitignored, in the main checkout). Plan: `docs/plans/2026-11-05-bench-step-oracles.md` (Tasks 1 to 6). Rulings: prereg section 2 (the floor rule, with the decision Task 1 registered), rulings 1-9 of the plan, the user's decision of 2026-11-05 (option 1), and the controller rulings listed below. The external tasks are the 24 rows of `<data>/ext/sample.tsv`. The real-estate tasks are the 14 kept tasks of the step 5 lock (p1, p2, p3, p4, p5, p6a, p6b, p6c, p7b, p7c, p8a, p8c, p8d, p8e) and p8b, which is trial-only.

Every count here comes from one of these sources:

- the tools' printed lines, as recorded in `progress/progress.md`, section "2026-11-05 — step oracle plan" (Tasks 3, 4 and 5);
- `step.json`, `step-f2p.json`, step validation verdicts, `labels.json`, `agreement.json` numbers and `*.run.json` usage;
- the counts-only scripts of `<data>/logs/step6/`, listed under "Scripts" below.

The scripts read the oracle manifests only to count ids, verdicts and severities. Nothing here was read from an oracle or step oracle file, a check file, a `steps.json`, a `filter-source.md`, an input, a sheet, a prompt, a reply, a `classify-*.json` label, a step 9 row, `ext/sealed/`, `ext/raw/`, `heldout/`, `step-v1/` or `step-v2-writer/`. Those files are only hashed, or only counted (the lister replies were counted by `lister-newlines.mjs`, which prints no title).

`<data>/p8b` is a symlink to `<data>/8b` (since 2026-10-27). Every p8b path here goes through `p8b/...`, and nothing was hashed or counted through `8b/...`.

## The floor-rule decision

Task 1 registered the decision in prereg section 2 before any step oracle was built. It was recounted at this lock from `labels.json` and from the disputed lists of `agreement.json` of every kept task, split rounds included (`logs/step6/floor-count.mjs`). The numbers are those of the plan.

- **External, 24 tasks.** Labels: 55 `build`, 95 `requirement`. Sorted `build` counts: `0,0,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,3,4,4,4,5,5,9`, median 2. There are 9 disputed classifications, in 6 tasks. Counted as `traceable`, they give `0,0,1,1,1,1,1,1,1,1,1,2,2,2,3,3,3,3,4,5,5,6,7,10`, and the median is still 2. Step 9 cannot raise it to 5.
- **Real-estate, 14 kept tasks.** Labels: 5 `build`, 104 `requirement`. Sorted `build` counts: twelve 0s, then 1 and 4; median 0. There are 11 disputed classifications, in 6 tasks. Counted as `traceable`, they give `0×7, 1×4, 2, 4, 6`, median 0.5. One task (6) would then reach 5.
- **Disputed source pairs** are a different quantity (step 5 lock, rule (b)). The 12 disputed source pairs sit in 6 tasks (p1 6, p2 2, p3 1, p4 1, p6c 1, p8a 1), so at most 6 of the 14 tasks could reach 5 through a second batch of checks. The plan's "at most 6 of 14" counts these pairs, not the classifications above.
- p8b is trial-only and in neither count.

So the floor rule applies, now and after step 9:

- H1's build score comes from the step oracle (`<task>/step.json`).
- Every fix-commit check not in `excluded` scores H2, whatever its label (ruling 7).
- For an external task the floor rule adds no check. The step oracle is a subset of the task's `build` checks.

**After the f2p filter.** The floor-rule median counts `build` labels. H1 counts step ids. The f2p filter removed 4 `build` checks (s1-06 1, s3-04 1, s3-05 1, s3-07 1), and 4 tasks have no step id. The median of step ids per external task is therefore **1** over all 24 sampled tasks, and **2** over the 20 tasks that get an H1 score. The plan's Known limits sentence "H1 rests on a median of 2 checks per task" holds for the scored tasks.

## Step oracles

### External (set `external`)

Columns:

- **decided** is the scored checks whose origin was decided (ruling 2: every scored check, whatever its label).
- **f2p**, **p2p** and **unknown** are the verdicts in `step-f2p.json`.
- **exact**, **segment** and **resolver** say who decided.
- **candidates** is the scored `build` checks with verdict `f2p`.
- **ids** is `step.json` `ids`.
- **severity** gives the severities of the ids, read from `oracle/manifest.json` by `lock-count.mjs` and printed as counts.

| task | decided | f2p | p2p | unknown | exact | segment | resolver | candidates | ids | severity (high / medium / low) |
|---|---|---|---|---|---|---|---|---|---|---|
| s1-01 | 2 | 2 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | — |
| s1-02 | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 1 | 1 | 0 / 0 / 1 |
| s1-03 | 26 | 26 | 0 | 0 | 26 | 0 | 0 | 9 | 9 | 7 / 2 / 0 |
| s1-04 | 29 | 29 | 0 | 0 | 29 | 0 | 0 | 4 | 4 | 4 / 0 / 0 |
| s1-05 | 4 | 3 | 1 | 0 | 4 | 0 | 0 | 1 | 1 | 1 / 0 / 0 |
| s1-06 | 3 | 1 | 2 | 0 | 0 | 3 | 0 | 0 | 0 | — |
| s1-07 | 3 | 3 | 0 | 0 | 3 | 0 | 0 | 2 | 2 | 2 / 0 / 0 |
| s1-09 | 4 | 4 | 0 | 0 | 4 | 0 | 0 | 4 | 4 | 4 / 0 / 0 |
| s2-01 | 10 | 8 | 2 | 0 | 10 | 0 | 0 | 3 | 3 | 2 / 1 / 0 |
| s2-02 | 1 | 1 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 0 / 1 / 0 |
| s2-03 | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 1 | 1 | 1 / 0 / 0 |
| s2-05 | 2 | 1 | 1 | 0 | 2 | 0 | 0 | 1 | 1 | 1 / 0 / 0 |
| s2-07 | 7 | 7 | 0 | 0 | 7 | 0 | 0 | 5 | 5 | 3 / 2 / 0 |
| s2-08 | 3 | 3 | 0 | 0 | 3 | 0 | 0 | 1 | 1 | 1 / 0 / 0 |
| s2-09 | 17 | 17 | 0 | 0 | 17 | 0 | 0 | 2 | 2 | 2 / 0 / 0 |
| s2-10 | 6 | 6 | 0 | 0 | 1 | 0 | 5 | 2 | 2 | 2 / 0 / 0 |
| s3-01 | 6 | 2 | 0 | 4 | 2 | 0 | 4 | 0 | 0 | — |
| s3-02 | 5 | 5 | 0 | 0 | 5 | 0 | 0 | 5 | 5 | 4 / 1 / 0 |
| s3-03 | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 1 | 1 | 1 / 0 / 0 |
| s3-04 | 2 | 1 | 1 | 0 | 2 | 0 | 0 | 1 | 1 | 1 / 0 / 0 |
| s3-05 | 9 | 8 | 0 | 1 | 4 | 4 | 1 | 1 | 1 | 1 / 0 / 0 |
| s3-06 | 13 | 9 | 0 | 4 | 7 | 0 | 6 | 4 | 4 | 4 / 0 / 0 |
| s3-07 | 1 | 0 | 0 | 1 | 0 | 0 | 1 | 0 | 0 | — |
| s3-08 | 3 | 3 | 0 | 0 | 3 | 0 | 0 | 2 | 2 | 2 / 0 / 0 |
| **total** | 159 | 142 | 7 | 10 | 134 | 7 | 18 | 51 | 51 | 43 / 7 / 1 |

- **Every `step.json`** names `oracle` as its oracle, has seed `hstack-bench-2026-10-27`, and has `candidates` equal to its id count. No task has more than 9 candidates, so the cap of 15 binds nowhere.
- **Build checks the f2p rule removed: 4.** `labels.json` has 55 scored `build` checks and 51 are candidates. The 4 removed are:
  - s1-06 1, `p2p` by the last-segment rule;
  - s3-04 1, `p2p` by exact match;
  - s3-05 1, `unknown` from the resolver;
  - s3-07 1, `unknown` from the resolver.
- **Tasks with 0 ids: 4.**
  - s1-01 and s3-01 have no `build` check.
  - s1-06's only `build` check is `p2p` by the last-segment rule.
  - s3-07's only `build` check is resolver-`unknown`.
- **Resolver runs: 12 records in 6 tasks.**
  - The first batch made 7 runs. s3-05 ran twice for a bad reply, and its `-2` stands.
  - The reading gate added 5 `-2` runs: s2-02, s2-10, s3-01, s3-06 and s3-07.
  - After the gate, no id and no `step-f2p.json` verdict changed.

### Real-estate (set `task-repo`)

Columns:

- **listed** through **none** and **fixer rounds** come from the tools' final printed lines: run v2 for the 14 kept tasks, and the p8b rerun for p8b.
- **valid** through **error** are the verdicts of `step/validation-<end7>.json`, recounted by `lock-count.mjs`. They equal the printed lines.
- **ids** is `step.json` `ids`. Its `candidates` equals **resolved**.
- **severity** gives the severities of the ids, read from `step/oracle/manifest.json` and printed as counts.

| task | listed | resolved | picked | written | refused | none | valid | absent-at-base | weak | broken | error | fixer rounds | ids | severity (high / medium / low) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| p1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| p2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| p3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| p4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| p5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| p6a | 7 | 7 | 7 | 7 | 0 | 0 | 0 | 7 | 0 | 0 | 0 | 2 | 7 | 5 / 2 / 0 |
| p6b | 6 | 6 | 6 | 6 | 0 | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 4 | 2 / 2 / 0 |
| p6c | 9 | 9 | 9 | 9 | 0 | 1 | 8 | 0 | 0 | 0 | 0 | 0 | 8 | 3 / 4 / 1 |
| p7b | 14 | 7 | 7 | 7 | 0 | 4 | 2 | 0 | 1 | 0 | 0 | 0 | 2 | 2 / 0 / 0 |
| p7c | 12 | 11 | 11 | 11 | 0 | 4 | 0 | 1 | 5 | 1 | 0 | 2 | 1 | 1 / 0 / 0 |
| p8a | 49 | 28 | 15 | 15 | 0 | 1 | 9 | 5 | 0 | 0 | 0 | 0 | 14 | 3 / 7 / 4 |
| p8c | 40 | 30 | 15 | 15 | 0 | 3 | 1 | 11 | 0 | 0 | 0 | 0 | 12 | 5 / 5 / 2 |
| p8d | 70 | 45 | 15 | 15 | 0 | 0 | 7 | 6 | 2 | 0 | 0 | 0 | 13 | 2 / 8 / 3 |
| p8e | 40 | 31 | 15 | 15 | 0 | 1 | 6 | 8 | 0 | 0 | 0 | 0 | 14 | 6 / 3 / 5 |
| **total (14 kept)** | 247 | 174 | 100 | 100 | 0 | 16 | 35 | 40 | 8 | 1 | 0 | 4 | 75 | 29 / 31 / 15 |
| p8b (trial-only) | 41 | 33 | 15 | 13 | 2 | 1 | 2 | 10 | 0 | 0 | 0 | 0 | 12 | 8 / 2 / 2 |
| **total (15)** | 288 | 207 | 115 | 113 | 2 | 17 | 37 | 50 | 8 | 1 | 0 | 4 | 87 | 37 / 33 / 17 |

- For every task, written − none = valid + absent-at-base + weak + broken + error.
- **Real-estate step ids total 87**: 75 in the 14 kept tasks and 12 in p8b, after the p8b addendum.
- **p1–p5 have no step oracle** (controller ruling 14 below). Their kept feature steps name no test. Two lister briefs agree on this: v1, and v2 with its reading gate. So does the per-line probe `probe-titles3.mjs`, which finds 0 test titles in p1–p4's plan text and, in p5, 4 on dropped steps and 1 outside any step. Each of p1–p5 still has a `step.json` with empty `ids`, `candidates` 0 and `oracle` `step/oracle`, plus a `step/` folder of 7 files each (counted, not listed) with no validation.
- **Tasks under 5 ids:** p1–p5 0, p6b 4, p7b 2, p7c 1. **5 or more:** p6a 7, p6c 8, p8a 14, p8b 12, p8c 12, p8d 13, p8e 14.
- **Fixer rounds** ran in p6a (2) and p7c (2). p7c's last `broken` check stayed broken.
- **Ids.** Every step id is `<end7>-T<n>`, numbered after the highest of that prefix in every `oracle/` and `step/oracle/` manifest. p7b starts at T3, after step 5's T2; every other prefix starts at T1. Once the `p8b`/`8b` link is counted as one folder, no id collides with another manifest. (`task5-ids.mjs` walks both names and so counts p8b twice.) p8b's ids are `1846450-T1` to `T15`, 12 of them scored.
- **p8b** keeps its step 2 validations for its fix-commit oracle (ruling 8). Its step oracle was validated like the others, `--validate <end> --bad <base>`.

### Per set

| set | tasks | step ids | median step ids per task | median over tasks with ids | tasks with none | tasks whose step checks are all `low` | severity of the ids (high / medium / low) |
|---|---|---|---|---|---|---|---|
| external | 24 | 51 | 1 | 2 (20 tasks) | 4: s1-01, s1-06, s3-01, s3-07 | 1: s1-02 (1 id, `low`) | 43 / 7 / 1 |
| task-repo | 14 | 75 | 3 | 8 (9 tasks) | 5: p1, p2, p3, p4, p5 | 0 | 29 / 31 / 15 |
| p8b (trial-only) | 1 | 12 | — | — | — | — | 8 / 2 / 2 |

- Sorted step ids per task:
  - external `0,0,0,0,1,1,1,1,1,1,1,1,1,2,2,2,2,3,4,4,4,5,5,9`
  - task-repo `0,0,0,0,0,1,2,4,7,8,12,13,14,14`
- **All-`low` tasks.** Under 9.1's "task passed" clause, a task whose step checks are all `low` passes on that clause alone (ruling 7). There is 1 such task: s1-02. Its single step check is `low`.

## H1's N

- **External H1 N is now 20, not 22.** Four tasks have 0 step ids:
  - s1-01 and s3-01 have no `build` check;
  - s1-06's only `build` check is `p2p` by the last-segment rule;
  - s3-07's only `build` check is resolver-`unknown`.
- The plan counted on 22 (all but s1-01 and s3-01), and the f2p filter took 2 more.
- Under the user's decision of 2026-11-05 (option 1), H1's N counts only tasks with a non-empty step oracle. When step 11 recomputes N (section 10.2), the walk of ruling 14 continues until that count reaches N, which is at least 24. So the step 11 walk must add at least 4 external tasks with a non-empty step oracle. No walk was made in step 6.
- The 4 tasks with no step id stay in the sample for H2–H4.

## p8b reclassification (ruling 8)

`bun bench/oracle.mjs classify <data>/env/real-estate.json p8b` printed:

`p8b classified=9 build=0 requirement=5 partly=3 disputed=1 kappa=0.80 raw=0.89 ac1=0.85`

`agreement.json`: n 9, agree 8, usable, `partly` 3, disputed 1.

| | trial (section 14, 2026-10-27) | now (step 6) |
|---|---|---|
| checks classified | 25 (all live checks of the pilot oracle) | 9 (the scored ones, all `absent-at-base`) |
| traceable | rater 1: 1, rater 2: 0 | 0 agreed (`build` 0) |
| partly | rater 1: 2, rater 2: 3 | 3 agreed (stay `partly`, no split) |
| not traceable | rater 1: 22, rater 2: 22 | 5 agreed (`requirement`) |
| agreement | 22 / 25 | 8 / 9 |
| disputed | 3 | 1 |
| κ / raw / AC1 | 0.44 / 0.88 / 0.87 | 0.80 / 0.89 / 0.85 |

- The two rows cover different sets. The trial classified 25 checks. The reclassification classified only the 9 scored ones. The 8 `pre-existing`, 3 `weak` and 5 `interface: none` checks are not classified now.
- 730509b-T1 is disputed in both.
- Both raters opened all 7 files of their folder, so neither was rerun.
- The trial's `classify-1.json` and `classify-2.json` were moved unread to `p8b/superseded/trial-classify-{1,2}.json`.
- p8b's labels feed no score (ruling 7).

## Step 9 additions (`<data>/step9/`)

| file | rows (lines without the header) | content | written by |
|---|---|---|---|
| `p8b-classify.tsv` | 1 | p8b's disputed classification (`task id`) | `logs/step6/p8b-classify-tsv.mjs` (Task 3) |
| `sample-7.1-step.tsv` | 10 | scored real-estate step checks for the 7.1 read (`set task id`, set `task-repo`) | `logs/step6/sample-7.1-step.mjs` (Task 6) |

- `sample-7.1-step.tsv` is `queuePick(ids, 10, seed)`, with seed `hstack-bench-2026-10-27` from `ext/groups.json`. It draws over the 75 `step.json` ids of the 14 kept tasks. p8b is excluded because it is trial-only (controller ruling 19).
- The script printed only the row count, `10`. Nothing else in `step9/` was touched. `oracle queue` was not run.
- External step checks are already in the 7.1 pool of `sample-7.1.tsv`, so they are not sampled again.

## Scripts (`<data>/logs/step6/`)

| script | what it counted |
|---|---|
| `probe-f2p.mjs` | planning probe: per external task, the `build` checks whose origin matches a fail-to-pass case (exact or loose) |
| `probe-f2p2.mjs` | planning probe: for `build` checks with no match, whether the origin is in the pass-to-pass list, is a substring of a case, or is parametrised or grouped |
| `probe-f2p3.mjs` | planning probe: the last-segment rule with parameter suffixes stripped, giving match, p2p-only, none and ambiguous counts (the plan's 47 exact of 55, about 6 to the segment rule or the resolver) |
| `probe-steps.mjs` | planning probe: per real-estate task, the test-file mentions in `filter-source.md` |
| `probe-titles.mjs` | probe: quoted strings of `filter-source.md` that appear verbatim in a test file at the end, by section kind |
| `probe-titles2.mjs` | controller probe: quoted strings that are an `it(`/`test(` title at the end. **It overcounted.** Its p1–p4 hits are strings that span a line break, and `git grep -e` reads a pattern with a newline as two patterns joined by OR. |
| `probe-titles3.mjs` | the per-line version of the above, by kept step line, dropped step line or section. It found 0 titles in p1–p4. |
| `p8b-scored.mjs` | Task 3: p8b's live entries by verdict (25 live, 5 `none`, 9 `absent-at-base`, 8 `pre-existing`, 3 `weak`) |
| `p8b-classify-tsv.mjs` | Task 3: wrote `step9/p8b-classify.tsv`, printed its row count |
| `task5-ids.mjs` | Task 5: per task, step id count, prefix, step 5 highest number, lowest step number, collisions. It walks both `p8b` and `8b`, so it counts p8b's ids twice. |
| `task5-usage.mjs` | Task 5: summed usage of the `.run.json` records under `<task>/step/` |
| `floor-count.mjs` | Task 6: the floor-rule numbers, from `labels.json` and the disputed lists of `agreement.json` |
| `sample-7.1-step.mjs` | Task 6: wrote `step9/sample-7.1-step.tsv`, printed its row count |
| `lister-newlines.mjs` | Final review: per task of the live step (through p8b), the lister entries and those whose title holds a line break; prints counts only |
| `lock-count.mjs` | Task 6: per task, `step.json` ids and candidates, `step-f2p.json` verdicts, step validation verdicts and the severities of the ids; per set, the median, tasks with none, tasks all `low` |
| `lock5-compare.mjs` | Task 6: recomputed SHA-256 of every file the step 5 lock hashed; printed counts and any changed or missing path |
| `lock-hash.mjs` | Task 6: wrote this lock's hash lines to a file and printed counts per category, plus the file counts of the voided folders |

## Superseded spend

The voided folders were moved unread. They are not hashed here. Their file counts (`node_modules` skipped) come from `lock-hash.mjs`.

- **Real-estate run v1** (35 runs: the 34 in `step-v1/` plus the first p1 lister, kept in `logs/step6/task5-first-p1/`). It was voided unread into `<task>/step-v1/` when the lister brief was amended. Usage: input 420, output 226091, cache read 9097114, cache write 1502690.
  - File counts: p1 6, p2 6, p3 6, p4 6, p5 6, p6a 59, p6b 25, p6c 55, p7b 25, p7c 69, p8a 47, p8c 43, p8d 47, p8e 45, p8b 16.
- **p8b's two v2 writer runs.** Both runs left no file, because the writer folder was reached through the symlink. They were voided unread into `p8b/step-v2-writer/` (7 files). Their usage is p8b's v2 row minus its lister record: input 30, output 15776, cache read 892543, cache write 154255.
- **The symlink probe** (3 runs under `/tmp/hstack-bench/symprobe/`): input 12, output 390, cache read 29897, cache write 7514.
- **p8b's trial classifications.** `p8b/superseded/` holds 6 files: the two moved trial label files and their records.

## Rulings during the build

The controller's rulings, in the order they were made, as recorded in the SDD ledger (`.superpowers/sdd/...` is gitignored; the copy is in `progress/progress.md`, section "SDD ledger of step 6 (copied before the final review)"). Each gives the decision and its reason.

1. Tasks run strictly one after another in this worktree. The skill forbids parallel implementers, and `progress/progress.md` would conflict.
2. Implementers record sealed-agent usage and run wall clock in `progress/progress.md`, under the section "2026-11-05 — step oracle plan". The controller records implementer and reviewer usage in the ledger and copies it there before the final review.
3. `f2pOf`: an origin whose name is an exact match in both the f2p and the p2p lists is `ask`, not `f2p`. The plan's exact rule is silent on a name in both lists, and asking the resolver is the conservative reading.
4. `floorScore`: a step id missing from the grade's checks counts as not passed. A missing case is an error in `grade`'s own contract, and step ids always come from the graded manifest.
5. `f2pOf`'s "exact in p2p only → p2p" is accepted. It is the symmetric reading of the exact rule, and it only drops a check, which is the safe direction.
6. Tasks 4 and 5 use opus implementers, since they make real sealed runs and integrate several files, as step 5 did.
7. **Resolver reading gate.** A resolver run whose record shows no `Read` is rerun once as `-2`. The first record is kept and the rerun stands, whatever it reads. This is the same content-independent gate as step 5 rulings 12 and 40, and the brief tells the resolver to open the listed tests.
8. No brief change and no further resolver rerun. The gate's rerun stands, as step 5 ruling 14 decided for the labellers: changing the measure after seeing its effect would be tuning. The resolver gets the case lists in its prompt, so a decision with only `Grep` is possible. Under-reading is a known limit (below).
9. No reading gate for the real-estate lister. The tool verifies every listed title against the end's test files, so an unread listing cannot add a wrong test. *Reversed by ruling 11.*
10. The writer's given ids are stored in its run record, as `split` does. An entry with an id it was not given, or with an origin other than its given test, is refused. This keeps ids stable across reruns and pins each check to its picked test.
11. **p1–p5's `[]` was treated as a lister failure, not a fact, and run v1 was voided.**
    - The trigger: `probe-titles2.mjs` found 9–15 quoted strings per task that are exact `it()`/`test()` titles at the end, and prereg section 5 keeps plans 1–6c's pointer-only steps as test titles.
    - `briefs/steps.md` was amended: a step names a test when it quotes its title, with or without its file, and the lister opens the end's test files before replying.
    - Ruling 9 was reversed: the lister gets the resolver's reading gate.
    - All 15 `step/` folders and `step.json` files were voided unread to `<task>/step-v1/`, and all 15 tasks were rerun under one brief. This is the same move as step 5 ruling 11, and candidates drawn under one brief keep "chosen by seed".
    - (Ruling 14 later found the probe had overcounted.)
12. **`writer()` fix.** The `-2` rerun's prompt named the first run's folder, while its settings grant only `<dir>-2`. This bug dates from step 5. The fix is `text.replaceAll(o.dir, two.dir)`, with the test 'a writer rerun's prompt names its own folder'. It is a content-independent instrument fix. All 13 step 5 `-2` writer folders hold a manifest, so the step 5 outcomes stand. Only p8b's step writer was bitten. The 13 step 5 `-2` writer records now hash stale, and `bench/README.md` says a `write` rerun on them prints the stale-prompt refusal.
13. `p8b` is a symlink to `8b` (since 2026-10-27), so scans over `<data>` see both names. Task 6 hashes through `p8b` only, and this lock says so.
14. **p1–p5 are accepted with no step oracle.** Their kept steps name no test: the per-line probe and both lister briefs agree. The controller's overcount cost one rerun (about 100 minutes and about 3M tokens), and it is recorded as such. H1 has no real-estate score for p1–p5. That set is secondary and reported only.
15. **p8b's empty writer: the symlink.** The writer's settings granted `Edit` under the symlink path, while the `Write` tool resolves to the real path. `runWriter` now grants its folder by its real path as well. A tiny probe verified this. p8b's v2 writer records were voided unread, and `step` was rerun for p8b only. This is a content-independent instrument fix.
16. No symlink probe for `classify` and `split`. Task 3's p8b rater records show `filesInFolder` 7/7, and `readCount` counts only successful `Read` results under the folder, so the reads under the symlinked grant worked.
17. **Review I1.** From now on, `step` is stripped from the fixer folder's manifest copy. p6a's and p7c's v2 fixer runs are not voided. The comparer keeps a fixer change only when it calls every assertion `same`, so step text in the fixer's folder cannot change what a kept check asserts.
18. **Review I2.** The documentation now says that the counts line's `fixer rounds` counts the rounds run in that invocation, as step 5's `validate` does. The data files are idempotent.
19. `sample-7.1-step.tsv` draws from the 14 kept tasks only. p8b is excluded because it is trial-only and never scored.

## Incidents and findings

- **Lister brief v1** (Task 5). The p1–p5 listers replied `[]` with no tool call in 3–6 s. Rulings 11 and 14 cover what followed. The first `steps.md` was already amended once before v1, for file-only pointers. p1's first lister record is kept in `logs/step6/task5-first-p1/`.
- **A step 5 finding** (ruling 12). `writer()`'s `-2` rerun prompt named the first run's folder. All 13 step 5 `-2` writer folders hold a manifest, so the step 5 outcomes stand. Those 13 records now hash stale, as the README says: their recorded prompt hash no longer equals the prompt `writer()` now builds, so a `write` rerun on them refuses. This is not a file change, and every file the step 5 lock hashed still matches (below).
- **p8b's writer and the symlink** (ruling 15). Two writer runs (the first and the fixed `-2`) wrote through `Write` calls that landed nowhere. The probe confirmed the cause.
- **`probe-titles2.mjs` overcount** (ruling 14). The controller's probe led to a rerun of all 15 real-estate tasks that changed no p1–p5 result.

## Checks at the lock

- **Step oracle files.**
  - All 24 external tasks, the 14 kept real-estate tasks and p8b have `step.json`: 39 files.
  - All 24 external tasks have `step-f2p.json`.
  - Each of the 10 real-estate tasks with ids (p6a, p6b, p6c, p7b, p7c, p8a, p8c, p8d, p8e, p8b) has exactly one `step/validation-<end7>.json`, named for its end commit in `tasks.json`.
  - p1–p5 have no candidates, a `step.json` with empty `ids`, and no validation.
- **Step 5 hashes.** `lock5-compare.mjs` recomputed SHA-256 of every file in the "Hashes" section of `progress/step5-lock.md`: the 1367 files plus the 2 scripts.
  - Result: hashed 1369, equal 1369, changed 0, missing 0.
  - The step 5 lock hashed no file under `p8b/` or `8b/`. So the expected changes (p8b's moved and new `classify-*.json`, and its new `labels.json` and `agreement.json`) do not show as differences. They are new files, hashed below.
  - `oracle/`, `labels.json`, `agreement.json`, `validation-*.json` and the five step 5 `step9/` files are unchanged.
- **Hash tool.** `lock-hash.mjs` hashes with Bun's SHA-256. One file was checked against `shasum -a 256`, `step9/sample-7.1-step.tsv`, and the two agree.
- **Tools.** `bench/` is at `e97944495f4c2a270295bd2dd787ab355999c70e` (`git rev-parse HEAD` before this lock's commit), and `git status --short bench` is empty.
- **Lister titles with a line break (final review, I3).** `logs/step6/lister-newlines.mjs` parses every `steps.reply.md` and `steps-2.reply.md` of the 15 tasks of the live step (p1–p5, p6a, p6b, p6c, p7b, p7c, p8a, p8b, p8c, p8d, p8e; p8b through `p8b/...`) as `stepsReply` does and prints counts only, no title. It found 321 entries in all (p1–p5 0, p6a 11, p6b 12, p6c 18, p7b 28, p7c 12, p8a 49, p8b 41, p8c 40, p8d 70, p8e 40) and **0** with a `\r` or `\n` in the title. Run with `bun logs/step6/lister-newlines.mjs <data>`. `step` was not rerun.
- **Docker.** No Docker call was made in step 6. Tasks 3 and 4 ran none, by their records. Task 5 graded real-estate on the host database `bench_re` only. Task 6 ran none.
- **Databases.** Task 5's pgsnap lists were equal before and after each of its three batches, with no `bench_re` left. Task 6 touched no database.

## Open points

- **External H1 N is 20.** The step 11 walk must add at least 4 external tasks with a non-empty step oracle (option 1). Each needs the step 5 pipeline, this plan's `step`, its seeded bugs (step 7) and an amended stick v1 lock.
- **Step 10 runs `step` again** after step 9 settles the 9 external disputed classifications. A disputed check that becomes `build` and is `f2p` joins the ids. The resolver's records are reused (ruling 2).
- **p7c has 1 step id and p7b 2,** so their H1 scores are near-binary.
- **s1-02's only step check is `low`,** so it passes 9.1's "task passed" clause whatever the check's result.
- **The p6a and p7c v2 fixer folders** held the step text in their manifest copy (ruling 17). Those runs stand.
- **The controller kept ruling 17** (p6a's and p7c's fixer runs had the step text readable in their folder copy, not in their prompt). The user may reverse it.
- **A step 10 rerun of the task-repo `step`** re-passes `grade` and rewrites `step/validation-<end7>.json` with a new `at`. Step 10 must compare those files without `at`, or record new hashes (final review M4).
- **`sample-7.1-step.mjs` imports `queuePick` by this worktree's absolute path.** A rerun after the worktree is removed needs the import repointed to the main checkout. The file's hash below is the one that wrote the sample.
- **The median of external step ids** is 1 over all 24 sampled tasks, because 4 have no step oracle, and 2 over the 20 tasks with an H1 score. The plan's sentence "H1 rests on a median of 2 checks per task" holds for the scored tasks. The plan text was not changed.

## Known limits

- **External H1 rests on a median of 2 step checks per task** over the 20 tasks with an H1 score (1 over all 24 sampled tasks). This is the near-binary build score of section 14 lesson 5. The floor rule adds no external check. The N rule of step 11 is the guard.
- External step checks count in H1 and in H2 (ruling 7).
- **Real-estate step checks are not classified.** A step test that pins a detail the input does not state still scores H1. The 10-check `sample-7.1-step.tsv` is the human guard.
- **The lister.** A step whose test the lister cannot name, or the tool cannot resolve, has no check. A step of a dropped feature group listed by mistake would score H1. p1–p5 have no real-estate step oracle.
- **A step test rewritten at the end commit** may fail there for a bug the task's later fixes found. It is then `broken` and out, so H1 does not measure that step (p7c's 1 `broken`).
- **p8b keeps its step 2 validations** for its fix-commit oracle, and p8b is trial-only.
- **The f2p resolver judges with one agent.** `unknown` is out.
- **Under-reading.** These runs stand under the gate rules:
  - **Resolver.** 4 of the 5 gate reruns made no `Read`: s2-10, s3-01, s3-06 and s3-07. Only s2-02's rerun read. The verdicts that move ids (s2-02, s2-10 and s3-06 `f2p`; s3-05 and s3-07 `unknown`) all but s2-02's rest on one or two searches. Step 9 could add a human read of them.
  - **Lister.** The gate fired in 9 tasks (p1–p5, p6a, p6b, p6c, p7b), and every rerun also made no `Read`. The tool verifies every listed title against the end's test files, so an unread listing cannot add a wrong test, but it can miss steps.
- **A listed title that is a substring of a longer test title** can resolve to the one file that holds only the longer test (`git grep -F` matches the title verbatim inside it), so the step check may be written from a test other than the one the step names (final review M5).
- **The `p8b`/`8b` symlink.** Scans that walk `<data>` see p8b twice. Only scans through `p8b/...` count it once.

## Hashes

`shasum -a 256` (computed with Bun's SHA-256) of 555 files. Paths are relative to `<data>` and sorted bytewise. p8b goes through `p8b/...` only. Nothing was hashed through `8b/...`, `step-v1/`, `step-v2-writer/` or `p8b/superseded/`.

- `step.json`: 39 files (24 external, 14 real-estate, p8b).
- `step-f2p.json`: 24 files.
- Every file under `<task>/step/` of the 14 kept real-estate tasks and p8b (live, not `step-v1/`; `node_modules` skipped; no symlink met): 483 files. These include the step oracles, validations, grades, labels, `steps.json`, the work folders, logs, replies, prompts, settings and run records.
- Briefs: `briefs/steps.md`, `briefs/step-re.md` and `ext/briefs/f2p.md`. 3 files.
- `step9/p8b-classify.tsv` and `step9/sample-7.1-step.tsv`: 2 files.
- p8b's new `classify-1.json`, `classify-2.json`, `labels.json` and `agreement.json`: 4 files.

```text
70f5dab3e193c675bd899ff4cdba1f8df7cb9c16b5a6896d524d2ae2ac2d8284  briefs/step-re.md
a738c665d66325faa056bedce1815dbca1e976499da08b0809e124d3739ea27c  briefs/steps.md
3c83ca9a81bd83f439d4e889f6d6ca77559585a3e035a8f2087beb6a961e190a  ext/briefs/f2p.md
df550faa1843d8df73ab96bfde5078a09036fb6acfd4e4bd436d76db76bfd178  p1/step.json
ca3d163bab055381827226140568f3bef7eaac187cebd76878e0b63e9e442356  p1/step/labels.json
4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945  p1/step/steps-2.reply.md
7221959cd9b8b3bfededabf060dd084bfa6f89becb946490b57c91a8f50b3665  p1/step/steps-2.reply.md.run.json
37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570  p1/step/steps.json
4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945  p1/step/steps.reply.md
348f869cfaa55cae2da8e6fc3280e79f3dfa5ccd0030b3c7f7140a1d6cd5a5d1  p1/step/steps.reply.md.run.json
88c4a3cdcc5391c7c671a24acb2634498277c75fd9e6b1d5baaa57b257b893cf  p1/step/work/steps.prompt.md
df550faa1843d8df73ab96bfde5078a09036fb6acfd4e4bd436d76db76bfd178  p2/step.json
ca3d163bab055381827226140568f3bef7eaac187cebd76878e0b63e9e442356  p2/step/labels.json
4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945  p2/step/steps-2.reply.md
4c17b4a58f024c77c12c8f475bbdaaf82c3c963fb4023a78f5bd8209ff313de7  p2/step/steps-2.reply.md.run.json
37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570  p2/step/steps.json
4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945  p2/step/steps.reply.md
32299cb376f1dd9fecc2801e93beea23d491e8b822a1599ab6a80c2b6179b173  p2/step/steps.reply.md.run.json
41ee147de72c5fee8dd4b8aa8549d93f7e8d61e26e5608057e7f20feb682172a  p2/step/work/steps.prompt.md
df550faa1843d8df73ab96bfde5078a09036fb6acfd4e4bd436d76db76bfd178  p3/step.json
ca3d163bab055381827226140568f3bef7eaac187cebd76878e0b63e9e442356  p3/step/labels.json
4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945  p3/step/steps-2.reply.md
379d3604c970772f912a804b9ad64603eb39994a16eed8d9002633fbe77e0afc  p3/step/steps-2.reply.md.run.json
37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570  p3/step/steps.json
637b552b1c40a64861d355a4f33b7fde79a2ca5cc476edca9b9e0e986786cb31  p3/step/steps.reply.md
a1bb83f1dcfe0863b2cd17ee2c2f882ac4bb4fee9e5276c6dcda1a045193dc21  p3/step/steps.reply.md.run.json
09e93a28c59a02acb780e04a4153f933bac43f85f3347b9baf293392eac3f47a  p3/step/work/steps.prompt.md
df550faa1843d8df73ab96bfde5078a09036fb6acfd4e4bd436d76db76bfd178  p4/step.json
ca3d163bab055381827226140568f3bef7eaac187cebd76878e0b63e9e442356  p4/step/labels.json
4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945  p4/step/steps-2.reply.md
8604a2c5a221016853f1781f7f3fe8672edb9379a340e08a37f0f02667f9dc34  p4/step/steps-2.reply.md.run.json
37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570  p4/step/steps.json
637b552b1c40a64861d355a4f33b7fde79a2ca5cc476edca9b9e0e986786cb31  p4/step/steps.reply.md
a171d052fbc575f178c2f6f4cfd213ca1c333ff947de36257ce67c9369e4e065  p4/step/steps.reply.md.run.json
5d18e51953efbf84183258de98945af9f8a309710dc4faa07d82fc6ba7126564  p4/step/work/steps.prompt.md
df550faa1843d8df73ab96bfde5078a09036fb6acfd4e4bd436d76db76bfd178  p5/step.json
ca3d163bab055381827226140568f3bef7eaac187cebd76878e0b63e9e442356  p5/step/labels.json
4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945  p5/step/steps-2.reply.md
9c75ee9cf66457cddd511d5976d5c8d7986195fc963fecec2cb83ad2cac80dd3  p5/step/steps-2.reply.md.run.json
37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570  p5/step/steps.json
4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945  p5/step/steps.reply.md
c3ecd81a8027398bd470f2b731a60fddbc26cd26e361e5ed1b20db0ae8a3694a  p5/step/steps.reply.md.run.json
16f02dcc117b0a3edb636e25e13c5af3a96115b73dab8f8a5ab558d2b608e27f  p5/step/work/steps.prompt.md
69f2a024cb284e64b6d3ce043999e867e4b63eddcf0cd0644545f6eef2c5853d  p6a/step.json
4391e71ad88ae3c395ad0d83d2733712b493d1593af50ff8877d31b6f559b777  p6a/step/grades/31fcab0.json
fcfee191b9b8a73c1f957aa33f45b3c6819a7e4754195449ef0a1b14236dcc6f  p6a/step/grades/d7f2fd3.json
a3a4a887596871512b0e7dedbff35fe5c7f16b01d82f0466e18e09c75f9f0468  p6a/step/labels.json
944b7bb3bb72d1009545c66fed0599c52b4a91a6f3a792d5ff1bc0beddf13513  p6a/step/logs/31fcab0-1.log
62803e166ab84a82793f8ec0b7778da4e10719c77bb7c75fea26dc9a890a928d  p6a/step/logs/31fcab0-2.log
25873df2d77650f9ed686cdd84a91d1932d3fad544a6c19c8473f232e9dd652c  p6a/step/logs/31fcab0-3.log
0e07e6d1d0d6c0831c4c42448c1b3ca10c790e8a687523834c6a90e880c37bb4  p6a/step/logs/d7f2fd3-1.log
fe6f48aa58912b4ea90f2e4d20a85b3d32229c565d9f7b3f3f37faddddf9371f  p6a/step/logs/d7f2fd3-2.log
9c09d04dc47763e3162f7db8c3df061dbf1b9a3a7e4f03d465d61505895b7503  p6a/step/logs/d7f2fd3-3.log
90dfb727a6e01656ae7f12b51d6f528c8ee857cf60dc0ac88662fc62c120bf02  p6a/step/oracle/d7f2fd3-T1.spec.ts
281f79e799d147eaea54c1011ad0bc6e5f830a5fd2d424c93750e73a34b72951  p6a/step/oracle/d7f2fd3-T2.spec.ts
f53c1716bbbbfcbc464a30ed6d6eebd85ff12345b28de8ee76b6f3e2a51f6aea  p6a/step/oracle/d7f2fd3-T3.spec.ts
d2843fc454dfdc9ee0e76acef87e6970e06c460429d5e336b462473ce9cd2284  p6a/step/oracle/d7f2fd3-T4.spec.ts
01347887b6a204dfcd85c8677ca83a8a98568f8fccb36450c16e132080a5309e  p6a/step/oracle/d7f2fd3-T5.spec.ts
5e6cf2671ea211023e791106555ace46b57a9da4e0534c70bb9874381c57b73e  p6a/step/oracle/d7f2fd3-T6.spec.ts
35bbdacfdc8f33397c8a18fba6037dc07cef88e561e81a33237eea1177169e33  p6a/step/oracle/d7f2fd3-T7.spec.ts
5b8b47bb1e455112d9eb851d92fe53f1f96866f2e7a7600235cab50b3458faa6  p6a/step/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p6a/step/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p6a/step/oracle/playwright.config.ts
e438e23d79819b1266c372a3b63cac2c1d461683135dc71b597fdab0f09e8375  p6a/step/steps-2.reply.md
d49032be409f6ffb7ebf6153cd87a5ba50ef26f5da1a66777a6138f8da61fe56  p6a/step/steps-2.reply.md.run.json
cff273b14278a54e90deb9cc38af333a2ce77aa5613c5ccebf339ccce637f47b  p6a/step/steps.json
5a481666ca8d914d9690e6be1408ffb7970d08263242f121f3fb5417e7f1ae34  p6a/step/steps.reply.md
96cf3183b05b3aa3b37cd4b05dc7717762f705adec6cad6387e9c68c16994195  p6a/step/steps.reply.md.run.json
29cc4e09cd0fe172fdb117c89ce134cf9215281e18e4cc647fa252995edf4c79  p6a/step/validation-d7f2fd3.json
f4c61d2e6523ffd8d7a34884660870639ba810e6c60e3907f61ea221e442448f  p6a/step/work/fix-step-1/d7f2fd3.compare.prompt.md
4912f5538dc541b1fda2ee0d05fd61b0674d3b2b602053ab6815e3fd1e945c59  p6a/step/work/fix-step-1/d7f2fd3.compare.reply.md
3c2cff36b4062c28995a533ee59679074b51d42f5e90ead88ee681de74008ea3  p6a/step/work/fix-step-1/d7f2fd3.compare.reply.md.run.json
6263a83f2e86b3d58e4f1730293585f317b0f43e3a8af86aa2a5d73b4febf2fd  p6a/step/work/fix-step-1/d7f2fd3.fix.prompt.md
3798969dc098e894cbf0c80d5f01aacd84999c858e55209375238d36ce62f540  p6a/step/work/fix-step-1/d7f2fd3.fix.reply.md
b700a424b18d9b5e1668d05d5df495ff4459aeb436c28f36c6d39c377de24c8d  p6a/step/work/fix-step-1/d7f2fd3.fix.reply.md.run.json
ce82487caa4ecd673cdb78f9077623d2ce60b627a900600a01dd49cf7f975c00  p6a/step/work/fix-step-1/d7f2fd3.settings.json
bf2d6d47d68b4be9244e2119d6cd9ac72fcc71418046392ad5d3489c2d557e02  p6a/step/work/fix-step-1/d7f2fd3/d7f2fd3-T1.spec.ts
00b4efedffa1ab08f29aafb7c55aa2e59a1950b72f8a4c60bdf0383436f467fe  p6a/step/work/fix-step-1/d7f2fd3/d7f2fd3-T2.spec.ts
fe536328f253ace3a92c3b1a503782423fbc85ea6c771135bd845d534184bc4f  p6a/step/work/fix-step-1/d7f2fd3/d7f2fd3-T3.spec.ts
b0a46f293cb496c9d9e6922289603ee14529434ec5d85af6ea0d338ff65b1cf3  p6a/step/work/fix-step-1/d7f2fd3/d7f2fd3-T4.spec.ts
1597048308b4f29b3cdd263d6e5ad55f84f0ba88d6c6bd7c31ab5140cc0ab77b  p6a/step/work/fix-step-1/d7f2fd3/d7f2fd3-T5.spec.ts
2611279b33f44b0dbc431897187132e0fde2f5afbda32d8e54e00b503ba3402f  p6a/step/work/fix-step-1/d7f2fd3/d7f2fd3-T6.spec.ts
599ea9a7c217e7d450cbc371368a58667b542d5f9be1750e4babda4b32da808a  p6a/step/work/fix-step-1/d7f2fd3/d7f2fd3-T7.spec.ts
5b8b47bb1e455112d9eb851d92fe53f1f96866f2e7a7600235cab50b3458faa6  p6a/step/work/fix-step-1/d7f2fd3/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p6a/step/work/fix-step-1/d7f2fd3/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p6a/step/work/fix-step-1/d7f2fd3/playwright.config.ts
6a11399cd5a8464d354c797ea5eedb27b17695c24f5469927926cc65683be497  p6a/step/work/fix-step-2/d7f2fd3.compare.prompt.md
4912f5538dc541b1fda2ee0d05fd61b0674d3b2b602053ab6815e3fd1e945c59  p6a/step/work/fix-step-2/d7f2fd3.compare.reply.md
43c9e135beb18ee96fc0e1c8c8cf30239b31eb059921e934a5ab7db2846235d0  p6a/step/work/fix-step-2/d7f2fd3.compare.reply.md.run.json
2b2de36da2cf95d5b1b857b8b6df7da90e80caa4ae37152ec79367bfe0057dea  p6a/step/work/fix-step-2/d7f2fd3.fix.prompt.md
75c00286a16095129652b62d51e2b1fe387023cc92e7e88079270b44a5e72ff3  p6a/step/work/fix-step-2/d7f2fd3.fix.reply.md
6ee590608fd7fc8bb7fc2b04076d33ddcbf584d58b6952db5e52f09c5e9692bf  p6a/step/work/fix-step-2/d7f2fd3.fix.reply.md.run.json
e88a8bdb52c1cb5b87d62d6baf72c4020c83239907c3c7544036728a6beea3fe  p6a/step/work/fix-step-2/d7f2fd3.settings.json
90dfb727a6e01656ae7f12b51d6f528c8ee857cf60dc0ac88662fc62c120bf02  p6a/step/work/fix-step-2/d7f2fd3/d7f2fd3-T1.spec.ts
281f79e799d147eaea54c1011ad0bc6e5f830a5fd2d424c93750e73a34b72951  p6a/step/work/fix-step-2/d7f2fd3/d7f2fd3-T2.spec.ts
f53c1716bbbbfcbc464a30ed6d6eebd85ff12345b28de8ee76b6f3e2a51f6aea  p6a/step/work/fix-step-2/d7f2fd3/d7f2fd3-T3.spec.ts
d2843fc454dfdc9ee0e76acef87e6970e06c460429d5e336b462473ce9cd2284  p6a/step/work/fix-step-2/d7f2fd3/d7f2fd3-T4.spec.ts
01347887b6a204dfcd85c8677ca83a8a98568f8fccb36450c16e132080a5309e  p6a/step/work/fix-step-2/d7f2fd3/d7f2fd3-T5.spec.ts
5e6cf2671ea211023e791106555ace46b57a9da4e0534c70bb9874381c57b73e  p6a/step/work/fix-step-2/d7f2fd3/d7f2fd3-T6.spec.ts
35bbdacfdc8f33397c8a18fba6037dc07cef88e561e81a33237eea1177169e33  p6a/step/work/fix-step-2/d7f2fd3/d7f2fd3-T7.spec.ts
5b8b47bb1e455112d9eb851d92fe53f1f96866f2e7a7600235cab50b3458faa6  p6a/step/work/fix-step-2/d7f2fd3/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p6a/step/work/fix-step-2/d7f2fd3/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p6a/step/work/fix-step-2/d7f2fd3/playwright.config.ts
0904d00d697f2ee3edd670995da50e1be8c03c799bfbe32e7f8752e77603831b  p6a/step/work/steps.prompt.md
8357fd64ecad98b154df591ef0e5fe26902fc532c6553ed44ef4d1b2f995be10  p6a/step/work/write-settings.json
e77cfcda7c6f4d73ecece87524e9922be5cf5946db5d81a7876eaa54f98f1784  p6a/step/work/write.prompt.md
db9dacef76d094dc0c53e350b5c0298ed2e18faf76b70a830fa4ac0c7ceced7b  p6a/step/work/write.reply.md
9279de5f0b4ffed467c29869a14baa77bf936892efbd3474c87e15b09f29b8a7  p6a/step/work/write.reply.md.run.json
6f71a7090e5e81ee626e653617e3edff2d479be5260c05fe2624f88f3c292f63  p6a/step/work/write/d7f2fd3-T1.spec.ts
b79251e3bd00e28b24914a2e2560d4455fdb9fdbd3db911b626d42cbec35e279  p6a/step/work/write/d7f2fd3-T2.spec.ts
efeadaceb6579dfa6ce452bfae1236b9794149d6b8c8890491b49e1162688163  p6a/step/work/write/d7f2fd3-T3.spec.ts
84a1b1bfdea6d926e2fe20c8b946182fd0bcc749f4342a72e662323f8845afd9  p6a/step/work/write/d7f2fd3-T4.spec.ts
3de765e26d4ec178b5d2d27e7a5d0540aaae79239ff1bc4303e1c759175b4585  p6a/step/work/write/d7f2fd3-T5.spec.ts
d4079149034e81fbc2f83efe4844c56afd1ea73ed8ba8f594725a695dd34727e  p6a/step/work/write/d7f2fd3-T6.spec.ts
2588ecc5302febac0ea6001bed6c6f1aa7864cf19786838c2eb256f3ab98c446  p6a/step/work/write/d7f2fd3-T7.spec.ts
2100d1ec653f6b722099e3b598ce08af8081c4f657a231ff3a7e6e703489c1d1  p6a/step/work/write/manifest.json
e751f96856120978a8f39e7155497f9f0d2c059a0d20e9c56c646edfe7c91969  p6b/step.json
a1415deb0e3b87b72d9348229bcc35df3376352f56770846a87ab4b1de4e0e4f  p6b/step/grades/885c4c2.json
58f8cc55dfc74dd4ddd314d84a2c970d85c422fccc33750b836e1ed6d2c23fc7  p6b/step/grades/d7f2fd3.json
fa243da129b8edd0615d55aa04b8adca5996be54e512a9a0d61fed89f2a6b490  p6b/step/labels.json
5ba09c258d57a331d969554c630ac42d752aeaff2cf9b80c96dcf9d789ae928d  p6b/step/logs/885c4c2-1.log
31c6bcba2ac0492bbea1a4db80bbd42a22e328e07691a925c9b8d75aa62e9195  p6b/step/logs/d7f2fd3-1.log
1f2fb0405c3493824826ec228d1b45df5b2acc5c1aed68fd42b314bf7752f246  p6b/step/oracle/885c4c2-T1.spec.ts
7d80dacd3038bb7ce2208c829c4bca4a3f198c17c734afa51999e970781162cd  p6b/step/oracle/885c4c2-T3.spec.ts
06525daa673aa9f8b4228ac6da4bea176d13ac9b15c391d35c79e9483ff7cde3  p6b/step/oracle/885c4c2-T4.spec.ts
488e251bf56b3ee97c513427765f673ab2fff7f73eab05b28b8fc981ee3b64a6  p6b/step/oracle/885c4c2-T6.spec.ts
3960525d76003e2cd0710f59db10f8f7a010b0266659a7b212eb6a37673dc467  p6b/step/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p6b/step/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p6b/step/oracle/playwright.config.ts
6de81cc79cb313c90aa3a1ab98130eacd5c7be7a4ab0f1233c053e7e71aa2b02  p6b/step/steps-2.reply.md
889c811dce381d6760329bffbfc2511b0eee26f5c9accf081c71c9662425809e  p6b/step/steps-2.reply.md.run.json
93a598a58ca48733fdbfd151d9d2d2a5fc52cfde70a23477dc4412d6dad3c6a9  p6b/step/steps.json
fb6f1c77c00fae6b5710f8cd6914f4ab1d99376e5e37603cd6b26ccafeb9d1da  p6b/step/steps.reply.md
184fcbe7ceec1834453e033edb4d3a5ccda7199106f8f94cecdc24c140ecd416  p6b/step/steps.reply.md.run.json
983116003473216e1d8bcaead513f26777d24dc7b22fbaeaa792ad06c9b9c0b0  p6b/step/validation-885c4c2.json
d9ef6b8c2eb6baf98607021279afc8602be1ceddc77f9f313788ef49d1a6300e  p6b/step/work/steps.prompt.md
26e7b5c61159cc193dcf946f2540ea41cedc78ebfe03311585e14d0a67892824  p6b/step/work/write-settings.json
6fcc4b707f97acd966d95e618bba803e5d1e6544c61d7246f7970943322e2e5a  p6b/step/work/write.prompt.md
85ea6e5d0d6e4cddab83d4f0dbd577ab2b38a116691bc05e07ec266960a02d49  p6b/step/work/write.reply.md
929ea9b2e2483d01959aa82a6b3d54473bcfa21d93708e8848ce22ae6866fc38  p6b/step/work/write.reply.md.run.json
1f2fb0405c3493824826ec228d1b45df5b2acc5c1aed68fd42b314bf7752f246  p6b/step/work/write/885c4c2-T1.spec.ts
7d80dacd3038bb7ce2208c829c4bca4a3f198c17c734afa51999e970781162cd  p6b/step/work/write/885c4c2-T3.spec.ts
06525daa673aa9f8b4228ac6da4bea176d13ac9b15c391d35c79e9483ff7cde3  p6b/step/work/write/885c4c2-T4.spec.ts
488e251bf56b3ee97c513427765f673ab2fff7f73eab05b28b8fc981ee3b64a6  p6b/step/work/write/885c4c2-T6.spec.ts
1a2eba41038f2f817d9ac9683d7c40f83064fc7de6eb669fd8ad389385aafea6  p6b/step/work/write/manifest.json
c08709f72b93333d68afdcb9f9b3dcc2953fbd94c71e5bb977caf5c08e4599b2  p6c/step.json
f59c4a0e896559ab248f34c20701eea681c0bd13a9573a9da5405eb772603e00  p6c/step/grades/885c4c2.json
5ab9891094fefb0ea185654a2cef1b2ca694dcebafba01678a86575caa2db9a7  p6c/step/grades/c8db5b7.json
f09e68ca2f71ca0e7a54150305cb867009338a01e441f808d85344dcaca35584  p6c/step/labels.json
60cafdc84709362959138d7db56f2c4757a3ea1d996a239c4afabe6fd326ba54  p6c/step/logs/885c4c2-1.log
494d6bdb32c3249c6d5ef817fbfb62c8a812e4f8a15dc2a9cbb561a5eead2f9e  p6c/step/logs/c8db5b7-1.log
80176d78464e2d283dfacefb44871b3e2ce1ad390ec49248d3edef5ad1e13e7e  p6c/step/oracle/c8db5b7-T1.spec.ts
58fa508be41b7e136ae4c02a6ba0e2c91db7f78f76117f9a659dd82580b20a93  p6c/step/oracle/c8db5b7-T3.spec.ts
63b341cdb909dd014d81668050514d83e23d72183727175835194c670299de6f  p6c/step/oracle/c8db5b7-T4.spec.ts
a4bee7cfe9e82af119247a11a16ecb0f74e7d5cbd769d87129bbce0143e8d5e9  p6c/step/oracle/c8db5b7-T5.spec.ts
10de2a160f3ba64d5c048ccd4ea8c98bf63a65bee58ce6ceebf5030089838eeb  p6c/step/oracle/c8db5b7-T6.spec.ts
f0aa0f75049d45bb43e7ed8bb5f7614616e7d6e80f6acb0e50256e61d6e58f1f  p6c/step/oracle/c8db5b7-T7.spec.ts
7bdcd236334c6a4aa6e26a782112819077bfcb90a7a044ebcceb387b8ae92f34  p6c/step/oracle/c8db5b7-T8.spec.ts
0f0142ad33f3649211b6aef0ab55a87a40ed6c827b6c24ede9c4a54468615edf  p6c/step/oracle/c8db5b7-T9.spec.ts
d909d0f7872da06fe6edb2ae9f7f216fa56d12d83de6d2ab5358637e19d8de32  p6c/step/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p6c/step/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p6c/step/oracle/playwright.config.ts
b00d142f1c9480c34ce659fa25d79e74b02507a6d800f6a6934f2f9d4d4fb75a  p6c/step/steps-2.reply.md
79d246cee7141e272210c1843cbee367756c2f70ca25c43f1c91cfe35754b034  p6c/step/steps-2.reply.md.run.json
7533031687b50d7409a5287f5ae05f13ad0368f662a61687999d28cbff572249  p6c/step/steps.json
8df362643d1380d8ad24383574033734d41a86bd66789879350db43f52826b3b  p6c/step/steps.reply.md
e1d46f0f6bdaac95853744139e2597a3a5bfb90271fe60c9b5cc59948df9be93  p6c/step/steps.reply.md.run.json
b1786217966dbf2d6edafb725cfaf45299b3a0d88dce24dff12856245488494e  p6c/step/validation-c8db5b7.json
5c13965a2afe34473161af40313cd6be5aaae850d8a95a616fcba2a53d962322  p6c/step/work/steps.prompt.md
dbbfa2fbfadd01d1cdb146abc2262e423bab0d7e52c01b6f818021b2d067db4f  p6c/step/work/write-settings.json
a5cb1432b62200eb2f206886eaacbae0df470b02b1fc86d5ab887e8faab5952e  p6c/step/work/write.prompt.md
75061031fbf1771d9e78679135765ca55f6bc01332492aa4cd3dc4b6e77d35a4  p6c/step/work/write.reply.md
5f45f2df9ce07c5f20305f40d2f909ba18c721bc44349f76100ac08111b80260  p6c/step/work/write.reply.md.run.json
80176d78464e2d283dfacefb44871b3e2ce1ad390ec49248d3edef5ad1e13e7e  p6c/step/work/write/c8db5b7-T1.spec.ts
58fa508be41b7e136ae4c02a6ba0e2c91db7f78f76117f9a659dd82580b20a93  p6c/step/work/write/c8db5b7-T3.spec.ts
63b341cdb909dd014d81668050514d83e23d72183727175835194c670299de6f  p6c/step/work/write/c8db5b7-T4.spec.ts
a4bee7cfe9e82af119247a11a16ecb0f74e7d5cbd769d87129bbce0143e8d5e9  p6c/step/work/write/c8db5b7-T5.spec.ts
10de2a160f3ba64d5c048ccd4ea8c98bf63a65bee58ce6ceebf5030089838eeb  p6c/step/work/write/c8db5b7-T6.spec.ts
f0aa0f75049d45bb43e7ed8bb5f7614616e7d6e80f6acb0e50256e61d6e58f1f  p6c/step/work/write/c8db5b7-T7.spec.ts
7bdcd236334c6a4aa6e26a782112819077bfcb90a7a044ebcceb387b8ae92f34  p6c/step/work/write/c8db5b7-T8.spec.ts
0f0142ad33f3649211b6aef0ab55a87a40ed6c827b6c24ede9c4a54468615edf  p6c/step/work/write/c8db5b7-T9.spec.ts
a222a65cee17c0f4894e50af91af2c46ca793a5aaa5b53aded97d71245b3951b  p6c/step/work/write/manifest.json
8abfa3aa968c5d86ac6ce478e2648348cfcc27a0092d8ca497f1c4e4aa4e376c  p7b/step.json
02ee85c02010df7227d653c94704c091dc0febb0461867439b37b11b3b2af986  p7b/step/grades/3137149.json
50ce83d4dbdbad5babcb32265039db7237249ebbdc3278eb8c16017aded308a2  p7b/step/grades/9354f4d.json
c756313477847282ac2997df63f03cefaf36c473611f859a8ac6741191374fac  p7b/step/labels.json
6f18966bbe63f6882e9f3513360dc91d3b672a15233abac753a10192e10e43ec  p7b/step/logs/3137149-1.log
bb31f734787da030967fcea3821e60fd8bd15fe66469eacb76f5b8b78a472da4  p7b/step/logs/9354f4d-1.log
c431b790bb1277389aea4d00bcf28d7fcb0bbc6aadca9b0170e283ae18028754  p7b/step/oracle/3137149-T4.spec.ts
b3381af457d358478f4eb89bb8694f0e0c3740832c93f2000ea071748033282c  p7b/step/oracle/3137149-T5.spec.ts
3acf755d7ab6fa5bba230c36ae27408ba618b32d899ecdc5d3081c187d5e5fc8  p7b/step/oracle/3137149-T7.spec.ts
f10b32596e0b36d71f9fdaf783af13ba07eaab9e69c9fcb3a593ff5e7f3812e4  p7b/step/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p7b/step/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p7b/step/oracle/playwright.config.ts
8384e68b905816a40c6318a60248e11f720ed6fd653d604cf976441ca66ec59c  p7b/step/steps-2.reply.md
030216dc141241bbf09c6455824e0ef0f9cf469a10ad29a3bd4e1a6300f48557  p7b/step/steps-2.reply.md.run.json
13eeb8fe8e451eb0eea68d6163038aa2b3d31a334ba000b4407398fddcdada37  p7b/step/steps.json
4f126babf6066afd34a89678e09a2b6555797e969719a8c361e880783e5d314a  p7b/step/steps.reply.md
f480077c17b14c65c2369c07b0743fa01a99f49d3cc3ecd4945be5d1a0067496  p7b/step/steps.reply.md.run.json
cdc5f67063aa39e6efcccb99977b96b38bdbcf0a284c0f296c1522d4537dfb67  p7b/step/validation-3137149.json
ca8eb2730372d1834e8c965c1f024f0ee668e58d4ebda8532d5aad692f3870e0  p7b/step/work/steps.prompt.md
eddec54857b26e30e92c28bb51c516f0b23f467fda9beab46ae73c094a5551f1  p7b/step/work/write-settings.json
66d85b7cba4e2420d554bf9e700f58446f5afa9e58be6b6bd709625fadf62602  p7b/step/work/write.prompt.md
5ab248fedadce68f4ab5137adb1544051198c61874cf5767505149d78e53e4d7  p7b/step/work/write.reply.md
ef6bc301130b49fcb6228509638445aca2a7e62b0efceff14d6c1a46f1a4cca8  p7b/step/work/write.reply.md.run.json
c431b790bb1277389aea4d00bcf28d7fcb0bbc6aadca9b0170e283ae18028754  p7b/step/work/write/3137149-T4.spec.ts
b3381af457d358478f4eb89bb8694f0e0c3740832c93f2000ea071748033282c  p7b/step/work/write/3137149-T5.spec.ts
3acf755d7ab6fa5bba230c36ae27408ba618b32d899ecdc5d3081c187d5e5fc8  p7b/step/work/write/3137149-T7.spec.ts
e7dd493a607d4f90c42a2cbc9efc9791a78c37c98b662f6e45eee912b71e72f9  p7b/step/work/write/manifest.json
d35c50e8d895ddfd2c8aeaab3f9132596891efb97c0bed7e516ac7eee2df9ca8  p7c/step.json
340ef68b27e54ef1a6735b8d9804ca9458aa5f1eae0834c92cb1b091142cd026  p7c/step/grades/0b02f41.json
88a9f11e134cb68619781551e395d0c91c6cb13c9282ed18a6bc5d0d66a0d4f6  p7c/step/grades/3137149.json
19b0564d3bb83ab74467d337afa8e68ab21f56f8f0bbb658d7be117aaa57bce4  p7c/step/labels.json
5ddaae16886eeb963559c7cf1696aab09b6b5e7f38244bd7a6ac9af656e37dae  p7c/step/logs/0b02f41-1.log
aa62c25a7989ec9ebf806549b5c0c167884c1d646f558721fb3443d858a16540  p7c/step/logs/3137149-1.log
6d162264a44f6f0032d24303c1e6caf709db7b7d53b549605abdd79facaf3b07  p7c/step/oracle/0b02f41-T1.spec.ts
a115137aef7bee7bbf3e39049e34ad94e0ad7ff316a02c32cc3143efbc0fc40b  p7c/step/oracle/0b02f41-T10.spec.ts
41147992a3979f0e8b09dbcc3036e5473bdfa8d3d0f29decc54595cf473e96f3  p7c/step/oracle/0b02f41-T2.spec.ts
59dcc1d972605add8a17a30ab73f4f31ffd24fd63e99c91a8f988323be62297e  p7c/step/oracle/0b02f41-T4.spec.ts
d7705c47c5ddb5261d9333b057132d6bf4702f7900bf9ddadf23d9a076bcb69c  p7c/step/oracle/0b02f41-T6.spec.ts
231f7245161bef7dab65e56b6247613f654a37074dd21fafcb73c731001d9251  p7c/step/oracle/0b02f41-T7.spec.ts
b84289c216b58f0418a65a91d859024b99cd1c0bc3b3614bc7b0ae9ba031d4ca  p7c/step/oracle/0b02f41-T9.spec.ts
4695ad9a496386f2820567a707e8aaf8d18a895665009304c1a283de045152b2  p7c/step/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p7c/step/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p7c/step/oracle/playwright.config.ts
3cb448c5289e3914469b0706c3bf7672cfd142b16a113975f939b05d3058afcf  p7c/step/steps.json
156c8420dc9f369533ba9eebc5191f47f04a6c0eee663e9573cb85132b642079  p7c/step/steps.reply.md
5cbd794004df1bfca899ad015fa1c248d9e228caefb152539e338ffa09090863  p7c/step/steps.reply.md.run.json
4b942da894430258e9cffc51d370802ec1b506952512c02f8e5f4d4f2d2157e1  p7c/step/validation-0b02f41.json
8dec245326387b36db038560364353f18e37cd1c1cd07b1427d0c994f0321ae8  p7c/step/work/fix-step-1/0b02f41.fix.prompt.md
e4f60e4c92568f41a4cbaea4a101eb3a82c4fc896322f45ae915f25e0d77fa25  p7c/step/work/fix-step-1/0b02f41.fix.reply.md
2c00e21094afeb5b54024843d2934b4dea59f39d651be5ff87e71971c920f9c0  p7c/step/work/fix-step-1/0b02f41.fix.reply.md.run.json
a5186ef4aaa9af0619f9b48b86cd3ce015c9ea457b8f3602634b322b6aef4c51  p7c/step/work/fix-step-1/0b02f41.settings.json
6d162264a44f6f0032d24303c1e6caf709db7b7d53b549605abdd79facaf3b07  p7c/step/work/fix-step-1/0b02f41/0b02f41-T1.spec.ts
a115137aef7bee7bbf3e39049e34ad94e0ad7ff316a02c32cc3143efbc0fc40b  p7c/step/work/fix-step-1/0b02f41/0b02f41-T10.spec.ts
41147992a3979f0e8b09dbcc3036e5473bdfa8d3d0f29decc54595cf473e96f3  p7c/step/work/fix-step-1/0b02f41/0b02f41-T2.spec.ts
59dcc1d972605add8a17a30ab73f4f31ffd24fd63e99c91a8f988323be62297e  p7c/step/work/fix-step-1/0b02f41/0b02f41-T4.spec.ts
d7705c47c5ddb5261d9333b057132d6bf4702f7900bf9ddadf23d9a076bcb69c  p7c/step/work/fix-step-1/0b02f41/0b02f41-T6.spec.ts
231f7245161bef7dab65e56b6247613f654a37074dd21fafcb73c731001d9251  p7c/step/work/fix-step-1/0b02f41/0b02f41-T7.spec.ts
b84289c216b58f0418a65a91d859024b99cd1c0bc3b3614bc7b0ae9ba031d4ca  p7c/step/work/fix-step-1/0b02f41/0b02f41-T9.spec.ts
4695ad9a496386f2820567a707e8aaf8d18a895665009304c1a283de045152b2  p7c/step/work/fix-step-1/0b02f41/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p7c/step/work/fix-step-1/0b02f41/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p7c/step/work/fix-step-1/0b02f41/playwright.config.ts
f9edb79e10e34eaa804c02fa1ff07943a86fe117381edd12e4601d71409381c2  p7c/step/work/fix-step-2/0b02f41.fix.prompt.md
7f0b570c00aa7e2cd636fb89e4f9e839bf9874a3ed46619743e9469b876f6ab0  p7c/step/work/fix-step-2/0b02f41.fix.reply.md
4a1426254378fbb7af0f77bf892f4fbb830bb65beaf2eb927c682c80bd38eb10  p7c/step/work/fix-step-2/0b02f41.fix.reply.md.run.json
7c4cb35d0458472094248417231bb78d683fb3247104dc25505070b01d8e6774  p7c/step/work/fix-step-2/0b02f41.settings.json
6d162264a44f6f0032d24303c1e6caf709db7b7d53b549605abdd79facaf3b07  p7c/step/work/fix-step-2/0b02f41/0b02f41-T1.spec.ts
a115137aef7bee7bbf3e39049e34ad94e0ad7ff316a02c32cc3143efbc0fc40b  p7c/step/work/fix-step-2/0b02f41/0b02f41-T10.spec.ts
41147992a3979f0e8b09dbcc3036e5473bdfa8d3d0f29decc54595cf473e96f3  p7c/step/work/fix-step-2/0b02f41/0b02f41-T2.spec.ts
59dcc1d972605add8a17a30ab73f4f31ffd24fd63e99c91a8f988323be62297e  p7c/step/work/fix-step-2/0b02f41/0b02f41-T4.spec.ts
d7705c47c5ddb5261d9333b057132d6bf4702f7900bf9ddadf23d9a076bcb69c  p7c/step/work/fix-step-2/0b02f41/0b02f41-T6.spec.ts
231f7245161bef7dab65e56b6247613f654a37074dd21fafcb73c731001d9251  p7c/step/work/fix-step-2/0b02f41/0b02f41-T7.spec.ts
b84289c216b58f0418a65a91d859024b99cd1c0bc3b3614bc7b0ae9ba031d4ca  p7c/step/work/fix-step-2/0b02f41/0b02f41-T9.spec.ts
4695ad9a496386f2820567a707e8aaf8d18a895665009304c1a283de045152b2  p7c/step/work/fix-step-2/0b02f41/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p7c/step/work/fix-step-2/0b02f41/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p7c/step/work/fix-step-2/0b02f41/playwright.config.ts
f3bc02a0225021aedc01b40660f33d07ffe29f722d48475f6d2700a2b585ff0a  p7c/step/work/steps.prompt.md
0a39a7c43ab8f0a2d26f1d36400009321302e74a2f5f2fbf51539096a0f8ef9d  p7c/step/work/write-settings.json
4e33096b2b3c4d7fc813512584121d1924027709efcd63fddf9fed613f9fed10  p7c/step/work/write.prompt.md
4a237016c589868f90c92170b3fed43bb1508ebb179ae0bb4e13ec7d4fc12d77  p7c/step/work/write.reply.md
fb68ef65dc4ee1c38ca8e802c1fc9765bb119f2adf8e37864685b6452e6a2149  p7c/step/work/write.reply.md.run.json
6d162264a44f6f0032d24303c1e6caf709db7b7d53b549605abdd79facaf3b07  p7c/step/work/write/0b02f41-T1.spec.ts
a115137aef7bee7bbf3e39049e34ad94e0ad7ff316a02c32cc3143efbc0fc40b  p7c/step/work/write/0b02f41-T10.spec.ts
41147992a3979f0e8b09dbcc3036e5473bdfa8d3d0f29decc54595cf473e96f3  p7c/step/work/write/0b02f41-T2.spec.ts
59dcc1d972605add8a17a30ab73f4f31ffd24fd63e99c91a8f988323be62297e  p7c/step/work/write/0b02f41-T4.spec.ts
d7705c47c5ddb5261d9333b057132d6bf4702f7900bf9ddadf23d9a076bcb69c  p7c/step/work/write/0b02f41-T6.spec.ts
231f7245161bef7dab65e56b6247613f654a37074dd21fafcb73c731001d9251  p7c/step/work/write/0b02f41-T7.spec.ts
b84289c216b58f0418a65a91d859024b99cd1c0bc3b3614bc7b0ae9ba031d4ca  p7c/step/work/write/0b02f41-T9.spec.ts
6d6fb26e065e24e9de7cb0419cbb7ab4c8c1bd54b8120acaf25fd6518961cac3  p7c/step/work/write/manifest.json
318fb88543a177f04226f054117566707afed1f625c361011cea9a069c79e306  p8a/step.json
0c00b3ec97d465b05120d761a31b3d55ffaf44c7643b7ff484014d5c5b38c719  p8a/step/grades/0b02f41.json
ec7e2eab01111c3d858db5eed76b91130af61a168f794363098b81eaeea66371  p8a/step/grades/d1ea76b.json
10b407c06203bbde466c48378c222e5db7aa8ac6543865cbf3f75b290728d1ab  p8a/step/labels.json
e9a839f5538db4d8f604582163aae47e884ada2076c9d5d37e26cf0a8c859942  p8a/step/logs/0b02f41-1.log
5330ba01d4427eff3b2ae42d8930933206e64c1ce01e0132a23635def741c792  p8a/step/logs/d1ea76b-1.log
b431118a354087d619e9a47340eb8063e7e7946af5f61cd25be31646b8c06b86  p8a/step/oracle/d1ea76b-T1.spec.ts
5f6069dce0b18c8370c7f42dcbbf9aeca0288a4b03b29195ccb828fef4883284  p8a/step/oracle/d1ea76b-T10.spec.ts
a46bc5d31739663a3f09a3440ddb5495cafb4edc2daf36d9eb41291501996843  p8a/step/oracle/d1ea76b-T11.spec.ts
0160d34e6c149d521b32c920d456221ad731d299c99d70471a6a3cfe76a6f754  p8a/step/oracle/d1ea76b-T12.spec.ts
59ec07fa01222d7c4dd637d87d509ae588879e9f9bba8fb440c79006e8855012  p8a/step/oracle/d1ea76b-T13.spec.ts
481b7a122702ae5da1c4e63d5228a204ae0022d66dc567066f6ca468595cca5c  p8a/step/oracle/d1ea76b-T14.spec.ts
538244fe0e9108434668a191fe81e0d65fa6cbeac2bd849d6b4f2d556d514cab  p8a/step/oracle/d1ea76b-T15.spec.ts
7289821da202791cf02de1ebf8d3010337edbb9b08b6f37339e17e2b3735690f  p8a/step/oracle/d1ea76b-T2.spec.ts
997e190b0a73f0bacefa84bc68a1f11d5b6e88394a6bea1ddd2493a4b277e323  p8a/step/oracle/d1ea76b-T3.spec.ts
9c1c2e636a85921bcebf5293d9d92be51c3b1d9b6d67812701e8dbe0f61937c2  p8a/step/oracle/d1ea76b-T4.spec.ts
12a6f635938986cfab544059e5906ab39549e8cde3bcff826dcd5555b37cc9ec  p8a/step/oracle/d1ea76b-T6.spec.ts
1a91e7ceb54f1bc5577bdd29fe400165a1720f3d11961d0aedc55f374ab5307b  p8a/step/oracle/d1ea76b-T7.spec.ts
d173a157ed5cca892f874ece1fb5be6eaa597116c85d7ce45ea49e78fd0f1e6e  p8a/step/oracle/d1ea76b-T8.spec.ts
4fe44a96738f3e4acfac3bc67f63d5475d5100cfeb85df79272b4f44619c88eb  p8a/step/oracle/d1ea76b-T9.spec.ts
9b329b52e24ffd0f80360bacb7784b45976c3baa47c40f2a3d6ee5ab2cbeab26  p8a/step/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p8a/step/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p8a/step/oracle/playwright.config.ts
64ccca002fb99f2f8cdb6b565bfc5684d8b8943928e9c980b5b258193406abf0  p8a/step/steps.json
f63c1666c101bdeffa62db05cb526433cc3e5287836334fafd5226b4f4a9bd07  p8a/step/steps.reply.md
0f02e9224b9909a5e2c6b115cfb17461e8343f32ffcec5fd428ac13f82b7c403  p8a/step/steps.reply.md.run.json
65fa56aefe799105be21b8d784cd54fe01bed98840db06649770710cdc01382b  p8a/step/validation-d1ea76b.json
ca808b961d07fdab37209348167d5622269c0a2eb4d35fee494341d6ca525bef  p8a/step/work/steps.prompt.md
28069ee022521485637cbdaa5951101e25b154140f98ffd6f0bec03801bc5412  p8a/step/work/write-settings.json
132220233d4b0284d1606d9e18f3fe9b8ae20d7ecaaddceee5100c455397b49b  p8a/step/work/write.prompt.md
bb46a701cf2662bebbcf93663c3f19cc3e7609421c07a96dbbf72670d269dade  p8a/step/work/write.reply.md
434288c11b20a268ebd7c191830e9be1168799a20c2d6928f1e9a16df6f76e5d  p8a/step/work/write.reply.md.run.json
b431118a354087d619e9a47340eb8063e7e7946af5f61cd25be31646b8c06b86  p8a/step/work/write/d1ea76b-T1.spec.ts
5f6069dce0b18c8370c7f42dcbbf9aeca0288a4b03b29195ccb828fef4883284  p8a/step/work/write/d1ea76b-T10.spec.ts
a46bc5d31739663a3f09a3440ddb5495cafb4edc2daf36d9eb41291501996843  p8a/step/work/write/d1ea76b-T11.spec.ts
0160d34e6c149d521b32c920d456221ad731d299c99d70471a6a3cfe76a6f754  p8a/step/work/write/d1ea76b-T12.spec.ts
59ec07fa01222d7c4dd637d87d509ae588879e9f9bba8fb440c79006e8855012  p8a/step/work/write/d1ea76b-T13.spec.ts
481b7a122702ae5da1c4e63d5228a204ae0022d66dc567066f6ca468595cca5c  p8a/step/work/write/d1ea76b-T14.spec.ts
538244fe0e9108434668a191fe81e0d65fa6cbeac2bd849d6b4f2d556d514cab  p8a/step/work/write/d1ea76b-T15.spec.ts
7289821da202791cf02de1ebf8d3010337edbb9b08b6f37339e17e2b3735690f  p8a/step/work/write/d1ea76b-T2.spec.ts
997e190b0a73f0bacefa84bc68a1f11d5b6e88394a6bea1ddd2493a4b277e323  p8a/step/work/write/d1ea76b-T3.spec.ts
9c1c2e636a85921bcebf5293d9d92be51c3b1d9b6d67812701e8dbe0f61937c2  p8a/step/work/write/d1ea76b-T4.spec.ts
12a6f635938986cfab544059e5906ab39549e8cde3bcff826dcd5555b37cc9ec  p8a/step/work/write/d1ea76b-T6.spec.ts
1a91e7ceb54f1bc5577bdd29fe400165a1720f3d11961d0aedc55f374ab5307b  p8a/step/work/write/d1ea76b-T7.spec.ts
d173a157ed5cca892f874ece1fb5be6eaa597116c85d7ce45ea49e78fd0f1e6e  p8a/step/work/write/d1ea76b-T8.spec.ts
4fe44a96738f3e4acfac3bc67f63d5475d5100cfeb85df79272b4f44619c88eb  p8a/step/work/write/d1ea76b-T9.spec.ts
08e777ce91ccd9f73a5e31615dc970140ce1c92758ce2a978357d021c6c6ebdc  p8a/step/work/write/manifest.json
7e85a42c4439b01384d646f92aa9e8eb43aaed7711c97558456a7c6c94354671  p8b/agreement.json
20dd03bd1169b532f98f2cd7b253d0f737af173c96ebb70316dccfd9bb41a042  p8b/classify-1.json
29b88a423297154572fd079985213e9484414d412001a0e539c8990cb33f4bc7  p8b/classify-2.json
756e3c9c3ab135572cf5898183208f8d7efc2ccadd8c2e739dcdca4e285a899a  p8b/labels.json
5fbf3ccb7e4a5bdd75628d2464b1137eaf527f4b3938540ca693d6f726abe64b  p8b/step.json
c9d9edec9829fe61d6c6cd2385bd598b16b1ed6b9dd38969d30a56e0921c2844  p8b/step/grades/1846450.json
3bee52c9e506138e3252a015d994fcec0a918ca77fc5189a307d4bb642c8d155  p8b/step/grades/d1ea76b.json
470e9b37d548cd424bf88a6470cf91c45d7c84e6f70519ea656c129e7e30e7c1  p8b/step/labels.json
76e27a31699c87890944ec8c727b6702daf5526bf7c3169631713a488a4cad8f  p8b/step/logs/1846450-1.log
aebb558aed6edd98c8d5be597a6844cd616bd8cbabc0fb558a38af43a305dcd3  p8b/step/logs/d1ea76b-1.log
266e9dd8e1e30a870be01cce1154d730f04d14b470e238e34d3175a99f608d4a  p8b/step/oracle/1846450-T1.spec.ts
a55495c2232bfa6f25d9a9b61f09b1355531ea2e60174bbca44a9e5d1bcee418  p8b/step/oracle/1846450-T10.spec.ts
71b1da4783f7f08b2f718214478410b6d801b5ae17b6fb5f94728e89733f0ab8  p8b/step/oracle/1846450-T11.spec.ts
48d3875ae72206911c9ae1c97d6b2be489a1f96853efa34a18da773d4c37955b  p8b/step/oracle/1846450-T13.spec.ts
f9720d2f6e9d50a8890fa1e4aab468d38e9e75fb76a0904e08fa6d207aac78b8  p8b/step/oracle/1846450-T14.spec.ts
89728c3603da28ecad11d34ec1c61b9e4adae83b2c429f48d5f3f86e7fa49c18  p8b/step/oracle/1846450-T15.spec.ts
aa4797ce59ce30fa654175d71511f2ce57782c05b689fc86a4c06c699f90bdac  p8b/step/oracle/1846450-T2.spec.ts
de883ccae23f00e4844c8e9db79b9e76710a4b44cef81a03824dee6f2e7c592e  p8b/step/oracle/1846450-T5.spec.ts
f3d88b30add57d9d4983cf72178bb98418f1823b18a47ebbf6e4064a61655fd6  p8b/step/oracle/1846450-T6.spec.ts
412b82a00c9d81381a6fa9e2d9e837875b90e43ed619c60d8339fc9d24d0d018  p8b/step/oracle/1846450-T7.spec.ts
cfad07c91a5891f322c7d0f51e5385fb50cf793f6293806a86028b61e0d5a4ac  p8b/step/oracle/1846450-T8.spec.ts
33c45a602faa1ffd9e78c44bcabc455e2a1d23c24199ec1c1f945ca0bb632d35  p8b/step/oracle/1846450-T9.spec.ts
7dcef88ef914c68e07e2f99e8cb185430a5ce3970fe69366b28db4fdbe15e6a9  p8b/step/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p8b/step/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p8b/step/oracle/playwright.config.ts
67734d6a64bc16c7d181586196675b07803583962222facfeb6ed81e81f86216  p8b/step/steps.json
d8256734d9808ec3472591daa5e5f8a9c88a7b29ff6d941259dd41456cb33161  p8b/step/steps.reply.md
a3fecb6d1c88bd65caef1979e05b21d6068728fdf462cc67ef4c60e12db0c7df  p8b/step/steps.reply.md.run.json
6769af391bb5112b6d1cbc299ea28483e6a658621d51590a688c2ba706ff4966  p8b/step/validation-1846450.json
629791b644431966646a7fb5c03b421d1ba38c60be90062781a00ff95c985519  p8b/step/work/steps.prompt.md
08c10911592cf86441bef65fa7d616d764aa4d6304418a7c3d826bbaa331c540  p8b/step/work/write-settings.json
d552e1197ba3c09396308f652936aa56cabfd660745917c4e59e78fff106bd73  p8b/step/work/write.prompt.md
5a909c8001b930bc3884e46c6f70307447d75e1ef08aa6e3394eccef1dd95b25  p8b/step/work/write.reply.md
fc45b2bece18d0b6bf07bf52ab991e455552cedae24b3fc5ce4112fa23e7e735  p8b/step/work/write.reply.md.run.json
266e9dd8e1e30a870be01cce1154d730f04d14b470e238e34d3175a99f608d4a  p8b/step/work/write/1846450-T1.spec.ts
a55495c2232bfa6f25d9a9b61f09b1355531ea2e60174bbca44a9e5d1bcee418  p8b/step/work/write/1846450-T10.spec.ts
71b1da4783f7f08b2f718214478410b6d801b5ae17b6fb5f94728e89733f0ab8  p8b/step/work/write/1846450-T11.spec.ts
891e3183268e790dfbd9f7ed0dcd21eb2fb4e2e685468b5df41ce235b5b0515d  p8b/step/work/write/1846450-T12.spec.ts
48d3875ae72206911c9ae1c97d6b2be489a1f96853efa34a18da773d4c37955b  p8b/step/work/write/1846450-T13.spec.ts
f9720d2f6e9d50a8890fa1e4aab468d38e9e75fb76a0904e08fa6d207aac78b8  p8b/step/work/write/1846450-T14.spec.ts
89728c3603da28ecad11d34ec1c61b9e4adae83b2c429f48d5f3f86e7fa49c18  p8b/step/work/write/1846450-T15.spec.ts
aa4797ce59ce30fa654175d71511f2ce57782c05b689fc86a4c06c699f90bdac  p8b/step/work/write/1846450-T2.spec.ts
ad8027fba79ccfb0f3880cc6172a3ce1a638f8dae8990fab2c4dcfb3ed8092e5  p8b/step/work/write/1846450-T3.spec.ts
de883ccae23f00e4844c8e9db79b9e76710a4b44cef81a03824dee6f2e7c592e  p8b/step/work/write/1846450-T5.spec.ts
f3d88b30add57d9d4983cf72178bb98418f1823b18a47ebbf6e4064a61655fd6  p8b/step/work/write/1846450-T6.spec.ts
412b82a00c9d81381a6fa9e2d9e837875b90e43ed619c60d8339fc9d24d0d018  p8b/step/work/write/1846450-T7.spec.ts
cfad07c91a5891f322c7d0f51e5385fb50cf793f6293806a86028b61e0d5a4ac  p8b/step/work/write/1846450-T8.spec.ts
33c45a602faa1ffd9e78c44bcabc455e2a1d23c24199ec1c1f945ca0bb632d35  p8b/step/work/write/1846450-T9.spec.ts
fd72845f527eaa474600e869a446d67398979d6023727d9fc22d20879cf2269c  p8b/step/work/write/manifest.json
195f41e84081668c3370ba4c3087721f390d04b2169c22cbec59a27f8fd45202  p8c/step.json
6c38b699d8c9ad4e7672f547fc6294a8ec3ccd417b9f82468fd346c809bb0569  p8c/step/grades/bee1c22.json
a2163fed30afe0306f2916afe4a65443986f1c6833ebbb499ce47f50694ce821  p8c/step/grades/bf2eea3.json
2dbee3ea36acfea3ddada4c70ba90f60da9ec17291956aa4828a647f4b863cdf  p8c/step/labels.json
6cd91c183158c012c33608333d92371ca9f8fdf1ce1673ee3451046142a9522a  p8c/step/logs/bee1c22-1.log
18d540614ab2f31e8db3c5e1c94c8eddc769dab169d88d065ee28a4eea2f3e5f  p8c/step/logs/bf2eea3-1.log
4c5ba1d31e6837f656890446f3fdc3154737d14fb9d7ffa3987d866ce2af2293  p8c/step/oracle/bee1c22-T1.spec.ts
4db96abdac4d05da2e618294be256a7355f7048dcc541e7f1e5213a4748c1ff4  p8c/step/oracle/bee1c22-T11.spec.ts
67afd51390cefca041d28585d7269710e3d961a22ae4ea58486e82586ac508d2  p8c/step/oracle/bee1c22-T12.spec.ts
591747127cd9c503055139f681eb8e420b12756d9f05ee26d06fd5bd463130a4  p8c/step/oracle/bee1c22-T14.spec.ts
97f872598101dd7bff625595f5b16fa14a5eea31cebd5e6717b3283b44e918d8  p8c/step/oracle/bee1c22-T15.spec.ts
312bdb4c6e87c8a5e168bb103126477b58a2c47e2bb55858bfc048c15445ce78  p8c/step/oracle/bee1c22-T2.spec.ts
37efed457ece9c145981a2b3bfce1a076aeff32573c957becb6e5c6d13b650a8  p8c/step/oracle/bee1c22-T4.spec.ts
bcebfb250334d55ce1b6a9285f493413339702c0bce43198a8d3332c31ab6202  p8c/step/oracle/bee1c22-T5.spec.ts
b90a4a4f128997d23f0c4d28c2c8fe60608f465cdebc25b8dcf620b5834aeac8  p8c/step/oracle/bee1c22-T6.spec.ts
9986d4e590a701324018ce2462e0da42d2bcaf5f68dacb7a5f3956739ccbc371  p8c/step/oracle/bee1c22-T7.spec.ts
83338547b2667edef6b5ebb2538f228253a9f0c41be5f02e3495c2cbde1207cc  p8c/step/oracle/bee1c22-T8.spec.ts
00ed30b01dd40c1ea1d05ff621907b688b5836a323443e2d9bf1d990ea9a1017  p8c/step/oracle/bee1c22-T9.spec.ts
0569cd6cea3f7d5ddfb0e3c3dee64be23a1dc1eb2b3b8c33cf9bfb5d363bfa4c  p8c/step/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p8c/step/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p8c/step/oracle/playwright.config.ts
f2eea8efff168f60a6aa58507a4ad0d983f1aebbd3b293807772686fc3c55a39  p8c/step/steps.json
d4adc583be76b35fc718029ff065339a5910e7b6297de678604b305c4d9126a3  p8c/step/steps.reply.md
683511b4b88341d3d998dadcc580214ad0bb243e11230aadb60a73cf2ffd5cde  p8c/step/steps.reply.md.run.json
3a2e0b5f18a7d4235d708bdd8e0fd153d3b31d3f65543c8e48602fe070ea497b  p8c/step/validation-bee1c22.json
c7e1033a52b23d96fdd38bd3c40bfc47e50192244c71494f45a6279f0024381e  p8c/step/work/steps.prompt.md
8372b9a5c6f6c78077c0133add68af2755f558315f3b1571f216c506410e3dbf  p8c/step/work/write-settings.json
a8aaad36786ed7b710c8a58d9ed6283bfb816ddd8f812d476ab24e3ed0e1b3c2  p8c/step/work/write.prompt.md
8be6385267131957300385decf4e4821844c82d79d3434a51dc492c7a4dd49b0  p8c/step/work/write.reply.md
ecd5579deeaa0d6aa86f876101458d00418fce9c973549d48efc098f406e457d  p8c/step/work/write.reply.md.run.json
4c5ba1d31e6837f656890446f3fdc3154737d14fb9d7ffa3987d866ce2af2293  p8c/step/work/write/bee1c22-T1.spec.ts
4db96abdac4d05da2e618294be256a7355f7048dcc541e7f1e5213a4748c1ff4  p8c/step/work/write/bee1c22-T11.spec.ts
67afd51390cefca041d28585d7269710e3d961a22ae4ea58486e82586ac508d2  p8c/step/work/write/bee1c22-T12.spec.ts
591747127cd9c503055139f681eb8e420b12756d9f05ee26d06fd5bd463130a4  p8c/step/work/write/bee1c22-T14.spec.ts
97f872598101dd7bff625595f5b16fa14a5eea31cebd5e6717b3283b44e918d8  p8c/step/work/write/bee1c22-T15.spec.ts
312bdb4c6e87c8a5e168bb103126477b58a2c47e2bb55858bfc048c15445ce78  p8c/step/work/write/bee1c22-T2.spec.ts
37efed457ece9c145981a2b3bfce1a076aeff32573c957becb6e5c6d13b650a8  p8c/step/work/write/bee1c22-T4.spec.ts
bcebfb250334d55ce1b6a9285f493413339702c0bce43198a8d3332c31ab6202  p8c/step/work/write/bee1c22-T5.spec.ts
b90a4a4f128997d23f0c4d28c2c8fe60608f465cdebc25b8dcf620b5834aeac8  p8c/step/work/write/bee1c22-T6.spec.ts
9986d4e590a701324018ce2462e0da42d2bcaf5f68dacb7a5f3956739ccbc371  p8c/step/work/write/bee1c22-T7.spec.ts
83338547b2667edef6b5ebb2538f228253a9f0c41be5f02e3495c2cbde1207cc  p8c/step/work/write/bee1c22-T8.spec.ts
00ed30b01dd40c1ea1d05ff621907b688b5836a323443e2d9bf1d990ea9a1017  p8c/step/work/write/bee1c22-T9.spec.ts
53420b9c4c516c77a3f09379cdf0a6054db3857b0f9fe2bdc9d8480ea6f90191  p8c/step/work/write/manifest.json
40949db2bfebd627155587bbb62771d1d84d225ea4827c09da5b04770dd1aecf  p8d/step.json
0c84a668586b8988d996f314984f8f021e19ec39c754c4ed367512a805080b0e  p8d/step/grades/bee1c22.json
f3b6a4fc52970f79785e1b0ae814eb8f144fdcdc66496b68e8deeb59a8587d5c  p8d/step/grades/d7695d6.json
47d854ff8486a2f80722d957b9f3e8b4beb5985a12c8f4cded41f419aa0903c2  p8d/step/labels.json
8bfe981a495d765c9f94107db5dd42a7e8838317be7ccddff052653fe9d0cb14  p8d/step/logs/bee1c22-1.log
01875f2c946ef6631a168faacf9a30a5ecc22a22135d11be23d8b005e30908c4  p8d/step/logs/d7695d6-1.log
6d511c1d0dc36b9bd1ce64e63c69b170e62fe490509cc23e0300f6f96c2abad3  p8d/step/oracle/d7695d6-T1.spec.ts
57f8aaa2e06c427511acc3a70cd377b8d667357fdcf6f715fd0e8665bc6c3ed0  p8d/step/oracle/d7695d6-T10.spec.ts
501c3916cb61095679a0c11e5a8b6e9634080e5e559b10c9e906549c9e435862  p8d/step/oracle/d7695d6-T11.spec.ts
0488cf40a647b6baaaec704487d5e373ee29456903b034a8d8bd9b3db829e8b5  p8d/step/oracle/d7695d6-T12.spec.ts
20fe461bf263320c7a908f3b69f227818e73045eca0230c94e5d04b4d061829b  p8d/step/oracle/d7695d6-T13.spec.ts
b0d4256d196c1c57d7108aee715bbe32801a72e32c833775d6fd05dc68ac4bcc  p8d/step/oracle/d7695d6-T14.spec.ts
ac880de965a6d5a645ee705cf992dfaf9cd394b913d6c4b531a556cefce24b97  p8d/step/oracle/d7695d6-T15.spec.ts
5111b5b27d3886c9da1aca725b1056ce63ed0e7c0ea8ee9d2832d53b11503205  p8d/step/oracle/d7695d6-T2.spec.ts
e24df20e70c16aee7079190231a69cce423b18134eca4171c56b96f778bd9acb  p8d/step/oracle/d7695d6-T3.spec.ts
2d7b0c772c90c4699034313f43374396115aebaf98eae2eb1e53f426eab4c3b8  p8d/step/oracle/d7695d6-T4.spec.ts
d93aeb5f6ca0c5c2c08f59cb28c54eec274859c000804ea2dcfd3d5bfd4998ae  p8d/step/oracle/d7695d6-T5.spec.ts
0e9031edea5bdc3e1157b4b4db4879b885f0088a8eb96fae8af440227f126ae5  p8d/step/oracle/d7695d6-T6.spec.ts
5ff13c62a0db52ce31d18dbb67414ef7a10210193c61af42ec254ef6d2229df7  p8d/step/oracle/d7695d6-T7.spec.ts
c663c4a2cea29860cb6318de9becdee595e33385c47e20f7d09016e745e1f3ea  p8d/step/oracle/d7695d6-T8.spec.ts
4b149b3fe2fe8a8ad43ffe15dea0ce032458cb81f7243aeff8fef70833bf2bdf  p8d/step/oracle/d7695d6-T9.spec.ts
fa9de787af2436f1cf9a58f0088f5abf9b554ad9dfbd641ea58b924189f5352d  p8d/step/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p8d/step/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p8d/step/oracle/playwright.config.ts
04d8be1a09ffd4c64a023e887dde5de1360ddc4ea6d8bcc6c8a79dcba2ea1243  p8d/step/steps.json
4121acabca0cc2fc481ad8641e7c8e1083a479361162ab6205ba953ea6b9ff62  p8d/step/steps.reply.md
2815d771658a9b9d1f87478bca39f256f98191190a80249f358a388c8a928492  p8d/step/steps.reply.md.run.json
dd7aa8fc93182486bdbdaf722cbefe3fd6a495df65c9fdbfa14f071f1482889b  p8d/step/validation-d7695d6.json
f724233f1b5590ef2e31ef4e247b80cb8c110fd3c1e762d21629fba5c7a9fb46  p8d/step/work/steps.prompt.md
21f946c44c7bfb7a59448c57e958e3aeb94ded0420a0db92933bee090c9fea81  p8d/step/work/write-settings.json
76b52bd8e26f09508ff31280dfd33d1b5b2b7345bbe042c6a2e07b92ccd66039  p8d/step/work/write.prompt.md
80dcc5f1d0b2004011d851006142ba912cb017e1678ae2e538cc3d222294bdb6  p8d/step/work/write.reply.md
fa44aca1f12c8a3d4dd198b7fb3b4677d0411a02fc47f25a8c4236a2e04def96  p8d/step/work/write.reply.md.run.json
6d511c1d0dc36b9bd1ce64e63c69b170e62fe490509cc23e0300f6f96c2abad3  p8d/step/work/write/d7695d6-T1.spec.ts
57f8aaa2e06c427511acc3a70cd377b8d667357fdcf6f715fd0e8665bc6c3ed0  p8d/step/work/write/d7695d6-T10.spec.ts
501c3916cb61095679a0c11e5a8b6e9634080e5e559b10c9e906549c9e435862  p8d/step/work/write/d7695d6-T11.spec.ts
0488cf40a647b6baaaec704487d5e373ee29456903b034a8d8bd9b3db829e8b5  p8d/step/work/write/d7695d6-T12.spec.ts
20fe461bf263320c7a908f3b69f227818e73045eca0230c94e5d04b4d061829b  p8d/step/work/write/d7695d6-T13.spec.ts
b0d4256d196c1c57d7108aee715bbe32801a72e32c833775d6fd05dc68ac4bcc  p8d/step/work/write/d7695d6-T14.spec.ts
ac880de965a6d5a645ee705cf992dfaf9cd394b913d6c4b531a556cefce24b97  p8d/step/work/write/d7695d6-T15.spec.ts
5111b5b27d3886c9da1aca725b1056ce63ed0e7c0ea8ee9d2832d53b11503205  p8d/step/work/write/d7695d6-T2.spec.ts
e24df20e70c16aee7079190231a69cce423b18134eca4171c56b96f778bd9acb  p8d/step/work/write/d7695d6-T3.spec.ts
2d7b0c772c90c4699034313f43374396115aebaf98eae2eb1e53f426eab4c3b8  p8d/step/work/write/d7695d6-T4.spec.ts
d93aeb5f6ca0c5c2c08f59cb28c54eec274859c000804ea2dcfd3d5bfd4998ae  p8d/step/work/write/d7695d6-T5.spec.ts
0e9031edea5bdc3e1157b4b4db4879b885f0088a8eb96fae8af440227f126ae5  p8d/step/work/write/d7695d6-T6.spec.ts
5ff13c62a0db52ce31d18dbb67414ef7a10210193c61af42ec254ef6d2229df7  p8d/step/work/write/d7695d6-T7.spec.ts
c663c4a2cea29860cb6318de9becdee595e33385c47e20f7d09016e745e1f3ea  p8d/step/work/write/d7695d6-T8.spec.ts
4b149b3fe2fe8a8ad43ffe15dea0ce032458cb81f7243aeff8fef70833bf2bdf  p8d/step/work/write/d7695d6-T9.spec.ts
240bdcf3959ac6148bfc40132c401f8962ee527fe3f15a232aa2e24b18b128dc  p8d/step/work/write/manifest.json
e2867b5745eafac96cc3acf6f87d889ac672feaec92c6b3906361b4f049a8c2a  p8e/step.json
40a204dcf6b9d5e3d6c2795c578685e359d74f67cc37a5f04f839bcfe8aa335a  p8e/step/grades/a9c2377.json
dcd1ac3b6a5abc45d57f77850dfcb80edd84c168138d038a44734b55cc081370  p8e/step/grades/d7695d6.json
4e37ecec6bf9cd0d4cf9db814c44468e6f8ba8809699cb2f6a60d6e4ba373895  p8e/step/labels.json
e6f9ebff89514c03846c8ec157259cb8fbd82ec3b0039e7fc1298cb0d947ebfb  p8e/step/logs/a9c2377-1.log
f3dea6aa9f52d5108b0923521e7758ef87524d874ba664275b1faca8a6548289  p8e/step/logs/d7695d6-1.log
13b929cc8d1f72b0b3a03e933ae64b355a867ba7fc97d41546b97cf7694e679e  p8e/step/oracle/a9c2377-T1.spec.ts
657c8ebdbf8bc386c6d18822e7af389992582efaf44d2bff6e40ec328fe203be  p8e/step/oracle/a9c2377-T10.spec.ts
b5c9ca137d11ed9242c51f61febe8c4fd822d4010ce6e1bbda7bcfb1e08f6940  p8e/step/oracle/a9c2377-T12.spec.ts
ce8b6afc873ba56a0c39f1c508e3377bd60f4ebe2df92e6b3b411ae700d8493f  p8e/step/oracle/a9c2377-T13.spec.ts
f6e5697f15f132af2cd6fa3a8e259666fde34e33511320edbe971fe847d08d79  p8e/step/oracle/a9c2377-T14.spec.ts
8a38c21feef6234a2fe671cd2bb71ee5291702b14a829a9d9745e9732ed96aaf  p8e/step/oracle/a9c2377-T15.spec.ts
f9f3f3cb0ca8397de14cf2db21ff650d511667507f0a80af112c791a360a91c7  p8e/step/oracle/a9c2377-T2.spec.ts
d1722655cda0f480e8e5318c11b046d8caeabe036db540b07da0c9628b3a65d7  p8e/step/oracle/a9c2377-T3.spec.ts
2328a53d0773b31b22219e7b87a947c36ec82eda92b02d2bade8bbdd3253b181  p8e/step/oracle/a9c2377-T4.spec.ts
d6676d9419831c46c1a647696a155c799509b4ecbe9a7b9c2e920da465d274a7  p8e/step/oracle/a9c2377-T5.spec.ts
f49f083eb9733be98fa31f9624f1d333ea0bbc9470d56b3801e529f4d85192f9  p8e/step/oracle/a9c2377-T6.spec.ts
b35162c71d740645da79f6b9598bbd4896ce8ad63ec99f6a22fc463e24e56bd7  p8e/step/oracle/a9c2377-T7.spec.ts
560357ecd54b8e248e1a14e51776d3f47108b113b2dc05d33aa793d8e42c0cf2  p8e/step/oracle/a9c2377-T8.spec.ts
5c35546610fe3d7b4e317f4d32fba289315d5b7820f95ebdf02a9ae07b749bb6  p8e/step/oracle/a9c2377-T9.spec.ts
931e4e1f09f75c321f91ff3c7c6fb5ddd07b1e69c34ccf9531e92b242a031084  p8e/step/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p8e/step/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p8e/step/oracle/playwright.config.ts
97b5daa910dcb0dddbd2d8e6f716c65f1d1ba7a3e809cf45cd1fdad1e66e749f  p8e/step/steps.json
7e89ba0986748044b05671e1295e316ef2c5cc01fff61512ff65ca509498564f  p8e/step/steps.reply.md
e44e2636a09de59abfa08e4ce6461ac2cb9595a1b9b6b5ecec5312c51ba1a01b  p8e/step/steps.reply.md.run.json
7eae1a94a0be683867e099434de23ae2ad3572c80a04fb75dc020a3fc769904b  p8e/step/validation-a9c2377.json
802de871cbfaf5c5ef7e642d32fb64271455613ef27dfc595f658100891f9db8  p8e/step/work/steps.prompt.md
b23232eb2188dae67a73f4e7c8cf8c6c7f0f4f18039d1fa702ca2c8f908de47e  p8e/step/work/write-settings.json
9bc9e7270bb4fe88ee9532fb7930877d3cac5fe4a22f0109bb37443029441abf  p8e/step/work/write.prompt.md
5747cba4c5269ebae77d1e91496341f3045cb28b16a8e930835b06c1bb18e00a  p8e/step/work/write.reply.md
e7a6290c3a99386b8e62a64252dd083076f8c8af126d46e2321c8091084a8195  p8e/step/work/write.reply.md.run.json
13b929cc8d1f72b0b3a03e933ae64b355a867ba7fc97d41546b97cf7694e679e  p8e/step/work/write/a9c2377-T1.spec.ts
657c8ebdbf8bc386c6d18822e7af389992582efaf44d2bff6e40ec328fe203be  p8e/step/work/write/a9c2377-T10.spec.ts
b5c9ca137d11ed9242c51f61febe8c4fd822d4010ce6e1bbda7bcfb1e08f6940  p8e/step/work/write/a9c2377-T12.spec.ts
ce8b6afc873ba56a0c39f1c508e3377bd60f4ebe2df92e6b3b411ae700d8493f  p8e/step/work/write/a9c2377-T13.spec.ts
f6e5697f15f132af2cd6fa3a8e259666fde34e33511320edbe971fe847d08d79  p8e/step/work/write/a9c2377-T14.spec.ts
8a38c21feef6234a2fe671cd2bb71ee5291702b14a829a9d9745e9732ed96aaf  p8e/step/work/write/a9c2377-T15.spec.ts
f9f3f3cb0ca8397de14cf2db21ff650d511667507f0a80af112c791a360a91c7  p8e/step/work/write/a9c2377-T2.spec.ts
d1722655cda0f480e8e5318c11b046d8caeabe036db540b07da0c9628b3a65d7  p8e/step/work/write/a9c2377-T3.spec.ts
2328a53d0773b31b22219e7b87a947c36ec82eda92b02d2bade8bbdd3253b181  p8e/step/work/write/a9c2377-T4.spec.ts
d6676d9419831c46c1a647696a155c799509b4ecbe9a7b9c2e920da465d274a7  p8e/step/work/write/a9c2377-T5.spec.ts
f49f083eb9733be98fa31f9624f1d333ea0bbc9470d56b3801e529f4d85192f9  p8e/step/work/write/a9c2377-T6.spec.ts
b35162c71d740645da79f6b9598bbd4896ce8ad63ec99f6a22fc463e24e56bd7  p8e/step/work/write/a9c2377-T7.spec.ts
560357ecd54b8e248e1a14e51776d3f47108b113b2dc05d33aa793d8e42c0cf2  p8e/step/work/write/a9c2377-T8.spec.ts
5c35546610fe3d7b4e317f4d32fba289315d5b7820f95ebdf02a9ae07b749bb6  p8e/step/work/write/a9c2377-T9.spec.ts
aa8d5712eb9592aef37bd1981da4addb2babd096f8359738f4dc15ccb3d11748  p8e/step/work/write/manifest.json
1f54f274bb83d22031383776e4939bad7c5c9668df3ca4e9286db2b11828a0b6  s1-01/step-f2p.json
a936dc136585a7c32c944272cfa7840638997ce05c03ef0411ea5a506d84742f  s1-01/step.json
dbb678a3b1ea4580e56cc5afb91647194235e934f40c7aec30e30fd5b7fcdb14  s1-02/step-f2p.json
49422fda4a7e42e0d0322d60c3aa1457fab4e8329a1952b10962e24410427294  s1-02/step.json
9c581f26b5d4be8f7d3d8043c9c0b6690c835393bcc40f0a3805fc9f2de89249  s1-03/step-f2p.json
065e55c10e86c8160fd7853015c18f3f6be7ad9341443b531f4f3d4f9a602b88  s1-03/step.json
d7a292b921c8c208be7755827710c25bee5f1c0fad5dd5717c7db2fa47c57bfd  s1-04/step-f2p.json
1d3d5dd12144ccaae123ba154af6b1fb5c8867c2f56538c75e4ae5bebb742c65  s1-04/step.json
4c86bbc5ad7dd013816a775f87f644cfab4fd8cda7e7f6ef816be545e46e3787  s1-05/step-f2p.json
1e116410d12de89053b009bc91c4bbfef2a0f59e710860e1b4c84925d75b769b  s1-05/step.json
1239ce77d8f51930c53b9ffc1328ca3d8b32dd54154fdc7c9635de0a69828e6a  s1-06/step-f2p.json
a936dc136585a7c32c944272cfa7840638997ce05c03ef0411ea5a506d84742f  s1-06/step.json
60fc12cc85c4822a52de4c70acdb38f3a7f51b3228fc257d9a9673f845a00ce1  s1-07/step-f2p.json
58dc233cf605d44305c48efd793bfdac1fe8bce284acc8a08a9161c38a1afe95  s1-07/step.json
b4f18dc0650ee0af65ece1482ed21f0c6e5821de1a7011eb36fd6da23c3d44c3  s1-09/step-f2p.json
1cff0abf5a652e4bb9d86e29d856a25ba06b4dd0d8d613567ea02cd9d04aeacc  s1-09/step.json
78f4939fc0556ffd1a6bc4cf9f7b5eb1b2349f9fa90680a018306560daebe8a9  s2-01/step-f2p.json
ee78f798a55951090d495af8569a35aa64cb6f2434bb63949cbd39a6a8772e3e  s2-01/step.json
2756cf9962d65f2d1aa4e0c9e27fe68f61c3c42ae208642642ba2c42cc7b4118  s2-02/step-f2p.json
2d0ce7e7b21a6699b69fc4ed2fc767e54a8f6386d39cac03eec3eeeef7aae5c3  s2-02/step.json
bd1eb2d6788d06d83aa7b777028e66994619a81ceeb5ee1da5a1ebbebbce05f8  s2-03/step-f2p.json
a877f3de91afe19061e412180a8738641769e6b29d11bdedb941753443ce40cc  s2-03/step.json
416819e2034f18024c36ade9305d4126eaf08d9963b6c821c1e5c3a1f6ce698a  s2-05/step-f2p.json
54d7aca5edb014fc7704c716e710e3ad54718351244fc5da900684ead38498ce  s2-05/step.json
76779795707c2bbb7b4833bde27bd73ec547e9da634e55c03835a2fe16a79874  s2-07/step-f2p.json
188abf79d034fc1d5d5797c0c5ab866d7259f3cb1a311af535ee9e641d36a818  s2-07/step.json
5192a70a376caaea83192ab80c6526de6bf2db80c5f2bde77dca4e2d1a370f39  s2-08/step-f2p.json
7ba8b9e720bfe71c3449ba29a9f0eefe37b01afac6902a1f4cfbc64435584110  s2-08/step.json
b84f2007d1f16346f256e37ea7ffc99f23dfe11acd072ff82f5bbc9fc2e6d1f8  s2-09/step-f2p.json
b5deed83eadbb8e1535dd71ab0e38d240af6de8ad67d70dabd995ef23c47e2c4  s2-09/step.json
98a232d8d060eea86c14e47013894a92af0ab58d15428ed5693ad79fee96ae2c  s2-10/step-f2p.json
6f3526caf65c0e1bccca2c6889e1a1df7446abe60ec11681e87bb5226b904caa  s2-10/step.json
8b683608b84032798da1604c4e7d3bc8980ee1103c8e0d8b3a467d1e090c32a4  s3-01/step-f2p.json
a936dc136585a7c32c944272cfa7840638997ce05c03ef0411ea5a506d84742f  s3-01/step.json
4a3c6104d34c227e4e1e5e171782a0e47d2b67953f1da8b6f5b0e6d964eacbda  s3-02/step-f2p.json
6571e2720920616e1dd9232252193912cb1cc1bdea27e83cf2d77633eb1608c6  s3-02/step.json
8e13cb24a22acde17f4aecbe4567f22efc1206dc0f3339f2b389fa0c5f623fd9  s3-03/step-f2p.json
99566d9518eec032bc9d3d7a1f0d88e9a1c33d3911f83cfa7d82eb76e7ce233d  s3-03/step.json
6b1c678135cd9a3c4990ca2ed8b0f052200f765dad8997a72b325db5e54ca215  s3-04/step-f2p.json
15d1725abf3a9a8ba4e1714229ba6834f8632c8e2385e602cbbea056cfdfb6b9  s3-04/step.json
6058898541e87e61e4412b0f4ef40fe9264b17cc6c414a0704f328426d26325b  s3-05/step-f2p.json
e69ac72bcc60c67a1fc9759c4079e2cec4d34256b414cc6dc22740c7305c1c40  s3-05/step.json
b6b4e9acf88783f1af48ebee0c42f2937c45a8f4e3b54e315c9ce108bdfee011  s3-06/step-f2p.json
3dd7f7149ca49a7e48d2c15f2c41888ef489d08ad064ef2df7942fcc1b5f02ec  s3-06/step.json
9d1e09e6f84064e8e2b7909242f0f5dc89a3ca6ebb206d36c73aa40e8390fac3  s3-07/step-f2p.json
a936dc136585a7c32c944272cfa7840638997ce05c03ef0411ea5a506d84742f  s3-07/step.json
3b07ccef5c4abc2c94b3f6440fe87f3b8c2352f719a95ae787b976f4c15eaa10  s3-08/step-f2p.json
eb6deaf39b3cf6f445bad87a9a43f6e4388d16298e362bb126efa48dde1515f5  s3-08/step.json
835c1de452b8dc1dcf685b44abfa128c265e335a1dae3d97820fe3126f10cc9d  step9/p8b-classify.tsv
9b7147bf4e6f3f9c19bc7cf333f4601c0a4fe5fb338cb9cc23a1a8b8851bf345  step9/sample-7.1-step.tsv
```

The 17 scripts of `<data>/logs/step6/` are hashed apart from the 555 files above. The lock's counts come from them (see "Scripts").

```text
83e8117bbb500f3f61b19b7554b98dc29a33a8a787f85ea83e98f3175bdff193  logs/step6/floor-count.mjs
44376388e87884fbacc5f722eb584261064a052cb7b371695c35460f67c062c2  logs/step6/lister-newlines.mjs
f2505975f8617c73d693c84c5a12e7daf5024f7d37734bb11a9bd65d491dc966  logs/step6/lock-count.mjs
51aff2e51017bb926bc3ce9e062aa4762804c9f2b98413edf86cadb5ea9fa28c  logs/step6/lock-hash.mjs
f5ee3df0811b773d43d5ab4bb31207f0cc4b4c08c751c93112773e5f208b576e  logs/step6/lock5-compare.mjs
a270fee94dcdea2927cbf18a757e75641c55b0e3ac4b864536cd55134c4ce59d  logs/step6/p8b-classify-tsv.mjs
475fcfcf8c0dccbb4733c59e0af63b6966c89df08d2b28c3f7b4278b8e818f69  logs/step6/p8b-scored.mjs
65123968559d7df5ff5812cb7ba01d9849c1d39c1b253cbf332eae4e46c7fc7c  logs/step6/probe-f2p.mjs
9e87b6c5b8b1d870b105227a5fd60d66f0fae4fbde819859d2a25e12811420ba  logs/step6/probe-f2p2.mjs
e1c0e26733d99dde869434c41948306d5c77a196df888c71235821d4a479e811  logs/step6/probe-f2p3.mjs
d063ca81cea5a33f352fc65e21d4156181b902df2c8a98cde07a3fad93230817  logs/step6/probe-steps.mjs
2f25e9127ff0806584a2ba469604b9a1ef04b45128d097c34b0bcf8cccde4dc7  logs/step6/probe-titles.mjs
a64da303021641a05c7f2071dcfa691dbf9799daa889c67601cde0826b38a62e  logs/step6/probe-titles2.mjs
6981ba7ea0b5d9599b6ee22f25add736491a4aadbd58989d043769b592e00e57  logs/step6/probe-titles3.mjs
88fe4204bdce05e00424f08a9065499d0f15333b0c8478646e5a6ad2ee76bc1e  logs/step6/sample-7.1-step.mjs
f003dbabdd44b420ac586bbdce4a83c1ff663799c60f30eb5bc60c4519919fb6  logs/step6/task5-ids.mjs
81051ee3b2c5f570c311181d3eef8b244b74a53e6099d75f4eada64db52414b8  logs/step6/task5-usage.mjs
```

## Approval, 2026-11-05

The user approved the build on 2026-11-05 ("Duyệt build merge và push"): the plan `docs/plans/2026-11-05-bench-step-oracles.md` is `stable`, the branch is merged into main and pushed, and the build-time rulings that change how a step check is chosen, judged or scored are registered in prereg section 2 ("Added 2026-11-05, during the step 6 build"). Ruling 17 (p6a's and p7c's fixer runs stand) was put to the user as reversible and was not reversed.
