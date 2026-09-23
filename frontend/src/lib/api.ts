//api.ts /lib frontend



const BASE_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}


/**
 * Central API client.
 * - Auto-attaches JWT
 * - Handles 401 (force logout) and 403 (surfaces error)
 * - Auto-detects FormData (skips Content-Type header + stringify)
 */
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

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (!skipAuth && typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...rest, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const error = Object.assign(new Error(err.message || "Request failed"), {
      status: res.status,
      data: err,
    });

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

