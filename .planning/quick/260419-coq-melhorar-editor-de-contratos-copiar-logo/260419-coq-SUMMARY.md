---
phase: quick-260419-coq
plan: 01
subsystem: contratos
tags: [contratos, editor, preview, sidebar, mocks, logos, jurema]
dependency_graph:
  requires: [quick-260419-bq3]
  provides: [editor-contrato-completo, logos-jurema, seletores-reais, preview-documento]
  affects: [src/components/yzihub/Contratos]
tech_stack:
  added: []
  patterns: [SearchSelect generico com fetch lazy, mocks automaticos por IDs null, folha de papel simulada]
key_files:
  created:
    - public/images/jurema/logo-white.svg
    - public/images/jurema/logo-black.svg
  modified:
    - src/components/yzihub/Contratos/ContratoEditor.tsx
    - src/components/yzihub/Contratos/ContratoEditorSidebar.tsx
    - src/components/yzihub/Contratos/ContratoEditorPreview.tsx
decisions:
  - Logos padronizadas em ingles (logo-white/logo-black) para consistencia com convencao public/images/logo/
  - Folha de papel sempre branca (logo preta fixa) — simula documento impresso em ambos os temas
  - Mocks aplicados sincronamente antes do Promise.all no mount; substituidos ao selecionar item real
  - Guard em handleSaveDraft/handleGenerateAndSend bloqueia IDs mock (startsWith("mock-")) evitando persistencia de dados falsos
  - SearchSelect generico TypeScript evita triplicar codigo para Lead/Imovel/Corretor
  - extractLeads/extractImoveis/extractBrokers definidos fora do componente para evitar re-criacao nas renders
metrics:
  duration: ~25min
  completed: "2026-04-19"
  tasks: 3
  files: 5
---

# Phase quick-260419-coq Plan 01: Melhorar Editor de Contratos — Logos, Seletores e Preview

**One-liner:** Editor de contratos com logos Jurema copiadas para /public, 3 comboboxes de busca (Lead/Imovel/Corretor) alimentados pelas APIs reais, mocks automaticos quando IDs sao null, e preview estilo folha de papel A4 com logo preta centralizada no topo.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Copiar logos Jurema Brokers para public/ | 2af1e2e | public/images/jurema/logo-white.svg, logo-black.svg |
| 2 | Seletores de Lead/Imovel/Corretor na Sidebar + Mocks | 3d2707d | ContratoEditor.tsx, ContratoEditorSidebar.tsx |
| 3 | Preview estilo documento Word (folha de papel + logo) | decab1a | ContratoEditorPreview.tsx |

## What Was Built

### Task 1 — Logos
Copiados os dois SVGs da marca Jurema Brokers de `d:/YZIHUB/CLAUDE/JUREMA BROKERS/MARCA/` para `public/images/jurema/`:
- `logo-white.svg` — para uso em fundos escuros (dark mode)
- `logo-black.svg` — para uso em fundos claros e na folha de papel

### Task 2 — Seletores e Mocks

**ContratoEditor.tsx:**
- Constantes `MOCK_LEAD`, `MOCK_PROPERTY`, `MOCK_BROKER` adicionadas (valores representativos: "Joao Silva (Mock)", "Sitio Sao Joao (Mock)", "Luana Corretor (Mock)", R$ 850.000)
- `useEffect` aplica mocks sincronamente quando `leadId`/`propertyId`/`brokerId` sao null; fetch real substitui se IDs presentes
- Callbacks `handleSelectLead`/`handleSelectProperty`/`handleSelectBroker` passados a sidebar
- `canSaveDraft`/`canGenerate` agora usam state (`lead`, `property`, `broker`) ao inves de URL params
- Guard nos handlers: IDs que iniciam com `"mock-"` bloqueiam save/generate com mensagem clara

**ContratoEditorSidebar.tsx:**
- Props expandidas: `onSelectLead?`, `onSelectProperty?`, `onSelectBroker?`
- Componente interno `SearchSelect<T>` generico com:
  - Fetch lazy no foco (so a primeira vez, depois filtra client-side)
  - Dropdown com maximo 8 items visiveis, overflow scroll
  - Botao "x" para limpar selecao
  - Click-outside fecha dropdown (useRef + useEffect)
  - Sincronizacao automatica de query com valor externo via useEffect
- 3 instancias: Lead → `/api/leads`, Imovel → `/api/imoveis?status_publicacao=Publicado`, Corretor → `/api/brokers`
- Funcoes de extracao (`extractLeads`, `extractImoveis`, `extractBrokers`) definidas fora do componente

### Task 3 — Preview

**ContratoEditorPreview.tsx:**
- Container externo: `bg-gray-100 dark:bg-gray-800` (fundo cinza simula mesa/desktop)
- Folha interna: `bg-white` SEMPRE (papel e branco mesmo no dark), `max-w-[640px]`, `min-h-[800px]`, `shadow-lg`, `rounded-sm`
- Topo da folha: `<img src="/images/jurema/logo-black.svg" />` centralizada `h-12` + linha decorativa `h-px w-24 bg-gray-300`
- Corpo: `whitespace-pre-wrap font-serif text-[14px] leading-relaxed text-gray-900` (sempre preto sobre papel branco)
- Removido `<pre>` tag — substituido por `<div>` para melhor controle tipografico

## Decisions Made

1. **Logos em ingles:** Padronizadas como `logo-white`/`logo-black` para consistencia com convencao existente em `public/images/logo/`.
2. **Folha sempre branca:** A folha simula papel impresso — logo preta fixa, sem alternancia dark/light dentro da folha.
3. **Mocks sincronos:** Aplicados antes do `Promise.all` para evitar estado "nao vinculado" enquanto templates carregam.
4. **Guard mock IDs:** `startsWith("mock-")` evita persistencia acidental de dados de teste no banco.
5. **SearchSelect generico:** Evita triplicar 100+ linhas de codigo; recebe `extractItems` como callback para lidar com shapes diferentes de cada API.

## Deviations from Plan

None — plano executado exatamente como especificado.

## Known Stubs

None — todos os dados fluem de APIs reais ou mocks explicitamente marcados.

## Self-Check: PASSED

- public/images/jurema/logo-white.svg: FOUND
- public/images/jurema/logo-black.svg: FOUND
- ContratoEditor.tsx: modificado (MOCK_LEAD/MOCK_PROPERTY/MOCK_BROKER, callbacks, guards)
- ContratoEditorSidebar.tsx: modificado (SearchSelect, props expandidas)
- ContratoEditorPreview.tsx: modificado (folha de papel, logo Jurema)
- Commits: 2af1e2e, 3d2707d, decab1a — todos verificados em git log
- `tsc --noEmit`: sem erros novos
