// frontend/src/routes/admin/storefront.tsx
import { swalError, swalConfirm, swalSuccess, swalInfo } from "@/lib/swal";
import { Type as TypeIcon } from "lucide-react";
import type { Editorial } from "@/lib/admin/storefront";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Plus, Trash2, Pencil, Loader2, AlertCircle, Image as ImageIcon,
  LayoutGrid, Store, CheckCircle2, XCircle, Clock, Layers,
  Eye, EyeOff, Save, X, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, Panel, SectionTitle } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { cn } from "@/lib/utils";
import {
  adminStorefrontApi,
  type HeroSlide,
  type SectionSummary,
  type SectionDetail,
  type StorefrontBrand,
  type PickerProduct,
  type StorefrontOptIn,
} from "@/lib/admin/storefront";

export const Route = createFileRoute("/admin/storefront")({
  head: () => ({ meta: [{ title: "Storefront — Admin" }] }),
  component: AdminStorefrontPage,
});

function AdminStorefrontPage() {
  const [tab, setTab] = useState<"hero" | "sections" | "brands" | "editorial">("brands");

  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <>
        <PageHeader
          eyebrow="Platform"
          title="Storefront control"
          description="Review brand applications, curate sections, and manage hero slides for the public storefront."
        />

        <nav className="mt-6 flex flex-wrap gap-2 border-b border-border">
          <TabBtn active={tab === "brands"} onClick={() => setTab("brands")} icon={Store}>
            Brand applications
          </TabBtn>
          <TabBtn active={tab === "sections"} onClick={() => setTab("sections")} icon={LayoutGrid}>
            Sections
          </TabBtn>
          <TabBtn active={tab === "hero"} onClick={() => setTab("hero")} icon={ImageIcon}>
            Hero slides
          </TabBtn>
          <TabBtn active={tab === "editorial"} onClick={() => setTab("editorial")} icon={TypeIcon}>
            Editorial
          </TabBtn>
        </nav>

        {/* ✅ Fixed — single render per tab */}
        <div className="mt-6">
          {tab === "hero" && <HeroManager />}
          {tab === "sections" && <SectionsManager />}
          {tab === "brands" && <BrandsManager />}
          {tab === "editorial" && <EditorialManager />}
        </div>
      </>
    </ProtectedRoute>
  );
}

function TabBtn({
  active, onClick, icon: Icon, children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof ImageIcon;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm transition-colors",
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

// ======================================================
// BRANDS MANAGER
// ======================================================
const STATUS_STYLE: Record<StorefrontOptIn, string> = {
  NOT_REQUESTED: "bg-muted text-muted-foreground",
  REQUESTED: "bg-amber-500/15 text-amber-500",
  APPROVED: "bg-emerald-500/15 text-emerald-500",
  DECLINED: "bg-destructive/15 text-destructive",
};

const STATUS_LABEL: Record<StorefrontOptIn, string> = {
  NOT_REQUESTED: "Not applied",
  REQUESTED: "Pending review",
  APPROVED: "Approved",
  DECLINED: "Declined",
};

function BrandsManager() {
  const [brands, setBrands] = useState<StorefrontBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StorefrontOptIn | "">("REQUESTED");
  const [reviewingBrand, setReviewingBrand] = useState<StorefrontBrand | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await adminStorefrontApi.listBrands({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setBrands(res.brands);
    } catch (e: any) { setError(e?.message || "Failed to load"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  async function revoke(b: StorefrontBrand) {
    if (!(await swalConfirm(
      "Remove from storefront?",
      `${b.name}'s products will be hidden and their application reset. They can re-apply anytime.`
    ))) return;
    try {
      await adminStorefrontApi.revokeBrand(b.id);
      swalSuccess("Brand removed");
      load();
    } catch (e: any) { swalError(e?.message); }
  }

  const pendingCount = brands.filter((b) => b.storefrontStatus === "REQUESTED").length;

  return (
    <Panel>
      <SectionTitle
        title="Brand applications"
        description="Brands apply from their dashboard. Approve to let them publish products on the storefront."
        action={
          pendingCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-500">
              <Clock className="size-3" /> {pendingCount} pending
            </span>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          placeholder="Search brand name or slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none sm:w-72"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="REQUESTED">Pending review</option>
          <option value="APPROVED">Approved</option>
          <option value="DECLINED">Declined</option>
          <option value="NOT_REQUESTED">Not applied</option>
        </select>
        <Button size="sm" onClick={load}>Apply</Button>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      ) : brands.length === 0 ? (
        <Empty icon={Store} title="No brands" body="No brands match your filter." />
      ) : (
        <ul className="divide-y divide-border">
          {brands.map((b) => {
            const requested = b.application?.products?.length ?? 0;
            return (
              <li key={b.id} className="flex flex-wrap items-center gap-3 py-4">
                {b.logoUrl ? (
                  <img src={b.logoUrl} alt={b.name} className="size-10 rounded-full object-cover" />
                ) : (
                  <div className="grid size-10 place-items-center rounded-full bg-muted text-xs font-medium">
                    {b.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{b.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {b.organization.name} · {b.productCount} product{b.productCount === 1 ? "" : "s"}
                  </p>
                  {b.storefrontStatus === "REQUESTED" && b.appliedAt && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Applied {new Date(b.appliedAt).toLocaleDateString()}
                      {requested > 0 ? ` · ${requested} product${requested === 1 ? "" : "s"} requested` : ""}
                    </p>
                  )}
                  {b.storefrontStatus === "DECLINED" && b.declineReason && (
                    <p className="mt-1 line-clamp-1 text-[10px] italic text-muted-foreground">
                      Reason: {b.declineReason}
                    </p>
                  )}
                </div>
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                  STATUS_STYLE[b.storefrontStatus]
                )}>
                  {b.storefrontStatus === "APPROVED" && <CheckCircle2 className="size-3" />}
                  {b.storefrontStatus === "REQUESTED" && <Clock className="size-3" />}
                  {b.storefrontStatus === "DECLINED" && <XCircle className="size-3" />}
                  {STATUS_LABEL[b.storefrontStatus]}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  {b.storefrontStatus === "REQUESTED" && (
                    <Button size="sm" onClick={() => setReviewingBrand(b)}>
                      Review <ChevronRight className="size-3.5" />
                    </Button>
                  )}
                  {b.storefrontStatus === "APPROVED" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => revoke(b)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {reviewingBrand && (
        <ReviewBrandModal
          brand={reviewingBrand}
          onClose={() => setReviewingBrand(null)}
          onDone={() => { setReviewingBrand(null); load(); }}
        />
      )}
    </Panel>
  );
}

// ======================================================
// REVIEW MODAL — shows application + approve/decline
// ======================================================
const PLACEMENT_LABEL: Record<string, string> = {
  ECOM: "E-commerce only",
  TRENDING: "+ Trending",
  HERO: "+ Slideshow",
};

function ReviewBrandModal({
  brand, onClose, onDone,
}: {
  brand: StorefrontBrand;
  onClose: () => void;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"review" | "decline">("review");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [productDetails, setProductDetails] = useState<
    Array<{ id: string; name: string; sku: string; category: string | null; image: string | null; placement: string }>
  >([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    const appProducts = brand.application?.products ?? [];
    if (appProducts.length === 0) return;

    setLoadingProducts(true);
    adminStorefrontApi
      .searchProducts()
      .then((r) => {
        const map = new Map(r.products.map((p) => [p.id, p]));
        const list = appProducts.map((ap) => {
          const p = map.get(ap.id);
          return {
            id: ap.id,
            name: p?.name ?? "Unknown product",
            sku: p?.sku ?? "—",
            category: p?.category ?? null,
            image: p?.primaryImage ?? null,
            placement: ap.placement,
          };
        });
        setProductDetails(list);
      })
      .catch(() => setProductDetails([]))
      .finally(() => setLoadingProducts(false));
  }, [brand.id]);

  async function approve() {
    setSaving(true);
    setError("");
    try {
      await adminStorefrontApi.reviewBrand(brand.id, true);
      swalSuccess("Brand approved", `${brand.name}'s selected products are now live.`);
      onDone();
    } catch (e: any) {
      setError(e?.message || "Approve failed");
      setSaving(false);
    }
  }

  async function decline() {
    if (!reason.trim()) {
      setError("Please provide a reason — the brand owner will see it.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await adminStorefrontApi.reviewBrand(brand.id, false, reason.trim());
      swalInfo("Application declined", `${brand.name}'s owner will see your reason.`);
      onDone();
    } catch (e: any) {
      setError(e?.message || "Decline failed");
      setSaving(false);
    }
  }

  const appProducts = brand.application?.products ?? [];
  const notes = brand.application?.notes ?? "";

  return (
    <div className="ui-overlay" role="dialog" aria-modal="true">
      <div className="ui-panel ui-panel-lg">
        <div className="ui-panel-header">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-medium">
              {mode === "review" ? "Review application" : "Decline application"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {brand.name} · {brand.organization.name}
            </p>
          </div>
        </div>

        <div className="ui-panel-body space-y-5">
          {error && <div className="ui-error">{error}</div>}

          {mode === "review" ? (
            <>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                {brand.logoUrl ? (
                  <img src={brand.logoUrl} alt={brand.name} className="size-12 rounded-full object-cover" />
                ) : (
                  <div className="grid size-12 place-items-center rounded-full bg-muted text-sm font-medium">
                    {brand.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{brand.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {appProducts.length} product{appProducts.length === 1 ? "" : "s"} requested
                    {brand.appliedAt ? ` · Applied ${new Date(brand.appliedAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Products requested
                </p>

                {loadingProducts ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="mr-2 size-4 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Loading…</span>
                  </div>
                ) : productDetails.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    No products in application.
                  </p>
                ) : (
                  <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {productDetails.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-background p-2"
                      >
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="size-10 rounded object-cover" />
                        ) : (
                          <div className="grid size-10 place-items-center rounded bg-muted text-[9px] text-muted-foreground">
                            no img
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {p.category ?? "—"} · {p.sku}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
                          {PLACEMENT_LABEL[p.placement] ?? p.placement}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {notes && (
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Notes from brand
                  </p>
                  <p className="mt-1.5 text-xs italic text-foreground">"{notes}"</p>
                </div>
              )}

              <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                <p className="text-sm font-medium">Approving will:</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    Make the {appProducts.length} selected product{appProducts.length === 1 ? "" : "s"} live on the storefront
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    Allow the brand to toggle any product visibility
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    Enable eligible products for trending/hero sections (you curate those separately)
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (visible to brand owner) *</Label>
              <textarea
                id="reason"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Product images need to meet our editorial quality standard."
                autoFocus
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
        </div>

        <div className="ui-panel-footer">
          {mode === "review" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode("decline")}
                disabled={saving}
              >
                <X className="size-4" /> Decline
              </Button>
              <Button onClick={approve} disabled={saving}>
                {saving ? (
                  <><Loader2 className="mr-2 size-4 animate-spin" /> Approving…</>
                ) : (
                  <><CheckCircle2 className="mr-2 size-4" /> Approve brand</>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setMode("review"); setReason(""); setError(""); }}
                disabled={saving}
              >
                Back
              </Button>
              <Button
                onClick={decline}
                disabled={saving}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {saving ? (
                  <><Loader2 className="mr-2 size-4 animate-spin" /> Declining…</>
                ) : (
                  <><XCircle className="mr-2 size-4" /> Decline application</>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ======================================================
// HERO MANAGER
// ======================================================
function HeroManager() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<HeroSlide | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await adminStorefrontApi.listHero();
      setSlides(res.hero);
    } catch (e: any) { setError(e?.message || "Failed to load"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function onDelete(s: HeroSlide) {
    if (!(await swalConfirm("Delete this slide?", `"${s.headline ?? "Untitled"}" will be removed.`))) return;
    try {
      await adminStorefrontApi.deleteHero(s.id);
      setSlides((prev) => prev.filter((x) => x.id !== s.id));
      swalSuccess("Slide deleted");
    } catch (e: any) { swalError(e?.message); }
  }

  async function toggleActive(s: HeroSlide) {
    try {
      const res = await adminStorefrontApi.updateHero(s.id, { isActive: !s.isActive });
      setSlides((prev) => prev.map((x) => (x.id === s.id ? res.hero : x)));
    } catch (e: any) { swalError(e?.message); }
  }

  return (
    <Panel>
      <SectionTitle
        title="Hero slideshow"
        description="Rotating banners on the public homepage."
        action={
          <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus /> Add slide
          </Button>
        }
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      ) : slides.length === 0 ? (
        <Empty icon={ImageIcon} title="No slides yet" body="Add your first hero slide to power the homepage carousel." />
      ) : (
        <ul className="space-y-3">
          {slides.map((s) => (
            <li key={s.id} className="flex items-center gap-4 rounded-lg border border-border bg-background p-3">
              <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
                {s.imageUrl ? (
                  <img src={s.imageUrl} alt={s.headline ?? ""} className="size-16 object-cover" />
                ) : (
                  <ImageIcon className="size-5 text-muted-foreground" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {s.headline || <span className="italic text-muted-foreground">Untitled</span>}
                </p>
                {s.subheading && <p className="truncate text-xs text-muted-foreground">{s.subheading}</p>}
                <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Order {s.sortOrder} · {s.isActive ? "Active" : "Hidden"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => toggleActive(s)}>
                  {s.isActive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setShowForm(true); }}>
                  <Pencil className="size-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(s)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <HeroFormModal
          slide={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        />
      )}
    </Panel>
  );
}

function HeroFormModal({
  slide, onClose, onSaved,
}: {
  slide: HeroSlide | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    imageUrl: slide?.imageUrl ?? "",
    headline: slide?.headline ?? "",
    subheading: slide?.subheading ?? "",
    ctaText: slide?.ctaText ?? "",
    ctaLink: slide?.ctaLink ?? "",
    sortOrder: slide?.sortOrder ?? 0,
    isActive: slide?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.imageUrl.trim()) return setError("Image URL is required");
    setSaving(true);
    try {
      const payload = { ...form, sortOrder: Number(form.sortOrder) };
      if (slide) await adminStorefrontApi.updateHero(slide.id, payload);
      else await adminStorefrontApi.createHero(payload);
      onSaved();
    } catch (e: any) { setError(e?.message || "Save failed"); setSaving(false); }
  }

  return (
    <div className="ui-overlay" role="dialog" aria-modal="true">
      <form onSubmit={save} className="ui-panel ui-panel-md">
        <div className="ui-panel-header">
          <h2 className="font-display text-xl font-medium">
            {slide ? "Edit slide" : "Add hero slide"}
          </h2>
        </div>
        <div className="ui-panel-body space-y-4">
          {error && <div className="ui-error">{error}</div>}
          <Field label="Image URL *">
            <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://res.cloudinary.com/..." autoFocus />
          </Field>
          {form.imageUrl && (
            <div className="overflow-hidden rounded-lg border border-border">
              <img src={form.imageUrl} alt="preview" className="aspect-[7/5] w-full object-cover" />
            </div>
          )}
          <Field label="Headline">
            <Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="The collection, styled by intelligence." />
          </Field>
          <Field label="Subheading">
            <Input value={form.subheading} onChange={(e) => setForm({ ...form, subheading: e.target.value })} placeholder="Every piece is read, understood and matched." />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="CTA text">
              <Input value={form.ctaText} onChange={(e) => setForm({ ...form, ctaText: e.target.value })} placeholder="Shop now" />
            </Field>
            <Field label="CTA link">
              <Input value={form.ctaLink} onChange={(e) => setForm({ ...form, ctaLink: e.target.value })} placeholder="#shop" />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Sort order">
              <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </Field>
            <label className="flex items-center gap-2 pt-6 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="size-4" />
              Visible on storefront
            </label>
          </div>
        </div>
        <div className="ui-panel-footer">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Saving…</> : <><Save className="mr-2 size-4" /> {slide ? "Save changes" : "Add slide"}</>}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ======================================================
// SECTIONS MANAGER
// ======================================================
function SectionsManager() {
  const [sections, setSections] = useState<SectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SectionSummary | null>(null);
  const [pickingSection, setPickingSection] = useState<SectionSummary | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await adminStorefrontApi.listSections();
      setSections(res.sections);
    } catch (e: any) { setError(e?.message || "Failed to load"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function onDelete(s: SectionSummary) {
    if (!(await swalConfirm("Delete section?", `"${s.title}" will be removed.`))) return;
    try {
      await adminStorefrontApi.deleteSection(s.id);
      setSections((prev) => prev.filter((x) => x.id !== s.id));
      swalSuccess("Section deleted");
    } catch (e: any) { swalError(e?.message); }
  }

  async function toggleActive(s: SectionSummary) {
    try {
      const res = await adminStorefrontApi.updateSection(s.id, { isActive: !s.isActive });
      setSections((prev) => prev.map((x) => (x.id === s.id ? res.section : x)));
    } catch (e: any) { swalError(e?.message); }
  }

  return (
    <Panel>
      <SectionTitle
        title="Product sections"
        description="Curate which products appear in which blocks on the homepage. Only approved brands' products can be picked."
        action={
          <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus /> New section
          </Button>
        }
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      ) : sections.length === 0 ? (
        <Empty icon={LayoutGrid} title="No sections yet" body="Create a section like 'New arrivals' or 'Staff picks'." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sections.map((s) => (
            <article key={s.id} className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{s.title}</p>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                      s.type === "AUTO" ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
                    )}>
                      {s.type}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                      {s.layout}
                    </span>
                  </div>
                  {s.subtitle && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{s.subtitle}</p>}
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Order {s.sortOrder} · {s.type === "MANUAL" ? `${s.productCount} product${s.productCount === 1 ? "" : "s"}` : `Auto (${s.rule})`}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => toggleActive(s)} title={s.isActive ? "Hide" : "Show"}>
                  {s.isActive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                {s.type === "MANUAL" && (
                  <Button size="sm" variant="outline" onClick={() => setPickingSection(s)}>
                    <Layers className="size-3.5" /> Pick products
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setShowForm(true); }}>
                  <Pencil className="size-3.5" /> Edit
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(s)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <SectionFormModal
          section={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        />
      )}

      {pickingSection && (
        <SectionProductPicker
          section={pickingSection}
          onClose={() => setPickingSection(null)}
          onSaved={() => { setPickingSection(null); load(); }}
        />
      )}
    </Panel>
  );
}

function SectionFormModal({
  section, onClose, onSaved,
}: {
  section: SectionSummary | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: section?.title ?? "",
    subtitle: section?.subtitle ?? "",
    type: section?.type ?? "MANUAL",
    layout: section?.layout ?? "GRID",
    rule: section?.rule ?? "new",
    productLimit: section?.productLimit ?? 8,
    sortOrder: section?.sortOrder ?? 0,
    isActive: section?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) return setError("Title is required");
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        productLimit: Number(form.productLimit),
        sortOrder: Number(form.sortOrder),
        rule: form.type === "AUTO" ? form.rule : null,
      };
      if (section) await adminStorefrontApi.updateSection(section.id, payload);
      else await adminStorefrontApi.createSection(payload);
      onSaved();
    } catch (e: any) { setError(e?.message || "Save failed"); setSaving(false); }
  }

  return (
    <div className="ui-overlay" role="dialog" aria-modal="true">
      <form onSubmit={save} className="ui-panel ui-panel-md">
        <div className="ui-panel-header">
          <h2 className="font-display text-xl font-medium">
            {section ? "Edit section" : "New section"}
          </h2>
        </div>
        <div className="ui-panel-body space-y-4">
          {error && <div className="ui-error">{error}</div>}
          <Field label="Title *">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="New arrivals" autoFocus />
          </Field>
          <Field label="Subtitle">
            <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Fresh from the atelier" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type">
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="MANUAL">Manual — pick products</option>
                <option value="AUTO">Auto — rule-based</option>
              </select>
            </Field>
            <Field label="Layout">
              <select
                value={form.layout}
                onChange={(e) => setForm({ ...form, layout: e.target.value as any })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="GRID">Grid</option>
                <option value="CAROUSEL">Carousel (horizontal scroll)</option>
              </select>
            </Field>
          </div>
          {form.type === "AUTO" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Rule">
                <select
                  value={form.rule}
                  onChange={(e) => setForm({ ...form, rule: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="new">Newest first</option>
                  <option value="trending">Trending (recently updated)</option>
                </select>
              </Field>
              <Field label="Max products">
                <Input type="number" value={form.productLimit} onChange={(e) => setForm({ ...form, productLimit: Number(e.target.value) })} />
              </Field>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Sort order">
              <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </Field>
            <label className="flex items-center gap-2 pt-6 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="size-4" />
              Visible on storefront
            </label>
          </div>
        </div>
        <div className="ui-panel-footer">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Saving…</> : <><Save className="mr-2 size-4" /> {section ? "Save" : "Create"}</>}
          </Button>
        </div>
      </form>
    </div>
  );
}

function SectionProductPicker({
  section, onClose, onSaved,
}: {
  section: SectionSummary;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [picked, setPicked] = useState<PickerProduct[]>([]);
  const [all, setAll] = useState<PickerProduct[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [detail, products] = await Promise.all([
          adminStorefrontApi.getSection(section.id),
          adminStorefrontApi.searchProducts(),
        ]);
        const pickedIds = new Set(detail.section.products.map((p) => p.id));
        const pickedList = detail.section.products.map((p) => ({
          id: p.id, name: p.name, sku: p.sku, category: p.category,
          price: p.price, currency: p.currency, storefrontVisible: p.storefrontVisible,
          brand: p.brand, primaryImage: p.primaryImage,
        }));
        setPicked(pickedList);
        setAll(products.products.filter((p) => !pickedIds.has(p.id)));
      } catch (e: any) { setError(e?.message || "Failed to load"); }
      finally { setLoading(false); }
    })();
  }, [section.id]);

  function add(p: PickerProduct) {
    setPicked((prev) => [...prev, p]);
    setAll((prev) => prev.filter((x) => x.id !== p.id));
  }
  function remove(p: PickerProduct) {
    setPicked((prev) => prev.filter((x) => x.id !== p.id));
    setAll((prev) => [p, ...prev]);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      await adminStorefrontApi.setSectionProducts(section.id, picked.map((p) => p.id));
      swalSuccess("Products updated");
      onSaved();
    } catch (e: any) { setError(e?.message || "Save failed"); setSaving(false); }
  }

  const filteredAll = search
    ? all.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
      )
    : all;

  return (
    <div className="ui-overlay" role="dialog" aria-modal="true">
      <div className="ui-panel ui-panel-xl">
        <div className="ui-panel-header">
          <div>
            <h2 className="font-display text-xl font-medium">Pick products</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {section.title} — {picked.length} selected. Only approved brands' products listed.
            </p>
          </div>
        </div>
        <div className="ui-panel-body">
          {error && <div className="ui-error mb-4">{error}</div>}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading…</span>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="min-w-0">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Selected ({picked.length})
                </h3>
                {picked.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    No products yet. Pick from the right.
                  </p>
                ) : (
                  <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
                    {picked.map((p) => (
                      <ProductRow key={p.id} p={p} action="remove" onClick={() => remove(p)} />
                    ))}
                  </ul>
                )}
              </div>
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-2">
                  <input
                    placeholder="Search approved products…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
                  />
                </div>
                {filteredAll.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    No products available. Approve brands first.
                  </p>
                ) : (
                  <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
                    {filteredAll.map((p) => (
                      <ProductRow key={p.id} p={p} action="add" onClick={() => add(p)} />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="ui-panel-footer">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Saving…</> : <><Save className="mr-2 size-4" /> Save selection</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProductRow({ p, action, onClick }: { p: PickerProduct; action: "add" | "remove"; onClick: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-background p-2">
      {p.primaryImage ? (
        <img src={p.primaryImage} alt={p.name} className="size-10 rounded object-cover" />
      ) : (
        <div className="grid size-10 place-items-center rounded bg-muted text-[9px] text-muted-foreground">no img</div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{p.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {p.brand.name} · {p.category ?? "—"}
        </p>
      </div>
      <Button
        size="sm"
        variant={action === "add" ? "default" : "ghost"}
        onClick={onClick}
        className={action === "remove" ? "text-destructive hover:text-destructive" : ""}
      >
        {action === "add" ? <Plus className="size-3.5" /> : <XCircle className="size-3.5" />}
      </Button>
    </li>
  );
}

// ======================================================
// EDITORIAL MANAGER — single block (upsert)
// ======================================================
function EditorialManager() {
  const [editorial, setEditorial] = useState<Editorial | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    steps: [""],
    isActive: true,
  });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await adminStorefrontApi.getEditorial();
      setEditorial(res.editorial);
      if (res.editorial) {
        setForm({
          title: res.editorial.title,
          steps: res.editorial.steps.length > 0 ? res.editorial.steps : [""],
          isActive: res.editorial.isActive,
        });
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function addStep() {
    setForm((f) => ({ ...f, steps: [...f.steps, ""] }));
  }
  function removeStep(i: number) {
    setForm((f) => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }));
  }
  function setStep(i: number, v: string) {
    setForm((f) => ({ ...f, steps: f.steps.map((s, idx) => (idx === i ? v : s)) }));
  }

  async function save() {
    setError("");
    const cleaned = form.steps.map((s) => s.trim()).filter(Boolean);
    if (!form.title.trim()) return setError("Title is required");
    if (cleaned.length === 0) return setError("Add at least one step");
    setSaving(true);
    try {
      await adminStorefrontApi.upsertEditorial({
        title: form.title.trim(),
        steps: cleaned,
        isActive: form.isActive,
      });
      swalSuccess("Editorial saved");
      load();
    } catch (e: any) {
      setError(e?.message || "Save failed");
      setSaving(false);
    }
  }

  async function remove() {
    if (!(await swalConfirm("Delete editorial?", "The editorial section will be hidden from the storefront."))) return;
    try {
      await adminStorefrontApi.deleteEditorial();
      setEditorial(null);
      setForm({ title: "", steps: [""], isActive: true });
      swalSuccess("Editorial deleted");
    } catch (e: any) {
      swalError(e?.message);
    }
  }

  return (
    <Panel>
      <SectionTitle
        title="Editorial block"
        description="The 'loop' section on the homepage. Explain how StyleAI works in simple steps."
        action={
          editorial ? (
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={remove}>
              <Trash2 className="size-4" /> Delete
            </Button>
          ) : null
        }
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      ) : (
        <div className="space-y-5">
          <Field label="Title *">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Behind every piece: the StyleAI loop."
            />
          </Field>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Steps ({form.steps.length})
              </p>
              <Button size="sm" variant="outline" onClick={addStep}>
                <Plus className="size-3.5" /> Add step
              </Button>
            </div>
            <div className="space-y-2">
              {form.steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-xs font-medium tabular-nums">
                    {i + 1}
                  </span>
                  <Input
                    value={s}
                    onChange={(e) => setStep(i, e.target.value)}
                    placeholder={`Step ${i + 1}`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => removeStep(i)}
                    disabled={form.steps.length <= 1}
                    aria-label={`Remove step ${i + 1}`}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="size-4"
            />
            Visible on storefront
          </label>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <><Loader2 className="mr-2 size-4 animate-spin" /> Saving…</>
              ) : (
                <><Save className="mr-2 size-4" /> {editorial ? "Save changes" : "Publish editorial"}</>
              )}
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

// ======================================================
// HELPERS
// ======================================================
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Empty({ icon: Icon, title, body }: { icon: typeof ImageIcon; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-12 text-center">
      <Icon className="mx-auto size-6 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}