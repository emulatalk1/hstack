---
name: hstack-init
description: Use when you set up hstack in a project, or after the project folder was copied or moved. It writes the project's hstack manifest and reports problems such as ports written in code.
---

# hstack init

`init` looks at a project and writes its manifest: the file where hstack keeps the project's name, ports, commands and the one database or data folder an agent may wipe.

## When to run it

- Once per project, before any other hstack step.
- Again after the project folder is copied or moved. The manifest is tied to the folder's path, so a copy fails every safety check until you run `init` there.

## The command

```
node <skill base>/../../scripts/init.mjs <project root>
```

`<skill base>` is this skill's folder. `<project root>` is the folder that will hold `.hstack/`. It may be the app folder or a parent of it.

- If the app is in a subfolder and `init` cannot tell which one, it says so. Run it again with `--app <subfolder>`.
- If a manifest already exists, `init` changes nothing and says so. Add `--force` only when the user wants it replaced. This is the usual case after a copy or a move.

## What it will not do

- It never runs `docker compose`.
- It never writes inside the app folder. Its files go in `<project root>/.hstack/`.

## The warnings

Show every `Warning:` line to the user. Do not hide them.

- **"has port N written in code."** The app fixes that port in its own code, so this project cannot get its own port. The user can move the port into `.env` and read it from there. Until then, treat that port as shared.
- **"The compose file has no project name"**, or **"names its project X, not Y".** Docker would treat this folder as the same project as any other folder with that name. hstack will not allow Docker commands here until the compose file is fixed.

If the project has a `docs` folder, `init` ends with a `Docs bundle:` line. `OK` means the docs pass the checks. Anything else, run `node <skill base>/../../scripts/okf-check.mjs <project root>/docs` and show the user the result.
