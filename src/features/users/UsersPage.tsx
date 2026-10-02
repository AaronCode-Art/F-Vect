import { useState, type FormEvent } from "react"
import { Button, EmptyNotice, ErrorNotice, Input, LoadingNotice, PageHeader, Panel, Select, formatRole } from "@/components/ui"
import { useAuth } from "@/features/auth/AuthProvider"
import { errorMessage, useAsync } from "@/hooks/useAsync"
import { usersApi } from "./api"
import type { ApiRole } from "@/types/api"

const roles: ApiRole[] = ["EMPLEADO", "TECNICO", "SUPERVISOR", "GERENCIA", "ADMIN"]

export function UsersPage({ teamOnly = false }: { teamOnly?: boolean }) {
  const { user } = useAuth()
  const users = useAsync(usersApi.list, [])
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const isSupervisor = user?.rol === "SUPERVISOR"
  const visible = (users.data || []).filter((item) =>
    teamOnly ? item.rol === "TECNICO" : !isSupervisor || item.rol === "TECNICO",
  )
  const assignable = user?.rol === "SUPERVISOR"
    ? ["TECNICO"]
    : user?.rol === "GERENCIA"
      ? ["SUPERVISOR", "TECNICO", "EMPLEADO"]
      : roles

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setSaving(true)
    setError(null)
    try {
      await usersApi.create({
        nombres: String(data.get("nombres")),
        apellidos: String(data.get("apellidos")),
        correo: String(data.get("correo")),
        telefono: String(data.get("telefono") || ""),
        rol: String(data.get("rol")),
        activo: true,
        contrasena: String(data.get("contrasena")),
      })
      await users.reload()
      setNotice("Usuario creado.")
      setOpen(false)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  async function deactivate(id: string, name: string) {
    if (!window.confirm(`¿Desactivar a ${name}?`)) return
    setError(null)
    try {
      await usersApi.deactivate(id)
      await users.reload()
      setNotice("Usuario desactivado.")
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  return (
    <>
      <PageHeader title={teamOnly ? "Equipo TI" : "Usuarios"} description={teamOnly ? "Técnicos activos disponibles para asignación." : "Directorio y administración de usuarios según el rol autenticado."} action={!teamOnly ? <Button onClick={() => setOpen((value) => !value)}>{open ? "Cancelar" : "+ Crear usuario"}</Button> : undefined} />
      {notice && <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
      {open && <Panel title="Crear usuario" description={`Roles que puedes crear: ${assignable.map(formatRole).join(", ")}`} className="mb-5"><form onSubmit={(event) => void create(event)} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <Input label="Nombres" name="nombres" required maxLength={100} /><Input label="Apellidos" name="apellidos" required maxLength={100} /><Input label="Correo" name="correo" type="email" required maxLength={255} />
        <Input label="Teléfono" name="telefono" maxLength={30} /><Select label="Rol" name="rol" required>{assignable.map((role) => <option key={role} value={role}>{formatRole(role)}</option>)}</Select><Input label="Contraseña temporal" name="contrasena" type="password" minLength={8} required />
        <Button disabled={saving} className="lg:col-span-3">{saving ? "Creando…" : "Crear usuario"}</Button>
      </form></Panel>}
      <Panel title={teamOnly ? "Técnicos" : "Directorio"} description={users.data ? `${visible.length} usuarios` : undefined}>
        {users.loading ? <LoadingNotice /> : users.error ? <div className="p-4"><ErrorNotice message={users.error} onRetry={() => void users.reload()} /></div> : !visible.length ? <EmptyNotice /> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Usuario</th><th className="px-5 py-3">Rol</th><th className="px-5 py-3">Contacto</th><th className="px-5 py-3">Estado</th>{!teamOnly && <th className="px-5 py-3">Acción</th>}</tr></thead><tbody className="divide-y divide-slate-100">{visible.map((item) => <tr key={item.id}><td className="px-5 py-4"><b>{item.nombres} {item.apellidos}</b><span className="block text-xs text-slate-500">{item.correo}</span></td><td className="px-5 py-4">{formatRole(item.rol)}</td><td className="px-5 py-4">{item.telefono || "—"}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.activo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.activo ? "Activo" : "Inactivo"}</span></td>{!teamOnly && <td className="px-5 py-4">{item.activo && ["ADMIN", "GERENCIA"].includes(user?.rol || "") && item.id !== user?.id && <Button tone="neutral" className="min-h-8 px-3 text-xs" onClick={() => void deactivate(item.id, `${item.nombres} ${item.apellidos}`)}>Desactivar</Button>}</td>}</tr>)}</tbody></table></div>}
      </Panel>
    </>
  )
}
