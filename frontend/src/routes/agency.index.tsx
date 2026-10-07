// routes/agency.index.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, Loader2, Briefcase, Megaphone, Camera,
  ArrowRight, ExternalLink, CheckCircle2, TrendingUp, Sparkles, Settings2, Globe, Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, SectionTitle } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  agencyApi,
  type AgencyClientEntry,
  type AgencyProfile,
  type AgencyServiceType,
} from "@/lib/agency";
import {
  campaignsApi,
  type Campaign,
  type Deliverable,
} from "@/lib/campaigns";
import { useAgency } from "@/lib/agency/context";
import {
  AGENCY_SERVICE_LABELS,
  BRAND_SERVICE_TYPES,
  INFLUENCER_SERVICE_TYPES,
} from "@/lib/agency/types";
import { AgencyProfileModal } from "@/components/agency/AgencyProfileModal";

export const Route = createFileRoute("/agency/")({
  head: () => ({ meta: [{ title: "Agency — StyleAI" }] }),
  component: AgencyDashboard,
});

const EDITING_STATUSES = ["RAW_UPLOADED", "AGENCY_EDITING"];
const COMPLETED_STATUSES = ["PUBLISHED", "METRICS_ENTERED", "COMPLETED"];
const ACTIVE_CAMPAIGN_STATUSES = ["ACTIVE", "IN_PROGRESS", "PENDING"];

function AgencyDashboard() {
  const { activeBrandId, setActiveBrand } = useAgency();
  const [clients, setClients] = useState<AgencyClientEntry[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [profile, setProfile] = useState<AgencyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [c, cp, p] = await Promise.all([
        agencyApi.listClients().catch(() => ({ clients: [] as AgencyClientEntry[] })),
        campaignsApi.list({ limit: 200 }).catch(() => ({
          campaigns: [] as Campaign[], total: 0, limit: 0, offset: 0,
        })),
        agencyApi.getMe().catch(() => ({ profile: null as any })),
      ]);
      setClients(c.clients || []);
      setCampaigns(cp.campaigns || []);
      setProfile(p.profile || null);
    } catch (e: any) {
      setError(e?.message || "Failed to load agency data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const totalBrands = clients.reduce((sum, c) => sum + c.brands.length, 0);
    const activeCampaigns = campaigns.filter((c) =>
      ACTIVE_CAMPAIGN_STATUSES.includes(c.status)
    ).length;
    const completedCampaigns = campaigns.filter((c) => c.status === "COMPLETED").length;

    const scoped = activeBrandId
      ? campaigns.filter((c) => c.brandId === activeBrandId)
      : campaigns;

    const editingQueue: Array<{ campaign: Campaign; deliverable: Deliverable }> = [];
    let totalDeliverables = 0;
    let doneDeliverables = 0;

    for (const c of scoped) {
      for (const d of c.deliverables ?? []) {
        totalDeliverables += 1;
        if (EDITING_STATUSES.includes(d.status)) editingQueue.push({ campaign: c, deliverable: d });
        if (COMPLETED_STATUSES.includes(d.status)) doneDeliverables += 1;
      }
    }

    return { totalBrands, activeCampaigns, completedCampaigns, editingQueue, totalDeliverables, doneDeliverables };
  }, [clients, campaigns, activeBrandId]);

  const hasClients = clients.length > 0;
  const hasServices = (profile?.serviceTypes?.length ?? 0) > 0;
  const brandServices = (profile?.serviceTypes ?? []).filter((s) =>
    BRAND_SERVICE_TYPES.includes(s)
  );
  const influencerServices = (profile?.serviceTypes ?? []).filter((s) =>
    INFLUENCER_SERVICE_TYPES.includes(s)
  );

  return (
    <ProtectedRoute roles={["AGENCY"]}>
      <PageHeader
        eyebrow="Agency"
        title={profile?.displayName || "Your agency workspace"}
        description={profile?.tagline || "Shooting, editing, and campaign delivery across your client brands."}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowProfileModal(true)}>
              <Settings2 className="mr-1.5 size-4" /> Edit profile
            </Button>
            {hasClients && (
              <Button asChild>
                <Link to="/agency/clients">
                  <Briefcase className="mr-1.5 size-4" />
                  Manage clients
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="mt-16 flex items-center justify-center">
          <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading agency workspace…</span>
        </div>
      ) : (
        <>
          {/* ==================== SERVICE CATEGORIES ==================== */}
          {!hasServices ? (
            <Panel className="mt-8 border-dashed">
              <div className="flex flex-col items-center px-4 py-10 text-center">
                <div className="grid size-14 place-items-center rounded-full bg-accent/15 text-accent">
                  <Sparkles className="size-6" />
                </div>
                <h2 className="mt-4 font-display text-xl font-medium">
                  Choose your service categories
                </h2>
                <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                  Select the services your agency offers. Brands and influencers
                  will use this to discover and hire you.
                </p>
                <Button className="mt-5" onClick={() => setShowProfileModal(true)}>
                  <Settings2 className="mr-1.5 size-4" /> Set up services
                </Button>
              </div>
            </Panel>
          ) : (
            <section className="mt-8">
              <SectionTitle
                title="Your service categories"
                description="What brands and influencers can hire you for."
                action={
                  <Button variant="outline" size="sm" onClick={() => setShowProfileModal(true)}>
                    <Settings2 className="mr-1 size-3" /> Edit
                  </Button>
                }
              />

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {/* Brand-side */}
                <Panel className="p-5">
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-md bg-accent/15 text-accent">
                      <Briefcase className="size-4" />
                    </span>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Brand-side services
                    </p>
                  </div>
                  <div className="mt-4 space-y-2">
                    {BRAND_SERVICE_TYPES.map((type) => {
                      const offered = brandServices.includes(type);
                      return (
                        <ServiceRow key={type} type={type} offered={offered} />
                      );
                    })}
                  </div>
                </Panel>

                {/* Influencer-side */}
                <Panel className="p-5">
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-md bg-purple-500/15 text-purple-500">
                      <Camera className="size-4" />
                    </span>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Influencer-side services
                    </p>
                  </div>
                  <div className="mt-4 space-y-2">
                    {INFLUENCER_SERVICE_TYPES.map((type) => {
                      const offered = influencerServices.includes(type);
                      return (
                        <ServiceRow key={type} type={type} offered={offered} />
                      );
                    })}
                  </div>
                </Panel>
              </div>
            </section>
          )}

          {/* ==================== STATS (only if clients) ==================== */}
          {hasClients && (
            <>
              <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon={Briefcase}
                  label="Client organizations"
                  value={stats.totalBrands}
                  note={activeBrandId ? "Filtered" : "Across all clients"}
                  accent="accent"
                />
                <StatCard
                  icon={Megaphone}
                  label="Active campaigns"
                  value={stats.activeCampaigns}
                  note={`${stats.completedCampaigns} completed all-time`}
                  accent="emerald"
                />
                <StatCard
                  icon={Camera}
                  label="In editing queue"
                  value={stats.editingQueue.length}
                  note={stats.editingQueue.length === 0 ? "Nothing pending" : "Needs your team"}
                  accent="amber"
                />
                <StatCard
                  icon={CheckCircle2}
                  label="Deliverables done"
                  value={stats.doneDeliverables}
                  note={`of ${stats.totalDeliverables} total`}
                  accent="blue"
                />
              </section>

              <section className="mt-10">
                <SectionTitle
                  title="Client brands"
                  description="Pick a brand to operate as them across the platform."
                  action={
                    <Button asChild variant="outline" size="sm">
                      <Link to="/agency/clients">
                        All clients <ArrowRight className="ml-1 size-3" />
                      </Link>
                    </Button>
                  }
                />
                <Panel className="mt-4 divide-y divide-border overflow-hidden">
                  {clients.slice(0, 6).flatMap((c) =>
                    c.brands.slice(0, 2).map((b) => (
                      <BrandRow
                        key={`${c.id}-${b.id}`}
                        brand={b}
                        clientName={c.clientOrganization.name}
                        activeBrandId={activeBrandId}
                        onAct={() => setActiveBrand(b.id)}
                      />
                    ))
                  )}
                </Panel>
              </section>

              {stats.editingQueue.length > 0 && (
                <section className="mt-10">
                  <SectionTitle
                    title="Editing queue"
                    description={`${stats.editingQueue.length} deliverable${stats.editingQueue.length === 1 ? "" : "s"} awaiting edit.`}
                    action={
                      <Button asChild variant="outline" size="sm">
                        <Link to="/agency/editing">
                          Open queue <ArrowRight className="ml-1 size-3" />
                        </Link>
                      </Button>
                    }
                  />
                  <Panel className="mt-4 divide-y divide-border">
                    {stats.editingQueue.slice(0, 4).map(({ campaign, deliverable }) => (
                      <div key={`${campaign.id}-${deliverable.id}`} className="flex items-center gap-3 p-4">
                        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-purple-500/15 text-purple-500 text-xs font-semibold uppercase">
                          {deliverable.platform.slice(0, 3)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{campaign.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {campaign.brand?.name ?? "—"} · {deliverable.contentType} × {deliverable.quantity}
                          </p>
                        </div>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                          {deliverable.status.replace(/_/g, " ")}
                        </span>
                        <Button asChild size="sm" variant="outline">
                          <Link to="/campaigns/$id" params={{ id: campaign.id }}>
                            Open
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </Panel>
                </section>
              )}
            </>
          )}

          {/* ==================== QUICK ACTIONS ==================== */}
          <section className="mt-10">
            <SectionTitle title="Quick actions" />
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <QuickAction
                to="/agency/browse"
                icon={Globe}
                title="Browse brands & creators"
                description="Find new clients or collab partners."
              />
              <QuickAction
                to="/agency/campaigns"
                icon={Megaphone}
                title="All campaigns"
                description={`${stats.activeCampaigns} active across your portfolio.`}
              />
              <QuickAction
                to="/analytics"
                icon={TrendingUp}
                title="Portfolio analytics"
                description="Revenue and ROI across all clients."
              />
            </div>
          </section>
        </>
      )}

      {showProfileModal && profile && (
        <AgencyProfileModal
          initial={profile}
          onClose={() => setShowProfileModal(false)}
          onSaved={(p) => {
            setProfile(p);
            setShowProfileModal(false);
          }}
        />
      )}
    </ProtectedRoute>
  );
}

// ======================================================
// SERVICE ROW
// ======================================================
function ServiceRow({ type, offered }: { type: AgencyServiceType; offered: boolean }) {
  const Icon =
    type === "BRAND_WEBSITE" ? Globe :
    type === "INFLUENCER_VIDEOGRAPHY" ? Video :
    type === "INFLUENCER_PHOTOSHOOT" ? Camera :
    Briefcase;

  return (
    <div className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
      offered ? "border-emerald-500/30 bg-emerald-500/5" : "border-border opacity-60"
    }`}>
      <Icon className={`size-4 shrink-0 ${offered ? "text-emerald-500" : "text-muted-foreground"}`} />
      <span className={`flex-1 ${offered ? "font-medium" : ""}`}>
        {AGENCY_SERVICE_LABELS[type]}
      </span>
      {offered && (
        <span className="text-[10px] font-medium uppercase text-emerald-500">
          Offered
        </span>
      )}
    </div>
  );
}

// ======================================================
// STAT CARD
// ======================================================
function StatCard({
  icon: Icon, label, value, note, accent,
}: {
  icon: typeof Briefcase;
  label: string;
  value: number;
  note?: string;
  accent: "accent" | "blue" | "emerald" | "amber";
}) {
  const colors = {
    accent: "bg-accent/15 text-accent",
    blue: "bg-blue-500/15 text-blue-500",
    emerald: "bg-emerald-500/15 text-emerald-500",
    amber: "bg-amber-500/15 text-amber-500",
  };
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className={`grid size-8 place-items-center rounded-md ${colors[accent]}`}>
          <Icon className="size-4" />
        </span>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-3 font-display text-3xl font-medium tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </article>
  );
}

// ======================================================
// BRAND ROW
// ======================================================
function BrandRow({
  brand, clientName, activeBrandId, onAct,
}: {
  brand: { id: string; name: string; slug: string; logoUrl: string | null };
  clientName: string;
  activeBrandId: string | null;
  onAct: () => void;
}) {
  const isActive = activeBrandId === brand.id;
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      {brand.logoUrl ? (
        <img src={brand.logoUrl} alt={brand.name} className="size-10 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent/15 text-sm font-semibold uppercase text-accent">
          {brand.name.charAt(0)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{brand.name}</p>
        <p className="truncate text-xs text-muted-foreground">{clientName}</p>
      </div>
      {isActive ? (
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-medium uppercase text-emerald-500">
          Acting
        </span>
      ) : (
        <Button size="sm" variant="outline" onClick={onAct}>
          Act as this brand
        </Button>
      )}
      <Button asChild variant="ghost" size="icon" title="View brand">
        <Link to="/brands/$brandId" params={{ brandId: brand.id }}>
          <ExternalLink className="size-3.5" />
        </Link>
      </Button>
    </div>
  );
}

// ======================================================
// QUICK ACTION
// ======================================================
function QuickAction({
  to, icon: Icon, title, description,
}: {
  to: string;
  icon: typeof Megaphone;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to as any}
      className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-accent/40 hover:bg-accent/5"
    >
      <span className="grid size-10 place-items-center rounded-md bg-accent/15 text-accent">
        <Icon className="size-4" />
      </span>
      <p className="mt-4 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent">
        Open <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}