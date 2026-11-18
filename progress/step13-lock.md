# Step 13 lock: the scored runs

Written 2026-11-18 by Task 7 of `docs/plans/2026-11-11-bench-scored-runs.md`. Rulings: prereg section 13 ("Applied at step 13") and its amendments at step 13 (H5; pre-flight; two lanes; Task 5, the third grade; Task 6, the order). Branch `bench-step13` from `main` (`6fbbf1e`); nothing pushed. `<data>` = `.evidence/bench`. Ledger: `.superpowers/sdd/2026-11-11-bench-scored-runs/progress.md`.

Every number comes from status and count lines in `<data>/logs/step13/` (`runs.out`, the `grade=` labels of `run-<task>.out`, `report.out`, `report-24h.out`, `h5.out`, `h5-counts.out`, `h5/lane.out`, `third/third.lines`, `pilot/lines`, `pre/lines`, `suite-ends/lines`, `aged/lines`, `lock/{hash,compare,self,self-2}.out`, `tests-1.out`, `tests-3.out`), from run record fields, or from structural grade fields (junit, readiness, all-error). No transcript, product, oracle, check, seeded bug, grade output or porter reply was opened; the exceptions are listed under Deviations.

## The runs (Task 5)

2026-11-12 13:49 to 2026-11-17 22:40, two lanes (the pilot's four criteria met; kept at the 24-hour check by the user). 38 tasks in `queuePick` order (`order.out`): 29 external (H, B, W, k = 3) and 9 real-estate (H, B, k = 3).

`bun bench/scored.mjs report` (`logs/step13/report.out`, after the third grades):

| set | arm | standing | machine | `noresult` | CLI (records) | tokens | minutes |
|---|---|---|---|---|---|---|---|
| external | H | 87 | killed 2 | 1 | 2.1.318 (87) | 2,425,737 | 2,820.9 |
| external | B | 87 | none | 0 | 2.1.318 (87) | 890,350 | 698.7 |
| external | W | 87 | none | 1 | 2.1.318 (87) | 2,567,199 | 2,190.8 |
| real-estate | H | 27 | none | 0 | 2.1.318 (27) | 2,657,920 | 2,657.9 |
| real-estate | B | 27 | none | 1 | 2.1.318 (27) | 2,070,966 | 2,061.6 |

- **315 standing runs**, every slot filled. Over all 317 step 13 records (H, B, W above the floor, standing and machine): `models` `["claude-opus-5-5"]` 315 and `[]` 2 (the two killed s3-11 runs, no turn finished), `probeModels` `["claude-opus-5-5"]` 317, `fallback` null 317, `version` 2.1.318 317. The `B-` records the loader also lists (52, Sonnet and Haiku) are files of 2026-11-06/07, an earlier step's; no step 13 slot reads them.
- **Machine runs: 2**, both s3-11 H (H-2, H-3, `status=abandoned machine=killed`), killed by the controller's diagnostic grades (see Stops); H-4 and H-5 took their slots.
- **`noresult`: 3**, all a readiness `timeout` on both grades, standing as registered (a timeout is graded once more; the second result stands, scores 0): s1-03 H-1 (`41df55b`), s1-03 W-3 (`93ca515`), p8e B-2 (`f63c791`, a 7 h run). The real-estate one was told to the user.
- **The third grade** (amendment 2026-11-14): after the last run and before the remaining H5 tasks, every `noresult` was listed again; three met all three conditions (both attempts a failed make, counted by `grep -c` of oracle-run's "the product image was not made" line; no build or dependency file changed from the record's `envCommit`): s2-05 H-3 `ff89719`, s2-03 W-3 `6cb0a09`, s2-03 B-5 `fe132fe`. `third/third.sh` set each picked sha's attempts 2 → 1 and ran `scored.mjs run <task>`: all three `again` (good on the third grade). Not picked: the three timeouts above (not a failed make). `report-before.out` and the attempts files before are kept in `logs/step13/third/`; `report-before.out` against `report.out` differs only in external `noresult` (H 2 → 1, W 2 → 1, B 1 → 0).
- `again` labels (a good second or third attempt after a failed make) occur only on s2-05 and s2-03, the two cherry-studio tasks.

## Stops and their answers

| when | lane, task | stop | answer |
|---|---|---|---|
| 2026-11-12 21:32 | a, s3-11 | `exit 3`, `machine` | The controller's diagnostic grades on s3-11 ran while lane a held s3-11; oracle-run's cleanup removes every recorded Docker object of the task, which killed H-2 and H-3 mid-run. Cause of the first `noresult`s (fixed by the user's decision "fix the make, regrade"): the recipe's post-COPY nextest append was committed by every product and appended again by the product make. Guard added in `ext/tasks/maplibre__martin__3365/rebuild.json` (new) and line 12 of s3-06's `rebuild.json`; ends equal to their locks (14/14, 13/13); s3-11's attempts reset; lane a restarted 22:43. Every s3-11 product then graded `ok`. |

No other stop: no `PGSNAP CHANGED`, no `refused` or `api`, no second `claim` failure. Two pauses (`step13/pause`), both taken between tasks: 2026-11-12 21:28 to 22:43 (the s3-11 stop, until the user's decision) and 2026-11-15 15:18 to 19:27 (the user's quota for this session).

## H5 (Task 6)

The porter brief `<data>/briefs/porter.md`, frozen before the first H5 run: sha256 `c23994edf579a452ab6a4e7cac649082b0d13195f78732f681671e1e07e94f87` (the manifest holds the same). The early start on the 27 settled external tasks (amendment 2026-11-17) began with an s1-01 canary that met every mechanical criterion (exit 0; 3 lines with `bugs=3`; no `refs/h5/` in the arm store, 3 in the sealed repo; no s1-01 Docker object left; p6a's run box untouched). Then two lanes (`h5/lane.sh`, one task per lane by `mkdir` claim, a lock for the private set and one for s2-08/09/10), 2026-11-17 15:20 to 2026-11-18 17:55.

`h5/runs.txt` (regenerated after the third grades): 114 rows (38 tasks × 3 H runs). `h5.out`: 114 count lines, one per row, no duplicate, none missing. pgsnap equal before and after each of the 9 real-estate tasks.

| set | H runs | bugs read | caught | miss | not applicable | refused | not ready | no suite | ported |
|---|---|---|---|---|---|---|---|---|---|
| external | 87 | 261 | 119 | 49 | 78 | 15 | 0 | 0 | 155 |
| real-estate | 27 | 27 | 16 | 5 | 6 | 0 | 0 | 0 | 17 |
| all | 114 | 288 | 135 | 54 | 84 | 15 | 0 | 0 | 172 |

Each bug is exactly one of caught, miss, not applicable, refused, not ready, no suite; the sums hold in each set. No rate (step 14).

No P grade in H5 was all `error` (the rows' `at` fields counted, 114 files): only s3-06 has one check `error` at P, the same in its three runs. 27 rows are wholly not applicable (`na` = bugs), none from an error at P.

**The shared-store groups were not enforced in H5.** The plan has H5 run "with the same exclusions"; `h5/lane.sh` locked the private set and s2-08/09/10, but not the store groups of `step13/exclusive.json` ([s1-05, s1-07], [s2-02, s2-10], [s2-03, s2-05]). s1-05/s1-07 and s2-03/s2-05 ran one after the other. **s2-02 (h5b, 22:53 to 01:55) and s2-10 (h5a, 01:46 to 02:13) overlapped for 9 minutes** on the xum store; s2-10's H-1 and H-2 (rows written 01:50, 01:53) fall inside it. Mechanical evidence: both exit 0; no P grade all `error` in either; `refs/h5` in `seeded/repos/coder__xum.git` 3 per run of s2-02 and 3 for s2-10 H-3, 0 for s2-10 H-1/H-2, which matches their count lines (no port reached on a run whose 3 bugs were not applicable at P). s2-10 H-1 and H-2 read `na=3` (not `error`). Whether to accept them or rerun them alone is the user's (see Approval).

## The manifest

`bun bench/stick.mjs hash --out <outside <data>>` (2026-11-18, after H5, before the lock's own logs): files 35,968 (left out: link 47, node_modules 1, store 2,108, secret 8, transcript 911, rewritten 88, special 0). Manifest `progress/stick-v1-step13.sha256`, sha256 `9e1d4dba06513be1d222614b1d2a8c41f73f1a81b7a25c8f9c7d5846f9aaf201`. Self-compare: hashed 35,968, equal 35,968. Against `progress/stick-v1-step12.sha256` with `progress/step13/reasons.tsv`: hashed 25,171, equal 25,152, **changed 19, missing 0, unexplained 0**:

- `seeded/repos/real-estate.git/objects/info/alternates` (1): ruling 9, `box-env --seeded` adds the arm store (predicted);
- `ext/sealed/*/logs/rebuild-*-current-1.make.log` (17): rewritten by `ext rebuild` at Task 4 (s1-02's rebuild round and the aged-serve check, 2026-11-12);
- `ext/tasks/nautechsystems__nautilus_trader__4813/rebuild.json` (1): s3-06's guarded nextest append (the s3-11 stop's answer).

Ruling 12 expected `changed 0` beside the alternates line; the 18 others are a deviation, each traced to a ledger entry made when it happened (the 8 slugs of the 17 logs appear in `aged/lines` or are s1-02's rebuild; mtimes 2026-11-12 10:17 to 13:45; s3-06's file 21:48). The 17 logs were rewritten by the controller's own rulings (s1-02's rebuild round, the aged-serve check), not a user decision; step 12 ruling 6 says a change to a manifest file outside step 13's outputs stops for the user, and it did not stop: the user first sees it here. Their reasons were written into `reasons.tsv` after the first compare showed them unexplained. New files include the step 13 records, grades, attempts, `step13/`, `env/box-seeded/`, `briefs/porter.md`, `ext/tasks/real-estate/suite.sh`, s1-02's `suite.sh` and `rebuild.json` (its rebuild round), s3-11's `rebuild.json`, and `logs/step13/` (with `runs.sh`, `h5/gen.sh`, `h5/lane.sh`, `third/third.sh`). `logs/step13/lock/`, `tests-2-wrong-scope.out`, `tests-3.out` and `pg-lock.txt` were written after the hash and are new files to it; a second self-compare after them (`lock/self-2.out`): hashed 35,968, equal 35,968, changed 0.

Recheck: `HSTACK_BENCH_MACHINE=<data>/machine.json bun bench/stick.mjs compare progress/stick-v1-step13.sha256`.

## Checks at the lock

- Suite `tests-3.out` (`bun test ./tests`, the package's script): 674 pass, 65 skip, 0 fail, pristine. A first run as bare `bun test` (`tests-2-wrong-scope.out`) also collected `fixtures/electron/e2e/app.spec.ts` (no `@playwright/test` installed: 1 fail, 1 error) and is not the suite. `git status --short bench tests` empty.
- Sealing grep over `git diff main..HEAD` for check ids (`-T<n>`): 2 matches, both test fixture ids (`aaaaaaa-T1..T3` in `tests/bench-h5.test.mjs`); the new manifest's 3,426 matches are the same paths as the step 12 manifest's (0 new).
- Docker: the 327 `bench-ext-fx*` fixture containers of 2026-11-02/03 and the decoy `bench-ext-other`, as earlier locks list them; the standing real-estate env (`postgres`, `mailpit`); `bench-arm/proxy:1`, `bench-arm/fw:1` kept; no run, grade, probe or H5 container left.
- pgsnap at the lock (`pg-lock.txt`) equal to step 13's first snapshot (`pg-suite-before.txt`, 2026-11-11) and to every task's before and after.

## Deviations (listed for step 14)

1. **The grade path was recreated** (Task 4): every grade env file runs `oracle-run` from the Phase A worktree that step 12's housekeeping removed; it was recreated at its path, detached at `main` 6fbbf1e (`bench/` equal to 7611de2). s1-11's end and the pilot's ten grades proved it grades as the lock.
2. **Sealed make logs rewritten** (17) and **s3-06's `rebuild.json` changed** (manifest, above); `rebuild.json` of s3-11 new.
3. **s1-02's environment**: `suite.sh` adding `pg_trgm` (the user's answer); its 22 DB cases still fail at base and end in the file's own fixture and never count. s1-02's offline make needs a fresh serve image; one `ext rebuild` round fixed it; the 16 other external tasks without `rebuild.json` passed the aged-serve check.
4. **The controller killed two runs** (s3-11 H-2, H-3) with its own diagnostic grades on a task a lane held; their tokens are spent. Rule since: no controller grade of a task a lane holds.
5. **Seen beyond status lines:** s1-02's base traceback lines and base make-log tail (the base is readable by Task 3's rule); one grade summary line (s1-02 B-4); s1-03's per-product count lines (`run-s1-03.out` printed whole); one count line each of s2-03 and p8c (`tail -2`); `grep -c` of the make-failed line on sealed oracle-run logs and `ls -l` sizes of sealed make logs (s2-05, s2-03, s3-11); `git diff --name-only` of s2-05 and s2-03 arm products (file names only); for the s3-11 stop, the `.config/nextest.toml` change of two arm products (`8c0700b`, `f96241c`, found identical, one reused in a sealed experiment commit on the end's tree) and a scan of the external recipes for post-COPY appends. No decision used a count line.
6. **A read of s2-05's task recipe make lines** was refused by the permission classifier and not retried.
7. **The pause file** was first created at `logs/step13/pause` by mistake and moved a minute later to `step13/pause`, the path `runs.sh` reads.
8. **The third-grade rule** was registered during Task 5 (after s2-05, before any extra grade), on the user's decision; it moved three products from `noresult` to good.
9. **H5 began before Task 5 ended** (amendment 2026-11-17), on external tasks whose products were all settled; s2-05, s2-03 and the real-estate tasks ran after the third grades and p6a. The user's free-text answer to the question ("don't worry about quota, I only need fast and accurate") was read as consent; the user was told so.
10. **H5 make flake: no extra retry** (a controller ruling; the plan had been to ask the user before s2-05 and s2-03): `h5.mjs` grades P twice and P + edit once more when not ready. A failed make at P would read all `error` and land in not applicable; no P grade in H5 was all `error`, and `notready` (P + edit) is 0.
11. **`oracle.mjs` exports** `once`, `resultIn`, `hasResults`, `notReadyOf` for `h5.mjs` (Task 2), and the seeder's edit gates moved into a shared `editCommit` (`seedCommit` unchanged).
12. **Run minutes under two lanes** are not comparable with the trial's single-lane minutes (known limit of the two-lane amendment).
13. **H5 did not enforce the shared-store groups**; s2-02 and s2-10 overlapped 9 minutes (H5 section).

## Open points for step 14

- The analysis per sections 9–10, H4 first (W against H); `scored.mjs table` opens only once `<data>/step14/registered` exists.
- 13.3's rerun; 13.4's cold setup read from H's transcripts on s1-09, s2-09 and s3-07; 13.5's blind rating.
- The per-layer measures (decision 5 (a)): H−layer variants and discovery-layer replays belong to a later plan; the run transcripts are kept.
- H5: rate and its denominator (not applicable and refused out), the 3 `noresult` products' effect on the scores, mutation score not measured (decision 4 (a)).
- H3's interventions: `report` dropped the per-arm sum (M-2) until step 14.
- Deferred minors in the ledger (Tasks 1, 2, 2b and the final review).

## Known limits

- The token is the one given at step 12, not revoked (the user's decision).
- `again` exists only on the two cherry-studio tasks: their product make is flaky offline; a third failure would have stood.
- The step 12 limits stand.

## Approval

Pending. Decided without the user, for the user to accept or overturn:

1. The early-H5 consent read from the user's free text (deviation 9).
2. No extra H5 retry for a make flake (deviation 10), where the plan had been to ask.
3. The 18 manifest changes beyond the predicted one, explained in `reasons.tsv` after the compare (the manifest).
4. s2-10 H-1 and H-2, run during a 9-minute overlap with s2-02 on a shared store: accept, or rerun them alone (minutes; a porter is called only for a bug whose check passes at P).
