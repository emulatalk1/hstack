// Run a command in its own process group, killed after timeoutSec and again after it exits: whatever it left running
// (vitest workers, a Playwright webServer, an agent's background shell) must not outlive it.
// stdout: 'pipe' returns its text as out; otherwise it goes where opts.stdout says.
export async function runGroup(argv, { timeoutSec, ...opts }) {
  const p = Bun.spawn(argv, { stdin: 'ignore', ...opts, detached: true })
  const kill = () => { try { process.kill(-p.pid, 'SIGKILL') } catch {} }
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; kill() }, timeoutSec * 1000)
  const out = opts.stdout === 'pipe' ? new Response(p.stdout).text() : undefined // read while it runs: a full pipe would block it
  const code = await p.exited
  clearTimeout(timer)
  kill() // a leftover child holding the pipe open would also hold up out
  return { out: await out, code: timedOut ? 'timeout' : code }
}
