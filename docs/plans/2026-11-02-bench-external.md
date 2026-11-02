---
type: plan
title: "External task selection plan"
description: "Prereg step 4: register the rulings section 4.2 leaves open, enumerate every candidate PR of a fixed repo universe, sort once by the 4.2 hash rule and commit the list, then walk it in order, checking in a container that each task runs and has a fail-to-pass test, until 8 tasks per stack; commit the sample with hashes and what step 5 needs."
status: draft
generated: { by: claude-code/2.1.310, at: "2026-11-02T22:00:00+07:00" }
verified: []
sources:
  - id: prereg
    resource: /plans/2026-10-27-benchmark-prereg.md
  - id: replay
    resource: /plans/2026-10-27-bench-replay.md
---

# External Task Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prereg section 12 step 4 done: 24 external tasks (8 per stack) chosen by the section 4.2 rule from a candidate list that was committed before any task was checked, each with what step 5 needs (repo, base and end commits, the issue text as of the PR's opening, a container recipe that runs its tests).

**Architecture:** One CLI, `bench/ext.mjs`, with three commands. `list` enumerates a repo universe on GitHub (search sliced under the 1000-result cap, then each repo's merged PRs through GraphQL), applies the static criteria and writes one sorted list per stack. `check` takes one candidate: base commit, issue snapshot, a container recipe written by a sealed agent from the files at the base, builds at base-plus-the-PR's-tests and at the end, runs the PR's test files, and counts fail-to-pass tests, printing only counts. `walk` calls `check` down each sorted list until the stack has 8 tasks. The stack definitions (languages, marker files, test-path patterns) are data in `<data>/ext/groups.json`, so `bench/` names no stack.

**Tech Stack:** Bun 1.4.4+, `bun:test`, `gh` (logged in as emulatalk1; `gh api` and `gh api graphql`), git (blobless clones), Docker 29.9 on this arm64 Mac, the `claude` CLI 2.1.310 through `bench/sealed-agent.mjs`.

**Spec:** `docs/plans/2026-10-27-benchmark-prereg.md` sections 4.2, 7.1, 7.3, 10.2, 12 (steps 4, 5, 11), 13 (item 4); the tools as built: `bench/README.md`.

## Rulings section 4.2 leaves open (Task 1 registers them in the prereg before any enumeration)

Each is proposed here; the ones marked **(you)** are flagged for the user.

1. **Stacks (you).** S1 web app with a database = a repo whose GitHub primary language is Python with a Django app (`manage.py` that names `DJANGO_SETTINGS_MODULE`, at the root or one folder below), or Ruby with a Rails app (`config/application.rb` and `config/database.yml` in the same folder). S2 desktop app = primary language TypeScript, JavaScript, Rust, Vue or Svelte with an Electron app (a `package.json` whose text has `"electron":` and, in the same folder, a packaging config: `electron-builder.*`, `forge.config.*`, `electron.vite.config.*`, or `"build": {` / `"forge"` in that `package.json`) or a Tauri app (`src-tauri/tauri.conf.json`, `tauri.conf.json5` or `Tauri.toml`). S3 CLI or library = primary language Go with `go.mod` at the root. Why Go: Tauri puts Rust in S2, and S1 and S2 then hold Python, Ruby, JS/TS and Rust; Go is the prereg's remaining example, path-detectable for tests (`_test.go`), one toolchain. The language sets are disjoint, so a repo is in at most one stack. A Go web server is not excluded (no mechanical test separates it from a CLI); it is a known limit.
2. **Repo universe.** Per stack, every repo with stars ≥ 1000, `pushedAt` ≥ 2026-07-01 ("active after 2026-07-01"), `createdAt` < 2026-01-01 (brownfield: at least six months of history before the first eligible PR), not a fork, not archived, not a mirror, `licenseInfo.spdxId` in the OSI list of `groups.json` (`NOASSERTION` and none are out), and not used in hstack. Counts on 2026-11-02 for these qualifiers before the marker check: Python 4617, Ruby 485, TypeScript 3599, JavaScript 2116, Rust 1527, Go 2260. Search is sliced by stars range until each slice reports under 1000 results.
3. **Widening.** If a stack's list is exhausted before it has 8 tasks, a second tier (stars 500 to 999, same rules) is enumerated, sorted by the same key and committed before any of it is checked, and walked after tier 1. Still short: stop and ask the user. N never drops below 24.
4. **Snapshot window.** PRs created from 2026-07-01T00:00:00Z and merged before 2026-11-01T00:00:00Z into the default branch. The raw API responses are kept and hashed; a rerun of `list` later will not reproduce the list exactly (merges land daily, search ranking moves), so the committed list and the raw responses are the record.
5. **"Links the issue".** `closingIssuesReferences` has exactly one issue, in the same repo, created from 2026-07-01 and before the PR's `createdAt`. More than one, another repo, or an earlier issue: out, with the reason.
6. **Tests.** The PR changes at least one file matching the stack's test-path patterns and at least one other file that is not Markdown or under `docs/`; a PR with more than 100 changed files is out (its file list cannot be read whole in one page, and it is not PR-sized). PR author of type `Bot` is out.
7. **Sort key.** `sha256("<owner>/<repo>#<n> hstack-bench-2026-10-27")`, the id lowercased, one space before the seed, hex compared ascending; one list per stack; tier 2 after tier 1. Test vectors: `octocat/hello-world#42` → `bea5910fe308bac50ac3fe749d703078d7b3e8b3092710af42634f494c6a8c19`, `octocat/hello-world#7` → `3215ff12f22f2e4479f5b9d3b6720760bffad246a8bf123b1ece0900606d9359`.
8. **Static then runtime, in sort order.** Criteria that need a run (runnable in a container, a fail-to-pass test) are checked by walking the committed list from the top; the walk stops for a stack at 8 accepted tasks. The sort key does not depend on any criterion, so filtering everything first and walking in order give the same sample; rows below the stop are recorded as `not checked`. At most 2 tasks per repo: a third candidate of a full repo is `repo cap`, not checked.
9. **Base and end.** End = the PR's `mergeCommit`. Base = its first parent when it has two parents (merge), or when the PR has one commit, or when `git diff --name-only <end>^1 <end>` equals the PR's file list (squash). Otherwise (a rebase merge of several commits) out: its parent would hold part of the PR, and 7.1 needs a clean known-bad version.
10. **Runnable and fail-to-pass.** A recipe (image, setup at build time with network, a test script that runs given test files with no network and writes JUnit) is written by a sealed agent that sees only the repo's files at the base (no `.git`), at most 3 rounds per repo, plus 1 round for each further task of the repo. The test files are the PR's changed files matching the test patterns that exist at the end. Fail-to-pass = a test case (`classname` + `name`) that passes in both of two runs at the end and fails, errors or is missing in one run at the base with the PR's test files copied in. Limits: image build 45 minutes, test run 30 minutes. The recipe may name `linux/amd64` (run under emulation) when a dependency has no arm64 build. Out reasons, in order: `rebase merge of several commits`, `recipe failed`, `end build failed`, `PR tests do not pass at end`, `no fail-to-pass test`.
11. **Requirement text.** The issue's title and body as they stood at the PR's `createdAt`: the body from `userContentEdits` (the last edit before that time), the title from `RenamedTitleEvent`s after that time undone. When the body was edited after the PR opened and the history does not give the earlier text, the task stays and is flagged `edit-history: unverified`. No comment is kept. Whether `bench/input-check.mjs` applies to issue text (bodies hold code fences and stack traces) is a step 5 question, not an eligibility rule.
12. **Used in hstack.** A repo hstack ran as a project (built, tested or replayed): `real-estate` (private), the `daily-routine` app (private), `fixtures/electron` (local). None is public, so "at least 6 of the 8 repos never used in hstack" holds for every sample; the check is recorded. The 8 tasks of a stack come from at least 4 repos (at most 2 each); the prereg's "6 of the 8 repos" is read as "all but at most 2 of the stack's repos".
13. **Cold-setup repo (you).** Per stack, the sampled repo whose best-ranked task ranks lowest (the last repo to enter the stack's sample). The first repos of the list are taken by the canary (7.3, first 2 per stack) and the trial run (step 11, which runs H on them before the plugin is locked), so they cannot stay unseen. Nobody designing the plugin opens the cold-setup repos.
14. **Later needs.** A sampled task dropped in step 5 (for example no valid oracle check), or more tasks needed by the N rule of 10.2, are taken by continuing the same walk from where it stopped, on the same committed list.
15. **Model cutoff.** 2026-07-01 is after the June 2026 cutoff of the configured model; the cutoffs of every model are recorded at the lock of step 12. A model with a later cutoff then is a prereg change at that time.

## Needs you before the build

- Rulings 1 (stacks) and 13 (cold-setup repo).
- Docker clean-up: the plan never runs `docker rm`, `docker rmi`, `prune` or any volume command, so every check leaves its stopped containers (`bench-ext-*`) and images (`bench-ext/*`); about 4 images and 3 containers per checked candidate. If Docker's disk fills, the walk stops and asks. Say if you allow removing the `bench-ext-*` containers and `bench-ext/*` images this plan creates.

## Global Constraints

- Bun only, no new dependency; tests run with `bun test ./tests`, output pristine. `bench/` names no stack, tool or customer: languages, markers and test-path patterns are in `<data>/ext/groups.json`. `<data>` = `/Users/hbchuc/Documents/programing/vibe-code/hstack/.evidence/bench` (gitignored, in the main checkout; absolute paths from the worktree). Set `HSTACK_BENCH_MACHINE=<data>/machine.json` for every bench command.
- Never write under `/Users/hbchuc/Documents/programing/vibe-code/outsourcing/`. Never touch the databases `real_estate`, `real_estate_test`, `real_estate_hstack`, `real_estate_hstack_test`; this plan creates no database on the host. `sh <data>/env/real-estate/pgsnap.sh` before and after each `walk` batch; the two lists must be equal.
- **Docker.** Never `docker rm`, `rmi`, `prune`, `volume`, `compose down`, `stop` or `kill` on a container this plan did not start. Images are `bench-ext/<slug>:<sha7>[-t]`, containers `bench-ext-<slug>-<label>`. No `-v`, `--mount`, `--privileged`, docker socket or host network: results leave the container through `docker cp`. Every test run is `--network none`. Builds have network; Task 4 Step 1 decides what they may reach.
- **External code.** Clone only into `<data>/ext/repos/<owner>__<repo>` (`git clone --filter=blob:none --no-checkout`). Never run a repo's install, scripts, hooks or tests on the host; only inside `docker build` / `docker run`.
- **Sealing.** `<data>/heldout/` stays sealed: nothing in this plan opens it, and `bun bench/bugs.mjs` is not run at all. `<data>/ext/sealed/` holds what a PR's tests reveal (test file paths, JUnit, run logs at base-plus-tests and at the end); no implementer, reviewer or controller reads, lists or greps it; `bench/ext.mjs` prints only ids, verdicts and counts. The PR's description, diff, review comments and issue comments are never fetched. Committed files hold ids, dates, SHAs, counts and flags, never a title, body, test name or file path of a PR.
- Sealed agents run only through `bench/sealed-agent.mjs`; the recipe agent gets `--tools Read,Glob,Grep` and the files of the base, and replies with the recipe as JSON (no Write tool).
- Record each task's usage in `progress/progress.md` as earlier builds did: implementer and reviewer tokens and minutes, the summed usage of every recipe-agent run (from their `.run.json`), GraphQL points used, and wall clock of the walk.
- Docs, briefs, logs and commit messages in English.

## Review Focus

1. A star slice returns 1000 results and the rest of it is silently lost. Expected: a slice whose `total_count` is ≥ 1000 is split again; a one-star slice still ≥ 1000 is an error. Test: Task 3 'splits a slice that reaches the search cap'.
2. A PR's file or closing-issue list is truncated, so a test-only PR or a PR with two issues looks eligible. Expected: `totalCount` is compared with the nodes read; `changedFiles` > 100 is out. Test: Task 2 'out when changed files exceed 100' and 'out with two closing issues'.
3. `check` or `walk` prints a test name, a test file path or a log line. Expected: stdout is `<slug> ok f2p=<n> p2p=<m>` or `<slug> out <reason>`; failures go to `<data>/ext/sealed/<slug>/logs/`. Test: Task 4 'prints only the verdict and counts'.
4. A container reaches the host's Postgres on `127.0.0.1:5432`. Expected: test runs have no network; builds per Task 4 Step 1; `pgsnap` equal. Test: Task 4 Step 1 probe.
5. A flaky test counted as fail-to-pass. Expected: it must pass in both end runs. Test: Task 2 'a case failing in one end run is not fail-to-pass'.

---

### Task 1: Register the rulings and the stack data

**Files:**
- Modify: `docs/plans/2026-10-27-benchmark-prereg.md` §4.2 (new paragraph "Rulings registered before the enumeration (step 4)"), `docs/log.md`
- Create (gitignored): `<data>/ext/groups.json`

**Interfaces:**
- Produces: `groups.json` = `{ seed: "hstack-bench-2026-10-27", window: { createdFrom: "2026-07-01T00:00:00Z", mergedBefore: "2026-11-01T00:00:00Z" }, repo: { starsMin: 1000, tier2StarsMin: 500, pushedFrom: "2026-07-01", createdBefore: "2026-01-01" }, licences: [<SPDX ids>], maxFiles: 100, perStack: 8, perRepo: 2, usedInHstack: [], groups: [{ id: "s1"|"s2"|"s3", languages: [..], markers: [[cond, ...], ...], testPaths: [<regex source>] }] }`. `markers` is an OR of ANDs; `cond` = `{ path: "<literal path>", text?: "<regex source>" }`, the AND group matched in the repo root or in one folder below it, all its conds in the same folder. `testPaths`: s1 `(^|/)tests?/`, `(^|/)test_[^/]*\.py$`, `_tests?\.py$`, `(^|/)spec/`, `_(spec|test)\.rb$`; s2 `(^|/)(tests?|__tests__|spec|e2e)/`, `\.(spec|test)\.[cm]?[jt]sx?$`, `(^|/)tests?/.*\.rs$`; s3 `_test\.go$`. OSI list: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, MPL-2.0, GPL-2.0, GPL-3.0, LGPL-2.1, LGPL-3.0, AGPL-3.0, EPL-2.0, Unlicense, 0BSD, BSL-1.0, Zlib, MIT-0, Artistic-2.0, EUPL-1.2.

- [ ] **Step 1: Write the prereg paragraph** with rulings 1–15 above, the user's answers to rulings 1 and 13 as given at approval, the exact search qualifiers, the sort-key string with its two test vectors, and "registered before the enumeration; `list` has not run". Commit `git commit -m "Register the step 4 rulings for external task selection before any enumeration"`; add an **Update** line to `docs/log.md` in the same commit.
- [ ] **Step 2: Write `groups.json`** matching the paragraph; record `shasum -a 256` of it in `progress/progress.md`.

### Task 2: Pure selection logic

**Files:**
- Create: `bench/lib/ext.mjs`, `tests/bench-ext.test.mjs`

**Interfaces:**
- Produces:
  - `sortKey(id: string, seed: string) -> string` (hex; lowercases `id`, hashes `` `${id} ${seed}` ``).
  - `stackOf(tree: { root: string[], dirs: Record<string, string[]> }, texts: Record<string, string>, groups, language: string) -> string|null`: `tree.root` the root's entry names, `dirs[d]` the entry names of root folder `d`; `texts[path]` the fetched text of a cond's file; the first group whose `languages` holds `language` and whose markers match.
  - `staticOut(pr, repo, cfg, group) -> string|null`, the first reason that holds, in this order: `licence`, `fork or archived or mirror`, `repo too new`, `inactive`, `used in hstack`, `bot author`, `not default branch`, `window`, `closing issues != 1`, `issue in another repo`, `issue before window`, `issue after PR`, `over 100 files`, `no test file`, `no non-test file`. `pr` = `{ number, createdAt, mergedAt, author: { type }, baseRefName, changedFiles, files: string[], filesTotal, closing: [{ repo, number, createdAt }], closingTotal, commits, mergeCommit }`.
  - `baseOf({ parents: string[], commits: number, prFiles: string[], diffFiles: string[] }) -> { base, method: 'merge'|'single'|'squash' } | { out: 'rebase merge of several commits' }`.
  - `failToPass(base: Case[], end1: Case[], end2: Case[]) -> { f2p: number, p2p: number, endPass: number }` over `readJunit` cases (id `classname::name`); `p2p` = passes in all three.
  - `nextToCheck(rows, walked, cfg) -> row|null`: rows of one stack in sort order with `static` `ok`; skips rows already in `walked`, marks a row of a repo with `perRepo` accepted as `repo cap`; null once `perStack` are accepted.
  - `coldSetup(sample) -> repo` per ruling 13.

- [ ] **Step 1: Write the failing tests:** 'sortKey matches the registered vectors' (the two vectors of ruling 7); 'stackOf finds a Django app one folder down and ignores a manage.py without the settings variable'; 'stackOf needs the electron dependency and a packaging config in the same folder'; 'stackOf returns null for a language of no group'; 'staticOut reports the first reason in registered order' (a PR failing both `bot author` and `no test file` gives `bot author`); 'out when changed files exceed 100'; 'out with two closing issues'; 'out when the issue was opened after the PR'; 'a test-only PR is out with no non-test file' (`README.md` and `docs/x.md` do not count as non-test); 'baseOf: two parents → first parent, merge'; 'baseOf: one parent, diff equals PR files → squash'; 'baseOf: one parent, diff differs, 3 commits → rebase out'; 'a case failing in one end run is not fail-to-pass'; 'a case missing at base counts as fail-to-pass'; 'nextToCheck skips a third task of a repo as repo cap and stops at 8'; 'coldSetup picks the repo whose best rank is lowest'.
- [ ] **Step 2: Run** `bun test tests/bench-ext.test.mjs` — expect FAIL (module not found).
- [ ] **Step 3: Implement** in `bench/lib/ext.mjs`; `sortKey` with `new Bun.CryptoHasher('sha256')`.
- [ ] **Step 4: Run** `bun test ./tests` — all pass, output pristine. Commit `git commit -m "Add the pure rules of external task selection: sort key, stack markers, static criteria, base commit, fail-to-pass"`.

### Task 3: Enumerate, sort and commit the candidate list

**Files:**
- Create: `bench/ext.mjs` (`list` command), `tests/bench-ext-list.test.mjs`
- Modify: `bench/README.md` (command line, data layout)
- Create (gitignored): `<data>/ext/raw/` (every API response, one file per request), `<data>/ext/candidates-<tier>.tsv`; committed copy `progress/step4/candidates-<tier>.tsv`

**Interfaces:**
- Consumes: Task 2; `groups.json`.
- Produces: `bun bench/ext.mjs list <groups.json> --tier <1|2>` and `list(args, { gh })` (`gh(argv) -> Promise<string>`, injected so tests replay recorded responses). Writes each response to `raw/` before parsing it, and on restart reuses a response already there (resume). TSV columns: `stack tier rank key id repo stars pr_created merged_at issue issue_created static`, `static` = `ok` or the `staticOut` reason, sorted by `key` within each stack, `rank` 1-based among `ok` rows. Prints per stack: repos searched, repos with markers, PRs read, `ok` rows, rows per reason, GraphQL points used.

Requests: repo search `gh api -X GET search/repositories -f q='language:<L> stars:<a>..<b> pushed:>=<pushedFrom> created:<<createdBefore> archived:false fork:false'` (paged by 100, max 10 pages); markers by GraphQL in batches of 50 repo aliases (root entries with one level of children; then the texts the conds name); PRs by GraphQL `search(type: ISSUE, query: "repo:<o>/<r> is:pr is:merged created:>=<createdFrom> merged:<<mergedBefore> linked:issue", first: 100)` with the `pr` fields of Task 2 (`files(first: 100)`, `closingIssuesReferences(first: 5)`), paged.

- [ ] **Step 1: Write the failing tests** (recorded responses in a temp folder): 'splits a slice that reaches the search cap' (a fake `total_count` of 1000 on 1000..1999 makes the next requests 1000..1499 and 1500..1999); 'reuses a saved response after a restart' (the fake `gh` is called once per request across two runs); 'writes ok rows sorted by key with ranks and reasons for the rest'; 'a repo without markers reads no PRs'.
- [ ] **Step 2: Run** `bun test tests/bench-ext-list.test.mjs` — expect FAIL.
- [ ] **Step 3: Implement**; `bun test ./tests` all pass; README lines; commit `git commit -m "Enumerate external task candidates from a repo universe and sort them once"`.
- [ ] **Step 4: Run** `bun bench/ext.mjs list <data>/ext/groups.json --tier 1` (hours; resumable; GraphQL budget 5000 points an hour). Expected: each stack has ≥ 8 `ok` rows from ≥ 4 repos, else the walk will need tier 2 (ruling 3). Nobody reads a PR or issue while doing this.
- [ ] **Step 5: Commit the list before any check:** copy to `progress/step4/candidates-1.tsv`; record in `progress/progress.md` the printed counts, the run's start and end time, and `shasum -a 256` of the TSV and of `tar -cf - -C <data>/ext raw | shasum -a 256`. Commit `git commit -m "Commit the sorted external candidate list before any task is checked"`.

### Task 4: Check one candidate in a container

**Files:**
- Modify: `bench/ext.mjs` (`check`, `walk`), `bench/README.md`
- Create: `tests/bench-ext-check.test.mjs`, a local fixture repo built by the test (two commits of a tiny Go module: the base without a function, the end with it and a `_test.go` for it)
- Create (gitignored): `<data>/ext/briefs/recipe.md`, `<data>/ext/env/<owner>__<repo>.json` (the task file `sealed-agent` needs: `repo` = the clone, `db: null`, placeholder `port`, `start`, `ready`, `oracle`, `junit`, `timeoutSec: 3600`), `<data>/ext/recipes/<owner>__<repo>/{recipe.json, rounds/}`, `<data>/ext/tasks/<slug>/{meta.json, issue.json}`, `<data>/ext/sealed/<slug>/`, `<data>/ext/walk.tsv`

**Interfaces:**
- Consumes: Tasks 2–3; `withExport` (`bench/env.mjs`), `runGroup` (`bench/lib/proc.mjs`), `readJunit`, `bun bench/sealed-agent.mjs`.
- Produces: `bun bench/ext.mjs check <groups.json> <stack> <rank> [--tier <n>]` and `bun bench/ext.mjs walk <groups.json> <stack> [--tier <n>]`. `<slug>` = `<owner>__<repo>__<n>` lowercased. `recipe.json` = `{ platform: "linux/arm64"|"linux/amd64", dockerfile, test, probe: [paths] }` (`dockerfile` copies the context to `/work` and installs everything; `test` is the body of `/work/.bench-test.sh`, called with test file paths, no network, writing JUnit to `/out/junit.xml`). `meta.json` = `{ id, slug, stack, tier, rank, url, pr, prCreated, mergedAt, issue, issueCreated, end, base, method, licence, stars, f2p, p2p, editHistory: "none"|"recovered"|"unverified", platform, images: {..}, recipeRounds, minutes }`. `walk.tsv` rows: `stack tier rank id result` (`ok`, `repo cap`, or an out reason). stdout per check: `<slug> ok f2p=<n> p2p=<m>` or `<slug> out <reason>`; nothing else, errors included (they go to `sealed/<slug>/logs/`).

Flow of `check`: clone if absent and fetch `end`; `baseOf`; issue snapshot (GraphQL `issue { title body createdAt lastEditedAt userContentEdits(first: 100) { nodes { editedAt diff } } timelineItems(itemTypes: RENAMED_TITLE_EVENT) }`) into `issue.json`; recipe: reuse the repo's `recipe.json` or run recipe rounds; build `-t` (base files + the PR's test files from `end`, deletions applied) and the end image; run the test files once at `-t` and twice at the end; `failToPass`; write `meta.json`, append `walk.tsv`. A recipe round: prompt = `recipe.md` + (on a retry) the previous recipe and the last 200 lines of its build or probe log; `sealed-agent <env> recipe-<slug>-<k> --at <base> --tools Read,Glob,Grep --prompt <p> --out <rounds/k.reply.md>`; the reply's JSON is built at the base and its `probe` files run; it passes when the probe JUnit has a passing case. Build and probe logs of the base go to `rounds/`; everything after the PR's tests are copied in goes to `sealed/`.

- [ ] **Step 1: Probe the network of a build** before any external code runs: in a build context holding only a Dockerfile `FROM alpine:3.22` + `RUN for h in host.docker.internal gateway.docker.internal 192.168.65.254; do nc -z -w 3 $h 5432 && echo "$h open" || echo "$h closed"; done`, `docker build --no-cache --progress=plain -t bench-ext/probe:net .`. If every line says `closed`: builds use the default network. If any says `open`: rebuild with `--add-host host.docker.internal:127.0.0.1 --add-host gateway.docker.internal:127.0.0.1`; if an address still says `open`, stop and ask the user (no external build runs). Record the output and the chosen flags in `progress/progress.md`.
- [ ] **Step 2: Write `recipe.md`:** "You see the files of a repository at one commit, no git. Write a recipe that builds it and runs its tests in a Linux container. Read its CI configuration first. Reply only with one JSON object: `platform` (`linux/arm64`, or `linux/amd64` only when a dependency has no arm64 build), `dockerfile` (a pinned `FROM` tag; `COPY . /work`; `WORKDIR /work`; install every dependency and a JUnit reporter the test runner needs; start nothing), `test` (a POSIX sh script body: its arguments are test file paths of this repo; it starts any database or service the tests need inside the container, runs only those files, needs no network, and writes JUnit XML to `/out/junit.xml`), `probe` (1 to 3 test file paths that exist at this commit and should pass)." The brief names no repo, stack or PR.
- [ ] **Step 3: Write the failing tests** (fixture Go repo, a fixed hand-written `recipe.json` so no agent runs; skipped with a message when `docker version` fails): 'finds one fail-to-pass test in the fixture and writes meta.json'; 'prints only the verdict and counts' (stdout is one line matching `^\S+ (ok f2p=\d+ p2p=\d+|out [a-z0-9 ]+)$`, holds no test file name or function name of the fixture); 'out with recipe failed when the probe has no passing case'; 'test runs use no network' (`docker inspect` of the run container gives `NetworkMode` `none`).
- [ ] **Step 4: Run** `bun test tests/bench-ext-check.test.mjs` — expect FAIL.
- [ ] **Step 5: Implement** `check` and `walk` (`walk` loops `nextToCheck` → `check`, resumable from `walk.tsv`, stops at `perStack` or at the end of the list, printing `<stack> tier <n>: accepted <a>, checked <c>, list end <yes|no>`). `bun test ./tests` all pass, output pristine; README lines; commit `git commit -m "Check an external candidate in a container: base commit, issue snapshot, recipe, fail-to-pass count"`.

### Task 5: Walk, sample and lock

**Files:**
- Create: `progress/step4/walk.tsv` (copy), `progress/step4/sample.tsv`, `progress/step4-lock.md`
- Modify: `docs/log.md`, `progress/progress.md`

**Interfaces:**
- Consumes: Tasks 3–4.
- Produces: `sample.tsv` = the 24 accepted rows in sort order per stack: `task stack tier rank id url pr issue base end method f2p edit_history platform cold_setup` with `task` = `<stack>-<nn>` (`s1-01` … `s3-08`), the order the canary (7.3) and the trial run (step 11) read. Step 5 reads everything else from `<data>/ext/tasks/<slug>/` and `<data>/ext/recipes/`.

- [ ] **Step 1: Walk** `bun bench/ext.mjs walk <data>/ext/groups.json s3`, then `s2`, then `s1` (one at a time; each batch between two `pgsnap` snapshots that must be equal). A stack that ends its list short of 8: Task 3 Steps 4–5 with `--tier 2` (commit before walking it), then `walk … --tier 2`; still short: stop and ask.
- [ ] **Step 2: Check:** `walk.tsv` holds every row from rank 1 to the last checked rank of each stack, no gap; 8 `ok` per stack, ≤ 2 per repo, ≥ 4 repos per stack; `rg -n '<owner>/<repo>'` of each sampled repo over this repo and `<data>` outside `ext/` finds no hstack use; `git status` of each clone clean (no checkout).
- [ ] **Step 3: Write** `sample.tsv` (cold-setup per ruling 13) and `progress/step4-lock.md`: the sample table; per stack the walk summary (checked, out by reason, repo cap, not checked); `shasum -a 256` of `groups.json`, the candidate TSVs, `walk.tsv`, `sample.tsv`, the `raw/` tar, every `tasks/*/meta.json` and `issue.json`, every `recipes/*/recipe.json`, and every file under `sealed/` (paths relative to `<data>`; slugs name only public PRs); the `bench/` commit (`git rev-parse HEAD`, `git status --short bench` empty); the list of `bench-ext-*` containers and `bench-ext/*` images left (`docker ps -a --filter name=bench-ext- --format '{{.Names}}'`, `docker images 'bench-ext/*' --format '{{.Repository}}:{{.Tag}}'`).
- [ ] **Step 4: Record** usage in `progress/progress.md`; **Creation** line in `docs/log.md`; commit `git commit -m "Lock the 24 external tasks of step 4 with the hashes of their records"`.

## Known limits

- The universe is GitHub's primary-language and star view at one date; a Django or Electron app whose primary language is HTML or C++ is not in it. A Go web server counts as S3.
- One run at base-plus-tests and two at the end: a test that is flaky at the base can still be counted; step 5's validation reruns every check.
- The recipe agent reads repo files that may carry instructions (a `CLAUDE.md`, an `AGENTS.md`); it has only read tools and its reply is data, so the damage is a bad recipe.
- Builds run the repos' install scripts with network inside Docker; Task 4 Step 1 limits what they reach on this machine, `pgsnap` detects a change, nothing prevents a malicious package from reaching the internet.
- `linux/amd64` recipes run under emulation and can hit the 30-minute limit, so slow amd64-only repos are underrepresented.

## Not in this plan

The task files and oracles of step 5 (black-box rewrite, interface sheet, validation, classifiers); whether `input-check` applies to issue text; the seeded bugs of step 7; the canary of step 8.
