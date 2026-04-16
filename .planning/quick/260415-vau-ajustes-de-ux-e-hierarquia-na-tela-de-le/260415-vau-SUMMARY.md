---
phase: quick-260415-vau
plan: 01
subsystem: leads-ux
tags: [ux, tailwind, leads, kanban, drawer, hierarchy]
tech-stack:
  added: []
  patterns: [conditional-classes, prop-drilling, ring-highlight, gradient-header, ping-animation]
key-files:
  modified:
    - src/components/yzihub/LeadsClient.tsx
    - src/components/yzihub/LeadsDataTable.tsx
    - src/components/yzihub/LeadsKanban.tsx
    - src/components/yzihub/LeadDrawer.tsx
decisions:
  - Toggle Grid/Kanban usa inline-flex com fundo brand-500 ativo para Grid e cinza text-xs para Kanban — hierarquia clara sem peso adicional
  - selectedLeadId propagado via props (sem context) — escopo restrito ao fluxo Leads
  - "Chat ativo" dot pulsante adicionado apenas quando lead!=null (modo edição), não no modo Novo Lead
metrics:
  duration: "~15min"
  completed: "2026-04-15"
  tasks: 3
  files: 4
---

# Phase quick-260415-vau Plan 01: Ajustes UX e Hierarquia na Tela de Leads — Summary

**One-liner:** Toggle Grid/Kanban visível com hierarquia brand/cinza, highlight ring-brand-500 no lead selecionado (grid + kanban), cards kanban com peso visual reduzido e LeadDrawer destacado como elemento essencial com largura 440-480px, borda brand, shadow-2xl e header com gradient + dot pulsante.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 01 | Toggle Grid/Kanban + propagate selectedLeadId | 8dcb2d6 | LeadsClient.tsx |
| 02 | Highlight lead selecionado + reduzir peso visual do kanban | 41bf2e8 | LeadsDataTable.tsx, LeadsKanban.tsx |
| 03 | LeadDrawer como elemento essencial destacado | b703dbd | LeadDrawer.tsx |

## Classes Alteradas por Componente

### LeadsClient.tsx

**Adicionado:**
- Import: `GridIcon, ListIcon` de `@/icons`
- `const [view] = useState` → `const [view, setView] = useState` (ativa setter)
- Toggle `<div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5 dark:border-gray-800 dark:bg-gray-900">` no header
- Botão Grid ativo: `bg-brand-500 text-white shadow-sm`; inativo: `text-gray-500 hover:text-gray-700`
- Botão Kanban ativo: `bg-gray-200 text-gray-700 dark:bg-gray-800`; inativo: `text-gray-400 text-xs`
- Props adicionadas: `selectedLeadId={selectedLead?.id ?? null}` em LeadsDataTable e LeadsKanban

### LeadsDataTable.tsx

**Prop adicionada:** `selectedLeadId?: string | null`

**Linha da tabela — antes:**
```
className="cursor-pointer align-middle border-b ... hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
```

**Linha da tabela — depois:**
```
className={`... ${selectedLeadId === lead.id
  ? "bg-brand-50 ring-1 ring-inset ring-brand-500 dark:bg-brand-500/10"
  : "hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"}`}
```

### LeadsKanban.tsx

**Props adicionadas:** `selectedLeadId?: string | null` em `LeadsKanban`, `KanbanColumn` e `LeadCard`

**LeadCard wrapper — antes:**
```
className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3.5 hover:shadow-md ..."
```

**LeadCard wrapper — depois:**
```
className={`rounded-xl border p-3 ... ${selectedLeadId === lead.id
  ? "border-brand-500 ring-2 ring-brand-500/40 bg-white dark:bg-gray-800 shadow-md"
  : "border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60 hover:shadow-sm ..."}`}
```

**Reduções de peso visual:**
- Avatar: `w-8 h-8 text-xs` → `w-7 h-7 text-[10px]`
- Score bar: `<div className="mb-2.5">` → `<div className="mb-2.5 opacity-70">`
- Footer border: `border-gray-100 dark:border-gray-700` → `border-gray-100/60 dark:border-gray-700/50`
- Coluna bg: `bg-gray-50` → `bg-gray-50/50`
- Coluna top border: `borderTopWidth: "3px"` → `borderTopWidth: "2px"`

### LeadDrawer.tsx

**Drawer wrapper — antes:**
```
w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl
```

**Drawer wrapper — depois:**
```
w-full sm:w-[440px] lg:w-[480px] bg-white dark:bg-gray-900 
border-l-2 border-brand-500/30 dark:border-brand-500/40 
shadow-2xl shadow-brand-500/5
```

**Header — antes:**
```
p-5 border-b border-gray-100 dark:border-gray-800
```

**Header — depois:**
```
p-5 border-b border-gray-200 dark:border-gray-800 
bg-gradient-to-r from-brand-500/5 to-transparent dark:from-brand-500/10 dark:to-transparent
```

**Avatar:** `w-11 h-11 text-sm` → `w-12 h-12 text-base font-bold`

**Nome lead:** `text-base font-semibold text-gray-800 dark:text-white/90` → `text-lg font-bold text-gray-800 dark:text-white`

**Adicionado (badge + dot "Chat ativo"):**
```tsx
<span className="inline-flex items-center gap-1.5 text-xs text-brand-500">
  <span className="relative flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
  </span>
  Chat ativo
</span>
```

**Backdrop:** `bg-black/40` → `bg-gray-900/40 backdrop-blur-sm`

## Antes / Depois Visual

**Toggle de view:**
- Antes: não existia no header — apenas query param `?view=kanban` abria kanban
- Depois: toggle visível no header com Grid proeminente (brand-500) e Kanban discreto (cinza, text-xs)

**Lead selecionado no grid:**
- Antes: nenhum feedback visual de qual linha estava aberta
- Depois: linha com bg-brand-50 e ring-1 ring-brand-500 (destaque sutil mas claro)

**Cards do kanban:**
- Antes: border sólida, bg-white/dark:bg-gray-800, p-3.5, avatar w-8, score bar sem opacity, borderTop 3px
- Depois: bg translúcido (/70 e /60), p-3, avatar w-7, score bar opacity-70, borderTop 2px, hover:shadow-sm

**LeadDrawer:**
- Antes: max-w-lg (512px), header simples sem gradient, avatar w-11, nome text-base, backdrop bg-black/40
- Depois: sm:w-[440px] lg:w-[480px], header com gradient brand sutil, borda-left brand-500/30, shadow-2xl, avatar w-12, nome text-lg font-bold, dot "Chat ativo" pulsante, backdrop com blur

## Props Adicionadas

| Componente | Prop | Tipo |
|------------|------|------|
| LeadsDataTable | `selectedLeadId` | `string \| null \| undefined` |
| LeadsKanban | `selectedLeadId` | `string \| null \| undefined` |
| KanbanColumn (interno) | `selectedLeadId` | `string \| null \| undefined` |
| LeadCard (interno) | `selectedLeadId` | `string \| null \| undefined` |

## Deviations from Plan

None - plan executed exactly as written.

O único detalhe de implementação: o toggle foi posicionado *antes* do botão "Novo Lead" na div de ações (ordem natural de leitura da UI). O plano não especificava a ordem exata dentro do wrapper — optou-se por Grid/Kanban à esquerda, "Novo Lead" à direita.

## Known Stubs

None — nenhum stub novo introduzido. Os mocks existentes em LeadDrawer (MOCK_MSGS, MOCK_TAREFAS, etc.) são pré-existentes e fora do escopo deste plano.

## Self-Check: PASSED

- FOUND: src/components/yzihub/LeadsClient.tsx
- FOUND: src/components/yzihub/LeadsDataTable.tsx
- FOUND: src/components/yzihub/LeadsKanban.tsx
- FOUND: src/components/yzihub/LeadDrawer.tsx
- FOUND commit: 8dcb2d6 (task 01)
- FOUND commit: 41bf2e8 (task 02)
- FOUND commit: b703dbd (task 03)
