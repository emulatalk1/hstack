# Step 7 lock

Locked 2026-11-06, after the last task of step 7 had run (Task 7, `kills`). `<data>` = `.evidence/bench` (gitignored, in the main checkout). Plan: `docs/plans/2026-11-05-bench-seeded-bugs.md` (Tasks 1 to 7). Rulings: prereg section 8.3 ("Applied at step 7", rulings 1-13), the user's decisions of 2026-11-06, and the controller rulings listed below. The tasks are the 24 rows of `<data>/ext/sample.tsv` (external) and p1, p2, p3, p4, p6a, p8a, p8c, p8d, p8e (real-estate, the 9 tasks that meet rule (b) of the step 5 lock). p5, p6b, p6c, p7b, p7c and p8b have no seeded folder.

Every count here comes from one of these sources:

- the tools' printed lines (`seed` and `kills`), as recorded in `progress/progress.md`, section "2026-11-06 — seeded bugs plan" (Tasks 5, 6 and 7), and the drivers' `run-*.lines` and `seed-<task>.out` files, whose last `seed` line `lock-seed.mjs` parses;
- `bugs.json` fields `id`, `end` (the bug's commit), `state`, `edge`, `severity` and `why`; `validation-<end7>.json` ids and verdict words; `kills.json` ids and numbers; `step.json` `ids`; `grades/<sha7>.json` check ids and results; `*.run.json` usage;
- the counts-only scripts of `<data>/logs/step7/`, listed and hashed under "Scripts" and "Hashes" below.

Nothing here was read from a bug's `description`, `behaviour`, `edit` or `hunk`, from a check file or an `oracle/` folder (seeded or not), a `work/` or `logs/` folder (seeded or not; `usage.mjs` sums only the `usage` field of the `*.run.json` records under `seeded/work/`), an `input.md`, an `interface.md`, a reply, a prompt, `ext/sealed/`, `ext/raw/` or `heldout/`. Those files are only hashed. No `git show` or `git log` ran in a sealed repo; the only git call on a sealed repo is `git for-each-ref refs/seeded` (refs and shas). The operator listed `<data>/seeded/` once (the folder name `repos` only; nothing inside it was listed) and tried one read of an oracle manifest, which the permission layer denied and which never ran. Nothing was read from either. At the final review the operator listed the names in one task's `seeded/` folder (names only) and tried one read of a `logs/step7/*.out` file, which the permission layer denied and which never ran.

`<data>/p8b` is a symlink to `<data>/8b`. p8b has no `seeded/` folder, so nothing under `p8b/` or `8b/` is hashed here.

## Result

- **Final n = 81 of 81** (external 72 = 24 x 3, real-estate 9 = 9 x 1). No task is below its count, and no candidate was refused: 138 candidates (external 120, real-estate 18), all 138 passed at the reference, all 138 have a commit.
- **Half-width at p = 0.3 (section 10.2's formula):** 1.96 x sqrt(0.21 / 81) = **0.0998**, 10.0 points. The plan quotes 10.2; the computed value is 0.0998.
- **Verdicts of the 82 graded checks:** valid 81, weak 1 (p1, dropped), broken 0, error 0. The other 56 candidates were `ungraded` spares (external 48, real-estate 8): grading stops at the count.
- **Fixer rounds** (a check that did not pass at the reference): external 2 (s1-04, s1-06), real-estate 3 (p1, p2, p3).
- **`kills`:** the fix-commit oracle catches **28 of the 72 external kept bugs (39%)**, 44 (61%) by none. Real-estate: 1 of 9 by the fix oracle, 2 of the 5 with a step oracle by the step oracle, 6 of 9 by neither. These are the numbers after the correction in "Findings" (Task 7 first recorded 24 of 72).
- **External H1 sensitivity:** 11 of the 60 kept bugs of the 20 tasks with a step id (18%) are caught by a step id.

## Rulings

### The 13 rulings of the plan (prereg section 8.3, "Applied at step 7")

The final wording is the one in prereg 8.3 (the plan's rulings 1-13 and the two decisions). Ruling 5 reads there as the controller amended it (see the controller rulings, 6th below): the plan's text and prereg 8.3 say `git init --bare` with alternates, not `git clone --bare --shared`. The older wording remains in the scratch copy `.superpowers/sdd/.../rulings.md`, which is not a repo file.

1. Scope: 24 external tasks, 9 real-estate tasks, one bug each for real-estate.
2. Candidates and kept bugs: 5 candidates per external task, 2 per real-estate task; kept = first 3 (1) that end `valid` in `queuePick` order; no seeder rerun for a bad verdict.
3. What the seeder sees: the input, the end commit's files, the changed ranges; never an oracle, labels, sheet or sealed file.
4. The bug: one edit `{ file, find, replace }` plus `edge`; six refusal reasons.
5. Where a bug lives: a sealed bare repo `<data>/seeded/repos/<key>.git` by `init --bare`, alternates, the source's `shallow` copied, `refs/seeded/<bug id>`.
6. The check: new, one per candidate, in `<task>/seeded/oracle/`.
7. Validation: a check is judged against its own bug only (`pass`,`fail` valid; `pass`,`pass` weak; else broken; no result error).
8. Mechanics: end graded first, at most 2 fixer rounds, bugs on a frozen folder, `not judged` for a machine failure.
9. In no score: seeded checks are in neither H1 nor H2.
10. Relation to the oracles: a recorded matrix (`kills`), no change to any step 5 or 6 verdict or lock file.
11. How later steps read a bug: 7.3 by `grade ... seeded/oracle`, 8.4 by `kills.json`, severity weights, pairing by id, discovery layers by `agent-replay` (step 13).
12. Layout of `<task>/seeded/` and the `bugs.json` entry.
13. Docker: one external task at a time, `docker builder prune -f` only.

Decided by the user on 2026-11-06, as proposed with the plan: (a) 1 bug on each of the 9 real-estate tasks; (b) H5 and the arms' test layers by option 1 (port gated by the check, `fail` at the product counted as a miss); (c) `kills` runs in this step.

### Controller rulings, in the order of the ledger (20)

Each gives the decision and its cost if wrong, from `.superpowers/sdd/2026-11-05-bench-seeded-bugs/progress.md` (the copy in `progress/progress.md` is section "2026-11-06 — seeded bugs plan"; the ledger is gitignored).

1. Task 3's Consumes gets `EDGES` (seedCommit's `edge` gate reads it). Cost: none.
2. The step 6 hash compare is a small counts-only script under `<data>/logs/step7/` next to a rerun of `lock5-compare`. Cost: a script (`lock6-compare.mjs`).
3. Tasks run strictly one after another in this worktree; `oracle-run` stays the main checkout's `bench/ext.mjs` through the env files. Cost: an implementer's edit of `ext.mjs` would not take effect until merge.
4. `seedCommit`'s edit argument also carries `edge`. Cost: one renamed field.
5. `bugs.json` `state` drops `valid-spare`: grading stops at the count, so no valid candidate exists past it. Cost: one more word (ruling 15 removes it from the text).
6. An ungraded spare's check is written to `validation-<end7>.json` with verdict `error`, stage `not graded`, so `grade` excludes it. Cost: none.
7. The sealed repo is `git init --bare` with `objects/info/alternates` to the source and the source's `shallow` copied on every `seedRepo` call, because a bare `--shared` clone of a shallow source is empty (all 29 `ext/repos` are shallow). Amends ruling 5's wording in the plan and prereg 8.3. Cost: Task 4 re-reviewed; a source fetched deeper later needs one more `seedRepo` call.
8. `kills` does not call `grade` for the end when the existing end grade is good (same commit, junit ok, same `oracleSha`, last run ready), because `grade` rewrites the file on `--reuse` with today's labels and the step 6 lock hashes `step/grades/<end7>.json`. Cost recorded then: "an end grade with stale `excluded` is read; `killsOf` reads it from the grade, and validations did not change since". **That cost line was wrong** (ruling 14).
9. Fixers stay, and an end whose checks are all `error` is `not judged`: a runner.json with a real mistake stays not judged after 2 fixer rounds instead of being dropped. Cost: one task needs a by-hand decision (none arose).
10. A candidate repeating an earlier candidate's file, find and replace is refused with why `duplicate`. Cost: none.
11. Fix round 2: `duplicate` compares the commit too, and `kills` removes a ready all-error bug grade so `--reuse` cannot keep a machine failure. Cost: one small round.
12. The pilot's results stand and no brief or tool changes (nothing in the lines depends on a bug's content, every candidate passed). Cost: none; the batch shows it.
13. The lock also reports, per external task, the kept bugs whose commit fails a `step.json` id in `<task>/grades/<bug7>.json`, by a counts-only script: an external step oracle is a subset of `oracle/`, so `kills` prints `step=none` though H1's checks were graded. Cost: one more number (below, `lock-step-sens.mjs`).

14. **Correction of ruling 8.** Validations did change after those end grades, so the kept end grade's `excluded` is stale in 9 of 24 external tasks. `killsOf` reads `excluded` from the bug grade, which `grade` writes from the current validations; the results at the end stay from the kept end grade (same `oracleSha`). `kills` reran on reused grades, and this lock's `kills` numbers and hashes were redone. Cost if wrong: a small rerun.
15. Drop `valid-spare` from ruling 12 in the plan and prereg 8.3: the tool removed it at Task 4 (ruling 5 above). Cost if wrong: none.

From the final review (rulings 16 to 20):

16. sb-s2-07-4 stays kept: section 8.3 drops only on a failed validation, and it passed. Its fix-oracle grade was rerun once without `--reuse` to tell a broad bug from a machine failure (see "Final review: how many checks a bug breaks"); the lock records it as broader than an edge. Cost if wrong: one bug of 81 inflates catch rates a little, and step 14 can leave it out.
17. Ruling 8's disk-full signature cannot be seen under `--sealed`, so it became "a task with `error` in its `seed` line, or `not judged`, is run once more, after a prune when the cache is above 15 GB, and that result stands"; `gradeBugs` removes a ready all-error grade so the rerun regrades. Amends ruling 8 in the plan and prereg 8.3. Cost if wrong: a dropped bug's commit is graded twice.
18. `runOracle` passes `quiet: flags.sealed` as `replay` does, and `/tmp/hstack-bench` was cleaned: a real-estate app log at a bug commit sits outside the sealed folders, and a failed start then has no log. Cost if wrong: a failed start needs a run without `--sealed` to see why, on a commit that holds no bug.
19. (M3) Per-bug and per-task `edge` and `severity` leave the lock and `progress/progress.md` (Task 6); per-set counts stay, because prereg section 12 says the designer sees only scores. Cost if wrong: less detail; the earlier commit still holds them until the user merges with a squash.
20. (M4) The two tests in `tests/bench-oracle.test.mjs` that claimed `grade` behaviour but called `unscored` are renamed to say `unscored`; the final reviewer tried the path through real `grade`. Cost if wrong: an untested path that a later product grade exercises.

## Per task counts

Columns are the last `seed` line of each task (`lock-seed.mjs`): candidates, refused, pass at end, fixer rounds, graded, valid, weak, broken, error, kept. Spares past the count are not graded (candidates - graded: external 48, real-estate 8).

| task | candidates | refused | pass at end | fixer | graded | valid | weak | broken | error | kept |
|---|---|---|---|---|---|---|---|---|---|---|
| s1-01 | 5 | 0 | 5 | 0 | 3 | 3 | 0 | 0 | 0 | 3 |
| s1-02 | 5 | 0 | 5 | 0 | 3 | 3 | 0 | 0 | 0 | 3 |
| s1-03 | 5 | 0 | 5 | 0 | 3 | 3 | 0 | 0 | 0 | 3 |
| s1-04 | 5 | 0 | 5 | 1 | 3 | 3 | 0 | 0 | 0 | 3 |
| s1-05 | 5 | 0 | 5 | 0 | 3 | 3 | 0 | 0 | 0 | 3 |
| s1-06 | 5 | 0 | 5 | 1 | 3 | 3 | 0 | 0 | 0 | 3 |
| s1-07 | 5 | 0 | 5 | 0 | 3 | 3 | 0 | 0 | 0 | 3 |
| s1-09 | 5 | 0 | 5 | 0 | 3 | 3 | 0 | 0 | 0 | 3 |
| s2-01 | 5 | 0 | 5 | 0 | 3 | 3 | 0 | 0 | 0 | 3 |
| s2-02 | 5 | 0 | 5 | 0 | 3 | 3 | 0 | 0 | 0 | 3 |
| s2-03 | 5 | 0 | 5 | 0 | 3 | 3 | 0 | 0 | 0 | 3 |
| s2-05 | 5 | 0 | 5 | 0 | 3 | 3 | 0 | 0 | 0 | 3 |
| s2-07 | 5 | 0 | 5 | 0 | 3 | 3 | 0 | 0 | 0 | 3 |
| s2-08 | 5 | 0 | 5 | 0 | 3 | 3 | 0 | 0 | 0 | 3 |
| s2-09 | 5 | 0 | 5 | 0 | 3 | 3 | 0 | 0 | 0 | 3 |
| s2-10 | 5 | 0 | 5 | 0 | 3 | 3 | 0 | 0 | 0 | 3 |
| s3-01 | 5 | 0 | 5 | 0 | 3 | 3 | 0 | 0 | 0 | 3 |
| s3-02 | 5 | 0 | 5 | 0 | 3 | 3 | 0 | 0 | 0 | 3 |
| s3-03 | 5 | 0 | 5 | 0 | 3 | 3 | 0 | 0 | 0 | 3 |
| s3-04 | 5 | 0 | 5 | 0 | 3 | 3 | 0 | 0 | 0 | 3 |
| s3-05 | 5 | 0 | 5 | 0 | 3 | 3 | 0 | 0 | 0 | 3 |
| s3-06 | 5 | 0 | 5 | 0 | 3 | 3 | 0 | 0 | 0 | 3 |
| s3-07 | 5 | 0 | 5 | 0 | 3 | 3 | 0 | 0 | 0 | 3 |
| s3-08 | 5 | 0 | 5 | 0 | 3 | 3 | 0 | 0 | 0 | 3 |
| p1 | 2 | 0 | 2 | 1 | 2 | 1 | 1 | 0 | 0 | 1 |
| p2 | 2 | 0 | 2 | 1 | 1 | 1 | 0 | 0 | 0 | 1 |
| p3 | 2 | 0 | 2 | 1 | 1 | 1 | 0 | 0 | 0 | 1 |
| p4 | 2 | 0 | 2 | 0 | 1 | 1 | 0 | 0 | 0 | 1 |
| p6a | 2 | 0 | 2 | 0 | 1 | 1 | 0 | 0 | 0 | 1 |
| p8a | 2 | 0 | 2 | 0 | 1 | 1 | 0 | 0 | 0 | 1 |
| p8c | 2 | 0 | 2 | 0 | 1 | 1 | 0 | 0 | 0 | 1 |
| p8d | 2 | 0 | 2 | 0 | 1 | 1 | 0 | 0 | 0 | 1 |
| p8e | 2 | 0 | 2 | 0 | 1 | 1 | 0 | 0 | 0 | 1 |
| **external total** | 120 | 0 | 120 | 2 | 72 | 72 | 0 | 0 | 0 | 72 |
| **real-estate total** | 18 | 0 | 18 | 3 | 10 | 9 | 1 | 0 | 0 | 9 |
| **all** | 138 | 0 | 138 | 5 | 82 | 81 | 1 | 0 | 0 | 81 |

`counts.mjs` (reads `state`, `why`, `edge`, `severity` only) was rerun for this lock; its per-task `edge` and `severity` columns are not kept here (final review, ruling 19; the per-set table below stays). It prints the same totals as Task 6 in `progress/progress.md` (external 72 kept of 120, real-estate 9 of 18). End-fail 0 in every task. p1's graded 2 are one `valid` and one `weak`; the `weak` one is dropped and not fixed.

### Kept bugs by edge and severity

| set | boundary | case | deleted | duplicate | empty | null | total | high | medium | low |
|---|---|---|---|---|---|---|---|---|---|---|
| external | 11 | 6 | 9 | 15 | 15 | 16 | 72 | 11 | 58 | 3 |
| real-estate | 4 | 2 | 0 | 0 | 1 | 2 | 9 | 1 | 8 | 0 |
| **all** | 15 | 8 | 9 | 15 | 16 | 18 | 81 | 12 | 66 | 3 |

Per task, from `counts.mjs` (edge and severity left out):

```text
s1-01 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
s1-02 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
s1-03 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
s1-04 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
s1-05 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
s1-06 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
s1-07 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
s1-09 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
s2-01 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
s2-02 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
s2-03 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
s2-05 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
s2-07 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
s2-08 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
s2-09 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
s2-10 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
s3-01 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
s3-02 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
s3-03 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
s3-04 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
s3-05 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
s3-06 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
s3-07 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
s3-08 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
p1 candidates=2 refused=0[-] end-fail=0 valid=1 weak=1 broken=0 error=0 ungraded=0 kept=1
p2 candidates=2 refused=0[-] end-fail=0 valid=1 weak=0 broken=0 error=0 ungraded=1 kept=1
p3 candidates=2 refused=0[-] end-fail=0 valid=1 weak=0 broken=0 error=0 ungraded=1 kept=1
p4 candidates=2 refused=0[-] end-fail=0 valid=1 weak=0 broken=0 error=0 ungraded=1 kept=1
p6a candidates=2 refused=0[-] end-fail=0 valid=1 weak=0 broken=0 error=0 ungraded=1 kept=1
p8a candidates=2 refused=0[-] end-fail=0 valid=1 weak=0 broken=0 error=0 ungraded=1 kept=1
p8c candidates=2 refused=0[-] end-fail=0 valid=1 weak=0 broken=0 error=0 ungraded=1 kept=1
p8d candidates=2 refused=0[-] end-fail=0 valid=1 weak=0 broken=0 error=0 ungraded=1 kept=1
p8e candidates=2 refused=0[-] end-fail=0 valid=1 weak=0 broken=0 error=0 ungraded=1 kept=1
```

- **Severity of the seeded bugs** is the seeder's judgement by the step 5 rule: 12 high, 66 medium, 3 low. The 81 kept bugs are weighted 3, 2, 1 by 8.4.
- **Seeded checks are in no H1 or H2 score** (ruling 9). `floorScore` never reads `<task>/seeded/`. The step 5 and step 6 locks are unchanged by this step (see the compares below).

## Kills (ruling 10)

`kills` ran on all 33 tasks in Task 7, and again after the correction of ruling 14 (`rerun-kills.sh`: 33 tasks, 86 grade lines, all 86 `reused`, no Docker build, no app start, pgsnap lists equal); every line is `bugs=3` (external) or `bugs=1` (real-estate), no `not judged`, no non-zero exit. The numbers below are the rerun's. `fix` is the number of bugs killed by at least one check of the fix-commit oracle, `step` the same for the step oracle.

| set | bugs | fix kills > 0 | with a step oracle | step kills > 0 (of those) | killed by neither |
|---|---|---|---|---|---|
| external | 72 | 28 (39%) | 0 | - | 44 (61%) |
| real-estate | 9 | 1 (11%) | 5 | 2 (40%) | 6 (67%) |

- External `fix=n/3` per task: s1-01 0, s1-02 3, s1-03 2, s1-04 2, s1-05 0, s1-06 1, s1-07 0, s1-09 1, s2-01 2, s2-02 0, s2-03 1, s2-05 1, s2-07 1, s2-08 0, s2-09 0, s2-10 1, s3-01 1, s3-02 2, s3-03 0, s3-04 3, s3-05 1, s3-06 3, s3-07 1, s3-08 2 (sum 28 over 72 bugs; Task 7 first recorded s1-02 0 and s2-01 1, sum 24).
- Real-estate: p1 fix 0/1, p2 0/1, p3 0/1, p4 0/1 (no step oracle); p6a fix 1/1 step 0/1; p8a 0/1 and 0/1; p8c 0/1 and 1/1; p8d 0/1 and 1/1; p8e 0/1 and 0/1.
- `kills.json` files after the rerun: **10 changed** (p6a, p8d, s1-02, s1-03, s1-04, s1-06, s2-01, s3-03, s3-06, s3-08), counted by hash between the Task 7 lock's list and the correction's (the other 23 of 33 are equal); the first draft said 11. Real-estate's killed counts did not change, while p6a's and p8d's `of` moved. This reconciles with the 9 external tasks of the stale `excluded` finding: 8 of them changed (s2-07's stale list moved no number, so its file is equal by hash), plus the 2 real-estate tasks that the same fix touched. p3 and p8a have 0 of 0 live fix checks (every fix check is excluded), printed `0/1`; p3 has no step oracle, so it had nothing to kill with and still counts in "by neither" (p8a's step oracle of 14 checks killed 0); step 14 filters `of > 0`.
- `lock-excluded.mjs` recomputes the external kills from the validation's list and gets 28 of 72, with 0 bugs differing from `kills.json`.

### External H1 sensitivity (ruling 13)

An external task's step oracle is a subset of its `oracle/`, so `kills` prints `step=none` there. `lock-step-sens.mjs` reads `<task>/step.json` `ids` and, for each kept bug, `<task>/grades/<fix7>.json` and `<task>/grades/<bug7>.json` (check ids and results only), and counts the bugs where a step id passed at the reference and is `fail` or `precondition` at the bug, leaving out the ids in the bug grade's `excluded` as `kills` does. No step id was missing from a grade, and no grade was missing.

```text
s1-01 step-ids=0 bugs=3
s1-02 step-ids=1 bugs=3 caught-by-a-step-id=3
s1-03 step-ids=9 bugs=3 caught-by-a-step-id=1
s1-04 step-ids=4 bugs=3 caught-by-a-step-id=0
s1-05 step-ids=1 bugs=3 caught-by-a-step-id=0
s1-06 step-ids=0 bugs=3
s1-07 step-ids=2 bugs=3 caught-by-a-step-id=0
s1-09 step-ids=4 bugs=3 caught-by-a-step-id=1
s2-01 step-ids=3 bugs=3 caught-by-a-step-id=0
s2-02 step-ids=1 bugs=3 caught-by-a-step-id=0
s2-03 step-ids=1 bugs=3 caught-by-a-step-id=1
s2-05 step-ids=1 bugs=3 caught-by-a-step-id=1
s2-07 step-ids=5 bugs=3 caught-by-a-step-id=1
s2-08 step-ids=1 bugs=3 caught-by-a-step-id=0
s2-09 step-ids=2 bugs=3 caught-by-a-step-id=0
s2-10 step-ids=2 bugs=3 caught-by-a-step-id=0
s3-01 step-ids=0 bugs=3
s3-02 step-ids=5 bugs=3 caught-by-a-step-id=2
s3-03 step-ids=1 bugs=3 caught-by-a-step-id=0
s3-04 step-ids=1 bugs=3 caught-by-a-step-id=1
s3-05 step-ids=1 bugs=3 caught-by-a-step-id=0
s3-06 step-ids=4 bugs=3 caught-by-a-step-id=0
s3-07 step-ids=0 bugs=3
s3-08 step-ids=2 bugs=3 caught-by-a-step-id=0
external: tasks with a step id=20, bugs=60, caught by a step id=11, tasks with a catch=8, missing grade=0, step id absent from a grade=0, catch not a fix kill=0, step ids found in a bug grade's excluded=0
no step id (4): s1-01 s1-06 s3-01 s3-07
```

- **Tasks with a step id: 20. Their kept bugs: 60. Caught by a step id: 11 (18%), in 8 tasks** (s1-02 3, s1-03 1, s1-09 1, s2-03 1, s2-05 1, s2-07 1, s3-02 2, s3-04 1).
- **The 4 tasks with no step id, not counted** (their 12 bugs are outside H1): s1-01, s1-06, s3-01, s3-07.
- The other 49 of the 60 are caught by no step id. This is a sensitivity of H1's near-binary score (step 6 lock, "Known limits"), not a result for any arm.
- All 11 are also fix kills in `kills.json` (0 catches that are not), and no step id is in a bug grade's `excluded`. Before the correction, s1-02's 3 catches (its only step id `98132c9-T1`) were not fix kills, because `kills` read a stale end grade list.

## Bugs, ids and commits

`lock-bugs.mjs` prints, per candidate with a commit, the set, task, bug id, the bug's commit, its `state`, `edge`, `severity` and `why`, and nothing else; this lock keeps the id, the commit, the `state` and the `why` (final review, ruling 19). 138 lines: external 120 (kept 72), real-estate 18 (kept 9). `state` is `kept` (81), `ungraded` (56) or `dropped` (1, `why` weak); `why` is `-` where the state is not `dropped`.

```text
external s1-01 sb-s1-01-1 222897059b3debbc6c70b2f1ea40459ff746d9fe kept -
external s1-01 sb-s1-01-2 0009791e249829afaea47471809049081aacd8fe kept -
external s1-01 sb-s1-01-3 c29dd51512388b805512c72610b9c67083270125 kept -
external s1-01 sb-s1-01-4 2511298961adca068acdb3020d4e59a1532b31ed ungraded -
external s1-01 sb-s1-01-5 f789545f9c5c9208f310bf0a683b227852b27781 ungraded -
external s1-02 sb-s1-02-1 925c6321562de017e9053a91313d3e3a4c3f6624 kept -
external s1-02 sb-s1-02-2 39ae111c7223bdc991a6cc6ca9e75debb3d3b2bf ungraded -
external s1-02 sb-s1-02-3 6e824e05a74652d245ac4f5952f649c296fda820 kept -
external s1-02 sb-s1-02-4 fffdd4ff68d2c6b6cfa7f6c96a96006592dbe98a kept -
external s1-02 sb-s1-02-5 8de4043bf98a42b07b1bed364e96570c2a748a09 ungraded -
external s1-03 sb-s1-03-1 e996f7b74701603a4782ca0be5e4bb0b580e7ffe kept -
external s1-03 sb-s1-03-2 b554d84c52cf2ad9d9cccad49c5fa26d35eb869c kept -
external s1-03 sb-s1-03-3 632867aaf776317dd96d894bacbb223cd377111a ungraded -
external s1-03 sb-s1-03-4 70b173c32f70b6a3d4eca6538709eb9961720ab4 ungraded -
external s1-03 sb-s1-03-5 14c09beeaff33be6d0d89608a0e4cacc7da67fbf kept -
external s1-04 sb-s1-04-1 95031a5fb19951acbbfdb33c8bc4e961f90561fe kept -
external s1-04 sb-s1-04-2 9c5c3e40382003df6699efea60e13b2d55fec148 ungraded -
external s1-04 sb-s1-04-3 784054fb16665e2e45931512ba98d18beefe358c kept -
external s1-04 sb-s1-04-4 9d53be195872e9cd0112216728bde9b12324e87d ungraded -
external s1-04 sb-s1-04-5 d5efbf6cadfca77f1a4a96fe37988e28f7421351 kept -
external s1-05 sb-s1-05-1 40369847f413d64b652df99262422658605b36a8 ungraded -
external s1-05 sb-s1-05-2 8f4d13b692a7342d92ba5dcfc2e4b1f95add46a2 kept -
external s1-05 sb-s1-05-3 bb72ccb56cc90b37b8776fd5c4a9b2a979ae567f ungraded -
external s1-05 sb-s1-05-4 2697aef4b27e892cfe98526ec5715ed9dc3ab6ff kept -
external s1-05 sb-s1-05-5 a2578dcbff10f9d21c98e11836cd8a438b688a2f kept -
external s1-06 sb-s1-06-1 460ca7a8da2470be896729cdb6acda9381481406 kept -
external s1-06 sb-s1-06-2 c925c7af0fe27e568e51948f405ba00ced53f556 ungraded -
external s1-06 sb-s1-06-3 52f90de6842a62eeb0c50479a64d19869ac414cf kept -
external s1-06 sb-s1-06-4 94db3985c98871f40817012b8a431dccf50f7073 ungraded -
external s1-06 sb-s1-06-5 0ac584ad41dede771cb404f761f7908f2b8059fc kept -
external s1-07 sb-s1-07-1 4946bd9c4f4be2dd2843003670ce7dd12ea555b0 kept -
external s1-07 sb-s1-07-2 8190a06264e2d04d36946394691726041a46801e ungraded -
external s1-07 sb-s1-07-3 a16f093f1edfcc22d17282276156bd64e6a28919 kept -
external s1-07 sb-s1-07-4 9e4cacc81914524b0caa7e31164901f8b87710db ungraded -
external s1-07 sb-s1-07-5 2193f16135df4ac60fc1f756d2b12dc4224f4d01 kept -
external s1-09 sb-s1-09-1 6938a5ad6d6abe1e2f59b0cb19b58daf7d7a5e92 ungraded -
external s1-09 sb-s1-09-2 31bc6afaf141b048f870d880a5a7723819e42a07 kept -
external s1-09 sb-s1-09-3 2961e995cd09e9b1d6c71b6428390a05d0ff074c ungraded -
external s1-09 sb-s1-09-4 935fce4a879b4fd8f246216204c6a63fd72818ab kept -
external s1-09 sb-s1-09-5 2c17d5c2f9ea5d525fbcd45dbaa2c096595327b5 kept -
external s2-01 sb-s2-01-1 a598a045ab6ff4dcc47c071c6c594bb084a0ae47 kept -
external s2-01 sb-s2-01-2 a02f86222107044566508d28c597ce10b69a49dd kept -
external s2-01 sb-s2-01-3 0e8a189b50140c4389bc3f5f8247f47d2f80e267 ungraded -
external s2-01 sb-s2-01-4 9e5258ff742cfefaae4a849ed26e273802d6de39 ungraded -
external s2-01 sb-s2-01-5 276dc1d9bcda86f9527458460992815181959d3f kept -
external s2-02 sb-s2-02-1 0ce541c23aed718647d5f4455407008bd25438ba ungraded -
external s2-02 sb-s2-02-2 0c2795ed8783b088596c7d089e82d25a3102898a kept -
external s2-02 sb-s2-02-3 697368ed050591e2269546386787aa2acaf7c291 kept -
external s2-02 sb-s2-02-4 5ac9c069099f15de36322c5a401ec2a558fb8017 kept -
external s2-02 sb-s2-02-5 6b0560b6fdad3f0ce72796b46bfa2300446b1624 ungraded -
external s2-03 sb-s2-03-1 bbb1d6f1c20d5f256b157d63bf5960963602365b kept -
external s2-03 sb-s2-03-2 cd976afa0a86e246cbbead0664fc5dd6fbf59dad kept -
external s2-03 sb-s2-03-3 eff53158009c7ecae79aff8d3a774faf2ecb57c6 ungraded -
external s2-03 sb-s2-03-4 f7210f13b7515cd2a304ad7f3d1bd1561ac850b1 kept -
external s2-03 sb-s2-03-5 2acc5c454a9cae4ce2a87fbcb744f54ad31dda16 ungraded -
external s2-05 sb-s2-05-1 990fb62d226b1f9d5228e75d1f7af2015f95694a kept -
external s2-05 sb-s2-05-2 747ab65348c481a416a2eeca9040828942635ca5 kept -
external s2-05 sb-s2-05-3 b334705dbeb49cc98cd5f0d75c6a72132c8a1180 ungraded -
external s2-05 sb-s2-05-4 c8cfe12bbb97688c037f433fd6b10d4c16c0f635 ungraded -
external s2-05 sb-s2-05-5 66bba0ac634d13bcff5e8e265cdde17d5b3b1b87 kept -
external s2-07 sb-s2-07-1 4a3e2fdd819ba594eb08b321b240336477cfd2e4 ungraded -
external s2-07 sb-s2-07-2 2a9258eb0424d01f563418613e5e0958e67e023b kept -
external s2-07 sb-s2-07-3 cb7a16b02133b625f330c0f26e62ca527bd45b1a ungraded -
external s2-07 sb-s2-07-4 295e3ff366a35c2eac95e78cbe0753f39b62bf53 kept -
external s2-07 sb-s2-07-5 cc192bcb82f0c9bb8acf7c0ea7741c96d352d6d1 kept -
external s2-08 sb-s2-08-1 ff0c815eaaef2424813745a76669b7261db7d89d ungraded -
external s2-08 sb-s2-08-2 57c072ef6731dddaf330df0a6b7f74fbdd330a15 kept -
external s2-08 sb-s2-08-3 703d7f411d9390bed428553961a5faec3df3ebf4 kept -
external s2-08 sb-s2-08-4 be34c864824a99cd6418a572b69650050a578486 kept -
external s2-08 sb-s2-08-5 ab4dea13f25dda2fc867aa6fe8c8f02abbb141b5 ungraded -
external s2-09 sb-s2-09-1 0bd39114bf6dcdeb47869ce5036a40ef77f7bb34 ungraded -
external s2-09 sb-s2-09-2 3dbe3bf0eb602a91cdf6575bfc2451533d97a011 kept -
external s2-09 sb-s2-09-3 b2a1ff493f76575a4771b36e6e519bf9c526f4a7 kept -
external s2-09 sb-s2-09-4 fa54489227ebedd62ae19d58b4e85b8d068eb32c kept -
external s2-09 sb-s2-09-5 1193888d394510c090d1d2ab96de639221af19ad ungraded -
external s2-10 sb-s2-10-1 a1aff0f52f46278e3b0c7c9337398f0bf3c3a26d ungraded -
external s2-10 sb-s2-10-2 cee7efca156cb10f353d2484e0f9000de64c7d5e ungraded -
external s2-10 sb-s2-10-3 83f86a1ba1c203d9454b8ac1c665c0730f523b6e kept -
external s2-10 sb-s2-10-4 5fcc5062aa8c7c3957cbd40a1051722178638ff7 kept -
external s2-10 sb-s2-10-5 6772aaed12ca3e793bd2fd6e863912caf81f6c48 kept -
external s3-01 sb-s3-01-1 ccf70014e34150a9a1622b89b51c452c6c156040 kept -
external s3-01 sb-s3-01-2 98ee2b0c17f8afc32fca425924455b744a7474f4 kept -
external s3-01 sb-s3-01-3 1a411e37aec368834cabfbdf5376a54926fe9c1f kept -
external s3-01 sb-s3-01-4 43d80687651d48ca0613d211d9ce9bac7c938f53 ungraded -
external s3-01 sb-s3-01-5 bc780f573f6d977a21920c340811fe9822040ccf ungraded -
external s3-02 sb-s3-02-1 8055ec23ca872f87adc85db9b494e8fb6ef33cf4 ungraded -
external s3-02 sb-s3-02-2 c91a35f61ab44cb29ec2ed8d0b1694655143dd3d kept -
external s3-02 sb-s3-02-3 d35020ab1a79f4a7c2ce97948d49af14c540f0f7 kept -
external s3-02 sb-s3-02-4 e444d75e3f97bfe330bb25a8d8e92d53f00ee338 ungraded -
external s3-02 sb-s3-02-5 906f6b5df15172d223a8e6a4ba23032bf6fe55c4 kept -
external s3-03 sb-s3-03-1 71a2ce236d7bdecd0310c49a3369471bbdb6f392 ungraded -
external s3-03 sb-s3-03-2 5ca3904740b1e07458fd8be435f8bfc1346f5c1d kept -
external s3-03 sb-s3-03-3 97cd720fdcd3c470425c3f7ad5ca77a14ca2c503 ungraded -
external s3-03 sb-s3-03-4 37b4a66a10e9956e492bdc7de3b7da4549f45b75 kept -
external s3-03 sb-s3-03-5 f6fb858f80a1b5c9072296a61d6f3b138709085d kept -
external s3-04 sb-s3-04-1 3be7ab5b9b6f54ef9bd176b9bcbd32cf95bed8e2 ungraded -
external s3-04 sb-s3-04-2 2a40fc3f43cb0617c0e307cbc679297853119648 kept -
external s3-04 sb-s3-04-3 850ac36591762ccb81205e06b3a04691170be381 ungraded -
external s3-04 sb-s3-04-4 b5ba3b6a3867b6e3ca3e010d6c7c77bf2c014aa0 kept -
external s3-04 sb-s3-04-5 fbc05bfc0416ef897b13e645bd20db645a0cdacc kept -
external s3-05 sb-s3-05-1 68f3149d5cb0a6cf6cb0c11096bf887d10755ade kept -
external s3-05 sb-s3-05-2 2baffe5a1dd752d775419c21a3eaa45a1d53ac10 kept -
external s3-05 sb-s3-05-3 2d6f5932bb6e6d6ccc5a0a1a1d47d688f42a1c1c kept -
external s3-05 sb-s3-05-4 dc8aaea6ecda592a1a8cc725a84281f7d1f20953 ungraded -
external s3-05 sb-s3-05-5 c9522f0587f3185b1a918a7a136af20b985d26b6 ungraded -
external s3-06 sb-s3-06-1 efc7ad535023616d458a2b58060ac47914183a19 ungraded -
external s3-06 sb-s3-06-2 4a346c000ed25c6400f7f99a347cdcee8d9c1d71 kept -
external s3-06 sb-s3-06-3 7985bd68628be7ebd5d1aa0564d734feaef2db13 ungraded -
external s3-06 sb-s3-06-4 cf57e66a059e0389250bc606e2b88c54a924d934 kept -
external s3-06 sb-s3-06-5 777ea50c26a397ce5fba42d47d05a7d2445c6afb kept -
external s3-07 sb-s3-07-1 54dbabdb56f65fdf1318fe1818a893a8db2bede1 kept -
external s3-07 sb-s3-07-2 a70f2a2d32b4fe3ed234a655dc1ff03bd4687902 kept -
external s3-07 sb-s3-07-3 283b3bd4a3f214fe63e671abb40cc1b87a87b2e8 ungraded -
external s3-07 sb-s3-07-4 c08eb53f7e3bf434d10a14b528144628f73c2ed7 ungraded -
external s3-07 sb-s3-07-5 2e34dfe8a51d7e355921aae853e8ff1bdc6d1d96 kept -
external s3-08 sb-s3-08-1 a2c2ccd23fdd62a572a27a6a7b108556f560fc9f kept -
external s3-08 sb-s3-08-2 37e2efc37684e1b773037ebf59388a9b6f0c96e6 ungraded -
external s3-08 sb-s3-08-3 21f9df9ab0df9dca191aeb4a76f5bcb036037d2f ungraded -
external s3-08 sb-s3-08-4 821583a153195e5dc4ba6aeae6249ba004dc490d kept -
external s3-08 sb-s3-08-5 d29cb6326ae7e96736e306d1f962f4f838f28585 kept -
# external: with a commit 120, kept 72, without a commit 0
real-estate p1 sb-p1-1 28d4761d237f37733f566b282c294ea1bb14ef47 kept -
real-estate p1 sb-p1-2 669123c0e89f16d5b78ae781a4c7fd99f5d9afae dropped weak
real-estate p2 sb-p2-1 978e8d088ec7c9b8c138b9b09e9d1e78952a9ecf ungraded -
real-estate p2 sb-p2-2 5b774a73cb491719da95cc89787bd50bb03796e7 kept -
real-estate p3 sb-p3-1 d571b942e3632af224e1466816ba7a36e95594cd kept -
real-estate p3 sb-p3-2 286729431a70be456e02c00e5a8e26b1d437dc3e ungraded -
real-estate p4 sb-p4-1 b1a1170b237cb7834da93e1f894ca571ada6aeec ungraded -
real-estate p4 sb-p4-2 54f7aa8183e05748601fb402c4b9765e7a2de0c9 kept -
real-estate p6a sb-p6a-1 29d4a972fdc8aaf3db7cbd3abe429aa6345e1022 ungraded -
real-estate p6a sb-p6a-2 ca739a33576d63b6082c60fdc60c49c640b5e212 kept -
real-estate p8a sb-p8a-1 aad051d3083acf509fd60eb759ba2d0a449aa90b ungraded -
real-estate p8a sb-p8a-2 d46e6d35e88361e4be7c0bb824de38eef785f5ba kept -
real-estate p8c sb-p8c-1 458d516ecfa69a3f475fdb74ed6d55e9c453dcc4 ungraded -
real-estate p8c sb-p8c-2 e28f30169d3143fcc7c890b2381ce46256089c7e kept -
real-estate p8d sb-p8d-1 39236ac3155f3c4f93ff8b6af8d3ed6ba06dd1f7 kept -
real-estate p8d sb-p8d-2 990d0be7c500749af884e104c1b08c976d05fff3 ungraded -
real-estate p8e sb-p8e-1 0f53dc49be3ddb0b1ba0d048a036a5179525980d kept -
real-estate p8e sb-p8e-2 aedf524acbca822656c01785891e8e65c43bef6d ungraded -
# real-estate: with a commit 18, kept 9, without a commit 0
```

## The sealed repos

`lock-refs.mjs` runs `git for-each-ref --format='%(refname) %(objectname)' refs/seeded` on each sealed repo and compares it with `bugs.json` (the `id` and the commit `end` of each candidate with a commit).

```text
django-commons__django-debug-toolbar.git tasks=s1-01 bugs-with-commit=5 refs=5 missing=0 unequal=0 ref-without-entry=0
fossasia__eventyay.git tasks=s1-02 bugs-with-commit=5 refs=5 missing=0 unequal=0 ref-without-entry=0
openfoodfoundation__openfoodnetwork.git tasks=s1-03 bugs-with-commit=5 refs=5 missing=0 unequal=0 ref-without-entry=0
open-source-legal__opencontracts.git tasks=s1-04 bugs-with-commit=5 refs=5 missing=0 unequal=0 ref-without-entry=0
netbox-community__netbox.git tasks=s1-05,s1-07 bugs-with-commit=10 refs=10 missing=0 unequal=0 ref-without-entry=0
paperless-ngx__paperless-ngx.git tasks=s1-06 bugs-with-commit=5 refs=5 missing=0 unequal=0 ref-without-entry=0
we-promise__sure.git tasks=s1-09 bugs-with-commit=5 refs=5 missing=0 unequal=0 ref-without-entry=0
runmaestro__maestro.git tasks=s2-01 bugs-with-commit=5 refs=5 missing=0 unequal=0 ref-without-entry=0
coder__xum.git tasks=s2-02,s2-10 bugs-with-commit=10 refs=10 missing=0 unequal=0 ref-without-entry=0
cherryhq__cherry-studio.git tasks=s2-03,s2-05 bugs-with-commit=10 refs=10 missing=0 unequal=0 ref-without-entry=0
ismaelmartinez__teams-for-linux.git tasks=s2-07 bugs-with-commit=5 refs=5 missing=0 unequal=0 ref-without-entry=0
super-productivity__super-productivity.git tasks=s2-08 bugs-with-commit=5 refs=5 missing=0 unequal=0 ref-without-entry=0
kizuna-ai-lab__sokuji.git tasks=s2-09 bugs-with-commit=5 refs=5 missing=0 unequal=0 ref-without-entry=0
voidzero-dev__vite-plus.git tasks=s3-01 bugs-with-commit=5 refs=5 missing=0 unequal=0 ref-without-entry=0
tokio-rs__toasty.git tasks=s3-02 bugs-with-commit=5 refs=5 missing=0 unequal=0 ref-without-entry=0
rust-lang__cargo.git tasks=s3-03 bugs-with-commit=5 refs=5 missing=0 unequal=0 ref-without-entry=0
chakra-ui__panda.git tasks=s3-04 bugs-with-commit=5 refs=5 missing=0 unequal=0 ref-without-entry=0
lancedb__lancedb.git tasks=s3-05 bugs-with-commit=5 refs=5 missing=0 unequal=0 ref-without-entry=0
nautechsystems__nautilus_trader.git tasks=s3-06 bugs-with-commit=5 refs=5 missing=0 unequal=0 ref-without-entry=0
pola-rs__polars.git tasks=s3-07,s3-08 bugs-with-commit=10 refs=10 missing=0 unequal=0 ref-without-entry=0
real-estate.git tasks=p1,p2,p3,p4,p6a,p8a,p8c,p8d,p8e bugs-with-commit=18 refs=18 missing=0 unequal=0 ref-without-entry=0
sealed repos=21 refs=138 bugs-with-commit=138 mismatches=0
source repos checked=30 (ext/repos 29, real-estate copy 1) holding refs/seeded=0 refs=0
```

- **21 sealed repos, 138 refs, 138 candidates with a commit: for every candidate the ref is present and equal, and there is no ref without a `bugs.json` entry (0 mismatches).** A repo shared by two tasks (s1-05 and s1-07, s2-02 and s2-10, s2-03 and s2-05, s3-07 and s3-08) holds both tasks' refs; the 9 real-estate tasks share `real-estate.git`.
- **`ext/repos/*` (29 repos) and the real-estate copy (1) hold no `refs/seeded`: 30 source repos checked, 0 refs.**
- `lock-files.mjs`: all 33 tasks have `bugs.json`, `validation-<end7>.json` and `kills.json` (81 `kills.json` rows, one per kept bug); the validation files hold 138 rows: 81 `valid`, 1 `weak`, 56 `error` with stage `not graded`; every candidate has a validation row.

## Final review: how many checks a bug breaks

The final review asked how many of a graded bug's own seeded checks do not pass at its commit (a check that fails beside the bug's own would mean a bug that breaks more than an edge). `nonpass-count.mjs` reads, for every `seeded/validation-*.json` of the 33 tasks, each commit in `bad`, and counts the results that are not `pass` in that task's `seeded/grades/<sha7>.json` (results only):

| non-pass of the task's seeded checks | graded bugs |
|---|---|
| 1 of 5 | 56 |
| 2 of 5 | 12 |
| 3 of 5 | 4 |
| 1 of 2 | 9 |
| 0 of 2 | 1 (p1's `weak` bug) |

82 graded bugs in all. No run has every check failing. The only bug with a `precondition` result beside its own `fail` is sb-s2-07-4 (commit `295e3ff`): 2 `precondition` and 1 `fail` of its 5 seeded checks. Its fix-commit oracle grade was rerun once without `--reuse` (ruling 16): `junit=ok`, 1 `fail` and 8 `precondition` of 9 checks, 2 of them excluded, so it fails every one of the 7 live fix checks, as in Task 7 (killed 7 of 7). `kills s2-07` was then rerun on reused grades: `kills.json` is **byte-equal** to the one before (`bugs=3 fix=1/3`). So the 7 of 7 is the bug, not a machine failure. It stays kept (ruling 16), recorded as broader than an edge: it removes the feature the task's own checks guard, and the section 8.3 validation, which judges a check against its own bug only, cannot see that.

The measured breadth: 16 of the 70 graded five-check bugs fail 2 or 3 of their 5 checks (12 and 4; sb-s2-07-4 is one of the 4). Why a second check fails there is not known: no check or bug was read.

**Known limit.** A kept bug can break more than the edge its check guards, so an arm's catch of it may be a catch of the shared code path rather than of the edge, and a catch rate over 81 bugs is a little inflated. Step 14 can leave sb-s2-07-4 out, or report the rate with and without the bugs that fail 2 or more of their task's checks.

## Final review: the app log of a sealed grade (I2)

`grade --sealed` sent the oracle's output to the sealed `logs/` folder, but `withEnv` kept the app's start log next to the worktree in the temp folder, outside the sealed folders. Found by the final review: 10 app logs of bug commits and about 2 KB per live grade in `logs/step7/*.out` (the `.out` files are treated as sealed from now on). `/tmp/hstack-bench` was cleaned (`bun bench/env.mjs clean` after `pgrep` showed no lane running). `runOracle` now passes `quiet: flags.sealed`, as `replay.mjs` and `agent-replay.mjs` do (commit `6ad2383`, one test, one README sentence): setup and teardown output go nowhere and the start log is removed. A start that fails under `--sealed` has no log; to see why, rerun without `--sealed` on a commit that holds no bug (ruling 18). **Open point:** the sandbox that `bench/run-arm.mjs` requires before step 8 must cover `/tmp/hstack-bench`.

## Checks at the lock

- **Hash compares** (rerun after the final review's runs; the files are unchanged by this step):
  - `bun logs/step6/lock5-compare.mjs progress/step5-lock.md <data> <repo>`: **hashed 1369, equal 1369, changed 0, missing 0.**
  - `bun logs/step7/lock6-compare.mjs progress/step6-lock.md <data> <repo>`: **hashed 572, equal 572, changed 0, missing 0.**
  - `bun logs/step7/lock6-compare.mjs progress/step7-lock.md <data> <repo>`: the list of the Task 8 commit (1071 hashes) gave **hashed 1071, equal 1071, changed 0, missing 0** after the final review's `grade` and `kills` of s2-07; the list below (1072, with `nonpass-count.mjs`) is the recomputed one, and the same compare on it gave **hashed 1072, equal 1072, changed 0, missing 0**. The final review's grade rewrote `s2-07/grades/295e3ff.json` (new `at`; no lock hashes that file), and `s2-07/seeded/kills.json` is byte-equal.
  - `docker.json` and `build/readiness.tsv`, which `oracle-run` rewrites, are in neither lock's hashes. A reused end grade is written back byte for byte, and this compare proves it. No end grade was removed by `kills`, so the deferred minor "kills may remove an all-error end grade a lock hashed" did not occur.
  - `lock6-compare.mjs` is the same code as `lock5-compare.mjs` under its own name; `bun logs/step7/lock6-compare.mjs progress/step7-lock.md <data> <repo>` rechecks the hashes below.
- **Tests.** `bun test ./tests`: 420 pass, 21 skip, 0 fail, 441 tests in 26 files, output pristine (rerun after the final review's code changes). `git status --short` is empty at the commit of this lock for `bench/` and `tests/`.
- **Tools.** The last change to `bench/` is commit `6ad2383` ("Regrade a seeded bug whose run gave no results, and keep a sealed grade's app log out of the temp folder": `gradeBugs` removes a bug grade whose checks are all `error`, `runOracle` passes `quiet: flags.sealed`, two tests renamed, two tests added, one README sentence). Before it, `09818c21d1d79aa44952208879bf3ee77afc7188` ("Read a kill's excluded list from the bug grade, because a kept end grade can hold an older one") and `8f338db06f7e9c82124b70af78c45aa1a23d5f78`, which the Task 7 `kills` ran on. The final review's one `grade` (s2-07, sb-s2-07-4) ran on `6ad2383`'s code.
- **Hash tool.** `lock-hash.mjs` hashes with Bun's SHA-256. Two files were checked against `shasum -a 256`, `env/seeded/s1-01.json` and `logs/step7/lock-bugs.mjs`, and the hashes agree.
- **Docker left** (the two listings only, as in the step 5 lock):
  - `docker ps -a --filter name=bench-ext- --format '{{.Names}}'` lists 328 containers: 327 `bench-ext-fx*` fixtures of the gated tests and the decoy `bench-ext-other`.
  - `docker images 'bench-ext/*' --format '{{.Repository}}:{{.Tag}}'` lists 162 images: 161 `bench-ext/fx*` fixture images and `bench-ext/probe:net`; 0 with a tag ending `-serve` or `-grade`.
  - These are the same numbers as the step 5 lock, so the step added none. `docker system df` after the final review's `docker builder prune -f` (17.84 GB before it, above the 15 GB rule) and its one grade: Images 4.807 GB, Containers 5.565 MB, Local Volumes 386.1 MB, Build Cache 3.179 GB. The same two listings gave 328 containers and 162 images again, 0 with a tag ending `-serve` or `-grade`.
- **Databases.** `pgsnap` lists before and after, equal (`cmp`): Task 5 (`pgsnap-before.txt`, `pgsnap-after.txt`), Task 6 (`pg-before.txt`, `pg-after.txt`) and Task 7 (`pg-kills-before.txt`, `pg-kills-after.txt`). Six databases each time, so no `bench_re` was left; no `real_estate*` database was touched.

## Findings

- **`kills` read a stale `excluded` list (found at this lock, fixed).** `kills` took the excluded ids from the kept end grade. `lock-excluded.mjs` compared, per external task, that list with the ids of a verdict other than `valid` and `absent-at-base` in `validation-<end7>.json`: 15 tasks agreed and 9 differed (stale `broken` entries for ids now scored in s1-02, s1-03, s1-04, s1-06, s2-01 and s3-06; `broken` or `weak` ids not excluded in s2-07, s3-03 and s3-08). Controller ruling 8's cost line had assumed the validations did not change after the end grades; they did (ruling 14). The fix: `killsOf` reads `excluded` from the bug grade, which `grade` writes from the current validations (commit `09818c2`, test 'killsOf reads excluded from the bug grade, not a stale end grade'); `kills` reran on reused grades. Effect: the external fix kills went from 24 to 28 of 72 (s1-02's three bugs and s2-01's second bug); the real-estate shares and the end grades did not change. The real-estate oracles hold checks of several source commits, so `lock-excluded.mjs` does not compare them.
- **The plan quoted a half-width of 10.2 points for 81.** The computed value is 0.0998 (10.0 points).
- **`seed` on the pilot tasks** (s1-01, s2-01, s3-01, p8a) was reused in Task 6 in 1 to 2 s each and printed the same line as in Task 5.

## Open points

- **A step 9 second batch changes a real-estate `oracle/`**, so its `kills` grades stop being reused and step 10 runs `kills` again for those tasks. The same compare then has the changed `oracleSha` to show it.
- **Tasks the step 11 walk adds** run `seed` and `kills` (and the external H1 sensitivity), and the stick v1 lock is amended (section 2, the user's decision of 2026-11-05). The walk must add at least 4 external tasks with a non-empty step oracle (step 6 lock, "H1's N").
- **A seeded bug's `agent-replay` and the `patch` file the evaluator layer wants** belong to the plan of step 13: `agent-replay` refuses a bug whose `fix` is inside its `end`, which every seeded bug is, and `bugs.json` holds no `patch`.
- **H5's porter has no row in section 11:** about 81 x 3 runs x 0.1M = 24M tokens per arm measured, plus the suite runs (the user's decision, option 1).
- **The states in `bugs.json`** are `kept` (81), `ungraded` (56) and `dropped` (1); ruling 15 removed `valid-spare` from the plan and prereg 8.3. Prereg 8.3 ruling 8 reads "(7.1, ruling 11)" and should read "step 5 ruling 11" (a text correction for a later docs pass).
- **Rerunning `seed` on a locked task rewrites `validation-<end7>.json`** (a new `at`), so only a new task runs it (M6); a rerun on a locked task would change the hashed validation file.
- **Stick v1 must also hash `<task>/grades/<bug7>.json` and `<task>/step/grades/<bug7>.json`** (M8): `kills` writes them, and neither this lock nor the step 5 and step 6 locks hash them.
- **The drivers' disk-full grep cannot fire under `--sealed`:** a later driver uses ruling 8 as amended (ruling 17): a task with `error` in its `seed` line, or `not judged`, is run once more, after a prune when the cache is above 15 GB.
- **The cost line of the "finding 4" ruling (ruling 9) also covers the fixer rounds spent on a machine failure:** an end whose checks are all `error` gets its 2 fixer rounds before it is `not judged`, and the tool cannot tell a machine failure from a real mistake without reading logs. None arose.
- **The fixer brief's wording:** `fix.md` tells a seeded fixer that a check came from a project test, which is wrong for a seeded check; reword it before any seed run for a new task.
- **The sandbox of `bench/run-arm.mjs`** must cover `/tmp/hstack-bench` before step 8 (see the app log above).
- **Deferred minors** from the ledger (lines `minor (deferred)`):
  - Task 1: prereg 8.3 ruling 8 "(7.1, ruling 11)" should read "step 5 ruling 11".
  - Task 2: `killsOf` with a check missing from the bug grade is not pinned by a test; `inChanged` is not run against a pure-deletion range in tests; `changedRanges` `slice(6)` has `diffHunks`' limit on paths with spaces.
  - Task 3: temp index removal on failure is untested; a throw in the `seedCommit` diff leaves the ref (aborts the caller); a non-UTF-8 byte on the edited line decodes lossily and passes the hunks gate; concurrent `seedRepo` on one repo races (tasks run one at a time).
  - Task 4: stage text `junit undefined` when a grade exits 0 with no file; a later copy of a refused candidate reads `duplicate`; a not-ready end line removes a good end grade in `kills` (`kills` regrades it); `fix.md` tells a seeded fixer a check came from a project test.
  - Task 4 (after fix round 2): the `rulings.md` scratch copy keeps the old wording of ruling 5 (not a repo file); `kills` may remove an all-error end grade a lock hashed (none did: the compares above report 0 changed).
- **The sealed repos depend on their source through alternates:** losing `ext/repos/` or the copy loses them, and `bugs.json`'s `edit` rebuilds them on the same sha. A source fetched deeper later needs one more `seedRepo` call (shallow file).

## Known limits

The plan's "Known limits" section (`docs/plans/2026-11-05-bench-seeded-bugs.md`) applies as written:

- the seeder writes the bug and its check together, so the check proves the bug is observable, not that a builder would make it, and `severity` is the seeder's judgement (no second labeller reads them);
- a check that passes at the reference once and fails at the bug once is `valid`, so a flaky check can pass (section 13's rerun is the guard);
- a bug in a small PR has few places to sit, so a task may stay under its count (none did);
- the sealed repos depend on their source through alternates;
- a step 9 second batch changes a real-estate `oracle/`, so step 10 runs `kills` again for those tasks;
- a seeded bug is on the reference, not on an arm's product (the H5 decision);
- `agent-replay` and the evaluator's `patch` file are a change for step 13;
- a bug at an edge the task's code does not handle cannot be seeded by editing it, so the seeded set leans to code that exists.

Not in this step: the canary (step 8), every human read (step 9), the hash of stick v1 (step 10), the H5 and layer tools (step 13), `agent-replay` over a seeded commit, any walk for more external tasks.

## Usage and wall clock

Sealed agents (`usage.mjs`, the sum of `usage` of every `*.run.json` under each task's `seeded/work/`; model claude-opus-5-5): **43 runs, input 577, output 882322, cache read 14431445, cache write 3127305.** Per task rows are in `progress/progress.md`, Task 6. The 5 tasks with a fixer round (s1-04, s1-06, p1, p2, p3) have 3 runs each (the seeder, the fixer and its comparer), the other 28 tasks one. `kills` ran no sealed agent. Task 8 ran none.

Wall clock from the drivers' `run-*.lines` (first start to last end): Task 5 (four tasks) 3051 s; Task 6 external lane 31793 s (8.83 h), real-estate lane 2010 s (33.5 min); Task 7 external lane 22962 s (6 h 23 min; `progress.md` quotes 22975 s from the lane-start file), real-estate lane 2094 s (34.9 min). `docker builder prune -f` ran 3 times in Task 5, 13 in Task 6 and 15 in Task 7, all by the build cache above 15 GB rule, none by a disk signal.

## Scripts (`<data>/logs/step7/`)

Counts-only; none prints a description, an edit, a hunk, a check or a reply. The `.out`, `.lines` and `.nohup` files, the `pg*.txt` lists, the prune logs and the `t-*` timestamps are not hashed.

| script | what it counted |
|---|---|
| `run-ext.sh`, `run-re.sh` | Task 6 drivers: `seed` one task at a time per lane, the cache rule before a task, one disk retry |
| `run-kills-ext.sh`, `run-kills-re.sh` | Task 7 drivers: `kills` per task, the same rules |
| `counts.mjs` | per task and per set: candidates, refused, end-fail, valid, weak, broken, error, ungraded, kept, kept by edge and severity, final n and half-width (`bugs.json` `state`, `why`, `edge`, `severity` only) |
| `kills-count.mjs` | per set: bugs, fix-killed, with a step oracle, step-killed, neither (`kills.json` ids and numbers) |
| `usage.mjs` | summed sealed-agent usage per task |
| `lock-hash.mjs` | wrote the hash lines below (rerun after the final review); prints counts per category |
| `lock6-compare.mjs` | recomputed SHA-256 of every file the step 6 lock hashed; prints counts and any changed or missing path |
| `lock-seed.mjs` | the last `seed` line of every task and the column sums |
| `lock-bugs.mjs` | bug id, commit, state, edge, severity, why |
| `lock-refs.mjs` | `for-each-ref refs/seeded` per sealed repo against `bugs.json`; refs in every source repo |
| `lock-files.mjs` | per task, `bugs.json`, `validation-<end7>.json`, `kills.json` present; verdict words of the validations |
| `lock-step-sens.mjs` | per external task, kept bugs caught by a `step.json` id, leaving out the bug grade's `excluded` (ids and results only) |
| `nonpass-count.mjs` | final review: per graded bug, the non-pass results of its task's seeded grade (histogram; the commit of a bug with a `precondition` result) |
| `rerun-kills.sh` | Task 8 fix: `kills` again on all 33 tasks, stopping at the first grade line that is not `reused`; `rerun-kills.lines` holds its lines |
| `lock-excluded.mjs` | per external task, the end grade's `excluded` against the validation's unscored ids; `kills` recomputed with the validation's list (28 of 72, equal to `kills.json` after the fix) |

`logs/step6/lock5-compare.mjs` and `logs/step6/lock-count.mjs` are the step 6 scripts (hashed in the step 6 lock); `lock5-compare.mjs` was rerun unchanged, and `lock-count.mjs` was not needed here.

## Hashes

`shasum -a 256` (computed with Bun's SHA-256) of 1072 files. Paths are relative to `<data>` and sorted bytewise. `node_modules` skipped; no symlink met; p8b has no seeded folder.

- Every file under `<task>/seeded/` of the 33 tasks (24 external, 9 real-estate): 1028 files, of which `bugs.json`, `kills.json` and `validation-<end7>.json` 99 (3 per task), `oracle/` 256, `grades/` 115, `logs/` 120, `work/` 438.
- `env/seeded/*.json`: 25 files (24 external and `real-estate.json`).
- Briefs: `briefs/seed-re.md` and `ext/briefs/seed.md`. 2 files.
- Every script and driver (`.mjs`, `.sh`) in `logs/step7/`: 17 files (`nonpass-count.mjs` added by the final review).

```text
82fa770d041f31d2a0a1d3ff0e67896831a26c1494a2b540b9e6a26a891debf4  briefs/seed-re.md
8f77f9c031ada9e9aafe0fcdb82b9b75bc6d58f5c5d9089abccd0dc8e07df138  env/seeded/real-estate.json
91db96e0a7ae3ac04c78afc3fdc8761685fe5227610822de9bf9b6f0be50f05a  env/seeded/s1-01.json
7ece0c303498c322e64028da84087040296a31d0d77269870c8e98e8d597857f  env/seeded/s1-02.json
1390141ef015fb0470d18a5f8c625b9c672c606d7170cc13b55249cbb265a389  env/seeded/s1-03.json
9a0d1d05ff9efe97f71aa0a17df4a663e1575c466aef4c2ab2f272f4423aebfd  env/seeded/s1-04.json
e6f5b6ea07be513a80a03c0c2abe0a8afc31d93bcb67559720f8627e117e9797  env/seeded/s1-05.json
b0ae7bd7596ebf0b2f8597878cdc59f585571138570a2cf26c342bc2def1cd86  env/seeded/s1-06.json
c17abd23cb6cc175e9368429657cffb71230f463f23bfc2cd3a50bb6b8e9e654  env/seeded/s1-07.json
d0f74e2cd9ae29d39b5a96db6ab5dc02ddee0a32d141ad7f0b90e640f0e41f68  env/seeded/s1-09.json
81c72658e00f98aa156ffaf00194e2eb318978e015772064c87b652704d87db9  env/seeded/s2-01.json
ed1dfdbcf2f97b820535f29b14bb292ec6395c5342e52f6c8c845ec6479cfdf0  env/seeded/s2-02.json
55fa99a3e684d4990b0b297c958f086f1b7047a099664598cd1a7d2bff0cc183  env/seeded/s2-03.json
bea2034709eb7defd2544c01ce0ecee1419b63a5ff0bcd776cbddb4ee2afbf92  env/seeded/s2-05.json
4121c3c4222a063b60d64737ac1736a79181e10fad13f6deca055f9793a065c8  env/seeded/s2-07.json
e5b022918d88b7a34879e780154ade70045418f66e93d23f8ccbb314b35bf7c3  env/seeded/s2-08.json
e1393fd6ee3e2ed0621157accae7b53583de356977a47af9d46c5a3b75458cdd  env/seeded/s2-09.json
4d9aa40c894a73d2b6d6c1c193ecd0fc49bcf615b263b777f0c5f7b933fb34c9  env/seeded/s2-10.json
4c1e78200efe6561b82efa3b1902a2ccc9ffbb9af5b59ccb6d1609c1fec3009f  env/seeded/s3-01.json
82e83cf0196d0c3e1cac0a5aeacbc189583d911d6d213f7f62cf97c94a739f78  env/seeded/s3-02.json
59fcf98878e2cac04d8d6e5daadde0b68ab9639d43b63f67b22c558001f57161  env/seeded/s3-03.json
bcc6998406147792b20c861102f8fb4897e66af91b1eb069de5b6f20ceb53f0b  env/seeded/s3-04.json
00349c92ce7ae6b5a09d47a8c86ed5c52497bc72e531e6b7b22c7c38d038504e  env/seeded/s3-05.json
e195f8bbf1f42973456f5fe5f4a20659cd1d8c27511622831bd9181dd2f66e85  env/seeded/s3-06.json
e904c677cece9fcf206061edf0295f267b0c0ba90c5f637647fbdb8cd6dc7c8a  env/seeded/s3-07.json
961858e1a7124dd79390b3a159f97d5f2fab57607b401af34032e96123317f30  env/seeded/s3-08.json
8180a49ec61d4388c382f06bf0dcd027331485d8e7b0052ecc70b30169840405  ext/briefs/seed.md
c04721ca1e3393b5454734cf9817b94d193d646ec16e35e18a0b7c5ede1bd7c6  logs/step7/counts.mjs
1c657b3ea6d651954c643748b5c8e7161f2d922e5241231b10f2295cd6f437b0  logs/step7/kills-count.mjs
b4280ee3dcedb26d5a5b4f327e208eb444ebe15391bec1f44ae42fe51fc20cb5  logs/step7/lock-bugs.mjs
47791053ccaec2e9e388aeccfdd1fe9df7daa871811f55ae240ecbad026ee83e  logs/step7/lock-excluded.mjs
ca6795a7db5c3b76de69e1c349e16cbaaed8bc3f4265362c503bd4f0f8e6a39e  logs/step7/lock-files.mjs
f1aa2ba38ed242d420e4309aecec93bec0286f49a1857d78ee39c98517193cd0  logs/step7/lock-hash.mjs
5ab9e15652abeb05a854949ca355ed483f9462c01d851394a6c1b2c82630d3e6  logs/step7/lock-refs.mjs
60ab3a5896256e4cc29694b3d64680e6cbed31b7b7c2469fca139787920d6a1c  logs/step7/lock-seed.mjs
a4df6b8407b85cc0fc1e241a6a1e29bfc8159df36b6ad5862bb31d4d5d10a355  logs/step7/lock-step-sens.mjs
0c2d4cfce74c4d7d029a4eb1c24cdd031b4799d9b4a14e85de12c1d4a56c1dfe  logs/step7/lock6-compare.mjs
17cd880eda52916f69c18d4dddf8859f724a6d700895454584d06f6f471e2f25  logs/step7/nonpass-count.mjs
6ece437dfe5ea96a09c89c5d5fb24147c6314ea40289c8c5498137a6bdaa9ee0  logs/step7/rerun-kills.sh
795c16270bbeffdbd61e84589fd48c8833cc61dcb7364a2e32b667c7d03a8b28  logs/step7/run-ext.sh
57ce36f6902210c4c4580abb828e018a79e0cc45281ba7b4361e1c33e1ae48e7  logs/step7/run-kills-ext.sh
f435395ae92cae0ce61762d8770a88b16a8d3409c4b744a1c3de17fac1152722  logs/step7/run-kills-re.sh
cba98d56a9d1121bb6427e1b7ef8303322753d592bd6188262e4a42a3aa67212  logs/step7/run-re.sh
724457a01d710a5c1c6137bc30bc100c03006722251622da08b29c857d3b6c40  logs/step7/usage.mjs
769231098f245422e459adacf0f9af68599e62d253728ea57a2f493e79d33a62  p1/seeded/bugs.json
9b188b56e957ec4a4bba176811852b689b49edbe155ae0e8d0378fc79a2a46b3  p1/seeded/grades/28d4761.json
ea69fa116cbd1e4652bde2c020f49201acd5f1077c09642db58cfdc25082bb81  p1/seeded/grades/669123c.json
37d8987ca776a44125e191310fd0d21972e03219872fd0fe44a0c1ff6a00d99c  p1/seeded/grades/7adfd47.json
3fe0313378bc2b3b233add89b5256a1b43993ec2b03ca94e2ca451b3e775fc30  p1/seeded/kills.json
af2b5f9af92d52160f0dd43f3474fdac694d2ba77bb6263fc9511cc9f2e0d293  p1/seeded/logs/28d4761-1.log
6444ce75034b86638e543cb4aa985fd5c036cf162f82af7694f84a4b23775a90  p1/seeded/logs/669123c-1.log
8597b6102b3566ff3f1c1fd0460e954aa354f2727bfc59c6204140758211cfbf  p1/seeded/logs/7adfd47-1.log
14db2aa5fea3a23f12dc55fe3a00884ad243e37c1a7a16861c3e42f795d8501f  p1/seeded/logs/7adfd47-2.log
a6a3030322afee0b9171c9d7d20572ebb1f28a41a5eb17e3b38058cd1966f4e0  p1/seeded/oracle/7adfd47-T1.spec.ts
6881196a060bf0d4f7c40d33e8b3e1ed66c498281f0e3520a596019708bbb858  p1/seeded/oracle/7adfd47-T2.spec.ts
9d526d2e2f3fd806d2e1d4db9c547b295c029b807c4377fc1dc7f5f06788d39e  p1/seeded/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p1/seeded/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p1/seeded/oracle/playwright.config.ts
5253c3e56f2b7d875a4362ca3aa5cceee81357ac1480044e49e5cf04e6be1b3f  p1/seeded/validation-7adfd47.json
a86cb759ebbe8a6b4f3b85a27f3ba6e877af78b79590452447988ce569b0c3ec  p1/seeded/work/fix-seeded-1/7adfd47.compare.prompt.md
3f5989065759df8e43834a373ce35fa35a5b9417b4ac8c9bffe532517ac4cc15  p1/seeded/work/fix-seeded-1/7adfd47.compare.reply.md
9f52059a0c65120248597ad37cd4acbd964d9a3e94ab8eb9f6ca753a0e61bf51  p1/seeded/work/fix-seeded-1/7adfd47.compare.reply.md.run.json
3f6a672da030c8746c4f9e08c97a168e1804ab7df065cbc441e19c8f54bc6d54  p1/seeded/work/fix-seeded-1/7adfd47.fix.prompt.md
a32a8de2cc79cb5c4f2f4a1369070d513a76d166fb2dfb07331a8e998bc07182  p1/seeded/work/fix-seeded-1/7adfd47.fix.reply.md
746502f704318aee1faf16ba279c7258f1d3be20b792fefd8bc03263ebe7bd8c  p1/seeded/work/fix-seeded-1/7adfd47.fix.reply.md.run.json
cbf4d0b58a6140f4f24c9748d5a0c050845fa6ff90af17cc7a74040e2d575b17  p1/seeded/work/fix-seeded-1/7adfd47.settings.json
a6a3030322afee0b9171c9d7d20572ebb1f28a41a5eb17e3b38058cd1966f4e0  p1/seeded/work/fix-seeded-1/7adfd47/7adfd47-T1.spec.ts
6881196a060bf0d4f7c40d33e8b3e1ed66c498281f0e3520a596019708bbb858  p1/seeded/work/fix-seeded-1/7adfd47/7adfd47-T2.spec.ts
9d526d2e2f3fd806d2e1d4db9c547b295c029b807c4377fc1dc7f5f06788d39e  p1/seeded/work/fix-seeded-1/7adfd47/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p1/seeded/work/fix-seeded-1/7adfd47/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p1/seeded/work/fix-seeded-1/7adfd47/playwright.config.ts
057eefded5719ad1594cc67ede0ea54aa274079127b86de8e53422cb6bfafa77  p1/seeded/work/seed-settings.json
e06f2ab02e132d5f2f511af39de8bd2990da23cea426e6c04284aff5f8e6d437  p1/seeded/work/seed.prompt.md
d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35  p1/seeded/work/seed.reply.md
768d616ea6ccc084576fc941169b815baca21b0c6341cb8265cb23d7cfa7885f  p1/seeded/work/seed.reply.md.run.json
cb3a4230c05d76303338dd4f3cbfad96eaca78907330b40a5c9910e8b8672102  p1/seeded/work/seed/7adfd47-T1.spec.ts
6881196a060bf0d4f7c40d33e8b3e1ed66c498281f0e3520a596019708bbb858  p1/seeded/work/seed/7adfd47-T2.spec.ts
96156cda55eb66275268420a13bb44b7f8907eb5d8c4d8cec91655033b521995  p1/seeded/work/seed/manifest.json
50f09ee81fab360117f568f2831f1c628eea5a1ae512ac251211af054505fcaa  p2/seeded/bugs.json
56473efd71735b4c48b24f3fb76ec67f445757a5ccec698fd49a72126d9d2e44  p2/seeded/grades/5b774a7.json
7d138e11e351990782a73a20af1879988d683c4377272c44dbddb20fe6e82a6d  p2/seeded/grades/5eced48.json
54506d200d9e0a274b5b2a1bb62160c72d5ab5ec220e622e2dfa864020b5aa4e  p2/seeded/kills.json
0bc584f3e2a79ef811c7d937d8234ff1bab92e6840fc8b69aa826b080020ca01  p2/seeded/logs/5b774a7-1.log
c7c64b4a468e133b3af9d2f4416e7f3c8e25a3a356a785764e4133bc6f1d3dbf  p2/seeded/logs/5eced48-1.log
035d2d1b39f6230305b72d75751785b4c2bda79e6adf46c99b3ee42ba497a271  p2/seeded/logs/5eced48-2.log
96e8334c1601ad41b4487c60bd49ab4adb9ee943d55004544f0cde2956d7836e  p2/seeded/oracle/5eced48-T10.spec.ts
6423b6a86e386018fe8d537d627315fc94349174aab483c32a4d84ff990c9e12  p2/seeded/oracle/5eced48-T11.spec.ts
f92129c3ce246e4e3d89d84c4ffe91c93e24423a55c8ff437699cea3eb19338d  p2/seeded/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p2/seeded/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p2/seeded/oracle/playwright.config.ts
5c763efb9342d859066020dd2d8bb82d171a8559b6ef700a5cd667b4068d09be  p2/seeded/validation-5eced48.json
849272f652730783e738d27d2e13893771c2a829749a9e304c393ac6d420e72a  p2/seeded/work/fix-seeded-1/5eced48.compare.prompt.md
67f1f67c61a052eb803990e8ed24c4128e70dd1946c2621c1201438c5bc827e8  p2/seeded/work/fix-seeded-1/5eced48.compare.reply.md
03f23b09ba1bdc8a017e308f50e3d46ef17476135ff76f6c307ec94523822fda  p2/seeded/work/fix-seeded-1/5eced48.compare.reply.md.run.json
8e9910a2afcf967e3808f33040d32770ac286bdd2be2a7463500a4ef575ccc04  p2/seeded/work/fix-seeded-1/5eced48.fix.prompt.md
91b205fc319d194b4f138474151e370b95f3855e9eee9dce81fbf96f5aa19681  p2/seeded/work/fix-seeded-1/5eced48.fix.reply.md
98e1e8df537e6b7bd084897661229996f2f72e087dcce16c1817dbb04c930944  p2/seeded/work/fix-seeded-1/5eced48.fix.reply.md.run.json
a6d0237ea5970b0e52b828197b8407fb55d67510d5733ef79ecd58361de72b81  p2/seeded/work/fix-seeded-1/5eced48.settings.json
96e8334c1601ad41b4487c60bd49ab4adb9ee943d55004544f0cde2956d7836e  p2/seeded/work/fix-seeded-1/5eced48/5eced48-T10.spec.ts
6423b6a86e386018fe8d537d627315fc94349174aab483c32a4d84ff990c9e12  p2/seeded/work/fix-seeded-1/5eced48/5eced48-T11.spec.ts
f92129c3ce246e4e3d89d84c4ffe91c93e24423a55c8ff437699cea3eb19338d  p2/seeded/work/fix-seeded-1/5eced48/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p2/seeded/work/fix-seeded-1/5eced48/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p2/seeded/work/fix-seeded-1/5eced48/playwright.config.ts
ce85dd19cb2cfa14cf8ac6667f172b7814c6d72ba24b5f73ed38dcea266b31ec  p2/seeded/work/seed-settings.json
ebe16a5988d11b3dfe406b3bb4cbe0609f84e389d376a2072e3ef6a03332ea62  p2/seeded/work/seed.prompt.md
d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35  p2/seeded/work/seed.reply.md
c5007d908db78efbd1a3a9ef363828ffb37d6f28ae0507bb0004d6f1f6f138ce  p2/seeded/work/seed.reply.md.run.json
bb8112d985c0f5477ff8df5198a31f63e148cbcb5e6e3692b5de9636f8654d48  p2/seeded/work/seed/5eced48-T10.spec.ts
6423b6a86e386018fe8d537d627315fc94349174aab483c32a4d84ff990c9e12  p2/seeded/work/seed/5eced48-T11.spec.ts
4e71610fc26c4e882a4713b84ae3c83679b8b0849f39b1acc57aeef4ef6e609a  p2/seeded/work/seed/manifest.json
a6b2cf86e1f96d6770beafaee82ae4ca8e161b347b6eb9f71375cb3ba3491a4f  p3/seeded/bugs.json
0abc29be0f633bd973ef89f0a2f7bb0a0527143f80eec184d45146de443dd3f8  p3/seeded/grades/be6c20b.json
1eac753747355d706a836ea8cb97f4435d184bcf269875eadf7589edefeb7ebe  p3/seeded/grades/d571b94.json
197f2266db803a81bf71f938f98d40c2cfdba5b69656140beaad4a486512c328  p3/seeded/kills.json
d0599afa9f6f979850b0fb3d976b242e17b44830afe9032450a5926c353ffc23  p3/seeded/logs/be6c20b-1.log
1b096fb81a9c87685926d007090947fe9a0f1c298926c40c1754e0b9f58dff85  p3/seeded/logs/be6c20b-2.log
fc7222252c0e354c43d7c15fbfb68064f09b4526b6d4bb65c10461cf0b735425  p3/seeded/logs/d571b94-1.log
b47068e2db6dde8a8d3973595fb471a9bc18a6ddc38aff6c184232d16ac89ade  p3/seeded/oracle/be6c20b-T1.spec.ts
d5d2dbbea7083877ad93c696e0ce423b6a71a62c74687133bcbbca2fca5a85e1  p3/seeded/oracle/be6c20b-T2.spec.ts
7cf7c578e42cd6e9c757c9e54722c7f1063b52f0bd962712f7b596e8611cd376  p3/seeded/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p3/seeded/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p3/seeded/oracle/playwright.config.ts
4e5c42eba5ae6be5fca890312ebefb758c39be02a05eac2dbf94e90b4bdb5469  p3/seeded/validation-be6c20b.json
cc02e48a9f66153cf1e0b28f9216c006afc26a7baf98927e05f8f59afa7db53d  p3/seeded/work/fix-seeded-1/be6c20b.compare.prompt.md
734b70438b0d6b5fd2403f46a723ba0ad85c1722d6dce4bec778f8292357fddb  p3/seeded/work/fix-seeded-1/be6c20b.compare.reply.md
b291d909ad1afe427254b6fc7901fbcaa8b9fdb238a93fd573fe94291453fe23  p3/seeded/work/fix-seeded-1/be6c20b.compare.reply.md.run.json
8ef0c265fce156679c1918b11bcf50216d8aeb7ab6375f9fbae84be87f92dc49  p3/seeded/work/fix-seeded-1/be6c20b.fix.prompt.md
349ee187bfd7c65fb09bde6b417799d799fda94f27fb28f1779da8f6ecb1fb0e  p3/seeded/work/fix-seeded-1/be6c20b.fix.reply.md
601e572433195bb3350fc375b0aef718af3b7e1f7ecf52b61941613e9cb22dec  p3/seeded/work/fix-seeded-1/be6c20b.fix.reply.md.run.json
416db2b676c28e053f7c387fb343190dfe9c746919374dadf6bbb2eb8c70ee56  p3/seeded/work/fix-seeded-1/be6c20b.settings.json
b47068e2db6dde8a8d3973595fb471a9bc18a6ddc38aff6c184232d16ac89ade  p3/seeded/work/fix-seeded-1/be6c20b/be6c20b-T1.spec.ts
d5d2dbbea7083877ad93c696e0ce423b6a71a62c74687133bcbbca2fca5a85e1  p3/seeded/work/fix-seeded-1/be6c20b/be6c20b-T2.spec.ts
7cf7c578e42cd6e9c757c9e54722c7f1063b52f0bd962712f7b596e8611cd376  p3/seeded/work/fix-seeded-1/be6c20b/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p3/seeded/work/fix-seeded-1/be6c20b/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p3/seeded/work/fix-seeded-1/be6c20b/playwright.config.ts
eeaf78250039d7c22653461f2647ada14368b247e8abc797db8d88583c9f01eb  p3/seeded/work/seed-settings.json
722cde1c8ce5e8b375a41dbc288489a771f369934954ff9425b0ded2b8ac22d7  p3/seeded/work/seed.prompt.md
d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35  p3/seeded/work/seed.reply.md
7caf659a99c9839378eb2af326dd92fc769f5328d0c3bd59f4f434f201b39967  p3/seeded/work/seed.reply.md.run.json
1b762a9fad28f8b2a53e789983747df6605351b9444be09796f5cda792fecdcf  p3/seeded/work/seed/be6c20b-T1.spec.ts
d18dfe99fd7ba857837cbb076b54e38069a4bb66ff5c6914a9d9253967cf133c  p3/seeded/work/seed/be6c20b-T2.spec.ts
86fd2e8a7aa5649f7ba7c48d4fa5db32994a23efe244c338c25a2f20101c48ec  p3/seeded/work/seed/manifest.json
f99fc5acdb54e021e6c98f4bc82ed3037cfe7c831b1ca1409449df57095db316  p4/seeded/bugs.json
272e11b1110b3671339b77a47275354871de110591e63e19e40be67ca22b390c  p4/seeded/grades/54f7aa8.json
8514a8e1cf98e90c8d8dbfa9d04743549e819ff18ec16ec628c86efcc007d51d  p4/seeded/grades/9bb39ab.json
2c810861051868140ce7dd50e5dc9dfeca7a6a82401e1b5c154ed6d0bd66d528  p4/seeded/kills.json
033e707d9323e5c461fb8948f78e0c5ed16ce3e7c1f14e14bef862481ac6a8cb  p4/seeded/logs/54f7aa8-1.log
d833bdcea12426247349fdf1aa74a7f7cda7396df1933ed1317768ff5dfc28db  p4/seeded/logs/9bb39ab-1.log
0ad33e0ef6a611b7bf3d69662e4f8969d9adb228dd896d058584121dab836df4  p4/seeded/oracle/9bb39ab-T1.spec.ts
b03dd4409d2765b7ae84026b34497b034a981085e4e844637fd686a24a687cc3  p4/seeded/oracle/9bb39ab-T2.spec.ts
c6689309fb2f356838c932c5572687ef14093ab1ba95ea5a398bebc8aa10061e  p4/seeded/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p4/seeded/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p4/seeded/oracle/playwright.config.ts
903754e944028c832a47e3944dbf42cad167dac1551e6357231b206de506f2a3  p4/seeded/validation-9bb39ab.json
bacaf91aa6b2fca033419cd0488bf948b8a91fcd875aa174a11f11248e5a5a3a  p4/seeded/work/seed-settings.json
e297c08e34f603b999dbd7ac5df1bb1c6c8beb2121642f941d956593f73bacdd  p4/seeded/work/seed.prompt.md
6c3d71902010a56a498db734a4042022895eece93e69b77d58607c7712c50bcd  p4/seeded/work/seed.reply.md
77fac3d1259d12eb9b7152f3b58e2d787204fc1c1f7d4782c72575ebeb9d8c1d  p4/seeded/work/seed.reply.md.run.json
0ad33e0ef6a611b7bf3d69662e4f8969d9adb228dd896d058584121dab836df4  p4/seeded/work/seed/9bb39ab-T1.spec.ts
b03dd4409d2765b7ae84026b34497b034a981085e4e844637fd686a24a687cc3  p4/seeded/work/seed/9bb39ab-T2.spec.ts
12c85ee9f836989534f7cc1b9bcfd919ad664334ca8d80dd71e0ec36503eaaab  p4/seeded/work/seed/manifest.json
8a4e6bba160a096a0baab29abb1cae78bfa5120e6c4c19f564603c6fa96aebe0  p6a/seeded/bugs.json
4448f198f01ea5543fc92a8bf4a0ffa0b3399dff59347d9ff20690d7a805cf33  p6a/seeded/grades/ca739a3.json
be4dc9f488e0cf9544886e0bed5338357e5b638c6c1d7d18158c68558a9bef61  p6a/seeded/grades/d7f2fd3.json
db3fab155d8e9cc1d8dba9d69091a067e3b49915aa2a53c0f00989f8a1c1a57c  p6a/seeded/kills.json
3cf07ac3ee8908d7db3275a12b3454046e2de1d9f5c88fea24f11a7c02231044  p6a/seeded/logs/ca739a3-1.log
1276b1ee51d7b2aa6669aa0e761dd3ee4b3b240776d0a1c6b945b823e01d36d8  p6a/seeded/logs/d7f2fd3-1.log
23281f9a4c809f74d46c4b88619fd1ea01b09e314c71939363cd35f891da2a17  p6a/seeded/oracle/d7f2fd3-T8.spec.ts
2efb9ed32e29b02d05f5555c37cd8494af084717157f369ebd8e47d025008885  p6a/seeded/oracle/d7f2fd3-T9.spec.ts
a99abd23bd9d8e475d8f9d5810b4ba9ae3060ab2f8f7d9aee2810e77080547f1  p6a/seeded/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p6a/seeded/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p6a/seeded/oracle/playwright.config.ts
ca48fd3c736f1eed6db1d379e11602128efef2d6560fef862dde50cc06a78921  p6a/seeded/validation-d7f2fd3.json
783ebae5a4543983e6c1a999b5b1e5027192e93fd356f848b0511f5b43f0072f  p6a/seeded/work/seed-settings.json
d7f814387866e884342109dbe91e9f22a4cfa5ffadb85049f36f20ad560984e0  p6a/seeded/work/seed.prompt.md
d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35  p6a/seeded/work/seed.reply.md
96f81a3e5e66338ecfb283e8b35b07f1ce7373210dc8cfdde8be293782b20eeb  p6a/seeded/work/seed.reply.md.run.json
23281f9a4c809f74d46c4b88619fd1ea01b09e314c71939363cd35f891da2a17  p6a/seeded/work/seed/d7f2fd3-T8.spec.ts
2efb9ed32e29b02d05f5555c37cd8494af084717157f369ebd8e47d025008885  p6a/seeded/work/seed/d7f2fd3-T9.spec.ts
980d6561b866b2fe26144552efca73385ded2b38831dd070bec6cdbf372b294c  p6a/seeded/work/seed/manifest.json
64de130c609a0b7d827c87a0c71efe2b27172a7279d3c7eb685eec55d40ddb16  p8a/seeded/bugs.json
0cbb4e19827145201bf4aafc3819390f70218b84185a9fa3347143cc637534ab  p8a/seeded/grades/d1ea76b.json
8aee9b35eb92e00b0e0948a833ed1aedc240ecd15622eaa6fc29daba0d935b89  p8a/seeded/grades/d46e6d3.json
b3663e4b80ae27d64bb4b4dd946fdcc511ab45b53fe55ae1cdb126112aa3458e  p8a/seeded/kills.json
5045dcbbe88ca76c2891c0cdef134e3f9e488f320c8c60c2ee43b9caf82ea39c  p8a/seeded/logs/d1ea76b-1.log
bd4c9c2b6c2b51ddfa4c131abb5bb88085582d94c420cf8372f19292fdc861a7  p8a/seeded/logs/d46e6d3-1.log
7f9d78ebecfa8276e8e5b34acc2f4d72fe852cf2f3576143f3410d0871f1941b  p8a/seeded/oracle/d1ea76b-T16.spec.ts
c154393377a2c456df64d4d70cc00ccb151328b1152ae3231cd395f521d1cb04  p8a/seeded/oracle/d1ea76b-T17.spec.ts
cfc5bbbc1d572a7bec1708cd6be3631f926e0dd9475d87782c4dac24a7af1107  p8a/seeded/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p8a/seeded/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p8a/seeded/oracle/playwright.config.ts
3d78aca157f10d024718aaffff90fda6f6be2fed97b810a5942e36a04937dd6d  p8a/seeded/validation-d1ea76b.json
4882db4888882e95fd70b3877274403a57cb93648bfcfd1654d6b12f2995ce91  p8a/seeded/work/seed-settings.json
4543cec9c4eaeb6f02d2721f6eff244380378b74f6e066c082456210475e2fab  p8a/seeded/work/seed.prompt.md
d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35  p8a/seeded/work/seed.reply.md
177599b3c6143fe7aa1b0d47953e1829095988c9186b3f35f233cd28c006ca7f  p8a/seeded/work/seed.reply.md.run.json
7f9d78ebecfa8276e8e5b34acc2f4d72fe852cf2f3576143f3410d0871f1941b  p8a/seeded/work/seed/d1ea76b-T16.spec.ts
c154393377a2c456df64d4d70cc00ccb151328b1152ae3231cd395f521d1cb04  p8a/seeded/work/seed/d1ea76b-T17.spec.ts
5260fddffd577a44d7837c60674e7b25e6ba427a638c7d32d47aeef5e2837598  p8a/seeded/work/seed/manifest.json
b24afeb9364bfc80f3bad7a4b979d35f1ddb9910eff975f677307228905723d5  p8c/seeded/bugs.json
446acbeee92843a6c0ab9cfa2196451ec8181c451d53fb76fa6a7cf4ad58b2e0  p8c/seeded/grades/bee1c22.json
c622e51633f1af55332481a975144aadfe30d9d260d4f7c1758c11cc16e0345b  p8c/seeded/grades/e28f301.json
c81f44be07de47ba987ab37ef13d05e8005a26f5b900aca41cd152b67804e9b5  p8c/seeded/kills.json
7ea18bbfe72c871fcf3b3c973147f123721b724d85f8c413cd2cd5dbaa8b0119  p8c/seeded/logs/bee1c22-1.log
1d448d47d3f518cc616d14136eb4596d381d7ca7cc29cabcc8d2e27b4b918fdb  p8c/seeded/logs/e28f301-1.log
d5091afe9cbf66f4f72a55cb1afcb09b776fc57c9dde4aba43e18abfe3f32f0b  p8c/seeded/oracle/bee1c22-T16.spec.ts
05dca52bff1606ee48d9cb0e4fc73aaf4297429afc35121081f94184b5b340bd  p8c/seeded/oracle/bee1c22-T17.spec.ts
c4e38ce7166231a5b0bb743c55c52605c42bc47c797876262287c8748002f379  p8c/seeded/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p8c/seeded/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p8c/seeded/oracle/playwright.config.ts
15f975d3e68e5d37b794cf1703bd220169eb8fc6fbebf37f75c33225ea0f356a  p8c/seeded/validation-bee1c22.json
60cc3db453efc20e264c60d151d7e4b4fee400a99d5313cc10d821e7cc16570c  p8c/seeded/work/seed-settings.json
813a1f4699c70b6e8927b3f99fa4e25100a93c6ea0f840868525e1789418c679  p8c/seeded/work/seed.prompt.md
d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35  p8c/seeded/work/seed.reply.md
01d58e97880788998c5dbe9b7e4cc00d046e965f2fb1c1a19124e910c5819d56  p8c/seeded/work/seed.reply.md.run.json
d5091afe9cbf66f4f72a55cb1afcb09b776fc57c9dde4aba43e18abfe3f32f0b  p8c/seeded/work/seed/bee1c22-T16.spec.ts
05dca52bff1606ee48d9cb0e4fc73aaf4297429afc35121081f94184b5b340bd  p8c/seeded/work/seed/bee1c22-T17.spec.ts
6af9bcaa2337c7423ce541c119e46fc214ef20da8fcee556a465d2c5a199be69  p8c/seeded/work/seed/manifest.json
132262adba05e64400c0a3027195280609eccaa676a6ac619c583a4aea510ae0  p8d/seeded/bugs.json
3d045701e006d11f5d727a724fa9d4439a35df347c5ee5a8f129e548a4d4c897  p8d/seeded/grades/39236ac.json
97331190f153ee7133be010376c3ae7a8ff4eee698207699a1141498f68637db  p8d/seeded/grades/d7695d6.json
2cfc6dd465b77d1c331304d5e8d19a49952b3671304dee424ce6f054a92bd80d  p8d/seeded/kills.json
ace2451fdb7b4120d994926c157fd561a303aaeeb106277b1af67db02c1951ea  p8d/seeded/logs/39236ac-1.log
5777f4b4687e0a3890aa9effa3a41e36c2807642213f963767b02c06e9c90231  p8d/seeded/logs/d7695d6-1.log
fa0c45be95f572e762bfdfbe831175dc1f852be34dbfb2ad2ef118f78b30bbf5  p8d/seeded/oracle/d7695d6-T16.spec.ts
38b34c38b71512a125fcda3b75d20e46f86288b6dcc0fb81c86b85047011f239  p8d/seeded/oracle/d7695d6-T17.spec.ts
24f39f2888736a91737bba0f111b5440785c4c8c444b51e4960b0e2eac416e7d  p8d/seeded/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p8d/seeded/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p8d/seeded/oracle/playwright.config.ts
02465ad2d3df36cf2d6c289b5fc64f460dd2168d1371ce4eff88c98cc721ac47  p8d/seeded/validation-d7695d6.json
303694ced359703c858feda58cf0b8bd84841ea84209e06b6f35fe55e786ba89  p8d/seeded/work/seed-settings.json
12b31cdae815a90c7d218f518648b391e4c3d828a76562713ca049e06bd3aa7c  p8d/seeded/work/seed.prompt.md
d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35  p8d/seeded/work/seed.reply.md
6e1b8a3e3c8a99c352fcf9ad3ecd9d9d7a3b0da987272eaca851dbd130a29d79  p8d/seeded/work/seed.reply.md.run.json
fa0c45be95f572e762bfdfbe831175dc1f852be34dbfb2ad2ef118f78b30bbf5  p8d/seeded/work/seed/d7695d6-T16.spec.ts
38b34c38b71512a125fcda3b75d20e46f86288b6dcc0fb81c86b85047011f239  p8d/seeded/work/seed/d7695d6-T17.spec.ts
50c3c4e0c077369a2a26fbe9ccd06aa0ab23b1e1cae2c78839dec858877731c8  p8d/seeded/work/seed/manifest.json
40a9855f7981187eb1cfe792f1b71cf7557c4b9943dbe6e4d1794774365114c9  p8e/seeded/bugs.json
a4225646a92120f274da550e2625ef60fec6ce5f188401852e0ebe5a15d63dca  p8e/seeded/grades/0f53dc4.json
d1ed9f7b328d426632cb61d887693eb19b84836b0a40622daffde1e7ec7f9423  p8e/seeded/grades/a9c2377.json
a708109efe04af9acb148323832eb93dd2cd416ea5b855380b94e619bd71e554  p8e/seeded/kills.json
7aefbb21d81c4e0279baf455f6564f8ed5250f0fff88b0e9bef01d9cb3e68d8f  p8e/seeded/logs/0f53dc4-1.log
6186582a9f7854cfc236137dd0330cdfdc9fd6fc0821742212066ea1738f9d0f  p8e/seeded/logs/a9c2377-1.log
04cfcf74c5cafe21ac774527836a4ab4f8cb9ac47ad5d6e3d6ef10231e5ea1c5  p8e/seeded/oracle/a9c2377-T16.spec.ts
741b831cf5c6db7eebb2a883a0d998814597a1248dc732412c70c9d8224c993e  p8e/seeded/oracle/a9c2377-T17.spec.ts
b8bc714c340a74d22a7e5ab91d4aa3893e0f652a687cc9daf43b67a0455d9d5b  p8e/seeded/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p8e/seeded/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p8e/seeded/oracle/playwright.config.ts
e0918f496ad50bbbfd04c2dbb64a36ddfe71588593ef0c7cf30cd339068eb0f1  p8e/seeded/validation-a9c2377.json
0f5eda0178683ffe9a01d63ddef19dd6ce2acd5b4e43a62bbd9e64cfb6d9f4f0  p8e/seeded/work/seed-settings.json
dd3b3bb0c008e20b460a95c60c2b47d9af2bc802f8f2ad7e6a8a653fc4cb2e6e  p8e/seeded/work/seed.prompt.md
733a07614b60a3d6e39dbcece4edc192a848888e30c141ca647c82fb4fd16296  p8e/seeded/work/seed.reply.md
c9fe72a5ff409f997a56c46b310af2600475bac18426253835b339ea8c68f12d  p8e/seeded/work/seed.reply.md.run.json
04cfcf74c5cafe21ac774527836a4ab4f8cb9ac47ad5d6e3d6ef10231e5ea1c5  p8e/seeded/work/seed/a9c2377-T16.spec.ts
741b831cf5c6db7eebb2a883a0d998814597a1248dc732412c70c9d8224c993e  p8e/seeded/work/seed/a9c2377-T17.spec.ts
3aa7a922cecec20a135d9d102b38437792cb7f656021acbb4c0b224b5e634ed6  p8e/seeded/work/seed/manifest.json
e798498d6f93c20d8a595fedd87321f9dd6b89fb17efac1d632855fa43efd8a6  s1-01/seeded/bugs.json
2bd6c2b7b24d633994f4309584411b6a119579980b6a6ceb52f3d399d7dca636  s1-01/seeded/grades/0009791.json
5c421f1875b90a15c488a3f5ade18eb675ce600b5721e6b1ea52c2b1a455fcd4  s1-01/seeded/grades/144a40d.json
2f367b90bd37ecc4b807ccb96a6b848b48c7eb2e83440defdd5da257deb6883e  s1-01/seeded/grades/2228970.json
1227045064cd5acbac1412d55a129dc94ef2f4984f9c7675bcb7099a8f98b818  s1-01/seeded/grades/c29dd51.json
93c3cb4bd52d42ecb316173a5830b417bd0cdca672d4886a6d2bc6c2a9cafb3f  s1-01/seeded/kills.json
34e1047de86c0c520c6eae746a4e0c13fa9d915ea44c3f1cf5c740043b23699d  s1-01/seeded/logs/0009791-1.log
c7e9549a2d629e35d05fe94a6d3fc07eb3f50ba83a3cedac956d29daf298c20f  s1-01/seeded/logs/144a40d-1.log
e0f4e633e94901be6c68a73949dc03571bfbb843af43dfce7e589e1402a604bf  s1-01/seeded/logs/2228970-1.log
d516f4a98033e69e9e708439a365c6f8129f02633e957083aaa9954ddeb4bebb  s1-01/seeded/logs/c29dd51-1.log
906569c330e818e03a0c22b0efcefdc1c660a3ff9a1255d5cafcc33c68e02bff  s1-01/seeded/oracle/144a40d-T3.py
2e993643f0f015ae2771348ab23edf350b728d4274b8faf03410368e97a316ce  s1-01/seeded/oracle/144a40d-T4.py
31519b6c1a7368fb1ae315e177b0c4a652cf5ee4ebb085744a3698e3f6406650  s1-01/seeded/oracle/144a40d-T5.py
96788e508f8dade30b4c9b9de0f8fe59636f6d23c9c4975e7670459e22ad5414  s1-01/seeded/oracle/144a40d-T6.py
a736895a4938cfc69ea0573cbb87d2d72c09ccfd9244d9ed82a3c2295fa8cb16  s1-01/seeded/oracle/144a40d-T7.py
8d5320b11da689ea1554c10cca02f200e4e6a71e6235d5340af8c1270970ff44  s1-01/seeded/oracle/dt_host.py
02681885d8fb8e192d8b156ecf7dcbed0f2af5f0ee276072ee9350fbdd4d3f8e  s1-01/seeded/oracle/manifest.json
6bd3258d71dcb6ee253c8f4ddadea799fcc04c7054ddfef18fd94347551a831f  s1-01/seeded/oracle/run_checks.py
e8cc79d8e27208fbe981472e8066126e7241c42d2fa04bd10275e113e57ffd52  s1-01/seeded/oracle/runner.json
8ed2c5975877d1b0df30dc1c85b36deaef6aa4aaa7e5c0c867cee56bf26cba18  s1-01/seeded/validation-144a40d.json
f779658b6cb2aa92db3fac0dc5e4870e2179bfbf5744c197e6677751445d7883  s1-01/seeded/work/seed-settings.json
0ff5cc8838a0282dfabae378ff294d7c88f429d0a2aa8110198e983895e09072  s1-01/seeded/work/seed.prompt.md
ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d  s1-01/seeded/work/seed.reply.md
37423a23a268dbb5e3eb833cb8a58512f3454217c3811a0e40d962adccc15817  s1-01/seeded/work/seed.reply.md.run.json
906569c330e818e03a0c22b0efcefdc1c660a3ff9a1255d5cafcc33c68e02bff  s1-01/seeded/work/seed/144a40d-T3.py
2e993643f0f015ae2771348ab23edf350b728d4274b8faf03410368e97a316ce  s1-01/seeded/work/seed/144a40d-T4.py
31519b6c1a7368fb1ae315e177b0c4a652cf5ee4ebb085744a3698e3f6406650  s1-01/seeded/work/seed/144a40d-T5.py
96788e508f8dade30b4c9b9de0f8fe59636f6d23c9c4975e7670459e22ad5414  s1-01/seeded/work/seed/144a40d-T6.py
a736895a4938cfc69ea0573cbb87d2d72c09ccfd9244d9ed82a3c2295fa8cb16  s1-01/seeded/work/seed/144a40d-T7.py
8d5320b11da689ea1554c10cca02f200e4e6a71e6235d5340af8c1270970ff44  s1-01/seeded/work/seed/dt_host.py
c8727297b1372e847915c5f4bd8f00f5df36ecf63854aba7d64b84b282018d8f  s1-01/seeded/work/seed/manifest.json
6bd3258d71dcb6ee253c8f4ddadea799fcc04c7054ddfef18fd94347551a831f  s1-01/seeded/work/seed/run_checks.py
e8cc79d8e27208fbe981472e8066126e7241c42d2fa04bd10275e113e57ffd52  s1-01/seeded/work/seed/runner.json
2c068211b23189459b1878abd727c8c8188b71b39567bad5b5ea88651252f60a  s1-02/seeded/bugs.json
159d1a4322a36385dcb42a03cfcacee5edccd76c7abb9c05153120f7300fb1c2  s1-02/seeded/grades/6e824e0.json
e83ba5216b93a21e33acac4cd9e6297c3c01757d90bc1166d872c0d996d14201  s1-02/seeded/grades/925c632.json
02bb5470a9d2ef9036a526422184729d5b39fc7f710853b533d6935c7b58201f  s1-02/seeded/grades/98132c9.json
3712c98f5b0b4fd16117a96941fcf45c2a17a249eecf88e34b58550554ccab06  s1-02/seeded/grades/fffdd4f.json
aaa6c1db568d04463100d2975092598dd00bd247707d177e2969ada0b2d8569a  s1-02/seeded/kills.json
d1c86ada7d324c8fccceeebe8b173ac13a5921ab359b3071f37907dbf00fe2cd  s1-02/seeded/logs/6e824e0-1.log
5c3cb7a2d7b1409657d47c53599bdcbc96d3e5c2882202e05ae1d9c7b6094736  s1-02/seeded/logs/925c632-1.log
15e9c6993f99b5da24fb398290a169d124a2cbf5764960b94c56e87015142ed7  s1-02/seeded/logs/98132c9-1.log
d908e2b5103ff4f7c9fd0024fba9e8b0b20aea54b4fb7e82dbf5c2eb8fbff6e2  s1-02/seeded/logs/fffdd4f-1.log
b7000f0fa34d07c1ad704b1cf85766866472f399d26515e7a8cb8000df21b358  s1-02/seeded/oracle/98132c9-T2.py
0a78f7d36ecc5319e1ee0ef34d5d0fc28cd1a8b5c428ab60c6d7825a4fddb84b  s1-02/seeded/oracle/98132c9-T3.py
cdc508c91604fc28b04c16431196fa2906b6f70b7bf5018036252f0003551c19  s1-02/seeded/oracle/98132c9-T4.py
636aa1d1adee9cb469139df876f50a84289cee740cefd559ec65cfbba817f810  s1-02/seeded/oracle/98132c9-T5.py
3fe78c57bcfd7584934e0f8c424a9879b24b51e0eeefb1ca0745a218d471e776  s1-02/seeded/oracle/98132c9-T6.py
7130f5e8c076b18f59ee481be705e11839425030a490a1934a48a626b753bc84  s1-02/seeded/oracle/harness.py
675804da7203a8241b860af4e53101d22cc2a08560ca7c299bd6a4cfeb4d989d  s1-02/seeded/oracle/manifest.json
f98ec859c1513befece9bfa37e086defe34376c110475df142ca1d28c8285af1  s1-02/seeded/oracle/oracle_support.py
256958e70194e4f888194ee15dfcc5a5f2ba64e864658262ab2fe56c1d8d1aee  s1-02/seeded/oracle/runner.json
9de329be29e6061b21d93d4cd4da639903469f8949a01555848e71355c8d8c28  s1-02/seeded/validation-98132c9.json
f4ef0db8cbb2d122fa669b8a7daae59a1bb72a5f1c02ca66680d040da7bb8bb4  s1-02/seeded/work/seed-settings.json
2ecd59de5983020099e7bbf914643e84d95bb4f98e853fae873534ffe187f3be  s1-02/seeded/work/seed.prompt.md
ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d  s1-02/seeded/work/seed.reply.md
533acbfba170e9fa5f29eb14560eb2e80dfb876ec72f818f22de0d290210830d  s1-02/seeded/work/seed.reply.md.run.json
b7000f0fa34d07c1ad704b1cf85766866472f399d26515e7a8cb8000df21b358  s1-02/seeded/work/seed/98132c9-T2.py
0a78f7d36ecc5319e1ee0ef34d5d0fc28cd1a8b5c428ab60c6d7825a4fddb84b  s1-02/seeded/work/seed/98132c9-T3.py
cdc508c91604fc28b04c16431196fa2906b6f70b7bf5018036252f0003551c19  s1-02/seeded/work/seed/98132c9-T4.py
636aa1d1adee9cb469139df876f50a84289cee740cefd559ec65cfbba817f810  s1-02/seeded/work/seed/98132c9-T5.py
3fe78c57bcfd7584934e0f8c424a9879b24b51e0eeefb1ca0745a218d471e776  s1-02/seeded/work/seed/98132c9-T6.py
7130f5e8c076b18f59ee481be705e11839425030a490a1934a48a626b753bc84  s1-02/seeded/work/seed/harness.py
ae0dc1aab7ad746417b90b46a1189d1adae80a88f0de4dbefc9168dc9edc4010  s1-02/seeded/work/seed/manifest.json
f98ec859c1513befece9bfa37e086defe34376c110475df142ca1d28c8285af1  s1-02/seeded/work/seed/oracle_support.py
256958e70194e4f888194ee15dfcc5a5f2ba64e864658262ab2fe56c1d8d1aee  s1-02/seeded/work/seed/runner.json
3062a2faf521b29cf13163141b92b36cdc88f8b1530a93f6e76750a990968046  s1-03/seeded/bugs.json
a54eee3415afe5fe343eab84d1caaadb7939f326b853adf3c205ddbc7c740370  s1-03/seeded/grades/14c09be.json
9e0bab44fc79d5fbea7a6adfddff8fa5472eb24c77daa24e830bc386876428a0  s1-03/seeded/grades/3ddc164.json
a4f472df99088ad89a6015e41509b7edcce564099e259ba12ea4b7c9cac8f803  s1-03/seeded/grades/b554d84.json
f925b0bb30ce7d426bcdbc38bbb3d1c69f2f51bd24244fcc6eb35c17a602da28  s1-03/seeded/grades/e996f7b.json
9e1ac816594825fbef49ff93d7d5e0185c47ec9f0c23e7d98040d07523d6c0fe  s1-03/seeded/kills.json
7331b3d914aad182d9129ce65b39347aa830b1a992b4586e89e89ab6f095139a  s1-03/seeded/logs/14c09be-1.log
61f5ffa724cceed4afaec75a4952416afcaa3ed766e0adadea6b04a5d16227fb  s1-03/seeded/logs/3ddc164-1.log
1a3900d08f51a8b499060f146659e12d04b17546c1fcedf722210f75bce950ae  s1-03/seeded/logs/b554d84-1.log
8d56dc26411e57b6caaf3270f3513fb87fffb64b2e2af9d3dc57308bf7ae87e1  s1-03/seeded/logs/e996f7b-1.log
1ee044d66b3efcd64f91d46efb6300e9b4ce9b3e5d071090cdbecef2db03b799  s1-03/seeded/oracle/3ddc164-T34.rb
812bb7ead80ad34b94cfafa001b9a132ceb2298dcd6569eca4a7da9119405e6c  s1-03/seeded/oracle/3ddc164-T35.rb
f544e66a1952d5766dd79e8222d9b3b74670ffaf8d0ded4f6abf38e086db1f60  s1-03/seeded/oracle/3ddc164-T36.rb
e68a2567fc73f20f457f7a752d6eb9f2a86da807aa287856714ba739ad6222ae  s1-03/seeded/oracle/3ddc164-T37.rb
2706ea47dd7ba5e355c72b59f184f27eb58b4157a3f3b76eec1ecced797a6ac2  s1-03/seeded/oracle/3ddc164-T38.rb
0a6f34300f845da4440effed6cbf9ef84f42894a784b3a49a63e16d2af907c21  s1-03/seeded/oracle/manifest.json
0e134aee7d2e8cfd4250d917cbb77d3dcdde29da03461bc7ac6b24c318289307  s1-03/seeded/oracle/merge.rb
ca1defff24ab6c5227ec4b6907d1cb09067b308cdddf7a6f0c9912e696ce0fb3  s1-03/seeded/oracle/run.sh
d20c17b14ae14a302e080bed58ea320508ef15f643d52849a95b1916dc3c04b3  s1-03/seeded/oracle/runner.json
55e718fbefa4f282f729b626d3692e715941be30c8e722187d46397ac7dc8d86  s1-03/seeded/oracle/support.rb
81270f24ebfbdb461fec155e90cd22f6b2f1ff501fdfcc43d19217caa277339a  s1-03/seeded/validation-3ddc164.json
591a582e4b91a87085741dee717dd2a91eaee7ca7250f9afd7d82c74ff1aa3f5  s1-03/seeded/work/seed-settings.json
17571902857528004fa9b0c0b7649859b7c34a813091d549b7ad58a94e8ed0b8  s1-03/seeded/work/seed.prompt.md
ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d  s1-03/seeded/work/seed.reply.md
5e6ae639b8195a0bdc89905f84d4dd6d7881a0012129dd2457259ae12f1dfe54  s1-03/seeded/work/seed.reply.md.run.json
1ee044d66b3efcd64f91d46efb6300e9b4ce9b3e5d071090cdbecef2db03b799  s1-03/seeded/work/seed/3ddc164-T34.rb
812bb7ead80ad34b94cfafa001b9a132ceb2298dcd6569eca4a7da9119405e6c  s1-03/seeded/work/seed/3ddc164-T35.rb
f544e66a1952d5766dd79e8222d9b3b74670ffaf8d0ded4f6abf38e086db1f60  s1-03/seeded/work/seed/3ddc164-T36.rb
e68a2567fc73f20f457f7a752d6eb9f2a86da807aa287856714ba739ad6222ae  s1-03/seeded/work/seed/3ddc164-T37.rb
2706ea47dd7ba5e355c72b59f184f27eb58b4157a3f3b76eec1ecced797a6ac2  s1-03/seeded/work/seed/3ddc164-T38.rb
91bfa40f3773f9b00dc7f021de3618948bec7265266245f9c33f4f20dfd55190  s1-03/seeded/work/seed/manifest.json
0e134aee7d2e8cfd4250d917cbb77d3dcdde29da03461bc7ac6b24c318289307  s1-03/seeded/work/seed/merge.rb
ca1defff24ab6c5227ec4b6907d1cb09067b308cdddf7a6f0c9912e696ce0fb3  s1-03/seeded/work/seed/run.sh
d20c17b14ae14a302e080bed58ea320508ef15f643d52849a95b1916dc3c04b3  s1-03/seeded/work/seed/runner.json
55e718fbefa4f282f729b626d3692e715941be30c8e722187d46397ac7dc8d86  s1-03/seeded/work/seed/support.rb
206aed4422e0bbc6030edd8567dc3c591f69039fd98e8b47d780a1e7e9d91067  s1-04/seeded/bugs.json
80e489256350f95e9b9aba070bf647224f59ae4ce75a24b33ae73eeedfb8151b  s1-04/seeded/grades/784054f.json
8bac5f9a56936382031c31d649644c47d22bad7017385320f221cdd0c5354038  s1-04/seeded/grades/95031a5.json
555543e8ccc44af4cde1d420c7a8376af40d837dd8516df0bcee501fa47bf344  s1-04/seeded/grades/d5efbf6.json
0a7cf57e48836f99a2d5ad04a70dbcbbf3610981a22bd08c0e8388b2a20a6197  s1-04/seeded/grades/ed73235.json
b3e76f3141d5feb11ce3835df3a164f11ccffaa00c2dfe0aba1139b95f0fff01  s1-04/seeded/kills.json
b8a79c32580b6967ee78db5736354f44d0ec5cf907361047bb6b4eb3108e6602  s1-04/seeded/logs/784054f-1.log
9656f68b815d62dab0ed2c6ff991dd466eb56e75ee699c33ce6c48f8fe259baf  s1-04/seeded/logs/95031a5-1.log
1e0c283f313f22df43e82fd0bda51f70a4d921105e2bf1691c5a34eb497ce2ac  s1-04/seeded/logs/d5efbf6-1.log
a12c90ec143914d099621d52d3bcdec3922a3c785fec710a0032cf3a18d95554  s1-04/seeded/logs/ed73235-1.log
f91ba5e27c84f4ec76a7546a837344cf0463cb35686c66b0f21395dd2afeaf43  s1-04/seeded/logs/ed73235-2.log
bb7ee30e78b65e6d355a3634c90066935ef7caec46ae4eb08765a5fcfda977ea  s1-04/seeded/oracle/ed73235-T36.js
710561251ca2ba9add774d0d53b70119aaea82c4126d4e836b18ade088d697bd  s1-04/seeded/oracle/ed73235-T37.js
0a6922cfecccafea36addc2814c836c632839b0691df906f0381b4e39c1cdeae  s1-04/seeded/oracle/ed73235-T38.js
c9cb9a4885baff0d9e1b38136ed82ccd2e9a6da738b2d09fe462d79c081ec2dc  s1-04/seeded/oracle/ed73235-T39.js
7fd87213c2b55e5a70e7271da81095555ba413ae9cb9b670a4f79bdbe191f077  s1-04/seeded/oracle/ed73235-T40.js
1e5207b6bfd8e50d48018000986157a3927f2d3c79d648703d1ea901a655b630  s1-04/seeded/oracle/lib.js
f8f6fcd2d599d6fce085dfad680d65972bd3db753e1ca371a63971461051cd13  s1-04/seeded/oracle/manifest.json
8af77e4b8a44f2b27d839af54f93e135c24e7863974c7cdec03e4ffe8ad0dd96  s1-04/seeded/oracle/run_all.js
699d898a64559ef4341ef681214684d0bc5c1361f266fa2b23bad3b2522bbfc6  s1-04/seeded/oracle/runner.json
6a447744b4f27d633e440fa7eb67b30fc38e0eadb2f8c6fd0ff5a6aee42e0ffb  s1-04/seeded/validation-ed73235.json
e74ef19cb74667bc1df1a696dc751c789b4e78e913612db0c34b94b786b5b6c4  s1-04/seeded/work/fix-seeded-1/ed73235.compare.prompt.md
be53906698b88770413484fb8bc53fde942df69a25ccaf3b2166713c64e3f62d  s1-04/seeded/work/fix-seeded-1/ed73235.compare.reply.md
ee244717f530a5780825a47926c053fa65d6eddd2b6e245752909995c309eb92  s1-04/seeded/work/fix-seeded-1/ed73235.compare.reply.md.run.json
c1d04fbba6171293d1df265dc13d915f7f63541be751b03d45a4c810f048f449  s1-04/seeded/work/fix-seeded-1/ed73235.fix.prompt.md
ff4098c4f5ff9db1dd5585414df9a6eeae9b1a67a4daa1564c7d5a450a5f9133  s1-04/seeded/work/fix-seeded-1/ed73235.fix.reply.md
8cd8e7902ba5b0b7b8446f99607276529ec7b56be30376a59cb0987480f4c899  s1-04/seeded/work/fix-seeded-1/ed73235.fix.reply.md.run.json
2c149ca08f81996304b971ec41000218e02192757ea46d586e2fd605723f1ef8  s1-04/seeded/work/fix-seeded-1/ed73235.settings.json
bb7ee30e78b65e6d355a3634c90066935ef7caec46ae4eb08765a5fcfda977ea  s1-04/seeded/work/fix-seeded-1/ed73235/ed73235-T36.js
710561251ca2ba9add774d0d53b70119aaea82c4126d4e836b18ade088d697bd  s1-04/seeded/work/fix-seeded-1/ed73235/ed73235-T37.js
0a6922cfecccafea36addc2814c836c632839b0691df906f0381b4e39c1cdeae  s1-04/seeded/work/fix-seeded-1/ed73235/ed73235-T38.js
c9cb9a4885baff0d9e1b38136ed82ccd2e9a6da738b2d09fe462d79c081ec2dc  s1-04/seeded/work/fix-seeded-1/ed73235/ed73235-T39.js
7fd87213c2b55e5a70e7271da81095555ba413ae9cb9b670a4f79bdbe191f077  s1-04/seeded/work/fix-seeded-1/ed73235/ed73235-T40.js
1e5207b6bfd8e50d48018000986157a3927f2d3c79d648703d1ea901a655b630  s1-04/seeded/work/fix-seeded-1/ed73235/lib.js
f8f6fcd2d599d6fce085dfad680d65972bd3db753e1ca371a63971461051cd13  s1-04/seeded/work/fix-seeded-1/ed73235/manifest.json
8af77e4b8a44f2b27d839af54f93e135c24e7863974c7cdec03e4ffe8ad0dd96  s1-04/seeded/work/fix-seeded-1/ed73235/run_all.js
699d898a64559ef4341ef681214684d0bc5c1361f266fa2b23bad3b2522bbfc6  s1-04/seeded/work/fix-seeded-1/ed73235/runner.json
365b10527343b83c559b57c69794e6b820e8d9d0c08b9c29dafab8885e1d9a5f  s1-04/seeded/work/seed-settings.json
b4ffe9720ad279715939e178f08c0c319467a983a01e005c6ce3b9f3db5ff157  s1-04/seeded/work/seed.prompt.md
ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d  s1-04/seeded/work/seed.reply.md
d291f4dfd257f306d6c42630545a2976161d79933c3e0f64967940baacc0d533  s1-04/seeded/work/seed.reply.md.run.json
bb7ee30e78b65e6d355a3634c90066935ef7caec46ae4eb08765a5fcfda977ea  s1-04/seeded/work/seed/ed73235-T36.js
32f6b7ccea355ec173b26cfec7b8eafe9f07a2b51edaf118aa28140ad4ab629b  s1-04/seeded/work/seed/ed73235-T37.js
0a6922cfecccafea36addc2814c836c632839b0691df906f0381b4e39c1cdeae  s1-04/seeded/work/seed/ed73235-T38.js
872d2878d34d354e133e06285cf14d5cf4fd1965190af1b69a3544094f651496  s1-04/seeded/work/seed/ed73235-T39.js
7fd87213c2b55e5a70e7271da81095555ba413ae9cb9b670a4f79bdbe191f077  s1-04/seeded/work/seed/ed73235-T40.js
1e5207b6bfd8e50d48018000986157a3927f2d3c79d648703d1ea901a655b630  s1-04/seeded/work/seed/lib.js
6d3f1ea39c4ca30886f93383d75c3fc5b790cb3007fa978ec9d3b8fbca424ad7  s1-04/seeded/work/seed/manifest.json
8af77e4b8a44f2b27d839af54f93e135c24e7863974c7cdec03e4ffe8ad0dd96  s1-04/seeded/work/seed/run_all.js
699d898a64559ef4341ef681214684d0bc5c1361f266fa2b23bad3b2522bbfc6  s1-04/seeded/work/seed/runner.json
098fcab7dd7158cf7e7123ed0dbc6f8cb05a6211102fd6c461229a279a865456  s1-05/seeded/bugs.json
10195c248792c8df21741be45ff17ee4ecee50de23ca9660abbd5b7c104f3741  s1-05/seeded/grades/2697aef.json
c3cb1f8496447afe4e8940b662a96af033927a88df2af6c265b6030a8153d2e6  s1-05/seeded/grades/321a2fb.json
bb593eba85505447928f7173632eba3f8d5702240b06c36e857cf6cb9035d1aa  s1-05/seeded/grades/8f4d13b.json
7be74daf528159ccd34031732c2a8341994f3afd32dac0c34bc2c467abff8ed2  s1-05/seeded/grades/a2578dc.json
c69ca1690b0fa578bcd163878e6bd497bdf3150bc6b0656d9acf107cdff8eb3a  s1-05/seeded/kills.json
42168be19d731ff3d2bed836021cf0b67b841bb66e0106816629b23757b1f695  s1-05/seeded/logs/2697aef-1.log
42168be19d731ff3d2bed836021cf0b67b841bb66e0106816629b23757b1f695  s1-05/seeded/logs/321a2fb-1.log
42168be19d731ff3d2bed836021cf0b67b841bb66e0106816629b23757b1f695  s1-05/seeded/logs/8f4d13b-1.log
42168be19d731ff3d2bed836021cf0b67b841bb66e0106816629b23757b1f695  s1-05/seeded/logs/a2578dc-1.log
8bbcac97fe297c9fa4ca4e2c5ef9891df658eb966ec424f3af41f6b2a5ce711d  s1-05/seeded/oracle/321a2fb-T10.py
1df51040c78c4c88f62bf0fab8552b4f42fc87cc4e3f6a6b2648aefb272b4edb  s1-05/seeded/oracle/321a2fb-T6.py
f10395d736a321106f33e8c17257a0825a6806a0496e12300eacaea6a6ce1bb4  s1-05/seeded/oracle/321a2fb-T7.py
7b9b068284fa78a1ebe6a3d3cf099a5e72e1c425ffb8d9d37938db3acdfa89dd  s1-05/seeded/oracle/321a2fb-T8.py
cd5d03631dfbde2f14f5a9251a365a5bbd6e9255cef1b2dfe3a5b5a39bc0d981  s1-05/seeded/oracle/321a2fb-T9.py
66f1d22755339f7bd3efaab3401d6f94456dcad2be9088d73daf4924d9aa2715  s1-05/seeded/oracle/manifest.json
ace689589c587a0ab7a9631c853d3c95bf8ff4996610910e4b9d8e38f5c8ea6d  s1-05/seeded/oracle/nb.py
b9ef5c6f994a678b6bb32a84d9c2d1e7a4f51fc7d1caa912877be850002ee792  s1-05/seeded/oracle/run_checks.py
2235fa05754dd768c508cd53d91d4ab51857f84a1872de9e196dad529ff6ee62  s1-05/seeded/oracle/runner.json
4d546d5b51f1ddd4b5db68f4dba0fd8bbe39775118a3543967c65dc84839ac52  s1-05/seeded/validation-321a2fb.json
2545a6b786fe85c4fb092ea1c42d409e5c291147c407f7a3d4fd2b85aa92ae5f  s1-05/seeded/work/seed-settings.json
4f55874ff5f220897bffe94c732ea7608699a87a423b22557e128629adcfdaad  s1-05/seeded/work/seed.prompt.md
ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d  s1-05/seeded/work/seed.reply.md
ebbc244f3816a6ddd2f31c983f4cb7be70526b5bf840f45963783a464a41ac22  s1-05/seeded/work/seed.reply.md.run.json
8bbcac97fe297c9fa4ca4e2c5ef9891df658eb966ec424f3af41f6b2a5ce711d  s1-05/seeded/work/seed/321a2fb-T10.py
1df51040c78c4c88f62bf0fab8552b4f42fc87cc4e3f6a6b2648aefb272b4edb  s1-05/seeded/work/seed/321a2fb-T6.py
f10395d736a321106f33e8c17257a0825a6806a0496e12300eacaea6a6ce1bb4  s1-05/seeded/work/seed/321a2fb-T7.py
7b9b068284fa78a1ebe6a3d3cf099a5e72e1c425ffb8d9d37938db3acdfa89dd  s1-05/seeded/work/seed/321a2fb-T8.py
cd5d03631dfbde2f14f5a9251a365a5bbd6e9255cef1b2dfe3a5b5a39bc0d981  s1-05/seeded/work/seed/321a2fb-T9.py
d4a72dfea0c1f8d2564be4772e746803806abfabcdd5780fec76d917c55b80f2  s1-05/seeded/work/seed/manifest.json
ace689589c587a0ab7a9631c853d3c95bf8ff4996610910e4b9d8e38f5c8ea6d  s1-05/seeded/work/seed/nb.py
b9ef5c6f994a678b6bb32a84d9c2d1e7a4f51fc7d1caa912877be850002ee792  s1-05/seeded/work/seed/run_checks.py
2235fa05754dd768c508cd53d91d4ab51857f84a1872de9e196dad529ff6ee62  s1-05/seeded/work/seed/runner.json
cc3e9e345c808627d3e9de16a470c0fc65e38ac8d128d48de1694163e32fd799  s1-06/seeded/bugs.json
b002a071256b540277b362d0a2b9f154217a3c8b3fe6939fc2ad99b39008b27d  s1-06/seeded/grades/0ac584a.json
8f54473613d41688fdd5fee45c2bcf60c2bc801338a6ef48012e0715c128b3e7  s1-06/seeded/grades/460ca7a.json
f693ac732899256224c3abbfbb1122f3d5a327770a45b3471e752a09126744d2  s1-06/seeded/grades/52f90de.json
cad69e40d7a13a5450117156ca59f82ee62f1e613aa37b2af399a397659d10e9  s1-06/seeded/grades/a564539.json
dfb76003d38dab7c0d63b51c77f61bb69cc5e387db4ef3a7f63c05d860bae7a7  s1-06/seeded/kills.json
f391f4eba73f7e2be0a49220ee14a0dfdf3f6efbb1728a2b2c1e9feff82e5a02  s1-06/seeded/logs/0ac584a-1.log
779082554d614b0815dcb2136de3d07ba6d8f5a6809e08dfade171db62c06db3  s1-06/seeded/logs/460ca7a-1.log
d30754cd9c833f7771be6d9a5d00688db9c22d2d30505148af83b157a26da403  s1-06/seeded/logs/52f90de-1.log
083364c0fb2c0d68b8369e8e6d0dadc52fc7f21338cfc541e38c80cf7fd490a6  s1-06/seeded/logs/a564539-1.log
ce268237bd40dc9a926df7258014455fa13ba025728bff943048c252cb4a6c67  s1-06/seeded/logs/a564539-2.log
fb3e4fb061e89cf27c2b3c69ebbdcc11aeb4aae14930bea0b75e54bc9602e2fd  s1-06/seeded/oracle/a564539-T10.py
1d5771f9c011bd2379079aa49fdb7032e6d5f57ce22910e8abc03d0a64682aa5  s1-06/seeded/oracle/a564539-T6.py
a7048c3291a6fafdb6fdb68152bcbd848b018ef45f357dee5c6c720fed14e03f  s1-06/seeded/oracle/a564539-T7.py
3058c09f7f90f5c2796617253d8dd2a21a034eb5a9752fe34f51ea6b0f804400  s1-06/seeded/oracle/a564539-T8.py
b2310848c29b903e83ded088fa51cef70c34e61934c4d650e52fea0915561d0e  s1-06/seeded/oracle/a564539-T9.py
ed1dea4644b8ab5d8f7f67daf3043e1b253123f83de6cb94863def7d8a9c6b3e  s1-06/seeded/oracle/manifest.json
6bdf5109d5c6240e215c280c24b01669d595dd7d28bb326e752be66bb8185017  s1-06/seeded/oracle/pngx_support.py
c61df9b274c6caa961ce2839366a6eb4f1517cab820c928e07faaf63570941a6  s1-06/seeded/oracle/run_checks.py
0317d05978d104e041363ae071c44fb9af338977dc8121ab052722b2efca893c  s1-06/seeded/oracle/runner.json
101b343e3274a7aab79bada8be8f85c9842a7b3f25347edd925bd5070187de0e  s1-06/seeded/validation-a564539.json
186dc61014d57bf6ac0eca2ec6337108b2240283f331d4ace09a5c91a83d9414  s1-06/seeded/work/fix-seeded-1/a564539.compare.prompt.md
857633ad1bf66101975dbf51be1b83252f391f469adfb561b8973ff0a8db99d4  s1-06/seeded/work/fix-seeded-1/a564539.compare.reply.md
69d3aec9ae572dfee7157b7a5c27128f7c2cc233df64c39e44c0d5656d591959  s1-06/seeded/work/fix-seeded-1/a564539.compare.reply.md.run.json
a891566320951b92064342138557d0f98e225378b2d74c4112f22468d5d7a22e  s1-06/seeded/work/fix-seeded-1/a564539.fix.prompt.md
0abe99990484ba0b1fff006e294939515e19c4fa5797792896239b13aa4eb69c  s1-06/seeded/work/fix-seeded-1/a564539.fix.reply.md
bc295966bc773353f285fd2ab84997845a3614ee826a111ab8f7f487222cdfe9  s1-06/seeded/work/fix-seeded-1/a564539.fix.reply.md.run.json
e765bf8c355a0f75e8bb8076892f41a38e70b9ff4ab423c886f7c2415b1b6091  s1-06/seeded/work/fix-seeded-1/a564539.settings.json
fb3e4fb061e89cf27c2b3c69ebbdcc11aeb4aae14930bea0b75e54bc9602e2fd  s1-06/seeded/work/fix-seeded-1/a564539/a564539-T10.py
1d5771f9c011bd2379079aa49fdb7032e6d5f57ce22910e8abc03d0a64682aa5  s1-06/seeded/work/fix-seeded-1/a564539/a564539-T6.py
a7048c3291a6fafdb6fdb68152bcbd848b018ef45f357dee5c6c720fed14e03f  s1-06/seeded/work/fix-seeded-1/a564539/a564539-T7.py
3058c09f7f90f5c2796617253d8dd2a21a034eb5a9752fe34f51ea6b0f804400  s1-06/seeded/work/fix-seeded-1/a564539/a564539-T8.py
b2310848c29b903e83ded088fa51cef70c34e61934c4d650e52fea0915561d0e  s1-06/seeded/work/fix-seeded-1/a564539/a564539-T9.py
ed1dea4644b8ab5d8f7f67daf3043e1b253123f83de6cb94863def7d8a9c6b3e  s1-06/seeded/work/fix-seeded-1/a564539/manifest.json
6bdf5109d5c6240e215c280c24b01669d595dd7d28bb326e752be66bb8185017  s1-06/seeded/work/fix-seeded-1/a564539/pngx_support.py
c61df9b274c6caa961ce2839366a6eb4f1517cab820c928e07faaf63570941a6  s1-06/seeded/work/fix-seeded-1/a564539/run_checks.py
0317d05978d104e041363ae071c44fb9af338977dc8121ab052722b2efca893c  s1-06/seeded/work/fix-seeded-1/a564539/runner.json
7f9231eb77a4c0842670f55a9fdf85b166d05ff67f23a0e218822241e399cf39  s1-06/seeded/work/seed-settings.json
9c27e7f609b2cd5425bad4a537832d06331643c12d42cffe27d41efaf586a844  s1-06/seeded/work/seed.prompt.md
ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d  s1-06/seeded/work/seed.reply.md
3c3b6fe8a92fd3a96d5d6c02e57b09788453eb0a3474c97b31a9bad323a7a5d3  s1-06/seeded/work/seed.reply.md.run.json
fb3e4fb061e89cf27c2b3c69ebbdcc11aeb4aae14930bea0b75e54bc9602e2fd  s1-06/seeded/work/seed/a564539-T10.py
1d5771f9c011bd2379079aa49fdb7032e6d5f57ce22910e8abc03d0a64682aa5  s1-06/seeded/work/seed/a564539-T6.py
a7048c3291a6fafdb6fdb68152bcbd848b018ef45f357dee5c6c720fed14e03f  s1-06/seeded/work/seed/a564539-T7.py
fc081b97df58a68932a2ea883e38b53b7de926d2bd6b8aed3f7ff57ff937d0ed  s1-06/seeded/work/seed/a564539-T8.py
b2310848c29b903e83ded088fa51cef70c34e61934c4d650e52fea0915561d0e  s1-06/seeded/work/seed/a564539-T9.py
5ed23f9f206280c067d30d112c8fe3ed55413d8466a2df292f667b5240dc7c62  s1-06/seeded/work/seed/manifest.json
6bdf5109d5c6240e215c280c24b01669d595dd7d28bb326e752be66bb8185017  s1-06/seeded/work/seed/pngx_support.py
c61df9b274c6caa961ce2839366a6eb4f1517cab820c928e07faaf63570941a6  s1-06/seeded/work/seed/run_checks.py
0317d05978d104e041363ae071c44fb9af338977dc8121ab052722b2efca893c  s1-06/seeded/work/seed/runner.json
aa5fcc1bbba70f7bde08d475aed537a08908faa469fdf1514aebca56722a65a7  s1-07/seeded/bugs.json
7b33eab17afba7cd3ee564e2774aed2676111140b74e6681daef90dea8dd1e7e  s1-07/seeded/grades/2193f16.json
d563448bb6f977f72d859c9b9b7bbcbd1bb964bdda838fa15ffb53821bf5ce15  s1-07/seeded/grades/4946bd9.json
180afbb9e3b08c1b0be063e605f41e54a332368b94876cd954948e4f6e991d1b  s1-07/seeded/grades/a16f093.json
d1adf29340e94b72f1fa3465d87177d8c1b1e7bb7bec3a98f2e654f023f6c6e4  s1-07/seeded/grades/fcf1ace.json
6b6cb139bd89bce5984adbb4ba8e1cae4ec49c64f911ab4cdb09f16478e84f45  s1-07/seeded/kills.json
42168be19d731ff3d2bed836021cf0b67b841bb66e0106816629b23757b1f695  s1-07/seeded/logs/2193f16-1.log
42168be19d731ff3d2bed836021cf0b67b841bb66e0106816629b23757b1f695  s1-07/seeded/logs/4946bd9-1.log
42168be19d731ff3d2bed836021cf0b67b841bb66e0106816629b23757b1f695  s1-07/seeded/logs/a16f093-1.log
42168be19d731ff3d2bed836021cf0b67b841bb66e0106816629b23757b1f695  s1-07/seeded/logs/fcf1ace-1.log
5413979d9e3f7aced5fdc6976c9dd20b5d29993138121d7205f6b496091f7b13  s1-07/seeded/oracle/fcf1ace-T10.py
9e7661e0766aca94e27a43f608dd41d0b7bad4493007f50caac23efd12771367  s1-07/seeded/oracle/fcf1ace-T11.py
fea8a7943905d1f68e959defcaf17cffe3a21e2c2920f22f9f201057b158010f  s1-07/seeded/oracle/fcf1ace-T7.py
33e65bb1109e1da8b522dcdb45f2bd81f87476850a3df6073f5707c82e7bb605  s1-07/seeded/oracle/fcf1ace-T8.py
964ef289032bfadea341d44f8a8fe22d3e84187380f7197bea7318f21111cb24  s1-07/seeded/oracle/fcf1ace-T9.py
b100ccd2ea73e32c9a3930826bc22b65d8ca2204c9b196a5ae61b378a75e4101  s1-07/seeded/oracle/manifest.json
1fc631f6612b3b778b3c0567114a2fe83338d8bef91035e0c1419e7ccc75d2ab  s1-07/seeded/oracle/nbcheck.py
7320d0413a250498e044b8f0a6c818b431dc2d910ec887912dfee057e5583918  s1-07/seeded/oracle/run_checks.py
598ab2fab6ef28f58b2cded873f8a731763cab2835357fc26f799dafc41435fc  s1-07/seeded/oracle/runner.json
955f93568da4c1d3f283eedab82e5a04cb64719066a415ab40c7333447c42937  s1-07/seeded/validation-fcf1ace.json
7d938a81f81cbc7d42cb957af059982b311dc6b10536898f7ac0102a3f9dd750  s1-07/seeded/work/seed-settings.json
60aa85d17b2f7c57b54e9a2050458a578212be54d29edc5ff0c6cf1451f817fe  s1-07/seeded/work/seed.prompt.md
5545c4f6fdff467a88f4d68707fa916e52143107f0dd33c1a654e6331e4a9d6f  s1-07/seeded/work/seed.reply.md
0b79aab46d28c0e23d586e27f6a6e4647e55c27bfacde5231172eced5961634e  s1-07/seeded/work/seed.reply.md.run.json
5413979d9e3f7aced5fdc6976c9dd20b5d29993138121d7205f6b496091f7b13  s1-07/seeded/work/seed/fcf1ace-T10.py
9e7661e0766aca94e27a43f608dd41d0b7bad4493007f50caac23efd12771367  s1-07/seeded/work/seed/fcf1ace-T11.py
fea8a7943905d1f68e959defcaf17cffe3a21e2c2920f22f9f201057b158010f  s1-07/seeded/work/seed/fcf1ace-T7.py
33e65bb1109e1da8b522dcdb45f2bd81f87476850a3df6073f5707c82e7bb605  s1-07/seeded/work/seed/fcf1ace-T8.py
964ef289032bfadea341d44f8a8fe22d3e84187380f7197bea7318f21111cb24  s1-07/seeded/work/seed/fcf1ace-T9.py
267d4ac96e7bc842d235dff6c4416c845c558ffb99dfe3d2f20e1b5aadcaa565  s1-07/seeded/work/seed/manifest.json
1fc631f6612b3b778b3c0567114a2fe83338d8bef91035e0c1419e7ccc75d2ab  s1-07/seeded/work/seed/nbcheck.py
7320d0413a250498e044b8f0a6c818b431dc2d910ec887912dfee057e5583918  s1-07/seeded/work/seed/run_checks.py
598ab2fab6ef28f58b2cded873f8a731763cab2835357fc26f799dafc41435fc  s1-07/seeded/work/seed/runner.json
1f2e1001e81de495fd34629174616dbbd2acea4e22f7100b7e5f2e41e3ead108  s1-09/seeded/bugs.json
0465003744b2d2d0c9d19b06434403519791ad04c7fc4465bbdf1c34e3b882cd  s1-09/seeded/grades/2c17d5c.json
9cc43202f780aaebb12e640d32c021ec3da313f27c97387a0d3e52aac0378f06  s1-09/seeded/grades/31bc6af.json
a10cfe180f09e0dc41c88c4ffbbb84d924f240dcf5adadfb14aaca271e78d6d1  s1-09/seeded/grades/935fce4.json
43ec7fa36c09eae32a5bce23171ab1bab234d8bf26f5f59a3d004337dd83eb8e  s1-09/seeded/grades/e913d1d.json
32d199c6876bfc4f58ab898f777d69de3e70f78d4d2717b3e29d61004d367976  s1-09/seeded/kills.json
1334e451a17840b977d5a834de45ab361dcdd38807af3ff75d09df51fd0cd4ea  s1-09/seeded/logs/2c17d5c-1.log
261adefed6f4bb2f9153ac13ccb12bcb2d2623dde589dafdc6869afedeaea7c2  s1-09/seeded/logs/31bc6af-1.log
c35c2870dd2b5d54b784dc8d513af93ff72baabd689952691e2fc024f987697a  s1-09/seeded/logs/935fce4-1.log
0c83fc21e1549dae5462b5aa5bd2602fe079eb03ffec19da776815a46e41238b  s1-09/seeded/logs/e913d1d-1.log
72b0fc8bf277976f4c86f537c679a9a45c1cf6ec61d95a8373dc76d131290f6b  s1-09/seeded/oracle/e913d1d-T10.rb
e5c83e70afb48c5696bfdb21a3e4af72fa7d43598763f59f7a49f4fcddbc0059  s1-09/seeded/oracle/e913d1d-T11.rb
1187c5fd74c06bcf5db271e3cdbe0b51193e172cf5358326ad9cdd18718cec3b  s1-09/seeded/oracle/e913d1d-T12.rb
46029f25b12166a3cef016e1b3e6752a5c6df67bbcb965665bb3e0813bc02338  s1-09/seeded/oracle/e913d1d-T13.rb
583946c6904994daf55729e33e09b6c009cdfebe97f5d95d7b9c95f43d4942ab  s1-09/seeded/oracle/e913d1d-T9.rb
9b6b27145ed6cf584a59e9a02be264a1682d1ff5a612aff1f57abb1bf1f0beae  s1-09/seeded/oracle/manifest.json
5e89f421891975963287f588f0084f2f60062df44198d3a0b7ee0cf34cfe208f  s1-09/seeded/oracle/run_checks.rb
ea9dd296de39d420be50ea313159681e9a1481863a38b9370ab63a66d94766c1  s1-09/seeded/oracle/runner.json
374397fe9d98dbf7398d214726995691e37a623f77eff3b610f9ca38f8300832  s1-09/seeded/oracle/support.rb
4947ee8967d41bd36c426a54c4bcf55cde298d1b290aca33ace527a9753b6c9a  s1-09/seeded/validation-e913d1d.json
4019d741ce054c546ac12ace019c8aba9e90360d7971cb996e8169a55c401478  s1-09/seeded/work/seed-settings.json
12d839cb8ef57058e1c3cb66d4ce6fe935b7f776d70195f855f1fa448011512d  s1-09/seeded/work/seed.prompt.md
ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d  s1-09/seeded/work/seed.reply.md
84e4df37759e9d98cfce8e73acbe6cd2259cfad290e9755519a4261ce7710fff  s1-09/seeded/work/seed.reply.md.run.json
72b0fc8bf277976f4c86f537c679a9a45c1cf6ec61d95a8373dc76d131290f6b  s1-09/seeded/work/seed/e913d1d-T10.rb
e5c83e70afb48c5696bfdb21a3e4af72fa7d43598763f59f7a49f4fcddbc0059  s1-09/seeded/work/seed/e913d1d-T11.rb
1187c5fd74c06bcf5db271e3cdbe0b51193e172cf5358326ad9cdd18718cec3b  s1-09/seeded/work/seed/e913d1d-T12.rb
46029f25b12166a3cef016e1b3e6752a5c6df67bbcb965665bb3e0813bc02338  s1-09/seeded/work/seed/e913d1d-T13.rb
583946c6904994daf55729e33e09b6c009cdfebe97f5d95d7b9c95f43d4942ab  s1-09/seeded/work/seed/e913d1d-T9.rb
ecdbd2149ca54c2ff028473ef191c0f2d63065980f3e882766bf6a798001f5c6  s1-09/seeded/work/seed/manifest.json
5e89f421891975963287f588f0084f2f60062df44198d3a0b7ee0cf34cfe208f  s1-09/seeded/work/seed/run_checks.rb
ea9dd296de39d420be50ea313159681e9a1481863a38b9370ab63a66d94766c1  s1-09/seeded/work/seed/runner.json
374397fe9d98dbf7398d214726995691e37a623f77eff3b610f9ca38f8300832  s1-09/seeded/work/seed/support.rb
4cbb2238a987db1cc3cae91295ae256e020e571c45826bab7bd5c55333842c49  s2-01/seeded/bugs.json
5e172eb8fc8fbdca3690d02467f288d942aa13c0c3f5b76cd30afeedc6e4dd2a  s2-01/seeded/grades/276dc1d.json
0be5c191bbebe9a1be7e78a01228826c4b7be24b6dd9f47a05c3e22d12ef2555  s2-01/seeded/grades/a02f862.json
421b4668dccd922e2b277d64a193c5a5f90f3a6fecdea1ba15630297b1417fdd  s2-01/seeded/grades/a598a04.json
ffa335f9f8a51803a3f75b850610810ec42d9ceb322e03dfd23e41692187b421  s2-01/seeded/grades/fb56f5a.json
8b7ffc2b38dd907d5e0d289c1173befc6c5127046ef5ed9fdd0598cdd509fc82  s2-01/seeded/kills.json
8a5916934b46e929e0fa8f9c8dbf56b8421fcb6a67e3a16f79303cb9d5a06b4f  s2-01/seeded/logs/276dc1d-1.log
39cf0dc4169cd372e5598391fc537596915988358db4fd36e85c1b85d99e0829  s2-01/seeded/logs/a02f862-1.log
224fe2f22684e7ec90fe83e3609dd1be0a082eea55f577d8efb422f5a2ca5d17  s2-01/seeded/logs/a598a04-1.log
8e1d83abb53624f387697eb2c35616bf50d03f71b26ee69e522d04ca4e247fd2  s2-01/seeded/logs/fb56f5a-1.log
18d232721bcd88849f5f23d4e58b9ea22b946877a036bc89464ca62031d90e8c  s2-01/seeded/oracle/fb56f5a-T11.cjs
06ad88bac238fda8a5b3777b480fba4421ee0874c59db928a30967398abc0e76  s2-01/seeded/oracle/fb56f5a-T12.cjs
e13ffd37574b82573a9b295a2b8502e49f8bd5d1a0a9ab4a26e9d7c32b2a36f8  s2-01/seeded/oracle/fb56f5a-T13.cjs
286d68d0e7f73b00845278059beb4f6fd9c1a3653befa28254f3825d0b682acb  s2-01/seeded/oracle/fb56f5a-T14.cjs
02ac55d118aa126d94929b96305942c9af99d031d9a893f9f87cc7614e205d0e  s2-01/seeded/oracle/fb56f5a-T15.cjs
0a25062052f5c323c0d4e45c4fa04c3f0716dd51122a77851ee09c49dd2bfe65  s2-01/seeded/oracle/gauge-harness.cjs
ef60a91f1d9a8305992ae2dcc868782cd182a069da4d7f1b68d5e98d718fa34e  s2-01/seeded/oracle/manifest.json
2f6512b1c7c453354c1357fcb7835f26b41c77ae5a70942f9eb5edc3c1a85460  s2-01/seeded/oracle/run-checks.cjs
d99da961392006307918906252d552b679fb58a710ec88b65c457680aafd848d  s2-01/seeded/oracle/runner.json
8ab032e2616c756fcff2a2e1cc75e21f97bf91e5fa8b324b334f8db58392081b  s2-01/seeded/validation-fb56f5a.json
f9ea7e581bc682650309d355220922164561c21f02d82c38064703294445b80c  s2-01/seeded/work/seed-settings.json
e7aae173a886844e3b603d7532776c7411b7e618b4ad76992d04f02fd6db5ca0  s2-01/seeded/work/seed.prompt.md
c442f885cec0ca26b835b8794510595b220d28a73b4d174fda3e69b4d4d7c68a  s2-01/seeded/work/seed.reply.md
eab342bc2c9c7aa8dbda783ee78109b0bec9a8dfac973d24924724b81a3b0af4  s2-01/seeded/work/seed.reply.md.run.json
18d232721bcd88849f5f23d4e58b9ea22b946877a036bc89464ca62031d90e8c  s2-01/seeded/work/seed/fb56f5a-T11.cjs
06ad88bac238fda8a5b3777b480fba4421ee0874c59db928a30967398abc0e76  s2-01/seeded/work/seed/fb56f5a-T12.cjs
e13ffd37574b82573a9b295a2b8502e49f8bd5d1a0a9ab4a26e9d7c32b2a36f8  s2-01/seeded/work/seed/fb56f5a-T13.cjs
286d68d0e7f73b00845278059beb4f6fd9c1a3653befa28254f3825d0b682acb  s2-01/seeded/work/seed/fb56f5a-T14.cjs
02ac55d118aa126d94929b96305942c9af99d031d9a893f9f87cc7614e205d0e  s2-01/seeded/work/seed/fb56f5a-T15.cjs
0a25062052f5c323c0d4e45c4fa04c3f0716dd51122a77851ee09c49dd2bfe65  s2-01/seeded/work/seed/gauge-harness.cjs
9190193258c9d90618b870c697743d7ea9d6c0db0b3d21d28d546c27214ce161  s2-01/seeded/work/seed/manifest.json
2f6512b1c7c453354c1357fcb7835f26b41c77ae5a70942f9eb5edc3c1a85460  s2-01/seeded/work/seed/run-checks.cjs
d99da961392006307918906252d552b679fb58a710ec88b65c457680aafd848d  s2-01/seeded/work/seed/runner.json
b3da939af9f7d06d09392e02929dd13033a476b600ca1cfdea9b78e20bf8255b  s2-02/seeded/bugs.json
d98a63e2088bff9f74f0de02392f801f7c2c2f5ba04c4555d98534a274f7429f  s2-02/seeded/grades/0c2795e.json
bb313eaea87d583563a51169a427c7ac7242bb0616f2336debdec7a9fa704ed8  s2-02/seeded/grades/11e478f.json
f9ab066a49722a22776cb58f48224121b24a6e6f610b570c6f1d635a1fdcc8a4  s2-02/seeded/grades/5ac9c06.json
9f4988332666be4ea69aa0a90476dc7c67d27be36cd31a102066a7236a7c1236  s2-02/seeded/grades/697368e.json
c9b789b17393b996051e0183e994bfeb1728a86c80577d18a311913334a8abdc  s2-02/seeded/kills.json
4305a0976b9e987ab85f0966bb84e02daefe3dfd9e8105c3fd9edd4867c84b1b  s2-02/seeded/logs/0c2795e-1.log
950d33160bfb00aaaf562af7b70aba1754a93c75adcb292717b8e4713c77478f  s2-02/seeded/logs/11e478f-1.log
cb9a7a00a86cc3dd9bcc7abeb16e540fc855f87f9413c3c70d80007e32a3f118  s2-02/seeded/logs/5ac9c06-1.log
82fb9ad829e46eec5f50b79606316202556ad4f7de719dd29de471d8466fbb98  s2-02/seeded/logs/697368e-1.log
9b6b06fba5b922d2fb65d0235887567b20918ac453c89b301272378ba2fe2b6b  s2-02/seeded/oracle/11e478f-T3.mjs
6d3d8331b1d005f560cf8fad6251c5a32c395cee939961e3f70eebf96da0c3ad  s2-02/seeded/oracle/11e478f-T4.mjs
be97c3b7cc57edc18bd7e0e6c9427aa96f5c4c3a32c5d683084970c1f2e76998  s2-02/seeded/oracle/11e478f-T5.mjs
d652120f8fed1c040f6ccca701d52b9c9e2589a9ced39ef21de47ffe8367f66d  s2-02/seeded/oracle/11e478f-T6.mjs
a335560f78f7d9686b87360154b73874059c65bf32c57d96c10c57b18b6e0925  s2-02/seeded/oracle/11e478f-T7.mjs
efa710878572e08ec4e3e14e0b41705f62016311abb59195b5b608f4470a78c9  s2-02/seeded/oracle/lib.mjs
b424b7b9ae679f2009681de453b0df6e45f0702091f0280ac020c00b6efc1f4c  s2-02/seeded/oracle/manifest.json
b9c2c0b141fbde1274ca1d855b63cc0bcac4309fbab616764ab6f39696d01211  s2-02/seeded/oracle/run.mjs
f59e06a6f4232dd929f7d610a4a853fa18f05b3a9b5a1d5a988153978ccb06eb  s2-02/seeded/oracle/runner.json
e9971aaafa5bf590da1fffe8eeadbca924bb9f228a7f8239fea61b089781f577  s2-02/seeded/validation-11e478f.json
d47889a1373fb376a8a9f6708b1488a3293921c34aa87ac20b02eef32d7139b4  s2-02/seeded/work/seed-settings.json
61f823e0a77bc8ddc4fe23f70765cd8d8e519a5b2996daca5ffe4c03cee8b70e  s2-02/seeded/work/seed.prompt.md
ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d  s2-02/seeded/work/seed.reply.md
01d737623bbd7bbefd16447cad84a3628e90ed187147ac9d120328cf0e646fcd  s2-02/seeded/work/seed.reply.md.run.json
9b6b06fba5b922d2fb65d0235887567b20918ac453c89b301272378ba2fe2b6b  s2-02/seeded/work/seed/11e478f-T3.mjs
6d3d8331b1d005f560cf8fad6251c5a32c395cee939961e3f70eebf96da0c3ad  s2-02/seeded/work/seed/11e478f-T4.mjs
be97c3b7cc57edc18bd7e0e6c9427aa96f5c4c3a32c5d683084970c1f2e76998  s2-02/seeded/work/seed/11e478f-T5.mjs
d652120f8fed1c040f6ccca701d52b9c9e2589a9ced39ef21de47ffe8367f66d  s2-02/seeded/work/seed/11e478f-T6.mjs
a335560f78f7d9686b87360154b73874059c65bf32c57d96c10c57b18b6e0925  s2-02/seeded/work/seed/11e478f-T7.mjs
efa710878572e08ec4e3e14e0b41705f62016311abb59195b5b608f4470a78c9  s2-02/seeded/work/seed/lib.mjs
f4c671fb45d21461898fd6065055806780c60e8a28098d5a3f59ea70238810ef  s2-02/seeded/work/seed/manifest.json
b9c2c0b141fbde1274ca1d855b63cc0bcac4309fbab616764ab6f39696d01211  s2-02/seeded/work/seed/run.mjs
f59e06a6f4232dd929f7d610a4a853fa18f05b3a9b5a1d5a988153978ccb06eb  s2-02/seeded/work/seed/runner.json
3cace6c3a138fb8fbf1179412eaedb8dcc27275e7bc95ce7c880aff9aad73b48  s2-03/seeded/bugs.json
ee19ee4250c262fcbd534d27157242c3551094b845a3099c02b198be03d7ee47  s2-03/seeded/grades/2771419.json
dd7a760a6807afadfed4fc997b7805221a174aca78e787a725e47cf01838d714  s2-03/seeded/grades/bbb1d6f.json
c255db9d46a3f0377f23a4ecfabf60cd7fd19632c26f9f11527288eb1464afbb  s2-03/seeded/grades/cd976af.json
47aa6ab47e0e27c64b63a2a2e9987348924e9b2872f202d793c9808c7ed810db  s2-03/seeded/grades/f7210f1.json
4a0d0943eaf541982f556efec2ffac049d413f35ce43656e55e0c465dbe66b0c  s2-03/seeded/kills.json
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s2-03/seeded/logs/2771419-1.log
7f0e52f4730ae0ec5814b857c4bd304cb944f288b2e221595c6b1c4a2c4a815f  s2-03/seeded/logs/bbb1d6f-1.log
ef3e93283bb65ecad131da93e4a7d64f4ce84f3cbb999d646e30f52dc9809298  s2-03/seeded/logs/cd976af-1.log
7340c4633a080c93c709f7c91c727c9fd0b1eeee5c4727fdb58b7ffa0c926418  s2-03/seeded/logs/f7210f1-1.log
0cb2e031171aaafdada35d510082e4dff56f86044f7cc44d3af1bab4b24750fe  s2-03/seeded/oracle/2771419-T4.mjs
23abb930e7d426dc952b96a8fa7a3ba463d44170513f07c23d3d0938c86cf846  s2-03/seeded/oracle/2771419-T5.mjs
05627e516c524b892f513a5d8bb04beffded7051a84cd5be82137558510c607e  s2-03/seeded/oracle/2771419-T6.mjs
80b027dea7623cf47e40040adce25bbfd3d32a158386895338f9f456237f2a12  s2-03/seeded/oracle/2771419-T7.mjs
c8930a89cac4b6a4c877c36b85a021bff3af4ee2c56005789ea3f2efd65cd922  s2-03/seeded/oracle/2771419-T8.mjs
1e4f4dbaa0c80d1e26015ffb37bde16f8e294b5bdcb9dfc4865a869221353ad2  s2-03/seeded/oracle/cdp.mjs
17706227151e2379be77f8af89105a9136e249dbb976beaab6cfcb3fed1744ae  s2-03/seeded/oracle/manifest.json
58d29513097d8d75ccdca7486fed8981fd67651fa2768e45392a9645166d0238  s2-03/seeded/oracle/run.mjs
918faa4f1eb9e53e7b667c9824766feecd726e69e560ef5df283864dccf1fd96  s2-03/seeded/oracle/runner.json
888752c0197033ae6fc74d24e2728c0d6d9cbcc3815ab11ac9e9a717d0253d61  s2-03/seeded/validation-2771419.json
7a3eda8e1841072f4e23f8cb3e66b2e768a929f8fb47c7fb874aa2e39d368e34  s2-03/seeded/work/seed-settings.json
b67e62b6a8bc795dc27d7ec62e3aeee96d41d125c48181e6b9e461fd23fd00ee  s2-03/seeded/work/seed.prompt.md
af1125fd037f4a34818511c855182f8cab0da05319c0573b8b45b9dd78477c76  s2-03/seeded/work/seed.reply.md
f66b06f827b0251245615fc421e79d289a2077919d5fffa27920a0a479c21844  s2-03/seeded/work/seed.reply.md.run.json
0cb2e031171aaafdada35d510082e4dff56f86044f7cc44d3af1bab4b24750fe  s2-03/seeded/work/seed/2771419-T4.mjs
23abb930e7d426dc952b96a8fa7a3ba463d44170513f07c23d3d0938c86cf846  s2-03/seeded/work/seed/2771419-T5.mjs
05627e516c524b892f513a5d8bb04beffded7051a84cd5be82137558510c607e  s2-03/seeded/work/seed/2771419-T6.mjs
80b027dea7623cf47e40040adce25bbfd3d32a158386895338f9f456237f2a12  s2-03/seeded/work/seed/2771419-T7.mjs
c8930a89cac4b6a4c877c36b85a021bff3af4ee2c56005789ea3f2efd65cd922  s2-03/seeded/work/seed/2771419-T8.mjs
1e4f4dbaa0c80d1e26015ffb37bde16f8e294b5bdcb9dfc4865a869221353ad2  s2-03/seeded/work/seed/cdp.mjs
163bfc1e21753ead3e180b06e80fa3c7a7b2aea2cd7a60aebad100cb17973a59  s2-03/seeded/work/seed/manifest.json
58d29513097d8d75ccdca7486fed8981fd67651fa2768e45392a9645166d0238  s2-03/seeded/work/seed/run.mjs
918faa4f1eb9e53e7b667c9824766feecd726e69e560ef5df283864dccf1fd96  s2-03/seeded/work/seed/runner.json
cb7afd54e7171df15230df73b8d89374844924809a197b546642c4f2946aef51  s2-05/seeded/bugs.json
ccaf41bb9913d959b0c3e820151409399c638a4efacd31f197f7b8d2a29bfe0b  s2-05/seeded/grades/66bba0a.json
6a818c1b9ff3768d9dd2f16207052f7370880d37e93eda72339de44a17d5c191  s2-05/seeded/grades/747ab65.json
c21668848fb263d58538b74ab6db22fb912460863216aaa230338de8c62567cb  s2-05/seeded/grades/990fb62.json
005cc7baf9ea1686a74632f3d6171a63328e2f211151b1a4e21ec77427e30ab9  s2-05/seeded/grades/9f88dd4.json
37784678724aa0af2a55ed0a904adabd9f12a04f2f87d44e12bf37e704bcdb59  s2-05/seeded/kills.json
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s2-05/seeded/logs/66bba0a-1.log
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s2-05/seeded/logs/747ab65-1.log
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s2-05/seeded/logs/990fb62-1.log
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s2-05/seeded/logs/9f88dd4-1.log
c2c6c23b23166f86f8916eed35b7366380b69848c6cd48fc2b2562960567ae33  s2-05/seeded/oracle/9f88dd4-T3.mjs
ab9d82a247e26875368129fdc7a4313e4915a7152bfae50d72bfc14b3e84ccd3  s2-05/seeded/oracle/9f88dd4-T4.mjs
828085680f4df7bde810f8a735446d70ce0327d7cde3eebd13cfda0bc7e3cb99  s2-05/seeded/oracle/9f88dd4-T5.mjs
957ad39653862a25c3fbe90dd50a99e8132cab50c7c7a1ed46bfedbd32f70722  s2-05/seeded/oracle/9f88dd4-T6.mjs
74011faca43e21a32d40aba3423b9fa048ce53900faf93333879e5b9d723eec0  s2-05/seeded/oracle/9f88dd4-T7.mjs
53711f8aaac8478901bbb6b5c3bb432354006428a11ede49c4aef60938e179ff  s2-05/seeded/oracle/junit.mjs
1b903ebde79916ae70b2412b7fa6d857b34a43a428e804f0a063218a22b37cb7  s2-05/seeded/oracle/lib.mjs
1beccc880d0e00c8714def0ae38445c384d7ca4ff9ef3068bac1f4382383283d  s2-05/seeded/oracle/manifest.json
b9a2db111c9be6a264f16cfd33a6f044b14b562b4aefde49320c4aef01353091  s2-05/seeded/oracle/runner.json
411bc5458fa0b3a35a9cf7806cab30adfee8d2d381410b291b56c4abfb885716  s2-05/seeded/validation-9f88dd4.json
807066a898a35d445800810723a691d312b0b7cbe329e1c02040c11b7896cc06  s2-05/seeded/work/seed-settings.json
7f21a7f8ee5600b2c83601f101d37e93acbac98d4cc759be7f3f960b0678b622  s2-05/seeded/work/seed.prompt.md
ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d  s2-05/seeded/work/seed.reply.md
4a7bd194ddd8e7f9c01d1738012fb9f21507b820a76cd53778398f98de1a181b  s2-05/seeded/work/seed.reply.md.run.json
c2c6c23b23166f86f8916eed35b7366380b69848c6cd48fc2b2562960567ae33  s2-05/seeded/work/seed/9f88dd4-T3.mjs
ab9d82a247e26875368129fdc7a4313e4915a7152bfae50d72bfc14b3e84ccd3  s2-05/seeded/work/seed/9f88dd4-T4.mjs
828085680f4df7bde810f8a735446d70ce0327d7cde3eebd13cfda0bc7e3cb99  s2-05/seeded/work/seed/9f88dd4-T5.mjs
957ad39653862a25c3fbe90dd50a99e8132cab50c7c7a1ed46bfedbd32f70722  s2-05/seeded/work/seed/9f88dd4-T6.mjs
74011faca43e21a32d40aba3423b9fa048ce53900faf93333879e5b9d723eec0  s2-05/seeded/work/seed/9f88dd4-T7.mjs
53711f8aaac8478901bbb6b5c3bb432354006428a11ede49c4aef60938e179ff  s2-05/seeded/work/seed/junit.mjs
1b903ebde79916ae70b2412b7fa6d857b34a43a428e804f0a063218a22b37cb7  s2-05/seeded/work/seed/lib.mjs
0e6223a9834a773eb127b616e0e46f7609c667bc65764e924cf97b8ba4508e86  s2-05/seeded/work/seed/manifest.json
b9a2db111c9be6a264f16cfd33a6f044b14b562b4aefde49320c4aef01353091  s2-05/seeded/work/seed/runner.json
e3ced5610b9b6e98c82ceb03009e5da211bb8835e891f3e0afe8dc39a91c715d  s2-07/seeded/bugs.json
b9cbad5ed26c8806ef607173238298b30a1b180e43a5750f67fe949d4bb1de84  s2-07/seeded/grades/0248b63.json
2764f5dc67cc6f4607c92c88c5627840ea93676efff813a3249d89ff4b66ea25  s2-07/seeded/grades/295e3ff.json
023dfd6d188257454e8db4849efd7c0dfa3e4e6f93eebceb95e7c500b2939b99  s2-07/seeded/grades/2a9258e.json
2f29bc6f3170bc853ee4cb7cc8ffd8b4552f670812d8997453e4befbb907305e  s2-07/seeded/grades/cc192bc.json
8e4c2e62d37ba4248b4359ea0e99dfb07b0b0cfb65bb0d6ff51e26e2cf3d2534  s2-07/seeded/kills.json
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s2-07/seeded/logs/0248b63-1.log
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s2-07/seeded/logs/295e3ff-1.log
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s2-07/seeded/logs/2a9258e-1.log
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s2-07/seeded/logs/cc192bc-1.log
0976fd9c33366bf21b9d10c8ef74f6c2a64415e3b4c7cdca4afdb1b74fa5d44d  s2-07/seeded/oracle/0248b63-T14.js
906fadc9fb46be2a55c3472f07593630206b18476d82555923f8f4db535aea8b  s2-07/seeded/oracle/0248b63-T15.js
8fb3f18ba86f73f3fe00c0e371a190ef22d082235fbb09c2749c83e063ef0352  s2-07/seeded/oracle/0248b63-T16.js
80dab9cf10c05a6f29596e4a0dde4db1cc66609afd4034664083678c84f38f27  s2-07/seeded/oracle/0248b63-T17.js
cd50fa29cc04d9b5b9cebc88b60d4f0b7cd37135fefa3a66a671ad9555e5a5b5  s2-07/seeded/oracle/0248b63-T18.js
aa73113755f2af63396edd89cdfacdbe98403f0972722530d750972577daba1e  s2-07/seeded/oracle/harness.js
39cc9e54b216b12c79413bb4560d7ba359189d54d258c797283eb261e112a9c4  s2-07/seeded/oracle/manifest.json
b0012555a2a4af0795e6b4c0f773ebf8a506e9443e03e2463586e672e8ac9fe0  s2-07/seeded/oracle/runner.json
592e2a9a5dfc630158ddf68ef42636ce8d4ca6ffdb08818568560b17e58aee6d  s2-07/seeded/validation-0248b63.json
51d38be1dfb13fcd478439fc1d992531bd61288ea7c6100016a13b35073f464f  s2-07/seeded/work/seed-settings.json
828d683236b0af21779af0832e189250f5bf661758bf39b417b4be382cc089df  s2-07/seeded/work/seed.prompt.md
6716207b1cab792ce0555cae341e48e1e209650ad3d0525cd78b5a236ccb8090  s2-07/seeded/work/seed.reply.md
8d1393055d987090fb532739fc6cb7ff7cca594d70066608daf29f0ca8603ba7  s2-07/seeded/work/seed.reply.md.run.json
0976fd9c33366bf21b9d10c8ef74f6c2a64415e3b4c7cdca4afdb1b74fa5d44d  s2-07/seeded/work/seed/0248b63-T14.js
906fadc9fb46be2a55c3472f07593630206b18476d82555923f8f4db535aea8b  s2-07/seeded/work/seed/0248b63-T15.js
8fb3f18ba86f73f3fe00c0e371a190ef22d082235fbb09c2749c83e063ef0352  s2-07/seeded/work/seed/0248b63-T16.js
80dab9cf10c05a6f29596e4a0dde4db1cc66609afd4034664083678c84f38f27  s2-07/seeded/work/seed/0248b63-T17.js
cd50fa29cc04d9b5b9cebc88b60d4f0b7cd37135fefa3a66a671ad9555e5a5b5  s2-07/seeded/work/seed/0248b63-T18.js
aa73113755f2af63396edd89cdfacdbe98403f0972722530d750972577daba1e  s2-07/seeded/work/seed/harness.js
33704f89e474954727c4716fa0f6a32b8dd64dced8e9d7ac19e104e74418a917  s2-07/seeded/work/seed/manifest.json
b0012555a2a4af0795e6b4c0f773ebf8a506e9443e03e2463586e672e8ac9fe0  s2-07/seeded/work/seed/runner.json
d676f44db8b6817c69f565ea730b3c340b0427cba1efb8fd92ff792451a18547  s2-08/seeded/bugs.json
55061907f8d8c55cdeac598fe0271bb775b2e38b828c44046026a9e7423880d3  s2-08/seeded/grades/22278be.json
6b2efcbc6e5372c32a807e5421bfc75498486294a3b0d718b675183c8d81ced7  s2-08/seeded/grades/57c072e.json
e58c6676e8b9e75a9ad2bba439189b21a67ca85b5474db35a438322f438ab58f  s2-08/seeded/grades/703d7f4.json
147a69077959211fa460c535de007f7ae3c350fcc084d86e27cba3abf487ce06  s2-08/seeded/grades/be34c86.json
b415af7943371d1f2c92cc95eadfd6128a29b393ceac2b7cac14a22df8ab2e4a  s2-08/seeded/kills.json
6ed3123c0db87acccccc4d78b4de8b09035d9dc8bca35609f2241fbc1826ebb7  s2-08/seeded/logs/22278be-1.log
eea6fe1b9d71ef4d7bde4506284a88cfe7a72e8d11aaa6b9629a547c3d374c8d  s2-08/seeded/logs/57c072e-1.log
4425393646abefd1a2d50a0b9ab52b5b42cdf458644af21633779eacf577a227  s2-08/seeded/logs/703d7f4-1.log
f59812eccea95134f244a51970e3bb43753a1241f0930d546837d7b69cf936f5  s2-08/seeded/logs/be34c86-1.log
78fc485dd628e878f1835eaab0e87be16caf3567ed3e93cfe3a306f52d0bfb79  s2-08/seeded/oracle/22278be-T5.cjs
b6d5c5a9057e29c1da283874fdb99cd9b872a4e4171d8b0b280df2f7121edaeb  s2-08/seeded/oracle/22278be-T6.cjs
9356f74d3b39afd09621c07f633c5cf7dc6f37d76778305b2b3535d6d683ed2b  s2-08/seeded/oracle/22278be-T7.cjs
117d53fa2a7cd9511a8a66c344ce743bba94f89971633954a53531920bffc94f  s2-08/seeded/oracle/22278be-T8.cjs
942042c80b4c3b56c32ba5724869ae4ed620d8e52bd6228039f317e2a08f1a41  s2-08/seeded/oracle/22278be-T9.cjs
d6fe4e68ea24aea11b64b746e09aa9e61f62402bff5063f3e44f50532a2d3aa7  s2-08/seeded/oracle/lib.cjs
5e81680530fdcdce6c9db12ba4358d2b0870d22bc230204e8dbc784cedf1e070  s2-08/seeded/oracle/manifest.json
6fc4197e9aee9f3f632fccb2e754ed5678b2a121957bbf413a6643d9e27be9f5  s2-08/seeded/oracle/run.cjs
86076b33b772fb21437fe40a3b6f6b65499310fc67de1e9182841ba37cf17018  s2-08/seeded/oracle/runner.json
38aa0594db871c7ee42cae95642a7454095bcbe7ee6a25db0cd8d0559048d4dd  s2-08/seeded/validation-22278be.json
a435fb7fcd39aed95b3071a94636c1983a52678696307b824ca4ef7a1e16dfd4  s2-08/seeded/work/seed-settings.json
a3d891d9445b11673d4a7489acf18f78726fddd62ceb087da5c2bb54dc71678b  s2-08/seeded/work/seed.prompt.md
ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d  s2-08/seeded/work/seed.reply.md
72be135cbe83e72fe9c04c7fbe5b319584915c4a06f65abd7a36080645e96b51  s2-08/seeded/work/seed.reply.md.run.json
78fc485dd628e878f1835eaab0e87be16caf3567ed3e93cfe3a306f52d0bfb79  s2-08/seeded/work/seed/22278be-T5.cjs
b6d5c5a9057e29c1da283874fdb99cd9b872a4e4171d8b0b280df2f7121edaeb  s2-08/seeded/work/seed/22278be-T6.cjs
9356f74d3b39afd09621c07f633c5cf7dc6f37d76778305b2b3535d6d683ed2b  s2-08/seeded/work/seed/22278be-T7.cjs
117d53fa2a7cd9511a8a66c344ce743bba94f89971633954a53531920bffc94f  s2-08/seeded/work/seed/22278be-T8.cjs
942042c80b4c3b56c32ba5724869ae4ed620d8e52bd6228039f317e2a08f1a41  s2-08/seeded/work/seed/22278be-T9.cjs
d6fe4e68ea24aea11b64b746e09aa9e61f62402bff5063f3e44f50532a2d3aa7  s2-08/seeded/work/seed/lib.cjs
31df0816a9d422c341ac584e432eff5426d1d1d7f1fc477cacf3a231afda7f71  s2-08/seeded/work/seed/manifest.json
6fc4197e9aee9f3f632fccb2e754ed5678b2a121957bbf413a6643d9e27be9f5  s2-08/seeded/work/seed/run.cjs
86076b33b772fb21437fe40a3b6f6b65499310fc67de1e9182841ba37cf17018  s2-08/seeded/work/seed/runner.json
4cb003414007e059c692e2f4d1e5532f4e44a2b21ccb3c0b48fde77797339a80  s2-09/seeded/bugs.json
c3a256e121e7d32b443b35bbc52215b411d6121980aa6b13bb2ce73615158cd4  s2-09/seeded/grades/11bb3ba.json
945c38fb02ec607006db07e4c243bc384fa75bdb3b0b6bf0bea978dc4ab4f57e  s2-09/seeded/grades/3dbe3bf.json
7c512b7d89d24381557c87d82a99917e09d9541b6c9cc681eb233e125b69f5da  s2-09/seeded/grades/b2a1ff4.json
59f0c1eff7a9748e9206ee7e112c2a011e9845232a60e70d50dc080cfe7e2baf  s2-09/seeded/grades/fa54489.json
eaea4593a57a66a53ef618b5b702a0acc71fee3a09fb6b7d423e47f989e08e08  s2-09/seeded/kills.json
a58d99d0ea6a9648084c2cb91f53d09c6b22f2611d23b0af406786f7160f9bae  s2-09/seeded/logs/11bb3ba-1.log
0088372370e078142d2d4d2567e35654106e526605de63a348235c4bc1448536  s2-09/seeded/logs/3dbe3bf-1.log
203fb43d3daf9c1f41ab9e8b89a516605217ae9b5fecf0ebbf65c4e149f9e8b2  s2-09/seeded/logs/b2a1ff4-1.log
d43434d1e6db5f68aa0772d519d1777244a0819f7cca164503738fd5430793de  s2-09/seeded/logs/fa54489-1.log
a1c1a9ddadaed0a2e3cb38b52392036cc596ad31600eb8d991c6c340f611220e  s2-09/seeded/oracle/11bb3ba-T94.js
21efd608aa13fd36060f53a312af294a463539740ce7217e4245c304964f4a0e  s2-09/seeded/oracle/11bb3ba-T95.js
1db64b9fce8dd0372e952dd863a39b58f5a854169a62ef130965c956390a0a21  s2-09/seeded/oracle/11bb3ba-T96.js
749503993024098750e194f28d56aaead568ccddc6c99dc55584e1d834e5a39b  s2-09/seeded/oracle/11bb3ba-T97.js
9d970517c1ad63de0cb76bf45edc99e550528f92fd618db22f12bbb4fbff5669  s2-09/seeded/oracle/11bb3ba-T98.js
8e3ac90ce31f7be20ab1c966aaf1ebc4e862cecc5cdff8f38029256dfdb8cbea  s2-09/seeded/oracle/lib.js
fce218f02bfe10af09e6ade45f181f5440e0c2e19eed1bd39d5947d17da33ee5  s2-09/seeded/oracle/manifest.json
3f5ca388bf393f5729f2c7b8d05df1807bb7f4ae805a2142baf305851ff43fb8  s2-09/seeded/oracle/run-all.js
2118a37126b8ba1e91c60cc9c9c541cf65eccb4ff9083550683678c435e4e2a2  s2-09/seeded/oracle/runner.json
9e4d335ba64728e1668b3501b861720df47a169e5dcb2260912cbf3c8c82f783  s2-09/seeded/validation-11bb3ba.json
d5606b0ea34347d0075288bcaa6c4ef5cf87ad41db3228584864e2714535174b  s2-09/seeded/work/seed-settings.json
c310bc748faba24a41f16d0a5ebe861bfb7413475dc8482b367df74822d753ac  s2-09/seeded/work/seed.prompt.md
c4197e7b7fe4c1a64766a20327275185ace9ce68e2c316a07fa3b56420b1fde1  s2-09/seeded/work/seed.reply.md
97c21b57d2cbc65205cc0ab442c0a4b97a12a9390d1273c889029e2404c0ccdb  s2-09/seeded/work/seed.reply.md.run.json
a1c1a9ddadaed0a2e3cb38b52392036cc596ad31600eb8d991c6c340f611220e  s2-09/seeded/work/seed/11bb3ba-T94.js
21efd608aa13fd36060f53a312af294a463539740ce7217e4245c304964f4a0e  s2-09/seeded/work/seed/11bb3ba-T95.js
1db64b9fce8dd0372e952dd863a39b58f5a854169a62ef130965c956390a0a21  s2-09/seeded/work/seed/11bb3ba-T96.js
749503993024098750e194f28d56aaead568ccddc6c99dc55584e1d834e5a39b  s2-09/seeded/work/seed/11bb3ba-T97.js
9d970517c1ad63de0cb76bf45edc99e550528f92fd618db22f12bbb4fbff5669  s2-09/seeded/work/seed/11bb3ba-T98.js
8e3ac90ce31f7be20ab1c966aaf1ebc4e862cecc5cdff8f38029256dfdb8cbea  s2-09/seeded/work/seed/lib.js
268a9b96f40d5224bf99e81d76cf431a1429414de24e537a011580e4d87eb2c8  s2-09/seeded/work/seed/manifest.json
3f5ca388bf393f5729f2c7b8d05df1807bb7f4ae805a2142baf305851ff43fb8  s2-09/seeded/work/seed/run-all.js
2118a37126b8ba1e91c60cc9c9c541cf65eccb4ff9083550683678c435e4e2a2  s2-09/seeded/work/seed/runner.json
5f12cf9109d2732c60d8ffcab4010d41a7532efc60291b41a42f511c608ddb98  s2-10/seeded/bugs.json
f3adef78326420d9a3f09c86427c36770ef0ff1b832b33ebf70db6d1ae752307  s2-10/seeded/grades/5fcc506.json
1c125be9a0da4a1ba12b724cca11ab8b54f83759b91b3c1ae8095328c66304b1  s2-10/seeded/grades/6772aae.json
d27146f635a8c7637c53cde20e4b7a333aa3a2317a7cfa4063b4c5a37194484d  s2-10/seeded/grades/83f86a1.json
2919b9670a303fcb09f7a459957d3ae72e172a9812d68aa69b28747db9c3bd4a  s2-10/seeded/grades/cbab90a.json
5fa7bb1af651ca8f11daba43cebc020d2b84730178aae66c76a6ca4424647c09  s2-10/seeded/kills.json
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s2-10/seeded/logs/5fcc506-1.log
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s2-10/seeded/logs/6772aae-1.log
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s2-10/seeded/logs/83f86a1-1.log
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s2-10/seeded/logs/cbab90a-1.log
28b5a7c50d3db0581873d9e06b242fd5a8d6449ffccc896c7f6a74911edcc23b  s2-10/seeded/oracle/cbab90a-T11.mjs
a3ef51ea16b3d54ec6ebfcb9fee04280b3cd222a37ee04b37443be1700784b16  s2-10/seeded/oracle/cbab90a-T12.mjs
d2df1caeb805a2d34427635c592c6fabc43c52d524690c53923d838c42b8cef8  s2-10/seeded/oracle/cbab90a-T13.mjs
38627d0b8f9827edffda0f64eb471e39b9022c43f836b0644163ecd1c4ad9459  s2-10/seeded/oracle/cbab90a-T14.mjs
9fe8c76509e1b08308f4839cf8dc3c1d376c81824197948366db531f958b92f4  s2-10/seeded/oracle/cbab90a-T15.mjs
405572ad2e6ac2cd7ee572561f01cad13a2472059bb9b9b631d86ad162bc3b09  s2-10/seeded/oracle/lib.mjs
b03f782c16f8f4647afde6be5ae9f6b912f223ec583bb6dca860ad20840c6c0e  s2-10/seeded/oracle/manifest.json
dab22441f4f6e79abfa4bd2211391e3c124cdf4ee3de048acc047ce980986a4f  s2-10/seeded/oracle/run.mjs
f59e06a6f4232dd929f7d610a4a853fa18f05b3a9b5a1d5a988153978ccb06eb  s2-10/seeded/oracle/runner.json
793ef31f78fc8c7c0ac32880a3be2f12e558403028fc093fef261082e2c19a94  s2-10/seeded/validation-cbab90a.json
021d6785670ceeeeda50c0f73053632d6647400641b5419bc60fe49c491d098e  s2-10/seeded/work/seed-settings.json
d9014d111f4f352d0f57fea8b91f116d54936295d4ddfa5864ae4b9fc50c3a81  s2-10/seeded/work/seed.prompt.md
c173121640fdc173389831a775c227da45c305dd970f7d5a7c8a62ae80b27f51  s2-10/seeded/work/seed.reply.md
800de4b92e94739b92f5f97031016b932eb19dee7f85bf891788e73033bf0178  s2-10/seeded/work/seed.reply.md.run.json
28b5a7c50d3db0581873d9e06b242fd5a8d6449ffccc896c7f6a74911edcc23b  s2-10/seeded/work/seed/cbab90a-T11.mjs
a3ef51ea16b3d54ec6ebfcb9fee04280b3cd222a37ee04b37443be1700784b16  s2-10/seeded/work/seed/cbab90a-T12.mjs
d2df1caeb805a2d34427635c592c6fabc43c52d524690c53923d838c42b8cef8  s2-10/seeded/work/seed/cbab90a-T13.mjs
38627d0b8f9827edffda0f64eb471e39b9022c43f836b0644163ecd1c4ad9459  s2-10/seeded/work/seed/cbab90a-T14.mjs
9fe8c76509e1b08308f4839cf8dc3c1d376c81824197948366db531f958b92f4  s2-10/seeded/work/seed/cbab90a-T15.mjs
405572ad2e6ac2cd7ee572561f01cad13a2472059bb9b9b631d86ad162bc3b09  s2-10/seeded/work/seed/lib.mjs
4b4f7ee058d11d8096cf3ce8ee54dea225d16439c08a59c50807ec2a969908c2  s2-10/seeded/work/seed/manifest.json
dab22441f4f6e79abfa4bd2211391e3c124cdf4ee3de048acc047ce980986a4f  s2-10/seeded/work/seed/run.mjs
f59e06a6f4232dd929f7d610a4a853fa18f05b3a9b5a1d5a988153978ccb06eb  s2-10/seeded/work/seed/runner.json
3a4f5c9086b769d7bd1cdec0287da42c718865d8f7ccdca9a8dfda24df7fa9bb  s3-01/seeded/bugs.json
19f1d3abdc574f25af25e05fea635e618e4de112fe21540492aa1ba189b5b3f9  s3-01/seeded/grades/1a411e3.json
222d3ce20596f464f2829bd95703b1684072e6bb3d1e80ce81dc48294bef1b40  s3-01/seeded/grades/98ee2b0.json
ee5f91386ce1c44eaa1f6d9feb2e115b3b8f038d28481e7a84bd29896a3390b1  s3-01/seeded/grades/a3035cf.json
fb7369342bfa2001e30a221ea54aa1198d8b37d2d4846792319d542e6ba0e651  s3-01/seeded/grades/ccf7001.json
ea3ff87f89d53d5d16d93faa672553f18be1df257d2690a1536d71b1c5e5976b  s3-01/seeded/kills.json
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s3-01/seeded/logs/1a411e3-1.log
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s3-01/seeded/logs/98ee2b0-1.log
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s3-01/seeded/logs/a3035cf-1.log
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s3-01/seeded/logs/ccf7001-1.log
6222ec1aa6ee8d37c01e681d697497cf17ad5b9b5235c497999cc85179092f22  s3-01/seeded/oracle/a3035cf-T10.test.mjs
a4dc6f029bcf396ec2c839f5d091ef70275c59a4770638e0a05e9871238bc902  s3-01/seeded/oracle/a3035cf-T11.test.mjs
4d6bbc45f5322f74f912cd6352409e3abfd9c1f4d7e4b381667a6075953b15a0  s3-01/seeded/oracle/a3035cf-T12.test.mjs
2423abaee0d8cd9169f6366a1cab544b18fa694686c6b364bf3e3658004e9e70  s3-01/seeded/oracle/a3035cf-T13.test.mjs
63bd442c689668eca98a3b8ff7f3d8daba7366d4d141289b63308975c3253099  s3-01/seeded/oracle/a3035cf-T9.test.mjs
71a43865c86f66aac93d9acec3221b57a474246f0b9f1c73d38130cb4361ca26  s3-01/seeded/oracle/manifest.json
6123dcf8bed0606397d3eeffc947ab59b96d03e8c9bd314c7105b2b8b43315db  s3-01/seeded/oracle/runner.json
83ed1596329ec1410ee2836bf4ea895935a61de1df7c87d7ec671c811da9aae0  s3-01/seeded/oracle/support.mjs
fbf5489f9ef80ae53d8c459aedc46a9c2d9e32d27fded3b20d1a8aa39b544cdc  s3-01/seeded/validation-a3035cf.json
43d1b92eb6f19f19a005ea11b1cab6e938b78422bf1070dd4e67a7ee8036f71d  s3-01/seeded/work/seed-settings.json
fef198d2a5947e8b48222155365dd2307863ef1aece267114e71010f3c14fa9b  s3-01/seeded/work/seed.prompt.md
ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d  s3-01/seeded/work/seed.reply.md
9b50a17cda1410eeee4c74fa454641e6ccdc04e1084ec6b39db2cecdf8eadc88  s3-01/seeded/work/seed.reply.md.run.json
6222ec1aa6ee8d37c01e681d697497cf17ad5b9b5235c497999cc85179092f22  s3-01/seeded/work/seed/a3035cf-T10.test.mjs
a4dc6f029bcf396ec2c839f5d091ef70275c59a4770638e0a05e9871238bc902  s3-01/seeded/work/seed/a3035cf-T11.test.mjs
4d6bbc45f5322f74f912cd6352409e3abfd9c1f4d7e4b381667a6075953b15a0  s3-01/seeded/work/seed/a3035cf-T12.test.mjs
2423abaee0d8cd9169f6366a1cab544b18fa694686c6b364bf3e3658004e9e70  s3-01/seeded/work/seed/a3035cf-T13.test.mjs
63bd442c689668eca98a3b8ff7f3d8daba7366d4d141289b63308975c3253099  s3-01/seeded/work/seed/a3035cf-T9.test.mjs
b83d6e20ab8a026c346d25073c7d8ef8d530a62499b99eb58ffd4f2f37499bf3  s3-01/seeded/work/seed/manifest.json
6123dcf8bed0606397d3eeffc947ab59b96d03e8c9bd314c7105b2b8b43315db  s3-01/seeded/work/seed/runner.json
83ed1596329ec1410ee2836bf4ea895935a61de1df7c87d7ec671c811da9aae0  s3-01/seeded/work/seed/support.mjs
296629eaefac5d2ceeeb62ff49ce63ddd723ceb6e858b977d939e10c832e6efd  s3-02/seeded/bugs.json
b5130b2472fd0c973ffc1ffa06fd6a1b7e03eb16485d1b38a833890436a7b847  s3-02/seeded/grades/14a1780.json
903f50b408fae5bb54b3c7e5098362f193473b251ecb3187365d86a982b9b755  s3-02/seeded/grades/906f6b5.json
dbfe527efa1e9e369390b4b40c213642c885eb7b0a682590faafe8097be21e4d  s3-02/seeded/grades/c91a35f.json
e4ade34fdc6ace3904e063d5caada44c394bf81edbafb3212fc73ab6b77baee2  s3-02/seeded/grades/d35020a.json
20645e38dee3e4ec18657deb3c40d8e80ed5a6d475f9638ddb9ff17e5ec2bd41  s3-02/seeded/kills.json
f2eaccc48ead6d96bd6c834a1e6fa01bd55d073fbc05a1c57add679bd4c9812b  s3-02/seeded/logs/14a1780-1.log
6ba1a8b34f18f70cc6f1f630dee27510d7d73b3c7bc83cd255db014ac126762b  s3-02/seeded/logs/906f6b5-1.log
bcd5d310d0ea1de159e3fc69a7f33527618f9ffc5b1f6f981963e47bd41e1a87  s3-02/seeded/logs/c91a35f-1.log
d8c68169dc737dd85be2c1c0af71bbd6bc6a52cd96643f553e2c9e2e3a0ed84f  s3-02/seeded/logs/d35020a-1.log
1fef446c36fb15d0d4f0909835d988db05b17a30ce42b4309a253d9f2ccd215b  s3-02/seeded/oracle/14a1780-T10.rs
c9bdcc4ca6dd6d7d04322467794997ce15adb30f73f14bc1f6dc6a86ed2215d5  s3-02/seeded/oracle/14a1780-T6.rs
7bcb6bd9041bac197b3cc853192690e8d6b6ce027eac69112234e375d9a4ac3f  s3-02/seeded/oracle/14a1780-T7.rs
9a64a4665a17ab49be0f79d86eea1c418f2e3971d37189e1818cb14beb52a301  s3-02/seeded/oracle/14a1780-T8.rs
fad9326b4ff04c09548c487f8883b74813dcc07fa2c5be031c16bd8a2daa8166  s3-02/seeded/oracle/14a1780-T9.rs
d3270634331ed9439c33e8055fc81782d78eabab473b6acf1ddaa8a29c166836  s3-02/seeded/oracle/manifest.json
30ffdfcbf2640c0b8c0d98cea798c75d1c324b3245cc6e63388a6bb5b8639f2c  s3-02/seeded/oracle/run.sh
6c6312b9e328ca6f9992cb8308000582f23a6f0de7cbef4014915aa4c78d3809  s3-02/seeded/oracle/runner.json
d4fabafee4801921705ebc3b079b57b4593ec36eab2690a7bacd933309e1031c  s3-02/seeded/validation-14a1780.json
0bf88dee279ecf78e206b814f64edaec707b668e5a87aeebf4ba3a4a8ca4ef86  s3-02/seeded/work/seed-settings.json
6b0807ab764af778b044022405e5445144d010f069725a174375f8b965abce0f  s3-02/seeded/work/seed.prompt.md
ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d  s3-02/seeded/work/seed.reply.md
44f30f3885dfb02b66933ec69e19750a27f39952b515609a5ba307c4926e0912  s3-02/seeded/work/seed.reply.md.run.json
1fef446c36fb15d0d4f0909835d988db05b17a30ce42b4309a253d9f2ccd215b  s3-02/seeded/work/seed/14a1780-T10.rs
c9bdcc4ca6dd6d7d04322467794997ce15adb30f73f14bc1f6dc6a86ed2215d5  s3-02/seeded/work/seed/14a1780-T6.rs
7bcb6bd9041bac197b3cc853192690e8d6b6ce027eac69112234e375d9a4ac3f  s3-02/seeded/work/seed/14a1780-T7.rs
9a64a4665a17ab49be0f79d86eea1c418f2e3971d37189e1818cb14beb52a301  s3-02/seeded/work/seed/14a1780-T8.rs
fad9326b4ff04c09548c487f8883b74813dcc07fa2c5be031c16bd8a2daa8166  s3-02/seeded/work/seed/14a1780-T9.rs
ae5516b1ba47b82e9b75b5438ebdb12b7cddf5eda6c0e90524d5b261a65bcbac  s3-02/seeded/work/seed/manifest.json
30ffdfcbf2640c0b8c0d98cea798c75d1c324b3245cc6e63388a6bb5b8639f2c  s3-02/seeded/work/seed/run.sh
6c6312b9e328ca6f9992cb8308000582f23a6f0de7cbef4014915aa4c78d3809  s3-02/seeded/work/seed/runner.json
b2a4b6f7d413364c9bb55e9e62539f26f430b1f86aefc71cead15acede44dec5  s3-03/seeded/bugs.json
92fac35ba1ced960fcbbb2d76ea5b35977e9958055ce90fea54803f84a571fe9  s3-03/seeded/grades/37b4a66.json
d4a9ca4cd2340475b62063bb0441a5d37e928ac9055c3aaae4eb917dfb6ffc46  s3-03/seeded/grades/5ca3904.json
abe6dcaa6e6209e61f16ab1e646076b9362ace009adec9b0844aa834cfb3735f  s3-03/seeded/grades/9d5a15d.json
f373f776c6bff6473e7914f8c9490270a12532b9717e5af7755aeb0da1ecdc9c  s3-03/seeded/grades/f6fb858.json
a1f6f5218d8b3942d31f65e749913cad8a730b26811d1891214cd96b225767a4  s3-03/seeded/kills.json
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s3-03/seeded/logs/37b4a66-1.log
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s3-03/seeded/logs/5ca3904-1.log
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s3-03/seeded/logs/9d5a15d-1.log
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s3-03/seeded/logs/f6fb858-1.log
c47c2b2e1a8d272e5d50386f800e2529807a01e2c12c870205235dd37921f28d  s3-03/seeded/oracle/9d5a15d-T4.sh
4569bbbce6f84272ee896f152a93ff4edea5fea983bced77a930fa78320720e1  s3-03/seeded/oracle/9d5a15d-T5.sh
ea5915ba7b813ed721d0adfa5cb4fddb92fd040d65aaa9e5e6938a4491267b08  s3-03/seeded/oracle/9d5a15d-T6.sh
4ed7cc19440be3c9b070970a5f16d623359f593c73b2d08b3db66352839882c9  s3-03/seeded/oracle/9d5a15d-T7.sh
0a3050872c1b78716f8744443be27407dc2805a92c1d2c648169f380c25482dd  s3-03/seeded/oracle/9d5a15d-T8.sh
e74f8b38d6eefaa19b807af0a89fde20b7b310a1903d0cfce966916a6b395f43  s3-03/seeded/oracle/common.sh
5c234c9608c4909b8d1eaee806d5664fa99f4fe13e36e1fc2a478f036cd7e0a6  s3-03/seeded/oracle/manifest.json
62b331a811fd6009bea86f2482597806791725b6f08ffffe4ef7636c32241914  s3-03/seeded/oracle/run.sh
d20c17b14ae14a302e080bed58ea320508ef15f643d52849a95b1916dc3c04b3  s3-03/seeded/oracle/runner.json
2bb320e9bd471a2cde94e5c1de653909f36d3c819dfaef50493b3e831591099f  s3-03/seeded/validation-9d5a15d.json
1a077443764ff0559e2e0d75bf275a0dbf7cbe10b9bc8780e3c8883920334f2d  s3-03/seeded/work/seed-settings.json
5799a8362c89158d8c90cba89807185f5ed357fe467c4211ee26477e748fcc74  s3-03/seeded/work/seed.prompt.md
ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d  s3-03/seeded/work/seed.reply.md
d250a9ac86ee5819698eb60c16bcbda8beabf0c3a2c7393eb6409fd32725c319  s3-03/seeded/work/seed.reply.md.run.json
c47c2b2e1a8d272e5d50386f800e2529807a01e2c12c870205235dd37921f28d  s3-03/seeded/work/seed/9d5a15d-T4.sh
4569bbbce6f84272ee896f152a93ff4edea5fea983bced77a930fa78320720e1  s3-03/seeded/work/seed/9d5a15d-T5.sh
ea5915ba7b813ed721d0adfa5cb4fddb92fd040d65aaa9e5e6938a4491267b08  s3-03/seeded/work/seed/9d5a15d-T6.sh
4ed7cc19440be3c9b070970a5f16d623359f593c73b2d08b3db66352839882c9  s3-03/seeded/work/seed/9d5a15d-T7.sh
0a3050872c1b78716f8744443be27407dc2805a92c1d2c648169f380c25482dd  s3-03/seeded/work/seed/9d5a15d-T8.sh
e74f8b38d6eefaa19b807af0a89fde20b7b310a1903d0cfce966916a6b395f43  s3-03/seeded/work/seed/common.sh
ba5552cd1a4198cd958ea24abdbcd4a7fbfaa38ecac08bc0c87e017848169a64  s3-03/seeded/work/seed/manifest.json
62b331a811fd6009bea86f2482597806791725b6f08ffffe4ef7636c32241914  s3-03/seeded/work/seed/run.sh
d20c17b14ae14a302e080bed58ea320508ef15f643d52849a95b1916dc3c04b3  s3-03/seeded/work/seed/runner.json
bfdbcacd27f4826fc9a9280cf6ca19ce95a40a0737a1e080d36ece3522b1110e  s3-04/seeded/bugs.json
a8d39727cf432935728ecc7a1f185f47d76b9cbd5c0a518ca073a322a3fff263  s3-04/seeded/grades/22ba83d.json
f176ce3ae205a06c3922a2b64904ad5f85cc80ee19c7ad9ca766bd94e427c0f3  s3-04/seeded/grades/2a40fc3.json
de7ab32c3da05e561e3a134d91ac80ad14f3f9d77108dde31672c00676124bd9  s3-04/seeded/grades/b5ba3b6.json
0893bcbf6b04d8c92a7b7caeec03ce8df9e95fffa4053e16978e3b659648a959  s3-04/seeded/grades/fbc05bf.json
c6b47aae5bd455c55fd00512491ea0e254d1163b20abb607fbe507581da3aba7  s3-04/seeded/kills.json
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s3-04/seeded/logs/22ba83d-1.log
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s3-04/seeded/logs/2a40fc3-1.log
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s3-04/seeded/logs/b5ba3b6-1.log
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s3-04/seeded/logs/fbc05bf-1.log
d1da3a3708dd305f63d7451bb7df1fdaff69155025730fcf0ac855a8d86da3a0  s3-04/seeded/oracle/22ba83d-T5.mjs
fb92aef2ce779a302183295d36e71ca8f95696a57ce0904c08f3c85d46a1d788  s3-04/seeded/oracle/22ba83d-T6.mjs
2ecc8c34219f04df4be3e8921ef64bcc4ead20c934d8519e4b75d700a0e5539e  s3-04/seeded/oracle/22ba83d-T7.mjs
067ddce3aad36b8d8ed55509d6eeabb4d11c29fface6cbf53e044465712d6bec  s3-04/seeded/oracle/22ba83d-T8.mjs
d2515cebabecf62dfdf238f3ac52c68dffad8ce2a7fbfe46f62209b3cf079d77  s3-04/seeded/oracle/22ba83d-T9.mjs
883086e733a5a238ad7299b6544cd946744bbdd27bb2bacccc54d998261db66c  s3-04/seeded/oracle/manifest.json
b4dfb7d85490c7e596081bc2edac134a9b197ccf403ec6e9cfd20f93a2fa8770  s3-04/seeded/oracle/run.mjs
8b3480e535ce3bb7b901aaa33b9ce236ecb7bad03f8a1c2f36bd851e4c76f339  s3-04/seeded/oracle/runner.json
9a5514ca8c7dfb8efc49445c658d57268743045e97e5f319068e57ea736447e3  s3-04/seeded/validation-22ba83d.json
dea489700ce73e7ace289f0f1599319d12296e318d6ac855de246df0e0bf1c9c  s3-04/seeded/work/seed-settings.json
ada582d3170da4da18c0f59ca89a5d0e3d18032418589bdd19c2fe65d35be6e0  s3-04/seeded/work/seed.prompt.md
6161476fd859355c58a56ad53bd1359208c4c49023b36553d66c874f3c74e754  s3-04/seeded/work/seed.reply.md
472ee9c6f49fa3c5007abd840fe4cf63c1d9060f873750220b1c5b27a977a57c  s3-04/seeded/work/seed.reply.md.run.json
d1da3a3708dd305f63d7451bb7df1fdaff69155025730fcf0ac855a8d86da3a0  s3-04/seeded/work/seed/22ba83d-T5.mjs
fb92aef2ce779a302183295d36e71ca8f95696a57ce0904c08f3c85d46a1d788  s3-04/seeded/work/seed/22ba83d-T6.mjs
2ecc8c34219f04df4be3e8921ef64bcc4ead20c934d8519e4b75d700a0e5539e  s3-04/seeded/work/seed/22ba83d-T7.mjs
067ddce3aad36b8d8ed55509d6eeabb4d11c29fface6cbf53e044465712d6bec  s3-04/seeded/work/seed/22ba83d-T8.mjs
d2515cebabecf62dfdf238f3ac52c68dffad8ce2a7fbfe46f62209b3cf079d77  s3-04/seeded/work/seed/22ba83d-T9.mjs
b4e5d49265bc1140de2892f6dff59b3b235f18086fbc1aa325d1105ba7cc7de6  s3-04/seeded/work/seed/manifest.json
b4dfb7d85490c7e596081bc2edac134a9b197ccf403ec6e9cfd20f93a2fa8770  s3-04/seeded/work/seed/run.mjs
8b3480e535ce3bb7b901aaa33b9ce236ecb7bad03f8a1c2f36bd851e4c76f339  s3-04/seeded/work/seed/runner.json
0fa9757b46ba758b80ae8cce9c7f544897d0c4f661f6eff4b4e6cf291c192f36  s3-05/seeded/bugs.json
c7897e1870f1994a8fefad98b5eba62540357545cc4242721800daecf7a8144c  s3-05/seeded/grades/180eaaf.json
20255ab609de57775d19b9048bdad6d15aa25ad28382ca8a88dfe8b7464e6bc9  s3-05/seeded/grades/2baffe5.json
67a664894634a017b0c781e4925fd2ac2bc73c730aa7a93f835d5d8b8650bbf4  s3-05/seeded/grades/2d6f593.json
3a84867c46289b215d84fec8cbaac31547cecdc35f70db6a58b891e32f54987f  s3-05/seeded/grades/68f3149.json
9252ef7625fa0bb57c5b7d17e2dc48db47842bfdabb3e3cc6efb3f3018aca529  s3-05/seeded/kills.json
0d4b8eef96341aec3d3f6358de017e8a46d381b23a132a93ce2bc5c3aedac793  s3-05/seeded/logs/180eaaf-1.log
7b6d46dcdd97432ba9c06edcd306d6b897819289962a56ac49e6f05a823d8df3  s3-05/seeded/logs/2baffe5-1.log
dd90a3b664f0304667d202bd87e0bf3eaf6a9be8f316315f923547ffe68e4878  s3-05/seeded/logs/2d6f593-1.log
1ab83f673927533b67674ee3355fc02c77286b37dd65d12e1178127fb5077810  s3-05/seeded/logs/68f3149-1.log
53d603ab8a845212346d0469e9ab9e5389c7345d24b637f267645093c21932f8  s3-05/seeded/oracle/180eaaf-T11.py
23d0ab301942c1b6c6017cf8d1e31136ab4018cbdb177ed32c2617c38f6a53d4  s3-05/seeded/oracle/180eaaf-T12.py
86560f09485f1e59fc430a87043926183044f95ca1d5cb9549584b81f5ebc2da  s3-05/seeded/oracle/180eaaf-T13.py
9db216bfee08ede2c898766b57bedb090adfb644f537e069fb6d82e6d34b3e4a  s3-05/seeded/oracle/180eaaf-T14.py
9aa7b9d1e03d0918ec17bb9d66a0f04e82c7c39d2436c843dce21ea5510aedfa  s3-05/seeded/oracle/180eaaf-T15.py
f1e08541fb639e79a00ee12e7b9caacd71163f056af9c84ee35af452050eea51  s3-05/seeded/oracle/manifest.json
7ba3ff64d51757b0840e7a76c5c742cbf1fb1d46b578fc347cf735460ddf8108  s3-05/seeded/oracle/oracle_support.py
efc7a520c2155f2dfe8c4e59287263413b60fb6cc7456bee1244f2aec895118f  s3-05/seeded/oracle/run_checks.py
9b72a2598128fbc1ac08a3a5c757d5a7a986da9407d4526728cc7c52ab690f0c  s3-05/seeded/oracle/runner.json
79494f81624c6a8b5125cf3c7227716ad1d12c2646296cf92dc58961ada740e5  s3-05/seeded/validation-180eaaf.json
638e59505e048beca88b0cf3932302ec8358a93c0184aac507007cbdc615ca19  s3-05/seeded/work/seed-settings.json
7e4010629c8a161e7ed5bd5cb4b4eee9599133a073a4ae2f4e2c2abf7b32b287  s3-05/seeded/work/seed.prompt.md
ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d  s3-05/seeded/work/seed.reply.md
9c708e822b7b4e3911298b56f9317331cf27cebb50944c03173c27e81811ce7b  s3-05/seeded/work/seed.reply.md.run.json
53d603ab8a845212346d0469e9ab9e5389c7345d24b637f267645093c21932f8  s3-05/seeded/work/seed/180eaaf-T11.py
23d0ab301942c1b6c6017cf8d1e31136ab4018cbdb177ed32c2617c38f6a53d4  s3-05/seeded/work/seed/180eaaf-T12.py
86560f09485f1e59fc430a87043926183044f95ca1d5cb9549584b81f5ebc2da  s3-05/seeded/work/seed/180eaaf-T13.py
9db216bfee08ede2c898766b57bedb090adfb644f537e069fb6d82e6d34b3e4a  s3-05/seeded/work/seed/180eaaf-T14.py
9aa7b9d1e03d0918ec17bb9d66a0f04e82c7c39d2436c843dce21ea5510aedfa  s3-05/seeded/work/seed/180eaaf-T15.py
e7c42b8604f5986209856b00e6ba7eff9b51a40563cf890b368360fa9c5d5ca3  s3-05/seeded/work/seed/manifest.json
7ba3ff64d51757b0840e7a76c5c742cbf1fb1d46b578fc347cf735460ddf8108  s3-05/seeded/work/seed/oracle_support.py
efc7a520c2155f2dfe8c4e59287263413b60fb6cc7456bee1244f2aec895118f  s3-05/seeded/work/seed/run_checks.py
9b72a2598128fbc1ac08a3a5c757d5a7a986da9407d4526728cc7c52ab690f0c  s3-05/seeded/work/seed/runner.json
ccfcc4b31321e933f9b79f80ea2b8240263007cc3cba4a99c8ecf647825a522d  s3-06/seeded/bugs.json
7d303fcf3d5862723add90b143f53165a9f067647826ba065384c4ed7f60bed4  s3-06/seeded/grades/4a346c0.json
702376c6b3f2ce33bfb8e1896e6c5b8e75490b485eedf04199fd9d940a41eb6c  s3-06/seeded/grades/73d4686.json
c4ccd45339261a1244067afa8160ce44686e49de0f4aadd8efa64dd8e9928154  s3-06/seeded/grades/777ea50.json
65ea5ba8a0adc995b7a158f74ffeab8171d295202470f3b15510a9eeed78fe4d  s3-06/seeded/grades/cf57e66.json
788fec2803fc6eed128bf48a7bd5396d9e31e21ba1eab2a1c9829765e205a827  s3-06/seeded/kills.json
2a0321c9f56b5afc0f6dd381b88a794131835bd19c33da9140e575889769716a  s3-06/seeded/logs/4a346c0-1.log
208715330cb64c7b35c00104838cfd7dc271bcf754e3a28f559ea74dbda29390  s3-06/seeded/logs/73d4686-1.log
07b8a91963df7365bda7513e1a91174c4644586338fc32e6c8ec92fa6cb2cd6e  s3-06/seeded/logs/777ea50-1.log
6c9c97bc5fce3231b957f2d4fd7ad7719ad0ff6a5866bed501ecaca96062e527  s3-06/seeded/logs/cf57e66-1.log
3c253853e8d8c580846ec85fda552ba1723b74e78d1778c7db1aa931aa28964e  s3-06/seeded/oracle/73d4686-T24.py
5a322e4a0dfd5b5e150363e0342c094ea7f15198c080f27bf8cea8c8fdc79ac3  s3-06/seeded/oracle/73d4686-T25.py
5e7e17d623a45e692267a88e16644b707e8f1e5ba7ec1c7102e684670d98449f  s3-06/seeded/oracle/manifest.json
bed50db03589d93a08fd34e29fbb34d005e741f282de065eb4bb2470273e8a8d  s3-06/seeded/oracle/rewrite_junit.py
66b74dfff2b0e709ea888e421339d6e57f55903ac85bd8def478098270068d64  s3-06/seeded/oracle/runner.json
0adba2b4c230fdf70888808ecdc826f9627912a9f804adb3bab40631f944626e  s3-06/seeded/oracle/sandbox_config_checks.rs
2c366d01c5a238d63accbf2beaec47a7f6b9630de4a0bca9fc65eb5597240ab2  s3-06/seeded/oracle/sandbox_engine_checks.rs
076c9480d90c0d5473b805bf025eba820bf75d8f63ca2cd7cf1557f5dc554670  s3-06/seeded/validation-73d4686.json
ca2efb50bd86664d54f2079eddbace26a00c86d0f5bee0bbaac043fd97fe70e9  s3-06/seeded/work/seed-settings.json
bd7129ec65e749a12d36e0541c30faaaa6e143b03e4dc4714e3f4c495f09effa  s3-06/seeded/work/seed.prompt.md
ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d  s3-06/seeded/work/seed.reply.md
e596806de82e190f1152fc616b8cebcff41283356eb7f00e1ccfdba85fd35f17  s3-06/seeded/work/seed.reply.md.run.json
3c253853e8d8c580846ec85fda552ba1723b74e78d1778c7db1aa931aa28964e  s3-06/seeded/work/seed/73d4686-T24.py
5a322e4a0dfd5b5e150363e0342c094ea7f15198c080f27bf8cea8c8fdc79ac3  s3-06/seeded/work/seed/73d4686-T25.py
bf604a4e511d1c2b060c2ca987b703d45a5c02679e20401ef7c51febddcd06ce  s3-06/seeded/work/seed/manifest.json
bed50db03589d93a08fd34e29fbb34d005e741f282de065eb4bb2470273e8a8d  s3-06/seeded/work/seed/rewrite_junit.py
66b74dfff2b0e709ea888e421339d6e57f55903ac85bd8def478098270068d64  s3-06/seeded/work/seed/runner.json
0adba2b4c230fdf70888808ecdc826f9627912a9f804adb3bab40631f944626e  s3-06/seeded/work/seed/sandbox_config_checks.rs
2c366d01c5a238d63accbf2beaec47a7f6b9630de4a0bca9fc65eb5597240ab2  s3-06/seeded/work/seed/sandbox_engine_checks.rs
37c1ba29e90bea70c985e6c8afc91c5fd2b09946684849b7eb83c2a8403c3dd5  s3-07/seeded/bugs.json
e1c1b8f81e0d9e367feccafc137f547add7c2b3c42322efa910876a10e35d54c  s3-07/seeded/grades/2e34dfe.json
5d46d81a92a4855cd81a59b4bbbfa91c5ce2cea916692e7482a2dfaa00137cea  s3-07/seeded/grades/54dbabd.json
1b65b06703a6a777db29aa138a2c2a3708ec7237b3d0814d2aabfaee0239c98b  s3-07/seeded/grades/a70f2a2.json
c003d690aa5de5311b0cb36fa4341914b9789b125d2f3167fc425fe2d2687631  s3-07/seeded/grades/c5468d5.json
fb02ce02a3f38b29ffbe778512d921cfeb9723cbe3cfffc2a82d97b959a0938c  s3-07/seeded/kills.json
c87ab72063b9d48bd4a9f6a7c76d764438d909883ecf9bf576dc5a247876d183  s3-07/seeded/logs/2e34dfe-1.log
5bff99cbfbeb4250779d90f023f37693aee67cef19abdc4404708e246e78c47d  s3-07/seeded/logs/54dbabd-1.log
8bcbd0d828b82d22a2b86bf802da61856d958c6907a3738ed3f8369423557a43  s3-07/seeded/logs/a70f2a2-1.log
35db55c65cc5bf30907a60e78a260f3e7de6860ef7367073462b68834070bbf1  s3-07/seeded/logs/c5468d5-1.log
68e435c279c7579e148a162a45486d50ddddb9c0b5596c6e683e53cf23ba676e  s3-07/seeded/oracle/c5468d5-T2.py
954e02469ed398bbbaf173f9bd51a29747e2c4e7f891cb90429ea962440dccc7  s3-07/seeded/oracle/c5468d5-T3.py
aff7d93e5ace6f70a657352fc4d596b45f80a1ebf7cd7627405f95c64a51f2f2  s3-07/seeded/oracle/c5468d5-T4.py
7340411024987f4ec4495b2f9d888441cc19ac14a443e6ff09b25e2dfc0ec48f  s3-07/seeded/oracle/c5468d5-T5.py
e04e225ef8a04215c9fb2c640cb3a0514a52a65cb6f9127ddf675f8fde8fe14f  s3-07/seeded/oracle/c5468d5-T6.py
a9d74133f526660d25b6588dab9dfb1bd97ee246e2a25df096f763dc4de98619  s3-07/seeded/oracle/manifest.json
8250d20f42b419af40706490ead78aabab9feba93eab09a3f626e3de5256e1f4  s3-07/seeded/oracle/pytest.ini
77ec9d885ca5d5dfdfce1ac21be8988ab7ae6b3a1d57bb0858a5f6781b8355fa  s3-07/seeded/oracle/rewrite_junit.py
c81a454ba369f2791f9d4df9e717a18d1b36f595fe7d8a8b724d8d2193e5de39  s3-07/seeded/oracle/runner.json
2ef5fcd0d18452b8c9739f2d94431b3a2276f4a4c2f6cf8d5f7479556380fd50  s3-07/seeded/validation-c5468d5.json
f47d537028612bc9e266c412494a6844d4f19e1c2b0a6d07e40a0fdf320cdf08  s3-07/seeded/work/seed-settings.json
054730a6dc777af542b6a3b60ba15f251134f189358a6e8f95de47f25dddae85  s3-07/seeded/work/seed.prompt.md
31759f8d8a75d6af6ad56441e18589dea8f3472adf5e7fe0d2bbabef5975c827  s3-07/seeded/work/seed.reply.md
323f2d8ec23d5bc946102f717556c4927b9874eadac3a5774e68f8e5935af8ea  s3-07/seeded/work/seed.reply.md.run.json
68e435c279c7579e148a162a45486d50ddddb9c0b5596c6e683e53cf23ba676e  s3-07/seeded/work/seed/c5468d5-T2.py
954e02469ed398bbbaf173f9bd51a29747e2c4e7f891cb90429ea962440dccc7  s3-07/seeded/work/seed/c5468d5-T3.py
aff7d93e5ace6f70a657352fc4d596b45f80a1ebf7cd7627405f95c64a51f2f2  s3-07/seeded/work/seed/c5468d5-T4.py
7340411024987f4ec4495b2f9d888441cc19ac14a443e6ff09b25e2dfc0ec48f  s3-07/seeded/work/seed/c5468d5-T5.py
e04e225ef8a04215c9fb2c640cb3a0514a52a65cb6f9127ddf675f8fde8fe14f  s3-07/seeded/work/seed/c5468d5-T6.py
f381de984ef3da2cacd2c1c3e48b746bbf5ad1a0254340ee08dc3f3f3f44dfed  s3-07/seeded/work/seed/manifest.json
8250d20f42b419af40706490ead78aabab9feba93eab09a3f626e3de5256e1f4  s3-07/seeded/work/seed/pytest.ini
77ec9d885ca5d5dfdfce1ac21be8988ab7ae6b3a1d57bb0858a5f6781b8355fa  s3-07/seeded/work/seed/rewrite_junit.py
c81a454ba369f2791f9d4df9e717a18d1b36f595fe7d8a8b724d8d2193e5de39  s3-07/seeded/work/seed/runner.json
763f61ea48615a0e75c6839102f620a7855886e1fe504a513bde3b1ba253946c  s3-08/seeded/bugs.json
20773a782e9dc7607b9c30d5dc61a4502f70dcc6cc391eca133d64a58f0d7cc5  s3-08/seeded/grades/821583a.json
e0aed8b0576fb94c4a1742855c733d443d8ed7b599f701a9b36aaec8bcbee510  s3-08/seeded/grades/a2c2ccd.json
9586822ee65fdb8cdc26e78540d880a1fada7577b73b082ec17b3cbe892469d7  s3-08/seeded/grades/d29cb63.json
1fb534bc1bc969fe7fa2f9c768b718eaaae65b98c5c5802c9af2694fa6a8dfba  s3-08/seeded/grades/d30f6c8.json
5ec59b865fd369251666cce514d35852238d1519b01a5123c1890dbf3eabe975  s3-08/seeded/kills.json
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s3-08/seeded/logs/821583a-1.log
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s3-08/seeded/logs/a2c2ccd-1.log
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s3-08/seeded/logs/d29cb63-1.log
c3f53f5f05e869190dd9bfa5260fe91168e67b4498424505500694a6d14e57e8  s3-08/seeded/logs/d30f6c8-1.log
779e9c43ed67c7f5f89a11deb0fe8d18a15729d69a6aa4198b44ab57e903c9fa  s3-08/seeded/oracle/d30f6c8-T10.py
23eba3059f6faf00a4a9d821b1d73c282312a02e938ec65d87118c931d2f8f33  s3-08/seeded/oracle/d30f6c8-T6.py
81c0003d5bf72dc459ff2e36d47b18ee80a649321d1c250cb6591b46f64fd686  s3-08/seeded/oracle/d30f6c8-T7.py
be0a6bc95228d03429396c9621acdd97658646b81f97abb052f17f69a425a6fb  s3-08/seeded/oracle/d30f6c8-T8.py
1a09b316688f860a2188622dfe75930316a734d511e9b56ac7598cfbd604b5bf  s3-08/seeded/oracle/d30f6c8-T9.py
abb2d8a24ab21f448e172b3ca0a631c325545add0eb8db565b733ec86fd175e4  s3-08/seeded/oracle/harness.py
59e7d834e6211e8b157693b7f018e77f338703ac6c7ed3b415d9d8a013e97778  s3-08/seeded/oracle/manifest.json
779c7d950ec79ac11f471ce0c0eba169c5c46a3ce6ec75788ee4b8039cbb4ad5  s3-08/seeded/oracle/run_checks.py
930d321b59169db1c36196a11b301b8d64320418d0b251a10bc72cb088527658  s3-08/seeded/oracle/runner.json
fa1e649744ce9a9abe999d8dd9731ba48ca7d184205aed832cf261fafa5af107  s3-08/seeded/validation-d30f6c8.json
b9cc1853ac5a26919999e863eaf1d2c063d460c4398b035249a263d9c1eb12f2  s3-08/seeded/work/seed-settings.json
58dd0890a082a6c5d75c3eb342b15908b505702c63dc4e64e2168475ea5067e3  s3-08/seeded/work/seed.prompt.md
ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d  s3-08/seeded/work/seed.reply.md
feee486509633baa1744ecbe5c7a4b3de1e9ff420d2f56927d52e467c5bf8c29  s3-08/seeded/work/seed.reply.md.run.json
779e9c43ed67c7f5f89a11deb0fe8d18a15729d69a6aa4198b44ab57e903c9fa  s3-08/seeded/work/seed/d30f6c8-T10.py
23eba3059f6faf00a4a9d821b1d73c282312a02e938ec65d87118c931d2f8f33  s3-08/seeded/work/seed/d30f6c8-T6.py
81c0003d5bf72dc459ff2e36d47b18ee80a649321d1c250cb6591b46f64fd686  s3-08/seeded/work/seed/d30f6c8-T7.py
be0a6bc95228d03429396c9621acdd97658646b81f97abb052f17f69a425a6fb  s3-08/seeded/work/seed/d30f6c8-T8.py
1a09b316688f860a2188622dfe75930316a734d511e9b56ac7598cfbd604b5bf  s3-08/seeded/work/seed/d30f6c8-T9.py
abb2d8a24ab21f448e172b3ca0a631c325545add0eb8db565b733ec86fd175e4  s3-08/seeded/work/seed/harness.py
3e4c611f7cb561ffff266f7a1d9f973c59a9e5e1e1a285d1be185ef550a09c00  s3-08/seeded/work/seed/manifest.json
779c7d950ec79ac11f471ce0c0eba169c5c46a3ce6ec75788ee4b8039cbb4ad5  s3-08/seeded/work/seed/run_checks.py
930d321b59169db1c36196a11b301b8d64320418d0b251a10bc72cb088527658  s3-08/seeded/work/seed/runner.json
```

## Approval, 2026-11-06

The user approved the build on 2026-11-06 by choosing option 1, merge to main locally, after the proposal to squash: the plan `docs/plans/2026-11-05-bench-seeded-bugs.md` is `stable`, the branch is merged into main as one squashed commit, so the per-bug and per-task `edge` and `severity` of its earlier commits do not enter main (ruling 19 of the build), and main is not pushed. The branch keeps those commits locally. One sealing item the record above misses: the Task 8 reviewer listed the file names of `s1-02/seeded/` once, names only.
