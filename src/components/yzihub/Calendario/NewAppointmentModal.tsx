"use client";

import { useState, useEffect } from "react";
import { CloseIcon } from "@/icons";
import { useTenantContext } from "@/context/TenantContext";
import { createClient } from "@/lib/supabase/client";
import {
  APPOINTMENT_TYPE_LABELS,
  type AppointmentType,
  type AppointmentStatus,
  type NewAppointmentInput,
} from "@/types/appointments";

// ─── Input styles (mesmo padrão de Contratos/NewContractModal.tsx) ────────────

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-colors";

const labelCls =
  "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";

// ─── Option types ─────────────────────────────────────────────────────────────

interface LeadOption {
  id:   string;
  name: string;
}

interface BrokerOption {
  id:        string;
  full_name: string;
}

// ─── Initial form state ───────────────────────────────────────────────────────

interface FormState {
  title:            string;
  appointment_type: AppointmentType;
  lead_id:          string;
  broker_id:        string;
  start_at:         string;
  end_at:           string;
  location:         string;
  description:      string;
}

const INITIAL_FORM: FormState = {
  title:            "",
  appointment_type: "visita",
  lead_id:          "",
  broker_id:        "",
  start_at:         "",
  end_at:           "",
  location:         "",
  description:      "",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface NewAppointmentModalProps {
  isOpen:    boolean;
  onClose:   () => void;
  onCreated: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewAppointmentModal({
  isOpen,
  onClose,
  onCreated,
}: NewAppointmentModalProps) {
  const { tenant } = useTenantContext();

  const [form, setForm]             = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [leads, setLeads]     = useState<LeadOption[]>([]);
  const [brokers, setBrokers] = useState<BrokerOption[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Buscar leads e corretores quando modal abre
  useEffect(() => {
    if (!isOpen || !tenant?.id) return;

    const supabase = createClient();
    setLoadingData(true);

    async function fetchData() {
      try {
        const [leadsRes, brokersRes] = await Promise.all([
          supabase
            .from("leads")
            .select("id, name")
            .eq("tenant_id", tenant!.id)
            .order("name"),
          supabase
            .from("brokers")
            .select("id, full_name")
            .eq("tenant_id", tenant!.id)
            .eq("is_active", true)
            .order("full_name"),
        ]);

        if (leadsRes.data) {
          setLeads(leadsRes.data as LeadOption[]);
        }
        if (brokersRes.data) {
          setBrokers(brokersRes.data as BrokerOption[]);
        }
      } catch {
        // Non-fatal — usuário pode continuar sem selecionar lead/corretor
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, [isOpen, tenant?.id]);

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title.trim()) {
      setSubmitError("O título do compromisso é obrigatório.");
      return;
    }
    if (!form.start_at) {
      setSubmitError("A data/hora de início é obrigatória.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      // Converter datetime-local (sem TZ) para ISO string
      const body: NewAppointmentInput & { status?: AppointmentStatus } = {
        title:            form.title.trim(),
        appointment_type: form.appointment_type,
        start_at:         new Date(form.start_at).toISOString(),
        status:           "agendado",
      };

      if (form.end_at)      body.end_at      = new Date(form.end_at).toISOString();
      if (form.lead_id)     body.lead_id     = form.lead_id;
      if (form.broker_id)   body.broker_id   = form.broker_id;
      if (form.location)    body.location    = form.location.trim() || null;
      if (form.description) body.description = form.description.trim() || null;

      const res = await fetch("/api/appointments", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        setSubmitError(json.error ?? "Erro ao salvar compromisso. Tente novamente.");
        return;
      }

      // Sucesso — resetar e notificar
      setForm(INITIAL_FORM);
      onCreated();
    } catch {
      setSubmitError("Erro ao salvar compromisso. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setForm(INITIAL_FORM);
    setSubmitError(null);
    onClose();
  }

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
                Novo compromisso
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Preencha os dados para agendar
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>

          {/* Form */}
          <form
            id="new-appointment-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
          >
            {/* Título */}
            <div>
              <label className={labelCls}>Título *</label>
              <input
                type="text"
                placeholder="Ex: Visita ao Apto Bessa"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                required
                className={inputCls}
              />
            </div>

            {/* Tipo */}
            <div>
              <label className={labelCls}>Tipo *</label>
              <select
                value={form.appointment_type}
                onChange={(e) =>
                  handleChange("appointment_type", e.target.value as AppointmentType)
                }
                className={inputCls}
              >
                {(Object.entries(APPOINTMENT_TYPE_LABELS) as [AppointmentType, string][]).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Lead (opcional) */}
            <div>
              <label className={labelCls}>
                Lead{" "}
                <span className="text-gray-400 font-normal">(opcional)</span>
                {loadingData && (
                  <span className="ml-1 text-gray-400">(carregando...)</span>
                )}
              </label>
              <select
                value={form.lead_id}
                onChange={(e) => handleChange("lead_id", e.target.value)}
                className={inputCls}
              >
                <option value="">— Sem lead —</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Responsável / Corretor (opcional) */}
            <div>
              <label className={labelCls}>
                Responsável{" "}
                <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <select
                value={form.broker_id}
                onChange={(e) => handleChange("broker_id", e.target.value)}
                className={inputCls}
              >
                <option value="">— Sem responsável —</option>
                {brokers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Data início + fim (2 cols) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Início *</label>
                <input
                  type="datetime-local"
                  value={form.start_at}
                  onChange={(e) => handleChange("start_at", e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Fim{" "}
                  <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={form.end_at}
                  onChange={(e) => handleChange("end_at", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Local / Link */}
            <div>
              <label className={labelCls}>
                Local / Link{" "}
                <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Endereço, Meet/Zoom URL, ou local"
                value={form.location}
                onChange={(e) => handleChange("location", e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Descrição */}
            <div>
              <label className={labelCls}>
                Descrição{" "}
                <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={3}
                placeholder="Observações sobre o compromisso..."
                className={`${inputCls} resize-none`}
              />
            </div>

            {/* Erro de submit */}
            {submitError && (
              <p className="text-xs text-red-500 dark:text-red-400">{submitError}</p>
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
              form="new-appointment-form"
              disabled={submitting}
              className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 active:scale-95 disabled:opacity-50 transition-all"
            >
              {submitting ? "Salvando..." : "Salvar compromisso"}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
