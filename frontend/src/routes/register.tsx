// routes/register.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useRole, getDashboardPath, type RoleName } from "@/lib/role";
import type { ApiError } from "@/lib/api";
import { swalInfo, swalPendingReview, swalThemed } from "@/lib/swal";
import { RegisterBanners, type RegisterBannerState } from "@/components/auth/register-banners";
import { ROLES_REQUIRING_ORG } from "@/lib/role";

type RegisterSearch = { role?: RoleName };

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>): RegisterSearch => ({
    role: (search.role as RoleName) || undefined,
  }),
  head: () => ({
    meta: [
      { title: "Create account — StyleAI" },
      { name: "description", content: "Join StyleAI as a brand, influencer, agency, or shopper." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RegisterPage,
});

const ROLE_OPTIONS: { value: RoleName; label: string; description: string }[] = [
  { value: "SHOPPER", label: "Just shopping", description: "Browse and buy — no brand setup needed." },
  { value: "BRAND_OWNER", label: "Brand owner", description: "Manage your catalog and run creator campaigns." },
  { value: "INFLUENCER", label: "Creator / influencer", description: "Get discovered by brands and earn from collabs." },
  { value: "AGENCY", label: "Agency", description: "Manage multiple client brands and run ads." },
];

const formatStatValue = (value: number, threshold: number, defaultDisplay: string) => {
  if (!value || value < threshold) return defaultDisplay;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M+`;
  return `${Math.floor(value / 1000)}K+`;
};

function RegisterPage() {
  const { register, user, loading: authLoading } = useRole();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [values, setValues] = useState({
    name: "",
    email: "",
    password: "",
    organizationName: "",
    country: "",
    phone: "",
    role: search.role ?? "SHOPPER",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingApprovalMessage, setPendingApprovalMessage] = useState("");

  const [stats, setStats] = useState({ brands: 0, creators: 0, paidOut: 0 });

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

  function handleChange(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError("");
    setSuccess("");
    setPendingApprovalMessage("");

    if (!values.name.trim()) return setError("Name is required");
    if (!values.email.trim()) return setError("Email is required");
    if (!values.password || values.password.length < 8) return setError("Password must be at least 8 characters");

    const requiresOrg = ROLES_REQUIRING_ORG.includes(values.role as RoleName);
    if (requiresOrg && !values.organizationName.trim()) {
      return setError("Organization name is required for this role");
    }

    setLoading(true);

    try {
      const createdUser = await register({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        role: values.role as RoleName,
        organizationName: requiresOrg ? values.organizationName.trim() : undefined,
        country: values.country.trim() || undefined,
        phone: values.phone.trim() || undefined,
      });

      if (createdUser.adminApprovalStatus === "PENDING") {
        await swalPendingReview("Please check your email to verify your address, then wait for admin approval before signing in.");
        navigate({ to: "/login", replace: true });
        return;
      }

      if (createdUser.pendingApproval) {
        await swalPendingReview("Please check your email to verify your address. The brand owner will be notified.");
        navigate({ to: "/login", replace: true });
        return;
      }

      await swalThemed({
        icon: "success",
        title: "Account created!",
        html: `
          <p>Please check your email to verify your address before signing in.</p>
          <p style="font-size:0.8125rem;">Didn't get the email? You can resend it from the login page.</p>
        `,
        confirmButtonText: "OK",
      });
      navigate({ to: "/login", replace: true });
    } catch (errRaw) {
      const err = errRaw as ApiError;
      const code = err?.code;

      if (code === "EMAIL_EXISTS" || code === "USER_EXISTS") {
        setError("An account with this email already exists.");
      } else if (code === "PENDING_APPROVAL" || code === "PENDING_ADMIN_APPROVAL") {
        await swalInfo("Account under review", err.message || "Your account is under review. Your patience is highly appreciated.");
      } else if (code === "EMAIL_NOT_VERIFIED") {
        setSuccess("Account created! Check your email to verify your address before signing in.");
      } else {
        setError(err?.message || "Could not create account. Please try again.");
      }
      setLoading(false);
    }
  }

  const bannerState: RegisterBannerState = { error, success, pendingApprovalMessage };
  const showOrganizationField = ROLES_REQUIRING_ORG.includes(values.role as RoleName);

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
                <img src="/clothing.jpg" alt="Fashion" />
                <div className="fade"></div>
                <div className="caption">
                  <div className="caption-title">Join the Platform</div>
                  <div className="caption-sub">Brands · Creators · Agencies</div>
                </div>
              </div>

              <div className="f-product glass">
                {/* 👇 Handbag Image */}
                <img src="/hand_bag.jpg" alt="" />
                <div className="info">
                  <div className="info-name">Luxe Bag</div>
                  <div className="info-price">$420</div>
                </div>
              </div>

              <div className="f-creator glass">
                {/* 👇 Creator Image */}
                <img src="/influencer.jpg" alt="" />
                <div>
                  <div className="cr-name">Sofia M.</div>
                  <div className="cr-sub">340K followers</div>
                </div>
                <div className="cr-badge">Top creator</div>
              </div>

              <div className="f-match glass">
                <div className="m-label">Avg. Match</div>
                <div className="m-pct">91%</div>
                <div className="m-tag">↑ AI-driven</div>
              </div>

              <div className="f-earn glass">
                <div className="e-label">Avg. Earn</div>
                <div className="e-val">$3.4K</div>
                <div className="e-sub">Per campaign</div>
              </div>
            </div>
          </div>

          <p className="tagline">Join thousands of brands, creators and agencies on the world's leading AI-styled commerce platform.</p>

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
        <div className="form-wrap form-wrap-lg">
          <Link to="/" className="logo">
            <img src="/favicon.png" alt="StyleAI" className="logo-img" />
            <span className="logo-text">StyleAI</span>
          </Link>

          <h1 className="auth-h1">Create your account</h1>
          <p className="auth-sub">Join the AI-styled fashion commerce platform.</p>

          <RegisterBanners state={bannerState} />

          <form onSubmit={handleSubmit}>
            <div className="field mt-4">
              <label>Full name</label>
              <input 
                type="text" 
                placeholder="Ayesha Khan" 
                value={values.name}
                onChange={(e) => handleChange("name", e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="field">
              <label>Email</label>
              <input 
                type="email" 
                placeholder="you@company.com" 
                value={values.email}
                onChange={(e) => handleChange("email", e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="field">
              <label>Password</label>
              <input 
                type="password" 
                placeholder="At least 8 characters" 
                value={values.password}
                onChange={(e) => handleChange("password", e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="roles">
              <label>I am joining as</label>
              {ROLE_OPTIONS.map((role) => (
                <div 
                  key={role.value}
                  className={`role-opt ${values.role === role.value ? "selected" : ""}`}
                  onClick={() => !loading && handleChange("role", role.value)}
                >
                  <div className="ro-name">{role.label}</div>
                  <div className="ro-desc">{role.description}</div>
                </div>
              ))}
            </div>

            {showOrganizationField && (
              <div className="field">
                <label>Organization name</label>
                <input 
                  type="text" 
                  placeholder="Your brand or agency name" 
                  value={values.organizationName}
                  onChange={(e) => handleChange("organizationName", e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            )}

            <div className="field-row">
              <div className="field" style={{ marginTop: 0 }}>
                <label>Country</label>
                <input 
                  type="text" 
                  placeholder="Pakistan" 
                  value={values.country}
                  onChange={(e) => handleChange("country", e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="field" style={{ marginTop: 0 }}>
                <label>Phone (optional)</label>
                <input 
                  type="tel" 
                  placeholder="+92 300 0000000" 
                  value={values.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="helper-text">
            By creating an account you agree to our <Link to="/privacy">privacy policy</Link>
          </p>

          <p className="auth-footer" style={{ textAlign: 'center', marginTop: '16px' }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}