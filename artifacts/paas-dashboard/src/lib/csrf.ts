const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_HEADER = "X-CSRF-Token";

let csrfToken: string | null = null;
let csrfTokenRequest: Promise<string> | null = null;

function resolveMethod(init?: RequestInit): string {
  return (init?.method ?? "GET").toUpperCase();
}

function shouldAttachCsrf(input: RequestInfo | URL, init?: RequestInit): boolean {
  const method = resolveMethod(init);
  if (SAFE_METHODS.has(method)) return false;
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  return url.startsWith("/api/") || url.startsWith(`${window.location.origin}/api/`);
}

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  csrfTokenRequest ??= fetch("/api/auth/csrf", { credentials: "include" })
    .then(async (res) => {
      if (!res.ok) throw new Error("Failed to get CSRF token");
      const data = await res.json() as { csrfToken?: string };
      if (!data.csrfToken) throw new Error("Missing CSRF token");
      csrfToken = data.csrfToken;
      return data.csrfToken;
    })
    .finally(() => {
      csrfTokenRequest = null;
    });
  return csrfTokenRequest;
}

export async function csrfFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (shouldAttachCsrf(input, init) && !headers.has(CSRF_HEADER)) {
    headers.set(CSRF_HEADER, await getCsrfToken());
  }
  return fetch(input, { ...init, headers });
}
