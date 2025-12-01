import { QueryClient, QueryFunction } from "@tanstack/react-query";

// AHORA EXPORTAMOS ESTA FUNCIÓN PARA QUE OTROS ARCHIVOS LA PUEDAN USAR
export async function apiRequest({
  queryKey,
}: {
  queryKey: readonly unknown[];
}) {
  const [path] = queryKey as [string];
  // IMPORTANTE: credentials: 'include' permite enviar la cookie de sesión
  const res = await fetch(path, { credentials: 'include' });

  if (!res.ok) {
    if (res.status === 401) {
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
      retry: false, // No reintentar si falla por auth
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
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include", // IMPORTANTE: Enviar cookies
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("No autenticado");
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Error ${res.status}`);
  }

  // Si no hay contenido (ej. logout), retornar null
  if (res.status === 204) return null;
  
  return res.json().catch(() => null);
}