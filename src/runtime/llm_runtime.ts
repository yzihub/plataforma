import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import type { CanonicalTool, RuntimeViolation } from "@/lib/ju-runtime/cognitive-kernel-contracts";
import { assertCanonicalResponseDraft } from "@/lib/ju-runtime/cognitive-kernel-contracts";
import type { BehavioralRuntimeResult, LlmRuntimeResult, RenderedContext, ToolCallRequest, ToolCallResult } from "./types";
import type { ToolOrchestrator } from "./tool_orchestrator";
import { governanceViolations as governanceViolationsCounter, logger, tokenUsage } from "./observability";
import { stripGovernanceSignals } from "./outbound_sanitizer";

const DEFAULT_MAX_TOOL_PASSES = 2;
const OPENAI_TIMEOUT_MS = 45000;

const OPENAI_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "consultar_imoveis",
      description: "Fonte unica de verdade para informacoes tecnicas, valores, disponibilidade, cards e URLs institucionais de imoveis.",
      parameters: {
        type: "object",
        properties: {
          bairro: { type: "string" },
          tipo_imovel: { type: "string" },
          quartos: { type: "string" },
          valor_max: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "atualizar_qualificacao",
      description:
        "Persistir perfil, estado de funil, temperatura e qualificacao do lead quando qualquer campo for descoberto. Chamar sempre que houver informacao nova de objetivo, bairro, faixa, tipologia, quartos, prazo ou pagamento. Evita perda de stage, behavioral_state, lead_temperature, intent e qualification_status.",
      parameters: {
        type: "object",
        properties: {
          temperatura: {
            type: "string",
            enum: ["frio", "morno", "quente"],
            description: "Temperatura comportamental atual do lead.",
          },
          qualificacao_status: {
            type: "string",
            enum: ["incompleto", "frio", "morno", "quente", "desqualificado"],
            description: "Status de qualificacao consolidado.",
          },
          objetivo: {
            type: "string",
            enum: ["comprar", "alugar", "investir"],
            description: "Intencao principal declarada pelo lead.",
          },
          finalidade: {
            type: "string",
            enum: ["moradia", "investimento", "veraneio", "outro"],
            description: "Finalidade do imovel.",
          },
          bairro: {
            type: "string",
            description: "Bairro ou regiao de interesse declarada.",
          },
          faixa_valor: {
            type: "string",
            description: "Faixa de valor ou orcamento maximo (string para preservar formato).",
          },
          tipo_imovel: {
            type: "string",
            description: "Tipologia (apartamento, casa, terreno, sala, flat).",
          },
          quartos: {
            type: "string",
            description: "Numero minimo de quartos solicitado.",
          },
          prazo: {
            type: "string",
            description: "Prazo declarado ou estimado para a decisao.",
          },
          forma_pagamento: {
            type: "string",
            enum: ["a_vista", "financiamento", "fgts", "consorcio", "permuta", "indefinido"],
            description: "Forma de pagamento sinalizada.",
          },
          perfil_resumido: {
            type: "string",
            description: "Sintese curta do perfil para consulta rapida (1-2 linhas).",
          },
          interesse_principal: {
            type: "string",
            description: "Driver principal de interesse (lazer, escola, mar, investimento etc).",
          },
          motivo: {
            type: "string",
            description: "Motivo do update (ex: novo bairro declarado, prazo confirmado).",
          },
          observacao: {
            type: "string",
            description: "Observacao livre que apoie a tomada de decisao do corretor.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "setar_lead_quente",
      description: "Usar apenas quando o lead aceitar visita ou cafe na Jurema.",
      parameters: {
        type: "object",
        properties: {
          motivo: { type: "string" },
          localizacao_visita: { type: "string" },
          observacao: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "conhecimento_estrategico_luana1",
      description: "Consultar conhecimento estrategico institucional quando permitido pelo runtime.",
      parameters: { type: "object", properties: { query: { type: "string" } } },
    },
  },
];

function parseArgs(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function systemPrompt(behavioral: BehavioralRuntimeResult): string {
  return [
    "A Ju atua como consultora imobiliaria da Jurema Brokers, em conversa de WhatsApp.",
    "Tom: leve, humano, natural e consultivo. Mensagens curtas e escaneaveis.",
    "Evite comportamento de SDR, formulario ou triagem fria.",
    "",
    "ABERTURA (primeira mensagem / saudacao):",
    "Entre conversando como gente de verdade no WhatsApp. Curto e leve.",
    "NAO apresente missao, NAO explique como voce ajuda, NAO faca onboarding, NAO fale como empresa/CRM.",
    "NAO diga frases como 'sua consultora imobiliaria', 'Meu objetivo e', 'de forma consultiva e personalizada', 'sem pressao', 'com total transparencia', 'para comecar nossa busca'.",
    "NAO peca permissao para continuar. Apenas puxe a conversa.",
    "No maximo uma pergunta na abertura (o nome ou o que a pessoa procura).",
    "Exemplo de tom: 'Oi! Aqui e a Ju, da Jurema Brokers 🙂 Como posso te chamar?' ou 'Oi! Me conta o que voce ta procurando que eu te ajudo.'",
    "",
    "Quando houver contexto suficiente e o cliente demonstrar intencao de ver opcoes, consultar_imoveis torna-se obrigatorio.",
    "Bairro/regiao + orcamento + tipologia + quartos ja e contexto suficiente para consultar_imoveis.",
    "Nascente, varanda gourmet, suite, andar alto, lazer e estado de conservacao sao refinamentos opcionais depois da shortlist.",
    "Apresente primeiro e aprofunde depois.",
    "Nunca pedir autorizacao para apresentar imovel.",
    "Evite: Posso te mostrar, Quer que eu envie, Se quiser eu posso.",
    "Maximo de 1 pergunta por mensagem.",
    "Maximo de 3 imoveis por apresentacao.",
    "",
    "RENDERIZACAO DOS IMOVEIS (quando consultar_imoveis retornar cards):",
    "Monte a conversa a partir dos campos de cada card. NUNCA gere resposta generica/corporativa.",
    "Para cada imovel use EXATAMENTE estes campos do card:",
    "- title: abre a conversa citando tipo/bairro de forma leve (ex: 'Tem um aqui em Tambau que acho que vale voce olhar').",
    "- highlights_operacionais: array de destaques curtos. Renderize um por linha como bullets, prefixo '• '.",
    "- human_summary: uma frase de contexto humano. Use como veio, sem reescrever em tom corporativo.",
    "- question_hint: a pergunta de fechamento. Use como veio.",
    "Formato por imovel: linha de abertura (do title) -> bullets dos highlights_operacionais -> human_summary.",
    "O card visual (imagem e link) e entregue separadamente pela camada operacional; nao cole URL nem despeje payload tecnico no texto.",
    "Com mais de um imovel: apresente cada um nesse formato, mas faca APENAS UMA pergunta no final da mensagem inteira (o question_hint do imovel principal). Nunca repita pergunta por card.",
    "Use somente dados presentes no card. Nao invente metragem, quartos, valores nem caracteristicas. URL e verdade so da tool; nunca reconstrua de memoria.",
    "Se a tool nao retornar imoveis (fallback_message), responda com transparencia, sem empurrar opcao ruim.",
    "",
    "PROIBIDO (linguagem corporativa/SDR): 'opcao alinhada', 'opcoes alinhadas', 'Encontrei uma opcao alinhada ao que voce procura', 'conforme solicitado', 'caso queira', 'fico a disposicao', 'segue abaixo'.",
    "",
    `next_best_action oficial: ${behavioral.decision.next_best_action}`,
    `property_presentation_due: ${behavioral.decision.property_presentation_due ? "true" : "false"}`,
    `required_tools: ${behavioral.decision.required_tools.join(", ") || "nenhuma"}`,
  ].join("\n");
}

function toolChoice(requiredTools: CanonicalTool[]) {
  if (requiredTools.length === 1) {
    return { type: "function" as const, function: { name: requiredTools[0] } };
  }
  return "auto" as const;
}

function toolRequestsFromMessage(message: { tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: string } }> }): ToolCallRequest[] {
  return (message.tool_calls ?? [])
    .map((call) => ({
      tool: call.function?.name as CanonicalTool,
      input: parseArgs(call.function?.arguments),
      tool_call_id: call.id,
    }))
    .filter((call) => Boolean(call.tool));
}

export class LlmRuntime {
  constructor(
    private readonly openai: OpenAI,
    private readonly model: string,
    private readonly tools: ToolOrchestrator,
    private readonly maxToolPasses: number = DEFAULT_MAX_TOOL_PASSES,
  ) {}

  async run(args: {
    mensagemCliente: string;
    context: RenderedContext;
    behavioral: BehavioralRuntimeResult;
    baseToolPayload: Record<string, unknown>;
  }): Promise<LlmRuntimeResult> {
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt(args.behavioral) },
      {
        role: "user",
        content: `Mensagem do Cliente: ${args.mensagemCliente}\n\n${args.context.context}`,
      },
    ];
    const toolResults: ToolCallResult[] = [];
    const toolCalls: ToolCallRequest[] = [];
    let output = "";
    let inputTokens = 0;
    let outputTokens = 0;

    const maxToolPasses = Math.max(1, Math.min(this.maxToolPasses, DEFAULT_MAX_TOOL_PASSES));
    for (let pass = 0; pass < maxToolPasses; pass += 1) {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        temperature: 0.6,
        max_tokens: 1400,
        messages,
        tools: OPENAI_TOOLS.filter((tool) => tool.type === "function" && args.behavioral.decision.allowed_tools.includes(tool.function.name as CanonicalTool)),
        tool_choice: pass === 0 ? toolChoice(args.behavioral.decision.required_tools) : "none",
      }, {
        signal: typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
          ? AbortSignal.timeout(OPENAI_TIMEOUT_MS)
          : undefined,
      });
      const choice = completion.choices[0]?.message;
      inputTokens += completion.usage?.prompt_tokens ?? 0;
      outputTokens += completion.usage?.completion_tokens ?? 0;
      if (!choice) break;
      messages.push(choice);
      output = typeof choice.content === "string" ? choice.content : output;

      const requests = toolRequestsFromMessage(choice);
      const missingRequired: ToolCallRequest[] = args.behavioral.decision.required_tools
        .filter((tool) => !toolCalls.some((call) => call.tool === tool))
        .map((tool) => ({ tool, input: {} }));
      const toExecute = [...requests, ...(pass === 0 ? missingRequired : [])]
        .filter((request, index, all) => all.findIndex((candidate) => candidate.tool === request.tool) === index);

      if (!toExecute.length) {
        const violations: RuntimeViolation[] = assertCanonicalResponseDraft(args.behavioral.decision, {
          text: output,
          tools_called: toolCalls.map((call) => call.tool),
        });
        if (violations.length) {
          // Audit-only: governance violations go to logs/metrics and the structured
          // result. They are NEVER concatenated into the customer-facing text.
          for (const violation of violations) governanceViolationsCounter.labels(violation.code).inc();
          logger.warn(
            { governance_violations: violations.map((violation) => violation.code) },
            "ju.governance_violation_detected",
          );
        }
        tokenUsage.labels("input").inc(inputTokens);
        tokenUsage.labels("output").inc(outputTokens);
        return {
          output: stripGovernanceSignals(output),
          governance_violations: violations,
          tool_calls: toolCalls,
          tool_results: toolResults,
          token_usage: { input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: inputTokens + outputTokens },
          passes: pass + 1,
        };
      }

      for (const request of toExecute) {
        toolCalls.push(request);
        const result = await this.tools.execute(request, args.behavioral.decision, args.baseToolPayload);
        toolResults.push(result);
        const content = JSON.stringify(result.output ?? { ok: result.ok, error: result.error });
        if (request.tool_call_id) {
          messages.push({
            role: "tool",
            tool_call_id: request.tool_call_id,
            content,
          } as ChatCompletionMessageParam);
        } else {
          messages.push({
            role: "user",
            content: `Resultado obrigatorio de ${request.tool}: ${content}`,
          });
        }
      }
    }

    tokenUsage.labels("input").inc(inputTokens);
    tokenUsage.labels("output").inc(outputTokens);
    return {
      output: stripGovernanceSignals(output),
      governance_violations: [],
      tool_calls: toolCalls,
      tool_results: toolResults,
      token_usage: { input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: inputTokens + outputTokens },
      passes: maxToolPasses,
    };
  }
}
