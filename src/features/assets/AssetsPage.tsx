import { useState, type FormEvent } from "react"
import { Button, EmptyNotice, ErrorNotice, Input, LoadingNotice, PageHeader, Panel, Select } from "@/components/ui"
import { useAsync, errorMessage } from "@/hooks/useAsync"
import { usersApi } from "@/features/users/api"
import { adminApi } from "@/features/admin/api"
import { assetsApi } from "./api"
import type { Asset } from "@/types/api"

export function AssetsPage() {
  const assets = useAsync(assetsApi.list, [])
  const users = useAsync(usersApi.list, [])
  const locations = useAsync(adminApi.locations, [])
  const components = useAsync(assetsApi.inventory, [])
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [assetComponents, setAssetComponents] = useState<Record<string, { componenteId: string; componenteNombre: string; numeroSerie?: string }[]>>({})
  const [saving, setSaving] = useState(false)

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setSaving(true)
    setError(null)
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

  async function install(event: FormEvent<HTMLFormElement>, assetId: string) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setSaving(true)
    setError(null)
    try {
      await assetsApi.install(assetId, String(data.get("componenteId")), String(data.get("numeroSerie") || "") || undefined)
      setAssetComponents((current) => ({ ...current, [assetId]: [...(current[assetId] || []), { componenteId: String(data.get("componenteId")), componenteNombre: components.data?.find((item) => item.id === data.get("componenteId"))?.nombre || "", numeroSerie: String(data.get("numeroSerie") || "") || undefined }] }))
      setNotice("Componente instalado.")
      event.currentTarget.reset()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title="Activos" description="Equipos, asignaciones y componentes instalados." action={<Button onClick={() => setOpen((value) => !value)}>{open ? "Cancelar" : "+ Nuevo activo"}</Button>} />
      {notice && <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
      {open && <Panel title="Registrar activo" className="mb-5"><form onSubmit={(event) => void create(event)} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <Input label="Código" name="codigo" required /><Input label="Nombre del equipo" name="nombre" required /><Input label="Número de serie" name="numeroSerie" />
        <Select label="Estado" name="estado"><option value="OPERATIVO">Operativo</option><option value="EN_MANTENIMIENTO">En mantenimiento</option><option value="BAJA">Baja</option></Select>
        <Select label="Usuario asignado" name="usuarioAsignadoId" defaultValue=""><option value="">Sin asignar</option>{users.data?.map((item) => <option key={item.id} value={item.id}>{item.nombres} {item.apellidos}</option>)}</Select>
        <Select label="Ubicación" name="ubicacionId" defaultValue=""><option value="">Sin ubicación</option>{locations.data?.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</Select>
        <Input label="Fecha de compra" name="fechaCompra" type="date" /><Input label="Notas" name="notas" />
        <Button disabled={saving} className="self-end">{saving ? "Guardando…" : "Crear activo"}</Button>
      </form></Panel>}
      <Panel title="Registro de activos" description={assets.data ? `${assets.data.length} equipos registrados` : undefined}>
        {assets.loading ? <LoadingNotice /> : assets.error ? <div className="p-4"><ErrorNotice message={assets.error} onRetry={() => void assets.reload()} /></div> : !assets.data?.length ? <EmptyNotice /> : <div className="divide-y divide-slate-100">{assets.data.map((asset) => <article key={asset.id} className="p-5">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-xl text-emerald-700">⬡</span>
            <div className="min-w-52 flex-1"><p className="text-xs font-bold text-emerald-700">{asset.codigo}</p><h3 className="mt-1 font-bold">{asset.nombre}</h3><p className="mt-1 text-xs text-slate-500">{asset.usuarioAsignadoNombre || "Sin asignar"} · {asset.ubicacionNombre || "Sin ubicación"}</p><p className="mt-1 text-xs text-slate-400">Serie {asset.numeroSerie || "—"} · {asset.fechaCompra || "Fecha de compra —"}</p></div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{asset.estado.replaceAll("_", " ")}</span>
            <Button tone="neutral" onClick={() => void openComponents(asset)}>{expanded === asset.id ? "Ocultar componentes" : "Componentes asociados"}</Button>
          </div>
          {expanded === asset.id && <div className="mt-4 rounded-xl bg-slate-50 p-4">
            {assetComponents[asset.id]?.length ? <div className="mb-4 flex flex-wrap gap-2">{assetComponents[asset.id].map((item, index) => <span key={`${item.componenteId}-${index}`} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold">{item.componenteNombre} {item.numeroSerie && `· ${item.numeroSerie}`}</span>)}</div> : <p className="mb-3 text-xs text-slate-500">No hay componentes instalados.</p>}
            <form onSubmit={(event) => void install(event, asset.id)} className="flex flex-wrap items-end gap-3">
              <Select label="Componente" name="componenteId" required defaultValue="" className="min-w-52"><option value="" disabled>Selecciona componente</option>{components.data?.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}</option>)}</Select>
              <Input label="Número de serie (opcional)" name="numeroSerie" />
              <Button disabled={saving}>{saving ? "Instalando…" : "Instalar componente"}</Button>
            </form>
          </div>}
          {asset.notas && <p className="mt-3 text-xs text-slate-500">{asset.notas}</p>}
        </article>)}</div>}
      </Panel>
    </>
  )
}
