// components/agency/AgencyProfileModal.tsx
import { useState } from "react";
import { X, Loader2, AlertCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { agencyApi } from "@/lib/agency";
import type { AgencyProfile, AgencyServiceType } from "@/lib/agency/types";
import {
  AGENCY_SERVICE_LABELS,
  AGENCY_SERVICE_DESCRIPTIONS,
  BRAND_SERVICE_TYPES,
  INFLUENCER_SERVICE_TYPES,
} from "@/lib/agency/types";

interface Props {
  initial: AgencyProfile;
  onClose: () => void;
  onSaved: (p: AgencyProfile) => void;
}

export function AgencyProfileModal({ initial, onClose, onSaved }: Props) {
  const [displayName, setDisplayName] = useState(initial.displayName ?? "");
  const [tagline, setTagline] = useState(initial.tagline ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [website, setWebsite] = useState(initial.website ?? "");
  const [currency, setCurrency] = useState(initial.currency || "PKR");
  const [isAcceptingNew, setIsAcceptingNew] = useState(initial.isAcceptingNew);
  const [serviceTypes, setServiceTypes] = useState<AgencyServiceType[]>(initial.serviceTypes);
  const [monthlyRetainer, setMonthlyRetainer] = useState(initial.monthlyRetainer?.toString() ?? "");
  const [hourlyRate, setHourlyRate] = useState(initial.hourlyRate?.toString() ?? "");
  const [photoshootRate, setPhotoshootRate] = useState(initial.photoshootRate?.toString() ?? "");
  const [videographyRate, setVideographyRate] = useState(initial.videographyRate?.toString() ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleService(type: AgencyServiceType) {
    setServiceTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (serviceTypes.length === 0) {
      setError("Select at least one service category");
      return;
    }
    setSaving(true);
    try {
      const res = await agencyApi.update({
        displayName: displayName.trim() || null,
        tagline: tagline.trim() || null,
        description: description.trim() || null,
        website: website.trim() || null,
        currency,
        isAcceptingNew,
        serviceTypes,
        monthlyRetainer: monthlyRetainer ? Number(monthlyRetainer) : null,
        hourlyRate: hourlyRate ? Number(hourlyRate) : null,
        photoshootRate: photoshootRate ? Number(photoshootRate) : null,
        videographyRate: videographyRate ? Number(videographyRate) : null,
      });
      onSaved(res.profile);
    } catch (err: any) {
      setError(err?.message || "Failed to save");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-6">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-card shadow-xl my-4">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4 rounded-t-xl">
          <h3 className="text-sm font-medium">Agency profile & services</h3>
          <button onClick={onClose} disabled={saving} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-5">
          {/* Identity */}
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Identity
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayName">Agency name</Label>
                <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Ayesha Creatives" disabled={saving} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" disabled={saving} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Short pitch — 1 line" disabled={saving} maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does your agency do best?" rows={3} disabled={saving} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium">Accepting new engagements</p>
                <p className="text-xs text-muted-foreground">Turn off to hide from directory.</p>
              </div>
              <Switch checked={isAcceptingNew} onCheckedChange={setIsAcceptingNew} disabled={saving} />
            </div>
          </div>

          {/* Brand-side services */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Brand-side services
            </p>
            <div className="grid gap-2">
              {BRAND_SERVICE_TYPES.map((type) => (
                <ServiceTile
                  key={type}
                  type={type}
                  selected={serviceTypes.includes(type)}
                  onToggle={() => toggleService(type)}
                  disabled={saving}
                />
              ))}
            </div>
          </div>

          {/* Influencer-side services */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Influencer-side services
            </p>
            <div className="grid gap-2">
              {INFLUENCER_SERVICE_TYPES.map((type) => (
                <ServiceTile
                  key={type}
                  type={type}
                  selected={serviceTypes.includes(type)}
                  onToggle={() => toggleService(type)}
                  disabled={saving}
                />
              ))}
            </div>
          </div>

          {/* Rates */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Rate card (optional)
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} disabled={saving} maxLength={3} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <RateInput label="Monthly retainer" value={monthlyRetainer} onChange={setMonthlyRetainer} currency={currency} disabled={saving} />
              <RateInput label="Hourly rate" value={hourlyRate} onChange={setHourlyRate} currency={currency} disabled={saving} />
              <RateInput label="Photoshoot rate" value={photoshootRate} onChange={setPhotoshootRate} currency={currency} disabled={saving} />
              <RateInput label="Videography rate" value={videographyRate} onChange={setVideographyRate} currency={currency} disabled={saving} />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="mr-1.5 size-3.5 animate-spin" /> Saving…</> : <><Save className="mr-1.5 size-3.5" /> Save profile</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ServiceTile({
  type, selected, onToggle, disabled,
}: {
  type: AgencyServiceType;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
        selected
          ? "border-accent bg-accent/5"
          : "border-border hover:bg-muted/40"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <div className={`mt-0.5 flex size-4 items-center justify-center rounded border-2 ${
        selected ? "border-accent bg-accent" : "border-muted-foreground"
      }`}>
        {selected && <span className="text-[10px] leading-none text-background">✓</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{AGENCY_SERVICE_LABELS[type]}</p>
        <p className="text-xs text-muted-foreground">{AGENCY_SERVICE_DESCRIPTIONS[type]}</p>
      </div>
    </button>
  );
}

function RateInput({
  label, value, onChange, currency, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  currency: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          disabled={disabled}
          className="pr-12"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {currency}
        </span>
      </div>
    </div>
  );
}