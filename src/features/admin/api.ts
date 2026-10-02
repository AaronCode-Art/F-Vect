import { apiDownload, apiGet, apiSend } from "@/lib/api/client"
import type {
  ApiPage,
  AuditRecord,
  AutomationRule,
  Category,
  Location,
  Report,
  Specialty,
  SystemParameter,
} from "@/types/api"

export const adminApi = {
  dashboard: () => apiGet<import("@/types/api").DashboardSummary>("/dashboard/resumen"),
  report: (days = 30) => apiGet<Report>(`/reportes/operativo?dias=${days}`),
  reportExcel: (days = 30) => apiDownload(`/reportes/excel/operativo?dias=${days}`),
  audit: (query = "") => apiGet<ApiPage<AuditRecord>>(`/auditoria${query ? `?${query}` : ""}`),
  auditExcel: () => apiDownload("/auditoria/excel"),
  categories: () => apiGet<Category[]>("/categorias"),
  createCategory: (body: { nombre: string; descripcion?: string; activo: boolean }) =>
    apiSend<Category>("/categorias", "POST", body),
  updateCategory: (id: string, body: { nombre: string; descripcion?: string; activo: boolean }) =>
    apiSend<Category>(`/categorias/${id}`, "PUT", body),
  deactivateCategory: (id: string) => apiSend<Category>(`/categorias/${id}`, "DELETE"),
  locations: () => apiGet<Location[]>("/ubicaciones"),
  managedLocations: () => apiGet<Location[]>("/ubicaciones/gestion"),
  createLocation: (body: { nombre: string; direccion?: string; activo: boolean }) =>
    apiSend<Location>("/ubicaciones", "POST", body),
  updateLocation: (id: string, body: { nombre: string; direccion?: string; activo: boolean }) =>
    apiSend<Location>(`/ubicaciones/${id}`, "PUT", body),
  deactivateLocation: (id: string) => apiSend<Location>(`/ubicaciones/${id}`, "DELETE"),
  specialties: () => apiGet<Specialty[]>("/especialidades"),
  createSpecialty: (body: { nombre: string; descripcion?: string; activo: boolean }) =>
    apiSend<Specialty>("/especialidades", "POST", body),
  parameters: () => apiGet<SystemParameter[]>("/parametros"),
  updateParameter: (key: string, valor: unknown) =>
    apiSend<SystemParameter>(`/parametros/${encodeURIComponent(key)}`, "PUT", { valor }),
  rules: () => apiGet<AutomationRule[]>("/reglas-automatizacion"),
  createRule: (body: Record<string, unknown>) =>
    apiSend<AutomationRule>("/reglas-automatizacion", "POST", body),
  updateRule: (id: string, body: Record<string, unknown>) =>
    apiSend<AutomationRule>(`/reglas-automatizacion/${id}`, "PUT", body),
  roles: () => apiGet<string[]>("/roles"),
  statuses: () => apiGet<string[]>("/estados-incidencia"),
}
