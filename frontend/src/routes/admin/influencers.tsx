import { swalError , swalConfirm } from "@/lib/swal";
// routes/admin/influencers.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Search, Users, AlertCircle, Loader2, Trash2,
  Pause, Play, ExternalLink, Archive, BadgeDollarSign, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PricingCard } from "@/components/pricing/PricingCard";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { adminApi } from "@/lib/admin";

export const Route = createFileRoute("/admin/influencers")({
  head: () => ({ meta: [{ title: "Admin · Influencers — StyleAI" }] }),
  component: AdminInfluencersPage,
});

const STATUSES = ["ACTIVE", "PAUSED", "ARCHIVED"];

function AdminInfluencersPage() {
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pricingView, setPricingView] = useState<any | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params: { search?: string; status?: string; limit: number } = { limit: 100 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await adminApi.listInfluencers(params);
      setInfluencers(res.influencers || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load influencers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function changeStatus(inf: any, status: string) {
    setBusyId(inf.id);
    try {
      await adminApi.updateInfluencerStatus(inf.id, status);
      setInfluencers((prev) =>
        prev.map((x) => (x.id === inf.id ? { ...x, status } : x))
      );
    } catch (err: any) {
      swalError(err?.message || "Failed to update status");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(inf: any) {
    if (!(await swalConfirm(`Delete ${inf.displayName} (@${inf.username})? This cannot be undone.`))) return;
    setBusyId(inf.id);
    try {
      await adminApi.deleteInfluencer(inf.id);
      setInfluencers((prev) => prev.filter((x) => x.id !== inf.id));
    } catch (err: any) {
      swalError(err?.message || "Failed to delete");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <>
        <PageHeader
          eyebrow="Platform"
          title="All influencers"
          description="Moderate the platform's creator pool. Pause or remove policy-violating profiles."
        />

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm sm:w-96">
            <Search className="size-4 text-muted-foreground" />
            <input
              placeholder="Search name, username, or slug…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              className="w-full bg-transparent outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <Button size="sm" onClick={load}>Apply</Button>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="mt-12 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading influencers…</span>
          </div>
        ) : influencers.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
            <Users className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No influencers found.</p>
          </div>
        ) : (
          <Panel className="mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium">Influencer</th>
                    <th className="p-3 font-medium">Categories</th>
                    <th className="p-3 font-medium text-right">Followers</th>
                    <th className="p-3 font-medium text-right">Engagement</th>
                    <th className="p-3 font-medium text-center">Pricing</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {influencers.map((inf) => {
                    const tierCount = countTiers(inf.pricingTiers);
                    return (
                      <tr key={inf.id} className={busyId === inf.id ? "opacity-50" : ""}>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {inf.avatarUrl ? (
                              <img
                                src={inf.avatarUrl}
                                alt={inf.displayName}
                                className="size-9 rounded-full object-cover"
                              />
                            ) : (
                              <div className="grid size-9 place-items-center rounded-full bg-accent/15 text-xs font-medium text-accent">
                                {initials(inf.displayName)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="truncate font-medium">{inf.displayName}</div>
                              <div className="truncate text-xs text-muted-foreground">
                                @{inf.username}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {(inf.categories || []).slice(0, 3).map((c: string) => (
                              <span
                                key={c}
                                className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase text-accent"
                              >
                                {c}
                              </span>
                            ))}
                            {(inf.categories || []).length > 3 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{inf.categories.length - 3}
                              </span>
                            )}
                            {(!inf.categories || inf.categories.length === 0) && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-right tabular-nums">
                          {formatNumber(inf.followerCount || 0)}
                        </td>

                        <td className="p-3 text-right tabular-nums">
                          {inf.engagementRate != null
                            ? `${(inf.engagementRate * 100).toFixed(2)}%`
                            : "—"}
                        </td>

                        <td className="p-3 text-center">
                          {tierCount > 0 ? (
                            <button
                              type="button"
                              onClick={() => setPricingView(inf)}
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-500 hover:bg-emerald-500/25"
                              title="View pricing details"
                            >
                              <BadgeDollarSign className="size-3" />
                              {tierCount} tier{tierCount === 1 ? "" : "s"}
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">No pricing</span>
                          )}
                        </td>

                        <td className="p-3">
                          <StatusBadge status={inf.status} />
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <TooltipIconButton
                              label="View public profile"
                              asChild
                            >
                              <Link to="/influencers/$slug" params={{ slug: inf.slug }} target="_blank">
                                <ExternalLink className="size-4" />
                              </Link>
                            </TooltipIconButton>

                            {inf.status === "ACTIVE" ? (
                              <TooltipIconButton
                                label="Pause this influencer"
                                disabled={busyId === inf.id}
                                onClick={() => changeStatus(inf, "PAUSED")}
                              >
                                <Pause className="size-4" />
                              </TooltipIconButton>
                            ) : (
                              <TooltipIconButton
                                label="Reactivate this influencer"
                                disabled={busyId === inf.id}
                                onClick={() => changeStatus(inf, "ACTIVE")}
                              >
                                <Play className="size-4" />
                              </TooltipIconButton>
                            )}

                            {inf.status !== "ARCHIVED" && (
                              <TooltipIconButton
                                label="Archive influencer"
                                disabled={busyId === inf.id}
                                onClick={() => changeStatus(inf, "ARCHIVED")}
                              >
                                <Archive className="size-4" />
                              </TooltipIconButton>
                            )}

                            <TooltipIconButton
                              label="Delete permanently"
                              disabled={busyId === inf.id}
                              onClick={() => handleDelete(inf)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </TooltipIconButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {pricingView && (
          <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
            <div className="my-8 w-full max-w-2xl rounded-xl border border-border bg-card shadow-lift">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <h2 className="font-display text-lg font-medium">
                    {pricingView.displayName}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    @{pricingView.username}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setPricingView(null)} title="Close">
                  <X />
                </Button>
              </div>
              <div className="p-6">
                <PricingCard
                  pricing={{
                    influencerId: pricingView.id,
                    username: pricingView.username,
                    slug: pricingView.slug,
                    displayName: pricingView.displayName,
                    avatarUrl: pricingView.avatarUrl,
                    currency: pricingView.currency,
                    pricingTiers: pricingView.pricingTiers || {},
                    minBudget: pricingView.minBudget ?? null,
                    acceptsBundles: pricingView.acceptsBundles ?? null,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </>
    </ProtectedRoute>
  );
}

function initials(name: string = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "?";
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function countTiers(pricingTiers: any): number {
  if (!pricingTiers || typeof pricingTiers !== "object") return 0;
  let count = 0;
  for (const tiers of Object.values(pricingTiers)) {
    if (tiers && typeof tiers === "object") {
      count += Object.keys(tiers).length;
    }
  }
  return count;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-emerald-500/15 text-emerald-500",
    PAUSED: "bg-amber-500/15 text-amber-500",
    ARCHIVED: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
        colors[status] || "bg-muted text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
}