// productform.tsx







import { useRef, useState } from "react";
import {
  Sparkles,
  X,
  ImageIcon,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  productsApi,
  PRODUCT_TYPES,
  GENDER_OPTIONS,
  SEASON_OPTIONS,
  OCCASION_OPTIONS,
  CURRENCY_OPTIONS,
  MAX_PRODUCT_IMAGES,
  type Product,
  type ProductInput,
} from "@/lib/products";
import { aiApi, type AIResult } from "@/lib/ai";
import { AngleGenerator } from "@/components/product/AngleGenerator";

interface Props {
  mode?: "create" | "edit";
  /** When true, only inventory field is editable. All else disabled. */
  restrictToInventory?: boolean;
  product?: Product | null;
  onClose: () => void;
  onSaved: (p: Product) => void;
}

interface ImageItem {
  id: string;
  url: string;
  file?: File;
  isExisting?: boolean;
}

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export function ProductFormModal({
  mode = "create",
  restrictToInventory = false,
  product = null,
  onClose,
  onSaved,
}: Props) {
  const isEdit = mode === "edit";
  const isRestricted = isEdit && restrictToInventory;

  const [tab, setTab] = useState<"manual" | "ai">("manual");

  const [form, setForm] = useState<ProductInput>(() =>
    product
      ? {
          name: product.name,
          category: product.category ?? "Clothing",
          sku: product.sku ?? "",
          description: product.description ?? "",
          price: product.price ?? 0,
          currency: product.currency ?? "USD",
          gender: product.gender ?? "",
          season: product.season ?? "",
          occasion: product.occasion ?? "",
          inventory: product.inventory,
        }
      : {
          name: "",
          category: "Clothing",
          sku: "",
          price: 0,
          currency: "USD",
        }
  );

  const [images, setImages] = useState<ImageItem[]>(() =>
    product?.images.map((img) => ({
      id: img.id,
      url: img.url,
      isExisting: true,
    })) ?? []
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------- AI tab state ----------
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiPreview, setAiPreview] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiElapsed, setAiElapsed] = useState(0);
  const [aiError, setAiError] = useState("");
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const aiFileRef = useRef<HTMLInputElement>(null);
  const [showAngleGen, setShowAngleGen] = useState(false);

  const remainingSlots = MAX_PRODUCT_IMAGES - images.length;

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (isRestricted) return;
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setError("");
    if (remainingSlots <= 0) {
      setError(`Maximum ${MAX_PRODUCT_IMAGES} images allowed.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const accepted: ImageItem[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (accepted.length >= remainingSlots) {
        errors.push(`Only ${remainingSlots} more allowed`);
        break;
      }
      if (!ALLOWED_MIME.includes(file.type)) {
        errors.push(`${file.name}: unsupported format`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        errors.push(`${file.name}: too large (max 5 MB)`);
        continue;
      }
      accepted.push({
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url: URL.createObjectURL(file),
        file,
      });
    }

    setImages((prev) => [...prev, ...accepted]);
    if (errors.length) setError(errors.join(" · "));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(id: string) {
    if (isRestricted) return;
    setImages((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.url?.startsWith("blob:")) {
        URL.revokeObjectURL(item.url);
      }
      return prev.filter((i) => i.id !== id);
    });
  }

  // ======================================================
  // AI HANDLERS
  // ======================================================
  function handleAIFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOWED_MIME.includes(f.type)) {
      setAiError("Unsupported format. Use JPEG, PNG, or WebP.");
      return;
    }
    if (f.size > MAX_SIZE) {
      setAiError("Image too large (max 5 MB).");
      return;
    }
    setAiError("");
    setAiResult(null);
    if (aiPreview) URL.revokeObjectURL(aiPreview);
    setAiFile(f);
    setAiPreview(URL.createObjectURL(f));
  }

  function clearAIFile() {
    if (aiPreview) URL.revokeObjectURL(aiPreview);
    setAiFile(null);
    setAiPreview("");
    setAiResult(null);
    setAiError("");
    if (aiFileRef.current) aiFileRef.current.value = "";
  }

  async function handleAnalyze() {
    if (!aiFile) return;
    setAiError("");
    setAiResult(null);
    setAiLoading(true);
    setAiElapsed(0);

    const t0 = Date.now();
    const timer = setInterval(
      () => setAiElapsed(Math.round((Date.now() - t0) / 1000)),
      1000
    );

    try {
      const result = await aiApi.analyzeAndGenerate(aiFile, {
        brand_voice: "minimal",
      });
      setAiResult(result);
    } catch (err: any) {
      setAiError(err?.message || "AI request failed. Please try again.");
    } finally {
      clearInterval(timer);
      setAiLoading(false);
    }
  }


  //   function applyAIToForm() {
  //   if (!aiResult) return;

  //   if (!aiResult.content || !aiResult.attributes) {
  //     console.error("[ProductForm] Invalid aiResult shape:", aiResult);
  //     setAiError("AI returned incomplete data. Please try again.");
  //     return;
  //   }

  //   const { attributes, content, sku } = aiResult;   // ← sku DESTRUCTURE karo

  //   setForm((prev) => ({
  //     ...prev,
  //     name: content.product_name || prev.name,
  //     category: attributes.category ?? prev.category,
  //     description: content.description || prev.description,
  //     gender:
  //       attributes.target_gender && attributes.target_gender !== "Unknown"
  //         ? attributes.target_gender
  //         : prev.gender,
  //     sku: sku || prev.sku,
  //   }));

  //   if (aiFile && aiPreview && images.length < MAX_PRODUCT_IMAGES) {
  //     const alreadyAdded = images.some((i) => i.id === "ai-image");
  //     if (!alreadyAdded) {
  //       setImages((prev) => [
  //         ...prev,
  //         { id: "ai-image", url: aiPreview, file: aiFile },
  //       ]);
  //     }
  //   }

  //   setTab("manual");
  // }


    function applyAIToForm() {
    if (!aiResult) return;

    if (!aiResult.content || !aiResult.attributes) {
      console.error("[ProductForm] Invalid aiResult shape:", aiResult);
      setAiError("AI returned incomplete data. Please try again.");
      return;
    }

    const { attributes, content, sku } = aiResult;

    setForm((prev) => ({
      ...prev,
      name: content.product_name || prev.name,
      category: attributes.category ?? prev.category,
      description: content.description || prev.description,
      gender:
        attributes.target_gender && attributes.target_gender !== "Unknown"
          ? attributes.target_gender
          : prev.gender,
      sku: sku || prev.sku,
      price:
        content.suggested_price && content.suggested_price > 0
          ? content.suggested_price
          : prev.price,
      currency: content.price_currency || prev.currency || "USD",
    }));

    if (aiFile && aiPreview && images.length < MAX_PRODUCT_IMAGES) {
      const alreadyAdded = images.some((i) => i.id === "ai-image");
      if (!alreadyAdded) {
        setImages((prev) => [
          ...prev,
          { id: "ai-image", url: aiPreview, file: aiFile },
        ]);
      }
    }

    setTab("manual");
  }
  

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // ======================================================
    // RESTRICTED MODE — inventory only
    // ======================================================
    if (isRestricted && product) {
      const inv = form.inventory;
      if (inv !== null && inv !== undefined) {
        const n = Number(inv);
        if (isNaN(n) || n < 0 || !Number.isInteger(n)) {
          return setError("Inventory must be a non-negative integer");
        }
      }

      setSaving(true);
      try {
        const res = await productsApi.updateInventory(
          product.id,
          form.inventory ?? null
        );
        onSaved(res.product);
      } catch (err: any) {
        setError(err?.message || "Failed to update inventory");
        setSaving(false);
      }
      return;
    }

    // ======================================================
    // FULL MODE
    // ======================================================
    if (!form.name.trim()) return setError("Product name is required.");
    if (!form.category) return setError("Product type is required.");
    if (!form.sku.trim()) return setError("SKU is required.");
    if (!form.price || form.price <= 0)
      return setError("Price must be greater than 0.");
    if (images.length === 0)
      return setError("Please keep or upload at least one image.");

    setSaving(true);
    try {
      if (isEdit && product) {
        const keepImageIds = images
          .filter((i) => i.isExisting)
          .map((i) => i.id);
        const newFiles = images
          .filter((i) => i.file)
          .map((i) => i.file!) as File[];

        const res = await productsApi.updateWithImages(
          product.id,
          form,
          keepImageIds,
          newFiles
        );
        onSaved(res.product);
      } else {
        const newFiles = images
          .filter((i) => i.file)
          .map((i) => i.file!) as File[];
        const res = await productsApi.create(form, newFiles);
        onSaved(res.product);
      }
    } catch (err: any) {
      const message = err?.message || "Failed to save product.";
      if (err?.data?.code === "NO_BRAND" || message.includes("brand")) {
        setError(
          "You need to create your brand before adding products. Close this form and set up your brand first."
        );
      } else if (err?.status === 409) {
        setError(
          "A product with this SKU already exists in your brand. Please use a different SKU."
        );
      } else {
        setError(message);
      }
      setSaving(false);
    }
  }

  const headerTitle = isRestricted
    ? "Update inventory"
    : isEdit
    ? "Edit product"
    : "Add product";

  const existingCount = images.filter((i) => i.isExisting).length;
  const newCount = images.filter((i) => i.file).length;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="my-8 w-full max-w-2xl rounded-xl border border-border bg-card shadow-lift"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-medium">{headerTitle}</h2>
            {isRestricted && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-amber-500">
                <Lock className="size-3" />
                Restricted access — only inventory can be updated
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
            disabled={saving}
          >
            <X />
          </Button>
        </div>

        {/* TABS — hidden in restricted mode */}
        {!isRestricted && (
          <div className="flex gap-1 border-b border-border px-6 pt-4">
            <button
              type="button"
              onClick={() => setTab("manual")}
              className={cn(
                "rounded-t-md border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                tab === "manual"
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() => setTab("ai")}
              className={cn(
                "flex items-center gap-1.5 rounded-t-md border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                tab === "ai"
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="size-3.5 text-accent" />
              AI content
            </button>
          </div>
        )}

        {/* BODY */}
        <div className="p-6">
          {!isRestricted && tab === "ai" ? (
            <div className="space-y-5">
              {/* Intro */}
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-accent" />
                  <p className="text-sm font-medium">AI Content Generation</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Upload a product image. AI analyzes it, fills in the
                  attributes, and generates a title, description and SEO
                  content. You review before saving.
                </p>
              </div>

              {/* Error */}
              {aiError && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              {/* Image picker */}
              <div>
                <Label>Product image *</Label>
                <div className="mt-2 flex items-center gap-3">
                  {aiPreview ? (
                    <div className="relative size-24 overflow-hidden rounded-lg border border-border">
                      <img
                        src={aiPreview}
                        alt="AI input"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={clearAIFile}
                        className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-background/90 text-foreground"
                        aria-label="Remove image"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => aiFileRef.current?.click()}
                      className="grid size-24 place-items-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-accent/50 hover:text-foreground"
                      aria-label="Choose image"
                    >
                      <ImageIcon className="size-5" />
                    </button>
                  )}
                  <div className="flex-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => aiFileRef.current?.click()}
                      disabled={aiLoading}
                    >
                      {aiFile ? "Change image" : "Choose image"}
                    </Button>
                  </div>
                  <input
                    ref={aiFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAIFilePick}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  JPEG, PNG, or WebP · Max 5 MB
                </p>
              </div>

              {/* Analyze button */}
              <Button
                type="button"
                onClick={handleAnalyze}
                disabled={!aiFile || aiLoading}
                className="w-full"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Analyzing… {aiElapsed}s
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-4" />
                    Analyze with AI
                  </>
                )}
              </Button>

              {aiLoading && aiElapsed > 15 && (
                <p className="text-center text-xs text-muted-foreground">
                  First run loads the model — can take 30–60 seconds.
                </p>
              )}

              {/* Results */}
              {aiResult && (
                <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-500">
                    <CheckCircle2 className="size-4" />
                    Analysis complete
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Product:</span>{" "}
                      <span className="font-medium">
                        {aiResult.content.product_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Category:</span>{" "}
                      <span className="font-medium">
                        {aiResult.attributes.category ?? "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>{" "}
                      <span className="font-medium">
                        {aiResult.attributes.product_type ?? "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Color:</span>{" "}
                      <span className="font-medium">
                        {aiResult.attributes.color ?? "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Gender:</span>{" "}
                      <span className="font-medium">
                        {aiResult.attributes.target_gender}
                      </span>
                    </div>
                    {/* <div>
                      <span className="text-muted-foreground">
                        Confidence:
                      </span>{" "}
                      <span className="font-medium">
                        {Math.round(aiResult.attributes.confidence * 100)}%
                      </span>
                    </div>
                  </div> */}

                    <div>
                      <span className="text-muted-foreground">Confidence:</span>{" "}
                      <span className="font-medium">
                        {Math.round(aiResult.attributes.confidence * 100)}%
                      </span>
                    </div>

                    {aiResult.content.suggested_price ? (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">
                          Suggested price:
                        </span>{" "}
                        <span className="font-medium">
                          {aiResult.content.price_currency || "USD"}{" "}
                          {aiResult.content.suggested_price}
                        </span>
                        {aiResult.content.price_reasoning && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground italic">
                            {aiResult.content.price_reasoning}
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {aiResult.attributes.uncertain_fields.length > 0 && (
                    <p className="text-xs text-amber-500">
                      AI was unsure about:{" "}
                      {aiResult.attributes.uncertain_fields.join(", ")}
                    </p>
                  )}

                  <div className="border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground">
                      <strong>Short description:</strong>{" "}
                      {aiResult.content.short_description}
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={applyAIToForm}
                    className="w-full"
                  >
                    Apply to form
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}

              {/* RESTRICTED — product summary */}
              {isRestricted && product && (
                <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3">
                  {product.primaryImage ? (
                    <img
                      src={product.primaryImage}
                      alt={product.name}
                      className="size-14 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="grid size-14 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                      <ImageIcon className="size-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {product.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {product.sku} · {product.category ?? "Uncategorised"}
                    </p>
                  </div>
                </div>
              )}

                            {/* IMAGES */}
              {!isRestricted && (
                <div>
                  {/* AI ANGLES — shows when at least 1 new file exists */}
                  {images.some((i) => i.file) && images.length < MAX_PRODUCT_IMAGES && (
                    <div className="mb-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            <Sparkles className="mr-1 inline size-3.5 text-accent" />
                            Generate more angles with AI
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Creates side / 3-4 / detail views of the SAME product (30–90s).
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setShowAngleGen(true)}
                        >
                          Generate
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-baseline justify-between">
                    <Label>
                      Product images{" "}
                      <span className="font-normal text-muted-foreground">
                        ({images.length}/{MAX_PRODUCT_IMAGES})
                      </span>
                    </Label>
                    {isEdit && (
                      <span className="text-xs text-muted-foreground">
                        {existingCount} existing
                        {newCount > 0 ? ` · ${newCount} new` : ""}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {images.map((img, i) => (
                      <div
                        key={img.id}
                        className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-muted/20"
                      >
                        <img
                          src={img.url}
                          alt={`Product ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                        {i === 0 && (
                          <span className="absolute left-1.5 top-1.5 rounded-full bg-foreground/85 px-1.5 py-0.5 text-[9px] font-medium text-background">
                            Cover
                          </span>
                        )}
                        {img.file && (
                          <span className="absolute left-1.5 bottom-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-medium text-background">
                            New
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-background/90 text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                          aria-label="Remove image"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}

                    {images.length < MAX_PRODUCT_IMAGES && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-card text-muted-foreground transition-colors hover:border-accent/50 hover:bg-accent/5 hover:text-foreground"
                      >
                        <ImageIcon className="size-5" />
                        <span className="text-[10px] font-medium">Add</span>
                      </button>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleFilesChange}
                    className="hidden"
                  />

                  <p className="mt-2 text-xs text-muted-foreground">
                    JPEG, PNG, or WebP · Max 5 MB each · Up to{" "}
                    {MAX_PRODUCT_IMAGES} images
                  </p>
                </div>
              )}

              {/* NAME + TYPE */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Product name *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Noir Evening Dress"
                    disabled={isRestricted}
                    required={!isRestricted}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Product type *</Label>
                  <select
                    id="category"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    disabled={isRestricted}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {PRODUCT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SKU */}
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="e.g., LM-AW26-108"
                  disabled={isRestricted}
                  required={!isRestricted}
                />
                {!isRestricted && (
                  <p className="text-xs text-muted-foreground">
                    Must be unique within your brand.
                  </p>
                )}
              </div>

              {/* PRICE + CURRENCY */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={form.price || ""}
                    onChange={(e) =>
                      setForm({ ...form, price: Number(e.target.value) })
                    }
                    placeholder="199.00"
                    disabled={isRestricted}
                    required={!isRestricted}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    value={form.currency}
                    onChange={(e) =>
                      setForm({ ...form, currency: e.target.value })
                    }
                    disabled={isRestricted}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* GENDER / SEASON / OCCASION */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    value={form.gender ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, gender: e.target.value })
                    }
                    disabled={isRestricted}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">—</option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="season">Season</Label>
                  <select
                    id="season"
                    value={form.season ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, season: e.target.value })
                    }
                    disabled={isRestricted}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">—</option>
                    {SEASON_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="occasion">Occasion</Label>
                  <select
                    id="occasion"
                    value={form.occasion ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, occasion: e.target.value })
                    }
                    disabled={isRestricted}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">—</option>
                    {OCCASION_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* INVENTORY — emphasized in restricted mode */}
              <div
                className={cn(
                  "space-y-2",
                  isRestricted &&
                    "rounded-lg border border-accent/30 bg-accent/5 p-4"
                )}
              >
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="inventory"
                    className={cn(isRestricted && "text-accent")}
                  >
                    Inventory {isRestricted && "*"}
                  </Label>
                  {isRestricted && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-accent">
                      Only editable field
                    </span>
                  )}
                </div>
                <Input
                  id="inventory"
                  type="number"
                  min={0}
                  step={1}
                  value={form.inventory ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      inventory:
                        e.target.value === ""
                          ? null
                          : Number(e.target.value),
                    })
                  }
                  placeholder={isRestricted ? "0" : "Optional"}
                  autoFocus={isRestricted}
                  required={isRestricted}
                />
                {isRestricted && (
                  <p className="text-xs text-muted-foreground">
                    Current value: {product?.inventory ?? 0} units
                  </p>
                )}
              </div>

              {/* DESCRIPTION */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={form.description ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  placeholder="A refined silhouette designed for evening occasions…"
                  disabled={isRestricted}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>
          )}
        </div>

                {/* AI ANGLE GENERATOR MODAL */}
        {showAngleGen && (() => {
          const sourceFile = images.find((i) => i.file)?.file;
          if (!sourceFile) return null;
          return (
            <AngleGenerator
              file={sourceFile}
              onUseAngles={(picked) => {
                setImages((prev) => [
                  ...prev,
                  ...picked.map((p) => ({
                    id: `ai-angle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    url: p.url,
                    // Mark as "existing" so they don't re-upload — Cloudinary already has them
                    isExisting: true,
                  })),
                ]);
                setShowAngleGen(false);
              }}
              onClose={() => setShowAngleGen(false)}
            />
          );
        })()}


        {/* FOOTER */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving || (!isRestricted && tab === "ai")}
          >
            {saving
              ? "Saving…"
              : isRestricted
              ? "Update inventory"
              : isEdit
              ? "Save changes"
              : "Create product"}
          </Button>
        </div>
      </form>
    </div>
  );
}








