export interface Broker {
  id: string;
  tenant_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: string | null;
  tipo: string | null;
  cpf: string | null;
  is_active: boolean;
  // Endereço
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  // Financeiro / PIX
  bank: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  bank_account_type: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  pix_beneficiary: string | null;
  // Geral
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface BrokerInput {
  name: string;
  phone: string | null;
  email: string | null;
  role: string | null;
  tipo: string | null;
  cpf: string | null;
  is_active: boolean;
  // Endereço
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  // Financeiro / PIX
  bank: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  bank_account_type: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  pix_beneficiary: string | null;
  // Geral
  notes: string | null;
}

// Payload enviado do frontend para /api/corretores/create
// e repassado ao webhook n8n. NUNCA contém `id`.
export interface BrokerCreatePayload {
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  role: string | null;
  tipo: string | null;
  cpf: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  bank: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  bank_account_type: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  pix_beneficiary: string | null;
  notes: string | null;
}
