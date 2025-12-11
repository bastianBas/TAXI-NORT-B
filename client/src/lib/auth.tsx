import { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User as SelectUser, InsertUser } from "@shared/schema";
import { apiRequestJson } from "./queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: any;
  logoutMutation: any;
  registerMutation: any;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      // Si no hay token, no intentamos verificar sesión
      if (!token) return null;

      const res = await fetch("/api/user", {
        headers: { "Authorization": `Bearer ${token}` },
      });

      if (res.status === 401) {
        // Token inválido o expirado
        localStorage.removeItem("auth_token");
        return null;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch user");
      }

      return res.json();
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      // CORREGIDO: Ruta coincide con server/auth.ts
      const data = await apiRequestJson("/api/auth/login", "POST", credentials);
      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }
      return data.user;
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Bienvenido",
        description: `Hola de nuevo, ${user.name}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al iniciar sesión",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      // CORREGIDO: Ruta coincide con server/auth.ts
      const data = await apiRequestJson("/api/auth/register", "POST", credentials);
      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }
      return data.user;
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registro exitoso",
        description: "Tu cuenta ha sido creada.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error en el registro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // CORREGIDO: Ruta coincide con server/auth.ts
      await apiRequestJson("/api/auth/logout", "POST");
    },
    onSuccess: () => {
      // SOLUCIÓN LOGIN: Limpiamos token y estado
      localStorage.removeItem("auth_token");
      queryClient.setQueryData(["/api/user"], null);
      // Redirección opcional, aunque App.tsx lo manejará al detectar user null
      window.location.href = "/login";
    },
    onError: (error: Error) => {
      // Fallback: Limpiamos localmente aunque falle el server
      localStorage.removeItem("auth_token");
      queryClient.setQueryData(["/api/user"], null);
      window.location.href = "/login";
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// RESTAURADO: El componente ProtectedRoute necesario para App.tsx
export function ProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: ReactNode;
  allowedRoles?: string[];
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  // Verificación de roles (si se especifican)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Si no tiene permiso, redirigimos al inicio
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}