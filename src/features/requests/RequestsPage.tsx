import { useState, type FormEvent } from "react"
import type { ReviewRequest } from "@/components/ui"
import { Button, ConfirmDialog, EmptyNotice, ErrorNotice, Input, LoadingNotice, Notice, PageHeader, Panel, ReasonDialog, ReviewDialog, Select, StatusPill, Textarea, formatDate } from "@/components/ui"
import { formatMoney } from "@/utils/format"
import { Icon } from "@/components/icons"
import { useAuth } from "@/features/auth/AuthProvider"
import { useAsync, errorMessage } from "@/hooks/useAsync"
import { incidentsApi } from "@/features/incidents/api"
import { assetsApi } from "@/features/assets/api"
import { inventoryApi } from "@/features/inventory/api"
import { requestsApi } from "./api"

type Pending =
  | { kind: "reason"; title: string; description?: string; label: string; required: boolean; confirmLabel: string; tone?: "primary" | "danger"; success: string; run: (text: string) => Promise<unknown> }
  | { kind: "confirm"; title: string; message: string; confirmLabel: string; success: string; run: () => Promise<unknown> }

export function RequestsPage() {
  const { user } = useAuth()
  const requests = useAsync(requestsApi.list, [])
  const incidents = useAsync(incidentsApi.list, [])
  const assets = useAsync(assetsApi.list, [])
  const components = useAsync(inventoryApi.list, [])
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [review, setReview] = useState<ReviewRequest | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)

  async function act(action: () => Promise<unknown>, message: string): Promise<boolean> {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await action()
      setNotice(message)
      await requests.reload()
      return true
    } catch (caught) {
      setError(errorMessage(caught))
      return false
    } finally {
      setBusy(false)
    }
  }

  function askCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const inc = incidents.data?.find((i) => i.id === form.get("incidenciaId"))
    const comp = components.data?.find((c) => c.id === form.get("componenteId"))
    const asset = assets.data?.find((a) => a.id === form.get("activoId"))
    setReview({
      title: "¿Enviar esta solicitud de cambio?",
      description: "Pasará a evaluación. Revisa que los datos sean correctos.",
      items: [
        ["Incidencia", inc ? `${inc.codigo} · ${inc.titulo}` : ""],
        ["Componente", comp ? `${comp.codigo} · ${comp.nombre}` : ""],
        ["Activo", asset ? `${asset.codigo} · ${asset.nombre}` : ""],
        ["Costo estimado", formatMoney(Number(form.get("costoEstimado")))],
        ["Descripción", String(form.get("descripcion"))],
        ["Justificación", String(form.get("justificacion"))],
      ],
      confirmLabel: "Enviar solicitud",
      run: () => create(form),
    })
  }

  async function create(form: FormData) {
    const created = await act(() => requestsApi.create({
      incidenciaId: String(form.get("incidenciaId")),
      componenteId: String(form.get("componenteId") || "") || undefined,
      activoId: String(form.get("activoId") || "") || undefined,
      descripcion: String(form.get("descripcion")),
      justificacion: String(form.get("justificacion")),
      costoEstimado: Number(form.get("costoEstimado")),
    }), "Solicitud de cambio creada.")
    if (created) setCreating(false)
  }

  async function confirmPending(text?: string) {
    if (!pending) return
    const current = pending
    await act(() => (current.kind === "reason" ? current.run(text ?? "") : current.run()), current.success)
    setPending(null)
  }

  const role = user?.rol || ""
  const canCreate = role === "TECNICO"

  return (
    <>
      <PageHeader
        title="Solicitudes de cambio"
        description="Cada solicitud pasa por evaluación, aprobación de gerencia y ejecución."
        action={canCreate ? (
          <Button tone={creating ? "neutral" : "primary"} onClick={() => setCreating((value) => !value)}>
            {creating ? "Cancelar" : <><Icon name="plus" className="size-4" /> Crear solicitud</>}
          </Button>
        ) : undefined}
      />
      {notice && <div className="mb-4"><Notice tone="success">{notice}</Notice></div>}
      {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
      {creating && (
        <Panel title="Nueva solicitud" description="Vincúlala a una incidencia y, si aplica, a un activo o componente." className="mb-6">
          <form onSubmit={askCreate} className="grid gap-4 p-5 md:grid-cols-2">
            <Select label="Incidencia" name="incidenciaId" required defaultValue="">
              <option value="" disabled>Selecciona una incidencia</option>
              {incidents.data?.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.titulo}</option>)}
            </Select>
            <Input label="Costo estimado (S/)" name="costoEstimado" type="number" step="0.01" min="0" required />
            <Select label="Componente" hint="Opcional." name="componenteId" defaultValue="">
              <option value="">Sin componente</option>
              {components.data?.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}</option>)}
            </Select>
            <Select label="Activo" hint="Opcional." name="activoId" defaultValue="">
              <option value="">Sin activo</option>
              {assets.data?.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}</option>)}
            </Select>
            <div className="md:col-span-2"><Input label="Descripción" hint="Qué se necesita cambiar o reemplazar." name="descripcion" required /></div>
            <div className="md:col-span-2"><Textarea label="Justificación" hint="Por qué es necesario este cambio." name="justificacion" required rows={3} /></div>
            {incidents.error && <p className="text-sm text-rose-700 md:col-span-2">{incidents.error}</p>}
            <div className="md:col-span-2"><Button type="submit" disabled={busy || !incidents.data?.length}>{busy ? "Enviando…" : "Crear solicitud"}</Button></div>
          </form>
        </Panel>
      )}
      <Panel title="Bandeja de solicitudes" description={requests.data ? `${requests.data.length} ${requests.data.length === 1 ? "solicitud" : "solicitudes"}` : undefined}>
        {requests.loading ? <LoadingNotice /> : requests.error ? <div className="p-5"><ErrorNotice message={requests.error} onRetry={() => void requests.reload()} /></div> : !requests.data?.length ? <EmptyNotice title="No hay solicitudes">Cuando un técnico cree una, aparecerá aquí.</EmptyNotice> : (
          <ul className="divide-y divide-slate-100">
            {requests.data.map((item) => {
              const canEvaluate = ["ADMIN", "SUPERVISOR"].includes(role) && item.estado === "PENDIENTE_EVALUACION"
              const canManage = ["ADMIN", "GERENCIA"].includes(role) && item.estado === "PENDIENTE_GERENCIA"
              const canExecute = ["ADMIN", "TECNICO"].includes(role) && item.estado === "APROBADA"
              return (
                <li key={item.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600">{item.codigo}</span>
                      <StatusPill value={item.estado} />
                    </div>
                    <h3 className="mt-1.5 font-semibold text-slate-950">{item.descripcion}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.incidenciaCodigo} · {item.componenteNombre || item.activoCodigo || "Sin recurso indicado"} · Solicita {item.solicitadoPorNombre}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-600">{formatMoney(item.costoEstimado)} · {formatDate(item.creadoEn)}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{item.justificacion}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {canEvaluate && (
                      <>
                        <Button tone="neutral" disabled={busy} onClick={() => setPending({
                          kind: "reason", title: "Rechazar solicitud", description: `${item.codigo} · ${item.descripcion}`, label: "Motivo del rechazo", required: true, confirmLabel: "Rechazar solicitud", tone: "danger", success: "Solicitud rechazada.",
                          run: (text) => requestsApi.evaluate(item.id, false, undefined, text),
                        })}>Rechazar</Button>
                        <Button disabled={busy} onClick={() => setPending({
                          kind: "reason", title: "Aprobar evaluación", description: `${item.codigo} · pasará a aprobación de gerencia.`, label: "Comentario de evaluación", required: false, confirmLabel: "Aprobar evaluación", success: "Solicitud evaluada.",
                          run: (text) => requestsApi.evaluate(item.id, true, text),
                        })}>Aprobar evaluación</Button>
                      </>
                    )}
                    {canManage && (
                      <>
                        <Button tone="neutral" disabled={busy} onClick={() => setPending({
                          kind: "reason", title: "Rechazar solicitud", description: `${item.codigo} · ${item.descripcion}`, label: "Motivo del rechazo", required: true, confirmLabel: "Rechazar solicitud", tone: "danger", success: "Solicitud rechazada por gerencia.",
                          run: (text) => requestsApi.rejectManagement(item.id, text),
                        })}>Rechazar</Button>
                        <Button disabled={busy} onClick={() => setPending({
                          kind: "reason", title: "Aprobar solicitud", description: `${item.codigo} · ${formatMoney(item.costoEstimado)}`, label: "Comentario de gerencia", required: false, confirmLabel: "Aprobar solicitud", success: "Solicitud aprobada por gerencia.",
                          run: (text) => requestsApi.approveManagement(item.id, text),
                        })}>Aprobar</Button>
                      </>
                    )}
                    {canExecute && (
                      <Button disabled={busy} onClick={() => setPending({
                        kind: "confirm", title: "Marcar como ejecutada", message: "La solicitud se marcará como ejecutada sin registrar número de serie ni minutos de trabajo.", confirmLabel: "Marcar como ejecutada", success: "Solicitud marcada como ejecutada.",
                        run: () => requestsApi.execute(item.id),
                      })}>Marcar como ejecutada</Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
      {review && <ReviewDialog review={review} onClose={() => setReview(null)} />}
      {pending?.kind === "reason" && (
        <ReasonDialog title={pending.title} description={pending.description} label={pending.label} required={pending.required} confirmLabel={pending.confirmLabel} tone={pending.tone} busy={busy} onSubmit={(text) => void confirmPending(text)} onCancel={() => setPending(null)} />
      )}
      {pending?.kind === "confirm" && (
        <ConfirmDialog title={pending.title} message={pending.message} confirmLabel={pending.confirmLabel} busy={busy} onConfirm={() => void confirmPending()} onCancel={() => setPending(null)} />
      )}
    </>
  )
}
