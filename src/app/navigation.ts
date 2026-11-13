import type { ApiRole } from "@/types/api"
import type { IconName } from "@/components/icons"

export type NavItem = {
  label: string
  to: string
  roles: ApiRole[]
  icon: IconName
  group: NavGroupId
  /** Una línea que explica para qué sirve el módulo (se muestra en Administración). */
  description: string
}

export type NavGroupId = "inicio" | "soporte" | "recursos" | "personas" | "configuracion"

export const navGroups: { id: NavGroupId; label: string }[] = [
  { id: "inicio", label: "" },
  { id: "soporte", label: "Soporte" },
  { id: "recursos", label: "Recursos" },
  { id: "personas", label: "Personas y reportes" },
  { id: "configuracion", label: "Configuración" },
]

const everyone: ApiRole[] = ["ADMIN", "GERENCIA", "SUPERVISOR", "TECNICO", "EMPLEADO"]

export const navigation: NavItem[] = [
  { label: "Resumen", to: "/", roles: everyone, icon: "home", group: "inicio", description: "Estado general del soporte técnico." },
  { label: "Incidencias", to: "/incidencias", roles: everyone, icon: "incidents", group: "soporte", description: "Registra, asigna y da seguimiento a cada incidencia." },
  { label: "Solicitudes", to: "/solicitudes", roles: ["ADMIN", "GERENCIA", "SUPERVISOR", "TECNICO"], icon: "requests", group: "soporte", description: "Solicitudes de cambio, evaluación y aprobación." },
  { label: "Mensajes", to: "/mensajes", roles: everyone, icon: "messages", group: "soporte", description: "Conversaciones directas y grupales." },
  { label: "Historial", to: "/historial", roles: ["ADMIN", "GERENCIA", "SUPERVISOR", "TECNICO"], icon: "history", group: "soporte", description: "Cambios de estado, aprobaciones, chats y evidencias." },
  { label: "Activos", to: "/activos", roles: ["ADMIN", "GERENCIA"], icon: "assets", group: "recursos", description: "Equipos, asignaciones y componentes instalados." },
  { label: "Inventario", to: "/inventario", roles: ["ADMIN", "GERENCIA", "TECNICO"], icon: "inventory", group: "recursos", description: "Existencias de componentes y sus movimientos." },
  { label: "Ubicaciones", to: "/ubicaciones", roles: ["ADMIN", "GERENCIA"], icon: "location", group: "recursos", description: "Sedes y áreas disponibles para incidencias y activos." },
  { label: "Usuarios", to: "/usuarios", roles: ["ADMIN", "GERENCIA", "SUPERVISOR"], icon: "users", group: "personas", description: "Directorio de usuarios y sus roles." },
  { label: "Equipo TI", to: "/equipo-ti", roles: ["ADMIN", "GERENCIA", "SUPERVISOR"], icon: "team", group: "personas", description: "Técnicos disponibles para asignar incidencias." },
  { label: "Reportes", to: "/reportes", roles: ["ADMIN", "GERENCIA", "SUPERVISOR"], icon: "reports", group: "personas", description: "Indicadores operativos y exportación a Excel." },
  { label: "Administración", to: "/administracion", roles: ["ADMIN", "GERENCIA", "SUPERVISOR"], icon: "admin", group: "configuracion", description: "Directorio de todos los módulos que puedes usar." },
  { label: "Categorías", to: "/categorias", roles: ["ADMIN"], icon: "tag", group: "configuracion", description: "Clasificación de las incidencias." },
  { label: "Especialidades", to: "/especialidades", roles: ["ADMIN"], icon: "skills", group: "configuracion", description: "Áreas de especialidad del equipo de soporte." },
  { label: "Parámetros", to: "/parametros", roles: ["ADMIN"], icon: "settings", group: "configuracion", description: "Valores de configuración del sistema." },
  { label: "Automatización", to: "/automatizacion", roles: ["ADMIN"], icon: "automation", group: "configuracion", description: "Reglas configuradas para eventos del sistema." },
  { label: "Auditoría", to: "/auditoria", roles: ["ADMIN"], icon: "audit", group: "configuracion", description: "Registro de acciones realizadas en el sistema." },
]
