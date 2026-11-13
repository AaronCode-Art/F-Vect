export function formatDate(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(date)
}

/** Fecha sin hora: "9 nov 2026". Acepta "2026-11-09" sin desplazarla por zona horaria. */
export function formatDay(value?: string | null) {
  if (!value) return "—"
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value)
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric" }).format(date)
}

export function formatRole(role: string) {
  const names: Record<string, string> = {
    ADMIN: "Administrador",
    GERENCIA: "Gerente",
    SUPERVISOR: "Supervisor TI",
    TECNICO: "Técnico",
    EMPLEADO: "Empleado",
  }
  return names[role] || role
}

const labels: Record<string, string> = {
  REGISTRADA: "Registrada",
  ASIGNADA: "Asignada",
  EN_ATENCION: "En atención",
  EN_ESPERA_USUARIO: "En espera · usuario",
  EN_ESPERA_REPUESTO: "En espera · repuesto",
  RESUELTA: "Resuelta",
  CERRADA: "Cerrada",
  PENDIENTE_EVALUACION: "Pendiente de evaluación",
  PENDIENTE_GERENCIA: "Pendiente de gerencia",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  EJECUTADA: "Ejecutada",
  OPERATIVO: "Operativo",
  EN_MANTENIMIENTO: "En mantenimiento",
  BAJA: "Baja",
  BAJO: "Bajo",
  MEDIO: "Medio",
  ALTO: "Alto",
  CRITICO: "Crítico",
  CRITICA: "Crítica",
  MEDIA: "Media",
  ALTA: "Alta",
}

/** Convierte un código de la API (EN_ATENCION) en texto legible (En atención). */
export function humanize(value: string) {
  if (labels[value]) return labels[value]
  const text = value.replaceAll("_", " ").toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function formatMoney(value: number | string) {
  return `S/ ${Number(value).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
