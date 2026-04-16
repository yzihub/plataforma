---
phase: quick
plan: 260416-cjl
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/yzihub/LeadsKpiStrip.tsx
  - src/components/yzihub/LeadsDataTable.tsx
autonomous: true
requirements: [UX-KPI-TAILADMIN, UX-HIGHLIGHT-LEAD]
must_haves:
  truths:
    - "KPI cards exibem 8 metricas no estilo TailAdmin: icone discreto, label texto, numero grande — zero emojis"
    - "Metricas sao: Total, Novos, Qualificados, Quentes, Visitas agendadas, Propostas, Fechados, Perdidos"
    - "Lead selecionado na tabela tem highlight visualmente forte e inequivoco"
    - "Grid continua como view padrao, Kanban como secundario (sem alteracao)"
    - "Chat lateral e drawer de detalhes mantidos intactos"
  artifacts:
    - path: "src/components/yzihub/LeadsKpiStrip.tsx"
      provides: "8 KPI cards estilo TailAdmin com icone SVG discreto, label e numero grande"
    - path: "src/components/yzihub/LeadsDataTable.tsx"
      provides: "Highlight mais evidente do lead selecionado na tabela"
  key_links:
    - from: "src/components/yzihub/LeadsKpiStrip.tsx"
      to: "src/components/yzihub/LeadsClient.tsx"
      via: "props leads, activeStatus, onStatusClick"
      pattern: "LeadsKpiStrip"
---

<objective>
Ajustar tela de Leads com patch minimo de UX/hierarquia: padronizar KPI cards no estilo TailAdmin (icone discreto, label, numero grande, SEM emojis) com 8 metricas especificas, e melhorar highlight do lead selecionado na tabela.

Purpose: Alinhar visual dos KPI cards ao padrao TailAdmin dark usado no restante do cockpit, e tornar a selecao de lead na tabela visualmente inequivoca.
Output: LeadsKpiStrip.tsx reestilizado + highlight melhorado no LeadsDataTable.tsx
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/yzihub/LeadsKpiStrip.tsx
@src/components/yzihub/LeadsDataTable.tsx
@src/components/yzihub/LeadsClient.tsx
@src/app/cockpit/page.tsx

<interfaces>
<!-- Referencia: StatCard do cockpit/page.tsx — padrao TailAdmin a seguir -->
<!-- Estrutura: div container rounded-2xl border → div icone 14x14 bg-gray-100 rounded-2xl → div com label text-sm + h4 text-3xl font-bold -->
<!-- LeadsKpiStrip recebe: leads: Lead[], activeStatus: string, onStatusClick: (status: string) => void -->
<!-- STATUS_CONFIG atual tem 9 itens (Total + 8 status) — manter mesma interface de props -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Redesign KPI cards no estilo TailAdmin com 8 metricas</name>
  <files>src/components/yzihub/LeadsKpiStrip.tsx</files>
  <action>
Reescrever o componente LeadsKpiStrip mantendo a mesma interface de props (leads, activeStatus, onStatusClick).

**STATUS_CONFIG — 9 cards (Total + 8 metricas solicitadas):**
Mapear para os status existentes no schema:
1. Total (value: "") — icone: TableIcon — label: "Total de Leads"
2. new (value: "new") — icone: BoltIcon — label: "Leads Novos"
3. qualified (value: "qualified") — icone: CheckCircleIcon — label: "Qualificados"
4. contacted (value: "contacted") — icone: ChatIcon — label: "Leads Quentes"
5. meeting (value: "meeting") — icone: CalenderIcon — label: "Visitas Agendadas"
6. proposal (value: "proposal") — icone: DollarLineIcon — label: "Propostas"
7. won (value: "won") — icone: CheckCircleIcon — label: "Fechados"
8. lost (value: "lost") — icone: CloseLineIcon — label: "Perdidos"
9. negotiation (value: "negotiation") — icone: DocsIcon — label: "Negociacao"

Nota: o usuario pediu 8 metricas especificas. Mapeamento:
- "Leads quentes" = status "contacted" (contato feito, lead engajado)
- "Visitas agendadas" = status "meeting"
- Remover "Reuniao" duplicado — agora "meeting" e "Visitas Agendadas"

**Estilo TailAdmin de cada card (inspirado em StatCard do cockpit/page.tsx):**
- Container: `rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]`
- Layout horizontal (flex items-center gap-4) para cards compactos na faixa:
  - Lado esquerdo: div 10x10 (w-10 h-10) rounded-xl bg-gray-100 dark:bg-gray-800 centralizando o icone (size-5, cor do accent)
  - Lado direito: label em cima (text-xs font-medium text-gray-500 dark:text-gray-400), numero embaixo (text-xl font-bold text-gray-800 dark:text-white/90)
- Estado ativo: border-brand-500, bg-brand-50 dark:bg-brand-500/10, icone e numero em text-brand-500
- Hover: hover:border-brand-300 hover:shadow-sm
- Cursor pointer, transition-all

**Grid responsivo:** grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3

**ZERO emojis** — apenas icones SVG importados de @/icons.

Manter a funcao countFor(statusValue) exatamente como esta.
  </action>
  <verify>
    <automated>cd D:/dev/plataforma && rtk npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>KPI strip exibe 9 cards (Total + 8 metricas) no padrao TailAdmin: icone SVG discreto em container rounded, label texto, numero grande bold. Zero emojis. Cards clicaveis com estado ativo destacado.</done>
</task>

<task type="auto">
  <name>Task 2: Melhorar highlight do lead selecionado na tabela</name>
  <files>src/components/yzihub/LeadsDataTable.tsx</files>
  <action>
No componente LeadsDataTable, na linha ~420 onde o `<tr>` renderiza cada lead, melhorar o highlight do lead selecionado.

**Highlight atual (fraco):**
```
bg-brand-50 ring-1 ring-inset ring-brand-500 dark:bg-brand-500/10
```

**Novo highlight (forte e inequivoco):**
```
bg-brand-50 ring-2 ring-inset ring-brand-500 dark:bg-brand-500/15 shadow-[inset_0_0_0_1px_rgba(70,95,255,0.3)]
```

Adicionar tambem uma barra lateral de destaque no lead selecionado:
- Usar `relative` no `<tr>` quando selecionado
- Adicionar um pseudo-elemento via classe Tailwind ou um `<td>` invisivel com borda left brand-500

Abordagem mais simples e robusta: adicionar `border-l-[3px] border-l-brand-500` no `<tr>` selecionado, e remover o border-l para nao-selecionados (`border-l-[3px] border-l-transparent`).

Resultado: o lead selecionado tera uma barra vertical brand-500 na esquerda + fundo brand-50 + ring-2 brand-500 — visualmente forte.
  </action>
  <verify>
    <automated>cd D:/dev/plataforma && rtk npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Lead selecionado na tabela tem highlight forte: barra lateral brand-500 3px + fundo brand-50 + ring-2 brand-500. Visualmente inequivoco comparado ao estado hover.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` sem erros de tipo
2. Abrir /cockpit/leads no navegador — KPI strip mostra 9 cards estilo TailAdmin sem emojis
3. Clicar em um lead — highlight forte com barra lateral brand visivel
4. Grid continua como view padrao, toggle Grid/Kanban funcional
5. Drawer de detalhes abre normalmente ao clicar em lead
</verification>

<success_criteria>
- 9 KPI cards (Total + 8) no estilo TailAdmin: icone SVG discreto, label, numero grande
- Zero emojis em todo o componente LeadsKpiStrip
- Lead selecionado na tabela com highlight visualmente forte (barra lateral + bg + ring)
- Nenhuma alteracao em LeadDrawer, LeadsClient, LeadsKanban, chat lateral
- Build TypeScript sem erros
</success_criteria>

<output>
After completion, create `.planning/quick/260416-cjl-ajustar-tela-de-leads-padronizar-kpi-car/260416-cjl-SUMMARY.md`
</output>
