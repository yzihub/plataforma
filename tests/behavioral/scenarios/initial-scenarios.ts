import type { CanonicalKernelInput, CanonicalResponseDraft } from "@/lib/ju-runtime/cognitive-kernel-contracts";

export type BehavioralScenario = {
  id: string;
  name: string;
  message: string;
  input?: Partial<CanonicalKernelInput>;
  draft: CanonicalResponseDraft;
  expectations: {
    runtime_state?: string;
    next_best_action?: string;
    presentation_due?: boolean;
    inventory_constraint_active?: boolean;
    no_tools_called?: boolean;
    property_cards_count?: number;
    max_questions: number;
    contextualization_required?: boolean;
    forbidden_violation_codes?: string[];
    required_terms?: string[];
    forbidden_terms?: string[];
  };
};

const baseInput = (message: string): CanonicalKernelInput => ({
  tenant_id: "tenant_behavioral_simulation",
  lead: {
    id: "lead_behavioral_simulation",
    tenant_id: "tenant_behavioral_simulation",
    status: "new",
  },
  conversation: {
    id: "conversation_behavioral_simulation",
    status: "open",
    ai_paused: false,
  },
  mensagemCliente: message,
  messageType: "text",
  recent_messages: [],
  runtime_memory: {
    qualification_depth: 0,
    properties_sent_count: 0,
  },
});

const inventoryConstraintInput = (
  message: string,
  reason:
    | "no_coherent_match"
    | "inventory_incompatible"
    | "region_unavailable"
    | "budget_inviable"
    | "extremely_specific_profile",
): CanonicalKernelInput => ({
  ...baseInput(message),
  event_type: "inventory_constraint",
  internal_behavioral_event: {
    inventory_constraint_active: true,
    inventory_constraint_reason: reason,
  },
  runtime_memory: {
    qualification_depth: 3,
    properties_sent_count: 0,
    inventory_constraint_active: true,
    inventory_constraint_reason: reason,
  },
});

export const initialBehavioralScenarios: BehavioralScenario[] = [
  {
    id: "lead_objetivo_bessa",
    name: "LEAD OBJETIVO",
    message: "quero apartamento no bessa",
    input: baseInput("quero apartamento no bessa"),
    draft: {
      text: "Bessa ajuda bastante. Ja consigo separar boas opcoes por ali; depois a gente ajusta pelo que fizer sentido.",
      tools_called: ["consultar_imoveis"],
      property_cards_count: 2,
    },
    expectations: {
      runtime_state: "matching",
      presentation_due: true,
      max_questions: 0,
      contextualization_required: true,
      forbidden_violation_codes: ["sdr_behavior", "too_many_questions", "permission_to_search", "abstract_qualification_loop"],
      required_terms: ["Bessa", "ajuda bastante"],
      forbidden_terms: ["orcamento", "financiamento", "cadastro", "aderente"],
    },
  },
  {
    id: "lead_frio_tem_imovel",
    name: "LEAD FRIO",
    message: "tem imovel?",
    input: baseInput("tem imovel?"),
    draft: {
      text: "Tenho sim. Pra eu nao te mandar coisa aleatoria: e pra morar ou investir?",
      tools_called: [],
      property_cards_count: 0,
    },
    expectations: {
      runtime_state: "lead_novo",
      presentation_due: false,
      max_questions: 1,
      contextualization_required: true,
      forbidden_violation_codes: ["sdr_behavior", "too_many_questions", "permission_to_search"],
      required_terms: ["aleatoria"],
      forbidden_terms: ["preencher cadastro", "formulario", "te pergunto"],
    },
  },
  {
    id: "lead_ansioso_urgente",
    name: "LEAD ANSIOSO",
    message: "preciso me mudar urgente",
    input: baseInput("preciso me mudar urgente"),
    draft: {
      text: "Certo. Se e urgente, melhor ir pelo caminho mais simples. Voce prefere entrar rapido ou segurar uma regiao especifica?",
      tools_called: [],
      property_cards_count: 0,
    },
    expectations: {
      runtime_state: "lead_novo",
      presentation_due: false,
      max_questions: 1,
      contextualization_required: true,
      forbidden_violation_codes: ["sdr_behavior", "too_many_questions", "permission_to_search"],
      required_terms: ["urgente", "simples"],
      forbidden_terms: ["orcamento", "financiamento", "te pergunto"],
    },
  },
  {
    id: "lead_investidor",
    name: "LEAD INVESTIDOR",
    message: "procuro imovel para investir",
    input: baseInput("procuro imovel para investir"),
    draft: {
      text: "Legal. Pra investir eu ja olho mais liquidez e aluguel possivel do que beleza do imovel. Voce pensa em renda mensal ou valorizacao?",
      tools_called: ["consultar_imoveis"],
      property_cards_count: 0,
    },
    expectations: {
      runtime_state: "matching",
      presentation_due: true,
      max_questions: 1,
      contextualization_required: true,
      forbidden_violation_codes: ["sdr_behavior", "too_many_questions", "permission_to_search"],
      required_terms: ["investir", "liquidez"],
      forbidden_terms: ["cadastro", "analise", "criterio"],
    },
  },
  {
    id: "lead_desconfiado",
    name: "LEAD DESCONFIADO",
    message: "isso e imobiliaria ou corretor?",
    input: baseInput("isso e imobiliaria ou corretor?"),
    draft: {
      text: "Entendo. E a Jurema Brokers, uma imobiliaria. Eu te ajudo num caminho mais consultivo, sem te jogar lista pronta. Posso entender rapidinho o que voce quer, pra nao te indicar algo nada a ver?",
      tools_called: [],
      property_cards_count: 0,
    },
    expectations: {
      runtime_state: "lead_novo",
      presentation_due: false,
      max_questions: 1,
      contextualization_required: true,
      forbidden_violation_codes: ["sdr_behavior", "too_many_questions"],
      required_terms: ["Jurema Brokers", "consultivo"],
      forbidden_terms: ["cadastro", "formulario", "operacao imobiliaria"],
    },
  },
  {
    id: "lead_so_quer_preco",
    name: "LEAD QUE SO QUER PRECO",
    message: "qual valor?",
    input: baseInput("qual valor?"),
    draft: {
      text: "Depende do tipo e da regiao. Me diz so se e apartamento, casa ou flat que eu te passo uma faixa mais honesta.",
      tools_called: [],
      property_cards_count: 0,
    },
    expectations: {
      runtime_state: "lead_novo",
      presentation_due: false,
      max_questions: 1,
      contextualization_required: true,
      forbidden_violation_codes: ["sdr_behavior", "too_many_questions", "permission_to_search"],
      required_terms: ["faixa"],
      forbidden_terms: ["financiamento", "cadastro", "analise"],
    },
  },
  {
    id: "lead_ja_sabe_o_que_quer",
    name: "LEAD QUE JA SABE O QUE QUER",
    message: "quero um apartamento de 3 quartos em cabo branco ate 900 mil",
    input: baseInput("quero um apartamento de 3 quartos em cabo branco ate 900 mil"),
    draft: {
      text: "Otimo. Cabo Branco, 3 quartos, ate 900 mil. Ja da pra comecar bem dai; vou separar opcoes e ajusto com voce depois.",
      tools_called: ["consultar_imoveis"],
      property_cards_count: 3,
    },
    expectations: {
      runtime_state: "matching",
      presentation_due: true,
      max_questions: 0,
      contextualization_required: true,
      forbidden_violation_codes: ["sdr_behavior", "too_many_questions", "permission_to_search", "abstract_qualification_loop"],
      required_terms: ["Cabo Branco", "comecar"],
      forbidden_terms: ["qual bairro", "qual orcamento", "financiamento", "aderente"],
    },
  },
  {
    id: "inventory_sem_imovel_aderente",
    name: "SEM IMOVEL ADERENTE",
    message: "quero cobertura no bessa ate 500 mil",
    input: inventoryConstraintInput("quero cobertura no bessa ate 500 mil", "no_coherent_match"),
    draft: {
      text: "Sendo bem transparente: hoje eu nao tenho nada que realmente converse com isso. Prefiro te falar agora do que tentar encaixar uma opcao desalinhada so pra continuar.",
      tools_called: [],
      property_cards_count: 0,
    },
    expectations: {
      runtime_state: "matching",
      next_best_action: "graceful_consultative_exit",
      presentation_due: false,
      inventory_constraint_active: true,
      no_tools_called: true,
      property_cards_count: 0,
      max_questions: 0,
      contextualization_required: true,
      forbidden_violation_codes: ["inventory_mismatch_push", "inventory_loop", "too_many_questions", "permission_to_search"],
      required_terms: ["transparente", "desalinhada"],
      forbidden_terms: ["vou continuar buscando", "temos outras unidades", "posso te mostrar mais opcoes", "aguarde novas oportunidades"],
    },
  },
  {
    id: "inventory_incompativel",
    name: "INVENTORY INCOMPATIVEL",
    message: "quero casa com vista mar em cabo branco ate 700 mil",
    input: inventoryConstraintInput("quero casa com vista mar em cabo branco ate 700 mil", "inventory_incompatible"),
    draft: {
      text: "Prefiro ser honesta contigo: com esse recorte, o que tenho hoje nao fica coerente. Melhor pausar aqui do que te empurrar algo que nao faz sentido.",
      tools_called: [],
      property_cards_count: 0,
    },
    expectations: {
      runtime_state: "matching",
      next_best_action: "graceful_consultative_exit",
      presentation_due: false,
      inventory_constraint_active: true,
      no_tools_called: true,
      property_cards_count: 0,
      max_questions: 0,
      contextualization_required: true,
      forbidden_violation_codes: ["inventory_mismatch_push", "inventory_loop", "permission_to_search"],
      required_terms: ["honesta", "coerente"],
      forbidden_terms: ["outras unidades", "mais opcoes", "continuar buscando", "perder lead"],
    },
  },
  {
    id: "inventory_regiao_indisponivel",
    name: "REGIAO INDISPONIVEL",
    message: "quero apartamento em ponta de campina",
    input: inventoryConstraintInput("quero apartamento em ponta de campina", "region_unavailable"),
    draft: {
      text: "Hoje eu nao tenho algo realmente bom em Ponta de Campina pra te indicar com seguranca. Deixo teu perfil anotado e te chamo quando aparecer algo mais alinhado.",
      tools_called: [],
      property_cards_count: 0,
    },
    expectations: {
      runtime_state: "matching",
      next_best_action: "graceful_consultative_exit",
      presentation_due: false,
      inventory_constraint_active: true,
      no_tools_called: true,
      property_cards_count: 0,
      max_questions: 0,
      contextualization_required: true,
      forbidden_violation_codes: ["inventory_mismatch_push", "inventory_loop", "too_many_questions"],
      required_terms: ["nao tenho algo", "seguranca"],
      forbidden_terms: ["temos outras unidades", "posso te mostrar", "vou continuar buscando"],
    },
  },
  {
    id: "inventory_budget_inviavel",
    name: "BUDGET INVIAVEL",
    message: "quero 3 quartos em cabo branco ate 300 mil",
    input: inventoryConstraintInput("quero 3 quartos em cabo branco ate 300 mil", "budget_inviable"),
    draft: {
      text: "Sendo bem transparente, hoje eu nao tenho um match realmente coerente nesse valor em Cabo Branco. Prefiro te preservar de opcao desalinhada.",
      tools_called: [],
      property_cards_count: 0,
    },
    expectations: {
      runtime_state: "qualificando",
      next_best_action: "graceful_consultative_exit",
      presentation_due: false,
      inventory_constraint_active: true,
      no_tools_called: true,
      property_cards_count: 0,
      max_questions: 0,
      contextualization_required: true,
      forbidden_violation_codes: ["inventory_mismatch_push", "inventory_loop", "permission_to_search"],
      required_terms: ["match", "coerente"],
      forbidden_terms: ["financiamento", "cadastro", "outras unidades", "mais opcoes"],
    },
  },
  {
    id: "inventory_perfil_extremamente_especifico",
    name: "PERFIL EXTREMAMENTE ESPECIFICO",
    message: "quero cobertura duplex frente mar 4 suites no bessa ate 1 milhao",
    input: inventoryConstraintInput("quero cobertura duplex frente mar 4 suites no bessa ate 1 milhao", "extremely_specific_profile"),
    draft: {
      text: "Esse perfil e bem especifico. Hoje eu nao tenho nada que eu ache realmente coerente pra te apresentar; melhor deixar isso no radar do que forcar um encaixe ruim.",
      tools_called: [],
      property_cards_count: 0,
    },
    expectations: {
      runtime_state: "matching",
      next_best_action: "graceful_consultative_exit",
      presentation_due: false,
      inventory_constraint_active: true,
      no_tools_called: true,
      property_cards_count: 0,
      max_questions: 0,
      contextualization_required: true,
      forbidden_violation_codes: ["inventory_mismatch_push", "inventory_loop", "too_many_questions"],
      required_terms: ["especifico", "coerente"],
      forbidden_terms: ["vou continuar buscando", "temos outras unidades", "posso te mostrar", "aguarde"],
    },
  },
  {
    id: "lead_rejeita_opcoes",
    name: "LEAD REJEITA OPCOES",
    message: "nenhuma dessas opcoes faz sentido",
    input: inventoryConstraintInput("nenhuma dessas opcoes faz sentido", "no_coherent_match"),
    draft: {
      text: "Sendo bem transparente, isso ajuda bastante. Prefiro ajustar agora do que te fazer perder tempo com algo desalinhado; pelo teu recorte, o caminho parece outro.",
      tools_called: [],
      property_cards_count: 0,
    },
    expectations: {
      runtime_state: "lead_novo",
      next_best_action: "graceful_consultative_exit",
      presentation_due: false,
      inventory_constraint_active: true,
      no_tools_called: true,
      property_cards_count: 0,
      max_questions: 0,
      contextualization_required: true,
      forbidden_violation_codes: ["inventory_mismatch_push", "inventory_loop", "too_many_questions", "permission_to_search"],
      required_terms: ["ajuda bastante", "desalinhado"],
      forbidden_terms: ["vou continuar buscando", "temos outras unidades", "posso te mostrar", "aguarde novas oportunidades"],
    },
  },
];
