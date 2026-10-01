import { useState } from "react";
import { Loader2, X, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { campaignsApi } from "@/lib/campaigns";

interface Props {
  deliverableId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export function MetricsModal({ deliverableId, onClose, onSubmitted }: Props) {
  const [form, setForm] = useState({
    reach: 0, impressions: 0, likes: 0, comments: 0,
    shares: 0, clicks: 0, conversions: 0, revenue: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function upd(k: keyof typeof form, v: string) {
    setForm((p) => ({ ...p, [k]: Number(v) || 0 }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await campaignsApi.enterMetrics(deliverableId, form);
      onSubmitted();
    } catch (err: any) {
      setError(err?.message || "Failed to save");
    } finally { setSaving(false); }
  }

  const fields: { key: keyof typeof form; label: string }[] = [
    { key: "reach", label: "Reach" },
    { key: "impressions", label: "Impressions" },
    { key: "likes", label: "Likes" },
    { key: "comments", label: "Comments" },
    { key: "shares", label: "Shares" },
    { key: "clicks", label: "Clicks" },
    { key: "conversions", label: "Conversions" },
    { key: "revenue", label: "Revenue (currency)" },
  ];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="my-8 w-full max-w-lg rounded-xl border border-border bg-card shadow-lift">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-medium">Enter metrics</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={saving} title="Close"><X /></Button>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key}>
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input
                  id={f.key}
                  type="number"
                  min={0}
                  value={form[f.key]}
                  onChange={(e) => upd(f.key, e.target.value)}
                  className="mt-1 tabular-nums"
                />
              </div>
            ))}
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <BarChart3 className="mr-2 size-4" />}
            Save metrics
          </Button>
        </div>
      </form>
    </div>
  );
}