"use client";

import { useEffect, useMemo, useState } from "react";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";
import type { Broker, BrokerInput } from "@/types/brokers";
import CorretorDrawer from "@/components/yzihub/CorretorDrawer";
import CorretoresKpiStrip from "@/components/yzihub/CorretoresKpiStrip";

// ─── Table name ───────────────────────────────────────────────────────────────

const BROKERS_TABLE = "brokers";

// ─── Role label helper ────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  senior: "Sênior",
  junior: "Júnior",
  manager: "Gerente",
};

function roleLabel(role: string | null): string {
  if (!role) return "—";
  return ROLE_LABELS[role] ?? role;
}

// ─── Loading skeleton (7 columns) ─────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-2.5 py-0.5 text-xs font-medium">
        Ativo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 px-2.5 py-0.5 text-xs font-medium">
      Inativo
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CorretoresClient() {
  const { tenant, loading: tenantLoading } = useTenant();

  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [leads, setLeads] = useState<Array<{ id: string; assigned_to: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null);

  // ── Fetch brokers + leads filtered by tenant ─────────────────────────────────

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
          .select("id, tenant_id, full_name, phone, email, role, is_active, created_at, updated_at")
          .eq("tenant_id", tenant!.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("leads")
          .select("id, assigned_to")
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

    return () => {
      cancelled = true;
    };
  }, [tenant?.id, tenantLoading]);

  // ── Lead counts per broker ────────────────────────────────────────────────────

  const leadCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const lead of leads) {
      if (lead.assigned_to) {
        counts[lead.assigned_to] = (counts[lead.assigned_to] ?? 0) + 1;
      }
    }
    return counts;
  }, [leads]);

  // ── Top 5 ranking ────────────────────────────────────────────────────────────

  const rankingTop5 = useMemo(() => {
    return [...brokers]
      .sort((a, b) => {
        const diff = (leadCounts[b.id] ?? 0) - (leadCounts[a.id] ?? 0);
        if (diff !== 0) return diff;
        return a.full_name.localeCompare(b.full_name);
      })
      .slice(0, 5);
  }, [brokers, leadCounts]);

  // ── CRUD handlers ────────────────────────────────────────────────────────────

  async function handleSave(input: BrokerInput, id?: string) {
    if (!tenant?.id) return;

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

        if (data) {
          setBrokers((prev) =>
            prev.map((b) => (b.id === id ? (data as Broker) : b))
          );
        }
      } else {
        const { data, error: insertError } = await supabase
          .from(BROKERS_TABLE)
          .insert({ ...input, tenant_id: tenant.id })
          .select()
          .single();

        if (insertError) throw insertError;

        if (data) {
          setBrokers((prev) => [data as Broker, ...prev]);
        }
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

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* KPI Strip */}
      <div className="mb-6">
        <CorretoresKpiStrip brokers={brokers} leadCounts={leadCounts} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between gap-3 mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="shrink-0 text-red-400 hover:text-red-600 transition-colors"
            aria-label="Fechar"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Header + action */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Equipe comercial
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Corretores vinculados ao tenant ativo
          </p>
        </div>
        <button
          onClick={openNewDrawer}
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
        >
          <span className="text-base leading-none">+</span>
          Novo Corretor
        </button>
      </div>

      {/* Table card */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:bg-white/[0.03] dark:border-gray-800 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              {["Nome", "Telefone", "E-mail", "Função", "Status", "Leads", "Ações"].map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
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
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                  Nenhum corretor cadastrado ainda. Clique em{" "}
                  <button
                    onClick={openNewDrawer}
                    className="text-brand-500 hover:underline font-medium"
                  >
                    + Novo Corretor
                  </button>{" "}
                  para começar.
                </td>
              </tr>
            )}

            {/* Rows */}
            {!loading &&
              brokers.map((broker) => (
                <tr
                  key={broker.id}
                  className="border-b border-gray-50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white/90">
                    {broker.full_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {broker.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {broker.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {roleLabel(broker.role)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge active={broker.is_active} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                    {leadCounts[broker.id] ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEditDrawer(broker)}
                      className="text-xs font-medium text-brand-500 hover:underline"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Ranking por leads */}
      <div className="mt-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">
          Ranking por Leads
        </h3>

        {rankingTop5.length === 0 || rankingTop5.every((b) => (leadCounts[b.id] ?? 0) === 0) ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Nenhum lead atribuido ainda
          </p>
        ) : (
          <ul className="space-y-2">
            {rankingTop5.map((broker, idx) => (
              <li
                key={broker.id}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-5 shrink-0 text-right">
                    #{idx + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-700 dark:text-white/80 truncate">
                    {broker.full_name}
                  </span>
                </div>
                <span className="text-sm font-semibold text-brand-500 shrink-0 tabular-nums">
                  {leadCounts[broker.id] ?? 0}
                </span>
              </li>
            ))}
          </ul>
        )}
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
