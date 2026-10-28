// components/app-shell/nav-configs/admin-nav.ts
import {
  LayoutDashboard, UsersRound, Palette, Sparkles, Briefcase, Shapes,
  Star, Megaphone, FileText, CreditCard, TrendingUp, Wallet, Banknote,
  Sliders, FileClock, Settings,
} from "lucide-react";
import type { NavGroup } from "./types";

export const ADMIN_NAV: NavGroup[] = [
  {
    group: "Platform",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/users", label: "Users", icon: UsersRound },
      { to: "/admin/brands", label: "Brands", icon: Palette },
      { to: "/admin/influencers", label: "Influencers", icon: Sparkles },
      { to: "/admin/agencies", label: "Agencies", icon: Briefcase },
      { to: "/admin/products", label: "Products", icon: Shapes },
      { to: "/admin/storefront", label: "Storefront", icon: Star },
      { to: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
    ],
  },
  {
    group: "Marketplace",
    items: [{ to: "/admin/offers", label: "Offers", icon: FileText }],
  },
  {
    group: "Finance",
    items: [
      { to: "/admin/payments", label: "Payments", icon: CreditCard },
      { to: "/admin/finance", label: "Finance rules", icon: TrendingUp },
      { to: "/admin/wallets", label: "Wallets", icon: Wallet },
      { to: "/admin/withdrawals", label: "Withdrawals", icon: Banknote },
      { to: "/wallet", label: "My Wallet", icon: Wallet },
    ],
  },
  {
    group: "System",
    items: [
      { to: "/admin/settings", label: "Platform settings", icon: Sliders },
      { to: "/admin/audit", label: "Audit log", icon: FileClock },
    ],
  },
  {
    group: "Account",
    items: [{ to: "/settings", label: "My Account", icon: Settings }],
  },
];