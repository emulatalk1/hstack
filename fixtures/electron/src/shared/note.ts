export const MAX_NOTE = 200

export function normalizeNote(text: string): string {
  const t = text.trim()
  if (t.length === 0) throw new Error('empty note')
  return t.length > MAX_NOTE ? t.slice(0, MAX_NOTE) : t
}
