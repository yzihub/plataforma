"use client";

import { useState } from "react";
import Badge from "@/components/ui/badge/Badge";
import CommandButton from "@/components/yzihub/CommandButton";
import { CloseIcon } from "@/icons";
import type { Lead, LeadStatus } from "@/lib/crm/types";

// ─── Types internos do Drawer ─────────────────────────────────────────────────

type Tab = "dados" | "conversas" | "atividades" | "tarefas" | "ia" | "arquivos";

type Mensagem = {
  id: string;
  de: "lead" | "agente";
  texto: string;
  hora: string;
};

type Atividade = {
  id: string;
  tipo: "status" | "n8n" | "manual" | "ia";
  descricao: string;
  data: string;
};

type Tarefa = {
  id: string;
  titulo: string;
  feita: boolean;
  responsavel: string;
  prazo: string;
};

type Arquivo = {
  id: string;
  nome: string;
  tipo: string;
  tamanho: string;
};

// ─── Mock interno (estruturado para Supabase depois) ──────────────────────────

const MOCK_MSGS: Mensagem[] = [
  { id: "1", de: "agente", texto: "Olá! Sou a Nina, assistente da Café com Pam. Vi seu interesse em design de interiores. Posso te ajudar?", hora: "10:02" },
  { id: "2", de: "lead", texto: "Oi! Sim, quero reformar a sala e dois quartos do meu apê.", hora: "10:05" },
  { id: "3", de: "agente", texto: "Que projeto incrível! Qual é o tamanho aproximado do apartamento?", hora: "10:06" },
  { id: "4", de: "lead", texto: "Uns 90m². Fica no Itaim Bibi.", hora: "10:08" },
  { id: "5", de: "agente", texto: "Perfeito! Vou passar seus dados para a Pam entrar em contato e agendar uma visita técnica. 🏡", hora: "10:09" },
];

const MOCK_ATIVIDADES: Atividade[] = [
  { id: "1", tipo: "ia", descricao: "Lead qualificado pela IA Nina via WhatsApp", data: "29/03 10:09" },
  { id: "2", tipo: "n8n", descricao: "n8n criou registro no CRM automaticamente", data: "29/03 10:10" },
  { id: "3", tipo: "status", descricao: "Status alterado: Novo Lead", data: "29/03 10:10" },
  { id: "4", tipo: "manual", descricao: "Time entrou em contato por WhatsApp", data: "29/03 14:30" },
  { id: "5", tipo: "status", descricao: "Status alterado: Contato → Reunião", data: "30/03 09:00" },
];

const MOCK_TAREFAS: Tarefa[] = [
  { id: "1", titulo: "Ligar para confirmar reunião", feita: true, responsavel: "Pam", prazo: "29/03" },
  { id: "2", titulo: "Enviar portfólio por e-mail", feita: false, responsavel: "Pam", prazo: "30/03" },
  { id: "3", titulo: "Preparar proposta personalizada", feita: false, responsavel: "Pam", prazo: "01/04" },
];

const MOCK_ARQUIVOS: Arquivo[] = [
  { id: "1", nome: "briefing-inicial.pdf", tipo: "PDF", tamanho: "248 KB" },
  { id: "2", nome: "planta-apartamento.jpg", tipo: "Imagem", tamanho: "1.2 MB" },
  { id: "3", nome: "contrato-modelo.docx", tipo: "DOC", tamanho: "87 KB" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ["bg-blue-500","bg-violet-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-cyan-500","bg-orange-500"];

function getInitials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function avatarBg(id: string) {
  return AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length];
}

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type BadgeColor = "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";

const STATUS_BADGE: Record<LeadStatus, { color: BadgeColor; label: string }> = {
  new:         { color: "info",    label: "🔥 Novo Lead" },
  contacted:   { color: "warning", label: "📞 Contato" },
  qualified:   { color: "primary", label: "📅 Agendado" },
  meeting:     { color: "primary", label: "📅 Reunião" },
  proposal:    { color: "warning", label: "💰 Proposta" },
  negotiation: { color: "warning", label: "📋 Contrato" },
  won:         { color: "success", label: "✅ Fechado" },
  lost:        { color: "dark",    label: "❌ Perdido" },
};

const ACTIVITY_ICON: Record<Atividade["tipo"], string> = {
  ia: "🤖",
  n8n: "⚡",
  status: "🔄",
  manual: "👤",
};

// ─── Tabs config ──────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: "dados", label: "🧾 Dados" },
  { key: "conversas", label: "💬 Conversas" },
  { key: "atividades", label: "📅 Atividades" },
  { key: "tarefas", label: "✅ Tarefas" },
  { key: "ia", label: "🤖 IA" },
  { key: "arquivos", label: "📎 Arquivos" },
];

// ─── Tab: Dados ───────────────────────────────────────────────────────────────

function TabDados({ lead }: { lead: Lead }) {
  const fields = [
    { label: "Nome do cliente",              key: "name",             value: lead.name,                    type: "text" },
    { label: "Telefone",                     key: "phone",            value: lead.phone ?? "",             type: "tel" },
    { label: "E-mail",                       key: "email",            value: lead.email ?? "",             type: "email" },
    { label: "Score do Lead (0-100)",        key: "score",            value: String(lead.score ?? 0),     type: "number" },
    { label: "Janela de visita",             key: "janela_visita",    value: lead.janela_visita ?? "",     type: "text" },
    { label: "Região / Bairro de interesse", key: "regiao_interesse", value: lead.regiao_interesse ?? "", type: "text" },
    { label: "Faixa de valor",               key: "faixa_valor",      value: lead.faixa_valor ?? "",       type: "text" },
    { label: "Corretor responsável",         key: "assigned_to",      value: lead.assigned_to ?? "",       type: "text" },
    { label: "Referência do imóvel",         key: "imovel_ref",       value: lead.imovel_ref ?? "",        type: "text" },
    { label: "Data do agendamento",          key: "data_agendamento", value: lead.data_agendamento ?? "",  type: "text" },
    { label: "Perfil resumido",              key: "notes",            value: lead.notes ?? "",             type: "textarea" },
  ];
  {/* Empresa e valor estimado omitidos do pipeline imobiliário */}

  const selectClass = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500";

  return (
    <div className="space-y-4">
      {fields.map(({ label, key, value, type }) => (
        <div key={key}>
          <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
          {type === "textarea" ? (
            <textarea
              defaultValue={value}
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:border-brand-500"
            />
          ) : (
            <input
              type={type}
              defaultValue={value}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500"
            />
          )}
        </div>
      ))}

      {/* Select objetivo */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Objetivo</label>
        <select defaultValue={lead.objetivo ?? ""} className={selectClass}>
          <option value="">—</option>
          {["Investimento", "Moradia"].map((o) => (
            <option key={o} value={o.toLowerCase()}>{o}</option>
          ))}
        </select>
      </div>

      {/* Select interesse principal */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Interesse principal</label>
        <select defaultValue={lead.interesse_principal ?? ""} className={selectClass}>
          <option value="">—</option>
          {["Apartamento", "Casa", "Terreno", "Cobertura"].map((o) => (
            <option key={o} value={o.toLowerCase()}>{o}</option>
          ))}
        </select>
      </div>

      {/* Select finalidade */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Finalidade</label>
        <select defaultValue={lead.finalidade ?? ""} className={selectClass}>
          <option value="">—</option>
          {["Compra", "Aluguel"].map((o) => (
            <option key={o} value={o.toLowerCase()}>{o}</option>
          ))}
        </select>
      </div>

      {/* Select status do agendamento */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Status do agendamento</label>
        <select defaultValue={lead.status_agendamento ?? ""} className={selectClass}>
          <option value="">—</option>
          {["Pendente", "Confirmado", "Realizado", "Cancelado"].map((o) => (
            <option key={o} value={o.toLowerCase()}>{o}</option>
          ))}
        </select>
      </div>

      {/* Select status */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
        <select defaultValue={lead.status} className={selectClass}>
          {Object.entries(STATUS_BADGE).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Select origem */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Origem</label>
        <select defaultValue={lead.source ?? ""} className={selectClass}>
          <option value="">—</option>
          {["WhatsApp", "Instagram", "Site Jurema", "Zap Imóveis", "OLX", "Indicação", "Orgânico"].map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Tags</label>
        <div className="flex flex-wrap gap-2">
          {["VIP", "Urgente", "Indicação", "Alta prioridade"].map((tag) => (
            <button
              key={tag}
              className="rounded-full border border-gray-200 px-3 py-0.5 text-xs text-gray-500 hover:border-brand-500 hover:text-brand-500 dark:border-gray-700 dark:text-gray-400 transition-colors"
            >
              + {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Upload */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Upload de arquivo</label>
        <label className="flex flex-col items-center justify-center w-full h-20 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 cursor-pointer hover:border-brand-400 transition-colors">
          <span className="text-xs text-gray-400">Clique ou arraste para anexar</span>
          <input type="file" className="hidden" />
        </label>
      </div>

      <button className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
        Salvar alterações
      </button>
    </div>
  );
}

// ─── Tab: Conversas ───────────────────────────────────────────────────────────

function TabConversas({ lead }: { lead: Lead }) {
  const [input, setInput] = useState("");

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="text-xs text-gray-400 mb-3 flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
        WhatsApp • Evolution API + n8n
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
        {MOCK_MSGS.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.de === "agente" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                msg.de === "agente"
                  ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-tl-sm"
                  : "bg-brand-500 text-white rounded-tr-sm"
              }`}
            >
              <p>{msg.texto}</p>
              <p className={`text-[10px] mt-1 ${msg.de === "agente" ? "text-gray-400" : "text-white/60"}`}>
                {msg.hora} {msg.de === "agente" ? "• Nina" : `• ${lead.name.split(" ")[0]}`}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Mensagem via WhatsApp..."
          className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500"
        />
        <button
          onClick={() => setInput("")}
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          ▶
        </button>
      </div>
    </div>
  );
}

// ─── Tab: Atividades ──────────────────────────────────────────────────────────

function TabAtividades() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">Histórico automático + manual</p>
      <ol className="space-y-3">
        {MOCK_ATIVIDADES.map((a) => (
          <li key={a.id} className="flex gap-3">
            <span className="text-base shrink-0 mt-0.5">{ACTIVITY_ICON[a.tipo]}</span>
            <div className="flex-1 border-b border-gray-50 dark:border-gray-800 pb-3">
              <p className="text-sm text-gray-700 dark:text-gray-200">{a.descricao}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-gray-400">{a.data}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  a.tipo === "ia" ? "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400" :
                  a.tipo === "n8n" ? "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" :
                  a.tipo === "status" ? "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" :
                  "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                }`}>
                  {a.tipo === "ia" ? "IA" : a.tipo === "n8n" ? "n8n" : a.tipo === "status" ? "status" : "manual"}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Tab: Tarefas ─────────────────────────────────────────────────────────────

function TabTarefas() {
  const [tarefas, setTarefas] = useState<Tarefa[]>(MOCK_TAREFAS);
  const [nova, setNova] = useState("");

  function toggle(id: string) {
    setTarefas((prev) => prev.map((t) => t.id === id ? { ...t, feita: !t.feita } : t));
  }

  function addTarefa() {
    if (!nova.trim()) return;
    setTarefas((prev) => [...prev, {
      id: Date.now().toString(),
      titulo: nova,
      feita: false,
      responsavel: "Pam",
      prazo: "—",
    }]);
    setNova("");
  }

  return (
    <div className="space-y-4">
      {/* Lista */}
      <div className="space-y-2">
        {tarefas.map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors"
          >
            <input
              type="checkbox"
              checked={t.feita}
              onChange={() => toggle(t.id)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500 cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${t.feita ? "line-through text-gray-400" : "text-gray-700 dark:text-gray-200"}`}>
                {t.titulo}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[11px] text-gray-400">👤 {t.responsavel}</span>
                <span className="text-[11px] text-gray-400">📅 {t.prazo}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Nova tarefa */}
      <div className="flex gap-2">
        <input
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTarefa()}
          placeholder="Nova tarefa..."
          className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500"
        />
        <button
          onClick={addTarefa}
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─── Tab: IA ─────────────────────────────────────────────────────────────────

function TabIA({ lead }: { lead: Lead }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function dispararWebhook(acao: string) {
    setLoading(acao);
    setResult(null);
    try {
      await fetch(`/api/actions/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: acao, lead_id: lead.id, tenant_id: lead.tenant_id }),
      });
      setResult(`✅ Ação "${acao}" disparada com sucesso via n8n.`);
    } catch {
      setResult("❌ Erro ao conectar com n8n.");
    } finally {
      setLoading(null);
    }
  }

  const acoes = [
    { key: "gerar_proposta", label: "📄 Gerar Proposta", desc: "IA cria proposta personalizada com base no briefing" },
    { key: "resumir_lead", label: "🧠 Resumir Lead", desc: "IA resume perfil, histórico e próximos passos" },
    { key: "analisar_conversa", label: "💬 Analisar Conversa", desc: "IA analisa sentimento e intenção de compra" },
    { key: "sugerir_proximo_passo", label: "🚀 Sugerir Próximo Passo", desc: "IA recomenda a melhor ação baseada no contexto" },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">Cada ação dispara webhook no n8n → resposta retorna aqui</p>

      {acoes.map(({ key, label, desc }) => (
        <button
          key={key}
          onClick={() => dispararWebhook(key)}
          disabled={loading === key}
          className="w-full flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:bg-brand-50/30 dark:hover:bg-brand-500/5 transition-all text-left group"
        >
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800 dark:text-white/90 group-hover:text-brand-600 dark:group-hover:text-brand-400">
              {loading === key ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                  Processando...
                </span>
              ) : label}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
          </div>
          <span className="text-gray-300 dark:text-gray-600 group-hover:text-brand-400 text-lg">→</span>
        </button>
      ))}

      {result && (
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-sm text-gray-600 dark:text-gray-300">
          {result}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Arquivos ────────────────────────────────────────────────────────────

function TabArquivos() {
  const icons: Record<string, string> = { PDF: "📄", Imagem: "🖼️", DOC: "📝" };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {MOCK_ARQUIVOS.map((f) => (
          <div
            key={f.id}
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors"
          >
            <span className="text-xl">{icons[f.tipo] ?? "📁"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{f.nome}</p>
              <p className="text-[11px] text-gray-400">{f.tipo} • {f.tamanho}</p>
            </div>
            <button className="text-xs text-brand-500 hover:underline">Baixar</button>
          </div>
        ))}
      </div>

      <label className="flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 cursor-pointer hover:border-brand-400 transition-colors">
        <span className="text-2xl">📎</span>
        <span className="text-xs text-gray-400 mt-1">Clique para anexar arquivo</span>
        <input type="file" className="hidden" multiple />
      </label>
    </div>
  );
}

// ─── Main Drawer Component ────────────────────────────────────────────────────

interface LeadDrawerProps {
  lead: Lead | null;
  onClose: () => void;
  onStageChange?: (leadId: string, newStatus: LeadStatus) => void;
}

export default function LeadDrawer({ lead, onClose }: LeadDrawerProps) {
  const [activeTab, setActiveTab] = useState<Tab>("dados");

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          lead ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          lead ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {lead && (
          <>
            {/* ── Header ── */}
            <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white ${avatarBg(lead.id)}`}>
                  {getInitials(lead.name)}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">{lead.name}</h2>
                  {lead.company && <p className="text-xs text-gray-400">{lead.company}</p>}
                  <div className="mt-1">
                    <Badge size="sm" color={STATUS_BADGE[lead.status].color}>
                      {STATUS_BADGE[lead.status].label}
                    </Badge>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg transition-colors">
                <CloseIcon className="size-5" />
              </button>
            </div>

            {/* ── Ações principais (sempre visíveis) ── */}
            <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <CommandButton action="qualify" leadId={lead.id} tenantId={lead.tenant_id} />
              <CommandButton action="schedule" leadId={lead.id} tenantId={lead.tenant_id} />
              <CommandButton action="send_proposal" leadId={lead.id} tenantId={lead.tenant_id} />
              <CommandButton action="close" leadId={lead.id} tenantId={lead.tenant_id} />
              <CommandButton action="lose" leadId={lead.id} tenantId={lead.tenant_id} />
            </div>

            {/* ── Tabs ── */}
            <div className="flex border-b border-gray-100 dark:border-gray-800 shrink-0 overflow-x-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`shrink-0 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? "border-brand-500 text-brand-600 dark:text-brand-400"
                      : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Tab content ── */}
            <div className="flex-1 overflow-y-auto p-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
              {activeTab === "dados" && <TabDados lead={lead} />}
              {activeTab === "conversas" && <TabConversas lead={lead} />}
              {activeTab === "atividades" && <TabAtividades />}
              {activeTab === "tarefas" && <TabTarefas />}
              {activeTab === "ia" && <TabIA lead={lead} />}
              {activeTab === "arquivos" && <TabArquivos />}
            </div>
          </>
        )}
      </div>
    </>
  );
}
