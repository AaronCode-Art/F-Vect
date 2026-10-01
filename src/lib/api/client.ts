import type { ApiErrorBody, AuthResponse } from "@/types/api"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api"
const ACCESS_KEY = "vect.accessToken"
const REFRESH_KEY = "vect.refreshToken"
let refreshInFlight: Promise<AuthResponse | null> | null = null

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly details?: string[]

  constructor(status: number, body: ApiErrorBody) {
    super(body.message || `La solicitud falló (${status})`)
    this.name = "ApiError"
    this.status = status
    this.code = body.code
    this.details = body.detalles
  }
}

export function readAccessToken() {
  return sessionStorage.getItem(ACCESS_KEY)
}

export function persistTokens(auth: Pick<AuthResponse, "accessToken" | "refreshToken">) {
  sessionStorage.setItem(ACCESS_KEY, auth.accessToken)
  sessionStorage.setItem(REFRESH_KEY, auth.refreshToken)
}

export function clearTokens() {
  sessionStorage.removeItem(ACCESS_KEY)
  sessionStorage.removeItem(REFRESH_KEY)
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let body: ApiErrorBody = {}
    try {
      body = (await response.json()) as ApiErrorBody
    } catch {
      body = { message: response.statusText }
    }
    throw new ApiError(response.status, body)
  }
  if (response.status === 204) return undefined as T
  if (response.headers.get("content-type")?.includes("application/json")) {
    return (await response.json()) as T
  }
  return (await response.blob()) as T
}

async function refreshAccessToken(): Promise<AuthResponse | null> {
  const refreshToken = sessionStorage.getItem(REFRESH_KEY)
  if (!refreshToken) return null
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) {
          clearTokens()
          return null
        }
        const auth = (await response.json()) as AuthResponse
        persistTokens(auth)
        return auth
      })
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(init.headers)
  const token = readAccessToken()
  if (token) headers.set("Authorization", `Bearer ${token}`)
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  let response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      headers.set("Authorization", `Bearer ${refreshed.accessToken}`)
      response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
    }
  }
  return parseResponse<T>(response)
}

export function apiGet<T>(path: string) {
  return apiRequest<T>(path)
}

export function apiSend<T>(path: string, method: "POST" | "PUT" | "DELETE", body?: unknown) {
  return apiRequest<T>(path, {
    method,
    ...(body === undefined
      ? {}
      : { body: body instanceof FormData ? body : JSON.stringify(body) }),
  })
}

export function apiDownload(path: string) {
  return apiRequest<Blob>(path, { headers: { Accept: "*/*" } })
}
