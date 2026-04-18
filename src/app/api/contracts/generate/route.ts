import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── POST /api/contracts/generate ────────────────────────────────────────────
// Enfileira a geracao de contrato no job_queue para processamento via n8n.
// Nunca chama o n8n diretamente — segue o Action Flow padrao YZIHUB.

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Verificar autenticacao
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    // 2. Buscar tenant_id do usuario
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
    const body = await req.json() as {
      lead_id?: string | null;
      property_id?: string | null;
      broker_id?: string | null;
      tenant_id?: string | null;
      modelo?: string;
      comprador?: string | null;
      vendedor?: string | null;
      imovel?: string | null;
      corretor?: string | null;
      valor?: string | null;
      forma_pagamento?: string | null;
      comissao?: string | null;
      observacoes?: string | null;
      canais?: { whatsapp: boolean; email: boolean };
    };

    // 4. Validar campos obrigatorios
    if (!body.modelo || body.modelo.trim() === "") {
      return NextResponse.json({ error: "Campo 'modelo' e obrigatorio" }, { status: 400 });
    }
    if (!body.lead_id) {
      return NextResponse.json({ error: "Lead e obrigatorio" }, { status: 400 });
    }
    if (!body.property_id) {
      return NextResponse.json({ error: "Imovel e obrigatorio" }, { status: 400 });
    }
    if (!body.broker_id) {
      return NextResponse.json({ error: "Corretor e obrigatorio" }, { status: 400 });
    }
    if (!body.valor || body.valor.trim() === "" || parseFloat(body.valor) <= 0) {
      return NextResponse.json({ error: "Valor e obrigatorio" }, { status: 400 });
    }

    const valor = body.valor ? parseFloat(body.valor) : 0;
    const commissionPercentage = 5;
    const commissionAmount = parseFloat((valor * commissionPercentage / 100).toFixed(2));

    // 5. Criar registro em contracts com IDs reais
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .insert({
        tenant_id:             tenantId,
        lead_id:               body.lead_id    ?? null,
        project_id:            body.property_id ?? null,
        broker_id:             body.broker_id  ?? null,
        lead_name:             body.comprador  ?? null,
        project_name:          body.imovel     ?? null,
        corretor_name:         body.corretor   ?? null,
        title:                 body.modelo     ? `${body.modelo} — ${body.comprador ?? "sem comprador"}` : null,
        type:                  body.modelo     ?? "venda",
        status:                "rascunho",
        value:                 valor,
        commission_percentage: commissionPercentage,
        commission_amount:     commissionAmount,
        notes:                 body.observacoes ?? null,
      })
      .select("id")
      .single();

    if (contractError) {
      console.error("[POST /api/contracts/generate] contract insert error:", contractError);
      return NextResponse.json(
        { error: "Erro ao registrar contrato" },
        { status: 500 },
      );
    }

    // 6. Inserir em job_queue com contract_id
    const { error: insertError } = await supabase.from("job_queue").insert({
      tenant_id: tenantId,
      action: "gerar_contrato",
      status: "pending",
      payload: {
        contract_id:     contract.id,
        lead_id:         body.lead_id      ?? null,
        property_id:     body.property_id  ?? null,
        broker_id:       body.broker_id    ?? null,
        modelo:          body.modelo.trim(),
        comprador:       body.comprador    ?? null,
        vendedor:        body.vendedor     ?? null,
        imovel:          body.imovel       ?? null,
        corretor:        body.corretor     ?? null,
        valor,
        forma_pagamento: body.forma_pagamento ?? null,
        comissao:        body.comissao ? parseFloat(body.comissao) : null,
        observacoes:     body.observacoes  ?? null,
        canais:          body.canais       ?? { whatsapp: false, email: false },
      },
    });

    if (insertError) {
      console.error("[POST /api/contracts/generate] job_queue insert error:", insertError);
      return NextResponse.json(
        { error: "Erro ao enfileirar geracao de contrato" },
        { status: 500 },
      );
    }

    // 6. Retornar sucesso
    return NextResponse.json(
      { success: true, message: "Contrato em geracao" },
      { status: 200 },
    );
  } catch (err) {
    console.error("[POST /api/contracts/generate] unexpected error:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
