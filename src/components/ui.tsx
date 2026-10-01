import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react"
import { formatDate, formatRole } from "@/utils/format"

export function Button({
  children,
  tone = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "neutral" | "danger" | "quiet"
}) {
  const tones = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700",
    neutral: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    quiet: "text-slate-500 hover:bg-slate-100",
  }
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Input({
  label,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-2 block text-xs font-bold text-slate-600">{label}</span>}
      <input
        className={`h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 ${className}`}
        {...props}
      />
    </label>
  )
}

export function Select({
  label,
  children,
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      {label && <span className="mb-2 block text-xs font-bold text-slate-600">{label}</span>}
      <select
        className={`h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-400 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  )
}

export function Textarea({
  label,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-2 block text-xs font-bold text-slate-600">{label}</span>}
      <textarea
        className={`w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 ${className}`}
        {...props}
      />
    </label>
  )
}

export function Panel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || description || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            {title && <h2 className="font-bold text-slate-950">{title}</h2>}
            {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-1 text-sm font-semibold text-emerald-700">VECT · Gestión de incidencias</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  )
}

export function StatusPill({ value }: { value: string }) {
  const normalized = value.toUpperCase()
  const style =
    normalized.includes("CERRAD") || normalized.includes("RECHAZ")
      ? "bg-slate-100 text-slate-600 ring-slate-200"
      : normalized.includes("RESUEL") || normalized.includes("APROBAD") || normalized.includes("EJECUT")
        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
        : normalized.includes("ESPERA") || normalized.includes("PENDIENTE")
          ? "bg-amber-50 text-amber-700 ring-amber-200"
          : normalized.includes("ATENCION")
            ? "bg-violet-50 text-violet-700 ring-violet-200"
            : "bg-sky-50 text-sky-700 ring-sky-200"
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${style}`}>
      {value.replaceAll("_", " ")}
    </span>
  )
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <span>{message}</span>
      {onRetry && <Button tone="neutral" onClick={onRetry}>Reintentar</Button>}
    </div>
  )
}

export function LoadingNotice() {
  return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Cargando información…</div>
}

export function EmptyNotice({ children = "No hay registros para mostrar." }: { children?: ReactNode }) {
  return <div className="p-8 text-center text-sm text-slate-500">{children}</div>
}

export { formatDate, formatRole }
