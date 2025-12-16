import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  children,
  component: Component,
  path,
}: {
  children?: React.ReactNode;
  component?: React.ComponentType<any>;
  path?: string;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  // Si se pasa un componente específico
  if (Component) {
    return <Route path={path} component={Component} />;
  }

  // Si se pasan hijos directos
  return <>{children}</>;
}