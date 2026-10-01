import { Navigate, Route, Routes } from "react-router-dom"
import { AppLayout } from "@/layouts/AppLayout"
import { navigation } from "./navigation"
import { AuthProvider, useAuth } from "@/features/auth/AuthProvider"
import { LoginPage } from "@/features/auth/LoginPage"
import { DashboardPage } from "@/features/dashboard/DashboardPage"
import { IncidentsPage } from "@/features/incidents/IncidentsPage"
import { RequestsPage } from "@/features/requests/RequestsPage"
import { MessagesPage } from "@/features/messages/MessagesPage"
import { InventoryPage } from "@/features/inventory/InventoryPage"
import { AssetsPage } from "@/features/assets/AssetsPage"
import { UsersPage } from "@/features/users/UsersPage"
import { ReportsPage } from "@/features/reports/ReportsPage"
import { CatalogPage } from "@/features/admin/CatalogPage"
import { LocationsPage } from "@/features/admin/LocationsPage"
import { ParametersPage, AutomationPage } from "@/features/admin/AdminConfigPages"
import { AuditPage } from "@/features/admin/AuditPage"
import { HistoryPage } from "@/features/history/HistoryPage"
import { AdminHubPage } from "@/features/admin/AdminHubPage"
import { Button, PageHeader, Panel } from "@/components/ui"

function DeniedPage() {
  return <><PageHeader title="Acceso restringido" description="Tu rol no tiene permiso para acceder a este módulo." /><Panel><div className="p-6"><Button onClick={() => window.history.back()}>Volver</Button></div></Panel></>
}

function AccessGate({ path, children }: { path: string; children: React.ReactNode }) {
  const { user } = useAuth()
  const allowed = navigation.some((item) => item.to === path && item.roles.includes(user!.rol))
  return allowed ? children : <DeniedPage />
}

function ProtectedApp() {
  const { user, ready } = useAuth()
  if (!ready) return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Cargando VECT…</div>
  if (!user) return <LoginPage />

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/incidencias" element={<AccessGate path="/incidencias"><IncidentsPage /></AccessGate>} />
        <Route path="/solicitudes" element={<AccessGate path="/solicitudes"><RequestsPage /></AccessGate>} />
        <Route path="/mensajes" element={<AccessGate path="/mensajes"><MessagesPage /></AccessGate>} />
        <Route path="/historial" element={<AccessGate path="/historial"><HistoryPage /></AccessGate>} />
        <Route path="/activos" element={<AccessGate path="/activos"><AssetsPage /></AccessGate>} />
        <Route path="/ubicaciones" element={<AccessGate path="/ubicaciones"><LocationsPage /></AccessGate>} />
        <Route path="/inventario" element={<AccessGate path="/inventario"><InventoryPage /></AccessGate>} />
        <Route path="/usuarios" element={<AccessGate path="/usuarios"><UsersPage /></AccessGate>} />
        <Route path="/equipo-ti" element={<AccessGate path="/equipo-ti"><UsersPage teamOnly /></AccessGate>} />
        <Route path="/reportes" element={<AccessGate path="/reportes"><ReportsPage /></AccessGate>} />
        <Route path="/categorias" element={<AccessGate path="/categorias"><CatalogPage kind="categories" /></AccessGate>} />
        <Route path="/especialidades" element={<AccessGate path="/especialidades"><CatalogPage kind="specialties" /></AccessGate>} />
        <Route path="/auditoria" element={<AccessGate path="/auditoria"><AuditPage /></AccessGate>} />
        <Route path="/automatizacion" element={<AccessGate path="/automatizacion"><AutomationPage /></AccessGate>} />
        <Route path="/parametros" element={<AccessGate path="/parametros"><ParametersPage /></AccessGate>} />
        <Route path="/administracion" element={<AccessGate path="/administracion"><AdminHubPage /></AccessGate>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export function App() {
  return <AuthProvider><ProtectedApp /></AuthProvider>
}
