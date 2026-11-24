End any turn that reports on long-running or delegated work with a short status, one item per line: **Goal**, **Done**, **Next**, **Needs you** (or "nothing").

# Reference for the agent

The hooks of the build loop, and the older scripts that the skills `hstack-init` and `hstack-safety` run. Run the scripts from a clone of this repository.

## Hooks of `hstack:build`

The loop runs only when you invoke it: `/hstack:build` with a request, or with the name of a spec to take it up again. The agent cannot start it by itself.

- A session-start nudge. It names a spec that waits for your approval, or an approved run of an earlier session that is not finished, with the command that takes it up.
- A note of the repository's state, taken when a turn starts.
- A stop gate that refuses to end an unfinished run of this session (at most 3 times per process).
- A worktree guard: while a run of this session is not finished, the session's worktree tool (`EnterWorktree`, `ExitWorktree`) is refused, so the session neither moves into another worktree nor leaves the one it is in.
- An end hook (`SessionEnd`): when a session is cleared with `/clear`, it leaves a mark, and the cleared session keeps its run under its new id. With no mark, the session is told of the run and of the command that takes it up.

The stop gate holds only two things:

- a run of this session that is not finished, whatever the turn changed, in whichever work tree of the repository it is and wherever the session's folder is now; when the run's folder was switched to another branch, it names both branches;
- a spec of this session that waits for your approval, when the repository changed: the approval would refuse it.

Everything else ends: a turn with no run (a git sync, a small fix, a docs edit), a turn after a finished run, and a turn beside a run or a waiting spec of an earlier session. An unfinished run of an earlier session is taken up with `/hstack:build <its spec's name>`, from any work tree of the repository; new work beside it goes into a worktree that the session's worktree tool makes under `.claude/worktrees/`.

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

### `mockup`: the mock-up server of a brainstorm

```
bun scripts/mockup.ts start [--dir <folder>] [--open] [--host <host>] [--url-host <host>] [--allow-network]
                            [--idle-timeout-minutes <n>] [--foreground | --background]
bun scripts/mockup.ts stop <session folder>
```

During a brainstorm the agent can show mock-ups in a browser tab. `start` runs a small server and prints one line of JSON with the `url` to open (it carries the session's key, and every request without the key is refused), the folder to write screens into (`screen_dir`) and the folder the server keeps its files in (`state_dir`). The server shows the newest `.html` file of `screen_dir`: a whole page as it is, anything else inside a frame with styles for options, cards and wireframes. A click on a choice is written to `state_dir/events`, one line of JSON each, for the agent to read.

- `--dir <folder>`: keep the sessions in this folder, one sub-folder each. The screens stay after `stop`, and the next `start` takes the same port and key, so an open tab connects again. Without it the session is in the system's temporary folder and `stop` deletes it.
- `--open`: open the browser at the first screen.
- `--host <host>`, `--url-host <host>`: the address to listen on (`127.0.0.1` when not given) and the host shown in the `url`. Any address but this machine's own (`127.0.0.1`, `localhost`, `::1`) opens the server to the network, and is refused until `--allow-network` is given: the agent asks you first. The line of JSON then lists, under `reachable_at`, each address the server can be reached on and whether it is a `tailscale` or another `network` address. On a local network the link is plain HTTP, not encrypted; to keep it to your tailnet, give the machine's tailnet address as the host.
- `--idle-timeout-minutes <n>`: the server ends by itself after this long without use (4 hours when not given), and also when the coding tool that started it has ended.
- `--foreground` (also `--no-daemon`), `--background` (also `--daemon`): where the server runs. `start` puts it in the background and returns, except on Windows and where background processes are reaped.

`stop <session folder>` ends the server of that session, and no other process. The script and its page are third-party work converted to TypeScript; the licence is in `scripts/LICENSE-mockup`.
