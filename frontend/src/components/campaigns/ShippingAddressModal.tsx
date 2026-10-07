// components/campaigns/ShippingAddressModal.tsx
import { useState } from "react";
import { X, Loader2, AlertCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { campaignsApi } from "@/lib/campaigns";
import type { ShippingAddress, Campaign } from "@/lib/campaigns";

interface Props {
  campaignId: string;
  initial?: ShippingAddress | null;
  onClose: () => void;
  onSaved: (c: Campaign) => void;
}

export function ShippingAddressModal({ campaignId, initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState<ShippingAddress>({
    fullName: initial?.fullName ?? "",
    phone: initial?.phone ?? "",
    street: initial?.street ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    postalCode: initial?.postalCode ?? "",
    country: initial?.country ?? "Pakistan",
    notes: initial?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof ShippingAddress>(key: K, val: ShippingAddress[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Client-side validation
    const required: (keyof ShippingAddress)[] = ["fullName", "phone", "street", "city", "country"];
    for (const k of required) {
      if (!form[k] || !String(form[k]).trim()) {
        setError(`Please fill in: ${k}`);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await campaignsApi.submitAddress(campaignId, { address: form });
      onSaved(res.campaign);
    } catch (err: any) {
      setError(err?.message || "Failed to submit address");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-6">
      <div className="my-4 w-full max-w-lg rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-accent" />
            <h3 className="text-sm font-medium">Shipping address</h3>
          </div>
          <button onClick={onClose} disabled={saving} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="fullName">Full name *</Label>
              <Input id="fullName" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} disabled={saving} autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+92 300 1234567" disabled={saving} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Input id="country" value={form.country} onChange={(e) => set("country", e.target.value)} disabled={saving} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="street">Street address *</Label>
              <Textarea id="street" value={form.street} onChange={(e) => set("street", e.target.value)} rows={2} disabled={saving} placeholder="House #, street, area" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} disabled={saving} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State / province</Label>
              <Input id="state" value={form.state ?? ""} onChange={(e) => set("state", e.target.value)} disabled={saving} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal code</Label>
              <Input id="postalCode" value={form.postalCode ?? ""} onChange={(e) => set("postalCode", e.target.value)} disabled={saving} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Delivery notes</Label>
              <Input id="notes" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="Ring bell twice" disabled={saving} />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="mr-1.5 size-3.5 animate-spin" /> Submitting…</> : "Submit address"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}