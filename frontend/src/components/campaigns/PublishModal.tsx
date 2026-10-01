import { useState } from "react";
import { Loader2, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { campaignsApi } from "@/lib/campaigns";

interface Props {
  deliverableId: string;
  defaultPlatform: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export function PublishModal({ deliverableId, defaultPlatform, onClose, onSubmitted }: Props) {
  const [platform, setPlatform] = useState(defaultPlatform.toUpperCase());
  const [postUrl, setPostUrl] = useState("");
  const [postId, setPostId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!postUrl.trim()) return setError("Post URL is required");

    setSaving(true);
    try {
      await campaignsApi.publishContent(deliverableId, {
        platform,
        postUrl: postUrl.trim(),
        postId: postId.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onSubmitted();
    } catch (err: any) {
      setError(err?.message || "Failed to publish");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="my-8 w-full max-w-lg rounded-xl border border-border bg-card shadow-lift">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-medium">Record publication</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={saving} title="Close"><X /></Button>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
            Paste the URL of the live post. This confirms the content is published.
          </div>

          <div>
            <Label htmlFor="platform">Platform *</Label>
            <select
              id="platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="INSTAGRAM">Instagram</option>
              <option value="TIKTOK">TikTok</option>
              <option value="YOUTUBE">YouTube</option>
              <option value="FACEBOOK">Facebook</option>
              <option value="LINKEDIN">LinkedIn</option>
              <option value="PINTEREST">Pinterest</option>
              <option value="X">X (Twitter)</option>
            </select>
          </div>

          <div>
            <Label htmlFor="url">Post URL *</Label>
            <Input
              id="url" value={postUrl} onChange={(e) => setPostUrl(e.target.value)}
              placeholder="https://instagram.com/p/..."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="postId">Post ID (optional)</Label>
            <Input id="postId" value={postId} onChange={(e) => setPostId(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <textarea
              id="notes" rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
            Mark as published
          </Button>
        </div>
      </form>
    </div>
  );
}