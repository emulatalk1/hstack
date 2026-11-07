# Step 8 lock

Locked 2026-11-07, after the last run of step 8 had been graded (Task 10, the lock). `<data>` = `.evidence/bench` (gitignored, in the main checkout). Plan: `docs/plans/2026-11-06-bench-canary.md` (Tasks 1 to 10, status still `draft`: it goes `stable` only when the user approves the build). Rulings: prereg section 7.3, "Applied at step 8" (15 rulings and 4 decisions of 2026-11-06) and "Extended at step 8" (2026-11-07, a deviation), and the controller rulings listed below. Branch `bench-canary`; the last change to `bench/` or `tests/` is `87da35d`; nothing is merged or pushed.

The canary is the stick's own test (prereg 7.3): arm B (Claude Code, `claude-opus-5-5`) against B- (the same CLI, a smaller model tier, told to write no tests, run no self-check and stop after one pass), both in the box of ruling 2, on tasks of the external sample, k = 2, scored by the stick's oracles. `d = score(B) - score(B-)` on build + requirement (ruling 9). These runs are in no H1 to H5 analysis.

Every number here comes from one of these sources:

- `<data>/logs/step8/report-first.*`, `report-haiku.*` and `report-extended.*` (the `canary report` output at each stage, archived when it was made), `<data>/canary/report.json` (the last report), `canary/cost.json` (cost of the first 6 tasks recomputed from the transcripts), `canary/attempts.json` (grade attempts per commit);
- the records `<data>/results/<task>-<arm>-<n>.json` (CLI version, models, base, branch, usage, tool counts, box) and `<task>/grades/<sha7>.json` (existence only);
- `<data>/arm/proof-s1-01.json`, `arm/proof-agent-s1-01.jsonl` (the final text of the agent's reply only) and the SDD ledger of this build (`.superpowers/sdd/2026-11-06-bench-canary/progress.md`, copied verbatim into `progress/progress.md` with this lock);
- the counts-only scripts of `<data>/logs/step8/`, listed and hashed under "Scripts" and "Hashes".

Nothing was read from `ext/raw/`, `ext/sealed/`, `heldout/`, `seeded/` (other than the names of `<task>/seeded/grades/<sha7>.json`, checked for existence), an oracle, a step oracle, a seeded bug or a reply file, from `logs/step7/*.out`, or from any transcript other than the final text of `proof-agent-s1-01.jsonl`. The pairs' diffs in `canary/pairs/` are hashed here and were not read for this lock. `arm/box.env` was neither read nor printed nor hashed.

## Result

The two verdicts are kept apart. The canary as registered failed. A different rule, registered after the failure was seen, passed. This lock does not say that the stick passed the canary of section 7.3.

- **Original rule (7.3 and ruling 9, 6 tasks, registered before any arm ran): FAILED, twice.** The rule: the mean of `d` over the 6 tasks is > 0 and at least 5 of the 6 tasks favour B.
  - B- on `claude-sonnet-5-5`: **mean 0.400, 3 of 6 tasks favour B** (s1-01 0.25, s2-01 0.15, s2-02 2.00; ties s1-02, s3-01, s3-02). Verdict fail. 24 scored runs, 2 `noresult` products (both s2-02 B-).
  - B- on `claude-haiku-5-5` (ruling 14's "make B- weaker", B's runs standing): **mean 0.428, 3 of 6 favour B**, the same three ties. Verdict fail. 12 new B- runs, 2 `noresult` (s2-02 B-).
  - Section 7.3 has no third branch, so the work stopped for the user.
- **Extended rule (7.3, "Extended at step 8", 14 tasks, registered after the 6-task results were seen, before any extension run): PASSED.** The 14 kept non-cold tasks that are not the canary's 6, B against B- on `claude-sonnet-5-5`, k = 2. The rule: the lower bound of the 95% bootstrap interval of the mean of `d` (10,000 resamples of tasks, seed `hstack-bench-2026-10-27`) is > 0.
  - **Mean 0.310, bootstrap 95% interval [0.056598, 0.607352]. The lower bound is above 0, so the registered rule passes.**
  - **The t interval, [-0.006427, 0.627273], crosses 0.** The registration reports it beside the verdict and says it decides nothing; it is stated here because the pass rests on the bootstrap bound at 14 tasks. The interval does not prove the stick distinguishes B from B-; it only meets the rule as written.
  - Favour B on 5 of 14 (s1-03, s1-06, s2-07, s2-08, s2-10); `d` is 0 on 8 and negative on 1 (s1-04, -0.147). 3 `noresult` products among the 14 (s1-03 B- 1 and 2, s2-10 B- 2), scored 0 by ruling 10.
  - Descriptive, not a verdict: s1-03 alone (`d` 1.603, both B- products without a result) is 0.1145 of the 0.3104 mean; without it the mean of the other 13 is 0.2110.
- **All 20 tasks, reported beside, deciding nothing:** mean 0.337, bootstrap lower bound 0.100919 (upper 0.623826), favour B on 8 of 20.
- **Machine runs:** none in the 6 tasks (either B- model); one in the extension (s3-05 B 2, a memory kill at the 6 GB cap). **Model fallbacks:** none in any of the 93 records (`fallback` is null in all).
- **Dependency files:** none of the 20 tasks' PRs changes one (`deps-20.txt`: git exit 0 on all 20, `deps=0`; `deps-14.txt` for the 14), so no task is flagged.

### Scores per task, the 6 tasks, B- on Sonnet (`report-first`)

`b` and `b-` are the task's mean score over its two runs of each arm.

| task | b | b- | d | dBuild | dRequirement | favours B | no result |
|---|---|---|---|---|---|---|---|
| s1-01 | 0.50 | 0.25 | 0.25 | 0.00 | 0.25 | yes | 0 |
| s1-02 | 2.00 | 2.00 | 0.00 | 0.00 | 0.00 | no | 0 |
| s2-01 | 1.76 | 1.61 | 0.15 | 0.00 | 0.15 | yes | 0 |
| s2-02 | 2.00 | 0.00 | 2.00 | 1.00 | 1.00 | yes | 2 |
| s3-01 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | no | 0 |
| s3-02 | 2.00 | 2.00 | 0.00 | 0.00 | 0.00 | no | 0 |

Mean of `d` 0.400 (0.400362), favour 3 of 6, verdict fail.

### Scores per task, the 6 tasks, B- on Haiku (`report-haiku`)

| task | b | b- | d | dBuild | dRequirement | favours B | no result |
|---|---|---|---|---|---|---|---|
| s1-01 | 0.50 | 0.25 | 0.25 | 0.00 | 0.25 | yes | 0 |
| s1-02 | 2.00 | 2.00 | 0.00 | 0.00 | 0.00 | no | 0 |
| s2-01 | 1.76 | 1.44 | 0.32 | 0.13 | 0.20 | yes | 0 |
| s2-02 | 2.00 | 0.00 | 2.00 | 1.00 | 1.00 | yes | 2 |
| s3-01 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | no | 0 |
| s3-02 | 2.00 | 2.00 | 0.00 | 0.00 | 0.00 | no | 0 |

Mean of `d` 0.428, favour 3 of 6, verdict fail.

### Scores per task, the 14 tasks, B- on Sonnet (`report-extended`)

| task | b | b- | d | dBuild | dRequirement | favours B | no result |
|---|---|---|---|---|---|---|---|
| s1-03 | 1.60 | 0.00 | 1.60 | 1.00 | 0.60 | yes | 2 |
| s1-04 | 1.71 | 1.85 | -0.15 | 0.00 | -0.15 | no | 0 |
| s1-05 | 1.73 | 1.73 | 0.00 | 0.00 | 0.00 | no | 0 |
| s1-06 | 1.00 | 0.38 | 0.63 | 0.00 | 0.63 | yes | 0 |
| s1-07 | 2.00 | 2.00 | 0.00 | 0.00 | 0.00 | no | 0 |
| s2-03 | 2.00 | 2.00 | 0.00 | 0.00 | 0.00 | no | 0 |
| s2-05 | 0.40 | 0.40 | 0.00 | 0.00 | 0.00 | no | 0 |
| s2-07 | 1.84 | 0.92 | 0.92 | 0.50 | 0.42 | yes | 0 |
| s2-08 | 2.00 | 0.81 | 1.19 | 0.50 | 0.69 | yes | 0 |
| s2-10 | 0.94 | 0.78 | 0.16 | 0.00 | 0.16 | yes | 1 |
| s3-03 | 2.00 | 2.00 | 0.00 | 0.00 | 0.00 | no | 0 |
| s3-04 | 1.50 | 1.50 | 0.00 | 0.00 | 0.00 | no | 0 |
| s3-05 | 1.28 | 1.28 | 0.00 | 0.00 | 0.00 | no | 0 |
| s3-06 | 0.34 | 0.34 | 0.00 | 0.00 | 0.00 | no | 0 |

Mean of `d` 0.310 (0.310423), bootstrap [0.056598, 0.607352], t [-0.006427, 0.627273], favour 5 of 14, verdict pass (lower bound > 0).

## Deviations

1. **The extension itself.** After both 6-task results (0.400 and 0.428, 3 of 6) the user chose, on 2026-11-07, to extend the canary to unused tasks with the rule fixed first (option A). It is written in prereg 7.3 ("Extended at step 8") and mirrored in the plan before any extension run: commits `41d10fa`, then `b2178e8` (a correction of the registration, before any of its runs), `01e0576` (the interval verdict) and `87da35d` (the bootstrap pinned, the interval printed in full), all before the first extension run (the pilot s1-03 started 09:05, +07). It is a deviation because the rule was written after the 6-task results were seen. The original rule's result stands as failed and the extension does not overwrite it. The reason: section 7.3's route was used up (the diagnosis found B- not worse, the make-B--weaker branch failed too, and "fix the stick" is a new plan). Reviewed: opus 174.9k tokens on the verdict code (clean) with 2 Important in the registration text, fixed in round 1 (re-review haiku 88.5k).
2. **The read of 3 pairs (7.3, "have a human read 3 B/B- pairs") was done by the controller and the advisor, not by a human, under the user's delegation of 2026-11-07.** The user delegated the choice between the two branches of 7.3 to the advisor; the advisor chose branch A (B- not worse: seeded checks 3/3 on the ties, identical diffs on s1-02, so make B- weaker and keep B's runs). The 3 pairs are s1-02, s3-01 and s3-02, the three tasks with the lowest `d` (all 0): `<data>/canary/pairs/*.diff`, hashed below. **The user has not read them.** The pairs page: https://claude.ai/artifact/58Q9rw5UuEPw4gPd6zpXxf . Cost if wrong: the user reads them later and may find B- visibly worse.
3. **The B- tier of the extension was chosen by the controller, not named by the user.** The user chose "extend to unused tasks" and did not name the model. Sonnet was picked, the controller's stated lean (a pass against one tier down says more about sensitivity). Cost if wrong: if the user wants Haiku, the 28 B- runs of the extension repeat.
4. **The extended verdict is over the 14 unused tasks, the 20 are reported alongside.** The six tasks seen already must not decide a rule written after seeing them. The advisor suggested 20; the controller kept 14 (ledger, Task 9b). Cost if wrong: a verdict on n 14 instead of 20 (the 20 are printed).
5. **`arms.json` changed twice.** Sonnet to Haiku for the Haiku rerun, then back (see "Hashes of the arms file"). A B- Haiku run is recorded with its own run numbers (3, 4); B's runs and the B- Sonnet runs stand.

## Cost of B and spread (against section 11)

Section 11 estimates the canary at `6 tasks x 2 runs x (0.4M + 0.3M)` tokens (counted as input plus output, "as the progress log records them"), and a PR-sized external task at about 0.5 hour for B. The costs below are input plus output per run, from `canary/cost.json` for the first 6 tasks and from the records for the 14.

**`canary/cost.json` exists because `usage()` undercounted.** Before commit `735bead` the record's usage read only the last `result` event of a turn, so a run that used a background tool (Monitor) had several result events and was undercounted. s2-02 B 1 shows it: the record says 392 tokens and 382,886 cache read, the transcript sums say 20,275 and 4,274,146. The other 23 rows of `cost.json` equal their records. The 14 extension tasks ran after the fix, and their records are right. The reports `report-first.out`, `report-haiku.out` and `report-extended.out` still print the s2-02 B 1 undercount (spread tokens 16,588 on s2-02); the spread table below uses `cost.json` (3,295). No score depends on usage.

| runs | n | tokens (input+output) mean | median | max | sum | cache read mean | cache write mean | minutes mean | median | max |
|---|---|---|---|---|---|---|---|---|---|---|
| B, the 6 tasks | 12 | 8,075 | 7,689 | 20,275 | 96,903 | 1,460,615 | 56,743 | 7.4 | 3.5 | 49.3 |
| B, the 14 tasks | 28 | 11,384 | 6,479 | 37,297 | 318,746 | 1,726,462 | 53,767 | 13.3 | 4.2 | 144.7 |
| B, all 20 | 40 | 10,391 | 6,479 | 37,297 | 415,649 | 1,646,708 | 54,660 | 11.5 | 3.9 | 144.7 |
| B- Sonnet, the 6 tasks | 12 | 1,670 | 1,529 | 3,344 | 20,040 | 333,176 | 32,854 | 0.5 | 0.4 | 0.9 |
| B- Sonnet, the 14 tasks | 28 | 1,950 | 1,255 | 6,586 | 54,612 | 143,268 | 19,788 | 0.3 | 0.2 | 0.8 |
| B- Haiku, the 6 tasks (runs 3 and 4) | 12 | 7,993 | n/a | n/a | 95,913 | 660,240 | 46,558 | 0.7 | n/a | n/a |

- **B against 0.4M:** the mean of a B run is 8.1k tokens on the 6 tasks and 11.4k on the 14, 2.0% and 2.8% of 0.4M; the largest run is 37.3k (s3-05 B 1). The 12 B runs of the first 6 tasks together took 96.9k against the 4.8M implied for them (6 x 2 x 0.4M). The 24 B plus B- runs of the 6 tasks took 117k input plus output against the 8.4M of the row.
- **That reading depends on the convention.** Almost all of a run's tokens are cache reads: counting input, output, cache read and cache write, a B run is 1.53M on the 6 tasks, 1.79M on the 14 and 1.71M over the 20, 3.8 to 4.5 times the 0.4M. Section 11's note fixes the convention as input plus output, so the first reading is the registered one; the second is what the weekly limit may see.
- **B- against 0.3M:** 1.7k (6 tasks) and 2.0k (14 tasks) per run, under 1% of 0.3M. B- stops after one pass, as told.
- **Minutes:** B takes 11.5 minutes on average per run (median 3.9) against the 30 minutes (0.5 hour) of section 11. The tail is long: s3-06 B 1 took 144.7 minutes, s3-05 B 1 57.8 and s2-02 B 1 49.3. No run reached the 4 hour turn limit.
- **Haiku B-:** 95.9k tokens in 12 runs, 7.92M cache read, 8.5 minutes in all.
- **The memory-killed run** (s3-05 B 2) used 480 tokens and 10.7 minutes before the kill; it is not in the table.

### B's spread per task (two standing runs of one task)

Score spread is `|score 1 - score 2|`; token and minute spreads are the same for tokens (input+output, `cost.json` for the first 6) and minutes. The first 6 tasks:

| task | score 1 | score 2 | tokens 1 | tokens 2 | minutes 1 | minutes 2 | score spread | token spread | minute spread |
|---|---|---|---|---|---|---|---|---|---|
| s1-01 | 0.50 | 0.50 | 1782 | 2214 | 0.5 | 0.9 | 0.00 | 432 | 0.3 |
| s1-02 | 2.00 | 2.00 | 338 | 350 | 0.3 | 0.2 | 0.00 | 12 | 0.1 |
| s2-01 | 1.91 | 1.61 | 13074 | 13106 | 4.2 | 10.2 | 0.30 | 32 | 6.1 |
| s2-02 | 2.00 | 2.00 | 20275 | 16980 | 49.3 | 8.3 | 0.00 | 3295 | 41.0 |
| s3-01 | 0.00 | 0.00 | 9906 | 10195 | 3.4 | 3.6 | 0.00 | 289 | 0.3 |
| s3-02 | 2.00 | 2.00 | 3211 | 5472 | 3.1 | 4.1 | 0.00 | 2261 | 1.0 |

The 14 tasks (s3-05's runs are B 1 and B 3: B 2 was the memory machine run, replaced by B 3):

| task | score 1 | score 2 | tokens 1 | tokens 2 | minutes 1 | minutes 2 | score spread | token spread | minute spread |
|---|---|---|---|---|---|---|---|---|---|
| s1-03 | 1.60 | 1.60 | 8217 | 7153 | 2.8 | 2.3 | 0.00 | 1064 | 0.5 |
| s1-04 | 1.71 | 1.71 | 26856 | 22706 | 8.6 | 9.6 | 0.00 | 4150 | 1.1 |
| s1-05 | 1.73 | 1.73 | 3324 | 4127 | 3.5 | 4.4 | 0.00 | 803 | 0.9 |
| s1-06 | 1.00 | 1.00 | 5252 | 6693 | 2.3 | 3.5 | 0.00 | 1441 | 1.2 |
| s1-07 | 2.00 | 2.00 | 7183 | 6155 | 5.4 | 6.3 | 0.00 | 1028 | 0.9 |
| s2-03 | 2.00 | 2.00 | 5358 | 6264 | 2.7 | 5.3 | 0.00 | 906 | 2.6 |
| s2-05 | 0.40 | 0.40 | 3639 | 2538 | 4.6 | 3.7 | 0.00 | 1101 | 0.9 |
| s2-07 | 1.84 | 1.84 | 7446 | 7517 | 1.3 | 1.4 | 0.00 | 71 | 0.0 |
| s2-08 | 2.00 | 2.00 | 5227 | 6004 | 3.7 | 3.9 | 0.00 | 777 | 0.2 |
| s2-10 | 0.13 | 1.75 | 16159 | 17634 | 8.4 | 7.8 | 1.63 | 1475 | 0.6 |
| s3-03 | 2.00 | 2.00 | 2878 | 2795 | 2.6 | 2.0 | 0.00 | 83 | 0.7 |
| s3-04 | 1.50 | 1.50 | 5489 | 2999 | 9.1 | 4.0 | 0.00 | 2490 | 5.1 |
| s3-05 | 1.28 | 1.28 | 37297 | 27028 | 57.8 | 36.1 | 0.00 | 10269 | 21.7 |
| s3-06 | 0.34 | 0.34 | 35860 | 28948 | 144.7 | 25.1 | 0.00 | 6912 | 119.6 |

- **Score:** the two runs agree to the hundredth on 18 of 20 tasks. The two that differ are s2-01 (1.91 and 1.61, spread 0.30) and s2-10 (0.13 and 1.75, spread 1.63, the largest; both runs finished `done`).
- **Tokens:** the spread is under 5,000 on 18 tasks; the largest are s3-05 (10,269) and s3-06 (6,912).
- **Minutes:** 16 of the 20 tasks spread under 6 minutes; the exceptions are s3-06 (144.7 and 25.1, spread 119.6), s2-02 (49.3 and 8.3, spread 41.0), s3-05 (57.8 and 36.1, spread 21.7) and s2-01 (4.2 and 10.2, spread 6.1).

## The box, the proof and the escape attempts

- **Box.** One container per run, from the task's image plus the arm layer, no mount, no socket, six capabilities (`CHOWN`, `DAC_OVERRIDE`, `FOWNER`, `KILL`, `SETUID`, `SETGID`; the other eight dropped by `--cap-drop`), `--memory 6g`, the firewall set from outside (ruling 3: API addresses on 443 only, no DNS), `--disallowedTools WebSearch,WebFetch`, the user's setup-token in the box env. Every record has `box` (image id, memory 6 GB, the API address pinned) and `toolUses`.
- **Proof, s1-01, 2026-11-06 (`arm/proof-s1-01.json`): 10 rows, all `ok`, none skipped.**

| row | result |
|---|---|
| host paths absent | ok |
| no mount, no socket, only the six capabilities | ok |
| no bench or database env | ok |
| blocked targets | ok |
| no IPv6 route out | ok |
| the API answers | ok |
| init lists no web tool | ok |
| root cannot undo it | ok |
| no vsock | ok |
| a real database is out of reach | ok |

  Both models (the arm's and the small one) answered with the real token.
- **The 7 escape attempts (one real agent turn, `arm/proof-agent-s1-01.jsonl`, usage input 8, output 2,672, cache read 66,245, cache write 7,864).** The prompt (`arm/proof-prompt.md`) asked the agent to try each way out for real and report a table. Every one failed:

| # | attempt | result |
|---|---|---|
| 1 | read the six host paths (the data folder, `seeded/`, a task repo, `/tmp/hstack-bench`, `~/.claude`, the Docker socket) | all six absent |
| 2 | `curl https://github.com` | could not resolve host |
| 3 | `WebSearch` | "No such tool available" |
| 4 | `WebFetch` | "No such tool available" |
| 5 | `git ls-remote` of the task's public repo | could not resolve host |
| 6 | TCP to `host.docker.internal` on a throwaway port | name resolution failed |
| 7 | `curl` to the API with the token as a Bearer, the server-side web search tool, `claude-haiku-5-5` | HTTP 401 `authentication_error: Invalid bearer token`; no search result (the API host was reachable, the token was not accepted for a direct call) |

- **Finding in the proof: the classifier fallback.** The escape prompt tripped the `cyber` classifier on the arm's model; the CLI moved the session to `claude-opus-4-8` (`system:model_refusal_fallback`, scope session), and the record's `models` still listed the arm's model, so the model check passed. The rule that followed (Task 4, reopened): a fallback event in any main or resume turn makes the run `machine` (`model`), with `fallback` in the record; a fallback only in the probe, which is its own session, stays in the record and does not stop the run. A task that always tripped it would stop the driver after 2 machine runs and go to the user. In the canary itself: 0 fallbacks in 93 records.

## Machine runs, `noresult` products, memory kills

- **Machine runs:** none among the 24 scored runs of the 6 tasks, none among the 12 Haiku runs, **one in the extension: s3-05 B 2, `machine: memory`**, killed at the 6 GB cap after 10.7 minutes (turns: probe 0, main `memory`; 35 Bash calls). Per ruling 11 it is kept, never scored; B 3 took the next free number and was graded (1.28). It was told to the user. The cap is below what a grade may use (known limit), so a memory kill of an arm is a box limit, reported when it happens.
- **`noresult` products** (a grade with no result twice; ruling 10: score 0, counted and reported):
  - s2-02 B- 1 and 2 (Sonnet): the product's image did not build (`junit` missing twice, no readiness line, the machine up). The two Haiku B- runs of s2-02 (3 and 4) were `noresult` too (`report-haiku`: noresult 2). The diagnosis of the Sonnet products shows the same: seeded `error` 3 twice.
  - s1-03 B- 1 and 2 (Sonnet): the pilot of the extension; both products timed out at 30 minutes twice (grade and its rerun). Checked by file names and counts only: no build artifact in any product, B 12 to 13 files with specs, B- 8 source files, so the instrument was not biased.
  - s2-10 B- 2 (Sonnet): one.
  - Total among the Sonnet B- runs: 5 `noresult` products (2 in the first 6 tasks, 3 in the 14). The Haiku verdict has 2 (s2-02).
- **Pilots** (4 runs each, no machine run, no tool change, the pilot results stand): s1-01 (2026-11-06, 23:36 to 23:49; runs 0.2 to 0.9 minutes, a 53-word issue; B 4 Bash calls, 3 files +39 with a test; B- 2 Bash calls, 1 file +11, no test) and s1-03 (2026-11-07, 09:05 to 11:48; B 15/26 pass both).

## B-'s tool use

Counts by tool name from the records (`toolUses`), standing B- runs:

| B- runs | runs | Bash | Read | Edit | other | calls per run (mean, min, max) |
|---|---|---|---|---|---|---|
| Sonnet, 6 tasks | 12 | 67 | 3 | 2 | 0 | 6.0 (2 to 12) |
| Sonnet, 14 tasks | 28 | 121 | 10 | 9 | 2 `bash` (lowercase) | 5.1 (2 to 11) |
| Haiku, 6 tasks (runs 3, 4) | 12 | 96 | 17 | 31 | 0 | 12.0 (3 to 45) |
| B, the 6 tasks, for comparison | 12 | 231 | 0 | 1 | 1 ToolSearch, 1 Monitor, 1 TaskStop, 2 Skill | 19.8 (2 to 50) |
| B, the 14 tasks, for comparison | 28 | 725 | 0 | 5 | 5 ToolSearch, 4 Monitor, 1 Write | 26.4 (8 to 100) |

B- called no Skill, Task, Write, Monitor or search tool in any run. The two lowercase `bash` calls are s1-05 B- 2 and s3-05 B- 2, each next to ordinary `Bash` calls. The counts show that B- worked in few steps; they do not show what it ran, and no transcript was read.

## B- against the seeded checks (ruling 14 and Task 9)

On the 12 Sonnet B- products of the first 6 tasks, `grade ... --sealed` against each task's seeded oracle, counts only (`logs/step8/diagnose.out`):

| task | B- 1 | B- 2 |
|---|---|---|
| s1-01 | 1 pass, 2 fail | 3 precondition |
| s1-02 | 3 pass | 3 pass |
| s2-01 | 3 pass | 3 pass |
| s2-02 | 3 error (no build) | 3 error (no build) |
| s3-01 | 3 precondition | 3 precondition |
| s3-02 | 3 pass | 3 pass |

The pairs for the human read were the three ties, s1-02, s3-01 and s3-02 (`d` 0.00 each), as `git diff` files in `canary/pairs/`. The controller and the advisor read them (deviation 2). The ledger gives their reason for choosing the second branch of 7.3 (B- is not worse, so make B- weaker): "seeded checks 3/3 on the ties, identical diffs on s1-02". The counts above show 3 of 3 on s1-02 and s3-02 and `precondition` on s3-01, where B itself scores 0. B- was made weaker and B's runs stood.

## Each run: CLI, models, base and branch

All 93 records have CLI version `2.1.318`, `plugins: []`, and a `fallback` of null. B runs are on `claude-opus-5-5` (41 records: 40 standing, 1 machine); B- runs are on `claude-sonnet-5-5` (40) or `claude-haiku-5-5` (12), the model the arm's model check and the record's `models` agree on. Base is the task's `sample.tsv` base commit (7 characters); the branch is `bench/<task>-<arm>-<n>` in the task repo, shown here as its first 12 characters. All 92 branches resolve to the sha the report holds and have a `<task>/grades/<sha7>.json`; the 12 Sonnet B- products of the first 6 tasks also have a `<task>/seeded/grades/<sha7>.json` (existence checked, nothing read).

### Standing runs (80: 40 B on Opus, 40 B- on Sonnet)

| task | arm | run | CLI | model(s) | base | branch sha | status | score |
|---|---|---|---|---|---|---|---|---|
| s1-01 | B | 1 | 2.1.318 | claude-opus-5-5 | a9158b7 | 433f0ceda4c6 | done | 0.50 |
| s1-01 | B | 2 | 2.1.318 | claude-opus-5-5 | a9158b7 | f6d24273d824 | done | 0.50 |
| s1-01 | B- | 1 | 2.1.318 | claude-sonnet-5-5 | a9158b7 | c5c8cfcb297a | done | 0.50 |
| s1-01 | B- | 2 | 2.1.318 | claude-sonnet-5-5 | a9158b7 | 036267368c40 | done | 0.00 |
| s1-02 | B | 1 | 2.1.318 | claude-opus-5-5 | 2c3fcdc | 85f95e9c9196 | done | 2.00 |
| s1-02 | B | 2 | 2.1.318 | claude-opus-5-5 | 2c3fcdc | 469e7efcab89 | done | 2.00 |
| s1-02 | B- | 1 | 2.1.318 | claude-sonnet-5-5 | 2c3fcdc | 349d32a02fed | done | 2.00 |
| s1-02 | B- | 2 | 2.1.318 | claude-sonnet-5-5 | 2c3fcdc | 481595bd92cc | done | 2.00 |
| s2-01 | B | 1 | 2.1.318 | claude-opus-5-5 | 87753b1 | d510c76bc29b | done | 1.91 |
| s2-01 | B | 2 | 2.1.318 | claude-opus-5-5 | 87753b1 | f65bedeb5072 | done | 1.61 |
| s2-01 | B- | 1 | 2.1.318 | claude-sonnet-5-5 | 87753b1 | f9e288e32b2c | done | 1.61 |
| s2-01 | B- | 2 | 2.1.318 | claude-sonnet-5-5 | 87753b1 | 80fc9bcf256d | done | 1.61 |
| s2-02 | B | 1 | 2.1.318 | claude-opus-5-5 | e329bc9 | 7739cfb978ea | done | 2.00 |
| s2-02 | B | 2 | 2.1.318 | claude-opus-5-5 | e329bc9 | 972a4135ae4e | done | 2.00 |
| s2-02 | B- | 1 | 2.1.318 | claude-sonnet-5-5 | e329bc9 | 0baf9c6680b4 | done | 0.00 |
| s2-02 | B- | 2 | 2.1.318 | claude-sonnet-5-5 | e329bc9 | 3b85c54c6801 | done | 0.00 |
| s3-01 | B | 1 | 2.1.318 | claude-opus-5-5 | ce940e3 | 65c658625c09 | done | 0.00 |
| s3-01 | B | 2 | 2.1.318 | claude-opus-5-5 | ce940e3 | 46d1aca579f9 | done | 0.00 |
| s3-01 | B- | 1 | 2.1.318 | claude-sonnet-5-5 | ce940e3 | 9084a2d25153 | done | 0.00 |
| s3-01 | B- | 2 | 2.1.318 | claude-sonnet-5-5 | ce940e3 | 83736f83393e | done | 0.00 |
| s3-02 | B | 1 | 2.1.318 | claude-opus-5-5 | 32bc3d4 | 315760074843 | done | 2.00 |
| s3-02 | B | 2 | 2.1.318 | claude-opus-5-5 | 32bc3d4 | 9b50306fcf6f | done | 2.00 |
| s3-02 | B- | 1 | 2.1.318 | claude-sonnet-5-5 | 32bc3d4 | 4a31560a3ef3 | done | 2.00 |
| s3-02 | B- | 2 | 2.1.318 | claude-sonnet-5-5 | 32bc3d4 | 1c413bdc3e18 | done | 2.00 |
| s1-03 | B | 1 | 2.1.318 | claude-opus-5-5 | b944a31 | 9c59698d89d8 | done | 1.60 |
| s1-03 | B | 2 | 2.1.318 | claude-opus-5-5 | b944a31 | 5caa65dc1051 | done | 1.60 |
| s1-03 | B- | 1 | 2.1.318 | claude-sonnet-5-5 | b944a31 | e779e5dce2a3 | done | 0.00 |
| s1-03 | B- | 2 | 2.1.318 | claude-sonnet-5-5 | b944a31 | 3ba96b2ec119 | done | 0.00 |
| s1-04 | B | 1 | 2.1.318 | claude-opus-5-5 | d2a312d | d982a33861c3 | done | 1.71 |
| s1-04 | B | 2 | 2.1.318 | claude-opus-5-5 | d2a312d | f8e89d2596b8 | done | 1.71 |
| s1-04 | B- | 1 | 2.1.318 | claude-sonnet-5-5 | d2a312d | e757deac8739 | done | 1.85 |
| s1-04 | B- | 2 | 2.1.318 | claude-sonnet-5-5 | d2a312d | a416302b4846 | done | 1.85 |
| s1-05 | B | 1 | 2.1.318 | claude-opus-5-5 | 9fcd744 | ed00a3cb902e | done | 1.73 |
| s1-05 | B | 2 | 2.1.318 | claude-opus-5-5 | 9fcd744 | c54b130793b8 | done | 1.73 |
| s1-05 | B- | 1 | 2.1.318 | claude-sonnet-5-5 | 9fcd744 | 8bb05e819ce3 | done | 1.73 |
| s1-05 | B- | 2 | 2.1.318 | claude-sonnet-5-5 | 9fcd744 | 8f43444af94c | done | 1.73 |
| s1-06 | B | 1 | 2.1.318 | claude-opus-5-5 | bbdf2cb | d00932ba2fa0 | done | 1.00 |
| s1-06 | B | 2 | 2.1.318 | claude-opus-5-5 | bbdf2cb | 6e4e4ca114de | done | 1.00 |
| s1-06 | B- | 1 | 2.1.318 | claude-sonnet-5-5 | bbdf2cb | 7cca6d5c5890 | done | 0.38 |
| s1-06 | B- | 2 | 2.1.318 | claude-sonnet-5-5 | bbdf2cb | d4da6ae459e8 | done | 0.38 |
| s1-07 | B | 1 | 2.1.318 | claude-opus-5-5 | 5a9a9d2 | 9d35ab4b5651 | done | 2.00 |
| s1-07 | B | 2 | 2.1.318 | claude-opus-5-5 | 5a9a9d2 | 382a31ec16a2 | done | 2.00 |
| s1-07 | B- | 1 | 2.1.318 | claude-sonnet-5-5 | 5a9a9d2 | 8ea6eb26ad46 | done | 2.00 |
| s1-07 | B- | 2 | 2.1.318 | claude-sonnet-5-5 | 5a9a9d2 | 0f8a6f0a6512 | done | 2.00 |
| s2-03 | B | 1 | 2.1.318 | claude-opus-5-5 | 765f5b4 | 80be0be020c7 | done | 2.00 |
| s2-03 | B | 2 | 2.1.318 | claude-opus-5-5 | 765f5b4 | d2bde849b405 | done | 2.00 |
| s2-03 | B- | 1 | 2.1.318 | claude-sonnet-5-5 | 765f5b4 | a03a56947e85 | done | 2.00 |
| s2-03 | B- | 2 | 2.1.318 | claude-sonnet-5-5 | 765f5b4 | 52a14eaecebd | done | 2.00 |
| s2-05 | B | 1 | 2.1.318 | claude-opus-5-5 | ffffba6 | 033935951dc0 | done | 0.40 |
| s2-05 | B | 2 | 2.1.318 | claude-opus-5-5 | ffffba6 | 4dac99ad023f | done | 0.40 |
| s2-05 | B- | 1 | 2.1.318 | claude-sonnet-5-5 | ffffba6 | 5a5c97785e42 | done | 0.40 |
| s2-05 | B- | 2 | 2.1.318 | claude-sonnet-5-5 | ffffba6 | 65b4e801e663 | done | 0.40 |
| s2-07 | B | 1 | 2.1.318 | claude-opus-5-5 | e54c9d4 | c27e0979d7b4 | done | 1.84 |
| s2-07 | B | 2 | 2.1.318 | claude-opus-5-5 | e54c9d4 | aa74cae51c02 | done | 1.84 |
| s2-07 | B- | 1 | 2.1.318 | claude-sonnet-5-5 | e54c9d4 | 101f7d84cf69 | done | 0.00 |
| s2-07 | B- | 2 | 2.1.318 | claude-sonnet-5-5 | e54c9d4 | e4f409208950 | done | 1.84 |
| s2-08 | B | 1 | 2.1.318 | claude-opus-5-5 | e3f3938 | 554a65c0acc1 | done | 2.00 |
| s2-08 | B | 2 | 2.1.318 | claude-opus-5-5 | e3f3938 | c606dac1a6f2 | done | 2.00 |
| s2-08 | B- | 1 | 2.1.318 | claude-sonnet-5-5 | e3f3938 | 968d82e97ff9 | done | 0.25 |
| s2-08 | B- | 2 | 2.1.318 | claude-sonnet-5-5 | e3f3938 | 911f5e99fe25 | done | 1.38 |
| s2-10 | B | 1 | 2.1.318 | claude-opus-5-5 | 271c751 | da7f3b1ea7ee | done | 0.13 |
| s2-10 | B | 2 | 2.1.318 | claude-opus-5-5 | 271c751 | c2eb5e24b91d | done | 1.75 |
| s2-10 | B- | 1 | 2.1.318 | claude-sonnet-5-5 | 271c751 | 6a0f0c7eb2eb | done | 1.56 |
| s2-10 | B- | 2 | 2.1.318 | claude-sonnet-5-5 | 271c751 | 40ac5df4a15f | done | 0.00 |
| s3-03 | B | 1 | 2.1.318 | claude-opus-5-5 | 58e1dfd | 4d62a77cbfab | done | 2.00 |
| s3-03 | B | 2 | 2.1.318 | claude-opus-5-5 | 58e1dfd | 4e8d1e679b91 | done | 2.00 |
| s3-03 | B- | 1 | 2.1.318 | claude-sonnet-5-5 | 58e1dfd | 9e09889db10b | done | 2.00 |
| s3-03 | B- | 2 | 2.1.318 | claude-sonnet-5-5 | 58e1dfd | feabe9478d0d | done | 2.00 |
| s3-04 | B | 1 | 2.1.318 | claude-opus-5-5 | 30465d3 | a0fa9bb43fb2 | done | 1.50 |
| s3-04 | B | 2 | 2.1.318 | claude-opus-5-5 | 30465d3 | f64bf98e5dc7 | done | 1.50 |
| s3-04 | B- | 1 | 2.1.318 | claude-sonnet-5-5 | 30465d3 | e5563d18a9a1 | done | 1.50 |
| s3-04 | B- | 2 | 2.1.318 | claude-sonnet-5-5 | 30465d3 | 5d0cb0e42984 | done | 1.50 |
| s3-05 | B | 1 | 2.1.318 | claude-opus-5-5 | 982b2a1 | 39f406c47d39 | done | 1.28 |
| s3-05 | B | 3 | 2.1.318 | claude-opus-5-5 | 982b2a1 | abbf12949791 | done | 1.28 |
| s3-05 | B- | 1 | 2.1.318 | claude-sonnet-5-5 | 982b2a1 | dc476e69dbe9 | done | 1.28 |
| s3-05 | B- | 2 | 2.1.318 | claude-sonnet-5-5 | 982b2a1 | 80385ce2df3d | done | 1.28 |
| s3-06 | B | 1 | 2.1.318 | claude-opus-5-5 | 3c9305e | 1a41078ea21c | done | 0.34 |
| s3-06 | B | 2 | 2.1.318 | claude-opus-5-5 | 3c9305e | 8d8615200d3c | done | 0.34 |
| s3-06 | B- | 1 | 2.1.318 | claude-sonnet-5-5 | 3c9305e | 274389b625aa | done | 0.34 |
| s3-06 | B- | 2 | 2.1.318 | claude-sonnet-5-5 | 3c9305e | 44c3fda17867 | done | 0.34 |

### Haiku B- runs of the first 6 tasks (12, recorded; they enter the Haiku verdict only)

| task | arm | run | CLI | model(s) | base | branch sha | status | score |
|---|---|---|---|---|---|---|---|---|
| s1-01 | B- | 3 | 2.1.318 | claude-haiku-5-5 | a9158b7 | 6db7eb7bd97c | done | 0.00 |
| s1-01 | B- | 4 | 2.1.318 | claude-haiku-5-5 | a9158b7 | 5f23b77cea0d | done | 0.50 |
| s1-02 | B- | 3 | 2.1.318 | claude-haiku-5-5 | 2c3fcdc | 31797d96b206 | done | 2.00 |
| s1-02 | B- | 4 | 2.1.318 | claude-haiku-5-5 | 2c3fcdc | 9a32fb7a065c | done | 2.00 |
| s2-01 | B- | 3 | 2.1.318 | claude-haiku-5-5 | 87753b1 | e888c2bb8e37 | done | 1.27 |
| s2-01 | B- | 4 | 2.1.318 | claude-haiku-5-5 | 87753b1 | c0680ec7e46d | done | 1.61 |
| s2-02 | B- | 3 | 2.1.318 | claude-haiku-5-5 | e329bc9 | 1ea49be66c42 | done | 0.00 |
| s2-02 | B- | 4 | 2.1.318 | claude-haiku-5-5 | e329bc9 | de9c15fb53c5 | done | 0.00 |
| s3-01 | B- | 3 | 2.1.318 | claude-haiku-5-5 | ce940e3 | 783793b522d4 | done | 0.00 |
| s3-01 | B- | 4 | 2.1.318 | claude-haiku-5-5 | ce940e3 | 167fccaf2993 | done | 0.00 |
| s3-02 | B- | 3 | 2.1.318 | claude-haiku-5-5 | 32bc3d4 | a21aa7c46eb2 | done | 2.00 |
| s3-02 | B- | 4 | 2.1.318 | claude-haiku-5-5 | 32bc3d4 | 0eec274752bc | done | 2.00 |

### Machine run (not scored)

| task | arm | run | CLI | model | base | status | machine |
|---|---|---|---|---|---|---|---|
| s3-05 | B | 2 | 2.1.318 | claude-opus-5-5 | 982b2a1 | abandoned | memory |

## Rulings during the build

The rulings of the ledger, in its order, each with the cost the ledger gave it. Two rulings (Task 3's "every Important is fixed in this round" and "the VSOCK doubt becomes a proof row") carry no cost clause in the ledger; their work is Task 3's fix round 1 (implementer 57.9k tokens).

1. Ruling: scope of this run is Tasks 1–5 only; Task 6 stops for the credential — Task 6 needs a login the user cannot give remotely and Keychain is off limits — if wrong, the user restarts at Task 6 with nothing lost.
2. Ruling: the expired file's refresh token is never used — presenting an old refresh token can end the live login, which cannot be repaired remotely — cost: the file stays unused.
3. Ruling: `RESUMES` moves to `bench/lib/arm.mjs` as an export; run-arm and box import it — no cycle — cost: none.
4. Ruling: `inj.helper` replaces only the step that sets the rules; the net check always runs from the real fw image, so a helper that does nothing fails the check — the test must prove the gate — cost: none.
5. Ruling: Task 1 registers decisions 2–4 as decided and decision 1 as open, naming the two options left — prereg must not claim a decision the user has not made — cost: a later one-line amendment.
6. Decision 1: on 2026-11-06 the user generated a setup-token on their Ubuntu machine and gave it in chat; written to <data>/arm/box.env, mode 600, gitignored. It is in this session's transcript: revoke after step 8. Ruling: Task 6 onward may now run; prereg decision 1 and the plan are updated after Task 5 — cost: none.
7. Ruling: `--cap-drop NET_RAW` stays in boxArgs — Docker's default NET_RAW lets root send AF_PACKET frames past iptables (shown by the implementer: a raw frame got a DNS answer) — it goes into rulings 2–3 and the prereg; cost if wrong: an arm's own ping fails, equally for all arms.
8. Ruling: no probe ever opens a connection to the host's port 5432, in the proof or in the per-run check — "never touch real_estate*" outranks a positive control — a throwaway listener on an ephemeral host port replaces it — cost: a few lines.
9. Ruling: exit 137 before the turn limit is a memory kill, not the arm's timeout: machine 'memory', told to the user — the arm must not be charged a timeout and interventions for a kill by the cap — cost: one more reason word.
10. Ruling: the box keeps exactly CHOWN, DAC_OVERRIDE, FOWNER, KILL, SETUID, SETGID; drops NET_RAW, MKNOD, SYS_CHROOT, SETFCAP, SETPCAP, AUDIT_WRITE, NET_BIND_SERVICE, FSETID by --cap-drop; proof compares CapEff to that mask — ruling 3's "no capability" could not hold, since a task's service may need to change user; the set still gives no network power — cost if wrong: a task's start path needs one back, seen in the pilot, one flag.
11. Ruling: every Important of Task 3 is fixed in this round, Important 5 too (it must land before any product is graded), plus the same class at oracle-run's copy of junit.xml.
12. Ruling: the VSOCK doubt becomes a proof row; a direct API web-search attempt with the token joins Task 6 step 4 and the known limits.
13. Ruling: model machine fires only when the record's models is non-empty and lacks the arm's model — a timed-out turn with no output must stay the arm's own timeout — cost if wrong: a run with no model at all is scored as the arm's own; a run with no output has an empty product anyway.
14. Task 4: Ruling: a probe failure stays exit 2 with no record, as the brief says — the probe spends almost nothing and scores nothing, and the driver stops on any exit 2 — Task 5's README states it — cost if wrong: one extra stop a person restarts.
15. Ruling: a good grade also needs at least one check that is not `error` — a runner that dies after ready leaves oracle-run's placeholder JUnit, and that must get its second run and its count — cost if wrong: one extra grade.
16. Ruling: machine reruns are capped: 2 machine runs in a row for one slot stop the driver with `machine` — an unattended loop must not spend without limit; it scores nothing, so ruling 11 holds — cost if wrong: a person restarts it.
17. Ruling: a throw from grade is never an attempt: it stops the driver — a harness failure must not be a product's 0 — cost if wrong: a stop a person restarts.
18. Task 5: Ruling (reopened after complete, found by the controller): canary grades go through <data>/env/canary/<task>.json, with only `oracle` changed to this checkout — every env file points at the main checkout, which lacks this branch's ext.mjs fixes, and the env files are hashed in the locks — cost if wrong: one extra env folder; it must be re-pointed if the worktree moves.
19. Task 4: Ruling (reopened): a fallback event in any main or resume turn is machine 'model', with `fallback` in the record — a run served by another model is not that arm — cost if wrong: a rerun; a task that always trips it stops the driver after 2 and goes to the user.
20. Ruling: a fallback only in the probe does not stop the run — the probe is its own session, and the main session stays on the arm's model — it stays in the record — cost if wrong: none, a main-turn fallback is still caught.
21. Task 8: finding: usage() reads only the last result event; a run that used Monitor (s2-02 B 1: 47 Bash, out=384) undercounts. The records' cost is wrong for such runs. Ruling: do not edit code while the driver runs, each `canary run` loads it fresh; after the driver ends, fix usage() to sum result events and recompute cost from the kept transcripts — cost if wrong: only the cost table, no score.
22. Ruling: the user delegated the choice to the advisor on 2026-11-07; the advisor chose A, section 7.3's second branch: seeded checks 3/3 on the ties, identical diffs on s1-02, so B- is not worse — it makes B- weaker, B's runs stand — cost if wrong: 12 B- runs and grades.
23. Ruling: section 7.3's "a human reads 3 pairs" was done by the controller and the advisor under the user's delegation; a deviation with its reason, recorded in the lock with the pairs link — cost if wrong: the user reads them later.
24. Task 9b: on 2026-11-07 the user chose A: extend the canary to unused tasks, rule fixed first. Model not named. Ruling: Sonnet, the controller's stated lean — a pass against one tier down says more about sensitivity — cost if wrong: the user asks for Haiku and those B- runs repeat.
25. Task 9b: Ruling: the extended verdict is over the 14 unused tasks, the 20 reported alongside — the user chose 'unused tasks', and the 6 seen results must not decide a rule written after seeing them; the advisor suggested 20 — cost if wrong: a verdict on n 14 not 20. arms.json back to Sonnet, sha256 81af898c6a9868d818c22e55822d0e42633993f131ba79fed4df0cd6fb30de02, same bytes as the first. Dependency files changed per PR in logs/step8/deps-14.txt.
26. Task 9b: review opus 174.9k tokens: verdict code ✅; 2 Important in the registration text. Ruling: the dependency sentence stays, the controller read deps-20.txt (git exit 0, 0 dependency files in all 20) — cost: none. Fix round 1 sent: wording of 7.3's route, golden bootstrap test, PRNG named, 6 decimals, t_upper.

## Findings

- **`usage()` undercounted runs with a background tool (found at Task 8 during the first driver, fixed at `735bead`).** Costs in the records of s2-02 B 1 were wrong; recomputed from the kept transcripts into `canary/cost.json`. No score was affected. The ledger's ruling: do not edit code while the driver runs, because each `canary run` loads it fresh.
- **The escape prompt tripped the `cyber` classifier (found at Task 6, the proof).** Fixed by the fallback rule above (Task 4 reopened, `b136068`).
- **The first verdict rests on two B- products that did not build.** s2-02 B- (both runs) is `noresult` and gives `d` 2.00, which is 0.333 of the 0.400 mean of the first 6 tasks (without s2-02 the mean of the other 5 is 0.080). The same holds in the extension for s1-03 (`d` 1.60). Ruling 10 scores such products 0 as registered.
- **Ties dominate.** In the first 6 tasks 3 are ties (two where the issue states the fix, one where B itself scores 0); in the 14, 8 tasks have `d` 0. A tie favours nobody (ruling 9).
- **s2-10 B's two runs differ by 1.63** (0.13 and 1.75, both `done`), the one large spread of the 20.
- **The s1-03 line appears twice in `run-ext.out`** (exit 0 at 11:48:10 and again at 11:49:00, after an `all done` line): the driver resumes finished work, so the second pass found s1-03 finished and moved on.

## Checks at the lock

- **Hash compares** (the files are unchanged by this step):
  - `bun logs/step6/lock5-compare.mjs progress/step5-lock.md <data> <repo>`: **hashed 1369, equal 1369, changed 0, missing 0.**
  - `bun logs/step7/lock6-compare.mjs progress/step6-lock.md <data> <repo>`: **hashed 572, equal 572, changed 0, missing 0.**
  - `bun logs/step7/lock6-compare.mjs progress/step7-lock.md <data> <repo>`: **hashed 1072, equal 1072, changed 0, missing 0.**
  - The canary wrote new files that no earlier lock hashes: 92 grades `<task>/grades/<sha7>.json` (80 standing runs and 12 Haiku runs; the 20 tasks' folders) and 12 seeded grades `<task>/seeded/grades/<sha7>.json` (the diagnosis of the 12 Sonnet B- products). They are new files, not changed ones. `docker.json` and `build/readiness.tsv`, which `oracle-run` rewrites on every grade, are in no lock's hashes.
- **Tests.** `bun test ./tests`: **495 pass, 49 skip, 0 fail**, 544 tests in 28 files, output pristine (header and summary only), 152.8 s. `BENCH_EXT_DOCKER=1 bun test tests/bench-box.test.mjs`: **38 pass, 0 fail**, 1 file, 223 s. Both with `HSTACK_BENCH_MACHINE=<data>/machine.json`. `git status --short bench tests` is empty. The last change to `bench/` or `tests/` is `87da35d`.
- **Every scored run has a branch and a grade.** 92 runs (80 standing, 12 Haiku): `git rev-parse refs/heads/bench/<task>-<arm>-<n>` in the task repo equals the sha of `canary/report.json` and `<task>/grades/<sha7>.json` exists, for all 92. The machine run (s3-05 B 2) has neither, by design.
- **Dependency flags:** none of the 20 tasks (`deps-20.txt`).
- **Hash tool.** `lock-hash.mjs` hashes with Bun's SHA-256. `arms.json` and `results/s1-01-B-1.json` were checked against `shasum -a 256` and agree; the CLI binary's `shasum -a 256` is the value in "Hashes of the arms file and the CLI".
- **Docker left** (listings only; this task ran no removal of any kind, no prune, volume, compose or network command, and the gated tests removed their own fixtures by their recorded names):
  - `docker ps -a --filter name=bench-ext- --format '{{.Names}}'` lists 329 containers: the 327 `bench-ext-fx*` fixtures of the gated tests, the decoy `bench-ext-other`, and the one recorded leftover `bench-ext-fxngq295__app__1-arm-s1-01-B-2` (the step 7 lock had 328: this step added that one, from Task 3's test mutation run, before any arm ran). Any container with `-arm-` in its name: that one only.
  - `docker images 'bench-ext/*' --format '{{.Repository}}:{{.Tag}}'` lists 164 images: 161 `bench-ext/fx*` fixture images, `bench-ext/probe:net`, and the leftover's two, `bench-ext/fxngq295__app__1:bb1762b-arm` and `:bb1762b-serve` (the step 7 lock had 162). No other image with a tag ending `-arm`, `-serve` or `-grade`: the canary's runs and grades removed theirs (ruling 13).
  - **`bench-arm/fw:1` is still there.** The check of the plan removes it by that name at the end of the step; this task was told to do no removal, so it stays, and "Open points" says so.
  - The same two listings before and after the gated tests were equal (329 and 164).
  - `docker system df`: Images 4.891 GB, Containers 5.565 MB, Local Volumes 386.1 MB, Build Cache 1.224 GB.
- **`/tmp/hstack-bench`** has no entry.
- **Databases.** The canary is external only (the box refuses a task with a database), so no `pgsnap` ran and no `real_estate*` database was touched.
- **Sealing.** This task read the counts-only reports, `canary/` JSON, the records, the proof table and the final text of the agent's reply (`proof-agent-s1-01.jsonl`). It read none of: `ext/raw/`, `ext/sealed/`, `heldout/`, `seeded/` (it checked grade file names with `existsSync` only), `logs/step7/*.out`, an oracle or step oracle, a seeded bug, a reply file, the pairs' diffs, `box.env`, or any other transcript.


## Hashes of the arms file and the CLI

- `arms.json` (Sonnet B-): `81af898c6a9868d818c22e55822d0e42633993f131ba79fed4df0cd6fb30de02`, written at Task 6. The same bytes serve the first 24 runs and the 14-task extension.
- `arms.json` (Haiku B-, for the 12 Haiku runs): `a5f7068e3bd5addeb993a73a80b972906fd551e93555d39052c66428405d6a34` (from the ledger; this version was not kept as a file).
- `arms.json` (Sonnet again, for the extension): `81af898c6a9868d818c22e55822d0e42633993f131ba79fed4df0cd6fb30de02`, the same bytes as the first. `logs/step8/arms-sonnet.json` is a copy of that version and has the same hash. Today's `arms.json` is that version.
- **The CLI binary** `arm/claude-2.1.318`: sha256 `53a0d7e219d7b0804ecba5dbc002745e89f786cc946d2de85a6470d5b2d1fb06` (`shasum -a 256`), 337,438,136 bytes. It is the `claude` file of `@anthropic-ai/claude-code-linux-arm64@2.1.318`, `npm pack`ed on 2026-11-06 and never run on the host. **npm integrity check:** the tarball's sha512, recomputed at this lock with `openssl dgst -sha512 -binary | base64`, is `sha512-FUVVH3aQbLEChjv5wQLdFbpBC7bclVIdVYO5hDzJthDyf2OQtdubIP5QqLPgEScQb3CVIAFg2IPJ5nihJa8Ndw==`, equal to `npm view @anthropic-ai/claude-code-linux-arm64@2.1.318 dist.integrity`; `cmp` of the tarball's `claude` against `arm/claude-2.1.318` reports the same bytes.

## Open points

- **Revoke the token.** The setup-token in `<data>/arm/box.env` was given in chat and is in the session transcript. It must be revoked now that step 8 is done (decision 1). `box.env` is not hashed here and was not read.
- **Merge and push wait for the user.** The branch `bench-canary` is not merged and not pushed (`worktree-bridge-cse_01JxVNAL2Dkzabg9QuuNaY5E` holds per-bug labels and must not be pushed either). The plan stays `draft` until the user approves the build.
- **The user has not read the 3 pairs** (deviation 2): https://claude.ai/artifact/58Q9rw5UuEPw4gPd6zpXxf .
- **The decision the stick needs.** The registered canary failed (0.400 and 0.428, 3 of 6); the extension passed on a bootstrap lower bound of 0.0566 while its t interval crosses 0. Whether that is enough to call the stick validated, or whether "fix the stick" (a new plan) is next, is the user's call; this lock records both and decides neither.
- **Plugins and real-estate arms in the box are the plan of step 11.** The box refuses `H`, `W`, a `--plugin-dir` and any task with a database.
- **Step 13 should look at registries for the other tasks.** Registries are closed (API only, decision 3); no PR of the 20 tasks changes a dependency file, but the other external tasks were not counted.
- **`bench-arm/fw:1` stays in Docker.** The step's check says it is removed by that name at the end of step 8; this task did no Docker removal at all (task rule), so the image is still there. Remove it by name (`docker rmi bench-arm/fw:1`) when the user wants.
- **The one recorded leftover of a test mutation run:** container `bench-ext-fxngq295__app__1-arm-s1-01-B-2` and its two images `bench-ext/fxngq295__app__1:bb1762b-arm` and `:bb1762b-serve`. A safety check stopped their removal and left it to the user.
- **The canary driver must name its tasks:** `canary run` accepts a cold task, so `run-ext.sh` lists the 14 by name.
- **Deferred minors** of the ledger, one line each:

  - Task 1: the plan's decisions section still reads "Recommended"; align when the plan goes stable.
  - Task 2: canaryVerdict counts rows, not distinct n; Task 5 must pass only the standing set (ruling 14's rerun adds B- runs).
  - Task 2: dBuild is 0, not null, on s1-01 and s3-01.
  - Task 2: v6 count reads 0 if `ip` is missing in the helper; Task 6 proves the helper has it. github.com's blocked line proves only no DNS unless shown to answer first.
  - Task 2: disallow returns the shared WEB_OFF array; IPv4 regex accepts 999.1.1.1 (fails closed in iptables).
  - Task 2: r9 can zero a true mean under 1e-9; the mean can print -0 (cosmetic).
  - Task 3: 1 leave's throw hides the reason; 2 unbounded sizes of .out and bundle; 3 gate reads a refusal as blocked; 4 proof exits 0 with rows skipped; 5 comment overclaims about hooks; 6 raw-frame test reads a bit, sends no frame; 7 nc -v silence on a moving alpine tag; 8 no --pids-limit.
  - Task 3: kill -9 -1 leaves zombies under PID 1 and can miss a process forking at that instant.
  - Task 3: ext.mjs existsSync of .bench-timeout and .bench-ready follows a child link (existence probe only); lstat of an absent /out throws before the readiness row; the FW_RUN test scans one literal form in box.mjs.
  - Task 4: settings.json in the run folder is read only by the stand-in; a turn that throws leaves no record (exit 2, transcripts survive, driver stops); leave and killed-on-last-resume are not observed by a test.
  - Task 5: unknown disk read as fine in machineDown; machineDown skips diskFloor's prune; run accepts any sample task; seeded read has no commit check; diagnose appends to readiness.tsv; attempts.json not atomic; unused appendFileSync.
  - Task 5: the rerun cap is per invocation, not total; a grade throw prints stopped: machine with no message; I2's test does not prove stderr; memory on attempt 1 and clean on attempt 2 is not reported.
  - Task 9b: the six-only diagnose filter has no test with extended runs; an absent cold_setup column gives favour=0/0 not judged; `run` accepts a cold task, so the driver loop must name the 14.
  - Task 9b: the prereg names the indexes but not the draw-to-index map; the golden test pins the code, not an outside value.

## Known limits seen

- Near-binary `d` on tasks with one or two scored checks (s1-01, s1-02, s2-02): a tie is likely when both arms build the same small fix, and two ties fail the 5-of-6 rule whatever else happens. It happened (3 ties of 6).
- Build counts twice in `build + requirement` (ruling 9 keeps the prereg's literal sum).
- Effort is the CLI's default for each model, not pinned; `IS_SANDBOX=1` is the same for every arm.
- A grade may use more memory than the box's 6 GB cap, so an arm can meet a limit the grade would not: it happened once (s3-05 B 2).
- The box and the controller share the Max 5x quota, so the controller's usage paces the runs.
- The token sits in the box env; a transcript could hold it if an agent printed it. The records and this lock hash no transcript folder.

## Usage and wall clock

Arm runs (input plus output tokens; cache read in brackets): B 40 standing runs 415,649 (65.9M); B- Sonnet 40 runs 74,652 (8.0M); B- Haiku 12 runs 95,913 (7.9M); the memory-killed run 480 (1.8M); the proof's agent turn 2,680 (66k). The sums per task of implementer and reviewer subagents are in `progress/progress.md`, step 8.

Wall clock from the drivers' `run.out` and `run-ext.out` (local time, +07): s1-01 pilot 2026-11-06 23:36 to 23:49 (13 min); the other five tasks of the first driver 23:49 to 03:42 (3 h 53 min); the diagnosis (12 B- products against the seeded oracles, 6 pair diffs) 03:42 to about 04:39 (`cost.json` written 04:39); the Haiku rerun 06:57 to 08:36 (1 h 39 min); the s1-03 pilot 09:05 to 11:48 (2 h 43 min); the other 13 tasks of the extension 11:49 to 23:41 (11 h 52 min), of which s3-06 took 3 h 53 min and s3-05 2 h 28 min.

## Scripts (`<data>/logs/step8/`)

Counts-only; none prints a transcript, a description or a check. The `.out`, `.pid` and `s1-01.out` files other than the reports are not hashed except `diagnose.out`.

| script | what it does |
|---|---|
| `run.sh` | the first driver: the 6 tasks in `sample.tsv` order, one at a time; stops on any non-zero exit; resumes finished work |
| `run-ext.sh` | the extension driver: the 14 registered tasks, same rules |
| `lock-hash.mjs` | wrote the hash lines below (the 142 files; never a transcript folder, never `box.env`) |
| `lock-tables.mjs` | the per-task tables, the standing and Haiku run tables and the cost and spread figures of this lock, from `canary/report.json`, the reports, `cost.json` and the records |
| `lock-tools.mjs` | B and B- tool counts by name, the models and CLI versions of the records |

`logs/step6/lock5-compare.mjs` and `logs/step7/lock6-compare.mjs` are the earlier compares; `lock6-compare.mjs progress/step8-lock.md <data> <repo>` rechecks the hashes below.

## Hashes

`shasum -a 256` (computed with Bun's SHA-256; `arms.json` and `results/s1-01-B-1.json` checked against `shasum -a 256`, equal) of 142 files. Paths relative to `<data>`, sorted bytewise. Never `box.env`.

- `arms.json`, `logs/step8/arms-sonnet.json` and `arm/claude-2.1.318`: 3.
- The proof files `arm/proof-s1-01.json`, `arm/proof-prompt.md`, `arm/proof-agent-s1-01.jsonl`: 3.
- Every `results/<task>-<arm>-<n>.json` of the 20 tasks: 93 (80 standing, 12 Haiku, 1 machine).
- `canary/cost.json`, `canary/report.json`, `canary/attempts.json`: 3. The 6 pair diffs `canary/pairs/*.diff`: 6.
- In `logs/step8/`: the 3 reports (`.json` and `.out`), `deps-14.txt`, `deps-20.txt`, `diagnose.out`, `run.sh`, `run-ext.sh` and the three scripts above: 14.
- `env/canary/*.json`: 20.

```text
53a0d7e219d7b0804ecba5dbc002745e89f786cc946d2de85a6470d5b2d1fb06  arm/claude-2.1.318
ce72651683f581562f068c623cfb92c5c80b2828c009f5af3c6494218b9dfb1e  arm/proof-agent-s1-01.jsonl
863e0b27413f7191abde3c7f0b3d3aaa0c8b0948861df4e80ad12effaf42fc99  arm/proof-prompt.md
42f16e850c09321f35586fac7b1abe0688e8f051faf464e7d4768e02ffec9d0a  arm/proof-s1-01.json
81af898c6a9868d818c22e55822d0e42633993f131ba79fed4df0cd6fb30de02  arms.json
f7b977c14cbc9ff4f1941ad740e1a8e0973707416f8e5bdc70bd713ec171b519  canary/attempts.json
8e5ac0021526433d08b08e4ba870b58865d4715f06bdf5a13367011b805091c2  canary/cost.json
3e7467774471d96d4a96bc3da74b102362c4f276dcad0679fdab1235d69e6ac5  canary/pairs/s1-02-B-.diff
3e7467774471d96d4a96bc3da74b102362c4f276dcad0679fdab1235d69e6ac5  canary/pairs/s1-02-B.diff
df0163d61f0bac67dae57ba744c0d7d9bfa52908ab9dfdba7ebee22cc0252eb2  canary/pairs/s3-01-B-.diff
9d184ed94c4ebbe9f4535b5094265bce34b84c3e587a4ffd1258236f2692f1af  canary/pairs/s3-01-B.diff
1f277f7f7c75fb93fd8faa962fd546d6b0c567123f0f523d7497c5b000ab16a8  canary/pairs/s3-02-B-.diff
ed2fac538391b5f295a3d6a66ab82369694ffdcfec189a36628046df6807cf9e  canary/pairs/s3-02-B.diff
025dd38c7eb9a25d5f36b028f338d16511feb0f0a1cdd7a983bdcb4fa72a165b  canary/report.json
d0ff52c6908f2ff8d880377d809bfa538057609b676b3d55d94621c38b2510d6  env/canary/s1-01.json
890057f0482cfa4cfa78c2e4e5c947b87fc8974afc3c7af50e0140313f5d4e23  env/canary/s1-02.json
c4e04c2bb9b5fb34ec10cc64e2a111cded9bfe0a28c93d9dc101dc3a6445ee27  env/canary/s1-03.json
638e347ac9706f920aed2dd14829f7a22d656ed2b5baa9a3faec0bfe7f534f46  env/canary/s1-04.json
fd4f7c3b3741893f6cb187d7237d6903d2de54f9ff64b0c434c8cbc5e93d70f7  env/canary/s1-05.json
63adf93609d614c9d3da0993016fc64c00ed9dd0afbc86e9ea7b37310fac063a  env/canary/s1-06.json
491d18fd11cb997a09fc56eb5e24f68a9bcddf2d5e8b8531db5c86ac6da27bbe  env/canary/s1-07.json
2a2e4a0a3da191739420efa0f21b7412e40be56e3a11c04fb992c9ceefce1d71  env/canary/s2-01.json
d8ccec2237c2af08239eaea30459f6c704939ae38a37aa9893611eebbc20a6a7  env/canary/s2-02.json
2ef1682ffe9c4973506f9adf0ec97c14c821a438873018f42e9dd6c935c7ebfd  env/canary/s2-03.json
7056e7371713a29668e8654e68faff2322e2e4caad5dfcef203b52f311d157cc  env/canary/s2-05.json
377348ba0b0470086d90b768df02b0a226ab7cfd9500f4bdfdacd2c930f2fb59  env/canary/s2-07.json
5c1fef45636a4973aad7e182902a2a579e059705a9aac1a2e2ac5b59a7c39b3f  env/canary/s2-08.json
35eb75fb2bfebdf45dc1907fe421b2af705c74eb28af40aa6d3daf446a2dce10  env/canary/s2-10.json
f7aa485f551a5a780d1e9b72c72cc18eb781c112aec407955bf8a0b354f61f46  env/canary/s3-01.json
ae2a7e4ba85467e201bf5ea4e0b6d3566004dd3d0ec519f358db5bdd01e3a881  env/canary/s3-02.json
257f1007e1b940832c38517031203664cba7bec4388a518c7d8013514e5532f7  env/canary/s3-03.json
4a9c4cad3ab8985874cfe7288aedbedb504d650f3a2cf886f0a298ce4ba6dc14  env/canary/s3-04.json
e6e299958b63483f3da33a6fb99b52d4da04aa52f2fd30679eabac04502b43d8  env/canary/s3-05.json
86da20847816f78fbeb6835d95076bd148722df8afe055d63b49f05c98cea906  env/canary/s3-06.json
81af898c6a9868d818c22e55822d0e42633993f131ba79fed4df0cd6fb30de02  logs/step8/arms-sonnet.json
a10229d449848452a929ca25feea4c4c8b52f5c9ee77a7c03994d2f2ece321b5  logs/step8/deps-14.txt
a6c97b7411b15e0bb92fe45cda8f04a2ba44494a1b140537144e5348cf8d8fb1  logs/step8/deps-20.txt
6c6fa95bd88540d7f4c4282a2945942f63c29dfb0b2eae9e8001a73073bb3d1e  logs/step8/diagnose.out
7f3016acdb7931df560b29877be6ce13841d2fe14c35a97ae4f2c4a93d6e7753  logs/step8/lock-hash.mjs
e200ddc082e113f24a06959d09e1f2a50de374fb38906fa669d181ec86dc105a  logs/step8/lock-tables.mjs
b96e316145f4431c72aa80f758dddc6e8227ecfaa03460c6232c9ad1293af1d2  logs/step8/lock-tools.mjs
025dd38c7eb9a25d5f36b028f338d16511feb0f0a1cdd7a983bdcb4fa72a165b  logs/step8/report-extended.json
049530efb939d35a9078d41f84cb9f1faa37a738a03315f6047d1db6da9ef5f8  logs/step8/report-extended.out
a3db3960f1140c9df4d455bba0302e14c315ec49036aea7a0324ec93f9d5c00f  logs/step8/report-first.json
3266558124206a704336f55cbb381b6e99275370ea51b2633d63a14632b60ba8  logs/step8/report-first.out
6579ba5d3b130788dace224894f0df351525cde9df19171c466a5195c057d4c0  logs/step8/report-haiku.json
82c2601965ba06785c6c9616c1b66839d595f6fa6f6f03a089b3eb5a2e4d35db  logs/step8/report-haiku.out
8ce4408613f4500df5bc4a7b3f922156da4cfd46299b2a23373f45ab3c99b930  logs/step8/run-ext.sh
6a6a59ca8d36229be15759fdd398f2339dbd0e0731dea7f7f3064308d5fd441d  logs/step8/run.sh
3f29ba0b4b94849d83098b955eaf09a7106f27c6ff8a8903c1ecb870f343b32b  results/s1-01-B--1.json
374ce2a71bd7b80534200f0da7be247008142bcf1ea261a9c7eb0c4cc785c50b  results/s1-01-B--2.json
93f4d88cf6e66f77484b64f576269e9348fb0499fcb0c2a92906ab22dbb5bcf6  results/s1-01-B--3.json
950897e99f918b312697740708502f55209de2ccb90e31dc71cc92f509e7f5a7  results/s1-01-B--4.json
8c0647d1ae4a825988b001f1c3bd9ff566cdb7851edd82734306db1a8c05b781  results/s1-01-B-1.json
1ef94d45ca2403fdc812b0b7b37a00ef2ae6ab30f5399e924ec3fed43689f4bf  results/s1-01-B-2.json
8d230e448093bb94f0ea72d3673e0ce1368a73ab3c86fa91f15fd6ab3cde1fc5  results/s1-02-B--1.json
69881f6ae883b5486004fb9500ee2815bee8e8666b00b137c6407a41e67536e8  results/s1-02-B--2.json
88a82b0522594bc6b97652f0a6ad3937ee988f52c22f3a64f368565354bac732  results/s1-02-B--3.json
55189ea57106b014bf1c6cd5c9466ef4a50bf1e0cf7e60c8a3397fc003521297  results/s1-02-B--4.json
4fac09899315f8181948e193a6c9bccc08880a6b6170dd9bf330a1ec235cd9ad  results/s1-02-B-1.json
a4ccdd76c1f4473f3530a10d2fedea6ca4e135e61e24f5f36f75aeb44f4f2fdc  results/s1-02-B-2.json
4986ecb90017fc5759aef7b9b609d5676eb497f44d6dd7493d2613af5ccc2cfc  results/s1-03-B--1.json
102310f13b652110b4e27494a7feb8fed486e94b5b384892d39d4e800f331522  results/s1-03-B--2.json
3858c28bf86c2ed0babcd44b576094b25d33c398f6b18a7ce2f2a3faa0977ff5  results/s1-03-B-1.json
44220b23718e00814550713c7a9f60de8e03997f5de9adc43b6750535fac5818  results/s1-03-B-2.json
0613b1276b9cdd91413c788d9d5eb774620e2ec7486d2c5ef302fac410893127  results/s1-04-B--1.json
b80a495769bcff1cb118f7fad5b3c92bfd672ca9c1f07ec5c58031efe7b9c91b  results/s1-04-B--2.json
137d4de59dd78675ef523e8f534071c69517f7fde66411cece4ac4d6645463f3  results/s1-04-B-1.json
6d94e1326af7af3491bf42c7a7a98eb7869f76880e23e4f962a6a68de9ebf52f  results/s1-04-B-2.json
c2065ecea6309d9aa2d64f2dac1690f246fcacb145e4ed19645d62993d7981df  results/s1-05-B--1.json
ccd455dac8774d1a4b73f1a8e86de0456c21f15cbb068292860ea36202536a1a  results/s1-05-B--2.json
2d94aea7a7281ddad8f7be2cbb4dec23c29da5ded01a9494d9fd4f0393eead34  results/s1-05-B-1.json
46a48315b9799f85a917d8fd963e85c9b80625b9bcb30104ba548b458a8057cb  results/s1-05-B-2.json
5f77ad50d6aeb1b369c923fe8737256e88bc81e46466d7126227fbdfb678f4a0  results/s1-06-B--1.json
73330b97a79749f3c5dd016691bccaf4025ada03fe2465be058e0e40aa0eb9bf  results/s1-06-B--2.json
db13b0ea3eaf98aed2e6d9318f1e5d1c9b1987d726aa3ed73a1580a2ab031ea5  results/s1-06-B-1.json
00c32c4e739ca929ea2d024a2287774e3aeba5a950ce7d155df1eb7d026cbb0a  results/s1-06-B-2.json
9a004eb1c4d4447804c9fbd8a5199c588b13d3ca98f03b54ecccf10c82d95529  results/s1-07-B--1.json
7d8276fcfda4b96fd25bb9561db387d7440d41cd305468bed8e8236ad6620e2d  results/s1-07-B--2.json
dcf8baa94fcf5030a73fe0ae9ddd765300bb6573ca9f30b9d9fec5aac92ad047  results/s1-07-B-1.json
00018fe1e1950e38b96b7dc94fdf826dbb4a04c37cd089f504c917b63b7b50f2  results/s1-07-B-2.json
b0586cc07ccafda956999d5d5e3f25dd6045cbc4625129f67787c440399de8ed  results/s2-01-B--1.json
c166bccd3940c5c465e285913bab3ce3ee537eaeb42d9b6960dcdcf4c2db3803  results/s2-01-B--2.json
cc8c1ec92d4c97bd5513625e2c727c18c2019926aa06501271a01f05890ac9d0  results/s2-01-B--3.json
5c772ec68f64a245a71be83bb9bad06fd68a74d07425aa7755eaff9a0eb9c0f7  results/s2-01-B--4.json
ee7d86dd77aa184062ce2332d74216fdc4a1762f43ddfede22574d5368daca95  results/s2-01-B-1.json
6244e63c7ba1ccc04f2cd43e15f56c99ef1d5b2729f37cac0570e2fa08e9dea6  results/s2-01-B-2.json
cdeded349a835adbc031af7d9b3989aa9072ca9dcde673e5bd46bc91866e4a3e  results/s2-02-B--1.json
2aa1d69c134be4e14244b0e6f3cdfd92e20651db10f6de6b627d62d4e7da6a96  results/s2-02-B--2.json
ee0f3210de891f07ce292dd2f6f4c10d4d9f0d00fd4585af73ea2e4419deff25  results/s2-02-B--3.json
a44cc76b8e90f677dd45ae9ae00f3b3ec5b5eb049143bd1448f40b5fc69dfb01  results/s2-02-B--4.json
0b188c62a7f64ffb3049bcb2573c35c5bc2f0bb1738d0fd0385cd25f3324754e  results/s2-02-B-1.json
96c585169d783c1bedd19af57ec3e3afcbc86ce9b8b3a632148431e6ddad82c4  results/s2-02-B-2.json
448900ec2795c3789baf8bfdefd6430fe6fb4ba163c2dba2a52732d8a70f9628  results/s2-03-B--1.json
792298777a45c3d640fb937feb14967b2c2e793af402e606c2e7e3219051a1af  results/s2-03-B--2.json
0b49c93cb92ba48030b885eace7f24f315e451b0c190b2dafe6f784c9b5cf1ee  results/s2-03-B-1.json
6ac70c46aefd3f1eca67d934147c880cf0212c35542a818a8fb17b21f6c076a0  results/s2-03-B-2.json
ef4f425d4ee1accb3ab1faf60bb6dd223b79164331d9b52e2aea209ac9c1161f  results/s2-05-B--1.json
3ec9fb1540b6dcb37804c0c0a8b24f07c391a325df42e0fa3a65baf4c7e1ff1c  results/s2-05-B--2.json
ead230412f74312fa35f386567322557149bb4247567b110c59c640ca3ab3f4a  results/s2-05-B-1.json
cb53f2088ec8015f0bc17794dd6d94a0f98a2e444f287a3b06829f920d90e07e  results/s2-05-B-2.json
7830ed15de31eb7b3300104065345d07a966e312b408476937cab5ff4404c058  results/s2-07-B--1.json
aa7eb6effe247071499e63d5d714f96d43ab44bbee454d5a2bd2d7e478f9ff2c  results/s2-07-B--2.json
1b2c15a9a7d27e22ea0528c36f0519d4403e26714bd204e700bda08402f3ba1b  results/s2-07-B-1.json
97e2b239284bd7ca0ea9c21329c2c6a170ddbc79b320a881465dd6959dc97778  results/s2-07-B-2.json
47cbbabfad1e666bd7fe987d74e42f1b7c836d85e1587ff2052b2b77efc0905d  results/s2-08-B--1.json
988687af5437a081adec464c502445768ce83c949755c6238bd455c3708dd0c2  results/s2-08-B--2.json
911cb872b9a921290cafa13d2400b27214c7cb0a1a7295edcac171e36b908fdb  results/s2-08-B-1.json
c424b231dc6d9b688634c3b8a9b86b9bb15fc5e08878b9976e6f845f32cdf363  results/s2-08-B-2.json
830360216132b1cf7dbb376ce60d314986cc133800dd9753221f793a153e8a22  results/s2-10-B--1.json
f1ea8275afaaab53392e755e41ebba7e3918eaa45027271353250ed10a95a298  results/s2-10-B--2.json
b8b4612d187b9272a2c1741715bf7464d42ab184ec42d1e1cd7b2c08267d114d  results/s2-10-B-1.json
e31d3bda0bba8bd59e43a218df6d9a339f0eba3562f7bacacbd92917bf0b9fa1  results/s2-10-B-2.json
1803f7f770cb03b4cc71d0126b352aa9fe60dbf6d8bfe378cdfd33f2bc1c8f87  results/s3-01-B--1.json
3ef9c5c3417c8dc0b0146641f3332a1aaca8a2d5afc30f7481cf4bd6bfa7b918  results/s3-01-B--2.json
798542d244a95969ee13758b0228b55d4bd249378b83d8cdeb6cc59139515a49  results/s3-01-B--3.json
43e3c9d56b3934ed3a9d34c66ae234de7a44f01f28b2dd16de40ebf15a9a08f6  results/s3-01-B--4.json
18dfc42e81656fddff6bfdfcf1d9efb9241757f8b96e659833a95d887318c9b5  results/s3-01-B-1.json
dacccedec032e3182efbe9103e5e68d5ff09fea44fc5570eda00294c9fa7d0f3  results/s3-01-B-2.json
bbcfee7000dbbf11141a03c70b2bd31cdc9401edfcf22bb1901a05d9197fb07f  results/s3-02-B--1.json
aa07a6caf99b4fe047c9983ed867b79f34fa3cf8d43976a4aed48e28d01658fa  results/s3-02-B--2.json
8bf05df0731a38455e995a5c54a59cbfdcb20ebbe2f1c1b5ffb1d5defc21b1a3  results/s3-02-B--3.json
04a229706a22e5e3b10c22a251ad0eb7bd65b9c58a980f1f32310e0843e8f07d  results/s3-02-B--4.json
d9654acd96daac07c50946d307c9c78e39a1719c06a1aac2add64000791c4d93  results/s3-02-B-1.json
cb87bd74d707c523bb09a296bd229da83e93603bc3d5c3852307dca8b90e09e4  results/s3-02-B-2.json
7f70ce9a3adcd62d247bb8890cd47729fbde975004a954ff2895cbfc3f4a7e41  results/s3-03-B--1.json
da71e2b1051da502ea5e0a7f626a964858357cf635760c6fa0f8bc7a87e4ec2c  results/s3-03-B--2.json
23cc1eb2c2504455c07fb6ec2ac9b1350d1e5cf28df3be181c4c650a8739e95c  results/s3-03-B-1.json
122678eff75881cb7ac93b624f0c2805a2bf4d7b12d0832d4c24c255d572db3d  results/s3-03-B-2.json
eaecf16a530a28225d53933dd2d8dd12ff16a10ab28990bd4893ae8c9f97a2ae  results/s3-04-B--1.json
22493ac7ee43ecb723a781a72b85faec71dfa56f2053fb9a2cbbbc51ba2398ed  results/s3-04-B--2.json
b5f2e49a460c5c3c68421b5fb96f8da3904ffdc535eafea5549ca639f2311128  results/s3-04-B-1.json
310298e4ea7fe319c3fe6422a38e2321381c605a45ba93d73bb5386d5fc51758  results/s3-04-B-2.json
11e70aab576664ff7394345451de293eb94c5925f03e849d199ac48c1496fce4  results/s3-05-B--1.json
8afe041a1bfc4e5ed1c58a970383f63d4f5278810484ccd5df28b3147c40b280  results/s3-05-B--2.json
588f91a74139052cd9a55714167424920c41b7ae2cb377d0958d926e387e7be3  results/s3-05-B-1.json
71a48a661a73dcd6da88c56ce6dae2ed0e1fd1ff2eb7e753ae33527e3a15c830  results/s3-05-B-2.json
6b25e33b85a380d7a71290377f50f09d92aa748be78c0f8b747de5a2ac276eda  results/s3-05-B-3.json
c19b26bf09b0ae9cd138888092aa713352e1646788a97346599e63419145cf1a  results/s3-06-B--1.json
5ff3f7e8c87aa79b07ffbd0327210d17d907afa2c2cff1e3575dcce102598587  results/s3-06-B--2.json
c109a90cc51bf74ea16e8ada9d9820373e2e451aaa97f9304d6b767ccaea7775  results/s3-06-B-1.json
24dbe641e04d0a878cc06828f89603a7f7f5e864c0c3b76de8c31a2d693173c1  results/s3-06-B-2.json
```
