// components/app-shell/sidebar-nav.tsx
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useRole, type RoleName } from "@/lib/role";
import { useChatUnread } from "@/hooks/useChatUnread";
import { influencersApi } from "@/lib/influencers";
import { resolveNav } from "./nav-configs";

export function SidebarNav({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const { user } = useRole();
  const userRoles = (user?.roles ?? []) as RoleName[];
  const chatUnread = useChatUnread();
  const [mySlug, setMySlug] = useState<string | undefined>(undefined);

  const isInfluencer = userRoles.includes("INFLUENCER");

  useEffect(() => {
    let isMounted = true;
    if (isInfluencer) {
      influencersApi
        .getMe()
        .then((res) => {
          if (isMounted) setMySlug(res.influencer?.slug);
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [isInfluencer]);

  const navToRender = resolveNav(userRoles, mySlug);

  return (
    <nav className="flex flex-col gap-6 px-3 py-5" aria-label="Main">
      {navToRender.map((group) => (
        <div key={group.group}>
          {!collapsed && (
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
              {group.group}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const showChatBadge = item.to === "/messages" && chatUnread > 0;
              return (
                <li key={`${group.group}-${item.to}`}>
                  <Link
                    to={item.to as any}
                    onClick={onNavigate}
                    title={item.label}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                      collapsed && "justify-center px-0"
                    )}
                    activeProps={{
                      className:
                        "bg-sidebar-accent font-medium text-foreground",
                    }}
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden="true" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {showChatBadge && (
                      <span
                        className={cn(
                          "ml-auto grid min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-4 text-accent-foreground",
                          collapsed && "absolute right-1 top-1 ml-0"
                        )}
                      >
                        {chatUnread > 99 ? "99+" : chatUnread}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}