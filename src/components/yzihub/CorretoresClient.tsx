"use client";

import { useEffect, useState } from "react";
import { useTenant } from "@/hooks/useTenant";
import { createClient } from "@/lib/supabase/client";
import type { Broker, BrokerInput } from "@/types/brokers";
import CorretorDrawer from "@/components/yzihub/CorretorDrawer";

// ─── Table name (decisao: option-a — tabela brokers dedicada) ─────────────────

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

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CorretoresClient() {
  const { tenant, loading: tenantLoading } = useTenant();

  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null);

  // ── Fetch brokers filtered by tenant ────────────────────────────────────────

  useEffect(() => {
    if (tenantLoading) return;
    if (!tenant?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchBrokers() {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from(BROKERS_TABLE)
        .select("id, tenant_id, full_name, phone, email, role, created_at, updated_at")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (!error && data) {
        setBrokers(data as Broker[]);
      }
      setLoading(false);
    }

    fetchBrokers();

    return () => {
      cancelled = true;
    };
  }, [tenant?.id, tenantLoading]);

  // ── CRUD handlers ────────────────────────────────────────────────────────────

  async function handleSave(input: BrokerInput, id?: string) {
    if (!tenant?.id) return;

    const supabase = createClient();

    try {
      if (id) {
        // Update
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
        // Insert
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
      throw err; // re-throw so drawer can show local error too
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
              {["Nome", "Telefone", "E-mail", "Função", "Ações"].map((col) => (
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
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
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
