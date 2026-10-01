export function formatDate(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(date)
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
