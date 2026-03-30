// Fluxo YZIHUB: lead chega qualificado pela IA — pipeline é para o time humano fechar
export type LeadStatus =
  | 'new'        // 🔥 Novo Lead
  | 'contacted'  // 📞 Contato
  | 'meeting'    // 📅 Reunião
  | 'proposal'   // 💰 Proposta
  | 'won'        // ✅ Fechado
  | 'lost'       // ❌ Perdido

export type CrmAction =
  | 'contact'        // Entrar em contato
  | 'schedule'       // Marcar reunião
  | 'send_proposal'  // Gerar proposta
  | 'close'          // Fechar
  | 'lose'           // Mover para perdido

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
