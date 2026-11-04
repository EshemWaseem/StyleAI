// frontend/src/components/agency/CreateMetaCampaignModal.tsx
import { useState } from "react";
import { 
  Loader2, Rocket, Globe2, Facebook, Instagram, 
  Sparkles, Image as ImageIcon, BrainCircuit, 
  Building2, UserCircle2, Link as LinkIcon 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { agencyCampaignsApi } from "@/lib/agency/api";

export function CreateMetaCampaignModal({
  onClose,
  onSuccess,
  initialImageUrl = "",
  clientBrands = [],
  defaultBrandId = "",
}: {
  onClose: () => void;
  onSuccess: () => void;
  initialImageUrl?: string;
  clientBrands?: { id: string; name: string; hasMetaConnected?: boolean }[];
  defaultBrandId?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [textLoading, setTextLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState<"META" | "GOOGLE">("META");

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [targetAudience, setTargetAudience] = useState<string | null>(null);

  const [form, setForm] = useState({
    productName: "",
    name: "",
    budget: "10",
    link: "https://styleai.com",
    originalImageUrl: initialImageUrl,
    generatedImageUrl: initialImageUrl,
    adText: "",
    headline: "",
    adAccountSource: "AGENCY",
    targetOrganizationId: defaultBrandId || "",
    platforms: {
      facebook: true, instagram: true,
      fbFeed: true, fbStory: true, fbReels: true,
      igFeed: true, igStory: true, igReels: true, igExplore: true,
    },
    
    googleFinalUrl: "https://styleai.com",
    googleHeadlines: "Buy Premium Fashion, Latest Trends, Shop Now",
    googleDescriptions: "Discover top quality clothes., Fast delivery.",
    googleKeywords: "fashion, online shopping, style"
  });

  const handleTogglePlatform = (key: keyof typeof form.platforms) => {
    setForm((prev) => ({
      ...prev,
      platforms: { ...prev.platforms, [key]: !prev.platforms[key] }
    }));
  };

  const handleGenerateStrategy = async () => {
    if (!form.productName.trim()) {
      setError("Enter a product name for AI to analyze.");
      return;
    }
    setError("");
    setStrategyLoading(true);
    try {
      const res = await agencyCampaignsApi.generateStrategy({
        productName: form.productName,
        category: "fashion",
        price: 50
      });

      setForm((prev) => ({
        ...prev,
        budget: res.suggested_budget || prev.budget,
        headline: res.ad_headline || prev.headline,
        adText: res.ad_copy || prev.adText,
        name: prev.name || `${form.productName} Campaign`,
     
        googleHeadlines: res.ad_headline ? `${res.ad_headline}, Buy Now, Shop Today` : prev.googleHeadlines,
        googleDescriptions: res.ad_copy ? `${res.ad_copy}, Order Now.` : prev.googleDescriptions
      }));
      setTargetAudience(res.target_audience);
      setAiInsight(res.ai_insight);
    } catch (err: any) {
      setError(err.message || "Failed to generate AI strategy.");
    } finally {
      setStrategyLoading(false);
    }
  };

  const handleGenerateText = async () => {
    if (!form.productName.trim()) {
      setError("Enter a product name to generate AI text.");
      return;
    }
    setError("");
    setTextLoading(true);
    try {
      const res = await agencyCampaignsApi.generateAdText({
        productName: form.productName,
        category: "fashion",
      });
      setForm((prev) => ({
        ...prev,
        adText: res.adText,
        headline: res.headline,
        name: prev.name || `${form.productName} Campaign`,
      }));
    } catch (err: any) {
      setError(err.message || "Failed to generate text.");
    } finally {
      setTextLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!form.originalImageUrl.trim()) {
      setError("Provide an original product image URL first.");
      return;
    }
    setError("");
    setImageLoading(true);
    try {
      const res = await agencyCampaignsApi.generateAdImage({
        originalImageUrl: form.originalImageUrl,
        style: "premium studio lighting",
      });
      setForm((prev) => ({ ...prev, generatedImageUrl: res.generatedImageUrl }));
    } catch (err: any) {
      setError(err.message || "Failed to generate image.");
    } finally {
      setImageLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (provider === "META" && !form.generatedImageUrl) {
      setError("Please generate an AI image before launching.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      if (provider === "META") {
        await agencyCampaignsApi.createMetaCampaign({
          ...form,
          imageUrl: form.generatedImageUrl,
          platforms: form.platforms,
          targetOrganizationId: form.adAccountSource === "CLIENT" ? form.targetOrganizationId : undefined,
        });
      } else {
        // 👇 Google Ads ke liye comma-separated strings ko array mein convert karein
        await agencyCampaignsApi.createGoogleCampaign({
          name: form.name,
          budget: form.budget,
          finalUrl: form.googleFinalUrl,
          headlines: form.googleHeadlines.split(',').map(s => s.trim()).filter(Boolean),
          descriptions: form.googleDescriptions.split(',').map(s => s.trim()).filter(Boolean),
          keywords: form.googleKeywords.split(',').map(s => s.trim()).filter(Boolean),
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to create campaign");
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading || imageLoading || textLoading || strategyLoading || 
    (form.adAccountSource === "CLIENT" && !form.targetOrganizationId);

  return (
    <div className="ui-overlay" role="dialog" aria-modal="true">
      <div className="ui-panel ui-panel-lg">
        <div className="ui-panel-header border-b border-border">
          <div>
            <h2 className="font-display text-xl font-medium flex items-center gap-2">
              <Sparkles className="size-5 text-accent" /> StyleAI Campaign Studio
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Campaign will be created in PAUSED state. Use AI to generate copy, imagery, and strategy.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-b border-border">
          <div className="p-6 space-y-4 md:border-r border-border overflow-y-auto max-h-[75vh] hover-scroll">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProvider("META")}
                className={`flex items-center justify-center gap-2 rounded-md border p-3 text-sm font-medium transition-colors ${
                  provider === "META" ? "border-blue-500 bg-blue-500/10 text-blue-500" : "border-border bg-background hover:bg-muted"
                }`}
              >
                <Facebook className="size-4" /> Meta (FB + IG)
              </button>
              <button
                type="button"
                onClick={() => setProvider("GOOGLE")}
                className={`flex items-center justify-center gap-2 rounded-md border p-3 text-sm font-medium transition-colors ${
                  provider === "GOOGLE" ? "border-red-500 bg-red-500/10 text-red-500" : "border-border bg-background hover:bg-muted"
                }`}
              >
                <Globe2 className="size-4" /> Google Ads
              </button>
            </div>

            {error && <div className="ui-error">{error}</div>}

            {provider === "META" && clientBrands.length > 0 && (
              <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/10">
                <label className="text-xs font-medium">Whose Ad Account should be used?</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="radio" 
                      name="adAccount" 
                      checked={form.adAccountSource === "AGENCY"} 
                      onChange={() => setForm({ ...form, adAccountSource: "AGENCY", targetOrganizationId: "" })} 
                      className="accent-accent size-4" 
                    />
                    <Building2 className="size-4 text-muted-foreground" /> My Agency Account
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="radio" 
                      name="adAccount" 
                      checked={form.adAccountSource === "CLIENT"} 
                      onChange={() => setForm({ ...form, adAccountSource: "CLIENT" })} 
                      className="accent-accent size-4" 
                    />
                    <UserCircle2 className="size-4 text-muted-foreground" /> Client's Account
                  </label>
                </div>
                
                {form.adAccountSource === "CLIENT" && (
                  <select
                    value={form.targetOrganizationId}
                    onChange={(e) => setForm({ ...form, targetOrganizationId: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent mt-2"
                  >
                    <option value="" disabled>Select a Client Brand</option>
                    {clientBrands.map((brand) => (
                      <option key={brand.id} value={brand.id} disabled={!brand.hasMetaConnected}>
                        {brand.name} {brand.hasMetaConnected ? "(Meta Connected)" : "(No Meta Account)"}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 space-y-3">
              <div>
                <label className="text-xs font-medium">What are you advertising?</label>
                <div className="flex gap-2 mt-1">
                  <input
                    value={form.productName}
                    onChange={(e) => setForm({ ...form, productName: e.target.value })}
                    placeholder="e.g. Elegant Black Evening Dress"
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleGenerateStrategy}
                    disabled={strategyLoading || !form.productName}
                  >
                    {strategyLoading ? <Loader2 className="size-4 animate-spin" /> : <BrainCircuit className="size-4" />}
                    Strategy
                  </Button>
                </div>
              </div>

              {aiInsight && (
                <div className="mt-3 p-3 bg-background rounded-md border border-border text-xs">
                  <p className="font-semibold text-accent mb-1 flex items-center gap-1">
                    <Sparkles className="size-3" /> AI Strategy Insight
                  </p>
                  <p className="text-muted-foreground mb-2">{aiInsight}</p>
                  {targetAudience && (
                    <p><strong className="text-foreground">Target Audience:</strong> {targetAudience}</p>
                  )}
                </div>
              )}
            </div>

            {provider === "META" && (
              <>
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <p className="text-xs font-medium">Ad Placements</p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                        <input type="checkbox" checked={form.platforms.facebook} onChange={() => handleTogglePlatform("facebook")} className="accent-blue-500 size-4" />
                        <Facebook className="size-4 text-blue-500" /> Facebook
                      </label>
                      {form.platforms.facebook && (
                        <div className="ml-6 mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <label className="flex items-center gap-1"><input type="checkbox" checked={form.platforms.fbFeed} onChange={() => handleTogglePlatform("fbFeed")} className="accent-blue-500" /> Feed</label>
                          <label className="flex items-center gap-1"><input type="checkbox" checked={form.platforms.fbStory} onChange={() => handleTogglePlatform("fbStory")} className="accent-blue-500" /> Story</label>
                          <label className="flex items-center gap-1"><input type="checkbox" checked={form.platforms.fbReels} onChange={() => handleTogglePlatform("fbReels")} className="accent-blue-500" /> Reels</label>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                        <input type="checkbox" checked={form.platforms.instagram} onChange={() => handleTogglePlatform("instagram")} className="accent-pink-500 size-4" />
                        <Instagram className="size-4 text-pink-500" /> Instagram
                      </label>
                      {form.platforms.instagram && (
                        <div className="ml-6 mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <label className="flex items-center gap-1"><input type="checkbox" checked={form.platforms.igFeed} onChange={() => handleTogglePlatform("igFeed")} className="accent-pink-500" /> Feed</label>
                          <label className="flex items-center gap-1"><input type="checkbox" checked={form.platforms.igStory} onChange={() => handleTogglePlatform("igStory")} className="accent-pink-500" /> Story</label>
                          <label className="flex items-center gap-1"><input type="checkbox" checked={form.platforms.igReels} onChange={() => handleTogglePlatform("igReels")} className="accent-pink-500" /> Reels</label>
                          <label className="flex items-center gap-1"><input type="checkbox" checked={form.platforms.igExplore} onChange={() => handleTogglePlatform("igExplore")} className="accent-pink-500" /> Explore</label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium">Original Product Image URL</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="url"
                      value={form.originalImageUrl}
                      onChange={(e) => setForm({ ...form, originalImageUrl: e.target.value })}
                      placeholder="https://..."
                      className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                    <Button type="button" variant="secondary" onClick={handleGenerateImage} disabled={imageLoading || !form.originalImageUrl}>
                      {imageLoading ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">AI Ad Copy</p>
                    <Button type="button" size="sm" variant="outline" onClick={handleGenerateText} disabled={textLoading || !form.productName}>
                      {textLoading ? <Loader2 className="mr-2 size-3 animate-spin" /> : <Sparkles className="mr-2 size-3" />}
                      Generate
                    </Button>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground">Headline</label>
                    <input
                      value={form.headline}
                      onChange={(e) => setForm({ ...form, headline: e.target.value })}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground">Primary Text</label>
                    <textarea
                      rows={3}
                      value={form.adText}
                      onChange={(e) => setForm({ ...form, adText: e.target.value })}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </>
            )}

            {provider === "GOOGLE" && (
              <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/10">
                <div>
                  <label className="text-xs font-medium flex items-center gap-1">
                    <LinkIcon className="size-3" /> Final Destination URL
                  </label>
                  <input
                    type="url"
                    value={form.googleFinalUrl}
                    onChange={(e) => setForm({ ...form, googleFinalUrl: e.target.value })}
                    placeholder="https://styleai.com/product"
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Headlines (Comma separated - Max 3)</label>
                  <input
                    value={form.googleHeadlines}
                    onChange={(e) => setForm({ ...form, googleHeadlines: e.target.value })}
                    placeholder="Buy Premium Fashion, Latest Trends, Shop Now"
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Max 30 characters per headline.</p>
                </div>
                <div>
                  <label className="text-xs font-medium">Descriptions (Comma separated - Max 2)</label>
                  <textarea
                    rows={2}
                    value={form.googleDescriptions}
                    onChange={(e) => setForm({ ...form, googleDescriptions: e.target.value })}
                    placeholder="Discover top quality clothes., Fast delivery."
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Max 90 characters per description.</p>
                </div>
                <div>
                  <label className="text-xs font-medium">Keywords (Comma separated)</label>
                  <input
                    value={form.googleKeywords}
                    onChange={(e) => setForm({ ...form, googleKeywords: e.target.value })}
                    placeholder="fashion, online shopping, style"
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Campaign Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Summer Sale"
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Daily Budget (USD)</label>
                <input
                  type="number"
                  min="1"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
            </div>

            {provider === "META" && (
              <div>
                <label className="text-xs font-medium">Destination Link</label>
                <input
                  type="url"
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
            )}
          </div>

          {provider === "META" && (
            <div className="flex flex-col bg-muted/10">
              <div className="p-3 border-b border-border bg-muted/30 text-center">
                <p className="text-xs font-medium text-muted-foreground">Live Ad Preview</p>
              </div>

              <div className="flex-1 p-6 flex flex-col items-center">
                {form.generatedImageUrl ? (
                  <img src={form.generatedImageUrl} alt="AI Generated Ad" className="w-full aspect-square rounded-lg object-cover shadow-sm" />
                ) : (
                  <div className="w-full aspect-square bg-muted/50 rounded-lg flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border">
                    <ImageIcon className="size-8 mb-2 opacity-50" />
                    <p className="text-xs">AI image will appear here</p>
                  </div>
                )}

                <div className="w-full mt-4 space-y-2 p-4 bg-card rounded-lg border border-border shadow-sm">
                  <p className="font-semibold text-sm">{form.headline || "Your Headline Here"}</p>
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {form.adText || "Your AI generated ad text will appear here..."}
                  </p>
                  <div className="pt-2 mt-2 border-t border-border">
                    <div className="w-full bg-blue-600/10 text-blue-600 text-center py-2 rounded-md text-xs font-medium">
                      Learn More
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {provider === "GOOGLE" && (
            <div className="flex flex-col bg-muted/10 p-6 items-center justify-center text-muted-foreground">
              <Globe2 className="size-12 mb-4 opacity-20" />
              <p className="text-sm text-center">
                Google Search Ads are text-based.<br />Your ad will appear in Google Search results.
              </p>
            </div>
          )}
        </div>

        <div className="ui-panel-footer p-4 flex justify-end gap-2 bg-card">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Rocket className="mr-2 size-4" />}
            Launch Campaign
          </Button>
        </div>
      </div>
    </div>
  );
}