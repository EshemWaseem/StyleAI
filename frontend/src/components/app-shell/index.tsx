// components/app-shell/index.tsx
import { useLocation } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AgencyProvider } from "@/lib/agency/context";
import { connectSocket, disconnectSocket } from "@/lib/websocket/client";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/role";
import { billingApi } from "@/lib/billing";
import {
  isTrialExpiredSync,
  markTrialExpired,
  clearTrialExpired,
} from "@/lib/api";
import { Sidebar } from "./sidebar"; // 🆕 Import Sidebar
import {
  AppHeader,
  StandaloneHeader,
} from "./header";
import { AgencyActingBanner } from "./agency-switcher";

function computeStandalone(pathname: string, isAdmin: boolean): boolean {
  if (isAdmin) return false;
  if (pathname === "/trial-expired") return true;
  if (pathname === "/billing" || pathname === "/plans") {
    return isTrialExpiredSync();
  }
  return false;
}

export function AppShell({
  children,
  breadcrumb = [],
}: {
  children: ReactNode;
  breadcrumb?: string[];
}) {
  return (
    <AgencyProvider>
      <AppShellInner breadcrumb={breadcrumb}>{children}</AppShellInner>
    </AgencyProvider>
  );
}

function AppShellInner({
  children,
  breadcrumb = [],
}: {
  children: ReactNode;
  breadcrumb?: string[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useRole();
  const location = useLocation();

  const userId = user?.id;
  const userRoles = user?.roles ?? [];
  const isAdmin = userRoles.includes("SUPER_ADMIN");

  const [standalone, setStandalone] = useState<boolean>(() =>
    computeStandalone(
      typeof window !== "undefined" ? window.location.pathname : "",
      userRoles.includes("SUPER_ADMIN")
    )
  );

  useEffect(() => {
    if (userId) connectSocket();
  }, [userId]);

  useEffect(() => {
    const path = location.pathname;
    const syncValue = computeStandalone(path, isAdmin);
    setStandalone(syncValue);

    if (path === "/trial-expired") return;

    const isPlansOrBilling = path === "/billing" || path === "/plans";
    if (!isPlansOrBilling) return;
    if (isAdmin) return;

    billingApi
      .getMe()
      .then((me) => {
        const state = me.subscription?.effectiveState;
        const expired =
          state === "trial_expired" ||
          state === "expired" ||
          state === "past_due";
        if (expired) markTrialExpired();
        else clearTrialExpired();
        setStandalone(expired);
      })
      .catch(() => {});
  }, [location.pathname, isAdmin]);

  function handleLogout() {
    logout();
  }

  if (standalone) {
    return (
      <TooltipProvider delayDuration={300}>
        <div
          data-app-shell
          className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground"
        >
          <StandaloneHeader onLogout={handleLogout} />
          <main className="hover-scroll flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
              {children}
            </div>
          </main>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div
        data-app-shell
        className="h-[100dvh] overflow-hidden bg-background text-foreground"
      >
        {/* 🆕 DESKTOP SIDEBAR INTEGRATION */}
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />

        <div
          className={cn(
            "flex h-full flex-col transition-[padding] duration-200",
            collapsed ? "lg:pl-[68px]" : "lg:pl-[248px]"
          )}
        >
          <AppHeader
            breadcrumb={breadcrumb}
            collapsed={collapsed}
            onLogout={handleLogout}
          />
          <AgencyActingBanner />
          <main className="hover-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="ui-page-content">{children}</div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}