// lib/swal-shim.ts
import Swal from "sweetalert2";

let installed = false;

export function installSwalShim() {
  // ✅ SSR safety
  if (typeof window === "undefined") return;
  if (installed) return;
  installed = true;

  window.alert = (message?: any) => {
    Swal.fire({
      icon: "info",
      title: "Notice",
      text: String(message ?? ""),
      confirmButtonText: "OK",
    });
  };
}