import {
  renderCanonicalContextContract,
  type CanonicalKernelInput,
} from "@/lib/ju-runtime/cognitive-kernel-contracts";
import type { BehavioralRuntimeResult, MemoryRuntimeResult, RenderedContext, RuntimeHardLimits } from "./types";

const REQUIRED_BLOCKS = [
  "yzi_operational_runtime",
  "estado_operacional",
  "funnel_runtime",
  "preferencias_cliente",
  "governanca_comportamental",
  "historico_curto",
  "mensagem_atual",
  "tool_revalidation",
] as const;

export function renderOfficialContext(
  input: CanonicalKernelInput,
  memory: MemoryRuntimeResult,
  behavioral: BehavioralRuntimeResult,
  limits?: Partial<RuntimeHardLimits>,
): RenderedContext {
  const rawContext = renderCanonicalContextContract(
    {
      ...input,
      recent_messages: memory.compact_history,
      operational_context: behavioral.operational_context,
      runtime_memory: behavioral.runtime_memory,
    },
    behavioral.decision,
  );
  const maxContextChars = limits?.max_context_chars ?? 24000;
  const context = rawContext.length > maxContextChars
    ? `${rawContext.slice(0, Math.max(0, maxContextChars - 41))}\n<context_truncated>true</context_truncated>`
    : rawContext;
  const requiredBlocksPresent = REQUIRED_BLOCKS.every((block) => context.includes(`<${block}>`) && context.includes(`</${block}>`));
  return {
    context,
    context_chars: context.length,
    required_blocks_present: requiredBlocksPresent,
  };
}
