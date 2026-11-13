import { useState, type FormEvent } from "react"
import { Button, EmptyNotice, ErrorNotice, Input, LoadingNotice, Notice, PageHeader, Panel, ReviewDialog, Select, StatusPill, type ReviewRequest } from "@/components/ui"
import { formatDay, humanize } from "@/utils/format"
import { Icon } from "@/components/icons"
import { useAsync, errorMessage } from "@/hooks/useAsync"
import { usersApi } from "@/features/users/api"
import { adminApi } from "@/features/admin/api"
import { assetsApi } from "./api"
import type { Asset } from "@/types/api"

type InstalledComponent = { componenteId: string; componenteNombre: string; numeroSerie?: string }

export function AssetsPage() {
  const assets = useAsync(assetsApi.list, [])
  const users = useAsync(usersApi.list, [])
  const locations = useAsync(adminApi.locations, [])
  const components = useAsync(assetsApi.inventory, [])
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [assetComponents, setAssetComponents] = useState<Record<string, InstalledComponent[]>>({})
  const [saving, setSaving] = useState(false)
  const [review, setReview] = useState<ReviewRequest | null>(null)

  function askCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const user = users.data?.find((u) => u.id === data.get("usuarioAsignadoId"))
    const place = locations.data?.find((l) => l.id === data.get("ubicacionId"))
    setReview({
      title: "¿Registrar este activo?",
      items: [
        ["Código", String(data.get("codigo"))],
        ["Nombre", String(data.get("nombre"))],
        ["Número de serie", String(data.get("numeroSerie") || "")],
        ["Estado", humanize(String(data.get("estado")))],
        ["Usuario asignado", user ? `${user.nombres} ${user.apellidos}` : "Sin asignar"],
        ["Ubicación", place?.nombre ?? "Sin ubicación"],
        ["Fecha de compra", data.get("fechaCompra") ? formatDay(String(data.get("fechaCompra"))) : ""],
        ["Notas", String(data.get("notas") || "")],
      ],
      confirmLabel: "Crear activo",
      run: () => create(data),
    })
  }

  async function create(data: FormData) {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await assetsApi.create({
        codigo: String(data.get("codigo")),
        nombre: String(data.get("nombre")),
        numeroSerie: String(data.get("numeroSerie") || "") || undefined,
        estado: String(data.get("estado")),
        usuarioAsignadoId: String(data.get("usuarioAsignadoId") || "") || undefined,
        ubicacionId: String(data.get("ubicacionId") || "") || undefined,
        fechaCompra: String(data.get("fechaCompra") || "") || undefined,
        notas: String(data.get("notas") || "") || undefined,
      })
      await assets.reload()
      setNotice("Activo creado.")
      setOpen(false)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  async function openComponents(asset: Asset) {
    if (expanded === asset.id) {
      setExpanded(null)
      return
    }
    setExpanded(asset.id)
    try {
      const list = await assetsApi.components(asset.id)
      setAssetComponents((current) => ({ ...current, [asset.id]: list }))
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  function askInstall(event: FormEvent<HTMLFormElement>, asset: Asset) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const item = components.data?.find((c) => c.id === data.get("componenteId"))
    setReview({
      title: "¿Instalar este componente?",
      items: [
        ["Activo", `${asset.codigo} · ${asset.nombre}`],
        ["Componente", item ? `${item.codigo} · ${item.nombre}` : ""],
        ["Número de serie", String(data.get("numeroSerie") || "")],
      ],
      confirmLabel: "Instalar componente",
      run: () => install(data, form, asset.id),
    })
  }

  async function install(data: FormData, form: HTMLFormElement, assetId: string) {
    const componentId = String(data.get("componenteId"))
    const serial = String(data.get("numeroSerie") || "") || undefined
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await assetsApi.install(assetId, componentId, serial)
      const name = components.data?.find((item) => item.id === componentId)?.nombre || ""
      setAssetComponents((current) => ({ ...current, [assetId]: [...(current[assetId] || []), { componenteId: componentId, componenteNombre: name, numeroSerie: serial }] }))
      setNotice("Componente instalado.")
      form.reset()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Activos"
        description="Equipos, a quién están asignados y qué componentes tienen instalados."
        action={
          <Button tone={open ? "neutral" : "primary"} onClick={() => setOpen((value) => !value)}>
            {open ? "Cancelar" : <><Icon name="plus" className="size-4" /> Nuevo activo</>}
          </Button>
        }
      />
      {notice && <div className="mb-4"><Notice tone="success">{notice}</Notice></div>}
      {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
      {open && (
        <Panel title="Nuevo activo" className="mb-6">
          <form onSubmit={askCreate} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Código" name="codigo" required />
            <Input label="Nombre del equipo" name="nombre" required />
            <Input label="Número de serie" hint="Opcional." name="numeroSerie" />
            <Select label="Estado" name="estado">
              <option value="OPERATIVO">Operativo</option>
              <option value="EN_MANTENIMIENTO">En mantenimiento</option>
              <option value="BAJA">Baja</option>
            </Select>
            <Select label="Usuario asignado" name="usuarioAsignadoId" defaultValue="">
              <option value="">Sin asignar</option>
              {users.data?.map((item) => <option key={item.id} value={item.id}>{item.nombres} {item.apellidos}</option>)}
            </Select>
            <Select label="Ubicación" name="ubicacionId" defaultValue="">
              <option value="">Sin ubicación</option>
              {locations.data?.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </Select>
            <Input label="Fecha de compra" hint="Opcional." name="fechaCompra" type="date" />
            <Input label="Notas" hint="Opcional." name="notas" />
            <div className="sm:col-span-2 lg:col-span-3"><Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Crear activo"}</Button></div>
          </form>
        </Panel>
      )}
      <Panel title="Registro de activos" description={assets.data ? `${assets.data.length} equipos registrados` : undefined}>
        {assets.loading ? <LoadingNotice /> : assets.error ? <div className="p-5"><ErrorNotice message={assets.error} onRetry={() => void assets.reload()} /></div> : !assets.data?.length ? <EmptyNotice title="Aún no hay activos">Usa «Nuevo activo» para registrar el primero.</EmptyNotice> : (
          <ul className="divide-y divide-slate-100">
            {assets.data.map((asset) => {
              const isOpen = expanded === asset.id
              const installed = assetComponents[asset.id]
              return (
                <li key={asset.id} className="p-5">
                  <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
                    <div className="min-w-60 flex-1">
                      <p className="text-xs font-semibold text-slate-600">{asset.codigo}</p>
                      <h3 className="mt-0.5 font-semibold text-slate-950">{asset.nombre}</h3>
                      <p className="mt-1 text-sm text-slate-600">{asset.usuarioAsignadoNombre || "Sin asignar"} · {asset.ubicacionNombre || "Sin ubicación"}</p>
                      <p className="mt-0.5 text-sm text-slate-600">Serie {asset.numeroSerie || "—"} · Compra: {asset.fechaCompra ? formatDay(asset.fechaCompra) : "—"}</p>
                      {asset.notas && <p className="mt-2 text-sm text-slate-700">{asset.notas}</p>}
                    </div>
                    <StatusPill value={asset.estado} />
                    <Button tone="neutral" size="sm" aria-expanded={isOpen} onClick={() => void openComponents(asset)}>
                      {isOpen ? "Ocultar componentes" : "Ver componentes"}
                    </Button>
                  </div>
                  {isOpen && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-4">
                      <h4 className="text-sm font-semibold text-slate-900">Componentes instalados</h4>
                      {installed?.length ? (
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {installed.map((item, index) => (
                            <li key={`${item.componenteId}-${index}`} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800">
                              {item.componenteNombre}{item.numeroSerie && <span className="text-slate-600"> · {item.numeroSerie}</span>}
                            </li>
                          ))}
                        </ul>
                      ) : <p className="mt-1 text-sm text-slate-600">Este activo no tiene componentes instalados.</p>}
                      <form onSubmit={(event) => askInstall(event, asset)} className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-200 pt-4">
                        <div className="min-w-56 flex-1">
                          <Select label="Instalar componente" name="componenteId" required defaultValue="">
                            <option value="" disabled>Selecciona un componente</option>
                            {components.data?.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}</option>)}
                          </Select>
                        </div>
                        <div className="min-w-48 flex-1"><Input label="Número de serie" hint="Opcional." name="numeroSerie" /></div>
                        <Button type="submit" disabled={saving}>{saving ? "Instalando…" : "Instalar"}</Button>
                      </form>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
      {review && <ReviewDialog review={review} onClose={() => setReview(null)} />}
    </>
  )
}
