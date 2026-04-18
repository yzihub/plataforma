# Quick Task 260418-h4g — Summary

**Task:** conectar GerarContratoDrawer com dados reais do banco (lead, imóvel, corretor)
**Date:** 2026-04-18
**Status:** Completed

## Problem

`GerarContratoDrawer` recebia `propertyTitle={lead?.imovel_ref ?? null}` — o UUID do imóvel, não o título legível. O campo "Imóvel" do contrato era preenchido com um UUID em vez do nome real.

## Fix Applied

### `src/components/yzihub/ImovelSearchSelect.tsx`
- Adicionado prop `onResolve?: (imovel: N8nImovel | null) => void`
- `useEffect` que dispara quando a lista de imóveis carrega e `value` já está setado — cobre leads existentes com `imovel_ref` persistido

### `src/components/yzihub/LeadDrawer.tsx`
- `TabDados`: novo prop `onImovelSelect` — propaga seleção/resolução/reset ao pai
- Ambos os `ImovelSearchSelect` em `TabDados` recebem `onResolve` e `onChange` corrigidos
- `LeadDrawer` (default export): state `selectedImovel: N8nImovel | null`, passa `onImovelSelect` ao `TabDados`
- Linha corrigida: `propertyTitle={selectedImovel?.titulo_comercial ?? null}`

## Result

| Campo | Antes | Depois |
|-------|-------|--------|
| Imóvel | `3fc9fa2-...` (UUID) | `Apartamento Vista Mar — Tambaú` |
| Comprador | `lead.name` ✓ | `lead.name` ✓ |
| Corretor | `corretores.find(...)?.name` ✓ | idem ✓ |

## Commit
feat(quick-260418-h4g): conectar GerarContratoDrawer com titulo real do imovel
