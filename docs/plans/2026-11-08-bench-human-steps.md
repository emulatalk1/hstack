---
type: plan
title: "Human steps plan"
description: "Prereg step 9: the human reads of sections 5, 6.3, 7.1, 7.2 and 9.3 through a local page that writes the answers to data files, the second batch of source pairs the human calls fix, the rule (b) recount, and the step 8 carry-overs, locked with the list of what step 10 must hash again."
status: draft
generated: { by: claude-code/2.1.318, at: "2026-11-08T16:00:00+07:00" }
verified:
  - { by: claude-code-advisor/2.1.318, at: "2026-11-08T16:40:00+07:00" }
sources:
  - id: prereg
    resource: /plans/2026-10-27-benchmark-prereg.md
  - id: oracles
    resource: /plans/2026-11-03-bench-oracles.md
  - id: canary
    resource: /plans/2026-11-06-bench-canary.md
---

# Human Steps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prereg section 12 step 9 done: every disputed source pair and classification settled by the human, the input, oracle and re-rating samples read, the intervention rules checked on the historical transcripts, the second batch of step 5 ruling 7 built and its disputes settled, rule (b) counted again, the step 8 carry-overs closed, all locked in `progress/step9-lock.md` with the list of files step 10 must hash again.

**Architecture:** One new file, `bench/human.mjs`, builds each read as a batch file under `<data>/step9/pages/` from the sealed sources, serves it on `127.0.0.1` as a page the user opens through the Claude app's preview, and appends each answer to `<data>/step9/answers/<batch>.tsv`; it prints counts only. Its pure rules sit in `bench/lib/human.mjs`. `apply` turns answers into the files the existing tools read (`labels.json`, manifests, the second batch's pair list). The second batch reuses `oracle write`, `validate`, `sweep` and the split-round classifier with one new mode each, so no checked file of steps 5–8 changes except where a ruling below says so.

**Tech Stack:** Bun 1.4.4+, `bun:test`, `Bun.serve`, git, `bench/oracle.mjs`, `bench/lib/oracle.mjs` (`queuePick`, `agreement`, `nextNumber`), `bench/ext.mjs` (`oracleCommand`, `removeRecorded`), the Claude Code remote tool `report_preview_port`.

**Spec:** `docs/plans/2026-10-27-benchmark-prereg.md` sections 5, 6.1, 6.3, 7.1 (and its step 5 rulings 7, 13, 15, 16), 7.2, 7.3 ("Applied at step 8", "Extended at step 8", "Notes at the lock"), 9.3, 12 (steps 9–14), 2 ("Applied at step 6", ruling 9), 4.1 rule (b), 4.2 ruling 13; the locks `progress/step5-lock.md` (queue, rule (b), restored originals), `progress/step6-lock.md` (step 9 additions, open points), `progress/step7-lock.md` (kills after a second batch), `progress/step8-lock.md` (deviation 2, open points, C1); `bench/README.md`.

## What is reused

The queue of step 5 ruling 16 and the two step 6 additions are the reads, row for row (counts: `labels.tsv` 12 pairs over 6 real-estate tasks, 11 `later` and 1 `in-task`; `classify.tsv` 20, task-repo 11 and external 9; `p8b-classify.tsv` 1; `sample-7.1.tsv` 40; `sample-7.1-step.tsv` 10; `sample-7.2.tsv` 40; `inputs.tsv` 4). Each page shows what the agent it checks was shown: for a pair, the parts of the labeller's prompt `sources/prompts/label-<task>.md` that concern it (decision 1's table), the classifier's folder `work/classify/` (input, sheet, entries, check files), the check next to its origin test. `agreement` computes κ, `queuePick` orders every sample, `oracle write`/`validate`/`sweep`/`split` run the second batch, `oracleCommand` already writes the safe oracle command. Missing, and built here: a way for the user to read and answer without clicking on the Mac and without the content passing through this session, the history extraction for 9.3, the second-batch modes, and `apply`.

## Decisions for the user (asked with this plan)

**Decided by the user on 2026-11-08, with the choice of subagent-driven execution:** decision 1 option A (the user reads, the cold rows are swapped); decision 2 option (a) (the user against the registered mechanical rule); decision 3 option (a) (the local page; the user sees the probe in the preview, Save still to be confirmed before Task 7); decisions 4, 5 and 6 as recommended ("theo advisor"): every outsourcing session counts and the window decides, p6c gets one seeded bug at step 10 if it meets rule (b), and the four Docker names are removed. The token is revoked by the user.

1. **Sealing against the human read.** What the user sees, batch by batch:

   | batch | rows | shown | content class |
   |---|---|---|---|
   | `inputs` | 4 (2 per set) | `input.md`, `interface.md`, the `input-check` line | what every arm is given; not sealed |
   | `oracle-7.1` | 40 + 10 | the check file(s) and its manifest `behaviour`, `interface`, `severity`, next to its origin test: real-estate, the test file at the fix commit (`git show <fix>:<file>`, the test title marked); external, the PR's test file at the end; step checks, the step's test at the task end | oracle content and the test it came from |
   | `rerate-7.2` | 40 (20 per set) | the classifier's folder for that check: input, sheet, entry, check file; no agent label | oracle content |
   | `classify` | 20 + p8b 1 | the same view, no agent label | oracle content |
   | `labels` | 12 | what 6.1 gives a labeller, for this pair only: the label brief, the task's plan and range, the pair's row (commit, kind, subject, owned hunks), `git show <commit>`, and the lines of the harness progress log and `.evidence/attribution.md` that name its sha7 (read-only); not the task's other pairs; no labeller label | real-estate fix commits, the oracle's sources |
   | `pairs` | 3 | the 3 step 8 pair diffs (`canary/pairs/*.diff`) | arm products of public repos; not sealed |
   | `history` | 20 segments | at each human event: the agent's message before it and the human's message | the user's own past sessions (the dev and held-out bugs are discussed in them) |
   | `classify-2` | the second batch's disputes | as `classify` | oracle content |

   Over the oracle batches: 110 reads of 80 distinct checks in 26 tasks (15 external, 11 real-estate), plus 12 fix commits. Of the rows, 15 fall in 3 of the 4 cold-setup tasks (`classify` 2, `oracle-7.1` 7, `rerate-7.2` 5, `inputs` 1) and 5 in canary tasks.

   **Does it make the user unfit to design the plugin?** The prereg gives two clauses that meet in one person here. Section 12 step 9 asks a human to read oracle checks; step 10 says "the plugin designer never opens the content of oracles, seeded bugs or held-out patches", and step 4 ruling 13 says "nobody designing the plugin opens the cold-setup repos". Its own precedent (p8b) is that whoever read a task's oracle may design the plugin only if that task leaves the scored set; applied to 26 tasks, that empties the stick. So, read strictly, a user who does these reads cannot also be the plugin designer. The reading the plan recommends: the plugin designer of step 10 is the agent session that writes plugin content, which never sees content; the user is the human rater and the one who approves, and passes that session no task-, check- or edge-specific instruction. Every prompt the user gives a design session is kept, and step 14's report lists them, so a reader can check it. The seen set (tasks, check ids, commits) is recorded at the lock by count and in a sealed list. That is a known limit, not a proof: the user will know 80 hidden checks.

   Options:
   - **A (recommended).** The user reads as above, under that reading, and the 13 sampled cold-setup rows are replaced before any read (ruling 3): the cold-setup repos stay unopened by the user except for the 2 disputed classifications there, which stay disputed (ruling 5). Cost: a registered deviation of the queue's sampling, and 2 checks in cold tasks that no human settles (a disputed check scores H2 and is not a step candidate, so it can only lose a step id it would have had if called `traceable`).
   - **A'.** As A, without the swap: the user opens 3 of the 4 cold-setup repos through their issue and checks. Cost: step 4 ruling 13 is broken for the user, and the cold-setup test of section 13 runs on repos the approver has seen.
   - **B.** Another person, allowed to see the customer's data (the real-estate batches are private customer content), does every read. No deviation. Cost: finding that person, about 10 hours of their time.
   - **C.** Sealed agents do the reads. Not recommended: sections 5, 6.3, 7.1 and 7.2 ask for a human because these reads check agent work, and an agent checking agents adds nothing.
   - **D.** The user reads and steps out of plugin design: the design sessions run from the prereg and generic goals, and the user approves only by scores. Strictest; it moves every design judgement to the agents.

2. **Two humans (7.2, interventions).** Section 7.2's raters bullet needs one human (settle every disagreement, re-rate 20 agreed per set): no change. Its interventions bullet needs two humans to label 20 transcripts, κ ≥ 0.7, before one labels the rest. Options:
   - **(a) recommended: the user and the registered mechanical rule.** The tool labels every historical event by ruling 8's rule; the user labels the events of 20 sampled segments blind to the tool's label; κ(user, tool) ≥ 0.7 is the gate, and the tool's labels give the baseline. The arms' interventions in Part 2 are counted by a tool too (`countInterventions`), so what needs checking is that a mechanical reading of the rules matches a human's. Cost: a registered deviation; κ then measures the rule's fidelity to one human, not how two humans agree on the rules.
   - (b) The user and one sealed agent labeller (blind to each other) on the 20, the agent labels the rest. Cost: a deviation; the second rater is not a human, and the agent must read the user's past sessions.
   - (c) A second person labels the 20. No deviation. Cost: that person reads the user's sessions with the customer's project in them.
   - (d) The user alone labels everything, no κ. Cost: a deviation; no reliability number.
   This feeds the descriptive historical baseline of 9.3, not H3's test.

3. **How the user reads.** Options:
   - **(a) recommended: a local page.** `bun bench/human.mjs serve <batch>` listens on `127.0.0.1` only; this session reports its port with `report_preview_port`, and the Claude app shows it in its preview pane over Remote Control. Each answer is a POST that the server validates and appends to `<data>/step9/answers/<batch>.tsv`. Nothing is stored off the Mac, and this session never sees the page or the notes (the page passes through the app's preview connection while it is open). **Probe, 2026-11-08:** a page with no bench content is served on port 59452 under the name `step9-probe`; it writes to the session scratchpad. The user's answer to "do you see it and does Save work" decides between (a) and (b).
   - (b) A private claude.ai artifact per batch with a database. Costs: the content is stored on claude.ai under the user's account, where any later session of the account (the design session too) can list and read it, so each page is deleted after its answers are pulled; the Artifact tool reads a page before publishing it, so this session sees the content; the answers and notes come back through this session's context.
   - (c) The same local page, read when the user is at the Mac.

4. **The historical transcripts (9.3).** They are `~/.claude/projects/-Users-hbchuc-Documents-programing-vibe-code-outsourcing/*.jsonl`: 106 session files, 2026-10-08 to 2026-10-26, 723 human text messages on the main thread plus 4 `!` commands (`<bash-input>`, each followed by its `<bash-stdout>`, which is not an event), counted without printing text; the folder groups below count both messages and command texts (731). The 5 sessions of `-outsourcing-harness` are harness development, not plan builds, and are left out. They are read in place, read-only; nothing is written under `vibe-code/outsourcing/` (they sit in the home folder), and the real-estate commit times come from `git log` of the `outsourcing-hstack` copy. Every event carries `timestamp`, `sessionId` and `isSidechain`, so a tool maps sessions to plans by time without reading text (ruling 8). What reaches the user: the events of the 20 sampled segments. What reaches this session: counts and κ.

   **The question for the user: which sessions are plan work.** All 106 sessions were started in the outsourcing folder; the folders their events worked in (folder names and counts only) are: root only 44 sessions (243 human messages), `real-estate` 25 (257, one with `showcase-data`), `.superpowers` (the plan spikes) with or without `real-estate` 29 (171), `real-estate` with `ui/mockups` 2 (16), `docs` 3 (17), `.claude` 1 (2), and 2 sessions that touched `ui/groanola` and `ui/keyfit` (25). Ruling 8's window is by time only, so a session about something else that falls in a plan's window counts as that plan's. Recommended: every session counts, the window decides, because the folder a session worked in does not say whether the human was steering the plan. The alternative: leave out the sessions you name by folder group (for example the 2 `ui/groanola` ones), registered before any label.

5. **What step 9 changes downstream.** Settled by rulings 4–7 and 9; the table "What step 10 hashes again" lists every file. One point is the user's, for step 10's plan: if p6c meets rule (b) after the second batch (it is the only task below the rule with a disputed pair), does it get a seeded bug? Recommended: yes, one, by step 7's rule "1 bug on each task that meets rule (b)" (cost: 2 candidates and their grades, about 1 h); the alternative keeps the 9 named in the user's decision of 2026-11-06.

6. **The step 8 carry-overs.**
   - The 3 pairs are the `pairs` batch. The decision the stick needs (step 8 open point: the registered canary failed, the extension passed on a bootstrap bound of 0.057 with the t interval crossing 0) is asked after that read, at this step's lock, before step 10.
   - **Token: needs the user.** Revoke the setup-token where the account's tokens are managed. After the user says it is revoked, `rm <data>/arm/box.env` (never read). Step 11 needs a new token anyway.
   - **Docker:** remove by the names the step 8 lock records, never `-f`: `docker rmi bench-arm/fw:1`, `docker rm bench-ext-fxngq295__app__1-arm-s1-01-B-2`, `docker rmi bench-ext/fxngq295__app__1:bb1762b-arm bench-ext/fxngq295__app__1:bb1762b-serve` (all four present on 2026-11-08). The 327 other `bench-ext-fx*` containers and 161 images of the gated tests of steps 4–8 and `bench-ext/probe:net` are recorded by no step and stay.
   - **Oracle commands in the product folder:** Task 6 rewrites the 27 `env/s*.json` and the 25 `env/seeded/*.json` with `oracleCommand`, before step 10 hashes them. `env/real-estate.json` runs `sh env/real-estate/oracle.sh` on the host; steps 9 and 10 grade only real-estate commits, and the real-estate arm box is the plan of step 11, which must cover it.

## Rulings the prereg leaves open (Task 1 registers them in section 12 before any read)

1. **Scope.** The rows of the seven queue files as locked, the 3 step 8 pairs, the historical segments of ruling 8, and the second batch's disputes (ruling 7). Not read: the resolver verdicts of step 6 (the step 6 lock's "could"), p8b's 2 unclear checks of section 14 (its validations stand).
2. **Answers.** Per batch a set: `inputs` `clean|leak`; `oracle-7.1` `same|different|unclear`; `rerate-7.2`, `classify`, `classify-2` `traceable|not traceable|partly`; `labels` `fix|requirement change` (`later`) or `fix|build` (`in-task`); `pairs` `B- worse|same|B- better`; `history` `rule 1|rule 2|rule 3|not counted` per event. Each row of `<data>/step9/answers/<batch>.tsv` is `key answer note at`; the last row of a key wins until `apply` runs on the batch, which freezes it (`answers/<batch>.applied` with the file's sha256; the server then refuses). Notes are sealed: no tool prints one. `build` appends every row it shows to `step9/seen.tsv` (`batch task key`), the sealed record of the seen set.
3. **Blindness and the cold swap.** No page shows an agent's label, a verdict or another batch's answer. Before any read, `oracle-7.1`, `rerate-7.2` and `inputs` drop the rows of cold-setup tasks (`cold_setup yes` in `ext/sample.tsv`) and refill each set to its count from the same pool by `queuePick` over the pool without cold-task ids, seed of `ext/groups.json`, so every other row is unchanged (`queuePick` sorts and cuts). The new lists are `step9/sample-7.1-v2.tsv`, `sample-7.2-v2.tsv`, `inputs-v2.tsv`; the locked files are not touched. Under option A' this ruling is left out.
4. **Labels.** A pair called `fix` joins the second batch (ruling 7); any other answer leaves it out of the oracle. `sources/labels.tsv` is not changed: the second batch reads `answers/labels.tsv`.
5. **Classifications.** `traceable` → `build`, `not traceable` → `requirement`, `partly` → `requirement` (6.3's fallback; a split would need two raters and another human round, and under the floor rule every fix check scores H2 whatever its label, so a split changes only how H2 weighs it). `apply classify` writes the label into `labels.json` and nothing else (`agreement.json` keeps the raters' numbers). A disputed check of a cold task under option A stays disputed. p8b's answer is recorded; it feeds no score (step 6 ruling 7).
6. **The 7.1 and 7.2 reads are gates.**
   - 7.1: a check answered `different` leaves the score (`dropped: true`, `drop_reason: "human 7.1"` in its manifest), because the read exists to confirm a check tests its origin's behaviour. A task-repo step check so dropped also leaves `step.json` `ids`, with no replacement (step 6 ruling 3's rule for a selected test that ends `weak` or `broken`), because `score` refuses an id its grade lacks; an external one leaves the ids at step 10's `step` rerun. An `unclear` answer counts against the gate and drops nothing: an unsure read does not remove a validated check. A set (task-repo fix checks, task-repo step checks, s1, s2, s3) with fewer than 9 of 10 `same` stops the plan for the user: the rewrite of 6.2 would then need a new plan.
   - 7.2: the agreed label stands (a re-rating measures, it does not correct); a set below 90% agreement with the agreed labels (fewer than 18 of 20) stops the plan for the user, with the prereg's consequence: rewrite the classification rule and rerun before the lock, in a new plan.
   - Inputs: a `leak` stops the plan for the user; an input change would change what every arm sees.
7. **The second batch (step 5 ruling 7).** For each commit of a pair called `fix`: `oracle write <task.json> <sha> --batch 2`, whose scope is only those pairs' hunks, whose prompt says the ids start at `<sha7>-T<k+1>` (`k` = `nextNumber` over every oracle, step oracle and seeded oracle), whose folder, prompt, reply and settings carry `-b2`, and which moves its checks in without removing that commit's earlier checks (5 of the 12 commits are already sources of other tasks; their checks stay byte for byte). Then `oracle validate <task.json> <task> --ids <new ids>`: the new checks are graded from a temporary oracle that holds only them (the pattern of `sweep`), with the fixer and comparer rounds of ruling 11, and their verdicts are merged into `validation-<fix7>.json`, every earlier entry unchanged. `oracle sweep` runs on them when one is `pre-existing`. Then `oracle classify <task.json> <task> --round b2`: two raters over the new scored checks only, as the split rounds do (`work/classify-b2/`, `agreement.json` `splitRounds` gets the round), agreed `partly` going to `split` under ruling 15, whose validation of the halves goes through the same `--ids` path (today `split` calls `validate` on the original's whole fix commit, which would regrade that commit's other checks). Every disagreement left after those rounds is in `classify-2`, settled by ruling 5. No third human round: a split half of a `classify-2` check is not made.
8. **Historical interventions (9.3).** The sessions are those of decision 4's answer. A plan's window is `(commit time of its base, commit time of its end]` from `tasks.json`, read by `git log -1 --format=%cI` in the real-estate copy. An event is, on the main thread of a session (`isSidechain` false, not `isMeta`): a human text message (not a tool result, not a `<command-…>`, `<local-command…>`, `<system-reminder>` `<task-notification>` or `<bash-stdout>` text), an interrupt (`[Request interrupted`), a tool use the human rejected, a `<bash-input>` command, or a `/clear` or `/compact` command. A segment is a (task, session) pair with at least one event in the window; events in no window are counted and left out. The tool's rule: the plan's first event is `not counted` (it starts the task); the first event of each later session of the plan is `rule 2` (a restart); a `<bash-input>`, `/clear` or `/compact` is `rule 2`; an interrupt and the message after it in the same turn are one `rule 1`; any other event is `rule 1`; `rule 3` is never given (no plan was abandoned). The sample is `queuePick` of the segment keys `<task>:<sessionId>`, 20, the seed of `ext/groups.json`; the user labels its events blind to the tool. κ over those events with `agreement` (four categories) must be ≥ 0.7; then the baseline per task is the tool's count over the task's segments. Below 0.7 the plan stops for the user (the rules or the tool's reading change in a new commit, registered before any relabel).
9. **Rule (b) recount.** After the second batch, `oracle validate` and `sweep` give each task's scored checks; rule (b) counts them over every agreed and human-`fix` source (step 5 ruling 13), less the checks ruling 6 dropped. The counts and which tasks meet it go to the lock; section 4.1's cap of 12 is applied there.
10. **This session is sealed.** `human.mjs` prints only counts, gate lines and κ; it never prints a row's content, an answer of a classification batch by id, or a note. This session does not open a page, a batch file or an answers file. The controller may read the `history` counts per rule, the gate lines and κ.
11. **The server.** `127.0.0.1` only, a random token in the path (a request without it gets 404), one batch per process, a POST whose key is not in the batch or whose answer is not in the batch's set is refused with 400 and writes nothing, appends only, and refuses every write once the batch is applied.

## What step 10 hashes again

| file | changed by | locked in |
|---|---|---|
| `<task>/labels.json` of the tasks with a settled classification | ruling 5 | step 5 (p8b: step 6) |
| `<task>/oracle/manifest.json` of tasks with a 7.1 drop or a second-batch check; the new check files | rulings 6, 7 | step 5 |
| `<task>/step/oracle/manifest.json` and `<task>/step.json` of real-estate tasks with a 7.1 step drop | ruling 6 | step 6 |
| `validation-<fix7>.json` of second-batch fix commits | ruling 7 | step 5 |
| `<task>/agreement.json` of tasks with a `b2` round | ruling 7 | step 5 |
| `env/s*.json`, `env/seeded/*.json` | Task 6 | steps 5, 7 |
| new: `step9/*-v2.tsv`, `step9/seen.tsv`, `step9/batch2.tsv`, `step9/answers/*`, `step9/pages/*`, `<data>/history/*`, `re-work/*-b2*` | this plan | — |

Then step 10, by the rulings already registered: `oracle step` again for external tasks (step 6 ruling 2), `kills` again for every task whose `oracle/` changed (step 7 lock; a 7.1 drop changes the manifest, so its `oracleSha`), the seeded bug of decision 5, and the hash of every oracle, step oracle, seeded and held-out file, the queue, the answers and the history labels, with the step 5–8 hash compares listing each changed file with its ruling.

## Expected size

| lane | count | time |
|---|---|---|
| the user's reads | 4 + 50 + 40 + 21 + 12 + 3 + about 150 events | about 10 h, at the user's pace |
| second batch writers, fixers, comparers, raters | at most 12 commits, 6 tasks | about 3–5M tokens, 2–3 h |
| real-estate grades of the second batch | about 2 runs per commit | about 2.3 min a run, on `bench_re` only |
| the user's `classify-2` | the second batch's disputes | under 1 h |

No external grade and no arm run. Docker: only the 4 removals of decision 6.

## Global Constraints

- Bun only, no new dependency in `bench/`; tests run with `bun test ./tests`, output pristine. `bench/` names no stack, customer or task. `<data>` = `/Users/hbchuc/Documents/programing/vibe-code/hstack/.evidence/bench` (gitignored, main checkout). Set `HSTACK_BENCH_MACHINE=<data>/machine.json` for every bench command.
- Build on the branch `bench-step9` from `main` (5c67583). Do not push `worktree-bridge-cse_01JxVNAL2Dkzabg9QuuNaY5E`: it holds per-bug labels squashed out of main. A push that keeps disconnecting worked with `git -c http.postBuffer=524288000 push`; do not change the git config.
- Never write under `/Users/hbchuc/Documents/programing/vibe-code/outsourcing/` (the transcripts in `~/.claude/projects/` are read in place). Never touch `real_estate*` databases; real-estate grades use `bench_re` only, with the pgsnap compare around each batch.
- **Docker.** Never `prune`, `volume`, `compose` or `network`, except `docker builder prune -f`. Removal only by the names a step recorded, never `-f`. Docker stays at 7.6 GB.
- **Sealing.** Every grade of an oracle runs with `--sealed`. Never read `ext/raw/`, `ext/sealed/`, `heldout/`, `seeded/`, `<task>/seeded/` (other than `validation-*.json`, `kills.json`, `grades/`), `logs/step7/*.out`, any oracle, step oracle, seeded-bug or reply file, `step9/` rows, pages or answers, or a transcript, by hand. Plain `bun bench/bugs.mjs <task> <sealed> --sealed` is forbidden (only `--usable`, `--fix-tally`, `--at-tally`). The user reads only through the pages of this plan. Replies to the user hold only counts, gate lines, κ and verdicts.
- This session is not the plugin-design session (section 12, step 10).
- Record each task's usage in `progress/progress.md` (implementer and reviewer tokens and minutes, wall clock of the runs). Copy the SDD ledger into `progress/progress.md` before the final review. The plan goes `stable` only after the user approves the build.
- Docs, logs and commit messages in English.

## Review Focus

1. A page that shows an agent's label or verdict, or a server log line that holds a row. Expected: neither. Test: Task 3 'a classification page holds no rater label and no verdict' and 'build and serve print counts only'.
2. An answer for a key outside the batch, or after `apply`. Expected: 400 or 409, nothing written. Test: Task 3 'the server refuses an unknown key, an unknown answer and any write after apply'.
3. The second batch removing or renumbering a commit's earlier checks. Expected: the earlier checks and their validation entries byte for byte. Test: Task 5 'a batch 2 write keeps the commit's earlier checks and numbers after them', 'validate --ids leaves every other entry unchanged' and 'the split pass of a b2 round regrades no entry outside its ids'.
4. The cold swap changing a non-cold row. Expected: every non-cold row of the locked file is in the new file, in the same order. Test: Task 2 'the cold swap keeps every other row and refills the set'.
5. A session spanning two plan windows, or an event outside every window. Expected: split by timestamp, outside events counted and left out. Test: Task 4 'a session across two windows gives two segments' and 'an event in no window is counted and left out'.

---

### Task 1: Register the rulings

**Files:**
- Modify: `docs/plans/2026-10-27-benchmark-prereg.md` (section 12, a dated paragraph after step 9), `docs/plans/index.md`, `docs/log.md`

- [ ] **Step 1:** Write the paragraph "Applied at step 9 (2026-11-08)" after step 9 of section 12: rulings 1–11 and the user's decisions as decided, the deviations they make (the cold swap, decision 2's choice, the 7.3 pairs read by the user now), ending "registered before any read; `bench/human.mjs serve` has not run on a queue batch". Add the plan to `docs/plans/index.md` and an **Update** line to `docs/log.md`. Commit `git commit -m "Register the step 9 rulings before any read"`.

### Task 2: Pure rules

**Files:**
- Create: `bench/lib/human.mjs`, `tests/bench-human.test.mjs`

**Interfaces:**
- Produces:
  - `BATCHES`: `{ inputs, 'oracle-7.1', 'rerate-7.2', classify, 'classify-2', labels, pairs, history }`, each `{ answers: string[] }` (ruling 2; `labels` answers depend on the row's kind: `answersFor(batch, row) -> string[]`).
  - `parseAnswers(tsv) -> Map<key, { answer, note, at }>` (last row wins), `answerOk(batch, row, answer) -> boolean`.
  - `coldSwap(rows: { set, key }[], pool: Map<set, key[]>, n: Map<set, number>, isCold: (key) -> boolean, seed) -> { set, key }[]`; a key is a check id, or a task for `inputs` (its pool is the set's kept tasks, as `oracle queue` drew it).
  - `planWindows(tasks: [{ task, base, end }], time: (sha) -> Date) -> [{ task, from, to }]`.
  - `events(lines: object[]) -> [{ at, kind: 'message'|'interrupt'|'reject'|'bash'|'clear', turn }]` (ruling 8's filter; no text kept).
  - `segments(sessions: [{ id, events }], windows) -> { segments: [{ key: '<task>:<id>', task, events }], outside: number }`.
  - `toolLabel(segment, isFirstOfPlan: boolean) -> labels[]` (ruling 8's rule).
  - `historyKappa(human: string[], tool: string[]) -> agreement(...)` over the four categories.

- [ ] **Step 1: Write the failing tests:** 'the last answer of a key wins'; 'an answer outside the batch set is refused, and labels take the row kind's set'; 'the cold swap keeps every other row and refills the set' (a pool of 6 ids in 2 tasks, one cold, n 3: the non-cold rows of the old pick are a prefix-ordered subset of the new, and the new has 3 non-cold rows); 'a window is open at the base and closed at the end'; 'tool results, meta, commands and reminders are not events, an interrupt is'; 'a session across two windows gives two segments'; 'an event in no window is counted and left out'; 'the plan's first event is not counted, a later session's first is rule 2, an interrupt and its message are one rule 1'; 'history kappa is 1 on equal labels'.
- [ ] **Step 2: Run** `bun test tests/bench-human.test.mjs` — expect FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `bun test ./tests` — pass, output pristine. Commit `git commit -m "Add the step 9 answer, cold swap and history rules"`.

### Task 3: Batches and the page

**Files:**
- Create: `bench/human.mjs`, `tests/bench-human-cli.test.mjs` (fixture data folder)
- Modify: `bench/README.md`

**Interfaces:**
- Consumes: Task 2's exports, `queuePick`, `loadTask`, `gitOut`, `readJson`.
- Produces:
  - `bun bench/human.mjs swap`: writes ruling 3's three `-v2.tsv` files; prints `swap <file>: rows <n>, replaced <r>`.
  - `bun bench/human.mjs build <batch>`: writes `<data>/step9/pages/<batch>.json` (`[{ key, kind?, parts: [{ title, text, lang? }] }]`, ruling 2's views from the table of decision 1; `classify-2` from the `b2` rounds' disputed lists, tested in Task 5) and appends to `step9/seen.tsv`; prints `build <batch>: rows <n>, parts <p>`.
  - `bun bench/human.mjs serve <batch>`: ruling 11; prints only `serve <batch> port <p>` (the token goes to `<data>/step9/pages/<batch>.token`, mode 600), one page that shows one row at a time with its answer buttons, a note field and the count left.
  - `bun bench/human.mjs status`: per batch `status <batch>: rows <n>, answered <a>, applied yes|no`.

- [ ] **Step 1: Write the failing tests** on a fixture data folder (a task repo with one fix commit and one test file, a classify folder, a queue with one row per batch): 'build writes one row per queue row'; 'a classification page holds no rater label and no verdict' (no string of `classify-*.json`, `labels.json` or `validation-*.json` values in `pages/classify.json`); 'a 7.1 page shows the check next to the test at the fix commit'; 'build and serve print counts only' (stdout holds no part text); 'the server needs its token'; 'the server refuses an unknown key, an unknown answer and any write after apply'; 'a POST appends one row'.
- [ ] **Step 2: Run** `bun test tests/bench-human-cli.test.mjs` — expect FAIL.
- [ ] **Step 3: Implement;** README: the commands, `step9/pages/`, `step9/answers/` in the data layout.
- [ ] **Step 4: Run** `bun test ./tests` — pass, output pristine. Commit `git commit -m "Add the step 9 batches and the local answer page"`.

### Task 4: History

**Files:**
- Modify: `bench/human.mjs`, `tests/bench-human-cli.test.mjs`, `bench/README.md`

**Interfaces:**
- Produces:
  - `bun bench/human.mjs history <transcripts dir>`: reads every `*.jsonl` of the folder read-only, maps by Task 2's rules, writes `<data>/history/segments.json` (keys, task, event times and kinds, tool labels; no text) and the `history` batch (`pages/history.json`, each event with the agent's last text before it and the human's text, from the sealed transcript); prints `history: sessions <n>, segments <s>, events <e>, outside <o>, sample <20>, events in sample <k>` and the tool's counts per rule per task.
  - `bun bench/human.mjs kappa history`: prints `history kappa=<k> raw=<a> ac1=<c> n=<n> gate pass|stop`. The gate is κ ≥ 0.7 alone (7.2's text); raw agreement and AC1 are printed beside it because the tool's labels will be mostly `rule 1` (the skew of section 14 lesson 3), and they decide nothing.

- [ ] **Step 1: Write the failing tests:** 'history reads a fixture folder and writes no text into segments.json'; 'the sample is queuePick of segment keys'; 'kappa history stops below 0.7'.
- [ ] **Step 2: Run** — expect FAIL. **Step 3: Implement.** **Step 4: Run** `bun test ./tests` — pass. Commit `git commit -m "Map the historical sessions to plans and label them by the rule"`.

### Task 5: Apply and the second batch

**Files:**
- Modify: `bench/human.mjs`, `bench/oracle.mjs`, `tests/bench-human-cli.test.mjs`, `tests/bench-oracle.test.mjs`, `bench/README.md`

**Interfaces:**
- Produces:
  - `bun bench/human.mjs apply <batch>`: freezes the batch (ruling 2) and applies rulings 4–6: `classify`/`classify-2` → `labels.json`; `oracle-7.1` → manifest drops, and for a real-estate step check its id out of `step.json` `ids`; `rerate-7.2`, `inputs`, `oracle-7.1` → gate lines `gate <batch> <set> <agree>/<n> pass|stop`; `labels` → `step9/batch2.tsv` (`commit task kind`); `pairs` → counts per answer. Refuses a batch with an unanswered row. Prints counts and gate lines only.
  - `oracle write <task.json> <sha> --batch 2`, `oracle validate <task.json> <task> --ids <id,...>`, `oracle classify <task.json> <task> --round b2` (ruling 7).
  - `bun bench/human.mjs recount`: rule (b) per real-estate task, `recount <task> scored=<n> meets yes|no` (ruling 9).

- [ ] **Step 1: Write the failing tests:** 'apply refuses a batch with an unanswered row'; 'partly applies as requirement'; 'a 7.1 different drops the check and is counted against the gate'; 'a batch 2 write keeps the commit's earlier checks and numbers after them'; 'a batch 2 write refuses a commit no fix answer names'; 'validate --ids leaves every other entry unchanged'; 'the split pass of a b2 round regrades no entry outside its ids'; 'classify round b2 rates only the new checks'; 'build classify-2 takes the b2 rounds' disputes'; 'a 7.1 drop of a step check leaves step.json ids and score still reads the task'; 'recount counts human fix sources and leaves 7.1 drops out'.
- [ ] **Step 2: Run** — expect FAIL. **Step 3: Implement.** **Step 4: Run** `bun test ./tests` — pass. Commit `git commit -m "Apply the human answers and add the second batch modes"`.

### Task 6: The oracle commands

**Files:**
- Modify (gitignored): `<data>/env/s*.json`, `<data>/env/seeded/*.json`; Create: `<data>/logs/step9/env-fix.mjs`

- [ ] **Step 1:** The script sets each file's `oracle` to `oracleCommand(<task>)`, every other field byte for byte, and prints `env-fix: files <n>, changed <c>`; expected 52 and 52. Then `grep -L no-env-file` over both folders lists nothing. Record the old and new sha256 in `progress/progress.md`.

### Task 7: The reads (needs the user)

- [ ] **Step 1:** Stop the probe server (`kill` of the pid listening on its port, read by `lsof -ti tcp:59452`). `bun bench/human.mjs swap` (under option A), then `build` for `inputs`, `oracle-7.1`, `rerate-7.2`, `classify`, `labels`, `pairs`, and `history <transcripts dir>`. Record the count lines.
- [ ] **Step 2:** `serve` one batch at a time, in that order, `report_preview_port` with the batch name. The user reads and answers; `status` shows progress. No batch is applied before every batch of this step is answered, so no answer is made after seeing another batch's effect.
- [ ] **Step 3:** `apply` each batch, `kappa history`. Record every count and gate line. A `stop` line stops the plan for the user.

### Task 8: The second batch and its disputes

- [ ] **Step 1:** For each commit of `step9/batch2.tsv`: `write --batch 2`, then per owner task `validate --ids`, `sweep` when one is `pre-existing`, `classify --round b2`, `split` for agreed `partly`. Real-estate grades on `bench_re`, pgsnap before and after. Record the count lines.
- [ ] **Step 2:** `build classify-2`, `serve`, the user answers, `apply classify-2`. Then `recount`. Record.

### Task 9: Carry-overs

- [ ] **Step 1:** After the user confirms decision 6: the four Docker removals by name, then `docker images`/`docker ps -a` checked by those names (0 left). After the user says the token is revoked: `rm <data>/arm/box.env`. Record both.

### Task 10: Lock

**Files:**
- Create: `progress/step9-lock.md`
- Modify: `docs/log.md`, `progress/progress.md`

- [ ] **Step 1: Check:** `bun test ./tests` pass; `git status --short bench` empty; every batch `applied yes`; the step 5–8 hash compares report exactly the changed files of the table "What step 10 hashes again" and no other; no server running; `/tmp/hstack-bench` empty; pgsnap equal.
- [ ] **Step 2: Write** `progress/step9-lock.md`: the rulings and decisions; per batch rows, answers by count, gates; the classifications settled per set (build/requirement), the second batch (commits, checks written, verdicts, labels, disputes), rule (b) before and after; κ of history and the baseline per task; the pairs read by count; the seen set by count (its sealed list `step9/seen.tsv` hashed); the env fix; Docker and token; the list for step 10; open points (the stick decision of step 8, decision 5). Hashes of every new file.
- [ ] **Step 3:** Record usage, a **Creation** line in `docs/log.md`, commit `git commit -m "Lock the human steps of step 9"`. Ask the user the stick decision of step 8.

## Known limits

- **The user knows 80 hidden checks.** Option A relies on the user giving the design sessions no content-specific instruction; the kept prompts make it checkable, not impossible.
- **One reader.** Every settlement and every read is one person's judgement; nothing measures that person against another (decision 2 measures the rule against the person).
- **Blind settling.** The `classify` page does not show the raters' labels or quotes, so the human labels from the check and the input alone, as the raters did; a disagreement the raters argued well is not shown.
- **The 7.1 sample is 10 per set.** A gate of 9 of 10 has a wide interval; the read finds a gross rewrite problem, not a small rate.
- **Historical windows.** A plan's window starts at its base commit, so a plan written before the previous plan's last commit loses its writing events, and a fix plan between tasks falls outside every window; both are counted.
- **The page passes through the app's preview connection** while it is open; it is stored nowhere off the Mac.
- **2 cold-task disputes stay disputed** under option A.

## Not in this plan

The `step`, `kills` and seeded reruns and every hash of stick v1 (step 10); the real-estate arm box and its host-run oracle (step 11); the blind rating and LLM judge of 7.2 and 13 (Part 2); the gated tests' Docker leftovers; the step 6 resolver read.
