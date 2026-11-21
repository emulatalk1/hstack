// The script of a mock-up page. The server sends it to the browser as JavaScript, inside every page it serves.
// It sends the user's clicks on choices to the server and loads the page again when the agent pushes a screen.
(function () {
  type Message = Record<string, unknown>
  const page = window as unknown as { selectedChoice: string | null; toggleSelect: (el: HTMLElement) => void; brainstorm: { send: (event: Message) => void; choice: (value: unknown, metadata?: Message) => void } }
  let ws: WebSocket | null = null
  let queue: Message[] = [] // what was clicked while the server was away
  const MIN_RECONNECT_MS = 500, MAX_RECONNECT_MS = 30000
  let reconnectDelay = MIN_RECONNECT_MS
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let everConnected = false
  const TOMBSTONE_AFTER_MS = 15000 // this long without the server, and the page says so over the screen
  let disconnectedSince: number | null = null
  let tombstoneShown = false

  function sessionKey(): string | null {
    try { return window.sessionStorage && window.sessionStorage.getItem('brainstorm-session-key') } catch { return null }
  }
  function websocketUrl(): string {
    const key = sessionKey()
    return 'ws://' + window.location.host + (key ? '/?key=' + encodeURIComponent(key) : '')
  }
  // the frame shows the state of the connection; a whole-page screen has no place for it
  function setStatus(state: 'connecting' | 'connected' | 'reconnecting' | 'disconnected'): void {
    const el = document.querySelector<HTMLElement>('.status')
    if (!el) return
    const map = { connecting: ['Connecting…', 'var(--text-tertiary)'], connected: ['Connected', 'var(--success)'], reconnecting: ['Reconnecting…', 'var(--warning)'], disconnected: ['Disconnected', 'var(--error)'] }
    el.textContent = map[state][0]
    el.style.setProperty('--status-color', map[state][1])
  }
  // it carries its own style, so it shows on a whole-page screen too
  function showTombstone(): void {
    if (tombstoneShown) return
    tombstoneShown = true
    const el = document.createElement('div')
    el.id = 'bs-tombstone'
    el.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:2rem;text-align:center;background:rgba(20,20,22,0.92);color:#f5f5f7;font-family:system-ui,sans-serif'
    el.innerHTML = '<div style="max-width:480px"><h2 style="margin:0 0 .5rem;font-weight:600">Companion paused</h2><p style="margin:0;opacity:.85">This brainstorm companion has stopped. Ask your coding agent to bring it back — this page reconnects automatically.</p></div>'
    if (document.body) document.body.appendChild(el)
  }
  // back after the pause: the page is loaded again, through the address with the key where the tab still has it, so
  // that the cookie is set anew
  function reloadAfterRecovery(): void {
    const key = sessionKey()
    if (key) window.location.replace('/?key=' + encodeURIComponent(key))
    else window.location.reload()
  }
  function connect(): void {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    setStatus(everConnected ? 'reconnecting' : 'connecting')
    const socket = new WebSocket(websocketUrl())
    ws = socket
    socket.onopen = () => {
      const recovered = tombstoneShown
      everConnected = true
      disconnectedSince = null
      reconnectDelay = MIN_RECONNECT_MS
      tombstoneShown = false
      setStatus('connected')
      for (const event of queue) socket.send(JSON.stringify(event))
      queue = []
      if (recovered) reloadAfterRecovery()
    }
    socket.onmessage = (msg) => {
      let data: { type?: string }
      try { data = JSON.parse(String(msg.data)) } catch { return }
      if (data && data.type === 'reload') window.location.reload()
    }
    socket.onclose = () => {
      ws = null
      if (disconnectedSince === null) disconnectedSince = Date.now()
      if (Date.now() - disconnectedSince >= TOMBSTONE_AFTER_MS) { setStatus('disconnected'); showTombstone() } else setStatus('reconnecting')
      reconnectTimer = setTimeout(connect, reconnectDelay)
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_MS)
    }
    socket.onerror = () => { try { socket.close() } catch { /* closed already */ } } // onclose plans the next try, once
  }
  function send(event: Message): void {
    event.timestamp = Date.now()
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event))
    else queue.push(event)
  }

  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-choice]')
    if (!target) return
    send({ type: 'click', text: (target.textContent ?? '').trim(), choice: target.dataset.choice, id: target.id || null })
  })

  page.selectedChoice = null
  page.toggleSelect = function (el) {
    const container = el.closest<HTMLElement>('.options') || el.closest<HTMLElement>('.cards')
    const multi = Boolean(container) && container!.dataset.multiselect !== undefined
    if (container && !multi) container.querySelectorAll('.option, .card').forEach((o) => o.classList.remove('selected'))
    if (multi) el.classList.toggle('selected')
    else el.classList.add('selected')
    page.selectedChoice = el.dataset.choice ?? null
  }
  page.brainstorm = { send, choice: (value, metadata = {}) => send({ type: 'choice', value, ...metadata }) }

  connect()
})()
