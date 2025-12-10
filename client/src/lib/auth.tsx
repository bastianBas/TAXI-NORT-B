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

  // Intentamos cargar el usuario al iniciar la app si existe un token
  // Si la petición falla (401), el queryClient borrará el token automáticamente (ver queryClient.ts)
  const { data: user, error, isLoading } = useQuery<User | null>({
    queryKey: ["/api/user"],
    retry: false,
    enabled: !!localStorage.getItem("auth_token"), // Solo ejecuta si hay token
  });

  // Efecto para manejar errores de autenticación globales
  useEffect(() => {
    if (error) {
      localStorage.removeItem("auth_token");
      queryClient.setQueryData(["/api/user"], null);
    }
  }, [error]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const res = await apiRequestJson("/api/auth/login", "POST", credentials);
      // GUARDAR TOKEN (CRÍTICO)
      if (res.token) {
        localStorage.setItem("auth_token", res.token);
      } else {
        throw new Error("No se recibió token del servidor");
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
      // 1. ELIMINAR TOKEN LOCALMENTE (Lo más importante para JWT)
      localStorage.removeItem("auth_token");
      
      // 2. Intentar avisar al servidor (opcional, para borrar cookies si las hubiera)
      try {
        await apiRequestJson("/api/auth/logout", "POST");
      } catch (e) {
        console.warn("Logout server error (ignorable):", e);
      }
    },
    onSuccess: () => {
      // 3. Limpiar todo el estado de React Query
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear(); 
      
      // 4. Redirigir al login
      setLocation("/login");
      toast({ title: "Sesión cerrada", description: "Has salido exitosamente" });
    },
    onError: () => {
      // Incluso si falla la petición al servidor, forzamos la salida local
      localStorage.removeItem("auth_token");
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear();
      setLocation("/login");
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (newUser: InsertUser) => {
      const res = await apiRequestJson("/api/auth/register", "POST", newUser);
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
  const [, setLocation] = useLocation();

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-border" /></div>;

  if (!user) {
    // Si no hay usuario, redirigimos
    return (
      <Route path={path}>
        <RedirectToLogin />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}

function RedirectToLogin() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/login");
  }, [setLocation]);
  return null;
}