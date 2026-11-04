// components/app-shell/sidebar.tsx
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Brandmark } from "./brandmark";
import { SidebarNav } from "./sidebar-nav";

export function Sidebar({
  collapsed = false,
  onToggleCollapse,
  onNavigate,
  isMobile = false,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  isMobile?: boolean;
}) {
  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground min-h-0",
        // 🆕 Mobile: Full height inside Sheet
        // 🆕 Desktop: Fixed on left, hidden on mobile
        isMobile 
          ? "h-full w-full" 
          : "fixed inset-y-0 left-0 z-30 hidden shrink-0 border-r border-sidebar-border transition-[width] duration-200 lg:flex",
        !isMobile && (collapsed ? "w-[68px]" : "w-[248px]")
      )}
    >
      {/* Header (Logo) */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-sidebar-border px-4",
          collapsed && !isMobile && "justify-center px-0"
        )}
      >
        <Brandmark collapsed={collapsed && !isMobile} />
      </div>

      {/* 🆕 Scrollable Nav Area:
          - `min-h-0` allows flex child to scroll.
          - `onClick={onNavigate}` closes the mobile sheet when a link is clicked. */}
      <div 
        className="hover-scroll flex-1 overflow-y-auto min-h-0" 
        onClick={() => onNavigate?.()}
      >
        <SidebarNav collapsed={collapsed && !isMobile} />
      </div>

      {/* Collapse toggle (Only on Desktop) */}
      {!isMobile && onToggleCollapse && (
        <div className="shrink-0 border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
            {!collapsed && "Collapse"}
          </Button>
        </div>
      )}
    </aside>
  );
}