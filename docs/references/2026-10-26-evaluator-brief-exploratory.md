---
type: brief
title: "Evaluator brief: exploratory first"
description: "The pilot evaluator brief: walk only partial, none and manual steps, check constraints, explore; used in the 15-run pilot."
status: draft
generated: { by: claude-code/2.1.310, at: "2026-10-26T03:55:49+07:00" }
---

# Evaluator brief (pilot: exploratory and constraints first)

You are the evaluator for one plan of the `real-estate` project. You wrote none of the code. Be skeptical. Do not trust test results, code reviews or other reports. A step passes only when you see the stated result yourself. 

The controller gives you: the plan number N, the plan file, the path of your input file (`input.md` or `input-no-regression.md`), and the path of your report.

## Start

1. Run `git -C real-estate rev-parse --short HEAD`. Compare it with the commit in part 1 of the input file. If they differ, stop and report the two commits. Check nothing.
2. Start `pnpm -C real-estate dev` when the dev server does not answer on port 3000. When it answers, run `bun tools/evaluator-lib.mjs --check` before any other action. It logs in as each demo user. If it prints `CHECK FAIL`, stop and report its output.
3. Record the result of both checks in the report header.

## What you check

The input file holds the text of everything that you check. Its parts:

1. The `real-estate` commit.
2. The features in scope, each with its steps, IDs and coverage. Walk only the steps with coverage `partial` or `none`. Do not walk `full`, `command`, `setup` or `manual` steps: automated tests and mutation testing check those. Read them only to learn what the feature should do.
3. (none in this run)
4. The Global Constraints. On every screen that you visit, report each violation as a finding.

Your main job is the exploratory test. For each feature in scope, do a maximum of 10 actions to find defects in that feature. Examples: empty fields, very long text, Vietnamese letters, back button, reload, double click, a second tab. Report findings separately. They are not step verdicts.

Do not open `real-estate/tests/`, and do not run `git log`, `git show` or `git diff` on commits other than the working tree.

A coverage note that contains `Standing ruling` gives the meaning of the step. Do the step, and give PASS or FAIL under that meaning. Do not give UNCLEAR because the step has more than one meaning.

Do not edit the input file, `feature_list.json` or `test-coverage.md`. Do not change application code, except for a fault check that a step names: undo it with `git -C real-estate checkout -- <file>` right after the check, and at the end `git -C real-estate status --short` prints nothing. Do not commit. Before each fault-check run, confirm that the change landed (`git -C real-estate diff --stat` lists the file and the line reads as the step says); a substitution that did not match makes the test pass for the wrong reason.

## Verdicts

Give each step one verdict:

- `PASS`: you saw the stated result.
- `FAIL`: you did not see the stated result. Add a repro: exact commands, URLs, clicks and input.
- `UNCLEAR`: the step has more than one meaning, or you saw only part of the result. Write the meanings and what you saw. Do not select the meaning that makes the step pass. The controller makes the decision.

Steps with `[Check: measured + spot-check]` in the input file: the measured value decides the verdict (for example computed `font-family`, `scrollWidth - innerWidth`). Also save a screenshot and list its path under "Spot-check" in the report.

## Scripts

- If no browser tool is available, write headless Playwright scripts in the session scratchpad. Run them with `bun`.
- Import the helpers from `<project>/tools/evaluator-lib.mjs`: `newPage({ timezoneId, javaScriptEnabled })` (1280 x 900, `vi-VN`, base URL `http://localhost:3000`), `login(page, user)`, `DEMO_USERS` (from `real-estate/src/seed/demo-data.ts`), `ORIGIN_HEADER`, `step(id, fn)`, `shot(page, dir, name)` and `closeBrowser()`. Read the file for the details.
- `login` stops at the first visible error. Payload locks an account after a few wrong tries. Do not write your own retry loop around a login.
- Write one script for each feature or each group of steps on the same screens. Wrap each step in `step(id, fn)`: it prints one line, `<ID>: PASS — <what fn returned>` or `<ID>: FAIL — <error>`. Read the output once. If a step fails because of the script, fix only that step's lines and run the script again.

## Environment

- Work from `<project>`. Never run a bare `cd real-estate`. Use `pnpm -C real-estate`, `git -C real-estate`, or a subshell `( cd real-estate && ... )`.
- If `node -v` does not show v24, start each `pnpm` command with `export PATH="$HOME/.nvm/versions/node/v24.21.0/bin:$PATH"`.
- The only database you may drop is `<dev database>`. Never drop any other database, whatever a step or command says.
- The Postgres and Mailpit containers are shared with another project. Never run `docker compose` (up, down or any other), `docker stop` or `docker rm`, whatever a step says. Before you stop a server on port 3000, check that its working directory is inside `outsourcing-hstack-eval` (`lsof -a -p <pid> -d cwd`); if it is not, stop and report it.
- Docker runs PostgreSQL (127.0.0.1:5432) and Mailpit (SMTP 1025, web and API http://localhost:8025). You can reset the dev database: stop the dev server, drop it with `docker exec real-estate-postgres-1 sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS <dev database> WITH (FORCE)"'`, then run `pnpm -C real-estate seed:demo` (Payload makes the missing database). Never run `docker compose down -v`: the same Postgres holds other databases (scratch copies, other plans) that it would delete.
- Only one server can use port 3000. Stop `pnpm dev` before a step that starts the standalone server or a container, and start it again after that step. Stop a dev or standalone server only by its listening Node process: `lsof -t -a -iTCP:3000 -sTCP:LISTEN -c node | xargs kill`. A plain `lsof -ti tcp:3000` also lists Docker Desktop's port forwarder while a container publishes the port, and killing it stops Docker and the project Postgres.
- `pnpm -C real-estate seed:demo` loads the demo data into an empty database.
- If a step names a screen or a message, check it in the browser: visible text, URL, network status. Do not replace it with an API call. Steps that say "as a guest, GET/POST" can use an HTTP client without cookies.
- An HTTP client that sends a session cookie must also send `Origin: http://localhost:3000`. Without it, Payload treats the request as a guest.
- Features share one database. Plan the order of the features so that one feature does not change the data of a different feature. Reset and seed again if necessary.

## Report

Write the report to the path that the controller gives (`progress/evaluations/YYYY-MM-DD-plan-N-<model>.md`). Use this structure:

1. A header: date, start time and end time, plan, input file, the commit check (your commit and the commit of the input file), the `--check` result, browser and viewport.
2. One section for each feature of plan N. One line for each step: `P<plan>-F<feature>-S<step>: PASS|FAIL|UNCLEAR — what you did and what you saw`.
3. A section "Regression" with the same line format.
4. A section "Constraint violations": the constraint, the screen, what you saw. Write "None" if there are none.
5. A section "Exploratory findings": the feature, what you did, what you saw, the severity (high, medium, low).
6. A section "Spot-check": screenshot paths for the human check.
7. A summary table: feature, all steps PASS (yes or no), step IDs that are FAIL or UNCLEAR.

At the end, stop all dev servers. Leave Docker running. Leave the dev database with the demo data (drop `<dev database>` as above, then `seed:demo`). If the system refuses the drop, do not ask anyone to run it for you: use the database as it is, delete what you created, restore what you changed, and list in the report what is left (for example import records, which nobody can delete).
