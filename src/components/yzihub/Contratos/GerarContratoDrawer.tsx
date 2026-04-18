"use client";

import { useState, useEffect } from "react";
import { CloseIcon } from "@/icons";
import type { Lead } from "@/lib/crm/types";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ContractModel = string;

interface GerarContratoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  brokerId?: string | null;
  brokerName?: string | null;
  propertyId?: string | null;
  propertyTitle?: string | null;
}

interface GerarContratoForm {
  modelo: ContractModel;
  comprador: string;
  vendedor: string;
  imovel: string;
  corretor: string;
  valor: string;
  forma_pagamento: string;
  comissao: string;
  observacoes: string;
  canais: { whatsapp: boolean; email: boolean };
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const CONTRACT_MODELS = [
  { value: "compra_venda_padrao",  label: "Compra e Venda — Padrao" },
  { value: "compra_venda_casa",    label: "Compra e Venda — Casa" },
  { value: "compra_venda_permuta", label: "Compra e Venda — Permuta" },
  { value: "compra_venda_area",    label: "Compra e Venda — Area" },
  { value: "locacao",              label: "Locacao" },
  { value: "honorarios",           label: "Honorarios" },
];

const FORMA_PAGAMENTO_OPTIONS = [
  "A vista",
  "Financiamento bancario",
  "Parcelado entre as partes",
  "FGTS",
  "Permuta",
];

// Padrao visual aprovado (copiado de NewContractModal)
const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-colors";
const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initForm(
  lead: Lead | null,
  brokerName?: string | null,
  propertyTitle?: string | null,
): GerarContratoForm {
  return {
    modelo:          "",
    comprador:       lead?.name ?? "",
    vendedor:        "",
    imovel:          propertyTitle ?? lead?.imovel_ref ?? "",
    corretor:        brokerName ?? "",
    valor:           lead && lead.value > 0 ? String(lead.value) : "",
    forma_pagamento: "",
    comissao:        "",
    observacoes:     lead?.notes ?? "",
    canais: {
      whatsapp: !!lead?.phone,
      email:    !!lead?.email,
    },
  };
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
  const [form, setForm] = useState<GerarContratoForm>(() =>
    initForm(lead, brokerName, propertyTitle),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Re-inicializa o formulario quando o lead muda ou o drawer abre
  useEffect(() => {
    if (isOpen) {
      setForm(initForm(lead, brokerName, propertyTitle));
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, lead?.id]);

  function set<K extends keyof GerarContratoForm>(
    key: K,
    value: GerarContratoForm[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setCanal(canal: "whatsapp" | "email", value: boolean) {
    setForm((prev) => ({
      ...prev,
      canais: { ...prev.canais, [canal]: value },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.modelo) {
      setError("Selecione um modelo de contrato.");
      return;
    }

    if (!lead) {
      setError("Nenhum lead selecionado.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/contracts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id:         lead.id,
          property_id:     propertyId ?? null,
          broker_id:       brokerId ?? null,
          tenant_id:       lead.tenant_id,
          modelo:          form.modelo,
          comprador:       form.comprador,
          vendedor:        form.vendedor,
          imovel:          form.imovel,
          corretor:        form.corretor,
          valor:           form.valor,
          forma_pagamento: form.forma_pagamento,
          comissao:        form.comissao,
          observacoes:     form.observacoes,
          canais:          form.canais,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro ao gerar contrato.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch {
      setError("Erro de conexao. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
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
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-600">

            {/* 1. Modelo de Contrato */}
            <div>
              <label className={labelCls}>
                Modelo de Contrato <span className="text-red-400">*</span>
              </label>
              <select
                value={form.modelo}
                onChange={(e) => set("modelo", e.target.value)}
                className={inputCls}
                required
              >
                <option value="">Selecionar modelo...</option>
                {CONTRACT_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Comprador + Vendedor */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Comprador / Locatario</label>
                <input
                  type="text"
                  value={form.comprador}
                  onChange={(e) => set("comprador", e.target.value)}
                  className={inputCls}
                  placeholder="Nome do comprador"
                />
              </div>
              <div>
                <label className={labelCls}>Vendedor / Locador</label>
                <input
                  type="text"
                  value={form.vendedor}
                  onChange={(e) => set("vendedor", e.target.value)}
                  className={inputCls}
                  placeholder="Nome do vendedor"
                />
              </div>
            </div>

            {/* 3. Imovel */}
            <div>
              <label className={labelCls}>Imovel</label>
              <input
                type="text"
                value={form.imovel}
                onChange={(e) => set("imovel", e.target.value)}
                className={inputCls}
                placeholder="Referencia ou descricao do imovel"
              />
            </div>

            {/* 4. Corretor Responsavel */}
            <div>
              <label className={labelCls}>Corretor Responsavel</label>
              <input
                type="text"
                value={form.corretor}
                onChange={(e) => set("corretor", e.target.value)}
                className={inputCls}
                placeholder="Nome do corretor"
              />
            </div>

            {/* 5. Valor + Comissao */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Valor (R$)</label>
                <input
                  type="number"
                  value={form.valor}
                  onChange={(e) => set("valor", e.target.value)}
                  className={inputCls}
                  placeholder="0,00"
                  min={0}
                  step="0.01"
                />
              </div>
              <div>
                <label className={labelCls}>Comissao (%)</label>
                <input
                  type="number"
                  value={form.comissao}
                  onChange={(e) => set("comissao", e.target.value)}
                  className={inputCls}
                  placeholder="ex: 6"
                  min={0}
                  max={100}
                  step="0.01"
                />
              </div>
            </div>

            {/* 6. Forma de Pagamento */}
            <div>
              <label className={labelCls}>Forma de Pagamento</label>
              <select
                value={form.forma_pagamento}
                onChange={(e) => set("forma_pagamento", e.target.value)}
                className={inputCls}
              >
                <option value="">Selecionar...</option>
                {FORMA_PAGAMENTO_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            {/* 7. Observacoes */}
            <div>
              <label className={labelCls}>Observacoes</label>
              <textarea
                value={form.observacoes}
                onChange={(e) => set("observacoes", e.target.value)}
                rows={3}
                className={`${inputCls} resize-none`}
                placeholder="Observacoes adicionais sobre o contrato..."
              />
            </div>

            {/* 8. Canais de Envio */}
            <div>
              <p className={labelCls}>Canais de Envio</p>
              <div className="flex items-center gap-4 mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.canais.whatsapp}
                    onChange={(e) => setCanal("whatsapp", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-200">WhatsApp</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.canais.email}
                    onChange={(e) => setCanal("email", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-200">Email</span>
                </label>
              </div>
            </div>

            {/* Sucesso */}
            {success && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <svg className="size-4 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                Contrato enfileirado para geração.
              </div>
            )}

            {/* Erro */}
            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
                {error}
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
              type="submit"
              disabled={submitting || success || !form.modelo}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors active:scale-95"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Gerando...
                </>
              ) : (
                "Gerar e Enviar"
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
