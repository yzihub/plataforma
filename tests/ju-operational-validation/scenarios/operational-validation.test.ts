import { describe, expect, it } from "vitest";
import {
  assertCardPreviewContract,
  assertModelDidNotBuildUrl,
  assertNoHallucinatedPropertyFacts,
  assertNoMarkdownOrBullets,
  assertNoRedundantQuestion,
  assertOperationalMetrics,
  assertRetrievalGovernance,
  assertToolContract,
  assertToolRevalidationPolicy,
  assertUrlIntegrity,
} from "../assertions/operational-contracts";
import {
  hallucinatedPropertyResponse,
  invalidMarkdownResponse,
  invalidReconstructedUrlResponse,
  metricsFixtures,
  propertyCards,
  redundantQuestionResponse,
  redisContinuityFixture,
  retrievalDecisions,
  toolDecisions,
  toolRevalidationScenarios,
  validCardResponse,
} from "../fixtures/operational-fixtures";

describe("Ju operational validation", () => {
  it("preserves exact property URLs returned by consultar_imoveis", () => {
    expect(() => assertUrlIntegrity(validCardResponse, propertyCards)).not.toThrow();
    expect(() => assertModelDidNotBuildUrl(validCardResponse, propertyCards)).not.toThrow();
    expect(() => assertCardPreviewContract(validCardResponse, propertyCards)).not.toThrow();
  });

  it("rejects reconstructed property URLs and invented slugs", () => {
    expect(() => assertUrlIntegrity(invalidReconstructedUrlResponse, propertyCards)).toThrow(
      /URL not returned/,
    );
    expect(() => assertModelDidNotBuildUrl(invalidReconstructedUrlResponse, propertyCards)).toThrow(
      /reconstructed/,
    );
  });

  it("rejects markdown, bullets and list-style WhatsApp responses", () => {
    expect(() => assertNoMarkdownOrBullets(validCardResponse)).not.toThrow();
    expect(() => assertNoMarkdownOrBullets(invalidMarkdownResponse)).toThrow(/markdown\/list/);
  });

  it("rejects redundant questions from resolved Redis continuity", () => {
    expect(redisContinuityFixture.hotMemory.resolvedFields).toContain("tipo_imovel");
    expect(() =>
      assertNoRedundantQuestion(redundantQuestionResponse, redisContinuityFixture.hotMemory.resolvedFields),
    ).toThrow(/tipo_imovel/);
  });

  it("rejects hallucinated property codes, neighborhoods and prices", () => {
    expect(() => assertNoHallucinatedPropertyFacts(validCardResponse, propertyCards)).not.toThrow();
    expect(() => assertNoHallucinatedPropertyFacts(hallucinatedPropertyResponse, propertyCards)).toThrow(
      /Hallucinated property code/,
    );
  });

  it("keeps retrieval off for greetings and transactional property search", () => {
    expect(() =>
      assertRetrievalGovernance(retrievalDecisions.greeting, {
        route: "direct_reply",
        useVector: false,
      }),
    ).not.toThrow();

    expect(() =>
      assertRetrievalGovernance(retrievalDecisions.propertySearch, {
        route: "tool",
        useVector: false,
      }),
    ).not.toThrow();
  });

  it("allows vector retrieval only for contextual consultative questions", () => {
    expect(() =>
      assertRetrievalGovernance(retrievalDecisions.neighborhoodQuestion, {
        route: "retrieve",
        useVector: true,
      }),
    ).not.toThrow();
  });

  it("enforces minimal tool calling contracts", () => {
    expect(() => assertToolContract(toolDecisions.directReply, null)).not.toThrow();
    expect(() => assertToolContract(toolDecisions.propertySearch, "consultar_imoveis")).not.toThrow();
    expect(() => assertToolContract(toolDecisions.handoff, "setar_lead_quente")).not.toThrow();
  });

  it.each(toolRevalidationScenarios)(
    "requires consultar_imoveis revalidation when customer says: $label",
    (scenario) => {
      expect(() => assertToolRevalidationPolicy(scenario, propertyCards)).not.toThrow();
    },
  );

  it("keeps turn metrics within lightweight hot-path budgets", () => {
    expect(() => assertOperationalMetrics(metricsFixtures.simpleTurn)).not.toThrow();
    expect(() => assertOperationalMetrics(metricsFixtures.propertySearchTurn)).not.toThrow();
  });
});
