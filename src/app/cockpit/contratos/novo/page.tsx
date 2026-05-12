"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ContratoEditor from "@/components/yzihub/Contratos/ContratoEditor";

// ─── Inner component that reads searchParams (must be inside Suspense) ─────────

function NovoContratoPageInner() {
  const params = useSearchParams();
  return (
    <ContratoEditor
      contractId={params.get("contract_id")}
      leadId={params.get("lead_id")}
      propertyId={params.get("property_id")}
      brokerId={params.get("broker_id")}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NovoContratoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
            Carregando editor...
          </div>
        </div>
      }
    >
      <NovoContratoPageInner />
    </Suspense>
  );
}
