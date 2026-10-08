import { swalError, swalSuccess } from "@/lib/swal";
// components/campaigns/ShippingAddressModal.tsx
import { useState } from "react";
import { X, Loader2, AlertCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { campaignsApi } from "@/lib/campaigns";
import type { ShippingAddress, Campaign } from "@/lib/campaigns";

import {
  CountrySelect,
  StateSelect,
  CitySelect,
} from "react-country-state-city";
import "react-country-state-city/dist/react-country-state-city.css";

import PhoneInput, { isPossiblePhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface Props {
  campaignId: string;
  initial?: ShippingAddress | null;
  onClose: () => void;
  onSaved: (c: Campaign) => void;
}

type CSC = { id: number; name: string; iso2?: string } | null;

export function ShippingAddressModal({ campaignId, initial, onClose, onSaved }: Props) {
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [phone, setPhone] = useState<string | undefined>(initial?.phone ?? "");
  const [street, setStreet] = useState(initial?.street ?? "");
  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  // Country/State/City objects
  const [country, setCountry] = useState<CSC>(
    initial?.countryId && initial?.country
      ? { id: initial.countryId, name: initial.country, iso2: initial.countryCode ?? undefined }
      : null
  );
  const [state, setState] = useState<CSC>(
    initial?.stateId && initial?.state
      ? { id: initial.stateId, name: initial.state }
      : null
  );
  const [city, setCity] = useState<CSC>(
    initial?.cityId && initial?.city
      ? { id: initial.cityId, name: initial.city }
      : null
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function validate(): string | null {
    if (!fullName.trim()) return "Full name is required";
    if (!phone) return "Phone number is required";
    if (!isPossiblePhoneNumber(phone)) return "Enter a valid phone number";
    if (!country) return "Please select a country";
    if (!state) return "Please select a state / province";
    if (!city) return "Please select a city";
    if (!street.trim()) return "Street address is required";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const err = validate();
    if (err) {
      setError(err);
      swalError("Check your address", err);
      return;
    }

    setSaving(true);
    try {
      const payload: ShippingAddress = {
        fullName: fullName.trim(),
        phone: phone!,
        street: street.trim(),
        city: city!.name,
        cityId: city!.id,
        state: state!.name,
        stateId: state!.id,
        postalCode: postalCode?.trim() || null,
        country: country!.name,
        countryId: country!.id,
        countryCode: country!.iso2 ?? null,
        notes: notes?.trim() || null,
      };

      const res = await campaignsApi.submitAddress(campaignId, { address: payload });
      swalSuccess("Address submitted", "Your shipping address has been saved.");
      onSaved(res.campaign);
    } catch (err: any) {
      const msg = err?.message || "Failed to submit address";
      setError(msg);
      swalError("Submission failed", msg);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-6">
      <div className="my-4 w-full max-w-lg rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-accent" />
            <h3 className="text-sm font-medium">Shipping address</h3>
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
            <Label htmlFor="fullName">Full name *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={saving}
              autoFocus
              placeholder="e.g. Ayesha Khan"
            />
          </div>

          <div className="space-y-2">
            <Label>Phone number *</Label>
            <PhoneInput
              international
              defaultCountry={(initial?.countryCode as any) || "PK"}
              value={phone}
              onChange={setPhone}
              disabled={saving}
              placeholder="Enter phone number"
              className="phone-input-wrapper"
            />
            <p className="text-[11px] text-muted-foreground">
              Include country code — e.g. +92 for Pakistan
            </p>
          </div>

          <div className="space-y-2">
            <Label>Country *</Label>
            <CountrySelect
              value={country ? { id: country.id, name: country.name } : undefined}
              onChange={(c: any) => {
                setCountry({ id: c.id, name: c.name, iso2: c.iso2 });
                setState(null);
                setCity(null);
              }}
              placeHolder="Select country"
              containerClassName="country-select"
              inputClassName="country-select-input"
              disabled={saving}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>State / Province *</Label>
              <StateSelect
                countryid={country?.id}
                value={state ? { id: state.id, name: state.name } : undefined}
                onChange={(s: any) => {
                  setState({ id: s.id, name: s.name });
                  setCity(null);
                }}
                placeHolder="Select state"
                containerClassName="state-select"
                inputClassName="state-select-input"
                disabled={saving || !country}
              />
            </div>

            <div className="space-y-2">
              <Label>City *</Label>
              <CitySelect
                countryid={country?.id}
                stateid={state?.id}
                value={city ? { id: city.id, name: city.name } : undefined}
                onChange={(c: any) => setCity({ id: c.id, name: c.name })}
                placeHolder="Select city"
                containerClassName="city-select"
                inputClassName="city-select-input"
                disabled={saving || !country || !state}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="street">Street address *</Label>
            <Textarea
              id="street"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              rows={2}
              disabled={saving}
              placeholder="House #, street, area"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal code</Label>
              <Input
                id="postalCode"
                value={postalCode ?? ""}
                onChange={(e) => setPostalCode(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Delivery notes</Label>
              <Input
                id="notes"
                value={notes ?? ""}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ring bell twice"
                disabled={saving}
              />
            </div>
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
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Submitting…
                </>
              ) : (
                "Submit address"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}