"use client";

import { useState, useEffect } from "react";
import {
  BoltIcon,
  CheckCircleIcon,
  AlertIcon,
  TimeIcon,
  CloseLineIcon,
} from "@/icons";
import type { EvolutionStatusValue } from "@/lib/evolution/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusResponse = {
  ok: boolean;
  configured: boolean;
  status: EvolutionStatusValue;
  phone_number?: string | null;
  last_seen_at?: string | null;
  message?: string;
};

type QrResponse = {
  ok: boolean;
  configured: boolean;
  status: EvolutionStatusValue;
  qr: string | null;
  expires_in_seconds?: number;
};

type DisconnectResponse = {
  ok: boolean;
  configured: boolean;
  status: EvolutionStatusValue;
};

type TestSendResponse = {
  ok: boolean;
  configured: boolean;
  status: EvolutionStatusValue;
  sent: boolean;
  message_id?: string | null;
};

type LoadingState = {
  status: boolean;
  qr: boolean;
  disconnect: boolean;
  test: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  // Mask middle digits: +55 85 ****-9999
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return phone;
  const last4 = digits.slice(-4);
  const countryAndArea = digits.slice(0, Math.max(0, digits.length - 8));
  return `+${countryAndArea} ****-${last4}`;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

// ─── Status badge ─────────────────────────────────────────────────────────────

type StatusBadgeProps = { status: EvolutionStatusValue | null };

function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<
    EvolutionStatusValue,
    { label: string; classes: string }
  > = {
    conectado: {
      label: "Conectado",
      classes: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    },
    desconectado: {
      label: "Desconectado",
      classes: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    },
    aguardando_qr: {
      label: "Aguardando QR",
      classes: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    },
    erro: {
      label: "Erro",
      classes: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    },
    pendente_configuracao: {
      label: "Pendente configuração",
      classes: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
    },
  };

  const current = status ? config[status] : config.pendente_configuracao;

  return (
    <span
      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${current.classes}`}
    >
      {current.label}
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

type KpiCardProps = {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  accent: string;
  iconBg: string;
};

function KpiCard({ label, value, icon, accent, iconBg }: KpiCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
      >
        <span className={`size-5 flex items-center justify-center ${accent}`}>
          {icon}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium leading-tight truncate text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <div className="mt-0.5">{value}</div>
      </div>
    </div>
  );
}

// ─── EvolutionConnectClient ───────────────────────────────────────────────────

export default function EvolutionConnectClient() {
  const [status, setStatus] = useState<EvolutionStatusValue | null>(null);
  const [configured, setConfigured] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    status: false,
    qr: false,
    disconnect: false,
    test: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [testPhoneInput, setTestPhoneInput] = useState("");
  const [showTestInput, setShowTestInput] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // ── Initial load ─────────────────────────────────────────────────────────

  useEffect(() => {
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function refreshStatus() {
    setLoading((l) => ({ ...l, status: true }));
    setError(null);
    try {
      const res = await fetch("/api/evolution/status");
      const json: StatusResponse = await res.json();
      applyStatusResponse(json);
      setLastUpdated(new Date().toISOString());
    } catch {
      setError("Erro ao atualizar status. Tente novamente.");
    } finally {
      setLoading((l) => ({ ...l, status: false }));
    }
  }

  function applyStatusResponse(json: StatusResponse) {
    setStatus(json.status);
    setConfigured(json.configured);
    setPhone(json.phone_number ?? null);
    setLastSeenAt(json.last_seen_at ?? null);
  }

  async function generateQr() {
    setLoading((l) => ({ ...l, qr: true }));
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch("/api/evolution/qr", { method: "POST" });
      const json: QrResponse = await res.json();
      setStatus(json.status);
      setConfigured(json.configured);
      setQr(json.qr);
      if (json.qr) {
        setFeedback("QR Code gerado. Leia com o WhatsApp para conectar.");
      }
    } catch {
      setError("Erro ao gerar QR Code. Tente novamente.");
    } finally {
      setLoading((l) => ({ ...l, qr: false }));
    }
  }

  async function disconnect() {
    if (
      !window.confirm(
        "Deseja desconectar esta instância do WhatsApp? O agente deixará de funcionar até reconectar."
      )
    ) {
      return;
    }
    setLoading((l) => ({ ...l, disconnect: true }));
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch("/api/evolution/disconnect", { method: "POST" });
      const json: DisconnectResponse = await res.json();
      setStatus(json.status);
      setConfigured(json.configured);
      setQr(null);
      setFeedback("Instância desconectada com sucesso.");
    } catch {
      setError("Erro ao desconectar. Tente novamente.");
    } finally {
      setLoading((l) => ({ ...l, disconnect: false }));
    }
  }

  async function sendTest() {
    if (!testPhoneInput.trim()) {
      setError("Informe um número de telefone no formato E164 (ex: 5585999991234).");
      return;
    }
    setLoading((l) => ({ ...l, test: true }));
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch("/api/evolution/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: testPhoneInput.trim(),
          message: "[YZI] Teste de envio do cockpit.",
        }),
      });
      const json: TestSendResponse = await res.json();
      if (!res.ok) {
        setError("Erro ao enviar mensagem de teste.");
      } else if (json.sent) {
        setFeedback(`Mensagem enviada com sucesso${json.message_id ? ` (ID: ${json.message_id})` : ""}.`);
        setShowTestInput(false);
        setTestPhoneInput("");
      } else {
        setError("Envio não confirmado pelo servidor. Verifique se a instância está conectada.");
      }
    } catch {
      setError("Erro ao enviar mensagem. Tente novamente.");
    } finally {
      setLoading((l) => ({ ...l, test: false }));
    }
  }

  // ── QR src helper ─────────────────────────────────────────────────────────

  function qrSrc(qrValue: string): string {
    if (qrValue.startsWith("data:")) return qrValue;
    return `data:image/png;base64,${qrValue}`;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Banner: pending configuration ──────────────────────────────────── */}
      {status === "pendente_configuracao" && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-900/10 p-4">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Integração pendente de configuração
          </p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
            Defina as variáveis de ambiente no servidor:{" "}
            <code className="font-mono bg-amber-100 dark:bg-amber-900/30 px-1 rounded">
              EVOLUTION_BASE_URL
            </code>
            ,{" "}
            <code className="font-mono bg-amber-100 dark:bg-amber-900/30 px-1 rounded">
              EVOLUTION_API_KEY
            </code>{" "}
            e{" "}
            <code className="font-mono bg-amber-100 dark:bg-amber-900/30 px-1 rounded">
              EVOLUTION_INSTANCE_NAME
            </code>
            .
          </p>
        </div>
      )}

      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          label="Status da instância"
          value={<StatusBadge status={status} />}
          icon={<BoltIcon />}
          accent="text-blue-500 dark:text-blue-400"
          iconBg="bg-blue-50 dark:bg-blue-900/20"
        />
        <KpiCard
          label="Número conectado"
          value={
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
              {status === "conectado" ? maskPhone(phone) : "—"}
            </p>
          }
          icon={<CheckCircleIcon />}
          accent="text-emerald-500 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <KpiCard
          label="Última atualização"
          value={
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
              {formatDateTime(lastUpdated ?? lastSeenAt)}
            </p>
          }
          icon={<TimeIcon />}
          accent="text-gray-500 dark:text-gray-400"
          iconBg="bg-gray-100 dark:bg-gray-800"
        />
      </div>

      {/* ── QR Code card ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-white/80 uppercase tracking-wider mb-4">
          QR Code
        </h2>
        {status === "aguardando_qr" && qr ? (
          <div className="flex flex-col items-center gap-4">
            <img
              src={qrSrc(qr)}
              alt="QR Code WhatsApp"
              className="w-64 h-64 mx-auto rounded-xl border border-gray-200 dark:border-gray-700"
            />
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-sm">
              Abra o WhatsApp &gt; Aparelhos conectados &gt; Conectar um aparelho e leia o código.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <span className="size-8 text-gray-400 dark:text-gray-500 flex items-center justify-center">
                <AlertIcon />
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhum QR ativo. Clique em{" "}
              <span className="font-medium text-gray-700 dark:text-gray-200">
                &quot;Gerar/Atualizar QR&quot;
              </span>{" "}
              para iniciar.
            </p>
          </div>
        )}
      </div>

      {/* ── Actions card ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-white/80 uppercase tracking-wider">
          Ações
        </h2>

        {/* Feedback banner */}
        {feedback && (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-900/10 px-4 py-3 flex items-start gap-2">
            <span className="size-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircleIcon />
            </span>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">{feedback}</p>
            <button
              onClick={() => setFeedback(null)}
              className="ml-auto shrink-0 text-emerald-500 hover:text-emerald-700"
              aria-label="Fechar"
            >
              <span className="size-4 flex items-center justify-center">
                <CloseLineIcon />
              </span>
            </button>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-900/10 px-4 py-3 flex items-start gap-2">
            <span className="size-4 shrink-0 mt-0.5 text-red-500 flex items-center justify-center">
              <AlertIcon />
            </span>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto shrink-0 text-red-400 hover:text-red-600"
              aria-label="Fechar"
            >
              <span className="size-4 flex items-center justify-center">
                <CloseLineIcon />
              </span>
            </button>
          </div>
        )}

        {/* Button row */}
        <div className="flex flex-wrap gap-3">
          {/* Atualizar status — always enabled when not loading */}
          <button
            onClick={refreshStatus}
            disabled={loading.status}
            className="rounded-xl px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading.status ? "Atualizando..." : "Atualizar status"}
          </button>

          {/* Gerar/Atualizar QR — disabled when not configured */}
          <button
            onClick={generateQr}
            disabled={!configured || loading.qr}
            title={!configured ? "Configure as env vars EVOLUTION_* para habilitar" : undefined}
            className="rounded-xl px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading.qr ? "Gerando..." : "Gerar/Atualizar QR"}
          </button>

          {/* Desconectar — disabled if not configured or not connected */}
          <button
            onClick={disconnect}
            disabled={!configured || status !== "conectado" || loading.disconnect}
            title={
              !configured
                ? "Configure as env vars EVOLUTION_* para habilitar"
                : status !== "conectado"
                ? "Instância não está conectada"
                : undefined
            }
            className="rounded-xl px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading.disconnect ? "Desconectando..." : "Desconectar"}
          </button>

          {/* Testar envio — disabled if not connected */}
          <button
            onClick={() => {
              setShowTestInput((v) => !v);
              setError(null);
            }}
            disabled={status !== "conectado"}
            title={status !== "conectado" ? "Instância precisa estar conectada para testar envio" : undefined}
            className="rounded-xl px-4 py-2 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Testar envio
          </button>
        </div>

        {/* Inline test send input */}
        {showTestInput && (
          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              value={testPhoneInput}
              onChange={(e) => setTestPhoneInput(e.target.value)}
              placeholder="Telefone E164 (ex: 5585999991234)"
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") sendTest();
                if (e.key === "Escape") setShowTestInput(false);
              }}
            />
            <button
              onClick={sendTest}
              disabled={loading.test}
              className="rounded-xl px-4 py-2 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading.test ? "Enviando..." : "Enviar"}
            </button>
            <button
              onClick={() => setShowTestInput(false)}
              className="rounded-xl px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
