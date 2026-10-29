// frontend/src/lib/error-page.ts
// SSR error page — self-contained, but uses the SAME design tokens as styles.css.
// Design tokens extracted from src/styles.css :root
// (Cannot load external CSS — React app crashed before styles loaded.)

export function renderErrorPage(
  error: Error | string | null | undefined,
  ..._rest: unknown[]
): string {
  const raw =
    typeof error === "string"
      ? error
      : error instanceof Error
      ? error.message
      : "An unexpected error occurred.";

  const message = escapeHtml(raw || "An unexpected error occurred.");

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Something went wrong — StyleAI</title>
  <style>
    /* ═══════════════════════════════════════════════════════
       Design tokens — extracted from src/styles.css :root
       Kept inline so the error page renders even when the
       CSS pipeline itself has failed.
       ═══════════════════════════════════════════════════════ */
    :root {
      color-scheme: dark;

      /* Colors (oklch — same values as styles.css) */
      --background:        oklch(0.135 0.008 145);
      --foreground:        oklch(0.95  0.008 135);
      --card:              oklch(0.17  0.009 145);
      --card-foreground:   oklch(0.95  0.008 135);
      --muted-foreground:  oklch(0.69  0.015 140);
      --accent:            oklch(0.54  0.09  145);
      --accent-foreground: oklch(0.98  0.006 135);
      --destructive:       oklch(0.55  0.17   27);
      --border:            oklch(0.27  0.012 145);

      /* Radius — same as styles.css :root */
      --radius:    0.5rem;
      --radius-md: calc(var(--radius) - 2px);
      --radius-lg: var(--radius);
      --radius-xl: calc(var(--radius) + 4px);

      /* Typography — same as styles.css @theme */
      --font-sans:    "Work Sans", ui-sans-serif, system-ui, sans-serif;
      --font-display: "Instrument Serif", Georgia, serif;
    }

    /* ── Reset ── */
    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      min-height: 100%;
    }

    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background-color: var(--background);
      color: var(--foreground);
      font-family: var(--font-sans);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      letter-spacing: 0;
    }

    /* ── Card ── */
    .error-card {
      width: 100%;
      max-width: 32rem;
      text-align: center;
      padding: 2.5rem 1.5rem;
      background-color: var(--card);
      color: var(--card-foreground);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
    }

    /* ── Icon badge ── */
    .error-icon {
      display: inline-grid;
      place-items: center;
      width: 3.5rem;
      height: 3.5rem;
      margin: 0 auto 1.25rem;
      border-radius: var(--radius-lg);
      background-color: color-mix(in oklch, var(--destructive) 15%, transparent);
      color: var(--destructive);
    }
    .error-icon svg {
      width: 1.75rem;
      height: 1.75rem;
      display: block;
    }

    /* ── Typography ── */
    h1 {
      margin: 0 0 0.75rem;
      font-family: var(--font-display);
      font-size: 2rem;
      font-weight: 500;
      line-height: 1.1;
      letter-spacing: -0.02em;
      color: var(--foreground);
    }

    p {
      margin: 0 0 1.5rem;
      font-size: 0.9375rem;
      line-height: 1.55;
      color: var(--muted-foreground);
      word-break: break-word;
    }

    /* ── CTA button ── */
    .error-action {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      border-radius: var(--radius-md);
      background-color: var(--accent);
      color: var(--accent-foreground);
      font-family: var(--font-sans);
      font-size: 0.875rem;
      font-weight: 500;
      text-decoration: none;
      transition: opacity 0.15s ease, transform 0.15s ease;
    }
    .error-action:hover {
      opacity: 0.9;
    }
    .error-action:active {
      transform: scale(0.98);
    }
    .error-action:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 3px;
    }

    /* ── Responsive (mirrors responsive.css breakpoints) ── */
    @media (max-width: 640px) {
      body { padding: 0.75rem; }
      .error-card { padding: 2rem 1.25rem; border-radius: var(--radius-lg); }
      h1 { font-size: 1.75rem; }
      p { font-size: 0.875rem; }
      .error-icon { width: 3rem; height: 3rem; }
      .error-icon svg { width: 1.5rem; height: 1.5rem; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { transition: none !important; animation: none !important; }
    }
  </style>
</head>
<body>
  <main class="error-card" role="alert">
    <span class="error-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    </span>
    <h1>Something went wrong</h1>
    <p>${message}</p>
    <a class="error-action" href="/">Go home</a>
  </main>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default:  return c;
    }
  });
}