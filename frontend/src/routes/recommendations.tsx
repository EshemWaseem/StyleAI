import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { InsightCard, PageHeader } from "@/components/ui-kit";
import { insights } from "@/lib/styleai-data";

export const Route = createFileRoute("/recommendations")({
  head: () => ({
    meta: [
      { title: "Recommendations — StyleAI" },
      { name: "description", content: "AI recommendations drawn from your campaign history, with reasoning and confidence." },
      { property: "og:title", content: "Recommendations — StyleAI" },
      { property: "og:description", content: "What StyleAI suggests you do next, and why." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Recommendations,
});

function Recommendations() {
  return (
    <AppShell breadcrumb={["Intelligence", "Recommendations"]}>
      <PageHeader
        eyebrow="Intelligence"
        title="Recommendations"
        description="Learned from your own campaign results. Every suggestion shows its reasoning and confidence."
      />
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {insights.map((i) => <InsightCard key={i.title} {...i} />)}
      </div>
    </AppShell>
  );
}
