#!/bin/sh
# Tests of scripts/hstack.sh and its two hooks. Run: sh plugin-dev/test-hstack.sh
set -u
H="${HSTACK_SH:-$(cd "$(dirname "$0")/.." && pwd)/scripts/hstack.sh}"
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
export HSTACK_STATE="$T/state"
unset CLAUDE_PROJECT_DIR # a caller's value would send the hooks and the pass to another repository
# No test may reach GitHub, even if PATH slips past the fake gh below: a dead proxy and junk tokens.
export HTTPS_PROXY=http://127.0.0.1:9 https_proxy=http://127.0.0.1:9 GH_TOKEN=junk GITHUB_TOKEN=junk GH_CONFIG_DIR="$T/ghconfig"
fails=0
ok() { if eval "$2"; then echo "ok   $1"; else echo "FAIL $1"; fails=$((fails + 1)); fi; }
stop() { printf '{"hook_event_name":"Stop","stop_hook_active":false}' | CLAUDE_PROJECT_DIR="$T/r" sh "$H" hook-stop; }
start() { printf '{"session_id":"x","source":"%s"}' "$1" | CLAUDE_PROJECT_DIR="$T/r" sh "$H" hook-start >/dev/null; }

mkdir -p "$T/r/tests" "$T/r/src" && cd "$T/r" && git init -q && git config user.email t@t && git config user.name t || exit 1
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
ok 'a capped stop with no run records no feedback' '[ ! -d "$S/feedback" ]'
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

# feedback: entries in the state dir, a description the user approves, fields from an allow-list, a fake gh that logs its arguments
mkdir -p "$T/bin"
cat > "$T/bin/gh" <<'EOF'
#!/bin/sh
D=$(dirname "$0")
{ printf 'gh'; for a in "$@"; do printf ' [%s]' "$a"; done; echo; } >> "$D/log"
case "$1 $2" in
  'auth status') ! grep -q logged-out "$D/mode" ;;
  'label list') ! grep -q label-fail "$D/mode" && cat "$D/labels" ;;
  'label create') echo feedback >> "$D/labels" ;;
  'issue create') echo 'https://github.com/x/y/issues/7' ;;
  'issue list') cat "$D/issues" ;;
esac
EOF
chmod +x "$T/bin/gh"
PATH="$T/bin:$PATH"; export PATH
[ "$(command -v gh)" = "$T/bin/gh" ] || { echo "FAIL the fake gh is not first on PATH: feedback tests not run"; exit 1; }
echo feedback > "$T/bin/labels"; : > "$T/bin/mode"; : > "$T/bin/log"
log() { cat "$T/bin/log"; }
FB="$S/feedback"
entries() { ls "$FB" 2>/dev/null | grep -Ev '^posted$|\.md$'; }
F() { sh "$H" feedback "$@"; }
head_of() { sed -n '/^$/q;p' "$1"; }
text() { printf '%s\n' "$@"; } # a description: the summary, an empty line, the rest
# gives every entry without a text one, then posts every entry through the fake gh, so the next test starts with none
# (tests delete nothing)
flush() {
  for i in $(F draft </dev/null | sed -n 's/^undescribed \(.*\): .*/\1/p'); do text 'a test summary' '' 'a test text' | F describe "$i" >/dev/null; done
  F draft </dev/null | sed -n 's/^entry //p;s/^confirm: //p' | while read -r i && read -r c; do F post "$i" "$c" </dev/null >/dev/null; done
}
before=$(git status --porcelain --ignored)

# capture inside the loop (the run above already skipped explore)
ok 'the first run recorded its skipped step' '[ "$(entries | wc -l | tr -d " ")" = 1 ]'
ok 'a recorded stumble has no description: it is listed, not drafted' 'F draft | grep -q "^undescribed .*: setup-failure at explore\$" && ! F draft | grep -q "^entry "'
flush
out=$(sh "$H" phase setup 2>&1); rc=$?
ok 'a plain phase exits 0, prints nothing and records nothing' '[ $rc -eq 0 ] && [ -z "$out" ] && [ -z "$(entries)" ]'
[ "$(id -u)" = 0 ] || { chmod a-w "$S/phases"; ok 'phase still fails when its line cannot be written' '! sh "$H" phase gate 2>/dev/null'; chmod u+w "$S/phases"; }
sh "$H" phase mutatex skipped: time
ok 'a name outside PHASES records nothing' '[ -z "$(entries)" ]'
sh "$H" lock tests/new_test.txt >/dev/null; sh "$H" lock tests/new_test.txt >/dev/null
out=$(sh "$H" phase explore skipped: /Users/acme/secret-app cannot run 2>&1); rc=$?
ok 'a skipped phase still exits 0 and prints nothing' '[ $rc -eq 0 ] && [ -z "$out" ]'
e1=$(entries); id="${S##*/}/$e1"
ok 'a skipped step records a setup-failure, the why in the detail only' 'head_of "$FB/$e1" | grep -qx "kind=setup-failure" && head_of "$FB/$e1" | grep -qx "phase=explore" && grep -q "secret-app" "$FB/$e1" && ! head_of "$FB/$e1" | grep -q secret'
ok 'the counts come from the state files' 'head_of "$FB/$e1" | grep -qx "oracle_files=1" && head_of "$FB/$e1" | grep -qx "dispute_rounds=1" && head_of "$FB/$e1" | grep -qx "skipped_phases=2" && head_of "$FB/$e1" | grep -qx "elapsed=0"'
: > "$T/bin/log"
ok 'post refuses an entry without a description' 'F post "$id" 0 2>&1 | grep -q "no description" && ! log | grep -q create'
text 'explore is skipped when the product is a CLI' '' 'The explorer found no way to run the product, so the step was skipped.' '' 'Expected: it runs the CLI the capabilities list.' | F describe "$id" >/dev/null
ok 'describe writes the text beside the entry' '[ -f "$FB/$e1.md" ]'
ok 'the draft is the description, a rule, then the fields' 'F draft | grep -qx "title: \[feedback\] explore setup-failure: explore is skipped when the product is a CLI" && F draft | grep -qx "| The explorer found no way to run the product, so the step was skipped." && F draft | grep -qx "| ---" && F draft | grep -qx "| phase: explore" && ! F draft | grep -q "^| explore is skipped"'
ok 'the detail never reaches a draft' '! F draft | grep -Eq "acme|secret|cannot run|Users"'
ok 'draft names the local file and works outside a repository' '(cd "$T" && sh "$H" feedback draft | grep -qx "local: $FB/$e1")'
code=$(F draft | sed -n 's/^confirm: //p')

# nothing is posted without gh, a login, the label, or the code the user saw
mkdir "$T/nogh"; for f in /usr/bin/* /bin/*; do [ "${f##*/}" = gh ] || ln -s "$f" "$T/nogh/" 2>/dev/null; done
[ -e "$T/nogh/git" ] || ln -s "$(command -v git)" "$T/nogh/git"
ok 'the no-gh PATH holds no gh' '! PATH="$T/nogh" command -v gh >/dev/null 2>&1'
ok 'no gh keeps the file and prints its path' 'PATH="$T/nogh" sh "$H" feedback post "$id" "$code" | grep -q "kept: $FB/$e1" && [ -f "$FB/$e1" ] && ! log | grep -q create'
echo logged-out > "$T/bin/mode"
ok 'a logged-out gh keeps the file and prints its path' 'F post "$id" "$code" | grep -q "kept: $FB/$e1" && [ -f "$FB/$e1" ] && ! log | grep -q create'
: > "$T/bin/mode"
ok 'a wrong confirm code posts nothing' '! F post "$id" 123 >/dev/null 2>&1 && ! log | grep -q create'
ok 'an id that is not an entry id is refused' 'F post "../$e1" "$code" 2>&1 | grep -q "usage:" && F post "$id/../x" "$code" 2>&1 | grep -q "usage:" && F post "1/2" "$code" 2>&1 | grep -q "not an entry id"'
mkdir -p "$T/state/acme corp/feedback"; printf 'version=0.3.0\nkind=cost\nphase=build\n\n' > "$T/state/acme corp/feedback/20000101-000000-2"
printf 'version=0.3.0\nkind=cost\nphase=build\n\n' > "$FB/acme-name"
ok 'a file whose name is not an entry id is no entry, and its name is never printed' '! F draft | grep -q acme'
mv "$FB/acme-name" "$T/acme-name"
mkdir "$T/badgrep"; printf '#!/bin/sh\ncase $1 in -Ev*) exit 2 ;; esac\nexec %s "$@"\n' "$(command -v grep)" > "$T/badgrep/grep"; chmod +x "$T/badgrep/grep"
ok 'a grep that fails refuses the draft' 'PATH="$T/badgrep:$PATH" sh "$H" feedback draft | grep -q "^refused: $FB/$e1: " && ! PATH="$T/badgrep:$PATH" sh "$H" feedback draft | grep -q "^entry "'
stop >/dev/null # consumes the pass the drafts above wrote
ok 'a verb that does not exist writes no pass' '[ ! -f "$S/pass" ] && ! F bogus 2>/dev/null && [ ! -f "$S/pass" ]'
echo bug > "$T/bin/labels"
ok 'a missing label posts nothing and creates none' '! F post "$id" "$code" >/dev/null && F post "$id" "$code" | grep -q "feedback label" && [ -f "$FB/$e1" ] && ! log | grep -q create'
echo label-fail > "$T/bin/mode"
ok 'a failed label list posts nothing' '! F post "$id" "$code" >/dev/null && [ -f "$FB/$e1" ] && ! log | grep -q create'
: > "$T/bin/mode"
F label >/dev/null
ok 'only feedback label creates the label' 'log | grep -q "^gh \[label\] \[create\] \[feedback\] \[--repo\] \[emulatalk1/hstack\]"'

# the post
: > "$T/bin/log"
shown=$(F draft | sed -n 's/^| //p')
out=$(F post "$id" "$code")
ok 'post creates the issue with the repo, the label and the shown title' 'log | grep -q "^gh \[issue\] \[create\] \[--repo\] \[emulatalk1/hstack\] \[--label\] \[feedback\] \[--title\] \[\[feedback\] explore setup-failure: explore is skipped when the product is a CLI\] \[--body\] \[The explorer found"'
ok 'the posted body is the shown body' '[ -n "$shown" ] && [ "$(log | sed -n "/issue\] \[create\]/,\$p" | sed -e "1s/.*\[--body\] \[//" -e "\$s/\]\$//")" = "$shown" ]'
ok 'the posted text holds nothing of the detail' '! log | grep -Eq "acme|secret|cannot run|Users"'
ok 'the posted entry and its text move to posted/ with the URL' '[ -f "$FB/posted/$e1" ] && [ -f "$FB/posted/$e1.md" ] && grep -qx "posted: https://github.com/x/y/issues/7" "$FB/posted/$e1" && echo "$out" | grep -q "issues/7" && [ -z "$(entries)" ]'
ok 'every gh call names the repo' '! log | grep "^gh " | grep -v "^gh \[auth\]" | grep -vq "\[--repo\] \[emulatalk1/hstack\]"'

# a report the user makes: add reads the description from stdin
text 'the oracle locks a file twice' '' 'What happened: $H lock ran twice for one file and `gate` printed it twice.' 'Expected: once.' | F add bug oracle > "$T/add.out"
e2=$(entries)
ok 'add records the entry with its text and prints the path' 'grep -q "recorded: $FB/$e2" "$T/add.out" && head_of "$FB/$e2" | grep -qx "kind=bug" && head_of "$FB/$e2" | grep -qx "phase=oracle" && [ -f "$FB/$e2.md" ]'
ok 'the text is kept as written, dollar signs and backticks too' 'F draft | grep -qxF "| What happened: \$H lock ran twice for one file and \`gate\` printed it twice."'
ok 'add refuses a kind or a phase outside the lists' '! F add bugx review </dev/null >/dev/null 2>&1 && ! F add cost nowhere </dev/null >/dev/null 2>&1 && ! F add "escaped-bug cost" review </dev/null >/dev/null 2>&1 && [ "$(entries)" = "$e2" ]'

# another repo by the setting; the yes covers it
: > "$T/bin/log"
ok 'the yes covers the repository: a code shown for one repo does not post to another' '! HSTACK_FEEDBACK_REPO=me/fork sh "$H" feedback post "$(F draft | sed -n "s/^entry //p")" "$(F draft | sed -n "s/^confirm: //p")" >/dev/null 2>&1 && ! log | grep -q create'
ok 'draft names the repository it would post to' 'HSTACK_FEEDBACK_REPO=me/fork sh "$H" feedback draft | grep -qx "to: me/fork" && F draft | grep -qx "to: emulatalk1/hstack"'
HSTACK_FEEDBACK_REPO=me/fork sh "$H" feedback post "$(F draft | sed -n 's/^entry //p')" "$(HSTACK_FEEDBACK_REPO=me/fork sh "$H" feedback draft | sed -n 's/^confirm: //p')" >/dev/null
ok 'HSTACK_FEEDBACK_REPO changes the repo on every call' 'log | grep -q "\[issue\] \[create\] \[--repo\] \[me/fork\]" && ! log | grep "^gh " | grep -v "^gh \[auth\]" | grep -vq "\[--repo\] \[me/fork\]"'
: > "$T/bin/log"
ok 'a repo that is not owner/name is refused before any gh call' 'HSTACK_FEEDBACK_REPO="a b" sh "$H" feedback collect 2>&1 | grep -q "must be owner/name" && HSTACK_FEEDBACK_REPO="a/b/c" sh "$H" feedback collect 2>&1 | grep -q "must be owner/name" && [ ! -s "$T/bin/log" ]'

# a time skip is a cost
sh "$H" phase mutate skipped: time, 185 min
e=$(entries)
ok 'a time skip records a cost' 'head_of "$FB/$e" | grep -qx "kind=cost" && head_of "$FB/$e" | grep -qx "phase=mutate"'
flush
sh "$H" phase explore skipped: nothing runs it, like mutate skipped: time
e=$(entries)
ok 'time inside another why is not a cost' 'head_of "$FB/$e" | grep -qx "kind=setup-failure" && head_of "$FB/$e" | grep -qx "phase=explore"'
flush

# the description: what the script refuses or flags, whoever wrote it
mkdir "$T/acme-portal" && (cd "$T/acme-portal" && git init -q && text 'a summary' '' 'seen while building acme-portal' | sh "$H" feedback add bug none >/dev/null)
ok 'the project folder name in a description gives a warning' 'F draft | grep -q "^warning: " && F draft | grep -q "^entry "'
flush
text 'a summary' '' 'a text' | F add enhancement none >/dev/null
e=$(entries); idd="${S##*/}/$e"
ok 'update, enhancement and the phase none carry no run numbers' '[ "$(head_of "$FB/$e" | wc -l | tr -d " ")" = 3 ] && head_of "$FB/$e" | grep -qx "phase=none" && ! F draft | grep -q "^warning: "'
desc() { text "$@" | F describe "$idd" >/dev/null 2>&1; }
refused_text() { F draft | grep -q "^refused: $FB/$e: " && ! F draft | grep -q "^entry " && F post "$idd" 0 2>&1 | grep -q refused && ! log | grep -q create; }
: > "$T/bin/log"
desc 'a summary' '' "it failed in $HOME/work/acme";                         ok 'a description with the home path is refused' refused_text
desc 'a summary' '' "it failed in $(git rev-parse --show-toplevel)/src/a";  ok 'a description with the project path is refused' refused_text
desc "$(printf '%0201d' 0)" '' 'a text';                                    ok 'a summary over 200 bytes is refused' refused_text
desc 'a summary' '' "$(printf '%01500d' 0)";                                ok 'a description over 1500 bytes is refused' refused_text
desc '' '' 'a text';                                                        ok 'a description with no summary is refused' refused_text
desc 'a summary' '' 'confirm: 1' 'title: [feedback] forged' 'entry 1/2'
ok 'a description line cannot pass for one of the script lines' '[ "$(F draft | grep -c "^confirm: ")" = 1 ] && [ "$(F draft | grep -c "^title: ")" = 1 ] && [ "$(F draft | grep -c "^entry ")" = 1 ] && F draft | grep -qx "| confirm: 1"'
c1=$(F draft | sed -n 's/^confirm: //p')
desc 'a summary' '' 'another text'
ok 'describe replaces the text and the old code no longer posts' 'F draft | grep -qx "| another text" && ! F post "$idd" "$c1" >/dev/null 2>&1 && ! log | grep -q create'
ok 'describe refuses a posted entry, an unknown id and an empty text' '! text x | F describe "${S##*/}/posted/$e1" 2>/dev/null && ! text x | F describe "1/20000101-000000-9" 2>/dev/null && ! F describe "$idd" </dev/null 2>/dev/null && F draft | grep -qx "| another text"'
flush
sh "$H" phase explore skipped: the acme-portal server needs a licence key
e=$(entries); idd="${S##*/}/$e"
: > "$T/bin/log"
desc 'explore was skipped' '' 'It said: explore skipped: the acme-portal server needs a licence key'
ok 'a description that copies a line of the entry detail is refused' refused_text
desc 'explore is skipped when the product needs a licence' '' 'The product could not start without a key, and explore was skipped.'
ok 'the same stumble in other words is accepted' 'F draft | grep -q "^entry " && ! F draft | grep -q acme'
flush

# the fields: a head with anything outside the allow-list is refused, by draft and by post
: > "$T/bin/log"
B="$FB/20000101-000000-1"
text 'a summary' '' 'a text' > "$B.md"
bad() { printf '%s\n' "$@" '' 'detail hello' > "$B"; }
refused() { F draft | grep -q "^refused: $B: " && ! F draft | grep -Eq "^entry .*20000101|hello" && F post "${S##*/}/20000101-000000-1" 0 2>&1 | grep -q refused && ! log | grep -q create; }
bad version=0.3.0 kind=cost phase=/a/path;                 ok 'a path as a value is refused' refused
bad version=0.3.0 kind=cost phase=build note=hello;        ok 'a field outside the list is refused' refused
bad version=0.3.0 kind=cost phase=build elapsed=12x;       ok 'a count that is not a number is refused' refused
bad version=0.3.0 kind=cost kind=cost phase=build;         ok 'a field given twice is refused' refused
bad kind=cost phase=build;                                 ok 'a missing version is refused' refused
bad version=0.3.0 kind=fix phase=build;                    ok 'a kind outside the list is refused' refused
bad version=0.3.0 kind=cost 'phase=build and more';        ok 'text after a phase name is refused' refused
printf 'version=0.3.0\nkind=cost\nphase=build\nnote=caf\351 hello\n\ndetail hello\n' > "$B"
                                                           ok 'a line with an invalid byte is refused, not dropped' refused
: > "$B";                                                  ok 'an empty entry is refused' refused
bad version=0.3.0 kind=cost phase=build elapsed=12
ok 'the same entry with only listed fields is accepted' 'F draft | grep -q "^entry .*/20000101-000000-1\$" && F draft | grep -qx "title: \[feedback\] build cost: a summary" && F draft | grep -qx "| elapsed minutes: 12"'
flush

# unavailable capabilities at setup
printf 'suite | x | probe: pass | canary: pass |\nui | unavailable: no headless driver in /opt/acme\n' > "$S/capabilities.md"
sh "$H" phase setup
e=$(entries)
ok 'an unavailable capability records a setup-failure at setup' 'head_of "$FB/$e" | grep -qx "unavailable_capabilities=1" && head_of "$FB/$e" | grep -qx "phase=setup" && grep -q "/opt/acme" "$FB/$e" && ! F draft | grep -q acme'
flush

# the capped stop on a started run
start resume; stop >/dev/null; stop >/dev/null; stop >/dev/null
out=$(stop)
e=$(entries)
ok 'the capped stop prints nothing and records one intervention' '[ -z "$out" ] && [ "$(echo "$e" | wc -l | tr -d " ")" = 1 ] && head_of "$FB/$e" | grep -qx "kind=intervention" && head_of "$FB/$e" | grep -qx "phase=oracle" && head_of "$FB/$e" | grep -qx "stop_blocks=3"'
out=$(stop)
ok 'a second capped stop prints nothing and records none' '[ -z "$out" ] && [ "$(entries)" = "$e" ]'
start compact
ok 'a compaction still does not give the blocks back' '[ -z "$(stop)" ] && [ "$(entries)" = "$e" ]'
# a broken state file (a full disk leaves an empty one) must not break the hook or the loop
: > "$S/started"
start resume; stop >/dev/null; stop >/dev/null; stop >/dev/null
out=$(stop); rc=$?
ok 'the capped stop survives an empty started' '[ $rc -eq 0 ] && [ -z "$out" ] && [ "$(cat "$S/stop-blocks")" = 4 ]'
out=$(sh "$H" phase review skipped: nothing to review 2>&1); rc=$?
ok 'so does a skipped phase' '[ $rc -eq 0 ] && [ -z "$out" ] && sh "$H" missing | grep -vq review'

# the pass: a turn the user spends on feedback ends once
start resume
flush
ok 'a feedback verb lets the turn end once, with no block counted' '[ -z "$(stop)" ] && [ "$(cat "$S/stop-blocks")" = 0 ] && [ -z "$(entries)" ]'
ok 'the next stop blocks again' 'stop | grep -q block'
F draft >/dev/null; start resume
ok 'a new process drops a stale pass' '[ ! -f "$S/pass" ]'
(cd "$T" && CLAUDE_PROJECT_DIR="$T/r" sh "$H" feedback draft >/dev/null)
ok 'the pass goes to the session repository, wherever the verb ran' '[ -f "$S/pass" ]'

# run numbers on what the user flags
echo $(( $(date +%s) - 200000 )) > "$S/started"
F add intervention build </dev/null >/dev/null
e=$(entries)
ok 'add without a text leaves the entry undescribed' 'F draft | grep -q "^undescribed .*/$e: intervention at build\$"'
ok 'an elapsed over a day is left out, the counts stay' '! head_of "$FB/$e" | grep -q "^elapsed=" && head_of "$FB/$e" | grep -q "^oracle_files="'
flush
F add escaped-bug review </dev/null >/dev/null
e3=$(entries)
ok 'a flagged escaped-bug on an unfinished run has no elapsed and no counts' '[ "$(head_of "$FB/$e3" | wc -l | tr -d " ")" = 3 ]'

# entries survive start; a finished run gives an escaped bug its numbers
sh "$H" start >/dev/null
ok 'entries survive start' '[ -f "$FB/$e3" ] && [ -f "$FB/posted/$e1" ] && [ -f "$FB/posted/$e1.md" ] && [ -z "$(ls -d "$S"/old/*/feedback 2>/dev/null)" ]'
flush
for p in setup oracle build gate review explore mutate final; do sh "$H" phase $p; done
sh "$H" done >/dev/null
echo $(( $(cat "$S/ended") - 600 )) > "$S/started"
ok 'add prints the path of the entry' 'F add escaped-bug review </dev/null | grep -q "recorded: $FB/"'
e=$(entries)
ok 'with done, elapsed is ended minus started and the counts are there' 'head_of "$FB/$e" | grep -qx "elapsed=10" && head_of "$FB/$e" | grep -qx "oracle_files=0" && head_of "$FB/$e" | grep -qx "skipped_phases=0"'
ok 'a pass written on a finished run is consumed by that stop' '[ -f "$S/pass" ] && [ -z "$(stop)" ] && [ ! -f "$S/pass" ]'

# collect
printf '12\t[feedback] explore bug: explorer never starts the server\n9\t[feedback] none enhancement: a dry-run flag\n15\t[feedback] explore bug: explorer ignores the CLI\n3\tsomething else\n' > "$T/bin/issues"
: > "$T/bin/log"
ok 'collect groups the open issues by phase and kind and lists each one' '[ "$(F collect)" = "$(printf "explore bug: 2\n  #12 explorer never starts the server\n  #15 explorer ignores the CLI\nnone enhancement: 1\n  #9 a dry-run flag\nother: 1\n  #3 something else")" ]'
ok 'collect asks for the open issues with the label, on the repo' 'log | grep -q "^gh \[issue\] \[list\] \[--repo\] \[emulatalk1/hstack\] \[--label\] \[feedback\] \[--state\] \[open\]"'

ok 'feedback wrote nothing inside the project repository' '[ "$(git status --porcelain --ignored)" = "$before" ] && [ ! -e .git/hstack ] && case $FB in "$T/state/"*) true;; *) false;; esac'

echo "$fails failure(s)"
[ $fails -eq 0 ]
