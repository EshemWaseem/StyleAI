import { useState } from "react";
import { Loader2, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { campaignsApi } from "@/lib/campaigns";

interface Props {
  deliverableId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export function RejectModal({ deliverableId, onClose, onSubmitted }: Props) {
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (feedback.trim().length < 5) return setError("Please give clear feedback (min 5 chars)");
    setSaving(true);
    try {
      await campaignsApi.rejectContent(deliverableId, { feedback: feedback.trim() });
      onSubmitted();
    } catch (err: any) {
      setError(err?.message || "Failed to reject");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="my-8 w-full max-w-md rounded-xl border border-border bg-card shadow-lift">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-medium">Request changes</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={saving} title="Close"><X /></Button>
        </div>

        <div className="space-y-4 p-6">
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>The agency will be notified and can re-upload edited content.</span>
          </div>

          <div>
            <Label htmlFor="feedback">Feedback *</Label>
            <textarea
              id="feedback" rows={5}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What needs to change? Be specific."
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              autoFocus
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving} variant="destructive">
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Send feedback
          </Button>
        </div>
      </form>
    </div>
  );
}