import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useRole,
  getDashboardPath,
  PUBLIC_SIGNUP_ROLES,
  ROLES_REQUIRING_ORG,
  roleLabels,
  type RoleName,
} from "@/lib/role";
import { joinRequestsApi } from "@/lib/join-requests";

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
  BRAND_TEAM_MEMBER: "Request to join a brand and collaborate on daily operations.",
  INFLUENCER: "Discover products and partner with brands.",
  AGENCY: "Run campaigns for multiple brands from one workspace.",
  SHOPPER: "Shop the atelier — save favourites and track orders.",
};

// ======================================================
// PUBLIC DATA FETCHERS
// ======================================================

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

async function fetchPublicBrandRoles(brandId: string): Promise<PublicRoleOption[]> {
  const res = await fetch(`${PUBLIC_BASE}/api/brands/${brandId}/public-roles`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.roles ?? [];
}

// ======================================================
// PAGE
// ======================================================

function RegisterPage() {
  const { register, user, loading: authLoading } = useRole();
  const navigate = useNavigate();
  const { role: roleParam } = Route.useSearch();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleName>(roleParam ?? "BRAND_OWNER");
  const [organizationName, setOrganizationName] = useState("");

  const [brands, setBrands] = useState<PublicBrandOption[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState("");

  const [brandRoles, setBrandRoles] = useState<PublicRoleOption[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState("");

  const [requestMessage, setRequestMessage] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const needsOrg = ROLES_REQUIRING_ORG.includes(role);
  const isTeamMember = role === "BRAND_TEAM_MEMBER";

  useEffect(() => {
    if (!authLoading && user && !requestSent) {
      navigate({ to: getDashboardPath(user.roles) });
    }
  }, [user, authLoading, navigate, requestSent]);

  // Load brands for teammate
  useEffect(() => {
    if (isTeamMember && brands.length === 0 && !brandsLoading) {
      setBrandsLoading(true);
      fetchPublicBrands()
        .then(setBrands)
        .finally(() => setBrandsLoading(false));
    }
  }, [isTeamMember, brands.length, brandsLoading]);

  // Load roles when brand selected
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
        // Auto-select first role
        if (rs[0]) setSelectedRoleId(rs[0].id);
      })
      .finally(() => setRolesLoading(false));
  }, [isTeamMember, selectedBrandId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim() || !email.trim() || !password) {
      setError("Name, email, and password are required.");
      return;
    }
    if (needsOrg && !organizationName.trim()) {
      setError("Organization name is required for this role.");
      return;
    }
    if (isTeamMember && !selectedBrandId) {
      setError("Please select the brand you want to join.");
      return;
    }
    if (isTeamMember && !selectedRoleId) {
      setError("Please select the role you'd like to apply for.");
      return;
    }

    setLoading(true);
    try {
      const created = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        ...(needsOrg && { organizationName: organizationName.trim() }),
      });

      // ======================================================
      // TEAMMATE FLOW — send join request with role, then log out
      // ======================================================
      if (isTeamMember) {
        try {
          await joinRequestsApi.create(
            selectedBrandId,
            requestMessage.trim() || undefined,
            selectedRoleId
          );
        } catch (reqErr: any) {
          setError(
            "Account created, but we could not send your request. Please contact the brand directly. " +
              (reqErr?.message || "")
          );
          setLoading(false);
          return;
        }

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setSuccess(
          "Account created! Your request has been sent to the brand for approval. You'll be able to log in once they accept."
        );
        setRequestSent(true);
        return;
      }

      // ======================================================
      // NORMAL FLOW
      // ======================================================
      setSuccess(`Welcome, ${created.name}! Your account has been created.`);
      setTimeout(() => {
        navigate({ to: getDashboardPath(created.roles) });
      }, 1200);
    } catch (err: any) {
      setError(err?.message || "Could not create your account.");
      setLoading(false);
    }
  }

  // ======================================================
  // PENDING SCREEN
  // ======================================================
  if (requestSent) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 py-16 text-foreground">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
            <CheckCircle2 className="size-7" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-medium tracking-tight">
            Request sent
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {success}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            Waiting for brand owner approval
          </div>
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

          {/* ORG for brand owner / agency */}
          {needsOrg && (
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
          )}

          {/* TEAMMATE — brand + role */}
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
                    No brands available yet. Ask the brand owner to create one first.
                  </p>
                )}
              </div>

              {selectedBrandId && (
                <div className="space-y-2">
                  <Label>Role you're applying for *</Label>
                  {rolesLoading ? (
                    <p className="text-xs text-muted-foreground">Loading roles…</p>
                  ) : brandRoles.length === 0 ? (
                    <p className="text-xs text-destructive">
                      This brand hasn't set up custom roles yet. Try again later.
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
                              <div className="text-sm font-medium">{r.name}</div>
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
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
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