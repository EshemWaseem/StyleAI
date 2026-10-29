// frontend/src/lib/error-capture.ts
// Server-side global error capture.
// No styling — this file just catches errors so the SSR handler
// can render them via error-page.ts.

let lastError: Error | null = null;
let installed = false;

export function captureError(err: unknown): void {
  lastError = err instanceof Error ? err : new Error(String(err));
}

export function consumeLastCapturedError(): Error | null {
  const err = lastError;
  lastError = null;
  return err;
}

/**
 * Install process-level handlers (idempotent).
 * Safe to call multiple times — handlers registered only once.
 * Skipped automatically on the client bundle.
 */
export function installErrorCapture(): void {
  if (installed) return;
  if (typeof process === "undefined" || typeof process.on !== "function") return;

  installed = true;

  process.on("uncaughtException", (err) => {
    captureError(err);
    // eslint-disable-next-line no-console
    console.error("[uncaughtException]", err);
  });

  process.on("unhandledRejection", (reason) => {
    captureError(reason);
    // eslint-disable-next-line no-console
    console.error("[unhandledRejection]", reason);
  });
}

// Auto-install on import (server-side only)
installErrorCapture();