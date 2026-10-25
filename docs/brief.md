# hstack brief

Build **hstack** in this repo: a Claude Code plugin (skills, agents, hooks, scripts) that installs from a GitHub marketplace on any machine. Extract it from the harness at `/Users/hbchuc/Documents/programing/vibe-code/outsourcing` (`CLAUDE.md`, `tools/evaluator-brief.md`, `tools/evaluator-*`, `progress/test-coverage.md`, `.claude/`).

One project means one harness run. `init` in a new project folder writes that project's own manifest (stack adapter, commands, thresholds) and its own progress files. Projects share nothing except the plugin version.

Keep out of the plugin: `showcase-data/`, `tools/brand`, KeyFit names, the customer's company details, and anything else customer-specific.

## Core idea

E2e tests and the evaluator check different things. The evaluator covers what e2e can't, and reports missing tests. Mutation testing is the **referee**:

- A surviving mutant is a proven gap.
- Each "missing test" claim from the evaluator is checked by writing that test and confirming it kills a mutant that was surviving. A claim that kills nothing is reported as noise.
- Mutate only lines that are both changed (`git diff`) and covered by e2e. Run e2e several times first and exclude flaky tests.
- Mutation time budget: 20 minutes per plan.
- Evaluators: keep Opus + Sonnet, blind to the builder's reasoning.

## Raw evidence first (phase 1)

1. `progress/evaluations/`: for every FAIL, record which model found it, whether the paired report missed it, and whether a later plan's regression walk failed a step an earlier plan passed (a bug that got past the harness). Plans 1–5 have one report; pairs start at 6a.
2. real-estate git history: fix commits bundle many fixes. Split them into single changes, pair each with the finding it fixed, and keep 15–20 whose reverts still apply cleanly as the replay set.
3. `manual` class-4 rows in `test-coverage.md` (fault checks that edit source): the first mutation cases.
4. `Ruling:` lines and session transcripts in `~/.claude/projects/*outsourcing*`: where the controller overruled the evaluator, and whether the ruling held up.

Customer-derived evidence stays in `.evidence/` (gitignored) and never leaves this machine.

## Stack adapters, one shared contract

Each adapter: run e2e, collect coverage mapped back to TS source, run mutation on given lines, output results in a common format.

- **A (real-estate):** Next.js 16.3 + Payload 3.90 + Postgres (docker-compose) + pnpm + Vitest 4 + Playwright 1.58.
- **B:** Electron (Node 24) + electron-vite + TypeScript + Bun + React + Tailwind v4 + shadcn/ui + Zustand + node:sqlite/Drizzle + typed IPC + electron-builder + Vitest + Playwright. No real project exists: B is validated by a probe fixture and planted mutants only. No replay set for B.

Research must answer, with evidence (docs, issues, a probe run), not from memory:

- **A:** Do mutant schemata survive `next build`, or must mutation run against `next dev` or only Vitest-tested server code? How to reset Postgres and Payload between mutant runs? E2e coverage from the server (`NODE_V8_COVERAGE`) and the browser, mapped through source maps.
- **B:** Coverage from main, preload and renderer through electron-vite source maps under Playwright's `_electron.launch`. How the active mutant reaches main and renderer in a built app. Does Stryker run with Bun as package manager? Does `node:sqlite` behave the same under Vitest and Electron's Node? E2e against the dev build or the electron-builder package? Can mutants killed by `tsc` (typed IPC) be counted apart from mutants killed by tests?
- **Both:** the time cost of one mutant.

Write no plugin code until the adapter schema and the replay set are approved.

## Done means

- **(a) Replay (stack A only):** how many replayed bugs the new harness catches, against the current harness on the same set, and which layer caught each (e2e, evaluator, mutation, or review). Each replay applies the bug's reverse patch **and removes the test its fix added** (check that file out from the fix's parent commit); otherwise that test catches every bug and the score means nothing.
- **(b) Mutation:** the tool-reported mutation score on changed and covered lines, per adapter. Every evaluator claim labeled confirmed or noise, with each model's precision and recall on planted bugs.
- **(c) Clean install (no CI):** in a fresh temp folder, install the plugin from the local git path, run `init` on both fixtures, and complete the full loop.
- **(d) Migration:** a duplicate of `outsourcing` (never the original) runs on the plugin, with its progress files intact and its current test suites still green.
