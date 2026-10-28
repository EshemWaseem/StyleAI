// components/dashboard/member-workspace.tsx
import { FileCheck2, UsersRound } from "lucide-react";
import { Panel, SectionTitle } from "@/components/ui-kit";

export function MemberWorkspace() {
  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
      <Panel>
        <SectionTitle
          title="Assigned to me"
          description="Task assignment is coming soon."
        />
        <div className="rounded-lg border border-dashed border-border bg-muted/10 p-10 text-center">
          <FileCheck2 className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No assigned tasks yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your brand owner will assign tasks here once task management goes live.
          </p>
        </div>
      </Panel>
      <Panel>
        <SectionTitle title="Team pulse" description="Recent activity." />
        <div className="rounded-lg border border-dashed border-border bg-muted/10 p-10 text-center">
          <UsersRound className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Nothing to show yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Team activity will appear here.
          </p>
        </div>
      </Panel>
    </div>
  );
}