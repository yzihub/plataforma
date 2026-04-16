"use client";

import { useEffect, useMemo, useState } from "react";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";
import type { Broker, BrokerInput } from "@/types/brokers";
import CorretorDrawer from "@/components/yzihub/CorretorDrawer";
import CorretoresKpiStrip from "@/components/yzihub/CorretoresKpiStrip";

// ─── Table name ───────────────────────────────────────────────────────────────

const BROKERS_TABLE = "brokers";

// ─── Loading skeleton (4 columns) ─────────────────────────────────────────────

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

// ─── Status badge ─────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function CorretoresClient() {
  const { tenant, loading: tenantLoading } = useTenant();

  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [leads, setLeads] = useState<
    Array<{ id: string; assigned_to: string | null; status: string | null }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (tenantLoading) return;
    if (!tenant?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      const supabase = createClient();

      const [brokersResult, leadsResult] = await Promise.all([
        supabase
          .from(BROKERS_TABLE)
          .select(
            "id, tenant_id, full_name, phone, email, role, is_active, created_at, updated_at"
          )
          .eq("tenant_id", tenant!.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("leads")
          .select("id, assigned_to, status")
          .eq("tenant_id", tenant!.id),
      ]);

      if (cancelled) return;

      if (!brokersResult.error && brokersResult.data) {
        setBrokers(brokersResult.data as Broker[]);
      }
      if (!leadsResult.error && leadsResult.data) {
        setLeads(leadsResult.data);
      }
      setLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  }, [tenant?.id, tenantLoading]);

  // ── Counts por broker ─────────────────────────────────────────────────────────

  const leadCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const lead of leads) {
      if (lead.assigned_to) {
        counts[lead.assigned_to] = (counts[lead.assigned_to] ?? 0) + 1;
      }
    }
    return counts;
  }, [leads]);

  const wonCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const lead of leads) {
      if (lead.assigned_to && lead.status === "won") {
        counts[lead.assigned_to] = (counts[lead.assigned_to] ?? 0) + 1;
      }
    }
    return counts;
  }, [leads]);

  // ── Top 5 ranking ─────────────────────────────────────────────────────────────

  const rankingTop5 = useMemo(() => {
    return [...brokers]
      .sort((a, b) => {
        const diff = (leadCounts[b.id] ?? 0) - (leadCounts[a.id] ?? 0);
        if (diff !== 0) return diff;
        return a.full_name.localeCompare(b.full_name);
      })
      .slice(0, 5);
  }, [brokers, leadCounts]);

  const maxLeads = rankingTop5[0] ? (leadCounts[rankingTop5[0].id] ?? 0) : 0;

  // ── CRUD handlers ─────────────────────────────────────────────────────────────

  async function handleSave(input: BrokerInput, id?: string) {
    if (!tenant?.id) return;
    if (!input.full_name || input.full_name.trim().length < 2) throw new Error("Nome inválido");
    const supabase = createClient();

    try {
      if (id) {
        const { data, error: updateError } = await supabase
          .from(BROKERS_TABLE)
          .update({ ...input, updated_at: new Date().toISOString() })
          .eq("id", id)
          .eq("tenant_id", tenant.id)
          .select()
          .single();

        if (updateError) throw updateError;
        if (data) setBrokers((prev) => prev.map((b) => (b.id === id ? (data as Broker) : b)));
      } else {
        const { data, error: insertError } = await supabase
          .from(BROKERS_TABLE)
          .insert({ ...input, is_active: input.is_active ?? true, tenant_id: tenant.id })
          .select()
          .single();

        if (insertError) throw insertError;
        if (data) setBrokers((prev) => [data as Broker, ...prev]);
      }

      setDrawerOpen(false);
      setEditingBroker(null);
    } catch (err) {
      console.error("[CorretoresClient] handleSave error:", err);
      setError("Erro ao salvar corretor. Tente novamente.");
      throw err;
    }
  }

  async function handleDelete(id: string) {
    if (!tenant?.id) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from(BROKERS_TABLE)
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenant.id);

    if (deleteError) {
      console.error("[CorretoresClient] handleDelete error:", deleteError);
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

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* KPI Strip */}
      <CorretoresKpiStrip
        brokers={brokers}
        leadCounts={leadCounts}
        wonCounts={wonCounts}
      />

      {/* Error banner */}
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

      {/* ── Tabela de corretores ── */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Table header */}
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

        {/* Table */}
        <div className="border-t border-gray-100 dark:border-gray-800">
          <div className="max-w-full overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {["Nome", "Telefone", "Status", "Leads Recebidos", ""].map((col) => (
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
                {/* Loading */}
                {loading && (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                )}

                {/* Empty state */}
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

                {/* Rows */}
                {!loading &&
                  brokers.map((broker) => (
                    <tr key={broker.id}>
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          {/* Avatar initials */}
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300 shrink-0 select-none">
                            {broker.full_name
                              .trim()
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </div>
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {broker.full_name}
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
                        <p className="text-gray-500 text-theme-sm dark:text-gray-400 tabular-nums">
                          {leadCounts[broker.id] ?? 0}
                        </p>
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

      {/* ── Ranking por leads ── */}
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
                    {/* Rank badge */}
                    <span
                      className={`w-6 shrink-0 text-center text-xs font-bold tabular-nums ${
                        idx === 0
                          ? "text-warning-500"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      #{idx + 1}
                    </span>

                    {/* Name + bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-theme-sm font-medium text-gray-700 dark:text-white/80 truncate">
                          {broker.full_name}
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

      {/* Drawer */}
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
