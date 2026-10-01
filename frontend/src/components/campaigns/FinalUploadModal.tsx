import { useState } from "react";
import { Loader2, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUploader } from "@/components/upload/FileUploader";
import type { UploadedFile } from "@/lib/upload/api";
import { campaignsApi } from "@/lib/campaigns";

interface Props {
  campaignId: string;
  deliverableId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export function FinalUploadModal({ campaignId, deliverableId, onClose, onSubmitted }: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [caption, setCaption] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (files.length === 0) return setError("Upload at least one file");
    setSaving(true);
    try {
      await campaignsApi.submitFinal(deliverableId, {
        files: files.map((f) => ({ url: f.url, publicId: f.publicId, type: f.resourceType, name: f.originalName })),
        caption: caption.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onSubmitted();
    } catch (err: any) {
      setError(err?.message || "Failed to submit");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="my-8 w-full max-w-2xl rounded-xl border border-border bg-card shadow-lift">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-medium">Upload final edited content</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={saving} title="Close"><X /></Button>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-muted-foreground">
            Final edited files. Brand will review and either approve or request changes.
          </div>

          <FileUploader
            campaignId={campaignId}
            deliverableId={deliverableId}
            onUploaded={setFiles}
          />

          <div>
            <Label htmlFor="caption">Caption (final)</Label>
            <Input id="caption" value={caption} onChange={(e) => setCaption(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label htmlFor="notes">Editing notes (optional)</Label>
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
          <Button type="submit" disabled={saving || files.length === 0}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
            Submit for brand review
          </Button>
        </div>
      </form>
    </div>
  );
}