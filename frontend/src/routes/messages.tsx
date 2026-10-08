import { swalError } from "@/lib/swal";
// routes/messages.tsx
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Loader2, Send, MessageSquare, Search, MapPin, ArrowLeft,
  Plus, Users, Briefcase, X, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { chatApi, type Conversation, type DirectMessage, type PartyInfo } from "@/lib/chat";
import { getSocket } from "@/lib/websocket/client";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages — StyleAI" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    c: typeof s["c"] === "string" ? s["c"] : undefined,
  }),
  component: MessagesPage,
});

function otherParty(c: Conversation): PartyInfo {
  if (c.mySide === "A") return c.partyB;
  if (c.mySide === "B") return c.partyA;
  return c.partyB;
}

function myUnread(c: Conversation): number {
  if (c.mySide === "A") return c.unreadForA;
  if (c.mySide === "B") return c.unreadForB;
  return 0;
}

function partyDisplayName(p: PartyInfo | null | undefined): string {
  if (!p) return "Unknown";
  return p.displayName || p.name || "Unknown";
}

type PartyHit = {
  type: "INFLUENCER" | "ORG";
  id: string;
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
  subtitle: string | null;
  slug: string | null;
};

function MessagesPage() {
  const { user } = useRole();
  const search = useSearch({ from: Route.id });

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(search.c || null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior }), 50);
  };

  const [showNewChat, setShowNewChat] = useState(false);

  async function loadConversations(initial = false) {
    if (initial) setLoading(true);
    try {
      const r = await chatApi.listConversations(100);
      setConversations(r.conversations || []);

      if (activeId) {
        const fresh = r.conversations.find((c) => c.id === activeId);
        if (fresh) setActiveConversation(fresh);
      } else if (r.conversations.length > 0) {
        setActiveId(r.conversations[0].id);
        setActiveConversation(r.conversations[0]);
      }
    } catch (e: any) {
      if (initial) setError(e?.message || "Failed to load conversations");
    } finally {
      if (initial) setLoading(false);
    }
  }

  useEffect(() => {
    loadConversations(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }

    const fromList = conversations.find((c) => c.id === activeId);
    if (fromList) setActiveConversation(fromList);

    setMsgLoading(true);
    chatApi.listMessages(activeId, 300)
      .then((r) => {
        setMessages(r.messages);
        chatApi.markRead(activeId).catch(() => {});
        scrollToBottom("auto");
      })
      .catch((e: any) => {
        setError(e?.message || "Failed to load messages");
      })
      .finally(() => setMsgLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onNew = (payload: any) => {
      if (payload?.kind !== "direct") return;
      const convId = payload?.conversationId;
      const msg = payload?.message as DirectMessage | undefined;
      if (!convId || !msg) return;

      if (convId === activeId) {
        setMessages((prev) => {
          if (prev.some((x) => x.id === msg.id)) return prev;
          scrollToBottom();
          return [...prev, msg];
        });
        chatApi.markRead(convId).catch(() => {});
      }

      loadConversations();
    };

    const onRead = (payload: any) => {
      if (payload?.conversationId === activeId) {
        // read receipt — could update UI later
      }
    };

    socket.on("chat:new", onNew);
    socket.on("read:direct", onRead);
    return () => {
      socket.off("chat:new", onNew);
      socket.off("read:direct", onRead);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  async function send() {
    const body = input.trim();
    if (!body || !activeId) return;
    setSending(true);
    setError("");
    try {
      const r = await chatApi.sendMessage(activeId, { body });
      setMessages((prev) => {
        if (prev.some((x) => x.id === r.chatMessage.id)) return prev;
        return [...prev, r.chatMessage];
      });
      setInput("");
      scrollToBottom();
      loadConversations();
    } catch (e: any) {
      setError(e?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  async function manualRefresh() {
    setRefreshing(true);
    await loadConversations();
    if (activeId) {
      try {
        const r = await chatApi.listMessages(activeId, 300);
        setMessages(r.messages);
        scrollToBottom("auto");
      } catch { /* ignore */ }
    }
    setRefreshing(false);
  }

  const filtered = conversations.filter((c) => {
    if (!q.trim()) return true;
    const other = otherParty(c);
    return partyDisplayName(other).toLowerCase().includes(q.toLowerCase());
  });

  const activeOther = activeConversation ? otherParty(activeConversation) : null;

  return (
    <ProtectedRoute>
      <PageHeader
        eyebrow="Inbox"
        title="Messages"
        description="Direct chats between brands, agencies, and creators."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={manualRefresh}
              disabled={refreshing}
              title="Refresh"
            >
              <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
            </Button>
            <Button onClick={() => setShowNewChat(true)}>
              <Plus /> New chat
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
          <button onClick={() => setError("")} className="ml-3 text-xs underline">
            dismiss
          </button>
        </div>
      )}

      <div className="mt-6 grid h-[calc(100vh-260px)] min-h-[500px] grid-cols-1 overflow-hidden rounded-xl border border-border bg-card md:grid-cols-[320px_1fr]">
        <div className="flex flex-col border-b border-border md:border-b-0 md:border-r">
          <div className="border-b border-border p-3">
            <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search conversations…"
                className="w-full bg-transparent outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <MessageSquare className="mx-auto size-5 text-muted-foreground" />
                <p className="mt-2 text-xs text-muted-foreground">
                  No conversations yet.
                </p>
                <Button size="sm" className="mt-3" onClick={() => setShowNewChat(true)}>
                  <Plus className="size-3.5" /> Start a chat
                </Button>
              </div>
            ) : (
              filtered.map((c) => {
                const other = otherParty(c);
                const unread = myUnread(c);
                const displayName = partyDisplayName(other);
                const isActive = c.id === activeId;
                const img = other.logoUrl || other.avatarUrl || null;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setActiveId(c.id);
                      setActiveConversation(c);
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-border p-3 text-left transition-colors hover:bg-accent/5",
                      isActive && "bg-accent/10"
                    )}
                  >
                    <div className="shrink-0">
                      {img ? (
                        <img src={img} alt="" className="size-10 rounded-full object-cover" />
                      ) : (
                        <div className="grid size-10 place-items-center rounded-full bg-accent/15 text-xs font-medium text-accent">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{displayName}</p>
                        {unread > 0 && (
                          <span className="grid min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {c.lastMessageBody || "No messages yet"}
                      </p>
                      {other.city && (
                        <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <MapPin className="size-2.5" /> {other.city}
                          {other.country ? `, ${other.country}` : ""}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          {!activeConversation || !activeOther ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <MessageSquare className="size-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No conversation selected</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Click <strong>New chat</strong> to start one.
              </p>
              <Button className="mt-4" onClick={() => setShowNewChat(true)}>
                <Plus className="size-4" /> New chat
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <div className="md:hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setActiveId(null);
                      setActiveConversation(null);
                    }}
                    title="Back"
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {partyDisplayName(activeOther)}
                  </p>
                  {activeOther.city && (
                    <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="size-3" /> {activeOther.city}
                      {activeOther.country ? `, ${activeOther.country}` : ""}
                    </p>
                  )}
                  {activeOther.isAgency && (
                    <p className="text-[11px] text-purple-500">Agency</p>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {msgLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <p className="text-sm text-muted-foreground">
                      No messages yet — say hi 👋
                    </p>
                  </div>
                ) : (
                  messages.map((m) => <Bubble key={m.id} m={m} />)
                )}
                <div ref={bottomRef} />
              </div>

              <div className="flex items-end gap-2 border-t border-border p-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
                  rows={2}
                  maxLength={2000}
                  disabled={sending}
                  className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
                />
                <Button onClick={send} disabled={sending || !input.trim()}>
                  {sending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="size-4" /> Send
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onOpen={async (convId) => {
            setShowNewChat(false);
            setActiveId(convId);
            try {
              const r = await chatApi.getConversation(convId);
              setActiveConversation(r.conversation);
            } catch {
              setActiveConversation(null);
            }
            loadConversations();
          }}
        />
      )}
    </ProtectedRoute>
  );
}

function NewChatModal({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen: (conversationId: string) => void;
}) {
  const [tab, setTab] = useState<"ALL" | "INFLUENCER" | "AGENCY">("ALL");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PartyHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const t = setTimeout(() => {
      chatApi
        .searchParties(q, tab)
        .then((r) => setResults(r.parties))
        .catch((e) => setError(e?.message || "Search failed"))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q, tab]);

  async function start(party: PartyHit) {
    setOpening(party.id);
    try {
      const r = await chatApi.openWith(party.type, party.id);
      onOpen(r.conversation.id);
    } catch (e: any) {
      swalError(e?.message || "Failed to start chat");
      setOpening(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-foreground/40 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-lift">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="font-display text-lg font-medium">New chat</h2>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="size-4" />
            </Button>
          </div>

          <div className="flex gap-1 border-b border-border px-3 pt-2">
            {([
              { key: "ALL", label: "All", icon: Users },
              { key: "INFLUENCER", label: "Creators", icon: Users },
              { key: "AGENCY", label: "Agencies", icon: Briefcase },
            ] as const).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-t-md px-3 py-2 text-xs font-medium transition-colors",
                  tab === t.key
                    ? "border-b-2 border-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <t.icon className="size-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          <div className="border-b border-border p-3">
            <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
              <Search className="size-4 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, username, or category…"
                className="w-full bg-transparent outline-none"
              />
            </div>
          </div>

          <div className="max-h-[55vh] overflow-y-auto">
            {error && (
              <p className="p-4 text-center text-xs text-destructive">{error}</p>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <p className="py-10 text-center text-xs text-muted-foreground">
                No matches found.
              </p>
            ) : (
              results.map((p) => (
                <button
                  key={`${p.type}-${p.id}`}
                  type="button"
                  disabled={opening === p.id}
                  onClick={() => start(p)}
                  className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent/5 disabled:opacity-50"
                >
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" className="size-10 rounded-full object-cover" />
                  ) : (
                    <div className="grid size-10 place-items-center rounded-full bg-accent/15 text-xs font-medium text-accent">
                      {p.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{p.displayName}</p>
                      {p.type === "ORG" && (
                        <span className="rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-purple-500">
                          Agency
                        </span>
                      )}
                    </div>
                    {p.handle && (
                      <p className="truncate text-xs text-muted-foreground">{p.handle}</p>
                    )}
                    {p.subtitle && (
                      <p className="truncate text-[10px] text-muted-foreground">{p.subtitle}</p>
                    )}
                  </div>
                  {opening === p.id ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <MessageSquare className="size-4 text-muted-foreground" />
                  )}
                </button>
              ))
            )}
          </div>

          <div className="border-t border-border px-5 py-3 text-right">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({ m }: { m: DirectMessage }) {
  const roleLabel: Record<string, string> = {
    BRAND: "Brand",
    AGENCY: "Agency",
    INFLUENCER: "Creator",
    ADMIN: "Admin",
  };
  const roleColor: Record<string, string> = {
    BRAND: "text-blue-500",
    AGENCY: "text-purple-500",
    INFLUENCER: "text-emerald-500",
    ADMIN: "text-amber-500",
  };

  return (
    <div className={cn("flex", m.isMine ? "justify-end" : "justify-start")}>
      <div className="max-w-[75%] space-y-1">
        {!m.isMine && (
          <p
            className={cn(
              "text-[10px] font-medium uppercase tracking-wide",
              roleColor[m.senderRole] || "text-muted-foreground"
            )}
          >
            {roleLabel[m.senderRole] || m.senderRole}
          </p>
        )}
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
            m.isMine
              ? "bg-accent text-accent-foreground"
              : "bg-muted text-foreground"
          )}
        >
          <p className="whitespace-pre-wrap break-words">{m.body}</p>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {new Date(m.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}