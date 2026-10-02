// routes/studio.content.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Sparkles, Loader2, RefreshCw, Copy, Check, Package, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, SectionTitle } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { productsApi, type Product } from "@/lib/products";
import {
  aiApi, type Platform,
  type PlatformContentResponse,
} from "@/lib/ai";

export const Route = createFileRoute("/studio/content")({
  head: () => ({ meta: [{ title: "Content Studio — StyleAI" }] }),
  component: ContentStudio,
});

const PLATFORMS: { key: Platform; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
  { key: "blog", label: "Blog" },
];

const TONES = ["confident", "playful", "elegant", "minimal", "bold"];

function ContentStudio() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [tone, setTone] = useState("confident");
  const [brandVoice, setBrandVoice] = useState("minimal");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<PlatformContentResponse | null>(null);
  const [error, setError] = useState("");

  // Load products once
  useEffect(() => {
    productsApi.list()
      .then((r) => {
        const list = r.products || [];
        setProducts(list);
        if (list.length > 0) setProductId(list[0].id);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  async function generate() {
    if (!productId) return;
    setGenerating(true);
    setError("");
    setResult(null);
    setElapsed(0);

    const t0 = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.round((Date.now() - t0) / 1000)),
      1000
    );

    try {
      const res = await aiApi.generatePlatformContent({
        platform,
        productId,
        tone,
        brand_voice: brandVoice,
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
      <>
        <PageHeader
          eyebrow="AI Studio"
          title="Content Studio"
          description="Generate platform-ready captions, scripts, and SEO copy from your product."
        />

        {loading ? (
          <div className="mt-16 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading products…</span>
          </div>
        ) : products.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
            <Package className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No products yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add a product first — content is generated from product attributes.
            </p>
          </div>
        ) : (
          <>
            {/* Controls */}
            <Panel className="mt-6 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Product
                  </label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.sku}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Tone
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {TONES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Brand voice
                  </label>
                  <input
                    value={brandVoice}
                    onChange={(e) => setBrandVoice(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </Panel>

            {/* Platform tabs */}
            <div className="mt-6 flex gap-1 border-b border-border">
              {PLATFORMS.map((p) => {
                const active = platform === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => { setPlatform(p.key); setResult(null); }}
                    className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "border-accent text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Generate button */}
            <div className="mt-4">
              <Button
                onClick={generate}
                disabled={generating || !productId}
                className="w-full"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Generating for {platform}… {elapsed}s
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 size-4" />
                    Generate {PLATFORMS.find((p) => p.key === platform)?.label} content
                  </>
                )}
              </Button>
            </div>

            {generating && elapsed > 15 && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                First run loads the model — can take 30–60 seconds.
              </p>
            )}

            {error && (
              <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="mt-8 space-y-4">
                <SectionTitle
                  title={`Generated ${result.platform} content`}
                  description={`Provider: ${result.provider} · ${result.model} · ${result.latency_ms}ms${result.retried ? " · retried" : ""}`}
                />
                <div className="grid gap-4">
                  {Object.entries(result.content).map(([key, value]) => (
                    <FieldCard key={key} fieldKey={key} value={value} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </>
    </ProtectedRoute>
  );
}

// ======================================================
// Field card — copy button per field
// ======================================================
function FieldCard({ fieldKey, value }: { fieldKey: string; value: any }) {
  const [copied, setCopied] = useState(false);

  const label = fieldKey
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const display = Array.isArray(value)
    ? value
        .map((v) => (typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)))
        .join("\n")
    : String(value);

  async function copy() {
    try {
      await navigator.clipboard.writeText(display);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={copy}
            title="Copy"
            className="size-7"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-500" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>
        </div>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
        {display}
      </p>
    </article>
  );
}