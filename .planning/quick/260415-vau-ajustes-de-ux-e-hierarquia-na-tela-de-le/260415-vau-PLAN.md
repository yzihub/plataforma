---
phase: quick-260415-vau
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/yzihub/LeadsClient.tsx
  - src/components/yzihub/LeadsKanban.tsx
  - src/components/yzihub/LeadsDataTable.tsx
  - src/components/yzihub/LeadDrawer.tsx
autonomous: false
requirements:
  - UX-VAU-01
must_haves:
  truths:
    - "Grid (tabela) é a view padrão ao entrar em /cockpit/leads"
    - "Existe um toggle Grid/Kanban visível no header com Grid proeminente (fundo brand-500) e Kanban secundário (apenas ícone/texto discreto)"
    - "Quando um lead é selecionado (grid ou kanban), o chat lateral (LeadDrawer) abre fixo à direita e o lead selecionado recebe highlight ring-2 ring-brand-500"
    - "Na view Kanban, os cards têm peso visual reduzido (padding menor, borda mais sutil, score bar opcional oculta) comparado ao grid"
    - "Chat lateral parece elemento essencial: largura generosa (w-[420px]+), header destacado com avatar grande do lead, shadow-xl, borda brand sutil à esquerda"
  artifacts:
    - path: "src/components/yzihub/LeadsClient.tsx"
      provides: "Toggle Grid/Kanban + controle do lead selecionado para highlight"
      contains: "view === \"table\""
    - path: "src/components/yzihub/LeadDrawer.tsx"
      provides: "Chat lateral fixo visualmente destacado"
      contains: "shadow-xl"
  key_links:
    - from: "src/components/yzihub/LeadsClient.tsx"
      to: "src/components/yzihub/LeadsDataTable.tsx"
      via: "prop selectedLeadId para highlight da linha"
      pattern: "selectedLeadId"
    - from: "src/components/yzihub/LeadsClient.tsx"
      to: "src/components/yzihub/LeadsKanban.tsx"
      via: "prop selectedLeadId para highlight do card"
      pattern: "selectedLeadId"
---

<objective>
Ajuste cirúrgico de UX e hierarquia visual na tela `/cockpit/leads`:
- Grid permanece como padrão (já é); adicionar toggle Grid/Kanban VISÍVEL no header mas com Kanban secundário (menos proeminente)
- Chat lateral (LeadDrawer) deve parecer elemento essencial, não secundário: largura maior, shadow pronunciado, header destacado
- Lead selecionado recebe highlight claro (ring/border brand-500) tanto no grid quanto no kanban
- Kanban tem peso visual reduzido quando visível (cards mais densos, menos adornos)

Purpose: Hoje o drawer parece modal secundário, o toggle de view está invisível (só via query param `?view=kanban`), e não há feedback visual de qual lead está aberto. Os usuários reclamam de desorientação.

Output: Ajustes de classes Tailwind + pequenas props (selectedLeadId) repassadas — sem refatoração estrutural.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

<!-- Estado atual do LeadsClient: view default já é "table"; kanban só abre via ?view=kanban (toggle não existe no header) -->
<!-- LeadDrawer é um painel lateral modal (fixed inset-y-0 right-0) sem destaque forte -->
<!-- Cards do kanban (LeadsKanban → LeadCard interno) são densos; precisam reduzir peso -->

<interfaces>
From src/components/yzihub/LeadsClient.tsx:
```typescript
export default function LeadsClient({
  initialLeads,
  stages,
}: {
  initialLeads: Lead[];
  stages: PipelineStage[];
}): JSX.Element;

// State relevante (interno):
//   const [view, setView] = useState<"table" | "kanban">(initialView);  // atualmente sem setter usado
//   const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
```

From src/components/yzihub/LeadsDataTable.tsx (props atuais):
```typescript
type Props = {
  leads: Lead[];
  onSelect: (lead: Lead) => void;
  activeStatus: string;
  onStatusChange: (s: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
  activeSource: string;
  onSourceChange: (s: string) => void;
  sources: string[];
  corretores: Corretor[];
  onInlineEdit: (leadId: string, patch: Partial<Lead>) => void;
};
```

From src/components/yzihub/LeadsKanban.tsx (props atuais):
```typescript
type Props = {
  leads: Lead[];
  stages: PipelineStage[];
  onMoveLead: (leadId: string, newStageId: string) => void;
  onLeadSelect?: (lead: Lead) => void;
};
```

From src/components/yzihub/LeadDrawer.tsx (props atuais):
```typescript
type Props = {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadSaved: (lead: Lead) => void;
  onLeadDeleted: (leadId: string) => void;
  corretores: Corretor[];
};
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Toggle Grid/Kanban visível + propagar selectedLeadId</name>
  <files>src/components/yzihub/LeadsClient.tsx</files>
  <action>
    Em `LeadsClient.tsx`:

    1. **Ativar o setter do view**: trocar `const [view] = useState(...)` para `const [view, setView] = useState<"table" | "kanban">(initialView);`

    2. **Adicionar toggle no header** (ao lado do botão "Novo Lead"), com hierarquia clara:
       - Wrapper: `<div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5 dark:border-gray-800 dark:bg-gray-900">`
       - Botão Grid (proeminente quando ativo):
         ```tsx
         <button onClick={() => setView("table")}
           className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
             view === "table"
               ? "bg-brand-500 text-white shadow-sm"
               : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
           }`}>
           <GridIcon className="size-4" /> Grid
         </button>
         ```
       - Botão Kanban (secundário — menor, mais discreto quando inativo; usar apenas ícone ListIcon + label em texto menor):
         ```tsx
         <button onClick={() => setView("kanban")}
           className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
             view === "kanban"
               ? "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
               : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
           }`}>
           <ListIcon className="size-3.5" /> Kanban
         </button>
         ```
       - Ordem: Grid à esquerda, Kanban à direita. Importar `GridIcon, ListIcon` de `@/icons` se ainda não importados.

    3. **Propagar `selectedLeadId`** para `LeadsDataTable` e `LeadsKanban`:
       - `<LeadsDataTable ... selectedLeadId={selectedLead?.id ?? null} />`
       - `<LeadsKanban ... selectedLeadId={selectedLead?.id ?? null} />`

    4. **Não mexer** na lógica de filtros, KPI strip, drawer state, nem handleMoveLead/handleInlineEdit.

    NOTA: manter `initialView` via query param para deep-linking, mas o toggle agora permite trocar em runtime sem perder estado.
  </action>
  <verify>
    <automated>rtk tsc --noEmit</automated>
  </verify>
  <done>
    - `setView` é usado; toggle Grid/Kanban aparece no header
    - Grid com fundo brand-500 quando ativo; Kanban visualmente secundário (text-xs, cores cinza)
    - `selectedLeadId` é passado para DataTable e Kanban
    - `rtk tsc --noEmit` sem novos erros
  </done>
</task>

<task type="auto">
  <name>Task 2: Highlight de lead selecionado no grid e kanban + reduzir peso visual do kanban</name>
  <files>src/components/yzihub/LeadsDataTable.tsx, src/components/yzihub/LeadsKanban.tsx</files>
  <action>
    **A) `LeadsDataTable.tsx`:**

    1. Adicionar prop opcional à assinatura: `selectedLeadId?: string | null`
    2. Na `<TableRow>` de cada lead (onde há `onClick={() => onSelect(l)}` ou similar), adicionar classe condicional:
       ```tsx
       className={`... cursor-pointer transition-colors ${
         selectedLeadId === l.id
           ? "bg-brand-50 ring-1 ring-inset ring-brand-500 dark:bg-brand-500/10"
           : "hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
       }`}
       ```
    3. Se há célula com avatar/nome, adicionar borda-left brand para a linha selecionada (opcional: `border-l-2 border-l-brand-500` aplicado só quando selecionado — usar class condicional acima).

    **B) `LeadsKanban.tsx`:**

    1. Adicionar prop opcional ao componente exportado (wrapper principal do kanban): `selectedLeadId?: string | null` e repassar para `KanbanColumn` → `LeadCard`.
    2. No `LeadCard` interno (linha ~76-82), ajustar className do wrapper para:
       ```tsx
       className={`rounded-xl border p-3 transition-all cursor-pointer active:cursor-grabbing select-none ${
         selectedLeadId === lead.id
           ? "border-brand-500 ring-2 ring-brand-500/40 bg-white dark:bg-gray-800 shadow-md"
           : "border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60 hover:shadow-sm hover:border-brand-300 dark:hover:border-brand-700"
       }`}
       ```
       Mudanças-chave de peso visual: `p-3.5 → p-3`, bg com `/70` e `/60` (translúcido quando não selecionado), `hover:shadow-md → hover:shadow-sm`.
    3. Reduzir peso dos elementos internos do card (ajustes cirúrgicos de classe, NÃO remover elementos):
       - Avatar: `w-8 h-8 → w-7 h-7`, `text-xs → text-[10px]`
       - Score bar: envolver em `<div className="opacity-70">` (mais discreto)
       - Borda interna do footer: `border-t border-gray-100 dark:border-gray-700 → border-t border-gray-100/60 dark:border-gray-700/50`
    4. Reduzir peso visual das colunas do kanban:
       - Wrapper da coluna (em `KanbanColumn`): procurar class que começa com `flex flex-col ...` no root da coluna e adicionar/ajustar para `bg-gray-50/50 dark:bg-gray-900/50` (em vez de sólido); ajustar a stripe colorida para `h-0.5` em vez de `h-1` se existir.

    NOTA: não mexer em lógica de drag&drop, MoveMenu, nem em props existentes (apenas adicionar selectedLeadId).
  </action>
  <verify>
    <automated>rtk tsc --noEmit</automated>
  </verify>
  <done>
    - `LeadsDataTable` destaca linha selecionada com ring brand-500
    - Cards do `LeadsKanban` destacam o lead selecionado com ring-2 brand + shadow
    - Cards não-selecionados têm aparência mais leve (bg translúcido, score bar com opacity-70)
    - Colunas do kanban têm fundo mais suave (50% opacity)
    - `rtk tsc --noEmit` sem novos erros
  </done>
</task>

<task type="auto">
  <name>Task 3: Chat lateral (LeadDrawer) como elemento essencial destacado</name>
  <files>src/components/yzihub/LeadDrawer.tsx</files>
  <action>
    Em `LeadDrawer.tsx`, localizar o painel lateral (container que tem `fixed inset-y-0 right-0` ou similar) e aplicar ajustes de destaque — SEM mudar estrutura de tabs nem conteúdo:

    1. **Aumentar largura e adicionar destaque visual**: trocar largura atual (provavelmente `w-full max-w-md` ou `w-[400px]`) para:
       ```tsx
       className="... w-full sm:w-[440px] lg:w-[480px] border-l-2 border-brand-500/30 dark:border-brand-500/40 shadow-2xl shadow-brand-500/5"
       ```
       (manter demais classes existentes como `fixed inset-y-0 right-0 z-50 bg-white dark:bg-gray-900`, etc.)

    2. **Destacar o header do drawer** (onde mostra nome do lead / avatar):
       - Localizar o header (primeiro `<div>` dentro do painel contendo nome+close button)
       - Adicionar `bg-gradient-to-r from-brand-500/5 to-transparent dark:from-brand-500/10 dark:to-transparent border-b border-gray-200 dark:border-gray-800`
       - Se existir avatar no header, aumentar: `w-10 h-10 → w-12 h-12` e trocar a fonte para `text-base font-bold`
       - Nome do lead: garantir `text-lg font-bold text-gray-800 dark:text-white` (ou classe equivalente TailAdmin)

    3. **Indicador de "chat ativo"**: acima do nome ou ao lado, adicionar um pequeno dot pulsante para sinalizar presença:
       ```tsx
       <span className="inline-flex items-center gap-1.5 text-xs text-brand-500">
         <span className="relative flex h-2 w-2">
           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
           <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
         </span>
         Chat ativo
       </span>
       ```
       Posicionar no header, acima ou abaixo do nome.

    4. **Backdrop mais suave**: se existir um overlay/backdrop, ajustar para `bg-gray-900/40 backdrop-blur-sm` (em vez de `bg-black/50` puro) — torna o drawer parecer integrado, não modal.

    NOTA: NÃO tocar em lógica de tabs, state, handlers (`handleSave`, `handleDelete`, etc.), nem em MOCK data. Apenas classes CSS e pequeno bloco JSX para o indicador "Chat ativo".

    Se encontrar ambiguidade em qual `<div>` é o header/painel, priorizar o que contém `isOpen` check + botão de close (`<CloseIcon>`).
  </action>
  <verify>
    <automated>rtk tsc --noEmit</automated>
  </verify>
  <done>
    - LeadDrawer tem largura maior (440-480px em telas grandes)
    - Borda-left brand + shadow-2xl presente
    - Header do drawer tem gradient suave brand + avatar maior + indicador "Chat ativo" pulsante
    - Backdrop mais suave com blur
    - `rtk tsc --noEmit` sem novos erros
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Verificação visual da hierarquia UX</name>
  <what-built>
    - Toggle Grid/Kanban visível no header (Grid proeminente brand-500, Kanban secundário cinza)
    - Lead selecionado com ring brand-500 no grid E no kanban
    - Cards do kanban com peso visual reduzido (bg translúcido, score bar opacity-70, cores suaves)
    - LeadDrawer visualmente destacado como elemento essencial (largura maior, shadow-2xl, header com gradient + dot "Chat ativo")
  </what-built>
  <how-to-verify>
    1. Rodar `rtk pnpm dev` e abrir http://localhost:3000/cockpit/leads
    2. **Grid default**: confirmar que carrega view de tabela por padrão
    3. **Toggle**: clicar no botão "Kanban" no header — deve trocar view sem perder estado de filtros. Grid deve estar visualmente mais "pesado" (bg brand-500), Kanban mais discreto
    4. **Highlight**: clicar num lead no grid — drawer abre + linha da tabela com ring brand. Fechar drawer, trocar para Kanban, clicar em outro lead — card com ring brand-500.
    5. **Peso do Kanban**: comparar visualmente colunas/cards do kanban antes (era mais "cheio") e agora — cards devem parecer mais leves, cor de fundo suave.
    6. **Chat lateral**: drawer deve parecer um "painel essencial" (shadow-2xl visível, borda-left brand sutil, header com gradient, dot pulsante "Chat ativo", avatar maior).
    7. **TailAdmin dark**: tudo deve respeitar paleta dark (sem cores novas fora do design system brand/gray).
  </how-to-verify>
  <resume-signal>Digite "aprovado" ou descreva ajustes necessários</resume-signal>
</task>

</tasks>

<verification>
- `rtk tsc --noEmit` passa sem novos erros de tipo
- Visualmente: Grid default, toggle visível com hierarquia clara, highlight brand-500 no lead selecionado (grid + kanban), kanban com peso reduzido, drawer destacado como essencial
- Nenhum componente fora de `src/components/yzihub/` foi tocado
- Nenhum novo design token criado (apenas classes TailAdmin existentes: brand, gray, ring, shadow, opacity)
</verification>

<success_criteria>
- Grid é a view padrão e toggle Grid/Kanban é visível no header com hierarquia clara
- Lead selecionado recebe highlight ring-brand-500 em AMBAS as views
- Cards do kanban têm peso visual reduzido (bg translúcido, score bar com opacity, cores mais suaves)
- LeadDrawer aparenta ser elemento essencial: largura 440-480px, shadow-2xl, borda brand-500/30, header com gradient + indicador pulsante
- Todas as mudanças são classes Tailwind / pequenos ajustes JSX — NENHUMA refatoração estrutural
- Sem regressão em: filtros, KPI strip, drag&drop do kanban, tabs do drawer, persistência de drawer state
</success_criteria>

<output>
After completion, create `.planning/quick/260415-vau-ajustes-de-ux-e-hierarquia-na-tela-de-le/260415-vau-SUMMARY.md` documentando:
- Lista de classes trocadas por componente
- Antes/depois visual (descrição)
- Que props foram adicionadas (selectedLeadId)
- Qualquer ajuste que divergiu do plano e por quê
</output>
