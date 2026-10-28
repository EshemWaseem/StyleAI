// components/auth/register-form.tsx
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/ui/password-strength";
import type { RoleName } from "@/lib/role";

export type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
  organizationName: string;
  country: string;
  phone: string;
  role: RoleName;
};

export function RegisterForm({
  values,
  onChange,
  roleOptions,
  showOrganizationField,
  loading,
  onSubmit,
}: {
  values: RegisterFormValues;
  onChange: <K extends keyof RegisterFormValues>(
    key: K,
    value: RegisterFormValues[K]
  ) => void;
  roleOptions: { value: RoleName; label: string; description: string }[];
  showOrganizationField: boolean;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form className="mt-8 space-y-4" onSubmit={onSubmit} noValidate>
      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          required
          placeholder="Ayesha Khan"
          value={values.name}
          onChange={(e) => onChange("name", e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          value={values.email}
          onChange={(e) => onChange("email", e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          required
          placeholder="At least 8 characters"
          value={values.password}
          onChange={(e) => onChange("password", e.target.value)}
          disabled={loading}
        />
        <PasswordStrength password={values.password} />
      </div>

      <div className="space-y-2">
        <Label>I am joining as</Label>
        <div className="grid gap-2">
          {roleOptions.map((r) => {
            const selected = values.role === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => onChange("role", r.value)}
                disabled={loading}
                className={`flex flex-col items-start rounded-md border px-3 py-2.5 text-left transition-colors ${
                  selected
                    ? "border-accent bg-accent/10"
                    : "border-border bg-card hover:bg-muted/30"
                }`}
              >
                <span className="text-sm font-medium">{r.label}</span>
                <span className="mt-0.5 text-[11px] text-muted-foreground">
                  {r.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {showOrganizationField && (
        <div className="space-y-2">
          <Label htmlFor="organizationName">Organization / brand name</Label>
          <Input
            id="organizationName"
            type="text"
            required
            placeholder="Your brand or agency name"
            value={values.organizationName}
            onChange={(e) => onChange("organizationName", e.target.value)}
            disabled={loading}
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            type="text"
            autoComplete="country-name"
            placeholder="Pakistan"
            value={values.country}
            onChange={(e) => onChange("country", e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+92 300 0000000"
            value={values.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-1.5 size-4 animate-spin" /> Creating account…
          </>
        ) : (
          "Create account"
        )}
      </Button>

      <p className="text-center text-[11px] text-muted-foreground">
        By creating an account you agree to our{" "}
        <Link to="/privacy" className="underline hover:no-underline">
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}