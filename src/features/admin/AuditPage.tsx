import { useState, type FormEvent } from "react"
import { Button, EmptyNotice, ErrorNotice, Input, LoadingNotice, PageHeader, Panel, formatDate } from "@/components/ui"
import { adminApi } from "./api"
import { errorMessage, useAsync } from "@/hooks/useAsync"
import type { AuditRecord } from "@/types/api"

export function AuditPage() {
  const [query, setQuery] = useState("")
  const audit = useAsync(() => adminApi.audit(query), [query])
  const [filters, setFilters] = useState({ usuarioId: "", tipoEntidad: "", accion: "", desde: "", hasta: "" })
  const [error, setError] = useState<string | null>(null)

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new URLSearchParams()
    for (const [key, value] of Object.entries(filters)) if (value) values.set(key, value)
    values.set("page", "0")
    values.set("size", "50")
    setQuery(values.toString())
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

  return (
    <>
      <PageHeader title="Auditoría" description="Acciones registradas por la API VECT." action={<Button tone="neutral" onClick={() => void download()}>Exportar Excel</Button>} />
      {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
      <Panel title="Filtros" className="mb-5"><form onSubmit={apply} className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5">
        <Input label="Usuario UUID" value={filters.usuarioId} onChange={(event) => setFilters({ ...filters, usuarioId: event.target.value })} />
        <Input label="Tipo de entidad" value={filters.tipoEntidad} onChange={(event) => setFilters({ ...filters, tipoEntidad: event.target.value })} />
        <Input label="Acción" value={filters.accion} onChange={(event) => setFilters({ ...filters, accion: event.target.value })} />
        <Input label="Desde" type="date" value={filters.desde} onChange={(event) => setFilters({ ...filters, desde: event.target.value })} />
        <Input label="Hasta" type="date" value={filters.hasta} onChange={(event) => setFilters({ ...filters, hasta: event.target.value })} />
        <Button className="lg:col-span-5">Aplicar filtros</Button>
      </form></Panel>
      <Panel title="Registros">
        {audit.loading ? <LoadingNotice /> : audit.error ? <div className="p-4"><ErrorNotice message={audit.error} onRetry={() => void audit.reload()} /></div> : !audit.data?.content?.length ? <EmptyNotice /> : <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Acción</th><th className="px-5 py-3">Entidad</th><th className="px-5 py-3">Usuario UUID</th><th className="px-5 py-3">Dirección IP</th><th className="px-5 py-3">Fecha</th></tr></thead><tbody className="divide-y divide-slate-100">{audit.data.content.map((item: AuditRecord) => <tr key={item.id}><td className="px-5 py-4 font-semibold">{item.accion}</td><td className="px-5 py-4">{item.tipoEntidad}{item.entidadId && <span className="block text-[10px] text-slate-400">{item.entidadId}</span>}</td><td className="max-w-48 truncate px-5 py-4 text-xs">{item.usuarioId || "—"}</td><td className="px-5 py-4">{item.direccionIp || "—"}</td><td className="px-5 py-4 text-xs">{formatDate(item.creadoEn)}</td></tr>)}</tbody></table><div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">Página {(audit.data.number || 0) + 1} · {audit.data.totalElements} registros</div></div>}
      </Panel>
    </>
  )
}
