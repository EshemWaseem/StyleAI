import {
  INFLUENCER_PLATFORMS,
  INFLUENCER_CATEGORIES,
  type InfluencerPlatform,
} from "@/lib/influencers";

interface Props {
  platform: InfluencerPlatform | "";
  setPlatform: (v: InfluencerPlatform | "") => void;
  category: string;
  setCategory: (v: string) => void;
  minFollowers: string;
  setMinFollowers: (v: string) => void;
  savedOnly: boolean;
  setSavedOnly: (v: boolean) => void;
}

export function FilterPanel({
  platform,
  setPlatform,
  category,
  setCategory,
  minFollowers,
  setMinFollowers,
  savedOnly,
  setSavedOnly,
}: Props) {
  return (
    <div className="mt-4 grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Platform
        </label>
        <select
          value={platform}
          onChange={(e) =>
            setPlatform(e.target.value as InfluencerPlatform | "")
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Any</option>
          {INFLUENCER_PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Any</option>
          {INFLUENCER_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Min followers
        </label>
        <input
          type="number"
          min={0}
          value={minFollowers}
          onChange={(e) => setMinFollowers(e.target.value)}
          placeholder="e.g. 10000"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Saved only
        </label>
        <label className="flex items-center gap-2 pt-1 text-sm">
          <input
            type="checkbox"
            checked={savedOnly}
            onChange={(e) => setSavedOnly(e.target.checked)}
            className="size-4"
          />
          My saved list
        </label>
      </div>
    </div>
  );
}