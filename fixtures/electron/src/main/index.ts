import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { openDb, addNote } from './db'
import { ADD_NOTE, type AddNoteReq, type AddNoteRes } from '../shared/ipc'

// PROBE_DATA_DIR is the one folder an agent may wipe.
const dataDir = process.env.PROBE_DATA_DIR ?? join(app.getPath('userData'), 'data')

app.whenReady().then(() => {
  const db = openDb(dataDir)
  ipcMain.handle(ADD_NOTE, (_e, req: AddNoteReq): AddNoteRes => addNote(db, req.text))

  const win = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: { preload: join(import.meta.dirname, '../preload/index.cjs') }
  })
  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else win.loadFile(join(import.meta.dirname, '../renderer/index.html'))
})

app.on('window-all-closed', () => app.quit())
