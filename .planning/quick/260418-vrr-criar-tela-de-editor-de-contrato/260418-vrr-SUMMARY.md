---
phase: quick-260418-vrr
plan: 01
subsystem: contracts/editor
tags: [contracts, editor, templates, next.js, supabase]
key-files:
  created:
    - src/types/contract-templates.ts
    - src/lib/contracts/templates.ts
    - src/app/api/contracts/templates/route.ts
    - src/app/api/contracts/draft/route.ts
    - src/app/api/contracts/[id]/pdf/route.ts
    - src/app/api/leads/[id]/route.ts (GET adicionado)
    - src/app/api/brokers/[id]/route.ts
    - src/app/cockpit/contratos/novo/page.tsx
    - src/components/yzihub/Contratos/ContratoEditor.tsx
    - src/components/yzihub/Contratos/ContratoEditorSidebar.tsx
    - src/components/yzihub/Contratos/ContratoEditorPreview.tsx
  modified:
    - src/components/yzihub/Contratos/GerarContratoDrawer.tsx
decisions:
  - Usar notas (notes) para armazenar body editado — sem nova coluna (TODO para coluna dedicada futura)
  - PDF como stub 501 — placeholder limpo em vez de alert no frontend
  - GET /api/leads/[id] adicionado ao route existente (só PATCH+DELETE existia)
  - Filtrar imóvel por id no client (fetch /api/imoveis e filtra array) — evita novo endpoint
metrics:
  duration: "~45min"
  completed_date: "2026-04-18"
  tasks: 3
  files: 12
---

# Phase quick-260418-vrr Plan 01: Editor de Contrato — SUMMARY

**One-liner:** Editor de contrato em 3 colunas com templates jurídicos pré-preenchidos, preview em tempo real e ações salvar rascunho / gerar+enviar via job_queue.

## O que foi construído

### Infraestrutura (Task 1)

**`src/types/contract-templates.ts`** — Catálogo com 3 templates:
- `compra_venda_padrao` — Compra e Venda, type=venda, ~50 linhas de texto jurídico-base
- `locacao` — Locação Residencial, type=locacao, ~50 linhas
- `exclusividade` — Exclusividade de Venda, type=servico, ~55 linhas

Todos com placeholders `{{comprador}}`, `{{imovel}}`, `{{corretor}}`, `{{valor}}`, `{{comissao}}`, `{{data}}`.

**`src/lib/contracts/templates.ts`** — Helpers:
- `getTemplate(id)` — busca por id
- `renderTemplate(body, vars)` — substitui `{{key}}` pelos valores reais
- `formatBRL(value)` — formata como moeda BRL
- `formatDate(iso)` — formata data ISO como DD/MM/AAAA

**Endpoints novos:**
- `GET /api/contracts/templates` — lista resumida (id, label, type)
- `GET /api/contracts/templates?id=X` — template completo com body
- `POST /api/contracts/draft` — salva rascunho em `contracts` (status='rascunho', notes=body editado, indexado por lead_id/project_id/broker_id)
- `GET /api/contracts/[id]/pdf` — stub 501 (placeholder para geração futura)
- `GET /api/leads/[id]` — adicionado ao route existente (só PATCH/DELETE existiam)
- `GET /api/brokers/[id]` — novo endpoint para buscar corretor individual

### Tela do Editor (Task 2)

**Rota:** `/cockpit/contratos/novo?lead_id=X&property_id=Y&broker_id=Z`

**Layout 3 colunas:**
- **Coluna 1 (280px):** `ContratoEditorSidebar` — seletor de template + dados pré-preenchidos readonly (comprador, imóvel, corretor, valor, comissão 5%)
- **Coluna 2 (flex):** `textarea` com fonte mono para edição livre
- **Coluna 3 (360px):** `ContratoEditorPreview` — whitespace-pre-wrap, fonte serif, atualização em tempo real

**Carregamento paralelo:** templates + lead + imóvel + corretor via `Promise.all`.

**Ações disponíveis no header:**
- **Voltar** — `router.back()`
- **Gerar PDF** — abre `/api/contracts/[draftId]/pdf` (stub 501); exige rascunho salvo primeiro
- **Salvar Rascunho** — POST `/api/contracts/draft`, exibe toast de sucesso, armazena draftId para PDF
- **Gerar e Enviar** — POST `/api/contracts/generate`, redireciona para `/cockpit/contratos` após sucesso

### Adaptação do GerarContratoDrawer (Task 3)

**Antes:** Drawer com form de 8 campos (modelo, vendedor, valor, forma_pagamento, observacoes, canais) + POST direto ao `/api/contracts/generate`.

**Depois:** Drawer "trampolim" com:
- Card resumo (comprador, imóvel, corretor, valor, comissão 5%) — visual readonly
- Mensagem explicativa sobre o editor completo
- Botão **"Abrir Editor"** → `router.push(/cockpit/contratos/novo?lead_id=...&property_id=...&broker_id=...)` + `onClose()`
- Botão **"Cancelar"** → `onClose()`
- Validação visual: lista itens faltando em vermelho se lead/imóvel/corretor ausentes

**Assinatura de props inalterada:** `{ isOpen, onClose, lead, brokerId, brokerName, propertyId, propertyTitle }` — zero quebra de compatibilidade com LeadDrawer e ContractsClient.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] GET /api/leads/[id] inexistente**
- **Found during:** Task 2 — ContratoEditor precisava buscar lead individual
- **Issue:** Route `/api/leads/[id]` só tinha PATCH e DELETE; sem GET o editor não conseguia carregar dados do lead
- **Fix:** Adicionado GET handler no mesmo arquivo `src/app/api/leads/[id]/route.ts`
- **Commit:** 2616d38

**2. [Rule 3 - Blocking] GET /api/brokers/[id] inexistente**
- **Found during:** Task 2 — ContratoEditor precisava buscar corretor individual
- **Issue:** `/api/brokers` só listava todos; sem endpoint por id o editor não conseguia carregar o corretor
- **Fix:** Criado `src/app/api/brokers/[id]/route.ts` com GET handler
- **Commit:** 2616d38

## Known Stubs

| Stub | Arquivo | Motivo |
|------|---------|--------|
| `GET /api/contracts/[id]/pdf` retorna 501 | `src/app/api/contracts/[id]/pdf/route.ts` | Geração de PDF não implementada — requer puppeteer ou serviço externo; placeholder limpo que não bloqueia o fluxo principal |
| `notes` usado como `body` do contrato | `POST /api/contracts/draft` | Tabela `contracts` não tem coluna `content`/`body` dedicada; TODO marcado no código para migração futura |

## Commits

| Hash | Task | Descrição |
|------|------|-----------|
| 2616d38 | Task 1 | Infraestrutura de templates e APIs de contrato |
| c0c5138 | Task 2 | Tela editor 3 colunas sidebar+editor+preview |
| 3960e9a | Task 3 | GerarContratoDrawer adaptado como trampolim |

## Self-Check: PASSED
