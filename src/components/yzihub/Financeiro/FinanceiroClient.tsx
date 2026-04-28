"use client";

import { useState, useEffect } from "react";
import { useTenantContext } from "@/context/TenantContext";
import { createClient } from "@/lib/supabase/client";
import type { N8nContract } from "@/types/n8n-payloads";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Comissao {
  id: string;
  contract_id: string;
  percentual: number;
  valor: number;
  status: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtBRLShort(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}k`;
  return fmtBRL(v);
}

// ─── Status display maps ──────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft:     "Rascunho",
  sent:      "Enviado",
  signed:    "Assinado",
  cancelled: "Cancelado",
  rascunho:  "Rascunho",
  pendente:  "Pendente",
  assinado:  "Assinado",
  cancelado: "Cancelado",
  expirado:  "Expirado",
};

const STATUS_STYLES: Record<string, string> = {
  draft:     "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  sent:      "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
  signed:    "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400",
  rascunho:  "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  pendente:  "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
  assinado:  "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  cancelado: "bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400",
  expirado:  "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500",
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
  const { tenant, loading: tenantLoading } = useTenantContext();
  const [contracts, setContracts] = useState<N8nContract[]>([]);
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [isLoading, setIsLoading]  = useState(false);
  const [error, setError]          = useState<string | null>(null);

  useEffect(() => {
    if (!tenant?.id) return;

    async function fetchAll() {
      setIsLoading(true);
      setError(null);
      try {
        const supabase = createClient();

        const [contractsRes, comissoesRes] = await Promise.all([
          fetch("/api/contracts"),
          supabase
            .from("comissoes")
            .select("id, contract_id, percentual, valor, status")
            .eq("tenant_id", tenant!.id),
        ]);

        if (!contractsRes.ok) {
          const d = await contractsRes.json().catch(() => ({}));
          throw new Error((d as { error?: string }).error ?? "Erro ao buscar contratos");
        }

        const json = await contractsRes.json();
        const arr: N8nContract[] = Array.isArray(json?.data) ? json.data : [];
        setContracts(arr);

        if (comissoesRes.data) {
          setComissoes(comissoesRes.data as Comissao[]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAll();
  }, [tenant?.id]);

  // ── KPI calculations ─────────────────────────────────────────────────────────

  const isSigned = (c: N8nContract) =>
    c.status === "signed" || c.status === "assinado";

  const totalVendas   = contracts.filter(isSigned).reduce((s, c) => s + c.value, 0);
  const totalComissao = comissoes
    .filter((c) => c.status === "approved" || c.status === "paid")
    .reduce((s, c) => s + c.valor, 0);
  const cntSigned     = contracts.filter(isSigned).length;
  const ticketMedio   = cntSigned > 0 ? totalVendas / cntSigned : 0;
  const totalVGV      = contracts
    .filter((c) => c.status !== "cancelled" && c.status !== "cancelado")
    .reduce((s, c) => s + c.value, 0);

  function comissaoOf(contractId: string): Comissao | null {
    return comissoes.find((c) => c.contract_id === contractId) ?? null;
  }

  if (tenantLoading) return <Skeleton />;

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-white/90">Financeiro</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {tenant?.name} · Resumo financeiro baseado em contratos
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
          value={comissoes.length === 0 ? "—" : fmtBRLShort(totalComissao)}
          sub={comissoes.length === 0 ? "Sem comissoes registradas" : fmtBRL(totalComissao)}
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
          sub={`de ${contracts.length} no total`}
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
          value={cntSigned > 0 ? fmtBRLShort(ticketMedio) : "—"}
          sub={cntSigned > 0 ? "por contrato assinado" : "Sem contratos assinados"}
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
            {contracts.length} item{contracts.length !== 1 ? "s" : ""}
          </span>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : contracts.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-400">Nenhum contrato encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {["Cliente", "Imovel / Projeto", "Valor", "Comissao %", "Comissao R$", "Status"].map((h, i) => (
                    <th
                      key={h}
                      className={`text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-3 ${
                        i === 0 ? "text-left pl-5" : i < 2 ? "text-left" : i < 5 ? "text-right" : "text-center"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {contracts.map((c) => {
                  const com = comissaoOf(c.id);
                  const styleCls = STATUS_STYLES[c.status] ?? STATUS_STYLES["draft"];
                  const labelTxt = STATUS_LABELS[c.status] ?? c.status;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="pl-5 pr-4 py-3.5">
                        <p className="font-medium text-gray-800 dark:text-white/90 truncate max-w-[160px]">
                          {c.lead_name}
                        </p>
                        {c.corretor_name && (
                          <p className="text-xs text-gray-400 truncate">{c.corretor_name}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-gray-600 dark:text-gray-400 truncate max-w-[180px]">
                          {c.project_name ?? c.title ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-semibold text-gray-800 dark:text-white/90 whitespace-nowrap">
                          {fmtBRL(c.value)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-gray-500 dark:text-gray-400">
                        {com ? `${com.percentual}%` : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right text-gray-500 dark:text-gray-400">
                        {com ? fmtBRL(com.valor) : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styleCls}`}>
                          {labelTxt}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary footer */}
        {contracts.length > 0 && !isLoading && (
          <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-3 flex items-center justify-between bg-gray-50 dark:bg-white/[0.02]">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              VGV ativo ({contracts.filter((c) => c.status !== "cancelled" && c.status !== "cancelado").length} contratos)
            </span>
            <span className="text-sm font-bold text-gray-800 dark:text-white/90">
              {fmtBRL(totalVGV)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
