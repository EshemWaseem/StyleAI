// components/app-shell/nav-configs/index.ts
import type { RoleName } from "@/lib/role";
import type { NavGroup } from "./types";
import { ADMIN_NAV } from "./admin-nav";
import { BRAND_NAV } from "./brand-nav";
import { AGENCY_NAV } from "./agency-nav";
import { getInfluencerNav } from "./influencer-nav";

export type { NavGroup, NavItem } from "./types";
export { ADMIN_NAV } from "./admin-nav";
export { BRAND_NAV } from "./brand-nav";
export { AGENCY_NAV } from "./agency-nav";
export { getInfluencerNav } from "./influencer-nav";

export function resolveNav(
  roles: RoleName[],
  influencerSlug?: string
): NavGroup[] {
  if (roles.includes("SUPER_ADMIN")) return ADMIN_NAV;
  if (roles.includes("AGENCY")) return AGENCY_NAV;
  if (roles.includes("BRAND_OWNER")) return BRAND_NAV;
  if (roles.includes("BRAND_TEAM_MEMBER")) return BRAND_NAV;
  if (roles.includes("INFLUENCER")) return getInfluencerNav(influencerSlug);
  return BRAND_NAV;
}