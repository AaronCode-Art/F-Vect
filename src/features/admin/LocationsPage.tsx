import { useState, type FormEvent } from "react"
import { ActiveBadge, Button, ConfirmDialog, EmptyNotice, ErrorNotice, Input, LoadingNotice, Notice, PageHeader, Panel, ReviewDialog, Textarea, type ReviewRequest } from "@/components/ui"
import { Icon } from "@/components/icons"
import type { Location } from "@/types/api"
import { errorMessage, useAsync } from "@/hooks/useAsync"
import { adminApi } from "./api"

export function LocationsPage() {
  const locations = useAsync(adminApi.managedLocations, [])
  const [editing, setEditing] = useState<Location | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [review, setReview] = useState<ReviewRequest | null>(null)
  const [toDeactivate, setToDeactivate] = useState<Location | null>(null)

  function closeForm() {
    setEditing(null)
    setFormOpen(false)
    setError(null)
  }

  function editLocation(location: Location) {
    setEditing(location)
    setFormOpen(true)
    setError(null)
    setNotice(null)
  }

  function askSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setReview({
      title: editing ? "¿Guardar los cambios de esta ubicación?" : "¿Crear esta ubicación?",
      items: [
        ["Nombre", String(form.get("nombre") || "")],
        ["Dirección", String(form.get("direccion") || "")],
        ...(editing ? [["Estado", form.get("activo") === "on" ? "Activa" : "Inactiva"] as [string, string]] : []),
      ],
      confirmLabel: editing ? "Guardar cambios" : "Crear ubicación",
      run: () => submit(form),
    })
  }

  async function submit(form: FormData) {
    const body = {
      nombre: String(form.get("nombre") || "").trim(),
      direccion: String(form.get("direccion") || "").trim(),
      activo: editing ? form.get("activo") === "on" : true,
    }
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      if (editing) await adminApi.updateLocation(editing.id, body)
      else await adminApi.createLocation(body)
      await locations.reload()
      setNotice(editing ? "Cambios guardados." : "Ubicación creada.")
      closeForm()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  async function deactivateLocation() {
    if (!toDeactivate) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await adminApi.deactivateLocation(toDeactivate.id)
      await locations.reload()
      setNotice(`${toDeactivate.nombre} fue desactivada.`)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
      setToDeactivate(null)
    }
  }

  async function activateLocation(location: Location) {
    setError(null)
    setNotice(null)
    try {
      await adminApi.updateLocation(location.id, { nombre: location.nombre, direccion: location.direccion || "", activo: true })
      await locations.reload()
      setNotice(`${location.nombre} fue reactivada.`)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  return (
    <>
      <PageHeader
        title="Ubicaciones"
        description="Sedes y áreas que se pueden elegir al registrar incidencias y activos."
        action={
          <Button
            tone={formOpen && !editing ? "neutral" : "primary"}
            onClick={() => {
              setEditing(null)
              setFormOpen((value) => !value)
              setError(null)
            }}
          >
            {formOpen && !editing ? "Cancelar" : <><Icon name="plus" className="size-4" /> Nueva ubicación</>}
          </Button>
        }
      />
      {notice && <div className="mb-4"><Notice tone="success">{notice}</Notice></div>}
      {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
      {formOpen && (
        <Panel title={editing ? "Editar ubicación" : "Nueva ubicación"} className="mb-6">
          <form key={editing?.id || "new-location"} onSubmit={askSubmit} className="grid gap-4 p-5 sm:grid-cols-2">
            <Input label="Nombre" name="nombre" defaultValue={editing?.nombre || ""} required maxLength={180} />
            <Textarea label="Dirección" hint="Opcional." name="direccion" defaultValue={editing?.direccion || ""} rows={2} />
            {editing && (
              <label className="flex items-center gap-2 text-sm text-slate-800">
                <input type="checkbox" name="activo" defaultChecked={editing.activo} className="size-4 accent-brand-700" />
                Ubicación activa
              </label>
            )}
            <div className="flex items-center gap-2 sm:col-span-2">
              <Button type="submit" disabled={saving}>{saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear ubicación"}</Button>
              <Button tone="quiet" onClick={closeForm}>Cancelar</Button>
            </div>
          </form>
        </Panel>
      )}
      <Panel title="Catálogo de ubicaciones" description="Las ubicaciones desactivadas se conservan para no alterar incidencias ni activos anteriores.">
        {locations.loading ? <LoadingNotice /> : locations.error ? (
          <div className="p-5"><ErrorNotice message={locations.error} onRetry={() => void locations.reload()} /></div>
        ) : !locations.data?.length ? <EmptyNotice title="Aún no hay ubicaciones">Usa «Nueva ubicación» para crear la primera.</EmptyNotice> : (
          <ul className="divide-y divide-slate-100">
            {locations.data.map((location) => (
              <li key={location.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
                <div className="min-w-60 flex-1">
                  <p className="font-semibold text-slate-950">{location.nombre}</p>
                  <p className="mt-0.5 break-words text-sm text-slate-600">{location.direccion || "Sin dirección registrada"}</p>
                </div>
                <ActiveBadge active={location.activo} feminine />
                <div className="flex gap-2">
                  <Button tone="neutral" size="sm" onClick={() => editLocation(location)}>Editar</Button>
                  {location.activo
                    ? <Button tone="neutral" size="sm" onClick={() => setToDeactivate(location)}>Desactivar</Button>
                    : <Button tone="neutral" size="sm" onClick={() => void activateLocation(location)}>Reactivar</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {review && <ReviewDialog review={review} onClose={() => setReview(null)} />}
      {toDeactivate && (
        <ConfirmDialog
          title={`¿Desactivar «${toDeactivate.nombre}»?`}
          message="Dejará de ofrecerse al registrar incidencias. Se conserva en los registros históricos y puedes reactivarla cuando quieras."
          confirmLabel="Desactivar ubicación"
          tone="danger"
          busy={saving}
          onConfirm={() => void deactivateLocation()}
          onCancel={() => setToDeactivate(null)}
        />
      )}
    </>
  )
}
