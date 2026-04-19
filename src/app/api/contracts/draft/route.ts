import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildN8nEnvelope, toN8nContract } from "@/types/n8n-payloads";

// ─── POST /api/contracts/draft ────────────────────────────────────────────────
// Salva rascunho de contrato em contracts com status='rascunho'.
// Não enfileira em job_queue — apenas persiste o corpo editado.
//
// Body esperado:
//   lead_id, property_id, broker_id (obrigatórios)
//   modelo, comprador, imovel, corretor, valor, comissao, body (texto editado)

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    // 2. Tenant
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      return NextResponse.json({ error: "Perfil nao encontrado" }, { status: 401 });
    }

    const tenantId = profile.tenant_id as string;

    // 3. Ler body
    const input = (await req.json()) as {
      lead_id?: string | null;
      property_id?: string | null;
      broker_id?: string | null;
      modelo?: string | null;
      comprador?: string | null;
      imovel?: string | null;
      corretor?: string | null;
      valor?: number | null;
      comissao?: number | null;
      body?: string | null;
    };

    // 4. Validações obrigatórias
    if (!input.lead_id) {
      return NextResponse.json({ error: "lead_id e obrigatorio" }, { status: 400 });
    }
    if (!input.property_id) {
      return NextResponse.json({ error: "property_id (imovel) e obrigatorio" }, { status: 400 });
    }
    if (!input.broker_id) {
      return NextResponse.json({ error: "broker_id e obrigatorio" }, { status: 400 });
    }
    if (!input.valor || input.valor <= 0) {
      return NextResponse.json({ error: "valor e obrigatorio e deve ser positivo" }, { status: 400 });
    }

    const valor = input.valor;
    const commissionPercentage = 5;
    const commissionAmount = parseFloat((valor * commissionPercentage / 100).toFixed(2));

    // 5. Insert em contracts com status='rascunho'
    // TODO: quando houver coluna dedicada 'content'/'body', mover texto do contrato para lá.
    // Por ora, armazenar em notes (coluna text já existente na tabela).
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .insert({
        tenant_id:             tenantId,
        lead_id:               input.lead_id,
        project_id:            input.property_id,
        broker_id:             input.broker_id,
        lead_name:             input.comprador  ?? null,
        project_name:          input.imovel     ?? null,
        corretor_name:         input.corretor   ?? null,
        title:                 input.modelo
          ? `${input.modelo} — ${input.comprador ?? "rascunho"}`
          : `Rascunho — ${input.comprador ?? "sem comprador"}`,
        type:                  input.modelo === "locacao"      ? "locacao"
                             : input.modelo === "exclusividade" ? "servico"
                             : "venda",
        status:                "rascunho",
        value:                 valor,
        commission_percentage: commissionPercentage,
        commission_amount:     commissionAmount,
        notes:                 input.body ?? null,
      })
      .select()
      .single();

    if (contractError) {
      console.error("[POST /api/contracts/draft] contract insert error:", contractError);
      return NextResponse.json({ error: "Erro ao salvar rascunho" }, { status: 500 });
    }

    const payload = buildN8nEnvelope("contracts", tenantId, [toN8nContract(contract)]);
    return NextResponse.json(payload, { status: 201 });
  } catch (err) {
    console.error("[POST /api/contracts/draft] unexpected error:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
