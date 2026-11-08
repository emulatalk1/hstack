# Step 9 lock

Locked 2026-11-08, after every batch of step 9 was answered and applied, the second batch was built and settled, rule (b) was counted again and the stick check of s3-02 was graded (Task 10, the lock). `<data>` = `.evidence/bench` (gitignored, in the main checkout). Plan: `docs/plans/2026-11-08-bench-human-steps.md` (Tasks 1 to 10, status still `draft`: it goes `stable` only when the user approves the build). Rulings: prereg section 12, "Applied at step 9" (rulings 1–11 and the user's decisions of 2026-11-08), "Amended at step 9" (the agent reader, option C) and "Decided at step 9 after the reads" (the decisions on the stopped gates), and the controller rulings listed below. Branch `bench-step9` from `main` (5c67583); the last change to `bench/` or `tests/` is `5513d93`; nothing is merged or pushed.

Every number here comes from one of these sources:

- the count lines of the tools, archived in `<data>/logs/step9/` (`apply.out`, `proxy.out`, `batch2.out`, `split-p1.out`, `round2.out`, `stick-s3-02.out`, `serve-*.out`);
- `bun bench/human.mjs status` at the lock;
- the SDD ledger of this build (`.superpowers/sdd/2026-11-08-bench-human-steps/progress.md`, copied verbatim into `progress/progress.md` with this lock);
- the counts-only scripts of this lock in `<data>/logs/step9/` (`lock-explain.mjs`, `lock-history.mjs`, `lock-counts.mjs`, `lock-usage.mjs`, `lock-hash.mjs`), with their outputs kept as `.out` files beside them, listed and hashed under "Scripts" and "Hashes".

No page, answers file, proxy prompt or reply, history label of an event, note, oracle, manifest text, label or transcript was opened to write this lock.

## Result

- **Every read of step 9 was made by a sealed agent reader, not by a human** (the user's decision of 2026-11-08, option C, taken after the pages went up and before any answer). The reader ran on `claude-fable-5-1`: 25 runs, 0 failed, 0 defaulted, every row answered, 1,523,873 tokens.
- **Four gate lines stopped:** `inputs` 3/4, `rerate-7.2` task-repo 16/20 and external 14/20, `history` κ 0.18. The 7.1 gates passed in every set. The user and the controller decided each stop (below); none led to a new plan.
- **Classifications settled:** 19 of `classify` (build 3, requirement 16) and the 1 of `classify-2` (requirement). The 2 disputed checks of cold-setup tasks stay disputed.
- **One 7.1 drop:** 1 check of the external set (s1-03), `different`.
- **Second batch:** 5 source pairs called `fix` (p1 3, p2 1, p6c 1), 5 commits, 11 checks written, of which 6 are `interface none` and 5 are scored (all p1, `absent-at-base`); its round and split added 5 requirement checks to p1.
- **Rule (b):** 9 of 14 tasks meet it, before and after; p1 rose from 10 to 15. p6c stays at 2, so decision 5 (a seeded bug for p6c) does not apply.
- **The stick of step 8 is not concluded** (the user's decision): it is recorded as not validated. The reader read B- as worse on s3-01 and s3-02; the seeded checks of s3-02 pass on both of B's products (5 of 5, 2 excluded), as they did on B-'s (3 of 3 at step 8).
- **Carry-overs:** the 51 external oracle commands are rewritten (Task 6); the 4 Docker names of the step 8 lock are removed (0 left); the token is still with the user.

## Plan, amendments and the user's decisions, in order

1. **2026-11-08, with the choice of subagent-driven execution** (prereg "Applied at step 9"): decision 1 option A (the user reads; the sampled cold-setup rows are swapped out before any read); decision 2 option (a) (one human against the registered mechanical rule for the interventions); decision 3 option (a) (a local page in the app's preview); decisions 4, 5 and 6 as recommended (every outsourcing session counts and the window decides; p6c gets one seeded bug at step 10 if it meets rule (b); the four Docker names are removed and the token is revoked by the user).
2. **2026-11-08, after the 7 pages went up and with every batch at 0 answers:** "Tự động hoàn toàn bằng agent", every read made by agents (decision 1 option C, which the user had first declined). The servers were stopped before the change (0 up). Registered as "Amended at step 9" before any reader run (commits `4e40b9c`, `5098583`, `5513d93`); the reader code is `560022f`.
3. **2026-11-08, after the reads were applied** (prereg "Decided at step 9 after the reads", commit `55a7100`):
   - **7.2:** "agent không đo được". The 16/20 and 14/20 are recorded as one model against two raters of another, not as a measure of usability. 7.2 usability rests on the step 5 κ/AC1 branch (task-repo κ 0.73, external κ 0.91, both usable). The labels are unchanged.
   - **History:** no gate. This lock reports the tool's and the reader's counts per task with κ 0.18, raw 0.57 and AC1 0.49.
   - **The step 8 stick:** "chưa kết luận", not concluded (the user chose the advisor's recommendation after being asked explicitly). The stick is not validated; the reader's pairs read is a §7.3 trigger candidate that disagrees with step 8 deviation 2; before step 10 the seeded checks of s3-02 are graded on B's two products (done, below), and the fix-the-stick decision is taken before step 10.
   - The controller's ruling on the inputs stop (a plan defect) and the sweep ruling were registered in the same paragraph.

## The reader

- **Model** `claude-fable-5-1`, a model no step 5–8 agent used (the raters, labellers and writers ran on `claude-opus-5-5`). No tools, everything in the prompt, chunks of at most 10 rows (`history` by segment), one rerun on a bad reply and a conservative default per batch (prereg "Amended at step 9").
- **Runs** (`proxy.out`, `round2.out`; `lock-usage.out` from the 25 run records): a `pairs` probe, then `inputs` 1, `labels` 2, `classify` 2, `rerate-7.2` 4, `oracle-7.1` 5, `history` 9, and after the second batch `classify-2` 1. **25 runs, 0 failed, 0 reruns, 0 defaulted**, every row answered; the record of every run names only `claude-fable-5-1`.
- **Tokens:** 1,523,873 over the 25 records (input 50, output 76,543, cache write 1,431,055, cache read 16,225); the 24 runs before `classify-2` are the ledger's "about 1.51M". Run time 18.9 minutes in all, from 11:39 to 12:41 (+07).
- What it saw is exactly what the pages hold (same rows, same blindness, cold swap kept). The seen set below was shown to the agent reader, not to a human. **The user read nothing.**

## Per batch: rows, answers by count, gates and rulings

From `apply.out`, `round2.out` and `bun bench/human.mjs status` (every batch `applied yes`).

| batch | rows | answers | gate | what was ruled |
|---|---|---|---|---|
| `inputs` | 4 (2 per set) | clean 3, leak 1 (task-repo 2 clean; external 1 clean, 1 leak) | `gate inputs 3/4 stop` | a plan defect: external input is the issue verbatim (user decision of 2026-11-02, step 5 ruling 3); the gate passes on task-repo 2/2 and the external leak is recorded as a known property |
| `oracle-7.1` | 50 (fix 40, task-repo step 10) | same 49, different 1, unclear 0 | task-repo 10/10, s1 9/10, s2 10/10, s3 10/10, task-repo-step 10/10, all pass | the `different` check (s1-03) is dropped (`human 7.1`) |
| `rerate-7.2` | 40 (20 per set) | task-repo: agreed requirement → not traceable 16, build → not traceable 2, requirement → traceable 1, requirement → partly 1; external: requirement → not traceable 8, build → traceable 6, requirement → traceable 3, requirement → partly 2, build → not traceable 1 | task-repo 16/20 stop, external 14/20 stop | the user: not measurable by an agent; usability rests on step 5's κ/AC1; labels unchanged |
| `classify` | 19 (20 + p8b 1, less 2 cold) | build 3, requirement 16 | none | ruling 5, into `labels.json` |
| `labels` | 12 | fix 5, not fix 7 | none | the 5 `fix` pairs are the second batch (`step9/batch2.tsv`) |
| `pairs` | 3 | B- worse 2, same 1, B- better 0 (s1-02 same, s3-01 B- worse, s3-02 B- worse) | none (a §7.3 read) | the user: the stick is not concluded |
| `history` | 103 events in 20 segments | below | `history kappa=0.18 raw=0.57 ac1=0.49 n=103 gate stop` | the user: no gate; counts reported |
| `classify-2` | 1 (cold left out 0) | requirement 1 (not traceable) | none | ruling 5 |

Section 12's "Decided at step 9 after the reads" says "three gates stopped (rerate-7.2, history, and the step 8 stick)". The gate lines are four (`inputs`, `rerate-7.2` twice, `history`); the stick is a decision, not a gate. The registered paragraph is not rewritten (step 8 ruling: frozen registrations do not move); this lock is the correction.

### Classifications settled, per set (`lock-counts.out`)

| batch | set | rows | traceable → build | not traceable → requirement | partly → requirement |
|---|---|---|---|---|---|
| `classify` | task-repo (incl. p8b) | 12 | 1 | 6 | 5 |
| `classify` | external | 7 | 2 | 2 | 3 |
| `classify-2` | task-repo (p1) | 1 | 0 | 1 | 0 |

Settled: 20 (build 3, requirement 17), in 11 tasks: p1, p2, p3, p4, p6a, p8b, p8e, s1-03, s1-04, s3-05, s3-06. p8b's answer is recorded and feeds no score (step 6 ruling 7). The 2 disputed checks of cold-setup tasks were left out of `classify` (`build classify: rows 19, cold left out 2`) and stay disputed.

### The 7.1 drop

1 check, external, in s1-03 (set s1, 9/10). Its manifest entry has `dropped: true`, `drop_reason: "human 7.1"`. No task-repo step check was dropped, so no `step.json` changed (the compare below finds none). Every real-estate count of rule (b) equals step 5's except p1's second-batch checks.

## The second batch (Task 8; `batch2.out`, `split-p1.out`, `round2.out`)

- `step9/batch2.tsv`: 5 pairs (p1 3, p2 1, p6c 1, all `later`), 5 commits.
- `oracle write <sha> --batch 2`: `0120e47` 2 entries (both `interface none`, after the `-2` rerun), `0870afc` 0 (after the rerun), `58e8819` 1 (`interface none`, after the rerun), `d67e5b7` 3 (all `interface none`, after the rerun), `dfefaff` 5; 0 refused. Per owner: p1 8 (3 `interface none`), p2 1 (`interface none`), p6c 2 (both `interface none`). 11 checks written, 6 `interface none`, 5 to validate.
- `oracle validate --ids` p1 (5 ids): `absent-at-base` 5, no fixer round, no comparer change. p2 and p6c had no id to validate. No check was `pre-existing`, so the sweep ruling did not apply and `oracle sweep` did not run.
- `oracle classify --round b2` p1: classified 5, build 0, requirement 2, partly 2, disputed 1; κ 0.62, raw 0.80, AC1 0.73.
- `oracle split` p1: partly 2 → 4 halves (weak 2, `absent-at-base` 2), classified 2 → requirement 2, disputed 0, failed 0.
- `classify-2`: the 1 disputed check, read by the agent reader → requirement.
- pgsnap equal around the batch and around the split (`pg-b2-*.txt`, `pg-split-*.txt`, compared again at the lock with `cmp`).
- `p1/validation-dfefaff.json` is a **new** file (no earlier lock hashed it), not a changed one.

## Rule (b) before and after (`round2.out`; `recount --drop p8b,p8b1`)

| task | step 5 lock | step 9 | meets |
|---|---|---|---|
| p1 | 10 | 15 | yes |
| p2 | 39 | 39 | yes |
| p3 | 13 | 13 | yes |
| p4 | 20 | 20 | yes |
| p6a | 11 | 11 | yes |
| p8a | 5 | 5 | yes |
| p8c | 7 | 7 | yes |
| p8d | 5 | 5 | yes |
| p8e | 6 | 6 | yes |
| p5 | 0 | 0 | no |
| p6b | 2 | 2 | no |
| p6c | 2 | 2 | no |
| p7b | 0 | 0 | no |
| p7c | 0 | 0 | no |

9 of 14 meet it, before and after; the set is unchanged and under section 4.1's cap of 12. p1's 5 new scored checks are the b2 round's 2 requirement, the split's 2 requirement halves and `classify-2`'s 1.

## History (9.3; `lock-history.out`)

The tool's labels over every segment (`history/segments.json`; 106 sessions, 0 unparsable lines, 87 segments, 556 events in windows, 258 outside every window):

| task | segments | events | rule 1 | rule 2 | rule 3 | not counted |
|---|---|---|---|---|---|---|
| p1 | 23 | 192 | 165 | 26 | 0 | 1 |
| p2 | 3 | 12 | 9 | 2 | 0 | 1 |
| p3 | 3 | 16 | 13 | 2 | 0 | 1 |
| p4 | 3 | 15 | 12 | 2 | 0 | 1 |
| p5 | 4 | 24 | 20 | 3 | 0 | 1 |
| p6a | 7 | 72 | 65 | 6 | 0 | 1 |
| p6b | 3 | 12 | 9 | 2 | 0 | 1 |
| p6c | 4 | 11 | 7 | 3 | 0 | 1 |
| p7b | 3 | 16 | 13 | 2 | 0 | 1 |
| p7c | 7 | 32 | 25 | 6 | 0 | 1 |
| p8a | 7 | 80 | 73 | 6 | 0 | 1 |
| p8b | 5 | 27 | 22 | 4 | 0 | 1 |
| p8b1 | 4 | 8 | 4 | 3 | 0 | 1 |
| p8c | 4 | 13 | 9 | 3 | 0 | 1 |
| p8d | 3 | 13 | 10 | 2 | 0 | 1 |
| p8e | 4 | 13 | 9 | 3 | 0 | 1 |
| all | 87 | 556 | 465 | 75 | 0 | 16 |

Over the 20 sampled segments (103 events, all answered), the tool against the reader:

| task | events | tool: rule 1 / rule 2 / rule 3 / not counted | reader: rule 1 / rule 2 / rule 3 / not counted |
|---|---|---|---|
| p1 | 72 | 63 / 9 / 0 / 0 | 45 / 4 / 1 / 22 |
| p4 | 2 | 1 / 0 / 0 / 1 | 2 / 0 / 0 / 0 |
| p6c | 3 | 2 / 1 / 0 / 0 | 2 / 0 / 0 / 1 |
| p7b | 2 | 1 / 0 / 0 / 1 | 1 / 0 / 0 / 1 |
| p7c | 4 | 2 / 2 / 0 / 0 | 1 / 0 / 0 / 3 |
| p8a | 11 | 9 / 2 / 0 / 0 | 7 / 2 / 0 / 2 |
| p8b | 1 | 0 / 1 / 0 / 0 | 0 / 0 / 0 / 1 |
| p8d | 6 | 4 / 2 / 0 / 0 | 1 / 1 / 0 / 4 |
| p8e | 2 | 1 / 1 / 0 / 0 | 0 / 1 / 0 / 1 |
| all | 103 | 83 / 18 / 0 / 2 | 59 / 8 / 1 / 35 |

Cross-table (tool → reader): rule 1 → rule 1 57, rule 1 → not counted 18, rule 2 → not counted 16, rule 1 → rule 2 7, rule 1 → rule 3 1, rule 2 → rule 1 1, rule 2 → rule 2 1, not counted → rule 1 1, not counted → not counted 1. **κ 0.18, raw 0.57, AC1 0.49, n 103.** Reported without a gate (the user's decision); the baseline per task is the tool's count in the first table, and whether the tool or the reader reads 9.3's rules better is not decided here.

## The pairs read and the s3-02 stick check

- The reader on the 3 pairs of step 8: s1-02 same (identical diffs), s3-01 B- worse, s3-02 B- worse. Step 8 deviation 2 (the controller and the advisor) judged B- not worse on all three. No human has read the pairs.
- **s3-02 stick check** (`stick-s3-02.out`; the user's decision "chưa kết luận"): `grade env/canary/s3-02.json s3-02/seeded/oracle --at <B product> --sealed` on `bench/s3-02-B-1` (3157600) and `B-2` (9b50306): both `junit ok`, pass 5, fail 0, precondition 0, error 0, **excluded 2**. Step 8 ruling 14 graded the B- products of s3-02 at 3 of 3. On s3-02 the seeded checks pass for both arms, so the instrument does not separate B from B- there. No grade container or image was left (0 and 0).

## The cold swap (Task 7 step 1)

`swap --drop p8b`: `sample-7.1` reproduced yes, rows 40, replaced 7; `sample-7.2` reproduced yes, rows 40, replaced 5; `inputs` reproduced yes, rows 4, replaced 1. The three new lists are `step9/sample-7.1-v2.tsv`, `sample-7.2-v2.tsv` and `inputs-v2.tsv`. The 7 locked queue files keep their step 5/6 lock hashes (the compares below).

## The env fix (Task 6)

`logs/step9/env-fix.mjs` set the `oracle` field of the 27 `env/s*.json` and the 24 external `env/seeded/s*.json` to `oracleCommand(<task>)` of the main checkout's `bench/ext.mjs`, every other byte unchanged: `env-fix: files 51, changed 51` (over two runs; the first stopped at `env/seeded/real-estate.json`, which has no oracle-run command; a third run changed 0). `grep -L no-env-file` over the 51: 0. The plan's "25 env/seeded" is 24 external files plus `env/seeded/real-estate.json`, which runs the host's `oracle.sh` and is left for step 11. Hashes: `logs/step9/env-before.sha256` (27 lines, the `env/s*.json` only; the seeded ones' before hashes are the step 7 lock's) and `logs/step9/env-after.sha256` (51 lines, equal to this lock's hashes of the 51 files).

## Docker and the token (Task 9)

- **Docker** (the user's decision 6): `docker rm bench-ext-fxngq295__app__1-arm-s1-01-B-2`, `docker rmi bench-ext/fxngq295__app__1:bb1762b-arm bench-ext/fxngq295__app__1:bb1762b-serve bench-arm/fw:1`, never `-f`. At the lock: **0 of the four names left**; `bench-ext-` containers 328 (step 8 lock 329), `bench-ext/` images 162 (164), no container with `-arm-` or `grade` in its name.
- **Token: open.** `<data>/arm/box.env` is still present (checked by existence only, never read). The user revokes the setup-token, then `rm <data>/arm/box.env`.

## The seen set (`step9/seen.tsv`, sealed; `lock-counts.out`)

Rows by batch: `inputs` 4, `oracle-7.1` 50, `rerate-7.2` 40, `classify` 19, `classify-2` 1, `labels` 12, `pairs` 3, `history` 103; 232 rows in 27 tasks. Over the oracle batches (`oracle-7.1`, `rerate-7.2`, `classify`, `classify-2`): 110 reads of 82 distinct checks in 24 tasks (task-repo 12, external 12). The plan's 110 reads of 80 checks in 26 tasks were counted before the cold swap; the swap replaced 12 check rows of cold tasks with rows of other tasks, the 2 cold `classify` rows were left out, and `classify-2` added 1. The `labels` rows are 12 fix commits of 6 real-estate tasks; `history` covers 9 tasks. **The seen set was shown to the agent reader only, not to a human.** `step9/seen.tsv` sha256 `f524b3e5fe9e5defea3ffc63f265e21e231a876c54359fca0183b34fb17f6edd`.

## Rulings during the build

The 20 `Ruling:` lines of the ledger, in its order, each with its cost.

1. `swap` rebuilds each pool with the code `oracle queue` uses and refuses to write unless `queuePick` reproduces the locked file — cost if wrong: a refactor of queue's pool code.
2. `build` reads the `-v2` files when present — option A was chosen — cost: none.
3. Real-data runs are the controller's (Tasks 6–9); implementers work on fixtures only — sealing — cost: none.
4. A rejected tool use and an interrupt in the next user entry, with no assistant entry between, are one event — cost if wrong: 3 fewer rule 1 events in the baseline.
5. `segments` sorts each task's segments by first event time — ruling 8 is by time — cost: none.
6. A second reject or interrupt in the same turn joins the first event — cost if wrong: parallel rejects undercount by their extra rejects (3 in the corpus).
7. `swap` takes `--drop`, run with `--drop p8b` (the queue was drawn before p8b had an `agreement.json`) — cost if wrong: none, the reproduction check guards.
8. A `pairs` row is a task with B then B- as its parts — cost: none.
9. 'Agent, before' is the last assistant entry with non-empty text — cost: none.
10. `build classify` and `classify-2` leave out rows of cold-setup tasks and print the count — cost: none.
11. `recount` takes `--drop` and is run with `--drop p8b` (no data file records which real-estate tasks are kept) — cost: none.
12. `swap` must run before the second batch — cost: none in the plan's order.
13. The plan's "25 env/seeded" was 24 external files plus `env/seeded/real-estate.json`, left for step 11 — cost: none.
14. `serve --root` redirects `/` to `/<token>/`, used while the user reads, no subagent running while the pages are up — cost if wrong: during the read any local process could fetch a page.
15. All 7 batches served at once, each on its own port and preview name; no batch applied before every batch is answered — cost: none.
16. The reader is a sealed agent on `claude-fable-5-1` — cost if wrong: one more model in the record.
17. The reader sees exactly the built pages, in chunks, no tools, one rerun, a conservative default — cost: a defaulted 7.1/7.2 row can stop a gate (none was defaulted).
18. Registered before any proxy answer as "Amended at step 9" — cost: none.
19. The `inputs` stop is a plan defect (external input is the issue verbatim) — cost if wrong: one external issue that states more than the requirement stays in the input.
20. A second-batch check whose validation reads `pre-existing` is recorded `pre-existing, moved to none` and `sweep` is not run — cost if wrong: such a check scores in no task (none was `pre-existing`).

## Deviations

Each is listed in step 14's report.

1. **The cold swap.** 13 sampled rows of cold-setup tasks (7 `oracle-7.1`, 5 `rerate-7.2`, 1 `inputs`) were replaced before any read, in new `-v2` files; the locked files are untouched. Reason: step 4 ruling 13 (nobody designing the plugin opens the cold-setup repos). Cost: the sampling of step 5 ruling 16 changes for 13 rows, and 2 disputed checks of cold tasks stay disputed.
2. **An agent reader in place of a human for sections 5, 6.1, 6.3, 7.1, 7.2, 7.3 and 9.3** (option C, the user's decision after the pages went up). Reason: the user chose full automation. Cost: no human read anything at step 9; the input read, the fix labels (which chose the second batch's sources), the settling and re-rating of classifications, the 7.1 read, the intervention labels and the 7.3 pairs are one model's reads, and step 14 must say the stick was checked by agents only.
3. **Decision 2: one rater against a mechanical rule**, and that rater is the agent reader. Reason: decision 2 option (a), then option C. Cost: κ measures the rule against one model, not how two humans agree.
4. **7.2 recorded as not measurable by an agent.** Both re-rating gates stopped (16/20, 14/20); the user decided that one model against two raters of another does not measure usability, which rests on step 5's κ/AC1 branch. Cost: section 7.2's human re-rating has no result; the labels stand unchecked by a human.
5. **History reported without a gate.** κ 0.18 is below 0.7; ruling 8 would stop the plan and change the rules or the tool in a new commit. The user decided no gate; the counts are reported and nothing was relabelled. Cost: the baseline of 9.3 rests on the tool's rule, which one model read differently (mostly rule 1 and rule 2 events the reader called not counted).
6. **The inputs gate held on task-repo only.** The external leak (1 of 2) was ruled a plan defect. Cost: one external input that may state more than the requirement stays as every arm's input.
7. **All 7 pages served at once with `--root`**, not one batch at a time in order (plan Task 7 step 2). Reason: the user read remotely at their own pace. Cost: none was read by a human; the guard that no batch is applied before all are answered held.
8. **`serve --root` itself.** It hands the token to any local GET of `/`. Reason: the preview pane opens `/` and a 48-character token cannot be typed on a phone. Cost: while the pages were up any local process could fetch a page; no subagent ran then.
9. **The stick check of s3-02 on B's products** was outside the plan, added by the user's decision on the stick. Cost: 2 sealed grades, counts only.
10. **The gate consequences of 7.1 and 7.2 and `partly` → `requirement`** are rulings the prereg left open, listed as deviations in "Applied at step 9" (deferred minor of Task 1: they are open rulings rather than deviations).

## Checks at the lock

- **Tests.** `HSTACK_BENCH_MACHINE=<data>/machine.json bun test ./tests`: **552 pass, 49 skip, 0 fail**, 601 tests in 30 files, 156.2 s, output pristine (header and summary only). `git status --short bench` and `git status --short tests` are empty; the last change to `bench/` or `tests/` is `5513d93`.
- **Applied.** `bun bench/human.mjs status`: every batch `applied yes` (classify-2 1/1, classify 19/19, history 103/103, inputs 4/4, labels 12/12, oracle-7.1 50/50, pairs 3/3, rerate-7.2 40/40).
- **Servers.** No `human.mjs serve` process (`pgrep` 0); nothing listens on the ports of the ledger (49909–49915) or the probe's 59452.
- **`/tmp/hstack-bench`** is empty after the test run (it held one test fixture entry while the suite ran).
- **pgsnap.** `cmp` of `pg-b2-before.txt` and `pg-b2-after.txt`, and of `pg-split-before.txt` and `pg-split-after.txt`: equal. No other database command ran in step 9.
- **Hash compares** (`bun logs/step9/lock-explain.mjs <data> <repo> <locks>`, which recomputes as `logs/step7/lock6-compare.mjs` does and explains each changed path):
  - step 5 lock: hashed 1369, equal 1327, **changed 42**, missing 0.
  - step 6 lock: hashed 572, equal 571, **changed 1**, missing 0.
  - step 7 lock: hashed 1072, equal 1048, **changed 24**, missing 0.
  - step 8 lock: hashed 142, equal 142, changed 0, missing 0.
  - **Changed 67, missing 0, unexplained 0.** By the table "What step 10 hashes again": the 51 env files (Task 6; 27 in the step 5 lock, 24 in the step 7 lock); 11 `labels.json` of the tasks with a settled classification (p1, p2, p3, p4, p6a, p8e, s1-03, s1-04, s3-05, s3-06 in the step 5 lock; p8b in the step 6 lock); 4 `oracle/manifest.json` (p1, p2, p6c for the second batch, s1-03 for the 7.1 drop); `p1/agreement.json` (the b2 rounds). The rule is by membership, not by a diff of the content: a `labels.json` is explained when its task has a settled `classify` or `classify-2` row, a manifest when it holds a `batch: 2` or `human 7.1` entry, an `agreement.json` when its `splitRounds` has a b2 round. Every task that qualifies did change (11 of 11, 4 of 4, 1 of 1). No `step.json` or step manifest changed (no step drop). `p1/validation-dfefaff.json` is new, not changed.
  - New files in folders an earlier lock hashed: p1's 9 new check files and the 2 seeded grades of the s3-02 stick check (`s3-02/seeded/grades/`), with their 2 logs. They are hashed below.
- **Files the stick check touched that no lock hashes** (not read, counted by name and time only): 10 files of one sealed repo checkout under `ext/sealed/` (12:54 and 13:06), `ext/removed.txt`, `s3-02/docker.json` and `s3-02/build/readiness.tsv` (the files `oracle-run` rewrites on every grade, as the step 8 lock noted).
- **Docker** after: as in "Docker and the token". No prune, volume, compose or network command ran in step 9.
- **Sealing.** This task ran counts-only scripts over `step9/seen.tsv`, `step9/answers/*.tsv` (answers joined by key, counts only), `history/segments.json`, the run records' numbers, manifests' `batch` and `drop_reason` fields and `agreement.json` round names. It opened by hand none of: the pages, the answers, the proxy prompts and replies, a note, an oracle, a manifest's text, a label, a reply, a transcript, `ext/sealed/`, or `box.env`.

## Findings

None. Every changed file of the step 5–8 hashes is one the plan's table names.

## Open points

- **The stick decision, before step 10.** The step 8 stick is not concluded and not validated. The fix-the-stick decision is the user's, before step 10; the inputs to it are the step 8 verdicts (registered canary failed; the extension passed on a bootstrap bound of 0.057 with the t interval crossing 0), the reader's pairs read (B- worse on s3-01 and s3-02, against step 8 deviation 2) and the s3-02 check (the seeded checks pass for both arms there).
- **Step 10's lock must not say "stick validated".**
- **Step 10 reruns.** `oracle step` again for the external tasks (step 6 ruling 2), s1-03 included, whose dropped check leaves the ids there; `kills` again for every task whose `oracle/` changed (step 7 lock): p1 (second batch), s1-03 (the 7.1 drop), and p2 and p6c, whose manifests changed only by `interface none` entries that score nothing; whether their kills must rerun is step 10's ruling. Decision 5 does not apply: p6c stays below rule (b) (2), so the 9 tasks named for seeded bugs stay.
- **The token.** The user revokes it, then `rm <data>/arm/box.env` (unread).
- **The 2 cold-task disputes stay disputed** (a disputed check scores H2 and is not a step candidate).
- **Merge and push wait for the user.** The branch `bench-step9` is not merged or pushed; the plan stays `draft` until the user approves the build.
- **Deferred minors** of the ledger, one line each:
  - Task 1: the prereg's deviations list labels the 7.1/7.2 gates and partly → requirement as a deviation; they are open rulings.
  - Task 1: registered decision 4 lacks "106 session files"; the "hash again" paragraph is extra; ruling 10 says "the controller's session".
  - Task 2: `answersFor` reads inherited keys of `LABELS`; a 3-field answers row reads the third field as a note; later human messages in a turn after a reject or interrupt are swallowed.
  - Task 3: the 7.1 title marker falls back to the title's last segment; the `lang` part field is never emitted.
  - Task 3: an earlier note cannot be cleared from the page; each POST re-parses the answers file.
  - Task 4: the `#n` key path shows every bash/clear part of the entry; no test that the page's keys equal kappa's; event order in a session is file order; `history` overwrites its outputs with no guard.
  - Task 5: `apply` reads the answers file twice; the inputs gate has no set; untested: b2 write into an oracle without a manifest, b2 `-2` rerun, 18/20 and 17/20 gate sizes, apply history; merge throws on a validation file without checks; `validate --ids` does not dedupe; unused `owners`; non-b2 split round numbering counts b2 rounds.
  - Task 7a: `--root` hands the token to any local GET of `/`; `--port --root 5` is accepted; no test for a repeated `--root` or `/?x`.
  - Task 7b: `--model` can override the ruled model (printed in the count line); a history segment over 900000 bytes cannot be split; id/label aliases are accepted in replies; the prompt rides in argv.
  - Docs (`55a7100`): "three gates stopped" names the stick as a gate and omits the inputs stop; corrected in this lock.

## Known limits

- **One model read everything.** Every settlement and read of step 9 is `claude-fable-5-1`'s judgement; no human checked any, and nothing measures that model against a second reader.
- **The reader had the raters' brief.** For `classify`, `classify-2` and `rerate-7.2` it read `briefs/classify.md`, the rule the raters had; a disagreement between the reader and the raters is between two models under one brief.
- **Blind settling.** The `classify` pages show no rater label or quote, so a disagreement the raters argued well was not shown.
- **The 7.1 sample is 10 per set.** A gate of 9 of 10 finds a gross rewrite problem, not a small rate.
- **The history κ does not say which side is wrong.** The tool applies ruling 8 mechanically; the reader had only section 9.3's rules, without ruling 8's tool rule. Most disagreements are events the tool counts (rule 1 or rule 2) and the reader calls not counted (34 of 44).
- **Historical windows.** A plan's window starts at its base commit, so a plan written before the previous plan's last commit loses its writing events, and a fix plan between tasks falls outside every window (258 events outside).
- **The pages passed through the app's preview connection** while they were up (no answer was saved then).
- **The env before-hashes** of the 24 seeded files are only in the step 7 lock (`env-before.sha256` holds the 27 `env/s*.json`).
- **The s3-02 check is one task.** The seeded checks pass for both arms there; that says the instrument does not separate the arms on s3-02, not on the other tasks.

## Usage and wall clock

Subagents of the build, as the ledger gives them (implementer; reviewer):

| task | implementer | reviewer |
|---|---|---|
| 1 Register the rulings | sonnet 105.2k, 4.2 min | sonnet 91.0k, 0.9 min |
| 2 Pure rules | sonnet 86.0k, 13.9 min; fix round 94.0k, 3.5 min | sonnet 84.8k, 1.6 min; re-review sonnet 73.4k, 0.8 min |
| 3 Batches and the page | opus 212.4k, 24.6 min; fix round 224.1k (total), 4.7 min | opus 146.8k, 6.1 min; re-review sonnet 81.3k, 0.7 min |
| 4 History | sonnet 136.6k, 6.3 min | sonnet 113.4k, 1.9 min |
| 5 Apply and the second batch | opus 361.8k, 25.5 min | opus 183.3k, 8.9 min |
| 6 The oracle commands | the controller (data only) | none |
| 7a `serve --root` | sonnet 83.0k, 3.4 min | sonnet 83.7k, 0.6 min |
| 7b The agent reader | opus 209.6k, 15.1 min; fix round 224.6k, 4.1 min | opus 151.5k, 6.5 min; re-review sonnet 96.3k, 0.9 min |
| Docs, decided after the reads | sonnet 73.0k, 3.4 min | none |
| 7 reads, 8 second batch, 9 carry-overs | the controller | none |
| 10 Lock | this session | none |

Listed implementer tokens 1,810.3k; reviewer tokens 1,105.5k.

Agents of the runs (`lock-usage.out`, from the run records; input + output + cache write + cache read):

- The reader (`claude-fable-5-1`): 25 runs, 1,523,873 tokens, 18.9 min, 11:39 to 12:41 (+07).
- The second batch (`claude-opus-5-5`): writers 9 runs (5 and 4 reruns), 438,976 tokens, 3.4 min, 12:29 to 12:32; the b2 and split raters 4 runs, 158,864 tokens, 1.3 min, 12:37 to 12:41; the split writers 2 runs, 106,887 tokens, 0.9 min. In all 15 runs, 704,727 tokens (the plan expected 3–5M).
- Wall clock (local, +07, from the files' times): env fix 10:20; pages built and served 10:27; reads applied 11:58; second batch 12:29 to 12:37; split 12:37 to 12:41; `classify-2` and recount 12:41; s3-02 stick check 12:54 to 13:06.

## Scripts (`<data>/logs/step9/`)

Counts-only; none prints a row, an answer by key, a note or any sealed content.

| file | what it does |
|---|---|
| `env-fix.mjs` | Task 6: rewrites the `oracle` field of the 51 external env files with `oracleCommand` |
| `batch2.sh` | Task 8: pgsnap, `write --batch 2` per commit, `validate --ids` per owner, pgsnap and compare; prints the tools' count lines |
| `lock-explain.mjs` | the step 5–8 hash compares, each changed path explained by the plan's table |
| `lock-history.mjs` | the tool's labels per task, and over the sample the tool's and the reader's totals per task and label, the cross-table and κ |
| `lock-counts.mjs` | the seen set by batch and the settled classifications per set |
| `lock-usage.mjs` | runs, tokens, minutes and time span of the step 9 agent run records |
| `lock-hash.mjs` | wrote the hash lines below |

The `.out` files are the tools' and these scripts' outputs. `bun logs/step7/lock6-compare.mjs progress/step9-lock.md <data> <repo>` rechecks the hashes below.

## Hashes

`shasum -a 256` (computed with Bun's SHA-256 by `lock-hash.mjs`; `step9/seen.tsv`, `env/s1-01.json` and `p1/labels.json` checked against `shasum -a 256`, equal) of 330 files. Paths relative to `<data>`, sorted bytewise. Never a page token (`step9/pages/*.token`), never `node_modules`, a symlink, `ext/sealed/` or `box.env`.

- `step9/sample-7.1-v2.tsv`, `sample-7.2-v2.tsv`, `inputs-v2.tsv`, `seen.tsv`, `batch2.tsv`: 5.
- `step9/answers/*` (8 answers files and 8 `.applied`): 16.
- `step9/pages/*.json`: 8.
- `step9/proxy/**` (the reader's prompts, replies and run records): 75.
- `history/segments.json`: 1.
- `re-work/` files whose path holds `-b2` (the second batch's folders, prompts, settings, replies and run records): 46.
- p1, p2 and p6c files written since `b00baa2` (the first commit of step 9): 84 (p1 81: the 9 new check files, `oracle/manifest.json`, `labels.json`, `agreement.json`, `validation-dfefaff.json`, the 12 `classify-*b2*` files and 56 work files; p2 2; p6c 1).
- The other changed files: `labels.json` of p3, p4, p6a, p8b, p8e, s1-03, s1-04, s3-05, s3-06 and `s1-03/oracle/manifest.json`: 10.
- The 51 env files of Task 6.
- `s3-02/seeded/` files of the stick check (2 grades, 2 logs): 4.
- `logs/step9/*`: 30.

```text
1ca99c4bfada8ebccb20d5a2255ca8b486607ccff0c764a1d4327a607ea80495  env/s1-01.json
e244d25f192e08c4c7adc3ce38feaca1786f677e8e734bf3d3349a69b400c0ae  env/s1-02.json
16d3dc112b5cf090cf9341ee8ec5a15d95c8ac85f893aff2188380f5505610fd  env/s1-03.json
0f76303e5b9656f12cc8f4301b14f1ca0ca68c3da6ada8631fd9131fe227a26d  env/s1-04.json
beff398eb51afc07f6086546a133837ce58bf65422da4df970587c1a5d252185  env/s1-05.json
9c22e322691bff66b40e59a4d75f7496732566cb2dc1fd41409024a7d6f00e2c  env/s1-06.json
88735bee2ca0025e5e83dd01a311e6a1c57200e73e06503ecfd04f09fdb6fb37  env/s1-07.json
81c62dc46cd3985cf0378d2fa26480e2de2b0c043ecbcfe2a9fbf8a7086b0a5d  env/s1-08.json
61efa2266f058ae3ffe46ad363b8b92961d834c469e5ce3a15199f24e22dc0b8  env/s1-09.json
d06e81768e786e9a3a134ac89d605cef3a6079c718b07934d7b912e463bae2b0  env/s2-01.json
bf97034b490bbc5fa9017cb9757784809ed2e2407e853eeaea73160158e0a2a7  env/s2-02.json
d3c5d2aed66923de129fb27bcd8b4dd1b20bbeed569d1122f61e83da4f92fe03  env/s2-03.json
7f806391f453dcf59454ae33c19b5ad5be60dc4f5d7961f1796d9282f05bffb4  env/s2-04.json
e0dc469669e3fc35886f0dc7f4d27076757b02690e5c1bdf8b9c0a61e1908577  env/s2-05.json
72cc32076ebeafb627e1e1bcbed4a65146f9691019d71d4bb6e0f5c7b77ca953  env/s2-06.json
9bbf23f0066d4e1f48836847e92f4f51982b6adc875162d26b6c9bde5bdff852  env/s2-07.json
337d613d64fc862c83b462eae18c5df328c237a267c853e32c835dd20b200393  env/s2-08.json
6b77d3a4dc83aae4d9252d2b190690edf623647285017163a4d1a137d5d44161  env/s2-09.json
02aee2438b58684e539393f6c3a530c848aaf74aaf3d66902adac3378d24f4b4  env/s2-10.json
9a74204cd68a0cee554dcd41eee98849411c45baaf9f065337c5fe6c6858905b  env/s3-01.json
30538d5e60e29dff05a0aa27e22ee1cb64bb7b8ad53fc45058a9c28655a8ef99  env/s3-02.json
e55e49cef832e00b5e1329660811eefd174d5656658ae869a9fcdb98c462819e  env/s3-03.json
b0bbc1daffdc264d523addc3d09d730e5dc982ee61139c51c67fc4a08565bff4  env/s3-04.json
a758115a49b7a13d627a04eef3cdc6d6031a2d7ff8b5ceba20c4f16749ee92eb  env/s3-05.json
1029c18d7b9b0ea33a96a9e8c6e794a7d258018648addb4a6927698acc17c4ff  env/s3-06.json
c246b7842487922f1f4818894c6e0ccb7fad4714cc630b834e1ee28d99de5067  env/s3-07.json
5576cc9fd3fedac87b1b98e3eebe1e0e8dba2a5f670788fde61658c6616be1db  env/s3-08.json
e8d4cf92a28a1620b61e7dda26d33fe071c0486a58c94aae8e8318ba3f36d2b5  env/seeded/s1-01.json
f0276a5766db3d891dc310c69c78fe8865c435bbcb2064cc90e776a1bdee19f4  env/seeded/s1-02.json
7fafb6c38aa88dc4179983daa85e825452f22c39d555bf35c03320b653f1feaa  env/seeded/s1-03.json
50f2064e424f00526729cffb5274b839a009e4ba149ae2ffb35c53b0f8ad4cfe  env/seeded/s1-04.json
9d866ec888e640dadccb5c5c18084cd72d1bde6719c7a68f365dc99d8b7041db  env/seeded/s1-05.json
4b86673609b98ac2c5b8c3971312e1fd6f91444f4baca0ea6cbbbea1c2ca9389  env/seeded/s1-06.json
85f6eaebddc759753a206810ec4d58764df25d4827498278982a9208ca8287e7  env/seeded/s1-07.json
f7b359f6e3641327f6c5f6102a8da20b884ca979a7460f23093a032fad22513d  env/seeded/s1-09.json
fce80b7d3fb8d96d454f096f8081dbdeb5ca68b9fe98455aae166c04f1b59f82  env/seeded/s2-01.json
8e07c4189083285bf5bbb5d87b35bf02225b7396f3e13b552044c0aee9366131  env/seeded/s2-02.json
2aa337d71b1341eacc10bf5661d704e969dcff99879d629290d3a1e051bc5a1a  env/seeded/s2-03.json
c430b8be4696a7a40121c884453aaa81bcdadc7653f14e4c8c71f948aa1767ab  env/seeded/s2-05.json
327ce04a0896a826d6e8fc07c338f809daf3eba9d2273059b4070b886ce36f61  env/seeded/s2-07.json
491884ead83384cb1bd108c9e54098ae1c6d014fdfbad4259599a3f108268342  env/seeded/s2-08.json
b49e2b4df01e2781ff6bc37c2744787034dc9109da5694ff90ae3229d163c0ca  env/seeded/s2-09.json
f592c900198517716e5206a246098077d6cef17af3cc93ffc83a9e3444cd652f  env/seeded/s2-10.json
d52debbf14a1ab957c4cf6f13ee4ff395f0ff75b15bc5586e43c060a3eb3f0fb  env/seeded/s3-01.json
0c36f25a9f6ee906e0f1175c7a01fb452e4537f07efc349966e78d6330cd7238  env/seeded/s3-02.json
1c885877ba1afdf887601adc49433faec540894a1e94f1cd88dc520a0ac4764e  env/seeded/s3-03.json
ab98bfd3a3dda3cdf7f730a0313a43ff67f64e4188cab03e6289f0cb9acfc5ee  env/seeded/s3-04.json
3c43cf8ea11f62a7cd4e611cc32ad25c28939dfdbe4ad0a1d131d4c729864569  env/seeded/s3-05.json
0ccd18154a517d26691370e44ab74149de4537e2454655fb3c6843ac3aa65d65  env/seeded/s3-06.json
77c82a877ff709bbf7e52ad7c063cf2ce6401139e4003e8032a1409bd49b1471  env/seeded/s3-07.json
27e8c8e863462cf509fef2abf75fc4e952508828bedacf86580907f417ef1d29  env/seeded/s3-08.json
5125639f9ceb0c8523ac80ecb1b9c00605f0be2503294369d7035a82eb9b9295  history/segments.json
6491d04d65308e0a320e834191aef0466c44506287f8fa93a7288916b08aeea9  logs/step9/apply.out
e1a518010c7e99cd164c05bb3d132274174b33bcfcd8379f1f4e435ba6467ef0  logs/step9/batch2.out
903ed9649d224b0c9a9c5da87a7e3ab87dba8e4869b56860316c6c2230e0a388  logs/step9/batch2.sh
6c1f690c5f735d79cf33a9ec7f8825e1d61a0b588c90c18b7f7689e130674d15  logs/step9/env-after.sha256
478d3afe3a07a980513acba1c0473bfa27f9a3ee484f610940b2bf1359b33b48  logs/step9/env-before.sha256
0213bb83a07933e6860d75f78ee95a6000ff16388cafa532e856a0d8a874c5b3  logs/step9/env-fix.mjs
89cd05957c833363f55ecb453f292ad7139d91eb006c4fbbd9853d5abb5d5603  logs/step9/lock-counts.mjs
b03e45d99ba0e7b238ffd41186292bcbf7b44f93681e155b1c2c0aec62a5aa9e  logs/step9/lock-counts.out
ba6d65b1ce34bca16b293c0f75fa9f3a1e0c0a517de88c4341c266d8307f65cf  logs/step9/lock-explain.mjs
b51d7fee6b14770f277b69101d7aea8cac35c88ecf3c34f1d2be81957a6265b1  logs/step9/lock-explain.out
9800f3e7243122d66448fbcca8211e081dfdb50912b2875b77c7de0638915641  logs/step9/lock-hash.mjs
c83fd181f68fb07f42485c403ae1996d12232170771fa89b8d0a255b842d6d21  logs/step9/lock-history.mjs
c3cc0a8859d8cab7cec22ce1f9c95540844b47d787c70b2d498d0fdd33d6e183  logs/step9/lock-history.out
f1e7e75e266cc2a35e05ef2792c2ae0f9912a2bc112028d9fd994556f420f028  logs/step9/lock-usage.mjs
b15badc373ecb2c8e9ea6fa355b8e0bb825d85135eb7de1448c31f73bb9d33d5  logs/step9/lock-usage.out
1ccacfcdf3516328747a5e7244a17c81f5174d9d7f203a58ca18ac519d334fbd  logs/step9/pg-b2-after.txt
1ccacfcdf3516328747a5e7244a17c81f5174d9d7f203a58ca18ac519d334fbd  logs/step9/pg-b2-before.txt
1ccacfcdf3516328747a5e7244a17c81f5174d9d7f203a58ca18ac519d334fbd  logs/step9/pg-split-after.txt
1ccacfcdf3516328747a5e7244a17c81f5174d9d7f203a58ca18ac519d334fbd  logs/step9/pg-split-before.txt
ab17c26b0d3210c3845f19c6658245f8d6067d643c66814e8775fc5950a3cb53  logs/step9/proxy.out
252bcc33d8802c90cbd465c56b3ffe3b07ad617d3b67bcb33a69b21cad13ed40  logs/step9/round2.out
866f3297090118aa0489f48a82b8db4db3002f893ef5f0688baac072c9919102  logs/step9/serve-classify.out
6fcfde1b47ddd9771ab862473512433395f0d6922fd4b2bdbcb8a357d38073aa  logs/step9/serve-history.out
073934eac98922913153cfc86efd8529b3b0ecf4d06578d4d3846676a9231d89  logs/step9/serve-inputs.out
ee2e8a17323260e80e942e24756ab8790645d62a1b1aecec4139526ea8e039f8  logs/step9/serve-labels.out
72a6554de5dc8a15414371f554db7861c3e5ff8d810e0f054fe1eefa3343b3e6  logs/step9/serve-oracle-7.1.out
07892131c64c0d6aa730f965f1a095fcb1c3ce574a24b59ed5d940e25034436d  logs/step9/serve-pairs.out
b49be31f48d7772c014739dada640da4f0f729fa3aca034d745d4cfd275b7a06  logs/step9/serve-rerate-7.2.out
5f3e3a131ce30d8dee871f0676b87478339c2b019e4bedc4499c001a75f10bba  logs/step9/split-p1.out
cde1fa14ac46f3849b0b579b5cfb3f92b715277a08ea5b241122009be1d6c268  logs/step9/stick-s3-02.out
93c39e8b48f5ad1167da7eb21203ad0783d8e53304d526bdfa430f655ae36d48  p1/agreement.json
2b1e9baa9c6b495e070f8852c7dfb30ab824e54a22c66106566fc0ee0353a7ec  p1/classify-b2-1.json
c6703ad543b2d18b4c9af187dba6440646d8b0075ea3e3d5d03005a4798a574b  p1/classify-b2-1.reply.md
b64d28bd36905941056d7a8fa6d9243a54722d832761e199fbde7fe437a7c422  p1/classify-b2-1.reply.md.run.json
d69c69f250166a3c56b06863acfb612df5c983bdc2acdd0ae2b5c11cd20fc43e  p1/classify-b2-2.json
4e1e03d78914cc22ae94b7943b78b8d8f0f0f210939c44f4ff81c764f865e5f3  p1/classify-b2-2.reply.md
94410e0067421473e2435c3178ea76a304bc6581e0d0bb20839fa72aceee168f  p1/classify-b2-2.reply.md.run.json
52cf0e3f51c073c20c52652c0087103a8107155461a0310e63ad2b36a933fdd0  p1/classify-split-b2-1.json
e93fb6aa5276758aa398c0ce96b2580c089ee037f1ff5ba9cadb2799737e3430  p1/classify-split-b2-1.reply.md
61c1cfceb6d99a39dadb0db7fa511be7db4a21b4740d48ff581bfd5a787c1c7b  p1/classify-split-b2-1.reply.md.run.json
52cf0e3f51c073c20c52652c0087103a8107155461a0310e63ad2b36a933fdd0  p1/classify-split-b2-2.json
309d92dfb11a53d0830ee515fb5ea84a3ed156d809b3a0373eca9ff43f5102a1  p1/classify-split-b2-2.reply.md
67bf204b4c357f6d0492b4a6252772f4f82ad7c68d4bb81c010be59dddc1d500  p1/classify-split-b2-2.reply.md.run.json
1d1e9e4238b4642c8ad5aa20096aaf93d4a120e7bb24a90079adddee245bf5d0  p1/labels.json
da767055ab7b77b49324aad9d6c9099cf6cc9d01ac8fe3255f589d27a38bbd81  p1/oracle/dfefaff-T1.spec.ts
a93fd67a8cf265c6698b3976a18d5f47641acf42bfd5001076e10dd5e99e9ffc  p1/oracle/dfefaff-T2.spec.ts
b9599a94ca8749d0457d129117a4e76ccd55350fcd4a320aa8949be93b03e2d6  p1/oracle/dfefaff-T3.spec.ts
2c60638c6851e0bcec6e47eb11b0a57c0af316a2407f63598e41235ccc14acb0  p1/oracle/dfefaff-T4.spec.ts
33541b0fbc904d8e775019d579ec8f08fa53b681db7bc0e4d69d8fa9d865cde2  p1/oracle/dfefaff-T5.spec.ts
62a6257bff1bc17bcb91837107b5b9d629c5e4f10facc1271dc7e7d78c7b9d05  p1/oracle/dfefaff-T6.spec.ts
a48b0c860a8bad24b1eb0ba60096f8faa42e7e1def01785f3e81f2b08b960593  p1/oracle/dfefaff-T7.spec.ts
701b5d402f9741c2f9a162d786f11db009fe65f463dd17ad73f3135b171951c0  p1/oracle/dfefaff-T8.spec.ts
8d42e1fdc749ac16ec3c6b20d7891c78c981d890a8d951e43a232bd2995de42b  p1/oracle/dfefaff-T9.spec.ts
ef50b20de448b8101a4042e28b9af4ddd283ded0c08218be3568879821611eed  p1/oracle/manifest.json
cda059db606d341dd2920edab951120c73dfd28b0b4822588de8f3bfd6131a4b  p1/validation-dfefaff.json
9a48bb0149d429c16e1069faa1e7050fa869e516693216089c0c80dd4e1eda20  p1/work/classify-b2-settings.json
5972872e19e9d5e5d483f052a3dfae9877dba15fdcdc29af88bc6b00272007d7  p1/work/classify-b2.prompt.md
da767055ab7b77b49324aad9d6c9099cf6cc9d01ac8fe3255f589d27a38bbd81  p1/work/classify-b2/dfefaff-T1.spec.ts
a93fd67a8cf265c6698b3976a18d5f47641acf42bfd5001076e10dd5e99e9ffc  p1/work/classify-b2/dfefaff-T2.spec.ts
b9599a94ca8749d0457d129117a4e76ccd55350fcd4a320aa8949be93b03e2d6  p1/work/classify-b2/dfefaff-T3.spec.ts
2c60638c6851e0bcec6e47eb11b0a57c0af316a2407f63598e41235ccc14acb0  p1/work/classify-b2/dfefaff-T4.spec.ts
33541b0fbc904d8e775019d579ec8f08fa53b681db7bc0e4d69d8fa9d865cde2  p1/work/classify-b2/dfefaff-T5.spec.ts
2d29c1b03c4b66b266eaace5310d5463086e1784f83d2ded76b97d78a0590a46  p1/work/classify-b2/input.md
a80bddef7af3b796bb6263f97053af7000551d8a92ea5fc61610547eee5febf2  p1/work/classify-b2/interface.md
fce68e5fed16bc2b093ae0da64069455dccf1e5eeac2a97fc151b61b7e58bce2  p1/work/classify-b2/manifest.json
b4bb117e4ea0f07713219bcdddb44ddb7bc8a364fcbc1cc4f43e4227860186df  p1/work/classify-split-b2-settings.json
820a1180ee6b3b29aa28432300dd49ab3ef73b71b89dd8232517a8f849fe4036  p1/work/classify-split-b2.prompt.md
a48b0c860a8bad24b1eb0ba60096f8faa42e7e1def01785f3e81f2b08b960593  p1/work/classify-split-b2/dfefaff-T7.spec.ts
8d42e1fdc749ac16ec3c6b20d7891c78c981d890a8d951e43a232bd2995de42b  p1/work/classify-split-b2/dfefaff-T9.spec.ts
2d29c1b03c4b66b266eaace5310d5463086e1784f83d2ded76b97d78a0590a46  p1/work/classify-split-b2/input.md
a80bddef7af3b796bb6263f97053af7000551d8a92ea5fc61610547eee5febf2  p1/work/classify-split-b2/interface.md
562a463640dd7641ee52b4817d2b109bdb41e8f9f705bafcd2ae4592b2c3259f  p1/work/classify-split-b2/manifest.json
4ee9d0b8cc3b4c13aa95066090005dd5c6e25146c5da863d4cd5befc5f95e8e5  p1/work/ids/grades/15c890e.json
b20a22c06687914ab28699cdceff83ffb23b3d180a4bbe5753e9d2b6533102b6  p1/work/ids/grades/7adfd47.json
ee20562b33f9556c55682f3dd2a7088366c23a843a4cf4bae192d316643ef38d  p1/work/ids/grades/dfefaff.json
8c6adf30b620bd185376a66556dc49c3b2445087c4579be010fd1433cc9fe4e5  p1/work/ids/logs/15c890e-1.log
8f526c770891b5827bcd9d81232cb42a68eb43d993c6006571adae222c29946b  p1/work/ids/logs/15c890e-2.log
f31b6e024ee35f295cc1fc06fd176e599cccab2ba87f6bad7f8b9a954e0e9120  p1/work/ids/logs/7adfd47-1.log
c9cbbceb17e82eed981fc251a9cefcfe4fc385d55015f9849017dd8a66c5dbc5  p1/work/ids/logs/7adfd47-2.log
bfa573c6e6fa6ab362cfd747500b172ad5a97acdc5bff3040efbe99aa55a40f8  p1/work/ids/logs/dfefaff-1.log
0ebb9c9dc87087f1390ece457673476b41fadc2a8863165876423991e198aeab  p1/work/ids/logs/dfefaff-2.log
62a6257bff1bc17bcb91837107b5b9d629c5e4f10facc1271dc7e7d78c7b9d05  p1/work/ids/oracle/dfefaff-T6.spec.ts
a48b0c860a8bad24b1eb0ba60096f8faa42e7e1def01785f3e81f2b08b960593  p1/work/ids/oracle/dfefaff-T7.spec.ts
701b5d402f9741c2f9a162d786f11db009fe65f463dd17ad73f3135b171951c0  p1/work/ids/oracle/dfefaff-T8.spec.ts
8d42e1fdc749ac16ec3c6b20d7891c78c981d890a8d951e43a232bd2995de42b  p1/work/ids/oracle/dfefaff-T9.spec.ts
a9fe27402bee0f0a5f6d8857bc7fd1a4bbb9dab1bc269ca77149c5e24a32dca2  p1/work/ids/oracle/manifest.json
1789a235b92747f069742319afe73faa4084ec0dc41d66ac3e93208a5bfc94ca  p1/work/ids/oracle/package.json
1aed8c3724a037e8639dd00bba43d8635fe731ab3a718b76d0ee649c50d32b26  p1/work/ids/oracle/playwright.config.ts
d1a8b0df3cad6f05a3ce371aa651ae37d1d29014705e85a8dfdfc9261b4be59f  p1/work/ids/validation-dfefaff.json
b9599a94ca8749d0457d129117a4e76ccd55350fcd4a320aa8949be93b03e2d6  p1/work/split-dfefaff-T3/in/dfefaff-T3.spec.ts
8e22a62003ab38f27593407fb72d781910021c21f520431ce1301a183eb76ba0  p1/work/split-dfefaff-T3/in/entry.json
2d29c1b03c4b66b266eaace5310d5463086e1784f83d2ded76b97d78a0590a46  p1/work/split-dfefaff-T3/in/input.md
a80bddef7af3b796bb6263f97053af7000551d8a92ea5fc61610547eee5febf2  p1/work/split-dfefaff-T3/in/interface.md
62a6257bff1bc17bcb91837107b5b9d629c5e4f10facc1271dc7e7d78c7b9d05  p1/work/split-dfefaff-T3/out/dfefaff-T6.spec.ts
a48b0c860a8bad24b1eb0ba60096f8faa42e7e1def01785f3e81f2b08b960593  p1/work/split-dfefaff-T3/out/dfefaff-T7.spec.ts
0a31d6d0611406e2b9027c3ba559bf2cb525c0df00d7eac27354b9c8e01b869d  p1/work/split-dfefaff-T3/out/manifest.json
ea03782aeae68dbfdcf7b3e01058408c12990fdb0322b81e037df4c5ba8eaa21  p1/work/split-dfefaff-T3/split-settings.json
a22e0960fd0d032293f508e55732dfb254314fbbb8d1b002428b7349fbbffdbe  p1/work/split-dfefaff-T3/split.prompt.md
ad1a64057f9ab34fecfe3f4ee78660bb0316dbda9370581ffbeb1e8bddf3d598  p1/work/split-dfefaff-T3/split.reply.md
004ac1e90c6f4fadb9f2019193d8f2c070bc868897a8c497ebefefc512d4ae38  p1/work/split-dfefaff-T3/split.reply.md.run.json
2c60638c6851e0bcec6e47eb11b0a57c0af316a2407f63598e41235ccc14acb0  p1/work/split-dfefaff-T4/in/dfefaff-T4.spec.ts
4cbcfecaaf868fb36597677a4096236fd4417ea53c4f63aa6711f166ebf5ecc9  p1/work/split-dfefaff-T4/in/entry.json
2d29c1b03c4b66b266eaace5310d5463086e1784f83d2ded76b97d78a0590a46  p1/work/split-dfefaff-T4/in/input.md
a80bddef7af3b796bb6263f97053af7000551d8a92ea5fc61610547eee5febf2  p1/work/split-dfefaff-T4/in/interface.md
701b5d402f9741c2f9a162d786f11db009fe65f463dd17ad73f3135b171951c0  p1/work/split-dfefaff-T4/out/dfefaff-T8.spec.ts
8d42e1fdc749ac16ec3c6b20d7891c78c981d890a8d951e43a232bd2995de42b  p1/work/split-dfefaff-T4/out/dfefaff-T9.spec.ts
ef7d4d143325279e95a114204bd4d63e82b102db706f6aa9e0b4caa564ffca20  p1/work/split-dfefaff-T4/out/manifest.json
2d19c2427d64a0555c5a2212836a2012ff1cb097244c04ee792aa5dccddd12b2  p1/work/split-dfefaff-T4/split-settings.json
3709b24a3d45093557af238e9eb2e8a1770b91466895e5e06c09a00a62fa2755  p1/work/split-dfefaff-T4/split.prompt.md
ad1a64057f9ab34fecfe3f4ee78660bb0316dbda9370581ffbeb1e8bddf3d598  p1/work/split-dfefaff-T4/split.reply.md
b5bb9c87812656e9c401b65e2096dc491942d44134bfd69f49d744830f67da93  p1/work/split-dfefaff-T4/split.reply.md.run.json
6b6d0f8640b906e0b9002ccf118beadd75680079d839c2515e1ea8dd1ded42cd  p2/labels.json
eb946016813adea2b15b54bebc1500a9a257d86130b5a745c0a4e1656243dbd0  p2/oracle/manifest.json
2d070a615dc97dae806b0f36e83269fbe39501f49d4a52ba24137373fdda2e71  p3/labels.json
982f90300df49d86162a75163d2d4da25b53ae9963cffc6f8485a23ed8b65844  p4/labels.json
cd46b03e1af4e36e304bf86fefae7d81cd20696723681ce535abe9fa6203dd75  p6a/labels.json
a85fde2f9dfc3d7f5d481af1879b70a95800b8c4490f6b84f8e522db64d623e2  p6c/oracle/manifest.json
7c898df1a538084f8cec9dfc2f8c9d126ecb0f1cb0f05c0d3b7ea40959dacc48  p8b/labels.json
636411d2ff8b2892d5b9cdd8ba796608bd00caa2daac7fa156ff2de61782c0c5  p8e/labels.json
2ce7e8078fb6f37e4bc35702596b8f699f37f637b7695861b992259fc3e5e0f6  re-work/0120e47-b2-2.reply.md
f35e6c53a30e1ee82635f8b8580bd0f30e4075f759879342f724de5bf86a32b5  re-work/0120e47-b2-2.reply.md.run.json
3773da4b9825323c70866da2ccbd972ae0f545ddfef9f9acbe1cf0bd4ff0e555  re-work/0120e47-b2-2/manifest.json
63bbde257fd3009307fa54cbd219e03d2dbf57e52c0d736cd8a008888cf07e0d  re-work/0120e47-b2.reply.md
0d3e9ca43b77498e2d42ebf089c4547e3a82f9ea4b9ad7313cd0fa4f1b04dc15  re-work/0120e47-b2.reply.md.run.json
5564ef78ef8bb330c1cde08008a146143e25bb2e1ea3465d3eb6155a496e2681  re-work/0120e47-b2/manifest.json
8c454ad0662665967660c32e19e97446dad4e36a15b5826402a3ffa1f5b4f604  re-work/0870afc-b2-2.reply.md
e054f1d3a6df5180fcb05283078319e69d9971fbc70f48cdd97238ea15169bf6  re-work/0870afc-b2-2.reply.md.run.json
37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570  re-work/0870afc-b2-2/manifest.json
369076729b1947467bdd3f95fd543888f3d10bd5440d779ecf22ee929a58943c  re-work/0870afc-b2.reply.md
0572fe992403399e8a8efca198ba310e5e439eeb1b5aa2093f67dd175f95ac04  re-work/0870afc-b2.reply.md.run.json
37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570  re-work/0870afc-b2/manifest.json
1e23579c8dfab30246ef389986941b6f20825cdf0898bef0af23b2e1a75dffd3  re-work/58e8819-b2-2.reply.md
6bc5993cf52bef62b07185ddd68457142b3a617e1bf67d6fe4725f7f004e259a  re-work/58e8819-b2-2.reply.md.run.json
26267ee24a7033446df4473e64995daceb4ac4f0dc09a708c050488dfb818344  re-work/58e8819-b2-2/manifest.json
7203ae6f7c5326737dddb959ee499dd9fd35a93e0502aca7314bdbaee724082b  re-work/58e8819-b2.reply.md
21e9b593f597a760e5c97d9f39bd83abae0a7991baa07d7d2d6d89cad35c6539  re-work/58e8819-b2.reply.md.run.json
42176145f1b9ab49513f69486cbfd7299083b89fe68390fc1c4582f60fce0f2d  re-work/58e8819-b2/manifest.json
9d4830f6b1f21f0bc40d924b8791e5a5f203264bcd994afe880cabcf8510aec2  re-work/d67e5b7-b2-2.reply.md
8c3d74ed2acf53c15703509c778533fe2e62b6d3974113bfc9ba102090b0c8b9  re-work/d67e5b7-b2-2.reply.md.run.json
9eeb44b12e5ccbd8719ee11af351a68b5c616d578bdbeb6152d7cc4b35b777ae  re-work/d67e5b7-b2-2/manifest.json
229c8a8ed94f92bcd7da80d8b18fcfc8dd7a22459b2c67967816ad162a220dae  re-work/d67e5b7-b2.reply.md
271437a5a8cc3fe106eaac19d4cc7bbc2fd6c0c6da5610df2312dc7051cf6265  re-work/d67e5b7-b2.reply.md.run.json
82c1aa9624bb363b5f794d4ac3a0891cccf2dbe42df8f96ab6edc7fa9cadd378  re-work/d67e5b7-b2/manifest.json
94c47344aa00c3a28ca912cac8f929a16cc63ca45cf27264e8378c44d4ff8621  re-work/dfefaff-b2.reply.md
f77339c7b1ca8c6066a74c408d09107ac63908589fc831ea16f08f794f9ab217  re-work/dfefaff-b2.reply.md.run.json
da767055ab7b77b49324aad9d6c9099cf6cc9d01ac8fe3255f589d27a38bbd81  re-work/dfefaff-b2/dfefaff-T1.spec.ts
a93fd67a8cf265c6698b3976a18d5f47641acf42bfd5001076e10dd5e99e9ffc  re-work/dfefaff-b2/dfefaff-T2.spec.ts
b9599a94ca8749d0457d129117a4e76ccd55350fcd4a320aa8949be93b03e2d6  re-work/dfefaff-b2/dfefaff-T3.spec.ts
2c60638c6851e0bcec6e47eb11b0a57c0af316a2407f63598e41235ccc14acb0  re-work/dfefaff-b2/dfefaff-T4.spec.ts
33541b0fbc904d8e775019d579ec8f08fa53b681db7bc0e4d69d8fa9d865cde2  re-work/dfefaff-b2/dfefaff-T5.spec.ts
eafeac4ebbf89cf1362ec4c36da937029f7320f147916d3e52dc56a524b554ca  re-work/dfefaff-b2/manifest.json
46bea30c7800750016e13400ab5f656ecb6abad1d6be6222e29e6fa99ff8bfdc  re-work/prompts/0120e47-b2.md
2b48baf66b279fb601f7c66f9f37aeacf17ea83c3007ca20dc2574648bac6bbe  re-work/prompts/0870afc-b2.md
c40d1cef03abdd9758a212e4eaecb27f6a71b0cb6b53e25d7371b375e7326357  re-work/prompts/58e8819-b2.md
05682762f358d02b594b80ba64ac2e8ba8228711526ddfb608597bbe32e831f8  re-work/prompts/d67e5b7-b2.md
38226532418dd626d9ab07810e864881821a78f6dbfc4eb4e4ab7c97da461a12  re-work/prompts/dfefaff-b2.md
c36d371f69d905f6583ff727349dd880dcf2c0950a51b57b5dbb8c570809c25a  re-work/settings/0120e47-b2-2.json
7a07014150acf2bb273c164273c1001dd677e9dcd7009927c851cfe3b4e4147f  re-work/settings/0120e47-b2.json
31663529165bba2f6711ddcbd09670f6899376ddd40b6afa6099410049353e25  re-work/settings/0870afc-b2-2.json
72c4daf2cb49dd85ee5c89d4b0567294f69e7b1971baf714a139f4c7347bb5fe  re-work/settings/0870afc-b2.json
a8d481c54c741f07d9f0efab05889e7620ece49027c8ed36caaaecc50554ba5f  re-work/settings/58e8819-b2-2.json
80ff9cbdd361bf35e17e76e0d9815a31bd45362e71093910d93c07dff90e68f4  re-work/settings/58e8819-b2.json
9c3c1f7a415eb81830abdde5d68e991fbf41df83ecd4f37fecd38a0db763dfc1  re-work/settings/d67e5b7-b2-2.json
d520355c4aa5e6c41f5d174d9a926ed1fdc3bde9b61c423c15db554c9aef6f98  re-work/settings/d67e5b7-b2.json
cdf4483f53e08af0adae96842f833bf988aee732894d21ee7191162f5ca94b07  re-work/settings/dfefaff-b2.json
1a219ceb34096359f3fca890c9868b7644574d1322ec056d8c2dd5b0d989da29  s1-03/labels.json
901c70b053ebac9e2f3fadf00c6bbf35ec342efdf3f42b91b62cd17abbafafea  s1-03/oracle/manifest.json
385c96152be6ef64ad4788f5423c0a320183e65ceae794c8f81e3bcbbf5871ef  s1-04/labels.json
442da9ffbb4ea6e27bea32a799841f9c735d29f8135fe1032cf41254dc753f32  s3-02/seeded/grades/3157600.json
079914358be89ad9a52d7a041b7d15cb689955e7b56c69ce9369f95ed226ba9c  s3-02/seeded/grades/9b50306.json
cd63a7ae091d276be7986f19bae9bbbf8b7b1770c061f9e2521c629be094f33f  s3-02/seeded/logs/3157600-1.log
a524adba76ea32304f3bd41bd00cee4ec0dac64f70406fb90c49cf7d61651663  s3-02/seeded/logs/9b50306-1.log
1b23e7096b68d460bd312129fc5491ee46ba405884797d0bccb95ea55fbf6321  s3-05/labels.json
f0704bf57971eac5a2bb649b9aa901fd4a403c774c7520dea16d85dc75fe1b0f  s3-06/labels.json
c1e7af3f72fb34e0984d130b8b79d7286ed1e4158dad63f256a76efd37790d2c  step9/answers/classify-2.applied
d70a352b3a4e132500d4453da67e0e69ec9160e0955e452d5fecf6599b3a66c4  step9/answers/classify-2.tsv
81be87ab0ef453b5f5ce3137f26da36c641d23fdc9d01f03c9aaed6c4875becb  step9/answers/classify.applied
2187c67ce5f5e6abe2218a47224e67db59a81b88c4e2d7eb9928304030e78522  step9/answers/classify.tsv
489f7fff0db39e705194637706bfd31b806c96130204ea3a52725f55d7efa28c  step9/answers/history.applied
cafa883c1ef632654d51f9bc90243d147b12c0227530b26109412c181c129d6d  step9/answers/history.tsv
868bba540873936aeaeb81c00c2f8accd0b09baac5fcc7be8ba90e87730f371e  step9/answers/inputs.applied
c9e37c26d5985d78f60ba26a7c157a35feb019ac2a9ff0c4af829882c53f6281  step9/answers/inputs.tsv
c05eca4e93c61b250e02547ee0c60c0cd578f337e1977e89a798f6b7b08a1ad8  step9/answers/labels.applied
64dc8e35264be39358479d566ce5c8d1ab57473e27a59ed58d0a282553822c50  step9/answers/labels.tsv
06633c8914d606bc3ae6e29826bb74c1c179dfc6a24f32a162cd4b8d7d84fe4f  step9/answers/oracle-7.1.applied
82bfadc0279037befe168ac4246ed9675abe5d214c998fec852e71b1f49b4bbc  step9/answers/oracle-7.1.tsv
e2196a680385d4019a673740e6cc2699d60fd175f9e73282ccceb27afa7eafb4  step9/answers/pairs.applied
f5274de81585edbd88ecc315f19d043d9fd67084e5a90e8ed510efdf53e7e420  step9/answers/pairs.tsv
bfde8cd163b7efbad67f1bfc6a47d8757cdbcc4dda797fcbfed0d765ea99b2c2  step9/answers/rerate-7.2.applied
41a82fe68b3ba51b048d8f4a99857b65e94b0d8bb56e02d3115a583f29cbf85b  step9/answers/rerate-7.2.tsv
da93f688dc72e41bf8e19e24bff6f6823e382d4a0067a85025861bf3dc44aa37  step9/batch2.tsv
fc830c98f69b05ee75aa9bb5ac72bd0c1a12159cb0c55e8d74d3665b297d9110  step9/inputs-v2.tsv
fcc12c7d2b1e7d8a0c3c9027cc86e751953dd9785ddf8a3918d62329d0080765  step9/pages/classify-2.json
264a7e93bfba9082b86ba3ae921e8297ceb3f7c380d15ddc003d234a4cb4c85d  step9/pages/classify.json
876e4c09e3171e64ab25fa1e49aae8697be4ca5cd2c2e4b47a5e03d12d1df992  step9/pages/history.json
e53d7c525df5afef325d9174b41bc5002da2aafd023d1c0c36681642afd87970  step9/pages/inputs.json
2aa63b808f44dfffc282d374a240ffe3af14117ed5e2ae0bdae6ef114a38c24a  step9/pages/labels.json
06b2f19a805cdbe6251720f737d32ebfec6f229cef114e9ceef4dedd06449e53  step9/pages/oracle-7.1.json
0ec163704d6a3685defd96ac91816b85c92d46fa04771a79bd7e230739a011fc  step9/pages/pairs.json
a7ddf53a1ccd5fa080893910af025e186a86c03ce0909f6ef8b47516e894b6af  step9/pages/rerate-7.2.json
2cc5fca933a23779f2e51f68b40ac79b52785ba4c43e7850bf2b196f65d2797d  step9/proxy/classify-2/1.prompt.md
9243989ef62a5e7296b9279a05dff459f38b502a1babef279a7dfed9e7ef8edd  step9/proxy/classify-2/1.reply.md
68eaa1e89c5e84bbaf01e2dda5a050ef67aed40f2fa554b3624d7d762db25167  step9/proxy/classify-2/1.reply.md.run.json
e55d3887f04705df74db729074ad62ffaa46f4cfba6cf9225829b30362bc9ae8  step9/proxy/classify/1.prompt.md
365e50de29b026c51edc443d3e669c046df16d1fe8612e6234f558c9f6f73e8c  step9/proxy/classify/1.reply.md
8b9c73d34810dd16f71064754087ac5843d3921595afbf43580decec4eec7272  step9/proxy/classify/1.reply.md.run.json
a8cedb074f133aaf41a184faef502f30388347de7667bcf75e76efea34a3c43b  step9/proxy/classify/2.prompt.md
ccd1d497c44100079230bd2eccfec8f9b3a2facbe1232d09b6a37c81ca3963ff  step9/proxy/classify/2.reply.md
0ebc0c9662210d12486b5eb1cf58f6a26cb7502de1331713f2e2a2be01ede581  step9/proxy/classify/2.reply.md.run.json
a36caa9e1bf1427819b37ac4a6cf6865ddefadeb476a0506db0d90a4044ed670  step9/proxy/history/1.prompt.md
42e9f24ebe79e9165c3a6a081e4e5e17452b14d6be313eef5becb656636b83e6  step9/proxy/history/1.reply.md
6a0d1f1c86492de1f97c4fb9e5b8746efa15115d0ffa2cc7c1deb6dd97302c17  step9/proxy/history/1.reply.md.run.json
8953400d1b6c4fcc05da6d7732d0ab8e5f6303ea86e6ac71616303a9c10da239  step9/proxy/history/2.prompt.md
32662fb54ed2077f38c8b092465764153f3b67743afd8ca58ffff490b9905741  step9/proxy/history/2.reply.md
a055fec6a512260c82e79679db8d48711f7cd3d6668166e604541d5dd25ffeae  step9/proxy/history/2.reply.md.run.json
ba2f6afe7e8c260d7c1271170ca0be27e4aefbc5e4caa9cc021912c33db9c671  step9/proxy/history/3.prompt.md
adfc7452f056628a1cab64ffbe90deddca01be4b98a87afb913bc44865c302ae  step9/proxy/history/3.reply.md
58d9965c388cfbc03720cb5eb78c721cccc75ce1225d24f91ef7a063eb28e9c8  step9/proxy/history/3.reply.md.run.json
96eea9250644f09346157fca6d4decd5a01a0e671222f171b4d780943f2636c5  step9/proxy/history/4.prompt.md
dec80a8825c33462f9fa5782c698b00cba5dc3e5ab2f84bfedb02fa1e1bad23b  step9/proxy/history/4.reply.md
4592502e05bfbe2b6c7b8be8e37b37536eb133e24bbb54da4cdf8bba8bce1b74  step9/proxy/history/4.reply.md.run.json
d384ed06a82957179afb8786e3ae464cebe87b2155a61fde05396d10199f2848  step9/proxy/history/5.prompt.md
3fe5b5a92e9e5f6f35a464e04295d4ce5112723cbdcb73043854a8c35a4d4392  step9/proxy/history/5.reply.md
e29535b50e226dc76487ae486d7a0130c0af841dfb4cbb301f61cf171f9a9af3  step9/proxy/history/5.reply.md.run.json
3379486d91e9d078f94210b15a1530890f0ad35e66a4ac0abc682a3fe3ab2bef  step9/proxy/history/6.prompt.md
a39d48e746ff32317ea5c0d8657e8e8f56a362bb8ef65e455b71f83db1f262c4  step9/proxy/history/6.reply.md
de4ce0c923b3db8ac542eaca6207232c57e0f58606848f083f135047c6aff307  step9/proxy/history/6.reply.md.run.json
874a14f5f340284284fdf372d279234d1ef0f1438e63e7d5cbbac2c54b3faf51  step9/proxy/history/7.prompt.md
9ecad4cf65e27530234d827de9b295791b89c7371ee2a160a7e008f5240edbb7  step9/proxy/history/7.reply.md
4ec8179ba200b590e8dd8e9aa91c9472c4c51a07904c08312e3a2e15ce2ed6d2  step9/proxy/history/7.reply.md.run.json
28f1b6a379bea7852186e629580a8ef52d653e0dc92d8bdf4fbe769666b1882d  step9/proxy/history/8.prompt.md
185a1a246b7668279e1508854db27fcb14c1b98f11069b94e83093058c85a2b4  step9/proxy/history/8.reply.md
07604422f168c2d11b41274f36e276bf8f0c5609d43ea6b1955425fcaae0cce2  step9/proxy/history/8.reply.md.run.json
ffe2d2278d7463e7e44fcad97c16a55b5142388ef45a30a7e9601dc43d1b5a7f  step9/proxy/history/9.prompt.md
6e969b86378a10d556ed86b5ba1ca3eb217ca0dc34e562e53168a99a98af4bae  step9/proxy/history/9.reply.md
17f651eac5dc5d5562df0eed0208f2666cd100ba2fcdbf3b91c01f5d9aaf7a5d  step9/proxy/history/9.reply.md.run.json
040e293b015d25227d67f84aa6789a8cc27c8f34cc2ea740b971ff5f00111386  step9/proxy/inputs/1.prompt.md
b43bf5d630c03da08baf3ede46f5274a8781646c0c93211e1e4a36bb0c98253d  step9/proxy/inputs/1.reply.md
31324290e1d83623e53b0739e5450d4c2ddf7dfc6244b02985c68750e0d9bd15  step9/proxy/inputs/1.reply.md.run.json
a570a83fbd4b0849988510fc03f87df025b73f93f3710dbb2e9e057bf72fa580  step9/proxy/labels/1.prompt.md
388e6b83ff06b66246f166978bf7ffc23437e34c25cadcadefbba3a5b4485d77  step9/proxy/labels/1.reply.md
fd8b5385ddad52173099220f4b58932b2ef48d1760ceca0606cbf1b7339bd215  step9/proxy/labels/1.reply.md.run.json
d0b50254842f8457e1553c634d2f5c5f00c69b2a056832a7580e8f4def9378a3  step9/proxy/labels/2.prompt.md
5f223e0c0326a005c791def21e4f7507d2cbe8add889822c55e35595dbacd2d3  step9/proxy/labels/2.reply.md
141d9c15d6570a198487061a4a721439623f637eca5dd9c91a087de5cbc7d9f8  step9/proxy/labels/2.reply.md.run.json
dc975d09c2703a458905b6e3262c275e1e46ea786f45010d4fa90007684ee029  step9/proxy/oracle-7.1/1.prompt.md
e97521c34186f9a77e7fa1d9e9f6faaa013aa989510d7b434c47a283da516e4f  step9/proxy/oracle-7.1/1.reply.md
32dff52d4e85cdfc5c4f731e255c47a0ae0e83b11c7797ba91de8aba36b59c7b  step9/proxy/oracle-7.1/1.reply.md.run.json
160ec1a47769ec36ff0005c71ed34e8cd6061c923af0a5e04a79b8c09c596080  step9/proxy/oracle-7.1/2.prompt.md
0b09a74b5dc702dff680f5132f097a476b48c2b594091a4bffab1cfd99835d6d  step9/proxy/oracle-7.1/2.reply.md
22af2df34f5a58cd6f62791503a8edaa047064afb053f74d1a834b5f31eb88d7  step9/proxy/oracle-7.1/2.reply.md.run.json
44ca434d314c7b4383f8214c9ab5f4d8921c0c86ba8291864f038a51a6c7e784  step9/proxy/oracle-7.1/3.prompt.md
3c39a75073776453097dd770f23b1e0666547eab74929fcc128ef7753f5f66dd  step9/proxy/oracle-7.1/3.reply.md
3028f923a974e14848e40882dca2689ddde1d30fea2ac8025dd19b8dde529761  step9/proxy/oracle-7.1/3.reply.md.run.json
b60f6e5cc4b5a25e029f1d599695cd438bb4807f7a73cb4ddd2e8bb185c37440  step9/proxy/oracle-7.1/4.prompt.md
f89b091a8e240bde1c9cecc9b4d93f52eba4ef5ba8dfb48e20c7d9c7a183eaad  step9/proxy/oracle-7.1/4.reply.md
d1561be31b8874fea2b0e641edb5193017196a46ba398973c5965d95e91e3207  step9/proxy/oracle-7.1/4.reply.md.run.json
57e98d05b6d219184b5ab02c4e46dd04e2fa81060d6effcc3e504b7ef2e3940e  step9/proxy/oracle-7.1/5.prompt.md
0e324b207315164326f943034b09038cd529ddb7cbd990fe1de59c930523aa88  step9/proxy/oracle-7.1/5.reply.md
1154f5452ecda9d15968e2059244182608aa4733fe8efb43de371cd93b15eeff  step9/proxy/oracle-7.1/5.reply.md.run.json
8034aabc2b367ad8c51a398a71170c7c3c2ca98c707baf686d1c638c803e16d4  step9/proxy/pairs/1.prompt.md
ac89ddac0fd77b2179bde361dca3f812b58e16b317ae7f6ad205f6b128880cb7  step9/proxy/pairs/1.reply.md
205c1f8c04c47c32541c380991bedd8f5cdbdb28ceb40ce14ae3a226b1c032f1  step9/proxy/pairs/1.reply.md.run.json
e7a0dc883dc377f284987b690483bda5e2904e7887e5afbf8e455d0db3ffb4ec  step9/proxy/rerate-7.2/1.prompt.md
f31f8e36d80d20988117bae3f5d583fe70a69196059ab959a9ce3c9d0db643bb  step9/proxy/rerate-7.2/1.reply.md
6e794a6ff47cc58b6760adeb3626545e7d8e514fade58cfb515e0ab95f7baba5  step9/proxy/rerate-7.2/1.reply.md.run.json
32fee3a1f7d6585d29f6dd10c5b7f9d9b73ba3267e5717cfdd93cbc1db5d0265  step9/proxy/rerate-7.2/2.prompt.md
ea7d91079bbb37b7d8f58e0ca16d1295bcbf978d9b06e69a046857a8cf37ecef  step9/proxy/rerate-7.2/2.reply.md
579729a3fce13fd71792b999a20a1b8a96d07571ce5936e3794fc7cdfe1aa826  step9/proxy/rerate-7.2/2.reply.md.run.json
a6055d2dc188ebbe4f47836ee4dea06a07627b50bb3eb8b2ceba719da221dd63  step9/proxy/rerate-7.2/3.prompt.md
57532df5dfa6281915293089716aebb615c6206158851b0458cf084a62874d2a  step9/proxy/rerate-7.2/3.reply.md
3868e9160809552facff3ae6e2a942c5dadef3573fc93da1eb0d994e6a92d37c  step9/proxy/rerate-7.2/3.reply.md.run.json
703ce198d26c7c6412459cf96f8139e874a5c37327efdee1df598fd7e68f250e  step9/proxy/rerate-7.2/4.prompt.md
fd03d9e4e96224eb8434a3770d024b45a0d8817bf763937a6c4e15bf56b784b4  step9/proxy/rerate-7.2/4.reply.md
4bba3fe313287bf7f4a6f336948565825ae156799610f407d87ad0f05e4bc673  step9/proxy/rerate-7.2/4.reply.md.run.json
2eeb3d6a6724a067194b6966316c8d7c84a4f9dc24efe10000de4714b64231f1  step9/sample-7.1-v2.tsv
3a328e091661d8faddcf720bd5c2067faf6820d623255febed0b23833b480966  step9/sample-7.2-v2.tsv
f524b3e5fe9e5defea3ffc63f265e21e231a876c54359fca0183b34fb17f6edd  step9/seen.tsv
```
