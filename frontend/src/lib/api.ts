// frontend/src/lib/api.ts
// ======================================================
// Central API client.
// - Auto-attaches JWT
// - Handles 401 (force logout)
// - Sanitizes infra errors → user-friendly messages
// ======================================================

const BASE_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

// ------------------------------------------------------
// Sanitize raw messages that leak infra details
// ------------------------------------------------------
const FRIENDLY_FALLBACKS: Record<number, string> = {
  0: "Can't reach the server. Please check your connection and try again.",
  400: "Invalid input. Please check the values you entered.",
  401: "Please sign in to continue.",
  403: "You don't have permission to do that.",
  404: "The item you requested could not be found.",
  409: "This record already exists.",
  429: "Too many requests. Please slow down and try again.",
  500: "Something went wrong on our end. Please try again.",
  502: "Service is temporarily unavailable. Please try again.",
  503: "Service is temporarily unavailable. Please try again.",
  504: "Request timed out. Please try again.",
};

function sanitizeMessage(raw: any, status: number): string {
  const msg = String(raw || "").trim();
  const fallback = FRIENDLY_FALLBACKS[status] || "Something went wrong. Please try again.";

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

// ------------------------------------------------------
// Main API call
// ------------------------------------------------------
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

  // ---- Network-level errors (server down, DNS, etc.) ----
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...rest, headers });
  } catch (netErr: any) {
    const error = Object.assign(
      new Error(FRIENDLY_FALLBACKS[0]),
      { status: 0, code: "NETWORK_ERROR" }
    );
    throw error;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const friendly = sanitizeMessage(body?.message || res.statusText, res.status);

    const error = Object.assign(new Error(friendly), {
      status: res.status,
      code: body?.code,   // preserve code for special handling (e.g. PENDING_APPROVAL)
      data: body,
    });

    // Auto-logout only on 401
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }

    throw error;
  }

  return res.json();
}

// ------------------------------------------------------
// Convenience wrappers
// ------------------------------------------------------
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