"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTenant } from "@/hooks/useTenant";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "agent" | "user";

type Message = {
  id: string;
  role: Role;
  text: string;
  ts: Date;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function msgId() {
  return Math.random().toString(36).slice(2);
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Reads a string key from tenant.settings safely. */
function strSetting(settings: Record<string, unknown>, key: string): string | undefined {
  const v = settings[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

// ─── Canned agent replies (round-robin) ──────────────────────────────────────

const REPLIES = [
  "Entendido! Vou verificar isso para você agora.",
  "Ótima pergunta. Deixa eu analisar os dados do seu pipeline.",
  "Certo! Já identifico {n} leads qualificados para esse critério.",
  "Posso te ajudar com isso. Qual é a prioridade agora — volume ou ticket médio?",
  "Perfeito. Registrei a solicitação e vou acompanhar o resultado.",
];

let replyIdx = 0;
function nextReply(n: number) {
  const r = REPLIES[replyIdx % REPLIES.length].replace("{n}", String(n));
  replyIdx++;
  return r;
}

// ─── AgentStatus ─────────────────────────────────────────────────────────────

type AgentStatusProps = {
  agentName: string;
  primaryColor: string;
  isProcessing: boolean;
};

function AgentStatus({ agentName, primaryColor, isProcessing }: AgentStatusProps) {
  const initials = agentName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex items-center gap-3">
      {/* Avatar */}
      <div
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
        style={{ backgroundColor: primaryColor }}
      >
        {initials}
        {/* Status dot */}
        <span
          className={`absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full border-2 border-white dark:border-gray-900 ${
            isProcessing ? "bg-amber-400" : "bg-emerald-400"
          }`}
        >
          {isProcessing && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          )}
        </span>
      </div>

      {/* Name + status label */}
      <div>
        <p className="text-sm font-semibold text-gray-800 dark:text-white/90 leading-tight">
          {agentName}
        </p>
        <p
          className={`text-xs font-medium leading-tight ${
            isProcessing
              ? "text-amber-500 dark:text-amber-400"
              : "text-emerald-500 dark:text-emerald-400"
          }`}
        >
          {isProcessing ? "Processando…" : "Online"}
        </p>
      </div>
    </div>
  );
}

// ─── TypingIndicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400">
        AI
      </div>
      <div className="rounded-2xl rounded-bl-none bg-gray-100 dark:bg-gray-800 px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-1.5 w-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ChatBubble ───────────────────────────────────────────────────────────────

type BubbleProps = {
  message: Message;
  agentInitials: string;
  primaryColor: string;
};

function ChatBubble({ message, agentInitials, primaryColor }: BubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end items-end gap-2">
        <div className="flex flex-col items-end gap-1 max-w-[75%]">
          <div
            className="rounded-2xl rounded-br-none px-4 py-3 text-sm text-white shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            {message.text}
          </div>
          <span className="text-[10px] text-gray-400 dark:text-gray-600 pr-1">
            {formatTime(message.ts)}
          </span>
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300">
          Eu
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300">
        {agentInitials}
      </div>
      <div className="flex flex-col gap-1 max-w-[75%]">
        <div className="rounded-2xl rounded-bl-none bg-gray-100 dark:bg-gray-800 px-4 py-3 text-sm text-gray-800 dark:text-white/90 shadow-sm">
          {message.text}
        </div>
        <span className="text-[10px] text-gray-400 dark:text-gray-600 pl-1">
          {formatTime(message.ts)}
        </span>
      </div>
    </div>
  );
}

// ─── ModuleLocked ─────────────────────────────────────────────────────────────

function ModuleLocked() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <svg className="size-8 text-gray-400 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path strokeLinecap="round" d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Módulo AI Agent não ativo
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
          Os módulos <strong>SDR</strong> ou <strong>IA Onboarding</strong> precisam estar ativos
          para usar o AI Agent.
        </p>
      </div>
      <Link
        href="/control/tenants"
        className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
      >
        Ativar módulo
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </Link>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] animate-pulse">
      <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 pb-4 mb-4">
        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-1.5">
          <div className="h-3.5 w-24 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-2.5 w-16 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
      <div className="flex-1 space-y-4 px-2">
        {[120, 80, 160].map((w) => (
          <div key={w} className="flex gap-2">
            <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
            <div className={`h-10 rounded-2xl bg-gray-200 dark:bg-gray-700`} style={{ width: `${w}px` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Chat ────────────────────────────────────────────────────────────────

type ChatProps = {
  agentName: string;
  primaryColor: string;
  tenantLeadCount: number;
};

function AIAgentChat({ agentName, primaryColor, tenantLeadCount }: ChatProps) {
  const agentInitials = agentName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const GREETING: Message = {
    id: "greeting",
    role: "agent",
    text: `Olá! Sou ${agentName}, sua assistente de SDR. Você tem ${tenantLeadCount} leads no pipeline. Como posso ajudar hoje?`,
    ts: new Date(),
  };

  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  function sendMessage() {
    const text = input.trim();
    if (!text || isProcessing) return;

    const userMsg: Message = { id: msgId(), role: "user", text, ts: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsProcessing(true);

    // Simulate agent processing (1.2–2s)
    const delay = 1200 + Math.random() * 800;
    setTimeout(() => {
      const agentMsg: Message = {
        id: msgId(),
        role: "agent",
        text: nextReply(tenantLeadCount),
        ts: new Date(),
      };
      setMessages((prev) => [...prev, agentMsg]);
      setIsProcessing(false);
      inputRef.current?.focus();
    }, delay);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-5 py-4">
        <AgentStatus
          agentName={agentName}
          primaryColor={primaryColor}
          isProcessing={isProcessing}
        />

        {/* Model tag */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs text-gray-500 dark:text-gray-400">
          <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
          </svg>
          YZI SDR Agent
        </span>
      </div>

      {/* ── Messages ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 scroll-smooth">
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            message={msg}
            agentInitials={agentInitials}
            primaryColor={primaryColor}
          />
        ))}

        {isProcessing && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ──────────────────────────────────────────────── */}
      <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/10 transition-all">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Pergunte algo para ${agentName}…`}
            disabled={isProcessing}
            autoFocus
            className="flex-1 bg-transparent text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none disabled:opacity-50"
          />

          <button
            onClick={sendMessage}
            disabled={!input.trim() || isProcessing}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white transition-all disabled:opacity-40"
            style={{ backgroundColor: input.trim() && !isProcessing ? primaryColor : undefined }}
            aria-label="Enviar"
          >
            {isProcessing ? (
              <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-gray-400 dark:text-gray-600">
          Enter para enviar · respostas simuladas — conecte a Evolution API para produção
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AIAgentPage() {
  const { tenant, loading } = useTenant();

  if (loading) return <LoadingSkeleton />;

  // Module gate: requires sdr OR ia_onboarding
  const hasModule =
    tenant?.activeModules.includes("sdr") ||
    tenant?.activeModules.includes("ia_onboarding");

  if (!hasModule) return <ModuleLocked />;

  // Derive agent identity from tenant settings
  const agentName = strSetting(tenant!.settings, "agent_name") ?? "Nina";
  const primaryColor = strSetting(tenant!.settings, "primary_color") ?? "#465FFF";

  // Mock lead count — replace with real query when backend is ready
  const tenantLeadCount = 42;

  return (
    <div className="space-y-5">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">AI Agent</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Converse com {agentName} para insights do seu pipeline
        </p>
      </div>

      <AIAgentChat
        agentName={agentName}
        primaryColor={primaryColor}
        tenantLeadCount={tenantLeadCount}
      />
    </div>
  );
}
