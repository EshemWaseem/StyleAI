// components/app-shell/nav-configs/agency-nav.ts
import {
  LayoutDashboard, MessageCircle, Bell, UsersRound, Megaphone, Camera,
  Inbox, Wallet, Settings,
} from "lucide-react";
import type { NavGroup } from "./types";

export const AGENCY_NAV: NavGroup[] = [
  {
    group: "Workspace",
    items: [
      { to: "/agency", label: "Dashboard", icon: LayoutDashboard },
      { to: "/messages", label: "Messages", icon: MessageCircle },
      { to: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    group: "Portfolio",
    items: [
      { to: "/agency/clients", label: "Clients", icon: UsersRound },
      { to: "/agency/campaigns", label: "Campaigns", icon: Megaphone },
      { to: "/agency/editing", label: "Editing queue", icon: Camera },
    ],
  },
  {
    group: "Hire requests",
    items: [
      { to: "/agency/engagements", label: "Engagements", icon: Inbox },
    ],
  },
  {
    group: "Finance",
    items: [{ to: "/wallet", label: "Wallet", icon: Wallet }],
  },
  {
    group: "Account",
    items: [
      { to: "/team", label: "Team", icon: UsersRound },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];