import { useState, type FormEvent } from "react"
import { Button, EmptyNotice, ErrorNotice, Input, LoadingNotice, PageHeader, Panel, Textarea, formatDate } from "@/components/ui"
import { errorMessage, useAsync } from "@/hooks/useAsync"
import { adminApi } from "./api"

export function ParametersPage() {
  const parameters = useAsync(adminApi.parameters, [])
  const [error, setError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  async function save(key: string, raw: string) {
    setError(null)
    setBusyKey(key)
    try {
      const value = JSON.parse(raw) as unknown
      await adminApi.updateParameter(key, value)
      await parameters.reload()
    } catch (caught) {
      setError(caught instanceof SyntaxError ? "El valor debe ser JSON válido." : errorMessage(caught))
    } finally {
      setBusyKey(null)
    }
  }
  return (
    <>
      <PageHeader title="Parámetros" description="Configuración almacenada en los parámetros del sistema." />
      {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
      <Panel title="Parámetros disponibles">
        {parameters.loading ? <LoadingNotice /> : parameters.error ? <div className="p-4"><ErrorNotice message={parameters.error} onRetry={() => void parameters.reload()} /></div> : !parameters.data?.length ? <EmptyNotice /> : <div className="divide-y divide-slate-100">{parameters.data.map((item) => <ParameterRow key={item.clave} item={item} saving={busyKey === item.clave} onSave={save} />)}</div>}
      </Panel>
    </>
  )
}

function ParameterRow({ item, saving, onSave }: { item: { clave: string; valor: unknown; descripcion?: string | null; actualizadoEn?: string | null }; saving: boolean; onSave: (key: string, value: string) => void }) {
  const [value, setValue] = useState(JSON.stringify(item.valor, null, 2))
  return <form onSubmit={(event) => { event.preventDefault(); onSave(item.clave, value) }} className="grid gap-3 p-5 lg:grid-cols-[1fr_2fr_auto]">
    <div><p className="font-bold">{item.clave}</p><p className="mt-1 text-xs text-slate-500">{item.descripcion || "Sin descripción"}</p><p className="mt-1 text-[10px] text-slate-400">{formatDate(item.actualizadoEn)}</p></div>
    <textarea value={value} onChange={(event) => setValue(event.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 p-3 font-mono text-xs outline-none focus:border-emerald-400" aria-label={`Valor ${item.clave}`} />
    <Button className="self-center" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
  </form>
}

export function AutomationPage() {
  const rules = useAsync(adminApi.rules, [])
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setSaving(true)
    setError(null)
    try {
      await adminApi.createRule({
        nombre: String(data.get("nombre")),
        descripcion: String(data.get("descripcion")),
        nombreEvento: String(data.get("nombreEvento")),
        condiciones: JSON.parse(String(data.get("condiciones") || "{}")) as unknown,
        acciones: JSON.parse(String(data.get("acciones") || "[]")) as unknown,
        prioridad: Number(data.get("prioridad")),
        activo: true,
      })
      await rules.reload()
      setOpen(false)
    } catch (caught) {
      setError(caught instanceof SyntaxError ? "Condiciones y acciones deben ser JSON válido." : errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title="Automatización" description="Administración de reglas existentes. El backend expone CRUD de configuración, no un motor que las ejecute." action={<Button onClick={() => setOpen((value) => !value)}>{open ? "Cancelar" : "+ Nueva regla"}</Button>} />
      {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
      {open && <Panel title="Crear regla"><form onSubmit={(event) => void create(event)} className="grid gap-4 p-5 md:grid-cols-2">
        <Input label="Nombre" name="nombre" required maxLength={180} /><Input label="Evento" name="nombreEvento" required maxLength={100} placeholder="INCIDENCIA_CREADA" />
        <Input label="Prioridad" name="prioridad" type="number" min={0} defaultValue={0} /><Input label="Descripción" name="descripcion" />
        <Textarea label="Condiciones JSON (objeto)" name="condiciones" defaultValue="{}" rows={4} className="font-mono text-xs" />
        <Textarea label="Acciones JSON (arreglo)" name="acciones" defaultValue="[]" rows={4} className="font-mono text-xs" />
        <Button disabled={saving}>{saving ? "Guardando…" : "Crear regla"}</Button>
      </form></Panel>}
      <Panel title="Reglas configuradas" className="mt-5">
        {rules.loading ? <LoadingNotice /> : rules.error ? <div className="p-4"><ErrorNotice message={rules.error} onRetry={() => void rules.reload()} /></div> : !rules.data?.length ? <EmptyNotice /> : <div className="divide-y divide-slate-100">{rules.data.map((rule) => <article key={rule.id} className="p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-bold">{rule.nombre}</p><p className="mt-1 text-xs text-slate-500">{rule.nombreEvento} · Prioridad {rule.prioridad}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${rule.activo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{rule.activo ? "Activa" : "Inactiva"}</span></div><p className="mt-3 text-sm text-slate-600">{rule.descripcion || "Sin descripción"}</p><pre className="mt-3 overflow-auto rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600">{JSON.stringify({ condiciones: rule.condiciones, acciones: rule.acciones }, null, 2)}</pre></article>)}</div>}
      </Panel>
    </>
  )
}
