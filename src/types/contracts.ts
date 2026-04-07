import type { BadgeVariant } from '@/types/crm'

// ─── Status & Type enums ──────────────────────────────────────────────────────

export type ContractStatus = 'pendente' | 'assinado' | 'cancelado' | 'rascunho' | 'expirado'
export type ContractType = 'venda' | 'locacao' | 'servico' | 'parceria'

// ─── Contract entity ──────────────────────────────────────────────────────────

export interface Contract {
  id: string
  tenant_id: string
  lead_id: string
  lead_name: string
  lead_avatar?: string | null
  project_id?: string | null
  project_name?: string | null
  corretor_id?: string | null
  corretor_name?: string | null
  title?: string | null
  type: ContractType
  status: ContractStatus
  value: number
  notes?: string | null
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
  rascunho: { color: 'light',   label: 'Rascunho' },
  pendente: { color: 'warning', label: 'Pendente' },
  assinado: { color: 'success', label: 'Assinado' },
  cancelado: { color: 'error',  label: 'Cancelado' },
  expirado:  { color: 'dark',   label: 'Expirado' },
}

// ─── Type labels ──────────────────────────────────────────────────────────────

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  venda:    'Venda',
  locacao:  'Locacao',
  servico:  'Servico',
  parceria: 'Parceria',
}
