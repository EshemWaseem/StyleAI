// routes/login.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRole, getDashboardPath } from "@/lib/role";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — StyleAI" },
      { name: "description", content: "Sign in to your StyleAI account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, user, loading: authLoading } = useRole();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pendingNotice, setPendingNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Already logged in? Redirect to their panel.
  useEffect(() => {
    if (redirecting) return;
    if (!authLoading && user) {
      setRedirecting(true);
      navigate({ to: getDashboardPath(user.roles), replace: true });
    }
  }, [user, authLoading, navigate, redirecting]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || redirecting) return;
    setError("");
    setPendingNotice("");
    setLoading(true);

    try {
      const loggedIn = await login(email, password);
      setRedirecting(true);
      navigate({ to: getDashboardPath(loggedIn.roles), replace: true });
    } catch (err: any) {
      // ✅ Pending brand-owner approval — show a distinct notice
      if (err?.code === "PENDING_APPROVAL") {
        setPendingNotice(
          err.message ||
            "Your account is still waiting for the brand owner's approval."
        );
      } else if (err?.status === 401 || err?.code === "INVALID_CREDENTIALS") {
        setError("Invalid email or password.");
      } else if (
        err?.status === 503 ||
        err?.code === "SERVICE_UNAVAILABLE" ||
        err?.code === "NETWORK_ERROR"
      ) {
        setError(
          "Service is temporarily unavailable. Please try again in a moment."
        );
      } else {
        setError(err?.message || "Could not sign in. Please try again.");
      }
      setLoading(false);
    }
  }

  // Full-screen loader while redirecting
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
          {/* ✅ Pending approval — amber notice */}
          {pendingNotice && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
            >
              <span className="mt-0.5 inline-block size-1.5 shrink-0 rounded-full bg-amber-500" />
              <span>{pendingNotice}</span>
            </div>
          )}

          {/* ✅ Standard error — red notice */}
          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {error}
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
              disabled={loading}
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
              disabled={loading}
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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
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