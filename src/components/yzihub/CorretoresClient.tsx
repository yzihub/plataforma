"use client";

import { useEffect, useMemo, useState } from "react";
import { useTenant } from "@/hooks/useTenant";
import type { Broker, BrokerInput } from "@/types/brokers";
import CorretorDrawer from "@/components/yzihub/CorretorDrawer";
import CorretoresKpiStrip from "@/components/yzihub/CorretoresKpiStrip";

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-gray-100 dark:border-gray-800">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-5 py-4 sm:px-6">
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="rounded-full bg-success-50 px-2 py-0.5 text-theme-xs font-medium text-success-700 dark:bg-success-500/15 dark:text-success-500">
        Ativo
      </span>
    );
  }

  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
      Inativo
    </span>
  );
}

type CorretoresResponse = {
  data?: Broker[];
  stats?: {
    leadReceivedCounts?: Record<string, number>;
    assignedDealCounts?: Record<string, number>;
  };
};

export default function CorretoresClient() {
  const { tenant, loading: tenantLoading } = useTenant();

  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [leadCounts, setLeadCounts] = useState<Record<string, number>>({});
  const [dealCounts, setDealCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null);

  useEffect(() => {
    if (tenantLoading) return;
    if (!tenant?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      setLoading(true);

      const res = await fetch("/api/corretores");
      if (cancelled) return;

      if (res.ok) {
        const body = (await res.json()) as CorretoresResponse;
        setBrokers(body.data ?? []);
        setLeadCounts(body.stats?.leadReceivedCounts ?? {});
        setDealCounts(body.stats?.assignedDealCounts ?? {});
      } else {
        setError("Erro ao buscar corretores.");
      }

      setLoading(false);
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [tenant?.id, tenantLoading]);

  const rankingTop5 = useMemo(() => {
    return [...brokers]
      .sort((a, b) => {
        const diff = (leadCounts[b.id] ?? 0) - (leadCounts[a.id] ?? 0);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 5);
  }, [brokers, leadCounts]);

  const maxLeads = rankingTop5[0] ? (leadCounts[rankingTop5[0].id] ?? 0) : 0;

  async function refetchBrokers() {
    const res = await fetch("/api/corretores");
    if (res.ok) {
      const body = (await res.json()) as CorretoresResponse;
      setBrokers(body.data ?? []);
      setLeadCounts(body.stats?.leadReceivedCounts ?? {});
      setDealCounts(body.stats?.assignedDealCounts ?? {});
    }
  }

  async function handleSave(input: BrokerInput, id?: string) {
    if (!tenant?.id) return;
    if (!input.name || input.name.trim().length < 2) throw new Error("Nome inválido");

    try {
      if (id) {
        const res = await fetch("/api/corretores", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...input }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string })?.error ?? "Falha ao atualizar corretor");
        }

        const { data } = (await res.json()) as { data: Broker };
        if (data) setBrokers((prev) => prev.map((b) => (b.id === id ? data : b)));
      } else {
        const payload = {
          tenant_id: tenant.id,
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          is_active: input.is_active ?? true,
          role: input.role ?? null,
          tipo: input.tipo ?? null,
          cpf: input.cpf ?? null,
          address: input.address ?? null,
          city: input.city ?? null,
          state: input.state ?? null,
          zip_code: input.zip_code ?? null,
          bank: input.bank ?? null,
          bank_agency: input.bank_agency ?? null,
          bank_account: input.bank_account ?? null,
          bank_account_type: input.bank_account_type ?? null,
          pix_key: input.pix_key ?? null,
          pix_key_type: input.pix_key_type ?? null,
          pix_beneficiary: input.pix_beneficiary ?? null,
          notes: input.notes ?? null,
        };

        const res = await fetch("/api/corretores/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string })?.error ?? "Falha ao criar corretor");
        }

        const now = new Date().toISOString();
        const optimisticBroker: Broker = {
          id: `optimistic-${Date.now()}`,
          tenant_id: tenant.id,
          name: payload.name,
          phone: payload.phone,
          email: payload.email,
          role: payload.role,
          tipo: payload.tipo,
          cpf: payload.cpf,
          is_active: payload.is_active,
          address: payload.address,
          city: payload.city,
          state: payload.state,
          zip_code: payload.zip_code,
          bank: payload.bank,
          bank_agency: payload.bank_agency,
          bank_account: payload.bank_account,
          bank_account_type: payload.bank_account_type,
          pix_key: payload.pix_key,
          pix_key_type: payload.pix_key_type,
          pix_beneficiary: payload.pix_beneficiary,
          notes: payload.notes,
          created_at: now,
          updated_at: now,
        };
        setBrokers((prev) => [optimisticBroker, ...prev]);
        setTimeout(() => {
          void refetchBrokers();
        }, 1500);
      }

      setDrawerOpen(false);
      setEditingBroker(null);
    } catch (err: unknown) {
      const e = err as { message?: string; details?: string };
      console.error("[CorretoresClient] handleSave error:", e);
      setError(`Erro ao salvar: ${e?.message ?? ""} ${e?.details ?? ""}`.trim());
      throw err;
    }
  }

  async function handleDelete(id: string) {
    if (!tenant?.id) return;

    const res = await fetch("/api/corretores", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error("[CorretoresClient] handleDelete error:", body);
      setError("Erro ao excluir corretor. Tente novamente.");
      return;
    }

    setBrokers((prev) => prev.filter((b) => b.id !== id));
    setDrawerOpen(false);
    setEditingBroker(null);
  }

  function openNewDrawer() {
    setError(null);
    setEditingBroker(null);
    setDrawerOpen(true);
  }

  function openEditDrawer(broker: Broker) {
    setError(null);
    setEditingBroker(broker);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingBroker(null);
  }

  return (
    <>
      <CorretoresKpiStrip
        brokers={brokers}
        leadCounts={leadCounts}
      />

      {error && (
        <div className="flex items-center justify-between gap-3 mt-6 rounded-xl border border-error-200 bg-error-50 dark:bg-error-500/10 dark:border-error-500/30 px-4 py-3 text-sm text-error-600 dark:text-error-400">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="shrink-0 text-error-400 hover:text-error-600 transition-colors"
            aria-label="Fechar"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-5">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Equipe Comercial
          </h3>
          <button
            onClick={openNewDrawer}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            <svg viewBox="0 0 20 20" className="size-4 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
            </svg>
            Novo Corretor
          </button>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800">
          <div className="max-w-full overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {["Nome", "Telefone", "Status", "Leads Recebidos / Deals", ""].map((col) => (
                    <th key={col} className="px-5 py-3 sm:px-6">
                      <div className="flex items-center">
                        <p className="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                          {col}
                        </p>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading && (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                )}

                {!loading && brokers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                      Nenhum corretor cadastrado ainda.{" "}
                      <button onClick={openNewDrawer} className="text-brand-500 hover:underline font-medium">
                        + Novo Corretor
                      </button>
                    </td>
                  </tr>
                )}

                {!loading &&
                  brokers.map((broker) => (
                    <tr key={broker.id}>
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300 shrink-0 select-none">
                            {broker.name
                              .trim()
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </div>
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {broker.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <p className="text-gray-500 text-theme-sm dark:text-gray-400">
                          {broker.phone ?? "—"}
                        </p>
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <StatusBadge active={broker.is_active} />
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <div className="space-y-0.5 tabular-nums">
                          <p className="text-gray-700 text-theme-sm dark:text-gray-100 font-medium">
                            Leads: {leadCounts[broker.id] ?? 0}
                          </p>
                          <p className="text-gray-500 text-theme-xs dark:text-gray-400">
                            Deals: {dealCounts[broker.id] ?? 0}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <button
                          onClick={() => openEditDrawer(broker)}
                          className="text-theme-xs font-medium text-brand-500 hover:text-brand-600 transition-colors"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-5 py-4 sm:px-6 sm:py-5">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Ranking por Leads
          </h3>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 p-5 sm:p-6">
          {rankingTop5.length === 0 ||
          rankingTop5.every((b) => (leadCounts[b.id] ?? 0) === 0) ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Nenhum lead atribuído ainda.
            </p>
          ) : (
            <ul className="space-y-4">
              {rankingTop5.map((broker, idx) => {
                const count = leadCounts[broker.id] ?? 0;
                const pct = maxLeads > 0 ? Math.round((count / maxLeads) * 100) : 0;
                return (
                  <li key={broker.id} className="flex items-center gap-4">
                    <span
                      className={`w-6 shrink-0 text-center text-xs font-bold tabular-nums ${
                        idx === 0
                          ? "text-warning-500"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      #{idx + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-theme-sm font-medium text-gray-700 dark:text-white/80 truncate">
                          {broker.name}
                        </span>
                        <span className="text-theme-xs font-semibold text-gray-600 dark:text-gray-300 tabular-nums shrink-0 ml-3">
                          {count}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${
                            idx === 0
                              ? "bg-brand-500"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <CorretorDrawer
        open={drawerOpen}
        broker={editingBroker}
        onClose={closeDrawer}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </>
  );
}
