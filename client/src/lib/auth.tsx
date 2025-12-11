import { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User as SelectUser, InsertUser } from "@shared/schema";
import { apiRequestJson } from "./queryClient"; // Importación corregida
import { useToast } from "@/hooks/use-toast";

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
      // Implementación manual para verificar sesión sin redirigir forzosamente
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/user", {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });

      if (res.status === 401) {
        return null; // Si no está autenticado, simplemente retornamos null
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
      // Usamos apiRequestJson con el orden correcto: URL, METODO, BODY
      const data = await apiRequestJson("/api/login", "POST", credentials);
      
      // Guardamos el token si la respuesta lo incluye
      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }
      return data;
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
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
      // Usamos apiRequestJson con el orden correcto: URL, METODO, BODY
      const data = await apiRequestJson("/api/register", "POST", credentials);
      return data;
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
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
      // Usamos apiRequestJson para llamar al logout del backend
      await apiRequestJson("/api/logout", "POST");
    },
    onSuccess: () => {
      // Limpieza exitosa
      localStorage.removeItem("auth_token");
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      // Forzamos limpieza local incluso si el backend falla
      localStorage.removeItem("auth_token");
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Sesión cerrada localmente",
        description: "Hubo un error de conexión, pero se cerró tu sesión en este dispositivo.",
        variant: "destructive",
      });
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