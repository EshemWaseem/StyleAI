import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Panel, StatusPill } from "@/components/ui-kit";
import { knowledgeDocs } from "@/lib/styleai-data";

export const Route = createFileRoute("/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge base — StyleAI" },
      { name: "description", content: "Brand guidelines, catalogs, and past campaigns indexed so StyleAI writes in your voice." },
      { property: "og:title", content: "Knowledge base — StyleAI" },
      { property: "og:description", content: "Your brand's indexed knowledge for grounded AI output." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Knowledge,
});

function Knowledge() {
  return (
    <AppShell breadcrumb={["Intelligence", "Knowledge base"]}>
      <PageHeader
        eyebrow="Intelligence"
        title="Brand knowledge base"
        description="Everything indexed here shapes how StyleAI writes, matches, and recommends."
        actions={
          <>
            <Button variant="outline"><Upload />Upload document</Button>
            <Button><Sparkles />Ask Brand AI</Button>
          </>
        }
      />
      <Panel className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th scope="col" className="pb-3 font-medium">Document</th>
              <th scope="col" className="pb-3 font-medium">Type</th>
              <th scope="col" className="pb-3 font-medium">Indexed chunks</th>
              <th scope="col" className="pb-3 font-medium">Updated</th>
              <th scope="col" className="pb-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {knowledgeDocs.map((d) => (
              <tr key={d.name}>
                <td className="py-3 font-medium">{d.name}</td>
                <td className="py-3 text-muted-foreground">{d.type}</td>
                <td className="py-3 tabular-nums">{d.chunks}</td>
                <td className="py-3 text-muted-foreground">{d.updated}</td>
                <td className="py-3"><StatusPill status={d.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}
