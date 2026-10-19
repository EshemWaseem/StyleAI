// routes/verify-email.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Mail,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { http } from "@/lib/api";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Verify email — StyleAI" },
      {
        name: "description",
        content: "Verify your StyleAI email address.",
      },
    ],
  }),
  component: VerifyEmailPage,
});

type State =
  | { kind: "verifying" }
  | { kind: "success" }
  | { kind: "error"; message: string }
  | { kind: "resend-form" }
  | { kind: "resend-sent" };

function VerifyEmailPage() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();

  const [state, setState] = useState<State>(
    token ? { kind: "verifying" } : { kind: "resend-form" }
  );
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [resendError, setResendError] = useState("");

  // Auto-verify on mount if token present
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        await http.post(
          "/api/auth/verify-email",
          { token },
          { skipAuth: true }
        );
        if (!cancelled) setState({ kind: "success" });
      } catch (err: any) {
        if (cancelled) return;
        const code = err?.code;
        if (code === "INVALID_VERIFY_TOKEN") {
          setState({
            kind: "error",
            message:
              "This verification link is invalid or has expired. Request a new one below.",
          });
        } else if (code === "ALREADY_VERIFIED") {
          setState({ kind: "success" });
        } else {
          setState({
            kind: "error",
            message:
              err?.message ||
              "Could not verify email. Please try again in a moment.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setResendError("");
    if (!email.trim()) {
      setResendError("Email is required.");
      return;
    }
    setSending(true);
    try {
      await http.post(
        "/api/auth/verify-email/resend",
        { email: email.trim() },
        { skipAuth: true }
      );
      setState({ kind: "resend-sent" });
    } catch (err: any) {
      if (err?.status === 429) {
        setResendError(
          "Too many verification requests. Please try again later."
        );
      } else {
        setResendError(
          err?.message || "Could not send verification email. Please try again."
        );
      }
    } finally {
      setSending(false);
    }
  }

  // ---- Verifying ----
  if (state.kind === "verifying") {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 py-16 text-foreground">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-accent/15 text-accent">
            <Loader2 className="size-7 animate-spin" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-medium tracking-tight">
            Verifying your email…
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Just a moment while we confirm your account.
          </p>
        </div>
      </div>
    );
  }

  // ---- Success ----
  if (state.kind === "success") {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 py-16 text-foreground">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
            <CheckCircle2 className="size-7" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-medium tracking-tight">
            Email verified
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Your email has been verified. You can now sign in to your account.
          </p>
          <div className="mt-8 flex flex-col gap-2">
            <Button
              className="w-full"
              onClick={() => navigate({ to: "/login" })}
            >
              Sign in
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/">Go to storefront</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Resend sent ----
  if (state.kind === "resend-sent") {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 py-16 text-foreground">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
            <CheckCircle2 className="size-7" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-medium tracking-tight">
            Verification email sent
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            If this email is registered and unverified, we've sent a new
            verification link. Check your inbox.
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

  // ---- Error OR resend-form ----
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
          {state.kind === "error" ? (
            <ShieldAlert className="size-5 text-destructive" aria-hidden="true" />
          ) : (
            <Mail className="size-5 text-accent" aria-hidden="true" />
          )}
          <h1 className="font-display text-3xl font-medium tracking-tight">
            {state.kind === "error" ? "Verify your email" : "Check your email"}
          </h1>
        </div>

        {state.kind === "error" && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {state.message}
          </div>
        )}

        <p className="mt-3 text-sm text-muted-foreground">
          Enter the email you signed up with, and we'll send a fresh
          verification link.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleResend} noValidate>
          {resendError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {resendError}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={sending}
            />
          </div>

          <Button type="submit" className="w-full" disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" /> Sending…
              </>
            ) : (
              "Resend verification email"
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