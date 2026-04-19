"use client";

import { useRouter } from "next/navigation";
import { CloseIcon } from "@/icons";
import type { Lead } from "@/lib/crm/types";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface GerarContratoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  brokerId?: string | null;
  brokerName?: string | null;
  propertyId?: string | null;
  propertyTitle?: string | null;
}

// Padrão visual aprovado (mantido do original)
const readonlyCls =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400 cursor-not-allowed select-none";
const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GerarContratoDrawer({
  isOpen,
  onClose,
  lead,
  brokerId,
  brokerName,
  propertyId,
  propertyTitle,
}: GerarContratoDrawerProps) {
  const router = useRouter();

  // Verificar requisitos mínimos
  const imovelDisplay = propertyTitle ?? lead?.imovel_ref ?? null;
  const canOpen = !!lead && !!propertyId && !!brokerId;

  const missingItems: string[] = [];
  if (!lead) missingItems.push("lead");
  if (!propertyId) missingItems.push("imóvel");
  if (!brokerId) missingItems.push("corretor");

  function handleOpenEditor() {
    if (!canOpen) return;
    const params = new URLSearchParams();
    if (lead?.id) params.set("lead_id", lead.id);
    if (propertyId) params.set("property_id", propertyId);
    if (brokerId) params.set("broker_id", brokerId);
    router.push(`/cockpit/contratos/novo?${params.toString()}`);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-[480px] max-w-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white">
              Gerar Contrato
            </h2>
            {lead && (
              <p className="text-xs text-gray-400 mt-0.5">{lead.name}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col flex-1 min-h-0 px-6 py-5 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-600">

          {/* Mensagem explicativa */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Voce sera levado ao editor completo do contrato, com escolha de template e edicao livre do texto antes de enviar.
          </p>

          {/* Card resumo */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-4 space-y-3 mb-5">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
              Dados do Contrato
            </p>

            <div>
              <label className={labelCls}>Comprador / Locatario</label>
              <div className={readonlyCls}>
                {lead?.name ?? <span className="text-red-400">Lead nao selecionado</span>}
              </div>
            </div>

            <div>
              <label className={labelCls}>Imovel</label>
              <div className={readonlyCls}>
                {imovelDisplay ?? <span className="text-red-400">Imovel nao vinculado</span>}
              </div>
            </div>

            <div>
              <label className={labelCls}>Corretor Responsavel</label>
              <div className={readonlyCls}>
                {brokerName ?? <span className="text-red-400">Corretor nao vinculado</span>}
              </div>
            </div>

            {lead && lead.value > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Valor</label>
                  <div className={readonlyCls}>{formatBRL(lead.value)}</div>
                </div>
                <div>
                  <label className={labelCls}>Comissao (5%)</label>
                  <div className={readonlyCls}>{formatBRL(lead.value * 0.05)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Aviso de itens faltando */}
          {!canOpen && (
            <div className="rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 mb-4">
              Faltando: {missingItems.join(", ")} — vincule os dados ao lead antes de gerar o contrato.
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleOpenEditor}
            disabled={!canOpen}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors active:scale-95"
          >
            Abrir Editor
          </button>
        </div>
      </div>
    </>
  );
}
