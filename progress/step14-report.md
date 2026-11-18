# Step 14 report: the analysis

Prereg section 12 step 14: "Grade and analyse exactly per sections 9–10; report every deviation from this plan." Plan: [analysis plan](../docs/plans/2026-11-18-bench-analysis.md). Rulings registered in the prereg's section 12, "Applied at step 14" and "Amended at step 14 (the tool's readings)", before any score was opened.

## The question

Section 1: "Does the harness produce output that meets the requirement, at higher quality than Claude Code without the plugin, with few human interventions, measured by a hidden oracle the harness cannot read? Which harness layers are worth keeping?"

## Result in one paragraph

**H4 is not met.** On the 29 external tasks, the build + requirement score of H minus W (the designer's removal-only variant of H) has mean −0.0048, 95% bootstrap interval [−0.0775, 0.0588]. The stick did not score H above W. By the registered rule ("if H4 is not met, H1–H3 are not reported (the stick cannot tell a weak harness apart)"), H1, H2 and H3 are not reported. Nor are real-estate's H − B, pass^k or the feature-missing rate. Section 13's acceptance is **not judged**, the registered wording while items 3–5 are unmeasured (ruling 11). But its item 2 ("H4 is met") is measured and not met, so acceptance cannot be reached, whatever items 3–5 would show. **H5 is met** (secondary, reported on its own): the suites H wrote caught 137 of the 191 applicable seeded bugs, rate 0.717, 95% interval [0.608, 0.818] against a threshold of 0.5 on the lower bound. Two caveats sit beside it: the interval rule was written after these counts were seen, and the interval does not hold the porter's variance (one draw per bug).

## How it ran

| step | when (2026-11-18) | evidence |
|---|---|---|
| plan approved by the user ("Duyệt"; decision 1 (a), "Để bước 15") | before Task 0 | `docs/plans/2026-11-18-bench-analysis.md` |
| rulings registered | a310c9e | prereg "Applied at step 14" |
| tool built on synthetic rows: Task 1 had a task review; Task 2 was covered by the final review on the most capable model (0 critical, 3 test gaps); the fix rounds (2045ce2 for Task 1's minor findings; e1d2bb1 closing the test gaps, with one code line, a refusal) were checked by the controller | b874e28, 2045ce2, 896ab62, 876e48a, e1d2bb1 | `.superpowers/sdd/2026-11-18-bench-analysis/` (ledger, reports, `final-review.md`) |
| the tool's own readings registered | da3df20 | prereg "Amended at step 14 (the tool's readings)" |
| suite | before `registered` | `<data>/logs/step14/tests-2.out`: 707 pass, 65 skip, 0 fail (the two `done grade=ok` lines are as in step 13's `tests-3.out`) |
| `<data>/step14/registered` | 15:03:22Z | `{ "plan": "da3df20", "tool": "e1d2bb1" }` |
| `scored.mjs table` once | exit 0 | `table 315 runs`; `logs/step14/table.out` |
| `scored.mjs analyse` once | exit 0 | `logs/step14/analyse.out` (copy `analyse-1.out`), `step14/analysis.json` (copy `analysis-1.json`) |

Command: `bun bench/scored.mjs analyse progress/stick-v1/tasks-step11.tsv --h5-drop sb-s2-07-4 --expect '{"noresult":["s1-03 H-1","s1-03 W-3","p8e B-2"],"unscored":[],"caught":137,"miss":54}'`. Both integrity lines read `ok`: no unscored run, the three `noresult` runs exactly the lock's, the H5 sums exactly the lock's. Nothing was rerun. Before `analyse` printed, no one opened `table.json`, a grade or a score. Since H4 is not met, `table.json` stays unopened by hand. The H − B numbers it could yield are not reported. `step14/analysis.json` holds only `args`, `at`, `cost`, `ends`, `h4`, `h5` and `integrity`: no withheld part was written (ruling 5).

**The arms differed as locked:** across the 315 standing records, every H run carries `hstack` 653af83 (sha256 `727d6781…`, 114 runs), every W run `hstack` 9c4b267 (sha256 `03b4fd12…`, 87), and every B run no plugin (114). This matches `arms.json`. Record fields only were read.

## The runs (from `progress/step13-lock.md`)

315 standing runs, `claude-opus-5-5`, CLI 2.1.318. External: H, B and W, 87 runs each (29 tasks × k = 3). Real-estate: H and B, 27 each (9 tasks × 3). Three `noresult` products (all-`error` grade timeouts) are scored as their final grades gave (step 13 ruling 4). Their effect is shown on the "without noresult" line.

## H4 (the gate)

| line | tasks | mean | 95% bootstrap | t interval | met |
|---|---|---|---|---|---|
| H4 score H − W (build + requirement) | 29 | −0.0048 | [−0.0775, 0.0588] | [−0.0778, 0.0682] | **no** (lower bound ≤ 0) |
| same, without the `noresult` runs | 29 | −0.0034 | [−0.0764, 0.0605] | | decides nothing |
| H4 build H − W | 29 | −0.0074 | [−0.0649, 0.0369] | [−0.0613, 0.0465] | decides nothing |
| H4 requirement H − W | 29 | 0.0026 | [−0.0225, 0.0260] | [−0.0230, 0.0282] | decides nothing |

The interval [−0.0775, 0.0588] is narrow and centred on 0. W is H with the three parts of section 3 removed, as the designer stated (step 12 lock: "that W removes exactly section 3's three parts is the designer's statement, not checked by the controller"). H4 cannot tell apart two readings: either the stick does not see what those parts do, or those parts do not change the scored output. The prereg settles which consequence follows. H4 is the guard, so H1–H3 are not reported.

## H5 (secondary, reported on its own)

| line | tasks | caught | miss | rate | 95% bootstrap |
|---|---|---|---|---|---|
| pooled (decides) | 30 | 137 | 54 | 0.7173 | [0.6080, 0.8182] **met** (lower ≥ 0.5) |
| external | 23 | 121 | 49 | 0.7118 | [0.5896, 0.8208] |
| real-estate | 7 | 16 | 5 | 0.7619 | [0.4762, 0.9524] |
| pooled without sb-s2-07-4 | 30 | 134 | 54 | 0.7128 | [0.5979, 0.8142] |

Beside them: not applicable 82, refused 15, not ready 0, no suite 0, 288 bugs in all. Eight tasks have no caught or missed bug and add nothing: p2, p8c, s1-10, s1-11, s2-09, s3-01, s3-05, s3-09. The mutation score is not measured. Each bug had one porter draw. In the store-overlap rerun, 2 of 6 re-ported bugs moved from not applicable to caught on a fresh draw. The rate therefore carries porter variance that this interval, over tasks, does not show.

## Cost and ends (every standing run, deciding nothing)

| set | arm | runs | tokens per run (input + output) | minutes per run |
|---|---|---|---|---|
| external | H | 87 | 27,882 | 32.4 |
| external | B | 87 | 10,234 | 8.0 |
| external | W | 87 | 29,508 | 25.2 |
| real-estate | H | 27 | 98,441 | 98.4 |
| real-estate | B | 27 | 76,702 | 76.4 |

End reasons: every run ended `done`, except one external B run that ended `no DONE`. Minutes come from two lanes and are not comparable with the trial's single-lane minutes.

## Not reported, not measured

- **Not reported (H4 not met):** H1, H2, H3 and their Holm step-down; real-estate's H − B; pass^1 and pass^3; the feature-missing rate.
- **Not measured:** H5's mutation score (step 13 decision 4 (a)); the per-layer measures and discovery replays of section 8.4 (step 13 decision 5 (a)); section 13 items 3–5, the rerun, the cold setup and the blind rating (decision 1 (a), a step 15 plan); item 6, the 30-day handover count.

## The stick, as registered

Stick v1 is locked; its sensitivity is **not validated** (step 9 decision, item 8). The section 7.3 trigger candidate is still **open**: the agent reader read B− as visibly worse on s3-01 and s3-02, against the controller and the advisor, who found it not worse. No human has read the pairs (prereg, "User decision on the step 8 stick"). The section 7.3 canary failed as registered (mean `d` 0.400 with Sonnet B−, 0.428 with Haiku B−). The extension registered after that failure passed on a bootstrap lower bound of 0.057, while its t interval [−0.006, 0.627] crosses 0. The stick was validated by agents only. The 7.2 gate measured one model (`claude-fable-5-1`) against two raters of another (`claude-opus-5-5`). H4 was registered as the guard for exactly this weakness, and H4 is not met.

## Deviations

`progress/step14/deviations.md` lists 90 items, by step, each with its source, and gives counts per source against its grep. Step 14's own:
- the H5 counts and the three `noresult` runs were seen before their rules were written (both rules follow a precedent);
- H5 is one porter draw per bug;
- the mutation score and the per-layer measures are not measured;
- 13.3–13.5 are moved to step 15;
- the tool's seven readings were registered after review and before `registered`;
- the prompts the user gave the plugin-design session are not collected here. What the controller sent to the designer is in `progress/step11-lock.md` ("What went to the designer") and `progress/step12-lock.md` ("The designer").

The prereg calls the step 9 gate consequences deviations, while `progress/step9-lock.md` (deviation 10) calls them open rulings. Both are listed.

## Known limits

Section 15's limits stand. Also:
- every read of the stick is an agent's;
- H4 compares H with W as the designer built W, unchecked;
- the two-lane minutes;
- the store-overlap rerun;
- H5's single porter draw;
- `noresult` products score their timed-out grades;
- the real-estate set is secondary, one stack, and leans to the old harness's misses.

## Open points (for the user)

- **What step 15 is for, now that H4 is not met.** Section 13 items 3–5 would measure a harness whose acceptance cannot be reached at item 2. Any change to the stick, to W or to the hypotheses after this result needs its own registered plan, and this report proposes none.
- **The design session's prompts:** whether they are added to this report from the design session's transcript.

## Manifest

`bun bench/stick.mjs hash --out <outside <data>>` (2026-11-18, after `analyse`, with `logs/step14/lock/` held outside `<data>`): 36,147 files (left out: link 47, node_modules 1, store 2,113, secret 8, transcript 911, rewritten 88, special 0). `progress/stick-v1-step14.sha256`, sha256 `9df12a13215b8ed857f22bd35b0cb94a615130d1654d0f58d8eee18baea2e27b`. Against `progress/stick-v1-step13.sha256` with an empty `progress/step14/reasons.tsv`: hashed 36,128, equal 36,128, **changed 0, missing 0, unexplained 0**. The new files are `step13/table.json`, `step14/` and `logs/step14/`. Self-compare and second self-compare: changed 0 (`logs/step14/lock/`).

## Approval

Pending the user's approval.
