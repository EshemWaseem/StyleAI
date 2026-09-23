import { createFileRoute } from "@tanstack/react-router";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { Eyebrow, PageHeader, Panel, ScoreBar } from "@/components/ui-kit";
import { products } from "@/lib/styleai-data";
import editorial from "@/assets/hero-editorial.jpg";

export const Route = createFileRoute("/studio/photography")({
  head: () => ({
    meta: [
      { title: "AI photography — StyleAI" },
      { name: "description", content: "Generate studio, editorial, and lifestyle product imagery that preserves product identity." },
      { property: "og:title", content: "AI photography — StyleAI" },
      { property: "og:description", content: "Product image generation with a post-generation quality check." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Photography,
});

const modes = ["Studio", "Luxury", "Lifestyle", "Outdoor", "Street", "Minimal", "Fashion editorial", "E-commerce", "Social media"];
const qc = [
  { label: "Product similarity", value: 96 },
  { label: "Colour accuracy", value: 94 },
  { label: "Shape fidelity", value: 92 },
  { label: "Texture", value: 89 },
  { label: "Artifact check", value: 98 },
  { label: "Human anatomy", value: 95 },
];

function Photography() {
  const product = products[0]!;
  return (
    <AppShell breadcrumb={["AI studio", "AI photography"]}>
      <PageHeader
        eyebrow="AI studio"
        title="AI photography"
        description="Your product stays the product. Only the scene changes."
        actions={<Button><Camera />Generate image</Button>}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Panel className="space-y-5">
          <div>
            <Eyebrow>Source product</Eyebrow>
            <img src={product.image} alt={product.name} width={900} height={1200} loading="lazy" className="mt-3 aspect-[3/4] w-full rounded-md object-cover" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Scene</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {modes.map((m, i) => (
                <button
                  key={m}
                  className={
                    i === 6
                      ? "rounded-md bg-foreground px-2.5 py-1.5 text-[11px] font-medium text-background"
                      : "rounded-md border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                  }
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          {[["Lighting", "Soft daylight"], ["Model", "Included"], ["Aspect ratio", "4:5"]].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-muted-foreground">{k}</p>
              <p className="mt-1 rounded-md border border-border px-3 py-2 text-sm">{v}</p>
            </div>
          ))}
        </Panel>

        <div className="space-y-6">
          <Panel>
            <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
              <div>
                <Eyebrow>Original</Eyebrow>
                <img src={product.image} alt="Original product" width={900} height={1200} loading="lazy" className="mt-3 aspect-[4/5] w-full rounded-md object-cover" />
              </div>
              <span className="hidden text-muted-foreground sm:block" aria-hidden="true">→</span>
              <div>
                <Eyebrow>Generated scene</Eyebrow>
                <img src={editorial} alt="Generated editorial scene" width={1408} height={1008} loading="lazy" className="mt-3 aspect-[4/5] w-full rounded-md object-cover" />
              </div>
            </div>
          </Panel>
          <Panel>
            <Eyebrow>AI quality check</Eyebrow>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {qc.map((q) => <ScoreBar key={q.label} label={q.label} value={q.value} />)}
            </div>
            <p className="mt-5 text-xs text-muted-foreground">Generated imagery requires human approval before publishing.</p>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
