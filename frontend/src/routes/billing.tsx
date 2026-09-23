import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { Eyebrow, PageHeader, Panel, ScoreBar, StatusPill } from "@/components/ui-kit";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Billing — StyleAI" },
      { name: "description", content: "Plan, usage, invoices, and payment method for your StyleAI workspace." },
      { property: "og:title", content: "Billing — StyleAI" },
      { property: "og:description", content: "Subscription and usage overview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Billing,
});

const usage = [
  { label: "AI generations", value: 68 },
  { label: "Storage", value: 41 },
  { label: "Campaigns", value: 50 },
  { label: "Team seats", value: 80 },
];

const invoices = [
  ["INV-2026-009", "1 Sep 2026", "$299.00", "Paid"],
  ["INV-2026-008", "1 Aug 2026", "$299.00", "Paid"],
  ["INV-2026-007", "1 Jul 2026", "$299.00", "Paid"],
];

function Billing() {
  return (
    <AppShell breadcrumb={["Administration", "Billing"]}>
      <PageHeader eyebrow="Administration" title="Billing" description="Simple, predictable pricing for your workspace." actions={<Button>Upgrade plan</Button>} />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Panel>
          <Eyebrow>Current plan</Eyebrow>
          <p className="mt-3 font-display text-3xl font-medium">Studio</p>
          <p className="mt-1 text-sm text-muted-foreground">$299 / month · renews 1 Oct 2026</p>
          <div className="mt-4"><StatusPill status="Active" /></div>
          <p className="mt-6 text-xs text-muted-foreground">Visa ending 4421</p>
        </Panel>
        <Panel>
          <Eyebrow>Usage this cycle</Eyebrow>
          <div className="mt-4 space-y-4">
            {usage.map((u) => <ScoreBar key={u.label} label={u.label} value={u.value} />)}
          </div>
        </Panel>
      </div>
      <Panel className="mt-6 overflow-x-auto">
        <Eyebrow>Invoices</Eyebrow>
        <table className="mt-4 w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th scope="col" className="pb-3 font-medium">Invoice</th>
              <th scope="col" className="pb-3 font-medium">Date</th>
              <th scope="col" className="pb-3 font-medium">Amount</th>
              <th scope="col" className="pb-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.map(([id, date, amount, status]) => (
              <tr key={id}>
                <td className="py-3 font-medium">{id}</td>
                <td className="py-3 text-muted-foreground">{date}</td>
                <td className="py-3 tabular-nums">{amount}</td>
                <td className="py-3 text-success">{status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}
