# hstack

A Claude Code plugin for an evidence-led build loop: review, mutation testing and blind evaluators, run per project.

**Status: v0.4.0.** `hstack:build` is a build loop for any stack. It starts with a **spec**: the feature's behaviours, in sentences a user can check, and every place where the request goes against the project's record. Nothing is built before you approve it; after that the loop runs to the end on its own. It finds how to test and run the project (each capability proven by a probe and a canary), has an independent oracle write acceptance tests from the approved spec before any code, builds, gates against weakened tests, then runs a reviewer, an exploratory tester and a mutation check, each in its own context. Its last step keeps the project's **records**: the acceptance steps with the tests that check each, whether it passed, and whether it is left to its tests from now on (`full`: a reviewer found an assertion for every point of the step, and a planted fault made its test fail; else `partial`), a log entry, and, beside the spec, the decisions the builder made alone (`<spec>.decisions.md`). A project with no records gets `docs/specs/`, `progress/feature_list.json` (features and their steps), `progress/test-coverage.md` (how each step is checked) and `progress/progress.md` (the log); the script checks that the first two agree before a run can end. When the code is in a repository of its own, a one-line file `.hstack/repo` in the folder you launch from points to it, and the spec and the records stay out of the code repository. Step 4 is a skill of its own, `hstack:build-implement`, which the loop invokes, with its test rules beside it (`tdd.md`, `writing-good-tests.md`; third-party text, licence in `skills/build-implement/LICENSE-tdd`). Two hooks keep it going: a session-start nudge and a stop gate that refuses to end an unfinished run (at most 3 times per process; a turn that ends with a spec for you to approve is let through, and so is a turn you spend on `/hstack:hstack-feedback`; a run that a new session finds, finished or abandoned, is judged only by what that session changes). The script is TypeScript run with Bun (`scripts/hstack.ts`); its run state lives in `~/.hstack/<checksum of the git dir>/`, never in the work tree or `.git`. Designs: [`plugin-dev/2026-11-20-records-and-questions.md`](plugin-dev/2026-11-20-records-and-questions.md) (0.4.0) and [`plugin-dev/2026-11-10-hstack-plugin-design.md`](plugin-dev/2026-11-10-hstack-plugin-design.md) (0.2); tests of the script: `bun test tests/hstack.test.ts`.

**Benchmark.** The benchmark ([`progress/final-report.md`](progress/final-report.md)) measured plugin commit `653af835fd613e3eb25feb48e4ccc9bfb534ae6e` only; every later version, this one included, is unmeasured. That commit is in `main`'s history and is pinned by the ref `refs/bench/plugins/hstack-653af83`. A plain clone does not fetch that namespace: `git fetch origin refs/bench/plugins/hstack-653af83:refs/bench/plugins/hstack-653af83`.

**Feedback.** When you find a problem with hstack (a bug, something to update or enhance), `/hstack:hstack-feedback <what you found>` writes it up as an issue for `emulatalk1/hstack` (set `HSTACK_FEEDBACK_REPO` for another repository), shows you the exact title and body, and posts only on your yes, with `gh`. An issue holds a description of what hstack did and should have done, then the plugin version, the phase, the kind, the minutes and a few counts of the run. The description is written about hstack, not about your project: no path, name, requirement, error line or code of the project belongs in it, and you read it before it goes. Each stumble of a run (a skipped step, an unavailable capability, a stop gate that gave up) is also recorded by itself in `~/.hstack/<checksum>/feedback/`, on your machine only, and waits there for a description, or for you to dismiss it.

The older stack A/B tools below (`init`, the safety checks) are kept as they were; their skills are user-invoked only (`disable-model-invocation`), because they need Bun and a manifest.

## Prerequisites

To use the plugin:

- Claude Code.
- git.
- [Bun](https://bun.sh) 1.4.4 or later, on the `PATH` of the machine where Claude Code runs, whatever the project's own stack is. The harness's scripts run with Bun and use Bun's own APIs; the plugin itself has nothing to install.
- macOS or Linux. The port check uses `lsof`, and the `docker` and `port` checks read `docker ps`.

Both hooks of `hstack:build` (the session-start nudge and the stop gate) are `bun` commands. On a machine where `bun` is not on the `PATH` of the Claude Code process, both hooks fail (`bun: command not found`) and the stop gate is off. Claude Code shows the person "stop hook problem" at each stop; the agent is told nothing and goes on without the gate (seen on 2026-11-20, Claude Code 2.1.329).

To develop the plugin:

- The same, plus `bun install` once, for the two development dependencies (`typescript`, `@types/bun`). The plugin itself needs neither.
- **Every script of the harness and every test is TypeScript, run with Bun** (`bun <file>.ts`, `bun test`). Add no new `.sh` or `.mjs` file. The `.mjs` files that exist (the older `init`, `check` and `okf-check` tools, and the closed benchmark under `bench/`) stay as they are until they are converted or retired.

## Install

```
/plugin marketplace add emulatalk1/hstack
/plugin install hstack@hstack
```

You can also add a local clone: `/plugin marketplace add /path/to/hstack`.

## Skills

| Skill | Use it |
|---|---|
| `build` | Any request to build, change or fix code. Asks once, for the spec; then runs to the end. Loop agents: `oracle`, `reviewer`, `explorer`, `mutator`. |
| `build-implement` | Step 4 of `build`: the entry points and edges, the feature written test-first, the checks. Invoked by the loop, not by you. |
| `hstack-feedback` | When you find a problem with hstack and want it written up as an issue, or want the open ones listed. User-invoked only; posting needs `gh`. |
| `hstack-init` | Once per project, and again after the project folder is copied or moved. |
| `hstack-safety` | Before any Docker command, port stop, database drop or folder wipe. |

The skills run the scripts below for the agent. You can also run them yourself from a clone of this repo.

## Scripts

### `init`: write the project manifest

```
bun scripts/init.mjs [project root] [--app <subfolder>] [--force]
```

It writes `<project root>/.hstack/manifest.json`, the one place later steps read project facts from: the stack, the commands, the dev server, the database or data folder an agent may wipe, and the compose file. It writes nothing else and never runs `docker compose`.

- The app may sit at the root or in one subfolder. If `init` cannot tell which subfolder, pass `--app`. For a client repo with its own rules, use the parent folder as the root so `.hstack/` stays outside the client repo.
- If a manifest already exists, `init` changes nothing. Pass `--force` to replace it.
- Every `Warning:` line names something to fix: a port written in code, or a compose file without its own project name.
- If the project has a `docs/` folder, `init` ends with a `Docs bundle:` line.

Known stacks:

| Stack | Detected by |
|---|---|
| A: Next.js + Payload + Postgres | `next` and `payload` in `package.json`, plus `pnpm-lock.yaml` |
| B: Electron + electron-vite | `electron-vite` in `devDependencies`, plus `package-lock.json` |

For any other project, `init` says so and writes nothing.

### `check`: the safety checks

```
bun scripts/check.mjs <project root> docker
bun scripts/check.mjs <project root> port <number>
bun scripts/check.mjs <project root> drop <database>
bun scripts/check.mjs <project root> wipe <folder>
```

Exit 0 means allowed. Exit 1 means refused, and the reason is printed in plain English. A check only answers; it never does the action.

- Every check refuses when there is no manifest. It also refuses when the folder was copied or moved since `init`, because the project's Docker name comes from a hash of the folder's path.
- `docker`: the compose file must name its project after this folder's path. It refuses any Compose input it does not read: `COMPOSE_PROJECT_NAME`, `COMPOSE_FILE` or `COMPOSE_ENV_FILES` set in the shell or mentioned anywhere in the `.env` beside it, another compose or override file beside it, and a compose file with several documents, several `name:` lines, a `name:` that is not the first line (after comments or `---`) or not a plain name on one line, unusual line breaks, any top-level line that is not a plain `key:`, `include:` or `<<:`.
- `port`: the port must be free, or every listener on it must belong to this project. A port held by another project's container or process is refused, and hstack never stops it.
- `drop`: only the databases the manifest lists.
- `wipe`: only the data folder the manifest names, never the project or app folder itself.

No hstack script runs `docker compose`, removes a Docker volume or kills a process.

### `okf-check`: check a docs folder

```
bun scripts/okf-check.mjs <docs folder>
```

It checks a `docs/` folder written in the OKF v0.2 format (Open Knowledge Format: Markdown files with a small header block, plus `index.md` and `log.md`), together with hstack's own rules:

- every doc is listed in its folder's `index.md`;
- every `sources` path resolves inside the folder;
- a `stable` doc carries a person's approval (`verified` by `human:<id>`).

It exits 1 when there are errors. It also warns about docs past their `stale_after` date, and about log entries that link no doc.

## Development

```
bun test ./tests
bun x tsc --noEmit
```

The first runs every test with `bun:test`; it takes about 3 minutes (`bun test tests/hstack.test.ts` runs only the tests of the build loop's script, in half a minute). The second type-checks the TypeScript files. The tests leave nothing behind on the machine: they read `docker ps`, make temp folders they remove, and open short-lived local listeners.

| Path | What it holds |
|---|---|
| `.claude-plugin/` | plugin and marketplace manifests |
| `scripts/` | the command-line scripts; `scripts/lib/` holds one module per job |
| `skills/` | `build`, `build-implement`, `hstack-feedback`, `hstack-init`, `hstack-safety` |
| `agents/` | the four agents of the build loop: `oracle`, `reviewer`, `explorer`, `mutator` |
| `hooks/` | the SessionStart and Stop hooks of the build loop |
| `plugin-dev/` | the designs of the build loop |
| `tests/` | tests, and their fixtures in `tests/fixtures/` |
| `bench/` | the closed benchmark's code; its report is `progress/final-report.md` |
| `fixtures/electron/` | the stack B probe app |
| `docs/` | design, plans, decisions and stack adapters (an OKF v0.2 bundle) |
| `progress/` | the working log: review cost per task, the build ledger |

## Known limits

- The `docker` check refuses any Compose input it does not read, so it may refuse a harmless setup: an override file, `include:`, a `---` line inside a block scalar, or a compose file whose `name:` is not its first line (for example after `version:`). That is on purpose; a wrong "allowed" costs more than a wrong "refused".
- `init` warns about every `localhost:<port>` in `src/` and `tests/`, including URLs inside unit tests. Narrowing this to the project's own ports comes with the own-services plan.

## Roadmap

1. Own services per project: its own Postgres and Mailpit, assigned ports, and a compose file named from the folder's path.
2. The evaluator skill, the mutation step and the loop that runs the outside skills.
3. Moving an existing project onto the plugin.

Design: [`docs/design/2026-10-26-layers.md`](docs/design/2026-10-26-layers.md). Plan built so far: [`docs/plans/2026-10-26-hstack-foundation.md`](docs/plans/2026-10-26-hstack-foundation.md).
