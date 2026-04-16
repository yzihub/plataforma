# Quick Task 260416-ln6 — Summary

**Task:** Integração do CorretorDrawer/form com Supabase — corretor pertence ao tenant; só corretor ativo pode ser usado no handoff
**Date:** 2026-04-16
**Commits:** ca782bb (task 1), 136b0f6 (task 2)

## Diffs aplicados

| Arquivo | Mudança |
|---------|---------|
| `src/app/cockpit/pipeline/page.tsx` | `.from("corretores")` → `.from("brokers")` + `.eq("is_active", true)` + `.order("full_name")` |
| `src/components/yzihub/CorretorDrawer.tsx` | Validação full_name ≥ 2 chars + phone normalizado para dígitos (`/\D/g` strip) + disabled button alinhado |
| `src/components/yzihub/CorretoresClient.tsx` | Guard `full_name.trim().length < 2` em handleSave + `is_active: input.is_active ?? true` no insert |

## Verificação

- `rtk tsc --noEmit`: sem novos erros (3 erros pré-existentes em LeadsView/LeadDrawer, não relacionados)
- Pipeline now queries `brokers` table (real) with `is_active=true` — brokers inativos não aparecem no handoff
- Insert sempre carrega `tenant_id` + `is_active` explícito

## Smoke manual esperado

1. `/cockpit/corretores` → criar corretor "Teste QA" → aparece com status Ativo
2. `/cockpit/pipeline` → filtro de corretores inclui "Teste QA"
3. Editar "Teste QA" → desativar (toggle) → salvar
4. `/cockpit/pipeline` (refresh) → "Teste QA" **não** aparece mais no dropdown de handoff
