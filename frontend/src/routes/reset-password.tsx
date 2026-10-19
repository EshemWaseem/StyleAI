// routes/reset-password.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Lock,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/ui/password-strength";
import { http } from "@/lib/api";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Reset password — StyleAI" },
      {
        name: "description",
        content: "Set a new password for your StyleAI account.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // If no token in URL → immediately show "invalid link" screen
  useEffect(() => {
    if (!token) {
      setError(
        "This password reset link is invalid. Please request a new one."
      );
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError(
        "This password reset link is invalid. Please request a new one."
      );
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await http.post(
        "/api/auth/reset-password",
        { token, password },
        { skipAuth: true }
      );
      setSuccess(true);
    } catch (err: any) {
      const code = err?.code;
      const status = err?.status;

      if (code === "INVALID_RESET_TOKEN") {
        setError(
          "This reset link is invalid or has expired. Please request a new one."
        );
      } else if (code === "WEAK_PASSWORD") {
        setError("Password must be at least 6 characters.");
      } else if (status === 429) {
        setError("Too many attempts. Please try again in a few minutes.");
      } else if (status === 503) {
        setError(
          "Service is temporarily unavailable. Please try again in a moment."
        );
      } else {
        setError(
          err?.message || "Could not reset password. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // Success screen
  if (success) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 py-16 text-foreground">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
            <CheckCircle2 className="size-7" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-medium tracking-tight">
            Password reset
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Your password has been updated. You can now sign in with your new
            password.
          </p>

          <div className="mt-8 flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link to="/login">Go to sign in</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/">Go to storefront</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Invalid / missing token screen
  if (!token) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 py-16 text-foreground">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-destructive/15 text-destructive">
            <ShieldAlert className="size-7" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-medium tracking-tight">
            Invalid reset link
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This password reset link is invalid or has expired. Please request
            a new one.
          </p>

          <div className="mt-8 flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link to="/forgot-password">Request new link</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/login">Back to sign in</Link>
            </Button>
          </div>
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

        <div className="mt-10 flex items-center gap-2">
          <Lock className="size-5 text-accent" aria-hidden="true" />
          <h1 className="font-display text-3xl font-medium tracking-tight">
            Set new password
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a strong password. This will replace your current one
          immediately.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate>
          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              required
              minLength={6}
              autoFocus
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <PasswordStrength password={password} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              required
              minLength={6}
              placeholder="Re-enter password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
            />
            {confirm.length > 0 && password !== confirm && (
              <p className="text-xs text-destructive">
                Passwords do not match.
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !password || !confirm}
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" /> Resetting…
              </>
            ) : (
              "Reset password"
            )}
          </Button>
        </form>

        <Link
          to="/login"
          className="mt-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}