---
type: plan
title: "Stick canary plan"
description: "Prereg step 8: replace run-arm's two shortcuts with a Docker box an arm cannot leave, settle the score d and arms.json, run B against B- on the 6 canary tasks with k = 2, and record the verdict with B's cost and spread."
status: draft
generated: { by: claude-code/2.1.318, at: "2026-11-06T20:30:00+07:00" }
verified:
  - { by: claude-code-advisor/2.1.318, at: "2026-11-06T20:50:00+07:00" }
sources:
  - id: prereg
    resource: /plans/2026-10-27-benchmark-prereg.md
  - id: seeded-bugs
    resource: /plans/2026-11-05-bench-seeded-bugs.md
---

# Stick Canary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prereg section 12 step 8 done: B against B- on s1-01, s1-02, s2-01, s2-02, s3-01 and s3-02, k = 2, every arm inside a box proven by a test, with the stick's verdict by section 7.3, B's cost and its spread between runs, all locked in `progress/step8-lock.md`.

**Architecture:** One new file, `bench/box.mjs`, starts a container from the task's own recipe image, firewalled from outside, with nothing of the host mounted; `bench/run-arm.mjs` drives its turns by `docker exec` and takes the product back as a `git bundle`. A second new file, `bench/canary.mjs`, runs a task's four arm runs in seeded order, grades each product and reports `d`. The grade path is step 7's unchanged.

**Tech Stack:** Bun 1.4.4+, `bun:test`, Docker (`BENCH_EXT_DOCKER=1` for the live tests), iptables in a helper image, the Linux arm64 `claude` 2.1.318, git (`bundle`), `bench/ext.mjs` (`buildImage`, `recordDocker`, `removeRecorded`, `diskFloor`, `taskOf`), `bench/grade.mjs`, `floorScore`.

**Spec:** `docs/plans/2026-10-27-benchmark-prereg.md` sections 3, 5, 7.3, 2 ("Applied at step 6" and its addendum), 8.3 ("Applied at step 7", rulings 11 and 12, and its addendum), 9.1, 9.3, 10.1, 11 (the canary row), 12 (steps 8–10), 15; the locks `progress/step5-lock.md` (canary tasks), `progress/step6-lock.md`, `progress/step7-lock.md` (open point: the sandbox must cover `/tmp/hstack-bench`); the tools as built: `bench/README.md`.

## What is reused

The task recipe and serve layer of step 5 are the box's image, so every box is a build the step 5 serve check already passed at the base. `oracle-run`, `grade --sealed` and `floorScore` score the products with no change. `docker.json` and `removeRecorded` carry the box's names. `armArgs` already delivers B-'s three instructions. Missing, and built here: the box, the bundle, the delivery of the interface sheet (run-arm sends `input.md` alone, section 5 says the sheet comes with it), the `d` rule, and a driver.

## Rulings the prereg leaves open (Task 1 registers them in section 7.3 before any arm runs)

1. **Scope.** B and B- on the first 2 kept tasks per stack (step 5 ruling 2): s1-01, s1-02, s2-01, s2-02, s3-01, s3-02, k = 2, 24 scored runs. They measure the stick, B's cost and B's spread; they are not part of the H1–H3 analysis, and section 12 step 13 does not reuse them.

2. **The box (replaces both shortcuts of `run-arm`).** The arm agent and everything it starts run only in one container per run, `bench-ext-<slug>-arm-<task>-<arm>-<n>`, from the image `bench-ext/<slug>:<base7>-arm`: the task recipe plus the serve layer at the base (the build `oracle-run` makes for a base, `bench-ext/<slug>:<base7>-serve`) plus the arm layer (remove `.bench.Dockerfile`, its ignore file and `.bench-test.sh` from `/work`; install git when the image has none). `docker create` takes no `-v`, `--mount`, `--privileged`, `--cap-add`, `--pid` or `--ipc`, no Docker socket, a `--memory 6g` cap, `--cap-drop` of `NET_RAW`, `MKNOD`, `SYS_CHROOT`, `SETFCAP`, `SETPCAP`, `AUDIT_WRITE`, `NET_BIND_SERVICE` and `FSETID` (ruling 3), and `--entrypoint sleep` with `(RESUMES + 2) × turnTimeoutSec + 600` seconds, so no recipe's entrypoint swallows the command and a box ends by itself if the host process dies. The `.git` the agent sees is the fresh repo `run-arm` already makes from `withExport`, copied in; a second commit, `env`, records what the image build changed, so the agent starts on a clean tree. Every commit in the box is a plain `git add -A`, never `-f`: `node_modules`, `target` and `.venv` stay out through the repo's `.gitignore`. So the data folder, the task repo, `<data>/seeded/`, `/tmp/hstack-bench`, the host's `~/.claude` and every user setting or skill are not in the box at all: this closes the open point of the step 7 lock, and a transcript scan has nothing left to find, so `leakTurns` and the `leak` fields go. The `db !== null` refusal stays, reworded: step 8 is external only, and a real-estate arm needs Postgres inside its box, which is the plan of step 11. The box takes no `--plugin-dir` yet (`H`, `W`: the plan of step 11), and it refuses one. `probeOk`'s user skills are `[]`: the box has none.

3. **The network.** Docker's default bridge, with the firewall set from outside by a helper, `docker run --rm --cap-add NET_ADMIN --network container:<box> bench-arm/fw:1`: policy DROP on INPUT, OUTPUT, FORWARD for IPv4 and IPv6; allowed only loopback, established traffic and TCP 443 to the addresses `api.anthropic.com`, `console.anthropic.com`, `platform.claude.com` and `claude.ai` resolve to when the box is made. No DNS is open: those names are pinned by `--add-host`, so nothing can tunnel through a resolver. The box keeps six of Docker's default capabilities, `CHOWN`, `DAC_OVERRIDE`, `FOWNER`, `KILL`, `SETUID` and `SETGID`, because a task's own services may run as another user and none of the six touches the network. The other eight are dropped, `NET_RAW` above all: an `AF_PACKET` frame passes under every iptables rule (tried by hand on 2026-11-06: with the rules on, a raw frame got a DNS answer from the VM resolver; with `NET_RAW` dropped the socket is refused). So root in the box cannot change a rule or send past one. iptables does not see `AF_VSOCK` either, so the proof requires opening it to fail. Before the first turn of every run the helper checks from the same namespace that an allowed address answers and that `1.1.1.1:443`, `github.com:443`, `host.docker.internal:<port>`, the bridge gateway `:<port>` and the VM resolver `:53` do not; any other answer refuses the run with exit 2 before a token is spent. `<port>` is a throwaway listener on an ephemeral host port (`Bun.listen`), closed in every outcome: no probe ever opens a connection to the host's port 5432, not in this check and not in the proof. A restart gives the box a new namespace with no rules, so `StartedAt` is read just before the rules and compared at the top of every turn and of the product; a mismatch kills the box and the run is `machine` (`killed`). The default bridge gives the box no IPv6 address, so the same check requires none on `eth0`; the IPv6 DROP policy is a second line.

4. **Tools the arms do not get.** `--disallowedTools WebSearch,WebFetch` for every arm. The tasks are public PRs: `WebSearch` runs on the API side, so the firewall does not stop it, and it can find the fix. Section 3's "same tool permissions" holds, since no arm has them. `probeOk` refuses a run whose init lists either.

5. **The CLI and the credential.** The binary of `@anthropic-ai/claude-code-linux-arm64@<host version>` (`npm pack`, never run on the host) sits at `<data>/arm/claude-<version>` and goes in by `docker cp`. The token is the user's (decision 1 below), at `<data>/arm/box.env`, mode 600, given by `docker exec --env-file`. The box env also sets `IS_SANDBOX=1` (the CLI refuses `bypassPermissions` as root otherwise), `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`, `DISABLE_TELEMETRY=1` and `DISABLE_AUTOUPDATER=1`.

6. **A turn and the product.** A turn is `docker exec` of `timeout -k 30 <turnTimeoutSec> claude …` with stdout in a file in the box, copied out when it ends, so a background server cannot hold the pipe. The session stays in the box's HOME, so `--resume` finds it. The host bounds the exec at `turnTimeoutSec + 120`; past that it kills the box and the run is `machine` (`killed`). A turn that `timeout` ends (exit 124, or 137 at or past the limit) is the arm's own `timeout`: the same `reason` and interventions as `runGroup`'s today, and its product is still saved. A 137 before the limit is a memory kill, and the run is `machine` (`memory`). Every process in the box but PID 1 is killed first (`kill -9 -1`), so nothing the agent left running can swap the bundle or move HEAD. The product comes back only as `git bundle create` of HEAD, by `docker cp`, and `git -c gc.auto=0 fetch <bundle> HEAD:refs/heads/bench/<name>` into the task repo. The folder never comes back: an agent-written `.git/config` must not reach the host. A commit is touched on the host only by git (`fetch`, `worktree add`, `archive`).

7. **What an arm is told (section 5).** The prompt is `input.md`, a blank line, `interface.md`, then `DONE_LINE`, for every arm. The classifiers counted names in the sheet as stated, so a run without it would fail checks on a name, not a behaviour. A missing sheet is refused. B-'s three instructions stay where they are: `--append-system-prompt`, B- only, the text `armArgs` and its test pin. B's prompt and tools do not change.

8. **arms.json.** `{ "model": "claude-opus-5-5", "smallModel": "claude-sonnet-5-5", "cli": "arm/claude-2.1.318", "turnTimeoutSec": 14400, "plugins": { "H": [], "W": [] } }` (decision 2 below). All four current models have a training cutoff of June 2026, before the 2026-07-01 of section 4.2 (models overview, read 2026-11-06), so no model change is needed. 14400 stays: the limit catches a hang, and a shorter one would cut B more than B-.

9. **`d`.** A run's score is `build + requirement`, the two numbers `oracle score` gives under ruling 7 of step 6. A term that is null adds nothing, and it is null for both arms alike (s1-01 and s3-01 have no step id: requirement only). A task's score in an arm is the mean of its 2 runs (10.1). `d_t = score(B) − score(B-)`. The stick passes when the mean of `d_t` over the 6 tasks is > 0 and `d_t > 0` on at least 5 of them. A tie favours nobody. The report also prints `d` on build and on requirement apart (6.3). The same reading is what H4's "build + requirement" means at step 14.

10. **A missing score.** No score is imputed.
    - A run that ends `abandoned` or `timeout` has a product, and it is graded as it stands, as is an empty one.
    - A grade with no JUnit, or `not ready`, or `timeout`, or killed for memory, is run once more. The second result stands: with no result every check reads `error` and the product scores 0, the rule the README gives for steps 7 and 8 ("a product that does not serve still scores 0"). Each such product is counted in the report, and one killed for memory is told to the user with its task.
    - A grade that throws while `docker version` fails, or with the disk under its floor, is the machine's: no score, the driver stops with exit 3.
    - The report prints `not judged` and no verdict while any of the 24 has no score.

11. **A machine failure is never an arm's weakness.** A run is `machine` (with `machine: <reason>` in its record, kept, never scored) when a turn's result has `is_error` (`api`: a rate limit or an outage), when the arm's model is not among the record's models, or when a turn's transcript holds a model fallback notice (`model`: a fallback; a subagent's other model is not a failure), when the host killed the box or the box died or restarted (`killed`), when the kernel killed the CLI for memory before the limit (`memory`), or when no product could be saved (`product`). k counts runs that are not `machine`, the next run takes the next free number, and `api` stops the driver with exit 3. The turn counts of 9.3 are not touched.

12. **Order (10.1).** Tasks in `sample.tsv` order, one at a time. Within a task the 4 runs go in `queuePick(['<task>:B:1', '<task>:B:2', '<task>:B-:1', '<task>:B-:2'], 4, seed)`, seed from `ext/groups.json`. Each product is graded right after its run, so a box and a grade never overlap and `readiness` shows a failure early; the driver reads no score before the report.

13. **Docker and disk.** One Docker job at a time, box or grade; `--sealed` on every grade. `canary run` runs `docker builder prune -f` before a task when the build cache is above 15 GB (the cache rule of step 7), and `diskFloor` still stops at 15 GB free. A box's names go in `<task>/docker.json` when made and are removed by `removeRecorded` when the run ends, in every outcome; `bun bench/ext.mjs remove <task>` clears what a killed run left. `bench-arm/fw:1` is the one name outside that record: it is listed in the lock and removed by that name at the end.

14. **If the stick fails.** Nothing changes first. `grade env/<task>.json <task>/seeded/oracle --at <B- product> --sealed` on the 12 B- products, counts only (8.3 ruling 11), and 3 B/B- pairs for the user to read, the tasks with the lowest `d`, as `git diff` files in `<data>/canary/pairs/`. Then the work stops for the user. "Fix the stick" is a new plan. "Make B- weaker" is `smallModel: claude-haiku-5-5`, B- only, the next free run numbers, B's runs standing.

15. **In no score.** These runs enter neither H1 nor H2. `results/<task>-<arm>-<n>/` keeps the transcripts; the record adds `box` (image id, memory cap) and `toolUses`, so the report can show whether B- obeyed. An arm product is not sealed, but the grades of it are read only through the tools' counts.

## Extended canary (2026-11-07)

A deviation, written after the 6-task results were seen and registered in section 7.3 of the [prereg](/plans/2026-10-27-benchmark-prereg.md) before any of its runs. The original rule's result stands as a failed canary: B- on `claude-sonnet-5-5` mean 0.40, B- on `claude-haiku-5-5` mean 0.43, both 3 of 6. The two branches of 7.3 are used, 3 tasks tie on 6 (on s1-02 and s3-02 the issue states the fix and the products are equivalent; on s3-01 B itself scores 0), and no task favoured B-. The user chose to extend the canary to unused tasks, with the rule fixed first.

- **Tasks.** The 14 kept tasks of `ext/sample.tsv` with `cold_setup` `no` that are not the 6 canary tasks: s1-03, s1-04, s1-05, s1-06, s1-07, s2-03, s2-05, s2-07, s2-08, s2-10, s3-03, s3-04, s3-05, s3-06. Nobody has seen their results. The cold-setup tasks stay out, so they stay unseen.
- **Arms.** B unchanged, B- `claude-sonnet-5-5`, k = 2, in the box, rulings 2–13 and 15 unchanged. The Haiku runs are recorded and enter no verdict.
- **Verdict.** `d` by ruling 9. The stick passes when the lower bound of a 95% bootstrap interval of the mean of `d` over the 14 tasks is > 0 (10,000 resamples of tasks, each keeping its 2 runs; seed `hstack-bench-2026-10-27`; the interval rule of 10.1, not H4). The t interval, the favour count and the same numbers over all 20 tasks are reported and decide nothing.
- **If it does not pass,** no further branch: the stick is recorded as not validated and the decision goes back to the user. No diagnosis step.
- **Dependency files.** A task whose PR changes one stays in and is flagged in the lock. None is flagged today (counted 2026-11-07: no PR of the 20 tasks changes a dependency file).
- **Code.** `bootstrapMean`, `tInterval` and `intervalVerdict` in `bench/lib/score.mjs`; `extendedTasks` in `bench/canary.mjs`, whose `report` prints the extended lines after the original verdict line, which does not change.

## Decided by the user (asked with this plan)

1. **The credential: decided on 2026-11-06.** A token from `claude setup-token`, made by the user on another machine and written to `<data>/arm/box.env`. It went through the session transcript, so it is revoked after step 8.
2. **The tier of B-.** Recommended: `claude-sonnet-5-5` first, `claude-haiku-5-5` as the "make B- weaker" step of 7.3. A pass against one tier down says more about the stick than a pass against the weakest model, and failing costs 12 runs. Alternative: Haiku now, which makes the first pass likelier and weaker evidence.
3. **Package registries from the box.** Recommended: closed, API only. An open registry lets an arm fetch a later release of the task's own project, which can hold the fix. An arm cannot install a new dependency, equally for all arms. The PRs of all 6 canary tasks change no dependency file (counted 2026-11-06), so this costs nothing here. Step 13's plan looks at the other 18.
4. **The word "network" in your Docker rule.** The box uses the default bridge, and the helper is `docker run --rm --cap-add NET_ADMIN --network container:<box>`. Nothing calls `docker network`, no network object is made, and the capability is the helper's, for the seconds it takes to set the rules, never the box's. The rule as I read it forbids the subcommand. Please confirm that reading. There is no way to allow the API and deny the rest without it: `--network none` cannot reach the API. Also confirm `--memory 6g` on the box (Docker itself stays at 7.6 GB).

## Tried by hand (2026-11-06)

All in containers that remove themselves; nothing is left behind.

- A helper in `--network container:` with `--cap-add NET_ADMIN` set the rules on a running `alpine:3.22` box: before them 1.1.1.1 and github answered, after them both were blocked and `160.79.104.10:443` still answered; the VM resolver was blocked. Root in the box had no iptables and could not take `eth0` down (`Operation not permitted`). The box's `inspect` shows no capability and 0 mounts.
- The Linux CLI (322 MB) runs in `node:24-bookworm-slim` and reports 2.1.318. As root it refuses `bypassPermissions`; with `IS_SANDBOX=1` it starts. That image has no git, hence the arm layer.
- Firewall on, DNS closed, a fake token: with the four `--add-host` lines the CLI reaches the API and ends `401 Invalid bearer token` (`is_error: true`, `terminal_reason: api_error`); without them it hangs until `timeout` and prints nothing. So `/etc/hosts` is enough, and ruling 3 opens no DNS.
- With `--disallowedTools WebSearch,WebFetch`, `init` lists no web tool (20 tools; 21 with `WebSearch` without the flag), so `probeOk` can refuse on it.
- `eth0` has no IPv6 address on the default bridge. Not yet tried: a real turn, which needs the token (Task 6 is the gate).
- All 6 task images are `linux/arm64` on Debian glibc (bookworm or trixie), so one CLI binary fits all.

## Expected size

| lane | count | time |
|---|---|---|
| boxes (image from cache, start, firewall check) | 24 | 2–5 min each, the first of a task up to one grade's build |
| arm runs, one at a time | 24 | 8–10 h (section 11: B about 0.5 h a run) |
| grades, 1 per product (`step.json` names `oracle` for all 6; external ids are read from that grade) | 24 | about 2 h warm (one round of the 6 tasks took 26 min at step 5), up to 4 h after a prune |
| fail path only | 12 seeded grades | about 1 h |

**What the box costs.** No tokens beyond the section 11 row (6 × 2 × (0.4M + 0.3M) = 8.4M), plus a proof run in Task 6 of a few thousand. About 3 h of wall clock over 24 runs. Docker: one more image per run, removed at its end; 322 MB of CLI in each box's writable layer; memory capped at 6 GB, one job at a time, so 7.6 GB is enough unless a repo's own tests need more, which is reported, not hidden. Disk today: build cache 3.18 GB, images 4.81 GB, a VM disk of about 58 GB. `ext/repos/` grows by at most one repo copy per product (about 660 MB in all, because ruling 2 keeps ignored build outputs out of the bundle). `run-arm`: its host path goes; there is no way to run an arm on the host. Tests inject a stand-in box.

**Interventions and budget.** The Max 5x limit paces the runs (section 11). A limit hit is `machine` (ruling 11) and stops the driver: that run's tokens are spent, but no measure is lost.

## Global Constraints

- Bun only, no new dependency in `bench/`; tests run with `bun test ./tests`, output pristine. `bench/` names no stack, customer or task. `<data>` = `/Users/hbchuc/Documents/programing/vibe-code/hstack/.evidence/bench` (gitignored, main checkout). Set `HSTACK_BENCH_MACHINE=<data>/machine.json` for every bench command.
- Build on a new branch from `main` (`git switch -c bench-canary main`). Do not push `worktree-bridge-cse_01JxVNAL2Dkzabg9QuuNaY5E`: it holds per-bug labels squashed out of main. A push that keeps disconnecting worked with `git -c http.postBuffer=524288000 push`; do not change the git config.
- Never write under `/Users/hbchuc/Documents/programing/vibe-code/outsourcing/`. Never touch `real_estate*` databases.
- **External code.** Never on the host: not an arm, not a product, not a recipe. A commit is touched on the host only by git.
- **Docker.** Never `prune`, `volume`, `compose` or `network`, except `docker builder prune -f`. Image or container removal only by the names a step recorded, never `-f`. Docker stays at 7.6 GB. One external task at a time, one Docker job at a time.
- **Sealing.** Every grade of an oracle runs with `--sealed`. Never read `ext/raw/`, `ext/sealed/`, `heldout/`, `seeded/`, `<task>/seeded/` (other than `validation-*.json`, `kills.json`, `grades/`), `logs/step7/*.out`, or any oracle, step oracle, seeded-bug or reply file by hand. Plain `bun bench/bugs.mjs <task> <sealed> --sealed` is forbidden (only `--usable`, `--fix-tally`, `--at-tally`). No arm transcript is read during the run. Replies to the user hold only counts, scores and verdicts.
- This session is not the plugin-design session (section 12, step 10).
- Record each task's usage in `progress/progress.md` (implementer and reviewer tokens and minutes, wall clock of the runs). Copy the SDD ledger into `progress/progress.md` before the final review. The plan goes `stable` only after the user approves the build.
- Docs, logs and commit messages in English.

## Review Focus

1. A firewall that did not apply: the helper fails, or the box restarts and its namespace is new. Expected: no turn runs. Test: Task 3 'a firewall that does not hold refuses the run before any turn' and 'a box that restarted runs no turn'.
2. A rate limit reads as a weak arm. Expected: the run is `machine`, unscored, and the next run takes its place. Test: Task 4 'an API error marks the run machine and it gets no score'; Task 5 'k counts runs that are not machine'.
3. A timed-out turn hangs the host or loses the product. Expected: the host's exec returns, the product still comes back, and `leave` ends whatever the agent left running in the box; a killed run leaves no container. Test: Task 3 'a turn over its limit returns, the product comes back, and leave ends what is left'.
4. An agent's `.git` reaches the host. Expected: only bundled objects do. Test: Task 4 'a config the agent wrote in .git does not reach the task repo'.
5. A bundle of a fresh history does not fetch into a bare shallow repo, the shape of every `ext/repos/*`, and a seeded repo's alternates break. Expected: the branch resolves, `gc.auto=0`, and the sealed repo still reads `end`. Test: Task 4 'a product bundle fetches into a bare shallow repo and a repo on its alternates still reads'.

---

### Task 1: Register the rulings

**Files:**
- Modify: `docs/plans/2026-10-27-benchmark-prereg.md` (section 7.3, a dated paragraph), `docs/log.md`

- [ ] **Step 1:** Write the 7.3 paragraph "Applied at step 8 (2026-11-06)": rulings 1–15 and the user's four decisions as decided, ending "registered before any arm runs; `bench/canary.mjs run` has not run". Add one line under H4's table row, or just below the table, pointing to ruling 9. Add an **Update** line to `docs/log.md` (the plan is already in `docs/plans/index.md`). Commit the plan and the index with them, `git commit -m "Register the canary rulings before any arm runs"`.

### Task 2: Pure rules

**Files:**
- Modify: `bench/lib/arm.mjs`, `bench/lib/agent.mjs`, `bench/lib/score.mjs`, `tests/bench-arm.test.mjs`, `tests/bench-agent.test.mjs`, `tests/bench-score.test.mjs`

**Interfaces:**
- Produces:
  - `API_HOSTS = ['api.anthropic.com', 'console.anthropic.com', 'platform.claude.com', 'claude.ai']`, `WEB_OFF = ['WebSearch', 'WebFetch']`.
  - `armArgs(arm, cfg)` adds `disallow: WEB_OFF` for every arm. `probeOk` refuses an init whose tools hold a `WEB_OFF` name.
  - `boxArgs({ name, image, platform, hosts: [{ host, ip }], limitSec, memoryGB }) -> string[]`: the `docker create` arguments of ruling 2.
  - `fwScript(ips) -> string`, `netScript(ips, blocked: [{ host, port }]) -> string` (prints `reach <host>:<port>` or `blocked <host>:<port>`), `netOk(text, ips, blocked) -> null | why`.
  - `claudeArgs({ …, disallow })`: `--disallowedTools a,b`.
  - `apiError(streamJson) -> boolean`: the last `result` event has `is_error: true`.
  - `canaryScore(build, requirement) -> number`: `(build ?? 0) + (requirement ?? 0)`.
  - `canaryVerdict(rows: [{ task, arm, n, build, requirement }]) -> { tasks: [{ task, b, bMinus, d, dBuild, dRequirement, spread, favour }], mean, favour, pass, judged }`: `judged` false unless every task has 2 scored runs in each arm. `spread` = `|s1 − s2|` of B.

- [ ] **Step 1: Write the failing tests:** 'boxArgs mounts nothing and asks for no capability' (no `-v`, `--volume`, `--mount`, `--privileged`, `--cap-add`, `--pid`, `--ipc`, `--network` and no `docker.sock` in the list; `--memory 6g`, `--entrypoint sleep` and one `--add-host` per host present); 'fwScript drops by default and opens only 443 to the given addresses'; 'netOk refuses a blocked address that answers and an allowed one that does not'; 'every arm has the web tools off and B- alone has the three instructions'; 'probeOk refuses a web tool at init'; 'apiError reads the last result'; 'a null term adds nothing'; 'a tie favours nobody' (five `d > 0` and one `d = 0` passes; four and two ties fails); 'the mean must be above 0 as well'; 'a task with one scored run is not judged'.
- [ ] **Step 2: Run** `bun test tests/bench-arm.test.mjs tests/bench-agent.test.mjs tests/bench-score.test.mjs` — expect FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `bun test ./tests` — all pass, output pristine. Commit `git commit -m "Add the box's arguments, its firewall rules and the canary's d"`.

### Task 3: The box

**Files:**
- Create: `bench/box.mjs`, `tests/bench-box.test.mjs`
- Modify: `bench/ext.mjs` (export `buildImage`, `recordDocker`, `diskFloor`, `sp`, `must`, `daemon`), `bench/README.md`

**Interfaces:**
- Consumes: `boxArgs`, `fwScript`, `netScript`, `netOk`, `API_HOSTS`, `claudeArgs`, `taskOf`, `parseRecipe`, `parseServe`, `removeRecorded`, the ext exports above.
- Produces:
  - `enterBox({ data, task, id, name, base, repoGit: <host path of the fresh .git>, cli, turnTimeoutSec }, inj = {}) -> { envCommit, turn(opts) -> { out, code }, product(destFile), leave() }`, with `inj = { hosts, helper, cli }` (defaults: `Bun.dns.lookup` of `API_HOSTS`, `bench-arm/fw:1`, the `cli` argument), the seam Task 3's tests use. `code` is `'timeout'` for an exit of 124 or for a 137 at or past the limit, `'memory'` for a 137 before it, `'killed'` past the host's limit or when the box died or restarted; `product` gives `{ code: 0 }` or `{ code: 'killed' }`. It refuses plugin dirs. In order: `diskFloor`; `bench-arm/fw:1` built if missing or without python3, from `alpine:3.22` plus iptables and python3; the two images, recorded before each build; resolve `API_HOSTS` with `Bun.dns.lookup`; `boxArgs`, `docker start`; `fwScript` then the net check by the helper; `docker cp` of the CLI, the `.git` and the empty settings; the `env` commit. `leave` removes by `removeRecorded`, in every outcome.
  - `ARM_LAYER`: the Dockerfile lines of ruling 2, appended by the `FROM <serve tag>` pattern of `oracle-run`'s grade image.
  - `bun bench/box.mjs proof <task>`: enters a box for the task at its base and prints one line per row of Task 6's table, `<row> ok|FAILED`, exit 1 on any `FAILED`; writes `<data>/arm/proof-<task>.json`.

- [ ] **Step 1: Write the failing tests.** Under the `BENCH_EXT_DOCKER=1` gate of `tests/bench-ext-check.test.mjs`, on an `alpine:3.22` fixture recipe that installs git itself and a `sh` stub for the CLI; a second container on the bridge, listening on 443, stands in for the allowed address, and one more listening on 443 for a denied one: 'a box holds no host path' (the fixture data folder, the fixture repo and `/tmp/hstack-bench` are missing; no `docker.sock`; 0 mounts by `inspect`); 'the allowed address answers and the denied one does not'; 'root in the box cannot change a rule'; 'a firewall that does not hold refuses the run before any turn' (a stub helper that does nothing: `enterBox` throws and the CLI stub never ran); 'a session survives between turns' (a stub that writes to HOME and reads it on the next `turn`); 'a turn over its limit returns, the product comes back, and leave ends what is left'; 'the agent starts on a clean tree' (`git status --porcelain` empty, no `.bench*` in `/work`); 'an ignored build output stays out of the bundle'; 'product gives a bundle of what the agent changed'; 'leave removes the box and its images by their recorded names, and only those'.
- [ ] **Step 2: Run** `BENCH_EXT_DOCKER=1 bun test tests/bench-box.test.mjs` — expect FAIL.
- [ ] **Step 3: Implement** `bench/box.mjs`; README: the box, the `arm/` folder in the data layout.
- [ ] **Step 4: Run** `BENCH_EXT_DOCKER=1 bun test tests/bench-box.test.mjs` and `bun test ./tests` — pass, output pristine. Commit `git commit -m "Add the arm box: the task's image, nothing mounted, firewalled from outside"`.

### Task 4: run-arm in the box

**Files:**
- Modify: `bench/run-arm.mjs`, `bench/README.md`, `tests/bench-arm.test.mjs`
- Create: `tests/bench-host-box.mjs` (the stand-in box: the old host path, for tests only)

**Interfaces:**
- Consumes: `enterBox`, `apiError`, `toolUses`, `armArgs`.
- Produces:
  - `runArm(args, { root, box = enterBox })`. `loadArms` takes `cli`, a file that must exist. `leakTurns` and the `leak` and `leakTurns` fields are gone; the two `shortcut:` comments go, the `db` refusal keeps one that names the plan of step 11.
  - The record adds `machine: null|'api'|'model'|'killed'|'memory'|'product'`, `box`, `toolUses`, `envCommit` (the stand-in box gives the same fields and the same `'timeout'`). A `machine` run exits 3.

- [ ] **Step 1: Move the existing tests onto `tests/bench-host-box.mjs`,** deleting the leak test. Write the failing tests: 'the prompt holds the input and then the interface sheet'; 'a missing sheet is refused before any call'; 'the arm gets the web tools off' (the stub's argv); 'an API error marks the run machine and it gets no score'; 'a run served without its model is machine; a subagent on another model is not'; 'a config the agent wrote in .git does not reach the task repo'; 'a product bundle fetches into a bare shallow repo and a repo on its alternates still reads'; 'a plugin dir is refused by the real box'; 'a task with a database is still refused'.
- [ ] **Step 2: Run** `bun test tests/bench-arm.test.mjs` — expect FAIL.
- [ ] **Step 3: Implement;** README: `run-arm`, the record's fields, the removal of the leak sentences and of "a sandbox must replace it before prereg step 8".
- [ ] **Step 4: Run** `bun test ./tests` — pass, output pristine. Commit `git commit -m "Run every arm in its box and take the product back as a bundle"`.

### Task 5: The canary driver and report

**Files:**
- Create: `bench/canary.mjs`, `tests/bench-canary.test.mjs`
- Modify: `bench/oracle.mjs` (export the read behind `score` as `scoreAt(data, task, sha) -> { build, requirement, passed }`), `bench/README.md`

**Interfaces:**
- Consumes: `runArm`, `grade`, `scoreAt`, `canaryVerdict`, `canaryScore`, `queuePick`, `parseSize`, `daemon`, `diskFloor`.
- Produces:
  - `bun bench/canary.mjs run <task>`: ruling 12's order, resuming from `results/` and `grades/`: runs what has no non-`machine` record, grades what has no good grade, ruling 10's second grade. Exit 3 on a machine stop, printing `<task> stopped: <reason>`. Before the task: the cache rule. Prints only `grade`'s count lines and `<task> <arm> <n> <status> grade=<ok|again|noresult>`.
  - `bun bench/canary.mjs report`: writes `<data>/canary/report.json`; prints per task `b`, `bMinus`, `d`, `dBuild`, `dRequirement`, B's spread and per run tokens, minutes, status; then `canary mean=<m> favour=<n>/6 verdict=<pass|fail|not judged>`.
  - `bun bench/canary.mjs diagnose`: ruling 14: the seeded grades and `<data>/canary/pairs/`, the pairs by lowest `d`, each `git diff <envCommit> <product>` so build outputs do not pad the read, printing counts only.

- [ ] **Step 1: Write the failing tests** (fake `runArm`, fake `grade`, fake Docker calls): 'runs go in queuePick order, each graded right after it'; 'k counts runs that are not machine'; 'an api stop exits 3 and a rerun resumes'; 'no JUnit is graded once more and the second stands'; 'a product with no result scores 0 and is counted'; 'a daemon failure is no score'; 'a rerun repeats no finished run or good grade'; 'the report gives no verdict while a score is missing'; 'the report reads build and requirement from the grade files'; 'a task with no step id is scored on requirement'; 'diagnose runs only on B- products and prints only counts'.
- [ ] **Step 2: Run** `bun test tests/bench-canary.test.mjs` — expect FAIL.
- [ ] **Step 3: Implement;** README: the three commands, `canary/` in the data layout.
- [ ] **Step 4: Run** `bun test ./tests` — pass, output pristine. Commit `git commit -m "Add the canary driver and its report"`.

### Task 6: Set up and prove the boundary live

This task needs the user: the token (decision 1).

- [ ] **Step 1:** `npm pack` the Linux package into a new empty folder, check its integrity against `npm view … dist.integrity`, put the binary at `<data>/arm/claude-2.1.318`. Write `<data>/arms.json` as in ruling 8.
- [ ] **Step 2:** The token of decision 1 is at `<data>/arm/box.env` (`CLAUDE_CODE_OAUTH_TOKEN=…`, mode 600). No agent reads its value.
- [ ] **Step 3:** `bun bench/box.mjs proof s1-01`. Every row must print `ok`:

| row | how |
|---|---|
| data folder, task repo, `<data>/seeded/`, `/tmp/hstack-bench`, `~/.claude` absent | `test -e` on the real host paths, inside the box |
| no mount, no socket, only the six capabilities | `docker inspect`, `/var/run/docker.sock` absent, `CapEff` is exactly the mask of the six of ruling 3 |
| no `BENCH_*`, `PG*`, `DATABASE_URL`, `HSTACK_BENCH_MACHINE` | `env` in the box, names only |
| the blocked targets of ruling 3 and DNS, each shown to answer from a box with no rules first (a refusal is an answer) | the helper's net check, before and after the rules, on the throwaway listener's port, never 5432 |
| no IPv6 route out | no address on `eth0` (`ip -6 addr`), the IPv6 DROP policy set |
| the API answers | a real `claude -p "Reply OK."` turn on `model`, then on `smallModel` |
| init lists no web tool | the probe's `tools`, on both models |
| root cannot undo it | from a twin (the box's capabilities on `--network container:<box>`, the helper's image, so a box with no `ip` cannot pass by absence): `iptables -P OUTPUT ACCEPT` and `ip link set eth0 down`, each refused by the kernel (`/not permitted\|denied/i`) |
| no vsock | from a twin: opening an `AF_VSOCK` socket (family 40) fails with an OS error |
| a real database is out of reach | the host is reachable on a throwaway listener with no rules and not after them, closed in every outcome; no `real_estate` string in the box's env; nothing opens the host's port 5432 |

- [ ] **Step 4:** One agent turn on `model`, prompt in `<data>/arm/proof-prompt.md`: try to read the listed host paths, `curl` github.com, use WebSearch and WebFetch, `git ls-remote` the task's upstream, reach the host on a throwaway listener's port, call the API directly with the token asking for the server-side web search tool, and report each result. Save the reply as the proof's `agent` part. Every attempt must have failed but the direct API call, whose result is recorded (see Known limits). An extra host the CLI turns out to need is added to `API_HOSTS` with a test, recorded as a ruling, and the proof is run again.
- [ ] **Step 5:** Record the table in `progress/progress.md`. Anything `FAILED` stops the plan.

### Task 7: Pilot

- [ ] **Step 1:** `docker builder prune -f` if the cache is above 15 GB, then `bun bench/canary.mjs run s1-01` (the smallest image and input). Record each line, tokens and minutes.
- [ ] **Step 2:** Read the lines and the readiness, not the transcripts. If a tool must change, for a reason that depends on no score, change it, void the pilot's runs unread (delete `results/s1-01-*` and the four branches by `git update-ref -d`), and rerun, as the step 7 pilot allowed. A change is recorded as a ruling. Otherwise the pilot's results stand.

### Task 8: All tasks

**Files:**
- Create (gitignored): `<data>/logs/step8/run.sh`
- Modify: `progress/progress.md`

- [ ] **Step 1:** Write the driver: `canary run` for the 6 tasks in `sample.tsv` order, stop on exit 3. Run it detached. After a machine stop, wait for the reason to clear and start it again.
- [ ] **Step 2:** `bun bench/canary.mjs report`. Record every line. A memory kill goes to the user with its task. **The stick's verdict goes to the user.**

### Task 9: If the stick fails

Only when the report says `fail`.

- [ ] **Step 1:** `bun bench/canary.mjs diagnose`. Record the counts.
- [ ] **Step 2:** Stop. Tell the user the counts and where the 3 pairs are. What follows is the user's call (ruling 14); a rerun with a weaker B- goes through `canary run`, and a change to the stick is a new plan.

### Task 10: Lock

**Files:**
- Create: `progress/step8-lock.md`
- Modify: `docs/log.md`, `progress/progress.md`

- [ ] **Step 1: Check:** `bun test ./tests` and `BENCH_EXT_DOCKER=1 bun test tests/bench-box.test.mjs` pass; `git status --short bench` empty; every scored run has a branch and a grade; no `bench-ext-*-arm-*` container or `*-arm` image is left; the step 5, 6 and 7 hash compares report 0 changed (new `grades/*.json` are new files; `docker.json` and `build/readiness.tsv` are in no lock's hashes); the Docker names left are those before the step, plus `bench-arm/fw:1`, which is then removed by that name; `/tmp/hstack-bench` is empty.
- [ ] **Step 2: Write** `progress/step8-lock.md`: the rulings; the proof table; per task and arm the scores, `d`, `dBuild`, `dRequirement`; the verdict; B's cost (tokens, minutes) and spread per task, against section 11's 0.4M and 0.3M; B-'s tool use; machine runs, `noresult` products and memory kills; each run's CLI version, models, base and branch sha; `shasum -a 256` of `arms.json`, the CLI binary, the briefs and the report (paths relative to `<data>`, never `box.env`); the `bench/` commit; open points.
- [ ] **Step 3: Record** usage in `progress/progress.md`, a **Creation** line in `docs/log.md`; commit `git commit -m "Lock the stick canary of step 8 with its verdict, cost and spread"`. Remind the user to revoke the token.

## Known limits

- **s1-02 and s2-02 have one scored check, s1-01 two.** There `d` is near-binary and a tie is likely, when both arms build the small fix or neither does. Two ties fail the 5-of-6 rule, whatever else happens. That is the rule as registered, and its failure path exists for this: the seeded checks give those tasks 3 more points of evidence.
- **Build counts twice.** External step ids are a subset of the fix-commit checks, and requirement counts every fix check, so `build + requirement` weighs step checks double. On s1-02, s2-02 and s3-02 the two terms are the same checks; only s2-01 differs. Ruling 9 keeps the prereg's literal sum: an equal-weight `(b + r) / 2` would change only how much s1-01 and s3-01 weigh in the mean, never a task's sign.
- **Effort is the CLI's default for each model,** and the API defaults differ (Opus 5.5 `medium`, Sonnet 5.5 `high`), so B- may think harder per token than its tier suggests. The prereg fixes no effort, and pinning one here would be a new arm definition. The CLI version is the same for both arms.
- **`git add -A` in the box** carries into the product any file the image build made that `.gitignore` does not cover. The `env` commit keeps it out of the agent's diff, and the grade rebuilds over it.
- **An agent can reach the API with the token by `curl`,** and so ask for the server-side web search tool through it. Nothing but ruling 4's flag stops that, and the flag binds only the CLI: the firewall must let the API through. Task 6 step 4 tries it and records the result. Deliberate work, not an accident; a Bash call that names the API would show in the transcript, which no tool scans.
- **The token sits in the box env,** so a transcript can hold it if an agent prints it, and a product if an agent writes it to a file. `results/` is gitignored and the lock hashes no transcript. No tool may read the value, so none can scrub it; it is revoked after step 8 (decision 1).
- **A process the agent left running can rewrite `/arm/turn-<n>.out`** before it is copied out, and the record's model, usage and `is_error` come from that file. Ruling 6 chose files; `product`'s `kill -9 -1` closes this for the bundle only.
- **Pinned addresses** hold for the length of a run; an address change mid-run reads as `api`, and the run is repeated.
- **`--memory 6g` is below what a grade may use** (no cap, 7.6 GB), so an arm can hit a limit its grade would not. It is reported when it happens, as a `machine` run (`memory`). A dropped capability may also break a task's start path; the pilot would show it.
- **A product's memory kill in a grade** cannot be told from the product's own fault under `--sealed`; it scores 0 after the second run and is reported.
- **`IS_SANDBOX=1` is a devcontainer flag** and may change other CLI behaviour; it is the same for every arm, and the lock records it.
- **The box and the controller share the Max 5x quota,** so the controller's own usage paces the runs too.
- **A task whose text trips the model's classifier** gets a model fallback on the arm's turns, and every such run is `machine` (`model`); the driver stops after 2 machine runs on it, and the user is told.
- **The box does not cover real-estate or plugin arms.** `H`, `W` and any task with a database are refused until the plan of step 11.

## Not in this plan

The H1–H3 analysis; any human read but the fail path's 3 pairs (step 9); stick v1 (step 10); plugins in the box and a real-estate box (step 11); step 13's question of registries for the other 18 tasks; the deferred minors of the step 7 lock.
