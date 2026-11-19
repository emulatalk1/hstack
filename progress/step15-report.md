# Step 15 report: the H4 diagnosis

Plan: [H4 diagnosis plan](../docs/plans/2026-11-18-bench-h4-diagnosis.md). Rulings registered in the prereg's section 12, "Applied at step 15" and "Amended at step 15 (the tool's readings)", before `<data>/step15/registered` existed and before any O1, O2 or O3 value was seen.

## The question

The step 14 report found H4 not met: H − W on build + requirement over the 29 external tasks has mean −0.0048, 95% [−0.0775, 0.0588]. It could not tell two readings apart: **(R1)** the stick does not see what the three removed parts (the independent oracle, the reviewer in its own context, the gate) do, or **(R2)** those parts change nothing the stick scores. This step first rules out two plainer causes: the parts seldom ran in H's runs (**inactive**), or the stick had no room on most tasks (**little room**).

## Result in one paragraph

**The outcome is "little room".** The three parts ran in every one of H's 87 standing runs, and in none of W's, so H4 did compare two arms that behaved differently. But 15 of the 29 tasks sit at the ceiling (13) or the floor (2) in both arms. Ruling 5 sets the bar for "little room" at 15, so this result meets it exactly. On 20 of the 29 tasks the arm means tie exactly. By the registered order, that names the outcome, and the later rules are not reached. **H4's verdict stands.** It is not met, and H1–H3 stay unreported. In ruling 5's words: the stick could not move on most tasks, whatever the parts did. Of the 14 tasks not at an edge, at least 5 also tie exactly (20 ties in all, at most 15 of them at an edge).

## How it ran

| step | when | evidence |
|---|---|---|
| plan approved by the user (typed "Duyêth", i.e. "Duyệt", asked directly) | 2026-11-19 02:06 +07 | plan's `verified` list |
| rulings registered | 22a6dc8 | prereg "Applied at step 15" |
| tool built on synthetic fixtures by an implementer subagent; reviewed on the most capable model (Approved, 0 critical, 2 important, 7 minor); two fix rounds, the second re-reviewed (Approved, no finding) | b243ed8, 700b220, d50cf88 | `.superpowers/sdd/2026-11-18-bench-h4-diagnosis/` (ledger, brief, report, review) |
| the tool's readings registered | fef91ac | prereg "Amended at step 15 (the tool's readings)" |
| suite | before `registered` | `<data>/logs/step15/tests-1.out`: 727 pass, 65 skip, 0 fail (the two `done grade=ok` lines as before) |
| `<data>/step15/registered` | 2026-11-18T19:53:31Z | `{ "plan": "fef91ac", "tool": "d50cf88" }` |
| `diagnose` once | exit 0 | `logs/step15/diagnose.out` (copy `diagnose-1.out`), `step15/diagnosis.json` (copy `diagnosis-1.json`) |

Command: `bun bench/scored.mjs diagnose progress/stick-v1/tasks-step11.tsv --control s2-01:H:1,s3-02:H:1,p8b:H:1,p6c:H:1`. Nothing was rerun. `git diff --stat d50cf88..HEAD -- bench tests` is empty: the tool that ran is the registered one. No B record was opened, and `table.json` was read only by the tool.

## Instrument checks (all ok, printed before any reading)

- `standing tasks=29`: every task has exactly 3 standing runs in H and in W.
- `transcripts runs=178`: the 174 standing runs plus the 4 controls each have turn files.
- `toolUses runs=178`: per run, the tool's Agent and Bash totals equal the record's `toolUses`. Every call has a `tool_result`: Agent 572/572, Bash 17,464/17,464. No run had zero Bash calls, so the Bash side of the check did not pass on 0 = 0; for Agent, only the total (572) is shown.
- `W parts runs=178`: no non-error oracle, reviewer or gate call in any W run.
- `H plugins runs=178`: every standing H run and every control carries the same plugin entry (653af83).
- The task list for a maximum of 1 printed as `s1-01,s1-06,s3-01,s3-07,s3-09`, the five the plan names.

## O1: did the removed parts run?

| arm | runs | oracle ran (called) | reviewer ran (called) | gate ran (called) | calls per run: oracle, reviewer, gate (gate called) |
|---|---|---|---|---|---|
| H | 87 | 87 (87) | 87 (87) | 87 (87) | 1.15, 1.37, 2.29 (2.31) |
| W | 87 | 0 (0) | 0 (0) | 0 (0) | 0, 0, 0 |
| control (step 11 trial, H) | 4 | 4 (4) | 4 (4) | 4 (4) | found = yes |

**Histograms.**
- **Subagent types:** H shows `hstack:oracle` 100, `hstack:reviewer` 119, `hstack:explorer` 81 and `hstack:mutator` 87. W shows only `hstack:explorer` 76 and `hstack:mutator` 87. The parts W keeps ran in both arms at similar rates.
- **Script words:** H shows `gate` 201 and `lock` 101. W shows neither.
- **Loose gate count** (deciding nothing): H 87/87 runs, 276 calls. W 3/87 runs, 3 calls. W's three are Bash calls that name the script and contain the word `gate` somewhere. None ran a `gate` subcommand, since the strict count is 0 and W's script words hold no `gate`.

**Reading:** the parts were not inactive. The detector works: the positive control found every part in all four trial runs, and the totals matched every record.

## O3: where the scores sit (H and W only)

| tasks | exact ties | ceiling (both ≥ 90% of max) | floor (both ≤ 10%) | ceiling + floor | mean run-to-run SD, H | same, W | SD of d_t |
|---|---|---|---|---|---|---|---|
| 29 | 20 | 13 | 2 | **15** | 0.0747 | 0.1280 | 0.1920 |

15 is exactly the bar for "little room" (at least 15 of the 29), so the outcome sits on the boundary. With one task fewer at an edge, the next rule would have been read.

## O2: product distance (printed; not reached by the outcome order)

| side | tasks | mean r_t | 95% bootstrap | lower > 0 |
|---|---|---|---|---|
| code | 29 | −0.0103 | [−0.0357, 0.0140] | no |
| test | 29 | 0.1222 | [0.0778, 0.1799] | yes |

r_t = ln((between + 1)/(within + 1)), from lines added plus deleted.
- **Test files:** H's and W's products differ more than runs of one arm.
- **Code:** they differ no more than runs of one arm.

These are observations only. The registered order stops at "little room", so O2 names no outcome. The rule that would have come next reads these lines as "a test trace only". It is not applied here and decides nothing. Before this run, the env commits of every H and W run above the floor were checked to share one git tree per task, so the distances are not inflated by different starting trees.

## What it means

- **For H4:** the verdict stands, not met, as registered. This step does not reopen it. H1–H3 and every other H − B line stay unreported.
- **For the R1/R2 question:** this step does not separate them. On 15 of the 29 tasks both arms score at the ceiling or the floor, so no difference could show there. O2, printed but not reached by the outcome order, adds two observations. The code H and W wrote differs no more than runs of one arm. The tests differ more; the hidden oracle scores the product's behaviour, not the test files the arm wrote.
- **For 13.3–13.5:** this step changes nothing in them. Whether they come next is an open point (below).
- **For any later change to W, the stick or the task set** (for example a harder task set with room above the ceiling, or an independent quality measure of the products): each needs its own registered plan before any run. Nothing here changes a registered rule.

## Deviations

1. **The tool's readings were registered after the review** and before `registered` ("Amended at step 15"). Two of them widen ruling 2:
   - a `called` count is printed beside the registered non-error count, with an "unconfirmed" wording if the two disagree on "inactive";
   - the gate heads were widened from the six named forms to a superset (`"${H}" gate`, `'$H' gate`, `'${H}' gate` also count).

   Neither could change the outcome: "inactive" needs all three parts under 44 runs, and the oracle and the reviewer, which the gate pattern does not touch, read 87/87, ran and called alike. The six heads alone were not measured.
2. **Interfaces differ from the plan's Task 1 text:**
   - `activity` takes turn texts, not parsed objects;
   - `isTestPath` comes from `bench/lib/replay.mjs`, not `task.mjs`;
   - the control runs and the tasks file are command arguments, because `bench/` names no task;
   - O2 uses `git diff --numstat --no-renames`.

   These are the controller's rulings, recorded in the ledger.
3. **Structural pre-flight before `registered`,** not in the plan. Read from record fields and git hashes only:
   - the 29 tasks' box and floor files;
   - the four control records (run 1, plugin 653af83, at or under their floors; p8b and p6c have no step 13 floor file and read as under);
   - the turn files of the 178 H and W records;
   - one env tree per task.
4. **The approval was typed "Duyêth".** It is quoted as such, read as "Duyệt".
5. **The step 14 lock's own logs (`logs/step14/lock/`) enter this manifest as new files.** They were outside `<data>` while step 14 hashed.

## Known limits

- **Line counts are a coarse distance.** O1 counts calls, not their effect.
- **One H and one W,** the designer's W, checked only against the export diff.
- **The ceiling and floor bars (90%, 10%) and the 15-task bar are the registered ones.** The outcome sits exactly on the 15.
- **Every read of the stick is still an agent's,** and its sensitivity is not validated (step 9 decision).

## Manifest

`bun bench/stick.mjs hash --out <outside <data>>` (2026-11-19, after `diagnose`, with the lock logs held outside `<data>`): 36,158 files (left out: link 47, node_modules 1, store 2,113, secret 8, transcript 911, rewritten 88, special 0). `progress/stick-v1-step15.sha256`, sha256 `eabb180abff9aee609a22cbe8dea683630d05524f71149f086157f7975477b84`.
- **Against `progress/stick-v1-step14.sha256`** with an empty `progress/step15/reasons.tsv`: hashed 36,147, equal 36,147, **changed 0, missing 0, unexplained 0**.
- **New files:** `step15/` (registered, diagnosis, its copy), `logs/step15/` (tests, diagnose output, its copy and exit code) and `logs/step14/lock/`.
- **Self-compare:** before the lock logs moved into `logs/step15/lock/` and again after, hashed 36,158, changed 0.

## Open points

- **What comes next is the user's call.** Section 13 acceptance cannot be reached (H4 not met). Candidates, each needing its own registered plan:
  - 13.3–13.5, as step 14 set them;
  - a task set with room above the ceiling, on which H and W could be compared again;
  - an independent quality measure of H's and W's products.

## Approval

After the advisor's review (wording fixes, no number changed), approved by the user ("Duyệt", 2026-11-19, asked directly); the plan is `stable`. The next step was left to the advisor ("Theo advisor"); its ruling is recorded in `progress/progress.md`.
