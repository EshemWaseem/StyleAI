// routes/notifications.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Loader2, Trash2, Check, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  notificationsApi,
  notificationsSSE,
  type Notification,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — StyleAI" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const list = await notificationsApi.list({ limit: 100 });
      setNotifs(list.notifications);
      setUnread(list.unread);
    } catch (e: any) {
      setError(e?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Live updates
  useEffect(() => {
    const offNotif = notificationsSSE.onNotification((n) => {
      setNotifs((prev) => [n, ...prev]);
    });
    const offUnread = notificationsSSE.onUnread((u) => setUnread(u));
    return () => {
      offNotif();
      offUnread();
    };
  }, []);

  async function markOne(n: Notification) {
    if (n.read) return;
    try {
      await notificationsApi.markRead(n.id);
      setNotifs((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
      );
      setUnread((u) => Math.max(0, u - 1));
    } catch {}
  }

  async function markAll() {
    try {
      await notificationsApi.markAllRead();
      setNotifs((prev) => prev.map((x) => ({ ...x, read: true })));
      setUnread(0);
    } catch {}
  }

  async function removeOne(id: string) {
    try {
      await notificationsApi.remove(id);
      setNotifs((prev) => prev.filter((x) => x.id !== id));
    } catch {}
  }

  return (
    <ProtectedRoute>
      <AppShell breadcrumb={["Notifications"]}>
        <PageHeader
          eyebrow="Inbox"
          title="Notifications"
          description={`${unread} unread · ${notifs.length} total`}
          actions={
            unread > 0 ? (
              <Button variant="outline" onClick={markAll}>
                <Check className="mr-1.5 size-4" /> Mark all read
              </Button>
            ) : null
          }
        />

        {error && (
          <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-16 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading…</span>
          </div>
        ) : notifs.length === 0 ? (
          <Panel className="mt-8">
            <div className="flex flex-col items-center py-10 text-center">
              <Bell className="size-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                No notifications yet.
              </p>
            </div>
          </Panel>
        ) : (
          <Panel className="mt-8 overflow-hidden">
            <ul className="divide-y divide-border">
              {notifs.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "group flex items-start gap-3 px-4 py-3 transition",
                    !n.read && "bg-accent/5"
                  )}
                >
                  <div className="mt-0.5">
                    {!n.read ? (
                      <span className="block size-2 rounded-full bg-accent" />
                    ) : (
                      <span className="block size-2 rounded-full border border-border" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <button
                      className="block w-full text-left"
                      onClick={() => markOne(n)}
                    >
                      <p
                        className={cn(
                          "text-sm",
                          !n.read ? "font-medium" : "text-muted-foreground"
                        )}
                      >
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </button>

                    {n.link && (
                      <Link
                        to={n.link as any}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
                      >
                        Open <ArrowRight className="size-3" />
                      </Link>
                    )}
                  </div>

                  <button
                    onClick={() => removeOne(n.id)}
                    className="rounded p-1.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}