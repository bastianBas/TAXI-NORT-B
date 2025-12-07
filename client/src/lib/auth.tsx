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
  const [, setLocation] = useLocation();

  // Cargar usuario si existe token
  const { data: user, error, isLoading } = useQuery<User | null>({
    queryKey: ["/api/user"],
    retry: false,
    enabled: !!localStorage.getItem("auth_token"), 
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const res = await apiRequestJson("/api/auth/login", "POST", credentials);
      // GUARDAR TOKEN EN LOCALSTORAGE
      if (res.token) {
        localStorage.setItem("auth_token", res.token);
      }
      return res.user;
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({ title: "Bienvenido", description: `Hola de nuevo, ${user.name}` });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({ title: "Error de acceso", description: error.message, variant: "destructive" });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // 1. Borrar token localmente PRIMERO
      localStorage.removeItem("auth_token");
      
      // 2. Avisar al servidor
      try {
        await apiRequestJson("/api/auth/logout", "POST");
      } catch (e) {
        console.warn("Logout server warning:", e);
      }
    },
    onSuccess: () => {
      // 3. Limpiar estado
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear(); 
      
      // 4. Redirigir
      setLocation("/login");
      toast({ title: "Sesión cerrada", description: "Has salido exitosamente" });
    },
    onError: () => {
      localStorage.removeItem("auth_token");
      queryClient.setQueryData(["/api/user"], null);
      setLocation("/login");
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (newUser: InsertUser) => {
      const res = await apiRequestJson("/api/auth/register", "POST", newUser);
      // GUARDAR TOKEN AL REGISTRARSE
      if (res.token) {
        localStorage.setItem("auth_token", res.token);
      }
      return res.user;
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      setLocation("/");
      toast({ title: "Cuenta creada con éxito", description: "Bienvenido a TaxiNort" });
    },
    onError: (error: Error) => {
      toast({ title: "Error de registro", description: error.message, variant: "destructive" });
    },
  });

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, error: error as Error | null, loginMutation, logoutMutation, registerMutation }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return context;
}

export function ProtectedRoute({ path, component: Component }: { path: string; component: () => React.JSX.Element }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-border" /></div>;

  if (!user) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
           Redirigiendo...
           {/* Corrección: Ya no pasamos props, el componente maneja su propia redirección */}
           <RedirectToLogin />
        </div>
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}

// Componente auxiliar corregido: Obtiene setLocation internamente
function RedirectToLogin() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    setLocation("/login");
  }, [setLocation]);
  
  return null;
}