# Ju Behavioral E2E Curl Audit Suite

This suite validates Ju as a cognitive real estate assistant through real webhook behavior and real Supabase persistence.

It is not a simple API smoke test. It audits conversational quality, consultative behavior, memory continuity, semantic consistency, operational correctness, property presentation, tool orchestration, and regression risk.

The live execution boundary is:

```bash
https://api.yzihub.com/webhook/ju
```

No Evolution client, WhatsApp provider SDK, browser automation, fixtures, mocks, static response payloads, old snapshots, or local-only validations are valid for audit runs. The Node runner only orchestrates execution and scoring; every audit turn is submitted by spawning `curl` against the real webhook, then polling Supabase until the required rows exist.

## Architecture

```text
tests/ju-behavioral-e2e/
  scenarios/
    ju-behavioral-scenarios.js      # 15 full multi-turn behavioral simulations
  lib/
    payload-builder.js              # n8n-compatible synthetic inbound payloads
    behavioral-engine.js            # violations, positives, scores, URL checks
  curl/
    ju-behavioral-collection.sh     # generated curl collection
  reports/
    <run-id>/report.md              # human audit report
    <run-id>/summary.json           # machine summary
    <run-id>/<scenario>/turn_XX.json
    <run-id>/<scenario>/payload_turn_XX.json
  baselines/
    latest-summary.json             # optional regression baseline
  sql/
    ju_behavioral_audit_schema.sql  # required audit persistence schema
```

## Live Audit Contract

An audit is valid only when all of these conditions are true:

- POSTs are sent to `https://api.yzihub.com/webhook/ju`.
- A unique `test_run_id` is created for the execution.
- `JU_BEHAVIORAL_QA_TENANT_ID` or `--tenant-id` points to an isolated QA tenant.
- n8n has completed processing.
- Real Supabase persistence is confirmed in `leads`, `conversations`, `messages`/`conversation_messages`, `lead_operational_context`, and `ai_conversation_audits`.
- The audit run, turns, payloads, final Ju responses, tool calls, scores, violations, and generated context are written to the `ju_behavioral_audit_*` tables.

`--dry-run` is disabled for audits. It can only be enabled for non-audit maintenance with `JU_BEHAVIORAL_ALLOW_DRY_RUN_FOR_MAINTENANCE=true`.

## Run Modes

Run the full live suite:

```bash
JU_BEHAVIORAL_QA_TENANT_ID=<qa-tenant-uuid> node scripts/ju-behavioral-e2e-curl.js
```

Run one scenario:

```bash
JU_BEHAVIORAL_QA_TENANT_ID=<qa-tenant-uuid> node scripts/ju-behavioral-e2e-curl.js --scenario high_intent_visit_lead
```

Compare against the last approved baseline:

```bash
node scripts/ju-behavioral-e2e-curl.js --compare-baseline
```

Approve a new baseline after reviewing reports:

```bash
node scripts/ju-behavioral-e2e-curl.js --update-baseline
```

Override endpoint:

```bash
JU_BEHAVIORAL_ENDPOINT=https://api.yzihub.com/webhook/ju node scripts/ju-behavioral-e2e-curl.js
```

## Scenario Coverage

The suite includes:

1. Lead Site
2. Lead Instagram
3. Lead Referral / Indicacao
4. Lead Paid Ad
5. Investor Lead
6. Couple Decision Lead
7. Beach Lifestyle Lead
8. Luxury Lead
9. Cold Lead
10. Re-engagement Lead
11. Financing Concern Lead
12. FGTS Lead
13. Family Lead
14. Short Stay Investor
15. High Intent Visit Lead

Each scenario defines:

- scenario name
- lead persona
- emotional context
- source channel and UTM origin
- initial user message
- expected AI behavior
- anti-patterns to detect
- generated curl commands
- multi-message conversational flow
- validation checklist
- behavioral scoring rubric

## Behavioral Rules

Ju should:

- sound natural and human
- behave consultatively
- avoid robotic wording
- avoid GPT-like structure
- avoid excessive formatting
- avoid bullet dumping
- avoid unnecessary permission asking
- avoid repeating the customer name every message
- contextualize properties
- prioritize emotional alignment
- preserve conversational fluidity

## Critical Anti-Patterns

The scoring engine detects:

- `Posso te mostrar?`
- `Deseja visualizar?`
- `Quer que eu mostre?`
- permission asking instead of direct presentation
- robotic or corporate tone
- GPT-style openings
- markdown and bullet dumps
- catalog-like property dumps
- excessive questions
- excessive emoji usage
- hype language
- financial promises
- internal runtime leaks such as n8n, Supabase, retrieval, prompt, XML, or tool references

## Property Presentation Expectation

When intent is clear, Ju should present directly:

```text
Encontrei uma opcao que ficou bem alinhada com o que voces procuram.
https://juremabksimoveis.com.br/imoveis/...
```

She should not respond with:

```text
Quer que eu mostre?
Posso enviar?
Deseja visualizar?
```

## Tool Validation

The live webhook response may not expose raw internal tool traces. This suite therefore validates tool orchestration through external behavioral evidence:

- property-presentation turns must show direct presentation behavior
- URL lines must be clean and parseable
- Jurema property URLs must not be malformed
- the response must not expose implementation details
- transacional turns such as availability, previous property, and visit intent are marked as tool-required

For deeper audit, persist internal n8n traces into the SQL schema in `sql/ju_behavioral_audit_schema.sql`, including:

- generated context
- retrieval usage
- tool calls
- ranking results
- card payloads
- AI final response
- latency
- memory state

## Scoring

Each turn starts at 100.

Critical examples:

- non-2xx HTTP: -30
- empty response: -30
- permission phrase instead of presentation: -10 to -12
- financial promise: -10
- catalog dump: -10
- malformed URL: -12
- runtime leak: -8

Positive signals can recover small points:

- direct property presentation
- emotional alignment
- consultative tradeoff language
- no-pressure pacing
- contextual property framing

Scenario pass criteria:

- average score at least 82
- no critical violations

## Regression Strategy

Use `--update-baseline` only after manual review.

A regression is flagged when:

- scenario score drops by more than 8 points
- new critical violations appear
- property presentation signal disappears from a high-intent turn
- response latency increases materially
- forbidden permission phrases reappear
- URL behavior becomes malformed
- cold leads become pressured
- investment leads receive financial promises
- re-engagement leads receive false memory

## Recommended CI Usage

Run dry-run generation in normal CI to validate scenario and payload integrity:

```bash
node scripts/ju-behavioral-e2e-curl.js --dry-run
```

Run live curl audits on a scheduled job or protected manual workflow:

```bash
node scripts/ju-behavioral-e2e-curl.js --compare-baseline
```

Keep production live tests outside regular commit CI unless rate limits, data isolation, and audit phone numbers are controlled.
