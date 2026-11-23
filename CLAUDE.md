End any turn that reports on long-running or delegated work with a short status, one item per line: **Goal**, **Done**, **Next**, **Needs you** (or "nothing").

# Reference for the agent

The hooks of the build loop, and the older scripts that the skills `hstack-init` and `hstack-safety` run. Run the scripts from a clone of this repository.

## Hooks of `hstack:build`

- A session-start nudge.
- A note of the repository's state, taken when a turn starts.
- A stop gate that refuses to end an unfinished run (at most 3 times per process).

The stop gate lets through:

- a turn in which nothing changed in the repository, whatever you changed there before it (in a brainstorm, after a finished run, or beside a run that a new session finds, finished or abandoned);
- a turn that ends with a spec for you to approve;
- a turn you spend on `/hstack:hstack-feedback`.

While a spec waits for your approval, a change in the repository still holds the turn: the approval would refuse it. One case is left: when you interrupt a turn and then change the repository yourself, the next turn is judged from where the interrupted one started.

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
