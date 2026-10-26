import './mutant'
import { contextBridge, ipcRenderer } from 'electron'
import { ADD_NOTE, type ProbeApi } from '../shared/ipc'

const api: ProbeApi = {
  addNote: (req) => ipcRenderer.invoke(ADD_NOTE, req)
}
contextBridge.exposeInMainWorld('api', api)
