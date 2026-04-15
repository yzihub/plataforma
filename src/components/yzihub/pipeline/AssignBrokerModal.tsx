"use client";

import { useState } from "react";
import type { Lead } from "@/lib/crm/types";

interface Broker {
  id: string;
  name: string;
}

interface AssignBrokerModalProps {
  open: boolean;
  lead: Lead | null;
  brokers: Broker[];
  mode: "assign" | "reassign";
  onClose: () => void;
  onConfirm: (leadId: string, brokerId: string) => void;
}

export default function AssignBrokerModal({
  open,
  lead,
  brokers,
  mode,
  onClose,
  onConfirm,
}: AssignBrokerModalProps) {
  const [selectedBrokerId, setSelectedBrokerId] = useState("");

  if (!open || !lead) return null;

  const title = mode === "assign" ? "Enviar para Corretor" : "Alterar Corretor";
  const description = mode === "assign"
    ? `Atribuir o lead "${lead.name}" a um corretor.`
    : `Alterar o corretor responsável pelo lead "${lead.name}".`;

  function handleConfirm() {
    if (!selectedBrokerId || !lead) return;
    onConfirm(lead.id, selectedBrokerId);
    setSelectedBrokerId("");
  }

  function handleClose() {
    setSelectedBrokerId("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/[0.08]">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h2>
            <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">{description}</p>
          </div>
          <button
            onClick={handleClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.08] text-gray-400 dark:text-white/40 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <label className="block text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wide mb-2">
            Selecionar Corretor
          </label>
          <select
            value={selectedBrokerId}
            onChange={(e) => setSelectedBrokerId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] px-3 py-2.5 text-sm text-gray-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">-- Escolha um corretor --</option>
            {brokers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {brokers.length === 0 && (
            <p className="text-xs text-warning-500 mt-2">
              Nenhum corretor cadastrado. Adicione corretores em Configurações.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-white/[0.08]">
          <button
            onClick={handleClose}
            className="rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] hover:bg-gray-50 dark:hover:bg-white/[0.08] px-4 py-2 text-sm text-gray-700 dark:text-white/70 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedBrokerId}
            className="rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm text-white font-medium transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
