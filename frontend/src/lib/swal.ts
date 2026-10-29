// src/lib/swal.ts
import Swal from "sweetalert2";
import type { SweetAlertOptions, SweetAlertResult } from "sweetalert2";

const CSS_VARS = {
  card: "var(--color-card)",
  cardFg: "var(--color-card-foreground)",
  fg: "var(--color-foreground)",
  muted: "var(--color-muted)",
  mutedFg: "var(--color-muted-foreground)",
  accent: "var(--color-accent)",
  accentFg: "var(--color-accent-foreground)",
  border: "var(--color-border)",
  destructive: "var(--color-destructive)",
  warning: "var(--color-warning)",
  success: "var(--color-success)",
};

const STYLE_ID = "styleai-swal-theme";

function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .swal2-container.styleai-swal-container {
      backdrop-filter: blur(2px) saturate(115%);
      -webkit-backdrop-filter: blur(2px) saturate(115%);
      background-color: color-mix(in oklch, ${CSS_VARS.fg} 40%, transparent);
      z-index: 9999;
    }

    .styleai-swal-popup {
      border-radius: var(--radius-xl, 0.75rem) !important;
      border: 1px solid ${CSS_VARS.border} !important;
      background-color: ${CSS_VARS.card} !important;
      color: ${CSS_VARS.cardFg} !important;
      box-shadow: 0 24px 60px -20px oklch(0.05 0.005 260 / 0.55),
                  0 8px 20px -8px oklch(0.05 0.005 260 / 0.35) !important;
      padding: 1.5rem !important;
      font-family: var(--font-sans) !important;
    }

    .styleai-swal-title {
      font-family: var(--font-display) !important;
      font-weight: 500 !important;
      color: ${CSS_VARS.fg} !important;
      font-size: 1.5rem !important;
      letter-spacing: -0.01em !important;
    }

    .styleai-swal-html {
      color: ${CSS_VARS.mutedFg} !important;
      font-size: 0.875rem !important;
      margin-top: 0.75rem !important;
    }
    .styleai-swal-html p { margin: 0; }
    .styleai-swal-html p + p { margin-top: 0.5rem; }

    .styleai-swal-actions {
      gap: 0.5rem !important;
      margin-top: 1.5rem !important;
    }

    .styleai-swal-confirm,
    .styleai-swal-cancel,
    .styleai-swal-deny {
      border-radius: var(--radius-md, 0.5rem) !important;
      padding: 0.5rem 1rem !important;
      font-size: 0.875rem !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      transition: opacity 0.15s ease, background-color 0.15s ease !important;
      border: 1px solid transparent !important;
    }

    .styleai-swal-confirm {
      background-color: ${CSS_VARS.accent} !important;
      color: ${CSS_VARS.accentFg} !important;
      border-color: ${CSS_VARS.accent} !important;
    }
    .styleai-swal-confirm:hover { opacity: 0.9 !important; }

    .styleai-swal-cancel,
    .styleai-swal-deny {
      background-color: transparent !important;
      color: ${CSS_VARS.fg} !important;
      border-color: ${CSS_VARS.border} !important;
    }
    .styleai-swal-cancel:hover,
    .styleai-swal-deny:hover {
      background-color: color-mix(in oklch, ${CSS_VARS.accent} 8%, transparent) !important;
    }

    .styleai-swal-icon.swal2-icon {
      border-width: 2px !important;
    }
    .styleai-swal-icon.swal2-icon.swal2-error   { border-color: ${CSS_VARS.destructive} !important; color: ${CSS_VARS.destructive} !important; }
    .styleai-swal-icon.swal2-icon.swal2-warning { border-color: ${CSS_VARS.warning} !important; color: ${CSS_VARS.warning} !important; }
    .styleai-swal-icon.swal2-icon.swal2-success { border-color: ${CSS_VARS.success} !important; color: ${CSS_VARS.success} !important; }
    .styleai-swal-icon.swal2-icon.swal2-info    { border-color: ${CSS_VARS.accent} !important; color: ${CSS_VARS.accent} !important; }

    @keyframes styleai-swal-pop {
      from { opacity: 0; transform: translateY(8px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes styleai-swal-hide {
      to { opacity: 0; transform: scale(0.98); }
    }
    .swal2-show.styleai-swal-popup { animation: styleai-swal-pop 200ms cubic-bezier(0.16, 1, 0.3, 1) !important; }
    .swal2-hide.styleai-swal-popup { animation: styleai-swal-hide 150ms ease-in !important; }

    .swal2-toast.styleai-swal-popup {
      padding: 0.75rem 1rem !important;
      border-radius: var(--radius-lg, 0.75rem) !important;
      font-size: 0.8125rem !important;
    }
    .swal2-toast .styleai-swal-title {
      font-size: 0.875rem !important;
      font-family: var(--font-sans) !important;
    }
  `;
  document.head.appendChild(style);
}

const base = Swal.mixin({
  buttonsStyling: false,
  customClass: {
    container: "styleai-swal-container",
    popup: "styleai-swal-popup",
    title: "styleai-swal-title",
    htmlContainer: "styleai-swal-html",
    confirmButton: "styleai-swal-confirm",
    cancelButton: "styleai-swal-cancel",
    denyButton: "styleai-swal-deny",
    actions: "styleai-swal-actions",
    icon: "styleai-swal-icon",
  },
  background: "var(--color-card)",
  color: "var(--color-card-foreground)",
  reverseButtons: true,
  didOpen: () => {
    ensureStyles();
  },
});

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureStyles, { once: true });
  } else {
    ensureStyles();
  }
}

export const swalThemed = (
  options: SweetAlertOptions
): Promise<SweetAlertResult> => base.fire(options);

export const swalSuccess = (title: string, text?: string) =>
  base.fire({
    icon: "success",
    title,
    text,
    timer: 1800,
    showConfirmButton: false,
    timerProgressBar: true,
  });

export const swalError = (title: string, text?: string) =>
  base.fire({
    icon: "error",
    title: title || "Something went wrong",
    text,
  });

export const swalInfo = (title: string, text?: string) =>
  base.fire({ icon: "info", title, text });

export const swalConfirm = (
  title: string,
  text?: string,
  confirmText = "Yes, continue"
): Promise<boolean> =>
  base
    .fire({
      title,
      text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: "Cancel",
    })
    .then((r: SweetAlertResult) => r.isConfirmed);

export const swalToast = (
  title: string,
  icon: "success" | "error" | "info" = "success"
) =>
  base.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true,
  });

export const swalPendingReview = (details?: string) =>
  base.fire({
    icon: "success",
    title: "Thanks for signing up!",
    html: `
      <p style="color:var(--color-foreground);">
        Your account is <strong>under review</strong>.
      </p>
      <p>Your patience is highly appreciated.</p>
      ${details ? `<p style="font-size:0.8125rem;">${details}</p>` : ""}
    `,
    confirmButtonText: "Got it",
  });

export { Swal };