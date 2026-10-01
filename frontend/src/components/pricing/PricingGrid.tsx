// components/pricing/PricingGrid.tsx
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pricingApi } from "@/lib/pricing";
import type { PlatformCatalogEntry, PricingTiers } from "@/lib/pricing";

interface Props {
  influencerId: string;
  initialTiers: PricingTiers;
  initialCurrency: string;
  initialMinBudget: number | null;
  initialAcceptsBundles: boolean | null;
  /** Only show platforms the influencer actually has social accounts on */
  activePlatforms?: string[];
  onSaved?: () => void;
}

export function PricingGrid({
  influencerId,
  initialTiers,
  initialCurrency,
  initialMinBudget,
  initialAcceptsBundles,
  activePlatforms,
  onSaved,
}: Props) {
  const [catalog, setCatalog] = useState<PlatformCatalogEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [tiers, setTiers] = useState<PricingTiers>(initialTiers || {});
  const [currency, setCurrency] = useState(initialCurrency || "USD");
  const [minBudget, setMinBudget] = useState<string>(
    initialMinBudget != null ? String(initialMinBudget) : ""
  );
  const [acceptsBundles, setAcceptsBundles] = useState<boolean | null>(
    initialAcceptsBundles
  );

  const [openPlatforms, setOpenPlatforms] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // ---- load catalog ----
  useEffect(() => {
    pricingApi
      .listPlatforms()
      .then((r) => {
        setCatalog(r.platforms);
        // default: open platforms that already have pricing
        const open: Record<string, boolean> = {};
        r.platforms.forEach((p) => {
          const hasTiers = tiers[p.key] && Object.keys(tiers[p.key] || {}).length > 0;
          const isActive = !activePlatforms || activePlatforms.includes(p.key);
          if (hasTiers || isActive) open[p.key] = true;
        });
        setOpenPlatforms(open);
      })
      .catch((e) => setError(e?.message || "Failed to load platform catalog"))
      .finally(() => setCatalogLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- visible catalog: prefer active platforms first ----
  const visibleCatalog = useMemo(() => {
    if (!activePlatforms || activePlatforms.length === 0) return catalog;
    const active = new Set(activePlatforms.map((p) => p.toUpperCase()));
    return [...catalog].sort((a, b) => {
      const aAct = active.has(a.key) ? 0 : 1;
      const bAct = active.has(b.key) ? 0 : 1;
      return aAct - bAct;
    });
  }, [catalog, activePlatforms]);

  // ---- edit one price ----
  function setPrice(platform: string, contentType: string, raw: string) {
    setTiers((prev) => {
      const next = { ...prev };
      const platformTiers = { ...(next[platform as any] || {}) };

      if (raw === "") {
        delete platformTiers[contentType];
      } else {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return prev;
        platformTiers[contentType] = n;
      }

      if (Object.keys(platformTiers).length === 0) {
        delete next[platform as any];
      } else {
        next[platform as any] = platformTiers;
      }
      return next;
    });
  }

  // ---- save ----
  async function save() {
    setSaving(true);
    setError("");
    setOkMsg("");
    try {
      await pricingApi.updatePricing(influencerId, {
        pricingTiers: tiers,
        currency: currency.trim().toUpperCase(),
        minBudget: minBudget.trim() === "" ? null : Number(minBudget),
        acceptsBundles,
      });
      setOkMsg("Pricing saved");
      setTimeout(() => setOkMsg(""), 2500);
      onSaved?.();
    } catch (e: any) {
      setError(e?.message || "Failed to save pricing");
    } finally {
      setSaving(false);
    }
  }

  if (catalogLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading platform catalog…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ============ Currency + min budget + bundles ============ */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Currency
          </label>
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="USD"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Min budget (optional)
          </label>
          <input
            type="number"
            min="0"
            value={minBudget}
            onChange={(e) => setMinBudget(e.target.value)}
            placeholder="No minimum"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Accepts bundles
          </label>
          <select
            value={acceptsBundles === null ? "null" : String(acceptsBundles)}
            onChange={(e) =>
              setAcceptsBundles(e.target.value === "null" ? null : e.target.value === "true")
            }
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="null">Not set</option>
            <option value="true">Yes — accept multi-item offers</option>
            <option value="false">No — single-item only</option>
          </select>
        </div>
      </div>

      {/* ============ Platform grid ============ */}
      <div className="rounded-lg border border-border">
        {visibleCatalog.map((p) => {
          const open = !!openPlatforms[p.key];
          const tiersForPlatform = tiers[p.key as keyof PricingTiers] || {};
          const tierCount = Object.keys(tiersForPlatform).length;
          const isActive = !activePlatforms || activePlatforms.includes(p.key);

          return (
            <div key={p.key} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() =>
                  setOpenPlatforms((prev) => ({ ...prev, [p.key]: !prev[p.key] }))
                }
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent/5"
              >
                <span className="flex items-center gap-2">
                  {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  <span className="font-medium">{p.label}</span>
                  {isActive && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase text-emerald-500">
                      Linked
                    </span>
                  )}
                  {tierCount > 0 && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
                      {tierCount} price{tierCount === 1 ? "" : "s"}
                    </span>
                  )}
                </span>
              </button>

              {open && (
                <div className="grid gap-3 border-t border-border bg-accent/5 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
                  {p.contentTypes.map((ct) => {
                    const value = tiersForPlatform[ct];
                    return (
                      <div key={ct}>
                        <label className="text-xs capitalize text-muted-foreground">
                          {ct.replace(/-/g, " ")}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={value ?? ""}
                          onChange={(e) => setPrice(p.key, ct, e.target.value)}
                          placeholder="—"
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm tabular-nums"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ============ Status + save ============ */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {okMsg && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
          {okMsg}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Save className="mr-2 size-4" /> Save pricing
            </>
          )}
        </Button>
      </div>
    </div>
  );
}