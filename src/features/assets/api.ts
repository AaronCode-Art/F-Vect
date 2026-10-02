import { apiGet, apiSend } from "@/lib/api/client"
import type { Asset, Component } from "@/types/api"

export const assetsApi = {
  list: () => apiGet<Asset[]>("/activos"),
  create: (body: {
    codigo: string
    nombre: string
    numeroSerie?: string
    estado: string
    usuarioAsignadoId?: string
    ubicacionId?: string
    fechaCompra?: string
    notas?: string
  }) => apiSend<Asset>("/activos", "POST", body),
  update: (id: string, body: Record<string, unknown>) =>
    apiSend<Asset>(`/activos/${id}`, "PUT", body),
  components: (id: string) =>
    apiGet<{ id: string; componenteId: string; componenteNombre: string; numeroSerie?: string }[]>(
      `/activos/${id}/componentes`,
    ),
  install: (id: string, componenteId: string, numeroSerie?: string) =>
    apiSend(`/activos/${id}/componentes`, "POST", { componenteId, numeroSerie }),
  inventory: () => apiGet<Component[]>("/componentes"),
}
