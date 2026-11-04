// components/app-shell/header.tsx
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Command, HelpCircle, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { cn } from "@/lib/utils";
import { Brandmark } from "./brandmark";
import { Sidebar } from "./sidebar"; // 🆕 Import Sidebar
import { AgencyBrandSwitcher } from "./agency-switcher";
import { Assistant } from "./assistant";
import { UserMenu } from "./user-menu";

export function AppHeader({
  breadcrumb = [],
  collapsed,
  onLogout,
}: {
  breadcrumb?: string[];
  collapsed?: boolean;
  onLogout: () => void;
}) {
  // 🆕 State to control mobile menu
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="z-20 shrink-0 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        
        {/* 🆕 MOBILE SIDEBAR INTEGRATION */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation"
            >
              <Command />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="sidebar-sheet-content w-[268px] bg-sidebar p-0"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            {/* Use the Sidebar component. Pass isMobile and onNavigate to close it on click */}
            <Sidebar
              isMobile={true}
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <nav
          aria-label="Breadcrumb"
          className="hidden min-w-0 items-center gap-2 text-sm text-muted-foreground lg:flex"
        >
          {breadcrumb.map((crumb, i) => (
            <span key={crumb} className="flex min-w-0 items-center gap-2">
              <span className="text-border">/</span>
              <span
                className={cn(
                  "truncate",
                  i === breadcrumb.length - 1 && "text-foreground"
                )}
              >
                {crumb}
              </span>
            </span>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <AgencyBrandSwitcher />
          <Assistant />
          <NotificationBell />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Help"
                className="hidden sm:inline-flex"
              >
                <HelpCircle />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Help &amp; documentation</p>
            </TooltipContent>
          </Tooltip>

          <UserMenu onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
}

export function SidebarCollapseButton({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-t border-sidebar-border p-3">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-3 text-muted-foreground"
        onClick={onToggle}
      >
        {collapsed ? (
          <PanelLeftOpen className="size-4" />
        ) : (
          <PanelLeftClose className="size-4" />
        )}
        {!collapsed && "Collapse"}
      </Button>
    </div>
  );
}

export function StandaloneHeader({ onLogout }: { onLogout: () => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
      <Brandmark />
      <button
        type="button"
        onClick={onLogout}
        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <span>Sign out</span>
      </button>
    </header>
  );
}