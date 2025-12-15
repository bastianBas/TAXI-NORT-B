import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute, useAuth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar"; 
import { LocationTracker } from "@/components/location-tracker";
import { Loader2 } from "lucide-react";

// Páginas
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Drivers from "@/pages/drivers";
import Vehicles from "@/pages/vehicles";
import RouteSlips from "@/pages/route-slips";
import Payments from "@/pages/payments";
import Audit from "@/pages/audit";
import NotFound from "@/pages/not-found";

function AppRouter() {
  const { user, isLoading } = useAuth();

  // 1. PANTALLA DE CARGA (Evita el blanco inicial)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Cargando TaxiNort...</p>
        </div>
      </div>
    );
  }

  // 2. SI NO HAY USUARIO -> Solo permite Login/Registro
  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        {/* Cualquier otra ruta redirige al login */}
        <Route path="/:rest*">
          <Redirect to="/login" />
        </Route>
      </Switch>
    );
  }

  // 3. SI HAY USUARIO -> Muestra la App Completa
  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <LocationTracker />
      <AppSidebar />
      <main className="flex-1 w-full max-w-screen-2xl mx-auto p-4 md:p-6 overflow-x-hidden">
        <div className="animate-in fade-in zoom-in-95 duration-300">
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
            {/* Si intenta ir a login estando logueado, vuelve al inicio */}
            <Route path="/login"><Redirect to="/" /></Route>
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
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