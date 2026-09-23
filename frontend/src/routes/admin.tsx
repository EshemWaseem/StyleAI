import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Eyebrow, MetricCard, PageHeader, Panel, SectionTitle, StatusPill } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin overview — StyleAI" },
      { name: "description", content: "Platform health, AI usage, and model version management for StyleAI operators." },
      { property: "og:title", content: "Admin overview — StyleAI" },
      { property: "og:description", content: "Operator view: usage, cost, latency, and model deployment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});

const versions = [
  ["FashionLLM v1.0", "81%", "Archived"],
  ["FashionLLM v1.1", "87%", "Archived"],
  ["FashionLLM v1.2", "91%", "Active"],
];

const pipeline = ["Dataset", "Training", "Validation", "Benchmark", "Human eval", "Safety eval", "Production compare", "Approval", "Deployment"];

function Admin() {
  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <AppShell breadcrumb={["Platform", "Admin overview"]}>
        <PageHeader
          eyebrow="Super admin"
          title="Platform overview"
          description="Operational health across organisations, usage, and models."
        />

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Organisations" value="164" delta="6.4%" />
          <MetricCard label="AI requests" value="18,230" delta="11.2%" />
          <MetricCard label="Tokens" value="8.2M" delta="9.7%" />
          <MetricCard label="AI cost" value="$143" delta="3.1%" trend="down" />
          <MetricCard label="Avg latency" value="2.8s" delta="0.4s" trend="down" />
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel>
            <SectionTitle title="Model versions" description="Controlled deployment with evaluation gates." />
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="pb-3 font-medium">Version</th>
                  <th scope="col" className="pb-3 font-medium">Eval score</th>
                  <th scope="col" className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {versions.map(([v, s, st]) => (
                  <tr key={v}>
                    <td className="py-3 font-medium">{v}</td>
                    <td className="py-3 tabular-nums">{s}</td>
                    <td className="py-3"><StatusPill status={st!} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel>
            <Eyebrow>Evaluation pipeline</Eyebrow>
            <ol className="mt-4 space-y-2 text-sm">
              {pipeline.map((p, i) => (
                <li key={p} className="flex items-center gap-3">
                  <span className="w-5 text-xs tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={i < 7 ? "text-muted-foreground" : "font-medium"}>{p}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}