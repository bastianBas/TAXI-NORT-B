import { QueryClient, QueryFunction } from "@tanstack/react-query";

function getToken() {
  return localStorage.getItem("auth_token");
}

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
  
  const res = await fetch(path, {
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    if (res.status === 401) {
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
      ...getAuthHeaders()
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

// --- NUEVA FUNCIÓN AGREGADA ---
export async function apiRequestFormData(
  url: string,
  method: string,
  formData: FormData
): Promise<any> {
  const token = getToken();
  const headers: HeadersInit = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  // NOTA: No establecemos 'Content-Type' manualmente, 
  // el navegador lo hace automáticamente para FormData (incluyendo el boundary)

  const res = await fetch(url, {
    method,
    headers, 
    body: formData,
  });

  if (res.status === 401) {
    localStorage.removeItem("auth_token");
    if (window.location.pathname !== "/login") {
       window.location.href = "/login";
    }
    throw new Error("Sesión expirada. Por favor, inicia sesión nuevamente.");
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Error ${res.status}: ${res.statusText}`);
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}