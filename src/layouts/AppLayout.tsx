import { useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { useAuth } from "@/features/auth/AuthProvider"
import { formatRole } from "@/utils/format"
import { navigation } from "@/app/navigation"

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  if (!user) return null
  const name = `${user.nombres} ${user.apellidos}`
  const initials = `${user.nombres[0] || ""}${user.apellidos[0] || ""}`.toUpperCase()

  async function handleLogout() {
    await logout()
    navigate("/", { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {mobileOpen && (
        <button
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-600 text-lg font-black text-white">V</span>
          <div>
            <p className="text-lg font-black tracking-tight text-slate-950">VECT</p>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Service desk</p>
          </div>
        </div>
        <div className="px-4 pt-5">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Menú principal</p>
          <nav className="space-y-1">
            {navigation.filter((item) => item.roles.includes(user.rol)).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <span className="grid size-6 place-items-center text-lg">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="mt-auto border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800">{initials}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{name}</p>
              <p className="truncate text-xs text-slate-500">{formatRole(user.rol)}</p>
            </div>
            <button className="rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:bg-white" onClick={() => void handleLogout()} title="Cerrar sesión">Salir</button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8">
          <button className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">☰</button>
          <div className="hidden text-xs font-semibold text-slate-400 sm:block">VECT <span className="px-2">/</span> Plataforma de soporte</div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs font-bold text-slate-500 sm:block">{formatRole(user.rol)}</span>
            <span className="grid size-9 place-items-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800">{initials}</span>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] p-4 md:p-8"><Outlet /></main>
      </div>
    </div>
  )
}
