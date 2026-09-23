import { useRef, useState } from "react";
import { X, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.displayName.trim()) return setError("Display name is required");
    if (!form.username.trim()) return setError("Username is required");

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60">
      <div
        className="flex min-h-full items-start justify-center p-4 pt-20"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !saving) onClose();
        }}
      >
        <form
          onSubmit={handleSubmit}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex max-h-[calc(100vh-7rem)] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl"
        >
          {/* HEADER */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-display text-xl font-medium">
              {isEdit ? "Edit influencer" : "Add influencer"}
            </h2>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={saving}>
              <X />
            </Button>
          </div>

          {/* BODY */}
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="space-y-5">
              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}

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

              {/* Bio */}
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

              {/* Contact */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email ?? ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone ?? ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input
                    value={form.country ?? ""}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={form.city ?? ""}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Input
                    value={form.language ?? ""}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                  />
                </div>
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
                    max={2147483647}
                    value={form.followerCount ?? 0}
                    onChange={(e) => setForm({ ...form, followerCount: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Following count</Label>
                  <Input
                    type="number"
                    min={0}
                    max={2147483647}
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
                <p className="text-xs text-muted-foreground">
                  What type of products do you create content for?
                </p>
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
                <p className="text-xs text-muted-foreground">
                  Your audience's favorite celebrities or personalities. Example: "Shahid Afridi, Sara Khan"
                </p>
                <Input
                  value={favoritesInput}
                  onChange={(e) => setFavoritesInput(e.target.value)}
                  placeholder="Shahid Afridi, Sara Khan, Mr. Bean"
                />
                <p className="text-[10px] text-muted-foreground">
                  Separate multiple names with commas
                </p>
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

              {/* Social accounts */}
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Social accounts</Label>
                    <p className="text-xs text-muted-foreground">
                      Add Instagram, TikTok, YouTube, or any other platform
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addSocial}>
                    <Plus /> Add
                  </Button>
                </div>
                <div className="mt-2 space-y-3">
                  {socials.map((s, i) => (
                    <div key={i} className="space-y-2 rounded-lg border border-border p-3">
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
                          <option value="">Select your account…</option>
                          {INFLUENCER_PLATFORMS.map((p) => (
                            <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                          ))}
                        </select>

                        {s.platform === "OTHER" && (
                          <Input
                            placeholder="Platform name (e.g. Pinterest)"
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

                      <div className="grid gap-2 sm:grid-cols-3">
                        <Input
                          placeholder="@handle"
                          value={s.handle}
                          onChange={(e) => updateSocial(i, { handle: e.target.value })}
                        />
                        <Input
                          type="number"
                          min={0}
                          max={2147483647}
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
                      </div>
                    </div>
                  ))}
                  {socials.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No social accounts added yet. Click "Add" to start.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex flex-shrink-0 items-center justify-end gap-2 border-t border-border bg-card px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving || uploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add influencer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}













// //influencerFormModal.tsx 23-09-2026  12:54
// 23-09-026
// import { useState } from "react";
// import { X, Plus, Trash2 } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   influencersApi,
//   INFLUENCER_PLATFORMS,
//   INFLUENCER_CATEGORIES,
//   AVAILABILITY_OPTIONS,
//   GENDER_OPTIONS,
//   CURRENCY_OPTIONS,
//   type Influencer,
//   type InfluencerInput,
//   type InfluencerPlatform,
// } from "@/lib/influencers";

// interface Props {
//   mode?: "create" | "edit";
//   influencer?: Influencer | null;
//   onClose: () => void;
//   onSaved: (inf: Influencer) => void;
// }

// interface SocialAccountDraft {
//   platform: InfluencerPlatform;
//   handle: string;
//   followerCount: number;
//   engagementRate: number;
//   isPrimary: boolean;
// }

// export function InfluencerFormModal({
//   mode = "create",
//   influencer = null,
//   onClose,
//   onSaved,
// }: Props) {
//   const isEdit = mode === "edit";

//   const [form, setForm] = useState<InfluencerInput>(() =>
//     influencer
//       ? {
//           displayName: influencer.displayName,
//           username: influencer.username,
//           bio: influencer.bio ?? "",
//           avatarUrl: influencer.avatarUrl ?? "",
//           email: influencer.email ?? "",
//           phone: influencer.phone ?? "",
//           country: influencer.country ?? "",
//           city: influencer.city ?? "",
//           language: influencer.language ?? "",
//           gender: influencer.gender ?? "",
//           ageGroup: influencer.ageGroup ?? "",
//           followerCount: influencer.followerCount,
//           followingCount: influencer.followingCount,
//           engagementRate: influencer.engagementRate,
//           categories: influencer.categories,
//           avgViews: influencer.avgViews,
//           avgLikes: influencer.avgLikes,
//           avgComments: influencer.avgComments,
//           pricePerPost: influencer.pricePerPost,
//           currency: influencer.currency,
//           availability: influencer.availability,
//         }
//       : {
//           displayName: "",
//           username: "",
//           bio: "",
//           avatarUrl: "",
//           email: "",
//           phone: "",
//           country: "",
//           city: "",
//           language: "",
//           gender: "",
//           ageGroup: "",
//           followerCount: 0,
//           followingCount: 0,
//           engagementRate: 0,
//           categories: [],
//           avgViews: 0,
//           avgLikes: 0,
//           avgComments: 0,
//           pricePerPost: null,
//           currency: "USD",
//           availability: "AVAILABLE",
//         }
//   );

//   const [socials, setSocials] = useState<SocialAccountDraft[]>(
//     () =>
//       influencer?.socialAccounts.map((s) => ({
//         platform: s.platform,
//         handle: s.handle,
//         followerCount: s.followerCount,
//         engagementRate: s.engagementRate,
//         isPrimary: s.isPrimary,
//       })) ?? []
//   );

//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState("");

//   function toggleCategory(cat: string) {
//     setForm((prev) => {
//       const list = prev.categories ?? [];
//       const has = list.includes(cat);
//       return {
//         ...prev,
//         categories: has ? list.filter((c) => c !== cat) : [...list, cat],
//       };
//     });
//   }

//   function addSocial() {
//     setSocials((prev) => [
//       ...prev,
//       {
//         platform: "INSTAGRAM",
//         handle: "",
//         followerCount: 0,
//         engagementRate: 0,
//         isPrimary: prev.length === 0,
//       },
//     ]);
//   }

//   function updateSocial(index: number, patch: Partial<SocialAccountDraft>) {
//     setSocials((prev) =>
//       prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
//     );
//   }

//   function removeSocial(index: number) {
//     setSocials((prev) => prev.filter((_, i) => i !== index));
//   }

//   async function handleSubmit(e: React.FormEvent) {
//     e.preventDefault();
//     setError("");

//     if (!form.displayName.trim()) return setError("Display name is required");
//     if (!form.username.trim()) return setError("Username is required");

//     setSaving(true);
//     try {
//       const payload: InfluencerInput = {
//         ...form,
//         socialAccounts: socials.filter((s) => s.handle.trim()),
//       };

//       const res =
//         isEdit && influencer
//           ? await influencersApi.update(influencer.id, payload)
//           : await influencersApi.create(payload);

//       onSaved(res.influencer);
//     } catch (err: any) {
//       setError(err?.message || "Failed to save");
//       setSaving(false);
//     }
//   }

//   return (
//     <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60">
//       <div
//         className="flex min-h-full items-start justify-center p-4 pt-20"
//         onMouseDown={(e) => {
//           if (e.target === e.currentTarget && !saving) onClose();
//         }}
//       >
//         <form
//           onSubmit={handleSubmit}
//           onMouseDown={(e) => e.stopPropagation()}
//           className="flex max-h-[calc(100vh-7rem)] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl"
//         >
//           {/* HEADER */}
//           <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-4">
//             <h2 className="font-display text-xl font-medium">
//               {isEdit ? "Edit influencer" : "Add influencer"}
//             </h2>
//             <Button
//               type="button"
//               variant="ghost"
//               size="icon"
//               onClick={onClose}
//               disabled={saving}
//             >
//               <X />
//             </Button>
//           </div>

//           {/* BODY */}
//           <div className="min-h-0 flex-1 overflow-y-auto p-6">
//             <div className="space-y-5">
//               {error && (
//                 <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
//                   {error}
//                 </div>
//               )}

//               {/* Name + username */}
//               <div className="grid gap-4 sm:grid-cols-2">
//                 <div className="space-y-2">
//                   <Label htmlFor="displayName">Display name *</Label>
//                   <Input
//                     id="displayName"
//                     value={form.displayName}
//                     onChange={(e) =>
//                       setForm({ ...form, displayName: e.target.value })
//                     }
//                     placeholder="Maya Khan"
//                     required
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="username">Username *</Label>
//                   <Input
//                     id="username"
//                     value={form.username}
//                     onChange={(e) =>
//                       setForm({ ...form, username: e.target.value })
//                     }
//                     placeholder="mayakhan"
//                     required
//                     disabled={isEdit}
//                   />
//                 </div>
//               </div>

//               {/* Bio */}
//               <div className="space-y-2">
//                 <Label htmlFor="bio">Bio</Label>
//                 <textarea
//                   id="bio"
//                   value={form.bio ?? ""}
//                   onChange={(e) => setForm({ ...form, bio: e.target.value })}
//                   rows={3}
//                   placeholder="Fashion & lifestyle creator based in Karachi…"
//                   className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
//                 />
//               </div>

//               {/* Avatar URL */}
//               <div className="space-y-2">
//                 <Label htmlFor="avatarUrl">Avatar URL</Label>
//                 <Input
//                   id="avatarUrl"
//                   value={form.avatarUrl ?? ""}
//                   onChange={(e) =>
//                     setForm({ ...form, avatarUrl: e.target.value })
//                   }
//                   placeholder="https://res.cloudinary.com/…"
//                 />
//               </div>

//               {/* Contact */}
//               <div className="grid gap-4 sm:grid-cols-2">
//                 <div className="space-y-2">
//                   <Label htmlFor="email">Email</Label>
//                   <Input
//                     id="email"
//                     type="email"
//                     value={form.email ?? ""}
//                     onChange={(e) =>
//                       setForm({ ...form, email: e.target.value })
//                     }
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="phone">Phone</Label>
//                   <Input
//                     id="phone"
//                     value={form.phone ?? ""}
//                     onChange={(e) =>
//                       setForm({ ...form, phone: e.target.value })
//                     }
//                   />
//                 </div>
//               </div>

//               {/* Location */}
//               <div className="grid gap-4 sm:grid-cols-3">
//                 <div className="space-y-2">
//                   <Label>Country</Label>
//                   <Input
//                     value={form.country ?? ""}
//                     onChange={(e) =>
//                       setForm({ ...form, country: e.target.value })
//                     }
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <Label>City</Label>
//                   <Input
//                     value={form.city ?? ""}
//                     onChange={(e) =>
//                       setForm({ ...form, city: e.target.value })
//                     }
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <Label>Language</Label>
//                   <Input
//                     value={form.language ?? ""}
//                     onChange={(e) =>
//                       setForm({ ...form, language: e.target.value })
//                     }
//                   />
//                 </div>
//               </div>

//               {/* Demographics */}
//               <div className="grid gap-4 sm:grid-cols-2">
//                 <div className="space-y-2">
//                   <Label>Gender</Label>
//                   <select
//                     value={form.gender ?? ""}
//                     onChange={(e) =>
//                       setForm({ ...form, gender: e.target.value })
//                     }
//                     className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
//                   >
//                     <option value="">—</option>
//                     {GENDER_OPTIONS.map((g) => (
//                       <option key={g} value={g}>
//                         {g}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//                 <div className="space-y-2">
//                   <Label>Age group</Label>
//                   <Input
//                     value={form.ageGroup ?? ""}
//                     onChange={(e) =>
//                       setForm({ ...form, ageGroup: e.target.value })
//                     }
//                     placeholder="e.g. 25-34"
//                   />
//                 </div>
//               </div>

//               {/* Reach */}
//               <div className="grid gap-4 sm:grid-cols-3">
//                 <div className="space-y-2">
//                   <Label>Follower count</Label>
//                   <Input
//                     type="number"
//                     min={0}
//                     value={form.followerCount ?? 0}
//                     onChange={(e) =>
//                       setForm({
//                         ...form,
//                         followerCount: Number(e.target.value),
//                       })
//                     }
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <Label>Following count</Label>
//                   <Input
//                     type="number"
//                     min={0}
//                     value={form.followingCount ?? 0}
//                     onChange={(e) =>
//                       setForm({
//                         ...form,
//                         followingCount: Number(e.target.value),
//                       })
//                     }
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <Label>Engagement rate (0-1)</Label>
//                   <Input
//                     type="number"
//                     step="0.001"
//                     min={0}
//                     max={1}
//                     value={form.engagementRate ?? 0}
//                     onChange={(e) =>
//                       setForm({
//                         ...form,
//                         engagementRate: Number(e.target.value),
//                       })
//                     }
//                   />
//                 </div>
//               </div>

//               {/* Categories */}
//               <div className="space-y-2">
//                 <Label>Categories</Label>
//                 <div className="flex flex-wrap gap-2">
//                   {INFLUENCER_CATEGORIES.map((cat) => {
//                     const active = form.categories?.includes(cat);
//                     return (
//                       <button
//                         key={cat}
//                         type="button"
//                         onClick={() => toggleCategory(cat)}
//                         className={
//                           active
//                             ? "rounded-full bg-accent px-3 py-1 text-xs font-medium text-background"
//                             : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
//                         }
//                       >
//                         {cat}
//                       </button>
//                     );
//                   })}
//                 </div>
//               </div>

//               {/* Pricing */}
//               <div className="grid gap-4 sm:grid-cols-2">
//                 <div className="space-y-2">
//                   <Label>Price per post</Label>
//                   <Input
//                     type="number"
//                     min={0}
//                     step="0.01"
//                     value={form.pricePerPost ?? ""}
//                     onChange={(e) =>
//                       setForm({
//                         ...form,
//                         pricePerPost:
//                           e.target.value === ""
//                             ? null
//                             : Number(e.target.value),
//                       })
//                     }
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <Label>Currency</Label>
//                   <select
//                     value={form.currency ?? "USD"}
//                     onChange={(e) =>
//                       setForm({ ...form, currency: e.target.value })
//                     }
//                     className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
//                   >
//                     {CURRENCY_OPTIONS.map((c) => (
//                       <option key={c} value={c}>
//                         {c}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               </div>

//               {/* Availability */}
//               <div className="space-y-2">
//                 <Label>Availability</Label>
//                 <select
//                   value={form.availability ?? "AVAILABLE"}
//                   onChange={(e) =>
//                     setForm({ ...form, availability: e.target.value as any })
//                   }
//                   className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
//                 >
//                   {AVAILABILITY_OPTIONS.map((a) => (
//                     <option key={a} value={a}>
//                       {a}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               {/* Social accounts */}
//               <div>
//                 <div className="flex items-center justify-between">
//                   <Label>Social accounts</Label>
//                   <Button
//                     type="button"
//                     variant="outline"
//                     size="sm"
//                     onClick={addSocial}
//                   >
//                     <Plus /> Add
//                   </Button>
//                 </div>
//                 <div className="mt-2 space-y-2">
//                   {socials.map((s, i) => (
//                     <div
//                       key={i}
//                       className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[140px_1fr_120px_100px_auto]"
//                     >
//                       <select
//                         value={s.platform}
//                         onChange={(e) =>
//                           updateSocial(i, {
//                             platform: e.target.value as InfluencerPlatform,
//                           })
//                         }
//                         className="rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none"
//                       >
//                         {INFLUENCER_PLATFORMS.map((p) => (
//                           <option key={p} value={p}>
//                             {p}
//                           </option>
//                         ))}
//                       </select>
//                       <Input
//                         placeholder="@handle"
//                         value={s.handle}
//                         onChange={(e) =>
//                           updateSocial(i, { handle: e.target.value })
//                         }
//                         className="h-8 text-xs"
//                       />
//                       <Input
//                         type="number"
//                         placeholder="Followers"
//                         value={s.followerCount}
//                         onChange={(e) =>
//                           updateSocial(i, {
//                             followerCount: Number(e.target.value),
//                           })
//                         }
//                         className="h-8 text-xs"
//                       />
//                       <Input
//                         type="number"
//                         step="0.001"
//                         placeholder="Eng. rate"
//                         value={s.engagementRate}
//                         onChange={(e) =>
//                           updateSocial(i, {
//                             engagementRate: Number(e.target.value),
//                           })
//                         }
//                         className="h-8 text-xs"
//                       />
//                       <Button
//                         type="button"
//                         variant="ghost"
//                         size="icon"
//                         onClick={() => removeSocial(i)}
//                         className="h-8 w-8 text-destructive"
//                       >
//                         <Trash2 className="size-3.5" />
//                       </Button>
//                     </div>
//                   ))}
//                   {socials.length === 0 && (
//                     <p className="text-xs text-muted-foreground">
//                       No social accounts added yet.
//                     </p>
//                   )}
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* FOOTER */}
//           <div className="flex flex-shrink-0 items-center justify-end gap-2 border-t border-border bg-card px-6 py-4">
//             <Button
//               type="button"
//               variant="outline"
//               onClick={onClose}
//               disabled={saving}
//             >
//               Cancel
//             </Button>
//             <Button type="submit" disabled={saving}>
//               {saving ? "Saving…" : isEdit ? "Save changes" : "Add influencer"}
//             </Button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }