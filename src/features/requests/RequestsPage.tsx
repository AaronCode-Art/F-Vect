import { useState, type FormEvent } from "react"
import { Button, EmptyNotice, ErrorNotice, Input, LoadingNotice, PageHeader, Panel, Select, StatusPill, Textarea, formatDate } from "@/components/ui"
import { useAuth } from "@/features/auth/AuthProvider"
import { useAsync, errorMessage } from "@/hooks/useAsync"
import { incidentsApi } from "@/features/incidents/api"
import { assetsApi } from "@/features/assets/api"
import { inventoryApi } from "@/features/inventory/api"
import { requestsApi } from "./api"

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

  async function act(action: () => Promise<unknown>, message: string) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await action()
      setNotice(message)
      await requests.reload()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await act(() => requestsApi.create({
      incidenciaId: String(form.get("incidenciaId")),
      componenteId: String(form.get("componenteId") || "") || undefined,
      activoId: String(form.get("activoId") || "") || undefined,
      descripcion: String(form.get("descripcion")),
      justificacion: String(form.get("justificacion")),
      costoEstimado: Number(form.get("costoEstimado")),
    }), "Solicitud de cambio creada.")
    setCreating(false)
  }

  const canCreate = user?.rol === "TECNICO"
  return (
    <>
      <PageHeader title="Solicitudes de cambio" description="Solicitudes, evaluación, aprobación gerencial y ejecución." action={canCreate ? <Button onClick={() => setCreating((value) => !value)}>{creating ? "Cancelar" : "+ Crear solicitud"}</Button> : undefined} />
      {notice && <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
      {creating && <Panel title="Nueva solicitud" description="Se relaciona con una incidencia y un activo o componente existentes." className="mb-5">
        <form onSubmit={(event) => void create(event)} className="grid gap-4 p-5 md:grid-cols-2">
          <Select label="Incidencia" name="incidenciaId" required defaultValue=""><option value="" disabled>Selecciona incidencia</option>{incidents.data?.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.titulo}</option>)}</Select>
          <Select label="Componente (opcional)" name="componenteId" defaultValue=""><option value="">Sin componente</option>{components.data?.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}</option>)}</Select>
          <Select label="Activo (opcional)" name="activoId" defaultValue=""><option value="">Sin activo</option>{assets.data?.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}</option>)}</Select>
          <Input label="Costo estimado" name="costoEstimado" type="number" step="0.01" min="0" required />
          <Input label="Descripción" name="descripcion" required />
          <Textarea label="Justificación" name="justificacion" required rows={3} className="md:col-span-2" />
          <div className="flex justify-end md:col-span-2"><Button disabled={busy || !incidents.data?.length}>{busy ? "Enviando…" : "Crear solicitud"}</Button></div>
          {incidents.error && <p className="text-xs text-rose-700 md:col-span-2">{incidents.error}</p>}
        </form>
      </Panel>}
      <Panel title="Bandeja de solicitudes" description={requests.data ? `${requests.data.length} registros desde la API` : undefined}>
        {requests.loading ? <LoadingNotice /> : requests.error ? <div className="p-4"><ErrorNotice message={requests.error} onRetry={() => void requests.reload()} /></div> : !requests.data?.length ? <EmptyNotice /> : (
          <div className="divide-y divide-slate-100">
            {requests.data.map((item) => <article key={item.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-lg text-amber-700">▣</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-emerald-700">{item.codigo}</span><StatusPill value={item.estado} /></div>
                <h3 className="mt-1 font-bold">{item.descripcion}</h3>
                <p className="mt-1 text-xs text-slate-500">{item.incidenciaCodigo} · {item.componenteNombre || item.activoCodigo || "Recurso indicado"} · {item.solicitadoPorNombre}</p>
                <p className="mt-1 text-xs text-slate-400">S/{Number(item.costoEstimado).toLocaleString("es-PE")} · {formatDate(item.creadoEn)}</p>
                <p className="mt-2 text-sm text-slate-600">{item.justificacion}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {user?.rol && ["ADMIN", "SUPERVISOR"].includes(user.rol) && item.estado === "PENDIENTE_EVALUACION" && <>
                  <Button tone="neutral" disabled={busy} onClick={() => {
                    const motivoRechazo = window.prompt("Motivo del rechazo")
                    if (motivoRechazo?.trim()) void act(() => requestsApi.evaluate(item.id, false, undefined, motivoRechazo), "Solicitud rechazada.")
                  }}>Rechazar</Button>
                  <Button disabled={busy} onClick={() => {
                    const comentario = window.prompt("Comentario de evaluación") || ""
                    void act(() => requestsApi.evaluate(item.id, true, comentario), "Solicitud evaluada.")
                  }}>Evaluar / aprobar</Button>
                </>}
                {user?.rol && ["ADMIN", "GERENCIA"].includes(user.rol) && item.estado === "PENDIENTE_GERENCIA" && <>
                  <Button tone="neutral" disabled={busy} onClick={() => {
                    const motivo = window.prompt("Motivo del rechazo gerencial")
                    if (motivo?.trim()) void act(() => requestsApi.rejectManagement(item.id, motivo), "Solicitud rechazada por gerencia.")
                  }}>Rechazar</Button>
                  <Button disabled={busy} onClick={() => void act(() => requestsApi.approveManagement(item.id, window.prompt("Comentario gerencial") || ""), "Solicitud aprobada por gerencia.")}>Aprobar gerencia</Button>
                </>}
                {user?.rol && ["ADMIN", "TECNICO"].includes(user.rol) && item.estado === "APROBADA" && <Button disabled={busy} onClick={() => {
                  if (window.confirm("¿Confirmas la ejecución? Esta API no recibe serie ni minutos; se ejecuta el cambio sin esos campos adicionales.")) void act(() => requestsApi.execute(item.id), "Solicitud marcada como ejecutada.")
                }}>Ejecutar</Button>}
              </div>
            </article>)}
          </div>
        )}
      </Panel>
    </>
  )
}
