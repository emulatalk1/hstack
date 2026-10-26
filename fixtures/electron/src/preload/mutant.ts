import { contextBridge } from 'electron'

// Mutation testing only. Stryker reads the active mutant from globalThis.process.env,
// which the sandboxed preload and the renderer do not have; set its namespace in both worlds.
// Imported first so it runs before any instrumented module.
const id = process.env.__STRYKER_ACTIVE_MUTANT__
if (id) {
  Object.assign(globalThis, { __stryker__: { activeMutant: id } })
  contextBridge.executeInMainWorld({
    func: (id: string) => Object.assign(globalThis, { __stryker__: { activeMutant: id } }),
    args: [id]
  })
}
