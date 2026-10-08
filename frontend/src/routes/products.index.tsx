import { swalError , swalConfirm } from "@/lib/swal";
// routes/products.index.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search, AlertCircle, Trash2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui-kit";
import { useRole } from "@/lib/role";
import { ProductFormModal } from "@/components/ProductForm";
import { productsApi, type Product } from "@/lib/products";

export const Route = createFileRoute("/products/")({
  head: () => ({
    meta: [
      { title: "Products — StyleAI" },
      { name: "description", content: "Your fashion catalog." },
    ],
  }),
  component: Products,
});

function Products() {
  const { user, loading: authLoading } = useRole();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const canCreate = !!user?.permissions.includes("product.create");
  const canDelete = !!user?.permissions.includes("product.delete");

  useEffect(() => {
    if (authLoading || !user) return;
    if (user.pendingApproval) {
      navigate({ to: "/pending" });
      return;
    }
    if (!user.permissions.includes("product.read")) {
      navigate({ to: "/dashboard" });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (user.pendingApproval) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, navigate]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await productsApi.list(search || undefined);
      setProducts(res.products);
    } catch (err: any) {
      setError(err?.message || "Could not load products.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!(await swalConfirm(`Delete "${name}"? This cannot be undone.`))) return;
    try {
      await productsApi.remove(id);
      setProducts((p) => p.filter((x) => x.id !== id));
    } catch (err: any) {
      swalError(err?.message || "Delete failed");
    }
  }

  if (authLoading || loading) {
    return <p className="text-sm text-muted-foreground">Loading products…</p>;
  }

  if (!user || user.pendingApproval) return null;

  return (
    <>
      <PageHeader
        eyebrow="Commerce"
        title="Product catalog"
        description={
          canCreate
            ? "Every product carries its own AI profile — attributes, audience, and campaign readiness."
            : "You have read-only access to this catalog."
        }
        actions={
          canCreate ? (
            <Button onClick={() => setShowCreate(true)}>
              <Plus /> Add product
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
              <Lock className="size-3" />
              Read-only
            </span>
          )
        }
      />

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm sm:w-80">
          <Search className="size-4 text-muted-foreground" />
          <input
            aria-label="Search products"
            placeholder="Search products, SKU, category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          Apply
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No products yet.{canCreate ? " Add your first product to start." : ""}
          </p>
          {canCreate && (
            <Button className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus /> Add product
            </Button>
          )}
        </div>
      ) : (
        <section className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {products.map((p) => (
            <article
              key={p.id}
              className="group overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lift"
            >
              <Link to="/products/$slug" params={{ slug: p.id }} className="block">
                {p.primaryImage ? (
                  <img
                    src={p.primaryImage}
                    alt={p.name}
                    loading="lazy"
                    className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="grid aspect-[3/4] w-full place-items-center bg-muted/30 text-muted-foreground">
                    <span className="text-xs">No image</span>
                  </div>
                )}
              </Link>
              <div className="space-y-3 p-5">
                <div>
                  <Link
                    to="/products/$slug"
                    params={{ slug: p.id }}
                    className="font-display text-lg font-medium leading-snug hover:underline"
                  >
                    {p.name}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.category ?? "Uncategorised"}
                    {p.sku ? ` · ${p.sku}` : ""}
                  </p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium tabular-nums">
                    {p.currency} {p.price?.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {p.inventory ?? 0} in stock
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <Link
                    to="/products/$slug"
                    params={{ slug: p.id }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    View details →
                  </Link>

                  {canDelete ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(p.id, p.name)}
                      aria-label={`Delete ${p.name}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : (
                    <span
                      className="text-[10px] uppercase tracking-wide text-muted-foreground"
                      title="You don't have permission to delete"
                    >
                      View only
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {showCreate && canCreate && (
        <ProductFormModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSaved={(p) => {
            setProducts((prev) => [p, ...prev]);
            setShowCreate(false);
          }}
        />
      )}
    </>
  );
}