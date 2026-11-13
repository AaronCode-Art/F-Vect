export type ButtonTone = "primary" | "neutral" | "danger" | "quiet"

const tones: Record<ButtonTone, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800",
  neutral: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
  danger: "bg-rose-700 text-white hover:bg-rose-800",
  quiet: "text-slate-700 hover:bg-slate-100",
}

/** Clases de botón reutilizables también para enlaces (<Link>) que deben verse como botón. */
export function buttonClass(tone: ButtonTone = "primary", size: "md" | "sm" = "md") {
  const sizing = size === "sm" ? "min-h-9 px-3 text-sm" : "min-h-10 px-4 text-sm"
  return `inline-flex items-center justify-center gap-2 rounded-xl py-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${tones[tone]}`
}

export const controlClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-600 focus:ring-4 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-500"
