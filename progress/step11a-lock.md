# Step 11 Phase A lock

Locked 2026-11-10, after the proofs, the third full regrade, the walk, the reader and the amended manifest (Task 14). `<data>` = `.evidence/bench` (gitignored, in the main checkout). Plan: `docs/plans/2026-11-08-bench-trial.md` (Tasks 1 to 14; status `draft` until the user approves Phase A). Rulings: prereg section 12, "Applied at step 11" (rulings 1–14 and the user's decisions of 2026-11-08) and "Decided by the user on 2026-11-10" (four paragraphs), plus the controller rulings listed below. Branch `bench-step11` from `main` (6d8bee6); nothing is merged or pushed. This lock is written at `39dace4`, the last commit before it.

Every number here comes from the tools' count lines archived in `<data>/logs/step11/` (`regrade-compare.out`, `apply-decisions.out`, `walk.tsv` rows, `seed11.out`, `tests-1.out`, `lock-usage` output, the hash and compare outputs) or from the SDD ledger of this build (copied into `progress/progress.md`). No oracle, check, seeded bug, reply, label, page, answer or transcript was opened to write this lock. The sealing notes of the build are under "Rulings of the controller" (the `Record:` of Task 12a).

## Result

- **The five carry-overs of step 10 ruling 9 are closed as far as the plan allows:** I1 (the product image, with rebuild rounds), M3 (only where split mode holds, decision (C)), M1 (readiness per oracle), I2 (the proxy, form A, no fallback) and the real-estate host run (real-estate graded and boxed in containers with their own Postgres). Details under "The carry-overs".
- **The regrade ran three times in full** (Tasks 12c and 12d changed `oracle-run`, which repeats it by step 10 ruling 9). The third compares to the locks as: s1 8/8, s2 7/8 (+ s2-08 flaky, 1 of 2), s3 7/8, private set 9/11 unchanged. Five kinds differ: s2-08 (flaky), p8a, p8e (decision (A)), s3-08 (decision (B)). No difference is unexplained.
- **The walk added six tasks** (s1-10, s1-11, s3-09, s3-10, s3-11, s3-12); **H1's N is 24** (s1 8, s2 8, s3 8), counted as `trial.mjs` does.
- **The manifest is amended:** `progress/stick-v1-step11.sha256`, 24,911 files, sha256 `0b3c82776a00c462eb3c679d561c79f338ff3bf532d5e89cbbdcdf34efc55355`. Against `progress/stick-v1.sha256` with `progress/step11/reasons.tsv`: hashed 20,789, equal 20,777, changed 12, missing 0, unexplained 0.
- **The stick is still not validated** (step 10 lock; nothing in this step measures it).
- **Phase B needs a plugin commit** from the plugin-design session (ruling 2). The token in `<data>/arm/box.env` is kept for Phase B and revoked at the step 11 lock.

## The carry-overs

### I1: a product gets no more network than its arm had (Tasks 5, 12a, 12c, 12d)

- Built in Task 5 (ruling 4 of the plan): per task `S` (`<base7>-serve`) and `R` (`<base7>-runner-<osha8>`), a commit's image `<sha7>-product-<osha8>` made in a container from `R` under the arm's network rules (none for external), the base's tracked paths removed, the commit's export copied in, the rebuild lines run, the container committed. Ruling of the build: the product tag keeps `-<osha8>`.
- **Rebuild rounds** (Task 12a, a plan defect found at the first regrade: ruling 4 registered sealed rounds but no task built the tool): `bun bench/ext.mjs rebuild <task>`, serve's pattern, at most 2 rounds per task slug (the plan said per repo; see the ruling), the base's make log readable and the end's sealed. Results at the survey and the rebuild driver: passed with 0 rounds s1-02, s2-01, s2-03, s2-05; 1 round s1-01, s1-03, s1-04, s1-06, s1-09, s2-07; 2 rounds s3-06 and s3-08; s3-01 and s3-07 failed after 2 rounds and passed when their round-2 lines were validated again (the failures were transient, most likely BuildKit `ResourceExhausted` while two Docker jobs ran together; the parallel-run ruling was withdrawn); s3-02 failed at the end and passed once Task 12c fixed an mtime effect. The make survey (35 tasks): both makes ok 20, base fail 8, refused `USER` 6 (resolved by the `USER` no-op ruling), end-only fail 1.
- **Two defects of the overlay found by the regrade and fixed** (each changed `oracle-run` and repeated the regrade): `git archive` gives every file its commit time as mtime, older than the build outputs baked into the image, so a cargo or similar build saw the base's artifacts as fresh and the product graded as the base (s3-03; Task 12c touched every product file); touching every file made s2-03's build rebuild everything and need the network (Task 12d touches only the paths that differ between the base and the commit, with `touch -c`).
- **s3-08 could not be closed:** its make passes but its product behaves as the base at the end, after 2 rounds and an extra round; the user decided (B), see below.
- **A trusted end that needs a dependency its base lacks:** `deps.txt` counted 0 dependency files changed by the 24 external PRs (the 4 cold PRs included), and 0 for each walked PR. No end takes the networked trusted path, so the `trusted` column of the task list is empty.

### M3: the oracle in its own container where the interface is served (Tasks 6, 12; decision (C))

Closed **only where split mode holds** (the user's decision (C) of 2026-11-10):

- **Closed:** s1-10 (graded split, no `grade-mode`), s1-02, s1-04, s1-06, s1-09, s2-03, s2-09, and the private set (the 9 scored tasks plus p8b and p6c).
- **Open (`grade-mode` = `shared`, one container):** s1-01, s1-03, s1-05, s1-07, s2-01, s2-02, s2-05, s2-07, s2-08, s2-10, and the walked s1-11. s1-01's runner needs the product's files in its own container (every check changed in split mode, matched in shared); the others failed split at the regrade the same way or by ruling 5's route.
- **Open (no served interface, one container):** all of s3, the walked s3 tasks included.
- The driver's fallback twice wrote `grade-mode` shared for the shared private-set slug, which would have switched every later private task to one container; it was removed at once (and kept only until p8e's shared grades ended), and any private task graded shared in between was regraded split. p8a and p8e change in both modes, so the mode is not their cause.

### M1: readiness per oracle (Task 5; ruling 7)

`oracle-run` writes `<sha7>\t<osha8>\t<state>` to `<task>/build/readiness.tsv` and every reader takes the last line of its own commit and oracle (`notReadyOf` in `bench/oracle.mjs`). Closed. The walked s1-11's first validation read `not ready` in split mode.

### I2: the nested CLI and the token (Tasks 3, 4, 8, 11)

- **Task 3** built the proxy (`bench/proxy.mjs`): it forwards only `POST /v1/messages` and `POST /v1/messages/count_tokens`, refuses (403, counted) a tool with a set `type` other than `custom`, `mcp_servers`, `container`, and (a ruling of the build) any `source` of type `url`; it logs counts only.
- **Task 4, the probe with the real token** (received 2026-11-09, written to `<data>/arm/box.env`, mode 600, never printed): **form A** answers. The proxy takes `authorization` (Bearer) with the beta `oauth-2025-04-20`; the CLI's placeholder variable is `ANTHROPIC_AUTH_TOKEN`, with `ANTHROPIC_BASE_URL` at the proxy. `arms.json` gained `turnTimeoutSec` (external 14400, real-estate 28800) and the proxy form.
- **No fallback is used:** ruling 6's fallback (the token in the box) was not needed, so I2 is closed by the proxy. The proof output holds no token string (0 matches).

### The real-estate host run (Tasks 7, 8, 12)

Real-estate has the shape of an external task: a repo store `ext/repos/real-estate` (bare, alternates to the copy, `refs/tasks/<task>/{base,end}` for 11 tasks), one recipe, one serve layer (with `services`), one runner (`@playwright/test@1.58.2`). A product is graded in `P` (no network, runs `start`) and `O` (the oracle, `--network container:<P>`), each with its own Postgres 17 and a Mailpit sink in the image; pgsnap is taken around every real-estate lane and was equal each time. `env/real-estate.json` and `env/seeded/real-estate.json` stay byte-equal for step 13's trusted replays; `grade` refuses a bench ref when the task file's `start` is not null. At the regrade, 9 of 11 private-set tasks matched the host-graded locks; p8a and p8e did not, see "The regrade".

## The proofs (Task 11)

- **Step 1, s1-01:** the proof (Task 4's, rerun on this branch) 15/15 rows ok, exit 0, including 'the API answers' (real CLI turns on `claude-opus-5-5` and `claude-sonnet-5-5` through the proxy), 'no token in the box env', 'the proxy refuses a server tool', and the API addresses silent from the box.
- **Step 2, p8b (private set):** 17/17 ok, exit 0 (services are up, only the registry answers, a real database is out of reach); pgsnap equal; 0 token strings in the output.
- **Step 3, plugin fixture:** a throwaway repo with 2 files (sha256 `45cebc06cd7c…`) through `pluginExport` into the s1-01 box: turn exit 0, init `plugins ["bench-fixture"]`, its skill listed, 0 web tools, `AskUserQuestion` absent; no container left.

## The regrade (Task 12)

**Three full regrades.** Driver `regrade.sh` (75 grades: ext 24 oracle + 24 seeded; real-estate 11 oracle + 7 step + 9 seeded), then `regrade2.sh` (split first; on a change, shared mode, and again). The first regrade's outputs are in `logs/step11/regrade-v1/`, the second's in `regrade-v2/`. Reasons: the first stopped on its 2-dead rule (the make failed offline: the rebuild tool did not exist, Task 12a); the second stopped at s2-03 after Task 12c; the third ran to the end on `b6ac0fc` (started 2026-11-09 20:48), PGSNAP equal.

**The third regrade against the locks** (`regrade-compare.out`, 76 lines; every task and kind `changed=0` except the rows below):

| set | unchanged | changed |
|---|---|---|
| s1 (8) | 8/8 | none |
| s2 (8) | 7/8 | s2-08 oracle 1 (22278be-T4); matched on its repeat: flaky 1 of 2 |
| s3 (8) | 7/8 | s3-08 oracle 3 and seeded 5 |
| private set (11) | 9/11 (p1 p2 p3 p4 p6a p8b p8c p8d p6c) | p8a step 1 (d1ea76b-T13); p8e oracle 1 (eb2b016-T7), step 1 (a9c2377-T15) |

p8b oracle (`nolock`, 20): trial-only, no lock grade to compare.

**Classification** (content-free: exit codes, file names, one repeat, a networked repeat of a trusted end):

- s2-08: one repeat (registered before it ran) matched the locks, 3/3 → flaky, 1 of 2. Changes nothing.
- s3-08: oracle 3 and seeded 5 changed again on the repeat; 2 sealed rebuild rounds plus 1 extra (3 in all); the make passes but the product is the base's. Cannot be rebuilt offline to match its end.
- p8a d1ea76b-T13 and p8e eb2b016-T7: pass with the app container on Docker's default network (network experiment: p8a step 14/14 same, p8e oracle 8/8 same) → need the network at run time.
- p8e a9c2377-T15: still changed with the network → differs in the container either way.

**The user's decisions, 2026-11-10 ("Theo đề xuất")**, applied by `apply-decisions.mjs` (`apply-decisions.out`):

- **(A)** p8a `d1ea76b-T13`, p8e `eb2b016-T7` and p8e `a9c2377-T15` leave the score by section 7.1 (a check must pass on the reference; under the step 11 grade environment these three do not). Step ids: p8a 14 → 13, p8e 14 → 13; p8e's scored fix-commit checks 6 → 5 (rule (b) still met). Compare after: changed 8, all with reasons, unexplained 0, missing 0.
- **(B)** s3-08 (pola-rs/polars#29923) is not gradeable offline and leaves H1–H4: `s3-08/step.json` ids → `dropped_ids`, status `dropped` in the task list. s3 walks 3 tasks, not 2.
- **(C)** M3 closed only where split mode holds (above).

## The walk (Task 13)

Drivers: `walk11.sh`, `pipe11.sh`, `chain11.sh`, `auto11.sh`, `count11.mjs`, `cold-restore.mjs`, `seed11.sh` (written new; the step 5 drivers name the step 5 worktree). The walk ran on `logs/step11/groups-walk.json`, a copy of `ext/groups.json` that differs only in `perStack`, raised one accepted task at a time. 2026-11-09T22:31Z (s3-09) to 2026-11-10T11:47Z (last kills).

| task | repo#PR | rank | pipeline notes | scored checks | step ids | seeded kept | kills fix= |
|---|---|---|---|---|---|---|---|
| s1-10 | django-helpdesk/django-helpdesk#1453 | 15 | serve 1 round, rebuild 1 round, 5 checks absent-at-base, 2 disputed | 5 | 1 | 3 | 2/3 |
| s1-11 | WeblateOrg/weblate#21513 | 17 | serve 1 round; first validations not judged (make flaky; split `not ready`); rebuild 1 round; grade-mode shared; 24 checks absent-at-base after 1 fixer round; split 3 partly → 6 | 25 | 1 | 3 | 3/3 |
| s3-09 | the-open-engine/zeroshot#944 | 16 | accepted at step 5, out of the sample by perStack; task-env by `--reply rounds/1.reply.md --sha` (meta.json predates recipeSha); 1 check, requirement | 1 | 0 | 3 | 1/3 |
| s3-10 | moonrepo/moon#2745 | 21 | valid 2, weak 2; build 2 | 2 | 2 | 3 | 2/3 |
| s3-11 | maplibre/martin#3365 | 23 | one disk error then ok; 14 checks absent-at-base; 3 disputed | 14 | 2 | 3 | 3/3 |
| s3-12 | jtroo/kanata#2117 | 24 | 1 check, build | 1 | 1 | 3 | 0/3 |

Scored checks and step ids are the `scored` and `h1_ids` columns of `progress/stick-v1/tasks-step11.tsv`. `kills` ran with `step=none` on all six. Every walked PR changes 0 dependency files, so no `trusted` flag. pgsnap was equal around all 11 walk runs and the serve runs.

**Out during the walk** (`ext/walk.tsv`):

| candidate | rank | result |
|---|---|---|
| fossasia/eventyay#6384 | 14 (s1) | PR tests do not pass at end |
| antiwork/gumroad#6391 | 16 (s1) | `out: issue not found` (controller ruling: issue 6185 does not exist on GitHub) |
| pnpm/pnpm#14077 | 17 (s3) | one disk error, then recipe failed |
| sozu-proxy/sozu#1325 | 18 (s3) | PR tests do not pass at end |
| vercel/turborepo#13756 | 19 (s3) | `out: docker disk too small` (user decision) |
| aaif-goose/goose#12006 | 20 (s3) | one disk error, then end build failed |
| databendlabs/databend#20352 | 22 (s3) | `out: base tree not exportable on this host` (controller ruling, told to the user: a case-insensitive APFS path collision under `tests/data/delta/`) |

**Rulings of the walk** (registered in the prereg with decisions (A)–(C), or listed under "Rulings of the controller"): `perStack` on a copy, `cold_setup` restored after each `sample` (the walked rows read `no`; the cold repos stay s1-09, s2-09, s3-07, s3-08), serve verdicts appended to `ext/step5-logs/serve.tsv`, a second queue folder `queue-2` if needed (not needed), `walked.txt` read by the trial driver.

**The reader** (queue `step11/queue`: `queue: classify 5, sample-7.1 20`; proxy on `claude-fable-5-1`, task file `env/real-estate.json` as step 9; 7.1 at `--chunk 5`, because the default chunk was 1.08 MB, over the 0.9 MB cap):

- classify 5 → build 1, requirement 4.
- oracle-7.1: same 17, different 2 (s1-11 57645e4-T13 and 57645e4-T29; neither is a step id), unclear 1. Gate: **s1 8/10 STOP** (n − 1 = 9 needed), s3 9/10 pass. The user accepted the s1 stop as a deviation: the two drops stay, s1-11 stays in the sample.
- `step` rerun on all six after the reader: ids s1-10 1, s1-11 1, s3-09 0, s3-10 2, s3-11 2, s3-12 1.

**Seed and kills** (`seed11.out`): every walked task kept 3 seeded bugs (s3-10 refused 1 candidate; s1-10 fixer 2, broken 2); kills `fix=` as in the table.

**H1's N is 24** (s1 8, s2 8, s3 8): sample rows with step ids > 0, as `trial.mjs` counts; s3-08 has none after (B). s3-09 has step ids 0 and stays in the sample for H2–H4.

## The task list (`progress/stick-v1/tasks-step11.tsv`, `tasks11.mjs`)

Columns of step 10 (`set task stack ref base end status canary cold h1_ids scored seeded reason`) plus `walked` and `trusted`. Count line: `tasks: external 33 (scored 29, dropped 1, retired 3, walked 6), real-estate 16 (scored 9, dropped 6, trial-only 1), h1 tasks s1 8 s2 8 s3 8 total 24`.

- s3-08 status `dropped`, reason: not gradeable offline (decision (B)). p8a `h1_ids` 13, p8e `h1_ids` 13, p8e scored 5 (decision (A)).
- The retired three (s1-08, s2-04, s2-06), the dropped six real-estate tasks and p8b (trial-only) are as in the step 10 lock.
- `trusted` is empty for all rows (no end changes a dependency file).

## The amended manifest and compare (ruling 11; `bun bench/stick.mjs hash`, `compare`)

- `stick hash`: files 24,911; left out: link 47, node_modules 1, store 1,314, secret 8, transcript 203, rewritten 88, special 0. Manifest `progress/stick-v1-step11.sha256`, sha256 `0b3c82776a00c462eb3c679d561c79f338ff3bf532d5e89cbbdcdf34efc55355`, written outside `<data>` and copied in. Self-compare: hashed 24,911, equal 24,911.
- `compare progress/stick-v1.sha256 --reasons progress/step11/reasons.tsv`: hashed 20,789, equal 20,777, **changed 12, missing 0, unexplained 0**. The 12: `arm/proof-s1-01.json`, `arms.json`, `ext/repos/fossasia__eventyay/shallow`, `ext/sample.tsv`, `ext/step5-logs/serve.tsv`, `ext/walk.tsv`, `p8a/step.json`, `p8a/step/oracle/manifest.json`, `p8e/oracle/manifest.json`, `p8e/step.json`, `p8e/step/oracle/manifest.json`, `s3-08/step.json`, each with its line in `reasons.tsv`. New files: 4,122 (24,911 − 20,789).
- Recheck: `HSTACK_BENCH_MACHINE=<data>/machine.json bun bench/stick.mjs compare progress/stick-v1-step11.sha256`.
- The step 10 lock carries a dated paragraph pointing here; nothing above it was changed.

## The user's decisions

- **2026-11-08 ("Theo advisor suggestion"):** every recommended default, (a) of decisions 1–6, and Phase B as a follow-on plan; build subagent-driven.
- **2026-11-09, the token:** given in chat; written to `<data>/arm/box.env` by the controller.
- **2026-11-09 ("a"):** a sealed diagnosis agent may read the end make logs of tasks whose rebuild failed and report only a category word and a one-line mechanism. The advisor then advised classifying content-free instead (exit codes, file names, networked repeats); the ledger records no run of such an agent.
- **2026-11-09:** speed-up options declined ("cứ để như vậy"): one Docker job at a time, Docker at 7.6 GB.
- **2026-11-10 (A), (B), (C)** ("Theo đề xuất"): see "The regrade". Registered in the prereg before the change each makes.
- **2026-11-10, turborepo:** vercel/turborepo#13756 ruled out as `out: docker disk too small` (a deviation).
- **2026-11-10, the general disk rule:** an s3 candidate that runs out of Docker disk again after removal by recorded names and `docker builder prune -f` is `out: docker disk too small` (registered at `900233e`; applied to goose#12006, which then failed its end build instead).
- **2026-11-10, the 7.1 gate:** the walked s1 gate stopped at 8 of 10; accepted as a deviation, the two `different` checks stay dropped, s1-11 stays in the sample.

## Rulings of the controller

Every ledger line that starts with `Ruling` (51), in order, with three inline rulings of the ledger (rows 41, 53 and 54), each with its cost if wrong (the ledger states it, or "none").

| # | ruling | cost if wrong |
|---|---|---|
| 1 | Task 5 calls the existing `fwScript(ips)` for a registry-limited make container; Task 8 changes it to `fwScript({out,in})` | one call site edited twice |
| 2 | Implementers never get the token, `<data>` write paths or real data; Tasks 4, 7.5, 11–14 and Task 2 step 4 run in the controller | none |
| 3 | The rule-bearing sentences dropped by Task 1 join fix round 1 as spec-missing | one extra short fix |
| 4 | Ruling 11's list (plan and prereg) is widened to name `packed-refs` and `shallow` files; `reasons.tsv` stays as is | a wider glob explains a store change it should not |
| 5 | Implementers tee their suite runs to the SDD workspace (`tests-task<N>.out`); the controller's go to `<data>/logs/step11` | none |
| 6 | Task 3's interface drops models and gains betas and the auth header forms, so Task 4's probe can try both CLI env forms | a header option unused |
| 7 | URL sources are refused by the proxy (reason `source`), registered in the plan and the prereg before any run | an arm that cites a URL image gets a 403, equally for every arm |
| 8 | Three fail-closed minors of the proxy join fix round 1 (`development:false` with a fixed 500 handler; `BENCH_PROXY_AUTH` only `authorization` or `x-api-key`; a non-array `tools` refused) | a slightly larger fix |
| 9 | Task order becomes 5, 6, 7, 9, 10, then 4 and 8 once the token arrives | none |
| 10 | The product tag keeps `-<osha8>` (ruling 4 says the tags carry the oracle) | none |
| 11 | The readiness readers in `bench/oracle.mjs` (`notReadyOf`) changed beyond the brief's file list are in scope (ruling 7) | none |
| 12 | Two cheap minors join Task 5's fix round 1: blank lines inside a `\` continuation, and whole-sha matching for the trusted gate | a slightly larger fix |
| 13 | `PRIVATE_SET` (`real-estate`, `re`) stays in `bench/ext.mjs`, listed as a deviation of "bench/ names no stack, customer or task" | one constant to move to a data file |
| 14 | Walked tasks are listed in `<data>/step11/walked.txt` (Task 13 writes it); the trial driver refuses them | one file |
| 15 | The trial gets its own record floor (`trial/floor.json`); only runs above it count; `gradeProduct` never removes a grade file of a commit that is not a trial run | none |
| 16 | Three minors join Task 9's fix round 1 (catch only `ScoreMissing`; `report` applies the same refusal gates; trim CR in `sample.tsv`/`tasks.txt`) | a slightly larger fix |
| 17 | Under `--queue` the 7.1 gate is ruling 10's (at least n − 1 `same`); step 9's 9-of-10 stays without `--queue`; classify-2 with `--queue` is a usage error; `queue --tasks` refuses an `--out` that already holds `pages/` | none |
| 18 | With `--queue` a 7.1 set of n = 1 always passes; a `different` answer still drops the check | one walked check read as different passes the gate while leaving the score |
| 19 | Task 8 goes ahead before the token arrives, assuming the proxy route works, with the probe's unknowns as config | Task 8's proxy wiring partly unused under the fallback |
| 20 | The `db !== null` refusal stays (box task files have db null; an env file with db set has the copy as repo) | none |
| 21 | `registry.npmjs.org` lives in `PRIVATE_SET` in `bench/ext.mjs`, listed with it as one deviation | one constant to move to data |
| 22 | The token is visible to `docker inspect` on the host (the host is trusted); a known limit | none |
| 23 | The `oracleRun` change (private-set products made with the pinned registry) is accepted before Task 12 and gets a unit test | none |
| 24 | Task 8's fix round 1 also takes the security minors (outside proxy check, proxy `StartedAt` in `alive()`, server started after its rules, earlier image ids kept, file mode in the plugin sha lines, export folder removed on every path, stale 'skipped' state) | a larger fix round |
| 25 | The plugin sha line records only git's mode (755 if any exec bit, else 644), not the machine's umask | none |
| 26 | Plan defect: Task 12a builds `ext rebuild <task>` (sealed rounds, base make log readable, end sealed), because ruling 4 registered rounds but no task built the tool; rebuild rounds: at most 2 per task slug (ruling 4 said per repo; ledger line of Task 12a's dispatch) | one tool and up to 2 sealed rounds per failing task |
| 27 | A `USER` line in the rebuild lines naming the image's final user is a no-op; any other `USER` stays refused | none |
| 28 | When the default lines are refused (no make ran), `rebuild` sends the agent the refusal message in place of the base log | none |
| 29 | When the base make fails, the end make is skipped (`end=skipped`) | none |
| 30 | The private set's agent env `ext/env/real-estate.json` is written by the controller only if a private-set task needs a round | none |
| 31 | The round loop's readable base make runs FROM `S` (no runner layer); the candidate's validation runs FROM `R` with both logs sealed | one more make per round |
| 32 | After any private-set pass, `rebuild` is run on every other private task (a pass writes nothing) before its grades, since they share one `rebuild.json` | a few makes |
| 33 | The refused-lines path keys on an error marker set by `no()`, not on the message text | none |
| 34 | The survey's base make logs (made FROM `R`) are moved into `ext/sealed/<slug>/logs/` and not read again | none |
| 35 | s3-01's and s3-07's round-2 candidates (the agents' own lines) go into `rebuild.json` and are validated again by `rebuild`'s no-round path; a failure removes the file | two extra makes per task |
| 36 | s3-02 gets one extra sealed round (budget 3) with a content-free note, the user not answering the three options; later withdrawn, never used | one sealed round |
| 37 | s3-02's extra round runs beside the regrade; withdrawn after BuildKit `ResourceExhausted`, one Docker job at a time again | a grade hit by memory pressure is rerun |
| 38 | Task 12c: the overlay touches every product file (mtime now) before copying; repeats the whole regrade | the regrade repeats |
| 39 | The `grade-mode` shared files set by the first regrade stand (those tasks failed split because their runner needs the product's files in its own container) | a task stays shared that could have been split (M3 open there) |
| 40 | Task 12d: the overlay touches only the paths that differ between the base and the commit; replaces 12c's fix (it broke s2-03) | one more `oracle-run` change; the regrade restarts |
| 41 | Each task CHANGED in the third regrade gets exactly one more grade of its changed kinds after the driver ends; matching the locks → flaky (1 of 2), still different → CHANGED | one grade per such task |
| 42 | s3-08 gets one extra sealed rebuild round with a content-free note; it failed (2 rounds plus 1 extra, 3 in all, rounds=3); the round-2 `rebuild.json` was restored; s3-08 goes to the user | one round and two grades |
| 43 | p8a and p8e: a network experiment classifies the cause content-free (a scratch copy of `bench/` only switches `P`'s `--network`) | none stated |
| 44 | (B) is applied as `s3-08/step.json` ids → [] (old ids under `dropped_ids`) plus status `dropped`, because `trial.mjs report` counts H1's N from sample rows with step ids | one data file to restore from the stick hash |
| 45 | The walk runs on `groups-walk.json`, `cold_setup` restored after each sample, serve verdicts in `serve.tsv`, a second queue folder if needed | one copy file, a column restored by script |
| 46 | Task 13a gets no separate task review (the controller's own text transcribed and checked by diff); the whole-branch review covers it | a wording defect found at the final review |
| 47 | s3-09's task-env takes `--reply rounds/1.reply.md --sha <sha256>` (its `meta.json` predates `recipeSha`) | none |
| 48 | `oracle step` runs right after the pipeline for a walked task with no disputed classification, and after the reader for the others | one step rerun |
| 49 | antiwork/gumroad#6391 is `out: issue not found` (issue 6185 does not exist on GitHub; a permanent condition, 4.2 needs the issue as the input) | one candidate excluded whose issue a later query could read |
| 50 | s1-11 gets ruling 5's route (grade-mode shared, then validate again) | one validation run |
| 51 | s1-11 stays grade-mode shared (set before the make was fixed; split was not retried) and is listed with the shared tasks | M3 open on one task that split might have held |
| 52 | databendlabs/databend#20352 is `out: base tree not exportable on this host`, registered in the prereg and told to the user | one candidate excluded by the host, not by 4.2 |
| 53 | Task 6: the product container's (`P`) output is appended to the sealed grade log under its own header (no separate file) | none |
| 54 | Task 12, s1-01: split mode changed every check (its runner needs the product's files in its own container) and shared mode matched, so ruling 5's route applies: s1-01 grade-mode shared | M3 open there |

Other ledger notes that bear on the lock: the controller read the tail of s1-01's base make log made FROM `R` (survey, before ruling 31); it showed already-installed package names, among them runner-layer tools, and no check, id or end content (a sealing note). A first attempt to read end logs was blocked by the session's own rule against reading `ext/sealed/`. Risk noted at Task 7: `next/font/google` cannot fetch Google Fonts offline, so a check that depends on font metrics could change against the host-graded locks; the ledger records no regrade difference attributed to it.

## Deviations (listed for step 14)

From the plan, and registered in the prereg:

1. The walked tasks get no 7.2 re-rating and no input read (sections 7.2 and 5), as the step 9 decisions ruled for the other tasks.
2. The cold-setup repos stay those of stick v1; walked repos join the unopened set instead of becoming cold by 4.2 ruling 13 (ruling 10).
3. The reading of "the first of the sorted list" (decision 1) and the choice of a dropped real-estate task (decision 2): s2-01 and s3-02, and p6c.
4. A served task graded in one container (ruling 5): s1-01, s1-03, s1-05, s1-07, s2-01, s2-02, s2-05, s2-07, s2-08, s2-10, s1-11; an end graded through the networked path (ruling 4): none.
5. Reads for walked tasks are an agent's (decision 5 (a)).
6. The external set grows past 24 (the walk adds 6 and s3-08 leaves H1–H4; H1's N is 24 while section 4.2 says 8 per stack), by the user's decision of 2026-11-05.
7. The walk runs on `logs/step11/groups-walk.json`, and the controller restores `cold_setup` after each `sample`.

Decided by the user on 2026-11-10, each by name:

8. **(A)** p8a `d1ea76b-T13`, p8e `eb2b016-T7`, p8e `a9c2377-T15` dropped after the stick v1 lock because of the grade environment, not a human read.
9. **(B)** s3-08 out of H1–H4 although the step 5 pipeline kept it.
10. **(B)** s3 walks 3 tasks, not 2, so that H1's N reaches 24.
11. **(C)** M3 closed per task, not per set.
12. **vercel/turborepo#13756** excluded by the machine (`out: docker disk too small`), not by a rule of 4.2.
13. **The general disk rule** for s3 candidates (applied by name; goose#12006 ended on its end build instead).
14. **databendlabs/databend#20352** excluded by the host (`out: base tree not exportable on this host`), a controller ruling told to the user.
15. **The stopped 7.1 gate:** s1 8/10 `same` (n − 1 = 9 needed), accepted; the two drops stay.

Named by the ledger:

16. **antiwork/gumroad#6391** excluded as `out: issue not found` (controller ruling).
17. **`PRIVATE_SET` and `registry.npmjs.org`** named in `bench/ext.mjs`, against "bench/ names no stack, customer or task".
18. **Candidates validated twice:** s3-01's and s3-07's round-2 lines were validated again (ruling 35).
19. **A third rebuild round** for s3-08 (2 + 1 extra), beyond the budget of 2; s3-02's extra round was ruled and never used.
20. **The rebuild tool** (Task 12a) and the overlay fixes of Tasks 12c and 12d were not in the plan; the regrade ran three times.
21. **The walk drivers** were written new in `logs/step11/` instead of copied from the step 5 drivers (Task 13 step 1).
22. **7.1 at `--chunk 5`** for the walked set (the default chunk was over the 0.9 MB cap).
23. **Task 13a** had no task review (ruling 46); **s1-11 stays shared** though split was not retried (ruling 51).
24. **Rebuild rounds were budgeted per task slug, not per repo as ruling 4 registered:** pola-rs/polars (a cold-setup repo) spent 4 sealed rounds (s3-07 2, s3-08 2) plus s3-08's extra round, 5 against a registered 2.
25. **`arm/proof-s1-01.json` was rewritten** by the Task 4 and Task 11 proofs and its reason line was added on 2026-11-10 (1f5c712), after the fact. It widens ruling 11's expected list, as ruling 4's stores did.

## Deferred minors

From the ledger (`minor (deferred)` lines); the final review triages them. By task:

- **Task 2:** a dangling symlink given as `--out` slips past the guard; no test for `--out` as a link into `<data>` or a non-real spelling; `--out` equal to `<data>` passes the guard and then fails EISDIR.
- **Task 3:** whole body read before the path check; a missing counts directory crashes startup (loud); `transfer-encoding` not in the drop list (Bun strips it); tests share `seen` and depend on order; `hasUrlSource` spread push overflows near 1M array elements (fails closed); JSON re-serialisation loses integers above 2^53; `tools: null` is now refused.
- **Task 5:** a base folder the product turns into a file gets `noresult`; make-container removal not logged in `ext/removed.txt`; the make container has no memory cap; the `nc -z` probe can fail for other reasons; the overlay fixture lacks newline and dash paths; the trusted path is untested for `refs/seeded` and `tasks.json`; `USER` before the copy follows R's final user; `trustedCommit` passes a `tasks.json` value to `git rev-parse` unguarded.
- **Task 6:** P's log is appended only on the normal path; a P OOM is hidden behind O's timeout and the 300 s cut is unmarked; O shares P's `/etc/hosts`, `resolv.conf` and loopback ports (a limit if a runner opens a loopback debug port); test discrimination gaps (planted `.bench-ready`, P OOM, SIGTERM with two containers, P dying early, ready running against base `/work` in O).
- **Task 7:** `tasks.json` shas not validated; the index shifts if `tasks.json` gains a middle entry; no snapshot test of `taskEnv`; `box-env` does not check the runner file exists; all 11 real-estate tasks share one slug.
- **Task 8:** 'API reached only through the proxy' accepts 401/404; the record field `box.ips` changed meaning since step 8; `listens()` kills a healthy run on a transient docker error; export files keep extraction modes in the box; a group/other exec bit reads 755 unlike git.
- **Task 9:** NaN minutes when a record lacks start/end; duplicated `sample.tsv` parsing; untested second-attempt, step-grade key, `noresult` and machine numbering at k = 1; weak leak-probe ids; `report` throws on a standing record whose branch is gone; `gradeProduct`'s under-floor guard has no direct test; canary B runs made after the trial floor would count as trial runs; canary and ext `sample.tsv` parsing not CR-safe.
- **Task 10:** no test of a walked task with no disputes; `--queue` followed by another flag takes it as the folder; the classify-2 guard is bypassed when `--queue` precedes the batch name; the loose gate is keyed on the path string; `realish` treats a dangling link as absent.
- **Task 12a:** no gated test of `oracle-run`'s `USER` ordering; running `rebuild` beside a grade of the same task removes the grade's names; lines before a no-op `USER` run as R's user; untested `USER` spellings; ``` in a recipe breaks the prompt fence; a no-round rerun reuses the sealed `current-<c>` log name; the final line does not tell an S base failure from an R one; S's make may run as another user if a runner layer sets `USER`.
- **Task 12b:** one extra round per invocation, not per task; the one-line check misses U+2028/2029/0085/`\v`/`\f`; test gaps.
- **Task 12c:** `afterAll`'s fixture loop stops at the first rejected fixture; a convoluted `ovOnce`; the gated test needs the Alpine mirror; the unit test compares exact strings; import order.
- **Task 12d:** no gated test of rename/mode/symlink in the changed list; README wording.

## Checks at the lock

- **Tests:** `bun test ./tests` teed to `logs/step11/tests-1.out`: 637 pass, 64 skip, 0 fail, output pristine.
- `git status --short bench tests` empty. `/tmp/hstack-bench` holds only test fixtures (`fx*`).
- **Docker:** `bench-ext-` containers 328 and `bench-ext/` images 162, equal to the step 10 lock's counts (fixtures and earlier steps). No `-serve`, `-runner-*`, `-product-*`, `-app-*`, `-grade-*` or `-make-*` name of this step left (`bench-ext-other` predates this step and is not ours). Docker images 6.1 GB, build cache 10.0 GB.
- **pgsnap:** equal around every walk, serve and real-estate lane.
- **Sealing:** the controller read count lines, `step.json` id lengths, `kills.json` numbers and file names; the one exception is the `Record:` note above. It opened no oracle, check, seeded bug, reply, page, answer or transcript, and wrote no plugin content.

## Open points

- **Phase B:** needs a plugin commit from the plugin-design session (B1–B4); its rules are registered. The follow-on plan adds the commit, its dependencies and the CLI version of that day.
- **The token:** `<data>/arm/box.env` is kept for Phase B; the user revokes it at the step 11 lock and then `rm <data>/arm/box.env`, unread.
- **The flaky test:** step 10's first lock run had 1 unidentified failure (563 pass, 49 skip, 1 fail), then two clean reruns. Task 2 step 4 ran the four candidate files 10 times each, 40/40 exit 0, not reproduced (`logs/step11/flaky.lines`). Every full run since is teed; `tests-1.out` is pristine. The final review should still look for a timing-dependent test.
- **s1-11 is shared:** M3 stays open there; split was not retried.
- **The stick is not validated;** the section 7.3 trigger candidate stays open for step 14 (step 10 lock).
- **The 2 cold-task disputes** carried from step 10 are not touched by this step's ledger.
- **Before Phase B's first run,** the Phase B follow-on plan must fix, or explicitly accept, the ledger items `listens()` (no retry on a transient docker error), P OOM hidden behind O's timeout, and `--extra-round` granting one round per invocation.
- The timing-dependent tests named by the final review (bench-env, bench-proc, bench-agent, bench-score) are flaky candidates, not changed (ruling 14).
- **Merge and push wait for the user.** The plan stays `draft` until the user approves Phase A, after the whole-branch review.

## Known limits

- **M3 stays open for in-process interfaces and for shared-mode tasks:** all of s3 (s3-09 to s3-12 included), and s1-01, s1-03, s1-05, s1-07, s1-11, s2-01, s2-02, s2-05, s2-07, s2-08, s2-10 (`grade-mode` = `shared`); closed for s1-10, s1-02, s1-04, s1-06, s1-09, s2-03, s2-09 and the private set (decision (C)). s3-01 and s3-08 have a `grade-mode` file written by the regrade driver's fallback, but s3 is graded in one container either way.
- **`grade --reuse` keys on commit, oracle sha and junit only,** not on `ext/tasks/<slug>/grade-mode`, `rebuild.json`, the private set's outside runner or the `oracle-run` code: a rerun can keep a grade made under another mode or other rebuild lines. It happened once (s1-11's shared rerun reused its split end grade; the controller moved the grade files aside unread). Phase A's regrade ran without `--reuse`. Step 13's plan should add the grade mode, the rebuild.json sha and the runner sha to the grade file and the reuse key.
- **The proxy forwards the client's `anthropic-beta` header unfiltered;** the body denylist covers every server feature known today, so a future beta that fetches through a new body field would pass.
- **The registry is pinned by its IP addresses and port 443, not by host name:** if those addresses are shared CDN addresses, a private-set box or make container can reach other sites served there. This applies equally to every arm, and decision 6 (a)'s reason covers it. 'Only the registry answers' means only those addresses answer.
- **I2 closed by the proxy (form A);** no fallback. The token is visible to `docker inspect` on the host (the host is trusted).
- **`O` shares `P`'s `/etc/hosts`, `resolv.conf`, loopback ports and abstract unix sockets** in split mode: `P` can redirect what `O` connects to (not `/out`).
- **A product that needs a new dependency cannot build** (external; real-estate under decision 6 (b)), as in the box; it reads `noresult`, equally for every arm.
- **The real-estate box runs Postgres, the dev server and browsers under `--memory 6g`;** a kill is `machine memory`, told to the user.
- **Registry addresses are pinned when a box is made** (decision 6 (a)); a box lives up to 56 hours, and an address that rotates fails every arm alike.
- **The stick's sensitivity is not validated** (step 10 lock); H4 at step 14 is Part 2's only guard.
- **σ_d from 4 tasks at k = 1 is a rough estimate;** N never drops below 24.
- **The trial tasks are seen** by the plugin designer through their scores (4.2 ruling 13), and the designer may tune on them before step 12.
- **No human reads anything in this step** (decision 5 (a)).
- **Candidates excluded by the machine, not by a rule of 4.2:** vercel/turborepo#13756, databendlabs/databend#20352 (host file system), and the disk rule; the s3 sample is what the walk reached before them, not all s3 candidates by rank.
- **s3-08** is out of H1–H4 for the whole stick (not gradeable offline); it still counts toward its repo's cap.
- **Three private-set checks** and their step ids are out by the grade environment (decision (A)); the private set's host-graded locks stay as step 9 and 10 locked them.
- **Sockets and FIFOs under `<data>`** are skipped by `stick hash` without a count (step 10 limit); the amended hash has `special 0`.
- **Run transcripts are not hashed.** The manifest pins git content through refs.

## Usage and wall clock

Agent runs of step 11's sealed work (`logs/step11/lock-usage.mjs`, run records started on or after 2026-11-08; counts only):

| lane | runs | code ≠ 0 | input | output | cacheRead | cacheWrite | minutes | model |
|---|---|---|---|---|---|---|---|---|
| walked tasks (task folders) | 53 | 0 | 788 | 401,402 | 17,408,806 | 1,447,636 | 66.8 | claude-opus-5-5 |
| walk checks and rebuild rounds | 36 | 0 | 472 | 222,623 | 8,644,434 | 965,392 | 39.5 | claude-opus-5-5 |
| serve rounds | 2 | not recorded | 36 | 12,944 | 315,528 | 48,629 | 2.3 | not recorded |
| reader | 5 | not recorded | 10 | 10,297 | 3,245 | 492,383 | 2.7 | claude-fable-5-1 |

Subagents of the build are in `progress/progress.md` ("Step 11 Phase A"); several implementers and reviewers have no token figure in the ledger and are marked `not recorded` there. Wall clock: the walk 2026-11-09T22:31Z (s3-09) to 2026-11-10T11:47Z (last kills). The rebuild driver, the three regrades and the make survey ran from 2026-11-09 (the third regrade started 20:48); their total time is not recorded in the ledger.

## Scripts (`<data>/logs/step11/`)

Counts only; not hashed into the repo; listed by name:

`deps.sh`, `make-survey.mjs`, `rebuild.sh`, `regrade.sh`, `regrade2.sh`, `repeat.sh`, `regrade-compare.mjs`, `exp-net.mjs`, `apply-decisions.mjs`, `walk11.sh`, `pipe11.sh`, `chain11.sh`, `auto11.sh`, `count11.mjs`, `cold-restore.mjs`, `seed11.sh`, `tasks11.mjs`, `lock-usage.mjs`.

Outputs named above: `regrade-compare.out`, `apply-decisions.out`, `seed11.out`, `tests-1.out`, `flaky.lines`, `deps.txt`, `make-survey.lines` (and `-2.lines`), `repeat.lines`, `exp-net.lines`, `regrade-v1/`, `regrade-v2/`, `groups-walk.json`, `walked/`.
