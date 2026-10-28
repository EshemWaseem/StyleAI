// components/app-shell/user-menu.tsx
import { Link } from "@tanstack/react-router";
import {
  BadgeDollarSign, LogOut, Package, Settings, Shapes, ShieldCheck,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRole, type RoleName } from "@/lib/role";

export function UserMenu({ onLogout }: { onLogout: () => void }) {
  const { user } = useRole();
  const userRoles = (user?.roles ?? []) as RoleName[];
  const isAdmin = userRoles.includes("SUPER_ADMIN");
  const isBrandOwner = userRoles.includes("BRAND_OWNER");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="grid size-8 place-items-center rounded-full bg-foreground text-[11px] font-medium text-background transition-opacity hover:opacity-90"
          aria-label="Open user menu"
        >
          {user?.name
            ? user.name
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()
            : "S"}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <div className="border-b border-border px-3 py-2.5">
          <p className="truncate text-sm font-medium">{user?.name ?? "User"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {user?.email ?? ""}
          </p>
          {user?.roles?.length ? (
            <p className="mt-1 inline-flex rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
              {user.roles
                .map((r) => r.replace(/_/g, " ").toLowerCase())
                .join(" · ")}
            </p>
          ) : null}
        </div>

        <DropdownMenuItem asChild>
          <Link to="/settings" className="cursor-pointer">
            <Settings className="size-4" />
            <span>Profile & settings</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/orders" className="cursor-pointer">
            <Package className="size-4" />
            <span>My Orders</span>
          </Link>
        </DropdownMenuItem>

        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/admin" className="cursor-pointer">
              <ShieldCheck className="size-4" />
              <span>Admin panel</span>
            </Link>
          </DropdownMenuItem>
        )}

        {isBrandOwner && (
          <DropdownMenuItem asChild>
            <Link to="/billing" className="cursor-pointer">
              <BadgeDollarSign className="size-4" />
              <span>Billing</span>
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/" className="cursor-pointer">
            <Shapes className="size-4" />
            <span>Visit storefront</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <button
            onClick={onLogout}
            className="flex w-full cursor-pointer items-center gap-2 text-destructive focus:text-destructive"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}