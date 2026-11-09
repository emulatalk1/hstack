---
type: plan
title: "Trial run plan"
description: "Prereg step 11: close the five boundary carry-overs of the step 10 lock, move real-estate grading and arms into containers with their own Postgres, regrade every end unchanged, walk external tasks until H1 has 24, build the trial driver and register the trial's rules; the trial itself (H and B, k = 1, 4 tasks, the N rule) runs in a short follow-on plan once a plugin commit exists."
status: draft
generated: { by: claude-code/2.1.318, at: "2026-11-08T18:51:17+07:00" }
verified:
  - { by: claude-code-advisor/2.1.318, at: "2026-11-08T19:03:39+07:00" }
sources:
  - id: prereg
    resource: /plans/2026-10-27-benchmark-prereg.md
  - id: canary
    resource: /plans/2026-11-06-bench-canary.md
  - id: step-oracles
    resource: /plans/2026-11-05-bench-step-oracles.md
  - id: seeded
    resource: /plans/2026-11-05-bench-seeded-bugs.md
  - id: human
    resource: /plans/2026-11-08-bench-human-steps.md
  - id: stick-v1
    resource: /plans/2026-11-08-bench-stick-v1.md
---

# Trial Run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prereg section 12 step 11 in two phases. Phase A, this plan (no plugin needed): the five carry-overs that block Part 2 closed, real-estate graded and boxed in containers with their own Postgres, every end regraded with every oracle kind and shown unchanged, the walk run until 24 external tasks have a step oracle, stick v1 amended, and the trial driver built with the trial's rules registered. Phase B, a follow-on plan written when a plugin commit exists: the trial, arms H and B on 4 tasks with k = 1, its tokens, hours and σ_d measured, the N rule applied, not analysed.

**Architecture:** A product is never built or run with more network than its arm had in the box: its image is the task's base image (built from the trusted base, with network) plus the product's files and the recipe's rebuild lines, made in a container under the arm's network rules and committed. Served tasks are graded in two containers, the app in one with no network, the oracle in a second that shares only its loopback. Real-estate tasks take the shape of an external task (recipe, serve layer, runner, a repo store of their own), so the box, `oracle-run` and the drivers serve both sets. The API token never enters the box: a proxy container holds it and refuses server-side tools.

**Tech Stack:** Bun 1.4.4+, `bun:test`, Docker (`build`, `create`, `cp`, `start`, `exec`, `commit`, `rm`, `rmi`), iptables through the existing `bench-arm/fw:1` helper, `bench/ext.mjs` (`walk`, `serve`, `oracle-run`, `task-env`), `bench/box.mjs`, `bench/canary.mjs`, `bench/oracle.mjs` (step 5 pipeline, `step`, `seed`, `kills`, `score`), `bench/human.mjs proxy`, `bench/stick.mjs`, `bench/power.mjs`.

**Spec:** `docs/plans/2026-10-27-benchmark-prereg.md` sections 2 ("Applied at step 6", the user's decision of 2026-11-05), 3, 4.2 rulings 13–14, 7.3 ("Applied at step 8" rulings 2–15, "Extended at step 8", "Notes at the lock" I1, I2, M3), 8.3 ("Applied at step 7" ruling 1), 9.1–9.3, 10.2, 11, 12 (steps 11–14, "Applied at step 9", "Amended at step 9", "Applied at step 10" rulings 7 and 9); the locks `progress/step10-lock.md` (result, "The stick", "Blocks Part 2", the walk state, findings, known limits), `progress/step8-lock.md` (the box, known limits I1, I2, M1–M4), `progress/step9-lock.md`, `progress/step7-lock.md`, `progress/step6-lock.md`, `progress/step5-lock.md`; `progress/stick-v1/tasks.tsv`, `progress/stick-v1.sha256`; `bench/README.md`.

## What is reused

The box of step 8 (`bench/box.mjs`: one container per run from `<base7>-serve` plus the arm layer, the firewall helper, the network check, the proof, `kill -9 -1`, the bundle back, the `machine` rules) and its driver (`bench/canary.mjs`: `queuePick` order, grade right after each run, resume, the attempt rule, report). `oracle-run`'s images, scratch exports, recorded names and removal. `serve`'s sealed rounds, which become the pattern of the rebuild rounds of ruling 4. The step 5 pipeline, `oracle step`, `seed`, `kills` and `score` unchanged for the walked tasks, and `human.mjs proxy` (the step 9 reader) for their reads. `stick hash` and `stick compare --reasons` for the amended lock. `pairedTasks` of `bench/power.mjs` for N. `env/real-estate/*.sh` as the source of the real-estate recipe. Missing, and built here: the product image, the split grade, the real-estate task shape, the proxy, plugins in the box, the trial driver, and the regrade compare.

## Decisions for the user (asked with this plan)

Each has a recommended default; the prereg is silent on all six.

**Decided by the user on 2026-11-08** ("Theo advisor suggestion"): every recommended default, (a) of decisions 1–6, and the split of Phase B into a follow-on plan, with this plan `stable` after the user approves Phase A's build. Build subagent-driven.

1. **The 2 external trial tasks.** "The first of the sorted list" in walk rank order, among tasks with a step oracle (σ_d is measured on the build score, and s1-01 and s3-01 have none), gives one per stack: s1-02 (1 step id), s2-01 (3), s3-02 (5). All three are canary tasks, already spent by step 8. **(a) s2-01 and s3-02 (recommended):** the most step ids, so the build score is the least binary, two stacks; s1-02's issue states the fix and B tied B- there. (b) s1-02 and s2-01: the stack order. (c) s2-01 and s2-02: the sort key across stacks, literally (both Electron, s2-02 has 1 id).
2. **The second real-estate trial task.** **(a) p6c (recommended):** dropped by rule (b) (2 fix-commit checks), so the 9 scored real-estate tasks stay unseen by the plugin designer, and it has a step oracle of 8 ids, like p8b's 12; its PR changes no dependency file. (b) a scored task with a step oracle by `queuePick` (p6a, p8a, p8c, p8d, p8e): spends one of the 9.
3. **The token.** A new `claude setup-token`, asked for at Task 4. **(a) Recommended:** you give it in chat when Task 4 asks; the controller writes `<data>/arm/box.env` (mode 600, never printed; `stick hash` leaves it out as a secret). It enters no box (ruling 6), so no arm transcript can hold it, and no later step hashes this session's transcript. It is revoked at the step 11 lock; step 13 gets a new one. (b) You write the file yourself with a `!` command (it then sits in this transcript the same way).
4. **What reaches the plugin designer from the trial.** **(a) Recommended:** per task and arm the build and requirement scores, task passed, tokens, minutes, interventions and how the run ended; no transcript, product, per-check result or check id (step 10: "it sees only scores"). (b) As (a) plus H's transcripts (they hold the task's input and repo, never an oracle).
5. **Who reads for the walked tasks** (step 10 ruling 9: step 9's reader rulings covered step 9 only). **(a) Recommended:** the step 9 reader, `bun bench/human.mjs proxy` on `claude-fable-5-1`, under step 9's amended rulings (blind pages, chunks, one rerun, defaults, applied as a human's) for the walked tasks' classification disputes and their 7.1 sample (ruling 10). (b) You read them on the local page of step 9.
6. **The package registry in the real-estate box.** Step 8 closed registries for external arms (decision 3) because an arm could fetch a later release of the task's own project; `real-estate` is private, so that reason does not apply. 5 of the 9 scored real-estate tasks change `package.json` and `pnpm-lock.yaml` (p1, p2, p3, p4, p8a; not p6a, p6c, p8b–p8e). **(a) Recommended:** the npm registry is open to real-estate boxes only (its addresses pinned at box creation, 443 only), and a real-estate product is built with the same access, so a product needs no more network than its arm had (ruling 4). (b) Closed: those 5 tasks cannot add the packages their plans need, for any arm; their ends are regraded through the networked trusted path, which then tests less than the arms' path.

**Needs you outside the decisions.** Phase B needs the plugin, which this session never designs (ruling 2): start the plugin-design session when you choose (Phase A does not wait for it), and give the controller the commit to run. Phase B is then a short follow-on plan (the plugin commit and its dependencies, the CLI version of that day, Tasks B1–B4 below); its rules are registered now (ruling 12), so a plugin that exists before them cannot shape them. This plan goes `stable` when you approve Phase A's build. Say so if you would rather keep one plan open until the trial ends.

## Rulings the prereg leaves open (Task 1 registers them in section 12 as "Applied at step 11" before any change)

1. **Two phases.** Phase A (Tasks 1–14 of this plan) needs no plugin and runs now; it ends with `progress/step11a-lock.md`, a whole-branch review and the user's approval, after which this plan is `stable` and the branch may merge. Phase B (Tasks B1–B4, sketched below) is a follow-on plan written when the user gives a plugin commit; it changes no rule registered here, and ends with `progress/step11-lock.md`. Order inside Phase A: every change to `grade`, `oracle-run`, the box and the reader (Tasks 2–10), then the proofs (Task 11), then the regrade (Task 12), then the walk (Task 13). A change to `grade`, `oracle-run` or the box after Task 12 repeats Task 12 (step 10 ruling 9).

2. **The plugin.** It comes from the plugin-design session, a Claude Code session the user starts in this repo on its own branch; this session never writes plugin content, never takes a design request, and passes the designer only what decision 4 allows. The user gives the controller a commit (and, for each plugin it depends on, a pinned commit or version); the controller records each in `arms.json` `plugins.H` as `{ name, repo, commit, paths, sha256 }`, or `{ name, dir, version, paths, sha256 }` for one pinned by version. What enters the box is an allowlist export, `git archive <commit> -- <paths>`, with `paths` the plugin's component folders that exist at that commit (`.claude-plugin`, `skills`, `agents`, `commands`, `hooks`, `scripts`, `bin`, `.mcp.json`); an export that holds any path under `bench`, `progress`, `docs`, `tests`, `fixtures` or `.evidence` is refused, because this repo also holds the locks (which name the cold repos) and the prereg. `sha256` is of the export's sorted file list with each file's hash. `probeOk` keeps the gate: the plugins at init equal the arm's. The run record adds `plugins` (name, commit, sha256), which section 3 asks for and step 12 locks. W is not run here.

3. **Sealing of this session.** The controller is not the plugin designer (section 12 step 10). It prints per-task scores only from the trial report, reads no transcript of an arm, and opens nothing the brief's sealing list names.

4. **I1: a product gets no more network than its arm had.** Per task, two images are built from trusted commits with network, recorded and removed when the grade ends: `S` = `bench-ext/<slug>:<base7>-serve` (recipe plus serve layer at the base, as today) and `R` = `bench-ext/<slug>:<base7>-runner-<osha8>` (`S` plus the oracle's runner layer). A commit's image `bench-ext/<slug>:<sha7>-product-<osha8>` is made in a container from `R`: the paths of the base's tree (`git ls-tree -r --name-only <base>`) are removed from `/work`, the commit's export is copied in, and the rebuild lines run; the container is committed and removed. The rebuild lines are, in order, the recipe's lines after its one `COPY . /work` line and the serve layer's lines, or the repo's `ext/tasks/<slug>/rebuild.json` when it exists. A recipe with no or several `COPY . /work` lines is refused. Network: none for external tasks; for real-estate, as decision 6 sets. Untracked build outputs of the base (`node_modules`, `target`, `.venv`) stay. A product that changes a dependency file is built the same way; if its install lines fail offline it gets no image, which is `noresult` (step 8 ruling 10), as it would have failed in the box; the record counts dependency files changed. Every grade, trusted commits included, takes this path, so the validations of the walked tasks and the arms' grades are made the same way. A task with two oracle kinds has two runner layers, so the tags carry the oracle: `<base7>-runner-<osha8>` and `<sha7>-product-<osha8>`. **A trusted end that needs a dependency its base lacks** (counted before the regrade by file name: the 4 cold PRs, which step 8's `deps-20.txt` did not count, and every walked PR) is graded through the step 10 networked path (`grade --trusted`, Task 5) and flagged in the task list; its arms build like any product, so a correct product that adds the same dependency reads `noresult` (a known limit for step 13's plan). No rebuild round can add a dependency. **Rebuild rounds:** when an end fails to build, or a check's result changes, at the regrade (Task 12), the repo gets at most 2 sealed rebuild rounds (`serve`'s pattern: the agent sees the base's files and the recipe and is told only which stage failed at the end), each followed by the end's regrade; still failing, the task stops for the user. `rebuild.json` is a new file; the recipe files stay byte-equal.

5. **M3: the oracle in its own container where the interface is served.** A task whose serve recipe has a `start` (s1, s2, real-estate) is graded in two containers: `P` from the product image, `--network none`, runs `start`; `O` from `R` (no product file, only the base's), `--network container:<P>`, gets `/oracle`, waits for `ready`, runs the runner and writes `/out/junit.xml`, which is copied out of `O` only. So the product can neither read the oracle nor touch the JUnit. A task with no serve (s3) is graded in one container from the product image, as today: **M3 stays open there**, because the checks call the crate or run the binary inside the runner's process; this is stated in the lock's limits with the tasks it covers. A served task whose end regrade changes in the split mode and matches in one container is graded in one container (`ext/tasks/<slug>/grade-mode` = `shared`), listed in the lock with the same limit; this is decided only from the end regrade, never from a product.

6. **I2: the token stays out of the box.** Each run gets a proxy container `bench-arm-proxy-<box>` from `bench-arm/proxy:1` (`bench/proxy.mjs`), recorded with the box and removed with it. It alone holds the token (`--env-file arm/box.env`), its firewall lets it reach only the API addresses on 443, and it answers only the box. The box's firewall lets it reach only the proxy's address and port (and, for real-estate under decision 6 (a), the registry's addresses on 443); the box env holds a placeholder token and the proxy's address as the API base URL. The proxy forwards only `POST /v1/messages` and `POST /v1/messages/count_tokens`, refuses (403, counted) a body with a tool whose `type` is set and is not `custom` (web search, web fetch, code execution), with `mcp_servers` or `container`, or any `source` of type `url` (the API would fetch it), puts the real token in the header the probe of Task 4 finds the CLI needs, and logs counts only, never a header or a body. It filters no model: the CLI makes its own small-model calls and a plugin may run subagents on other models (step 8 ruling 11 allows them); the record's model check stays the guard against a fallback. A nested CLI in the box therefore reaches only the same filtered proxy. This also closes M2 (the box pins no API name). **Fallback,** registered before Task 4 runs: if the CLI cannot work through the proxy, the box keeps step 8's arrangement (the token in the box env, API addresses on 443), I2 stays open, and every run's record counts Bash calls that name the CLI binary or an API host (the step 8 lock's check); the lock says so.

7. **M1: readiness per oracle.** `oracle-run` writes `<sha7>\t<osha8>\t<state>` to `<task>/build/readiness.tsv`, and every reader takes the last line of its own commit and oracle.

8. **Real-estate as a task of the box and the grade.** The real-estate tasks get the shape of an external task: a repo store `<data>/ext/repos/real-estate` (`git init --bare` with `objects/info/alternates` to the copy's objects, a ref per task base and end; arm products land here, never in the copy), one recipe `ext/tasks/real-estate/task-recipe.json`, one serve layer `ext/serve/real-estate/serve.json` (with a new optional field `services`, the part of `start` the box also needs: Postgres up with the bench databases created) and a runner `env/real-estate/runner.json` (the oracle scaffold and its browsers), held outside the oracle folders, which are hashed. They are written by the controller from `env/real-estate/*.sh`: Postgres server in the image, `.env` from the bench values of `env.sh` with placeholder secrets for every other key name of the copy's `.env` (names read, values not), `pnpm install --frozen-lockfile` at the base with network, the browsers of the base lockfile's Playwright version (the arm's own e2e needs them in `S`, not only the oracle in `R`), an SMTP sink on the host and port the `.env` keys `SMTP_HOST` and `SMTP_PORT` name when they point at the local machine, `start` = Postgres, the SMTP sink, the demo seed, the dev server. New task files `env/box/<task>.json` (ruling 9) are used by every step 11 grade of a real-estate commit. `env/real-estate.json` and `env/seeded/real-estate.json` stay byte-equal, for the trusted replays of step 13 only, and `grade` refuses a commit that a `refs/heads/bench/*` ref points at when the task file's `start` is not null: an arm's product never runs on the host. pgsnap runs before and after every real-estate lane, though `P` has no network, as the record that no host database moved. The real-estate turn limit is 28800 s (`arms.json` `turnTimeoutSec` per set: section 11 estimates 5 hours for H on a plan-sized task, and 14400 would cut it); external stays 14400.

9. **The regrade (step 10 ruling 9).** Every step 11 grade, of any task, goes through `env/box/<task>.json`, written by `bun bench/ext.mjs box-env <task>` from this branch (`start` null, `db` null, the oracle command `oracleCommand` with this checkout's path, as `canaryTaskFile` does), because `env/s*.json` and `env/seeded/*.json` name the main checkout's `bench/` and `env/canary/*.json` the step 8 worktree's; the hashed task files stay byte-equal. `seed`, `kills` and `step` of walked tasks take the task files `task-env` writes from this checkout. After Task 11, with no `--reuse`: the end of each of the 24 external tasks with `oracle/` (its step ids are a subset) and `seeded/oracle/`; the end of each of the 9 scored real-estate tasks with `oracle/`, `step/oracle/` where `step.json` has ids, and `seeded/oracle/`; and the ends of p8b and p6c with `oracle/` and `step/oracle/` (the trial grades them). Each with `--sealed --out <data>/logs/step11/regrade/<task>-<kind>.json`, so no hashed grade file is rewritten. `logs/step11/regrade-compare.mjs` compares each check's result with the locked grade of that commit and oracle and prints per task and kind `same=<n> changed=<m> nolock=<k>` and the changed ids (ids only). Unchanged means every result equal. A change follows ruling 4's or ruling 5's route, and any other change stops for the user. About 48 external and 33 real-estate grades.

10. **The walk (section 2, the user's decision of 2026-11-05; 4.2 ruling 14).** Each stack walks `ext walk` on, in its committed order, until it has `ceil(N / 3)` kept tasks with a non-empty step oracle; with N = 24 that is 8, so s1 needs 2 more, s3 2 more, s2 none. Each accepted candidate takes the step 5 pipeline as the step 5 lock ran it (serve, task env, sources and labels, oracle, interface sheet, validation with the task base, two classifiers), under the grade of rulings 4–5. Then: classification disputes settled and a 7.1 sample read per decision 5, from a queue of the walked tasks only: `bun bench/oracle.mjs queue --tasks <walked> --out <data>/step11/queue` writes `classify.tsv` and `sample-7.1.tsv` there (per stack `n = min(10, scored checks of the stack's walked tasks)` by `queuePick`, seed of `ext/groups.json`), and `bun bench/human.mjs build|proxy|apply <batch> --queue <data>/step11/queue` reads and writes only under that folder (`pages/`, `answers/`, `proxy/`, `seen.tsv`); the step 9 files are never rewritten (step 6 ruling 9). A `different` drops the check as step 9 ruling 6; fewer than `n − 1` answers `same` stops for the user; `oracle step`; `seed` (3 bugs); `kills`. A walked task with an empty step oracle stays in the sample (it scores H2–H4) and the walk goes on. 7.2's re-rating is not run (the user's step 9 decision: an agent cannot measure it); the input read is not run (the step 9 ruling: an external input is the issue verbatim). **Cold repos:** the cold-setup repos stay those of stick v1 (we-promise/sure, kizuna-ai-lab/sokuji, pola-rs/polars) and walked repos join the set nobody designing opens, a deviation from 4.2 ruling 13's "last repo to enter", listed; a sealed reader is not a designer, so the walked tasks' reads need no cold swap.

11. **The amended stick lock.** After the walk (and again after Task B3 if it walks): `bun bench/stick.mjs hash --out <scratchpad>/stick-v1-step11.sha256` (never inside `<data>`), copied to `progress/`; `bun bench/stick.mjs compare progress/stick-v1.sha256 --reasons progress/step11/reasons.tsv`, committed with Task 1 before any change. Expected changed: `ext/walk.tsv`, `ext/sample.tsv`, the walked repos' store refs, `packed-refs` and `shallow` files, `seeded/repos/*/shallow`, `arms.json`; new files (the walked tasks, `env/box/`, the real-estate shape, `rebuild.json`, `grade-mode`, `step11/queue/`, `logs/step11/`) are new, not changed. Any `unexplained` or `missing` stops for the user.

12. **The trial (section 12 step 11), registered now and run by the follow-on plan.** Tasks per decisions 1 and 2; the chosen external pair is registered as this step's reading of "the first of the sorted list", with its reason, and listed for step 14; arms H and B; k = 1; one task at a time; within a task the order of `queuePick(['<task>:B:1', '<task>:H:1'], 2, seed)`; each product graded right after its run, as the canary does, with the attempt and `machine` rules of step 8 rulings 10–11 (a `machine` run takes the next number). The arms run in the same window with the same model and CLI (`arms.json` at Phase B's start; a change of `cli` is recorded). Prompts as step 8 ruling 7 (`input.md`, interface sheet, `DONE_LINE`). Interventions as step 8 (resume turns: `AskUserQuestion` is not a tool under `-p`); the H probe checks that H's init lists no `AskUserQuestion` and no web tool. **Measured:** tokens per run (input + output, the section 11 convention, cache read and write apart), minutes per run, interventions, end reason, and σ_d = the sample standard deviation (n − 1) of `d_t = build(H) − build(B)` over the 4 tasks, build per step 6 ruling 7 (`floorScore` over `step.json` ids). **N rule (10.2):** N = 24 when σ_d ≤ 0.25; otherwise N = max(24, `pairedTasks(σ_d, 0.15)` + 2), the 22 + 2 of section 10.2 recomputed. If H1's N (external tasks with step ids) is below N, the walk of ruling 10 goes on (Task B3). The report prints σ_d also over the 2 external tasks, deciding nothing. **Not analysed:** no H1–H5 statement, no interval.

13. **The token** (decision 3): asked for at Task 4, written by the controller, never given to a subagent; kept for Phase B and revoked by the user at the step 11 lock, then `rm <data>/arm/box.env`, unread.

14. **The flaky test.** Every full run of the suite is `bun test ./tests 2>&1 | tee <data>/logs/step11/tests-<n>.out`. The candidates of the step 10 lock are run in a loop once (Task 2) to try to name it; a failure that shows is fixed after systematic debugging, and none is changed blind.

## Expected size

| lane | count | time |
|---|---|---|
| code tasks (2, 3, 5–10) | 8 implementers, 8 reviewers | about 1.5–2.5M tokens |
| proxy probe and proofs | 3 box turns | under 1 h |
| real-estate images | 11 bases, one recipe | about 2 h of builds |
| regrade | about 48 external + 33 real-estate grades | about 8 h |
| walk | about 4–8 accepted candidates, step 5 pipeline, `step`, `seed`, `kills` | about 15 h, about 4M tokens |
| trial (follow-on plan) | 8 runs, 8 grades | about 10–15 h (H on real-estate up to 8 h a turn) |
| reader | 2 to 4 proxy batches | under 0.5M tokens |

## Global Constraints

- Bun only, no new dependency in `bench/`; `bench/` names no stack, customer or task (stack facts live in `<data>`). `<data>` = `/Users/hbchuc/Documents/programing/vibe-code/hstack/.evidence/bench` (gitignored, main checkout). `HSTACK_BENCH_MACHINE=<data>/machine.json` for every bench command.
- Build on `bench-step11` from `main` (6d8bee6). Do not push `worktree-bridge-cse_01JxVNAL2Dkzabg9QuuNaY5E`. A push that keeps disconnecting: `git -c http.postBuffer=524288000 push`; do not change the git config.
- Every full test run: `bun test ./tests 2>&1 | tee <data>/logs/step11/tests-<n>.out`, output pristine.
- Never write under `/Users/hbchuc/Documents/programing/vibe-code/outsourcing/`. Never touch `real_estate*` databases; only `bench_*`, and from this step none on the host for a product.
- **Docker.** Never `prune`, `volume`, `compose` or `network`, except `docker builder prune -f`. Removal only by the names a step recorded, never `-f`. Docker stays at 7.6 GB. `--network container:<name>` joins an existing namespace and makes no network object.
- **Sealing.** Every grade of an oracle runs with `--sealed`. Never read `ext/raw/`, `ext/sealed/`, `heldout/`, `seeded/`, `<task>/seeded/` (other than `validation-*.json`, `kills.json`, `grades/`), `step9/pages/`, `step9/answers/`, `step9/proxy/`, `history/`, `logs/step7/*.out`, `logs/step10/*.out` and `logs/step11/` grade outputs, `results/*/` transcripts, or any oracle, runner, step oracle, seeded-bug or reply file, by hand. Plain `bun bench/bugs.mjs <task> <sealed> --sealed` is forbidden (only `--usable`, `--fix-tally`, `--at-tally`). `bun bench/stick.mjs hash --out` never points inside `<data>`. Scripts print counts, ids, task names and paths only. Implementers work on fixtures only; every run on real data is the controller's.
- This session is not the plugin-design session; nobody designing the plugin opens a cold-setup or walked repo.
- Record each task's usage in `progress/progress.md`; copy the SDD ledger there before each final review. The plan goes `stable` only after the user approves Phase A's build (ruling 1).
- Docs, logs and commit messages in English.

## Review Focus

1. A base file the product deleted survives in the product image, or a base build output is lost. Expected: base-tracked paths absent from the product are gone, untracked folders stay. Test: Task 5 'the overlay removes deleted base files and keeps build outputs'.
2. A product built or run with network beyond its arm's. Expected: the make container and `P` have no route out (external), or only the pinned registry addresses (real-estate). Test: Task 5 'the product is made with no network' and Task 8 'the real-estate box and make container reach only the registry'.
3. The product reaching the oracle or the JUnit in split mode. Expected: `P` has no `/oracle`, the JUnit is copied from `O` only, a JUnit written in `P` is ignored. Test: Task 6 'a product that writes a JUnit in its own container does not change the grade'.
4. The token or a server tool passing the proxy. Expected: 403 and a count for a `web_search` tool, an MCP server or an unknown path; the box env has only the placeholder; no log line holds a header. Test: Task 3 'the proxy refuses server tools and other paths' and Task 8 'the box env holds no token'.
5. A plugin export that carries the locks or the prereg. Expected: refused when any path is under `bench`, `progress`, `docs`, `tests`, `fixtures` or `.evidence`. Test: Task 8 'a plugin export with a repo-only path is refused'.

---

## Phase A (no plugin)

### Task 1: Register the rulings

**Files:**
- Modify: `docs/plans/2026-10-27-benchmark-prereg.md` (section 12, a dated paragraph after "Applied at step 10", before step 11), `docs/plans/index.md`, `docs/log.md`
- Create: `progress/step11/reasons.tsv`

- [ ] **Step 1:** Write "Applied at step 11 (2026-11-08)" after step 10's paragraphs: rulings 1–14, the user's decisions as answered (or their defaults), and the reasons file by reference; end "Registered before any change to `grade`, `oracle-run`, the box or the reader; `bench/proxy.mjs` and `bench/trial.mjs` do not exist."
- [ ] **Step 2:** Write `progress/step11/reasons.tsv` from ruling 11 (`<glob>\t<reason>`, no header).
- [ ] **Step 3:** Index line and an **Update** line in `docs/log.md`. Commit `git commit -m "Register the step 11 rulings before any change"`.

### Task 2: Test hygiene and the hash guard

**Files:**
- Modify: `tests/bench-human-cli.test.mjs:26`, `bench/stick.mjs`, `tests/bench-stick.test.mjs`

**Interfaces:**
- Produces: `hash --out <file>` exits 2 with `stick hash: --out is inside the data folder` when the resolved file is inside `<data>`; the count line gains `special <n>` (sockets, FIFOs, devices, skipped).

- [ ] **Step 1: Write the failing tests:** 'hash refuses an --out inside the data folder' (exit 2, no file written); 'hash counts a FIFO as special' (`mkfifo` in the fixture: `special=1`, not in the lines).
- [ ] **Step 2: Run** `bun test tests/bench-stick.test.mjs` — FAIL.
- [ ] **Step 3: Implement**; in `withData` restore with `delete process.env.HSTACK_BENCH_MACHINE` when `prev` is undefined.
- [ ] **Step 4 (controller, after the review):** Run each candidate file of the step 10 lock's Findings 10 times (`tests/bench-env.test.mjs`, `tests/bench-proc.test.mjs`, `tests/bench-agent.test.mjs`, `tests/bench-score.test.mjs`), each run teed to `<data>/logs/step11/flaky-<file>-<i>.out`; record failures by test name. A failure that shows goes to superpowers:systematic-debugging and is fixed with its test; none is changed blind.
- [ ] **Step 5:** Full suite with `tee`, pristine. Commit `git commit -m "Refuse a hash output inside the data folder and restore the machine variable"`.

### Task 3: The proxy

**Files:**
- Create: `bench/proxy.mjs`, `tests/bench-proxy.test.mjs`, `<data>/arm/proxy/Dockerfile` (controller, FROM a pinned `oven/bun` digest, copies `proxy.mjs`)

**Interfaces:**
- Produces:
  - `refusal({ method, path, body }) -> null | 'path' | 'tool' | 'mcp' | 'container' | 'source' | 'body'` (pure; no model filter, ruling 6).
  - `serveProxy({ port, upstream, token, authHeader, betas, countsFile }) -> server`: forwards an allowed request to `upstream` with the token in `authHeader` (`authorization` as `Bearer <token>`, or `x-api-key` as the token; the incoming `authorization` and `x-api-key` are always dropped) and `betas` appended to `anthropic-beta`, streams the answer back, writes `allowed <a> refused <r> <reason>=<n>…` to `countsFile` on every request; never logs a header or a body.
  - `bun bench/proxy.mjs serve` reads `BENCH_PROXY_TOKEN`, `BENCH_PROXY_AUTH`, `BENCH_PROXY_BETAS`, `BENCH_PROXY_PORT`, `BENCH_PROXY_UPSTREAM` from its env (Task 4's probe sets `AUTH` and `BETAS`).

- [ ] **Step 1: Write the failing tests:** 'the proxy refuses server tools and other paths' (a `web_search_*` tool, a `web_fetch_*` tool, `mcp_servers`, `GET /v1/models`, `POST /v1/files`, a body that is not JSON: each 403 and counted; a body with only custom tools passes, whatever its model); 'the proxy puts the token in the configured header and drops the incoming one' (a local fake upstream records headers: the box's placeholder is gone, the token is there); 'the proxy streams the answer' (an event stream of three chunks arrives in order); 'no log line holds a header or a body' (the counts file after the tests holds only count words).
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** with `Bun.serve` and `fetch`. **Step 4: Run** the suite with `tee` — pass. Commit `git commit -m "Add the API proxy that holds the token and refuses server tools"`.

### Task 4: The proxy probe (controller, real token)

- [ ] **Step 1:** Ask the user for the token (decision 3); write `<data>/arm/box.env` mode 600 without printing it.
- [ ] **Step 2:** Build `bench-arm/proxy:1` (record the name in `<data>/arm/docker.json`). Make a throwaway box of s1-01 that gets **no** `box.env`: only the placeholder and `ANTHROPIC_BASE_URL`; `box.env` goes only to the proxy container; the firewall lets the box reach only the proxy's address and port, and the proxy only the API addresses on 443 (rules set by hand with the `bench-arm/fw:1` helper). Then one turn `claude -p "Reply OK"` with the placeholder token and the proxy as the base URL, first with `ANTHROPIC_AUTH_TOKEN`, then with `CLAUDE_CODE_OAUTH_TOKEN` as the placeholder; record which one answers and which header the proxy must set (`authHeader`), by the counts file and the turn's exit code only, and the list `netOk` must now treat as blocked from the box (the API addresses themselves).
- [ ] **Step 3:** From the same box, a `curl` through the proxy with a `web_search` tool: 403. A direct `curl` to an API address: blocked.
- [ ] **Step 4:** If no form answers, apply ruling 6's fallback and record it. Remove the probe's names. Record in `progress/progress.md`.

### Task 5: The product image and readiness per oracle

**Files:**
- Modify: `bench/ext.mjs` (`oracleRun`, new `productImage`, `rebuildLines`, `overlayScript`; readiness), `bench/grade.mjs` (`--out`, the refusal of an arm ref on a host task file), `bench/canary.mjs` (readiness reader), `tests/bench-ext.test.mjs`, `tests/bench-score.test.mjs` or `tests/bench-env.test.mjs` for `grade`, `bench/README.md`

**Interfaces:**
- Produces:
  - `rebuildLines(recipe, serve, rebuild) -> string[]`: the recipe's lines after its one `COPY . /work` line, then the serve layer's lines; `rebuild.lines` instead when `rebuild` is given; throws `the recipe must copy the repo into /work exactly once` otherwise.
  - `overlayScript(baseFiles) -> string`: removes each listed path under `/work`, then copies `/tmp/bench-product/.` into `/work`.
  - `productImage({ t, commit, baseImage, network }) -> imageId`, tag `bench-ext/<slug>:<sha7>-product`, made in container `bench-ext-<slug>-make-<sha7>-<n>` (`--network none`, or the bridge with the firewall helper for `{ ips }`), committed, the container removed; names recorded in `<task>/docker.json`.
  - readiness rows `<sha7>\t<osha8>\t<state>`; `readinessOf(file, sha7, osha8) -> state | null`.
  - `grade … --out <file>`: the grade JSON goes there; `grade` exits 2 with `an arm product is not graded on the host` when `git for-each-ref --points-at <commit> refs/heads/bench/` is not empty and the task file's `start` is not null.
  - `grade … --trusted` passes `BENCH_TRUSTED=1` to the oracle command; `oracle-run` then builds the commit as step 10 did (recipe and serve layer with network, one container) and refuses unless the commit is a task's base or end (`ext/sample.tsv`, `tasks.json`) or the tip of a `refs/seeded/*` ref, so an arm product can never take it.

- [ ] **Step 1: Write the failing tests:** 'rebuildLines takes the lines after the copy and the serve layer'; 'a recipe that copies the repo twice is refused'; 'rebuild.json replaces the recipe lines'; 'the overlay removes deleted base files and keeps build outputs' (gated `BENCH_EXT_DOCKER=1`, a fixture image whose `/work` holds `a`, `b` tracked and `node_modules/x` untracked; the product deletes `b` and changes `a`: `b` gone, `a` new, `node_modules/x` kept); 'the product is made with no network' (gated: a rebuild line that opens a socket fails, so no image); 'readiness is read per oracle' (two oracles' lines for one sha: each reads its own); 'grade writes to --out and leaves grades/ alone'; 'an arm product is not graded on a host task file'; 'the trusted path refuses a commit that is no base, end or seeded bug'.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement**; `oracleRun` builds `S` and `R` on every grade from the BuildKit cache, as it builds its serve image today (recorded, removed by `removeRecorded` when the grade ends), and grades through `productImage`. **Step 4:** Suite and `BENCH_EXT_DOCKER=1 bun test tests/bench-ext.test.mjs`, both teed — pass. Commit `git commit -m "Build every graded commit from the base image with its arm's network"`.

### Task 6: The split grade

**Files:**
- Modify: `bench/ext.mjs` (`oracleRun`, `gradeMode`), `tests/bench-ext.test.mjs`, `bench/README.md`

**Interfaces:**
- Consumes: `productImage`, `R` of Task 5.
- Produces: `gradeMode(ext, t) -> 'split' | 'shared'` (`shared` when the serve recipe has no `start` or `ext/tasks/<slug>/grade-mode` reads `shared`); in split mode containers `bench-ext-<slug>-app-<sha7>-<n>` (`P`) and `bench-ext-<slug>-grade-<sha7>-<n>` (`O`, `--network container:<P>`), both recorded; the JUnit and the readiness come from `O`.

- [ ] **Step 1: Write the failing tests** (gated): 'the oracle runs beside the app in split mode' (a fixture app on a loopback port, a runner that fetches it: pass); 'a product that writes a JUnit in its own container does not change the grade' (the product's start writes `/out/junit.xml` with every case passing: the grade reads `O`'s); 'the product cannot read the oracle' (the product's start lists `/oracle`: not found, recorded in its log only); 'a task with no serve start is graded in one container'; 'grade-mode shared forces one container'.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4:** Suites teed — pass. Commit `git commit -m "Grade a served product from a second container that shares only its loopback"`.

### Task 7: Real-estate as a task of the box and the grade

**Files:**
- Modify: `bench/ext.mjs` (`taskOf` for real-estate rows, `parseServe`'s optional `services`, the `box-env` command, `oracleRun`'s runner source), `tests/bench-ext.test.mjs`, `bench/README.md`
- Create (controller, gitignored): `<data>/ext/repos/real-estate/`, `<data>/ext/tasks/real-estate/task-recipe.json`, `<data>/ext/serve/real-estate/serve.json`, `<data>/env/real-estate/runner.json`, `<data>/env/box/<task>.json`

**Interfaces:**
- Produces: `taskOf(ext, task)` returns `{ task, slug: 'real-estate', key: 'real-estate', stack: 're', base, end, index }` for a `tasks.json` task; `parseServe` accepts `services` (string, optional); `bun bench/ext.mjs box-env <task>` writes `env/box/<task>.json` for an external or a real-estate task (`repo` the task's store, `db` null, `start` null, `oracle` `oracleCommand(task)` with this checkout's path, `runner` for real-estate, `timeoutSec` 7800); `oracleRun` reads `runner.json` from the oracle folder or, when absent there, from the file the task file's `runner` names.

- [ ] **Step 1: Write the failing tests:** 'taskOf reads a real-estate task from tasks.json'; 'a serve recipe may name services'; 'box-env writes a task file with no host start and this checkout's oracle command'; 'oracle-run takes the runner from the task file when the oracle folder has none'.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4:** Suite teed. Commit `git commit -m "Give real-estate tasks the shape of an external task"`.
- [ ] **Step 5 (controller):** Make the store (refs for the 11 tasks' bases and ends); write the recipe, serve layer and runner (ruling 8: Postgres, the Playwright browsers of the base lockfile, the SMTP sink when `.env` points SMTP at the local machine, placeholder secrets by key name); `box-env` for the 24 external tasks and p1, p2, p3, p4, p6a, p6c, p8a, p8b, p8c, p8d, p8e. Build `S` at p8b's base and serve it once (`ready` answers); record the build time and image size. pgsnap before and after. Names recorded and removed.

### Task 8: The box

**Files:**
- Modify: `bench/box.mjs` (plugins, proxy, real-estate services and registry, proof rows), `bench/lib/arm.mjs` (`fwScript` targets with ports, `boxArgs`), `bench/run-arm.mjs` (`arms.json` shape: `plugins.H` entries, `turnTimeoutSec` per set), `tests/bench-box.test.mjs`, `tests/bench-arm.test.mjs`, `bench/README.md`

**Interfaces:**
- Consumes: `bench/proxy.mjs` (Task 3), the probe's `authHeader` (Task 4), `taskOf` and `services` (Task 7).
- Produces:
  - `pluginExport({ repo, commit, paths, out } | { dir, version, paths, out }) -> { files, sha256 }` (a plugin pinned by version is a folder, not a commit; the same allowlist, refusal and `sha256` either way; ruling 2); `enterBox` takes `plugins: [{ name, dir }]`, copies each to `/arm/plugins/<name>` and passes `--plugin-dir` for each.
  - `fwScript({ out: [{ ip, port }], in: [{ ip, port }] })`: the box's rules are out to the proxy's address and port (and the registry's addresses on 443 for real-estate under decision 6 (a)), no `in`; the proxy's are in from the box's address on its port and out to the API addresses on 443; `netOk` adds the API addresses to the box's blocked targets.
  - the box env: the placeholder token and `ANTHROPIC_BASE_URL=http://<proxy ip>:<port>`; `box.env` goes only to the proxy.
  - `services` run once as root before the first turn; a box whose `services` fail is refused (exit 2).
  - proof rows added: 'no token in the box env', 'the API is reached only through the proxy', 'the proxy refuses a server tool', 'services are up' (real-estate), 'only the registry answers' (real-estate under decision 6 (a)).
  - the record adds `plugins` and `proxy` (allowed and refused counts).
  - under ruling 6's fallback (Task 4 found no form that answers through the proxy): no proxy wiring; the box keeps step 8's env and API addresses, the tests and proof rows of the proxy are left out, and the record adds `cliCalls` (Bash calls naming the CLI binary or an API host). Task 8 builds one of the two, as Task 4 recorded.

- [ ] **Step 1: Write the failing tests:** 'a plugin export with a repo-only path is refused'; 'the plugin dirs reach the CLI as --plugin-dir'; 'the box env holds no token'; 'the box reaches only the proxy' (gated); 'the real-estate box and make container reach only the registry' (gated, a fixture address list); 'services run before the first turn and a failure refuses the box'; 'arms.json takes plugin entries and a turn limit per set'.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement**, removing `NO_PLUGINS` and the `db !== null` refusal for a task whose `db` is null. **Step 4:** Suites teed, `BENCH_EXT_DOCKER=1 bun test tests/bench-box.test.mjs` teed. Commit `git commit -m "Run plugins, the proxy and real-estate services in the box"`.

### Task 9: The trial driver

**Files:**
- Create: `bench/trial.mjs`, `tests/bench-trial.test.mjs`
- Modify: `bench/README.md`

**Interfaces:**
- Consumes: canary's run, grade-attempt and record functions; `oracle score`; `pairedTasks`.
- Produces:
  - `bun bench/trial.mjs run <task>`: H and B, k = 1, in `queuePick` order (ruling 12), each graded right after with the task's oracle kinds (`oracle/` and, for real-estate, `step/oracle/`) through `env/box/<task>.json`; resumes; refuses any task not named in `<data>/trial/tasks.txt`, and a cold or walked task.
  - `bun bench/trial.mjs report`: writes `trial/report.json`; prints per task and arm `build= requirement= passed= tokens= cache= minutes= interventions= end=`, then `trial sigma_d=<s> sigma_d_ext=<s> n=<4> N=<N> h1_n=<k> walk=<yes|no>`; `not judged` while any run has no score.
  - `sigmaD(ds) -> number` (sample, n − 1), `nRule(sigma) -> number` (ruling 12).

- [ ] **Step 1: Write the failing tests:** 'sigmaD is the sample standard deviation' (`[0, 0.5, 1, 0.5]` gives 0.408248…); 'nRule keeps 24 up to 0.25 and recomputes above' (0.25 → 24, 0.30 → 34, 0.10 → 24); 'the trial refuses a task not in tasks.txt'; 'the report is not judged while a run has no score'; 'the order follows queuePick'.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4:** Suite teed. Commit `git commit -m "Add the trial driver and its report"`.

### Task 10: A queue of the walked tasks for the reader

**Files:**
- Modify: `bench/oracle.mjs` (`queue --tasks --out`), `bench/human.mjs` (`--queue <dir>` on `build`, `serve`, `status`, `apply`, `proxy`), `tests/bench-oracle.test.mjs`, `tests/bench-human.test.mjs`, `tests/bench-human-cli.test.mjs`, `bench/README.md`

**Interfaces:**
- Produces: `bun bench/oracle.mjs queue --tasks <task,...> --out <dir>` draws `classify.tsv` (the tasks' disputes) and `sample-7.1.tsv` (per stack `min(10, scored)` by `queuePick`, ruling 10) over the named tasks only and refuses an `--out` that is `<data>/step9`; `human.mjs … --queue <dir>` reads and writes only under `<dir>` (default `<data>/step9`, so step 9's calls are unchanged).

- [ ] **Step 1: Write the failing tests:** 'a queue over named tasks draws only from them'; 'the queue refuses the step 9 folder'; 'the sample takes min(10, scored) per stack'; 'human --queue writes pages and answers under its folder and leaves step9 alone'; 'without --queue, human reads step9 as before'.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4:** Suite teed. Commit `git commit -m "Queue the reads of walked tasks in a folder of their own"`.

### Task 11: The proofs (controller)

- [ ] **Step 1:** `bun bench/box.mjs proof s1-01`: every row `ok`, none skipped; the proxy's counts show the API turn and the refused server tool.
- [ ] **Step 2:** The same on p8b's real-estate box: `services are up`, `a real database is out of reach`, the registry row per decision 6. pgsnap before and after.
- [ ] **Step 3:** A plugin fixture (one skill, a throwaway repo) through `pluginExport` into the s1-01 box: init lists it, `probeOk` passes; the probe records `AskUserQuestion` absent. Remove every recorded name.

### Task 12: The regrade (controller)

**Files:**
- Create (gitignored): `<data>/logs/step11/deps.txt`, `regrade.sh`, `regrade-compare.mjs`, `regrade/`

- [ ] **Step 1:** Count the dependency files the 4 cold PRs change (file names only, as `logs/step8/deps-20.txt`); an end that changes one takes ruling 4's networked trusted path and its flag.
- [ ] **Step 2:** `regrade.sh` runs ruling 9's grades one at a time through `env/box/<task>.json`, external then real-estate (pgsnap around the real-estate lane), `docker builder prune -f` before a task when the cache is above 15 GB, the last line of each to `regrade.lines`.
- [ ] **Step 3:** `bun logs/step11/regrade-compare.mjs > logs/step11/regrade-compare.out`. Expected: `changed=0` on every line. A build failure or change takes ruling 4's rebuild rounds or ruling 5's shared mode, then that task's grades run again; anything else stops for the user.
- [ ] **Step 4:** Docker listing: no name ending `-serve`, `-runner-*`, `-product-*`, `-app-*`, `-grade-*` or `-make-*` left. Record counts and wall clock.

### Task 13: The walk (controller and sealed agents)

- [ ] **Step 1:** Copy the step 5 drivers (`ext/step5-walk.sh`, `step5-serve.sh`, `step5-sheet.sh`) to `<data>/logs/step11/`, re-pointed at this checkout and at `logs/step11/` (they name the step 5 worktree).
- [ ] **Step 2:** Per stack s1, s3: `bun bench/ext.mjs walk <groups> <stack>` from where it stopped; each accepted candidate through the step 5 pipeline under this branch's `oracle-run`; `box-env` for it; then the reader on its disputes and the 7.1 sample (Task 10's queue, decision 5), `oracle step`; count tasks with ids; stop a stack at 8 (s3 without s3-08, the user's decision (B) of 2026-11-10).
- [ ] **Step 3:** `oracle seed` and `oracle kills` on each walked task. Count the dependency files each walked PR changes (file names only).
- [ ] **Step 4:** Recount H1's N; expect 24. Record each walked task's row (id, repo, rank, ids, scored checks, seeded bugs) for the task list.

### Task 14: Phase A lock

**Files:**
- Create: `progress/stick-v1-step11.sha256`, `progress/step11a-lock.md`, `progress/stick-v1/tasks-step11.tsv`
- Modify: `progress/step10-lock.md` (a dated paragraph "Amended at step 11"), `docs/log.md`, `progress/progress.md`

- [ ] **Step 1:** Ruling 11's hash and compare; any `unexplained` or `missing` stops. Add "Amended at step 11 (<date>)" to `progress/step10-lock.md`: the new manifest's sha256 and file count, the compare's counts, the walked tasks, pointing at `step11a-lock.md`; nothing above it is rewritten.
- [ ] **Step 2:** `tasks-step11.tsv` (the step 10 columns, the walked tasks added, `cold` per ruling 10, the dependency flags of ruling 4).
- [ ] **Step 3:** Suite teed, pristine; `git status --short bench tests` empty; `/tmp/hstack-bench` empty; pgsnap equal; Docker as Task 12 step 4.
- [ ] **Step 4:** Write `progress/step11a-lock.md`: each carry-over with how it closed (M3 open for s3 and any `shared` task; I2 per Task 4), the proofs, the regrade table, the walk, the amended manifest, deviations, open points, known limits, usage. Copy the SDD ledger; commit `git commit -m "Lock step 11 phase A"`; whole-branch review; after its fixes, ask the user to approve Phase A; then `status: stable`.

## Phase B (the follow-on plan, when a plugin commit exists)

Sketched here so the trial's shape is fixed now; the follow-on plan adds only the plugin's commit, its dependencies and the CLI version of that day.

- **B1. The plugin in the box.** Record the commit and its dependencies in `arms.json` `plugins.H` (ruling 2), `pluginExport` each, record `sha256`. H's probe on each trial task's box: plugins at init equal `arms.json`'s, no web tool, no `AskUserQuestion`. Write `<data>/trial/tasks.txt` (decisions 1 and 2).
- **B2. The trial.** `bun bench/trial.mjs run <task>` for the 4 tasks, external first, pgsnap around the real-estate runs; `bun bench/trial.mjs report`. The designer gets only decision 4's fields, through the user.
- **B3. More walk if N asks.** If the report's `walk=yes`, Task 13 with `ceil(N / 3)` per stack, then ruling 11's hash and compare again.
- **B4. Step 11 lock.** The user revokes the token, then `rm <data>/arm/box.env`, unread. `progress/step11-lock.md`: the plugin commits, the 8 runs (CLI, models, tokens, minutes, interventions, end), σ_d, N, the walk, cost against section 11, deviations, open points for step 12.

## Deviations (listed for step 14)

- The walked tasks get no 7.2 re-rating and no input read (sections 7.2 and 5), as the step 9 decisions ruled for the other tasks.
- The cold-setup repos stay those of stick v1; walked repos join the unopened set instead of becoming cold by 4.2 ruling 13 (ruling 10).
- The reading of "the first of the sorted list" (decision 1) and the choice of a dropped real-estate task (decision 2), if the defaults stand.
- A served task graded in one container (ruling 5) and an end graded through the networked path (ruling 4), each listed by name.
- Reads for walked tasks are an agent's (decision 5 (a)).
- The external set grows past 24 (s1 and s3 walk until each has 8 tasks with a step oracle, so H2–H4 run on every kept task, 26 or more) while section 4.2 says 8 per stack and the step 10 lock's H4 line says 24; the reason is the user's decision of 2026-11-05 (H1's N counts only tasks with a step oracle, and the walk tops it up).
- Decided by the user on 2026-11-10 (prereg section 12, "Decided by the user on 2026-11-10"): p8a `d1ea76b-T13`, p8e `eb2b016-T7` and p8e `a9c2377-T15` leave the score by 7.1 (they fail on the reference under the step 11 grade environment); s3-08 leaves H1–H4 as not gradeable offline, so s3 walks 3 tasks; M3 is closed only where split mode holds.
- The walk runs on `logs/step11/groups-walk.json` (`perStack` raised one accepted task at a time) and the controller restores `cold_setup` in `ext/sample.tsv` after each `sample`.

## Known limits

- **M3 stays open for in-process interfaces and for shared-mode tasks:** all of s3, and s1-01, s1-03, s1-05, s1-07, s2-01, s2-02, s2-05, s2-07, s2-08, s2-10 (`grade-mode` = `shared`); closed for s1-02, s1-04, s1-06, s1-09, s2-03, s2-09 and the private set (the user's decision (C) of 2026-11-10).
- **I2 depends on the probe** (ruling 6): with the fallback, the nested route stays open and is only counted.
- **A product that needs a new dependency cannot build** (external; real-estate under decision 6 (b)), as in the box; it reads `noresult`, equally for every arm.
- **The real-estate box runs Postgres, the dev server and browsers under `--memory 6g`;** a kill is `machine memory`, told to the user.
- **Registry addresses are pinned when a box is made** (decision 6 (a)); a box lives up to 56 hours, and an address that rotates fails every arm alike.
- **The stick's sensitivity is not validated** (step 10 lock); H4 at step 14 is Part 2's only guard.
- **σ_d from 4 tasks at k = 1 is a rough estimate;** N never drops below 24.
- **The trial tasks are seen** by the plugin designer through their scores (4.2 ruling 13), and the designer may tune on them before step 12.
- **No human reads anything in this step** (decision 5 (a)).

## Not in this plan

The trial runs themselves (the follow-on plan); arm W and the plugin lock (step 12); the scored runs (step 13); the per-layer measures and H5's porter (step 13); a fix-the-stick plan; registries for external arms (closed, step 8 decision 3); any change to an oracle, label or score rule.
