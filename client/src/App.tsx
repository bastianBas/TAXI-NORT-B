import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute, useAuth } from "@/lib/auth";

// Componentes de UI y Navegación
import { MainNav } from "@/components/main-nav";
import { DriverGpsTracker } from "@/components/driver-gps-tracker";

// Páginas
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Drivers from "@/pages/drivers";
import Vehicles from "@/pages/vehicles";
import RouteSlips from "@/pages/route-slips"; // Usado para Admin y Público
import Payments from "@/pages/payments";
import Audit from "@/pages/audit";
import NotFound from "@/pages/not-found";

function AppRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {/* ============================================================ */}
      {/* 🟢 ZONA PÚBLICA (ACCESIBLE SIN CONTRASEÑA)                   */}
      {/* ============================================================ */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Esta ruta permite ver el PDF escaneando el QR sin loguearse */}
      <Route path="/public-view" component={RouteSlips} />


      {/* ============================================================ */}
      {/* 🔒 ZONA PRIVADA (SOLO USUARIOS REGISTRADOS)                  */}
      {/* ============================================================ */}
      {!user ? (
        // Si no es ruta pública y no hay usuario, mandar al Login
        <Route>
          <Redirect to="/login" />
        </Route>
      ) : (
        // Si hay usuario, mostrar la App completa
        <Route>
            <div className="min-h-screen w-full bg-background flex flex-col">
              {/* Motor GPS invisible (Solo corre si hay usuario) */}
              <DriverGpsTracker />

              {/* Menú de Navegación */}
              <MainNav />

              {/* Contenido Principal */}
              <main className="flex-1 w-full max-w-screen-2xl mx-auto p-4 md:p-6">
                <div className="animate-in fade-in duration-500">
                  <Switch>
                    <Route path="/" component={Dashboard} />
                    
                    <Route path="/drivers">
                      <ProtectedRoute allowedRoles={["admin", "operator"]}>
                        <Drivers />
                      </ProtectedRoute>
                    </Route>
                    
                    <Route path="/vehicles">
                      <ProtectedRoute allowedRoles={["admin", "operator"]}>
                        <Vehicles />
                      </ProtectedRoute>
                    </Route>
                    
                    <Route path="/route-slips">
                      <ProtectedRoute allowedRoles={["admin", "operator", "driver", "finance"]}>
                        <RouteSlips />
                      </ProtectedRoute>
                    </Route>
                    
                    <Route path="/payments">
                      <ProtectedRoute allowedRoles={["admin", "finance", "driver"]}>
                        <Payments />
                      </ProtectedRoute>
                    </Route>

                    <Route path="/audit">
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <Audit />
                      </ProtectedRoute>
                    </Route>
                    
                    <Route component={NotFound} />
                  </Switch>
                </div>
              </main>
            </div>
        </Route>
      )}
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}