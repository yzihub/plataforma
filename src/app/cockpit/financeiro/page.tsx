import { createClient } from "@/lib/supabase/server";
import type { FinanceRecord } from "@/types/finance";
import FinanceiroClient from "@/components/yzihub/FinanceiroClient";

// ─── Mock data (dev / fallback) ───────────────────────────────────────────────

const MOCK_FINANCE: FinanceRecord[] = [
  {
    id: "11111111-0000-0000-0000-000000000001",
    tenant_id: "mock-tenant",
    final_amount: 125000,
    financial_alert: true,
    priority_flag: true,
    description: "Contrato pendente — revisao urgente",
    status: "pendente",
    created_at: "2026-04-01T10:00:00Z",
  },
  {
    id: "22222222-0000-0000-0000-000000000002",
    tenant_id: "mock-tenant",
    final_amount: 15000,
    financial_alert: false,
    priority_flag: true,
    description: "Pagamento parcial recebido",
    status: "em_andamento",
    created_at: "2026-03-28T14:30:00Z",
  },
  {
    id: "33333333-0000-0000-0000-000000000003",
    tenant_id: "mock-tenant",
    final_amount: 4500.5,
    financial_alert: false,
    priority_flag: false,
    description: "Servico concluido",
    status: "concluido",
    created_at: "2026-03-20T09:15:00Z",
  },
  {
    id: "44444444-0000-0000-0000-000000000004",
    tenant_id: "mock-tenant",
    final_amount: 88750,
    financial_alert: true,
    priority_flag: false,
    description: "Fatura em atraso",
    status: "atrasado",
    created_at: "2026-03-10T16:45:00Z",
  },
];

// ─── Fetch finance records for authenticated tenant ───────────────────────────

async function fetchFinanceRecords(): Promise<FinanceRecord[]> {
  try {
    const supabase = await createClient();

    // Authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return MOCK_FINANCE;

    // Tenant from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) return MOCK_FINANCE;

    // Finance records filtered by tenant
    const { data, error } = await supabase
      .from("finance")
      .select("id, tenant_id, final_amount, financial_alert, priority_flag, description, status, created_at")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false });

    if (error || !data) return MOCK_FINANCE;

    return data as FinanceRecord[];
  } catch {
    // Supabase not configured — use mock for local dev
    return MOCK_FINANCE;
  }
}

// ─── Page (Server Component) ──────────────────────────────────────────────────

export default async function FinanceiroPage() {
  const records = await fetchFinanceRecords();
  return <FinanceiroClient initialRecords={records} />;
}
