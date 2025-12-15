import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute, useAuth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar"; 
import { LocationTracker } from "@/components/location-tracker";
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

  // Pantalla de carga centralizada para evitar parpadeos
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground animate-pulse">Cargando TaxiNort...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        {/* Cualquier otra ruta redirige a login */}
        <Route path="/:rest*">
          <Redirect to="/login" />
        </Route>
      </Switch>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      
      {/* Tracker GPS activo solo si hay usuario logueado */}
      <LocationTracker />

      <AppSidebar />

      <main className="flex-1 w-full max-w-screen-2xl mx-auto p-6">
        <div className="animate-in fade-in duration-500">
          <Switch>
            <Route path="/" component={Dashboard} />
            
            {/* Si un usuario logueado intenta ir a login, va al dashboard */}
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