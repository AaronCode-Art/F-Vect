import { apiGet, apiSend } from "@/lib/api/client"
import type { ApprovalHistory, ChangeRequest } from "@/types/api"

export const requestsApi = {
  list: () => apiGet<ChangeRequest[]>("/solicitudes-cambio"),
  create: (body: {
    incidenciaId: string
    componenteId?: string
    activoId?: string
    descripcion: string
    justificacion: string
    costoEstimado: number
  }) => apiSend<ChangeRequest>("/solicitudes-cambio", "POST", body),
  evaluate: (id: string, aprobar: boolean, comentario?: string, motivoRechazo?: string) =>
    apiSend<ChangeRequest>(`/solicitudes-cambio/${id}/evaluar`, "POST", {
      aprobar,
      comentario,
      motivoRechazo,
    }),
  approveManagement: (id: string, comentario?: string) =>
    apiSend<ChangeRequest>(`/solicitudes-cambio/${id}/aprobar-gerencia`, "POST", { comentario }),
  rejectManagement: (id: string, motivoRechazo: string) =>
    apiSend<ChangeRequest>(`/solicitudes-cambio/${id}/rechazar-gerencia`, "POST", { motivoRechazo }),
  execute: (id: string) => apiSend<ChangeRequest>(`/solicitudes-cambio/${id}/ejecutar`, "POST"),
  history: (solicitudId?: string) =>
    apiGet<ApprovalHistory[]>(`/historial/aprobaciones${solicitudId ? `?solicitudId=${solicitudId}` : ""}`),
}
