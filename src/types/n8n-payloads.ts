// ─── N8n Payload Types ────────────────────────────────────────────────────────
// Contrato de API para consumo pelo n8n. Envelope genérico + tipos por entidade.
// Campos sensíveis/verbosos excluídos: notes, metadata, file_url, file_name, features, images.

// ─── Envelope genérico ────────────────────────────────────────────────────────

export interface N8nEnvelope<T> {
  entity: string;     // "leads" | "imoveis" | "contracts"
  tenant_id: string;
  count: number;
  fetched_at: string; // ISO 8601
  data: T[];
}

// ─── Tipos por entidade ───────────────────────────────────────────────────────

export interface N8nLead {
  id: string;
  tenant_id: string;
  stage_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  status: string;
  score: number;
  value: number;
  assigned_to: string | null;
  last_action_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface N8nProperty {
  id: string;
  tenant_id: string;
  title: string;
  price: number;
  location: string;
  area_sqm: number | null;
  status: string;
  link: string | null;
  created_at: string;
  updated_at: string;
}

export interface N8nContract {
  id: string;
  tenant_id: string;
  lead_id: string | null;
  lead_name: string;
  project_name: string | null;
  corretor_name: string | null;
  title: string | null;
  type: string;
  status: string;
  value: number;
  signed_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Helper de construção ─────────────────────────────────────────────────────

export function buildN8nEnvelope<T>(
  entity: string,
  tenantId: string,
  data: T[]
): N8nEnvelope<T> {
  return {
    entity,
    tenant_id: tenantId,
    count: data.length,
    fetched_at: new Date().toISOString(),
    data,
  };
}

// ─── Mappers — extraem apenas campos da interface, ignorando extras do Supabase ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toN8nLead(row: any): N8nLead {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    stage_id: row.stage_id ?? null,
    name: row.name,
    email: row.email ?? null,
    phone: row.phone ?? null,
    company: row.company ?? null,
    source: row.source ?? null,
    status: row.status,
    score: row.score ?? 0,
    value: row.value ?? 0,
    assigned_to: row.assigned_to ?? null,
    last_action_at: row.last_action_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toN8nProperty(row: any): N8nProperty {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    title: row.title,
    price: row.price ?? 0,
    location: row.location,
    area_sqm: row.area_sqm ?? null,
    status: row.status,
    link: row.link ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toN8nContract(row: any): N8nContract {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    lead_id: row.lead_id ?? null,
    lead_name: row.lead_name,
    project_name: row.project_name ?? null,
    corretor_name: row.corretor_name ?? null,
    title: row.title ?? null,
    type: row.type,
    status: row.status,
    value: row.value ?? 0,
    signed_at: row.signed_at ?? null,
    expires_at: row.expires_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
