import { apiGet, apiSend } from "@/lib/api/client"
import type { ApiUser, Specialty } from "@/types/api"

export const usersApi = {
  list: () => apiGet<ApiUser[]>("/usuarios"),
  create: (body: {
    nombres: string
    apellidos: string
    correo: string
    telefono?: string
    rol: string
    activo: boolean
    contrasena?: string
  }) => apiSend<ApiUser>("/usuarios", "POST", body),
  update: (id: string, body: Record<string, unknown>) =>
    apiSend<ApiUser>(`/usuarios/${id}`, "PUT", body),
  deactivate: (id: string) => apiSend<void>(`/usuarios/${id}`, "DELETE"),
  specialties: () => apiGet<Specialty[]>("/especialidades"),
  assignSpecialty: (userId: string, specialtyId: string) =>
    apiSend(`/usuarios/${userId}/especialidades`, "POST", { especialidadId: specialtyId }),
  removeSpecialty: (userId: string, specialtyId: string) =>
    apiSend(`/usuarios/${userId}/especialidades/${specialtyId}`, "DELETE"),
}
