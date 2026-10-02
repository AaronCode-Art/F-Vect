import { apiGet, apiSend } from "@/lib/api/client"
import type { Component, StockMovement } from "@/types/api"

export const inventoryApi = {
  list: () => apiGet<Component[]>("/componentes"),
  create: (body: {
    codigo: string
    nombre: string
    tipoComponente: string
    descripcion?: string
    costoUnitario: number
    stockMinimo: number
    activo: boolean
  }) => apiSend<Component>("/componentes", "POST", body),
  update: (id: string, body: {
    codigo: string
    nombre: string
    tipoComponente: string
    descripcion?: string
    costoUnitario: number
    stockMinimo: number
    activo: boolean
  }) => apiSend<Component>(`/componentes/${id}`, "PUT", body),
  deactivate: (id: string) => apiSend<Component>(`/componentes/${id}`, "DELETE"),
  movements: () => apiGet<StockMovement[]>("/componentes/movimientos-stock"),
  moveStock: (id: string, body: {
    tipoMovimiento: "ENTRADA" | "SALIDA" | "AJUSTE"
    cantidad: number
    motivo: string
    tipoReferencia?: string
    referenciaId?: string
  }) => apiSend<StockMovement>(`/componentes/${id}/movimientos-stock`, "POST", body),
}
