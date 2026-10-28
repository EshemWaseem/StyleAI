// components/app-shell/nav-configs/influencer-nav.ts
import {
  LayoutDashboard, MessageCircle, Bell, FileText, Megaphone, Sparkles,
  User, BadgeDollarSign, Package, Camera, Briefcase, Wallet, Settings,
} from "lucide-react";
import type { NavGroup } from "./types";

export const getInfluencerNav = (slug?: string): NavGroup[] => [
  {
    group: "Workspace",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/messages", label: "Messages", icon: MessageCircle },
      { to: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    group: "Collaborations",
    items: [
      { to: "/offers", label: "Offers received", icon: FileText },
      { to: "/campaigns", label: "Campaigns", icon: Megaphone },
      { to: "/matched-products", label: "Matched products", icon: Sparkles },
    ],
  },
  {
    group: "My profile",
    items: [
      ...(slug
        ? [{ to: `/influencers/${slug}`, label: "Public profile", icon: User }]
        : []),
      { to: "/influencer/pricing", label: "My pricing", icon: BadgeDollarSign },
      { to: "/influencer/offers", label: "My listings", icon: Package },
    ],
  },
  {
    group: "Hire services",
    items: [
      { to: "/agency/browse", label: "Photographers & videographers", icon: Camera },
      { to: "/engagements", label: "My engagements", icon: Briefcase },
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
    items: [{ to: "/settings", label: "Settings", icon: Settings }],
  },
];