import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { useSearchParams } from "react-router-dom"
import { Button, EmptyNotice, ErrorNotice, Input, LoadingNotice, Panel, Select, StatusPill, Textarea, formatDate, formatRole } from "@/components/ui"
import { useAuth } from "@/features/auth/AuthProvider"
import { errorMessage, useAsync } from "@/hooks/useAsync"
import { incidentsApi } from "./api"
import type { Activity, Evidence, Incident, IncidentMessage, IncidentStatus } from "@/types/api"

const statusLabels: Record<string, string> = {
  REGISTRADA: "Registrada",
  ASIGNADA: "Asignada",
  EN_ATENCION: "En atención",
  EN_ESPERA_USUARIO: "En espera · usuario",
  EN_ESPERA_REPUESTO: "En espera · repuesto",
  RESUELTA: "Resuelta",
  CERRADA: "Cerrada",
}

const allowedTransitions: Partial<Record<string, Partial<Record<IncidentStatus, IncidentStatus[]>>>> = {
  EMPLEADO: {
    RESUELTA: ["ASIGNADA"],
  },
  TECNICO: {
    ASIGNADA: ["EN_ATENCION"],
    EN_ATENCION: ["EN_ESPERA_USUARIO", "EN_ESPERA_REPUESTO", "RESUELTA"],
    EN_ESPERA_USUARIO: ["EN_ATENCION", "RESUELTA"],
    EN_ESPERA_REPUESTO: ["EN_ATENCION", "RESUELTA"],
  },
  SUPERVISOR: {
    REGISTRADA: ["CERRADA"],
    ASIGNADA: ["EN_ATENCION", "CERRADA"],
    EN_ATENCION: ["CERRADA"],
    EN_ESPERA_REPUESTO: ["EN_ATENCION", "CERRADA"],
    RESUELTA: ["CERRADA"],
    CERRADA: ["ASIGNADA"],
  },
  GERENCIA: {
    REGISTRADA: ["CERRADA"],
    ASIGNADA: ["EN_ATENCION", "CERRADA"],
    EN_ATENCION: ["CERRADA"],
    EN_ESPERA_REPUESTO: ["EN_ATENCION", "CERRADA"],
    RESUELTA: ["CERRADA"],
    CERRADA: ["ASIGNADA"],
  },
  ADMIN: {
    REGISTRADA: ["CERRADA"],
    ASIGNADA: ["EN_ATENCION", "CERRADA"],
    EN_ATENCION: ["CERRADA"],
    EN_ESPERA_REPUESTO: ["EN_ATENCION", "CERRADA"],
    RESUELTA: ["CERRADA"],
    CERRADA: ["ASIGNADA"],
  },
}

export function IncidentsPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const incidents = useAsync(incidentsApi.list, [])
  const categories = useAsync(incidentsApi.categories, [])
  const locations = useAsync(incidentsApi.locations, [])
  const technicians = useAsync(incidentsApi.technicians, [])
  const [selectedId, setSelectedId] = useState<string | null>(params.get("seleccion"))
  const [query, setQuery] = useState("")
  const [createOpen, setCreateOpen] = useState(params.get("crear") === "1")
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<Incident | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [messages, setMessages] = useState<IncidentMessage[]>([])
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [detailError, setDetailError] = useState<string | null>(null)
  const [chatDraft, setChatDraft] = useState("")
  const [nextStatus, setNextStatus] = useState("")
  const [activityFormOpen, setActivityFormOpen] = useState(false)

  const closeDetails = useCallback(() => {
    setSelectedId(null)
    const next = new URLSearchParams(params)
    next.delete("seleccion")
    setParams(next, { replace: true })
  }, [params, setParams])

  const filtered = useMemo(() => (incidents.data || []).filter((item) => {
    const text = `${item.codigo} ${item.titulo} ${item.reportanteNombre} ${item.tecnicoNombre || ""}`.toLowerCase()
    return text.includes(query.toLowerCase())
  }), [incidents.data, query])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    setParams({ seleccion: selectedId }, { replace: true })
    let active = true
    setDetailError(null)
    setMessages([])
    Promise.all([
      incidentsApi.get(selectedId),
      incidentsApi.activities(selectedId),
      incidentsApi.evidence(selectedId),
    ]).then(async ([incident, activityList, evidenceList]) => {
      if (!active) return
      setDetail(incident)
      setActivities(activityList)
      setEvidence(evidenceList)
      const isParticipant = user?.id === incident.reportanteId
        || user?.id === incident.tecnicoAsignadoId
      if (isParticipant) {
        const messageList = await incidentsApi.messages(selectedId)
        if (active) setMessages(messageList)
      }
    }).catch((error: unknown) => {
      if (active) setDetailError(errorMessage(error))
    })
    return () => { active = false }
  }, [selectedId, setParams, user?.id])

  useEffect(() => {
    if (!selectedId) return
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeDetails()
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [selectedId, closeDetails])

  async function runAction(action: () => Promise<unknown>, success: string): Promise<boolean> {
    setSaving(true)
    setActionError(null)
    setNotice(null)
    try {
      await action()
      setNotice(success)
      await incidents.reload()
      if (selectedId) {
        const updated = await incidentsApi.get(selectedId)
        setDetail(updated)
      }
      return true
    } catch (error) {
      setActionError(errorMessage(error))
      return false
    } finally {
      setSaving(false)
    }
  }

  async function createIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const created = await runAction(() => incidentsApi.create({
      titulo: String(data.get("titulo")),
      descripcion: String(data.get("descripcion")),
      categoriaId: String(data.get("categoriaId")),
      ubicacionId: String(data.get("ubicacionId") || "") || undefined,
      canal: String(data.get("canal")) as "PORTAL_WEB" | "CORREO" | "TELEFONO" | "PRESENCIAL",
      impacto: String(data.get("impacto")) as "BAJO" | "MEDIO" | "ALTO" | "CRITICO",
      urgencia: String(data.get("urgencia")) as "BAJO" | "MEDIO" | "ALTO" | "CRITICO",
    }), "Incidencia registrada.")
    if (created) closeCreateIncident()
  }

  function closeCreateIncident() {
    setCreateOpen(false)
    if (params.has("crear")) {
      const next = new URLSearchParams(params)
      next.delete("crear")
      setParams(next, { replace: true })
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedId || !chatDraft.trim()) return
    setSaving(true)
    setActionError(null)
    try {
      const message = await incidentsApi.sendMessage(selectedId, {
        contenido: chatDraft.trim(),
      })
      setMessages((current) => [...current, message])
      setChatDraft("")
    } catch (error) {
      setActionError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function uploadFile(file?: File) {
    if (!selectedId || !file) return
    setSaving(true)
    setActionError(null)
    try {
      const saved = await incidentsApi.uploadEvidence(selectedId, file)
      setEvidence((current) => [saved, ...current])
      setNotice("Evidencia subida.")
    } catch (error) {
      setActionError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const canCreate = user?.rol !== "TECNICO"
  const canChat = Boolean(detail && user?.id
    && (user.id === detail.reportanteId || user.id === detail.tecnicoAsignadoId))
  const transitions = detail
    ? allowedTransitions[user?.rol || ""]?.[detail.estado] || []
    : []

  return (
    <>
      {!selectedId && <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-semibold text-emerald-700">{formatRole(user?.rol || "")}</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">Incidencias</h1>
          <p className="mt-1 text-sm text-slate-500">Consulta, asigna y da seguimiento a cada solicitud.</p>
        </div>
        {canCreate && (
          <Button onClick={() => createOpen ? closeCreateIncident() : setCreateOpen(true)}>
            {createOpen ? "Cancelar" : "+ Registrar incidencia"}
          </Button>
        )}
      </div>
      {notice && !selectedId && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</div>}
      {actionError && !selectedId && <div className="mb-4"><ErrorNotice message={actionError} /></div>}

      {createOpen && (
        <Panel title="Registrar incidencia" description="El reportante se identifica mediante la sesión; las relaciones se envían como UUID. " className="mb-5">
          {categories.error && <div className="p-4"><ErrorNotice message={categories.error} onRetry={() => void categories.reload()} /></div>}
          <form onSubmit={(event) => void createIncident(event)} className="grid gap-4 p-5 md:grid-cols-2">
            <Input name="titulo" label="Título" required maxLength={200} placeholder="Ej. Equipo no enciende" />
            <Select name="categoriaId" label="Categoría" required defaultValue=""><option value="" disabled>Selecciona una categoría</option>{categories.data?.filter((item) => item.activo).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</Select>
            <Select name="ubicacionId" label="Ubicación" defaultValue=""><option value="">Sin ubicación</option>{locations.data?.filter((item) => item.activo).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</Select>
            <Select name="canal" label="Canal" defaultValue="PORTAL_WEB"><option value="PORTAL_WEB">Portal web</option><option value="CORREO">Correo</option><option value="TELEFONO">Teléfono</option><option value="PRESENCIAL">Presencial</option></Select>
            <Select name="impacto" label="Impacto" defaultValue="MEDIO"><option>BAJO</option><option>MEDIO</option><option>ALTO</option><option>CRITICO</option></Select>
            <Select name="urgencia" label="Urgencia" defaultValue="MEDIO"><option>BAJO</option><option>MEDIO</option><option>ALTO</option><option>CRITICO</option></Select>
            <div className="md:col-span-2"><Textarea name="descripcion" label="Descripción" rows={4} required placeholder="Describe qué ocurrió y desde cuándo…" /></div>
            <div className="flex justify-end md:col-span-2"><Button disabled={saving || !categories.data?.length}>{saving ? "Guardando…" : "Guardar incidencia"}</Button></div>
          </form>
        </Panel>
      )}

      <div className="mb-4 max-w-md">
        <Input
          aria-label="Buscar incidencias"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por código, título o persona…"
        />
      </div>
      {incidents.loading ? <LoadingNotice /> : incidents.error ? <ErrorNotice message={incidents.error} onRetry={() => void incidents.reload()} /> : filtered.length === 0 ? <Panel><EmptyNotice /></Panel> : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              aria-label={`Ver incidencia ${item.codigo}: ${item.titulo}`}
              className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md sm:gap-5 sm:px-5 sm:py-4"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-lg text-emerald-600" aria-hidden="true">▤</span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-emerald-700">{item.codigo}</span>
                <span className="mt-1 block truncate text-sm font-bold text-slate-950">{item.titulo}</span>
                <span className="mt-1 block truncate text-xs text-slate-500">
                  {item.reportanteNombre} · Técnico: {item.tecnicoNombre || "Sin asignar"}
                </span>
              </span>
              <StatusPill value={statusLabels[item.estado] || item.estado} />
            </button>
          ))}
        </div>
      )}
      </>}

      {selectedId && (
        <div className="space-y-5">
          {detailError ? <ErrorNotice message={detailError} /> : !detail ? <LoadingNotice /> : (
            <>
              <Panel>
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-xs font-bold text-emerald-700">Incidencias / {detail.codigo}</p>
                    <h2 className="mt-1 text-lg font-bold text-slate-900">Detalle de incidencia</h2>
                  </div>
                  <Button tone="neutral" onClick={closeDetails}>Volver</Button>
                </div>
              </Panel>

              {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</div>}
              {actionError && <ErrorNotice message={actionError} />}

              <Panel>
                <div className="space-y-5 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <StatusPill value={statusLabels[detail.estado] || detail.estado} />
                    <span className={`flex items-center gap-2 text-xs font-bold ${detail.prioridad === "ALTA" || detail.prioridad === "CRITICA" ? "text-rose-600" : detail.prioridad === "MEDIA" ? "text-amber-600" : "text-slate-500"}`}>
                      <span className={`size-2 rounded-full ${detail.prioridad === "ALTA" || detail.prioridad === "CRITICA" ? "bg-rose-500" : detail.prioridad === "MEDIA" ? "bg-amber-500" : "bg-slate-400"}`} />
                      Prioridad {detail.prioridad.toLowerCase()}
                    </span>
                  </div>

                  {Boolean(user?.rol && allowedTransitions[user.rol]) && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Transiciones permitidas para {formatRole(user?.rol || "")}</p>
                      {transitions.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {transitions.map((status) => (
                            <Button key={status} tone={nextStatus === status ? "primary" : "neutral"} className="min-h-9 px-3" onClick={() => setNextStatus((current) => current === status ? "" : status)}>
                              {statusLabels[status]}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">No hay cambios de estado permitidos desde {statusLabels[detail.estado] || detail.estado}.</p>
                      )}
                      {nextStatus && (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault()
                            const reason = String(new FormData(event.currentTarget).get("motivo"))
                            void runAction(() => incidentsApi.changeStatus(detail.id, nextStatus, reason), `Estado actualizado: ${statusLabels[nextStatus]}`)
                            setNextStatus("")
                          }}
                          className="mt-3 flex flex-wrap items-end gap-2"
                        >
                          <Input name="motivo" label={`Motivo para cambiar a ${statusLabels[nextStatus]}`} required placeholder="Describe el cambio" className="min-w-52 flex-1" />
                          <Button disabled={saving}>{saving ? "Actualizando…" : "Confirmar cambio"}</Button>
                          <Button type="button" tone="quiet" onClick={() => setNextStatus("")}>Cancelar</Button>
                        </form>
                      )}
                    </div>
                  )}

                  {["ADMIN", "GERENCIA", "SUPERVISOR"].includes(user?.rol || "") && (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault()
                        const id = String(new FormData(event.currentTarget).get("tecnicoId"))
                        void runAction(() => incidentsApi.assign(detail.id, id), "Técnico asignado.")
                      }}
                      className="rounded-xl border border-slate-200 p-3"
                    >
                      <Select
                        name="tecnicoId"
                        label="Técnico asignado"
                        defaultValue={technicians.data?.find((tech) => `${tech.nombres} ${tech.apellidos}` === detail.tecnicoNombre)?.id || ""}
                        onChange={(event) => {
                          const form = event.currentTarget.form
                          if (form && event.target.value) form.requestSubmit()
                        }}
                      >
                        <option value="">Sin asignar</option>
                        {technicians.data?.map((tech) => <option value={tech.id} key={tech.id}>{tech.nombres} {tech.apellidos}</option>)}
                      </Select>
                    </form>
                  )}

                  <div>
                    <h3 className="text-lg font-bold text-slate-950">{detail.titulo}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">{detail.descripcion}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Solicitante</p>
                      <p className="mt-2 text-sm font-bold text-slate-800">{detail.reportanteNombre}</p>
                      <p className="mt-1 text-xs text-slate-500">{detail.ubicacionNombre || "Ubicación no especificada"}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Técnico asignado</p>
                      <p className="mt-2 text-sm font-bold text-slate-800">{detail.tecnicoNombre || "Sin asignar"}</p>
                      <p className="mt-1 text-xs text-slate-500">{detail.categoriaNombre} · Creada {formatDate(detail.creadoEn)}</p>
                    </div>
                  </div>

                  <section>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-bold text-slate-900">Evidencias</h3>
                      <label className="cursor-pointer text-xs font-bold text-emerald-700 hover:text-emerald-800">
                        + Subir imagen
                        <input type="file" accept="image/*" className="hidden" disabled={saving} onChange={(event) => void uploadFile(event.target.files?.[0])} />
                      </label>
                    </div>
                    {evidence.length ? (
                      <ul className="grid gap-3 sm:grid-cols-2">
                        {evidence.map((item) => (
                          <li key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                            <a className="block" href={item.url} target="_blank" rel="noreferrer">
                              {item.tipoMime.startsWith("image/") ? (
                                <img src={item.url} alt={item.nombreArchivo} className="h-28 w-full rounded-lg bg-slate-200 object-cover" />
                              ) : (
                                <span className="grid h-20 place-items-center rounded-lg bg-slate-200 text-2xl text-slate-500" aria-hidden="true">▤</span>
                              )}
                              <span className="mt-2 block truncate text-xs font-medium text-slate-700">{item.nombreArchivo}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No hay evidencias adjuntas.</p>}
                  </section>

                  <section>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-bold text-slate-900">Actividad</h3>
                      {user?.rol === "TECNICO" && (
                        <button type="button" onClick={() => setActivityFormOpen((open) => !open)} className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
                          {activityFormOpen ? "Cancelar" : "+ Registrar actividad"}
                        </button>
                      )}
                    </div>
                    {activityFormOpen && user?.rol === "TECNICO" && (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault()
                          const form = event.currentTarget
                          const data = new FormData(form)
                          void runAction(
                            () => incidentsApi.addActivity(detail.id, {
                              tipo: String(data.get("tipo")),
                              descripcion: String(data.get("descripcion")),
                              minutos: Number(data.get("minutos")),
                            }),
                            "Actividad registrada.",
                          ).then((saved) => {
                            if (saved) {
                              form.reset()
                              setActivityFormOpen(false)
                            }
                          })
                        }}
                        className="mb-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-[1fr_2fr_100px_auto]"
                      >
                        <Input name="tipo" label="Tipo" required placeholder="Diagnóstico" />
                        <Input name="descripcion" label="Descripción" required placeholder="Trabajo realizado" />
                        <Input name="minutos" label="Minutos" type="number" required min={1} />
                        <Button className="self-end" disabled={saving}>Registrar</Button>
                      </form>
                    )}
                    {activities.length ? (
                      <ol className="ml-2 space-y-0 border-l border-slate-200">
                        {activities.map((item) => (
                          <li key={item.id} className="relative pb-5 pl-5 last:pb-0">
                            <span className="absolute -left-[5px] top-1.5 size-2.5 rounded-full border-2 border-white bg-emerald-500 ring-1 ring-emerald-100" />
                            <p className="text-sm font-semibold text-slate-900">{item.tipoActividad}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">{item.descripcion}</p>
                            <p className="mt-1 text-[10px] text-slate-400">{item.tecnicoNombre} · {formatDate(item.creadoEn)} · {item.minutos} min</p>
                          </li>
                        ))}
                      </ol>
                    ) : <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No hay actividad registrada.</p>}
                  </section>

                  {canChat && <section className="overflow-hidden rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                      <span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600" aria-hidden="true">▱</span>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Chat de la incidencia</h3>
                        <p className="text-xs text-slate-500">Conversación entre quien reportó y el técnico asignado</p>
                      </div>
                    </div>
                    <div className="max-h-72 min-h-36 space-y-3 overflow-auto bg-slate-50 p-4">
                      {messages.map((message) => {
                        const ownMessage = message.remitenteNombre === `${user?.nombres} ${user?.apellidos}`
                        return (
                          <div key={message.id} className={`max-w-[90%] sm:max-w-[78%] ${ownMessage ? "ml-auto text-right" : ""}`}>
                            <p className="mb-1 text-[10px] font-semibold text-slate-400">{message.remitenteNombre}</p>
                            <div className={`inline-block rounded-2xl px-3 py-2 text-left text-xs leading-5 shadow-sm ${ownMessage ? "bg-emerald-600 text-white" : "border border-slate-100 bg-white text-slate-700"}`}>
                              {message.contenido}
                            </div>
                            <p className="mt-1 text-[9px] text-slate-400">{formatDate(message.creadoEn)}</p>
                          </div>
                        )
                      })}
                      {!messages.length && <p className="py-8 text-center text-xs text-slate-400">Aún no hay mensajes en esta conversación.</p>}
                    </div>
                    <form onSubmit={(event) => void sendMessage(event)} className="flex flex-wrap items-center gap-2 border-t border-slate-100 p-3">
                      <Input aria-label="Escribe un mensaje" className="min-w-40 flex-1" value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder="Escribe un mensaje…" />
                      <Button disabled={saving || !chatDraft.trim()}>Enviar</Button>
                    </form>
                  </section>}
                </div>
              </Panel>
            </>
          )}
        </div>
      )}
    </>
  )
}
