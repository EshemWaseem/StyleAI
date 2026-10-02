// routes/agency.clients.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle, Loader2, Briefcase, Users, ExternalLink, ChevronRight,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { agencyApi, type AgencyClientEntry } from "@/lib/campaigns";
import { useAgency } from "@/lib/agency/context";

export const Route = createFileRoute("/agency/clients")({
  head: () => ({ meta: [{ title: "Agency · Clients — StyleAI" }] }),
  component: AgencyClientsPage,
});

function AgencyClientsPage() {
  const { setActiveBrand } = useAgency();
  const [clients, setClients] = useState<AgencyClientEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    agencyApi.listClients()
      .then((r) => setClients(r.clients || []))
      .catch((e) => setError(e?.message || "Failed to load clients"))
      .finally(() => setLoading(false));
  }, []);

  const totalBrands = clients.reduce((sum, c) => sum + c.brands.length, 0);

  return (
    <ProtectedRoute roles={["AGENCY"]}>
      <AppShell breadcrumb={["Agency", "Clients"]}>
        <PageHeader
          eyebrow="Agency"
          title="Client organizations"
          description="Brands you manage. Pick a brand to operate as them across the platform."
        />

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {/* Stats */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <StatCard icon={Briefcase} label="Client organizations" value={clients.length} />
          <StatCard icon={Users} label="Brands managed" value={totalBrands} />
        </section>

        {loading ? (
          <div className="mt-12 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading clients…</span>
          </div>
        ) : clients.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
            <Briefcase className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No clients yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Client organizations will appear here once brands invite your agency.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {clients.map((c) => (
              <Panel key={c.id} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <div>
                    <h3 className="font-display text-lg font-medium">
                      {c.clientOrganization.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      @{c.clientOrganization.slug}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                      c.status === "ACTIVE"
                        ? "bg-emerald-500/15 text-emerald-500"
                        : c.status === "PAUSED"
                        ? "bg-amber-500/15 text-amber-500"
                        : c.status === "AT_RISK"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                {c.brands.length === 0 ? (
                  <p className="px-5 py-6 text-center text-xs text-muted-foreground">
                    No brands in this organization yet.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {c.brands.map((b) => (
                      <div key={b.id} className="flex items-center gap-3 px-5 py-3">
                        {b.logoUrl ? (
                          <img
                            src={b.logoUrl}
                            alt={b.name}
                            className="size-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="grid size-9 place-items-center rounded-full bg-accent/15 text-xs font-semibold uppercase text-accent">
                            {b.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{b.name}</p>
                          <p className="text-xs text-muted-foreground">@{b.slug}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveBrand(b.id)}
                          className="rounded-md bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/25"
                        >
                          Act as this brand
                        </button>
                        <Link
                          to="/brands/$brandId"
                          params={{ brandId: b.id }}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          View <ExternalLink className="size-3" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            ))}
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Briefcase;
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-md bg-accent/15 text-accent">
          <Icon className="size-4" />
        </span>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-3 font-display text-3xl font-medium tabular-nums">{value}</p>
    </article>
  );
}