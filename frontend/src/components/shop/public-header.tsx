// frontend/src/components/shop/public-header.tsx
import { Link } from "@tanstack/react-router";
import { ShoppingBag, User, PackageCheck, LogOut, Minus, Plus, Trash2, ArrowRight, Menu } from "lucide-react";
import { useRole } from "@/lib/role";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

export function PublicHeader({ cartCount }: { cartCount?: number }) {
  const { user, loading: authLoading, logout } = useRole();
  const cart = useCart();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80">
          <span className="grid size-8 place-items-center rounded-md bg-foreground text-background font-display text-sm">S</span>
          <span className="font-display text-[15px] font-medium tracking-tight">StyleAI</span>
        </Link>

        {/* 🆕 UNIFIED NAVIGATION (Same as Home) */}
        <nav className="ml-6 hidden items-center gap-6 text-sm lg:flex" aria-label="Main">
          <Link to="/shop" className="text-muted-foreground transition-colors hover:text-foreground">
            Shop
          </Link>
          <Link to="/#edit" className="text-muted-foreground transition-colors hover:text-foreground">
            Editorial
          </Link>
          <Link to="/#creators" className="text-muted-foreground transition-colors hover:text-foreground">
            Creators
          </Link>
          <Link to="/shop" className="text-muted-foreground transition-colors hover:text-foreground">
            All products
          </Link>
          <Link to="/why-styleai" className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent transition-all hover:bg-accent/20 hover:scale-105">
            Why StyleAI? <ArrowRight className="size-3.5" />
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {authLoading ? (
            <div className="hidden sm:block h-9 w-24 animate-pulse rounded-md bg-muted" />
          ) : user ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex">
                <Link to="/orders">
                  <PackageCheck className="mr-1.5 size-4" /> My Orders
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="hidden sm:inline-flex gap-2">
                    <User className="size-4" />
                    <span className="max-w-[100px] truncate">
                      {user.name ? user.name.split(" ")[0] : "Account"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/orders" className="cursor-pointer"><PackageCheck className="mr-2 size-4" /> My Orders</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account" className="cursor-pointer"><User className="mr-2 size-4" /> Account Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer" onClick={logout}>
                    <LogOut className="mr-2 size-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex">
                <Link to="/register" search={{ role: "SHOPPER" } as any}>Just shopping?</Link>
              </Button>
              <Button asChild className="hidden sm:inline-flex">
                <Link to="/register">Register</Link>
              </Button>
            </>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <button className="relative grid size-9 place-items-center rounded-md border border-border bg-card transition-colors hover:bg-accent/10" aria-label={`Open cart, ${cart.count} items`}>
                <ShoppingBag className="size-4" aria-hidden="true" />
                {cart.count > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold tabular-nums text-background">
                    {cart.count}
                  </span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col sm:max-w-md">
              <SheetHeader><SheetTitle className="font-display text-xl font-medium">Your bag</SheetTitle></SheetHeader>
              {cart.items.length === 0 ? (
                <p className="mt-8 px-4 text-sm text-muted-foreground">Your bag is empty. Add a piece from the collection to begin.</p>
              ) : (
                <ul className="mt-4 flex-1 space-y-4 overflow-y-auto px-4">
                  {cart.items.map((item) => (
                    <li key={item.slug} className="flex gap-3 border-b border-border pb-4">
                      {item.image ? <img src={item.image} alt={item.name} className="size-20 rounded-md object-cover" /> : <div className="size-20 rounded-md bg-muted" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <button onClick={() => cart.setQty(item.slug, item.qty - 1)} className="grid size-7 place-items-center rounded-md border border-border hover:bg-accent/10"><Minus className="size-3" /></button>
                          <span className="w-6 text-center text-sm tabular-nums">{item.qty}</span>
                          <button onClick={() => cart.setQty(item.slug, item.qty + 1)} className="grid size-7 place-items-center rounded-md border border-border hover:bg-accent/10"><Plus className="size-3" /></button>
                          <button onClick={() => cart.remove(item.slug)} className="ml-auto text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
                        </div>
                      </div>
                      <span className="text-sm font-medium tabular-nums">${(item.price * item.qty).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto space-y-3 border-t border-border p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-display text-xl tabular-nums">${cart.total.toFixed(2)}</span>
                </div>
                <Button asChild className="w-full" disabled={cart.items.length === 0}><Link to="/checkout">Proceed to Checkout <ArrowRight /></Link></Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Mobile Nav */}
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <button className="grid size-9 place-items-center rounded-md border border-border bg-card transition-colors hover:bg-accent/10 lg:hidden"><Menu className="size-4" /></button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[280px] flex-col sm:max-w-xs">
              <SheetHeader><SheetTitle className="font-display text-lg font-medium">Menu</SheetTitle></SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                <Link to="/shop" onClick={() => setMobileNavOpen(false)} className="rounded-md px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-accent/5">Shop</Link>
                <Link to="/#edit" onClick={() => setMobileNavOpen(false)} className="rounded-md px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-accent/5">Editorial</Link>
                <Link to="/#creators" onClick={() => setMobileNavOpen(false)} className="rounded-md px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-accent/5">Creators</Link>
                <Link to="/shop" onClick={() => setMobileNavOpen(false)} className="rounded-md px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-accent/5">All products</Link>
                <Link to="/why-styleai" onClick={() => setMobileNavOpen(false)} className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-accent hover:bg-accent/5">Why StyleAI?</Link>
              </nav>
              <div className="mt-auto space-y-2 border-t border-border pt-4">
                {!authLoading && user ? (
                  <>
                    <Button asChild variant="outline" className="w-full justify-start" onClick={() => setMobileNavOpen(false)}><Link to="/orders"><PackageCheck className="mr-2 size-4" /> My Orders</Link></Button>
                    <Button asChild variant="outline" className="w-full justify-start" onClick={() => setMobileNavOpen(false)}><Link to="/account"><User className="mr-2 size-4" /> Account Settings</Link></Button>
                    <Button variant="ghost" className="w-full justify-start text-destructive" onClick={() => { logout(); setMobileNavOpen(false); }}><LogOut className="mr-2 size-4" /> Logout</Button>
                  </>
                ) : (
                  <>
                    <Button asChild variant="outline" className="w-full"><Link to="/login" onClick={() => setMobileNavOpen(false)}>Login</Link></Button>
                    <Button asChild className="w-full"><Link to="/register" onClick={() => setMobileNavOpen(false)}>Register</Link></Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}