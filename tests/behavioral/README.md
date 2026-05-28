# Ju Runtime Behavioral Simulations

Esta suite valida comportamento consultivo do runtime sem Evolution API, WhatsApp real, webhook externo ou chamadas de infraestrutura.

Ela mede:

- pacing
- contextualizacao
- question budget
- consultative framing
- presentation timing
- regressao para SDR
- continuidade contextual
- behavioral contracts

Rodar localmente:

```bash
npm test -- tests/behavioral/ju-runtime-behavioral-simulations.test.ts
```

Cada simulacao imprime:

- `current_stage`
- `question_count`
- `presentation_due`
- `contextualization_detected`
- `violations`
- `behavioral_contract_applied`
