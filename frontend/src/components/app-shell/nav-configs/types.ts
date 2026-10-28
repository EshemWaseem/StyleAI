// components/app-shell/nav-configs/types.ts
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export type NavGroup = {
  group: string;
  items: NavItem[];
};