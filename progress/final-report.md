# Final report: the hstack benchmark

Plan: [benchmark close-out plan](../docs/plans/2026-11-19-bench-close-out.md), registered in the prereg's section 12 ("Applied at step 16"). This report computes nothing. Every number is quoted from the locked or approved document named in brackets after it:
- [S14] `progress/step14-report.md`
- [S15] `progress/step15-report.md`
- [DEV] `progress/step14/deviations.md`
- [PRE] `docs/plans/2026-10-27-benchmark-prereg.md`

## The question

Section 1 [PRE]: "Does the harness produce output that meets the requirement, at higher quality than Claude Code without the plugin, with few human interventions, measured by a hidden oracle the harness cannot read? Which harness layers are worth keeping?"

## The answer

- **Section 13 acceptance: not judged.** This is the registered wording while items 3–5 are unmeasured (step 14 ruling 11) [S14]. Item 2, "H4 is met", is measured and **not met**, so acceptance cannot be reached, whatever items 3–5 would show. Item 6, the 30-day handover count, is tracked only.
- **"Meets the requirement, at higher quality than Claude Code without the plugin": not answered.** Both clauses rest on the H − B lines (H1, H2), which sit behind H4. H4 is the guard for the stick. On the 29 external tasks, H − W on build + requirement has mean −0.0048, 95% bootstrap [−0.0775, 0.0588] [S14]. The registered consequence applies: "if H4 is not met, H1–H3 are not reported (the stick cannot tell a weak harness apart)" [PRE]. H1, H2, H3, real-estate's H − B, pass^k and the feature-missing rate are therefore not reported.
- **"Which harness layers are worth keeping":**
  - **The three parts W removes** are the independent oracle, the reviewer in its own context and the gate. H4 is not met, and the same consequence applies: the stick cannot tell a weak harness apart.
  - **The diagnosis** [S15] found that these parts ran in all of H's 87 standing runs, and in none of W's. Its positive control found every part in all four trial runs.
  - **But the stick had little room to move.** 15 of the 29 tasks sit at the ceiling (13) or the floor (2) in both arms, exactly the registered bar for "little room". On 20 tasks the arm means tie exactly, so at least 5 of the 14 tasks with room also tie.
  - **What the benchmark cannot say:** whether these parts are worth keeping. The per-layer measures of section 8.4 were never taken.
- **H5 (secondary, reported on its own): met.** The suites H wrote caught 137 of the 191 applicable seeded bugs, a rate of 0.7173, 95% [0.6080, 0.8182], against a bar of 0.5 on the lower bound [S14]. Two caveats come with it:
  - the interval rule was written after these counts were seen;
  - each bug had one porter draw, and the interval does not hold the porter's variance.
- **Human interventions (H3): not reported.** H3 sits behind H4 [S14].

## The runs

There were 315 standing runs on `claude-opus-5-5` with CLI 2.1.318 [S14]:
- **External:** H, B and W, 87 runs each (29 tasks × 3).
- **Real-estate:** H and B, 27 runs each (9 tasks × 3).

H is hstack 653af83 and W is 9c4b267, the designer's removal-only variant of H. B has no plugin. Each record carries its arm's plugin as locked [S14].

## Cost (decides nothing)

Tokens are input plus output, per run. Minutes are per run, from two lanes, so they are not comparable with the trial's single-lane minutes [S14].

| set | arm | runs | tokens per run | minutes per run |
|---|---|---|---|---|
| external | H | 87 | 27,882 | 32.4 |
| external | B | 87 | 10,234 | 8.0 |
| external | W | 87 | 29,508 | 25.2 |
| real-estate | H | 27 | 98,441 | 98.4 |
| real-estate | B | 27 | 76,702 | 76.4 |

## The stick, as registered

The stick is **not validated** [S14]:
- **Every read is an agent's.**
- **The 7.3 canary failed as registered:** mean `d` 0.400 with Sonnet B− and 0.428 with Haiku B−.
- **The extension registered after that failure passed** on a bootstrap lower bound of 0.057, while its t interval [−0.006, 0.627] crosses 0.
- **The 7.3 trigger candidate is still open.** The agent reader read B− as visibly worse on s3-01 and s3-02, and no human has read the pairs.
- **The 7.2 gate measured one model against two raters of another.**
- **H4 was registered as the guard for exactly this weakness,** and H4 is not met.

## Not measured or not reported

| item | why |
|---|---|
| H1, H2, H3, their Holm step-down; real-estate's H − B; pass^1, pass^3; feature-missing | H4 not met (registered consequence) [S14] |
| 13.3 rerun, 13.4 cold setup, 13.5 blind rating | moved to step 15 by step 14 decision 1 (a), then superseded by the close-out (step 16) |
| 13.6, the 30-day handover count | tracked, no threshold |
| H5's mutation score | step 13 decision 4 (a) [S14] |
| section 8.4's per-layer measures and discovery replays | step 13 decision 5 (a) [S14] |

## Deviations

- **`progress/step14/deviations.md`** lists 90 items by step, each with its source, and counts them per source [S14, DEV]; this report points to it and does not repeat the table.
- **Step 15's five** are in its report [S15]:
  1. the tool's readings, registered after review;
  2. interfaces that differ from the plan text;
  3. a structural pre-flight;
  4. the approval typed "Duyêth";
  5. step 14's lock logs entering the manifest.
- **The close-out's own deviation:** it supersedes step 14's decision 1 (a) ("Để bước 15") and step 15's limit that 13.3–13.5 wait behind it. The user approved this ("Duyệt plan kết thúc", 2026-11-19, asked directly).

## Known limits

The known limits of the step 14 and step 15 reports stand [S14, S15]. This report adds no evidence; it is only as strong as steps 1–15.

## What a re-test would need (a proposal; not registered)

- **A new task set with room above the ceiling.** It is chosen by a rule fixed before any H or W score on it is seen, judged from a separate pilot on those new tasks. Nothing comes from this benchmark's `table.json` or its sealed scores.
- **H and W run again on it** with the locked arms, and H4 registered again before any run.
- **A check of the stick's sensitivity that a human reads,** so that a null cannot be read as "the stick does not see" again.
- **For "which layers are worth keeping":** the per-layer measures of section 8.4, or an independent quality measure of the products, each under its own registered plan.

## Lock

Nothing under `<data>` changes in this step. `stick compare progress/stick-v1-step15.sha256` (2026-11-19, before approval): hashed 36,158, equal 36,158, **changed 0, missing 0, unexplained 0**. Number check: `progress/step16/number-check.tsv` lists each figure quoted here with its named source; one script run requires each figure in both this report and that source (`grep -F`), and its result is `progress/step16/number-check.out`: 40 of 40 found in both. A match shows the figure appears in both files, not that it is used in the same sense; short figures (13, 15, 20, 0.5) were also read in context by the controller.

## Approval

Waiting for the user's approval after the advisor's review.
