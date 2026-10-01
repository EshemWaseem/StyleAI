// admin/brands.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Store, AlertCircle, Trash2, Loader2, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { adminApi } from "@/lib/admin";

export const Route = createFileRoute("/admin/brands")({
  component: AdminBrandsPage,
});

function AdminBrandsPage() {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params: { search?: string; limit: number } = { limit: 100 };
      if (search) params.search = search;
      const res = await adminApi.listBrands(params);
      setBrands(res.brands);
    } catch (err: any) { setError(err?.message || "Failed to load"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function handleDelete(b: any) {
    if (!confirm(`Delete brand "${b.name}"? Products under it will be removed.`)) return;
    try {
      await adminApi.deleteBrand(b.id);
      setBrands((prev) => prev.filter((x) => x.id !== b.id));
    } catch (err: any) { alert(err?.message); }
  }

  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <AppShell breadcrumb={["Admin", "Brands"]}>
        <PageHeader
          eyebrow="Platform"
          title="All brands"
          description="View-only. No editing from admin panel. Delete only policy-violating brands."
        />

        <div className="mt-6 flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm sm:w-96">
            <Search className="size-4 text-muted-foreground" />
            <input
              placeholder="Search brand name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              className="w-full bg-transparent outline-none"
            />
          </div>
          <Button size="sm" onClick={load}>Search</Button>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="mt-12 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading brands…</span>
          </div>
        ) : brands.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
            <Store className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No brands found.</p>
          </div>
        ) : (
          <Panel className="mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-3 font-medium">Brand</th>
                    <th className="pb-3 font-medium">Organization</th>
                    <th className="pb-3 font-medium">Country</th>
                    <th className="pb-3 font-medium">Products</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {brands.map((b) => (
                    <tr key={b.id}>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          {b.logoUrl ? (
                            <img src={b.logoUrl} alt={b.name} className="size-8 rounded-full object-cover" />
                          ) : (
                            <div className="grid size-8 place-items-center rounded-full bg-muted text-xs font-medium">
                              {b.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{b.name}</p>
                            <p className="text-xs text-muted-foreground">{b.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">{b.organization?.name ?? "—"}</td>
                      <td className="py-3 text-muted-foreground">{b.country ?? "—"}</td>
                      <td className="py-3 tabular-nums">{b.productCount}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TooltipIconButton label="View products in new tab" asChild>
                            <Link to="/products">
                              <ExternalLink className="size-4" />
                            </Link>
                          </TooltipIconButton>
                          <TooltipIconButton
                            label="Delete brand permanently"
                            onClick={() => handleDelete(b)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </TooltipIconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}