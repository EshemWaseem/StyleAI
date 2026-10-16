// frontend/src/lib/api.ts
// ======================================================
// Central API client.
// - Auto-attaches JWT
// - 401 → logout (except on /login or auth endpoints)
// - 402 → trial expired: sets flag + redirects
// - 423 → account locked: preserves retryAfter + code
// - 429 → rate limit: preserves retryAfter + code
// - Sanitizes infra errors
// ======================================================

const BASE_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

const FRIENDLY_FALLBACKS: Record<number, string> = {
  0: "Can't reach the server. Please check your connection and try again.",
  400: "Invalid input. Please check the values you entered.",
  401: "Invalid email or password.",
  402: "Your trial has ended. Please choose a plan to continue.",
  403: "You don't have permission to do that.",
  404: "The item you requested could not be found.",
  409: "This record already exists.",
  423: "Your account is temporarily locked. Please try again later.",
  429: "Too many requests. Please slow down and try again.",
  500: "Something went wrong on our end. Please try again.",
  502: "Service is temporarily unavailable. Please try again.",
  503: "Service is temporarily unavailable. Please try again.",
  504: "Request timed out. Please try again.",
};

// ======================================================
// Trial signal (sessionStorage — synchronous across routes)
// ======================================================
export function markTrialExpired() {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("trialExpired", "1");
  }
}

export function clearTrialExpired() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("trialExpired");
  }
}

export function isTrialExpiredSync(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem("trialExpired") === "1";
}

function sanitizeMessage(raw: any, status: number): string {
  const msg = String(raw || "").trim();
  const fallback =
    FRIENDLY_FALLBACKS[status] || "Something went wrong. Please try again.";

  if (!msg) return fallback;

  const lower = msg.toLowerCase();
  if (
    lower.includes("can't reach database") ||
    lower.includes("cannot reach database") ||
    lower.includes("localhost:") ||
    lower.includes("127.0.0.1") ||
    lower.includes("prisma.") ||
    lower.includes("invocation in") ||
    lower.includes("node_modules") ||
    lower.includes("econnrefused") ||
    lower.includes("enotfound") ||
    /\bselect .+ from /i.test(msg) ||
    /\binsert into /i.test(msg) ||
    msg.length > 200
  ) {
    return fallback;
  }

  return msg;
}

function redirectToTrialExpired(upgradeUrl?: string) {
  if (typeof window === "undefined") return;
  const target = upgradeUrl || "/trial-expired";
  const current = window.location.pathname;

  if (
    current.startsWith("/trial-expired") ||
    current.startsWith("/billing") ||
    current.startsWith("/plans")
  ) {
    return;
  }

  window.location.href = target;
}

// ------------------------------------------------------
// Error shape thrown by api()
// ------------------------------------------------------
export interface ApiError extends Error {
  status: number;
  code?: string;
  retryAfter?: number;
  data?: any;
}

export async function api<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth, ...rest } = options;

  const isFormData =
    typeof FormData !== "undefined" && rest.body instanceof FormData;

  const headers: Record<string, string> = {
    ...((rest.headers as Record<string, string>) || {}),
  };

  if (!isFormData) headers["Content-Type"] = "application/json";

  if (!skipAuth && typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const actingBrand = localStorage.getItem("agency.activeBrand");
    if (actingBrand) headers["X-Acting-Brand"] = actingBrand;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...rest, headers });
  } catch {
    const err: ApiError = Object.assign(
      new Error(FRIENDLY_FALLBACKS[0]),
      { status: 0, code: "NETWORK_ERROR" }
    );
    throw err;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const friendly = sanitizeMessage(
      body?.message || res.statusText,
      res.status
    );

    // ---- Parse Retry-After (seconds) ----
    const retryAfterHeader = res.headers.get("Retry-After");
    const parsedHeader = retryAfterHeader
      ? parseInt(retryAfterHeader, 10)
      : NaN;
    const retryAfter: number | undefined = Number.isFinite(parsedHeader)
      ? parsedHeader
      : typeof body?.retryAfter === "number"
      ? body.retryAfter
      : undefined;

    // ---- 402: trial expired / inactive subscription ----
    if (res.status === 402) {
      const code = body?.code;
      if (code === "TRIAL_EXPIRED" || code === "SUBSCRIPTION_INACTIVE") {
        markTrialExpired();
        redirectToTrialExpired(body?.upgradeUrl);
      }
    }

    // ---- 401: session expired (only for authenticated routes) ----
    if (res.status === 401 && typeof window !== "undefined") {
      const onLoginPage = window.location.pathname.startsWith("/login");
      const isAuthEndpoint =
        path.startsWith("/api/auth/login") ||
        path.startsWith("/api/auth/register");

      // Only force-logout if this was an authenticated request from a protected route
      if (!onLoginPage && !isAuthEndpoint) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("agency.activeBrand");
        clearTrialExpired();
        window.location.href = "/login";
      }
    }

    const error: ApiError = Object.assign(new Error(friendly), {
      status: res.status,
      code: body?.code,
      retryAfter,
      data: body,
    });
    throw error;
  }

  return res.json();
}

export const http = {
  get: <T = any>(p: string, o?: RequestOptions) =>
    api<T>(p, { ...o, method: "GET" }),

  post: <T = any>(p: string, b?: any, o?: RequestOptions) => {
    const isFormData =
      typeof FormData !== "undefined" && b instanceof FormData;
    return api<T>(p, {
      ...o,
      method: "POST",
      body: isFormData ? b : JSON.stringify(b),
    });
  },

  patch: <T = any>(p: string, b?: any, o?: RequestOptions) => {
    const isFormData =
      typeof FormData !== "undefined" && b instanceof FormData;
    return api<T>(p, {
      ...o,
      method: "PATCH",
      body: isFormData ? b : JSON.stringify(b),
    });
  },

  put: <T = any>(p: string, b?: any, o?: RequestOptions) => {
    const isFormData =
      typeof FormData !== "undefined" && b instanceof FormData;
    return api<T>(p, {
      ...o,
      method: "PUT",
      body: isFormData ? b : JSON.stringify(b),
    });
  },

  delete: <T = any>(p: string, o?: RequestOptions) =>
    api<T>(p, { ...o, method: "DELETE" }),
};