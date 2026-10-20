import { swalError } from "@/lib/swal";
import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { Loader2, ShieldCheck, AlertTriangle, TrendingUp, CheckCircle2, Circle } from "lucide-react";
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
  MessageCircle,
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
  formatNumber,
  formatEngagement,
  type Influencer,
  type EngagementHealth,
} from "@/lib/influencers";
import { InfluencerFormModal } from "@/components/influencer/InfluencerFormModal";
import { PricingCard } from "@/components/pricing/PricingCard";
import { chatApi } from "@/lib/chat";

export const Route = createFileRoute("/influencers/$slug")({
  head: () => ({ meta: [{ title: "Influencer — StyleAI" }] }),
  component: InfluencerDetailPage,
});

const HEALTH_STYLE: Record<EngagementHealth, string> = {
  EXCELLENT: "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
  GOOD: "border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400",
  SUSPICIOUS: "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400",
  FAKE: "border-destructive/30 bg-destructive/5 text-destructive",
};

const FLAG_LABEL: Record<string, string> = {
  HIGH_FOLLOW_RATIO: "High following/followers ratio",
  ELEVATED_FOLLOW_RATIO: "Elevated follow ratio",
  VERY_LOW_ENGAGEMENT: "Very low engagement",
  LOW_ENGAGEMENT: "Low engagement",
  BELOW_AVERAGE_ENGAGEMENT: "Below-average engagement",
  HIGH_ENGAGEMENT: "Exceptional engagement",
  NO_POSTS_AVAILABLE: "No recent posts available",
  INACTIVE_90D: "Inactive for 90+ days",
  INACTIVE_30D: "Inactive for 30+ days",
  NO_POST_TIMESTAMPS: "Missing post timestamps",
  LOW_POST_COUNT: "Very few posts",
};

function ScoreCircle({ percentage, label }: { percentage: number; label: string }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const val = percentage || 0;
  const strokeDashoffset = circumference - (val / 100) * circumference;

  let color = "#22c55e";
  if (val < 80) color = "#3b82f6";
  if (val < 60) color = "#f59e0b";
  if (val < 40) color = "#ef4444";

  return (
    <div className="relative flex items-center justify-center size-28 shrink-0">
      <svg className="size-28 transform -rotate-90">
        <circle cx="56" cy="56" r={radius} stroke="var(--color-muted)" strokeWidth="8" fill="transparent" />
        <circle
          cx="56" cy="56" r={radius} stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" fill="transparent"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-display">{Math.round(val)}%</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
}

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

  useEffect(() => {
    if (authLoading || !user) return;
    if (user.pendingApproval) {
      navigate({ to: "/pending" });
      return;
    }
    load();
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
  const completeness = (inf as any).profileCompleteness ?? 0;

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
                {inf.isSaved ? (<><BookmarkCheck /> Saved</>) : (<><Bookmark /> Save</>)}
              </Button>
            )}
            {isOwner && (
              <Button variant="outline" onClick={() => navigate({ to: "/influencer/pricing" })}>
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

      {/* ✅ PROFILE COMPLETENESS SECTION (Only visible to Owner) */}
      {isOwner && (
        <Panel className="mt-6 border-accent/30 bg-accent/5">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <ScoreCircle percentage={completeness} label="Complete" />
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-display text-lg font-medium">Profile Completeness: {completeness}%</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Brands are 80% more likely to hire creators with complete profiles. Fill the checklist below to reach 100%.
              </p>
              
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  {inf.displayName ? <CheckCircle2 className="size-4 text-emerald-500" /> : <Circle className="size-4 text-muted-foreground" />}
                  <span className={inf.displayName ? "text-foreground" : "text-muted-foreground"}>Display Name</span>
                </div>
                <div className="flex items-center gap-2">
                  {inf.avatarUrl ? <CheckCircle2 className="size-4 text-emerald-500" /> : <Circle className="size-4 text-muted-foreground" />}
                  <span className={inf.avatarUrl ? "text-foreground" : "text-muted-foreground"}>Profile Picture</span>
                </div>
                <div className="flex items-center gap-2">
                  {inf.bio && inf.bio.length > 0 ? <CheckCircle2 className="size-4 text-emerald-500" /> : <Circle className="size-4 text-muted-foreground" />}
                  <span className={inf.bio && inf.bio.length > 0 ? "text-foreground" : "text-muted-foreground"}>Bio</span>
                </div>
                <div className="flex items-center gap-2">
                  {inf.categories && inf.categories.length > 0 ? <CheckCircle2 className="size-4 text-emerald-500" /> : <Circle className="size-4 text-muted-foreground" />}
                  <span className={inf.categories && inf.categories.length > 0 ? "text-foreground" : "text-muted-foreground"}>Categories</span>
                </div>
                <div className="flex items-center gap-2">
                  {inf.socialAccounts && inf.socialAccounts.length > 0 ? <CheckCircle2 className="size-4 text-emerald-500" /> : <Circle className="size-4 text-muted-foreground" />}
                  <span className={inf.socialAccounts && inf.socialAccounts.length > 0 ? "text-foreground" : "text-muted-foreground"}>Social Account</span>
                </div>
                <div className="flex items-center gap-2">
                  {inf.pricePerPost != null || Object.keys(inf.pricingTiers || {}).length > 0 ? <CheckCircle2 className="size-4 text-emerald-500" /> : <Circle className="size-4 text-muted-foreground" />}
                  <span className={inf.pricePerPost != null || Object.keys(inf.pricingTiers || {}).length > 0 ? "text-foreground" : "text-muted-foreground"}>Pricing</span>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Followers</p>
          <p className="mt-2 font-display text-2xl font-medium tabular-nums">
            {formatNumber(inf.followerCount)}
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
            {formatNumber(inf.avgViews)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Avg likes</p>
          <p className="mt-2 font-display text-2xl font-medium tabular-nums">
            {formatNumber(inf.avgLikes)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Avg comments</p>
          <p className="mt-2 font-display text-2xl font-medium tabular-nums">
            {formatNumber(inf.avgComments)}
          </p>
        </div>
      </section>

      <Panel className="mt-6">
        <SectionTitle
          title="Pricing"
          description={isOwner ? "This is what brands see. Edit from My Pricing." : "Published rates per platform and content type."}
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
              <img src={inf.avatarUrl} alt={inf.displayName} className="size-16 rounded-full object-cover" />
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
                    {inf.country}{inf.city ? `, ${inf.city}` : ""}
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
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">Categories</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {inf.categories.map((c) => (
                  <span key={c} className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs">{c}</span>
                ))}
              </div>
            </div>
          )}

          {inf.audienceFavorites && inf.audienceFavorites.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">Audience favorites</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {inf.audienceFavorites.map((name) => (
                  <span key={name} className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs">{name}</span>
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
                  <PolarAngleAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                  <Radar dataKey="value" stroke="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.18} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        )}
      </div>

      <Panel className="mt-6">
        <SectionTitle
          title="Engagement analysis"
          description="Real engagement metrics and authenticity score per platform. Detects purchased followers."
          action={<TrendingUp className="size-4 text-muted-foreground" />}
        />
        <div className="space-y-4">
          {inf.socialAccounts.length === 0 ? (
            <div className="text-center p-6 text-sm text-muted-foreground border border-dashed rounded-lg">
              No social accounts connected yet.
            </div>
          ) : (
            inf.socialAccounts.map((s) => {
              const health = (s.engagementHealth ?? "GOOD") as EngagementHealth;
              const hasScore = s.authenticityScore != null;
              
              return (
                <div
                  key={s.id}
                  className={`rounded-lg border p-4 ${hasScore ? HEALTH_STYLE[health] : "border-border bg-muted/10"}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {hasScore ? (
                        <ScoreCircle percentage={s.authenticityScore || 0} label="Auth Score" />
                      ) : (
                        <div className="flex flex-col items-center justify-center size-28 shrink-0 rounded-full border-4 border-dashed border-muted text-muted-foreground bg-muted/20">
                          <span className="text-sm font-semibold">Needs</span>
                          <span className="text-sm font-semibold">Analysis</span>
                        </div>
                      )}
                      
                      <div>
                        <div className="flex items-center gap-2">
                          {hasScore ? (
                            health === "EXCELLENT" || health === "GOOD" ? (
                              <ShieldCheck className="size-4" />
                            ) : (
                              <AlertTriangle className="size-4" />
                            )
                          ) : (
                            <TrendingUp className="size-4 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium">
                            {s.platform} · @{s.handle}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          {hasScore ? (
                            <span className="rounded-full bg-black/10 px-2 py-0.5 font-medium uppercase dark:bg-white/10">
                              {health}
                            </span>
                          ) : (
                            <span className="rounded-full bg-muted px-2 py-0.5 font-medium uppercase text-muted-foreground">
                              Pending Scraper
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <div>
                      <dt className="opacity-70">Total posts</dt>
                      <dd className="font-medium tabular-nums">
                        {formatNumber(s.totalPosts)}
                      </dd>
                    </div>
                    <div>
                      <dt className="opacity-70">Total likes</dt>
                      <dd className="font-medium tabular-nums">
                        {formatNumber(s.totalLikes)}
                      </dd>
                    </div>
                    <div>
                      <dt className="opacity-70">Avg likes</dt>
                      <dd className="font-medium tabular-nums">
                        {formatNumber(s.avgLikes)}
                      </dd>
                    </div>
                    <div>
                      <dt className="opacity-70">Avg comments</dt>
                      <dd className="font-medium tabular-nums">
                        {formatNumber(s.avgComments)}
                      </dd>
                    </div>
                  </dl>

                  {s.suspiciousFlags && s.suspiciousFlags.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] font-medium uppercase opacity-70">
                        Flags
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {s.suspiciousFlags.map((f) => (
                          <span
                            key={f}
                            className="rounded bg-black/10 px-2 py-0.5 text-[10px] font-medium dark:bg-white/10"
                            title={f}
                          >
                            {FLAG_LABEL[f] ?? f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {s.lastPostAt && (
                    <p className="mt-3 text-[11px] opacity-70">
                      Last post: {new Date(s.lastPostAt).toLocaleDateString()}
                      {s.scrapedAt && ` · Analyzed ${new Date(s.scrapedAt).toLocaleDateString()}`}
                    </p>
                  )}

                  {s.scrapeData?.recentPosts && s.scrapeData.recentPosts.length > 0 && (
                    <details className="mt-3 text-xs">
                      <summary className="cursor-pointer font-medium opacity-80">
                        View {s.scrapeData.recentPosts.length} recent posts
                      </summary>
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="text-left opacity-70">
                              <th className="pb-1">Date</th>
                              <th className="pb-1 text-right">Likes</th>
                              <th className="pb-1 text-right">Comments</th>
                              <th className="pb-1 text-right">Views</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.scrapeData.recentPosts.map((p, i) => (
                              <tr key={p.id ?? i} className="border-t border-current/10">
                                <td className="py-1">
                                  {p.timestamp ? new Date(p.timestamp).toLocaleDateString() : "—"}
                                </td>
                                <td className="py-1 text-right tabular-nums">
                                  {formatNumber(p.likesCount ?? 0)}
                                </td>
                                <td className="py-1 text-right tabular-nums">
                                  {formatNumber(p.commentsCount ?? 0)}
                                </td>
                                <td className="py-1 text-right tabular-nums">
                                  {formatNumber(p.videoViewCount ?? 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Panel>

      {inf.audienceMetrics && (
        <Panel className="mt-6">
          <SectionTitle title="Audience overview" description="Reported and modelled audience composition." />
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {inf.audienceMetrics.ageDistribution && (
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">Age</p>
                <div className="mt-3 space-y-3">
                  {Object.entries(inf.audienceMetrics.ageDistribution).map(([k, v]) => (
                    <ScoreBar key={k} label={k} value={Number(v)} />
                  ))}
                </div>
              </div>
            )}
            {inf.audienceMetrics.genderDistribution && (
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">Gender</p>
                <div className="mt-3 space-y-3">
                  {Object.entries(inf.audienceMetrics.genderDistribution).map(([k, v]) => (
                    <ScoreBar key={k} label={k} value={Number(v)} />
                  ))}
                </div>
              </div>
            )}
            {inf.audienceMetrics.topCountries && Array.isArray(inf.audienceMetrics.topCountries) && inf.audienceMetrics.topCountries.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">Location</p>
                <div className="mt-3 space-y-3">
                  {inf.audienceMetrics.topCountries.map((c: any, i: number) => (
                    <ScoreBar key={i} label={c.country ?? c.label ?? "—"} value={Number(c.pct ?? c.value ?? 0)} />
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
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="flex items-center gap-4">
                  {s.authenticityScore != null ? (
                    <ScoreCircle percentage={s.authenticityScore} label="Score" />
                  ) : (
                    <div className="flex flex-col items-center justify-center size-14 shrink-0 rounded-full border-2 border-dashed border-muted text-muted-foreground bg-muted/20">
                      <span className="text-[8px] font-semibold">No</span>
                      <span className="text-[8px] font-semibold">Score</span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {s.platform === "OTHER" && s.platformCustom ? s.platformCustom : s.platform} · @{s.handle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(s.followerCount)} followers · {formatEngagement(s.engagementRate)} engagement
                    </p>
                  </div>
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