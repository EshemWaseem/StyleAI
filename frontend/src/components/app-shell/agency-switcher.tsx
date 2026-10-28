// components/app-shell/agency-switcher.tsx
import { Briefcase } from "lucide-react";
import { useAgency } from "@/lib/agency/context";

export function AgencyBrandSwitcher() {
  const { isAgency, clients, activeBrandId, setActiveBrand } = useAgency();
  if (!isAgency) return null;

  const allBrands = clients.flatMap((c) =>
    c.brands.map((b) => ({ ...b, clientName: c.clientOrganization.name }))
  );

  if (allBrands.length === 0) {
    return (
      <span className="hidden rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-500 sm:inline">
        No clients yet
      </span>
    );
  }

  return (
    <div className="hidden items-center gap-2 rounded-md border border-border bg-card px-2 py-1 sm:flex">
      <span className="text-[10px] font-medium uppercase text-muted-foreground">
        Acting as
      </span>
      <select
        value={activeBrandId ?? ""}
        onChange={(e) => setActiveBrand(e.target.value || null)}
        className="max-w-[180px] truncate cursor-pointer bg-transparent text-xs font-medium outline-none"
      >
        <option value="">— none —</option>
        {allBrands.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name} · {b.clientName}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AgencyActingBanner() {
  const { isAgency, activeBrandId, activeBrandName, setActiveBrand } = useAgency();
  if (!isAgency || !activeBrandId) return null;

  return (
    <div className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 sm:px-6">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Briefcase className="size-3.5 text-amber-500" />
        <span className="text-muted-foreground">Acting as</span>
        <strong className="text-foreground">
          {activeBrandName || "a client brand"}
        </strong>
        <span className="text-muted-foreground">
          — all actions apply to this brand
        </span>
        <button
          type="button"
          onClick={() => setActiveBrand(null)}
          className="ml-auto rounded-md bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
        >
          Stop acting
        </button>
      </div>
    </div>
  );
}