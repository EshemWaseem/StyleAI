// components/offers/OfferBuilder.tsx
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Loader2, Save, Calculator, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { offersApi } from "@/lib/offers";
import type { OfferEstimate } from "@/lib/offers";
import { pricingApi } from "@/lib/pricing";
import type { PlatformCatalogEntry, PricingTiers } from "@/lib/pricing";
import { productsApi, type Product } from "@/lib/products";

interface DraftItem {
  id: string;
  platform: string;
  contentType: string;
  quantity: number;
  unitPrice: number;
}

interface Props {
  brandId: string;
  influencerId: string;
  influencerName: string;
  influencerPricing: PricingTiers;
  onCreated?: (offerId: string) => void;
  onCancel?: () => void;
}

export function OfferBuilder({
  brandId,
  influencerId,
  influencerName,
  influencerPricing,
  onCreated,
  onCancel,
}: Props) {
  const [catalog, setCatalog] = useState<PlatformCatalogEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [title, setTitle] = useState("");
  const [brandNote, setBrandNote] = useState("");
  const [estimate, setEstimate] = useState<OfferEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ---- load platform catalog + brand products ----
  useEffect(() => {
    pricingApi.listPlatforms().then((r) => {
      setCatalog(r.platforms);
      const first = firstPricedTier(influencerPricing);
      if (first) {
        setItems([
          {
            id: crypto.randomUUID(),
            platform: first.platform,
            contentType: first.contentType,
            quantity: 1,
            unitPrice: first.unitPrice,
          },
        ]);
      }
    });

    productsApi.list()
      .then((r) => setProducts(r.products || []))
      .catch(() => setProducts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- live estimate ----
  useEffect(() => {
    if (items.length === 0) {
      setEstimate(null);
      return;
    }
    const timer = setTimeout(async () => {
      setEstimating(true);
      setError("");
      try {
        const r = await offersApi.estimate({
          influencerId,
          items: items.map(({ platform, contentType, quantity, unitPrice }) => ({
            platform,
            contentType,
            quantity,
            unitPrice,
          })),
        });
        setEstimate(r);
      } catch (e: any) {
        setError(e?.message || "Estimate failed");
        setEstimate(null);
      } finally {
        setEstimating(false);
      }
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items)]);

  const platformOptions = useMemo(() => catalog, [catalog]);

  function addLine() {
    const first = catalog[0];
    if (!first) return;
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        platform: first.key,
        contentType: first.contentTypes[0] || "post",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  }

  function removeLine(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateLine(id: string, patch: Partial<DraftItem>) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const next = { ...i, ...patch };
        if ((patch.platform || patch.contentType) && !patch.unitPrice) {
          const suggested =
            influencerPricing?.[next.platform as keyof PricingTiers]?.[next.contentType];
          if (typeof suggested === "number") next.unitPrice = suggested;
        }
        return next;
      })
    );
  }

  async function create() {
    setSaving(true);
    setError("");
    try {
      const payload: any = {
        brandId,
        influencerId,
        items: items.map(({ platform, contentType, quantity, unitPrice }) => ({
          platform,
          contentType,
          quantity,
          unitPrice,
        })),
      };
      if (title.trim()) payload.title = title.trim();
      if (brandNote.trim()) payload.brandNote = brandNote.trim();
      if (productId) payload.productId = productId;

      const r = await offersApi.create(payload);
      onCreated?.(r.offer.id);
    } catch (e: any) {
      setError(e?.message || "Failed to create offer");
    } finally {
      setSaving(false);
    }
  }

  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <div className="space-y-5">
      {/* Product picker */}
      {products.length > 0 && (
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Product (optional)
          </label>
          <div className="mt-1 flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
            <Package className="size-4 text-muted-foreground shrink-0" />
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
            >
              <option value="">— No specific product —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.sku}
                </option>
              ))}
            </select>
          </div>
          {selectedProduct && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Influencer will shoot this product. Brands and agencies will see it on the campaign.
            </p>
          )}
          {!selectedProduct && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Link a product so the influencer knows exactly what to shoot.
            </p>
          )}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Title (optional)
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`Campaign offer for ${influencerName}`}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {/* Line items */}
      <div className="rounded-lg border border-border">
        <div className="border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Line items
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            No items yet. Click "Add item" to start.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((it) => {
              const platform = catalog.find((c) => c.key === it.platform);
              const contentTypes = platform?.contentTypes || [];
              const lineTotal = (it.unitPrice || 0) * (it.quantity || 0);
              return (
                <div key={it.id} className="grid grid-cols-12 gap-2 px-4 py-3">
                  <div className="col-span-3">
                    <select
                      value={it.platform}
                      onChange={(e) => updateLine(it.id, { platform: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    >
                      {platformOptions.map((p) => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <select
                      value={it.contentType}
                      onChange={(e) => updateLine(it.id, { contentType: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    >
                      {contentTypes.map((ct) => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      value={it.quantity}
                      onChange={(e) =>
                        updateLine(it.id, { quantity: Math.max(1, Number(e.target.value) || 1) })
                      }
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={it.unitPrice}
                      onChange={(e) =>
                        updateLine(it.id, { unitPrice: Number(e.target.value) || 0 })
                      }
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm tabular-nums"
                    />
                  </div>

                  <div className="col-span-1 flex items-center justify-end text-sm tabular-nums">
                    {lineTotal.toFixed(2)}
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(it.id)}
                      aria-label="Remove"
                      title="Remove"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="border-t border-border px-4 py-3">
          <Button variant="outline" size="sm" onClick={addLine}>
            <Plus className="mr-1 size-4" /> Add item
          </Button>
        </div>
      </div>

      {/* Brand note */}
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Brand note (optional)
        </label>
        <textarea
          value={brandNote}
          onChange={(e) => setBrandNote(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Message for the admin or influencer…"
        />
      </div>

      {/* Estimate */}
      <div className="rounded-lg border border-border bg-accent/5 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Calculator className="size-4 text-accent" />
          <h3 className="text-sm font-medium">Live estimate</h3>
          {estimating && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
        </div>

        {!estimate ? (
          <p className="text-xs text-muted-foreground">Add at least one item.</p>
        ) : (
          <dl className="space-y-1 text-sm">
            <Row label="Subtotal" value={fmt(estimate.subtotal, estimate.currency)} />
            {estimate.discountAmount > 0 && (
              <Row
                label={`Bulk discount (${estimate.discountPct}%)`}
                value={`− ${fmt(estimate.discountAmount, estimate.currency)}`}
                muted
              />
            )}
            <Row
              label={`Admin fee (${estimate.adminFeePct}%)`}
              value={`+ ${fmt(estimate.adminFee, estimate.currency)}`}
              muted
            />
            <div className="mt-2 border-t border-border pt-2">
              <Row label="Total" value={fmt(estimate.total, estimate.currency)} bold />
            </div>
          </dl>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        )}
        <Button onClick={create} disabled={saving || items.length === 0}>
          {saving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" /> Creating…
            </>
          ) : (
            <>
              <Save className="mr-2 size-4" /> Save as draft
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ======================================================
// Helpers
// ======================================================
function Row({
  label, value, muted, bold,
}: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? "text-muted-foreground" : ""}>{label}</dt>
      <dd className={`tabular-nums ${bold ? "text-base font-medium" : ""}`}>{value}</dd>
    </div>
  );
}

function fmt(n: number, currency: string) {
  return `${currency} ${Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function firstPricedTier(tiers: PricingTiers) {
  for (const platform of Object.keys(tiers)) {
    const inner = tiers[platform as keyof PricingTiers];
    if (!inner) continue;
    for (const [contentType, unitPrice] of Object.entries(inner)) {
      return { platform, contentType, unitPrice: Number(unitPrice) };
    }
  }
  return null;
}