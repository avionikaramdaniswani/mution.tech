import { csrfFetch } from "./csrf";

export async function apiFetch<T = any>(path: string, options?: RequestInit): Promise<T> {
  const res = await csrfFetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}
