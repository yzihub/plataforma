# Summary — 260502-r3s: Validar imóveis Jurema no Cockpit

**Resultado geral: PASS (validação automática) + checkpoint humano pendente**

## Contagens

| Supabase (total) | Supabase (filtrado) | API /api/imoveis |
|-----------------|--------------------|--------------------|
| 34 | 34 | 34 |

## Checklist automático

- [x] 34 imóveis no Supabase para tenant Jurema
- [x] Todos os 34 passam nos filtros `Publicado` + `disponivel`
- [x] Todos os 34 têm `id_imovel` no padrão `wp-{numero}` (0 fora do padrão)
- [x] `external_id` usa `metadata.codigo_do_imovel ?? id_imovel` — correto no código
- [x] Fotos: todas via `foto_principal` (imagem_card null em todos) — mapper extrai URL do JSON corretamente
- [x] React keys usam UUID — sem risco de colapso por duplicados
- [x] Typecheck: PASS (npx tsc --noEmit — sem erros)
- [x] Diff: zero arquivos de produção alterados

## INFO (não bloqueia)

- **Duplicados de código comercial:** JP017 (3x), JP009/JP013/JP014/JP016/JP018 (2x cada) — 13 de 34 registros. Origem: WordPress. Não causam colapso no front (React key = UUID).
- **imagem_card null:** todos os 34 usam `foto_principal` como fallback — funciona.

## Checkpoint humano pendente (Task 3)

Para aprovar, acesse http://localhost:3000/cockpit/imoveis e verifique:
1. HTTP 200 em `/api/imoveis` (DevTools)
2. Contador "34 de 34 imóveis"
3. Fotos na Tabela (thumbnails 48x48) e na Grade (cards)
4. Código comercial abaixo do título (ex: `JP004`)
5. 34 linhas/cards sem colapso

Relatório completo: `.planning/quick/260502-r3s-gsd-validar-im-veis-da-jurema-brokers-no/260502-r3s-VALIDATION.md`
