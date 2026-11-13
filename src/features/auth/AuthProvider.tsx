import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { AuthFlowResponse, AuthResponse, AuthUser } from "@/types/api"
import { clearTokens, readAccessToken } from "@/lib/api/client"
import { login as loginRequest, logout as logoutRequest, verifyMfa as verifyMfaRequest } from "./authApi"

interface AuthContextValue {
  user: AuthUser | null
  ready: boolean
  login: (email: string, password: string) => Promise<AuthFlowResponse>
  verifyMfa: (challengeToken: string, code: string) => Promise<void>
  logout: () => Promise<void>
  updateSession: (auth: AuthResponse) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function userFromToken(): AuthUser | null {
  const token = readAccessToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as {
      sub?: string
      jti?: string
      mfa_verified?: boolean
    }
    if (payload.mfa_verified !== true) {
      clearTokens()
      sessionStorage.removeItem("vect.user")
      return null
    }
    const storedUser = sessionStorage.getItem("vect.user")
    if (storedUser) return JSON.parse(storedUser) as AuthUser
    return payload.sub ? null : null
  } catch {
    clearTokens()
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(userFromToken)
  const [ready] = useState(true)

  const updateSession = useCallback((auth: AuthResponse) => {
    sessionStorage.setItem("vect.user", JSON.stringify(auth.usuario))
    setUser(auth.usuario)
  }, [])

  const login = useCallback((email: string, password: string) => loginRequest(email, password), [])

  const verifyMfa = useCallback(async (challengeToken: string, code: string) => {
    const auth = await verifyMfaRequest(challengeToken, code)
    sessionStorage.setItem("vect.user", JSON.stringify(auth.usuario))
    setUser(auth.usuario)
  }, [])

  const logout = useCallback(async () => {
    await logoutRequest()
    sessionStorage.removeItem("vect.user")
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, ready, login, verifyMfa, logout, updateSession }),
    [user, ready, login, verifyMfa, logout, updateSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth debe usarse dentro de AuthProvider")
  return value
}
