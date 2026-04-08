---
phase: quick
plan: 260408-jth
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/imoveis/route.ts
  - src/types/n8n-payloads.ts
autonomous: true
requirements: [QUICK-enriquecer-query-imoveis-luana]

must_haves:
  truths:
    - "GET /api/imoveis retorna campos estruturados do imovel: titulo_comercial, bairro, valor, quartos, suites, vagas, metragem, descricao_imovel, foto_principal"
    - "Campos numericos nulos (suites, vagas) retornam 0 como fallback"
    - "Query filtra por tenant_id obrigatorio (multi-tenant)"
  artifacts:
    - path: "src/app/api/imoveis/route.ts"
      provides: "Query enriquecida na tabela imoveis com 9+ campos estruturados"
    - path: "src/types/n8n-payloads.ts"
      provides: "N8nImovel interface com campos estruturados + mapper toN8nImovel"
  key_links:
    - from: "src/app/api/imoveis/route.ts"
      to: "src/types/n8n-payloads.ts"
      via: "import toN8nImovel, buildN8nEnvelope"
      pattern: "toN8nImovel"
---

<objective>
Enriquecer a query de imoveis da API para que o agente Luana receba campos estruturados (titulo_comercial, bairro, valor, quartos, suites, vagas, metragem, descricao_imovel, foto_principal) em vez dos campos genericos atuais (title, price, location, area_sqm).

Purpose: A Luana precisa de dados estruturados para responder perguntas sobre imoveis com precisao (ex: "tem apartamento de 3 quartos no Meireles?") sem depender de texto livre da descricao.

Output: API route enriquecida + tipo N8nImovel com mapper e fallbacks seguros.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@src/app/api/imoveis/route.ts
@src/types/n8n-payloads.ts
@src/components/yzihub/ImoveisClient.tsx (reference — shows imoveis table fields)

<interfaces>
<!-- A API route atualmente busca da tabela `properties` com campos genericos.
     A tabela real dos imoveis da Jurema e `imoveis` com estes campos: -->

Tabela `imoveis` (usada pelo n8n e ImoveisClient.tsx):
- id, tenant_id
- titulo_comercial (TEXT) — nome comercial do imovel
- bairro (TEXT) — bairro/localizacao
- valor (NUMERIC) — preco
- quartos (INTEGER) — numero de quartos
- suites (INTEGER, nullable) — numero de suites
- vagas (INTEGER, nullable) — vagas de garagem
- metragem (NUMERIC) — area em m2
- descricao_imovel (TEXT) — descricao completa
- foto_principal (TEXT) — URL da foto principal
- tipo_de_imovel (TEXT) — Apartamento, Casa, etc.
- finalidade (TEXT) — Venda, Aluguel
- link_do_imovel (TEXT) — link externo
- status_publicacao (TEXT) — 'Publicado', 'Rascunho', etc.
- created_at, updated_at

A tabela `properties` (migrations 008-010) e uma tabela diferente usada pelo modulo generico.
Para Jurema Brokers, a tabela correta e `imoveis`.

Tenant Jurema Brokers: 82cc7aa9-fc6e-4f37-8d8e-8a71c1691361

De src/types/n8n-payloads.ts:
```typescript
export interface N8nProperty {
  id: string;
  tenant_id: string;
  title: string;
  price: number;
  location: string;
  area_sqm: number | null;
  status: string;
  link: string | null;
  created_at: string;
  updated_at: string;
}

export function toN8nProperty(row: any): N8nProperty { ... }
export function buildN8nEnvelope<T>(entity: string, tenantId: string, data: T[]): N8nEnvelope<T>
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Criar interface N8nImovel e mapper toN8nImovel com fallbacks</name>
  <files>src/types/n8n-payloads.ts</files>
  <action>
Adicionar ao arquivo `src/types/n8n-payloads.ts` (sem remover N8nProperty existente — manter retrocompatibilidade):

1. Nova interface `N8nImovel` com os campos estruturados:
   - id: string
   - tenant_id: string
   - titulo_comercial: string
   - bairro: string | null
   - valor: number
   - quartos: number
   - suites: number (fallback 0 se null)
   - vagas: number (fallback 0 se null)
   - metragem: number | null
   - descricao_imovel: string | null
   - foto_principal: string | null
   - tipo_de_imovel: string | null
   - finalidade: string | null
   - link_do_imovel: string | null
   - status_publicacao: string
   - created_at: string
   - updated_at: string

2. Novo mapper `toN8nImovel(row: any): N8nImovel` com:
   - `suites: row.suites ?? 0` (fallback seguro)
   - `vagas: row.vagas ?? 0` (fallback seguro)
   - `valor: row.valor ?? 0`
   - `quartos: row.quartos ?? 0`
   - `metragem: row.metragem ?? null`
   - Demais campos com ?? null ou valor default adequado

NAO alterar N8nProperty nem toN8nProperty (usados por outros fluxos).
  </action>
  <verify>
    <automated>npx tsc --noEmit --project D:/dev/plataforma/tsconfig.json 2>&1 | head -20</automated>
  </verify>
  <done>Interface N8nImovel exportada, mapper toN8nImovel exportado, fallbacks para suites/vagas/quartos = 0, TypeScript compila sem erros</done>
</task>

<task type="auto">
  <name>Task 2: Atualizar API route para buscar da tabela imoveis com campos estruturados</name>
  <files>src/app/api/imoveis/route.ts</files>
  <action>
Reescrever a query GET em `src/app/api/imoveis/route.ts`:

1. Mudar `.from("properties")` para `.from("imoveis")`

2. Mudar o `.select(...)` para incluir todos os campos necessarios:
   `"id, tenant_id, titulo_comercial, bairro, valor, quartos, suites, vagas, metragem, descricao_imovel, foto_principal, tipo_de_imovel, finalidade, link_do_imovel, status_publicacao, created_at, updated_at"`

3. Manter o filtro `.eq("tenant_id", tenantId)` (multi-tenant obrigatorio)

4. Adicionar filtro `.eq("status_publicacao", "Publicado")` para retornar apenas imoveis publicados

5. Mudar o mapper de `toN8nProperty` para `toN8nImovel` (importar de @/types/n8n-payloads)

6. Atualizar o import no topo: adicionar `toN8nImovel` ao import de `@/types/n8n-payloads`

7. Manter o envelope: `buildN8nEnvelope("imoveis", tenantId, ...)`

8. Manter toda a logica de auth (getUser, profile, tenant_id) e error handling existente inalterada.

NAO mudar a rota POST se existir. NAO alterar estrutura de autenticacao.
  </action>
  <verify>
    <automated>npx tsc --noEmit --project D:/dev/plataforma/tsconfig.json 2>&1 | head -20</automated>
  </verify>
  <done>API GET /api/imoveis busca da tabela `imoveis`, retorna 17 campos estruturados incluindo titulo_comercial/bairro/quartos/suites/vagas/metragem/descricao_imovel/foto_principal, filtra por tenant_id e status_publicacao=Publicado, TypeScript compila</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` compila sem erros
2. Interface N8nImovel exportada com campos: titulo_comercial, bairro, valor, quartos, suites, vagas, metragem, descricao_imovel, foto_principal
3. Mapper toN8nImovel aplica fallback 0 para suites e vagas nulos
4. Route query usa tabela `imoveis` (nao `properties`)
5. Route filtra por tenant_id e status_publicacao = "Publicado"
6. N8nProperty e toN8nProperty continuam existindo (retrocompatibilidade)
</verification>

<success_criteria>
- GET /api/imoveis retorna payload N8nEnvelope com campos estruturados da tabela `imoveis`
- Campos quartos, suites, vagas nunca retornam null (fallback 0)
- Multi-tenant preservado (tenant_id obrigatorio)
- Nenhuma alteracao em tabela, personalidade do agente ou arquitetura
</success_criteria>

<output>
After completion, create `.planning/quick/260408-jth-enriquecer-query-de-imoveis-para-uso-do-/260408-jth-SUMMARY.md`
</output>
