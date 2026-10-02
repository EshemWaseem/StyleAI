import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Clock, Eye, Package, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { listingsApi } from "@/lib/listings";
import type { Listing } from "@/lib/listings";
import { http } from "@/lib/api";

export const Route = createFileRoute("/offers/browse")({
  head: () => ({ meta: [{ title: "Browse Offers — StyleAI" }] }),
  component: BrowseOffersPage,
});

function BrowseOffersPage() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [brandId, setBrandId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      listingsApi.list({ limit: 100 }),
      http.get<{ brands: any[] }>("/api/brands"),
    ])
      .then(([l, b]) => {
        setListings(Array.isArray(l?.listings) ? l.listings : []);
        setBrandId(b.brands?.[0]?.id ?? null);
      })
      .catch((e) => setError(e?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  async function claim(l: Listing) {
    if (!brandId) return alert("You need a brand first.");
    if (!confirm(`Claim "${l.title}" for your brand?`)) return;
    setBusy(l.id);
    try {
      const r = await listingsApi.claim(l.id, { brandId });
      navigate({ to: "/offers/$id", params: { id: r.offerId } });
    } catch (e: any) {
      alert(e?.message || "Failed to claim");
    } finally { setBusy(null); }
  }

  return (
    <ProtectedRoute roles={["BRAND_OWNER", "BRAND_TEAM_MEMBER", "AGENCY"]}>
      <>
        <PageHeader
          eyebrow="Marketplace"
          title="Browse creator offers"
          description="Special packages published by influencers — limited-time deals, ready to claim."
        />

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="mt-12 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading offers…</span>
          </div>
        ) : listings.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
            <Package className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No active offers right now.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => {
              const daysLeft = Math.max(0, Math.ceil((new Date(l.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
              return (
                <div key={l.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-start gap-3 p-4 border-b border-border">
                    {l.influencer?.avatarUrl ? (
                      <img src={l.influencer.avatarUrl} alt="" className="size-10 rounded-full object-cover" />
                    ) : (
                      <div className="grid size-10 place-items-center rounded-full bg-accent/15 text-accent text-sm font-medium">
                        {l.influencer?.displayName?.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{l.influencer?.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">@{l.influencer?.username}</p>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-display text-lg leading-tight">{l.title}</h3>
                      {l.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{l.description}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      {(l.items || []).map((it, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="capitalize text-muted-foreground">
                            {it.platform} · {it.contentType} × {it.quantity}
                          </span>
                          <span className="tabular-nums">
                            {l.currency} {it.lineTotal.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-border pt-2 flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="tabular-nums font-medium">
                        {l.currency} {l.subtotal.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" /> {daysLeft} day{daysLeft === 1 ? "" : "s"} left
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="size-3" /> {l.viewCount}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-border p-3">
                    <Button
                      className="w-full"
                      disabled={busy === l.id || !brandId}
                      onClick={() => claim(l)}
                    >
                      {busy === l.id ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 size-4" />
                      )}
                      Claim this offer
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    </ProtectedRoute>
  );
}