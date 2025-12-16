import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Función helper para hacer peticiones fetch más limpias
export async function apiRequest(
  method: string,
  path: string,
  body?: unknown | undefined,
): Promise<any> {
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Error en la petición: ${res.statusText}`);
  }

  // Si la respuesta no tiene contenido (ej: 204), retornamos null
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return null;
  }

  return res.json();
}

// Configuración del cliente de React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // No recargar al cambiar de ventana
      retry: false, // No reintentar infinitamente si falla
      staleTime: 5000, // Tiempo de caché
      queryFn: async ({ queryKey }) => {
        // Fetcher por defecto para useQuery
        const res = await fetch(queryKey[0] as string);
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      }
    },
    mutations: {
      retry: false,
    }
  },
});