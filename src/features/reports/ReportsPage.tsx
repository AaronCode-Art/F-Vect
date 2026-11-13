import { useState } from "react"
import { BarList, Button, EmptyNotice, ErrorNotice, LoadingNotice, PageHeader, Panel, Select, Stat, StatGroup, Table, Tbody, Td, Th, Thead } from "@/components/ui"
import { formatDay } from "@/utils/format"
import { Icon } from "@/components/icons"
import { errorMessage, useAsync } from "@/hooks/useAsync"
import { adminApi } from "@/features/admin/api"

function sorted(values: Record<string, number> | undefined): [string, number][] {
  return Object.entries(values || {}).sort((a, b) => b[1] - a[1])
}

export function ReportsPage() {
  const [days, setDays] = useState(30)
  const report = useAsync(() => adminApi.report(days), [days])
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  async function exportFile() {
    setError(null)
    setExporting(true)
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
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Incidencias del período, agrupadas por estado, categoría y prioridad."
        action={
          <>
            <Select aria-label="Período del reporte" value={days} onChange={(event) => setDays(Number(event.target.value))}>
              <option value={7}>Últimos 7 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 90 días</option>
            </Select>
            <Button tone="neutral" onClick={() => void exportFile()} disabled={exporting}>
              <Icon name="download" className="size-4" /> {exporting ? "Exportando…" : "Exportar a Excel"}
            </Button>
          </>
        }
      />
      {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
      {report.error && <div className="mb-4"><ErrorNotice message={report.error} onRetry={() => void report.reload()} /></div>}
      {report.loading ? <Panel><LoadingNotice /></Panel> : report.data && (
        <>
          <StatGroup columns="lg:grid-cols-3">
            <Stat label="Incidencias del período" value={report.data.total} />
            <Stat label="Desde" value={<span className="text-xl">{formatDay(report.data.desde)}</span>} />
            <Stat label="Hasta" value={<span className="text-xl">{formatDay(report.data.hasta)}</span>} />
          </StatGroup>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Panel title="Por estado"><BarList items={sorted(report.data.porEstado)} /></Panel>
            <Panel title="Por categoría"><BarList items={sorted(report.data.porCategoria)} /></Panel>
            <Panel title="Por prioridad"><BarList items={sorted(report.data.porPrioridad)} /></Panel>
          </div>
          <Panel title="Detalle por día" description="Incidencias creadas y resueltas en cada fecha." className="mt-6 overflow-hidden">
            {!report.data.serieDiaria.length ? <EmptyNotice>No hay datos diarios en este período.</EmptyNotice> : (
              <Table minWidth={420}>
                <Thead>
                  <Th>Fecha</Th>
                  <Th className="text-right">Creadas</Th>
                  <Th className="text-right">Resueltas</Th>
                </Thead>
                <Tbody>
                  {report.data.serieDiaria.map((day) => (
                    <tr key={day.fecha}>
                      <Td>{formatDay(day.fecha)}</Td>
                      <Td className="text-right">{day.creadas}</Td>
                      <Td className="text-right">{day.resueltas}</Td>
                    </tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Panel>
        </>
      )}
    </>
  )
}
