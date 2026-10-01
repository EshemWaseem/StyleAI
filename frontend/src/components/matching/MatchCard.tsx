// components/matching/MatchCard.tsx
import { Link } from "@tanstack/react-router";
import { MapPin, Users, TrendingUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MatchScoreRing } from "./MatchScoreRing";
import { cn } from "@/lib/utils";
import type { MatchedInfluencer } from "@/lib/matching";

interface Props {
  match: MatchedInfluencer;
  rank?: number;
}

export function MatchCard({ match, rank }: Props) {
  const { influencer: inf, score, breakdown, reasons } = match;

  function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-start gap-4 p-4">
        <MatchScoreRing score={score} />

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
            {rank ? `#${rank}` : "Match"}
          </p>

          <div className="mt-1 flex items-center gap-2">
            {inf.avatarUrl ? (
              <img src={inf.avatarUrl} alt="" className="size-8 rounded-full object-cover" />
            ) : (
              <div className="grid size-8 place-items-center rounded-full bg-accent/15 text-xs font-medium text-accent">
                {inf.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium">{inf.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">@{inf.username}</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3" /> {fmt(inf.followerCount)}
            </span>
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="size-3" /> {(inf.engagementRate * 100).toFixed(2)}%
            </span>
            {inf.country && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" /> {inf.country}
              </span>
            )}
            {inf.pricePerPost != null && (
              <span className="font-medium tabular-nums text-foreground">
                from {inf.currency} {inf.pricePerPost}
              </span>
            )}
          </div>

          {inf.categories.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {inf.categories.slice(0, 4).map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase text-accent"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Breakdown bar */}
      <div className="grid grid-cols-5 gap-px border-t border-border bg-border">
        <BreakdownCell label="Category" value={breakdown.category} />
        <BreakdownCell label="Niche" value={breakdown.niche} />
        <BreakdownCell label="Engage" value={breakdown.engagement} />
        <BreakdownCell label="Audience" value={breakdown.audience} />
        <BreakdownCell label="Price" value={breakdown.price} />
      </div>

      {/* Reasons */}
      {reasons.length > 0 && (
        <div className="border-t border-border bg-muted/20 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Why this match
          </p>
          {match.verdict && (
            <p className="mb-1.5 mt-1 text-xs font-medium italic text-foreground">
              "{match.verdict}"
            </p>
          )}
          <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
            {reasons.slice(0, 4).map((r, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="mt-1 size-1 shrink-0 rounded-full bg-accent" />
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 border-t border-border p-3">
        <Button asChild variant="outline" size="sm">
          <Link to="/influencers/$slug" params={{ slug: inf.slug }} target="_blank">
            View profile <ExternalLink className="ml-1 size-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function BreakdownCell({ label, value }: { label: string; value: number }) {
  const tone =
    value >= 80 ? "text-emerald-500"
    : value >= 60 ? "text-blue-500"
    : value >= 40 ? "text-amber-500"
    : "text-muted-foreground";

  return (
    <div className="bg-card p-2.5 text-center">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-0.5 font-display text-base font-medium tabular-nums", tone)}>
        {value}
      </p>
    </div>
  );
}