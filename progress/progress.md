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

`bun bench/oracle.mjs labels` over these first runs (superseded by the reading-gate reruns below; kept for the record):

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

First-run labeller usage (28 runs under brief v2, from their `.run.json`): input 632, output 155604, cache read 11385833, cache write 1509006; model claude-opus-5-5; all exit 0. Superseded v1 runs (above) 120/36077/1554444/265604. Wall clock of the label runs: 18:25:11Z-18:28Z (v1, stopped) and 18:31:29Z-18:42:15Z (v2), about 14 min.

Fix round 1 (controller rulings after the review):

- Reading gate: each run record now holds `shown`, the distinct listed commits the run named in a Bash `git -C <repo> show` whose tool result was not an error; a run whose reply is bad or whose `shown` is below the task's distinct commits is rerun once as `label-<r>-<task>-2` (same brief v2, same prompt), without looking at its labels; `labels` reads the rerun. The 28 first runs were made before the count existed (their streams were not kept), so none has `shown` and all 28 met the trigger and were rerun (driver 18:57:07Z-19:07:44Z, `sources/logs/`; the first runs' logs are in `sources/logs/round1/`).
- `labels`: a pair with no valid label from a labeller is `none` (unlabelled), not `step9`; it prints `unlabelled` per task, per kind and in total, then the distinct source commits, and exits 1 while a pair is unlabelled.

Reruns (`label <r> <task>` lines, `read <shown>/<commits>`): every rerun replied with every pair labelled (28 of 28). Read every listed commit: 13 of 28 (label 1: p1, p2, p3, p4, p6a, p6c, p8d; label 2: p1, p3, p6a, p6b, p6c, p7c). Still under-read, labels kept: 15 of 28: label 1 p5 9/13, p6b 15/21, p7b 9/15, p7c 5/8, p8a 12/19, p8c 7/14, p8e 4/9; label 2 p2 42/46, p4 12/42, p5 9/13, p7b 9/15, p8a 12/19, p8c 7/14, p8d 6/14, p8e 3/9. A commit shown only through a range (`a..b`), `<sha>^!`, `<sha>:<file>` or `git log -p` is not counted.

`bun bench/oracle.mjs labels` (exit 0), the labels that stand:

```
p1: pairs 53, agreed fix 4, agreed not fix 43, disputed 6, unlabelled 0
p2: pairs 46, agreed fix 9, agreed not fix 35, disputed 2, unlabelled 0
p3: pairs 36, agreed fix 5, agreed not fix 30, disputed 1, unlabelled 0
p4: pairs 42, agreed fix 9, agreed not fix 32, disputed 1, unlabelled 0
p5: pairs 13, agreed fix 2, agreed not fix 11, disputed 0, unlabelled 0
p6a: pairs 33, agreed fix 5, agreed not fix 28, disputed 0, unlabelled 0
p6b: pairs 21, agreed fix 5, agreed not fix 16, disputed 0, unlabelled 0
p6c: pairs 24, agreed fix 7, agreed not fix 16, disputed 1, unlabelled 0
p7b: pairs 15, agreed fix 1, agreed not fix 14, disputed 0, unlabelled 0
p7c: pairs 8, agreed fix 2, agreed not fix 6, disputed 0, unlabelled 0
p8a: pairs 19, agreed fix 3, agreed not fix 15, disputed 1, unlabelled 0
p8c: pairs 14, agreed fix 3, agreed not fix 11, disputed 0, unlabelled 0
p8d: pairs 14, agreed fix 6, agreed not fix 8, disputed 0, unlabelled 0
p8e: pairs 9, agreed fix 4, agreed not fix 5, disputed 0, unlabelled 0
later: pairs 238, agreed fix 36, agreed not fix 191, disputed 11, unlabelled 0
in-task: pairs 109, agreed fix 29, agreed not fix 79, disputed 1, unlabelled 0
total: pairs 347, agreed fix 65, agreed not fix 270, disputed 12, unlabelled 0
source commits: 52
```

Rerun usage (28 runs, from their `.run.json`): input 652, output 162117, cache read 12346665, cache write 1545533; model claude-opus-5-5; all exit 0; wall clock 18:57:07Z-19:07:44Z (10.6 min). Labeller total for the task (v1 7 runs + v2 first 28 + reruns 28 + 2 probes): input 1412, output 354766, cache read 25311412, cache write 3336797.

Usage: implementer opus 210.5k tokens / 34.7 min before fix round 1; reviewer opus recorded by the controller.

### Task 8

Oracle writers (ruling 9), branch `worktree-agent-a4dba354fada17938`; code commits c22cfc3 (`oracle.mjs write`) and 2b2d51a (leak rule, below).

Setup: `<data>/oracle-scaffold/` = p8b's `playwright.config.ts` (copied) and a `package.json` written for it, because p8b's oracle has none (`find` by name over `p8b/`: no `package.json`, no `node_modules`). It pins `@playwright/test` 1.58.2, the task repo's own version, whose `playwright-core` wants chromium revision 1208, the browser installed here (bun's cached 1.64.1 wants 1248). One `bun install` (4 packages; `bun.lock` removed after, so the scaffold's top-level files are the config and `package.json`). Smoke run in `/tmp/hstack-t8/smoke/` (deleted): a one-test spec on `about:blank` passed offline and the JUnit `name` was the test title. Briefs `<data>/briefs/oracle-re.md` (sha256 f05790f4…) and `<data>/ext/briefs/oracle.md` (724f61c7…), English, no repo, task or bug named; after the first pass both changed one sentence (the only hash text is the id prefix, in ids or where ids are built or rewritten) to match the leak rule; the writers had run under the earlier sentence. No database and no Docker in this task; pgsnap not run (no batch touches a database).

Probe: `write <data>/env/real-estate.json 94f26c7` alone first (19:32:39Z-19:33:22Z): Write granted under its folder (`toolUses` Read 3, Grep 3, Write 2), 1 check to p1.

Driver `<data>/re-work/run.sh` (`xargs -P 3`, one line of `re-work/queue.txt` per run: the 52 agreed source commits, then the 24 external tasks; logs `re-work/logs/`). Pass 1 19:33:51Z-20:15:22Z (41.5 min), 76 of 76 exit 0 (logs kept in `re-work/logs-pass1/`). Pass 1 refused 24 external entries for `leak` (s1-05 3 of 3, s3-01 2 of 6, s3-05 8 of 8, s3-06 11 of 13) and none of the task repo. A counts-only probe of those files (hit kind and the shape of the characters around the hash, no text) showed every hit was the sha7 as the id prefix in another form (`_<sha7>_T<n>` names, `'<sha7>-T*'` patterns in a JUnit rewrite, `<sha7>_t<n>`, a bare prefix constant), which the brief asks for where a runner cannot put a hyphen in a name; no origin path was named. Since every id holds the sha7, the rule now counts 8 or more characters of the fix hash (never in an id) or an origin path (commit 2b2d51a, test updated). Pass 2 (20:20:36Z-20:23:34Z) re-judged every run from its record (`reused`) and ran the one task that had become servable meanwhile (s2-05).

Real-estate, 52 source commits, every writer ran once (exit 0): entries 201, written 201, refused 0, `interface: none` 49, severity high 66 / medium 93 / low 42. Four commits got an empty manifest (58e8819, 730509b, edf7c3a, fb7a2d9: each has 1 in-scope hunk and 1-3 test files; the prompts hold both sections; the writers read little, 0.2-0.3 min). Per run (written / of them `interface: none`): 0055e9b 3/0, 042d3a6 6/3, 090f6f2 9/9, 0b0d76c 5/0, 0fd75c2 2/0, 134138f 14/4, 1b16df7 3/0, 24c426f 10/3, 29f4daf 3/0, 3137149 2/0, 36d089b 1/0, 3e4ff59 1/0, 400f58a 2/0, 4e380c0 1/0, 4f24a01 3/0, 56b368f 9/0, 56ed9af 1/0, 58e8819 0, 58f684b 1/0, 5b6646d 5/0, 5eced48 7/0, 6488108 1/0, 69ebe27 1/0, 6c69b33 8/8, 6cedf96 3/2, 730509b 0, 73ca3de 2/0, 7ade13e 4/0, 89583d2 3/0, 8eccb47 2/1, 94f26c7 1/0, a5e0cd3 4/4, b4b701e 1/0, b5b3cec 1/1, b5fe07f 2/0, c05ffaa 3/0, d005fa5 2/0, d38656b 1/0, d60002f 5/0, d67e5b7 11/3, dab24ed 3/0, dcfbf0f 2/0, dd56b84 7/3, e065697 6/0, e3cf8ef 4/0, e41d45f 14/2, eb2b016 11/1, edf7c3a 0, f39ebcf 1/0, fad6198 9/5, fb7a2d9 0, fc12df9 1/0.

Per task (entries / `interface: none` / scorable before validation): p1 13/12/1, p2 31/3/28, p3 13/0/13, p4 19/0/19, p5 4/0/4, p6a 9/2/7, p6b 17/11/6, p6c 30/5/25, p7b 2/0/2, p7c 2/1/1, p8a 10/0/10, p8c 19/4/15, p8d 20/9/11, p8e 12/2/10 (p1, p7b and p7c are below rule (b)'s 3 before any validation).

External, 21 tasks written (the last serve line of each was `servable` when its write ran), entries 133, written 133, refused 0 (after the leak rule), `interface: none` 20, severity high 79 / medium 50 / low 4. Per task (entries / `interface: none`): s1-01 2/0, s1-02 1/0, s1-03 23/2, s1-04 23/0, s1-05 3/0, s1-06 3/0, s1-07 4/1, s1-08 6/6, s2-01 10/0, s2-02 2/1, s2-03 1/0, s2-04 10/10, s2-05 2/0, s3-01 6/0, s3-02 5/0, s3-03 3/0, s3-04 2/0, s3-05 8/0, s3-06 13/0, s3-07 1/0, s3-08 5/0. s1-08 and s2-04 hold only `interface: none` entries (no scorable check before validation). Skipped `no serve recipe`: s2-06 (`dropped not servable`), s2-07 and s2-08 (no serve verdict yet; Task 6 still running): rerun `write` for them once served, and for s2-06's replacement.

Writer usage (from their `.run.json`, all claude-opus-5-5, all exit 0): real-estate 52 runs input 836, output 378493, cache read 11008563, cache write 1469595, 61.5 agent-minutes; external 21 runs input 743, output 381616, cache read 27189335, cache write 1383799, 63.2 agent-minutes. Total input 1579, output 760109, cache read 38197898, cache write 2852394. Wall clock of the runs: probe 0.7 min, pass 1 41.5 min, pass 2 3.0 min.

Usage: implementer opus (this session), tokens and minutes recorded by the controller.

Notes for the controller (Task 8):

- Ruling 6 reading: 3 agreed commits have both an in-task and a later pair (36d089b: later p6a, in-task p8a; e3cf8ef: later p2, in-task p3; 5b6646d: later p4, in-task p8d). `write` gives a hunk a later pair lists to that pair's task and every other hunk to the in-task task. Result: 36d089b 1 check to p8a; e3cf8ef 2 to p2 and 2 to p3; 5b6646d 1 to p4 and 4 to p8d, so 3 checks went to the later pair's task (p2 2, p4 1). If the in-range rule should win for every hunk, a rule change and `write` on these 3 commits moves them (records reused, no new writer run).
- Leak rule narrowed from "the sha" to 8 or more characters of the hash (24 false positives in pass 1, above). The briefs' sentence before the change read "the only hash text in a file is the check id." (task repo) and "... is a check id." (external); no superseded copy was kept.
- Reading depth: task-repo writers averaged 1.2 agent-minutes and 4.7 Reads per run; the 4 empty-manifest runs used at most 1 Read and 0.2-0.3 min; some runs marked every check `interface: none` (090f6f2 9/9, 6c69b33 8/8, a5e0cd3 4/4; p1 12 of 13). No gate like Task 7's reading gate exists for the writers; whether to add one is open.
- Parallel moves: each task's manifest total equals the sum of its runs' printed counts for all 14 tasks, and each oracle's file count equals its checks with a file + manifest + 2 scaffold files + the `node_modules` link, so no move under the lock lost an entry.
- A repo's `serve.json` is shared by its tasks and a later task's serve rounds can rewrite it, so a graded oracle could run under a serve recipe its writer did not see (s1-07 and s1-08 reused theirs with rounds=0, so none so far).

Fix round 1 (task review and controller rulings; code commit 1af70b7):

- Prompts: pass 2 had rewritten 72 pass-1 prompt files (52 task-repo, 20 external) with the changed brief sentence before reusing their writers. Now `write` writes a prompt file only when a writer runs and adds `promptSha` to its run record; a reuse whose prompt would differ is refused (`refused 1 writer run whose prompt differs ...`, exit 1, nothing moved, no rerun). Data: both briefs were put back to the text every pass-1 writer saw (sha256 equal to the pass-1 copies: 42045022… task repo, 7c199777… external), so the hash sentence change above is withdrawn; a tool script (`/tmp/hstack-t8/restore-prompts.mjs`, counts only) replaced the changed sentence by the original in the 72 prompt files (72 replaced, 1 each) and wrote each file's sha256 into its run record as `promptSha`. Pass 3 then rebuilt every prompt and refused none (0 stale), so each prompt file on disk equals the prompt of its run. s2-05 had run in pass 2 under the changed sentence; its run (folder, reply, record, prompt, settings) moved to `s2-05/work/superseded/` and it ran again under the original brief (its superseded usage 42/16234/1137840/78619 counts as spend).
- Task-repo check rules are data, `<data>/briefs/oracle-re.json` (`suffix` `.spec.ts`, `imports` `["@playwright/test"]`, `kinds` browser, http, api, none): a check whose file is not `<id>.spec.ts` is refused `file`, one that imports any other module (or by a computed `require`/`import`) is refused `import`, a kind outside the list `interface`. External kinds unchanged.
- Rerun (controller ruling): a writer whose manifest is missing, empty or all `interface: none` runs once more as `-2` (same prompt, own folder, reply and settings, the first record kept); the second result stands.
- Tests: `write` tests assert no `SENTINEL` on every source-path run; new tests for import, file name, kinds, the rerun, the refused stale prompt, and the ownership override (a hunk both an in-task and a later pair list goes to the later pair's task). RED: 5 of the 6 new tests failed on the previous code (the ownership test passes there: it pins existing behaviour). `bun test tests/bench-oracle.test.mjs` 22 pass; `bun test ./tests` 319 pass, 21 skip, 0 fail.

Pass 3 (driver, 20:40:40Z-20:49:28Z, 8.8 min, 76 of 76 exit 0, logs `re-work/logs/`; pass 2's in `re-work/logs-pass2/`): 10 reruns, 2 new external writers, every other run reused with its prompt unchanged.

- Reruns (first / second, written and `interface: none`): 58e8819 0 / 0, 730509b 0 / 0, edf7c3a 0 / 0, fb7a2d9 0 / 4 (p7c, 0 none), b5b3cec 1 none / 1 (0 none), 090f6f2 9 none / 9 none, 6c69b33 8 none / 8 none, a5e0cd3 4 none / 4 none, s1-08 6 none / 5 none, s2-04 10 none / 10 none.
- New rules: c05ffaa refused 1 (`import`); no other refusal.
- s2-05 rerun 2 checks (0 none); s2-07 became servable and was written: 13 checks (4 none).

Totals after pass 3. Task repo: entries 205, written 204, refused 1 (import), `interface: none` 48, high 72 / medium 93 / low 39; three commits with no check (58e8819, 730509b, edf7c3a). Per task (entries / none / scorable before validation): p1 13/12/1, p2 30/3/27, p3 13/0/13, p4 19/0/19, p5 4/0/4, p6a 9/2/7, p6b 17/11/6, p6c 30/5/25, p7b 2/0/2, p7c 6/1/5, p8a 10/0/10, p8c 19/4/15, p8d 20/9/11, p8e 12/1/11 (p1 and p7b below rule (b)'s 3 before validation). External, 22 tasks: entries 145, written 145, `interface: none` 23, high 87 / medium 54 / low 4; s1-08 5/5 and s2-04 10/10 still hold only `interface: none`; s2-05 2/0, s2-07 13/4, the others as above. Skipped: s2-06 (dropped not servable), s2-08 (no verdict yet).

Usage of pass 3's new runs: 8 task-repo reruns 106/34431/1009556/145685; 4 external runs (s1-08-2, s2-04-2, s2-05, s2-07) 112/64352/2658697/239090. Writer totals for the task, superseded s2-05 run included: task repo 60 runs 942/412924/12018119/1615280 (67.8 agent-min), external 25 runs 855/445968/29848032/1622889 (74.1 agent-min); all claude-opus-5-5, all exit 0.

### Task 6

Step 5 serve check of the external tasks, run 2026-11-03 18:05Z–21:00Z (UTC) from this worktree (code bac5d8d; commits by other tasks landed on the branch during the run and touched `bench/sealed-agent.mjs` and `bench/lib/agent.mjs` additively, adding `toolUses` to `.run.json`, and did not touch `bench/ext.mjs`). Drivers: `<data>/ext/step5-serve.sh` (serve, one task at a time, pgsnap around each batch, stop on an error, a non-zero exit, or the first 4 tasks of a stack all `dropped not servable`) and `<data>/ext/step5-walk.sh` (the walk between two pgsnap snapshots). Logs in `<data>/ext/step5-logs/`.

- **Recipes.** `<data>/ext/step5-recipes.tsv` (`task slug reply sha256`, 24 rows) was taken from the table "The recipe of each sampled task" in `progress/step4-lock.md` and its hash block. s2-02 uses `ext/recipes/coder__xum/rounds/1.reply.md`. All 24 reply hashes matched (`shasum -c`) before `task-env` ran, and `task-env` itself checked each one.
- **input-check hits** (recorded, not enforced): s1-01 0, s1-02 0, s1-03 1, s1-04 1, s1-05 26, s1-06 8, s1-07 6, s1-08 3; s2-01 0, s2-02 3, s2-03 0, s2-04 6, s2-05 2, s2-06 6, s2-07 2, s2-08 2; s3-01 2, s3-02 19, s3-03 4, s3-04 9, s3-05 14, s3-06 23, s3-07 17, s3-08 5; replacement s2-09 6.
- **Serve verdicts** (`rounds` = this task's rows in its repo's `serve/<key>/rounds.tsv`; 0 for the second task of a repo means the saved serve recipe was reused):

| task | verdict | wall clock (UTC) |
|---|---|---|
| s1-01 | servable rounds=1 | 18:13:16 – 18:18:17 |
| s1-02 | servable rounds=1 | 18:18:17 – 18:30:31 |
| s1-03 | servable rounds=1 | 18:30:31 – 18:41:14 |
| s1-04 | servable rounds=1 | 18:41:14 – 18:57:28 |
| s1-05 | servable rounds=1 | 18:57:28 – 19:07:50 |
| s1-06 | servable rounds=1 | 19:07:50 – 19:17:18 |
| s1-07 | servable rounds=0 (netbox, reused) | 19:17:18 – 19:25:53 |
| s1-08 | servable rounds=0 (OpenContracts, reused) | 19:25:53 – 19:37:40 |
| s2-01 | servable rounds=1 | 19:37:40 – 19:43:47 |
| s2-02 | servable rounds=1 | 19:43:47 – 19:50:44 |
| s2-03 | servable rounds=1 | 19:50:44 – 19:58:00 |
| s2-04 | servable rounds=0 (xum, reused) | 19:58:00 – 20:02:54 |
| s2-05 | servable rounds=0 (cherry-studio, reused) | 20:02:54 – 20:08:08 |
| s2-06 | **dropped not servable** (3 rounds, each `build failed` at the base) | 20:08:08 – 20:13:15 |
| s2-07 | servable rounds=3 (`serve failed`, `serve failed`, `pass`) | 20:13:15 – 20:42:03 |
| s2-08 | servable rounds=1 | 20:42:03 – 20:48:24 |
| s2-09 | servable rounds=1 (replacement) | 20:54:38 – 20:59:46 |
| s3-01 … s3-08 | servable rounds=0 (empty serve recipe, no Docker) | 18:13:11 |

- **Drop and replacement.** s2-06 (OpenWhispr/openwhispr#2643) was `dropped not servable`. The three base build logs (readable) all fail at a layer step that the serve agent added to fetch or verify the app's desktop runtime binary. Round 1's installer exited 1. In round 2 the download finished but the step after it failed. In round 3 the binary was present, but the check resolved its path in the wrong directory. These are recipe mistakes, not network or disk signatures, so the drop stands. The guard did not fire, because the stack's first 4 tasks were served. Ruling 14: `walk s2 --remove-out` (20:48:47–20:54:23Z; 1 check, 1 recipe round) accepted kizuna-ai-lab/sokuji#361 (rank 14; `ok f2p=81 p2p=26`; `s2 tier 1: accepted 8, checked 1, list end no`). `sample` then gave it id s2-09, retired s2-06, and left every other id unchanged. `task-env --from-meta` and `serve` followed. Kept per stack: s1 8, s2 8, s3 8. `progress/step5/sample.tsv` (7cb47653…) and `progress/step5/walk.tsv` (4b8056dc…) are copies of the live `<data>/ext/` files; `progress/step4/*` is unchanged. The full rows differ from step 4 in one more place: `cold_setup` for s2 moved from s2-08 (super-productivity) to s2-09 (kizuna-ai-lab/sokuji). That is `coldSetup` read over the kept tasks: the repo whose best rank is the highest, now rank 14. s1 and s3 are unchanged (s1-06; s3-07 and s3-08).
- **Usage.** Serve agents: 17 runs (`ext/serve/*/rounds/*.run.json`, all code 0, all claude-opus-5-5), input 344, output 134,348, cacheRead 5,894,702, cacheWrite 831,145; 23.8 agent-minutes. Recipe agent of the walk: 1 run (`recipes/kizuna-ai-lab__sokuji/rounds/1.reply.md.run.json`, claude-opus-5-5), input 24, output 9,991, cacheRead 271,818, cacheWrite 33,363; 1.7 min.
- **Wall clock.** About 2 h 55 min in all: task-env 1 min, S3 serve under 1 s, S1+S2 serve 2 h 35 min, walk 5.6 min, s2-09 serve 5.1 min.
- **pgsnap equal** around every batch: s3, s12 (s1-01…s2-08), walk s2, s2r1 (s2-09). Each list was `postgres real_estate real_estate_hstack real_estate_hstack_test template0 template1`.
- **Docker.** Before and after: 330 container names and 174 image tags, with no difference in either list. All of them are leftovers from earlier fixture and step 4 runs plus the real-estate containers. Every `-serve` image and container was removed by recorded name (66 `-serve` names in `ext/removed.txt`; the walk's `--remove-out` removed the sokuji check's 10 names). No prune was run by hand. No serve run printed a prune or disk-low line (all stderr files are empty). BuildKit's cache went from 780 entries (23.6 GB) to 190 (28.8 GB), which suggests BuildKit's own garbage collection; it was not checked further.

### Task 10

External interface sheets (ruling 14), branch `worktree-agent-ae7e9651c5862a778`; code commit d3e4e3b (`oracle.mjs sheet`). Brief `<data>/ext/briefs/interface.md`: the real-estate brief's rules and reply format, stack-neutral (no stack, tool, repo or task named), with ruling 14's 23 kinds, one `##` section per page, window, command or API, no nested or indented bullets, and "read names from the product's code, never from a test, spec or fixture file". No database and no Docker in this task; pgsnap not run (it calls `docker exec`, and no run touches a database).

Runs (driver `<data>/ext/step5-sheet.sh`, `xargs -P 3`, logs `<data>/ext/step5-logs/sheet-<task>.log`, counts only): trial s1-01 21:13:39Z-21:13:49Z (0.2 min); the other 23 (s1-01 reused) 21:14:13Z-21:16:37Z (2.4 min). 24 of 24 exit 0, 24 sheets written, 0 failed, 0 reruns (`-2`), 0 refused for a changed prompt; each `interface.md` passes `bun bench/input-check.mjs` (24 PASS).

Per task, names (bullets kept) / deleted (lines `input-check` flagged): s1-01 11/0, s1-02 5/0, s1-03 15/0, s1-04 27/0, s1-05 26/0, s1-06 8/0, s1-07 16/0, s1-08 11/0; s2-01 33/0, s2-02 17/0, s2-03 15/0, s2-04 7/0, s2-05 31/0, s2-07 3/0, s2-08 10/0, s2-09 27/0; s3-01 8/1, s3-02 11/0, s3-03 3/0, s3-04 16/1, s3-05 49/0, s3-06 35/0, s3-07 15/0, s3-08 9/0. Totals: names 408 (s1 119, s2 143, s3 146), deleted 2.

Sheet agents' usage (24 `<task>/interface.reply.md.run.json`, all code 0, all claude-opus-5-5): input 201, output 22181, cache read 1548206, cache write 461666; 7.0 agent-minutes. Reading depth (`toolUses`): 1 to 10 tool calls per run (median about 4), 0.16-0.46 min per run; s1-01 1 Read, s1-07, s3-01 and s3-08 Grep only. No reading gate checks a sheet agent's reading, and `toolUses` holds counts, not paths, so whether an agent opened a test file at the end commit is not recorded.

Grounding check (counts only, `/tmp/hstack-bench/t10/names.mjs`): each parsed name looked up verbatim (`git grep -F` in the bare clone at the end) and in the task's input. Found in the end tree 375 of 408 (92%), in the input 180 of 408 (44%). Per task (in end tree / in input / names): s1-01 8/1/11, s1-02 5/3/5, s1-03 12/1/15, s1-04 27/7/27, s1-05 26/23/26, s1-06 8/2/8, s1-07 10/11/16, s1-08 11/6/11; s2-01 33/22/33, s2-02 17/12/17, s2-03 15/2/15, s2-04 7/5/7, s2-05 31/2/31, s2-07 3/1/3, s2-08 10/0/10, s2-09 27/1/27; s3-01 8/5/8, s3-02 9/7/11, s3-03 3/3/3, s3-04 16/4/16, s3-05 47/35/49, s3-06 18/14/35, s3-07 15/8/15, s3-08 9/5/9. Lowest in the end tree: s3-06 (18 of 35) and s1-07 (10 of 16); a name not found verbatim may be a qualified API name or a name the code builds, so these are flags, not failures. Brief sha256 996c00dc… (`ext/briefs/interface.md`, the brief every run's `promptSha` derives from).

Usage: implementer opus (this session), tokens and minutes recorded by the controller.

Fix round 1 (controller ruling and review; code commit b7a9da2): `sheet` now keeps a name only when it is verbatim in a non-test file at the end (`git grep -F -l` in the bare clone; a file `isTestPath` or the stack's `testPaths` match does not count), parses each bullet as `- <kind>: "<name>"` with one of the brief's 23 kinds (else deleted), deletes a whole section when input-check flags its `##` heading, drops a section left with no bullet, and prints `notfound=<k>` beside `deleted=<m>`. The 24 sheets were rebuilt from their saved replies (`/tmp/hstack-bench/t10/reapply.mjs`, an agent that throws if called; no new agent run, no `-2` file, no run record changed; log `<data>/ext/step5-logs/sheet-fix1.log`); each passes `input-check` (24 PASS).

Per task after fix round 1, names / deleted / notfound: s1-01 8/0/3, s1-02 5/0/0, s1-03 12/0/3, s1-04 27/0/0, s1-05 26/0/0, s1-06 8/0/0, s1-07 10/0/6, s1-08 11/0/0; s2-01 33/0/0, s2-02 17/0/0, s2-03 15/0/0, s2-04 7/0/0, s2-05 31/0/0, s2-07 3/0/0, s2-08 10/0/0, s2-09 27/0/0; s3-01 2/7/0, s3-02 9/0/2, s3-03 3/0/0, s3-04 8/9/0, s3-05 46/0/3, s3-06 18/0/17, s3-07 15/0/0, s3-08 9/0/0. Totals: names 360 (s1 107, s2 143, s3 110), deleted 16, notfound 34 (360 + 16 + 34 = the 410 bullets of the replies). s3-01 and s3-04 each lost a section whose heading input-check flags (6 and 8 bullets). Sheet agents' usage unchanged (no new run).

Fix round 2 (controller ruling): a `##` heading input-check flags is no longer deleted with its section. It becomes `## Unnamed section <n>` (`n` its position among the reply's `##` headings), and its bullets are judged like any other bullet. The 24 sheets were rebuilt from their saved replies again (same script, no agent run, no `-2` file, no run record changed; log `<data>/ext/step5-logs/sheet-fix2.log`); all 24 pass `input-check`.

Per task after fix round 2, names / deleted / notfound: s1-01 8/0/3, s1-02 5/0/0, s1-03 12/0/3, s1-04 27/0/0, s1-05 26/0/0, s1-06 8/0/0, s1-07 10/0/6, s1-08 11/0/0; s2-01 33/0/0, s2-02 17/0/0, s2-03 15/0/0, s2-04 7/0/0, s2-05 31/0/0, s2-07 3/0/0, s2-08 10/0/0, s2-09 27/0/0; s3-01 8/0/0, s3-02 9/0/2, s3-03 3/0/0, s3-04 16/0/0, s3-05 46/0/3, s3-06 18/0/17, s3-07 15/0/0, s3-08 9/0/0. Totals: names 374 (s1 107, s2 143, s3 124), deleted 0, notfound 34. Correction to fix round 1's sum: the replies hold 408 bullets (374 + 34), not 410. The "deleted=1" lines of s3-01 and s3-04 in the first run were section headings, not bullets, so fix round 1's deleted 16 counted those 2 headings plus 14 bullets.

Replacement external tasks' sheets (s1-09 replaces s1-08, s2-10 replaces s2-04), built with the verbatim name check, one sealed agent each, 0 reruns (`-2`): s1-09 names 14, deleted 0, notfound 9, input-check PASS (usage input 6, output 1205, cache read 25167, cache write 10694); s2-10 names 22, deleted 0, notfound 0, input-check PASS (usage input 20, output 2207, cache read 227074, cache write 26773). Sum: input 26, output 3412, cache read 252241, cache write 37467; model claude-opus-5-5 for both.

### Task 9

Validation, mechanics fixes and pre-existing moves (rulings 10–13), branch `worktree-agent-a4533c6b944478a71`. Code commits: d3878ad (`oracle.mjs validate` and `sweep`; `error` added to `UNSCORED` in `bench/lib/score.mjs`; `appendWalk` exported from `ext.mjs`; `runWriter` takes a fill and extra read folders), 97d3d94 (no app at the base, controller ruling), 79d41bf (the same rule for the sweep's boundaries, controller ruling), 171c605 (merge of the controller branch, Task 10's `sheet`). Briefs (data, English, stack-neutral): `<data>/briefs/fix.md` (sha256 ee179a7b…), `<data>/briefs/compare.md` (add83e3b…). Tests: the brief's seven plus 'a grade that throws records error for that commit's checks and the task goes on', 'a task-repo base without the app file is not run and gives precondition at the base', 'sweep reads a boundary without the app file as precondition for every check, with no run', and the score test 'unscored lists a check whose validation recorded error'. `bun test ./tests` 331 pass, 21 skip, 0 fail (one run under load from the sweep had a timing failure in `bench-arm.test.mjs` 'run-arm kills a turn that outlives turnTimeoutSec'; it passed alone and in the final full run).

Command forms: `validate <task.json> <task>` for a task of `tasks.json` (like `label` and `write`, the task repo's task file is an argument) and `validate <task>` for an external task; `sweep <task.json> --drop p8b,p8b1` (as `pairs` ran). Drivers and logs: `/tmp/t9/*.sh`, `<data>/logs/task9/` (printed lines only; the first runs of p1, p4, s2-03, s3-04, s3-05 are kept as `*-first.log`).

Controller rulings during the run:
- **No app at the base** (p1): its base 691a723 has no `package.json`, so setup fails there. A task file may name `appFile` (data: `"package.json"` added to `<data>/env/real-estate.json`); when the base lacks it (`git cat-file -e`), `validate` leaves `--base` out, sets every check's base result to `precondition` and takes the verdict again (stage `no app at base`); any other base that fails setup stays `error`. p1 revalidated with it: its 1 check `absent-at-base` (first run: `error`).
- **The same rule for the sweep**: a boundary commit without the app file reads `precondition` for every check, with no run. It was applied after the sweep's runs, without regrading them: `/tmp/t9/sweep-saved.mjs` ran `sweep` with a grade that reads each boundary's saved `sweep/grades/<sha7>.json` (it refuses a boundary whose file lacks a check or has no JUnit) and runs the real grade for the receivers' revalidation. The 9 checks the first sweep recorded as `none` all failed at p1's end and moved to p1.
- **Docker disk**: s3-04's base build died with ENOSPC (pnpm, readable base build log) and s3-05's base build failed at apt-get with "invalid signature" (the full-disk symptom); the same full disk stopped postgres in the real-estate lane during p4 ("could not write init file: No space left on device", 12 checks `error`). The tool's disk estimate read about 34 GB free (60 GB limit minus `docker system df` 25.7 GB) while builds hit ENOSPC, a known limit of the estimate (Docker.raw had about 49 GB allocated), so the floor never fired. Ruling: one `docker builder prune -f` by hand between tasks; run 2026-11-04T02:55:56Z–02:56:23Z, build cache 23.16 GB (233 entries) to 2.346 GB (24), 20.81 GB freed. No other prune, volume, compose or network command. s3-04, s3-05 and p4 were then validated again (`--reuse` kept their good runs). At the end the build cache was back at 23.4 GB (21.06 GB reclaimable).
- **s2-03 port**: its task port 49162 was held by another program on the host (not ours), so its first grade threw `port 49162 busy`; `<data>/env/s2-03.json` moved to the free port 49190 and it was validated again.
- **Replacements** (rulings 13 and 14): run by this task after the external lane, one Docker user at a time, s1 then s2.

Real-estate lane (bench_re, one task at a time, pgsnap before and after each batch, 20 batches, every pair equal: `postgres real_estate real_estate_hstack real_estate_hstack_test template0 template1`). First validation per task (checks with an interface / valid / weak / broken / error / pre-existing / absent-at-base / interface none; fixer rounds, changed, kept, refused):

| task | checks | valid | weak | broken | error | pre-existing | absent | none | rounds | changed | kept | refused |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| p1 (rerun, no app) | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 12 | 0 | 0 | 0 | 0 |
| p2 | 27 | 0 | 2 | 3 | 2 | 0 | 20 | 3 | 2 | 12 | 12 | 0 |
| p3 | 13 | 0 | 8 | 1 | 0 | 1 | 3 | 0 | 2 | 7 | 5 | 2 |
| p4 (first, full disk) | 19 | 0 | 1 | 0 | 12 | 0 | 6 | 0 | 2 | 7 | 6 | 1 |
| p4 (rerun) | 19 | 0 | 1 | 0 | 0 | 0 | 18 | 0 | 1 | 6 | 6 | 0 |
| p5 | 4 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 2 | 4 | 4 | 0 |
| p6a | 7 | 0 | 0 | 3 | 0 | 0 | 4 | 2 | 2 | 2 | 2 | 0 |
| p6b | 6 | 1 | 0 | 1 | 0 | 3 | 1 | 11 | 2 | 0 | 0 | 0 |
| p6c | 25 | 1 | 0 | 1 | 0 | 22 | 1 | 5 | 2 | 17 | 17 | 0 |
| p7b | 2 | 0 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| p7c | 5 | 0 | 5 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| p8a | 10 | 0 | 0 | 0 | 0 | 5 | 5 | 0 | 0 | 0 | 0 | 0 |
| p8c | 15 | 0 | 1 | 0 | 0 | 7 | 7 | 4 | 0 | 0 | 0 | 0 |
| p8d | 11 | 2 | 2 | 0 | 0 | 4 | 3 | 9 | 0 | 0 | 0 | 0 |
| p8e | 11 | 0 | 1 | 0 | 0 | 4 | 6 | 1 | 0 | 0 | 0 | 0 |

p2's 2 `error`: the fix parent 090f6f2 never gets ready (the app's font import fails at that commit; product-side start log), so validation 24c426f has no result there.

Sweep: pre-existing 47 (p3 1, p6b 3, p6c 22, p7b 1, p8a 5, p8c 7, p8d 4, p8e 4), 20 distinct boundaries graded once each, newest first (691a723 threw: no app), then with the no-app rule: moved 47, recorded 0. Moved to (receiver: owners and ids): p2 19 (p3 7ade13e-T1; p6c 4f24a01-T2, 4f24a01-T3, dab24ed-T3, e41d45f-T2 … e41d45f-T12 (11); p8a 56b368f-T2, 56b368f-T6; p8c eb2b016-T8, eb2b016-T9), p3 10 (p6c 042d3a6-T1, 4f24a01-T1, dab24ed-T1, dab24ed-T2; p8c 134138f-T1, -T2, -T9, -T10; p8d 5b6646d-T3, dd56b84-T1), p4 2 (p8d dd56b84-T3, 69ebe27-T1), p6a 7 (p6b fad6198-T2, -T3, -T4; p6c 24c426f-T5, 29f4daf-T1, 29f4daf-T3; p7b 3137149-T1), p1 9 (p6c 24c426f-T4; p8a 36d089b-T1, 56b368f-T5, 56b368f-T9; p8c 134138f-T8; p8e eb2b016-T1, -T2, -T10, -T11). Each owner's `moves.json` lists its moves. Receivers revalidated for the moved fix commits only (no fixer round), then p1 for its 9.

Real-estate final (after the moves; checks with an interface): p1 10 (absent 10; none 12), p2 46 (weak 2, broken 4, error 2, absent 38; none 3), p3 22 (weak 8, broken 1, absent 13), p4 21 (weak 1, absent 20), p5 4 (weak 4), p6a 14 (broken 3, absent 11; none 2), p6b 3 (valid 1, broken 1, absent 1; none 11), p6c 3 (valid 1, broken 1, absent 1; none 5), p7b 1 (weak 1), p7c 5 (weak 5; none 1), p8a 5 (absent 5), p8c 8 (weak 1, absent 7; none 4), p8d 7 (valid 2, weak 2, absent 3; none 9), p8e 7 (weak 1, absent 6; none 1). Totals: checks 156, valid 4, weak 25, broken 10, error 2, pre-existing 0 (47 moved), absent-at-base 115, interface none 48. Scored (valid or absent-at-base) per task, for rule (b) at the lock (≥ 3): p1 10, p2 38, p3 13, p4 20, p5 0, p6a 11, p6b 2, p6c 2, p7b 0, p7c 0, p8a 5, p8c 7, p8d 5, p8e 6.

External lane (Docker, one task at a time; `ext remove` of what each task's `docker.json` records after each pass; after the lane no `-serve` or `-grade` image or container is left, and the container list is the same 330 names). Per task (checks with an interface: valid / weak / broken / absent-at-base; none; fixer rounds, changed/kept):

s1-01 2: 2/0/0/0, none 0; s1-02 1: 1/0/0/0, rounds 1, 1/1; s1-03 21: 0/0/0/21, none 2, rounds 2, 22/22; s1-04 23: 0/0/0/23, rounds 2, 34/34; s1-05 3: 3/0/0/0; s1-06 3: 2/0/1/0, rounds 2, 0/0; s1-07 3: 2/1/0/0, none 1; **s1-08 0 checks, none 5: dropped no valid check**; s1-09 (replacement) 4: 4/0/0/0; s2-01 10: 6/0/0/4, rounds 2, 13/13; s2-02 1: 1/0/0/0, none 1; s2-03 1: 1/0/0/0 (rerun on port 49190); **s2-04 0 checks, none 10: dropped no valid check**; s2-05 2: 1/0/0/1; s2-07 9: 1/0/2/6, none 4, rounds 2, 0/0; s2-08 2: 2/0/0/0; s2-09 17: 7/0/0/10, none 72; s2-10 (replacement) 5: 1/0/0/4, none 3, rounds 1, 1/1; s3-01 6: 4/0/0/2, rounds 2, 2/2; s3-02 5: 0/0/0/5; s3-03 3: 1/2/0/0; s3-04 2: 2/0/0/0 (rerun after the prune); s3-05 8: 7/0/0/1 (rerun after the prune); s3-06 13: 2/0/0/11, rounds 1, 1/1; s3-07 1: 1/0/0/0; s3-08 5: 3/2/0/0. Kept tasks' totals: checks 150, valid 54, weak 5, broken 3, error 0, absent-at-base 88, interface none 83; every kept task has at least 1 scored check. Comparers refused no external change.

Writes and replacements: s2-08 `write`: entries 2, written 2, refused 0, none 0, severity high 2. s2-09 `write`: entries 89, written 89, refused 0, none 72, high 22 / medium 53 / low 14. s1-08 → `walk s1 --remove-out` (788 s, pgsnap equal; checked 2: fossasia/eventyay#4768 `out no fail-to-pass test`, we-promise/sure#4246 `ok f2p=4 p2p=46`; `s1 tier 1: accepted 8, checked 2, list end no`), `sample` gave it **s1-09**; `task-env --from-meta` (input-check hits 9), `serve` servable rounds=1 (295 s), `write` entries 4, written 4, refused 0, none 0, high 3 / medium 1, `validate` 4 valid. s2-04 → `walk s2 --remove-out` (939 s; checked 2: coder/xum#7086 `out no fail-to-pass test`, coder/xum#6616 `ok f2p=10 p2p=254`; accepted 8), `sample` gave it **s2-10** (24 rows); `task-env` (hits 0), `serve` servable rounds=0 (361 s, the repo's serve recipe reused), `write` entries 8, written 8, refused 0, none 3, high 4 / medium 2 / low 2, `validate` 1 valid, 4 absent-at-base. `progress/step5/sample.tsv` and `walk.tsv` updated from the live files. Two run notes: `write` reads a task's serve verdict from `ext/step5-logs/serve.tsv` (the serve driver's log), so s1-09's line (`s1-09 servable rounds=1`) was appended by hand and s2-10's by the replacement driver. And s1-09's first writer was killed when its premature start was stopped; its orphaned writer process was stopped too and its export folder removed, the killed run's record (code 143) discarded so the writer ran fresh (record kept as `logs/task9/s1-09-write-killed.run.json`); the orphan's `-2` run also left a record (`work/write-2.reply.md.run.json`); the oracle comes from the clean run alone. A concurrent duplicate validate of s1-09 in that mix-up was discarded and s1-09 validated again alone. Listing that orphan process printed the first lines of its prompt (the brief's opening, no task content).

Usage (`.run.json`, all code 0 unless said, all claude-opus-5-5). Fixers 47 runs: input 904, output 218,400, cache read 15,073,772, cache write 1,763,903; 40.8 agent-minutes. Comparers 38 runs: input 76, output 7,885, cache read 63,460, cache write 322,406; 4.6 agent-minutes. Per task (fixer runs / comparer runs): p2 8/6, p3 4/4, p4 8/8, p5 2/2, p6a 3/2, p6b 2/0, p6c 5/5, s1-02 1/1, s1-03 2/2, s1-04 2/2, s1-06 2/0, s2-01 2/2, s2-07 2/0, s2-10 1/1, s3-01 2/2, s3-06 1/1. Writers: s2-08 input 44, output 16,641, cache read 1,151,628, cache write 83,262; s2-09 82 / 63,191 / 6,617,807 / 219,136; s1-09 60 / 22,216 / 1,830,297 / 77,515, plus the orphan's `-2` run 58 / 21,750 / 1,444,893 / 78,975 and the killed run (code 143) 18 / 95 / 202,888 / 29,229; s2-10 58 / 26,663 / 2,346,773 / 114,323. Replacement agents: we-promise/sure recipe round 1: 16 / 11,464 / 113,567 / 23,016; its serve round 1: 20 / 8,175 / 224,392 / 36,187 (coder/xum reused its recipe and serve recipe: no agent).

Wall clock (local +0700, 2026-11-04): real-estate lane 04:13–22:11 (about 18 h; p2 3.4 h, p4 1.6 h + 1.4 h, p6c 1.2 h, sweep 6.4 h, the no-app sweep and p1's revalidation 14 min); external lane 04:25–about 11:00 (about 6.6 h); replacements about 11:00–11:55 and the s1-09 rerun.

Concerns: the real-estate oracles score almost only through `absent-at-base` (115 of 119 scored), and 25 checks are `weak`; p5, p7b and p7c have no scored check and p6b and p6c 2 each, below rule (b)'s 3. A check whose fixer change was refused stays `broken` (10 real-estate, 3 external). A fixer round already spent is not run again for the same round folder when its prompt changes (the record is refused), so a revalidation after a rerun gets no new fixer round for those refs.

Usage: implementer opus (this session), tokens and minutes recorded by the controller.

Fix round 1 (task review; code commit 93dcc76):
- The README held merge-conflict markers from 171c605 (usage block and the validate/sweep vs sheet paragraphs). Both sides are kept and the markers removed. No marker is left in the tree.
- A comparer's `same` no longer admits a file on its own. `fixRound` now holds every kept file to the writer's gates (`gateFails`): no `leak` (8 or more characters of the fix commit's hash, or the path of an origin of that commit's checks); for a task-repo check, the `imports` rule of `briefs/oracle-re.json`; for an external `runner.json`, `parseRunner` and RUN-only lines. A file that fails is refused and counted as `gate refused`. The printed line now reads `changed, kept, comparer changed, gate refused, out of scope`. New test: 'a fixed file the comparer calls same is still refused when it fails the writer's gates' (task-repo import and leak, external runner.json and origin path).
- Tool-only recheck of every oracle as it stands (`<data>/logs/task9/drivers/gate-recheck.mjs`, counts only). It checked 321 check files and runner.json files across all oracles: 0 fail a gate. So 0 files were restored and 0 tasks revalidated.
- Counters corrected (`compare-count.mjs`, counts only, over the saved comparer prompts and replies). The comparers were shown 129 items and called 3 `changed`: p3 2, p4 1 (the first p4 run). Out-of-scope discards were 0 in every run: each `refused` in the tables above is a comparer `changed`. No gate refusal was possible during the run, and the recheck finds none.
- The script that applied the no-app rule to the sweep's saved results is `<data>/logs/task9/drivers/sweep-saved.mjs`. The lane drivers (`re*.sh`, `ext*.sh`, `repl*.sh`, `val1.sh`) and the counting scripts (`usage.mjs`, `tally.mjs`) are in the same folder.
- Controller ruling: s1's cold-setup repo moved from paperless-ngx (s1-06) to we-promise/sure (s1-09). Ruling 13 is read over the kept tasks: `sample` marks s1-09 `cold_setup yes`. The other `yes` rows are s2-09, s3-07 and s3-08.
- Controller rulings recorded: an external task with no scored check but some `error` checks is `not judged` (rerun), not dropped, because a machine failure is never an out. A check moved by the sweep gets no fixer round at its receiver (ruling 12's partial revalidation), so a moved check that is broken there stays broken.

### Task 11

Two classifiers, split, and the step 9 queue (rulings 15 and 16; prereg 6.3 and 7.2). Branch `worktree-agent-a0df6cafb343865d6`. Code commits:
- 27cb84f: `oracle.mjs classify`, `split`, `queue`
- 04c38d6: test helper renamed
- 1ddae5f: fix round 1 (split ids kept in the run record, validation of every new check without a verdict, a round fails when a rater leaves nothing labelled, 7.2 sample from agreed labels only, read counts in the run record)
- 03dc4c2: merge of Task 9's branch; split validates through the `validate` command
- de9ef2c: reading gate
- e24d116: merge of main c3f4d32

Briefs, data, in English, naming no repo, task or stack: `<data>/briefs/classify.md` (the 6.3 rule verbatim, the sheet clause, label definitions that name selectors and setup values too, reply `[{ id, label, quotes, steps }]`) and `<data>/briefs/split.md`. Drivers: `/tmp/t11-briefs/drive.mjs` (at most N tasks at a time) and `batch.sh` (one task at a time, real-estate batch ends with pgsnap). Their printed lines are in `/tmp/t11-briefs/logs/`; counting scripts `runs.mjs`, `splitv.mjs`, `final.mjs` and `fixruns.mjs` read only run records, `validation-*.json`, and labels or agreement files as counts.

Command forms: `classify|split <data>/env/real-estate.json <task>` for a task of `tasks.json`, and `classify|split <task>` for an external task. The set names `queue` prints are `task-repo` and `external`.

Kept tasks: real-estate p1, p2, p3, p4, p5, p6a, p6b, p6c, p7b, p7c, p8a, p8c, p8d, p8e; external, the 24 rows of the live `ext/sample.tsv`. Skipped with no scored check: 3 (p5, p7b, p7c). Classified: 35 (11 real-estate, 24 external).

Classify (2026-11-04). p1 ran alone first, 15:21:54Z–15:22:21Z; both raters read only inside the folder (`readsInFolder` = `reads`). The other 34 tasks plus the 3 skipped ones ran 3 at a time, 15:23:04Z–15:28:03Z. 70 rater runs, all code 0, 0 bad-reply reruns.

Reading gate (controller ruling: the source labellers' gate; trigger only the count, never the labels). A rater run that read fewer of its folder's files than the folder holds is run once more, and the rerun stands. 10 of 70 first runs were under the count:
- p1 r2 7/13
- p2 r1 15/41 and r2 23/41
- p3 r1 12/16
- p4 r1 9/23 and r2 7/23
- p6a r2 9/14
- p8c r2 7/10
- s1-04 r1 21/26
- s3-05 r1 6/11

Their reruns ran 15:33:20Z–15:35:11Z. Rerun reads:
- p1 6/13
- p2 19/41 and 17/41
- p3 11/16
- p4 7/23 and 7/23
- p6a 14/14
- p8c 10/10
- s1-04 26/26
- s3-05 6/11

So 4 reruns read every file and 6 still under-read; those stand by the ruling.

Per task, before the gate → after it (classified / build / requirement / partly / disputed, κ / raw / AC1). Only these changed:
- p1: 10/0/9/1/0, 1.00/1.00/1.00 → 10/0/9/0/1, 0.00/0.90/0.90
- p2: 38/2/29/4/3, 0.76/0.92/0.91 → 38/3/30/3/2, 0.83/0.95/0.94
- p3: 13/0/9/3/1, 0.81/0.92/0.90 → 13/0/7/3/3, 0.49/0.77/0.70
- p4: 20/0/19/1/0, 1.00 → 20/0/19/0/1, 0.00/0.95/0.95
- p6a: 11/0/9/1/1, 0.62/0.91/0.90 → 11/0/9/0/2, 0.00/0.82/0.80
- s1-04: 23/2/13/4/4, 0.68/0.83/0.76 → 23/2/13/6/2, 0.85/0.91/0.88

The rest, as classified (κ / raw / AC1 1.00 unless given):
- p6b 2/1/1/0/0
- p6c 2/0/1/1/0
- p8a 5/0/2/3/0
- p8c 7/0/7/0/0
- p8d 5/0/5/0/0
- p8e 6/0/5/1/0
- s1-01 2/0/2/0/0
- s1-02 1/1/0/0/0
- s1-03 21/4/11/5/1, 0.92/0.95/0.93
- s1-05 3/0/2/1/0
- s1-06 2/0/1/1/0
- s1-07 2/1/0/1/0
- s1-09 4/2/0/2/0
- s2-01 10/3/7/0/0
- s2-02 1/1/0/0/0
- s2-03 1/0/0/1/0
- s2-05 2/1/1/0/0
- s2-07 7/5/2/0/0
- s2-08 2/0/1/1/0
- s2-09 17/2/12/2/1, 0.86/0.94/0.93
- s2-10 5/1/3/1/0
- s3-01 6/0/5/1/0
- s3-02 5/5/0/0/0
- s3-03 1/1/0/0/0
- s3-04 2/1/0/1/0
- s3-05 8/1/5/1/1, 0.74/0.88/0.84
- s3-06 13/4/2/5/2, 0.76/0.85/0.77
- s3-07 1/1/0/0/0
- s3-08 3/2/0/0/1, 0.40/0.67/0.56

(A κ of 0.00 with raw 0.90 or more is one disagreement on a task whose labels are almost all one class.)

Pooled interim `queue`:

| set | checks | before the gate: κ / raw / AC1 | after the gate: κ / raw / AC1 | usable |
|---|---|---|---|---|
| task-repo | 119 | 0.86 / 0.96 / 0.95 | 0.73 / 0.92 / 0.91 | yes |
| external | 142 | 0.89 / 0.93 / 0.90 | 0.91 / 0.94 / 0.92 | yes |

Merge of main c3f4d32 (Task 9 complete, no task to reclassify): conflicts only in the README. `bun test ./tests`: 343 pass, 21 skip, 0 fail, output clean.

Split: one task at a time, 40 agreed partly checks in 19 tasks (task-repo 11 in 5 tasks; external 29 in 14). 40 splitter runs, all code 0, 0 `cannot split`, 0 refused by the writer rules, 0 stale. Each made 2 new checks, 80 in all. They were validated by Task 9's `validate`; the 10 fixer/comparer runs it made are counted in the usage below.

Real-estate lane, on bench_re. pgsnap before, after the kill's cleanup, and after the lane: all equal (`postgres real_estate real_estate_hstack real_estate_hstack_test template0 template1`).
- The first attempt started about 15:37Z and was stopped at 17:38Z by the agent shell's 2 h limit while `validate` graded p2. It left the worktree `/tmp/hstack-bench/re-grade-090f6f2` and the databases bench_re and bench_re_test. I removed the worktree with `git worktree remove --force` and `prune` in the copy, dropped both databases with the task's `teardown.sh`, and pgsnap was then equal again.
- The restart ran detached (`nohup`), 17:40:46Z–20:00:35Z: p2 0.4 min (its 6 new checks already had verdicts, so `validate` was not run again), p3 90.5 min, p6c 16.0 min, p8a 15.1 min, p8e 17.9 min.

External lane, Docker. Before it, `docker builder prune -f` (build cache 23.4 GB; 21.06 GB reclaimed; controller ruling). The lane ran 20:02:20Z–23:24:40Z (3.4 h). Afterwards images 35 and containers 330 were as before, and the build cache was 22.2 GB.

Per task, new checks by verdict and the split round (classified / build / requirement / disputed):
- p2 6 (absent-at-base 4, weak 2): 4 / 1 / 3 / 0
- p3 6 (absent 3, weak 3): 3 / 0 / 2 / 1
- p6c 2 (absent 1, weak 1): 1 / 0 / 1 / 0
- p8a 6 (absent 3, weak 3): 3 / 0 / 3 / 0
- p8e 2 (absent 1, weak 1): 1 / 0 / 0 / 1
- s1-03 10 (absent 7, broken 3): 7 / 4 / 3 / 0
- s1-04 12 (absent 11, broken 1): 11 / 2 / 8 / 1
- s1-05 2 (valid 2): 2 / 1 / 1 / 0
- s1-06 2 (broken 2): 0
- s1-07 2 (valid 2): 2 / 1 / 1 / 0
- s1-09 4 (valid 2, weak 2): 2 / 2 / 0 / 0
- s2-03 2 (valid 1, weak 1): 1 / 1 / 0 / 0
- s2-08 2 (valid 2): 2 / 1 / 1 / 0
- s2-09 4 (broken 4): 0
- s2-10 2 (absent 2): 2 / 1 / 1 / 0
- s3-01 2 (broken 2): 0
- s3-04 2 (valid 1, weak 1): 1 / 1 / 0 / 0
- s3-05 2 (valid 2): 2 / 1 / 1 / 0
- s3-06 10 (broken 10): 0

Totals for the new checks: valid 12, absent-at-base 32, weak 14, broken 22; 44 scored and classified (30 rater runs, 0 reruns), 3 disputed.

Final labels (`labels.json`, counts):
- task-repo: build 5, requirement 104, disputed 11
- external: build 53, requirement 83, disputed 9

Per task (build / requirement / disputed):
- p1 0/9/1, p2 4/33/2, p3 0/9/4, p4 0/19/1, p6a 0/9/2, p6b 1/1/0, p6c 0/2/0, p8a 0/5/0, p8c 0/7/0, p8d 0/5/0, p8e 0/5/1
- s1-01 0/2/0, s1-02 1/0/0, s1-03 8/14/1, s1-04 4/21/3, s1-05 1/3/0, s1-06 0/1/0, s1-07 2/1/0, s1-09 4/0/0
- s2-01 3/7/0, s2-02 1/0/0, s2-03 1/0/0, s2-05 1/1/0, s2-07 5/2/0, s2-08 1/2/0, s2-09 2/12/1, s2-10 2/4/0
- s3-01 0/5/0, s3-02 5/0/0, s3-03 1/0/0, s3-04 2/0/0, s3-05 2/6/1, s3-06 4/2/2, s3-07 1/0/0, s3-08 2/0/1

Final `queue`, exit 0: labels 12, classify 20, sample-7.1 40 (task-repo 10, s1 10, s2 10, s3 10), sample-7.2 40 (20 per set), inputs 4 (2 per set). Pooled over the first rounds:
- task-repo: 11 tasks, 119 checks, κ 0.73, raw 0.92, AC1 0.91, usable yes
- external: 24 tasks, 142 checks, κ 0.91, raw 0.94, AC1 0.92, usable yes

Usage (`.run.json`, all code 0, all claude-opus-5-5):
- Classify, 80 rater runs including the 10 gate reruns: input 620, output 184,087, cache read 2,743,912, cache write 1,238,741.
- Splitters and split-round raters, 70 runs: input 528, output 184,239, cache read 2,258,336, cache write 877,127.
- Fixer and comparer runs made by `validate` during the split lanes, 10 (s1-05 2, s1-07 3, s2-03 2, s2-09 2, s3-06 1): input 96, output 17,682, cache read 782,303, cache write 172,924; 4.0 agent-minutes.

Wall clock (2026-11-04, UTC):
- classify 15:21:54–15:28:03
- gate reruns 15:33:20–15:35:11
- real-estate split about 15:37–17:38 (stopped) and 17:40:46–20:00:35
- external split 20:02:20–23:24:40

Concerns:
1. Of the 40 split checks, 9 now have no scored half: s1-06 1, s2-09 2, s3-01 1, s3-06 5 (all 10 of s3-06's new checks are `broken`). Each original was an agreed `partly` check, and it is now `dropped` with `split_into`. So those behaviours left both buckets, where 6.3's "if not [splittable], it goes to the requirement bucket" would have kept them as `requirement`. This is likely the noted risk for external runners: a check file that the runner does not pick up, or a target that does not build. The controller may want such an original restored as `requirement`.
2. Splitting made 14 `weak` halves (10 of them task-repo), most likely the half whose assertions the known-bad version already meets.
3. Six gate reruns still read only part of their folder (p1, p2 ×2, p3, p4 ×2, s3-05). They stand by the ruling.
4. Task-repo build checks remain few: 5 of 109 labelled.

Usage: implementer opus (this session); tokens and minutes are recorded by the controller.

Controller ruling on concern 1 (prereg 6.3: "split into two checks at assertion level when possible; if not, it goes to the requirement bucket"): a split none of whose new checks is scored (`valid` or `absent-at-base`) did not split the check. `split` restores the original: `dropped` and `split_into` are cleared, it gets `restored_from_split` with its new ids so it is never split again, it keeps its earlier verdict, and it gets `requirement` in `labels.json`. Its new checks get `dropped: true`, `drop_reason: "split gave no scored half"`. A split with at least one scored half stands. Code commit c7bed6a, with test 'a split none of whose new checks is scored restores the original as requirement'. `bun test ./tests`: 344 pass, 21 skip, 0 fail, output clean.

Applied by rerunning `split` on the 19 split tasks one at a time. No agent ran and no validation ran; pgsnap was equal before and after. Restored 9 originals: s1-06 1, s2-09 2, s3-01 1, s3-06 5. Their 18 new checks were dropped. The other 31 splits stand.

Labels before → after:
- external: build 53 → 53, requirement 83 → 92, disputed 9 → 9
- s1-06: requirement 1 → 2
- s2-09: requirement 12 → 14
- s3-01: requirement 5 → 6
- s3-06: requirement 2 → 7
- task-repo: unchanged (build 5, requirement 104, disputed 11)

`queue` after the restore, exit 0: labels 12, classify 20, sample-7.1 40, sample-7.2 40, inputs 4. Pooled agreement is unchanged (it is taken over the first rounds): task-repo κ 0.73, raw 0.92, AC1 0.91, usable yes; external κ 0.91, raw 0.94, AC1 0.92, usable yes.

Phase B fix round 1, from the review (code commits 1b09558 and 1864c9f):
1. Stale fixer runs. Split validation had refused 13 fixer runs as stale, because Task 9's `work/fix-<round>/<ref7>` records existed under the same labels. The refused runs, by ref and round: p3 b4b701e 1 and 2, p6c 042d3a6 1 and 2, s1-03 3ddc164 1 and 2, s1-04 ed73235 1 and 2, s1-06 a564539 1 and 2, s3-01 a3035cf 1 and 2, s3-06 73d4686 1. Controller ruling: ruling 11 applies to split checks like any check. Split's validation now has its own fixer folders and labels (`work/fix-split-<round>/`, `fix-split-<round>-<task>-<ref7>`, `compare-split-<round>-...`). Its fixer rounds cover only the split's new `broken` checks, at most 2 rounds, with comparer and gates as in `validate`. The refs are the split originals' fix commits.
2. The split pass now runs once per original (`agreement.json` `splitDone`). An original with a new check that has no verdict or is `error` is not judged, so it is neither restored nor decided. A restore first undoes an earlier one: the split's files and entries are put back, so its new checks are validated and fixed too. A restore takes the split's files out of the oracle: new checks' own files are removed, and a shared (grouped) file goes back to its `in/` copy from before the first split of it. The original is then graded again (`validate` on its fix commit, no fixer rounds) for its own verdict. The cause, as the review found: the split's validation had rewritten `validation-<ref7>.json` without the then-dropped original, and in s3-06 the restored originals' code was no longer in their shared file, so they were `broken`. Tests:
   - 'a split none of whose new checks is scored restores the original as requirement, through validate and grade' (real `validate`, a fake `grade`)
   - 'restoring a split of a shared file puts the file back as it was before the split'

   `bun test ./tests`: 345 pass, 21 skip, 0 fail, output clean.
3. Applied to the 19 split tasks one at a time.
   - Real-estate (2026-11-04 23:46Z, pgsnap equal before and after): every grade was reused, there were no fixer rounds (no split check `broken`), and nothing changed. The p3 and p6c refusals were for `broken` checks that are not split checks, which split's rounds do not cover.
   - External, 23:47Z–01:37Z (`docker builder prune -f` first, 19.89 GB): s1-03 kept 3 fixes, s1-04 kept 1 and s1-06 kept 1. s1-06's earlier restore was undone, because its split now has a scored half. s2-09 (2), s3-01 (1) and s3-06 (5) were restored again (fixes kept 0).
   - Settle pass, 01:43Z–02:36Z (prune first, 22.79 GB): the 8 restored originals' files were taken out (s3-06's shared files back to their first version) and the originals graded again. Their verdicts: s2-09 valid 1 and absent-at-base 1, s3-01 valid 1, s3-06 absent-at-base 4 and valid 1. All 8 are scored, so 0 restored originals are `broken`.
   - A last `split` over all 19 tasks did nothing (split 0, restored 0, settled 0, nothing classified).

New checks after the round: valid 14, absent-at-base 36, weak 14, and 16 dropped with their 8 restored originals (before: valid 12, absent-at-base 32, weak 14, broken 22). Split-round classification: s1-03 `classify-split2` (3 checks), s1-04 `classify-split2` (1), s1-06 `classify-split` (2).

Labels before → after:
- external: build 53 → 55, requirement 92 → 95, disputed 9 → 9
- s1-03: build 8/14 → 9/16 (build/requirement)
- s1-04: requirement 21 → 22
- s1-06: build 0/2 → 1/2 (build/requirement)
- task-repo: unchanged (build 5, requirement 104, disputed 11)

`queue` (exit 0): labels 12, classify 20, sample-7.1 40, sample-7.2 40, inputs 4. Pooled agreement unchanged: task-repo κ 0.73, raw 0.92, AC1 0.91, usable yes; external κ 0.91, raw 0.94, AC1 0.92, usable yes.

Usage of this round (claude-opus-5-5): 14 fixer/comparer runs (s1-03 2, s1-04 2, s1-06 3, s2-09 2, s3-01 2, s3-06 3): input 146, output 30,363, cache read 1,196,969, cache write 249,262; 6.7 agent-minutes. 6 split-round rater runs: input 36, output 6,384, cache read 102,646, cache write 39,230.

### Task 12

The lock, `progress/step5-lock.md` (2026-11-05). This task ran no sealed agent, no Docker command other than the two listings, and no database command.

- **Env files.** `<data>/logs/task12/env-oracle.mjs` rewrote the `oracle` field of the 27 external `env/s*.json` files to the main checkout's `bench/ext.mjs`. No other field changed: `changed 27, already main 0`.
- **Checks.** Every kept task has an oracle and validations. The 35 classified tasks have both classifications; p5, p7b and p7c were skipped, with no scored check. No `-serve` or `-grade` name is left in the Docker listings: 328 fixture containers and 162 fixture images remain. `git status --short bench` is empty, and the tree has no conflict marker.
- **Counts.** `labels` and `queue` were run again. Their files had the same SHA-256 before and after. A counts-only script read the manifests, and its totals reconcile with the Task 9 and Task 11 records.
  - Real-estate: 167 checks with an interface, 120 scored.
  - External: 171 checks with an interface, 159 scored.
- **Hashes.** 1367 files.

Usage: implementer opus, 197.6k tokens / 13.1 min (from the controller); reviewer sonnet. Sealed agents: none. Wall clock of the task: about 02:30Z–02:55Z.

### SDD ledger of step 5 (copied before the final review)

    # SDD ledger — plan: docs/plans/2026-11-03-bench-oracles.md
    
    Spec: docs/plans/2026-10-27-benchmark-prereg.md (reachable). Plan approved by the user 2026-11-03 ("Duyệt"), plan commit 3becd2e.
    
    Ruling: the user's "Duyệt" approves the plan as written, including its two proposals (Docker removal of step 5's own images/containers by exact recorded name as soon as the step that built them ends, digests kept, `docker builder prune -f` below the floor; label disagreements wait for step 9) — why: both are written into the plan under "Decided by the user (asked with this plan)" and the user approved without amending — cost if wrong: Task 1 registers them as the user's decisions; an undo is a dated prereg amendment and keeping images (disk fills sooner).
    
    ## Pre-flight scan
    
    | tasks | shared file / interface | produced vs consumed | finding |
    |---|---|---|---|
    | T2→T3 | `oracleSha` | T2 `(files:{path,text}[])->string`; T3 hashes oracle folder without node_modules | consistent |
    | T2→T7 | `hunkOwners` | T2 Map keyed commit\tfile\told; T7 pairs | consistent |
    | T2→T9 | `introducer` | T2 boundaries newest first {task,base,end}; T9 sweep runs each distinct boundary once and maps results per task | consistent (T9 builds per-task base/end from per-commit results) |
    | T2→T11 | `agreement`,`usable`,`mergeLabels`,`queuePick` | signatures match T11 use; queuePick uses lib/ext `sortKey` | consistent |
    | T3↔T5 | `start: null`, `--sealed`, oracle command | T5 oracle-run is the task's `oracle`; timeoutSec 7800 | consistent |
    | T4↔T5 | `bench/ext.mjs`, `tests/bench-ext-check.test.mjs`, `docker.json`, `serve.json`, `task-recipe.json` | T4 serve must remove its images "as decided"; T5 defines `ext remove <task>` | CONFLICT (order): T4 needs removal before T5 exists |
    | T4↔T6 | `task-env`, `serve`, `sample` ids, `step5-recipes.tsv` | T6 runs T4's commands | consistent |
    | T6↔T9 | drops → ruling 14 loop | T9 Step 3 returns to T6 Step 3 | consistent |
    | T7↔T8 | `labels.tsv source yes`, `pairs.tsv hunks` | T8 writer per source commit with its in-scope hunks and owners | consistent |
    | T8↔T9 | manifest `{id, fix_commit, task, hunk, origin, behaviour, interface, severity}` | grade matches `fix_commit` to ref; fixer reads `origin` | consistent |
    | T8↔T11 | manifest stripped of fix_commit, origin, hunk, task for raters | consistent |
    | T9↔T11 | `split` → validate + classify new checks | T11 calls T9's validate | consistent |
    | T10→T11 | sheet before classify | order T10 then T11 | consistent |
    | T3↔T9 | `grade --validate` throws on missing JUnit | T9 records `error` and continues | consistent |
    | T1 | prereg paragraph | records "Decided by the user" | needs the approval ruling above |
    | T6↔T12 | `progress/step5/{sample,walk}.tsv` | step 4 copies untouched | consistent |
    
    | task | self-consistency |
    |---|---|
    | T1 | consistent |
    | T2 | tests cover each export; consistent |
    | T3 | Files include score.mjs + bench-score test for verdict change; consistent |
    | T4 | serve removes images but no remove helper yet (see conflict row) |
    | T5 | consistent |
    | T6 | run task, no code; consistent |
    | T7 | (c) check reads real-estate code (not sealed); consistent |
    | T8 | consistent |
    | T9 | Interfaces add `sweep`; tests named; consistent |
    | T10 | consistent |
    | T11 | consistent |
    | T12 | consistent |
    
    Ruling: T4 implements the shared removal helper (remove the names a task's `docker.json` records, by exact name, never `-f`, digests kept) and uses it after each serve check; T5 adds the `ext remove <task>` command over that helper and its decoy test — why: T4's serve already needs removal and the plan puts the command in T5 — cost if wrong: none beyond where the helper lives.
    
    ## Tasks
    Task 1: implementer sonnet 68.0k/1.3 min, commit 9a0ca9a; review sonnet 67.3k/0.7 min: spec ✅, Approved. ⚠️ ruling 10 of 4.2 names the step 5 serve check — controller confirmed (prereg 4.2 ruling 10: "checked in step 5").
    Task 1: minor (deferred): prereg 7.1 step 5 Docker bullet "Without it, 7.6 GB fills…" has no antecedent after "Proposed:" was dropped.
    Task 1: minor (deferred): intro does not say whether the user's approval also covers rulings 1–16 (they read "proposed by the step 5 plan").
    Task 1: complete (commits 3becd2e..9a0ca9a, review clean)
    Task 2: implementer sonnet 64.5k/2.4 min, commit 1882391; review sonnet 63.0k/0.9 min: spec ✅, Approved.
    Task 2: minor (deferred): hunkOwners gives order[0] to a hunk none of whose tasks is in `order` (callers pass every tasks.json key).
    Task 2: minor (deferred): agreement does not reject a label outside `categories`; mergeLabels maps any other agreed label to requirement and lets duplicate ids overwrite.
    Task 2: complete (commits 9a0ca9a..1882391, review clean)
    Task 3: implementer opus 131.2k/13.0 min, commit 299ab51; review opus 95.8k/2.4 min: spec ✅, Needs fixes (1 Important: symlink in oracle folder crashes the always-on hash). ⚠️ logs land in dirname(oracle) = <data>/<task>/logs — controller confirmed: plan puts oracles at <data>/<task>/oracle, and logs/ is in the sealed list.
    Task 3: minor (deferred): oracle-folder walker lives in grade.mjs, not lib/oracle.mjs (Task 9 calls grade by CLI, so no second walker).
    Task 3: minor (deferred): a sealed run that throws before the oracle leaves an empty log; tests do not assert start log kept in sealed mode nor no log on reuse.
    Task 3: minor (deferred): a no-app task still needs a free dummy port (Task 4 assigns 49152+index); oracle files written into the oracle folder would defeat reuse (external oracles run in the container, real-estate Playwright writes to BENCH_DIR — none today).
    Task 3: fix round 1/5 (2 addressed, 0 open — symlink hashed by target; unparsable cached grade reruns; commits 299ab51..37ff50c); implementer +4.8k/4.9 min; re-review sonnet 53.0k/0.5 min.
    Task 3: minor (deferred): a file whose content is exactly `link:<path>` hashes like a symlink to <path>.
    Task 3: complete (commits 1882391..37ff50c, review clean)
    Task 4: implementer opus 235.7k/36.1 min, commit 5d40c5c (gated 67/0, suite 302 pass/15 skip). Implementer removed 2 of its own hung test leftovers by exact name (this plan's own; allowed).
    Ruling: Task 4 interpretations 1–3, 5–11 accepted as reported (digests field in docker.json; stale serve.json not offered as a start; builder prune inside serve then exit 3 if still low; input.md no trailing newline; OOM ends rounds; walk row `dropped`; rounds=<k> per slug; end-only failure told without log; network test via interface list) — why: each matches the rulings or is additive — cost if wrong: small rework in serve.
    Ruling: env/<task>.json's `oracle` holds the absolute bench path of the checkout that ran task-env; Task 6 runs task-env from this worktree, and after the branch merges the env files are rewritten by `task-env` from the main checkout (recorded at the lock) — why: env files are data and regenerable — cost if wrong: grade fails loudly with a missing script after the worktree is removed.
    Task 4: review opus 131.1k/8.7 min: spec ❌ (2 Important: empty serve recipe passes for S1/S2; 600 s ready bounded by passes not time) + pristine-output gap in gated afterAll; interpretation 4 recommended accepted (already ruled). ⚠️ serve brief SHA to be hashed at the lock (Task 12 hashes every brief) — confirmed. ⚠️ removeRecorded removes every docker.json name — each step removes its own names when it ends; carried to Task 5.
    Task 4: minor (deferred): removeNames now silent on already-gone names, which also changes step 4 `--remove-out` stderr.
    Task 4: minor (deferred): task-env writes task-recipe.json before reading issue.json (partial write if missing); no-network test greps the whole base log; ext.mjs ~1030 lines.
    Task 4: fix round 1/5 (4 addressed, 0 open — empty start is a bad reply and the brief sentence is gone (serve.md 830c0027…); ready bounded by wall time; afterAll silent; prune and reuse stages; commits 5d40c5c..896776f); implementer cumulative 257.4k/52 min; re-review sonnet.
    Task 4: minor (deferred): `ready` succeeding after the limit branch untested; diskStop throwing is labelled task-env.
    Task 4: complete (commits 37ff50c..896776f, review clean)
    Task 5: implementer opus, commit bbe462f (gated 47/47 ×3, suite 304 pass/20 skip; Docker names identical before/after).
    Ruling: a run with no JUnit (timeout, OOM, kill) makes grade throw; ruling 10's "error per check with the stage" is Task 9's `oracle.mjs validate` job, as the plan says — why: plan Task 9 Produces — cost if wrong: none.
    Ruling: carry to Task 8 the writer-brief facts: runner `run` executes in /work; the grade image builds FROM the serve image with an empty context, so `runner.json` `layer` can only use RUN; graded external runs always use `--sealed` — why: oracle-run's design — cost if wrong: broken checks fixed by the fixer.
    Ruling: carry to step 7 (not this plan): oracle-run builds `git archive HEAD`, so a seeded bug must be a commit — recorded for the lock's notes.
    Task 5: implementer opus 199.1k/27.8 min; review opus: spec ✅, Approved with 1 plan-mandated Important (container 30-min bound depends on oracle-run living; grade sends only SIGKILL). ⚠️ base sha full-length match — gated test :695 asserts base log present/end log absent; kept.
    Ruling: plan-mandated Important on Task 5 → fix container-side (the grade script bounds itself with a background timer), not by changing grade's signal — why: smallest change, keeps proc.mjs untouched — cost if wrong: a stray container still possible if the timer itself fails; `ext remove` kills it.
    Task 5: parked — removal of all docker.json names can kill a concurrent run of the same task — Ruling: the plan runs one task at a time on Docker; real but nothing builds on concurrency — cost if wrong: a parallel run of one task would be killed mid-run.
    Task 5: minor (deferred): timed-out run loses readiness; two removals on a signal can race on docker.json digests; SIGINT exits 143 not 130.
    Task 5: INCIDENT (to report to the user): in fix round 1 a probe `docker run` used `-v /dev/null:/x` (forbidden flag); it failed and created nothing; not in code or tests. A hung probe container `bench-ext-t5probe` was removed by that exact name (the implementer's own).
    Task 5: fix round 1/5 (3 addressed, 0 open — container self-bound by in-script timer; n unique per run; verbatimSymlinks; commits bbe462f..bac5d8d); implementer cumulative 214.3k/36.5 min; re-review sonnet.
    Task 5: minor (deferred): n and symlink copy untested; timer/body race at the 30-min edge reads timeout.
    Task 5: complete (commits 896776f..bac5d8d, review clean)
    Task 6: dispatched (opus, background) at bac5d8d; guard: stop if the first 4 of a stack all drop not servable.
    Ruling: Task 7 (real-estate sources) runs in parallel with Task 6 in its own git worktree, merged back after review — why: Task 6 is hours of Docker and touches only progress.md and data; Task 7 touches bench/oracle.mjs, tests, README and runs sealed labellers off Docker — cost if wrong: an append conflict in progress/progress.md, resolved by keeping both sections.
    Task 7: implementer opus 210.5k/34.7 min (worktree branch worktree-agent-aeff905a58618581b, commits 729c2eb..bf83939); (c): p8b1 dropped (outside data), 14 tasks; 347 pairs, 63 agreed fix (53 commits), 270 agreed not fix, 14 disputed (step 9); labellers 632/155604/11385833/1509006, opus-5-5, ~14 min.
    Ruling: the label brief was amended after 7 runs that labelled from subjects; those runs were voided unread (sources/superseded/) and every kept label is from the amended brief — why: an instrument fix independent of any label content, as step 4 regenerated recipes under a new brief — cost if wrong: 7 wasted runs; the lock records the amendment.
    Ruling: a labeller run whose `git show` calls are fewer than the distinct commits listed for that task did not read every diff and is rerun once (same brief, new out name), applied to every run by the trigger, not by its labels — why: 6.1 asks the labeller to read the diff; the trigger is content-independent — cost if wrong: a few extra labeller runs.
    Task 7: review opus: spec ✅, Approved (0 Important); ⚠️ labellers have Bash — Ruling: accepted, plan-mandated by ruling 7 (git show / git log -1), confined by label-settings.json (only those two git commands, sandbox, Read on progress folder + attribution.md) — cost if wrong: a labeller could Grep <data> (not probed); its reply is data, sealed. ⚠️ 63 pairs from 53 commits — Task 8 groups by commit (ruling 9). ⚠️ implementer/reviewer usage — added in fix round.
    Task 7: minor (deferred): diffHunks could misread a deleted `-- ` line as a header (0 of 1845 hunks affected); prompt file written in place (race); a transient failure uses the rerun; untested both-kinds throw / unknown --drop; p8b/p8b1 excluded only by manual --drop.
    Task 7: fix round 1 implemented (e7db94e, 066aa99): all 28 runs met the read trigger (first runs had no count) and were rerun; 13/28 read every commit, 15/28 still under-read by the measure and keep labels (rule). Labels now: 347 pairs, 65 agreed fix, 270 not, 12 disputed, 0 unlabelled, 52 source commits; reruns 652/162117/12346665/1545533, opus-5-5, 10.6 min.
    Ruling: no second rerun and no change of the reading measure after the reruns (a range form like `a..b` counts as under-reading) — why: the rule allowed one rerun and changing the measure after seeing its effect would be tuning; the 15 under-reading runs are listed in progress.md and go to the lock as a known limit — cost if wrong: some labels from partial reading; the step 9 human read of disagreements is the backstop.
    Task 7: fix round 1/5 (5 addressed, 0 open — read gate + rerun, unlabelled not step9, labels prints per-kind totals, env restored, usage line; commits bf83939..066aa99); implementer cumulative 247.0k/53.3 min; re-review sonnet 88.9k/1.6 min.
    Task 7: minor (deferred): reading measure undercounts range/chained forms (15/28 listed under-read may be overstated).
    Task 7: complete (commits bac5d8d..066aa99, review clean); fast-forwarded into the main worktree branch.
    Task 8: dispatched (opus, own worktree, base 066aa99); real-estate writers now, external writers only for tasks with a final serve verdict; the rest resumed after Task 6.
    Task 8: implementer opus ~217k/~70 min (branch worktree-agent-a4dba354fada17938, c22cfc3..822a3eb). RE: 52 writers, 201 checks (49 interface none; high 66/med 93/low 42), 4 empty manifests (58e8819, 730509b, edf7c3a, fb7a2d9). EXT: 21 tasks, 133 checks (20 none); s1-08 and s2-04 have only interface-none checks. Waiting: s2-07, s2-08 (no serve verdict); s2-06 dropped not servable (replacement pending in Task 6). Usage RE 836/378493/11.0M/1.47M; EXT 743/381616/27.2M/1.38M, opus-5-5.
    Ruling: leak check narrowed to ≥8 hex chars of the fix sha or the origin test's path (id prefixes in other forms are not leaks) — why: the check id itself carries sha7, which every check must name — cost if wrong: a check naming 7 chars of its fix sha in prose passes.
    Ruling: when a commit has both an in-task pair and a later pair, a hunk the later pair lists belongs to the later pair's task — why: matches the bugs.mjs owner rule (blame rows first, the range only as a fallback), ruling 6's source — cost if wrong: 3 checks in p2/p4 instead of p3/p8d.
    Ruling: a writer run whose manifest is empty is rerun once (same brief, new out); the second result stands — why: content-independent trigger, as for recipes and labels; 4 empty runs read at most 1 file — cost if wrong: 4 extra writer runs.
    Task 8: review opus: spec ❌, Needs fixes (4 Important: prompts overwritten on reuse; imports/.spec.ts not enforced; source-path stdout sentinel untested; empty-manifest rerun missing). ⚠️ (a)(b) real-estate grading setup/start and oracle.sh paths — existing env scripts used by p8b's validation; Task 9 exercises them. ⚠️ (c) grade ignores JUnit ids not in the manifest — confirmed (score.mjs results(): `if (!out.has(id)) continue`). ⚠️ (d) queue from labels.tsv `source yes` rows — shas and the yes column only, no reasons. ⚠️ (e) scaffold package.json written by hand — accepted.
    Ruling: the real-estate writer brief need not name `bench_re` — why: a database name in a sealed brief adds nothing and is a protected-name family — cost if wrong: none.
    Ruling: the writer rerun trigger covers a manifest that is empty OR all `interface: none` (one rerun, second stands) — why: shape-only, content-independent, counters shallow reading (several all-none runs, and s1-08/s2-04 would otherwise drop) — cost if wrong: extra writer runs; possible bias toward more checks, bounded by validation and the comparer.
    Task 8: minor (deferred): every write rewrites all oracle manifests; external oracle replaced rm-then-copy and dropped support files not counted; no invalid runner.json test; orphan file of an external interface-none entry copied; scaffold config comment names plan 8b.
    Task 8: fix round 1 implemented (1af70b7, 4d2d95e): briefs restored to the pass-1 text and the 72 prompts restored to match their runs (sha in run records); rules in <data>/briefs/oracle-re.json; pass 3 76/76 runs: fb7a2d9 0→4, b5b3cec gains 1 scorable; still empty 58e8819, 730509b, edf7c3a; still all-none 090f6f2, 6c69b33, a5e0cd3, s1-08, s2-04; 1 refused (import). Totals RE 204 (48 none), EXT 22 tasks 145 (23 none); s2-07 now written; s2-05 rerun under original brief. Usage RE 60 runs 942/412924/12.0M/1.62M, EXT 25 runs 855/445968/29.8M/1.62M. Implementer cumulative 314.0k. Waiting: s2-08 serve; s2-06 replacement.
    Task 8: fix round 1/5 (5 addressed, 0 open — prompts only on run + promptSha, import/file/kind rules from data, sentinel asserts, -2 rerun on empty/all-none, ownership test; commits 822a3eb..4d2d95e); re-review sonnet 90.3k/2.2 min (84/84 prompt files match promptSha).
    Task 8: minor (deferred): stale-prompt test depends on the previous test's files; textual import gate (false positives refuse); README layout lacks the -2 folders.
    Task 8: complete (commits 066aa99..4d2d95e, review clean); fast-forwarded into the main worktree branch. Writes still owed: s2-08 (after its serve verdict) and s2-06's replacement — carried to Task 9's run step (the loop Task 9 Step 3 names).
    Task 9: dispatched (opus, own worktree, base 4d2d95e); real-estate lane now; external lane only after the controller says "Docker is free" (Task 6 still on Docker).
    Ruling: a validation `error` verdict is unscored (added to UNSCORED) — why: ruling 10 records error for a thrown grade; an error check must not count as scored — cost if wrong: none.
    Ruling: one fixer per (task, fix commit) group per round and a comparer per changed check; external runner.json changes go through the comparer as one item — why: ruling 11 batch per pass; the runner wires every check — cost if wrong: coarser fixer context.
    Task 6: implementer opus, ~2 h 55 min wall; commits 3fcd8ad, 742139a. s1 8/8 served; s2 7 served + s2-06 (openwhispr#2643) dropped not servable (3 rounds failed the base build fetching the desktop runtime) → replaced by s2-09 kizuna-ai-lab/sokuji#361 (served, 1 round); s3 8 empty recipe. 17 serve agents out 134k / cacheRead 5.89M / cacheWrite 831k; 1 recipe agent out 10k. pgsnap equal ×4; Docker 330 containers / 174 tags identical before/after.
    Ruling: s2's cold-setup repo moves from super-productivity (s2-08) to kizuna-ai-lab/sokuji (s2-09), per ruling 13 over the kept tasks — why: ruling 2 says cold-setup is read over kept tasks in sort order — cost if wrong: none; recorded at the lock.
    Task 6: note — Docker build cache 780→190 entries with no logged prune; likely Docker's own GC; builder prune is allowed anyway; not verified.
    Task 10: dispatched (opus, own worktree, base 742139a) in parallel with Task 9 — no Docker, no database; oracle.mjs merge conflicts resolved by the implementer if any.
    Task 6: review sonnet: spec ✅, Approved (recipe SHAs vs lock 24/24, step4 untouched, step5 copies equal live files, walk order, usage sums, pgsnap ×4, Docker diff empty).
    Task 6: minor (deferred): serve run records differ in a toolUses field (code changed mid-run by other tasks' merges); wall clock is a rounded sum.
    Task 6: complete (commits 4d2d95e..742139a, review clean)
    Task 10: implementer opus ~127k (branch worktree-agent-ae7e9651c5862a778, d3e4e3b..121a0ba): 24 sheets, 408 names, 2 deleted by input-check, 0 failed; usage 201/22181/1548206/461666 opus-5-5, 2.6 min wall. 33 of 408 names not found verbatim in the end commit (s3-06 17, s1-07 6 among them).
    Ruling: the sheet tool deletes every name not found verbatim in the end commit's files (a mechanical check, counted), as the brief says "a name you cannot find in the code is left out, never guessed" — why: content-independent enforcement of the brief's own rule — cost if wrong: a name the framework supplies outside the repo is lost (already a known limit, prereg §15).
    Ruling: the sheet agent sees the end tree including the PR's tests (as step 3a's real-estate sheets saw their end tree); recorded as a known limit, no change — cost if wrong: a sheet name may come from a test file.
    Task 10: review sonnet: spec ✅, Approved; Important (on the ruling's fix): the verbatim check must skip test paths. Fix round 1 sent: verbatim check on non-test files, bullet parse, section deletion, README wording; re-applied to the 24 saved replies, no new agents.
    Task 10: minor (deferred): agent exit code ignored on reuse; no test for -2 success or promptSha refusal; test-order dependence.
    Task 10: fix round 1 implemented (b7a9da2, fdb62d1): 24 sheets rebuilt from saved replies: 360 names, 16 deleted, 34 not found (410 bullets), all PASS input-check.
    Ruling: a `##` heading input-check flags is replaced by `## Unnamed section <n>` and its bullets kept (each still checked), instead of deleting the section — why: the heading only groups; the names under it pass every check (s3-01 fell to 2 names) — cost if wrong: names lose their page context in two sheets.
    Task 10: minor (deferred): in-file test modules (e.g. Rust) count as source for the verbatim check.
    Task 10: fix rounds 1–2/5 (all addressed — verbatim non-test check, bullet parse, unnamed-section headings, README; commits 121a0ba..b6a4b19); final: 24 sheets, 374 names, 34 not found, all PASS; implementer cumulative ~172k; re-review sonnet.
    Task 10: complete (commits 742139a..b6a4b19, review clean); fast-forwarded into the main worktree branch.
    Task 11: dispatched (opus, own worktree, base b6a4b19): Phase A code now; Phase B run after "validation done" from Task 9.
    Ruling: classifiers see only scored checks (last verdict valid or absent-at-base, interface not none, not dropped/moved out) — why: unscored checks never enter a score; classifying them spends tokens and dilutes agreement — cost if wrong: a check revived later needs its own classification.
    Task 11: Phase A done (27cb84f, 04c38d6; 328 pass/21 skip). Not test-first (code before tests) — noted.
    Ruling: real-estate classify/split take `<task.json> <task>` (like validate) and queue names the sets `task-repo` / `external` — why: bench/ names no customer — cost if wrong: none.
    Task 11: Phase A review opus: spec ❌, Needs fixes (3 Important: split ids recomputed → stale on rerun; split validate skipped silently; dead rater counted as a round). ⚠️ validate not on this branch — merge with Task 9 needed; signatures match (reviewer checked d3878ad).
    Ruling: the 7.1 human sample draws from scored checks (valid or absent-at-base) — why: both are kept and scored by 7.1; "valid" in ruling 16 means validated-and-scored — cost if wrong: a few absent-at-base checks in the human sample.
    Ruling: the 7.2 sample takes only ids both raters gave the same 6.3 label (traceable or not traceable), never a rule-assigned bucket — why: 7.2 re-rates agreed classifications — cost if wrong: none.
    Task 11: minor (deferred): grouped external split copies the whole file without checking siblings; manifest strip is a deny-list; classify.md `not traceable`/`partly` clauses overlap; a set with 0 pooled checks gives no verdict; not test-first.
    Task 11: Phase A fix round 1/5 (6 addressed, 0 open — split ids in record; validate gate on missing verdicts; dead rater exits non-zero; 7.2 agreed-only; lazy prompt; read counts; commit 1ddae5f); re-review sonnet. Phase A code review clean; Phase B pending Task 9 merge.
    Task 11: carry to Phase B — the real `validate` binding arrives with Task 9's merge; check its exit-code convention (0 on success) against split's `code !== 0` gate.
    Task 11: minor (deferred): splitter readsInFolder counts only in/; sequential split numbering no longer tested; failed rater records must be deleted to redo (README silent).
    Task 9: interim — code d3878ad (327 pass); s2-08 written 2 (0 none), s2-09 89 (72 none); s1-01..s1-07 validated; s1-08 dropped no valid check (5/5 none) → replacement loop; p1 base 691a723 has no package.json → setup fails.
    Ruling: a real-estate task whose base commit has no app manifest gets `precondition` (stage `no app at base`) as the base result for every check, instead of `error` — why: nothing the task builds can exist where no app exists; 7.1 expects a precondition failure at the base — cost if wrong: none for p1 (the repo's first base); any other failing base stays error.
    Ruling: Task 9's agent runs s1's replacement loop (walk, sample, task-env --from-meta, serve, write, validate) after its external lane frees Docker; the replacement's sheet and classification come with Tasks 10/11 later — why: one Docker user at a time, and Task 9's branch lacks the sheet tool — cost if wrong: none.
    Task 9: interim — s2-04 dropped no valid check (10/10 none) → s2 replacement loop after the external lane (approved); no-app-at-base implemented (97d3d94, task field appFile=package.json); s2-03 dummy port 49162 held by a host program → env/s2-03.json moved to 49190 (approved); p2: 20 absent-at-base, 3 broken, 2 weak, 2 error (fix parent 090f6f2 never ready).
    Task 9: interim — s3-04 base build ENOSPC, s3-05 apt "invalid signature" (full-disk symptom), both `error`; the disk estimate read ~34 GB free (60 GB limit − 25.7 GB df), so the floor never fired.
    Ruling: `docker builder prune -f` by hand between tasks when a build or run fails with a disk-full signature, regardless of the estimate, then rerun the errored tasks — why: the user's standing instruction allows `docker builder prune -f` (build cache only); the estimate misses VM allocation — cost if wrong: a longer rebuild from an empty build cache.
    Task 9: interim — external lane done. s1-08 → s1-09 we-promise/sure#4246 (servable r1, 4 entries, 4 valid); s2-04 → s2-10 coder/xum#6616 (servable r0, 8 entries/3 none, 1 valid + 4 absent-at-base after 1 fixer round). Prune freed 20.81 GB; s3-04 (2 valid), s3-05 (7 valid, 1 absent) reran clean; s2-03 1 valid. No external task without a scored check. p4 (real-estate Postgres in Docker) hit ENOSPC → 12 error, reruns at lane end; then p1, then sweep.
    Task 9: minor (deferred): `write` reads the serve verdict from ext/step5-logs/serve.tsv, so s1-09's line was appended by hand; a killed first s1-09 writer run left an orphan, stopped, record discarded (usage kept).
    Sheets for s1-09 and s2-10 dispatched (sonnet run agent, main worktree; Task 10's tool).
    Task 10 addendum: replacement sheets s1-09 names=14 notfound=9, s2-10 names=22 notfound=0, both PASS; usage 26/3412/252241/37467 opus-5-5; commit 1e6a4e1 (progress only).
    Task 9: interim — sweep: 47 pre-existing, 20 boundaries, 38 moved (p2 20, p3 11, p6a 9…), 9 recorded none (their p1 base errored: no app).
    Ruling: the no-app-at-base rule also applies to the sweep's boundaries, applied to the existing sweep results (a commit without the app file reads `precondition`), without regrading — why: the rule depends on the file's absence, not on a run; same rule as validation — cost if wrong: 9 checks move to p1 instead of none.
    Task 9: implementer opus 403.2k / 18.4 h wall (branch …a4533c6b944478a71: d3878ad, 97d3d94, 171c605 merge of main, 79d41bf, c03e8b0; 331 pass). RE 14 tasks: 156 checks — valid 4, weak 25, broken 10, error 2, absent-at-base 115, none 48; 47 pre-existing all moved (p2 19, p3 10, p6a 7, p4 2, p1 9). EXT 24 kept: 150 checks — valid 54, weak 5, broken 3, error 0, absent-at-base 88, none 83; every kept task ≥1 scored. Drops s1-08, s2-04 → s1-09, s2-10.
    Task 9: INCIDENT (to report to the user): a process listing showed the opening lines of s1-09's writer prompt (brief text only, no oracle content).
    Ruling: rule (b) is counted at the lock (ruling 13): p5, p7b, p7c (0 scored) and p6b, p6c (2 each) do not meet it now and are recorded as such, to be recounted after step 9 — why: ruling 13 says so — cost if wrong: none now.
    Ruling: before a Docker batch (Task 11 split validation), run `docker builder prune -f` when the build cache exceeds 15 GB — why: the disk estimate misses ENOSPC; pruning only the cache is allowed by the user — cost if wrong: slower cold rebuilds.
    Task 11: Phase B started — merge Task 9 branch, classify all kept tasks; split held until Task 9 review is clean ('split go').
    Task 9: review opus: spec ❌, Needs fixes — Critical: README conflict markers committed (171c605); Important: fixer-kept files bypass write's leak/import/runner gates. Counts reconciled with moves.json and validation files (RE 156, EXT 150).
    Ruling: an external task with no scored check but some `error` checks is `not judged` (rerun), not dropped — why: a machine failure is never an out (step 4 rule) — cost if wrong: none occurred.
    Task 9: parked — a check moved by the sweep gets no fixer round at its receiver (1 broken in p2) — Ruling: ruling 12 asks only a partial revalidation of receivers; real, nothing builds on it — cost if wrong: 1 check unscored.
    Ruling: s1's cold-setup repo moves from paperless-ngx (s1-06) to we-promise/sure (s1-09), per ruling 13 over the kept tasks — cost if wrong: none; recorded at the lock.
    Task 9: minor (deferred): a stale fixer round counts toward rounds; appFile rejection untested; not-judged / runner-through-comparer / duplicate-id comparer paths untested; verdict lookup duplicated.
    Task 11: Phase B interim — merged Task 9 (03dc4c2; README markers resolved there; split validates via Task 9's validate, exit 0); 35 tasks classified, 3 skipped (p5, p7b, p7c: no scored check); 70 rater runs code 0; RE 119 (build 3, requirement 96, partly 15, disputed 5), EXT 142 (build 38, requirement 67, partly 27, disputed 10); interim pooled RE κ .86 raw .96 AC1 .95 usable; EXT κ .89 raw .93 AC1 .90 usable; usage out 151759 / cr 2.20M / cw 0.996M opus-5-5; 10/70 raters did not open every file.
    Ruling: rater reading gate — a run that did not open every file in its folder is rerun once (labels of the rerun stand), by that trigger only — why: same content-independent gate as the labellers — cost if wrong: ~10 extra rater runs; agreement shifts.
    Ruling: tasks whose check files Task 9's fix round restores are reclassified before split (old records superseded) — why: raters must judge the check as it will be scored — cost if wrong: a few extra runs.
    Task 9: fix round 1 implemented (93dcc76, c3f4d32; 332 pass): README markers removed; fixer-kept files gated (leak/import/runner); recheck 321 files, 0 fail → nothing restored, no revalidation, so no task needs reclassification; counters split (129 compared, 3 comparer changed, 0 out-of-scope); sweep-saved.mjs saved to drivers; cold-setup s1 recorded. Implementer cumulative ~403k+.
    Task 9: fix round 1/5 (5 addressed, 0 open; commits c03e8b0..c3f4d32); re-review sonnet.
    Task 9: minor (deferred): earlier per-task "refused" figures left as written with a corrective bullet.
    Task 9: complete (commits 1e6a4e1..c3f4d32, review clean); fast-forwarded into the main worktree branch.
    Task 11: split go sent (merge c3f4d32 first; builder prune before the external batch).
    Task 11: Phase B done (de9ef2c gate, e24d116 merge c3f4d32, 1036af6 progress; 343 pass): gate reruns 10 (4 then read all, 6 still partial, stand); 40 partly split in 19 tasks → 80 new (44 scored: 12 valid, 32 absent; 14 weak, 22 broken); bench_re lane hit a 2-h shell limit mid-p2 — leftover grade worktree and bench_re/bench_re_test removed by the task's own teardown, pgsnap equal; external: builder prune (21 GB). Queue: RE 119, κ .73 raw .92 AC1 .91 usable (build 5, requirement 104, disputed 11); EXT 142, κ .91 raw .94 AC1 .92 usable (build 53, requirement 83, disputed 9); step9 labels 12, classify 20, 7.1 40, 7.2 40, inputs 4. 150 agent runs, out 368k, opus-5-5. Implementer cumulative ~370k.
    Ruling: a split original none of whose halves is scored is restored with label requirement and its halves dropped (`split gave no scored half`) — why: 6.3 "if not [splittable], it goes to the requirement bucket" — cost if wrong: 9 checks in requirement instead of out.
    Task 11: restore rule applied (c7bed6a, 0635e1a; 344 pass): 9 originals restored as requirement (s1-06 1, s2-09 2, s3-01 1, s3-06 5), 18 halves dropped; EXT requirement 83→92; pooled agreement unchanged. Added marker `restored_from_split` (prevents re-split) — accepted.
    Task 11: Phase B review opus: spec ❌, Needs fixes — (1) 9 restored originals have no verdict (split's validate rewrote the file without the dropped original), so unscored; (2) 13 split fixer runs refused as stale (shared labels with Task 9's fix records), undisclosed; 7 of 9 restores follow from it. Counts otherwise reconciled (labels 254 = 58 build + 196 requirement; disputed 20; step9 files).
    Ruling: split halves get ruling 11's fixer rounds under their own labels (fix-split-…); rerun split validation for p3, p6c, s1-03, s1-04, s1-06, s3-01, s3-06; re-apply the restore rule after, with restored originals revalidated so they carry a verdict; error halves are not judged (no restore) — why: ruling 11/15 apply to split checks; ruling 13 needs a verdict to score — cost if wrong: hours of extra validation runs.
    Task 11: minor (deferred): split's `code !== 0` gate is dead against validate (always 0); a restore-only rerun prints requirement=0; no test for the readsInFolder fallback.
    Task 11: Phase B fix round implemented (1b09558, 1864c9f, eba44d1; 345 pass): split fixers under fix-split-<round> (kept fixes s1-03 3, s1-04 1, s1-06 1; p3/p6c refusals were on non-split checks already fixed by Task 9); restore re-grades the original with the split's files taken out (shared file reverted) — 8 restored now scored (s2-09 2, s3-01 1, s3-06 5); s1-06 restore undone (split has a scored half); error/no-verdict halves not judged; EXT labels build 55, requirement 95, disputed 9; RE unchanged; pooled κ unchanged; 14 fixer/comparer + 6 rater runs.
    Task 11: Phase B fix round 1/5 (4 addressed, 0 open; commits 0635e1a..eba44d1); re-review sonnet: all 259 labelled keys have a scored verdict (61 valid, 198 absent-at-base).
    Task 11: minor (deferred): README "only stdout line" for split no longer exact; undoing a restore recopies splitter out/ files (kept fixer changes on those halves lost until reapplied; no current effect); rerun prints classified=0.
    Task 11: complete (commits b6a4b19..eba44d1, review clean); fast-forwarded into the main worktree branch. Implementer cumulative 476.1k.
    Ruling: before the lock, every external env/<task>.json `oracle` points at the main checkout's bench/ext.mjs (the code lands there at merge), so the lock hashes the final env files — why: the worktree path dies with the worktree — cost if wrong: grading needs the merge first (no grading is planned before it).
    Task 12: implementer opus, commit 62e0839: lock written (44 rulings, 3 incidents, 1367 hashes); 27 env oracle fields → main checkout; task-repo 14 kept/11 classified, 120 scored, build 5 / requirement 104 / disputed 11, κ .73 usable, median build 0; external 24, 159 scored, build 55 / requirement 95 / disputed 9, κ .91 usable, median build 2; rule (b) met by 9 (p1, p2, p3, p4, p6a, p8a, p8c, p8d, p8e), not by p5, p7b, p7c (0), p6b, p6c (2); Docker: no step 5 names left (328 fixture containers, 162 fixture images).
    Task 12: review sonnet: spec ❌ (Important: /tmp/t12 citations); tables, medians, rule (b), rulings (44), hashes (24 random + all env/step9/briefs lines verified), Docker all reconcile. Fix round 1 sent (paths, identity term, wording, usage line, rulings 1–16 pointer).
    Task 12: fix round 1/5 (5 addressed, 0 open; commit a697d86, text only, no hash or count changed); re-review haiku 76.0k. <data>/logs/task12/ existence confirmed by the first reviewer.
    Task 12: complete (commits eba44d1..a697d86, review clean)

### Final fix wave

The fixes the final whole-branch review asked for (commits 6b5a892, d97e82c). No data under `<data>` changed and no validation was rerun.

- **Not ready reads `error`.** `oracle validate`, after an external grade, reads the last line of `<task>/build/readiness.tsv` for the end and the base; `not ready` or `timeout` turns that validation's checks into `verdict: error, stage: not ready at <sha7>` and deletes that commit's `grades/<sha7>.json`, so `--reuse` runs it again. `grade` and `verdict` are unchanged (steps 7 and 8 still score a product that does not serve as 0). Such a task now prints `not judged` instead of being dropped.
- **Classifier fields.** The raters' manifest and the splitter's `entry.json` keep only `id`, `behaviour`, `interface`, `severity` and `file` (an allow-list instead of a deny-list).
- **`diffHunks`.** `---` and `+++` count as headers only between a `diff --git` line and that file's first `@@`, so a deleted line `-- x` is no longer read as a file name.
- **split.** The dead non-zero branch after `validate` is gone (it returns 0 or throws); behaviour is the same.
- **README.** grade also leaves out `error`; split's other stdout lines; the step 7 and 8 drivers must pass `--sealed`; the readiness rule; the classifier allow-list.
- **Lock.** `step5-lock.md` hashes `logs/task12/count.mjs` and `logs/task9/drivers/sweep-saved.mjs` in a second block and names what each gives. No other hash or count changed.
- **Tests.** New: the readiness rewrite with a fake grade and a readiness file; `diffHunks` with a `-- ` line; an unknown manifest field kept from the raters and the splitter. The gated Docker test of a run that never gets ready now runs `oracle validate` after grade and checks `error`, the stage, `not judged` and that both grade files are gone. `bun test ./tests`: 347 pass, 21 skip, 0 fail. `BENCH_EXT_DOCKER=1 bun test tests/bench-ext-check.test.mjs`: 48 pass, 0 fail.
- **Usage.** Implementer opus: tokens and minutes left to the controller. No sealed agent ran.

### SDD ledger tail after the final review

    Task 12: fix round 1/5 (5 addressed, 0 open; commit a697d86, text only, no hash or count changed); re-review haiku 76.0k. <data>/logs/task12/ existence confirmed by the first reviewer.
    Task 12: complete (commits eba44d1..a697d86, review clean)
    Final review opus: With fixes — Important: an external never-ready run reads `broken` (empty JUnit) and is cached by --reuse, so ruling 37's `not judged` is unreachable for it; Minor: README :79 (error unscored) and :118 (split stdout); duplication across merges; deny-list strip (fix before step 6); diffHunks `-- ` misread (before step 9 batch); lock relies on unhashed scripts count.mjs / sweep-saved.mjs; grade without --sealed prints oracle output; pooled κ first round only (stated). Lock numbers all rebuilt from data and match; 345 pass. Flags rulings 37, 30/34 (no-app keeps p1 under rule b), 42, 28 for the user.
    Ruling: one final fix wave: (1) never-ready external runs → `error` for that ref's checks (readiness.tsv `not ready|timeout`), with a verdict assertion in the test; (2) README :79 and :118; (3) classifier manifest strip as an allow-list {id, behaviour, interface, severity, file}; (4) diffHunks header tracking; (5) remove split's dead `code !== 0` branch; (6) add shasum lines for <data>/logs/task12/count.mjs and <data>/logs/task9/drivers/sweep-saved.mjs to the lock. Deferred as carries: duplication refactor; making --sealed grade's default (step 7/8 drivers must pass --sealed) — why: smallest set that closes the latent gap and the before-next-step items without touching data — cost if wrong: duplication stays.
    Final fix wave: opus 147.2k / 14.6 min, commits 6b5a892, d97e82c, a75938c (347 pass; gated 48/0); one read-only `docker info` outside the stated rule (changed nothing). Re-review opus 115.7k / 2.4 min: all 6 addressed, no new Critical/Important.
    Final: parked — README split paragraph omits `split refused: not classified` and calls `classify failed` a refusal; failure lines replace the summary line — Ruling: text only, no second fix wave (SDD) — cost if wrong: a reader of split's README misses one failure line.
    Final: parked — <data>/logs/task9/drivers/sweep-saved.mjs imports bench code from a worktree path that will be removed; it is hashed as a provenance record, not rerunnable — Ruling: keep as record — cost if wrong: re-deriving p1's moves needs the code at c3f4d32.
    Final review: complete (with fixes applied; residuals parked).

## 2026-11-05 — step oracle plan (`docs/plans/2026-11-05-bench-step-oracles.md`), draft

### Task 3

p8b's scored checks reclassified under the step 5 rules (ruling 8). No code changed and no Docker or database command ran. `oracle split` was not run (an agreed `partly` stays `partly`), and `oracle queue` was not run.

- **Count check.** `<data>/logs/step6/p8b-scored.mjs` printed verdict counts only: 25 live entries, 5 with interface `none`, and of the other 20: 9 `absent-at-base`, 8 `pre-existing`, 3 `weak`. This is the expected count, so the 9 scored checks are the `absent-at-base` ones.
- **Trial files.** `p8b/classify-1.json` and `classify-2.json` were moved with `mv` (not opened) to `p8b/superseded/trial-classify-1.json` and `trial-classify-2.json`.
- **Classify line.** `bun bench/oracle.mjs classify <data>/env/real-estate.json p8b` printed:
  `p8b classified=9 build=0 requirement=5 partly=3 disputed=1 kappa=0.80 raw=0.89 ac1=0.85`
  Both raters ran once (code 0) and opened all 7 files of the folder, so neither needed a rerun. `agreement.json`: n 9, agree 8, usable.
- **Next to section 14's trial.**

  | | trial (2026-10-27, 25 checks) | now (9 scored checks) |
  |---|---|---|
  | traceable / build | 1 | 0 |
  | partly | 2 vs 3 (per rater) | 3 agreed |
  | not traceable / requirement | 22 each | 5 agreed |
  | disputed | not recorded here | 1 |
  | κ / raw / AC1 | 0.44 / 0.88 / 0.87 | 0.80 / 0.89 / 0.85 |

  The trial classified all 25 checks; the 8 `pre-existing`, 3 `weak` and 5 `interface: none` ones are not classified now, so the two sets of numbers do not cover the same checks. The 3 `partly` stay `partly` (no split) and p8b's labels feed no score (ruling 7).
- **Step 9.** `<data>/step9/p8b-classify.tsv` (header `task\tid`) has 1 row, written by `<data>/logs/step6/p8b-classify-tsv.mjs`, which printed only the row count. No other file in `step9/` was touched.

Usage (sum of the two raters' `classify-*.reply.md.run.json`): input 12, output 5217, cache read 33970, cache write 40954; model claude-opus-5-5. Wall clock 2026-11-05 07:58:28Z–07:59:00Z (about 32 s; the two raters ran in parallel).

### Task 4

`bun bench/oracle.mjs step <task>` (commit 8ac563a) ran once for each of the 24 kept external tasks of `<data>/ext/sample.tsv` (s1-08, s2-04 and s2-06 are retired and not in it), one at a time, all exit 0. No Docker or database command ran. The brief `<data>/ext/briefs/f2p.md` was written first (it names no repo, stack, task or customer). Every line printed:

```
s1-01 step candidates=0 f2p=2 p2p=0 unknown=0 ids=0 resolver=none
s1-02 step candidates=1 f2p=1 p2p=0 unknown=0 ids=1 resolver=none
s1-03 step candidates=9 f2p=26 p2p=0 unknown=0 ids=9 resolver=none
s1-04 step candidates=4 f2p=29 p2p=0 unknown=0 ids=4 resolver=none
s1-05 step candidates=1 f2p=3 p2p=1 unknown=0 ids=1 resolver=none
s1-06 step candidates=0 f2p=1 p2p=2 unknown=0 ids=0 resolver=none
s1-07 step candidates=2 f2p=3 p2p=0 unknown=0 ids=2 resolver=none
s1-09 step candidates=4 f2p=4 p2p=0 unknown=0 ids=4 resolver=none
s2-01 step candidates=3 f2p=8 p2p=2 unknown=0 ids=3 resolver=none
s2-02 step candidates=1 f2p=1 p2p=0 unknown=0 ids=1 resolver=ran
s2-03 step candidates=1 f2p=1 p2p=0 unknown=0 ids=1 resolver=none
s2-05 step candidates=1 f2p=1 p2p=1 unknown=0 ids=1 resolver=none
s2-07 step candidates=5 f2p=7 p2p=0 unknown=0 ids=5 resolver=none
s2-08 step candidates=1 f2p=3 p2p=0 unknown=0 ids=1 resolver=none
s2-09 step candidates=2 f2p=17 p2p=0 unknown=0 ids=2 resolver=none
s2-10 step candidates=2 f2p=6 p2p=0 unknown=0 ids=2 resolver=ran
s3-01 step candidates=0 f2p=2 p2p=0 unknown=4 ids=0 resolver=ran
s3-02 step candidates=5 f2p=5 p2p=0 unknown=0 ids=5 resolver=none
s3-03 step candidates=1 f2p=1 p2p=0 unknown=0 ids=1 resolver=none
s3-04 step candidates=1 f2p=1 p2p=1 unknown=0 ids=1 resolver=none
s3-05 step candidates=1 f2p=8 p2p=0 unknown=1 ids=1 resolver=ran
s3-06 step candidates=4 f2p=9 p2p=0 unknown=4 ids=4 resolver=ran
s3-07 step candidates=0 f2p=0 p2p=0 unknown=1 ids=0 resolver=ran
s3-08 step candidates=2 f2p=3 p2p=0 unknown=0 ids=2 resolver=none
```

- **Totals.** 159 scored checks: 134 decided by exact match, 7 by last segment, 18 by the resolver. Verdicts: f2p 142, p2p 7, unknown 10. Candidates 51, ids 51 (no task has more than 9, so the cap of 15 binds nowhere).
- **Tasks with 0 ids: 4.** s1-01 and s3-01 have no `build` check (as the plan said). s1-06's only `build` check is `p2p` by the last-segment rule. s3-07's only `build` check is `unknown` from the resolver. So H1 has 20 external tasks with a step oracle, not the 22 the plan counted on; the user's N rule (the step 11 walk tops it up) covers this.
- **Build checks the f2p rule removed.** `labels.json` has 55 `build` checks among the scored ones; 51 are candidates, so 4 are out: s1-06 1 (segment `p2p`), s3-04 1 (exact `p2p`), s3-05 1 (resolver `unknown`), s3-07 1 (resolver `unknown`). Every other task's ids are all its scored `build` checks (candidates equal its `build` count).
- **Resolver runs: 7**, in 6 tasks (s2-02, s2-10, s3-01, s3-05, s3-05 `-2`, s3-06, s3-07), all code 0, model claude-opus-5-5, `--at` the end, tools `Glob,Grep,Read`. s3-05's first reply did not answer its one origin validly, so it ran once more and the `-2` reply stands. Per-check resolver outcomes: s2-02 1 f2p; s2-10 5 f2p; s3-01 4 unknown; s3-05 1 unknown; s3-06 2 f2p, 4 unknown; s3-07 1 unknown.
- **Resolver reading (from `toolUses`).** Each run made one `Grep` call and no `Read` (s2-02 also one attempted `json_output` call); the s3-01 run made no tool call and answered its 4 origins `unknown`. s3-01 has no `build` check, so its verdicts change no id. The verdicts that do move ids (s2-02, s2-10, s3-06 f2p; s3-05, s3-07 unknown) rest on one search each.

Usage (sum of the 7 `f2p*.reply.md.run.json` `usage`): input 28, output 3690, cache read 173782, cache write 183914; model claude-opus-5-5; summed run time 80.4 s. Batch wall clock 2026-11-05 08:11:27Z–08:12:48Z (81 s).

#### Rerun after the resolver reading gate (controller ruling)

The controller added the reading gate of the step 5 labellers and raters to the resolver (commit 1734911): a run whose record shows no `Read` call is run once more as `-2`, the first record stays, the rerun stands whatever it reads, and there is no third run. The gate and the bad-reply / non-zero-code rerun share that one rerun. None of the 7 first-run records was deleted. `step` ran again for the 24 tasks, one at a time, all exit 0, 2026-11-05 08:18:58Z–08:19:58Z (60 s).

- **Lines.** All 24 lines are the same as above except s3-05, which now prints `resolver=reused` (its `-2` run from the first batch stands). s2-02, s2-10, s3-01, s3-06 and s3-07 print `resolver=ran`.
- **Totals.** Unchanged: 159 scored checks (exact 134, segment 7, resolver 18); f2p 142, p2p 7, unknown 10; candidates 51, ids 51.
- **`-2` runs.** 5 new ones: s2-02, s2-10, s3-01, s3-06 and s3-07, because none of the 6 first runs made a `Read`. All ended with code 0. Only s2-02's rerun made a `Read` (1). The other four again made none (s2-10, s3-07: 1 `Grep`; s3-06: 2 `Grep`; s3-01: no tool call), and they stand under the rule. Usage of the 5 new runs: input 22, output 3203, cache read 142892, cache write 155315; model claude-opus-5-5; summed run time 59.7 s. With the first batch, the resolver has 12 records in total: 7 first-batch runs and 5 new ones.
- **Tasks with 0 ids.** The same 4: s1-01, s3-01, s1-06 and s3-07.
- **Ids changed versus the first run.** 0 in every task. No `step-f2p.json` verdict changed either.

### Task 5

#### Run v1: superseded (lister brief v1 missed title-only pointers; writer -2 folder bug)

`bun bench/oracle.mjs step <data>/env/real-estate.json <task>` (commit f498b3c) ran for the 14 kept real-estate tasks and p8b, one at a time, each detached with its log in `<data>/logs/step6/task5-<task>.log`, all exit 0, 2026-11-05 08:40:54Z–10:17:46Z (97 min). The briefs `<data>/briefs/steps.md` and `<data>/briefs/step-re.md` were written first (they name no repo, stack, customer or task). Every final line:

```
p1 step listed=0 resolved=0 picked=0 written=0 refused=0 none=0 valid=0 absent-at-base=0 weak=0 broken=0 error=0 fixer rounds=0 ids=0
p2 step listed=0 resolved=0 picked=0 written=0 refused=0 none=0 valid=0 absent-at-base=0 weak=0 broken=0 error=0 fixer rounds=0 ids=0
p3 step listed=0 resolved=0 picked=0 written=0 refused=0 none=0 valid=0 absent-at-base=0 weak=0 broken=0 error=0 fixer rounds=0 ids=0
p4 step listed=0 resolved=0 picked=0 written=0 refused=0 none=0 valid=0 absent-at-base=0 weak=0 broken=0 error=0 fixer rounds=0 ids=0
p5 step listed=0 resolved=0 picked=0 written=0 refused=0 none=0 valid=0 absent-at-base=0 weak=0 broken=0 error=0 fixer rounds=0 ids=0
p6a step listed=4 resolved=4 picked=4 written=4 refused=0 none=0 valid=0 absent-at-base=4 weak=0 broken=0 error=0 fixer rounds=2 ids=4
p6b step listed=6 resolved=6 picked=6 written=6 refused=0 none=3 valid=1 absent-at-base=2 weak=0 broken=0 error=0 fixer rounds=0 ids=3
p6c step listed=9 resolved=9 picked=9 written=9 refused=0 none=1 valid=7 absent-at-base=0 weak=1 broken=0 error=0 fixer rounds=1 ids=7
p7b step listed=14 resolved=7 picked=7 written=7 refused=0 none=4 valid=2 absent-at-base=0 weak=1 broken=0 error=0 fixer rounds=0 ids=2
p7c step listed=12 resolved=11 picked=11 written=11 refused=0 none=2 valid=0 absent-at-base=1 weak=4 broken=4 error=0 fixer rounds=2 ids=1
p8a step listed=49 resolved=28 picked=15 written=15 refused=0 none=1 valid=9 absent-at-base=5 weak=0 broken=0 error=0 fixer rounds=0 ids=14
p8c step listed=40 resolved=30 picked=15 written=15 refused=0 none=3 valid=1 absent-at-base=11 weak=0 broken=0 error=0 fixer rounds=0 ids=12
p8d step listed=70 resolved=45 picked=15 written=15 refused=0 none=1 valid=5 absent-at-base=7 weak=2 broken=0 error=0 fixer rounds=0 ids=12
p8e step listed=40 resolved=31 picked=15 written=15 refused=0 none=2 valid=6 absent-at-base=7 weak=0 broken=0 error=0 fixer rounds=0 ids=13
p8b step listed=41 resolved=33 picked=15 written=0 refused=0 none=0 valid=0 absent-at-base=0 weak=0 broken=0 error=0 fixer rounds=0 ids=0
```

- **Totals.** listed 285, resolved 204, picked 112, written 97 (refused 0, interface none 17), validated 80: valid 31, absent-at-base 37, weak 8, broken 4, error 0. Scored ids 68 (`step.json` of each task holds them; `candidates` = resolved). Fixer rounds in p6a (2), p6c (1), p7c (2).
- **Tasks with fewer than 5 ids: 10.** p1, p2, p3, p4, p5 (0: no feature step of the kept groups names a test; a count-only probe of `filter-source.md` finds every test path of p1–p5 outside the feature steps in the plan's Review Focus section (5 lines each; p5 one more in another section), none with a feature or step id, and p5's 3 step lines with a test path among the steps the filter dropped), p8b (0, see below), p6a (4), p6b (3), p7b (2), p7c (1). Tasks with 5 or more: p6c 7, p8a 14, p8c 12, p8d 12, p8e 13.
- **p8b: writer left no file.** The writer ran (code 0, 1 `Write`, 9 `Read`) and left no manifest and no file in `step/work/write/`; the `-2` rerun (code 0, 2 `Write`) left none in `write-2/` either. Under the rerun rule the second run stands, so p8b has no step oracle and 0 ids. Not rerun; flagged for the controller (p8b's build score for the trial's σ_d comes from its step oracle).
- **Ids.** Each task's step ids carry its end's prefix and number after the highest of that prefix in every oracle manifest (p7b's start at T3, after step 5's T2; every other prefix had none). No id collides with another manifest.
- **Grade runs: 24** (p6a 6, p6c 4, the other 7 graded tasks 2 each; no task hit the no-app case, since only p1's base lacks the app file and p1 has no check). Wall clock of the 9 graded tasks minus their agents' run time: 3371 s (56 min) for the 24 runs and the tool around them.
- **Idempotency.** `step` rerun on p6b: no agent ran, both grades `reused`, the same final line.
- **pgsnap.** Before and after the batch (`<data>/logs/step6/pgsnap-task5-{before,after}.txt`): equal, 6 databases, no `bench_re`. No `/tmp/hstack-bench/re-grade-*` worktree left.

Usage (sum of every `.run.json` under `<task>/step/`: listers, writers, fixers, comparers; all code 0, model claude-opus-5-5):

| task | runs | input | output | cache read | cache write | agent s |
|---|---|---|---|---|---|---|
| p1 | 1 lister | 2 | 95 | 4865 | 11534 | 4 |
| p2 | 1 lister | 2 | 106 | 3223 | 17044 | 4 |
| p3 | 1 lister | 2 | 95 | 3223 | 19081 | 3 |
| p4 | 1 lister | 2 | 162 | 3223 | 20988 | 5 |
| p5 | 1 lister | 2 | 86 | 3223 | 19376 | 6 |
| p6a | lister, writer, 2 fixers, 2 comparers | 72 | 25989 | 1039532 | 191427 | 270 |
| p6b | lister, writer | 32 | 12957 | 629150 | 81289 | 133 |
| p6c | lister, writer, fixer, comparer | 70 | 31042 | 1682291 | 173690 | 310 |
| p7b | lister, writer | 22 | 11380 | 211127 | 52190 | 106 |
| p7c | lister, writer, 2 fixers | 62 | 24442 | 833995 | 141710 | 232 |
| p8a | lister, writer | 14 | 18799 | 214906 | 101302 | 146 |
| p8c | lister, writer | 32 | 24170 | 1003075 | 143940 | 202 |
| p8d | lister, writer | 24 | 26314 | 704464 | 150161 | 203 |
| p8e | lister, writer | 44 | 28580 | 1802194 | 163157 | 239 |
| p8b | lister, 2 writers | 36 | 21810 | 955400 | 202758 | 206 |
| total | 34 | 418 | 226027 | 9093891 | 1489647 | 2070 |

Plus the first p1 lister under the first `steps.md` (record kept in `<data>/logs/step6/task5-first-p1/`): input 2, output 64, cache read 3223, cache write 13043, 6 s. With it: 35 runs, input 420, output 226091, cache read 9097114, cache write 1502690.

- **Incident: the first `steps.md`.** p1's first lister (08:37Z) replied `[]` with no tool call. The brief had no rule for a step that names a test file without a title, so it was amended: such a step names the tests of that file its words describe; open every named test file before replying. p1's step folder was removed (its record kept aside) and p1 ran again under the amended brief, again `[]` with no read; the count-only probe above then showed no kept step of p1–p5 names a test, so `[]` is the right reply there.
- **Note.** grade prints the product's setup output (install, seed) on stdout before its counts lines; the step line is the last line before the exit.

#### Controller rulings after v1, and run v2

**Trigger evidence.** The controller's count-only probe `<data>/logs/step6/probe-titles2.mjs` counted quoted strings of `filter-source.md` that are exact `it(`/`test(` titles at the task end: p1 9, p2 15, p3 11, p4 9, p5 13; p6a 13, p6b 13, p7b 27, p8c 84. Prereg §5 keeps pointer-only steps of plans 1–6c as test titles, and the p1–p5 listers had made no tool call and replied `[]` in 3–6 s.

**Note on that probe (implementer).** All its p1–p4 hits are strings that span a line break, and `git grep -e` reads a pattern with a newline as two patterns joined by OR, so those hits are not titles. A per-line version (`<data>/logs/step6/probe-titles3.mjs`) finds 0 test titles in p1–p4's `filter-source.md`. In p5 it finds 5: 4 on dropped steps and 1 outside any step. In p6a and p6b it finds 3 and 5 on kept steps, plus 4 and 8 in Review Focus. The v2 results below agree: p1–p5 list 0.

**Rulings applied (commit 232bf05).**
- `writer()` now builds the `-2` rerun's prompt with `o.text.replaceAll(o.dir, two.dir)`, so it names the rerun's own folder. Step 5's 13 `-2` writer records now hash stale, and no step 5 `write` was rerun.
- `briefs/steps.md` is amended. A step names a test when it quotes the test's title, with or without its file; `file` is `""` when the step gives none. The lister opens the end's test files to confirm each title. The earlier file-only amendment stays.
- The tool resolves an empty `file` by the unique-match rule.
- The lister has a reading gate: a run whose record shows no `Read` reruns once as `-2`. This is combined with the bad-reply and non-zero-code triggers, and the rerun stands.
- 3 new tests: 'a lister run that made no Read is rerun once and the rerun stands', 'a title given with no file resolves only when exactly one test file holds it', and 'a writer rerun's prompt names its own folder'. Against the old `oracle.mjs`: 67 pass, 3 fail. Now `bun test tests/bench-oracle.test.mjs` gives 70 pass, and `bun test ./tests` gives 371 pass, 21 skip, 0 fail.

**Data.** For each of the 15 tasks, `<task>/step` was moved to `<task>/step-v1` and `step.json` into it, unread. p8b was done once, through its `p8b -> 8b` symlink. The v1 logs and pgsnap files went to `<data>/logs/step6/task5-v1/`. `highestOf` reads only `oracle/` and `step/oracle/`, so v2 ids start again after the step 5 highest: p7b at T3, every other prefix at T1. No id collides with another manifest.

**Run v2.** Commit 232bf05, 2026-11-05 10:33:47Z–12:17:06Z (103 min), one task at a time, all exit 0. The final lines:

```
p1 step listed=0 resolved=0 picked=0 written=0 refused=0 none=0 valid=0 absent-at-base=0 weak=0 broken=0 error=0 fixer rounds=0 ids=0
p2 step listed=0 resolved=0 picked=0 written=0 refused=0 none=0 valid=0 absent-at-base=0 weak=0 broken=0 error=0 fixer rounds=0 ids=0
p3 step listed=0 resolved=0 picked=0 written=0 refused=0 none=0 valid=0 absent-at-base=0 weak=0 broken=0 error=0 fixer rounds=0 ids=0
p4 step listed=0 resolved=0 picked=0 written=0 refused=0 none=0 valid=0 absent-at-base=0 weak=0 broken=0 error=0 fixer rounds=0 ids=0
p5 step listed=0 resolved=0 picked=0 written=0 refused=0 none=0 valid=0 absent-at-base=0 weak=0 broken=0 error=0 fixer rounds=0 ids=0
p6a step listed=7 resolved=7 picked=7 written=7 refused=0 none=0 valid=0 absent-at-base=7 weak=0 broken=0 error=0 fixer rounds=2 ids=7
p6b step listed=6 resolved=6 picked=6 written=6 refused=0 none=2 valid=2 absent-at-base=2 weak=0 broken=0 error=0 fixer rounds=0 ids=4
p6c step listed=9 resolved=9 picked=9 written=9 refused=0 none=1 valid=8 absent-at-base=0 weak=0 broken=0 error=0 fixer rounds=0 ids=8
p7b step listed=14 resolved=7 picked=7 written=7 refused=0 none=4 valid=2 absent-at-base=0 weak=1 broken=0 error=0 fixer rounds=0 ids=2
p7c step listed=12 resolved=11 picked=11 written=11 refused=0 none=4 valid=0 absent-at-base=1 weak=5 broken=1 error=0 fixer rounds=2 ids=1
p8a step listed=49 resolved=28 picked=15 written=15 refused=0 none=1 valid=9 absent-at-base=5 weak=0 broken=0 error=0 fixer rounds=0 ids=14
p8c step listed=40 resolved=30 picked=15 written=15 refused=0 none=3 valid=1 absent-at-base=11 weak=0 broken=0 error=0 fixer rounds=0 ids=12
p8d step listed=70 resolved=45 picked=15 written=15 refused=0 none=0 valid=7 absent-at-base=6 weak=2 broken=0 error=0 fixer rounds=0 ids=13
p8e step listed=40 resolved=31 picked=15 written=15 refused=0 none=1 valid=6 absent-at-base=8 weak=0 broken=0 error=0 fixer rounds=0 ids=14
p8b step listed=41 resolved=33 picked=15 written=0 refused=0 none=0 valid=0 absent-at-base=0 weak=0 broken=0 error=0 fixer rounds=0 ids=0
```

- **Totals.**
  - Listed 288, resolved 207, picked 115.
  - Written 100 (refused 0, interface none 16).
  - Validated 84: valid 35, absent-at-base 40, weak 8, broken 1, error 0.
  - Scored ids: 75.
- **Tasks with fewer than 5 ids: 9.** p1–p5 have 0 (every lister listed nothing). p8b has 0 (see below). p6b has 4, p7b 2, p7c 1. Tasks with 5 or more: p6a 7, p6c 8, p8a 14, p8c 12, p8d 13, p8e 14.
- **p8b: no step oracle.** The first writer run ended with code 0 after 1 `Write`. The fixed `-2` run, whose prompt names `write-2/`, ended with code 0 after 2 `Write`. Both folders hold 0 files. The second run stands, and there is no third run.
- **Lister `-2` runs: 9.** In p1–p5, p6a, p6b, p6c and p7b, the first run made no `Read`. Every rerun made no `Read` either, and each stands. In p7c, p8a, p8c, p8d, p8e and p8b, the first run read (1–3 `Read`).
- **Grade runs: 22.** p6a ran 6 (2 fixer rounds that kept files), and the other 8 graded tasks ran 2 each. The 9 graded tasks' wall clock minus their agents' run time is 3527 s (59 min).
- **pgsnap.** Before and after (`<data>/logs/step6/pgsnap-task5v2-{before,after}.txt`) are equal: 6 databases, no `bench_re`. No grade worktree was left.

Usage of v2: the sum of every `.run.json` under `<task>/step/` (listers, writers, fixers, comparers). All ended with code 0, model claude-opus-5-5.

| task | runs | input | output | cache read | cache write | agent s |
|---|---|---|---|---|---|---|
| p1 | 2 listers | 6 | 580 | 22961 | 29591 | 11 |
| p2 | 2 listers | 4 | 150 | 6446 | 34324 | 7 |
| p3 | 2 listers | 8 | 540 | 51601 | 39276 | 14 |
| p4 | 2 listers | 4 | 223 | 6446 | 42212 | 10 |
| p5 | 2 listers | 4 | 169 | 6446 | 38988 | 7 |
| p6a | 2 listers, writer, 2 fixers, 2 comparers | 90 | 42081 | 1431404 | 286794 | 397 |
| p6b | 2 listers, writer | 38 | 18990 | 675244 | 106193 | 193 |
| p6c | 2 listers, writer | 56 | 22170 | 1289091 | 122182 | 217 |
| p7b | 2 listers, writer | 34 | 13438 | 334331 | 68132 | 130 |
| p7c | lister, writer, 2 fixers | 52 | 24163 | 685231 | 132418 | 235 |
| p8a | lister, writer | 22 | 21424 | 441425 | 104237 | 172 |
| p8c | lister, writer | 22 | 23234 | 631974 | 146915 | 190 |
| p8d | lister, writer | 24 | 29492 | 700643 | 153365 | 228 |
| p8e | lister, writer | 44 | 31476 | 1789626 | 161667 | 262 |
| p8b | lister, 2 writers | 42 | 20688 | 1116953 | 201274 | 209 |
| total | 41 | 450 | 248818 | 9189822 | 1667568 | 2280 |

Superseded spend (v1, 35 runs: the 34 in `step-v1/` plus the first p1 lister): input 420, output 226091, cache read 9097114, cache write 1502690.

#### p1–p5 and p8b after run v2 (controller rulings)

- **p1–p5 are accepted with no step oracle.** The per-line probe is right and probe-titles2 overcounted: its p1–p4 hits span a line break, and `git grep -e` ORs the two halves of such a pattern.
- **p8b: the writer's folder was reached through a symlink.** `<data>/p8b` is a symlink to `<data>/8b`.
  - **Probe** (sealed-agent, one Write each, under `/tmp/hstack-bench/symprobe/`). A folder granted only by its symlink path: code 0, `Write` 1, no file landed. The same folder granted by its real path: code 0, `Write` 1, the file landed. Granted by both paths with the prompt naming the symlink path (the fix's shape): code 0, `Write` 1, the file landed. Usage of the 3 probes: input 12, output 390, cache read 29897, cache write 7514.
  - **Fix** (commit 865f6bb). `runWriter` grants each folder (the writer's, the `-2`'s, the fixer's and the fixer's read-only logs) by the given path and by its `realpathSync`, in `additionalDirectories` and in `allow`. The prompt keeps the given path. New test: 'a writer folder reached through a symlink is granted by its real path'. It fails against the old code. `bun test ./tests`: 372 pass, 21 skip, 0 fail.
  - **Data.** p8b's two v2 writer runs (folders, replies, records, prompt, settings) were moved unread to `<data>/p8b/step-v2-writer/`. The lister record stays, so the pick is the same.
  - **Rerun of p8b only** (12:23:20Z–12:34:58Z, exit 0; no new lister run, 1 writer run, 2 grade runs):

```
p8b step listed=41 resolved=33 picked=15 written=13 refused=2 none=1 valid=2 absent-at-base=10 weak=0 broken=0 error=0 fixer rounds=0 ids=12
```

  - **Writer usage:** input 30, output 30427, cache read 1182236, cache write 45916, code 0, 15 `Write`. The two voided v2 writer runs are superseded spend; they are in the v2 table above under p8b.
  - **Ids:** p8b's ids are `1846450-T1` … `T15`. There are no collisions once the `p8b`/`8b` link is counted as one folder (`task5-ids.mjs` counts it twice).
  - **pgsnap:** equal before and after (`<data>/logs/step6/pgsnap-task5p8b-{before,after}.txt`), no `bench_re`, no grade worktree left.
- **Real-estate totals after this rerun.**
  - Ids: 87 (75 + 12).
  - Tasks with fewer than 5 ids: 8 (p1–p5 with 0, p6b 4, p7b 2, p7c 1).
  - Tasks with 5 or more ids: p6a, p6c, p8a, p8b, p8c, p8d, p8e.

### Task 6

The step 9 sample of step checks and the step 6 lock, `progress/step6-lock.md`. No sealed agent ran, and no Docker or database command ran. `oracle queue` was not run.

- **`step9/sample-7.1-step.tsv`.** `<data>/logs/step6/sample-7.1-step.mjs` printed `10`. It is `queuePick` of 10, seed `hstack-bench-2026-10-27`, over the 75 `step.json` ids of the 14 kept real-estate tasks, with p8b excluded. Header `set task id`, set `task-repo`. No other `step9/` file was touched.
- **Floor rule recount.** `<data>/logs/step6/floor-count.mjs` gives the plan's numbers:
  - external median 2, and 2 with the 9 disputed classifications counted;
  - real-estate median 0, and 0.5 with the 11 disputed classifications counted.
- **Step oracle counts.** `<data>/logs/step6/lock-count.mjs` read `step.json`, `step-f2p.json`, step validation verdicts and the severities of the ids, and printed counts only.
  - External: 51 ids. The median is 1 over the 24 tasks and 2 over the 20 tasks with ids. The tasks with none are s1-01, s1-06, s3-01 and s3-07. The one all-`low` task is s1-02.
  - Real-estate (14 kept): 75 ids, median 3. The tasks with none are p1–p5, and no task is all `low`.
  - p8b: 12 ids.
- **Step 5 hashes.** `<data>/logs/step6/lock5-compare.mjs` gave 1369 hashed, 1369 equal, 0 changed, 0 missing. The step 5 lock hashed no p8b file.
- **Hashes.** `<data>/logs/step6/lock-hash.mjs` hashed 555 files plus 16 scripts. One hash was checked against `shasum -a 256`, and the two agree.
- **`git status --short bench`** is empty. `bench/` is at e97944495f4c2a270295bd2dd787ab355999c70e.

Usage: no sealed agent ran (0 tokens of sealed runs). Each script ran in under a few seconds. Implementer tokens are left to the controller's ledger.

### SDD ledger of step 6 (copied before the final review)

    # SDD ledger — plan: docs/plans/2026-11-05-bench-step-oracles.md
    
    Spec: docs/plans/2026-10-27-benchmark-prereg.md (stable). Branch worktree-bridge-cse_01LckcHdPjiRPz5DvPEJXEaJ, plan head 76221d7. User approved the plan and chose option 1 for H1's N on 2026-11-05 ("1", then "subagent-driv").
    
    ## Preflight scan
    
    | rows | produces / consumes | found |
    |---|---|---|
    | T1 ↔ all | T1 edits prereg §2 (+§9.1 pointer), index, log; no code | none |
    | T2 → T4 | f2pOf(origin, f2p, p2p) -> { verdict, by } | consistent |
    | T2 → T5 | nextNumber(ids, sha7); highestOf rewritten over it and reading step/oracle | consistent |
    | T2 → T6/steps 7-14 | floorScore, `oracle score <task> <sha>` reads step.json written by T4/T5 | T2 tests need fixture step.json; fine |
    | T4 ↔ T5 | both add `step` to bench/oracle.mjs (two arities), README, tests/bench-oracle.test.mjs | sequential; arity split: `step <task>` external vs `step <task.json> <task>` — same convention as validate/classify |
    | T3 ↔ T5 | T3 reclassifies p8b (labels/agreement); T5 builds p8b/step | disjoint files |
    | T5 ↔ T6 | T6 samples scored real-estate step ids from step/validation-<end7>.json | consistent |
    | T1 self | rulings 1–9 + decision; "as decided" now = option 1 | ok |
    | T2 self | tests list matches interfaces | ok |
    | T3 self | data-only, uses existing classify; moves trial classify files first | ok |
    | T4 self | step-f2p.json for every scored check, ids from build+f2p; test 'rerun reuses resolver' | ok after d47fa1b |
    | T5 self | lister → resolve → pick → writer → validate → labels/step.json; no-app base | ok |
    | T6 self | check that step 5 hashes still match except p8b classify files and new step9 files | ok |
    
    - Ruling: tasks run strictly sequentially in this worktree (T3/T4 runs beside T5 allowed by the plan but not needed) — the skill forbids parallel implementers and progress/progress.md would conflict — cost if wrong: an hour or two of wall clock.
    - Ruling: implementers record sealed-agent usage and run wall clock in progress/progress.md under a new section "2026-11-05 — step oracle plan"; the controller records implementer/reviewer usage in this ledger and copies it there before the final review — cost if wrong: none.
    Task 1: dispatched implementer (sonnet), base 76221d7
    Task 1: implementer done 3152f47 (sonnet 70.4k tokens, 1.2 min); reviewer dispatched (sonnet)
    Task 1: review approved (sonnet), spec ✅
    Task 1: minor (deferred): prereg ruling 2 drops "so its record is reused"; ruling 4 drops "(step 5 build ruling 19)"; ruling 5 drops "since a setup there throws"; user decision omits that ruling 14 reopened the walk only for a dropped task (this decision extends it to an empty step oracle); probe count 47/55 omitted
    Task 1: complete (commits 76221d7..3152f47, review clean)
    Task 1: reviewer sonnet 66.3k tokens, 1.1 min
    Task 2: dispatched implementer (sonnet), base 3152f47
    - Ruling: f2pOf — an origin name exact in both f2p and p2p lists is `ask` (not f2p) — the plan's exact rule is silent on a name in both lists; asking the resolver is the conservative reading — cost if wrong: a few extra resolver origins.
    - Ruling: floorScore — a step id missing from the grade's checks counts as not passed — a missing case is an error in grade's own contract — cost if wrong: none (step ids always come from the graded manifest).
    Task 2: implementer done b162d56 (354 pass); concerns: missing id weighted high & not passed; exact-only-in-p2p → p2p; score ignores step grade's excluded
    Task 2: implementer sonnet 90.1k tokens, 7.5 min; reviewer dispatched (sonnet)
    Task 2: review approved (sonnet), spec ✅
    Task 2: minor (deferred): score treats any step.oracle other than "step/oracle" as "oracle" and a non-array ids throws a bare TypeError; f2pOf exact-only-in-p2p returns p2p before the segment rule (undocumented); floorScore ignores the step grade's own excluded (comment would help); an absent id silently lowers the score; segment split on '.' can collide names
    - Ruling: accept f2pOf "exact in p2p only → p2p" — it is the symmetric reading of the exact rule and only drops a check (safe direction) — cost if wrong: a true f2p check out of H1 for a task.
    Task 2: complete (commits 3152f47..b162d56, review clean)
    Task 2: reviewer sonnet 87.1k tokens, 1.8 min
    Task 3: dispatched implementer (sonnet), base b162d56
    Task 3: implementer done 771a364; p8b classified=9 build=0 requirement=5 partly=3 disputed=1 κ .80 raw .89 AC1 .85
    Task 3: implementer sonnet 59.6k tokens, 2.0 min; reviewer dispatched (sonnet)
    Task 3: review approved (sonnet), spec ✅
    Task 3: minor (deferred): progress.md p8b table says trial traceable "1" (should be "1 vs 0" per rater) and disputed "not recorded" (section 14 records 3; 730509b-T1 disputed in both)
    Task 3: complete (commits b162d56..771a364, review clean)
    Task 3: reviewer sonnet 62.7k tokens, 1.0 min
    Task 4: dispatched implementer (opus), base 771a364
    - Ruling: Tasks 4 and 5 use opus implementers — real sealed runs and multi-file integration, as step 5 did — cost if wrong: tokens only.
    Task 4: implementer done 8ac563a (code) c130318 (record); 24 tasks, 159 scored, f2p 142/p2p 7/unknown 10; candidates 51, ids 51; 0 ids: s1-01 s3-01 s1-06 s3-07 → H1 N 20; concern: resolvers barely read (1 Grep, 0 Read)
    - Ruling: add a resolver reading gate — a resolver run whose record shows no Read call is rerun once as -2 (first record kept) and the rerun stands, whatever it reads — same content-independent gate as step 5 rulings 12 and 40, and the brief tells the resolver to open the listed tests — cost if wrong: ~80 s and a few hundred k tokens; verdicts of up to 6 checks may change.
    Task 4: implementer opus 142.2k tokens, 14.2 min (first pass); resumed with the reading-gate ruling (pre-review concern fix)
    Task 4: gate added 1734911, record f442271; 5 -2 reruns, 4 still made no Read; ids and verdicts unchanged (ids 51, 0-id tasks s1-01 s3-01 s1-06 s3-07)
    - Ruling: no brief change and no further rerun — the gate's rerun stands, as step 5 ruling 14 decided for the labellers (changing the measure after seeing its effect would be tuning); the resolver gets the case lists in its prompt, so a Grep-only decision is possible; under-reading is a known limit for the lock — cost if wrong: up to 6 checks (s2-02, s2-10, s3-06 kept; s3-05, s3-07 out) with a thinly read f2p verdict; step 9 could add a human read of them.
    Task 4: implementer opus total 152.3k tokens, 18.9 min; reviewer dispatched (opus)
    Task 4: review approved (opus), spec ✅
    Task 4: minor (deferred): no test for the non-zero-code resolver rerun; step-f2p.json key order differs by source; f2pReply cuts first '[' to last ']' (same as classReply); f2pReply repeats ~6 lines of classReply; progress.md gives resolver usage as batch sums, not per task (brief asked per task); two refusal lines also go to stdout (documented)
    Task 4: complete (commits 771a364..f442271, review clean)
    Task 4: reviewer opus 87.3k tokens, 1.5 min
    Task 5: dispatched implementer (opus), base f442271
    - Ruling: no reading gate for the real-estate lister — the tool verifies every listed title against the end's test files, so an unread listing cannot add a wrong test — cost if wrong: fewer resolved steps for a task.
    - Ruling: the writer's given ids are stored in its run record (as split does) and an entry with an id not given or an origin not its given test is refused — keeps ids stable across reruns and pins each check to its picked test — cost if wrong: none.
    Task 5: implementer done f498b3c (code) c789df3 (record); 15 tasks: listed 285, resolved 204, picked 112, written 97, scored ids 68; p1–p5 0 ids (listers replied [] with no tool call in 3–6 s), p8b 0 ids (writer and -2 left no file); opus 273.8k tokens, 119.4 min
    - Ruling: p1–p5's [] is a lister failure, not a fact — probe-titles2 (logs/step6) finds 9–15 quoted strings per task that are exact it()/test() titles at the end, and prereg §5 keeps plans 1–6c's pointer-only steps as test titles; amend steps.md (a step names a test when it quotes its title, with or without its file; open the end's test files before replying), reverse my no-gate ruling and add the resolver's gate to the lister (a record with no Read reruns once as -2, the rerun stands), void all 15 step/ folders and step.json unread (mv to <task>/step-v1/, superseded spend) and rerun all 15 under one brief — same move as step 5 ruling 11; candidates drawn under one brief keep "chosen by seed" — cost if wrong: ~100 min and ~3M tokens.
    - Ruling: fix writer(): the -2 rerun's prompt named the first run's folder while its settings grant only <dir>-2 (bug since step 5); text.replaceAll(o.dir, two.dir), test 'a writer rerun's prompt names its own folder' — content-independent instrument fix — cost if wrong: the 13 step 5 -2 writer records now hash stale, so a later `write` rerun on them refuses loudly (step 5 is locked; all 13 step 5 -2 folders hold a manifest, so step 5 outcomes stand; only p8b's step writer was bitten).
    - Ruling: `p8b` is a symlink to `8b` (since 2026-10-27); scans over <data> see both names; Task 6 hashes through `p8b` only and the lock says so — cost if wrong: none.
    Task 5: fix round (pre-review) done 232bf05 (code) 7219a59 (record); v2: listed 288, resolved 207, picked 115, written 100, validated 84 (valid 35, absent 40, weak 8, broken 1), ids 75; p1–p5 still 0 (my probe-titles2 overcounted: its quoted strings spanned line breaks, git grep -e split them; per-line probe-titles3 finds 0 titles in p1–p4); p8b writer and fixed -2 again 0 files; lister gate fired in 9 tasks, reruns also made no Read
    - Ruling: accept p1–p5 with no step oracle — their kept steps name no test (per-line probe and two lister briefs agree); my overcount cost one rerun (~100 min, ~3M tokens), recorded as such — cost if wrong: H1 has no real-estate score for p1–p5 (secondary set, reported only).
    - Ruling: p8b's empty writer is suspected to be the p8b→8b symlink: the writer's settings grant Edit under the symlink path while the Write tool resolves to the real path; fix runWriter to grant its folder by its real path as well, verify with a tiny probe, void p8b's writer records unread and rerun step for p8b only — content-independent instrument fix — cost if wrong: one more p8b writer run.
    Task 5: p8b fix done 865f6bb (code) 598d5aa (record); probe confirmed (symlink-only grant: no file; real-path grant: file); p8b ids 12 (written 13, refused 2, none 1); real-estate total 87 ids; under 5: p1–p5 0, p6b 4, p7b 2, p7c 1
    - Ruling: no symlink probe for classify/split — Task 3's p8b rater records show filesInFolder 7/7, which readCount counts only from successful Read results under the folder, so the reads under the symlinked grant worked — cost if wrong: none for scores (p8b labels feed no score).
    Task 5: implementer opus total 322.6k+ tokens across three rounds (~110+109 min first two rounds; third round short)
    Task 5: implementer opus total 339.8k tokens (all rounds), ~240 min wall incl. runs; reviewer dispatched (opus) over f442271..598d5aa
    Task 5: review needs fixes (opus): I1 fixer folder copy holds manifest.json with the step text; I2 rerun prints fixer rounds=0 / may print a stale-fixer line; I3 README should say step 5's -2 write records now refuse on rerun; minors: title with \n can resolve falsely (fix now, cheap), grade prints setup output on stdout (pre-existing), voided v1 ids reuse numbers, missing check at end is broken
    - Ruling: I1 — strip `step` from the fixer folder's manifest copy from now on; do NOT void p6a's and p7c's v2 fixer runs — the comparer keeps a fixer change only when it calls every assertion `same`, so step text in the fixer's folder cannot change what a kept check asserts — cost if wrong: up to 2 rounds of fixes in p6a/p7c that a step-text-blind fixer might have made differently (mechanics only).
    - Ruling: I2 — document that the counts line's `fixer rounds` counts the rounds run in that invocation (same as step 5 validate); data files are idempotent — cost if wrong: a reader misreads a rerun's line.
    Task 5: reviewer opus (tokens in notification)
    Task 5: reviewer opus 149.9k tokens, 7.7 min; fix round 1 dispatched (resume implementer)
    Task 5: fix round 1/5 (4 addressed, 0 open — fixer copy step text, rounds doc, write -2 stale doc, newline title; commits 598d5aa..e979444); re-review sonnet
    Task 5: minor (deferred): grade prints product setup output on stdout before counts lines (pre-existing, grade.mjs); voided step-v1/ and step-v2-writer/ reuse id numbers of live step oracles (unread, harmless); a check missing from the end grade reads broken and spends fixer rounds
    Task 5: complete (commits f442271..e979444, review clean after 1 round)
    Task 5: implementer fix round sonnet? no — opus resumed, total 346.4k tokens; re-review sonnet 66.6k tokens, 0.5 min
    Task 6: dispatched implementer (opus), base e979444
    - Ruling: sample-7.1-step.tsv draws from the 14 kept tasks only, p8b excluded (trial-only, never scored) — cost if wrong: one p8b check missing from the human read.
    Task 6: implementer done e821cb7; step 5 hashes 1369/1369 equal; sample 10 rows of 75; external ids 51, H1 N 20; real-estate 87 ids
    Task 6: implementer opus 156.3k tokens, 11.0 min; reviewer dispatched (sonnet)
    Task 6: review approved (sonnet), spec ✅
    Task 6: minor (deferred): lock's rulings drop the "cost if wrong" clauses and add editorial text; plan-ruling and lock-ruling numbers mix ("ruling 8"); preface points to the gitignored SDD ledger path; no per-task "out" column for external tasks (derivable); line on resolver verdicts says "one or two searches each" though s2-02's rerun read
    Task 6: complete (commits e979444..e821cb7, review clean)

### SDD ledger tail after the final review

    Task 6: reviewer sonnet 110.1k tokens, 3.1 min
    Final review (opus): with fixes — I1 score fails for tasks with empty step ids (p1–p5); I2 new "real-estate" naming in bench/README and a comment; I3 count lister replies with newline titles (expect 0) before step 10 relies on the data; I4 ruling 17 (p6a/p7c fixers had step text in their folder copy) — user's call; minors M1 loud refusal for step ids missing from a grade, M2 comment on `out` in H2, M3 external step writes resolver files (README/test name), M4 step 10 rerun rewrites step validation files (lock hashes), M5 title substring can resolve to a longer test (known limit), M6 README: two grades per product
    - Ruling: keep ruling 17 (accept p6a/p7c fixer runs) and surface it to the user as reversible — the plan's ruling 4 binds the writer, the fixer had it in a readable folder not its prompt, the comparer kept only `same` assertions, and p6a/p7c hold few ids; voiding means restoring their step oracles and regrading — cost if wrong: mechanics of p6a/p7c step checks chosen by a fixer that could read step text.
    - Ruling: one fix wave covers I1, I2, I3 (count only), M1, M2, M3, M4 and M5 (lock), M6, and the two lock wording minors (ledger pointer, "one or two searches") — all small; prereg ruling 2's two f2pOf clarifications wait for the build-approval addendum as step 5 did — cost if wrong: none.
    Final review: opus 206.8k tokens, 13.0 min; fix wave dispatched (sonnet)
    Final fix wave: done 87ff168 3bbc589; 374 pass 21 skip; I3 0 newline titles of 321 entries
    Final fix wave: re-review sonnet: all 8 addressed, no new breakage (commits 2ee12f9..3bbc589)

## 2026-11-06 — seeded bugs plan

### Task 5: Pilot

Four tasks, one at a time, all exit 0, no disk-full exits, no reruns. `HSTACK_BENCH_MACHINE` set; scratch under `.evidence/bench/logs/step7/`.

    s1-01 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s2-01 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s3-01 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    p8a   seed candidates=2 refused=0 pass-at-end=2 fixer=0 graded=1 valid=1 weak=0 broken=0 error=0 kept=1

Wall clock: s1-01 641 s (10.7 min), s2-01 1014 s (16.9 min), s3-01 1224 s (20.4 min), p8a 172 s (2.9 min); total 3051 s (50.9 min).

Docker: `docker builder prune -f` ran 3 times (before s1-01: 21.24 GB; before s3-01: 18.81 GB; before p8a: 18.59 GB; cache was 10.8 GB before s2-01, so no prune there). None was a disk-full retry. Build Cache after each prune 1.14 GB. Leftovers: `bench-ext-` containers (not fx/other) 0; `bench-ext/*` `-serve`/`-grade` images 0.

pgsnap before and after: equal (cmp). `git status --short`: empty before this commit.

Usage (sum of `*.run.json` under each task's `seeded/work/`, one seeder run per task, model claude-opus-5-5):

| task | input | output | cacheRead | cacheWrite | runs |
|---|---|---|---|---|---|
| s1-01 | 10 | 22841 | 130180 | 60459 | 1 |
| s2-01 | 18 | 32018 | 1274399 | 220992 | 1 |
| s3-01 | 10 | 18229 | 145002 | 54624 | 1 |
| p8a | 8 | 7793 | 91007 | 42457 | 1 |

### Task 6: All tasks

Two drivers (`run-ext.sh`, `run-re.sh`) ran detached with `HSTACK_BENCH_MACHINE` set, one task at a time per lane, the real-estate lane beside the external lane; drivers, counts and logs live under `.evidence/bench/logs/step7/`. Every task exit 0. The four pilot tasks (s1-01, s2-01, s3-01, p8a) reused every record in 1 to 2 s and printed the same line as in Task 5.

Every `seed` line (external, sample.tsv order; then real-estate):

    s1-01 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s1-02 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s1-03 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s1-04 seed candidates=5 refused=0 pass-at-end=5 fixer=1 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s1-05 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s1-06 seed candidates=5 refused=0 pass-at-end=5 fixer=1 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s1-07 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s1-09 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s2-01 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s2-02 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s2-03 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s2-05 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s2-07 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s2-08 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s2-09 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s2-10 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s3-01 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s3-02 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s3-03 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s3-04 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s3-05 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s3-06 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s3-07 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3
    s3-08 seed candidates=5 refused=0 pass-at-end=5 fixer=0 graded=3 valid=3 weak=0 broken=0 error=0 kept=3

    p1 seed candidates=2 refused=0 pass-at-end=2 fixer=1 graded=2 valid=1 weak=1 broken=0 error=0 kept=1
    p2 seed candidates=2 refused=0 pass-at-end=2 fixer=1 graded=1 valid=1 weak=0 broken=0 error=0 kept=1
    p3 seed candidates=2 refused=0 pass-at-end=2 fixer=1 graded=1 valid=1 weak=0 broken=0 error=0 kept=1
    p4 seed candidates=2 refused=0 pass-at-end=2 fixer=0 graded=1 valid=1 weak=0 broken=0 error=0 kept=1
    p6a seed candidates=2 refused=0 pass-at-end=2 fixer=0 graded=1 valid=1 weak=0 broken=0 error=0 kept=1
    p8a seed candidates=2 refused=0 pass-at-end=2 fixer=0 graded=1 valid=1 weak=0 broken=0 error=0 kept=1
    p8c seed candidates=2 refused=0 pass-at-end=2 fixer=0 graded=1 valid=1 weak=0 broken=0 error=0 kept=1
    p8d seed candidates=2 refused=0 pass-at-end=2 fixer=0 graded=1 valid=1 weak=0 broken=0 error=0 kept=1
    p8e seed candidates=2 refused=0 pass-at-end=2 fixer=0 graded=1 valid=1 weak=0 broken=0 error=0 kept=1

Wall clock: external lane 31793 s (8.83 h, 24 tasks, the 3 reused pilot tasks about 2 s each); real-estate lane 2010 s (33.5 min, 9 tasks, p8a reused 1 s). Per-task start and end epochs are in `run-ext.lines` and `run-re.lines`.

Docker: `docker builder prune -f` ran 13 times, all by the Build Cache above 15 GB rule before a task (s1-04 22.87 GB, s1-05 17.28, s1-07 20.12, s2-03 20.96, s2-05 25.59, s2-07 24.85, s2-09 20.53, s3-01 21.64, s3-03 30.80, s3-04 25.83, s3-05 24.42, s3-06 22.21, s3-08 27.47); none was a disk-full retry (no exit 3, no `disk` line). The real-estate lane ran no prune.

Reruns: none. No `seed not judged` line, no `error` in any line, no tool throw, no non-zero exit.

counts.mjs (reads only the fields state, why, edge, severity of each `bugs.json`; `ungraded` = candidates left over once the count of valid bugs was reached): The per-task edge and severity columns were removed at the final review (ruling M3); the per-set counts stay.

    --- external
    s1-01 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    s1-02 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    s1-03 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    s1-04 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    s1-05 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    s1-06 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    s1-07 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    s1-09 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    s2-01 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    s2-02 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    s2-03 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    s2-05 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    s2-07 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    s2-08 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    s2-09 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    s2-10 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    s3-01 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    s3-02 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    s3-03 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    s3-04 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    s3-05 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    s3-06 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    s3-07 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    s3-08 candidates=5 refused=0[-] end-fail=0 valid=3 weak=0 broken=0 error=0 ungraded=2 kept=3
    TOTAL external: candidates=120 refused[-] end-fail=0 valid=72 weak=0 broken=0 error=0 ungraded=48 kept=72
      kept by edge boundary:11,case:6,deleted:9,duplicate:15,empty:15,null:16
      kept by severity high:11,low:3,medium:58
      below count: none; missing: none
    --- real-estate
    p1 candidates=2 refused=0[-] end-fail=0 valid=1 weak=1 broken=0 error=0 ungraded=0 kept=1
    p2 candidates=2 refused=0[-] end-fail=0 valid=1 weak=0 broken=0 error=0 ungraded=1 kept=1
    p3 candidates=2 refused=0[-] end-fail=0 valid=1 weak=0 broken=0 error=0 ungraded=1 kept=1
    p4 candidates=2 refused=0[-] end-fail=0 valid=1 weak=0 broken=0 error=0 ungraded=1 kept=1
    p6a candidates=2 refused=0[-] end-fail=0 valid=1 weak=0 broken=0 error=0 ungraded=1 kept=1
    p8a candidates=2 refused=0[-] end-fail=0 valid=1 weak=0 broken=0 error=0 ungraded=1 kept=1
    p8c candidates=2 refused=0[-] end-fail=0 valid=1 weak=0 broken=0 error=0 ungraded=1 kept=1
    p8d candidates=2 refused=0[-] end-fail=0 valid=1 weak=0 broken=0 error=0 ungraded=1 kept=1
    p8e candidates=2 refused=0[-] end-fail=0 valid=1 weak=0 broken=0 error=0 ungraded=1 kept=1
    TOTAL real-estate: candidates=18 refused[-] end-fail=0 valid=9 weak=1 broken=0 error=0 ungraded=8 kept=9
      kept by edge boundary:4,case:2,empty:1,null:2
      kept by severity high:1,medium:8
      below count: none; missing: none
    final n=81 of 81; half-width at p=0.3: 10.0 points (target n=81: 10.0)

Final n = 81 of 81 (external 72 = 24 x 3, real-estate 9 = 9 x 1). Half-width at p = 0.3: 1.96 x sqrt(0.21 / 81) = 0.0998, 10.0 points (the plan quotes 10.2). No task is below its count.

pgsnap: `pg-before.txt` and `pg-after.txt` equal (cmp), 6 databases. `git status --short`: empty before this commit. Leftovers: `bench-ext-` containers other than fx*/other 0; `bench-ext/*` images with a tag ending `-serve` or `-grade` 0. Docker after the run: Images 4.807 GB, Containers 5.565 MB, Volumes 386 MB, Build Cache 23.08 GB (grew after the last prune; the rule prunes before the next task).

Usage (sum of `usage` of every `*.run.json` under each task's `seeded/work/`; model claude-opus-5-5; 43 sealed-agent runs):

    s1-01  input=10 output=22841 cacheRead=130180 cacheWrite=60459 runs=1
    s1-02  input=26 output=37258 cacheRead=675465 cacheWrite=114731 runs=1
    s1-03  input=14 output=32515 cacheRead=217074 cacheWrite=60026 runs=1
    s1-04  input=48 output=50499 cacheRead=1430188 cacheWrite=256494 runs=3
    s1-05  input=20 output=35070 cacheRead=631735 cacheWrite=102812 runs=1
    s1-06  input=30 output=34554 cacheRead=496351 cacheWrite=134813 runs=3
    s1-07  input=12 output=27029 cacheRead=239203 cacheWrite=72659 runs=1
    s1-09  input=18 output=32746 cacheRead=528579 cacheWrite=105108 runs=1
    s2-01  input=18 output=32018 cacheRead=1274399 cacheWrite=220992 runs=1
    s2-02  input=26 output=52018 cacheRead=1321429 cacheWrite=184000 runs=1
    s2-03  input=18 output=24005 cacheRead=502667 cacheWrite=101666 runs=1
    s2-05  input=20 output=31551 cacheRead=622840 cacheWrite=104389 runs=1
    s2-07  input=12 output=43742 cacheRead=265519 cacheWrite=90303 runs=1
    s2-08  input=22 output=35562 cacheRead=571644 cacheWrite=111076 runs=1
    s2-09  input=22 output=49256 cacheRead=1026905 cacheWrite=191617 runs=1
    s2-10  input=16 output=20378 cacheRead=430082 cacheWrite=87239 runs=1
    s3-01  input=10 output=18229 cacheRead=145002 cacheWrite=54624 runs=1
    s3-02  input=8 output=21967 cacheRead=82828 cacheWrite=44551 runs=1
    s3-03  input=10 output=25663 cacheRead=102722 cacheWrite=51419 runs=1
    s3-04  input=18 output=25421 cacheRead=358073 cacheWrite=72872 runs=1
    s3-05  input=13 output=22852 cacheRead=271286 cacheWrite=71710 runs=1
    s3-06  input=16 output=33326 cacheRead=416116 cacheWrite=93455 runs=1
    s3-07  input=12 output=25123 cacheRead=177750 cacheWrite=70219 runs=1
    s3-08  input=22 output=37613 cacheRead=727187 cacheWrite=121736 runs=1
    p1     input=22 output=16082 cacheRead=135589 cacheWrite=53869 runs=3
    p2     input=26 output=14756 cacheRead=264242 cacheWrite=77347 runs=3
    p3     input=22 output=14203 cacheRead=205085 cacheWrite=78003 runs=3
    p4     input=10 output=11357 cacheRead=159604 cacheWrite=51184 runs=1
    p6a    input=12 output=17397 cacheRead=242910 cacheWrite=65538 runs=1
    p8a    input=8 output=7793 cacheRead=91007 cacheWrite=42457 runs=1
    p8c    input=12 output=9848 cacheRead=267800 cacheWrite=64461 runs=1
    p8d    input=12 output=8769 cacheRead=232112 cacheWrite=58570 runs=1
    p8e    input=12 output=10881 cacheRead=187872 cacheWrite=56906 runs=1
    TOTAL  input=577 output=882322 cacheRead=14431445 cacheWrite=3127305 runs=43 models=claude-opus-5-5

### Task 7: Kills

`bun bench/oracle.mjs kills` on every task with a kept bug, two lanes side by side (drivers `run-kills-ext.sh`, `run-kills-re.sh` in `<data>/logs/step7/`). No tool throw, no `kills not judged`, no non-zero exit, no disk retry, so no rerun.

Kills lines (`fix` = checks of the fix-commit oracle that catch the bug, `step` = same for the step oracle):

- external, 24 tasks, every task `bugs=3`, `step=none`: s1-01 fix=0/3; s1-02 0/3; s1-03 2/3; s1-04 2/3; s1-05 0/3; s1-06 1/3; s1-07 0/3; s1-09 1/3; s2-01 1/3; s2-02 0/3; s2-03 1/3; s2-05 1/3; s2-07 1/3; s2-08 0/3; s2-09 0/3; s2-10 1/3; s3-01 1/3; s3-02 2/3; s3-03 0/3; s3-04 3/3; s3-05 1/3; s3-06 3/3; s3-07 1/3; s3-08 2/3.
- real-estate, 9 tasks, every task `bugs=1`: p1 fix=0/1 step=none; p2 0/1 none; p3 0/1 none; p4 0/1 none; p6a 1/1 step=0/1; p8a 0/1 step=0/1; p8c 0/1 step=1/1; p8d 0/1 step=1/1; p8e 0/1 step=0/1.

Per-set shares (`kills-count.mjs`):

| set | bugs | fix kills > 0 | with a step oracle | step kills > 0 (of those) | killed by neither |
|---|---|---|---|---|---|
| external | 72 | 24 (33%) | 0 | - | 48 (67%) |
| real-estate | 9 | 1 (11%) | 5 | 2 (40%) | 6 (67%) |

Wall clock: external lane 6 h 23 min (22975 s), real-estate lane about 35 min. Build Cache prunes: 15, all by the above-15-GB rule before a task (s1-01, s1-03, s1-05, s1-07, s2-02, s2-05, s2-07, s2-09, s3-01, s3-02, s3-03, s3-04, s3-05, s3-06, s3-08); none by a disk signal. pgsnap before and after the real-estate lane: equal. After both lanes: 0 `bench-ext-` containers other than `fx*`/`other`, 0 `bench-ext/*` `-serve`/`-grade` images, Docker 4.8 GB images and 17.8 GB build cache.

Correction (Task 8, after `kills` was fixed to read the bug grade's `excluded`; see `progress/step7-lock.md`): external fix oracle kills 28 of 72 bugs (39%), not 24 (33%); killed by neither 44 (61%); s1-02 is now fix=3/3 and s2-01 fix=2/3; real-estate shares unchanged (1 of 9 by fix, 2 of 5 by step, 6 of 9 by neither).

### Task 8: Lock

`progress/step7-lock.md` written from counts-only scripts in `.evidence/bench/logs/step7/` (`lock-hash`, `lock6-compare`, `lock-seed`, `lock-bugs`, `lock-refs`, `lock-files`, `lock-step-sens`, `lock-excluded`), no code change, no grade, no Docker build, no seeder run. Hashes: 1071 files (the `seeded/` files of 33 tasks, 25 env files, 2 briefs, 16 scripts and drivers).

- Compares: `lock5-compare.mjs` hashed 1369, equal 1369, changed 0, missing 0; `lock6-compare.mjs` hashed 572, equal 572, changed 0, missing 0.
- Refs: 21 sealed repos, 138 refs, 138 candidates with a commit, 0 mismatches; 30 source repos (29 `ext/repos`, the real-estate copy) hold 0 `refs/seeded`.
- External H1 sensitivity: 20 tasks with a step id, 60 kept bugs, 11 caught by a step id (8 tasks); s1-01, s1-06, s3-01, s3-07 have no step id.
- Finding, fixed: `kills` read `excluded` from the end grade, stale in 9 of 24 external tasks. `killsOf` now reads the bug grade's list (commit 09818c2, 418 tests pass); `kills` reran on all 33 tasks with every grade reused (86 of 86), giving 28 of 72 external fix kills (was 24). External step sensitivity unchanged: 11 of 60. Compares after the rerun: step 5 1369/1369, step 6 572/572, step 7 1071/1071. `step7-lock.md` "Findings".
- `bun test ./tests`: 418 pass, 21 skip, 0 fail. `git status --short bench`: empty. `bench/` last commit 09818c2. Docker left: 328 containers, 162 images (as the step 5 lock), 0 `-serve`/`-grade`. pgsnap lists equal for Tasks 5, 6 and 7.
- Usage: sealed agents 43 runs (claude-opus-5-5), input 577, output 882322, cache read 14431445, cache write 3127305; Task 8 ran none. Wall clock: Task 6 external 31793 s, real-estate 2010 s; Task 7 external 22962 s, real-estate 2094 s. Task 8 implementer: this session, tokens not shown in the hand-back.

### SDD ledger of the seeded bugs plan (copied before the final review)

    # SDD ledger — plan: docs/plans/2026-11-05-bench-seeded-bugs.md

    Preflight scan (2026-11-06). Spec: docs/plans/2026-10-27-benchmark-prereg.md.

    | pair / task | produces vs consumes, or self-agreement | found |
    |---|---|---|
    | T1 / all | T1 only writes docs; rulings 1-13 + decisions | clean |
    | T2 → T3 | applyEdit, changedRanges, inChanged, EDGES consumed by seedCommit | clean; T3 lists gate `edge` so seedCommit needs EDGES though Consumes omits it: Ruling below |
    | T2 → T4 | ownVerdict, killsOf consumed by seed, kills | clean |
    | T3 → T4 | seedRepo, seedCommit, highestOf consumed by seed | clean |
    | T4 → T5/T6/T7 | commands run; T5-7 write no code | clean |
    | T6 → T8 | counts.mjs, lines | clean |
    | T7 → T8 | kills.json | clean |
    | T1 self | one step, one commit | clean |
    | T2 self | tests match signatures | ownVerdict: `pass,error` error; `fail,fail` broken via verdict: agrees |
    | T3 self | seedCommit gates: ruling 4 lists six reason conditions; `why` lists edge,test file,no file,find,hunks,outside; find==replace maps to `find` via applyEdit null | clean |
    | T4 self | step 3 of seed: not judged exits 1; prints fixed line | clean |
    | T5 self | prune allowed by constraints; pilot tasks s1-01, s2-01, s3-01, p8a | clean |
    | T8 self | lock5-compare exists at <data>/logs/ (step 6); step 6 compare must be written | Ruling below |

    Ruling: Task 3's Consumes gets EDGES added (seedCommit's `edge` gate reads it) — the plan's Interfaces list omitted it while its `why` names it — cost if wrong: none.
    Ruling: Task 8 writes the step 6 hash compare as a small counts-only script under <data>/logs/step7/ next to a rerun of lock5-compare — the plan says "the same compare" without a file — cost if wrong: a script.
    Ruling: tasks run strictly sequentially in this worktree; oracle-run stays the main checkout's bench/ext.mjs through the env files, unchanged by this plan — cost if wrong: an implementer who edits ext.mjs would not take effect until merge.
    Task 1: implementer sonnet 86.7k tok / 1.4 min, commit 54bb373
    Task 1: review sonnet 90.1k tok / 1.2 min: spec ok, approved; two cannot-verify items resolved by controller (rulings 33/36/37 exist in step5-lock; section 11 Part 1 has "81 × about 0.1M").
    Task 1: minor (deferred): prereg 8.3 ruling 8 "(7.1, ruling 11)" should read "step 5 ruling 11".
    Task 1: complete (commits c836045..54bb373, review clean)
    Task 2: implementer sonnet 79.4k tok / 3.9 min, commit 2dff58f
    Task 2: review sonnet 74.2k tok / 0.4 min: spec ok, approved.
    Task 2: minor (deferred): killsOf with a check missing from the bug grade is not pinned by a test; inChanged not run against a pure-deletion range in tests; changedRanges slice(6) has diffHunks' limit on paths with spaces.
    Task 2: complete (commits 54bb373..2dff58f, review clean)
    Ruling: seedCommit's edit argument also carries `edge`, because the plan's `why` list has `edge` but its signature names only file, find, replace — cost if wrong: one renamed field.
    Task 3: implementer sonnet 98.2k tok / 4.1 min, commit 9613963
    Task 3: review sonnet 86.5k tok / 1.6 min: spec ok, approved.
    Task 3: minor (deferred): temp index removal on failure untested; a throw in the seedCommit diff leaves the ref (aborts the caller); a non-UTF-8 byte on the edited line itself decodes lossily and passes the hunks gate; concurrent seedRepo on one repo races (tasks run one at a time).
    Task 3: complete (commits 2dff58f..9613963, review clean)
    Ruling: bugs.json `state` drops `valid-spare`: grading stops at the count, so a valid candidate past it cannot exist — the plan lists a state no path reaches — cost if wrong: one more word.
    Ruling: an ungraded spare's check is written to validation-<end7>.json with verdict `error`, stage `not graded`, so `grade` excludes it when a product is graded — a check never validated must not count in a catch — cost if wrong: none, it reads as excluded.
    Task 4: implementer opus, commit 6a73ce0, DONE_WITH_CONCERNS (usage not shown in the hand-back)
    Task 4: implementer opus 241.3k tok / 25.3 min. review opus 208.0k tok / 13.1 min: spec fail: 1 Critical (bare --shared clone of a shallow repo is empty), 3 Important (never-ready bug cached; kills reads no results as 0; ready end with all error is not not-judged), 7 Minor.
    Controller check: all 29 ext/repos are bare and shallow; the real-estate copy is not. Finding 1 confirmed for all 24 external tasks.
    Ruling: the sealed repo is `git init --bare` with objects/info/alternates to the source and the source's `shallow` copied on every seedRepo call — bare clone gives an empty repo from a shallow source — amends ruling 5's "clone --bare --shared" wording in the plan and prereg 8.3 — cost if wrong: Task 4's fix re-reviewed; a source fetched deeper later needs one more seedRepo call.
    Ruling: `kills` does not call grade for the end when the existing end grade is good (same commit, junit ok, same oracleSha, last run ready), because grade rewrites the file on --reuse with today's labels and the step 6 lock hashes step/grades/<end7>.json — cost if wrong: an end grade with stale `excluded` is read; killsOf reads it from the grade, and validations did not change since.
    Ruling: finding 4: fixers stay, then an end with every check error is not judged; a seeded runner.json with a real mistake then stays not judged after 2 fixer rounds instead of being dropped — reported per task at Task 6 and a rerun is on the controller; ruling 8 says a machine failure is never an out and the tool cannot tell the two apart without reading logs — cost if wrong: one task needs a by-hand decision.
    Ruling: finding 10: a candidate repeating an earlier candidate's file, find and replace is refused with why `duplicate` — two ids on one sha would count one bug twice — cost if wrong: none.
    Task 4: fix round 1/5 implementer commit 05b3600 (10 items, re-review pending)
    Task 4: fix round 1/5 (10 addressed, 0 open; commits 6a73ce0..05b3600); implementer opus 286.8k cumulative / 9.4 min; re-review sonnet 119.6k / 1.5 min.
    Task 4: minor (deferred): stage text `junit undefined` when a grade exits 0 with no file; a later copy of a refused candidate reads `duplicate`; a not-ready end line removes a good end grade in kills (kills regrades it); fix.md tells a seeded fixer a check came from a project test.
    Ruling: fix round 2 for two implementer concerns: duplicate compares the commit too (different find, same effect would count one bug twice), and kills removes a ready all-error bug grade so --reuse cannot keep a machine failure — both bear on the count and on 8.4 — cost if wrong: one small round.
    Task 4: fix round 2/5 (3 addressed, 0 open; commits 05b3600..8f338db); implementer opus 295.7k cumulative / 4.6 min; re-review sonnet 85.5k / 0.6 min.
    Task 4: minor (deferred): rulings.md scratch copy keeps old wording (not a repo file); kills may remove an all-error end grade a lock hashed (none expected, the Task 8 compare shows it).
    Task 4: complete (commits 9613963..8f338db, review clean after 2 fix rounds)
    Task 5: operator sonnet 78.0k tok / 54 min; commit 77e65c5. s1-01, s2-01, s3-01 kept 3 of 5 (3 graded), p8a kept 1 of 2, refused 0, fixer 0, all valid; per bug grades show 1-2 checks fail and the rest pass (no crash-level bug); pgsnap equal; Docker clean.
    Ruling: the pilot's results stand and no brief or tool changes: nothing in the lines depends on a bug's content and every candidate passed — cost if wrong: none, the batch shows it.
    Task 5: complete (commit 77e65c5, no code)
    Task 6: operator sonnet; commit b88de09. 81 of 81 kept (external 72 of 120 candidates, real-estate 9 of 18), refused 0, weak 1 (p1), broken 0, error 0, no rerun; half-width 0.0998; external lane 8.83 h, real-estate 33.5 min; 13 prunes; pgsnap equal; Docker clean.
    Task 6: complete (commit b88de09, no code)
    Task 7: operator sonnet; commit f0404eb. external 24/72 killed by the fix oracle, real-estate 1/9 by fix, 2/5 by step, 6/9 by neither; no rerun; 6 h 23 min + 35 min; pgsnap equal; Docker clean.
    Ruling: the lock also reports, per external task, the kept bugs whose commit fails a `step.json` id in `<task>/grades/<bug7>.json`, by a counts-only script: an external step oracle is a subset of `oracle/`, so `kills` prints step=none though H1's checks were graded — no new run — cost if wrong: one more number.
    Task 7: complete (commit f0404eb, no code)
    Task 8: operator sonnet; commit 4947850; step 5 compare 1369 equal, step 6 compare 572 equal, 138 refs match, 417 tests pass. Finding: kills read `excluded` from the kept end grade, stale in 9 external tasks: fix oracle kills 28 of 72 by the validations, 24 recorded. The operator listed $D/seeded/ once (folder name only) and tried one read of an oracle manifest, denied, never ran.
    Ruling: my earlier ruling's cost line was wrong: validations did change after those end grades. killsOf reads `excluded` from the bug grade, which grade writes from the current validations; results at the end stay from the kept end grade (same oracleSha). kills reruns free on reused grades, and the lock's kills numbers and hashes are redone — cost if wrong: a small rerun.
    Ruling: drop `valid-spare` from ruling 12 in the plan and prereg 8.3 — it was removed from the tool at Task 4 — cost if wrong: none.
    Task 8: fix commits 09818c2 (killsOf), fb06a4f (docs, lock); operator sonnet 192.9k tok before the fix. External fix kills 28 of 72, neither 44; real-estate unchanged; external step sensitivity 11 of 60; 86 grades all reused; step 5 1369, step 6 572, step 7 1071 hashes equal; 418 tests pass.
    Task 6: usage: operator sonnet 112.2k tok / 531 min (mostly waiting on the lanes). Task 7: usage: operator sonnet 93.0k tok / 384 min.
    Task 8: usage: operator sonnet 241.2k tok cumulative / 21.7 min (lock and fix); review sonnet 127.6k tok / 4.1 min: spec ok, approved; the Important on usage is closed by this ledger copy.
    Task 8: minor (deferred): docs/log.md says 1070 hashes, lock says 1071; lock's 11 kills.json changes against 9 stale tasks not reconciled; Task 7 wall clock 22962 s vs 22975 s; the first assertion of the new killsOf test is not discriminating; `git status` claim in the lock is point-in-time.
    Task 8: complete (commits f0404eb..fb06a4f, review clean)

### SDD ledger tail of the seeded bugs plan (after the final review)

    Final review opus 309.7k tok / 21.7 min: ready with fixes; 0 Critical, 3 Important, 8 Minor, 3 deferred minors to fix now.
    Controller count for I3 (grades, counts only): non-pass seeded checks per graded bug commit: 56 at 1 of 5, 12 at 2 of 5, 4 at 3 of 5, 9 at 1 of 2, 1 at 0 of 2 (p1's weak). No all-fail run. The one with `precondition` beside its own fail is sb-s2-07-4 (commit 295e3ff), 2 precondition and 1 fail of 5, and it kills 7 of 7 fix checks.
    Ruling: sb-s2-07-4 stays kept: section 8.3 drops only on a failed validation, and it passed; its fix-oracle grade is rerun once without --reuse to tell a broad bug from a machine failure; the lock records it as broader than an edge — cost if wrong: one bug of 81 inflates catch rates a little, and step 14 can leave it out.
    Ruling: ruling 8's disk-full signature cannot be seen under --sealed, so it becomes "a task with `error` in its seed line, or not judged, is run once more"; gradeBugs removes a ready all-error grade so the rerun regrades — amends ruling 8 in plan and prereg — cost if wrong: a dropped bug's commit is graded twice.
    Ruling: runOracle passes `quiet: flags.sealed` as replay does, and /tmp/hstack-bench is cleaned now — a real-estate app log at a bug commit sits outside the sealed folders; a failed start then has no log — cost if wrong: a failed start needs a run without --sealed to see why, on a commit that holds no bug.
    Ruling (M3): per-bug and per-task edge and severity leave the lock and progress log, per-set counts stay — prereg section 12 says the designer sees only scores — cost if wrong: less detail; the earlier commit still holds them until the user merges with a squash.
    Ruling: finding M4 is met by renaming the two tests to say `unscored`; the path through real `grade` was tried by the final reviewer — cost if wrong: an untested path that a later product grade exercises.
    Final fix wave: commits 6ad2383, c304c85; 420 tests pass; sb-s2-07-4 rerun deterministic (all 7 live fix checks still fail), kills.json unchanged; compares 1369, 572, 1072 equal. Two more sealing slips by the fixer, both denied or names only, recorded in the lock.
    Final fix wave: fixer sonnet 197.0k tok / 18.6 min; re-review sonnet 112.1k tok / 2.4 min: 9 of 9 addressed, no Critical or Important.
    Final review: minor (deferred): under --sealed a real-estate failed start names a log that is deleted; the all-error removal rule is written twice (gradeBugs, kills).
