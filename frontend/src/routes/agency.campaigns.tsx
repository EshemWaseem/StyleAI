import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Megaphone, Camera, CheckCircle2, Clock } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { campaignsApi, type Campaign } from "@/lib/campaigns";
import { useAgency } from "@/lib/agency/context";

export const Route = createFileRoute("/agency/campaigns")({
  head: () => ({ meta: [{ title: "Agency · Campaigns — StyleAI" }] }),
  component: AgencyCampaignsPage,
});

function AgencyCampaignsPage() {
  const { activeBrandId } = useAgency();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    campaignsApi.list({ limit: 200 })
      .then((r) => {
        let list = Array.isArray(r?.campaigns) ? r.campaigns : [];
        if (activeBrandId) list = list.filter((c) => c.brandId === activeBrandId);
        setCampaigns(list);
      })
      .catch((e) => setError(e?.message || "Failed"))
      .finally(() => setLoading(false));
  }, [activeBrandId]);

  const needsEditing = campaigns.filter((c) =>
    (c.deliverables ?? []).some((d) => ["RAW_UPLOADED", "AGENCY_EDITING"].includes(d.status))
  );

  const awaitingPublish = campaigns.filter((c) =>
    (c.deliverables ?? []).some((d) => d.status === "BRAND_APPROVED")
  );

  const allApproved = campaigns.filter((c) =>
    (c.deliverables ?? []).length > 0 &&
    (c.deliverables ?? []).every((d) => ["BRAND_APPROVED", "PUBLISHED", "METRICS_ENTERED", "COMPLETED"].includes(d.status))
  );

  return (
    <ProtectedRoute roles={["AGENCY"]}>
      <AppShell breadcrumb={["Agency", "Campaigns"]}>
        <PageHeader
          eyebrow="Agency"
          title="Client campaigns"
          description={
            activeBrandId
              ? "Showing campaigns for the active client brand."
              : "All campaigns across your clients."
          }
        />

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatCard icon={Camera} label="Needs editing" value={needsEditing.length} accent="purple" />
          <StatCard icon={Clock} label="Ready to publish" value={awaitingPublish.length} accent="blue" />
          <StatCard icon={CheckCircle2} label="All approved" value={allApproved.length} accent="emerald" />
        </section>

        {loading ? (
          <div className="mt-12 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading…</span>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
            <Megaphone className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No campaigns yet.</p>
          </div>
        ) : (
          <Panel className="mt-6 overflow-hidden">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">Campaign</th>
                  <th className="p-3 font-medium">Brand</th>
                  <th className="p-3 font-medium">Influencer</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {campaigns.map((c) => {
                  const total = c.deliverables?.length ?? 0;
                  const done = (c.deliverables ?? []).filter((d) =>
                    ["BRAND_APPROVED", "PUBLISHED", "METRICS_ENTERED", "COMPLETED"].includes(d.status)
                  ).length;
                  return (
                    <tr key={c.id} className="hover:bg-accent/5">
                      <td className="p-3">
                        <a href={`/campaigns/${c.id}`} className="font-medium hover:underline">
                          {c.title}
                        </a>
                      </td>
                      <td className="p-3 text-muted-foreground">{c.brand?.name ?? "—"}</td>
                      <td className="p-3 text-muted-foreground">{c.influencer?.displayName ?? "—"}</td>
                      <td className="p-3 text-xs">
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase text-accent">
                          {c.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="p-3 text-xs tabular-nums">{done}/{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

function StatCard({
  icon: Icon, label, value, accent,
}: { icon: typeof Megaphone; label: string; value: number; accent: "purple" | "blue" | "emerald" }) {
  const colors = {
    purple: "bg-purple-500/15 text-purple-500",
    blue: "bg-blue-500/15 text-blue-500",
    emerald: "bg-emerald-500/15 text-emerald-500",
  };
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className={`grid size-8 place-items-center rounded-md ${colors[accent]}`}>
          <Icon className="size-4" />
        </span>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="mt-3 font-display text-3xl font-medium tabular-nums">{value}</p>
    </article>
  );
}