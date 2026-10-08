// components/campaigns/ChatTab.tsx
import { useEffect, useRef, useState } from "react";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { campaignsApi, type ChatMessage } from "@/lib/campaigns";
import { getSocket } from "@/lib/websocket/client";
import { useRole } from "@/lib/role";

interface Props {
  campaignId: string;
  currentUserId: string;
}

export function ChatTab({ campaignId, currentUserId }: Props) {
  const { user } = useRole();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [wsConnected, setWsConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior }), 50);
  };

  async function load(initial = false) {
    try {
      const r = await campaignsApi.listMessages(campaignId, { limit: 200 });
      setMessages(r.messages);
      if (initial) scrollToBottom("auto");
    } catch (e: any) {
      setError(e?.message || "Failed to load messages");
    } finally {
      if (initial) setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
    campaignsApi.markChatRead(campaignId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  // ---- WebSocket: JOIN room + listen for events (with retry) ----
  useEffect(() => {
    let off: (() => void) | null = null;
    let intervalId: any = null;
    let joined = false;

    const onNew = (payload: any) => {
      if (payload?.kind !== "campaign" || payload?.campaignId !== campaignId) return;
      const m = payload.message as ChatMessage;
      setMessages((prev) => {
        if (prev.some((x) => x.id === m.id)) return prev;
        scrollToBottom();
        return [...prev, m];
      });
      campaignsApi.markChatRead(campaignId).catch(() => {});
    };

    const trySubscribe = (): boolean => {
      const socket = getSocket();
      if (!socket) return false;

      // 1) Attach listener
      socket.on("chat:new", onNew);
      setWsConnected(socket.connected);

      // 2) Join campaign room
      if (!joined) {
        joined = true;
        socket.emit("campaign:join", { campaignId }, (ack: any) => {
          if (!ack?.ok) {
            console.warn("[chat] join failed:", ack?.error);
          }
        });
      }

      // 3) Track connect/disconnect for UI
      const onConnect = () => {
        setWsConnected(true);
        // Re-join on reconnect
        socket.emit("campaign:join", { campaignId }, () => {});
      };
      const onDisconnect = () => setWsConnected(false);
      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);

      off = () => {
        socket.off("chat:new", onNew);
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        // Leave campaign room on unmount
        socket.emit("campaign:leave", { campaignId });
      };
      return true;
    };

    if (!trySubscribe()) {
      intervalId = setInterval(() => {
        if (trySubscribe()) clearInterval(intervalId);
      }, 500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      off?.();
    };
  }, [campaignId]);

  // ---- Polling fallback — only when WS is disconnected ----
  useEffect(() => {
    if (wsConnected) return;

    const t = setInterval(() => {
      campaignsApi
        .listMessages(campaignId, { limit: 200 })
        .then((r) => {
          setMessages((prev) => {
            if (r.messages.length !== prev.length) scrollToBottom();
            return r.messages;
          });
        })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(t);
  }, [campaignId, wsConnected]);

  async function send() {
    const body = input.trim();
    if (!body) return;
    setSending(true);
    setError("");
    try {
      const r = await campaignsApi.sendMessage(campaignId, { body });
      setMessages((prev) => {
        if (prev.some((x) => x.id === r.chatMessage.id)) return prev;
        return [...prev, r.chatMessage];
      });
      setInput("");
      scrollToBottom();
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

  if (loading) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-lg border border-border bg-card">
        <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading chat…</span>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/20 px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`inline-block size-1.5 rounded-full ${wsConnected ? "bg-emerald-500" : "bg-amber-500"}`} />
          <span className="text-[10px] font-medium uppercase text-muted-foreground">
            {wsConnected ? "Live" : "Reconnecting…"}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {messages.length} message{messages.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <MessageSquare className="size-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No messages yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Start the conversation with the brand, agency, and creator.
            </p>
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} m={m} />)
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="border-t border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-end gap-2 border-t border-border p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          rows={2}
          maxLength={2000}
          className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
          disabled={sending}
        />
        <Button onClick={send} disabled={sending || !input.trim()}>
          {sending ? <Loader2 className="size-4 animate-spin" /> : <><Send className="size-4" /> Send</>}
        </Button>
      </div>
    </div>
  );
}

function MessageBubble({ m }: { m: ChatMessage }) {
  const roleStyles: Record<string, string> = {
    BRAND: "text-blue-500",
    AGENCY: "text-purple-500",
    INFLUENCER: "text-emerald-500",
    ADMIN: "text-amber-500",
  };
  const roleLabel: Record<string, string> = {
    BRAND: "Brand",
    AGENCY: "Agency",
    INFLUENCER: "Creator",
    ADMIN: "Admin",
  };

  return (
    <div className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] space-y-1 ${m.isMine ? "items-end" : "items-start"}`}>
        {!m.isMine && (
          <p className={`text-[10px] font-medium uppercase tracking-wide ${roleStyles[m.senderRole] || "text-muted-foreground"}`}>
            {roleLabel[m.senderRole] || m.senderRole}
          </p>
        )}
        <div className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${m.isMine ? "bg-accent text-accent-foreground" : "bg-muted text-foreground"}`}>
          <p className="whitespace-pre-wrap break-words">{m.body}</p>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {new Date(m.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}