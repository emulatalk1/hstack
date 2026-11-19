#!/bin/sh
# hstack run state and the two hooks. POSIX sh + git only: the project's box may have no other runtime.
# State lives outside the work tree and outside .git (Claude Code guards writes into .git), in
# ${HSTACK_STATE:-$HOME/.hstack} (or /tmp/.hstack without HOME)/<checksum of the git dir>, so it is never committed and never part of the product.
# Feedback: each stumble of a run is recorded in S/feedback/, and the user reports what they find with `feedback add`.
# Only `feedback post`, which the user invokes, sends anything out: a description the user has read in full, and fixed
# fields; never an entry's detail. gh is needed by post, label and collect only.
# usage: hstack.sh dir|start|phase <name> [skipped: <why>]|missing|lock <file>...|gate|elapsed|done|hook-start|hook-stop
#        hstack.sh feedback add <kind> <phase|none> <description on stdin|describe <id> <description on stdin
#        hstack.sh feedback draft|post <id> <code>|dismiss <id>|label|collect

PHASES='setup oracle build gate review explore mutate final'
# the first four are what a run does (escaped-bug: a bug in the product that the loop let through); the last three are
# about hstack itself, as its user reports them
KINDS='setup-failure intervention escaped-bug cost bug update enhancement'
MAX_BLOCKS=3
ROOT="${HSTACK_STATE:-${HOME:-/tmp}/.hstack}"

state() {
  G=$(git rev-parse --absolute-git-dir 2>/dev/null) || return 1
  S="$ROOT/$(printf '%s' "$G" | cksum | cut -d' ' -f1)"
  mkdir -p "$S" && printf '%s\n' "$G" > "$S/repo" || return 1
  # the work tree's folder: a description must not name its path. Kept as it was when there is no work tree here.
  top=$(git rev-parse --show-toplevel 2>/dev/null) && printf '%s\n' "$top" > "$S/top"
  :
}

in_list() { case $1 in ''|*[!a-z-]*) return 1 ;; esac; case " $2 " in *" $1 "*) ;; *) return 1 ;; esac; }
count() { n=$(grep -c "$1" "$2" 2>/dev/null); echo "${n:-0}"; }

# A feedback entry: the fields a posted draft may hold, an empty line, then detail that never leaves this machine.
# The fields are a snapshot, because start moves the state they come from. Silent: its callers are phase and the stop hook.
record() { # <kind> <phase> <detail> [any word: no elapsed, no counts]
  E="$S/feedback/$(date +%Y%m%d-%H%M%S)-$$"
  mkdir -p "$S/feedback" 2>/dev/null || return 0
  ( # a subshell: a broken state file ends the snapshot, never the phase or the hook that called
    echo "version=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$(dirname "$0")/../.claude-plugin/plugin.json")"
    echo "kind=$1"; echo "phase=$2"
    if [ -f "$S/started" ] && [ -z "$4" ]; then
      e=$(( ($(cat "$S/ended" 2>/dev/null || date +%s) - $(cat "$S/started")) / 60 ))
      [ "$e" -le 1440 ] && echo "elapsed=$e" # past a day it is the age of a stalled run, not a run's time
      b=$(cat "$S/stop-blocks" 2>/dev/null || echo 0); [ "$b" -gt "$MAX_BLOCKS" ] && b=$MAX_BLOCKS
      l=$(count '' "$S/locks"); [ "$l" -gt 0 ] && l=$((l - 1)) # the loop locks once, then once per dispute round
      echo "oracle_files=$(count '' "$S/oracle.lock")"
      echo "stop_blocks=$b"
      echo "dispute_rounds=$l"
      echo "skipped_phases=$(count ' skipped: ' "$S/phases")"
      echo "review_rounds=$(ls "$S"/review-*.md 2>/dev/null | grep -c '')"
      echo "unavailable_capabilities=$(count 'unavailable:' "$S/capabilities.md")"
    fi
    echo; printf '%s\n' "$3"
  ) > "$E" 2>/dev/null
  :
}

# The only gate between an entry and GitHub. A draft has two parts, both checked here:
# - the fields: the entry's head under fixed labels. Every line must be an allowed label with a value of the allowed
#   shape, so a path, a name or any other text in the head refuses the whole entry.
# - the description: the text beside the entry (<entry>.md), which the user reads in full before the yes. That reading
#   is the guard; the script only nets the commonest leaks: a path of this machine, a line or a reason copied from an
#   entry's detail, a character that would show the user something else than is posted, a text too long for a question.
draft() { # <entry file>: 0 with title and body set; 1 refused, why says it; 2 no description yet, kind and phase set
  why='a field outside the allowed ones'
  fields=$(sed -n '/^$/q;p' "$1" | sed -e 's/^version=/plugin version: /' -e 's/^kind=/kind: /' -e 's/^phase=/phase: /' \
    -e 's/^elapsed=/elapsed minutes: /' -e 's/^oracle_files=/locked oracle files: /' -e 's/^stop_blocks=/stop-hook blocks: /' \
    -e 's/^dispute_rounds=/dispute rounds: /' -e 's/^skipped_phases=/skipped phases: /' -e 's/^review_rounds=/review rounds: /' \
    -e 's/^unavailable_capabilities=/unavailable capabilities: /')
  allowed="^(plugin version: [0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}|phase: ($(echo $PHASES | tr ' ' '|')|none)|kind: ($(echo $KINDS | tr ' ' '|'))|(elapsed minutes|locked oracle files|stop-hook blocks|dispute rounds|skipped phases|review rounds|unavailable capabilities): [0-9]{1,5})\$"
  [ -n "$fields" ] || return 1
  [ "$(printf '%s\n' "$fields" | grep -Evc "$allowed")" = 0 ] || return 1 # a count, so a grep that fails refuses too
  [ -z "$(printf '%s\n' "$fields" | cut -d: -f1 | sort | uniq -d)" ] || return 1
  for k in 'plugin version' phase kind; do printf '%s\n' "$fields" | grep -q "^$k: " || return 1; done
  field() { printf '%s\n' "$fields" | sed -n "s/^$1: //p"; }
  kind=$(field kind) phase=$(field phase)

  why='the description is not a plain file'
  [ ! -L "$1.md" ] || return 1
  [ -f "$1.md" ] || return 2
  text=$(cat "$1.md")
  summary=$(printf '%s\n' "$text" | sed -n 1p)
  rest=$(printf '%s\n' "$text" | sed 1d | sed '/./,$!d')
  why='the description needs a first line, its summary, of at most 200 bytes'
  case $summary in *[![:space:]]*) ;; *) return 1 ;; esac
  [ "${#summary}" -le 200 ] || return 1
  why='the description is over 1500 bytes'
  [ "${#text}" -le 1500 ] || return 1
  # a CR or an escape would show the user another text than the one that is posted
  why='the description holds a control character'
  [ "$(printf '%s' "$text" | tr -d '\n\t' | tr -cd '[:cntrl:]' | wc -c | tr -d ' ')" = 0 ] || return 1
  # the entry's project, and the project of the session that runs this
  why='the description holds a path of this machine'
  dir=${1%/feedback/*}
  gitdir=$(cat "$dir/repo" 2>/dev/null)
  top=$(cat "$dir/top" 2>/dev/null)
  main=${gitdir%/.git*}
  for p in "$HOME" "$main" "$top" "${G%/.git*}" "${S:+$(cat "$S/top" 2>/dev/null)}"; do
    [ "${#p}" -gt 1 ] || continue
    case $text in *"$p"*) return 1 ;; esac
  done
  # every entry of this project, posted and dismissed ones too, so a stumble's reason cannot come back in through a new report:
  # a whole detail line, or what follows "skipped: " or "unavailable: " in it, when over 24 bytes
  why="the description copies from an entry's local detail"
  for d in "$dir"/feedback/* "$dir"/feedback/posted/* "$dir"/feedback/dismissed/*; do
    case ${d##*/} in *[!0-9-]*) continue ;; esac
    [ -f "$d" ] && sed '1,/^$/d' "$d"
  done | ( while IFS= read -r l; do
      for l in "$l" "${l#* skipped: }" "${l#*unavailable: }"; do
        case $l in 'posted: '*) continue ;; esac
        [ "${#l}" -gt 24 ] && case $text in *"$l"*) exit 1 ;; esac
      done
    done; exit 0 ) || return 1
  warn=''
  for name in "${top##*/}" "${main##*/}"; do # the work tree's folder, and the main checkout's when this is a worktree
    [ "${#name}" -ge 4 ] && printf '%s\n' "$text" | grep -qiF -- "$name" && { warn=1; break; }
  done
  title="[feedback] $phase $kind: $summary"
  body=$fields
  [ -z "$rest" ] || body="$rest

---
$fields"
}
code() { printf '%s\n%s\n%s\n' "$REPO" "$title" "$body" | cksum | cut -d' ' -f1; }

fingerprint() { printf '%s %s\n' "$(git rev-parse -q --verify HEAD 2>/dev/null)" "$(git status --porcelain | git hash-object --stdin)"; }

missing() {
  out=''
  for p in $PHASES; do
    # a phase line is "<name>" or "<name> skipped: <why>"
    grep -Eq "^$p( skipped: .+)?\$" "$S/phases" 2>/dev/null || out="$out $p"
  done
  printf '%s\n' "${out# }"
}

cmd=$1
[ $# -gt 0 ] && shift

case $cmd in
  hook-start)
    input=$(cat)
    if cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null && state; then
      # a new process gets its blocks back; a compaction inside one does not
      case $input in *'"source":"startup"'*|*'"source":"resume"'*) echo 0 > "$S/stop-blocks"; rm -f "$S/pass" ;; esac
      # only a new session sets the reference; a resume must keep it
      case $input in *'"source":"startup"'*) fingerprint > "$S/session-head" ;; esac
    fi
    cat <<'EOF'
hstack is installed. For any request to build, change or fix code in this repository, invoke the hstack:build skill first and follow it to its last step before you reply. No human will answer questions: decide from the requirement and the code, and write each decision down.
EOF
    exit 0 ;;

  hook-stop)
    cat > /dev/null
    { cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null && state; } || exit 0
    # a turn the user spent on a feedback verb is not a build turn: it ends once, unblocked. Consumed on every stop,
    # so a pass never waits for a later one.
    if [ -f "$S/pass" ]; then rm -f "$S/pass"; exit 0; fi
    head=$(git rev-parse -q --verify HEAD 2>/dev/null)
    if [ -f "$S/done" ] && [ "$(cat "$S/done")" = "$head" ] && [ -z "$(git status --porcelain)" ]; then exit 0; fi
    if [ -f "$S/base" ]; then
      m=$(missing)
      if [ -n "$m" ]; then why="the hstack:build run is not finished; steps not recorded: $m. Continue hstack:build from the first of them."
      else why="the repository changed after the last final check. If this is new work, run hstack:build from its start; otherwise run its final step again."; fi
    else
      [ "$(fingerprint)" = "$(cat "$S/session-head" 2>/dev/null)" ] && exit 0 # nothing changed: a question, not a build
      why="the repository changed without the hstack:build workflow. Invoke the hstack:build skill and follow it to the end."
    fi
    n=$(cat "$S/stop-blocks" 2>/dev/null || echo 0)
    if [ "$n" -ge "$MAX_BLOCKS" ] 2>/dev/null; then # never loop: a capped gate costs less than a run that never ends
      # the gate giving up on a started run leaves it to a human: one entry per cap (the bump past the cap marks it)
      if [ "$n" -eq "$MAX_BLOCKS" ] && [ -f "$S/base" ]; then
        echo $((n + 1)) > "$S/stop-blocks"
        set -- ${m:-final}
        record intervention "$1" '' > /dev/null 2>&1
      fi
      exit 0
    fi
    echo $((n + 1)) > "$S/stop-blocks"
    printf '{"decision":"block","reason":"hstack: %s No human will answer; decide from the requirement and the code. When finished, end with exactly the reply the task asked for."}\n' "$why"
    exit 0 ;;
esac

if [ "$cmd" = feedback ]; then
  REPO="${HSTACK_FEEDBACK_REPO:-emulatalk1/hstack}"
  case $REPO in
    *[!A-Za-z0-9_./-]*|*/*/*|/*|*/) echo "hstack: HSTACK_FEEDBACK_REPO must be owner/name" >&2; exit 1 ;;
    */*) ;;
    *) echo "hstack: HSTACK_FEEDBACK_REPO must be owner/name" >&2; exit 1 ;;
  esac
  LC_ALL=C; export LC_ALL # an entry is read as bytes: no locale may drop a line the check should refuse
  verb=$1
  [ $# -gt 0 ] && shift
  S=''
  state
  # the user is in this turn: the stop hook of the session's repository lets it end once
  case $verb in add|describe|draft|post|dismiss|label|collect) ( cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null && state && : > "$S/pass" ) ;; esac
  need_gh() {
    command -v gh >/dev/null 2>&1 || kept "gh is not installed"
    gh auth status >/dev/null 2>&1 || kept "gh is not logged in"
  }
  kept() { echo "hstack: $1; nothing posted.${f:+ kept: $f}"; exit 1; }
  entry() { # <id>: sets f to an unposted entry's file, or exits. The id is checked before a path is built from it.
    case $1 in ''|*[!0-9/-]*) echo "usage: hstack.sh feedback $verb <id>..., the id as feedback draft printed it" >&2; exit 1 ;; esac
    printf '%s\n' "$1" | grep -Eq '^[0-9]+/[0-9]{8}-[0-9]{6}-[0-9]+$' || { echo "hstack: $1 is not an entry id" >&2; exit 1; }
    f="$ROOT/${1%/*}/feedback/${1#*/}"
    [ -f "$f" ] || { echo "hstack: no unposted entry $1" >&2; exit 1; }
  }
  describe() { # <entry file>: the description from stdin, kept as written; an empty one changes nothing
    [ -t 0 ] && return 1
    [ ! -L "$1.md" ] || return 1
    t=$(cat)
    [ -n "$t" ] && printf '%s\n' "$t" > "$1.md"
  }
  case $verb in
    add)
      [ -n "$S" ] || { echo "hstack: not inside a git repository" >&2; exit 1; }
      { in_list "$1" "$KINDS" && { [ "$2" = none ] || in_list "$2" "$PHASES"; }; } || { echo "usage: hstack.sh feedback add <$(echo $KINDS | tr ' ' '|')> <$(echo $PHASES | tr ' ' '|')|none>, the description on stdin" >&2; exit 1; }
      # numbers only where a run stands behind the report: an idea, or a report outside the loop, has none; an escaped
      # bug belongs to a finished run, and without done the state is a newer run's
      bare=''
      case $1 in update|enhancement) bare=1 ;; escaped-bug) [ -f "$S/done" ] || bare=1 ;; esac
      [ "$2" = none ] && bare=1
      record "$1" "$2" '' $bare
      [ -f "$E" ] || { echo "hstack: could not write $E" >&2; exit 1; }
      echo "recorded: $E"
      describe "$E" || echo "no description yet: give one with feedback describe ${S##*/}/${E##*/}" ;;

    describe)
      entry "$1"
      describe "$f" || { echo "hstack: describe reads the description from stdin, and got none. kept: $f" >&2; exit 1; }
      echo "described: $f" ;;

    draft)
      none=1
      for f in "$ROOT"/*/feedback/*; do
        [ -f "$f" ] || continue
        d=${f%/feedback/*}
        id=${d##*/}/${f##*/}
        case $id in *[!0-9/-]*) continue ;; esac # not an entry (a description, a stray file): a name is never printed as text
        none=0
        draft "$f"
        case $? in
          0) printf 'entry %s\nlocal: %s\nto: %s\n' "$id" "$f" "$REPO"
             [ -z "$warn" ] || echo "warning: the text names this project's folder ($name); check that it holds nothing of the customer's"
             # body lines stand behind "| ", so no line of a description can pass for one of the lines around it
             printf 'title: %s\n%s\nconfirm: %s\n\n' "$title" "$(printf '%s\n' "$body" | sed 's/^/| /')" "$(code)" ;;
          2) printf 'undescribed %s: %s at %s\nlocal: %s\n\n' "$id" "$kind" "$phase" "$f" ;;
          # a refused entry is named, never shown: its lines may hold what must not be printed
          *) printf 'refused: %s: %s\n\n' "$f" "$why" ;;
        esac
      done
      [ $none -eq 0 ] || echo "no unposted feedback entry" ;;

    post)
      # no text is passed in here: only an id and the code draft printed for the text the user read
      entry "$1"
      draft "$f"
      case $? in
        0) ;;
        2) echo "hstack: no description: an issue needs one. Give it with feedback describe $1. kept: $f" >&2; exit 1 ;;
        *) echo "hstack: refused: $why. kept: $f" >&2; exit 1 ;;
      esac
      [ "$(code)" = "$2" ] || { echo "hstack: the code is not the one of this draft and repository: run feedback draft and show it again. kept: $f" >&2; exit 1; }
      need_gh
      labels=$(gh label list --repo "$REPO" --limit 1000 --json name --jq '.[].name' 2>/dev/null) || kept "could not read the labels of $REPO"
      printf '%s\n' "$labels" | grep -qx feedback || kept "the label 'feedback' does not exist on $REPO. Ask the user; only on their yes run: hstack.sh feedback label"
      url=$(gh issue create --repo "$REPO" --label feedback --title "$title" --body "$body") || kept "gh could not create the issue"
      mkdir -p "${f%/*}/posted" && echo "posted: $url" >> "$f" && mv "$f" "$f.md" "${f%/*}/posted/"
      echo "$url" ;;

    dismiss) # off the list, not off the disk: a stumble the user will not post
      entry "$1"
      mkdir -p "${f%/*}/dismissed" && mv "$f" "${f%/*}/dismissed/" || { echo "hstack: could not dismiss $f" >&2; exit 1; }
      [ ! -e "$f.md" ] && [ ! -L "$f.md" ] || mv "$f.md" "${f%/*}/dismissed/"
      echo "dismissed: ${f%/*}/dismissed/${f##*/}" ;;

    label) f=''; need_gh; gh label create feedback --repo "$REPO" --description 'Reports posted by hstack-feedback' ;;

    collect)
      f=''; need_gh
      open=$(gh issue list --repo "$REPO" --label feedback --state open --limit 1000 --json number,title --jq '.[] | "\(.number)\t\(.title)"') || kept "could not list the issues of $REPO"
      [ -n "$open" ] || { echo "no open feedback issue on $REPO"; exit 0; }
      tab=$(printf '\t')
      # "<phase> <kind>: <count>", then one line per issue; a title of another shape goes under "other"
      printf '%s\n' "$open" | awk -F'\t' '{ k = "other"; t = $2
          if (t ~ /^\[feedback\] [a-z]+ [a-z-]+: /) { split(t, w, " "); k = w[2] " " substr(w[3], 1, length(w[3]) - 1); sub(/^\[feedback\] [a-z]+ [a-z-]+: /, "", t) }
          print k "\t" $1 "\t" t }' | sort -t "$tab" -k1,1 -k2,2n |
        awk -F'\t' '$1 != k { if (k != "") printf "%s: %d%s\n", k, n, l; k = $1; n = 0; l = "" }
          { n++; l = l "\n  #" $2 " " $3 } END { if (k != "") printf "%s: %d%s\n", k, n, l }' ;;

    *) echo "usage: hstack.sh feedback add <kind> <phase|none>|describe <id>|draft|post <id> <code>|dismiss <id>|label|collect" >&2; exit 1 ;;
  esac
  exit
fi

state || { echo "hstack: not inside a git repository" >&2; exit 1; }

case $cmd in
  dir) echo "$S" ;;

  start)
    if [ -f "$S/base" ]; then
      old="$S/old/$(date +%Y%m%d-%H%M%S)"
      mkdir -p "$old"
      for f in "$S"/*; do case ${f##*/} in old|repo|top|session-head|stop-blocks|feedback) ;; *) mv "$f" "$old/" ;; esac; done
    fi
    git rev-parse -q --verify HEAD > "$S/base" || { echo "hstack: the repository has no commit" >&2; exit 1; }
    date +%s > "$S/started"
    : > "$S/phases"
    echo "$S" ;;

  phase)
    [ -n "$1" ] || { echo "usage: hstack.sh phase <name> [skipped: <why>]" >&2; exit 1; }
    line="$*"
    printf '%s\n' "$line" | grep -Eq '^[a-z]+( skipped: .+)?$' || { echo "hstack: a phase is '<name>' or '<name> skipped: <why>'" >&2; exit 1; }
    printf '%s\n' "$line" >> "$S/phases" || exit 1
    # a skipped step or an unavailable capability is a stumble. The why goes to the entry's detail only.
    name=${line%% *}
    if in_list "$name" "$PHASES"; then
      case $line in
        "$name skipped: time"|"$name skipped: time"[!a-z]*) record cost "$name" "$line" ;;
        *' skipped: '*) record setup-failure "$name" "$line" ;; # a guess: the loop names one such skip, a product nothing can run
        setup) u=$(grep 'unavailable:' "$S/capabilities.md" 2>/dev/null) && record setup-failure setup "$u" ;;
      esac
    fi > /dev/null 2>&1
    : ;;

  missing) missing ;;

  lock)
    [ $# -gt 0 ] || { echo "usage: hstack.sh lock <test file>..." >&2; exit 1; }
    : > "$S/oracle.lock.new"
    for f in "$@"; do
      [ -f "$f" ] || { echo "hstack: $f is not a file" >&2; rm -f "$S/oracle.lock.new"; exit 1; }
      printf '%s %s\n' "$(git hash-object -- "$f")" "$f" >> "$S/oracle.lock.new"
    done
    mv "$S/oracle.lock.new" "$S/oracle.lock"
    echo >> "$S/locks"
    echo "locked $# file(s)" ;;

  gate)
    bad=0
    if [ -f "$S/oracle.lock" ]; then
      while read -r h f; do
        if [ ! -f "$f" ]; then echo "ORACLE MISSING: $f"; bad=1
        elif [ "$(git hash-object -- "$f")" != "$h" ]; then echo "ORACLE CHANGED: $f"; bad=1; fi
      done < "$S/oracle.lock"
      [ $bad -eq 0 ] && echo "oracle: $(wc -l < "$S/oracle.lock" | tr -d ' ') locked file(s) unchanged"
    else echo "oracle: no lock (the oracle step wrote no test)"; fi
    base=$(cat "$S/base")
    if [ -s "$S/test-paths" ]; then
      set --
      while IFS= read -r p; do [ -n "$p" ] && set -- "$@" "$p"; done < "$S/test-paths"
      # pre-existing test files: deleted or renamed ones, and every removed or altered line; added lines pass
      git diff -M --name-status "$base" -- "$@" | grep -E '^(D|R)' | sed 's/^/PRE-EXISTING TEST /'
      git diff -M --name-status "$base" -- "$@" | grep -E '^M' | cut -f2 | while IFS= read -r f; do
        git diff -U0 "$base" -- "$f" | grep -E '^-' | grep -Ev '^--- ' | sed "s|^-|REMOVED $f: |"
      done
    else echo "tests: no test-paths recorded, pre-existing tests not checked"; fi
    exit $bad ;;

  elapsed) echo $(( ($(date +%s) - $(cat "$S/started")) / 60 )) ;;

  done)
    m=$(missing)
    [ -z "$m" ] || { echo "hstack: steps not recorded: $m" >&2; exit 1; }
    [ -z "$(git status --porcelain)" ] || { echo "hstack: commit every change first" >&2; exit 1; }
    git rev-parse HEAD > "$S/done"
    date +%s > "$S/ended"
    echo "done at $(cat "$S/done")" ;;

  *) echo "usage: hstack.sh dir|start|phase|missing|lock|gate|elapsed|done|feedback|hook-start|hook-stop" >&2; exit 1 ;;
esac
