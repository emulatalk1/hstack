---
type: plan
title: "hstack foundation plan"
description: "The plugin skeleton, init, the manifest, the OKF checker and the safety checks every later hstack step calls."
status: draft
generated: { by: claude-code/2.1.310, at: "2026-10-26T20:10:23+07:00" }
verified: { by: claude-code-advisor/2.1.310, at: "2026-10-26T19:30:00+07:00" }
sources:
  - id: hstack-brief
    resource: /design/2026-10-25-hstack-brief.md
  - id: layers
    resource: /design/2026-10-26-layers.md
  - id: adapter-schema
    resource: /design/2026-10-26-adapter-schema.md
  - id: stack-a
    resource: /references/adapters/2026-10-26-stack-a.md
  - id: stack-b
    resource: /references/adapters/2026-10-26-stack-b.md
---

# hstack Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Claude Code plugin that installs from this repo, with an `init` that detects a project's stack and writes its manifest, and the safety checks every later hstack step calls before it touches Docker, a port, a database or a data folder.

**Architecture:** Node scripts with no dependencies under `scripts/`, one small module per job, each tested with `node:test`. Two skills (`init`, `safety`) tell the agent when to run them. The manifest (`.hstack/manifest.json` at the project root) is the one place later plans read project facts from. A project root holds the app either at the root or in one subfolder (the harness layout: `outsourcing/` with the app in `real-estate/`); the manifest names it as `app`.

**Tech Stack:** Node 24 (stdlib only), ES modules (`.mjs`), `node:test`, Claude Code plugin format (`.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `skills/<name>/SKILL.md`).

**Spec:** `docs/design/2026-10-25-hstack-brief.md`, `docs/design/2026-10-26-layers.md` (Knowledge layer, Safety rules, Outside skills, Per stack), `docs/design/2026-10-26-adapter-schema.md`, `docs/references/adapters/2026-10-26-stack-a.md`, `docs/references/adapters/2026-10-26-stack-b.md`.

## Global Constraints

- hstack writes nothing inside the app folder: its files live at the project root (`.hstack/`). The app may be a client repo with its own rules.
- Node 24, standard library only: no `dependencies` or `devDependencies` in this repo's `package.json`.
- Tests never change Docker, ports or databases on the machine: only `docker ps` and `docker inspect` (read-only) and binding a test port on `127.0.0.1` that the test itself closes.
- No `docker` command may remove a volume, by any route; scripts never run `docker compose` in this plan.
- An agent may drop only the database or data folder the manifest names (the layer list, Safety rules).
- Docker project name: `<project>-<hash of the absolute path>`, recomputed at every check; a copied or moved folder fails the check.
- Evaluator models default: two (`opus`, `sonnet`), set in the manifest.
- Slots and defaults exactly as the layer list (`docs/design/2026-10-26-layers.md`) "Outside skills": `spec` `superpowers:brainstorming`, `plan` `superpowers:writing-plans`, `build` `superpowers:subagent-driven-development`, `review` `superpowers:requesting-code-review`, `audit` `ponytail:ponytail-audit`, `finish` `superpowers:finishing-a-development-branch`.
- Plain English in every message a script prints: short sentences, no jargon without a one-line explanation.

## Review Focus

- A project folder whose name has spaces, capitals or Vietnamese letters: the project name must still be a valid Docker project name (lowercase letters, digits, `-`, `_`). Task 2 tests it.
- A port held by a Docker container: `lsof` shows Docker's port forwarder, not the container. The owner must be found through `docker ps`, and the forwarder must never be named as a process to stop. Task 3 tests it.
- `init` run twice: the second run must not overwrite a manifest someone edited. Task 6 tests it.
- A project that is neither stack A nor stack B: `init` must say so and write nothing. Task 6 tests it.
- A compose file whose `name:` is quoted, or has a comment after it: identity must read the same name. Task 2 tests it.

---

## File Structure

| File | Job |
|---|---|
| `.claude-plugin/plugin.json` | plugin name, version, description |
| `.claude-plugin/marketplace.json` | one-plugin marketplace with `"source": "./"` |
| `package.json` | `"type": "module"`, `"test": "node --test"`, no dependencies |
| `scripts/lib/identity.mjs` | project name from a path; read a compose file's `name:` |
| `scripts/lib/ports.mjs` | who holds a port, and whether it is this project's |
| `scripts/lib/detect.mjs` | stack A or B, and its adapter values |
| `scripts/lib/fixed-ports.mjs` | find `localhost:<port>` written in code |
| `scripts/lib/manifest.mjs` | build the manifest object |
| `scripts/init.mjs` | CLI: write `.hstack/manifest.json`, print warnings |
| `scripts/check.mjs` | CLI: the safety checks, exit 0 allowed, 1 refused |
| `scripts/lib/okf.mjs`, `scripts/okf-check.mjs` | the OKF v0.2 conformance check plus hstack's gate rules for a `docs/` bundle |
| `skills/hstack-init/SKILL.md` | when and how to run `init` |
| `skills/hstack-safety/SKILL.md` | the safety rules, and which check to run before what |
| `tests/*.test.mjs`, `tests/fixtures/stack-a/` | tests and a minimal stack A fixture: an empty project root with the app in `real-estate/` |

The Electron fixture `fixtures/electron/` (already committed) is the stack B fixture.

---

### Task 1: Plugin skeleton

**Files:**
- Create: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `package.json`, `tests/plugin.test.mjs`

**Interfaces:**
- Produces: plugin name `hstack`, version `0.1.0`; `npm test` runs every `tests/*.test.mjs`.

- [ ] **Step 1: Write the failing test** `tests/plugin.test.mjs`: test `plugin and marketplace agree` reads both JSON files and asserts `plugin.name === 'hstack'`, `marketplace.plugins[0].name === 'hstack'`, `marketplace.plugins[0].source === './'`, and that `package.json` has no `dependencies` and no `devDependencies`.
- [ ] **Step 2: Run** `node --test tests/plugin.test.mjs`. Expected: FAIL (files missing).
- [ ] **Step 3: Write the three files.** `plugin.json`: `name` `hstack`, `version` `0.1.0`, `description` "Evidence-led build loop: review, mutation and blind evaluators, per project." `marketplace.json`: `name` `hstack`, `owner` `{ "name": "hbchuc" }`, one plugin entry with `source` `./`.
- [ ] **Step 4: Run** `npm test`, then `claude plugin validate .`. Expected: test PASS; validate reports no errors.
- [ ] **Step 5: Commit** `git add .claude-plugin package.json tests/plugin.test.mjs && git commit -m "Add the hstack plugin skeleton"`

### Task 2: Project identity

**Files:**
- Create: `scripts/lib/identity.mjs`, `tests/identity.test.mjs`

**Interfaces:**
- Produces:
  - `projectName(dir: string): string` — `<slug>-<first 8 hex of sha256(path.resolve(dir))>`; slug = basename lowercased, `đ` mapped to `d`, accents removed (`normalize('NFD')`, drop marks), every run of characters outside `[a-z0-9_-]` replaced by `-`, trimmed of `-`, empty slug becomes `project`.
  - `composeName(composeFile: string): string | null` — the top-level `name:` value (quotes and a trailing `# comment` removed), or `null` when absent.

- [ ] **Step 1: Write the failing tests:**
  - `same path gives the same name; another path gives another name` (two temp dirs with the same basename differ).
  - `name is a valid Docker project name for "Đất Dự Án 2"` — matches `/^[a-z0-9][a-z0-9_-]*$/` and starts with `dat-du-an-2-`.
  - `composeName reads plain, quoted and commented names` — `name: shop-1`, `name: "shop-1"`, `name: 'shop-1' # x` all give `shop-1`; a file whose `name:` is only under `services:` (indented) gives `null`.
- [ ] **Step 2: Run** `node --test tests/identity.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement both functions** in `scripts/lib/identity.mjs` with `node:crypto` and a line scan for `^name:` (top level only, no YAML library).
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Add project identity from the folder path"`

### Task 3: Port owners

**Files:**
- Create: `scripts/lib/ports.mjs`, `tests/ports.test.mjs`

**Interfaces:**
- Produces:
  - `portOwner(port: number): Promise<null | { kind: 'process', pid: number, cwd: string } | { kind: 'container', name: string, project: string | null, workingDir: string | null }>` — first `docker ps --format '{{.Names}}\t{{.Ports}}\t{{.Label "com.docker.compose.project"}}\t{{.Label "com.docker.compose.project.working_dir"}}'` for a published host port equal to `port`; if none, `lsof -nP -iTCP:<port> -sTCP:LISTEN -t` then `lsof -a -p <pid> -d cwd -Fn`; `null` when nothing listens. When Docker is not running, the container lookup returns no match instead of throwing.
  - `isOurs(owner, dir: string, name: string): boolean` — a process is ours when `owner.cwd` is inside `path.resolve(dir)`; a container is ours when `owner.project === name` and `owner.workingDir === path.resolve(dir)`.

- [ ] **Step 1: Write the failing tests:**
  - `a port this test listens on belongs to this process` — open `net.createServer().listen(0, '127.0.0.1')` and take its port, assert `portOwner` gives `{ kind: 'process', pid: process.pid }` and `isOurs(owner, process.cwd(), 'x') === true`; close it; assert `portOwner` then gives `null`.
  - `a Docker-published port is reported as a container, never as a process` — run only when `docker ps` lists a published port (skip otherwise): for that port, `portOwner` gives `kind: 'container'` with the container's name.
- [ ] **Step 2: Run** `node --test tests/ports.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** both functions with `node:child_process` (`execFile`).
- [ ] **Step 4: Run** the tests. Expected: PASS. On this machine the shared Postgres publishes 5432, so the Docker test runs rather than skips.
- [ ] **Step 5: Commit** `git commit -m "Add port owner lookup"`

### Task 4: Stack detection

**Files:**
- Create: `scripts/lib/detect.mjs`, `tests/detect.test.mjs`, and under `tests/fixtures/stack-a/real-estate/`: `package.json`, `pnpm-lock.yaml` (one line), `docker-compose.yml`, `.env`

**Interfaces:**
- Produces: `detectStack(appDir: string): null | { stack: 'A' | 'B', packageManager: 'pnpm' | 'npm', commands: { install, unit, int, e2e, oneTest: { unit, int, e2e } }, devServer: { start, port: number | null }, data: { kind: 'postgres' | 'folder', droppable: string[], seed: string | null }, compose: string | null }`.
  - Stack A: `package.json` depends on `next` and `payload`, and `pnpm-lock.yaml` exists. Values from `docs/references/adapters/2026-10-26-stack-a.md`: install `pnpm install --frozen-lockfile`; unit `pnpm test --project unit`; int `pnpm test --project int`; e2e `pnpm test:e2e --project chromium`; oneTest unit `pnpm test --project unit -t '<title>'`, int `pnpm test --project int -t '<title>'`, e2e `pnpm test:e2e --project chromium -g '<title>'`; devServer `pnpm dev`, port from `.env` `NEXT_PUBLIC_SERVER_URL` or 3000; data `postgres`, droppable = the database name in `.env` `DATABASE_URL` and that name plus `_test`; seed `pnpm seed:demo`; compose = `docker-compose.yml` when present (relative to the app folder).
  - Stack B: `devDependencies` has `electron-vite` and `package-lock.json` exists. Values from `docs/references/adapters/2026-10-26-stack-b.md`: install `npm ci`; unit and int `npm test`; e2e `npm run test:e2e`; oneTest unit/int `npx vitest run -t '<title>'`, e2e `npx playwright test -g '<title>'` (after `npm run build`); devServer `npm run dev`, port `null` (Vite picks); data `folder`, droppable = the env var named in the project's `dev` script that ends in `_DATA_DIR`, as `$NAME`; seed `null`; compose `null`.

- [ ] **Step 1: Write the failing tests:**
  - `the Electron fixture is stack B` — `detectStack('fixtures/electron')` gives `stack: 'B'`, `packageManager: 'npm'`, `data.droppable` `['$PROBE_DATA_DIR']`.
  - `the stack A fixture is stack A` — `detectStack('tests/fixtures/stack-a/real-estate')`; fixture `.env` has `DATABASE_URL=postgres://u:p@localhost:5432/shop_dev` and `NEXT_PUBLIC_SERVER_URL=http://localhost:3000`; result has `data.droppable` `['shop_dev', 'shop_dev_test']`, `devServer.port` `3000`, `compose` `docker-compose.yml`.
  - `an empty folder is no stack` — gives `null`.
- [ ] **Step 2: Run** `node --test tests/detect.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `detectStack` reading `package.json`, the lock files and `.env` with `node:fs` (a line parser for `KEY=value`, no library).
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Detect stack A and B with their adapter values"`

### Task 5: Ports fixed in code

**Files:**
- Create: `scripts/lib/fixed-ports.mjs`, `tests/fixed-ports.test.mjs`, `tests/fixtures/stack-a/real-estate/tests/e2e/helpers/login.ts`

**Interfaces:**
- Produces: `findFixedPorts(appDir: string): Array<{ file: string, line: number, port: number }>` — scans `src/` and `tests/` (skipping `node_modules`, `.next`, `out`; a missing folder is skipped) for `localhost:<digits>` and `127.0.0.1:<digits>` in `.ts`, `.tsx`, `.js`, `.mjs` files; `file` relative to `appDir`.

- [ ] **Step 1: Write the failing test** `finds the fixed base URL` — fixture `login.ts` holds `export const BASE_URL = 'http://localhost:3000'` on line 3; `findFixedPorts('tests/fixtures/stack-a/real-estate')` contains `{ file: 'tests/e2e/helpers/login.ts', line: 3, port: 3000 }`; `findFixedPorts('fixtures/electron')` gives `[]`; `findFixedPorts('tests/fixtures/stack-a')` (no `src/`, no `tests/`) gives `[]`.
- [ ] **Step 2: Run** `node --test tests/fixed-ports.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** with `fs.readdirSync(..., { recursive: true })` and one regex.
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Find ports fixed in code"`

### Task 6: The manifest and `init`

**Files:**
- Create: `scripts/lib/manifest.mjs`, `scripts/init.mjs`, `tests/init.test.mjs`

**Interfaces:**
- Consumes: `projectName`, `composeName` (Task 2), `detectStack` (Task 4), `findFixedPorts` (Task 5).
- Produces:
  - `findApp(root: string, app?: string): string | { error: string }` — `app` when given; else `.` when `root/package.json` exists; else the single immediate subfolder (skipping hidden folders and `node_modules`) that has a `package.json`; else an error asking for `--app`.
  - `buildManifest(root: string, app?: string): { manifest: object, warnings: string[] } | { error: string }` — `detectStack` and `findFixedPorts` run on the app folder; `projectName` and the compose-name comparison use the root. Manifest fields: `version: 1`, `projectName`, `app`, `stack`, `packageManager`, `commands`, `devServer`, `data`, `compose: { file, name, matches: boolean } | null`, `paths: { design: 'docs/design/', plans: 'docs/plans/', features: 'progress/features.json', coverage: 'progress/test-coverage.md', progressLog: 'progress/progress.md', evaluations: 'progress/evaluations/' }`, `actor: 'claude-code/<Claude Code version>'` (from `claude --version`, or `claude-code/unknown` when the command is missing), `slots` (Global Constraints values), `evaluators: { models: ['opus', 'sonnet'] }`, `mutation: { budgetMinutes: 20 }`.
  - Warnings, in plain English: one per fixed port ("`tests/e2e/helpers/login.ts` line 3 fixes the app at port 3000. Read it from `.env` so this project can get its own port."), and one when the compose file has no `name:` or a different one ("The compose file has no project name, so Docker treats this folder as the same project as any other folder named `<basename>`. hstack will not run `docker compose` here until a later hstack step gives it its own services.").
  - CLI: `node scripts/init.mjs [root] [--app <subfolder>] [--force]` writes `<root>/.hstack/manifest.json` (2-space JSON), prints the warnings, exits 0. With an existing manifest and no `--force`: prints "A manifest already exists at …; nothing changed. Run with --force to replace it." and exits 1. With no stack: prints "hstack found no stack it knows here (stack A: Next.js + Payload with pnpm; stack B: Electron + electron-vite with npm). Nothing was written." and exits 1.

- [ ] **Step 1: Write the failing tests** (each copies a fixture to a temp dir first):
  - `init writes a stack B manifest with no warnings` — exit 0; manifest `stack` `B`, `evaluators.models` `['opus','sonnet']`, `slots.audit` `ponytail:ponytail-audit`; stdout has no warning lines.
  - `init detects the app subfolder` — on a temp copy of `tests/fixtures/stack-a`: manifest `app` `real-estate`; with two app subfolders and no `--app`: exit 1 asking for `--app`.
  - `init on stack A warns about the fixed port and the compose name` — exit 0; nothing is written under `real-estate/`; `compose.matches === false`; stdout contains `login.ts` and `no project name`.
  - `a second init does not overwrite` — edit the manifest, run again: exit 1, file unchanged; with `--force`: exit 0, replaced.
  - `an empty folder writes nothing` — exit 1, no `.hstack/`.
- [ ] **Step 2: Run** `node --test tests/init.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `buildManifest` in `scripts/lib/manifest.mjs` and the CLI in `scripts/init.mjs`.
- [ ] **Step 4: Run** `npm test`. Expected: all PASS.
- [ ] **Step 5: Commit** `git commit -m "Add init: write the project manifest and its warnings"`

### Task 7: The safety checks

**Files:**
- Create: `scripts/check.mjs`, `tests/check.test.mjs`

**Interfaces:**
- Consumes: the manifest (Task 6), `projectName`, `composeName` (Task 2), `portOwner`, `isOurs` (Task 3).
- Produces: CLI `node scripts/check.mjs <dir> <check> [arg]`, exit 0 = allowed, 1 = refused, the reason on stdout in plain English. Checks:
  - `docker` — allowed only when `composeName(compose.file) === projectName(dir)` and equals the manifest's `projectName`.
  - `port <n>` — allowed when the port is free or `isOurs`; refused otherwise, naming the owner (process with its folder, or container with its project), and saying hstack will not stop it.
  - `drop <name>` — allowed only when `name` is in `data.droppable` and the manifest's `projectName` equals `projectName(dir)`.
  - `wipe <path>` — allowed only when `data.kind === 'folder'`, the resolved path equals the resolved value of the droppable env var (relative values resolve against the app folder), and it is inside the project root or the system temp folder.

- [ ] **Step 1: Write the failing tests** (manifest from a temp copy of a fixture):
  - `drop allows the manifest's databases only` — `drop shop_dev` exit 0; `drop real_estate` exit 1.
  - `a copied folder fails every check` — init in temp dir X, copy X to Y, run `drop shop_dev` in Y: exit 1 and stdout says the folder was copied or moved and to run `init` again.
  - `docker is refused when the compose file has no matching name` — stack A fixture: exit 1.
  - `port: free is allowed, our own listener is allowed, another folder's listener is refused` — start a listener in a child process whose cwd is a different temp dir; the check exits 1 and names that folder.
  - `wipe allows only the data folder` — stack B: `wipe <the folder in PROBE_DATA_DIR>` exit 0; `wipe <home>` exit 1.
- [ ] **Step 2: Run** `node --test tests/check.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `scripts/check.mjs`. Every check first recomputes `projectName(dir)` and compares it with the manifest's; a mismatch refuses with the copied-folder message.
- [ ] **Step 4: Run** `npm test`. Expected: all PASS.
- [ ] **Step 5: Commit** `git commit -m "Add the safety checks"`

### Task 8: The OKF checker

**Files:**
- Create: `scripts/lib/okf.mjs`, `scripts/okf-check.mjs`, `tests/okf.test.mjs`, `tests/fixtures/okf-bad/` (three small bundles)
- Modify: `scripts/init.mjs` (print the bundle result)

**Interfaces:**
- Consumes: the manifest's `paths` (Task 6).
- Produces: `checkBundle(docsDir: string, now?: Date): { errors: string[], warnings: string[] }` and CLI `node scripts/okf-check.mjs <docsDir>` (exit 0 when `errors` is empty, else 1; each message in plain English with the file).
  - Errors (OKF v0.2 §11): a non-reserved `.md` file without a frontmatter block; a frontmatter block without a non-empty `type`; an `index.md` with frontmatter other than `okf_version` at the bundle root; a `log.md` date heading not in `YYYY-MM-DD` form.
  - Errors (hstack gate, from the layer list's Knowledge layer): a concept not listed in its folder's `index.md`; a `sources` entry whose `resource` is a bundle path (starts with `/` or `.`) that does not resolve; `status: stable` without a `verified` entry whose `by` starts with `human:`.
  - Warnings: a concept with `stale_after` at or before `now`; a `docs/log.md` entry that names no linked concept.
  - Frontmatter is read with a small parser for the fields above (`type`, `status`, `stale_after`, `verified`, `verified` as written by hstack: a flow mapping `{ by: …, at: … }` or a list of them; `sources` as a block list of `id` and `resource` entries), no YAML library.

- [ ] **Step 1: Write the failing tests:**
  - `this repo's docs bundle passes` — `checkBundle('docs').errors` is `[]`.
  - `a concept without type fails` — fixture `okf-bad/no-type/` gives one error naming the file.
  - `stable without a human verified fails` — fixture `okf-bad/stable-unverified/` (stable, verified only by `claude-code-advisor/…`) gives one error.
  - `a dead source path fails and a stale adapter warns` — fixture `okf-bad/dead-source/` with `sources: [{ resource: /design/missing.md }]` and `stale_after: "2026-01-01T00:00:00+07:00"`: one error, and with `now` = 2026-10-26 one warning.
- [ ] **Step 2: Run** `node --test tests/okf.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `checkBundle` and the CLI; make `init` print "Docs bundle: OK" or the error count with the first three messages, for `<root>/docs` when it exists.
- [ ] **Step 4: Run** `npm test`, then the OKF skill's validator on this repo (`bash <okf skill>/scripts/validate.sh docs`). Expected: all PASS; the validator says conformant.
- [ ] **Step 5: Commit** `git commit -m "Add the OKF checker and its gate rules"`

### Task 9: The two skills

**Files:**
- Create: `skills/hstack-init/SKILL.md`, `skills/hstack-safety/SKILL.md`, `tests/skills.test.mjs`

**Interfaces:**
- Consumes: the CLIs from Tasks 6, 7 and 8, found from the skill's base directory as `../../scripts/`.

- [ ] **Step 1: Write the failing test** `skills have frontmatter and name their scripts` — each `SKILL.md` starts with `---`, has `name:` (`hstack-init`, `hstack-safety`) and `description:`; `hstack-init` mentions `scripts/init.mjs`; `hstack-safety` mentions all four checks (`docker`, `port`, `drop`, `wipe`) and the volume ban.
- [ ] **Step 2: Run** `node --test tests/skills.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Write the skills.** `hstack-init`: when to run it (once per project, and again after a copy or a move), the command, what each warning means and what the user can do about it, and that it never runs `docker compose` and never writes inside the app folder. `hstack-safety`: the Safety rules of the layer list (`docs/design/2026-10-26-layers.md`) in plain words, and the rule "before any Docker command, port stop, database drop or folder wipe, run the matching check; on exit 1, stop and tell the user the reason".
- [ ] **Step 4: Run** `npm test` and `claude plugin validate .`. Expected: PASS; no errors.
- [ ] **Step 5: Commit** `git commit -m "Add the init and safety skills"`

### Task 10: Run it on the two real projects

**Files:**
- Create: `docs/foundation-check.md` (the outputs below, as quoted command output)
- Modify: `fixtures/electron/.gitignore` (add `.hstack/`). Writes `.hstack/manifest.json` at `../outsourcing-hstack/` (the project root, outside the client repo) and at `fixtures/electron/`.

- [ ] **Step 1: Run** `node scripts/okf-check.mjs docs`. Expected: exit 0 (this repo's own bundle passes). **Run** `node scripts/init.mjs fixtures/electron`. Expected: exit 0, stack B, no warnings.
- [ ] **Step 2: Run** `node scripts/init.mjs ../outsourcing-hstack`. Expected: exit 0, manifest at `outsourcing-hstack/.hstack/manifest.json` with `app` `real-estate`, stack A, `droppable` `real_estate_hstack` and `real_estate_hstack_test`; warnings for `tests/e2e/helpers/login.ts` (3000) and `tests/e2e/helpers/mailpit.ts` (8025), and for the compose file without a project name.
- [ ] **Step 3: Verify** `git -C ../outsourcing-hstack/real-estate status --short` prints nothing (no file entered the client repo). **Run** the checks on the copy root: `check.mjs <copy> docker` exit 1; `drop real_estate` exit 1; `drop real_estate_hstack` exit 0; `port 5432` exit 1 naming the shared container project `real-estate`.
- [ ] **Step 4: Write** the outputs into `docs/foundation-check.md` and commit with the `.gitignore` change: `git commit -m "Check init and the safety checks on both stacks"`

---

## Not in this plan (next plans)

- Giving a stack A project its own Postgres and Mailpit (pick free ports, compose rewrite with the path-based `name:`, ports into `.env`, `up -d`).
- The evaluator skill, the mutation step, the progress log and the loop that calls the slots.
- The migration of `outsourcing-hstack` onto the plugin, including mapping its existing paths into the manifest (`progress/feature_list.json`, `progress/test-coverage.md`, `progress/claude-progress.txt`, `docs/design/`), and the clean-install check from a fresh folder.
