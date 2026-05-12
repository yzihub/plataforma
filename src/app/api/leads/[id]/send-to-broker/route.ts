import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordTimelineEvent } from "@/lib/timeline/events";

const N8N_WEBHOOK_URL = "https://api.yzihub.com/webhook/lead-quente";
const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

type JsonRecord = Record<string, unknown>;
type AdminClient = ReturnType<typeof createAdminClient>;

type RecentMessage = {
  id: string;
  conversation_id: string;
  content: string | null;
  direction: string | null;
  sender_type: string | null;
  created_at: string | null;
};

type ImovelReferencia = {
  id: string;
  id_imovel: string | null;
  external_id: string | null;
  titulo_comercial: string | null;
  tipo_de_imovel: string | null;
  finalidade: string | null;
  bairro: string | null;
  valor: number | null;
  referencia_unica: string | null;
  link_do_imovel: string | null;
  link_sanitizado: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = asText(value);
    if (text) return text;
  }
  return "";
}

function buildRecentMessagesSummary(messages: RecentMessage[]): string {
  if (messages.length === 0) return "";
  return messages
    .map((message) => {
      const sender = message.sender_type || message.direction || "mensagem";
      return `${sender}: ${message.content ?? ""}`.trim();
    })
    .join(" | ");
}

function formatCurrencyBRL(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

function buildImovelReferenciaLabel(imovel: ImovelReferencia | null): string | null {
  if (!imovel) return null;
  const title = imovel.titulo_comercial || imovel.tipo_de_imovel || "Imovel";
  const parts = [
    title,
    imovel.bairro ? `bairro ${imovel.bairro}` : "",
    formatCurrencyBRL(imovel.valor),
    imovel.referencia_unica || imovel.external_id || imovel.id_imovel
      ? `ref ${imovel.referencia_unica || imovel.external_id || imovel.id_imovel}`
      : "",
  ].filter(Boolean);
  return parts.join(" - ");
}

function buildLeadContext(lead: JsonRecord, dealMetadata: JsonRecord, messages: RecentMessage[]) {
  const metadata = asRecord(lead.metadata);
  const qualificacao = asRecord(metadata.qualificacao);
  const interessePrincipal = firstText(metadata.interesse_principal, qualificacao.interesse_principal);
  const finalidade = firstText(metadata.finalidade, qualificacao.finalidade);
  const objetivo = firstText(metadata.objetivo, qualificacao.objetivo);
  const bairroInteresse = firstText(metadata.bairro_interesse, qualificacao.bairro);
  const regiaoInteresse = firstText(metadata.regiao_interesse, qualificacao.regiao);
  const faixaValor = firstText(metadata.faixa_valor, qualificacao.faixa_valor);
  const imovelRef = firstText(metadata.imovel_ref, qualificacao.imovel_ref);
  const destino = firstText(finalidade, objetivo) || "objetivo nao informado";
  const regiao = firstText(bairroInteresse, regiaoInteresse) || "regiao nao informada";
  const faixa = faixaValor || "faixa nao informada";
  const notes = asText(lead.notes) || "sem observacoes";

  const resumo_ju =
    `Lead interessado em ${interessePrincipal || "imovel"} para ${destino}, ` +
    `regiao ${regiao}, faixa ${faixa}. Status ${lead.status ?? "sem status"}, ` +
    `score ${lead.score ?? 0}. Observacoes: ${notes}. ` +
    `Imovel referencia: ${imovelRef || "nao informado"}.`;

  return {
    resumo_ju,
    contexto_lead: {
      name: lead.name ?? null,
      phone: lead.phone ?? null,
      source: lead.source ?? null,
      score: lead.score ?? null,
      status: lead.status ?? null,
      notes: lead.notes ?? null,
      metadata,
      qualificacao,
      bairro_interesse: bairroInteresse || null,
      regiao_interesse: regiaoInteresse || null,
      interesse_principal: interessePrincipal || null,
      faixa_valor: faixaValor || null,
      objetivo: objetivo || null,
      finalidade: finalidade || null,
      imovel_ref: imovelRef || null,
      deal_metadata: dealMetadata,
      recent_messages_summary: buildRecentMessagesSummary(messages),
    },
  };
}

async function fetchImovelReferencia(admin: AdminClient, tenantId: string, imovelRef: string): Promise<ImovelReferencia | null> {
  if (!UUID_RE.test(imovelRef)) return null;

  const { data, error } = await admin
    .from("imoveis")
    .select("id, id_imovel, external_id, titulo_comercial, tipo_de_imovel, finalidade, bairro, valor, referencia_unica, link_do_imovel, link_sanitizado")
    .eq("id", imovelRef)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error || !data) return null;
  return data as ImovelReferencia;
}

async function fetchRecentMessages(admin: AdminClient, tenantId: string, leadId: string): Promise<RecentMessage[]> {
  const { data: conversation, error: conversationError } = await admin
    .from("conversations")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("lead_id", leadId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (conversationError || !conversation?.id) return [];

  const { data: messages, error: messagesError } = await admin
    .from("conversation_messages")
    .select("id, conversation_id, content, direction, sender_type, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (messagesError) return [];
  return ((messages ?? []) as RecentMessage[]).reverse();
}

async function resolveTenant(): Promise<string | null> {
  const isDevBypass =
    process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
    process.env.NODE_ENV !== "production";

  if (isDevBypass) return DEV_JUREMA_TENANT_ID;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.tenant_id) return null;
  return profile.tenant_id as string;
}

// ─── POST /api/leads/[id]/send-to-broker ─────────────────────────────────────
// 1. PATCH leads SET corretor_id = corretor_id
// 2. Fetch deal_id from jurema_deals (optional)
// 3. POST webhook n8n { tenant_id, lead_id, deal_id, corretor_id }

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;

    const tenantId = await resolveTenant();
    if (!tenantId) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();

    let body: { corretor_id?: string };
    try {
      body = await req.json() as { corretor_id?: string };
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const corretor_id = body.corretor_id?.trim();
    if (!corretor_id) {
      return NextResponse.json({ error: "corretor_id obrigatório" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify lead belongs to tenant
    const { data: existing, error: checkError } = await admin
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .eq("tenant_id", tenantId)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: "Lead nao encontrado ou sem permissao" }, { status: 403 });
    }

    // 1. Assign corretor
    const { data: updatedLead, error: updateError } = await admin
      .from("leads")
      .update({
        assigned_to: corretor_id,
        corretor_id,
        last_action_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (updateError) {
      console.error("[POST /api/leads/:id/send-to-broker] update error:", updateError);
      return NextResponse.json({ error: "Erro ao atualizar lead" }, { status: 500 });
    }

    try {
      await recordTimelineEvent(admin, {
        tenant_id: tenantId,
        lead_id: leadId,
        corretor_id,
        event_type: "lead_assigned",
        metadata: {
          source: "api/leads/[id]/send-to-broker",
          deal_id: null,
        },
        created_by: user?.id ?? null,
      });
    } catch (timelineError) {
      console.error("[POST /api/leads/:id/send-to-broker] timeline error:", timelineError);
    }

    // 2. Fetch deal_id from jurema_deals (best-effort)
    const { data: deal } = await admin
      .from("jurema_deals")
      .select("id, metadata")
      .eq("lead_id", leadId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const dealId = deal?.id ?? null;
    const ultimas_mensagens = await fetchRecentMessages(admin, tenantId, leadId);
    const { resumo_ju, contexto_lead } = buildLeadContext(
      updatedLead as JsonRecord,
      asRecord(deal?.metadata),
      ultimas_mensagens
    );
    const imovel_ref = asText(contexto_lead.imovel_ref);
    const imovel_referencia = imovel_ref
      ? await fetchImovelReferencia(admin, tenantId, imovel_ref)
      : null;
    const imovel_referencia_label = buildImovelReferenciaLabel(imovel_referencia);
    const n8nPayload = {
      tenant_id: tenantId,
      lead_id: leadId,
      deal_id: dealId,
      corretor_id,
      resumo_ju,
      contexto_lead,
      ultimas_mensagens,
      imovel_ref: imovel_ref || null,
      imovel_referencia_label,
      imovel_referencia,
    };

    // 3. Fire n8n webhook (log error but don't fail — lead already assigned).
    // Payload OBJETO (não array). O n8n espera { tenant_id, lead_id, deal_id, corretor_id }.
    try {
      if (process.env.NODE_ENV !== "production") {
        console.log("[POST /api/leads/:id/send-to-broker] n8n payload:", n8nPayload);
      }
      const webhookRes = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(n8nPayload),
      });
      if (!webhookRes.ok) {
        const text = await webhookRes.text().catch(() => "");
        console.error("[POST /api/leads/:id/send-to-broker] webhook não-ok:", webhookRes.status, text);
      }
    } catch (webhookErr) {
      console.error("[POST /api/leads/:id/send-to-broker] webhook error:", webhookErr);
    }

    return NextResponse.json(updatedLead, { status: 200 });
  } catch (err) {
    console.error("[POST /api/leads/:id/send-to-broker] unexpected:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
