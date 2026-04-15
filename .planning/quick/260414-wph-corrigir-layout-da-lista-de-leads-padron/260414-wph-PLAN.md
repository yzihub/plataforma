---
phase: quick-260414-wph
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/yzihub/LeadsClient.tsx
  - src/components/yzihub/LeadsDataTable.tsx
autonomous: true
requirements:
  - UI-LEADS-LAYOUT-01
must_haves:
  truths:
    - "Lista de leads (rota /cockpit/leads) renderiza sem layout quebrado no dark mode"
    - "Botao 'Novo Lead' e toggle table/kanban seguem o padrao TailAdmin (raio, padding, cores brand-500)"
    - "SearchBar (input + selects de status/origem) tem alinhamento e espacamento consistentes com CorretoresClient"
    - "Tabela de leads tem header, linhas e celulas com espacamento TailAdmin (py-3.5 px-5, divide-y, hover sutil)"
    - "Estado vazio (nenhum lead encontrado) centralizado com icone e texto"
    - "Responsivo: layout empilha corretamente em mobile (flex-col sm:flex-row)"
  artifacts:
    - path: "src/components/yzihub/LeadsClient.tsx"
      provides: "Header + toolbar (busca/filtros/view toggle/novo lead) padronizado"
      contains: "rounded-xl bg-brand-500"
    - path: "src/components/yzihub/LeadsDataTable.tsx"
      provides: "Tabela de leads com celulas, header e empty-state TailAdmin"
      contains: "rounded-2xl border"
  key_links:
    - from: "src/components/yzihub/LeadsClient.tsx"
      to: "src/components/yzihub/LeadsDataTable.tsx"
      via: "prop leads + onSelect"
      pattern: "LeadsDataTable leads=.* onSelect="
---

<objective>
Corrigir o layout quebrado da lista de leads (rota `/cockpit/leads`) — padronizar botoes, espacamentos e alinhamento seguindo o padrao TailAdmin dark ja estabelecido em `CorretoresClient.tsx` e `PropertyTable.tsx`.

Purpose: A tela de Leads e a principal do Cockpit. O layout atual tem botoes fora do padrao, espacamento inconsistente e alinhamento quebrado da toolbar (busca + filtros + view toggle + CTA). Padronizar cria consistencia visual com as outras telas do Cockpit (Corretores, Imoveis, Contratos).

Output: `LeadsClient.tsx` e `LeadsDataTable.tsx` revisados visualmente, sem mudanca de logica (state, filtros, props).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md

# Componentes a modificar
@src/components/yzihub/LeadsClient.tsx
@src/components/yzihub/LeadsDataTable.tsx

# Referencia de padrao TailAdmin ja estabelecido no projeto
@src/components/yzihub/CorretoresClient.tsx
@src/components/yzihub/PropertyTable.tsx

<interfaces>
<!-- Contratos existentes que NAO devem mudar -->

De src/lib/crm/types.ts:
```typescript
type Lead = { id: string; name: string; phone: string | null; status: string;
              score: number; assigned_to: string | null; source: string | null;
              value: number; stage_id: string; last_action_at: string; ... };
type PipelineStage = { id: string; name: string; color: string; position: number;
                       is_won: boolean; is_lost: boolean; ... };
```

Props de LeadsClient: `{ initialLeads: Lead[]; stages: PipelineStage[] }`
Props de LeadsDataTable: `{ leads: Lead[]; onSelect?: (lead: Lead) => void }`
</interfaces>

<design_tokens>
Padrao TailAdmin dark (do projeto):
- Container card: `rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]`
- Input/select: `rounded-xl border border-gray-200 bg-white py-2.5 px-3 dark:border-gray-800 dark:bg-white/[0.03]`
- Botao primario: `rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600`
- Botao secundario: `rounded-xl border border-gray-200 bg-white px-4 py-2.5 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03]`
- Header da tabela: `bg-gray-50 dark:bg-gray-800/40` + `text-xs font-semibold uppercase tracking-wide text-gray-400`
- Celula: `py-3.5 px-5`
- Linha hover: `hover:bg-gray-50/80 dark:hover:bg-white/[0.02]`
- Gap padrao de toolbar: `gap-3` horizontal, `gap-5` vertical (`space-y-5`)
</design_tokens>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Padronizar toolbar e header em LeadsClient.tsx</name>
  <files>src/components/yzihub/LeadsClient.tsx</files>
  <action>
    Revisar o layout do header + toolbar de `LeadsClient.tsx` sem mudar logica (state, handlers, filtros permanecem identicos).

    Ajustes obrigatorios:

    1. **Header row** (linha do titulo + view toggle + Novo Lead):
       - Manter `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`
       - Titulo `h1`: `text-2xl font-bold text-gray-800 dark:text-white/90` (ok, manter)
       - Subtitulo: `mt-1 text-sm text-gray-500 dark:text-gray-400` (ok, manter)
       - Grupo da direita (view toggle + botao): garantir `flex items-center gap-3 self-start sm:self-auto` (trocar `gap-2` por `gap-3` para respirar)

    2. **View toggle (table/kanban):**
       - Wrapper: `flex items-center gap-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-1` (trocar `dark:border-gray-700` por `dark:border-gray-800` para alinhar com o resto)
       - Botoes internos: `rounded-lg p-2` (trocar `p-1.5` para `p-2` — melhor tamanho clicavel) e preservar estado ativo com `bg-brand-500/10`

    3. **Botao "Novo Lead":**
       - Ja esta em `rounded-xl bg-brand-500 px-4 py-2.5` — manter como esta.
       - Adicionar `shrink-0` para nao comprimir em telas estreitas.

    4. **SearchBar:**
       - Wrapper: manter `flex flex-col gap-3 sm:flex-row sm:items-center`
       - Input de busca: ja OK, manter `rounded-xl ... py-2.5 pl-10 pr-4`
       - Selects de status/origem: padronizar largura minima com `min-w-[160px]` para nao ficarem esmagados ao lado do input flex-1
       - Todos os 3 controles devem ter a mesma altura visual (py-2.5 ja garante)

    5. **Espacamento geral:**
       - Container externo ja tem `space-y-5` — manter.
       - Garantir que nao ha `p-*` ou `m-*` extras que quebrem o layout com o `<main>` do layout do cockpit.

    NAO MUDAR: types, props, handlers, logica de useMemo/filtros, useState, integracao com LeadsDataTable e LeadsKanban, LeadDrawer.
  </action>
  <verify>
    <automated>rtk tsc --noEmit</automated>
  </verify>
  <done>
    - `tsc --noEmit` passa sem erros novos
    - Header/toolbar em /cockpit/leads tem visual consistente com /cockpit/corretores e /cockpit/imoveis
    - Botoes, inputs e selects com mesmo raio (rounded-xl), mesma altura (py-2.5) e mesmo padding lateral (px-3/px-4)
    - Layout responsivo preservado (flex-col em mobile, flex-row em sm+)
  </done>
</task>

<task type="auto">
  <name>Task 2: Padronizar celulas, header e empty-state em LeadsDataTable.tsx</name>
  <files>src/components/yzihub/LeadsDataTable.tsx</files>
  <action>
    Revisar o layout da tabela de leads sem alterar logica de render (Badge, avatar, formatacao).

    Ajustes obrigatorios:

    1. **Container externo:** manter `overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]`.

    2. **Header da tabela (TableRow):**
       - Background: `bg-gray-50 dark:bg-gray-800/40` (ok, manter)
       - Celulas header: `py-3 px-5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 text-left` (ok, manter)
       - A coluna vazia final (acao): garantir width minima com `w-[120px]` para nao colar nas colunas anteriores

    3. **Linhas (tr):**
       - Manter `cursor-pointer hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors`
       - Celulas: `py-3.5 px-5` (ok, manter)
       - Garantir alinhamento vertical central: adicionar `align-middle` na tr ou nas td (evita celulas com heights diferentes quebrando grid visual)

    4. **Empty-state (nenhum lead encontrado):**
       - Atualmente usa `<tr><td colSpan={9}>...</td></tr>` dentro de `<TableBody>` — isso e invalido semanticamente se TableBody renderizar algo a mais. Substituir por um unico wrapper dentro do Table quando leads.length === 0.
       - Correcao minima: manter o `<tr>` mas garantir que esta dentro do `<TableBody>` corretamente. Padding vertical: aumentar para `py-20` (mais respiro).
       - Icone: `UserCircleIcon` com `size-12 text-gray-200 dark:text-gray-700`
       - Texto: `text-sm text-gray-400 dark:text-gray-500`

    5. **Consistencia visual com PropertyTable:**
       - Conferir que a divisao entre linhas usa `divide-y divide-gray-50 dark:divide-gray-800` (ja esta) — manter.
       - Badges de status/score mantem tamanho `sm`.

    NAO MUDAR: logica de STATUS_BADGE, AVATAR_COLORS, getInitials, avatarColor, formatCurrency, formatPhone, scoreBadge, bairroFromId, formatCorretor, LeadAvatar, props interface.
  </action>
  <verify>
    <automated>rtk tsc --noEmit</automated>
  </verify>
  <done>
    - `tsc --noEmit` passa sem erros novos
    - Tabela de leads renderiza com espacamento uniforme, header destacado, linhas com hover sutil
    - Estado vazio centralizado com icone maior e respiro vertical
    - Comparacao visual com PropertyTable mostra mesmo padrao (raios, borders, hover, divide)
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Validacao visual em /cockpit/leads</name>
  <what-built>
    Header, toolbar (busca + filtros + view toggle + botao Novo Lead) e tabela de leads padronizados com TailAdmin dark.
  </what-built>
  <how-to-verify>
    1. Rodar `rtk pnpm dev` (ou conferir servidor ja rodando).
    2. Abrir http://localhost:3000/cockpit/leads em dark mode.
    3. Conferir:
       - Titulo "Leads" alinhado a esquerda, contador "X de Y leads" abaixo.
       - Grupo direito tem view toggle (table/kanban) + botao "Novo Lead" com mesmo tamanho visual.
       - Barra de busca ocupa espaco flex-1, selects "Todos os status" e "Todas as origens" tem largura consistente.
       - Tabela com header em caps, linhas com hover suave, celulas alinhadas verticalmente.
       - Em mobile (resize < 640px) tudo empilha em coluna sem overflow horizontal.
    4. Comparar visualmente com /cockpit/corretores e /cockpit/imoveis — padrao deve ser identico.
    5. Clicar em uma linha — LeadDrawer abre normalmente (regressao check).
    6. Alternar entre table e kanban view — toggle funciona.
  </how-to-verify>
  <resume-signal>Digite "approved" ou descreva ajustes visuais pendentes.</resume-signal>
</task>

</tasks>

<verification>
- `rtk tsc --noEmit` sem erros novos
- Nenhuma mudanca em logica, types ou props
- Visual consistente com CorretoresClient e PropertyTable
- Responsividade preservada (mobile/tablet/desktop)
</verification>

<success_criteria>
- Layout da lista de leads visualmente coeso com outras telas do Cockpit (Corretores, Imoveis)
- Botoes, inputs e selects seguem tokens TailAdmin dark (rounded-xl, py-2.5, brand-500)
- Espacamento e alinhamento da toolbar e da tabela corrigidos
- Zero regressao funcional (drawer, filtros, kanban toggle continuam funcionando)
- Usuario aprova visualmente na checkpoint
</success_criteria>

<output>
Apos completar, criar `.planning/quick/260414-wph-corrigir-layout-da-lista-de-leads-padron/260414-wph-SUMMARY.md`
</output>
