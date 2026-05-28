# Ju Behavioral E2E Audit Report

- Run ID: ju-live-2026-05-24T01-47-59-354Z-5ub21y
- Test run ID: ju-live-2026-05-24T01-47-59-354Z-5ub21y
- Tenant ID: 82cc7aa9-fc6e-4f37-8d8e-8a71c1691361
- Endpoint: https://api.yzihub.com/webhook/ju
- Mode: live API plus real database validation
- Started: 2026-05-24T01:47:59.380Z
- Finished: 2026-05-24T01:48:31.948Z
- Scenarios: 1
- Turns: 3
- Passing scenarios: 0/1
- Average behavioral score: 90

## Scenario Results

### Lead Site

- Score: 90
- Pass: no
- Persona: Comprador direto do site, ja navegou por imoveis e quer orientacao sem recomecar qualificacao.
- Emotional context: Curioso, com interesse real, mas ainda comparando regioes.
- Source channel: site
- Critical violations: 1
- Warning violations: 3

Turns:
- Turn 1: HTTP 200, score 94, latency 3668ms, messages 2, audits 1
- Turn 2: HTTP 200, score 94, latency 4137ms, messages 2, audits 1
- Turn 3: HTTP 200, score 82, latency 4094ms, messages 4, audits 1

## Critical Violations

- Lead Site turn 3: missing_direct_property_presentation_signal
