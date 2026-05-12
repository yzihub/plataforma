---
phase: quick-260415-unm
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/yzihub/LeadsClient.tsx
  - src/components/yzihub/LeadsDataTable.tsx
  - src/components/yzihub/LeadDrawer.tsx
  - src/components/yzihub/LeadsKpiStrip.tsx
autonomous: false
requirements:
  - UNM-01
  - UNM-02
  - UNM-03
  - UNM-04

must_haves:
  truths:
    - "Página /cockpit/leads abre em modo tabela por padrão (sem Kanban como foco principal)"
    - "Faixa de KPIs por status aparece no topo com contagem por LeadStatus (new, contacted, qualified, meeting, proposal, negotiation, won, lost)"
    - "Usuário pode clicar num KPI para filtrar a tabela por aquele status"
    - "Tabela exibe busca, filtros (status + origem), e permite edição inline de status e assigned_to"
    - "Click na linha abre LeadDrawer detalhado com dados do lead + imóvel associado (imovel_ref) + corretor (assigned_to) + ações rápidas"
    - "Visualização Kanban continua acessível via query param ?view=kanban (não removida, apenas despriorizada)"
  artifacts:
    - path: "src/components/yzihub/LeadsKpiStrip.tsx"
      provides: "Faixa superior com 8 cards de KPI (1 por LeadStatus) + card 'Total', clicáveis para filtrar"
      min_lines: 80
    - path: "src/components/yzihub/LeadsClient.tsx"
      provides: "Orquestrador atualizado: default view='table', integra LeadsKpiStrip acima da tabela, remove toggle Kanban do header principal"
    - path: "src/components/yzihub/LeadsDataTable.tsx"
      provides: "Tabela com edição inline (status via select, assigned_to via select de corretores) + filtro de origem"
    - path: "src/components/yzihub/LeadDrawer.tsx"
      provides: "Drawer com seção 'Imóvel Associado' (lookup via imovel_ref) e seção 'Corretor' (lookup via assigned_to) + ações rápidas"
  key_links:
    - from: "src/components/yzihub/LeadsKpiStrip.tsx"
      to: "LeadsClient filterStatus state"
      via: "onStatusClick callback"
      pattern: "onStatusClick"
    - from: "src/components/yzihub/LeadsDataTable.tsx"
      to: "LeadsClient handleLeadSaved"
      via: "onInlineEdit callback dispara PATCH/update e propaga update no state"
      pattern: "onInlineEdit"
    - from: "src/components/yzihub/LeadDrawer.tsx"
      to: "src/lib/crm/types.ts imovel_ref"
      via: "fetch ou prop passada com imóvel associado"
      pattern: "imovel_ref"
---

<objective>
Transformar o módulo de Leads (`/cockpit/leads`) numa tela de **gestão de dados SaaS premium**: tabela como visão principal, faixa de KPIs por status no topo (clicáveis p/ filtrar), busca, filtros, edição inline, e drawer detalhado com imóvel associado + corretor + ações rápidas. Kanban deixa de ser foco principal (acessível apenas via `?view=kanban`).

Purpose: Alinhar a UX com o padrão SaaS premium (Linear, Attio, Pipedrive) — leads é uma tela de **trabalho diário do time humano**, não um board visual. A IA já qualifica; a tela serve pra gestão.

Output: LeadsClient em modo tabela por default, nova faixa de KPIs clicáveis, edição inline na tabela, drawer enriquecido com imóvel + corretor.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md
@src/app/cockpit/leads/page.tsx
@src/components/yzihub/LeadsClient.tsx
@src/components/yzihub/LeadsDataTable.tsx
@src/components/yzihub/LeadDrawer.tsx
@src/lib/crm/types.ts

<interfaces>
From src/lib/crm/types.ts:
```ts
export type LeadStatus =
  | 'new' | 'contacted' | 'qualified' | 'meeting'
  | 'proposal' | 'negotiation' | 'won' | 'lost'

export interface Lead {
  id: string
  tenant_id: string
  stage_id: string | null
  name: string
  email: string | null
  phone: string | null
  source: string | null
  status: LeadStatus
  score: number
  value: number
  assigned_to: string | null
  last_action_at: string | null
  created_at: string
  imovel_ref?: string | null
  regiao_interesse?: string | null
  faixa_valor?: string | null
  finalidade?: 'compra' | 'aluguel' | string | null
  // ...
}
```

From src/components/yzihub/LeadsDataTable.tsx (STATUS_BADGE):
```ts
const STATUS_BADGE: Record<string, { color: BadgeColor; label: string }> = {
  new:         { color: "info",    label: "🔥 Novo Lead" },
  contacted:   { color: "warning", label: "📞 Contato" },
  qualified:   { color: "primary", label: "📅 Agendado" },
  meeting:     { color: "primary", label: "📅 Reunião" },
  proposal:    { color: "warning", label: "💰 Proposta" },
  negotiation: { color: "warning", label: "📋 Contrato" },
  won:         { color: "success", label: "✅ Fechado" },
  lost:        { color: "dark",    label: "❌ Perdido" },
};
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Criar LeadsKpiStrip e reorganizar LeadsClient em modo tabela-first</name>
  <files>src/components/yzihub/LeadsKpiStrip.tsx, src/components/yzihub/LeadsClient.tsx</files>
  <action>
    **1a. Criar `src/components/yzihub/LeadsKpiStrip.tsx`** (novo):
    - Props: `{ leads: Lead[]; activeStatus: string; onStatusClick: (status: string) => void }`
    - Render grid responsivo (grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3) com 9 cards clicáveis:
      - "Total" (todos leads, value="")
      - 8 cards por LeadStatus: new, contacted, qualified, meeting, proposal, negotiation, won, lost
    - Cada card: ícone/emoji do STATUS_BADGE (reutilizar labels existentes), contagem (número grande), label curto (só texto sem emoji), borda brand-500 quando `activeStatus === status`
    - Padrão visual TailAdmin dark: `rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4 hover:border-brand-500 cursor-pointer transition-colors`
    - Ao clicar: chama `onStatusClick(status)` (ou `""` para "Total")

    **1b. Atualizar `src/components/yzihub/LeadsClient.tsx`:**
    - Mudar default view para sempre `"table"` (remover leitura `?view=kanban` do default; manter suporte para `?view=kanban` explícito)
    - Importar `LeadsKpiStrip` e renderizar **acima** do bloco `{view === "table" && ...}` passando `leads={leads}`, `activeStatus={filterStatus}`, `onStatusClick={setFilterStatus}`
    - Remover o toggle "table/kanban" do header principal (TableViewIcon, KanbanViewIcon e os 2 botões). Manter apenas o botão "Novo Lead" no header da página
    - Header simplificado: título "Leads" + subtítulo com contagem + botão "Novo Lead" à direita
    - Se `?view=kanban` presente na URL: renderizar Kanban como antes (fallback de acesso); senão sempre table
    - Atualizar subtítulo: `{displayCount} de {leads.length} leads` — mantém como está

    Por UNM-01 (tabela é foco) + UNM-02 (KPIs por status no topo).
  </action>
  <verify>
    <automated>rtk tsc --noEmit</automated>
  </verify>
  <done>
    - LeadsKpiStrip.tsx existe com 9 cards clicáveis (1 Total + 8 status)
    - LeadsClient.tsx renderiza KPI strip acima da tabela
    - Default view da página é tabela (Kanban só com `?view=kanban`)
    - Toggle table/kanban removido do header principal
    - `rtk tsc --noEmit` passa sem erros
  </done>
</task>

<task type="auto">
  <name>Task 2: Adicionar edição inline + filtro de origem na LeadsDataTable</name>
  <files>src/components/yzihub/LeadsDataTable.tsx</files>
  <action>
    **2a. Adicionar filtro de origem (source):**
    - Aceitar prop opcional `sources?: string[]` e `activeSource?: string` e `onSourceChange?: (v: string) => void`
    - Renderizar `<select>` de origem ao lado da busca existente (mesma linha dos filtros). Opções: "Todas as origens" + lista derivada de `Array.from(new Set(leads.map(l => l.source).filter(Boolean)))`
    - Aplicar filtro `activeSource` na pipeline de filtragem da tabela (antes da paginação)

    **2b. Edição inline de status na linha:**
    - Na coluna "Status", trocar o Badge estático por um `<select>` compacto estilizado (ou Badge clicável que abre inline select). Opções = STATUS_BADGE keys. Estilo: mesmo look do Badge atual, mas interativo
    - Adicionar prop `onInlineEdit?: (leadId: string, patch: Partial<Lead>) => void | Promise<void>`
    - Ao mudar o select: chamar `onInlineEdit(lead.id, { status: newStatus, last_action_at: new Date().toISOString() })`
    - Mostrar estado optimistic (atualiza imediato visualmente)

    **2c. Edição inline de assigned_to:**
    - Aceitar prop opcional `corretores?: Array<{ id: string; full_name: string }>`
    - Na coluna "Responsável" (se existir) ou adicionar coluna nova "Corretor": select com opções de corretores + opção "— Sem corretor —"
    - Ao mudar: `onInlineEdit(lead.id, { assigned_to: newCorretorId })`
    - Se `corretores` prop não passada, degradar silenciosamente (texto read-only)

    **2d. Wiring em LeadsClient (mesmo arquivo da Task 1):**
    - Em `LeadsClient.tsx`, passar `onInlineEdit` para `LeadsDataTable` que chama `handleLeadSaved({ ...lead, ...patch })` para update otimista no state local
    - Passar `activeSource={filterSource}`, `onSourceChange={setFilterSource}` e derivar `sources` do array de leads
    - (Persistência no Supabase fica para fase futura — este plan é UI/UX; adicionar `// TODO: persist to Supabase via PATCH /api/leads/:id` como comentário no handler)

    Por UNM-03 (edição inline) + UNM-04 (filtros completos).
  </action>
  <verify>
    <automated>rtk tsc --noEmit</automated>
  </verify>
  <done>
    - Filtro de origem funciona na tabela
    - Clicar no select de status de uma linha atualiza o lead visualmente
    - Clicar no select de corretor (quando corretores prop passada) atualiza assigned_to visualmente
    - KPIs no topo refletem a contagem após edição (via state compartilhado em LeadsClient)
    - `rtk tsc --noEmit` passa
  </done>
</task>

<task type="auto">
  <name>Task 3: Enriquecer LeadDrawer com seção Imóvel Associado + Corretor + Ações Rápidas</name>
  <files>src/components/yzihub/LeadDrawer.tsx</files>
  <action>
    **3a. Seção "Imóvel Associado":**
    - No TabDados (ou criar novo bloco logo após dados básicos), adicionar card se `lead.imovel_ref` existir
    - Card mostra: ref (imovel_ref), link "Ver imóvel completo" → navega `/cockpit/imoveis?ref={imovel_ref}`
    - Se não houver `imovel_ref`: mostrar placeholder "Nenhum imóvel associado" com botão "Associar imóvel" (CTA visual, sem ação por ora — `// TODO: modal de seleção`)
    - Também exibir `regiao_interesse`, `finalidade`, `faixa_valor` se presentes (já estão no drawer? revisar e consolidar numa seção "Interesse Imobiliário" com 4 campos num grid 2x2)

    **3b. Seção "Corretor Responsável":**
    - Card compacto no topo do drawer (logo após header do lead) com:
      - Nome do corretor (via `assigned_to` — passar prop `corretores` do LeadsClient)
      - Telefone/email se disponível
      - Botão "Atribuir corretor" se `assigned_to === null`, senão "Trocar corretor"
    - Click no botão: abrir `<select>` inline com lista de corretores; ao selecionar, chamar `onLeadSaved({ ...lead, assigned_to: corretorId })`

    **3c. Faixa de "Ações Rápidas" no topo do drawer:**
    - Adicionar barra horizontal com 4 botões icon+label (logo abaixo do header):
      - "WhatsApp" → `https://wa.me/{phone}` (abre em nova aba)
      - "Ligar" → `tel:{phone}`
      - "Email" → `mailto:{email}`
      - "Mover status" → dropdown com opções de LeadStatus (usa mesmo onLeadSaved handler)
    - Desabilitar botões quando o campo correspondente for null (phone/email)
    - Layout: `flex gap-2 px-6 py-3 border-b border-gray-200 dark:border-gray-800`

    **3d. Aceitar prop `corretores?: Array<{ id: string; full_name: string; phone?: string; email?: string }>` passada pelo LeadsClient** (que por enquanto pode ser array vazio `[]` — integração real com `/api/corretores` fica para plan futuro, marcar com `// TODO: fetch from /api/corretores`)

    Por requisito "drawer detalhado por lead com imóvel associado / corretor / ações rápidas" (UNM-03).
  </action>
  <verify>
    <automated>rtk tsc --noEmit</automated>
  </verify>
  <done>
    - Drawer exibe faixa de Ações Rápidas (WhatsApp, Ligar, Email, Mover status) no topo
    - Drawer mostra card de Corretor Responsável com CTA atribuir/trocar
    - Drawer mostra seção Imóvel Associado com ref + link (ou placeholder quando vazio)
    - Seção "Interesse Imobiliário" consolidada (regiao, finalidade, faixa_valor, objetivo)
    - `rtk tsc --noEmit` passa sem erros
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Checkpoint: Verificar UX da nova tela de Leads</name>
  <what-built>
    - Faixa de KPIs clicáveis no topo (9 cards: Total + 8 status)
    - Tabela como foco principal com edição inline de status e corretor
    - Filtros de busca, status (via KPI), origem
    - Drawer enriquecido com Ações Rápidas + Corretor + Imóvel Associado
    - Kanban despriorizado (acessível só via ?view=kanban)
  </what-built>
  <how-to-verify>
    1. `rtk pnpm dev` e abrir http://localhost:3000/cockpit/leads
    2. Confirmar que a tela abre em modo **tabela** (sem Kanban visível)
    3. Verificar faixa de 9 KPIs no topo mostrando contagens corretas
    4. Clicar num card de KPI (ex: "Novo Lead") — tabela deve filtrar, card deve ficar destacado
    5. Na tabela, mudar o status de um lead pelo select inline — KPIs devem recalcular
    6. Clicar numa linha — drawer abre com Ações Rápidas no topo, seção Corretor, seção Imóvel
    7. Testar filtro de origem (select)
    8. Acessar http://localhost:3000/cockpit/leads?view=kanban — Kanban ainda funciona como fallback
    9. Responsividade: KPIs em grid-cols-2 no mobile, grid-cols-9 no desktop
  </how-to-verify>
  <resume-signal>Digite "approved" ou descreva ajustes visuais necessários</resume-signal>
</task>

</tasks>

<verification>
- `rtk tsc --noEmit` passa sem erros
- `rtk next build` passa (apenas se houver tempo — não bloqueante)
- Navegação manual valida os 9 pontos do checkpoint
</verification>

<success_criteria>
- Tela /cockpit/leads abre em modo tabela por default
- 9 KPIs clicáveis no topo filtram a tabela
- Edição inline de status e corretor funciona (visualmente)
- Drawer enriquecido com Ações Rápidas + Corretor + Imóvel Associado
- Kanban preservado via ?view=kanban
- Zero erros TypeScript
</success_criteria>

<output>
After completion, create `.planning/quick/260415-unm-reorganizar-m-dulo-de-leads-do-yzi-os-tr/260415-unm-SUMMARY.md`
</output>
