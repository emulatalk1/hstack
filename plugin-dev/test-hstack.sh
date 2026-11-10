#!/bin/sh
# Tests of scripts/hstack.sh and its two hooks. Run: sh plugin-dev/test-hstack.sh
set -u
H="${HSTACK_SH:-$(cd "$(dirname "$0")/.." && pwd)/scripts/hstack.sh}"
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
export HSTACK_STATE="$T/state"
fails=0
ok() { if eval "$2"; then echo "ok   $1"; else echo "FAIL $1"; fails=$((fails + 1)); fi; }
stop() { printf '{"hook_event_name":"Stop","stop_hook_active":false}' | CLAUDE_PROJECT_DIR="$T/r" sh "$H" hook-stop; }
start() { printf '{"session_id":"x","source":"%s"}' "$1" | CLAUDE_PROJECT_DIR="$T/r" sh "$H" hook-start >/dev/null; }

mkdir -p "$T/r/tests" "$T/r/src" && cd "$T/r" && git init -q && git config user.email t@t && git config user.name t
echo 'assert a' > tests/old_test.txt; echo 'x = 1' > src/a.txt; git add -A; git commit -qm base
S=$(sh "$H" dir)

# no repo
ok 'stop allows outside a git repo' '[ -z "$(printf {} | CLAUDE_PROJECT_DIR=/ sh "$H" hook-stop)" ]'

# hook-start prints the nudge and sets the reference only on startup
ok 'start prints the nudge' 'printf "{\"source\":\"startup\"}" | CLAUDE_PROJECT_DIR="$T/r" sh "$H" hook-start | grep -q "hstack:build"'
ok 'stop allows when nothing changed and no run' '[ -z "$(stop)" ]'
echo 'x = 2' > src/a.txt
start resume
ok 'resume keeps the reference, so a change still blocks' 'stop | grep -q "without the hstack:build workflow"'
ok 'block reason restates the ending' 'stop | grep -q "end with exactly the reply the task asked for"'
ok 'block output is JSON with decision block' 'stop | grep -q "^{\"decision\":\"block\",\"reason\":\"hstack: "'
# 2 blocks used above... count is per process: reset by start
start resume; stop >/dev/null; stop >/dev/null; stop >/dev/null
ok 'stop allows after 3 blocks in one process' '[ -z "$(stop)" ]'
start compact
ok 'a compaction does not give the blocks back' '[ -z "$(stop)" ]'
start resume
ok 'a new process gets its blocks back' 'stop | grep -q block'
git checkout -q -- src/a.txt

# a run
start startup
sh "$H" start >/dev/null
ok 'start records the base' '[ "$(cat "$S/base")" = "$(git rev-parse HEAD)" ]'
ok 'missing lists every phase at first' '[ "$(sh "$H" missing)" = "setup oracle build gate review explore mutate final" ]'
ok 'stop blocks a started run and names the missing steps' 'stop | grep -q "steps not recorded: setup oracle"'
sh "$H" phase setup; sh "$H" phase oracle; sh "$H" phase explore skipped: no way to run it
ok 'a skipped phase counts' '[ "$(sh "$H" missing)" = "build gate review mutate final" ]'
ok 'phase refuses a bad line' '! sh "$H" phase "explore skipped:" 2>/dev/null && ! sh "$H" phase "Build" 2>/dev/null'
ok 'a bare word skipped does not count' 'sh "$H" phase "mutatex" && sh "$H" missing | grep -q mutate'

# lock and gate
echo 'assert new' > tests/new_test.txt
sh "$H" lock tests/new_test.txt >/dev/null
ok 'gate passes with the oracle unchanged' 'sh "$H" gate >/dev/null'
echo 'assert weaker' > tests/new_test.txt
ok 'gate fails on a changed oracle file' '! sh "$H" gate >/dev/null && sh "$H" gate | grep -q "ORACLE CHANGED: tests/new_test.txt"'
echo 'assert new' > tests/new_test.txt
echo ':(glob)tests/**' > "$S/test-paths"
printf 'assert a\nassert b\n' > tests/old_test.txt
ok 'added lines in a pre-existing test pass silently' '[ -z "$(sh "$H" gate | grep -E "REMOVED|PRE-EXISTING")" ]'
echo 'assert b' > tests/old_test.txt
ok 'a removed line is reported' 'sh "$H" gate | grep -q "REMOVED tests/old_test.txt: assert a"'
ok 'removed lines alone do not fail the gate' 'sh "$H" gate >/dev/null'
git checkout -q -- tests/old_test.txt; git rm -q tests/old_test.txt
ok 'a deleted pre-existing test is reported' 'sh "$H" gate | grep -q "PRE-EXISTING TEST D"'
git checkout -q HEAD -- tests/old_test.txt
rm tests/new_test.txt
ok 'gate fails on a missing oracle file' 'sh "$H" gate | grep -q "ORACLE MISSING"'
echo 'assert new' > tests/new_test.txt

# done
ok 'done refuses while steps are missing' '! sh "$H" done 2>/dev/null'
for p in build gate review mutate final; do sh "$H" phase $p; done
ok 'done refuses an uncommitted change' '! sh "$H" done 2>/dev/null'
git add -A; git commit -qm feature
ok 'done records HEAD' 'sh "$H" done >/dev/null && [ "$(cat "$S/done")" = "$(git rev-parse HEAD)" ]'
start resume
ok 'stop allows after done on a clean tree' '[ -z "$(stop)" ]'
echo 'x = 3' > src/a.txt
ok 'stop blocks a change after done' 'stop | grep -q "changed after the last final check"'
git checkout -q -- src/a.txt
ok 'elapsed prints minutes' '[ "$(sh "$H" elapsed)" = 0 ]'

# a second run keeps the first
sh "$H" start >/dev/null
ok 'start moves the earlier run to old/' '[ -f "$S/old/"*/base ] && [ ! -f "$S/done" ] && [ -f "$S/session-head" ]'
ok 'state is never in the work tree or .git' '[ -z "$(git status --porcelain)" ] && [ ! -e .git/hstack ] && case $S in "$T/state/"*) true;; *) false;; esac'

echo "$fails failure(s)"
[ $fails -eq 0 ]
