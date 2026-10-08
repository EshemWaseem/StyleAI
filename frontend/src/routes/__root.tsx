// routes/__root.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { installSwalShim } from "@/lib/swal-shim";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { RoleProvider, useRole } from "../lib/role";
import { CartProvider } from "../lib/cart";
import { AppShell } from "../components/app-shell";

// ======================================================
// Public paths — no auth required, no shell
// ======================================================
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/pending",
  "/trial-expired",
  "/invite",
  "/payments/result",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => {
    if (p === "/") return pathname === "/";
    return pathname === p || pathname.startsWith(`${p}/`);
  });
}

// ======================================================
// 404
// ======================================================
function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

// ======================================================
// Error boundary
// ======================================================
function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

// ======================================================
// Root route
// ======================================================
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "StyleAI" },
      {
        name: "description",
        content: "AI fashion commerce and influencer campaign workspace.",
      },
      { name: "author", content: "StyleAI" },
      { property: "og:title", content: "StyleAI" },
      {
        property: "og:description",
        content: "AI fashion commerce and influencer campaign workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Work+Sans:wght@400;500;600&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// ======================================================
// Root component
// ======================================================
function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    installSwalShim();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <CartProvider>
          <AppShellGate />
        </CartProvider>
      </RoleProvider>
    </QueryClientProvider>
  );
}

// ======================================================
// Full-screen loader — used while auth is resolving
// or while redirecting. Shell is NOT rendered.
// ======================================================
function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Loading…
      </div>
    </div>
  );
}

/**
 * STRICT gate:
 * - Public path → render bare (no shell)
 * - Not public + no user → redirect to /login, shell NEVER renders
 * - Not public + loading → loader, shell NEVER renders
 * - Not public + user pendingApproval → redirect to /pending
 * - /dashboard specific redirects (admin, agency, shopper, no-org brand)
 * - Otherwise → render shell + outlet
 */
function AppShellGate() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading } = useRole();
  const navigate = useNavigate();

  const isPublic = isPublicPath(pathname);
  const isDashboard = pathname === "/dashboard";

  // ------------------------------------------------------
  // Compute redirect target — pure function of state + path
  // ------------------------------------------------------
  const redirectTarget: string | null = (() => {
    // Public paths never redirect
    if (isPublic) return null;

    // Still resolving auth → don't redirect yet, show loader
    if (loading) return null;

    // No user, protected path → login
    if (!user) return "/login";

    // Pending brand team member → /pending
    if (user.pendingApproval) return "/pending";

    // /dashboard role-based redirects
    if (isDashboard) {
      if (user.roles.includes("SUPER_ADMIN")) return "/admin";
      if (user.roles.includes("AGENCY")) return "/agency";

      const isOnlyShopper =
        user.roles.includes("SHOPPER") &&
        user.roles.every((r) => r === "SHOPPER");
      if (isOnlyShopper) return "/";

      const isBrandUser = user.roles.some((r) =>
        ["BRAND_OWNER", "BRAND_TEAM_MEMBER"].includes(r)
      );
      if (isBrandUser && !user.organizationId) return "/brands";
    }

    return null;
  })();

  useEffect(() => {
    if (redirectTarget) {
      navigate({ to: redirectTarget as any, replace: true });
    }
  }, [redirectTarget, navigate]);

  // ------------------------------------------------------
  // Block shell when:
  //   - auth is resolving (loading), OR
  //   - we're about to redirect, OR
  //   - we're on a protected path with no user
  // ------------------------------------------------------
  const blockShell =
    !isPublic &&
    (loading || !!redirectTarget || !user);

  if (blockShell) {
    return <FullScreenLoader />;
  }

  if (isPublic) {
    return <Outlet />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}