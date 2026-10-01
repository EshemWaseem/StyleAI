import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle, Loader2, Plus, Trash2, X, Sparkles, Clock, Eye, Save,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { listingsApi } from "@/lib/listings";
import type { Listing } from "@/lib/listings";
import { pricingApi } from "@/lib/pricing";
import type { PlatformCatalogEntry } from "@/lib/pricing";

export const Route = createFileRoute("/influencer/offers")({
  head: () => ({ meta: [{ title: "My Offers — StyleAI" }] }),
  component: MyListingsPage,
});

function MyListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await listingsApi.list({ limit: 100 });
      setListings(Array.isArray(r?.listings) ? r.listings : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function cancel(id: string) {
    if (!confirm("Cancel this offer? Brands will no longer see it.")) return;
    try {
      await listingsApi.cancel(id);
      setListings((prev) => prev.map((l) => l.id === id ? { ...l, status: "CANCELLED" as any } : l));
    } catch (e: any) { alert(e?.message || "Failed"); }
  }

  return (
    <ProtectedRoute roles={["INFLUENCER"]}>
      <AppShell breadcrumb={["Influencer", "My Offers"]}>
        <PageHeader
          eyebrow="Promotions"
          title="My public offers"
          description="Publish special offers visible to brands. They expire automatically."
          actions={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-1 size-4" /> New offer
            </Button>
          }
        />

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="mt-12 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading…</span>
          </div>
        ) : listings.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
            <Sparkles className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No offers published</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Publish a special offer like "Christmas Special" so brands can browse and claim it.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} onCancel={cancel} />
            ))}
          </div>
        )}

        {showCreate && (
          <CreateListingModal
            onClose={() => setShowCreate(false)}
            onCreated={() => { setShowCreate(false); load(); }}
          />
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

function ListingCard({ listing, onCancel }: { listing: Listing; onCancel: (id: string) => void }) {
  const expired = new Date(listing.expiresAt) < new Date();
  const statusColor: Record<string, string> = {
    ACTIVE: expired ? "bg-muted text-muted-foreground" : "bg-emerald-500/15 text-emerald-500",
    EXPIRED: "bg-muted text-muted-foreground",
    CANCELLED: "bg-muted text-muted-foreground",
    CLAIMED: "bg-blue-500/15 text-blue-500",
  };
  const badge = expired ? "EXPIRED" : listing.status;
  const daysLeft = Math.max(0, Math.ceil((new Date(listing.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-lg leading-tight truncate">{listing.title}</h3>
            {listing.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{listing.description}</p>
            )}
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${statusColor[badge]}`}>
            {badge}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {(listing.items || []).map((it, i) => (
          <div key={i} className="flex justify-between text-xs">
            <span className="capitalize text-muted-foreground">
              {it.platform} · {it.contentType} × {it.quantity}
            </span>
            <span className="tabular-nums font-medium">
              {listing.currency} {it.lineTotal.toFixed(2)}
            </span>
          </div>
        ))}
        <div className="border-t border-border pt-2 flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular-nums font-medium">
            {listing.currency} {listing.subtotal.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="border-t border-border px-4 py-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" />
          {expired ? "Expired" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
        </span>
        <span className="inline-flex items-center gap-1">
          <Eye className="size-3" /> {listing.viewCount}
        </span>
      </div>

      {listing.status === "ACTIVE" && !expired && (
        <div className="border-t border-border px-4 py-2">
          <Button variant="ghost" size="sm" className="w-full text-destructive" onClick={() => onCancel(listing.id)}>
            <Trash2 className="mr-1 size-3" /> Cancel offer
          </Button>
        </div>
      )}
    </div>
  );
}

interface DraftItem {
  id: string;
  platform: string;
  contentType: string;
  quantity: number;
  unitPrice: number;
}

function CreateListingModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [catalog, setCatalog] = useState<PlatformCatalogEntry[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [validDays, setValidDays] = useState(7);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    pricingApi.listPlatforms().then((r) => {
      setCatalog(r.platforms);
      const first = r.platforms[0];
      if (first) {
        setItems([{
          id: crypto.randomUUID(),
          platform: first.key,
          contentType: first.contentTypes[0] || "post",
          quantity: 1,
          unitPrice: 0,
        }]);
      }
    });
  }, []);

  function addLine() {
    const first = catalog[0];
    if (!first) return;
    setItems((prev) => [...prev, {
      id: crypto.randomUUID(),
      platform: first.key,
      contentType: first.contentTypes[0] || "post",
      quantity: 1,
      unitPrice: 0,
    }]);
  }
  function removeLine(id: string) { setItems((prev) => prev.filter((i) => i.id !== id)); }
  function updateLine(id: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, ...patch } : i));
  }

  const subtotal = items.reduce((s, it) => s + (it.unitPrice || 0) * (it.quantity || 0), 0);

  async function save() {
    setError("");
    if (title.trim().length < 3) return setError("Title must be at least 3 characters");
    if (items.length === 0) return setError("Add at least one item");
    if (items.some((i) => !i.unitPrice || i.unitPrice <= 0)) return setError("Each item needs a price > 0");

    setSaving(true);
    try {
      const payload: any = {
  title: title.trim(),
  validDays,
  items: items.map(({ platform, contentType, quantity, unitPrice }) => ({
          platform, contentType, quantity, unitPrice,
        })),
      };
      const descTrim = description.trim();
      if (descTrim) payload.description = descTrim;
      
      await listingsApi.create(payload);
      onCreated();
    } catch (e: any) {
      setError(e?.message || "Failed to create");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-xl border border-border bg-card shadow-lift">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-medium">Publish a new offer</h2>
          {/* <Button variant="ghost" size="icon" onClick={onClose} disabled={saving}><X /></Button> */}
          <Button variant="ghost" size="icon" onClick={onClose} disabled={saving} title="Close" aria-label="Close">
            <X />
          </Button>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="title">Offer name *</Label>
              <Input
                id="title" value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Christmas Special"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="valid">Valid for (days) *</Label>
              <Input
                id="valid" type="number" min={1} max={365}
                value={validDays}
                onChange={(e) => setValidDays(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="desc">Description (optional)</Label>
            <textarea
              id="desc" rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Festive bundle for holiday campaigns…"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="rounded-lg border border-border">
            <div className="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Items
            </div>
            <div className="divide-y divide-border">
              {items.map((it) => {
                const platform = catalog.find((c) => c.key === it.platform);
                return (
                  <div key={it.id} className="grid grid-cols-12 gap-2 p-3">
                    <select
                      value={it.platform}
                      onChange={(e) => {
                        const p = catalog.find((c) => c.key === e.target.value);
                        updateLine(it.id, { platform: e.target.value, contentType: p?.contentTypes[0] || "post" });
                      }}
                      className="col-span-3 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    >
                      {catalog.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                    <select
                      value={it.contentType}
                      onChange={(e) => updateLine(it.id, { contentType: e.target.value })}
                      className="col-span-3 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    >
                      {(platform?.contentTypes || []).map((ct) => <option key={ct} value={ct}>{ct}</option>)}
                    </select>
                    <input
                      type="number" min={1} value={it.quantity}
                      onChange={(e) => updateLine(it.id, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                      className="col-span-2 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    />
                    <input
                      type="number" min={0} step="0.01" value={it.unitPrice}
                      onChange={(e) => updateLine(it.id, { unitPrice: Number(e.target.value) || 0 })}
                      placeholder="Price"
                      className="col-span-3 rounded-md border border-input bg-background px-2 py-1.5 text-sm tabular-nums"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeLine(it.id)} className="col-span-1">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-border p-3">
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="mr-1 size-4" /> Add item
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-muted/30 p-3 text-sm">
            <div className="flex justify-between font-medium">
              <span>Subtotal</span>
              <span className="tabular-nums">USD {subtotal.toFixed(2)}</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Brand pays this + brand fee at claim time.
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            Publish offer
          </Button>
        </div>
      </div>
    </div>
  );
}