import { createFileRoute } from "@tanstack/react-router";
import { Copy, RefreshCw, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { Eyebrow, PageHeader, Panel } from "@/components/ui-kit";
import { products } from "@/lib/styleai-data";

export const Route = createFileRoute("/studio/content")({
  head: () => ({
    meta: [
      { title: "Content studio — StyleAI" },
      { name: "description", content: "Generate captions, hooks, reel scripts, and SEO copy in your brand voice." },
      { property: "og:title", content: "Content studio — StyleAI" },
      { property: "og:description", content: "AI content workspace for Instagram, TikTok, YouTube, and blog." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContentStudio,
});

const controls = [
  ["Brand voice", "Editorial · Understated"],
  ["Tone", "Confident"],
  ["Length", "Medium"],
  ["Audience", "Female · 22–35"],
  ["SEO", "Enabled"],
  ["Language", "English (UK)"],
];

const outputs = [
  { label: "Caption", body: "Silk that moves the way an evening should. The Noir Evening Dress, cut for the long table and the later taxi." },
  { label: "Hook", body: "The dress you'll be asked about all night." },
  { label: "Hashtags", body: "#NoirEvening #QuietLuxury #SilkDress #LumenAtelier #EveningWear" },
  { label: "Reel script", body: "Open on fabric close-up → step into light → walk-away shot → cut to product card with price." },
  { label: "SEO meta title", body: "Noir Evening Dress — Silk Evening Gown | Lumen Atelier" },
  { label: "Meta description", body: "A fluid silk evening dress with a sculpted neckline. Made for formal evenings. Free returns within 30 days." },
];

function ContentStudio() {
  const product = products[0]!;
  return (
    <AppShell breadcrumb={["AI studio", "Content"]}>
      <PageHeader
        eyebrow="AI studio"
        title="Content studio"
        description="Every output is a draft. Review, edit, and approve before anything is published."
        actions={<Button><Sparkles />Generate</Button>}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_260px]">
        <Panel>
          <Eyebrow>Source product</Eyebrow>
          <img src={product.image} alt={product.name} width={900} height={1200} loading="lazy" className="mt-4 aspect-[3/4] w-full rounded-md object-cover" />
          <p className="mt-3 text-sm font-medium">{product.name}</p>
          <p className="text-xs text-muted-foreground">{product.category} · {product.price}</p>
        </Panel>

        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            {["Instagram", "TikTok", "YouTube", "Blog"].map((t, i) => (
              <button
                key={t}
                className={
                  i === 0
                    ? "rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background"
                    : "rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                }
              >
                {t}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-4">
            {outputs.map((o) => (
              <article key={o.label} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <Eyebrow>{o.label}</Eyebrow>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" aria-label={`Regenerate ${o.label}`}><RefreshCw /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Copy ${o.label}`}><Copy /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Save ${o.label}`}><Save /></Button>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6">{o.body}</p>
              </article>
            ))}
          </div>
        </div>

        <Panel>
          <Eyebrow>Generation controls</Eyebrow>
          <dl className="mt-4 space-y-4">
            {controls.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="mt-1 rounded-md border border-border px-3 py-2 text-sm">{v}</dd>
              </div>
            ))}
          </dl>
          <Button className="mt-5 w-full"><Sparkles />Regenerate all</Button>
        </Panel>
      </div>
    </AppShell>
  );
}
