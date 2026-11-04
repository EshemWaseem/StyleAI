// routes/login.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useRole, getDashboardPath } from "@/lib/role";
import { http, type ApiError } from "@/lib/api";
import { swalThemed, swalError } from "@/lib/swal";
import { LoginBanners, type LoginBannerState } from "@/components/auth/login-banners";

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

const formatStatValue = (value: number, threshold: number, defaultDisplay: string) => {
  if (!value || value < threshold) return defaultDisplay;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M+`;
  return `${Math.floor(value / 1000)}K+`;
};

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

  const [emailNotVerified, setEmailNotVerified] = useState<{ maskedEmail: string; } | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState("");

  const [stats, setStats] = useState({ brands: 0, creators: 0, paidOut: 0 });

  const isLocked = lockedUntil !== null && countdown > 0;

  const panelRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";

    fetch(`${apiUrl}/api/storefront/stats`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch stats");
        return res.json();
      })
      .then((data) => {
        setStats({
          brands: data.brands || 0,
          creators: data.creators || 0,
          paidOut: data.paidOut || 0,
        });
      })
      .catch((err) => console.warn("Could not load stats:", err));
  }, []);

  const displayBrands = formatStatValue(stats.brands, 5000, "10K+");
  const displayCreators = formatStatValue(stats.creators, 2000, "2K+");
  const displayPaidOut = formatStatValue(stats.paidOut, 10000, "10K+");

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

  useEffect(() => {
    const panel = panelRef.current;
    const scene = sceneRef.current;
    if (!panel || !scene) return;

    const handleMouseMove = (e: MouseEvent) => {
      const r = panel.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      scene.style.transform = `rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg)`;
    };

    const handleMouseLeave = () => {
      scene.style.transform = 'rotateX(0deg) rotateY(0deg)';
    };

    panel.addEventListener('mousemove', handleMouseMove);
    panel.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      panel.removeEventListener('mousemove', handleMouseMove);
      panel.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || isLocked) return;

    setError("");
    setPendingNotice("");
    setEmailNotVerified(null);
    setResendSent(false);
    setResendError("");
    setAttemptsRemaining(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (errRaw) {
      const err = errRaw as ApiError;
      const code = err?.code;
      const status = err?.status;

      if (code === "PENDING_ADMIN_APPROVAL") {
        setLoading(false);
        await swalThemed({
          icon: "info",
          title: "Account under review",
          html: `
            <p style="color:var(--color-foreground);">
              Your account is <strong>under admin review</strong>.
            </p>
            <p style="font-size:0.875rem;">You'll be able to sign in once approved.</p>
            <p style="font-size:0.8125rem;">Your patience is highly appreciated.</p>
          `,
          confirmButtonText: "OK",
        });
        return;
      }

      if (code === "ADMIN_APPROVAL_REJECTED") {
        const reason = (err as any)?.reason || (err as any)?.data?.reason || err?.message || "Please contact support@styleai.com for more information.";
        setLoading(false);
        await swalError("Account not approved", reason);
        return;
      }

      if (code === "PENDING_APPROVAL") {
        setPendingNotice(err.message || "Your account is still waiting for the brand owner's approval.");
        setLoading(false);
        return;
      }

      if (code === "EMAIL_NOT_VERIFIED") {
        setEmailNotVerified({
          maskedEmail: err?.data?.email || (email.includes("@") ? `${email.slice(0, 2)}***@${email.split("@")[1]}` : email),
        });
        setLoading(false);
        return;
      }

      if (status === 423 || code === "ACCOUNT_LOCKED") {
        const retryAfter = Number(err?.retryAfter ?? err?.data?.retryAfter ?? 900);
        setLockedUntil(Date.now() + retryAfter * 1000);
        setLockMessage(err.message || "Your account is temporarily locked.");
        setLoading(false);
        return;
      }

      if (status === 429) {
        const retryAfter = Number(err?.retryAfter ?? 900);
        if (code === "LOGIN_EMAIL_RATE_LIMIT") {
          setLockedUntil(Date.now() + retryAfter * 1000);
          setLockMessage("Too many failed attempts for this account. Please wait before trying again.");
        } else if (code === "LOGIN_IP_RATE_LIMIT") {
          setLockedUntil(Date.now() + retryAfter * 1000);
          setLockMessage("Too many login attempts from your network. Please try again later.");
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

      setError(err?.message || "Could not sign in. Please try again.");
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!email || resending) return;
    setResending(true);
    setResendSent(false);
    setResendError("");

    try {
      await http.post(
        "/api/auth/verify-email/resend",
        { email: email.trim().toLowerCase() },
        { skipAuth: true }
      );
      setResendSent(true);
    } catch (errRaw: any) {
      // 🔎 Debug — Browser Console mein real error dekhein
      console.error("[resend-verification] error:", errRaw);
      console.error("  status:", errRaw?.status);
      console.error("  code:", errRaw?.code);
      console.error("  message:", errRaw?.message);
      console.error("  data:", errRaw?.data);

      const status = errRaw?.status;
      const code = errRaw?.code;
      const retryAfter = errRaw?.retryAfter ?? errRaw?.data?.retryAfter;
      const serverMsg = errRaw?.message;

      if (status === 429 || code === "VERIFY_EMAIL_RATE_LIMIT") {
        const secs = Number(retryAfter);
        setResendError(
          Number.isFinite(secs) && secs > 0
            ? `Too many requests. Please wait ${secs} seconds and try again.`
            : "Too many resend requests. Please wait a few minutes and try again."
        );
      } else if (status === 400) {
        setResendError("Invalid email address. Please check and try again.");
      } else if (status === 0 || code === "NETWORK_ERROR") {
        setResendError("Can't reach the server. Check your internet and try again.");
      } else if (status === 500 || status === 502 || status === 503) {
        setResendError("Server error. Please try again in a moment.");
      } else {
        setResendError(
          serverMsg ||
            "Could not resend verification email. Please try again."
        );
      }
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
    error: error || resendError,
    attemptsRemaining,
    captchaRequired,
  };

  if (authLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Redirecting to workspace…
        </div>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <div className="v-panel" ref={panelRef}>
        <div className="bg-glow"></div>
        <div className="bg-grid"></div>
        <div className="top-line"></div>
        <div className="bot-line"></div>

        <div className="panel-inner">
          <div className="status-pill">
            <div className="dot-wrap">
              <div className="dot-ring"></div>
              <div className="dot-core"></div>
            </div>
            <span className="status-text">AI-Powered Fashion Platform</span>
          </div>

          <div className="scene-wrap">
            <div className="scene" ref={sceneRef}>
              <div className="hero-card">
                <img src="/images.jpg" alt="StyleAI editorial" />
                <div className="fade"></div>
                <div className="caption">
                  <div className="caption-title">Editorial Collection</div>
                  <div className="caption-sub">AI-curated · Autumn 2024</div>
                </div>
              </div>

              <div className="f-product glass">
                {/* 👇 Handbag Image */}
                <img src="/hand_bag.jpg" alt="" />
                <div className="info">
                  <div className="info-name">Luxe Handbag</div>
                  <div className="info-price">$289</div>
                </div>
              </div>

              <div className="f-creator glass">
                {/* 👇 Creator Image */}
                <img src="/influencer.jpg" alt="" />
                <div>
                  <div className="cr-name">Ayesha K.</div>
                  <div className="cr-sub">128K followers</div>
                </div>
                <div className="cr-badge">Active</div>
              </div>

              <div className="f-match glass">
                <div className="m-label">AI Match</div>
                <div className="m-pct">94%</div>
                <div className="m-tag">↑ Perfect fit</div>
              </div>

              <div className="f-earn glass">
                <div className="e-label">Campaign</div>
                <div className="e-val">+$1,240</div>
                <div className="e-sub">This week</div>
              </div>
            </div>
          </div>

          <p className="tagline">Where fashion brands meet their perfect creators — powered by AI.</p>

          <div className="stats">
            <div className="stat">
              <div className="stat-val">{displayBrands}</div>
              <div className="stat-lbl">Active brands</div>
            </div>
            <div className="stat">
              <div className="stat-val">{displayCreators}</div>
              <div className="stat-lbl">Creators</div>
            </div>
            <div className="stat">
              <div className="stat-val">{displayPaidOut}</div>
              <div className="stat-lbl">Paid out</div>
            </div>
          </div>
        </div>
      </div>

      <div className="f-panel">
        <div className="form-wrap">
          <Link to="/" className="logo">
            <img src="/favicon.png" alt="StyleAI" className="logo-img" />
            <span className="logo-text">StyleAI</span>
          </Link>

          <h1 className="auth-h1">Welcome back</h1>
          <p className="auth-sub">Sign in to access your workspace.</p>

          <LoginBanners state={bannerState} onResendVerification={handleResendVerification} />

          <form onSubmit={handleSubmit}>
            <div className="field mt-4">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || isLocked}
                required
              />
            </div>

            <div className="field">
              <div className="pw-row">
                <label>Password</label>
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || isLocked}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading || isLocked}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="auth-footer">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}