"use client";

import { useState, useMemo, useCallback } from "react";
import { useTenantContext } from "@/context/TenantContext";
import { MOCK_CONTRACTS } from "@/lib/contracts/mock-data";
import { CONTRACT_STATUS_CONFIG } from "@/types/contracts";
import type { Contract, ContractStatus } from "@/types/contracts";
import Badge from "@/components/ui/badge/Badge";
import { CloseIcon } from "@/icons";
import ContractsTable, {
  ContractsTableSkeleton,
  ContractsEmptyState,
} from "./ContractsTable";
import NewContractModal from "./NewContractModal";

// ─── useContracts hook ────────────────────────────────────────────────────────
// Prepared for Supabase swap: replace mock with supabase query

function useContracts(tenantId: string | null) {
  const [contracts] = useState<Contract[]>(() => {
    if (!tenantId) return [];
    // DEV_BYPASS: dev-tenant shows Jurema Brokers data
    return MOCK_CONTRACTS.filter((c) => c.tenant_id === tenantId);
  });

  const isLoading = false;
  const error: string | null = null;

  const refetch = useCallback(() => {
    // TODO: replace with supabase.from('contracts').select('*').eq('tenant_id', tenantId)
  }, []);

  return { contracts, isLoading, error, refetch };
}

// ─── Contract Detail Drawer ───────────────────────────────────────────────────

function ContractDrawer({
  contract,
  onClose,
}: {
  contract: Contract | null;
  onClose: () => void;
}) {
  function formatCurrency(value: number): string {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "Pendente";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  const statusCfg = contract ? CONTRACT_STATUS_CONFIG[contract.status] : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          contract ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          contract ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {contract && statusCfg && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge size="sm" color="light">
                    {contract.type.charAt(0).toUpperCase() + contract.type.slice(1)}
                  </Badge>
                  <Badge size="sm" color={statusCfg.color}>
                    {statusCfg.label}
                  </Badge>
                </div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
                  {contract.lead_name}
                </h2>
                {contract.project_name && (
                  <p className="text-xs text-gray-400 mt-0.5">{contract.project_name}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg transition-colors"
              >
                <CloseIcon className="size-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Informacoes */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                  Informacoes
                </h3>
                <div className="space-y-3">
                  <InfoRow label="Lead vinculado" value={contract.lead_name} />
                  <InfoRow
                    label="Valor"
                    value={
                      <span className="font-semibold text-emerald-500">
                        {formatCurrency(contract.value)}
                      </span>
                    }
                  />
                  <InfoRow label="Tipo" value={contract.type.charAt(0).toUpperCase() + contract.type.slice(1)} />
                  <InfoRow label="Corretor" value={contract.corretor_name ?? "—"} />
                  {contract.notes && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Notas</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                        {contract.notes}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Datas */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                  Datas
                </h3>
                <div className="space-y-3">
                  <InfoRow label="Criado em" value={formatDate(contract.created_at)} />
                  <InfoRow label="Assinado em" value={formatDate(contract.signed_at)} />
                  <InfoRow
                    label="Vencimento"
                    value={contract.expires_at ? formatDate(contract.expires_at) : "Sem vencimento"}
                  />
                </div>
              </section>

              {/* Acoes */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                  Acoes
                </h3>
                <div className="space-y-2">
                  <button className="w-full flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50/30 dark:hover:bg-brand-500/5 transition-all group">
                    <span>Enviar Contrato</span>
                    <span className="text-gray-300 dark:text-gray-600 group-hover:text-brand-400">→</span>
                  </button>
                  <button className="w-full flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5 transition-all group">
                    <span>Marcar como Assinado</span>
                    <span className="text-gray-300 dark:text-gray-600 group-hover:text-emerald-400">→</span>
                  </button>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── InfoRow helper ───────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm text-gray-700 dark:text-gray-200">{value}</span>
    </div>
  );
}

// ─── Pending Alert ────────────────────────────────────────────────────────────

function PendingAlert({ contracts }: { contracts: Contract[] }) {
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const overdue = contracts.filter((c) => {
    if (c.status !== "pendente") return false;
    const updatedAt = new Date(c.updated_at).getTime();
    return now - updatedAt > sevenDaysMs;
  });

  if (overdue.length === 0) return null;

  function daysSince(dateStr: string): number {
    return Math.floor((now - new Date(dateStr).getTime()) / (24 * 60 * 60 * 1000));
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5 p-4">
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0">⚠️</span>
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            {overdue.length} contrato{overdue.length > 1 ? "s" : ""} pendente{overdue.length > 1 ? "s" : ""} ha mais de 7 dias
          </p>
          <ul className="mt-2 space-y-1">
            {overdue.map((c) => (
              <li key={c.id} className="text-xs text-amber-700 dark:text-amber-400">
                • {c.lead_name} — {daysSince(c.updated_at)} dias sem atualizacao
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Status Filter Dropdown ───────────────────────────────────────────────────

const STATUS_OPTIONS: { value: ContractStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "rascunho", label: "Rascunho" },
  { value: "pendente", label: "Pendente" },
  { value: "assinado", label: "Assinado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "expirado", label: "Expirado" },
];

// ─── Main Client Component ────────────────────────────────────────────────────

export default function ContractsClient() {
  const { tenant, loading: tenantLoading } = useTenantContext();
  const { contracts, isLoading } = useContracts(tenant?.id ?? null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "all">("all");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      const matchesSearch =
        !search ||
        c.lead_name.toLowerCase().includes(search.toLowerCase()) ||
        (c.project_name ?? "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || c.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [contracts, search, statusFilter]);

  const hasFilters = search !== "" || statusFilter !== "all";

  // Summary stats
  const totalVGV = contracts.reduce((sum, c) => sum + c.value, 0);
  const assinados = contracts.filter((c) => c.status === "assinado").length;
  const pendentes = contracts.filter((c) => c.status === "pendente").length;

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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white/90">Contratos</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {tenant?.name} — {contracts.length} contrato{contracts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 active:scale-95 transition-all shadow-sm"
        >
          <span className="text-base leading-none">+</span>
          Novo Contrato
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p className="text-xs text-gray-400 mb-1">VGV Total</p>
          <p className="text-lg font-bold text-gray-800 dark:text-white/90">
            {totalVGV.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p className="text-xs text-gray-400 mb-1">Assinados</p>
          <p className="text-lg font-bold text-emerald-500">{assinados}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p className="text-xs text-gray-400 mb-1">Pendentes</p>
          <p className="text-lg font-bold text-amber-500">{pendentes}</p>
        </div>
      </div>

      {/* Pending Alert */}
      <PendingAlert contracts={contracts} />

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx={11} cy={11} r={8} />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por cliente ou imovel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-colors"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ContractStatus | "all")}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:border-brand-500 transition-colors sm:w-52"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Results count */}
      {hasFilters && (
        <p className="text-xs text-gray-400">
          {filtered.length} de {contracts.length} contratos
        </p>
      )}

      {/* Table */}
      {isLoading ? (
        <ContractsTableSkeleton />
      ) : filtered.length === 0 ? (
        <ContractsEmptyState hasFilters={hasFilters} />
      ) : (
        <ContractsTable
          contracts={filtered}
          onRowClick={setSelectedContract}
        />
      )}

      {/* Drawer */}
      <ContractDrawer
        contract={selectedContract}
        onClose={() => setSelectedContract(null)}
      />

      {/* New Contract Modal */}
      <NewContractModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
