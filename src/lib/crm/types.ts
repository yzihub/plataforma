// Fluxo YZIHUB: lead chega qualificado pela IA — pipeline é para o time humano fechar
export type LeadStatus =
  | 'new'         // 🔥 Novo Lead
  | 'contacted'   // 📞 Contato
  | 'qualified'   // 📅 Agendado
  | 'meeting'     // 📅 Reunião
  | 'proposal'    // 💰 Proposta
  | 'negotiation' // 📋 Contrato / Negociação
  | 'won'         // ✅ Fechado
  | 'lost'        // ❌ Perdido

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
  corretor_id: string | null
  last_action_at: string | null // ISO timestamp
  created_at: string
  metadata?: Record<string, unknown>
  // Campos específicos imobiliário (Jurema) — opcionais para compatibilidade com outros tenants
  janela_visita?: string | null        // ex: "Sábado manhã"
  regiao_interesse?: string | null     // ex: "Barra da Tijuca"
  bairro_interesse?: string | null     // bairro específico (select)
  objetivo?: 'investimento' | 'moradia' | string | null
  interesse_principal?: 'apartamento' | 'casa' | 'terreno' | 'cobertura' | string | null
  finalidade?: 'compra' | 'aluguel' | string | null
  faixa_valor?: string | null          // ex: "R$ 700k – R$ 1.000k"
  imovel_ref?: string | null           // referência do imóvel (id_imovel)
  status_agendamento?: string | null   // ex: "confirmado", "pendente"
  data_agendamento?: string | null     // ISO timestamp
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
  operationalKanban?: import("./operational-funnel").OperationalKanbanBoard
}
