// components/app-shell/nav-configs/brand-nav.ts
import {
  LayoutDashboard, MessageCircle, Bell, Palette, Shapes, FileText,
  Megaphone, Package, Search, Target, Briefcase, Sparkles, Camera,
  Wallet, BadgeDollarSign, UsersRound, Settings,
} from "lucide-react";
import type { NavGroup } from "./types";

export const BRAND_NAV: NavGroup[] = [
  {
    group: "Workspace",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/messages", label: "Messages", icon: MessageCircle },
      { to: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    group: "Commerce",
    items: [
      { to: "/brands", label: "Brand profile", icon: Palette },
      { to: "/products", label: "Products", icon: Shapes },
    ],
  },
  {
    group: "Collaborations",
    items: [
      { to: "/offers", label: "Offers (sent)", icon: FileText },
      { to: "/campaigns", label: "Campaigns", icon: Megaphone },
      { to: "/offers/browse", label: "Browse listings", icon: Package },
    ],
  },
  {
    group: "Discover",
    items: [
      { to: "/influencers", label: "Influencers", icon: Search },
      { to: "/matching", label: "AI Matching", icon: Target },
      { to: "/agency/browse", label: "Hire agencies", icon: Briefcase },
    ],
  },
  {
    group: "AI Studio",
    items: [
      { to: "/studio/content", label: "Content Studio", icon: Sparkles },
      { to: "/studio/photography", label: "AI Photography", icon: Camera },
      { to: "/knowledge", label: "Knowledge Base", icon: FileText },
    ],
  },
  {
    group: "Finance",
    items: [
      { to: "/wallet", label: "Wallet", icon: Wallet },
      { to: "/billing", label: "Billing", icon: BadgeDollarSign },
    ],
  },
  {
    group: "Account",
    items: [
      { to: "/team", label: "Team", icon: UsersRound },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];