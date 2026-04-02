import { Suspense } from "react";
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
    description: "Comissao Apt 302 Meireles",
    status: "pendente",
    created_at: "2026-04-01T10:00:00Z",
  },
  {
    id: "22222222-0000-0000-0000-000000000002",
    tenant_id: "mock-tenant",
    final_amount: 47500,
    financial_alert: false,
    priority_flag: true,
    description: "Comissao Casa Eusebio Lote 14",
    status: "em_andamento",
    created_at: "2026-03-28T14:30:00Z",
  },
  {
    id: "33333333-0000-0000-0000-000000000003",
    tenant_id: "mock-tenant",
    final_amount: 18200,
    financial_alert: false,
    priority_flag: false,
    description: "Comissao Apto Aldeota 87m2",
    status: "concluido",
    created_at: "2026-03-20T09:15:00Z",
  },
  {
    id: "44444444-0000-0000-0000-000000000004",
    tenant_id: "mock-tenant",
    final_amount: 88750,
    financial_alert: true,
    priority_flag: false,
    description: "Comissao Cobertura Cocó Bloco A",
    status: "atrasado",
    created_at: "2026-03-10T16:45:00Z",
  },
  {
    id: "55555555-0000-0000-0000-000000000005",
    tenant_id: "mock-tenant",
    final_amount: 3500,
    financial_alert: false,
    priority_flag: false,
    description: "Comissao Sala Comercial Papicu",
    status: "concluido",
    created_at: "2026-03-18T11:00:00Z",
  },
  {
    id: "66666666-0000-0000-0000-000000000006",
    tenant_id: "mock-tenant",
    final_amount: 62000,
    financial_alert: true,
    priority_flag: true,
    description: "Comissao Casa Cond Alphaville Eusebio",
    status: "atrasado",
    created_at: "2026-03-05T09:00:00Z",
  },
  {
    id: "77777777-0000-0000-0000-000000000007",
    tenant_id: "mock-tenant",
    final_amount: 35000,
    financial_alert: false,
    priority_flag: false,
    description: "Comissao Apt 2Q Mucuripe",
    status: "em_andamento",
    created_at: "2026-03-25T15:00:00Z",
  },
  {
    id: "88888888-0000-0000-0000-000000000008",
    tenant_id: "mock-tenant",
    final_amount: 97500,
    financial_alert: false,
    priority_flag: true,
    description: "Comissao Penthouse Meireles Torre Norte",
    status: "concluido",
    created_at: "2026-03-12T08:30:00Z",
  },
  {
    id: "99999999-0000-0000-0000-000000000009",
    tenant_id: "mock-tenant",
    final_amount: 41000,
    financial_alert: true,
    priority_flag: false,
    description: "Comissao Lote 22 Cond Residencial Horizonte",
    status: "atrasado",
    created_at: "2026-02-28T10:00:00Z",
  },
  {
    id: "aaaaaaaa-0000-0000-0000-000000000010",
    tenant_id: "mock-tenant",
    final_amount: 28500,
    financial_alert: false,
    priority_flag: false,
    description: "Comissao Apto Studio Beira Mar",
    status: "pendente",
    created_at: "2026-04-02T07:00:00Z",
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
  return (
    <Suspense fallback={null}>
      <FinanceiroClient initialRecords={records} />
    </Suspense>
  );
}
