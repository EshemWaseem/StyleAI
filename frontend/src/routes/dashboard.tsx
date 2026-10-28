// routes/dashboard.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BrowseShopCard } from "@/components/dashboard/browse-shop-card";
import { BadgeDollarSign, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useRole } from "@/lib/role";
import {
  analyticsApi,
  type BrandAnalytics,
  type InfluencerAnalytics,
} from "@/lib/analytics";
import { productsApi, type Product as RealProduct } from "@/lib/products";
import { StatStrip } from "@/components/dashboard/stat-strip";
import { pickWorkspace, roleCopy } from "@/components/dashboard/types";
import { AdminWorkspace } from "@/components/dashboard/admin-workspace";
import { AgencyWorkspace } from "@/components/dashboard/agency-workspace";
import { MemberWorkspace } from "@/components/dashboard/member-workspace";
import { InfluencerWorkspace } from "@/components/dashboard/influencer-workspace";
import { BrandWorkspace } from "@/components/dashboard/brand-workspace";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { title: "Role Workspace — StyleAI" },
      { name: "description", content: "A role-adaptive StyleAI command center." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, loading } = useRole();
  const navigate = useNavigate();

  const [realProducts, setRealProducts] = useState<RealProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [brandAnalytics, setBrandAnalytics] = useState<BrandAnalytics | null>(null);
  const [influencerAnalytics, setInfluencerAnalytics] =
    useState<InfluencerAnalytics | null>(null);

  const [redirectChecked, setRedirectChecked] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    if (redirectChecked) return;

    let target: string | null = null;

    if (user.roles.includes("SUPER_ADMIN")) {
      target = "/admin";
    } else if (user.roles.includes("AGENCY")) {
      target = "/agency";
    } else {
      const isOnlyShopper =
        user.roles.includes("SHOPPER") &&
        user.roles.every((r) => r === "SHOPPER");

      if (isOnlyShopper) {
        target = "/";
      } else if (
        user.roles.some((r) =>
          ["BRAND_OWNER", "BRAND_TEAM_MEMBER"].includes(r)
        ) &&
        !user.organizationId
      ) {
        target = "/brands";
      }
    }

    if (target) {
      navigate({ to: target as any, replace: true });
    } else {
      setRedirectChecked(true);
    }
  }, [user, loading, navigate, redirectChecked]);

  useEffect(() => {
    if (!redirectChecked || !user) return;

    const isBrandUser = user.roles.some((r) =>
      ["BRAND_OWNER", "BRAND_TEAM_MEMBER"].includes(r)
    );
    if (!isBrandUser) return;

    setProductsLoading(true);
    productsApi
      .list()
      .then((res) => setRealProducts(res.products))
      .catch(() => setRealProducts([]))
      .finally(() => setProductsLoading(false));
  }, [redirectChecked, user]);

  useEffect(() => {
    if (!redirectChecked || !user) return;

    const isBrandUser = user.roles.some((r) =>
      ["BRAND_OWNER", "BRAND_TEAM_MEMBER"].includes(r)
    );
    if (!isBrandUser) return;

    analyticsApi
      .brand()
      .then(setBrandAnalytics)
      .catch(() => setBrandAnalytics(null));
  }, [redirectChecked, user]);

  useEffect(() => {
    if (!redirectChecked || !user) return;
    if (!user.roles.includes("INFLUENCER")) return;

    analyticsApi
      .influencer()
      .then(setInfluencerAnalytics)
      .catch(() => setInfluencerAnalytics(null));
  }, [redirectChecked, user]);

  if (loading || !user || !redirectChecked) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Loading workspace…</p>
      </div>
    );
  }

  const workspace = pickWorkspace(user.roles);
  const copy = roleCopy[workspace];

  return (
    <ProtectedRoute>
      <div className="w-full max-w-full flex flex-col gap-6 pb-12">
        <PageHeader
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.description}
          actions={
            workspace === "admin" ? (
              <Button>
                <ShieldCheck />
                Run health check
              </Button>
            ) : workspace === "influencer" ? (
              <Button asChild>
                <Link to="/wallet">
                  <BadgeDollarSign />
                  View earnings
                </Link>
              </Button>
            ) : workspace === "member" ? (
              <Button>
                <Plus />
                New draft
              </Button>
            ) : (
              <Button asChild>
                <Link to="/matching">
                  <Sparkles />
                  Create with AI
                </Link>
              </Button>
            )
          }
        />

        {workspace !== "influencer" && (
          <StatStrip role={workspace} analytics={brandAnalytics} />
        )}

        {workspace === "influencer" && (
          <StatStrip role="influencer" influencerAnalytics={influencerAnalytics} />
        )}

        {workspace === "admin" && <AdminWorkspace />}
        {workspace === "influencer" && (
          <>
            <InfluencerWorkspace />
            <BrowseShopCard />
          </>
        )}
        {workspace === "owner" && (
          <>
            <BrandWorkspace
              products={realProducts}
              loading={productsLoading}
              analytics={brandAnalytics}
            />
            <BrowseShopCard />
          </>
        )}
        {workspace === "agency" && <AgencyWorkspace />}
        {workspace === "member" && (
          <>
            <MemberWorkspace />
            <BrowseShopCard />
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}