"use client";
import { useState } from "react";
import Badge from "@/components/ui/badge/Badge";
import { Modal } from "@/components/ui/modal";
import {
  Table, TableBody, TableCell, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DocsIcon, GridIcon, GroupIcon, ListIcon, PlusIcon, UserCircleIcon,
  CloseIcon, CheckCircleIcon, PaperPlaneIcon, TimeIcon,
} from "@/icons";

// ── Types ─────────────────────────────────────────────────────────────────────
type Consultoria = {
  id: string;
  nome: string;
  status_atendimento: string | null;
  criado_em_supabase: string | null;
  numero_whatsapp: string | null;
  email: string | null;
  cpf: string | null;
  origem_lead: string | null;
  cidade: string | null;
  nina_summary: string | null;
  data_agendamento: string | null;
  meet_link: string | null;
  link_pagamento: string | null;
  foto_cliente_url: string | null;
  ambientes: string | null;
  cores: string | null;
  sensacao_desejada: string | null;
  metragem: number | null;
  valor_total: number | null;
  forma_pagamento: string | null;
  status_pagamento: string | null;
  tenant_id: string | null;
  id_customer?: string | null;
};

type View = "grid" | "kanban" | "gallery";
type BadgeColor = "success" | "info" | "warning" | "primary" | "light" | "error";

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusColor(s: string | null): BadgeColor {
  switch (s?.toLowerCase()) {
    case "qualificado":  return "success";
    case "pago":         return "success";
    case "novo lead":    return "info";
    case "novo":         return "info";
    case "agendado":     return "warning";
    case "link gerado":  return "warning";
    case "cancelado":    return "error";
    case "concluído":    return "primary";
    case "fechado":      return "primary";
    default:             return "light";
  }
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatCurrency(v: number | null) {
  if (!v) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

// ── Entity Sheet ──────────────────────────────────────────────────────────────
function LeadSheet({ lead, onClose }: { lead: Consultoria; onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/[0.05] bg-black shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.05] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
              <UserCircleIcon className="size-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">{lead.nome}</h2>
              <p className="text-xs text-white/40">{lead.id_customer ?? lead.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <Badge color={statusColor(lead.status_atendimento)}>
              {lead.status_atendimento ?? "—"}
            </Badge>
            {lead.status_pagamento && (
              <Badge color={lead.status_pagamento === "PAGO" ? "success" : "warning"} variant="solid">
                {lead.status_pagamento}
              </Badge>
            )}
          </div>

          {/* Seção: Contato */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-500">
              Contato
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "WhatsApp", value: lead.numero_whatsapp },
                { label: "Email",    value: lead.email },
                { label: "CPF",      value: lead.cpf },
                { label: "Cidade",   value: lead.cidade },
                { label: "Origem",   value: lead.origem_lead },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                  <p className="text-[10px] font-medium uppercase text-white/30">{label}</p>
                  <p className="mt-0.5 text-sm text-white/80">{value ?? "—"}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Seção: Briefing */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-500">
              Briefing
            </h3>
            <div className="space-y-3">
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <label className="text-[10px] font-medium uppercase text-white/30">Estilo / Ambientes</label>
                <p className="mt-0.5 text-sm text-white/80">{lead.ambientes ?? "—"}</p>
              </div>
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <label className="text-[10px] font-medium uppercase text-white/30">Cores Preferidas</label>
                <p className="mt-0.5 text-sm text-white/80">{lead.cores ?? "—"}</p>
              </div>
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <label className="text-[10px] font-medium uppercase text-white/30">Sensação Desejada</label>
                <p className="mt-0.5 text-sm text-white/80">{lead.sensacao_desejada ?? "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                  <label className="text-[10px] font-medium uppercase text-white/30">Metragem</label>
                  <p className="mt-0.5 text-sm text-white/80">{lead.metragem ? `${lead.metragem} m²` : "—"}</p>
                </div>
                <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                  <label className="text-[10px] font-medium uppercase text-white/30">Orçamento</label>
                  <p className="mt-0.5 text-sm text-white/80">{formatCurrency(lead.valor_total)}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Seção: Resumo IA */}
          {lead.nina_summary && (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-500">
                Resumo NINA
              </h3>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="text-sm leading-relaxed text-white/70">{lead.nina_summary}</p>
              </div>
            </section>
          )}

          {/* Seção: Agendamento */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-500">
              Agendamento
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <TimeIcon className="size-4 text-white/30" />
                <span className="text-sm text-white/80">{formatDate(lead.data_agendamento)}</span>
              </div>
              {lead.meet_link && (
                <a
                  href={lead.meet_link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 transition-colors hover:border-emerald-500/40"
                >
                  <DocsIcon className="size-4 text-emerald-500" />
                  <span className="text-sm text-emerald-400 underline underline-offset-2">Link da Reunião</span>
                </a>
              )}
            </div>
          </section>

          {/* Seção: Mídia placeholder */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-500">
              Mídia
            </h3>
            {lead.foto_cliente_url ? (
              <div className="grid grid-cols-3 gap-2">
                <div className="aspect-square overflow-hidden rounded-lg border border-white/[0.05]">
                  <img src={lead.foto_cliente_url} alt="" className="h-full w-full object-cover" />
                </div>
              </div>
            ) : (
              <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-white/[0.08] text-xs text-white/30">
                Nenhuma mídia enviada
              </div>
            )}
          </section>

          {/* Timeline placeholder */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-500">
              Timeline
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-white/70">Lead criado</p>
                  <p className="text-[10px] text-white/30">{formatDate(lead.criado_em_supabase)}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.05]">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                </div>
                <p className="text-xs text-white/30 italic">Mais eventos aparecerão aqui…</p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer: Action Buttons */}
        <div className="border-t border-white/[0.05] px-6 py-4 space-y-2">
          {lead.numero_whatsapp && (
            <a
              href={`https://wa.me/${lead.numero_whatsapp?.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
            >
              <PaperPlaneIcon className="size-4" />
              Enviar mensagem WhatsApp
            </a>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-white/70 transition-colors hover:border-emerald-500/40 hover:text-emerald-400">
              <TimeIcon className="size-3.5" />
              Ver histórico
            </button>
            <button className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-white/70 transition-colors hover:border-emerald-500/40 hover:text-emerald-400">
              <CheckCircleIcon className="size-3.5" />
              Marcar fechado
            </button>
          </div>
          {lead.link_pagamento && (
            <a
              href={lead.link_pagamento}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
            >
              Enviar Link de Pagamento
            </a>
          )}
        </div>
      </div>
    </>
  );
}

// ── Nova Consultoria Modal ─────────────────────────────────────────────────────
function NovaConsultoriaModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <div className="bg-black rounded-3xl border border-white/[0.08] p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Nova Consultoria</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <CloseIcon className="size-5" />
          </button>
        </div>
        <div className="space-y-4">
          {[
            { label: "Nome do Cliente", placeholder: "Ex: Maria Silva", type: "text" },
            { label: "WhatsApp",        placeholder: "+55 83 9 0000-0000",  type: "tel" },
            { label: "Email",           placeholder: "email@exemplo.com",   type: "email" },
            { label: "Cidade",          placeholder: "João Pessoa",         type: "text" },
          ].map(({ label, placeholder, type }) => (
            <div key={label}>
              <label className="mb-1.5 block text-xs font-medium text-white/50">{label}</label>
              <input
                type={type}
                placeholder={placeholder}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none transition focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
              />
            </div>
          ))}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Status</label>
            <select className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500/60">
              <option value="Novo Lead">Novo Lead</option>
              <option value="Agendado">Agendado</option>
              <option value="Qualificado">Qualificado</option>
              <option value="PAGO">PAGO</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Melhoria Desejada</label>
            <textarea
              rows={3}
              placeholder="Descreva o projeto..."
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none transition focus:border-emerald-500/60"
            />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-sm font-medium text-white/60 transition-colors hover:border-white/20 hover:text-white"
          >
            Cancelar
          </button>
          <button className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600">
            Criar Consultoria
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Grid View ─────────────────────────────────────────────────────────────────
function GridView({ items, onSelect }: { items: Consultoria[]; onSelect: (c: Consultoria) => void }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setChecked((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleAll = () =>
    setChecked(checked.size === items.length ? new Set() : new Set(items.map((i) => i.id)));

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.05] bg-black">
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-white/[0.05] bg-white/[0.02]">
            <TableRow>
              <TableCell isHeader className="w-10 py-3 px-4">
                <input
                  type="checkbox"
                  checked={checked.size === items.length && items.length > 0}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-white/20 bg-transparent accent-emerald-500"
                />
              </TableCell>
              {["Cliente", "Data", "Status", "Moodboard", "Pagamento"].map((h) => (
                <TableCell key={h} isHeader className="py-3 px-4 text-xs font-medium text-white/40 text-start">
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-white/[0.03]">
            {items.length === 0 ? (
              <TableRow>
                <TableCell className="py-10 text-center text-sm text-white/30">
                  Nenhuma consultoria encontrada.
                </TableCell>
              </TableRow>
            ) : (
              items.map((c) => (
                <TableRow
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className="cursor-pointer transition-colors hover:bg-emerald-500/[0.04]"
                >
                  <TableCell className="w-10 py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checked.has(c.id)}
                      onChange={() => toggle(c.id)}
                      className="h-4 w-4 rounded border-white/20 bg-transparent accent-emerald-500"
                    />
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-500">
                        {c.nome?.charAt(0).toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white/90">{c.nome ?? "—"}</p>
                        <p className="text-xs text-white/30">{c.numero_whatsapp ?? c.email ?? "—"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-4 text-sm text-white/50">
                    {formatDate(c.criado_em_supabase)}
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <Badge size="sm" color={statusColor(c.status_atendimento)}>
                      {c.status_atendimento ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    {c.meet_link ? (
                      <a
                        href={c.meet_link}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-emerald-500 hover:underline"
                      >
                        <DocsIcon className="size-3.5" />
                        Ver
                      </a>
                    ) : (
                      <span className="text-xs text-white/20">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    {c.status_pagamento ? (
                      <Badge size="sm" color={c.status_pagamento === "PAGO" ? "success" : "warning"}>
                        {c.status_pagamento}
                      </Badge>
                    ) : (
                      <span className="text-xs text-white/20">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Kanban View ───────────────────────────────────────────────────────────────
const KANBAN_COLS = [
  { key: "novo lead",    label: "Novo Lead",    stripe: "bg-blue-500",     color: "text-blue-400",    badge: "bg-blue-500/15 text-blue-400" },
  { key: "agendado",     label: "Agendado",     stripe: "bg-yellow-500",   color: "text-yellow-400",  badge: "bg-yellow-500/15 text-yellow-400" },
  { key: "qualificado",  label: "Qualificado",  stripe: "bg-emerald-500",  color: "text-emerald-400", badge: "bg-emerald-500/15 text-emerald-400" },
  { key: "pago",         label: "Pago",         stripe: "bg-violet-500",   color: "text-violet-400",  badge: "bg-violet-500/15 text-violet-400" },
];

function KanbanView({ items, onSelect }: { items: Consultoria[]; onSelect: (c: Consultoria) => void }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {KANBAN_COLS.map((col) => {
        const cards = items.filter(
          (c) => (c.status_atendimento ?? "novo lead").toLowerCase() === col.key
        );
        return (
          <div key={col.key} className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.05] bg-black">
            <div className={`${col.stripe} h-0.5 w-full`} />
            <div className="flex items-center justify-between px-4 py-3">
              <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${col.badge}`}>
                {cards.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 px-3 pb-4">
              {cards.length === 0 ? (
                <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-white/[0.05] text-xs text-white/20">
                  Sem registros
                </div>
              ) : (
                cards.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onSelect(c)}
                    className="cursor-pointer rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/[0.04]"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-500">
                        {c.nome?.charAt(0).toUpperCase() ?? "?"}
                      </div>
                      <p className="text-sm font-medium text-white/80">{c.nome}</p>
                    </div>
                    {c.ambientes && (
                      <p className="mt-1.5 text-xs text-white/30">{c.ambientes}</p>
                    )}
                    {c.valor_total && (
                      <p className="mt-1 text-xs font-medium text-emerald-500">{formatCurrency(c.valor_total)}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Gallery View ──────────────────────────────────────────────────────────────
function GalleryView({ items, onSelect }: { items: Consultoria[]; onSelect: (c: Consultoria) => void }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {items.length === 0 ? (
        <p className="col-span-full py-10 text-center text-sm text-white/30">Nenhum briefing encontrado.</p>
      ) : (
        items.map((c) => (
          <div
            key={c.id}
            onClick={() => onSelect(c)}
            className="cursor-pointer overflow-hidden rounded-2xl border border-white/[0.05] bg-black transition-all hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5"
          >
            <div className="relative aspect-video w-full overflow-hidden bg-white/[0.03]">
              {c.foto_cliente_url ? (
                <img src={c.foto_cliente_url} alt={c.nome ?? ""} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <UserCircleIcon className="size-12 text-white/10" />
                </div>
              )}
              {/* Status pill overlay */}
              <div className="absolute bottom-2 left-2">
                <Badge size="sm" color={statusColor(c.status_atendimento)}>
                  {c.status_atendimento ?? "—"}
                </Badge>
              </div>
            </div>
            <div className="p-4">
              <p className="truncate text-sm font-semibold text-white/90">{c.nome}</p>
              <p className="mt-0.5 text-xs text-white/30">{c.ambientes ?? c.cidade ?? "—"}</p>
              {c.valor_total && (
                <p className="mt-2 text-sm font-medium text-emerald-500">{formatCurrency(c.valor_total)}</p>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ConsultoriasView({ items }: { items: Consultoria[] }) {
  const [view, setView]           = useState<View>("grid");
  const [selected, setSelected]   = useState<Consultoria | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const tabs: { key: View; label: string; icon: React.ReactNode }[] = [
    { key: "grid",    label: "Grid de Clientes",   icon: <GridIcon className="size-4" /> },
    { key: "kanban",  label: "Kanban de Status",   icon: <ListIcon className="size-4" /> },
    { key: "gallery", label: "Galeria de Briefings", icon: <GroupIcon className="size-4" /> },
  ];

  return (
    <>
      <div className="space-y-5">
        {/* ── Page Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Consultorias</h1>
            <p className="mt-0.5 text-sm text-white/40">
              {items.length} {items.length === 1 ? "cliente" : "clientes"} · Café com PAM
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 transition-colors hover:bg-emerald-600"
          >
            <PlusIcon className="size-4" />
            Nova Consultoria
          </button>
        </div>

        {/* ── Tabs Switcher ── */}
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.05] bg-black p-1 w-fit">
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                view === key
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* ── Views ── */}
        {view === "grid"    && <GridView    items={items} onSelect={setSelected} />}
        {view === "kanban"  && <KanbanView  items={items} onSelect={setSelected} />}
        {view === "gallery" && <GalleryView items={items} onSelect={setSelected} />}
      </div>

      {/* ── Entity Sheet ── */}
      {selected && <LeadSheet lead={selected} onClose={() => setSelected(null)} />}

      {/* ── Nova Consultoria Modal ── */}
      <NovaConsultoriaModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
