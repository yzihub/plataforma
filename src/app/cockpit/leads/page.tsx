"use client";

import { useState, useMemo } from "react";
import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CommandButton, { CrmAction } from "@/components/yzihub/CommandButton";
import { CloseIcon, PlusIcon, UserCircleIcon } from "@/icons";

// ─── Types ────────────────────────────────────────────────────────────────────

type LeadStatus = "Novo" | "Contato" | "Qualificado" | "Proposta" | "Fechado";
type LeadOrigem = "Instagram" | "Site" | "Indicação" | "WhatsApp";

type TimelineEntry = {
  data: string;
  descricao: string;
  tipo: "entrada" | "contato" | "proposta" | "reuniao" | "fechamento";
};

type Lead = {
  id: string;
  tenant_id: string;
  nome: string;
  email: string;
  telefone: string;
  origem: LeadOrigem;
  status: LeadStatus;
  score: number; // 0-100
  valor: number;
  criado_em: string;
  avatar?: string;
  empresa?: string;
  timeline: TimelineEntry[];
};

// ─── Mock data (estruturado para Supabase) ────────────────────────────────────

const TENANT_ID = "tenant_cafe_pam";

const mockLeads: Lead[] = [
  {
    id: "lead_001",
    tenant_id: TENANT_ID,
    nome: "Fernanda Oliveira",
    email: "fernanda@email.com",
    telefone: "(11) 99876-5432",
    origem: "Instagram",
    status: "Qualificado",
    score: 82,
    valor: 8500,
    criado_em: "2026-03-01T10:00:00Z",
    empresa: "Studio FO Design",
    timeline: [
      { data: "2026-03-01", descricao: "Lead entrou via Instagram", tipo: "entrada" },
      { data: "2026-03-03", descricao: "Primeiro contato via WhatsApp", tipo: "contato" },
      { data: "2026-03-10", descricao: "Reunião de briefing realizada", tipo: "reuniao" },
    ],
  },
  {
    id: "lead_002",
    tenant_id: TENANT_ID,
    nome: "Carlos Mendes",
    email: "carlos@email.com",
    telefone: "(21) 98765-4321",
    origem: "WhatsApp",
    status: "Proposta",
    score: 91,
    valor: 15000,
    criado_em: "2026-03-05T14:00:00Z",
    empresa: "Mendes Incorporações",
    timeline: [
      { data: "2026-03-05", descricao: "Lead entrou via WhatsApp", tipo: "entrada" },
      { data: "2026-03-06", descricao: "Agente Nina iniciou conversa", tipo: "contato" },
      { data: "2026-03-12", descricao: "Proposta enviada por e-mail", tipo: "proposta" },
    ],
  },
  {
    id: "lead_003",
    tenant_id: TENANT_ID,
    nome: "Juliana Costa",
    email: "ju.costa@email.com",
    telefone: "(31) 97654-3210",
    origem: "Indicação",
    status: "Novo",
    score: 45,
    valor: 4200,
    criado_em: "2026-03-15T09:30:00Z",
    timeline: [
      { data: "2026-03-15", descricao: "Lead indicado por Fernanda Oliveira", tipo: "entrada" },
    ],
  },
  {
    id: "lead_004",
    tenant_id: TENANT_ID,
    nome: "Ricardo Alves",
    email: "ricardo@email.com",
    telefone: "(11) 96543-2109",
    origem: "Site",
    status: "Contato",
    score: 63,
    valor: 6800,
    criado_em: "2026-03-18T16:00:00Z",
    empresa: "Alves & Soc.",
    timeline: [
      { data: "2026-03-18", descricao: "Lead entrou pelo formulário do site", tipo: "entrada" },
      { data: "2026-03-19", descricao: "Email de boas-vindas enviado", tipo: "contato" },
    ],
  },
  {
    id: "lead_005",
    tenant_id: TENANT_ID,
    nome: "Beatriz Santos",
    email: "bea@email.com",
    telefone: "(41) 95432-1098",
    origem: "Instagram",
    status: "Fechado",
    score: 98,
    valor: 22000,
    criado_em: "2026-02-10T11:00:00Z",
    empresa: "Santos Arquitetura",
    timeline: [
      { data: "2026-02-10", descricao: "Lead entrou via Instagram Ads", tipo: "entrada" },
      { data: "2026-02-12", descricao: "Reunião de apresentação", tipo: "reuniao" },
      { data: "2026-02-20", descricao: "Proposta aprovada", tipo: "proposta" },
      { data: "2026-03-01", descricao: "Contrato assinado — projeto iniciado", tipo: "fechamento" },
    ],
  },
  {
    id: "lead_006",
    tenant_id: TENANT_ID,
    nome: "Thiago Rocha",
    email: "thiago@email.com",
    telefone: "(85) 94321-0987",
    origem: "WhatsApp",
    status: "Qualificado",
    score: 75,
    valor: 9300,
    criado_em: "2026-03-20T08:00:00Z",
    timeline: [
      { data: "2026-03-20", descricao: "Lead entrou via WhatsApp direto", tipo: "entrada" },
      { data: "2026-03-21", descricao: "IA Nina qualificou interesse", tipo: "contato" },
    ],
  },
  {
    id: "lead_007",
    tenant_id: TENANT_ID,
    nome: "Mariana Lima",
    email: "mari.lima@email.com",
    telefone: "(11) 93210-9876",
    origem: "Site",
    status: "Novo",
    score: 30,
    valor: 3500,
    criado_em: "2026-03-25T13:00:00Z",
    timeline: [
      { data: "2026-03-25", descricao: "Lead entrou pelo site", tipo: "entrada" },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<LeadStatus, "success" | "info" | "warning" | "primary" | "light"> = {
  Novo: "info",
  Contato: "warning",
  Qualificado: "success",
  Proposta: "primary",
  Fechado: "light",
};

const TIMELINE_ICONS: Record<TimelineEntry["tipo"], string> = {
  entrada: "🟢",
  contato: "💬",
  proposta: "📄",
  reuniao: "📅",
  fechamento: "🏆",
};

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function getInitials(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500",
];

function avatarColor(id: string) {
  const idx = id.charCodeAt(id.length - 1) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

// ─── Score Bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-emerald-500" :
    score >= 50 ? "bg-amber-500" :
    "bg-rose-500";

  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-6 text-right">
        {score}
      </span>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ lead }: { lead: Lead }) {
  if (lead.avatar) {
    return (
      <img
        src={lead.avatar}
        alt={lead.nome}
        className="w-8 h-8 rounded-full object-cover"
      />
    );
  }
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${avatarColor(lead.id)}`}
    >
      {getInitials(lead.nome)}
    </div>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

const COMMAND_ACTIONS: { action: CrmAction; label: string }[] = [
  { action: "contact", label: "ENTRAR EM CONTATO" },
  { action: "schedule", label: "MARCAR REUNIÃO" },
  { action: "send_proposal", label: "GERAR PROPOSTA" },
  { action: "close", label: "FECHAR" },
  { action: "lose", label: "PERDER" },
];

function LeadDrawer({
  lead,
  onClose,
}: {
  lead: Lead | null;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          lead ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
          lead ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {lead && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white ${avatarColor(lead.id)}`}
                >
                  {getInitials(lead.nome)}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
                    {lead.nome}
                  </h2>
                  {lead.empresa && (
                    <p className="text-xs text-gray-400">{lead.empresa}</p>
                  )}
                  <div className="mt-1">
                    <Badge size="sm" color={STATUS_BADGE[lead.status]}>
                      {lead.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg transition-colors"
              >
                <CloseIcon className="size-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Dados do lead */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                  Dados do Lead
                </h3>
                <div className="space-y-2">
                  {[
                    { label: "E-mail", value: lead.email },
                    { label: "Telefone", value: lead.telefone },
                    { label: "Origem", value: lead.origem },
                    { label: "Score", value: `${lead.score}/100` },
                    { label: "Valor estimado", value: formatCurrency(lead.valor) },
                    { label: "Entrada", value: formatDate(lead.criado_em) },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800/60"
                    >
                      <span className="text-xs text-gray-400">{label}</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Timeline */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                  Timeline
                </h3>
                <ol className="space-y-3">
                  {lead.timeline.map((entry, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-base leading-none mt-0.5">
                        {TIMELINE_ICONS[entry.tipo]}
                      </span>
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-200">
                          {entry.descricao}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(entry.data).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            {/* CommandButtons — fixed footer */}
            <div className="p-6 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Ações
              </p>
              <div className="flex flex-wrap gap-2">
                {COMMAND_ACTIONS.map(({ action }) => (
                  <CommandButton
                    key={action}
                    action={action}
                    leadId={lead.id}
                    tenantId={lead.tenant_id}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Search + Filters ─────────────────────────────────────────────────────────

const ALL_STATUS: LeadStatus[] = ["Novo", "Contato", "Qualificado", "Proposta", "Fechado"];
const ALL_ORIGENS: LeadOrigem[] = ["Instagram", "Site", "Indicação", "WhatsApp"];

function SearchBar({
  search,
  status,
  origem,
  onSearch,
  onStatus,
  onOrigem,
}: {
  search: string;
  status: string;
  origem: string;
  onSearch: (v: string) => void;
  onStatus: (v: string) => void;
  onOrigem: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Busca */}
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Buscar lead por nome, email..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder-gray-500"
        />
      </div>

      {/* Filtro status */}
      <select
        value={status}
        onChange={(e) => onStatus(e.target.value)}
        className="rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90"
      >
        <option value="">Todos os status</option>
        {ALL_STATUS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Filtro origem */}
      <select
        value={origem}
        onChange={(e) => onOrigem(e.target.value)}
        className="rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90"
      >
        <option value="">Todas as origens</option>
        {ALL_ORIGENS.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Leads Table ──────────────────────────────────────────────────────────────

function LeadsTable({
  leads,
  onSelect,
}: {
  leads: Lead[];
  onSelect: (lead: Lead) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-gray-800">
            <TableRow className="bg-gray-50 dark:bg-gray-800/40">
              {["Lead", "Origem", "Status", "Score", "Valor", "Data", ""].map((h) => (
                <TableCell
                  key={h}
                  isHeader
                  className="py-3 px-5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 text-left"
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-50 dark:divide-gray-800">
            {leads.length === 0 ? (
              <TableRow>
                <TableCell className="py-16 px-5 text-center text-sm text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <UserCircleIcon className="size-10 text-gray-200 dark:text-gray-700" />
                    <span>Nenhum lead encontrado</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => onSelect(lead)}
                  className="cursor-pointer hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors"
                >
                  {/* Avatar + Nome */}
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <Avatar lead={lead} />
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {lead.nome}
                        </p>
                        <p className="text-xs text-gray-400">{lead.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Origem */}
                  <td className="py-3.5 px-5 text-sm text-gray-500 dark:text-gray-400">
                    {lead.origem}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-5">
                    <Badge size="sm" color={STATUS_BADGE[lead.status]}>
                      {lead.status}
                    </Badge>
                  </td>

                  {/* Score */}
                  <td className="py-3.5 px-5">
                    <ScoreBar score={lead.score} />
                  </td>

                  {/* Valor */}
                  <td className="py-3.5 px-5 text-sm font-medium text-gray-700 dark:text-gray-200">
                    {formatCurrency(lead.valor)}
                  </td>

                  {/* Data */}
                  <td className="py-3.5 px-5 text-sm text-gray-400">
                    {formatDate(lead.criado_em)}
                  </td>

                  {/* Ações */}
                  <td className="py-3.5 px-5">
                    <span className="text-xs text-brand-500 font-medium hover:underline">
                      Ver detalhes →
                    </span>
                  </td>
                </tr>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOrigem, setFilterOrigem] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const filteredLeads = useMemo(() => {
    return mockLeads.filter((l) => {
      const matchSearch =
        !search ||
        l.nome.toLowerCase().includes(search.toLowerCase()) ||
        l.email.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !filterStatus || l.status === filterStatus;
      const matchOrigem = !filterOrigem || l.origem === filterOrigem;
      return matchSearch && matchStatus && matchOrigem;
    });
  }, [search, filterStatus, filterOrigem]);

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Leads</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filteredLeads.length} de {mockLeads.length} leads
            </p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 transition-colors self-start sm:self-auto">
            <PlusIcon className="size-4" />
            Novo Lead
          </button>
        </div>

        {/* Busca e filtros */}
        <SearchBar
          search={search}
          status={filterStatus}
          origem={filterOrigem}
          onSearch={setSearch}
          onStatus={setFilterStatus}
          onOrigem={setFilterOrigem}
        />

        {/* Tabela */}
        <LeadsTable leads={filteredLeads} onSelect={setSelectedLead} />
      </div>

      {/* Drawer lateral */}
      <LeadDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} />
    </>
  );
}
