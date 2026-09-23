import { Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck } from "lucide-react";
import {
  formatFollowers,
  formatEngagement,
  type Influencer,
} from "@/lib/influencers";

interface Props {
  influencer: Influencer;
  canSave: boolean;
  onToggleSave: (inf: Influencer) => void;
}

export function InfluencerCard({
  influencer: inf,
  canSave,
  onToggleSave,
}: Props) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lift">
      <Link
        to="/influencers/$slug"
        params={{ slug: inf.slug }}
        className="block"
      >
        <div className="relative aspect-square overflow-hidden bg-muted/30">
          {inf.avatarUrl ? (
            <img
              src={inf.avatarUrl}
              alt={inf.displayName}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid h-full w-full place-items-center font-display text-4xl font-medium text-muted-foreground">
              {inf.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          {!inf.profileCompleted && (
            <span className="absolute left-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-medium text-white">
              Incomplete
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link
              to="/influencers/$slug"
              params={{ slug: inf.slug }}
              className="block truncate font-display text-base font-medium hover:underline"
            >
              {inf.displayName}
            </Link>
            <p className="truncate text-xs text-muted-foreground">
              @{inf.username}
              {inf.country ? ` · ${inf.country}` : ""}
            </p>
          </div>

          {canSave && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onToggleSave(inf);
              }}
              className="grid size-7 shrink-0 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground"
              aria-label={inf.isSaved ? "Unsave" : "Save"}
            >
              {inf.isSaved ? (
                <BookmarkCheck className="size-3.5 text-accent" />
              ) : (
                <Bookmark className="size-3.5" />
              )}
            </button>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
          <div>
            <dt className="text-muted-foreground">Followers</dt>
            <dd className="font-medium tabular-nums">
              {formatFollowers(inf.followerCount)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Engagement</dt>
            <dd className="font-medium tabular-nums">
              {formatEngagement(inf.engagementRate)}
            </dd>
          </div>
        </dl>

        {inf.categories.length > 0 && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {inf.categories.join(" · ")}
          </p>
        )}
      </div>
    </article>
  );
}