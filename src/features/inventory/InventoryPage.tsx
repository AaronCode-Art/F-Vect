import { useState, type FormEvent } from "react"
import { Badge, Button, EmptyNotice, ErrorNotice, Input, LoadingNotice, Notice, PageHeader, Panel, ReviewDialog, Select, Table, Tbody, Td, Th, Thead, formatDate } from "@/components/ui"
import type { ReviewRequest } from "@/components/ui"
import { formatMoney } from "@/utils/format"
import { Icon } from "@/components/icons"
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
  const [review, setReview] = useState<ReviewRequest | null>(null)
  const canWrite = ["ADMIN", "GERENCIA"].includes(user?.rol || "")

  function askCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setReview({
      title: "¿Crear este componente?",
      items: [
        ["Código", String(data.get("codigo"))],
        ["Nombre", String(data.get("nombre"))],
        ["Tipo", String(data.get("tipoComponente"))],
        ["Costo unitario", formatMoney(Number(data.get("costoUnitario")))],
        ["Stock mínimo", String(data.get("stockMinimo"))],
        ["Descripción", String(data.get("descripcion") || "")],
      ],
      confirmLabel: "Crear componente",
      run: () => create(data),
    })
  }

  function askMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const item = components.data?.find((c) => c.id === data.get("componenteId"))
    const out = data.get("tipoMovimiento") === "SALIDA"
    setReview({
      title: out ? "¿Registrar esta salida de stock?" : "¿Registrar esta entrada de stock?",
      items: [
        ["Componente", item ? `${item.codigo} · ${item.nombre}` : ""],
        ["Movimiento", out ? "Salida (resta existencias)" : "Entrada (suma existencias)"],
        ["Cantidad", String(data.get("cantidad"))],
        ["Stock resultante", item ? String(item.stockActual + (out ? -1 : 1) * Number(data.get("cantidad"))) : ""],
        ["Motivo", String(data.get("motivo"))],
      ],
      confirmLabel: "Registrar movimiento",
      tone: out ? "danger" : "primary",
      run: () => addMovement(data, form),
    })
  }

  async function create(data: FormData) {
    setBusy(true)
    setError(null)
    setNotice(null)
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

  async function addMovement(data: FormData, form: HTMLFormElement) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await inventoryApi.moveStock(String(data.get("componenteId")), {
        tipoMovimiento: String(data.get("tipoMovimiento")) as "ENTRADA" | "SALIDA",
        cantidad: Number(data.get("cantidad")),
        motivo: String(data.get("motivo")),
      })
      setNotice("Movimiento registrado.")
      await Promise.all([components.reload(), movements.reload()])
      form.reset()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Inventario"
        description="Existencias de componentes y sus movimientos."
        action={canWrite ? (
          <Button tone={createOpen ? "neutral" : "primary"} onClick={() => setCreateOpen((open) => !open)}>
            {createOpen ? "Cancelar" : <><Icon name="plus" className="size-4" /> Nuevo componente</>}
          </Button>
        ) : undefined}
      />
      {notice && <div className="mb-4"><Notice tone="success">{notice}</Notice></div>}
      {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
      {createOpen && canWrite && (
        <Panel title="Nuevo componente" className="mb-6">
          <form onSubmit={askCreate} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <Input name="codigo" label="Código" required />
            <Input name="nombre" label="Nombre" required />
            <Input name="tipoComponente" label="Tipo" hint="Por ejemplo: memoria, disco, batería." required />
            <Input name="costoUnitario" label="Costo unitario (S/)" type="number" min="0" step="0.01" required />
            <Input name="stockMinimo" label="Stock mínimo" hint="Al llegar a este valor se marca como stock bajo." type="number" min="0" required />
            <Input name="descripcion" label="Descripción" hint="Opcional." />
            <div className="sm:col-span-2 lg:col-span-3"><Button type="submit" disabled={busy}>{busy ? "Guardando…" : "Crear componente"}</Button></div>
          </form>
        </Panel>
      )}

      <Panel title="Componentes" description={components.data ? `${components.data.length} registrados` : undefined} className="overflow-hidden">
        {components.loading ? <LoadingNotice /> : components.error ? <div className="p-5"><ErrorNotice message={components.error} onRetry={() => void components.reload()} /></div> : !components.data?.length ? <EmptyNotice title="Aún no hay componentes" /> : (
          <Table minWidth={720}>
            <Thead>
              <Th>Componente</Th>
              <Th>Tipo</Th>
              <Th className="text-right">Stock actual</Th>
              <Th className="text-right">Stock mínimo</Th>
              <Th className="text-right">Costo unitario</Th>
              <Th>Estado</Th>
            </Thead>
            <Tbody>
              {components.data.map((item) => {
                const low = item.stockActual <= item.stockMinimo
                return (
                  <tr key={item.id}>
                    <Td>
                      <span className="block font-semibold text-slate-900">{item.nombre}</span>
                      <span className="block text-xs text-slate-600">{item.codigo}</span>
                    </Td>
                    <Td>{item.tipoComponente}</Td>
                    <Td className="text-right">
                      <span className={low ? "font-semibold text-rose-700" : "font-semibold text-slate-900"}>{item.stockActual}</span>
                      {low && <span className="mt-0.5 block text-xs font-medium text-rose-700">Stock bajo</span>}
                    </Td>
                    <Td className="text-right">{item.stockMinimo}</Td>
                    <Td className="text-right">{formatMoney(item.costoUnitario)}</Td>
                    <Td><Badge tone={item.activo ? "success" : "neutral"}>{item.activo ? "Activo" : "Inactivo"}</Badge></Td>
                  </tr>
                )
              })}
            </Tbody>
          </Table>
        )}
      </Panel>

      {canWrite && (
        <Panel title="Registrar movimiento" description="Una entrada suma existencias y una salida las resta. Queda registrado a tu nombre." className="mt-6">
          <form onSubmit={askMovement} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <Select name="componenteId" label="Componente" required defaultValue="">
              <option value="" disabled>Selecciona un componente</option>
              {components.data?.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}</option>)}
            </Select>
            <Select name="tipoMovimiento" label="Tipo de movimiento">
              <option value="ENTRADA">Entrada</option>
              <option value="SALIDA">Salida</option>
            </Select>
            <Input name="cantidad" label="Cantidad" type="number" min="1" required />
            <Input name="motivo" label="Motivo" required />
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit" disabled={busy || !components.data?.length}>{busy ? "Registrando…" : "Registrar movimiento"}</Button>
            </div>
          </form>
        </Panel>
      )}

      <Panel title="Movimientos recientes" description="Los 12 más recientes." className="mt-6">
        {movements.loading ? <LoadingNotice /> : movements.error ? <div className="p-5"><ErrorNotice message={movements.error} onRetry={() => void movements.reload()} /></div> : !movements.data?.length ? <EmptyNotice>Todavía no hay movimientos.</EmptyNotice> : (
          <ul className="divide-y divide-slate-100">
            {movements.data.slice(0, 12).map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    <span className={item.tipoMovimiento === "ENTRADA" ? "text-emerald-700" : "text-rose-700"}>{item.tipoMovimiento === "ENTRADA" ? "+" : "−"}{item.cantidad}</span> {item.componenteNombre}
                  </p>
                  <p className="text-sm text-slate-600">{item.motivo} · {item.realizadoPorNombre}</p>
                </div>
                <span className="text-sm text-slate-600">{formatDate(item.creadoEn)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {review && <ReviewDialog review={review} onClose={() => setReview(null)} />}
    </>
  )
}
