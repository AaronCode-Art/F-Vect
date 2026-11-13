import { readAccessToken } from "./client"
import { DATA_UPDATED_EVENT } from "./realtimeEvents"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api"
const UPDATES_DESTINATION = "/topic/updates"
const RECONNECT_MAX_MS = 30_000

type SocketFrame = {
  type?: string
  destination?: string
  message?: string
}

function webSocketUrl() {
  const url = new URL(API_BASE_URL)
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
  url.pathname = "/ws"
  url.search = ""
  return url.toString()
}

export function connectRealtimeUpdates() {
  let socket: WebSocket | null = null
  let reconnectTimer: number | undefined
  let reconnectDelay = 1_000
  let stopped = false

  function connect() {
    if (stopped) return
    const token = readAccessToken()
    if (!token) return

    socket = new WebSocket(webSocketUrl())
    socket.addEventListener("open", () => {
      socket?.send(JSON.stringify({ type: "AUTHENTICATE", token }))
    })
    socket.addEventListener("message", (event) => {
      let frame: SocketFrame
      try {
        frame = JSON.parse(String(event.data)) as SocketFrame
      } catch {
        console.warn("El servidor envió un evento WebSocket inválido.")
        return
      }

      if (frame.type === "AUTHENTICATED") {
        socket?.send(JSON.stringify({ type: "SUBSCRIBE", destination: UPDATES_DESTINATION }))
      } else if (frame.type === "SUBSCRIBED" && frame.destination === UPDATES_DESTINATION) {
        reconnectDelay = 1_000
        window.dispatchEvent(new Event(DATA_UPDATED_EVENT))
      } else if (frame.type === "MESSAGE" && frame.destination === UPDATES_DESTINATION) {
        window.dispatchEvent(new Event(DATA_UPDATED_EVENT))
      } else if (frame.type === "ERROR") {
        console.warn("No se pudo sincronizar en tiempo real:", frame.message || "error WebSocket")
      }
    })
    socket.addEventListener("error", () => socket?.close())
    socket.addEventListener("close", () => {
      socket = null
      if (stopped || !readAccessToken()) return
      reconnectTimer = window.setTimeout(connect, reconnectDelay)
      reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS)
    })
  }

  const syncWhenVisible = () => {
    if (document.visibilityState === "visible") {
      window.dispatchEvent(new Event(DATA_UPDATED_EVENT))
    }
  }
  window.addEventListener("focus", syncWhenVisible)
  document.addEventListener("visibilitychange", syncWhenVisible)
  connect()

  return () => {
    stopped = true
    window.removeEventListener("focus", syncWhenVisible)
    document.removeEventListener("visibilitychange", syncWhenVisible)
    if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer)
    socket?.close()
  }
}
