---
name: hstack-safety
description: Use before any Docker command, before stopping a process on a port, before dropping a database and before wiping a folder in a project that has an hstack manifest. It tells you which check to run and what to do when it says no.
---

# hstack safety

hstack keeps one rule above all others: an agent must never destroy data it does not own. A script answers "may I do this?" for you. You still do the action yourself.

## The rule

Before any Docker command, port stop, database drop or folder wipe, run the matching check. If it exits with 1, stop. Tell the user the reason it printed. Do not look for another way around it.

Exit 0 means allowed. Exit 1 means refused.

| Before you... | Run |
|---|---|
| run a `docker` or `docker compose` command | `node <skill base>/../../scripts/check.mjs <project root> docker` |
| stop whatever holds a port | `node <skill base>/../../scripts/check.mjs <project root> port <number>` |
| drop a database | `node <skill base>/../../scripts/check.mjs <project root> drop <name>` |
| wipe a data folder | `node <skill base>/../../scripts/check.mjs <project root> wipe <path>` |

`<skill base>` is this skill's folder. `<project root>` is the folder that holds `.hstack/`.

Every check refuses first if there is no manifest (run `hstack-init`), or if the folder was copied or moved since `init` (run `hstack-init` again there).

## What each check means

- **docker**: the compose file must name its Docker project after this folder's path. Without that, Docker would share containers and data with other folders of the same name.
- **port**: a port is fine if it is free or held by this project. If something else holds it, do not stop it.
- **drop**: you may drop only the database the manifest names. To reset data, drop that one database, then run the manifest's seed command.
- **wipe**: you may wipe only the data folder the manifest names, never the project or the app folder. Only for projects that keep data in a folder.

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
