import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Button, EmptyNotice, ErrorNotice, Input, LoadingNotice, PageHeader, Panel, Select, StatusPill, formatDate } from "@/components/ui"
import { FilePreviewDialog } from "@/components/FilePreviewDialog"
import { Icon, type IconName } from "@/components/icons"
import { useAuth } from "@/features/auth/AuthProvider"
import { incidentsApi } from "@/features/incidents/api"
import { messagesApi } from "@/features/messages/api"
import { requestsApi } from "@/features/requests/api"
import { usersApi } from "@/features/users/api"
import { errorMessage, useAsync } from "@/hooks/useAsync"
import type { ApiUser, ApprovalHistory, ChangeRequest, Evidence, Incident, IncidentMessage } from "@/types/api"

type HistoryTab = "INCIDENCIAS" | "APROBACIONES" | "CHATS" | "EVIDENCIAS"
type HistoryEvent = {
  id: string
  titulo: string
  detalle?: string | null
  autor?: string | null
  fecha: string
  estado?: string | null
  url?: string
  mimeType?: string
}
type ExpandedDetails = {
  events: HistoryEvent[]
  error?: string
}
type IncidentHistory = {
  id: number
  tipoEvento: string
  estadoOrigen?: string | null
  estadoDestino?: string | null
  motivo?: string | null
  realizadoPorNombre?: string | null
  creadoEn: string
}

const privilegedRoles = ["ADMIN", "GERENCIA", "SUPERVISOR"] as const
const noUsers = async () => [] as ApiUser[]
const noRequests = async () => [] as ChangeRequest[]
const categoryTabs: { id: HistoryTab; label: string }[] = [
  { id: "INCIDENCIAS", label: "Incidencias" },
  { id: "APROBACIONES", label: "Aprobaciones" },
  { id: "CHATS", label: "Chats" },
  { id: "EVIDENCIAS", label: "Evidencias" },
]

export function HistoryPage() {
  const { user } = useAuth()
  const canSupervise = Boolean(user?.rol && privilegedRoles.includes(user.rol as (typeof privilegedRoles)[number]))
  const incidents = useAsync(incidentsApi.list, [])
  const users = useAsync(canSupervise ? usersApi.list : noUsers, [canSupervise])
  const changeRequests = useAsync(canSupervise ? requestsApi.list : noRequests, [canSupervise])
  const [tab, setTab] = useState<HistoryTab>("INCIDENCIAS")
  const [technicianSearch, setTechnicianSearch] = useState("")
  const [technicianId, setTechnicianId] = useState("")
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, ExpandedDetails>>({})
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [filePreview, setFilePreview] = useState<{ name: string; url: string; mimeType?: string } | null>(null)

  const technicians = useMemo(() => (users.data || [])
    .filter((person) => person.rol === "TECNICO")
    .filter((person) => `${person.nombres} ${person.apellidos} ${person.correo}`.toLowerCase()
      .includes(technicianSearch.trim().toLowerCase())), [users.data, technicianSearch])
  const visibleIncidents = useMemo(() => (incidents.data || [])
    .filter((incident) => !canSupervise || !technicianId || incident.tecnicoAsignadoId === technicianId)
    .sort((left, right) => right.creadoEn.localeCompare(left.creadoEn)), [incidents.data, canSupervise, technicianId])
  const visibleRequests = useMemo(() => (changeRequests.data || []).filter((request) =>
    !technicianId || visibleIncidents.some((incident) => incident.id === request.incidenciaId)), [
    changeRequests.data, technicianId, visibleIncidents,
  ])
  const tabs = categoryTabs.filter((category) => category.id !== "APROBACIONES" || canSupervise)
  const pageError = incidents.error || users.error || changeRequests.error

  function cacheDetails(key: string, events: HistoryEvent[]) {
    setDetails((current) => ({ ...current, [key]: { events } }))
  }

  async function expandIncident(incident: Incident, selectedTab: HistoryTab) {
    const key = `${selectedTab}:${incident.id}`
    if (expandedKey === key) {
      setExpandedKey(null)
      return
    }
    setExpandedKey(key)
    if (details[key]) return

    setLoadingKey(key)
    try {
      if (selectedTab === "INCIDENCIAS") {
        const history = await incidentsApi.history(incident.id) as IncidentHistory[]
        cacheDetails(key, history.map((item) => ({
          id: String(item.id),
          titulo: item.estadoDestino
            ? `Cambio de ${item.estadoOrigen?.replaceAll("_", " ") || "—"} a ${item.estadoDestino.replaceAll("_", " ")}`
            : item.tipoEvento,
          detalle: item.motivo,
          autor: item.realizadoPorNombre,
          fecha: item.creadoEn,
          estado: item.estadoDestino,
        })))
      } else if (selectedTab === "CHATS") {
        const messages: IncidentMessage[] = canSupervise
          ? (await messagesApi.supervisedChats()).filter((message) => message.incidenciaId === incident.id)
          : await incidentsApi.messages(incident.id)
        cacheDetails(key, messages
          .filter((message) => user?.rol !== "EMPLEADO" || message.remitenteId === user.id)
          .map((message) => ({
            id: message.id,
            titulo: "Mensaje",
            detalle: message.contenido,
            autor: message.remitenteNombre,
            fecha: message.creadoEn,
          })))
      } else {
        const evidence: Evidence[] = await incidentsApi.evidence(incident.id)
        cacheDetails(key, evidence
          .map((item) => ({
            id: item.id,
            titulo: item.nombreArchivo,
            detalle: `${item.tipoMime} · ${(item.tamanoBytes / 1024).toFixed(0)} KB`,
            autor: item.subidoPorNombre,
            fecha: item.creadoEn,
            url: item.url,
            mimeType: item.tipoMime,
          })))
      }
    } catch (caught) {
      setDetails((current) => ({ ...current, [key]: { events: [], error: errorMessage(caught) } }))
    } finally {
      setLoadingKey(null)
    }
  }

  async function expandApproval(request: ChangeRequest) {
    const key = `APROBACIONES:${request.id}`
    if (expandedKey === key) {
      setExpandedKey(null)
      return
    }
    setExpandedKey(key)
    if (details[key]) return

    setLoadingKey(key)
    try {
      const history = await requestsApi.history(request.id)
      cacheDetails(key, history.map((item: ApprovalHistory) => ({
        id: item.id,
        titulo: `${item.estadoOrigen || "—"} → ${item.estadoDestino}`,
        detalle: item.comentario,
        autor: item.realizadoPorNombre,
        fecha: item.creadoEn,
        estado: item.estadoDestino,
      })))
    } catch (caught) {
      setDetails((current) => ({ ...current, [key]: { events: [], error: errorMessage(caught) } }))
    } finally {
      setLoadingKey(null)
    }
  }

  function renderDetails(key: string, incidentId: string) {
    const data = details[key]
    if (loadingKey === key) return <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:pl-[4.5rem]"><LoadingNotice /></div>
    if (data?.error) {
      return (
        <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:pl-[4.5rem]">
          <ErrorNotice message={data.error} onRetry={() => {
            setDetails((current) => {
              const next = { ...current }
              delete next[key]
              return next
            })
            setExpandedKey(null)
          }} />
        </div>
      )
    }
    return (
      <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:pl-[4.5rem]">
        {!data?.events.length
          ? <EmptyNotice>No hay detalles para mostrar.</EmptyNotice>
          : <ol className="space-y-2">
            {data.events.map((event) => (
              <li key={event.id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3">
                <span className="mt-1 size-2 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <b className="text-sm text-slate-900">{event.titulo}</b>
                    {event.estado && <StatusPill value={event.estado} />}
                  </span>
                  {event.detalle && <span className="mt-1 block whitespace-pre-wrap break-words text-xs text-slate-600">{event.detalle}</span>}
                  <span className="mt-1 block text-xs text-slate-500">{event.autor || "Usuario"} · {formatDate(event.fecha)}</span>
                </span>
                {event.url && (
                  <button
                    type="button"
                    onClick={() => {
                      if (event.url) setFilePreview({ name: event.titulo, url: event.url, mimeType: event.mimeType })
                    }}
                    className="shrink-0 text-xs font-semibold text-brand-700 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  >
                    Ver archivo
                  </button>
                )}
              </li>
            ))}
          </ol>}
        <Link to={`/incidencias?seleccion=${encodeURIComponent(incidentId)}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">Abrir incidencia <Icon name="chevronRight" className="size-4" /></Link>
      </div>
    )
  }

  const activeTabDescription: Record<HistoryTab, string> = {
    INCIDENCIAS: "Selecciona una incidencia para revisar sus cambios de estado.",
    APROBACIONES: "Selecciona una solicitud para consultar los cambios de aprobación.",
    CHATS: "Selecciona una incidencia para revisar los mensajes del chat.",
    EVIDENCIAS: "Selecciona una incidencia para consultar sus archivos adjuntos.",
  }

  return (
    <>
      <PageHeader
        title="Historial"
        description={user?.rol === "EMPLEADO"
          ? "Consulta tus incidencias, chats y evidencias."
          : user?.rol === "TECNICO"
            ? "Historial de incidencias asignadas a ti."
            : "Consulta incidencias, aprobaciones, chats y evidencias por separado."}
      />
      {pageError && <div className="mb-4"><ErrorNotice message={pageError} onRetry={() => {
        void incidents.reload()
        if (canSupervise) {
          void users.reload()
          void changeRequests.reload()
        }
      }} /></div>}
      <Panel className="overflow-hidden">
        <div role="tablist" aria-label="Tipo de historial" className={`grid gap-2 border-b border-slate-100 bg-slate-50/70 p-4 ${canSupervise ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
          {tabs.map((category) => (
            <Button key={category.id} role="tab" aria-selected={tab === category.id} type="button" tone={tab === category.id ? "primary" : "neutral"} onClick={() => {
              setTab(category.id)
              setExpandedKey(null)
            }}>
              {category.label}
            </Button>
          ))}
        </div>
        <div className="border-b border-slate-100 px-4 py-3 text-xs text-slate-500">{activeTabDescription[tab]}</div>
        {canSupervise && (
          <div className="border-b border-slate-100 p-4">
            <p className="mb-3 text-xs text-slate-500">Estos filtros se aplican a todas las secciones del historial.</p>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Input label="Buscar técnico por nombre o correo" value={technicianSearch} onChange={(event) => setTechnicianSearch(event.target.value)} placeholder="Nombre o correo del técnico" />
              <Select label="Filtrar por técnico" value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}>
                  <option value="">Todos los técnicos</option>
                  {technicians.map((person) => <option key={person.id} value={person.id}>{person.nombres} {person.apellidos} · {person.correo}</option>)}
                </Select>
            </div>
          </div>
        )}
        {incidents.loading || (tab === "APROBACIONES" && changeRequests.loading)
          ? <LoadingNotice />
          : tab === "APROBACIONES"
            ? visibleRequests.length
              ? <div className="divide-y divide-slate-100">
                {visibleRequests.map((request) => {
                  const key = `APROBACIONES:${request.id}`
                  const expanded = expandedKey === key
                  return (
                    <section key={request.id}>
                      <button type="button" aria-expanded={expanded} onClick={() => void expandApproval(request)} className={`flex w-full items-center gap-4 p-4 text-left transition hover:bg-slate-50 ${expanded ? "bg-brand-50/40" : ""}`}>
                        <Icon name="requests" className="size-5 text-brand-700" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-bold text-brand-700">{request.codigo}</span>
                          <span className="mt-0.5 block truncate text-sm font-semibold text-slate-900">{request.descripcion}</span>
                          <span className="mt-1 block truncate text-xs text-slate-500">{request.incidenciaCodigo} · {request.solicitadoPorNombre} · {formatDate(request.creadoEn)}</span>
                        </span>
                        <StatusPill value={request.estado} />
                        <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-slate-700">{expanded ? "Ocultar" : "Ver detalle"} <Icon name="chevronDown" className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} /></span>
                      </button>
                      {expanded && renderDetails(key, request.incidenciaId)}
                    </section>
                  )
                })}
              </div>
              : <EmptyNotice>No hay aprobaciones para mostrar.</EmptyNotice>
            : visibleIncidents.length
              ? <div className="divide-y divide-slate-100">
                {visibleIncidents.map((incident) => {
                  const key = `${tab}:${incident.id}`
                  const expanded = expandedKey === key
                  const click = () => void expandIncident(incident, tab)
                  return (
                    <section key={incident.id}>
                      <button type="button" aria-expanded={expanded} onClick={click} className={`flex w-full items-center gap-4 p-4 text-left transition hover:bg-slate-50 ${expanded ? "bg-brand-50/40" : ""}`}>
                        <Icon name={(tab === "INCIDENCIAS" ? "incidents" : tab === "CHATS" ? "messages" : "file") as IconName} className="size-5 text-brand-700" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-bold text-brand-700">{incident.codigo}</span>
                          <span className="mt-0.5 block truncate text-sm font-semibold text-slate-900">{incident.titulo}</span>
                          <span className="mt-1 block truncate text-xs text-slate-500">{incident.reportanteNombre} · {incident.tecnicoNombre ? `Técnico: ${incident.tecnicoNombre} · ` : ""}{formatDate(incident.creadoEn)}</span>
                        </span>
                        {tab === "INCIDENCIAS" && <StatusPill value={incident.estado} />}
                        <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-slate-700">{expanded ? "Ocultar" : "Ver detalle"} <Icon name="chevronDown" className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} /></span>
                      </button>
                      {expanded && renderDetails(key, incident.id)}
                    </section>
                  )
                })}
              </div>
              : <EmptyNotice>{tab === "INCIDENCIAS" ? "No hay incidencias en el historial." : tab === "CHATS" ? "No hay chats asociados a las incidencias." : "No hay evidencias asociadas a las incidencias."}</EmptyNotice>}
      </Panel>
      {filePreview && (
        <FilePreviewDialog
          name={filePreview.name}
          url={filePreview.url}
          mimeType={filePreview.mimeType}
          onClose={() => setFilePreview(null)}
        />
      )}
    </>
  )
}
