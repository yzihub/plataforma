"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTenantContext } from "@/context/TenantContext";
import { CONTRACT_STATUS_CONFIG } from "@/types/contracts";
import type { Contract, ContractStatus } from "@/types/contracts";
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
    if (!tenantId) {
      setContracts([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/contracts");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao buscar contratos");
      }
      const data: Contract[] = await res.json();
      setContracts(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(msg);
      setContracts([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const createContract = useCallback(
    async (body: Record<string, unknown>): Promise<Contract | null> => {
      try {
        const res = await fetch("/api/contracts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Erro ao criar contrato");
        }
        const created: Contract = await res.json();
        await fetchContracts();
        return created;
      } catch {
        return null;
      }
    },
    [fetchContracts]
  );

  const updateContractLocal = useCallback((updated: Contract) => {
    setContracts((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  }, []);

  return { contracts, isLoading, error, refetch: fetchContracts, createContract, updateContractLocal };
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
        <span className="text-xl shrink-0">⚠</span>
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            {overdue.length} contrato{overdue.length > 1 ? "s" : ""} pendente{overdue.length > 1 ? "s" : ""} ha mais de 7 dias
          </p>
          <ul className="mt-2 space-y-1">
            {overdue.map((c) => (
              <li key={c.id} className="text-xs text-amber-700 dark:text-amber-400">
                - {c.lead_name} — {daysSince(c.updated_at)} dias sem atualizacao
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
  { value: "all",       label: "Todos os status" },
  { value: "rascunho",  label: "Rascunho"        },
  { value: "pendente",  label: "Pendente"         },
  { value: "assinado",  label: "Assinado"         },
  { value: "cancelado", label: "Cancelado"        },
  { value: "expirado",  label: "Expirado"         },
];

// ─── Main Client Component ────────────────────────────────────────────────────

export default function ContractsClient() {
  const router = useRouter();
  const { tenant, loading: tenantLoading } = useTenantContext();
  const { contracts, isLoading, error, refetch, createContract, updateContractLocal } =
    useContracts(tenant?.id ?? null);

  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "all">("all");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  // When contract is updated (from drawer), update selectedContract too
  function handleContractUpdated(updated: Contract) {
    updateContractLocal(updated);
    setSelectedContract(updated);
  }

  // Cancel contract from table action
  async function handleCancelContract(id: string) {
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelado" }),
      });
      if (!res.ok) return;
      const updated: Contract = await res.json();
      updateContractLocal(updated);
    } catch {
      // silent
    }
  }

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      const matchesSearch =
        !search ||
        c.lead_name.toLowerCase().includes(search.toLowerCase()) ||
        (c.project_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (c.title ?? "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || c.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [contracts, search, statusFilter]);

  const hasFilters = search !== "" || statusFilter !== "all";

  // Summary stats
  const totalVGV   = contracts.reduce((sum, c) => sum + c.value, 0);
  const assinados  = contracts.filter((c) => c.status === "assinado").length;
  const pendentes  = contracts.filter((c) => c.status === "pendente").length;

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
          onClick={() => router.push("/cockpit/contratos/novo")}
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

      {/* Error state */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/5 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={refetch}
            className="mt-2 text-xs font-medium text-red-500 hover:text-red-600 underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

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
          onCancelContract={handleCancelContract}
        />
      )}

      {/* Drawer */}
      <ContractDrawer
        contract={selectedContract}
        onClose={() => setSelectedContract(null)}
        onContractUpdated={handleContractUpdated}
      />

    </div>
  );
}
