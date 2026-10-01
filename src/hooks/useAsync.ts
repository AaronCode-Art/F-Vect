import { useCallback, useEffect, useState } from "react"
import { ApiError } from "@/lib/api/client"

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
  // The caller owns the loader dependencies and passes them explicitly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => {
    void reload()
  }, [reload])
  return { data, setData, loading, error, reload }
}

export function errorMessage(error: unknown) {
  return messageFor(error)
}
