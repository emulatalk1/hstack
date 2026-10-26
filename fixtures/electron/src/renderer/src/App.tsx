import { useState } from 'react'

export function App() {
  const [status, setStatus] = useState('No note yet')
  async function add() {
    const res = await window.api.addNote({ text: 'hello' })
    setStatus(`Saved note ${res.id}, ${res.count} total`)
  }
  return (
    <main>
      <button onClick={add}>Add note</button>
      <p role="status">{status}</p>
    </main>
  )
}
