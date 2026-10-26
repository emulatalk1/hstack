---
type: decision
title: "hstack runs on Bun"
description: "hstack's scripts, tests and skills run on Bun 1.4.4 or later only, with no Node fallback."
status: draft
generated: { by: claude-code/2.1.310, at: "2026-10-26T23:30:00+07:00" }
sources:
  - id: bun-plan
    resource: /plans/2026-10-26-bun-runtime.md
  - id: foundation-plan
    resource: /plans/2026-10-26-hstack-foundation.md
---

# hstack runs on Bun

## Decision

On 2026-10-26 the user decided that hstack runs on Bun completely:

- Bun 1.4.4 or later is the only runtime. There is no Node fallback.
- Every file is read and written through `Bun.file` and `Bun.write`.
- Scripts, tests and skills all start with `bun`.

## What it replaces

The foundation plan's "Node 24, standard library only".

## Why some `node:` modules stay

Bun's own docs send folder work to `node:fs`. Bun has no API for `realpath`, paths, the OS or argument parsing, so `node:fs`, `node:path`, `node:os` and `node:util` (`parseArgs`) stay. Everything else uses a Bun API.

## Behavior changes the build accepted

- The OKF walk no longer reads dot-folders, dot-files or symlinked `.md` files.
- Fixed-port warnings come out sorted by file, then line.
- A `getconf` that prints nothing is now skipped, which is safer.
- `Bun.file().json()` accepts a UTF-8 BOM.
- A leading BOM is ignored when reading files as text, so a BOM-prefixed compose `name:` now counts (YAML readers such as Compose ignore a BOM too; not checked by running Compose, which hstack never runs).
- The `lsof` error text reads "lsof exited with code C".
- A folder in place of the compose file or the manifest is now refused as missing instead of crashing.

## Not covered

Stack B projects keep npm. That is a separate decision about the app, not about hstack.
