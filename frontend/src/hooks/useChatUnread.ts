// hooks/useChatUnread.ts
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/websocket/client";
import { chatApi } from "@/lib/chat";
import { http } from "@/lib/api";
import { useRole } from "@/lib/role";

export function useChatUnread() {
  const { user } = useRole();
  const userId = user?.id;
  const [total, setTotal] = useState(0);
  const fetchedRef = useRef(false);

  async function refetch() {
    try {
      const convs = await chatApi.listConversations(100);
      const direct = (convs.conversations || []).reduce((sum, c) => {
        if (c.mySide === "A") return sum + (c.unreadForA || 0);
        if (c.mySide === "B") return sum + (c.unreadForB || 0);
        return sum;
      }, 0);

      let campaign = 0;
      try {
        const r = await http.get<{ unread: number }>(
          "/api/campaigns/unread-total"
        );
        campaign = r.unread || 0;
      } catch {}

      setTotal(direct + campaign);
    } catch {}
  }

  useEffect(() => {
    if (userId) return;
    fetchedRef.current = false;
    setTotal(0);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    refetch();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    let off: (() => void) | null = null;
    let intervalId: any = null;

    const onNew = (payload: any) => {
      if (!payload?.message) return;
      setTotal((n) => n + 1);
    };

    const onRead = () => {
      refetch();
    };

    const trySubscribe = (): boolean => {
      const socket = getSocket();
      if (!socket) return false;
      socket.on("chat:new", onNew);
      socket.on("read:direct", onRead);
      socket.on("read:campaign", onRead);
      off = () => {
        socket.off("chat:new", onNew);
        socket.off("read:direct", onRead);
        socket.off("read:campaign", onRead);
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
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const handler = () => refetch();
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, [userId]);

  return total;
}