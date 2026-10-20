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
  ShieldAlert,
  LogOut,
  Monitor,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader, Panel, SectionTitle } from "@/components/ui-kit";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/ui/password-strength";
import {
  CountryPhoneFields,
  validateCountryPhone,
  type CountryPhoneFieldsValue,
} from "@/components/ui/CountryPhoneFields";
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

//      ==
// ROLE HELPERS
//      ==
const OWNER_ROLES = ["SUPER_ADMIN", "BRAND_OWNER", "AGENCY"];

function isInfluencerOnly(roles: string[] = []) {
  return (
    roles.includes("INFLUENCER") && !roles.some((r) => OWNER_ROLES.includes(r))
  );
}
function isBrandUser(roles: string[] = []) {
  return roles.some((r) => ["BRAND_OWNER", "AGENCY"].includes(r));
}
function isAdmin(roles: string[] = []) {
  return roles.includes("SUPER_ADMIN");
}

//      ==
// LOGIN ATTEMPT HELPERS
//      ==
interface LoginAttemptRow {
  id: string;
  success: boolean;
  reason: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

function parseUserAgent(ua: string | null): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua) && !/Edg\//.test(ua)
    ? "Chrome"
    : /Firefox\//.test(ua)
    ? "Firefox"
    : /Safari\//.test(ua) && !/Chrome\//.test(ua)
    ? "Safari"
    : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
    ? "macOS"
    : /iPhone/.test(ua)
    ? "iPhone"
    : /Android/.test(ua)
    ? "Android"
    : /Linux/.test(ua)
    ? "Linux"
    : "Unknown";
  return `${browser} · ${os}`;
}

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString();
}

function reasonLabel(reason: string | null, success: boolean): string {
  if (success) return "Signed in";
  switch (reason) {
    case "INVALID_CREDENTIALS":
      return "Wrong password";
    case "ACCOUNT_LOCKED":
      return "Locked attempt";
    case "EMAIL_NOT_VERIFIED":
      return "Email not verified";
    case "PENDING_APPROVAL":
      return "Pending approval";
    default:
      return "Failed";
  }
}

//      ==
// SETTINGS PAGE
//      ==
function SettingsPage() {
  const { user, loading: authLoading, logoutAll } = useRole();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Influencer | null>(null);
  const [loading, setLoading] = useState(true);

  //  - Account form  -
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [geo, setGeo] = useState<CountryPhoneFieldsValue>({
    country: null,
    state: null,
    city: null,
    phone: undefined,
  });
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountMsg, setAccountMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  //  - Password form  -
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  //  - Logout all  -
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [logoutAllMsg, setLogoutAllMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  //  - Login history  -
  const [loginHistory, setLoginHistory] = useState<LoginAttemptRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  //  - Notification preferences  -
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  //  - Auth guard  -
  useEffect(() => {
    if (authLoading || !user) return;
    if (user.pendingApproval) navigate({ to: "/pending" });
  }, [authLoading, user, navigate]);

  //  - Seed account form  -
  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setEmail(user.email ?? "");
    setGeo({
      country:
        user.country && user.countryCode
          ? { id: 0, name: user.country, iso2: user.countryCode }
          : null,
      state: null,
      city: null,
      phone: user.phone || undefined,
    });
  }, [user]);

  //  - Load influencer profile  -
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

  //  - Load preferences  -
  useEffect(() => {
    if (authLoading || !user) return;
    notificationsApi
      .getPreferences()
      .then((res) => setPrefs(res.preferences))
      .catch(() => setPrefs(null))
      .finally(() => setPrefsLoading(false));
  }, [authLoading, user]);

  //  - Load login history  -
  useEffect(() => {
    if (authLoading || !user) return;
    setHistoryLoading(true);
    setHistoryError(null);
    http
      .get<{ attempts: LoginAttemptRow[] }>("/api/auth/login-history")
      .then((res) => setLoginHistory(res.attempts || []))
      .catch((err) =>
        setHistoryError(err?.message || "Could not load login history")
      )
      .finally(() => setHistoryLoading(false));
  }, [authLoading, user]);

  //  - Save account  -
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

    if (geo.phone) {
      const geoErr = validateCountryPhone(geo, {
        requirePhone: false,
        requireCountry: false,
        requireStateCity: false,
      });
      if (geoErr) {
        setAccountMsg({ type: "err", text: geoErr });
        return;
      }
    }

    setSavingAccount(true);
    try {
      await http.patch("/api/users/me", {
        name: trimmedName,
        email: trimmedEmail,
        phone: geo.phone ?? null,
        country: geo.country?.name ?? null,
        countryCode: geo.country?.iso2 ?? null,
      });
      setAccountMsg({ type: "ok", text: "Account updated successfully" });

      const stored = localStorage.getItem("user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.name = trimmedName;
          parsed.email = trimmedEmail;
          parsed.phone = geo.phone ?? null;
          parsed.country = geo.country?.name ?? null;
          parsed.countryCode = geo.country?.iso2 ?? null;
          localStorage.setItem("user", JSON.stringify(parsed));
        } catch {}
      }
    } catch (err: any) {
      setAccountMsg({
        type: "err",
        text: err?.message || "Failed to update account",
      });
    } finally {
      setSavingAccount(false);
    }
  }

  //  - Change password  -
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);

    if (!currentPassword) {
      setPasswordMsg({ type: "err", text: "Current password is required" });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({
        type: "err",
        text: "New password must be at least 6 characters",
      });
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordMsg({
        type: "err",
        text: "New password must be different from your current password",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "err", text: "Passwords do not match" });
      return;
    }

    setSavingPassword(true);
    try {
      await http.post("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setPasswordMsg({
        type: "ok",
        text: "Password updated successfully. A confirmation email has been sent.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const code = err?.code;
      let message = "Failed to update password";
      if (code === "INVALID_CURRENT_PASSWORD") {
        message = "Current password is incorrect.";
      } else if (code === "SAME_PASSWORD") {
        message = "New password must be different from your current password.";
      } else if (code === "WEAK_PASSWORD") {
        message = "New password must be at least 6 characters.";
      } else if (err?.status === 429) {
        message = "Too many attempts. Please try again in a few minutes.";
      } else if (err?.status === 503) {
        message = "Service is temporarily unavailable. Please try again.";
      } else if (err?.message) {
        message = err.message;
      }
      setPasswordMsg({ type: "err", text: message });
    } finally {
      setSavingPassword(false);
    }
  }

  //  - Logout all devices  -
  async function handleLogoutAll() {
    if (loggingOutAll) return;
    const ok = window.confirm(
      "Sign out of all other devices?\n\nYou'll stay signed in on this device. All other browsers and phones will need to sign in again."
    );
    if (!ok) return;

    setLogoutAllMsg(null);
    setLoggingOutAll(true);
    try {
      await logoutAll();
      setLogoutAllMsg({
        type: "ok",
        text: "Signed out of all other devices. This device stays signed in.",
      });
      // Refresh login history (current row still shows previous entries)
      http
        .get<{ attempts: LoginAttemptRow[] }>("/api/auth/login-history")
        .then((res) => setLoginHistory(res.attempts || []))
        .catch(() => {});
    } catch (err: any) {
      setLogoutAllMsg({
        type: "err",
        text: err?.message || "Could not sign out other devices.",
      });
    } finally {
      setLoggingOutAll(false);
    }
  }

  //  - Toggle a single preference  -
  function togglePref(key: keyof UpdatePreferenceInput) {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: !prefs[key] });
    setPrefsMsg(null);
  }

  //  - Save preferences  -
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
      setPrefsMsg({
        type: "err",
        text: err?.message || "Failed to save preferences",
      });
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

  const passwordsMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Your account credentials, security, and role-specific shortcuts."
      />

      {/*      ==
          1. ACCOUNT
           == */}
      <Panel className="mt-8">
        <SectionTitle
          title="Account"
          description="Your name, email, and contact details."
          action={<User className="size-4 text-muted-foreground" />}
        />
        <form onSubmit={handleSaveAccount} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={savingAccount}
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={savingAccount}
                autoComplete="email"
              />
            </div>
          </div>

          <CountryPhoneFields
            value={geo}
            onChange={setGeo}
            disabled={savingAccount}
            showStateCity={false}
            showPhone={true}
            phoneLabel="Phone (optional)"
            countryLabel="Country (optional)"
          />

          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center rounded-full bg-accent/15 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-accent"
                >
                  {r.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>

          {accountMsg && (
            <div
              className={
                accountMsg.type === "ok"
                  ? "flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-500"
                  : "flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              }
            >
              {accountMsg.type === "ok" ? (
                <CheckCircle2 className="size-3.5 shrink-0" />
              ) : (
                <AlertCircle className="size-3.5 shrink-0" />
              )}
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

      {/*      ==
          2. SECURITY — Password Change + Session Mgmt
           == */}
      <Panel className="mt-6">
        <SectionTitle
          title="Security"
          description="Change your password and manage active sessions."
          action={<Lock className="size-4 text-muted-foreground" />}
        />
        <form onSubmit={handleChangePassword} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <PasswordInput
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={savingPassword}
              autoComplete="current-password"
              placeholder="Enter your current password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <PasswordInput
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={savingPassword}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              minLength={6}
            />
            <PasswordStrength password={newPassword} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={savingPassword}
              autoComplete="new-password"
              placeholder="Repeat new password"
              minLength={6}
            />
            {passwordsMismatch && (
              <p className="text-xs text-destructive">Passwords do not match.</p>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
            <span>
              You will remain signed in on this device. Other devices will need
              to sign in again with the new password.
            </span>
          </div>

          {passwordMsg && (
            <div
              className={
                passwordMsg.type === "ok"
                  ? "flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-500"
                  : "flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              }
            >
              {passwordMsg.type === "ok" ? (
                <CheckCircle2 className="size-3.5 shrink-0" />
              ) : (
                <AlertCircle className="size-3.5 shrink-0" />
              )}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={
                savingPassword ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword ||
                passwordsMismatch
              }
            >
              <KeyRound className="mr-1.5 size-3.5" />
              {savingPassword ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>

        {/*  - Session management  - */}
        <div className="mt-6 space-y-3">
          <div className="rounded-lg border border-border bg-muted/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <LogOut className="mt-0.5 size-4 text-destructive" />
                <div>
                  <p className="text-sm font-medium">Sign out of all devices</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Revokes every other session (phones, laptops, tablets) but
                    keeps you signed in here. Use this if you think your
                    password was compromised.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLogoutAll}
                disabled={loggingOutAll}
                className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {loggingOutAll ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Signing out…
                  </>
                ) : (
                  "Sign out all"
                )}
              </Button>
            </div>
            {logoutAllMsg && (
              <div
                className={
                  logoutAllMsg.type === "ok"
                    ? "mt-3 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-500"
                    : "mt-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                }
              >
                {logoutAllMsg.type === "ok" ? (
                  <CheckCircle2 className="size-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="size-3.5 shrink-0" />
                )}
                <span>{logoutAllMsg.text}</span>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-dashed border-border bg-muted/5 p-4 opacity-60">
            <p className="text-xs font-medium">Two-factor authentication</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Coming soon — extra security for logins.
            </p>
          </div>
        </div>
      </Panel>

      {/*      ==
          3. LOGIN HISTORY (D2)
           == */}
      <Panel className="mt-6">
        <SectionTitle
          title="Login history"
          description="Your last 10 sign-in attempts. Contact support if you see anything you don't recognize."
          action={<Clock className="size-4 text-muted-foreground" />}
        />

        {historyLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading history…
          </div>
        ) : historyError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {historyError}
          </div>
        ) : loginHistory.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            No login attempts yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-3 py-2 font-medium text-muted-foreground">
                    When
                  </th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">
                    Device
                  </th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">
                    IP
                  </th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-2 text-muted-foreground">
                      <span title={new Date(row.createdAt).toLocaleString()}>
                        {formatRelative(row.createdAt)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <Monitor className="size-3 text-muted-foreground" />
                        {parseUserAgent(row.userAgent)}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                      {row.ip || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.success ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3" />
                          {reasonLabel(row.reason, true)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                          <AlertCircle className="size-3" />
                          {reasonLabel(row.reason, false)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/*      ==
          4. NOTIFICATIONS
           == */}
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
          <p className="py-4 text-sm text-muted-foreground">
            Could not load preferences. Refresh the page.
          </p>
        ) : (
          <div className="space-y-5">
            <ToggleRow
              label="Trial & subscription reminders"
              description="Trial ending soon, trial expired, plan changes."
              checked={prefs.emailTrial}
              onToggle={() => togglePref("emailTrial")}
              disabled={prefsSaving}
            />
            <ToggleRow
              label="Offers"
              description="New offers received, offers accepted or declined."
              checked={prefs.emailOffers}
              onToggle={() => togglePref("emailOffers")}
              disabled={prefsSaving}
            />
            <ToggleRow
              label="Campaign updates"
              description="Content submitted, approved, or rejected."
              checked={prefs.emailCampaigns}
              onToggle={() => togglePref("emailCampaigns")}
              disabled={prefsSaving}
            />
            <ToggleRow
              label="Wallet & withdrawals"
              description="Withdrawal requests, approvals, and rejections."
              checked={prefs.emailWallet}
              onToggle={() => togglePref("emailWallet")}
              disabled={prefsSaving}
            />
            <ToggleRow
              label="Payment receipts"
              description="Subscription receipts and invoices."
              checked={prefs.emailPayments}
              onToggle={() => togglePref("emailPayments")}
              disabled={prefsSaving}
            />
            <ToggleRow
              label="System announcements"
              description="Important platform updates and maintenance notices."
              checked={prefs.emailSystem}
              onToggle={() => togglePref("emailSystem")}
              disabled={prefsSaving}
            />

            {prefsMsg && (
              <div
                className={
                  prefsMsg.type === "ok"
                    ? "flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-500"
                    : "flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                }
              >
                {prefsMsg.type === "ok" ? (
                  <CheckCircle2 className="size-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="size-3.5 shrink-0" />
                )}
                <span>{prefsMsg.text}</span>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleSavePrefs} disabled={prefsSaving}>
                <Save className="mr-1.5 size-3.5" />
                {prefsSaving ? "Saving…" : "Save preferences"}
              </Button>
            </div>
          </div>
        )}
      </Panel>

      {/*      ==
          5. ROLE SHORTCUTS
           == */}
      {influencerMode && (
        <Panel className="mt-6">
          <SectionTitle
            title="Creator profile"
            description="Your public creator identity — edited on the profile page."
            action={<Pencil className="size-4 text-muted-foreground" />}
          />
          {profile ? (
            <>
              <div className="flex items-center gap-4">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.displayName}
                    className="size-14 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="grid size-14 place-items-center rounded-full bg-muted text-lg font-medium text-muted-foreground">
                    {profile.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-medium">
                    {profile.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{profile.username}
                    {profile.categories.length > 0
                      ? ` · ${profile.categories.join(", ")}`
                      : ""}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link
                    to="/influencers/$slug"
                    params={{ slug: profile.slug }}
                  >
                    <Pencil className="mr-1.5 size-3.5" /> Edit profile
                  </Link>
                </Button>
              </div>
              {!profile.profileCompleted && (
                <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
                  <p className="font-medium text-amber-500">
                    Profile incomplete
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Add your bio, categories, and social accounts so brands can
                    find you.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/10 p-6 text-center">
              <User className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Profile loading failed. Refresh the page.
              </p>
            </div>
          )}
        </Panel>
      )}

      {brandMode && (
        <Panel className="mt-6">
          <SectionTitle
            title="Brand & team"
            description="Managed on dedicated pages."
          />
          <div className="space-y-3">
            <Link
              to="/brands"
              className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <Building2 className="size-4 text-accent" />
                <div>
                  <p className="text-sm font-medium">Brand profile</p>
                  <p className="text-xs text-muted-foreground">
                    Name, logo, voice, style, target audience
                  </p>
                </div>
              </div>
              <ExternalLink className="size-4 text-muted-foreground" />
            </Link>
            <Link
              to="/team"
              className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <User className="size-4 text-accent" />
                <div>
                  <p className="text-sm font-medium">Team</p>
                  <p className="text-xs text-muted-foreground">
                    Members, roles, and invitations
                  </p>
                </div>
              </div>
              <ExternalLink className="size-4 text-muted-foreground" />
            </Link>
          </div>
        </Panel>
      )}

      {adminMode && (
        <Panel className="mt-6">
          <SectionTitle
            title="Platform administration"
            description="System-wide controls."
            action={<ShieldCheck className="size-4 text-muted-foreground" />}
          />
          <div className="space-y-3">
            <Link
              to="/admin"
              className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-4 text-accent" />
                <div>
                  <p className="text-sm font-medium">Platform health</p>
                  <p className="text-xs text-muted-foreground">
                    Service status, latency, AI usage
                  </p>
                </div>
              </div>
              <ExternalLink className="size-4 text-muted-foreground" />
            </Link>
            <Link
              to="/admin/users"
              className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <User className="size-4 text-accent" />
                <div>
                  <p className="text-sm font-medium">Users & access</p>
                  <p className="text-xs text-muted-foreground">
                    Manage users, roles, and permissions
                  </p>
                </div>
              </div>
              <ExternalLink className="size-4 text-muted-foreground" />
            </Link>
          </div>
        </Panel>
      )}

      {/*      ==
          6. DATA & TRUST
           == */}
      <Panel className="mt-6">
        <SectionTitle
          title="Data & trust"
          description="How StyleAI handles your data."
        />
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium">Organisation isolation</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Data never crosses brands or organisations.
            </p>
          </div>
          <div>
            <p className="font-medium">AI processing</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Product images and brand documents are processed to build your
              private profile.
            </p>
          </div>
          <div>
            <p className="font-medium">Human review</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Generated content and imagery require approval before publishing.
            </p>
          </div>
          <div>
            <p className="font-medium">Predictions</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Forecasts are estimates and are never presented as guarantees.
            </p>
          </div>
        </div>
      </Panel>
    </>
  );
}

//      ==
// Toggle row helper
//      ==
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
      <Switch
        checked={checked}
        onCheckedChange={onToggle}
        disabled={disabled}
      />
    </div>
  );
}