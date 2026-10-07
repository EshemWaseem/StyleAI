// components/campaigns/ShipProductModal.tsx
import { useState } from "react";
import { X, Loader2, AlertCircle, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { campaignsApi } from "@/lib/campaigns";
import type { Campaign } from "@/lib/campaigns";

const CARRIERS = ["TCS", "Leopard", "DHL", "FedEx", "Pakistan Post", "Other"];

interface Props {
  campaignId: string;
  onClose: () => void;
  onSaved: (c: Campaign) => void;
}

export function ShipProductModal({ campaignId, onClose, onSaved }: Props) {
  const [carrier, setCarrier] = useState("TCS");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!carrier.trim()) {
      setError("Carrier is required");
      return;
    }
    if (!trackingNumber.trim()) {
      setError("Tracking number is required");
      return;
    }

    setSaving(true);
    try {
      const res = await campaignsApi.ship(campaignId, {
        carrier: carrier.trim(),
        trackingNumber: trackingNumber.trim(),
        note: note.trim() || undefined,
      });
      onSaved(res.campaign);
    } catch (err: any) {
      setError(err?.message || "Failed to mark shipped");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-6">
      <div className="my-4 w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Truck className="size-4 text-accent" />
            <h3 className="text-sm font-medium">Mark as shipped</h3>
          </div>
          <button onClick={onClose} disabled={saving} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="carrier">Carrier</Label>
            <div className="flex flex-wrap gap-2">
              {CARRIERS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCarrier(c)}
                  disabled={saving}
                  className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                    carrier === c
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <Input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              disabled={saving}
              placeholder="Or type a custom carrier"
              className="mt-2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tracking">Tracking number *</Label>
            <Input
              id="tracking"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. TCS123456789"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Any special instructions for the influencer"
              disabled={saving}
            />
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
              {saving ? <><Loader2 className="mr-1.5 size-3.5 animate-spin" /> Marking…</> : "Mark as shipped"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}