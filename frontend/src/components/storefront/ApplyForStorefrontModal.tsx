import { useState, useEffect } from "react";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { brandStorefrontApi, type ProductPlacement } from "@/lib/storefront";
import { productsApi, type Product } from "@/lib/products";
import { cn } from "@/lib/utils";

const PLACEMENTS: { value: ProductPlacement; label: string; desc: string }[] = [
  { value: "ECOM", label: "E-commerce", desc: "Standard product listing" },
  { value: "TRENDING", label: "Trending", desc: "Featured in trending" },
  { value: "HERO", label: "Hero", desc: "Homepage slideshow" },
];

export function ApplyForStorefrontModal({
  onClose,
  onSubmitted,
}: {
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  const [selections, setSelections] = useState<Record<string, ProductPlacement | "">>({});
  const [notes, setNotes] = useState("");

  useEffect(() => {
    productsApi.list()
      .then((r) => setProducts(r.products || []))
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
    const entries = Object.entries(selections).filter(
      ([, v]) => v !== "" && v !== undefined
    ) as [string, ProductPlacement][];

    if (entries.length === 0) {
      setError("Select at least one product.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await brandStorefrontApi.apply({
        products: entries.map(([id, placement]) => ({ id, placement })),
        notes: notes.trim() || undefined,
      });
      onSubmitted();
    } catch (e: any) {
      setError(e?.message || "Application failed.");
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = Object.keys(selections).length;

  return (
    <div className="ui-overlay" role="dialog" aria-modal="true">
      <div className="ui-panel ui-panel-xl">
        <div className="ui-panel-header">
          <div>
            <h2 className="font-display text-xl font-medium">Apply for Storefront</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose products to feature publicly. Admin approval required.
            </p>
          </div>
        </div>

        <div className="ui-panel-body space-y-5">
          {error && <div className="ui-error">{error}</div>}

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Select products ({selectedCount} selected)
              </p>
              {products.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCount === products.length) setSelections({});
                    else {
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
              <div className="flex items-center justify-center py-8">
                <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading products…</span>
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                You have no products yet. Add products to apply.
              </div>
            ) : (
              <ul className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">
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
                        />
                        {p.primaryImage ? (
                          <img src={p.primaryImage} alt={p.name} className="size-10 shrink-0 rounded object-cover" />
                        ) : (
                          <div className="grid size-10 shrink-0 place-items-center rounded bg-muted text-[9px] text-muted-foreground">No img</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{p.category ?? "—"}</p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="border-t border-border/60 bg-background/50 px-3 py-2.5">
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Placement
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {PLACEMENTS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setPlacement(p.id, opt.value)}
                                title={opt.desc}
                                className={cn(
                                  "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                                  sel === opt.value
                                    ? "border-accent bg-accent text-accent-foreground"
                                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                                )}
                              >
                                {opt.label}
                              </button>
                            ))}
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
            <Label>Notes for Admin (Optional)</Label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific instructions…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="ui-panel-footer">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving || selectedCount === 0}>
            {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Submitting…</> : <><Send className="mr-2 size-4" /> Apply ({selectedCount})</>}
          </Button>
        </div>
      </div>
    </div>
  );
}