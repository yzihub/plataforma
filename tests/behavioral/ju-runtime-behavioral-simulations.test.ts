import { describe, expect, it } from "vitest";
import { initialBehavioralScenarios } from "./scenarios/initial-scenarios";
import { formatBehavioralSimulationLog, runBehavioralSimulation } from "./runtime-simulations/behavioral-simulator";

describe("Ju runtime behavioral simulations", () => {
  it.each(initialBehavioralScenarios)("$name keeps consultative behavior under runtime governance", (scenario) => {
    const result = runBehavioralSimulation(scenario);

    console.info(formatBehavioralSimulationLog(result.log));

    expect(result.decision.behavioral_contract.enforced).toBe(true);
    expect(result.context).toContain("<behavioral_contract>");
    expect(result.failedExpectations).toEqual([]);
  });
});
