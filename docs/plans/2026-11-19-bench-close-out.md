---
type: plan
title: "Benchmark close-out plan"
description: "Step 16: close the benchmark with one final report that answers section 1 from what steps 1–15 registered and measured, lists everything left unmeasured, and states what a re-test would need. No new run, no new number, no H − B line."
status: draft
generated: { by: claude-code/2.1.318, at: "2026-11-19T08:39:36+07:00" }
sources:
  - id: prereg
    resource: /plans/2026-10-27-benchmark-prereg.md
  - id: analysis
    resource: /plans/2026-11-18-bench-analysis.md
  - id: diagnosis
    resource: /plans/2026-11-18-bench-h4-diagnosis.md
---

# Benchmark Close-out Plan

> Controller work only (no implementer). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One final report, `progress/final-report.md`, that closes the benchmark. It answers section 1 ("Does the harness produce output that meets the requirement, at higher quality than Claude Code without the plugin, … Which harness layers are worth keeping?") only with what the registered steps measured. It states plainly what was not measured.

**Why now (the advisor's ruling under the user's delegation, "Theo advisor", 2026-11-19, `progress/step15-report.md`):**
- Section 13 acceptance cannot be reached, because H4 is not met.
- 13.3–13.5 cannot change that, and would run past the deadline.
- A task set with room above the ceiling is a new benchmark: new runs, a new lock, and a selection rule blind to the scores now seen. That needs the user's own word.
- A blind H/W rating would likely give a null that cannot be read (step 15's O2 code line shows no difference; the raters' sensitivity is not validated).

**Spec:** prereg sections 1, 2, 12, 13, 15; `progress/step13-lock.md`, `progress/step14-report.md`, `progress/step15-report.md`; `progress/step14/deviations.md`.

## Limits

- No new run, grade, port or analysis.
- No `table.json` read by hand.
- No H − B number: H4 is not met, so H1–H3, real-estate's H − B, pass^k and the feature-missing rate stay unreported, as registered.
- No change to the stick, the arms, the hypotheses or a registered rule.
- Every number in the report is quoted from a locked or approved document, with its source.

## What the final report holds

1. **The answer to section 1, in registered words:**
   - Acceptance (section 13) is **not reached**, since item 2 (H4) is measured and not met. Items 3–5 are unmeasured and item 6 is tracked only.
   - **"Higher quality than without the plugin":** not answered, because the guard H4 failed and H1–H3 are not reported.
   - **"Which layers are worth keeping":** for the three parts W removes, the stick scored no difference. The diagnosis found that they ran in every H run, but 15 of 29 tasks gave the stick no room ("little room"). So the benchmark does not show that they are worth keeping, and does not show that they are not.
   - **H5 (secondary, met):** H's suites caught 0.717 of the applicable seeded bugs, 95% [0.608, 0.818], with its two caveats (the rule was written after the counts; one porter draw per bug).
2. **Cost**, as step 14 reported it: tokens and minutes per run per arm. It decides nothing.
3. **The stick, as registered:**
   - not validated;
   - every read is an agent's;
   - the 7.3 canary failed and its extension passed;
   - the 7.3 trigger candidate is still open;
   - the 7.2 gate is one model against raters of another.
4. **Unmeasured or not reported,** each with the registered reason:
   - 13.3–13.5 and item 6;
   - H5's mutation score;
   - the per-layer measures and discovery replays of 8.4;
   - H1–H3;
   - real-estate's H − B, pass^k and the feature-missing rate.
5. **Deviations:** the counts per source from `progress/step14/deviations.md`, plus step 15's five.
6. **What a re-test would need,** a proposal only, started if the user asks:
   - a task set chosen by a rule fixed before any H or W score on it is seen, with room above the ceiling, for example by B's score or a reference score from a separate pilot;
   - H and W rerun on it with the locked arms;
   - H4 registered again before any run;
   - a stick sensitivity check that a human reads.

## Tasks

### Task 0: Register

- [ ] **Step 1:** After the user's approval, add "Applied at step 16 (<date>)" to prereg section 12. It is the close-out: no new computation, and the report quotes only locked or approved numbers. Add a line to `docs/log.md`, then commit.

### Task 1: The report

- [ ] **Step 1:** Write `progress/final-report.md` per "What the final report holds". Give every number its source document and line.
- [ ] **Step 2:** Check each quoted number against its source by script (grep the number in the source). The check fails on any number not found.
- [ ] **Step 3:** Run `stick compare progress/stick-v1-step15.sha256`. Expected: changed 0, since nothing under `<data>` changes in this step.

### Task 2: Review and approval

- [ ] **Step 1:** Advisor review. Then ask the user for approval. On approval, this plan becomes `stable`, the branch is merged and pushed, and the benchmark is closed.

## Known limits

- The report adds no evidence. It is only as strong as steps 1–15.
- The re-test section is a proposal, not a registered plan.
