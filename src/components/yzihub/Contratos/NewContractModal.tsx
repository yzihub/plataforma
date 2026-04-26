"use client";

import { useState, useEffect } from "react";
import { CloseIcon } from "@/icons";
import { useTenantContext } from "@/context/TenantContext";
import { createClient } from "@/lib/supabase/client";
import type { ContractStatus, ContractType, Contract } from "@/types/contracts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NewContractForm {
  lead_id:      string;
  lead_name:    string;
  project_id:   string;
  project_name: string;
  broker_id:    string;
  corretor_name: string;
  title:        string;
  value:        string;
  type:         ContractType;
  status:       ContractStatus;
  notes:        string;
}

interface LeadOption {
  id:   string;
  name: string;
}

interface PropertyOption {
  id:   string;
  name: string;
}

interface ProfileOption {
  id:        string;
  full_name: string | null;
}

const INITIAL_FORM: NewContractForm = {
  lead_id:       "",
  lead_name:     "",
  project_id:    "",
  project_name:  "",
  broker_id:     "",
  corretor_name: "",
  title:         "",
  value:         "",
  type:          "venda",
  status:        "draft",
  notes:         "",
};

const CONTRACT_TYPE_OPTIONS: { value: ContractType; label: string }[] = [
  { value: "venda",    label: "Venda"     },
  { value: "locacao",  label: "Locacao"   },
  { value: "servico",  label: "Servico"   },
  { value: "parceria", label: "Parceria"  },
];

const CONTRACT_STATUS_OPTIONS: { value: ContractStatus; label: string }[] = [
  { value: "draft",     label: "Rascunho"  },
  { value: "sent",      label: "Enviado"   },
  { value: "signed",    label: "Assinado"  },
  { value: "cancelled", label: "Cancelado" },
];

// ─── Input helper ─────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-colors";

const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";

// ─── Main Component ───────────────────────────────────────────────────────────

interface NewContractModalProps {
  isOpen:   boolean;
  onClose:  () => void;
  onSave?:  (body: Record<string, unknown>) => Promise<Contract | null>;
}

export default function NewContractModal({
  isOpen,
  onClose,
  onSave,
}: NewContractModalProps) {
  const { tenant } = useTenantContext();

  const [form, setForm]             = useState<NewContractForm>(INITIAL_FORM);
  const [leadSearch, setLeadSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Supabase real data
  const [leads, setLeads]           = useState<LeadOption[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [corretores, setCorretores] = useState<ProfileOption[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // File attachment
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  // Fetch real data when modal opens
  useEffect(() => {
    if (!isOpen || !tenant?.id) return;

    const supabase = createClient();
    setLoadingData(true);

    async function fetchData() {
      try {
        const [leadsRes, propsRes, profilesRes] = await Promise.all([
          supabase
            .from("leads")
            .select("id, name")
            .eq("tenant_id", tenant!.id)
            .order("name"),
          supabase
            .from("properties")
            .select("id, title")
            .eq("tenant_id", tenant!.id)
            .order("title"),
          supabase
            .from("profiles")
            .select("id, full_name")
            .eq("tenant_id", tenant!.id)
            .order("full_name"),
        ]);

        if (leadsRes.data) {
          setLeads(leadsRes.data.map((l: { id: string; name: string }) => ({ id: l.id, name: l.name })));
        }
        if (propsRes.data) {
          setProperties(
            propsRes.data.map((p: { id: string; title: string }) => ({ id: p.id, name: p.title }))
          );
        }
        if (profilesRes.data) {
          setCorretores(profilesRes.data as ProfileOption[]);
        }
      } catch {
        // Non-fatal: user can still type manually
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, [isOpen, tenant?.id]);

  function handleChange<K extends keyof NewContractForm>(key: K, value: NewContractForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.lead_name.trim()) {
      setSubmitError("Selecione ou informe o nome do lead");
      return;
    }
    if (!form.value || parseFloat(form.value) < 0) {
      setSubmitError("Informe um valor valido");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const body: Record<string, unknown> = {
        lead_id:       form.lead_id       || null,
        lead_name:     form.lead_name.trim(),
        project_id:    form.project_id    || null,
        project_name:  form.project_name  || null,
        broker_id:     form.broker_id     || null,
        corretor_name: form.corretor_name || null,
        title:         form.title.trim()  || null,
        value:         parseFloat(form.value),
        type:          form.type,
        status:        form.status,
        notes:         form.notes.trim()  || null,
      };

      const created = await onSave?.(body);

      // If file attached and contract was created, upload it
      if (created && attachedFile) {
        const fileData = new FormData();
        fileData.append("file", attachedFile);
        await fetch(`/api/contracts/${created.id}`, {
          method: "POST",
          body: fileData,
        });
      }

      handleClose();
    } catch {
      setSubmitError("Erro ao criar contrato. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setForm(INITIAL_FORM);
    setLeadSearch("");
    setSubmitError(null);
    setAttachedFile(null);
    onClose();
  }

  // Lead search filter
  const filteredLeads = leads.filter((l) =>
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

            {/* Titulo do contrato */}
            <div>
              <label className={labelCls}>Titulo do Contrato</label>
              <input
                type="text"
                placeholder="Ex: Compra e Venda - Apto Vista Mar"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Lead (searchable com dados reais) */}
            <div>
              <label className={labelCls}>
                Lead *
                {loadingData && <span className="ml-1 text-gray-400">(carregando...)</span>}
              </label>
              <input
                type="text"
                placeholder="Buscar lead pelo nome..."
                value={leadSearch}
                onChange={(e) => {
                  setLeadSearch(e.target.value);
                  // Se digitou algo que nao bate com selecao, limpar lead_id
                  if (form.lead_name && e.target.value !== form.lead_name) {
                    handleChange("lead_id", "");
                    handleChange("lead_name", e.target.value);
                  }
                }}
                className={inputCls}
              />
              {leadSearch && filteredLeads.length > 0 && !form.lead_id && (
                <div className="mt-1 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden shadow-md max-h-40 overflow-y-auto">
                  {filteredLeads.map((lead) => (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => {
                        handleChange("lead_id", lead.id);
                        handleChange("lead_name", lead.name);
                        setLeadSearch(lead.name);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                    >
                      {lead.name}
                    </button>
                  ))}
                </div>
              )}
              {leadSearch && filteredLeads.length === 0 && !loadingData && (
                <p className="mt-1 text-xs text-gray-400">
                  Nenhum lead encontrado. O nome digitado sera usado diretamente.
                </p>
              )}
            </div>

            {/* Imovel / Projeto */}
            <div>
              <label className={labelCls}>Imovel / Projeto</label>
              <select
                value={form.project_id}
                onChange={(e) => {
                  const selected = properties.find((p) => p.id === e.target.value);
                  handleChange("project_id", e.target.value);
                  handleChange("project_name", selected?.name ?? "");
                }}
                className={inputCls}
              >
                <option value="">Selecionar imovel...</option>
                {properties.map((p) => (
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
                value={form.broker_id}
                onChange={(e) => {
                  const selected = corretores.find((c) => c.id === e.target.value);
                  handleChange("broker_id", e.target.value);
                  handleChange("corretor_name", selected?.full_name ?? "");
                }}
                className={inputCls}
              >
                <option value="">Selecionar corretor...</option>
                {corretores.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name ?? c.id}
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

            {/* Arquivo (opcional) */}
            <div>
              <label className={labelCls}>Arquivo (opcional)</label>
              <label className="flex items-center gap-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-3 cursor-pointer hover:border-brand-400 hover:bg-brand-50/20 dark:hover:bg-brand-500/5 transition-colors">
                <span className="text-lg">📎</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {attachedFile ? attachedFile.name : "PDF ou DOCX (max 10MB)"}
                </span>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  className="hidden"
                  onChange={(e) => setAttachedFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            {/* Error */}
            {submitError && (
              <p className="text-xs text-red-500">{submitError}</p>
            )}
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
              disabled={submitting}
              className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 active:scale-95 disabled:opacity-50 transition-all"
            >
              {submitting ? "Criando..." : "Criar Contrato"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
