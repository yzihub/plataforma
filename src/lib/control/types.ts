export type TenantPlan = 'starter' | 'growth' | 'enterprise'
export type TenantStatus = 'active' | 'inactive' | 'suspended'
export type ProjectType = 'crm' | 'sdr' | 'radar' | 'social' | 'ia_onboarding'
export type ProjectStatus = 'pending' | 'provisioning' | 'active' | 'error' | 'paused'
export type JobStatus = 'pending' | 'processing' | 'done' | 'failed'
export type LogChannel = 'web' | 'whatsapp' | 'n8n' | 'system'

export interface ControlProject {
  id: string
  tenant_id: string
  name: string
  type: ProjectType
  status: ProjectStatus
  agent_name: string | null
  agent_phone: string | null
}

export interface ControlTenant {
  id: string
  name: string
  slug: string
  plan: TenantPlan
  status: TenantStatus
  system_prompt: string | null
  knowledge_rag_xml: string | null
  projects: ControlProject[]
  stats: {
    total_leads: number
    active_leads: number   // status != won && != lost
    won_leads: number
    pipeline_value: number // soma de leads.value
    conversion_rate: number // won/total * 100
  }
  created_at: string
}

export interface Job {
  id: string
  tenant_id: string
  tenant_name: string   // join para display
  lead_id: string | null
  lead_name: string | null  // join para display
  action: string
  status: JobStatus
  attempts: number
  error: string | null
  scheduled_at: string
  started_at: string | null
  finished_at: string | null
  created_at: string
}

export interface ActionLog {
  id: string
  tenant_id: string
  tenant_name: string   // join para display
  lead_id: string | null
  lead_name: string | null
  job_id: string | null
  action: string
  channel: LogChannel
  summary: string | null
  created_at: string
}

export interface ControlDashboardData {
  tenants: ControlTenant[]
  recent_jobs: Job[]
  recent_logs: ActionLog[]
  global_stats: {
    total_tenants: number
    active_tenants: number
    total_leads: number
    total_jobs_today: number
    jobs_pending: number
    jobs_failed: number
  }
}
