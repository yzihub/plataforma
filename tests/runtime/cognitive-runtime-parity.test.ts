import { describe, expect, it } from "vitest";
import {
  assertCanonicalResponseDraft,
  buildCanonicalKernelDecision,
} from "@/lib/ju-runtime/cognitive-kernel-contracts";
import { syncOperationalContext } from "@/runtime/behavioral_engine";
import { renderOfficialContext } from "@/runtime/context_renderer";
import type { MemoryRuntimeResult } from "@/runtime/types";
import { canonicalParityFixtures } from "../ju-cognitive-kernel/canonical-fixtures";

function memoryFor(input: typeof canonicalParityFixtures[keyof typeof canonicalParityFixtures]): MemoryRuntimeResult {
  const recent = input.recent_messages ?? [];
  return {
    recent_messages: recent.slice(-20),
    compact_history: recent.slice(-10),
    summary: "",
    behavioral_memory: {},
    operational_memory: {},
    runtime_memory: input.runtime_memory ?? {},
    persisted: false,
  };
}

describe("cognitive runtime executor parity", () => {
  it.each(Object.keys(canonicalParityFixtures) as Array<keyof typeof canonicalParityFixtures>)(
    "keeps behavioral decision parity for fixture %s",
    (fixtureName) => {
      const input = canonicalParityFixtures[fixtureName];
      const memory = memoryFor(input);
      const runtime = syncOperationalContext(input, memory);
      const canonical = buildCanonicalKernelDecision({
        ...input,
        recent_messages: memory.compact_history,
        operational_context: runtime.operational_context,
        runtime_memory: runtime.runtime_memory,
      });

      expect(runtime.decision.next_best_action).toBe(canonical.next_best_action);
      expect(runtime.decision.property_presentation_due).toBe(canonical.property_presentation_due);
      expect(runtime.decision.required_tools).toEqual(canonical.required_tools);
      expect(runtime.violations).toEqual([]);
    },
  );

  it("renders the official context blocks with bounded replay", () => {
    const input = {
      ...canonicalParityFixtures.lead_quente,
      recent_messages: Array.from({ length: 22 }, (_, index) => ({
        direction: index % 2 ? "inbound" : "outbound",
        sender_type: index % 2 ? "lead" : "agent",
        content: `mensagem ${index}`,
      })),
    };
    const memory = memoryFor(input);
    const behavioral = syncOperationalContext(input, memory);
    const context = renderOfficialContext(input, memory, behavioral);

    expect(context.required_blocks_present).toBe(true);
    expect(context.context).toContain("<yzi_operational_runtime>");
    expect(context.context).toContain("<governanca_comportamental>");
    expect(context.context).toContain("PROPERTY_PRESENTATION_DUE: true");
    expect((context.context.match(/mensagem /g) ?? []).length).toBe(10);
  });

  it("fails response assertions when required consultar_imoveis is skipped", () => {
    const input = canonicalParityFixtures.lead_quente;
    const memory = memoryFor(input);
    const behavioral = syncOperationalContext(input, memory);
    const violations = assertCanonicalResponseDraft(behavioral.decision, {
      text: "Me diz primeiro mais detalhes do que voce procura?",
      tools_called: [],
    });

    expect(behavioral.decision.required_tools).toContain("consultar_imoveis");
    expect(violations.map((violation) => violation.code)).toContain("missing_required_tool");
    expect(violations.map((violation) => violation.code)).toContain("abstract_qualification_loop");
  });
});

