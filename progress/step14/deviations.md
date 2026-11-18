# Deviations for the step 14 report

Built by grepping (case-insensitive) `step 14` and `deviation` in `docs/plans/2026-10-27-benchmark-prereg.md` and in every `progress/step*-lock.md`, reading each matched paragraph and its deviations section, then adding this plan's items from `docs/plans/2026-11-18-bench-analysis.md`. Source names below are file basenames: the prereg is `2026-10-27-benchmark-prereg.md` (in `docs/plans/`), the locks are `stepN-lock.md` (in `progress/`), the analysis plan is `2026-11-18-bench-analysis.md` (in `docs/plans/`).

## Steps 1 to 7

- No item: neither the prereg nor the step 3 to step 7 locks mark anything as a deviation or "listed for step 14" (the step 3 to step 6 locks have no match at all; the step 7 matches are not deviations, see Counts).

## Step 8

- After the registered canary failed (mean d 0.400 with Sonnet B-, 0.428 with Haiku B-, 3 of 6 tasks), section 7.3 was extended to 14 unused tasks with a bootstrap-interval rule written after the 6-task results were seen, where 7.3's registered route was used up and "fix the stick" is a new plan; the original failed result stands — source: 2026-10-27-benchmark-prereg.md, "Extended at step 8 (2026-11-07), a deviation"; step8-lock.md, Deviations 1.
- Section 7.3's "a human reads 3 B/B- pairs" was done by the controller and the advisor under the user's delegation, not by a human, and the user has not read the pairs; the extension's reason "B- not worse" was not tested on s3-01, where B itself scores 0 — source: 2026-10-27-benchmark-prereg.md, "Notes at the lock (2026-11-08)", "A correction"; step8-lock.md, Deviations 2 and Rulings 23.
- The B- tier of the extension (`claude-sonnet-5-5`) was chosen by the controller, not named by the user — source: step8-lock.md, Deviations 3.
- The extended verdict is over the 14 unused tasks only, with the 20 tasks printed beside it, so that the 6 tasks already seen do not decide a rule written after seeing them — source: step8-lock.md, Deviations 4; 2026-10-27-benchmark-prereg.md, "Extended at step 8", "Verdict".
- `arms.json` changed twice (Sonnet to Haiku for the Haiku rerun, then back), against the single B- tier of ruling 8 — source: step8-lock.md, Deviations 5.

## Step 9

- The cold swap replaced 13 sampled rows of cold-setup tasks (7 `oracle-7.1`, 5 `rerate-7.2`, 1 `inputs`) in new `-v2` files, which changes the sampling of step 5 ruling 16 — source: 2026-10-27-benchmark-prereg.md, "Applied at step 9", Deviations; step9-lock.md, Deviations 1.
- An agent reader (`claude-fable-5-1`) replaced the human for sections 5, 6.1, 6.3, 7.1, 7.2, 7.3 and 9.3, so nobody human read the input read, the fix labels, the classification settling and re-rating, the 7.1 read, the intervention labels or the 7.3 pairs, and the 7.2 gate measures one model against two raters of another; this replaces the earlier deviation that the user reads the 3 pairs — source: 2026-10-27-benchmark-prereg.md, "Amended at step 9", "Deviations of this amendment"; step9-lock.md, Deviations 2.
- Decision 2 puts one rater against a registered mechanical rule in place of two humans, and that rater is the agent reader, so kappa measures the rule against one model — source: 2026-10-27-benchmark-prereg.md, "Applied at step 9", Deviations and "Amended at step 9"; step9-lock.md, Deviations 3.
- 7.2's re-rating is recorded as not measurable by an agent (16 of 20 task-repo, 14 of 20 external, both stopped), by the user's decision, so section 7.2's human re-rating has no result and the labels stand unchecked by a human — source: 2026-10-27-benchmark-prereg.md, "Decided at step 9 after the reads"; step9-lock.md, Deviations 4.
- The intervention history is reported with no gate although kappa is 0.18 (raw 0.57, AC1 0.49), below the 0.7 that ruling 8 requires, by the user's decision; nothing was relabelled — source: 2026-10-27-benchmark-prereg.md, "Decided at step 9 after the reads"; step9-lock.md, Deviations 5.
- The inputs gate held on the task-repo set only: the external leak (1 of 2) was ruled a plan defect, against ruling 6's "a leak stops the plan" — source: 2026-10-27-benchmark-prereg.md, "Decided at step 9 after the reads", "Controller ruling on the inputs gate"; step9-lock.md, Deviations 6.
- The gate consequences of 7.1 and 7.2 and the rule that `partly` gives `requirement` are rulings the prereg left open; the prereg lists them as deviations, the step 9 lock calls them "open rulings rather than deviations" (flagged: the two sources disagree on the label) — source: 2026-10-27-benchmark-prereg.md, "Applied at step 9", Deviations; step9-lock.md, Deviations 10 and Checks (Task 1 minor).
- All 7 pages were served at once with `--root`, not one batch at a time (plan Task 7 step 2), and `serve --root` hands its token to any local GET of `/` — source: step9-lock.md, Deviations 7 and 8.
- The s3-02 seeded checks were graded on B's two products (counts only), outside the plan, by the user's decision on the stick — source: 2026-10-27-benchmark-prereg.md, "Decided at step 9 after the reads", "User decision on the step 8 stick"; step9-lock.md, Deviations 9.
- The history tool departs from registered ruling 8: it folds a rejected tool use, the interrupt after it and the human message after them into one event, and drops later human messages in the same turn (rulings made during the build and never registered) — source: step9-lock.md, Deviations 11.
- The stick is recorded as "not concluded" and not validated ("chưa kết luận"), which supersedes the amendment's wording "validated by agents only"; step 14 reports that the step 9 reads were made by an agent reader only and must not say the stick is validated — source: 2026-10-27-benchmark-prereg.md, "Decided at step 9 after the reads", "User decision on the step 8 stick"; step9-lock.md, Deviations 12.
- The reader's read of the 3 step 8 pairs (B- visibly worse on s3-01 and s3-02) disagrees with step 8's controller-and-advisor judgment (B- not worse on all three), so the section 7.3 trigger candidate stays open and no human has read the pairs — source: 2026-10-27-benchmark-prereg.md, "Decided at step 9 after the reads" and "Applied at step 10", ruling 8; step9-lock.md, stick decision (the pairs paragraph).
- Second-batch checks whose validation reads `pre-existing` are recorded `pre-existing, moved to none` and `oracle sweep` is not run, so such a check scores in no task — source: 2026-10-27-benchmark-prereg.md, "Decided at step 9 after the reads", "Sweep ruling".

## Step 10

- The compare of the step 10 lock covers the step 3 and step 4 locks as well as steps 5 to 9, beyond the user's brief — source: step10-lock.md, Deviations 1.
- Decision 1 ("Theo advisor") was read as the advisor's recommendation, option (b), no human read of the 3 pairs; the prereg's default (b) stood because the question was not answered before Task 6 — source: step10-lock.md, Deviations 2; 2026-10-27-benchmark-prereg.md, "Applied at step 10", "Decided by the user on 2026-11-08".
- Stick v1 is locked but its sensitivity is not validated (registered canary failed, extension passed on a bootstrap bound of 0.057 while its t interval crosses 0, no human read the pairs), so H4 is Part 2's only sensitivity guard; step 14 lists the section 7.3 trigger candidate as open — source: 2026-10-27-benchmark-prereg.md, "Applied at step 10", ruling 8; step10-lock.md, stick paragraphs and Deviations; step11a-lock.md, Known limits.

## Step 11

- The walked tasks get no 7.2 re-rating and no input read (sections 7.2 and 5), as the step 9 decisions ruled for the other tasks — source: 2026-10-27-benchmark-prereg.md, "Applied at step 11", Deviations; step11a-lock.md, Deviations 1.
- The cold-setup repos stay those of stick v1, and walked repos join the unopened set instead of becoming cold by 4.2 ruling 13's "last repo to enter" — source: 2026-10-27-benchmark-prereg.md, "Applied at step 11", ruling 10 and Deviations; step11a-lock.md, Deviations 2.
- "The first of the sorted list" for the trial was read as s2-01 and s3-02 (the most step ids, one per stack, not s1-02) and the second real-estate trial task is p6c, a task dropped by rule (b), so the 9 scored real-estate tasks stay unseen; all three one-per-stack candidates were canary tasks already spent — source: 2026-10-27-benchmark-prereg.md, "Applied at step 11", ruling 12 and decisions 1 and 2; step11a-lock.md, Deviations 3.
- A served task graded in one container (ruling 5, `grade-mode` shared: s1-01, s1-03, s1-05, s1-07, s2-01, s2-02, s2-05, s2-07, s2-08, s2-10, s1-11) leaves M3 open there, and no end was graded through the networked path — source: 2026-10-27-benchmark-prereg.md, "Applied at step 11", Deviations; step11a-lock.md, Deviations 4.
- The walked tasks' classification disputes and 7.1 sample are read by the agent reader, not a human (decision 5 (a)) — source: 2026-10-27-benchmark-prereg.md, "Applied at step 11", Deviations; step11a-lock.md, Deviations 5.
- The external set grows past 24 (the walk adds 6, s3-08 leaves H1 to H4, so H2 to H4 run on 29 tasks and H1's N is 24) while section 4.2 says 8 per stack and the step 10 lock's H4 line says 24 tasks, by the user's decision of 2026-11-05 — source: 2026-10-27-benchmark-prereg.md, "Applied at step 11", Deviations (last bullet) and "Applied at step 14", Sets; step11a-lock.md, Deviations 6.
- The walk runs on a copy `logs/step11/groups-walk.json` with `perStack` raised, and the controller restores the `cold_setup` column after each `sample` — source: step11a-lock.md, Deviations 7; 2026-10-27-benchmark-prereg.md, "Decided by the user on 2026-11-10" (rulings for the walk).
- Decision (A): three private-set checks (p8a `d1ea76b-T13`, p8e `eb2b016-T7`, p8e `a9c2377-T15`) were dropped after the stick v1 lock because of the grade environment, not a human read, against section 7.1's "checks are dropped by a read" route — source: 2026-10-27-benchmark-prereg.md, "Decided by the user on 2026-11-10" (A) and "Deviations (for step 14)"; step11a-lock.md, Deviations 8.
- Decision (B): s3-08 (pola-rs/polars#29923) is not gradeable offline and leaves H1 to H4 although the step 5 pipeline kept it — source: 2026-10-27-benchmark-prereg.md, "Decided by the user on 2026-11-10" (B); step11a-lock.md, Deviations 9.
- Decision (B): s3 walks 3 tasks, not 2, so that H1's N reaches 24 — source: 2026-10-27-benchmark-prereg.md, "Decided by the user on 2026-11-10" (B); step11a-lock.md, Deviations 10.
- Decision (C): M3 is recorded as closed per task (split mode only), not per set; it stays open for the 10 shared s1 and s2 tasks and for all of s3 — source: 2026-10-27-benchmark-prereg.md, "Decided by the user on 2026-11-10" (C); step11a-lock.md, Deviations 11.
- vercel/turborepo#13756 was ruled out as `out: docker disk too small`, a candidate excluded by the machine and not by a rule of 4.2 — source: 2026-10-27-benchmark-prereg.md, "Decided by the user on 2026-11-10, during the walk"; step11a-lock.md, Deviations 12.
- The general disk rule for s3 candidates (a candidate that runs out of Docker disk again after removal by recorded names and `docker builder prune -f` is `out: docker disk too small`; goose#12006 ended on its end build instead) is a new exclusion rule outside 4.2 — source: 2026-10-27-benchmark-prereg.md, "Decided by the user on 2026-11-10, during the walk"; step11a-lock.md, Deviations 13.
- databendlabs/databend#20352 was excluded as `out: base tree not exportable on this host` (case-insensitive file system), a controller ruling told to the user — source: 2026-10-27-benchmark-prereg.md, "Decided by the user on 2026-11-10, during the walk"; step11a-lock.md, Deviations 14.
- The 7.1 gate of the walked s1 checks stopped at 8 of 10 `same` (9 needed; both `different` answers are s1-11 checks, neither a step id) and was accepted: the two checks stay dropped and s1-11 stays in the sample — source: 2026-10-27-benchmark-prereg.md, "Decided by the user on 2026-11-10, after the walked tasks' reads"; step11a-lock.md, Deviations 15.
- The setup-token of 2026-11-09 was not revoked at the step 11 lock, against ruling 13 and decision 3 (a) of "Applied at step 11"; `box.env` stays — source: 2026-10-27-benchmark-prereg.md, "Decided by the user on 2026-11-11, at the step 11 lock"; step11-lock.md, Deviations 4; step12-lock.md, Known limits.
- antiwork/gumroad#6391 was excluded as `out: issue not found` by a controller ruling — source: step11a-lock.md, Deviations 16.
- `PRIVATE_SET` and `registry.npmjs.org` are named in `bench/ext.mjs`, against "bench/ names no stack, customer or task" — source: step11a-lock.md, Deviations 17 and Rulings of the controller 13 and 21.
- The round-2 lines of s3-01 and s3-07 were validated twice (ruling 35) — source: step11a-lock.md, Deviations 18.
- s3-08 got a third sealed rebuild round (2 + 1 extra), beyond the budget of 2 — source: step11a-lock.md, Deviations 19.
- The rebuild tool (Task 12a) and the overlay fixes of Tasks 12c and 12d were not in the plan, and the regrade ran three times — source: step11a-lock.md, Deviations 20.
- The walk drivers were written new in `logs/step11/` instead of copied from the step 5 drivers — source: step11a-lock.md, Deviations 21.
- 7.1 for the walked set ran at `--chunk 5` because the default chunk was over the 0.9 MB cap — source: step11a-lock.md, Deviations 22.
- Task 13a had no task review (ruling 46), and s1-11 stays in shared mode though split was not retried (ruling 51) — source: step11a-lock.md, Deviations 23.
- Rebuild rounds were budgeted per task slug, not per repo as ruling 4 registered: pola-rs/polars (a cold-setup repo) spent 5 rounds against a registered 2 — source: step11a-lock.md, Deviations 24.
- `arm/proof-s1-01.json` was rewritten by the Task 4 and Task 11 proofs and its reason line was added after the fact (1f5c712), widening ruling 11's expected list — source: step11a-lock.md, Deviations 25.
- The standalone H probe of B1 used a 1800 s turn limit, a controller parameter of the probe only — source: step11-lock.md, Deviations 1.
- A fact about the plugin was withheld from the repository and kept in a gitignored note so that decision 4 holds after a merge — source: step11-lock.md, Deviations 2.
- The Phase A plan's missing `human:` verified entry was added in the Phase B branch (a fix to `main`'s state, not a rule) — source: step11-lock.md, Deviations 3.

## Step 12

- The setup-token was replaced during step 12 (the old one hit the account's weekly usage limit); neither token is revoked and both went through the session transcript — source: step12-lock.md, Deviations 1; 2026-10-27-benchmark-prereg.md, "Applied at step 12", ruling 4.
- The host check printed one account message (55 characters, a usage-limit notice naming no task) beyond the registered fields — source: step12-lock.md, Deviations 2.
- W was never run end to end before the lock (decision 2 (a), "No W run before step 13"), so its first full runs are step 13's — source: step12-lock.md, Deviations 3; 2026-10-27-benchmark-prereg.md, "Applied at step 12", ruling 3.

## Step 13

- Two Docker lanes replaced step 8 ruling 13's "one Docker job at a time" for step 13 (Docker to 16 GB and 120 GB disk); run minutes under two lanes are not comparable with the trial's single-lane minutes — source: 2026-10-27-benchmark-prereg.md, "Amended at step 13 (2026-11-11), before Docker is changed"; step13-lock.md, Deviations 12.
- H5's classes (`caught`, `miss`, `na`, `refused`, `notready`, `nosuite`) and the rate `caught / (caught + miss)` were fixed after the code review, adding cases beyond 8.3 option 1 (a suite that times out twice counts as a catch, no test file is a miss, P's test files are `git diff --name-only <envCommit or base> P`) — source: 2026-10-27-benchmark-prereg.md, "Amended at step 13 (H5), 2026-11-11".
- The grade path was recreated: every grade env file runs `oracle-run` from the Phase A worktree that step 12's housekeeping removed, now detached at `main` 6fbbf1e — source: 2026-10-27-benchmark-prereg.md, "Amended at step 13 (pre-flight), 2026-11-12", "The grade path"; step13-lock.md, Deviations 1.
- Four external ends fail a few cases at their own end (s3-11 1, s3-03 2, s2-10 3, s3-04 1); those cases never count as a catch for any product, and may also mask an arm's similar tests as misses — source: 2026-10-27-benchmark-prereg.md, "Amended at step 13 (pre-flight)", "The external ends' suites".
- s1-02 got `suite.sh` (the recipe's test plus `pg_trgm` in `template1`) and a `rebuild.json` from one `ext rebuild` round, since its recipe never creates the extension and its offline make needs a fresh serve image; its 22 DB cases fail at base and end and never count — source: 2026-10-27-benchmark-prereg.md, "Amended at step 13 (pre-flight)", "s1-02"; step13-lock.md, Deviations 3.
- s3-11's product make was fixed on the grade side (a new guarded `rebuild.json`, and s3-06's `rebuild.json` guarded the same way) and every standing s3-11 product was regraded, after its first five graded products stood `noresult` — source: 2026-10-27-benchmark-prereg.md, "Amended at step 13 (Task 5), 2026-11-12, after s3-11's first runs"; step13-lock.md, Deviations 2.
- 17 sealed make logs were rewritten by `ext rebuild` and s3-06's `rebuild.json` changed, so the compare against the step 12 manifest showed 18 changes beyond the predicted one (ruling 12 expected `changed 0`); step 12 ruling 6's stop was missed and is disclosed — source: step13-lock.md, Deviations 2 and Approval 3; 2026-10-27-benchmark-prereg.md, "Applied at step 13", "The lock".
- At the 24-hour check step 13 stayed on two lanes and the two machine runs (s3-11 H-2 and H-3, killed by the controller's own diagnostic grades) were not counted against the two-lane rule; their tokens are spent — source: 2026-10-27-benchmark-prereg.md, "Amended at step 13 (Task 5, the 24-hour check), 2026-11-13"; step13-lock.md, Deviations 4.
- The third-grade rule (one more grade for a `noresult` product whose two attempts both ended "the product image was not made" and which changed no build or dependency file) was registered after s2-05 and moved three products from `noresult` to good (s2-05 H-3, s2-03 W-3, s2-03 B-5) — source: 2026-10-27-benchmark-prereg.md, "Amended at step 13 (Task 5), 2026-11-14, after s2-05"; step13-lock.md, Deviations 8.
- H5 began before Task 5 ended, on 27 settled external tasks, on the user's free-text answer ("don't worry about quota, I only need fast and accurate") read by the controller as consent — source: 2026-10-27-benchmark-prereg.md, "Amended at step 13 (Task 6, the order), 2026-11-17"; step13-lock.md, Deviations 9 and Approval 1.
- H5 had no extra retry for a make flake (a controller ruling; the plan had been to ask the user), and no P grade in H5 was all `error` at the lock count — source: step13-lock.md, Deviations 10 and Approval 2.
- The H5 lanes did not enforce the shared-store groups of `step13/exclusive.json`: s2-02 and s2-10 overlapped on one store, and the four runs in that window (s2-02 H-3, s2-10 H-1, H-2, H-3) were rerun alone, with the old count lines kept and marked superseded — source: 2026-10-27-benchmark-prereg.md, "Amended at step 13 (Task 6, the store overlap), 2026-11-18"; step13-lock.md, Deviations 13.
- Beyond status and count lines, the controller saw s1-02's base traceback lines and make-log tail, one grade summary line, s1-03's per-product count lines, one count line each of s2-03 and p8c, make-log sizes and `grep -c` counts on sealed logs, file names of two arm products, the s3-11 nextest change of two arm products, and H5 record fields; only the overlap decision used a count line — source: step13-lock.md, Deviations 5.
- A read of s2-05's task recipe make lines was refused by the permission classifier and not retried — source: step13-lock.md, Deviations 6.
- The pause file was first created at `logs/step13/pause` by mistake and moved a minute later to `step13/pause`, the path `runs.sh` reads — source: step13-lock.md, Deviations 7.
- `oracle.mjs` exports `once`, `resultIn`, `hasResults`, `notReadyOf` for `h5.mjs`, and the seeder's edit gates moved into a shared `editCommit` (`seedCommit` unchanged) — source: step13-lock.md, Deviations 11.

## Step 14 (this plan)

- The H5 counts (caught 137, miss 54, not applicable 82, refused 15) were seen before ruling 8's interval rule (a bootstrap over tasks) was written; the rule follows 10.1's resampling of tasks and was not chosen by the numbers — source: 2026-11-18-bench-analysis.md, "Seen before these rulings were written"; 2026-10-27-benchmark-prereg.md, "Applied at step 14", "Seen before these rules were written".
- The three `noresult` runs (s1-03 H-1, s1-03 W-3, p8e B-2), their arms and their grades' status counts (all `error` on the fix-commit oracle) were seen before ruling 3's score rule was written; the rule restates step 13 ruling 4 and `table`'s code, a line without these runs is printed beside H1, H2 and H4, and a timed-out grade counts against the arm whose product it was — source: 2026-11-18-bench-analysis.md, "Seen before these rulings were written" and "Known limits"; 2026-10-27-benchmark-prereg.md, "Applied at step 14", "Seen before these rules were written".
- H5 is one porter draw per bug: the store-overlap rerun moved 2 of its 6 re-ported bugs from not applicable to caught on fresh draws, so `na` and `caught` carry porter variance in every row — source: 2026-11-18-bench-analysis.md, "Known limits"; step13-lock.md, Open points for step 14 and Known limits.
- H5's mutation score is not measured (step 13 decision 4 (a)); the report lists it as not measured — source: 2026-11-18-bench-analysis.md, ruling 8 and "Not in this plan"; 2026-10-27-benchmark-prereg.md, "Applied at step 13", "Not in step 13".
- The per-layer measures and discovery replays of 8.4 are not measured; this moves 8.3 ruling 11's "the change to `agent-replay` belongs to the plan of step 13" to a later plan (step 13 decision 5 (a)) — source: 2026-10-27-benchmark-prereg.md, "Applied at step 13", "Not in step 13"; 2026-11-18-bench-analysis.md, "Not in this plan"; step13-lock.md, Open points for step 14.
- Section 13 items 3 to 5 (the rerun of grading from stored products and of 3 tasks, the cold setup on s1-09, s2-09 and s3-07, the blind rating of 20 H/B pairs) moved to a step 15 plan by the user's decision 1 (a), so section 13 acceptance is not judged — source: 2026-11-18-bench-analysis.md, Decision 1 and ruling 11; 2026-10-27-benchmark-prereg.md, "Applied at step 14", "Scope (decision 1 (a))"; step13-lock.md, Open points for step 14.

## Counts

"Matches" is the number of lines matching `step 14` or `deviation` (case-insensitive) in the file; "Items" is the number of lines of this file that cite the file as a source. One item may cite several files, so the Items column does not sum to the total; Items can exceed Matches because a single matching header line ("Deviations") opens a numbered list of items.

| Source | Matches | Items listed |
|---|---|---|
| 2026-10-27-benchmark-prereg.md | 36 | 50 |
| step3-lock.md | 0 | 0 |
| step4-lock.md | 0 | 0 |
| step5-lock.md | 0 | 0 |
| step6-lock.md | 0 | 0 |
| step7-lock.md | 3 | 0 |
| step8-lock.md | 6 | 5 |
| step9-lock.md | 11 | 12 |
| step10-lock.md | 5 | 3 |
| step11-lock.md | 1 | 4 |
| step11a-lock.md | 9 | 26 |
| step12-lock.md | 1 | 4 |
| step13-lock.md | 9 | 17 |
| 2026-11-18-bench-analysis.md | 14 | 6 |

Items per step: Steps 1 to 7: 0; Step 8: 5; Step 9: 13; Step 10: 3; Step 11: 29; Step 12: 3; Step 13: 16; Step 14: 6; total 75.

Matches judged not a deviation (one line why each):

- 2026-10-27-benchmark-prereg.md, section 7.3 ruling 9 (the `d` rule): says "the same reading is what H4 means at step 14"; a rule for the analysis, not a departure.
- 2026-10-27-benchmark-prereg.md, "Applied at step 7", `kills` runs in this step, not at step 14: a registered schedule choice, no rule departs.
- 2026-10-27-benchmark-prereg.md, "Applied at step 7", sb-s2-07-4 "step 14 may leave it out": an option that step 14's plan takes as a printed side rate, not a departure (the same in step7-lock.md Rulings 16 and Known limit, and its "step 14 filters `of > 0`" line).
- 2026-10-27-benchmark-prereg.md, "Decided by the user on 2026-11-08" (step 9, decision 1, option A): "step 14's report lists" every prompt the user gives a design session; a report duty, not a rule change, and no prompt list is in the files read (the report must still carry it).
- 2026-10-27-benchmark-prereg.md, sections 12 step 14 line ("report every deviation from this plan"), the "Applied at step 13" sealing bullet ("per-run score table is step 14's first act"), and the "Applied at step 14" header and closing lines: the rule itself or a statement of order, not a deviation.
- 2026-10-27-benchmark-prereg.md, "Applied at step 14" Scope and Sets bullets: restate step 11 and step 14 items already listed above (merged, not counted twice).
- 2026-10-27-benchmark-prereg.md, "Decided by the user on 2026-11-11, at the step 11 lock", second sentence (Phase B plan approved; trial per-task lines went to the plugin-design session, sigma_d withheld): consistent with decision 4 (a), not a departure.
- step13-lock.md, lines on "No rate (step 14)", "Open points for step 14" (header) and "H3's interventions: `report` dropped the per-arm sum": open points for step 14's analysis, not deviations (the open points that are deviations are in the Step 14 section above).
- step11a-lock.md, ledger lines naming the turborepo exclusion, the 7.1 gate, and the PRIVATE_SET rulings: repeats of Deviations 12, 15 and 17 (merged), as are its two Known-limits lines on the stick (merged into the Step 10 item).
- step9-lock.md and step10-lock.md lines that repeat step 8 deviation 2 or the stick decision (step9-lock.md Checks lines on the pairs, step10-lock.md lines 27 and 28): repeats of items above (merged).
- 2026-11-18-bench-analysis.md, the 8 matches outside the Seen before paragraph, Known limits and the Rulings text (goal, spec, Task 0, Task 3 and Task 5 wording, the "step 11 deviations" citation at line 39): they describe this plan's own work or cite items already listed, not new deviations.
- step8-lock.md header line 3 and the pairs lines: repeats of Deviations 1 and 2 (merged).

Source I could not reconcile: the prereg lists the step 9 gate consequences and the `partly` rule as deviations, while step9-lock.md Deviations 10 calls them open rulings and not deviations; both are kept as one item with the disagreement named.
