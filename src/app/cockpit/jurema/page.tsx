import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import JuremaKanbanClient from "@/components/yzihub/JuremaKanbanClient";
import type { JuremaDeal } from "@/components/yzihub/JuremaKanbanClient";

export const dynamic = "force-dynamic";

async function fetchDeals(): Promise<JuremaDeal[]> {
  try {
    // Auth guard — skip in dev bypass mode (matches proxy.ts behaviour)
    const isDevBypass =
      process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
      process.env.NODE_ENV !== "production";

    if (!isDevBypass) {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) return [];
    }

    const tenantId = process.env.NEXT_PUBLIC_JUREMA_TENANT_ID;
    if (!tenantId) {
      console.error("[jurema/page] NEXT_PUBLIC_JUREMA_TENANT_ID not set");
      return [];
    }

    // Admin client bypasses RLS — safe because this code only runs server-side
    const admin = createAdminClient();
    const { data: deals, error: dealsError } = await admin
      .from("jurema_deals")
      .select(
        "id, tenant_id, lead_id, deal_stage, qualification_status, client_name, client_phone, intent, property_type, location_preference, budget_max, bedrooms, lead_score, broker_status, created_at, updated_at"
      )
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false });

    if (dealsError) {
      console.error("[jurema/page] query error:", dealsError);
      return [];
    }

    return (deals ?? []) as JuremaDeal[];
  } catch (err) {
    console.error("[jurema/page] unexpected error:", err);
    return [];
  }
}

export default async function JuremaPage() {
  const deals = await fetchDeals();
  return (
    <Suspense fallback={null}>
      <JuremaKanbanClient initialDeals={deals} />
    </Suspense>
  );
}
