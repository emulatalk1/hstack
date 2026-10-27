---
type: plan
title: "Own services plan (stack A)"
description: "init gives a stack A project its own Postgres and Mailpit in a named compose file, assigns their ports and writes the ports into the app's .env."
status: superseded
generated: { by: claude-code/2.1.310, at: "2026-10-27T06:46:12+07:00" }
sources:
  - id: layers
    resource: /design/2026-10-26-layers.md
  - id: stack-a
    resource: /references/adapters/2026-10-26-stack-a.md
  - id: foundation
    resource: /plans/2026-10-26-hstack-foundation.md
  - id: bun-runtime
    resource: /decisions/2026-10-26-bun-runtime.md
---

# Own Services (Stack A) Implementation Plan

> **Superseded (2026-10-27, never built):** set aside the same morning. The harness is to be stack-agnostic (no tool or stack named in plugin code; the stack A adapter is now an example, not plugin content), and safety moves to a throwaway environment per run instead of per-project services. The user then chose to finish the whole measuring stick before any plugin work. Kept as a record only.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `init` on a stack A project writes the project's own compose file (Postgres, and Mailpit when the app can use it) named from the folder's path, picks free host ports for them, and writes those ports into the app's `.env` and the manifest, so two copies of a project never share containers, data or ports.

**Architecture:** One new module, `scripts/lib/services.mjs`, holds the pure parts: which services the project may own, the `.env` port rewrite, the compose text and the port pick. `init` calls it, writes `<root>/.hstack/compose.yaml`, edits the port numbers in `<app>/.env`, then writes the manifest. The safety checks stay as they are, except that a container counts as this project's when its working-directory label is `<root>/.hstack`. No hstack script runs `docker compose`; the agent does, after `check docker`.

**Tech Stack:** Bun 1.4.4+ (Bun APIs for file I/O, `bun:test`), ES modules, no dependencies.

**Spec:** `docs/design/2026-10-26-layers.md` (Safety rules, "Services per project"), `docs/references/adapters/2026-10-26-stack-a.md` (fields 9, 10, 12).

## Changes to the spec

The build updates `layers.md` to match (Task 4). Each needs the user's yes when the plan is approved.

1. **The compose file lives at `<root>/.hstack/compose.yaml`, not at the root.** When the app is the root, the app's own `docker-compose.yml` already sits there, and `check docker` refuses a folder with two compose files. hstack owns `.hstack/`, so nothing of the app's can collide with it. Compose sets the label `com.docker.compose.project.working_dir` to the compose file's folder, so a container is this project's when that label is `<root>/.hstack` (the spec said the project folder). The agent runs `docker compose` from `<root>/.hstack`.
2. **A service stays shared when the app cannot be pointed at a new port.** The spec states this for `outsourcing-hstack` (shared Mailpit and port 3000 until two helpers read `.env`). The plan makes it the rule: Postgres, Mailpit or the dev server is the project's own only when its `.env` key exists, points at this machine, is not set again in `.env.local` or another file Next reads over `.env`, and its port is not written in the app's code.
3. **Postgres uses `POSTGRES_HOST_AUTH_METHOD: trust`, bound to `127.0.0.1`.** The compose file then holds no password, so it is safe to commit; the app's `DATABASE_URL` password is accepted and ignored.
4. **`init` edits the app's `.env`, but only port numbers of keys that already exist.** It adds no key and changes no other byte, and it prints each change (old and new port), so the user can undo it from the output.

## Global Constraints

- Bun 1.4.4 or later; Bun APIs for file I/O (`Bun.file`, `Bun.write`); no `dependencies` or `devDependencies`.
- No hstack script runs `docker compose`; tests never start, stop or remove containers (only `docker ps`).
- No route may remove a Docker volume. The compose file's Postgres data lives in a named volume, `pgdata`, which Compose scopes by the project name.
- Docker project name: `projectName(root)`, `<slug>-<8 hex of sha256(path)>`, on the compose file's first line (`name: <projectName>`), because `check docker` refuses any other layout.
- Inside the app folder, `init` writes only the port numbers in `.env`. Everything else it writes is under `<root>/.hstack/`.
- Images: `postgres:17`, `axllent/mailpit:v1.31.4` (the real-estate compose file). Container ports: Postgres 5432, Mailpit SMTP 1025, Mailpit web 8025.
- Port ranges (host): Postgres from 15432, Mailpit SMTP from 11025, Mailpit web from 18025, dev server from 13000; each start is shifted by the project's hash (0 to 999), and the pick tries 100 ports from there.
- Plain English in every message a script prints.

## Review Focus

- **A `DATABASE_URL` that points at another host** (a cloud database): `init` must leave it alone and must not write a Postgres service. Task 1 and Task 3 test it.
- **`.env` lines `init` must not disturb:** comments, quoted values, a URL with no port, a password holding `:`, other keys. Only the port digits change. Task 1 tests it byte for byte.
- **`init --force` again in the same folder while its own containers run:** the ports must stay the same, because a port held by this project's container counts as free for this project. Task 2 and Task 3 test it.
- **A copied folder:** `init --force` in the copy gets a new name, new ports and so a new volume, and the original's files and `.env` are untouched. Task 3 tests it.
- **A port someone else holds at `init` time:** the pick moves on to the next port. Task 2 tests it.
- **A key also set in `.env.local`, `.env.development` or `.env.development.local`:** Next and `payload run` read those over `.env`, so a rewrite of `.env` would not reach the app. That service stays shared. Task 1 and Task 3 test it.

---

## File Structure

| File | Job |
|---|---|
| `scripts/lib/services.mjs` (new) | `ownServices`, `setUrlPort`, `rewriteEnv`, `composeText`, `startPort`, `firstFree` |
| `scripts/lib/ports.mjs` | `isOurs`: a container's working directory must be `<root>/.hstack` |
| `scripts/lib/manifest.mjs` | builds `services`, `devServer.own`, `compose`; filters fixed-port warnings; returns the files to write |
| `scripts/lib/detect.mjs` | drops the `compose` field (the app's compose file is no longer read); returns the parsed `.env` for stack A |
| `scripts/init.mjs` | writes compose file, `.env` edit, manifest, in that order; prints what it changed |
| `skills/hstack-init/SKILL.md`, `skills/hstack-safety/SKILL.md`, `README.md` | the new output, where to run `docker compose`, the first start |
| `docs/design/2026-10-26-layers.md` | the four spec changes |
| `docs/services-check.md` (new) | the real run on `outsourcing-hstack` |
| `tests/services.test.mjs` (new), `tests/init.test.mjs`, `tests/check.test.mjs`, `tests/ports.test.mjs`, `tests/detect.test.mjs`, `tests/skills.test.mjs`, `tests/fixtures/stack-a/real-estate/.env` | tests |

---

### Task 1: Which services the project owns, and the `.env` rewrite

**Files:**
- Create: `scripts/lib/services.mjs`, `tests/services.test.mjs`

**Interfaces:**
- Consumes: `parseEnv(text): Record<string,string>` from `scripts/lib/detect.mjs` (export it; today it is module-private).
- Produces:
  - `ownServices(env: Record<string,string>, fixed: Set<number>, shadowed: Record<string,string>): { postgres: Choice, mailpit: Choice, dev: Choice, current: { postgres: number, smtp: number, web: number, dev: number } }` where `Choice = { own: true } | { own: false, why: string }`. `current` is each service's port today: `DATABASE_URL` port (5432 when absent), `SMTP_PORT` (1025), Mailpit web 8025, `NEXT_PUBLIC_SERVER_URL` port (3000). `shadowed` maps a key to the first of `.env.development.local`, `.env.local`, `.env.development` that also sets it (Next's order, read by `init` from the app folder).
  - `setUrlPort(value: string, port: number): string`
  - `rewriteEnv(text: string, ports: { DATABASE_URL?: number, SMTP_PORT?: number, NEXT_PUBLIC_SERVER_URL?: number }): { text: string, changed: string[] }` — `changed` holds one line per edited key: `DATABASE_URL port 5432 → 15887`.

Rules for `ownServices` (local host = `localhost`, `127.0.0.1` or `[::1]`):
- Postgres is own when `DATABASE_URL` parses as a `postgres:` or `postgresql:` URL on a local host with a user name, and `current.postgres` is not in `fixed`.
- Mailpit is own when `SMTP_PORT` is set, `SMTP_HOST` is absent or local, and neither `current.smtp` nor `current.web` is in `fixed`.
- The dev server is own when `NEXT_PUBLIC_SERVER_URL` is on a local host and `current.dev` is not in `fixed`.
- Any service whose key (`DATABASE_URL`, `SMTP_HOST`, `SMTP_PORT`, `NEXT_PUBLIC_SERVER_URL`) is in `shadowed` is shared.
- `why` is one plain sentence ending in a full stop: `DATABASE_URL is not in .env.`, `DATABASE_URL points at db.example.com, not this machine.`, `DATABASE_URL has no user name.` (the `pg` client would fall back to the OS user, which the container lacks), `port 5432 is written in the app's code.`, `.env.local also sets DATABASE_URL.`, `SMTP_PORT is not in .env.`, and the same forms for the other keys.

- [ ] **Step 1: Write the failing tests** in `tests/services.test.mjs`:
  - `ownServices owns local services whose ports are not in code`: env `{ DATABASE_URL: 'postgres://u:p@localhost:5432/shop', SMTP_HOST: 'localhost', SMTP_PORT: '1025', NEXT_PUBLIC_SERVER_URL: 'http://localhost:3000' }`, `fixed = new Set([3000])`, `shadowed = {}` → `postgres.own === true`, `mailpit.own === true`, `dev` is `{ own: false, why: "port 3000 is written in the app's code." }`, `current` `{ postgres: 5432, smtp: 1025, web: 8025, dev: 3000 }`.
  - `ownServices leaves remote and missing services shared`: `DATABASE_URL` on `db.example.com` → `why` names `db.example.com`; empty env → three `own: false` with the "is not in .env." reasons; `fixed = new Set([8025])` with `SMTP_PORT` set → Mailpit shared; `shadowed = { DATABASE_URL: '.env.local' }` → `why` is `.env.local also sets DATABASE_URL.`; `postgres://localhost:5432/shop` → `why` is `DATABASE_URL has no user name.`
  - `setUrlPort changes only the port`: `postgres://u:p@localhost:5432/db` → `…@localhost:15887/db`; `postgres://u:p@localhost/db` → `…@localhost:15887/db`; `http://localhost:3000` → `http://localhost:13001` (no trailing slash added); `postgres://u:pa%3Ass@127.0.0.1:5432/db?sslmode=disable` keeps user, password and query.
  - `rewriteEnv keeps every other byte`: input `# local\nDATABASE_URL="postgres://u:p@localhost:5432/db"\nPAYLOAD_SECRET=abc\nSMTP_PORT=1025\n` with `{ DATABASE_URL: 15887, SMTP_PORT: 11030 }` → exactly `# local\nDATABASE_URL="postgres://u:p@localhost:15887/db"\nPAYLOAD_SECRET=abc\nSMTP_PORT=11030\n`, and `changed` equal to `['DATABASE_URL port 5432 → 15887', 'SMTP_PORT port 1025 → 11030']`; a key named in `ports` but absent from the text adds nothing; CRLF input stays CRLF.
- [ ] **Step 2: Run** `bun test tests/services.test.mjs`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** the three functions in `scripts/lib/services.mjs`. `setUrlPort` edits the authority with a regex (scheme `://`, optional `userinfo@`, host, optional `:port`), never `URL.toString()`, which adds a trailing slash. `rewriteEnv` edits a line only when it matches `^KEY\s*=` and keeps the value's quotes.
- [ ] **Step 4: Run** `bun test tests/services.test.mjs`. Expected: PASS.
- [ ] **Step 5: Commit** `git add scripts/lib/services.mjs scripts/lib/detect.mjs tests/services.test.mjs && git commit -m "Decide which services a project owns and rewrite their .env ports"`

### Task 2: Compose text, port pick, and container ownership in `.hstack`

**Files:**
- Modify: `scripts/lib/services.mjs`, `scripts/lib/ports.mjs` (`isOurs`), `tests/services.test.mjs`, `tests/ports.test.mjs`

**Interfaces:**
- Produces:
  - `composeText(name: string, services: { postgres: { port: number, user: string } | null, mailpit: { smtpPort: number, webPort: number } | null }): string` — first line `name: <name>`; Postgres: `image: postgres:17`, `environment` `POSTGRES_USER` and `POSTGRES_HOST_AUTH_METHOD: trust`, `ports: ['127.0.0.1:<port>:5432']`, `volumes: ['pgdata:/var/lib/postgresql/data']`, and a top-level block `volumes:` / `  pgdata:` (two lines, block form); Mailpit: `image: axllent/mailpit:v1.31.4`, ports `127.0.0.1:<smtpPort>:1025` and `127.0.0.1:<webPort>:8025`. `POSTGRES_USER` is written with `JSON.stringify` after replacing `$` by `$$` (Compose reads `$` as a variable). No `restart:` policy.
  - `startPort(name: string, base: number): number` — `base + parseInt(name.slice(-8), 16) % 1000`.
  - `firstFree(start: number, isFree: (port: number) => Promise<boolean>, taken: Set<number>): Promise<number>` — the first of `start … start+99` that is not in `taken` and for which `isFree` is true; throws `Error('No free port from <start> to <start+99>.')` otherwise.
  - `isOurs(owner, dir, name)`: unchanged signature; a container is ours when `owner.project === name` and `real(owner.workingDir) === real(path.join(dir, '.hstack'))`. Processes: unchanged.

- [ ] **Step 1: Write the failing tests:**
  - `composeText passes the docker check`: in a temp root, write a manifest `{ version: 2, projectName: projectName(root), app: '.', data: { kind: 'postgres', droppable: [] }, compose: { file: '.hstack/compose.yaml', name: projectName(root) } }` and `composeText(projectName(root), { postgres: { port: 15500, user: 'post$gres' }, mailpit: { smtpPort: 11100, webPort: 18100 } })` at `.hstack/compose.yaml`; `bun scripts/check.mjs <root> docker` exits 0. The text contains `"post$$gres"`, `127.0.0.1:15500:5432`, `POSTGRES_HOST_AUTH_METHOD: trust`, and no `POSTGRES_PASSWORD`. With `mailpit: null` the text has no `mailpit` line; with `postgres: null` it has no `volumes`.
  - `startPort stays in its range`: for `projectName` of two temp folders, `15432 <= startPort(n, 15432) < 16432`.
  - `firstFree skips taken and busy ports`: `isFree = async (p) => p !== 101`, `taken = new Set([100])`, `start = 100` → `102`; all busy → rejects with `No free port from 100 to 199.`
  - In `tests/ports.test.mjs`, `isOurs compares real paths and folder boundaries`: the container case now uses `workingDir: path.join(dir, '.hstack')` → `true`, and `workingDir: dir` → `false`.
- [ ] **Step 2: Run** `bun test tests/services.test.mjs tests/ports.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `composeText`, `startPort`, `firstFree` in `services.mjs`, and the `isOurs` change in `ports.mjs` (one-line comment: Compose labels a container with its compose file's folder).
- [ ] **Step 4: Run** `bun test ./tests`. Expected: PASS, except the `check.test.mjs` port test if it relied on a container working directory equal to the root (fix it here if so).
- [ ] **Step 5: Commit** `git commit -m "Write the own-services compose file and pick its ports"`

### Task 3: `init` writes the compose file, the `.env` ports and the manifest

**Files:**
- Modify: `scripts/lib/manifest.mjs`, `scripts/lib/detect.mjs`, `scripts/lib/fixed-ports.mjs`, `scripts/init.mjs`, `tests/init.test.mjs`, `tests/fixed-ports.test.mjs`, `tests/check.test.mjs`, `tests/detect.test.mjs`, `tests/fixtures/stack-a/real-estate/.env` (add `SMTP_HOST=localhost` and `SMTP_PORT=1025`)

**Interfaces:**
- Consumes: Task 1 and Task 2 functions; `portOwners`, `isOurs` from `ports.mjs`; `findFixedPorts`. `stackA` in `detect.mjs` returns `env` (parsed `.env`) and `shadowed`, built by reading `.env.development.local`, `.env.local` and `.env.development` from the app folder with `parseEnv`.
- Produces (manifest `version: 2`; stack B: `services: null`, `compose: null`, `devServer.own: false`):
  - `services: { postgres: { own: boolean, port: number, why?: string }, mailpit: { own: boolean, smtpPort: number, webPort: number, why?: string } }`
  - `devServer: { start: string, port: number, own: boolean }` — when own, `start` is `PORT=<port> pnpm dev` (`next dev` takes its port from `PORT`, not from `.env`).
  - `compose: { file: '.hstack/compose.yaml', name: string } | null` — `null` when neither Postgres nor Mailpit is own.
  - `buildManifest(root, app)` returns `{ manifest, warnings, compose: string | null, env: { file: string, text: string, changed: string[] } | null }`; `init` writes them.

Behavior:
- Ports: for each own service, `start` is the previous manifest's port for that service when `<root>/.hstack/manifest.json` exists with the same `projectName` and holds that port (a version-1 manifest has no `services`, so it holds none), else `startPort(projectName, base)`; `isFree(p)` is `(await portOwners(p)).every((o) => isOurs(o, root, projectName))`; `taken` collects the ports already picked in this run.
- Fixed ports: `findFixedPorts` also scans the app folder's top-level `*.{ts,mts,js,mjs}` files (not recursive), because `playwright.config.ts` and its siblings start the dev server; a hit there reports the bare file name.
- Warnings: the fixed-port warning lines stay as worded today, but only for hits whose port is one of `current`'s four ports. For each shared service, one line: `Warning: Postgres stays shared: <why>` (and `Mailpit`, `The dev server`). The old compose-name warnings and the `compose` field from `detect.mjs` go away.
- Output, after the warnings: `Wrote <root>/.hstack/compose.yaml: Postgres on port <p>, Mailpit on ports <s> and <w>.` (only the own parts), then `Changed <app>/.env: <changed line>.` per change, then `Wrote <manifest>`.
- Write order: compose file, `.env`, manifest. Nothing is written when any port pick or `lsof` fails.

- [ ] **Step 1: Write the failing tests** in `tests/init.test.mjs` (replacing `init on stack A warns about the fixed port and the compose name`):
  - `init on stack A owns Postgres and Mailpit and keeps the dev port shared`: `m.version === 2`; `m.services.postgres.own === true` with `15432 <= port < 16532`; `m.services.mailpit.own === true`; `m.devServer` `{ start: 'pnpm dev', port: 3000, own: false }`; `m.compose` `{ file: '.hstack/compose.yaml', name: m.projectName }`; the compose file's first line is `name: ${m.projectName}`; `.env` holds `DATABASE_URL=postgres://u:p@localhost:${port}/shop_dev` and still `NEXT_PUBLIC_SERVER_URL=http://localhost:3000`; output matches `/login\.ts line 3 has port 3000/`, `/The dev server stays shared: port 3000 is written in the app's code\./`, `/Changed real-estate\/\.env: DATABASE_URL port 5432 → /`; apart from `.env`, the app folder listing is unchanged; `bun scripts/check.mjs <root> docker` exits 0.
  - `init leaves a remote database alone`: fixture `.env` with `DATABASE_URL=postgres://u:p@db.example.com:5432/shop_dev` → `.env` byte-equal after init, `m.services.postgres.own === false`, output matches `/Postgres stays shared: DATABASE_URL points at db\.example\.com/`.
  - `init --force in the same folder keeps the ports`: two runs (the second with `--force`) give equal `services` objects and an unchanged `.env` the second time (no `Changed` line).
  - `a copied folder gets its own name and ports`: init, copy the root to a new temp folder, `init --force` in the copy → `projectName` and compose `name:` differ from the original's, and the original's `.env`, compose file and manifest are byte-equal to before.
  - `fixed-port warnings name only service ports`: add `real-estate/tests/unit/a.test.ts` holding `'http://localhost:4321'` → no output line mentions `4321`.
  - `the dev server is own when no code fixes its port`: delete the fixture's `tests/e2e/helpers/login.ts` → `m.devServer.own === true`, `m.devServer.start` matches `/^PORT=\d+ pnpm dev$/`, `13000 <= m.devServer.port < 14099`, `.env` holds `NEXT_PUBLIC_SERVER_URL=http://localhost:${m.devServer.port}`.
  - `a port in a top-level config file counts`: delete `login.ts`, add `real-estate/playwright.config.ts` holding `url: 'http://127.0.0.1:3000'` → output matches `/playwright\.config\.ts line 1 has port 3000/` and `m.devServer.own === false`. Pin the same in `tests/fixed-ports.test.mjs`.
  - `a key in .env.local keeps that service shared`: add `real-estate/.env.local` with `DATABASE_URL=postgres://u:p@localhost:5432/other` → `m.services.postgres.own === false`, output matches `/Postgres stays shared: \.env\.local also sets DATABASE_URL\./`, `.env` byte-equal for that key.
  - Stack B test: `m.services === null`, `m.compose === null`.
- [ ] **Step 2: Repoint the docker-check tests** in `tests/check.test.mjs` at `.hstack/compose.yaml`: `namedCompose()` becomes `initted('A')` (init now writes a named compose file); the helpers' folder is `path.join(a, '.hstack')` and the file name `compose.yaml`; `docker is refused when the compose file has no matching name` edits the `name:` line of `.hstack/compose.yaml` to `name: other`; `docker is refused when there is no compose file…` drops its prepend step. `appendEnv` must create `<d>/.env` when it is missing (`.hstack/.env` does not exist after init). Every case keeps its expectation. In `tests/detect.test.mjs`, drop the two `s.compose` assertions.
- [ ] **Step 3: Run** `bun test ./tests`. Expected: the new init tests FAIL; check tests FAIL where they expect `.hstack/compose.yaml`.
- [ ] **Step 4: Implement** in `manifest.mjs`, `detect.mjs` and `init.mjs` as above.
- [ ] **Step 5: Run** `bun test ./tests`. Expected: all PASS; then `git status --short` shows no stray files from the tests.
- [ ] **Step 6: Commit** `git commit -m "Give stack A projects their own Postgres and Mailpit"`

### Task 4: Skills, README and the spec

**Files:**
- Modify: `skills/hstack-init/SKILL.md`, `skills/hstack-safety/SKILL.md`, `README.md`, `docs/design/2026-10-26-layers.md`, `tests/skills.test.mjs`

- [ ] **Step 1: Write the failing assertions** in `tests/skills.test.mjs`: the init skill contains `.hstack/compose.yaml`, `docker compose up -d` and `stays shared`; the safety skill contains `.hstack` and still contains `docker compose down -v` in its banned list.
- [ ] **Step 2: Run** `bun test tests/skills.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Edit the docs.**
  - Init skill: what `Wrote …compose.yaml` and `Changed …/.env` mean; a `stays shared` warning means that service is still the shared one and the fix is to move the port into `.env`; the first start: `check docker`, then `docker compose up -d` from `<root>/.hstack`, then the manifest's seed command (it creates the database). Remove the "compose file has no project name" warning text, and rewrite the "It writes one file only" bullet: `init` now writes `.hstack/manifest.json`, `.hstack/compose.yaml` and port numbers in the app's `.env`.
  - Safety skill: run `docker compose` from `<root>/.hstack`; a container is this project's when its working-directory label is `<root>/.hstack`.
  - README: replace the compose-name warning bullet and the "Narrowing this…" known limit; `init` now writes `.hstack/compose.yaml` and port numbers in `.env`; Roadmap item 1 done; test count.
  - `layers.md`, "Services per project": the four changes from "Changes to the spec" above.
- [ ] **Step 4: Run** `bun test ./tests` and `bun scripts/okf-check.mjs docs`. Expected: PASS; the docs check reports 0 errors.
- [ ] **Step 5: Commit** `git commit -m "Document own services in the skills, README and layers"`

### Task 5: The real run on `outsourcing-hstack` (controller, not a subagent)

This starts real containers. Never touch `outsourcing/` or its databases; never `docker compose down -v`.

**Files:**
- Create: `docs/services-check.md` (OKF `type: reference`), with entries in `docs/index.md` and `docs/log.md`

- [ ] **Step 0:** `ls -a ../outsourcing-hstack/real-estate | grep '^\.env'` lists only `.env` and `.env.example` (true on 2026-10-27). If a `.env.local` or `.env.development*` file appears, stop and tell the user: Postgres would stay shared and this run would prove nothing.
- [ ] **Step 1:** `bun scripts/init.mjs ../outsourcing-hstack --force`. Expected: Postgres own; Mailpit shared (`port 8025 is written in the app's code.`); the dev server shared (port 3000); one `Changed real-estate/.env: DATABASE_URL port 5432 → <p>.` line; `git -C ../outsourcing-hstack/real-estate status --short` is empty (`.env` is ignored there).
- [ ] **Step 2:** `bun scripts/check.mjs ../outsourcing-hstack docker`. Expected: exit 0.
- [ ] **Step 3:** from `../outsourcing-hstack/.hstack`: `docker compose up -d`. Then `docker ps --format '{{.Names}} {{.Label "com.docker.compose.project"}} {{.Label "com.docker.compose.project.working_dir"}}'` shows the new container with the manifest's `projectName` and the `.hstack` folder. This is the first time Compose itself reads an hstack compose file.
- [ ] **Step 4:** `bun scripts/check.mjs ../outsourcing-hstack port <p>`. Expected: `Port <p> is held by this project.` Then `bun scripts/init.mjs ../outsourcing-hstack --force` again: the Postgres port is the same and there is no `Changed` line (the running container counts as this project's).
- [ ] **Step 5:** in `real-estate/`: `pnpm seed:demo`; then the test database as adapter field 10 does it (`rm -rf media-test`, then `DATABASE_URL=<the .env URL with _test> MEDIA_DIR=./media-test PAYLOAD_DROP_DATABASE=true pnpm seed:demo`); then `pnpm test --project int tests/int/locations.int.spec.ts -t 'loads 34 provinces'`. Expected: `Created database "real_estate_hstack"` and `Demo data loaded.` for each seed, then `1 passed`. The old `real_estate_hstack` database on the shared Postgres stays as it is.
- [ ] **Step 6:** `docker compose stop` from `.hstack`, unless the user wants the containers left up. Write the commands and their output into `docs/services-check.md`; run `bun scripts/okf-check.mjs docs`; commit `git commit -m "Record the own-services run on outsourcing-hstack"`.

## Not checked by this plan

- That `next dev` takes its port from `PORT` in the environment and not from `.env`: Next's docs say so, but no run here starts a dev server on an own port (both the fixture and `outsourcing-hstack` fix port 3000 in code).

## Not in this plan

- Per-worker test databases for mutation runs (the mutation plan).
- Who may empty Mailpit during e2e (adapter field 12, open).
- Moving `outsourcing-hstack`'s `login.ts` and `mailpit.ts` to `.env` (the migration plan), after which a new `init --force` makes Mailpit and the dev server its own.
- Removing a stale `.hstack/compose.yaml` when a later `init --force` owns no service.
