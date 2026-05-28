import type { CanonicalKernelInput } from "./cognitive-kernel-contracts";

export type InventoryConstraintReason =
  | "no_coherent_match"
  | "inventory_incompatible"
  | "region_unavailable"
  | "budget_inviable"
  | "extremely_specific_profile";

export type InventoryConstraintPolicy = {
  active: boolean;
  reason: InventoryConstraintReason | null;
  should_gracefully_exit: boolean;
  required_framing: string[];
  forbidden_behaviors: string[];
  suggested_phrases: string[];
};

const validReasons: InventoryConstraintReason[] = [
  "no_coherent_match",
  "inventory_incompatible",
  "region_unavailable",
  "budget_inviable",
  "extremely_specific_profile",
];

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function normalize(value: unknown): string {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function asReason(value: unknown): InventoryConstraintReason | null {
  const normalized = normalize(value).replace(/-/g, "_");
  return validReasons.find((reason) => reason === normalized) ?? null;
}

export function buildInventoryConstraintPolicy(input: CanonicalKernelInput): InventoryConstraintPolicy {
  const event = input.internal_behavioral_event ?? {};
  const memory = input.runtime_memory ?? {};
  const explicitReason =
    asReason(event.inventory_constraint_reason) ??
    asReason(event.no_match_reason) ??
    asReason(memory.inventory_constraint_reason) ??
    asReason(memory.no_match_reason);
  const active = Boolean(
    explicitReason ||
      event.inventory_constraint_active === true ||
      event.no_coherent_match === true ||
      memory.inventory_constraint_active === true ||
      memory.no_coherent_match === true,
  );

  return {
    active,
    reason: explicitReason ?? (active ? "no_coherent_match" : null),
    should_gracefully_exit: active,
    required_framing: [
      "transparencia_sem_fracasso",
      "curadoria_criteriosa",
      "nao_empurrar_opcao_desalinhada",
      "porta_aberta_sem_pressao",
    ],
    forbidden_behaviors: [
      "continuar_busca_infinita",
      "oferecer_opcoes_ruins",
      "prometer_novas_oportunidades_sem_contexto",
      "pedir_mais_criterios_para_segurar_lead",
      "captura_agressiva_de_followup",
    ],
    suggested_phrases: [
      "prefiro te falar isso do que tentar encaixar algo so pra continuar o atendimento",
      "prefiro ser honesta contigo agora do que te fazer perder tempo",
      "hoje eu nao tenho um match que eu ache realmente coerente pro teu perfil",
      "deixei tudo anotado aqui para chamar quando aparecer algo mais alinhado",
    ],
  };
}
