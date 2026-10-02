import { apiRequest, clearTokens, persistTokens } from "@/lib/api/client"
import type { AuthResponse } from "@/types/api"

export async function login(correo: string, password: string) {
  const auth = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo, password }),
  })
  persistTokens(auth)
  return auth
}

export async function logout() {
  clearTokens()
}
