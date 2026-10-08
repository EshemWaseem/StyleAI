import { swalError } from "@/lib/swal";
// influencers.$slug.tsx
import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  AlertCircle,
  Pencil,
  MapPin,
  Globe,
  Mail,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  BadgeDollarSign,
} from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, ScoreBar, SectionTitle } from "@/components/ui-kit";
import { useRole } from "@/lib/role";
import {
  influencersApi,
  formatFollowers,
  formatEngagement,
  type Influencer,
} from "@/lib/influencers";
import { InfluencerFormModal } from "@/components/influencer/InfluencerFormModal";
import { PricingCard } from "@/components/pricing/PricingCard";
import { MessageCircle } from "lucide-react";
import { chatApi } from "@/lib/chat";

export const Route = createFileRoute("/influencers/$slug")({
  head: () => ({ meta: [{ title: "Influencer — StyleAI" }] }),
  component: InfluencerDetailPage,
});

function InfluencerDetailPage() {
  const { slug } = useParams({ from: "/influencers/$slug" });
  const navigate = useNavigate();
  const { user, loading: authLoading } = useRole();

  const [influencer, setInfluencer] = useState<Influencer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);

  const isOwner = !!user && !!influencer && influencer.userId === user.id;
  const canEdit = isOwner && !!user?.permissions.includes("influencer.update");
  const canSave = !!user?.permissions.includes("influencer.save") && !isOwner;
  const canCreateOffer =
    !!user &&
    !isOwner &&
    ["BRAND_OWNER", "BRAND_TEAM_MEMBER"].some((r) =>
      user.roles.includes(r as any)
    );
  const isAdmin = !!user?.roles.includes("SUPER_ADMIN" as any);

  useEffect(() => {
    if (authLoading || !user) return;
    if (user.pendingApproval) {
      navigate({ to: "/pending" });
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, slug]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await influencersApi.get(slug);
      setInfluencer(res.influencer);
    } catch (err: any) {
      setError(err?.message || "Could not load influencer.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleSave() {
    if (!influencer || !canSave) return;
    try {
      if (influencer.isSaved) {
        await influencersApi.unsave(influencer.id);
        setInfluencer({ ...influencer, isSaved: false });
      } else {
        await influencersApi.save(influencer.id);
        setInfluencer({ ...influencer, isSaved: true });
      }
    } catch (err: any) {
      swalError(err?.message || "Action failed");
    }
  }

  async function openChat() {
    if (!influencer) return;
    setOpeningChat(true);
    try {
      const r = await chatApi.openWith("INFLUENCER", influencer.id);
      navigate({ to: "/messages", search: { c: r.conversation.id } as any });
    } catch (e: any) {
      swalError(e?.message || "Failed to open chat");
    } finally {
      setOpeningChat(false);
    }
  }

  if (authLoading || loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (error || !influencer) {
    return (
      <>
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error || "Influencer not found"}</span>
        </div>
        <div className="mt-4">
          <Link to="/influencers">
            <Button variant="outline">
              <ArrowLeft /> Back to discover
            </Button>
          </Link>
        </div>
      </>
    );
  }

  const inf = influencer;

  const affinity = [
    { label: "Fashion", value: Math.round((inf.fashionScore ?? 0) * 100) },
    { label: "Luxury", value: Math.round((inf.luxuryScore ?? 0) * 100) },
    { label: "Beauty", value: Math.round((inf.beautyScore ?? 0) * 100) },
    { label: "Lifestyle", value: Math.round((inf.lifestyleScore ?? 0) * 100) },
  ];
  const hasScores = affinity.some((a) => a.value > 0);

  return (
    <>
      <PageHeader
        eyebrow="Creator profile"
        title={inf.displayName}
        description={inf.bio || `@${inf.username}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {canCreateOffer && (
              <Button variant="outline" disabled={openingChat} onClick={openChat}>
                {openingChat ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle />}
                Message
              </Button>
            )}
            {canCreateOffer && (
              <Button
                onClick={() =>
                  navigate({
                    to: "/offers/new",
                    search: { influencerId: inf.id } as any,
                  })
                }
              >
                <Sparkles /> Create offer
              </Button>
            )}
            {canSave && (
              <Button variant="outline" onClick={toggleSave}>
                {inf.isSaved ? (
                  <><BookmarkCheck /> Saved</>
                ) : (
                  <><Bookmark /> Save</>
                )}
              </Button>
            )}
            {isOwner && (
              <Button
                variant="outline"
                onClick={() => navigate({ to: "/influencer/pricing" })}
              >
                <BadgeDollarSign /> Manage pricing
              </Button>
            )}
            {canEdit && (
              <Button variant="outline" onClick={() => setShowEdit(true)}>
                <Pencil /> Edit profile
              </Button>
            )}
          </div>
        }
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Followers</p>
          <p className="mt-2 font-display text-2xl font-medium tabular-nums">
            {formatFollowers(inf.followerCount)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Engagement</p>
          <p className="mt-2 font-display text-2xl font-medium tabular-nums">
            {formatEngagement(inf.engagementRate)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Avg views</p>
          <p className="mt-2 font-display text-2xl font-medium tabular-nums">
            {formatFollowers(inf.avgViews)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Avg likes</p>
          <p className="mt-2 font-display text-2xl font-medium tabular-nums">
            {formatFollowers(inf.avgLikes)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Avg comments</p>
          <p className="mt-2 font-display text-2xl font-medium tabular-nums">
            {formatFollowers(inf.avgComments)}
          </p>
        </div>
      </section>

      <Panel className="mt-6">
        <SectionTitle
          title="Pricing"
          description={
            isOwner
              ? "This is what brands see. Edit from My Pricing."
              : "Published rates per platform and content type."
          }
          action={<BadgeDollarSign className="size-4 text-muted-foreground" />}
        />
        <PricingCard
          pricing={{
            influencerId: inf.id,
            username: inf.username,
            slug: inf.slug,
            displayName: inf.displayName,
            avatarUrl: inf.avatarUrl,
            currency: inf.currency,
            pricingTiers: (inf.pricingTiers as any) || {},
            minBudget: (inf as any).minBudget ?? null,
            acceptsBundles: (inf as any).acceptsBundles ?? null,
          }}
        />
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <SectionTitle title="About" description={`@${inf.username}`} />
          <div className="flex items-center gap-3">
            {inf.avatarUrl ? (
              <img
                src={inf.avatarUrl}
                alt={inf.displayName}
                className="size-16 rounded-full object-cover"
              />
            ) : (
              <div className="grid size-16 place-items-center rounded-full bg-muted text-xl font-medium text-muted-foreground">
                {inf.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-display text-lg font-medium">{inf.displayName}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {inf.country && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" />
                    {inf.country}
                    {inf.city ? `, ${inf.city}` : ""}
                  </span>
                )}
                {inf.language && (
                  <span className="inline-flex items-center gap-1">
                    <Globe className="size-3" /> {inf.language}
                  </span>
                )}
                {inf.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="size-3" /> {inf.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {inf.bio && (
            <p className="mt-5 whitespace-pre-line text-sm leading-6 text-muted-foreground">
              {inf.bio}
            </p>
          )}

          {inf.categories.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Categories
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {inf.categories.map((c) => (
                  <span key={c} className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {inf.audienceFavorites && inf.audienceFavorites.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Audience favorites
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Personalities this creator's audience loves.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {inf.audienceFavorites.map((name) => (
                  <span key={name} className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {inf.pricePerPost != null && (
            <div className="mt-5 rounded-lg bg-muted/40 p-4 text-center">
              <p className="text-xs text-muted-foreground">Starting from</p>
              <p className="mt-1 font-display text-2xl font-medium">
                {inf.currency} {inf.pricePerPost}
              </p>
              <p className="text-[11px] text-muted-foreground">per post</p>
            </div>
          )}
        </Panel>

        {hasScores && (
          <Panel>
            <SectionTitle title="Content affinity" description="AI-computed niche scores." />
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={affinity} outerRadius="72%">
                  <PolarGrid stroke="var(--color-border)" />
                  <PolarAngleAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  />
                  <Radar
                    dataKey="value"
                    stroke="var(--color-accent)"
                    fill="var(--color-accent)"
                    fillOpacity={0.18}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        )}
      </div>

      {inf.audienceMetrics && (
        <Panel className="mt-6">
          <SectionTitle
            title="Audience overview"
            description="Reported and modelled audience composition."
          />
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {inf.audienceMetrics.ageDistribution && (
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  Age
                </p>
                <div className="mt-3 space-y-3">
                  {Object.entries(inf.audienceMetrics.ageDistribution).map(([k, v]) => (
                    <ScoreBar key={k} label={k} value={Number(v)} />
                  ))}
                </div>
              </div>
            )}
            {inf.audienceMetrics.genderDistribution && (
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  Gender
                </p>
                <div className="mt-3 space-y-3">
                  {Object.entries(inf.audienceMetrics.genderDistribution).map(([k, v]) => (
                    <ScoreBar key={k} label={k} value={Number(v)} />
                  ))}
                </div>
              </div>
            )}
            {inf.audienceMetrics.topCountries &&
              Array.isArray(inf.audienceMetrics.topCountries) &&
              inf.audienceMetrics.topCountries.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                    Location
                  </p>
                  <div className="mt-3 space-y-3">
                    {inf.audienceMetrics.topCountries.map((c: any, i: number) => (
                      <ScoreBar
                        key={i}
                        label={c.country ?? c.label ?? "—"}
                        value={Number(c.pct ?? c.value ?? 0)}
                      />
                    ))}
                  </div>
                </div>
              )}
          </div>
        </Panel>
      )}

      {inf.socialAccounts.length > 0 && (
        <Panel className="mt-6">
          <SectionTitle title="Social accounts" description="Connected platforms." />
          <div className="space-y-3">
            {inf.socialAccounts.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div>
                  <p className="text-sm font-medium">
                    {s.platform === "OTHER" && s.platformCustom ? s.platformCustom : s.platform} · @{s.handle}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFollowers(s.followerCount)} followers ·{" "}
                    {formatEngagement(s.engagementRate)} engagement
                  </p>
                </div>
                {s.isPrimary && (
                  <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                    Primary
                  </span>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {showEdit && canEdit && (
        <InfluencerFormModal
          mode="edit"
          influencer={inf}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setInfluencer(updated);
            setShowEdit(false);
          }}
        />
      )}
    </>
  );
}