---
phase: quick-260415-fcb
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/yzihub/PipelineDashboardClient.tsx
  - src/components/yzihub/pipeline/PipelineHeader.tsx
  - src/components/yzihub/pipeline/PipelineAlerts.tsx
  - src/components/yzihub/pipeline/PipelineKPIs.tsx
  - src/components/yzihub/pipeline/PipelineCharts.tsx
  - src/components/yzihub/pipeline/PipelineLeadsList.tsx
  - src/components/yzihub/pipeline/AssignBrokerModal.tsx
  - src/app/cockpit/pipeline/page.tsx
autonomous: true
requirements:
  - QUICK-260415-FCB
must_haves:
  truths:
    - "Página /cockpit/pipeline renderiza 5 blocos visíveis (Header, Alerts, KPIs, Charts, Lista) em vez de kanban"
    - "Header exibe breadcrumb Pipeline, filtros (corretor, período, origem) via Dropdowns e botões de ação"
    - "Alerts operacionais mostram 3 cards: leads sem corretor, leads parados há X dias, leads quentes sem follow-up"
    - "KPIs exibem métricas do pipeline Jurema (Lead/Agendado/Visita/Proposta/Contrato/Fechado) com Badges e Progress Bars"
    - "Área de gráficos mostra 3 visualizações: funil de leads por stage, origem dos leads, performance por corretor"
    - "Lista operacional renderiza leads com Avatar do corretor, Badges de status, Button Group para ações (enviar/alterar corretor)"
    - "Ação 'Enviar para corretor' e 'Alterar corretor' abrem Modals funcionais"
    - "Página NÃO contém kanban nem DataTable genérica"
  artifacts:
    - path: "src/components/yzihub/PipelineDashboardClient.tsx"
      provides: "Client wrapper que orquestra os 5 blocos e o estado dos modals"
    - path: "src/components/yzihub/pipeline/PipelineHeader.tsx"
      provides: "Bloco 1: breadcrumb + filtros dropdown + action buttons"
    - path: "src/components/yzihub/pipeline/PipelineAlerts.tsx"
      provides: "Bloco 2: cards de alertas operacionais"
    - path: "src/components/yzihub/pipeline/PipelineKPIs.tsx"
      provides: "Bloco 3: cards KPI com badges e progress bars"
    - path: "src/components/yzihub/pipeline/PipelineCharts.tsx"
      provides: "Bloco 4: gráficos (funil, origem, performance)"
    - path: "src/components/yzihub/pipeline/PipelineLeadsList.tsx"
      provides: "Bloco 5: lista operacional com avatars, badges e button group"
    - path: "src/components/yzihub/pipeline/AssignBrokerModal.tsx"
      provides: "Modal para enviar/alterar corretor do lead"
    - path: "src/app/cockpit/pipeline/page.tsx"
      provides: "Server component que busca dados e monta PipelineDashboardClient"
  key_links:
    - from: "src/app/cockpit/pipeline/page.tsx"
      to: "src/components/yzihub/PipelineDashboardClient.tsx"
      via: "import + props (leads, stages, brokers, tenantName)"
    - from: "src/components/yzihub/PipelineDashboardClient.tsx"
      to: "src/components/yzihub/pipeline/*"
      via: "composição dos 5 blocos como children + handlers compartilhados"
    - from: "src/components/yzihub/pipeline/PipelineLeadsList.tsx"
      to: "src/components/yzihub/pipeline/AssignBrokerModal.tsx"
      via: "callback onAssignBroker abre modal com leadId"
---

<objective>
Reestruturar `/cockpit/pipeline` como dashboard operacional de tomada de decisão (5 blocos), substituindo o kanban atual por uma UX focada em operação: Header + Alerts + KPIs + Charts + Lista Operacional.

Purpose: O kanban vive em `/cockpit/leads`. A tela Pipeline precisa de uma identidade distinta (Lei da Variedade Visual do CLAUDE.md) — foco em decisão, não em arrastar cards. Permite ao gestor Jurema agir sobre leads sem corretor, leads parados e leads quentes sem ter que varrer o kanban.

Output: Página Pipeline rearquitetada como dashboard operacional TailAdmin dark, com 5 blocos modulares em `src/components/yzihub/pipeline/`, integrada ao fetch Supabase existente (leads + stages + tenant), sem kanban nem DataTable genérica como componente principal.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md

# Página atual (kanban — a ser substituído)
@src/app/cockpit/pipeline/page.tsx
@src/components/yzihub/PipelineClient.tsx

# Tipos e dados do domínio
@src/lib/crm/types.ts
@src/lib/crm/mock-data.ts

# Componentes TailAdmin existentes para reuso
@src/components/yzihub/CommandButton.tsx
@src/components/yzihub/LeadDrawer.tsx

<interfaces>
Tipos já definidos em src/lib/crm/types.ts:

```typescript
type Lead = {
  id: string;
  tenant_id: string;
  stage_id: string;
  name: string;
  email: string;
  phone: string;
  company: string | null;
  source: string | null;
  status: string;           // new | contacted | qualified | meeting | proposal | negotiation | won | lost
  score: number | null;
  value: number | null;
  notes: string | null;
  assigned_to: string | null;  // broker id ou null → "sem corretor"
  last_action_at: string | null;
  created_at: string;
};

type PipelineStage = {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
};
```

Pipeline Jurema Brokers (ordem): Lead → Agendado → Visita → Proposta → Contrato → Fechado

CommandButton.tsx expõe: `type CrmAction = "contact" | "schedule" | "send_proposal" | "close" | "lose" | ...`
Ações novas necessárias: "assign_broker", "reassign_broker" (disparam modal, não POST direto).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Criar 5 blocos modulares em src/components/yzihub/pipeline/</name>
  <files>
    src/components/yzihub/pipeline/PipelineHeader.tsx,
    src/components/yzihub/pipeline/PipelineAlerts.tsx,
    src/components/yzihub/pipeline/PipelineKPIs.tsx,
    src/components/yzihub/pipeline/PipelineCharts.tsx,
    src/components/yzihub/pipeline/PipelineLeadsList.tsx,
    src/components/yzihub/pipeline/AssignBrokerModal.tsx
  </files>
  <action>
    Criar diretório `src/components/yzihub/pipeline/` e os 6 componentes client (`"use client"`) no padrão TailAdmin dark (bg-white dark:bg-white/[0.03], border-gray-200 dark:border-white/[0.05], rounded-2xl, text-gray-800 dark:text-white/90).

    **1) PipelineHeader.tsx**
    - Props: `{ brokers: Array<{id:string,name:string}>, onFilterChange: (f: {brokerId?:string, period?:string, source?:string}) => void }`
    - Estrutura: Breadcrumb "Cockpit / Pipeline" no topo + linha com 3 Dropdowns (Corretor, Período: 7d/30d/90d, Origem) + botões de ação à direita ("Exportar", "Novo Lead" primary).
    - Usar `<select>` estilizado TailAdmin para dropdowns (simples, sem lib externa).

    **2) PipelineAlerts.tsx**
    - Props: `{ leads: Lead[] }`
    - Computa 3 métricas: (a) leads com `assigned_to === null` → "Leads sem corretor", (b) leads com `last_action_at` > 3 dias atrás e status não final → "Leads parados", (c) leads com `score >= 80` e status `new|contacted|qualified` → "Leads quentes sem follow-up".
    - Renderiza 3 cards lado a lado (grid-cols-1 md:grid-cols-3 gap-4), cada um com ícone colorido (warning/error/success), contador grande, label curta e botão "Ver detalhes" que emite evento (prop `onAlertClick(type)`).

    **3) PipelineKPIs.tsx**
    - Props: `{ leads: Lead[], stages: PipelineStage[] }`
    - Renderiza grid (grid-cols-2 lg:grid-cols-6 gap-4) com 1 card por stage do pipeline Jurema (Lead/Agendado/Visita/Proposta/Contrato/Fechado).
    - Cada card: nome do stage, contagem, Badge com variação % vs período anterior (mockar cálculo: random 0-15%), Progress Bar mostrando % do stage no total de leads (bg-gray-200 dark:bg-white/5 + div interno bg-brand-500).

    **4) PipelineCharts.tsx**
    - Props: `{ leads: Lead[], brokers: Array<{id:string,name:string}> }`
    - Grid 3 colunas (grid-cols-1 lg:grid-cols-3 gap-6). 3 visualizações:
      - **Funil de leads**: barras horizontais decrescentes (div com width %) por stage, ordenadas por position.
      - **Origem**: lista vertical com label (WhatsApp, Instagram, Indicação, Site, Outros) + barra de progresso + contador.
      - **Performance por corretor**: lista com Avatar (initials) + nome + badge de leads ativos + barra de conversão.
    - Sem lib de gráficos — usar divs + Tailwind (consistência TailAdmin dark).

    **5) PipelineLeadsList.tsx**
    - Props: `{ leads: Lead[], brokers: Array<{id:string,name:string}>, onAssignBroker: (leadId: string) => void, onReassignBroker: (leadId: string) => void }`
    - NÃO é tabela — é uma **List** (lista vertical de cards/rows). Cada row:
      - Esquerda: Avatar do corretor (initials) ou placeholder "?" se `assigned_to === null`
      - Centro: Nome do lead, phone, badge de status colorido (usar STATUS_BADGE do PipelineClient.tsx atual como referência), texto "Parado há X dias" se aplicável
      - Direita: Button Group com 2-3 botões pequenos: "Enviar p/ corretor" (se sem corretor) OU "Alterar corretor" (se tem) + "Ver detalhes" + Tooltip no hover de cada botão
    - Divider entre rows (border-b border-gray-100 dark:border-white/[0.05])
    - Header da lista com Tabs: "Todos" | "Sem corretor" | "Parados" | "Quentes" filtrando inline.

    **6) AssignBrokerModal.tsx**
    - Props: `{ open: boolean, lead: Lead | null, brokers: Array<{id:string,name:string}>, mode: "assign" | "reassign", onClose: () => void, onConfirm: (leadId: string, brokerId: string) => void }`
    - Modal TailAdmin dark (fixed inset-0 + backdrop + card central). Título dinâmico pelo `mode`. Select com brokers. Botões "Cancelar" (secondary) e "Confirmar" (primary).
    - onConfirm apenas chama prop — o POST real fica em task futura (fora do escopo desta UI).

    Uso de decisões do CLAUDE.md: todos os componentes em `src/components/yzihub/` (subdir `pipeline/` permitido pois segue o padrão); nenhuma chamada direta a n8n — botões apenas emitem eventos.
  </action>
  <verify>
    <automated>rtk tsc --noEmit</automated>
    Type-check passa sem erros nos 6 arquivos novos.
  </verify>
  <done>
    6 arquivos criados em src/components/yzihub/pipeline/, cada um exportando default um componente client TailAdmin dark tipado corretamente contra Lead/PipelineStage. Nenhum erro de TS.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Criar PipelineDashboardClient orquestrador e substituir page.tsx</name>
  <files>
    src/components/yzihub/PipelineDashboardClient.tsx,
    src/app/cockpit/pipeline/page.tsx
  </files>
  <action>
    **1) Criar `src/components/yzihub/PipelineDashboardClient.tsx`** (client component):
    - Props: `{ leads: Lead[], stages: PipelineStage[], brokers: Array<{id:string,name:string}>, tenantName: string }`
    - State local: `modalState: { open: boolean, leadId: string | null, mode: "assign" | "reassign" }`, `filters: {brokerId?, period?, source?}`
    - Filtra `leads` em memória com base em `filters` antes de passar para os blocos.
    - Layout vertical (flex flex-col gap-6 p-6):
      1. `<PipelineHeader brokers={brokers} onFilterChange={setFilters} />`
      2. `<PipelineAlerts leads={filteredLeads} onAlertClick={...} />`
      3. `<PipelineKPIs leads={filteredLeads} stages={stages} />`
      4. `<PipelineCharts leads={filteredLeads} brokers={brokers} />`
      5. `<PipelineLeadsList leads={filteredLeads} brokers={brokers} onAssignBroker={(id)=>setModalState({open:true,leadId:id,mode:"assign"})} onReassignBroker={(id)=>setModalState({open:true,leadId:id,mode:"reassign"})} />`
      6. `<AssignBrokerModal open={modalState.open} lead={filteredLeads.find(l=>l.id===modalState.leadId) ?? null} brokers={brokers} mode={modalState.mode} onClose={()=>setModalState({open:false,leadId:null,mode:"assign"})} onConfirm={(leadId, brokerId) => { console.log("assign",leadId,brokerId); setModalState({open:false,leadId:null,mode:"assign"}); }} />`

    **2) Substituir `src/app/cockpit/pipeline/page.tsx`** (server component):
    - Manter `fetchPipelineData()` existente (que já busca leads + stages + tenant do Supabase com fallback mock).
    - Adicionar fetch de brokers: `supabase.from("corretores").select("id, full_name").eq("tenant_id", tenantId)` (se tabela existir; caso contrário, fallback `[]`). Mapear para `{id, name: full_name}`.
    - Remover `import PipelineClient` e substituir por `import PipelineDashboardClient from "@/components/yzihub/PipelineDashboardClient"`.
    - JSX final: `<PipelineDashboardClient leads={leads} stages={stages} brokers={brokers} tenantName={tenantName} />`.
    - **Não deletar `PipelineClient.tsx`** — outro código pode referenciá-lo; apenas trocar o consumo em `pipeline/page.tsx`.

    Regra de ouro: frontend NÃO chama n8n — `onConfirm` do modal por enquanto é apenas `console.log`. POST /api/actions/execute será task futura.
  </action>
  <verify>
    <automated>rtk tsc --noEmit && rtk next build</automated>
    Type-check e build Next.js passam. Rota /cockpit/pipeline compila.
  </verify>
  <done>
    PipelineDashboardClient.tsx existe e orquestra os 5 blocos + modal. src/app/cockpit/pipeline/page.tsx importa PipelineDashboardClient (não mais PipelineClient). Build Next.js passa. Ao abrir /cockpit/pipeline no dev server, a página renderiza 5 seções verticais (Header, Alerts, KPIs, Charts, Lista) sem kanban.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Dashboard operacional /cockpit/pipeline com 5 blocos (Header, Alerts, KPIs, Charts, Lista) em TailAdmin dark. Modal de atribuição de corretor funcional (UI). Kanban removido da rota Pipeline.
  </what-built>
  <how-to-verify>
    1. Rodar `rtk pnpm dev` e abrir http://localhost:3000/cockpit/pipeline (logado como Jurema Brokers).
    2. Confirmar visualmente os 5 blocos na ordem: Header → Alerts → KPIs → Charts → Lista.
    3. Header: breadcrumb "Cockpit / Pipeline" visível, 3 dropdowns (Corretor/Período/Origem) funcionam, botões "Exportar" e "Novo Lead" aparecem.
    4. Alerts: 3 cards coloridos com contadores (sem corretor / parados / quentes).
    5. KPIs: 6 cards (Lead/Agendado/Visita/Proposta/Contrato/Fechado) com badges de variação e progress bars.
    6. Charts: 3 visualizações (funil / origem / performance por corretor) renderizadas com divs + Tailwind.
    7. Lista: rows com avatar, nome, phone, badge de status, button group à direita; Tabs no topo (Todos/Sem corretor/Parados/Quentes) filtram.
    8. Clicar em "Enviar p/ corretor" ou "Alterar corretor" abre modal centralizado com select de brokers + Cancelar/Confirmar.
    9. Confirmar: NÃO existe kanban nesta página, NÃO existe DataTable genérica.
    10. Tema dark do TailAdmin aplicado em todos os blocos.
  </how-to-verify>
  <resume-signal>Digite "aprovado" ou descreva ajustes visuais necessários</resume-signal>
</task>

</tasks>

<verification>
- `rtk tsc --noEmit` sem erros
- `rtk next build` compila rota `/cockpit/pipeline` sem warnings bloqueantes
- Inspeção visual confirma os 5 blocos, Lei da Variedade Visual respeitada (kanban só em /leads; pipeline agora é dashboard operacional)
- Modais abrem/fecham corretamente
- Componentes todos sob `src/components/yzihub/` (regra CLAUDE.md)
</verification>

<success_criteria>
- [ ] 6 componentes em `src/components/yzihub/pipeline/` + 1 orquestrador em `src/components/yzihub/PipelineDashboardClient.tsx`
- [ ] `src/app/cockpit/pipeline/page.tsx` usa PipelineDashboardClient (não mais PipelineClient)
- [ ] Página renderiza 5 blocos verticais sem kanban nem DataTable genérica
- [ ] Ações "enviar para corretor" e "alterar corretor" abrem Modal
- [ ] TailAdmin dark aplicado consistentemente
- [ ] Build Next.js verde, type-check verde
- [ ] Checkpoint humano aprovado
</success_criteria>

<output>
After completion, create `.planning/quick/260415-fcb-estruturar-p-gina-crm-pipeline-como-dash/260415-fcb-SUMMARY.md`
</output>
