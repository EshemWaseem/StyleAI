// lib/swal-shim.ts
import { swalThemed } from "@/lib/swal";

let installed = false;

export function installSwalShim() {
  if (typeof window === "undefined") return;
  if (installed) return;
  installed = true;

  window.alert = (message?: unknown) => {
    swalThemed({
      icon: "info",
      title: "Notice",
      text: String(message ?? ""),
      confirmButtonText: "OK",
    });
  };
}