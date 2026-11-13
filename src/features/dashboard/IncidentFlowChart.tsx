import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export type FlowPoint = { fecha: string; Creadas: number; Resueltas: number }

export default function IncidentFlowChart({ data }: { data: FlowPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: -12 }}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="fecha" tick={{ fill: "#475569", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} minTickGap={24} />
        <YAxis allowDecimals={false} tick={{ fill: "#475569", fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
        <Legend verticalAlign="top" align="right" iconType="plainline" wrapperStyle={{ fontSize: 13, paddingBottom: 8 }} />
        <Line type="monotone" dataKey="Creadas" stroke="#047857" strokeWidth={2.5} dot={data.length <= 14} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="Resueltas" stroke="#64748b" strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
