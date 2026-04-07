---
phase: quick
plan: 260407-qwm
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/contracts/route.ts
autonomous: true
requirements: []

must_haves:
  truths:
    - "POST /api/contracts retorna envelope N8nEnvelope<N8nContract> (entity, tenant_id, count, fetched_at, data[]) no status 201"
    - "GET /api/leads, GET /api/imoveis, GET /api/contracts já retornam envelope padronizado — nenhuma regressão"
    - "Contrato n8n é uniforme: qualquer endpoint retorna o mesmo shape de envelope"
  artifacts:
    - path: "src/app/api/contracts/route.ts"
      provides: "POST wraps created contract em N8nEnvelope<N8nContract>"
      exports: ["GET", "POST"]
  key_links:
    - from: "src/app/api/contracts/route.ts"
      to: "buildN8nEnvelope + toN8nContract"
      via: "import já existente em @/types/n8n-payloads"
      pattern: "buildN8nEnvelope.*contracts"
---

<objective>
Garantir que o POST /api/contracts retorne o mesmo envelope padronizado N8n que os endpoints GET já usam.

Purpose: Os três GET endpoints (leads, imoveis, contracts) já retornam N8nEnvelope via buildN8nEnvelope + mappers implementados em 260407-l5s. O único gap é o POST /api/contracts que retorna o row cru do Supabase (linha 130 do route.ts). Corrigir isso fecha o contrato de API e garante que o n8n pode consumir qualquer response de contracts — GET ou POST — com o mesmo parser.
Output: POST /api/contracts retorna N8nEnvelope<N8nContract> com status 201. Zero mudança em lógica de negócio ou validações.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

<!-- Contexto atual: src/types/n8n-payloads.ts já exporta:
  buildN8nEnvelope(entity, tenantId, data[]) → N8nEnvelope<T>
  toN8nContract(row) → N8nContract
  N8nContract { id, tenant_id, lead_id, lead_name, project_name, corretor_name,
    title, type, status, value, signed_at, expires_at, created_at, updated_at }

  src/app/api/contracts/route.ts já importa buildN8nEnvelope e toN8nContract.
  GET usa o envelope corretamente.
  POST (linha 130) retorna: NextResponse.json(contract, { status: 201 })
  — precisa trocar para: buildN8nEnvelope("contracts", tenantId, [toN8nContract(contract)])
-->
</context>

<tasks>

<task type="auto">
  <name>Task 1: Padronizar resposta POST /api/contracts com envelope N8n</name>
  <files>src/app/api/contracts/route.ts</files>
  <action>
    Na função POST de src/app/api/contracts/route.ts, localizar a linha de retorno após insert bem-sucedido (atualmente: `return NextResponse.json(contract, { status: 201 })`).

    Substituir por:

    ```typescript
    const payload = buildN8nEnvelope("contracts", tenantId, [toN8nContract(contract)]);
    return NextResponse.json(payload, { status: 201 });
    ```

    Os imports de buildN8nEnvelope e toN8nContract já existem no topo do arquivo — nenhum import adicional necessário.

    NÃO alterar: lógica de validação, campos do insertPayload, lógica de auth, nem o handler GET.
  </action>
  <verify>
    <automated>cd D:/dev/plataforma && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>POST /api/contracts retorna { entity: "contracts", tenant_id, count: 1, fetched_at, data: [N8nContract] } com status 201. TypeScript compila sem erros no arquivo.</done>
</task>

</tasks>

<verification>
Após execução, confirmar:
1. `npx tsc --noEmit` passa sem erros em contracts/route.ts
2. Shape do response POST bate com shape do response GET (mesmo envelope)
3. Nenhuma outra linha do route.ts foi alterada
</verification>

<success_criteria>
- POST /api/contracts retorna N8nEnvelope<N8nContract> com status 201
- GET /api/contracts, GET /api/leads, GET /api/imoveis sem regressão
- Os três endpoints de entidades principais retornam shape idêntico para n8n
</success_criteria>

<output>
Após conclusão, criar `.planning/quick/260407-qwm-padronizar-payload-para-n8n/260407-qwm-SUMMARY.md`
</output>
