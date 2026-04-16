export interface Broker {
  id: string;
  tenant_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export type BrokerInput = Pick<Broker, "name" | "phone" | "email" | "role" | "is_active">;

// Payload enviado do frontend para /api/corretores/create
// e repassado ao webhook n8n. NUNCA contém `id`.
export interface BrokerCreatePayload {
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  role: string | null;
  notes?: string | null;
}
