import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Panel, EmptyState } from "@/components/ui-kit";

export const Route = createFileRoute("/matching")({
  head: () => ({
    meta: [
      { title: "AI matching — StyleAI" },
      {
        name: "description",
        content:
          "Match a product to the right fashion creators with explained AI match scores.",
      },
    ],
  }),
  component: Matching,
});

function Matching() {
  return (
    <AppShell breadcrumb={["Influencer intelligence", "AI matching"]}>
      <PageHeader
        eyebrow="Hero workflow"
        title="Find my influencers"
        description="Product + campaign + audience → ranked creator shortlist, with reasoning behind every score."
      />

      <div className="mt-8">
        <EmptyState
          title="AI matching is coming soon"
          description="We're building the matching engine that scores creators against your products, audience, and campaign goals. Until then, browse our discovery page to find creators manually."
          action={
            <Button asChild>
              <Link to="/influencers">
                <Sparkles /> Discover creators
                <ArrowRight />
              </Link>
            </Button>
          }
        />
      </div>

      <Panel className="mt-8">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-accent" />
          <div>
            <h3 className="font-display text-base font-medium">
              What's coming
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>· Product-to-creator matching with explainable scores</li>
              <li>· Audience overlap analysis (age, gender, geography, interests)</li>
              <li>· Historical campaign performance weighting</li>
              <li>· Campaign-level shortlist building</li>
              <li>· Match reasoning for every creator</li>
            </ul>
          </div>
        </div>
      </Panel>
    </AppShell>
  );
}