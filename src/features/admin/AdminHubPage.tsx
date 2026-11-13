import { Link } from "react-router-dom"
import { PageHeader, Panel } from "@/components/ui"
import { Icon } from "@/components/icons"
import { navGroups, navigation } from "@/app/navigation"
import { useAuth } from "@/features/auth/AuthProvider"

export function AdminHubPage() {
  const { user } = useAuth()
  const available = navigation.filter((item) => item.roles.includes(user!.rol) && item.to !== "/" && item.to !== "/administracion")
  return (
    <>
      <PageHeader title="Administración" description="Todos los módulos que tu rol puede usar, agrupados por tema." />
      <div className="space-y-6">
        {navGroups.map((group) => {
          const items = available.filter((item) => item.group === group.id)
          if (!items.length) return null
          return (
            <Panel key={group.id} title={group.label}>
              <ul className="divide-y divide-slate-100">
                {items.map((item) => (
                  <li key={item.to}>
                    <Link to={item.to} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50">
                      <Icon name={item.icon} className="size-5 text-brand-700" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-slate-900">{item.label}</span>
                        <span className="mt-0.5 block text-sm text-slate-600">{item.description}</span>
                      </span>
                      <Icon name="chevronRight" className="size-5 text-slate-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )
        })}
      </div>
    </>
  )
}
