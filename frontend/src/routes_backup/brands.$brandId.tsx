import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2, Save } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, Panel } from "@/components/ui-kit";
import { useRole } from "@/lib/role";
import { brandsApi, type Brand, type BrandInput } from "@/lib/brands";

export const Route = createFileRoute("/brands/$brandId")({
  head: () => ({ meta: [{ title: "Edit brand — StyleAI" }] }),
  component: BrandDetailPage,
});

function BrandDetailPage() {
  const { brandId } = Route.useParams();
  const { user, loading: authLoading } = useRole();
  const navigate = useNavigate();

  const [brand, setBrand] = useState<Brand | null>(null);
  const [form, setForm] = useState<BrandInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, brandId, navigate]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await brandsApi.get(brandId);
      setBrand(res.brand);
      setForm({
        name: res.brand.name,
        description: res.brand.description ?? "",
        logoUrl: res.brand.logoUrl ?? "",
        website: res.brand.website ?? "",
        country: res.brand.country ?? "",
        currency: res.brand.currency ?? "",
        brandVoice: res.brand.brandVoice ?? "",
        brandStyle: res.brand.brandStyle ?? "",
        targetAge: res.brand.targetAge ?? "",
        targetGender: res.brand.targetGender ?? "",
      });
    } catch (err: any) {
      setError(err?.message || "Could not load brand.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await brandsApi.update(brandId, form);
      setBrand(res.brand);
      setSuccess("Brand updated successfully.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!brand) return;
    if (
      !confirm(
        `Delete "${brand.name}"? All products and campaigns will be removed. Cannot be undone.`
      )
    )
      return;
    try {
      await brandsApi.remove(brandId);
      navigate({ to: "/brands" });
    } catch (err: any) {
      alert(err?.message || "Delete failed");
    }
  }

  if (authLoading || loading) {
    return (
      <AppShell breadcrumb={["Commerce", "Brand"]}>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  if (error && !brand) {
    return (
      <AppShell breadcrumb={["Commerce", "Brand"]}>
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/brands">
            <ArrowLeft /> Back
          </Link>
        </Button>
      </AppShell>
    );
  }

  if (!brand || !form) return null;

  return (
    <AppShell breadcrumb={["Commerce", "Brand", brand.name]}>
      <PageHeader
        eyebrow={brand.organization.name}
        title={brand.name}
        description="Edit your brand details, voice, and positioning."
        actions={
          <Button variant="outline" asChild>
            <Link to="/brands">
              <ArrowLeft /> Back
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSave} className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <Panel>
          <h3 className="mb-4 font-display text-lg font-medium">Basic details</h3>

          {error && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
              {success}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={form.country ?? ""}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={form.currency ?? ""}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={form.website ?? ""}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 /> Delete brand
            </Button>
            <Button type="submit" disabled={saving}>
              <Save /> {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </Panel>

        <Panel>
          <h3 className="mb-4 font-display text-lg font-medium">
            Brand voice & style
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brandVoice">Brand voice</Label>
              <Input
                id="brandVoice"
                value={form.brandVoice ?? ""}
                onChange={(e) => setForm({ ...form, brandVoice: e.target.value })}
                placeholder="Minimal, warm, editorial"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandStyle">Brand style</Label>
              <Input
                id="brandStyle"
                value={form.brandStyle ?? ""}
                onChange={(e) => setForm({ ...form, brandStyle: e.target.value })}
                placeholder="Modern luxury"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetAge">Target age</Label>
              <Input
                id="targetAge"
                value={form.targetAge ?? ""}
                onChange={(e) => setForm({ ...form, targetAge: e.target.value })}
                placeholder="25–40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetGender">Target gender</Label>
              <Input
                id="targetGender"
                value={form.targetGender ?? ""}
                onChange={(e) =>
                  setForm({ ...form, targetGender: e.target.value })
                }
                placeholder="Unisex"
              />
            </div>
          </div>

          <div className="mt-6 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p>
              <strong>Slug:</strong> {brand.slug}
            </p>
            <p className="mt-1">
              <strong>Org:</strong> {brand.organization.name}
            </p>
            <p className="mt-1">
              <strong>Products:</strong> {brand.productCount ?? 0}
            </p>
          </div>
        </Panel>
      </form>
    </AppShell>
  );
}