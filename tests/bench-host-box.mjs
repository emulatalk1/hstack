// The stand-in box, for tests only: the old host path, with enterBox's shape and its codes. Production has no host path.
// The agent runs in the export itself on the host, with the agent's env scrub and a time limit; the product is a bundle of its repo.
import { join } from 'node:path'
import { agentEnv } from '../bench/agent-replay.mjs'
import { gitWith } from '../bench/env.mjs'
import { claudeArgs } from '../bench/lib/agent.mjs'
import { runGroup } from '../bench/lib/proc.mjs'

const SAFE = ['-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false']
const BENCH = [...SAFE, '-c', 'user.name=bench', '-c', 'user.email=bench@localhost', '-c', 'commit.gpgsign=false']
const agentGit = (dir, ...args) => gitWith({ env: agentEnv(), timeout: 300_000 }, dir, ...args)

// HOSTBOX_TURN=killed|memory: the machine's failure on every turn but the probe; HOSTBOX_TURN=fallback (turns) or HOSTBOX_PROBE=fallback (the probe):
// the turn runs, and its stream holds the CLI's model_refusal_fallback notice; HOSTBOX_PRODUCT=killed|throw: the product step fails
export async function hostBox({ data, name, repoGit, cli, turnTimeoutSec, plugins = [] }) {
  const dir = join(repoGit, '..'), settings = join(data, 'results', name, 'settings.json')
  await agentGit(dir, ...BENCH, 'commit', '-q', '--no-verify', '--allow-empty', '-m', 'env')
  const envCommit = (await Bun.$`git -C ${dir} rev-parse HEAD`.quiet().text()).trim()
  return {
    envCommit,
    // a timed-out turn is { code: 'timeout' }, as the real box gives it
    turn: async (opts) => {
      const probe = opts.prompt === 'Reply OK.', mode = probe ? process.env.HOSTBOX_PROBE : process.env.HOSTBOX_TURN
      if (mode && mode !== 'fallback') return { out: '', code: mode }
      const r = await runGroup([cli, ...claudeArgs({ ...opts, pluginDirs: plugins.map((p) => p.dir), settings })], { cwd: dir, env: agentEnv(), stdout: 'pipe', stderr: 2, timeoutSec: turnTimeoutSec })
      const notice = { type: 'system', subtype: 'model_refusal_fallback', original_model: 'small-m', fallback_model: 'other-m', category: 'cyber', scope: 'session' }
      return mode ? { ...r, out: r.out + JSON.stringify(notice) + '\n' } : r
    },
    product: async (dest) => {
      if (process.env.HOSTBOX_PRODUCT === 'killed') return { code: 'killed' }
      if (process.env.HOSTBOX_PRODUCT === 'throw') throw new Error('git bundle in the box failed')
      await agentGit(dir, ...SAFE, 'add', '-A')
      await agentGit(dir, ...BENCH, 'commit', '-q', '--no-verify', '--allow-empty', '-m', name)
      await agentGit(dir, ...SAFE, 'bundle', 'create', dest, 'HEAD')
      return { code: 0 }
    },
    proxyCounts: async () => ({ allowed: 0, refused: 0, reasons: {} }), // no proxy on the host: nothing passed one
    leave: async () => {},
    box: { name: 'host', image: 'host', memoryGB: null, ips: [], routes: '' },
  }
}
