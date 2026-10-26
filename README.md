# hstack

A Claude Code plugin for an evidence-led build loop: review, mutation testing and blind evaluators, run per project.

**Status: foundation (v0.1.0).** This version sets up a project and guards it. `init` detects the project's stack and writes its manifest. The safety checks answer "may an agent do this?" before it touches Docker, a port, a database or a data folder. The review loop, the evaluators and mutation testing come in later plans (see [Roadmap](#roadmap)).

## Requirements

- Claude Code
- Bun 1.4.4 or later. The scripts use Bun's own APIs; there is nothing to install.
- macOS or Linux. The port check uses `lsof`, and the `docker` and `port` checks read `docker ps`.

## Install

```
/plugin marketplace add emulatalk1/hstack
/plugin install hstack@hstack
```

The repo is private, so your git login must be able to read it. You can also add a local clone: `/plugin marketplace add /path/to/hstack`.

## Skills

| Skill | Use it |
|---|---|
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
- `docker`: the compose file must name its project after this folder's path. It also refuses when `COMPOSE_PROJECT_NAME` or `COMPOSE_FILE` is set, or another compose file sits beside it.
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
```

This runs the tests with `bun:test`, 52 tests. The tests leave nothing behind on the machine: they read `docker ps`, make temp folders they remove, and open short-lived local listeners.

| Path | What it holds |
|---|---|
| `.claude-plugin/` | plugin and marketplace manifests |
| `scripts/` | the command-line scripts; `scripts/lib/` holds one module per job |
| `skills/` | `hstack-init`, `hstack-safety` |
| `tests/` | tests, and their fixtures in `tests/fixtures/` |
| `fixtures/electron/` | the stack B probe app |
| `docs/` | design, plans and stack adapters (an OKF v0.2 bundle) |
| `progress/` | the working log: review cost per task, the build ledger |

## Known limits

- **The `docker` check can still be fooled** by ways of renaming a Compose project that it does not read yet:
  - a `.env` line written `COMPOSE_PROJECT_NAME: x`;
  - a `docker-compose.override.yml` with its own `name:`;
  - a second YAML document in the compose file;
  - `COMPOSE_ENV_FILES`.

  This can't happen today: the check only allows a compose file whose `name:` is hstack's own path-based name, and no project has one yet. It must be fixed before the plan that gives projects their own services.
- `init` warns about every `localhost:<port>` in `src/` and `tests/`, including URLs inside unit tests. Narrowing this to the project's own ports comes with the own-services plan.

## Roadmap

1. Own services per project: its own Postgres and Mailpit, assigned ports, and a compose file named from the folder's path.
2. The evaluator skill, the mutation step and the loop that runs the outside skills.
3. Moving an existing project onto the plugin.

Design: [`docs/design/2026-10-26-layers.md`](docs/design/2026-10-26-layers.md). Plan built so far: [`docs/plans/2026-10-26-hstack-foundation.md`](docs/plans/2026-10-26-hstack-foundation.md).
