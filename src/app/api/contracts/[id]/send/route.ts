import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getJuremaContractTemplate } from "@/lib/jurema/contract-templates";
import {
  contractPropertyId,
  syncPropertyStatusForContract,
} from "@/lib/contracts/property-status";
import { recordTimelineEvent } from "@/lib/timeline/events";

const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";
const N8N_SEND_CONTRACT_WEBHOOK = "https://api.yzihub.com/webhook/enviar-contrato";
const isDev = process.env.NODE_ENV !== "production";
const OFFICIAL_CONTRACT_PLACEHOLDER_FIELDS = [
  "vendedor_qualificacao",
  "comprador_qualificacao",
  "vendedor_nome",
  "comprador_nome",
  "imovel_descricao_juridica",
  "imovel_caracteristicas",
  "imovel_matricula",
  "imovel_cartorio",
  "bens_inclusos",
  "observacoes_especificas",
  "valor_total",
  "valor_total_extenso",
  "forma_pagamento",
  "meio_pagamento",
  "dados_bancarios_vendedor",
  "condicao_entrega_chaves",
  "comissao_descricao",
  "multa_rescisoria",
  "cidade",
  "foro",
  "data_contrato",
  "testemunha_1_nome",
  "testemunha_2_nome",
] as const;

async function getAuthContext() {
  const isDevBypass =
    process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
    process.env.NODE_ENV !== "production";

  const supabase = isDevBypass ? createAdminClient() : await createClient();

  if (isDevBypass) {
    return { supabase, tenantId: DEV_JUREMA_TENANT_ID, userId: null, error: null, status: 200 };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, tenantId: null, userId: null, error: "Nao autenticado", status: 401 };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.tenant_id) {
    return { supabase, tenantId: null, userId: null, error: "Perfil nao encontrado", status: 401 };
  }

  return { supabase, tenantId: profile.tenant_id as string, userId: user.id, error: null, status: 200 };
}

function devDetail(message: string) {
  return isDev ? { detail: message } : {};
}

function textOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isMissingMetadataColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  return e.code === "42703" && /metadata/i.test(e.message ?? "");
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

function formatBRL(value: unknown) {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", "."))
        : 0;

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(numberValue) ? numberValue : 0);
}

function formatDateBR(value: unknown) {
  const text = firstText(value);
  if (!text) return "";

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;

  return date.toLocaleDateString("pt-BR");
}

function officialTemplateFileId(value: string | null | undefined) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{20,}$/.test(value) && !value.startsWith("ID_")
    ? value
    : null;
}

function buildQualification(
  fallbackName: unknown,
  metadata: Record<string, unknown>,
  directKeys: string[],
) {
  const direct = firstText(...directKeys.map((key) => metadata[key]));
  if (direct) return direct;

  const name = firstText(fallbackName);
  const cpf = firstText(metadata.cpf, metadata.documento, metadata.document);
  const rg = firstText(metadata.rg);
  const estadoCivil = firstText(metadata.estado_civil);
  const profissao = firstText(metadata.profissao);
  const endereco = firstText(metadata.endereco, metadata.endereco_completo);
  const parts = [
    name,
    cpf ? `CPF ${cpf}` : "",
    rg ? `RG ${rg}` : "",
    estadoCivil,
    profissao,
    endereco ? `residente e domiciliado(a) em ${endereco}` : "",
  ].filter(Boolean);

  return parts.join(", ");
}

function getPropertyLegalDescription(property: Record<string, unknown> | null) {
  if (!property) return "";

  const metadata = isRecord(property.metadata) ? property.metadata : {};
  const juridica = firstText(
    metadata.descricao_juridica,
    property.descricao_juridica,
    property.descricao,
    property.descricao_imovel,
  );

  if (juridica) return juridica;

  const endereco = firstText(metadata.endereco_completo, property.location);
  const areaPrivativa = firstText(metadata.area_privativa);
  const areaConstruida = firstText(metadata.area_construida, property.metragem);
  const areaTerreno = firstText(metadata.area_terreno);
  const medidas = firstText(metadata.medidas_confrontacoes);
  const matricula = firstText(metadata.matricula);
  const cartorio = firstText(metadata.cartorio);
  const inscricaoMunicipal = firstText(metadata.inscricao_municipal);

  const composed = [
    endereco ? `Localizado em ${endereco}` : "",
    areaPrivativa ? `area privativa de ${areaPrivativa}` : "",
    areaConstruida ? `area construida de ${areaConstruida}` : "",
    areaTerreno ? `area do terreno de ${areaTerreno}` : "",
    medidas ? `medidas e confrontacoes: ${medidas}` : "",
    matricula ? `matricula ${matricula}` : "",
    cartorio ? `cartorio ${cartorio}` : "",
    inscricaoMunicipal ? `inscricao municipal/cadastro ${inscricaoMunicipal}` : "",
  ].filter(Boolean).join(", ");

  return composed || firstText(property.descricao, property.descricao_imovel, property.titulo_comercial, property.title);
}

function buildContractPlaceholders({
  contract,
  lead,
  property,
  broker,
  incomingPlaceholders,
}: {
  contract: Record<string, unknown>;
  lead: Record<string, unknown> | null;
  property: Record<string, unknown> | null;
  broker: Record<string, unknown> | null;
  incomingPlaceholders: Record<string, unknown>;
}) {
  const normalizedIncomingPlaceholders = Object.fromEntries(
    Object.entries(incomingPlaceholders).flatMap(([key, value]) => {
      const text = firstText(value);
      return text ? [[key, text]] : [];
    }),
  );
  const leadMetadata = isRecord(lead?.metadata) ? lead.metadata : {};
  const propertyMetadata = isRecord(property?.metadata) ? property.metadata : {};
  const contractMetadata = isRecord(contract.metadata) ? contract.metadata : {};
  const officialMetadataPlaceholders = Object.fromEntries(
    OFFICIAL_CONTRACT_PLACEHOLDER_FIELDS.flatMap((key) => {
      const text = firstText(contractMetadata[key]);
      return text ? [[key, text]] : [];
    }),
  );
  const value = contract.value ?? lead?.value ?? property?.valor ?? property?.price ?? 0;
  const commissionPercentage = contract.commission_percentage ?? incomingPlaceholders.percentual_honorarios ?? 5;
  const commissionAmount =
    contract.commission_amount ??
    (typeof value === "number" && Number.isFinite(value) ? value * (Number(commissionPercentage) / 100) : 0);

  const compradorQualificacao = buildQualification(
    lead?.name ?? contract.lead_name,
    leadMetadata,
    ["comprador_qualificacao", "qualificacao", "qualificacao_comprador"],
  );
  const vendedorQualificacao = buildQualification(
    propertyMetadata.vendedor_nome ?? propertyMetadata.proprietario_nome ?? propertyMetadata.locador_nome,
    propertyMetadata,
    ["vendedor_qualificacao", "proprietario_qualificacao", "locador_qualificacao"],
  );
  const corretorNome = firstText(broker?.name, broker?.full_name, contract.corretor_name);
  const imobiliariaNome = firstText(propertyMetadata.imobiliaria_nome, "Jurema Brokers");
  const imovelDescricaoJuridica = getPropertyLegalDescription(property);
  const imovelEndereco = firstText(propertyMetadata.endereco_completo, property?.location, property?.bairro, property?.neighborhood);
  const today = new Date().toLocaleDateString("pt-BR");

  return {
    vendedor_qualificacao: vendedorQualificacao,
    compradores_qualificacao: compradorQualificacao,
    comprador_qualificacao: compradorQualificacao,
    locador_qualificacao: vendedorQualificacao,
    locatario_qualificacao: compradorQualificacao,
    contratante_qualificacao: compradorQualificacao,
    corretores_participantes: corretorNome,
    imovel_descricao_juridica: imovelDescricaoJuridica,
    imovel_endereco: imovelEndereco,
    imovel_matricula: firstText(propertyMetadata.matricula),
    imovel_cartorio: firstText(propertyMetadata.cartorio),
    imovel_caracteristicas: firstText(propertyMetadata.caracteristicas, propertyMetadata.observacoes_contratuais),
    imovel_medidas_confrontacoes: firstText(propertyMetadata.medidas_confrontacoes),
    imovel_inscricao_municipal: firstText(propertyMetadata.inscricao_municipal),
    imovel_observacoes_contratuais: firstText(propertyMetadata.observacoes_contratuais),
    forma_pagamento: firstText(
      normalizedIncomingPlaceholders.forma_pagamento,
      contractMetadata.forma_pagamento,
      leadMetadata.forma_pagamento,
      propertyMetadata.forma_pagamento,
    ),
    forma_pagamento_honorarios: firstText(
      normalizedIncomingPlaceholders.forma_pagamento_honorarios,
      leadMetadata.forma_pagamento_honorarios,
      propertyMetadata.forma_pagamento_honorarios,
      normalizedIncomingPlaceholders.forma_pagamento,
    ),
    prazo_meses: firstText(normalizedIncomingPlaceholders.prazo_meses, contractMetadata.prazo_meses, leadMetadata.prazo_meses, propertyMetadata.prazo_meses),
    data_inicio: formatDateBR(normalizedIncomingPlaceholders.data_inicio ?? contractMetadata.data_inicio ?? leadMetadata.data_inicio ?? propertyMetadata.data_inicio),
    data_fim: formatDateBR(normalizedIncomingPlaceholders.data_fim ?? contractMetadata.data_fim ?? leadMetadata.data_fim ?? propertyMetadata.data_fim),
    valor: formatBRL(value),
    valor_total: formatBRL(value),
    valor_negocio: formatBRL(value),
    valor_aluguel: formatBRL(normalizedIncomingPlaceholders.valor_aluguel ?? contractMetadata.valor_aluguel ?? leadMetadata.valor_aluguel ?? propertyMetadata.valor_aluguel ?? value),
    valor_honorarios: formatBRL(normalizedIncomingPlaceholders.valor_honorarios ?? commissionAmount),
    percentual_honorarios: firstText(normalizedIncomingPlaceholders.percentual_honorarios, `${commissionPercentage}%`),
    comissao_descricao: firstText(normalizedIncomingPlaceholders.comissao_descricao, `Honorarios de corretagem de ${formatBRL(commissionAmount)}.`),
    cidade: firstText(normalizedIncomingPlaceholders.cidade, contractMetadata.cidade, propertyMetadata.cidade, broker?.city, "Joao Pessoa/PB"),
    foro: firstText(normalizedIncomingPlaceholders.foro, contractMetadata.foro, propertyMetadata.foro, "Joao Pessoa/PB"),
    data_contrato: today,
    vendedor_nome: firstText(propertyMetadata.vendedor_nome, propertyMetadata.proprietario_nome),
    comprador_nome: firstText(lead?.name, contract.lead_name),
    locador_nome: firstText(propertyMetadata.locador_nome, propertyMetadata.vendedor_nome, propertyMetadata.proprietario_nome),
    locatario_nome: firstText(lead?.name, contract.lead_name),
    contratante_nome: firstText(lead?.name, contract.lead_name),
    corretor_nome: corretorNome,
    imobiliaria_nome: imobiliariaNome,
    imobiliaria_creci: firstText(propertyMetadata.imobiliaria_creci),
    meio_pagamento: firstText(normalizedIncomingPlaceholders.meio_pagamento, leadMetadata.meio_pagamento, propertyMetadata.meio_pagamento),
    dados_bancarios_vendedor: firstText(
      normalizedIncomingPlaceholders.dados_bancarios_vendedor,
      contractMetadata.dados_bancarios_vendedor,
      propertyMetadata.dados_bancarios_vendedor,
    ),
    condicao_entrega_chaves: firstText(
      normalizedIncomingPlaceholders.condicao_entrega_chaves,
      contractMetadata.condicao_entrega_chaves,
      propertyMetadata.condicao_entrega_chaves,
    ),
    multa_rescisoria: firstText(
      normalizedIncomingPlaceholders.multa_rescisoria,
      contractMetadata.multa_rescisoria,
      propertyMetadata.multa_rescisoria,
    ),
    observacoes_especificas: firstText(
      normalizedIncomingPlaceholders.observacoes_especificas,
      contractMetadata.observacoes_especificas,
      propertyMetadata.observacoes_especificas,
    ),
    dados_bancarios_honorarios: firstText(
      incomingPlaceholders.dados_bancarios_honorarios,
      broker?.pix_key ? `PIX ${broker.pix_key}` : "",
      broker?.bank_account,
    ),
    finalidade_locacao: firstText(normalizedIncomingPlaceholders.finalidade_locacao, leadMetadata.finalidade, propertyMetadata.finalidade_locacao, "residencial"),
    dia_vencimento: firstText(normalizedIncomingPlaceholders.dia_vencimento, leadMetadata.dia_vencimento, propertyMetadata.dia_vencimento),
    ...officialMetadataPlaceholders,
    ...normalizedIncomingPlaceholders,
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params;
    const { supabase, tenantId, userId, error, status } = await getAuthContext();

    if (error || !tenantId) {
      return NextResponse.json({ error }, { status });
    }

    const requestBody = await req.json().catch(() => ({
      canais: { whatsapp: true, email: true },
    })) as {
      canais?: { whatsapp?: boolean; email?: boolean };
      template_key?: string | null;
      template_name?: string | null;
      template_file_id?: string | null;
      conteudo?: string | null;
      renderedBody?: string | null;
      content?: string | null;
      placeholders?: Record<string, unknown> | null;
    };
    const canais = requestBody.canais;
    const incomingConteudo =
      textOrNull(requestBody.conteudo) ??
      textOrNull(requestBody.renderedBody) ??
      textOrNull(requestBody.content);
    const template = getJuremaContractTemplate(requestBody.template_key);
    const templateFileId = officialTemplateFileId(
      textOrNull(requestBody.template_file_id) ?? template?.templateFileId ?? null,
    );
    const templateName = textOrNull(requestBody.template_name) ?? template?.label ?? null;
    const hasOfficialTemplate = !!templateFileId;

    let { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, tenant_id, lead_id, project_id, imovel_id, broker_id, lead_name, project_name, corretor_name, title, type, value, commission_percentage, commission_amount, conteudo, metadata")
      .eq("id", contractId)
      .eq("tenant_id", tenantId)
      .single();

    if (contractError && isMissingMetadataColumn(contractError)) {
      const retry = await supabase
        .from("contracts")
        .select("id, tenant_id, lead_id, project_id, imovel_id, broker_id, lead_name, project_name, corretor_name, title, type, value, commission_percentage, commission_amount, conteudo")
        .eq("id", contractId)
        .eq("tenant_id", tenantId)
        .single();
      contract = retry.data ? { ...retry.data, metadata: null } : retry.data;
      contractError = retry.error;
    }

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contrato nao encontrado" }, { status: 404 });
    }

    if (!contract.lead_id) {
      return NextResponse.json({ error: "Contrato sem lead vinculado" }, { status: 400 });
    }

    let conteudo = incomingConteudo ?? contract.conteudo ?? null;

    if (!conteudo && !hasOfficialTemplate) {
      return NextResponse.json(
        { error: "Contrato sem conteudo salvo ou template_file_id oficial." },
        { status: 400 },
      );
    }

    if (incomingConteudo && incomingConteudo !== contract.conteudo) {
      const { data: persistedContract, error: persistError } = await supabase
        .from("contracts")
        .update({
          conteudo: incomingConteudo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contract.id)
        .eq("tenant_id", tenantId)
        .select("conteudo")
        .single();

      if (persistError) {
        console.error("[POST /api/contracts/:id/send] content persist error:", persistError);
        return NextResponse.json(
          {
            error: "Nao foi possivel salvar o conteudo final antes do envio",
            ...devDetail(persistError.message),
          },
          { status: 500 },
        );
      }

      conteudo = persistedContract.conteudo ?? conteudo;
    }

    const [leadResult, propertyResult, brokerResult] = await Promise.all([
      supabase
        .from("leads")
        .select("id, name, email, phone, value, notes, metadata")
        .eq("id", contract.lead_id)
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      contract.imovel_id || contract.project_id
        ? supabase
            .from("imoveis")
            .select("id, titulo_comercial, bairro, valor, descricao_imovel, tipo_de_imovel, finalidade, metadata")
            .eq("id", contract.imovel_id ?? contract.project_id)
            .eq("tenant_id", tenantId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      contract.broker_id
        ? supabase
            .from("corretores")
            .select("id, name, email, phone, cpf, city, state, bank, bank_agency, bank_account, pix_key")
            .eq("id", contract.broker_id)
            .eq("tenant_id", tenantId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (leadResult.error) {
      console.error("[POST /api/contracts/:id/send] lead load error:", leadResult.error);
    }
    if (propertyResult.error) {
      console.error("[POST /api/contracts/:id/send] property load error:", propertyResult.error);
    }
    if (brokerResult.error) {
      console.error("[POST /api/contracts/:id/send] broker load error:", brokerResult.error);
    }

    const basePayload = {
      tenant_id: tenantId,
      contract_id: contract.id,
      lead_id: contract.lead_id,
      canais: {
        whatsapp: canais?.whatsapp ?? true,
        email: canais?.email ?? true,
      },
      template_key: textOrNull(requestBody.template_key),
      template_name: templateName,
      template_file_id: templateFileId,
    };
    const payload = hasOfficialTemplate ? {
      ...basePayload,
      placeholders: buildContractPlaceholders({
        contract,
        lead: leadResult.data,
        property: propertyResult.data,
        broker: brokerResult.data,
        incomingPlaceholders: isRecord(requestBody.placeholders) ? requestBody.placeholders : {},
      }),
    } : {
      ...basePayload,
      conteudo,
    };

    if (isDev) {
      console.log("[POST /api/contracts/:id/send] payload n8n:", payload);
    }

    const webhookResponse = await fetch(N8N_SEND_CONTRACT_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!webhookResponse.ok) {
      const message = await webhookResponse.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Erro ao enviar contrato para o n8n",
          ...devDetail(message || `HTTP ${webhookResponse.status}`),
        },
        { status: 502 },
      );
    }

    const sentAt = new Date().toISOString();

    const { data: updatedContract, error: updateError } = await supabase
      .from("contracts")
      .update({ status: "sent", updated_at: sentAt })
      .eq("id", contract.id)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (updateError) {
      console.error("[POST /api/contracts/:id/send] update error:", updateError);
      return NextResponse.json(
        {
          error: "Contrato enviado, mas nao foi possivel atualizar o status",
          ...devDetail(updateError.message),
        },
        { status: 500 },
      );
    }

    let propertyStatusSync = null;
    try {
      propertyStatusSync = await syncPropertyStatusForContract({
        supabase,
        tenantId,
        propertyId: contractPropertyId(contract),
        contractStatus: "sent",
      });
    } catch (propertyStatusError) {
      console.error("[POST /api/contracts/:id/send] property status sync error:", propertyStatusError);
      return NextResponse.json(
        {
          error: "Contrato enviado, mas nao foi possivel atualizar o status operacional do imovel",
          ...devDetail(propertyStatusError instanceof Error ? propertyStatusError.message : "Erro desconhecido"),
        },
        { status: 500 },
      );
    }

    try {
      await recordTimelineEvent(supabase, {
        tenant_id: tenantId,
        lead_id: contract.lead_id ?? null,
        contract_id: contract.id,
        imovel_id: contractPropertyId(contract),
        corretor_id: contract.broker_id ?? null,
        event_type: "contract_sent",
        metadata: {
          source: "api/contracts/[id]/send",
          template_key: payload.template_key ?? null,
          template_file_id: payload.template_file_id ?? null,
          property_status_sync: propertyStatusSync,
        },
        created_by: userId,
      });
    } catch (timelineError) {
      console.error("[POST /api/contracts/:id/send] timeline contract_sent error:", timelineError);
    }

    if (propertyStatusSync?.transition === "sent_to_em_negociacao") {
      try {
        await recordTimelineEvent(supabase, {
          tenant_id: tenantId,
          lead_id: contract.lead_id ?? null,
          contract_id: contract.id,
          imovel_id: contractPropertyId(contract),
          corretor_id: contract.broker_id ?? null,
          event_type: "property_reserved",
          metadata: {
            source: "api/contracts/[id]/send",
            property_status_sync: propertyStatusSync,
          },
          created_by: userId,
        });
      } catch (timelineError) {
        console.error("[POST /api/contracts/:id/send] timeline property_reserved error:", timelineError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Contrato enviado",
        contract: updatedContract,
        payload,
        property_status_sync: propertyStatusSync,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[POST /api/contracts/:id/send] unexpected error:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
