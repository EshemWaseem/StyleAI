// settings.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Save,
  AlertCircle,
  CheckCircle2,
  User,
  Building2,
  ShieldCheck,
  ExternalLink,
  Pencil,
  KeyRound,
  Lock,
  Bell,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader, Panel, SectionTitle } from "@/components/ui-kit";
import { useRole } from "@/lib/role";
import { http } from "@/lib/api";
import { influencersApi, type Influencer } from "@/lib/influencers";
import {
  notificationsApi,
  type NotificationPreference,
  type UpdatePreferenceInput,
} from "@/lib/notifications";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — StyleAI" },
      { name: "description", content: "Account, security, and preferences." },
    ],
  }),
  component: SettingsPage,
});

// ======================================================
// ROLE HELPERS
// ======================================================
const OWNER_ROLES = ["SUPER_ADMIN", "BRAND_OWNER", "AGENCY"];

function isInfluencerOnly(roles: string[] = []) {
  return (
    roles.includes("INFLUENCER") &&
    !roles.some((r) => OWNER_ROLES.includes(r))
  );
}
function isBrandUser(roles: string[] = []) {
  return roles.some((r) => ["BRAND_OWNER", "AGENCY"].includes(r));
}
function isAdmin(roles: string[] = []) {
  return roles.includes("SUPER_ADMIN");
}

// ======================================================
// SETTINGS PAGE
// ======================================================
function SettingsPage() {
  const { user, loading: authLoading } = useRole();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Influencer | null>(null);
  const [loading, setLoading] = useState(true);

  // ---------- Account form ----------
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountMsg, setAccountMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // ---------- Password form ----------
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // ---------- Notification preferences ----------
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // ---------- Auth guard ----------
  useEffect(() => {
    if (authLoading || !user) return;
    if (user.pendingApproval) navigate({ to: "/pending" });
  }, [authLoading, user, navigate]);

  // ---------- Seed account form ----------
  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setEmail(user.email ?? "");
  }, [user]);

  // ---------- Load influencer profile ----------
  useEffect(() => {
    if (authLoading || !user || user.pendingApproval) return;
    if (!isInfluencerOnly(user.roles ?? [])) {
      setLoading(false);
      return;
    }
    influencersApi
      .getMe()
      .then((res) => setProfile(res.influencer))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [authLoading, user]);

  // ---------- Load preferences ----------
  useEffect(() => {
    if (authLoading || !user) return;
    notificationsApi
      .getPreferences()
      .then((res) => setPrefs(res.preferences))
      .catch(() => setPrefs(null))
      .finally(() => setPrefsLoading(false));
  }, [authLoading, user]);

  // ---------- Save account ----------
  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    setAccountMsg(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setAccountMsg({ type: "err", text: "Name cannot be empty" });
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setAccountMsg({ type: "err", text: "Please enter a valid email" });
      return;
    }
    if (trimmedName === user?.name && trimmedEmail === user?.email) {
      setAccountMsg({ type: "err", text: "No changes to save" });
      return;
    }

    setSavingAccount(true);
    try {
      await http.patch("/api/users/me", { name: trimmedName, email: trimmedEmail });
      setAccountMsg({ type: "ok", text: "Account updated successfully" });

      const stored = localStorage.getItem("user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.name = trimmedName;
          parsed.email = trimmedEmail;
          localStorage.setItem("user", JSON.stringify(parsed));
        } catch {}
      }
    } catch (err: any) {
      setAccountMsg({ type: "err", text: err?.message || "Failed to update account" });
    } finally {
      setSavingAccount(false);
    }
  }

  // ---------- Change password ----------
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);

    if (!currentPassword) {
      setPasswordMsg({ type: "err", text: "Current password is required" });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: "err", text: "New password must be at least 8 characters" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "err", text: "Passwords do not match" });
      return;
    }

    setSavingPassword(true);
    try {
      await http.patch("/api/users/me/password", { currentPassword, newPassword });
      setPasswordMsg({ type: "ok", text: "Password updated successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordMsg({ type: "err", text: err?.message || "Failed to update password" });
    } finally {
      setSavingPassword(false);
    }
  }

  // ---------- Toggle a single preference ----------
  function togglePref(key: keyof UpdatePreferenceInput) {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: !prefs[key] });
    setPrefsMsg(null);
  }

  // ---------- Save preferences ----------
  async function handleSavePrefs() {
    if (!prefs) return;
    setPrefsMsg(null);
    setPrefsSaving(true);
    try {
      const payload: UpdatePreferenceInput = {
        emailTrial: prefs.emailTrial,
        emailOffers: prefs.emailOffers,
        emailCampaigns: prefs.emailCampaigns,
        emailWallet: prefs.emailWallet,
        emailPayments: prefs.emailPayments,
        emailSystem: prefs.emailSystem,
      };
      const res = await notificationsApi.updatePreferences(payload);
      setPrefs(res.preferences);
      setPrefsMsg({ type: "ok", text: "Preferences saved" });
    } catch (err: any) {
      setPrefsMsg({ type: "err", text: err?.message || "Failed to save preferences" });
    } finally {
      setPrefsSaving(false);
    }
  }

  if (authLoading || loading) {
    return <p className="text-sm text-muted-foreground">Loading settings…</p>;
  }
  if (!user || user.pendingApproval) return null;

  const roles = user.roles ?? [];
  const influencerMode = isInfluencerOnly(roles);
  const brandMode = isBrandUser(roles);
  const adminMode = isAdmin(roles);

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Your account credentials, security, and role-specific shortcuts."
      />

      {/* ======================================================
          1. ACCOUNT
      ====================================================== */}
      <Panel className="mt-8">
        <SectionTitle
          title="Account"
          description="Your name and email. Used everywhere in the workspace."
          action={<User className="size-4 text-muted-foreground" />}
        />
        <form onSubmit={handleSaveAccount} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={savingAccount} autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={savingAccount} autoComplete="email" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <span key={r} className="inline-flex items-center rounded-full bg-accent/15 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-accent">
                  {r.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>

          {accountMsg && (
            <div className={accountMsg.type === "ok"
              ? "flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-500"
              : "flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"}>
              {accountMsg.type === "ok" ? <CheckCircle2 className="size-3.5 shrink-0" /> : <AlertCircle className="size-3.5 shrink-0" />}
              <span>{accountMsg.text}</span>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={savingAccount}>
              <Save className="mr-1.5 size-3.5" />
              {savingAccount ? "Saving…" : "Save account"}
            </Button>
          </div>
        </form>
      </Panel>

      {/* ======================================================
          2. SECURITY
      ====================================================== */}
      <Panel className="mt-6">
        <SectionTitle title="Security" description="Change your login password." action={<Lock className="size-4 text-muted-foreground" />} />
        <form onSubmit={handleChangePassword} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={savingPassword} autoComplete="current-password" placeholder="••••••••" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={savingPassword} autoComplete="new-password" placeholder="At least 8 characters" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={savingPassword} autoComplete="new-password" placeholder="Repeat new password" />
            </div>
          </div>
          {passwordMsg && (
            <div className={passwordMsg.type === "ok"
              ? "flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-500"
              : "flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"}>
              {passwordMsg.type === "ok" ? <CheckCircle2 className="size-3.5 shrink-0" /> : <AlertCircle className="size-3.5 shrink-0" />}
              <span>{passwordMsg.text}</span>
            </div>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={savingPassword}>
              <KeyRound className="mr-1.5 size-3.5" />
              {savingPassword ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-dashed border-border bg-muted/5 p-4 opacity-60">
            <p className="text-xs font-medium">Two-factor authentication</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Coming soon — extra security for logins.</p>
          </div>
          <div className="rounded-lg border border-dashed border-border bg-muted/5 p-4 opacity-60">
            <p className="text-xs font-medium">Active sessions</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Coming soon — view and revoke devices.</p>
          </div>
        </div>
      </Panel>

      {/* ======================================================
          3. NOTIFICATIONS — REAL PREFERENCES
      ====================================================== */}
      <Panel className="mt-6">
        <SectionTitle
          title="Notifications"
          description="Choose which emails you receive. In-app notifications are always on."
          action={<Bell className="size-4 text-muted-foreground" />}
        />

        {prefsLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading preferences…
          </div>
        ) : !prefs ? (
          <p className="py-4 text-sm text-muted-foreground">Could not load preferences. Refresh the page.</p>
        ) : (
          <div className="space-y-5">
            {/* Trial & subscription lifecycle */}
            <ToggleRow
              label="Trial & subscription reminders"
              description="Trial ending soon, trial expired, plan changes."
              checked={prefs.emailTrial}
              onToggle={() => togglePref("emailTrial")}
              disabled={prefsSaving}
            />

            {/* Offers */}
            <ToggleRow
              label="Offers"
              description="New offers received, offers accepted or declined."
              checked={prefs.emailOffers}
              onToggle={() => togglePref("emailOffers")}
              disabled={prefsSaving}
            />

            {/* Campaigns */}
            <ToggleRow
              label="Campaign updates"
              description="Content submitted, approved, or rejected."
              checked={prefs.emailCampaigns}
              onToggle={() => togglePref("emailCampaigns")}
              disabled={prefsSaving}
            />

            {/* Wallet */}
            <ToggleRow
              label="Wallet & withdrawals"
              description="Withdrawal requests, approvals, and rejections."
              checked={prefs.emailWallet}
              onToggle={() => togglePref("emailWallet")}
              disabled={prefsSaving}
            />

            {/* Payments */}
            <ToggleRow
              label="Payment receipts"
              description="Subscription receipts and invoices."
              checked={prefs.emailPayments}
              onToggle={() => togglePref("emailPayments")}
              disabled={prefsSaving}
            />

            {/* System */}
            <ToggleRow
              label="System announcements"
              description="Important platform updates and maintenance notices."
              checked={prefs.emailSystem}
              onToggle={() => togglePref("emailSystem")}
              disabled={prefsSaving}
            />

            {prefsMsg && (
              <div className={prefsMsg.type === "ok"
                ? "flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-500"
                : "flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"}>
                {prefsMsg.type === "ok" ? <CheckCircle2 className="size-3.5 shrink-0" /> : <AlertCircle className="size-3.5 shrink-0" />}
                <span>{prefsMsg.text}</span>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleSavePrefs} disabled={prefsSaving}>
                <Save className="mr-1.5 size-3.5" />
                {prefsSaving ? "Saving…" : "Save preferences"}
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground">
              In-app notifications are always on so you don't miss anything important.
              Turning off an email category only affects emails — not in-app alerts.
            </p>
          </div>
        )}
      </Panel>

      {/* ======================================================
          4. ROLE SHORTCUTS
      ====================================================== */}
      {influencerMode && (
        <Panel className="mt-6">
          <SectionTitle title="Creator profile" description="Your public creator identity — edited on the profile page." action={<Pencil className="size-4 text-muted-foreground" />} />
          {profile ? (
            <>
              <div className="flex items-center gap-4">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.displayName} className="size-14 rounded-full border border-border object-cover" />
                ) : (
                  <div className="grid size-14 place-items-center rounded-full bg-muted text-lg font-medium text-muted-foreground">
                    {profile.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-medium">{profile.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    @{profile.username}
                    {profile.categories.length > 0 ? ` · ${profile.categories.join(", ")}` : ""}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/influencers/$slug" params={{ slug: profile.slug }}>
                    <Pencil className="mr-1.5 size-3.5" /> Edit profile
                  </Link>
                </Button>
              </div>
              {!profile.profileCompleted && (
                <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
                  <p className="font-medium text-amber-500">Profile incomplete</p>
                  <p className="mt-1 text-muted-foreground">Add your bio, categories, and social accounts so brands can find you.</p>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/10 p-6 text-center">
              <User className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Profile loading failed. Refresh the page.</p>
            </div>
          )}
        </Panel>
      )}

      {brandMode && (
        <Panel className="mt-6">
          <SectionTitle title="Brand & team" description="Managed on dedicated pages." />
          <div className="space-y-3">
            <Link to="/brands" className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <Building2 className="size-4 text-accent" />
                <div>
                  <p className="text-sm font-medium">Brand profile</p>
                  <p className="text-xs text-muted-foreground">Name, logo, voice, style, target audience</p>
                </div>
              </div>
              <ExternalLink className="size-4 text-muted-foreground" />
            </Link>
            <Link to="/team" className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <User className="size-4 text-accent" />
                <div>
                  <p className="text-sm font-medium">Team</p>
                  <p className="text-xs text-muted-foreground">Members, roles, and invitations</p>
                </div>
              </div>
              <ExternalLink className="size-4 text-muted-foreground" />
            </Link>
          </div>
        </Panel>
      )}

      {adminMode && (
        <Panel className="mt-6">
          <SectionTitle title="Platform administration" description="System-wide controls." action={<ShieldCheck className="size-4 text-muted-foreground" />} />
          <div className="space-y-3">
            <Link to="/admin" className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-4 text-accent" />
                <div>
                  <p className="text-sm font-medium">Platform health</p>
                  <p className="text-xs text-muted-foreground">Service status, latency, AI usage</p>
                </div>
              </div>
              <ExternalLink className="size-4 text-muted-foreground" />
            </Link>
            <Link to="/admin/users" className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <User className="size-4 text-accent" />
                <div>
                  <p className="text-sm font-medium">Users & access</p>
                  <p className="text-xs text-muted-foreground">Manage users, roles, and permissions</p>
                </div>
              </div>
              <ExternalLink className="size-4 text-muted-foreground" />
            </Link>
          </div>
        </Panel>
      )}

      {/* ======================================================
          5. DATA & TRUST
      ====================================================== */}
      <Panel className="mt-6">
        <SectionTitle title="Data & trust" description="How StyleAI handles your data." />
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium">Organisation isolation</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Data never crosses brands or organisations.</p>
          </div>
          <div>
            <p className="font-medium">AI processing</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Product images and brand documents are processed to build your private profile.</p>
          </div>
          <div>
            <p className="font-medium">Human review</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Generated content and imagery require approval before publishing.</p>
          </div>
          <div>
            <p className="font-medium">Predictions</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Forecasts are estimates and are never presented as guarantees.</p>
          </div>
        </div>
      </Panel>
    </>
  );
}

// ======================================================
// Toggle row helper
// ======================================================
function ToggleRow({
  label,
  description,
  checked,
  onToggle,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onToggle} disabled={disabled} />
    </div>
  );
}