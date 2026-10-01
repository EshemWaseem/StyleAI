import { useEffect, useRef, useState } from "react";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { campaignsApi, type ChatMessage } from "@/lib/campaigns";

interface Props {
  campaignId: string;
  currentUserId: string;
}

export function ChatTab({ campaignId, currentUserId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function load(initial = false) {
    try {
      const r = await campaignsApi.listMessages(campaignId, { limit: 200 });
      setMessages(r.messages);
      if (initial) {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "instant" as any }), 50);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load messages");
    } finally {
      if (initial) setLoading(false);
    }
  }

  // Initial load + mark read
  useEffect(() => {
    load(true);
    campaignsApi.markChatRead(campaignId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  // Poll for new messages every 5s
  useEffect(() => {
    const t = setInterval(() => {
      campaignsApi.listMessages(campaignId, { limit: 200 })
        .then((r) => {
          setMessages((prev) => {
            if (r.messages.length !== prev.length) {
              // new message arrived → scroll
              setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            }
            return r.messages;
          });
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(t);
  }, [campaignId]);

  // Mark read when tab is open
  useEffect(() => {
    const t = setInterval(() => {
      campaignsApi.markChatRead(campaignId).catch(() => {});
    }, 15000);
    return () => clearInterval(t);
  }, [campaignId]);

  async function send() {
    const body = input.trim();
    if (!body) return;
    setSending(true);
    setError("");
    try {
      const r = await campaignsApi.sendMessage(campaignId, { body });
      setMessages((prev) => [...prev, r.chatMessage]);
      setInput("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
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
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
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

      {/* Error */}
      {error && (
        <div className="border-t border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Input */}
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
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Send className="size-4" /> Send
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ======================================================
// Message bubble
// ======================================================
function MessageBubble({ m }: { m: ChatMessage }) {
  const isMine = m.isMine;

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
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] space-y-1 ${isMine ? "items-end" : "items-start"}`}>
        {!isMine && (
          <p className={`text-[10px] font-medium uppercase tracking-wide ${roleStyles[m.senderRole] || "text-muted-foreground"}`}>
            {roleLabel[m.senderRole] || m.senderRole}
          </p>
        )}
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
            isMine
              ? "bg-accent text-accent-foreground"
              : "bg-muted text-foreground"
          }`}
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