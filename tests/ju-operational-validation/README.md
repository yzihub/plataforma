# Ju Operational Validation

Suite institucional para validar a Ju ponta a ponta sem criar novo runtime.

Foco:

- tool calling
- retrieval governance
- URL integrity
- card preview
- Redis continuity
- vector retrieval
- contextual memory
- anti-hallucination
- follow-up behavior
- UX WhatsApp
- cost/token metrics

Esta pasta valida contratos operacionais do hot-path leve. Ela nao deve virar state engine, replay layer ou cognition layer.

## Como rodar

```bash
npx vitest run tests/ju-operational-validation/scenarios/operational-validation.test.ts
```

