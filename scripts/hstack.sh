#!/bin/sh
# hstack run state and the two hooks. POSIX sh + git only: the project's box may have no other runtime.
# State lives outside the work tree and outside .git (Claude Code guards writes into .git), in
# ${HSTACK_STATE:-$HOME/.hstack} (or /tmp/.hstack without HOME)/<checksum of the git dir>, so it is never committed and never part of the product.
# usage: hstack.sh dir|start|phase <name> [skipped: <why>]|missing|lock <file>...|gate|elapsed|done|hook-start|hook-stop

PHASES='setup build review explore mutate final'
MAX_BLOCKS=3

state() {
  G=$(git rev-parse --absolute-git-dir 2>/dev/null) || return 1
  S="${HSTACK_STATE:-${HOME:-/tmp}/.hstack}/$(printf '%s' "$G" | cksum | cut -d' ' -f1)"
  mkdir -p "$S" && printf '%s\n' "$G" > "$S/repo"
}

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
      case $input in *'"source":"startup"'*|*'"source":"resume"'*) echo 0 > "$S/stop-blocks" ;; esac
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
    [ "$n" -ge "$MAX_BLOCKS" ] 2>/dev/null && exit 0 # never loop: a capped gate costs less than a run that never ends
    echo $((n + 1)) > "$S/stop-blocks"
    printf '{"decision":"block","reason":"hstack: %s No human will answer; decide from the requirement and the code. When finished, end with exactly the reply the task asked for."}\n' "$why"
    exit 0 ;;
esac

state || { echo "hstack: not inside a git repository" >&2; exit 1; }

case $cmd in
  dir) echo "$S" ;;

  start)
    if [ -f "$S/base" ]; then
      old="$S/old/$(date +%Y%m%d-%H%M%S)"
      mkdir -p "$old"
      for f in "$S"/*; do case ${f##*/} in old|repo|session-head|stop-blocks) ;; *) mv "$f" "$old/" ;; esac; done
    fi
    git rev-parse -q --verify HEAD > "$S/base" || { echo "hstack: the repository has no commit" >&2; exit 1; }
    date +%s > "$S/started"
    : > "$S/phases"
    echo "$S" ;;

  phase)
    [ -n "$1" ] || { echo "usage: hstack.sh phase <name> [skipped: <why>]" >&2; exit 1; }
    line="$*"
    printf '%s\n' "$line" | grep -Eq '^[a-z]+( skipped: .+)?$' || { echo "hstack: a phase is '<name>' or '<name> skipped: <why>'" >&2; exit 1; }
    printf '%s\n' "$line" >> "$S/phases" ;;

  missing) missing ;;

  lock)
    [ $# -gt 0 ] || { echo "usage: hstack.sh lock <test file>..." >&2; exit 1; }
    : > "$S/oracle.lock.new"
    for f in "$@"; do
      [ -f "$f" ] || { echo "hstack: $f is not a file" >&2; rm -f "$S/oracle.lock.new"; exit 1; }
      printf '%s %s\n' "$(git hash-object -- "$f")" "$f" >> "$S/oracle.lock.new"
    done
    mv "$S/oracle.lock.new" "$S/oracle.lock"
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
    echo "done at $(cat "$S/done")" ;;

  *) echo "usage: hstack.sh dir|start|phase|missing|lock|gate|elapsed|done|hook-start|hook-stop" >&2; exit 1 ;;
esac
