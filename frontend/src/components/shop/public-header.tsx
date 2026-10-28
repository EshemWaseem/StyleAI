// frontend/src/components/shop/public-header.tsx
import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PublicHeader({
  cartCount = 0,
  showLogin = true,
}: {
  cartCount?: number;
  showLogin?: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2.5"
          aria-label="StyleAI — home"
        >
          <span className="grid size-8 place-items-center rounded-md bg-foreground text-background">
            <span className="font-display text-sm leading-none">S</span>
          </span>
          <span className="font-display text-[15px] font-medium tracking-tight">
            StyleAI
          </span>
        </Link>
        <nav className="ml-6 hidden items-center gap-6 text-sm lg:flex">
          <Link to="/shop" className="text-muted-foreground hover:text-foreground">Shop</Link>
          <Link to="/" className="text-muted-foreground hover:text-foreground">Home</Link>
          <Link to="/why-styleai" className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/20">
          Why StyleAI?
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {showLogin && (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden lg:inline-flex"
              >
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild className="hidden sm:inline-flex">
                <Link to="/register">Register</Link>
              </Button>
            </>
          )}
          <Link
            to="/cart"
            className="relative grid size-9 place-items-center rounded-md border border-border bg-card hover:bg-accent/10"
            aria-label={`Cart ${cartCount} items`}
          >
            <ShoppingBag className="size-4" />
            {cartCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold tabular-nums text-background">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}