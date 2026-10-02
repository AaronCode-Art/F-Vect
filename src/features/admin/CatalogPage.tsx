import { useState, type FormEvent } from "react"
import { Button, EmptyNotice, ErrorNotice, Input, LoadingNotice, PageHeader, Panel, Textarea } from "@/components/ui"
import { errorMessage, useAsync } from "@/hooks/useAsync"
import { adminApi } from "./api"

type CatalogKind = "categories" | "specialties"

export function CatalogPage({ kind }: { kind: CatalogKind }) {
  const categories = useAsync(adminApi.categories, [])
  const specialties = useAsync(adminApi.specialties, [])
  const resource = kind === "categories" ? categories : specialties
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const title = kind === "categories" ? "Categorías" : "Especialidades"
  const data = resource.data || []

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSaving(true)
    setError(null)
    try {
      const body = { nombre: String(form.get("nombre")), descripcion: String(form.get("descripcion") || ""), activo: true }
      if (kind === "categories") await adminApi.createCategory(body)
      else await adminApi.createSpecialty(body)
      await resource.reload()
      setOpen(false)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title={title} description={kind === "categories" ? "Clasificación de incidencias." : "Catálogo de especialidades de soporte."} action={<Button onClick={() => setOpen((value) => !value)}>{open ? "Cancelar" : `+ Nueva ${kind === "categories" ? "categoría" : "especialidad"}`}</Button>} />
      {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
      {open && <Panel title={`Agregar ${kind === "categories" ? "categoría" : "especialidad"}`} className="mb-5"><form onSubmit={(event) => void submit(event)} className="grid gap-4 p-5 sm:grid-cols-2"><Input label="Nombre" name="nombre" required maxLength={150} /><Textarea label="Descripción" name="descripcion" rows={2} /><Button disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button></form></Panel>}
      <Panel title={`Catálogo de ${title.toLowerCase()}`}>
        {resource.loading ? <LoadingNotice /> : resource.error ? <div className="p-4"><ErrorNotice message={resource.error} onRetry={() => void resource.reload()} /></div> : !data.length ? <EmptyNotice /> : <div className="divide-y divide-slate-100">{data.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 p-5"><span className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700">✳</span><div className="flex-1"><p className="font-bold">{item.nombre}</p><p className="mt-1 text-xs text-slate-500">{item.descripcion || "Sin descripción"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.activo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.activo ? "Activo" : "Inactivo"}</span></div>)}</div>}
      </Panel>
    </>
  )
}
