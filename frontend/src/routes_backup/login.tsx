import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(false);

  // Already logged in? Redirect to their panel
  useEffect(() => {
    if (!authLoading && user) {
      navigate({ to: getDashboardPath(user.roles) });
    }
  }, [user, authLoading, navigate]);

 async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError("");
  setLoading(true);
  try {
    const loggedIn = await login(email, password);

    const target = getDashboardPath(loggedIn.roles);
    navigate({ to: target });
  } catch (err: any) {
    setError(err?.message || "Invalid email or password.");
    setLoading(false);
  }
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>            
            </div>
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
             <Link
                to="/login"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Forgot password?
              </Link>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
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