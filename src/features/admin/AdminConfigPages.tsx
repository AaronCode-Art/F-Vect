import { useState, type FormEvent } from "react"
import { ActiveBadge, Button, EmptyNotice, ErrorNotice, Input, LoadingNotice, Notice, PageHeader, Panel, ReviewDialog, Textarea, formatDate, type ReviewRequest } from "@/components/ui"
import { Icon } from "@/components/icons"
import { errorMessage, useAsync } from "@/hooks/useAsync"
import { adminApi } from "./api"

export function ParametersPage() {
  const parameters = useAsync(adminApi.parameters, [])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [review, setReview] = useState<ReviewRequest | null>(null)

  function askSave(key: string, raw: string) {
    setError(null)
    setNotice(null)
    try {
      JSON.parse(raw)
    } catch {
      setError(`El valor de «${key}» no es JSON válido. Revisa comillas, comas y llaves.`)
      return
    }
    setReview({
      title: "¿Guardar este parámetro?",
      description: "El cambio afecta la configuración del sistema.",
      items: [["Parámetro", key], ["Nuevo valor", <code key="v" className="block text-xs">{raw}</code>]],
      confirmLabel: "Guardar parámetro",
      run: () => save(key, raw),
    })
  }

  async function save(key: string, raw: string) {
    setError(null)
    setNotice(null)
    setBusyKey(key)
    try {
      const value = JSON.parse(raw) as unknown
      await adminApi.updateParameter(key, value)
      await parameters.reload()
      setNotice(`Parámetro «${key}» guardado.`)
    } catch (caught) {
      setError(caught instanceof SyntaxError ? `El valor de «${key}» no es JSON válido. Revisa comillas, comas y llaves.` : errorMessage(caught))
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <>
      <PageHeader title="Parámetros" description="Valores de configuración del sistema. Edita el valor como JSON y guarda cada parámetro por separado." />
      {notice && <div className="mb-4"><Notice tone="success">{notice}</Notice></div>}
      {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
      <Panel title="Parámetros disponibles">
        {parameters.loading ? <LoadingNotice /> : parameters.error ? <div className="p-5"><ErrorNotice message={parameters.error} onRetry={() => void parameters.reload()} /></div> : !parameters.data?.length ? <EmptyNotice /> : (
          <div className="divide-y divide-slate-100">
            {parameters.data.map((item) => <ParameterRow key={item.clave} item={item} saving={busyKey === item.clave} onSave={askSave} />)}
          </div>
        )}
      </Panel>
      {review && <ReviewDialog review={review} onClose={() => setReview(null)} />}
    </>
  )
}

function ParameterRow({ item, saving, onSave }: {
  item: { clave: string; valor: unknown; descripcion?: string | null; actualizadoEn?: string | null }
  saving: boolean
  onSave: (key: string, value: string) => void
}) {
  const [value, setValue] = useState(JSON.stringify(item.valor, null, 2))
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSave(item.clave, value)
      }}
      className="grid gap-4 p-5 lg:grid-cols-[1fr_2fr_auto]"
    >
      <div>
        <p className="font-semibold text-slate-950">{item.clave}</p>
        <p className="mt-0.5 text-sm text-slate-600">{item.descripcion || "Sin descripción"}</p>
        <p className="mt-1 text-xs text-slate-600">Actualizado: {formatDate(item.actualizadoEn)}</p>
      </div>
      <Textarea aria-label={`Valor de ${item.clave}`} value={value} onChange={(event) => setValue(event.target.value)} rows={3} className="font-mono text-xs" />
      <Button type="submit" className="self-start" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
    </form>
  )
}

export function AutomationPage() {
  const rules = useAsync(adminApi.rules, [])
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [review, setReview] = useState<ReviewRequest | null>(null)

  function askCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    try {
      JSON.parse(String(data.get("condiciones") || "{}"))
      JSON.parse(String(data.get("acciones") || "[]"))
    } catch {
      setError("Las condiciones y las acciones deben ser JSON válido. Revisa comillas, comas y llaves.")
      return
    }
    setError(null)
    setReview({
      title: "¿Crear esta regla?",
      items: [
        ["Nombre", String(data.get("nombre"))],
        ["Evento", String(data.get("nombreEvento"))],
        ["Prioridad", String(data.get("prioridad"))],
        ["Descripción", String(data.get("descripcion") || "")],
      ],
      confirmLabel: "Crear regla",
      run: () => create(data),
    })
  }

  async function create(data: FormData) {
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
      setError(caught instanceof SyntaxError ? "Las condiciones y las acciones deben ser JSON válido. Revisa comillas, comas y llaves." : errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Automatización"
        description="Reglas configuradas para eventos del sistema."
        action={
          <Button tone={open ? "neutral" : "primary"} onClick={() => setOpen((value) => !value)}>
            {open ? "Cancelar" : <><Icon name="plus" className="size-4" /> Nueva regla</>}
          </Button>
        }
      />
      <div className="mb-4"><Notice tone="info">Por ahora las reglas solo se guardan y administran aquí: el sistema todavía no las ejecuta automáticamente.</Notice></div>
      {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
      {open && (
        <Panel title="Nueva regla" className="mb-6">
          <form onSubmit={askCreate} className="grid gap-4 p-5 md:grid-cols-2">
            <Input label="Nombre" name="nombre" required maxLength={180} />
            <Input label="Evento" name="nombreEvento" required maxLength={100} placeholder="INCIDENCIA_CREADA" />
            <Input label="Prioridad" name="prioridad" type="number" min={0} defaultValue={0} />
            <Input label="Descripción" hint="Opcional." name="descripcion" />
            <Textarea label="Condiciones (JSON, objeto)" name="condiciones" defaultValue="{}" rows={4} className="font-mono text-xs" />
            <Textarea label="Acciones (JSON, lista)" name="acciones" defaultValue="[]" rows={4} className="font-mono text-xs" />
            <div className="md:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Crear regla"}</Button></div>
          </form>
        </Panel>
      )}
      <Panel title="Reglas configuradas">
        {rules.loading ? <LoadingNotice /> : rules.error ? <div className="p-5"><ErrorNotice message={rules.error} onRetry={() => void rules.reload()} /></div> : !rules.data?.length ? <EmptyNotice title="Aún no hay reglas">Usa «Nueva regla» para crear la primera.</EmptyNotice> : (
          <ul className="divide-y divide-slate-100">
            {rules.data.map((rule) => (
              <li key={rule.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">{rule.nombre}</p>
                    <p className="mt-0.5 text-sm text-slate-600">Evento {rule.nombreEvento} · Prioridad {rule.prioridad}</p>
                  </div>
                  <ActiveBadge active={rule.activo} feminine />
                </div>
                <p className="mt-3 text-sm text-slate-700">{rule.descripcion || "Sin descripción"}</p>
                <pre className="mt-3 overflow-auto rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-700">{JSON.stringify({ condiciones: rule.condiciones, acciones: rule.acciones }, null, 2)}</pre>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {review && <ReviewDialog review={review} onClose={() => setReview(null)} />}
    </>
  )
}
