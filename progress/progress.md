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
