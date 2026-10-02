// components/offers/InfluencerPicker.tsx
import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, SectionTitle } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import { influencersApi, type Influencer } from "@/lib/influencers";

interface Props {
  onSelect: (influencerId: string, influencer: Influencer) => void;
  onCancel?: () => void;
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function InfluencerPicker({ onSelect, onCancel }: Props) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Load influencers (with optional search)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    influencersApi
      .list({ limit: 60 })
      .then((res) => {
        if (cancelled) return;
        setInfluencers(res.influencers || []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || "Failed to load influencers");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Client-side filter for smooth UX (server already sent 60)
  const filtered = useMemo(() => {
    const q = debounced.toLowerCase();
    if (!q) return influencers;
    return influencers.filter((inf) => {
      const name = (inf.displayName || "").toLowerCase();
      const user = (inf.username || "").toLowerCase();
      const cats = (inf.categories || []).join(" ").toLowerCase();
      return name.includes(q) || user.includes(q) || cats.includes(q);
    });
  }, [influencers, debounced]);

  return (
    <Panel className="mt-8 p-6">
      <SectionTitle
        title="Choose an influencer"
        description="Search by name, username, or category. Then configure your offer."
        action={
          onCancel ? (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="mr-1 size-3.5" /> Cancel
            </Button>
          ) : null
        }
      />

      {/* Search bar */}
      <div className="mt-4 flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
        <Search className="size-4 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search influencers…"
          className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Results */}
      <div className="mt-5 max-h-[520px] overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="mr-2 size-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading influencers…</span>
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Users className="size-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No influencers found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {debounced
                ? `No match for "${debounced}". Try another search.`
                : "No active influencers yet."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((inf) => (
              <button
                key={inf.id}
                type="button"
                onClick={() => onSelect(inf.id, inf)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors",
                  "hover:border-accent/60 hover:bg-accent/5"
                )}
              >
                {inf.avatarUrl ? (
                  <img
                    src={inf.avatarUrl}
                    alt={inf.displayName}
                    className="size-12 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="grid size-12 shrink-0 place-items-center rounded-full bg-accent/15 text-sm font-medium text-accent">
                    {inf.displayName?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{inf.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    @{inf.username}
                    {inf.country ? ` · ${inf.country}` : ""}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="tabular-nums">
                      {formatFollowers(inf.followerCount)} followers
                    </span>
                    <span className="tabular-nums text-accent">
                      {(inf.engagementRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  {inf.categories?.length > 0 && (
                    <p className="mt-1 line-clamp-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {inf.categories.slice(0, 3).join(" · ")}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          Showing {filtered.length} of {influencers.length} influencers
        </p>
      )}
    </Panel>
  );
}