import { API } from "@/App";

/**
 * Wrapper de fetch para endpoints admin.
 * Lee el token de localStorage (pv_admin.token) y lo incluye
 * como header X-Admin-Token en cada request.
 */
export function getAdminToken() {
  try {
    const pv = JSON.parse(localStorage.getItem("pv_admin") || "{}");
    return pv.token || "";
  } catch {
    return "";
  }
}

export async function adminFetch(path, options = {}) {
  const token = getAdminToken();
  // API ya termina en /api — evitar doble /api si el path lo incluye
  const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
  const res = await fetch(`${API}${cleanPath}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": token,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  return res.json();
}
