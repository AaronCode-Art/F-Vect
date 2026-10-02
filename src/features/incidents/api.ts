import { apiGet, apiSend, apiRequest } from "@/lib/api/client"
import type {
  Activity,
  Category,
  Evidence,
  Incident,
  IncidentMessage,
  Location,
  Technician,
} from "@/types/api"

export const incidentsApi = {
  list: () => apiGet<Incident[]>("/incidencias"),
  get: (id: string) => apiGet<Incident>(`/incidencias/${id}`),
  create: (body: {
    titulo: string
    descripcion: string
    categoriaId: string
    ubicacionId?: string
    canal: "PORTAL_WEB" | "CORREO" | "TELEFONO" | "PRESENCIAL"
    impacto: "BAJO" | "MEDIO" | "ALTO" | "CRITICO"
    urgencia: "BAJO" | "MEDIO" | "ALTO" | "CRITICO"
  }) => apiSend<Incident>("/incidencias", "POST", body),
  changeStatus: (id: string, estadoCodigo: string, motivo: string) =>
    apiSend<Incident>(`/incidencias/${id}/estado`, "POST", { estadoCodigo, motivo }),
  assign: (id: string, tecnicoId: string) =>
    apiSend<Incident>(`/incidencias/${id}/asignar`, "POST", { tecnicoId }),
  history: (id: string) => apiGet<Record<string, unknown>[]>(`/incidencias/${id}/historial`),
  activities: (id: string) => apiGet<Activity[]>(`/incidencias/${id}/actividades`),
  addActivity: (id: string, body: { tipo: string; descripcion: string; minutos: number }) =>
    apiSend<Activity>(`/incidencias/${id}/actividades`, "POST", body),
  messages: (id: string) =>
    apiGet<IncidentMessage[]>(`/incidencias/${id}/chat?canal=EMPLEADO_TECNICO`),
  sendMessage: (
    id: string,
    body: { contenido: string },
  ) => apiSend<IncidentMessage>(`/incidencias/${id}/chat`, "POST", {
    ...body,
    canal: "EMPLEADO_TECNICO",
    visibilidad: "PUBLICO",
  }),
  evidence: (id: string) => apiGet<Evidence[]>(`/incidencias/${id}/evidencias`),
  uploadEvidence: (id: string, file: File) => {
    const form = new FormData()
    form.append("archivo", file)
    return apiRequest<Evidence>(`/incidencias/${id}/evidencias`, { method: "POST", body: form })
  },
  allEvidence: () => apiGet<Evidence[]>("/evidencias"),
  categories: () => apiGet<Category[]>("/categorias"),
  locations: () => apiGet<Location[]>("/ubicaciones"),
  technicians: () => apiGet<Technician[]>("/usuarios/tecnicos/disponibles"),
}
