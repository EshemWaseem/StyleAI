import { useState } from "react";
import { Loader2, X, Upload, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUploader } from "@/components/upload/FileUploader";
import type { UploadedFile } from "@/lib/upload/api";
import { campaignsApi } from "@/lib/campaigns";

interface Props {
  campaignId: string;
  deliverableId: string;
  /** Current iteration count (0 for first upload) */
  currentIteration?: number;
  /** If previous was rejected, show feedback */
  previousFeedback?: string | null;
  onClose: () => void;
  onSubmitted: () => void;
}

export function RawUploadModal({
  campaignId,
  deliverableId,
  currentIteration = 0,
  previousFeedback,
  onClose,
  onSubmitted,
}: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [caption, setCaption] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isRevision = currentIteration > 0 && !!previousFeedback;
  const nextVersion = currentIteration + 1;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (files.length === 0) return setError("Upload at least one file");
    setSaving(true);
    try {
      await campaignsApi.submitRaw(deliverableId, {
        files: files.map((f) => ({
          url: f.url,
          publicId: f.publicId,
          type: f.resourceType,
          name: f.originalName,
        })),
        caption: caption.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onSubmitted();
    } catch (err: any) {
      setError(err?.message || "Failed to submit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="my-8 w-full max-w-2xl rounded-xl border border-border bg-card shadow-lift"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-medium">
              {isRevision ? "Upload revised version" : "Upload raw content"}
            </h2>
            {isRevision && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                This will be version <span className="font-medium text-accent">v{nextVersion}</span>
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={saving}
            title="Close"
          >
            <X />
          </Button>
        </div>

        <div className="space-y-5 p-6">
          {/* Info banner */}
          {isRevision ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
              <RefreshCw className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
              <div>
                <p className="font-medium text-amber-600">Revised upload</p>
                <p className="mt-0.5 text-muted-foreground">
                  Address the feedback below and upload a new version.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs text-muted-foreground">
              Upload raw photos/videos you shot. The agency will edit them next.
            </div>
          )}

          {/* Previous feedback */}
          {isRevision && previousFeedback && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  Feedback on v{currentIteration}
                </p>
                <p className="mt-1 whitespace-pre-line text-muted-foreground">
                  {previousFeedback}
                </p>
              </div>
            </div>
          )}

          <FileUploader
            campaignId={campaignId}
            deliverableId={deliverableId}
            onUploaded={setFiles}
          />

          <div>
            <Label htmlFor="caption">Caption (optional)</Label>
            <Input
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="notes">
              {isRevision ? "What changed?" : "Notes for agency (optional)"}
            </Label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isRevision
                  ? "Describe what you changed in this version…"
                  : "Mood, song preference, references…"
              }
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
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || files.length === 0}>
            {saving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : isRevision ? (
              <RefreshCw className="mr-2 size-4" />
            ) : (
              <Upload className="mr-2 size-4" />
            )}
            {isRevision ? `Submit v${nextVersion}` : "Submit raw content"}
          </Button>
        </div>
      </form>
    </div>
  );
}