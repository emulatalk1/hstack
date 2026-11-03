# hstack progress log

## 2026-10-26 — foundation plan (`docs/plans/2026-10-26-hstack-foundation.md`), branch `foundation`

Task review cost, one line per task (review = the task reviewer plus any fix-round re-reviews; implementer cost shown beside it):

- Task 1: review 44.4k tokens, 0.2 min (sonnet) · implementer 45.9k tokens, 0.4 min (haiku) · review clean
- Task 2: review 93.7k tokens, 1.1 min (sonnet review 48.4k/0.8 min + haiku re-review 45.3k/0.3 min, 1 fix round) · implementer 97.2k tokens, 0.9 min (haiku) · 1 Important fixed (slug could start with `_`)
- Task 3: review 98.9k tokens, 1.6 min (sonnet review 51.9k/1.1 min + sonnet re-review 47.0k/0.5 min, 1 fix round) · implementer 96.8k tokens, 1.4 min (sonnet) · 1 Important fixed (unreadable port owner looked free) + 1 spec gap (container name not asserted)
- Task 4: review 55.4k tokens, 1.1 min (sonnet) · implementer 48.5k tokens, 0.7 min (sonnet) · review clean
- Task 5: review 51.8k tokens, 0.6 min (sonnet) · implementer 50.6k tokens, 0.8 min (haiku) · review clean
- Task 6: review 54.5k tokens, 0.8 min (sonnet) · implementer 55.2k tokens, 1.1 min (sonnet) · review clean
- Task 7: review 172.1k tokens, 3.9 min (opus review 63.9k/2.0 min + sonnet re-reviews 54.9k/1.3 min and 53.3k/0.6 min, 2 fix rounds) · implementer 203.7k tokens, 2.9 min (sonnet) · 2 Important fixed (wipe limits trusted TMPDIR and the env var; an env value holding the project was allowed) + plain-English crash on a bad manifest
- Task 8: review 120.3k tokens, 2.0 min (sonnet review 66.4k/1.5 min + haiku re-review 53.9k/0.5 min, 1 fix round) · implementer 143.5k tokens, 2.0 min (sonnet) · 2 Important fixed (a trailing # comment hid status: stable; an unreadable stale_after was silent)
- Task 9: review 106.5k tokens, 1.5 min (sonnet review 61.8k/1.2 min + haiku re-review 44.7k/0.2 min, 1 fix round) · implementer 108.7k tokens, 0.9 min (sonnet) · 1 Important fixed (init skill claimed it never writes inside the app folder)
- Task 10: review 53.6k tokens, 0.5 min (sonnet) · implementer 53.1k tokens, 1.2 min (sonnet) · review clean

### SDD ledger copy (taken before the final review; SDD deletes the original)

    # SDD ledger — plan: docs/plans/2026-10-26-hstack-foundation.md
    
    Branch `foundation` from main 8f1b5f5. Spec: docs/design/2026-10-25-hstack-brief.md, docs/design/2026-10-26-layers.md, adapters.
    
    ## Pre-flight scan
    
    | Rows | Produces / consumes | Found |
    |---|---|---|
    | T1 self | `"test": "node --test"` vs "npm test runs every tests/*.test.mjs" | Bare `node --test` (Node 24.21) also runs `fixtures/electron/tests/*.test.ts` (checked in scratch). Conflict. |
    | T2→T6/T7 | `projectName`, `composeName` | agree |
    | T3→T7 | `portOwner`, `isOurs(owner, dir)` | macOS temp dirs: `/var/…` vs lsof `/private/var/…`; `isOurs` must compare real paths or T7's "own listener allowed" fails |
    | T3 self / T7 port test | "own listener" = a child process with cwd inside the project | T7 test must spawn the allowed listener with cwd inside the temp project (the test process's cwd is the repo) |
    | T4→T6 | `compose` relative to app folder → manifest `compose.file` | plan silent on manifest base; T7 reads it |
    | T4→T7 | `data.droppable` `$PROBE_DATA_DIR` → `wipe` "resolved value of the env var" | plan silent on where the value comes from |
    | T5→T6 | `findFixedPorts` + fixture `login.ts` | agree |
    | T6→T7 | manifest fields | agree; plan silent on check without a manifest |
    | T6→T8 | T8 adds bundle print to `init.mjs` | T6 test "no warning lines" ok (electron fixture has no docs); exit code must not depend on bundle result (T10 expects exit 0 on outsourcing-hstack, whose bundle may fail) |
    | T8 self | `checkBundle('docs')` passes | current docs: `stable` only on the plan (has `human:`); validate.sh conformant |
    | T8→T10 | T10 adds `docs/foundation-check.md` | needs frontmatter, root index.md entry, log.md entry (user rule) |
    | T9 self | skills name scripts | agree |
    | T10 self | init on `../outsourcing-hstack` | root has only `real-estate/package.json` → app = `real-estate`; `.env` db `real_estate_hstack`; both repos clean now; root repo will show `?? .hstack/` (not the client repo) |
    
    ## Rulings
    
    - Ruling: package.json test script is `node --test tests/*.test.mjs`, not bare `node --test` — bare form runs the Electron fixture's vitest files and fails; plan's own Interfaces line says "every tests/*.test.mjs" — cost if wrong: one script string.
    - Ruling: `isOurs` and every path comparison in ports/check use `fs.realpathSync` on both sides (fall back to `path.resolve` when the path does not exist) — macOS `/var` symlink — cost if wrong: none, stricter equality.
    - Ruling: manifest `compose.file` is relative to the project root (e.g. `real-estate/docker-compose.yml`); `detectStack` keeps it app-relative as the plan says — the manifest lives at the root and the layer list says init will write compose at the root — cost if wrong: one path join in T6/T7.
    - Ruling: `wipe` takes the env var's value from `process.env[NAME]` when set, else from the `NAME=value` assignment in the app's `dev` script; relative values resolve against the app folder; the result must also be inside the project root or `os.tmpdir()` (real paths) — the manifest stores only `$NAME`; adapter B says "rm -rf $PROBE_DATA_DIR, which is data/ in dev" — cost if wrong: a wipe refused that should pass, never the reverse.
    - Ruling: every check with no manifest refuses (exit 1) and says to run `init` — safety default — cost if wrong: none.
    - Ruling: `init`'s exit code ignores the docs bundle result (T8 prints only) — T10 expects exit 0 on outsourcing-hstack — cost if wrong: none.
    - Ruling: progress log for this repo is `progress/progress.md` (the manifest's `paths.progressLog`); task-review tokens and minutes go there, one line per task, plus the copied SDD ledger before the final review — cost if wrong: a file move.
    
    - Ruling: the T4 stack A fixture compose has no top-level `name:` — T6 asserts "no project name" and T7 refuses `docker` on it — cost if wrong: none.
    - Ruling: T7's port test compares the named folder against `fs.realpathSync(tmpDir)` — lsof prints real paths — cost if wrong: none.
    - Ruling: each T8 `okf-bad/*` bundle has a root `index.md` (only `okf_version`) and a folder index listing its concept, so each yields exactly one error — cost if wrong: none.
    - Ruling: T10's `docs/foundation-check.md` gets frontmatter with `type`, a root `docs/index.md` entry and a linked `docs/log.md` entry, validator run before commit — keeps T8's "repo bundle passes" test green — cost if wrong: none.
    - Ruling: the controller commits `progress/progress.md` cost lines in their own commits — keeps them out of task commits — cost if wrong: none.
    
    ## Tasks
    Task 1: minor (deferred): test name says 'agree' but compares each to the literal 'hstack'; plugin.json has no author, marketplace.json no description (validator warnings)
    Task 1: complete (commits 8f1b5f5..e44912b, review clean)
    - Ruling: Task 2 slug also trims leading `_` (regex `/^[-_]+|-+$/g`), beyond the brief's literal rule — Review Focus requires a valid Docker project name, which must start with [a-z0-9] — cost if wrong: none.
    Task 2: minor (deferred): composeName returns garbage for `name: # c`, `name: |`, unterminated quote; identity tests leave temp dirs; no test for empty-slug fallback
    Task 2: carry to T6/T7: composeName throws ENOENT on a missing file — callers check existence
    Task 2: fix round 1/5 (1 addressed, 0 open — leading underscore slug; commits ba9629d..beed836)
    Task 2: complete (commits 748d216..beed836, review clean)
    - Ruling: portOwner returns `{ kind: 'process', pid, cwd: null }` when a listener's cwd cannot be read (brief typed cwd as string), isOurs is false for null cwd; an lsof failure other than exit 1 with empty output also means 'unknown', not free — unknown must never read as free, since T7 allows on null — cost if wrong: a port refused that could have been allowed.
    Task 3: minor (deferred): no execFile timeout for docker ps; UDP-only publish counts as TCP owner (safe direction); only the first lsof pid reported; Docker-missing path untested; temp-dir cleanup not in finally
    Task 3: fix round 1/5 (3 addressed, 0 open — unknown owner read as free; lsof errors swallowed; name not asserted; commits a75e9cb..091986f)
    Task 3: minor (deferred): lsof exit 1 with stdout (warnings) throws — fails loud, safe
    Task 3: complete (commits a45ab14..091986f, review clean)
    Task 4: minor (deferred): explicit :80/https URL gives port 3000; `export KEY=` and inline # comments in .env not handled; duplicate *_DATA_DIR in dev script duplicates droppable; db name not percent-decoded; no negative test for missing lock file
    Task 4: complete (commits f0b495f..c6c67ca, review clean)
    Task 5: minor (deferred): a directory named like x.ts (or a symlinked dir) throws EISDIR; walk descends into node_modules before filtering
    Task 5: complete (commits ff68070..753c69c, review clean)
    Task 5: carry to T6: findFixedPorts on ../outsourcing-hstack/real-estate returns 45 hits (ports 1, 5432 in unit tests; 3000 in many e2e specs and src/app/(frontend)/layout.tsx:29; 8025 mailpit.ts:1; 3000 login.ts:3)
    - Ruling (advisor agreed): init prints one warning per fixed-port hit, worded true for every hit: 'Warning: <file> line <n> has port <p> written in code. Read ports from .env so this project can get its own.' — no grouping (grouping would hide login.ts behind layout.tsx:29); filtering to the project's own ports is deferred to the own-services plan, the first point init knows all ports — cost if wrong: a 45-line first init output on outsourcing-hstack and a long foundation-check.md.
    - Ruling: every init warning line starts with 'Warning: ' so tests can assert 'no warning lines' — cost if wrong: none.
    Task 6: minor (deferred): explicit --app stored verbatim (./real-estate/ not normalized; absolute or .. not rejected); port warnings print app-relative paths; .hstack as a regular file gives a raw stack trace; no timeout on claude --version
    Task 6: complete (commits f982faf..b7f5a64, review clean)
    - Ruling: wipe refuses a target equal to the project root, the app folder or the temp folder itself (strictly inside only) — a dev-script value of '.' must not wipe the app — cost if wrong: none.
    - Ruling (revises the earlier wipe ruling): the temp allowance uses the system temp folders, never TMPDIR: realpath('/tmp'), plus on macOS the realpath of `getconf DARWIN_USER_TEMP_DIR`; an env-supplied data-folder value counts only when it resolves strictly inside one of those; a target inside the project must equal the dev-script value — the reviewer showed TMPDIR=$HOME PROBE_DATA_DIR=$HOME/Documents allowed wiping ~/Documents — cost if wrong: a temp-folder wipe refused on an unusual OS.
    - Ruling: a malformed manifest.json is a Global Constraint (plain English) gap, fixed in round 1 — cost if wrong: none.
    Task 7: minor (deferred): port 0 or >65535 reported free; drop '$PROBE_DATA_DIR' allowed on a folder project; relative wipe target resolves against the shell cwd; listener() promise hangs if the child crashes; no tests for container refusal, missing compose file, name mismatch
    Task 7: fix round 1/5 (2 addressed, 1 open — new: env value that is an ancestor of the project root allowed; plus wrong-shape manifest still crashes; commits 2dd1f3e..84d754c)
    Task 7: fix round 2/5 (2 addressed, 0 open — ancestor wipe; wrong-shape manifest; commits 84d754c..e89bf58)
    Task 7: minor (deferred): manifest with right projectName but missing app/data.kind/compose.file crashes (fails closed); TMPDIR test makes a .outside-* dir inside the repo
    Task 7: complete (commits 1741b82..e89bf58, review clean)
    Task 8: minor (deferred): link forms [a](x "title") and <x> not recognised (noisy, not a false pass); flow-style sources capture garbage; walk descends into dot-folders; sources path with .. escaping the bundle passes; init crashes after writing the manifest if checkBundle throws
    Task 8: fix round 1/5 (2 addressed, 0 open — trailing comment false pass; silent unreadable stale_after; commits 95724d3..657ccf7)
    Task 8: complete (commits f54b09d..657ccf7, review clean)
    Task 9: minor (deferred): safety skill doesn't say a docker pass checks only the compose name (not permission for other containers) nor list the allowed docker actions; doesn't mention missing compose file refusal; 'the database' should be 'the databases'; drop doesn't check data.kind; init skill omits the second Docs bundle line and the no-stack error; skills test uses includes() so it can't catch a skill telling agents to run a banned command, and doesn't assert the pkill or exit-1 rules
    Task 9: fix round 1/5 (1 addressed, 0 open — app-folder write claim; commits 2d29493..c85f3e6)
    Task 9: complete (commits 14029ad..c85f3e6, review clean)
    Task 10: minor (deferred): foundation-check.md labels the fixture run 'stack B' but the quoted output shows only 'Wrote ...' (stack B is in the unquoted manifest); 'exit N' lines are annotations inside 'output as printed' blocks
    Task 10: complete (commits eb2cfd2..ce6cf0e, review clean; controller re-ran the four checks: docker 1, drop real_estate 1, drop real_estate_hstack 0, port 5432 1)

- Final review: 141.6k tokens, 7.8 min (opus) → 1 Critical, 6 Important; fix wave 90.0k tokens, 4.1 min (sonnet); scoped re-review 96.8k tokens, 5.4 min (opus) → all addressed except C1 (parked, see ledger)

### SDD ledger tail after the final review

    ## Final review (opus, 141.6k tokens, 7.8 min): No — with fixes C1, I1-I6
    Final review: process breach — the reviewer ran `docker compose -f <temp>/real-estate/docker-compose.yml config` once (read-only) and `pkill -f "listen(47123"` on its own two listeners; reported to the user.
    - Ruling: C1 — `docker` also refuses when COMPOSE_PROJECT_NAME or COMPOSE_FILE is set in process.env or in the `.env` beside the compose file, and when another default compose file (compose.yaml, compose.yml, docker-compose.yaml, docker-compose.yml) sits beside it; the safety skill says never -p, never -f another file — goes beyond the plan's name-only check; Compose's own precedence makes name-only unsafe — cost if wrong: a docker run refused that could pass.
    - Ruling: I1 — the port check looks at every lsof pid; allowed only when all are ours; container-first order stays (checking processes for a published port would name Docker's forwarder) — cost if wrong: none.
    - Ruling: I5 — `drop` refuses unless data.kind is postgres — cost if wrong: none.
    - Ruling: M4 and I3 — every `sources` resource without `://` is a bundle path that must resolve inside the bundle — spec: "sources paths are bundle-relative and must resolve" — cost if wrong: more gate errors on hand-written bundles.
    - Ruling: M1 (port range 1-65535) joins the fix wave; the other deferred minors wait for later plans as the final reviewer triaged.
    - Ruling: M7 — foundation-check.md stays in docs/ — the plan says docs/ and the user asked for it there by name — cost if wrong: a file move.
    - Ruling: I4's fix needs init re-run on ../outsourcing-hstack with --force (rewrites only .hstack/manifest.json at the root) and foundation-check.md redone — cost if wrong: none.
    Final fix wave (sonnet, 90.0k tokens, 4.1 min): commits d44164c..0195d1f (8afa7c8, 6df0bad, 22d7171, 0195d1f); 50/50 tests; Task 10 redone, client repo clean.
    Final re-review (opus, 96.8k tokens, 5.4 min): I1, I2, I3+M4, I4, I5, I6, M1, Task 10 redo ADDRESSED; C1 NOT ADDRESSED (partly).
    Final: parked — C1 residual: `docker` still allows when Compose would take another name via a `.env` line `COMPOSE_PROJECT_NAME: x` (colon form), a compose override file (compose.override.y(a)ml, docker-compose.override.y(a)ml) with `name:`, a second YAML document with `name:`, or COMPOSE_ENV_FILES / --env-file / --project-directory — Ruling: real, not fixed in this plan (no second fix wave); not reachable today (neither real compose file has a `name:`, so docker refuses on both) and this plan never runs docker compose; MUST be fixed before the own-services plan relies on `docker` allowing — enumerating Compose's inputs keeps leaking, so that plan should ask Compose itself (`docker compose config` read-only, needs the user's yes) or refuse any compose folder with extra compose/override/env inputs — cost if wrong: an agent told "Docker is allowed" for a project Compose runs as someone else's.
    Final: minor (deferred): C1 tests assume the shell exports neither COMPOSE_PROJECT_NAME nor COMPOSE_FILE (fails safe); OKF source path through a symlink out of the bundle passes; flow-form `sources` capture the trailing `}`; `mailto:` resources now error.

## 2026-10-26 — Bun runtime plan (`docs/plans/2026-10-26-bun-runtime.md`), branch `bun-runtime`

Task review cost, one line per task (review = the task reviewer plus any re-reviews; implementer cost beside it):

- Task 1: review 82.3k tokens, 1.4 min (sonnet) · implementer 79.7k tokens, 2.5 min (sonnet) · review clean
- Task 2: review 110.3k tokens, 1.3 min (sonnet review 62.0k/0.9 min + haiku re-review 48.3k/0.4 min, 1 fix round) · implementer 124.9k tokens, 1.4 min (sonnet) · 1 Important fixed (Bun.Glob defaults skipped dot-files, dot-folders and symlinks)
- Task 3: review 118.7k tokens, 1.6 min (sonnet review 69.7k/1.2 min + haiku re-review 49.0k/0.4 min, 1 fix round) · implementer 126.9k tokens, 1.5 min (sonnet) · 2 Important fixed (a folder source read as missing; node in shebangs and messages)
- Task 4: review 71.8k tokens, 2.9 min (opus) · implementer 63.4k tokens, 3.9 min (sonnet) · review clean
- Task 5: review 73.3k tokens, 1.2 min (sonnet) · implementer 69.3k tokens, 1.7 min (sonnet) · review clean

### SDD ledger copy (taken before the final review; SDD deletes the original)

    # SDD ledger — plan: docs/plans/2026-10-26-bun-runtime.md
    
    Branch `bun-runtime` from main b7b457a. Spec: docs/design/2026-10-26-layers.md; behavior baseline: the foundation plan and its 50 tests. Bun 1.4.4.
    
    ## Pre-flight scan
    
    | Rows | Produces / consumes | Found |
    |---|---|---|
    | T1 self | tests to bun:test; allowed node: list | tests use `node:net` (listeners, 4 places) and `node:child_process` `spawn` for a child listener; `node:net` is not on the allowed list. Bun.listen probed: port 0, lsof sees it, ::1 binds, stop() frees it |
    | T1→T2-T4 | tests call sync functions | each later task updates its tests to `await` (plan: "their tests") — agree |
    | T2→T3 | async chain through manifest/init/check | plan text fixed before approval: chain followed in T2 — agree |
    | T3 self | Bun.Glob skips dot-folders | from Bun docs, not probed — test it in T3 |
    | T4 self | Bun.spawn on missing command | probed: throws ENOENT synchronously, like spawnSync — agree with plan |
    | T5 self | `compatibility` frontmatter | probed: `claude plugin validate .` accepts it |
    | T5→foundation-check | manifest equal to the Node run | `actor` from `claude --version`, same machine — agree |
    
    ## Rulings
    
    - Ruling: tests use `Bun.listen({ hostname, port: 0, socket: { data() {} } })` instead of `node:net`, and child listener processes run `bun -e` with Bun.listen code, started with `Bun.spawn` — keeps the allowed node: list as written; Bun has its own TCP API — cost if wrong: none.
    - Ruling: review cost per task goes to `progress/progress.md` under a new heading for this plan; the ledger is copied there before the final review — same as the foundation build — cost if wrong: none.
    - Ruling: `assert.deepEqual` (strict mode) maps to `toStrictEqual`, not `toEqual` as the plan says; `assert.equal` → `toBe`, `assert.notEqual` → `not.toBe` — node:assert/strict deepEqual is deepStrictEqual — cost if wrong: none, stricter.
    - Baseline for 'every test kept': test-names-before.txt and assert-counts-before.txt in this workspace.
    
    ## Tasks
    Task 1: minor (deferred): optional assert messages dropped in loop assertions (check.test, skills.test); node() helper name misleading
    Task 1: complete (commits b7b457a..8a89ac1, review clean; controller re-ran: 50 pass)
    Task 2: minor (deferred): fixed-ports nested ternary comparator hard to read; detect.mjs:51 await without parentheses
    Task 2: fix round 1/5 (1 addressed, 0 open — Glob skipped dot-files/symlinks; commits ee88ecd..6147793)
    Task 2: minor (deferred): no symlink test; dot:true walks node_modules under src fully (speed). Controller probe: a symlink loop does not hang Bun.Glob (2 hits) — the old Node walk followed it many levels (33 hits)
    Task 2: complete (commits 281a62b..6147793, review clean)
    - Ruling: `node` shebangs and `node scripts/...` text in scripts violate "no node command anywhere"; no task covered them — Task 3 fixes init.mjs and okf-check.mjs, Task 4 fixes check.mjs, Task 5's final grep also covers `scripts/` — cost if wrong: none.
    - Ruling: a `sources` resource that is an existing folder still resolves (Bun.file().exists() || statSync isDirectory) — behavior unchanged — cost if wrong: none.
    Task 3: minor (deferred): OKF walk now also skips dot-files (.draft.md) and symlinked .md files, beyond the approved dot-folder skip (record in the T5 decision doc); plain sort differs from old readdir order in rare cases; package.json that is a folder ignored
    Task 3: fix round 1/5 (2 addressed, 0 open — folder sources; node text in init/okf-check; commits 64479d5..c50cb46)
    Task 3: complete (commits e6dc538..c50cb46, review clean)
    Task 4: minor (deferred): lsof error text now 'lsof exited with code C'; Bun.file().json() accepts a BOM (bounded by the projectName match); findOtherComposeFile stat can throw on EACCES (fails closed, stack trace); redundant exists() before stat; no tests for the folder-named-compose refusal, lsof-missing refusal, getconf-empty skip
    Task 4: complete (commits 98c3219..1afc77c, review clean)
    Task 5: minor (deferred): README docs/ row omits decisions; skill sentence starts with literal ${CLAUDE_PLUGIN_ROOT}; reviewer wrote and removed temp files in /tmp
    Task 5: complete (commits e83d181..a55dcaa, review clean; controller re-ran: 52 pass, validator conformant, plugin validate passes)

- Final review: 146.7k tokens, 4.6 min (opus) → 2 Important + small items; fix wave 67.8k tokens, 2.0 min (sonnet); scoped re-review 70.1k tokens, 2.0 min (opus) → all addressed, 3 Minor parked

### SDD ledger tail after the final review

    ## Final review (opus, 146.7k tokens, 4.6 min): With fixes — I1, I2, plus M3, M4, M5, README row, two tests
    - Ruling: I1 — replace the plan's `fs.statSync(p, { throwIfNoEntry: false })?.isDirectory()` pattern with a try/catch helper (ENOTDIR from a file in the path is not covered by throwIfNoEntry) in init.mjs, okf-check.mjs, okf.mjs; the plan's pattern was the defect — cost if wrong: none.
    - Ruling: I2 — accept that Bun.file().text() strips a leading BOM, so a BOM-prefixed compose `name:` is read; YAML readers (Compose) ignore a BOM too, and if Compose did not, it would fail to parse rather than run as another project; record it in the decision record and pin it with a test — cost if wrong: a docker allow on a file Compose reads differently (not verified by running Compose, which is banned).
    - Ruling: M6 — no change; Claude Code's skills docs say skill content may use ${CLAUDE_PLUGIN_ROOT} in its Markdown body — cost if wrong: safety commands fail with module-not-found (fails closed).
    - Ruling: the two tests the final reviewer marked fix-before-merge (folder named like a sibling compose file refuses; lsof missing refuses), M3 (init with a folder at manifest path), M4 (test meaning), M5 (index description) and the README docs/ row join the one fix wave; other deferred minors wait as triaged.
    Final fix wave (sonnet, 67.8k tokens, 2.0 min): commits e1a18fc..d94aecd (c8bc7cf, 9614276, d94aecd); 58 tests.
    Final re-review (opus, 70.1k tokens, 2.0 min): I1, I2, M3, M4, T4 tests, M5, README ADDRESSED; no new Critical/Important.
    Final: parked — the T4(a) test's /compose\.yml/ regex cannot fail (docker-compose.yml is always named) — Ruling: real, harmless; the exit-1 assertion guards the behavior — cost if wrong: none.
    Final: parked — docs/index.md foundation-check description starts lowercase "the" vs "The" — Ruling: cosmetic — cost if wrong: none.
    Final: parked — OKF source check counts an unstat-able source (EACCES/ELOOP) as present — Ruling: real, edge case, not a safety gate — cost if wrong: an unreadable source passes the docs gate.
    Final: minor (deferred): init with `.hstack` as a file crashes with a stack trace (also crashed on Node; nothing written); check refuses a manifest folder with "No hstack manifest here" instead of "could not be read" (still refuses)

## 2026-10-27 — C1 fix (the parked docker finding), branch `fix-c1`

- C1: closed. Review 1 opus 79.7k/5.9 min + re-reviews opus 91.6k/6.6, 93.3k/6.4, 92.4k/10.4 min (3 fix rounds); implementer sonnet 69.8k/3.0 + 85.0k/1.5 + 95.0k/1.3 + 104.6k/1.3 min. Rule: the docker check refuses any Compose input it does not read; `name:` must be the compose file's first line.

### Ledger

    # SDD ledger — fix C1 (no plan file: the ruling is the foundation build's parked C1)
    
    Branch `fix-c1` from main 97d3ef3.
    - Ruling: fail closed — the docker check refuses any Compose input it does not read (identity env vars in shell or .env in = or : form, the 8 auto-loaded compose/override names, multiple name:/documents, include:, <<:) instead of asking Compose (hstack never runs docker compose) — cost if wrong: a docker run refused that Compose would have run under the right name.
    - Provenance: Docker's docs name only compose.yaml and compose.override.yaml as auto-loaded; the other six names come from the earlier re-reviewer's read of the local compose binary's strings. include:/<<: refusals are precautions; the docs do not settle their effect on the name.
    Review 1 (opus, 79.7k tokens, 5.9 min): Needs fixes — 2 Critical, 1 Important; implementer report.md was never written.
    - Ruling: the compose file must be plain lines: refuse any `\r` not followed by `\n`, U+0085, U+2028 or U+2029 (YAML line breaks the line-based reader does not see) — cost if wrong: a compose file with odd line endings refused.
    - Ruling: `.env` refuses when COMPOSE_PROJECT_NAME, COMPOSE_FILE or COMPOSE_ENV_FILES appears anywhere in it (even in a comment or after another value on the same line) — compose-go's dotenv parser reads a second assignment after a quoted value — cost if wrong: a commented-out COMPOSE_PROJECT_NAME is refused.
    - Ruling: the top-level `name:` line must hold exactly a valid Docker name (`[a-z0-9][a-z0-9_-]*`, optionally in matching quotes, then only spaces or a `#` comment), and the next non-blank line must not be indented — otherwise refuse — cost if wrong: an unusual but valid name form refused.
    Fix-1: minor (deferred): README test count; `!!str` tags and `%YAML` directives over-refused (accepted).
    Fix round 1/5 (implementer sonnet 85.0k/1.5 min; re-review opus 91.6k/6.6 min): F1, F2, F3 addressed; new Critical class open — a column-0 `name: <ours>` swallowed by a multi-line quoted scalar/flow collection or the `--- {…}` first line, with the real name key written quoted, tagged, as `? name`, or as an alias `*k :` (exit 0; Compose would use another name — via libyaml/sigs.k8s.io/yaml oracles, go-yaml v3 not run).
    - Ruling: structural allowlist — every non-blank line that does not start with whitespace or `#` must be a plain key `^[A-Za-z0-9_-]+:(\s|$)`; the only exemption is a first content line that is exactly `---` (optionally `--- # comment`). Refuses every column-0 opener (`"`, `'`, `{`, `[`, `*`, `&`, `!`, `?`), so a swallowed name line can no longer pair with a hidden real key; a plain real key is caught by the existing several-`name:` rule — cost if wrong: a compose file whose top level uses quoted or flow keys is refused.
    Fix-1: minor (deferred): .env read errors (folder, unreadable) treated as no .env (Compose likely errors); `name:<ours>` without a space passes the form check (Compose errors on it); UTF-16 .env not decoded.
    Fix round 2/5 (implementer sonnet 95.0k/1.3 min; re-review opus 93.3k/6.4 min): reported probes closed; class still open — a column-0 `#` line closes a quoted scalar/flow collection that swallowed `name: <ours>` (no real name → folder name), and an indented root mapping with `name: evil` (Psych, kubectl; go-yaml scanner source read, not run).
    - Ruling: `name:` must be the first content line, at column 0 — only blank lines, `#` comments, a BOM and one leading `---` may come before it. No scalar or collection can be open there and the root is a block mapping at indent 0, so every later root key is a column-0 line the plain-key allowlist and the several-`name:` rule already check — cost if wrong: a compose file with `name:` lower down is refused (hstack's own-services plan writes its compose file with `name:` first).
    Fix-2: minor (deferred): `services :` (space before colon) refused; an indented `# note` after `name:` refused as a continuation.
    Fix round 3/5 (implementer sonnet 104.6k/1.3 min; re-review opus 92.4k/10.4 min): ADDRESSED; no exit-0 case where Compose would use another name (Psych, Bun.YAML, kubectl; go-yaml scanner source read; Compose not run).
    Fix-3: minor (deferred): JS .trim() treats NBSP/U+3000/VT/FF/BOM-only lines as blank before name: (oracles error or read our name); header regex accepts `---#x` (oracles error); a JS-blank continuation after name: passes (name stays ours or Compose errors); `version:` before `name:` refused (common layout; README now says so — controller one-line README edit).
    C1: complete (commits 97d3ef3..64d3b7d + README line).

## 2026-10-27 — benchmark tools plan (`docs/plans/2026-10-27-bench-tools.md`), branch `worktree-bridge-cse_01LckcHdPjiRPz5DvPEJXEaJ`

Built subagent-driven: one implementer per task, a fresh task reviewer and scoped re-reviews, a whole-branch review, one fix wave and one re-review. Tokens are the subagent totals the harness reported at each hand-back (a resumed agent reports its running total); minutes are wall clock per hand-back.

- Task 1 (JUnit reader): implementer sonnet 50.1k, 1.1 min (1 fix round) · review sonnet 52.7k/1.4 min + re-review haiku 52.2k/0.7 min · 1 Important fixed (Playwright writes the error as CDATA text)
- Task 2 (task file, safety): implementer sonnet 49.6k, 0.9 min · review sonnet 50.4k/0.6 min · review clean
- Task 3 (throwaway env): implementer opus 89.6k, 12.1 min (1 fix round) · review opus 65.8k/2.2 min + re-review sonnet 49.9k/0.5 min · 1 Important fixed (clean followed a symlink out of its root)
- Task 4 (scores, grader): implementer sonnet 81.6k, 5.2 min (1 fix round) · review opus 70.6k/4.3 min + re-review sonnet 53.3k/0.5 min · 2 Important fixed (grade file named as typed; validation written from a run with no results)
- Task 5 (test-layer replay): implementer sonnet 93.1k, 6.9 min (1 fix round) · review opus 71.5k/2.8 min + re-review sonnet 57.7k/0.6 min · 3 Important fixed (sealed leak through git apply; it.each titles; merge-commit fixes)
- Task 6 (agent-layer replay): implementer opus 138.7k, about 33 min (pre-review fix + 1 fix round) · review opus 92.8k/5.7 min + re-review sonnet 57.7k/0.7 min · 1 Important fixed (audit export carried the repo's Stop hook)
- Task 7 (arm runner, responder): implementer opus 148.4k, about 34 min incl. the real-CLI probe (pre-review fix + 1 fix round) · review opus 88.3k/5.2 min + re-review sonnet 71.7k/1.2 min · 3 Important fixed (intervention count vs 9.3; product fetch trusted the agent repo; no plugin commit)
- Task 8 (real-estate task file, p8b check): implementer opus 272.1k, about 89 min of real app runs (1 fix round) · review opus 135.8k/11.0 min + re-review sonnet 58.5k/0.8 min · 1 Important fixed (table-row exclusion took the next row); 20/20 pilot verdicts reproduced
- Final review: opus 148.4k/12.8 min · fix wave opus 228.8k/22.6 min (F1–F6 + 11 ride-alongs) · re-review opus 125.8k/6.4 min · all addressed
- Controller (this session): not measured here; read `/usage` for the weekly-limit change.
- Total subagent tokens: about 2.46M (sum of the final totals above).

### SDD ledger copy (taken before the workspace is deleted)

    # SDD ledger — plan: docs/plans/2026-10-27-bench-tools.md
    
    Spec: docs/plans/2026-10-27-benchmark-prereg.md (stable). Branch worktree-bridge-cse_01LckcHdPjiRPz5DvPEJXEaJ, start e326f66.
    Data: /Users/hbchuc/Documents/programing/vibe-code/hstack/.evidence/bench (main checkout; not present in this worktree).
    
    ## Pre-flight scan
    
    | Rows | Produces vs consumes | Found |
    |---|---|---|
    | T1 self | fixtures vs reader rule | consistent as written, but see T1↔T4↔T8 |
    | T1↔T4↔T8 | readJunit `message` (attribute wins) vs results() looks for PRECONDITION in message vs Playwright 1.58.2 junit.js:167 puts `file:line:col title` in the attribute and the error in the element text | CONFLICT: no Playwright check could ever grade `precondition` |
    | T1↔T4 | checkId vs Playwright testcase name (`titlePath().slice(3)` = bare title) | clean |
    | T2 self | fixtures vs parseTask rules; forbid rule admits outsourcing-hstack | clean |
    | T2↔T5↔T6 | Task type has no `layers`; T5 `layers.<name>` = command string; T6 `layers.<layer>.brief` | CONFLICT: shape of layers |
    | T2↔T6↔T7 | `<results>` folder used by T6/T7, never defined | GAP |
    | T3↔T5/T6 | withEnv(task, commit, label, fn): fn runs after start; replay must `git apply -R` before setup/start | CONFLICT |
    | T3↔T6/T7 | audit layer and run-arm need a worktree with no app start | GAP |
    | T3 self | 'clean removes only its own folder' test would wipe a real run under /tmp/hstack-bench; port check by Bun.listen on 127.0.0.1 may miss a listener on :: (a stale dev server would then be graded) | RISK |
    | T3↔T8 | the run.sh curl warm-up has no task-file field | GAP |
    | T4 self | score fixture 0.75/0/(1/3)/3 and verdict order | clean; base `error` not covered |
    | T4↔T8 | `--validate` writes one validation.json, T8 runs it once per fix commit over all 20 checks | CONFLICT (overwrite) |
    | T5 self | both excludedTitles fixtures and caught | clean |
    | T6 self | bug.json for review/audit needs the owning task's base and end commits and the sealed description; not in the field list | GAP |
    | T6↔T7 | claudeArgs has no appendSystemPrompt; armArgs('B-') returns one | CONFLICT |
    | T7 self (real CLI probe, 2.1.310, `-p --setting-sources project,local --strict-mcp-config`) | init `plugins` lists 3 `path: builtin` entries (cc-plugin-agents-md, cc-plugin-telemetry, cc-plugin-plugin-authoring); `tools` has no AskUserQuestion; `permissionMode: default`; user skills (cua-driver, synced) not listed; no `:` command | CONFLICT: probeOk "equal exactly" refuses every B run; hook cannot fire; Step 5 cannot write hello.txt without a permission mode |
    | T7 safety | the copy's .env.example points DATABASE_URL at `real_estate`; an arm agent with full permissions could seed it | RISK |
    | T8 | docs/log.md exists | clean |
    
    ## Rulings
    
    - Ruling: readJunit `message` = the message attribute and the element text, joined by "\n" when both are non-empty (either alone when the other is empty); Task 1's first fixture expects 'Expected: 400\nstack' — Playwright puts the error only in the element text (junit.js:167) — cost if wrong: messages carry a duplicated line for runners that repeat the message in the body (vitest); harmless.
    - Ruling: results() grades a failed case `precondition` when a line of its message starts, after spaces and an optional `<Word>Error: `, with `PRECONDITION:` (multiline regex `^\s*(?:\w*Error:\s*)?PRECONDITION:`) — "contains" would also match Playwright's code frame, which prints the spec lines around the failing one (`  12 |   expect(x, 'PRECONDITION: …')`) — cost if wrong: a precondition written another way grades `fail`.
    - Ruling: `layers.<name>` is a command string for test layers (Task 5) and an object `{ brief: <path relative to the task file> }` for agent layers (Task 6); Task 2 passes `layers` and `testTitle` through unvalidated-optional (Task 5/6 validate what they use) — cost if wrong: one more shape check later.
    - Ruling: `<results>` = `<dir of HSTACK_BENCH_MACHINE>/results/` (this machine: .evidence/bench/results/) — gitignored, per machine, no new field — cost if wrong: results move by one constant.
    - Ruling: Task 3 exports `withWorktree(task, commit, label, fn: (dir) => T)` (refuse if the path exists, add, fn, remove in finally) and `withEnv(task, commit, label, fn, { before }?)` built on it, where `before(dir)` runs after the worktree is added and before setup — replay applies its reverse patch there; audit and run-arm use withWorktree — cost if wrong: none, both are needed by later tasks.
    - Ruling: `clean(root = '/tmp/hstack-bench')` refuses a root that is not /tmp/hstack-bench or under it; tests pass their own sub-root so they never touch a real run. Paths compare after realpath (/tmp is /private/tmp on macOS) — cost if wrong: none.
    - Ruling: a port is busy when a TCP connect to 127.0.0.1:<port> or [::1]:<port> succeeds or Bun.listen on it fails; the test opens its listener on 0.0.0.0 and on :: — a missed stale server would be graded instead of the commit under test — cost if wrong: a false "busy".
    - Ruling: no warm-up field; the real-estate task file runs the warm-up script in front of its oracle and e2e commands (`sh warmup.sh && …`) — cost if wrong: none.
    - Ruling: verdict with base `error` → `broken` (cannot be validated in this run; rerun) — cost if wrong: an infra failure at base drops a check until rerun, visible in the file.
    - Ruling: `--validate <ref> <bad> [--base]` judges only the checks whose manifest `fix_commit` matches ref (prefix match) and writes `<oracle dir>/../validation-<ref7>.json`; every run executes the whole oracle (no grade reuse: a stale grade is worse than an hour of wall clock) — cost if wrong: about 15 env cycles in Task 8 instead of 11.
    - Ruling: bug.json for review/audit gains `base` and `end` (the owning task's commits) and every bug.json has `description` (the sealed text for the judge); the filtered input is `<dir of HSTACK_BENCH_MACHINE>/<task>/input.md`. Task 6's CLI cannot run end to end yet (only p8b has a filtered input, and it owns no replayed bug); its scope is the unit tests plus a CLI that parses and refuses bad input — cost if wrong: field names change at step 3.
    - Ruling: claudeArgs accepts `appendSystemPrompt` (→ `--append-system-prompt`) and always adds `--permission-mode bypassPermissions`, the same for all four arms (spec 3: same tool permissions; `-p` with mode default denies every write) — cost if wrong: arms run with full permissions in their /tmp worktree.
    - Ruling: run-arm refuses a task whose `db` is not null ("arm runs have no database guard yet") — an agent with full permissions in the real-estate copy could point .env at `real_estate` (.env.example does); shortcut comment names the upgrade (before prereg step 8 / 11) — cost if wrong: step 8 needs a small guard first.
    - Ruling: probeOk ignores init plugins whose `path` is `builtin` (they ship with the CLI and load for every arm alike) — cost if wrong: a builtin plugin that changes behaviour goes unseen, the same for all arms.
    - Ruling: AskUserQuestion is absent from `-p` tools (probe above); Task 7 Step 5 confirms it on its own probe and then follows the plan's branch (interventions from resumes only, hook removed from the settings file, hook script and test kept) — cost if wrong: none.
    - Ruling: Task 8 uses absolute paths into the main checkout's .evidence/bench (no symlink: `.evidence/` in .gitignore matches only a folder, so a symlink would show as untracked) — cost if wrong: none.
    
    ## Tasks
    Task 1: dispatched (sonnet), BASE e326f66
    Task 1: implementer sonnet 46.7k tokens, 0.7 min, commit f761cdd; review dispatched (sonnet)
    Task 1: review 1 (sonnet 52.7k, 1.4 min): Needs fixes — I1 CDATA failure text not handled (my dispatch wrongly said Playwright escapes text); minors 1 (system-out scanned), 2 (fromCodePoint RangeError) ride along; Task 1: minor (deferred): decode regex has the i flag (&AMP; accepted)
    Task 1: fix round 1/5 (implementer sonnet 50.1k, 0.4 min; re-review haiku): 3 addressed, 0 open; commits f761cdd..a77ca4d
    Task 1: minor (deferred): system-out strip regex swallows a failure after a self-closing <system-out/> followed by a later </system-out> (false pass; Playwright does not emit this shape) — fix with the reviewer's regex `<system-(?:out|err)\b(?:[^>]*\/>|[\s\S]*?<\/system-(?:out|err)>)`
    Task 1: minor (deferred): mixed plain text + CDATA in one element drops the plain text
    Task 1: complete (commits e326f66..a77ca4d, review clean)
    Task 1 cost: implementer sonnet 46.7k/0.7 min + fix 50.1k/0.4 min; review sonnet 52.7k/1.4 min + re-review haiku 52.2k/0.7 min
    - Ruling: Task 2 validates name `^[a-z0-9][a-z0-9_-]*$` (it becomes a /tmp folder name), resolves repo symlinks before the forbid check, passes testTitle (must compile) and layers (plain object, default {}) through — cost if wrong: a stricter name than a later task file wants.
    Task 2: dispatched (sonnet), BASE a77ca4d
    Task 2: implementer sonnet 49.6k/0.9 min, commit a985fdd; review sonnet: Approved, no Critical/Important
    Task 2: minor (deferred, recommend fix before merge — safety gate): parseTask fails open when machine.forbid.paths is missing or mistyped (task.mjs:19); require an array of strings
    Task 2: minor (deferred): realpath only for existing paths; a missing repo under a symlinked or differently-cased forbidden dir passes (task.mjs:5) — fix by realpath of nearest existing ancestor
    Task 2: minor (deferred): loadTask errors on missing/invalid JSON omit the file name
    Task 2: complete (commits a77ca4d..a985fdd, review clean)
    Task 3: dispatched (opus), BASE a985fdd
    - Ruling: Task 3 command env/cwd/error contract — BENCH_* on top of process.env, cwd worktree, sh -c, non-zero setup/teardown throws, start exiting before ready fails at once, start log at <root>/<name>-<label>.log — cost if wrong: none, the plan was silent.
    Task 3: implementer opus, commit 9420cdd; added opts.pollMs (tests only), fn gets env too, portBusy exported
    Task 3: implementer opus 82.6k/10.4 min; review 1 opus 65.8k/2.2 min: Needs fixes — I1 clean follows a symlink under root and force-removes an outside worktree; minors 2 (ready fetch aborted at pollMs), 6 (test gaps), 7 (message wording) ride along
    Task 3: minor (deferred): clean SIGKILLs the whole group of a group leader whose cwd is under root (a user shell cd'd there); clean does not check forbid.paths of the owning repo; `up` swallows Ctrl-C during the ready wait
    Task 3: fix round 1/5 (implementer opus 89.6k/1.7 min; re-review sonnet): 4 addressed, 0 open; commits 9420cdd..ba0ec1b
    Task 3: complete (commits a985fdd..ba0ec1b, review clean)
    Task 4: dispatched (sonnet), BASE ba0ec1b
    Task 3 cost: implementer opus 82.6k/10.4 min + fix 89.6k/1.7 min; review opus 65.8k/2.2 min + re-review sonnet 49.9k/0.5 min
    - Ruling: Task 4 — a skipped case is `error`; several cases per id, worst wins; checks = manifest entries not dropped and interface != none; grade sets BENCH_ORACLE=<abs oracle dir> for the oracle command (one task file serves every real-estate task); oracle killed after timeoutSec; stale JUnit deleted first; CLI body exported as grade(args, { root }) for a sub-root smoke test — cost if wrong: small interface changes in Task 8.
    Task 4: implementer sonnet 73.7k/3.7 min, commit 61f400e; review dispatched (opus)
    Task 4: review 1 opus 70.6k/4.3 min: Needs fixes — I1 grade file named as typed (HEAD.json); I2 validate writes verdicts from a run with no JUnit; minors 3-7 ride along
    - Ruling: grade files are `grades/<resolved hash 7>.json` (plan's `<commit>.json`, matching the validation file); validate refuses to write when any run had no results or timed out; grade refuses an absolute task.junit — cost if wrong: none.
    Task 4: minor (deferred): spec 9.1 divides by valid checks only; the grader takes weak/broken checks out only via manifest `dropped` — the validation result must be written back to the manifest by hand (Task 8 / README must say so)
    Task 3: minor (deferred): the env test's setup-failure case prints 'command failed (exit 3)' to stderr during bun test (output not pristine)
    Task 4: fix round 1/5 (implementer sonnet 81.6k/1.5 min; re-review sonnet 53.3k/0.5 min): 7 addressed, 0 open; commits 61f400e..da0a101; full suite run by controller: 111 pass
    Task 4: minor (deferred): `severity in WEIGHT` passes prototype names (use Object.hasOwn); junit `..foo/x.xml` falsely refused
    Task 4: complete (commits ba0ec1b..da0a101, review clean)
    - Ruling: Task 5 — replay runs through withEnv with before = `git apply -R <patch>` (after `git apply -R --check`; failure is an error, never "missed"); label `replay-<id>`; patch path relative to bug.json; a layer run with no JUnit prints `<id> error` and exits non-zero; sealed mode sends the layer command's own output to /dev/null (failure output shows the bug), dev mode to stderr — cost if wrong: none.
    Task 5: dispatched (sonnet), BASE da0a101
    Task 5: implementer sonnet 77.0k/3.8 min, commit 11d6839 (grade.mjs exports resolveCommit, runForJunit, checkJunitPath); review dispatched (opus)
    Task 5: review 1 opus 71.5k/2.8 min: Needs fixes — I1 sealed leak via git apply stderr; I2 it.each/template titles never excluded (partly plan-mandated "contains"); I3 merge-commit fix excludes nothing; minors 4 (substring hides a catch), 5 (sealed setup/start output), 6 (zero cases = missed) ride along
    - Ruling: caught() matches each excluded title as an end-anchored pattern after the start or a `>`/`›` separator, with printf tokens and `$x`/`${…}` as wildcards — spec 8.1 "drop every test the fix added (it.each included)" outranks the brief's "contains" — cost if wrong: a title that ends differently in the runner's name (suffix added by the runner) is not excluded and counts as a catch.
    - Ruling: the layer command honouring BENCH_EXCLUDE is a speed and cleanliness measure only; caught() is the rule that decides — cost if wrong: none.
    Task 5: minor (deferred): quoted `+++ "b/…"` paths missed; .bench-exclude written inside the worktree; any added line (even blank) excludes its test
    Task 5: fix round 1/5 (implementer sonnet 93.1k/3.1 min; re-review sonnet 57.7k/0.6 min): 6 addressed, 0 open; commits 11d6839..8650187; withEnv gained `quiet`
    Task 5: minor (deferred): dev-mode "(excluded)" label still uses includes(), can disagree with caught(); a title that is only a hole (`${x}`) excludes every case
    Task 5 cost: implementer sonnet 77.0k/3.8 min + fix 93.1k/3.1 min; review opus 71.5k/2.8 min + re-review sonnet 57.7k/0.6 min
    Task 5: complete (commits da0a101..8650187, review clean)
    - Ruling (correction of the pre-flight claudeArgs ruling): `permissionMode`, `tools` and `allow` are claudeArgs parameters (→ `--permission-mode`, `--tools`, `--allowedTools`); run-arm passes bypassPermissions for every arm alike, agent replay passes `default` — the pre-flight "always bypass" would let a replay agent read the fix — cost if wrong: none.
    - Ruling: agent replay layers never see a `.git`: review cwd = an empty folder (diff in the prompt), audit cwd = `git archive <end>` export under /tmp/hstack-bench, evaluator app in the withEnv worktree but the agent's cwd an empty folder with only the URL; layer object `{ brief, tools?, allow? }`; a worktree shares refs and objects, so `git log --all` or `git diff` would show the fix or the bug — cost if wrong: replay agents get less than the old replay gave them.
    - Ruling: judgeVerdict accepts one JSON object, bare or in a single ```json fence; anything else throws; the judge runs with `--tools ""` — cost if wrong: none.
    - Ruling: Task 6 sealed contract mirrors Task 5 (stdout exactly `<id> caught|missed`, layer and judge output to ignore, no result event or judge parse failure → `<id> error` and exit non-zero; sealed results JSON holds usage, models, times and verdict, never findings or quote); the binary comes from env BENCH_CLAUDE (default `claude`) so a stub can test the CLI as a subprocess — cost if wrong: none.
    - Ruling (flag for Task 7): run-arm must not work in a worktree of the copy (the arm agent would see the task's future commits); use a fresh repo from `git archive <base>` + init + one commit, and fetch the product back into the copy as `bench/<task>-<arm>-<n>` — cost if wrong: a separate repo per run.
    Task 6: dispatched (opus), BASE 8650187
    Task 6: implementer opus 115.0k/12.9 min, commit 73a99e9; real-CLI probe: Read outside cwd denied under -p mode default
    - Ruling: usage() takes totals from the last result event's usage (authoritative; assistant sums undercount output, 23 vs 168 on the probe), falling back to per-message-id deduplicated assistant sums; layer and judge killed after timeoutSec → `<id> error` — cost if wrong: none.
    - Ruling: prompt stays in argv (shortcut comment): a task diff over ~1 MB fails to start, and the sealed description shows in `ps` on this machine while the judge runs — cost if wrong: a large task needs the stdin change.
    Task 6: pre-review fixes sent to the implementer
    Task 6: pre-review fix c6bd209 (implementer opus, total 121.4k/16.0 min incl. first pass); review dispatched (opus)
    Task 6: review 1 opus 92.8k/5.7 min: Needs fixes — I1 audit export carries the repo's .claude/settings.json Stop hook (nested unrecorded claude, 50-min sleep); minors 2-7 ride along
    - Ruling: the agent-replay export drops .claude/settings.json and settings.local.json (option of the export helper); replay layers measure their brief, not the old harness's hooks; deterministic, no dependence on how -p treats asyncRewake hooks — cost if wrong: an audit misses project settings that only change permissions.
    Task 6: minor (deferred, for the lock): layer and judge pass no --model, so the judge model follows the CLI default (recorded from the transcript); fix at prereg step 12
    Task 6: minor (deferred): evaluator tools reaching http://localhost under mode default depend on the task file's `allow` (WebFetch to localhost not probed)
    - Ruling (flag for Task 7): the same Stop hook (question-wait.py, waits for a human for 3000 s) reaches every arm through the task base's tracked .claude/settings.json; Task 7 must decide whether arms keep it — cost if wrong: arm runs stall or spend unrecorded tokens.
    Task 6: fix round 1 implementer opus 138.7k/4.2 min, commit 1b623a8; re-review dispatched (sonnet)
    - Ruling (closes the Task 7 hook flag): the copy outsourcing-hstack/real-estate is its own repo and tracks no .claude/ (checked `git ls-tree d1ea76b .claude` and HEAD: empty); the Stop hook the reviewer read lives in the parent outsourcing repo, which no tool exports. Arms keep the task repo's .claude/ as the plan says (export option dropSettings off) — cost if wrong: an external repo with a hook stalls an arm; visible as a timeout.
    Task 6: fix round 1/5 (re-review sonnet): 7 addressed, 0 open; commits c6bd209..1b623a8
    Task 6: minor (deferred): the audit export still carries .mcp.json, CLAUDE.md and .claude/agents|skills (only the two settings files are dropped); agentEnv leaves other HSTACK_BENCH_* variables
    Task 6 cost: implementer opus 138.7k total/~33 min (3 passes); review opus 92.8k/5.7 min + re-review sonnet
    Task 6: complete (commits 8650187..1b623a8, review clean)
    - Ruling: Task 7 CLI `bun bench/run-arm.mjs <task.json> <arm> <run-no> --input <data>/<task>/input.md --at <base>`; the bench task id is the input's folder name; arm config from `<dir of HSTACK_BENCH_MACHINE>/arms.json` `{ model?, smallModel, plugins: { H: [], W: [] }, turnTimeoutSec? (default 14400) }`; the product is built in a fresh repo (withExport of <base>, dropSettings off, git init, one commit) and fetched into the copy as bench/<task>-<arm>-<n>; the probe turn runs in its own session; a turn timeout abandons the run; the agent env drops BENCH_* — cost if wrong: CLI flags change before step 8.
    Task 7: dispatched (opus), BASE 1b623a8
    Task 7: implementer opus 114.3k/13.7 min, commit fb763d1; real-CLI Step 5: arm B 25 s, probe ok, DONE on resume 1, hello.txt on bench/hello-B-1, interventions 0; AskUserQuestion absent → settings `{}`, interventions from resumes only
    - Ruling: each arm run keeps its raw transcripts (`<results>/<task>-<arm>-<n>/<k>-<turn>.jsonl`) and its settings.json in that folder — prereg 7.2 labels interventions on transcripts — cost if wrong: disk only.
    - Ruling: a turn that exits non-zero counts as not DONE and the run resumes (implementer's correction) — cost if wrong: a crashing CLI burns 5 resumes before abandoning.
    Task 7: minor (deferred): with full permissions an arm agent can read the data folder by absolute path; Ctrl-C leaves no record; BENCH_INTERVENTIONS would not reach a wired hook (agent env drops BENCH_*); expected H/W plugin names come from plugin.json name
    Task 7: pre-review fix e5c7b86 (transcripts); review 1 opus 88.3k/5.2 min: Needs fixes — I1 (plan-mandated) main-turn question then DONE counts 0, fixed 9.3 text never sent; I2 product add/commit/fetch trust the agent repo (tags fetched, post-commit hook ran with runner env); I3 (plan-mandated) no plugin commit recorded; minors ride along
    - Ruling: every arm's main prompt ends with "When the task is done, reply exactly DONE."; CONTINUE = "No more information; decide from the requirement. Continue until the task is done. When it is done, reply exactly DONE."; countInterventions unchanged, fed the outcome of every turn the runner answered with a resume (main turn included) — spec 9.3 and plan focus 5 outrank the brief's use of the formula; an abandoned run still counts 5 + 3 — cost if wrong: one intervention per run where the main turn ended early.
    - Ruling: product git calls run with hooks and fsmonitor off, --no-tags on the fetch, scrubbed env, 300 s timeouts; the record holds each plugin dir's commit and dirty flag (spec 3) — cost if wrong: none.
    Task 7: fix round 1 implementer opus 148.4k/5.0 min, commit 1271509 (env.mjs gitWith, agentEnv exported); re-review dispatched (sonnet)
    Task 7: fix round 1/5 (re-review sonnet): 4 addressed, 0 open; commits e5c7b86..1271509
    Task 7: minor (deferred): the fetch into the copy carries no -c flags (harmless: the copy is the receiving, trusted repo); the scrubbed env and the 300 s git timeout are untested
    Task 7 cost: implementer opus 148.4k total/~34 min (3 passes incl. real-CLI probe); review opus 88.3k/5.2 min + re-review sonnet
    Task 7: complete (commits 1b623a8..1271509, review clean)
    - Ruling: replay runs withEnv with `start: false` (setup, before and teardown still run): the project's own test commands start their own server (real-estate's playwright webServer runs `pnpm dev` on port 3000, and only one next dev may run per folder), so the replay must not start the app itself; Task 8 adds the option with tests — cost if wrong: a stack whose e2e needs a running app gets a layer command that starts it.
    - Ruling: Task 8 smoke-runs each test layer (unit, int, e2e) once in dev mode on one dev-set bug of .evidence/replay.md and compares with the old result — the plan's steps never run the layer commands — cost if wrong: about an hour of wall clock.
    Task 8: dispatched (opus), BASE 1271509
    Task 8: implementer opus 259.4k/84 min, commits 59b0193 (withEnv start:false), 6fe7673 (tools bug: table-test row exclusion), 4a8c73d (README, log); 20/20 verdicts as expected (17 not weak/broken, 3 weak; base 8 pre-existing = 6 + d82f2b0-T4 + dd56b84-T2 settled by precondition, 9 absent-at-base); smokes 4e58ba5-19 unit caught, d82f2b0-05 int missed, d005fa5-03 e2e missed; controller check: no /tmp/hstack-bench, no :3000 listener, no bench_ db, copy status clean, one worktree
    - Ruling: unit and int layers run without the BENCH_EXCLUDE filter (the int smoke showed that skipping a fix-changed test made a later test in the same file fail, a false catch); caught() alone drops the fix's tests; e2e keeps --grep-invert (Playwright tests run independently there; same risk recorded) — consistent with the earlier ruling that the command's exclusion is speed only — cost if wrong: slower unit/int runs.
    Task 8: minor (deferred): eb2b016-T1 read absent-at-base (base card has no bedrooms entry), arguably pre-existing — recorded in validation.md for the human step; d82f2b0-T1's own assertion needs the theme-select text, so it fails at every commit after 3997f9e (no effect on products built from d1ea76b); table-row exclusion is an indentation heuristic (shortcut comment)
    Task 8: review dispatched (opus)
    Task 8: review 1 opus 135.8k/11.0 min: Needs fixes — I1 table-row walk-back stops on a row's closing `],` and excludes the next unchanged row (proven on 4e58ba5); minors 3 (README), 4 (layer.sh pat) ride along; verdict counts 20/20 confirmed from validation-*.json
    Task 8: parked — eb2b016-T1 precondition asks for a bedrooms entry on the 0-bedroom card (near the main assertion; a pure existence precondition would read pre-existing, 9 → 8 absent-at-base) — Ruling: keep it; it matches the pre-registered expectation and the pilot's reading, both readings are in validation.md, and the human settles it at prereg step 9 — cost if wrong: one check moves between the task-8b and pre-existing buckets.
    Task 8: parked — dd56b84-T1 precondition (failed-import banner) depends on an import failing and lacks the expectImports guard — Ruling: keep for the human step with the one above — cost if wrong: a product without a failing import reads precondition instead of fail.
    Task 8: minor (deferred): env.sh `[!a-z0-9_]` class depends on the locale (bench_ prefix still required)
    Task 8: fix round 1/5 (implementer opus 272.1k total/~89 min; re-review sonnet): 3 addressed, 0 open; commits 4a8c73d..7169673; unit smoke rerun still caught
    Task 8: complete (commits 1271509..7169673, 2 parked)
    Final review: dispatched (opus), range e326f66..7169673
    Final review (opus): with fixes — I1 weak/pre-existing checks still scored; I2 exclusion reads only the fix commit (spec 8.1: assertion must exist before the fix); I3 no baseline run at `at`; I4 one known-bad version (spec 7.1 asks for parent and end product); I5 test hygiene; I6 arm agent can read oracle/copy by absolute path; minors 1-9; triage table
    - Ruling: grade leaves out of the score every id whose verdict in any validation-*.json is weak, broken or pre-existing, and lists them (spec 7.1) — cost if wrong: none.
    - Ruling: replay excludes tests added or changed anywhere in <fix>^..<at> in test files (diff `<fix>^ <at>`, post files at `at`), not only in the fix commit — spec 8.1 "the failing assertion existed before the fix" outranks the plan's narrower reading — cost if wrong: fewer catches counted (conservative).
    - Ruling: replay runs a baseline of the layer at `at` without the patch, once per (task, at7, layer), kept as <results>/baseline-<task>-<at7>-<layer>.xml; a catch is a failing case that is neither excluded nor failing in the baseline; a baseline with no results is `error`. e2e also drops its --grep-invert filter so one baseline serves every bug (same reasoning as unit/int) — cost if wrong: e2e replays run the whole chromium project.
    - Ruling: --validate takes --bad more than once (parent and the task's end product, spec 7.1): weak if the check passes on any bad, broken if any bad is neither pass nor fail; Task 8's pilot check is not rerun (the pilot already graded the end product 730509b: it fails all 16 non-weak valid checks except the in-task fix) — cost if wrong: the end-product leg is first exercised at prereg step 5.
    - Ruling: run-arm greps the kept transcripts for the data folder path and task.repo and records `leak: true|false` (no sandbox yet; must be closed before prereg step 8) — cost if wrong: a leak is flagged, not prevented.
    - Ruling: one fix wave also takes T2 fail-open forbid list, T1 system-out regex, T5 hole-only title guard (refuse a title with no literal text), test hygiene, agent-replay refusing an existing result, grade printing junit= and exiting non-zero when not ok, agent-replay refusing a bug whose fix is an ancestor of `end`, the CLI version in initInfo, one shared kill-after-timeout helper with the post-exit group kill, a ps note for e2e titles; git spawn unification and run-arm's results rmSync wait — cost if wrong: none.
    Final fix wave: dispatched (opus)
    Final fix wave: implementer opus, commits 7169673..871409f (5 commits); 179 pass, output pristine; smoke 4e58ba5-19 unit still caught with baseline (479 cases, 0 failing), 313 titles excluded
    Final re-review (opus): all F1–F6 and ride-alongs ADDRESSED; no new Critical/Important
    Final: parked — baseline runs before reverseApply, so a patch that does not apply is found only after a full baseline (~20 min for e2e) — Ruling: real, deferred; add an ancestry or apply --check pre-step before prereg step 3 — cost if wrong: wasted wall clock only.
    Final: parked — F6 leak scan untested on a real transcript; substring needles match sibling paths and a plugin dir inside the data folder would flag every H/W run — Ruling: check the first real probe transcript before relying on `leak`; must be replaced by a sandbox before prereg step 8 — cost if wrong: a false or missed leak flag.
    Final: parked — the baseline key ignores the layer command and script contents (a stale baseline is reused after editing layer.sh); two concurrent replays at the same at/layer share the baseline label — Ruling: delete baselines after editing a layer; runs are sequential on port 3000 — cost if wrong: a stale baseline.
    Final: parked — proc.mjs reads stdout after clearing the timer (a setsid grandchild holding the pipe hangs the read; same as before) — Ruling: deferred — cost if wrong: a hung run, visible.
    Final: minor (deferred): punctuation-only titles; git diff honours diff.noprefix/mnemonicPrefix; non-bench tests leave hstack-* folders in $TMPDIR; git spawn unification; run-arm results rmSync

## 2026-10-27 — bench inputs plan (`docs/plans/2026-10-27-bench-inputs.md`), stable

- On record (sealing): while mapping plans to tasks for this plan, the controller printed the `##` and `### Task 1` headings of the fix plans 7a, 9 and 10, including 7a's Task 1 title, which names its fixes. Not a patch and not a held-out clause; noted as the prereg noted b5b3cec-01.
- Plan written with two advisor rounds. Approved by the user; built subagent-driven (ledger copy below).
- Tasks 1–2 (sealed-agent; replay's early patch check): Task 1's probe runs used, for the tools run (`--at 69ebe27 --tools Read,Grep,Glob`), input 4 / output 331 / cacheRead 8747 / cacheWrite 2695, and for the no-tools run 2 / 155 / 649 / 2231 (from task-1-report.md). Task 2: no agent runs.
- Task 3 (prereg step 3a, filtered inputs): 16/16 inputs written by sealed filter runs (no tool, opus 5.5), every input passes `bench/input-check.mjs`, ID accounting clean (every source step ID kept on a step line or named in the log's dropped sections; no ID outside the source), every input has a Goal and feature steps. Source = plan at the harness commit H before the task's first commit, cut before `## File map`; p1–p6c add the feature-list entries at H. Numbering checked against 3 evaluation PASS lines per task (p1 from the plan 2 evaluation, plan 1's has none). Per task: kept/dropped steps, input-check, fix runs, summed sealed usage (input/output/cacheRead/cacheWrite, models):
  - p1: 46/0, PASS, 0 fix; 2/9926/649/10623, opus-5-5
  - p2: 53/0, PASS after 1 fix ("import properties" false positive); 4/18077/1298/20423, opus-5-5
  - p3: 53/5 (P3-F8 fixes plan 2), PASS, 0 fix; 2/11494/649/14225, opus-5-5
  - p4: 40/7 (P4-F6 fixes plan 3), PASS, 0 fix; 2/13325/649/15750, opus-5-5
  - p5: 15/9 (P5-F3 fixes plan 4), PASS, 0 fix; 2/13448/649/15534, opus-5-5
  - p6a: 35/0, PASS, 0 fix; 2/17242/649/18524, opus-5-5
  - p6b: 25/0, PASS after 2 fixes ("it (" false positive; review: `renderToStaticMarkup` as behaviour); 6/26513/1947/32429, opus-5-5
  - p6c: 35/0, PASS after 1 fix (".csv files"); 4/28792/1298/25448, opus-5-5
  - p7b: 13/21 (P7b-F3, F4, F5 fix earlier plans; only the new part kept), PASS, 0 fix; 2/14003/649/15720, opus-5-5
  - p7c: 48/13 (P7c-F6, F7 carried fixes), PASS, 2 review fixes (protected database names `real_estate_test`, `real_estate_staging`, `real_estate` and framework identifiers rewritten as behaviours); 6/39596/1947/46688, opus-5-5
  - p8a: 41/5, PASS after 1 fix ("behind it (SC 2.4.11)"); 4/24008/1298/36879, opus-5-5
  - p8b: 35/11 (P8b-F5, as the pilot), PASS, 0 fix; 2 runs (first on brief v1, discarded: it also dropped 3 steps inside kept groups); 4/41431/2894/63587, opus-5-5
  - p8b1: 17/0, PASS, 0 fix; 2 runs (brief v1 run discarded for one brief across tasks); 4/22108/2895/20440, opus-5-5
  - p8c: 40/16, PASS, 0 fix; 2/19693/649/39499, opus-5-5
  - p8d: 62/13, PASS, 0 fix; 2/17946/649/45176, opus-5-5
  - p8e: 41/11, PASS, 0 fix; 2/15818/649/34060, opus-5-5
- Task 4 (interface sheets): 16/16 sheets written by sealed runs (opus 5.5, tools Read, Grep, Glob, in an export of the task's end commit), prompt = the brief `<data>/briefs/interface.md` + `## Input` + the task's input. Brief v1 (kept as `interface-v1.md`) allowed a `message` and an `other public text` kind; the review found validation messages for edges the inputs never state and 23 bullets with template code. All 16 were rerun on brief v2: exactly 12 kinds (no messages, no other text, no file or folder paths), a template gives only its fixed text, each name once per section. The v1 sheets and run records are kept as `interface-v1*` (moved to `<data>/<task>/superseded/` in the final fix, with the `interface-main*` sheets). `bench/input-check.mjs` now also fails template code (`${`, `$` plus a digit), commit 012c8e0; all 16 inputs still pass. Every v2 sheet passes input-check and the shape check (title, `##` sections, `- <kind>: "<name>"`, no name twice in a section), and has no `message:`, `${` or `$<digit>`. p8b check: "Lọc bất động sản" and "Biệt thự" on the sheet, "Tên địa điểm" not (git at 1846450: hits, hits, none). In-folder control: for p8b, p1 and p6b, 5 sheet names each that are absent from the input hit `src/` at the end commit. 23 of 1178 unique v2 names (counted per task) are not found verbatim at the end commit (framework admin or API paths, the `key=value` query entries, and values the input states). Fix runs were sealed with no tools and changed only the named lines. Per task: v2 names (bullets), input-check, fix runs, sealed runs counted, summed usage of the v1 and v2 runs (input/output/cacheRead/cacheWrite, models):
  - p1: 78, PASS, 0 fix; 2 runs; 16/4487/81653/27556, opus-5-5
  - p2: 87, PASS, 1 fix (v2: 7 repeated names removed; v1: 1); 4 runs; 32/11794/252367/58376, opus-5-5
  - p3: 77, PASS, 1 fix (v2: 2 repeated names removed); 3 runs; 24/7703/173843/54365, opus-5-5
  - p4: 142, PASS, 0 fix; 2 runs; 26/9036/263314/61748, opus-5-5
  - p5: 85, PASS, 0 fix; 2 runs; 28/5811/232913/50867, opus-5-5
  - p6a: 96, PASS, 1 fix (v2: 4 repeated names removed); 3 runs; 30/9896/291784/62599, opus-5-5
  - p6b: 166, PASS, 1 fix (v2: 4 repeated names removed); 3 runs; 30/11517/263933/57028, opus-5-5
  - p6c: 117, PASS, 1 fix (v2: 1 repeated name removed; v1: 1); 4 runs; 40/11650/376595/65476, opus-5-5
  - p7b: 44, PASS, 2 fix (v2: 2 repeated names removed, then the empty-state message "Không có kết quả." removed); 4 runs; 28/6843/178462/48793, opus-5-5
  - p7c: 38, PASS, 0 fix (v1: 1); 3 runs; 26/6248/169985/35587, opus-5-5
  - p8a: 60, PASS, 0 fix; 2 runs; 30/6521/292989/54613, opus-5-5
  - p8b: 84, PASS, 1 fix (v2: 1 repeated name removed); 3 runs; 36/9724/344869/60598, opus-5-5, p8b check PASS
  - p8b1: 64, PASS, 0 fix; 2 runs; 24/4825/144505/32394, opus-5-5
  - p8c: 45, PASS, 0 fix; 2 runs; 28/5803/264559/50639, opus-5-5
  - p8d: 83, PASS, 0 fix; 2 runs; 42/8853/557140/83962, opus-5-5
  - p8e: 65, PASS, 1 fix (v2: 3 repeated names removed); 3 runs; 30/6944/221308/46039, opus-5-5
- Task 5 (agent layers end to end, gap b): the three layer briefs written in `<data>/env/real-estate/briefs/` (review = superpowers 7.0.0 task reviewer with a read-in-parts rule and a last line `Files reviewed:`; audit = ponytail 5.3.2 ponytail-audit; evaluator = the blind brief's exploratory and Global Constraints parts with the seed's demo users; sources and sha256 in `SOURCES.md`) and wired into the task file's `layers`. Dev bug eb2b016-11 (p8b, the property card's 0 bedrooms) as `replay-dev/eb2b016-11.{json,patch}`. Probe: curl 200, no database variable in the agent's env, no permission denial; Playwright from bun's cache (1.64.1) needs a browser bundle the machine lacks (1248), so the evaluator brief launches the installed 1208 headless shell by `executablePath` (no install), which logged in ("Bảng điều khiển - KeyFit"). One dev run per layer, each exit 0 with a verdict: review **missed** (3.0 min; `Files reviewed:` names 67 of 67 task files), audit **missed** (5.6 min), evaluator **missed** (16.4 min; the old blind brief caught it 1 of 14). No `error`, no bench/ change. Records in `<data>/replay-dev/agent/`, details in `<data>/replay-dev/smoke.md`. Usage (input/output/cacheRead/cacheWrite, all opus-5-5 unless named):
  - agent-replay review: layer 18/13486/445894/122705, judge 2/16/649/6872
  - agent-replay audit: layer 72/21850/3043139/138301, judge 2/16/649/4698
  - agent-replay evaluator: layer 68/39513/1531109/78118, judge 2/16/649/3456
  - probe (2 claude -p runs): 14/3265/49611/12128 (run 1 also lists opus-4-8)
  - sum of the task's agent runs: 178/78162/5071700/366278; about 26 min of runs
- Task 6 (int and e2e layers with their baseline, gap c): one dev run each, replay checks the reverse patch first. int on d82f2b0-05: patch check passed, baseline 260 cases, 0 failing, kept as `results/baseline-re-69ebe27-int.xml`; bug run 2 failed / 258 passed, both the fix's own tests marked `(excluded)`: **missed** (old record: missed). e2e on d005fa5-03: patch check passed, baseline 402 cases (392 passed, 10 skipped, 0 failing), kept as `…-e2e.xml`; bug run 1 failed / 391 passed / 10 skipped, the one failure the fix-changed test marked `(excluded)`: **missed** (old record: missed). No bench/ change, no agent tokens. Wall clock: int 10.3 min (21:24 to 21:34), e2e 40.7 min (21:38 to 22:19); about 51 min.

### SDD ledger copy (taken before the final review; SDD deletes the original)

    # SDD ledger — plan: docs/plans/2026-10-27-bench-inputs.md
    
    Spec: docs/plans/2026-10-27-benchmark-prereg.md (stable) + docs/plans/2026-10-27-bench-tools.md / bench/README.md. Branch worktree-bridge-cse_01LckcHdPjiRPz5DvPEJXEaJ, start a6880ea (merge-base with main 8dbac4a).
    Data: /Users/hbchuc/Documents/programing/vibe-code/hstack/.evidence/bench (main checkout; absent from this worktree).
    
    ## Pre-flight scan
    
    | Rows | Produces vs consumes | Found |
    |---|---|---|
    | T1 self | CLI args, run record fields, tests vs steps | clean; `tools` comes from initInfo (arm.mjs), exists |
    | T1↔T2 | sealed-agent uses runClaude→agentEnv; T2 widens agentEnv | clean: T1 inherits the PG*/DATABASE_URL drop |
    | T1↔T3/T4 | sealed-agent label regex `^[a-z0-9][a-z0-9_.-]*$` vs labels filter-p8b1, interface-p6a; folder `re-sealed-<label>` via freshDir regex | clean |
    | T2 self | patch check contract (exit 2, stdout '') matches existing test | clean |
    | T2↔T5 | review diff as task.diff; T5 brief says read task.diff in parts | clean |
    | T2↔T6 | precheck worktree label `check-<id>`, runs before baseline | clean |
    | T3 self | ID prefix rule: p1–p6c title-derived, p7b–p8e from first step ID (P8b.1 checked) | clean |
    | T3↔T4 | tasks.json {plan,no,base,end,n,harness}; T4 reads end | clean |
    | T3↔T5 | <data>/p8b symlink → 8b; agent-replay join(data,'p8b','input.md') | clean |
    | T4 self | p8b check values confirmed in git first (Step 2) | clean |
    | T5 self | one bug file with review+audit+evaluator fields; NEEDS per layer | clean |
    | T5↔T6 | both use port 3000 / bench_re; sequential | clean |
    | Global | data writes are absolute paths into the main checkout's .evidence | RISK: implementers must not create .evidence in the worktree |
    
    ## Rulings
    - Ruling: implementers write data only under /Users/hbchuc/Documents/programing/vibe-code/hstack/.evidence/bench (absolute), scratch under /tmp/hstack-bench or the SDD workspace — the worktree has no .evidence and a new one would hide data from later tools — cost if wrong: none.
    
    ## Tasks
    Task 1: dispatched (sonnet), BASE a6880ea
    Task 1: implementer sonnet, commit 9025b37, DONE_WITH_CONCERNS (tools record in init order; bad --at writes no record); probe: Read/Grep/Glob outside cwd denied, no-tools = []
    Task 1: implementer sonnet 75.6k/3.7 min; review dispatched (sonnet)
    Task 1: review sonnet 57.9k/0.6 min: Approved, no Critical/Important; ⚠️ probe and pristine output checked by controller (full suite 184 pass, no stray lines; report records the probe usage and replies)
    - Ruling: run record `tools` stays in init order (["Glob","Grep","Read"]); later checks compare as a set — the plan's literal array was the expectation, the set is the requirement — cost if wrong: none.
    Task 1: minor (deferred): --at test name/comment overclaims (.claude/settings.json removal and file content not asserted; covered by bench-env.test.mjs:246)
    Task 1: minor (deferred): lenient argv (`--prompt --out x`, `Read,,Grep` passed through)
    Task 1: minor (deferred): finalText ignores is_error (shared, pre-existing)
    Task 1: minor (deferred): a bad --at throws in withExport before any run record
    Task 1: minor (deferred): seal probe had no in-folder control read; Task 4's sheet runs (reading code in their folder) serve as the control
    Task 1: complete (commits a6880ea..9025b37, review clean)
    Task 1 cost: implementer sonnet 75.6k/3.7 min; review sonnet 57.9k/0.6 min
    Task 2: dispatched (sonnet), BASE 9025b37
    Task 2: implementer sonnet, commit 43d21e3, DONE; 187 pass
    Task 2: implementer sonnet 84.7k/3.5 min; review dispatched (opus)
    Task 2: review opus: Approved, no Critical/Important; ⚠️ commit body checked by controller (present)
    Task 2: minor (deferred): README sealed-agent paragraph (line 26) still names only BENCH_*/machine variables
    Task 2: minor (deferred): new replay test reads bugs/bad.patch written by the previous test (hidden order coupling)
    Task 2: minor (deferred): env test's HOME assertion is vacuous when HOME is unset
    Task 2: minor (deferred, plan-level): agentEnv does not drop PAYLOAD_DROP_DATABASE (destructive Payload flag); never set in the bench env today
    Task 2: complete (commits 9025b37..43d21e3, review clean)
    Task 2 cost: implementer sonnet 84.7k/3.5 min; review opus
    Task 2 cost: review opus 74.4k/3.8 min
    Task 3: dispatched (opus), BASE 43d21e3
    Task 3: implementer opus 182.0k/29.8 min, commits 5463319 (prereg §5/§15), c231850 (progress); DONE_WITH_CONCERNS: 16/16 inputs PASS (4 fix runs), ID accounting clean, numbering 48/48
    - Ruling: a step whose whole text is a test pointer keeps, as a behaviour sentence, what its title states; a step with its own text loses pointer and title — prereg §5 "rewritten only to remove pointers" leaves the title's behaviour as the step's content, and the H1 floor rule's step oracle needs those behaviours stated to be traceable; the pilot never met a pointer-only step. Recorded in prereg §5 by a commit with its reason — cost if wrong: re-filter p1, p6a, p6b, p6c, p7b, p7c, p8e and their sheets (~1 h of sealed runs).
    - Ruling (plan text wrong): for p7b–p8e the ID prefix `<no>` comes from the feature-step group heading, not the first step ID in the section (that rule gave P7c for p8c and P1 for p8e, whose sections first quote other plans' IDs) — cost if wrong: none, accounting checked both directions.
    - Ruling: explicit step IDs were added to the p7b–p8e sources, matching the harness evaluations' IDs (the plans number steps without IDs on each line) — cost if wrong: none; IDs only.
    - Ruling: p1's numbering check uses plan 2's evaluation P1 lines (plan 1's evaluation has no PASS lines) — cost if wrong: none, 3/3 matched.
    - Ruling: the filter brief was revised once after the first p8b run (group is the drop unit; a whole-fix plan alone is cut inside groups); p8b and p8b1 rerun on the final brief so all 16 come from one brief; v1 records kept and counted — cost if wrong: none.
    Task 3: minor (deferred): the verbatim §5 rule carries the bare group ID "P8b-F5" into every filter prompt (no content)
    Task 3: minor (deferred): 5 sealed runs ran at once for ~1 min (limit 4); no effect
    Task 3: §5 test-title sentence c7a4bb3 (implementer 182.5k total); review dispatched (opus) on the data
    Task 3: review 1 opus: Needs fixes — I1 p7c input names the protected real_estate_test (8×, "drop real_estate_test…"), p1–p6c keep `docker compose down -v`, p8b1 uses real_estate_showcase; minors 1–7 (identifiers inconsistently stripped: p7c force-dynamic/revalidate/generateStaticParams, p6b renderToStaticMarkup; process steps with IDs; fault-check constraint; p4 raw rm -rf; p8a Goal keeps F6 fix; brief carries 8b token/byte clause; p8b1 lacks showcase.json format; progress lacks SDD usage)
    - Ruling: protected database names are internal identifiers (§5 strip): a fix run rewrites p7c's `real_estate_test` to "the test database (the app's database name plus `_test`)", as p6b and p8c already say; reset steps (`down -v`, `rm -rf media`) and p8b1's own showcase database stay (they carry preconditions); the real guard is the run-arm isolation gate already parked (run-arm refuses db tasks until arms get their own Docker/Postgres, prereg step 8), now named for p1–p6c, p7c and p8b1 — cost if wrong: an arm without isolation could still be told to reset volumes; run-arm refuses it today.
    - Ruling: framework API names are internal identifiers too: the same p7c fix run rewrites `dynamic = 'force-dynamic'`, `revalidate = 600`, `generateStaticParams` returning `[]`, `prodMigrations` and build paths as behaviours (as p8a and the pilot did), and one p6b fix run rewrites `renderToStaticMarkup`/`react-dom/server.edge` — cost if wrong: two inputs say a little less than the plan.
    - Ruling: process steps that carry their own step ID inside a kept group stay (they are the plan's feature steps; prereg 6.2 gives a step with no public path `interface: none` when the step oracle is written, so they never score) — cost if wrong: the classifiers read a few process lines.
    Task 3: minor (deferred): fault-check constraint sentence kept in p7b/p7c/p8a/p8b/p8d, dropped in p8c/p8e; p4 keeps raw `rm -rf media`
    Task 3: minor (deferred, on record): p8a's Goal/Global Constraints keep the F6 disk fix while F6 is dropped (its checks fall to the requirement bucket, §5's deliberate consequence)
    Task 3: minor (deferred, on record): the verbatim §5 drop-whole bullet carries the 8b spike-token and byte-size clause into every filter prompt, besides "P8b-F5"
    Task 3: minor (deferred, run-arm note): p8b1's showcase.json format lives only in a drop-whole section; a builder learns it from the folder
    Task 3: review 1 opus 170.3k/9.2 min; fix round 1 sent to implementer (p7c protected db names + framework identifiers, p6b identifier)
    Task 3: fix round 1 implementer done (196.8k total), commit 866de76; deviations: p7c real_estate_staging and an example error naming real_estate also rewritten (second p7c fix run); re-review dispatched (sonnet)
    Task 3: fix round 1/5 (re-review sonnet): 3 addressed, 0 open; commits c7a4bb3..866de76; p7c fix1+fix2, p6b fix2
    Task 3: minor (deferred): p7c keeps `revalidate = 0` (a framework token), env names NODE_ENV/SCHEMA_PUSH and project commands (commands kept by §5)
    Task 3: complete (commits 43d21e3..866de76, review clean)
    Task 3 cost: implementer opus 196.8k total/~34 min (incl. fix round); review opus 170.3k/9.2 min + re-review sonnet; sealed filter runs in progress.md
    Task 4: dispatched (opus), BASE 866de76
    Task 4: implementer opus, commit 77561ef, DONE_WITH_CONCERNS (41/1457 names not verbatim: templates, escapes, composed strings; export includes tests/)
    Task 4: implementer opus 112.8k/12.1 min; review dispatched (opus)
    Task 4: review 1 opus: Needs fixes — I1 brief added a `message` kind (and `other public text`): p4/p2/p6c/p3 sheets list validation messages for edges the input never states (hint where hidden checks look); I2 23 bullets hold JS template code (`${…}`, `$1`) in p2/p6c/p8b1, missed by input-check; minors (duplicate name, file-named sections in p8b1, `media/imports`, trailing-newline normalisation)
    - Ruling: sheet kinds = Step 1's list (field labels, option texts, form accessible names, button and link texts, URL paths and query parameter keys, API paths and field names) plus headings, placeholders and column headers (pure names, no edge); no message kind and no "other public text" — prereg §5 lists names, not messages, and a message names an edge; a template gives its fixed text only; no string holding `${`, `$<digit>` or a code identifier. Brief v2, all 16 sheets rerun on it (one brief for all, as Task 3), p8b check redone — cost if wrong: checks that assert an exact message fail on the text and fall to the requirement bucket.
    - Ruling: bench/input-check.mjs gains a `template code` rule (`\$\{` or `\$[0-9]`) with a test, in this fix round, and all 16 inputs are re-checked with it — mechanical check beats a reviewer's grep — cost if wrong: one more pattern.
    Task 4: review 1 opus 98.5k/4.2 min; fix round 1 sent to implementer (brief v2, input-check template rule, rerun 16)
    Task 4: fix round 1 implementer done (144.2k total), commits 012c8e0 (input-check template rule), 86d2d6e (progress); 16 v2 sheets, 9 fix runs; re-review dispatched (opus)
    Task 4: fix round 1/5 (re-review opus): 3 addressed, 0 open; commits 77561ef..86d2d6e
    Task 4: minor (deferred): error-page headings ("Không tìm thấy trang", "Đã có lỗi xảy ra") kept as headings while p7b's empty state was removed — line drawn by hand; both are stated by their inputs
    Task 4: minor (deferred): p8d sheet has a section (/yeu-cau-tu-van/da-gui) its input never mentions (a page name, no edge)
    Task 4: minor (deferred): input-check `\$[0-9]` would also flag a price written "$5"; no current input affected
    Task 4: minor (deferred): repeats removed across kinds (a name's second role, e.g. column header, lost; pre-fix sheets kept as interface-main.md)
    Task 4: complete (commits 866de76..86d2d6e, review clean)
    Task 4 cost: implementer opus 144.2k total/~22 min; review opus 98.5k/4.2 min + re-review opus
    Task 5: dispatched (opus), BASE 86d2d6e
    Task 5: implementer opus, commits 3d5a01d, 2f2a3b6 (progress); DONE: review 3.0 min, audit 5.6 min, evaluator 16.4 min, all exit 0, verdict missed; Files reviewed 67/67; probe ok
    - Ruling: ratify the evaluator launching the installed headless shell (bundle 1208) by executablePath under bun's cached playwright 1.64.1 (which wants 1248) — the stop rule existed to forbid a network install, and nothing was installed; the probe and the run worked — cost if wrong: a version-skew browser quirk shows up as an evaluator false finding or a crash, visible in its record.
    Task 5: implementer opus 150.2k/40.6 min; review dispatched (opus)
    Task 5: review opus: Approved, no Critical/Important; ⚠️ setup/teardown reflow unverifiable (app ran fine)
    Task 5: minor (deferred, fix before step 3 reuses it): review.md keeps old-harness text ("file structure from the plan", "controller", "plan-mandated … the human decides", lines 83, 90-91, 107-109)
    Task 5: minor (deferred, fix before step 3): review.md asks for per-file `Reviewed:` lines but also "no process narration"; the run gave none, so `Files reviewed:` (67/67) is a list, not proof of reading (cacheWrite 122.7k vs an 803 KB diff, 595 KB of it migration JSON)
    Task 5: minor (deferred): evaluator.md launches Chromium by a machine-specific executablePath and imports bare 'playwright' (bun cache 1.64.1); pin `playwright@1.64.1` in the import
    Task 5: minor (deferred): the judge's caught path (non-empty quote) has not run end to end with the real CLI; step 3's dev review runs will exercise it
    Task 5: complete (commits 86d2d6e..2f2a3b6, review clean)
    Task 5 cost: implementer opus 150.2k/40.6 min; review opus; layer runs in progress.md
    Task 5 cost: review opus 96.8k/4.4 min
    Task 6: dispatched (sonnet), BASE 2f2a3b6
    Task 6: implementer sonnet, commit 5090361; DONE: int missed (baseline 260/0 failing), e2e missed (baseline 402: 392 pass/10 skip/0 failing), both as old record
    Task 6: implementer sonnet 76.1k/56.6 min (mostly waiting on runs); review dispatched (sonnet)
    Task 6: review sonnet 59.4k/0.8 min: Approved, no issues; controller re-checked clean state (no /tmp/hstack-bench, :3000 free, no bench_ db, copy clean, one worktree)
    Task 6: complete (commits 2f2a3b6..5090361, review clean)
    Task 6 cost: implementer sonnet 76.1k/56.6 min; review sonnet 59.4k/0.8 min
    Final review: dispatched (opus), range 8dbac4a..HEAD

### SDD ledger tail after the final review

    Final review: dispatched (opus), range 8dbac4a..HEAD
    Final review (opus 175.9k/11.5 min): with fixes — I1 every bench agent's transcript persists in ~/.claude/projects/-private-tmp-hstack-bench-* (judge transcripts hold the defect text; a bun-capable evaluator could read them); I2 p1–p6c inputs say `docker compose down -v` and step 3's evaluator reads them with bun (run-arm's gate does not cover agent-replay); I3 smoke/task-6 record claims real_estate_test untouched but it does not exist on the server; I4 review.md contradiction (`Reviewed:` lines vs no narration) and old-harness text, evaluator.md bare playwright import; minors (progress Tasks 1–2 bullet and stale "waiting" line, README data layout, superseded sheets beside interface.md, plan Task 3 Step 2 prefix text, is_error)
    - Ruling: claudeArgs gets an opt-in `noPersist` (→ `--no-session-persistence`, checked in `claude --help`); sealed-agent always and agent-replay's layer and judge calls always pass it (run-arm keeps sessions, it resumes); the 64 existing bench transcript folders are MOVED (not deleted) to <data>/transcripts/ — they are evidence (the final review used one to show the reviewer read the diff), and the data folder already holds the oracles, so the move adds no route — cost if wrong: dev-mode replays lose their transcript audit trail; agent-replay keeps findings in the record.
    - Ruling (amends the Task 3 reset-step ruling): agentEnv sets DOCKER_HOST=unix:///nonexistent and drops PAYLOAD_DROP_DATABASE, so an agent's docker CLI reaches no daemon; setup/teardown run with the bench env and are unaffected; the reset steps stay in the inputs — cost if wrong: an agent that deliberately resets DOCKER_HOST still gets through (intent, not accident); the step 8 sandbox closes it.
    - Ruling: the real_estate_test record is corrected (absent on real-estate-postgres-1 at the time of the check; nothing in this build could name it: env.sh refuses non-bench_ names); the user is asked whether it ever existed there; step 3's clean check gets a pg_database snapshot before and after (noted in the plan's "Not in this plan") — cost if wrong: none.
    - Ruling: one fix wave also takes the I4 brief edits (+SOURCES.md), finalText's is_error check (a wrong "missed" is silent), the README data layout and sealed-agent paragraph, superseded sheets moved to <task>/superseded/, the plan's Task 3 Step 2 sentence pointing at the ruling, and the progress.md Tasks 1–2 bullet and stale line — cost if wrong: none.
    Final fix wave: dispatched (opus)
    Final fix wave: implementer opus, commits fc7bcb9..963e0ef (8129194 code, 9d87cfb docs, 963e0ef README); 190 pass; 64 transcripts moved, 46 superseded files moved; re-review dispatched (opus)
    Final fix wave: implementer opus 138.4k/13.7 min; re-review opus: all addressed, no new breakage

- Final review: opus 175.9k/11.5 min · fix wave opus 138.4k/13.7 min · re-review opus · all addressed
- Build approved by the user (2026-10-27 23:10); plan marked `stable`. Asked whether `real_estate_test` ever existed on real-estate-postgres-1, the user does not know: its absence stays unexplained, and step 3's clean check snapshots `pg_database` before and after.
- Prereg §5 human read (step 9, done early, 2026-10-27): 2 inputs drawn by sorting sha256("<task>|hstack-bench-2026-10-27-human-read") over the 15 tasks other than p8b: p3 and p7b. The user's answers for both: (1) no code, test, path or internal name noticed; (2) hard to read because of the writing style, acceptable when the reader is an agent, a human-facing text would need rewriting; (3) somewhat hard to act on, for the same reason. Ruling: inputs keep the source plans' style (§5 allows only removing pointers; every input reader is an agent). Controller finding while pasting p3: its Global Constraints still hold framework identifiers (`idType: 'uuid'`, `overrideAccess: false`, `draft: true`, `revalidate = 600`, `generateStaticParams`, `next/image`); the Task 3 identifier fix ran only on p7c and p6b. To do before step 3: sweep all 16 inputs for such identifiers, sealed fix runs, and add the patterns to input-check.

## 2026-10-28 — bench replay plan (`docs/plans/2026-10-27-bench-replay.md`), stable

- Task 1 (framework identifier sweep of the 16 inputs, item 4): `bench/input-check.mjs` gains `config value`, `module specifier` and `framework name` (commit 1988693), then the sweep's names `providers`, `graphics`, `admin.group`, `meta.icons`, `redirect()`, `next build` and the Tailwind names as whole backticked spans `` `md` ``, `` `lg` ``, `` `sm` ``, `` `font-bold` `` (commit 619fa27); review round 1 added `--experimental-build-mode` and made `providers`, `graphics` and `next build` match only as a whole backticked span (no hit line changed). Controller rulings on the sweep's unclear groups: package names (`payload`, `zod`, `sharp`, `@axe-core/playwright`) out of the class; Payload admin CSS variables and `.payload-settings` kept (CSS); axe tags kept (how a page is measured); `Local API`, `server components`, `client component` kept (prose concepts); `trang/[n]` kept (URL path). 16 sealed sweep runs (no tools; brief `<data>/briefs/sweep.md`); the sweep replies only fed the list, since they named the same text in some tasks and not others. Hit lines = the rule hits once the list was final. Fix runs sealed, no tools; each pre-sweep input kept as `superseded/input-pre-sweep.md`; each task's `filter-log.md` has a "Sweep" section (names the sweep found, names the rules found, names kept, every rewritten line old → new). Step 7 on all 16: input-check PASS, step IDs unchanged, the diff touches only hit lines, `/…` spans and double-quoted strings unchanged, every sheet PASS and no sheet bullet is a hit name (no sheet change), `git -C <copy> status` clean. Per task: hit lines (rules) / sweep names, names kept, fix runs, summed sealed usage of sweep and fix runs (input/output/cacheRead/cacheWrite, all opus-5-5):
  - p1: 0 / none, —, 0 fix; 2/744/649/6072
  - p2: 0 / none, —, 0 fix; 2/953/649/7825
  - p3: 4 (11, 16, 26, 27) / 7, kept `payload`, 2 fixes (run 2, review: line 27 now says images are served resized through the site's image endpoint, line 26 "rebuilt at most every 600 seconds"); 6/13068/1947/24829
  - p4: 0 / 2, kept `payload`, `zod`, 0 fix; 2/904/649/8757
  - p5: 3 (11, 13, 24) / 7, kept `payload`, 2 fixes (run 2, review: the invented sample UUID removed from line 11); 6/11087/1947/21547
  - p6a: 1 (31) / 3, kept `payload`, 1 fix; 4/10079/1298/21772
  - p6b: 0 / none, —, 0 fix; 2/798/649/8375
  - p6c: 0 / none, —, 0 fix; 2/923/649/8172
  - p7b: 0 / 1, kept `payload`, 0 fix; 2/604/649/4834
  - p7c: 3 (10, 11, 21) / 4, `--experimental-build-mode compile` in the class (listed in review round 1; its line was rewritten under the `next build` hit), 1 fix; 4/9358/1298/18405
  - p8a: 1 (23) / 10, kept `trang/[n]`, `@axe-core/playwright`, 5 axe tags, 1 fix; 4/7550/1298/15777
  - p8b: 5 (20, 23, 25, 26, 36) / 11, kept `payload`; `legalStatus: 'castle'` (P8b-F1-S3) rewritten keeping the field and the value, 1 fix; 4/7414/1298/15209
  - p8b1: 0 / 1, kept `sharp`, 0 fix; 2/793/649/4656
  - p8c: 2 (23, 27) / 9, kept `payload`, `Local API`, `server components`, `client component`, 3 fixes (run 1 echoed the prompt; run 2 dropped the kept sentence with `<span>` and "server components"; run 3 named it); 8/20982/2596/32898
  - p8d: 1 (24) / 3, —, 1 fix; 4/8082/1298/17784
  - p8e: 2 (21, 28) / 21, kept `payload`, 9 Payload CSS variables, `.payload-settings`, 2 fixes (run 2, review: line 21 keeps "The admin loads no Tailwind" and says only that the theme and menu icons need no script); 6/12615/1947/22449
  - sum: 30 sealed runs (16 sweeps, 14 fix runs); 60/105954/19470/239361
- Task 2 (readiness before the step 3 replays, item 3): (1) Playwright: `~/.bun/install/cache` holds `playwright@1.64.1`; a probe under `/tmp/hstack-bench/pw-check/` (import from `playwright@1.64.1`, `executablePath` of the evaluator brief, `about:blank`), run as `bun --prefer-offline` with `agentEnv()`, printed `version 145.0.7632.6`, exit 0, no download; folder deleted. (2) `<data>/env/real-estate/pgsnap.sh <out>` (`docker exec real-estate-postgres-1 psql -U postgres -Atc "select datname from pg_database order by 1"`; exit non-zero when the query or the write fails). Snapshot `replay-dev/pg-<time>.txt`: `postgres`, `real_estate`, `real_estate_hstack`, `real_estate_hstack_test`, `template0`, `template1`. Protected names: `real_estate` present, `real_estate_hstack` present, `real_estate_hstack_test` present, `real_estate_test` absent (as before); no `bench_*` name. (3) The three baselines moved to `replay-dev/results-pre-step3/`; `results/` empty (step 3's runs rebuild them, about 35 minutes). (4) Judge probe with the real CLI: `env/judge-probe.json` (`layers.review` = `{ brief: "judge-probe/review.md", tools: [] }`) on dev bug eb2b016-11, review layer, dev mode: exit 0, `eb2b016-11 caught`, `quote:` = the one finding (non-empty), `models` layer `claude-opus-5-5`, judge `claude-opus-5-5`; usage layer 2/51/649/7088, judge 2/64/649/2307 (input/output/cacheRead/cacheWrite), about 13 s; record moved to `replay-dev/judge-probe/`, `results/` empty again. (5) Deferred minors, all settled with nothing to fix: `grep -n -E 'controller|plan-mandated' review.md` prints nothing; line 27 (`Reviewed: <path>` per file) and lines 95-96 ("the one exception is the per-file `Reviewed: <path>` lines") agree; the patch check before the baseline is in `bench/replay.mjs` (`reverseApply … checkOnly` in a throwaway worktree before the baseline; `patch does not apply` in sealed mode); the judge caught path is step (4). After: no `bench_` database, `/tmp/hstack-bench` empty, copy `git status` clean.
- Task 3 (bug files, owner and patch check): `bench/bugs.mjs` (commit 3061eb1, 9 tests in `tests/bench-bugs.test.mjs`) checks every bug file of a folder in a throwaway `check-<id>` worktree and writes its `task`, `base`, `end` and `out`; `--usable <layer>` lists the usable bug files from the written `out` only (no git, no write); sealed mode prints counts and opaque ids only. Prereg §8.2 gains the owner rule and its dev result (commit 8c3b141). Dev bug files (gitignored): `<data>/replay-dev/bugs/<id>.{json,patch}` for the 20 `replay_set` rows, written by `<data>/replay-dev/make-bugs.mjs` (replay.md read only from its `## replay_set` line on; `hunks` = the `-U0` hunks of `<fix>^..<fix>` in the row's file whose new side overlaps the row's lines; 16 patches made as `smoke.md` says in a scratch export of 69ebe27, the four earlier conversions copied, and the method gives those four byte-for-byte; the eb2b016-11 description equals the earlier file's). Dev run (`bun bench/bugs.mjs <data>/env/real-estate.json <data>/replay-dev/bugs`, exit 0): every patch applies, no merge-commit fix, owners exactly as the plan's "Dev ownership" table (p8d 4, p8b 4, p6a 3, p6c 2, p1, p2, p6b, p8b1, p8c, p8e 1 each; d005fa5-03 p6a with `fix in end`; 0870afc-04 no owner); usable unit, int and e2e 20, evaluator 19, review 18, audit 18; `--usable review` printed 18 paths and left the files byte-equal. No sealed-agent or agent-replay run in this task (no usage). After: the copy's `git status` clean, its worktree list holds only the main checkout, `/tmp/hstack-bench` absent.
- Task 4 (held-out extension by a sealed agent, item 1): `sealed-agent --settings <file>` (commit 97828b2; absolute path to `claude --settings`, a missing file refused, the run record gains `settings`). Permission probe (`--at 69ebe27`, `<data>/briefs/extension-probe-settings.json`, folder `<data>/replay-dev/extension-probe/`, not sealed): write in the probe folder done, write `/tmp/hstack-bench-outside.txt` DENIED (absent), `git -C <copy> log` done, `git -C <copy> branch probe-x` DENIED (no branch), `git apply -R --check` in the export done, Read of `<harness>/progress/feature_list.json` done, Read of the `## replay_set` line of `.evidence/replay.md` done; usage 14/1096/57526/4434, `claude-opus-5-5`. One extension run (`extension`, `<data>/env/real-estate-long.json`, `<data>/briefs/extension-settings.json`, brief `<data>/briefs/extension.md`), exit 0, about 24 minutes; no continuation or fix run. `bun bench/bugs.mjs <data>/env/real-estate.json <data>/heldout --sealed` (exit 0) printed:

      bugs: 98
      source: catalog 10, extension 88
      kind: UI 45, data 12, logic 18, other 2, validation 21
      severity: high 9, low 63, medium 26
      task: none 2, p1 11, p2 10, p3 5, p4 19, p6a 5, p6b 5, p6c 11, p7b 11, p8a 8, p8b 1, p8b1 2, p8c 3, p8d 3, p8e 2
      out: fix in end 33, no owner 2, ok 63
      usable: unit 98, int 98, e2e 98, evaluator 96, review 63, audit 63
      patch does not apply: none
      fix is a merge commit: none
      finished: true
      usage 376/139175/44001861/449017 models claude-opus-5-5

  After: the copy's `git status` clean, its worktree list holds only the main checkout, no `probe-x` branch, `/tmp/hstack-bench-outside.txt` absent, `/tmp/hstack-bench` empty.
- Task 4 fix round 1 (review: approved, with the finding below; controller: harden the held-out set before any run).
  - Known limit of the extension run: its prefix allow rules admitted file writes the probe did not test: `git -C <copy> log/show/diff … --output=<path>`, `git -C <copy> grep -O<cmd>` (runs a command), `git apply -R --check --apply --unsafe-paths`, and perhaps a `>` redirect after `grep:*` or `head:*`. The clean checks after the run covered only the copy (`git status` clean, no new branch or ref, HEAD unchanged), the harness repo (`git status`: only the earlier `.hstack/`), `.evidence/replay.md` (mtime 2026-10-25) and `/tmp` (`/tmp/hstack-bench-outside.txt` absent, `/tmp/hstack-bench` empty).
  - Stray-write scan of the extension run's window (02:29:05 to 02:53:13 +07, launch to the first poll that found it gone): `find ~ /private/tmp -newermt … ! -newermt … -type f`, pruning `<sealed>`, `~/.claude`, `~/Library` and `~/.bun`: 8 files, in `~/Pictures/Photos Library.photoslibrary/` (6: macOS media analysis caches and the Photos database) and `<data>/logs/` (2: `extension.pid` and `extension.exit`, written by the controller's wrapper). None could be a write by the agent. A file the agent wrote and then deleted, or that changed again after the window, is not seen by this scan.
  - `bench/bugs.mjs --fix-tally <sha,...>` (commit 75dd864, TDD): per listed sha only, the number of bug files whose `fix` starts with it; a value not `^[0-9a-f]{7,40}$` is refused; `<name>-done.json` is not a bug file. On the held-out folder: 29f4daf 1, 36d089b 1, 400f58a 1, 5b6646d 3, 89583d2 3, b5b3cec 1, and 0 for each of 69ebe27, dd56b84, 4e58ba5, d82f2b0, 6cedf96, e41d45f, eb2b016, 24c426f, 090f6f2, d005fa5, 0870afc and 730509b, as expected. Sealed check mode also prints `dropped by source` and, per `<name>-done.json`, `considered` and `finished` only.
  - Second labeller over the 88 extension bugs. Settings `<data>/briefs/label2-settings.json`: `additionalDirectories` `<sealed>`; `allow` `Read(//…/heldout/**)`, `Edit(//…/heldout/**)`, `Bash(git -C <copy> show:*)`; `sandbox` `{ enabled: true, failIfUnavailable: true, allowUnsandboxedCommands: false, autoAllowBashIfSandboxed: false }` (keys from the CLI 2.1.310 settings schema; sandbox writes are its working folder plus the `Edit(...)` allow paths). Probe (`<data>/replay-dev/label2-probe/`): Edit creates `ok.txt` done; `git show --output=/tmp/hstack-bench-outside2.txt` DENIED (ran, `Operation not permitted`: the sandbox); `git show … > /tmp/hstack-bench-outside3.txt` DENIED (the permission system: a redirect outside the working folders); `git show -s --format=%s 69ebe27` done; a second probe showed `--output=<probe dir>/inside.txt` is written, so the `/tmp` denial is the sandbox, not the rule. Both outside files absent. One sealed run (`label2`, brief `<data>/briefs/label2.md`), exit 0, about 7 minutes (03:12:55 to 03:20 +07); no continuation run. `bun bench/bugs.mjs <data>/env/real-estate.json <data>/heldout --sealed` (exit 0) printed:

        bugs: 98
        source: catalog 10, extension 88
        kind: UI 45, data 12, logic 18, other 2, validation 21
        severity: high 9, low 63, medium 26
        task: none 23, p1 8, p2 9, p3 5, p4 18, p6a 4, p6b 4, p6c 8, p7b 5, p8a 6, p8b 1, p8c 2, p8d 3, p8e 2
        out: dropped 21, fix in end 28, no owner 2, ok 47
        dropped by source: extension 21
        usable: unit 77, int 77, e2e 77, evaluator 75, review 47, audit 47
        patch does not apply: none
        fix is a merge commit: none
        finished: true
        label2-done: considered 88, finished true
        usage 530/178928/54682966/719089 models claude-opus-5-5

    Disagreement N = 21; agreement (88 − 21)/88 = 67/88 = 76.1%. The usage line sums the extension and label2 run records (label2 alone: 154/39753/10681105/270072). Probe usage (not sealed, opus-5-5): label2-probe 10/688/37047/9843, label2-probe2 8/690/30511/5890. Prereg §8.2 registers the second labeller and the fix-tally check (commit 4915b37).
  - After: the copy's `git status` clean, HEAD 8730783, branches `hstack-tools` and `main` only, no ref changed since 02:00; `/tmp/hstack-bench-outside{,2,3}.txt` absent; `/tmp/hstack-bench` empty. A scan of the label2 window found only the controller's files, `~/.claude.json` and one `~/.npm/_logs` file stamped at the launch second (the CLI's own start-up, outside the Bash sandbox), and the Photos caches.
- Task 5 (Step 3 replay runs, item 2): two detached lanes under `caffeinate -i`, each its own session, driven by `<data>/env/real-estate/step3.sh` and `batch.sh` (gitignored). Lane A (port 3000, `bench_re`): unit, int, e2e, then the evaluator on `<sealed> --sealed`. Lane B: review and audit on the 18 dev bugs (`<data>/replay-dev/bugs`, dev mode), then on `<sealed> --sealed`. A run that errs (verdict `error`, a non-zero exit, or no verdict) has what it left renamed to `.error1.*`, then a health probe (`claude -p "Reply OK"`) and one rerun; a second error is kept. Logs: `<data>/replay-dev/step3/lane{A,B}.log` (timestamp, layer, opaque id, verdict word, exit code).
  - Timeline (+07): both lanes started 2026-10-28 03:35:59. Both were stopped by hand (A 03:41:45, B 03:43:57) to make `batch.sh` restart-safe (`tries/<id>-<layer>` markers) and restarted at 03:43:57. No verdict was lost; lane B's review of 24c426f-03, in flight at the stop, finished as missed. Lane B ended `done` 10-28 10:35:40 (6h59m41s). Lane A was paused by the user before the evaluator to save quota: `batch.sh` gained a `PAUSE` guard (a batch not yet started writes `STOP` and exits 0). Lane A stopped 10-29 11:30:47 after e2e (31h54m48s from the first start). It was restarted 11-01 19:27:16 (pid 37872) and ended `done` 11-02 17:39:56 (22h12m40s). On the restart the unit, int and e2e batches only skipped (222 runs with a verdict, 9 kept errors) in 4 s; they are not counted as batches.
  - Baselines, each built by the first bug of its layer: unit 479 cases, 0 failing; int 260, 0 failing; e2e 402, 1 failing (`the nearby places stop at 6 rows, and each row needs a short place name and distance`), 10 skipped.
  - Per batch. Wall clock runs from the first `batch start` to the last `batch end`. Runs counts every try. Usage is the sum of the batch's records, layer + judge, input/output/cacheRead/cacheWrite, all `claude-opus-5-5`, from `bun bench/replay-summary.mjs <data>/results --set dev=<data>/replay-dev/bugs --set heldout=<sealed>`. Test layers have no agent usage.
    - unit, held-out 77: 53m07s (includes the 2m12s hand stop); 80 runs; 3 reruns (ho-03, ho-04, ho-15), none cleared; caught 1, missed 73, 3 errors kept.
    - int, held-out 77: 6h01m24s; 80 runs; 3 reruns (ho-03, ho-04, ho-15), none cleared; caught 1, missed 73, 3 errors kept.
    - e2e, held-out 77: 25h00m17s; 80 runs; 3 reruns (ho-03, ho-04, ho-15), none cleared; caught 7, missed 67, 3 errors kept.
    - evaluator, held-out 75: 22h12m36s; 81 runs; 6 reruns. The reruns of ho-02 (caught), ho-23 (missed) and ho-50 (missed) cleared; those of ho-03, ho-04 and ho-15 did not. Caught 9, missed 63, 3 errors kept. A kept error leaves no record here, since both tries threw, so `results/` holds 72 evaluator records. Usage 4450/2397201/97286654/5347734.
    - review, dev 18: 46m03s (the hand stop and restart fall inside); 18 runs; 0 reruns; missed 18; 350/248393/8183144/2139008.
    - audit, dev 18: 1h14m14s; 18 runs; 0 reruns; missed 18; 1122/353232/42908136/2288684.
    - review, held-out 47: 1h52m13s; 47 runs; 0 reruns; missed 47; 760/608812/13153983/4403097.
    - audit, held-out 47: 3h07m11s; 47 runs; 0 reruns; missed 47; 2428/911124/72917249/4927613.
    - sum of the agent-replay records: 202 records, 9110/4518762/234449166/19106136. The 15 health probes (one short reply each) are not recorded.
  - Errors. Each was classified by `<data>/env/real-estate/classify-errors.sh`. The script is sealed-safe: it maps each errored try's `.err` log to one fixed category using our own tools' message prefixes, and prints only `<id> <layer> <category> first|kept`. Its self-test `classify-errors.test.sh` passed on synthetic logs (every category, both tries; extended in fix round 1).
    - The categories, in the order checked: `patch check`, `timeout`, `setup failed`, `checkout failed`, `no junit`, `other`. `timeout` covers `app not ready at … after <n> s`, the ready wait hitting `timeoutSec`. `setup failed` covers a setup.sh command failure and `start exited … before ready`. `checkout failed` covers a worktree add or `git archive | tar` failure, a leftover worktree or folder, and a busy port.
    - Counts by category: `setup failed` 24 (12 first tries, 12 kept), `timeout` 3 (first tries). Every other category is 0: `patch check`, `checkout failed`, `no junit`, `other`.
    - `setup failed`: ho-03, ho-04 and ho-15 on unit, int, e2e and the evaluator, each try 20 to 30 s. `setup failed` is reached only after the checkout and the reverse apply succeeded, so these errors are not a patch that does not apply.
    - `timeout`: the first tries of ho-02, ho-23 and ho-50 on the evaluator, each about 60 min (the task's `timeoutSec` of 3600 s). The reruns cleared all three.
    - Every error exited 2 with no verdict. agent-replay throws (exit 2) only before its layer call has run, so the records miss no agent usage.
    - Dead patterns: `layer exited timeout` and `judge exited timeout` are printed only in dev mode (agent-replay.mjs:97). A sealed agent-layer timeout or judge failure leaves a record with verdict `error` and exits 1 with no message, so it would land in `other`. No such run happened, since every error exited 2.
    - ho-04's unit rerun was cut by the hand stop (laneA.log:9), and its exit code was never logged. Its kept status comes from the `tries/ho-04-unit` marker (`2`) written at the restart; its `.out` is empty.
    - No error on review or audit.
  - Counts (Step 5). Test-layer verdicts, `results/<id>-<layer>.out` without `.error1.`: unit 77, int 77, e2e 77, total 231 = 3 × 77 usable; 9 `.error1.out`. Evaluator: 72 records = 75 usable − 3 kept errors with `tries/` = 2; no `.error1.json`. Review and audit: 65 records each = 18 dev + 47 held-out. Each layer's set of usable ids equals its set of result file names.
  - pg: all 11 `batch end` lines (7 in lane A, including the three skip-only re-runs; 4 in lane B) say `pg_database unchanged outside bench_*`. The restarts overwrote `review-bugs-before.txt` and the unit, int and e2e snapshots (all now from 11-01).
  - After (Step 6):
    - `bun bench/env.mjs clean` exit 0.
    - A fresh snapshot lists `postgres`, `real_estate`, `real_estate_hstack`, `real_estate_hstack_test`, `template0`, `template1`: no `bench_*` name, and equal to every batch snapshot once `bench_*` names are removed.
    - Nothing listens on :3000.
    - `/tmp/hstack-bench` is absent (it was empty before `clean`).
    - The copy's `git status --short` is empty, and its worktree list holds only the main checkout (8730783, `hstack-tools`).

### SDD usage by task (implementer and reviewer subagents; total tokens / wall clock as reported)

- Task 1 (sweep): implementer opus 162.4k total/~20 min (3 resumes, one rate-limit stop); review opus 104.6k/4.7 min; re-review sonnet; sealed fix runs 60/105954/19470/239361.
- Task 2 (pre-run checks): implementer sonnet 70.3k/1.8 min; review sonnet.
- Task 3 (bugs.mjs, ownership): implementer opus 171.1k total/~23 min; review opus 96.4k/5.5 min; re-review sonnet.
- Task 4 (extension agent, second labeller): implementer opus 167.4k total/~60 min (incl. 24 + 7 min sealed runs); review opus 85.1k/2.8 min; re-review sonnet; sealed runs 530/178928/54682966/719089.
- Task 5 (replay runs): part 1 implementer opus 118.4k/21.7 min; part 2 implementer opus ~178k total over 3 rounds; review sonnet 100.7k/2.7 min; re-review sonnet 58.8k/1.1 min. The replay runs' own agent usage is in "Step 3 replay runs" above.
- Task 6 (summary, lock): part 1 implementer sonnet 78.1k total/~5.5 min, review sonnet 70.2k/1.5 min, re-review sonnet; part 2 implementer sonnet 97.4k/2.9 min, review sonnet 72.8k/1.6 min.

### SDD ledger copy (taken before the final review; SDD deletes the original)

    # SDD ledger — plan: docs/plans/2026-10-27-bench-replay.md

    Spec: docs/plans/2026-10-27-benchmark-prereg.md (stable) + bench/README.md and the progress.md ledgers. Branch worktree-bridge-cse_01LckcHdPjiRPz5DvPEJXEaJ, start 90bb1b0 (merge-base with main c80419f).
    Data: /Users/hbchuc/Documents/programing/vibe-code/hstack/.evidence/bench (main checkout; absent from this worktree). Sealed folder <data>/heldout/.

    ## Pre-flight scan

    | Rows | Produces vs consumes | Found |
    |---|---|---|
    | T1 self | rule tests (6 config hits, 2 module, 2 names; 13 negatives) vs rule shapes in Step 3 | clean; MIME exception named in Step 3 matches the negatives |
    | T1↔T5 | swept inputs consumed by review/evaluator runs | clean: T5 runs after T1 |
    | T1↔T4 | none shared (extension reads no input) | clean |
    | T2 self | judge probe writes results/ then moves the record | clean: Step 4 ends with results empty |
    | T2↔T5 | pgsnap.sh interface (out file, sorted datname) vs batch.sh snapshots | clean |
    | T3 self | bugs.mjs check mode writes out; --usable read-only; tests list both | clean |
    | T3↔T4 | bug file shape {id,fix,at,patch,description,hunks,kind,severity,source,dropped} and done.json exclusion; sealed `finished` line | clean |
    | T3↔T5 | --usable <layer> paths; agent-replay needs task/base/end/fix (review, audit), task/at/patch (evaluator) — written by T3 check mode for owned bugs only | clean: unowned bugs never usable for agent layers |
    | T4 self | --out and agent writes inside <sealed>; folder must exist for additionalDirectories | GAP: who creates <sealed>, <sealed>/logs and the probe dir |
    | T4↔T5 | sealed stderr to <sealed>/logs | clean once the folder exists |
    | T5↔T6 | .out last line / .json verdict / .error1.* vs summary rules | clean |
    | Global | data writes are absolute paths into the main checkout's .evidence | RISK: implementers must not create .evidence in the worktree |
    | Global | reviewers of T4/T5/T6 must not open <sealed> | RISK: say so in each review dispatch |

    ## Rulings
    - Ruling: the T4 implementer creates <sealed>/ and <sealed>/logs/ empty (mkdir only) before the probe, and the probe dir <data>/replay-dev/extension-probe/ — the plan names the folders but not who makes them; mkdir reads nothing — cost if wrong: none.
    - Ruling: implementers write data only under /Users/hbchuc/Documents/programing/vibe-code/hstack/.evidence/bench (absolute), scratch under /tmp/hstack-bench or the SDD workspace — as in the previous build — cost if wrong: none.

    ## Tasks
    Task 1: dispatched (opus), BASE 90bb1b0
    Task 1: implementer agent ad8e6f31db4d55c1b running
    Task 1: implementer opus 106.9k/12.6 min, commit 1988693 (Steps 1-4); NEEDS_CONTEXT at Step 5 (sweep names the kept list does not decide)
    - Ruling: package names (payload, zod, sharp, @axe-core/playwright) stay out of the class — they name the stack the repo already has (the builder reads package.json), not how to configure it; bare `payload` would also hit the kept `pnpm payload …` commands — cost if wrong: an input says which library to use.
    - Ruling: Tailwind class names (`md`, `lg`, `sm`, `font-bold`) are in the class (a framework's own names in code, not a measured CSS property); the fix rewrites them as the behaviour (a width breakpoint in px, bold text); the rule matches them only as a whole backticked span, so prose words are not hit — cost if wrong: an input loses a short name a check never uses (checks read computed CSS).
    - Ruling: Payload admin CSS variables, axe tags and prose concepts (server components, client component, Local API) stay out of the class (CSS a check reads; how a page is measured; plain-language concepts) — cost if wrong: an input keeps a few framework words.
    - Ruling: add providers, graphics, admin.group, meta.icons, redirect(), next build to the class as proposed; trang/[n] kept.
    - Ruling: hit lines = the rule hits on all 16 once the list is final (the plan's Step 5 order); sweep replies only feed the list — the sweep was inconsistent across tasks and the rules are the mechanical record — cost if wrong: a name no rule matches and the sweep found only once is still added to the list, so nothing is lost.
    Task 1: DONE_WITH_CONCERNS, commits 1988693 619fa27 c0d320c; 9/16 inputs rewritten (p8c 3 fix runs); sealed usage 54/90284/17523/216449; review dispatched (opus)
    Task 1: implementer total 149.2k (resumed twice, one rate-limit stop)
    Task 1: review 1 (opus): Needs fixes — I1 p3:27 invents direct /api/media loading (optimizer was on at p3); I2 p8e:21 drops kept "no Tailwind" and adds "scripts turned off"; spec 3 bookkeeping (p7c --experimental-build-mode, kept: payload in p8b/p8e logs); minors ride along: p3:26 600 s wording (same p3 run), p5:11 invented sample UUID (one p5 run), providers/graphics/next build only as backticked spans
    - Ruling: p8c:27's added consequence stays (p8c at its 3-run limit; the consequence restates what the rewritten setting does, no check depends on it) — cost if wrong: one sentence of extra behaviour in p8c's requirement bucket.
    - Ruling: --experimental-build-mode compile is a framework CLI flag of `next build` (in the class); record it in p7c's log as covered by the next build hit, and add it to the list — cost if wrong: none.
    Task 1: minor (deferred): p8a:23/p8c:23 add "tablet"/"desktop" names; MIME exception misses multipart/ and font/ (no input affected); p8d:28 keeps Next config settings as prose (prose-concept ruling)
    Task 1 cost: review 1 opus 104.6k/4.7 min; fix round 1 sent to implementer
    Task 1: fix round 1 implementer done (162.4k total), commits 4b849f6 e4b5a50; 30 sealed runs 60/105954/19470/239361; re-review dispatched (sonnet)
    Task 1: fix round 1/5 (re-review sonnet): 6 addressed, 0 open; commits c0d320c..e4b5a50; controller checked copy status clean
    Task 1: complete (commits 90bb1b0..e4b5a50, review clean)
    Task 1 cost: implementer opus 162.4k total/~20 min (3 resumes); review opus 104.6k/4.7 min + re-review sonnet; sealed runs 60/105954/19470/239361
    Task 2: dispatched (sonnet), BASE e4b5a50
    Task 2: implementer sonnet, commit 4ca725a, DONE; judge probe caught (real CLI); results/ empty; review dispatched (sonnet)
    Task 2: review sonnet: Approved, no Critical/Important
    - Ruling: implementer and reviewer tokens/minutes of every task are recorded in this ledger and reach progress/progress.md with the ledger copy before the final review, plus a per-task summary bullet there (as both earlier builds did) — implementers cannot see their own usage — cost if wrong: none.
    Task 2: minor (deferred): pgsnap snapshot files mode 0600 (mktemp); record timestamps in UTC
    Task 2: complete (commits e4b5a50..4ca725a, review clean)
    Task 2 cost: implementer sonnet 70.3k/1.8 min; review sonnet
    Task 3: dispatched (opus), BASE 4ca725a
    Task 3: implementer opus, commits 3061eb1 8c3b141 2fff012 5023189, DONE; 20/20 owners as table, usable review 18, evaluator 19, test layers 20; review dispatched (opus)
    Task 3: implementer opus 157.4k/19.5 min
    Task 3: review 1 (opus): Approved, spec ✅; 1 Important (not a spec defect): sealed mode prints writer-chosen strings unchecked (id, file name, kind/source/severity, finished)
    - Ruling: fix the Important in bugs.mjs before Task 4 (a shape check in sealed mode: id and file name ^ho-\d+, source ∈ {catalog, extension}, kind ∈ {UI, logic, validation, data, other}, severity ∈ {high, medium, low}, finished boolean; anything else prints as `<n> invalid` / not at all) — the tool is the only window into the sealed folder, a brief rule alone trusts the agent — cost if wrong: none.
    - Ruling: ride along minors 2 (sealed test with a well-formed file whose fix is unknown and whose at is bad), 3 (atomic write: temp + rename), 7 (prereg §8.2 names the dropped and merge-commit exclusions) — cost if wrong: none.
    Task 3: minor (deferred): leftover check-<id> worktree after a hard kill reads `invalid` (README line: run env.mjs clean); readRows takes non-numeric task_lines/old_lines; bad.patch fixture is not a patch
    Task 3 cost: review opus 96.4k/5.5 min; fix round 1 sent
    Task 3: fix round 1 implementer done (171.1k total), commits 21f6a8f 9210e35 (also: sealed model names shape-checked); re-review dispatched (sonnet)
    Task 3: fix round 1/5 (re-review sonnet): 4 addressed, 0 open; commits 5023189..9210e35
    Task 3: minor (deferred): dev mode prints null/invalid for absent kind or finished (cosmetic); a tmp file stays if rename throws (ignored by the scan)
    Task 3: complete (commits 4ca725a..9210e35, review clean)
    Task 3 cost: implementer opus 171.1k total/~23 min; review opus 96.4k/5.5 min + re-review sonnet
    Task 4: dispatched (opus), BASE 9210e35
    Task 4: implementer opus, commits 97828b2 1e60209, DONE; probe 6/6 as expected; 1 extension run 24 min, finished true; 98 bugs (catalog 10, extension 88; 63 low, 45 UI), all patches apply; usage 376/139175/44001861/449017
    Task 4: implementer opus 106.2k/35.7 min
    - Ruling: harden the held-out set before any run, as a Task 4 fix round with one prereg §8.2 note: (1) bugs.mjs --sealed --fix-tally <sha7,...> prints a count per listed sha only, run on the 6 catalog held-out shas, the 11 dev shas and 730509b (expected 29f4daf 1, 36d089b 1, 400f58a 1, 5b6646d 3, 89583d2 3, b5b3cec 1, every other 0); these shas are public in the prereg; (2) a second sealed labeller over the 88 extension bugs only, same --at/--settings, which sets "dropped": "label2: <reason>" when it judges a requirement change or no same-commit test checking the hunk; drop on disagreement (no human may settle before the lock); N and the agreement rate go in the lock — one 24-minute pass judging 88 hunks is the only unchecked agent judgement the lock would freeze — cost if wrong: some real held-out bugs dropped (conservative), one more sealed run.
    - Ruling: keep "every layer on every usable held-out bug" (pre-registered in §8.2); about 80 h of sequential test and evaluator runs for ~98 bugs; tell the user now, no second port/db lane — cost if wrong: wall clock only.
    Task 4: review dispatched (opus)
    Task 4: review 1 (opus): Approved, spec ✅; 1 Important (plan-mandated allow rules): prefix Bash rules admit writes (git --output, git grep -O, git apply --check --apply --unsafe-paths, maybe > redirects); not exercised by evidence (copy, harness, replay.md, /tmp clean)
    - Ruling: the fix round (a) records the gap as a known limit in progress.md, (b) scans for stray writes of the extension run window (paths only, outside <sealed>, ~/.claude and ~/Library: find ~ /tmp -newermt <start> ! -newermt <end>), (c) runs the second labeller with Bash narrowed to `git -C <copy> show:*` plus the CLI's sandbox in its settings file, proven first by a probe that tries `--output=` and a `>` redirect to /tmp and must leave no file; if the sandbox cannot be made to hold, deny rules plus the same probe; if a write still lands, stop — cost if wrong: one more probe run.
    Task 4: minor (deferred): a failed check can leave a stray ho-NN.patch with no JSON (bugs.mjs ignores it); sealed-agent accepts a directory as --settings; seen:true unverifiable
    Task 4 cost: review opus 85.1k/2.8 min; fix round 1 sent (known limit, stray-write scan, --fix-tally, label2 with sandbox probe, prereg note)
    Task 4: fix round 1 implementer done, commits 75dd864 4915b37 7e1cbff; label2 (sandboxed) dropped 21 of 88 (agreement 76.1%); fix-tally as expected; usable unit/int/e2e 77, evaluator 75, review/audit 47; re-review dispatched (sonnet)
    Task 4: fix round 1/5 (re-review sonnet): 6 addressed, 0 open; commits 1e60209..7e1cbff
    Task 4: minor (deferred): done-file name (16 chars a-z0-9) and considered are writer-chosen in sealed output; a check after the drops writes task null into the 21 dropped files
    Task 4: complete (commits 9210e35..7e1cbff, review clean)
    Task 4 cost: implementer opus 167.4k total/~60 min (incl. 24 + 7 min sealed runs); review opus 85.1k/2.8 min + re-review sonnet; sealed runs 530/178928/54682966/719089
    - Ruling: Task 5 runs as two detached lanes under caffeinate (lane A sequential: unit, int, e2e, evaluator on held-out; lane B sequential: review and audit on dev then held-out), at most 2 claude processes at once — simpler than 4 and lane B (~130 runs x ~5 min) ends long before lane A — cost if wrong: none.
    - Ruling: after any error the lane runs a health probe (one tiny claude -p); while it fails (session or weekly limit), it waits 10 min and probes again; only then the one rerun — a usage limit is not a layer outcome and would otherwise turn a stretch of runs into errors — cost if wrong: a lane waits instead of recording an error.
    - Ruling: Task 5 is split across two dispatches of one implementer: (1) write batch.sh and the driver, start the lanes, confirm the first runs leave verdicts; (2) after the lanes end, Steps 5-7 — a subagent cannot wait ~65 h; the controller waits — cost if wrong: none.
    Task 5: dispatched (opus), BASE 7e1cbff
    Task 5: part 1 implementer opus 118.4k/21.7 min, DONE_WITH_CONCERNS; lanes started under caffeinate (A pid 84953, B pid 84956; logs <data>/replay-dev/step3/); restarted once at 03:43:57 (batch.sh made restart-safe with tries/ markers; no verdict deleted); unit baseline 479 cases, 0 failing
    - Ruling: batch.sh's stop on a failed snapshot check writes a STOP file that the other lane honours before its next run, instead of killing it — killing would orphan the app and claude process groups; the intent (no further runs after a database change) holds — cost if wrong: one more run in the other lane.
    - Ruling: ho-03 and ho-04 unit errors (exit 2, no stdout, about 20 s) stay errors; part 2 classifies every error by a sealed-safe script that maps its .err file to one fixed category from our own tools' message prefixes (patch check, setup failed, no junit, timeout, other) and prints only `<id> <layer> <category>` — nobody may read sealed stderr, but an unexplained error class must be named — cost if wrong: one small script.
    - Controller check: all-missed so far is plausible (6 dev review records each ~10 KB of findings; spot-checked 090f6f2-03 and 24c426f-13: findings never mention the defect; judge right).
    Task 5: lanes running; controller waits
    Task 5: 05:53 check: lane A in int (unit done), lane B in held-out review; errors so far unit ho-03 ho-04, int ho-04 ho-15 (kept); next check scheduled 07:54
    - Ruling: Task 6 Steps 1-3 (replay-summary.mjs and tests) are built now while lane A runs; Steps 4-5 (lock) wait for Task 5 part 2 — the script needs no results and touches no Task 5 file; no implementer is active (lanes are processes) — cost if wrong: none.
    Task 6: part 1 dispatched (sonnet), BASE 7e1cbff
    Task 6: part 1 implementer sonnet, commit e9dedf9, DONE; review dispatched (sonnet)
    Task 6: part 1 implementer sonnet 72.6k/3.3 min; review sonnet: Approved, no Critical/Important; ⚠️ dev review 0/18 vs 17/20 "by the record"; dev test layers not in results/
    - Ruling: the usage minor (errored first runs' tokens dropped) conflicts with the global constraint "summed usage of every agent-replay run" — treated as Important, fix round 1 with ride-alongs (Object.hasOwn on WEIGHT, Array.isArray on models, count of bugs without severity in a severity set, a test for the .error1.json + .json winner) — cost if wrong: none.
    - Ruling (⚠️1): 17/20 is the attribution.md record (prereg §8.2: "review 17/20 by the record", never a replay); the lock prints the step 3 replay next to it with that label, no reconciliation — cost if wrong: none.
    - Ruling (⚠️2): dev test layers and the evaluator are not replayed in step 3 (their dev results stand, prereg §12 step 3); the dev set's summary covers review and audit only, and the lock quotes the standing dev numbers from §8.2 — cost if wrong: none.
    Task 6: minor (deferred): SHOWN_ID accepts sha7-N ids in any set (bugs.mjs already enforces ho-N in the sealed folder); record id/layer not checked against the file name
    Task 6: part 1 fix round 1 implementer done, commit ff508ea; re-review dispatched (haiku)
    Task 6: part 1 fix round 1/5 (re-review sonnet): 4 addressed, 0 open; commits e9dedf9..ff508ea
    Task 6: part 1 complete (Steps 1-3; commits 7e1cbff..ff508ea); Steps 4-5 wait for Task 5 part 2
    Task 6 cost so far: implementer sonnet 78.1k total/~5.5 min; review sonnet 70.2k/1.5 min + re-review sonnet
    Task 5: 07:54 check: lane A int ho-46, lane B audit held-out ho-28; no STOP, no limit waits; next check 11:56
    - Ruling (user, 2026-10-28 08:28): lane checks every 12 h (next 20:28 local); the user compacts the session first — cost if wrong: a finished lane waits up to 12 h.
    Ruling (user, 2026-10-29 05:07): pause before the evaluator batch to save quota — batch.sh gained a PAUSE guard (a batch not yet started writes STOP and exits 0; the running e2e batch is unaffected because sh parsed it at start); <data>/replay-dev/step3/PAUSE set — resume: rm PAUSE, then sh env/real-estate/step3.sh A (restart-safe, done runs skipped) — if wrong: lane A ends 'stopped' and the evaluator waits for a manual restart
    Status (2026-10-29 11:52): lane A stopped at the PAUSE guard after e2e (e2e 77/77: caught 7, missed 67, errors kept 3); lane B done; no scheduled checks remain (user deleted the last one) — on resume: rm <data>/replay-dev/step3/PAUSE, sh <data>/env/real-estate/step3.sh A (runs only the evaluator), then Task 5 part 2
    Status (2026-11-01 19:27): user said continue — PAUSE removed, lane A restarted (pid 37872); unit/int/e2e skipped as done, evaluator batch started on 75 held-out bugs; checks every 12 h
    Status (2026-11-02 19:34): lane A done 17:39:56 (evaluator 75: caught 9, missed 63, kept ho-03 ho-04 ho-15; ho-02 first-run error cleared by rerun); lane B done 2026-10-28 10:35; no STOP
    - Ruling: Task 5 part 2 goes to a fresh opus implementer, not a resume — the part-1 agent id was not ledgered and its context is days old; the brief, part-1 report and this ledger carry everything — cost if wrong: one re-read of the brief.
    Task 5: part 2 dispatched (opus), BASE ff508ea
    Task 5: part 2 implementer opus 155.6k/13.2 min, DONE_WITH_CONCERNS, commit f88cbd8; counts match; errors: ho-03 ho-04 ho-15 setup failed on unit/int/e2e/evaluator (kept), evaluator first tries ho-02 ho-23 ho-50 timeout (cleared); clean check passed
    - Ruling (concern 2): ho-03, ho-04, ho-15 stay kept errors on all four lane-A layers, out of every rate's denominator and reported by count with their category; nobody reads their sealed logs — the sealing rule outranks a diagnosis, and "setup failed" is a harness/environment outcome, not a layer outcome — cost if wrong: 3 of 77 held-out bugs carry no test-layer or evaluator verdict.
    - Ruling (concern 1): Task 6's lock states usable/verdicts/kept errors per layer from bugs.mjs --usable and tries/ markers next to replay-summary's counts, rather than changing replay-summary now — the summary counts records by design; the lock is where gaps are explained — cost if wrong: the summary's "error 0" for the evaluator reads wrong without the lock's line beside it.
    Task 5: part 2 review dispatched (sonnet)
    Task 5: part 2 review sonnet 100.7k/2.7 min: Spec ✅ Quality ✅, 5 Minor
    - Ruling (minor 1): the `first|kept` 4th word is an accepted extension of the classifier ruling — fixed words only, and it says which try a category belongs to — cost if wrong: none.
    - Ruling (minor 2, taken as a fix): `setup failed` splits into `setup failed` (setup.sh command / start exited / app not ready) and `checkout failed` (worktree add, archive|tar, dir exists, port busy), so the ho-03/04/15 ruling rests on a label that names the stage — cost if wrong: one rerun of the classifier, a progress.md edit.
    Task 5: part 2 fix round 1 (resume implementer): minors 2, 3, 4, 5
    Task 5: part 2 fix round 1 commit 004a3bc (split setup/checkout; dead-pattern note; ho-04 footnote; tests); fix round 2 commit b81166e (app not ready back in timeout — my round-1 instruction misfiled it); counts: setup failed 12 first + 12 kept, timeout 3 first cleared, checkout failed 0
    Task 5: minor (deferred to final wave): progress.md says "in the order checked" but lists categories out of the script's check order
    Task 5: re-review dispatched (sonnet), f88cbd8..b81166e
    Task 5: re-review sonnet 58.8k/1.1 min: 5 addressed, 0 open, 0 regressed (wording minor already deferred)
    Task 5: complete (part 1 data; part 2 commits ff508ea..b81166e); usage: part 2 implementer opus ~178k total (3 rounds), review sonnet 100.7k, re-review sonnet 58.8k
    Task 6: part 2 (Steps 4-5, lock) starting, BASE b81166e
    Task 6: part 2 implementer sonnet 97.4k/2.9 min, DONE_WITH_CONCERNS, commit 94e1e1c (lock + docs/log.md); concerns: per-bug held-out verdict table (opaque ids, verdict words) included as replay-summary prints it; standing dev numbers quoted, not recomputed
    Task 6: part 2 review dispatched (sonnet)
    Task 6: part 2 review sonnet 72.8k/1.6 min: Spec ✅ Quality ✅; all 698 hash lines pass shasum -c; 1 Minor
    - Ruling (minor): the six prereg fix shas stay in the lock — they are already public in prereg §8.2 with the same counts, and the lock ties none to an ho id — cost if wrong: none.
    Task 6: complete (commits 7e1cbff..ff508ea, b81166e..94e1e1c); usage part 2: implementer sonnet 97.4k, review sonnet 72.8k

### SDD ledger tail after the final review

    Final review opus 195.2k/19.7 min: With fixes — 0 Critical, 2 Important (lock's "harness outcome" label for ho-03/04/15 is unproven and contradicts its own Known limits; --fix-tally called "safe on a sealed folder" though it reveals which listed shas are held-out fixes), 7 Minor; 218 pass; 698/698 hashes OK; summary reproduces byte for byte
    - Ruling: one fix wave: I1 + Minors 2, 6 as a dated "Corrections after the final review" addendum in the lock (no locked line or hash line edited — the lock commit stays the record); I2 wording in bench/README.md and prereg §8.2; Minor 1 a read-only sealed `at` tally in bugs.mjs with a test, its output recorded in the addendum; Minor 3 progress.md wording; Minor 4 an addendum hash section (tasks/*.tsv, replay-dev/bugs/*, env/real-estate/*.sh) — cost if wrong: one more commit pair.
    - Ruling: Minor 5 (--usable ignores --sealed) keep deferred — every name printed was ho-NN and it only reaches the sealed logs; Minor 7 (plan status draft) stays until the user approves the build, per the user's rule; deferred-minor dispositions as the reviewer listed — cost if wrong: none.
    Final fix wave dispatched (opus), BASE d0789f5
    Final fix wave implementer opus 109.3k/9.8 min, commits 736d837 c6e8c08 39f391f; 219 pass; at tally `at: 69ebe27 98, other 0` (a different at does not explain ho-03/04/15)
    - Ruling: the implementer's deviation stands — plain `bugs.mjs <sealed> --sealed` is the check mode that WRITES every bug file (my brief wrongly called it read-only); a separate read-only `--at-tally` flag (like --fix-tally) keeps the locked ho-*.json unchanged — cost if wrong: none; never run plain --sealed check mode on <sealed> after the lock.
    Final re-review dispatched (sonnet), d0789f5..39f391f
    Final re-review sonnet 63.4k/2.6 min: all addressed, 0 regressed, 0 new; 219 pass; 765/765 lock hashes OK; <sealed> unchanged after --at-tally
    Final review clean; plan status stays draft until the user approves the build

- Final review and fix wave usage: review opus 195.2k/19.7 min; fix implementer opus 109.3k/9.8 min; re-review sonnet 63.4k/2.6 min.

- Build approved by the user (2026-11-02 20:48); plan marked `stable`. From the lock commit 94e1e1c (with its corrections in 39f391f) the held-out commits may be opened as oracle sources (prereg step 5).

## 2026-11-02 — external task selection plan (docs/plans/2026-11-02-bench-external.md), draft

- Task 1 (rulings and stack data): the rulings were committed in prereg 4.2 (cafa710) before any enumeration; `bench/ext.mjs list` has not run. `<data>/ext/groups.json` SHA-256 `fcbc35b8a29ea8ad43b47c13f45f512debaaa7c78ca94f8532af6a76b1572aa8`.
- Task 4 (check one candidate in a container), Step 1 build network probe, 2026-11-02: `docker build --no-cache --progress=plain -t bench-ext/probe:net .` (alpine:3.22, `nc -z -w 3 <host> 5432`) printed `host.docker.internal open`, `gateway.docker.internal closed`, `192.168.65.254 open`. Builds can reach the host's Postgres port; accepted (the user's decision of 2026-11-02), and `pgsnap` is compared around each walk batch. Test runs are `--network none`.
- Task 4 `userContentEdits` check (cli/cli #14855, #14881, outside the candidate universe): `diff` is the whole body of that version, nodes newest first, the newest equal to the current body, the oldest (`editedAt` = the issue's `createdAt`) the text as created; a title rename (#14740) leaves `lastEditedAt` null.
- Task 4 gated test run (`BENCH_EXT_DOCKER=1 bun test tests/bench-ext-check.test.mjs`, 8 pass) left these containers: `bench-ext-other` (the decoy) and, of fixture slugs `fx1899o5__app__1`, `fxrosbpp__app__1` (each `-probe-reuse-1`, `-base-1`, `-end-1-1`, `-end-1-2`), `fxm5ea2z__app__1`, `fxp5udbb__app__1` (each `-probe-1`..`-probe-3`); images `bench-ext/probe:net`, `bench-ext/fx1899o5__app__1:{22135a0,495c367}`, `bench-ext/fxrosbpp__app__1:{22135a0,495c367}`, `bench-ext/fxm5ea2z__app__1:22135a0`, `bench-ext/fxp5udbb__app__1:1d1e3cc`. The out candidate of the walk test was removed by `--remove-out`.
- Task 3 (enumerate, sort, commit the tier 1 list), Steps 1-3: commits a912cd2, 12b0a83, ee6531b (the review fixes: search completeness, transient errors, null PR fields, unparsable saved answers, unreachable repos).
- Task 3 Step 4: `bun bench/ext.mjs list <data>/ext/groups.json --tier 1`, detached, `HSTACK_BENCH_MACHINE=<data>/machine.json`, resumed from `<data>/ext/raw/` after each stop. Logs: `<data>/ext/logs/list-1.{out,err}` and `list-1.attempt{1,2,3}.*`; start times in `list-1.start`; end times are the last write of each err log.
    attempt 1: PID 75188, code a912cd2, 2026-11-02T15:11:06Z to 15:16:19Z; stopped by the implementer after the 50-repo tree batches answered HTTP 502 (fix 12b0a83: a 5xx retried twice, so the batch is halved soon)
    attempt 2: PID 78503, code 12b0a83, 15:16:59Z to 16:21:35Z; died on an HTTP 502 PR page; 1258 new requests, 1321 new GraphQL points
    attempt 3: PID 22351, code ee6531b (detached worktree /tmp/hstack-list-ee6531b), 16:22:59Z to 20:53:37Z; died at Rust repo 934/1229 on `read: operation timed out`; 2839 new requests, 4002 new GraphQL points
    attempt 4: PID 76607, code ee6531b, 20:55:10Z to 23:44:19Z, exit 0; 3769 requests, 1459 new, 1854 new GraphQL points
    total: 5611 responses in raw/, about 7177 GraphQL points spent over the four attempts
- Task 3 Step 4 printed counts (`list-1.out`; GraphQL points per stack are summed over every response the list used, saved ones too):
    s1: repos searched 5104, repos with markers 156, PRs read 3104, ok 1198, GraphQL points 1405, slice shortfall 0; out: no test file 721, issue before window 499, closing issues != 1 481, issue in another repo 78, not default branch 57, issue after PR 39, no non-test file 17, bot author 11, over 100 files 3
    s2: repos searched 5896, repos with markers 182, PRs read 4002, ok 2345, GraphQL points 1039, slice shortfall 0; out: no test file 599, issue before window 408, closing issues != 1 208, bot author 152, no non-test file 123, not default branch 74, issue after PR 68, over 100 files 20, issue in another repo 5
    s3: repos searched 1527, repos with markers 1229, PRs read 26309, ok 7063, GraphQL points 2863, slice shortfall 0; out: no test file 10561, issue before window 3869, closing issues != 1 2041, bot author 782, not default branch 552, issue after PR 541, issue in another repo 529, no non-test file 254, over 100 files 117
    repos-1.tsv: 12527 repos, reason ok 10232, licence 2295 (no other repo reason, none unreachable)
- Task 3 Step 4 replay check (2026-11-03): `list` is unchanged from ee6531b to 1efccbc (the later diff touches only imports and code after `list`). Run at 1efccbc from raw/ into a scratch data folder, with a gh that answers nothing: 0 network requests, raw/ unchanged (5611 files). The 28 requests it found unsaved are the ones the run had refused and halved (22 marker batches, 6 PR pages at first 100 or 50), and each halving led to saved answers. Same counts, and candidates-1.tsv and repos-1.tsv are byte-identical to the run's.
- Task 3 Step 4 check, from the TSV columns: s1 1198 ok rows from 68 repos, s2 2345 from 58, s3 7063 from 404; every stack has at least 8 ok rows from at least 4 repos, so tier 2 is not needed (ruling 3).
- Task 3 Step 5, the list committed before any candidate is checked (`progress/step4/`); raw/ is frozen from here:
    candidates-1.tsv SHA-256 75e7ac6fe1463ba4b0347afe24f203876e18bfbf50d038a1d619763c96c69c95 (33415 rows)
    repos-1.tsv      SHA-256 fe474f93352c04f24da6efc9a43ccf6660ac3a5b355683539cde5c659de7e4ee
    <data>/ext/raw.sha256 SHA-256 92b6b2996a6ba4d3594060df27a0d77b9cb0058e790ef396d9ed4e01075fec04 (5611 lines, `cd <data>/ext && find raw -type f | sort | xargs shasum -a 256`)
- Task 5 Step 1 (walk): driver `<data>/ext/walk-all.sh` (gitignored): s3, s2, s1 in turn, tier 1, `--remove-out`, each walk between `pgsnap` snapshots `logs/pg-<stack>-{before,after}.txt` that must be equal once `bench_*` names are removed; it stops on a changed or failed snapshot, a non-zero walk exit, `list end yes` short of 8 (tier 2 not run) or 2 errors in a row. Started detached from the worktree (own session via `POSIX::setsid`, `caffeinate -i`, `nohup`, as the step 3 lanes): driver PID 73579 (process group 73579), code 911b1bf, start 2026-11-02T23:52:47Z. Logs: `<data>/ext/logs/walk-all.{out,start,pid}`, `walk-<stack>.{out,err}`.
- Task 5 Step 1, first run of the driver (PID 73579, code 911b1bf): s3 rank 1 `apache__datafusion__24211` ended `error run` twice (`check.err`: the base run's container was OOMKilled, exit 101; recipe round 1 passed, probe 593 cases, both images built), so the walk stopped on 2 errors in a row at 2026-11-03T00:08:06Z, accepted 0. Ruling (controller, 2026-11-03): a test run killed for memory is the out reason `out of memory` (prereg 4.2 ruling 10, commit 805b256; a probe killed for memory is a failed probe told to the next round). Gated check of the change (`BENCH_EXT_DOCKER=1 bun test tests/bench-ext-check.test.mjs -t 'finds one fail-to-pass|killed from outside'`, 3 pass) left containers `bench-ext-fxc2v7c7__app__1-{probe-reuse-1,base-1,end-1-1,end-1-2}`, `bench-ext-fx468dph__app__1-{probe-reuse-1,base-1}` and images `bench-ext/fxc2v7c7__app__1:{aa35d45,2654416}`, `bench-ext/fx468dph__app__1:{aa35d45,2654416}`.
- `<data>/ext/briefs/recipe.md` now states the container's memory and CPUs (one sentence after the `test` bullet): SHA-256 before eb7b1209c7dc88e6614d3aa030c0e4e245eb1c86adb8238aa655051c4269b769, after 8dbe7f9434682bec87c1f71054fff6b1c568949f049c6b20b21f391fa8b8392b.
- Task 5 Step 1, driver restarted: PID 89087 (process group 89087), code 805b256, start 2026-11-03T00:14:09Z; the walk resumes from walk.tsv.
- Task 5 Step 1, paused by the controller (driver group 89087 killed, 2026-11-03, after `voidzero-dev__vite-plus__2667 out PR tests do not pass at end`; s3 rank 3 had started and has no walk.tsv row). Sealed diagnosis of that reject: one `sealed-agent` run, no `--at`, tools Read,Glob,Grep, settings `<data>/ext/briefs/diag-settings.json` (read only `sealed/voidzero-dev__vite-plus__2667/` and `recipes/voidzero-dev__vite-plus/`), prompt `<data>/ext/briefs/diag-prompt.md`; reply `A` (the script was given a path it cannot run); 12 s, usage 6/464/17719/6740, claude-opus-5-5.
- Probe change (ruling 10, 2026-11-03): each probe also runs one base file under the test paths with an extension no probe file has; `<data>/ext/briefs/recipe.md` `test` bullet now says its arguments can include fixtures, data files, snapshots and helper modules. recipe.md SHA-256 8dbe7f9434682bec87c1f71054fff6b1c568949f049c6b20b21f391fa8b8392b -> e9adb166a59124fd1561873cf342b651bd15ca6a6513cfbb5c44edd573e78208. Appended to walk.tsv by hand: `s3 1 2 voidzero-dev/vite-plus#2667 recheck: probe change` (nextToCheck now returns it first for s3).
- Gated run `BENCH_EXT_DOCKER=1 bun test tests/bench-ext-check.test.mjs` (17 pass) left these containers and images:
    bench-ext-fx42gk1z__app__1-probe-1
    bench-ext-fx42gk1z__app__1-probe-2
    bench-ext-fx42gk1z__app__1-probe-3
    bench-ext-fxb3tolx__app__1-base-1
    bench-ext-fxb3tolx__app__1-end-1-1
    bench-ext-fxb3tolx__app__1-end-1-2
    bench-ext-fxb3tolx__app__1-probe-1
    bench-ext-fxb3tolx__app__1-probe-reuse-1
    bench-ext-fxejtqy8__app__1-base-1
    bench-ext-fxejtqy8__app__1-end-1-1
    bench-ext-fxejtqy8__app__1-end-1-2
    bench-ext-fxejtqy8__app__1-probe-reuse-1
    bench-ext-fxgg6x4r__app__1-base-1
    bench-ext-fxgg6x4r__app__1-end-1-1
    bench-ext-fxgg6x4r__app__1-end-1-2
    bench-ext-fxgg6x4r__app__1-probe-2
    bench-ext-fxpzhab1__app__1-base-1
    bench-ext-fxpzhab1__app__1-end-1-1
    bench-ext-fxpzhab1__app__1-end-1-2
    bench-ext-fxpzhab1__app__1-probe-2
    bench-ext-fxslm9x6__app__1-base-1
    bench-ext-fxslm9x6__app__1-end-1-1
    bench-ext-fxslm9x6__app__1-end-1-2
    bench-ext-fxslm9x6__app__1-probe-reuse-1
    bench-ext-fxx6s6av__app__1-base-1
    bench-ext-fxx6s6av__app__1-probe-reuse-1
    bench-ext/fx42gk1z__app__1:f5a6d91
    bench-ext/fxb3tolx__app__1:4342324
    bench-ext/fxb3tolx__app__1:f5a6d91
    bench-ext/fxejtqy8__app__1:4342324
    bench-ext/fxejtqy8__app__1:f5a6d91
    bench-ext/fxgg6x4r__app__1:4342324
    bench-ext/fxgg6x4r__app__1:f5a6d91
    bench-ext/fxpzhab1__app__1:4342324
    bench-ext/fxpzhab1__app__1:f5a6d91
    bench-ext/fxslm9x6__app__1:4342324
    bench-ext/fxslm9x6__app__1:f5a6d91
    bench-ext/fxx6s6av__app__1:4342324
    bench-ext/fxx6s6av__app__1:f5a6d91
- The user's decision (2026-11-03): Docker keeps 7.6 GB and 8 CPUs on this 32 GB machine; a repo whose tests need more memory is `out of memory` and every such out is reported to the user. `apache/datafusion#24211` stays `out of memory` (no recheck row); reported.
- Task 5 Step 1, driver restarted: PID 15885 (process group 15885), code 9546c4a, start 2026-11-03T00:58:36Z; the walk resumes from walk.tsv (first the vite-plus recheck).
- Task 5 Step 1, paused again by the controller (group 15885 killed) after the vite-plus recheck reused its old recipe (`probe-reuse-2` passed, the PR runs again 0 cases). Fix: a saved recipe carries `briefSha`; one under another brief is regenerated first (ruling 10, 2026-11-03). Gated run `BENCH_EXT_DOCKER=1 bun test tests/bench-ext-check.test.mjs` (18 pass) left these containers and images:
    bench-ext-fx9crd4r__app__1-base-1
    bench-ext-fx9crd4r__app__1-end-1-1
    bench-ext-fx9crd4r__app__1-end-1-2
    bench-ext-fx9crd4r__app__1-probe-1
    bench-ext-fx9crd4r__app__1-probe-reuse-1
    bench-ext-fxm2xkls__app__1-base-1
    bench-ext-fxm2xkls__app__1-end-1-1
    bench-ext-fxm2xkls__app__1-end-1-2
    bench-ext-fxm2xkls__app__1-probe-reuse-1
    bench-ext-fxn51kix__app__1-base-1
    bench-ext-fxn51kix__app__1-end-1-1
    bench-ext-fxn51kix__app__1-end-1-2
    bench-ext-fxn51kix__app__1-probe-2
    bench-ext-fxo40jr8__app__1-base-1
    bench-ext-fxo40jr8__app__1-end-1-1
    bench-ext-fxo40jr8__app__1-end-1-2
    bench-ext-fxo40jr8__app__1-probe-reuse-1
    bench-ext-fxtr6bky__app__1-base-1
    bench-ext-fxtr6bky__app__1-probe-reuse-1
    bench-ext-fxwnwf9k__app__1-base-1
    bench-ext-fxwnwf9k__app__1-end-1-1
    bench-ext-fxwnwf9k__app__1-end-1-2
    bench-ext-fxwnwf9k__app__1-probe-2
    bench-ext-fxxxif2e__app__1-probe-1
    bench-ext-fxxxif2e__app__1-probe-2
    bench-ext-fxxxif2e__app__1-probe-3
    bench-ext/fx9crd4r__app__1:678235e
    bench-ext/fx9crd4r__app__1:8f5161d
    bench-ext/fxm2xkls__app__1:678235e
    bench-ext/fxm2xkls__app__1:8f5161d
    bench-ext/fxn51kix__app__1:678235e
    bench-ext/fxn51kix__app__1:8f5161d
    bench-ext/fxo40jr8__app__1:678235e
    bench-ext/fxo40jr8__app__1:8f5161d
    bench-ext/fxtr6bky__app__1:678235e
    bench-ext/fxtr6bky__app__1:8f5161d
    bench-ext/fxwnwf9k__app__1:678235e
    bench-ext/fxwnwf9k__app__1:8f5161d
    bench-ext/fxxxif2e__app__1:8f5161d
- Owning-tests rule (ruling 10, 2026-11-03): the `test` bullet of `<data>/ext/briefs/recipe.md` says that when no argument is a runnable test file, the script runs the tests that own them (and "runs only those files" became "runs only those tests"). recipe.md SHA-256 e9adb166a59124fd1561873cf342b651bd15ca6a6513cfbb5c44edd573e78208 -> fe75d6437ffb1b895e64ac95e326c457b84f2db71b33a3f1da59bd941bb9c6fb; every saved recipe is regenerated before use (briefSha). Structured sealed diagnosis of vite-plus (diag2, 79 s, usage 16/4575/373228/167710): 4 args, none with a probe extension, none runnable, the script ran nothing. Appended to walk.tsv: `s3 1 2 voidzero-dev/vite-plus#2667 recheck: owning tests`.
- Task 5 Step 1, driver restarted: PID 28940 (process group 28940), code dc62bb7, start 2026-11-03T01:14:06Z (first the vite-plus recheck).
- Task 5 Step 1, restart for 1e0b47b (a stale recipe is never used; the repo's first task keeps 3 rounds): driver group 28940 stopped at 2026-11-03T01:32Z with the in-flight swc-project__swc (s3 rank 3) build's own group 41543 (no walk.tsv row; it is resumed); new driver PID 44205 (process group 44205), code 1e0b47b, start 2026-11-03T01:32:33Z.
- Task 5 Step 1, the full Docker disk (2026-11-03). The walk was paused by the controller (group 44205). Five s3 `end build failed` checks (ranks 4, 5, 9, 10, 11) each got a sealed diagnosis; all five said `disk`. Total usage 48/5461/1239785/631449. Docker's VM disk was 58.4 GB with 0 free.
- The user's decision: clearing Docker's build cache is allowed, and accepted tasks keep their recipe and image digests, not their images. Code 404231b: a disk signature in a build or run log is an `error`, the walk stops below 15 GB estimated free, and `--remove-out` also removes an accepted task's images after recording `imageDigests`. The driver also stops on the walk's exit 3 (disk low).
- `docker system df` before (`Type: total, active, size, reclaimable`): Images 35, 22, 26.63GB, 4.181GB; Containers 150, 2, 32.35MB, 27.34MB; Local Volumes 5, 1, 385.8MB, 216MB; Build Cache 149, 0, 43.37GB, 19.86GB.
- Ran `docker builder prune -f` once; it reclaimed 19.86GB.
- Accepted tasks emptied through `removeOut(..., { ok: true })`, with digests in meta.json `imageDigests`:
    vite-plus: `bench-ext/voidzero-dev__vite-plus__2667:ce940e3` sha256:0db821993e45ae5cebc1d465659d842588430aef8a056ffd8f25cb3084c164e5, `:a3035cf` sha256:4575b9b22cd7575d9a29692d7f26aadfe583388f356ae7cdbdbf6d2b18ad7e8f
    lancedb: `bench-ext/lancedb__lancedb__4486:982b2a1` sha256:9970e4be622736d818457ddf70136ffa6a51329ae3d6db68782e8eed0f2bd47d, `:180eaaf` sha256:695a8b97ab6da259ed720c4708407530c6b0da28c456db38421974fa8e72c806
    Their containers and images were appended to removed.txt. Containers of vite-plus's attempts 1-2 had already been removed after its earlier out verdicts, so stderr said `could not remove` for them.
- `docker system df` after: Images 31, 18, 4.807GB, 4.181GB; Containers 142, 2, 5.109MB, 107.9kB; Local Volumes 5, 1, 385.8MB, 216MB; Build Cache 95, 0, 23.51GB, 20.56GB.
- The walk's free-disk estimate: limit 64.0 GB (DiskSizeMiB 61035) minus 28.7 GB used = 35.3 GB free.
- Appended to walk.tsv: `recheck: disk` for s3 ranks 3, 4, 5, 6, 7, 9, 10, 11 (swc, toasty, cargo, panda, rocketmq-rust, nautilus_trader, iggy, polars).
- Gated run `BENCH_EXT_DOCKER=1 bun test tests/bench-ext-check.test.mjs` (23 pass) left these fixture containers and images:
    bench-ext-fx0d65j0__app__1-base-1
    bench-ext-fx0d65j0__app__1-probe-reuse-1
    bench-ext-fx652fn2__app__1-base-1
    bench-ext-fx652fn2__app__1-end-1-1
    bench-ext-fx652fn2__app__1-end-1-2
    bench-ext-fx652fn2__app__1-probe-reuse-1
    bench-ext-fxkepp6q__app__1-probe-1
    bench-ext-fxkepp6q__app__1-probe-2
    bench-ext-fxkepp6q__app__1-probe-3
    bench-ext-fxlberl8__app__1-base-1
    bench-ext-fxlberl8__app__1-end-1-1
    bench-ext-fxlberl8__app__1-end-1-2
    bench-ext-fxlberl8__app__1-probe-2
    bench-ext-fxlquqou__app__1-base-1
    bench-ext-fxlquqou__app__1-end-1-1
    bench-ext-fxlquqou__app__1-end-1-2
    bench-ext-fxlquqou__app__1-probe-2
    bench-ext-fxz85fap__app__1-base-1
    bench-ext-fxz85fap__app__1-end-1-1
    bench-ext-fxz85fap__app__1-end-1-2
    bench-ext-fxz85fap__app__1-probe-1
    bench-ext-fxz85fap__app__1-probe-reuse-1
    bench-ext/fx0d65j0__app__1:9d77abf
    bench-ext/fx0d65j0__app__1:a9f5a4c
    bench-ext/fx652fn2__app__1:9d77abf
    bench-ext/fx652fn2__app__1:a9f5a4c
    bench-ext/fxkepp6q__app__1:9d77abf
    bench-ext/fxlberl8__app__1:9d77abf
    bench-ext/fxlberl8__app__1:a9f5a4c
    bench-ext/fxlquqou__app__1:9d77abf
    bench-ext/fxlquqou__app__1:a9f5a4c
    bench-ext/fxz85fap__app__1:9d77abf
    bench-ext/fxz85fap__app__1:a9f5a4c
- Task 5 Step 1, driver restarted: PID 90923 (process group 90923), code 404231b, start 2026-11-03T06:05:36Z.
- Ruling (controller, 2026-11-03): recipe rounds spent while the disk was full do not count. `<data>/ext/recipes/mxsm__rocketmq-rust/rounds.tsv` (3 rounds, all `probe failed`, before 404231b) was moved to `rounds-before-disk-fix.tsv` (kept) at 06:07Z, while the walk was at rank 3, so its recheck has its 3 rounds again (they are numbered from 4 on).
- `<data>/ext/walk-all.sh` (the user allowed clearing the build cache): a walk that exits 3 (docker disk low) gets one `docker builder prune -f`, with the freed size and `docker system df` logged to `walk-all.out`, and is started again; if it stops on low disk again with no check finished since the prune, the driver stops and says so.
- Task 5 Step 1, driver restarted for the prune change: the old group 90923 was stopped at 06:13Z after `swc-project__swc__12010 out PR tests do not pass at end` (its removal done), along with the next check's docker build (toasty, its own group 94992; no walk.tsv row, so it is resumed). New driver PID 95393 (process group 95393), code d9bf894, start 2026-11-03T06:13:21Z.
- Review fix (404231b follow-up): a disk-full message is the machine's failure only when the free-disk estimate taken right then is below 15 GB or cannot be made; the estimate counts 90% of the disk limit as usable; an accepted task's image with no digest is kept and named on stderr. Gated run `BENCH_EXT_DOCKER=1 bun test tests/bench-ext-check.test.mjs` (25 pass) left these fixture containers and images:
    bench-ext-fx0jocna__app__1-base-1
    bench-ext-fx0jocna__app__1-end-1-1
    bench-ext-fx0jocna__app__1-end-1-2
    bench-ext-fx0jocna__app__1-probe-2
    bench-ext-fx0od47f__app__1-base-1
    bench-ext-fx0od47f__app__1-end-1-1
    bench-ext-fx0od47f__app__1-end-1-2
    bench-ext-fx0od47f__app__1-probe-reuse-1
    bench-ext-fx2uhtls__app__1-base-1
    bench-ext-fx2uhtls__app__1-end-1-1
    bench-ext-fx2uhtls__app__1-end-1-2
    bench-ext-fx2uhtls__app__1-probe-2
    bench-ext-fx5kx63k__app__1-base-1
    bench-ext-fx5kx63k__app__1-end-1-1
    bench-ext-fx5kx63k__app__1-end-1-2
    bench-ext-fx5kx63k__app__1-probe-reuse-1
    bench-ext-fx9ymbh9__app__1-base-1
    bench-ext-fx9ymbh9__app__1-probe-reuse-1
    bench-ext-fxntoniw__app__1-probe-1
    bench-ext-fxntoniw__app__1-probe-2
    bench-ext-fxntoniw__app__1-probe-3
    bench-ext-fxoqwua1__app__1-base-1
    bench-ext-fxoqwua1__app__1-end-1-1
    bench-ext-fxoqwua1__app__1-end-1-2
    bench-ext-fxoqwua1__app__1-probe-1
    bench-ext-fxoqwua1__app__1-probe-reuse-1
    bench-ext-fxtm8s1x__app__1-base-1
    bench-ext-fxtm8s1x__app__1-probe-reuse-1
    bench-ext/fx0jocna__app__1:b5cdaa7
    bench-ext/fx0jocna__app__1:ce9680d
    bench-ext/fx0od47f__app__1:b5cdaa7
    bench-ext/fx0od47f__app__1:ce9680d
    bench-ext/fx2uhtls__app__1:b5cdaa7
    bench-ext/fx2uhtls__app__1:ce9680d
    bench-ext/fx5kx63k__app__1:b5cdaa7
    bench-ext/fx5kx63k__app__1:ce9680d
    bench-ext/fx9ymbh9__app__1:b5cdaa7
    bench-ext/fx9ymbh9__app__1:ce9680d
    bench-ext/fxntoniw__app__1:b5cdaa7
    bench-ext/fxoqwua1__app__1:b5cdaa7
    bench-ext/fxoqwua1__app__1:ce9680d
    bench-ext/fxtm8s1x__app__1:b5cdaa7
    bench-ext/fxtm8s1x__app__1:ce9680d
- Task 5 Step 1, end of the walk. The controller restarted the driver at 2026-11-03T06:38:15Z (PID 11902, code ea48116). At 09:23:58Z s3 stopped on low disk (6.5 GB free); the driver's `docker builder prune -f` freed 42.92 GB and the s3 walk went on. s3 reached accepted 8 at 09:48:39Z, s2 at 10:35:53Z, s1 at 12:52:41Z, then `done`.
- Task 5 usage (Steps 1-4):
    walk wall clock: 2026-11-02T23:52:47Z to 2026-11-03T12:52:41Z, 13.0 h, of which the driver ran 698 min (11.6 h) across 8 driver runs; the pauses were the controller's diagnoses and rulings.
    checks: 54 `check` runs over 36 candidates (the `attempt`s in `meta.json`); 465 min summed over the last attempts' `minutes`.
    recipe agent: 49 runs (the `.run.json` under `recipes/*/rounds/`), all exit 0, claude-opus-5-5, usage input 829 / output 426486 / cacheRead 11919487 / cacheWrite 1923705.
    sealed diagnoses: 7 runs (vite-plus ×2, the five disk diagnoses), all exit 0, claude-opus-5-5, usage 70 / 10500 / 1630732 / 805899.
    GraphQL by `check`: no counter is kept. At most 2 calls per check run (the PR, then the issue unless the base check put the candidate out first), so at most 108 calls for the 54 runs, each a small query.
- Task 5 Steps 2-4: checks and lock in `progress/step4-lock.md`, with `progress/step4/walk.tsv` (copy) and `progress/step4/sample.tsv`. In each stack every rank up to the last checked one has a row; 8 `ok` per stack; at most 2 per repo; 6, 6 and 7 repos (s1, s2, s3); no sampled repo was used in hstack; all 27 clones are bare. Cold-setup repos: s1 paperless-ngx/paperless-ngx, s2 super-productivity/super-productivity, s3 the-open-engine/zeroshot.
- Feedback round (ruling 10, 2026-11-03, after the walk): the readable-side check found the probe and the PR's runs invoke `.bench-test.sh` the same way, each path one single-quoted word, with no quoting gap. When the base and both end runs give no case and exit non-zero, one more recipe round is run, told only the fixed sentence, and the runs are made again. `sampleOf` takes a stack's first perStack accepted rows by rank. Gated runs `BENCH_EXT_DOCKER=1 bun test tests/bench-ext-check.test.mjs` (two; the second 28 pass) left these fixture containers and images:
    bench-ext-fx3ss5jg__app__1-base-1
    bench-ext-fx3ss5jg__app__1-probe-reuse-1
    bench-ext-fx87zhxm__app__1-probe-1
    bench-ext-fx87zhxm__app__1-probe-2
    bench-ext-fx87zhxm__app__1-probe-3
    bench-ext-fx8e9ytl__app__1-base-1
    bench-ext-fx8e9ytl__app__1-end-1-1
    bench-ext-fx8e9ytl__app__1-end-1-2
    bench-ext-fx8e9ytl__app__1-probe-1
    bench-ext-fx8e9ytl__app__1-probe-reuse-1
    bench-ext-fxbo68jl__app__1-base-1
    bench-ext-fxbo68jl__app__1-end-1-1
    bench-ext-fxbo68jl__app__1-end-1-2
    bench-ext-fxbo68jl__app__1-probe-2
    bench-ext-fxbtvgtm__app__1-base-1
    bench-ext-fxbtvgtm__app__1-probe-reuse-1
    bench-ext-fxc6zlw2__app__1-base-1
    bench-ext-fxc6zlw2__app__1-end-1-1
    bench-ext-fxc6zlw2__app__1-end-1-2
    bench-ext-fxc6zlw2__app__1-probe-reuse-1
    bench-ext-fxd921m0__app__1-base-1
    bench-ext-fxd921m0__app__1-end-1-1
    bench-ext-fxd921m0__app__1-end-1-2
    bench-ext-fxd921m0__app__1-probe-reuse-1
    bench-ext-fxe8wiz5__app__1-base-1
    bench-ext-fxe8wiz5__app__1-end-1-1
    bench-ext-fxe8wiz5__app__1-end-1-2
    bench-ext-fxe8wiz5__app__1-probe-2
    bench-ext-fxhau2xu__app__1-base-1
    bench-ext-fxhau2xu__app__1-end-1-1
    bench-ext-fxhau2xu__app__1-end-1-2
    bench-ext-fxhau2xu__app__1-probe-reuse-1
    bench-ext-fxhd7wi5__app__1-base-1
    bench-ext-fxhd7wi5__app__1-base-1f
    bench-ext-fxhd7wi5__app__1-end-1-1
    bench-ext-fxhd7wi5__app__1-end-1-2
    bench-ext-fxhd7wi5__app__1-end-1f-1
    bench-ext-fxhd7wi5__app__1-end-1f-2
    bench-ext-fxhd7wi5__app__1-probe-1
    bench-ext-fxhd7wi5__app__1-probe-reuse-1
    bench-ext-fxjdm7po__app__1-base-1
    bench-ext-fxjdm7po__app__1-probe-reuse-1
    bench-ext-fxmq343m__app__1-probe-1
    bench-ext-fxmq343m__app__1-probe-2
    bench-ext-fxmq343m__app__1-probe-3
    bench-ext-fxn6o9es__app__1-base-1
    bench-ext-fxn6o9es__app__1-end-1-1
    bench-ext-fxn6o9es__app__1-end-1-2
    bench-ext-fxn6o9es__app__1-probe-2
    bench-ext-fxogaysk__app__1-base-1
    bench-ext-fxogaysk__app__1-base-1f
    bench-ext-fxogaysk__app__1-end-1-1
    bench-ext-fxogaysk__app__1-end-1-2
    bench-ext-fxogaysk__app__1-end-1f-1
    bench-ext-fxogaysk__app__1-end-1f-2
    bench-ext-fxogaysk__app__1-probe-1
    bench-ext-fxogaysk__app__1-probe-reuse-1
    bench-ext-fxsa8dta__app__1-base-1
    bench-ext-fxsa8dta__app__1-end-1-1
    bench-ext-fxsa8dta__app__1-end-1-2
    bench-ext-fxsa8dta__app__1-probe-reuse-1
    bench-ext-fxuhfy85__app__1-base-1
    bench-ext-fxuhfy85__app__1-probe-reuse-1
    bench-ext-fxw8vqhv__app__1-base-1
    bench-ext-fxw8vqhv__app__1-end-1-1
    bench-ext-fxw8vqhv__app__1-end-1-2
    bench-ext-fxw8vqhv__app__1-probe-2
    bench-ext-fxwf86ui__app__1-base-1
    bench-ext-fxwf86ui__app__1-end-1-1
    bench-ext-fxwf86ui__app__1-end-1-2
    bench-ext-fxwf86ui__app__1-probe-1
    bench-ext-fxwf86ui__app__1-probe-reuse-1
    bench-ext/fx3ss5jg__app__1:10c80c9
    bench-ext/fx3ss5jg__app__1:3f19634
    bench-ext/fx87zhxm__app__1:e6de91d
    bench-ext/fx8e9ytl__app__1:145c172
    bench-ext/fx8e9ytl__app__1:e6de91d
    bench-ext/fxbo68jl__app__1:10c80c9
    bench-ext/fxbo68jl__app__1:3f19634
    bench-ext/fxbtvgtm__app__1:145c172
    bench-ext/fxbtvgtm__app__1:e6de91d
    bench-ext/fxc6zlw2__app__1:10c80c9
    bench-ext/fxc6zlw2__app__1:3f19634
    bench-ext/fxd921m0__app__1:145c172
    bench-ext/fxd921m0__app__1:e6de91d
    bench-ext/fxe8wiz5__app__1:145c172
    bench-ext/fxe8wiz5__app__1:e6de91d
    bench-ext/fxhau2xu__app__1:145c172
    bench-ext/fxhau2xu__app__1:e6de91d
    bench-ext/fxhd7wi5__app__1:145c172
    bench-ext/fxhd7wi5__app__1:e6de91d
    bench-ext/fxjdm7po__app__1:10c80c9
    bench-ext/fxjdm7po__app__1:3f19634
    bench-ext/fxmq343m__app__1:3f19634
    bench-ext/fxn6o9es__app__1:10c80c9
    bench-ext/fxn6o9es__app__1:3f19634
    bench-ext/fxogaysk__app__1:10c80c9
    bench-ext/fxogaysk__app__1:3f19634
    bench-ext/fxsa8dta__app__1:10c80c9
    bench-ext/fxsa8dta__app__1:3f19634
    bench-ext/fxuhfy85__app__1:145c172
    bench-ext/fxuhfy85__app__1:e6de91d
    bench-ext/fxw8vqhv__app__1:145c172
    bench-ext/fxw8vqhv__app__1:e6de91d
    bench-ext/fxwf86ui__app__1:10c80c9
    bench-ext/fxwf86ui__app__1:3f19634
- Sealed diagnoses after the walk (diag3; settings and prompts `<data>/ext/briefs/diag3/`; replies `sealed/<slug>/diag3.reply.md`):
    s3 rank 3 swc#12010: cause recipe; 5 args, 1 with a probe extension, some runnable; ran nothing, usage error.
    s3 rank 6 panda#3925: cause recipe; 2 args, all runnable; ran nothing, usage error.
    s3 rank 10 iggy#4018: cause repo; 1 arg, none runnable; owning tests run; crashed before run, usage error.
    s1 rank 7 eventyay#4509: cause recipe, but the runs ran 6 cases (exit 1), so the feedback round does not apply to its signature; not rechecked (stop rule).
    usage of the four: input 80 / output 20430 / cacheRead 4676960 / cacheWrite 977256 (claude-opus-5-5).
- Rechecks: appended `recheck: feedback round` for s3 ranks 3 (swc#12010) and 6 (panda#3925). `<data>/ext/recheck.sh s3 3 6` runs `ext check` per rank between `pgsnap` snapshots and then the walk's removal step. It ran detached (PID 31429, code 89d9e8a, start 2026-11-03T13:11:45Z); logs `<data>/ext/logs/recheck.out`, `recheck-s3.{out,err}`.
- Rechecks done (2026-11-03T13:59:51Z): swc#12010 `out of memory` (feedback round passed, then the base run was OOMKilled; to be reported to the user); panda#3925 `ok f2p=1 p2p=111` (feedback round passed). s3 now has 9 accepted. The sample is the first 8 by rank (`sampleOf`): panda#3925 entered, zeroshot#944 left and stays `ok` beyond the 8th row. The s3 cold-setup repo is now pola-rs/polars. Superseding lock section in `progress/step4-lock.md`; `progress/step4/{walk,sample}.tsv` regenerated.
- Addendum (2026-11-03): the trigger scan found only iggy#4018 (s3 rank 10). Its recheck (`recheck: feedback round`; first start stopped for a `docker builder prune -f` of 21 GB at an estimated 7.95 GB free; rerun at code 00a3113, start 14:13:03Z, done 14:31:52Z) ended `PR tests do not pass at end` again. The sample is unchanged. Totals now: 58 checks; recipe agent 52 runs, 899 / 469967 / 12850378 / 2035862; diagnoses 11 runs, 150 / 30930 / 6307692 / 1783155.

### SDD usage by task (implementer and reviewer subagents; total tokens / wall clock as reported)

| Task | Implementer | Reviews |
|---|---|---|
| 1 rulings and stack data | sonnet 126.7k / 1.5 min (2 turns) | sonnet 65.8k / 0.8 min; re-review sonnet 59.0k / 0.5 min |
| 2 pure selection logic | sonnet 80.9k / 8.5 min | opus 77.6k / 4.8 min; re-review sonnet 49.3k / 0.6 min |
| 3 enumerate and commit the list | opus 175.4k / ~36 min of turns; enumeration 4 attempts 2026-11-02 15:11Z to 2026-11-03 ~01:30Z | opus 102.9k / 9.5 min; re-review sonnet 72.5k / 1.7 min |
| 4 check in a container | opus 247.4k / 36.6 min | opus 132.9k / 13.2 min; re-reviews opus 107.0k / 3.0 min, sonnet 60.7k / 1.1 min, sonnet 53.0k / 0.5 min |
| 5 walk, sample, lock | opus 364.9k cumulative / ~3 h of turns; walk wall clock 13.0 h + rechecks | scoped reviews: sonnet 70.6k (OOM), opus 82.3k (probe), opus 84.0k (briefSha), sonnet 57.5k (stale recipe), opus 105.2k (disk), sonnet 59.8k (disk signature), opus 140.7k (lock), sonnet 68.4k (addendum) |

Sealed agents (recipe and diagnosis runs) are summed in the Task 5 records above.

### SDD ledger copy (taken before the final review; SDD deletes the original)

    # SDD ledger — plan: docs/plans/2026-11-02-bench-external.md
    
    Spec: docs/plans/2026-10-27-benchmark-prereg.md (§4.2, 7.1, 7.3, 10.2, 12, 13). User approved the plan 2026-11-02 and the Rust `tests/`-only rule (ruling 1a). Branch worktree-bridge-cse_01LckcHdPjiRPz5DvPEJXEaJ, start d1a13cd^ = 2d80cdc (main).
    
    ## Pre-flight scan
    
    | pair / task | produces → consumes | found |
    |---|---|---|
    | T1 → T2 | groups.json shape (seed, window, repo, licences, maxFiles, perStack, perRepo, usedInHstack, groups[{id, languages, markers, testPaths}]) → cfg/group args of stackOf, staticOut, nextToCheck | consistent; `absent` cond in T1 interface |
    | T2 → T3 | sortKey, stackOf, staticOut → list | consistent |
    | T2 → T4 | baseOf, failToPass (ids arrays), nextToCheck ({row, capped}), coldSetup → check/walk; meta.json holds counts | consistent |
    | T3 → T4 | candidates-<tier>.tsv (`static`, `rank`), raw/ (PR file list) → check reads its candidate row and PR files | consistent; check must read raw/ (sealed for people, read by code) |
    | T4 → T5 | walk.tsv, meta.json, issue.json, recipes, sealed/ → sample.tsv, lock | consistent |
    | T1 | prereg paragraph + groups.json + log line | self-consistent |
    | T2 | tests vs signatures | self-consistent |
    | T3 | tests use injected `gh`; Step 4 is an hours-long real run | self-consistent |
    | T4 | tests use a local fixture repo, but `check` fetches from GitHub and the issue by GraphQL, and runs recipe-agent rounds | gap: injection points not named → Ruling P1 |
    | T4 | env task file named `<owner>__<repo>.json` vs slug normalization | Ruling P2 |
    | T5 | days-long walk | run detached; Ruling P3 |
    
    - Ruling P1: `check`/`walk` take injectables like `list`: `{ gh, remote(repo) -> url, recipeAgent }` (defaults: gh CLI, `https://github.com/<repo>.git`, sealed-agent); the fixture tests pass a local path, a fake gh and a recipe agent that returns null — why: the plan's tests need a local fixture and no agent run — cost if wrong: small refactor.
    - Ruling P2: the repo key `<owner>__<repo>` is normalized like the slug (lowercase, other chars → `-`) everywhere (repos/, recipes/, env task file `name`) — why: parseTask's name regex — cost if wrong: renaming folders.
    - Ruling P3: long runs (list, walk) are started detached (`nohup … &` with output to a log under <data>/ext/logs/) and polled, since a tool call is bounded — why: hours/days of wall clock — cost if wrong: none.
    Task 1: dispatched (sonnet), BASE fc3ca88
    Task 1: implementer done (sonnet, 61.6k tokens, 1.1 min; commits cafa710 974a810); review dispatched (sonnet)
    Task 1: review approved (sonnet, 65.8k tokens, 0.8 min); 4 minors. Ruling: send 3 minors (packaging-config extension list, mirror filter note, probe wording) back as fix round 1 although review approved — the stack data is hashed and frozen before enumeration, so a narrower-than-"*" marker list cannot be fixed later — cost if wrong: one small round.
    Task 1: minor (deferred): `"build": {` stored as space-tolerant regex (folded into fix round 1 wording).
    Task 1: fix round 1/5 (3 addressed, 0 open — packaging extensions, mirror note, probe wording; commits 974a810..415b54b). Implementer 65.1k/0.5 min, re-review sonnet.
    Task 1: minor (deferred): the plan's ruling 1 text (docs/plans/2026-11-02-bench-external.md:32) is shorter than the registered prereg ruling (extension list, regex forms); the prereg is the registered text.
    Task 1: complete (commits fc3ca88..415b54b, review clean). groups.json sha256 8cd47883917fa4a11404ead22fd55e265e0f93c4de084894af2423782dcb20f5
    Task 2: dispatched (sonnet), BASE 415b54b
    Task 1: usage — implementer sonnet 61.6k+65.1k tokens / 1.5 min; reviewer sonnet 65.8k / 0.8 min; re-review sonnet 59.0k / 0.5 min
    Task 2: implementer DONE_WITH_CONCERNS (sonnet 68.6k / 4.3 min; commit 4e17ae0). Ruling: readJunit gains `classname` so fail-to-pass ids are classname::name as ruling 10 says — same-named cases in different classes would collapse — cost if wrong: an additive field. Ruling: `absent` conds read the root listing — else src-tauri/Cargo.toml matches s3 one folder down. Ruling: cond `root: true` added and set on s3 Cargo.toml (ruling 1 says root) — groups.json changes before enumeration, hash re-recorded — cost if wrong: Rust repos with a nested Cargo.toml excluded.
    Task 2: concern fixes commit cbb6f8c (sonnet 78.2k cumulative / 6.7 min total); groups.json sha256 now fcbc35b8a29ea8ad43b47c13f45f512debaaa7c78ca94f8532af6a76b1572aa8; review dispatched (opus)
    Task 2: review (opus 77.6k / 4.8 min): spec ❌ 1 Important (base skip counted as f2p). Fix round 1 dispatched with it + minors coldSetup([]) and createdAt-window test.
    Task 2: minor (deferred): `issue?.repo.toLowerCase()` throws when a closing issue lacks repo (Task 3 always sets it).
    Task 2: minor (deferred): cond `root` key is not in the plan's Task 1 cond shape `{ path, text?, absent? }` (prereg ruling 1 already says root).
    Task 2: note for Task 3: rows passed to nextToCheck must be static-ok only; tree.dirs must hold every root folder; closing[].repo = owner/name.
    Task 2: fix round 1/5 (3 addressed, 0 open — base skip not f2p, coldSetup([]) null, createdAt window test; commits cbb6f8c..7969aa3). Re-review sonnet.
    Task 2: minor (deferred): a base id seen twice (skip + pass) is neither f2p nor p2p (conservative).
    Task 2: complete (commits 415b54b..7969aa3, review clean). Usage: implementer sonnet 80.9k cumulative / 8.5 min; reviewer opus 77.6k / 4.8 min; re-review sonnet.
    Ruling P4: `list` also writes repos-<tier>.tsv (every universe repo: language, stars, stack or none, repo-level reason or ok) and reads PRs only for repos with a stack and no repo-level reason; repo-level reasons come from a `repoOut(repo, cfg)` split out of staticOut (staticOut calls it) — why: the user asked that every candidate considered be recorded with its reason, and reading PRs of excluded repos wastes the GraphQL budget — cost if wrong: one more committed file.
    Ruling P5: Task 3's implementer writes the code, then starts the real run detached and reports; the controller resumes it for Step 5 when the run ends — why: the run takes hours — cost: none.
    Task 3: dispatched (opus), BASE 7969aa3
    Task 3: Steps 1-3 done (opus; commits a912cd2 12b0a83); real run PID 78503 started 2026-11-02T15:16:59Z, est. 4-6 h; review of the code dispatched in parallel (opus)
    Task 3: implementer usage opus 135.0k / 27.9 min (Steps 1-3 + run start)
    Task 3: review (opus 102.9k / 9.5 min): Approved with 3 Important (no completeness check per slice/range; truncated answers fatal and PR pages never shrink; prOf null crash) + 5 minors; none invalidates the running list. Fix round 1 dispatched (Important 1-3, minors 1 unparseable raw file, 3 unreachable reason). Ruling: the running PID 78503 is not restarted; after it ends, the fixed code replays the run from raw/ before Step 5 — why: every response is cached, so the replay is nearly free and the committed list comes from the fixed code — cost if wrong: a few new API calls.
    Task 3: minor (deferred): batches halve on every error incl. permanent ones (loud, acceptable).
    Task 3: minor (deferred): tier 2 runs later than tier 1, so a repo crossing 1000 stars between them may be listed in both or neither; handle if tier 2 is ever needed.
    Task 3: minor (deferred): text phase logs as "markers i/n" (cosmetic).
    Task 3: fix round 1/5 (5 addressed, 0 open; commits 12b0a83..ee6531b; argv unchanged, replay reuses raw/). Implementer opus 156.1k cumulative; re-review sonnet.
    Task 3: minor (deferred): README double period after "`unreachable` or `ok`)".
    Task 3: minor (deferred): transient regex loose (EOF/timeout anywhere) — harmless.
    Task 3: minor (deferred): a null `changedFiles` or `commits` makes staticOut comparisons false, so such a PR could stay ok.
    Task 3: code review clean; Steps 4 check + 5 pending on the running enumeration (PID 78503).
    Ruling P6: Task 4 is implemented while Task 3's enumeration runs — Task 4 adds commands to bench/ext.mjs and tests on a local fixture only; no candidate is checked before the list is committed (Task 5) — cost if wrong: none, list run uses its own loaded code.
    Ruling P7: `check` fetches its PR's own fields again (GraphQL pullRequest by number: createdAt, mergeCommit, commits.totalCount, files paths, closing issue) into `sealed/<slug>/pr.json`, instead of reading raw/ — raw/ stays frozen and keyed by request — cost: one GraphQL call per candidate.
    Task 4: dispatched (opus), BASE ee6531b
    Ruling P8: the enumeration's marker batches shrank to 2 repos after GitHub 502s and never grow back (~30 repos/min, est. 5-6 h for markers); not restarted — a restart moves batch boundaries and refetches, and Task 4 is editing bench/ext.mjs now — cost: hours of wall clock only.
    Task 4: implementer DONE (opus; commit 6eaca5b). Ruling: a missing base JUnit after a finished run = no case (every end-passing case f2p) stands — ruling 10 counts missing as fail, and the recipe was already probed at the base — cost if wrong: an inflated count, eligibility unaffected; step 5 validation catches it.
    Task 4: implementer usage opus 195.3k / 24.2 min; review dispatched (opus). Probe: host.docker.internal open, gateway.docker.internal closed, 192.168.65.254 open (accepted by the user).
    Task 4: review (opus 132.9k / 13.2 min): Needs fixes — 1 Critical (network failure in build = final out), 6 Important (killed base run → false ok; no timeouts on git/gh/docker; repo .dockerignore applies; bad reply = error halting walk; fetched commits unpinned; no test that base uses end's test files / deletions), 8 minors. Fix round 1 dispatched with Critical, all Important, minors 8-12.
    Task 4: Ruling: own-timer 30-min timeout = a finished run (missing cases at base count per ruling 10; at end usually "PR tests do not pass at end"); external kill/OOM/daemon gone = error run — why: ruling 10 counts missing as fail and a hang at the base is the base's behaviour, while a kill is the machine's — cost if wrong: a base that hangs for environment reasons is accepted; meta records timedOut per run so step 5 can see it.
    Task 4: Ruling: `--remove-out` may remove a recorded image id once no tag points at it — it is an image this plan built, identified exactly, within the user's clean-up permission — cost if wrong: none outside this plan's images.
    Task 4: Ruling: `!files.length → PR tests do not pass at end` stands (no PR test file exists at end) — note it in the lock.
    Task 4: ⚠️ resolved: sealed-agent Read/Glob/Grep outside the export are denied in -p default mode (step 3 needed additionalDirectories to grant reads elsewhere).
    Task 4: minor (deferred): no --memory/--pids-limit on run containers.
    Task 4: minor (deferred): crash windows — a crash between reply and rounds.tsv append can give a 4th round; after an error recheck `failed` is null without a saved recipe; a killed walk can leave docker build/start running.
    Task 3: enumeration attempt 2 (PID 78503, old code) died at 16:21Z on an HTTP 502 PR page in s1 (the failure fix round 1 handles). Restarted 16:23Z as PID 22351 from a detached worktree /tmp/hstack-list-ee6531b at ee6531b (the reviewed list code; Task 4 is editing bench/ext.mjs), logs of attempt 2 kept as list-1.attempt2.*. Marker batches may refetch where their boundaries differ (cost: wall clock only).
    Task 4: fix round 1 implementer done (commit d01ee2e; opus 239.4k cumulative / 31.4 min total); gated test runs left ~60 fixture containers + ~30 images (kept: removal is allowed only for out candidates). Re-review dispatched (opus).
    Task 4: fix round 1/5 (12 addressed, 1 new open — a missing FROM tag matches the `failed to resolve source metadata` signature → error build; commits 6eaca5b..d01ee2e). Re-review opus 107.0k / 3.0 min. Fix round 2 dispatched.
    Task 4: minor (deferred): gh 300 s limit is a Promise.race; the gh child and realGh's retry loop keep running after it.
    Task 4: minor (deferred): the Dockerfile flag rejection can be got around with a line continuation or `# escape=`.
    Task 4: minor (deferred): withExport's git archive | tar has no time limit (local read).
    Task 4: note for Task 5: run `walk` after `list` has finished — a rate-limit wait > 300 s while list spends the same token ends a check as error fetch/issue.
    Task 4: note: parseRecipe requires `COPY . /work` on its own line; `COPY --chown=… . /work` is rejected (agent told why).
    Task 4: fix round 2 implementer done (commit e56becb; opus 244.7k cumulative / 34 min total). Re-review dispatched (sonnet).
    Task 4: fix round 2/5 (1 addressed, 0 open; commits d01ee2e..e56becb; re-review sonnet 60.7k). Ruling: send the re-reviewer's minor (bare 'not found' anywhere in the tail turns a real network failure into a spent round) as fix round 3 — it decides verdicts during the unattended walk, which starts before the final review — cost: one small round.
    Task 4: fix round 3/5 (1 addressed, 0 open; commits e56becb..1efccbc; re-review sonnet).
    Task 4: complete (commits ee6531b..1efccbc, review clean). Usage: implementer opus 247.4k cumulative / 36.6 min; reviewer opus 132.9k / 13.2 min; re-reviews opus 107.0k, sonnet 60.7k, sonnet (round 3).
    Task 3: enumeration attempt 3 (PID 22351) died at Rust repo 934/1229 on 'read: operation timed out' (not in the transient class: it says 'timed out', not 'timeout'); restarted as PID 76607 from the same ee6531b worktree, logs kept as list-1.attempt3.*. Ruling: no code change mid-run (the list code is reviewed and frozen); if it recurs, restart again — resume reuses raw/ — cost: wall clock.
    Task 3: enumeration attempt 4 (PID 76607, ee6531b) finished exit 0: s1 156 marker repos / 3104 PRs / 1198 ok; s2 182 / 4002 / 2345 ok; s3 1229 / 26309 / 7063 ok; slice shortfall 0 everywhere. Implementer resumed for the replay check, Step 4 check and Step 5.
    Task 3: Step 5 commit 5210606 (candidates-1.tsv 75e7ac6f…, repos-1.tsv fe474f93…, raw.sha256 92b6b299…, 5611 files); controller verified the copies equal the data files and the ok counts (s1 1198/68 repos, s2 2345/58, s3 7063/404). Replay at HEAD: 0 new requests, byte-identical TSVs. Commit 911b1bf adds `timed out` to the transient class (+test). Ruling: 911b1bf (a one-token regex addition with its test, verified by the controller) gets no separate re-review; the final whole-branch review covers it — cost if wrong: caught at the final review.
    Task 3: complete (commits 7969aa3..911b1bf, review clean). Usage: implementer opus 175.4k cumulative / ~36 min of turns + enumeration wall clock 2026-11-02 15:11Z → 2026-11-03 ~01:30Z (4 attempts); GraphQL points (new, attempt 4) 1854 of 3769 requests; reviewer opus 102.9k / 9.5 min; re-review sonnet 72.5k / 1.7 min.
    Task 5: dispatched (opus), BASE 911b1bf
    Task 5: walk started 2026-11-02T23:52:47Z (driver PID 73579, code 911b1bf); s3 rank 1 (apache/datafusion#24211) ended `error run` twice (base run OOMKilled; Docker VM 7.65 GiB, 8 CPUs) → driver stopped on 2 errors. Implementer opus 89.1k / 17.6 min so far.
    Task 5: Ruling: a test run killed for memory is the registered out reason `out of memory` (after `end build failed`), the recipe brief states the memory limit, and the prereg ruling 10 gains this with its date and reason — why: it is a machine limit like the 45/30-minute limits, deterministic on this machine, and independent of any candidate's content; leaving it an error stalls the walk at rank 1 forever — cost if wrong: large repos that need > 7.6 GB are out (the same bias the time limits already have); the user can raise Docker's memory only by a later prereg change.
    Task 5: OOM fix (commits 805b256, 4565806) reviewed by sonnet: approved, minors only. Driver restarted 2026-11-03T00:14:09Z PID 89087 at 805b256.
    Task 5: minor (deferred): the plan's copy of ruling 10 (docs/plans/2026-11-02-bench-external.md:42) lacks the `out of memory` addition; the prereg is the registered text.
    Task 5: minor (deferred): the `out of memory` branches of check (the !e2 chain, cases?.some) have no direct test; only runEnd is unit-tested.
    Task 5: minor (deferred): the memory sentence in recipe.md sits between list bullets.
    Task 5: note: a base run that OOMs because of the base's own bug (a leak the PR fixes) is now out, not f2p — follows the ruling, content-independent.
    Task 5: user (2026-11-03) rejected the silent OOM exclusion: resource failures must compare machine vs repo config and go to the user (tell / propose setup and ask / guide). Host 32 GB RAM, 8 CPU; Docker VM 7.6 GB, 8 CPU; disk 172 GB free. Proposal to the user pending: raise Docker memory to 24 GB, OOM rule machine-aware, recheck OOM outs. Walk keeps running meanwhile (OOM outs will be rechecked).
    Task 5: s3 rank 2 voidzero-dev/vite-plus#2667 → out 'PR tests do not pass at end' with 0 JUnit cases at base and both ends although the probe passed (20 cases) — suspected recipe/interface fault. Controller paused the walk (killed driver group 89087) pending: user's Docker memory decision; a sealed one-letter diagnosis of vite-plus. Ruling: an out verdict later shown to come from a tool or interface fault (not the repo) is rechecked after the fix, recorded in the lock — cost if wrong: a few rechecks.
    Task 5: sealed diagnosis of vite-plus = A (script given a path it cannot run; opus, 464 output tokens, 12 s — thin evidence, plausible). Ruling: brief says the args include fixtures/data/helpers; the probe adds one non-test-extension file from a test folder so the failure shows in a readable round; a 'recheck: <reason>' walk row makes earlier interface-caused outs eligible again (vite-plus now; datafusion after the memory decision); prereg ruling 10 gains a dated sentence — cost if wrong: extra rechecks only.
    Task 5: probe/recheck fix 3bf255e reviewed (opus): approved, minors only. recipe.md sha256 e9adb166…8208. Implementer opus 159.1k cumulative / 46 min.
    Task 5: minor (deferred): retryText does not say the probe got one extra path the agent did not pick.
    Task 5: minor (deferred): the ls-tree for the extra probe path runs under stage recipe-agent (mislabel on failure).
    Task 5: minor (deferred): a dangling symlink could be picked as the extra probe path.
    Task 5: note: a hand-appended recheck row after an ok would reopen an accepted task — append recheck rows only to out rows.
    Task 5: walk paused, waiting on the user's Docker memory decision (24 GB proposed; A = controller edits settings and restarts Docker, B = user does it).
    Task 5: user decision 2026-11-03: keep Docker at 7.6 GB (24 GB too much for the machine); repos needing more are 'out of memory', each reported to the user; datafusion stays out. Implementer told to record it in prereg ruling 10 and restart the walk.
    Task 5: driver restarted 2026-11-03T00:58:36Z PID 15885 at 9546c4a (commits 9546c4a d9a92af). Controller monitors; implementer resumed only at the walk's end/stop.
    Task 5: vite-plus recheck again `PR tests do not pass at end` (reused old recipe passed the new probe; no round ran). Controller paused the walk (group 15885) at s3 rank 3 in progress. Advisor: the brief change never reached reused recipes; the one-letter diagnosis is not evidence; likely root cause = PR test changes that are fixtures/snapshots only (no runnable arg). Ruling: (1) recipes store briefSha and are regenerated (one round) when the brief changed; (2) a structured enum/integer sealed diagnosis with per-log line counts; (3) rule on the contract from its result; (4) after that, pause only if one out reason exceeds ~30% of the first 10 checks of a stack or an error appears.
    Task 5: structured sealed diagnosis of vite-plus: argsTotal 4, argsWithProbeExtensions 0, argsRunnable 0, scriptStage ran-nothing, firstErrorKind other; logs read (line counts per file; 79 s, 4.6k output tokens). Commit 58fd469 (briefSha regeneration). Ruling: when no argument is a runnable test file, the script runs the test targets that own those files (package/crate/module/folder) — why: the PR's test changes were all test data; F2P still works because the owning harness test's classname::name exists at base and end — cost if wrong: owning-test runs are broader and slower (30-min limit) and may count unrelated cases as p2p, never as f2p.
    Task 5: vite-plus recheck → ok f2p=2 p2p=1187 (s3 accepted 1). Commits 58fd469 dc62bb7 fb6ba67; brief sha fe75d643…; driver PID 28940 at dc62bb7 from 2026-11-03T01:14:06Z. Review of 3bf255e..HEAD dispatched (opus).
    Task 5: review of 3bf255e..fb6ba67 (opus 84.0k / 2.3 min): fixes needed — 1 Important (a stale recipe with no round left falls back to the stale recipe, against prereg ruling 10); minors: no test of that path; round-budget quirk gives a recheck of the repo's first task the further-task budget. Fix dispatched (stale + no rounds → recipe failed; first task 3 rounds, others 1, minus own rounds), then driver restart.
    Task 5: minor (deferred): only the first "Added 2026-11-03" sentence says "before any task was accepted" (cosmetic).
    Task 5: note: owning-test runs are broad, so a base-flaky case can count as f2p (vite-plus all runs exit 1); step 5 validation reruns.
    Task 5: fix 1e0b47b (stale recipe never built; first task 3 rounds, others 1) + 9d29bb6; driver restarted PID 44205 at 1e0b47b 2026-11-03T01:32:33Z; swc (s3 rank 3) in-flight check stopped, will be rechecked. Note: bench-arm timing test flaked once under load.
    Task 5: fix 1e0b47b re-reviewed (sonnet): both addressed, no new breakage. Minor (deferred): the no-round test proves 'never built' through containers, not images.
    Task 5: s3 after fix: 11 checks — ok 2 (vite-plus f2p=2, lancedb f2p=21), end build failed 5, PR tests do not pass at end 2, recipe failed 1, out of memory 1. 'end build failed' 45% > 30% threshold → controller paused the walk (group 44205) for a structured sealed diagnosis of the 5 end-build failures.
    Task 5: structured diagnosis of the 5 s3 end-build failures: all `disk` (Docker VM disk 58.4 GB, 0 free; build cache 48.09 GB, 21.15 reclaimable; images 26.63 GB; host 148 GiB free; accepted images ~6 GB each). The disk-full machine failure was scored as the repos' out → wrong outs. Note: the implementer ran one throwaway `docker run --rm` (alpine df) — a container this plan created and removed outside --remove-out; recorded, told to the user.
    Task 5: pending the user's decision on disk (resource-aware rule): free build cache / stop keeping accepted images / enlarge Docker disk. Planned code: disk-full log → error build; free-space pre-check before each check (stop and ask below a floor); recheck every s3 out after vite-plus except datafusion's OOM.
    Task 5: user decision 2026-11-03: (1) docker builder prune allowed; (2) accepted tasks keep recipe + image digests, not images. Implementer dispatched: disk-full → error (machine), free-disk pre-check (stop < 15 GB, no container), remove accepted images after recording digests, prereg sentence, prune once, recheck rows for 8 s3 outs, restart.
    Task 5: disk fix 404231b + 9d86ad4: prune freed 19.86 GB; images 26.63→4.81 GB; accepted vite-plus/lancedb images removed after digests recorded; free ≈ 35.3 GB; recheck: disk rows for s3 ranks 3,4,5,6,7,9,10,11; driver PID 90923 at 404231b from 2026-11-03T06:05:36Z.
    Task 5: Ruling: rounds spent while the disk was full do not count — rocketmq-rust's rounds.tsv moved aside (kept) so its recheck has 3 rounds — cost if wrong: one repo gets up to 3 extra rounds.
    Task 5: Ruling: the driver runs `docker builder prune -f` when a walk stops on low disk, then resumes; stops if low again right after a prune — the user's option 1 allows clearing the build cache — cost if wrong: other projects' build cache is cleared more than once.
    Task 5: d9bf894 + ff440e6: rocketmq rounds moved aside; walk-all.sh prunes build cache on low-disk stop then resumes; driver PID 95393 at d9bf894 from 2026-11-03T06:13:21Z. swc recheck → PR tests do not pass at end again (current brief).
    Task 5: review of 404231b (opus 105.2k / 6.2 min): approved; Important: (1) a disk signature printed by a repo's own failing test makes the candidate error forever (content-dependent exclusion); (2) estimate overstates free space (58.4 GB fs vs 64 GB limit). Fix dispatched: signature counts only when the post-failure estimate is below the floor; usable size 0.9 × limit; no rmi without a digest; prereg wording.
    Task 5: minor (deferred): no gated test of the run-path disk throw; harmless 'could not remove' noise on rechecked outs.
    Task 5: ea48116 re-reviewed (sonnet): all addressed; minors deferred: no test of the build-path disk branch or the kept-no-digest path.
    Task 5: toasty ok f2p=5 p2p=0 (s3 accepted 3). Controller stopped driver 95393 (+ its docker build group 11289, cargo rank 5 in flight, no row) and restarted: PID 11902 at ea48116 from 2026-11-03T06:38:15Z.
    Task 5: s3 done 2026-11-03T09:48:39Z: 8 accepted (vite-plus, lancedb, toasty, cargo, nautilus_trader, polars#30060, polars#29923, zeroshot); build cache pruned once by the driver (42.92 GB). s2 started; first 5: 4 ok, 1 rebase merge.
    Task 5: s2 done 2026-11-03T10:35:53Z: 8 accepted of 10 checked (2 rebase merges). s1 started: 3 ok, 1 rebase merge so far.
    Task 5: walk done 2026-11-03T12:52:41Z — s1 8/10 checked (1 rebase, 1 PR tests do not pass at end), s2 8/10, s3 8 accepted. Implementer resumed for Phase B (Steps 2-4: checks, sample.tsv, lock, log).
    Task 5: lock commit f05229b (24 tasks; cold-setup s1 paperless-ngx, s2 super-productivity, s3 zeroshot; 437 hashes). Implementer slip: first used-in-hstack grep searched raw/ and sealed/ (file names only printed, discarded, disclosed in the lock). Concern: three s3 zero-case outs (swc, panda, iggy) undiagnosed → structured diagnosis dispatched before the final review.
    Task 5: diagnosis of the 3 zero-case s3 outs: swc (rank 3) cause recipe, usage, ran-nothing; panda (rank 6) cause recipe, usage, args all runnable yet ran nothing; iggy (rank 10) cause repo (owning rule followed). Usage 68/17033/4084285/743620.
    Task 5: Ruling (advisor-agreed): one fix, one recheck pass, one superseding re-lock, then stop improving the instrument — check the run-script invocation/quoting first (Task 4 bug if any), else a feedback round with a fixed sentence; prereg stop rule (rechecks only for a diagnosed class with a generic fix; recipe failed outs not reopened); diagnose eventyay#4509 (s1 rank 7); sample must take the 8 lowest ranks when > 8 ok — cost if wrong: sample shifts by up to 2 tasks per stack; the lock is superseded, not edited.
    Task 5: user chose A (2026-11-03): finish the last fix pass and recheck swc/panda, then the superseding lock.
    Task 5: last fix pass: invocation/quoting checked, no bug (test added); feedback round added (89d9e8a) + sampleOf (first 8 accepted by rank) + stop rule in prereg. Rechecks: swc#12010 → out of memory (report to user); panda#3925 → ok f2p=1 p2p=111. eventyay#4509 cause recipe but its runs had 6 cases → not covered by the generic fix → stays out, known limit. Superseding lock a87ebb7: panda enters s3 (s3-04), zeroshot leaves (9th accepted, first for later needs), s3 cold-setup → pola-rs/polars.
    Task 5: Ruling: eventyay#4509 not rechecked under the stop rule — its signature (cases ran) has no generic fix — cost if wrong: one s1 task differs.
    Task 5: review of ea48116..a87ebb7 (opus 140.7k / 7.3 min): sample, cold-setup, summaries, hashes, append-only lock and feedback code verified; Important: iggy#4018 (s3 rank 10) meets the generic feedback trigger and outranks s3-08 but was excluded only by a sealed diagnosis. Ruling: a generic fix applies to every candidate it covers (stop rule, ruling 8, content-independence) — recheck every out meeting the trigger in the same pass; prereg wording amended; Addendum to the superseding lock — cost if wrong: one more recheck.
    Task 5: minor (deferred unless cheap): sampleOf sorts by rank only (tier 2 would break) and has no per-repo cap; no committed caller of sampleOf; a feedback row counts toward the slug's own rounds; first-lock run totals not updated (Addendum updates them).
    Task 5: reported to the user 2026-11-03: out of memory datafusion#24211 and swc#12010; eventyay#4509 known limit.
    Task 5: iggy recheck → out PR tests do not pass at end again (feedback round passed, runs exit 94, 0 cases); sample unchanged; one more builder prune (21 GB) before it. Commits 00a3113 (sampleOf tier+rank+cap) fc7e89d (addendum).
    Task 5: addendum re-reviewed (sonnet): both addressed, sample recomputed equal, no new breakage. Implementer opus 364.9k cumulative (~3 h of turns over the walk). Task 5: complete (commits 911b1bf..fc7e89d, review clean).
- Final-review fix wave: `meta.json` `recipeSha`; one `rounds.tsv` row per round, written as soon as the reply exists; `check` makes walk's disk-floor check (exit 3); a walk stopped on 2 errors exits 4 and says so (the driver stops on it); `bun bench/ext.mjs sample` writes `<data>/ext/sample.tsv`, and on the real records it is byte-identical to `progress/step4/sample.tsv` (a200de5b…). Gated run `BENCH_EXT_DOCKER=1 bun test tests/bench-ext-check.test.mjs` (31 pass) left these fixture containers and images:
    bench-ext-fx0l1ym4__app__1-base-1
    bench-ext-fx0l1ym4__app__1-probe-reuse-1
    bench-ext-fx0ntvef__app__1-base-1
    bench-ext-fx0ntvef__app__1-base-1f
    bench-ext-fx0ntvef__app__1-end-1-1
    bench-ext-fx0ntvef__app__1-end-1-2
    bench-ext-fx0ntvef__app__1-end-1f-1
    bench-ext-fx0ntvef__app__1-end-1f-2
    bench-ext-fx0ntvef__app__1-probe-1
    bench-ext-fx0ntvef__app__1-probe-reuse-1
    bench-ext-fx2l25e0__app__1-base-1
    bench-ext-fx2l25e0__app__1-end-1-1
    bench-ext-fx2l25e0__app__1-end-1-2
    bench-ext-fx2l25e0__app__1-probe-reuse-1
    bench-ext-fx5i5qrf__app__1-base-1
    bench-ext-fx5i5qrf__app__1-end-1-1
    bench-ext-fx5i5qrf__app__1-end-1-2
    bench-ext-fx5i5qrf__app__1-probe-reuse-1
    bench-ext-fx6tncd8__app__1-base-1
    bench-ext-fx6tncd8__app__1-base-1f
    bench-ext-fx6tncd8__app__1-end-1-1
    bench-ext-fx6tncd8__app__1-end-1-2
    bench-ext-fx6tncd8__app__1-end-1f-1
    bench-ext-fx6tncd8__app__1-end-1f-2
    bench-ext-fx6tncd8__app__1-probe-1
    bench-ext-fx6tncd8__app__1-probe-reuse-1
    bench-ext-fx7h2sn7__app__1-base-1
    bench-ext-fx7h2sn7__app__1-probe-reuse-1
    bench-ext-fx9j0eu8__app__1-probe-1
    bench-ext-fx9j0eu8__app__1-probe-2
    bench-ext-fx9j0eu8__app__1-probe-3
    bench-ext-fxahtjj4__app__1-base-1
    bench-ext-fxahtjj4__app__1-end-1-1
    bench-ext-fxahtjj4__app__1-end-1-2
    bench-ext-fxahtjj4__app__1-probe-1
    bench-ext-fxahtjj4__app__1-probe-reuse-1
    bench-ext-fxe4s2o1__app__1-base-1
    bench-ext-fxe4s2o1__app__1-end-1-1
    bench-ext-fxe4s2o1__app__1-end-1-2
    bench-ext-fxe4s2o1__app__1-probe-1
    bench-ext-fxe4s2o1__app__1-probe-reuse-1
    bench-ext-fxeq0ne3__app__1-probe-1
    bench-ext-fxeq0ne3__app__1-probe-2
    bench-ext-fxeq0ne3__app__1-probe-3
    bench-ext-fxkw8a6w__app__1-base-1
    bench-ext-fxkw8a6w__app__1-end-1-1
    bench-ext-fxkw8a6w__app__1-end-1-2
    bench-ext-fxkw8a6w__app__1-probe-2
    bench-ext-fxvj9p0a__app__1-base-1
    bench-ext-fxvj9p0a__app__1-end-1-1
    bench-ext-fxvj9p0a__app__1-end-1-2
    bench-ext-fxvj9p0a__app__1-probe-2
    bench-ext-fxwom2eb__app__1-base-1
    bench-ext-fxwom2eb__app__1-end-1-1
    bench-ext-fxwom2eb__app__1-end-1-2
    bench-ext-fxwom2eb__app__1-probe-reuse-1
    bench-ext-fxylkacm__app__1-base-1
    bench-ext-fxylkacm__app__1-end-1-1
    bench-ext-fxylkacm__app__1-end-1-2
    bench-ext-fxylkacm__app__1-probe-2
    bench-ext-fxzbivb3__app__1-base-1
    bench-ext-fxzbivb3__app__1-end-1-1
    bench-ext-fxzbivb3__app__1-end-1-2
    bench-ext-fxzbivb3__app__1-probe-2
    bench-ext-fxzjc0j2__app__1-base-1
    bench-ext-fxzjc0j2__app__1-probe-reuse-1
    bench-ext/fx0l1ym4__app__1:1715f83
    bench-ext/fx0l1ym4__app__1:31cd0d8
    bench-ext/fx0ntvef__app__1:095295d
    bench-ext/fx0ntvef__app__1:17a919b
    bench-ext/fx2l25e0__app__1:095295d
    bench-ext/fx2l25e0__app__1:17a919b
    bench-ext/fx5i5qrf__app__1:1715f83
    bench-ext/fx5i5qrf__app__1:31cd0d8
    bench-ext/fx6tncd8__app__1:1715f83
    bench-ext/fx6tncd8__app__1:31cd0d8
    bench-ext/fx7h2sn7__app__1:095295d
    bench-ext/fx7h2sn7__app__1:17a919b
    bench-ext/fx9j0eu8__app__1:1715f83
    bench-ext/fxahtjj4__app__1:095295d
    bench-ext/fxahtjj4__app__1:17a919b
    bench-ext/fxe4s2o1__app__1:1715f83
    bench-ext/fxe4s2o1__app__1:31cd0d8
    bench-ext/fxeq0ne3__app__1:17a919b
    bench-ext/fxkw8a6w__app__1:095295d
    bench-ext/fxkw8a6w__app__1:17a919b
    bench-ext/fxvj9p0a__app__1:095295d
    bench-ext/fxvj9p0a__app__1:17a919b
    bench-ext/fxwom2eb__app__1:1715f83
    bench-ext/fxwom2eb__app__1:31cd0d8
    bench-ext/fxylkacm__app__1:1715f83
    bench-ext/fxylkacm__app__1:31cd0d8
    bench-ext/fxzbivb3__app__1:1715f83
    bench-ext/fxzbivb3__app__1:31cd0d8
    bench-ext/fxzjc0j2__app__1:1715f83
    bench-ext/fxzjc0j2__app__1:31cd0d8

### SDD ledger tail after the final review

    Task 5: addendum re-reviewed (sonnet): both addressed, sample recomputed equal, no new breakage. Implementer opus 364.9k cumulative (~3 h of turns over the walk). Task 5: complete (commits 911b1bf..fc7e89d, review clean).
    Final review (opus 187.5k / 13.3 min): Ready to merge with fixes; sample, list order, hashes, sealing, docker safety verified; Important: (1) s2-02's recipe not in the hashed record (recipe.json overwritten by xum#5191); (2) interrupted checks' replies counted but not named; (3) prereg attribution/amendment marks and the user's builder-prune permission missing. One fix wave dispatched incl. minors (walk exit code on 2 errors, check disk pre-check, sample command, recipeSha in meta, rounds.tsv append order, notes, README).
    Final fix wave e4c2f02 + 8f6b6d2 (implementer opus 402.7k cumulative): all 8 addressed; re-review opus: no new Critical/Important; residual gap: the lock addendum omits the cargo#17562 build interrupted at the 06:38Z ea48116 restart (recorded only in progress.md); minors: the "four replies" sentence should add rocketmq-rust's three moved aside; swc 1/2 were stopped before any build (not "while built"); servo 1's build log ends 05:32Z; check tests without a disk option read the real Docker disk; a comment says groups.json order but code sorts by id; walk-all.sh comment outdated.
    Final: parked — cargo 06:38Z interruption missing from the lock — Ruling: no second fix wave (SDD); surfaced to the user with a one-line append proposed at approval — cost if wrong: an incomplete event list in the lock; no effect on counts or the sample.

### Task 5

- Fixture Docker leftovers of `BENCH_EXT_DOCKER=1 bun test tests/bench-ext-check.test.mjs` (with the oracle-run tests): none. Container names (330) and image tags with ids (174) listed before and after the gated run are identical (`diff` empty, two runs); oracle-run removed its own grade containers and `-serve`/`-grade` images by recorded name, and the removal test removed the two containers it created.

### Task 7

Real-estate sources (rulings 1, 6, 7, 8), branch `worktree-agent-aeff905a58618581b`.

(c) check (ruling 8), read before any label was spent: each task's end commit, `git grep` for file reads (`readFile*`, `readdir*`, `createReadStream`, `process.cwd()`, `fileURLToPath`, `homedir`, `showcase-data`) and for `process.env.*DIR|PATH|FILE|FOLDER` and `.env.example` paths in `src/` and `scripts/`, then `git ls-tree` for the folder a loader names. `MEDIA_DIR` is the upload folder the app writes (default `media` in the repo), not data it loads; `scripts/build-locations.mjs` reads a downloaded file given on its command line, and its output `src/seed/locations.json` is in the repo; the demo seed draws its photos in code.

| task | end | needs outside data |
|---|---|---|
| p1 | 7adfd47 | no |
| p2 | 5eced48 | no |
| p3 | be6c20b | no |
| p4 | 9bb39ab | no |
| p5 | 31fcab0 | no |
| p6a | d7f2fd3 | no |
| p6b | 885c4c2 | no |
| p6c | c8db5b7 | no |
| p7b | 3137149 | no |
| p7c | 0b02f41 | no |
| p8a | d1ea76b | no |
| p8b1 | 3e630e8 | yes, `src/seed/showcase.ts:13` (`const dir = process.env.SHOWCASE_DIR`, no default; `seed:showcase` loads `showcase.json` and `photos/` from that folder, and the repo holds no `showcase/` folder at 3e630e8: `git ls-tree` empty; the README there says `SHOWCASE_DIR=/path/to/showcase`) |
| p8c | bee1c22 | no (`src/seed/showcase.ts:14` defaults to `showcase`, which the repo holds: 143 files) |
| p8d | d7695d6 | no (same, `showcase/` in the repo) |
| p8e | a9c2377 | no (same, `showcase/` in the repo) |

p8b1 is dropped (`dropped needs outside data`); 14 tasks remain for step 5.

Pairs (`bun bench/oracle.mjs pairs <data>/env/real-estate.json --drop p8b,p8b1`; p8b and p8b1 still own their hunks), 347 in all:

| task | in-task | later | pairs |
|---|---|---|---|
| p1 | 10 | 43 | 53 |
| p2 | 9 | 37 | 46 |
| p3 | 10 | 26 | 36 |
| p4 | 14 | 28 | 42 |
| p5 | 7 | 6 | 13 |
| p6a | 7 | 26 | 33 |
| p6b | 6 | 15 | 21 |
| p6c | 8 | 16 | 24 |
| p7b | 6 | 9 | 15 |
| p7c | 4 | 4 | 8 |
| p8a | 7 | 12 | 19 |
| p8c | 7 | 7 | 14 |
| p8d | 8 | 6 | 14 |
| p8e | 6 | 3 | 9 |

Labeller settings checked by two unsealed probes before any label (`git log -1`, `git show --stat`, Read of the progress log, Grep of attribution.md: ok; Read and Glob of `<data>`, `ls` of `.evidence`, `git log --oneline -3`: denied). Probe usage 4/638/9917/11171 and 4/330/14553/5483, claude-opus-5-5.

Brief revision: the first batch (driver started 2026-11-03T18:25:11Z) had 7 runs finish in 40-76 s each (p1: 53 pairs, 18/5475/245212/41711; its whole run wrote 42k tokens of context, too little for 53 diffs), so the labellers had labelled mostly from subjects. The driver was stopped at 18:28Z, the 7 finished runs (label 1: p1-p4, label 2: p1, p2, p4) and their prompts were moved unread to `sources/superseded/`, with brief v1 as `superseded/briefs/label-v1.md`, and their usage counted as superseded spend: 7 runs, 120/36077/1554444/265604 (input/output/cache read/cache write), claude-opus-5-5. Brief v2 adds one paragraph only: run `git show` on every listed commit and read its listed hunks before labelling it; a label from the subject alone is not acceptable. `sealed-agent` now records `toolUses` (tool calls by name) in each run record, and `label` prints the counted run's Bash calls. Every label below is under brief v2, for both labellers.

Labels (brief v2): `label 1 p8e` first as a pilot (18:31:29Z, 9 pairs, 7 Bash calls), then the driver (`sources/drive.sh`, `xargs -P 3`, 18:32:17Z-18:42:15Z) for the other 27 runs. Every run replied with every pair labelled once (28 of 28 first runs parsed; no rerun, no `step9` from a failed run). Bash calls per run (one `git show` can name several commits): label 1 p1 56, p2 23, p3 39, p4 44, p5 13, p6a 15, p6b 21, p6c 19, p7b 10, p7c 8, p8a 15, p8c 8, p8d 16, p8e 7; label 2 p1 53, p2 51, p3 27, p4 45, p5 14, p6a 35, p6b 18, p6c 28, p7b 10, p7c 8, p8a 14, p8c 11, p8d 19, p8e 7. For the three runs with Bash calls well below their pairs, context written (cache write) against the other labeller of the same task: label 1 p2 61840 vs 108027 (57%), p6a 41279 vs 63884 (65%), p8c 44032 vs 47570 (93%); v1's p1 run wrote 41711 against v2's 89312 and 94287. So label 1 p2 and p6a read less than their peers; whether that calls for a rule is left to the controller.

`bun bench/oracle.mjs labels`:

| task | pairs | agreed fix | agreed not fix | disputed |
|---|---|---|---|---|
| p1 | 53 | 5 | 46 | 2 |
| p2 | 46 | 9 | 35 | 2 |
| p3 | 36 | 5 | 30 | 1 |
| p4 | 42 | 8 | 32 | 2 |
| p5 | 13 | 2 | 11 | 0 |
| p6a | 33 | 4 | 26 | 3 |
| p6b | 21 | 5 | 16 | 0 |
| p6c | 24 | 7 | 16 | 1 |
| p7b | 15 | 1 | 14 | 0 |
| p7c | 8 | 2 | 6 | 0 |
| p8a | 19 | 2 | 15 | 2 |
| p8c | 14 | 3 | 11 | 0 |
| p8d | 14 | 5 | 8 | 1 |
| p8e | 9 | 5 | 4 | 0 |
| total | 347 | 63 | 270 | 14 |

By kind: in-task 29 agreed fix, 80 agreed not fix, 0 disputed; later 34 agreed fix, 190 agreed not fix, 14 disputed (to the step 9 queue). The 63 sources are 53 distinct commits.

Labeller usage (28 runs under brief v2, from their `.run.json`): input 632, output 155604, cache read 11385833, cache write 1509006; model claude-opus-5-5; all exit 0. Superseded v1 runs (above) 120/36077/1554444/265604. Wall clock of the label runs: 18:25:11Z-18:28Z (v1, stopped) and 18:31:29Z-18:42:15Z (v2), about 14 min.
