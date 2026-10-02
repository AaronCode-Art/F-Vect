import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { Button, EmptyNotice, ErrorNotice, Input, LoadingNotice, Select, formatDate, formatRole } from "@/components/ui"
import { useAuth } from "@/features/auth/AuthProvider"
import { useAsync, errorMessage } from "@/hooks/useAsync"
import { messagesApi } from "./api"
import type { ApiRole, ConversationMessage } from "@/types/api"

const roles: ApiRole[] = ["ADMIN", "GERENCIA", "SUPERVISOR", "TECNICO", "EMPLEADO"]

export function MessagesPage() {
  const { user } = useAuth()
  const conversations = useAsync(messagesApi.conversations, [])
  const participants = useAsync(messagesApi.participants, [])
  const [selected, setSelected] = useState<string | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [conversationType, setConversationType] = useState<"PRIVADA" | "GRUPAL">("PRIVADA")
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([])
  const [participantRole, setParticipantRole] = useState<ApiRole | "TODOS">("TODOS")
  const [participantSearch, setParticipantSearch] = useState("")
  const [participantToAdd, setParticipantToAdd] = useState("")
  const [saving, setSaving] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [attachmentDescription, setAttachmentDescription] = useState("")
  const [attachOpen, setAttachOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyFrom, setHistoryFrom] = useState("")
  const [historyTo, setHistoryTo] = useState("")
  const [appliedHistoryRange, setAppliedHistoryRange] = useState<{ from: string; to: string } | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  const availableParticipants = useMemo(() => (participants.data || []).filter((person) => {
    const matchesRole = participantRole === "TODOS" || person.rol === participantRole
    const matchesSearch = `${person.nombre} ${person.correo}`.toLowerCase().includes(participantSearch.toLowerCase())
    return matchesRole && matchesSearch
  }), [participants.data, participantRole, participantSearch])
  const selectedParticipants = (participants.data || []).filter((person) => selectedParticipantIds.includes(person.id))
  const visibleMessages = useMemo(() => {
    if (!appliedHistoryRange) return messages
    const from = appliedHistoryRange.from
      ? new Date(`${appliedHistoryRange.from}T00:00:00`)
      : null
    const toExclusive = appliedHistoryRange.to
      ? new Date(`${appliedHistoryRange.to}T00:00:00`)
      : null
    if (toExclusive) toExclusive.setDate(toExclusive.getDate() + 1)
    return messages.filter((message) => {
      const createdAt = new Date(message.creadoEn)
      return (!from || createdAt >= from) && (!toExclusive || createdAt < toExclusive)
    })
  }, [messages, appliedHistoryRange])

  useEffect(() => {
    setMessages([])
    if (!selected) return
    let current = true
    setLoading(true)
    setError(null)
    messagesApi.messages(selected).then((items) => {
      if (current) setMessages(items)
    }).catch((caught: unknown) => {
      if (current) setError(errorMessage(caught))
    }).finally(() => {
      if (current) setLoading(false)
    })
    return () => { current = false }
  }, [selected])

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || (!draft.trim() && !attachment)) return
    setError(null)
    setSaving(true)
    try {
      const message = attachment
        ? await messagesApi.sendFile(selected, attachment, draft.trim())
        : await messagesApi.send(selected, draft.trim())
      setMessages((items) => [...items, message])
      setDraft("")
      setAttachment(null)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  async function createConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setSaving(true)
    setError(null)
    try {
      const conversation = await messagesApi.createConversation({
        tipo: conversationType,
        nombre: conversationType === "GRUPAL" ? String(data.get("nombre") || "").trim() : undefined,
        participantes: selectedParticipantIds,
      })
      setCreateOpen(false)
      setSelectedParticipantIds([])
      setParticipantToAdd("")
      await conversations.reload()
      selectConversation(conversation.id)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  function addParticipant() {
    if (!participantToAdd) return
    setSelectedParticipantIds((current) => conversationType === "PRIVADA"
      ? [participantToAdd]
      : current.includes(participantToAdd) ? current : [...current, participantToAdd])
    setParticipantToAdd("")
  }

  function removeParticipant(id: string) {
    setSelectedParticipantIds((current) => current.filter((participantId) => participantId !== id))
  }

  function openHistory() {
    setHistoryFrom(appliedHistoryRange?.from || "")
    setHistoryTo(appliedHistoryRange?.to || "")
    setHistoryError(null)
    setHistoryOpen(true)
  }

  function applyHistoryRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (historyFrom && historyTo && historyFrom > historyTo) {
      setHistoryError("La fecha Desde no puede ser posterior a Hasta.")
      return
    }
    setAppliedHistoryRange(historyFrom || historyTo ? { from: historyFrom, to: historyTo } : null)
    setHistoryOpen(false)
    setHistoryError(null)
    requestAnimationFrame(() => timelineRef.current?.scrollTo({ top: 0, behavior: "smooth" }))
  }

  function selectConversation(id: string) {
    setAppliedHistoryRange(null)
    setHistoryFrom("")
    setHistoryTo("")
    setSelected(id)
  }

  const active = conversations.data?.find((item) => item.id === selected)
  const activeTitle = active?.nombre
    || active?.participantes.filter((person) => person.id !== user?.id).map((person) => person.nombre).join(", ")
  const createConversationDialog = createOpen && (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) setCreateOpen(false)
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="create-conversation-title" className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-600">VECT</p>
            <h2 id="create-conversation-title" className="mt-1 text-lg font-bold text-slate-950">Nueva conversación</h2>
            <p className="mt-1 text-xs text-slate-500">Busca integrantes por cargo y agrégalos a la conversación.</p>
          </div>
          <button type="button" aria-label="Cerrar" disabled={saving} onClick={() => setCreateOpen(false)} className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">×</button>
        </div>
        <form onSubmit={(event) => void createConversation(event)} className="grid gap-4 p-6 md:grid-cols-2">
          <Select
            label="Tipo de conversación"
            value={conversationType}
            onChange={(event) => {
              const nextType = event.target.value as "PRIVADA" | "GRUPAL"
              setConversationType(nextType)
              setSelectedParticipantIds((current) => nextType === "PRIVADA" ? current.slice(0, 1) : current)
            }}
          >
            <option value="PRIVADA">Directa · una persona</option>
            <option value="GRUPAL">Grupal · varios integrantes</option>
          </Select>
          {conversationType === "GRUPAL" && <Input label="Nombre del grupo" name="nombre" required maxLength={180} placeholder="Ej. Coordinación de soporte" />}
          {participants.loading ? <LoadingNotice /> : participants.error ? <div className="md:col-span-2"><ErrorNotice message={participants.error} onRetry={() => void participants.reload()} /></div> : (
            <div className="grid gap-3 rounded-xl border border-slate-200 p-4 md:col-span-2">
              <div className="grid gap-3 md:grid-cols-2">
                <Select label="Filtrar por cargo" value={participantRole} onChange={(event) => setParticipantRole(event.target.value as ApiRole | "TODOS")}>
                  <option value="TODOS">Todos los cargos</option>
                  {roles.map((role) => <option value={role} key={role}>{formatRole(role)}</option>)}
                </Select>
                <Input label="Buscar integrante" value={participantSearch} onChange={(event) => setParticipantSearch(event.target.value)} placeholder="Nombre o correo…" />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <Select label="Integrante" value={participantToAdd} onChange={(event) => setParticipantToAdd(event.target.value)} className="flex-1">
                  <option value="">Selecciona una persona</option>
                  {availableParticipants
                    .filter((person) => conversationType === "PRIVADA" || !selectedParticipantIds.includes(person.id))
                    .map((person) => <option value={person.id} key={person.id}>{person.nombre} · {formatRole(person.rol)} · {person.correo}</option>)}
                </Select>
                <Button type="button" tone="neutral" onClick={addParticipant} disabled={!participantToAdd}>
                  {conversationType === "GRUPAL" ? "+ Agregar integrante" : "Seleccionar"}
                </Button>
              </div>
              {selectedParticipants.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {selectedParticipants.map((person) => (
                    <li key={person.id} className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs text-emerald-900">
                      <span>{person.nombre} · {formatRole(person.rol)}</span>
                      <button type="button" aria-label={`Quitar a ${person.nombre}`} onClick={() => removeParticipant(person.id)} className="font-bold text-emerald-700 hover:text-rose-700">×</button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-slate-500">Todavía no has seleccionado participantes.</p>}
            </div>
          )}
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button type="button" tone="quiet" onClick={() => setCreateOpen(false)} disabled={saving}>Cancelar</Button>
            <Button disabled={saving || participants.loading || selectedParticipantIds.length === 0 || (conversationType === "PRIVADA" && selectedParticipantIds.length !== 1)}>
              {saving ? "Creando…" : "Crear conversación"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  )

  const attachmentDialog = attachOpen && (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) setAttachOpen(false)
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="attach-file-title" className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between px-6 pt-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-600">VECT</p>
            <h2 id="attach-file-title" className="mt-1 text-lg font-bold text-slate-950">Adjuntar archivo</h2>
            <p className="mt-1 text-xs text-slate-500">Selecciona un archivo para enviarlo con el mensaje.</p>
          </div>
          <button type="button" aria-label="Cerrar" onClick={() => setAttachOpen(false)} className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">×</button>
        </div>
        <div className="grid gap-4 px-6 py-5">
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-600">Archivo</span>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              className="block w-full rounded-xl border border-slate-200 text-sm text-slate-600 file:mr-3 file:h-10 file:border-0 file:border-r file:border-slate-200 file:bg-slate-50 file:px-3 file:text-xs file:font-semibold file:text-slate-700"
              onChange={(event) => {
                const file = event.target.files?.[0] || null
                if (file && file.size > 8 * 1024 * 1024) {
                  setError("El archivo no puede superar los 8 MB.")
                  setAttachment(null)
                } else {
                  setError(null)
                  setAttachment(file)
                }
              }}
            />
            <span className="mt-1 block text-[10px] text-slate-400">Imágenes, PDF, Word, Excel, PowerPoint o texto · máximo 8 MB.</span>
          </label>
          <Input label="Descripción" value={attachmentDescription} onChange={(event) => setAttachmentDescription(event.target.value)} placeholder="Describe brevemente el archivo" maxLength={500} />
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button type="button" tone="quiet" onClick={() => setAttachOpen(false)}>Cancelar</Button>
          <Button type="button" onClick={() => {
            if (!attachment) {
              setError("Selecciona un archivo para adjuntar.")
              return
            }
            if (attachmentDescription.trim()) setDraft(attachmentDescription.trim())
            setAttachOpen(false)
          }} disabled={!attachment}>Adjuntar</Button>
        </div>
      </section>
    </div>
  )

  const historyDialog = historyOpen && (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setHistoryOpen(false)
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="conversation-history-title" className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between px-6 pt-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-600">VECT</p>
            <h2 id="conversation-history-title" className="mt-1 text-lg font-bold text-slate-950">Historial de conversación</h2>
            <p className="mt-1 text-xs text-slate-500">{activeTitle}</p>
          </div>
          <button type="button" aria-label="Cerrar" onClick={() => setHistoryOpen(false)} className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">×</button>
        </div>
        <form onSubmit={applyHistoryRange} className="grid gap-4 px-6 py-5">
          <Input label="Desde" type="date" value={historyFrom} max={historyTo || undefined} onChange={(event) => setHistoryFrom(event.target.value)} />
          <Input label="Hasta" type="date" value={historyTo} min={historyFrom || undefined} onChange={(event) => setHistoryTo(event.target.value)} />
          {historyError && <p role="alert" className="text-xs font-medium text-rose-700">{historyError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" tone="quiet" onClick={() => setHistoryOpen(false)}>Cancelar</Button>
            <Button>Aplicar período</Button>
          </div>
        </form>
      </section>
    </div>
  )

  return (
    <>
      {error && <div className="mb-3"><ErrorNotice message={error} /></div>}
      <section className="grid h-[calc(100dvh-8.5rem)] min-h-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-[280px_minmax(0,1fr)]">
        <aside className={`${selected ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-slate-200`}>
          <div className="px-4 pb-3 pt-5">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">Conversaciones</p>
            <button type="button" onClick={() => setCreateOpen(true)} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800">
              <span aria-hidden="true">＋</span> Nueva conversación
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
            {conversations.loading ? <LoadingNotice /> : conversations.error ? <ErrorNotice message={conversations.error} onRetry={() => void conversations.reload()} /> : !conversations.data?.length ? <EmptyNotice>Aún no tienes conversaciones.</EmptyNotice> : conversations.data.map((conversation) => {
              const isGroup = conversation.tipo === "GRUPAL"
              const title = conversation.nombre || conversation.participantes.filter((person) => person.id !== user?.id).map((person) => person.nombre).join(", ")
              return (
                <button key={conversation.id} type="button" onClick={() => selectConversation(conversation.id)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${selected === conversation.id ? "bg-emerald-50" : "hover:bg-slate-50"}`}>
                  <span className={`grid size-9 shrink-0 place-items-center rounded-full ${isGroup ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"}`} aria-hidden="true">{isGroup ? "▱" : "♙"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{title || "Conversación"}</span>
                    <span className="mt-1 block truncate text-[10px] text-slate-400">{isGroup ? `Grupo · ${conversation.participantes.length} integrantes` : "Conversación directa"} · {formatDate(conversation.actualizadoEn)}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </aside>
        <div className={`${selected ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-col bg-white`}>
          {active ? (
            <>
              <header className="flex min-h-[72px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 md:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <button type="button" className="shrink-0 rounded-lg px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 md:hidden" onClick={() => setSelected(null)} aria-label="Volver a conversaciones">Volver</button>
                  <div className="min-w-0">
                    <h1 className="truncate text-sm font-bold text-slate-950">{activeTitle}</h1>
                    <p className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-emerald-600"><span className="size-1.5 rounded-full bg-emerald-500" />Canal activo · {active.tipo === "GRUPAL" ? `${active.participantes.length} integrantes` : "Directa"}</p>
                  </div>
                </div>
                <button type="button" onClick={openHistory} className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50">Ver historial</button>
              </header>
              <div ref={timelineRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/50 p-4 md:p-5">
                {loading ? <LoadingNotice /> : visibleMessages.length ? visibleMessages.map((message) => {
            const ownMessage = message.remitenteId === user?.id
            return (
              <article key={message.id} className={`max-w-[88%] rounded-2xl border px-4 py-3 shadow-sm sm:max-w-[78%] ${ownMessage ? "ml-auto rounded-br-md border-emerald-600 bg-emerald-600 text-white" : "rounded-bl-md border-slate-200 bg-white text-slate-800"}`}>
                <p className={`mb-1.5 text-[10px] font-semibold ${ownMessage ? "text-emerald-100" : "text-slate-400"}`}>{message.remitenteNombre}</p>
                {message.archivoUrl && message.archivoNombre && (
                  message.archivoTipoMime?.startsWith("image/") ? (
                    <a href={message.archivoUrl} target="_blank" rel="noreferrer" className="mb-2 block">
                      <img src={message.archivoUrl} alt={message.archivoNombre} className="max-h-64 rounded-lg object-contain" />
                    </a>
                  ) : (
                    <a href={message.archivoUrl} target="_blank" rel="noreferrer" className={`mb-2 flex items-center gap-2 rounded-lg p-2 text-xs underline ${ownMessage ? "bg-emerald-700 text-white" : "bg-slate-50 text-slate-700"}`}>
                      <span aria-hidden="true">▤</span><span className="truncate">{message.archivoNombre}</span>
                    </a>
                  )
                )}
                {message.cuerpo !== message.archivoNombre && <p className="text-sm leading-5">{message.cuerpo}</p>}
                <time dateTime={message.creadoEn} className={`mt-2 block text-right text-[10px] ${ownMessage ? "text-emerald-100" : "text-slate-400"}`}>{formatDate(message.creadoEn)}</time>
              </article>
            )
          }) : <div className="grid min-h-full place-items-center text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-full bg-emerald-50 text-lg text-emerald-600">▱</span><p className="mt-3 text-sm font-semibold text-slate-700">{messages.length ? "No hay mensajes en ese período" : "Aún no hay mensajes"}</p><p className="mt-1 text-xs text-slate-400">{messages.length ? "Elige otras fechas para consultar el historial." : "Envía el primer mensaje de esta conversación."}</p>{messages.length > 0 && appliedHistoryRange && <button type="button" onClick={() => setAppliedHistoryRange(null)} className="mt-3 text-xs font-semibold text-emerald-700 hover:text-emerald-800">Quitar filtro de fechas</button>}</div></div>}
              </div>
              <form onSubmit={(event) => void send(event)} className="border-t border-slate-100 bg-white p-3 md:p-4">
                {attachment && <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"><span className="truncate">{attachment.name} · {(attachment.size / 1024 / 1024).toFixed(1)} MB</span><button type="button" onClick={() => setAttachment(null)} className="ml-3 font-bold text-slate-500 hover:text-rose-600" aria-label="Quitar archivo">×</button></div>}
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" tone="neutral" className="size-11 shrink-0 px-0" aria-label="Adjuntar archivo" onClick={() => { setError(null); setAttachOpen(true) }} disabled={saving}><span aria-hidden="true">▤</span></Button>
                  <Input aria-label="Mensaje" className="min-w-40 flex-1" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Escribe un mensaje…" />
                  <Button className="shrink-0 bg-slate-950 hover:bg-slate-800" disabled={saving || (!draft.trim() && !attachment)}>{saving ? "Enviando…" : "Enviar"}</Button>
                </div>
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-6 text-center">
              {conversations.loading ? <LoadingNotice /> : <div><span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-xl text-emerald-600">▱</span><p className="mt-3 text-sm font-semibold text-slate-700">Selecciona una conversación</p><p className="mt-1 text-xs text-slate-400">Elige una de la lista o inicia una conversación nueva.</p></div>}
            </div>
          )}
        </div>
      </section>
      {createConversationDialog}
      {attachmentDialog}
      {historyDialog}
    </>
  )
}
