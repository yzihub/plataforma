"use client";

import { useState, useEffect, useCallback } from "react";
import type { Appointment } from "@/types/appointments";
import IntegrationStatusBanner from "./IntegrationStatusBanner";
import AppointmentList from "./AppointmentList";
import NewAppointmentModal from "./NewAppointmentModal";

// ─── CalendarioClient ─────────────────────────────────────────────────────────
// Client component principal do módulo de Calendário Operacional.
// Responsabilidades:
//   - Buscar compromissos futuros via GET /api/appointments?upcoming=true
//   - Exibir banner de status de integração (read-only, sem chamar n8n)
//   - Exibir lista de compromissos
//   - Abrir/fechar modal "Novo compromisso"

export default function CalendarioClient() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen]   = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments?upcoming=true");
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setError(json.error ?? "Erro ao buscar compromissos.");
        setAppointments([]);
        return;
      }

      setAppointments(json.appointments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            Calendário operacional
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Próximos compromissos da equipe
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 active:scale-95 transition-all"
        >
          <span aria-hidden="true">+</span>
          Novo compromisso
        </button>
      </div>

      {/* Banner de integração (read-only — não chama n8n) */}
      <IntegrationStatusBanner provider={null} status="pendente" />

      {/* Lista de compromissos */}
      <AppointmentList
        appointments={appointments}
        loading={loading}
        error={error}
      />

      {/* Modal novo compromisso */}
      <NewAppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => {
          setIsModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
