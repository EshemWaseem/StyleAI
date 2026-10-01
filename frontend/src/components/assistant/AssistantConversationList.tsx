// components/assistant/AssistantConversationList.tsx
import { Loader2, MessageSquare, Plus, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Conversation } from "@/lib/assistant";
import { cn } from "@/lib/utils";

interface Props {
  conversations: Conversation[];
  loading: boolean;
  activeId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export function AssistantConversationList({
  conversations,
  loading,
  activeId,
  onSelect,
  onDelete,
  onNew,
}: Props) {
  return (
    <div className="flex h-full w-60 shrink-0 flex-col border-r border-border">
      <div className="border-b border-border p-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onNew}
          className="w-full justify-start gap-2"
        >
          <Plus className="size-3.5" />
          New chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <MessageSquare className="mx-auto size-5 text-muted-foreground" />
            <p className="mt-2 text-[11px] text-muted-foreground">
              No past conversations yet.
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5 p-1.5">
            {conversations.map((c) => {
              const isActive = c.id === activeId;
              return (
                <li key={c.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className={cn(
                      "w-full rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent/10",
                      isActive && "bg-accent/15"
                    )}
                  >
                    <p className="truncate pr-6 text-xs font-medium">
                      {c.title || "Untitled chat"}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Clock className="size-2.5" />
                      <span>
                        {formatRelativeTime(c.lastMessageAt || c.createdAt)}
                      </span>
                      <span>·</span>
                      <span>
                        {c.messageCount} msg{c.messageCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this conversation?")) onDelete(c.id);
                    }}
                    className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-background/80 hover:text-destructive group-hover:opacity-100"
                    title="Delete"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}