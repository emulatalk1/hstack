---
type: plan
title: "Bun runtime plan"
description: "Move hstack's scripts, tests and skills from Node to Bun, using Bun's own APIs wherever Bun has one."
status: stable
generated: { by: claude-code/2.1.310, at: "2026-10-26T22:52:05+07:00" }
verified:
  - { by: claude-code-advisor/2.1.310, at: "2026-10-26T22:56:00+07:00" }
  - { by: human:emulatalk1, at: "2026-10-26T23:03:37+07:00" }
sources:
  - id: foundation-plan
    resource: /plans/2026-10-26-hstack-foundation.md
  - id: layers
    resource: /design/2026-10-26-layers.md
---

# Bun Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** hstack runs on Bun only. The scripts, the tests and the skills use Bun, with Bun's own APIs wherever Bun has one, and behave exactly as they do today.

**Decision (the user, 2026-10-26):** Bun replaces Node completely, with no Node fallback, and every file read and write uses `Bun.file`/`Bun.write`. This replaces the foundation plan's constraint "Node 24, standard library only". Stack B projects keep npm; that was a separate decision about the app, not about hstack.

**Architecture:** The same modules and files as the foundation plan. Functions that read files become `async`, because `Bun.file(...).text()` has no synchronous form; their callers `await` them, and the CLIs use top-level `await`. Nothing else in the structure changes.

**Tech Stack:** Bun 1.4.4 or later (1.4.4 is the newest release on 2026-10-26, by the user's request; this machine was upgraded from 1.4.3, and the probes and the 50 tests give the same results), `bun:test`, ES modules (`.mjs`), Claude Code plugin format.

**Spec:** `docs/design/2026-10-26-layers.md` (Safety rules, Knowledge layer); the foundation plan for every behavior this plan must keep.

## Global Constraints

- **Bun only.** No `node` command anywhere: not in scripts, skills, tests, `package.json` or the README. The test script is `bun test ./tests`; the `./` matters, because without it Bun also runs the Electron fixture's tests.
- **Bun's own API first:**

  | Job | Use |
  |---|---|
  | read a file | `await Bun.file(p).text()` or `.json()` |
  | write a file | `await Bun.write(p, data)` (it creates missing parent folders) |
  | does a file exist | `await Bun.file(p).exists()` |
  | run a command | `Bun.spawn` / `Bun.spawnSync` with an argument array, never through a shell, never `Bun.$` |
  | sha256 | `new Bun.CryptoHasher('sha256')` |
  | walk a folder for files | `new Bun.Glob(pattern).scan(...)` / `scanSync(...)` |
  | tests | `bun:test` (`test`, `expect`, `beforeAll`, `afterAll`) |

- **`node:` modules are allowed only where Bun has no API of its own, as Bun's docs direct:** `node:fs` for folders (`statSync().isDirectory()`, `mkdtempSync`, `cpSync`, `rmSync`, `mkdirSync`) and for `realpathSync`; `node:path`; `node:os` (`tmpdir`, `homedir`); `node:util` `parseArgs` (Bun's documented way to read arguments). Any other `node:` import, or any `readFileSync`, `writeFileSync`, `existsSync` on a file, `node:child_process`, `node:crypto`, `node:test` or `node:assert`, is a defect.
- **Folders are not files to Bun:** `Bun.file(dir).exists()` returns `false` for a folder. A folder check uses `fs.statSync(p, { throwIfNoEntry: false })?.isDirectory()`.
- **The async chain is followed up in the same task:** a function that now awaits a newly async function becomes async too, all the way up to the CLI, in the task that started it. Every commit keeps the suite green.
- **Behavior does not change:** the same messages, the same exit codes, the same manifest JSON byte for byte for the same input, and the same project names (Bun's sha256 gives the same hash as Node's; checked). Every existing test keeps its assertions; a test is rewritten, never dropped.
- **Missing commands:** `Bun.spawnSync` and `Bun.spawn` throw `ENOENT` when the command does not exist. Every place that ran a command keeps its old meaning for that case: `claude` missing gives `claude-code/unknown`; `docker` missing gives no container match; `lsof` missing throws the plain-English error; `getconf` missing skips that temp folder.
- The foundation plan's safety constraints still bind: tests change no Docker state, ports or databases; no script runs `docker compose`; plain English in every message.
- Dependencies: none. `package.json` keeps no `dependencies` or `devDependencies`.

## Review Focus

- The `lsof` meaning in `ports.mjs`: exit 1 with empty output means nothing listens; any other failure is an error, never "free". A port check must not turn "unknown" into "allowed" through the move to `Bun.spawn`.
- `await` everywhere a function became async. A missing `await` gives a Promise, and a Promise is truthy: `if (await exists(x))` written as `if (exists(x))` makes every check pass. Each task's review checks every call site of every function it made async.
- Folder checks that moved to `Bun.file().exists()` by mistake, which would always say "missing" for a folder.

---

### Task 1: Tests on `bun:test`

**Files:** Modify `package.json` and every `tests/*.test.mjs`. Scripts do not change in this task.

- [ ] **Step 1:** Set `"test": "bun test ./tests"` in `package.json`.
- [ ] **Step 2:** In each test file, import from `bun:test` instead of `node:test`, and turn every `node:assert/strict` call into `expect` (`assert.equal` → `expect(a).toBe(b)`, `assert.deepEqual` → `toEqual`, `assert.match` → `toMatch`, `assert.ok` → `toBeTruthy`, `assert.throws` → `toThrow`). A skipped test uses `test.skipIf(cond)`.
- [ ] **Step 3:** Run the CLIs from tests with `Bun.spawnSync([process.execPath, 'scripts/<cli>.mjs', ...], { cwd, env })`, reading `exitCode` and `stdout.toString()`. File reads in tests use `Bun.file`; temp folders keep `node:fs`.
- [ ] **Step 4:** Run `bun test ./tests`. Expected: 50 pass, 0 fail, and the Docker-published-port test runs rather than skips (the shared Postgres publishes 5432).
- [ ] **Step 5:** Commit `git commit -m "Run the tests on bun:test"`.

### Task 2: Identity, detection and fixed ports on Bun

**Files:** Modify `scripts/lib/identity.mjs`, `scripts/lib/detect.mjs`, `scripts/lib/fixed-ports.mjs` and their tests. Also modify their callers, `scripts/lib/manifest.mjs` (`buildManifest`), `scripts/init.mjs` and `scripts/check.mjs`: each caller becomes async and awaits, up to the CLI, with no other change. Task 3 then moves those files' own reads to Bun.

- [ ] **Step 1:** `projectName` uses `Bun.CryptoHasher`; it stays synchronous. `composeName(file)` becomes `async` and reads with `Bun.file`. A missing file still throws, as now.
- [ ] **Step 2:** `detectStack(appDir)` becomes `async`: `package.json` and `.env` through `Bun.file`, lock files and `docker-compose.yml` through `Bun.file(...).exists()`.
- [ ] **Step 3:** `findFixedPorts(appDir)` becomes `async`: walk `src/` and `tests/` with `new Bun.Glob('**/*.{ts,tsx,js,mjs}')` (files only, so a folder named `x.ts` is no longer read), skip any path with a `node_modules`, `.next` or `out` segment, read with `Bun.file`. A missing `src/` or `tests/` is skipped (checked with `node:fs` as a folder). `Bun.Glob` gives no fixed order, so sort the results by `file`, then `line`. The warnings stay the same; their order may differ from the Node run.
- [ ] **Step 4:** Add `await` at every call site. Run `bun test ./tests`. Expected: all pass.
- [ ] **Step 5:** Commit `git commit -m "Read projects through Bun.file"`.

### Task 3: The manifest, init and the OKF checker on Bun

**Files:** Modify `scripts/lib/manifest.mjs`, `scripts/init.mjs`, `scripts/lib/okf.mjs`, `scripts/okf-check.mjs`, their tests.

- [ ] **Step 1:** `findApp` and `buildManifest` become `async`. `claude --version` runs through `Bun.spawnSync`; a throw or a non-zero exit gives `claude-code/unknown`.
- [ ] **Step 2:** `init.mjs` writes the manifest with `Bun.write` (it creates `.hstack/`), and checks for an existing manifest with `Bun.file(...).exists()`. The root and `docs/` folder checks use `node:fs`.
- [ ] **Step 3:** `checkBundle(docsDir, now)` becomes `async`: the walk uses `Bun.Glob('**/*.md')` (it already skips dot-folders by default), reads use `Bun.file`, `sources` existence uses `Bun.file(...).exists()`.
- [ ] **Step 4:** Run `bun test ./tests` and `bun scripts/okf-check.mjs docs`. Expected: all pass; `Docs bundle: OK`.
- [ ] **Step 5:** Commit `git commit -m "Write the manifest and check docs through Bun"`.

### Task 4: Port owners and the safety checks on Bun

**Files:** Modify `scripts/lib/ports.mjs`, `scripts/check.mjs`, their tests.

- [ ] **Step 1:** `ports.mjs` runs `docker ps` and `lsof` with `Bun.spawn` (awaiting `exited` and reading `stdout`), with the same meaning as today:
  - `docker`: any failure, or the command missing, gives no container match.
  - `lsof -t`: exit 1 with empty output means nothing listens; the command missing throws "Could not check who holds port N: the lsof command was not found"; any other failure throws "Could not check who holds port N: <reason>".
  - The cwd lookup failing gives `cwd: null`.
- [ ] **Step 2:** `check.mjs` reads the manifest, the dev script and the `.env` beside the compose file with `Bun.file`; file existence with `Bun.file(...).exists()`; `getconf DARWIN_USER_TEMP_DIR` with `Bun.spawnSync` (a throw or non-zero exit skips it). `realpathSync` and folder checks stay on `node:fs`.
- [ ] **Step 3:** Run `bun test ./tests`. Expected: all pass, with the real-listener and Docker tests running.
- [ ] **Step 4:** Commit `git commit -m "Run the port lookups and safety checks on Bun"`.

### Task 5: Skills, README, the decision record and a real run

**Files:** Modify `skills/hstack-init/SKILL.md`, `skills/hstack-safety/SKILL.md`, `tests/skills.test.mjs`, `README.md`, `docs/foundation-check.md`, `docs/index.md`, `docs/log.md`. Create `docs/decisions/2026-10-26-bun-runtime.md`, `docs/decisions/index.md`.

- [ ] **Step 1:** Each skill runs its scripts as `bun "${CLAUDE_PLUGIN_ROOT}/scripts/<cli>.mjs" ...` and declares the runtime in its frontmatter with `compatibility: Requires Bun 1.4.4 or later`. The skills test asserts both, and asserts that no skill contains `node `.
- [ ] **Step 2:** The README says Bun 1.4.4 or later is required, shows `bun scripts/...` and `bun test ./tests`, and has no `node` command.
- [ ] **Step 3:** The decision record (`type: decision`, `status: draft`) states the user's decision above, what it replaces, and why the `node:` modules that remain are there; list it in a new `docs/decisions/index.md`, in the root `docs/index.md`, and in a `docs/log.md` entry. The user approves it together with this plan.
- [ ] **Step 4:** Run on the real projects with Bun:
  - `bun scripts/init.mjs fixtures/electron --force`;
  - `bun scripts/init.mjs ../outsourcing-hstack --force` (the root, never inside `real-estate/`). The manifest must equal the Node-written one in `docs/foundation-check.md`. The set of warning lines must equal the Node run's set, though the order may differ;
  - `git -C ../outsourcing-hstack/real-estate status --short` prints nothing;
  - the four checks: `docker` 1, `drop real_estate` 1, `drop real_estate_hstack` 0, `port 5432` 1, naming the project `real-estate`.

  Add a "Run again on Bun" section to `docs/foundation-check.md` with these outputs.
- [ ] **Step 5:** Final checks:
  - `bun test ./tests`: all pass;
  - `bun scripts/okf-check.mjs docs`: exit 0;
  - the OKF validator says conformant;
  - `claude plugin validate .` reports no errors;
  - `grep -rnE "from 'node:(child_process|crypto|test|assert)" scripts tests` prints nothing;
  - `grep -rnE "readFileSync|writeFileSync" scripts tests` prints nothing;
  - no `node scripts/`, `node --test` or `"node"` in `skills`, `README.md` or `package.json`.
- [ ] **Step 6:** Commit `git commit -m "Run hstack on Bun only"`.

---

## Not in this plan

- TypeScript. Bun runs `.ts` directly, but nobody asked for it.
- The parked `docker` finding (C1). It still has to be fixed before the own-services plan.
