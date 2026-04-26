/**
 * Types derived from the Café com Pam Airtable CSV structure.
 * Columns: Clientes-Grid view.csv
 */

// ─── Lead Status (Café com Pam workflow) ──────────────────────────────────────

export type PamLeadStatus =
  | 'Novo Lead'
  | 'Agendado'
  | 'Em Atendimento'
  | 'Pagamento Confirmado'
  | 'Concluído'
  | 'Cancelado'

export type PamPaymentStatus = 'PAGO' | 'PENDENTE' | 'CANCELADO' | ''

export type PamPaymentMethod =
  | 'Cartão de Crédito'
  | 'Cartão de Débito'
  | 'Pix'
  | 'Boleto'
  | 'Transferência'
  | ''

// ─── Badge color map ──────────────────────────────────────────────────────────

export type BadgeVariant =
  | 'info'
  | 'warning'
  | 'primary'
  | 'success'
  | 'error'
  | 'light'
  | 'dark'

export interface LeadStatusConfig {
  color: BadgeVariant
  label: string
}

/**
 * Visual config for each lead status.
 * Mapped to the pipeline stages defined in mock-data / Supabase.
 *
 * LeadStatus (generic) → PamLeadStatus mapping:
 *   new       → Novo Lead
 *   contacted → Agendado
 *   meeting   → Em Atendimento
 *   proposal  → Pagamento Confirmado
 *   won       → Concluído
 *   lost      → Cancelado
 */
export const PAM_LEAD_STATUS_CONFIG: Record<PamLeadStatus, LeadStatusConfig> = {
  'Novo Lead':            { color: 'info',    label: '🔥 Novo Lead' },
  'Agendado':             { color: 'warning', label: '📅 Agendado' },
  'Em Atendimento':       { color: 'primary', label: '💬 Em Atendimento' },
  'Pagamento Confirmado': { color: 'success', label: '💳 Pagamento Confirmado' },
  'Concluído':            { color: 'dark',    label: '✅ Concluído' },
  'Cancelado':            { color: 'error',   label: '❌ Cancelado' },
}

export const PAM_PAYMENT_STATUS_CONFIG: Record<PamPaymentStatus, LeadStatusConfig> = {
  'PAGO':      { color: 'success', label: '✅ Pago' },
  'PENDENTE':  { color: 'warning', label: '⏳ Pendente' },
  'CANCELADO': { color: 'error',   label: '❌ Cancelado' },
  '':          { color: 'light',   label: '—' },
}

// ─── Pam Lead (direct CSV representation) ────────────────────────────────────

export interface PamLead {
  /** Nome do Cliente */
  nome_cliente: string
  /** Foto do Cliente (URL from Airtable CDN) */
  foto_cliente: string | null
  /** Telefone (E.164 or local format) */
  telefone: string
  /** Status do Lead */
  status_lead: PamLeadStatus
  /** Email */
  email: string | null
  /** CPF */
  cpf: string | null
  /** Data de entrada (dd/MM/yyyy HH:mma) */
  data: string
  /** Cidade */
  cidade: string | null
  /** Como chegou até o Café com PAM? */
  como_chegou: string | null
  /** Qual o(s) ambientes deseja transformar? */
  ambientes: string | null
  /** metragem_ambientes */
  metragem_ambientes: string | null
  /** Descreva o que você gostaria de melhorar no seu espaço */
  descricao_melhoria: string | null
  /** Como você imagina as cores desse ambiente? */
  cores_imaginadas: string | null
  /** Que sensação você gostaria de sentir nesse espaço? */
  sensacao_desejada: string | null
  /** Palavras Chave */
  palavras_chave: string | null
  /** O que você gostaria de manter nesse ambiente? */
  o_que_manter: string | null
  /** Arquivos (attachment URLs) */
  arquivos: string | null
  /** Data do Agendamento */
  data_agendamento: string | null
  /** Forma de Pagamento */
  forma_pagamento: PamPaymentMethod
  /** Status de Pagamento */
  status_pagamento: PamPaymentStatus
  /** Valor Total (e.g. "R$970,00") */
  valor_total: string | null
  /** Google Meet link */
  meet_link: string | null
  /** Link de Pagamento (Asaas) */
  link_pagamento: string | null
  /** ID do agendamento externo */
  id_agendamento: string | null
  /** ID do customer (Asaas) */
  id_customer: string | null
}

// ─── Helper: parse "R$970,00" → number ───────────────────────────────────────

export function parsePamValue(raw: string | null): number {
  if (!raw) return 0
  const clean = raw.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : n
}
