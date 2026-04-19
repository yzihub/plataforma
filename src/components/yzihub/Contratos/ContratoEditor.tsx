"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Lead } from "@/lib/crm/types";
import { renderTemplate } from "@/lib/contracts/templates";
import ContratoEditorSidebar from "./ContratoEditorSidebar";
import ContratoEditorPreview from "./ContratoEditorPreview";

// ─── Tipos locais ─────────────────────────────────────────────────────────────

interface TemplateOption {
  id: string;
  label: string;
  type: string;
}

interface PropertyData {
  id: string;
  titulo_comercial: string;
  bairro: string | null;
  valor: number;
}

interface BrokerData {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

interface ContratoEditorProps {
  leadId: string | null;
  propertyId: string | null;
  brokerId: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContratoEditor({ leadId, propertyId, brokerId }: ContratoEditorProps) {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [currentBody, setCurrentBody] = useState("");
  const [lead, setLead] = useState<Lead | null>(null);
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [broker, setBroker] = useState<BrokerData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  // ── Carregar dados iniciais em paralelo ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      setError(null);

      const tasks: Promise<void>[] = [];

      // Templates (lista resumida)
      tasks.push(
        fetch("/api/contracts/templates")
          .then((r) => r.json())
          .then((d) => { if (!cancelled) setTemplates(d.templates ?? []); })
          .catch(() => { if (!cancelled) setError("Erro ao carregar templates."); })
      );

      // Lead
      if (leadId) {
        tasks.push(
          fetch(`/api/leads/${leadId}`)
            .then((r) => r.json())
            .then((d) => { if (!cancelled && d.id) setLead(d as Lead); })
            .catch(() => {})
        );
      }

      // Imóvel — GET /api/imoveis filtrando no client pelo id
      if (propertyId) {
        tasks.push(
          fetch("/api/imoveis")
            .then((r) => r.json())
            .then((envelope: { data?: PropertyData[] }) => {
              if (!cancelled) {
                const found = (envelope.data ?? []).find((p) => p.id === propertyId);
                if (found) setProperty(found);
              }
            })
            .catch(() => {})
        );
      }

      // Corretor
      if (brokerId) {
        tasks.push(
          fetch(`/api/brokers/${brokerId}`)
            .then((r) => r.json())
            .then((d) => { if (!cancelled && d.id) setBroker(d as BrokerData); })
            .catch(() => {})
        );
      }

      await Promise.all(tasks);
      if (!cancelled) setLoading(false);
    }

    loadAll();
    return () => { cancelled = true; };
  }, [leadId, propertyId, brokerId]);

  // ── Carregar template quando selecionado ───────────────────────────────────
  const handleSelectTemplate = useCallback(
    async (templateId: string) => {
      setSelectedTemplateId(templateId);
      if (!templateId) { setCurrentBody(""); return; }

      try {
        const res = await fetch(`/api/contracts/templates?id=${templateId}`);
        if (!res.ok) { setError("Erro ao carregar template."); return; }
        const tmpl = await res.json() as { body: string };

        const valor = lead?.value ?? 0;
        const vars: Record<string, string> = {
          comprador: lead?.name ?? "{{comprador}}",
          imovel:    property?.titulo_comercial ?? "{{imovel}}",
          corretor:  broker?.full_name ?? "{{corretor}}",
          valor:     formatBRL(valor),
          comissao:  formatBRL(valor * 0.05),
          data:      new Date().toLocaleDateString("pt-BR"),
          valor_extenso: `(${formatBRL(valor)})`,
        };

        setCurrentBody(renderTemplate(tmpl.body, vars));
      } catch {
        setError("Erro ao carregar template.");
      }
    },
    [lead, property, broker]
  );

  // ── Handlers de ação ───────────────────────────────────────────────────────

  async function handleSaveDraft() {
    if (!leadId || !propertyId || !brokerId) {
      setError("Lead, imóvel e corretor são obrigatórios para salvar o rascunho.");
      return;
    }
    const valor = lead?.value ?? 0;
    if (valor <= 0) {
      setError("O lead precisa ter um valor definido.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/contracts/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id:     leadId,
          property_id: propertyId,
          broker_id:   brokerId,
          modelo:      selectedTemplateId || "rascunho",
          comprador:   lead?.name ?? null,
          imovel:      property?.titulo_comercial ?? null,
          corretor:    broker?.full_name ?? null,
          valor,
          comissao:    valor * 0.05,
          body:        currentBody,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao salvar rascunho.");
        return;
      }

      // Extrair id do contrato criado
      const createdId = data?.data?.[0]?.id ?? null;
      if (createdId) setDraftId(createdId);

      setSuccessMessage("Rascunho salvo com sucesso.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError("Erro de conexao. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerateAndSend() {
    if (!leadId || !propertyId || !brokerId) {
      setError("Lead, imóvel e corretor são obrigatórios.");
      return;
    }
    if (!selectedTemplateId) {
      setError("Selecione um template antes de gerar.");
      return;
    }
    const valor = lead?.value ?? 0;
    if (valor <= 0) {
      setError("O lead precisa ter um valor definido.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/contracts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id:         leadId,
          property_id:     propertyId,
          broker_id:       brokerId,
          modelo:          selectedTemplateId,
          comprador:       lead?.name ?? null,
          imovel:          property?.titulo_comercial ?? null,
          corretor:        broker?.full_name ?? null,
          valor:           String(valor),
          observacoes:     currentBody,
          canais:          { whatsapp: true, email: true },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao gerar contrato.");
        return;
      }

      setSuccessMessage("Contrato gerado e enfileirado com sucesso. Redirecionando...");
      setTimeout(() => {
        router.push("/cockpit/contratos");
      }, 1500);
    } catch {
      setError("Erro de conexao. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleGeneratePDF() {
    if (!draftId) {
      alert("Salve o rascunho primeiro para gerar o PDF.");
      return;
    }
    window.open(`/api/contracts/${draftId}/pdf`, "_blank");
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const canSaveDraft = !!leadId && !!propertyId && !!brokerId && !submitting;
  const canGenerate = canSaveDraft && !!selectedTemplateId;

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-950" style={{ height: "calc(100vh - 200px)", minHeight: 500 }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
        <div>
          <h1 className="text-base font-semibold text-gray-800 dark:text-white">
            Editor de Contrato
          </h1>
          {lead && (
            <p className="text-xs text-gray-400 mt-0.5">{lead.name}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Feedback de sucesso inline */}
          {successMessage && (
            <span className="text-sm text-emerald-600 dark:text-emerald-400 mr-2">
              {successMessage}
            </span>
          )}
          {error && (
            <span className="text-sm text-red-500 dark:text-red-400 mr-2 max-w-xs truncate">
              {error}
            </span>
          )}

          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Voltar
          </button>

          <button
            type="button"
            onClick={handleGeneratePDF}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Gerar PDF
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={!canSaveDraft}
            className="rounded-xl border border-brand-500 px-4 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Salvar Rascunho
          </button>

          <button
            type="button"
            onClick={handleGenerateAndSend}
            disabled={!canGenerate}
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
      </div>

      {/* ── Loading state ── */}
      {loading && (
        <div className="flex items-center justify-center flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
            Carregando dados...
          </div>
        </div>
      )}

      {/* ── 3 colunas ── */}
      {!loading && (
        <div className="grid grid-cols-[280px_1fr_360px] flex-1 min-h-0 overflow-hidden">

          {/* Coluna 1: Sidebar */}
          <ContratoEditorSidebar
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={handleSelectTemplate}
            lead={lead}
            property={property}
            broker={broker}
          />

          {/* Coluna 2: Editor (textarea) */}
          <div className="flex flex-col min-h-0 bg-white dark:bg-gray-900">
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 shrink-0">
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Editor
              </span>
            </div>
            <textarea
              value={currentBody}
              onChange={(e) => setCurrentBody(e.target.value)}
              placeholder={
                selectedTemplateId
                  ? "Edite o texto do contrato aqui..."
                  : "Selecione um template no painel esquerdo para começar..."
              }
              className="flex-1 resize-none p-6 font-mono text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 focus:outline-none leading-relaxed [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-600"
            />
          </div>

          {/* Coluna 3: Preview */}
          <ContratoEditorPreview body={currentBody} />
        </div>
      )}
    </div>
  );
}
