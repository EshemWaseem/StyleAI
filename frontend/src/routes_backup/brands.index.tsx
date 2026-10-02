import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, AlertCircle, Globe, Lock } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui-kit";
import { useRole } from "@/lib/role";
import { brandsApi, type Brand, type BrandInput } from "@/lib/brands";

export const Route = createFileRoute("/brands/")({
  head: () => ({
    meta: [
      { title: "Brand — StyleAI" },
      { name: "description", content: "Manage your organization's brand." },
    ],
  }),
  component: BrandPage,
});

function BrandPage() {
  const { user, loading: authLoading } = useRole();
  const navigate = useNavigate();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  // ======================================================
  // PERMISSIONS
  // ======================================================
  const isOwner = !!user?.roles.some((r) =>
    ["SUPER_ADMIN", "BRAND_OWNER", "AGENCY"].includes(r)
  );
  const canCreate = !!user?.permissions.includes("brand.create") && isOwner;
  const canUpdate = !!user?.permissions.includes("brand.update");
  const canDelete = !!user?.permissions.includes("brand.delete") && isOwner;

  // ======================================================
  // PENDING + PERMISSION GUARDS
  // ======================================================
  useEffect(() => {
    if (authLoading || !user) return;

    if (user.pendingApproval) {
      navigate({ to: "/pending" });
      return;
    }

    if (!user.permissions.includes("brand.read")) {
      navigate({ to: "/dashboard" });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (user.pendingApproval) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, navigate]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await brandsApi.list();
      setBrands(res.brands);
    } catch (err: any) {
      setError(err?.message || "Could not load brand.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (
      !confirm(
        `Delete "${name}"? This will also remove all its products. Cannot be undone.`
      )
    )
      return;
    try {
      await brandsApi.remove(id);
      setBrands([]);
    } catch (err: any) {
      alert(err?.message || "Delete failed");
    }
  }

  async function handleCreate(data: BrandInput) {
    const res = await brandsApi.create(data);
    setBrands([res.brand]);
    setShowCreate(false);
  }

  if (authLoading || loading) {
    return (
      <AppShell breadcrumb={["Commerce", "Brand"]}>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  if (!user || user.pendingApproval) return null;

  if (error) {
    return (
      <AppShell breadcrumb={["Commerce", "Brand"]}>
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      </AppShell>
    );
  }

  const hasBrand = brands.length > 0;

  return (
    <AppShell breadcrumb={["Commerce", "Brand"]}>
      <PageHeader
        eyebrow="Commerce"
        title="Brand"
        description={
          canUpdate
            ? "Your organization operates one brand. Manage it here."
            : "Read-only view of your brand."
        }
        actions={
          hasBrand
            ? null
            : canCreate
            ? (
              <Button onClick={() => setShowCreate(true)}>
                <Plus /> Create brand
              </Button>
            )
            : null
        }
      />

      {!hasBrand ? (
        <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-accent/15 text-accent">
            <Plus className="size-5" />
          </div>
          <h2 className="mt-4 font-display text-xl font-medium">
            No brand yet
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {canCreate
              ? "Every organization has one brand. Create yours to start adding products and campaigns."
              : "The brand owner hasn't set up the brand yet. Please check back later."}
          </p>
          {canCreate && (
            <Button className="mt-6" onClick={() => setShowCreate(true)}>
              <Plus /> Create brand
            </Button>
          )}
        </div>
      ) : (
        // <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
          {/* BRAND CARD */}
          <article className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-start gap-4 p-6">
              <div className="grid size-14 shrink-0 place-items-center rounded-md bg-accent/15 text-lg font-semibold text-accent">
                {brands[0].name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-2xl font-medium">
                  {brands[0].name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {brands[0].organization.name}
                </p>
                {brands[0].description && (
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {brands[0].description}
                  </p>
                )}
              </div>
              {!canUpdate && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[10px] text-muted-foreground">
                  <Lock className="size-3" />
                  Read-only
                </span>
              )}
            </div>

            <div className="grid gap-3 border-t border-border p-6 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Country
                </p>
                <p className="mt-1 text-sm">{brands[0].country || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Currency
                </p>
                <p className="mt-1 text-sm">{brands[0].currency || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Products
                </p>
                <p className="mt-1 text-sm">{brands[0].productCount ?? 0}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-border p-4">
              {canUpdate && (
                <Button asChild>
                  <Link to="/brands/$brandId" params={{ brandId: brands[0].id }}>
                    <Pencil className="size-4" /> Edit brand
                  </Link>
                </Button>
              )}
              {brands[0].website && (
                <Button variant="outline" asChild>
                  <a
                    href={brands[0].website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Globe className="size-4" /> Visit website
                  </a>
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  className="ml-auto text-destructive hover:text-destructive"
                  onClick={() => handleDelete(brands[0].id, brands[0].name)}
                >
                  <Trash2 className="size-4" /> Delete
                </Button>
              )}
            </div>
          </article>

          {/* INFO PANEL */}
          {/* <aside className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-display text-lg font-medium">About this model</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-accent">•</span>
                Each organization manages{" "}
                <strong className="text-foreground">one brand</strong>.
              </li>
              <li className="flex gap-2">
                <span className="text-accent">•</span>
                Need to manage multiple brands?{" "}
                <strong className="text-foreground">Agencies</strong> can manage
                multiple organizations.
              </li>
              <li className="flex gap-2">
                <span className="text-accent">•</span>
                Team members and products live inside your brand.
              </li>
            </ul>
          </aside> */}

          {/* INFO PANEL */}
            {/* <aside className="rounded-xl border border-border bg-card p-6"> */}
            <aside className="min-w-0 rounded-xl border border-border bg-card p-6">
              <h3 className="font-display text-lg font-medium">About this model</h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                <li className="relative pl-5">
                  <span className="absolute left-0 top-0 text-accent" aria-hidden="true">•</span>
                  <span>
                    Each organization manages{" "}
                    <strong className="font-semibold text-foreground">one brand</strong>.
                  </span>
                </li>
                <li className="relative pl-5">
                  <span className="absolute left-0 top-0 text-accent" aria-hidden="true">•</span>
                  <span>
                    Need to manage multiple brands?{" "}
                    <strong className="font-semibold text-foreground">Agencies</strong>{" "}
                    can manage multiple organizations.
                  </span>
                </li>
                <li className="relative pl-5">
                  <span className="absolute left-0 top-0 text-accent" aria-hidden="true">•</span>
                  <span>
                    Team members and products live inside your brand.
                  </span>
                </li>
              </ul>
            </aside>
        </div>
      )}

      {showCreate && canCreate && (
        <BrandFormModal
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}
    </AppShell>
  );
}

// ======================================================
// CREATE MODAL
// ======================================================

function BrandFormModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: BrandInput) => Promise<void>;
}) {
  const [form, setForm] = useState<BrandInput>({ name: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err: any) {
      setError(err?.message || "Save failed");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg space-y-4 rounded-xl border border-border bg-card p-6 shadow-lift"
      >
        <div>
          <h2 className="font-display text-xl font-medium">Create your brand</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            This is the only brand your organization will have. Choose the name
            carefully.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Brand name *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Noor Atelier"
            autoFocus
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="A short description of your brand"
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
              placeholder="PK"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              value={form.currency ?? ""}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              placeholder="PKR"
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
            placeholder="https://example.com"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create brand"}
          </Button>
        </div>
      </form>
    </div>
  );
}