// The one IPC channel. Main, preload and renderer all type against this.
export const ADD_NOTE = 'notes:add'
export type AddNoteReq = { text: string }
export type AddNoteRes = { id: number; count: number }
export interface ProbeApi {
  addNote(req: AddNoteReq): Promise<AddNoteRes>
}
