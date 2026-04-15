---
phase: quick-260415-nfv
plan: 01
subsystem: imoveis-ui
tags: [property-card, metrics, tailadmin, dark, yzihub]
dependency_graph:
  requires: []
  provides: [redesigned-property-card, imoveis-metrics-strip]
  affects: [src/components/yzihub/PropertyCard.tsx, src/components/yzihub/ImoveisClient.tsx]
tech_stack:
  added: []
  patterns: [FINALIDADE_CONFIG record lookup, RoomStrip inline component, useMemo metrics, MetricCard inline component]
key_files:
  created: []
  modified:
    - src/components/yzihub/PropertyCard.tsx
    - src/components/yzihub/ImoveisClient.tsx
decisions:
  - Pill finalidade posicionada top-right (não top-left) para não colidir com tipo bottom-left
  - RoomStrip retorna null quando não há campos — sem render vazio
  - MetricCard e formatBRL definidos inline no ImoveisClient (não arquivos separados)
  - price=0 exibe "Sob consulta" em vez de R$ 0,00
metrics:
  duration: ~8 minutes
  completed_date: "2026-04-15"
  tasks_completed: 2
  files_modified: 2
---

# Phase quick-260415-nfv Plan 01: Redesign PropertyCard + Metrics Strip Summary

**One-liner:** PropertyCard redesenhado com pill VENDA/ALUGUEL/TEMPORADA, RoomStrip de ícones e link compacto; ImoveisClient ganhou faixa de 6 MetricCards acima dos filtros.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Redesign PropertyCard com 8 campos elegantes | 571bda9 | src/components/yzihub/PropertyCard.tsx |
| 2 | Adicionar faixa de 6 métricas no ImoveisClient | 4abe9b4 | src/components/yzihub/ImoveisClient.tsx |

## What Changed

### PropertyCard.tsx (Task 1)

**Removido:**
- `STATUS_CONFIG` e badge "Disponível" (redundante — fetch já filtra `status_publicacao = Publicado`)
- Botão CTA full-width "VER NO SITE" e o `div` placeholder vazio
- Bloco de tags cinza `property.tags.map`
- Linha separada de `area_sqm`

**Adicionado:**
- `FINALIDADE_CONFIG` — mapeamento Venda/Aluguel/Temporada para pills coloridas (emerald/sky/purple)
- `RoomStrip` — tira de ícones 🛏🚿🚗📐 parseados dos campos `tags` e `area_sqm`
- Foto `h-44` (era `h-48`) com `hover:scale-105` e `hover:-translate-y-0.5` no card
- Pill finalidade `absolute right-3 top-3` com `backdrop-blur-sm`
- Badge tipo `absolute bottom-3 left-3` (mantido)
- Link compacto `[↗ Site]` na mesma linha do preço, com `e.stopPropagation()` para não abrir drawer

**Fallbacks:**
- Sem foto → ícone casa SVG + texto "Sem imagem" `text-[10px]`
- `price=0` → "Sob consulta"
- Sem `neighborhood` → linha 📍 não renderiza
- Sem `link` → botão Site não renderiza
- Sem tags e sem area → `RoomStrip` retorna null

### ImoveisClient.tsx (Task 2)

**Adicionado (cirúrgico — nada existente foi tocado):**
- Helper `formatBRL` no topo do arquivo
- Componente `MetricCard` inline com 5 variantes de accent (default/green/amber/brand/sky)
- `useMemo metrics` calculando: total, ticketMedio, paraVenda, paraAluguel, topBairro, semFoto
- Grid `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` de 6 MetricCards ANTES do filter bar

**Intactos:**
- fetch Supabase, mapImoveisToProperty, propertyTypes/neighborhoods/filtered useMemos
- selectClass, loading skeleton, filter bar, view toggle, count paragraph
- PropertyTable, PropertyKanban, PropertyDrawer

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- PropertyCard.tsx: FINALIDADE_CONFIG presente, RoomStrip presente, sem STATUS_CONFIG, sem VER NO SITE, sem tags cinza
- ImoveisClient.tsx: formatBRL presente, MetricCard presente, useMemo metrics presente, grid lg:grid-cols-6 presente
- Commits 571bda9 e 4abe9b4 verificados
- TypeScript: zero erros em ambos os arquivos
