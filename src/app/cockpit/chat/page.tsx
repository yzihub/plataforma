"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTenant } from "@/hooks/useTenant";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

type LeadRow = { id: string; name: string | null; phone: string | null };

type ConversationRaw = {
  id: string;
  tenant_id: string;
  lead_id: string | null;
  ai_paused: boolean;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  leads: LeadRow | LeadRow[] | null;
};

type Conversation = Omit<ConversationRaw, "leads"> & {
  leads?: LeadRow | null;
  unread_count?: number;
};

type Message = {
  id: string;
  conversation_id: string;
  tenant_id?: string;
  content: string;
  direction: "inbound" | "outbound" | string;
  sender_type: "lead" | "agent" | "human" | string;
  created_at: string;
  optimistic?: boolean;
};

type RealtimeStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error"
  | "timeout";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-orange-500",
];

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "?") return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(id: string): string {
  return AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length];
}

function formatRelative(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "agora";
  if (diffHours < 1) return `${diffMins}min`;
  if (diffDays === 0)
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  if (diffDays === 1) return "ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SCROLLBAR_THIN =
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600";

const REALTIME_STATUS_LABEL: Record<RealtimeStatus, string> = {
  connecting: "Conectando",
  connected: "Ao vivo",
  disconnected: "Reconectando",
  error: "Reconectando",
  timeout: "Reconectando",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { tenant, loading: tenantLoading } = useTenant();
  const supabase = useMemo(() => createSupabaseClient(), []);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [togglingPause, setTogglingPause] = useState(false);
  const [errorList, setErrorList] = useState<string | null>(null);
  const [errorMsgs, setErrorMsgs] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeStatus>("connecting");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null>(null);
  const messagesRequestRef = useRef(0);
  const realtimeRetryRef = useRef<number | null>(null);

  const sortConversations = useCallback((items: Conversation[]) => {
    return [...items].sort((a, b) => {
      const aTime = new Date(a.last_message_at ?? a.created_at).getTime();
      const bTime = new Date(b.last_message_at ?? b.created_at).getTime();
      return bTime - aTime;
    });
  }, []);

  const mergeMessages = useCallback((current: Message[], incoming: Message[]) => {
    const byId = new Map<string, Message>();

    for (const message of current) {
      byId.set(message.id, message);
    }

    for (const message of incoming) {
      if (!message.optimistic) {
        const incomingTime = new Date(message.created_at).getTime();

        for (const [id, existing] of byId) {
          const existingTime = new Date(existing.created_at).getTime();
          const isSameOptimisticMessage =
            existing.optimistic === true &&
            existing.conversation_id === message.conversation_id &&
            existing.content === message.content &&
            existing.sender_type === message.sender_type &&
            Number.isFinite(existingTime) &&
            Number.isFinite(incomingTime) &&
            Math.abs(existingTime - incomingTime) <= 5000;

          if (
            id !== message.id &&
            isSameOptimisticMessage
          ) {
            byId.delete(id);
          }
        }
      }

      byId.set(message.id, { ...byId.get(message.id), ...message });
    }

    const merged = [...byId.values()].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    console.debug("[Thread Sync] merge result:", {
      previous: current.length,
      incoming: incoming.length,
      merged: merged.length,
    });

    return merged;
  }, []);

  const mergeConversation = useCallback(
    (current: Conversation[], incoming: Partial<Conversation> & { id: string }) => {
      let found = false;
      const next = current.map((conversation) => {
        if (conversation.id !== incoming.id) return conversation;
        found = true;
        const currentTime = new Date(
          conversation.last_message_at ?? conversation.created_at
        ).getTime();
        const incomingTime = new Date(
          incoming.last_message_at ?? conversation.last_message_at ?? conversation.created_at
        ).getTime();
        const keepCurrentLastMessage =
          Number.isFinite(currentTime) &&
          Number.isFinite(incomingTime) &&
          incomingTime < currentTime;

        return {
          ...conversation,
          ...incoming,
          last_message: keepCurrentLastMessage
            ? conversation.last_message
            : incoming.last_message ?? conversation.last_message,
          last_message_at: keepCurrentLastMessage
            ? conversation.last_message_at
            : incoming.last_message_at ?? conversation.last_message_at,
          leads: incoming.leads === undefined ? conversation.leads : incoming.leads,
        };
      });

      if (!found) {
        next.push(incoming as Conversation);
      }

      return sortConversations(next);
    },
    [sortConversations]
  );

  const loadConversations = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) setLoadingList(true);
      setErrorList(null);

      try {
        const res = await fetch("/api/conversations", { cache: "no-store" });
        const json = await res.json();

        if (!res.ok) {
          const msg = json?.error ?? `HTTP ${res.status}`;
          console.error("[ChatInbox] conversations error:", msg, "| tenantId:", json?.tenantId);
          setErrorList(msg);
          return;
        }

        const convs: Conversation[] = sortConversations(json.data ?? []);
        console.log("[ChatInbox] conversations loaded:", convs.length, "| tenantId:", json.tenantId);
        setConversations((prev) => {
          let next = [...prev];

          for (const conversation of convs) {
            next = mergeConversation(next, {
              ...conversation,
              unread_count:
                conversation.id === selectedIdRef.current
                  ? 0
                  : prev.find((item) => item.id === conversation.id)
                      ?.unread_count ??
                    conversation.unread_count ??
                    0,
            });
          }

          return sortConversations(next);
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao carregar";
        console.error("[ChatInbox] fetch error:", msg);
        setErrorList(msg);
      } finally {
        if (!silent) setLoadingList(false);
      }
    },
    [mergeConversation, sortConversations]
  );

  // ── Load conversations list via API route (bypasses RLS) ─────────────────

  const loadMessages = useCallback(
    async (
      conversationId: string,
      {
        requestId,
        signal,
        silent = false,
      }: {
        requestId?: number;
        signal?: AbortSignal;
        silent?: boolean;
      } = {}
    ) => {
      if (!silent) {
        setLoadingMsgs(true);
        setErrorMsgs(null);
      }

      try {
        const res = await fetch(`/api/conversations/${conversationId}/messages`, {
          cache: "no-store",
          signal,
        });
        const json = await res.json();

        if (
          signal?.aborted ||
          selectedIdRef.current !== conversationId ||
          (requestId !== undefined && messagesRequestRef.current !== requestId)
        ) {
          return;
        }

        if (!res.ok) {
          const msg = json?.error ?? `HTTP ${res.status}`;
          console.error("[ChatInbox] messages error:", msg);
          setErrorMsgs(msg);
          return;
        }

        const hydratedMessages = ((json.data ?? []) as Message[]).filter(
          (message) => message.conversation_id === conversationId
        );
        setMessages((prev) => mergeMessages(prev, hydratedMessages));
      } catch (err) {
        if (signal?.aborted) return;
        const msg = err instanceof Error ? err.message : "Erro ao carregar";
        console.error("[ChatInbox] fetch messages error:", msg);
        setErrorMsgs(msg);
      } finally {
        if (
          !signal?.aborted &&
          selectedIdRef.current === conversationId &&
          (requestId === undefined || messagesRequestRef.current === requestId)
        ) {
          setLoadingMsgs(false);
        }
      }
    },
    [mergeMessages]
  );

  const rehydrateRealtimeState = useCallback(async () => {
    await loadConversations({ silent: true });

    const activeConversationId = selectedIdRef.current;
    if (!activeConversationId) return;

    const requestId = messagesRequestRef.current + 1;
    messagesRequestRef.current = requestId;
    await loadMessages(activeConversationId, { requestId, silent: true });
  }, [loadConversations, loadMessages]);

  useEffect(() => {
    if (tenantLoading) return;
    void loadConversations();
  }, [loadConversations, tenantLoading]);

  // ── Load messages via API route (bypasses RLS) ───────────────────────────

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setLoadingMsgs(false);
      setErrorMsgs(null);
      return;
    }

    const requestId = messagesRequestRef.current + 1;
    messagesRequestRef.current = requestId;
    const controller = new AbortController();

    setLoadingMsgs(true);
    setErrorMsgs(null);

    void loadMessages(selectedId, {
      requestId,
      signal: controller.signal,
    });

    return () => {
      controller.abort();
    };
  }, [loadMessages, selectedId]);

  useEffect(() => {
    if (!tenant?.id || tenantLoading) return;

    const tenantId = tenant.id;
    let disposed = false;
    let channel: RealtimeChannel | null = null;
    let generation = 0;
    let retryAttempt = 0;

    const clearReconnect = () => {
      if (realtimeRetryRef.current) {
        window.clearTimeout(realtimeRetryRef.current);
        realtimeRetryRef.current = null;
      }
    };

    const removeActiveChannel = () => {
      const active = channel;
      channel = null;
      if (active) {
        void supabase.removeChannel(active).catch((err) => {
          console.error("[ChatRealtime] remove channel error:", err);
        });
      }
    };

    const scheduleReconnect = (reason: string) => {
      if (disposed) return;

      clearReconnect();

      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setRealtimeStatus("disconnected");
        return;
      }

      const delay = Math.min(1000 * 2 ** retryAttempt, 10000);
      retryAttempt += 1;
      console.warn(`[ChatRealtime] ${reason}; reconnecting in ${delay}ms`);

      realtimeRetryRef.current = window.setTimeout(() => {
        realtimeRetryRef.current = null;
        if (disposed) return;
        setupChannel();
      }, delay);
    };

    const handleConversationChange = (next: Conversation | null) => {
      if (!next?.id) return;

      setConversations((prev) => {
        return mergeConversation(prev, next);
      });

      if (
        next.id === selectedIdRef.current &&
        next.last_message &&
        next.last_message_at
      ) {
        const previewContent = next.last_message;
        const previewCreatedAt = next.last_message_at;

        setMessages((prev) => {
          const latestThreadTime = prev
            .filter((message) => message.conversation_id === next.id)
            .reduce(
              (latest, message) =>
                Math.max(latest, new Date(message.created_at).getTime()),
              0
            );
          const nextTime = new Date(previewCreatedAt).getTime();

          if (!Number.isFinite(nextTime) || nextTime <= latestThreadTime) {
            return prev;
          }

          return mergeMessages(prev, [
            {
              id: `conversation-preview:${next.id}:${previewCreatedAt}`,
              conversation_id: next.id,
            tenant_id: next.tenant_id,
            content: previewContent,
            direction: "inbound",
            sender_type: "lead",
            created_at: previewCreatedAt,
            optimistic: true,
          },
        ]);
      });
      }
    };

    const handleMessageInsert = (next: Message) => {
      if (!next?.id || !next.conversation_id) return;

      console.debug("[Thread Sync] incoming realtime:", {
        selectedId: selectedIdRef.current,
        messageId: next.id,
        conversationId: next.conversation_id,
        createdAt: next.created_at,
        senderType: next.sender_type,
      });

      setMessages((prev) => mergeMessages(prev, [next]));

      setConversations((prev) => {
        const known = prev.some(
          (conversation) => conversation.id === next.conversation_id
        );

        const isSelected = next.conversation_id === selectedIdRef.current;
        const shouldIncrementUnread =
          !isSelected &&
          (next.direction === "inbound" || next.sender_type === "lead");

        if (!known) {
          return mergeConversation(prev, {
            id: next.conversation_id,
            tenant_id: next.tenant_id ?? tenantId,
            lead_id: null,
            ai_paused: false,
            created_at: next.created_at,
            last_message: next.content,
            last_message_at: next.created_at,
            unread_count: isSelected ? 0 : shouldIncrementUnread ? 1 : 0,
          } as Conversation);
        }

        const current = prev.find(
          (conversation) => conversation.id === next.conversation_id
        );

        return mergeConversation(prev, {
          id: next.conversation_id,
          last_message: next.content,
          last_message_at: next.created_at,
          unread_count: isSelected
            ? 0
            : (current?.unread_count ?? 0) + (shouldIncrementUnread ? 1 : 0),
        });
      });
    };

    function setupChannel() {
      if (disposed) return;

      clearReconnect();
      removeActiveChannel();
      generation += 1;
      const channelGeneration = generation;

      setRealtimeStatus(
        typeof navigator !== "undefined" && navigator.onLine === false
          ? "disconnected"
          : "connecting"
      );

      channel = supabase
        .channel(`cockpit-chat:${tenantId}:${channelGeneration}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "conversations",
            filter: `tenant_id=eq.${tenantId}`,
          },
          (payload) => {
            if (disposed || channelGeneration !== generation) return;
            handleConversationChange(payload.new as Conversation | null);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "conversation_messages",
            filter: `tenant_id=eq.${tenantId}`,
          },
          (payload) => {
            if (disposed || channelGeneration !== generation) return;
            handleMessageInsert(payload.new as Message);
          }
        )
        .subscribe((status, err) => {
          if (disposed || channelGeneration !== generation) return;

          if (status === "SUBSCRIBED") {
            retryAttempt = 0;
            setRealtimeStatus("connected");
            void rehydrateRealtimeState();
            return;
          }

          if (status === "CHANNEL_ERROR") {
            setRealtimeStatus("error");
            console.error("[ChatRealtime] CHANNEL_ERROR:", err);
            scheduleReconnect("CHANNEL_ERROR");
            return;
          }

          if (status === "TIMED_OUT") {
            setRealtimeStatus("timeout");
            scheduleReconnect("TIMED_OUT");
            return;
          }

          if (status === "CLOSED") {
            setRealtimeStatus("disconnected");
            scheduleReconnect("CLOSED");
          }
        });
    }

    const handleOnline = () => {
      retryAttempt = 0;
      setupChannel();
      void rehydrateRealtimeState();
    };

    const handleOffline = () => {
      clearReconnect();
      setRealtimeStatus("disconnected");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setupChannel();

    return () => {
      disposed = true;
      clearReconnect();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      removeActiveChannel();
    };
  }, [
    loadConversations,
    mergeConversation,
    mergeMessages,
    rehydrateRealtimeState,
    supabase,
    tenant?.id,
    tenantLoading,
  ]);

  // ── Auto-scroll to bottom when messages change ────────────────────────────

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const shouldAutoScroll =
      container.scrollHeight -
        container.scrollTop -
        container.clientHeight <
      120;

    if (!shouldAutoScroll) return;

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedId]);

  // ── Computed selected conversation ────────────────────────────────────────

  const selectedConv = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const selectedMessages = useMemo(
    () =>
      selectedId
        ? messages.filter((message) => message.conversation_id === selectedId)
        : [],
    [messages, selectedId]
  );

  useEffect(() => {
    console.debug("[Thread Sync]", {
      selectedId,
      messagesCount: messages.length,
      selectedMessagesCount: selectedMessages.length,
    });
  }, [messages.length, selectedId, selectedMessages.length]);

  // ── Toggle ai_paused ─────────────────────────────────────────────────────

  const togglePause = useCallback(async () => {
    if (!selectedConv) return;
    setTogglingPause(true);

    const next = !selectedConv.ai_paused;

    try {
      const res = await fetch(`/api/conversations/${selectedConv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_paused: next }),
      });

      if (res.ok) {
        const json = await res.json().catch(() => null);
        const updated = json?.data as Conversation | undefined;
        setConversations((prev) =>
          updated
            ? mergeConversation(prev, updated)
            : prev.map((c) =>
                c.id === selectedConv.id ? { ...c, ai_paused: next } : c
              )
        );
      } else {
        const json = await res.json().catch(() => ({}));
        console.error("[ChatInbox] toggle pause error:", json?.error ?? res.status);
      }
    } catch (err) {
      console.error("[ChatInbox] toggle pause fetch error:", err);
    } finally {
      setTogglingPause(false);
    }
  }, [mergeConversation, selectedConv]);

  const selectConversation = useCallback(
    (conversationId: string) => {
      if (conversationId !== selectedIdRef.current) {
        selectedIdRef.current = conversationId;
        setErrorMsgs(null);
        setLoadingMsgs(true);
      }
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, unread_count: 0 }
            : conversation
        )
      );
      setSelectedId(conversationId);
    },
    []
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] gap-4">
      {/* Page header */}
      <div className="shrink-0">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white/90">
          Inbox / Chat da Ju
        </h1>
        <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              realtimeStatus === "connected"
                ? "bg-emerald-500"
                : realtimeStatus === "connecting"
                  ? "bg-amber-500"
                  : "bg-red-500"
            }`}
          />
          {REALTIME_STATUS_LABEL[realtimeStatus]}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Conversas conduzidas pela Ju via WhatsApp ·{" "}
          {loadingList ? "…" : `${conversations.length} conversa(s)`}
        </p>
      </div>

      {/* Two-panel body */}
      <div className="flex flex-1 min-h-0 gap-0 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
        {/* ── Left panel: conversation list ── */}
        <aside className="w-[280px] shrink-0 flex flex-col border-r border-gray-100 dark:border-gray-800 min-h-0">
          {/* Panel header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Conversas
            </p>
          </div>

          {/* Scrollable list */}
          <div className={`flex-1 overflow-y-auto ${SCROLLBAR_THIN}`}>
            {loadingList ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
              </div>
            ) : errorList ? (
              <div className="m-3 rounded-xl border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10 px-4 py-3">
                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                  Erro ao carregar conversas
                </p>
                <p className="text-[11px] text-red-500 dark:text-red-400/80 mt-1 break-all">
                  {errorList}
                </p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-4 select-none">
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Nenhuma conversa ainda
                </p>
                <p className="text-xs text-gray-300 dark:text-gray-600">
                  As conversas aparecerão aqui quando a Ju iniciar atendimentos.
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => selectConversation(conv.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-800/60 transition-colors flex gap-3 items-start ${
                    selectedId === conv.id
                      ? "bg-brand-500/5"
                      : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${avatarColor(conv.id)}`}
                  >
                    {getInitials(
                      conv.leads?.name ?? conv.leads?.phone ?? "?"
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-sm font-medium truncate ${
                          selectedId === conv.id
                            ? "text-brand-500"
                            : "text-gray-800 dark:text-white/90"
                        }`}
                      >
                        {conv.leads?.name ?? conv.leads?.phone ?? "Lead sem nome"}
                      </p>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {formatRelative(conv.last_message_at)}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {conv.leads?.phone ?? ""}
                    </p>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {conv.last_message ?? "—"}
                      </p>

                      {conv.unread_count ? (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {conv.unread_count > 9 ? "9+" : conv.unread_count}
                        </span>
                      ) : null}

                      {/* ai_paused badge */}
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                          conv.ai_paused
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            conv.ai_paused ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                        />
                        {conv.ai_paused ? "Pausada" : "Ju ativa"}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* ── Right panel: chat view ── */}
        <section className="flex-1 min-w-0 flex flex-col min-h-0">
          {!selectedConv ? (
            /* Empty state — no conversation selected */
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 select-none p-6">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg
                  className="size-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Selecione uma conversa
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[260px]">
                Clique em qualquer conversa à esquerda para ver as mensagens e
                gerenciar o atendimento da Ju.
              </p>
            </div>
          ) : (
            <>
              {/* Conversation header */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${avatarColor(selectedConv.id)}`}
                >
                  {getInitials(
                    selectedConv.leads?.name ??
                      selectedConv.leads?.phone ??
                      "?"
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">
                    {selectedConv.leads?.name ?? "Lead sem nome"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {selectedConv.leads?.phone ?? "—"}
                  </p>
                </div>

                {/* Toggle Ju pause button */}
                <button
                  type="button"
                  onClick={togglePause}
                  disabled={togglingPause}
                  title={
                    selectedConv.ai_paused ? "Retomar Ju" : "Pausar Ju"
                  }
                  className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                    selectedConv.ai_paused
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/15"
                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15"
                  }`}
                >
                  {togglingPause ? (
                    <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
                  ) : (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedConv.ai_paused
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                    />
                  )}
                  {selectedConv.ai_paused
                    ? "Ju pausada — Retomar"
                    : "Ju ativa — Pausar"}
                </button>
              </div>

              {/* Messages area */}
              <div
                key={selectedConv.id}
                ref={messagesContainerRef}
                className={`flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0 ${SCROLLBAR_THIN}`}
              >
                {loadingMsgs ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                  </div>
                ) : errorMsgs ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-sm text-red-500 dark:text-red-400">
                        Erro ao carregar mensagens
                      </p>
                      <p className="text-xs text-red-400 dark:text-red-500 mt-1 max-w-[300px] break-all">
                        {errorMsgs}
                      </p>
                    </div>
                  </div>
                ) : selectedMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-center select-none">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Nenhuma mensagem nesta conversa.
                    </p>
                  </div>
                ) : (
                  selectedMessages.map((m) => {
                    const isInbound =
                      m.direction === "inbound" || m.sender_type === "lead";
                    return (
                      <div
                        key={m.id}
                        className={`flex ${
                          isInbound ? "justify-start" : "justify-end"
                        }`}
                      >
                        <div
                          className={`max-w-[75%] px-4 py-2.5 text-sm shadow-sm rounded-xl ${
                            isInbound
                              ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-tl-sm"
                              : "bg-brand-500 text-white rounded-tr-sm"
                          }`}
                        >
                          <p className="leading-relaxed whitespace-pre-wrap break-words">
                            {m.content}
                          </p>
                          <p
                            className={`text-[10px] mt-1 ${
                              isInbound ? "text-gray-400" : "text-white/60"
                            }`}
                          >
                            {formatTime(m.created_at)}
                            {m.sender_type === "human" && !isInbound
                              ? " · humano"
                              : ""}
                            {m.sender_type === "agent" && !isInbound
                              ? " · Ju"
                              : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Disabled human reply input */}
              <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
                <textarea
                  rows={1}
                  disabled
                  placeholder="Envio humano em breve — em desenvolvimento"
                  className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400 placeholder-gray-400 outline-none cursor-not-allowed dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-500 dark:placeholder-gray-500"
                />
                <button
                  type="button"
                  disabled
                  title="Em breve"
                  className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white opacity-40 cursor-not-allowed"
                >
                  Enviar
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
