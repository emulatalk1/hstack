---
type: spec
title: "Spec 1: the mock-up server of the brainstorm, in TypeScript on Bun"
description: "Part A of feedback issue 6: the server that shows mock-ups in a browser tab during a brainstorm, converted from the skill the user works with to one TypeScript script run with Bun; it does what the original does, shows hstack's name, loads nothing from the network, and keeps its files where it is told."
status: stable
generated: { by: claude-code/2.1.328, at: "2026-11-21T15:20:00+07:00" }
verified:
  - { by: human:emulatalk1, at: "2026-11-21T15:59:27+07:00" }
---

# Spec 1: the mock-up server of the brainstorm, in TypeScript on Bun

## 1. The request

Feedback issue 6 of `emulatalk1/hstack` asks for a brainstorm with the user before the spec. In the session of 2026-11-21 the user said the brainstorm is the one they already work with, whole:

> Không bỏ cái nào cho brainstorming cả chie cần adapt cho hstack là được, bạn có hiểu ý tôi ko

That skill shows mock-ups in a browser tab through a small server: five files, two `.sh`, one `.cjs`, one `.js` and an HTML frame. The README of hstack says "Add no new `.sh` or `.mjs` file". The user:

> Phần mockup có 5 file chạy seẻver -> convert qua bun và typescript

The work was then cut in two, the server first (the user: "Ok vậy tách đi"). This spec is part A: the server. Part B, the new step 1 with the two skills, is the next spec; hstack 0.4.2 is released when both are done. Part A stays one spec (the user, on the choice between one spec of 44 behaviours and two: "Giữ 1 spec").

The builder named three changes that the conversion makes: the page shows hstack's name and loads nothing from the network; the files are kept in a folder outside the repository; the part that runs in the browser is written in TypeScript. The user went on to the split with no word on them, so they are open points 1 to 3 below, and the approval of this spec is the user's word on them. Nothing else of the original is left out here.

## 2. Behaviours

The command is `bun scripts/mockup.ts`, with the verbs `start`, `stop` and `serve`. "The original" is the server of the skill the user works with. A name in backticks is the exact name. Where a behaviour says a command prints a line with `status` or `error`, that is one line of JSON with that field; the spaces in it are not fixed.

`serve` is the server itself, and `start` runs it. It reads its settings from the environment, under the original's names (open point 4): `BRAINSTORM_DIR` (the session's folder), `BRAINSTORM_HOST`, `BRAINSTORM_URL_HOST`, `BRAINSTORM_OWNER_PID` (the process whose death ends the server), `BRAINSTORM_PORT` (the port to take first), `BRAINSTORM_TOKEN` (the key), `BRAINSTORM_IDLE_TIMEOUT_MS`, `BRAINSTORM_LIFECYCLE_CHECK_MS` (how often it looks whether to end; one minute when not set), `BRAINSTORM_OPEN` and `BRAINSTORM_OPEN_CMD`. `start` sets the first four itself and hands the others on as it finds them; a test may run `serve` directly.

**Start**

1. `start` prints one line of JSON with `"type":"server-started"` and the fields `port`, `host`, `url_host`, `url`, `screen_dir`, `state_dir` and `idle_timeout_ms`, and returns with exit code 0 while the server goes on running.
2. The `url` of that line is `http://<url_host>:<port>/?key=<key>`, with an IPv6 host in square brackets.
3. The same line is in the file `server-info` of the state folder, which only its owner can read.
4. With `--dir <folder>` the session's folder is `<folder>/<a new id>/`, with the folders `content` (`screen_dir`) and `state` (`state_dir`) in it; a relative `<folder>` is taken from where the command was called, and is made when it is missing.
5. Without `--dir` the session's folder is under the system's temporary folder.
6. `--host <host>` is the address the server listens on (`127.0.0.1` when not given), and `--url-host <host>` is the host in the `url` (`localhost` for `127.0.0.1`).
7. `--idle-timeout-minutes <n>` sets `idle_timeout_ms` to n minutes; anything but a whole number above 0 prints a line with `error` `--idle-timeout-minutes must be a positive integer` and exits 1.
8. An argument it does not know prints a line with `error` `Unknown argument: <the argument>` and exits 1.
9. With `--foreground`, `start` does not return until the server ends, and the file `server.pid` of the state folder holds the server's process id. `start` chooses the foreground by itself on Windows and when `CODEX_CI` is set, and `--background` keeps it in the background there too; `--no-daemon` and `--daemon` are other names for the two.

**Stop**

10. `stop <session folder>` ends that session's server, prints a line with `status` `stopped`, removes `server-info`, and writes `server-stopped` in the state folder with `"reason":"stop"`.
11. After `stop`, a session made without `--dir` is deleted, and a session made with `--dir` keeps its folder and its screens, wherever `<folder>` lies.
12. `stop` for a session with no `server.pid` prints a line with `status` `not_running`; `stop` with no folder prints a line with `error` and its usage and exits 1.
13. When `server.pid` names a live process that is not this session's server (its command line does not carry `--brainstorm-server-id=<the id in the state folder's server-instance-id>`, or that file is missing or malformed), `stop` does not signal it, prints a line with `status` `stale_pid`, and writes `server-stopped` with `"reason":"stale_pid"`.

**What it serves**

14. With no screen in `content`, `GET /` gives a page that says `Waiting for the agent to push a screen...`.
15. `GET /` gives the newest `.html` file of `content`, by time of change.
16. A screen that starts with `<!DOCTYPE` or `<html` is served as it is; any other is a fragment and is served inside the frame, its text unchanged, a `$&` in it too.
17. Every page served at `/` carries the browser script, and its content type is `text/html`.
18. A file of `content` that is no `.html`, whose name starts with a dot, that is a symbolic link, or that is a hard link to a file outside `content`, is never served as the screen.
19. `GET /files/<name>` gives that file of `content` with the content type of its ending; an empty name, a name that starts with a dot, a symbolic link, a hard link to a file outside, and a missing file give 404, and the server goes on.
20. Any other path gives 404.

**The key**

21. A request with no key, or with a wrong `key` in the URL (a right cookie beside it too), gets 403 and a page headed `Session key required`.
22. `GET /?key=<the right key>` gives, not the screen, a page that puts the key into the tab's session storage as `brainstorm-session-key` and goes to `/`; the answer sets the cookie `brainstorm-key-<port>` with `HttpOnly`, `SameSite=Strict` and `Path=/`.
23. `GET /` and `GET /files/<name>` with that cookie and no key in the URL are served.
24. Every answer (200, 403, 404) carries `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'` and `Cross-Origin-Resource-Policy: same-origin`.
25. A WebSocket on `/` opens with the right key in the URL or the right cookie, and is refused with neither, or when its `Origin` is not `http://<the Host header>`.

**Clicks and screens**

26. A message from a browser that has a `choice` is added, as one line of JSON, to the file `events` of the state folder; a message without `choice` is not; a message that is no JSON, or is `null`, changes nothing and the server goes on.
27. Every message from a browser is one line of JSON with `"source":"user-event"` in the server's output, which for a server in the background is the file `server.log` of the state folder.
28. A new `.html` file in `content` sends `{"type":"reload"}` to every browser connected, deletes the file `events`, and gives the output line `{"type":"screen-added","file":…}`.
29. A change to a `.html` file that was there sends the reload and gives `{"type":"screen-updated","file":…}`, and leaves `events` as it is; a file that is no `.html`, or whose name starts with a dot, sends nothing.

**How long it lives**

30. After `idle_timeout_ms` (4 hours when not set) with no request that had the key, no message and no new or changed screen, the server ends by itself: it closes the open WebSockets, removes `server-info`, writes `server-stopped` with `"reason":"idle timeout"`, and its process ends; requests without the key do not put that off.
31. When the process named in `BRAINSTORM_OWNER_PID` has died, the server ends in the same way, with `"reason":"owner process exited"`; `start` names the coding tool's own process there, not the shell that tool used to run `start`.
32. A second `start` with the same `--dir`, after the first server has ended, takes the same port and the same key, so that a tab that was open connects again with its cookie; the files `.last-port` and `.last-token` in `<folder>` hold them, the second readable by its owner only.
33. When that port is taken, the server takes another port and a new key and leaves `.last-port` and `.last-token` as they are; when the key was given in `BRAINSTORM_TOKEN`, it exits 1 instead.
34. With `--open`, the user's browser is opened once, at the first screen and not before; never without `--open`, never when the server listens on another address than this machine's own, and never when a browser is already connected. `BRAINSTORM_OPEN_CMD` names the command that opens it.

**In the browser**

35. A click on an element with `data-choice` sends a message with `type` `click`, the `choice`, the element's `text`, its `id` and a `timestamp`; `toggleSelect(el)` marks the element `selected`, alone among the `.option` and `.card` of its container, or beside others when the container has `data-multiselect`.
36. The frame's status says `Connected` while the WebSocket is open and `Reconnecting…` when it is lost; the page tries again after 500 ms, then twice as long each time, to 30 seconds at most.
37. After 15 seconds without the server the page shows `Companion paused` over the screen, and when the server is back it loads again by itself.
38. The frame has the original's classes for content: `options`, `option`, `cards`, `card`, `mockup`, `split`, `pros-cons`, `mock-nav`, `mock-sidebar`, `mock-content`, `mock-button`, `mock-input`, `placeholder`, `subtitle`, `section`, `label`.

**hstack's name, and nothing from the network**

39. The frame and the waiting page show `hstack v<the version in .claude-plugin/plugin.json>`, and the frame's title is `hstack brainstorm`.
40. What the server itself adds (the frame, the waiting page, the 403 page, the page of behaviour 22, the browser script) holds no address of another host: no image, no link, no script from the network. A screen is the agent's own and is served as it is.

**The files**

41. The server, its two verbs and the browser's script are TypeScript run with Bun: the change adds no `.sh`, `.cjs`, `.js` or `.mjs` file, and `bun x tsc --noEmit` checks the new files and passes.
42. A file `LICENSE-mockup` lies beside the script, names the files it covers and holds the original's licence text with its copyright line; nothing else the change adds names the original's project or its author.
43. The README has a section ``### `mockup`: the mock-up server of a brainstorm`` under "Scripts", with the two verbs and their options.
44. `$H start` leaves a folder `mockups` of the state folder where it is, as it leaves `evidence`.

**Opening it to the network (added in the grill; the original has neither)**

45. `start` with a `--host` that is not this machine's own address (`127.0.0.1`, `localhost`, `::1`) and without `--allow-network` starts no server, exits 1, and prints a line with `error` that names the host and says `ask the user first, then add --allow-network` and `not encrypted on a local network`. A `serve` run directly with such a `BRAINSTORM_HOST` and without `BRAINSTORM_ALLOW_NETWORK` refuses in the same way: the check is made in one place, the server itself, and `start` only hands the permission on and prints the server's refusal.
46. With `--allow-network`, the `server-started` line has a field `reachable_at`: one entry for each address of this machine on which the server can be reached, with its `address`, its `url` (the key in it) and its `kind`, which is `tailscale` for an address of the tailnet ranges (`100.64.0.0/10`, `fd7a:115c:a1e0::/48`) and `network` for any other; for a server on this machine's own address the list is empty.
47. The README's "Known limits" says that the Windows branch of the mock-up server has not been run on Windows.

## 3. Against the record

Nothing found. Searched: the README, `docs/design/`, `docs/decisions/`, `plugin-dev/` (the three designs), the plans for 0.3.2, 0.4.0 and 0.4.1, `docs/log.md`, and the tests of `start`. What the record fixes, and this spec keeps:

- "Every script of the harness and every test is TypeScript, run with Bun (`bun <file>.ts`, `bun test`). Add no new `.sh` or `.mjs` file." (README): behaviour 41, and the user's word of 2026-11-21.
- "The tests leave nothing behind on the machine: they … make temp folders they remove, and open short-lived local listeners." (README): the tests of this server end every server they start and remove every folder.
- "nothing else the plugin ships names the upstream project" but the licence file, which the licence requires (`docs/plans/2026-11-19-build-playbook-tdd.md`): behaviour 42.
- The state folder stays outside the work tree; `phases` keeps its format (the 0.4.1 plan, "Global Constraints"): behaviour 44 adds one name to the folders `start` leaves in place.

## 4. Open points

Settled in the grill of 2026-11-21: the user agreed to points 1, 2, 3, 4, 8 and 11 as proposed ("Đồng ý" to each). With point 8: parts A and B are built on one branch and go to `main` together, as 0.4.2, on the user's word.

Also settled there:

- The builder may use Bun's own web server and WebSocket in place of the original's hand-written protocol code, as long as every behaviour here holds (the user: "được").
- Behaviours 35 to 37 are checked as the original checks them (the waiting times by a test, the page by a test on a stand-in page), and once in a real Chrome by the agent that tries the product in each build; the record marks them as checked in part (the user: "đồng ý").
- Point 6, Windows: agreed, and said in three places: the README (behaviour 47), this run's records, and the closing comment on feedback issue 6, posted on the user's word.
- A server is opened to the network only after the user was asked (behaviours 45 and 46; the user: "đồng ý hỏi người dùng trước").
- Mock-ups in the folder named with `--dir` are never deleted by the server or by `stop` (the user: "đồng ý").
- Feedback issue 4 stays open on GitHub, untouched, and is taken up again after 0.4.2 (the user: "đồng ý").
- No short form `--host tailscale`: `--host` with the tailnet address does it, and `reachable_at` says who can reach the server (the user: "có cần thiết không đã có q12?").
- The check of behaviour 45 is in the server alone, not a second time in `start` (the user: "vậy sao không chặn mỗi serve?").
- No HTTPS: on a local network the link is plain HTTP, and the refusal of behaviour 45 says so, so that the agent tells the user when it asks (the user agreed).

1. **The brand line.** The original shows the name of the plugin it comes from, a logo it loads from its author's website at every page, and a link to that repository. Proposed: `hstack v<version>` and nothing from the network (behaviours 39 and 40).
2. **The browser's script** is written in TypeScript, and the server sends it to the browser as JavaScript. Proposed as written (behaviour 41).
3. **`--dir <folder>` in place of the original's `--project-dir`.** The original puts sessions in a hidden folder inside the project; a change in the repository before a spec is approved is blocked by hstack's stop hook. Proposed: the caller names the folder, and part B's playbook names the state folder's `mockups` (behaviour 44).
4. **The names inside the server.** The original's `BRAINSTORM_…` variables, the cookie `brainstorm-key-<port>`, the page's `window.brainstorm`, the argument `--brainstorm-server-id`. None of them names the original's project. Proposed: kept as they are, so that part B can copy the guide for mock-ups with the fewest edits.
5. **The reason `stop` writes** is `stop`; the original writes the name of its shell script, which is no more.
6. **Windows.** The original runs in the foreground there and does not watch its owner's process. Proposed: carried over, and kept by a test of that decision alone; it is not run on Windows here.
7. **What this list does not name** (the 5 seconds `start` waits for the server, the 2 seconds `stop` waits before it forces the end, how the frame looks) is carried over as the original has it; the builder writes each such point in the decisions file.
8. **The version stays 0.4.1** until part B: the script is in the repository, and no skill uses it yet.
9. **Where the original came from** (its address, its commit, its version) is written in the decisions file beside this spec and in nothing the plugin ships, as the 2026-11-19 plan did for the test rules.
10. **The draft spec for feedback issue 4**, `docs/specs/2026-11-21-stash-check.md`, lies in the repository, not committed and not approved. As long as it does, the docs check fails (it is in no index), every checkpoint of this run would commit it, and `done` refuses while it is untracked. It must stay where it is while this spec waits. The user: "Drop", and in the grill: "Xoá mọi thứ liên quan tới #4 vì đó là phiên chạy không đúng ý". At the approval the file is deleted from the repository, and no copy is kept; the state folder of the run that wrote it is deleted too.
11. **This spec's header at the approval.** The docs' rules want an approved document to be `stable` with a person's approval noted (`verified`). Proposed: at the approval the header's `status` becomes `stable` and gets that note; no other line of the file changes.

## 5. Not in this spec

- Part B: the brainstorm and grill skills, the playbook's and the hooks' words, the guide for mock-ups (`visual-companion.md`) with this command's names, version 0.4.2.
- The original's own tests: the tests of this server are written from this spec.
- The guide's start notes for other coding tools: the guide is part B's, and so is the question whether they stay.
- A new look for the frame, HTTPS, more than one session folder served by one server.
- Feedback issue 4: not built here; only where its draft file goes (open point 10).
