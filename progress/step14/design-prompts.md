# Prompts typed into the plugin-design session

Prereg section 12, "Applied at step 9" decision 1 (option A): every prompt the user gives a design session is kept, and step 14's report lists them. Extracted by script from the design session's transcript (`5ba329cb-ade3-4e3d-8cea-1f5634f66a0d.jsonl` of the worktree `bridge-cse_01JxVNAL2Dkzabg9QuuNaY5E`, 2026-11-10 14:14Z to 2026-11-11 12:56Z, branches `bench-step11`, `plugin-design`, `plugin-w`): every user turn whose content is text the user typed, verbatim, with its time (UTC) and branch. Left out: tool results, the assistant's turns, 10 harness task notifications (background-task events, not typed) and 1 slash command (/clear at the session's start).

## 2026-11-10T14:14:08.407Z (bench-step11)

````text
You are the hstack plugin-design session. Constraints from the benchmark (prereg section 12, step 11 ruling 2 and decision 4):
- Branch off `main`. Never modify `bench/`, `progress/`, `docs/`, `tests/`, `fixtures/` or `.evidence/`.
- Plugin content lives only in these folders/files at the repo root: `.claude-plugin`, `skills`, `agents`, `commands`, `hooks`, `scripts`, `bin`, `.mcp.json`. The benchmark exports it with `git archive <commit> -- <those paths>`; any path under bench, progress, docs, tests, fixtures or .evidence makes the export refuse.
- Every plugin it depends on must be given with a pinned commit or version.
- Inside the benchmark box there are no web tools and `AskUserQuestion` is refused at the probe: a plugin that relies on either fails.
- Never read `.evidence/bench` (or anything under `.evidence/`), the locks in `progress/`, or the prereg's task lists. Never open these repos: we-promise/sure, kizuna-ai-lab/sokuji, pola-rs/polars, django-helpdesk/django-helpdesk, WeblateOrg/weblate, the-open-engine/zeroshot, moonrepo/moon, maplibre/martin, jtroo/kanata.
- From the trial you will receive only, through the user: per task and arm the build and requirement scores, task passed, tokens, minutes, interventions and how the run ended. No transcript, product, per-check result or check id.
When the plugin is ready, give the user the commit sha (and the pinned dependencies) to pass to the benchmark session.
````

## 2026-11-10T14:37:09.689Z (plugin-design)

````text
Advisor kiểm tra và đưa ra suggestion
````

## 2026-11-10T15:08:13.384Z (plugin-design)

````text
Advisor kiểm tra
````

## 2026-11-10T15:11:26.019Z (plugin-design)

````text
Bạn làm giúp tôi đc không
````

## 2026-11-10T15:12:27.873Z (plugin-design)

````text
Làm gì có session benchmark nào? Chạy trên sesion mới à
````

## 2026-11-10T15:14:09.396Z (plugin-design)

````text
Rồi bạn có thể kiểm tra
````

## 2026-11-11T06:42:08.747Z (plugin-design)

````text
Session trail đã làm xong bạn có thể kiểm tra
````

## 2026-11-11T12:44:59.882Z (plugin-design)

````text
I hitted limit, and it already reset, continue where you stop
````

## 2026-11-11T12:46:39.777Z (plugin-design)

````text
Advisor đưa ra ý kiến
````

## 2026-11-11T12:51:12.094Z (plugin-design)

````text
session controller là cái gì
````

## 2026-11-11T12:51:29.681Z (plugin-design)

````text
tự giao tiếp đi
````

## 2026-11-11T12:53:18.249Z (plugin-design)

````text
close session này được chưa?
````

## 2026-11-11T12:53:56.773Z (plugin-design)

````text
không merge main mà push à???
````

## 2026-11-11T12:54:41.523Z (plugin-design)

````text
what the fuck??? làm tôi rối quá
````

## 2026-11-11T12:55:09.857Z (plugin-design)

````text
ok, báo cho tôi khi nào close được, trên remote có branch bench kia là sao
````

