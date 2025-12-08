import { QueryClient, QueryFunction } from "@tanstack/react-query";

function getToken() { return localStorage.getItem("auth_token"); }

function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

export async function apiRequest({ queryKey }: { queryKey: readonly unknown[] }) {
  const [path] = queryKey as [string];
  const res = await fetch(path, { headers: getAuthHeaders() });
  
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("auth_token");
      throw new Error("No autenticado");
    }
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export const queryClient = new QueryClient({
  defaultOptions: { queries: { queryFn: apiRequest as QueryFunction, refetchOnWindowFocus: false, retry: false }, mutations: { retry: false } },
});

export async function apiRequestJson(path: string, method: string = "GET", body?: any) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("auth_token");
      throw new Error("No autenticado");
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Error ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}