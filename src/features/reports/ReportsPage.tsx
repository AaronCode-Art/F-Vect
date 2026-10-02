import { useState } from "react"
import { Button, EmptyNotice, ErrorNotice, LoadingNotice, PageHeader, Panel } from "@/components/ui"
import { errorMessage, useAsync } from "@/hooks/useAsync"
import { adminApi } from "@/features/admin/api"

function Distribution({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values || {})
  return <Panel title={title}>{entries.length ? <div className="space-y-3 p-5">{entries.map(([name, value]) => <div key={name} className="flex justify-between border-b border-slate-100 pb-2 text-sm"><span>{name.replaceAll("_", " ")}</span><b>{value}</b></div>)}</div> : <EmptyNotice>Sin datos en este período.</EmptyNotice>}</Panel>
}

export function ReportsPage() {
  const [days, setDays] = useState(30)
  const report = useAsync(() => adminApi.report(days), [days])
  const [error, setError] = useState<string | null>(null)

  async function exportFile() {
    setError(null)
    try {
      const blob = await adminApi.reportExcel(days)
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "reporte-operativo.xlsx"
      link.click()
      URL.revokeObjectURL(url)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  return (
    <>
      <PageHeader title="Reportes" description="Reportes operativos y distribución de incidencias del backend." action={<div className="flex gap-2"><select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm" value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={7}>7 días</option><option value={30}>30 días</option><option value={90}>90 días</option></select><Button tone="neutral" onClick={() => void exportFile()}>Exportar Excel</Button></div>} />
      {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
      {report.error && <div className="mb-4"><ErrorNotice message={report.error} onRetry={() => void report.reload()} /></div>}
      {report.loading ? <LoadingNotice /> : report.data && <>
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          {[["Total del período", report.data.total], ["Desde", report.data.desde], ["Hasta", report.data.hasta]].map(([title, value]) => <Panel key={String(title)} className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p><p className="mt-2 text-2xl font-bold">{value}</p></Panel>)}
        </div>
        <div className="grid gap-5 lg:grid-cols-3"><Distribution title="Por estado" values={report.data.porEstado} /><Distribution title="Por categoría" values={report.data.porCategoria} /><Distribution title="Por prioridad" values={report.data.porPrioridad} /></div>
        <Panel title="Serie diaria" description="Conteo diario devuelto por el servicio." className="mt-5">
          {!report.data.serieDiaria.length ? <EmptyNotice /> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Fecha</th><th className="px-5 py-3">Creadas</th><th className="px-5 py-3">Resueltas</th></tr></thead><tbody className="divide-y divide-slate-100">{report.data.serieDiaria.map((day) => <tr key={day.fecha}><td className="px-5 py-3">{day.fecha}</td><td className="px-5 py-3">{day.creadas}</td><td className="px-5 py-3">{day.resueltas}</td></tr>)}</tbody></table></div>}
        </Panel>
      </>}
    </>
  )
}
