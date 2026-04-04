"use client";

import { useState } from "react";
import { CloseIcon } from "@/icons";
import type { ContractStatus, ContractType } from "@/types/contracts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NewContractForm {
  lead_id: string;
  lead_name: string;
  project_id: string;
  corretor_id: string;
  value: string;
  type: ContractType;
  status: ContractStatus;
  notes: string;
}

const INITIAL_FORM: NewContractForm = {
  lead_id: "",
  lead_name: "",
  project_id: "",
  corretor_id: "",
  value: "",
  type: "venda",
  status: "rascunho",
  notes: "",
};

// ─── Mock select options (substituir por queries Supabase) ────────────────────

const MOCK_LEADS = [
  { id: "lead-jurema-001", name: "Adriana Fontenele" },
  { id: "lead-jurema-002", name: "Carlos Henrique Lima" },
  { id: "lead-jurema-003", name: "Patricia Vasconcelos" },
  { id: "lead-pam-001", name: "Isabela Torres" },
  { id: "lead-pam-002", name: "Ricardo Andrade" },
  { id: "lead-pam-003", name: "Ana Ligia Saraiva" },
];

const MOCK_PROPERTIES = [
  { id: "imovel-001", name: "Apto Vista Mar - Meireles" },
  { id: "imovel-002", name: "Casa Duplex - Aldeota" },
  { id: "imovel-003", name: "Studio Premium - Coco" },
  { id: "imovel-004", name: "Cobertura Duplex - Papicu" },
  { id: "projeto-pam-001", name: "Reforma Sala e Dois Quartos" },
  { id: "projeto-pam-002", name: "Design Escritorio Corporativo" },
];

const MOCK_CORRETORES = [
  { id: "corretor-luana", name: "Luana Azevedo" },
  { id: "corretor-joao", name: "Joao Melo" },
  { id: "corretor-pam", name: "Pamela Brandao" },
];

const CONTRACT_TYPE_OPTIONS: { value: ContractType; label: string }[] = [
  { value: "venda", label: "Venda" },
  { value: "locacao", label: "Locacao" },
  { value: "servico", label: "Servico" },
  { value: "parceria", label: "Parceria" },
];

const CONTRACT_STATUS_OPTIONS: { value: ContractStatus; label: string }[] = [
  { value: "rascunho", label: "Rascunho" },
  { value: "pendente", label: "Pendente" },
  { value: "assinado", label: "Assinado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "expirado", label: "Expirado" },
];

// ─── Input helper ─────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-colors";

const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";

// ─── Main Component ───────────────────────────────────────────────────────────

interface NewContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (form: NewContractForm) => void;
}

export default function NewContractModal({
  isOpen,
  onClose,
  onSave,
}: NewContractModalProps) {
  const [form, setForm] = useState<NewContractForm>(INITIAL_FORM);
  const [leadSearch, setLeadSearch] = useState("");

  function handleChange<K extends keyof NewContractForm>(
    key: K,
    value: NewContractForm[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave?.(form);
    setForm(INITIAL_FORM);
    setLeadSearch("");
    onClose();
  }

  function handleClose() {
    setForm(INITIAL_FORM);
    setLeadSearch("");
    onClose();
  }

  const filteredLeads = MOCK_LEADS.filter((l) =>
    l.name.toLowerCase().includes(leadSearch.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
                Novo Contrato
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Preencha os dados para criar um contrato
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* Lead (searchable) */}
            <div>
              <label className={labelCls}>Lead *</label>
              <input
                type="text"
                placeholder="Buscar lead pelo nome..."
                value={leadSearch}
                onChange={(e) => setLeadSearch(e.target.value)}
                className={inputCls}
              />
              {leadSearch && (
                <div className="mt-1 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden shadow-md">
                  {filteredLeads.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-gray-400">Nenhum lead encontrado</p>
                  ) : (
                    filteredLeads.map((lead) => (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => {
                          handleChange("lead_id", lead.id);
                          handleChange("lead_name", lead.name);
                          setLeadSearch(lead.name);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04] ${
                          form.lead_id === lead.id
                            ? "text-brand-500 font-medium bg-brand-50/30 dark:bg-brand-500/5"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {lead.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Imovel */}
            <div>
              <label className={labelCls}>Imovel / Projeto</label>
              <select
                value={form.project_id}
                onChange={(e) => handleChange("project_id", e.target.value)}
                className={inputCls}
              >
                <option value="">Selecionar imovel...</option>
                {MOCK_PROPERTIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Corretor */}
            <div>
              <label className={labelCls}>Corretor</label>
              <select
                value={form.corretor_id}
                onChange={(e) => handleChange("corretor_id", e.target.value)}
                className={inputCls}
              >
                <option value="">Selecionar corretor...</option>
                {MOCK_CORRETORES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Valor + Tipo (2 cols) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Valor (R$) *</label>
                <input
                  type="number"
                  placeholder="Ex: 320000"
                  value={form.value}
                  onChange={(e) => handleChange("value", e.target.value)}
                  min={0}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) => handleChange("type", e.target.value as ContractType)}
                  className={inputCls}
                >
                  {CONTRACT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className={labelCls}>Status</label>
              <select
                value={form.status}
                onChange={(e) => handleChange("status", e.target.value as ContractStatus)}
                className={inputCls}
              >
                {CONTRACT_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notas */}
            <div>
              <label className={labelCls}>Notas</label>
              <textarea
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={3}
                placeholder="Observacoes sobre o contrato..."
                className={`${inputCls} resize-none`}
              />
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form=""
              onClick={handleSubmit}
              className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 active:scale-95 transition-all"
            >
              Criar Contrato
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
