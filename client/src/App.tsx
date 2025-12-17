import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute, useAuth } from "@/lib/auth";

// 🟢 CAMBIO: Usamos el nuevo menú superior
import { MainNav } from "@/components/main-nav";

import { DriverGpsTracker } from "@/components/driver-gps-tracker";

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/">
          <Redirect to="/login" />
        </Route>
        <Route component={Login} />
      </Switch>
    );
  }

  // ESTRUCTURA CON MENÚ SUPERIOR (Mejor para móviles)
  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      
      {/* 1. MOTOR GPS INVISIBLE (No tocar, ya funciona bien) */}
      <DriverGpsTracker />

      {/* 2. BARRA DE NAVEGACIÓN SUPERIOR */}
      <MainNav />

      {/* 3. CONTENIDO PRINCIPAL */}
      <main className="flex-1 w-full max-w-screen-2xl mx-auto p-4 md:p-6">
        <div className="animate-in fade-in duration-500">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/login">
              <Redirect to="/" />
            </Route>
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