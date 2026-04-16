import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { BrokerCreatePayload } from "@/types/brokers";

// ─── POST /api/corretores/create ──────────────────────────────────────────────
// Valida payload, cross-checa tenant_id e delega a criação ao webhook n8n.
// Regra de Ouro YZIHUB: frontend nunca escreve em fontes de automação — sempre
// via API route que invoca n8n.

const WEBHOOK_URL = "https://api.yzihub.com/webhook/corretores";

export async function POST(request: Request) {
  try {
    // ── Autenticação ──────────────────────────────────────────────────────────
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      return NextResponse.json({ error: "Perfil nao encontrado" }, { status: 401 });
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido no corpo da requisição" }, { status: 400 });
    }

    // ── Validação: name ───────────────────────────────────────────────────────
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2) {
      return NextResponse.json(
        { error: "Nome inválido (mínimo 2 caracteres)" },
        { status: 400 }
      );
    }

    // ── Validação: tenant_id (cross-tenant write guard) ───────────────────────
    // tenant_id validado contra profiles para prevenir cross-tenant write
    const requestedTenantId =
      typeof body.tenant_id === "string" ? body.tenant_id : profile.tenant_id;

    if (requestedTenantId !== profile.tenant_id) {
      return NextResponse.json({ error: "tenant_id inválido" }, { status: 403 });
    }

    // ── Normalização ──────────────────────────────────────────────────────────
    // phone normalizado: apenas dígitos (padrão YZIHUB validado em quick-260416-ln6)
    const rawPhone = typeof body.phone === "string" ? body.phone : null;
    const phone = rawPhone ? rawPhone.replace(/\D/g, "") || null : null;

    const email =
      typeof body.email === "string" && body.email.trim() ? body.email.trim() : null;
    const role =
      typeof body.role === "string" && body.role.trim() ? body.role.trim() : null;
    const notes =
      typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;

    const isActive = typeof body.is_active === "boolean" ? body.is_active : true;

    // ── Montar payload para o webhook ─────────────────────────────────────────
    // NÃO enviar campo id no payload — n8n gera/resolve
    const webhookPayload: BrokerCreatePayload = {
      tenant_id: profile.tenant_id,
      name,
      email,
      phone,
      is_active: isActive,
      role,
      notes,
    };

    // ── Chamar webhook n8n ────────────────────────────────────────────────────
    let webhookResponse: Response;
    try {
      webhookResponse = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      });
    } catch (fetchErr) {
      console.error("[POST /api/corretores/create] webhook fetch error:", fetchErr);
      return NextResponse.json(
        { error: "Falha ao conectar ao serviço de criação de corretor" },
        { status: 502 }
      );
    }

    if (!webhookResponse.ok) {
      const status = webhookResponse.status;
      console.error(
        `[POST /api/corretores/create] webhook returned non-ok status: ${status}`
      );
      return NextResponse.json(
        { error: "Falha ao criar corretor no n8n", status },
        { status: 502 }
      );
    }

    // ── Parsear resposta do webhook (tolerar corpo vazio) ─────────────────────
    let webhookData: unknown = null;
    try {
      const text = await webhookResponse.text();
      if (text) {
        webhookData = JSON.parse(text);
      }
    } catch {
      // Resposta vazia ou não-JSON — ignorar silenciosamente
    }

    return NextResponse.json({ ok: true, data: webhookData }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/corretores/create] unexpected error:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
