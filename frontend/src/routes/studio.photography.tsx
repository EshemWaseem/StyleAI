// routes/studio.photography.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Camera, Loader2, Upload, X, Sparkles, AlertCircle, CheckCircle2,
  Image as ImageIcon, RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Panel, SectionTitle } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { productsApi, type Product } from "@/lib/products";
import {
  aiApi,
  type SceneMode,
  type PhotographyResult,
} from "@/lib/ai";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/photography")({
  head: () => ({ meta: [{ title: "AI Photography — StyleAI" }] }),
  component: PhotographyStudio,
});

const SCENES: { key: SceneMode; label: string }[] = [
  { key: "studio", label: "Studio" },
  { key: "luxury", label: "Luxury" },
  { key: "lifestyle", label: "Lifestyle" },
  { key: "outdoor", label: "Outdoor" },
  { key: "street", label: "Street" },
  { key: "minimal", label: "Minimal" },
  { key: "editorial", label: "Editorial" },
  { key: "ecommerce", label: "E-commerce" },
  { key: "social", label: "Social" },
];

const LIGHTINGS = ["soft daylight", "warm golden hour", "moody low-key", "bright studio", "natural window"];

function PhotographyStudio() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [scene, setScene] = useState<SceneMode>("studio");
  const [lighting, setLighting] = useState("soft daylight");
  const [includeModel, setIncludeModel] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("4:5");

  const [generating, setGenerating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<PhotographyResult | null>(null);
  const [error, setError] = useState("");

  // Load products
  useEffect(() => {
    productsApi
      .list()
      .then((r) => {
        const list = r.products || [];
        setProducts(list);
        if (list.length > 0) setProductId(list[0].id);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  // Auto-load product's primary image as source
  useEffect(() => {
    if (!productId) return;
    const p = products.find((x) => x.id === productId);
    if (!p) return;

    // If source file not manually chosen, use product image
    if (!sourceFile && p.primaryImage) {
      fetch(p.primaryImage)
        .then((r) => r.blob())
        .then((blob) => {
          const f = new File([blob], "product.jpg", { type: blob.type || "image/jpeg" });
          setSourceFile(f);
          setSourcePreview(URL.createObjectURL(f));
        })
        .catch(() => {});
    }
  }, [productId, products, sourceFile]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (sourcePreview) URL.revokeObjectURL(sourcePreview);
    setSourceFile(f);
    setSourcePreview(URL.createObjectURL(f));
    setResult(null);
    setError("");
  }

  function clearSource() {
    if (sourcePreview) URL.revokeObjectURL(sourcePreview);
    setSourceFile(null);
    setSourcePreview("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function generate() {
    if (!sourceFile) {
      setError("Upload or select a product image first.");
      return;
    }
    setGenerating(true);
    setError("");
    setResult(null);
    setElapsed(0);

    const t0 = Date.now();
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000);

    try {
      const res = await aiApi.generatePhotography(sourceFile, {
        scene,
        lighting,
        include_model: includeModel,
        aspect_ratio: aspectRatio,
      });
      setResult(res);
    } catch (e: any) {
      setError(e?.message || "Generation failed. Please try again.");
    } finally {
      clearInterval(timer);
      setGenerating(false);
    }
  }

  return (
    <ProtectedRoute>
      <AppShell breadcrumb={["AI Studio", "AI Photography"]}>
        <PageHeader
          eyebrow="AI Studio"
          title="AI Photography"
          description="Generate studio, luxury, or lifestyle scenes — your product stays the product."
        />

        {loading ? (
          <div className="mt-16 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading products…</span>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            {/* LEFT — controls */}
            <div className="space-y-4">
              <Panel className="space-y-4 p-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Source product
                  </label>
                  <select
                    value={productId}
                    onChange={(e) => {
                      setProductId(e.target.value);
                      clearSource();
                    }}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} · {p.sku}</option>
                    ))}
                  </select>
                </div>

                {/* Source image preview / upload */}
                {sourcePreview ? (
                  <div className="relative overflow-hidden rounded-lg border border-border">
                    <img src={sourcePreview} alt="Source" className="aspect-[4/5] w-full object-cover" />
                    <button
                      type="button"
                      onClick={clearSource}
                      className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-background/90"
                      title="Remove"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/10 text-muted-foreground hover:border-accent/50"
                  >
                    <Upload className="size-5" />
                    <span className="text-xs">Upload product image</span>
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFile}
                />
              </Panel>

              <Panel className="space-y-4 p-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Scene
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {SCENES.map((s) => {
                      const on = scene === s.key;
                      return (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => setScene(s.key)}
                          className={cn(
                            "rounded-md border px-2.5 py-1.5 text-[11px] font-medium",
                            on
                              ? "border-accent bg-accent/15 text-accent"
                              : "border-border text-muted-foreground hover:border-accent/40"
                          )}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Lighting
                  </p>
                  <select
                    value={lighting}
                    onChange={(e) => setLighting(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {LIGHTINGS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Aspect ratio
                  </p>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {["1:1", "4:5", "3:4", "16:9", "9:16"].map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeModel}
                    onChange={(e) => setIncludeModel(e.target.checked)}
                    className="size-4"
                  />
                  Include a model
                </label>

                <Button
                  onClick={generate}
                  disabled={generating || !sourceFile}
                  className="w-full"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Generating… {elapsed}s
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 size-4" />
                      Generate scene
                    </>
                  )}
                </Button>

                {generating && elapsed > 20 && (
                  <p className="text-center text-[11px] text-muted-foreground">
                    Generation + QA can take 40–120 seconds.
                  </p>
                )}
              </Panel>
            </div>

            {/* RIGHT — results */}
            <div className="space-y-6">
              {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!result && !generating && (
                <Panel className="py-16 text-center">
                  <Camera className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">Ready to shoot</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pick a scene, click Generate — AI will place your product and verify fidelity.
                  </p>
                </Panel>
              )}

              {result && (
                <>
                  <Panel>
                    <SectionTitle
                      title="Generated scene"
                      description={`${result.scene} · ${result.provider}:${result.model} · ${result.latency_ms}ms${result.regenerated ? " · regenerated" : ""}`}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Original</p>
                        {sourcePreview && (
                          <img
                            src={sourcePreview}
                            alt="Original"
                            className="mt-2 aspect-[4/5] w-full rounded-lg object-cover"
                          />
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Generated</p>
                        <img
                          src={result.image.url}
                          alt="Generated"
                          className="mt-2 aspect-[4/5] w-full rounded-lg object-cover"
                        />
                      </div>
                    </div>
                  </Panel>

                  <Panel>
                    <div className="flex items-start justify-between">
                      <SectionTitle
                        title="AI quality check"
                        description={result.quality.feedback || "Fidelity inspection"}
                      />
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium",
                          result.quality.passed
                            ? "bg-emerald-500/15 text-emerald-500"
                            : "bg-destructive/15 text-destructive"
                        )}
                      >
                        {result.quality.passed ? (
                          <><CheckCircle2 className="size-3.5" /> Passed</>
                        ) : (
                          <><AlertCircle className="size-3.5" /> Failed</>
                        )}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border p-3 text-center">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                          Overall
                        </p>
                        <p className={cn(
                          "mt-1 font-display text-2xl font-medium tabular-nums",
                          result.quality.overall >= 80 ? "text-emerald-500" :
                          result.quality.overall >= 60 ? "text-blue-500" : "text-amber-500"
                        )}>
                          {Math.round(result.quality.overall)}
                        </p>
                      </div>
                      {result.quality.checks.slice(0, 5).map((c) => (
                        <div key={c.label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                          <span className="text-xs text-muted-foreground">{c.label}</span>
                          <span className="text-sm font-medium tabular-nums">
                            {Math.round(c.value)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {!result.quality.passed && (
                      <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
                        <RotateCw className="mt-0.5 size-3.5 shrink-0" />
                        <span>
                          AI auto-regenerated once. Human review is still recommended before publishing.
                        </span>
                      </div>
                    )}
                  </Panel>
                </>
              )}
            </div>
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}