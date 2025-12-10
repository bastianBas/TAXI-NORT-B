import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Función para obtener el token guardado
function getToken() {
  return localStorage.getItem("auth_token");
}

// Función helper para crear headers con autenticación
function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

export async function apiRequest({
  queryKey,
}: {
  queryKey: readonly unknown[];
}) {
  const [path] = queryKey as [string];
  
  // Enviamos el token en el header Authorization
  const res = await fetch(path, {
    headers: getAuthHeaders() // Simplificado para evitar error de tipos
  });

  if (!res.ok) {
    if (res.status === 401) {
      // Si el token es inválido, lo borramos y redirigimos
      localStorage.removeItem("auth_token");
      if (window.location.pathname !== "/login") {
         window.location.href = "/login";
      }
      throw new Error("No autenticado");
    }
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: apiRequest as QueryFunction,
      refetchOnWindowFocus: false,
      retry: false, 
    },
    mutations: {
      retry: false,
    },
  },
});

export async function apiRequestJson(
  path: string,
  method: string = "GET",
  body?: any
) {
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders() // Aquí TypeScript ya aceptará la mezcla correctamente
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("auth_token");
      if (window.location.pathname !== "/login") {
         window.location.href = "/login";
      }
      throw new Error("No autenticado");
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Error ${res.status}`);
  }

  if (res.status === 204) return null;
  
  return res.json().catch(() => null);
}