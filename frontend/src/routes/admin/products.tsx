// admin/products.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Shapes, AlertCircle, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { adminApi } from "@/lib/admin";

export const Route = createFileRoute("/admin/products")({
  component: AdminProductsPage,
});

function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params: { search?: string; limit: number } = { limit: 100 };
      if (search) params.search = search;
      const res = await adminApi.listProducts(params);
      setProducts(res.products);
    } catch (err: any) { setError(err?.message || "Failed to load"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function handleDelete(p: any) {
    if (!confirm(`Delete product "${p.name}"? This cannot be undone.`)) return;
    try {
      await adminApi.deleteProduct(p.id);
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err: any) { alert(err?.message); }
  }

  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <>
        <PageHeader
          eyebrow="Platform"
          title="All products"
          description="Read-only catalog view. Delete only policy-violating products."
        />

        <div className="mt-6 flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm sm:w-96">
            <Search className="size-4 text-muted-foreground" />
            <input
              placeholder="Search name or SKU…"
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
            <span className="text-sm text-muted-foreground">Loading products…</span>
          </div>
        ) : products.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
            <Shapes className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No products found.</p>
          </div>
        ) : (
          <Panel className="mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-3 font-medium">Product</th>
                    <th className="pb-3 font-medium">Brand</th>
                    <th className="pb-3 font-medium">Category</th>
                    <th className="pb-3 font-medium">Price</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          {p.primaryImage ? (
                            <img src={p.primaryImage} alt={p.name} className="size-10 rounded-md object-cover" />
                          ) : (
                            <div className="grid size-10 place-items-center rounded-md bg-muted text-xs">No img</div>
                          )}
                          <div>
                            <p className="font-medium line-clamp-1">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">{p.brand?.name ?? "—"}</td>
                      <td className="py-3 text-muted-foreground">{p.category ?? "—"}</td>
                      <td className="py-3 tabular-nums">
                        {p.price != null ? `${p.currency ?? "USD"} ${p.price}` : "—"}
                      </td>
                      <td className="py-3 text-right">
                        <TooltipIconButton
                          label="Delete product permanently"
                          onClick={() => handleDelete(p)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </TooltipIconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </>
    </ProtectedRoute>
  );
}