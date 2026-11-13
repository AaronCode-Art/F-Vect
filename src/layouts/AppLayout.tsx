import { useState } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/features/auth/AuthProvider"
import { useEscapeKey } from "@/hooks/useEscapeKey"
import { formatRole } from "@/utils/format"
import { navGroups, navigation } from "@/app/navigation"
import { Icon } from "@/components/icons"

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  useEscapeKey(() => setMobileOpen(false), mobileOpen)
  if (!user) return null

  const name = `${user.nombres} ${user.apellidos}`
  const initials = `${user.nombres[0] || ""}${user.apellidos[0] || ""}`.toUpperCase()
  const allowed = navigation.filter((item) => item.roles.includes(user.rol))
  const current = [...navigation]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => (item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)))
  const currentGroup = navGroups.find((group) => group.id === current?.group)

  async function handleLogout() {
    await logout()
    navigate("/", { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg">
        Saltar al contenido
      </a>
      {mobileOpen && <button aria-label="Cerrar menú" className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside
        aria-label="Navegación principal"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-100 px-5">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-700 text-base font-bold text-white">V</span>
          <div className="leading-tight">
            <p className="text-base font-bold tracking-tight text-slate-950">VECT</p>
            <p className="text-xs text-slate-600">Mesa de ayuda</p>
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => {
            const items = allowed.filter((item) => item.group === group.id)
            if (!items.length) return null
            return (
              <div key={group.id}>
                {group.label && <p className="px-3 pb-1.5 text-xs font-semibold text-slate-600">{group.label}</p>}
                <ul className="space-y-0.5">
                  {items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === "/"}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-brand-50 text-brand-800" : "text-slate-700 hover:bg-slate-100"}`
                        }
                      >
                        <Icon name={item.icon} className="size-[18px]" />
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </nav>

        <div className="shrink-0 border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 px-2 py-1">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-800" aria-hidden="true">{initials}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
              <p className="truncate text-xs text-slate-600">{formatRole(user.rol)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            <Icon name="logout" className="size-[18px]" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 md:px-8">
          <button
            type="button"
            className="grid size-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <Icon name="menu" />
          </button>
          {current && (
            <p className="truncate text-sm text-slate-600">
              {currentGroup?.label && <><span>{currentGroup.label}</span><span className="px-2 text-slate-400" aria-hidden="true">/</span></>}
              <span className="font-semibold text-slate-900">{current.label}</span>
            </p>
          )}
        </header>
        <main id="contenido" tabIndex={-1} className="mx-auto max-w-[1440px] p-4 outline-none md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
