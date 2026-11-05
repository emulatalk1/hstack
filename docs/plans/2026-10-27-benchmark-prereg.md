---
type: plan
title: "Measuring stick: pre-registration plan (Part 1)"
description: "Hypotheses, task set, oracle, validation, task and run counts, cost and acceptance thresholds of the benchmark that measures the hstack harness, registered before any run."
status: stable
generated: { by: claude-code/2.1.310, at: "2026-10-27T09:10:00+07:00" }
verified:
  - { by: claude-code-advisor/2.1.310, at: "2026-10-27T10:40:00+07:00" }
  - { by: human:emulatalk1, at: "2026-10-27T10:41:18+07:00" }
sources:
  - id: layers
    resource: /design/2026-10-26-layers.md
---

# Measuring stick: pre-registration plan (Part 1)

This plan is committed **before** any scored run. After the lock (section 12), any change to a hypothesis, measure, threshold, task set or k is a new commit with its reason, and the final report lists every such change.

The customer's raw data (plans, tests, patches, filtered inputs, oracles) lives in `.evidence/bench/` (gitignored). The scripts live in `bench/` of this repo; they take repo paths as arguments and hold no customer data. `bench/` is not plugin content.

## 1. Question

Does the harness produce output that meets the requirement, at higher quality than Claude Code without the plugin, with few human interventions, measured by a hidden oracle the harness cannot read? Which harness layers are worth keeping?

Not measured here: typing speed, UI polish beyond what the oracle checks, infrastructure cost beyond tokens and hours.

## 2. Hypotheses and thresholds (pre-registered)

Every comparison is paired on the same task, with a 95% confidence interval (section 10). "Met" means the lower bound of the interval clears the threshold, not the point estimate.

| ID | Hypothesis | Measure | Acceptance threshold | Set |
|---|---|---|---|---|
| H1 | The harness builds the stated requirement better than the baseline | build score (9.1) of H minus B | lower bound > 0 **and** point estimate ≥ 0.10 | external tasks |
| H2 | The harness raises spec edges the requirement does not state | requirement score (9.1) of H minus B | lower bound > 0 | external tasks |
| H3 | Autonomy is high enough | interventions per task of H (9.3) | upper bound ≤ 1.0, and H − B upper bound ≤ 0.5 | external tasks |
| H4 | The measuring stick discriminates | build + requirement score of H minus W (weak variant) | lower bound > 0 | external tasks |
| H5 | The test suite the harness writes guards | seeded-bug catch rate of that suite; mutation score on changed lines | seeded catch rate lower bound ≥ 0.5 | external tasks + `real-estate` |

Floor rule for H1 (pre-registered): once every task's checks are classified with the interface sheet (section 12, step 6), if the median number of **traceable** checks per task is below 5, H1's build score no longer comes from the fix-commit oracle but from a **step oracle**: the task's own tests for its feature steps (a `real-estate` plan names one test per step; for external tasks, the FAIL_TO_PASS tests the classifiers mark traceable), rewritten black-box per 6.2, at most 15 per task chosen by seed, validated to pass on the task's end product and fail at the task base. All fix-commit checks then score H2. H1's threshold stays.

**Applied at step 6 (2026-11-05).** The counts are those of the step 5 lock (`progress/step5-lock.md`), and the [step oracle plan](/plans/2026-11-05-bench-step-oracles.md) registers here its decision and its rulings before any step oracle is built. Counts are taken from `labels.json` of every kept task: scored checks (not `dropped`, interface not `none`, verdict `valid` or `absent-at-base`) agreed `traceable`, split rounds included.

- **Decision.** The floor rule applies, now and after step 9. External set, 24 tasks, sorted per-task counts `0,0,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,3,4,4,4,5,5,9`, median 2 (the 12th and 13th values); with all 9 disputed classifications flipped to `traceable`, `0,0,1,1,1,1,1,1,1,1,1,2,2,2,3,3,3,3,4,5,5,6,7,10`, median still 2. Real-estate set, 14 kept tasks: twelve 0s, 1 and 4, median 0; with all 11 disputed classifications flipped to `traceable`, `0×7, 1×4, 2, 4, 6`, median 0.5 (the 12 disputed source pairs sit in 6 tasks, so at most 6 of 14 could reach 5). p8b is trial-only and in neither count. Step 9 cannot raise either median to 5. So H1's build score comes from the step oracle and every fix-commit check scores H2. For an external task the floor rule adds no check: its step oracle is a subset of the checks the classifiers already call `traceable` (the external oracle is the PR's tests), and the only change there is that H2 counts every fix-commit check. For `real-estate` the step oracle is a new source.

Rulings, in the style of 7.1:

1. **Scope.** External: the 24 kept tasks of `<data>/ext/sample.tsv`. Real-estate: the 14 kept tasks and p8b. p8b is trial-only, but the trial run (section 12, step 11) measures σ_d of the build score on p8b, and that score now comes from a step oracle. Retired ids (s1-08, s2-04, s2-06) and p8b1 get none.
2. **External step oracle.** The candidates are the task's scored checks labelled `build` in `labels.json` whose origin test is a fail-to-pass case of `ext/sealed/<slug>/f2p.json`. The origin is decided for every scored check, whatever its label, and the `build` filter applies only when the ids are chosen, so the resolver's prompt is the same when step 10 runs `step` again after step 9 moves labels. A tool decides the origin with `f2pOf`: (a) the origin's test name (after its first `::`) equals a case name, or a case id ends with it after `::` or `.`: `f2p`; (b) otherwise both sides are cut to a last segment (a trailing `[…]` or `(…)` is stripped, then the last piece after `::`, `.`, `/`, ` > ` or ` › `): if that segment is among the fail-to-pass segments only, `f2p`; if among the pass-to-pass segments only, `p2p` and the check is out; (c) anything else is `ask`: one sealed resolver per task with an `ask` reads those origin tests at the end commit and both case lists, never the check, and answers `f2p`, `p2p` or `unknown`; only `f2p` is kept. No rewrite and no new validation are needed: step 5 validated these checks `--validate <end> --bad <base>`, which is the floor rule's "pass on the end product and fail at the task base". The ids are ordered by `queuePick(ids, 15, seed)`, seed `hstack-bench-2026-10-27`; no task has more than 9 candidates, so the cap binds nowhere today. Step 10 runs `step` again after step 9 settles the disputed classifications.
3. **Real-estate step source.** The source is the test each feature step names in the time-correct plan text, `<task>/filter-source.md` (the file the step 3a filter read; for p1–p6c it holds the plan and its feature-list entries). Only steps of features the filtered input keeps are listed; a feature group the filter dropped (a fix of an earlier plan) has no step check. One sealed lister per task lists `[{ step, file, title }]`, reading `filter-source.md` and `input.md` in its prompt and the files of the end commit (`--at <end>`). The tool resolves each title at the end commit: it must appear verbatim (`git grep -F`) in a file `isTestPath` accepts; the named file wins when it matches, otherwise exactly one test file must match, anything else is `unresolved`. Candidates are deduplicated by `<file>::<title>`. `queuePick` over `<task>:<file>::<title>` takes the first 15 before any writing ("at most 15 per task chosen by seed"). A selected test whose check ends `weak`, `broken`, `error` or `interface: none` is out with no replacement.
4. **Real-estate rewrite (6.2).** One sealed writer per task at the end commit writes the step checks, with `briefs/oracle-re.md` (the step 5 rules: scaffold, public interface, `PRECONDITION:`, severity) headed by `briefs/step-re.md`. It sees the selected tests with their file at the end, and the scaffold. It never sees the step text, the input, a fix commit or the fix-commit oracle. Ids are `<end7>-T<n>`, numbered after the highest number of that prefix in every `<data>/*/oracle/` and `<data>/*/step/oracle/` manifest (the ends of p2, 5eced48, and p7b, 3137149, are also step 5 source commits). Entries are `{ id, fix_commit: <end>, task, step, origin: "<file>::<title>", behaviour, interface, severity }`. The writer gates of step 5 ruling 9 apply (`judge`: id, fields, severity, kinds, file, imports, leak); an empty or all-`none` manifest is rerun once and the second run stands.
5. **Real-estate validation.** `grade env/real-estate.json <task>/step/oracle --validate <end> --bad <base> --sealed --reuse`, with no `--base`. A pass at the end with a fail or precondition at the base is `valid` or `absent-at-base`; a pass at both is `weak`; any other result is `broken`. A base without the task file's `appFile` (p1's 691a723) is not run: every check's bad result is `precondition`, the step 5 no-app ruling applied to the bad version. `broken` checks get the fixer and comparer rounds of ruling 11 (`step/work/fix-<r>/`). A step check is scored when it is `valid` or `absent-at-base`. Real-estate step checks are not classified, because the classifier filter of this section names external tasks only: `step/labels.json` labels every scored step check `build`.
6. **Layout.** A real-estate task gets `<task>/step/` with `oracle/`, `labels.json`, `validation-<end7>.json`, `grades/`, `logs/`, `work/` and `steps.json` (the resolved candidates). Every task gets `<task>/step.json` = `{ oracle: "oracle" | "step/oracle", ids, candidates, seed }`. The f2p decisions of an external task go to `<task>/step-f2p.json` (`[{ id, by: "exact"|"segment"|"resolver", verdict }]`). Nothing of the step 5 lock changes (`oracle/`, `labels.json`, `agreement.json`, `validation-*.json`, `step9/*` keep their hashes), except p8b's classification files (ruling 8).
7. **Scoring under the floor rule.** `floorScore` is the one rule that steps 7, 8, 11, 13 and 14 use; weights are high 3, medium 2, low 1. H1 build is the weighted pass share over `step.json` `ids`, read from the grade of `step.json`'s oracle at that commit. H2 requirement is the weighted pass share over every check in the grade of the fix-commit oracle that is not in its `excluded` list, whatever its label (`build`, `requirement`, `partly` and disputed checks included): "all fix-commit checks then score H2", so step 9 changes only which external checks are in H1. Task passed means every high and medium step check passes (9.1, literally); a task whose step checks are all `low` passes on that clause alone, and the lock reports how many such tasks there are. A task with no step id has no H1 score (`null`). `grade`'s printed `build=` is not H1 once the floor rule applies.
8. **p8b reclassification (section 12 step 6, section 14).** The trial's `classify-1.json` and `classify-2.json` move to `p8b/superseded/` (the tool would overwrite them). Then `oracle classify env/real-estate.json p8b` runs under ruling 15 and the step 5 reading gate, over p8b's 9 scored checks: its step 2 validations stand, all 9 are `absent-at-base`, and the 8 `pre-existing` checks stay recorded under ruling 12. An agreed `partly` stays `partly` with no split, because the pilot oracle's checks share files that import a helper the writer rules refuse, so no split could pass the gates. p8b's labels feed no score under ruling 7. κ, raw agreement and AC1 are reported next to section 14's trial numbers (κ 0.44, raw 0.88, AC1 0.87).
9. **Step 9 additions.** Two new files go in `<data>/step9/`: `p8b-classify.tsv` holds p8b's disputed ids; `sample-7.1-step.tsv` holds 10 scored real-estate step checks by `queuePick` (rewritten checks the 7.1 read has not sampled; external step checks already belong to the 7.1 pool). `oracle queue` is not run again: p8b now has an `agreement.json`, and a rerun would reshuffle the locked step 9 samples.

Decided by the user on 2026-11-05, option 1 (the proposal of the step oracle plan): **H1 on fewer than 24 external tasks.** s1-01 and s3-01 have no `traceable` check and no disputed one, so their step oracle is empty and H1 has no score for them; that leaves 22, or fewer if the resolver sends a task's only candidate out. H1's N counts only tasks with a non-empty step oracle. When step 11 recomputes N (section 10.2), the walk of ruling 14 of step 4 continues until that count meets N, which is at least 24; the added tasks go through the step 5 pipeline and the step 6 `step` command. Consequence: they arrive after step 7 and the stick v1 lock (step 10), so each needs its seeded bugs (step 7) run then and the lock amended. The N rule already foresees tasks added at step 11 with exactly these consequences, and a σ_d above 0.25 would send the walk on anyway, so one walk covers both. s1-01 and s3-01 stay for H2–H4.

Registered before any step oracle is built; `bench/oracle.mjs step` has not run.

Added 2026-11-05, during the step 6 build; the user approved the build on 2026-11-05. These are the rulings that change how a step check is chosen, judged or scored, each with its reason.
- f2p matcher: an origin whose name matches exactly in both the fail-to-pass and the pass-to-pass list is `ask` (resolver), and one that matches exactly only in the pass-to-pass list is `p2p`, because ruling 2's exact rule names only the fail-to-pass side and the symmetric reading only drops a check.
- Reading gates: a resolver or lister run whose record shows no `Read` call is rerun once as `-2` and the rerun stands, the content-independent gate of the step 5 labellers and raters; no further rerun or brief change after the gate, because changing the measure after seeing its effect would be tuning (step 5 ruling 14).
- Lister: a step names a test also when it quotes the test's title without its file (the tool then resolves the title over the end's test files, exactly one match). The first real-estate run, under a brief that missed title-only pointers, was voided unread and all 15 tasks were run again under one brief, so the picks stay "chosen by seed" over one candidate universe. p1–p5 still list no step: their kept feature steps name no test, so they have no step oracle and no H1 score.
- Instrument fixes, content-independent: a writer's `-2` rerun is told its own folder (it was told the first run's); a sealed writer is granted its folder by its real path too (`p8b` is a symlink to `8b`, and the symlink grant blocked every write); a step fixer's copy of the manifest holds no step text. p6a's and p7c's fixer runs, made before the last fix with the step text readable in their folder (not in their prompt), stand: the comparer kept only changes that compare the same assertions.
- `score` refuses a step id that is missing from the grade it reads, because such a grade is stale, and scores a task whose step oracle has no id from its fix-commit grade alone (H1 `none`).
- H1's N: external tasks with a step oracle are 20 (s1-01, s3-01 have no traceable check; s1-06's only one is pass-to-pass, s3-07's resolver-unknown); under the user's decision the step 11 walk tops it up. The 7.1 human sample of step checks draws from the 14 kept real-estate tasks, not p8b (trial-only).
The full list of build-time rulings is in `progress/step6-lock.md` ('Rulings during the build').

H1, H2 and H3 are the three primary tests, with a Holm correction across them. H4 validates the stick: if H4 is not met, H1–H3 are not reported (the stick cannot tell a weak harness apart). H5 is secondary and reported on its own.

`real-estate` is a secondary set: its 20 bugs shaped the old design, so its results are reported but not used for acceptance.

## 3. Arms

| Arm | What it is |
|---|---|
| B | Claude Code without the plugin, same model, same task prompt, same tool permissions, no-human mode (9.3) |
| H | Claude Code with the hstack plugin at a locked commit |
| W | H with these off: the reviewer in its own context, the independent oracle, the gate against weakened tests. The builder reviews itself. This is the stick's canary |
| H−layer | H without one layer. Only used in the per-layer measures (section 8); not run end to end unless the budget allows |

Each run records: the model ID of every agent (read from the transcript, not from config), date and time, plugin commit, task base commit, input/output tokens, duration, number of questions to a human.

## 4. Task set

### 4.1 `real-estate` tasks (secondary set)

Each plan that adds features is one task. Its base commit is the commit just before the plan's first commit. Test-only plans (4.1, 7a.1) are not tasks. Fix plans (7a, 9, 10) and "Items carried" sections are not tasks: they are oracle sources for earlier tasks.

Oracle candidates: source hunks of later commits whose removed lines (or, for a pure addition, the old line just before the insertion) were written by the task's commits, by `git blame` at the parent (`bench/oracle-sources.mjs`). The "catalog" column counts only hunks of the 23 fix commits in `.evidence/replay.md`; most other candidates are later features rewriting old code (a requirement change, not a bug) and must be labelled (6.1).

| Task | Plan | Base commit | Commits | Candidate hunks (with test changes) | of which catalog | Catalog commits |
|---|---|---|---|---|---|---|
| p1 | 1 foundation | 691a723 | 16 | 158 | 15 | 0870afc 4e58ba5 89583d2 dd56b84 e41d45f |
| p2 | 2 properties | 7adfd47 | 12 | 187 | 33 | 24c426f 4e58ba5 89583d2 d82f2b0 e41d45f eb2b016 |
| p3 | 3 articles | 5eced48 | 15 | 139 | 20 | 89583d2 dd56b84 |
| p4 | 4 surveys | be6c20b | 18 | 147 | 5 | 090f6f2 5b6646d |
| p5 | 5 matching | 8906318 | 9 | 20 | 0 | — |
| p6a | 6a requests | 31fcab0 | 8 | 115 | 14 | 0870afc 24c426f 36d089b 6cedf96 dd56b84 |
| p6b | 6b notifications | d7f2fd3 | 7 | 68 | 6 | 090f6f2 6cedf96 dd56b84 |
| p6c | 6c admin polish | 885c4c2 | 10 | 60 | 26 | 24c426f 6cedf96 d82f2b0 dd56b84 e41d45f |
| p7b | 7b limits (new part only) | 9354f4d | 6 | 23 | 6 | 0870afc 24c426f d82f2b0 |
| p7c | 7c launch | 3137149 | 11 | 6 | 2 | 8eccb47 |
| p8a | 8a brand | 0b02f41 | 8 | 47 | 5 | 730509b d82f2b0 dd56b84 |
| p8b | 8b listings | d1ea76b | 7 | 50 | 30 | 24c426f d82f2b0 dd56b84 eb2b016 |
| p8b1 | 8b.1 showcase seed | 1846450 | 6 | 18 | 11 | 4e58ba5 |
| p8c | 8c detail | bf2eea3 | 8 | 43 | 9 | 24c426f dd56b84 eb2b016 |
| p8d | 8d home | bee1c22 | 9 | 44 | 41 | 090f6f2 24c426f 69ebe27 dd56b84 |
| p8e | 8e admin | d7695d6 | 7 | 17 | 16 | b5b3cec eb2b016 |

Rerun: `bun bench/oracle-sources.mjs <repo> <commit,...>`; each task's result is in `.evidence/bench/tasks/<task>.tsv`.

A task is kept when: (a) its filtered input passes `bench/input-check.mjs`; (b) after the fix / requirement-change labelling, at least 3 valid oracle checks remain **that belong to the task**, i.e. are not in the "pre-existing" bucket (7.1); (c) it needs no data outside the repo (for example the `showcase-data/` folder). Before the task-base rule, p5 and p7c were expected to fail (b), leaving 14. p8b gave about 1 task-owned check per 3 catalog hunks (9 or 11 of 30), so tasks with 6 or fewer catalog hunks (p4, p6b, p7b, p8a) may well fail, and the number kept may be only 8–10. The real number is fixed at step 10 of section 12 (stick v1). At most 12 tasks run: if more than 12 qualify, keep the 12 with the most valid oracle checks (ties: the earlier task). The final task list is committed before any run, with the reason each task was dropped.

`real-estate` is a private repo created after the models' knowledge cutoff (June 2026), so it is not in training data. It stays secondary for the reason in section 2.

### 4.2 External tasks (primary set, used for acceptance)

Selection rule, pre-registered, in the style of SWE-bench-Live:

1. Public repo with an open licence, active after 2026-07-01, runnable in a throwaway container.
2. Three clearly different stack groups, 8 tasks each: (S1) a web app with a database; (S2) a desktop app; (S3) a CLI or library in a language other than those of S1 and S2. Marked examples, not binding: S1 a Django or Rails app, S2 an Electron or Tauri app, S3 a Go CLI or a Rust library.
3. Each task is an issue and a merged PR, both created after 2026-07-01 (after the cutoff of every model in the experiment; the cutoff date is recorded with the model ID). The PR links the issue, adds or changes tests, and has at least one test that fails before the PR and passes after it.
4. At least 6 of the 8 repos in each group were never used in hstack. Every repo is brownfield. At least one repo per group serves the cold-setup test (section 13).
5. Sampling: list every candidate meeting 1–4, sort by the SHA-256 of `<owner>/<repo>#<PR number>` joined with the seed `hstack-bench-2026-10-27`, take from the top, at most 2 tasks per repo. The candidate list and the sample are committed before any run.
6. Input: the issue title and body only, plus the repo at the PR's parent commit. No PR description, review comments, or issue comments after the PR opened (they often hold the solution).
7. Oracle: the PR's tests, rewritten as black-box checks at the public interface (6.2). For a library the interface is its public API; for a CLI it is running the real program.

#### Rulings registered before the enumeration (step 4)

The rule above leaves some points open. These rulings close them. Rulings 1 and 13 were decided by the user on 2026-11-02; the rest are proposed by the step 4 plan (`docs/plans/2026-11-02-bench-external.md`). Registered before the enumeration; `bench/ext.mjs list` has not run.

1. **Stacks (the user chose them on 2026-11-02).** S1 web app with a database: a repo whose GitHub primary language is Python with a Django app (a `manage.py` whose text has `DJANGO_SETTINGS_MODULE`, at the root or in a folder one level below), or Ruby with a Rails app (`config/application.rb` and `bin/rails` at the root; `config/database.yml` is often gitignored, so it is not required). Not Next.js: `real-estate` is Next.js and S2 is TypeScript, so S1 would share a language and toolchain with both. S2 desktop app: primary language TypeScript, JavaScript, Vue or Svelte, with an Electron app (a `package.json` whose text has `"electron":` and, in the same folder, a packaging config: `electron-builder.*`, `forge.config.*`, `electron.vite.config.*`, or `"build": {` / `"forge"` in that `package.json`; the root or a folder one level below). The `*` names are expanded to exactly these file names: `electron-builder.yml`, `.yaml`, `.json`, `.json5`, `.js`, `.cjs`, `.mjs`, `.ts`, `.toml`; `forge.config.js`, `.cjs`, `.mjs`, `.ts`, `.cts`, `.mts`; `electron.vite.config.js`, `.cjs`, `.mjs`, `.ts`, `.cts`, `.mts` (21 names). `"electron":` is matched as the regex `"electron"\s*:` and `"build": {` as the regex `"build"\s*:\s*\{`. No Tauri: it needs Rust and system web libraries in the container, and its Rust tests sit inside source files. S3 CLI or library: primary language Rust, `Cargo.toml` at the root, and no `src-tauri/` folder. Markers whose path has a folder in it (Rails) are looked up from the root only. The language sets are disjoint, so a repo is in at most one stack. A Rust web server is not excluded (no mechanical test separates it from a CLI or library); this is a known limit.
1a. **Rust tests.** Rust unit tests usually sit inside the source file (`#[test]` in `src/*.rs`); copying such a file from the end to the base would copy the fix with it. So for S3 only files under a `tests/` folder (integration tests, which for a CLI run the real program) are test files. A PR whose test changes are all inline is `no test file`.
2. **Repo universe.** Per stack, every repo with stars at least 1000, `pushedAt` at least 2026-07-01, `createdAt` before 2026-01-01 (brownfield: at least six months of history before the first eligible PR), not a fork, not archived, not a mirror, `licenseInfo.spdxId` in the OSI list below (`NOASSERTION` and none are out), and not used in hstack. Counts on 2026-11-02 for these qualifiers before the marker check: Python 4617, Ruby 485, TypeScript 3599, JavaScript 2116, Rust 1527 (Vue and Svelte not counted yet). Search is sliced by stars range until each slice reports under 1000 results. OSI list: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, MPL-2.0, GPL-2.0, GPL-3.0, LGPL-2.1, LGPL-3.0, AGPL-3.0, EPL-2.0, Unlicense, 0BSD, BSL-1.0, Zlib, MIT-0, Artistic-2.0, EUPL-1.2.
3. **Widening.** If a stack's list is exhausted before it has 8 tasks, a second tier (stars 500 to 999, same rules) is enumerated, sorted by the same key and committed before any of it is checked, and walked after tier 1. Still short: stop and ask the user. N never drops below 24.
4. **Snapshot window.** PRs created from 2026-07-01T00:00:00Z and merged before 2026-11-01T00:00:00Z into the default branch. The raw API responses are kept and hashed. A rerun of `list` later will not reproduce the list exactly (merges land daily, search ranking moves), so the committed list and the raw responses are the record.
5. **"Links the issue".** `closingIssuesReferences` has exactly one issue, in the same repo, created from 2026-07-01 and before the PR's `createdAt`. More than one, another repo, or an earlier issue: out, with the reason.
6. **Tests.** The PR changes at least one file matching the stack's test-path patterns and at least one other file that is not Markdown or under `docs/`. A PR with more than 100 changed files is out (its file list cannot be read whole in one page, and it is not PR-sized). A PR whose author is of type `Bot` is out. Test-path patterns (regex sources; the same strings are in `groups.json`):
   - S1: `(^|/)tests?/`, `(^|/)test_[^/]*\.py$`, `_tests?\.py$`, `(^|/)conftest\.py$`, `(^|/)pytest\.ini$`, `(^|/)spec/`, `_(spec|test)\.rb$`.
   - S2: `(^|/)(tests?|__tests__|spec|e2e)/`, `\.(spec|test)\.[cm]?[jt]sx?$`, `(^|/)(vitest|jest|playwright)\.config\.[cm]?[jt]s$` (a test-runner config the PR changes is copied in with its tests, so a config change cannot pass for a fix).
   - S3: `(^|/)tests/` (ruling 1a).
7. **Sort key.** `sha256("<owner>/<repo>#<n> hstack-bench-2026-10-27")`, the id lowercased, one space before the seed, hex compared ascending; one list per stack; tier 2 after tier 1. Test vectors: `octocat/hello-world#42` gives `bea5910fe308bac50ac3fe749d703078d7b3e8b3092710af42634f494c6a8c19`; `octocat/hello-world#7` gives `3215ff12f22f2e4479f5b9d3b6720760bffad246a8bf123b1ece0900606d9359`.
8. **Static, then runtime, in sort order.** Criteria that need a run (runnable in a container, a fail-to-pass test) are checked by walking the committed list from the top; the walk stops for a stack at 8 accepted tasks. The sort key does not depend on any criterion, so filtering everything first and walking in order give the same sample. Rows below the stop are recorded as `not checked`. At most 2 tasks per repo: a candidate of a repo that already has 2 accepted tasks is `repo cap`, not checked; the cap is recomputed from the accepted tasks each time, so a cap freed later (ruling 14) reopens those rows. A failure of the tool itself (clone, docker daemon, a parse) is `error`, never an out reason: the row is checked again, and the walk stops after 2 errors in a row.
9. **Base and end.** End = the PR's `mergeCommit`. Base = its first parent when it has two parents (merge), or when the PR has one commit, or when `git diff --name-only <end>^1 <end>` equals the PR's file list (squash). Otherwise (a rebase merge of several commits) the task is out: its parent would hold part of the PR, and 7.1 needs a clean known-bad version.
10. **Runnable and fail-to-pass.** A recipe (image, setup at build time with network, a test script that runs given test files with no network and writes JUnit) is written by a sealed agent that sees only the repo's files at the base (no `.git`), at most 3 rounds per repo, plus 1 round for each further task of the repo. The test files are the PR's changed files matching the test patterns that exist at the end. Fail-to-pass = a test case (`classname` + `name`) that passes in both of two runs at the end and fails, errors or is missing in one run of a container of the base image with the PR's test files copied in (deletions applied). "Runnable" means these tests run; whether an S1 or S2 app can also be served in the container is checked in step 5, and a task that cannot is dropped there (ruling 14). Limits: image build 45 minutes, test run 30 minutes. A failed end-image build gets no recipe round (its log is after the PR and stays sealed): the candidate is `end build failed`. The recipe may name `linux/amd64` (run under emulation) when a dependency has no arm64 build. Out reasons, in order: `rebase merge of several commits`, `recipe failed`, `end build failed`, `PR tests do not pass at end`, `no fail-to-pass test`. Added 2026-11-03, after the list commit and before any task was accepted, when the first checked candidate's base run was killed for memory: a test run killed for memory (Docker reports OOMKilled; this machine's Docker has 7.6 GB and 8 CPUs) is the out reason `out of memory`, after `end build failed`; the recipe brief states the memory limit. The rule depends on no candidate's content. Added 2026-11-03: each recipe probe also runs one file of the base under the stack's test paths whose extension no probe file has (the first in path order; none, no extra file), so a test script that fails on a fixture or data file fails in a readable recipe round; candidates rejected before this change for `PR tests do not pass at end` are rechecked (a `recheck` row in the walk record, no earlier row changed), because a sealed diagnosis showed the first such reject came from the recipe interface, not the repo. 2026-11-03, the user's decision: Docker keeps 7.6 GB and 8 CPUs on this 32 GB machine; a repo whose tests need more memory is `out of memory`, and every such out is reported to the user. Added 2026-11-03: a recipe written under an older brief is regenerated before use (one recipe round offered the old recipe as its starting point, within the repo's round count). Added 2026-11-03: when none of the test files given to the test script is a runnable test file, the script runs the tests that own them (the package, crate, module or folder they belong to), because a sealed diagnosis found the first `PR tests do not pass at end` candidate's test changes were all test data, so the script ran nothing; every candidate out `PR tests do not pass at end` before this rule is rechecked. 2026-11-03, the user's decision: a full Docker disk is the machine's failure (`error`, never an out reason), and the walk stops when Docker's disk is low; a disk-full message counts as the machine's failure only when the disk is then below the floor; accepted tasks keep their recipe and image digests, not their images (step 5 rebuilds them); every S3 candidate out after the first accepted task, except the `out of memory` one, is rechecked, because a sealed diagnosis of five `end build failed` candidates found Docker's disk full; rounds spent while the disk was full are not counted. Added 2026-11-03, after the walk ended and before step 5: the invocation of the test script is the same for the probe and the PR's runs (each path one single-quoted word), so three zero-case outs whose runs exited with a usage error, two of them diagnosed as the recipe's (sealed diagnoses), get an instrument fix: when the base run and both end runs give no case and exit non-zero, one more recipe round is run, even at a spent budget, its prompt adding only "Given the PR's test files the script exited with an error and ran no test; accept any repo-relative path under a test folder, map it to the runner's own selection, and run the owning tests when none is runnable.", and the runs are made again with the recipe that passes it; every candidate whose runs meet the trigger is rechecked (amended 2026-11-03: not only the two diagnosed; the trigger, not a diagnosis, decides), and the sample is locked again (its first 8 accepted rows by tier and rank per stack, at most 2 per repo). Stop rule (2026-11-03): a recheck happens only when a diagnosed failure class has a generic instrument fix that applies to every candidate; `recipe failed` outs are not reopened (the 3-round cap is the criterion); after this pass, later findings are known limits. Added 2026-11-03, for the record of this ruling: "rounds spent while the disk was full are not counted" and "a disk-full message counts as the machine's failure only when the disk is then below the floor", in the sentence of the user's decision above, were the controller's rulings after review, not the user's decision; the sample wording "by tier and rank per stack, at most 2 per repo" above is an amendment of the earlier "by rank per stack"; and the user allowed `docker builder prune -f` on 2026-11-03 (the build cache only; the walk's driver runs it once when a walk stops on a low disk).
11. **Requirement text.** The issue's title and body as they stood at the PR's `createdAt`: the body from `userContentEdits` (the last edit before that time), the title from `RenamedTitleEvent`s after that time undone. When the body was edited after the PR opened and the history does not give the earlier text, the task stays and is flagged `edit-history: unverified`. No comment is kept.
12. **Used in hstack.** A repo hstack ran as a project (built, tested or replayed): `real-estate` (private), the `daily-routine` app (private), `fixtures/electron` (local). None is public, so "at least 6 of the 8 repos never used in hstack" holds for every sample; the check is recorded. The 8 tasks of a stack come from at least 4 repos (at most 2 each); "6 of the 8 repos" in item 4 is read as "all but at most 2 of the stack's repos".
13. **Cold-setup repo (the user agreed on 2026-11-02).** Per stack, the sampled repo whose best-ranked task ranks lowest (the last repo to enter the stack's sample). The first repos of the list are taken by the canary (7.3, first 2 per stack) and the trial run (step 11, which runs H on them before the plugin is locked), so they cannot stay unseen. Nobody designing the plugin opens the cold-setup repos.
14. **Later needs.** A sampled task dropped in step 5 (for example no valid oracle check), or more tasks needed by the N rule of 10.2, are taken by continuing the same walk on the same committed list: a dropped task frees its repo's cap, so that repo's `repo cap` rows are examined again in sort order before the walk goes on below where it stopped.
15. **Model cutoff.** 2026-07-01 is after the June 2026 cutoff of the configured model; the cutoffs of every model are recorded at the lock of step 12. A model with a later cutoff then is a prereg change at that time.

Search qualifiers, exact. Repo search: `language:<L> stars:<a>..<b> pushed:>=2026-07-01 created:<2026-01-01 archived:false fork:false`. Mirrors are not a search qualifier; they are dropped after the search by the repo's `isMirror` field. PR search: `repo:<o>/<r> is:pr is:merged created:<from>..<to> merged:<2026-11-01 linked:issue`.

Decided by the user on 2026-11-02:

- Stacks: Django or Rails, Electron, Rust (ruling 1). Cold-setup repo: the last repo to enter each stack's sample (ruling 13).
- Issue text with code (repro snippets, stack traces) stays eligible. `bench/input-check.mjs` is not an eligibility rule, and step 5 decides how the input is shown.
- Postgres reach during builds is accepted (`real-estate` holds demo data). Builds may reach the host's `127.0.0.1:5432`; its `pg_hba.conf` asks a connection from another container for a password no container holds. A probe of which host addresses a build can reach on port 5432 is kept as a record, and the Postgres snapshot is compared around each walk batch.
- Docker clean-up is allowed for candidates that end `out`: `--remove-out` removes their `bench-ext-*` containers and `bench-ext/*` images by exact name. Accepted tasks keep theirs for step 5. Nothing else is ever removed.

The stack data (languages, markers, test-path patterns, the OSI list, the limits and the seed) is in `<data>/ext/groups.json`; its SHA-256 is recorded in `progress/progress.md`. Registered before the enumeration; `bench/ext.mjs list` has not run.

## 5. Input

Filter rules for a `real-estate` plan (tried on p8b, section 14):

- **Keep**, rewritten only to remove pointers: Goal; "User decisions" (drop bullets that only describe how the plan was written); "Global Constraints"; the "Feature steps" of new features.
- **Drop whole**: "Items carried", feature groups that fix earlier plans (for example P8b-F5), "Decisions taken in the scratch copy", "Changes from the design", "Review Focus", "Known limits", "File map", every Task, process instructions. Why "Review Focus", "Known limits" and "Decisions taken in the scratch copy" go: the plan writer drew them out after building the whole plan in a scratch copy (plan 8b: spikes of about 1.52M tokens; 8b's Known limits even hold byte sizes measured on the production build), so they are output of a build, not requirement. Deliberate consequence: an edge stated only in these sections scores the requirement step.
- **Strip inside kept text**: test pointers, source and test file paths and names, internal identifiers. **Keep** the public interface: URLs, query parameters, UI text, API paths, status codes, the project's CLI commands.
- **Mockups**: not given. A step that says "looks like the mockup" keeps its sentence with the tag `[visual, mockup not given]`; oracle checks that rest only on a mockup are out of the score.

The filter reads the plan, and for plans 1 to 6c the entries of the harness's feature list that belong to the plan (those plans keep their feature steps there, not in the plan), as they stood at the last harness commit before the task's first commit: later edits of a plan are output of its build or of later plans. Each filter runs as a sealed agent whose prompt is the rules and that source text, with no tool. A step whose whole text is a test pointer keeps, as a behaviour sentence, what its title states; a step with its own text loses both pointer and title (the title restates the step).

**Interface sheet.** Oracle checks need public names to run: field labels, the accessible name of a form, option texts, URL parameter keys, API field names. The filtered input does not state all of them (p8b: only 2 of the price and sort keys). If a builder picks other names, a check fails on the name, not the behaviour, and the requirement score mixes the two. So the input comes with an interface sheet: **every** public name of the features the task builds, read from the task's end product (p8b: 730509b): every label, option text, form accessible name, URL parameter key and API field name of the pages and endpoints the feature steps mention. Names only, no behaviour. The sheet is not built from the oracle checks (a selective list would tell the builder where the hidden checks look); it is compiled by an agent that has not read the oracle, and it must pass `bench/input-check.mjs`. A name that only exists after a fix commit (for example the label "Tên địa điểm" that d82f2b0 adds) is naturally absent from the sheet.

The filter (an agent) never sees fix commits, later plans, progress logs or the oracle. `bench/input-check.mjs` must print PASS on every input; it looks for code fences, source or test paths, source file names, test calls, test title pointers and code syntax. This is the machine evidence for "the input holds no code or test"; a human also reads 2 random inputs.

## 6. Oracle

### 6.1 Sources

- `real-estate`: candidates by the blame rule of 4.1, plus fix commits **inside** the task (the fix wave after the final review, for example 730509b of p8b), because the task's end product must be free of those bugs.
- Each candidate commit is labelled "fix" (restores behaviour the task intended) or "requirement change" (a later feature changes behaviour) by two independent agents, reading only the commit subject, the diff and the progress-log entry that records who found it (as `attribution.md` does). A human settles disagreements. Only "fix" enters the oracle.
- Fix plans and the content of fix commits never reach the builder's input.

### 6.2 Black-box rewrite

Each test a fix commit adds or changes, if it checks the behaviour of an in-scope hunk, is rewritten as a check that uses only the public interface: the browser, HTTP, the public REST API (logging in through the API as a user would), visible text, URLs; for a CLI, running the program; for a library, its public API. No import of app code, no internal function calls, no database reads. A unit or int test moves to where the behaviour shows to a user; if there is no public path, it stays in the manifest with `interface: none` and is not scored. Each check has a precondition step (does the feature exist) separate from its main assertion, to tell "feature missing" from "wrong at an edge".

The oracle lives outside the tree the builder can read and only runs after the build ends, by the grading script, in a throwaway environment (fresh database, own port).

### 6.3 Classifying each check

Two independent classifier agents, who see only the filtered input and the oracle:

- **traceable**: every assertion **and** every selector or setup value the check needs (labels, URL parameters, status words, numbers) is stated or directly implied by the input. With quotes and step IDs. → scores the build step.
- **not traceable**: a builder could meet the whole input and still fail this check. → scores the requirement step.
- **partly**: split into two checks at assertion level when possible; if not, it goes to the requirement bucket.

Public names in the interface sheet (section 5) count as stated by the input; classifiers judge behaviour only.

A human settles disagreements; agreement before settling (Cohen κ) is reported. The build and requirement numbers are never merged.

## 7. Validating the stick

### 7.1 Oracle

Each check has an explicit precondition step (6.2) and also runs at the **task base commit**. A check that fails at the base **after** passing its precondition tests a bug older than the task (the blame rule misattributed it because the task rewrote a neighbouring or the same line): it goes to the "pre-existing" bucket, counts in no score of this task, and moves to the oracle of the task that introduced it. Failing at the precondition is expected (the feature does not exist yet).

Each check must **fail on a known-bad version** (the parent of the fix commit, and the task's real end product) and **pass on the reference** (the fix commit), in the same run. A check that passes on both is "weak", one that fails on both is "broken"; both are out of the score (mechanics may be fixed, assertions are never weakened). A human confirms a sample of 10 checks per stack: reads each check next to its original test and says whether they check the same behaviour.

For external tasks: the reference is the PR's merge commit, the known-bad version its parent. Three seeded bugs per task (8.3) add known-bad versions.

#### Rulings registered before the oracles (step 5)

Sections 6 and 7 leave some points open for the oracle preparation. These rulings close them. The two decisions under "Decided by the user" were proposed with the step 5 plan (`docs/plans/2026-11-03-bench-oracles.md`) and decided by the user on 2026-11-03, when the user approved the plan as written; the numbered rulings are proposed by the step 5 plan. A reference to a ruling "of step 4" is to the list in 4.2 above.

1. **Scope.** External: the 24 tasks of `progress/step4/sample.tsv` and every replacement ruling 14 of step 4 brings. Real-estate: the 15 tasks of `tasks.json` other than p8b, which is trial-only (section 12, step 10) and whose oracle step 6 reclassifies. The held-out commits (29f4daf, 36d089b, 400f58a, 5b6646d, 89583d2, b5b3cec) are open as oracle sources from the step 3 lock on; they unlock p1–p4, p6a and p8e.
2. **External task ids.** A task keeps its sample id (`s1-01` …) and its folder `<data>/<task>/`. A dropped task's id is retired; a replacement takes the next unused number of its stack (`s2-09`, …). The canary's "first 2 per stack" (7.3) and the cold-setup repo (ruling 13 of step 4) are read over the kept tasks in sort order.
3. **External input.** `<data>/<task>/input.md` is `# <title>`, a blank line and the body of `ext/tasks/<slug>/issue.json`, verbatim (rule 6 of 4.2: the issue title and body only; the user's decision of 2026-11-02: code in the issue stays). `bench/input-check.mjs` runs on it and its hit count is recorded, not enforced.
4. **The task's recipe.** Each external task builds from the recipe its accepted step 4 check used, the reply named in the step 4 lock's final addendum (s2-02 from `ext/recipes/coder__xum/rounds/1.reply.md`, not `coder__xum/recipe.json`), parsed by a tool into `ext/tasks/<slug>/task-recipe.json`; the reply's SHA-256 must equal the lock's.
5. **Servable (ruling 10 of step 4, its step 5 check).** A serve recipe per repo, `{ layer, start, ready, notes }` (`layer`: Dockerfile lines after the task recipe, installing what serving and driving the app need; `start`: a POSIX sh body that starts every service and the app in the background with a fresh database and migrations applied; `ready`: a sh body that exits 0 once the app's public interface answers; `notes`: base URL, admin credentials, how a window is reached, for the oracle writer), written by a sealed agent that sees only the repo's files at the base, at most 3 rounds for the repo's first task and 1 for each further task, as for recipes. A round passes when, at the base and at the end, one container of the recipe plus `layer`, `--network none`, runs `start` and then `ready` exits 0 within 600 s. Logs at the base are readable and go to the next round; logs at the end hold the PR and are sealed, so a round that serves at the base and not at the end tells the next round only that. An S1 or S2 task with no passing round is `dropped not servable`; one killed for memory is `dropped out of memory` (reported to the user). S3 gets no serve check: its interface is the program or the public API, which its step 4 runs already reach; its serve recipe is `{ layer: [], start: "", ready: "true", notes: "" }`.
6. **Owner of a real-estate hunk.** A hunk `(commit, file, old start)` belongs to the task with the most `task_lines` over the rows of `tasks/<t>.tsv` that match it, a tie going to the earlier task of `tasks.json` (the `bugs.mjs` rule, applied per hunk). A commit inside a task's range (`base..end`, first parent) belongs to that task. A check belongs to the owner of the hunk it checks, so no check enters two oracles.
7. **Real-estate sources (6.1).** Candidate pairs `(commit, owner task)`: each later commit with `tests_changed` `yes` and a hunk a step 5 task owns, and each commit inside a step 5 task's range that changes a test file. Two sealed labellers label every pair on their own (batched by owner task), reading only the commit's subject and diff (`git show <sha>`, `git log -1 <sha>`), the harness progress log and `.evidence/attribution.md`: `fix` or `requirement change` for a later commit; `fix` (restores what the task's earlier commits intended, found after they were written) or `build` for an in-task commit. A pair both call `fix` is a source now. A disagreement goes to the human queue of step 9; a pair the human then calls `fix` is rewritten and validated in a second batch with the same tools, recorded as pending at the lock of the step 5 plan.
8. **Task (c) check.** Before any label is spent, each real-estate task's end commit is read for data it loads from outside the repo (the prereg's example: `showcase-data/`); a task that needs such data is dropped with the evidence (file and line). Tasks are not dropped early for few hunks (p5, p7c): rule (b) is applied after validation.
9. **Black-box rewrite (6.2).** One sealed writer per real-estate source commit (its in-scope hunks with their owners, its test diff, the files at the fix) and one per external task (the PR's diff `base..end`, the PR's test file paths and fail-to-pass ids from `ext/sealed/<slug>/`, the serve recipe, the files at the end; never the issue). Every test the commit adds or changes that checks an in-scope hunk (external: any source hunk of the PR) becomes one check; a parametrized test is one check over all its parameters; there is no cap per task. One file per check, so a real-estate check can move between oracles; an external writer may group checks into one test target when each target is built separately (a compiled language's test binaries), each check still its own JUnit case. Public interface by kind: a web app through the browser, HTTP and the public API (logging in as a user would); a desktop app through its window (an automation tool driving the app), the files it writes and its command line; a CLI by running the program; a library through its public API only (a separate test target that imports the library by its public paths). A test with no public path stays in the manifest with `interface: none`. Each check asserts its precondition first, with a message starting `PRECONDITION:`. Severity: `high` when the failure loses or exposes data, crashes, or breaks the behaviour the commit is about; `medium` for a wrong result at an edge; `low` for wording, layout or a message.
10. **Validation (7.1).** Real-estate: `grade --validate <fix> --bad <fix>^ [--bad <owner end>, only when the fix is not in it] --base <owner base>`. External: `grade --validate <end> --bad <base>`, with no `--base`: the PR's parent is both the known-bad version and the task base, so a check that fails there is the task itself and the pre-existing bucket does not apply. In the external form (no `--base`), a failed precondition on the known-bad version gives `absent-at-base` (scored, as in the real-estate form): an issue that asks for a new feature fails at its base on the precondition, and `verdict` (a step 2 tool rule) would otherwise call every such check `broken`. With `--base` (real-estate), the known-bad versions hold the feature, so a failed precondition there still gives `broken` and goes to the fixer. A run is reused for another validation when its commit and the SHA-256 of the oracle folder are the same. A commit whose grade throws (no readable JUnit, a setup or start that fails at an old commit) gives `error` for its checks in that validation file, with the stage, and the task goes on.
11. **Mechanics (7.1: "mechanics may be fixed, assertions are never weakened").** A `broken` check gets at most 2 rounds of a sealed fixer that sees the check, the test it came from and its own output in the runs that broke it. A second sealed agent compares the fixed check with the one before and answers `same` or `changed` for what the assertions compare; only `same` is kept, otherwise the check stays `broken`. A weakened check that passes on a bad version reads `weak` and leaves the score anyway.
12. **Pre-existing moves (real-estate).** A `pre-existing` check moves to the task that introduced the bug: the latest earlier task whose end fails the check on its main assertion and whose base passes it or fails its precondition, found in one sweep after every task's first validation: all `pre-existing` checks in one temporary oracle, run once at each distinct boundary of `tasks.json` (bases and ends, newest first). The receiving task's oracle then gets the check, and only its base, end and the moved checks' fix commits are validated again. No such task, or p8b, or a dropped task: recorded as `pre-existing, moved to <task or none>`, not scored in this step.
13. **Keep rules.** A scored check is one whose verdict is `valid` or `absent-at-base` and whose interface is not `none`. Real-estate (b): at least 3 scored checks owned by the task, counted at the lock over the agreed sources (recounted after step 9). External: at least 1 scored check; otherwise `dropped no valid check` and ruling 14 of step 4.
14. **External interface sheets (5).** One sealed agent per task, seeing the input and the files at the end, never the PR's tests or the oracle, with a stack-neutral brief whose kinds are the real-estate ones plus: menu item, keyboard shortcut, setting label, window title, command, subcommand, flag, environment variable, config key, public API name, output field. The tool deletes any line `bench/input-check.mjs` flags and records the count; the sheet then passes `input-check`. The 16 real-estate sheets of step 3a stand.
15. **Classifiers (6.3, 7.2).** Two sealed agents per task, each seeing only the task's input, its sheet, and the oracle (manifest without `fix_commit`, `origin`, `hunk` or `task`, and the check files, which the writer brief forbids to name their origin test or fix commit): `traceable`, `not traceable` or `partly`, with quotes. Agreed `traceable` → `build`, agreed `not traceable` → `requirement`, agreed `partly` → one sealed split round into two checks with new ids (validated and classified like any check; `partly` again → `requirement`). Disagreements stay unlabelled for step 9. κ, raw agreement and Gwet AC1 are reported per task and pooled per set, with the 7.2 usability test.
16. **Human queue (step 9), stored as data.** Label and classifier disagreements; 10 valid checks per stack and 10 for real-estate for the 7.1 read, and 20 agreed classifications per set for the 7.2 re-rating, each taken by `sortKey(<check id>, seed)` ascending; 2 inputs per set for the section 5 read, likewise.

Decided by the user on 2026-11-03:

- Docker removal. Step 5 builds images `bench-ext/<slug>:<sha7>-serve` and `bench-ext/<slug>:<sha7>-grade` and containers `bench-ext-<slug>-serve-<sha7>-<n>` and `bench-ext-<slug>-grade-<sha7>-<n>`. Each name is recorded in `<data>/<task>/docker.json` when created, and removed (`docker rm`, `docker rmi`, never `-f`) by that exact name as soon as the step that built it ends (a serve check, a validation pass), with the image digests kept, as `--remove-out` does (BuildKit's cache keeps the rebuild cheap); `docker builder prune -f` when the disk estimate is below the floor. Without it, 7.6 GB fills again within a few tasks.
- Label disagreements. Only agreed `fix` pairs are rewritten now; disagreements are left to step 9 (a second batch then), so step 5 never waits on a person.

Registered before any oracle run; `bench/oracle.mjs` has not run.

Added 2026-11-05, during the step 5 build; the user approved on 2026-11-05 by delegating to the advisor's recommendation. These are the rulings that change how a check is judged or counted. A real-estate task whose base commit has no app manifest gets `precondition` for every check (task field `appFile`, checked by git), because nothing the task builds can exist where no app exists; the rule was decided after p1's base failed, it was also applied to the sweep's saved boundary results without regrading, and it is the reason p1 meets rule (b) (10 scored checks). A validation `error` verdict is unscored, because a machine failure must not count as a score; an external task with no scored check but some `error` checks is `not judged` (rerun), never dropped, because a machine failure is never an out; an external run that never gets ready gives `error` for that ref's checks, because no verdict was reached. A split original none of whose halves is scored is restored and labelled `requirement` (the fallback of 6.3) and its halves are dropped, because 6.3 sends an unsplittable check to the requirement bucket; split halves get their own fixer rounds, because rulings 11 and 15 apply to them. The 7.1 human sample draws from scored checks (`valid` or `absent-at-base`), because both are kept and scored under 7.1; the 7.2 sample draws only from labels both raters agreed, because 7.2 re-rates agreed classifications. Reading gates: a labeller, rater or writer run that did not read what it was given is rerun once and the second result stands (15 labeller and 6 rater runs still under-read and stand), because changing the measure after seeing its effect would be tuning; a writer whose manifest is empty or all `interface: none` is rerun once, because the trigger depends only on the manifest's shape. The leak rule counts 8 or more hex characters of the fix sha, or the origin test path, because every check id carries the sha7. A hunk listed by both an in-task and a later pair belongs to the later pair's task, because that is the `bugs.mjs` owner rule. A replacement task takes its stack's next unused id and a dropped id is retired, and the cold-setup repos move with the kept tasks (s1 we-promise/sure, s2 kizuna-ai-lab/sokuji), because ruling 2 and ruling 13 of step 4 are read over the kept tasks. `docker builder prune -f` is run by hand on a disk-full signature regardless of the disk estimate, because the estimate misses the VM's allocation. The full list of build-time rulings is in `progress/step5-lock.md` ('Rulings during the build', 44) and, for the final fix wave and the two items parked after the lock, in the SDD ledger copied into `progress/progress.md`.

### 7.2 Raters

- Traceability classification (6.3): κ between the two agents; a human settles every disagreement and re-rates a sample of 20 agreed checks. Usable when (κ ≥ 0.6, or, when one label covers more than 80%, raw agreement ≥ 85% and Gwet AC1 ≥ 0.7) and the human agrees with ≥ 90% of the agreed sample. Why the "or" branch: when nearly every check has the same label, κ is low even though the raters almost always agree (p8b, section 14). If not met, rewrite the classification rule and rerun before the lock.
- LLM judge (if used for the blind quality rating of section 13): calibrated on 30 outputs labelled by two humans; judge–human agreement reported; used only if it is no more than 0.1 below human–human agreement.
- Interventions (9.3): two humans label a sample of 20 transcripts independently by the rule set; κ ≥ 0.7 before one human labels the rest.

### 7.3 Weak variant

W (section 3) must score below H (H4). If not, the stick is not sensitive enough and H1–H3 are not reported.

Because the stick is finished before any plugin exists (section 12), it also gets a canary that needs no plugin: arm B against **B−**, Claude Code without the plugin on a smaller model tier, told to write no tests, run no self-check and stop after one pass. On 6 external tasks (the first 2 of each stack in the sorted list), k = 2, the stick passes when the mean of d = score(B) − score(B−) on build + requirement is > 0 **and** at least 5 of the 6 tasks favour B (with n = 6 a bootstrap bound is not reliable). If it fails, tell the two causes apart before changing anything: run B−'s products against the seeded-bug checks of those tasks and have a human read 3 B/B− pairs. If B− is visibly worse and the stick still cannot see it, fix the stick; if B− is not worse, make B− weaker and rerun. These runs also measure B's cost and its spread between runs of one task; they are not part of the H1–H3 analysis.

## 8. Per-layer measures

### 8.1 Replay

Turn the procedure of `.evidence/replay.md` into a script (`bench/replay`): apply the reverse patch at HEAD, drop every test the fix commit added (`it.each` included), run one layer, record caught or not; a catch counts only if the failing assertion existed before the fix. Keep the two known traps: dropping one test per fix is wrong; e2e must filter the right project.

### 8.2 Dev and held-out sets

- Dev: the 20 bugs of `replay.md` (they shaped the old design). Old results stand: unit + int 1/20, e2e 0/15, blind evaluator 1/14, review 17/20 by the record.
- Held-out: hunks outside the 11 dev commits with `reverts_cleanly = yes` and a same-commit test. The catalog gives 11; 730509b leaves because it is an oracle source of p8b (6.1), so **10** remain (29f4daf 1, 36d089b 1, 400f58a 1, 5b6646d 3, 89583d2 3, b5b3cec 1); counting only logic, validation and data kinds, **4**. On record: while orienting for this plan, the catalog clause of `b5b3cec-01` was shown on screen (not the patch); the hunk stays, marked "clause seen".
- Extension: an agent not involved in harness design reads the subjects and log entries of commits the catalog did not consider (commits that did not match its grep, fix plans 7a, 7b, 9, 10, carried waves), writes the fix hunks as reverse patches into a sealed folder, checks `git apply --check`, and reports only counts. No one designing the harness opens a held-out patch before grading; the grading script prints only caught / not caught.
- Second labeller (registered before the held-out replay): a second sealed agent, not the one that wrote the extension, reads each `source: extension` bug file, its patch and `git show <fix>`, and decides on its own (a) whether the hunk restores behaviour the code intended rather than a change a later requirement asked for, and (b) whether a test the fix commit adds or changes checks the hunk's behaviour. When either answer is no it sets `"dropped": "label2: …"` in the bug file: a disagreement drops the bug, since no person may settle a held-out label before the lock. Its Bash runs in the CLI's sandbox (file writes only in its working folder and the sealed folder). The catalog bugs are not relabelled.
- Fix-tally check: `bun bench/bugs.mjs <task.json> <sealed> --sealed --fix-tally <sha,...>` prints, per listed sha only, the number of bug files whose `fix` starts with it. A count tells whether a listed sha is a held-out fix, so a list of every commit would name them all: it is run only on the registered list below. Expected on the held-out folder: 29f4daf 1, 36d089b 1, 400f58a 1, 5b6646d 3, 89583d2 3, b5b3cec 1, and 0 for each of the 11 dev commits (69ebe27, dd56b84, 4e58ba5, d82f2b0, 6cedf96, e41d45f, eb2b016, 24c426f, 090f6f2, d005fa5, 0870afc) and 730509b.
- Owner of a bug (registered before any step 3 run; `bench/bugs.mjs`): a bug's hunks are `{ file, old }`, `old` the start of the hunk's old side in `git diff -U0 --no-renames <fix>^ <fix>` (a pure addition gives the line it follows). A row of a task's line table (`<data>/tasks/<task>.tsv`) matches a hunk when its commit is the fix's 7-char sha, its file is the hunk's file and its old lines start at `old`. The owner is the task with the most task lines summed over the bug's matching rows; a tie goes to the earlier task in `tasks.json`. With no row, a fix commit inside a task's range (`base..end`, first parent) makes that task the owner with the fix in its end. A bug whose owner's end contains the fix is out of review and audit (the end product already holds the fix); a bug with no owner is out of review, audit and the evaluator (it has no input). Result on the dev set: review and audit run on 18 of the 20 dev bugs: d005fa5-03 has its fix inside p6a, 0870afc-04 has no owner.
- Layer coverage: every layer runs on every held-out bug it can take, with no other subset: the test layers on every bug whose patch applies (dropped bugs and bugs whose fix is a merge commit excluded), the evaluator on every owned bug, review and audit on every owned bug whose fix is not in the owner's end. Held-out ids are opaque (`ho-01`, `ho-02`, …), and the held-out bug file holds its hunk positions, so ownership needs no reading of the patch.
- Order: the held-out replay is graded and locked before the held-out commits (29f4daf, 36d089b, 400f58a, 5b6646d, 89583d2, b5b3cec) are opened as oracle sources for `real-estate` tasks. Tasks that need them (p1–p4, p6a, p8e) wait until then.

### 8.3 Seeded bugs

A seeding agent (sees only the reference solution and the requirement) seeds single-hunk bugs at edges: empty, null, duplicate, letter case, deleted, boundary values. Each bug comes with a black-box check that fails on the bug and passes on the reference; a bug that fails this step is dropped. Target 81 seeded bugs (10.2): 3 per external task (72) plus 9 on `real-estate`. Sealed like the held-out set.

### 8.4 Two measures for two kinds of layer

- **Guard layers** (unit tests, e2e, mutation on changed lines, the independent oracle, the gate against weakened tests): severity-weighted catch rate (high 3, medium 2, low 1) on held-out + seeded bugs + oracle checks. Keep a layer if the catches **only that layer makes** (H vs H−layer, paired by bug, McNemar) have a confidence lower bound > 0.
- **Discovery layers** (chartered exploratory testing, task review, final review, whole-repo audit): real defects no other layer found, confirmed on a clean HEAD, per million tokens. Historical evaluator mark: 1 unique fixed defect per about 144k tokens (`yield.md`, repeats removed), about 6.9 per 1M. Keep a layer if its 95% Poisson lower bound is ≥ 50% of that mark (3.5 per 1M), or if it finds a high-severity defect no other layer finds.
- Review has a record of 17/20 (`attribution.md`) but was never measured in a replay; it is measured by the discovery measure like every layer.
- New layers: minimal version, measure, then keep or drop by the measure of their kind.

## 9. Measures

### 9.1 Score of one run

- Build score = weight of passed **traceable** checks / weight of all valid traceable checks.
- Requirement score = the same over **not traceable** checks.
- A check that fails at its precondition counts as failed and also counts toward "feature missing"; the feature-missing rate is reported on its own.
- Task passed = every high and medium severity build check passes, on the oracle H1 currently uses (the fix-commit oracle, or the step oracle if the floor rule of section 2 applies).
- Under the floor rule of section 2, the build score, the requirement score and the task-passed rule are taken as set out in the paragraph "Applied at step 6 (2026-11-05)" there (ruling 7).

### 9.2 pass^k

With c passes in k runs of a task, the unbiased estimate of pass^j (j ≤ k) is C(c,j)/C(k,j), averaged over tasks; report pass^1 and pass^3 per arm, with bootstrap confidence intervals.

### 9.3 Autonomy

Benchmark runs have no human present. Whenever an agent asks a human (a question, a confirmation request, the stop-and-ask list), a fixed responder answers: "No more information; decide from the requirement", except that when the question offers fallback options it picks the first. Labelling rules (one intervention =):

1. each time the agent stops to wait for a human answer;
2. each time a human must edit a file, run a command or restart for the run to continue;
3. a run abandoned because it cannot continue = 3 interventions.

Not counted: the harness's own automatic reminders, permission requests already covered by allow rules. Historical baseline: transcripts of the outsourcing sessions, labelled by the same rules, one plan per task (bias: that was a real human with private knowledge).

## 10. Statistics

### 10.1 Runs and pairing

- k = 3 runs per task per arm. A task's score in an arm = the mean of its k runs.
- Paired comparison: d_t = score of H − score of B on task t. 95% interval for the mean of d by bootstrap over tasks (10,000 resamples, resampling tasks, keeping each task's k runs), with the t interval alongside.
- Seed: the order of arms on each task is shuffled by a fixed seed, so run time does not favour an arm.

### 10.2 Number of tasks (`bench/power.mjs`)

Formula: N = ((z₀.₉₇₅ + z₀.₈) · σ_d / Δ)², α = 0.05 two-sided, power 0.8.

| σ_d \ Δ | 0.10 | 0.15 | 0.20 |
|---|---|---|---|
| 0.15 | 18 | 8 | 5 |
| 0.20 | 32 | 14 | 8 |
| 0.25 | 50 | 22 | 13 |
| 0.30 | 71 | 32 | 18 |

Assumptions: Δ = 0.15 (the smallest build-score difference that matters), σ_d = 0.25 (not yet measured; middle of the table). That gives N = 22; add 2 for the normal approximation at small N: **24 external tasks**, 8 per stack.

N adjustment rule (pre-registered): the trial run (section 12, step 11) measures σ_d on 4 tasks. If the measured σ_d > 0.25, N is recomputed from the table (no budget cap, section 11). N never drops below 24 because a measured σ_d is small. The trial run is not analysed.

Bugs for the guard measure: n = z² p(1−p)/h². With p = 0.3 and half-width h = 0.1: **81 bugs** (10 held-out + 72 seeded on external tasks; 9 seeded on `real-estate` make up for the narrow logic-kind held-out).

## 11. Cost and budget

**Budget: no limit** (the user, 2026-10-27: "no budget limit, just finish it"). The plan runs to completion on the user's Claude Max 5x subscription; its weekly limit sets the pace, not the scope. The cut ladder below is therefore not used; any later cut is an explicit change to this plan, committed with its reason, never a silent drop of k, N or a comparison. The estimates below are for information only; each step records the usage it actually took (tokens from the transcripts and the change in the weekly limit shown by `/usage`), and the measured numbers replace the estimates.

Estimates; historical mark: outsourcing's plan 8b cost about 4.75M tokens (plan writing with spikes 2.97M, build 0.69M, final reviews 0.50M, fix wave 0.14M, two evaluators 0.46M; task reviews not recorded). The cost of B and of the new harness is not measured yet; the trial run measures both before the lock. Tokens count input and output, as the progress log records them.

| Item | Calculation | Tokens |
|---|---|---|
| External tasks, H and B | 24 tasks × 3 runs × (1.5M + 0.4M) | 137M |
| External tasks, W | 24 × 3 × 1.0M | 72M |
| `real-estate`, H and B | 12 tasks × 3 × (5M + 1.5M) | 234M |
| Oracle preparation (rewrite, validation, 2 classifications, labelling) | 12 `real-estate` tasks × 0.55M (measured on p8b) + 24 external tasks × 0.3M | 14M |
| Layer measures (81 seeded + 10 held-out; review 0.25M + exploratory 0.15M + batched audit 0.2M per bug) | 91 × 0.6M | 55M |
| Trial run | 4 tasks × 2 arms × 2M | 16M |
| Stick canary B vs B− (7.3) | 6 tasks × 2 runs × (0.4M + 0.3M) | 8.4M |
| **Total** |  | **about 536M** |

**Part 1 alone (the stick, before any plugin work):** oracle preparation 14M + held-out replay of tests, e2e and evaluator about 5M + blind review replay on 30 bugs with the full task diff (30 × 0.25M) 7.5M + audit replay (30 × about 1M) 30M + seeded bugs (81 × about 0.1M to seed and validate) 8M + canary 8.4M: **about 73M tokens**. Wall clock, 3 agents in parallel: oracle preparation for 36 tasks about 9 h, replays about 7 h, canary about 4 h, plus setting up a throwaway environment for each of the 3 external stacks (about a day each, not measured): **about 20 hours of agent work plus about 3 days of environment setup, 5–6 working days in all**, plus the human steps. Most of the 536M (the H, B and W rows) is Part 2 and cannot start before the plugin exists.

Hours: a plan-sized `real-estate` build takes about 5 hours for H and 1.5 for B; a PR-sized external task about 1.5 and 0.5. With 4 runs in parallel: about 60 hours for `real-estate`, 45 for external tasks (W included), plus about 10 for grading and layer measures: **about 115 wall-clock hours**.

Cut ladder (not in use while the budget has no limit; kept so that a later cut has a pre-registered order), in order; each step drops one named comparison and never lowers k or N of H1–H3:

1. W runs on 8 external tasks (3 per stack, at least 2), not 24: saves 48M. H4 must still be met on those 8.
2. `real-estate` down to 6 tasks (p6c, p8a, p8b, p8b1, p8c, p8d: catalog oracle and no held-out commit needed): saves 117M. This is the secondary set.
3. Drop `real-estate` end to end, keep only replay and seeded bugs on it: saves another 117M.
4. Discovery-layer measures only for exploratory and audit (review kept as is, no ablation, on its 17/20 record): saves about 23M.
5. Never cut: H and B on 24 external tasks with k = 3, oracle validation, the minimum H4, the held-out replay. If still over budget after step 4: stop and ask the user.

## 12. Run order and lock

The user chose on 2026-10-27 to finish the whole measuring stick before any plugin work (not the shorter path of a minimal stick and the plugin in parallel).

**Part 1: the measuring stick (no plugin exists yet)**

1. Commit this plan (status `draft`), advisor round, user approval (`stable`). From here the rules of sections 2–10 change only by a commit with its reason.
2. Build the tools: `bench/replay`, the oracle grading script, the fixed responder (9.3), a throwaway environment per stack (`docs/plans/2026-10-27-bench-tools.md`).
3a. Filter the input of every `real-estate` task (section 5). Moved ahead of step 3 on 2026-10-27, because the blind review replay gives the reviewer the filtered input of the task that introduced the bug, and the raw plan's Review Focus can name that bug. Filtering needs no fix commit, so the held-out set stays sealed.
3. Held-out set: the extension of 8.2 by a sealed agent, then the replay of the existing layers. Sets: unit + int, e2e and the blind evaluator run on held-out only (their dev results stand); review and the whole-repo audit were never replayed, so they run on dev (20) + held-out. Scope, pre-registered so the replay is not easier than real work: a blind task reviewer sees the requirement and the **full diff of the task that introduced the bug** (task base to task end, with the bug present), not the bug hunk; the audit sees the whole repo at that point. Lock the result.
4. External tasks: build the candidate list, sort it once by the rule of 4.2, commit the sample.
5. Oracles: for every external task and every eligible `real-estate` task (held-out commits only after step 3 is locked): oracle sources, black-box rewrite, the interface sheet, validation including the task-base run (7.1), two classifiers. Agents that write oracles, interface sheets and seeded bugs never share context with the session that will design the plugin.
6. Reclassify p8b with the interface sheet; with all tasks classified, apply the H1 floor rule (section 2) and, if it applies, write the step oracles.
7. Seeded bugs (8.3), validated and sealed.
8. Stick canary without the plugin (7.3): B against B− on 6 external tasks, k = 2.
9. Human steps: settle classifier disagreements, read the input and oracle samples (5, 7.1), check the intervention rules on historical transcripts (7.2).
10. Stick v1: commit the task lists, a hash of every oracle, seeded and held-out file, and the step-1 to step-9 results. Only then does Part 2 (the plugin) begin. The plugin designer never opens the content of oracles, seeded bugs or held-out patches; it sees only scores. Exception on record: the session that wrote this plan read p8b's whole oracle (manifest, behaviours, specs, base-run errors) and may design the plugin, so p8b is used only in the trial run (step 11, not analysed) and is never one of the scored `real-estate` tasks.

**Part 2: measuring the plugin (needs the plugin)**

11. Trial run: 2 `real-estate` tasks (p8b and one other) and 2 external tasks (the first of the sorted list), arms H and B, k = 1. Measure tokens, hours, σ_d; apply the N rule of 10.2. Not analysed.
12. Lock: the plugin commits of arms H and W, the model IDs, N. No change from here.
13. Run in the shuffled order, H and B in the same time window with the same model and CLI version (B runs of step 8 are not reused, because the model and CLI may have changed). Record every run, failed ones included.
14. Grade and analyse exactly per sections 9–10; report every deviation from this plan.

## 13. Acceptance thresholds (decided by neither the agent nor the user)

1. H1, H2, H3 meet the thresholds of section 2 on external tasks, after the Holm correction.
2. H4 is met: W scores below H.
3. Rerun: another machine (or another person) reruns the grading from the stored products and gets the same result for every check; 3 external tasks are rerun from scratch and score inside that task's interval.
4. Cold setup: on an unseen repo in each stack, H's setup finishes, every capability's probe and canary pass, and no human edits anything. No plugin file changes between stacks (compared by hash).
5. Blind rating: two raters who cannot tell which arm made which output (arm names, plugin files and harness traces removed from the diff) rate a sample of 20 pairs; H is preferred over B with a confidence lower bound > 50%.
6. After handing over a real project of another person: the number of bugs reported within 30 days, with the number of features (no threshold yet; tracked).

## 14. Trial on p8b (`real-estate` plan 8b, listings)

Run as a workflow with separated roles: the filter never sees fix commits; the oracle writer never sees the plan or the input; the two classifiers see neither each other, git, nor the original plan; the validator runs the oracle on the copy. Output in `.evidence/bench/8b/`.

Run on 2026-10-27, 5 agents, about 551k tokens, 45 minutes; validation ran on the `outsourcing-hstack` copy (a temporary worktree, the database `real_estate_bench8b` created fresh and dropped after), never touching `outsourcing` or the `real_estate` database.

**Input filter.** Kept Goal, 3 of 5 User decisions, 15 of 15 Global Constraints, 35 feature steps (F1 6, F2 7, F3 8, F4 14); dropped F5 (11 steps fixing plan 8a). Stripped inside kept text: 33 test pointers, 2 command and manual-class pointers, 11 file paths or names, 28 internal identifiers, 1 tool tag, 15 plan or task pointers. `bench/input-check.mjs`: the original plan has 4192 hits, the filtered input passes. Changed after the filter finished and before any classifier read it: the whole Known limits section dropped (section 5; recorded in `filter-log.md`, the old version kept aside). Still open: the human read of the input (section 5).

**Oracle.** 5 fix commits (d82f2b0, dd56b84, eb2b016, 24c426f, and 730509b inside the task) add or change 96 tests. 25 kept that check the behaviour of an in-scope hunk; 71 dropped (mostly checking code other tasks wrote: surveys, email, dashboard, leads). Of the 25, 5 have no public path (an unreadable update date, internal request reuse, a component's types), leaving 20 black-box checks that use only the browser and the public REST API. Severity of the 25: high 2, medium 8, low 15.

**Validation (7.1).** Of the 20 checks: **17 valid** (pass on the fix commit, fail on its parent), **3 weak** (dd56b84-T3, 24c426f-T4, 24c426f-T5: pass on both; they guard "keep what was right", they are not regressions), 0 broken. The validator fixed two mechanics and weakened no assertion: the import clean-up accepts 403 (the app forbids deleting imports by design), and the outline colour read is polled until the CSS transition ends. The real end product of plan 8b (730509b) passes 4 of 20: 730509b-T1 (fixed inside the task) and the 3 weak checks; it fails all 16 other valid checks. The human sample (7.1) is still open.

**Run at the task base d1ea76b** (on the advisor's advice, after the validation): 3 pass (exactly the 3 weak checks), 17 fail. Read from the first error line (the specs have no separate precondition step yet): 9 fail because the 8b feature does not exist yet; **6 fail on the main assertion although the feature exists** (24c426f-T1, T2, T3, T6, T7: the import reads a code cell as a number; d82f2b0-T1: the account page scrolls 60 px sideways), i.e. bugs older than 8b that the blame rule gave to 8b; 2 are unclear (d82f2b0-T4, dd56b84-T2: the card existed but 8b rebuilt it). So of the 17 valid checks, only 9 surely belong to 8b, plus 2 unclear. The task-base rule and the "pre-existing" bucket were added (7.1).

**Classification (6.3), two independent agents.** Agent 1: traceable 1, partly 2, not traceable 22. Agent 2: 0, 3, 22. Agreement 22/25 (88%), κ = 0.44, Gwet AC1 = 0.87. Three disagreements (730509b-T1, dd56b84-T3, 24c426f-T6) await a human.

**Lessons, already applied to this plan.** The interface sheet, the AC1 branch of the agreement threshold, the task-base rule and the H1 floor rule were all added **after** seeing the p8b results. So the p8b classification is a rule-tuning trial, not a confirmatory run; it must be rerun under the new rules before the lock.

1. On p8b nearly every bug the fix commits caught sits at an edge the input does not state: this task's oracle scores mostly the requirement step (22/25) and hardly the build step. This matches the old finding "tests only pin what the spec states".
2. Part of "not traceable" is public names, not behaviour: both agents note that the form's accessible name "Lọc bất động sản" and the option text "Biệt thự" are not in the input. The interface sheet (section 5) and the behaviour-only classification rule (6.3) were added.
3. κ is not usable when one label covers 88%: the raw-agreement + AC1 branch was added to the threshold (7.2).
4. The blame rule gave 6 of 17 valid checks to 8b wrongly. The task-base rule was added (7.1).
5. With 0–1 traceable checks per task, the build score is nearly binary and the N calculation of 10.2 does not describe it. The H1 floor rule was added (section 2).
6. Weak checks are a real kind (guarding what was right). They are out of the score as 7.1 says; no rule change.
7. Oracle preparation for a plan-sized task: about 0.55M tokens and 45 minutes, more than the 0.3M of section 11. Section 11 uses 0.55M for `real-estate` tasks.

**Not done on p8b:** explicit precondition steps in the specs; the interface sheet and the reclassification; a human read of the 2 unclear checks; human settling of the 3 disagreements; the human read of the input and the oracle sample; a real build of arm H or B (part of the trial run, section 12 step 11).

## 15. Known limits

- The token and hour estimates of section 11 are not measured; the trial run replaces them with measurements before the lock.
- The blame rule misses bugs of missing code where the task wrote no nearby line, and can misattribute when a hunk changes lines of several tasks.
- The fixed responder makes H's and B's autonomy comparable, but cannot measure the quality of an agent's questions.
- The `real-estate` oracle is exactly the bugs the old harness let through, so it leans toward the kinds of edge the old harness missed. Do not use it to compare the old harness with the new one; H and B both build fresh, so they remain comparable, but only external tasks count for acceptance.
- The plan author has read p8b's oracle; p8b is therefore trial-only (section 12, step 10).
- `real-estate` is one stack and greenfield only, in the sense that the old harness built the whole repo; only external tasks test generality.
- The interface sheet is read from an export of the task's end product: the export holds the repo, not its dependencies, so names the framework supplies (Payload's own admin labels and messages) are not in the sheet; checks that need them fall to the requirement bucket.
