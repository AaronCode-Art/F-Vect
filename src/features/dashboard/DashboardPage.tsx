import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Button, EmptyNotice, ErrorNotice, LoadingNotice, Panel, Select, StatusPill } from "@/components/ui"
import { useAuth } from "@/features/auth/AuthProvider"
import { adminApi } from "@/features/admin/api"
import { incidentsApi } from "@/features/incidents/api"
import { useAsync } from "@/hooks/useAsync"
import type { Incident, Report } from "@/types/api"

const categoryColors = ["#10b981", "#8b5cf6", "#38bdf8", "#f59e0b", "#f43f5e", "#64748b"]
const reportRoles = ["ADMIN", "GERENCIA", "SUPERVISOR"]

function initials(name?: string | null) {
  return name?.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "—"
}

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

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function localReport(incidents: Incident[], days: number): Pick<Report, "serieDiaria" | "porCategoria" | "total"> {
  const dates = Array.from({ length: days }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (days - index - 1))
    return dateKey(date)
  })
  const counts = new Map(dates.map((date) => [date, { creadas: 0, resueltas: 0 }]))
  const categories: Record<string, number> = {}
  let total = 0

  for (const incident of incidents) {
    const createdDate = dateKey(new Date(incident.creadoEn))
    const createdCount = counts.get(createdDate)
    if (createdCount) {
      createdCount.creadas += 1
      total += 1
      categories[incident.categoriaNombre] = (categories[incident.categoriaNombre] || 0) + 1
    }
    if (incident.resueltoEn) {
      const resolvedDate = dateKey(new Date(incident.resueltoEn))
      const resolvedCount = counts.get(resolvedDate)
      if (resolvedCount) resolvedCount.resueltas += 1
    }
  }

  return {
    total,
    porCategoria: categories,
    serieDiaria: dates.map((fecha) => ({ fecha, ...counts.get(fecha)! })),
  }
}

function displayDate() {
  const formatted = new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date())
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

function Greeting({ name }: { name: string }) {
  const hour = new Date().getHours()
  const salutation = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches"
  return (
    <div>
      <p className="text-xs font-bold capitalize text-emerald-700">{displayDate()}</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">{salutation}, {name}</h1>
      <p className="mt-1 text-sm text-slate-500">Aquí tienes el estado general de soporte técnico.</p>
    </div>
  )
}

function MetricCard({ label, value, caption, icon, color }: {
  label: string
  value: number
  caption: string
  icon: string
  color: string
}) {
  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        <span className={`grid size-10 place-items-center rounded-xl text-lg ${color}`} aria-hidden="true">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-xs font-semibold text-slate-500">{caption}</p>
    </Panel>
  )
}

function categoryReport(incidents: Incident[], report: Report | null, canViewReports: boolean, days: number) {
  if (report) return report.porCategoria
  return canViewReports ? {} : localReport(incidents, days).porCategoria
}

function RecentIncidents({ incidents }: { incidents: Incident[] }) {
  const [filterOpen, setFilterOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState("TODOS")
  const recent = useMemo(
    () => [...incidents]
      .filter((incident) => statusFilter === "TODOS" || incident.estado === statusFilter)
      .sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime())
      .slice(0, 5),
    [incidents, statusFilter],
  )

  return (
    <Panel
      title="Incidencias recientes"
      description="Supervisa y gestiona las solicitudes activas"
      className="mt-5 overflow-hidden"
      action={
        <div className="flex items-center gap-2">
          <Button tone="neutral" className="min-h-9 px-3" onClick={() => setFilterOpen((open) => !open)} aria-expanded={filterOpen}>
            <span aria-hidden="true">▽</span> Filtrar
          </Button>
          <Link to="/incidencias" className="px-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800">Ver todas</Link>
        </div>
      }
    >
      {filterOpen && (
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
          <div className="max-w-xs">
            <Select label="Estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="TODOS">Todos los estados</option>
              <option value="REGISTRADA">Registrada</option>
              <option value="ASIGNADA">Asignada</option>
              <option value="EN_ATENCION">En atención</option>
              <option value="EN_ESPERA_USUARIO">En espera · usuario</option>
              <option value="RESUELTA">Resuelta</option>
              <option value="CERRADA">Cerrada</option>
            </Select>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-5 py-3">Incidencia</th>
              <th className="px-4 py-3">Solicitante</th>
              <th className="px-4 py-3">Técnico</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Prioridad</th>
              <th className="px-4 py-3">Creada</th>
              <th className="px-3 py-3"><span className="sr-only">Abrir</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recent.map((incident) => (
              <tr key={incident.id} className="hover:bg-slate-50">
                <td className="px-5 py-3.5">
                  <Link to={`/incidencias?seleccion=${incident.id}`} className="block min-w-64">
                    <span className="block text-sm font-semibold text-slate-800">{incident.titulo}</span>
                    <span className="mt-1 block text-xs text-slate-400">{incident.codigo}</span>
                  </Link>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">{initials(incident.reportanteNombre)}</span>
                    <span className="text-xs font-semibold text-slate-700">{incident.reportanteNombre}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">{initials(incident.tecnicoNombre)}</span>
                    <span className="text-xs text-slate-700">{incident.tecnicoNombre || "Sin asignar"}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5"><StatusPill value={incident.estado} /></td>
                <td className="px-4 py-3.5">
                  <span className="flex items-center gap-2 text-xs text-slate-700">
                    <span className={`size-1.5 rounded-full ${incident.prioridad === "ALTA" || incident.prioridad === "CRITICA" ? "bg-rose-500" : incident.prioridad === "MEDIA" ? "bg-amber-400" : "bg-slate-300"}`} />
                    {incident.prioridad}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-400">{relativeTime(incident.creadoEn)}</td>
                <td className="px-3 py-3.5 text-xs font-semibold text-emerald-700"><Link aria-label={`Abrir incidencia ${incident.codigo}`} to={`/incidencias?seleccion=${incident.id}`}>Ver</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {incidents.length === 0 && <EmptyNotice>Sin incidencias para mostrar con este filtro.</EmptyNotice>}
    </Panel>
  )
}

function IncidentFlow({ incidents, report, canViewReports, loading, days, onPeriodChange }: {
  incidents: Incident[]
  report: Report | null
  canViewReports: boolean
  loading: boolean
  days: number
  onPeriodChange: (days: number) => void
}) {
  const local = useMemo(() => localReport(incidents, days), [incidents, days])
  const series = report?.serieDiaria ?? (canViewReports ? [] : local.serieDiaria)
  const data = series.map((item) => ({
    fecha: new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "numeric" }).format(new Date(`${item.fecha}T00:00:00`)),
    creadas: item.creadas,
    resueltas: item.resueltas,
  }))
  const maxValue = Math.max(10, ...data.map((item) => item.creadas))
  const chartPoints = data.map((item, index) => ({
    ...item,
    x: data.length > 1 ? 34 + (index / (data.length - 1)) * 650 : 359,
    y: 12 + (1 - item.creadas / maxValue) * 140,
  }))
  const linePath = chartPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")
  const areaPath = `${linePath} L ${chartPoints.at(-1)?.x ?? 684} 164 L ${chartPoints[0]?.x ?? 34} 164 Z`
  const yTicks = [0, 1, 2, 3].map((index) => Math.round(maxValue * (1 - index / 3)))

  return (
    <Panel
      title="Flujo de incidencias"
      description={`Actividad de los últimos ${days} días`}
      action={
        <select
          aria-label="Período del flujo de incidencias"
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-emerald-400"
          value={days}
          onChange={(event) => onPeriodChange(Number(event.target.value))}
        >
          <option value={7}>Esta semana</option>
          <option value={30}>Últimos 30 días</option>
        </select>
      }
      className="min-h-[300px]"
    >
      {loading ? <LoadingNotice /> : !data.length ? <EmptyNotice>Sin actividad disponible para este período.</EmptyNotice> : (
        <div className="h-[230px] px-2 pb-3 pt-4">
          <svg viewBox="0 0 710 205" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label="Incidencias creadas por día">
            <defs>
              <linearGradient id="incident-flow-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity=".2" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
            {yTicks.map((tick, index) => {
              const y = 12 + (index / 3) * 140
              return <g key={`${tick}-${index}`}><line x1="34" y1={y} x2="684" y2={y} stroke="#e5edf5" strokeDasharray="3 3" /><text x="26" y={y + 3} textAnchor="end" fill="#94a3b8" fontSize="9">{tick}</text></g>
            })}
            <path d={areaPath} fill="url(#incident-flow-fill)" />
            <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            {chartPoints.map((point, index) => <circle key={`${point.fecha}-${index}`} cx={point.x} cy={point.y} r={data.length > 14 ? 2.2 : 3.5} fill="white" stroke="#10b981" strokeWidth="2" vectorEffect="non-scaling-stroke"><title>{point.fecha}: {point.creadas} creadas, {point.resueltas} resueltas</title></circle>)}
            {chartPoints.filter((_, index) => index % Math.ceil(data.length / 7) === 0 || index === data.length - 1).map((point, index) => <text key={`${point.fecha}-label-${index}`} x={point.x} y="188" textAnchor="middle" fill="#94a3b8" fontSize="9">{point.fecha}</text>)}
          </svg>
        </div>
      )}
    </Panel>
  )
}

function CategoryBreakdown({ values, loading }: { values: Record<string, number>; loading: boolean }) {
  const categories = Object.entries(values).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1])
  const total = categories.reduce((sum, [, count]) => sum + count, 0)
  const gradient = categories.map(([, count], index) => {
    const start = categories.slice(0, index).reduce((sum, [, previousCount]) => sum + previousCount, 0)
    const end = start + count
    return `${categoryColors[index % categoryColors.length]} ${(start / total) * 100}% ${(end / total) * 100}%`
  }).join(", ")

  return (
    <Panel title="Incidencias por categoría" description="Distribución del período seleccionado" className="min-h-[300px]">
      {loading ? <LoadingNotice /> : !total ? <EmptyNotice>Sin categorías para mostrar.</EmptyNotice> : (
        <div className="grid h-[230px] items-center gap-4 p-5 sm:grid-cols-[minmax(120px,1fr)_1fr]">
          <div className="mx-auto grid size-36 place-items-center rounded-full" style={{ background: `conic-gradient(${gradient})` }} role="img" aria-label={`Distribución de ${total} incidencias por categoría`}>
            <div className="grid size-24 place-content-center rounded-full bg-white text-center">
              <span className="text-2xl font-bold text-slate-900">{total}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total</span>
            </div>
          </div>
          <ul className="space-y-3">
            {categories.slice(0, 6).map(([name, count], index) => (
              <li key={name} className="flex items-center gap-2 text-xs">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoryColors[index % categoryColors.length] }} />
                <span className="min-w-0 flex-1 truncate text-slate-500">{name}</span>
                <span className="font-bold text-slate-700">{Math.round((count / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const summary = useAsync(adminApi.dashboard, [])
  const incidentList = useAsync(incidentsApi.list, [])
  const canViewReports = reportRoles.includes(user?.rol || "")
  const [period, setPeriod] = useState(7)
  const report = useAsync(
    () => canViewReports ? adminApi.report(period) : Promise.resolve(null),
    [canViewReports, period],
  )

  const incidents = incidentList.data || []
  const categoryValues = categoryReport(incidents, report.data, canViewReports, period)
  const cards = summary.data ? [
    { label: "Incidencias abiertas", value: summary.data.abiertas, caption: "Registradas o asignadas", icon: "▤", color: "bg-emerald-50 text-emerald-700" },
    { label: "En proceso", value: summary.data.enProceso, caption: "En atención o en espera", icon: "◷", color: "bg-violet-50 text-violet-700" },
    { label: "Componentes bajo stock", value: summary.data.componentesBajoStock, caption: "En el mínimo o por debajo", icon: "⬡", color: "bg-sky-50 text-sky-700" },
    { label: "Solicitudes pendientes", value: summary.data.solicitudesPendientes, caption: "Esperan evaluación o aprobación", icon: "◷", color: "bg-amber-50 text-amber-700" },
  ] : []

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Greeting name={user?.nombres || "equipo"} />
        {user?.rol !== "TECNICO" && (
          <Link
            to="/incidencias?crear=1"
            className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 sm:self-auto"
          >
            <span aria-hidden="true">＋</span> Nueva incidencia
          </Link>
        )}
      </div>
      {summary.error && <div className="mb-4"><ErrorNotice message={summary.error} onRetry={() => void summary.reload()} /></div>}
      {summary.loading && <LoadingNotice />}
      {summary.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => <MetricCard key={card.label} {...card} />)}
          </div>
          {report.error && canViewReports && <div className="mt-5"><ErrorNotice message={report.error} onRetry={() => void report.reload()} /></div>}
          <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
            <IncidentFlow incidents={incidents} report={report.data} canViewReports={canViewReports} loading={canViewReports && report.loading} days={period} onPeriodChange={setPeriod} />
            <CategoryBreakdown values={categoryValues} loading={canViewReports && report.loading} />
          </div>
          {incidentList.error && <div className="mt-5"><ErrorNotice message={incidentList.error} onRetry={() => void incidentList.reload()} /></div>}
          {incidentList.loading ? <div className="mt-5"><LoadingNotice /></div> : <RecentIncidents incidents={incidents} />}
          <p className="mt-3 text-right text-xs text-slate-400">
            Técnicos disponibles: {summary.data.tecnicosDisponibles} · Componentes bajo stock: {summary.data.componentesBajoStock}
          </p>
        </>
      )}
    </>
  )
}
