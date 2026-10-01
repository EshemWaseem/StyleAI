// components/notifications/NotificationBell.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  notificationsApi,
  notificationsSSE,
  type Notification,
} from "@/lib/notifications";

export function NotificationBell() {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  // Initial snapshot (once)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list, count] = await Promise.all([
          notificationsApi.list({ limit: 8 }),
          notificationsApi.unreadCount(),
        ]);
        if (cancelled) return;
        setNotifs(list.notifications);
        setUnread(count.unread);
      } catch {
        // silent — bell isn't critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Live updates via SSE — no polling
  useEffect(() => {
    const offNotif = notificationsSSE.onNotification((n) => {
      setNotifs((prev) => {
        // Avoid dup if we already have it
        if (prev.some((x) => x.id === n.id)) return prev;
        return [n, ...prev].slice(0, 8);
      });
    });
    const offUnread = notificationsSSE.onUnread((u) => setUnread(u));
    return () => {
      offNotif();
      offUnread();
    };
  }, []);

  async function openNotif(n: Notification) {
    if (!n.read) {
      try {
        await notificationsApi.markRead(n.id);
        setNotifs((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
        );
        setUnread((u) => Math.max(0, u - 1));
      } catch {}
    }
    if (n.link) navigate({ to: n.link as any });
  }

  async function markAllRead() {
    try {
      await notificationsApi.markAllRead();
      setNotifs((prev) => prev.map((x) => ({ ...x, read: true })));
      setUnread(0);
    } catch {}
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
          title="Notifications"
        >
          <Bell />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 grid min-w-[16px] place-items-center rounded-full bg-accent px-1 text-[9px] font-semibold leading-4 text-accent-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:underline"
            >
              <Check className="size-3" /> Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : notifs.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No notifications yet
          </p>
        ) : (
          notifs.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex-col items-start gap-1 py-2.5 cursor-pointer"
              onSelect={() => openNotif(n)}
            >
              <div className="flex w-full items-start gap-2">
                {!n.read && (
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-accent" />
                )}
                <div className={`min-w-0 flex-1 ${n.read ? "pl-3.5" : ""}`}>
                  <p
                    className={`text-sm leading-snug ${
                      n.read ? "text-muted-foreground" : "font-medium"
                    }`}
                  >
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {n.body}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer justify-center text-xs">
          <Link to="/notifications">View all</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}