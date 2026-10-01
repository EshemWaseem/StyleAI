// components/app-shell.tsx
import { Link, useRouterState } from "@tanstack/react-router";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import {
  BadgeDollarSign,
  Banknote,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Camera,
  Command,
  CreditCard,
  FileClock,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Megaphone,
  Package,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Shapes,
  ShieldCheck,
  Sliders,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { AgencyProvider, useAgency } from "@/lib/agency/context";
import { cn } from "@/lib/utils";
import { useRole, type RoleName } from "@/lib/role";
import { MessageCircle } from "lucide-react";

// ======================================================
// TYPES
// ======================================================
type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  permissions?: string[];
  roles?: string[];
  excludeRoles?: string[];
};

type NavGroup = {
  group: string;
  items: NavItem[];
};

// ======================================================
// ADMIN NAV (SUPER_ADMIN only)
// ======================================================
const ADMIN_NAV: NavGroup[] = [
  {
    group: "Platform",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/users", label: "Users", icon: UsersRound },
      { to: "/admin/brands", label: "Brands", icon: Palette },
      { to: "/admin/influencers", label: "Influencers", icon: Sparkles },
      { to: "/admin/agencies", label: "Agencies", icon: Briefcase },
      { to: "/admin/products", label: "Products", icon: Shapes },
      { to: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
    ],
  },
  {
    group: "Marketplace",
    items: [
      { to: "/admin/offers", label: "Offers", icon: FileText },
    ],
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
    items: [
      { to: "/settings", label: "My Account", icon: Settings },
    ],
  },
];

const APP_NAV: NavGroup[] = [
  {
    group: "Workspace",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/messages", label: "Messages", icon: MessageCircle, excludeRoles: ["SHOPPER"] },
      { to: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    group: "Commerce",
    items: [
      { to: "/brands", label: "Brand", icon: Palette, permissions: ["brand.read"], excludeRoles: ["INFLUENCER"] },
      { to: "/products", label: "Products", icon: Shapes, permissions: ["product.read"], excludeRoles: ["INFLUENCER"] },
    ],
  },
  {
    group: "Agency portfolio",
    items: [
      { to: "/agency/clients", label: "Client organizations", icon: Briefcase, roles: ["AGENCY"] },
      { to: "/agency/campaigns", label: "All campaigns", icon: Megaphone, roles: ["AGENCY"] },
      { to: "/agency/editing", label: "Editing queue", icon: Camera, roles: ["AGENCY"] },
    ],
  },
  {
    group: "Influencer intelligence",
    items: [
      { to: "/influencers", label: "Discover", icon: Search, permissions: ["influencer.read"], excludeRoles: ["INFLUENCER"] },
      { to: "/matching", label: "AI matching", icon: Target, permissions: ["influencer.read"], excludeRoles: ["INFLUENCER"] },
    ],
  },
  {
    group: "Collaborations",
    items: [
      { to: "/offers", label: "Offers", icon: FileText, permissions: ["influencer.read"], excludeRoles: ["SHOPPER"] },
      { to: "/offers/browse", label: "Browse offers", icon: Package, roles: ["BRAND_OWNER", "BRAND_TEAM_MEMBER", "AGENCY"] },
    ],
  },
     {
    group: "AI Studio",
    items: [
      { to: "/studio/content", label: "Content Studio", icon: Sparkles, roles: ["BRAND_OWNER", "BRAND_TEAM_MEMBER", "AGENCY"] },
      { to: "/studio/photography", label: "AI Photography", icon: Camera, roles: ["BRAND_OWNER", "BRAND_TEAM_MEMBER", "AGENCY"] },
    ],
  },
  {
    group: "Marketing",
    items: [
      { to: "/campaigns", label: "Campaigns", icon: Megaphone, excludeRoles: ["SHOPPER"] },
      { to: "/analytics", label: "Analytics", icon: BarChart3, excludeRoles: ["SHOPPER"] },
    ],
  },
  {
    group: "Finances",
    items: [
      { to: "/wallet", label: "Wallet", icon: Wallet, excludeRoles: ["SHOPPER"] },
    ],
  },
  {
    group: "My account",
    items: [
      { to: "/influencers", label: "My Profile", icon: UsersRound, permissions: ["influencer.read"], roles: ["INFLUENCER"] },
      { to: "/influencer/pricing", label: "My Pricing", icon: BadgeDollarSign, permissions: ["influencer.read"], roles: ["INFLUENCER"] },
      { to: "/influencer/offers", label: "My Offers", icon: Package, permissions: ["influencer.read"], roles: ["INFLUENCER"] },
      { to: "/matched-products", label: "Matched Products", icon: Sparkles, permissions: ["influencer.read"], roles: ["INFLUENCER"] },
    ],
  },
    {
    group: "Administration",
    items: [
      { to: "/team", label: "Team", icon: UsersRound, excludeRoles: ["INFLUENCER", "SHOPPER"] },
      { to: "/billing", label: "Billing", icon: BadgeDollarSign, roles: ["BRAND_OWNER", "AGENCY"] },
      { to: "/plans", label: "Plans & Pricing", icon: Sparkles }, 
      { to: "/settings", label: "Settings", icon: Settings, excludeRoles: ["SHOPPER"] },
    ],
  },
];

const OWNER_ROLES: RoleName[] = ["SUPER_ADMIN", "BRAND_OWNER", "AGENCY"];

// ======================================================
// SIDEBAR NAV
// ======================================================
function SidebarNav({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const { user } = useRole();

  const userPermissions = user?.permissions ?? [];
  const userRoles = user?.roles ?? [];
  const isSuperAdmin = userRoles.includes("SUPER_ADMIN");
  const isOwner = userRoles.some((r) => OWNER_ROLES.includes(r));
  const isTeamMember = userRoles.includes("BRAND_TEAM_MEMBER") && !isOwner;
  const isInfluencer = userRoles.includes("INFLUENCER") && !isOwner;
  const isAgencyRole = userRoles.includes("AGENCY");

  // ---------- SUPER ADMIN → dedicated admin nav ----------
  if (isSuperAdmin) {
    return (
      <nav className="flex flex-col gap-6 px-3 py-5" aria-label="Admin">
        {ADMIN_NAV.map((group) => (
          <div key={group.group}>
            {!collapsed && (
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                {group.group}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={`${group.group}-${item.to}`}>
                  <Link
                    to={item.to as "/admin"}
                    onClick={onNavigate}
                    title={item.label}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                      collapsed && "justify-center px-0"
                    )}
                    activeProps={{
                      className: "bg-sidebar-accent font-medium text-foreground",
                    }}
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden="true" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    );
  }

  // ---------- NON-ADMIN → role-filtered app nav ----------
  function canSeeItem(item: NavItem): boolean {
    if (user?.pendingApproval) return false;

    if (item.excludeRoles?.length) {
      const blocked = item.excludeRoles.some((r) => userRoles.includes(r as RoleName));
      if (blocked) return false;
    }

    if (item.roles?.length) {
      const allowed = item.roles.some((r) => userRoles.includes(r as RoleName));
      if (!allowed) return false;
      if (item.permissions?.length) {
        return item.permissions.every((p) => userPermissions.includes(p));
      }
      return true;
    }

    if (isInfluencer) {
            const allowed = [
        "/dashboard",
        "/messages",
        "/notifications",
        "/influencers",
        "/influencer/pricing",
        "/influencer/offers",
        "/matched-products",
        "/offers",
        "/campaigns",
        "/analytics",
        "/wallet",
        "/settings",
      ];
      return allowed.includes(item.to);
    }

    if (isAgencyRole) {
      const allowed = [
        "/dashboard",
        "/messages",
        "/notifications",
        "/agency/clients",
        "/agency/campaigns",
        "/agency/editing",
        "/influencers",
        "/offers",
        "/offers/browse",
        "/campaigns",
        "/analytics",
        "/wallet",
        "/settings",
      ];
      return allowed.includes(item.to);
    }

    if (isOwner) return true;

    if (isTeamMember) {
      if (!item.permissions || item.permissions.length === 0) {
        return item.to === "/dashboard";
      }
      return item.permissions.some((p) => userPermissions.includes(p));
    }

    return item.to === "/dashboard";
  }

  const visibleGroups = APP_NAV.map((group) => ({
    ...group,
    items: group.items.filter(canSeeItem),
  })).filter((group) => group.items.length > 0);

  return (
    <nav className="flex flex-col gap-6 px-3 py-5" aria-label="Main">
      {visibleGroups.map((group) => (
        <div key={group.group}>
          {!collapsed && (
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
              {group.group}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={`${group.group}-${item.to}`}>
                <Link
                  to={item.to as "/dashboard"}
                  onClick={onNavigate}
                  title={item.label}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                    collapsed && "justify-center px-0"
                  )}
                  activeProps={{
                    className: "bg-sidebar-accent font-medium text-foreground",
                  }}
                >
                  <item.icon className="size-4 shrink-0" aria-hidden="true" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// ======================================================
// AGENCY BRAND SWITCHER
// ======================================================
function AgencyBrandSwitcher() {
  const { isAgency, clients, activeBrandId, setActiveBrand } = useAgency();

  if (!isAgency) return null;

  const allBrands = clients.flatMap((c) =>
    c.brands.map((b) => ({ ...b, clientName: c.clientOrganization.name }))
  );

  if (allBrands.length === 0) {
    return (
      <span className="hidden rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-500 sm:inline">
        No clients
      </span>
    );
  }

  return (
    <div className="hidden items-center gap-2 rounded-md border border-border bg-card px-2 py-1 sm:flex">
      <span className="text-[10px] font-medium uppercase text-muted-foreground">Acting as</span>
      <select
        value={activeBrandId ?? ""}
        onChange={(e) => setActiveBrand(e.target.value || null)}
        className="max-w-[180px] truncate bg-transparent text-xs font-medium outline-none"
      >
        <option value="">— none —</option>
        {allBrands.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name} · {b.clientName}
          </option>
        ))}
      </select>
    </div>
  );
}

// ======================================================
// BRANDMARK
// ======================================================
function Brandmark({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5" aria-label="StyleAI workspace">
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-foreground text-background">
        <span className="font-display text-sm leading-none">S</span>
      </span>
      {!collapsed && (
        <span className="font-display text-[15px] font-medium tracking-tight">StyleAI</span>
      )}
    </Link>
  );
}

// ======================================================
// ASSISTANT
// ======================================================
type PromptSet = { placeholder: string; suggestions: string[] };

const BRAND_PROMPTS: PromptSet = {
  placeholder: "Ask StyleAI to analyse, match, or create…",
  suggestions: [
    "Find influencers for the Noir Evening Dress",
    "Generate a campaign for AW26",
    "Show my best performing creators",
  ],
};

const INFLUENCER_PROMPTS: PromptSet = {
  placeholder: "Ask StyleAI about your profile, pricing, or brands…",
  suggestions: [
    "Suggest a price for my Instagram reels",
    "Which brands match my audience?",
    "Write a bio for my creator profile",
  ],
};

const TEAM_MEMBER_PROMPTS: PromptSet = {
  placeholder: "Ask StyleAI to help with your assigned work…",
  suggestions: [
    "What should I work on first today?",
    "Draft a caption for the Noir Evening Edit",
    "Prepare a creator brief for Luna Accessories",
  ],
};

const ADMIN_PROMPTS: PromptSet = {
  placeholder: "Ask StyleAI about platform operations…",
  suggestions: [
    "Show today's platform health",
    "Which users signed up this week?",
    "Any brands pending review?",
  ],
};

const AGENCY_PROMPTS: PromptSet = {
  placeholder: "Ask StyleAI about your client portfolio…",
  suggestions: [
    "Which client needs attention first?",
    "Compare performance across my brands",
    "Show pending approvals across clients",
  ],
};

function getPromptSetForRoles(userRoles: string[]): PromptSet {
  if (userRoles.includes("SUPER_ADMIN")) return ADMIN_PROMPTS;
  if (userRoles.includes("AGENCY")) return AGENCY_PROMPTS;
  if (userRoles.includes("BRAND_OWNER")) return BRAND_PROMPTS;
  if (userRoles.includes("BRAND_TEAM_MEMBER")) return TEAM_MEMBER_PROMPTS;
  if (userRoles.includes("INFLUENCER")) return INFLUENCER_PROMPTS;
  return BRAND_PROMPTS;
}

// function Assistant() {
//   const { user } = useRole();
//   const [open, setOpen] = useState(false);
//   const [query, setQuery] = useState("");

//   const promptSet = getPromptSetForRoles(user?.roles ?? []);

//   function submitSuggestion(text: string) {
//     setQuery(text);
//   }

//   function submitCustom(e: React.FormEvent) {
//     e.preventDefault();
//     if (!query.trim()) return;
//   }

//   return (
//     <>
//       <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
//         <Sparkles className="size-4" />
//         <span className="hidden sm:inline">Ask StyleAI</span>
//       </Button>

//       {open && (
//         <div className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/20 p-4 pt-24 backdrop-blur-sm">
//           <div className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-lift">
//             <form onSubmit={submitCustom} className="flex items-center gap-3 border-b border-border px-4 py-3">
//               <Sparkles className="size-4 text-accent" aria-hidden="true" />
//               <input
//                 autoFocus
//                 value={query}
//                 onChange={(e) => setQuery(e.target.value)}
//                 placeholder={promptSet.placeholder}
//                 aria-label="Ask StyleAI Assistant"
//                 className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
//               />
//               <Button
//                 type="button"
//                 variant="ghost"
//                 size="icon"
//                 aria-label="Close assistant"
//                 onClick={() => { setOpen(false); setQuery(""); }}
//               >
//                 <X />
//               </Button>
//             </form>

//             <div className="p-3">
//               <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
//                 Suggested for you
//               </p>
//               <ul className="space-y-0.5">
//                 {promptSet.suggestions.map((p) => (
//                   <li key={p}>
//                     <button
//                       type="button"
//                       onClick={() => submitSuggestion(p)}
//                       className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
//                     >
//                       {p}
//                     </button>
//                   </li>
//                 ))}
//               </ul>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }

function Assistant() {
  const { user } = useRole();
  const [open, setOpen] = useState(false);

  const promptSet = getPromptSetForRoles(user?.roles ?? []);

  return (
    <>
      <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Sparkles className="size-4" />
        <span className="hidden sm:inline">Ask StyleAI</span>
      </Button>

      {open && (
        <AssistantChat
          onClose={() => setOpen(false)}
          suggestions={promptSet.suggestions}
          placeholder={promptSet.placeholder}
        />
      )}
    </>
  );
}

// ======================================================
// APP SHELL
// ======================================================
export function AppShell({
  children,
  breadcrumb = [],
}: {
  children: ReactNode;
  breadcrumb?: string[];
}) {
  return (
    <AgencyProvider>
      <AppShellInner breadcrumb={breadcrumb}>{children}</AppShellInner>
    </AgencyProvider>
  );
}

function AppShellInner({
  children,
  breadcrumb = [],
}: {
  children: ReactNode;
  breadcrumb?: string[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useRole();

  const userRoles = user?.roles ?? [];
  const isAdmin = userRoles.includes("SUPER_ADMIN");
  const isOwner = userRoles.some((r) => ["BRAND_OWNER", "AGENCY"].includes(r));

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-background text-foreground">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex",
            collapsed ? "w-[68px]" : "w-[248px]"
          )}
        >
          <div className={cn("flex h-16 items-center border-b border-sidebar-border px-4", collapsed && "justify-center px-0")}>
            <Brandmark collapsed={collapsed} />
          </div>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav collapsed={collapsed} />
          </div>
          <div className="border-t border-sidebar-border p-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 text-muted-foreground"
              onClick={() => setCollapsed((c) => !c)}
            >
              {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
              {!collapsed && "Collapse"}
            </Button>
          </div>
        </aside>

        <div className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-[68px]" : "lg:pl-[248px]")}>
          <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                    <Command />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[268px] bg-sidebar p-0">
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <div className="flex h-16 items-center border-b border-sidebar-border px-4">
                    <Brandmark />
                  </div>
                  <div className="overflow-y-auto">
                    <SidebarNav />
                  </div>
                </SheetContent>
              </Sheet>

              <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-sm text-muted-foreground lg:flex">
                {breadcrumb.map((crumb, i) => (
                  <span key={crumb} className="flex min-w-0 items-center gap-2">
                    <span className="text-border">/</span>
                    <span className={cn("truncate", i === breadcrumb.length - 1 && "text-foreground")}>{crumb}</span>
                  </span>
                ))}
              </nav>

              <div className="ml-auto flex items-center gap-1.5">
                <AgencyBrandSwitcher />
                <Assistant />
                <NotificationBell />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Help" className="hidden sm:inline-flex">
                      <HelpCircle />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>Help &amp; documentation</p></TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="grid size-8 place-items-center rounded-full bg-foreground text-[11px] font-medium text-background transition-opacity hover:opacity-90"
                      aria-label="Open user menu"
                    >
                      {user?.name
                        ? user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
                        : "S"}
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-60">
                    <div className="border-b border-border px-3 py-2.5">
                      <p className="truncate text-sm font-medium">{user?.name ?? "User"}</p>
                      <p className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
                      {user?.roles?.length ? (
                        <p className="mt-1 inline-flex rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                          {user.roles.map((r) => r.replace(/_/g, " ").toLowerCase()).join(" · ")}
                        </p>
                      ) : null}
                    </div>

                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="cursor-pointer">
                        <Settings className="size-4" />
                        <span>Profile & settings</span>
                      </Link>
                    </DropdownMenuItem>

                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="cursor-pointer">
                          <ShieldCheck className="size-4" />
                          <span>Admin panel</span>
                        </Link>
                      </DropdownMenuItem>
                    )}

                    {isOwner && (
                      <DropdownMenuItem asChild>
                        <Link to="/billing" className="cursor-pointer">
                          <BadgeDollarSign className="size-4" />
                          <span>Billing</span>
                        </Link>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    <DropdownMenuItem asChild>
                      <Link to="/" className="cursor-pointer">
                        <Shapes className="size-4" />
                        <span>Visit storefront</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <button onClick={logout} className="flex w-full cursor-pointer items-center gap-2 text-destructive focus:text-destructive">
                        <LogOut className="size-4" />
                        <span>Sign out</span>
                      </button>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}