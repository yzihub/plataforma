"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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

// ─── Mocks (usados quando leadId/propertyId/brokerId são null na URL) ─────────

const MOCK_LEAD: Lead = {
  id: "mock-lead-001",
  tenant_id: "mock-tenant",
  stage_id: null,
  name: "Joao Silva (Mock)",
  email: "joao.mock@example.com",
  phone: "(21) 99999-0001",
  company: null,
  source: null,
  status: "qualified",
  score: 80,
  value: 850000,
  notes: null,
  assigned_to: null,
  last_action_at: null,
  created_at: new Date().toISOString(),
};

const MOCK_PROPERTY: PropertyData = {
  id: "mock-prop-001",
  titulo_comercial: "Sitio Sao Joao (Mock)",
  bairro: "Vargem Grande",
  valor: 850000,
};

const MOCK_BROKER: BrokerData = {
  id: "mock-broker-001",
  full_name: "Luana Corretor (Mock)",
  email: "luana.mock@juremabrokers.com",
  phone: "(21) 99999-0002",
};

// ─── Variáveis disponíveis para substituição no template ──────────────────────

// Variáveis disponíveis para substituição no template
const AVAILABLE_VARS = [
  { key: "comprador",    hint: "Nome do comprador" },
  { key: "imovel",       hint: "Título do imóvel" },
  { key: "corretor",     hint: "Nome do corretor" },
  { key: "valor",        hint: "Valor em BRL" },
  { key: "comissao",     hint: "Comissão (5%)" },
  { key: "data",         hint: "Data de hoje" },
  { key: "valor_extenso",hint: "Valor por extenso" },
  { key: "id_imovel",    hint: "UUID do imóvel" },
];

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

  // rawBody = template com {{vars}} visíveis — o que o usuário edita
  const [rawBody, setRawBody]                   = useState("");
  const [templates, setTemplates]               = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [lead, setLead]                         = useState<Lead | null>(null);
  const [property, setProperty]                 = useState<PropertyData | null>(null);
  const [broker, setBroker]                     = useState<BrokerData | null>(null);

  const [loading, setLoading]                   = useState(true);
  const [uploadLoading, setUploadLoading]       = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [successMessage, setSuccessMessage]     = useState<string | null>(null);
  const [submitting, setSubmitting]             = useState(false);
  const [draftId, setDraftId]                   = useState<string | null>(null);

  // Mapa de variáveis resolvidas — atualizado sempre que lead/property/broker mudar
  const vars: Record<string, string> = useMemo(() => {
    const valor = property?.valor ?? lead?.value ?? 0;
    return {
      comprador:     lead?.name ?? "{{comprador}}",
      imovel:        property?.titulo_comercial ?? "{{imovel}}",
      corretor:      broker?.full_name ?? "{{corretor}}",
      valor:         formatBRL(valor),
      comissao:      formatBRL(valor * 0.05),
      data:          new Date().toLocaleDateString("pt-BR"),
      valor_extenso: `(${formatBRL(valor)})`,
      id_imovel:     property?.id ?? "{{id_imovel}}",
    };
  }, [lead, property, broker]);

  // renderedBody = rawBody com vars substituídas — usado no preview e no generate
  const renderedBody = useMemo(
    () => (rawBody ? renderTemplate(rawBody, vars) : ""),
    [rawBody, vars]
  );

  // ── Carregar dados iniciais em paralelo ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      setError(null);

      // Aplicar mocks imediatamente quando IDs são null (antes dos fetches)
      if (!leadId)     setLead(MOCK_LEAD);
      if (!propertyId) setProperty(MOCK_PROPERTY);
      if (!brokerId)   setBroker(MOCK_BROKER);

      const tasks: Promise<void>[] = [];

      tasks.push(
        fetch("/api/contracts/templates")
          .then((r) => r.json())
          .then((d) => { if (!cancelled) setTemplates(d.templates ?? []); })
          .catch(() => { if (!cancelled) setError("Erro ao carregar templates."); })
      );

      if (leadId) {
        tasks.push(
          fetch(`/api/leads/${leadId}`)
            .then((r) => r.json())
            .then((d) => { if (!cancelled && d.id) setLead(d as Lead); })
            .catch(() => {})
        );
      }

      if (propertyId) {
        tasks.push(
          fetch(`/api/imoveis/${propertyId}`)
            .then((r) => r.ok ? r.json() : null)
            .then((d) => { if (!cancelled && d?.id) setProperty(d as PropertyData); })
            .catch(() => {})
        );
      }

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

  // ── Callbacks para seleção na sidebar ─────────────────────────────────────
  const handleSelectLead     = useCallback((l: Lead | null)         => setLead(l), []);
  const handleSelectProperty = useCallback((p: PropertyData | null) => setProperty(p), []);
  const handleSelectBroker   = useCallback((b: BrokerData | null)   => setBroker(b), []);

  // ── Carregar template interno (raw — sem substituição) ─────────────────────
  const handleSelectTemplate = useCallback(async (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) { setRawBody(""); return; }

    try {
      const res = await fetch(`/api/contracts/templates?id=${templateId}`);
      if (!res.ok) { setError("Erro ao carregar template."); return; }
      const tmpl = await res.json() as { body: string };
      // Carrega o body RAW com {{vars}} visíveis — o usuário edita antes de gerar
      setRawBody(tmpl.body);
    } catch {
      setError("Erro ao carregar template.");
    }
  }, []);

  // ── Upload de .docx → extrai texto via API ────────────────────────────────
  const handleUploadDocx = useCallback(async (file: File) => {
    setUploadLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/contracts/extract-docx", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao processar o arquivo."); return; }
      setRawBody(data.text ?? "");
      setSelectedTemplateId(""); // limpa seleção de template interno
    } catch {
      setError("Erro ao processar o arquivo.");
    } finally {
      setUploadLoading(false);
    }
  }, []);

  // ── Salvar rascunho ────────────────────────────────────────────────────────
  async function handleSaveDraft() {
    if (!lead || !property || !broker) {
      setError("Lead, imóvel e corretor são obrigatórios para salvar o rascunho.");
      return;
    }
    // Se os IDs são mocks, alertar que não se pode salvar
    if (lead.id.startsWith("mock-") || property.id.startsWith("mock-") || broker.id.startsWith("mock-")) {
      setError("Selecione lead, imóvel e corretor reais para salvar o rascunho.");
      return;
    }
    const valor = property?.valor ?? lead?.value ?? 0;
    if (valor <= 0) { setError("O imóvel ou lead precisa ter um valor definido."); return; }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/contracts/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id:     lead.id,
          property_id: property.id,
          broker_id:   broker.id,
          modelo:      selectedTemplateId || "upload",
          comprador:   lead?.name ?? null,
          imovel:      property?.titulo_comercial ?? null,
          corretor:    broker?.full_name ?? null,
          valor,
          comissao:    valor * 0.05,
          // Salva o raw body para permitir re-edição futura
          body:        rawBody,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao salvar rascunho."); return; }

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

  // ── Gerar e enviar (usa o corpo renderizado) ───────────────────────────────
  async function handleGenerateAndSend() {
    if (!lead || !property || !broker) {
      setError("Lead, imóvel e corretor são obrigatórios.");
      return;
    }
    if (lead.id.startsWith("mock-") || property.id.startsWith("mock-") || broker.id.startsWith("mock-")) {
      setError("Selecione lead, imóvel e corretor reais para gerar o contrato.");
      return;
    }
    if (!rawBody.trim()) {
      setError("O template está vazio. Selecione um modelo ou faça upload de um arquivo.");
      return;
    }
    const valor = property?.valor ?? lead?.value ?? 0;
    if (valor <= 0) { setError("O imóvel ou lead precisa ter um valor definido."); return; }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/contracts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id:     lead.id,
          property_id: property.id,
          broker_id:   broker.id,
          modelo:      selectedTemplateId || "upload",
          comprador:   lead?.name ?? null,
          imovel:      property?.titulo_comercial ?? null,
          corretor:    broker?.full_name ?? null,
          valor:       String(valor),
          // Envia o corpo já renderizado (vars substituídas)
          observacoes: renderedBody,
          canais:      { whatsapp: true, email: true },
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao gerar contrato."); return; }

      setSuccessMessage("Contrato gerado e enfileirado com sucesso. Redirecionando...");
      setTimeout(() => router.push("/cockpit/contratos"), 1500);
    } catch {
      setError("Erro de conexao. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleGeneratePDF() {
    if (!draftId) { alert("Salve o rascunho primeiro para gerar o PDF."); return; }
    window.open(`/api/contracts/${draftId}/pdf`, "_blank");
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  // Usar state (não URL params) para habilitar ações — mocks também são válidos para preview/rascunho
  const canSaveDraft = !!lead && !!property && !!broker && !submitting;
  const canGenerate  = canSaveDraft && rawBody.trim().length > 0;

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-950" style={{ height: "calc(100vh - 200px)", minHeight: 500 }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
        <div>
          <h1 className="text-base font-semibold text-gray-800 dark:text-white">
            Editor de Contrato
          </h1>
          {lead && <p className="text-xs text-gray-400 mt-0.5">{lead.name}</p>}
        </div>

        <div className="flex items-center gap-2">
          {successMessage && (
            <span className="text-sm text-emerald-600 dark:text-emerald-400 mr-2">{successMessage}</span>
          )}
          {error && (
            <span className="text-sm text-red-500 dark:text-red-400 mr-2 max-w-xs truncate">{error}</span>
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
            ) : "Gerar e Enviar"}
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
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
            onUploadDocx={handleUploadDocx}
            uploadLoading={uploadLoading}
            lead={lead}
            property={property}
            broker={broker}
            onSelectLead={handleSelectLead}
            onSelectProperty={handleSelectProperty}
            onSelectBroker={handleSelectBroker}
          />

          {/* Coluna 2: Editor de Template ── */}
          <div className="flex flex-col min-h-0 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 shrink-0">
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Template
              </span>
              {/* Chips de variáveis disponíveis */}
              <div className="flex items-center gap-1 flex-wrap justify-end">
                {AVAILABLE_VARS.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    title={v.hint}
                    onClick={() => {
                      const tag = `{{${v.key}}}`;
                      setRawBody((prev) => prev + tag);
                    }}
                    className="rounded-md bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 dark:text-gray-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                  >
                    {`{{${v.key}}}`}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={rawBody}
              onChange={(e) => setRawBody(e.target.value)}
              placeholder={
                rawBody === ""
                  ? "Selecione um template ou faça upload de um .docx para começar...\n\nVocê pode usar os botões acima para inserir variáveis como {{comprador}}, {{imovel}}, {{valor}}."
                  : undefined
              }
              spellCheck={false}
              className="flex-1 resize-none p-6 font-mono text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 focus:outline-none leading-relaxed [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-600"
            />
          </div>

          {/* Coluna 3: Preview (vars resolvidas) ── */}
          <ContratoEditorPreview body={renderedBody} />
        </div>
      )}
    </div>
  );
}
