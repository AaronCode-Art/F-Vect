export type ApiRole = "ADMIN" | "GERENCIA" | "SUPERVISOR" | "TECNICO" | "EMPLEADO"
export type IncidentStatus =
  | "REGISTRADA"
  | "ASIGNADA"
  | "EN_ATENCION"
  | "EN_ESPERA_USUARIO"
  | "EN_ESPERA_REPUESTO"
  | "RESUELTA"
  | "CERRADA"

export interface ApiUser {
  id: string
  nombres: string
  apellidos: string
  correo: string
  telefono?: string | null
  rol: ApiRole
  activo: boolean
  debeCambiarContrasena?: boolean
  ultimoAccesoEn?: string | null
}

export interface AuthUser {
  id: string
  nombres: string
  apellidos: string
  correo: string
  rol: ApiRole
  rolNombre?: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  usuario: AuthUser
}

export interface Incident {
  id: string
  codigo: string
  titulo: string
  descripcion: string
  categoriaNombre: string
  ubicacionNombre?: string | null
  canal: string
  impacto: string
  urgencia: string
  prioridad: string
  estado: IncidentStatus
  reportanteId: string
  reportanteNombre: string
  tecnicoAsignadoId?: string | null
  tecnicoNombre?: string | null
  creadoEn: string
  resueltoEn?: string | null
  cerradoEn?: string | null
}

export interface Category {
  id: string
  nombre: string
  descripcion?: string | null
  activo: boolean
}

export interface Location {
  id: string
  nombre: string
  direccion?: string | null
  activo: boolean
}

export interface Technician extends ApiUser {}

export interface Activity {
  id: string
  incidenciaId: string
  tecnicoId: string
  tecnicoNombre: string
  tipoActividad: string
  descripcion: string
  minutos: number
  creadoEn: string
}

export interface IncidentMessage {
  id: string
  incidenciaId: string
  remitenteId: string
  remitenteNombre: string
  canal: string
  visibilidad: "PUBLICO" | "INTERNO"
  contenido: string
  creadoEn: string
}

export interface Evidence {
  id: string
  incidenciaId: string
  subidoPorId: string
  nombreArchivo: string
  url: string
  tipoMime: string
  tamanoBytes: number
  subidoPorNombre?: string
  creadoEn: string
}

export interface ChangeRequest {
  id: string
  codigo: string
  incidenciaId: string
  incidenciaCodigo: string
  tipo: string
  componenteNombre?: string | null
  activoCodigo?: string | null
  descripcion: string
  justificacion: string
  costoEstimado: number
  estado: string
  solicitadoPorNombre: string
  creadoEn: string
}

export interface Component {
  id: string
  codigo: string
  nombre: string
  tipoComponente: string
  descripcion?: string | null
  costoUnitario: number
  stockActual: number
  stockMinimo: number
  activo: boolean
  creadoEn: string
  actualizadoEn: string
}

export interface StockMovement {
  id: string
  componenteId: string
  componenteCodigo: string
  componenteNombre: string
  tipoMovimiento: "ENTRADA" | "SALIDA" | "AJUSTE"
  cantidad: number
  stockAnterior: number
  stockResultante: number
  tipoReferencia?: string | null
  referenciaId?: string | null
  motivo: string
  realizadoPorNombre: string
  creadoEn: string
}

export interface Asset {
  id: string
  codigo: string
  nombre: string
  numeroSerie?: string | null
  estado: "OPERATIVO" | "EN_MANTENIMIENTO" | "BAJA" | string
  usuarioAsignadoId?: string | null
  usuarioAsignadoNombre?: string | null
  ubicacionId?: string | null
  ubicacionNombre?: string | null
  fechaCompra?: string | null
  notas?: string | null
}

export interface Specialty {
  id: string
  nombre: string
  descripcion?: string | null
  activo: boolean
}

export interface Conversation {
  id: string
  tipo: "PRIVADA" | "GRUPAL" | string
  nombre?: string | null
  creadoPorId: string
  participantes: { id: string; nombre: string; correo: string }[]
  creadoEn: string
  actualizadoEn: string
}

export interface ConversationParticipant {
  id: string
  nombre: string
  correo: string
  rol: ApiRole
}

export interface ConversationMessage {
  id: string
  conversacionId: string
  remitenteId: string
  remitenteNombre: string
  cuerpo: string
  archivoUrl?: string | null
  archivoNombre?: string | null
  archivoTipoMime?: string | null
  archivoTamanoBytes?: number | null
  creadoEn: string
  editadoEn?: string | null
}

export interface DashboardSummary {
  totalIncidencias: number
  abiertas: number
  enProceso: number
  resueltas: number
  cerradas: number
  slasVencidos: number
  tecnicosDisponibles: number
  solicitudesPendientes: number
  componentesBajoStock: number
  porMacroEstado: Record<string, number>
}

export interface Report {
  desde: string
  hasta: string
  total: number
  porEstado: Record<string, number>
  porCategoria: Record<string, number>
  porPrioridad: Record<string, number>
  serieDiaria: { fecha: string; creadas: number; resueltas: number }[]
}

export interface ApprovalHistory {
  id: string
  solicitudId: string
  solicitudCodigo: string
  estadoOrigen?: string | null
  estadoDestino: string
  realizadoPorNombre?: string | null
  comentario?: string | null
  creadoEn: string
}

export interface AuditRecord {
  id: string
  usuarioId?: string | null
  accion: string
  tipoEntidad: string
  entidadId?: string | null
  valoresAnteriores?: unknown
  valoresNuevos?: unknown
  direccionIp?: string | null
  agenteUsuario?: string | null
  creadoEn: string
}

export interface SystemParameter {
  clave: string
  valor: unknown
  descripcion?: string | null
  esPublico: boolean
  actualizadoEn?: string | null
}

export interface AutomationRule {
  id: string
  nombre: string
  descripcion?: string | null
  nombreEvento: string
  condiciones: unknown
  acciones: unknown
  prioridad: number
  activo: boolean
  creadoEn: string
  actualizadoEn: string
}

export interface ApiPage<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface ApiErrorBody {
  code?: string
  message?: string
  detalles?: string[]
}
