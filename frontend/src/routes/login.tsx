// routes/login.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useRole, getDashboardPath } from "@/lib/role";
import { http, type ApiError } from "@/lib/api";
import {
  LoginBanners,
  type LoginBannerState,
} from "@/components/auth/login-banners";
import { LoginForm } from "@/components/auth/login-form";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — StyleAI" },
      { name: "description", content: "Sign in to your StyleAI account." },
      { name: "robots", content: "noindex" },
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

  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [lockMessage, setLockMessage] = useState<string>("");
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [captchaRequired, setCaptchaRequired] = useState(false);

  const [emailNotVerified, setEmailNotVerified] = useState<{
    maskedEmail: string;
  } | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const isLocked = lockedUntil !== null && countdown > 0;

  // Redirect if already logged in — silent, no loader (avoids flash)
  useEffect(() => {
    if (!authLoading && user) {
      navigate({ to: getDashboardPath(user.roles), replace: true });
    }
  }, [user, authLoading, navigate]);

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
    if (loading || isLocked) return;

    setError("");
    setPendingNotice("");
    setEmailNotVerified(null);
    setResendSent(false);
    setAttemptsRemaining(null);
    setLoading(true);

    try {
      const loggedIn = await login(email, password);
      navigate({ to: getDashboardPath(loggedIn.roles), replace: true });
    } catch (errRaw) {
      const err = errRaw as ApiError;
      const code = err?.code;
      const status = err?.status;

      if (code === "PENDING_APPROVAL") {
        setPendingNotice(
          err.message ||
            "Your account is still waiting for the brand owner's approval."
        );
        setLoading(false);
        return;
      }

      if (code === "EMAIL_NOT_VERIFIED") {
        setEmailNotVerified({
          maskedEmail:
            err?.data?.email ||
            (email.includes("@")
              ? `${email.slice(0, 2)}***@${email.split("@")[1]}`
              : email),
        });
        setLoading(false);
        return;
      }

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
          setLockMessage("Too many requests. Please slow down and try again.");
        } else {
          setError("Too many requests. Please try again in a moment.");
        }
        setLoading(false);
        return;
      }

      if (status === 401 || code === "INVALID_CREDENTIALS") {
        const remaining = err?.data?.attemptsRemaining;
        if (typeof remaining === "number") setAttemptsRemaining(remaining);
        if (err?.data?.captchaRequired) setCaptchaRequired(true);
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }

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

      setError(err?.message || "Could not sign in. Please try again.");
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!email || resending) return;
    setResending(true);
    setResendSent(false);
    try {
      await http.post(
        "/api/auth/verify-email/resend",
        { email },
        { skipAuth: true }
      );
      setResendSent(true);
    } catch {
      setError(
        "Could not resend verification email. Please try again in a moment."
      );
    } finally {
      setResending(false);
    }
  }

  const bannerState: LoginBannerState = {
    pendingNotice,
    emailNotVerified,
    resendSent,
    resending,
    isLocked,
    lockMessage,
    countdown,
    error,
    attemptsRemaining,
    captchaRequired,
  };

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

        <div className="mt-8 space-y-4">
          <LoginBanners
            state={bannerState}
            onResendVerification={handleResendVerification}
          />
          <LoginForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            loading={loading}
            isLocked={isLocked}
            countdown={countdown}
            onSubmit={handleSubmit}
          />
        </div>

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