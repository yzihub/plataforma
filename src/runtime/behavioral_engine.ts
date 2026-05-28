import {
  assertCanonicalKernelDecision,
  buildCanonicalKernelDecision,
  inferCanonicalSignals,
  type CanonicalKernelInput,
} from "@/lib/ju-runtime/cognitive-kernel-contracts";
import type { BehavioralRuntimeResult, MemoryRuntimeResult } from "./types";

export function syncOperationalContext(
  input: CanonicalKernelInput,
  memory: MemoryRuntimeResult,
): BehavioralRuntimeResult {
  const signals = inferCanonicalSignals({
    ...input,
    recent_messages: memory.compact_history,
    runtime_memory: {
      ...(input.runtime_memory ?? {}),
      ...memory.runtime_memory,
    },
  });
  let qualificationDepth = 0;
  if (input.lead?.name) qualificationDepth += 1;
  if (input.deal?.location_preference || signals.beach_interest) qualificationDepth += 1;
  if (input.deal?.property_type) qualificationDepth += 1;
  if (input.deal?.budget_min || input.deal?.budget_max) qualificationDepth += 2;
  if (input.deal?.bedrooms) qualificationDepth += 1;
  if (input.deal?.timeline) qualificationDepth += 1;
  if (signals.financing_signal || signals.fgts_signal) qualificationDepth += 1;

  const operational_context = {
    ...(input.operational_context ?? {}),
    tenant_id: input.tenant_id ?? input.lead?.tenant_id ?? null,
    conversation_id: input.conversation?.id ?? null,
    lead_id: input.lead?.id ?? null,
    funnel_stage: input.operational_context?.funnel_stage ?? undefined,
    decision_style: signals.spouse_decision_signal ? "casal" : input.operational_context?.decision_style ?? "desconhecido",
    objective: input.operational_context?.objective ?? input.deal?.intent ?? input.lead?.ai_last_intent ?? null,
    preferred_regions: input.operational_context?.preferred_regions?.length
      ? input.operational_context.preferred_regions
      : [input.deal?.location_preference, signals.beach_interest ? "praia" : null].filter(Boolean) as string[],
    property_type: input.operational_context?.property_type ?? input.deal?.property_type ?? null,
    bedrooms: input.operational_context?.bedrooms ?? input.deal?.bedrooms ?? null,
    budget_min: input.operational_context?.budget_min ?? input.deal?.budget_min ?? null,
    budget_max: input.operational_context?.budget_max ?? input.deal?.budget_max ?? null,
    beach_interest: signals.beach_interest,
    financing_signal: signals.financing_signal,
    fgts_signal: signals.fgts_signal,
    credit_letter_signal: signals.credit_letter_signal,
    followup_enabled: signals.followup_signal,
    property_presentation_due: signals.property_revalidation_required || (signals.property_intent && signals.useful_context),
  };

  const runtime_memory = {
    ...memory.runtime_memory,
    qualification_depth: qualificationDepth,
    inventory_fatigue: signals.inventory_fatigue,
    properties_sent_count: signals.properties_sent_count,
    spouse_decision_signal: signals.spouse_decision_signal,
    revisit_inventory_signal: signals.revisit_inventory_signal,
    favorite_signal: signals.favorite_signal,
    visit_intent_signal: signals.visit_intent_signal,
    handoff_signal: signals.handoff_signal,
    property_intent_signal: signals.property_intent,
    property_presentation_due: signals.property_revalidation_required || (signals.property_intent && signals.useful_context),
  };

  const decision = buildCanonicalKernelDecision({
    ...input,
    recent_messages: memory.compact_history,
    operational_context,
    runtime_memory,
  });

  return {
    decision,
    operational_context: {
      ...operational_context,
      funnel_stage: decision.runtime_state,
    },
    runtime_memory: {
      ...runtime_memory,
      next_best_action: decision.next_best_action,
    },
    violations: assertCanonicalKernelDecision(decision),
  };
}
