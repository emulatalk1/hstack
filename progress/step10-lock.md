# Step 10 lock: stick v1

Locked 2026-11-08, after the reruns, the task lists, the seven compares and the hash of the data folder (Task 6). `<data>` = `.evidence/bench` (gitignored, in the main checkout). Plan: `docs/plans/2026-11-08-bench-stick-v1.md` (Tasks 1 to 6; status `draft` until the user approves the build). Rulings: prereg section 12, "Applied at step 10" (rulings 1–10 and the user's decision), and the controller rulings listed below. Branch `bench-step10` from `main` (5d3bcdc); nothing is merged or pushed.

Every number here comes from the tools' count lines archived in `<data>/logs/step10/` (`kills-due.out`, `step.lines`, `step-cmp.out`, `run-kills-re.lines`, `run-kills-ext.lines`, `kills-cmp.out`, `step-sens.out`, `tasks.out`, `compare-step3.out` … `compare-step9.out`, `hash.out`, `self-compare.out`, `links.out`, `token.out`) or from the SDD ledger of this build (copied into `progress/progress.md`). No oracle, step oracle, seeded bug, check, reply, label, page, answer, note or transcript was opened to write this lock.

## Result

- **Stick v1 is locked.** Its content is hashed in `progress/stick-v1.sha256` (20,789 files of `<data>`, sha256 of the manifest `3cf3f74087afdee1ba868b170d4f863b588d0ff1bab684908b0eb77531390357`) and its task lists are committed in `progress/stick-v1/tasks.tsv`. The repo side is pinned at `416999b` (the last commit before this lock; `git status --short bench tests` empty).
- **Its sensitivity is not validated.** See "The stick" below. Nothing in this lock says otherwise.
- **The reruns went as registered.** `oracle step` on the 24 external tasks ran no resolver and changed only the predicted files; H1's N stays 20. `kills` ran again on exactly p1, p2 and s1-03; p1's and p2's `kills.json` are byte-equal, s1-03's moved only by its 7.1 drop.
- **Every change since the step 3–9 locks is explained:** 74 changed paths over the seven compares, 0 unexplained, 0 missing.
- **The token is closed:** the user revoked it, and `<data>/arm/box.env` was removed unread.

## The user's decisions

- 2026-11-08, after the plan: "Thảo luận với advisor đến khi thống nhất rồi excute". The advisor and the controller agreed (three rounds), and the build ran subagent-driven.
- Decision 1 (read the 3 B/B- pairs before the lock), asked again at Task 5: "Theo advisor". The advisor's recommendation was option (b), no read, so the step 9 lock's ruling of 2026-11-08 stands: no human read the pairs.
- The token, asked at Task 5: "Đã revoke, xoá box.env". `rm <data>/arm/box.env`; `token.out`: `box.env absent`.

## The stick

Stick v1 is locked: its content is hashed and its task lists are committed. **Its sensitivity is not validated.**

- The canary of section 7.3 failed as registered: mean `d` 0.400 with B- on `claude-sonnet-5-5` and 0.428 with B- on `claude-haiku-5-5`, 3 of 6 tasks favouring B in both (step 8 lock).
- The extension, registered after that failure was seen, passed on a bootstrap lower bound of 0.057, while its t interval, [-0.006, 0.627], crosses 0 (step 8 lock).
- The agent reader (`claude-fable-5-1`) read B- as visibly worse on s3-01 and s3-02; the controller and the advisor had found it not worse on all three (step 8 deviation 2, step 9 lock). On s3-02 the seeded checks pass for both arms (step 9 lock).
- No human read the pairs (decision 1, option (b)). The section 7.3 trigger candidate stays open, and step 14 lists it. From the step 9 lock ("The stick decision, 2026-11-08"): "No 'fix the stick' plan is written now, because the only evidence for §7.3's trigger is the reader the user rated not measurable on the other two gates." And: "Cost if wrong: Part 2 runs on a stick whose sensitivity the canary did not establish, and H4 is then the only guard."
- Part 2's guard is H4: H against W, k = 3, 24 tasks; if it is not met, H1–H3 are not reported.

## The external `step` rerun (ruling 2; `step.lines`, `step-cmp.out`)

- 24 runs at 16:19:54 (+07), all exit 0. Resolver `reused` 6 (s2-02, s2-10, s3-01, s3-05, s3-06, s3-07, the 6 tasks with resolver records at step 6), `none` 18, **`ran` 0**, no refusal.
- `cmp` against the copies in `logs/step10/before/`: changed **`s1-03/step.json`, `s1-03/step-f2p.json`, `s1-04/step.json`**, nothing else. The other 45 of the 48 files are byte-equal: both files of the 22 other tasks (s3-05 and s3-06 included) and `s1-04/step-f2p.json`.
- **Ids that moved:** s1-03 9 → 10, s1-04 4 → 5; joined 2, left 0 (the dropped s1-03 check was not an id). Both are settled `build` checks whose origin was already `f2p`. External ids in all: 51 → 53.
- `step-f2p.json` of s1-03: the dropped check left the scored set (f2p 26 → 25).
- **H1's N is 20** (tasks with ids); the 4 without are s1-01, s1-06, s3-01, s3-07.
- The task-repo `step` was not rerun (ruling 3).

## The `kills` rerun (ruling 4)

- `kills-due.out`: `kills due s1-03 oracle`, `kills due p1 oracle`, `kills due p2 oracle`, `kills due: 3`. p6c has no `seeded/` folder.
- Real-estate lane (`run-kills-re.lines`), 16:20:17 to 16:35:36: `p1 kills bugs=1 fix=0/1 step=none`, `p2 kills bugs=1 fix=0/1 step=none`, exit 0, **`PGSNAP equal`**. Both `kills.json` byte-equal to the copies.
- p1's `kills.json` is byte-equal although its oracle gained 5 scored checks in the second batch: its `fix.of` (checks that pass at the end and are not excluded) is 1 before and after, so none of the new checks passes at p1's end; `kills` counts a kill only among those.
- External lane (`run-kills-ext.lines`), 16:35:54 to 17:19:27: `docker builder prune -f` first (the 15 GB cache rule; 19.33 GB reclaimed), then `s1-03 kills bugs=3 fix=2/3 step=none`, exit 0. Its `kills.json` changed: per bug the killed counts are unchanged (1, 0, 2), and `of` went from 26 to 25, the 7.1 drop. Section 8.3's numbers stand: external fix kills 28 of 72.
- **External H1 sensitivity** (`step-sens.out`, `logs/step7/lock-step-sens.mjs`): tasks with a step id 20, bugs 60, **caught by a step id 12** (step 7 lock: 11), tasks with a catch 9 (8); s1-04's new id catches one bug. Missing grades 0, catches that are not fix kills 0.
- No lock hashed the rewritten grades of p1, p2 or s1-03, so their equality is shown through `kills.json` only.

## The task lists (ruling 7; `progress/stick-v1/tasks.tsv`, `tasks.out`)

`tasks: external 27 (scored 24, retired 3), real-estate 16 (scored 9, dropped 6, trial-only 1), h1 tasks 20 external`. Columns `set task stack ref base end status canary cold h1_ids scored seeded reason`.

- **External, scored (24):** in `ext/sample.tsv` order. `canary` 6 (s1-01, s1-02, s2-01, s2-02, s3-01, s3-02), `extension` 14, `cold` 4 (s1-09 we-promise/sure, s2-09 kizuna-ai-lab/sokuji, s3-07 and s3-08 pola-rs/polars): nobody designing the plugin opens the cold-setup repos. Scored checks 158 (s1-03 25, one fewer than step 5 by the 7.1 drop), 3 seeded bugs each.
- **External, retired (3):** s1-08 and s2-04 `no valid check`, s2-06 `not servable` (step 5 lock).
- **Real-estate, scored (9):** p1 15, p2 39, p3 13, p4 20, p6a 11, p8a 5, p8c 7, p8d 5, p8e 6 scored checks, equal to the step 9 lock's rule (b) table; 9 ≤ 12, so section 4.1's cap cuts none. 1 seeded bug each.
- **Real-estate, dropped (6):** p5, p7b, p7c `rule (b) 0 < 3`; p6b, p6c `rule (b) 2 < 3`; p8b1 `needs outside data (rule (c))`.
- **p8b, trial-only:** the prereg's author read its oracle (section 12 step 10); it runs only in step 11's trial and is never scored.
- Notes from the Task 4 review: the real-estate `h1_ids` column counts step-oracle ids and is not part of H1's N; the list has no rank column, and "the first of the sorted list" means walk rank order (s2-10, rank 8, sits between s2-05 and s2-07); `tasks.mjs` imports `clScored` from the main checkout's `bench/oracle.mjs`, identical to this branch's.

**The step 11 walk** (recorded, not run). `ext/walk.tsv` equals `progress/step5/walk.tsv`. Tier 1 rows walked: s1 14 (highest rank 13), s2 18 (14), s3 44 (16), of 3104, 4002 and 26309 candidates. `ext walk` resumes from `walk.tsv` by step 4 ruling 14. H1's N is 20, so the walk must add at least 4 tasks with a non-empty step oracle (the user's decision of 2026-11-05), each through the step 5 pipeline, `step`, `seed` and `kills`, with this lock amended (a new `stick hash` and a `stick compare` of this manifest).

## The compares (ruling 6; `compare-step<k>.out`)

`bun bench/stick.mjs compare progress/step<k>-lock.md --reasons progress/stick-v1/reasons.tsv`, counted by path (a path a lock hashes twice is compared at its last line):

| lock | hashed | equal | changed | missing | unexplained | changed, by reason |
|---|---|---|---|---|---|---|
| step 3 | 765 | 764 | 1 | 0 | 0 | `env/real-estate.json` 1 (step 5, `appFile`) |
| step 4 | 526 | 524 | 2 | 0 | 0 | `ext/walk.tsv` 1, `ext/sample.tsv` 1 (step 5 replacements) |
| step 5 | 1369 | 1327 | 42 | 0 | 0 | `env/s*.json` 27, `labels.json` 10, `oracle/manifest.json` 4, `p1/agreement.json` 1 (step 9) |
| step 6 | 572 | 568 | 4 | 0 | 0 | `p8b/labels.json` 1 (step 9); `step.json` 2 of 4 (s1-03, s1-04; s3-05, s3-06 equal), `s1-03/step-f2p.json` 1 (step 10) |
| step 7 | 1072 | 1047 | 25 | 0 | 0 | `env/seeded/s*.json` 24 (step 9); `kills.json` 1 of 2 (s1-03; p1 equal) (step 10) |
| step 8 | 142 | 142 | 0 | 0 | 0 | — |
| step 9 | 330 | 330 | 0 | 0 | 0 | every step 9 row equal |

All 74 changed paths are rows of the table registered before any rerun; `p2/seeded/kills.json`, deliberately left out of it, is equal. The step 4 lock has 548 hash lines over 526 paths (its addenda re-hashed rechecked candidates).

## The manifest (ruling 5; `hash.out`, `self-compare.out`, `links.out`)

- `stick hash: files 20789, link 47, node_modules 1, store 1071, secret 7, transcript 203, rewritten 53`.
- **Left out:** 47 links, never followed: `p8b → 8b` (p8b's 141 files are hashed under `8b/`; the earlier locks name them `p8b/…` and their compares resolve through the link) and 46 `oracle/node_modules` links of the real-estate oracle folders (to the scaffold's or the copy's `node_modules`); 1 `node_modules` folder (`oracle-scaffold/`); 1071 entries inside the git stores of `ext/repos/` and `seeded/repos/` outside the allowlist (`HEAD`, `config`, `shallow`, `packed-refs`, `refs/**`, `objects/info/alternates` are hashed, so the `refs/seeded/*` of the 81 bugs and the step 8 product branches are in); 7 secrets (the page tokens; `box.env` was already removed); 203 run transcripts `results/*/*.jsonl`; 53 files every grade rewrites (`*/docker.json`, `*/build/readiness.tsv`, `ext/removed.txt`). `transcripts/` (87 files) is hashed.
- Files per top folder are in `hash.out` (`ext` 9143, `heldout` 627, `seeded` 221, `step9` 111, `logs` 545, …).
- `stick compare progress/stick-v1.sha256`: hashed 20789, equal 20789, changed 0, missing 0. Three paths checked against `shasum -a 256`, equal: `8b/agreement.json`, `ext/sealed/apache__datafusion__24211/logs/base-1.log`, `seeded/repos/chakra-ui__panda.git/HEAD`.
- Written to `logs/step10/` after the hash, so not in the manifest: `hash.out`, `self-compare.out`, `links.out` (and this lock's later outputs).
- Recheck: `HSTACK_BENCH_MACHINE=<data>/machine.json bun bench/stick.mjs compare progress/stick-v1.sha256`.

## Blocks Part 2 (ruling 9)

Step 11's plan must close each before the first run it affects, then regrade the ends of the 24 external and the 9 real-estate tasks with every oracle kind the arms are graded with (`oracle/`, `step/oracle/` where it has ids, `seeded/oracle/`) after its last change to `grade`, `oracle-run` or the box, and show every check's result unchanged.

- (I1) The grade's image build has Docker's default network (step 8 lock).
- (M3) The oracle shares the product's container: a product can read the oracle and rewrite its JUnit (step 8 lock).
- `env/real-estate.json` and `env/seeded/real-estate.json` run the host's `oracle.sh`, so a real-estate product would run on the host (step 9 lock, Task 6).
- (M1) `build/readiness.tsv` is shared between oracles (step 8 lock).
- (I2) The nested CLI and the token in the box (step 8 lock). The step 8 token is revoked; step 11 needs a new one.
- Walked tasks need a registered rule for their classification disputes and their 7.1 sample: step 9's reader rulings covered step 9 only.

## Rulings during the build

From the ledger, in order, each with its cost if wrong.

1. `progress/` paths in `stick compare` resolve to the repo root, not `ROOT` of `bench/env.mjs` (which is `/tmp/hstack-bench`); the plan meant the repo root — cost: none, a test pins it.
2. Decision 1 unanswered at build start: default (b) until Task 5 asked again — cost: none, the user answered at Task 5.
3. Task 4's script ran while the p1/p2 `kills` lane ran: it reads no file `kills` writes — cost: none.
4. The first `stick hash` run wrote its own output into `logs/step10/hash.out` while hashing it (an empty file in the manifest, `changed 1, unexplained 1` in the self-compare); the manifest was taken again with the output outside `<data>` and then copied in — cost: none, the self-compare is clean.
5. `kills-due.mjs` first imported `oracleSha` from `bench/grade.mjs`, which does not export it; corrected to `bench/lib/oracle.mjs` before its only run — cost: none.

## Deviations

Each is listed in step 14's report.

1. **The compare covers the step 3 and step 4 locks** as well as steps 5–9, beyond the user's brief: step 3 hashed `heldout/` and the replay results, step 4 `ext/sealed/` and the sample, and no later lock rechecked them. Registered in ruling 6 before any rerun.
2. **Decision 1, "Theo advisor":** read as the advisor's recommendation, option (b), no read. Cost if wrong: the user meant to read the pairs; the reversal is to read them now, and a "B- visibly worse" answer would send the work to a fix-the-stick plan and a re-hash.

## Findings

- **One test failed once, unidentified.** The first `bun test ./tests` at the lock gave 563 pass, 49 skip, **1 fail**; its output was not kept, so the test's name is not known. Two reruns on the same code gave 564 pass, 49 skip, 0 fail, output pristine. A flaky test; the final review should look for a timing-dependent test. Candidates named by the final review: `tests/bench-env.test.mjs:140-148` (a 5000 ms bound around a worktree add and a spawn), `:201-221`, `tests/bench-proc.test.mjs:8-20`, and the free-port reuse of `tests/bench-env.test.mjs:25`, `tests/bench-agent.test.mjs:137`, `tests/bench-score.test.mjs:119`. The next full run keeps its output.

## Checks at the lock

- **Tests:** `HSTACK_BENCH_MACHINE=<data>/machine.json bun test ./tests`: 564 pass, 49 skip, 0 fail, 613 tests in 31 files, 155 s, pristine (twice; see "Findings" for the first run).
- `git status --short bench tests` empty; HEAD `416999b` before this lock's commit.
- `/tmp/hstack-bench` empty.
- **pgsnap:** equal around the real-estate lane (`pg-kills-before.txt`, `pg-kills-after.txt`), and a snapshot at the lock equals the lane's after. No `real_estate*` database was touched.
- **Docker:** `bench-ext-` containers 328, `bench-ext/` images 162 (the step 9 lock's numbers), none ending `-serve` or `-grade`. One `docker builder prune -f` (the cache rule); no prune, volume, compose or network command.
- **Sealing:** the controller read count lines, `step.json` `ids` lengths, `kills.json` numbers, grade `oracleSha` fields and file names. It opened no oracle, check, seeded bug, reply, page, answer, transcript or `box.env`.

## Open points

- **The stick is not validated;** the section 7.3 trigger candidate is open for step 14.
- **Blocks Part 2:** the list above, for step 11's plan.
- **The step 11 walk** (at least 4 tasks with step ids) and the amendment of this lock.
- **The 2 cold-task disputes stay disputed.**
- **The flaky test** of "Findings".
- **Merge and push wait for the user.** The plan stays `draft` until the user approves the build.
- **Deferred minors** of the ledger:
  - Task 1: the prereg's decision sentence names "Task 6 (Task 5 …)" without the plan's name in that sentence; its opening sentence is a summary, not a quote.
  - Task 2: the bytewise-sort test cannot tell `Buffer.compare` from UTF-16 order; no negative test for a folder named `objects/` or `refs/` outside a store; a lock path that now names a directory throws EISDIR (exit 2) instead of being reported; a socket or FIFO is skipped uncounted; each file is read whole into memory.
  - Task 4: as in "The task lists".

## Known limits

- The stick's sensitivity is not validated; H4 is Part 2's only guard.
- Sockets and FIFOs under `<data>` are skipped by `stick hash` without a count (ruling 5 says each left-out entry is counted); none is expected in the data folder. Step 11's amendment may add a count, and `hash` could refuse an `--out` inside the data folder (the slip of ruling 4).
- No human read step 9 content or the 3 pairs.
- The manifest pins git content through refs, as far as git's SHA-1 does.
- Run transcripts are not hashed.
- The task-repo `step` was not rerun; its validations stand as step 6 locked them.
- External H1 rests on 20 tasks with a median of 2 step ids until the step 11 walk.

## Usage and wall clock

Subagents of the build (implementer; reviewer):

| task | implementer | reviewer |
|---|---|---|
| 1 Register the rulings | sonnet 87.5k, 1.0 min | sonnet 84.4k, 0.8 min |
| 2 The hash and the compare | opus 101.4k, 8.7 min; fix round (resumed) 103.7k, 0.3 min | opus 100.9k, 2.0 min; re-review sonnet 58.5k, 0.1 min |
| 3 The reruns | the controller | the final review |
| 4 The task lists | the controller | sonnet 88.2k, 1.4 min |
| 5 The user's answers, 6 Lock | the controller | the final review |

A resumed agent's figure may be its context size rather than new work (step 9 lock), so the implementer total is about 191k to 293k; reviewers 332k. No sealed agent ran in this step.

Wall clock (+07): `step` 16:19:54 (24 runs within seconds); real-estate `kills` 16:20:17 to 16:35:36 (15.3 min); external `kills` 16:35:54 to 17:19:27 (43.6 min); `stick hash` 4.2 s; the seven compares under a minute; the test suite 155 s per run.

## Scripts (`<data>/logs/step10/`)

Counts only; hashed in the manifest except the outputs written after the hash.

| file | what it does |
|---|---|
| `kills-due.mjs` | ruling 4: tasks whose oracle `oracleSha` differs from the end grade's |
| `step.sh` | ruling 2: `oracle step` on the 24 external tasks |
| `run-kills-re.sh`, `run-kills-ext.sh` | the step 7 drivers, pointed at `logs/step10/` and the due tasks |
| `tasks.mjs` | ruling 7: writes `progress/stick-v1/tasks.tsv` |
| `before/` | the copies of `step.json`, `step-f2p.json` and the due `kills.json` taken before the reruns |

## Approval, 2026-11-08

The user approved the build on 2026-11-08 ("Duyệt build, và cho phép merge push"). The plan `docs/plans/2026-11-08-bench-stick-v1.md` is `stable`. The branch `bench-step10` is merged into `main` by fast-forward and pushed. Still open: everything under "Blocks Part 2", the step 11 walk and the flaky test, for step 11's plan.
