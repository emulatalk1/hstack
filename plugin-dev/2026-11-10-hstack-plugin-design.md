# hstack plugin v0.2: design

Status: approved by the advisor on the user's delegation (2026-11-10): decision 1 (a) with per-layer start gates, decision 2 (a), commits on the current branch. Lives in `plugin-dev/`, outside the benchmark's export list, so no arm ever reads it.

## Intent

One build loop that an agent runs on its own, on any stack, and whose output provably meets the requirement: an independent oracle written from the requirement before any code, a gate that keeps those tests from being weakened, a reviewer and an exploratory evaluator in their own contexts, and a mutation check on the changed lines. The benchmark (prereg sections 2, 3, 9, 13) measures it against plain Claude Code: build score (H1), unstated spec edges (H2), interventions (H3), the weak variant W (H4), and how well the written tests catch seeded bugs (H5).

## Facts this design rests on

Measured or read, not assumed:

- **The arm's invocation** (`bench/lib/agent.mjs`, `bench/box.mjs`, `bench/run-arm.mjs`): `claude -p <requirement + interface sheet + "When the task is done, reply exactly DONE.">`, `--setting-sources project,local --strict-mcp-config --permission-mode bypassPermissions --settings {} --plugin-dir /arm/plugins/hstack`, web tools off, model `claude-opus-5-5`, CLI 2.1.318. A turn whose last reply is not `DONE` gets a resume and costs 1 intervention (at most 5); a timeout or an abandoned run costs 3 and is graded as it stands. Turn limit 4 h (external) or 8 h (real-estate). The box has 6 GB, no network but the API, the task's own image plus git: **no Bun, maybe no Node or Python**. The product is `git add -A` of the work tree plus a bundle of HEAD; `.git` itself never leaves.
- **Spike on CLI 2.1.318** (scratchpad, 2026-11-10), same flags as the box: a plugin's `SessionStart` hook output reaches the model's context; `SessionStart` fires again on `--resume` (`source: resume`); a `Stop` hook that prints `{"decision":"block","reason":…}` makes the agent continue, and the run still ends with the reply `DONE`; the Stop input carries `stop_hook_active` and `last_assistant_message`; a plugin agent is called with `subagent_type: "<plugin>:<agent>"`; the init event lists the plugin by name, its skills as `<plugin>:<skill>`, and no `AskUserQuestion`.
- **Prior evidence** (`docs/design/2026-10-26-layers.md`, memory of steps 3–9): in blind replay on 74 held-out bugs, the exploratory evaluator caught 9, e2e 7, unit 1, integration 1, review 0 of 47 and audit 0 of 47. The 17 of 20 credited to review comes from the written attribution record, never reproduced. Bugs lived at spec edges the requirement did not state. So the layer that runs the product carries real weight, and review stays because the prereg's W definition needs it and it is cheap, not because the replay proved it.

## Goals, non-goals, anti-goals

Goals: finish in the first turn with the reply the task asks for; no question to a human; tests in the project's own suite (H5 reads them); every stated behaviour covered by a test written before the code; spec edges decided the way the codebase already decides them.

Non-goals: tool or stack knowledge in the plugin (the agent picks tools at setup and writes them down); the old Docker/port safety layer (frozen, see below); a W build (designed for, not built).

Anti-goals: a run that times out because of the plugin's layers; a plugin file that needs a runtime the box lacks; harness files in the product (state stays under `~/.hstack/`); a gate that loops forever.

## Parts

All plugin content sits in the allowlisted folders. No dependency on another plugin.

| Path | What it is |
|---|---|
| `.claude-plugin/plugin.json` | version 0.2.0 |
| `hooks/hooks.json` | the two hooks, both `sh scripts/hstack.sh hook-start` / `hook-stop` |
| `scripts/hstack.sh` | run state and the hooks: `start`, `phase`, `missing`, `lock`, `gate`, `elapsed`, `done`, `hook-start`, `hook-stop`; POSIX sh + git (tested under dash on Debian and macOS sh) |
| `skills/build/SKILL.md` | `hstack:build`, the loop |
| `agents/oracle.md`, `agents/reviewer.md`, `agents/explorer.md`, `agents/mutator.md` | the four own-context agents (`model` inherited) |
| `skills/hstack-init`, `skills/hstack-safety`, `scripts/*.mjs` | unchanged except `disable-model-invocation: true` on both skills: they need Bun and a stack A/B manifest, so a build agent must never pick them. `tests/` keeps them green |

Development files (`plugin-dev/`): this design and `test-hstack.sh`, the sh tests of the hooks and the script.

### Run state

`S = ${HSTACK_STATE:-$HOME/.hstack}/<cksum of the absolute git dir>`. Never committed, never in the product, private to a worktree. Not inside `.git`: the first end-to-end run (2026-11-10) showed Claude Code refusing Write-tool writes there, and the agent stopped to ask. Files: `base` (commit at start), `started` (epoch seconds), `requirement.md` (the task text, verbatim), `capabilities.md`, `test-paths` (git pathspecs of the project's tests), `oracle.lock` (`<blob> <path>`), `oracle-report.md`, `spec.md`, `decisions.md`, `phases`, `review-<n>.md`, `explore.md`, `mutants.md`, `summary.md`, `done` (HEAD at the final check), `session-head`, `stop-blocks`.

`hstack.sh start` moves an earlier run's folder to `S/old/<time>/` and begins a new one.

### Hooks

- **SessionStart** writes `session-head` (HEAD and a hash of `git status --porcelain`) only when its input says `"source":"startup"` (a resume must not reset what "nothing changed" compares with), resets `stop-blocks` to 0 on `startup` and `resume` only (a compaction inside a process keeps the count), and prints: hstack is installed; for any request to build, change or fix code here, invoke `hstack:build` first and follow it to the end; no human answers questions, so decide from the requirement and the code and record the decision.
- **Stop** allows the stop when: not a git repo; or `done` equals HEAD and the tree is clean; or no run was started and HEAD and the status hash equal `session-head` (nothing was changed: a probe or a question). Otherwise it blocks with a reason naming the missing phases (or "changed after the final check"), at most 3 times per process (`stop-blocks`), then allows. The reason always ends: when finished, end with exactly the reply the task asked for. A block is the harness's own reminder, not an intervention (prereg 9.3).

### The loop (`hstack:build`)

Every step appends its name to `phases` with `hstack.sh phase <name>`, or `<name> skipped: <reason>`. The Stop gate requires: `setup oracle build gate review explore mutate final`.

1. **Start.** `hstack.sh start`; write the task text verbatim to `requirement.md`.
2. **Setup (capabilities).** From the repo itself (README, contributing notes, CI files, build files, existing tests) find: run all tests, run one file or one test, build or type-check, lint, and run the product from outside (CLI, server plus HTTP, a library through a scratch script, a UI if a headless driver is installed). For each: a **probe** on the base (command, exit, time, baseline failures) and, for the test commands, a **canary**: a throwaway failing test in the project's style that the command must report as failed (whole suite and single-test form), then removed and the tree checked clean. The required proofs are the canary and the single-test form; a full-suite baseline is run only as wide as the time allows. Write `capabilities.md` (one line per capability: command, probe, canary, measured time, note) and `test-paths`. Install nothing that needs the network. A slow command is never `unavailable`: record its time and use its narrowest form (one package, one file, fewer jobs). A capability that cannot work (missing dependency; memory: compare the machine's limit with what the command needs, then retry with fewer jobs) is written `unavailable: <reason>`. End by printing `capabilities.md`, so the evidence is in the transcript (prereg 13.4 reads it there). Cap: 20 minutes of work, plus the measured time of one compile when the first build is slower.
3. **Oracle** *(W removes)*. `hstack:oracle` gets the paths of `requirement.md` and `capabilities.md` and nothing of the builder's. On every call, first or dispute, it reads only those, its own tests, the dispute entry and the repo's code for public interfaces and test style; never `spec.md`, `decisions.md`, `disputes.md` beyond the entry it is given, or the builder's diff. It reads the repo for public interfaces and test conventions and writes black-box tests at public interfaces, in new files where the project's test command finds them: one or more per stated behaviour, using the interface sheet's names exactly, plus edges that follow from the requirement or from how the codebase handles the same case elsewhere (cited). Every other edge it lists as **open** in `oracle-report.md` (behaviour → test, open edges, assumptions). It runs the tests on the base: each fails because the feature is absent, or is marked as guarding behaviour that exists. The builder runs `hstack.sh lock <files>` and commits them, recording that commit in `oracle-commit` (the gate restores a changed file from it). Cap: 30 minutes.
4. **Build.** Write `spec.md`: numbered behaviours, every entry point the feature reaches (each way a user or caller gets to it), and each open edge with a decision that cites the requirement or the existing code it follows. Implement, consistent with the neighbouring code. Write tests for every decided edge and internal rule. Make the oracle's tests pass without editing them. **Dispute** *(W removes)*: if an oracle test contradicts the requirement or an interface fact, write the claim in `disputes.md` and ask `hstack:oracle` again with the requirement, the test and the claim; only the oracle edits its test, then `lock` again; at most 2 rounds. Run the tests near the change, then the widest suite the time allows; no failure that the base did not have. Commit.
5. **Gate** *(W removes)*. `hstack.sh gate` must exit 0: every locked oracle file matches its lock, and it prints every pre-existing test file deleted or renamed since `base`, and every removed or altered line in a pre-existing test file. Added lines pass (a builder may append cases to an existing test file). Each removed or altered line needs an entry in `decisions.md` quoting the requirement that changes the behaviour; the reviewer judges them.
6. **Review** *(W replaces with the builder's own review)*. `hstack:reviewer` gets `requirement.md`, `spec.md`, `base` and the gate output, and reads `git diff base..HEAD` with the code around it: behaviours missing or wrong, edges handled unlike the codebase, entry points not covered, regressions, weakened tests, error handling, data loss, security. Each finding has a severity, file:line, a concrete failing case and the test that would catch it. The builder fixes Critical and Important ones, each with a test that fails before the fix, commits, and runs the reviewer once more if it fixed any. At most 2 rounds.
7. **Explore.** `hstack:explorer` gets `requirement.md`, `spec.md` and `capabilities.md`, runs the product from outside as the capabilities say, and tries each behaviour, its edges and about 10 more actions per behaviour. It edits no tracked file, stops what it started and leaves the tree clean. Each finding has a reproduction, the expected result (quoted) and the observed one. The builder turns each confirmed finding into a failing test at the highest level the capabilities reach, then fixes and commits. Skipped only when no capability can run the product. Cap: 30 minutes.
8. **Mutate.** With a clean tree, `hstack:mutator` reads `git diff base..HEAD -U0` (source only), makes up to 20 one-line mutants (conditions, bounds, removed calls, early returns, constants), runs the narrowest tests that cover each, records killed, survived or error, and restores each file with `git checkout -- <file>`. The builder adds a test for each survivor that is not equivalent, proves it kills the mutant by applying it once more, and commits. Cap: 20 minutes.
9. **Final.** Run the oracle tests, the widest suite the time allows, and build, type-check and lint as the capabilities have them; `gate` again; write `summary.md` (what was built, decisions, findings per layer); commit; `hstack.sh done`. Then reply exactly what the task asks for.

**Git.** Stay on the current branch; every checkpoint is a plain commit; no stash, reset, rebase, amend or branch switch (the product is HEAD after `git add -A`, the mutator restores with `git checkout -- <file>`, and the Stop gate reads `git status`). Commit messages name the change, never the harness (prereg 13.5 strips harness traces from what raters see).

**Time.** `hstack.sh elapsed` prints minutes since `start`. The Agent tool has no timeout, so the caps are held this way: each own-context agent gets an absolute deadline (epoch seconds, from `started` plus its cap) in its prompt and checks `date +%s` between its steps; the builder checks `elapsed` between steps. Start gates, checked before each layer (decided by the advisor on the user's delegation, 2026-11-10): review always runs, one round only past 180; explore starts only if elapsed < 150; mutate only if elapsed < 180; final starts by 210 whatever is left. A gate that closes records `skipped: time`. These numbers can be revised after the trial reports minutes per run, before the step 12 lock. Each layer has its own cap above. Reason: a timeout costs 3 interventions and the plugin cannot know the turn limit.

**No questions.** The skill and every agent say: no human will answer; decide from the requirement, the interface sheet and the code, write the decision in `decisions.md`, go on. Never install from the network, never drop data the repo did not create.

## W (prereg section 3)

W = H with the three marked parts removed: step 3 and the dispute rule (independent oracle), step 5 and the oracle half of the Stop gate's phases (gate against weakened tests), and step 6 replaced by "review your own diff against the requirement". The marks *(W removes)* name every place, so W is a one-commit diff when step 13 needs it.

## Left to the builder

The exact wording of the skill and agent prompts; the shape of `capabilities.md` lines; how `gate` prints the removed lines. These change no behaviour above.

## Handoff

When built and checked: the plugin commit sha, and "dependencies: none" (no other plugin is loaded or needed).
