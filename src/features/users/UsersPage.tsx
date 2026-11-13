import { useState, type FormEvent } from "react"
import { ActiveBadge, Button, ConfirmDialog, Dialog, EmptyNotice, ErrorNotice, Input, LoadingNotice, Notice, PageHeader, Panel, ReviewDialog, Select, Table, Tbody, Td, Th, Thead, formatRole } from "@/components/ui"
import { Icon } from "@/components/icons"
import { useAuth } from "@/features/auth/AuthProvider"
import { errorMessage, useAsync } from "@/hooks/useAsync"
import { usersApi } from "./api"
import type { ReviewRequest } from "@/components/ui"
import type { ApiRole, ApiUser } from "@/types/api"

const roles: ApiRole[] = ["EMPLEADO", "TECNICO", "SUPERVISOR", "GERENCIA", "ADMIN"]
const userGroups = [
  { id: "empleados", label: "Empleados", roles: ["EMPLEADO"] },
  { id: "supervisores", label: "Supervisores TI", roles: ["SUPERVISOR"] },
  { id: "tecnicos", label: "Técnicos", roles: ["TECNICO"] },
  { id: "administracion", label: "Administración", roles: ["GERENCIA", "ADMIN"] },
] as const
type UserGroupId = (typeof userGroups)[number]["id"]

export function UsersPage({ teamOnly = false }: { teamOnly?: boolean }) {
  const { user } = useAuth()
  const users = useAsync(usersApi.list, [])
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [review, setReview] = useState<ReviewRequest | null>(null)
  const [toDeactivate, setToDeactivate] = useState<{ id: string; name: string } | null>(null)
  const [toResetMfa, setToResetMfa] = useState<{ id: string; name: string } | null>(null)
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null)
  const [editing, setEditing] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<UserGroupId>("empleados")
  const isSupervisor = user?.rol === "SUPERVISOR"
  const canManageUsers = ["ADMIN", "GERENCIA", "SUPERVISOR"].includes(user?.rol || "")
  const availableGroups = isSupervisor ? userGroups.filter((group) => group.id === "tecnicos") : userGroups
  const activeGroup = availableGroups.find((group) => group.id === selectedGroup) ?? availableGroups[0]
  const roleVisible = (users.data || []).filter((item) =>
    teamOnly ? item.rol === "TECNICO" : !isSupervisor || item.rol === "TECNICO",
  )
  const visible = teamOnly
    ? roleVisible
    : roleVisible.filter((item) => activeGroup.roles.some((role) => role === item.rol))
  const assignable: ApiRole[] = user?.rol === "SUPERVISOR" ? ["TECNICO"] : roles
  const canDeactivate = ["ADMIN", "GERENCIA"].includes(user?.rol || "")
  const canResetMfa = ["ADMIN", "GERENCIA"].includes(user?.rol || "")

  function askCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setReview({
      title: "¿Crear este usuario?",
      items: [
        ["Nombre", `${data.get("nombres")} ${data.get("apellidos")}`],
        ["Correo", String(data.get("correo"))],
        ["Teléfono", String(data.get("telefono") || "")],
        ["Rol", formatRole(String(data.get("rol")))],
        ["Contraseña temporal", "••••••••"],
      ],
      confirmLabel: "Crear usuario",
      run: () => create(data),
    })
  }

  async function create(data: FormData) {
    setSaving(true)
    setError(null)
    setNotice(null)
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

  async function deactivate() {
    if (!toDeactivate) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await usersApi.deactivate(toDeactivate.id)
      await users.reload()
      setNotice(`${toDeactivate.name} fue desactivado.`)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
      setToDeactivate(null)
    }
  }

  async function resetMfa() {
    if (!toResetMfa) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await usersApi.resetMfa(toResetMfa.id)
      setNotice(`Se reinició el autenticador de ${toResetMfa.name}. Deberá registrar uno nuevo al iniciar sesión.`)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
      setToResetMfa(null)
    }
  }

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingUser) return
    const data = new FormData(event.currentTarget)
    const password = String(data.get("contrasena") || "")
    const body: Record<string, unknown> = {
      nombres: String(data.get("nombres")),
      apellidos: String(data.get("apellidos")),
      correo: String(data.get("correo")),
      telefono: String(data.get("telefono") || ""),
      rol: String(data.get("rol")),
      activo: canDeactivate ? String(data.get("activo")) === "true" : editingUser.activo,
    }
    if (password.trim()) body.contrasena = password
    setEditing(true)
    setError(null)
    setNotice(null)
    try {
      await usersApi.update(editingUser.id, body)
      await users.reload()
      setNotice(`Se actualizaron los datos de ${editingUser.nombres} ${editingUser.apellidos}.`)
      setEditingUser(null)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setEditing(false)
    }
  }

  return (
    <>
      <PageHeader
        title={teamOnly ? "Equipo TI" : "Usuarios"}
        description={teamOnly ? "Técnicos activos que puedes asignar a incidencias." : "Directorio de usuarios. Las acciones disponibles dependen de tu rol."}
        action={!teamOnly && canManageUsers ? (
          <Button tone={open ? "neutral" : "primary"} onClick={() => setOpen((value) => !value)}>
            {open ? "Cancelar" : <><Icon name="plus" className="size-4" /> Crear usuario</>}
          </Button>
        ) : undefined}
      />
      {notice && <div className="mb-4"><Notice tone="success">{notice}</Notice></div>}
      {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
      {open && (
        <Panel title="Crear usuario" description={`Roles que puedes asignar: ${assignable.map(formatRole).join(", ")}.`} className="mb-6">
          <form onSubmit={askCreate} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Nombres" name="nombres" required maxLength={100} />
            <Input label="Apellidos" name="apellidos" required maxLength={100} />
            <Input label="Correo" name="correo" type="email" required maxLength={255} />
            <Input label="Teléfono" hint="Opcional." name="telefono" maxLength={30} />
            <Select label="Rol" name="rol" required>{assignable.map((role) => <option key={role} value={role}>{formatRole(role)}</option>)}</Select>
            <Input label="Contraseña temporal" hint="Mínimo 8 caracteres." name="contrasena" type="password" minLength={8} required />
            <div className="sm:col-span-2 lg:col-span-3"><Button type="submit" disabled={saving}>{saving ? "Creando…" : "Crear usuario"}</Button></div>
          </form>
        </Panel>
      )}
      {!teamOnly && canManageUsers && availableGroups.length > 1 && (
        <div role="tablist" aria-label="Tipo de usuario" className="mb-4 flex flex-wrap gap-2">
          {availableGroups.map((group) => {
            const count = roleVisible.filter((item) => group.roles.some((role) => role === item.rol)).length
            return (
              <Button
                key={group.id}
                role="tab"
                aria-selected={activeGroup.id === group.id}
                tone={activeGroup.id === group.id ? "primary" : "neutral"}
                onClick={() => setSelectedGroup(group.id)}
              >
                {group.label} ({count})
              </Button>
            )
          })}
        </div>
      )}
      <Panel
        title={teamOnly ? "Técnicos" : activeGroup.label}
        description={users.data ? `${visible.length} ${visible.length === 1 ? "usuario" : "usuarios"}` : undefined}
        className="overflow-hidden"
      >
        {users.loading ? <LoadingNotice /> : users.error ? <div className="p-5"><ErrorNotice message={users.error} onRetry={() => void users.reload()} /></div> : !visible.length ? <EmptyNotice /> : (
          <Table minWidth={650}>
            <Thead>
              <Th>Usuario</Th>
              <Th>Rol</Th>
              <Th>Teléfono</Th>
              <Th>Estado</Th>
              {!teamOnly && canManageUsers && <Th className="text-right">Acciones</Th>}
            </Thead>
            <Tbody>
              {visible.map((item) => {
                const name = `${item.nombres} ${item.apellidos}`
                return (
                  <tr key={item.id}>
                    <Td>
                      <span className="block font-semibold text-slate-900">{name}</span>
                      <span className="block text-xs text-slate-600">{item.correo}</span>
                    </Td>
                    <Td>{formatRole(item.rol)}</Td>
                    <Td>{item.telefono || "—"}</Td>
                    <Td><ActiveBadge active={item.activo} /></Td>
                    {!teamOnly && canManageUsers && (
                      <Td className="text-right">
                        <div className="flex justify-end gap-2">
                          {canManageUsers && <Button tone="neutral" size="sm" onClick={() => setEditingUser(item)}>Editar</Button>}
                          {canResetMfa && item.id !== user?.id && (
                            <Button tone="neutral" size="sm" onClick={() => setToResetMfa({ id: item.id, name })}>
                              Restablecer 2FA
                            </Button>
                          )}
                          {item.activo && canDeactivate && item.id !== user?.id && (
                            <Button tone="neutral" size="sm" onClick={() => setToDeactivate({ id: item.id, name })}>Desactivar</Button>
                          )}
                        </div>
                      </Td>
                    )}
                  </tr>
                )
              })}
            </Tbody>
          </Table>
        )}
      </Panel>
      {review && <ReviewDialog review={review} onClose={() => setReview(null)} />}
      {editingUser && (
        <Dialog
          title={`Editar a ${editingUser.nombres} ${editingUser.apellidos}`}
          description="Actualiza los datos del usuario. Deja la contraseña vacía si no deseas cambiarla."
          onClose={() => setEditingUser(null)}
          busy={editing}
          width="max-w-2xl"
        >
          <form onSubmit={(event) => void update(event)}>
            {error && <div className="px-6 pt-5"><ErrorNotice message={error} /></div>}
            <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
              <Input label="Nombres" name="nombres" defaultValue={editingUser.nombres} required maxLength={100} />
              <Input label="Apellidos" name="apellidos" defaultValue={editingUser.apellidos} required maxLength={100} />
              <Input label="Correo" name="correo" type="email" defaultValue={editingUser.correo} required maxLength={255} />
              <Input label="Teléfono" hint="Opcional." name="telefono" defaultValue={editingUser.telefono || ""} maxLength={30} />
              <Select label="Rol" name="rol" defaultValue={editingUser.rol} required>
                {assignable.map((role) => <option key={role} value={role}>{formatRole(role)}</option>)}
              </Select>
              {canDeactivate && (
                <Select label="Estado" name="activo" defaultValue={String(editingUser.activo)} required>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </Select>
              )}
              <Input label="Nueva contraseña" hint="Opcional. Mínimo 8 caracteres." name="contrasena" type="password" minLength={8} maxLength={100} />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <Button tone="quiet" onClick={() => setEditingUser(null)} disabled={editing}>Cancelar</Button>
              <Button type="submit" disabled={editing}>{editing ? "Guardando…" : "Guardar cambios"}</Button>
            </div>
          </form>
        </Dialog>
      )}
      {toDeactivate && (
        <ConfirmDialog
          title={`¿Desactivar a ${toDeactivate.name}?`}
          message="El usuario quedará como inactivo en el directorio."
          confirmLabel="Desactivar usuario"
          tone="danger"
          busy={saving}
          onConfirm={() => void deactivate()}
          onCancel={() => setToDeactivate(null)}
        />
      )}
      {toResetMfa && (
        <ConfirmDialog
          title={`¿Restablecer el autenticador de ${toResetMfa.name}?`}
          message="Se eliminará el autenticador actual y se borrará el bloqueo por intentos fallidos. Los códigos del dispositivo anterior dejarán de funcionar; en su próximo inicio de sesión tendrá que escanear un QR y confirmar un código para registrar uno nuevo."
          confirmLabel="Restablecer autenticador"
          busy={saving}
          onConfirm={() => void resetMfa()}
          onCancel={() => setToResetMfa(null)}
        />
      )}
    </>
  )
}
