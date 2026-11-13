import { useCallback, useEffect, useState } from "react"
import { ApiError } from "@/lib/api/client"
import { DATA_UPDATED_EVENT } from "@/lib/api/realtimeEvents"

function messageFor(error: unknown) {
  if (error instanceof ApiError) {
    return error.details?.length ? `${error.message}: ${error.details.join(", ")}` : error.message
  }
  return error instanceof Error ? error.message : "Ocurrió un error inesperado."
}

export function useAsync<T>(loader: () => Promise<T>, deps: readonly unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await loader())
    } catch (caught) {
      setError(messageFor(caught))
    } finally {
      setLoading(false)
    }
  }, deps)
  useEffect(() => {
    void reload()
    window.addEventListener(DATA_UPDATED_EVENT, reload)
    return () => window.removeEventListener(DATA_UPDATED_EVENT, reload)
  }, [reload])
  return { data, setData, loading, error, reload }
}

export function errorMessage(error: unknown) {
  return messageFor(error)
}
