---
type: plan
title: "H4 diagnosis plan"
description: "Step 15: why H4 was not met. With H and W only, through one registered tool, and before anything is looked at: did the three parts W removes run in H's runs, do H's and W's products differ more than runs of one arm differ, and where do the two arms' scores sit. A registered rule names the outcome. H4's verdict stands; nothing about B is computed."
status: draft
generated: { by: claude-code/2.1.318, at: "2026-11-18T23:11:30+07:00" }
verified:
  - { by: claude-code-advisor/2.1.318, at: "2026-11-18T23:14:30+07:00" }
sources:
  - id: prereg
    resource: /plans/2026-10-27-benchmark-prereg.md
  - id: analysis
    resource: /plans/2026-11-18-bench-analysis.md
---

# H4 Diagnosis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development for Task 1 (synthetic fixtures only); registering, the one run and the report are the controller's. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** H4 (H − W on build + requirement over the 29 external tasks) is not met: mean −0.0048, 95% [−0.0775, 0.0588] (`progress/step14-report.md`). The report could not tell two readings apart: **(R1)** the stick does not see what the removed parts do, or **(R2)** those parts change nothing the stick scores. Two more must be ruled out first: the parts seldom ran in H's runs (**inactive**), or the stick had no room on most tasks (**little room**). This step names what is observed by a rule written now; where line counts cannot separate R1 from R2, it says so and names what would.

**Architecture:** One command, `bun bench/scored.mjs diagnose`, refused until `<data>/step15/registered` exists. It reads H's and W's standing runs only. From each run's transcript it counts named tool calls (never text). From the arm stores it counts changed lines between products (`git diff --numstat`, never content). From `step13/table.json` it takes the scores, through the tool. It prints three observation lines and the reading.

**Tech Stack:** Bun, `bun:test`, `bench/scored.mjs` (`standingOf`, `c.sha`), `bench/canary.mjs` (`records`, `aboveFloor`, `standing`), `bench/lib/score.mjs` (`bootstrapMean`, `canaryScore`), `bench/lib/task.mjs` (`isTestPath`), `bench/lib/agent.mjs` (the stream-json parsing of `toolUses`: `tool_use` blocks of `assistant` events, deduplicated by id), git.

**Spec:** prereg sections 2 (H4), 3 (the arms: W is H "with these off: the reviewer in its own context, the independent oracle, the gate against weakened tests"), 7.3, 12 ("Applied at step 14"); `progress/step14-report.md` (H4, open points: the advisor's ruling on step 15 under the user's delegation); `progress/step12-lock.md` (W's export).

## What W removes (read from the two exports, 653af83 and 9c4b267)

`agents/oracle.md` and `agents/reviewer.md` are gone; `skills/build/SKILL.md` drops step 3 "Oracle" (`hstack:oracle` writes black-box acceptance tests before any code, `$H lock`s and commits them), step 5 "Gate" (`$H gate`, again in "Final") and the reviewer step (`hstack:reviewer` in its own context, replaced by "Review your own diff"); `scripts/hstack.sh` drops the `oracle` and `gate` phases (`PHASES='setup oracle build gate review explore mutate final'` → `'setup build review explore mutate final'`).

## Limits (the advisor's ruling under the user's delegation, 2026-11-18)

H and W only, through the tool; no B number is computed, printed or written; `step13/table.json` is still not opened by hand; no change to the stick, W, the hypotheses or any score rule; H4's verdict stands whatever this finds; transcripts, products and grades are read only by the tool, which prints counts. 13.3–13.5 wait behind this step.

## Rulings (Task 0 registers them in prereg section 12 as "Applied at step 15" before any change to `bench/`)

1. **Runs:** the standing H and W runs of the 29 scored external tasks (87 each), as `table` selects them.
2. **O1, activity** (per run, from every turn's stream-json in the record's `transcripts` folder, by the tool; `tool_use` blocks of `assistant` events deduplicated by id, as `toolUses` counts them; a call counts as run when its `tool_result` is not an error):
   - **oracle:** an `Agent` call whose `subagent_type` is `hstack:oracle`; **reviewer:** one with `hstack:reviewer`.
   - **gate:** a `Bash` call whose command runs the plugin script with the subcommand `gate`. The skill sets `H` to `sh "${CLAUDE_PLUGIN_ROOT}/scripts/hstack.sh"` and tells the builder to write the script's absolute path into each command, so the pattern accepts `hstack.sh gate`, `hstack.sh" gate`, `hstack.sh' gate`, `$H gate`, `"$H" gate` and `${H} gate`.
   - Printed per arm: the runs where each part ran, of 87, and the mean calls per run; the histogram of every `subagent_type` value and of every subcommand word after `hstack.sh` (names and counts only), so a part spelled otherwise shows.
   - **Instrument checks, each stopping the tool before any reading:** per run, the tool's `Agent` and `Bash` totals equal the record's `toolUses` (the parser reads the real stream); W's oracle, reviewer and gate counts are 0. A **positive control** on real-format runs outside the set: the four H runs of the step 11 trial (s2-01 H-1, s3-02 H-1, p8b H-1, p6c H-1, plugin 653af83). When no part is found in any of them, the reading "inactive" is printed as "inactive or a detector fault (unconfirmed)".
3. **O2, product distance** (per task, from the arm store by the tool): the distance of two products is the lines added plus deleted in `git diff --numstat <a> <b>`, split into test files (`isTestPath`) and other files (code); binary files count 0. H's state files are not in the product: the plugin writes them outside the repository (`~/.hstack/…`, "never committed", `scripts/hstack.sh`). Per task: `between` = the mean over the H–W pairs, `within` = the mean over the H–H and W–W pairs (9 and 6 when every run has a product; a run with no product branch leaves its pairs, and a task with no H–W pair or no within pair leaves O2, named); `r_t = ln((between + 1)/(within + 1))`. The mean of `r_t` over the tasks, with a 95% bootstrap (`bootstrapMean`, seeds `hstack-bench-2026-10-27:step15:O2-code` and `…:O2-test`). A **trace** when the lower bound > 0.
4. **O3, score shape** (H and W only, from `table.json` by the tool): per task the arm means of `canaryScore` over scored runs, and the task's own maximum (2 with step ids, 1 without: s1-01, s1-06, s3-01, s3-07, s3-09). Printed: tasks with an exact tie (|d| < 1e-9); tasks with both means ≥ 90% of the maximum (ceiling) and with both ≤ 10% (floor); the mean over tasks of each arm's run-to-run standard deviation; the standard deviation of `d_t`.
5. **The outcome, by what is observed, in this order:**
   - **Inactive:** in H's 87 runs, the oracle, the reviewer and the gate each ran in fewer than 44 (half). H and W mostly did the same thing; H4 tested little.
   - Else **little room:** at least 15 of the 29 tasks are at the ceiling or the floor in both arms. The stick could not move on most tasks, whatever the parts did.
   - Else **a code trace:** O2's code lower bound > 0. The parts changed the code more than runs of one arm differ, and the scores did not move. R1 against R2 stays **open**: line counts cannot tell a quality difference the stick misses from a change neutral to the requirement. What would settle it is an independent quality measure of H's and W's products (for example a blind rating of H/W pairs), in a later plan.
   - Else **a test trace only:** only O2's test lower bound > 0. The parts' trace is in test files, which the hidden oracle does not score; for the scored output, this is R2.
   - Else **no trace:** the parts ran, and the products of the two arms differ no more than runs of one arm (R2).
6. **Order and sealing:** the tool is built and reviewed on synthetic fixtures only (a synthetic transcript folder, a scratch git repo with products). After the user approves this plan, Task 0 registers it, and Task 1 is reviewed and committed, the controller writes `<data>/step15/registered` (`{ plan, tool, at }`) and runs `diagnose` once. A fault found after it prints is fixed with a test and run again in the open, both outputs kept.
7. **The lock:** `stick hash` (outside `<data>`) and `compare progress/stick-v1-step14.sha256 --reasons progress/step15/reasons.tsv`, expected changed 0 (step 15 adds `step15/` and `logs/step15/`).

**Seen before these rulings:** H4's numbers; the H5 result; the arms' token and minute means (W 29,508 tokens and 25.2 minutes per run, H 27,882 and 32.4); the two exports; the `toolUses` keys of one standing H record (`Agent`, `Bash`, `Skill`, `Write`) and of the trial's s2-01 H-1 (`Agent`, `Bash`, `Edit`, `Monitor`, `Skill`, `ToolSearch`, `Write`), no counts. No O1, O2 or O3 value.

## Global Constraints

Branch `bench-step15` from `main` (22ea223); `<data>` = `/Users/hbchuc/Documents/programing/vibe-code/hstack/.evidence/bench`; `HSTACK_BENCH_MACHINE=<data>/machine.json`; Bun only, no new dependency; `bench/` names no stack, customer or task; the tool reads only H and W (a B record is never opened); every full suite `bun test ./tests` teed to `<data>/logs/step15/tests-<n>.out`; never touch `real_estate*` databases or `outsourcing/`; implementers on fixtures only; English docs.

## Review Focus

1. A B run read or a B number printed. Test: 'diagnose never opens a B record'.
2. Text of a transcript or a product printed. Test: 'diagnose prints counts only' (a fixture transcript with a marker string never appears in the output).
3. The gate pattern matching an unrelated `gate` (a file name, a word in a commit message), or missing a quoted form. Test: 'only a command that runs the plugin script with gate counts, in each quoted form'.
4. A W run with an oracle, reviewer or gate call not stopping the reading. Test: 'a W run with a removed part stops before the reading'.
5. The outcome order wrong at a boundary (exactly 44 runs; exactly 15 tasks; a lower bound of exactly 0). Tests: 'inactive needs fewer than 44 in all three', 'little room at 15', 'a lower bound of 0 is not a trace'.
6. A parser that reads 0 on the real stream. Tests: 'the Agent and Bash totals must equal the record's toolUses' and 'an errored call does not count as run'.

---

### Task 0: Register the rulings

- [ ] **Step 1:** After the user's approval, write "Applied at step 15 (<date>)" in prereg section 12 (rulings 1–7, the limits, "Seen before"), `docs/log.md`; commit.

### Task 1: The diagnosis tool

**Files:** Create `bench/lib/diagnose.mjs` (pure: counts from parsed transcript lines, reusing `toolUses`' block walk, distances from numstat text, the outcome); Modify `bench/scored.mjs` (`diagnose` command), `bench/README.md`; Test `tests/bench-diagnose.test.mjs`.

**Interfaces:**
- `activity(lines: object[]) -> { oracle, reviewer, gate, agentTotal, bashTotal, agentTypes: {name: n}, scriptWords: {word: n} }` (from a run's stream-json objects; only non-error calls count as run).
- `numstatDistance(text, isTest) -> { code, test }`.
- `taskDistance({ H: [sha], W: [sha] }, dist(a, b)) -> { code: { between, within, r }, test: { ... } }`.
- `outcome({ o1, o2, o3, control }) -> 'inactive' | 'inactive or a detector fault (unconfirmed)' | 'little room' | 'a code trace' | 'a test trace only' | 'no trace'`.
- `scored.mjs diagnose` refuses without `<data>/step15/registered` and `step13/table.json`; finds each standing H and W run's transcript files from the record's `transcripts` field; writes `<data>/step15/diagnosis.json`; prints the instrument checks first, then `O1 <arm> oracle=<n>/87 reviewer=<n>/87 gate=<n>/87 …` with the histograms, `control …`, `O2 code|test tasks= mean= 95%=[…]`, `O3 …`, `outcome <words>`.

- [ ] **Step 1:** Tests: the six of Review Focus; 'activity counts Agent calls by subagent_type and Bash calls by the gate pattern'; 'numstat splits test and code files and counts binary as 0'; 'taskDistance uses 9 between and 6 within pairs'; 'outcome follows ruling 5's order'; 'diagnose refuses without registered'.
- [ ] **Step 2:** Run them; they fail. Implement; full suite teed; commit.

### Task 2: Register and run (controller)

- [ ] **Step 1:** Review of Task 1 (spec + quality) on the most capable model; fixes. Full suite teed, pristine.
- [ ] **Step 2:** `<data>/step15/registered`; `bun bench/scored.mjs diagnose > <data>/logs/step15/diagnose.out`, exit code recorded, output and `diagnosis.json` copied to `-1` names.

### Task 3: Report and lock

**Files:** Create `progress/step15/reasons.tsv`, `progress/stick-v1-step15.sha256`, `progress/step15-report.md`; Modify `docs/log.md`, `progress/progress.md`.

- [ ] **Step 1:** Ruling 7's hash and compare.
- [ ] **Step 2:** The report: O1, O2, O3, the outcome in ruling 5's words, what it means for H4 (the verdict stands), what it means for 13.3–13.5 and for any later change to W or the stick (each needs its own registered plan); deviations; the manifest. Advisor review; the user's approval; this plan `stable`.

## Known limits

- **Line counts are a coarse distance:** two products can differ by few lines in an important way, or by many lines of formatting.
- **O1 counts calls, not their effect:** an oracle that ran and wrote nothing counts as ran.
- **One H and one W** (the designer's W, unchecked beyond the export diff above).

## Not in this plan

Any new run or grade; any B number; 13.3–13.5; a change to W, the stick or a hypothesis; the per-layer measures.
