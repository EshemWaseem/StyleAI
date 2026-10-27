// routes/register.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/ui/password-strength";
import { CheckCircle2, Clock, Mail } from "lucide-react";
import {
  CountryPhoneFields,
  validateCountryPhone,
  type CountryPhoneFieldsValue,
} from "@/components/ui/CountryPhoneFields";
import { cn } from "@/lib/utils";
import {
  useRole,
  getDashboardPath,
  PUBLIC_SIGNUP_ROLES,
  ROLES_REQUIRING_ORG,
  roleLabels,
  type RoleName,
} from "@/lib/role";
import { http, type ApiError } from "@/lib/api";

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>) => ({
    role: search.role as RoleName | undefined,
  }),
  head: () => ({
    meta: [
      { title: "Create account — StyleAI" },
      { name: "description", content: "Create your StyleAI account." },
    ],
  }),
  component: RegisterPage,
});

const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  SUPER_ADMIN: "",
  BRAND_OWNER: "Manage your brand, products, campaigns, and team.",
  BRAND_TEAM_MEMBER:
    "Request to join a brand and collaborate on daily operations.",
  INFLUENCER: "Discover products and partner with brands.",
  AGENCY: "Run campaigns for multiple brands from one workspace.",
  SHOPPER: "Shop the atelier — save favourites and track orders.",
};

const PUBLIC_BASE =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";

interface PublicBrandOption {
  id: string;
  name: string;
  slug: string;
  organization: { name: string };
}

interface PublicRoleOption {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
}

async function fetchPublicBrands(): Promise<PublicBrandOption[]> {
  const res = await fetch(`${PUBLIC_BASE}/api/brands/public`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.brands ?? [];
}

async function fetchPublicBrandRoles(
  brandId: string
): Promise<PublicRoleOption[]> {
  const res = await fetch(`${PUBLIC_BASE}/api/brands/${brandId}/public-roles`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.roles ?? [];
}

function RegisterPage() {
  const { user, loading: authLoading } = useRole();
  const navigate = useNavigate();
  const { role: roleParam } = Route.useSearch();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<RoleName>(roleParam ?? "BRAND_OWNER");
  const [organizationName, setOrganizationName] = useState("");

  const [brands, setBrands] = useState<PublicBrandOption[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState("");

  const [brandRoles, setBrandRoles] = useState<PublicRoleOption[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState("");

  const [requestMessage, setRequestMessage] = useState("");

  const [geo, setGeo] = useState<CountryPhoneFieldsValue>({
    country: null,
    state: null,
    city: null,
    phone: undefined,
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [verifySent, setVerifySent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  const needsOrg = ROLES_REQUIRING_ORG.includes(role);
  const isTeamMember = role === "BRAND_TEAM_MEMBER";
  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    if (!authLoading && user && !requestSent && !verifySent) {
      navigate({ to: getDashboardPath(user.roles) });
    }
  }, [user, authLoading, navigate, requestSent, verifySent]);

  useEffect(() => {
    if (isTeamMember && brands.length === 0 && !brandsLoading) {
      setBrandsLoading(true);
      fetchPublicBrands()
        .then(setBrands)
        .finally(() => setBrandsLoading(false));
    }
  }, [isTeamMember, brands.length, brandsLoading]);

  useEffect(() => {
    if (!isTeamMember || !selectedBrandId) {
      setBrandRoles([]);
      setSelectedRoleId("");
      return;
    }
    setRolesLoading(true);
    fetchPublicBrandRoles(selectedBrandId)
      .then((rs) => {
        setBrandRoles(rs);
        if (rs[0]) setSelectedRoleId(rs[0].id);
      })
      .finally(() => setRolesLoading(false));
  }, [isTeamMember, selectedBrandId]);

  async function handleResendVerify() {
    if (!registeredEmail || resending) return;
    setResending(true);
    setResendDone(false);
    try {
      await http.post(
        "/api/auth/verify-email/resend",
        { email: registeredEmail },
        { skipAuth: true }
      );
      setResendDone(true);
    } catch (err: any) {
      setError(
        err?.message ||
          "Could not resend verification email. Please try again in a moment."
      );
    } finally {
      setResending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password) {
      setError("Name, email, and password are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (needsOrg && !organizationName.trim()) {
      setError("Organization name is required for this role.");
      return;
    }
    if (isTeamMember && !selectedBrandId) {
      setError("Please select a brand to join.");
      return;
    }
    if (isTeamMember && !selectedRoleId) {
      setError("Please select the role you'd like to apply for.");
      return;
    }

    if (needsOrg) {
      const geoErr = validateCountryPhone(geo, {
        requirePhone: true,
        requireCountry: true,
        requireStateCity: false,
      });
      if (geoErr) {
        setError(geoErr);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await http.post<{
        message: string;
        token: string | null;
        emailVerified?: boolean;
        pendingApproval?: boolean;
        user: any;
      }>(
        "/api/auth/register",
        {
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          // R3 FIX: pass brand intent so backend creates join request atomically
          ...(isTeamMember && {
            brandId: selectedBrandId,
            brandRoleId: selectedRoleId,
            requestMessage: requestMessage.trim() || undefined,
          }),
          ...(needsOrg && {
            organizationName: organizationName.trim(),
            country: geo.country?.name,
            phone: geo.phone,
          }),
        },
        { skipAuth: true }
      );

      // R3 FIX: join request is now created atomically by backend inside
      // the registration transaction. No separate join request call needed.

      setRegisteredEmail(email.trim().toLowerCase());
      if (isTeamMember) {
        setRequestSent(true);
      } else {
        setVerifySent(true);
      }
      setLoading(false);
    } catch (errRaw: any) {
      const err = errRaw as ApiError;
      const code = err?.code;
      const status = err?.status;

      if (status === 429 && code === "REGISTER_RATE_LIMIT") {
        const retryAfter = Number(err?.retryAfter ?? 3600);
        const mins = Math.ceil(retryAfter / 60);
        setError(
          `Too many accounts created from this network. Please try again in ${mins} minute${
            mins === 1 ? "" : "s"
          }.`
        );
      } else if (status === 409 || code === "DUPLICATE") {
        setError("This email is already registered. Try signing in instead.");
      } else if (status === 429 && code === "AUTH_RATE_LIMIT") {
        setError("Too many requests. Please slow down and try again.");
      } else if (
        status === 503 ||
        code === "SERVICE_UNAVAILABLE" ||
        code === "NETWORK_ERROR"
      ) {
        setError(
          "Service is temporarily unavailable. Please try again in a moment."
        );
      } else if (status === 403) {
        setError(
          err?.message ||
            "This role cannot be self-registered. Please contact an administrator."
        );
      } else if (status === 400) {
        setError(err?.message || "Please check the values you entered.");
      } else {
        setError(err?.message || "Could not create your account.");
      }
      setLoading(false);
    }
  }

  
  // TEAM MEMBER PENDING SCREEN
  
  if (requestSent) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 py-16 text-foreground">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
            <CheckCircle2 className="size-7" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-medium tracking-tight">
            Account created
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            We've sent a verification link to{" "}
            <strong className="text-foreground">{registeredEmail}</strong>.
            Please verify your email, then wait for the brand owner's approval.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            Waiting for brand owner approval
          </div>

          {resendDone ? (
            <p className="mt-6 text-xs text-emerald-500">
              ✓ New verification email sent.
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResendVerify}
              disabled={resending}
              className="mt-6 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50"
            >
              {resending ? "Sending…" : "Resend verification email"}
            </button>
          )}

          <div className="mt-8 flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link to="/login">Back to sign in</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/">Go to storefront</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  
  // VERIFY EMAIL SCREEN (normal user)
  
  if (verifySent) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 py-16 text-foreground">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-accent/15 text-accent">
            <Mail className="size-7" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-medium tracking-tight">
            Verify your email
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            We've sent a verification link to{" "}
            <strong className="text-foreground">{registeredEmail}</strong>.
            Click the link in the email to activate your account.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            The link expires in 24 hours. Check your spam folder if you don't
            see it.
          </p>

          {resendDone ? (
            <p className="mt-6 text-xs text-emerald-500">
              ✓ New verification email sent. Check your inbox.
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResendVerify}
              disabled={resending}
              className="mt-6 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50"
            >
              {resending ? "Sending…" : "Resend verification email"}
            </button>
          )}

          <div className="mt-8 flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link to="/login">Back to sign in</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/">Go to storefront</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-16 text-foreground">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-md bg-foreground text-background font-display text-sm">
            S
          </span>
          <span className="font-display text-[15px]">StyleAI</span>
        </Link>

        <h1 className="mt-10 font-display text-3xl font-medium tracking-tight">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose how you'll use StyleAI.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {error}
            </div>
          )}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">I am a…</legend>
            <div className="grid gap-2">
              {PUBLIC_SIGNUP_ROLES.map((r) => {
                const selected = role === r;
                return (
                  <label
                    key={r}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                      selected
                        ? "border-foreground bg-accent/40"
                        : "border-border hover:bg-accent/20"
                    )}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={selected}
                      onChange={() => setRole(r)}
                      className="mt-1"
                      disabled={loading}
                    />
                    <div>
                      <div className="text-sm font-medium">{roleLabels[r]}</div>
                      <div className="text-xs text-muted-foreground">
                        {ROLE_DESCRIPTIONS[r]}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              required
              placeholder="Ayesha Khan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          {needsOrg && (
            <>
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization name</Label>
                <Input
                  id="organizationName"
                  type="text"
                  autoComplete="organization"
                  required
                  placeholder="Noor Atelier"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Your workspace will be created under this name.
                </p>
              </div>

              <CountryPhoneFields
                value={geo}
                onChange={setGeo}
                disabled={loading}
                showStateCity={false}
                showPhone={true}
                required
              />
            </>
          )}

          {isTeamMember && (
            <>
              <div className="space-y-2">
                <Label htmlFor="brandId">Brand to join *</Label>
                <select
                  id="brandId"
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  disabled={loading || brandsLoading}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="">
                    {brandsLoading ? "Loading brands…" : "Select a brand…"}
                  </option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — {b.organization.name}
                    </option>
                  ))}
                </select>
                {!brandsLoading && brands.length === 0 && (
                  <p className="text-xs text-destructive">
                    No brands available yet. Ask the brand owner to create one
                    first.
                  </p>
                )}
              </div>

              {selectedBrandId && (
                <div className="space-y-2">
                  <Label>Role you're applying for *</Label>
                  {rolesLoading ? (
                    <p className="text-xs text-muted-foreground">
                      Loading roles…
                    </p>
                  ) : brandRoles.length === 0 ? (
                    <p className="text-xs text-destructive">
                      This brand hasn't set up custom roles yet. Try again
                      later.
                    </p>
                  ) : (
                    <div className="grid gap-2">
                      {brandRoles.map((r) => {
                        const active = selectedRoleId === r.id;
                        return (
                          <label
                            key={r.id}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                              active
                                ? "border-foreground bg-accent/40"
                                : "border-border hover:bg-accent/20"
                            )}
                          >
                            <input
                              type="radio"
                              name="brandRole"
                              value={r.id}
                              checked={active}
                              onChange={() => setSelectedRoleId(r.id)}
                              className="mt-1"
                              disabled={loading}
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-medium">
                                {r.name}
                              </div>
                              {r.description && (
                                <div className="text-xs text-muted-foreground">
                                  {r.description}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="requestMessage">Message (optional)</Label>
                <textarea
                  id="requestMessage"
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  rows={2}
                  placeholder="Briefly introduce yourself…"
                  disabled={loading}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              required
              minLength={6}
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <PasswordStrength password={password} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              required
              minLength={6}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
            {passwordsMismatch && (
              <p className="text-xs text-destructive">
                Passwords do not match.
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || passwordsMismatch}
          >
            {loading
              ? isTeamMember
                ? "Sending request…"
                : "Creating account…"
              : isTeamMember
              ? "Send join request"
              : "Create account"}
          </Button>
        </form>

        <p className="mt-8 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-foreground underline underline-offset-4 hover:no-underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}