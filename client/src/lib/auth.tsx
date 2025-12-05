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

  // Intentar cargar usuario si hay un token guardado en localStorage
  const { data: user, error, isLoading } = useQuery<User | null>({
    queryKey: ["/api/user"],
    retry: false,
    // Solo hacemos la petición si existe el token
    enabled: !!localStorage.getItem("auth_token"), 
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const res = await apiRequestJson("/api/auth/login", "POST", credentials);
      // GUARDAR TOKEN: Si el servidor devuelve un token, lo guardamos
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
      // Borramos el token localmente PRIMERO
      localStorage.removeItem("auth_token");
      // Intentamos avisar al servidor (opcional con JWT stateless)
      try {
        await apiRequestJson("/api/auth/logout", "POST");
      } catch (e) {
        // Ignoramos error de logout en servidor, lo importante es borrar el token local
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear(); // Limpiar toda la caché
      setLocation("/login");
      toast({ title: "Sesión cerrada", description: "Has salido exitosamente" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (newUser: InsertUser) => {
      const res = await apiRequestJson("/api/auth/register", "POST", newUser);
      // GUARDAR TOKEN: Si el registro devuelve token, lo guardamos para auto-login
      if (res.token) {
        localStorage.setItem("auth_token", res.token);
      }
      return res.user;
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      setLocation("/");
      toast({ title: "Cuenta creada", description: "Bienvenido a TaxiNort" });
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
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
           Redirigiendo...
           {/* Usamos un componente auxiliar para el efecto de redirección */}
           <RedirectToLogin setLocation={setLocation} />
        </div>
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}

function RedirectToLogin({ setLocation }: { setLocation: (path: string) => void }) {
  useEffect(() => {
    setLocation("/login");
  }, [setLocation]);
  return null;
}