"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTenant } from "@/hooks/useTenant";

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
};

type Message = {
  id: string;
  conversation_id: string;
  content: string;
  direction: "inbound" | "outbound" | string;
  sender_type: "lead" | "agent" | "human" | string;
  created_at: string;
};

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { loading: tenantLoading } = useTenant();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [togglingPause, setTogglingPause] = useState(false);
  const [errorList, setErrorList] = useState<string | null>(null);
  const [errorMsgs, setErrorMsgs] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Load conversations list via API route (bypasses RLS) ─────────────────

  useEffect(() => {
    if (tenantLoading) return;

    const load = async () => {
      setLoadingList(true);
      setErrorList(null);

      try {
        const res = await fetch("/api/conversations");
        const json = await res.json();

        if (!res.ok) {
          const msg = json?.error ?? `HTTP ${res.status}`;
          console.error("[ChatInbox] conversations error:", msg, "| tenantId:", json?.tenantId);
          setErrorList(msg);
          setLoadingList(false);
          return;
        }

        const convs: Conversation[] = json.data ?? [];
        console.log("[ChatInbox] conversations loaded:", convs.length, "| tenantId:", json.tenantId);
        setConversations(convs);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao carregar";
        console.error("[ChatInbox] fetch error:", msg);
        setErrorList(msg);
      } finally {
        setLoadingList(false);
      }
    };

    load();
  }, [tenantLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load messages via API route (bypasses RLS) ───────────────────────────

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    const load = async () => {
      setLoadingMsgs(true);
      setErrorMsgs(null);

      try {
        const res = await fetch(`/api/conversations/${selectedId}/messages`);
        const json = await res.json();

        if (!res.ok) {
          const msg = json?.error ?? `HTTP ${res.status}`;
          console.error("[ChatInbox] messages error:", msg);
          setErrorMsgs(msg);
          setMessages([]);
          return;
        }

        setMessages((json.data ?? []) as Message[]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao carregar";
        console.error("[ChatInbox] fetch messages error:", msg);
        setErrorMsgs(msg);
        setMessages([]);
      } finally {
        setLoadingMsgs(false);
      }
    };

    load();
  }, [selectedId]);

  // ── Auto-scroll to bottom when messages change ────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Computed selected conversation ────────────────────────────────────────

  const selectedConv = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

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
        setConversations((prev) =>
          prev.map((c) =>
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
  }, [selectedConv]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] gap-4">
      {/* Page header */}
      <div className="shrink-0">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white/90">
          Inbox / Chat da Ju
        </h1>
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
                  onClick={() => setSelectedId(conv.id)}
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
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-center select-none">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Nenhuma mensagem nesta conversa.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
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
