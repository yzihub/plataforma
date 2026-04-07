---
phase: quick
plan: 260407-eau
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/yzihub/ImoveisClient.tsx
  - src/components/yzihub/LeadsKanban.tsx
  - src/app/cockpit/tasks/page.tsx
  - src/app/cockpit/chat/page.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Página /cockpit/imoveis carrega sem runtime error e exibe catálogo ou estado vazio limpo"
    - "Kanban de Leads exibe todos os leads em colunas cobrindo todos os LeadStatus possíveis"
    - "Rotas /cockpit/tasks e /cockpit/chat retornam 200 com UI funcional, sem 404"
  artifacts:
    - path: "src/components/yzihub/ImoveisClient.tsx"
      provides: "Supabase client instanciado dentro do useEffect, sem chamada no nível de render"
    - path: "src/components/yzihub/LeadsKanban.tsx"
      provides: "STAGES cobrindo todos os 8 LeadStatus do type LeadStatus em src/lib/crm/types.ts"
    - path: "src/app/cockpit/tasks/page.tsx"
      provides: "Página de tarefas funcional com lista vazia e header real"
    - path: "src/app/cockpit/chat/page.tsx"
      provides: "Página de chat funcional com thread UI vazia e header real"
  key_links:
    - from: "ImoveisClient.tsx"
      to: "supabase.from('properties')"
      via: "createClient() dentro do useEffect, não no render"
    - from: "LeadsKanban.tsx STAGES"
      to: "LeadStatus type"
      via: "status fields: new | contacted | qualified | meeting | proposal | negotiation | won | lost"
---

<objective>
Corrigir três erros críticos que bloqueiam a navegação no YZI Cockpit:
1. Runtime error na página Imóveis causado por createClient() chamado no nível de render do componente.
2. Kanban de Leads exibindo colunas vazias porque os STAGES cobrem apenas 4 dos 8 LeadStatus possíveis.
3. Rotas /cockpit/tasks e /cockpit/chat retornando 404 por ausência de page.tsx.

Purpose: Garantir que todas as rotas listadas no sidebar funcionem e que as views de dados mostrem informação real.
Output: ImoveisClient corrigido, LeadsKanban com todos os stages, páginas Tasks e Chat funcionais.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

<!-- Key types the executor needs — extracted from codebase -->
<interfaces>
From src/lib/crm/types.ts:
```typescript
export type LeadStatus =
  | 'new'         // Novo Lead
  | 'contacted'   // Contato
  | 'qualified'   // Agendado
  | 'meeting'     // Reunião
  | 'proposal'    // Proposta
  | 'negotiation' // Contrato / Negociação
  | 'won'         // Fechado
  | 'lost'        // Perdido
```

From src/context/TenantContext.tsx:
```typescript
export type TenantData = {
  id: string;
  name: string;
  plan: TenantPlan;
  activeModules: ActiveModule[];
  settings: Record<string, unknown>;
};
// useTenant() returns: { tenant: TenantData | null, loading: boolean, ... }
```

From src/types/properties.ts:
```typescript
export interface Property { id: string; tenant_id: string; /* ... */ }
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Corrigir ImoveisClient — mover createClient para dentro do useEffect</name>
  <files>src/components/yzihub/ImoveisClient.tsx</files>
  <action>
Em ImoveisClient.tsx, o `const supabase = createClient();` está na linha 38 do corpo do componente — criado a cada render. Isso causa instabilidade e potencial runtime error quando o componente é montado antes do contexto estar pronto.

Remover a linha `const supabase = createClient();` do corpo do componente.
Dentro da função `fetchProperties()` (dentro do useEffect), criar uma variável local: `const supabase = createClient();` antes da chamada `.from("properties")`.

O useEffect deve ficar assim:
```typescript
useEffect(() => {
  if (tenantLoading) return;
  if (!tenant?.id) {
    setLoading(false);
    return;
  }

  let cancelled = false;

  async function fetchProperties() {
    setLoading(true);
    const supabase = createClient(); // instanciado aqui, não no render
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("tenant_id", tenant!.id)
      .order("created_at", { ascending: false });

    if (cancelled) return;
    if (!error && data) {
      setProperties(data as Property[]);
    }
    setLoading(false);
  }

  fetchProperties();
  return () => { cancelled = true; };
}, [tenant?.id, tenantLoading]);
```

Manter todos os outros imports e JSX exatamente iguais. Não alterar nenhuma outra linha.
  </action>
  <verify>
    <automated>cd D:/dev/plataforma && npx tsc --noEmit 2>&1 | grep -v "validate-auth-system" | grep "ImoveisClient" || echo "NO_ERRORS_IN_ImoveisClient"</automated>
  </verify>
  <done>ImoveisClient.tsx não possui createClient() no corpo do componente. A chamada existe apenas dentro de fetchProperties(). TSC não reporta erros no arquivo.</done>
</task>

<task type="auto">
  <name>Task 2: Corrigir LeadsKanban — cobrir todos os 8 LeadStatus</name>
  <files>src/components/yzihub/LeadsKanban.tsx</files>
  <action>
O array STAGES em LeadsKanban.tsx cobre apenas 4 status: `new`, `qualified`, `meeting`, `negotiation`. Os demais status (`contacted`, `proposal`, `won`, `lost`) existem nos dados mas não têm coluna — os leads somem da view.

Substituir o array STAGES completo pelo seguinte (8 colunas, cobrindo todos os LeadStatus):

```typescript
const STAGES: { id: string; label: string; status: LeadStatus; color: string }[] = [
  { id: "novo",        label: "Novo",        status: "new",         color: "#3B82F6" },
  { id: "contato",     label: "Contato",     status: "contacted",   color: "#64748B" },
  { id: "qualificado", label: "Qualificado", status: "qualified",   color: "#F59E0B" },
  { id: "reuniao",     label: "Reunião",     status: "meeting",     color: "#8B5CF6" },
  { id: "proposta",    label: "Proposta",    status: "proposal",    color: "#F97316" },
  { id: "contrato",    label: "Contrato",    status: "negotiation", color: "#10B981" },
  { id: "fechado",     label: "Fechado",     status: "won",         color: "#22C55E" },
  { id: "perdido",     label: "Perdido",     status: "lost",        color: "#EF4444" },
];
```

Não alterar nenhuma outra parte do arquivo. O componente LeadCard, MoveMenu e a lógica de handleMove permanecem iguais.
  </action>
  <verify>
    <automated>cd D:/dev/plataforma && npx tsc --noEmit 2>&1 | grep -v "validate-auth-system" | grep "LeadsKanban" || echo "NO_ERRORS_IN_LeadsKanban"</automated>
  </verify>
  <done>LeadsKanban.tsx tem 8 entradas no STAGES cobrindo todos os valores de LeadStatus. Nenhum lead desaparece do Kanban por status não mapeado.</done>
</task>

<task type="auto">
  <name>Task 3: Criar páginas /cockpit/tasks e /cockpit/chat</name>
  <files>src/app/cockpit/tasks/page.tsx, src/app/cockpit/chat/page.tsx</files>
  <action>
Criar dois arquivos de página. Seguir o padrão visual TailAdmin dark já usado nas outras páginas do cockpit. Nenhum placeholder — UI mínima mas funcional e coesa.

**src/app/cockpit/tasks/page.tsx:**
Página de Tarefas com header (título + descrição), botão "Nova Tarefa" (não funcional ainda — sem handler), e estado vazio elegante indicando que não há tarefas cadastradas. Usar Server Component (sem "use client"). Estrutura:
- `<h1>Tarefas</h1>` com subtítulo "Organize as atividades do seu time"
- Área central com ícone de clipboard SVG inline, texto "Nenhuma tarefa cadastrada ainda." e texto secundário "Crie sua primeira tarefa para começar."
- Botão "+ Nova Tarefa" no header (tipo button, sem onClick por enquanto)

**src/app/cockpit/chat/page.tsx:**
Página de Chat com layout de thread. Usar Server Component. Estrutura:
- Header com `<h1>Chat</h1>` e subtítulo "Conversas com o time e agentes IA"
- Área de mensagens vazia com ícone de mensagem SVG inline e texto "Nenhuma mensagem ainda. Inicie uma conversa."
- Barra de input na parte inferior: `<input type="text" placeholder="Digite uma mensagem..." disabled />` com botão "Enviar" desabilitado
- Usar classes Tailwind consistentes com o padrão dark do cockpit: `bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl`

Ambas as páginas devem exportar uma função React padrão (default export) sem "use client".
  </action>
  <verify>
    <automated>cd D:/dev/plataforma && npx tsc --noEmit 2>&1 | grep -v "validate-auth-system" | grep -E "tasks/page|chat/page" || echo "NO_ERRORS_IN_NEW_PAGES"</automated>
  </verify>
  <done>Arquivos existem em src/app/cockpit/tasks/page.tsx e src/app/cockpit/chat/page.tsx. Rotas /cockpit/tasks e /cockpit/chat retornam 200 com UI coesa. TSC não reporta erros nesses arquivos.</done>
</task>

</tasks>

<verification>
Após completar as 3 tasks:
1. `npx tsc --noEmit` não reporta erros nos arquivos modificados (ignorar erros em validate-auth-system.ts que são pré-existentes e fora do escopo)
2. `ls src/app/cockpit/tasks/page.tsx src/app/cockpit/chat/page.tsx` — ambos existem
3. `grep -n "createClient" src/components/yzihub/ImoveisClient.tsx` — createClient aparece APENAS dentro da função fetchProperties, não no corpo do componente
4. `grep -c "status:" src/components/yzihub/LeadsKanban.tsx` — deve retornar 8 (um por LeadStatus)
</verification>

<success_criteria>
- Página /cockpit/imoveis: sem runtime error, carrega estado vazio ou lista de imóveis do tenant
- Página /cockpit/leads (view=kanban): exibe 8 colunas cobrindo todos os status, nenhum lead desaparece
- Página /cockpit/tasks: HTTP 200, UI com header real e empty state limpo
- Página /cockpit/chat: HTTP 200, UI com header real, área de mensagens e input desabilitado
- Zero erros TypeScript nos 4 arquivos modificados/criados
</success_criteria>

<output>
Após conclusão, criar `.planning/quick/260407-eau-corrigir-erros-cr-ticos-do-sistema-yzi-o/260407-eau-SUMMARY.md` com:
- Arquivos modificados e o que foi corrigido em cada um
- Causa raiz de cada bug
- Commit hash
</output>
