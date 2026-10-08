// components/ui/CountryPhoneFields.tsx
import { Label } from "@/components/ui/label";
import { CountrySelect, StateSelect, CitySelect } from "react-country-state-city";
import "react-country-state-city/dist/react-country-state-city.css";
import PhoneInput, { isPossiblePhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

export type CSC = { id: number; name: string; iso2?: string } | null;

export interface CountryPhoneFieldsValue {
  country: CSC;
  state: CSC;
  city: CSC;
  phone: string | undefined;
}

interface Props {
  value: CountryPhoneFieldsValue;
  onChange: (next: CountryPhoneFieldsValue) => void;
  disabled?: boolean;
  /** Show state + city (default true) */
  showStateCity?: boolean;
  /** Show phone input (default true) — set false for brand forms */
  showPhone?: boolean;
  /** Required marker */
  required?: boolean;
  /** Label overrides */
  phoneLabel?: string;
  countryLabel?: string;
}

export function CountryPhoneFields({
  value,
  onChange,
  disabled = false,
  showStateCity = true,
  showPhone = true,
  required = false,
  phoneLabel = "Phone number",
  countryLabel = "Country",
}: Props) {
  const star = required ? " *" : "";

  return (
    <>
      {showPhone && (
        <div className="space-y-2">
          <Label>{phoneLabel}{star}</Label>
          <PhoneInput
            international
            defaultCountry={(value.country?.iso2 as any) || "PK"}
            value={value.phone}
            onChange={(phone) =>
              onChange({ ...value, phone: phone ?? undefined })
            }
            disabled={disabled}
            placeholder="Enter phone number"
          />
          <p className="text-[11px] text-muted-foreground">
            Include country code — e.g. +92 for Pakistan
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label>{countryLabel}{star}</Label>
        <CountrySelect
          value={
            value.country ? { id: value.country.id, name: value.country.name } : undefined
          }
          onChange={(c: any) =>
            onChange({
              ...value,
              country: { id: c.id, name: c.name, iso2: c.iso2 },
              state: null,
              city: null,
            })
          }
          placeHolder="Select country"
          disabled={disabled}
        />
      </div>

      {showStateCity && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>State / Province{star}</Label>
            <StateSelect
              countryid={value.country?.id}
              value={value.state ? { id: value.state.id, name: value.state.name } : undefined}
              onChange={(s: any) =>
                onChange({ ...value, state: { id: s.id, name: s.name }, city: null })
              }
              placeHolder="Select state"
              disabled={disabled || !value.country}
            />
          </div>
          <div className="space-y-2">
            <Label>City{star}</Label>
            <CitySelect
              countryid={value.country?.id}
              stateid={value.state?.id}
              value={value.city ? { id: value.city.id, name: value.city.name } : undefined}
              onChange={(c: any) =>
                onChange({ ...value, city: { id: c.id, name: c.name } })
              }
              placeHolder="Select city"
              disabled={disabled || !value.country || !value.state}
            />
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Validation helper — call before submit.
 */
export function validateCountryPhone(
  v: CountryPhoneFieldsValue,
  {
    requirePhone = true,
    requireCountry = true,
    requireStateCity = true,
  }: {
    requirePhone?: boolean;
    requireCountry?: boolean;
    requireStateCity?: boolean;
  } = {}
): string | null {
  if (requirePhone) {
    if (!v.phone) return "Phone number is required";
    if (!isPossiblePhoneNumber(v.phone)) return "Enter a valid phone number";
  } else if (v.phone && !isPossiblePhoneNumber(v.phone)) {
    return "Enter a valid phone number";
  }
  if (requireCountry && !v.country) return "Please select a country";
  if (requireStateCity) {
    if (!v.state) return "Please select a state / province";
    if (!v.city) return "Please select a city";
  }
  return null;
}