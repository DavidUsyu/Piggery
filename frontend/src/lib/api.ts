const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const CLIENT_AUTH_STATE_KEY = "piggery-auth-state";
const LEGACY_TOKEN_KEY = "token";

const PUBLIC_AUTH_PATHS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/recover-account",
]);

export function setClientAuthState() {
  if (typeof window === "undefined") return;
  localStorage.setItem(CLIENT_AUTH_STATE_KEY, "1");
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

export function clearClientAuthState() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CLIENT_AUTH_STATE_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

export function hasClientAuthState() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CLIENT_AUTH_STATE_KEY) === "1";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
    cache: init?.cache ?? "no-store",
  });

  if (!res.ok) {
    if (res.status === 401 && !PUBLIC_AUTH_PATHS.has(path)) {
      clearClientAuthState();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    const text = await res.text();
    let message = text;

    try {
      const parsed = JSON.parse(text) as { message?: unknown };
      if (typeof parsed.message === "string") {
        message = parsed.message;
      }
    } catch {
      // Keep the raw response text when the server does not return JSON.
    }

    throw new Error(`${res.status} ${res.statusText}: ${message}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export async function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, {
    method: "DELETE",
  });
}
