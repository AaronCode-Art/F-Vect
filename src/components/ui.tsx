import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react"
import { formatDate, formatRole, humanize } from "@/utils/format"
import { useEscapeKey } from "@/hooks/useEscapeKey"
import { Icon } from "@/components/icons"
import { buttonClass, controlClass, type ButtonTone } from "@/components/styles"

/* ───────── Botones y campos ───────── */

export function Button({
  children,
  tone = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone; size?: "md" | "sm" }) {
  return (
    <button type={type} className={`${buttonClass(tone, size)} ${className}`} {...props}>
      {children}
    </button>
  )
}

function Field({ label, hint, children }: { label?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>}
      {children}
      {hint && <span className="mt-1.5 block text-xs text-slate-600">{hint}</span>}
    </label>
  )
}

export function Input({ label, hint, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }) {
  return (
    <Field label={label} hint={hint}>
      <input className={`h-11 ${controlClass} ${className}`} {...props} />
    </Field>
  )
}

export function Select({
  label,
  hint,
  children,
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; hint?: string; children: ReactNode }) {
  return (
    <Field label={label} hint={hint}>
      <select className={`h-11 ${controlClass} ${className}`} {...props}>
        {children}
      </select>
    </Field>
  )
}

export function Textarea({ label, hint, className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string }) {
  return (
    <Field label={label} hint={hint}>
      <textarea className={`resize-y p-3 ${controlClass} ${className}`} {...props} />
    </Field>
  )
}

/* ───────── Estructura de página ───────── */

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
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
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-slate-950">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

/* ───────── Estados y etiquetas ───────── */

type Tone = "success" | "warning" | "info" | "progress" | "neutral" | "danger"

const badgeTones: Record<Tone, { box: string; dot: string }> = {
  success: { box: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-600" },
  warning: { box: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  info: { box: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500" },
  progress: { box: "bg-violet-50 text-violet-800 ring-violet-200", dot: "bg-violet-500" },
  neutral: { box: "bg-slate-100 text-slate-700 ring-slate-200", dot: "bg-slate-400" },
  danger: { box: "bg-rose-50 text-rose-800 ring-rose-200", dot: "bg-rose-500" },
}

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  const style = badgeTones[tone]
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style.box}`}>
      <span className={`size-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {children}
    </span>
  )
}

function statusTone(value: string): Tone {
  const key = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
  if (key.includes("RECHAZ")) return "danger"
  if (key.includes("CERRAD")) return "neutral"
  if (key.includes("RESUEL") || key.includes("APROBAD") || key.includes("EJECUT") || key.includes("OPERATIVO")) return "success"
  if (key.includes("ESPERA") || key.includes("PENDIENTE") || key.includes("MANTENIMIENTO")) return "warning"
  if (key.includes("ATENCION")) return "progress"
  if (key.includes("BAJA")) return "neutral"
  return "info"
}

/** Acepta el código de la API (EN_ATENCION) o un texto ya traducido (En atención). */
export function StatusPill({ value }: { value: string }) {
  return <Badge tone={statusTone(value)}>{humanize(value)}</Badge>
}

export function ActiveBadge({ active, feminine = false }: { active: boolean; feminine?: boolean }) {
  return <Badge tone={active ? "success" : "neutral"}>{active ? (feminine ? "Activa" : "Activo") : feminine ? "Inactiva" : "Inactivo"}</Badge>
}

export function PriorityLabel({ value }: { value: string }) {
  const high = value === "ALTA" || value === "CRITICA"
  const dot = high ? "bg-rose-500" : value === "MEDIA" ? "bg-amber-500" : "bg-slate-400"
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-700">
      <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />
      {humanize(value)}
    </span>
  )
}

/* ───────── Avisos ───────── */

const noticeTones = {
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-900", icon: "check" as const },
  error: { box: "border-rose-200 bg-rose-50 text-rose-900", icon: "alert" as const },
  info: { box: "border-sky-200 bg-sky-50 text-sky-900", icon: "info" as const },
}

export function Notice({ tone = "info", children, action }: { tone?: keyof typeof noticeTones; children: ReactNode; action?: ReactNode }) {
  const style = noticeTones[tone]
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm ${style.box}`}>
      <Icon name={style.icon} className="size-5" />
      <span className="min-w-0 flex-1">{children}</span>
      {action}
    </div>
  )
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Notice tone="error" action={onRetry && <Button tone="neutral" size="sm" onClick={onRetry}>Reintentar</Button>}>
      {message}
    </Notice>
  )
}

export function LoadingNotice({ label = "Cargando información…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3 p-5">
      <span className="sr-only">{label}</span>
      {[100, 83, 66].map((width) => (
        <div key={width} className="h-4 rounded-md bg-slate-100 motion-safe:animate-pulse" style={{ width: `${width}%` }} />
      ))}
    </div>
  )
}

export function EmptyNotice({ children = "No hay registros para mostrar.", title }: { children?: ReactNode; title?: string }) {
  return (
    <div className="px-6 py-10 text-center">
      {title && <p className="font-semibold text-slate-800">{title}</p>}
      <div className={`${title ? "mt-1" : ""} text-sm text-slate-600`}>{children}</div>
    </div>
  )
}

/* ───────── Tablas ───────── */

export function Table({ children, minWidth = 640 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  )
}

export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
      <tr>{children}</tr>
    </thead>
  )
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <th scope="col" className={`px-5 py-3 font-semibold ${className}`}>
      {children}
    </th>
  )
}

export function Tbody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`px-5 py-3.5 align-middle text-slate-700 ${className}`}>{children}</td>
}

/* ───────── Métricas ───────── */

export function StatGroup({ children, columns = "lg:grid-cols-4" }: { children: ReactNode; columns?: string }) {
  return (
    <dl className={`grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-sm ${columns}`}>
      {children}
    </dl>
  )
}

export function Stat({ label, value, caption }: { label: string; value: ReactNode; caption?: string }) {
  return (
    <div className="bg-white p-5 [&:last-child:nth-child(odd)]:col-span-2 lg:[&:last-child:nth-child(odd)]:col-span-1">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="tabular mt-1 text-2xl font-semibold tracking-tight text-slate-950">{value}</dd>
      {caption && <p className="mt-1 text-xs text-slate-600">{caption}</p>}
    </div>
  )
}

/** Lista ordenada con barra proporcional; sustituye gráficos circulares difíciles de leer. */
export function BarList({ items, emptyText = "Sin datos en este período." }: { items: [string, number][]; emptyText?: string }) {
  const max = Math.max(1, ...items.map(([, value]) => value))
  if (!items.length) return <EmptyNotice>{emptyText}</EmptyNotice>
  return (
    <ul className="space-y-4 p-5">
      {items.map(([name, value]) => (
        <li key={name}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-slate-700">{humanize(name)}</span>
            <span className="tabular font-semibold text-slate-950">{value}</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${(value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/* ───────── Diálogos ───────── */

export function Dialog({
  title,
  description,
  onClose,
  busy = false,
  width = "max-w-md",
  children,
}: {
  title: string
  description?: string
  onClose: () => void
  busy?: boolean
  width?: string
  children: ReactNode
}) {
  const titleId = useId()
  const panel = useRef<HTMLElement>(null)
  useEscapeKey(onClose, !busy)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const first = panel.current?.querySelector<HTMLElement>("input, select, textarea")
    ;(first ?? panel.current)?.focus()
    return () => previous?.focus?.()
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <section
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`max-h-[90dvh] w-full overflow-y-auto rounded-2xl bg-white shadow-xl outline-none ${width}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-slate-950">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            disabled={busy}
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

/** Confirmación que nombra la acción y su consecuencia (sustituye a window.confirm). */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  tone = "primary",
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string
  message: ReactNode
  confirmLabel: string
  tone?: "primary" | "danger"
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog title={title} onClose={onCancel} busy={busy}>
      <div className="px-6 py-5 text-sm leading-6 text-slate-700">{message}</div>
      <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
        <Button tone="quiet" onClick={onCancel} disabled={busy}>Cancelar</Button>
        <Button tone={tone} onClick={onConfirm} disabled={busy}>{busy ? "Procesando…" : confirmLabel}</Button>
      </div>
    </Dialog>
  )
}

/** Pide un texto (motivo o comentario) antes de ejecutar la acción (sustituye a window.prompt). */
export function ReasonDialog({
  title,
  description,
  label,
  required = false,
  confirmLabel,
  tone = "primary",
  busy = false,
  onSubmit,
  onCancel,
}: {
  title: string
  description?: string
  label: string
  required?: boolean
  confirmLabel: string
  tone?: "primary" | "danger"
  busy?: boolean
  onSubmit: (text: string) => void
  onCancel: () => void
}) {
  const [text, setText] = useState("")
  return (
    <Dialog title={title} description={description} onClose={onCancel} busy={busy}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(text.trim())
        }}
      >
        <div className="px-6 py-5">
          <Textarea label={required ? label : `${label} (opcional)`} rows={3} required={required} value={text} onChange={(event) => setText(event.target.value)} />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <Button tone="quiet" onClick={onCancel} disabled={busy}>Cancelar</Button>
          <Button type="submit" tone={tone} disabled={busy || (required && !text.trim())}>{busy ? "Procesando…" : confirmLabel}</Button>
        </div>
      </form>
    </Dialog>
  )
}

export type ReviewRequest = {
  title: string
  description?: string
  items: [string, ReactNode][]
  confirmLabel: string
  tone?: "primary" | "danger"
  run: () => Promise<unknown> | void
  /** Se ejecuta si la persona cierra el diálogo sin confirmar (por ejemplo, para restaurar un campo). */
  onDismiss?: () => void
}

/** Resume lo que se va a enviar para que la persona lo verifique antes de confirmar. */
export function ReviewDialog({ review, onClose }: { review: ReviewRequest; onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  async function confirm() {
    setBusy(true)
    try {
      await review.run()
    } finally {
      setBusy(false)
      onClose()
    }
  }
  function dismiss() {
    review.onDismiss?.()
    onClose()
  }
  return (
    <Dialog title={review.title} description={review.description ?? "Revisa que los datos sean correctos antes de continuar."} onClose={dismiss} busy={busy} width="max-w-lg">
      <dl className="divide-y divide-slate-100 px-6 py-2 text-sm">
        {review.items.map(([label, value]) => (
          <div key={label} className="grid gap-1 py-3 sm:grid-cols-[150px_1fr] sm:gap-4">
            <dt className="text-slate-600">{label}</dt>
            <dd className="min-w-0 whitespace-pre-wrap break-words font-medium text-slate-900">
              {value === "" || value == null ? <span className="font-normal text-slate-600">No indicado</span> : value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">
        <Button tone="quiet" onClick={dismiss} disabled={busy}>Volver a editar</Button>
        <Button tone={review.tone ?? "primary"} onClick={() => void confirm()} disabled={busy}>{busy ? "Procesando…" : review.confirmLabel}</Button>
      </div>
    </Dialog>
  )
}

export { formatDate, formatRole }
