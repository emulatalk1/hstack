---
type: report
title: "Foundation check on both stacks"
description: "The output of init and the safety checks on the Electron fixture (stack B) and on the real migration copy (stack A), on Node and again on Bun."
status: draft
generated: { by: claude-code/2.1.310, at: "2026-10-26T23:33:00+07:00" }
sources:
  - id: foundation-plan
    resource: /plans/2026-10-26-hstack-foundation.md
---

# Foundation check on both stacks

Task 10 of the foundation plan, run again after the final review fixes: init and the safety checks on `fixtures/electron` and on `../outsourcing-hstack`, with the output as printed. The `exit N` lines are added after each block.

## This repo's docs bundle and the Electron fixture

Command: `node scripts/init.mjs fixtures/electron --force` (stack B, no warnings)

```text
Wrote /Users/hbchuc/Documents/programing/vibe-code/hstack/fixtures/electron/.hstack/manifest.json
exit 0
```

Stack B shows in the fixture manifest as these two lines:

```text
  "app": ".",
  "stack": "B",
```

Command: `node scripts/okf-check.mjs docs`

```text
Docs bundle: OK
exit 0
```

## The migration copy (stack A)

Command: `node scripts/init.mjs ../outsourcing-hstack --force` (run on the project root, never inside `real-estate/`)

```text
Warning: The compose file has no project name, so Docker treats this folder as the same project as any other folder named real-estate. hstack will not run `docker compose` here until a later hstack step gives it its own services.
Warning: src/app/(frontend)/layout.tsx line 29 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/articles.e2e.spec.ts line 48 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/articles.e2e.spec.ts line 49 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/articles.e2e.spec.ts line 50 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/articles.e2e.spec.ts line 52 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/articles.e2e.spec.ts line 194 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/articles.e2e.spec.ts line 201 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/articles.e2e.spec.ts line 250 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/home.e2e.spec.ts line 274 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/pages.e2e.spec.ts line 23 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/pages.e2e.spec.ts line 24 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/properties.e2e.spec.ts line 32 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/properties.e2e.spec.ts line 76 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/properties.e2e.spec.ts line 389 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/properties.e2e.spec.ts line 418 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/properties.e2e.spec.ts line 428 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/seo-files.e2e.spec.ts line 6 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/int/seed-photos.int.spec.ts line 40 has port 1 written in code. Read ports from .env so this project can get its own.
Warning: tests/int/seed-photos.int.spec.ts line 46 has port 1 written in code. Read ports from .env so this project can get its own.
Warning: tests/int/seed-showcase-command.int.spec.ts line 25 has port 1 written in code. Read ports from .env so this project can get its own.
Warning: tests/int/seed-showcase-command.int.spec.ts line 27 has port 1 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/company.test.ts line 49 has port 5432 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 8 has port 5432 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 9 has port 5432 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 20 has port 5432 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 21 has port 5432 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 27 has port 5432 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 33 has port 5432 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 39 has port 5432 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 40 has port 5432 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 41 has port 5432 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 42 has port 5432 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 58 has port 1 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 72 has port 1 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/instrumentation.test.ts line 10 has port 1 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/instrumentation.test.ts line 41 has port 1 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/lead-emails.test.ts line 23 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/lead-emails.test.ts line 32 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/lead-emails.test.ts line 36 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/lead-emails.test.ts line 47 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/lead-emails.test.ts line 120 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/lead-emails.test.ts line 181 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/lead-emails.test.ts line 220 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/helpers/login.ts line 3 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/helpers/mailpit.ts line 1 has port 8025 written in code. Read ports from .env so this project can get its own.
Wrote /Users/hbchuc/Documents/programing/vibe-code/outsourcing-hstack/.hstack/manifest.json
Docs bundle: 41 errors.
  decisions/2026-10-08-stack-and-v1-scope.md is stable, but no person has verified it. Add a verified entry whose by starts with human:, or set status to draft.
  design/2026-10-09-real-estate-v1-design.md is stable, but no person has verified it. Add a verified entry whose by starts with human:, or set status to draft.
  design/2026-10-18-redesign.md is stable, but no person has verified it. Add a verified entry whose by starts with human:, or set status to draft.
exit 0
```

Command: `cat ../outsourcing-hstack/.hstack/manifest.json`

```json
{
  "version": 1,
  "projectName": "outsourcing-hstack-335bd25e",
  "app": "real-estate",
  "stack": "A",
  "packageManager": "pnpm",
  "commands": {
    "install": "pnpm install --frozen-lockfile",
    "unit": "pnpm test --project unit",
    "int": "pnpm test --project int",
    "e2e": "pnpm test:e2e --project chromium",
    "oneTest": {
      "unit": "pnpm test --project unit -t '<title>'",
      "int": "pnpm test --project int -t '<title>'",
      "e2e": "pnpm test:e2e --project chromium -g '<title>'"
    }
  },
  "devServer": {
    "start": "pnpm dev",
    "port": 3000
  },
  "data": {
    "kind": "postgres",
    "droppable": [
      "real_estate_hstack",
      "real_estate_hstack_test"
    ],
    "seed": "pnpm seed:demo"
  },
  "compose": {
    "file": "real-estate/docker-compose.yml",
    "name": null,
    "matches": false
  },
  "paths": {
    "design": "docs/design/",
    "plans": "docs/plans/",
    "features": "progress/features.json",
    "coverage": "progress/test-coverage.md",
    "progressLog": "progress/progress.md",
    "evaluations": "progress/evaluations/"
  },
  "actor": "claude-code/2.1.310",
  "slots": {
    "spec": "superpowers:brainstorming",
    "plan": "superpowers:writing-plans",
    "build": "superpowers:subagent-driven-development",
    "review": "superpowers:requesting-code-review",
    "audit": "ponytail:ponytail-audit",
    "finish": "superpowers:finishing-a-development-branch"
  },
  "evaluators": {
    "models": [
      "opus",
      "sonnet"
    ]
  },
  "mutation": {
    "budgetMinutes": 20
  }
}
```

The fixed-port warnings include unit-test URLs. Filtering them to the project's own ports is deferred to the own-services plan.

The client repo stayed clean. Command: `git -C ../outsourcing-hstack/real-estate status --short`

```text
exit 0
```

Output: empty.

## The safety checks on the copy root

```text
$ node scripts/check.mjs ../outsourcing-hstack docker
The compose file real-estate/docker-compose.yml has no project name, so Docker would share it with other folders of the same name. Docker is not allowed here.
exit 1

$ node scripts/check.mjs ../outsourcing-hstack drop real_estate
real_estate is not on this project's list of data hstack may drop. It may drop only: real_estate_hstack, real_estate_hstack_test.
exit 1

$ node scripts/check.mjs ../outsourcing-hstack drop real_estate_hstack
Dropping real_estate_hstack is allowed.
exit 0

$ node scripts/check.mjs ../outsourcing-hstack port 5432
Port 5432 is held by the Docker container real-estate-postgres-1 (Docker project real-estate), not by this project. hstack will not stop it.
exit 1
```

## Run again on Bun (2026-10-26)

The same checks after the Bun move, with Bun 1.4.4. Before the run the Node-written manifest was saved; the client repo was clean before and after.

Command: `bun --version`

```text
1.4.4
```

Command: `bun scripts/init.mjs fixtures/electron --force`

```text
Wrote /Users/hbchuc/Documents/programing/vibe-code/hstack/fixtures/electron/.hstack/manifest.json
exit 0
```

Command: `bun scripts/init.mjs ../outsourcing-hstack --force` (the project root, never inside `real-estate/`)

```text
Warning: The compose file has no project name, so Docker treats this folder as the same project as any other folder named real-estate. hstack will not run `docker compose` here until a later hstack step gives it its own services.
Warning: src/app/(frontend)/layout.tsx line 29 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/articles.e2e.spec.ts line 48 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/articles.e2e.spec.ts line 49 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/articles.e2e.spec.ts line 50 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/articles.e2e.spec.ts line 52 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/articles.e2e.spec.ts line 194 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/articles.e2e.spec.ts line 201 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/articles.e2e.spec.ts line 250 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/helpers/login.ts line 3 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/helpers/mailpit.ts line 1 has port 8025 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/home.e2e.spec.ts line 274 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/pages.e2e.spec.ts line 23 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/pages.e2e.spec.ts line 24 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/properties.e2e.spec.ts line 32 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/properties.e2e.spec.ts line 76 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/properties.e2e.spec.ts line 389 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/properties.e2e.spec.ts line 418 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/properties.e2e.spec.ts line 428 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/e2e/seo-files.e2e.spec.ts line 6 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/int/seed-photos.int.spec.ts line 40 has port 1 written in code. Read ports from .env so this project can get its own.
Warning: tests/int/seed-photos.int.spec.ts line 46 has port 1 written in code. Read ports from .env so this project can get its own.
Warning: tests/int/seed-showcase-command.int.spec.ts line 25 has port 1 written in code. Read ports from .env so this project can get its own.
Warning: tests/int/seed-showcase-command.int.spec.ts line 27 has port 1 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/company.test.ts line 49 has port 5432 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 8 has port 5432 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 9 has port 5432 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 20 has port 5432 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 21 has port 5432 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 27 has port 5432 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 33 has port 5432 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 39 has port 5432 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 40 has port 5432 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 41 has port 5432 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 42 has port 5432 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 58 has port 1 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/database-url.test.ts line 72 has port 1 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/instrumentation.test.ts line 10 has port 1 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/instrumentation.test.ts line 41 has port 1 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/lead-emails.test.ts line 23 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/lead-emails.test.ts line 32 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/lead-emails.test.ts line 36 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/lead-emails.test.ts line 47 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/lead-emails.test.ts line 120 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/lead-emails.test.ts line 181 has port 3000 written in code. Read ports from .env so this project can get its own.
Warning: tests/unit/lead-emails.test.ts line 220 has port 3000 written in code. Read ports from .env so this project can get its own.
Wrote /Users/hbchuc/Documents/programing/vibe-code/outsourcing-hstack/.hstack/manifest.json
Docs bundle: 41 errors.
  decisions/2026-10-08-stack-and-v1-scope.md is stable, but no person has verified it. Add a verified entry whose by starts with human:, or set status to draft.
  design/2026-10-09-real-estate-v1-design.md is stable, but no person has verified it. Add a verified entry whose by starts with human:, or set status to draft.
  design/2026-10-18-redesign.md is stable, but no person has verified it. Add a verified entry whose by starts with human:, or set status to draft.
exit 0
```

The new manifest against the Node-written one: `diff` printed nothing, exit 0. The manifests are identical.

The warning set against the Node run above: both runs print 46 `Warning:` lines; after `sort` on both, `diff` printed nothing, exit 0. The set is identical. Bun prints them sorted by file, then line.

The client repo stayed clean. Command: `git -C ../outsourcing-hstack/real-estate status --short`

```text
exit 0
```

Output: empty.

The four checks on the copy root:

```text
$ bun scripts/check.mjs ../outsourcing-hstack docker
The compose file real-estate/docker-compose.yml has no project name, so Docker would share it with other folders of the same name. Docker is not allowed here.
exit 1

$ bun scripts/check.mjs ../outsourcing-hstack drop real_estate
real_estate is not on this project's list of data hstack may drop. It may drop only: real_estate_hstack, real_estate_hstack_test.
exit 1

$ bun scripts/check.mjs ../outsourcing-hstack drop real_estate_hstack
Dropping real_estate_hstack is allowed.
exit 0

$ bun scripts/check.mjs ../outsourcing-hstack port 5432
Port 5432 is held by the Docker container real-estate-postgres-1 (Docker project real-estate), not by this project. hstack will not stop it.
exit 1
```
