// routes/register.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useRole, getDashboardPath, type RoleName } from "@/lib/role";
import type { ApiError } from "@/lib/api";
import { swalInfo, swalPendingReview, swalThemed } from "@/lib/swal";
import {
  RegisterBanners,
  type RegisterBannerState,
} from "@/components/auth/register-banners";
import {
  RegisterForm,
  type RegisterFormValues,
} from "@/components/auth/register-form";
import { ROLES_REQUIRING_ORG } from "@/lib/role";

type RegisterSearch = { role?: RoleName };

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>): RegisterSearch => ({
    role: (search.role as RoleName) || undefined,
  }),
  head: () => ({
    meta: [
      { title: "Create account — StyleAI" },
      {
        name: "description",
        content: "Join StyleAI as a brand, influencer, agency, or shopper.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RegisterPage,
});

const ROLE_OPTIONS: { value: RoleName; label: string; description: string }[] = [
  {
    value: "SHOPPER",
    label: "Just shopping",
    description: "Browse and buy — no brand setup needed.",
  },
  {
    value: "BRAND_OWNER",
    label: "Brand owner",
    description: "Manage your catalog and run creator campaigns.",
  },
  {
    value: "INFLUENCER",
    label: "Creator / influencer",
    description: "Get discovered by brands and earn from collabs.",
  },
  {
    value: "AGENCY",
    label: "Agency",
    description: "Manage multiple client brands and run ads.",
  },
];

function RegisterPage() {
  const { register, user, loading: authLoading } = useRole();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [values, setValues] = useState<RegisterFormValues>({
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

  useEffect(() => {
    if (!authLoading && user) {
      navigate({ to: getDashboardPath(user.roles), replace: true });
    }
  }, [user, authLoading, navigate]);

  function handleChange<K extends keyof RegisterFormValues>(
    key: K,
    value: RegisterFormValues[K]
  ) {
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
    if (!values.password || values.password.length < 8)
      return setError("Password must be at least 8 characters");

    const requiresOrg = ROLES_REQUIRING_ORG.includes(values.role);
    if (requiresOrg && !values.organizationName.trim()) {
      return setError("Organization name is required for this role");
    }

    setLoading(true);

    try {
      const createdUser = await register({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        role: values.role,
        organizationName: requiresOrg
          ? values.organizationName.trim()
          : undefined,
        country: values.country.trim() || undefined,
        phone: values.phone.trim() || undefined,
      });

      if (createdUser.adminApprovalStatus === "PENDING") {
        await swalPendingReview(
          "Please check your email to verify your address, then wait for admin approval before signing in."
        );
        navigate({ to: "/login", replace: true });
        return;
      }

      if (createdUser.pendingApproval) {
        await swalPendingReview(
          "Please check your email to verify your address. The brand owner will be notified."
        );
        navigate({ to: "/login", replace: true });
        return;
      }

      await swalThemed({
        icon: "success",
        title: "Account created!",
        html: `
          <p>Please check your email to verify your address before signing in.</p>
          <p style="font-size:0.8125rem;">
            Didn't get the email? You can resend it from the login page.
          </p>
        `,
        confirmButtonText: "OK",
      });
      navigate({ to: "/login", replace: true });
    } catch (errRaw) {
      const err = errRaw as ApiError;
      const code = err?.code;

      if (code === "EMAIL_EXISTS" || code === "USER_EXISTS") {
        setError("An account with this email already exists.");
      } else if (
        code === "PENDING_APPROVAL" ||
        code === "PENDING_ADMIN_APPROVAL"
      ) {
        await swalInfo(
          "Account under review",
          err.message ||
            "Your account is under review. Your patience is highly appreciated."
        );
      } else if (code === "EMAIL_NOT_VERIFIED") {
        setSuccess(
          "Account created! Check your email to verify your address before signing in."
        );
      } else {
        setError(err?.message || "Could not create account. Please try again.");
      }
      setLoading(false);
    }
  }

  const bannerState: RegisterBannerState = {
    error,
    success,
    pendingApprovalMessage,
  };

  const showOrganizationField = ROLES_REQUIRING_ORG.includes(values.role);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-16 text-foreground">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-md bg-foreground text-background font-display text-sm">
            S
          </span>
          <span className="font-display text-[15px]">StyleAI</span>
        </Link>

        <h1 className="mt-10 font-display text-3xl font-medium tracking-tight">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Join the AI-styled fashion commerce platform.
        </p>

        <div className="mt-8 space-y-4">
          <RegisterBanners state={bannerState} />
          <RegisterForm
            values={values}
            onChange={handleChange}
            roleOptions={ROLE_OPTIONS}
            showOrganizationField={showOrganizationField}
            loading={loading}
            onSubmit={handleSubmit}
          />
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-foreground underline underline-offset-4 hover:no-underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}