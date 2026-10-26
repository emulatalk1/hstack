---
type: design
title: "Adapter schema"
description: "The 12 fields each stack adapter fills, with a value, evidence and a status for each."
status: draft
generated: { by: claude-code/2.1.310, at: "2026-10-26T20:10:23+07:00" }
verified: { by: claude-code-advisor/2.1.310, at: "2026-10-26T19:30:00+07:00" }
---

# Adapter schema

One adapter per stack fills every field below. Each field has a value, its evidence, and a status:

- **run**: a command was run on a real project or the probe, and its output is quoted;
- **docs**: taken from the tool's documentation or source, with the link or path;
- **open**: not settled, with the question that settles it.

A field may not be left empty. "Not possible on this stack" is a value, with evidence.

## Fields

| # | Field | What the loop needs it for |
|---|---|---|
| 1 | Install | the package manager and the one install command |
| 2 | Unit tests | the command; how to run one test by title |
| 3 | Integration tests | the command; how to run one test by title; what they need running (database, services). Stack B: which Node runs the tests and which runs the app, and whether `node:sqlite` behaves the same in both |
| 4 | e2e tests | the command; how to run one test by title; traps (for example, a project dependency that ignores test filters). Stack B: run against the dev build or the electron-builder package, and why |
| 5 | Coverage per test, unit and integration | how to get "this test covers these lines". Is a per-test map available without a mutation run (Stryker's `coverageAnalysis: perTest` exists only inside one)? |
| 6 | Coverage per test, e2e | the same for e2e tests; which processes it covers (server, browser, Electron main, preload, renderer) |
| 7 | Mutation, unit and integration path | the tool, its config, how to limit it to given files or lines, time per file on the probe. Can integration tests run under the tool, each worker with its own database? If not, say that lines covered only by integration tests have no mutation path. Does the tool's type check report a compile error apart from a test kill (typed IPC on stack B)? |
| 8 | Mutation, e2e path | default: one hand-written mutant per e2e test, applied to the file, then that one test run (measured on stack A at about 40 s with a reseed). Check once the alternative: the mutation tool's command runner with one e2e test as the test command. Can the dev server stay up across mutants (file change, hot reload) instead of a reseed per run? Time per mutant |
| 9 | Dev server | start command, port, the URL or signal that says it is ready; stop only a listener whose working directory is inside the project |
| 10 | Data reset and seed | the reset command, the seed command, and the one database or data folder an agent may wipe |
| 11 | Evaluator access | how an evaluator opens the app and logs in (a browser page for a web app; `_electron.launch` for Electron) |
| 12 | Safety | what an agent must never run on this stack. At least: drop only the manifest's database or data folder; never `docker compose` or stop shared containers; check a port's owner before stopping it |

Per-project fields (the same for every stack, set by `init`): the spec path, the feature list, the coverage file, the progress log, and the slot skills from the layer list.

## Stacks

- **A**: Next.js 16 + Payload 3 + Postgres + pnpm + Vitest 4 + Playwright 1.58. Real project: the copy at `../outsourcing-hstack` (never `outsourcing`). Most fields are already measured in `.evidence/`; the agent cites those and runs only what is missing.
- **B**: Electron (Node 24) + electron-vite + TypeScript + npm + React + node:sqlite + Vitest + Playwright. No built project yet (the qas v2 app is planned). The agent builds a probe app at `fixtures/electron/` in this repo, committed without `node_modules`: one window, one typed IPC channel, one sqlite write, one unit test, one Vitest test that opens the sqlite file, one e2e test. Every field is filled from that probe. The same fixture later serves the clean-install check.

## Output

Each agent writes `docs/references/adapters/<date>-stack-<a or b>.md`: the 12 fields as a table (field, value, evidence, status), then a list of the `open` fields. Nothing else.

These files are committed, and `.evidence/` is not. Evidence quotes are commands and tool output only: no customer names, no data values, no credentials, no database URLs with passwords.
