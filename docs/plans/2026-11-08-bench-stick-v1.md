---
type: plan
title: "Stick v1 plan"
description: "Prereg step 10: rerun the external step oracles and the kills that step 9's changes made stale, commit the task lists, hash every file of the stick into one manifest, compare it with the step 3 to step 9 locks with a reason for each changed file, and lock stick v1 as not validated."
status: draft
generated: { by: claude-code/2.1.318, at: "2026-11-08T15:37:14+07:00" }
sources:
  - id: prereg
    resource: /plans/2026-10-27-benchmark-prereg.md
  - id: step-oracles
    resource: /plans/2026-11-05-bench-step-oracles.md
  - id: seeded
    resource: /plans/2026-11-05-bench-seeded-bugs.md
  - id: canary
    resource: /plans/2026-11-06-bench-canary.md
  - id: human
    resource: /plans/2026-11-08-bench-human-steps.md
---

# Stick v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prereg section 12 step 10 done: the external step oracles and the `kills` matrix brought up to date with step 9, the task lists committed with the reason for every dropped task, every file of the stick hashed into `progress/stick-v1.sha256`, every file the step 3–9 locks hashed compared again with a reason for each change, and `progress/step10-lock.md` stating the stick as **not validated**, after which Part 2 may begin.

**Architecture:** One new tool, `bench/stick.mjs`, with two commands: `hash` walks `<data>` and writes one `<sha256>  <path>` line per file under a registered exclusion list; `compare` rechecks the hash lines of any lock or manifest and names a reason for each changed or missing path from a reasons file committed before the reruns. The reruns use the existing `oracle step` and `oracle kills` unchanged. The task lists are data, written by a counts-only script. No oracle, label, check or score rule changes.

**Tech Stack:** Bun 1.4.4+, `bun:test`, `Bun.CryptoHasher`, `Bun.Glob`, git, `bench/oracle.mjs` (`step`, `kills`), `bench/grade.mjs` (`oracleSha`, `oracleFiles`), the step 7 drivers and counts scripts in `<data>/logs/step7/`.

**Spec:** `docs/plans/2026-10-27-benchmark-prereg.md` sections 2 ("Applied at step 6", ruling 2 and the user's decision of 2026-11-05), 4.1 (rule (b), the cap of 12, "the final task list is committed before any run, with the reason each task was dropped"), 4.2 rulings 13–14, 7.3 ("Applied at step 8", "Extended at step 8", "Notes at the lock"), 8.3 ("Applied at step 7", ruling 10), 12 (step 10, "Applied at step 9", "Amended at step 9", "Decided at step 9 after the reads"); the locks `progress/step9-lock.md` (result, deviations 2 and 12, open points, "The stick decision, 2026-11-08", the 67 changed and 330 new hashes), `progress/step8-lock.md` (known limits I1, I2, M1–M4), `progress/step7-lock.md` (open points: `kills` after a second batch, M8), `progress/step6-lock.md` (open points: the `step` rerun, M4 `at`), `progress/step5-lock.md` (drops, cold-setup repos, canary tasks), `progress/step3-lock.md`, `progress/step4-lock.md`; `bench/README.md` (`oracle step`, `oracle kills`).

## What is reused

`oracle step <task>` reuses every resolver record (a run whose record exists is never repeated) and writes only `step.json`, `step-f2p.json` and the resolver's prompt; `oracle kills` keeps an end grade whose `oracleSha` still matches and regrades otherwise; the step 7 drivers (`logs/step7/run-kills-re.sh`, `run-kills-ext.sh`: pgsnap around the real-estate lane, the 15 GB build-cache rule, one disk retry) and `logs/step7/lock-step-sens.mjs` (external H1 sensitivity) run again with a new log folder; `oracleSha` and `oracleFiles` of `bench/grade.mjs` decide whether a `kills` is due; `logs/step7/lock6-compare.mjs`'s line format (`^[0-9a-f]{64}  <path>$`, `progress/` paths in the repo) is what `stick compare` reads; `progress/step5/sample.tsv` and `walk.tsv` already hold the external sample and the walk. Missing, and built here: a hash of the whole data folder by rule rather than by hand-picked category, a compare that names the reason for each change, and the committed task list with reasons.

## Decision for the user (asked with this plan)

1. **The 3 B/B- pairs of step 8, one last read before the lock.** The pairs page: https://claude.ai/artifact/58Q9rw5UuEPw4gPd6zpXxf (s1-02, s3-01, s3-02; arm products of public repos, not sealed). The reruns (Tasks 3–4) do not depend on the answer; only the lock (Task 6) waits for it.
   - **(a) You read them.** Answer `B- worse`, `same` or `B- better` per pair. If B- is visibly worse on any pair and the stick did not see it (`d` is 0 on all three), this plan stops after Task 4, and a fix-the-stick plan comes first (section 7.3); stick v1 is hashed after that plan. If not, the lock records one human read of the pairs and the stick stays **not validated**: the registered canary failed twice, and the read settles only the disagreement between the agent reader and the controller.
   - **(b) No read (default, the step 9 lock's ruling of 2026-11-08 stands).** The lock carries the step 9 lock's paragraph "The stick decision, 2026-11-08" and the wording of ruling 8 below.

The other points of the brief are settled by rulings 2–10 below, with the reason each time; none needs a choice the prereg leaves to the user. Two of them go beyond the brief and are stated here so they are not missed: the compare covers the step 3 and step 4 locks too (step 3 hashed `heldout/` and the replay results, step 4 `ext/sealed/` and the sample, and step 9 rechecked neither), and the task-repo `step` is not rerun (ruling 3).

## Rulings the prereg leaves open (Task 1 registers them in section 12 as "Applied at step 10" before any rerun)

1. **Scope.** External: the 24 kept tasks of `<data>/ext/sample.tsv`. Real-estate: the 14 kept tasks of the step 5 lock and p8b (trial-only). Retired ids (s1-08, s2-04, s2-06) and p8b1 keep their folders, are hashed, and run nothing.

2. **The external `step` rerun (section 2, step 6 ruling 2).** `bun bench/oracle.mjs step <task>` on all 24, in `sample.tsv` order, after a copy of every `step.json` and `step-f2p.json` to `<data>/logs/step10/before/<task>/`. The registered prediction, checked by `cmp` against the copies:
   - every line ends `resolver=reused` or `resolver=none`: the resolver's prompt holds the `ask` origins of the scored checks, and the only task whose scored set moved, s1-03 (the 7.1 drop), had 0 resolver origins (26 exact, step 6 lock);
   - `step-f2p.json` changes only in s1-03 (the dropped check leaves the scored set);
   - `step.json` changes only in s1-03, s1-04, s3-05, s3-06, the tasks with a settled external classification (step 9: build 2, requirement 5) or the drop. **Which ids can move:** at most 2 join (a settled `build` check whose origin is `f2p`; its verdict is already in `step-f2p.json`, decided for every scored check at step 6), and at most 1 leaves (the s1-03 check, if it was an id). The 2 disputed checks of cold-setup tasks stay disputed and are not `build`, so they cannot join;
   - **H1's N stays 20.** The 4 tasks with no id (s1-01, s1-06, s3-01, s3-07) have no settled row, and s1-03 keeps at least 8 of its 9 ids.
   Any other outcome (a `ran` resolver, a refusal, another changed file, another N) stops the plan for the user. The 20 other tasks' files must be byte-equal.

3. **The task-repo `step` is not rerun.** Step 9 dropped no task-repo step check and changed no `step.json` (the step 9 lock's compare), and task-repo step checks are not classified (step 6 ruling 5), so nothing it reads moved. A rerun would only rewrite `step/validation-<end7>.json` with a new `at` (step 6 lock, M4). So the "compare without `at`" of the step 6 lock does not arise; nor does it for the grade files `kills` rewrites below, which no lock hashed (`grep` of the step 3–9 locks for `(p1|p2|s1-03)/grades/`: 0 lines).

4. **The `kills` rerun (section 8.3 ruling 10, step 7 lock).** The trigger is mechanical, the test `kills` itself applies to an end grade: `kills` runs again on every task with a `seeded/bugs.json` (tested for existence only) whose fix-commit oracle's `oracleSha` (over `oracleFiles(<task>/oracle)`) differs from the `oracleSha` of its end grade `<task>/grades/<end7>.json`, or, with a step oracle, whose `step/oracle` differs from `step/grades/<end7>.json`; the end is the task's end in `ext/sample.tsv` or `tasks.json` (the seeded bugs' reference), so no sealed file is read. `logs/step10/kills-due.mjs` prints the task names only. Expected: p1 (second batch), s1-03 (the 7.1 drop's manifest) and p2 (its manifest changed only by one `interface: none` entry, which still moves the folder's sha), no other. p2's `kills.json` is expected byte-equal (an `interface: none` entry scores nothing); p1's and s1-03's may change. **p6c has no `seeded/` folder** (rule (b) 2 < 3; step 9 decision 5 does not apply), so nothing runs there. The real-estate lane (p1, p2) runs on `bench_re` with pgsnap before and after; s1-03 runs alone, with the 15 GB cache rule, and its images and containers are removed by their recorded names. After the reruns, `logs/step7/lock-step-sens.mjs` counts the external H1 sensitivity again (ids and kills of s1-03 may have moved).

5. **What stick v1 hashes.** `bun bench/stick.mjs hash --out progress/stick-v1.sha256`: one `<sha256>  <path>` line per regular file under `<data>`, the path relative to `<data>`, sorted bytewise, with only these left out (each counted in the output):
   - symlinks, never followed: `p8b → 8b`, so p8b's files are hashed once, under `8b/`. The manifest names them `8b/…`; the earlier locks name them `p8b/…`, and their compares resolve those paths through the link;
   - `node_modules` folders;
   - inside each git store (every folder directly under `ext/repos/` and `seeded/repos/`), everything but `HEAD`, `config`, `shallow`, `packed-refs`, `refs/**` and `objects/info/alternates`: a ref holds the sha of its commit, which pins the content, so the 81 `refs/seeded/*` and the step 8 product branches are in, while the objects and the files every fetch or worktree rewrites (`FETCH_HEAD`, `index`, `logs/`, `hooks/`, `info/`, `description`) are not;
   - secrets: `arm/box.env` and `step9/pages/*.token`;
   - the transcripts of runs, `results/*/*.jsonl`: no lock hashed one, and an arm's may hold the token (step 8 lock). `transcripts/` (87 files of 2026-10-27, before the token existed) is hashed;
   - files every grade or removal rewrites, which no lock hashed: `*/docker.json`, `*/build/readiness.tsv`, `ext/removed.txt`.
   The repo side is pinned by its commit: the lock records `git rev-parse HEAD` and an empty `git status --short bench tests`. The manifest is taken after the reruns and the compares, and committed.

6. **The compare.** `bun bench/stick.mjs compare <lock> --reasons progress/stick-v1/reasons.tsv` on each of `progress/step3-lock.md` … `step9-lock.md`. A path a lock hashes more than once (the step 4 lock re-hashed rechecked candidates in its addenda) is compared at its last line, which supersedes the earlier ones; counts are of paths. Each changed or missing path takes the reason of the first glob of `reasons.tsv` it matches (the table "What changed since the locks", committed by Task 1 before any rerun); one that matches none prints `unexplained`. Any `unexplained` or `missing` line stops the plan for the user. The compare is also read the other way, by membership: each row of the table reports which of its files changed and which stayed equal, so a predicted change that did not happen is visible.

7. **The task lists.** `progress/stick-v1/tasks.tsv`, written by `logs/step10/tasks.mjs` from `ext/sample.tsv`, `tasks.json`, `step.json`, `labels.json`, the step 9 recount and `seeded/bugs.json`, counts and names only: `set task stack ref base end status canary cold h1_ids scored seeded reason`. `status` is `scored`, `trial-only`, `dropped` or `retired`; `scored` is the fix-commit oracle's scored checks (rule (b) for real-estate). Real-estate: the 9 tasks that meet rule (b) all run (9 ≤ 12, the cap cuts none); p5, p6b, p6c, p7b, p7c `dropped` with `rule (b) <n> < 3`; p8b1 `dropped` with `needs outside data (rule (c))`; p8b `trial-only` with the exception of section 12 step 10 (the prereg's author read its oracle; it is used only in step 11's trial and never scored). External: the 24 `scored`, s1-08 and s2-04 `retired` with `no valid check`, s2-06 `retired` with `not servable`; `cold` marks s1-09, s2-09, s3-07, s3-08 (we-promise/sure, kizuna-ai-lab/sokuji, pola-rs/polars: nobody designing the plugin opens them); `canary` is `canary` for the 6 tasks of step 8 and `extension` for the 14 of its extension (tasks with B and B- products; only the 3 pair diffs were read by anyone), since step 11's trial takes "the first of the sorted list". **The step 11 walk** is recorded in the lock, not run: per stack the last rank checked in `progress/step5/walk.tsv` and the repos at their cap; H1's N is 20, so the walk must add at least 4 tasks with a non-empty step oracle (the user's decision of 2026-11-05), each through the step 5 pipeline, `step`, `seed` and `kills`, with the stick v1 lock amended.

8. **The stick, as the lock states it.** Not "validated", anywhere (step 9 lock, deviation 12). The lock says: stick v1 is locked (its content is hashed and its task lists committed); its sensitivity is **not validated**. The canary of section 7.3 failed as registered (mean `d` 0.400 with Sonnet B- and 0.428 with Haiku B-, 3 of 6 tasks each); the extension registered after that failure passed on a bootstrap lower bound of 0.057 while its t interval, [-0.006, 0.627], crosses 0; the agent reader (`claude-fable-5-1`) read B- as visibly worse on s3-01 and s3-02, against the controller and the advisor, who found it not worse on all three; on s3-02 the seeded checks pass for both arms; and either no human read the pairs (decision (b)) or one human read them with the answer recorded (decision (a)). Part 2's guard is H4 (H against W, k = 3, 24 tasks; if it is not met, H1–H3 are not reported), and step 14 lists the section 7.3 trigger candidate as open.

9. **The step 8 carry-overs go to step 11's plan.** None of them changes a score or a hashed file before Part 2, and the only grades of this step are of trusted commits (the seeded bugs and the ends). A fix belongs where it can be tested against the first untrusted grade, and changing what `grade` builds now would change what every `--reuse` keys on. The lock lists each under "Blocks Part 2" with its source: (I1) the grade's image build has network; (M3) the oracle shares the product's container and can be read or its JUnit rewritten; `env/real-estate.json` and `env/seeded/real-estate.json` run the host's `oracle.sh`, so a real-estate product would run on the host; (M1) `build/readiness.tsv` is shared between oracles; (I2) the nested CLI and the token in the box. Step 11's plan must close each before the first run it affects, and, because a boundary change can move a result, regrade the ends of the 24 external tasks and of the 9 real-estate tasks with every oracle kind the arms are graded with (`oracle/`, `step/oracle/` where it has ids, `seeded/oracle/`) after its last change to `grade`, `oracle-run` or the box, and show every check's result unchanged; step 11's plan sizes that. Also for step 11's plan: tasks the walk adds need a registered rule for their classification disputes and their 7.1 sample, since step 9's reader rulings covered step 9 only.

10. **The token.** After the user says the setup-token is revoked, `rm <data>/arm/box.env`, unread. The lock records only whether the file exists.

## What changed since the locks (`progress/stick-v1/reasons.tsv`)

A recompute of the seven locks before any rerun (`logs/step7/lock6-compare.mjs`, read-only, 2026-11-08, counted by path at the last line) gave: step 3 changed 1, step 4 2, step 5 42, step 6 1, step 7 24, step 8 0, step 9 0, missing 0 everywhere. Every one of them is in a row below.

| glob | reason | expected |
|---|---|---|
| `env/real-estate.json` | step 5 build ruling "no app at the base": the task field `appFile` added (`progress/progress.md`, step 5 Task 9) | 1 changed vs step 3 |
| `ext/walk.tsv`, `ext/sample.tsv` | step 5 drops and replacements: s1-08 → s1-09, s2-04 → s2-10, s2-06 → s2-09 by `walk --remove-out` (step 5 lock) | 2 changed vs step 4 |
| `env/s*.json`, `env/seeded/s*.json` | step 9 Task 6, the oracle command rewritten with `oracleCommand` | 27 changed vs step 5, 24 vs step 7 |
| `{p1,p2,p3,p4,p6a,p8e,s1-03,s1-04,s3-05,s3-06}/labels.json`, `p8b/labels.json` | step 9 ruling 5, a settled classification | 10 changed vs step 5, 1 vs step 6 |
| `{p1,p2,p6c,s1-03}/oracle/manifest.json` | step 9 rulings 6–7, the second batch or the 7.1 drop | 4 changed vs step 5 |
| `p1/agreement.json` | step 9 ruling 7, the `b2` rounds | 1 changed vs step 5 |
| `{s1-03,s1-04,s3-05,s3-06}/step.json` | step 10 ruling 2, `step` rerun after the settled labels and the drop | 0 to 4 changed vs step 6 |
| `s1-03/step-f2p.json` | step 10 ruling 2, the dropped check leaves the scored set | 1 changed vs step 6 |
| `{p1,s1-03}/seeded/kills.json` | step 10 ruling 4, `kills` rerun on a changed oracle | 0 to 2 changed vs step 7 |

p2's `seeded/kills.json` is deliberately absent: it must stay equal. Nothing more is expected to change against the step 3, 4 or 8 locks; step 9's 330 hashes are expected equal.

## Expected size

| lane | count | time |
|---|---|---|
| `step` external | 24 runs, no agent | under 2 min |
| `kills` real-estate | p1 (end and 1 bug), p2 (end and 1 bug) | about 4 runs of 2.3 min |
| `kills` external | s1-03 (end and 3 bugs) | about 4 runs of 5 min, plus the image build |
| `hash` and 7 compares | about 21,300 files (counted with ruling 5's exclusions), about 600 MB read | a few minutes |
| subagents | Tasks 1 and 2 (implementer and reviewer), the Task 4 reviewer, the final review | about 0.8–1.2M tokens |

No sealed agent runs (a resolver that would run is a stop), no arm runs, no Docker removal other than the tools' recorded names.

## Global Constraints

- Bun only, no new dependency in `bench/`; tests run with `bun test ./tests`, output pristine. `bench/` names no stack, customer or task. `<data>` = `/Users/hbchuc/Documents/programing/vibe-code/hstack/.evidence/bench` (gitignored, main checkout). Set `HSTACK_BENCH_MACHINE=<data>/machine.json` for every bench command.
- Build on the branch `bench-step10` from `main` (5d3bcdc). Do not push `worktree-bridge-cse_01JxVNAL2Dkzabg9QuuNaY5E`: it holds per-bug labels squashed out of main. A push that keeps disconnecting worked with `git -c http.postBuffer=524288000 push`; do not change the git config.
- Never write under `/Users/hbchuc/Documents/programing/vibe-code/outsourcing/`. Never touch `real_estate*` databases; real-estate grades use `bench_re` only, with the pgsnap compare around the lane.
- **Docker.** Never `prune`, `volume`, `compose` or `network`, except `docker builder prune -f`. Removal only by the names a step recorded, never `-f`. Docker stays at 7.6 GB.
- **Sealing.** Every grade of an oracle runs with `--sealed` (`kills` does). Never read `ext/raw/`, `ext/sealed/`, `heldout/`, `seeded/`, `<task>/seeded/` (other than `validation-*.json`, `kills.json`, `grades/`), `step9/pages/`, `step9/answers/`, `step9/proxy/`, `history/`, `logs/step7/*.out`, the `logs/step10/*.out` grade outputs (only their last line, through the drivers' `.lines` files), or any oracle, step oracle, seeded-bug or reply file, by hand. Hashing such a file by a tool is not reading it. Plain `bun bench/bugs.mjs <task> <sealed> --sealed` is forbidden (only `--usable`, `--fix-tally`, `--at-tally`). Scripts print counts, ids, task names and paths only. Implementers work on fixtures only; every run on real data is the controller's.
- This session is not the plugin-design session (section 12, step 10): the plugin designer never opens oracle, seeded or held-out content.
- Record each task's usage in `progress/progress.md` (implementer and reviewer tokens and minutes, wall clock of the runs). Copy the SDD ledger into `progress/progress.md` before the final review. The plan goes `stable` only after the user approves the build.
- Docs, logs and commit messages in English.

## Review Focus

1. The walk following `p8b` into `8b` and hashing p8b twice. Expected: links are never followed and are counted. Test: Task 2 'hash does not follow a link and counts it'.
2. A secret or a run transcript in the manifest. Expected: `arm/box.env`, `step9/pages/*.token` and `results/*/*.jsonl` absent, counted. Test: Task 2 'hash leaves out secrets and run transcripts'.
3. A git store's objects or churn files hashed, or its refs left out. Expected: inside a store only `HEAD`, `config`, `shallow`, `packed-refs`, `refs/**` and `objects/info/alternates`. Test: Task 2 'inside a git store only the refs and the store's identity are hashed'.
4. A reason glob that explains a file outside the table, or a removed file read as explained. Expected: a changed path no glob matches prints `unexplained`; a missing path prints `missing` with its reason or `unexplained`, and both make the exit 1. Test: Task 2 'a changed file no reason matches is unexplained' and 'a missing file is reported and fails the compare'.
5. Order or paths that do not round-trip. Expected: lines sorted bytewise; a path with a space or non-ASCII name written and read back unchanged. Test: Task 2 'lines are sorted bytewise and odd paths round-trip'.

---

### Task 1: Register the rulings

**Files:**
- Modify: `docs/plans/2026-10-27-benchmark-prereg.md` (section 12, a dated paragraph after step 10, before Part 2), `docs/plans/index.md`, `docs/log.md`
- Create: `progress/stick-v1/reasons.tsv`

- [ ] **Step 1:** Write the paragraph "Applied at step 10 (2026-11-08)" after step 10 of section 12: rulings 1–10 of this plan, the decision asked with it and its default, and the table "What changed since the locks" by reference to `progress/stick-v1/reasons.tsv`; end "Registered before any rerun; `bench/stick.mjs` has not run."
- [ ] **Step 2:** Write `progress/stick-v1/reasons.tsv` from the table above: one line per glob, `<glob>\t<reason>`, the brace globs as written (`Bun.Glob` expands braces), no header.
- [ ] **Step 3:** Add the plan to `docs/plans/index.md` and an **Update** line to `docs/log.md`. Commit `git commit -m "Register the step 10 rulings before any rerun"`.

### Task 2: The hash and the compare

**Files:**
- Create: `bench/stick.mjs`, `tests/bench-stick.test.mjs` (fixture data folder under a temp dir)
- Modify: `bench/README.md` (the commands, and `progress/stick-v1/` in the layout)

**Interfaces:**
- Consumes: `dataDir()` of `bench/oracle.mjs`, `ROOT` (the repo root, as `lock6-compare.mjs` resolves `progress/` paths).
- Produces:
  - `hashTree(root) -> { lines: string[], left: { link, node_modules, store, secret, transcript, rewritten } }`: lines `<sha256>  <path>`, sorted bytewise (`Buffer.compare` of the paths), counts of what ruling 5 leaves out (entries, a folder counting once; `store` is what a git store holds outside its allowlist).
  - `parseReasons(tsv) -> [{ glob, reason }]`, `reasonOf(path, reasons) -> string | null` (first `Bun.Glob` match).
  - `bun bench/stick.mjs hash --out <file>`: writes the lines; prints `stick hash: files <n>, link <l>, node_modules <m>, store <o>, secret <s>, transcript <t>, rewritten <r>` and one `stick hash <top folder> <n>` line per top-level folder.
  - `bun bench/stick.mjs compare <file> [--reasons <tsv>]`: reads every `^[0-9a-f]{64}  <path>$` line of the file (a lock or a manifest), the last line of a path superseding earlier ones; a `progress/` path resolves to `ROOT`, any other to `<data>`; counts paths and prints `stick compare <file>: hashed=<n> equal=<e> changed=<c> missing=<m> unexplained=<u>`, then `changed <path> <reason|unexplained>` and `missing <path> <reason|unexplained>`; with `--reasons`, one line per glob `reason <glob> changed=<c> equal=<e>` over the hashed paths it matches; exit 1 when `missing` or `unexplained` is above 0.

- [ ] **Step 1: Write the failing tests** on a fixture data folder: 'hash does not follow a link and counts it' (a folder `x` and a link `px → x`: lines hold `x/…` once, `link=1`); 'hash leaves out secrets and run transcripts' (`arm/box.env`, `step9/pages/a.token`, `results/r-1/1-main.jsonl` absent; `results/r-1.json`, `results/r-1/settings.json` and `transcripts/s/t.jsonl` present); 'inside a git store only the refs and the store's identity are hashed' (in `seeded/repos/k.git/` and `ext/repos/o__r/`: `HEAD`, `config`, `shallow`, `packed-refs`, `refs/seeded/sb-1`, `objects/info/alternates` present; `objects/ab/cd`, `objects/pack/p.pack`, `FETCH_HEAD`, `index`, `logs/HEAD`, `hooks/x.sample`, `description` absent and counted as `store`); 'hash leaves out files every grade rewrites' (`t/docker.json`, `t/build/readiness.tsv`, `ext/removed.txt` absent, `t/build/other.log` present); 'node_modules is left out'; 'lines are sorted bytewise and odd paths round-trip' (`B`, `a`, `a b`, `é` in bytewise order; compare of the written file reads `equal=4`); 'a changed file no reason matches is unexplained' (exit 1); 'a changed file takes the first matching reason' (exit 0, the reason printed, `reason <glob> changed=1 equal=0`); 'a missing file is reported and fails the compare'; 'a progress/ path resolves to the repo'; 'a path hashed twice in one lock is compared at its last line' (first line a stale hash, last the current one: `equal=1 changed=0`, `hashed=1`).
- [ ] **Step 2: Run** `bun test tests/bench-stick.test.mjs` — expect FAIL (no `bench/stick.mjs`).
- [ ] **Step 3: Implement** `bench/stick.mjs` (read files as bytes; `readdirSync(…, { withFileTypes: true })`, never `statSync` on a link); README.
- [ ] **Step 4: Run** `bun test ./tests` — pass, output pristine. Commit `git commit -m "Add the stick hash and the compare with reasons"`.

### Task 3: The reruns (controller, real data)

Tasks 3, 5 and 6 run on real data, so they are the controller's (step 9 ruling: implementers work on fixtures only); the whole-branch review is their reviewer. Task 4's script reads real data too, so the controller writes and runs it, and a fresh reviewer checks it. Tasks 1 and 2 each get an implementer and a fresh reviewer.

**Files:**
- Create (gitignored): `<data>/logs/step10/kills-due.mjs`, `step.sh`, `run-kills-re.sh`, `run-kills-ext.sh` (copies of the step 7 drivers with `S=$D/logs/step10` and the task list from `kills-due`), `before/`

- [ ] **Step 1:** `bun logs/step10/kills-due.mjs <data>` (ruling 4; imports `oracleSha` and `oracleFiles` from the main checkout's `bench/grade.mjs`, so a later rerun does not depend on this worktree): expect `kills due p1`, `p2`, `s1-03` and `kills due: 3`. Another set stops for the user.
- [ ] **Step 2:** Copy every external `step.json` and `step-f2p.json` and the `seeded/kills.json` of the due tasks to `logs/step10/before/<task>/`. Run `step.sh`: `bun bench/oracle.mjs step <task>` for the 24 in `sample.tsv` order, the last line of each to `step.lines`. Then `cmp` each file with its copy and count the tasks with `ids` not empty. Check ruling 2's prediction line by line; record the `step` lines, the changed files and N.
- [ ] **Step 3:** `run-kills-re.sh` for p1 and p2 (pgsnap before and after, `PGSNAP equal` expected), then `run-kills-ext.sh` for s1-03. Expected lines: `p1 kills bugs=1 …`, `p2 kills bugs=1 …`, `s1-03 kills bugs=3 …`, no `not judged`, exit 0. `cmp` the three `kills.json` with their copies: p2 equal.
- [ ] **Step 4:** `bun logs/step7/lock-step-sens.mjs > logs/step10/step-sens.out` (the external H1 sensitivity again); `docker ps -a` and `docker images` by the step 7 lock's filters: no name ending `-serve` or `-grade` left. Record every count line and the wall clock in `progress/progress.md`.

### Task 4: The task lists (controller script, reviewed)

**Files:**
- Create: `<data>/logs/step10/tasks.mjs` (gitignored), `progress/stick-v1/tasks.tsv`

- [ ] **Step 1:** Write `tasks.mjs` (ruling 7): it reads only `ext/sample.tsv`, `tasks.json`, each task's `step.json` (`ids` length), `labels.json` and `oracle/manifest.json` with `validation-*.json` (counted as `bun bench/human.mjs recount` counts scored checks), `seeded/bugs.json` (`state` only), and prints `tasks: external <n> (scored <s>, retired <r>), real-estate <n> (scored <s>, dropped <d>, trial-only <t>), h1 tasks <k>`. Expected: external 27 (24, 3), real-estate 16 (9, 6, 1), h1 tasks 20 external.
- [ ] **Step 2:** Run it to write `progress/stick-v1/tasks.tsv`; check the real-estate `scored` column equals the step 9 lock's rule (b) table and the external `h1_ids` equals Task 3's `step.json` counts. Write the step 11 walk state (per stack the last rank checked in `progress/step5/walk.tsv`, the repos at their cap) for the lock.
- [ ] **Step 3:** A fresh reviewer reads `tasks.mjs`, `tasks.tsv` and the rulings (counts only; no sealed file). Commit `git commit -m "Commit the stick v1 task lists with the reason for every dropped task"`.

### Task 5: The user's answers

- [ ] **Step 1:** Ask decision 1 if it is not answered yet, with the link; record the answer (per pair) or "no read". If (a) finds B- visibly worse on a pair, stop here: the fix-the-stick plan comes first.
- [ ] **Step 2:** Ask whether the setup-token is revoked; when it is, `rm <data>/arm/box.env` and record `box.env absent`; otherwise the lock records it present and open.

### Task 6: Lock

**Files:**
- Create: `progress/stick-v1.sha256`, `progress/step10-lock.md`, `<data>/logs/step10/compare-step<k>.out`
- Modify: `docs/log.md`, `progress/progress.md`

- [ ] **Step 1: Compare.** `bun bench/stick.mjs compare progress/step<k>-lock.md --reasons progress/stick-v1/reasons.tsv > logs/step10/compare-step<k>.out` for k = 3 … 9. Expected: `missing=0 unexplained=0` in all seven; the `reason` lines match the table's "expected" column. Anything else stops for the user.
- [ ] **Step 2: Hash.** `bun bench/stick.mjs hash --out progress/stick-v1.sha256`; then `bun bench/stick.mjs compare progress/stick-v1.sha256` gives `changed=0 missing=0`; three files checked against `shasum -a 256` (one in `8b/`, one under `ext/sealed/`, one under `seeded/repos/`).
- [ ] **Step 3: Check.** `bun test ./tests` pass, pristine; `git status --short bench tests` empty; `/tmp/hstack-bench` empty; pgsnap equal; Docker as in Task 3 step 4, and no prune, volume, compose or network command.
- [ ] **Step 4: Write** `progress/step10-lock.md`: the rulings and the decision; the `step` lines, the changed step files, which ids moved by count, H1's N; the `kills` lines and the `kills.json` compares, the H1 sensitivity; the seven compares with each changed file and its reason; the manifest (its sha256, file count per top folder, what ruling 5 left out with counts, `p8b → 8b`, the repo commit); the task lists (by reference to `tasks.tsv`, counts per status, the walk state for step 11); the stick in ruling 8's words; "Blocks Part 2" (ruling 9); the token; deviations, open points, known limits; usage.
- [ ] **Step 5:** Record usage, copy the SDD ledger into `progress/progress.md`, a **Creation** line in `docs/log.md`, commit `git commit -m "Lock stick v1"`. Then the whole-branch review; after its fixes, ask the user to approve the build.

## Known limits

- **The stick's sensitivity is not validated** (ruling 8). H4 is Part 2's only guard.
- **No human read step 9 content,** and, under decision (b), no human read the pairs: every read of the stick's validation is an agent's.
- **The manifest pins git content through refs.** `objects/` folders are not hashed; a ref's sha pins its commit, as far as git's SHA-1 does.
- **Run transcripts are not hashed** (ruling 5), as at step 8.
- **The rewritten grades of p1, p2 and s1-03 were hashed by no lock,** so only `kills.json` shows whether their results moved.
- **The task-repo `step` is not rerun** (ruling 3); its validations stand as step 6 locked them.
- **External H1 rests on 20 tasks** with a median of 2 step ids until the step 11 walk adds at least 4.
- **The carry-overs block Part 2** until step 11's plan closes them (ruling 9).

## Not in this plan

The step 11 walk and the seeding of walked tasks; the boundary fixes of ruling 9; the H and W boxes and the real-estate box; any change to an oracle, a label or a score rule; a fix-the-stick plan (only if decision (a) calls for one).
