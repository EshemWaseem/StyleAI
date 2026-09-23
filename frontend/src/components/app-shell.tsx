// App shell.tsx

import { Link, useRouterState } from "@tanstack/react-router";
import {
  BadgeDollarSign,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Camera,
  Command,
  HelpCircle,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Megaphone,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Shapes,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useRole, type RoleName } from "@/lib/role";

// ======================================================
// NAV TYPES
// ======================================================
type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  permissions?: string[];
  roles?: string[];         // only these roles see it
  excludeRoles?: string[];  // these roles never see it
};

type NavGroup = {
  group: string;
  items: NavItem[];
};

// ======================================================
// NAV CONFIG
// ======================================================
const NAV: NavGroup[] = [
  {
    group: "Workspace",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
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
      { to: "/agency/clients", label: "Client organizations", icon: Briefcase, permissions: ["agency.read"] },
      { to: "/agency/tasks", label: "Pending work", icon: LayoutDashboard, permissions: ["agency.read"] },
    ],
  },
  {
    group: "Influencer intelligence",
    items: [
      // Discover = brand-side browse — hidden for INFLUENCER role
      { to: "/influencers", label: "Discover", icon: Search, permissions: ["influencer.read"], excludeRoles: ["INFLUENCER"] },
      { to: "/matching", label: "AI matching", icon: Target, permissions: ["influencer.read"], excludeRoles: ["INFLUENCER"] },
    ],
  },
  {
    group: "My account",
    items: [
      // Only INFLUENCER sees this
      { to: "/influencers", label: "My Profile", icon: UsersRound, permissions: ["influencer.read"], roles: ["INFLUENCER"] },
      { to: "/matched-products", label: "Matched Products", icon: Sparkles, permissions: ["influencer.read"], roles: ["INFLUENCER"] },
      { to: "/settings", label: "Settings", icon: Settings, roles: ["INFLUENCER"] },
    ],
  },
  {
    group: "AI studio",
    items: [
      { to: "/studio/content", label: "Content", icon: Sparkles, permissions: ["campaign.read"] },
      { to: "/studio/photography", label: "AI photography", icon: Camera, permissions: ["campaign.read"] },
    ],
  },
  {
    group: "Marketing",
    items: [
      { to: "/campaigns", label: "Campaigns", icon: Megaphone, permissions: ["campaign.read"] },
      { to: "/analytics", label: "Analytics", icon: BarChart3, permissions: ["analytics.view"] },
    ],
  },
  {
    group: "Intelligence",
    items: [
      { to: "/recommendations", label: "Recommendations", icon: Lightbulb, permissions: ["analytics.view"] },
      { to: "/knowledge", label: "Knowledge base", icon: BookOpen, permissions: ["analytics.view"] },
    ],
  },
  {
    group: "Administration",
    items: [
      { to: "/team", label: "Team", icon: UsersRound, excludeRoles: ["INFLUENCER"] },
      { to: "/billing", label: "Billing", icon: BadgeDollarSign, permissions: ["billing.read"], excludeRoles: ["INFLUENCER"] },
      // Settings here is for owners/admins only — INFLUENCER has its own in "My account"
      { to: "/settings", label: "Settings", icon: Settings, excludeRoles: ["INFLUENCER"] },
    ],
  },
  {
    group: "Platform",
    items: [
      { to: "/admin", label: "Platform health", icon: ShieldCheck, permissions: ["user.read"] },
      { to: "/users", label: "Users & access", icon: UsersRound, permissions: ["user.read"] },
      { to: "/analytics", label: "AI usage", icon: BarChart3, permissions: ["user.read"] },
      // System settings removed — it was duplicating with Administration → Settings
    ],
  },
];

// Owner roles see everything in their scope
const OWNER_ROLES: RoleName[] = ["SUPER_ADMIN", "BRAND_OWNER", "AGENCY"];

const notifications = [
  { title: "Maya Khan accepted the Autumn Atelier brief", time: "12 min ago" },
  { title: "AI generated 6 Instagram captions for Noir Evening Dress", time: "1 hour ago" },
  { title: "Zara Malik submitted content for review", time: "3 hours ago" },
  { title: "Campaign Autumn Atelier passed 1M reach", time: "Yesterday" },
];

// ======================================================
// SIDEBAR
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
  const isOwner = userRoles.some((r) => OWNER_ROLES.includes(r));
  const isTeamMember = userRoles.includes("BRAND_TEAM_MEMBER") && !isOwner;
  const isInfluencer = userRoles.includes("INFLUENCER") && !isOwner;

  // ======================================================
  // VISIBILITY RULE — priority:
  //  1. pendingApproval → hide everything
  //  2. excludeRoles contains user role → hide
  //  3. roles array present → only show for those roles
  //  4. INFLUENCER restricted list
  //  5. Owner → show all
  //  6. Team member → permission based
  //  7. Else → dashboard only
  // ======================================================
  function canSeeItem(item: NavItem): boolean {
    if (user?.pendingApproval) return false;

    // excludeRoles — hard reject
    if (item.excludeRoles?.length) {
      const blocked = item.excludeRoles.some((r) =>
        userRoles.includes(r as RoleName)
      );
      if (blocked) return false;
    }

    // roles — allow-list (only these roles)
    if (item.roles?.length) {
      const allowed = item.roles.some((r) =>
        userRoles.includes(r as RoleName)
      );
      if (!allowed) return false;
      // For allow-listed items, permission check still applies
      if (item.permissions?.length) {
        return item.permissions.every((p) => userPermissions.includes(p));
      }
      return true;
    }

    // Influencer — restricted nav (belt + suspenders)
    if (isInfluencer) {
      const influencerAllowed = [
        "/dashboard",
        "/influencers",
        "/matched-products",
        "/settings",
      ];
      return influencerAllowed.includes(item.to);
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

  // Filter groups and items
  const visibleGroups = NAV.map((group) => ({
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
              <li key={`${group.group}-${item.label}`}>
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

function Brandmark({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link
      to="/dashboard"
      className="flex items-center gap-2.5"
      aria-label="StyleAI workspace"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-foreground text-background">
        <span className="font-display text-sm leading-none">S</span>
      </span>
      {!collapsed && (
        <span className="font-display text-[15px] font-medium tracking-tight">
          StyleAI
        </span>
      )}
    </Link>
  );
}

// function Assistant() {
//   const [open, setOpen] = useState(false);
//   const prompts = [
//     "Find influencers for the Noir Evening Dress",
//     "Generate a campaign for AW26",
//     "Show my best performing creators",
//     "Why did Noir Evening Edit underperform?",
//   ];
//   return (
//     <>
//       <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
//         <Sparkles className="size-4" />
//         <span className="hidden sm:inline">Ask StyleAI</span>
//       </Button>
//       {open && (
//         <div className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/20 p-4 pt-24 backdrop-blur-sm">
//           <div className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-lift">
//             <div className="flex items-center gap-3 border-b border-border px-4 py-3">
//               <Sparkles className="size-4 text-accent" aria-hidden="true" />
//               <input
//                 autoFocus
//                 placeholder="Ask StyleAI to analyse, match, or create…"
//                 aria-label="Ask StyleAI Assistant"
//                 className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
//               />
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 aria-label="Close assistant"
//                 onClick={() => setOpen(false)}
//               >
//                 <X />
//               </Button>
//             </div>
//             <div className="p-3">
//               <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
//                 Suggested
//               </p>
//               <ul className="space-y-0.5">
//                 {prompts.map((p) => (
//                   <li key={p}>
//                     <button className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted">
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

// ======================================================
// ROLE-SPECIFIC SUGGESTED PROMPTS
// ======================================================
type PromptSet = {
  placeholder: string;
  suggestions: string[];
};

const BRAND_PROMPTS: PromptSet = {
  placeholder: "Ask StyleAI to analyse, match, or create…",
  suggestions: [
    "Find influencers for the Noir Evening Dress",
    "Generate a campaign for AW26",
    "Show my best performing creators",
    "Why did Noir Evening Edit underperform?",
  ],
};

const INFLUENCER_PROMPTS: PromptSet = {
  placeholder: "Ask StyleAI about your profile, pricing, or brands…",
  suggestions: [
    "Suggest a price for my Instagram reels",
    "Which brands match my audience?",
    "Write a bio for my creator profile",
    "What categories should I add to grow?",
    "Show me campaigns I should apply to",
  ],
};

const TEAM_MEMBER_PROMPTS: PromptSet = {
  placeholder: "Ask StyleAI to help with your assigned work…",
  suggestions: [
    "What should I work on first today?",
    "Draft a caption for the Noir Evening Edit",
    "Prepare a creator brief for Luna Accessories",
    "Show items waiting on my review",
  ],
};

const ADMIN_PROMPTS: PromptSet = {
  placeholder: "Ask StyleAI about platform health and usage…",
  suggestions: [
    "Show today's AI latency and error rate",
    "Which models are running hot?",
    "Any unusual token volume today?",
    "Summarise platform health",
  ],
};

const AGENCY_PROMPTS: PromptSet = {
  placeholder: "Ask StyleAI about your client portfolio…",
  suggestions: [
    "Which client needs attention first?",
    "Compare performance across my brands",
    "Show pending approvals across clients",
    "Which brand has the highest ROI this month?",
  ],
};

function getPromptSetForRoles(userRoles: string[]): PromptSet {
  if (userRoles.includes("SUPER_ADMIN")) return ADMIN_PROMPTS;
  if (userRoles.includes("AGENCY")) return AGENCY_PROMPTS;
  if (userRoles.includes("BRAND_OWNER")) return BRAND_PROMPTS;
  if (userRoles.includes("BRAND_TEAM_MEMBER")) return TEAM_MEMBER_PROMPTS;
  if (userRoles.includes("INFLUENCER")) return INFLUENCER_PROMPTS;
  return BRAND_PROMPTS; // fallback
}

// ======================================================
// ASSISTANT
// ======================================================
function Assistant() {
  const { user } = useRole();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const promptSet = getPromptSetForRoles(user?.roles ?? []);

  function submitSuggestion(text: string) {
    setQuery(text);
    // TODO: hook up real AI chat endpoint here later
    // For now, just populate the input so user sees it working
  }

  function submitCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    // TODO: send to /api/ai/chat when ready
  }

  return (
    <>
      <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Sparkles className="size-4" />
        <span className="hidden sm:inline">Ask StyleAI</span>
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/20 p-4 pt-24 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-lift">
            <form
              onSubmit={submitCustom}
              className="flex items-center gap-3 border-b border-border px-4 py-3"
            >
              <Sparkles className="size-4 text-accent" aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={promptSet.placeholder}
                aria-label="Ask StyleAI Assistant"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close assistant"
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                }}
              >
                <X />
              </Button>
            </form>

            <div className="p-3">
              <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Suggested for you
              </p>
              <ul className="space-y-0.5">
                {promptSet.suggestions.map((p) => (
                  <li key={p}>
                    <button
                      type="button"
                      onClick={() => submitSuggestion(p)}
                      className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                    >
                      {p}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {query && (
              <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
                Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">Enter</kbd> to send
              </div>
            )}
          </div>
        </div>
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
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useRole();

  const userRoles = user?.roles ?? [];
  const isAdmin = userRoles.includes("SUPER_ADMIN");
  const isOwner = userRoles.some((r) =>
    ["BRAND_OWNER", "AGENCY"].includes(r)
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex",
          collapsed ? "w-[68px]" : "w-[248px]"
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-sidebar-border px-4",
            collapsed && "justify-center px-0"
          )}
        >
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
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
            {!collapsed && "Collapse"}
          </Button>
        </div>
      </aside>

      <div
        className={cn(
          "transition-[padding] duration-200",
          collapsed ? "lg:pl-[68px]" : "lg:pl-[248px]"
        )}
      >
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open navigation"
                >
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

            <nav
              aria-label="Breadcrumb"
              className="hidden min-w-0 items-center gap-2 text-sm text-muted-foreground lg:flex"
            >
              {breadcrumb.map((crumb, i) => (
                <span key={crumb} className="flex min-w-0 items-center gap-2">
                  <span className="text-border">/</span>
                  <span
                    className={cn(
                      "truncate",
                      i === breadcrumb.length - 1 && "text-foreground"
                    )}
                  >
                    {crumb}
                  </span>
                </span>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-1.5">
              <div className="hidden items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground 2xl:flex">
                <Search className="size-3.5" aria-hidden="true" />
                <input
                  aria-label="Search StyleAI"
                  placeholder="Search products, creators…"
                  className="w-40 bg-transparent outline-none placeholder:text-muted-foreground xl:w-56"
                />
              </div>

              <Assistant />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Notifications"
                    className="relative"
                  >
                    <Bell />
                    <span className="absolute right-2 top-2 size-1.5 rounded-full bg-accent" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.map((n) => (
                    <DropdownMenuItem
                      key={n.title}
                      className="flex-col items-start gap-1 py-2.5"
                    >
                      <span className="text-sm leading-snug">{n.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {n.time}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                aria-label="Help"
                className="hidden sm:inline-flex"
              >
                <HelpCircle />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="grid size-8 place-items-center rounded-full bg-foreground text-[11px] font-medium text-background transition-opacity hover:opacity-90"
                    aria-label="Open user menu"
                  >
                    {user?.name
                      ? user.name
                          .split(" ")
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()
                      : "S"}
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-60">
                  <div className="border-b border-border px-3 py-2.5">
                    <p className="truncate text-sm font-medium">
                      {user?.name ?? "User"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user?.email ?? ""}
                    </p>
                    {user?.roles?.length ? (
                      <p className="mt-1 inline-flex rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                        {user.roles
                          .map((r) => r.replace(/_/g, " ").toLowerCase())
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>

                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="cursor-pointer">
                      <Settings className="size-4" />
                      <span>Profile & settings</span>
                    </Link>
                  </DropdownMenuItem>

                  {isOwner && (
                    <DropdownMenuItem asChild>
                      <Link to="/billing" className="cursor-pointer">
                        <BadgeDollarSign className="size-4" />
                        <span>Billing</span>
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/users" className="cursor-pointer">
                        <UsersRound className="size-4" />
                        <span>Users & access</span>
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
                    <button
                      onClick={logout}
                      className="flex w-full cursor-pointer items-center gap-2 text-destructive focus:text-destructive"
                    >
                      <LogOut className="size-4" />
                      <span>Sign out</span>
                    </button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main
          key={pathname}
          className="page-enter mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}








// // App shell.tsx
//  // 23-9-26 



// import { Link, useRouterState } from "@tanstack/react-router";
// import {
//   BadgeDollarSign,
//   BarChart3,
//   Bell,
//   BookOpen,
//   Briefcase,
//   Camera,
//   Command,
//   HelpCircle,
//   LayoutDashboard,
//   Lightbulb,
//   LogOut,
//   Megaphone,
//   Palette,
//   PanelLeftClose,
//   PanelLeftOpen,
//   Search,
//   Settings,
//   Shapes,
//   ShieldCheck,
//   Sparkles,
//   Target,
//   UsersRound,
//   X,
// } from "lucide-react";
// import { useState, type ReactNode } from "react";
// import { Button } from "@/components/ui/button";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
// import { cn } from "@/lib/utils";
// import { useRole, type RoleName } from "@/lib/role";

// // ======================================================
// // NAV — each item declares required permissions
// // ======================================================

// type NavItem = {
//   to: string;
//   label: string;
//   icon: typeof LayoutDashboard;
//   permissions?: string[];
//    roles?: string[]; 
// };

// type NavGroup = {
//   group: string;
//   items: NavItem[];
// };

// const NAV: NavGroup[] = [
//   {
//     group: "Workspace",
//     items: [
//       { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
//     ],
//   },
//   {
//     group: "Commerce",
//     items: [
//       { to: "/brands", label: "Brand", icon: Palette, permissions: ["brand.read"] },
//       { to: "/products", label: "Products", icon: Shapes, permissions: ["product.read"] },
//     ],
//   },
//   {
//     group: "Agency portfolio",
//     items: [
//       { to: "/agency/clients", label: "Client organizations", icon: Briefcase, permissions: ["agency.read"] },
//       { to: "/agency/tasks", label: "Pending work", icon: LayoutDashboard, permissions: ["agency.read"] },
//     ],
//   },
//    {
//     group: "Influencer intelligence",
//     items: [
//       { to: "/influencers", label: "Discover", icon: Search, permissions: ["influencer.read"] },
//       { to: "/matching", label: "AI matching", icon: Target, permissions: ["influencer.read"] },
//     ],
//   },
//   {
//     group: "My account",
//     items: [
//       { to: "/influencers", label: "My Profile", icon: UsersRound, permissions: ["influencer.read"], roles: ["INFLUENCER"] },
//       { to: "/settings", label: "Settings", icon: Settings, roles: ["INFLUENCER"] },
//     ],
//   },
//   {
//     group: "AI studio",
//     items: [
//       { to: "/studio/content", label: "Content", icon: Sparkles, permissions: ["campaign.read"] },
//       { to: "/studio/photography", label: "AI photography", icon: Camera, permissions: ["campaign.read"] },
//     ],
//   },
//   {
//     group: "Marketing",
//     items: [
//       { to: "/campaigns", label: "Campaigns", icon: Megaphone, permissions: ["campaign.read"] },
//       { to: "/analytics", label: "Analytics", icon: BarChart3, permissions: ["analytics.view"] },
//     ],
//   },
//   {
//     group: "Intelligence",
//     items: [
//       { to: "/recommendations", label: "Recommendations", icon: Lightbulb, permissions: ["analytics.view"] },
//       { to: "/knowledge", label: "Knowledge base", icon: BookOpen, permissions: ["analytics.view"] },
//     ],
//   },
//   {
//     group: "Administration",
//     items: [
//       { to: "/team", label: "Team", icon: UsersRound },
//       { to: "/billing", label: "Billing", icon: BadgeDollarSign, permissions: ["billing.read"] },
//       { to: "/settings", label: "Settings", icon: Settings },
//     ],
//   },
//   {
//     group: "Platform",
//     items: [
//       { to: "/admin", label: "Platform health", icon: ShieldCheck, permissions: ["user.read"] },
//       { to: "/users", label: "Users & access", icon: UsersRound, permissions: ["user.read"] },
//       { to: "/analytics", label: "AI usage", icon: BarChart3, permissions: ["user.read"] },
//       { to: "/settings", label: "System settings", icon: Settings },
//     ],
//   },
// ];

// // Owner roles see everything in their scope
// const OWNER_ROLES: RoleName[] = ["SUPER_ADMIN", "BRAND_OWNER", "AGENCY"];

// const notifications = [
//   { title: "Maya Khan accepted the Autumn Atelier brief", time: "12 min ago" },
//   { title: "AI generated 6 Instagram captions for Noir Evening Dress", time: "1 hour ago" },
//   { title: "Zara Malik submitted content for review", time: "3 hours ago" },
//   { title: "Campaign Autumn Atelier passed 1M reach", time: "Yesterday" },
// ];

// // ======================================================
// // SIDEBAR
// // ======================================================

// function SidebarNav({
//   collapsed,
//   onNavigate,
// }: {
//   collapsed?: boolean;
//   onNavigate?: () => void;
// }) {
//   const { user } = useRole();

//   const userPermissions = user?.permissions ?? [];
//   const userRoles = user?.roles ?? [];
//   const isOwner = userRoles.some((r) => OWNER_ROLES.includes(r));
//   const isTeamMember = userRoles.includes("BRAND_TEAM_MEMBER") && !isOwner;

  

//   //   function canSeeItem(item: NavItem): boolean {
//   //   if (user?.pendingApproval) return false;
//   //   if (isOwner) return true;

//   //   if (isTeamMember) {
//   //     // Team members only see dashboard by default
//   //     if (!item.permissions || item.permissions.length === 0) {
//   //       return item.to === "/dashboard";
//   //     }
//   //     // Otherwise only if they have the required permission
//   //     return item.permissions.some((p) => userPermissions.includes(p));
//   //   }

//   //   return item.to === "/dashboard";
//   // }


//    function canSeeItem(item: NavItem): boolean {
//   if (user?.pendingApproval) return false;

//   // INFLUENCER role — restricted nav
//   if (userRoles.includes("INFLUENCER") && !isOwner) {
//     const influencerAllowed = ["/dashboard", "/influencers", "/settings"];
//     return influencerAllowed.includes(item.to);
//   }

//   if (isOwner) return true;

//   if (isTeamMember) {
//     if (!item.permissions || item.permissions.length === 0) {
//       return item.to === "/dashboard";
//     }
//     return item.permissions.some((p) => userPermissions.includes(p));
//   }

//   return item.to === "/dashboard";
// }

//   // Filter groups and items
//   const visibleGroups = NAV.map((group) => ({
//     ...group,
//     items: group.items.filter(canSeeItem),
//   })).filter((group) => group.items.length > 0);

//   return (
//     <nav className="flex flex-col gap-6 px-3 py-5" aria-label="Main">
//       {visibleGroups.map((group) => (
//         <div key={group.group}>
//           {!collapsed && (
//             <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
//               {group.group}
//             </p>
//           )}
//           <ul className="space-y-0.5">
//             {group.items.map((item) => (
//               <li key={item.to}>
//                 <Link
//                   to={item.to as "/dashboard"}
//                   onClick={onNavigate}
//                   title={item.label}
//                   className={cn(
//                     "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
//                     collapsed && "justify-center px-0"
//                   )}
//                   activeProps={{
//                     className: "bg-sidebar-accent font-medium text-foreground",
//                   }}
//                 >
//                   <item.icon className="size-4 shrink-0" aria-hidden="true" />
//                   {!collapsed && <span className="truncate">{item.label}</span>}
//                 </Link>
//               </li>
//             ))}
//           </ul>
//         </div>
//       ))}
//     </nav>
//   );
// }

// function Brandmark({ collapsed }: { collapsed?: boolean }) {
//   return (
//     <Link
//       to="/dashboard"
//       className="flex items-center gap-2.5"
//       aria-label="StyleAI workspace"
//     >
//       <span className="grid size-8 shrink-0 place-items-center rounded-md bg-foreground text-background">
//         <span className="font-display text-sm leading-none">S</span>
//       </span>
//       {!collapsed && (
//         <span className="font-display text-[15px] font-medium tracking-tight">
//           StyleAI
//         </span>
//       )}
//     </Link>
//   );
// }

// function Assistant() {
//   const [open, setOpen] = useState(false);
//   const prompts = [
//     "Find influencers for the Noir Evening Dress",
//     "Generate a campaign for AW26",
//     "Show my best performing creators",
//     "Why did Noir Evening Edit underperform?",
//   ];
//   return (
//     <>
//       <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
//         <Sparkles className="size-4" />
//         <span className="hidden sm:inline">Ask StyleAI</span>
//       </Button>
//       {open && (
//         <div className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/20 p-4 pt-24 backdrop-blur-sm">
//           <div className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-lift">
//             <div className="flex items-center gap-3 border-b border-border px-4 py-3">
//               <Sparkles className="size-4 text-accent" aria-hidden="true" />
//               <input
//                 autoFocus
//                 placeholder="Ask StyleAI to analyse, match, or create…"
//                 aria-label="Ask StyleAI Assistant"
//                 className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
//               />
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 aria-label="Close assistant"
//                 onClick={() => setOpen(false)}
//               >
//                 <X />
//               </Button>
//             </div>
//             <div className="p-3">
//               <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
//                 Suggested
//               </p>
//               <ul className="space-y-0.5">
//                 {prompts.map((p) => (
//                   <li key={p}>
//                     <button className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted">
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

// // ======================================================
// // APP SHELL
// // ======================================================

// export function AppShell({
//   children,
//   breadcrumb = [],
// }: {
//   children: ReactNode;
//   breadcrumb?: string[];
// }) {
//   const [collapsed, setCollapsed] = useState(false);
//   const pathname = useRouterState({ select: (s) => s.location.pathname });
//   const { user, logout } = useRole();

//   const userRoles = user?.roles ?? [];
//   const isAdmin = userRoles.includes("SUPER_ADMIN");
//   const isOwner = userRoles.some((r) =>
//     ["BRAND_OWNER", "AGENCY"].includes(r)
//   );

//   return (
//     <div className="min-h-screen bg-background text-foreground">
//       <aside
//         className={cn(
//           "fixed inset-y-0 left-0 z-30 hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex",
//           collapsed ? "w-[68px]" : "w-[248px]"
//         )}
//       >
//         <div
//           className={cn(
//             "flex h-16 items-center border-b border-sidebar-border px-4",
//             collapsed && "justify-center px-0"
//           )}
//         >
//           <Brandmark collapsed={collapsed} />
//         </div>
//         <div className="flex-1 overflow-y-auto">
//           <SidebarNav collapsed={collapsed} />
//         </div>
//         <div className="border-t border-sidebar-border p-3">
//           <Button
//             variant="ghost"
//             size="sm"
//             className="w-full justify-start gap-3 text-muted-foreground"
//             onClick={() => setCollapsed((c) => !c)}
//           >
//             {collapsed ? (
//               <PanelLeftOpen className="size-4" />
//             ) : (
//               <PanelLeftClose className="size-4" />
//             )}
//             {!collapsed && "Collapse"}
//           </Button>
//         </div>
//       </aside>

//       <div
//         className={cn(
//           "transition-[padding] duration-200",
//           collapsed ? "lg:pl-[68px]" : "lg:pl-[248px]"
//         )}
//       >
//         <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
//           <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
//             <Sheet>
//               <SheetTrigger asChild>
//                 <Button
//                   variant="ghost"
//                   size="icon"
//                   className="lg:hidden"
//                   aria-label="Open navigation"
//                 >
//                   <Command />
//                 </Button>
//               </SheetTrigger>
//               <SheetContent side="left" className="w-[268px] bg-sidebar p-0">
//                 <SheetTitle className="sr-only">Navigation</SheetTitle>
//                 <div className="flex h-16 items-center border-b border-sidebar-border px-4">
//                   <Brandmark />
//                 </div>
//                 <div className="overflow-y-auto">
//                   <SidebarNav />
//                 </div>
//               </SheetContent>
//             </Sheet>

//             <nav
//               aria-label="Breadcrumb"
//               className="hidden min-w-0 items-center gap-2 text-sm text-muted-foreground lg:flex"
//             >
//               {breadcrumb.map((crumb, i) => (
//                 <span key={crumb} className="flex min-w-0 items-center gap-2">
//                   <span className="text-border">/</span>
//                   <span
//                     className={cn(
//                       "truncate",
//                       i === breadcrumb.length - 1 && "text-foreground"
//                     )}
//                   >
//                     {crumb}
//                   </span>
//                 </span>
//               ))}
//             </nav>

//             <div className="ml-auto flex items-center gap-1.5">
//               <div className="hidden items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground 2xl:flex">
//                 <Search className="size-3.5" aria-hidden="true" />
//                 <input
//                   aria-label="Search StyleAI"
//                   placeholder="Search products, creators…"
//                   className="w-40 bg-transparent outline-none placeholder:text-muted-foreground xl:w-56"
//                 />
//               </div>

//               <Assistant />

//               <DropdownMenu>
//                 <DropdownMenuTrigger asChild>
//                   <Button
//                     variant="ghost"
//                     size="icon"
//                     aria-label="Notifications"
//                     className="relative"
//                   >
//                     <Bell />
//                     <span className="absolute right-2 top-2 size-1.5 rounded-full bg-accent" />
//                   </Button>
//                 </DropdownMenuTrigger>
//                 <DropdownMenuContent align="end" className="w-80">
//                   <DropdownMenuLabel>Notifications</DropdownMenuLabel>
//                   <DropdownMenuSeparator />
//                   {notifications.map((n) => (
//                     <DropdownMenuItem
//                       key={n.title}
//                       className="flex-col items-start gap-1 py-2.5"
//                     >
//                       <span className="text-sm leading-snug">{n.title}</span>
//                       <span className="text-xs text-muted-foreground">
//                         {n.time}
//                       </span>
//                     </DropdownMenuItem>
//                   ))}
//                 </DropdownMenuContent>
//               </DropdownMenu>

//               <Button
//                 variant="ghost"
//                 size="icon"
//                 aria-label="Help"
//                 className="hidden sm:inline-flex"
//               >
//                 <HelpCircle />
//               </Button>

//               <DropdownMenu>
//                 <DropdownMenuTrigger asChild>
//                   <button
//                     className="grid size-8 place-items-center rounded-full bg-foreground text-[11px] font-medium text-background transition-opacity hover:opacity-90"
//                     aria-label="Open user menu"
//                   >
//                     {user?.name
//                       ? user.name
//                           .split(" ")
//                           .map((p) => p[0])
//                           .slice(0, 2)
//                           .join("")
//                           .toUpperCase()
//                       : "S"}
//                   </button>
//                 </DropdownMenuTrigger>

//                 <DropdownMenuContent align="end" className="w-60">
//                   <div className="border-b border-border px-3 py-2.5">
//                     <p className="truncate text-sm font-medium">
//                       {user?.name ?? "User"}
//                     </p>
//                     <p className="truncate text-xs text-muted-foreground">
//                       {user?.email ?? ""}
//                     </p>
//                     {user?.roles?.length ? (
//                       <p className="mt-1 inline-flex rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
//                         {user.roles
//                           .map((r) => r.replace(/_/g, " ").toLowerCase())
//                           .join(" · ")}
//                       </p>
//                     ) : null}
//                   </div>

//                   <DropdownMenuItem asChild>
//                     <Link to="/settings" className="cursor-pointer">
//                       <Settings className="size-4" />
//                       <span>Profile & settings</span>
//                     </Link>
//                   </DropdownMenuItem>

//                   {isOwner && (
//                     <DropdownMenuItem asChild>
//                       <Link to="/billing" className="cursor-pointer">
//                         <BadgeDollarSign className="size-4" />
//                         <span>Billing</span>
//                       </Link>
//                     </DropdownMenuItem>
//                   )}

//                   {isAdmin && (
//                     <DropdownMenuItem asChild>
//                       <Link to="/users" className="cursor-pointer">
//                         <UsersRound className="size-4" />
//                         <span>Users & access</span>
//                       </Link>
//                     </DropdownMenuItem>
//                   )}

//                   <DropdownMenuSeparator />

//                   <DropdownMenuItem asChild>
//                     <Link to="/" className="cursor-pointer">
//                       <Shapes className="size-4" />
//                       <span>Visit storefront</span>
//                     </Link>
//                   </DropdownMenuItem>

//                   <DropdownMenuItem asChild>
//                     <button
//                       onClick={logout}
//                       className="flex w-full cursor-pointer items-center gap-2 text-destructive focus:text-destructive"
//                     >
//                       <LogOut className="size-4" />
//                       <span>Sign out</span>
//                     </button>
//                   </DropdownMenuItem>
//                 </DropdownMenuContent>
//               </DropdownMenu>
//             </div>
//           </div>
//         </header>

//         <main
//           key={pathname}
//           className="page-enter mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10"
//         >
//           {children}
//         </main>
//       </div>
//     </div>
//   );
// }

