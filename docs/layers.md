# hstack layers

What the plugin runs for each plan, and why. Evidence: 20 real bugs from the real-estate build (`.evidence/`, local only).

## Evidence

Who found each bug first, from the written record (18 stated, 2 inferred):

| Finder | Bugs |
|---|---|
| Whole-repo audit (run once, on 2026-10-22, over the code of about 9 plans) | 8 |
| Task review | 6 |
| Final review (Opus 2, Sonnet 1) | 3 |
| Evaluator (Opus) | 2 |
| Plan-writing spike (a scratch build while the plan was written) | 1 |

What catches each bug when it is replayed with every test its fix added or changed removed:

| Layer | Caught |
|---|---|
| Unit + integration tests | 1 of 20 |
| e2e tests | 0 of 15 |
| Evaluator with a pilot brief close to step 6 (no `manual` steps, no earlier-plans walk), blind | 1 of 14 |
| Mutation testing | flags the bug lines for 1 of 4 unit-level bugs |

The tests missed these bugs because no existing test asserted the case. Review found them. The plugin keeps every layer, but spends most effort on review.

Recorded cost: a final review of plan 10 took 140k tokens and 3 minutes (Sonnet) and 175k tokens and 10 minutes (Opus). A plan review takes 300k to 360k tokens. An evaluator run with the old full step walk takes about 240k tokens and 25 minutes; the pilot brief took about 100k tokens and 8 minutes for two features. Task review cost is not recorded.

## The loop for one plan

1. **Start.** Run the unit, integration and e2e suites. Fix any failure before new work.
2. **Plan.** Write the features and their steps. Each step is observable and gets a coverage row: `full`, `partial`, `none`, `manual` or `command`. Two models review the plan before the build.
3. **Build.** One task at a time, each with a task review before the next task starts.
4. **Final review.** Two whole-branch reviews on different models, each checked by the advisor.
5. **Mutation check.** Mutate the lines this plan changed that tests cover, by two paths:
   - Lines covered by unit or integration tests: the mutation tool (Stryker on stack A) mutates them and maps each mutant to its covering tests. About 30 seconds a file (141 mutants on one file).
   - Lines covered only by e2e tests (most steps: 27 of 30 sampled `full` rows): a short list of mutants, each run against only that step's e2e test. About 40 seconds each, with the database seeded per run, so the budget buys 25 to 30 of them. The adapter supplies the mutant list or a mutator.
   The coverage file maps each test to its step. A surviving mutant whose covering tests belong to a `full` row makes that row `partial`. Every surviving mutant is logged, so the layer's value can be measured over plans. Budget: 20 minutes. Evidence for this layer is the thinnest; it stays because the user asked for it.
6. **Evaluator.** Two blind evaluators on different models, one after the other. Each one:
   - walks the `partial` and `none` steps of this plan and of earlier plans (one evaluator does the earlier plans), and the `manual` steps of class 2 (git hooks and history) and class 3 (document text);
   - does not walk `full` steps (tests and mutation cover them) or class 4 fault checks (the mutation layer does them);
   - checks the constraints on every screen it opens;
   - does an exploratory pass of up to 10 actions per feature;
   - does no mockup comparison: that is a separate, optional run.
7. **Rule and log.** Rule on each UNCLEAR. Every confirmed finding from any layer ends as a test that fails on the old code, plus a coverage row. The progress entry records findings, time and tokens per layer.

## Recurring

**Whole-repo audit.** The 2026-10-22 report has the shape of the `ponytail-audit` skill (Must fix, Should fix, Nice to have, Lean, Not checked), and the log says four read-only reviewers ran it. They read the whole repo and the installed library source, and ran nothing. Each finding has a concrete case, checked against the code. hstack runs this skill, so it either depends on the ponytail plugin or carries its own copy of the brief. The 2026-10-22 audit had 13 findings, and all went into plan 9: fixes in the app, fixes in the harness tools, and one known limit.

When to run it: the 5 audit bugs with a known start were added between 2026-10-09 and 2026-10-20 and stayed until the audit. Run it every 3 plans and before a release.

## Per stack (the adapter)

The loop is the same for every stack. The project's manifest names these parts:

- the commands for unit, integration and e2e tests, and how to run one test by title;
- how to collect coverage per test;
- the mutation tool and how it takes a list of files or lines;
- how to start and stop the dev server, and its port;
- how to reset and seed the dev database, and the one database name that may be dropped;
- the evaluator's browser helpers (log in, open a page).

Stack A: Next.js + Payload + Postgres + Vitest + Playwright. Stack B: Electron + electron-vite + npm + Vitest + Playwright (the qas v2 app in daily-routine, first plan written 2026-10-26). The adapter research fills in each part.

## Safety rules

- An agent may drop only the database the manifest names. Never `docker compose down`, never stop shared containers.
- Stop a server only after checking that its working directory is inside the project.

## Open questions

1. Whether two evaluator models stay. The record says they find different defects (5 shared of 69). The pilot was too small to compare them.
2. Whether the whole-repo audit runs every 3 plans, or on a size trigger (for example, after a set number of changed lines).
3. Whether hstack depends on the ponytail plugin for the audit, or carries its own copy.
4. Task review cost: the plugin records it, so the layer can be compared with the others.

How this was measured: each replayed bug was applied to the current code, with every test its fix added or changed skipped by title. Evaluators in the replay got the step text from before the fix.
