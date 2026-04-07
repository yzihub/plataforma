---
phase: quick
plan: 260407-eyq
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/leads/[id]/route.ts
  - src/components/yzihub/LeadsKanban.tsx
  - src/components/yzihub/LeadsClient.tsx
  - src/app/cockpit/leads/page.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Leads aparecem no Kanban agrupados por stage do pipeline_stages do Supabase (nao hardcoded)"
    - "Drag and drop move um lead card de uma coluna para outra"
    - "Ao soltar o card, stage_id e last_action_at sao persistidos no Supabase via API"
    - "Toggle Table/Kanban continua funcionando em /cockpit/leads"
    - "Dados sao filtrados por tenant_id do usuario autenticado"
  artifacts:
    - path: "src/app/api/leads/[id]/route.ts"
      provides: "PATCH endpoint para atualizar stage_id e last_action_at de um lead"
    - path: "src/components/yzihub/LeadsKanban.tsx"
      provides: "Kanban board com drag-and-drop real e persistencia Supabase"
    - path: "src/app/cockpit/leads/page.tsx"
      provides: "Server component que busca leads E pipeline_stages do Supabase"
  key_links:
    - from: "src/components/yzihub/LeadsKanban.tsx"
      to: "/api/leads/[id]"
      via: "fetch PATCH on drop"
      pattern: "fetch.*api/leads"
    - from: "src/app/cockpit/leads/page.tsx"
      to: "supabase.from('pipeline_stages')"
      via: "server-side query"
      pattern: "from.*pipeline_stages"
---

<objective>
Corrigir o Kanban de Leads em /cockpit/leads para funcionar com dados reais do Supabase, incluindo drag-and-drop com persistencia real (stage_id + last_action_at) e colunas vindas da tabela pipeline_stages (nao hardcoded).

Purpose: O Kanban atual usa stages hardcoded e so atualiza estado local. Precisa ser funcional com persistencia real para o CRM operar.
Output: Kanban DnD funcional com API PATCH e dados reais do Supabase.
</objective>

<execution_context>
@.planning/quick/260407-eyq-corrigir-e-ativar-kanban-de-leads-com-pe/260407-eyq-PLAN.md
</execution_context>

<context>
@CLAUDE.md
@src/lib/crm/types.ts
@src/lib/crm/queries.ts
@src/lib/supabase/client.ts
@src/lib/supabase/server.ts
@src/components/yzihub/LeadsClient.tsx
@src/components/yzihub/LeadsKanban.tsx
@src/app/cockpit/leads/page.tsx
@src/components/yzihub/PipelineClient.tsx (referencia de DnD funcional)

<interfaces>
<!-- Tipos existentes que o executor deve usar -->

From src/lib/crm/types.ts:
```typescript
export interface PipelineStage {
  id: string
  tenant_id: string
  name: string
  color: string
  position: number
  is_won: boolean
  is_lost: boolean
}

export interface Lead {
  id: string
  tenant_id: string
  stage_id: string | null
  name: string
  email: string | null
  phone: string | null
  company: string | null
  source: string | null
  status: LeadStatus
  score: number
  value: number
  notes: string | null
  assigned_to: string | null
  last_action_at: string | null
  created_at: string
}

export interface KanbanData {
  tenant: Tenant
  stages: PipelineStage[]
  leads: Lead[]
}
```

From src/lib/crm/queries.ts:
```typescript
export async function getCockpitData(): Promise<KanbanData | null>
// Already fetches tenant, pipeline_stages, and leads by tenant_id
```

From src/lib/supabase/client.ts:
```typescript
export function createClient() // Browser Supabase client
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Criar API PATCH /api/leads/[id] e atualizar server page para buscar stages</name>
  <files>src/app/api/leads/[id]/route.ts, src/app/cockpit/leads/page.tsx</files>
  <action>
1. Criar `src/app/api/leads/[id]/route.ts` com handler PATCH:
   - Importar `createClient` de `@/lib/supabase/server`
   - Autenticar usuario via `supabase.auth.getUser()`; retornar 401 se nao autenticado
   - Buscar `profile.tenant_id` do usuario
   - Ler body JSON: `{ stage_id: string }`
   - Validar que o lead pertence ao tenant do usuario (query `leads` where id=param AND tenant_id=profile.tenant_id)
   - Se lead nao encontrado ou nao pertence ao tenant, retornar 403
   - Executar update: `supabase.from("leads").update({ stage_id, last_action_at: new Date().toISOString() }).eq("id", leadId).eq("tenant_id", tenantId)`
   - Retornar 200 com o lead atualizado
   - Em caso de erro, retornar 500

2. Atualizar `src/app/cockpit/leads/page.tsx`:
   - Usar `getCockpitData()` de `@/lib/crm/queries` (ja busca tenant, stages e leads em paralelo)
   - Se retornar null, usar fallback com mock data e stages hardcoded (para dev local)
   - Passar `stages` como prop para LeadsClient: `<LeadsClient initialLeads={leads} stages={stages} />`
   - Manter fallback para mock data quando Supabase nao configurado
  </action>
  <verify>
    <automated>npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>API PATCH /api/leads/[id] criada com autenticacao tenant-scoped. Page busca pipeline_stages e passa para LeadsClient.</done>
</task>

<task type="auto">
  <name>Task 2: Implementar drag-and-drop real no LeadsKanban com persistencia Supabase</name>
  <files>src/components/yzihub/LeadsKanban.tsx, src/components/yzihub/LeadsClient.tsx</files>
  <action>
1. Atualizar `LeadsClient.tsx`:
   - Adicionar prop `stages: PipelineStage[]` (importar de `@/lib/crm/types`)
   - Passar `stages` para `<LeadsKanban leads={filteredLeads} stages={stages} />`
   - Manter `leads` como estado local (useState) em vez de `initialLeads` direto, para que o Kanban possa atualizar otimisticamente
   - Passar callback `onMoveLead` para LeadsKanban que atualiza o estado local

2. Reescrever `LeadsKanban.tsx` com drag-and-drop HTML5 real e persistencia:
   - Receber props: `leads: Lead[]`, `stages: PipelineStage[]`, `onMoveLead: (leadId: string, newStageId: string) => void`
   - Agrupar leads por `stage_id` (nao por `status`)
   - Ordenar stages por `position`
   - Implementar DnD usando o padrao do PipelineClient.tsx como referencia:
     * `dragLeadId` via useRef
     * `dragOverStageId` via useState para highlight visual
     * `onDragStart`: setar dragLeadId, effectAllowed = "move"
     * `onDragOver`: preventDefault, dropEffect = "move", setar dragOverStageId
     * `onDrop`: chamar onMoveLead(leadId, stageId), depois persistir via fetch PATCH
     * `onDragEnd`: limpar estados
   - Persistencia no onDrop:
     ```typescript
     fetch(`/api/leads/${leadId}`, {
       method: "PATCH",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ stage_id: targetStageId }),
     })
     ```
   - Atualizar otimisticamente ANTES do fetch (ja feito via onMoveLead callback)
   - Em caso de erro no fetch, reverter o estado (revert optimistic update) e mostrar console.error
   - Visual: manter estilo TailAdmin dark existente (border-gray-700, bg-gray-800, etc)
   - Highlight de coluna ao arrastar (border-brand-400 como no PipelineClient)
   - Manter o botao "Mover" como alternativa ao DnD (acessibilidade)
   - Adicionar `draggable` e classes `cursor-grab active:cursor-grabbing` nos cards
   - Coluna vazia mostra "Arraste um card aqui" (como no PipelineClient)
   - NAO usar framer-motion para o DnD basico (HTML5 DnD e suficiente e mais leve); framer-motion pode ser usado apenas para animacoes sutis de transicao se ja estiver importado

3. No LeadsClient, o callback `onMoveLead` deve:
   - Atualizar `leads` state: `setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage_id: newStageId, last_action_at: new Date().toISOString() } : l))`
  </action>
  <verify>
    <automated>npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Kanban renderiza colunas a partir de pipeline_stages reais. Drag-and-drop funciona entre colunas. Ao soltar, stage_id e last_action_at sao persistidos no Supabase via PATCH /api/leads/[id]. Toggle table/kanban continua funcionando. Modulo de imoveis nao foi alterado.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` — sem erros de tipo
2. `npm run build` — build completa sem erros
3. Navegar para /cockpit/leads, alternar entre Table e Kanban
4. No Kanban, arrastar um card de uma coluna para outra
5. Verificar no Supabase que stage_id e last_action_at foram atualizados
6. Recarregar a pagina e confirmar que o lead permanece na nova coluna
</verification>

<success_criteria>
- Kanban de leads usa colunas vindas de pipeline_stages do Supabase (nao hardcoded)
- Drag-and-drop move leads entre colunas com persistencia real
- Toggle Table/Kanban funciona em /cockpit/leads
- Dados filtrados por tenant_id
- Modulo de imoveis (KanbanBoard.tsx, PipelineClient.tsx) nao foi alterado
- Build passa sem erros
</success_criteria>

<output>
After completion, create `.planning/quick/260407-eyq-corrigir-e-ativar-kanban-de-leads-com-pe/260407-eyq-SUMMARY.md`
</output>
