import { describe, expect, it } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDb, addNote } from '../src/main/db'

describe('sqlite file', () => {
  it('writes a note that a fresh connection reads back', () => {
    const dir = mkdtempSync(join(tmpdir(), 'probe-'))
    const db = openDb(dir)
    expect(addNote(db, ' hello ')).toEqual({ id: 1, count: 1 })
    expect(addNote(db, 'again')).toEqual({ id: 2, count: 2 })
    db.close()
    const file = new DatabaseSync(join(dir, 'probe.db'), { readOnly: true })
    expect(file.prepare('SELECT text FROM notes ORDER BY id').all()).toEqual([{ text: 'hello' }, { text: 'again' }])
    file.close()
    console.log(`node ${process.versions.node} electron ${process.versions.electron ?? '-'} sqlite ${process.versions.sqlite}`)
  })
})
