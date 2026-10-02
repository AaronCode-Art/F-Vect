import { Link } from "react-router-dom"
import { PageHeader, Panel } from "@/components/ui"
import { navigation } from "@/app/navigation"
import { useAuth } from "@/features/auth/AuthProvider"

export function AdminHubPage() {
  const { user } = useAuth()
  const links = navigation.filter((item) => item.to !== "/" && item.roles.includes(user!.rol))
  return (
    <>
      <PageHeader title="Administración" description="Accesos disponibles para tu rol." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {links.map((item) => <Link key={item.to} to={item.to} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"><span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-xl text-emerald-700">{item.icon}</span><h2 className="mt-4 font-bold">{item.label}</h2><p className="mt-1 text-xs text-slate-500">Abrir módulo con acceso habilitado para {user?.rol}.</p></Link>)}
      </div>
      <Panel title="Integridad del sistema" className="mt-5"><p className="p-5 text-sm leading-6 text-slate-600">Los permisos se aplican en el backend y se reflejan aquí en la navegación. Los perfiles y datos solo se cargan desde las APIs VECT.</p></Panel>
    </>
  )
}
