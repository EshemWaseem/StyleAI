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
    <div className="ui-overlay">  
      <form onSubmit={submit} className="ui-panel ui-panel-md">
        <div className="ui-panel-header">
          <h2 className="font-display text-lg font-medium">Enter metrics</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={saving} title="Close"><X /></Button>
        </div>

        <div className="ui-panel-body space-y-4">
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
            <div className="ui-error">
              {error}
            </div>
          )}
        </div>

        <div className="ui-panel-footer">
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