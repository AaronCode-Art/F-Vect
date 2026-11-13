import { useState, type FormEvent } from "react"
import { ActiveBadge, Button, EmptyNotice, ErrorNotice, Input, LoadingNotice, PageHeader, Panel, ReviewDialog, Textarea, type ReviewRequest } from "@/components/ui"
import { Icon } from "@/components/icons"
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
  const [review, setReview] = useState<ReviewRequest | null>(null)
  const isCategory = kind === "categories"
  const title = isCategory ? "Categorías" : "Especialidades"
  const singular = isCategory ? "categoría" : "especialidad"
  const data = resource.data || []

  function askSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setReview({
      title: `¿Guardar esta ${singular}?`,
      items: [["Nombre", String(form.get("nombre"))], ["Descripción", String(form.get("descripcion") || "")]],
      confirmLabel: `Guardar ${singular}`,
      run: () => submit(form),
    })
  }

  async function submit(form: FormData) {
    setSaving(true)
    setError(null)
    try {
      const body = { nombre: String(form.get("nombre")), descripcion: String(form.get("descripcion") || ""), activo: true }
      if (isCategory) await adminApi.createCategory(body)
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
      <PageHeader
        title={title}
        description={isCategory ? "Clasificación que se elige al registrar una incidencia." : "Áreas de especialidad del equipo de soporte."}
        action={
          <Button tone={open ? "neutral" : "primary"} onClick={() => setOpen((value) => !value)}>
            {open ? "Cancelar" : <><Icon name="plus" className="size-4" /> Nueva {singular}</>}
          </Button>
        }
      />
      {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
      {open && (
        <Panel title={`Nueva ${singular}`} className="mb-6">
          <form onSubmit={askSubmit} className="grid gap-4 p-5 sm:grid-cols-2">
            <Input label="Nombre" name="nombre" required maxLength={150} />
            <Textarea label="Descripción" hint="Opcional." name="descripcion" rows={2} />
            <div className="sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Guardando…" : `Guardar ${singular}`}</Button></div>
          </form>
        </Panel>
      )}
      <Panel title={title} description={resource.data ? `${data.length} registradas` : undefined}>
        {resource.loading ? <LoadingNotice /> : resource.error ? <div className="p-5"><ErrorNotice message={resource.error} onRetry={() => void resource.reload()} /></div> : !data.length ? <EmptyNotice title={`Aún no hay ${title.toLowerCase()}`}>Usa «Nueva {singular}» para crear la primera.</EmptyNotice> : (
          <ul className="divide-y divide-slate-100">
            {data.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{item.nombre}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{item.descripcion || "Sin descripción"}</p>
                </div>
                <ActiveBadge active={item.activo} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {review && <ReviewDialog review={review} onClose={() => setReview(null)} />}
    </>
  )
}
