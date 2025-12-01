import { createContext, useContext, ReactNode, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequestJson } from "./queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, InsertUser } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { Route, useLocation } from "wouter";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: any;
  logoutMutation: any;
  registerMutation: any;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  const { data: user, error, isLoading } = useQuery<User | null>({
    queryKey: ["/api/user"],
    retry: false,
    staleTime: Infinity, // Importante para evitar refetching innecesario
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const res = await apiRequestJson("/api/auth/login", "POST", credentials);
      // Validar que la respuesta tenga el usuario
      if (!res.user) {
        throw new Error("Respuesta de login inválida");
      }
      return res.user;
    },
    onSuccess: (user: User) => {
      // Actualizar manualmente la cache de React Query con el usuario recibido
      queryClient.setQueryData(["/api/user"], user);
      
      toast({ title: "Bienvenido", description: `Hola de nuevo, ${user.name}` });
    },
    onError: (error: Error) => {
      toast({
        title: "Error de acceso",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequestJson("/api/auth/logout", "POST");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      queryClient.removeQueries({ queryKey: ["/api/drivers"] });
      queryClient.removeQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Sesión cerrada", description: "Has salido exitosamente" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (newUser: InsertUser) => {
      const res = await apiRequestJson("/api/auth/register", "POST", newUser);
      return res.user;
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({ title: "Cuenta creada", description: "Bienvenido a TaxiNort" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error de registro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error: error as Error | null,
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
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}

// --- ESTE ES EL COMPONENTE QUE FALTABA Y CAUSABA EL ERROR ---
export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          Redirigiendo...
          <RedirectToLogin setLocation={setLocation} />
        </div>
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}

// Componente auxiliar para redirección segura
function RedirectToLogin({ setLocation }: { setLocation: (path: string) => void }) {
  useEffect(() => {
    setLocation("/login");
  }, [setLocation]);
  return null;
}