# bench: the benchmark tools

Bun scripts for the measuring stick: run a task's product in a throwaway worktree, grade it against a hidden oracle, replay a bug against a layer, run an arm headless. Tasks, oracles, bugs and results live in the data folder, never here. Set `HSTACK_BENCH_MACHINE` to the machine file (`<data>/machine.json`, `{ "forbid": { "paths": [...] } }`); its folder is the data folder.

## Task file (`<data>/env/<task>.json`)

| field | meaning |
|---|---|
| `name` | short id, `^[a-z0-9][a-z0-9_-]*$`; worktrees are `/tmp/hstack-bench/<name>-<label>` |
| `repo` | absolute path of the product repo; refused under a forbidden path |
| `db` | `null` or a database name matching `^bench_[a-z0-9_]+$` |
| `port`, `ready` | the app's port (must be free) and the URL that answers 2xx-4xx once it is up |
| `setup[]`, `start`, `teardown[]` | shell commands (`sh -c`, cwd = worktree); `start` runs in its own process group and is killed after |
| `oracle` | the command that runs the oracle and writes JUnit at `BENCH_JUNIT` |
| `junit` | the JUnit path, relative to the worktree; grade and replay refuse an absolute path or one that leaves the worktree (the file is deleted before a run and goes with the worktree) |
| `layers` | `{ unit, int, e2e: <command> }` for replay; `{ review, audit, evaluator: { brief, tools?, allow? } }` for agent-replay |
| `testTitle` | regex whose first group is a test title, to find the tests a fix added |
| `timeoutSec` | bounds the ready wait and every oracle or layer command (default 1800) |

## Environment of every command

`BENCH_DIR` (worktree), `BENCH_DB`, `BENCH_PORT`, `BENCH_URL` (`http://localhost:<port>`), `BENCH_JUNIT` (absolute); the oracle also gets `BENCH_ORACLE` (the oracle folder), a layer `BENCH_EXCLUDE` (a file with one excluded title per line: the tests the fix added or changed; a layer may skip them to save time only if no other test needs them, since bench decides what counts). A command that creates or drops a database asserts the `bench_` pattern on the name first.

## Contracts

- **JUnit**: one `<testcase>` per check; its `name` starts with the check id (`<sha7>-T<n> ...`). A case with `<failure>` or `<error>` fails, one with `<skipped>` is an error, a missing case is an error.
- **`PRECONDITION:`**: each check first asserts that its feature's page, form, field or endpoint exists, with a message that starts with `PRECONDITION:`. A failed case is `precondition` (feature missing) when a line of its message starts, after spaces and an optional `<Word>Error: ` (`Error: `, `AssertionError: `), with `PRECONDITION:`; otherwise it is `fail`.

## Commands

```sh
bun bench/env.mjs up <task.json> <commit>          # the app at a commit until Ctrl-C
bun bench/env.mjs clean                            # remove everything under /tmp/hstack-bench
bun bench/grade.mjs <task.json> <oracle dir> --at <commit>
bun bench/grade.mjs <task.json> <oracle dir> --validate <ref> --bad <commit> [--bad <commit> ...] [--base <commit>]
bun bench/replay.mjs <task.json> <bug.json> <unit|int|e2e> [--sealed]        # starts no app; the layer does
bun bench/agent-replay.mjs <task.json> <bug.json> <review|audit|evaluator> [--sealed]
bun bench/run-arm.mjs <task.json> <B|B-|H|W> <run-no> --input <data>/<task>/input.md --at <base>
```

`grade --at` prints `<sha7> junit=<ok|missing|timeout> pass=… excluded=… build=…` and exits non-zero when the JUnit is not ok (the grade file is still written). It reads every `validation-*.json` next to the oracle folder and leaves out of the score each check whose verdict there is `weak`, `broken` or `pre-existing` (spec 7.1); the grade file lists them as `excluded: [{ id, verdict }]` and keeps their per-check result.

`--validate` runs the oracle on the ref, on every known-bad version (`--bad`, more than once: the fix's parent and the task's end product; the old `--validate <ref> <bad>` form still works) and on the base. Verdicts, in this order: `broken` (ref not pass), `weak` (passes on any bad), `broken` (any bad neither pass nor fail), `pre-existing` (base fails), `absent-at-base` (base precondition), `broken` (base error: the base run gave no result), `valid` (base passes, or no base). Sealed mode prints only `<id> caught|missed|error`. `bug.json` is `{ id, at, patch, fix }`, `patch` relative to it and in the fix's direction (replay applies it with `-R`); agent-replay adds `task` (the task that introduced the bug) and, for review and audit, that task's `base` and `end`.

## Data layout (`<data>` = the machine file's folder)

```
machine.json  arms.json
env/<task>.json  env/<task>/*.sh          task files and their scripts
<task>/input.md                           filtered input of a task
<task>/oracle/{manifest.json,*.spec.*}    the oracle; <task>/labels.json buckets its checks
<task>/grades/<sha7>.json                 grade --at, and each run of --validate
<task>/validation-<ref7>.json             --validate verdicts: { ref, bad: [...], base, checks: [{ id, ref, bad: [...], base, verdict }] }
results/                                  agent-replay and run-arm records, one folder per arm run
```
