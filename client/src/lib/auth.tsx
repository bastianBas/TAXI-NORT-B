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

  const { data: user, error, isLoading } = useQuery<User | null>({
    queryKey: ["/api/user"],
    retry: false,
    enabled: !!localStorage.getItem("auth_token"),
  });

  // Si el token caducó, limpiamos automáticamente
  useEffect(() => {
    if (error) {
      localStorage.removeItem("auth_token");
      queryClient.setQueryData(["/api/user"], null);
    }
  }, [error]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const res = await apiRequestJson("/api/auth/login", "POST", credentials);
      if (res.token) localStorage.setItem("auth_token", res.token);
      return res.user;
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({ title: "Bienvenido", description: `Hola, ${user.name}` });
      // Forzamos recarga para asegurar un estado limpio
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // --- AQUÍ ESTÁ LA SOLUCIÓN DEL LOGOUT ---
  const logoutMutation = useMutation({
    mutationFn: async () => {
      // 1. Borramos el token INMEDIATAMENTE
      localStorage.removeItem("auth_token");
      
      // 2. Intentamos avisar al servidor pero sin esperar (fire and forget)
      apiRequestJson("/api/auth/logout", "POST").catch(console.error);
      
      return true;
    },
    onSuccess: () => {
      // 3. Limpiamos la memoria de la app
      queryClient.clear();
      // 4. FORZAMOS la recarga de la página hacia el login
      window.location.href = "/login";
    },
    onError: () => {
      // Si algo falla, forzamos la salida igual
      localStorage.removeItem("auth_token");
      window.location.href = "/login";
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (newUser: InsertUser) => {
      const res = await apiRequestJson("/api/auth/register", "POST", newUser);
      if (res.token) localStorage.setItem("auth_token", res.token);
      return res.user;
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({ title: "Cuenta creada", description: "Bienvenido" });
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
  if (!context) throw new Error("useAuth error");
  return context;
}

export function ProtectedRoute({ path, component: Component }: { path: string; component: () => React.JSX.Element }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!user) return <Route path={path}><RedirectToLogin /></Route>;
  return <Route path={path} component={Component} />;
}

function RedirectToLogin() {
  useEffect(() => {
    if (window.location.pathname !== "/login") window.location.href = "/login";
  }, []);
  return null;
}