// components/agency/HireAgencyModal.tsx
import { useState } from "react";
import { X, Loader2, AlertCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { agencyApi } from "@/lib/agency";
import type { AgencyProfileWithOrg, AgencyServiceType, AgencyEngagement } from "@/lib/agency/types";
import { AGENCY_SERVICE_LABELS } from "@/lib/agency/types";

interface Props {
  agency: AgencyProfileWithOrg;
  serviceType: AgencyServiceType;
  onClose: () => void;
  onCreated: (e: AgencyEngagement) => void;
}

export function HireAgencyModal({ agency, serviceType, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState(agency.currency || "PKR");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    const b = Number(budget);
    if (!b || b <= 0) {
      setError("Budget must be positive");
      return;
    }

    setSaving(true);
    try {
      const res = await agencyApi.createEngagement({
        agencyOrganizationId: agency.organizationId,
        serviceType,
        title: title.trim(),
        description: description.trim() || undefined,
        budget: b,
        currency,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        notes: notes.trim() || undefined,
      });
      onCreated(res.engagement);
    } catch (err: any) {
      setError(err?.message || "Failed to send request");
      setSaving(false);
    }
  }

  const agencyName = agency.displayName || agency.organization?.name || "Agency";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-6">
      <div className="my-4 w-full max-w-lg rounded-xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h3 className="text-sm font-medium">Hire {agencyName}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Service: {AGENCY_SERVICE_LABELS[serviceType]}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="title">Project title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Spring collection photoshoot"
              disabled={saving}
              autoFocus
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What do you need? Location, style, mood, number of shots…"
              rows={3}
              disabled={saving}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="budget">Budget *</Label>
              <Input
                id="budget"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 50000"
                disabled={saving}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                disabled={saving}
                maxLength={3}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline (optional)</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything else the agency should know"
              rows={2}
              disabled={saving}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Send className="mr-1.5 size-3.5" /> Send request
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}