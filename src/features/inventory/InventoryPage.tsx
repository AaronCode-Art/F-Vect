import { useState, type FormEvent } from "react"
import { Button, EmptyNotice, ErrorNotice, Input, LoadingNotice, PageHeader, Panel, Select, formatDate } from "@/components/ui"
import { useAuth } from "@/features/auth/AuthProvider"
import { errorMessage, useAsync } from "@/hooks/useAsync"
import { inventoryApi } from "./api"

export function InventoryPage() {
  const { user } = useAuth()
  const components = useAsync(inventoryApi.list, [])
  const movements = useAsync(inventoryApi.movements, [])
  const [createOpen, setCreateOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const canWrite = ["ADMIN", "GERENCIA"].includes(user?.rol || "")

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setBusy(true)
    setError(null)
    try {
      await inventoryApi.create({
        codigo: String(data.get("codigo")),
        nombre: String(data.get("nombre")),
        tipoComponente: String(data.get("tipoComponente")),
        descripcion: String(data.get("descripcion") || ""),
        costoUnitario: Number(data.get("costoUnitario")),
        stockMinimo: Number(data.get("stockMinimo")),
        activo: true,
      })
      setNotice("Componente creado.")
      setCreateOpen(false)
      await Promise.all([components.reload(), movements.reload()])
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  async function addMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const id = String(data.get("componenteId"))
    setBusy(true)
    setError(null)
    try {
      await inventoryApi.moveStock(id, {
        tipoMovimiento: String(data.get("tipoMovimiento")) as "ENTRADA" | "SALIDA",
        cantidad: Number(data.get("cantidad")),
        motivo: String(data.get("motivo")),
      })
      setNotice("Movimiento de inventario registrado.")
      await Promise.all([components.reload(), movements.reload()])
      event.currentTarget.reset()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Inventario" description="Existencias y movimientos consultados desde el almacén VECT." action={canWrite ? <Button onClick={() => setCreateOpen((open) => !open)}>{createOpen ? "Cancelar" : "+ Nuevo componente"}</Button> : undefined} />
      {notice && <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
      {createOpen && canWrite && <Panel title="Crear componente" className="mb-5"><form onSubmit={(event) => void create(event)} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3"><Input name="codigo" label="Código" required /><Input name="nombre" label="Nombre" required /><Input name="tipoComponente" label="Tipo" required /><Input name="costoUnitario" label="Costo unitario" type="number" min="0" step="0.01" required /><Input name="stockMinimo" label="Stock mínimo" type="number" min="0" required /><Input name="descripcion" label="Descripción" /><Button disabled={busy} className="self-end">{busy ? "Guardando…" : "Crear"}</Button></form></Panel>}
      <Panel title="Componentes" description={components.data ? `${components.data.length} registros` : undefined}>
        {components.loading ? <LoadingNotice /> : components.error ? <div className="p-4"><ErrorNotice message={components.error} onRetry={() => void components.reload()} /></div> : !components.data?.length ? <EmptyNotice /> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Código / componente</th><th className="px-5 py-3">Tipo</th><th className="px-5 py-3">Stock actual</th><th className="px-5 py-3">Stock mínimo</th><th className="px-5 py-3">Costo unitario</th><th className="px-5 py-3">Estado</th></tr></thead><tbody className="divide-y divide-slate-100">{components.data.map((item) => <tr key={item.id}><td className="px-5 py-4"><b>{item.codigo}</b><span className="block text-xs text-slate-500">{item.nombre}</span></td><td className="px-5 py-4">{item.tipoComponente}</td><td className={`px-5 py-4 font-bold ${item.stockActual <= item.stockMinimo ? "text-rose-600" : ""}`}>{item.stockActual}</td><td className="px-5 py-4">{item.stockMinimo}</td><td className="px-5 py-4">S/{Number(item.costoUnitario).toFixed(2)}</td><td className="px-5 py-4">{item.activo ? "Activo" : "Inactivo"}</td></tr>)}</tbody></table></div>}
      </Panel>
      {canWrite && <Panel title="Registrar movimiento" description="La API registra cantidad, tipo y motivo con el usuario autenticado." className="mt-5"><form onSubmit={(event) => void addMovement(event)} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"><Select name="componenteId" label="Componente" required defaultValue=""><option value="" disabled>Selecciona</option>{components.data?.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}</option>)}</Select><Select name="tipoMovimiento" label="Tipo"><option value="ENTRADA">Entrada</option><option value="SALIDA">Salida</option></Select><Input name="cantidad" label="Cantidad" type="number" min="1" required /><Input name="motivo" label="Motivo" required /><Button disabled={busy || !components.data?.length} className="lg:col-span-4">{busy ? "Registrando…" : "Registrar movimiento"}</Button></form></Panel>}
      <Panel title="Movimientos recientes" className="mt-5">
        {movements.loading ? <LoadingNotice /> : movements.error ? <div className="p-4"><ErrorNotice message={movements.error} onRetry={() => void movements.reload()} /></div> : !movements.data?.length ? <EmptyNotice /> : <div className="divide-y divide-slate-100">{movements.data.slice(0, 12).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"><div><b>{item.tipoMovimiento === "ENTRADA" ? "+" : "−"}{item.cantidad} {item.componenteNombre}</b><p className="text-xs text-slate-500">{item.motivo} · {item.realizadoPorNombre}</p></div><span className="text-xs text-slate-400">{formatDate(item.creadoEn)}</span></div>)}</div>}
      </Panel>
    </>
  )
}
