// routes/account.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { User, Mail, Shield, LogOut, ArrowLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRole } from "@/lib/role";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My Account — StyleAI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, logout, loading } = useRole();
  const navigate = useNavigate();

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  if (!user) {
    navigate({ to: "/login" });
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Simple Top Header (No Sidebar) */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-md bg-foreground text-background font-display">S</span>
            <span className="font-display text-lg font-medium">StyleAI</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/orders" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              My Orders
            </Link>
            <Button asChild variant="outline" size="sm">
              <Link to="/">Back to Shop</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="font-display text-3xl font-medium tracking-tight">My Account</h1>
        </div>

        <div className="space-y-6">
          {/* Profile Card */}
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-4 border-b border-border pb-6">
              <div className="grid size-16 place-items-center rounded-full bg-accent/15 text-accent">
                <User className="size-8" />
              </div>
              <div>
                <h2 className="text-xl font-medium">{user.name}</h2>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                  <Mail className="size-3.5" /> {user.email}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <Shield className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Account Role</p>
                    <p className="text-xs text-muted-foreground">You are registered as a Shopper</p>
                  </div>
                </div>
                <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">Shopper</span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <Package className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Order History</p>
                    <p className="text-xs text-muted-foreground">View your past purchases</p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/orders">View Orders</Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Logout Card */}
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
            <p className="mt-2 text-sm text-muted-foreground">Sign out of your account on this device.</p>
            <Button 
              variant="destructive" 
              className="mt-4 gap-2"
              onClick={() => { logout(); navigate({ to: "/" }); }}
            >
              <LogOut className="size-4" /> Sign Out
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}