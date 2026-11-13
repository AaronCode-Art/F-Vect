import { lazy, Suspense, useState } from "react"
import { Link } from "react-router-dom"
import { BarList, EmptyNotice, ErrorNotice, LoadingNotice, PageHeader, Panel, PriorityLabel, Select, Stat, StatGroup, StatusPill, Table, Tbody, Td, Th, Thead } from "@/components/ui"
import { buttonClass } from "@/components/styles"
import { Icon } from "@/components/icons"
import { useAuth } from "@/features/auth/AuthProvider"
import { adminApi } from "@/features/admin/api"
import { incidentsApi } from "@/features/incidents/api"
import { useAsync } from "@/hooks/useAsync"
import { humanize } from "@/utils/format"
import type { Report } from "@/types/api"

const IncidentFlowChart = lazy(() => import("./IncidentFlowChart"))

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return "—"
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000))
  if (minutes < 1) return "Ahora"
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `Hace ${days} d`
}

function displayDate() {
  const formatted = new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date())
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

const statusOptions = ["REGISTRADA", "ASIGNADA", "EN_ATENCION", "EN_ESPERA_USUARIO", "EN_ESPERA_REPUESTO", "RESUELTA", "CERRADA"]

function RecentIncidents() {
  const [statusFilter, setStatusFilter] = useState("TODOS")
  const incidents = useAsync(() => incidentsApi.recent(5, statusFilter), [statusFilter])
  const recent = incidents.data || []

  return (
    <Panel
      title="Incidencias recientes"
      description="Las 5 más nuevas según el estado elegido."
      className="mt-6 overflow-hidden"
      action={
        <div className="flex flex-wrap items-center gap-3">
          <Select aria-label="Filtrar por estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="TODOS">Todos los estados</option>
            {statusOptions.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
          </Select>
          <Link to="/incidencias" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
            Ver todas <Icon name="chevronRight" className="size-4" />
          </Link>
        </div>
      }
    >
      {incidents.loading ? <LoadingNotice /> : incidents.error ? (
        <div className="p-5"><ErrorNotice message={incidents.error} onRetry={() => void incidents.reload()} /></div>
      ) : recent.length === 0 ? <EmptyNotice>No hay incidencias con este estado.</EmptyNotice> : (
        <Table minWidth={760}>
          <Thead>
            <Th>Incidencia</Th>
            <Th>Solicitante</Th>
            <Th>Técnico</Th>
            <Th>Estado</Th>
            <Th>Prioridad</Th>
            <Th>Creada</Th>
          </Thead>
          <Tbody>
            {recent.map((incident) => (
              <tr key={incident.id} className="hover:bg-slate-50">
                <Td>
                  <Link to={`/incidencias?seleccion=${incident.id}`} className="block min-w-56">
                    <span className="block font-semibold text-slate-900 hover:text-brand-800">{incident.titulo}</span>
                    <span className="mt-0.5 block text-xs text-slate-600">{incident.codigo}</span>
                  </Link>
                </Td>
                <Td>{incident.reportanteNombre}</Td>
                <Td>{incident.tecnicoNombre || <span className="text-slate-600">Sin asignar</span>}</Td>
                <Td><StatusPill value={incident.estado} /></Td>
                <Td><PriorityLabel value={incident.prioridad} /></Td>
                <Td className="whitespace-nowrap text-slate-600">{relativeTime(incident.creadoEn)}</Td>
              </tr>
            ))}
          </Tbody>
        </Table>
      )}
    </Panel>
  )
}

function IncidentFlow({ report, loading, days, onPeriodChange }: {
  report: Report | null
  loading: boolean
  days: number
  onPeriodChange: (days: number) => void
}) {
  const series = report?.serieDiaria ?? []
  const data = series.map((item) => ({
    fecha: new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short" }).format(new Date(`${item.fecha}T00:00:00`)),
    Creadas: item.creadas,
    Resueltas: item.resueltas,
  }))

  return (
    <Panel
      title="Flujo de incidencias"
      description={`Creadas y resueltas por día · últimos ${days} días`}
      action={
        <Select aria-label="Período del flujo de incidencias" value={days} onChange={(event) => onPeriodChange(Number(event.target.value))}>
          <option value={7}>Últimos 7 días</option>
          <option value={30}>Últimos 30 días</option>
        </Select>
      }
    >
      {loading ? <LoadingNotice /> : !data.length ? <EmptyNotice>No hay actividad en este período.</EmptyNotice> : (
        <div className="h-[260px] px-2 pb-3 pt-5" role="img" aria-label={`Incidencias creadas y resueltas por día durante los últimos ${days} días`}>
          <Suspense fallback={<LoadingNotice label="Cargando gráfico…" />}>
            <IncidentFlowChart data={data} />
          </Suspense>
        </div>
      )}
    </Panel>
  )
}

function CategoryBreakdown({ values, loading }: { values: Record<string, number>; loading: boolean }) {
  const categories = Object.entries(values).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const total = Object.values(values).reduce((sum, count) => sum + count, 0)
  return (
    <Panel title="Incidencias por categoría" description={total ? `${total} incidencias en el período` : "Del período seleccionado"}>
      {loading ? <LoadingNotice /> : <BarList items={categories} emptyText="No hay incidencias con categoría en este período." />}
    </Panel>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const summary = useAsync(adminApi.dashboard, [])
  const [period, setPeriod] = useState(7)
  const activity = useAsync(() => adminApi.dashboardActivity(period), [period])
  const categoryValues = activity.data?.porCategoria || {}
  const hour = new Date().getHours()
  const salutation = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches"

  return (
    <>
      <PageHeader
        title={`${salutation}, ${user?.nombres || "equipo"}`}
        description={`${displayDate()} · Estado general del soporte técnico.`}
        action={user?.rol !== "TECNICO" ? (
          <Link to="/incidencias?crear=1" className={buttonClass("primary")}><Icon name="plus" className="size-4" /> Nueva incidencia</Link>
        ) : undefined}
      />
      {summary.error && <div className="mb-4"><ErrorNotice message={summary.error} onRetry={() => void summary.reload()} /></div>}
      {summary.loading && <Panel><LoadingNotice /></Panel>}
      {summary.data && (
        <>
          <StatGroup columns="lg:grid-cols-5">
            <Stat label="Incidencias abiertas" value={summary.data.abiertas} caption="Registradas o asignadas" />
            <Stat label="En proceso" value={summary.data.enProceso} caption="En atención o en espera" />
            <Stat label="Solicitudes pendientes" value={summary.data.solicitudesPendientes} caption="Esperan evaluación o aprobación" />
            <Stat label="Componentes bajo stock" value={summary.data.componentesBajoStock} caption="En el mínimo o por debajo" />
            <Stat label="Técnicos disponibles" value={summary.data.tecnicosDisponibles} caption="Listos para recibir asignaciones" />
          </StatGroup>
          {activity.error && <div className="mt-6"><ErrorNotice message={activity.error} onRetry={() => void activity.reload()} /></div>}
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <IncidentFlow report={activity.data} loading={activity.loading} days={period} onPeriodChange={setPeriod} />
            <CategoryBreakdown values={categoryValues} loading={activity.loading} />
          </div>
          <RecentIncidents />
        </>
      )}
    </>
  )
}
