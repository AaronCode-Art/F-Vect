import { useEffect } from "react"

/** Ejecuta `onEscape` al pulsar Esc mientras `active` sea verdadero. */
export function useEscapeKey(onEscape: () => void, active = true) {
  useEffect(() => {
    if (!active) return
    function handle(event: KeyboardEvent) {
      if (event.key === "Escape") onEscape()
    }
    window.addEventListener("keydown", handle)
    return () => window.removeEventListener("keydown", handle)
  }, [onEscape, active])
}
