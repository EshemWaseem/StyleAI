// routes/campaigns.$id.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle, ArrowLeft, Loader2, CheckCircle2, Clock, Package,
  MessageSquare, BarChart3, FileText, Save, Flag, Calendar,
  Upload, Pencil, Check, X, Send, ExternalLink, BarChart, Image as ImageIcon,
  MapPin, Truck, PackageCheck, RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, Panel, SectionTitle } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RawUploadModal } from "@/components/campaigns/RawUploadModal";
import { FinalUploadModal } from "@/components/campaigns/FinalUploadModal";
import { PublishModal } from "@/components/campaigns/PublishModal";
import { MetricsModal } from "@/components/campaigns/MetricsModal";
import { RejectModal } from "@/components/campaigns/RejectModal";
import { ShippingAddressModal } from "@/components/campaigns/ShippingAddressModal";
import { ShipProductModal } from "@/components/campaigns/ShipProductModal";
import { ChatTab } from "@/components/campaigns/ChatTab";
import { campaignsApi, type Campaign, type Deliverable } from "@/lib/campaigns";
import { useRole } from "@/lib/role";

export const Route = createFileRoute("/campaigns/$id")({
  head: () => ({ meta: [{ title: "Campaign — StyleAI" }] }),
  component: CampaignDetailPage,
});

type Tab = "overview" | "deliverables" | "messages" | "analytics";

function CampaignDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useRole();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [chatUnread, setChatUnread] = useState(0);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [receiving, setReceiving] = useState(false);

  const roles = (user?.roles ?? []) as string[];
  const isAdmin = roles.includes("SUPER_ADMIN");
  const isAgencyRole = roles.includes("AGENCY");
  const isInfluencerRole = roles.includes("INFLUENCER");
  const isBrandOwnerRole = roles.includes("BRAND_OWNER");
  const isBrandTeamRole = roles.includes("BRAND_TEAM_MEMBER");

  const isInfluencerSide = isInfluencerRole && !!campaign;
  const isAgencySide = isAgencyRole && !!campaign && !!campaign.agencyId;
  const isBrandSide =
    !isInfluencerRole && (isBrandOwnerRole || isBrandTeamRole || isAdmin);
  const canEditBrief = isBrandSide || isAdmin;

  async function load() {
    setLoading(true);
    try {
      const r = await campaignsApi.get(id);
      setCampaign(r.campaign);
    } catch (e: any) {
      setError(e?.message || "Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  useEffect(() => {
    if (!campaign) return;
    let cancelled = false;
    const poll = () => {
      campaignsApi.chatUnread(campaign.id)
        .then((r) => { if (!cancelled) setChatUnread(r.unread); })
        .catch(() => {});
    };
    poll();
    const t = setInterval(poll, 15000);
    return () => { cancelled = true; clearInterval(t); };
  }, [campaign?.id]);

  async function markComplete() {
    if (!campaign) return;
    if (!confirm("Mark this campaign as complete?")) return;
    setBusy(true);
    try {
      const r = await campaignsApi.complete(campaign.id);
      setCampaign(r.campaign);
    } catch (e: any) { alert(e?.message || "Failed"); }
    finally { setBusy(false); }
  }

  async function handleReceive() {
    if (!campaign) return;
    if (!confirm("Confirm you have received the product?")) return;
    setReceiving(true);
    try {
      const r = await campaignsApi.receive(campaign.id, { note: "Product in good condition" });
      setCampaign(r.campaign);
    } catch (e: any) {
      alert(e?.message || "Failed");
    } finally {
      setReceiving(false);
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="mt-16 flex items-center justify-center">
          <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !campaign) {
    return (
      <ProtectedRoute>
        <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error || "Campaign not found"}</span>
        </div>
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate({ to: "/campaigns" })}>
            <ArrowLeft className="mr-1 size-4" /> Back
          </Button>
        </div>
      </ProtectedRoute>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
    { key: "overview", label: "Overview", icon: FileText },
    { key: "deliverables", label: "Deliverables", icon: Package },
    { key: "messages", label: "Messages", icon: MessageSquare },
    { key: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  const shippingStatus = campaign.status;
  const needsAddress = isInfluencerSide && shippingStatus === "AWAITING_ADDRESS";
  const needsShip = isBrandSide && shippingStatus === "ADDRESS_SUBMITTED";
  const needsReceive = isInfluencerSide && shippingStatus === "SHIPPED";
  const isInProduction = shippingStatus === "IN_PRODUCTION";
  const showShippingSection =
    ["AWAITING_ADDRESS", "ADDRESS_SUBMITTED", "SHIPPED", "IN_PRODUCTION"].includes(shippingStatus);

  return (
    <ProtectedRoute>
      <PageHeader
        eyebrow="Campaign"
        title={campaign.title}
        description={`${campaign.brand?.name} · ${campaign.influencer?.displayName}${campaign.agency ? ` · via ${campaign.agency.name}` : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/campaigns"><ArrowLeft className="mr-1 size-4" /> All</Link>
            </Button>
            {canEditBrief && campaign.status !== "COMPLETED" && campaign.status !== "CANCELLED" && (
              <Button size="sm" disabled={busy} onClick={markComplete}>
                <Flag className="mr-1 size-4" /> Mark complete
              </Button>
            )}
          </div>
        }
      />

      <section className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="Status" value={campaign.status.replace(/_/g, " ")} />
        <Stat label="Total value" value={`${campaign.currency} ${campaign.totalAmount.toFixed(2)}`} />
        <Stat
          label="Deliverables"
          value={`${(campaign.deliverables ?? []).filter((d) => ["COMPLETED", "APPROVED", "METRICS_ENTERED", "BRAND_APPROVED", "PUBLISHED"].includes(d.status)).length}/${(campaign.deliverables ?? []).length} done`}
        />
        <Stat
          label="Due"
          value={campaign.dueDate ? new Date(campaign.dueDate).toLocaleDateString() : "—"}
        />
      </section>

      {showShippingSection && (
        <section className="mt-8">
          <SectionTitle
            title="Shipping & delivery"
            description="Track the product journey from brand to influencer."
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StepCard
              icon={MapPin}
              label="Address"
              status={
                shippingStatus === "AWAITING_ADDRESS"
                  ? "pending"
                  : ["ADDRESS_SUBMITTED", "SHIPPED", "IN_PRODUCTION"].includes(shippingStatus)
                  ? "done"
                  : "waiting"
              }
              detail={
                campaign.shippingAddress
                  ? `${campaign.shippingAddress.city}, ${campaign.shippingAddress.country}`
                  : "Not submitted yet"
              }
            />
            <StepCard
              icon={Truck}
              label="Shipped"
              status={
                ["AWAITING_ADDRESS", "ADDRESS_SUBMITTED"].includes(shippingStatus)
                  ? "waiting"
                  : ["SHIPPED", "IN_PRODUCTION"].includes(shippingStatus)
                  ? "done"
                  : "waiting"
              }
              detail={
                campaign.trackingNumber
                  ? `${campaign.shippingCarrier ?? ""} · ${campaign.trackingNumber}`
                  : "Awaiting shipment"
              }
            />
            <StepCard
              icon={PackageCheck}
              label="Received"
              status={
                campaign.receivedAt ? "done" : shippingStatus === "SHIPPED" ? "pending" : "waiting"
              }
              detail={
                campaign.receivedAt
                  ? new Date(campaign.receivedAt).toLocaleDateString()
                  : "Not received yet"
              }
            />
            <StepCard
              icon={Calendar}
              label="Deadline"
              status={campaign.contentDeadline ? "done" : "waiting"}
              detail={
                campaign.contentDeadline
                  ? new Date(campaign.contentDeadline).toLocaleDateString()
                  : "Not set"
              }
            />
          </div>

          <Panel className="mt-4 p-4">
            {campaign.shippingAddress && (
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Shipping address
                </p>
                <div className="mt-2 space-y-0.5 text-sm">
                  <p className="font-medium">{campaign.shippingAddress.fullName}</p>
                  <p className="text-muted-foreground">{campaign.shippingAddress.phone}</p>
                  <p className="text-muted-foreground">{campaign.shippingAddress.street}</p>
                  <p className="text-muted-foreground">
                    {[
                      campaign.shippingAddress.city,
                      campaign.shippingAddress.state,
                      campaign.shippingAddress.postalCode,
                      campaign.shippingAddress.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {campaign.shippingAddress.notes && (
                    <p className="mt-1 text-xs italic text-muted-foreground">
                      Note: {campaign.shippingAddress.notes}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {needsAddress && (
                <Button onClick={() => setShowAddressModal(true)}>
                  <MapPin className="mr-1.5 size-4" /> Submit shipping address
                </Button>
              )}
              {needsShip && (
                <Button onClick={() => setShowShipModal(true)}>
                  <Truck className="mr-1.5 size-4" /> Mark as shipped
                </Button>
              )}
              {needsReceive && (
                <Button onClick={handleReceive} disabled={receiving}>
                  {receiving ? (
                    <><Loader2 className="mr-1.5 size-4 animate-spin" /> Confirming…</>
                  ) : (
                    <><PackageCheck className="mr-1.5 size-4" /> I received the product</>
                  )}
                </Button>
              )}
              {isInProduction && (
                <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <span className="font-medium">In production</span>
                  {campaign.contentDeadline && (
                    <span className="text-xs text-muted-foreground">
                      · due {new Date(campaign.contentDeadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
              {isBrandSide && shippingStatus === "AWAITING_ADDRESS" && (
                <p className="text-sm text-muted-foreground">
                  Waiting for influencer to submit shipping address.
                </p>
              )}
              {isInfluencerSide && shippingStatus === "ADDRESS_SUBMITTED" && (
                <p className="text-sm text-muted-foreground">
                  Address submitted. Waiting for brand to ship.
                </p>
              )}
              {isInfluencerSide && shippingStatus === "SHIPPED" && (
                <p className="text-sm text-muted-foreground">
                  Product on the way — mark received when it arrives.
                </p>
              )}
            </div>
          </Panel>
        </section>
      )}

      <div className="mt-8 flex gap-1 border-b border-border">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          const showBadge = t.key === "messages" && chatUnread > 0;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
                if (t.key === "messages") setChatUnread(0);
              }}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {t.label}
              {showBadge && (
                <span className="grid min-w-[16px] place-items-center rounded-full bg-accent px-1 text-[9px] font-semibold leading-4 text-accent-foreground">
                  {chatUnread > 99 ? "99+" : chatUnread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === "overview" && (
          <OverviewTab campaign={campaign} canEdit={canEditBrief} onUpdate={load} />
        )}
        {tab === "deliverables" && (
          <DeliverablesTab
            campaign={campaign}
            user={user}
            isBrandSide={canEditBrief}
            isAgencySide={isAgencySide}
            isInfluencerSide={isInfluencerSide}
            isAdmin={isAdmin}
            onUpdate={load}
          />
        )}
        {tab === "messages" && user && (
          <ChatTab campaignId={campaign.id} currentUserId={(user as any).id} />
        )}
        {tab === "analytics" && <AnalyticsTabPlaceholder campaign={campaign} />}
      </div>

      {showAddressModal && (
        <ShippingAddressModal
          campaignId={campaign.id}
          initial={campaign.shippingAddress}
          onClose={() => setShowAddressModal(false)}
          onSaved={(c) => { setCampaign(c); setShowAddressModal(false); }}
        />
      )}

      {showShipModal && (
        <ShipProductModal
          campaignId={campaign.id}
          onClose={() => setShowShipModal(false)}
          onSaved={(c) => { setCampaign(c); setShowShipModal(false); }}
        />
      )}
    </ProtectedRoute>
  );
}

// ======================================================
// STEP CARD
// ======================================================
function StepCard({
  icon: Icon, label, status, detail,
}: {
  icon: any;
  label: string;
  status: "done" | "pending" | "waiting";
  detail: string;
}) {
  const color =
    status === "done"
      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-500"
      : status === "pending"
      ? "border-amber-500/30 bg-amber-500/5 text-amber-500"
      : "border-border bg-card text-muted-foreground opacity-60";
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="flex items-center gap-2">
        <Icon className="size-4" />
        <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-foreground/80">{detail}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-display text-lg font-medium tabular-nums">{value}</p>
    </div>
  );
}

// ======================================================
// OVERVIEW TAB
// ======================================================
function OverviewTab({
  campaign, canEdit, onUpdate,
}: { campaign: Campaign; canEdit: boolean; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [brief, setBrief] = useState(campaign.brief || "");
  const [description, setDescription] = useState(campaign.description || "");
  const [hashtagsText, setHashtagsText] = useState((campaign.hashtags || []).join(", "));
  const [mentionsText, setMentionsText] = useState((campaign.mentions || []).join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      await campaignsApi.update(campaign.id, {
        brief: brief || null,
        description: description || null,
        hashtags: hashtagsText.split(",").map((s) => s.trim()).filter(Boolean),
        mentions: mentionsText.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setEditing(false);
      onUpdate();
    } catch (e: any) {
      setError(e?.message || "Failed to save");
    } finally { setSaving(false); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Panel>
        <SectionTitle
          title="Campaign brief"
          description="Guidelines for the influencer and agency."
          action={
            canEdit && !editing ? (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="mr-1 size-3.5" /> Edit
              </Button>
            ) : canEdit && editing ? (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Save className="mr-1 size-4" />}
                  Save
                </Button>
              </div>
            ) : null
          }
        />

        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {editing ? (
          <div className="space-y-4">
            <div>
              <Label>Description</Label>
              <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <Label>Brief</Label>
              <textarea rows={6} value={brief} onChange={(e) => setBrief(e.target.value)}
                placeholder="Tone, mood, key messages, do's and don'ts…"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <Label>Hashtags</Label>
              <Input value={hashtagsText} onChange={(e) => setHashtagsText(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Mentions</Label>
              <Input value={mentionsText} onChange={(e) => setMentionsText(e.target.value)} className="mt-1" />
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            {campaign.description && (
              <p className="text-muted-foreground whitespace-pre-line">{campaign.description}</p>
            )}
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Brief</p>
              <p className="mt-1 whitespace-pre-line text-muted-foreground">{campaign.brief || "—"}</p>
            </div>
            {campaign.hashtags.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Hashtags</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {campaign.hashtags.map((h) => (
                    <span key={h} className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent">{h}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Panel>

      <div className="space-y-6">
        {campaign.product && (
          <Panel>
            <SectionTitle title="Product" description="What the influencer shoots." />
            <div className="flex items-start gap-3">
              {campaign.product.primaryImage ? (
                <img src={campaign.product.primaryImage} alt={campaign.product.name}
                  className="size-20 rounded-lg object-cover" />
              ) : (
                <div className="grid size-20 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <ImageIcon className="size-6" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium">{campaign.product.name}</p>
                <p className="text-xs text-muted-foreground">
                  {campaign.product.sku}{campaign.product.category ? ` · ${campaign.product.category}` : ""}
                </p>
                {campaign.product.price != null && (
                  <p className="mt-1 text-sm tabular-nums font-medium">
                    {campaign.product.currency || "USD"} {campaign.product.price}
                  </p>
                )}
              </div>
            </div>
          </Panel>
        )}

        <Panel>
          <SectionTitle title="Timeline" description="Key dates." />
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 size-4 text-accent" />
              <div>
                <p className="text-xs font-medium">Started</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(campaign.startDate).toLocaleString()}
                </p>
              </div>
            </div>
            {campaign.dueDate && (
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 size-4 text-amber-500" />
                <div>
                  <p className="text-xs font-medium">Due</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(campaign.dueDate).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            {campaign.contentDeadline && (
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 size-4 text-purple-500" />
                <div>
                  <p className="text-xs font-medium">Content deadline</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(campaign.contentDeadline).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            {campaign.completedAt && (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-4 text-emerald-500" />
                <div>
                  <p className="text-xs font-medium">Completed</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(campaign.completedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ======================================================
// DELIVERABLES TAB
// ======================================================
function DeliverablesTab({
  campaign, user, isBrandSide, isAgencySide, isInfluencerSide, isAdmin, onUpdate,
}: {
  campaign: Campaign;
  user: any;
  isBrandSide: boolean;
  isAgencySide: boolean;
  isInfluencerSide: boolean;
  isAdmin: boolean;
  onUpdate: () => void;
}) {
  const items = campaign.deliverables ?? [];
  const [rawFor, setRawFor] = useState<string | null>(null);
  const [finalFor, setFinalFor] = useState<string | null>(null);
  const [publishFor, setPublishFor] = useState<{ id: string; platform: string } | null>(null);
  const [metricsFor, setMetricsFor] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <Panel className="py-12 text-center">
        <Package className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">No deliverables.</p>
      </Panel>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {items.map((d) => (
          <DeliverableCard
            key={d.id}
            d={d}
            isBrandSide={isBrandSide}
            isAgencySide={isAgencySide}
            isInfluencerSide={isInfluencerSide}
            isAdmin={isAdmin}
            onRawUpload={() => setRawFor(d.id)}
            onFinalUpload={() => setFinalFor(d.id)}
            onPublish={() => setPublishFor({ id: d.id, platform: d.platform })}
            onMetrics={() => setMetricsFor(d.id)}
            onReject={() => setRejectFor(d.id)}
            onUpdate={onUpdate}
          />
        ))}
      </div>

      {rawFor && (() => {
        const del = items.find((x) => x.id === rawFor);
        const rawSubs = (del?.submissions ?? []).filter((s) => s.stage === "RAW");
        const latestRaw = rawSubs[0];
        return (
          <RawUploadModal
            campaignId={campaign.id}
            deliverableId={rawFor}
            currentIteration={latestRaw?.iteration ?? 0}
            previousFeedback={latestRaw?.feedback ?? null}
            onClose={() => setRawFor(null)}
            onSubmitted={() => { setRawFor(null); onUpdate(); }}
          />
        );
      })()}

      {finalFor && (
        <FinalUploadModal
          campaignId={campaign.id}
          deliverableId={finalFor}
          onClose={() => setFinalFor(null)}
          onSubmitted={() => { setFinalFor(null); onUpdate(); }}
        />
      )}
      {publishFor && (
        <PublishModal
          deliverableId={publishFor.id}
          defaultPlatform={publishFor.platform}
          onClose={() => setPublishFor(null)}
          onSubmitted={() => { setPublishFor(null); onUpdate(); }}
        />
      )}
      {metricsFor && (
        <MetricsModal
          deliverableId={metricsFor}
          onClose={() => setMetricsFor(null)}
          onSubmitted={() => { setMetricsFor(null); onUpdate(); }}
        />
      )}
      {rejectFor && (
        <RejectModal
          deliverableId={rejectFor}
          onClose={() => setRejectFor(null)}
          onSubmitted={() => { setRejectFor(null); onUpdate(); }}
        />
      )}
    </>
  );
}

// ======================================================
// DELIVERABLE CARD (with version history)
// ======================================================
function DeliverableCard({
  d, isBrandSide, isAgencySide, isInfluencerSide, isAdmin,
  onRawUpload, onFinalUpload, onPublish, onMetrics, onReject, onUpdate,
}: {
  d: Deliverable;
  isBrandSide: boolean;
  isAgencySide: boolean;
  isInfluencerSide: boolean;
  isAdmin: boolean;
  onRawUpload: () => void;
  onFinalUpload: () => void;
  onPublish: () => void;
  onMetrics: () => void;
  onReject: () => void;
  onUpdate: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [showRawHistory, setShowRawHistory] = useState(false);
  const [showFinalHistory, setShowFinalHistory] = useState(false);

  async function doAction(fn: () => Promise<any>) {
    setBusy(true);
    try {
      await fn();
      onUpdate();
    } catch (e: any) {
      alert(e?.message || "Failed");
    } finally { setBusy(false); }
  }

  const statusStyles: Record<string, string> = {
    PENDING: "bg-muted text-muted-foreground",
    RAW_UPLOADED: "bg-blue-500/15 text-blue-500",
    AGENCY_EDITING: "bg-purple-500/15 text-purple-500",
    FINAL_UPLOADED: "bg-amber-500/15 text-amber-500",
    BRAND_REVIEW: "bg-amber-500/15 text-amber-500",
    BRAND_APPROVED: "bg-emerald-500/15 text-emerald-500",
    BRAND_REJECTED: "bg-destructive/15 text-destructive",
    PUBLISHED: "bg-emerald-500/15 text-emerald-500",
    METRICS_ENTERED: "bg-emerald-500/15 text-emerald-500",
    COMPLETED: "bg-emerald-500/15 text-emerald-500",
    IN_PROGRESS: "bg-blue-500/15 text-blue-500",
    SUBMITTED: "bg-amber-500/15 text-amber-500",
    APPROVED: "bg-emerald-500/15 text-emerald-500",
    CHANGES_REQUESTED: "bg-amber-500/15 text-amber-500",
    REJECTED: "bg-destructive/15 text-destructive",
  };

  const rawSubs = (d.submissions ?? []).filter((s) => s.stage === "RAW");
  const finalSubs = (d.submissions ?? []).filter((s) => s.stage === "FINAL");

  const latestRaw = rawSubs[0];
  const latestFinal = finalSubs[0];
  const latestPublish = (d.publishes ?? [])[0];
  const latestMetric = (d.metrics ?? [])[0];

  const canSubmitRaw = (isInfluencerSide || isAdmin) &&
    ["PENDING", "IN_PROGRESS", "CHANGES_REQUESTED", "BRAND_REJECTED"].includes(d.status);
  const canStartEdit = (isAgencySide || isAdmin) && d.status === "RAW_UPLOADED";
  const canSubmitFinal = (isAgencySide || isAdmin) &&
    ["RAW_UPLOADED", "AGENCY_EDITING", "CHANGES_REQUESTED", "BRAND_REJECTED"].includes(d.status);
  const canApprove = (isBrandSide || isAdmin) && ["FINAL_UPLOADED", "BRAND_REVIEW"].includes(d.status);
  const canReject = (isBrandSide || isAdmin) && ["FINAL_UPLOADED", "BRAND_REVIEW"].includes(d.status);
  const canPublish = (isAgencySide || isAdmin) && d.status === "BRAND_APPROVED";
  const canEnterMetrics = (isAgencySide || isBrandSide || isInfluencerSide || isAdmin) &&
    d.status === "PUBLISHED";

  const isRawRevision = rawSubs.length > 0 && ["CHANGES_REQUESTED", "BRAND_REJECTED"].includes(d.status);
  const isFinalRevision = finalSubs.length > 0 && ["CHANGES_REQUESTED", "BRAND_REJECTED"].includes(d.status);

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-border p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-xs font-semibold uppercase text-accent">
            {d.platform.slice(0, 3)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium capitalize">
              {d.contentType} × {d.quantity}
            </p>
            <p className="text-xs text-muted-foreground">
              {d.dueDate ? `Due ${new Date(d.dueDate).toLocaleDateString()}` : "No due date"}
            </p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${statusStyles[d.status] || "bg-muted"}`}>
          {d.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {/* 1. RAW */}
        <div className="rounded-lg border border-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">
              1. Raw (Influencer)
            </p>
            {rawSubs.length > 1 && (
              <button
                type="button"
                onClick={() => setShowRawHistory((s) => !s)}
                className="inline-flex items-center gap-1 text-[10px] text-accent hover:underline"
              >
                {rawSubs.length} versions
                {showRawHistory ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              </button>
            )}
          </div>

          {latestRaw ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold text-accent">
                  v{latestRaw.iteration ?? 1}
                </span>
                <p className="text-xs">
                  {Array.isArray(latestRaw.files) ? latestRaw.files.length : 0} file(s)
                </p>
              </div>
              {latestRaw.notes && (
                <p className="text-[11px] text-muted-foreground italic">
                  "{latestRaw.notes}"
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Not uploaded</p>
          )}

          {canSubmitRaw && (
            <Button
              size="sm"
              className="mt-2 w-full"
              onClick={onRawUpload}
              disabled={busy}
            >
              {isRawRevision ? (
                <><RefreshCw className="mr-1 size-3" /> Upload revised version</>
              ) : (
                <><Upload className="mr-1 size-3" /> Upload raw</>
              )}
            </Button>
          )}

          {showRawHistory && rawSubs.length > 1 && (
            <div className="mt-3 space-y-1.5 border-t border-border pt-2">
              {rawSubs.slice(1).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">v{s.iteration ?? 1}</span>
                  <span className={`rounded-full px-1.5 py-0.5 uppercase ${statusStyles[s.status] || "bg-muted"}`}>
                    {s.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. AGENCY EDIT */}
        <div className="rounded-lg border border-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">
              2. Agency edit
            </p>
            {finalSubs.length > 1 && (
              <button
                type="button"
                onClick={() => setShowFinalHistory((s) => !s)}
                className="inline-flex items-center gap-1 text-[10px] text-accent hover:underline"
              >
                {finalSubs.length} versions
                {showFinalHistory ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              </button>
            )}
          </div>

          {latestFinal ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold text-accent">
                  v{latestFinal.iteration ?? 1}
                </span>
                <p className="text-xs">
                  {Array.isArray(latestFinal.files) ? latestFinal.files.length : 0} final file(s)
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Not edited yet</p>
          )}

          {canStartEdit && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2 w-full"
              onClick={() => doAction(() => campaignsApi.startEditing(d.id))}
              disabled={busy}
            >
              <Pencil className="mr-1 size-3" /> Start editing
            </Button>
          )}
          {canSubmitFinal && (
            <Button
              size="sm"
              className="mt-2 w-full"
              onClick={onFinalUpload}
              disabled={busy}
            >
              {isFinalRevision ? (
                <><RefreshCw className="mr-1 size-3" /> Upload revised final</>
              ) : (
                <><Upload className="mr-1 size-3" /> Upload final</>
              )}
            </Button>
          )}

          {showFinalHistory && finalSubs.length > 1 && (
            <div className="mt-3 space-y-1.5 border-t border-border pt-2">
              {finalSubs.slice(1).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">v{s.iteration ?? 1}</span>
                  <span className={`rounded-full px-1.5 py-0.5 uppercase ${statusStyles[s.status] || "bg-muted"}`}>
                    {s.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. BRAND REVIEW */}
        <div className="rounded-lg border border-border p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase text-muted-foreground">
            3. Brand review
          </p>
          {["BRAND_APPROVED", "PUBLISHED", "METRICS_ENTERED", "COMPLETED"].includes(d.status) ? (
            <p className="text-xs text-emerald-500">Approved ✓</p>
          ) : d.status === "BRAND_REJECTED" ? (
            <p className="text-xs text-destructive">Rejected — awaiting changes</p>
          ) : (
            <p className="text-xs text-muted-foreground">Pending</p>
          )}
          {canApprove && (
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={onReject} disabled={busy}>
                <X className="mr-1 size-3" /> Changes
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => doAction(() => campaignsApi.approveContent(d.id))}
                disabled={busy}
              >
                <Check className="mr-1 size-3" /> Approve
              </Button>
            </div>
          )}
        </div>

        {/* 4. PUBLISH & METRICS */}
        <div className="rounded-lg border border-border p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase text-muted-foreground">
            4. Publish & metrics
          </p>
          {latestPublish ? (
            <a
              href={latestPublish.postUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              {latestPublish.platform} · view post <ExternalLink className="size-3" />
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">Not published</p>
          )}
          {latestMetric && (
            <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
              <p>Reach: <span className="tabular-nums text-foreground">{latestMetric.reach.toLocaleString()}</span></p>
              <p>Impressions: <span className="tabular-nums text-foreground">{latestMetric.impressions.toLocaleString()}</span></p>
              <p>Revenue: <span className="tabular-nums text-foreground">{latestMetric.revenue.toFixed(2)}</span></p>
            </div>
          )}
          {canPublish && (
            <Button size="sm" className="mt-2 w-full" onClick={onPublish} disabled={busy}>
              <Send className="mr-1 size-3" /> Mark as published
            </Button>
          )}
          {canEnterMetrics && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2 w-full"
              onClick={onMetrics}
              disabled={busy}
            >
              <BarChart className="mr-1 size-3" /> Enter metrics
            </Button>
          )}
        </div>
      </div>

      {d.status === "BRAND_REJECTED" && latestFinal?.feedback && (
        <div className="border-t border-border bg-destructive/5 p-3 text-xs">
          <p className="font-medium text-destructive">Brand feedback</p>
          <p className="mt-1 whitespace-pre-line text-muted-foreground">
            {latestFinal.feedback}
          </p>
        </div>
      )}
    </Panel>
  );
}

// ======================================================
// ANALYTICS TAB
// ======================================================
function AnalyticsTabPlaceholder({ campaign }: { campaign: Campaign }) {
  return (
    <Panel className="py-16 text-center">
      <BarChart3 className="mx-auto size-6 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">Campaign-level analytics</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Metrics from published deliverables. Full analytics at{" "}
        <Link to="/analytics" className="text-accent hover:underline">/analytics</Link>.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat label="Reach" value={campaign.reach} />
        <MiniStat label="Impressions" value={campaign.impressions} />
        <MiniStat label="Clicks" value={campaign.clicks} />
        <MiniStat label="Conversions" value={campaign.conversions} />
      </div>
    </Panel>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-3">
      <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-medium tabular-nums text-muted-foreground">
        {value.toLocaleString()}
      </p>
    </div>
  );
}