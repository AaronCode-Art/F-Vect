import type { ApiRole } from "@/types/api"

export const navigation: { label: string; to: string; roles: ApiRole[]; icon: string }[] = [
  { label: "Resumen", to: "/", roles: ["ADMIN", "GERENCIA", "SUPERVISOR", "TECNICO", "EMPLEADO"], icon: "◫" },
  { label: "Incidencias", to: "/incidencias", roles: ["ADMIN", "GERENCIA", "SUPERVISOR", "TECNICO", "EMPLEADO"], icon: "▤" },
  { label: "Solicitudes", to: "/solicitudes", roles: ["ADMIN", "GERENCIA", "SUPERVISOR", "TECNICO"], icon: "◷" },
  { label: "Mensajes", to: "/mensajes", roles: ["ADMIN", "GERENCIA", "SUPERVISOR", "TECNICO", "EMPLEADO"], icon: "▱" },
  { label: "Historial", to: "/historial", roles: ["ADMIN", "GERENCIA", "SUPERVISOR", "TECNICO"], icon: "◷" },
  { label: "Activos", to: "/activos", roles: ["ADMIN", "GERENCIA"], icon: "⬡" },
  { label: "Ubicaciones", to: "/ubicaciones", roles: ["ADMIN", "GERENCIA"], icon: "⌖" },
  { label: "Inventario", to: "/inventario", roles: ["ADMIN", "GERENCIA", "TECNICO"], icon: "▣" },
  { label: "Usuarios", to: "/usuarios", roles: ["ADMIN", "GERENCIA", "SUPERVISOR"], icon: "♙" },
  { label: "Administración", to: "/administracion", roles: ["ADMIN", "GERENCIA", "SUPERVISOR"], icon: "⚙" },
  { label: "Equipo TI", to: "/equipo-ti", roles: ["ADMIN", "GERENCIA", "SUPERVISOR"], icon: "♧" },
  { label: "Reportes", to: "/reportes", roles: ["ADMIN", "GERENCIA", "SUPERVISOR"], icon: "▥" },
  { label: "Categorías", to: "/categorias", roles: ["ADMIN"], icon: "▧" },
  { label: "Especialidades", to: "/especialidades", roles: ["ADMIN"], icon: "✳" },
  { label: "Auditoría", to: "/auditoria", roles: ["ADMIN"], icon: "⌁" },
  { label: "Automatización", to: "/automatizacion", roles: ["ADMIN"], icon: "⚙" },
  { label: "Parámetros", to: "/parametros", roles: ["ADMIN"], icon: "☷" },
]
