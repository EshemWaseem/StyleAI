// components/dashboard/apply-for-storefront-modal.tsx
import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { productsApi, type Product as RealProduct } from "@/lib/products";
import {
  brandStorefrontApi, type ProductPlacement,
} from "@/lib/storefront";
import { cn } from "@/lib/utils";

const PLACEMENT_OPTIONS: Array<{
  value: ProductPlacement;
  label: string;
  desc: string;
}> = [
  { value: "ECOM", label: "E-commerce only", desc: "Standard product listing" },
  { value: "TRENDING", label: "+ Trending", desc: "Featured in trending sections" },
  { value: "HERO", label: "+ Slideshow", desc: "Eligible for homepage hero" },
];

export function ApplyForStorefrontModal({
  onClose,
  onSubmitted,
}: {
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [products, setProducts] = useState<RealProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState<
    Record<string, ProductPlacement | "">
  >({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    productsApi
      .list()
      .then((r) => setProducts(r.products))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  function toggleProduct(id: string) {
    setSelections((prev) => {
      const next = { ...prev };
      if (next[id] !== undefined) delete next[id];
      else next[id] = "ECOM";
      return next;
    });
  }

  function setPlacement(id: string, placement: ProductPlacement) {
    setSelections((prev) => ({ ...prev, [id]: placement }));
  }

  async function submit() {
    setError("");
    const entries = Object.entries(selections).filter(
      ([, v]) => v !== "" && v !== undefined
    ) as Array<[string, ProductPlacement]>;

    if (entries.length === 0) {
      setError("Select at least one product");
      return;
    }

    setSaving(true);
    try {
      await brandStorefrontApi.apply({
        products: entries.map(([id, placement]) => ({ id, placement })),
        notes: notes.trim() || undefined,
      });
      onSubmitted();
    } catch (e: any) {
      setError(e?.message || "Could not submit application");
      setSaving(false);
    }
  }

  const selectedCount = Object.keys(selections).length;

  return (
    <div className="ui-overlay" role="dialog" aria-modal="true">
      <div className="ui-panel ui-panel-xl">
        <div className="ui-panel-header">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-medium">Apply for storefront</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose products and how you want them featured. Admin will review and approve.
            </p>
          </div>
        </div>

        <div className="ui-panel-body space-y-5">
          {error && <div className="ui-error">{error}</div>}

          <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs text-muted-foreground">
            <p>
              <strong className="text-foreground">Placements:</strong>{" "}
              <span className="mx-1">•</span>
              <strong>E-commerce only</strong> → standard product listing
              <span className="mx-1">•</span>
              <strong>+ Trending</strong> → eligible for trending sections
              <span className="mx-1">•</span>
              <strong>+ Slideshow</strong> → eligible for homepage hero
            </p>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Select products ({selectedCount} selected)
              </p>
              {products.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCount === products.length) {
                      setSelections({});
                    } else {
                      const next: Record<string, ProductPlacement> = {};
                      for (const p of products) next[p.id] = "ECOM";
                      setSelections(next);
                    }
                  }}
                  className="text-xs text-accent hover:underline"
                >
                  {selectedCount === products.length ? "Clear all" : "Select all"}
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading products…</span>
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                You have no products yet. Add products first.
              </div>
            ) : (
              <ul className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
                {products.map((p) => {
                  const sel = selections[p.id];
                  const isSelected = sel !== undefined;
                  return (
                    <li
                      key={p.id}
                      className={cn(
                        "rounded-lg border bg-background transition-colors",
                        isSelected ? "border-accent/50 bg-accent/5" : "border-border"
                      )}
                    >
                      <div className="flex items-start gap-3 p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleProduct(p.id)}
                          className="mt-1 size-4 shrink-0 cursor-pointer"
                          aria-label={`Select ${p.name}`}
                        />
                        {p.primaryImage ? (
                          <img
                            src={p.primaryImage}
                            alt={p.name}
                            className="size-12 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <div className="grid size-12 shrink-0 place-items-center rounded bg-muted text-[9px] text-muted-foreground">
                            no img
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {p.category ?? "—"}
                            {p.sku ? ` · ${p.sku}` : ""}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="border-t border-border/60 bg-background/50 px-3 py-2.5">
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            How should this appear?
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {PLACEMENT_OPTIONS.map((opt) => {
                              const active = sel === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setPlacement(p.id, opt.value)}
                                  title={opt.desc}
                                  className={cn(
                                    "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                                    active
                                      ? "border-accent bg-accent text-accent-foreground"
                                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="apply-notes"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Notes for admin (optional)
            </Label>
            <textarea
              id="apply-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything our team should know about this application…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="ui-panel-footer">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || selectedCount === 0}>
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                <Send className="mr-2 size-4" /> Submit application ({selectedCount})
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}