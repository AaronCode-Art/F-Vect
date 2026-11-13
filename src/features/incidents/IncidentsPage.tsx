import { useCallback, useEffect, useState, type FormEvent } from "react"
import { useSearchParams } from "react-router-dom"
import { Button, EmptyNotice, ErrorNotice, Input, LoadingNotice, Notice, PageHeader, Panel, PriorityLabel, ReviewDialog, Select, StatusPill, Textarea, formatDate } from "@/components/ui"
import { buttonClass } from "@/components/styles"
import { Icon } from "@/components/icons"
import { FilePreviewDialog } from "@/components/FilePreviewDialog"
import { humanize } from "@/utils/format"
import type { ReviewRequest } from "@/components/ui"
import { useAuth } from "@/features/auth/AuthProvider"
import { errorMessage, useAsync } from "@/hooks/useAsync"
import { DATA_UPDATED_EVENT } from "@/lib/api/realtimeEvents"
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
  const canAssignTechnicians = ["ADMIN", "GERENCIA", "SUPERVISOR"].includes(user?.rol || "")
  const [params, setParams] = useSearchParams()
  const [pageIndex, setPageIndex] = useState(0)
  const [query, setQuery] = useState("")
  const incidents = useAsync(
    () => incidentsApi.page(pageIndex, 20, query.trim()),
    [pageIndex, query],
  )
  const categories = useAsync(incidentsApi.categories, [])
  const locations = useAsync(incidentsApi.locations, [])
  const technicians = useAsync(
    () => canAssignTechnicians ? incidentsApi.technicians() : Promise.resolve([]),
    [canAssignTechnicians],
  )
  const [selectedId, setSelectedId] = useState<string | null>(params.get("seleccion"))
  const [createOpen, setCreateOpen] = useState(params.get("crear") === "1")
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<Incident | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [messages, setMessages] = useState<IncidentMessage[]>([])
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [evidencePreview, setEvidencePreview] = useState<Evidence | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [chatDraft, setChatDraft] = useState("")
  const [nextStatus, setNextStatus] = useState("")
  const [activityFormOpen, setActivityFormOpen] = useState(false)
  const [review, setReview] = useState<ReviewRequest | null>(null)

  const closeDetails = useCallback(() => {
    setSelectedId(null)
    const next = new URLSearchParams(params)
    next.delete("seleccion")
    setParams(next, { replace: true })
  }, [params, setParams])

  const pageItems = incidents.data?.content || []

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    const incidentId = selectedId
    setParams({ seleccion: selectedId }, { replace: true })
    let active = true
    setDetailError(null)
    setMessages([])
    async function loadDetail() {
      try {
        const [incident, activityList, evidenceList] = await Promise.all([
          incidentsApi.get(incidentId),
          incidentsApi.activities(incidentId),
          incidentsApi.evidence(incidentId),
        ])
        if (!active) return
        setDetail(incident)
        setActivities(activityList)
        setEvidence(evidenceList)
        const isParticipant = user?.id === incident.reportanteId
          || user?.id === incident.tecnicoAsignadoId
        if (isParticipant) {
          const messageList = await incidentsApi.messages(incidentId)
          if (active) setMessages(messageList)
        }
      } catch (error: unknown) {
        if (active) setDetailError(errorMessage(error))
      }
    }
    void loadDetail()
    window.addEventListener(DATA_UPDATED_EVENT, loadDetail)
    return () => {
      active = false
      window.removeEventListener(DATA_UPDATED_EVENT, loadDetail)
    }
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

  function askCreateIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const category = categories.data?.find((c) => c.id === data.get("categoriaId"))
    const place = locations.data?.find((l) => l.id === data.get("ubicacionId"))
    setReview({
      title: "¿Registrar esta incidencia?",
      description: "Se registrará a tu nombre. Revisa que los datos sean correctos.",
      items: [
        ["Título", String(data.get("titulo"))],
        ["Categoría", category?.nombre ?? ""],
        ["Ubicación", place?.nombre ?? "Sin ubicación"],
        ["Canal", humanize(String(data.get("canal")))],
        ["Impacto", humanize(String(data.get("impacto")))],
        ["Urgencia", humanize(String(data.get("urgencia")))],
        ["Descripción", String(data.get("descripcion"))],
      ],
      confirmLabel: "Registrar incidencia",
      run: () => createIncident(data),
    })
  }

  async function createIncident(data: FormData) {
    const created = await runAction(() => incidentsApi.create({
      titulo: String(data.get("titulo")),
      descripcion: String(data.get("descripcion")),
      categoriaId: String(data.get("categoriaId")),
      ubicacionId: String(data.get("ubicacionId") || "") || undefined,
      canal: String(data.get("canal")) as "PORTAL_WEB" | "CORREO" | "TELEFONO" | "PRESENCIAL",
      impacto: String(data.get("impacto")) as "BAJO" | "MEDIO" | "ALTO" | "CRITICO",
      urgencia: String(data.get("urgencia")) as "BAJO" | "MEDIO" | "ALTO" | "CRITICO",
    }), "Incidencia registrada.")
    if (created) {
      setQuery("")
      setPageIndex(0)
      closeCreateIncident()
    }
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

  const impactOptions = [["BAJO", "Bajo"], ["MEDIO", "Medio"], ["ALTO", "Alto"], ["CRITICO", "Crítico"]]
  const privileged = canAssignTechnicians

  if (!selectedId) {
    return (
      <>
        <PageHeader
          title="Incidencias"
          description="Consulta, asigna y da seguimiento a cada incidencia."
          action={canCreate ? (
            <Button tone={createOpen ? "neutral" : "primary"} onClick={() => createOpen ? closeCreateIncident() : setCreateOpen(true)}>
              {createOpen ? "Cancelar" : <><Icon name="plus" className="size-4" /> Registrar incidencia</>}
            </Button>
          ) : undefined}
        />
        {notice && <div className="mb-4"><Notice tone="success">{notice}</Notice></div>}
        {actionError && <div className="mb-4"><ErrorNotice message={actionError} /></div>}

        {createOpen && (
          <Panel title="Registrar incidencia" description="Se registrará a tu nombre." className="mb-6">
            {categories.error && <div className="p-5"><ErrorNotice message={categories.error} onRetry={() => void categories.reload()} /></div>}
            <form onSubmit={askCreateIncident} className="grid gap-4 p-5 md:grid-cols-2">
              <div className="md:col-span-2"><Input name="titulo" label="Título" required maxLength={200} placeholder="Ej. El equipo no enciende" /></div>
              <Select name="categoriaId" label="Categoría" required defaultValue="">
                <option value="" disabled>Selecciona una categoría</option>
                {categories.data?.filter((item) => item.activo).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
              </Select>
              <Select name="ubicacionId" label="Ubicación" hint="Opcional." defaultValue="">
                <option value="">Sin ubicación</option>
                {locations.data?.filter((item) => item.activo).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
              </Select>
              <Select name="canal" label="Canal por el que llegó" defaultValue="PORTAL_WEB">
                <option value="PORTAL_WEB">Portal web</option>
                <option value="CORREO">Correo</option>
                <option value="TELEFONO">Teléfono</option>
                <option value="PRESENCIAL">Presencial</option>
              </Select>
              <div className="hidden md:block" />
              <Select name="impacto" label="Impacto" hint="A cuántas personas o procesos afecta." defaultValue="MEDIO">
                {impactOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
              <Select name="urgencia" label="Urgencia" hint="Qué tan pronto debe resolverse." defaultValue="MEDIO">
                {impactOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
              <div className="md:col-span-2"><Textarea name="descripcion" label="Descripción" rows={4} required placeholder="Describe qué ocurrió y desde cuándo…" /></div>
              <div className="md:col-span-2"><Button type="submit" disabled={saving || !categories.data?.length}>{saving ? "Guardando…" : "Guardar incidencia"}</Button></div>
            </form>
          </Panel>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-md">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <Input aria-label="Buscar incidencias" className="pl-9" value={query} onChange={(event) => {
              setQuery(event.target.value)
              setPageIndex(0)
            }} placeholder="Buscar por código, título o persona…" />
          </div>
          {incidents.data && <p className="text-sm text-slate-600">{incidents.data.totalElements} {incidents.data.totalElements === 1 ? "incidencia" : "incidencias"}</p>}
        </div>

        <Panel className="overflow-hidden">
          {incidents.loading ? <LoadingNotice /> : incidents.error ? <div className="p-5"><ErrorNotice message={incidents.error} onRetry={() => void incidents.reload()} /></div> : pageItems.length === 0 ? (
            query
              ? <EmptyNotice title="Sin resultados">No hay incidencias que coincidan con «{query}».</EmptyNotice>
              : <EmptyNotice title="Aún no hay incidencias">{canCreate ? "Usa «Registrar incidencia» para crear la primera." : "Cuando te asignen una, aparecerá aquí."}</EmptyNotice>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pageItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    aria-label={`Abrir incidencia ${item.codigo}: ${item.titulo}`}
                    className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 text-left transition-colors hover:bg-slate-50"
                  >
                    <span className="min-w-60 flex-1">
                      <span className="block text-xs font-semibold text-slate-600">{item.codigo}</span>
                      <span className="mt-0.5 block truncate font-semibold text-slate-950">{item.titulo}</span>
                      <span className="mt-0.5 block truncate text-sm text-slate-600">{item.reportanteNombre} · Técnico: {item.tecnicoNombre || "sin asignar"} · {formatDate(item.creadoEn)}</span>
                    </span>
                    <PriorityLabel value={item.prioridad} />
                    <StatusPill value={item.estado} />
                    <Icon name="chevronRight" className="hidden size-5 text-slate-400 sm:block" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {incidents.data && incidents.data.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Página {incidents.data.number + 1} de {incidents.data.totalPages}
            </p>
            <div className="flex gap-2">
              <Button tone="quiet" size="sm" disabled={pageIndex === 0 || incidents.loading}
                onClick={() => setPageIndex((current) => Math.max(0, current - 1))}>
                Anterior
              </Button>
              <Button tone="quiet" size="sm" disabled={pageIndex + 1 >= incidents.data.totalPages || incidents.loading}
                onClick={() => setPageIndex((current) => current + 1)}>
                Siguiente
              </Button>
            </div>
          </div>
        )}
        {review && <ReviewDialog review={review} onClose={() => setReview(null)} />}
      </>
    )
  }

  return (
    <>
      {review && <ReviewDialog review={review} onClose={() => setReview(null)} />}
      <div className="mb-4">
        <Button tone="quiet" size="sm" onClick={closeDetails} className="-ml-3"><Icon name="arrowLeft" className="size-4" /> Volver a incidencias</Button>
      </div>
      {detailError ? <ErrorNotice message={detailError} /> : !detail ? <Panel><LoadingNotice /></Panel> : (
        <>
          <PageHeader
            title={detail.titulo}
            description={`${detail.codigo} · Creada ${formatDate(detail.creadoEn)}`}
            action={<><PriorityLabel value={detail.prioridad} /><StatusPill value={detail.estado} /></>}
          />
          {notice && <div className="mb-4"><Notice tone="success">{notice}</Notice></div>}
          {actionError && <div className="mb-4"><ErrorNotice message={actionError} /></div>}

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-6">
              <Panel title="Descripción">
                <p className="whitespace-pre-wrap p-5 text-sm leading-6 text-slate-700">{detail.descripcion}</p>
              </Panel>

              <Panel
                title="Actividad"
                description="Trabajo realizado por el técnico, de la más reciente a la más antigua."
                action={user?.rol === "TECNICO" ? (
                  <Button tone={activityFormOpen ? "neutral" : "primary"} size="sm" onClick={() => setActivityFormOpen((open) => !open)}>
                    {activityFormOpen ? "Cancelar" : <><Icon name="plus" className="size-4" /> Registrar actividad</>}
                  </Button>
                ) : undefined}
              >
                <div className="p-5">
                  {activityFormOpen && user?.rol === "TECNICO" && (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault()
                        const form = event.currentTarget
                        const data = new FormData(form)
                        setReview({
                          title: "¿Registrar esta actividad?",
                          items: [
                            ["Tipo", String(data.get("tipo"))],
                            ["Descripción", String(data.get("descripcion"))],
                            ["Tiempo", `${data.get("minutos")} min`],
                          ],
                          confirmLabel: "Registrar actividad",
                          run: () => runAction(
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
                          }),
                        })
                      }}
                      className="mb-5 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-[1fr_2fr_120px]"
                    >
                      <Input name="tipo" label="Tipo" required placeholder="Diagnóstico" />
                      <Input name="descripcion" label="Descripción" required placeholder="Trabajo realizado" />
                      <Input name="minutos" label="Minutos" type="number" required min={1} />
                      <div className="sm:col-span-3"><Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar actividad"}</Button></div>
                    </form>
                  )}
                  {activities.length ? (
                    <ol className="ml-1.5 border-l border-slate-200">
                      {activities.map((item) => (
                        <li key={item.id} className="relative pb-5 pl-6 last:pb-0">
                          <span className="absolute -left-[5px] top-1.5 size-2.5 rounded-full border-2 border-white bg-brand-600 ring-1 ring-brand-200" aria-hidden="true" />
                          <p className="font-semibold text-slate-900">{item.tipoActividad}</p>
                          <p className="mt-0.5 text-sm leading-6 text-slate-700">{item.descripcion}</p>
                          <p className="mt-1 text-xs text-slate-600">{item.tecnicoNombre} · {formatDate(item.creadoEn)} · {item.minutos} min</p>
                        </li>
                      ))}
                    </ol>
                  ) : <p className="text-sm text-slate-600">Todavía no hay actividad registrada.</p>}
                </div>
              </Panel>

              {canChat && (
                <Panel title="Chat de la incidencia" description="Conversación entre quien reportó y el técnico asignado." className="overflow-hidden">
                  <div className="max-h-80 min-h-40 space-y-4 overflow-auto bg-slate-50 p-5">
                    {messages.map((message) => {
                      const ownMessage = message.remitenteNombre === `${user?.nombres} ${user?.apellidos}`
                      return (
                        <div key={message.id} className={`max-w-[90%] sm:max-w-[78%] ${ownMessage ? "ml-auto text-right" : ""}`}>
                          <p className="mb-1 text-xs text-slate-600">{message.remitenteNombre} · {formatDate(message.creadoEn)}</p>
                          <div className={`inline-block rounded-2xl px-4 py-2.5 text-left text-sm leading-6 ${ownMessage ? "bg-brand-700 text-white" : "border border-slate-200 bg-white text-slate-800"}`}>
                            {message.contenido}
                          </div>
                        </div>
                      )
                    })}
                    {!messages.length && <p className="py-10 text-center text-sm text-slate-600">Aún no hay mensajes. Escribe el primero.</p>}
                  </div>
                  <form onSubmit={(event) => void sendMessage(event)} className="flex gap-2 border-t border-slate-100 p-4">
                    <div className="min-w-0 flex-1"><Input aria-label="Escribe un mensaje" value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder="Escribe un mensaje…" /></div>
                    <Button type="submit" disabled={saving || !chatDraft.trim()}><Icon name="send" className="size-4" /> Enviar</Button>
                  </form>
                </Panel>
              )}
            </div>

            <div className="space-y-6">
              <Panel title="Estado">
                <div className="space-y-4 p-5">
                  {Boolean(user?.rol && allowedTransitions[user.rol]) && (
                    transitions.length > 0 ? (
                      <div>
                        <p className="text-sm font-medium text-slate-700">Cambiar estado a</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {transitions.map((status) => (
                            <Button key={status} tone={nextStatus === status ? "primary" : "neutral"} size="sm" aria-pressed={nextStatus === status} onClick={() => setNextStatus((current) => current === status ? "" : status)}>
                              {statusLabels[status]}
                            </Button>
                          ))}
                        </div>
                        {nextStatus && (
                          <form
                            onSubmit={(event) => {
                              event.preventDefault()
                              const reason = String(new FormData(event.currentTarget).get("motivo"))
                              void runAction(() => incidentsApi.changeStatus(detail.id, nextStatus, reason), `Estado actualizado: ${statusLabels[nextStatus]}`)
                              setNextStatus("")
                            }}
                            className="mt-4 space-y-3"
                          >
                            <Input name="motivo" label={`Motivo para pasar a «${statusLabels[nextStatus]}»`} required placeholder="Describe el cambio" />
                            <div className="flex gap-2">
                              <Button type="submit" size="sm" disabled={saving}>{saving ? "Actualizando…" : "Confirmar cambio"}</Button>
                              <Button tone="quiet" size="sm" onClick={() => setNextStatus("")}>Cancelar</Button>
                            </div>
                          </form>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600">Con tu rol no puedes cambiar el estado desde «{statusLabels[detail.estado] || detail.estado}».</p>
                    )
                  )}
                </div>
              </Panel>

              <Panel title="Personas y detalles">
                <dl className="space-y-4 p-5 text-sm">
                  <div>
                    <dt className="text-slate-600">Solicitante</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900">{detail.reportanteNombre}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">Técnico asignado</dt>
                    <dd className="mt-1">
                      {privileged ? (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault()
                            const form = event.currentTarget
                            const id = String(new FormData(form).get("tecnicoId"))
                            const tech = technicians.data?.find((item) => item.id === id)
                            setReview({
                              title: "¿Asignar este técnico?",
                              items: [
                                ["Incidencia", `${detail.codigo} · ${detail.titulo}`],
                                ["Técnico", tech ? `${tech.nombres} ${tech.apellidos}` : ""],
                              ],
                              confirmLabel: "Asignar técnico",
                              run: () => runAction(() => incidentsApi.assign(detail.id, id), "Técnico asignado."),
                              onDismiss: () => form.reset(),
                            })
                          }}
                        >
                          <Select
                            aria-label="Técnico asignado"
                            name="tecnicoId"
                            hint="Te pediremos confirmar la asignación."
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
                      ) : <span className="font-semibold text-slate-900">{detail.tecnicoNombre || "Sin asignar"}</span>}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">Categoría</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900">{detail.categoriaNombre}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">Ubicación</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900">{detail.ubicacionNombre || "No especificada"}</dd>
                  </div>
                </dl>
              </Panel>

              <Panel
                title="Evidencias"
                action={
                  <label className={`${buttonClass("neutral", "sm")} cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600`}>
                    <Icon name="plus" className="size-4" /> Subir imagen
                    <input type="file" accept="image/*" className="sr-only" disabled={saving} onChange={(event) => void uploadFile(event.target.files?.[0])} />
                  </label>
                }
              >
                <div className="p-5">
                  {evidence.length ? (
                    <ul className="grid grid-cols-2 gap-3">
                      {evidence.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            className="block w-full rounded-xl border border-slate-200 p-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                            onClick={() => setEvidencePreview(item)}
                          >
                            {item.tipoMime.startsWith("image/") ? (
                              <img src={item.url} alt={item.nombreArchivo} className="h-24 w-full rounded-lg bg-slate-100 object-cover" />
                            ) : (
                              <span className="grid h-24 place-items-center rounded-lg bg-slate-100 text-slate-600"><Icon name="file" className="size-7" /></span>
                            )}
                            <span className="mt-2 block truncate text-xs font-medium text-slate-700">{item.nombreArchivo}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-slate-600">No hay evidencias adjuntas.</p>}
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}
      {evidencePreview && (
        <FilePreviewDialog
          name={evidencePreview.nombreArchivo}
          url={evidencePreview.url}
          mimeType={evidencePreview.tipoMime}
          onClose={() => setEvidencePreview(null)}
        />
      )}
    </>
  )
}
