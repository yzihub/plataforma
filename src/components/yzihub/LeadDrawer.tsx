"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/badge/Badge";
import {
  CloseIcon,
  ChatIcon,
  MailIcon,
  AngleDownIcon,
  ArrowRightIcon,
  BoltIcon,
  PlugInIcon,
  UserCircleIcon,
  DocsIcon,
  CalenderIcon,
  TaskIcon,
} from "@/icons";
import type { Lead, LeadStatus } from "@/lib/crm/types";
import type { Corretor } from "@/components/yzihub/LeadsClient";
import type { N8nImovel } from "@/types/n8n-payloads";
import ImovelSearchSelect from "@/components/yzihub/ImovelSearchSelect";

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

// ─── Mock interno ─────────────────────────────────────────────────────────────

const MOCK_MSGS: Mensagem[] = [
  { id: "1", de: "agente", texto: "Olá! Sou a Luana, assistente da Jurema Brokers. Vi seu interesse em imóveis. Posso te ajudar?", hora: "10:02" },
  { id: "2", de: "lead", texto: "Oi! Sim, estou procurando um apartamento na Barra.", hora: "10:05" },
  { id: "3", de: "agente", texto: "Ótimo! Qual a faixa de valor que você tem em mente?", hora: "10:06" },
  { id: "4", de: "lead", texto: "Entre 700k e 1 milhão.", hora: "10:08" },
  { id: "5", de: "agente", texto: "Perfeito! Vou passar seus dados para um corretor entrar em contato.", hora: "10:09" },
];

const MOCK_ATIVIDADES: Atividade[] = [
  { id: "1", tipo: "ia",     descricao: "Lead qualificado pela IA Luana via WhatsApp",     data: "29/03 10:09" },
  { id: "2", tipo: "n8n",    descricao: "n8n criou registro no CRM automaticamente",       data: "29/03 10:10" },
  { id: "3", tipo: "status", descricao: "Status alterado: Novo Lead",                      data: "29/03 10:10" },
  { id: "4", tipo: "manual", descricao: "Corretor entrou em contato por WhatsApp",         data: "29/03 14:30" },
];

const MOCK_TAREFAS: Tarefa[] = [
  { id: "1", titulo: "Ligar para confirmar visita",     feita: true,  responsavel: "Jurema", prazo: "29/03" },
  { id: "2", titulo: "Enviar opções de imóveis",        feita: false, responsavel: "Jurema", prazo: "30/03" },
  { id: "3", titulo: "Preparar proposta personalizada", feita: false, responsavel: "Jurema", prazo: "01/04" },
];

const MOCK_ARQUIVOS: Arquivo[] = [
  { id: "1", nome: "briefing-inicial.pdf",    tipo: "PDF",    tamanho: "248 KB" },
  { id: "2", nome: "planta-apartamento.jpg",  tipo: "Imagem", tamanho: "1.2 MB" },
  { id: "3", nome: "contrato-modelo.docx",    tipo: "DOC",    tamanho: "87 KB"  },
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

type BadgeColor = "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";

const STATUS_BADGE: Record<LeadStatus, { color: BadgeColor; label: string }> = {
  new:         { color: "info",    label: "Novo Lead"   },
  contacted:   { color: "warning", label: "Contato"     },
  qualified:   { color: "primary", label: "Agendado"    },
  meeting:     { color: "primary", label: "Reunião"     },
  proposal:    { color: "warning", label: "Proposta"    },
  negotiation: { color: "warning", label: "Contrato"    },
  won:         { color: "success", label: "Fechado"     },
  lost:        { color: "dark",    label: "Perdido"     },
};

const STATUS_ORDER: LeadStatus[] = [
  "new", "contacted", "qualified", "meeting",
  "proposal", "negotiation", "won", "lost",
];

type ActivityIconComponent = React.ComponentType<{ className?: string }>;
const ACTIVITY_ICON: Record<Atividade["tipo"], ActivityIconComponent> = {
  ia:     BoltIcon,
  n8n:    PlugInIcon,
  status: ArrowRightIcon,
  manual: UserCircleIcon,
};

// ─── Tabs config ──────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: "dados",      label: "Dados"      },
  { key: "conversas",  label: "Conversas"  },
  { key: "atividades", label: "Atividades" },
  { key: "tarefas",    label: "Tarefas"    },
  { key: "ia",         label: "IA"         },
  { key: "arquivos",   label: "Arquivos"   },
];

// ─── Bairros disponíveis (Jurema Brokers — João Pessoa) ──────────────────────

const BAIRROS_JP = [
  "Aeroclube", "Altiplano", "Bancários", "Bessa", "Cabo Branco", "Camboinha",
  "Centro", "Cidade Universitária", "Dos Estados", "Intermares", "Jardim Luna",
  "Jardim Oceania", "Manaíra", "Mangabeira", "Miramar", "Portal do Sol",
  "Tambaú", "Tambauzinho",
];

// ─── Form field style constants ───────────────────────────────────────────────

const INPUT_CLS = "h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-gray-500 dark:focus:border-brand-800";
const SELECT_CLS = "h-11 w-full appearance-none rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
const LABEL_CLS = "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400";
const SECTION_CLS = "mb-5 border-b border-gray-100 dark:border-gray-800 pb-5 last:border-none last:pb-0";

// ─── Form state type ─────────────────────────────────────────────────────────

type FormState = {
  name: string;
  phone: string;
  email: string;
  assigned_to: string;
  interesse_principal: string;
  finalidade: string;
  objetivo: string;
  faixa_valor: string;
  regiao_interesse: string;
  bairro_interesse: string;
  imovel_ref: string;
  data_agendamento: string;
  status_agendamento: string;
  janela_visita: string;
  source: string;
  score: string;
  status: LeadStatus;
  notes: string;
};

function initForm(lead: Lead | null): FormState {
  return {
    name:                lead?.name ?? "",
    phone:               lead?.phone ?? "",
    email:               lead?.email ?? "",
    assigned_to:         lead?.assigned_to ?? "",
    interesse_principal: lead?.interesse_principal ?? "",
    finalidade:          lead?.finalidade ?? "",
    objetivo:            lead?.objetivo ?? "",
    faixa_valor:         lead?.faixa_valor ?? "",
    regiao_interesse:    lead?.regiao_interesse ?? "",
    bairro_interesse:    lead?.bairro_interesse ?? "",
    imovel_ref:          lead?.imovel_ref ?? "",
    data_agendamento:    lead?.data_agendamento ?? "",
    status_agendamento:  lead?.status_agendamento ?? "",
    janela_visita:       lead?.janela_visita ?? "",
    source:              lead?.source ?? "",
    score:               String(lead?.score ?? 0),
    status:              lead?.status ?? "new",
    notes:               lead?.notes ?? "",
  };
}

// ─── Quick Actions Bar ────────────────────────────────────────────────────────

function QuickActionsBar({
  lead,
  onLeadSaved,
}: {
  lead: Lead;
  onLeadSaved?: (lead: Lead) => void;
}) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const phone = lead.phone?.replace(/\D/g, "") ?? "";
  const hasPhone = !!lead.phone;
  const hasEmail = !!lead.email;

  async function moveStatus(newStatus: LeadStatus) {
    setShowStatusMenu(false);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const saved = await res.json() as Lead;
        onLeadSaved?.(saved);
        return;
      }
    } catch {
      // fallthrough to optimistic update
    }
    onLeadSaved?.({ ...lead, status: newStatus, last_action_at: new Date().toISOString() });
  }

  return (
    <div className="flex gap-2 px-6 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0 flex-wrap">
      {/* WhatsApp */}
      <a
        href={hasPhone ? `https://wa.me/${phone}` : undefined}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!hasPhone}
        className={[
          "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
          hasPhone
            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
            : "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600",
        ].join(" ")}
        onClick={(e) => !hasPhone && e.preventDefault()}
      >
        <ChatIcon className="w-3.5 h-3.5" />
        WhatsApp
      </a>

      {/* Ligar */}
      <a
        href={hasPhone ? `tel:${lead.phone}` : undefined}
        aria-disabled={!hasPhone}
        className={[
          "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
          hasPhone
            ? "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
            : "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600",
        ].join(" ")}
        onClick={(e) => !hasPhone && e.preventDefault()}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
        </svg>
        Ligar
      </a>

      {/* Email */}
      <a
        href={hasEmail ? `mailto:${lead.email}` : undefined}
        aria-disabled={!hasEmail}
        className={[
          "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
          hasEmail
            ? "bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:hover:bg-violet-500/20"
            : "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600",
        ].join(" ")}
        onClick={(e) => !hasEmail && e.preventDefault()}
      >
        <span>✉️</span>
        Email
      </a>

      {/* Mover status */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowStatusMenu((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
        >
          <span>🔄</span>
          Mover status
          <span className="text-gray-400">▾</span>
        </button>
        {showStatusMenu && (
          <div className="absolute left-0 top-full mt-1 z-50 min-w-[180px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => moveStatus(s)}
                className={[
                  "flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                  lead.status === s ? "text-brand-600 dark:text-brand-400 font-semibold" : "text-gray-700 dark:text-gray-300",
                ].join(" ")}
              >
                {STATUS_BADGE[s].label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Corretor Card ────────────────────────────────────────────────────────────

function CorretorCard({
  lead,
  corretores,
  onLeadSaved,
}: {
  lead: Lead;
  corretores: Corretor[];
  onLeadSaved?: (lead: Lead) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(lead.assigned_to ?? "");

  useEffect(() => {
    setSelectedId(lead.assigned_to ?? "");
    setEditing(false);
  }, [lead.assigned_to, lead.id]);

  const corretor = corretores.find((c) => c.id === lead.assigned_to);
  const hasCorretor = !!corretor;

  async function handleAssign() {
    if (!onLeadSaved) return;
    setEditing(false);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: selectedId || null }),
      });
      if (res.ok) {
        const saved = await res.json() as Lead;
        onLeadSaved(saved);
        return;
      }
    } catch {
      // fallthrough to optimistic update
    }
    onLeadSaved({ ...lead, assigned_to: selectedId || null });
  }

  return (
    <div className="mx-6 mb-4 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shrink-0">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Corretor Responsável</p>
        {onLeadSaved && (
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="text-[11px] text-brand-500 hover:underline"
          >
            {hasCorretor ? "Trocar" : "Atribuir"}
          </button>
        )}
      </div>

      {!editing && (
        hasCorretor ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              {corretor.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{corretor.name}</p>
              {corretor.phone && <p className="text-[11px] text-gray-400">{corretor.phone}</p>}
              {corretor.email && <p className="text-[11px] text-gray-400">{corretor.email}</p>}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">Nenhum corretor atribuído</p>
        )
      )}

      {editing && (
        <div className="flex gap-2 mt-1">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">— Sem corretor —</option>
            {corretores.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAssign}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 transition-colors"
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Dados ───────────────────────────────────────────────────────────────

function TabDados({
  lead,
  onLeadSaved,
  corretores = [],
  onImovelSelect,
}: {
  lead: Lead | null;
  onLeadSaved?: (lead: Lead) => void;
  corretores?: Corretor[];
  onImovelSelect?: (imovel: N8nImovel | null) => void;
}) {
  const [form, setForm] = useState<FormState>(() => initForm(lead));
  const [selectedImovel, setSelectedImovel] = useState<N8nImovel | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Reset form when lead changes
  useEffect(() => {
    setForm(initForm(lead));
    setSelectedImovel(null);
    onImovelSelect?.(null);
    setSaveMsg(null);
    setSent(false);
  }, [lead?.id]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setSaveMsg({ ok: false, text: "Nome é obrigatório." });
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload = {
        ...form,
        score: Number(form.score) || 0,
      };

      let res: Response;
      if (lead) {
        res = await fetch(`/api/leads/${lead.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        let errorText = "Erro ao salvar. Tente novamente.";
        try {
          const errBody = await res.json() as { error?: string };
          if (errBody?.error) errorText = errBody.error;
        } catch {
          // ignore parse failure
        }
        setSaveMsg({ ok: false, text: errorText });
        return;
      }

      const saved = await res.json() as Lead;
      setSaveMsg({ ok: true, text: lead ? "Alterações salvas." : "Lead criado com sucesso." });
      onLeadSaved?.(saved);
    } finally {
      setSaving(false);
    }
  }

  async function enviarParaCorretor() {
    if (!lead) return;
    setSending(true);
    setSent(false);
    try {
      await fetch("/api/actions/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_to_broker", lead_id: lead.id, tenant_id: lead.tenant_id }),
      });
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-0">

      {/* ── Imóvel Associado ── */}
      {lead && (
        <div className={SECTION_CLS}>
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Imóvel Associado</h4>
          {(form.imovel_ref || form.interesse_principal || form.faixa_valor || form.bairro_interesse) ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
              {form.imovel_ref && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Imóvel</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {selectedImovel?.titulo_comercial ?? `Ref: ${form.imovel_ref.slice(0, 8)}...`}
                    </p>
                    {selectedImovel?.bairro && (
                      <p className="text-[11px] text-gray-400">{selectedImovel.bairro}</p>
                    )}
                  </div>
                  <a
                    href={`/cockpit/imoveis?ref=${encodeURIComponent(form.imovel_ref)}`}
                    className="text-xs text-brand-500 hover:underline whitespace-nowrap"
                  >
                    Ver imóvel →
                  </a>
                </div>
              )}
              {form.interesse_principal && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Tipo</p>
                  <p className="text-sm text-gray-700 dark:text-gray-200 capitalize">{form.interesse_principal}</p>
                </div>
              )}
              {form.faixa_valor && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Faixa de valor</p>
                  <p className="text-sm text-gray-700 dark:text-gray-200">{form.faixa_valor}</p>
                </div>
              )}
              {form.bairro_interesse && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Bairro</p>
                  <p className="text-sm text-gray-700 dark:text-gray-200">{form.bairro_interesse}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-4 flex flex-col items-center gap-1 text-center">
              <span className="text-2xl">🏠</span>
              <p className="text-sm text-gray-400">Nenhum imóvel associado</p>
              <p className="text-[11px] text-gray-400">Use o campo &quot;Referência do imóvel&quot; abaixo para associar</p>
            </div>
          )}
        </div>
      )}

      {/* ── Interesse Imobiliário ── */}
      {lead && (
        <div className={SECTION_CLS}>
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Interesse Imobiliário</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Tipo de imóvel</label>
              <select value={form.interesse_principal} onChange={(e) => set("interesse_principal", e.target.value)} className={SELECT_CLS}>
                <option value="">—</option>
                {["Apartamento", "Casa", "Terreno", "Cobertura"].map((o) => (
                  <option key={o} value={o.toLowerCase()}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Finalidade</label>
              <select value={form.finalidade} onChange={(e) => set("finalidade", e.target.value)} className={SELECT_CLS}>
                <option value="">—</option>
                {["Compra", "Aluguel"].map((o) => (
                  <option key={o} value={o.toLowerCase()}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Bairro de interesse</label>
              <select value={form.bairro_interesse} onChange={(e) => set("bairro_interesse", e.target.value)} className={SELECT_CLS}>
                <option value="">—</option>
                {BAIRROS_JP.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Faixa de valor</label>
              <input type="text" value={form.faixa_valor} onChange={(e) => set("faixa_valor", e.target.value)} placeholder="ex: R$ 700k – R$ 1M" className={INPUT_CLS} />
            </div>
            <div className="col-span-2">
              <label className={LABEL_CLS}>Referência do imóvel</label>
              <ImovelSearchSelect
                value={form.imovel_ref}
                onChange={(id, imovel) => { set("imovel_ref", id); setSelectedImovel(imovel); onImovelSelect?.(imovel); }}
                onResolve={(imovel) => { setSelectedImovel(imovel); onImovelSelect?.(imovel); }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Contato ── */}
      <div className={SECTION_CLS}>
        <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Contato</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Nome *</label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Telefone</label>
            <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>E-mail</label>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Corretor responsável</label>
            <select
              value={form.assigned_to}
              onChange={(e) => set("assigned_to", e.target.value)}
              className={SELECT_CLS}
            >
              <option value="">— Sem corretor —</option>
              {corretores.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Perfil Imobiliário (modo novo lead) ── */}
      {!lead && (
        <div className={SECTION_CLS}>
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Perfil Imobiliário</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Interesse principal</label>
              <select value={form.interesse_principal} onChange={(e) => set("interesse_principal", e.target.value)} className={SELECT_CLS}>
                <option value="">—</option>
                {["Apartamento", "Casa", "Terreno", "Cobertura"].map((o) => (
                  <option key={o} value={o.toLowerCase()}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Finalidade</label>
              <select value={form.finalidade} onChange={(e) => set("finalidade", e.target.value)} className={SELECT_CLS}>
                <option value="">—</option>
                {["Compra", "Aluguel"].map((o) => (
                  <option key={o} value={o.toLowerCase()}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Objetivo</label>
              <select value={form.objetivo} onChange={(e) => set("objetivo", e.target.value)} className={SELECT_CLS}>
                <option value="">—</option>
                {["Investimento", "Moradia"].map((o) => (
                  <option key={o} value={o.toLowerCase()}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Faixa de valor</label>
              <input type="text" value={form.faixa_valor} onChange={(e) => set("faixa_valor", e.target.value)} placeholder="ex: R$ 700k – R$ 1M" className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Bairro de interesse</label>
              <select value={form.bairro_interesse} onChange={(e) => set("bairro_interesse", e.target.value)} className={SELECT_CLS}>
                <option value="">—</option>
                {BAIRROS_JP.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className={LABEL_CLS}>Referência do imóvel</label>
              <ImovelSearchSelect
                value={form.imovel_ref}
                onChange={(id, imovel) => { set("imovel_ref", id); setSelectedImovel(imovel); onImovelSelect?.(imovel); }}
                onResolve={(imovel) => { setSelectedImovel(imovel); onImovelSelect?.(imovel); }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Agendamento ── */}
      <div className={SECTION_CLS}>
        <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Agendamento</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Data do agendamento</label>
            <input type="text" value={form.data_agendamento} onChange={(e) => set("data_agendamento", e.target.value)} placeholder="dd/mm/aaaa" className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Status do agendamento</label>
            <select value={form.status_agendamento} onChange={(e) => set("status_agendamento", e.target.value)} className={SELECT_CLS}>
              <option value="">—</option>
              {["Pendente", "Confirmado", "Realizado", "Cancelado"].map((o) => (
                <option key={o} value={o.toLowerCase()}>{o}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className={LABEL_CLS}>Janela de visita</label>
            <input type="text" value={form.janela_visita} onChange={(e) => set("janela_visita", e.target.value)} placeholder="ex: Sábado manhã" className={INPUT_CLS} />
          </div>
        </div>
      </div>

      {/* ── Origem & Status ── */}
      <div className={SECTION_CLS}>
        <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Origem & Status</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Origem</label>
            <select value={form.source} onChange={(e) => set("source", e.target.value)} className={SELECT_CLS}>
              <option value="">—</option>
              {["WhatsApp", "Instagram", "Site Jurema", "Zap Imóveis", "OLX", "Indicação", "Orgânico"].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Score (0–100)</label>
            <input type="number" value={form.score} onChange={(e) => set("score", e.target.value)} min={0} max={100} className={INPUT_CLS} />
          </div>
          <div className="col-span-2">
            <label className={LABEL_CLS}>Status</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value as LeadStatus)} className={SELECT_CLS}>
              {Object.entries(STATUS_BADGE).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Notas ── */}
      <div className={SECTION_CLS}>
        <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Perfil Resumido</h4>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          placeholder="Resumo do perfil, observações da IA..."
          className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-gray-500 resize-none"
        />
      </div>

      {/* ── Ações ── */}
      <div className="space-y-3 pt-2">
        {/* Feedback */}
        {saveMsg && (
          <p className={`rounded-lg px-4 py-2.5 text-sm ${
            saveMsg.ok
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
          }`}>
            {saveMsg.text}
          </p>
        )}

        {/* Salvar */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          {saving ? (
            <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Salvando...</>
          ) : lead ? "Salvar alterações" : "Criar Lead"}
        </button>

        {/* Enviar para corretor (só em modo edição) */}
        {lead && (
          <>
            {sent && (
              <p className="rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                Lead enviado ao corretor via n8n.
              </p>
            )}
            <button
              onClick={enviarParaCorretor}
              disabled={sending}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand-300 px-5 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-60 transition-colors dark:border-brand-700 dark:text-brand-400 dark:hover:bg-brand-500/10"
            >
              {sending ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-400/30 border-t-brand-500" />Enviando...</>
              ) : "Enviar lead quente para corretor"}
            </button>
          </>
        )}
      </div>
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
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-600">
        {MOCK_MSGS.map((msg) => (
          <div key={msg.id} className={`flex ${msg.de === "agente" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
              msg.de === "agente"
                ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-tl-sm"
                : "bg-brand-500 text-white rounded-tr-sm"
            }`}>
              <p>{msg.texto}</p>
              <p className={`text-[10px] mt-1 ${msg.de === "agente" ? "text-gray-400" : "text-white/60"}`}>
                {msg.hora} {msg.de === "agente" ? "• Luana" : `• ${lead.name.split(" ")[0]}`}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Mensagem via WhatsApp..."
          className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500"
        />
        <button onClick={() => setInput("")} className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors">▶</button>
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
        {MOCK_ATIVIDADES.map((a) => {
          const Icon = ACTIVITY_ICON[a.tipo];
          return (
          <li key={a.id} className="flex gap-3">
            <span className="shrink-0 mt-0.5 text-gray-400"><Icon className="w-4 h-4" /></span>
            <div className="flex-1 border-b border-gray-50 dark:border-gray-800 pb-3">
              <p className="text-sm text-gray-700 dark:text-gray-200">{a.descricao}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-gray-400">{a.data}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  a.tipo === "ia"     ? "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400" :
                  a.tipo === "n8n"    ? "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" :
                  a.tipo === "status" ? "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" :
                  "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                }`}>
                  {a.tipo}
                </span>
              </div>
            </div>
          </li>
          );
        })}
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
    setTarefas((prev) => [...prev, { id: Date.now().toString(), titulo: nova, feita: false, responsavel: "Jurema", prazo: "—" }]);
    setNova("");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {tarefas.map((t) => (
          <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors">
            <input type="checkbox" checked={t.feita} onChange={() => toggle(t.id)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500 cursor-pointer" />
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${t.feita ? "line-through text-gray-400" : "text-gray-700 dark:text-gray-200"}`}>{t.titulo}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[11px] text-gray-400">👤 {t.responsavel}</span>
                <span className="text-[11px] text-gray-400">📅 {t.prazo}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTarefa()}
          placeholder="Nova tarefa..."
          className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500"
        />
        <button onClick={addTarefa} className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors">+</button>
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
      setResult(`Ação "${acao}" disparada com sucesso via n8n.`);
    } catch {
      setResult("Erro ao conectar com n8n.");
    } finally {
      setLoading(null);
    }
  }

  const acoes = [
    { key: "gerar_proposta",       label: "📄 Gerar Proposta",      desc: "IA cria proposta personalizada com base no briefing" },
    { key: "resumir_lead",         label: "🧠 Resumir Lead",        desc: "IA resume perfil, histórico e próximos passos" },
    { key: "analisar_conversa",    label: "💬 Analisar Conversa",   desc: "IA analisa sentimento e intenção de compra" },
    { key: "sugerir_proximo_passo",label: "🚀 Sugerir Próximo Passo",desc: "IA recomenda a melhor ação baseada no contexto" },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">Cada ação dispara webhook no n8n → resposta retorna aqui</p>
      {acoes.map(({ key, label, desc }) => (
        <button key={key} onClick={() => dispararWebhook(key)} disabled={loading === key}
          className="w-full flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:bg-brand-50/30 dark:hover:bg-brand-500/5 transition-all text-left group">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800 dark:text-white/90 group-hover:text-brand-600 dark:group-hover:text-brand-400">
              {loading === key ? <span className="flex items-center gap-2"><span className="inline-block w-3 h-3 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />Processando...</span> : label}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
          </div>
          <span className="text-gray-300 dark:text-gray-600 group-hover:text-brand-400 text-lg">→</span>
        </button>
      ))}
      {result && (
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-sm text-gray-600 dark:text-gray-300">{result}</div>
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
          <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors">
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
  isOpen: boolean;
  onClose: () => void;
  onLeadSaved?: (lead: Lead) => void;
  onLeadDeleted?: (leadId: string) => void;
  // Corretores for assignment UI
  // TODO: fetch from /api/corretores — currently passed from LeadsClient
  corretores?: Corretor[];
}

export default function LeadDrawer({
  lead,
  isOpen,
  onClose,
  onLeadSaved,
  onLeadDeleted,
  corretores = [],
}: LeadDrawerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("dados");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedImovel, setSelectedImovel] = useState<N8nImovel | null>(null);

  function handleNovoContrato() {
    if (!lead) return;
    const params = new URLSearchParams();
    params.set("lead_id", lead.id);
    const propertyId = selectedImovel?.id ?? lead.imovel_ref ?? null;
    if (propertyId) params.set("property_id", propertyId);
    if (lead.assigned_to) params.set("broker_id", lead.assigned_to);
    router.push(`/cockpit/contratos/novo?${params.toString()}`);
    onClose();
  }

  // Reset tab when drawer opens
  useEffect(() => {
    if (isOpen) setActiveTab("dados");
    setConfirmDelete(false);
  }, [isOpen, lead?.id]);

  async function handleDelete() {
    if (!lead) return;
    setDeleting(true);
    try {
      await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
      onLeadDeleted?.(lead.id);
      onClose();
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const title = lead ? lead.name : "Novo Lead";
  const avatarContent = lead ? getInitials(lead.name) : "+";
  const avatarClass = lead ? avatarBg(lead.id) : "bg-brand-500";

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[440px] lg:w-[480px] bg-white dark:bg-gray-900 border-l-2 border-brand-500/30 dark:border-brand-500/40 shadow-2xl shadow-brand-500/5 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between p-5 border-b border-gray-200 dark:border-gray-800 shrink-0 bg-gradient-to-r from-brand-500/5 to-transparent dark:from-brand-500/10 dark:to-transparent">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white ${avatarClass}`}>
              {avatarContent}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">{title}</h2>
              {lead && (
                <div className="mt-1 flex items-center gap-2">
                  <Badge size="sm" color={STATUS_BADGE[lead.status].color}>
                    {STATUS_BADGE[lead.status].label}
                  </Badge>
                  <span className="inline-flex items-center gap-1.5 text-xs text-brand-500">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
                    </span>
                    Chat ativo
                  </span>
                </div>
              )}
              {!lead && (
                <p className="text-xs text-gray-400">Preencha os dados do lead</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Novo Contrato (só em modo edição) */}
            {lead && (
              <button
                type="button"
                onClick={handleNovoContrato}
                className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 active:scale-95 transition-all"
              >
                Novo Contrato
              </button>
            )}
            {/* Excluir (só em modo edição) */}
            {lead && !confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-gray-400 hover:text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                title="Excluir lead"
              >
                Excluir
              </button>
            )}
            {lead && confirmDelete && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Confirmar?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-lg transition-colors disabled:opacity-60"
                >
                  {deleting ? "..." : "Sim"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Não
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg transition-colors ml-1"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>
        </div>

        {/* ── Quick Actions Bar (só em modo edição) ── */}
        {lead && (
          <QuickActionsBar lead={lead} onLeadSaved={onLeadSaved} />
        )}

        {/* ── Corretor Card (só em modo edição, quando corretores disponíveis) ── */}
        {lead && corretores.length > 0 && (
          <CorretorCard lead={lead} corretores={corretores} onLeadSaved={onLeadSaved} />
        )}

        {/* ── Tabs (só em modo edição) ── */}
        {lead && (
          <div className="flex border-b border-gray-100 dark:border-gray-800 shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-600">
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
        )}

        {/* ── Tab content ── */}
        <div className="flex-1 overflow-y-auto p-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-600">
          {/* No modo Novo Lead, sempre mostra o form */}
          {!lead && (
            <TabDados lead={null} onLeadSaved={onLeadSaved} corretores={corretores} onImovelSelect={(imovel) => setSelectedImovel(imovel)} />
          )}

          {/* No modo Edição, mostra a aba ativa */}
          {lead && activeTab === "dados"      && <TabDados lead={lead} onLeadSaved={onLeadSaved} corretores={corretores} onImovelSelect={(imovel) => setSelectedImovel(imovel)} />}
          {lead && activeTab === "conversas"  && <TabConversas lead={lead} />}
          {lead && activeTab === "atividades" && <TabAtividades />}
          {lead && activeTab === "tarefas"    && <TabTarefas />}
          {lead && activeTab === "ia"         && <TabIA lead={lead} />}
          {lead && activeTab === "arquivos"   && <TabArquivos />}
        </div>
      </div>

    </>
  );
}
