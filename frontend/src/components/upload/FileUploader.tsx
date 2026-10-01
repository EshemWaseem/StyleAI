import { useRef, useState } from "react";
import { Loader2, UploadCloud, X, CheckCircle2, Video, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadApi, type UploadedFile } from "@/lib/upload/api";

interface Props {
  campaignId: string;
  deliverableId: string;
  accept?: string;
  maxFiles?: number;
  maxSizeMb?: number;
  onUploaded: (files: UploadedFile[]) => void;
}

export function FileUploader({
  campaignId,
  deliverableId,
  accept = "image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm",
  maxFiles = 10,
  maxSizeMb = 15,
  onUploaded,
}: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handlePick(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    setError("");

    const arr = Array.from(selected);
    if (arr.length + files.length > maxFiles) {
      setError(`Max ${maxFiles} files. You already have ${files.length}.`);
      return;
    }
    for (const f of arr) {
      if (f.size > maxSizeMb * 1024 * 1024) {
        setError(`${f.name} exceeds ${maxSizeMb} MB`);
        return;
      }
    }

    setUploading(true);
    try {
      const result = await uploadApi.campaignFiles(campaignId, deliverableId, arr);
      const next = [...files, ...result];
      setFiles(next);
      onUploaded(next);
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(url: string) {
    const next = files.filter((f) => f.url !== url);
    setFiles(next);
    onUploaded(next);
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handlePick(e.dataTransfer.files);
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          drag ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"
        } ${uploading ? "opacity-60" : ""}`}
      >
        {uploading ? (
          <>
            <Loader2 className="mx-auto size-6 animate-spin text-accent" />
            <p className="mt-2 text-xs text-muted-foreground">Uploading…</p>
          </>
        ) : (
          <>
            <UploadCloud className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">
              Click or drag files to upload
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              JPG, PNG, WebP, MP4, MOV · Max {maxSizeMb} MB · Up to {maxFiles} files
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => handlePick(e.target.files)}
        />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {files.map((f) => (
            <div key={f.url} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted/20">
              {f.resourceType === "video" ? (
                <div className="grid h-full w-full place-items-center bg-muted">
                  <Video className="size-6 text-muted-foreground" />
                </div>
              ) : (
                <img src={f.url} alt={f.originalName} className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); remove(f.url); }}
                className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-background/90 text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                title="Remove"
              >
                <X className="size-3" />
              </button>
              <div className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded-full bg-background/80 px-1.5 py-0.5 text-[9px]">
                {f.resourceType === "video" ? (
                  <Video className="size-2.5" />
                ) : (
                  <ImageIcon className="size-2.5" />
                )}
                <span className="font-medium">{f.format?.toUpperCase()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-emerald-500">
          <CheckCircle2 className="size-3.5" />
          <span>{files.length} file{files.length === 1 ? "" : "s"} uploaded</span>
        </div>
      )}
    </div>
  );
}