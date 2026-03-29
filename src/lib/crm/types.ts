export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost'

export type CrmAction =
  | 'qualify'
  | 'send_proposal'
  | 'schedule'
  | 'close'
  | 'ai_takeover'

export interface PipelineStage {
  id: string
  tenant_id: string
  name: string
  color: string // hex color
  position: number
  is_won: boolean
  is_lost: boolean
}

export interface Lead {
  id: string
  tenant_id: string
  stage_id: string | null
  name: string
  email: string | null
  phone: string | null
  company: string | null
  source: string | null
  status: LeadStatus
  score: number // 0-100
  value: number // R$ em reais
  notes: string | null
  assigned_to: string | null
  last_action_at: string | null // ISO timestamp
  created_at: string
}

export interface Tenant {
  id: string
  name: string
  slug: string
}

// Tipo composto para o Kanban
export interface KanbanData {
  tenant: Tenant
  stages: PipelineStage[]
  leads: Lead[]
}
