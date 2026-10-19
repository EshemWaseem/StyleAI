// routes/forgot-password.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { http } from "@/lib/api";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — StyleAI" },
      {
        name: "description",
        content: "Reset your StyleAI account password.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setLoading(true);
    try {
      await http.post(
        "/api/auth/forgot-password",
        { email: email.trim() },
        { skipAuth: true }
      );
      setSuccess(true);
    } catch (err: any) {
      const status = err?.status;
      if (status === 429) {
        setError(
          "Too many reset requests for this email. Please try again later."
        );
      } else if (status === 503) {
        setError(
          "Service is temporarily unavailable. Please try again in a moment."
        );
      } else {
        // Server returns generic 200 for privacy, so any error is unusual
        setError(
          err?.message ||
            "Could not send reset link. Please try again in a moment."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 py-16 text-foreground">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
            <CheckCircle2 className="size-7" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-medium tracking-tight">
            Check your email
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            If an account exists for{" "}
            <strong className="text-foreground">{email}</strong>, we’ve sent a
            password reset link. The link expires in 1 hour.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Didn’t receive it? Check your spam folder or{" "}
            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                setEmail("");
              }}
              className="text-foreground underline underline-offset-4 hover:no-underline"
            >
              try again
            </button>
            .
          </p>

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
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-md bg-foreground text-background font-display text-sm">
            S
          </span>
          <span className="font-display text-[15px]">StyleAI</span>
        </Link>

        <h1 className="mt-10 font-display text-3xl font-medium tracking-tight">
          Forgot your password?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the email you used to create your account. We’ll send you a
          secure link to reset your password.
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
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="pl-9"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" /> Sending…
              </>
            ) : (
              "Send reset link"
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