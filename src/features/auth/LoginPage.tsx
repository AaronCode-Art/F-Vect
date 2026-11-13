import { useEffect, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import QRCode from "qrcode"
import { useAuth } from "./AuthProvider"
import { Button, ErrorNotice, Input } from "@/components/ui"
import { errorMessage } from "@/hooks/useAsync"

export function LoginPage() {
  const { login, verifyMfa } = useAuth()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<"credentials" | "setup" | "code">("credentials")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [challengeToken, setChallengeToken] = useState("")
  const [otpauthUri, setOtpAuthUri] = useState("")
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    if (!otpauthUri) return
    void QRCode.toDataURL(otpauthUri, { width: 240, margin: 2 })
      .then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl)
      })
      .catch(() => {
        if (active) setError("No se pudo generar el código QR. Intenta iniciar sesión de nuevo.")
      })
    return () => { active = false }
  }, [otpauthUri])

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const flow = await login(email, password)
      if (flow.status === "MFA_SETUP_REQUIRED" && flow.challengeToken && flow.otpauthUri) {
        setChallengeToken(flow.challengeToken)
        setOtpAuthUri(flow.otpauthUri)
        setPhase("setup")
      } else if (flow.status === "MFA_CODE_REQUIRED" && flow.challengeToken) {
        setChallengeToken(flow.challengeToken)
        setPhase("code")
      } else {
        throw new Error("El servidor no inició el flujo de autenticación de dos factores.")
      }
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setLoading(false)
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await verifyMfa(challengeToken, code)
      navigate("/", { replace: true })
    } catch (caught) {
      setError(errorMessage(caught))
      setCode("")
    } finally {
      setLoading(false)
    }
  }

  function restartLogin() {
    setPhase("credentials")
    setChallengeToken("")
    setOtpAuthUri("")
    setQrDataUrl("")
    setCode("")
    setError(null)
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_.95fr]">
      <section className="hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-600 text-lg font-bold">V</span>
          <span className="text-xl font-bold tracking-tight">VECT</span>
        </div>
        <div className="max-w-xl">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">El soporte de tu equipo, en un solo lugar.</h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-slate-300">Registra incidencias, coordina soluciones y mantén el control de tus activos.</p>
        </div>
        <p className="text-sm text-slate-400">Sistema de gestión de incidencias y soporte técnico</p>
      </section>
      <section className="grid place-items-center p-5 sm:p-10">
        <form
          onSubmit={(event) => void (phase === "credentials" ? submitCredentials(event) : submitCode(event))}
          className="w-full max-w-md"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-700 text-lg font-bold text-white">V</span>
            <p className="text-xl font-bold tracking-tight">VECT</p>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
            {phase === "credentials" ? "Inicia sesión" : phase === "setup" ? "Configura tu autenticador" : "Verifica tu identidad"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {phase === "credentials"
              ? "Usa tus credenciales institucionales para continuar."
              : phase === "setup"
                ? "Escanea este QR con Google Authenticator, Microsoft Authenticator o una app TOTP compatible."
                : "Ingresa el código de 6 dígitos de tu aplicación autenticadora."}
          </p>
          <div className="mt-8 space-y-5">
            {phase === "credentials" ? (
              <>
                <Input label="Correo institucional" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@empresa.com" />
                <Input label="Contraseña" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
              </>
            ) : (
              <>
                {phase === "setup" && (
                  <div className="grid justify-items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
                    {qrDataUrl
                      ? <img src={qrDataUrl} alt="Código QR para configurar el autenticador" className="size-60" />
                      : <span className="grid size-60 place-items-center text-sm text-slate-500">Generando código QR…</span>}
                    <p className="text-center text-xs text-slate-600">Cuenta: {email}</p>
                  </div>
                )}
                <Input
                  label="Código de 6 dígitos"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-[0.4em]"
                />
              </>
            )}
            {error && <ErrorNotice message={error} />}
            <Button
              type="submit"
              className="h-12 w-full"
              disabled={loading || (phase === "setup" && !qrDataUrl)}
            >
              {loading ? "Validando…" : phase === "credentials" ? "Continuar" : phase === "setup" ? "Activar autenticador" : "Verificar código"}
            </Button>
            {phase !== "credentials" && (
              <button type="button" onClick={restartLogin} className="w-full text-center text-sm font-medium text-brand-700 hover:text-brand-800">
                Volver al inicio de sesión
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
  )
}
