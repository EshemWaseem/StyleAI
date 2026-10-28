// components/app-shell/brandmark.tsx
import { Link } from "@tanstack/react-router";

export function Brandmark({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link
      to="/dashboard"
      className="flex items-center gap-2.5"
      aria-label="StyleAI workspace"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-foreground text-background">
        <span className="font-display text-sm leading-none">S</span>
      </span>
      {!collapsed && (
        <span className="font-display text-[15px] font-medium tracking-tight">
          StyleAI
        </span>
      )}
    </Link>
  );
}