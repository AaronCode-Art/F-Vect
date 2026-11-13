import { apiRequest, clearTokens, persistTokens } from "@/lib/api/client"
import type { AuthFlowResponse } from "@/types/api"

export async function login(correo: string, password: string) {
  return apiRequest<AuthFlowResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo, password }),
  })
}

export async function verifyMfa(challengeToken: string, code: string) {
  const flow = await apiRequest<AuthFlowResponse>("/auth/mfa/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeToken, code }),
  })
  if (flow.status !== "AUTHENTICATED" || !flow.auth) {
    throw new Error("No se pudo completar la autenticación de dos factores.")
  }
  persistTokens(flow.auth)
  return flow.auth
}

export async function logout() {
  clearTokens()
}
