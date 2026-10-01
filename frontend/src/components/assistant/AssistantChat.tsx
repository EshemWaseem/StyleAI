// components/assistant/AssistantChat.tsx
import { useEffect, useRef, useState } from "react";
import {
  Loader2, Sparkles, X, Send, BookOpen, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { assistantApi, type AssistantMessage, type Conversation } from "@/lib/assistant";
import { AssistantConversationList } from "./AssistantConversationList";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
  suggestions?: string[];
  placeholder?: string;
}

export function AssistantChat({
  onClose,
  suggestions = [],
  placeholder = "Ask StyleAI anything…",
}: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);

  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [sources, setSources] = useState<{ source: string; similarity: number }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load conversation list once
  async function loadConversations() {
    try {
      const r = await assistantApi.listConversations();
      setConversations(r.conversations || []);
    } catch {
      setConversations([]);
    } finally {
      setConvLoading(false);
    }
  }

  useEffect(() => { loadConversations(); }, []);

  useEffect(() => {
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "instant" as any }),
      50
    );
  }, [messages]);

  // ---- Send message ----
  async function send(textArg?: string) {
    const text = (textArg ?? input).trim();
    if (!text || sending) return;

    setError("");
    setInput("");

    const tempUserMsg: AssistantMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setSending(true);
    setElapsed(0);
    setSources([]);

    const t0 = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.round((Date.now() - t0) / 1000)),
      1000
    );

    try {
      const res = await assistantApi.chat(text, conversationId);
      setConversationId(res.conversationId);
      setSources(res.sources || []);
      setMessages((prev) => [
        ...prev,
        {
          id: `assist-${Date.now()}`,
          role: "assistant",
          content: res.reply,
          createdAt: new Date().toISOString(),
        },
      ]);
      // refresh conversation list to show new title/time
      loadConversations();
    } catch (e: any) {
      setError(e?.message || "AI request failed");
    } finally {
      clearInterval(timer);
      setSending(false);
    }
  }

  // ---- Resume past conversation ----
  async function resume(id: string) {
    setError("");
    setSources([]);
    setConversationId(id);
    setShowSidebar(false);
    try {
      const r = await assistantApi.getConversation(id);
      setMessages(r.messages || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load conversation");
    }
  }

  // ---- New chat ----
  function newChat() {
    setConversationId(undefined);
    setMessages([]);
    setSources([]);
    setError("");
    setShowSidebar(false);
  }

  // ---- Delete ----
  async function deleteConv(id: string) {
    try {
      await assistantApi.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) newChat();
    } catch (e: any) {
      alert(e?.message || "Failed to delete");
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/30 p-4 pt-12 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lift">
        {/* ============ Header ============ */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent" />
            <p className="text-sm font-medium">Ask StyleAI</p>
            {conversationId && (
              <span className="text-[10px] text-muted-foreground">· memory active</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar((s) => !s)}
              title="History"
              className="md:hidden"
            >
              <BookOpen className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={newChat}
              title="New chat"
            >
              <Plus className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close"
            >
              <X />
            </Button>
          </div>
        </div>

        {/* ============ Body ============ */}
        <div className="flex min-h-0 flex-1">
          {/* Sidebar — always visible on desktop, toggle on mobile */}
          <div className={cn("hidden md:block", showSidebar && "block md:block")}>
            <AssistantConversationList
              conversations={conversations}
              loading={convLoading}
              activeId={conversationId}
              onSelect={resume}
              onDelete={deleteConv}
              onNew={newChat}
            />
          </div>
          {showSidebar && (
            <div className="absolute inset-0 z-10 bg-card md:hidden">
              <AssistantConversationList
                conversations={conversations}
                loading={convLoading}
                activeId={conversationId}
                onSelect={resume}
                onDelete={deleteConv}
                onNew={newChat}
              />
            </div>
          )}

          {/* Main chat */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="py-10">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Sparkles className="size-6 text-accent" />
                    <p className="text-sm font-medium">How can I help?</p>
                    <p className="text-xs text-muted-foreground">
                      I remember our conversation and your brand knowledge.
                    </p>
                  </div>
                  {suggestions.length > 0 && (
                    <div className="mx-auto mt-6 max-w-md">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Suggested for you
                      </p>
                      <ul className="space-y-1">
                        {suggestions.map((s) => (
                          <li key={s}>
                            <button
                              type="button"
                              onClick={() => send(s)}
                              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent/10"
                            >
                              {s}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "flex",
                        m.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                          m.role === "user"
                            ? "bg-accent text-accent-foreground"
                            : "bg-muted text-foreground"
                        )}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" />
                      Thinking… {elapsed}s
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Sources */}
            {sources.length > 0 && (
              <div className="border-t border-border bg-muted/20 px-4 py-2">
                <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <BookOpen className="size-3" /> Used from your knowledge base:
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {sources.map((s, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-card px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {s.source} · {Math.round(s.similarity * 100)}%
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="border-t border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            {/* Composer */}
            <div className="flex items-end gap-2 border-t border-border p-3">
              <textarea
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                rows={2}
                maxLength={2000}
                disabled={sending}
                className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
              />
              <Button onClick={() => send()} disabled={sending || !input.trim()}>
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}