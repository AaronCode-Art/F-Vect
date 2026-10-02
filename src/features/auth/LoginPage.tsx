import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "./AuthProvider"
import { Button, Input } from "@/components/ui"
import { errorMessage } from "@/hooks/useAsync"

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate("/", { replace: true })
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-36 -top-32 size-[520px] rounded-full border border-white/10" />
        <div className="absolute -right-12 -top-8 size-[270px] rounded-full border border-emerald-300/20" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-emerald-500 text-xl font-black">V</span>
          <span className="text-xl font-black tracking-tight">VECT</span>
        </div>
        <div className="relative max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[.24em] text-emerald-300">Mesa de ayuda</p>
          <h1 className="mt-5 text-5xl font-bold leading-tight">El soporte de tu equipo, en un solo lugar.</h1>
          <p className="mt-5 max-w-lg leading-7 text-slate-300">Registra incidencias, coordina soluciones y mantén el control de tus activos con VECT.</p>
          <div className="mt-9 grid grid-cols-3 gap-3">
            {["Seguimiento", "Colaboración", "Trazabilidad"].map((item) => <div key={item} className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs font-semibold">{item}</div>)}
          </div>
        </div>
        <p className="relative text-xs text-slate-400">Sistema de gestión de incidencias y soporte técnico</p>
      </section>
      <section className="grid place-items-center p-5 sm:p-10">
        <form onSubmit={(event) => void submit(event)} className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <span className="grid size-11 place-items-center rounded-xl bg-emerald-600 text-xl font-black text-white">V</span>
            <p className="mt-3 text-xl font-black">VECT</p>
          </div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Bienvenido</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Inicia sesión</h2>
          <p className="mt-2 text-sm text-slate-500">Usa tus credenciales institucionales para continuar.</p>
          <div className="mt-8 space-y-5">
            <Input label="Correo institucional" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@empresa.com" />
            <Input label="Contraseña" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Ingresa tu contraseña" />
            {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
            <Button className="h-12 w-full" disabled={loading}>{loading ? "Validando…" : "Ingresar"}</Button>
          </div>
          <p className="mt-8 text-center text-xs leading-5 text-slate-400">La sesión usa tokens de acceso y renovación del servicio VECT.</p>
        </form>
      </section>
    </main>
  )
}
