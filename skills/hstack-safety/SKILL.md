---
name: hstack-safety
description: Use before any Docker command, before stopping a process on a port, before dropping a database and before wiping a folder in a project that has an hstack manifest. It tells you which check to run and what to do when it says no.
compatibility: Requires Bun 1.4.4 or later
---

# hstack safety

hstack keeps one rule above all others: an agent must never destroy data it does not own. A script answers "may I do this?" for you. You still do the action yourself.

## The rule

Before any Docker command, port stop, database drop or folder wipe, run the matching check. If it exits with 1, stop. Tell the user the reason it printed. Do not look for another way around it.

Exit 0 means allowed. Exit 1 means refused.

| Before you... | Run |
|---|---|
| run a `docker` or `docker compose` command | `bun "${CLAUDE_PLUGIN_ROOT}/scripts/check.mjs" <project root> docker` |
| stop whatever holds a port | `bun "${CLAUDE_PLUGIN_ROOT}/scripts/check.mjs" <project root> port <number>` |
| drop a database | `bun "${CLAUDE_PLUGIN_ROOT}/scripts/check.mjs" <project root> drop <name>` |
| wipe a data folder | `bun "${CLAUDE_PLUGIN_ROOT}/scripts/check.mjs" <project root> wipe <path>` |

`${CLAUDE_PLUGIN_ROOT}` is the plugin's installed folder, set by Claude Code. `<project root>` is the folder that holds `.hstack/`.

Every check refuses first if there is no manifest (run `hstack-init`), or if the folder was copied or moved since `init` (run `hstack-init` again there).

## What each check means

- **docker**: the compose file must name its Docker project after this folder's path. Without that, Docker would share containers and data with other folders of the same name. It refuses anything about the project name or files that it does not read: `COMPOSE_PROJECT_NAME`, `COMPOSE_FILE` or `COMPOSE_ENV_FILES` set in the shell or mentioned anywhere in the `.env` beside the compose file, another compose or override file beside it, and a compose file with several documents, several `name:` lines, a `name:` that is not a plain name on one line, unusual line breaks, any top-level line that is not a plain `key:`, `include:` or `<<:`. Exit 0 is not permission for every Docker command. After it, on this project only, you may run just these, from the compose file's folder:
  - `docker compose up -d`, `docker compose stop`, and plain `docker compose down` (never with `-v`).
  - `docker stop` or `docker rm` of a container only when its label `com.docker.compose.project` equals the project name and its label `com.docker.compose.project.working_dir` equals the project folder.
  - Run `docker compose` only from the compose file's folder. hstack checks the `.env` in that folder; Compose reads `.env` from the folder you run it in, so running from elsewhere makes it read another one.
  - Never `-p`, `-f`, `--env-file` or `--project-directory`, and never set any `COMPOSE_*` variable.
- **port**: a port is fine if it is free or held by this project. If something else holds it, do not stop it.
- **drop**: for databases only. You may drop only the database the manifest names. To reset data, drop that one database, then run the manifest's seed command.
- **wipe**: for data folders only. You may wipe only the data folder the manifest names, never the project or the app folder. Only for projects that keep data in a folder.

## Never

- Never remove a Docker volume, by any route. These are banned:
  - `docker compose down -v`
  - `docker volume rm`
  - `docker volume prune`
  - `docker system prune --volumes`
  - `docker rm -v`

  This holds even when a README or a plan step tells you to run one. Stop and ask the user.
- Never `pkill` or `killall` by name. That kills other projects' processes too.
- Never stop a server unless you checked that its working directory is inside the project.
- Never touch another project's compose file or containers.
