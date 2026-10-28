import { swalError } from "@/lib/swal";
// routes/messages.tsx
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Loader2, Send, MessageSquare, Search, MapPin, ArrowLeft,
  Plus, Users, Briefcase, X, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { chatApi, type Conversation, type DirectMessage, type PartyInfo } from "@/lib/chat";
import { getSocket } from "@/lib/websocket/client";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [
      { name: "robots", content: "noindex" },{ title: "Messages — StyleAI" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    c: typeof s["c"] === "string" ? s["c"] : undefined,
  }),
  component: MessagesPage,
});


// Helpers


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

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function groupByDay(messages: DirectMessage[]) {
  const groups: { date: string; items: DirectMessage[] }[] = [];
  for (const m of messages) {
    const day = new Date(m.createdAt).toDateString();
    const last = groups[groups.length - 1];
    if (last && last.date === day) {
      last.items.push(m);
    } else {
      groups.push({ date: day, items: [m] });
    }
  }
  return groups;
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


// Main Page


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

  async function loadConversations(initial = false, overrideId?: string) {
    if (initial) setLoading(true);
    const currentId = overrideId ?? activeId;
    try {
      const r = await chatApi.listConversations(100);
      setConversations(r.conversations || []);

      if (currentId) {
        const fresh = r.conversations.find((c) => c.id === currentId);
        if (fresh) setActiveConversation(fresh);
      } else if (r.conversations.length > 0) {
        // On desktop, auto-select first. On mobile, leave unselected.
        const isMobile =
          typeof window !== "undefined" && window.innerWidth < 768;
        if (!isMobile) {
          setActiveId(r.conversations[0].id);
          setActiveConversation(r.conversations[0]);
        }
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
        // read receipt
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
  const groupedMessages = groupByDay(messages);
  const showChatPanel = !!(activeConversation && activeOther);

  return (
    <ProtectedRoute>
      <div className="ui-page-full">
        {/*    COMPACT HEADER    */}
        <div className="flex items-center justify-between gap-3 pb-3">
          <div className="flex items-baseline gap-2 sm:gap-3 min-w-0">
            <h1 className="font-display text-xl font-medium leading-none sm:text-2xl">
              Messages
            </h1>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={manualRefresh}
              disabled={refreshing}
              title="Refresh"
            >
              <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
            </Button>
            <Button size="sm" onClick={() => setShowNewChat(true)}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">New chat</span>
            </Button>
          </div>
        </div>

        {error && (
          <div className="ui-error mt-1 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="ml-3 text-xs underline">
              dismiss
            </button>
          </div>
        )}

        {/*    CHAT SHELL (responsive: stack on mobile)    */}
        <div className="resp-split mt-1 min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
          {/* LEFT: Conversation list */}
          <div
            className={cn(
              "resp-chat-list border-b border-border md:border-b-0 md:border-r",
              showChatPanel && "is-hidden-mobile"
            )}
          >
            {/* Search */}
            <div className="border-b border-border p-3">
              <div className="flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-2 text-sm focus-within:border-accent/50 focus-within:bg-background transition-colors">
                <Search className="size-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search conversations…"
                  className="w-full bg-transparent outline-none placeholder:text-muted-foreground/60"
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* List — scrollable */}
            <div className="hover-scroll flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted/40">
                    <MessageSquare className="size-5 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-sm font-medium">
                    {q ? "No matches" : "No conversations yet"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {q ? "Try a different search" : "Start chatting with brands, agencies, or creators."}
                  </p>
                  {!q && (
                    <Button size="sm" className="mt-4" onClick={() => setShowNewChat(true)}>
                      <Plus className="size-3.5" /> Start a chat
                    </Button>
                  )}
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
                        "group relative flex w-full items-center gap-3 border-b border-border/60 px-3 py-3 text-left transition-colors",
                        "hover:bg-accent/[0.04]",
                        isActive && "bg-accent/[0.08]"
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />
                      )}

                      <div className="relative shrink-0">
                        {img ? (
                          <img
                            src={img}
                            alt=""
                            className="size-11 rounded-full object-cover ring-2 ring-background"
                          />
                        ) : (
                          <div className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-accent/25 to-accent/10 text-sm font-semibold text-accent ring-2 ring-background">
                            {initials(displayName) || "?"}
                          </div>
                        )}
                        {unread > 0 && (
                          <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground ring-2 ring-background">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={cn(
                              "truncate text-sm",
                              unread > 0 ? "font-semibold" : "font-medium"
                            )}
                          >
                            {displayName}
                          </p>
                          {other.isAgency && (
                            <span className="shrink-0 rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-purple-500">
                              Agency
                            </span>
                          )}
                        </div>
                        <p
                          className={cn(
                            "mt-0.5 truncate text-xs",
                            unread > 0
                              ? "text-foreground/80"
                              : "text-muted-foreground"
                          )}
                        >
                          {c.lastMessageBody || "No messages yet"}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Chat panel */}
          <div
            className={cn(
              "resp-chat-panel",
              showChatPanel && "is-visible-mobile"
            )}
          >
            {!showChatPanel ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <div className="grid size-16 place-items-center rounded-full bg-muted/40">
                  <MessageSquare className="size-7 text-muted-foreground" />
                </div>
                <p className="mt-4 font-display text-lg font-medium">
                  No conversation selected
                </p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Choose a chat from the list or start a new one.
                </p>
                <Button className="mt-5" onClick={() => setShowNewChat(true)}>
                  <Plus className="size-4" /> New chat
                </Button>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 border-b border-border px-3 py-2.5 sm:px-4 sm:py-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setActiveId(null);
                      setActiveConversation(null);
                    }}
                    title="Back"
                    className="md:hidden -ml-1"
                  >
                    <ArrowLeft className="size-4" />
                  </Button>

                  <div className="relative shrink-0">
                    {activeOther!.avatarUrl || activeOther!.logoUrl ? (
                      <img
                        src={activeOther!.avatarUrl || activeOther!.logoUrl || ""}
                        alt=""
                        className="size-9 rounded-full object-cover sm:size-10"
                      />
                    ) : (
                      <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-accent/25 to-accent/10 text-xs font-semibold text-accent sm:size-10">
                        {initials(partyDisplayName(activeOther)) || "?"}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {partyDisplayName(activeOther)}
                      </p>
                      {activeOther!.isAgency && (
                        <span className="rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-purple-500">
                          Agency
                        </span>
                      )}
                    </div>
                    {activeOther!.city ? (
                      <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="size-3" /> {activeOther!.city}
                        {activeOther!.country ? `, ${activeOther!.country}` : ""}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">Direct message</p>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="hover-scroll flex-1 space-y-4 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
                  {msgLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <div className="grid size-14 place-items-center rounded-full bg-muted/40">
                        <MessageSquare className="size-6 text-muted-foreground" />
                      </div>
                      <p className="mt-4 text-sm font-medium">Say hi 👋</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        No messages yet in this conversation.
                      </p>
                    </div>
                  ) : (
                    groupedMessages.map((group, gi) => (
                      <div key={gi} className="space-y-3">
                        <div className="flex items-center gap-3 py-1">
                          <span className="h-px flex-1 bg-border" />
                          <span className="rounded-full bg-muted/60 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            {formatDateSeparator(group.items[0].createdAt)}
                          </span>
                          <span className="h-px flex-1 bg-border" />
                        </div>

                        {group.items.map((m) => (
                          <Bubble
                            key={m.id}
                            m={m}
                            showAvatar={!m.isMine}
                            otherAvatar={activeOther!.avatarUrl || activeOther!.logoUrl}
                            otherName={partyDisplayName(activeOther)}
                          />
                        ))}
                      </div>
                    ))
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Composer */}
                <div className="resp-safe-bottom border-t border-border p-2 sm:p-3">
                  <div className="flex items-end gap-2 rounded-2xl border border-border bg-background/60 p-1.5 focus-within:border-accent/50 focus-within:bg-background transition-colors">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={onKeyDown}
                      placeholder="Type a message…"
                      rows={1}
                      maxLength={2000}
                      disabled={sending}
                      className="max-h-32 flex-1 resize-none bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground/60"
                      style={{ minHeight: "2.25rem" }}
                    />
                    <Button
                      onClick={send}
                      disabled={sending || !input.trim()}
                      size="icon"
                      className="shrink-0 rounded-xl"
                      aria-label="Send message"
                    >
                      {sending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                    </Button>
                  </div>
                  <p className="mt-1.5 hidden px-2 text-[10px] text-muted-foreground/70 sm:block">
                    Press{" "}
                    <kbd className="rounded border border-border bg-muted/50 px-1 py-0.5 font-mono text-[9px]">
                      Enter
                    </kbd>{" "}
                    to send ·{" "}
                    <kbd className="rounded border border-border bg-muted/50 px-1 py-0.5 font-mono text-[9px]">
                      Shift + Enter
                    </kbd>{" "}
                    for new line
                  </p>
                </div>
              </>
            )}
          </div>
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
            loadConversations(false, convId);
          }}
        />
      )}
    </ProtectedRoute>
  );
}


// New Chat Modal


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
    <div className="ui-overlay !z-[100]">
      <div className="ui-panel ui-panel-md !my-8">
        <div className="ui-panel-header">
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
          <div className="flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-2 text-sm focus-within:border-accent/50">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, username, or category…"
              className="w-full bg-transparent outline-none placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        <div className="hover-scroll max-h-[55vh] overflow-y-auto">
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
                className="flex w-full items-center gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors hover:bg-accent/[0.04] disabled:opacity-50"
              >
                {p.avatarUrl ? (
                  <img
                    src={p.avatarUrl}
                    alt=""
                    className="size-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-accent/25 to-accent/10 text-xs font-semibold text-accent">
                    {initials(p.displayName) || "?"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{p.displayName}</p>
                    {p.type === "ORG" && (
                      <span className="shrink-0 rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-purple-500">
                        Agency
                      </span>
                    )}
                  </div>
                  {p.handle && (
                    <p className="truncate text-xs text-muted-foreground">
                      {p.handle}
                    </p>
                  )}
                  {p.subtitle && (
                    <p className="truncate text-[10px] text-muted-foreground">
                      {p.subtitle}
                    </p>
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

        <div className="ui-panel-footer">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}


// Message Bubble


function Bubble({
  m,
  showAvatar = false,
  otherAvatar,
  otherName,
}: {
  m: DirectMessage;
  showAvatar?: boolean;
  otherAvatar?: string | null;
  otherName?: string;
}) {
  const roleLabel: Record<string, string> = {
    BRAND: "Brand",
    AGENCY: "Agency",
    INFLUENCER: "Creator",
    ADMIN: "Admin",
  };

  const time = new Date(m.createdAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={cn("flex gap-2", m.isMine ? "justify-end" : "justify-start")}>
      {!m.isMine && showAvatar && (
        <div className="shrink-0 pt-1">
          {otherAvatar ? (
            <img
              src={otherAvatar}
              alt=""
              className="size-7 rounded-full object-cover"
            />
          ) : (
            <div className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-accent/25 to-accent/10 text-[10px] font-semibold text-accent">
              {initials(otherName || "") || "?"}
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-0.5 sm:max-w-[75%]",
          m.isMine ? "items-end" : "items-start"
        )}
      >
        {!m.isMine && m.senderRole && (
          <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {roleLabel[m.senderRole] || m.senderRole}
          </p>
        )}
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
            m.isMine
              ? "bg-accent text-accent-foreground rounded-br-md"
              : "bg-muted text-foreground rounded-bl-md"
          )}
        >
          <p className="whitespace-pre-wrap break-words">{m.body}</p>
        </div>
        <p className="px-1 text-[10px] text-muted-foreground/70">{time}</p>
      </div>
    </div>
  );
}