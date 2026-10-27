// The bench test files share /tmp/hstack-bench: a file that finds it absent removes it after its tests once it is empty.
import { existsSync, rmdirSync } from 'node:fs'
export const ROOT = '/tmp/hstack-bench'
export const releaseRoot = () => {
  const had = existsSync(ROOT)
  return () => { if (!had) try { rmdirSync(ROOT) } catch {} } // rmdir refuses a folder that is not empty
}
