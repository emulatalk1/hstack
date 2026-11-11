# Step 11 lock

Written 2026-11-11 after Phase B's trial (Tasks B1–B4 of `docs/plans/2026-11-10-bench-trial-phase-b.md`, status `draft` until the user approves). Phase A is locked in `progress/step11a-lock.md`. `<data>` = `.evidence/bench` (gitignored, in the main checkout). Rulings: prereg section 12, "Applied at step 11" (rulings 1–14, decisions 1–6) and "Decided by the user on 2026-11-10"; the Phase B plan's decisions, answered by the user on 2026-11-11 ("Theo advisor suggestions": the plan approved and (a) of decisions 1–3), and its three controller rulings. Branch `bench-step11b` from `main` (5211cfb); nothing pushed.

Every number here comes from count lines in `<data>/logs/step11b/` (`plugin-export.out`, `arms-check.out`, `b1.out`, `b2.out`, `report.out`, `compare.out`, `tests-1.out`, `tests-2.out`), from `trial/report.json`, or from run record fields (CLI version, plugins, model, `machine`, proxy counts). No transcript, product, grade output, oracle or check was opened.

## Result

- **The plugin:** `hstack`, commit `653af835fd613e3eb25feb48e4ccc9bfb534ae6e` (branch `plugin-design`, pinned by `refs/bench/plugins/hstack-653af83`), paths `.claude-plugin agents hooks scripts skills`, export 21 files, sha256 `727d67815bf9445672d37a52738f7729a04cee1e0383256c107f60130c271843`, dependencies none. Recorded in `arms.json` `plugins.H` (`repo` `../..`); `plugins.W` `[]`.
- **The trial ran** 2026-11-10T21:42Z to 2026-11-11T05:30Z (7 h 48 min), 8 runs, all `done`, every product graded `ok`, no machine run, no refusal.
- **σ_d = 0.083** over the 4 tasks (σ_d over the 2 external tasks 0.000, deciding nothing). **N = 24** (σ_d ≤ 0.25). H1's N = 24, so **no walk** (B3 skipped).
- **Not analysed:** no H1–H5 statement, no interval (ruling 12).

## B1: the plugin in the box

- Export through `pluginExport` outside `<data>`: files 21, none under a repo-only path; `loadArms` accepts the entry and the loaded entry's export gives the recorded sha256.
- `trial/tasks.txt`: s2-01, s3-02, p8b, p6c (decisions 1 and 2); each passes `trial.mjs`'s gate (step ids 3, 5, 12, 8).
- H's probe on each trial box (one `Reply OK.` turn under `bypassPermissions`, web tools off, a 1800 s limit, `probeOk('H', …)`): s2-01, s3-02, p8b, p6c each `turn exit 0 plugins ["hstack"] web 0 askUser 0 probe ok`. PGSNAP equal around p8b and p6c. This was the first run of the plugin under the box's permission mode (the designer's e2e used `dontAsk`).

## B2: the trial

Order s2-01, s3-02, p8b, p6c (controller ruling 1); within a task `queuePick` (ruling 12). Every run: CLI 2.1.318, `claude-opus-5-5`, `machine` none; H's record lists `hstack@653af83`, B's none. Proxy counts: refused 0 on every run (allowed: s2-01 H 227, B 27; s3-02 H 84, B 14; p8b H 336, B 136; p6c H 394, B 176). B's run numbers are 3 on s2-01 and s3-02 (the canary's runs 1–2 are under the trial floor) and 1 on p8b and p6c.

`trial.mjs report` (`report.out`):

| task | arm | run | build | requirement | passed | tokens | cache read | minutes | interventions | end |
|---|---|---|---|---|---|---|---|---|---|---|
| s2-01 | B | 3 | 1.00 | 0.91 | yes | 13,296 | 3,671,556 | 9.8 | 0 | done |
| s2-01 | H | 1 | 1.00 | 0.91 | yes | 39,801 | 15,698,137 | 41.5 | 0 | done |
| s3-02 | B | 3 | 1.00 | 1.00 | yes | 3,919 | 334,528 | 0.9 | 2 | done |
| s3-02 | H | 1 | 1.00 | 1.00 | yes | 15,405 | 1,880,829 | 22.5 | 0 | done |
| p8b | B | 1 | 0.43 | 0.00 | no | 81,287 | 23,037,350 | 38.7 | 1 | done |
| p8b | H | 1 | 0.43 | 0.21 | no | 95,207 | 28,440,526 | 118.4 | 0 | done |
| p6c | B | 1 | 1.00 | 0.50 | yes | 120,821 | 34,662,095 | 92.1 | 0 | done |
| p6c | H | 1 | 0.83 | 0.50 | no | 146,149 | 46,609,659 | 74.6 | 0 | done |

`d_t = build(H) − build(B)`: s2-01 0, s3-02 0, p8b 0, p6c −0.167. Last line: `trial sigma_d=0.083 sigma_d_ext=0.000 n=4 N=24 h1_n=24 walk=no`.

Totals (`report.json`): B tokens 219,323, cache read 61,705,529, cache write 1,331,856, 141.4 min; H tokens 296,562, cache read 92,629,151, cache write 4,020,457, 257.1 min.

**Cost against section 11 and the plan:** the plan estimated 10–15 hours for the trial (H on a real-estate task up to 8 hours a turn); it took 7 h 48 min of wall clock, 6 h 39 min of arm time. Section 11's estimate of 5 hours for H on a plan-sized task: H took 1 h 58 min on p8b and 1 h 15 min on p6c.

## What went to the designer

The 8 per-task and per-arm lines of `report.out` (build, requirement, passed, tokens, cache, minutes, interventions, end), with cache write per run added, sent on 2026-11-11 after the report was judged, at the user's request ("Không tự chuyển qua được à?"), by a cross-session message from this session to the plugin-design session, which had asked for them with the σ_d line; the σ_d line was withheld (decision 4 (a), controller ruling 3). Not σ_d, N, a transcript, a product, a check id or a probe reason. One fact about the export's run-time needs is kept in `<data>/logs/step11b/handover.md` (gitignored), not relayed (decision 2 (a)); its content is stated in the step 12 lock, after the plugin is locked.

## B3: the walk

`walk=no`; nothing walked, no new manifest.

## B4: checks at the lock

- **The token:** not revoked, by the user's decision of 2026-11-11 ("không cần thu hồi"; prereg section 12, "Decided by the user on 2026-11-11, at the step 11 lock"), against ruling 13. `<data>/arm/box.env` exists (mode 600), unread; it is never given to a subagent or a box. Which token a later step uses is that step's plan's to register.
- **The stick:** `stick compare progress/stick-v1-step11.sha256` (`compare.out`): hashed 24,911, equal 24,910, changed 1 (`arms.json`, B1's entry), missing 0. The compare ran with no reasons file, so the tool prints that one line `unexplained` and exits 1; it is the change the plan expected. The trial's records, grades, product refs and `trial/` are new files; transcripts and `*/docker.json` are left out by `stick hash`.
- **Tests:** `bun test ./tests` (`tests-1.out`): 636 pass, 64 skip, 2 fail, both in `tests/okf.test.mjs`, one cause: `5211cfb` (on `main`) set the Phase A plan `stable` without a `human:` verified entry, which the docs bundle check requires. Fixed by adding `{ by: human:emulatalk1, at: "2026-11-10T21:05:02+07:00" }` (the time of the approval commit; the user approved Phase A on 2026-11-10) in `e9490d3`. Rerun (`tests-2.out`): 638 pass, 64 skip, 0 fail. `git status --short bench tests` empty.
- **Docker:** no trial container or proxy left; the two `bench-arm/` images (`proxy:1`, `fw:1`) are Phase A's, kept. PGSNAP equal around B1 and B2.

## Accepted minors (decision 1 (a))

- `listens()` has no retry: no run ended `machine killed` (0 reruns).
- A P OOM reads as O's timeout: no p8b or p6c grade read `noresult` or a timeout (0 told).
- `--extra-round` per invocation: no rebuild round ran in Phase B (0 calls).

## Deviations (listed for step 14)

1. The standalone H probe of B1 used a 1800 s turn limit, a controller parameter of the probe only; the runs kept the set's `turnTimeoutSec`.
2. A fact about the plugin was withheld from this repository and kept in a gitignored note, so that decision 4 holds after a merge (decision 2 (a)).
3. The Phase A plan's missing `human:` verified entry was added in this branch (a fix to `main`'s state, not a rule). The user approved Phase A in chat on 2026-11-10 ("Duyệt", recorded in `progress/step11a-lock.md`); the entry records that approval at the time of its commit.
4. **The token is not revoked** at the step 11 lock (the user's decision of 2026-11-11, against ruling 13 and decision 3 (a)); `box.env` is kept.

## Open points for step 12

- Arm W and the plugin lock (step 12). The plugin designer may have changed `plugin-design` since `653af83`; step 12 locks whichever commit the user gives, and the pin ref keeps `653af83` reachable for this lock.
- The trial tasks are now seen by the designer through their scores (4.2 ruling 13).
- The content of `handover.md` goes into the step 12 lock.
- Phase A's open points that are not Phase B's stand: step 13's `grade --reuse` key, s1-11's nondeterministic make, M3 open where `shared` or in-process.

## Known limits

- **σ_d from 4 tasks at k = 1 is a rough estimate;** three of the four d_t are 0, so σ_d rests on p6c alone. N never drops below 24.
- **M3 open on s2-01** (`grade-mode` = `shared`) **and s3-02** (no served interface); closed on p8b and p6c.
- **Interventions are resume turns** (step 8): s3-02 B 2, p8b B 1.
- **s3-02 B, a note for steps 12–13 (record fields only, no judgement):** 52 s from start to end; turns probe, main, resume-1, resume-2, each exit 0, none timed out; both resumes `other`; tool uses Bash 10 and no other tool; output tokens 3,889; build 1.00, requirement 1.00. Why it ended so fast is not readable under the sealing rule; the record is the measurement.
- The Phase A lock's limits stand.

## Review

The branch changes docs and progress files only (no `bench/` or `tests/` file), so no whole-branch subagent review ran: the advisor reviewed the plan before B1 and this lock before approval, and a sealing grep over `git diff main..HEAD` for the handover note's file names, its runtime line and check ids (`-T<n>`) found 0 lines.

## Approval, 2026-11-11

The user approved the step 11 lock (advisor review, then "Theo advisor suggestions": σ_d not relayed; merge and push), with the token kept ("không cần thu hồi"). The Phase B plan is `stable`; `bench-step11b` is merged into `main` (fast-forward) and pushed with `main`. The pin ref `refs/bench/plugins/hstack-653af83` stays local.

## Usage

The trial's arm usage is above. The controller session's own usage is not recorded. No subagent ran in Phase B.
