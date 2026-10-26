import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { normalizeNote } from '../shared/note'
import type { AddNoteRes } from '../shared/ipc'

export function openDb(dir: string): DatabaseSync {
  mkdirSync(dir, { recursive: true })
  const db = new DatabaseSync(join(dir, 'probe.db'))
  db.exec('CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, text TEXT NOT NULL)')
  return db
}

export function addNote(db: DatabaseSync, text: string): AddNoteRes {
  const r = db.prepare('INSERT INTO notes (text) VALUES (?)').run(normalizeNote(text))
  const row = db.prepare('SELECT COUNT(*) AS count FROM notes').get() as { count: number }
  return { id: Number(r.lastInsertRowid), count: row.count }
}
