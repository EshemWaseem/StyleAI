import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  AlertCircle,
  Trash2,
  Pencil,
  Package,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow, Panel } from "@/components/ui-kit";
import { useRole } from "@/lib/role";
import { productsApi, type Product } from "@/lib/products";
import { ProductFormModal } from "@/components/ProductForm";
import { ProductImageSlider } from "@/components/ProductImageSlider";
import { swalError , swalConfirm } from "@/lib/swal";

export const Route = createFileRoute("/products/$slug")({
  head: () => ({ meta: [{ title: "Product — StyleAI" }] }),
  component: ProductDetail,
});

function ProductDetail() {
  const { slug: productId } = Route.useParams();
  const { user, loading: authLoading } = useRole();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEdit, setShowEdit] = useState(false);

  // ======================================================
  // PERMISSIONS
  // ======================================================
  const canFullEdit = !!user?.permissions.includes("product.update");
  const canInventoryEdit = !!user?.permissions.includes("inventory.manage");
  const canDelete = !!user?.permissions.includes("product.delete");
  const canEdit = canFullEdit || canInventoryEdit;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (user.pendingApproval) {
      navigate({ to: "/pending" });
      return;
    }
    if (!user.permissions.includes("product.read")) {
      navigate({ to: "/dashboard" });
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, productId, navigate]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await productsApi.get(productId);
      setProduct(res.product);
    } catch (err: any) {
      setError(err?.message || "Could not load product.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!product) return;
    if (!(await swalConfirm(`Delete "${product.name}"? This cannot be undone.`))) return;
    try {
      await productsApi.remove(product.id);
      navigate({ to: "/products" });
    } catch (err: any) {
      swalError(err?.message || "Delete failed");
    }
  }

  if (authLoading || loading) {
    return (
      <>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error || "Product not found"}</span>
        </div>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/products">
            <ArrowLeft /> Back to products
          </Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to products
        </Link>

        <div className="flex items-center gap-2">
          {canFullEdit && (
            <Button variant="outline" onClick={() => setShowEdit(true)}>
              <Pencil className="size-4" /> Edit product
            </Button>
          )}

          {!canFullEdit && canInventoryEdit && (
            <Button variant="outline" onClick={() => setShowEdit(true)}>
              <Package className="size-4" /> Update inventory
            </Button>
          )}

          {!canEdit && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
              <Lock className="size-3" />
              Read-only
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* IMAGE SLIDER */}
        <div className="min-w-0">
          <ProductImageSlider
            images={product.images}
            alt={product.name}
            aspect="aspect-[3/4]"
            size="lg"
            showThumbnails
            showDots
            showCounter
          />

          {canDelete && (
            <Button
              variant="outline"
              className="mt-4 w-full text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 /> Delete product
            </Button>
          )}
        </div>

        {/* DETAILS */}
        <div className="min-w-0">
          <Eyebrow>{product.category ?? "Uncategorised"}</Eyebrow>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight break-words">
            {product.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {product.sku} · {product.currency} {product.price?.toFixed(2)} ·{" "}
            {product.inventory ?? 0} in stock
          </p>

          {product.description && (
            <Panel className="mt-6">
              <Eyebrow>Description</Eyebrow>
              <p className="mt-3 text-sm leading-6 text-muted-foreground break-words">
                {product.description}
              </p>
            </Panel>
          )}

          <Panel className="mt-6">
            <Eyebrow>Attributes</Eyebrow>
            <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <Attr label="SKU" value={product.sku} />
              <Attr label="Type" value={product.category} />
              <Attr label="Gender" value={product.gender} />
              <Attr label="Season" value={product.season} />
              <Attr label="Occasion" value={product.occasion} />
              <Attr label="Inventory" value={product.inventory?.toString()} />
              <Attr label="Currency" value={product.currency} />
              <Attr label="Images" value={product.images.length.toString()} />
            </dl>
          </Panel>

          <div className="mt-6 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground break-all">
            <p>
              <strong>Product ID:</strong> {product.id}
            </p>
            <p className="mt-1">
              <strong>Created:</strong>{" "}
              {new Date(product.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* EDIT MODAL — restricted or full based on permissions */}
      {showEdit && canEdit && (
        <ProductFormModal
          mode="edit"
          restrictToInventory={!canFullEdit && canInventoryEdit}
          product={product}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setProduct(updated);
            setShowEdit(false);
          }}
        />
      )}
    </>
  );
}

function Attr({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium break-words">{value || "—"}</dd>
    </div>
  );
}


// import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
// import { useEffect, useState } from "react";
// import { ArrowLeft, AlertCircle, Trash2, Pencil } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { AppShell } from "@/components/app-shell";
// import { Eyebrow, Panel } from "@/components/ui-kit";
// import { useRole } from "@/lib/role";
// import { productsApi, type Product } from "@/lib/products";
// import { ProductFormModal } from "@/components/ProductForm";
// import { ProductImageSlider } from "@/components/ProductImageSlider";

// export const Route = createFileRoute("/products/$slug")({
//   head: () => ({ meta: [{ title: "Product — StyleAI" }] }),
//   component: ProductDetail,
// });

// function ProductDetail() {
//   const { slug: productId } = Route.useParams();
//   const { user, loading: authLoading } = useRole();
//   const navigate = useNavigate();

//   const [product, setProduct] = useState<Product | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [showEdit, setShowEdit] = useState(false);

//   useEffect(() => {
//     if (authLoading) return;
//     if (!user) {
//       navigate({ to: "/login" });
//       return;
//     }
//     load();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [authLoading, user, productId, navigate]);

//   async function load() {
//     setLoading(true);
//     setError("");
//     try {
//       const res = await productsApi.get(productId);
//       setProduct(res.product);
//     } catch (err: any) {
//       setError(err?.message || "Could not load product.");
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function handleDelete() {
//     if (!product) return;
//     if (!(await swalConfirm(`Delete "${product.name}"? This cannot be undone.`))) return;
//     try {
//       await productsApi.remove(product.id);
//       navigate({ to: "/products" });
//     } catch (err: any) {
//       swalError(err?.message || "Delete failed");
//     }
//   }

//   if (authLoading || loading) {
//     return (
//       <AppShell breadcrumb={["Products"]}>
//         <p className="text-sm text-muted-foreground">Loading…</p>
//       </AppShell>
//     );
//   }

//   if (error || !product) {
//     return (
//       <AppShell breadcrumb={["Products"]}>
//         <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
//           <AlertCircle className="mt-0.5 size-4 shrink-0" />
//           <span>{error || "Product not found"}</span>
//         </div>
//         <Button asChild variant="outline" className="mt-4">
//           <Link to="/products">
//             <ArrowLeft /> Back to products
//           </Link>
//         </Button>
//       </AppShell>
//     );
//   }

//   return (
//     <AppShell breadcrumb={["Products", product.name]}>
//       <div className="flex items-center justify-between">
//         <Link
//           to="/products"
//           className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
//         >
//           <ArrowLeft className="size-4" /> Back to products
//         </Link>

//         <Button variant="outline" onClick={() => setShowEdit(true)}>
//           <Pencil className="size-4" /> Edit product
//         </Button>
//       </div>

//       <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
//         {/* IMAGE SLIDER */}
//         <div>
//           <ProductImageSlider
//             images={product.images}
//             alt={product.name}
//             aspect="aspect-[3/4]"
//             size="lg"
//             showThumbnails
//             showDots
//             showCounter
//           />

//           <Button
//             variant="outline"
//             className="mt-4 w-full text-destructive hover:text-destructive"
//             onClick={handleDelete}
//           >
//             <Trash2 /> Delete product
//           </Button>
//         </div>

//         {/* DETAILS */}
//         <div className="min-w-0">
//           <Eyebrow>{product.category ?? "Uncategorised"}</Eyebrow>
//           <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">
//             {product.name}
//           </h1>
//           <p className="mt-2 text-sm text-muted-foreground">
//             {product.sku} · {product.currency} {product.price?.toFixed(2)} ·{" "}
//             {product.inventory ?? 0} in stock
//           </p>

//           {product.description && (
//             <Panel className="mt-6">
//               <Eyebrow>Description</Eyebrow>
//               <p className="mt-3 text-sm leading-6 text-muted-foreground">
//                 {product.description}
//               </p>
//             </Panel>
//           )}

//           <Panel className="mt-6">
//             <Eyebrow>Attributes</Eyebrow>
//             <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
//               <Attr label="SKU" value={product.sku} />
//               <Attr label="Type" value={product.category} />
//               <Attr label="Gender" value={product.gender} />
//               <Attr label="Season" value={product.season} />
//               <Attr label="Occasion" value={product.occasion} />
//               <Attr label="Inventory" value={product.inventory?.toString()} />
//               <Attr label="Currency" value={product.currency} />
//               <Attr label="Images" value={product.images.length.toString()} />
//             </dl>
//           </Panel>

//           <div className="mt-6 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
//             <p>
//               <strong>Product ID:</strong> {product.id}
//             </p>
//             <p className="mt-1">
//               <strong>Created:</strong>{" "}
//               {new Date(product.createdAt).toLocaleDateString()}
//             </p>
//           </div>
//         </div>
//       </div>

//       {showEdit && (
//         <ProductFormModal
//           mode="edit"
//           product={product}
//           onClose={() => setShowEdit(false)}
//           onSaved={(updated) => {
//             setProduct(updated);
//             setShowEdit(false);
//           }}
//         />
//       )}
//     </AppShell>
//   );
// }

// function Attr({
//   label,
//   value,
// }: {
//   label: string;
//   value: string | null | undefined;
// }) {
//   return (
//     <div>
//       <dt className="text-xs text-muted-foreground">{label}</dt>
//       <dd className="mt-1 font-medium">{value || "—"}</dd>
//     </div>
//   );
// }