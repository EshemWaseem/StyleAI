// routes/login.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRole, getDashboardPath } from "@/lib/role";
import type { ApiError } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — StyleAI" },
      { name: "description", content: "Sign in to your StyleAI account." },
    ],
  }),
  component: LoginPage,
});

function formatCountdown(secs: number): string {
  if (secs <= 0) return "0s";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function LoginPage() {
  const { login, user, loading: authLoading } = useRole();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pendingNotice, setPendingNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Lockout / rate-limit state
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [lockMessage, setLockMessage] = useState<string>("");

  // Failed-attempts warning
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(
    null
  );

  // Captcha flag (future hook)
  const [captchaRequired, setCaptchaRequired] = useState(false);

  const isLocked = lockedUntil !== null && countdown > 0;

  // Already logged in? Redirect
  useEffect(() => {
    if (redirecting) return;
    if (!authLoading && user) {
      setRedirecting(true);
      navigate({ to: getDashboardPath(user.roles), replace: true });
    }
  }, [user, authLoading, navigate, redirecting]);

  // Countdown timer
  useEffect(() => {
    if (!lockedUntil) {
      setCountdown(0);
      return;
    }
    const tick = () => {
      const secs = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setCountdown(secs);
      if (secs <= 0) {
        setLockedUntil(null);
        setLockMessage("");
        setError("");
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || redirecting || isLocked) return;

    setError("");
    setPendingNotice("");
    setAttemptsRemaining(null);
    setLoading(true);

    try {
      const loggedIn = await login(email, password);
      setRedirecting(true);
      navigate({ to: getDashboardPath(loggedIn.roles), replace: true });
    } catch (errRaw) {
      const err = errRaw as ApiError;
      const code = err?.code;
      const status = err?.status;

      // ---------- Pending approval ----------
      if (code === "PENDING_APPROVAL") {
        setPendingNotice(
          err.message ||
            "Your account is still waiting for the brand owner's approval."
        );
        setLoading(false);
        return;
      }

      // ---------- Account locked (423) ----------
      if (status === 423 || code === "ACCOUNT_LOCKED") {
        const retryAfter = Number(
          err?.retryAfter ?? err?.data?.retryAfter ?? 900
        );
        setLockedUntil(Date.now() + retryAfter * 1000);
        setLockMessage(
          err.message ||
            "Your account is temporarily locked due to multiple failed attempts."
        );
        setLoading(false);
        return;
      }

      // ---------- Rate limited (429) ----------
      if (status === 429) {
        const retryAfter = Number(err?.retryAfter ?? 900);

        if (code === "LOGIN_EMAIL_RATE_LIMIT") {
          setLockedUntil(Date.now() + retryAfter * 1000);
          setLockMessage(
            "Too many failed attempts for this account. Please wait before trying again."
          );
        } else if (code === "LOGIN_IP_RATE_LIMIT") {
          setLockedUntil(Date.now() + retryAfter * 1000);
          setLockMessage(
            "Too many login attempts from your network. Please try again later."
          );
        } else if (code === "AUTH_RATE_LIMIT") {
          setLockedUntil(Date.now() + retryAfter * 1000);
          setLockMessage(
            "Too many requests. Please slow down and try again."
          );
        } else {
          setError("Too many requests. Please try again in a moment.");
        }
        setLoading(false);
        return;
      }

      // ---------- Invalid credentials (401) ----------
      if (status === 401 || code === "INVALID_CREDENTIALS") {
        const remaining = err?.data?.attemptsRemaining;
        if (typeof remaining === "number") setAttemptsRemaining(remaining);
        if (err?.data?.captchaRequired) setCaptchaRequired(true);
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }

      // ---------- Service unavailable ----------
      if (
        status === 503 ||
        code === "SERVICE_UNAVAILABLE" ||
        code === "NETWORK_ERROR"
      ) {
        setError(
          "Service is temporarily unavailable. Please try again in a moment."
        );
        setLoading(false);
        return;
      }

      // ---------- Fallback ----------
      setError(err?.message || "Could not sign in. Please try again.");
      setLoading(false);
    }
  }

  // Redirecting loader
  if (redirecting) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Signing you in…
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-16 text-foreground">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-md bg-foreground text-background font-display text-sm">
            S
          </span>
          <span className="font-display text-[15px]">StyleAI</span>
        </Link>

        <h1 className="mt-10 font-display text-3xl font-medium tracking-tight">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to access your workspace.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate>
          {/* Pending approval — amber */}
          {pendingNotice && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
            >
              <span className="mt-0.5 inline-block size-1.5 shrink-0 rounded-full bg-amber-500" />
              <span>{pendingNotice}</span>
            </div>
          )}

          {/* Account locked / rate limited — amber with timer */}
          {isLocked && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
            >
              <Lock className="mt-0.5 size-3.5 shrink-0" />
              <div className="flex-1">
                <div className="font-medium">
                  {lockMessage || "Account temporarily locked"}
                </div>
                <div className="mt-0.5 text-[11px] opacity-80">
                  Try again in{" "}
                  <span className="tabular-nums font-medium">
                    {formatCountdown(countdown)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Standard error — red */}
          {error && !isLocked && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {error}
            </div>
          )}

          {/* Attempts remaining warning */}
          {!isLocked && attemptsRemaining !== null && attemptsRemaining > 0 && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
            >
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Warning: {attemptsRemaining} attempt
                {attemptsRemaining === 1 ? "" : "s"} remaining before your
                account is temporarily locked.
              </span>
            </div>
          )}

          {/* CAPTCHA placeholder (future) */}
          {captchaRequired && !isLocked && (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Security check will be required on next attempt.
            </div>
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
              disabled={loading || isLocked}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || isLocked}
            />
            <div className="flex justify-end">
              <Link
                to="/login"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || isLocked}
          >
            {isLocked ? (
              <>
                <Lock className="mr-1.5 size-4" /> Locked (
                {formatCountdown(countdown)})
              </>
            ) : loading ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" /> Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <p className="mt-8 text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-foreground underline underline-offset-4 hover:no-underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}