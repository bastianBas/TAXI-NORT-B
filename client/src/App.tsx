import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";

// 🟢 IMPORTANTE: Importamos el AuthProvider que creamos
import { AuthProvider } from "@/hooks/use-auth";

// Importamos la protección de rutas
import { ProtectedRoute } from "./lib/protected-route";

// Páginas
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import DriversPage from "@/pages/drivers";
import VehiclesPage from "@/pages/vehicles";
import RouteSlipsPage from "@/pages/route-slips";
import PaymentsPage from "@/pages/payments";
import AuditPage from "@/pages/audit";
import { AppSidebar } from "@/components/app-sidebar";

// Layout para las páginas protegidas (Con Sidebar)
function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-zinc-950">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Ruta pública: Login */}
      <Route path="/auth" component={Login} />
      
      {/* Rutas Protegidas: Requieren Login */}
      <Route path="/">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Dashboard />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/drivers">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <DriversPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/vehicles">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <VehiclesPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/route-slips">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <RouteSlipsPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/payments">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <PaymentsPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/audit">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <AuditPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      {/* Ruta 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* 🟢 AQUÍ ESTÁ LA CLAVE: Envolvemos todo con AuthProvider */}
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;