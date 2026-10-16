// components/influencer/InfluencerFormModal.tsx
import { useRef, useState } from "react";
import { X, Plus, Trash2, Upload } from "lucide-react";
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
  type Influencer,
  type InfluencerInput,
  type InfluencerPlatform,
  type ScrapeResult,
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
  engagementRate: number;
  isPrimary: boolean;
}

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

  const [socials, setSocials] = useState<SocialAccountDraft[]>(
    () =>
      influencer?.socialAccounts.map((s) => ({
        platform: s.platform,
        platformCustom: s.platformCustom ?? "",
        handle: s.handle,
        followerCount: s.followerCount,
        engagementRate: s.engagementRate,
        isPrimary: s.isPrimary,
      })) ?? []
  );

  const [favoritesInput, setFavoritesInput] = useState<string>(() =>
    (influencer?.audienceFavorites ?? []).join(", ")
  );

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ---- Apify fetch state ----
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
    setSocials((prev) => [
      ...prev,
      {
        platform: "",
        platformCustom: "",
        handle: "",
        followerCount: 0,
        engagementRate: 0,
        isPrimary: prev.length === 0,
      },
    ]);
  }

  function updateSocial(index: number, patch: Partial<SocialAccountDraft>) {
    setSocials((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removeSocial(index: number) {
    setSocials((prev) => prev.filter((_, i) => i !== index));
  }

  // ======================================================
  // Apify: fetch profile data for a social row
  // ======================================================
  async function handleFetchProfile(index: number) {
    const social = socials[index];
    if (!social.platform || !social.handle.trim()) return;

    setFetchingIndex(index);
    setFetchResult("");

    try {
      const result: ScrapeResult = await influencersApi.scrapeSocial(
        social.platform,
        social.handle.trim()
      );

      if (!result.found) {
        setFetchResult(
          `⚠️ ${result.reason || "Account not found. Please fill manually."}`
        );
        return;
      }

      // ── Auto-fill the social account row ──
      updateSocial(index, {
        followerCount: result.followerCount ?? social.followerCount,
        engagementRate: result.engagementRate ?? social.engagementRate,
        handle: result.handle ?? social.handle,
      });

      // ── Auto-fill top-level fields (only if empty) ──
      setForm((prev) => ({
        ...prev,
        displayName: prev.displayName || result.displayName || prev.displayName,
        bio: prev.bio || result.bio || prev.bio,
        avatarUrl: prev.avatarUrl || result.avatarUrl || prev.avatarUrl,
        followerCount: result.followerCount ?? prev.followerCount,
        followingCount: result.followingCount ?? prev.followingCount,
        engagementRate: result.engagementRate ?? prev.engagementRate,
        avgLikes: result.avgLikes ?? prev.avgLikes,
        avgComments: result.avgComments ?? prev.avgComments,
      }));

      setFetchResult(`✅ Data fetched from ${social.platform.toLowerCase()}!`);
    } catch {
      setFetchResult("❌ Scraper error. Please fill manually.");
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
        country: geo.country!.name,
        city: geo.city?.name ?? form.city,
        audienceFavorites,
        socialAccounts: socials.map((s) => ({
          platform: s.platform as InfluencerPlatform,
          platformCustom: s.platform === "OTHER" ? s.platformCustom.trim() : undefined,
          handle: s.handle.trim(),
          followerCount: s.followerCount,
          engagementRate: s.engagementRate,
          isPrimary: s.isPrimary,
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
        {/* ============ HEADER ============ */}
        <div className="ui-panel-header flex-shrink-0">
          <h2 className="font-display text-xl font-medium">
            {isEdit ? "Edit influencer" : "Add influencer"}
          </h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={saving}>
            <X />
          </Button>
        </div>

        {/* ============ BODY ============ */}
        <div className="modal-scroll min-h-0 flex-1 overflow-y-auto p-6">
          <div className="space-y-5">
            {error && <div className="ui-error">{error}</div>}

            {/* Avatar */}
            <div className="space-y-2">
              <Label>Profile photo</Label>
              <div className="flex items-center gap-4">
                {form.avatarUrl ? (
                  <img
                    src={form.avatarUrl}
                    alt="Avatar preview"
                    className="size-20 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="grid size-20 place-items-center rounded-full border border-dashed border-border text-xs text-muted-foreground">
                    No photo
                  </div>
                )}
                <div className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="mr-1.5 size-3.5" />
                    {uploading ? "Uploading…" : form.avatarUrl ? "Change photo" : "Upload photo"}
                  </Button>
                  {form.avatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-2 text-destructive"
                      onClick={() => setForm({ ...form, avatarUrl: "" })}
                    >
                      Remove
                    </Button>
                  )}
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    JPEG, PNG, or WebP · Max 5 MB
                  </p>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarPick}
                />
              </div>
            </div>

            {/* Name + username */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name *</Label>
                <Input
                  id="displayName"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="Maya Khan"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="mayakhan"
                  required
                  disabled={isEdit}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                value={form.bio ?? ""}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={3}
                placeholder="Fashion & lifestyle creator based in Karachi…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            {/* Country + Phone + State + City */}
            <CountryPhoneFields
              value={geo}
              onChange={setGeo}
              disabled={saving || uploading}
              showStateCity={true}
              required
            />

            {/* Language */}
            <div className="space-y-2">
              <Label>Language</Label>
              <Input
                value={form.language ?? ""}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                placeholder="English, Urdu"
              />
            </div>

            {/* Demographics */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Gender</Label>
                <select
                  value={form.gender ?? ""}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">—</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Age group</Label>
                <Input
                  value={form.ageGroup ?? ""}
                  onChange={(e) => setForm({ ...form, ageGroup: e.target.value })}
                  placeholder="e.g. 25-34"
                />
              </div>
            </div>

            {/* Reach */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Follower count</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.followerCount ?? 0}
                  onChange={(e) => setForm({ ...form, followerCount: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Following count</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.followingCount ?? 0}
                  onChange={(e) => setForm({ ...form, followingCount: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Engagement rate (0-1)</Label>
                <Input
                  type="number"
                  step="0.001"
                  min={0}
                  max={1}
                  value={form.engagementRate ?? 0}
                  onChange={(e) => setForm({ ...form, engagementRate: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Categories */}
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
                      className={
                        active
                          ? "rounded-full bg-accent px-3 py-1 text-xs font-medium text-background"
                          : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                      }
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audience favorites */}
            <div className="space-y-2">
              <Label>Audience favorites</Label>
              <Input
                value={favoritesInput}
                onChange={(e) => setFavoritesInput(e.target.value)}
                placeholder="Shahid Afridi, Sara Khan, Mr. Bean"
              />
              <p className="text-[10px] text-muted-foreground">Separate names with commas</p>
            </div>

            {/* Pricing */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Price per post</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.pricePerPost ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      pricePerPost: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <select
                  value={form.currency ?? "USD"}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Availability */}
            <div className="space-y-2">
              <Label>Availability</Label>
              <select
                value={form.availability ?? "AVAILABLE"}
                onChange={(e) => setForm({ ...form, availability: e.target.value as any })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {AVAILABILITY_OPTIONS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {/* ============ Social accounts ============ */}
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Social accounts</Label>
                  <p className="text-xs text-muted-foreground">
                    Paste an @handle or profile URL, then click <strong>Fetch</strong> to auto-fill stats.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addSocial}>
                  <Plus /> Add
                </Button>
              </div>

              <div className="mt-2 space-y-3">
                {socials.map((s, i) => (
                  <div key={i} className="space-y-2 rounded-lg border border-border p-3">
                    {/* Row 1: platform + custom + remove */}
                    <div className="flex items-center gap-2">
                      <select
                        value={s.platform}
                        onChange={(e) =>
                          updateSocial(i, {
                            platform: e.target.value as InfluencerPlatform | "",
                            platformCustom: e.target.value !== "OTHER" ? "" : s.platformCustom,
                          })
                        }
                        className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none"
                      >
                        <option value="">Select platform…</option>
                        {INFLUENCER_PLATFORMS.map((p) => (
                          <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                        ))}
                      </select>
                      {s.platform === "OTHER" && (
                        <Input
                          placeholder="Platform name"
                          value={s.platformCustom}
                          onChange={(e) => updateSocial(i, { platformCustom: e.target.value })}
                          className="flex-1"
                        />
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSocial(i)}
                        className="text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    {/* Row 2: handle + Fetch button */}
                    <div className="flex gap-1.5">
                      <Input
                        placeholder="@handle or profile URL"
                        value={s.handle}
                        onChange={(e) => updateSocial(i, { handle: e.target.value })}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          !s.platform ||
                          !s.handle.trim() ||
                          fetchingIndex === i
                        }
                        onClick={() => handleFetchProfile(i)}
                        className="shrink-0 text-xs"
                        title="Auto-fetch stats from Apify"
                      >
                        {fetchingIndex === i ? (
                          <span className="animate-pulse">…</span>
                        ) : (
                          "Fetch"
                        )}
                      </Button>
                    </div>

                    {/* Row 3: follower + engagement (auto-filled) */}
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Input
                        type="number"
                        min={0}
                        placeholder="Followers"
                        value={s.followerCount}
                        onChange={(e) => updateSocial(i, { followerCount: Number(e.target.value) })}
                      />
                      <Input
                        type="number"
                        step="0.001"
                        min={0}
                        max={1}
                        placeholder="Engagement (0-1)"
                        value={s.engagementRate}
                        onChange={(e) => updateSocial(i, { engagementRate: Number(e.target.value) })}
                      />
                      <div />
                    </div>
                  </div>
                ))}

                {socials.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No social accounts added yet. Click "Add" to start.
                  </p>
                )}

                {/* Fetch status message */}
                {fetchResult && (
                  <p
                    className={`mt-1 text-xs ${
                      fetchResult.startsWith("✅")
                        ? "text-green-600"
                        : "text-amber-600"
                    }`}
                  >
                    {fetchResult}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ============ FOOTER ============ */}
        <div className="ui-panel-footer flex-shrink-0 bg-card">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving || uploading}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || uploading}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add influencer"}
          </Button>
        </div>
      </form>
    </div>
  );
}