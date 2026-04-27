"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTenantContext } from "@/context/TenantContext";
import { CONTRACT_STATUS_CONFIG, CONTRACT_TYPE_LABELS } from "@/types/contracts";
import type { Contract, ContractStatus, ContractType } from "@/types/contracts";
import ContractsTable, {
  ContractsTableSkeleton,
  ContractsEmptyState,
} from "./ContractsTable";
import ContractDrawer from "./ContractDrawer";

// ─── useContracts hook ────────────────────────────────────────────────────────

function useContracts(tenantId: string | null) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = useCallback(async () => {
    if (!tenantId) { setContracts([]); return; }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contracts");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao buscar contratos");
      }
      const json = await res.json();
      const arr: Contract[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
      setContracts(arr);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setContracts([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  const createContract = useCallback(async (body: Record<string, unknown>): Promise<Contract | null> => {
    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? "Erro"); }
      const created: Contract = await res.json();
      await fetchContracts();
      return created;
    } catch { return null; }
  }, [fetchContracts]);

  const updateContractLocal = useCallback((updated: Contract) => {
    setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }, []);

  return { contracts, isLoading, error, refetch: fetchContracts, createContract, updateContractLocal };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}k`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtBRLFull(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
  badge?: { text: string; color: string };
}

function KpiCard({ label, value, sub, icon, accent, badge }: KpiCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
      <div className={`absolute top-0 left-0 h-1 w-full ${accent}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent} bg-opacity-10 dark:bg-opacity-20`}>
          {icon}
        </div>
      </div>
      {badge && (
        <div className="mt-3">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.color}`}>
            {badge.text}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Pipeline Funnel ──────────────────────────────────────────────────────────

interface PipelineStage {
  label: string;
  count: number;
  value: number;
  total: number;
  barColor: string;
  textColor: string;
  bgColor: string;
}

function PipelinePanel({ stages, cancelled }: { stages: PipelineStage[]; cancelled: number }) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Pipeline de Contratos</h3>
          <p className="text-xs text-gray-400 mt-0.5">Distribuicao por estagio</p>
        </div>
        {cancelled > 0 && (
          <span className="text-xs text-red-400 bg-red-50 dark:bg-red-500/10 rounded-full px-2 py-0.5">
            {cancelled} cancelado{cancelled > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {stages.map((stage) => {
          const pct = stage.total > 0 ? Math.round((stage.count / stage.total) * 100) : 0;
          const barW = maxCount > 0 ? Math.round((stage.count / maxCount) * 100) : 0;
          return (
            <div key={stage.label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${stage.barColor}`} />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{stage.label}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${stage.bgColor} ${stage.textColor}`}>
                    {stage.count}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-gray-800 dark:text-white/80">{fmtBRL(stage.value)}</span>
                  <span className="text-xs text-gray-400 ml-1.5">({pct}%)</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${stage.barColor}`}
                  style={{ width: `${barW}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Type Breakdown ───────────────────────────────────────────────────────────

const TYPE_COLORS: Record<ContractType, { bar: string; bg: string; text: string }> = {
  venda:    { bar: "bg-blue-500",    bg: "bg-blue-50 dark:bg-blue-500/10",    text: "text-blue-600 dark:text-blue-400"    },
  locacao:  { bar: "bg-violet-500",  bg: "bg-violet-50 dark:bg-violet-500/10", text: "text-violet-600 dark:text-violet-400" },
  servico:  { bar: "bg-cyan-500",    bg: "bg-cyan-50 dark:bg-cyan-500/10",    text: "text-cyan-600 dark:text-cyan-400"    },
  parceria: { bar: "bg-orange-500",  bg: "bg-orange-50 dark:bg-orange-500/10", text: "text-orange-600 dark:text-orange-400" },
};

function TypeBreakdown({ contracts }: { contracts: Contract[] }) {
  const types: ContractType[] = ["venda", "locacao", "servico", "parceria"];
  const maxCount = Math.max(...types.map((t) => contracts.filter((c) => c.type === t).length), 1);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Tipos de Contrato</h3>
        <p className="text-xs text-gray-400 mt-0.5">Volume por categoria</p>
      </div>

      <div className="space-y-3">
        {types.map((type) => {
          const count = contracts.filter((c) => c.type === type).length;
          const value = contracts.filter((c) => c.type === type).reduce((s, c) => s + c.value, 0);
          const barW = Math.round((count / maxCount) * 100);
          const cfg = TYPE_COLORS[type];

          return (
            <div key={type}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${cfg.bar}`} />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {CONTRACT_TYPE_LABELS[type]}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{fmtBRL(value)}</span>
                  <span className={`text-xs font-bold min-w-[20px] text-center px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                    {count}
                  </span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
                  style={{ width: `${barW}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Pending Alert ────────────────────────────────────────────────────────────

function PendingAlert({ contracts }: { contracts: Contract[] }) {
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const overdue = contracts.filter((c) => {
    if (c.status !== "sent") return false;
    return now - new Date(c.updated_at).getTime() > sevenDaysMs;
  });

  if (overdue.length === 0) return null;

  const daysSince = (d: string) => Math.floor((now - new Date(d).getTime()) / (24 * 60 * 60 * 1000));

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
          <svg className="size-4 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            {overdue.length} contrato{overdue.length > 1 ? "s" : ""} aguardando assinatura ha mais de 7 dias
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {overdue.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-500/20 px-2.5 py-1 text-xs text-amber-700 dark:text-amber-300">
                {c.lead_name}
                <span className="font-bold">{daysSince(c.updated_at)}d</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-xs text-gray-400">Pagina {page} de {total}</p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
              p === page
                ? "bg-brand-500 text-white"
                : "border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === total}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: ContractStatus | "all"; label: string }[] = [
  { value: "all",       label: "Todos os status" },
  { value: "draft",     label: "Rascunho"        },
  { value: "sent",      label: "Enviado"          },
  { value: "signed",    label: "Assinado"         },
  { value: "cancelled", label: "Cancelado"        },
];

const TYPE_OPTIONS: { value: ContractType | "all"; label: string }[] = [
  { value: "all",      label: "Todos os tipos" },
  { value: "venda",    label: "Venda"          },
  { value: "locacao",  label: "Locacao"        },
  { value: "servico",  label: "Servico"        },
  { value: "parceria", label: "Parceria"       },
];

// ─── Main Client Component ────────────────────────────────────────────────────

export default function ContractsClient() {
  const router = useRouter();
  const { tenant, loading: tenantLoading } = useTenantContext();
  const { contracts, isLoading, error, refetch, updateContractLocal } =
    useContracts(tenant?.id ?? null);

  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "all">("all");
  const [typeFilter, setTypeFilter]     = useState<ContractType | "all">("all");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [page, setPage]                 = useState(1);

  function handleContractUpdated(updated: Contract) {
    updateContractLocal(updated);
    setSelectedContract(updated);
  }

  async function handleCancelContract(id: string) {
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) return;
      const updated: Contract = await res.json();
      updateContractLocal(updated);
    } catch { /* silent */ }
  }

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch = !search ||
        c.lead_name.toLowerCase().includes(q) ||
        (c.project_name ?? "").toLowerCase().includes(q) ||
        (c.title ?? "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      const matchType   = typeFilter   === "all" || c.type   === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [contracts, search, statusFilter, typeFilter]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = search !== "" || statusFilter !== "all" || typeFilter !== "all";

  // ── Derived metrics ─────────────────────────────────────────────────────────
  const vgvTotal     = contracts.reduce((s, c) => s + c.value, 0);
  const vgvSigned    = contracts.filter((c) => c.status === "signed").reduce((s, c) => s + c.value, 0);
  const vgvPipeline  = contracts.filter((c) => c.status === "sent" || c.status === "draft").reduce((s, c) => s + c.value, 0);
  const cntSigned    = contracts.filter((c) => c.status === "signed").length;
  const cntSent      = contracts.filter((c) => c.status === "sent").length;
  const cntDraft     = contracts.filter((c) => c.status === "draft").length;
  const cntCancelled = contracts.filter((c) => c.status === "cancelled").length;
  const cntActive    = contracts.filter((c) => c.status !== "cancelled").length;
  const convRate     = cntActive > 0 ? Math.round((cntSigned / cntActive) * 100) : 0;

  const pipelineStages: PipelineStage[] = [
    {
      label: "Rascunho",
      count: cntDraft,
      value: contracts.filter((c) => c.status === "draft").reduce((s, c) => s + c.value, 0),
      total: contracts.length,
      barColor: "bg-gray-400",
      textColor: "text-gray-600 dark:text-gray-300",
      bgColor: "bg-gray-100 dark:bg-gray-700",
    },
    {
      label: "Enviado",
      count: cntSent,
      value: contracts.filter((c) => c.status === "sent").reduce((s, c) => s + c.value, 0),
      total: contracts.length,
      barColor: "bg-amber-500",
      textColor: "text-amber-700 dark:text-amber-300",
      bgColor: "bg-amber-50 dark:bg-amber-500/20",
    },
    {
      label: "Assinado",
      count: cntSigned,
      value: vgvSigned,
      total: contracts.length,
      barColor: "bg-emerald-500",
      textColor: "text-emerald-700 dark:text-emerald-300",
      bgColor: "bg-emerald-50 dark:bg-emerald-500/20",
    },
  ];

  if (tenantLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <ContractsTableSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white/90">Contratos</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {tenant?.name} · {contracts.length} contrato{contracts.length !== 1 ? "s" : ""} no total
          </p>
        </div>
        <button
          onClick={() => router.push("/cockpit/contratos/novo")}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 active:scale-95 transition-all shadow-sm"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Novo Contrato
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="VGV Total"
          value={fmtBRL(vgvTotal)}
          sub={fmtBRLFull(vgvTotal)}
          accent="bg-blue-500"
          icon={
            <svg className="size-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
          }
          badge={{ text: `${contracts.length} contratos`, color: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" }}
        />
        <KpiCard
          label="VGV Realizado"
          value={fmtBRL(vgvSigned)}
          sub={`${cntSigned} assinado${cntSigned !== 1 ? "s" : ""}`}
          accent="bg-emerald-500"
          icon={
            <svg className="size-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          }
          badge={{ text: "Receita confirmada", color: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" }}
        />
        <KpiCard
          label="Em Pipeline"
          value={fmtBRL(vgvPipeline)}
          sub={`${cntDraft + cntSent} ativo${cntDraft + cntSent !== 1 ? "s" : ""}`}
          accent="bg-amber-500"
          icon={
            <svg className="size-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          }
          badge={{ text: "Aguardando fechamento", color: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" }}
        />
        <KpiCard
          label="Taxa de Fechamento"
          value={`${convRate}%`}
          sub="sobre contratos ativos"
          accent="bg-violet-500"
          icon={
            <svg className="size-5 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          }
          badge={{
            text: convRate >= 50 ? "Acima da meta" : "Abaixo da meta",
            color: convRate >= 50
              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400",
          }}
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PipelinePanel stages={pipelineStages} cancelled={cntCancelled} />
        <TypeBreakdown contracts={contracts} />
      </div>

      {/* ── Pending Alert ── */}
      <PendingAlert contracts={contracts} />

      {/* ── Error ── */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/5 p-4 flex items-center gap-3">
          <svg className="size-5 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <div className="flex-1">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
          <button onClick={refetch} className="text-xs font-medium text-red-500 hover:text-red-600 underline shrink-0">
            Tentar novamente
          </button>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx={11} cy={11} r={8}/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar por cliente, imovel ou titulo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-colors"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ContractStatus | "all")}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:border-brand-500 transition-colors sm:w-48"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ContractType | "all")}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:border-brand-500 transition-colors sm:w-44"
        >
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setStatusFilter("all"); setTypeFilter("all"); }}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors shrink-0"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Limpar
          </button>
        )}
      </div>

      {/* ── Results count ── */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {hasFilters
            ? `${filtered.length} de ${contracts.length} contratos`
            : `${contracts.length} contrato${contracts.length !== 1 ? "s" : ""}`}
        </p>
        {filtered.length > 0 && (
          <p className="text-xs text-gray-400">
            Total filtrado: <span className="font-semibold text-gray-600 dark:text-gray-300">{fmtBRL(filtered.reduce((s, c) => s + c.value, 0))}</span>
          </p>
        )}
      </div>

      {/* ── Table ── */}
      {isLoading ? (
        <ContractsTableSkeleton />
      ) : filtered.length === 0 ? (
        <ContractsEmptyState hasFilters={hasFilters} />
      ) : (
        <>
          <ContractsTable
            contracts={paginated}
            onRowClick={setSelectedContract}
            onCancelContract={handleCancelContract}
          />
          <Pagination page={page} total={totalPages} onChange={setPage} />
        </>
      )}

      {/* ── Drawer ── */}
      <ContractDrawer
        contract={selectedContract}
        onClose={() => setSelectedContract(null)}
        onContractUpdated={handleContractUpdated}
      />
    </div>
  );
}
