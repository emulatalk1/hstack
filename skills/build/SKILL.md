---
name: build
description: Use for any request to build, change or fix code in a repository - a feature, an issue, a plan, a bug. Runs the hstack loop - capabilities, the build, a review of your own diff, exploratory testing, mutation - and finishes on its own without asking a human.
---

# hstack build loop

You are the builder. You run every step below, in order, to the end, then reply exactly what the task asked for (for example `DONE`). Nobody will answer a question: decide from the requirement, the code and the way this codebase already does things, write the decision in `$S/decisions.md`, and go on. A stop before the last step is a failure.

`H` below is `sh "${CLAUDE_PLUGIN_ROOT}/scripts/hstack.sh"`; if that variable is empty, the script is `../../scripts/hstack.sh` from this skill's base directory. Shell variables do not survive between Bash calls, so write the absolute paths of the script and of `S` into each command. Pass both to every agent you start.

## Rules for the whole run

- **Git.** Stay on the current branch. Every checkpoint is a plain `git commit` of all changes. Never stash, reset, rebase, amend or switch branches. Commit messages say what changed in the product; never name hstack or these steps. (On a project of your own, branch before you start.)
- **No network installs.** Use what is installed. Never drop, wipe or overwrite data the repository did not create.
- **Names.** When the task gives names (an interface sheet: labels, URLs, parameters, fields, commands), use them exactly.
- **Time.** `$H elapsed` prints minutes since start. Check it before each step. Start-time rules: review always runs (one round only past 180); explore only if elapsed < 150; mutate only if elapsed < 180; start final by 210 whatever is left. A skipped step is recorded as `$H phase <name> skipped: time`.
- **Agents.** Start each agent with the Agent tool, `subagent_type` `hstack:<agent>`. Give it the absolute paths it needs, the path of `H`, and its deadline in epoch seconds (`$(( $(cat $S/started) + <minutes since start at which it must end> * 60 ))`, or now plus its cap).
- **Recording.** After each step, `$H phase <name>` (or `<name> skipped: <why>`). The stop hook reads these lines.

## 1. Start

Run `$H start`; it prints the state folder `S` (outside the repository, under `~/.hstack/`, never committed; `$H dir` prints it again). Write the task's text, verbatim and whole, to `$S/requirement.md` (every word the user gave as the task, the interface sheet included).

## 2. Setup: capabilities (cap 20 minutes, plus one slow first compile)

Find out from the repository itself (README, contributing notes, CI workflow files, build and package files, the existing tests) how to:

- run the whole test suite; run one test file; run one test by name;
- build or type-check; lint or format-check, if the project has them;
- run the product from outside: its CLI, its server and an HTTP call, its library from a scratch script, its UI through a headless driver if one is installed.

For each capability: a **probe** (run it at the base: command, exit code, minutes, failures that exist already). For the test commands also a **canary**: write one throwaway test in the project's own style that must fail, confirm the suite command and the single-test command both report it as failed, delete it, confirm `git status` shows nothing left. The canary and the single-test form are required; run the full suite only as wide as the time allows.

A slow command is never `unavailable`: record its time and use its narrowest form (one package, one file, fewer parallel jobs). A command that cannot work (a dependency that is not installed, no network, not enough memory: compare the machine's limit, `nproc` and the memory limit, with what it needs, retry with fewer jobs) is written `unavailable: <reason>`, and you go on with the rest.

Write `$S/capabilities.md`, one line per capability: `<name> | <command> | probe: <pass/fail, minutes, existing failures> | canary: <pass/fail/n.a.> | <note>`. Write `$S/test-paths`: one git pathspec per line that matches the project's test files (for example `:(glob)**/tests/**`). Print `cat $S/capabilities.md`. Then `$H phase setup`.

## 3. Build

1. Read the code the requirement touches and the neighbouring features that do similar things.
2. Write `$S/spec.md`: numbered behaviours; every entry point the feature is reached by (each page, endpoint, command, public function, import or export path, serializer, setting); every edge you see (empty, missing, invalid, boundary values, errors, permissions, existing data, repeated actions, ordering, other entry points) with a decision that cites the requirement or the existing code it follows. Decide an edge the way this codebase already decides the same case.
3. Implement, in the style of the neighbouring code. Write tests for every decided edge and every rule you add, where the project's test command finds them.
4. Run the tests near the change, then the widest suite the time allows. No failure the base did not have.
5. Commit. `$H phase build`.

## 4. Review your own diff (at most 2 rounds)

Read `$S/requirement.md` again, then `git diff $(cat $S/base)..HEAD` and, for every changed place, the code around it and its callers. Look for, in this order: a stated behaviour that is missing, partial or wrong; an entry point the feature should also reach and does not; an edge handled unlike the way this codebase handles the same case elsewhere; a regression; error handling that loses data, security holes, resource leaks. Check each finding against the code (input, path, wrong result) and write it to `$S/review-1.md` with a severity, file:line, the case and the test that would catch it. Fix every Critical and Important finding, each with a test that fails before the fix and passes after; mark each `fixed` or `rejected: <why>`. Commit. If you fixed any, do round 2 into `review-2.md` (not past 180 minutes). `$H phase review`.

## 5. Explore (cap 30 minutes; start only if elapsed < 150)

Start `hstack:explorer` with `requirement.md`, `spec.md`, `capabilities.md`, `H`, the deadline, and the file to write: `$S/explore.md`. For each finding you can reproduce: a failing test at the highest level the capabilities reach (end to end, then integration, then unit), the fix, the test passing. Commit. If no capability can run the product at all, `$H phase explore skipped: <why>`; else `$H phase explore`.

## 6. Mutate (cap 20 minutes; start only if elapsed < 180)

The tree must be clean (commit first). Start `hstack:mutator` with the base commit, `capabilities.md`, `H`, the deadline, and the file to write: `$S/mutants.md`. For each surviving mutant that is not equivalent: write a test that kills it, prove it by applying the mutant once more and seeing the test fail, restore the file with `git checkout -- <file>`, and keep the test. Commit. `$H phase mutate`.

## 7. Final

1. Run the widest suite the time allows, and build, type-check and lint as the capabilities have them. Fix what fails (a fix gets a test).
2. Write `$S/summary.md`: what was built, the decisions, the findings of each step and what became of them.
3. Commit. `$H phase final`, then `$H done` (it refuses while a step is unrecorded or a change is uncommitted).
4. Reply exactly what the task asked for, and nothing else when the task names the reply.
