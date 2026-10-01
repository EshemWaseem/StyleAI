// components/product/AngleGenerator.tsx
// ======================================================
// AI-powered product angle generator
// Uses Gemini 2.5 Flash Image via Node → FastAPI
// Returns Cloudinary URLs (Node uploads them)
// ======================================================

import { useState } from "react";
import { Loader2, Sparkles, X, Check, ImageIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiApi, type AngleVariant } from "@/lib/ai";

interface Props {
  file: File;
  onUseAngles: (urls: { url: string; publicId: string; label: string }[]) => void;
  onClose: () => void;
}

const ANGLE_OPTIONS = [
  { key: "side", label: "Side view" },
  { key: "three_quarter", label: "3/4 angle" },
  { key: "detail", label: "Detail close-up" },
  { key: "back", label: "Back view" },
  { key: "flat_lay", label: "Flat lay" },
];

const MAX_ANGLES = 3;

export function AngleGenerator({ file, onUseAngles, onClose }: Props) {
  const [selected, setSelected] = useState<string[]>([
    "side",
    "three_quarter",
    "detail",
  ]);
  const [angles, setAngles] = useState<AngleVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  function toggleAngle(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function generate() {
    setLoading(true);
    setError("");
    setAngles([]);
    setElapsed(0);

    const t0 = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.round((Date.now() - t0) / 1000)),
      1000
    );

    try {
      const res = await aiApi.generateAngles(file, selected);
      setAngles(res.variants);
      setPicked(new Set(res.variants.map((v) => v.key)));
    } catch (e: any) {
      setError(e?.message || "Generation failed. Please try again.");
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  }

  function togglePick(key: string) {
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }

  function useSelected() {
    const pickedAngles = angles
      .filter((a) => picked.has(a.key))
      .map((a) => ({ url: a.url, publicId: a.publicId, label: a.label }));
    if (pickedAngles.length === 0) return;
    onUseAngles(pickedAngles);
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-3xl rounded-xl border border-border bg-card shadow-lift">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-medium">
              Generate AI angles
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              AI creates side / 3-4 / detail views of the{" "}
              <strong className="text-foreground">same</strong> product — no
              design changes.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={loading}
            title="Close"
          >
            <X />
          </Button>
        </div>

        {/* BODY */}
        <div className="space-y-5 p-6">
          {/* Angle picker */}
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Angles to generate
              </p>
              <p className="text-[10px] text-muted-foreground">
                {selected.length}/{MAX_ANGLES} selected
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {ANGLE_OPTIONS.map((o) => {
                const on = selected.includes(o.key);
                const disabled = !on && selected.length >= MAX_ANGLES;
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => !disabled && toggleAngle(o.key)}
                    disabled={loading || disabled}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      on
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border text-muted-foreground hover:border-accent/40"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generate button */}
          <Button
            type="button"
            onClick={generate}
            disabled={loading || selected.length === 0}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Generating {selected.length} angle
                {selected.length === 1 ? "" : "s"}… {elapsed}s
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-4" />
                Generate with AI
              </>
            )}
          </Button>

          {loading && elapsed > 20 && (
            <p className="text-center text-xs text-muted-foreground">
              AI image generation can take 30–90 seconds per angle. Please wait…
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results grid */}
          {angles.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Generated ({picked.size} selected)
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {angles.map((a) => {
                  const on = picked.has(a.key);
                  return (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => togglePick(a.key)}
                      className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                        on
                          ? "border-accent"
                          : "border-border hover:border-accent/40"
                      }`}
                    >
                      <img
                        src={a.url}
                        alt={a.label}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5 text-left text-[10px] font-medium text-white">
                        {a.label}
                      </div>
                      {on && (
                        <div className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-accent text-accent-foreground shadow">
                          <Check className="size-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && angles.length === 0 && !error && (
            <div className="rounded-lg border border-dashed border-border bg-muted/10 p-8 text-center">
              <ImageIcon className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-2 text-xs text-muted-foreground">
                Pick angles above and click <strong>Generate</strong> to start.
              </p>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between gap-2 border-t border-border px-6 py-4">
          <p className="text-[10px] text-muted-foreground">
            AI preserves color, material, and design exactly.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={useSelected}
              disabled={picked.size === 0 || loading}
            >
              <ImageIcon className="mr-2 size-4" />
              Add {picked.size} image{picked.size === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}