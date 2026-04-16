export interface Broker {
  id: string;
  tenant_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: string | null; // ex: "senior", "junior", "manager"
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export type BrokerInput = Pick<Broker, "full_name" | "phone" | "email" | "role" | "is_active">;
