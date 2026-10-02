import { useState, type FormEvent } from "react"
import { Button, EmptyNotice, ErrorNotice, Input, LoadingNotice, PageHeader, Panel, Textarea } from "@/components/ui"
import type { Location } from "@/types/api"
import { errorMessage, useAsync } from "@/hooks/useAsync"
import { adminApi } from "./api"

export function LocationsPage() {
  const locations = useAsync(adminApi.managedLocations, [])
  const [editing, setEditing] = useState<Location | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function closeForm() {
    setEditing(null)
    setFormOpen(false)
    setError(null)
  }

  function editLocation(location: Location) {
    setEditing(location)
    setFormOpen(true)
    setError(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const body = {
      nombre: String(form.get("nombre") || "").trim(),
      direccion: String(form.get("direccion") || "").trim(),
      activo: editing ? form.get("activo") === "on" : true,
    }
    setSaving(true)
    setError(null)
    try {
      if (editing) await adminApi.updateLocation(editing.id, body)
      else await adminApi.createLocation(body)
      await locations.reload()
      closeForm()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  async function deactivateLocation(location: Location) {
    if (!window.confirm(`¿Deseas eliminar la ubicación "${location.nombre}"? Se conservará en los registros históricos.`)) return
    setError(null)
    try {
      await adminApi.deactivateLocation(location.id)
      await locations.reload()
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  async function activateLocation(location: Location) {
    setError(null)
    try {
      await adminApi.updateLocation(location.id, {
        nombre: location.nombre,
        direccion: location.direccion || "",
        activo: true,
      })
      await locations.reload()
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  return (
    <>
      <PageHeader
        title="Ubicaciones"
        description="Administra las ubicaciones disponibles para incidencias y activos."
        action={<Button onClick={() => {
          setEditing(null)
          setFormOpen((value) => !value)
          setError(null)
        }}>{formOpen && !editing ? "Cancelar" : "+ Nueva ubicación"}</Button>}
      />
      {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
      {formOpen && (
        <Panel title={editing ? "Editar ubicación" : "Agregar ubicación"} className="mb-5">
          <form key={editing?.id || "new-location"} onSubmit={(event) => void submit(event)} className="grid gap-4 p-5 sm:grid-cols-2">
            <Input label="Nombre" name="nombre" defaultValue={editing?.nombre || ""} required maxLength={180} />
            <Textarea label="Dirección" name="direccion" defaultValue={editing?.direccion || ""} rows={2} />
            {editing && (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="activo" defaultChecked={editing.activo} className="size-4 accent-emerald-600" />
                Ubicación activa
              </label>
            )}
            <div className="flex items-center gap-2 sm:col-span-2">
              <Button disabled={saving}>{saving ? "Guardando…" : editing ? "Guardar cambios" : "Guardar ubicación"}</Button>
              <Button type="button" tone="neutral" onClick={closeForm}>Cancelar</Button>
            </div>
          </form>
        </Panel>
      )}
      <Panel title="Catálogo de ubicaciones" description="Al eliminar una ubicación se desactiva para no alterar incidencias ni activos históricos.">
        {locations.loading ? <LoadingNotice /> : locations.error ? (
          <div className="p-4"><ErrorNotice message={locations.error} onRetry={() => void locations.reload()} /></div>
        ) : !locations.data?.length ? <EmptyNotice>No hay ubicaciones registradas.</EmptyNotice> : (
          <div className="divide-y divide-slate-100">
            {locations.data.map((location) => (
              <div key={location.id} className="flex flex-wrap items-center gap-3 p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-lg text-emerald-700" aria-hidden="true">⌖</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900">{location.nombre}</p>
                  <p className="mt-1 break-words text-xs text-slate-500">{location.direccion || "Sin dirección registrada"}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${location.activo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {location.activo ? "Activa" : "Inactiva"}
                </span>
                <div className="flex gap-2">
                  <Button tone="neutral" onClick={() => editLocation(location)}>Editar</Button>
                  {location.activo
                    ? <Button tone="danger" onClick={() => void deactivateLocation(location)}>Eliminar</Button>
                    : <Button tone="neutral" onClick={() => void activateLocation(location)}>Reactivar</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  )
}
