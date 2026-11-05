# Step 5 lock

Locked 2026-11-05, after the last task of step 5 had run. `<data>` = `.evidence/bench` (gitignored, in the main checkout). Plan: `docs/plans/2026-11-03-bench-oracles.md` (Tasks 1 to 12). Rulings: prereg section 7.1, rulings 1-16 of the plan, the user's decisions of 2026-11-03, and the controller rulings listed below. Rulings 1-16 are registered in prereg section 7.1, in the paragraph "Rulings registered before the oracles (step 5)". The external tasks are the 24 rows of the live `<data>/ext/sample.tsv`; `progress/step5/sample.tsv` and `progress/step5/walk.tsv` are byte-identical copies (`cmp`). The real-estate tasks are p1, p2, p3, p4, p5, p6a, p6b, p6c, p7b, p7c, p8a, p8c, p8d and p8e. Every count here comes from the tools' printed lines (`bun bench/oracle.mjs labels` and `queue`, run again at the lock; `sources/labels.tsv` and `step9/*` had the same SHA-256 before and after), from validation verdicts, from `labels.json` bucket counts, from `agreement.json` numbers, from `moves.json` and from run records. A counting script (`<data>/logs/task12/count.mjs`) read the oracle manifests and printed only counts. Nothing here was read from an oracle file, a check file, an input, a sheet, a prompt, a reply, a `classify-*.json` label, a step 9 row, `ext/sealed/`, `ext/raw/` or `heldout/`. Those files are only hashed.

## Kept tasks and their checks

How to read the columns:

- **pairs**, **agreed fix** and **disputed pairs** are the source pairs considered for the task, the pairs both labellers called `fix`, and the pairs whose labels disagree and wait for step 9 (`labels`, ruling 7). They apply to real-estate tasks only. An external task's single source is its PR.
- **written** is the entries the writers put in the task's oracle (ruling 9), counted before any moves or splits. It includes `interface: none` entries.
- **none** is the entries that are still `interface: none`.
- **moved in** is the `pre-existing` checks that other tasks moved here (ruling 12).
- **split** reads `originals → new checks kept` (ruling 15). A restored original went back to `requirement`, and its new checks were dropped (`split gave no scored half`).
- **valid** through **absent** are each live check's last verdict, for checks with an interface and the split originals left out. **pre-existing (moved to)** lists the checks this task moved out, by receiver. None of them is left as `pre-existing`, and none is recorded `none`.
- **scored** is `valid` plus `absent-at-base` (ruling 13).
- **build**, **requirement** and **disputed cl.** come from `labels.json` and from the disputed lists in `agreement.json`, split rounds included.
- **κ / raw / AC1 (n)** is the task's first classification round (`agreement.json`).

For every task, written − none − moved out + moved in − split originals + new checks kept + restored originals = valid + weak + broken + error + absent. Split originals include the 8 that were restored, which are added back as restored originals: s2-09 2, s3-01 1 and s3-06 5.

### Real-estate (set `task-repo`)

| task | pairs | agreed fix | disputed pairs | written | none | moved in | split | valid | weak | broken | error | pre-existing (moved to) | absent | scored | build | requirement | disputed cl. | κ / raw / AC1 (n) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| p1 | 53 | 4 | 6 | 13 | 12 | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 10 | 10 | 0 | 9 | 1 | 0.00 / 0.90 / 0.90 (10) |
| p2 | 46 | 9 | 2 | 30 | 3 | 19 | 3 → 6 kept | 0 | 4 | 4 | 2 | 0 | 39 | 39 | 4 | 33 | 2 | 0.83 / 0.95 / 0.94 (38) |
| p3 | 36 | 5 | 1 | 13 | 0 | 10 | 3 → 6 kept | 0 | 11 | 1 | 0 | 1 (p2 1) | 13 | 13 | 0 | 9 | 4 | 0.49 / 0.77 / 0.70 (13) |
| p4 | 42 | 9 | 1 | 19 | 0 | 2 | 0 | 0 | 1 | 0 | 0 | 0 | 20 | 20 | 0 | 19 | 1 | 0.00 / 0.95 / 0.95 (20) |
| p5 | 13 | 2 | 0 | 4 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | not classified |
| p6a | 33 | 5 | 0 | 9 | 2 | 7 | 0 | 0 | 0 | 3 | 0 | 0 | 11 | 11 | 0 | 9 | 2 | 0.00 / 0.82 / 0.80 (11) |
| p6b | 21 | 5 | 0 | 17 | 11 | 0 | 0 | 1 | 0 | 1 | 0 | 3 (p6a 3) | 1 | 2 | 1 | 1 | 0 | 1.00 / 1.00 / 1.00 (2) |
| p6c | 24 | 7 | 1 | 30 | 5 | 0 | 1 → 2 kept | 1 | 1 | 1 | 0 | 22 (p6a 3, p3 4, p2 14, p1 1) | 1 | 2 | 0 | 2 | 0 | 1.00 / 1.00 / 1.00 (2) |
| p7b | 15 | 1 | 0 | 2 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 1 (p6a 1) | 0 | 0 | 0 | 0 | 0 | not classified |
| p7c | 8 | 2 | 0 | 6 | 1 | 0 | 0 | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | not classified |
| p8a | 19 | 3 | 1 | 10 | 0 | 0 | 3 → 6 kept | 0 | 3 | 0 | 0 | 5 (p2 2, p1 3) | 5 | 5 | 0 | 5 | 0 | 1.00 / 1.00 / 1.00 (5) |
| p8c | 14 | 3 | 0 | 19 | 4 | 0 | 0 | 0 | 1 | 0 | 0 | 7 (p2 2, p3 4, p1 1) | 7 | 7 | 0 | 7 | 0 | 1.00 / 1.00 / 1.00 (7) |
| p8d | 14 | 6 | 0 | 20 | 9 | 0 | 0 | 2 | 2 | 0 | 0 | 4 (p3 2, p4 2) | 3 | 5 | 0 | 5 | 0 | 1.00 / 1.00 / 1.00 (5) |
| p8e | 9 | 4 | 0 | 12 | 1 | 0 | 1 → 2 kept | 0 | 2 | 0 | 0 | 4 (p1 4) | 6 | 6 | 0 | 5 | 1 | 1.00 / 1.00 / 1.00 (6) |
| **total** | 347 | 65 | 12 | 204 | 48 | 47 | 11 → 22 kept | 4 | 35 | 10 | 2 | 47 | 116 | 120 | 5 | 104 | 11 | pooled 0.73 / 0.92 / 0.91 (119) |

- The source pairs split into 109 in-task pairs (29 agreed fix, 1 disputed) and 238 later pairs (36 agreed fix, 11 disputed). The agreed pairs come from 52 source commits. The writers wrote 205 entries and refused 1 for `import` (c05ffaa), so 204 are in the oracles. Three source commits gave no check (58e8819, 730509b and edf7c3a), even after their rerun.
- p5, p7b and p7c have no scored check, so they were not classified (ruling 15 as the controller read it: classifiers see only scored checks).
- p2's 2 `error` checks come from its fix parent 090f6f2, which never gets ready (the product-side start log shows the app's font import failing at that commit).
- p1's base 691a723 has no `package.json`, so its base results are `precondition` (stage `no app at base`).
- All 47 `pre-existing` checks were moved. The receivers took p1 9, p2 19, p3 10, p4 2 and p6a 7. After the no-app rule was applied to the sweep's boundaries, 0 were recorded `none`.
- 35 checks are `weak`: 25 from the first validations and 10 split halves. 10 are `broken`; these include 1 moved into p2 that got no fixer round at its receiver (a parked ruling).
- 116 of the 120 scored checks score through `absent-at-base`.

### External (set `external`)

| task | written | none | moved in | split | valid | weak | broken | error | pre-existing (moved to) | absent | scored | build | requirement | disputed cl. | κ / raw / AC1 (n) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| s1-01 | 2 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 2 | 0 | 1.00 / 1.00 / 1.00 (2) |
| s1-02 | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 1.00 / 1.00 / 1.00 (1) |
| s1-03 | 23 | 2 | 0 | 5 → 10 kept | 0 | 0 | 0 | 0 | 0 | 26 | 26 | 9 | 16 | 1 | 0.92 / 0.95 / 0.93 (21) |
| s1-04 | 23 | 0 | 0 | 6 → 12 kept | 0 | 0 | 0 | 0 | 0 | 29 | 29 | 4 | 22 | 3 | 0.85 / 0.91 / 0.88 (23) |
| s1-05 | 3 | 0 | 0 | 1 → 2 kept | 4 | 0 | 0 | 0 | 0 | 0 | 4 | 1 | 3 | 0 | 1.00 / 1.00 / 1.00 (3) |
| s1-06 | 3 | 0 | 0 | 1 → 2 kept | 3 | 0 | 1 | 0 | 0 | 0 | 3 | 1 | 2 | 0 | 1.00 / 1.00 / 1.00 (2) |
| s1-07 | 4 | 1 | 0 | 1 → 2 kept | 3 | 1 | 0 | 0 | 0 | 0 | 3 | 2 | 1 | 0 | 1.00 / 1.00 / 1.00 (2) |
| s1-09 | 4 | 0 | 0 | 2 → 4 kept | 4 | 2 | 0 | 0 | 0 | 0 | 4 | 4 | 0 | 0 | 1.00 / 1.00 / 1.00 (4) |
| s2-01 | 10 | 0 | 0 | 0 | 6 | 0 | 0 | 0 | 0 | 4 | 10 | 3 | 7 | 0 | 1.00 / 1.00 / 1.00 (10) |
| s2-02 | 2 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 1.00 / 1.00 / 1.00 (1) |
| s2-03 | 1 | 0 | 0 | 1 → 2 kept | 1 | 1 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 1.00 / 1.00 / 1.00 (1) |
| s2-05 | 2 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 2 | 1 | 1 | 0 | 1.00 / 1.00 / 1.00 (2) |
| s2-07 | 13 | 4 | 0 | 0 | 1 | 0 | 2 | 0 | 0 | 6 | 7 | 5 | 2 | 0 | 1.00 / 1.00 / 1.00 (7) |
| s2-08 | 2 | 0 | 0 | 1 → 2 kept | 3 | 0 | 0 | 0 | 0 | 0 | 3 | 1 | 2 | 0 | 1.00 / 1.00 / 1.00 (2) |
| s2-09 | 89 | 72 | 0 | 2 → 0 kept, 2 restored, 4 dropped | 7 | 0 | 0 | 0 | 0 | 10 | 17 | 2 | 14 | 1 | 0.86 / 0.94 / 0.93 (17) |
| s2-10 | 8 | 3 | 0 | 1 → 2 kept | 1 | 0 | 0 | 0 | 0 | 5 | 6 | 2 | 4 | 0 | 1.00 / 1.00 / 1.00 (5) |
| s3-01 | 6 | 0 | 0 | 1 → 0 kept, 1 restored, 2 dropped | 4 | 0 | 0 | 0 | 0 | 2 | 6 | 0 | 6 | 0 | 1.00 / 1.00 / 1.00 (6) |
| s3-02 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 5 | 5 | 0 | 0 | 1.00 / 1.00 / 1.00 (5) |
| s3-03 | 3 | 0 | 0 | 0 | 1 | 2 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 1.00 / 1.00 / 1.00 (1) |
| s3-04 | 2 | 0 | 0 | 1 → 2 kept | 2 | 1 | 0 | 0 | 0 | 0 | 2 | 2 | 0 | 0 | 1.00 / 1.00 / 1.00 (2) |
| s3-05 | 8 | 0 | 0 | 1 → 2 kept | 8 | 0 | 0 | 0 | 0 | 1 | 9 | 2 | 6 | 1 | 0.74 / 0.88 / 0.84 (8) |
| s3-06 | 13 | 0 | 0 | 5 → 0 kept, 5 restored, 10 dropped | 2 | 0 | 0 | 0 | 0 | 11 | 13 | 4 | 7 | 2 | 0.76 / 0.85 / 0.77 (13) |
| s3-07 | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 1.00 / 1.00 / 1.00 (1) |
| s3-08 | 5 | 0 | 0 | 0 | 3 | 2 | 0 | 0 | 0 | 0 | 3 | 2 | 0 | 1 | 0.40 / 0.67 / 0.56 (3) |
| **total** | 233 | 83 | 0 | 29 → 42 kept, 8 restored, 16 dropped | 59 | 9 | 3 | 0 | 0 | 100 | 159 | 55 | 95 | 9 | pooled 0.91 / 0.94 / 0.92 (142) |

- External validation has no `--base` (ruling 10), so the `pre-existing` bucket does not apply. A failed precondition on the known-bad version reads `absent-at-base`.
- Every kept external task has at least 1 scored check (rule (a) of ruling 13 for external tasks).
- Of the 29 split originals, 21 stand (42 new checks kept). The other 8 were restored as `requirement` and graded again on their own: s2-09 valid 1 and absent-at-base 1, s3-01 valid 1, s3-06 absent-at-base 4 and valid 1. Their 16 new checks were dropped.

### Per set

| set | kept tasks | classified | checks with an interface (live) | scored | build | requirement | disputed | pooled κ / raw / AC1 | n | usable | median `build` per task |
|---|---|---|---|---|---|---|---|---|---|---|---|
| task-repo | 14 | 11 | 167 | 120 | 5 | 104 | 11 | 0.73 / 0.92 / 0.91 | 119 | yes | 0 |
| external | 24 | 24 | 171 | 159 | 55 | 95 | 9 | 0.91 / 0.94 / 0.92 | 142 | yes | 2 |

- The pooled agreement (`queue`) is taken over the first classification round of each task: n = 119 and 142. **scored**, **build**, **requirement** and **disputed** also count the split rounds' new checks and the restored originals, which gives 120 and 159. The numbers are not expected to match.
- Every labelled check has a scored verdict: build + requirement = 259, of which 61 are valid and 198 are absent-at-base. The 20 disputed checks bring the total to the 279 scored checks.
- **Median scored traceable (`build`) checks per task, for step 6's H1 floor rule.**
  - Task-repo: 0, over the 14 kept tasks. The sorted values are twelve 0s, then 1 and 4. The median over the 11 classified tasks is also 0.
  - External: 2, over the 24 kept tasks. The sorted values are 0, 0, then 1 nine times, 2 six times, 3, 4, 4, 4, 5, 5 and 9.
  - The 11 and 9 disputed classifications may raise either median after step 9.

## Rule (b) for the real-estate tasks (ruling 13: at least 3 scored checks owned by the task)

Rule (b) is counted now over the agreed sources, and counted again after step 9.

- **Met now (9 tasks):**
  - p1 10. That is 1 check of its own and 9 moved in from p6c 1, p8a 3, p8c 1 and p8e 4.
  - p2 39, p3 13, p4 20, p6a 11, p8a 5, p8c 7, p8d 5 and p8e 6.
- **Not met now (5 tasks):** p5 0, p7b 0, p7c 0, p6b 2 and p6c 2.
- **Disputed source pairs waiting for step 9 (12):** p1 6, p2 2, p3 1, p4 1, p6c 1 and p8a 1. A pair the human calls `fix` is rewritten and validated in a second batch with the same tools. Of the five tasks below the rule, only p6c has a disputed pair waiting (1). p5, p6b, p7b and p7c have none.

## Drops and replacements

- **p8b1** was `dropped needs outside data` (ruling 8, checked before any label was spent). At 3e630e8, `src/seed/showcase.ts:13` reads `SHOWCASE_DIR` with no default, and the repo holds no `showcase/` folder. p8b is out of scope (trial-only, ruling 1). 14 real-estate tasks remain.
- **s2-06** (OpenWhispr/openwhispr#2643) was `dropped not servable`. Its 3 serve rounds each failed the base build at a layer step that fetches or verifies the app's desktop runtime. These were recipe mistakes, not network or disk failures. **Replacement:** s2-09, kizuna-ai-lab/sokuji#361 (rank 14). `walk s2 --remove-out` checked 1 candidate. s2-09 was servable in 1 round.
- **s1-08** (Open-Source-Legal/OpenContracts#2371) was `dropped no valid check`. After the writer rerun it had 5 entries, all `interface: none`. **Replacement:** s1-09, we-promise/sure#4246 (rank 13). `walk s1 --remove-out` checked 2 candidates; fossasia/eventyay#4768 was out with no fail-to-pass test. s1-09 was servable in 1 round. Its 4 entries were all `valid` at their first validation; its table row shows them after the split. Its first writer run was killed when its premature start was stopped. The record of that run was discarded (its usage was kept), and the oracle comes from a clean run.
- **s2-04** (coder/xum#5191) was `dropped no valid check`. After the writer rerun it had 10 entries, all `interface: none`. **Replacement:** s2-10, coder/xum#6616 (rank 8). `walk s2 --remove-out` checked 2 candidates; coder/xum#7086 was out with no fail-to-pass test. s2-10 reused the repo's serve recipe (rounds=0). It has 8 entries, 3 of them `interface: none`.
- Each retired id keeps its folder and its hashes below. Kept per stack: s1 8, s2 8, s3 8. No task was `dropped out of memory`, and no external task was `not judged`.

## Cold-setup repos and canary tasks

- **Cold-setup repos** (ruling 13 and `coldSetup`, read over the kept tasks; `cold_setup yes` in `sample.tsv`):
  - s1: we-promise/sure (s1-09). It was paperless-ngx at step 4.
  - s2: kizuna-ai-lab/sokuji (s2-09). It was super-productivity at step 4.
  - s3: pola-rs/polars (s3-07 and s3-08), unchanged.
- **Canary** (7.3; ruling 2: the first 2 kept tasks per stack, in sort order):
  - s1-01 and s1-02
  - s2-01 and s2-02
  - s3-01 and s3-02
- The sort order is the walk rank. s2-10 has rank 8, so it sits between s2-05 (rank 6) and s2-07 (rank 12) although its id is the last of the stack. This does not change the first 2 of any stack.

## Step 9 queue (`<data>/step9/`, ruling 16)

| file | rows (lines without the header) | content |
|---|---|---|
| `labels.tsv` | 12 | disputed source pairs |
| `classify.tsv` | 20 | disputed classifications: task-repo 11, external 9 |
| `sample-7.1.tsv` | 40 | scored checks for the 7.1 read: task-repo 10, s1 10, s2 10, s3 10 |
| `sample-7.2.tsv` | 40 | agreed `traceable` / `not traceable` labels for the 7.2 re-rating: 20 per set |
| `inputs.tsv` | 4 | inputs for the section 5 read: 2 per set |

## Rulings during the build

The controller's rulings, in the order they were made, as recorded in the SDD ledger (copied into `progress/progress.md` before the final review). Each line gives the decision and its reason.

1. The user's "Duyệt" of 2026-11-03 approves the plan as written, including both proposals: remove step 5's own Docker images and containers by their recorded names as soon as the step that built them ends, with `docker builder prune -f` below the floor; and leave label disagreements for step 9. Both were in the plan under "Decided by the user", and the user approved without amending them.
2. Task 4 implements the shared removal helper (exact recorded names, never `-f`, digests kept), and Task 5 adds `ext remove <task>` over it. Task 4's serve already needed removal.
3. Task 4's interpretations were accepted:
   - digests in `docker.json`
   - a stale `serve.json` is not offered as a start
   - a builder prune inside serve, then exit 3 if the disk is still low
   - `input.md` without a trailing newline
   - out of memory ends the rounds
   - a walk row `dropped`
   - rounds counted per repo
   - a failure only at the end is told without its log
   - the network test reads the interface list

   Each matches the rulings or is additive.
4. `env/<task>.json` held the absolute bench path of the checkout that ran `task-env`, and it is rewritten for the main checkout at the lock. Env files are data and can be regenerated.
5. A run with no JUnit (timeout, out of memory, kill) makes `grade` throw. Recording `error` per check, with the stage, is the job of `oracle.mjs validate`, as the plan's Task 9 says.
6. Facts carried into the writer brief: the runner's `run` executes in `/work`; the grade image builds FROM the serve image with an empty context, so `runner.json` `layer` can only use RUN; graded external runs always use `--sealed`. This follows from `oracle-run`'s design.
7. Carried to step 7: `oracle-run` builds `git archive HEAD`, so a seeded bug must be a commit.
8. The 30-minute container bound is kept inside the container, by a timer in the grade script, rather than by changing the signal `grade` sends. It is the smallest change, and `proc.mjs` stays untouched.
9. Parked: removing every name in `docker.json` can kill a concurrent run of the same task. The plan runs one task at a time on Docker.
10. Task 7 (real-estate sources) ran in parallel with Task 6 in its own worktree. Task 6 used Docker and Task 7 did not.
11. The label brief was amended after 7 runs that had labelled from the commit subjects. Those runs were voided unread (`sources/superseded/`), and every kept label comes from the amended brief. This fixes the instrument independently of any label content.
12. A labeller run with fewer `git show` calls than its distinct commits is rerun once (same brief, new name). The trigger does not depend on the labels. Ruling 6.1 asks the labeller to read the diff.
13. The labellers keep Bash, confined by `label-settings.json` to `git show` and `git log -1` with a sandbox. Ruling 7 names those commands.
14. There is no second rerun, and the reading measure is not changed after the reruns. A range form such as `a..b` counts as under-reading. Changing the measure after seeing its effect would be tuning, so the 15 under-reading runs stand.
15. The leak check counts 8 or more hex characters of the fix commit's hash, or the origin test's path. Every check id carries the sha7.
16. When a commit has both an in-task pair and a later pair, a hunk the later pair lists belongs to the later pair's task. This matches the `bugs.mjs` owner rule, ruling 6's source.
17. A writer run whose manifest is empty is rerun once (same brief, new output), and the second result stands. The trigger is content-independent.
18. The real-estate writer brief does not name the grading database. A database name adds nothing to a sealed brief.
19. The writer rerun trigger also covers a manifest that is all `interface: none` (one rerun, and the second result stands). The trigger depends only on the manifest's shape, and it counters shallow reading.
20. A validation `error` verdict is unscored (added to `UNSCORED`). An error check must not count as scored.
21. Each round runs one fixer per (task, fix commit) group and one comparer per changed check. An external `runner.json` change goes through the comparer as one item. This follows ruling 11's per-pass batching.
22. s2's cold-setup repo moved from super-productivity (s2-08) to kizuna-ai-lab/sokuji (s2-09). Ruling 2 reads it over the kept tasks.
23. The sheet tool deletes every name it cannot find verbatim in the end commit's files. After review this was narrowed to non-test files. This enforces the brief's own rule, "a name you cannot find in the code is left out".
24. The sheet agent sees the end tree, including the PR's tests, as the step 3a sheets did. This is recorded as a known limit and not changed.
25. A `##` heading that `input-check` flags becomes `## Unnamed section <n>`, and its bullets are kept and checked. The heading only groups the names, and deleting the section cost s3-01 most of its names.
26. The classifiers see only scored checks. Unscored checks never enter a score.
27. Real-estate `classify` and `split` take `<task.json> <task>`, and `queue` names the sets `task-repo` and `external`, because `bench/` names no customer.
28. The 7.1 human sample draws from scored checks (`valid` or `absent-at-base`). Both are kept and scored under 7.1.
29. The 7.2 sample takes only ids to which both raters gave the same label (`traceable` or `not traceable`), never a bucket a rule assigned. 7.2 re-rates agreed classifications.
30. A real-estate task whose base commit has no app manifest gets `precondition` as the base result of every check (stage `no app at base`). Nothing the task builds can exist where no app exists. This applies to p1's base, 691a723.
31. Task 9's agent runs s1's replacement loop (walk, sample, `task-env --from-meta`, serve, write, validate) after its external lane frees Docker. The same was later approved for s2's loop. The replacements' sheets and classifications come from the Task 10 and Task 11 tools. This keeps one Docker user at a time.
32. Approved: `env/s2-03.json` moved from port 49162, which a host program held, to 49190.
33. When a build or run fails with a disk-full signature, `docker builder prune -f` is run by hand between tasks, whatever the estimate says, and the errored tasks are rerun. The estimate misses the VM's allocation. It freed 20.81 GB.
34. The no-app rule also applies to the sweep's boundaries. It was applied to the saved sweep results without regrading, since it depends on the file's absence, not on a run. As a result, 9 checks moved to p1 instead of none.
35. Rule (b) is counted at the lock (ruling 13). p5, p7b and p7c (0 scored) and p6b and p6c (2 each) are recorded as below it, to be counted again after step 9.
36. Before a Docker batch, `docker builder prune -f` is run when the build cache exceeds 15 GB, because the disk estimate misses ENOSPC.
37. An external task with no scored check but some `error` checks is `not judged` (rerun), not dropped. A machine failure is never an out. No such task occurred.
38. Parked: a check moved by the sweep gets no fixer round at its receiver (1 broken check in p2). Ruling 12 asks only for a partial revalidation of the receivers.
39. s1's cold-setup repo moved from paperless-ngx (s1-06) to we-promise/sure (s1-09), by ruling 13 read over the kept tasks.
40. Rater reading gate: a classifier run that did not open every file in its folder is rerun once, and the rerun's labels stand. This is the same content-independent gate as the labellers'. 10 reruns were made, and 6 still read only part of their folder.
41. Tasks whose check files Task 9's fix round restores are classified again before split. The recheck restored 0 files, so no task needed it.
42. A split original none of whose new checks is scored is restored as `requirement`, and its new checks are dropped (`split gave no scored half`). This follows prereg 6.3: "if not [splittable], it goes to the requirement bucket".
43. Further rules for split checks:
    - Split's new checks get ruling 11's fixer rounds under their own labels (`fix-split-<round>`).
    - Split validation was rerun for p3, p6c, s1-03, s1-04, s1-06, s3-01 and s3-06.
    - The restore rule was applied again, and each restored original was graded again so that it carries a verdict.
    - An original whose new checks include an `error` or unverdicted one is not judged.

    Rulings 11 and 15 apply to split checks, and ruling 13 needs a verdict to score.
44. Before the lock, every external `env/<task>.json` `oracle` points at the main checkout's `bench/ext.mjs`, because the worktree path dies with the worktree. Grading therefore needs the merge first.

## Incidents

- **Task 5, fix round 1.** A probe `docker run` used `-v /dev/null:/x`, a forbidden flag. It failed and created nothing, and it is not in code or tests. The implementer's hung probe container `bench-ext-t5probe` was removed by that exact name.
- **Task 9.** A process listing printed the opening lines of s1-09's writer prompt. They were the brief's text only, with no task or oracle content.
- **Task 11.** The agent shell's 2-hour limit stopped the real-estate split lane at 17:38Z on 2026-11-04, while `validate` graded p2. It left the grade worktree `/tmp/hstack-bench/re-grade-090f6f2` and the databases `bench_re` and `bench_re_test`.
  - The worktree was removed (`git worktree remove --force`, then `prune`), and the task's `teardown.sh` dropped both databases.
  - pgsnap was then equal again (`postgres real_estate real_estate_hstack real_estate_hstack_test template0 template1`), and the lane restarted detached.

## Checks at the lock

- **Oracle, validations and classifications.**
  - Every kept task has `oracle/manifest.json` and at least one `validation-*.json`.
  - Every kept task with a scored check has `classify-1.json`, `classify-2.json`, `labels.json` and `agreement.json`: 11 real-estate tasks and 24 external tasks.
  - p5, p7b and p7c have no scored check and were skipped by `classify`, so they have none of the four.
- **Env files.** A script (`<data>/logs/task12/env-oracle.mjs`) rewrote the `oracle` field of the 27 external `<data>/env/s*.json` files (24 kept and 3 retired) to `bun /Users/hbchuc/Documents/programing/vibe-code/hstack/bench/ext.mjs oracle-run <task>`.
  - It asserted that every other field is unchanged: `changed 27, already main 0`.
  - s2-03 keeps port 49190.
  - Grading through these files needs the branch merged into the main checkout first.
- **Tools.** `bench/` is at `eba44d16eb6700d7d50e2e8cb37b63a8a4799cec` (`git rev-parse HEAD` before this lock's commit), and `git status --short bench` is empty. `git grep` finds no merge-conflict marker in the tree.
- **Docker left** (the two listings only, with no other Docker command):
  - `docker ps -a --filter name=bench-ext- --format '{{.Names}}'` lists 328 containers: 327 `bench-ext-fx*` fixtures of the gated tests and the decoy `bench-ext-other`.
  - `docker images 'bench-ext/*' --format '{{.Repository}}:{{.Tag}}'` lists 162 images: 161 `bench-ext/fx*__app__1` fixture images and `bench-ext/probe:net`.
  - No `-serve` or `-grade` name of step 5 is left; every one was removed by its recorded name.
  - The fixture counts differ from step 4's lock (190 and 98) and from Task 6's all-container count. Gated test runs since then made the extra fixtures. They are not step 5 candidates.

## Open points

- Some external tasks share a dummy port: s1-08 and s1-09 hold 49159, and s2-08, s2-09 and s2-10 hold 49167. This is harmless while one task grades at a time. Step 7 or step 8 must not grade them in parallel without moving the ports. Nothing was changed here.
- In the real-estate oracles, 116 of the 120 scored checks score through `absent-at-base`, and only 5 are `build`. In the external oracles, 100 of 159 score through `absent-at-base`.
- Unscored checks stay in the oracles: 10 real-estate and 3 external `broken` checks (mechanics not fixed, or the fix was refused by the comparer), and 35 real-estate and 9 external `weak` checks.

## Known limits

- The serve recipe is written from the base's files. A product that changes how it starts (a new service, a new setting) can fail to serve at a later commit, which reads as `error` for every check of that run.
- Desktop checks drive a window under a virtual display in a Linux container. An app whose behaviour differs on macOS or Windows is checked only on Linux.
- A library check is a separate test target. A crate or package whose public API cannot be compiled offline in the image falls to `interface: none`.
- The comparer guards mechanics fixes with one agent's judgement. The human 7.1 sample is the second guard.
- Real-estate grades at old commits run that commit's own setup. A commit whose setup no longer runs on this machine makes its checks `broken`.
- Pairs disputed by the labellers are rewritten only after step 9, so rule (b) counts at this lock are lower bounds.
- External input is the issue as written, links and screenshots included. A builder with no network cannot open them.
- Some agents under-read, and their labels stand:
  - 15 of the 28 source-labeller reruns did not show every listed commit.
  - 6 of the 10 classifier gate reruns still did not open every file in their folder.

  The step 9 human read of the disagreements is the backstop.
- The sheet tool tells test files from source files by path only. A test module inside a source file (Rust, for example) counts as source for the verbatim name check.
- The sheet agent sees the end tree, including the PR's tests (ruling 24 above). A sheet name may therefore come from a test file.
- The tool's disk estimate (the disk limit minus `docker system df`) missed ENOSPC. Builds failed while it read about 34 GB free. Pruning by hand (rulings 33 and 36) covered it.
- `write` reads a task's serve verdict from the serve driver's log, `ext/step5-logs/serve.tsv`. s1-09's line was appended by hand.

## Hashes

`shasum -a 256` of 1367 files. Paths are relative to `<data>`, except `progress/step5/*`, and are sorted bytewise.

- **Oracle folders, 498 files.** Every file under `<task>/oracle/` (`node_modules` skipped) of the 14 kept real-estate tasks, the 24 kept external tasks, and the retired s1-08 and s2-04. s2-06 and p8b1 have no oracle.
- **Per-task records.**
  - `labels.json`, `agreement.json` and `moves.json`: 78 files.
  - `validation-*.json`: 100 files.
  - `classify-*.json` (the label files, not their replies): 106 files.
  - `input.md` and `interface.md`: 83 files, including p8b1's two and the retired tasks' files.
- **Settings files** of every sealed writer, fixer, comparer, classifier and splitter in step 5: 186 in the task `work/` folders, 60 in `re-work/settings/`, plus `briefs/label-settings.json`.
- **Sources and step 9.**
  - `sources/`, except `logs/`: 160 files. These are the labeller replies, run records and prompts, `pairs.tsv`, `labels.tsv`, the driver, and the superseded v1 runs.
  - `step9/`: 5 files.
- **Briefs.** `briefs/{classify,compare,fix,label,oracle-re,split}.md` and `briefs/oracle-re.json`; `ext/briefs/{interface,oracle,serve}.md`.
- **Step 5 records.**
  - `ext/step5.json` and `ext/step5-recipes.tsv`.
  - `ext/serve/*/serve.json`: 20 repos.
  - `ext/tasks/*/task-recipe.json`: 27 tasks.
  - `env/s*.json`: 27 files, after the rewrite above.
  - `oracle-scaffold/{playwright.config.ts,package.json}`.
  - `progress/step5/sample.tsv` and `progress/step5/walk.tsv`.

```text
b0939b893d598f7d85b76cd04fb9328ae64a233d9537a12c64d9223f53b49f8f  briefs/classify.md
add83e3b0322eb4d8ea693c17de596849b36d1ab6b080ae8f6c2a564a957100e  briefs/compare.md
ee179a7b1799151a74038f003e7bc67f95f1b14011dc6b45064b74d0e22d5007  briefs/fix.md
fc6e1906b3ebaa60599ad271787bc4a2425c64bd9adae9fe09f32e6a6c9fdba2  briefs/label-settings.json
80bf5ae4c46eed0626476fd293817b674c1376be11d9b0da86eacd5fdcfb3618  briefs/label.md
e060dc78552fc706522f7c5a6fe4d6cb715e6517063118e863920e15a80b4689  briefs/oracle-re.json
42045022d21e90adde4e0cdb78aaa8a17f0a6717a488cba8c37c96a21978f895  briefs/oracle-re.md
262e30422777dee7da8ed20224490b15b418cf916376d2dd34d563c34c7d5659  briefs/split.md
438bb6d0b7956a1b72881c69a9147a4b6052ee1a46c492fa23f2fd4610db3bc4  env/s1-01.json
a88eb11a4d3fc02ce8fa41ffbef174b765266cff7a67b0606356948d596e1f9e  env/s1-02.json
917f692ecf654623a8063857e1d30dcd9ac543db5463e5cdcc27c0e000b2e1bc  env/s1-03.json
f9c4a7c6770a0952b134d46fcd3635c000f06f715e2f13131773fd19940f0d21  env/s1-04.json
9d029670fca25398fa53edcb0b73352d271c103bc8403a89796b768976e88af2  env/s1-05.json
ee53118335df5ada057fe9ebb36cd825d5cede49a04e56aaad56b44742502912  env/s1-06.json
13c419b45ec51b88468ada3852e55c831cdb16e92211d11f592d03070f2e259d  env/s1-07.json
e6e226a909efaa2d15df1925bb2652bc0b4f06bdfeb1d5b7bbddebac6117bded  env/s1-08.json
0332a371f16c0ecee15f774142783159e3069f7f7b0fd706bfee8658a478765d  env/s1-09.json
ff920efa01aa29b597adbed901276884399bc8fff3b91330c255e670aa34b6cd  env/s2-01.json
77166cf060ed0cc462029c1259f00c4b78dc82ed84911a449d4a30852e39873b  env/s2-02.json
6e9d5f40d98a6aee17ad4e79618e6fcf5a70affdcb2420b6f4e13583992ac24b  env/s2-03.json
4f094423f3b050d81a2c96ac404e2156ab4557a51ccb075f64e3a9c5fbd1acab  env/s2-04.json
f8b6a3f5e87f5f7d0b31b2360c46251ef5f7343a9f66743e10e67368b69e5d33  env/s2-05.json
3bd756b2c702b06b1343ba5e6f853f0aa208b4684ae204d03e00384a303029e1  env/s2-06.json
e4121c487e9ecd0c9a6a6c163c7123e215a1a8e1f64558738369e3339554b3b8  env/s2-07.json
0e12952d0c527071fb6ff6a14a49207212af6cd63482bdf0a7dbe0a8957c53ed  env/s2-08.json
b9a883f5d58f58bf42fb56982611eefbdcdd307210dce7802e78b21264323d9a  env/s2-09.json
7e7b672ffad86526cebb1438df2a88612a3d2329665567ceb34aba185e3ca263  env/s2-10.json
8c168b59aba1bbfe0089c6195aad317f92a64d9e6616aa2b03fbf4d30685574b  env/s3-01.json
8567842a8a76ece5b3aed300d9d5af18d3dca9ad2dad2e089c9e65cb4e6642d4  env/s3-02.json
d947d4793d755ef615861e4cc9638c27e21ce9d1ca5391ed03c20bbddbd56db7  env/s3-03.json
95d6a7da7a78cdf86f0d3a9052bc540dbb26735196bfa4adc4ca43a6b7499f71  env/s3-04.json
8592f5ab6a9db17edc719f7e4afd6691dfe8ea865f9a71830cd7784eca8ae569  env/s3-05.json
4cdb3fdddca39dbcaa5f580203c585e032012511d510625792ea7b10e6c7d40a  env/s3-06.json
242678e564bfd16f0f51a7f57ef1306cee0d454c9ece2bbd046f6c6d69436e56  env/s3-07.json
ec477ff761c868f0cff84b0c8f7763713635a9145e1268e1f4b197898fee6f78  env/s3-08.json
996c00dcf8768febf01b40925850b088e6afb359e26ccb8d68718a1eb32c9800  ext/briefs/interface.md
7c199777538c03a3eb1b0f2f7c7c7be143750edae57d71b0b4bee9541c2319d8  ext/briefs/oracle.md
830c0027f501bea83cda32a0347ab3e4bde4d42e9c97af8acb8b506d88ed5769  ext/briefs/serve.md
1c4449ba63761fd970e5083df9bb6bf1507370d7ce177da5c4edd523bea3bbe3  ext/serve/chakra-ui__panda/serve.json
d7c60d7adbc58e067a42e9ac5123ec6cec0555334f4b67c3fd60377fa3dbd1c0  ext/serve/cherryhq__cherry-studio/serve.json
693177234abe6e23090272c089110431f3d268c292f35df95b08117311c71b3c  ext/serve/coder__xum/serve.json
ad47665c964a41c1a18d6d94dc42347fe4dc48e5e1e22350da8ef70729d06d2e  ext/serve/django-commons__django-debug-toolbar/serve.json
49b13831b1fe8d5d6812238775cce95bd3ee67e0e9884c45a8ce04d67d698b57  ext/serve/fossasia__eventyay/serve.json
43cb59770dad7d8ed7dde3a1885121b60f5d76c0840e6c472c72c47a34d043b5  ext/serve/ismaelmartinez__teams-for-linux/serve.json
386a61f2e96987977ccdb74200631d8e681947b6d2b53bdbed660dc505fe5b83  ext/serve/kizuna-ai-lab__sokuji/serve.json
1c4449ba63761fd970e5083df9bb6bf1507370d7ce177da5c4edd523bea3bbe3  ext/serve/lancedb__lancedb/serve.json
1c4449ba63761fd970e5083df9bb6bf1507370d7ce177da5c4edd523bea3bbe3  ext/serve/nautechsystems__nautilus_trader/serve.json
f15084ec290f34eb416716206833348673e6480d09b1d1e10cc056c7d3e287c0  ext/serve/netbox-community__netbox/serve.json
f8592154f6c6d364b4b78e71e510f2651b6cc3ea272fbedc0ef5668eee8d3a18  ext/serve/open-source-legal__opencontracts/serve.json
f6a81f75a5e4ed01e57fafedd245b505c677722620f2906b498d66e881781436  ext/serve/openfoodfoundation__openfoodnetwork/serve.json
fc1bc9d9cb6037772895797945c716bec3f61788dbc3db03739b13caf2bb84f5  ext/serve/paperless-ngx__paperless-ngx/serve.json
1c4449ba63761fd970e5083df9bb6bf1507370d7ce177da5c4edd523bea3bbe3  ext/serve/pola-rs__polars/serve.json
c221e50150baa241efbc630e166010ac5b30ee712fc8c79f67662dc7266dc31c  ext/serve/runmaestro__maestro/serve.json
1c4449ba63761fd970e5083df9bb6bf1507370d7ce177da5c4edd523bea3bbe3  ext/serve/rust-lang__cargo/serve.json
0bc90f324b8eb12f1d283eb8cc28dc72f879144f49b88faa0cb8b785c1230889  ext/serve/super-productivity__super-productivity/serve.json
1c4449ba63761fd970e5083df9bb6bf1507370d7ce177da5c4edd523bea3bbe3  ext/serve/tokio-rs__toasty/serve.json
1c4449ba63761fd970e5083df9bb6bf1507370d7ce177da5c4edd523bea3bbe3  ext/serve/voidzero-dev__vite-plus/serve.json
866bcf75ece0d1a6b0ab6637df5327f6709a95c473f402c9cd2d748a379f8805  ext/serve/we-promise__sure/serve.json
7a9408f3dd1571bb4a2a80229c660e7f62013b483e1d958c5fb4207395f32c2b  ext/step5-recipes.tsv
8b90a94143a654cae5101f0d05f3c02203b394a8bba2c8446abd9ed5f5262227  ext/step5.json
416ea73d6072ba26ec4132dbf05c7daa12a9952ecb4b5d8fb5d239d4f56674ac  ext/tasks/chakra-ui__panda__3925/task-recipe.json
4ac60d29a730b527db79ec068ecaa311024319215e87e46d8482c64ef5d0fac6  ext/tasks/cherryhq__cherry-studio__18688/task-recipe.json
4ac60d29a730b527db79ec068ecaa311024319215e87e46d8482c64ef5d0fac6  ext/tasks/cherryhq__cherry-studio__19874/task-recipe.json
7c7ec14f3f7b75a3d4430e733db6ccd1c5c0385295d94a51a42f7f1c49209dcb  ext/tasks/coder__xum__5191/task-recipe.json
7c7ec14f3f7b75a3d4430e733db6ccd1c5c0385295d94a51a42f7f1c49209dcb  ext/tasks/coder__xum__6616/task-recipe.json
9e82d81152fe7306c9f8e63c1ec12d807eeea0102049661204248645067aaf98  ext/tasks/coder__xum__7059/task-recipe.json
8f4ad72e7cbb4b60bed201a17e661e92aed213a28b5a7b175405ba2c033030b5  ext/tasks/django-commons__django-debug-toolbar__2502/task-recipe.json
7fdc38f2473f155b6b7fb65107558f5b7fd3cfc19ac1e6d3c4b710ec5f2e0768  ext/tasks/fossasia__eventyay__4689/task-recipe.json
ca5fc87827a2b47c2fd663714d02e89af9f025a030d3707e105ac8581120f583  ext/tasks/ismaelmartinez__teams-for-linux__2778/task-recipe.json
87a6266cdf03d14cff37a126cbf2c8ef4b93ee3bfc23ab16b83144216939839f  ext/tasks/kizuna-ai-lab__sokuji__361/task-recipe.json
44e403eb0cc3c102ec20797f62848926f8c92c1af4c842f1e2d4581dac09a276  ext/tasks/lancedb__lancedb__4486/task-recipe.json
1070feeb2b524fbf77a7e4adcadc43602eb05480733d1d4a2fbc3508a17d3309  ext/tasks/nautechsystems__nautilus_trader__4813/task-recipe.json
8cbba69e0bd1708a0f5dadb1fd1a0fc7da7124608f6f397e4d4eaf15584787fd  ext/tasks/netbox-community__netbox__23175/task-recipe.json
8cbba69e0bd1708a0f5dadb1fd1a0fc7da7124608f6f397e4d4eaf15584787fd  ext/tasks/netbox-community__netbox__23277/task-recipe.json
402d28b7789c175bde904b25359fc6b0345fa2591a72759ca949016ad84b57c0  ext/tasks/open-source-legal__opencontracts__2124/task-recipe.json
402d28b7789c175bde904b25359fc6b0345fa2591a72759ca949016ad84b57c0  ext/tasks/open-source-legal__opencontracts__2371/task-recipe.json
1b678eb130dd90dae181ca41dee7471c847ae735e5f48c32720e200d4e331daa  ext/tasks/openfoodfoundation__openfoodnetwork__14719/task-recipe.json
7d1d447deb0a104f41e07042ef2622935ad300a6f4965e21d02162ea652ea4c5  ext/tasks/openwhispr__openwhispr__2643/task-recipe.json
4d2f4ac2118ae542c65c9acc5ce1282ce81d5dce2aabd49d9729fc82cc3be882  ext/tasks/paperless-ngx__paperless-ngx__13486/task-recipe.json
b44971d86f51faded56f97014e47bde9605a9169cb6a7c32f5de1a77b15c29b3  ext/tasks/pola-rs__polars__29923/task-recipe.json
b44971d86f51faded56f97014e47bde9605a9169cb6a7c32f5de1a77b15c29b3  ext/tasks/pola-rs__polars__30060/task-recipe.json
abcde27a4ee0860169b4d0f8969bc769263d35bf2c980443819378002dedf0d6  ext/tasks/runmaestro__maestro__1783/task-recipe.json
2fc90ea1633d80fa305c9c914ac33d0d6c19b5f7d6856a0ec104f65eb3d6e2c6  ext/tasks/rust-lang__cargo__17562/task-recipe.json
cf6d4d3ed100ea9fdca102d4047285c72846aed8357916bb60fa0309daf977f9  ext/tasks/super-productivity__super-productivity__11313/task-recipe.json
0bdc00f52c680b24b4c7a4cd2c8bc94dd8e362d00e3892ec2fb931d4da08a716  ext/tasks/tokio-rs__toasty__1238/task-recipe.json
4d7715f499e3d27ca13679beb36bf95e01fa81ae2d09f93856d184a1c80c4040  ext/tasks/voidzero-dev__vite-plus__2667/task-recipe.json
38d0dac0d4bd1e7d7764646aae090cc86d6c3c1a8ad41994b10e099dd0f9d4f4  ext/tasks/we-promise__sure__4246/task-recipe.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  oracle-scaffold/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  oracle-scaffold/playwright.config.ts
d3717551aa4b1cd0ffcea657c232fd0d5a82f0cc8206cb3bcc4bbba4f4956df4  p1/agreement.json
ba310e14f5bcdf451093f2ce55cdb0e52cff24377ba3581fea8e0f588d16c1ca  p1/classify-1.json
5e99522fc3039cc3f430a9daac961c961136881e8fd96b833b554b711791c665  p1/classify-2.json
2d29c1b03c4b66b266eaace5310d5463086e1784f83d2ded76b97d78a0590a46  p1/input.md
a80bddef7af3b796bb6263f97053af7000551d8a92ea5fc61610547eee5febf2  p1/interface.md
bb0121d2ccb6a48de7ce8b0575dc71f0412735f59ccecfcd77f0b51418250b08  p1/labels.json
5403fdce2aecdbb2980b617d94f2f7cfe5aaa1d7f8e83ac696789d8efe0b6460  p1/oracle/134138f-T8.spec.ts
7d02a37ed4f0ab9edb7c500cf25cd0ee5cb994d856c556a74b2919aa9b2ef0fc  p1/oracle/24c426f-T4.spec.ts
610e7af1e2c5af41cf17a601473452c4c25ff1a75255de1d37fcc915992e5bcf  p1/oracle/36d089b-T1.spec.ts
c464d32e383dc428ca06f7504d69ca038677214b9389ac4496e584271b8718c4  p1/oracle/56b368f-T5.spec.ts
51c1f49ae65e030cf5bd3242c3bc46ba932f221db900921b780ff3a413db58b5  p1/oracle/56b368f-T9.spec.ts
3306432b7fa0cc4b2afc5d61a6ebfd681c341534fca8373e1e6db3af134fb763  p1/oracle/94f26c7-T1.spec.ts
cb621184f2c21ebd840c66a69e17bf3f3b1d325b6d275361141af1f9fd683c02  p1/oracle/eb2b016-T1.spec.ts
8d2ef686474825ef3ddacc264522dfee92883e2d8d9c86b07091a45760c12332  p1/oracle/eb2b016-T10.spec.ts
d3945b546a10dee9281dd77d329f0acb9bffe05fb8362ed41f5d120d18b470a5  p1/oracle/eb2b016-T11.spec.ts
8149dd6e996845f542ae57caf1e8be34dc047811a9c51b656799c8bb4d7d43fb  p1/oracle/eb2b016-T2.spec.ts
d65316da59e6a79272c724d131a41447373418ebdd79d766b0b0831d953b5075  p1/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p1/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p1/oracle/playwright.config.ts
818c3083b1b102690d1b56fc261c0a85af63c44abbb8f899bd2fcb3eada5ab79  p1/validation-134138f.json
cda4d6e0e9c7319cf545b2fbe233956dc5b45d21ec7743a23077049813a0387e  p1/validation-24c426f.json
0567cc41a354117f21eaff790c272559b9ab04da63c346574d1e99217dc13d52  p1/validation-36d089b.json
913e031dd410418acd573fa593f941d3352be42719451e459379ba89e23becf3  p1/validation-56b368f.json
de3d88ba494ead60f5281a032de40f40a9474709aa34988db7a430a9cc2c7d36  p1/validation-94f26c7.json
d8504ba36006eda8ccc4c8f240b12ab838941d7ad561f5213af150eb1104e2f9  p1/validation-eb2b016.json
c4e04734545e686f858131f5f04a2856de8a2725a9d4e7f0f35e3ed74b707136  p1/work/classify-settings.json
d1cfa9790371dec57598389e9fbf2c56caf893ec5215addee2c234211c3ee3fe  p2/agreement.json
e5d38e2911a184d1b5c320ba755bcabb2946ee09fec99ed8ea6668fdff64912d  p2/classify-1.json
d4b7d194b630f8e1e62e4fa090869eaeab071856d5833b50743ec039a328b601  p2/classify-2.json
7b9c9d95db0cc0c71ee7ead7e339c8cf81097386e7ab99c39ebb9ce759881e31  p2/classify-split-1.json
7b9c9d95db0cc0c71ee7ead7e339c8cf81097386e7ab99c39ebb9ce759881e31  p2/classify-split-2.json
000f8aa63c9a3f28e175fd424621dbf1abd9dab588b7f0d360c36475140839e7  p2/input.md
1190f435580b57a986a2b144afc7ab5b0cab72779a9dc76f496fec2f2cf05e5b  p2/interface.md
d20500f73c3786440862f952ab225fc2ad4b7247006f857a88b4daeb042de9f5  p2/labels.json
b008a5cbbb651d4876424b706733d2c2d335bf3648d9df2f8c994ce0d3b08201  p2/oracle/0055e9b-T1.spec.ts
084a9f0bb055a88c5b94856a5da321690e50b563d05bc7854722bdfd5dda3c94  p2/oracle/0055e9b-T2.spec.ts
ff45d515d99f977e24812ae1cdac5339e0a6f9119d6bf812e3380eacf2dac0e7  p2/oracle/0055e9b-T3.spec.ts
140c27e47d8e9fd53c44784188983256e91ab0ec4002c273aaa5e2e705b53da2  p2/oracle/24c426f-T1.spec.ts
fa62a5e4d02a8f0b5ef7e91f33f81e99f69394a51c0d1b1f60863f4342f935ca  p2/oracle/24c426f-T2.spec.ts
12988ee8ab1c9c1b1c5b1483caa1a2266e2b46c31d013fe987ce11839d8b76ec  p2/oracle/4f24a01-T2.spec.ts
c3a88de07d6ae83fa8973e5e8f2343d89f5b5fd9373d2f83b2e5c8d46e7823ca  p2/oracle/4f24a01-T3.spec.ts
40a3640b8e423773d095b420cde4e030511bb0f1bf776b3e153d0710e4062ce8  p2/oracle/56b368f-T2.spec.ts
cdd7af0b3262bccacd68b8433332fb95a908b7eae64247477dbb682443cbebf0  p2/oracle/56b368f-T6.spec.ts
b41706e23a3886286e66ffbd09dbb46c1fa791d06ac49f01ef05e851d2ff0c55  p2/oracle/5eced48-T1.spec.ts
a320e0cbb138f25101923edfcdcc01ffae8b6888f76d6dc079e036bc08600be8  p2/oracle/5eced48-T2.spec.ts
28fa9b0d27e90b385ffb68e82c4c7026ef618bc2bea316853866baf3105988f4  p2/oracle/5eced48-T3.spec.ts
ab16e0bf0dfccab1385b3501cbb24b9c882929f5f05004c1932ee7f46ee28959  p2/oracle/5eced48-T4.spec.ts
0da7b83e570dc4842ac77bbdb4482d01e87bd0f5f1aef5a1754c2f4c0be01b34  p2/oracle/5eced48-T5.spec.ts
60f6b3b069ce01603e98ac538f5cd881e64ae8cdef4c38845289485d3af7f2a7  p2/oracle/5eced48-T6.spec.ts
12269eb35029b2af2a97404a20184bb0da65ee8bcc31ca0bdefe994a804aaca7  p2/oracle/5eced48-T7.spec.ts
740b4ce8fa660f1a33122fce68163d994668fa730b647bc52728e21121ccd7f0  p2/oracle/5eced48-T8.spec.ts
01bd0b4f4fb8f5b0d359cd19b26e34ddfdbf8d4a38641e9dbc3a77e156d7217f  p2/oracle/5eced48-T9.spec.ts
e634cf792b1244009dd592b64813ad9140375b9d2d3894269305a46c6d35cb2f  p2/oracle/6488108-T1.spec.ts
19273670dd3ab5582a23f3792464494505da7ea5c38c4f4393fd547da3aaa9f1  p2/oracle/7ade13e-T1.spec.ts
7535ad05bc6c00794087eb9939d7d7db23bfe6917c201d8f15a10b7bce7a4287  p2/oracle/7ade13e-T3.spec.ts
64d22c27690193d618a6e27f6d7cb3f9094bfeed6c97db1e6acc8c53b6ee1e71  p2/oracle/7ade13e-T4.spec.ts
b2252496801812eb47348c3b49c6974c868fd05e914c8032732a7337a5bc7e2e  p2/oracle/7ade13e-T5.spec.ts
ee31d96da59c84f96c1325baa99938852a138f895e9b1f66fe87b728ca7e6f25  p2/oracle/7ade13e-T6.spec.ts
0501f2ca080cf056469c5b419b485c8304010704ac1e2b6a9f47913ce466b41b  p2/oracle/c05ffaa-T2.spec.ts
edbfd38ddddc3e26624e5c7442e01d4ecf2c2c32e76bae71d68f3fc95410a927  p2/oracle/c05ffaa-T3.spec.ts
6ad649d2f3f82fdf87e6f619ee49c07518eede8eaf55e4da5ae863b9e61fed8b  p2/oracle/d67e5b7-T1.spec.ts
4376e04eb9f2c9c2c61a12f5fe15836bac6cca0c74602b0867bf9727381ffb27  p2/oracle/d67e5b7-T12.spec.ts
65825b7662c06cbfef3d1c1063ff21dd70af0744143cde72a730368ec911079e  p2/oracle/d67e5b7-T13.spec.ts
bb72dd6ab650d1b1a8503b44eeffc50b996933db0c9a0b35a96adb741dc72871  p2/oracle/d67e5b7-T2.spec.ts
62dd33d48df2e4e4fa2a0e2bebcc0a0919f62ee13c7dd6c5f112eaa46bf6b08f  p2/oracle/d67e5b7-T3.spec.ts
a170beffdc80caf4387d5a59ddc11bb3cf28ea7b0dcc59958ec8887866e131d7  p2/oracle/d67e5b7-T4.spec.ts
6b11e3fd6bf4e6826cc6a580e593d6786213bc3ec21b7a8a9217d875cbb5dfc7  p2/oracle/d67e5b7-T5.spec.ts
c5f710e7e37620c6dd27b0a27c3e56df3ad539f704de4c40c3741be31167bd6c  p2/oracle/d67e5b7-T6.spec.ts
c920712d3a77b9335888f252a78b7c0efdfef1ee3ada33fa5121ad92aa6a4cd3  p2/oracle/d67e5b7-T7.spec.ts
dae3dc6af7341bd1de11965a0b7c4e1543bb863ceea7346de2bac7e1ca176446  p2/oracle/d67e5b7-T8.spec.ts
90354251f3cc01a8f6357dbe8c9f24c323895053ffe815054376c71362ecbb7e  p2/oracle/dab24ed-T3.spec.ts
4c1471a4dc3b86e3321201fed262d6261c129eef89e75a260d4969d75b2e589d  p2/oracle/e3cf8ef-T1.spec.ts
5d3c20d09d047abcb84fe1ad75011b51bb5bbd81b2dfbdfede5debc0f88bf7dc  p2/oracle/e3cf8ef-T2.spec.ts
c22d7e392706f6a0b97c6ae173fb77e7fdbd22a704c7bc28056d4be0f838a99c  p2/oracle/e41d45f-T10.spec.ts
47a13968eb22542b32c56a883660ddeac50ded9e3b5e7e444d8383d7a6f05886  p2/oracle/e41d45f-T11.spec.ts
21ade20418830c6b5646a224f41ee0e92b16eb8ea62b01bbe58e5f35ea52ba11  p2/oracle/e41d45f-T12.spec.ts
6e7729d250e2242be37a2f5b725caeb8cf3b0fcd228f42364364cc9bdedd1235  p2/oracle/e41d45f-T2.spec.ts
05dbb0d674c964ba73f1481321f733ce226b470cafb492187a0e2c6eb7e100de  p2/oracle/e41d45f-T3.spec.ts
ac91577cae5c1783c6384c7b7788722b0ca2542bfec225782c3d2e70298a5d88  p2/oracle/e41d45f-T4.spec.ts
32855adc409778ab210e7dc93b6ecab2e6e11d28eb058dc02a38351fa09fb068  p2/oracle/e41d45f-T5.spec.ts
88276290b87290e0ee50dbaea517f2c30cc3631876d4fad45c9e25b3baefd57c  p2/oracle/e41d45f-T6.spec.ts
472b8bbe7f63934dff218231e90e9ceeebf7041379327e7314edea2a46d9725b  p2/oracle/e41d45f-T7.spec.ts
e820c6917ea9fc7581049a675ac5a93f83e4223c8dd76566b6526dbf0d056683  p2/oracle/e41d45f-T8.spec.ts
7b0c3c8592698fe2b55ca23af066032d855bfb9bc0b09876399edf11dfde1d71  p2/oracle/e41d45f-T9.spec.ts
3cf11c8bf969c50653f7f293d991eeb69f42e93f3f9e3b6300b2dd54f6e3efc4  p2/oracle/eb2b016-T8.spec.ts
77cef8cb52fd878c234a8e8c1fc8fe1e799a13e68bbbd234d641506832287c35  p2/oracle/eb2b016-T9.spec.ts
c6b18c8ae80364b3221a8c8995a0428b59341cbb70075e73ac4b74a8947dfc36  p2/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p2/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p2/oracle/playwright.config.ts
02eb724766c9e131526db7ce04a145613a48e67c269e8236bdccc5d8f3b3e7e6  p2/validation-0055e9b.json
9b7a3ef913a70fb30df6cea0815419c65ad901372c0b5daf716ab055723cb18a  p2/validation-24c426f.json
43b30a7ae5915023a2e6d6c1db6fa094d135a63946ac8008b665c856d6c7bd50  p2/validation-4f24a01.json
7d56f261cf4ed64abc9d246d8b1abe3b3569d05e3dbe0c30d1eee0c60a2612f6  p2/validation-56b368f.json
fbbc31cf1d3961263500427d81f451b2d43e44c7bfad4676805b50723951f505  p2/validation-5eced48.json
9d3fc5d16e3aff7337c6200e135e0b2f53fe691eb60d96e072a11a854c6a7dd3  p2/validation-6488108.json
c8620e071afc803e0833ebc32a97fca06f37128ad8237fc357518722b61cd39d  p2/validation-7ade13e.json
8ccbc3a874b1c41d55000e749418861574058b4430b992d5eac8395fdaf0749f  p2/validation-c05ffaa.json
b81a67cc15c98cb3d458a602f70398ee610819fe48c95d6b3e6835de91f01d5c  p2/validation-d67e5b7.json
86183c042d2cb9ba40de19c25dc003a1938dad81125ed23eb82351e6bef91cae  p2/validation-dab24ed.json
c7eeb7882c54efa024ec4fc8409d2f0fd8a5c09948a26ef0476b1102f9305228  p2/validation-e3cf8ef.json
31140e4e33009ba9d2da908b0fd1bbaa454ec9c09c48a9f0284852a6064f2bcc  p2/validation-e41d45f.json
aed2be8ff3ce291076d5200cdb1425c98348a84f0e1c3447653bbd0695962967  p2/validation-eb2b016.json
3d0edce06eca73d6d07f4a4a5a8ac89b80a4ee0facd3bc3ad88e30d03f3a5ac3  p2/work/classify-settings.json
cb5f321f3202cc1a51849045e28423897164ed991336792be6ecacabeb267db9  p2/work/classify-split-settings.json
d73ff4b5991589037a75b42b8d97e157eedbe3937158d7f486d60b0778bc09f1  p2/work/fix-1/24c426f.settings.json
1cfbe4c17bfb7295083a80e854333d6904c2b8ffd2cd6f313bc41730123d7474  p2/work/fix-1/5eced48.settings.json
4ea77f0064bf6ed27fb32d71288f50c0984917698bd816e004e7edf0d8f590ac  p2/work/fix-1/6488108.settings.json
2c6c01fce50b152f522a99750dc66b091b59168a7fef75dd9a021f3ec381eba2  p2/work/fix-1/7ade13e.settings.json
e5410a575de464dd582377ddaa7f78f07f26006c810442f20ccaf90d0f3e4e80  p2/work/fix-1/d67e5b7.settings.json
e80410240eaa052743963eeb46949ed0aab8ee019f83ddd6cdb29077027af70b  p2/work/fix-1/e3cf8ef.settings.json
387b76b58e62ffecc418230fb1ee0cac79bce07778a53e9cf082d99bd2a5ce7e  p2/work/fix-2/7ade13e.settings.json
6eccd7232e94d9be95eb6b7f563204c1a77993c63d9330b1a5fe824f8139841a  p2/work/fix-2/d67e5b7.settings.json
a9d43955748b755458a6180391e72b05414c6d82494986468c541498ce88cc26  p2/work/split-5eced48-T2/split-settings.json
238d77ac5389b61e1efe8f76aa1fd97fe1d49f354ea3cbba0ec7e11f8d9db2a7  p2/work/split-7ade13e-T1/split-settings.json
ddc5990d9eb0e6dbc8f3e41a01bac764ef1857bc327e6edb637bca7dd0bef1a5  p2/work/split-d67e5b7-T2/split-settings.json
1b40ef45d9c4d9367052632b81f1900db2ee5f90bae8658a7616de2cb2fb6347  p3/agreement.json
2023ef1ea45d67c45b640b5e1ef8b7d16e13975c93adff483c3cabce436c07a5  p3/classify-1.json
35a37a619620af5c72fd36e988571570a95a876cc68192702dfb65bc60c5ac6d  p3/classify-2.json
b4c30d47d778f1e01e3510b5ffa0e28c3ef6fa189a5c5b64c550a126ba696fa7  p3/classify-split-1.json
e4d1c40ecdf02f2791d81917b5ebae5a93333b173f3c892825d76de6434b4aff  p3/classify-split-2.json
48da35b23cdb47e58df8c03ef507ceb6d3cee86bf0a263b95bcd087aedaf5efa  p3/input.md
4beab5dda06946aedf2921daef5bc9116a2babffa9142dc13f3da153f24196df  p3/interface.md
27bc7d9e04a5d995c1dc87c3d1d78b4afaa97935c1381ebd3a7277415afd81ca  p3/labels.json
63e6d8feff6664bfa8f1bf9f8c01fb2c4966279d146e982e2581ed9bdea6d562  p3/moves.json
94d34eeb4ecad11af8eaf37a3175b71fc1b6dc3120a4be47322109c5f608dcbf  p3/oracle/042d3a6-T1.spec.ts
7e763633ab8b0a9ef4357e3519341fd0e812031c370985685a6de2dc53ee90c0  p3/oracle/0b0d76c-T1.spec.ts
d94ddbcd99bf7a2733cf9f42f1350f9390dabd63d29408926dd5511bb6269184  p3/oracle/0b0d76c-T2.spec.ts
c460a76d67578126569e288fe1c93e74279c11d986a9aacc480a087c5f80e04a  p3/oracle/0b0d76c-T3.spec.ts
c33156f14e19e58b94d87be8c0081d6886ec021e8cdd83a373fcc55732b8a15d  p3/oracle/0b0d76c-T4.spec.ts
4f3838dc4b437695be52bb43103c98d13a5c85d96a13dc885a90ea601880dcb9  p3/oracle/0b0d76c-T5.spec.ts
0005999001a9e4fde1465eb2f534faf3b776a00a10603991e9b900a968ef307c  p3/oracle/134138f-T1.spec.ts
774302b3da18f7b61502d96bdedadda066f835c1cf415a6d273ded7a4625a73e  p3/oracle/134138f-T10.spec.ts
a8c667817741aa17ff89c066f1af651512533a1db6e1ad047c39099ed8fc65e8  p3/oracle/134138f-T15.spec.ts
6af47d2ca53343b88f7cce340823f6f89ef2eaae547e683f80ea0b17898239c9  p3/oracle/134138f-T16.spec.ts
4e63e7ad11b46db20dce37097c8ac4e9272bcd2dbd76730b0547e63e92e541ee  p3/oracle/134138f-T2.spec.ts
9afc41776a14e8d1d516815883abd5e35d8fff7d1f118a2d35fd10aa4ec15ef2  p3/oracle/134138f-T9.spec.ts
80478bdfb066c06325744a38eb9c0f3e9ee3b4a89e2e6b3552979f2bd0eefe2c  p3/oracle/4f24a01-T1.spec.ts
1dc210a2508ec0983112158b69a2241fbd95f30535895c379fcfc66f91486b4d  p3/oracle/4f24a01-T4.spec.ts
b631c58ec457d9ae39c32e4b9e7acc2332838d3f6ef8fb7f2823aee76c6739a1  p3/oracle/4f24a01-T5.spec.ts
938df0d43432269dd4c52be8c25dc07ad225cdd37d4b02d297881763e0cbb328  p3/oracle/5b6646d-T3.spec.ts
9ec88d97cd45693a12584316869cfab65193b0b31a0764dae6f1523b8a4d9ecc  p3/oracle/7ade13e-T2.spec.ts
a9478ffe26e6bc4a621e764773eee292bd6e6896033ea5494ccccfca2e7c1573  p3/oracle/7ade13e-T7.spec.ts
25f0df89e8eb7854d02c88244c7dda4fb4c51798ba03e59aa05f66b259efa3b8  p3/oracle/7ade13e-T8.spec.ts
dc83f0a54f8b6112f0a065b2955b9bbcf8bfb57e352b3f8b6cebcd544a7e8243  p3/oracle/89583d2-T1.spec.ts
5c2b28cb9eada8dcc5725bfd20653cc10b35bf8db4800e5b34416e453ad1b1bd  p3/oracle/89583d2-T2.spec.ts
38111ca77e2b89b5d17f5391ed4f1705f356d25f54dd6bf3d9d39998e73a2241  p3/oracle/89583d2-T3.spec.ts
13128eb2b97b15ee4ecb80107ebc153c03989e79743b39b7013731e16bb95c1c  p3/oracle/b4b701e-T1.spec.ts
c0f2d23e75c48246e0aa2aab18b063ebd9349b4f4f78724e6efaa8b2cc4bf3e6  p3/oracle/dab24ed-T1.spec.ts
18cf1dec14a9b65c3bd5ac1d147fdee2588c176ff98bac236fb752d742c89fe1  p3/oracle/dab24ed-T2.spec.ts
1daf7f72fa4572790e53f15b35839719f9ae83a85caf0c06e4d82f14ff3d6c29  p3/oracle/dd56b84-T1.spec.ts
12d10d0b85384b5346508b28352b220a5023dc147a6d470adc490e0118b06601  p3/oracle/e3cf8ef-T3.spec.ts
efc79e2e7a6e8d60602076e4ae318adf67ac5b443f66a66f9acf0dba315debd4  p3/oracle/e3cf8ef-T4.spec.ts
23c3073fc67d75067fab2e48db8efde1669563e78e3eeddb6c6d67d54ef0019d  p3/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p3/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p3/oracle/playwright.config.ts
eff75aa32173c16f0d9caa6b4afdb83f07e875adb78a1003dc62789329516537  p3/validation-042d3a6.json
9329608a23b05b1d460d991bcd6db8d62b83f64139661e8bf8da8428d2fbe49e  p3/validation-0b0d76c.json
bf1b8aff0c09934589e052d0341a9bbcd4b4ae33f84172098a21de63d573e302  p3/validation-134138f.json
f8d31315b2bb5b3297289241909b74b52c2dfb5b94352336b940f15f925998a1  p3/validation-4f24a01.json
34f2eeb3b1509002bd844e2e478087ec40e015203e4047ec6dfb3afc98b15321  p3/validation-5b6646d.json
4a0699947ba8facd41663e3a781200ae303fb35b654a2f06feecac7ca4248ec7  p3/validation-7ade13e.json
b62736a8c956427ab0e39b53349feb44ea795e49c53993a85cb01f28df28a3bf  p3/validation-89583d2.json
66a3dff12231d0e0671859d24beabb78953bd2223c0347db3263b3707a813086  p3/validation-b4b701e.json
bb3213c049130131bd037241254f1489292186078c6598abd2577eaa18ce8775  p3/validation-dab24ed.json
f52f4a5c5bdc937308d2b788de45fdac8fb430c487a0501d6088aa5fb36ccb38  p3/validation-dd56b84.json
d05bbb78ba34c4434819cab1d644dbe9c14cf3f44813092f893921441bcb3698  p3/validation-e3cf8ef.json
dcfc8da17a004de48e0ab775a0e7ffe92f3fc7ee6776395c075d9ab55d7bf65d  p3/work/classify-settings.json
e869c73fd789f397d20614c0913cbdf2ce6b832f169dcaac88d38d275fe79b2f  p3/work/classify-split-settings.json
a74b9a4def1f67943f82eef4b0d95a4c5e5ca8fc91cfc27ffa4547abb406ea39  p3/work/fix-1/89583d2.settings.json
4a040cc44af386edd8457e8dc20774bb8e1ff241404c958bdd0631798fb5ed3d  p3/work/fix-1/b4b701e.settings.json
b325d78ef0a9612a810024259a4f386b8ebf908c27be38f14328e69ebc8faf42  p3/work/fix-1/e3cf8ef.settings.json
ec1cf44ffc770a74f103c8d90a24d7aa0e03dd679a6ba4411232760a59225452  p3/work/fix-2/b4b701e.settings.json
5940fae7183b2dbbcd22a94e67ad6ab35bb37fc1830ca3d0aee63c2e675bed93  p3/work/split-134138f-T1/split-settings.json
66501ff5d50eec6f686e697a9dcf8594a1e00972b42824183c54270d8509c685  p3/work/split-4f24a01-T1/split-settings.json
41ae30920f0540bf1d8d67e2e0228b9a8003c436ada3fb40cf367c7b7adda082  p3/work/split-7ade13e-T2/split-settings.json
85da7f094986f6a4e3088ea473ca1df3c70fd93b679f247e939427b460774eb1  p4/agreement.json
8b8b356a3162cfc287a57ee56ecb5748dd2d4c38f8d3a90374d2671bec6daf97  p4/classify-1.json
becadd7669e127d0340cd77e316eaad33c8f00ce347d9607877cbdaf5ddd3ef3  p4/classify-2.json
752dcd39c0cdc901d680dd769b66f230871c9b1652a009b16a151b13684ce3b5  p4/input.md
a902bff62981929de357da850d8fdf4167ae1212c2a4e18442d574b7ebaf5660  p4/interface.md
166409b374414e11aa199cce2d6e10ecdb377b6bc19bbf3ee2da015a5b6711f7  p4/labels.json
67f65b47446499da6d5e74b91f8eafdcceb78bed7d2d8662b5473adeb1c3ecdf  p4/oracle/4e380c0-T1.spec.ts
bc0636a2e3e387b203ba56b86cf1c0887b52127203e6c85f0dc0f865831f17e7  p4/oracle/56ed9af-T1.spec.ts
d0bb6c323a119febb62ffdfaf567da4e4ed7a567f4eb12aaf1c9b8578c3ca30f  p4/oracle/58f684b-T1.spec.ts
f8385ca7b03044e663df4cc5f0636272a3d052059a1bf38694d7f99257f58c72  p4/oracle/5b6646d-T5.spec.ts
fbe07fb0eaf539065e58d696f403f5f3d51e4966eca6b019a6bae8f331331d58  p4/oracle/69ebe27-T1.spec.ts
05a08788b8c975f5b9e0dba0d20db4640ab7268b1085fa1f406ed72a54b16812  p4/oracle/b5fe07f-T1.spec.ts
17b5da54aa37ef1ff6270563e63d436c27cbad95f7efedba371e70b757a3f22d  p4/oracle/b5fe07f-T2.spec.ts
ef4feb12c905bc4947a40b7d3ab138821d4e97fbbba0f7475d2637cf49a7679c  p4/oracle/d38656b-T1.spec.ts
7426e407e4d3c386253850bb3517a1779a33e3d26e5e7817ca72b0ad2c06a0b6  p4/oracle/d60002f-T1.spec.ts
1a24ad4c77813a7e38b8b2552cde69222ed3361f8505d99083bab1b2425efa18  p4/oracle/d60002f-T2.spec.ts
5f657accda24c2bfbe2c52f0f22d2b2afbcec0148f666453642a803fe9601394  p4/oracle/d60002f-T3.spec.ts
8aaea61370ae4a26d93d23c00e37303ff07eb17c5178d10e488409c6e50f94c3  p4/oracle/d60002f-T4.spec.ts
016da03d8ca549a3e775631a0c36df852beefb89c6c067ed94cce2d87a11b77e  p4/oracle/d60002f-T5.spec.ts
1cd41a5d52575d01fd9e2380e84df0d3617ca720a5812a910af04ce92548c2c9  p4/oracle/dd56b84-T3.spec.ts
c34de05b2c729d5e8daf9b1dc50fc1e0b14792455a3898c5ac41cf89d8880005  p4/oracle/e065697-T1.spec.ts
21a8ce55432cbd5f5dbf8bbe964e33242d6f965ca032b5288e6c2c1290ce291e  p4/oracle/e065697-T2.spec.ts
c6d479fba5554b9336d473016fca029f2d1e97fd3097d704d35d98f9247ccada  p4/oracle/e065697-T3.spec.ts
edeb54b68c83e2814c3ccb0aec22b2b1295de81ecf9c24315115f377fef2ab9a  p4/oracle/e065697-T4.spec.ts
9487a810ece1c6a20eb3c479896d65bd15f237fdcfa69d9b2252826c1dc514f3  p4/oracle/e065697-T5.spec.ts
3814b66fb16c45e36dd8062275379ed5aa6ad7f41af42047957f5bd48e2fc22d  p4/oracle/e065697-T6.spec.ts
5043030c536916785ab0e0c126a905dd9e57aba4e09de8c967c0712c82c976c1  p4/oracle/fc12df9-T1.spec.ts
d20c24dabb99628346c702a4e9a6e3106891cd49fbf1610ec6c0c902d5fdd7f7  p4/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p4/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p4/oracle/playwright.config.ts
d4c08a40c3049c4183fbf2eac6c43adc28cd8409ff4d902a0d635b3159c9a253  p4/validation-4e380c0.json
3723dbeb6693d2a4c8dd51682efaaab4cf74942f93d866d19e316b333f62329b  p4/validation-56ed9af.json
26bc3168f152ae7e0d2fcfa14d8dda02840c1b74e088f8fcd13c474539eb6267  p4/validation-58f684b.json
9bdf75c3ada8748988eed3ec758b50fa1d926c0968311f6b6c0dcadd6854195c  p4/validation-5b6646d.json
e4055214a58d977df033d87b1bd545e5c7939c97f5b320d12694d6da818f46e5  p4/validation-69ebe27.json
930d90be29cd3ff34df12085697207efa1292509ffafd84d26850d1201c08349  p4/validation-b5fe07f.json
c2910bbea01e1e162879acd24d69a4c38b3c052edf0a98155de6cfd39f7a9daa  p4/validation-d38656b.json
65b458f12601df452627c41873b2bd410ac4439f076472af7ed6b598f5455a0c  p4/validation-d60002f.json
aae016839ea4ad42ea63eecf912fbd757139496a996734e78e21b28880f38e14  p4/validation-dd56b84.json
74f9e30a081a0523994995b334d5a7da0a5b6c8919c8619dc380361ae7279181  p4/validation-e065697.json
24ff1d810ef39aee1fd206bcbcc7a886a3d29c604be6034db0e563c366d5636c  p4/validation-fc12df9.json
a9fac6f4aeef87b17788150d9c948b73b2c543a0159818e78265938b3326ce7a  p4/work/classify-settings.json
4e0163afce9d74f89136da7013f4e5a6fbaf37c9e8b0e2f83db0632e53baa551  p4/work/fix-1/4e380c0.settings.json
6dbc6231f4655ea7c4ae18494d3dee8200b604403cf0c327bbfd2b7f5c3f71fe  p4/work/fix-1/56ed9af.settings.json
7193ce85f016291de50267f850bfeddee53e799156b97e5117f1a8f1f29aec76  p4/work/fix-1/5b6646d.settings.json
7a9605311312e64b066a83b6d0efc154266aef63076f6e0ed87b629c033144bb  p4/work/fix-1/b5fe07f.settings.json
d12a1c87487c463baeeba93325428710d9a746d011db7fa70558bd83e7b63b91  p4/work/fix-1/d38656b.settings.json
ea440a4ddac70e7c7bbf6b84d6c04592f31c76b76b84dae4a246e3435f67cbef  p4/work/fix-1/d60002f.settings.json
38546ec9d7da9e445b1a4d5c462d011afd79965372cb19797289bff6c5373c88  p4/work/fix-2/4e380c0.settings.json
44925e99af723723390a60526bceacbc8b24147959877d15e939701022eaa9ef  p4/work/fix-2/56ed9af.settings.json
b1a6e9bc22d477bdf795734a5a7a9ab3b3c51cea3b566823d5ddc75d1c228062  p5/input.md
a3e75e5303adbdf708e7794436daeef5766ed5345ead725a1f03571bd03edc80  p5/interface.md
1e5f80303f07d6ec78ca43ffb89726d4e61998796a38f942664babb485231be5  p5/oracle/0fd75c2-T1.spec.ts
029df2cded80de74937ad2ec3460fd212669ced5bf2800d944ab576b7cec2332  p5/oracle/0fd75c2-T2.spec.ts
8dc71d60f091e373c891011cbfd7e329bbf03fe4a287345d31b4d10b3a33d69e  p5/oracle/dcfbf0f-T1.spec.ts
2ba1ad94295da34f55a446d5d1d6218e6ff91f2c894b033c57d0db1e6ca12b11  p5/oracle/dcfbf0f-T2.spec.ts
b5bdd13ecd0495b3b0c2ad5ffe41a4808164439d44f7012ee0d1ddc74a6e162f  p5/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p5/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p5/oracle/playwright.config.ts
97e9d231cf9716f6f421a4fe17c18e7d1be50b8437d6a6cc28418104f03fa944  p5/validation-0fd75c2.json
710db888d9e788277a01c46f850888b6a97dab2b7e2d6ff51bcc836ef5fa3286  p5/validation-dcfbf0f.json
fc95f52b39633e10e36141d7eef862aeac7ded31fe27c8ebfdc2329cd6085b29  p5/work/fix-1/0fd75c2.settings.json
867f16e651f2237bda357e70f13d9e034be944df14333a89b62d02ba71ab8ae2  p5/work/fix-2/0fd75c2.settings.json
e40a04a2ee1fe43cd4ad1c460fb0aa59782b293fab03ab490328f85ca7df6d0d  p6a/agreement.json
452e03e058fa468da99bd2a5b7868587e954c36b509feb940c34307374bef868  p6a/classify-1.json
841a9a22e20aac8c0a223391f544b365312ae2f21bf52c4045a75a3c239e4edb  p6a/classify-2.json
d86b75c546c60bf10f5e782e9b45ffab9e65e2867e0bc6fc2f8cb5b3e4cfcacb  p6a/input.md
e61fc0785ddeda0916c9a4a7c0b1db46b6af7b4623e98d96e7730ae37c76cdc2  p6a/interface.md
0cfd5b5e69ec5ae43e5fb3512ee855e9d0fdc35e36eae14831c60c224d3381d0  p6a/labels.json
04bd7cc62247ed8f39a80d841aaba7d68bb957d48f0cf6d1ca99d521e24068d4  p6a/oracle/24c426f-T3.spec.ts
f0822f4156cf6a0ef13b436fd7f38f638f17bd63fcae332a21c7e01475bb8a52  p6a/oracle/24c426f-T5.spec.ts
fca1680154d88375f622a71f5dc182567b75692c61b9278ca807d3c5700fb362  p6a/oracle/24c426f-T6.spec.ts
d2fc0b30b16a0fba28eb66ac758db667370c0d8dd73764be9a58750bda452c57  p6a/oracle/24c426f-T7.spec.ts
c93c8de6a39821c77c780f2c1167ed840b3f3e15d50bfdf374438871b0653c67  p6a/oracle/29f4daf-T1.spec.ts
838d2e60358e97c7760442a322b7ccf1a8441b043f0e9cab1212cf4fb27aa8c6  p6a/oracle/29f4daf-T3.spec.ts
b756bc7fc7652b7daf5cc42e757f1d09ddb0be9b64d6908e3c454faee25b0e37  p6a/oracle/3137149-T1.spec.ts
e0320735781eea93d643775918427c8f746518576521b1597bf3bc9b23e92a12  p6a/oracle/3e4ff59-T1.spec.ts
eb4c29e374f36da6dd27b683078196bdd7ba9613ab2fc7a9c51e0f9dae33977a  p6a/oracle/6cedf96-T1.spec.ts
0c429c265d55a588b0e7d7861d5ec900870634c3d34a5d1cb69cf97ed7a6f0ac  p6a/oracle/d005fa5-T1.spec.ts
af7359d280a9a79a92668e52f96c12ed8f9e841c18b88cea5861a70542680b20  p6a/oracle/d005fa5-T2.spec.ts
26a8d0ebcd1fe3edd57e598803543c265ca6330c15947575564a220ac42a5b32  p6a/oracle/fad6198-T2.spec.ts
8857175e62f33e206cfa48bd171381034e6e7f1d98084c59ccee627685758250  p6a/oracle/fad6198-T3.spec.ts
c04d93ecf4fe480ae54bbd2d6905d6971a9887e76315eec754d4dae10c4cfe44  p6a/oracle/fad6198-T4.spec.ts
cf587857124ad41d4331a285bd4ec15ae4a4790c4a01eba2bf769bf0370c5281  p6a/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p6a/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p6a/oracle/playwright.config.ts
09875a4fa9d997a8a4bee11689e501bdfcc67ac6b675028f3b5a0b923d77e9c6  p6a/validation-24c426f.json
719b091cf8ab7e08df9859cb0bf412edea1d544014dee8e9653a2f1a7d58b76c  p6a/validation-29f4daf.json
0de7e71e1c93a1245637a59071e3a23222ebb13f64f4c7e6f0adf08df3ee3a74  p6a/validation-3137149.json
98399fe832488ca74a6f9f1f70e852c9c576c6b9ae79aa09a7fc1b8fd0951f16  p6a/validation-3e4ff59.json
ff955baee884a08f1f73f0ae7fa039444c5c8204527c4f4f966f7853c16d7c0f  p6a/validation-6cedf96.json
1bb7081a85cf669e7461bedd6be63508271b62479c31c32391fdc9992ba15a69  p6a/validation-d005fa5.json
a1949aac113c59e5453efee6c895bbd0c5d9fbc35aa147390ea3479cb54509e2  p6a/validation-fad6198.json
d0ea65e059a72ea90e7744e9f81058c469054124f74692d44b64f64d8e5d774f  p6a/work/classify-settings.json
1e5f57c7997b4f70c15ac1616b0273d574838eed78130ce65d278954c89bd2a4  p6a/work/fix-1/24c426f.settings.json
877cf250c31bbf47cffa6f81c23fcad170d4af99563e3fb7dacc19c4448825e9  p6a/work/fix-1/6cedf96.settings.json
887c9dd0d132b3462902bb332d505ce391bf3a2e055f2cbb3e6066c64a5dec0c  p6a/work/fix-2/24c426f.settings.json
5680b9b8faeeeb40c2bbcfe4c734afca754e13ffd096fc591ebeaa92baaa3794  p6b/agreement.json
11189346bca9821009a592baf68501cade7e92791a5d1ecfea279a5b3dc92c41  p6b/classify-1.json
11189346bca9821009a592baf68501cade7e92791a5d1ecfea279a5b3dc92c41  p6b/classify-2.json
6167cb15bec56d8779e17d6362cc9c05383a8dfe85b9569ddde325b98e1228a6  p6b/input.md
78e60933f15e34a7d97002356bd8f801cbde19607ed7d2a4223ae797569fa131  p6b/interface.md
9cd470543ba233850727d335d946270f3f8a98603804625db8b5c789dd090869  p6b/labels.json
f354324d207d483d7f2b0f88ee970ea4250eb361b3bdca894ff3e031a75887b6  p6b/moves.json
9470117773dca0fb74e8f3dc13af7ca36f4504151b07ee02c29bbcb6f7803329  p6b/oracle/042d3a6-T2.spec.ts
ea43e5df1c6fbea6fe086986ec3617b631be9622fd766c729a7ed2b992741e3e  p6b/oracle/f39ebcf-T1.spec.ts
45606b1a680a358b9d7dad4e2c690760d13e1a7c69c9b6393d26806f21720a35  p6b/oracle/fad6198-T1.spec.ts
896d76a02e88edf1e94b65228e39f1608721554c52a3b4bef8058e06d4b9e6d9  p6b/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p6b/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p6b/oracle/playwright.config.ts
be4547756ca1b2e5a195d713dad48b1e06f396bb9f09d3e516d7fd6d7d267d26  p6b/validation-042d3a6.json
4bde9c1de583bf7f38e5c7ba1289f7f8ace7616307128b7d87243c8ff15b0923  p6b/validation-f39ebcf.json
4fd79af363f69e02893003b9563f6e623ab3e9c055e4d2df5b92dc4e89e7c13b  p6b/validation-fad6198.json
ccaf2eba44546211d053a38abfe7c2620dff7db9010932826f400fd1a41db6ca  p6b/work/classify-settings.json
4a6113fe07575f7ebcfe70649353edcf53516047aa0b75a9d95a21264811608e  p6b/work/fix-1/042d3a6.settings.json
356dd987ba7438c44cbd90be2c083e91158116ecfa4df23362fbb2253e0426f3  p6b/work/fix-2/042d3a6.settings.json
211ecc99210a0c4db808bb60e8aa14e8142b429e0174b20b771b4e3b666f3e36  p6c/agreement.json
050282a47469f6c54f4c4f0b0d272a500a26cae2c28c7a0303fa732d2878bc07  p6c/classify-1.json
050282a47469f6c54f4c4f0b0d272a500a26cae2c28c7a0303fa732d2878bc07  p6c/classify-2.json
2329a18d50a3144cfdfd45e5f037c01dd257cbf9d0fda7620663070ef7afdbe3  p6c/classify-split-1.json
2329a18d50a3144cfdfd45e5f037c01dd257cbf9d0fda7620663070ef7afdbe3  p6c/classify-split-2.json
b74ed7518a9b9aef3176a6a380f2191abf95098b6f942589ce7b767cbee9dc42  p6c/input.md
2a2a64c9a2a81454a400749399e828b77f65a7f3fea4aea47e1fcf3fa7569f70  p6c/interface.md
a181ff914ac8983206a12bf2a88828ad64d5080dbf0eb5106ca572be55876c87  p6c/labels.json
c77991d4b44d9c52f76e65d3154cbddf886a3fd5a815d0dbeb49fefc1b2c5fad  p6c/moves.json
298bfc5d563249c1d7b70fd795af5f157a319d25055f7427dc2867c7c5182a09  p6c/oracle/042d3a6-T3.spec.ts
8a2519d645d4073db00e7eacef73dbbbc0ad9015d80ab2d073b01b49d0d06e01  p6c/oracle/29f4daf-T2.spec.ts
7d306423bfbb02063c9b0714a042d4ad463b4afdd6d7d745e5ca695b5deae274  p6c/oracle/e41d45f-T1.spec.ts
964b45cd7bea019bbdf62f294d1b75849921788ad6a61658017ea63db133f866  p6c/oracle/e41d45f-T15.spec.ts
cfea31e06ffcfc862eee692e9509f50c7e02880935714526d27170bcdbfca38c  p6c/oracle/e41d45f-T16.spec.ts
b0a851948657ba59364dc0998598a70edb3825fe76c9e120f02fc34201e886d5  p6c/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p6c/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p6c/oracle/playwright.config.ts
81a86a7e9d55bc60bbee81de469cbc788a9b4bcb935092ffc2d3dfb5880c923e  p6c/validation-042d3a6.json
34d3e07ac6dca7aa11ffd0b009bbbfd07500b8514242fa8acfa0d7c890b753e3  p6c/validation-24c426f.json
c43ac1eb139cc5bb30781ba55a9c3d155c1e5a06968527d0bf1fdd76ffbbaa7d  p6c/validation-29f4daf.json
3d490d64fde800bde9a5c6a29f15e040173359c7d630d51be12c0a31ce60bf8d  p6c/validation-4f24a01.json
6d9a30bf40b3cf052c339e11bd85291def185cbfc6ce8261f717ae89428e848b  p6c/validation-dab24ed.json
e4fdbacc418d794cbe18017cc7aad9ca96842f7e8258d8aeba1de29b56a02dd9  p6c/validation-e41d45f.json
7d290c8123b41ffc3712f16c9555a284146f7f0bdd1fadcd3148f12e3ae4e9a3  p6c/work/classify-settings.json
ba19cac4cf349c1a42f680b8d80f80110cbf88efbacdce8d19af4b97510d725a  p6c/work/classify-split-settings.json
c727654a0d3c9911de4bfcf45d552ac6c089fefd67e4747f9aa265b8b057e0e3  p6c/work/fix-1/042d3a6.settings.json
e107af46918594c7799f594d95817c0f4c372597717e794086bed4e556f0469b  p6c/work/fix-1/24c426f.settings.json
efc4f32a00df38f5356b3dd6e14bab7d2b5728b44a60c65f8efd62d55ed2ce5d  p6c/work/fix-1/29f4daf.settings.json
1a1f35641431dfd99e3e619088434f0e85ba8c48af469caefacb57e65007799f  p6c/work/fix-1/e41d45f.settings.json
672474e9d994f8d685b7548181e8457c99a0e84278ae34075ef447e1a3e71308  p6c/work/fix-2/042d3a6.settings.json
6e0e94736b7cbc683b5138b0455452fb4489d1a4e6f6429b1133fbf38a8b1691  p6c/work/split-e41d45f-T1/split-settings.json
29bbe9164d098bccb00f3c737c0a46725a330aba1fc519d6920283e6f4584c0a  p7b/input.md
49ba6f85a3c612b44666a8664bf803dae3f20a63c54542cb95f36eeb09caf0a5  p7b/interface.md
4769b203387e4e4dd46a9117a1fffa0b6381f6dad79737f18bd390eeabe08512  p7b/moves.json
a6c73ed6654db90d6944cce9bf980624aaa8d3c97908d2b2824f36306fafb8d1  p7b/oracle/3137149-T2.spec.ts
7c5543006de4ea3f70bc1802865f1f9f91c9e2e33b9f24144e36b7dc39855ab3  p7b/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p7b/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p7b/oracle/playwright.config.ts
23f276edee123bfd36a7dbd33a80c4cc7a5bbf5e10a7f753100c51b5e2fd68d8  p7b/validation-3137149.json
b95aa322d948907b331aee599aba1f2b3b316370411cade447abe22b618b1e55  p7c/input.md
a9ff0b94da22206f3370600748fc51949afe3f5a8cd37e0fbfe147a3c1c76e12  p7c/interface.md
9573099d0b6a578dd97dd9b966ec177ae3853d7fb907d9fef4d8c990992e630c  p7c/oracle/8eccb47-T1.spec.ts
2767441cc733c63e7c5409475d6d1a9a3b2e72d7bc1293484185af4d0062fbad  p7c/oracle/fb7a2d9-T1.spec.ts
27a21c0ad271531d86db30996db01291628c5a416535eb4a8bffb4f8a1c0683c  p7c/oracle/fb7a2d9-T2.spec.ts
20c11b71dfaceae52995513fba1e96bb7297736451d390cfe9c294381728142a  p7c/oracle/fb7a2d9-T3.spec.ts
66c2e763d015749bfcb3d3eb5237a8074cde418a261b8a051a68f3b35effaa65  p7c/oracle/fb7a2d9-T4.spec.ts
470103c4974a410cb7a77935ffa51de70d21dd330196d5463a2b5247c880ec0a  p7c/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p7c/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p7c/oracle/playwright.config.ts
8eba3d5ff1196e4ff3008478ca2aa76d48ad012e891e6ed5f23204d5861af737  p7c/validation-8eccb47.json
8c6d47f4eda0cc5c95a08937980cd5a3b9e4cf1719121333c834ad49ecef1a54  p7c/validation-fb7a2d9.json
60c02bfd2dd9044825153e2d40c2b9ae1a13474f6e1b0ef398ae6e2899ec7c21  p8a/agreement.json
61d4e98ddd50f5267fe5309ec13351dc298c57f4b22ba8a5c3a1c54d923a01e5  p8a/classify-1.json
61d4e98ddd50f5267fe5309ec13351dc298c57f4b22ba8a5c3a1c54d923a01e5  p8a/classify-2.json
d5a3786a1b30460d1fe4a90d5499a6647dd499335931db5bc49320c2c723fb36  p8a/classify-split-1.json
d5a3786a1b30460d1fe4a90d5499a6647dd499335931db5bc49320c2c723fb36  p8a/classify-split-2.json
75644ae53eae61e66fcbd0fef64d6dcaf2865a19df1ca6256b17df42960aa985  p8a/input.md
a9b8aa3530e32b306b1554818e44be62f83af8c593e696e732ecb59582095331  p8a/interface.md
72ab6fdd7d48f7b57269a870e73e861deef765544cc71bdfb97c82b7ee375af7  p8a/labels.json
75e9ca152b7a8abd815b91770f2e9819af43a4687c6b4073aab592da41a111a4  p8a/moves.json
70c1a3509c04734a68d51e68ace14854a659b757c37b566498c9767791024b04  p8a/oracle/56b368f-T1.spec.ts
878fddd0528ccb9bcdb0b45fcd90e0bed1b1041e45a7ee27e7bc9174d9a82894  p8a/oracle/56b368f-T10.spec.ts
adc7e4689401b0161e075f6e157113a468e13760e3e05efcf83b4439b404e929  p8a/oracle/56b368f-T11.spec.ts
f969627de282b365bb0986ec2156ea00dd9968f910b26dc50f7f3e217b2c608d  p8a/oracle/56b368f-T12.spec.ts
45aa1d1e7b6c54f0c793430d6b1e800385c3edae11ed07747b31c9e13866d31e  p8a/oracle/56b368f-T13.spec.ts
a6de41418c5254709d431afa2535f3a04d75a97c2791fff64b58b598a7a3fb76  p8a/oracle/56b368f-T14.spec.ts
7d2275fec497e2707bf909fb4f712ebce988dc507ea1abcd857ea17761b544d6  p8a/oracle/56b368f-T15.spec.ts
3a50f9163c08e6b2e3250fd3328948e927f19a9a0a83dc64bfcb60c10c52b5d7  p8a/oracle/56b368f-T3.spec.ts
b378e74e7aa0d7d544c374eda86acf11247d1605562f36bdc891d657ffcda563  p8a/oracle/56b368f-T4.spec.ts
2039d2db368260e48dcf36678920876a84addaad06fc407f247a0d5cae21b950  p8a/oracle/56b368f-T7.spec.ts
1eb1d535e7f4ef22f329c2346fa5673b7b7bcebb6529c61991f5531cdb949e25  p8a/oracle/56b368f-T8.spec.ts
a42dd3ae56f2cee35f958b40d7b309d45d6185a2892b0865a9f08dde450a51ff  p8a/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p8a/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p8a/oracle/playwright.config.ts
84b96f051e750b49338744a324ca56ae69ae218a63c2d3d69fb6333608ecc15d  p8a/validation-36d089b.json
b20ab7a5f5d1ae6365ab37b4992df5421aebf05a4d8a8aab9d51f4e7f66f8646  p8a/validation-56b368f.json
5b90a91b8e6a88e7abaafbace82ffb563e2c9a2d8296970e9f3581c322055675  p8a/work/classify-settings.json
7aa2fbfc9db44f257454dc9673fa1376d82d38ea45a6c9151dc2a9e91222d949  p8a/work/classify-split-settings.json
e65bcb20d89dd85a511475c465e552a84927b640a7f9429506d99788ec35796f  p8a/work/split-56b368f-T3/split-settings.json
7649675d4076a70a21419be02158208298e861d6e97ab724f1c3a7952358b371  p8a/work/split-56b368f-T4/split-settings.json
14ddc1d8c9cc917142801efce0735ac83eb83cb462d98caa739e75375588c255  p8a/work/split-56b368f-T8/split-settings.json
0528e0309414426432926292b4e79a55d26c92a93e5fa19083e8db34fa3a8771  p8b1/input.md
6647f99805f0a54329082bed427da9d156a287ef3ce43361eedbaa0567c25835  p8b1/interface.md
8aaed564aba40edeb29c5d5e34a7506be259b68cc1fcfd2e213f156ae1f92554  p8c/agreement.json
136dfc0b96f2e512a375887c22cbdd914c98d85e2dc01108e7eaf44327a589e6  p8c/classify-1.json
136dfc0b96f2e512a375887c22cbdd914c98d85e2dc01108e7eaf44327a589e6  p8c/classify-2.json
1287d09db3eba2d759c4a026715ee0da5265dd3f2e5e3e43c64444735bb38dbe  p8c/input.md
c98f48da79495fc42fd548b4a79dfbb3479835b91b7fbeb78b2c5c5ab271fbe3  p8c/interface.md
5cfd809739590abef83231bfe2bcea682e2ede90277c466a387483a6e2c5131b  p8c/labels.json
0f9ae4b1901b69d5bc0c30a8ce311014defee2cd50f7467120d63d062ac6a1bf  p8c/moves.json
8d27ec38bf03de7e7bba694324d75d388112ae75183b5850ae152170ec7eaa7b  p8c/oracle/134138f-T3.spec.ts
6b4845bbdb8714553dca22eb72ad39c28ba5d08f48940343a16a924bde801d43  p8c/oracle/134138f-T4.spec.ts
88e6cd7b3a12488a6b6038777c0fde8df85513a7fbb5776319f65e7865092a84  p8c/oracle/134138f-T5.spec.ts
31433f1f16a392b6a25b2fa35df06483d36f27ed591e9e49aaa25bee000ca4d6  p8c/oracle/134138f-T6.spec.ts
8b1ab03ae814bfcf824136a8683f4244e6c81752330fbfb1c4cb25a724c43268  p8c/oracle/134138f-T7.spec.ts
db09f872a35d8720e5c7b98d34b8534a13533eba07e2bbc1ad62b3b9cc0ade39  p8c/oracle/400f58a-T1.spec.ts
a81b4b28878df1fdfd7bdb6c633147208517e8f2675b768d6206c755934fcc1d  p8c/oracle/400f58a-T2.spec.ts
188fb7fe54eb1c4f53dfa9c0b1442cfdaef28329aa62d22308457702b2639d46  p8c/oracle/eb2b016-T3.spec.ts
5e707a17202b87f65b0a9a5da129ea207cc1d52d3e01fe7caa4c6c67d17f5477  p8c/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p8c/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p8c/oracle/playwright.config.ts
46f448360af0490380971a3dd5bb0f4f556e96420551dcb9900eb40e87061a5c  p8c/validation-134138f.json
273fb3ba2b8005e60c6460529b41d5cad707e0436ed2de63c4716e397541df2f  p8c/validation-400f58a.json
0387091a3890bbabe869cb7fb280363779be53591da3eb3f6b107ba254a2df7a  p8c/validation-eb2b016.json
a2b5492e8d9c04c54075e89034c5f649101c111b4dfa18a28bdbd3898d99aae6  p8c/work/classify-settings.json
861bc208cf750550cd514072306f1454b7da51809aa04861c0c5e24215b927e9  p8d/agreement.json
946b0c91f37c42efbd1b5dd2f546a11b7f11a275b1206584102706dee179b5d3  p8d/classify-1.json
946b0c91f37c42efbd1b5dd2f546a11b7f11a275b1206584102706dee179b5d3  p8d/classify-2.json
077915bcca909b6a3c732875e4695074656e4fc49a9404e51bd0a349914f516d  p8d/input.md
a1e81d9b18d74d8dee0a7ceb4925e776e664c84494e57e51c4958cf08291148c  p8d/interface.md
d7db0b8334dbcd646dfcbd21d58091a5d3ef6e395c01e8bb6b2793698b7e1f6b  p8d/labels.json
5ced2b0809f687474f7f6235951c9cd5a75308fe06030d79bd930cc60c9f3557  p8d/moves.json
c63d64d82ac56bbf1e2c8bb4fa3b71be3b04a014620355648262cb52f3497059  p8d/oracle/5b6646d-T1.spec.ts
b7127e1cc703018164483d103461184200186e11bfc92c6ab6365f344166c177  p8d/oracle/5b6646d-T2.spec.ts
c521822d308b03be2c97dbb892a6f36ec093da4e1ce6b4fd2cc1b6815ddb9cfe  p8d/oracle/5b6646d-T4.spec.ts
187c31a9f150f70ba24011ad4fe0ed7eb5c96be0e0ace4f2c3dcf82a9778b16c  p8d/oracle/73ca3de-T1.spec.ts
714c49f09458be2e3ab11f08241fdf5be3c94d418b46af0782b2b2b27ebefdd6  p8d/oracle/73ca3de-T2.spec.ts
2f339827e253f0ba539187bf2de0ce50df8f81a748fe4c27a507ad1e608760fc  p8d/oracle/dd56b84-T2.spec.ts
70a465cf3b8b06079ecf240153b8275eaadb188a301c6e40922b7dc8781c3ca9  p8d/oracle/dd56b84-T4.spec.ts
568898e8b1d76754ecf5b4b78c9415b493631aa0edeb38fcca3ccb4f2268c887  p8d/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p8d/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p8d/oracle/playwright.config.ts
fbef6893fcf6fa8767462e4099ba3b9f547af424bd34cc58f7fa63de4e2e8c01  p8d/validation-5b6646d.json
0137acae7776fa3410c88de21cd843a7a84f657e6e25339a71c7787f4a2d8ed4  p8d/validation-69ebe27.json
9b26278f025f2ba829ed9c970417e5368684140d77d92ef1881c1c57d4b78e46  p8d/validation-73ca3de.json
d3e2f28da926ba993d43cbb576db9f15bfbee88abe80342764af3732a9004c41  p8d/validation-dd56b84.json
e8e338515c4a5bb93edc92df043ca4a46de0df934c97283f0e2c77b643a131cc  p8d/work/classify-settings.json
64f5b90c78d194503ba6ad34958955802fff737ba843a2f0ecad9f524e5672b8  p8e/agreement.json
6f805f20954bacc446344edf8f6a5809065fa45a8bd546391b3d30467c2436ad  p8e/classify-1.json
6f805f20954bacc446344edf8f6a5809065fa45a8bd546391b3d30467c2436ad  p8e/classify-2.json
d9e098de9fa423651ee4a32d82e8e537c064d45e221cce379a661ff1dbb5d9b1  p8e/classify-split-1.json
504c9c2183f252a177d9895946a0ce54d0cf6009e14c0d93500b1b290c6c6218  p8e/classify-split-2.json
42d93633afafb116f903d28c87c2e28115ccb27a0680bfa21d7024ba55e50ab4  p8e/input.md
072c12e639d9578a8ff641c15700e9603e04226908bd35096308625289b52131  p8e/interface.md
b0fb4e447737eaf1a9fd8c0b08a78607921368b786b0cc68ae9165454cb0da4b  p8e/labels.json
c8130520590c840b2178ceaa5e022eb1f82c93a73645f7b83468f0daf6db1a7e  p8e/moves.json
39398bdb481959d9551e9d497bbd464b636c2560ec753d317136ec0a3e2cc733  p8e/oracle/1b16df7-T1.spec.ts
5d6f8f08374c49c56ec6ad5ddb2bcb48f7433f909af422e796853b51893e8033  p8e/oracle/1b16df7-T2.spec.ts
665edfccb17ad251ae7665b7e9a42c95cfce0874e6b12470ce71d0b44053ad5d  p8e/oracle/1b16df7-T3.spec.ts
58c457066fa93239a17a71eb655cafe14d2e77955ad4dc5162a3cd3eaf395ebe  p8e/oracle/b5b3cec-T1.spec.ts
93df9382f03473dd32741a1349b05d4ff504c7b30eea14c95e281a6b1d137be6  p8e/oracle/eb2b016-T14.spec.ts
2646d80cf8887db04b0c054bba64e57a205d19ff6449b9ec2c7bd748c68ff17d  p8e/oracle/eb2b016-T15.spec.ts
ae45f3ca5e01aa56e1f86ea45e93c427bc6ec146cc11baa94a8d5437cc306d70  p8e/oracle/eb2b016-T4.spec.ts
b637d251b3fc602ebdef437cda24a5aaf479602498e7854c50888929a9063e57  p8e/oracle/eb2b016-T5.spec.ts
3fbc2e2fdf8bf6dc57435f8aac5d43799e63b32bcf9faf9468fb72ea496eaebb  p8e/oracle/eb2b016-T7.spec.ts
5f9f7e34006e82993c19878094a26c40053603da6ecf09de94b71171af5d66f3  p8e/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p8e/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p8e/oracle/playwright.config.ts
07357981b034cedb4cebe83ec44d1787df18dc8a2599a74e7fb25df9e655215e  p8e/validation-1b16df7.json
093613dde794b646d244fdd1a61b20fde089be19baef33788642f2737fdf7b9f  p8e/validation-b5b3cec.json
7b37274c18354c381a58a42b4631fffc541cbf1368342adbe47968ed94692a90  p8e/validation-eb2b016.json
2090eb69bf12179e8aac3990ca3c1a16e064d6c66e3f260adb56f5704c52a466  p8e/work/classify-settings.json
8fb7ded2d75486c497da2ddf884f8f365c29a8c08e710fb6dea33446b944f571  p8e/work/classify-split-settings.json
8fb5e5b4ae8c2809629b6305f0a437f7e492d7f6aee3b2170e126e3ff4107eef  p8e/work/split-eb2b016-T5/split-settings.json
90cda24c2095443d574445758bd47fe243ed86bc258f56f0da4d2eb6c0527501  progress/step5/sample.tsv
0c3e495d51665f3e00a754be891ad70f06c9280c70f7cc69b037d59cc93b15ce  progress/step5/walk.tsv
a4a2b4e31078ac052755d6622bb4dd91f3bd6027e96ce5a5f77829c29392700f  re-work/settings/0055e9b.json
17437e46f21be3b09c8b676dcd34e3ccf079179edecb3a7efe30ef5c50d4640f  re-work/settings/042d3a6.json
29883ae4cc802c32d459c56e40888bb7bfa4b03998625e02997f02a20f112550  re-work/settings/090f6f2-2.json
8de0d29f08cf230fecfa8f37e218d826ba489a121f389ac4f0c1294b74f25a93  re-work/settings/090f6f2.json
9cbd2b6cf5c9186f27ea8c40a6df3d1a39f82e072c5c2865a8a0fe0f062eedee  re-work/settings/0b0d76c.json
d3298fa23f69e6910599d70f1878151aac40c74435b578dff00af37fc84e2a5a  re-work/settings/0fd75c2.json
656937b7f917f9d113dc21e8102c121a8dac1b1dd11cbeea976a7819cce9499b  re-work/settings/134138f.json
d54c097a16c54c7990cebd8721f1fbd16394110853b99eb13ba19519256f9287  re-work/settings/1b16df7.json
c88d1dc92392c2844660bc47f9328985a5dde500431a968c2a1b8e9ca75ad40f  re-work/settings/24c426f.json
f82707c5de98161605b14e3ed9c103d1c33bedb352f8fb4548d07f9718050919  re-work/settings/29f4daf.json
715f294cba8f3e4567f9157f11a20f3e9238038d8b1be0c06ab70f2a0e180ceb  re-work/settings/3137149.json
8330280548ebbb360d20250502aab30978b871337d7c3d8fa6358df2b9bb5aca  re-work/settings/36d089b.json
0fc40a6f424f4bdb6e5c9ea2b359799cd6a4fae046a2796bf4882c1598612dca  re-work/settings/3e4ff59.json
10cdb34f5313dbc0ffb848d0fd48422424eab1f32adc223c5cb794d543cc3cad  re-work/settings/400f58a.json
95d280ffa2bb441ec958660ce46f25927322c950f9232a6325707c2b15703711  re-work/settings/4e380c0.json
c6ba400f700e5d289e6266f149e420c9d133b484be1d5301810d21ff5e810063  re-work/settings/4f24a01.json
7703ba3f0c170b21c67232ae61fa749529ba11d43493307858180a116824e13d  re-work/settings/56b368f.json
1920ec94a56431436f750482cfb14ecb64f43e481dcc587c880fc4d0a4cfb693  re-work/settings/56ed9af.json
578531b87ccdc5970284d7f38eb6dd6dd2051d5bf22250a4c76e5cb9d876d767  re-work/settings/58e8819-2.json
ce55dc32645f7c86a96a0fe51f8b9263742837ef300be1491d2d102f2b4ec9f6  re-work/settings/58e8819.json
7ad5aad087737b6dffb1554357fb002822ab8148ae3ce7bb54cf13f09a186c7f  re-work/settings/58f684b.json
7d8b1b9327f8d2a6f9394ecd422c9717f41b97613e1d96fd509e83127ea7b8fe  re-work/settings/5b6646d.json
009dfeb81d25b34dc51ddeeb5ec10415e6e23d75657fc5b829180afc4262f3eb  re-work/settings/5eced48.json
10331109179cbb9ad987f1d961aee6ac4201bbc779007a701551b39e6cda448a  re-work/settings/6488108.json
7e9000642389e3e9735a2c73389705952c40ab4f501eedbccedd1fa292dcacc3  re-work/settings/69ebe27.json
514032436ca0344d69cbc04230fb3a6c40b2b22699b880f31fe4df93e9f403d4  re-work/settings/6c69b33-2.json
942f4142159dd87cbd524b6e3f95169e52f4393bd7addf77662c4b77dcee0c15  re-work/settings/6c69b33.json
4e190b98e9871ccafab615cd258a5615711247fd20d844025a72010aa9877cef  re-work/settings/6cedf96.json
d31656bd74c7ecc79bba5230871051154279b468dbdf6b3b692062c50ca65ff3  re-work/settings/730509b-2.json
37af937de494250831da27337299a9378fd0ed3ac64ae61ba371258f6e2aa913  re-work/settings/730509b.json
bf52bfa0d2e864172f702bcf3fa6133e919a5c43832eea51d6c66effcba383fb  re-work/settings/73ca3de.json
c02e7428aef0cfaf4f82a63e2f5de5b750e48afbdab89be6b5386ed95e4da81e  re-work/settings/7ade13e.json
5d93270f485d83169fdba4b3337d51b3b4212ecd5aaf5953786a56a4a14a892b  re-work/settings/89583d2.json
c0f26139c8bdefedb8d14481474dcf2481a1824f36409a19e6e1bcd1b8aaa029  re-work/settings/8eccb47.json
25e264c596d478bbca3bda26b0ddd547c0dbcae049320878b1167d58b9d940f9  re-work/settings/94f26c7.json
c843be61c0a7cab4f4cf30524c219fcd355890131088b966fe33d9dae1f9d0ae  re-work/settings/a5e0cd3-2.json
4ae4f92b7d38760cff97f6e8fec6a8d6926545fd5280859cd24cefb0392d62d4  re-work/settings/a5e0cd3.json
475ce73095d0d8ace1f9c071c3715fd227ad575a645f15a71b29dcd645534889  re-work/settings/b4b701e.json
a816ae9638eccf5a8a01e2716dec087faac9d99c7e0ada98a94f5703c5066b4b  re-work/settings/b5b3cec-2.json
989f7f7c536ec82ad178eb6ec400fae4ea06b9f6a6691e6631f90a339aee4124  re-work/settings/b5b3cec.json
bba6d0c0e04986cab6a0f0ececaa726b942ddfd108cfbace77ca787772ab9396  re-work/settings/b5fe07f.json
eb1d55e3e8b53dd71116788b0413a637821e65e4c0718763243b9ac8a614a126  re-work/settings/c05ffaa.json
457be02b5f2e3db6c8814599a05797b208a0aad96246d8e3d319093acb51183d  re-work/settings/d005fa5.json
9956b2ecea49e6630319b495e5e9417584bab9f5472c0281c3ca27303cfc31a6  re-work/settings/d38656b.json
10e130a8875ac1b67b8ae48f8e86e9ea8d4548b6ba5b7a447690dd50ca080880  re-work/settings/d60002f.json
1c9d8963734183127afdca35a23ad41ef3481fe88d140dabfb6cca7c00790764  re-work/settings/d67e5b7.json
31b568f9ff14451f110aed0747f19d436e93a915d767b8e769389e7f7ae583cc  re-work/settings/dab24ed.json
85f84c9ffcf16766063dc4769224a63f107329f3bb621877b8e633ea466cd507  re-work/settings/dcfbf0f.json
55b4c0dc0321b82401744106d6c956c3a7f93c25cd9b56caba83543ff9900706  re-work/settings/dd56b84.json
a70600a52fcaebe7c1e8e68309b00e202adf7a47f476969485a12684d278f421  re-work/settings/e065697.json
223ca89b427e04828a97795d012cf2b3d28e535bf1983c607311d99746830bd7  re-work/settings/e3cf8ef.json
6cb519b4842e94879f2c2bebb6c8d14a5ed387572e982081594e2426a89487ac  re-work/settings/e41d45f.json
a6f37eb358e09c911158a8a6363ac2505ba7a926dbf497b50837a3e847b3a899  re-work/settings/eb2b016.json
b2a7fbf19d6507ee1cf1b4fbd946c93df79c96946a20b1a4a49cdddda4b6ace6  re-work/settings/edf7c3a-2.json
09e9347f2cea3914251ab6bc0edb38580b4b08322c4253aa8ff2ea52967643ba  re-work/settings/edf7c3a.json
46106882b3925d28791c8d69e2ffb5be29e404702a3ebf85d96d8777b960e4b7  re-work/settings/f39ebcf.json
832c87018c4b4f2eedb911aedb0049c9a74aa828d7bd76f4b179bfb3022eabba  re-work/settings/fad6198.json
60d2180ea9962a04f1adfe592fd638641d7630e72541c510203d6d0103371585  re-work/settings/fb7a2d9-2.json
7b38921dc3a4d4d12e1c70768f87248cd5d9f31b4b6088c8d8d4a74d72576153  re-work/settings/fb7a2d9.json
dcdccccd9dbfa2e7b9914485de203bdb43581666c6a8574206c9e2b111b46da2  re-work/settings/fc12df9.json
10f4e89fe02d1ca5f1a9fa78a09999a163614f5ee075a4bd936b3b5181a0a3f8  s1-01/agreement.json
acb690e3c0e72a5743fbedc3a548f7b4267e15b073363ab8081d494f951dec3d  s1-01/classify-1.json
acb690e3c0e72a5743fbedc3a548f7b4267e15b073363ab8081d494f951dec3d  s1-01/classify-2.json
f6238a8d5a39be84bf2fee70a3e330a97c87ff148342c8b3b411b6ca77317608  s1-01/input.md
ce4d9908a1cef5c2c5248534b5fe67459bd6d3d5a7fef95be4b6b118e91f9325  s1-01/interface.md
5c96d0f2008219678517aa207d2ec150b245c6178667dec3bd46f4063ef6a095  s1-01/labels.json
6e2a54adc4408b7b69a7d3216efd746922c8863cc19ee147be7c56c0820524b0  s1-01/oracle/144a40d-T1.py
b271f691942a69cadb9e4f9ae973df56c2ff299de024e6491859bddde3280fcc  s1-01/oracle/144a40d-T2.py
4c583fb67fe1cf8d9f21906f59612be18183528cffbfaf35851604441261b48e  s1-01/oracle/djdt_site.py
38ae739c3fb03f1171ce30ae779146fb0577c9ec3154e73b466f508021568e5f  s1-01/oracle/manifest.json
eb3d3123cacb7b52246c78bd27b14da0c2a2c74b33ea001c6ee8b961f0e9122d  s1-01/oracle/run_checks.py
3cee24b800ff40240f5b529af47544e4aebc56426583e99947d74833b1918222  s1-01/oracle/runner.json
8eeb9f9738d75ff1dd2c62f1e0c51272bbade141743cc2548bcf91f276d9a925  s1-01/validation-144a40d.json
dab1295f1c96b47ee5e635085a5cc8534aa624cb622c6d4fdc25d9f232bb5d0a  s1-01/work/classify-settings.json
1075302225cedf2442f4b320bc697614c13246c2a5af752e48b0c5d8f77b1cac  s1-01/work/write-settings.json
5d22007a28c76e5b596ac25c2dff899dd9cb73788a7ff53f2c2b95a9cf9587e0  s1-02/agreement.json
2909c5a98f7ec540359ebbd7525e18e38c3c916a50b1cb461b0da06efa6b38ec  s1-02/classify-1.json
2909c5a98f7ec540359ebbd7525e18e38c3c916a50b1cb461b0da06efa6b38ec  s1-02/classify-2.json
89905e7cbdfaa9f5a6ae4836293a87b1e881c5ff16842fa3437a24f0a343b1d6  s1-02/input.md
36847aaff82493c84f997b6b52a13e3656685e0ae479b949c96e26e74f5fce64  s1-02/interface.md
1eef84f8a6db8cc64f0cf879628f61032dd0553068dd6c5c64b3512b896e895c  s1-02/labels.json
129fca2a537fee6b70c8a4a76efe1d0cbc217c8a7547103ee7ab44c7b8e8332c  s1-02/oracle/98132c9-T1.py
3087b7cb97b90efbc7cd77089ef6163e15987388bb9c57be0137215df313d77d  s1-02/oracle/manifest.json
4ca5e2bc636bb84def1a6438e80184efe9c25526e5e815600c52e219fc23040d  s1-02/oracle/runner.json
a298763ebb3457b13d5e908944e32964e16c2f45e13f0fe007cb222da56f71a5  s1-02/validation-98132c9.json
153cb205d8ab17e769c476e78c139931b10bce3527396a366abe46b0a30f457e  s1-02/work/classify-settings.json
977a482fc1c61b55785e34ae26456fdc613c58253aaf4df0e92a1fdc11a610a2  s1-02/work/fix-1/98132c9.settings.json
c29379a37b6a6f6d2045879208e9ea51d7f255208c142b286872411964b5be3e  s1-02/work/write-settings.json
8b5a9ed7dcb43744b7a79e1116fdd48f1c2fa58960ca1bec299c871d767e6a6b  s1-03/agreement.json
5521fc01c7a06cc62b1c2da4da16706b8b7fc53367735b3844fddba5cfc5b019  s1-03/classify-1.json
d99d9547e262468816be6670c3e51ec7f1d6643394720a0c3a76655abc39f84d  s1-03/classify-2.json
8972df2a352cfe07814cb5b155bf2e768fbf13d99ff239c3d7be16581690a338  s1-03/classify-split-1.json
8972df2a352cfe07814cb5b155bf2e768fbf13d99ff239c3d7be16581690a338  s1-03/classify-split-2.json
b3405be510576e7f59a06178d363545157a9d0dd55ded60c7619d49d38ee1b6a  s1-03/classify-split2-1.json
b3405be510576e7f59a06178d363545157a9d0dd55ded60c7619d49d38ee1b6a  s1-03/classify-split2-2.json
37a5901ed47f10bbe7a7cc8bbcd1f50376f8437d2653954e2795742391c5fa6c  s1-03/input.md
c694d9933462955960346723e40c43e2d84b27f15c49e959229154d108fc1766  s1-03/interface.md
c4f0f6f10378b2f108c61d9a3c78164e15df0161ccc3a4fff2dd4cf6ef920259  s1-03/labels.json
dd9dd742a5624648f7cfb7e3ffc9a8e7ae452c30201eb75d8c43ba243d4175aa  s1-03/oracle/3ddc164-T1.rb
f6b60081180ad94529b940ea0703fadfa79586f1e621b5b0957d69f65082b166  s1-03/oracle/3ddc164-T10.rb
42afb988af3a5b72434f0eb43a010d6b05968b3bfdf227f84ec168f33dda0b7d  s1-03/oracle/3ddc164-T12.rb
234607ad35ffc299cb48b8dc4c341c9cec36003de3516dade56b03b8c44ef5a8  s1-03/oracle/3ddc164-T13.rb
f967c25e91343bf1d202c1b29ab4902ba0083734cfa81dcb35c82f82aefa6a58  s1-03/oracle/3ddc164-T14.rb
b86d8a869e4dbfe6652d0a212824470c93a1c4881b8815dfd3ba03d0cbd870b0  s1-03/oracle/3ddc164-T15.rb
aff6be0dc6cebab6a24b64d77c81b93933558c09d35b35fc64a7971eafff3254  s1-03/oracle/3ddc164-T16.rb
1f72a30e0869206bfeac8b7945f81e4f336a836f14d8d6f91e32f65ae2c648bd  s1-03/oracle/3ddc164-T17.rb
5ccb1d16cf04dbfa3cf8c680c2673eec4a4bf9a96eec627cb666f523aac94ab2  s1-03/oracle/3ddc164-T18.rb
11230c7a8347a347844dc559bb6bd5e4fed4497ca3a7b3a893ca53a2accdae4a  s1-03/oracle/3ddc164-T19.rb
713cf923ed1969f2baab7dc4eea013b4eff75c61fab74e3e4253eb22f6fff340  s1-03/oracle/3ddc164-T20.rb
c4f108d19374f033f0fc87135e036020bd413930f35508018207d6be6f400a72  s1-03/oracle/3ddc164-T21.rb
7cae22a7b8d1a26a1ae26eab3a42a0c3e9dc050f1e37a627b8a5d74b7976a227  s1-03/oracle/3ddc164-T22.rb
b8d98e5ac7438b6cf984cca358b0c6d5a091168649e50fce7bfcbf85506be167  s1-03/oracle/3ddc164-T23.rb
a496ca953b4bdf0dbf24923aae3ac429df66b980b7c4ab70e912f9d0a7241fc6  s1-03/oracle/3ddc164-T24.rb
891792f78051463c8dc96478d35066854a59985f6543f8b71b4497d8cf7a0195  s1-03/oracle/3ddc164-T25.rb
1f1ebbe05b41d7911eabfe5fa1e75f9aff345a9b20804ed6b42c46b39486aae0  s1-03/oracle/3ddc164-T26.rb
12cf08529e7ff1099ab78822d8255e5e86901f51b2f09eae7336c0999565028e  s1-03/oracle/3ddc164-T27.rb
528d2e8919bad769851f1c9b2eb7aea0152befae0c4ce7b47a19f2c918f63d86  s1-03/oracle/3ddc164-T28.rb
687fd8d6446f53019ff35edc80348e87914275fa60e8ec30ba593e25462449d1  s1-03/oracle/3ddc164-T29.rb
fda0915828eec58542886ed4b011573a4d5fe15cbcc77f19a4db1b552cbf9461  s1-03/oracle/3ddc164-T3.rb
671cf1e81f9eb32e9a507883922820dad41cde8166cdcd9389c903e5338d0eae  s1-03/oracle/3ddc164-T30.rb
4be267ab0f21597750acbf1b4fa50a761c3ac2a06d924be18ed4a5e0234d3db1  s1-03/oracle/3ddc164-T31.rb
9ecdbd55d4f71ce2d854932d56e6147129631784cbf362df486564f56342986b  s1-03/oracle/3ddc164-T32.rb
5bba8b1c9689a283c2436d7ad873897ae78d503cb43c8ec25f3f70d71045d722  s1-03/oracle/3ddc164-T33.rb
8c84255317d1bf5ca8bda30f256e8c0cd462e1a102a3275177e51c5223ac0aae  s1-03/oracle/3ddc164-T4.rb
cf0e604a9230d6c3ce6db11f11afd5dcb7a12d8063b747913dab228ffa2791b1  s1-03/oracle/3ddc164-T5.rb
5a874cefce948447333e994c378eb00c48da33314f321a888f5b5dfbcf82ccfb  s1-03/oracle/3ddc164-T6.rb
b1f86cfe118dca7b32c96293ba9a0f05f2614ee080948366d88df3c371e96319  s1-03/oracle/3ddc164-T7.rb
874841c947e8e5cce2b4ca57e188cbb3cb211bf5d92987661e2ac15f7dd62422  s1-03/oracle/3ddc164-T8.rb
e7b982a515491d00fd26df77ca2b6aecb1b9ebc64bd95d9c444497811161bf11  s1-03/oracle/3ddc164-T9.rb
513a845be33733a7385bc03a8096ceab9bb8f3ffae860ee24783bffd95467469  s1-03/oracle/manifest.json
34d71ad0b243fd4666b36153f5054fb6edfe706758e1919106dd3f535c6c134c  s1-03/oracle/runner.json
387a635d281577f4e49dfec5d2c8f3c6e44c2986c07186c7f4019c7dca1dbe8c  s1-03/oracle/support/cms.rb
fd9c8abc447b000e37b47f8b118ba774be2f874974c7603a7cc0e19d8b3050de  s1-03/oracle/support/harness.rb
15aff840f02967fa8db8be12dc70fb6e0b89e4df8f20cba2aefa80799ae9e849  s1-03/oracle/support/run_all.rb
a2c0a2ed899a28d3a1b4fd5a8e5cbb8638d79e03fa372631529fbc90abc5f608  s1-03/oracle/support/setup.sh
fd3e10c91b8b2e33d4a305ee7e95437a40ef3b13ad9a66d774da629c1534880e  s1-03/validation-3ddc164.json
d982487c7d3397ac1d5c00f7c02293d9e4683e520c5cb10552cccb96676e2eee  s1-03/work/classify-settings.json
ecf0278d670863991f7a6585772cd1014c321cbd183d34a5aec54eecf81d42cf  s1-03/work/classify-split-settings.json
d3e1987db0c16a5620bb5fd03990092540b668ee87812090b0e6a72b61ecc74f  s1-03/work/classify-split2-settings.json
c3ecb672231eb88af617afcf94a1c8feb57fbdd34e787712d74bd5cb9aa85097  s1-03/work/fix-1/3ddc164.settings.json
39385b52f621fb0bace420006a25efe7dc712525d5dcbc5c2030b21d0715f06f  s1-03/work/fix-2/3ddc164.settings.json
dca3abc3f7a0b2c0ca4dd70cb285e28b9b5cc8a45ba98a81c559878fdd6a4b6b  s1-03/work/fix-split-1/3ddc164.settings.json
dc26064c24b05bee3cee74065f5d57f806bd0964678106735498f757a016de85  s1-03/work/split-3ddc164-T10/split-settings.json
066e9cfa37357044d3130d454326d2397399e14ebe70a94d884a17294a14a4ce  s1-03/work/split-3ddc164-T3/split-settings.json
9e9e0f4a5a87acbe0cce35a1dbd714fddbf620ff6ce1fee81944fa5deb9c975c  s1-03/work/split-3ddc164-T5/split-settings.json
86b1b90f9e6c7448799dcfbf116ed54be40e1e419eec3f3e81530854810934cb  s1-03/work/split-3ddc164-T6/split-settings.json
f6cbcdefe4f4c325df8146ee0e9b6b33e411e5be815e68976ec87f32d3aaee98  s1-03/work/split-3ddc164-T8/split-settings.json
b27b7df63cd1c802da8634ec7c3d5772003e425cd21e2d4cf57dabe0ea8f458a  s1-03/work/write-settings.json
c835a0c2650acf832503d71845d29eb16c95f6fa7b52242ab4209c4dbe7cafbc  s1-04/agreement.json
d8500a417743234f9874aec51e0d79779bec191966984433be7f2ba32c41e40a  s1-04/classify-1.json
dcaf80f561f00bd58c95be4befe42be410d2406e497aaed1555dafa294f8c868  s1-04/classify-2.json
dbe7c6fa2a268d799a3fb4f3d526f4a6bb3590311e0019989861af2c6342bde9  s1-04/classify-split-1.json
7b7b4509184bfccedf6c70bcdbeddc00cf17b28a877417d56b24c10ac25f9ad6  s1-04/classify-split-2.json
1d2fac49ce24083cb775cef5c86ae70072c35da9fef1201a111d2cfc646dad74  s1-04/classify-split2-1.json
1d2fac49ce24083cb775cef5c86ae70072c35da9fef1201a111d2cfc646dad74  s1-04/classify-split2-2.json
e5ffaa652b27ac07453d3d1cf53d67633776f644942dc49de917b4b02fed6b88  s1-04/input.md
1dc95dc3c30a2f15623b6800d5a8dedef71af786b9b74cf50e0451ba31e32e7a  s1-04/interface.md
bff669406a84a03e5780c88fa50b4bd4ec94658e1379a3685bfe0a9a71a9f68b  s1-04/labels.json
238393016382f30c1ff8dfbaddd1dc9e0e02ff62221ed46afbf8aa26ef74e703  s1-04/oracle/ed73235-T1.ts
470f5a84ea0444150fea4b25b745887930944e4998cd374c89457e880c3af649  s1-04/oracle/ed73235-T10.ts
b0ee7416978047c448d3900e60b5a605f6e4a5169b5ae53e2fac1a742fe28667  s1-04/oracle/ed73235-T11.ts
7378524df856c5effef008959230125439e9cdc2d123e73e01be66c769940aa0  s1-04/oracle/ed73235-T12.ts
146115b20ff0c831ba236061f1a469e9baa3feaa132dcd9e47c2ba6fbee54972  s1-04/oracle/ed73235-T13.ts
45a7ebb134701a4b1e4cd44fdff7d78014a91d0b32ab90350c3600a868946e78  s1-04/oracle/ed73235-T14.ts
0330bb1241699fefdd5884f90d87818f2c4f9fb2fe2c70bffaad912c16ba351c  s1-04/oracle/ed73235-T15.ts
af064b4c84dcaf5ee42d3912baece902f0c554a1eeb925802110c68aeb4a3351  s1-04/oracle/ed73235-T16.ts
3b64d6b450cb9eeafc5abe8e309385a4f247e44b588255720624d2c7ef035869  s1-04/oracle/ed73235-T17.ts
8a66c24d1f89e6dc0205371d6e9b7f8fd982f9430b237feabd0b57961cc10617  s1-04/oracle/ed73235-T18.ts
b8309498aa3c3ecbade3eb674795dbba5d5c29b43f62ff2c9fd91ef411e3990c  s1-04/oracle/ed73235-T19.ts
2ea2a64663ea5a992475bc09036ada64dacac2cba709bc9b77096bc986bfe359  s1-04/oracle/ed73235-T2.ts
157e0fe43788e8f45e270eb308ce43769972cea7a25b48ccbaf0f1c380f7a7ff  s1-04/oracle/ed73235-T20.ts
801c2d1eed1bf68e69727b6c281d18d21bc56144d4a9829335eb6ab67b6b3718  s1-04/oracle/ed73235-T21.ts
c87147035614c269548f47775ac2aee53d80125bdc60defe4d8f312fd168f090  s1-04/oracle/ed73235-T22.ts
93e076aa3a906da3e42e7370bab9e6159a07badf05d220a215f78c8f4126b952  s1-04/oracle/ed73235-T23.ts
1cb766c9a21846b29c67d87fd14b89db1b0f4784ca015cbf00f6f4fbf5c09572  s1-04/oracle/ed73235-T24.ts
06ec61f7754305c57e376798051821c8b66ca1af32caab9e5951d546ab39e150  s1-04/oracle/ed73235-T25.ts
a148b9571ba5ba66147cc777771703a698c396c3284d7a1bcf539c7e6ad822c9  s1-04/oracle/ed73235-T26.ts
3868175e3f2a0f9098067dfde81abfc1a87787823e414d552bca19a50ce12360  s1-04/oracle/ed73235-T27.ts
3c0a0fe6ffa18f761d3246bc1112a1ceebcf92da8c4425e5379d6bb82700b5a7  s1-04/oracle/ed73235-T28.ts
c01ac7767b35c31182ac0e8e123b0ca7d78b6c61f1dccf519f5fc637adc05d46  s1-04/oracle/ed73235-T29.ts
87470cdabf4f3ced9a1e5e37c8b0e9203f00c35993c15c42e591379d4623fd70  s1-04/oracle/ed73235-T3.ts
aa48ecfa3829bfa88aee06a6828c0777f3b0970c46f3a568df7eac7133e625ab  s1-04/oracle/ed73235-T30.ts
8fe9ac2dbc800f33bb582c2fc5fe6a50a4b23d2547d2cd3f44bcf5d9cc5d3955  s1-04/oracle/ed73235-T31.ts
5a6aa3b3ddb12fe3bc8537f639fa08ede01ea536b746393aec8b47ae1d17553c  s1-04/oracle/ed73235-T32.ts
3b2589e864fa5180178239e8db5356c4d250f45d95abd2d2d68b0a2a4db59f2c  s1-04/oracle/ed73235-T33.ts
64ba85cefa8d5b0594619d50a77f650368aeeba9f6e8536cc6a21800b75ef926  s1-04/oracle/ed73235-T34.ts
5d25ff8cb21d9cf38a8d759c2a55e54d1a0e91a40c7f7d6fbd9291740dec36cf  s1-04/oracle/ed73235-T35.ts
f74eb7717b8915524c17a0d4dc1fb227c98b706b90002e145cafc68750df9323  s1-04/oracle/ed73235-T4.ts
35d4f0fd4994ad8df657e08a22c3b43a40818a9ff6380676e2c1776a415dd437  s1-04/oracle/ed73235-T5.ts
4a5a612d15b91e661b291c0299fadfb4a7f056ee522f456eafa35c29c5de31a2  s1-04/oracle/ed73235-T6.ts
5a76209e31405fbd1ba3fa01ed51f85b02f8426d11e25f4b671643633bdfd28e  s1-04/oracle/ed73235-T7.ts
11043d36ba418f0a1ef342b7553a60c0c557edb11d28c970213e640a6d42d22b  s1-04/oracle/ed73235-T8.ts
a73258eac2a576091cd6aa0080e65bcee9a6a29f499904e6e03884fee714b437  s1-04/oracle/ed73235-T9.ts
a88118f923a930bb5e87f97213829612c9ef363a4b3cedcbe1bb51a62af6a6d9  s1-04/oracle/helpers.ts
0837f9a6b1264bacfb80779d54e402e00f635cca5abba54ed8a61de7ae4eeedd  s1-04/oracle/manifest.json
7702c9b6339a2022837c8b87e940c4ae8db92df4231a869cb28fdf5988f50d10  s1-04/oracle/playwright.config.ts
b8af41ce8671a61115f4145329866277d323d7ee4b0b5f418fb66a6e20fb034f  s1-04/oracle/runner.json
c6afdcde94ab15604a6f0a0ee4289a6d5b7fee67a8413a13cd82fb7ca64130df  s1-04/validation-ed73235.json
d1192318d44a86a8db33c4510a6091483b501d7edb082facc43c3b10e7fd8c8e  s1-04/work/classify-settings.json
49d8c2b4f0e14a4b82b8f74a49c1063bbabfde2bcb85a7811212ab5552dbb3b8  s1-04/work/classify-split-settings.json
f8be862a44fe7bd2b036863483b1de27ea918c7dbdcacd2a8274fc5f95e261f3  s1-04/work/classify-split2-settings.json
468e5fecc215e5a911db1f4c33cbda8c976714f554694314e1b90718a8a3c303  s1-04/work/fix-1/ed73235.settings.json
84980567ac1dae10fe3ea4f69d9e74621869893138ef2cdea5643ed0ec1ca637  s1-04/work/fix-2/ed73235.settings.json
6a9fd42fdfe9e74dc0362df6d5e16e2d0e27260fe532bb65b850cfeb1d187d69  s1-04/work/fix-split-1/ed73235.settings.json
a5628063d4270d4dee8622548ad7d97b975940297e8d1350b4df2b75c241da53  s1-04/work/split-ed73235-T10/split-settings.json
de8b2ac47869d4578342b2133b31a7f6206dc9ffc6d6cece81f9903f264fd10b  s1-04/work/split-ed73235-T11/split-settings.json
fc7942c131ee8689dcc6e1603402affc535992647e13247a8918eacc5ef80100  s1-04/work/split-ed73235-T16/split-settings.json
4ff18c80b97a45dda873d0d4f6c58e19a95fdd70e7b4acf4e252b1879fc1d2f2  s1-04/work/split-ed73235-T17/split-settings.json
fac93867ceb14bf492ad3167b42a843aa3d57ca0e98a12b408f84c55ec1a1ecc  s1-04/work/split-ed73235-T19/split-settings.json
1a3adef48aab2fbf607e62ada22b1a37062bafa5ff674a1b81fd83bd353fe04e  s1-04/work/split-ed73235-T23/split-settings.json
db60c3d1fe4e426b48df40768c4e51317f58c3fc3fb06d09f5d483152eb49f98  s1-04/work/write-settings.json
4ab40f5516aaa1d46bf99d403bb78f4ee4b6f05b2137ffaeb1d2058bef42af64  s1-05/agreement.json
4520cd64bbd4d9e1aba57fce469287b10273d1286e6e29dd6315f8c1c8c2f386  s1-05/classify-1.json
4520cd64bbd4d9e1aba57fce469287b10273d1286e6e29dd6315f8c1c8c2f386  s1-05/classify-2.json
7e287dc133111a3bba74de5aa611c40057c59414fff7c5c34a0cab39542e0742  s1-05/classify-split-1.json
7e287dc133111a3bba74de5aa611c40057c59414fff7c5c34a0cab39542e0742  s1-05/classify-split-2.json
a7818d679a2d05657de841e09c9ea481e0c55af9c25742f429c86fb50248c626  s1-05/input.md
15845d79c6caab7ac3f244abb8d664d496a17cc1af85bb8828c726ecdd1bb00c  s1-05/interface.md
1a6ecb537fcb5fa9e39dc1553c9708ee8ab0a5337acdd54ecbf0d493b76ca227  s1-05/labels.json
2566596c5051147d875c51ddd38da46f5747b3eae20ceabb629f829ae9b8fd57  s1-05/oracle/321a2fb-T1.py
8c55195e6249cb76aba6e78b5b4b6840a9f511253c6aa64ecaaa3b4e6b08d7b0  s1-05/oracle/321a2fb-T2.py
184921cf91a159999f0e299b99690ed576b9268b0ff21d2b48b435c0c556aba4  s1-05/oracle/321a2fb-T3.py
316dc9a503ba4a979b3183cb4058c7f99b5f8eaf9c0a2cbc1cd510454c53cff8  s1-05/oracle/321a2fb-T4.py
170aca90773ff34865180fd11166acbec5ad5ae638d5c8e810bea784717ae255  s1-05/oracle/321a2fb-T5.py
4503d02ad1600c4f32268759124762d170b84f6593bd4f2cc6caaa6da9e10e1c  s1-05/oracle/common.py
518c829c271fce3fcbbec970a919682683aab29ea09c62842d1a478e5f74ef07  s1-05/oracle/manifest.json
94e8c6c020f96bacfe9801e3e95b7b1881d0920962b5609d179002dadd390526  s1-05/oracle/run_checks.py
9ad634635cf832d0efe1b69dded7d426eac1d09e35576f4a6f08ee6837f15bd0  s1-05/oracle/runner.json
fc30407887d1362b12e4cd900df5e333ffe57dfabf4229b3f95300e44e4973a6  s1-05/validation-321a2fb.json
910c4d625dc94e0d9947deb5209b0b2ed9113ad1795a071ffd7994b163d7802e  s1-05/work/classify-settings.json
05a0c2e2e76bc5599464f73e83dab76ef38c3008c9d4c1e92437c738333820db  s1-05/work/classify-split-settings.json
e0c5b31365773aa1d93c5a8feda4850ae68712ac9c0f64bd80605c502bd92770  s1-05/work/fix-1/321a2fb.settings.json
1e49c01b73b86428e85f8b313b8ee5dd255986a14e9d5b47f94e10a67e759d41  s1-05/work/split-321a2fb-T2/split-settings.json
fdfbe93059d78ec1c64df6a5003ed5b1701141e1875dbc1582ff3fa7a372c8cc  s1-05/work/write-settings.json
e4132253fa24f0109818d6bb7591087aa63b737c4f11b49f6d82b4fa606f6148  s1-06/agreement.json
22c435b568cce44bcd62004ee21deaecf23769262398364673d26f707c3f423f  s1-06/classify-1.json
22c435b568cce44bcd62004ee21deaecf23769262398364673d26f707c3f423f  s1-06/classify-2.json
b6b4f20a9f5cbf7095ad1222f2a42cd5de057bcd6f99d9f0108f2402586ad41c  s1-06/classify-split-1.json
b6b4f20a9f5cbf7095ad1222f2a42cd5de057bcd6f99d9f0108f2402586ad41c  s1-06/classify-split-2.json
9af79984036175286f928289c7734b1715b5e23df6fed1e4634f543a594e7e8e  s1-06/input.md
76052ab58f3b8c8d66c4cb4e7c06f0180fb8dab3d073005aea23432bbd2631d6  s1-06/interface.md
8ca03ac1dc22ed5f8341b9a863f48058f50479bb56ddccb8fd9a65c30d974e68  s1-06/labels.json
14bdfefd8de0ff9fb72101386ebdf154bb319760863b0325a3cfd43064c41cd6  s1-06/oracle/a564539-T1.py
e9c1cf2096cdb384727dd26c7f8bc16f2a596d6445a47c730e16f579a9d7ac1e  s1-06/oracle/a564539-T2.py
9a07c60a793e05cb46bf58d8875d9a1800ec0918f7284c9bf56f22090207204c  s1-06/oracle/a564539-T3.py
8df92365c7359eaea4575319708ef0d3ae81801894f62cc2d3e70c4108134681  s1-06/oracle/a564539-T4.py
2af651adb8dafe3411147eb5917a8fe1712399646878c88dc1c766c1a31f7ec2  s1-06/oracle/a564539-T5.py
47cd25cbb230d423e062d7345b16362808b67e7399f348020576f7fa82f58bb6  s1-06/oracle/manifest.json
f780c609fac74e2259596ad5158ad705790a44a9316211681272275eb13a6352  s1-06/oracle/run_checks.py
5a86be1cf5e3da91e5c31a136f5399b9ec76f3160da9e84b04c81291d3796355  s1-06/oracle/runner.json
2b6650950623856a31df06e9be0a87ef367ba7f1038102bbc36b6b8f6a008c7c  s1-06/validation-a564539.json
cd041a60b3111d6c1493169c3e83dbb739e5a25e39570c272116eaf8a54a026d  s1-06/work/classify-settings.json
9ff3069b420bf92a6e8cedceaf0814552e2d250d852478a90f2aaa07980599a8  s1-06/work/classify-split-settings.json
be1ca4f1d411ef4fe64387ec2b0e749538f86b2940a6a763ae69028cd96d5450  s1-06/work/fix-1/a564539.settings.json
277191ea42e0d40445a6d89ac94f944d8e63ea005cf1b72116a63ae04b9fbd3c  s1-06/work/fix-2/a564539.settings.json
ac96cf8b90a0f866bba2c5b0a72c1fa1de022b41625d0cbb1b95d36ffb8cf306  s1-06/work/fix-split-1/a564539.settings.json
6942f6a3fb3909927f9c925fd7b728b38e36aa8728626b2a409c7416eaa135a5  s1-06/work/fix-split-2/a564539.settings.json
1de56669468b4fecfadfc5991893fb4c3e43c4a5408c60d5726197be25dfa279  s1-06/work/split-a564539-T3/split-settings.json
0dce468f1498679ee643b482ecd3b5d0ea1491fe21e5a03f707b99b8ef51f33d  s1-06/work/write-settings.json
63e851735ecf35ec4da6b33040fe1809d272001ef09f01f0f612138454648fe4  s1-07/agreement.json
c6812a97bb5df491b00246caf8d1b2e918db779283307f1cc792e2630c619f01  s1-07/classify-1.json
c6812a97bb5df491b00246caf8d1b2e918db779283307f1cc792e2630c619f01  s1-07/classify-2.json
ba7772e7ceb8f5555b6558011e75f7605191007e60eb5a1a542b6550adbb3116  s1-07/classify-split-1.json
ba7772e7ceb8f5555b6558011e75f7605191007e60eb5a1a542b6550adbb3116  s1-07/classify-split-2.json
6665fe50b0416be04c74540b0b96236cabe26dd49658c92bbaf86bdd8109bb1a  s1-07/input.md
f5f027c7e989c4c1209f22dcdd367406de77436c9b37d2c15e7309afa525bc08  s1-07/interface.md
9c5a5848ef070cf1b1c5fdc8f169c2de882f918473d556ace087a637ddeed4ed  s1-07/labels.json
55cd9bfd7dd607420b4ff0b34532f6510d2c5c3552eb71fc8b6293a0b7febd6a  s1-07/oracle/common.py
3bfb6169147c62cb7c2f888760e08ee3657f9e82891a4f11bb04d8f57f8846b1  s1-07/oracle/fcf1ace-T1.py
3295ca862d87ea791d23441c65a5d095f3c2bc2ed206eb46d94d699732138b26  s1-07/oracle/fcf1ace-T2.py
362a43b671c55feea8cfd2c9c18feed44a00cc2c199639c23ae6d95fdc771cdb  s1-07/oracle/fcf1ace-T4.py
467ef751d3c9c8a5e991abc61fa729b1e84710ab95e1367d014be34d52f5b07f  s1-07/oracle/fcf1ace-T5.py
b79a4d12218513b6bbc97d0f79369d9d86600b4da1bb3f310b5e22fecd5b51cd  s1-07/oracle/fcf1ace-T6.py
61969e890671f6ab86ad3c124bb967ccaf832a53ead45595ec87889f3f4b3485  s1-07/oracle/manifest.json
911a25983e192c93d82e9aee37257b4a522f6e55861a065b9481a204a990374e  s1-07/oracle/run_checks.py
50a2af7af73c9e0d319c40216735800da78243e33f93e9c7ee362e1a16626045  s1-07/oracle/runner.json
bf9c1bec32e8d9697c2d5f96ff0e6eb126106117ba262bc6278e6a4a997df5c9  s1-07/validation-fcf1ace.json
4e042837346ee924514ea7b6686df9191ae5b05ed7eb62da17777feb730e694b  s1-07/work/classify-settings.json
3303ff1342fb68512a08c523edc20256e7609e03475a3caab4faf3e61d5495e5  s1-07/work/classify-split-settings.json
252d9fd00a2365ba63fa64d18c56cfbcc356f62570eb7005bf85553a2c66903e  s1-07/work/fix-1/fcf1ace.settings.json
cc7571f4103af968ec1298b94767e9643157134c6bf3db3d99900c375c211232  s1-07/work/fix-2/fcf1ace.settings.json
6ecf566c17e902ad78b41333ecc4624c7420b9e0285806706738bbac965ae4e1  s1-07/work/split-fcf1ace-T2/split-settings.json
b207d403478d2c5dc84e767f95bd3d91e02a0c26ca8efe021615392b5d921470  s1-07/work/write-settings.json
0055122d821463a503964373930213a38d97a61f655fe18503c7088d78900d6e  s1-08/input.md
ff7b7bcd12990e182a6ccc0061acee570ec878952eff3fb53631b0e9ed1e5670  s1-08/interface.md
627b4d12b711544ac259e5c0c93eed4209f912b41a45999528b6a333263d5d20  s1-08/oracle/manifest.json
6b50318e1ae97c31c1af346f25b54f1e965d38dc072be118af55b415be6d99ba  s1-08/oracle/runner.json
b0be6d412a972bdfb2f4a366e4bb66438a5a8eef658c77eea7b3c6bd2a3154f1  s1-08/validation-3f2c338.json
11b63c0db200470f0641a7071c56a72afd1bb9fbdddec1439f364b17e3dc856a  s1-08/work/write-settings-2.json
c75efc6215f50b681bb56d98bab749d678bd4f27da0e910e1c648d21c2235b5f  s1-08/work/write-settings.json
50ab9bcb7d6cfa84b866703eb31bfd4066c9d4e23be6179f34e9f022c532de6f  s1-09/agreement.json
ccc040a3a32b35171af971da2ded1d1541910f22fd317790be8ce3d653b7fc86  s1-09/classify-1.json
ccc040a3a32b35171af971da2ded1d1541910f22fd317790be8ce3d653b7fc86  s1-09/classify-2.json
83a3d1de3ebf0ece27d3a05e06ff94d434cb812aa1439cc2a0b38e3f65f3ba84  s1-09/classify-split-1.json
83a3d1de3ebf0ece27d3a05e06ff94d434cb812aa1439cc2a0b38e3f65f3ba84  s1-09/classify-split-2.json
fe3fa5ca7a8a5cdb2b39793e32a050343bd2ee9bfe15a3b85a2b2e842946cddc  s1-09/input.md
e7f22dc1e3fbba56944e64dfdd567eb9e07980bc9dc595c349e00befed0333d8  s1-09/interface.md
4c9918034e13eee56308cadd3f22624601a9a2e854cc6f3a0a3cc04ffa473ba3  s1-09/labels.json
5a254909c7974a6ec1c01b05177a51242dcbecb4bb337fbe871f1fe4b7e68caa  s1-09/oracle/e913d1d-T1.rb
90cd4c282c6d345c50d0768d6ba77fce32b4783f77eec42ebb40625794eb12c6  s1-09/oracle/e913d1d-T2.rb
b8f907a1ddf45cb01d9a39f43ce64541067937000565d89ac4170e6140657300  s1-09/oracle/e913d1d-T3.rb
2c522321c2c5c446352af8c66cd6d0dc9939f145382d9f2bf4b3616726b41fc2  s1-09/oracle/e913d1d-T4.rb
27e0f237aedefb4bdf38e80f388b39ec4f5fbda40bce837c0f72a8d06f3203a5  s1-09/oracle/e913d1d-T5.rb
4c6fc325efbfa8f33ea7a942396d62537d0cc14390aeceac2cb2eff2774f1ff0  s1-09/oracle/e913d1d-T6.rb
a7cd670d2d0c253de9c93f590053a8938b5bb54cbf119c67702746ca4a33d2cc  s1-09/oracle/e913d1d-T7.rb
2c17c8dd0cf4e133f9f19f7b1f2e963ab88f7d4cd0a65a675a8fa96874082ec2  s1-09/oracle/e913d1d-T8.rb
e8709624d45480192497896e4e95b601a742111c25185ad31ccc353dee407ad5  s1-09/oracle/lib.rb
709815418c112705bb6a959d837a5217240ba5679a76c7043331eaf978995e7d  s1-09/oracle/manifest.json
c9fd32c5f4bbb7fc9e96c9cd629b9a26cab10b27708f1c6b4e0af9dfd3f5372f  s1-09/oracle/run.rb
24538bcf3bd5b96ce4d2c4193de1ac4232cf0295900a363dd6365025594423b5  s1-09/oracle/runner.json
19892616fbd3816e2aa2af599b17f0633c52b04e79d72f7537be21d2a67aae9b  s1-09/validation-e913d1d.json
07c92c9ea965da81d64d1d31fcab2390997bd689191801bcfc367607af5a4c91  s1-09/work/classify-settings.json
91b9cb240c0c84aeaf9192a081e86f823a0a12e3d959025caf81e7ccb1c33a7b  s1-09/work/classify-split-settings.json
1a878678319d04cd7675db316db13a15ad9c6faf8f93023948f97aa6b5b2a88b  s1-09/work/split-e913d1d-T1/split-settings.json
822b0e73001d798070aa2eddf5df3c156ef91de17ea189e360898202ff4aaffe  s1-09/work/split-e913d1d-T2/split-settings.json
1853a4cfbdea0a8881602aad1408d02bdd0008836f813ef2ba2b23944e39e952  s1-09/work/write-settings.json
77fd2e11ad4b5076d7cb7df718f106c6b8a8b89485606b41cdc725be5876d34b  s2-01/agreement.json
3775ab4eb82470b2963e22abdb50c119d1d16bd9acd783a062b1be7c0ab6987d  s2-01/classify-1.json
3775ab4eb82470b2963e22abdb50c119d1d16bd9acd783a062b1be7c0ab6987d  s2-01/classify-2.json
721f9dcecb4145be7826fc0386023c27b05362f0fe547815ef50c2212c5f2f5a  s2-01/input.md
31524b9ff42c054334ff208b3aa121a5a0d7907eb5f9faa5b61f38da240c2ce8  s2-01/interface.md
853b64e84d8502faeb66f7ff419aabcb011a142160861ced4b126514773ee07b  s2-01/labels.json
69af296c88ee40b845bd8fa215c26dc71b71083b390784f701ce02309500f6b5  s2-01/oracle/fake-claude.js
d3d91ca7729428f3b525aefc07db57007afd215710c5937cbe7b936267923fde  s2-01/oracle/fb56f5a-T1.js
1e75dc0906557b3db559540f3959f8c00b00f6e9701183379ff5b0003daef3d0  s2-01/oracle/fb56f5a-T10.js
becc5297a005c81a3baa5dc900fb82b4bcb82bac3461880fe7f35992df44327f  s2-01/oracle/fb56f5a-T2.js
bee0dd554eafbb38b48c08d23627a4089c7c29d59fdbbaebc919d8fb988f6934  s2-01/oracle/fb56f5a-T3.js
5b6fc380f66da83cbff72cd27afb238022b2388c4e877b65d61a8453deedfb25  s2-01/oracle/fb56f5a-T4.js
36d9d6bc41bb5a85ffbbf5ec03650a3a59f6849ae167e0a3127d70d1fa942fd7  s2-01/oracle/fb56f5a-T5.js
50208082a1b9bfd00be979baaa42cf42f45193c5d8186adea02c7ca89696a62d  s2-01/oracle/fb56f5a-T6.js
e0222db5db3af1bb1bac2aab7415f4d8208fcc63b821025db9e76354f040c246  s2-01/oracle/fb56f5a-T7.js
2e061611b35e0aa0a31801fc7396b4c44e9f3ef9c4b990adaf3c8d0d9395aa24  s2-01/oracle/fb56f5a-T8.js
75d7b0b9a1f24f29bdfc2e5030ba2cad19b5780fb832cb01947de907af43723d  s2-01/oracle/fb56f5a-T9.js
241344c2231dfa28f0d66cd978bc3f170056704f69edbefa1371be3360c77065  s2-01/oracle/lib.js
6c43c80cc3b3b0bc58c169fb7c7d31482ee8d32fb4ce91ff993fe32ece644456  s2-01/oracle/live.js
96aedbe31fa463e22ae790458ed32b1ed0f392f4a43f33ba641734b6c25ce1f1  s2-01/oracle/manifest.json
af024a32115c0c95b03df2d667ec170fadde6af7d16f70506a2021d47cdb8294  s2-01/oracle/run.js
1036c719cdf737a73e9e4ac987a74c54d61cbd04ab6a9a0e0db0f1b03f5fe470  s2-01/oracle/runner.json
e3f2254cc879c9234eca44f7ad9750bf382c484742977fcbbe5b3a4ce027ee49  s2-01/validation-fb56f5a.json
5825bf17bdead00b9ee6d269ba0dd5991e4f45e47427312a232661df9d53fff6  s2-01/work/classify-settings.json
52a8c34c1bb0ca8ab7aaf0dad480651bc2025418408cdf68435ecfe576e343e5  s2-01/work/fix-1/fb56f5a.settings.json
05ab2c50d43bbdaa843854d1f671c0a5a84b423c18701fb10366abe0d7977bc4  s2-01/work/fix-2/fb56f5a.settings.json
4af35c5bc0271a3d3c65f579c785d41f5897675362e0416137a9170293d978f5  s2-01/work/write-settings.json
5d22007a28c76e5b596ac25c2dff899dd9cb73788a7ff53f2c2b95a9cf9587e0  s2-02/agreement.json
7a8735f57aab85aa576b48e26833068914da15d044bb960921cfb1362054fde1  s2-02/classify-1.json
7a8735f57aab85aa576b48e26833068914da15d044bb960921cfb1362054fde1  s2-02/classify-2.json
7adfea65aae7d71d869ab90c5a72a8646e2bb02415a1a25b512bc4fcc254a75a  s2-02/input.md
b4c94a018531d0ab73dbfede76b16b4ca414a3de1c362d84cc056ee8bcf6621b  s2-02/interface.md
4005c94d51a7094c08af02e234265c3365d5f214a45e4c1012f77cefdefa352a  s2-02/labels.json
17f41fc8f228f833200b31062852543b6f484fac0df984fdaf3cd107e823d255  s2-02/oracle/11e478f-T2.mjs
87df58a065aa7387218ee12d1303174d8d03781801a0f5e59fe733bd2d4cbcff  s2-02/oracle/manifest.json
9700b54eae9f625897636946af98b402a00496a6602d7b86769b19c6f310a4e1  s2-02/oracle/runner.json
43becfb0fc5b5a91847de4a04639236e4531c92ff391972e47fcd05f2cdd7e84  s2-02/validation-11e478f.json
d70845304f14940ecb9595c82a4550dfb0c302b78304742db76c1417a966ec88  s2-02/work/classify-settings.json
5bf2f1dd11239ae68e67b12f4dc16ace50504710353448fc40dc8dd40d76fff5  s2-02/work/write-settings.json
c52cb62b9403419916e76016100d30709b6b11f849f153e13725c124d91778e0  s2-03/agreement.json
02bc11c325302e395d9bbd3db0b8102442acfc5fffa39fb728e7ff3092e45362  s2-03/classify-1.json
02bc11c325302e395d9bbd3db0b8102442acfc5fffa39fb728e7ff3092e45362  s2-03/classify-2.json
ed442802bd3f7af054247805354a76f08647cdd09cc2034ccf8111a0fb7af5fc  s2-03/classify-split-1.json
ed442802bd3f7af054247805354a76f08647cdd09cc2034ccf8111a0fb7af5fc  s2-03/classify-split-2.json
78301bf7371b94c07f89db7df6549c0a8da59bacdb40eb9df717e52d740c76ad  s2-03/input.md
02301ff960f80808f7bef026dbb8a1cd6b05cc8372a88f91c46f4c231b8effa6  s2-03/interface.md
dce5a125eff134227219ed543b429eaeb1c711014e81cf03fb289e50213f9146  s2-03/labels.json
32fa4f3b64dec205255f9babc92e0fded9be95ebaa28251c23166b136fc28723  s2-03/oracle/2771419-T1.mjs
2c51b3f00b47dfe60f9ff2a030ecd9a2c0e2953652380f6a2a765dc375918365  s2-03/oracle/2771419-T2.mjs
da9d60e93c08f6f7be341906db6f1de39ee8c8980a43f2693513f440dd0571e3  s2-03/oracle/2771419-T3.mjs
8d8fd780e14325c8a652a721559da3bfb762dde267066240fc046dd737ac9495  s2-03/oracle/manifest.json
e302a6b2d27af938c59ed77cc45828fe21c96a98f64fba9be4e89a8935dd417f  s2-03/oracle/runner.json
0eb24946c13ae7320f47405092f5cfa58e5a3a1f80ac9a4d14ac123cc3aed9c5  s2-03/validation-2771419.json
ddb99f9a0aecac7e10670f6c5b1a46a3189fb47de46a99a95a64702cf98d726a  s2-03/work/classify-settings.json
211cef08b8240efac4f66a353fd0f3cae8031dd5d8d5163b81852b3d2f77b5e8  s2-03/work/classify-split-settings.json
2bc8908bd03d347a8a1a404c7bde789d4af18dfb7a4ad6cad843659a8ad515d5  s2-03/work/fix-1/2771419.settings.json
407762bdfc09da2f5e615774047f89668787901e3191c8e8ddd7e8447e710f0c  s2-03/work/split-2771419-T1/split-settings.json
60cb61242ad3054b1854a44aabd9d05d19b362e0105068c0eb46f877b418684b  s2-03/work/write-settings.json
216fff52cee63791ca9ee6a9b1ce6c67dc0e28f90ae6374e53cf4854a7776826  s2-04/input.md
334084616167f8a8da613469faa865eae5c183c8edf0e410c284f91292b4b6c5  s2-04/interface.md
8becf2797be4d7d867eac4db90a2c10d929744036db73196f87bcb2eea38d3d0  s2-04/oracle/manifest.json
2bab6fe22b687bff026b66083ea24cf374e02afc576a60beb9d74fbba7995b6e  s2-04/oracle/runner.json
52d0581892249221dd215743b90493c861f47c0a998be94c3528151a4968178d  s2-04/validation-483fce9.json
e39a23e2db6f1ad4ca593ba3603519174634e3813ffe1bc8e7d95fb529cf0602  s2-04/work/write-settings-2.json
ba917ff77d2f3d5384f9294a048b789747bc6f2bd95414d00729358e79fe0c23  s2-04/work/write-settings.json
5680b9b8faeeeb40c2bbcfe4c734afca754e13ffd096fc591ebeaa92baaa3794  s2-05/agreement.json
cb2d418621a61ebd494a51693ec7cbb296c1f3c2a85a596bc0032e95ee6bcdc5  s2-05/classify-1.json
cb2d418621a61ebd494a51693ec7cbb296c1f3c2a85a596bc0032e95ee6bcdc5  s2-05/classify-2.json
9267525750305255d0a464231a66d76306cb3957ab904adf1db05eb2022b2ed5  s2-05/input.md
04ddcde6b3c25b12fd211d265c93b339739382cb4a67387b5d9a42d89d760a92  s2-05/interface.md
d3a850e5109b9c2944e2f3323d37fc883b0da85dec8f3b96f792ac796c94a739  s2-05/labels.json
6036b8e56f1143a7c827c0fea5cf08be7ee7524f51c5e78e12fd26d9250255dd  s2-05/oracle/9f88dd4-T1.cjs
bbc6582e97b70b1fc3bdf3018c0217626a312ae179d6602bcbef6f680f16ad52  s2-05/oracle/9f88dd4-T2.cjs
f0bddbca4b4cf599c526d67372ae82713512191d8e360345d7ebfd9122fa16a1  s2-05/oracle/lib.cjs
7fc9d0111066633e7ed4d75f8991a3b73763a680bba924a494288c2b096f25c3  s2-05/oracle/manifest.json
bf191f86488dbf161afeffdc0c7e3df4e59426688c39ef991796747311cc9bb5  s2-05/oracle/run.cjs
065e255eb014c08b328293b3ab85de774baf190aa51ca2e83c43375318ed3b43  s2-05/oracle/runner.json
5a70c6c65000ea56255655e40bbfcd7fed9b4311037caef77766a7f631d2a46f  s2-05/validation-9f88dd4.json
7e6aa4b345a9956b608af0013583936c7dd63c714ce2b9376cefbd50305d4c30  s2-05/work/classify-settings.json
d429419e12d0d7ffed52c2a29e20893ee8554eb93d7e37d85e0e54eaa642f3b5  s2-05/work/superseded/write-settings.json
d429419e12d0d7ffed52c2a29e20893ee8554eb93d7e37d85e0e54eaa642f3b5  s2-05/work/write-settings.json
1aacad14c6088d7ce8461e57af4973ee96d8396194ded2f55701ea056e24eb03  s2-06/input.md
8e1f1aa173a4b959fcdd5a7576e97a444654440c89322b6530238b71b57efadd  s2-07/agreement.json
e383271a69fae54ca792ed56866acdd8536f202eab1d552e7a30d53bda0e904a  s2-07/classify-1.json
e383271a69fae54ca792ed56866acdd8536f202eab1d552e7a30d53bda0e904a  s2-07/classify-2.json
e1d2b75352ba1c545cc23ae02fe96713dca17554d91babf1d166007ebc00bd5f  s2-07/input.md
c11e10f42b37f1acf19295f33f4c5b72a3cdf1f17021f9995f14dbcaa8e906f6  s2-07/interface.md
5e9d5941e69554a8759d7d0293e61aaa858bd679ac21fa4c838cc2145d038476  s2-07/labels.json
72bc26e4e2968d61dc4552602e02997dc195bb31966d3c95e0c4e978158b3001  s2-07/oracle/0248b63-T1.js
8f129e2b2139c29a0ed01057fafe220432ef5cfc1ab706cce7743da07ed2621b  s2-07/oracle/0248b63-T10.js
65c33bbd3f311546e19f2d23dde54386dc4953fc5ce402f6198e3f83af0bf4d4  s2-07/oracle/0248b63-T2.js
da58f8d12e9081f8fda2d868a8a7f72c72c61822f3d6beea21f0be1c05de38f2  s2-07/oracle/0248b63-T3.js
ac2d7c39e64c98e88241d9e3b2ea2d49277f1cda79a9fc889e615363b608cc03  s2-07/oracle/0248b63-T4.js
c80d7995c33d8bd393aa61df53a315d7d304e7edec3e3ecb4f0244a7b04610ea  s2-07/oracle/0248b63-T5.js
9c488a3ba76109ce400f683aff84d56d8263f4c85ed5ab2e81b754418146c15b  s2-07/oracle/0248b63-T6.js
79e1636e8120212272a43f1dcd09b91a3efbdf677954596e073b1a8cdb2a7cf2  s2-07/oracle/0248b63-T7.js
479a77ae2f719afc183f2b2af3915042c972ea8545cb8ba3203503ffa5926684  s2-07/oracle/0248b63-T9.js
547fdf14228a2ea3f972f65e3a6d9ea6548de42163a75edc44f0e7b0e6dc51c4  s2-07/oracle/manifest.json
d863116756a436dc4645cb9f26034b1b519f5b92f6d09e8083ecac0d3d032dfc  s2-07/oracle/run.js
a057e54227b07f5e9784b915e42dede5dbab9d2d24780aeef4dc5bcd7b55057c  s2-07/oracle/runner.json
efdb83b75055c93f16c2a9d46dfe2cc8831619a5b9080c6af2f997b21737665e  s2-07/validation-0248b63.json
bab9d4e696d2c43b5114cf5b2cc32806f7eab53341b050b75bb76f3c48c71d95  s2-07/work/classify-settings.json
d401db7ecca6f9d820e300d3a791190037e0f5984ab8a87aea24a9ad28133fd5  s2-07/work/fix-1/0248b63.settings.json
f840d7474d5a9251db55c6ee11be94db59bbfebd13a54142471cf0eb1c042b1b  s2-07/work/fix-2/0248b63.settings.json
4d36b75d67c39f7f2d03c3c442adcba27dedfc0eef5c65a5512b140fa0ec00bf  s2-07/work/write-settings.json
cf7cc792a2b670889eb05917dd644c67abc836854e8fbf20fcc1d8fb893d7484  s2-08/agreement.json
fae7bedf9e08564604884553c023028900c9fcdaf88ea329dcd42fd793b2ed30  s2-08/classify-1.json
fae7bedf9e08564604884553c023028900c9fcdaf88ea329dcd42fd793b2ed30  s2-08/classify-2.json
a068b7f684bdece3d0592643d519b76a40501ad38eed2a2aeaa06497b9f7f193  s2-08/classify-split-1.json
a068b7f684bdece3d0592643d519b76a40501ad38eed2a2aeaa06497b9f7f193  s2-08/classify-split-2.json
562b0e842ac66d6b7d0d9aea9d3efc4168fd7322abeeb312f2f8c71c9d683dca  s2-08/input.md
1ab04ffb4016c239b06679fc5e30daa73ae41bd383e2eac1586ffbd9acea3b1b  s2-08/interface.md
4da122650d8ed41332d33560840842f6aa230fe48831b262da0287619d85e26b  s2-08/labels.json
16ec450f7b5affd59eae7fe9b7f89e3418ba66d66b8d87b72bd5290f7fa4fa54  s2-08/oracle/22278be-T1.spec.ts
f1227e3c3a1c77e008dcdf6fc3c7594dc99f16a1f8b8786430ed052481d8e2cc  s2-08/oracle/22278be-T2.spec.ts
e4db84f882e54f289e6d92f294a773b6166a4e46aef603dc7f92107007501bbe  s2-08/oracle/22278be-T3.spec.ts
e8895f8090910733bc6b83eaac1f17889dab404a20bc6e8f923a4fc3f942cf34  s2-08/oracle/22278be-T4.spec.ts
e0c962b23146651d839eaa1e002c6eceb9069e646aa2c32bb1c8cd5fcb85d8ea  s2-08/oracle/helpers.ts
9552c8e907402964528100f2641261e3f5db6003041f4e2b0b44af89aaf540fa  s2-08/oracle/manifest.json
f3ca2c77621ba5032c3aed5a5f66344600310321fe282b58f677a5e2d7769a69  s2-08/oracle/pw.config.ts
c6cd3cb2901533a5d3ee36863521a96b7d745d6a0c88c02d0b60b7713fa750d3  s2-08/oracle/runner.json
d9305f3c0bc7b217c57355012c0dc3d986b2b0283546274bfad74d8646364ac5  s2-08/validation-22278be.json
946a6d5c540853c8713534a607043df455a2241be5bf529b225aa7bf268c6c64  s2-08/work/classify-settings.json
f00bc0e7d091e834a63c89eb88041c75d678b1086a39384b4bc61682a3a52345  s2-08/work/classify-split-settings.json
565aa0e00d8bcc2faaf22519d128c3c14a6455305e8f23f346fe60c7c3cfb084  s2-08/work/split-22278be-T1/split-settings.json
cb03012bdef1eeec00bdbf0bc6947c7f3efef5a75fddf9995328483338977f24  s2-08/work/write-settings.json
bd349c5f4293fabfcdcd106e29ef52282608c2792981876c9696d5544895e551  s2-09/agreement.json
78cd0fafb4a41247d0b398a1abfe432fbeca526a19bd3c9e09d1547a51a8a10c  s2-09/classify-1.json
413d09448d6f119c44820da311a9f41a9a7c7153a8c995bb60a1e7d21868f6f7  s2-09/classify-2.json
93990cc75a9e5f2b135428b62839893200a602097f9970349e300b921a94547f  s2-09/input.md
aca45a51b9c5f99ce3bdb6988072226f481034bde3dccb58b318144df54dc12a  s2-09/interface.md
f6158acc4c35264de8ef5a480f1ea35ec58b45360f4bee8c3b9093ff40bbaa77  s2-09/labels.json
011e968be2e33e144115d244e0d8a7049d6ad0ef2ec39a1e035e58308f58b7e8  s2-09/oracle/11bb3ba-T1.mjs
4ac6f8f1b79eef7f47b60d0521717ab28d50482e9ee2e070c4ff0e5f261adb05  s2-09/oracle/11bb3ba-T10.mjs
6811288f07b4f0440672a72a559160f2b022031c52aba02ac5ec57658ead9289  s2-09/oracle/11bb3ba-T11.mjs
81a7dcf9b33cd23ee951a21a184b23d8f7f785a07457227ca9fb1d9909434cb1  s2-09/oracle/11bb3ba-T12.mjs
846a1933886a24e7ea4492e402599b8f23dea2841943b8e60d38630eec5449a6  s2-09/oracle/11bb3ba-T13.mjs
667c12507b2336c6dac28a332b7bef789cf783fc8e5cf33205b79c23264b9eaa  s2-09/oracle/11bb3ba-T14.mjs
7af30617d06b9151efda364084a6847620320f357f88895f92662e70d15edfeb  s2-09/oracle/11bb3ba-T15.mjs
0542f09872048ef4b85e5ae2e8fc45aadd811304caa379fd9bdafc505363f4b4  s2-09/oracle/11bb3ba-T16.mjs
b75a82d64590027d404ca8bab36088ec66b1785a081b1b08aeaf1a111118fc6b  s2-09/oracle/11bb3ba-T17.mjs
2760612cf2ca4b639b012ec5017c4c390312e91e91f00cf2cd06a85749e5610a  s2-09/oracle/11bb3ba-T2.mjs
48d98d43130b0d7010c482e8be375a3033a75a22668b69d574e34409f6a76ec7  s2-09/oracle/11bb3ba-T3.mjs
46b321b4d1115d2ac65bce03b92c1b131310b83efeff3f227186c049f64c1df9  s2-09/oracle/11bb3ba-T4.mjs
366fe4fd576be9d2372751511499feefc0b9be80da25ba202b8372da5736a2b7  s2-09/oracle/11bb3ba-T5.mjs
f46f770c0f7d56f7e49b94135b427fe516739f4cf2ef928cf4bedda7e50cd136  s2-09/oracle/11bb3ba-T6.mjs
2f8494649ee11df6b80147e882fcc05e6e41abe833d53316c43c9ee7d112c5fe  s2-09/oracle/11bb3ba-T7.mjs
7f4f58e3c6edfcbc12477d1164b012745353e09ba688ecb9b4b419d518663625  s2-09/oracle/11bb3ba-T8.mjs
1bf95f25532187b5de7f62643dc1f2c436272f4d2d4459241bcabdeccbab6cfe  s2-09/oracle/11bb3ba-T9.mjs
f606caf1b09711ad7d9fea6745d29643997abc0bcea5e5aa7e4f5e8dce17a9a1  s2-09/oracle/lib.mjs
25db0885e3195e416bdbf7c10e7d279ad82dd6320a8e93171100c36bb18a2db1  s2-09/oracle/manifest.json
0782fead3290ce417d6318b307f3920b54106c2ab8cef5008542a664a6f8a437  s2-09/oracle/run.mjs
404b3097ce1c97396669f85153ab2c1a720e8779c153ca3369f27a19e8d65b77  s2-09/oracle/runner.json
65ee7e222f91f56ed3440de91a486fb60b99065f9924fdb5f5d90f7955c5951d  s2-09/validation-11bb3ba.json
23691911368e6f68e68f8727ddd185f4c6e27dcdfae0baeadb6b1e91ad901948  s2-09/work/classify-settings.json
674a452134075421e2b315ccfbfe4d6fe4cd4b3afe5bc52b1e6e8219a3d960b4  s2-09/work/fix-1/11bb3ba.settings.json
addf418601b3dab9a2d0285e82f17a71bed64923602f6da89ebe5eb13d2a8232  s2-09/work/fix-2/11bb3ba.settings.json
836de31aeed91b24c09679e3ff9a446a80e8bf1aaf96ac459d6d0899c4b5bef1  s2-09/work/fix-split-1/11bb3ba.settings.json
df9675fcc13433d330ab0a7040eae292ef2f229ddf1cc6b207c930079ba7e610  s2-09/work/fix-split-2/11bb3ba.settings.json
74d512c16633ba0b8cd611f303e90f1511f0768058e9cec1c971859b71ef8968  s2-09/work/split-11bb3ba-T3/split-settings.json
15c7460a754f7f994d8de3b62011cb3d583ce631b42d679db77eb42a0e9b632f  s2-09/work/split-11bb3ba-T4/split-settings.json
5de190cb526c651aabc4635b171945a8380e88bf76cd5815db84fba196461c92  s2-09/work/write-settings.json
a111da518c3d965fe8eb921913d85516f150f9f6aab5011361b898b51df3e964  s2-10/agreement.json
79908ef1037d7ab76756e9a9e3084ca08ccaaf347133690ed5634b6d4f0bbf5f  s2-10/classify-1.json
79908ef1037d7ab76756e9a9e3084ca08ccaaf347133690ed5634b6d4f0bbf5f  s2-10/classify-2.json
7407b1a0b5f750fbe2e690cfeeebdc514e9b58de4985d56f0f8305cea02ba1e1  s2-10/classify-split-1.json
7407b1a0b5f750fbe2e690cfeeebdc514e9b58de4985d56f0f8305cea02ba1e1  s2-10/classify-split-2.json
372fd010179aad925fd19325ca783fb598aecec616b1c645d18d7dee5644c4e2  s2-10/input.md
091e30a904d82abebd62ff5fe51aed6deea9194d5780cb06092284678c7a9fbe  s2-10/interface.md
3eecb224a1429c94d510af09dcd0cd30803e1feabca2c32e59ecbfec082b2818  s2-10/labels.json
ee4ceee095d2eb1d165743c2141214051186d3375f29edf5bf0d4f50d119f44b  s2-10/oracle/cbab90a-T1.mjs
5faa5caed47f096f5b06ae47b8203d2fc3b1dd764a9f04618e746c1001d34876  s2-10/oracle/cbab90a-T10.mjs
8a19070d86e616e16fcfc545e723ca473e579d73bc8535102f96e18a55c79f91  s2-10/oracle/cbab90a-T2.mjs
9c8709c7b4f9f8b8088689791b60d3f76791e8590185a07a4344a167ff68f015  s2-10/oracle/cbab90a-T3.mjs
c5a7b741d226331baef022b26b7c74ef75ff21ae1784d471f317e2fad5b47e32  s2-10/oracle/cbab90a-T4.mjs
46b5af836f6c1c1cb52b5a803362b3e652f880a1ad0786115fd26fc15f10507e  s2-10/oracle/cbab90a-T5.mjs
5b568fc88e9179eeaf32964dad436eef2233df85ef12d9e41a1ca8a404ce0a15  s2-10/oracle/cbab90a-T9.mjs
b75ca1083c63aa08b6195ea32e99f463e33ffe5366e14a38e4fbc0f310f86418  s2-10/oracle/lib.mjs
0a2553115cfccda9732be19bf3780073ad1443e4663283d52b6061d6818e0f0a  s2-10/oracle/manifest.json
98eee31f1df1157e743353d625e6c37c6041a63ceb6bcf8844d74eb268862db7  s2-10/oracle/run.mjs
b295ee7e8a64448fcb67b83693c347ab03d99bbf26b99338281a257db31dc19f  s2-10/oracle/runner.json
abd86413cf947824dd8afe154f6c3d918d996bf2b4d46fbbe814a691428d6c76  s2-10/validation-cbab90a.json
0d5b54f8e54a80742272b23632aed587ae92f815548b0c5c224d143eeaabc16e  s2-10/work/classify-settings.json
7d6b682f4e6b687efae5b1f30113b31e742144aa188cb69760b1dbdddfa1a574  s2-10/work/classify-split-settings.json
6eb9e3e469e27fea38ed7d65ac8d0dfe346c21ec469952b55295c2129df901a1  s2-10/work/fix-1/cbab90a.settings.json
f981a34e63c3ee483eee403aaadddf08c31b51e0dbde24d5cec51cc45b0c70e9  s2-10/work/split-cbab90a-T3/split-settings.json
e96d5f72084f6a72758c2fb8b133f43f61316600ddae3e10cdb40dc61292f866  s2-10/work/write-settings.json
647919054bb250a30c8c3e7e58393a12f568ba794fdfadaeac0033569ba76096  s3-01/agreement.json
904220b0a384c3c21df964e2e3aa8ff09f35e397da19f70d7f4ce9cc6c02ae18  s3-01/classify-1.json
904220b0a384c3c21df964e2e3aa8ff09f35e397da19f70d7f4ce9cc6c02ae18  s3-01/classify-2.json
120ba2cce074275fc40abacf740872ecf6e9168eaff0d2ed4b7ebd6c90aa9367  s3-01/input.md
4a63575ecc23e09cc80212e885e941ff9edc712925b37507dbe031e599e929c4  s3-01/interface.md
5938afe38435b65a4fd30c46280cc9a7aa3553c89a1c3420d8d788bcdb13a06b  s3-01/labels.json
fb357ee1c56b58e06169a95068a8588a66d343ac642928910d26a29dd72f3bdd  s3-01/oracle/a3035cf-T1.mjs
f4ddd6f081da89b25cb1f6e80aa825c2f00868d660402348a755205f59c7bdfe  s3-01/oracle/a3035cf-T2.mjs
7d180fc476d6aa77e71981f50d6d08e6bb7eb1068a88b1cd3c0867038974eaad  s3-01/oracle/a3035cf-T3.mjs
b48cb9e445be0416315f35655c637a4db78588dc676f121be6a85749c68254a5  s3-01/oracle/a3035cf-T4.mjs
22ca65be89e876290baed4cfaf51e060b1d5ec5ff8800525f9691b93d64fc8c3  s3-01/oracle/a3035cf-rust.rs
c4c11fc7d412784c94246687324ca07ca28d066dc22af1b520a9c7488d06cefe  s3-01/oracle/fake-degit.cjs
dfb4a531cf858284de36ea06a40487070ad1f0cb396e08a8555da2d976975052  s3-01/oracle/lib.mjs
ce4d102f1ac595462109220d6991da279f1d11a130dd65431d741c43c17affa6  s3-01/oracle/manifest.json
bd7f30d81c0bf0f4f7d3830546a01db958fe377f669aab1bf48aec0bb873ef85  s3-01/oracle/run-checks.mjs
df482b468a2596413b9fea286202dafa74957dde80238e4316dfd80b7f0a8747  s3-01/oracle/runner.json
853a1b2550f64e83a963ea6124817647296c1ca1ea8205261c88223b979a17f4  s3-01/validation-a3035cf.json
0a53baa3f92f96a5ad325e9dfe74fac0da6299bd9734fbb39ed2ab27df4d7af5  s3-01/work/classify-settings.json
450972a154344855b61b8e3186f240a3771a5b0acb77d8aa5d6d70b056ba1387  s3-01/work/fix-1/a3035cf.settings.json
e1c4a26b52f8e39bae7716a4fae6b2a6172a2f24a83257a1a9f8cf1cdc908587  s3-01/work/fix-2/a3035cf.settings.json
4cb0817c457c35a00a414ce47e59641b4d4675d22f7a2d6fabb6114c787aa1dd  s3-01/work/fix-split-1/a3035cf.settings.json
f532f629d43e7d00d1e3af95cc942d271b28b7a96dcf441a0f152d72541a796f  s3-01/work/fix-split-2/a3035cf.settings.json
2dd65bd41b4c750c578a1e23dd0e25394b91e91008229905da2298cbad93aade  s3-01/work/split-a3035cf-T3/split-settings.json
b16ce7402a7e64302d6679dc8cd135aa70f4b0583fd4fc5996dee8e8c70398c2  s3-01/work/write-settings.json
861bc208cf750550cd514072306f1454b7da51809aa04861c0c5e24215b927e9  s3-02/agreement.json
fc801ff23fbd3c38b45de9a3f360d3996dc3e6aba043a27650fe492ee0de881d  s3-02/classify-1.json
fc801ff23fbd3c38b45de9a3f360d3996dc3e6aba043a27650fe492ee0de881d  s3-02/classify-2.json
36eaafc25a87f41605946cb8006b69f5c0b0517b7e2005059fbf91f4e7761f71  s3-02/input.md
02066387ae6ebcc75b3eec72fcec6d944332970ee4a3996ba9d38605ae26fd89  s3-02/interface.md
0a43a5088360af1ebe5dc5200f9d6d4e13ebe18a638c751907ddade0633e94a2  s3-02/labels.json
23d25b6a32e8c5f06576f909cd5b175b17ea93053ac7800390f6323d1a91593e  s3-02/oracle/14a1780-T1.rs
60757bf378f3c2822e399a2ccb2786a88e1dcf751c5544dca16c1ca63c14eb4e  s3-02/oracle/14a1780-T2.rs
cfad35552fdf94d0eb71dd80709171c10d497a9c21d390f457db4523e540c60f  s3-02/oracle/14a1780-T3.rs
88b4b878b742b628c5cc0e531f79f6a198a3fe1d1763b30c9b0f5b80bccd9e55  s3-02/oracle/14a1780-T4.rs
67d7cdcb7ee4946a3db3d0b5a374eca9bc690eb5acf0935e98dcb5aa47cb67c3  s3-02/oracle/14a1780-T5.rs
de813029dc56612719b6d00e8f25f6e02d9f413f6572bf4b672c96ef4aeb3b5e  s3-02/oracle/manifest.json
bfcf9d3efbb8a00ac5bb572edba429e302dfc1357e067a971a64ec9475884041  s3-02/oracle/probe_eq.rs
666f2a230c12f1e318553205d7621aa43621a0bcb1c60f7ffd96edca7c67bf3e  s3-02/oracle/probe_hash.rs
11ec6ee416d3b349a6a0942efb552d54c509fa5d990300da1d67dc43861de697  s3-02/oracle/run.sh
d20c17b14ae14a302e080bed58ea320508ef15f643d52849a95b1916dc3c04b3  s3-02/oracle/runner.json
d6f7c94dfbc8e51171cb2e0bb7b39c6322c486bc134636a1be263a3a427c3ef6  s3-02/validation-14a1780.json
2c44cb65dd4c0db18b0312cb19721dfa7391a433021ec61896815dbff4310585  s3-02/work/classify-settings.json
377ec0b962f779da54eaf25161c661d416f622373d3ddb78b72c3073dd2bc139  s3-02/work/write-settings.json
5d22007a28c76e5b596ac25c2dff899dd9cb73788a7ff53f2c2b95a9cf9587e0  s3-03/agreement.json
9ee64630b84a7cc07a27098535a1449276c799260a64070cfb57693404130835  s3-03/classify-1.json
9ee64630b84a7cc07a27098535a1449276c799260a64070cfb57693404130835  s3-03/classify-2.json
8cc452a4ae9e3ba7d7cbf0479e21dba672c54dd6c632c1d780cc9cfe07af9db3  s3-03/input.md
12238bbc5ff453c3f6eaf3b130b228bdb627406e27018439d7d72244cfeedfa2  s3-03/interface.md
f3406c87e826dcc4ff8a8ca0ad0786c85fb1dcf6661d22731ee3fbc963c54673  s3-03/labels.json
2aa72d26fa2af1383744770eec62a7a5168b876839dc5230e1028d8baebf6d05  s3-03/oracle/9d5a15d-T1.sh
4b6eb8bf51afb60d8435ffdd6e96d4a6fe508481cfd32b7f14ca497b4c5e9b55  s3-03/oracle/9d5a15d-T2.sh
ffa54746c9a26eaedcb6eb75c12a29776d2ec610667d70c97a92d716d7e6f604  s3-03/oracle/9d5a15d-T3.sh
4f1d0ce58045bcb54bbc92d4e7691a497ead24fbc4ca1a8acc0c762a7f46fa62  s3-03/oracle/lib.sh
dc913009c7a3253a34c5e3c93a741fba68f63b8b2d729a17cf93d315498c936b  s3-03/oracle/manifest.json
a4660e77a39a3e12a51cf786f96e4fc50c93f6945e82aa87a3cf09b39f107e87  s3-03/oracle/run.sh
d20c17b14ae14a302e080bed58ea320508ef15f643d52849a95b1916dc3c04b3  s3-03/oracle/runner.json
6a09e9ec3d66c66e688e4beea72300d0899049ea740ed6fbd20f5d26aba26769  s3-03/validation-9d5a15d.json
a7f44aa3af63f505d8140fa9306ebda00cac6f8a4697037c32dc1d68d964111d  s3-03/work/classify-settings.json
a311d1144adff9b24707d81679c49c2d409e3cdf6a3feaf1c825bf9ff4c520a0  s3-03/work/write-settings.json
046845312074c97134841f0fb351c448804d31277b86cb7bcadc851640c48d53  s3-04/agreement.json
bd4905f11482305d2350bdc5652e3465e9ccf3108f5eb909d0be848ffc863107  s3-04/classify-1.json
bd4905f11482305d2350bdc5652e3465e9ccf3108f5eb909d0be848ffc863107  s3-04/classify-2.json
4e4b8dc1101dffed3f32326e42d29f86ca4ee56d66a5aa6b50258585e2ecf3c6  s3-04/classify-split-1.json
4e4b8dc1101dffed3f32326e42d29f86ca4ee56d66a5aa6b50258585e2ecf3c6  s3-04/classify-split-2.json
36f291604fefc5135d5e1e1d84cbd83b806b7b89f2a4d7c11744e35e0cc98f4c  s3-04/input.md
65c12d3168131cc0f683e0c0fc4e651142d323637423a3065530f01cfbd97a17  s3-04/interface.md
b14ab9f579b02993f28acc239521fd33fefb5cdc6a00e74ef4b79c7f531aec2a  s3-04/labels.json
15f6de5bc58599d532257c4bd9877dfeed0b40c5daeaa7781ab921a3b2c3f946  s3-04/oracle/22ba83d-T1.test.ts
a971007d1a99ee6b42156f55c68651faa79bf20b92f16594de0c3d9c9e0c879b  s3-04/oracle/22ba83d-T2.test.ts
2320bc463a1d9e765b1b80bd375f77f41545327611554d71e64ab68bbf7c3059  s3-04/oracle/22ba83d-T3.test.ts
0d7ced3ca75ba1fd5f1bcf41bedddd2b5746b185f489dd11121265c37db807f0  s3-04/oracle/22ba83d-T4.test.ts
8ad12a8163a90ee396f6da3c171e04e87e045f034b6ebbb6458c8d221d6ccbd4  s3-04/oracle/manifest.json
b22b1e34e9bfe330e5029e400376f95f11e009f1e08a0ec0035c47e369502be1  s3-04/oracle/runner.json
d9f1f72f1098bf00305e9ffe6585a2739f550e071262b8086467958e12e0659e  s3-04/oracle/vitest.oracle.config.mts
f23ca2a905eb38702e83533fb1433f3b97ac9d0561693ec105cd29bafb643bc4  s3-04/validation-22ba83d.json
358b3a898d841ebeb8cafd3179a6a6671691113e6cf0a4da4228264851024864  s3-04/work/classify-settings.json
6a5c152c6d763898ce76f638e11d2157676f14c004cb049a5c042b04324b8558  s3-04/work/classify-split-settings.json
5b2ba1b57683cfed6861be28722c224d60dc4f26e379c7a172fc8f910cb5db9c  s3-04/work/split-22ba83d-T2/split-settings.json
bbf1601d8040dc8f52c457fd5233ecc7112df55a40d6c2b2163a0491de63ca5d  s3-04/work/write-settings.json
02fdf7d32c62a82ee732319973708f1ed548560442214bdbb2265bf887195a56  s3-05/agreement.json
6efc3e258504b335813b9773ee33be99ae1227fe2603127237aa84d0becdef5b  s3-05/classify-1.json
ad042e125116b1315bb61a388e9caa8deef7fb3f644b306d27d14d029181d0b6  s3-05/classify-2.json
ac195f5a8d9fdc40dab9e059e240355bc39dedceefcd6594d41da91abbd4604b  s3-05/classify-split-1.json
ac195f5a8d9fdc40dab9e059e240355bc39dedceefcd6594d41da91abbd4604b  s3-05/classify-split-2.json
dedf7284d136a1cc8af9d3b8e7d56607b87d9d8478b0f937a280794a9ab75693  s3-05/input.md
27cbc67fd303be2d6b74eb536ce02c528120dcf99b8e7dae55d910f0601cf351  s3-05/interface.md
a32d322bb22abae2bee01122dbdb3d658815ab8eed64e8a1f9e300bb7a5ebd7c  s3-05/labels.json
487ff55b90d90b9b70e0b6a226c0225021ff29b9ad1c49f2a51cdca0663b3e7a  s3-05/oracle/180eaaf-T1.py
740c43545f0883644d1c7859859ad09576c7c73ef2b79701f63a624793ef8edd  s3-05/oracle/180eaaf-T10.py
e1dc4c3a6101453f603aeb2ade651b7ac8bb213211962b21a94163055edf1305  s3-05/oracle/180eaaf-T2.py
ef3dcd6f31efb4dcff03610a2a93d8db46a5bcf506ca31628078e1c222ef7258  s3-05/oracle/180eaaf-T3.py
94ea31fe6bc678a5f1cdcdd8ba3823c5ffe071ec7180329b97b721ebc93405ec  s3-05/oracle/180eaaf-T4.py
ea9ce013c357246490f25fa6891a91defa38dc68af75ecfd137821ea140a003b  s3-05/oracle/180eaaf-T5.py
f4ad7e23f10e855f6d3a1b6388fa68bd37045048201263ab05815a1be28355eb  s3-05/oracle/180eaaf-T6.py
93b2fa01633ad67ae4aa02f216595a07d3f8b5ef853d464fc888f365621ac8c1  s3-05/oracle/180eaaf-T7.py
bb8b097ba555b9ad7ae3df0369872e656b0a01178414b3b86454e118be103367  s3-05/oracle/180eaaf-T8.py
dd9bbfed651106e04c4fe56a20f30f8e0265c29e43463112de3fb70abda2cbd3  s3-05/oracle/180eaaf-T9.py
2c08c576ec1ae06456f902fefcdd2779ba5d5c7af731aa2b434d6c77a4eb3e3f  s3-05/oracle/manifest.json
107a4ff9a69202786ad97ba24b9acb1600df1f83bc2418885c10600a368e73e1  s3-05/oracle/oracle_mock.py
9ad72672e62b4e708eb950e8f57df7aa32d1e75a879b205af079269501aa2107  s3-05/oracle/pytest.ini
ea3cb168e794fecd9994320a7c757de06ff2f47124ea7a3c881bf5f5949581b1  s3-05/oracle/rewrite_junit.py
7901ae888b7586568c20c4f6da6fb092f0331c4fb37520c32a88ae53cee14f46  s3-05/oracle/runner.json
a2ef485e1de1f676aeed7dad126aff011dd276f144734e556e2047d871017962  s3-05/validation-180eaaf.json
4d6c25c8fe1d0a249183e5fcb4919092b528c76a4997d5a75f33a7be3f956e4a  s3-05/work/classify-settings.json
55fc4709bf982f319147e37aaea125a250359f2225d83105259ac1a2a1fd27a8  s3-05/work/classify-split-settings.json
196cc4d8a670375ca0b700d5254564556fec6eb9b5b2b9986b314efc1b6bcb70  s3-05/work/split-180eaaf-T4/split-settings.json
888864e5fecb70b7a2f37cddc2f7f90a39843a1c680a5df5b86761d9c9918973  s3-05/work/write-settings.json
f2a56e9d61e3e57f7e991d8d0fc0ec4ef35d66c80293a2b408d57b44186c45f5  s3-06/agreement.json
67f0271de5dc5f3c7b7d899424799080ade3ba87b339be3a7a01664645e742aa  s3-06/classify-1.json
2fbe4035a2b299fbd5e35edd668ca02ad777a69237765447cf34ab551288f0a4  s3-06/classify-2.json
984edc2aa6d6afc308b66e85a5c606409fa9664e0479acc3a89bfb8fadea822c  s3-06/input.md
c9314da2a790225bb1363c7f68e9698c45fd1b355af45745d5e6c82c219e8569  s3-06/interface.md
c85c7c2ce51246ecd681e6e69341a88ef8eba42fa172c7ac3efa3dd371dc086c  s3-06/labels.json
bda0432caa305a471e1930719d8d52965a8762319b7c305e8b573d885d176f8c  s3-06/oracle/finalize.py
d16670e8fefa4bab446de3245ef26d98627769d2f72e86c1150107170bc07946  s3-06/oracle/manifest.json
9d0a19f9c83f6e43e88c67062e2064e62aabfdeb19b3b5503af43c2dc57a0709  s3-06/oracle/py/73d4686-T12.py
fb16e524988ba26a8c3be7438b407c2a469a101145f2ba6363231239f802f0e9  s3-06/oracle/py/73d4686-T13.py
4bdb79327073c5a791ddce4ba7df43b3af1a704403b4c898e108d6a2910b5c25  s3-06/oracle/rs/checks.rs
3b9f3b645018d837b9e95234255ca34632ca216d27bcea7b504ec3507760537f  s3-06/oracle/rs/probe.rs
55915d1a5b534f5549e6800995d7509ed6d0759ba6186f53988aee4352f6f6d5  s3-06/oracle/run.sh
d20c17b14ae14a302e080bed58ea320508ef15f643d52849a95b1916dc3c04b3  s3-06/oracle/runner.json
87f2b59997817a7cbb27776ffa169dd992ffdb7534673ed10a1ec8b235fe8711  s3-06/validation-73d4686.json
bf2d5647a253f88f691349367776767d6db02c71678ad303b699b4eb6e69cda0  s3-06/work/classify-settings.json
9b0b56f929a8caf9cb40c7180e0c76934189a0696c678cef99ed3202ab52a341  s3-06/work/fix-1/73d4686.settings.json
651e9d314b89d3fb0bed795c4de6f6e9edbe6afbbbf823b778deb489ed463981  s3-06/work/fix-2/73d4686.settings.json
3611efeaca086177a4a6a375279fc0804187d08ab76aba18b886dfe01593c86d  s3-06/work/fix-split-1/73d4686.settings.json
4e1e87d891b445593cb7ac5be0d721c8c26897fed29ea8aafe99f58d933dd5f6  s3-06/work/fix-split-2/73d4686.settings.json
c0737592d7ba8633c40cabee81024038519e654cf60fa03a3285345908eee626  s3-06/work/split-73d4686-T1/split-settings.json
b92a56c4bea432a4e513e925785e3fc7d3028f2c6de2d2230ecb052db237f3a9  s3-06/work/split-73d4686-T12/split-settings.json
d28223c7103324aeee89b4a046618776a5989bb709b66adac893a69e8584b223  s3-06/work/split-73d4686-T2/split-settings.json
3f8f476da76825224181ca3c56187062f1a9a8e5697ef33b36d9ca6ea20e4bf9  s3-06/work/split-73d4686-T7/split-settings.json
a1a6d0f4b0257d7bfd50e91781d93e602833041feab1752785fb37933650c7ee  s3-06/work/split-73d4686-T9/split-settings.json
b17cc859f3150cd7dd7a0f0a2d8dbb7011f05d1b6986ae03f6f71b81c4d7cb53  s3-06/work/write-settings.json
5d22007a28c76e5b596ac25c2dff899dd9cb73788a7ff53f2c2b95a9cf9587e0  s3-07/agreement.json
2b35399c8b88ccf42b9fff48879d532105d94ea7ff6af89f4822d3f9f51b2218  s3-07/classify-1.json
2b35399c8b88ccf42b9fff48879d532105d94ea7ff6af89f4822d3f9f51b2218  s3-07/classify-2.json
bab2f032c6276cfa47fb15422d016b9d6544a2e448e94a01efaf05fe61b95c57  s3-07/input.md
6d936bdb5a9c8034d58bc33da04a5aaddda9ad981eb5b5f13df350c9d32ce006  s3-07/interface.md
74c98b0b375fb376985e40ce3140b801bd452643fc5666a857b8b0e228f4189e  s3-07/labels.json
9dba1ca84f68a74725809922ef94953c991de04babe368ab1621a13312f48d04  s3-07/oracle/c5468d5-T1.py
1175767ad67bfdc41053ca6ef4ef4b715d7a39d0430f168a46587c6011ac5603  s3-07/oracle/manifest.json
b3ed49bf703c853c8f49572b30a8ea47c904337e2263a7820df77f74bb8d9f6a  s3-07/oracle/runner.json
98046aec28056704d7916b36472eb5e70c3086d2e6f1088b60233e200e2f865d  s3-07/validation-c5468d5.json
7d0c99d6f46acb527a18ca9ee3601fe31f53778998b8d1a5744e995b60d0d651  s3-07/work/classify-settings.json
2e18488fbe668bf4f4df5c63c994398fff48f802a6e980a22fac00b88f5e6a97  s3-07/work/write-settings.json
0d3f295021024ae6634588f8847917676408d2dd52a1798b5efe7a96f7df075e  s3-08/agreement.json
0d76f4eaef037a3345de2f569c79deb4aacf4999132876a9d5da1ab5dbadc242  s3-08/classify-1.json
d52b785622ef765e183e219f15525b89f0a8373df99ff3cccfd2d3dab2cc9c46  s3-08/classify-2.json
27c074753e5862b0cab40c87c35a017e402ff83b8d10829745e5049d1557c40a  s3-08/input.md
e698be4aab8e854e8173b58d20e9ae83e9a963ec55408bbcc895f6b4c0555d19  s3-08/interface.md
69c76514ac0c867145efec7c4ff7caa9b592e866f83db9405f3b50afceab03e2  s3-08/labels.json
aed51f17f6f44f930ae86f4518cfc744c5472c2b17c9ba081dd7530f181b07f2  s3-08/oracle/d30f6c8-T1.py
967cce5d7e2ba15763509d1930487230827a89e89369a8c41b20bdbd2483f286  s3-08/oracle/d30f6c8-T2.py
5dfb54e6757822a2aadaa6950a762fec9d07ddfe1be575dd287cc575d2dcc5fc  s3-08/oracle/d30f6c8-T3.py
daed8afc97920d3334b1c34b425a05d41f0f9b52eaeed27762de7377a93de4dd  s3-08/oracle/d30f6c8-T4.py
99dc885afa0d9f379597bbab4f2d03c5b675cebc9389ca9545b23094d62afe99  s3-08/oracle/d30f6c8-T5.py
b42561e33d1d636b1b4131607376e45de5177d96242440bffa8bc84e93102dc1  s3-08/oracle/manifest.json
713f986ee48be06ad4bff2a700d39514a9f69e34b3547af52366c0a274e30e5b  s3-08/oracle/pytest.ini
c377b78443bb9f1e222291c89c2f7002709c63a550c780e812b26b69ca8e3825  s3-08/oracle/rewrite_junit.py
ff00294a65b2f184b82d7102934cc99da62673a28a1ab5fc7c6079ac87630a1a  s3-08/oracle/runner.json
fe085bb5b589cfd074549a7d320ba6195834b85450ca4704d3a5dd8d53236590  s3-08/validation-d30f6c8.json
839f554239b882fdd021d468b9a148de94da4a62f92807fd94a2a06e5b4e09a5  s3-08/work/classify-settings.json
73ac1a3f7558e57a245dfa29d75fd3c53862848ad0935c1965682cc01cd047c2  s3-08/work/write-settings.json
71e8e4e72c93838714c8872d7f11adb510ab73ee9d5e673bcc3f4433f870b685  sources/drive.sh
51e7ea505d16b5313df297c9c204ccbb245f2179e5edb65a5af25ecb4195233b  sources/label-1-p1-2.reply.md
727699d17fc4f28bd0ffa3593bd0af7d6b453ca8912aa1b69789ac838639ba69  sources/label-1-p1-2.reply.md.run.json
040db0ebc5e073fff09be936aceb35cc3dc288fe83edb454a568e36730d2cfa1  sources/label-1-p1.reply.md
a8ab2b6731f908be08d36dcbb117757198bec2ed311be7659f11e2d85d31840f  sources/label-1-p1.reply.md.run.json
0888af6bc2f023ab739a254f8d70785df3fb64bb4e05a9b4575cf3f4f10ea638  sources/label-1-p2-2.reply.md
0a46787ac44ff2f9dff1939bdd8f8492ef2fbd93b2556edcc1cdf9408aeac8f2  sources/label-1-p2-2.reply.md.run.json
40744979828ffdd3c9201cc88dae954c4d2ab13b0b7b442c9d78daa8cde19508  sources/label-1-p2.reply.md
06c1293f3d7618376a09a489fbef76147764ff46bd9b8c4416e13f70f5e39c82  sources/label-1-p2.reply.md.run.json
a74b830956a508fd730755cdc509cb184d7eab625ae5932f340a3ad959d98c81  sources/label-1-p3-2.reply.md
fbf00a4f6e1d20400bbf86e225b333e9aed2e11cc33ba60d436b173a4ef4df8a  sources/label-1-p3-2.reply.md.run.json
e93eb0d6a3b227be72488ec5c825795ca4f95dbd4c7ebaea9691624ecf6e6e35  sources/label-1-p3.reply.md
61a95afbac9286e671448af169226505073a8563cf09c4919fb0d5b0c78a5f32  sources/label-1-p3.reply.md.run.json
055404aa7733e4f108a7d138851bc8258166f3db53267e61fb0034343219bbd8  sources/label-1-p4-2.reply.md
3c9cc8dfc63912c4e4c161b3ddc90160453546adbeafc6aa08d0783a0df38161  sources/label-1-p4-2.reply.md.run.json
40c8919409587209a7e2244fc75e15603f9db41cb186b4755db1802ed1be1a3d  sources/label-1-p4.reply.md
1c90d08c213a356f3e54865d83e96cd77197804b3b3610fe57a3ab7af07351f4  sources/label-1-p4.reply.md.run.json
7750ef4b1103d8161b4e42f1dab0d645c9060566d0afc38dd05443d3cf86bbcc  sources/label-1-p5-2.reply.md
ee1ceda5bf291714fc4851b04bc2c5a4a87b5c1d221c4ee3e07f16e75c391108  sources/label-1-p5-2.reply.md.run.json
7750ef4b1103d8161b4e42f1dab0d645c9060566d0afc38dd05443d3cf86bbcc  sources/label-1-p5.reply.md
cf314dc9264bf40e83eff48e76d3f83eb271a365e33cdab143fca3e23773d880  sources/label-1-p5.reply.md.run.json
b9be83257be4071185e0b0e4193bcd505048b3c56cd65e44e67833efcb636a68  sources/label-1-p6a-2.reply.md
d3f777d8bba05a008ac9ed93e8cb6c1b18b7daab575d1f5bf39dbf5a57bb82f5  sources/label-1-p6a-2.reply.md.run.json
d3bff8a3a767f6d9eea7a37697186b757854f9ebaec27ed0e65eecde1be3d399  sources/label-1-p6a.reply.md
5ec75c0e53d3e2b751b700e580e33a95de2a41f2db476cc6cacd0d9157073cd1  sources/label-1-p6a.reply.md.run.json
11ab74fa41bb1e58e0e5637919ae69fbc713158ec5ce4a9796014a69182317c3  sources/label-1-p6b-2.reply.md
ab21104875396aebf5bf171b462cbc9165dd67d4101922fe25034d064c5918e1  sources/label-1-p6b-2.reply.md.run.json
072f9fa03dc9c77ac8c1171461637b32c8374909c4e0ef6083f06198d13556d8  sources/label-1-p6b.reply.md
172aff075289cd4d2a372b5d25e19adaef9705058492acb779b8d3a5fae8de40  sources/label-1-p6b.reply.md.run.json
46f4aefd4cbeaac71d8f43b773461af9faca1ee9d5c8d39cb33b0b5083535d14  sources/label-1-p6c-2.reply.md
a0194a87e346b3e11d52ee7cf3ecfed94f68044f12d54497330c6baa490778a1  sources/label-1-p6c-2.reply.md.run.json
591e271289cd1ab9df283d22d380709c4fd27614df3e7b077c1c4d376c4d0c03  sources/label-1-p6c.reply.md
ef58a55a577b578ba074c454e98ea66ef7f23fb28a899fcfe59545abce080954  sources/label-1-p6c.reply.md.run.json
5738ce29b1bf7d4eac1a0054e2f0d9feef0b6d1e84ac32aa43290ed658c1943a  sources/label-1-p7b-2.reply.md
1d4dce68fbe0f92baf44b2b54593e402e425456d18ab359cc59147363a0dd64e  sources/label-1-p7b-2.reply.md.run.json
5738ce29b1bf7d4eac1a0054e2f0d9feef0b6d1e84ac32aa43290ed658c1943a  sources/label-1-p7b.reply.md
eb43f65a23bafe63c658c565ff190939ee477c09e5cfdef01aae6bfa223ca4c7  sources/label-1-p7b.reply.md.run.json
7d486acb0a658d2487bdb2c1bc072130748112b9aaf14ed7726a7ae572a84cc6  sources/label-1-p7c-2.reply.md
b1b19498e3c683870c7d8fd4107fd4d864db98582af4b0d3877da8ccc22c92fe  sources/label-1-p7c-2.reply.md.run.json
294dd52d6e8e0c43ca2531da190910ff8f6e377ebf4c3e954d9bc547da7447d5  sources/label-1-p7c.reply.md
70ac1acefe934f920c234d82731f9035f74a7a2a5cee260d1a686a20832b2cc1  sources/label-1-p7c.reply.md.run.json
a5c3c198ca566fb06497eb92bd0984ede3ebe23b84a2bcc8728bd14f02234756  sources/label-1-p8a-2.reply.md
4c0a4171c4a3033a2b7aad45d959e934433f6274d38d35fde28200b274331878  sources/label-1-p8a-2.reply.md.run.json
193f95c7c8cbef42b27da370be5f1e52d9521a88998102fcc3b5353bf9d8780f  sources/label-1-p8a.reply.md
6624efb6e84ed05b3bb13d91824c507bba48b32631a1c2cc0caaf030fa1785ba  sources/label-1-p8a.reply.md.run.json
3b40b6f7f6dc6c84d9edfea6e236243e38573a3905c92b705404c3ffd0ad8bed  sources/label-1-p8c-2.reply.md
7251045ab0a12df502bd179ad6c922af023e4bd8c79c46993d6e9b73f73c94e3  sources/label-1-p8c-2.reply.md.run.json
b4a33e238fe5136c696b21923618bf3f564c74bdd99cf40b03de8e2c89ad7b99  sources/label-1-p8c.reply.md
27814e92d81d33bf8950de64ea7e38f2b0febd6baf702cf6811ecbd5f3b7e578  sources/label-1-p8c.reply.md.run.json
719523491467d7a681a75f9989dd179baefd421283d0c390305a17452f94db0d  sources/label-1-p8d-2.reply.md
0cc3eae4c05b0c02410b885026ae09522375d31f7a056e2e8ad485966a0d0434  sources/label-1-p8d-2.reply.md.run.json
d15c055826d0d8d1bd3f13e3f0c32545811467c8fb73b298bdf7b68d04c0f5da  sources/label-1-p8d.reply.md
a107aaed230d41882f417ae1f0b83a662423e986b087b37d4f7357267bd0c630  sources/label-1-p8d.reply.md.run.json
1f26e8ac1c830511296f4556f434df8ebbf715434b1ce23a8cfaac757af76ceb  sources/label-1-p8e-2.reply.md
7c3740382ee6a26ebbf314a1e3d8b641e55faa1e2a8d3c03c6ee90a5d3cbd20e  sources/label-1-p8e-2.reply.md.run.json
a4aa382b9a67b6adeff446af051a4b5126fa9f8244f5198ea70142257dba99e0  sources/label-1-p8e.reply.md
6ff0c14e6ced62418f2a17a7529674874cc25c36e24ad29f25e1896c1269fb94  sources/label-1-p8e.reply.md.run.json
59a7c3b76df1e4ad43dd8e0515484d67961890534afbceaffcc8277eb5ed1cad  sources/label-2-p1-2.reply.md
57b5f284a5a07769623bd3fb5f52f7c6bdf175235dff94f0bf0ef8cb87162516  sources/label-2-p1-2.reply.md.run.json
cfa45ccec7e00b7a0c04559a0f829dd836c0354e0650638761b41a3cb4b8612a  sources/label-2-p1.reply.md
e2d952f3c4a5b4d175a02572bc4cb8ad92cade9aa1585db52dd1392abbdaaf23  sources/label-2-p1.reply.md.run.json
0acc6a6ce389a66baf5666e24d21d6a3c065ccf28475fd29976ce7d9803825e1  sources/label-2-p2-2.reply.md
e497b033020dab8e85c47f0a6219262f7916e66fe05a2f46a3e580fe2c36e559  sources/label-2-p2-2.reply.md.run.json
5b6f207320c7b5267b6277a1cfacc3da68963e09548cee5002688750beda7bad  sources/label-2-p2.reply.md
5df2d671bea36e8319472bffed541eae7187d4d6b776b5f993f5e5d719591401  sources/label-2-p2.reply.md.run.json
b8b711451cdf4535c1924a0538849ff363b52bd163979c039bb21626903f49bf  sources/label-2-p3-2.reply.md
49e90b11f4aa5aee960e2b76ad21e58e9f9f5e7108111a911078cf73e12f63fb  sources/label-2-p3-2.reply.md.run.json
6af5ec57c843aead156080ffea16fd85b68dade26dfb3f65a8daccf69104b430  sources/label-2-p3.reply.md
8bef638e926733a20d01483b80a9dfebd41d72707debeb476edb47a8492a47cc  sources/label-2-p3.reply.md.run.json
f6a64e1d7a744d5aa06c1c94f75523dcf97fe3fecba6fa4583197d54febd912d  sources/label-2-p4-2.reply.md
106f5f8cc175f34f10053641be8a109b36facd3975d3fd977adcd0d44342afc6  sources/label-2-p4-2.reply.md.run.json
6ce4e2bae6265dac63aec78417f763bea1d4c32141b4b2914863c9920e90f0ed  sources/label-2-p4.reply.md
52755b0a297f97117f9fc0fbecb5fa22fe7455b285ea1b41a7c357afe3b1b5e1  sources/label-2-p4.reply.md.run.json
a7b6285a051e77d729dfc690c7be9484222dbb11d30370a5f69bdfbe81c07127  sources/label-2-p5-2.reply.md
642e6158e0b303406715b44fe3910367890ee7e98def94fd95f5a836a5e41623  sources/label-2-p5-2.reply.md.run.json
94e87e3b060911413dae48b2a29ba7c3552abce1d795f755df5eac5b6d284a75  sources/label-2-p5.reply.md
405966d62849c8bae1d11798031d076a3f88c7823649873f5f1ebe83e7c60508  sources/label-2-p5.reply.md.run.json
7f28115a16fa455789b6df9aec6129d86349b416f513c6005c6838dd41a6a553  sources/label-2-p6a-2.reply.md
ee7bfcb629d40e8ac3dda8c371cbf44334a9057139e09367d0c508bee548c122  sources/label-2-p6a-2.reply.md.run.json
8307d07b90baf6696eb4cab2ea5dfea2569e1a4a03c1b66d656e8d5b34e05209  sources/label-2-p6a.reply.md
a920ef10c82a76e773af4e9716ec4688f0ca97c3f5bdf2cded1e0ce416a8e6ec  sources/label-2-p6a.reply.md.run.json
d4b56aa9222b59da3d55b362de70de54cacd745f870aa12e6480d0b79afdeed5  sources/label-2-p6b-2.reply.md
59b976a448cbb13858f9b19491873487b892911050109009ce2f9143d504ff85  sources/label-2-p6b-2.reply.md.run.json
072f9fa03dc9c77ac8c1171461637b32c8374909c4e0ef6083f06198d13556d8  sources/label-2-p6b.reply.md
916a4492cf45b52ac9bca22c6e8fc4d69d3b3a8987ad16d58a9ab063d4d486a1  sources/label-2-p6b.reply.md.run.json
b24ac580db195adb06205894220c062bef3b2a7c54f9bcfdff09bd99eb3c572e  sources/label-2-p6c-2.reply.md
9cc4e4e850f9394661d83a3a40d8776c134d2144afb89869cd02d79efff95780  sources/label-2-p6c-2.reply.md.run.json
48844b07ddf9dedd9c22f3c7296f22e84fc1590266bd44e9dd27d8a71c4c6a78  sources/label-2-p6c.reply.md
0754f2870ee44d0d7796149daef6616fa9e41b8601c7c5b4a2d8fdf8696986fc  sources/label-2-p6c.reply.md.run.json
3465fa9f82895c46ea26f6443a6eb03faf90dedbc9718f1adc55bb0e9289cb8c  sources/label-2-p7b-2.reply.md
b89ebf366da3b34ec96fcb4b0272be012d2f9d98ee75920f0c89b37cbf77e039  sources/label-2-p7b-2.reply.md.run.json
3465fa9f82895c46ea26f6443a6eb03faf90dedbc9718f1adc55bb0e9289cb8c  sources/label-2-p7b.reply.md
5242463b0d5b41da0f0649b2ab103043389dc3479774d696ccc9cc2d5fd2ebad  sources/label-2-p7b.reply.md.run.json
294dd52d6e8e0c43ca2531da190910ff8f6e377ebf4c3e954d9bc547da7447d5  sources/label-2-p7c-2.reply.md
1c3b845cddcf6e7224ec5306bfcdfcf2c946aa63ccd67c8f84bc002bd100cca3  sources/label-2-p7c-2.reply.md.run.json
5aedcc08d444aa0783e5aa1b94221a825ac2446be3184c82658a29bbcebf879c  sources/label-2-p7c.reply.md
1db927821f0e54dfbc6687ff01812eb23a859879fc6057eed85c7489ae2a37b6  sources/label-2-p7c.reply.md.run.json
1a509ae6af396daad0119a8a90d38e28b3df57cb06ba4cc1eb355bf1007cacd0  sources/label-2-p8a-2.reply.md
0f0647342eed16890896b9cdfcdc9ac22e3369303649b3e5cfd4ad2357e5a0e5  sources/label-2-p8a-2.reply.md.run.json
1ed28f336c976bd504baec702100fbe5c3259c6cc8b5e0adb459ea30ad7153eb  sources/label-2-p8a.reply.md
f45f0a85add6fb67eb665f915edc6617086c12e9cbc7d959a6556e133e46a3d5  sources/label-2-p8a.reply.md.run.json
e4853dbcec84372f455075192a55fbf260aa283421272d376b3f940c323895e4  sources/label-2-p8c-2.reply.md
e345af4c79cbbaf92af540056901ba173af87ad88025d9e4f7e0320f555c805c  sources/label-2-p8c-2.reply.md.run.json
56368066c97b0275a49acf6ad126ad63d5ebe39af8df9b02a2d43971f652cd20  sources/label-2-p8c.reply.md
0e3fd4340b6e6e111bd64f44f6b14f267c257fa36b69b256b25985b2b3e8877a  sources/label-2-p8c.reply.md.run.json
1f4fc159cf28833f7186f17d057906618565fd1662a0234c87dcccae8088cf15  sources/label-2-p8d-2.reply.md
253cb27b0202a0769395a68634637994dc5541186cc753f4fdbecac6484699a6  sources/label-2-p8d-2.reply.md.run.json
47aa2881241cb19bff8be3bf2f5c465242d955af8a239e02db3c2c6802527018  sources/label-2-p8d.reply.md
9600a52d0509db4bf5cbc2a4dc056838cf97e5c14adfddb3925ee1a7fa2c03ef  sources/label-2-p8d.reply.md.run.json
2368bed2fb87b5a524581897bdc389650c103ace9263715628c5d3a5d9ab5dd4  sources/label-2-p8e-2.reply.md
d3ee82ce03d0fd660685cf0cbbbdf8dcde2188d5ce4c6dfcdf1f613b05baee8c  sources/label-2-p8e-2.reply.md.run.json
cf04a0599f650d5eb18fc5ce606fd2a62952fa3c82249ddb51da8b9d42dfd7ed  sources/label-2-p8e.reply.md
d91a14dda313f82c0fa3db609eb32970ae6ca332334e575e107c1281038df217  sources/label-2-p8e.reply.md.run.json
f687bf8289682a81c35e9131dea0d4d207b6971f880bc962b15c780b76fb11b6  sources/labels.tsv
7b2656bea276e32a87f85c3a283a6c57731e1e8e461657d951c7089088c6e9bd  sources/pairs.tsv
8a5f9a604db19a7eece839f368aa616b42d5a516f6fb7565ab89e0f83a760aca  sources/prompts/label-p1.md
d150ebceb1f353c32799a9bfdec846e0178cf45d880677e0d943bab95a95c6e0  sources/prompts/label-p2.md
a5aa41659bb3771234735ec184a7c2ead1fb179067ecffd501812de46d9722f9  sources/prompts/label-p3.md
1eb50c7bd827c6c81b0cc576bf4f0ea6f9c0365b58af47f1f059cd3b15bd6730  sources/prompts/label-p4.md
f759ef9ad61dc0b4ae2c13eaf99ff2a74854dcdcdf7974633bee990201311b5d  sources/prompts/label-p5.md
f62dbbe09aad0f86ededc7cd69e6d71ece3805e58696dc4f5dedb1d21105f87b  sources/prompts/label-p6a.md
2ad151506c8c43660b098bc7e02c52bd6dc01b842802428b0a5298118f80aac2  sources/prompts/label-p6b.md
6a676855c6baeb9f889a6cc91e463ecf7e6d5d5f243639e0f09eea5c28152bb8  sources/prompts/label-p6c.md
124735b661b9644677126fed4a5fef11a18dec6460167b98d72288fc2dc89486  sources/prompts/label-p7b.md
56425bb2e0accaa30d2dc92101af1a4bc67c17fbde4cbffca2ef8bd2a5269b37  sources/prompts/label-p7c.md
1c3413d066e0e41b8d11db879a57501dfd279a71cb53476e2484bdd45aeeb4cb  sources/prompts/label-p8a.md
0427c52c925d5dea014f0196c16e640edb05a51d4592a8ed673f02c475254e43  sources/prompts/label-p8c.md
6d7a2c06e4b161e62f09d12f933de3bce73858084dbc5713e401d5eb1b8b875e  sources/prompts/label-p8d.md
301b13831c009fa58231d1a7ccbf37ea5c234b0eef8acc164263492d7f109a37  sources/prompts/label-p8e.md
69258bcfd7c0f9d97d43d900aa38e7ca1b0659e852ae4c351dd9afeec7ac2835  sources/superseded/briefs/label-v1.md
f69216a30ed13121b841854140b4077ffc2bdff5fbab5df549074542469a63ef  sources/superseded/label-1-p1.reply.md
9b6123f95ef6008795436fab94ff0cd313973dc8984dcf2ea28e278400cf4b9c  sources/superseded/label-1-p1.reply.md.run.json
7e03c8843814ce8d971ee2aa9498df4ef385b868c727bf01697768bb68307e26  sources/superseded/label-1-p2.reply.md
2ec2997e927b4e7f6bd3ae2a453caa26bdc1ae0ed32fb895e43b43d428cf0aa4  sources/superseded/label-1-p2.reply.md.run.json
cd183eee491df3ce7c2839e58867fedc6ab8af0053bbf8e2dc657d8dae5d0b94  sources/superseded/label-1-p3.reply.md
3d0e64ba8629d136e06a48d5d7cd51b7af25e1485f17ddce22edc70404d6bfb4  sources/superseded/label-1-p3.reply.md.run.json
7f83eb714b6c1c5984a92429e230859fec6d7ba99fa28765ac05dd54d02ccfbd  sources/superseded/label-1-p4.reply.md
13fb84b251aa7c8260205e75a5ba21b03c41210979b685c1c9f20389f1aa4cdb  sources/superseded/label-1-p4.reply.md.run.json
92bb84c95513b2ffb2c5367bc9d0c8a45387ac1f3d80c1e621f74706df764223  sources/superseded/label-2-p1.reply.md
1ac1e69de9c8105f6f370aae664ef8b04c3abac14ff5f5f4913e7e4b0cd7dcdd  sources/superseded/label-2-p1.reply.md.run.json
38c9e82d7e141f603143a650e27277f4df9ed8a77fe6bc9821880310c026d2ef  sources/superseded/label-2-p2.reply.md
a0ffffc4f57e580c3942db6a1dc15757f17443f18038e1c14328c30e4d004891  sources/superseded/label-2-p2.reply.md.run.json
68dd0b5af2c577f340fd066461f638f5a79c42f5edcc41d84440a6667e3884fb  sources/superseded/label-2-p4.reply.md
c768b331c3d0e3137b24b72ff0cd3e115979b5885483abaa37203927102316d2  sources/superseded/label-2-p4.reply.md.run.json
a7c64821b3059a652656e4e88dcb3967e0049afc758afe8486a3b4549826550f  sources/superseded/logs/label-1-p1.log
7dcb9b5431ba8376ac29e46c4ec1bca0ebdb2d6501dfc00f969c40d9b27aa64f  sources/superseded/logs/label-1-p2.log
f4802cc793f05fcd83325fa7d2bb2f30c7ddb35e8ee98be5961d16da1546bc2b  sources/superseded/logs/label-1-p3.log
010f67085cd65344757eb817be24299788e3b90ccfd180c335f66a381ac4aebb  sources/superseded/logs/label-1-p4.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  sources/superseded/logs/label-1-p6a.log
60749d0e98d71387fe49bcbdc51e11bf7c4199194cf467cc3747e2772a149f61  sources/superseded/logs/label-2-p1.log
144da23b6d8a7512a03c1daf5aadaee7556bc029f23b81d87e8a0d9e22e6c6fe  sources/superseded/logs/label-2-p2.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  sources/superseded/logs/label-2-p3.log
a6e2155121c23845c1d655941e96686d7a77dba916b84a6f277d6a032ad26d52  sources/superseded/logs/label-2-p4.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  sources/superseded/logs/label-2-p6a.log
b93bd57a83d6d5dc25d9391934342863e234a2ad66b67c46e276858a9f598190  sources/superseded/logs/start.txt
ff64203dfccc4a3d3fa2265aa3e9d60fcd6d68a64db602cc71ab8f6fd5ebdad7  sources/superseded/prompts/label-p1.md
963b678715a6290b3e9a481c986974f90c1461f9e87d50bb1decca1712851861  sources/superseded/prompts/label-p2.md
b200fefee8463055114f65f69a15d10720e129792cd366fb4b1992a3a68f9782  sources/superseded/prompts/label-p3.md
d9879d023bb26abb1cc1776fc88b5fe6ffc115380b7c993392de1806a5b659de  sources/superseded/prompts/label-p4.md
110a687e564ea173646a16a05e531144068fed1c2857392a3a9a88981ba7ab61  sources/superseded/prompts/label-p6a.md
b518d0ad27f00bb8a3a2170cfe7d9a72c83f3f6bcce07fd297bbe990079b8e1c  step9/classify.tsv
bc72bc0ab2026da0dd21328096c29873f985e4a99f0e0fef0fa97ff958929db0  step9/inputs.tsv
871239acc27a01a7026d544e79736aace7d12cfea1159736457458c9c48b3f87  step9/labels.tsv
1619628b3f560c2a54ae095a0187cc37ba2c67dad7ee5c3b392d0440befee2ee  step9/sample-7.1.tsv
8059fdbda55c45724687a87b456049c874d63377bcdedc5669c4c145c2f1be68  step9/sample-7.2.tsv
```
