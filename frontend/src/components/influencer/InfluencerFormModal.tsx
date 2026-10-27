import { useRef, useState } from "react";
import { X, Plus, Trash2, Upload, AlertTriangle, ShieldCheck, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CountryPhoneFields,
  validateCountryPhone,
  type CountryPhoneFieldsValue,
} from "@/components/ui/CountryPhoneFields";
import { swalError } from "@/lib/swal";
import {
  influencersApi,
  INFLUENCER_PLATFORMS,
  INFLUENCER_CATEGORIES,
  AVAILABILITY_OPTIONS,
  GENDER_OPTIONS,
  CURRENCY_OPTIONS,
  PLATFORM_LABELS,
  formatNumber,
  type Influencer,
  type InfluencerInput,
  type InfluencerPlatform,
  type ScrapeResult,
  type EngagementHealth,
  type SuspiciousFlag,
} from "@/lib/influencers";

interface Props {
  mode?: "create" | "edit";
  influencer?: Influencer | null;
  onClose: () => void;
  onSaved: (inf: Influencer) => void;
}

interface SocialAccountDraft {
  platform: InfluencerPlatform | "";
  platformCustom: string;
  handle: string;
  followerCount: number;
  followingCount: number; 
  engagementRate: number;
  isPrimary: boolean;
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  avgLikes: number;
  avgComments: number;
  avgViews: number;
  authenticityScore: number | null;
  engagementHealth: EngagementHealth | null;
  suspiciousFlags: SuspiciousFlag[];
  lastPostAt: string | null;
  scrapedAt: string | null;
  scrapeData: any;
}

function emptySocialDraft(isPrimary: boolean): SocialAccountDraft {
  return {
    platform: "",
    platformCustom: "",
    handle: "",
    followerCount: 0,
    followingCount: 0,
    engagementRate: 0,
    isPrimary,
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
    totalViews: 0,
    avgLikes: 0,
    avgComments: 0,
    avgViews: 0,
    authenticityScore: null,
    engagementHealth: null,
    suspiciousFlags: [],
    lastPostAt: null,
    scrapedAt: null,
    scrapeData: null,
  };
}

const HEALTH_STYLE: Record<EngagementHealth, string> = {
  EXCELLENT: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  GOOD: "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  SUSPICIOUS: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  FAKE: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function InfluencerFormModal({
  mode = "create",
  influencer = null,
  onClose,
  onSaved,
}: Props) {
  const isEdit = mode === "edit";
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<InfluencerInput>(() =>
    influencer
      ? {
          displayName: influencer.displayName,
          username: influencer.username,
          bio: influencer.bio ?? "",
          avatarUrl: influencer.avatarUrl ?? "",
          email: influencer.email ?? "",
          phone: influencer.phone ?? "",
          country: influencer.country ?? "",
          city: influencer.city ?? "",
          language: influencer.language ?? "",
          gender: influencer.gender ?? "",
          ageGroup: influencer.ageGroup ?? "",
          followerCount: influencer.followerCount,
          followingCount: influencer.followingCount,
          engagementRate: influencer.engagementRate,
          categories: influencer.categories,
          audienceFavorites: influencer.audienceFavorites ?? [],
          avgViews: influencer.avgViews,
          avgLikes: influencer.avgLikes,
          avgComments: influencer.avgComments,
          pricePerPost: influencer.pricePerPost,
          currency: influencer.currency,
          availability: influencer.availability,
        }
      : {
          displayName: "",
          username: "",
          bio: "",
          avatarUrl: "",
          email: "",
          phone: "",
          country: "",
          city: "",
          language: "",
          gender: "",
          ageGroup: "",
          followerCount: 0,
          followingCount: 0,
          engagementRate: 0,
          categories: [],
          audienceFavorites: [],
          avgViews: 0,
          avgLikes: 0,
          avgComments: 0,
          pricePerPost: null,
          currency: "USD",
          availability: "AVAILABLE",
        }
  );

  const [geo, setGeo] = useState<CountryPhoneFieldsValue>({
    country: null,
    state: null,
    city: null,
    phone: influencer?.phone || undefined,
  });

  const [socials, setSocials] = useState<SocialAccountDraft[]>(() =>
    influencer?.socialAccounts.map((s) => ({
      platform: s.platform,
      platformCustom: s.platformCustom ?? "",
      handle: s.handle,
      followerCount: s.followerCount,
      followingCount: s.followingCount,
      engagementRate: s.engagementRate,
      isPrimary: s.isPrimary,
      totalPosts: s.totalPosts,
      totalLikes: s.totalLikes,
      totalComments: s.totalComments,
      totalViews: s.totalViews,
      avgLikes: s.avgLikes,
      avgComments: s.avgComments,
      avgViews: s.avgViews,
      authenticityScore: s.authenticityScore,
      engagementHealth: s.engagementHealth,
      suspiciousFlags: s.suspiciousFlags,
      lastPostAt: s.lastPostAt,
      scrapedAt: s.scrapedAt,
      scrapeData: s.scrapeData,
    })) ?? []
  );

  const [favoritesInput, setFavoritesInput] = useState<string>(() =>
    (influencer?.audienceFavorites ?? []).join(", ")
  );

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fetchingIndex, setFetchingIndex] = useState<number | null>(null);
  const [fetchResult, setFetchResult] = useState<string>("");

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Avatar must be JPEG, PNG, or WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Avatar must be under 5 MB");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const res = await influencersApi.uploadAvatar(file);
      setForm((prev) => ({ ...prev, avatarUrl: res.url }));
    } catch (err: any) {
      setError(err?.message || "Avatar upload failed");
    } finally {
      setUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  function toggleCategory(cat: string) {
    setForm((prev) => {
      const list = prev.categories ?? [];
      const has = list.includes(cat);
      return {
        ...prev,
        categories: has ? list.filter((c) => c !== cat) : [...list, cat],
      };
    });
  }

  function addSocial() {
    setSocials((prev) => [...prev, emptySocialDraft(prev.length === 0)]);
  }

  function updateSocial(index: number, patch: Partial<SocialAccountDraft>) {
    setSocials((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removeSocial(index: number) {
    setSocials((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleFetchProfile(index: number) {
    const social = socials[index];
    if (!social.platform || !social.handle.trim()) return;

    setFetchingIndex(index);
    setFetchResult("⏳ Syncing data (may take up to 60s)...");

    try {
      const result: ScrapeResult = await influencersApi.scrapeSocial(
        social.platform,
        social.handle.trim()
      );

      if (!result.found) {
        setFetchResult(`⚠️ ${result.reason || "Account not found."}`);
        return;
      }

      updateSocial(index, {
        handle: result.handle ?? social.handle,
        followerCount: result.followerCount ?? social.followerCount,
        followingCount: result.followingCount ?? social.followingCount,
        engagementRate: result.engagementRate ?? social.engagementRate,
        totalPosts: result.totalPosts ?? social.totalPosts,
        totalLikes: result.totalLikes ?? social.totalLikes,
        totalComments: result.totalComments ?? social.totalComments,
        totalViews: result.totalViews ?? social.totalViews,
        avgLikes: result.avgLikes ?? social.avgLikes,
        avgComments: result.avgComments ?? social.avgComments,
        avgViews: result.avgViews ?? social.avgViews,
        authenticityScore: result.authenticityScore ?? social.authenticityScore,
        engagementHealth: result.engagementHealth ?? social.engagementHealth,
        suspiciousFlags: result.suspiciousFlags ?? social.suspiciousFlags,
        lastPostAt: result.lastPostAt ?? social.lastPostAt,
        scrapedAt: result.scrapedAt ?? new Date().toISOString(),
        scrapeData: { recentPosts: result.recentPosts ?? [] },
      });

      setForm((prev) => {
        const autoUsername = prev.username || (result.handle ? result.handle.toLowerCase().replace(/[^a-z0-9]/g, '') : "");
        
        return {
          ...prev,
          displayName: prev.displayName || result.displayName || prev.displayName,
          username: autoUsername,
          bio: prev.bio || result.bio || prev.bio,
          avatarUrl: prev.avatarUrl || result.avatarUrl || prev.avatarUrl,
          followerCount: result.followerCount ?? prev.followerCount,
          followingCount: result.followingCount ?? prev.followingCount,
          engagementRate: result.engagementRate ?? prev.engagementRate,
          avgLikes: result.avgLikes ?? prev.avgLikes,
          avgComments: result.avgComments ?? prev.avgComments,
          avgViews: result.avgViews ?? prev.avgViews,
        };
      });

      const health = result.engagementHealth;
      if (health === "FAKE" || health === "SUSPICIOUS") {
        setFetchResult(`⚠️ Synced! But ${health} engagement detected (Score: ${result.authenticityScore}/100)`);
      } else {
        setFetchResult(` Success! Profile synced. Authenticity Score: ${result.authenticityScore}/100`);
      }

    } catch (err: any) {
      setFetchResult(`❌ Error: ${err?.message || "Scraper failed"}`);
    } finally {
      setFetchingIndex(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.displayName.trim()) return setError("Display name is required");
    if (!form.username.trim()) return setError("Username is required");

    const geoErr = validateCountryPhone(geo, { requireStateCity: false });
    if (geoErr) {
      setError(geoErr);
      swalError("Check your details", geoErr);
      return;
    }

    for (const s of socials) {
      if (!s.platform) return setError("Please select a platform for each social account");
      if (s.platform === "OTHER" && !s.platformCustom.trim())
        return setError("Please specify the custom platform name");
      if (!s.handle.trim()) return setError("Please enter a handle for each social account");
    }

    const audienceFavorites = favoritesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      const payload: InfluencerInput = {
        ...form,
        phone: geo.phone!,
        country: geo.country?.name,
        city: geo.city?.name ?? form.city,
        audienceFavorites,
        socialAccounts: socials.map((s) => ({
          platform: s.platform as InfluencerPlatform,
          platformCustom: s.platform === "OTHER" ? s.platformCustom.trim() : undefined,
          handle: s.handle.trim(),
          followerCount: s.followerCount,
          followingCount: s.followingCount,
          engagementRate: s.engagementRate,
          isPrimary: s.isPrimary,
          totalPosts: s.totalPosts,
          totalLikes: s.totalLikes,
          totalComments: s.totalComments,
          totalViews: s.totalViews,
          avgLikes: s.avgLikes,
          avgComments: s.avgComments,
          avgViews: s.avgViews,
          authenticityScore: s.authenticityScore,
          engagementHealth: s.engagementHealth,
          suspiciousFlags: s.suspiciousFlags,
          lastPostAt: s.lastPostAt,
          scrapedAt: s.scrapedAt,
          scrapeData: s.scrapeData,
        })),
      };

      const res =
        isEdit && influencer
          ? await influencersApi.update(influencer.id, payload)
          : await influencersApi.create(payload);

      onSaved(res.influencer);
    } catch (err: any) {
      setError(err?.message || "Failed to save");
      setSaving(false);
    }
  }

  return (
    <div className="ui-overlay">
      <form
        onSubmit={handleSubmit}
        className="ui-panel ui-panel-xl flex max-h-[calc(100vh-7rem)] flex-col"
      >
        <div className="ui-panel-header flex-shrink-0">
          <div>
            <h2 className="font-display text-xl font-medium">
              {isEdit ? "Edit Creator Profile" : "Setup Creator Profile"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Paste your social handle and click <strong>Fetch</strong> to auto-fill everything dynamically.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={saving}>
            <X />
          </Button>
        </div>

        <div className="modal-scroll min-h-0 flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {error && <div className="ui-error">{error}</div>}

            <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-sm font-semibold text-accent flex items-center gap-1.5">
                    <Sparkles className="size-4" /> 1. Sync Social Account
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Fetch stats, bio, and authenticity automatically.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addSocial} className="bg-background">
                  <Plus className="mr-1 size-3.5" /> Add Platform
                </Button>
              </div>

              <div className="space-y-3">
                {socials.map((s, i) => (
                  <div key={i} className="space-y-3 rounded-lg border border-border bg-background p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <select
                        value={s.platform}
                        onChange={(e) =>
                          updateSocial(i, {
                            platform: e.target.value as InfluencerPlatform | "",
                            platformCustom: e.target.value !== "OTHER" ? "" : s.platformCustom,
                          })
                        }
                        className="w-[130px] rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none"
                      >
                        <option value="">Platform…</option>
                        {INFLUENCER_PLATFORMS.map((p) => (
                          <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                        ))}
                      </select>
                      
                      {s.platform === "OTHER" && (
                        <Input
                          placeholder="Name"
                          value={s.platformCustom}
                          onChange={(e) => updateSocial(i, { platformCustom: e.target.value })}
                          className="w-[100px]"
                        />
                      )}

                      <Input
                        placeholder="@handle or profile URL"
                        value={s.handle}
                        onChange={(e) => updateSocial(i, { handle: e.target.value })}
                        className="flex-1"
                      />
                      
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        disabled={!s.platform || !s.handle.trim() || fetchingIndex === i}
                        onClick={() => handleFetchProfile(i)}
                        className="shrink-0 bg-accent text-background hover:bg-accent/90"
                      >
                        {fetchingIndex === i ? (
                          <><Loader2 className="mr-1.5 size-3.5 animate-spin" /> Syncing...</>
                        ) : (
                          "Fetch"
                        )}
                      </Button>
                      
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeSocial(i)} className="text-destructive shrink-0">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Input
                          type="number"
                          min={0}
                          placeholder="Followers"
                          value={s.followerCount}
                          onChange={(e) => updateSocial(i, { followerCount: Number(e.target.value) })}
                        />
                        <p className="text-[10px] text-muted-foreground px-1">({formatNumber(s.followerCount)})</p>
                      </div>
                      <div className="space-y-1">
                        <Input
                          type="number"
                          step="0.001"
                          min={0}
                          max={1}
                          placeholder="Engagement (0-1)"
                          value={s.engagementRate}
                          onChange={(e) => updateSocial(i, { engagementRate: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Input
                          type="number"
                          min={0}
                          placeholder="Total posts"
                          value={s.totalPosts}
                          onChange={(e) => updateSocial(i, { totalPosts: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    {s.authenticityScore != null && s.engagementHealth && (
                      <div className={`mt-2 rounded-md border p-3 text-xs ${HEALTH_STYLE[s.engagementHealth]}`}>
                        <div className="flex items-center gap-2 font-medium">
                          {s.engagementHealth === "EXCELLENT" || s.engagementHealth === "GOOD" ? (
                            <ShieldCheck className="size-4" />
                          ) : (
                            <AlertTriangle className="size-4" />
                          )}
                          <span>
                            Authenticity Score: {s.authenticityScore}/100 ({s.engagementHealth})
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 opacity-90">
                          <div><strong className="block text-foreground">{formatNumber(s.followerCount)}</strong> Followers</div>
                          <div><strong className="block text-foreground">{formatNumber(s.avgLikes)}</strong> Avg Likes</div>
                          <div><strong className="block text-foreground">{formatNumber(s.totalPosts)}</strong> Total Posts</div>
                          <div><strong className="block text-foreground">{(s.engagementRate * 100).toFixed(2)}%</strong> Engagement</div>
                        </div>
                        {s.suspiciousFlags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {s.suspiciousFlags.map((f) => (
                              <span key={f} className="rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-mono dark:bg-white/10">
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="radio"
                        name="primarySocial"
                        checked={s.isPrimary}
                        onChange={() =>
                          setSocials((prev) =>
                            prev.map((x, idx) => ({ ...x, isPrimary: idx === i }))
                          )
                        }
                      />
                      Set as primary account
                    </label>
                  </div>
                ))}
              </div>

              {fetchResult && (
                <p className={`mt-3 text-xs font-medium ${fetchResult.startsWith("") ? "text-emerald-500" : fetchResult.startsWith("⏳") ? "text-blue-500" : "text-amber-500"}`}>
                  {fetchResult}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-semibold text-muted-foreground">2. Profile Details</Label>
              
              <div className="flex items-center gap-4">
                {form.avatarUrl ? (
                  <img src={form.avatarUrl} alt="Avatar" className="size-20 rounded-full border border-border object-cover" />
                ) : (
                  <div className="grid size-20 place-items-center rounded-full border border-dashed border-border text-xs text-muted-foreground">No Photo</div>
                )}
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">
                    Photo auto-syncs from platform. You can override it if needed.
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()} disabled={uploading} className="mt-2">
                    <Upload className="mr-1.5 size-3.5" /> {uploading ? "Uploading…" : "Upload Custom Photo"}
                  </Button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input id="displayName" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Auto-filled" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Auto-generated" disabled={isEdit} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  value={form.bio ?? ""}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={3}
                  placeholder="Auto-filled bio from platform..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>

              <CountryPhoneFields value={geo} onChange={setGeo} disabled={saving} showStateCity={true} required />

              <div className="space-y-2">
                <Label>Language</Label>
                <Input value={form.language ?? ""} onChange={(e) => setForm({ ...form, language: e.target.value })} placeholder="English, Urdu" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <select value={form.gender ?? ""} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
                    <option value="">—</option>
                    {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Age group</Label>
                  <Input value={form.ageGroup ?? ""} onChange={(e) => setForm({ ...form, ageGroup: e.target.value })} placeholder="e.g. 25-34" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>Follower count</Label>
                  <Input type="number" min={0} value={form.followerCount ?? 0} onChange={(e) => setForm({ ...form, followerCount: Number(e.target.value) })} />
                  <p className="text-[10px] text-muted-foreground px-1">({formatNumber(form.followerCount)})</p>
                </div>
                <div className="space-y-1">
                  <Label>Following count</Label>
                  <Input type="number" min={0} value={form.followingCount ?? 0} onChange={(e) => setForm({ ...form, followingCount: Number(e.target.value) })} />
                  <p className="text-[10px] text-muted-foreground px-1">({formatNumber(form.followingCount)})</p>
                </div>
                <div className="space-y-1">
                  <Label>Engagement rate (0-1)</Label>
                  <Input type="number" step="0.001" min={0} max={1} value={form.engagementRate ?? 0} onChange={(e) => setForm({ ...form, engagementRate: Number(e.target.value) })} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-semibold text-muted-foreground">3. Commercial Details</Label>
              
              <div className="space-y-2">
                <Label>Niche / Categories</Label>
                <div className="flex flex-wrap gap-2">
                  {INFLUENCER_CATEGORIES.map((cat) => {
                    const active = form.categories?.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={active ? "rounded-full bg-accent px-3 py-1 text-xs font-medium text-background" : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Audience favorites</Label>
                <Input value={favoritesInput} onChange={(e) => setFavoritesInput(e.target.value)} placeholder="Shahid Afridi, Sara Khan, Mr. Bean" />
                <p className="text-[10px] text-muted-foreground">Separate names with commas</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Price per post</Label>
                  <Input type="number" min={0} step="0.01" value={form.pricePerPost ?? ""} onChange={(e) => setForm({ ...form, pricePerPost: e.target.value === "" ? null : Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <select value={form.currency ?? "USD"} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
                    {CURRENCY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Availability</Label>
                <select value={form.availability ?? "AVAILABLE"} onChange={(e) => setForm({ ...form, availability: e.target.value as any })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
                  {AVAILABILITY_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="ui-panel-footer flex-shrink-0 bg-card">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving || uploading}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || uploading || socials.length === 0}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}