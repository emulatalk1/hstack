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

0. **Spec** (not per plan). Required before the first plan of a product; after that, only for a big new feature or a change of direction. A later plan names the spec it builds on.
1. **Start.** Run the unit, integration and e2e suites. Fix any failure before new work.
2. **Plan.** Write the features and their steps. Each step is observable and gets a coverage row: `full`, `partial`, `none`, `manual` or `command`. Two models review the plan before the build (the `review` slot, run on the plan file).
3. **Build.** One task at a time, each with a task review before the next task starts.
4. **Final review.** Two whole-branch reviews on different models, each checked by the advisor.
5. **Mutation check.** Mutate the lines this plan changed that tests cover, by two paths:
   - Lines covered by unit or integration tests: the mutation tool (Stryker on stack A) mutates them and maps each mutant to its covering tests. About 30 seconds a file (141 mutants on one file).
   - Lines covered only by e2e tests (most steps: 27 of 30 sampled `full` rows): a short list of mutants, each run against only that step's e2e test. About 40 seconds each, with the database seeded per run, so the budget buys 25 to 30 of them. The adapter supplies the mutant list or a mutator.
   The test-to-line map comes from the mutation run itself (`coveredBy` and `killedBy` in the tool's report); neither stack has a per-test map without one. On stack A, e2e coverage of the server is per function, not per line, until a converter (v8-to-istanbul or monocart) is added, so "lines e2e covers" means "lines in a function e2e reaches". Browser-code mutants cannot use the tool's switch on stack A: hand mutants only. Stack B needs a preload bridge file (`src/preload/mutant.ts`) so renderer and preload mutants activate; `init` ships it. The coverage file maps each test to its step. A surviving mutant whose covering tests belong to a `full` row makes that row `partial`. Every surviving mutant is logged, so the layer's value can be measured over plans. Budget: 20 minutes. Evidence for this layer is the thinnest; it stays because the user asked for it.
6. **Evaluator.** Its job is the gap e2e cannot cover. It walks no step that a test fully covers. Its constraint checks run on the screens it visits and may repeat an e2e assertion; that is the only overlap left. Two blind evaluators on different models (the manifest sets the models; default two), one after the other. Each one:
   - walks the `partial` and `none` steps of this plan and of earlier plans (one evaluator does the earlier plans), and the `manual` steps of class 2 (git hooks and history) and class 3 (document text);
   - does not walk `full` steps (tests and mutation cover them) or class 4 fault checks (the mutation layer does them);
   - checks the constraints on every screen it opens;
   - does an exploratory pass of up to 10 actions per feature;
   - does no mockup comparison: that is a separate, optional run;
   - writes each finding as a missing test: the behaviour to check and where the test belongs.
7. **Rule and log.** Rule on each UNCLEAR. Every confirmed finding from any layer ends as a test that fails on the old code, plus a coverage row: an e2e test when e2e can reach the case, else a unit or integration test, else a `manual` row. So each evaluator finding closes an e2e gap for the next plan. The progress entry records findings, time and tokens per layer.

## Recurring

**Whole-repo audit.** Run `/ponytail:ponytail-audit` (the user ran it on 2026-10-22). It split the repo into four areas (public forms, leads and emails; access, collections and users; import, seed, cache and pages; harness tools and hooks), one read-only reviewer agent each. They read the code and the installed library source, and ran nothing. Each finding has a concrete case, checked against the code. Decision (2026-10-26): hstack depends on the ponytail plugin for this for now. The 2026-10-22 audit had 13 findings, and all went into plan 9: fixes in the app, fixes in the harness tools, and one known limit.

When to run it: on demand, when the user asks. Each audit run writes one line to the progress log (date, number of findings, report link), and the log shows the plans and days since the last audit, so the user can judge. In the one run so far, the 5 audit bugs with a known start had been in the code for 2 to 13 days.

## Outside skills

Ponytail is easy to replace: it fills one slot (the audit), plus one rule in the harness that keeps `ponytail:` tags out of code comments. Superpowers fills five of the six slots (`spec`, `plan`, `build`, `review`, `finish`) and is replaceable, but its task review and final review found 9 of the 20 bugs, so a swap is a project, not one line. The plan spike that found 1 more is the harness's own method (a scratch clone and `assemble.py`), not superpowers.

The project's manifest names one skill per slot. hstack passes the inputs below and reads only the outputs below; what hstack adds itself is in its own column, so a replacement is held only to what the skill must leave.

| Slot | Default skill | hstack passes | The skill must leave | hstack adds |
|---|---|---|---|---|
| `spec` | `superpowers:brainstorming` | the user's request, the current spec | a spec file (what to build and why) at the path the manifest names; the harness used `docs/design/` | nothing |
| `plan` | `superpowers:writing-plans`, with the harness's spike (a scratch build while the plan is written; hstack carries this method) | the spec, the feature list, the earlier plan | a plan file that names its spec, with numbered tasks and observable steps | the coverage rows |
| `build` | `superpowers:subagent-driven-development` | the plan file | one commit range per task, and per task the ledger lines below | tokens and minutes per task review, from its own agent results: one line per task in the progress log |
| `review` | the SDD final reviewer (`superpowers:requesting-code-review`), once per model | a diff and a review package; used for the final review, and for the plan review on the plan file | findings with severity (Critical, Important, Minor) and file:line | the advisor loop, a confirmed or false verdict per finding, tokens and minutes |
| `audit` | `ponytail:ponytail-audit` | the repo path | the report format in its SKILL.md: numbered findings in Must fix, Should fix and Nice to have, each with file:lines, What this is, Problem, Fix, If we skip it; then Verdict, Lean and Not checked | nothing; hstack folds the findings into the next plan's scope |
| `finish` | `superpowers:finishing-a-development-branch` | the branch | a merged or pull-requested branch | nothing |

The evaluator is hstack's own skill, with the same kind of contract: the brief and its input in, the report sections out.

Today `build`, the final `review` and `finish` are three phases of one SDD run: task loop, final reviewer, delete the workspace, finish the branch. The harness already breaks that run after the final review to insert the evaluators, so splitting it into slots works.

**The pinned ledger format.** The `build` ledger (`.superpowers/sdd/<plan>/progress.md` today) holds these lines, and hstack treats their format as its own:

- `Task <N>: fix round <R>/5 (<X> addressed, <Y> open — <findings>; commits <a>..<b>)`
- `Task <N>: parked — <finding> — Ruling: <why>`
- `Task <N>: complete (commits <a>..<b>, review clean)` or `(…, <K> parked)`

Superpowers deletes the plan's workspace, ledger included, after a clean final review. One of the 20 bugs lost its task-review record this way. hstack copies the ledger into the progress log after the last `Task <N>: complete` line and before the final reviewer starts. A `build` replacement that writes no such lines removes the task-review layer from the log, so the swap check fails.

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

1. The per-project fields of the manifest (spec path, feature list, coverage file, progress log): to settle in the adapter research.

User decisions (2026-10-26): the evaluator covers only what e2e cannot, and its findings become tests; the audit uses the ponytail plugin and runs on demand; the plugin records task-review cost (tokens and time per task).

hstack default, not a user ruling: two evaluator models, set in the manifest.

How this was measured: each replayed bug was applied to the current code, with every test its fix added or changed skipped by title. Evaluators in the replay got the step text from before the fix.
