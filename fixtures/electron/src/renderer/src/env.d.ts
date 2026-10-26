import type { ProbeApi } from '../../shared/ipc'
declare global {
  interface Window {
    api: ProbeApi
  }
}
