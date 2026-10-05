// frontend/src/routes/admin/index.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users, Building2, Store, ShoppingBag, Briefcase, Megaphone, AlertCircle, Loader2, Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, SectionTitle } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { adminApi, type PlatformStats } from "@/lib/admin";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin — StyleAI" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.getStats()
      .then((res) => setStats(res.data))
      .catch((err) => setError(err?.message || "Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <>
        <PageHeader
          eyebrow="Super admin"
          title="Platform overview"
          description="Real-time operational health across all users, brands, and organizations."
          actions={
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link to="/admin/ai">
                  <Cpu className="mr-2 size-4" /> AI operations
                </Link>
              </Button>
              <Button asChild>
                <Link to="/admin/users">Manage users</Link>
              </Button>
            </div>
          }
        />

        {loading && (
          <div className="mt-12 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading platform stats…</span>
          </div>
        )}

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {stats && (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Users} label="Total users" value={stats.users.total} note={`${stats.users.active} active`} />
              <StatCard icon={Building2} label="Organizations" value={stats.organizations} note="Multi-tenant" />
              <StatCard icon={Store} label="Brands" value={stats.brands} note="Active brands" />
              <StatCard icon={ShoppingBag} label="Products" value={stats.products} note="Catalog total" />
              <StatCard icon={Users} label="Influencers" value={stats.influencers} note="Active creators" />
              <StatCard icon={Briefcase} label="Agencies" value={stats.agencies} note="Managing brands" />
              <StatCard icon={ShoppingBag} label="Shoppers" value={stats.shoppers} note="End customers" />
              <StatCard icon={Megaphone} label="Campaigns" value={stats.campaigns} note="All-time" />
            </section>

            <section className="mt-8">
              <Panel>
                <SectionTitle
                  title="Recently registered"
                  description="Last 5 signups."
                  action={<Button asChild variant="outline" size="sm"><Link to="/admin/users">View all</Link></Button>}
                />
                <div className="divide-y divide-border">
                  {stats.recentUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{u.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {u.roles.map((r) => (
                          <span key={r} className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase text-accent">
                            {r.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                      <span className="ml-4 text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                  {stats.recentUsers.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">No users yet.</p>
                  )}
                </div>
              </Panel>
            </section>
          </>
        )}
      </>
    </ProtectedRoute>
  );
}

function StatCard({
  icon: Icon, label, value, note,
}: { icon: typeof Users; label: string; value: number; note: string }) {
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-md bg-accent/15 text-accent">
          <Icon className="size-4" />
        </span>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="mt-3 font-display text-3xl font-medium tabular-nums">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </article>
  );
}