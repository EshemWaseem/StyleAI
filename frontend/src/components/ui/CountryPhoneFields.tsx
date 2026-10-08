// components/ui/CountryPhoneFields.tsx
// ======================================================
// Searchable country/state/city + phone input
// - Flags via flagcdn.com images (Windows-safe)
// - Auto-selects country from IP on first mount
// - Defensive ISO2 matching across library versions
// ======================================================

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useIPCountry } from "@/hooks/useIPCountry";
import { GetCountries, GetState, GetCity } from "react-country-state-city";
import PhoneInput, { isPossiblePhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

// ---------- ISO2 extractor — handles all library variants ----------
function getIso2(c: any): string {
  if (!c) return "";
  return String(
    c.iso2 ?? c.iso_code ?? c.country_code ?? c.code ?? ""
  )
    .trim()
    .toUpperCase();
}

// ======================================================
// Flag image (reliable on Windows)
// ======================================================
function FlagImg({
  iso2,
  className = "h-3.5 w-5",
}: {
  iso2?: string | null;
  className?: string;
}) {
  const code = (iso2 || "").toLowerCase();
  if (!/^[a-z]{2}$/.test(code)) {
    return <span className={cn("inline-block bg-muted", className)} />;
  }
  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      alt={iso2 || ""}
      loading="lazy"
      className={cn("inline-block rounded-[2px] object-cover", className)}
    />
  );
}

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
  showStateCity?: boolean;
  showPhone?: boolean;
  required?: boolean;
  phoneLabel?: string;
  countryLabel?: string;
}

// ======================================================
// Searchable Combobox
// ======================================================
function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "Search…",
  emptyText = "No results.",
  disabled,
  loading,
  renderOption,
  disabledText,
}: {
  value: { id: number; name: string } | null;
  onChange: (opt: any | null) => void;
  options: any[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  loading?: boolean;
  renderOption: (opt: any) => React.ReactNode;
  disabledText?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? options.find((o) => o.id === value.id) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            "h-10 w-full justify-between rounded-md border-input bg-background px-3 text-sm font-normal",
            "hover:bg-background hover:border-accent/40",
            "focus:border-accent focus:ring-2 focus:ring-accent/25",
            !selected && "text-muted-foreground"
          )}
        >
          <span className="flex min-w-0 items-center gap-2 truncate text-left">
            {loading ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Loading…
              </span>
            ) : selected ? (
              renderOption(selected)
            ) : disabled && disabledText ? (
              disabledText
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const isSelected = value?.id === opt.id;
                return (
                  <CommandItem
                    key={opt.id}
                    value={`${opt.name} ${getIso2(opt)}`}
                    onSelect={() => {
                      onChange(opt);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {renderOption(opt)}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ======================================================
// MAIN COMPONENT
// ======================================================
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

  const ipIso2 = useIPCountry();
  const userTouchedRef = useRef(false);

  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // ---- Load countries ----
  useEffect(() => {
    GetCountries()
      .then((list: any[]) => {
        setCountries(list || []);
        // DEBUG — peek at first country shape (remove later)
        if (list?.[0]) {
          console.log("[ip] sample country object:", list[0]);
        }
      })
      .catch(() => setCountries([]))
      .finally(() => setLoadingCountries(false));
  }, []);

  // ---- Auto-detect from IP ----
  useEffect(() => {
    if (!ipIso2) return;
    if (userTouchedRef.current) return;    // user manually picked — respect
    if (countries.length === 0) return;

    const detected = countries.find(
      (c) => getIso2(c) === ipIso2.toUpperCase()
    );

    if (detected) {
      console.log("[ip] auto-selecting:", detected.name, getIso2(detected));
      onChange({
        ...value,
        country: {
          id: detected.id,
          name: detected.name,
          iso2: getIso2(detected),
        },
        state: null,
        city: null,
      });
    } else {
      console.warn("[ip] no match found in library for:", ipIso2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ipIso2, countries.length]);

  // ---- Load states ----
  useEffect(() => {
    if (!value.country?.id) {
      setStates([]);
      return;
    }
    setLoadingStates(true);
    GetState(value.country.id)
      .then((list: any[]) => setStates(list || []))
      .catch(() => setStates([]))
      .finally(() => setLoadingStates(false));
  }, [value.country?.id]);

  // ---- Load cities ----
  useEffect(() => {
    if (!value.country?.id || !value.state?.id) {
      setCities([]);
      return;
    }
    setLoadingCities(true);
    GetCity(value.country.id, value.state.id)
      .then((list: any[]) => setCities(list || []))
      .catch(() => setCities([]))
      .finally(() => setLoadingCities(false));
  }, [value.country?.id, value.state?.id]);

  return (
    <div className="space-y-4">
      {/* ---------- Phone ---------- */}
      {showPhone && (
        <div className="space-y-2">
          <Label>{phoneLabel}{star}</Label>
          <PhoneInput
            international
            defaultCountry={
              (value.country?.iso2 as any) || (ipIso2 as any) || "PK"
            }
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

      {/* ---------- Country ---------- */}
      <div className="space-y-2">
        <Label>{countryLabel}{star}</Label>
        <SearchableSelect
          value={value.country}
          onChange={(c) => {
            userTouchedRef.current = true;   // user picked — stop auto
            onChange({
              ...value,
              country: c
                ? { id: c.id, name: c.name, iso2: getIso2(c) }
                : null,
              state: null,
              city: null,
            });
          }}
          options={countries}
          placeholder="Select country"
          searchPlaceholder="Search country…"
          emptyText="No country found."
          disabled={disabled}
          loading={loadingCountries}
          renderOption={(c) => (
            <span className="flex min-w-0 items-center gap-2">
              <FlagImg iso2={getIso2(c)} className="h-3.5 w-5 shrink-0" />
              <span className="truncate">{c.name}</span>
            </span>
          )}
        />
      </div>

      {/* ---------- State + City ---------- */}
      {showStateCity && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>State / Province{star}</Label>
            <SearchableSelect
              value={value.state}
              onChange={(s) =>
                onChange({
                  ...value,
                  state: s ? { id: s.id, name: s.name } : null,
                  city: null,
                })
              }
              options={states}
              placeholder="Select state"
              searchPlaceholder="Search state…"
              emptyText="No state found."
              disabled={disabled || !value.country}
              disabledText="Select country first"
              loading={loadingStates}
              renderOption={(s) => <span className="truncate">{s.name}</span>}
            />
          </div>

          <div className="space-y-2">
            <Label>City{star}</Label>
            <SearchableSelect
              value={value.city}
              onChange={(c) =>
                onChange({
                  ...value,
                  city: c ? { id: c.id, name: c.name } : null,
                })
              }
              options={cities}
              placeholder="Select city"
              searchPlaceholder="Search city…"
              emptyText="No city found."
              disabled={disabled || !value.country || !value.state}
              disabledText="Select state first"
              loading={loadingCities}
              renderOption={(c) => <span className="truncate">{c.name}</span>}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ======================================================
// Validation helper
// ======================================================
export function validateCountryPhone(
  v: CountryPhoneFieldsValue,
  {
    requirePhone = true,
    requireCountry = true,
    requireStateCity = false,
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