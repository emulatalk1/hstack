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
| `testTitle` | regex whose first group is a test title, to find the tests added or changed from a fix on |
| `timeoutSec` | bounds the ready wait and every oracle or layer command (default 1800) |

## Environment of every command

`BENCH_DIR` (worktree), `BENCH_DB`, `BENCH_PORT`, `BENCH_URL` (`http://localhost:<port>`), `BENCH_JUNIT` (absolute); the oracle also gets `BENCH_ORACLE` (the oracle folder), a layer `BENCH_EXCLUDE` (a file with one excluded title per line, empty in a baseline run; bench decides what counts, so a layer should run every test: one that skips the titles makes its baseline serve one bug only, can break a later test that needs a skipped one, and shows the titles in `ps` when they ride in argv). A command that creates or drops a database asserts the `bench_` pattern on the name first.

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
bun bench/sealed-agent.mjs <task.json> <label> --prompt <file> --out <file> [--at <commit>] [--tools <name,name,...>] [--settings <file>]
bun bench/bugs.mjs <task.json> <folder> [--sealed] [--usable <unit|int|e2e|evaluator|review|audit> | --fix-tally <sha,sha,...> | --at-tally]
bun bench/replay-summary.mjs <results dir> --set <name>=<bug folder> [--set <name>=<bug folder> ...]
```

`sealed-agent` runs one `claude -p` with the prompt file's text and the listed tools (none by default), in an empty folder or the files of `--at` with no `.git` and no `.claude/settings.json`, and the agent env (no `BENCH_*`, `PG*`, `HSTACK_BENCH_MACHINE`, `DATABASE_URL` or `PAYLOAD_DROP_DATABASE`; `DOCKER_HOST=unix:///nonexistent`), with `--no-session-persistence` (`noPersist`) so no transcript is kept under `~/.claude/projects`, and with `--settings <file>` the file's absolute path as `claude --settings` (permission rules, `additionalDirectories`; a missing file is refused); it writes the reply to `--out` and `<out>.run.json` (`label`, `at`, `settings` (absolute path or `null`), `start`, `end`, `code`, `version`, `tools`, `usage`, `models`), refuses an existing `--out` or run record, and on no result or a non-zero exit writes only the run record and exits 1.

`grade --at` prints `<sha7> junit=<ok|missing|timeout> pass=… excluded=… build=…` and exits non-zero when the JUnit is not ok (the grade file is still written). It reads every `validation-*.json` next to the oracle folder and leaves out of the score each check whose verdict there is `weak`, `broken` or `pre-existing` (spec 7.1); the grade file lists them as `excluded: [{ id, verdict }]` and keeps their per-check result.

`--validate` runs the oracle on the ref, on every known-bad version (`--bad`, more than once: the fix's parent and the task's end product; the old `--validate <ref> <bad>` form still works) and on the base. Verdicts, in this order: `broken` (ref not pass), `weak` (passes on any bad), `broken` (any bad neither pass nor fail), `pre-existing` (base fails), `absent-at-base` (base precondition), `broken` (base error: the base run gave no result), `valid` (base passes, or no base). Sealed mode prints only `<id> caught|missed|error`. `bug.json` is `{ id, at, patch, fix }`, `patch` relative to it and in the fix's direction (replay applies it with `-R`); agent-replay adds `task` (the task that introduced the bug) and, for review and audit, that task's `base` and `end` (and needs `fix`: a bug whose fix is already in `end` is refused, since the end product holds the fix). agent-replay and run-arm refuse a run whose record in `results/` exists. The review layer's agent works in a folder that holds one file, `task.diff` (`git diff <base> <end>`), and its prompt names the file instead of carrying the diff, so a task diff over 1 MB still starts. Every agent (replay, judge, sealed, arm) gets `agentEnv()`: no `BENCH_*`, `PG*`, `HSTACK_BENCH_MACHINE`, `DATABASE_URL` or `PAYLOAD_DROP_DATABASE`, and `DOCKER_HOST=unix:///nonexistent`, so its docker CLI reaches no daemon (the inputs of p1-p6c say `docker compose down -v`); setup and teardown run with the bench env. agent-replay's layer and judge calls and sealed-agent pass `noPersist` (`--no-session-persistence`); run-arm does not, since it resumes its session.

An arm record (`results/<task>-<arm>-<n>.json`) holds the CLI `version` from the init event, and `leak: true|false` with `leakTurns`, the kept transcripts that name the data folder or the task repo (written or resolved path). The arm agent can read both by absolute path: the flag only detects it, and a sandbox must replace it before prereg step 8.

`replay` first checks that the patch reverse-applies (`git apply -R --check` in a throwaway worktree at `at`); one that does not is an error (exit 2, sealed: `<id> patch does not apply`) before any baseline is read or run. It then runs the layer at `at` without the bug: the baseline, kept as `<data>/results/baseline-<task>-<at7>-<layer>.xml` and reused by every bug at that task, commit and layer (delete it to rerun; a baseline with no results or no non-skip case is `<id> error` and is not kept). It then runs the layer with the patch reverse-applied. Excluded titles are the tests added or changed in test files from the fix's parent to `at` (`git diff <fix>^ <at>`, files read at `at`; spec 8.1: the failing assertion must have existed before the fix); a title with no literal text (only `%s`, `$name`, `${x}`) would match every case and is dropped (dev mode says so on stderr). A catch is a failing case that is neither excluded nor failing in the baseline, matched by name. Dev mode prints each failing case as `FAIL <name>`, marked `(excluded)` or `(fails at baseline)` when it does not count, and the baseline file and its failing count on stderr; sealed mode is quiet in both runs. `fix` must not be a merge commit.

`bugs` reads every `<folder>/*.json` except `*.run.json`, `done.json` and `<name>-done.json` as a bug file: `{ id, fix, at, patch, description, hunks: [{ file, old }], kind?, severity?, source?, dropped? }`, `old` the start of the hunk's old side in `git diff -U0 --no-renames <fix>^ <fix>` (a pure addition gives the line it follows), `dropped` a reason. Without `--usable` it checks each bug and writes into its file `task` (the owner, `null` with none), `base` and `end` (from `tasks.json`, only with an owner) and `out`, the first that holds of `"dropped"`, `"patch does not apply"` (`git apply -R --check` at `at`, in a throwaway `check-<id>` worktree), `"fix is a merge commit"`, `"no owner"`, `"fix in end"` (`git merge-base --is-ancestor <fix> <end>`), else `null`. The owner is the task with the most `task_lines` in `<data>/tasks/<task>.tsv` over the rows that match a hunk (`commit` = the fix's 7-char sha, same `file`, `old_lines` starting at `old`), a tie going to the earlier task in `tasks.json`; with no such row, the first task whose range (`git rev-list --first-parent <base>..<end>`) holds the fix. Usable: unit, int and e2e take `out` `null`, `"no owner"` or `"fix in end"`; the evaluator `null` or `"fix in end"`; review and audit `null`. `--usable <layer>` prints the usable bug file paths, one per line; it reads only the written `out` (a file without one is an error: run the check first), runs no git and writes nothing, so batches running at once can all call it. `--fix-tally <sha,...>` (each `^[0-9a-f]{7,40}$`, else refused) prints, per listed sha only, `<sha> <n>`: the number of bug files whose `fix` starts with it; no git, no write, and no other sha or value is printed; a count still tells whether a listed sha is a held-out fix, so a list of every commit would name them all: on a sealed folder, run it only on the registered list (the 6 catalog shas and the dev shas, prereg §8.2). `--at-tally` prints only `at: 69ebe27 <n>, other <m>`: the number of bug files whose `at` is `69ebe27` (the base every bug file names) and of all the others (another value, none, or a file that does not parse); no git, no write, so it is safe on a sealed folder. Dev mode prints `<id> task=<task|none> out=<out|ok>` per bug, then the totals; sealed mode prints only the totals: bugs, by `source`, `kind`, `severity`, owner task and `out`, the dropped bugs by `source`, usable per layer, the ids whose `out` is `patch does not apply` or `fix is a merge commit`, `finished: <value>` from `<folder>/done.json` (that field only), `<name>-done: considered <n>, finished <value>` per `<name>-done.json` (a sealed agent's progress note; the name printed only when it is 1-16 of `a-z0-9`, else `other-done`) and `usage <input>/<output>/<cacheRead>/<cacheWrite> models <list>` summed over `<folder>/*.run.json`. A file that is not a valid bug file prints `<file name> invalid` (dev mode adds why) and the exit is 1. Sealed mode prints no string a bug file's writer chose outside its shape: a bug id must match `^ho-\d+$` (else the file is invalid), a file not named `ho-<n>.json` that is invalid (a run record too) is only counted (`invalid <n>`), a `source` outside catalog/extension, `kind` outside UI/logic/validation/data/other, `severity` outside high/medium/low and a model not named `claude-<a-z0-9->` count as `other-value`, and a `finished` that is not a boolean prints `finished: invalid`. Each write goes to a temp file in the folder that is then renamed over the bug file.

`replay-summary` counts the verdicts in `<results dir>` per layer and bug set and prints markdown: n, caught, missed, error and the catch rate over caught + missed; `unit+int` (a bug caught by either; else error if either errored, else missed); the severity-weighted rate (high 3, medium 2, low 1; error runs and bugs without a severity left out, those bugs counted on an `unweighted bugs` line) for a set with severities; the summed `layer` + `judge` usage and models per agent layer (every run's tokens, an `.error1.json` too; the verdict is the good record's); a per-bug table. A `<id>-<layer>.out` that is empty or has no `<id> caught|missed|error` last line, a record that is not a verdict, and a bug whose only file is `.error1.*` count as `error`; a good rerun file wins over its `.error1.*`; `baseline-*.xml` and a bug in no given set (or `dropped`) are ignored. It prints ids, verdicts, severity-based aggregates, usage and model names (`claude-<a-z0-9->`, else `other-value`) only, never a description, quote, finding, fix, file or hunk, so it is safe on a sealed folder.

## Data layout (`<data>` = the machine file's folder)

```
machine.json  arms.json
tasks.json                                { "<task>": { plan, no, base, end, n, harness } } per task
tasks/<task>.tsv                          per fix hunk the task touched: commit file old_lines task_lines tests_changed subject (task_lines: its old-side lines from this task)
briefs/                                   sealed-agent briefs: filter.md, interface.md (interface-v1.md superseded)
env/<task>.json  env/<task>/*.sh          task files and their scripts
env/<task>/briefs/                        layer briefs (review.md, audit.md, evaluator.md) and their SOURCES.md
<task>/{filter-source.md, input.md, filter-log.md}   the filter's source text, the filtered input, its log (filter*.run.json beside)
<task>/interface.md                       the interface sheet (interface*.run.json beside: its run and fix records)
<task>/superseded/                        earlier sheets and their records (interface-v1*, interface-main*)
<task>/oracle/{manifest.json,*.spec.*}    the oracle; <task>/labels.json buckets its checks
<task>/grades/<sha7>.json                 grade --at, and each run of --validate
<task>/validation-<ref7>.json             --validate verdicts: { ref, bad: [...], base, checks: [{ id, ref, bad: [...], base, verdict }] }
results/                                  agent-replay and run-arm records, one folder per arm run, replay baselines
replay-dev/                               the dev replays of the build (smoke.md, bug files, patches, logs, agent/ records); bugs/ the 20 dev bug files of step 3
transcripts/                              the bench agents' session transcripts from before noPersist (moved from ~/.claude/projects)
```
