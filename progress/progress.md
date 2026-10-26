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
