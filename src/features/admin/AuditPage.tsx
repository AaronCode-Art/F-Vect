import { useState, type FormEvent } from "react"
import { Button, EmptyNotice, ErrorNotice, Input, LoadingNotice, PageHeader, Panel, Table, Tbody, Td, Th, Thead, formatDate } from "@/components/ui"
import { Icon } from "@/components/icons"
import { adminApi } from "./api"
import { errorMessage, useAsync } from "@/hooks/useAsync"
import type { AuditRecord } from "@/types/api"

const emptyFilters = { usuarioId: "", tipoEntidad: "", accion: "", desde: "", hasta: "" }

export function AuditPage() {
  const [query, setQuery] = useState("")
  const audit = useAsync(() => adminApi.audit(query), [query])
  const [filters, setFilters] = useState(emptyFilters)
  const [error, setError] = useState<string | null>(null)

  function buildQuery(values: typeof emptyFilters) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(values)) if (value) params.set(key, value)
    params.set("page", "0")
    params.set("size", "50")
    return params.toString()
  }

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQuery(buildQuery(filters))
  }

  function clear() {
    setFilters(emptyFilters)
    setQuery("")
  }

  async function download() {
    setError(null)
    try {
      const blob = await adminApi.auditExcel()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = "auditoria.xlsx"
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  const set = (key: keyof typeof emptyFilters) => (event: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, [key]: event.target.value })
  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <>
      <PageHeader
        title="Auditoría"
        description="Registro de las acciones realizadas en el sistema."
        action={<Button tone="neutral" onClick={() => void download()}><Icon name="download" className="size-4" /> Exportar a Excel</Button>}
      />
      {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
      <Panel title="Filtros" className="mb-6">
        <form onSubmit={apply} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          <Input label="ID de usuario" value={filters.usuarioId} onChange={set("usuarioId")} />
          <Input label="Tipo de entidad" value={filters.tipoEntidad} onChange={set("tipoEntidad")} />
          <Input label="Acción" value={filters.accion} onChange={set("accion")} />
          <Input label="Desde" type="date" value={filters.desde} onChange={set("desde")} />
          <Input label="Hasta" type="date" value={filters.hasta} onChange={set("hasta")} />
          <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
            <Button type="submit">Aplicar filtros</Button>
            {hasFilters && <Button tone="quiet" onClick={clear}>Limpiar</Button>}
          </div>
        </form>
      </Panel>
      <Panel
        title="Registros"
        description={audit.data ? `${audit.data.totalElements} registros · página ${(audit.data.number || 0) + 1}` : undefined}
        className="overflow-hidden"
      >
        {audit.loading ? <LoadingNotice /> : audit.error ? <div className="p-5"><ErrorNotice message={audit.error} onRetry={() => void audit.reload()} /></div> : !audit.data?.content?.length ? <EmptyNotice title="Sin resultados">Prueba con otros filtros.</EmptyNotice> : (
          <Table minWidth={800}>
            <Thead>
              <Th>Acción</Th>
              <Th>Entidad</Th>
              <Th>Usuario</Th>
              <Th>Dirección IP</Th>
              <Th>Fecha</Th>
            </Thead>
            <Tbody>
              {audit.data.content.map((item: AuditRecord) => (
                <tr key={item.id}>
                  <Td className="font-semibold text-slate-900">{item.accion}</Td>
                  <Td>
                    {item.tipoEntidad}
                    {item.entidadId && <span className="block max-w-56 truncate text-xs text-slate-600">{item.entidadId}</span>}
                  </Td>
                  <Td className="max-w-56 truncate text-xs">{item.usuarioId || "—"}</Td>
                  <Td>{item.direccionIp || "—"}</Td>
                  <Td className="whitespace-nowrap">{formatDate(item.creadoEn)}</Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Panel>
    </>
  )
}
