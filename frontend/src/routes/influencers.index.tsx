// routes/influencers.index.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Plus, AlertCircle, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/ui-kit";
import { useRole } from "@/lib/role";
import {
  influencersApi,
  type Influencer,
  type InfluencerPlatform,
} from "@/lib/influencers";
import { InfluencerCard } from "@/components/influencer/InfluencerCard";
import { FilterPanel } from "@/components/influencer/FilterPanel";
import { InfluencerFormModal } from "@/components/influencer/InfluencerFormModal";

export const Route = createFileRoute("/influencers/")({
  head: () => ({
    meta: [
      { title: "Discover influencers — StyleAI" },
      {
        name: "description",
        content: "Search fashion creators by platform, niche, audience, and engagement.",
      },
    ],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const { user, loading: authLoading } = useRole();
  const navigate = useNavigate();

  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [profileChecked, setProfileChecked] = useState(false);

  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<InfluencerPlatform | "">("");
  const [category, setCategory] = useState("");
  const [minFollowers, setMinFollowers] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const userRoles = user?.roles ?? [];
  const isInfluencer = userRoles.includes("INFLUENCER");
  const isSuperAdmin = userRoles.includes("SUPER_ADMIN");
  const isBrandOwner = userRoles.includes("BRAND_OWNER");
  const isBrandTeamMember = userRoles.includes("BRAND_TEAM_MEMBER");
  const isBrandSide = isBrandOwner || isBrandTeamMember;
  const isAgency = userRoles.includes("AGENCY");

  // ✅ FIX: Can browse = any of these roles OR has permission
  const canBrowse =
    isSuperAdmin ||
    isBrandSide ||
    isAgency ||
    isInfluencer ||
    !!user?.permissions?.includes("influencer.read");

  const canSeeAddButton = isInfluencer || isSuperAdmin;

  useEffect(() => {
    if (authLoading || !user) return;
    if (!isInfluencer) {
      setProfileChecked(true);
      return;
    }

    let cancelled = false;
    influencersApi
      .getMe()
      .then(() => { if (!cancelled) setHasProfile(true); })
      .catch(() => { if (!cancelled) setHasProfile(false); })
      .finally(() => { if (!cancelled) setProfileChecked(true); });

    return () => { cancelled = true; };
  }, [authLoading, user, isInfluencer]);

  const showAddButton =
    canSeeAddButton &&
    profileChecked &&
    (isSuperAdmin || (isInfluencer && hasProfile === false));

  const canSave = !!user?.permissions?.includes("influencer.save");

  // ✅ FIX: Only redirect if can't browse at all
  useEffect(() => {
    if (authLoading || !user) return;
    if (user.pendingApproval) {
      navigate({ to: "/pending" });
      return;
    }
    if (!canBrowse) {
      navigate({ to: "/dashboard" });
    }
  }, [authLoading, user, navigate, canBrowse]);

  useEffect(() => {
    if (authLoading || !user || user.pendingApproval) return;
    if (!canBrowse) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, platform, category, minFollowers, savedOnly, canBrowse]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await influencersApi.list({
        q: search || undefined,
        platform: platform || undefined,
        categories: category || undefined,
        minFollowers: minFollowers ? Number(minFollowers) : undefined,
        saved: savedOnly ? "true" : undefined,
        limit: 60,
      });
      setInfluencers(res.influencers);
    } catch (err: any) {
      setError(err?.message || "Could not load influencers.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleSave(inf: Influencer) {
    if (!canSave) return;
    try {
      if (inf.isSaved) {
        await influencersApi.unsave(inf.id);
        setInfluencers((prev) =>
          prev.map((i) => (i.id === inf.id ? { ...i, isSaved: false } : i))
        );
      } else {
        await influencersApi.save(inf.id);
        setInfluencers((prev) =>
          prev.map((i) => (i.id === inf.id ? { ...i, isSaved: true } : i))
        );
      }
    } catch (err: any) {
      alert(err?.message || "Action failed");
    }
  }

  const activeFilterCount = useMemo(
    () =>
      [platform, category, minFollowers, savedOnly ? "s" : ""].filter(Boolean).length,
    [platform, category, minFollowers, savedOnly]
  );

  if (authLoading || (!user && loading)) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!user || user.pendingApproval) return null;

  const emptyStateDescription = showAddButton
    ? "Add your profile to get discovered by brands, or adjust your filters."
    : isBrandSide || isAgency
    ? "Adjust your filters or check back later."
    : isInfluencer
    ? "Adjust your filters or explore other creators."
    : "Adjust your filters or check back later.";

  return (
    <>
      <PageHeader
        eyebrow="Influencer intelligence"
        title="Discover creators"
        description="Search fashion, beauty and lifestyle creators by platform, niche, audience, and engagement."
        actions={
          showAddButton ? (
            <Button onClick={() => setShowCreate(true)}>
              <Plus /> Add influencer
            </Button>
          ) : null
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="flex w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm sm:w-96">
          <Search className="size-4 text-muted-foreground" />
          <input
            aria-label="Search influencers"
            placeholder="Search by name, username, bio…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          Search
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowFilters((s) => !s)}>
          <SlidersHorizontal /> Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 rounded-full bg-accent px-1.5 text-[10px] text-background">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {showFilters && (
        <FilterPanel
          platform={platform}
          setPlatform={setPlatform}
          category={category}
          setCategory={setCategory}
          minFollowers={minFollowers}
          setMinFollowers={setMinFollowers}
          savedOnly={savedOnly}
          setSavedOnly={setSavedOnly}
        />
      )}

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading creators…</p>
      ) : influencers.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No creators yet"
            description={emptyStateDescription}
            action={
              showAddButton ? (
                <Button onClick={() => setShowCreate(true)}>
                  <Plus /> Add influencer
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
        <>
          <p className="mt-6 text-xs text-muted-foreground">
            {influencers.length} creator{influencers.length === 1 ? "" : "s"}
          </p>
          <section className="mt-3 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {influencers.map((inf) => (
              <InfluencerCard
                key={inf.id}
                influencer={inf}
                canSave={canSave}
                onToggleSave={toggleSave}
              />
            ))}
          </section>
        </>
      )}

      {showCreate && showAddButton && (
        <InfluencerFormModal
          onClose={() => setShowCreate(false)}
          onSaved={(inf) => {
            setInfluencers((prev) => [inf, ...prev]);
            setShowCreate(false);
            setHasProfile(true);
          }}
        />
      )}
    </>
  );
}