"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTenantContext } from "@/context/TenantContext";
import type { N8nContract } from "@/types/n8n-payloads";

// ─── Types ────────────────────────────────────────────────────────────────────

type FinanceEntry = {
  id: string;
  tenant_id: string;
  comissao_id: string | null;
  contract_id: string | null;
  tipo: "entrada" | "saida" | string;
  categoria: string;
  descricao: string;
  valor: number | null;
  data_evento: string;
  status: "previsto" | "confirmado" | "cancelado" | string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  contract?: (N8nContract & {
    commission_percentage?: number | null;
    commission_amount?: number | null;
  }) | null;
  broker_name?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtBRLShort(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}k`;
  return fmtBRL(v);
}

async function readApiError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null) as { error?: string; detail?: string } | null;
  return data?.error ?? data?.detail ?? fallback;
}

// ─── Status display maps ──────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  previsto:   "Previsto",
  confirmado: "Confirmado",
  cancelado:  "Cancelado",
  draft:      "Rascunho",
  sent:       "Enviado",
  signed:     "Assinado",
  rascunho:   "Rascunho",
  pendente:   "Pendente",
  assinado:   "Assinado",
  expirado:   "Expirado",
};

const STATUS_STYLES: Record<string, string> = {
  previsto:   "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
  confirmado: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  cancelado:  "bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400",
  draft:      "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  sent:       "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
  signed:     "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rascunho:   "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  pendente:   "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
  assinado:   "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  expirado:   "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500",
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  accentClass,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accentClass: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
      <div className={`absolute top-0 left-0 h-1 w-full ${accentClass}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentClass} bg-opacity-10 dark:bg-opacity-20`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="p-6 space-y-5">
      <div className="h-8 w-48 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FinanceiroClient() {
  const router = useRouter();
  const { tenant, loading: tenantLoading } = useTenantContext();
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [isLoading, setIsLoading]  = useState(false);
  const [error, setError]          = useState<string | null>(null);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant?.id) return;

    async function fetchAll() {
      setIsLoading(true);
      setError(null);
      try {
        const contractsRes = await fetch("/api/financeiro");

        if (!contractsRes.ok) {
          const d = await contractsRes.json().catch(() => ({}));
          throw new Error((d as { error?: string }).error ?? "Erro ao buscar contratos");
        }

        const json = await contractsRes.json();
        const arr: FinanceEntry[] = Array.isArray(json?.data) ? json.data : [];
        setEntries(arr);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAll();
  }, [tenant?.id]);

  // ── KPI calculations ─────────────────────────────────────────────────────────

  const isSigned = (c: FinanceEntry) =>
    c.contract?.status === "signed" || c.contract?.status === "assinado" || Boolean(c.contract?.signed_at);

  const entryValue = (c: FinanceEntry) => Number(c.valor) || 0;
  const signedContracts = entries.filter(isSigned);
  const totalVendas   = entries.filter((e) => e.tipo === "entrada").reduce((s, e) => s + entryValue(e), 0);
  const totalComissao = entries.filter((e) => e.tipo === "saida" && e.categoria === "comissao").reduce((s, e) => s + entryValue(e), 0);
  const cntSigned     = new Set(entries.filter(isSigned).map((e) => e.contract_id).filter(Boolean)).size;
  const ticketBase    = entries.filter((e) => e.tipo === "entrada");
  const ticketMedio   = ticketBase.length > 0
    ? ticketBase.reduce((s, c) => s + entryValue(c), 0) / ticketBase.length
    : 0;

  function openContract(contractId: string) {
    router.push(`/cockpit/contratos/novo?contract_id=${contractId}`);
  }

  async function sendContract(entry: FinanceEntry) {
    if (!entry.contract_id) return;
    setBusyActionId(entry.contract_id);
    setError(null);
    setOpenActionId(null);

    try {
      const res = await fetch(`/api/contracts/${entry.contract_id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canais: { whatsapp: true, email: true } }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, "Erro ao enviar contrato"));
      }

      await res.json().catch(() => null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar contrato");
    } finally {
      setBusyActionId(null);
    }
  }

  async function deleteContract(entry: FinanceEntry) {
    if (!entry.contract_id) return;
    const isFinalized = entry.contract?.status === "sent" || entry.contract?.status === "signed" || entry.contract?.status === "assinado";
    const message = isFinalized
      ? "Este contrato ja foi enviado/assinado. Excluir apenas remove o contrato, sem apagar lead, imovel ou corretor. Deseja continuar?"
      : "Excluir este contrato? Lead, imovel e corretor vinculados nao serao apagados.";

    if (!window.confirm(message)) return;

    setBusyActionId(entry.contract_id);
    setError(null);
    setOpenActionId(null);

    try {
      const res = await fetch(`/api/contracts/${entry.contract_id}`, { method: "DELETE" });

      if (!res.ok) {
        throw new Error(await readApiError(res, "Erro ao excluir contrato"));
      }

      setEntries((prev) => prev.filter((c) => c.contract_id !== entry.contract_id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir contrato");
    } finally {
      setBusyActionId(null);
    }
  }

  if (tenantLoading) return <Skeleton />;

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-white/90">Financeiro</h1>
        <p className="text-sm text-gray-400 mt-0.5">
        {tenant?.name} · Resumo financeiro baseado em contratos assinados
        </p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total de Vendas"
          value={fmtBRLShort(totalVendas)}
          sub={fmtBRL(totalVendas)}
          accentClass="bg-emerald-500"
          icon={
            <svg className="size-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
        />
        <KpiCard
          label="Total de Comissao"
          value={fmtBRLShort(totalComissao)}
          sub={fmtBRL(totalComissao)}
          accentClass="bg-violet-500"
          icon={
            <svg className="size-5 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <KpiCard
          label="Contratos Assinados"
          value={String(cntSigned)}
          sub={`de ${entries.length} no total`}
          accentClass="bg-blue-500"
          icon={
            <svg className="size-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          }
        />
        <KpiCard
          label="Ticket Medio"
          value={fmtBRLShort(ticketMedio)}
          sub={ticketBase.length > 0 ? "por contrato" : "Sem contratos"}
          accentClass="bg-amber-500"
          icon={
            <svg className="size-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6"  y1="20" x2="6"  y2="14" />
            </svg>
          }
        />
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/5 p-4 flex items-center gap-3">
          <svg className="size-5 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9"  y1="9" x2="15" y2="15" />
          </svg>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* ── Contracts Table ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Contratos</h2>
            <p className="text-xs text-gray-400 mt-0.5">Itens financeiros por contrato</p>
          </div>
          <span className="text-xs text-gray-400">
            {entries.length} item{entries.length !== 1 ? "s" : ""}
          </span>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-400">Nenhum contrato financeiro encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                {["Cliente", "Imovel / Projeto", "Valor", "Tipo", "Status", "Acoes"].map((h, i) => (
                  <th
                    key={h}
                    className={`text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-3 ${
                        i === 0 ? "text-left pl-5" : i < 2 ? "text-left" : i === 2 ? "text-right" : i === 3 ? "text-center" : i === 4 ? "text-center" : "text-right"
                      }`}
                  >
                    {h}
                  </th>
                ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {entries.map((c) => {
                  const styleCls = STATUS_STYLES[c.status] ?? STATUS_STYLES["previsto"];
                  const labelTxt = STATUS_LABELS[c.status] ?? c.status;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="pl-5 pr-4 py-3.5">
                        <p className="font-medium text-gray-800 dark:text-white/90 truncate max-w-[160px]">
                          {c.contract?.lead_name ?? "—"}
                        </p>
                        {(c.contract?.corretor_name || c.broker_name) && (
                          <p className="text-xs text-gray-400 truncate">{c.contract?.corretor_name ?? c.broker_name}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-gray-600 dark:text-gray-400 truncate max-w-[180px]">
                          {c.contract?.project_name ?? c.contract?.title ?? c.descricao ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-semibold text-gray-800 dark:text-white/90 whitespace-nowrap">
                          {fmtBRL(entryValue(c))}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center text-gray-500 dark:text-gray-400">
                        {c.tipo}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styleCls}`}>
                          {labelTxt}
                        </span>
                      </td>
                      <td className="relative px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setOpenActionId((current) => current === c.id ? null : c.id)}
                          disabled={busyActionId === (c.contract_id ?? c.id)}
                          className="dropdown-toggle inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-200"
                          aria-label="Acoes do contrato"
                          aria-expanded={openActionId === c.id}
                        >
                          ...
                        </button>

                        {openActionId === c.id && (
                          <div className="absolute right-4 top-11 z-50 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
                            <button
                              type="button"
                            onClick={() => openContract(c.contract_id ?? c.id)}
                              className="block w-full px-4 py-2 text-left text-xs text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                            >
                              Visualizar/Abrir
                            </button>
                            <button
                              type="button"
                            onClick={() => openContract(c.contract_id ?? c.id)}
                              className="block w-full px-4 py-2 text-left text-xs text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                            onClick={() => sendContract(c)}
                            disabled={busyActionId === c.contract_id}
                              className="block w-full px-4 py-2 text-left text-xs text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                            >
                              Enviar contrato
                            </button>
                            <button
                              type="button"
                            onClick={() => deleteContract(c)}
                            disabled={busyActionId === c.contract_id}
                              className="block w-full px-4 py-2 text-left text-xs text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-red-500/10"
                            >
                              Excluir
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary footer */}
        {entries.length > 0 && !isLoading && (
          <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-3 flex items-center justify-between bg-gray-50 dark:bg-white/[0.02]">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Total em contratos financeiros ({entries.length} movimentos)
            </span>
            <span className="text-sm font-bold text-gray-800 dark:text-white/90">
              {fmtBRL(totalVendas)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
