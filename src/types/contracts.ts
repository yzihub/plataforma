import type { BadgeVariant } from '@/types/crm'

// ─── Status & Type enums ──────────────────────────────────────────────────────

export type ContractStatus = 'draft' | 'sent' | 'signed' | 'cancelled' | 'rascunho' | 'enviado' | 'assinado' | 'cancelado'
export type ContractType = 'venda' | 'locacao' | 'servico' | 'parceria'

// ─── Contract entity ──────────────────────────────────────────────────────────

export interface Contract {
  id: string
  tenant_id: string
  lead_id: string
  lead_name: string
  lead_avatar?: string | null
  /** @deprecated use imovel_id — mantido por compatibilidade temporária */
  project_id?: string | null
  imovel_id?: string | null
  project_name?: string | null
  broker_id?: string | null
  corretor_name?: string | null
  title?: string | null
  type: ContractType
  status: ContractStatus
  value: number
  notes?: string | null
  conteudo?: string | null
  metadata?: Record<string, unknown> | null
  file_url?: string | null
  file_name?: string | null
  signed_at?: string | null
  expires_at?: string | null
  created_at: string
  updated_at: string
}

// ─── Status visual config ─────────────────────────────────────────────────────

export interface ContractStatusConfig {
  color: BadgeVariant
  label: string
}

export const CONTRACT_STATUS_CONFIG: Record<ContractStatus, ContractStatusConfig> = {
  draft:     { color: 'light',   label: 'Rascunho' },
  sent:      { color: 'warning', label: 'Enviado'  },
  signed:    { color: 'success', label: 'Assinado' },
  cancelled: { color: 'error',   label: 'Cancelado' },
  rascunho:  { color: 'light',   label: 'Rascunho' },
  enviado:   { color: 'warning', label: 'Enviado'  },
  assinado:  { color: 'success', label: 'Assinado' },
  cancelado: { color: 'error',   label: 'Cancelado' },
}

// ─── Type labels ──────────────────────────────────────────────────────────────

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  venda:    'Venda',
  locacao:  'Locacao',
  servico:  'Servico',
  parceria: 'Parceria',
}
