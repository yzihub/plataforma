---
phase: quick-260501-vnn
plan: 01
subsystem: wordpress-webhook
tags: [php, snippet, wordpress, jetengine, webhook, imoveis]
dependency_graph:
  requires: [260501-ufh]
  provides: [snippet-php-corrigido-pronto-para-instalacao]
  affects: [wordpress-jurema]
tech_stack:
  added: []
  patterns: [php-fallback-chain, wordpress-meta-fields]
key_files:
  modified:
    - .planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/yziws-webhook-imoveis.php
    - .planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/INSTALACAO.md
decisions:
  - "Cadeia de fallback para id_imovel: codigo-do-imovel (JetEngine real) → id_imovel (legacy) → _id_imovel (legacy underscore) → slug → post-{ID}"
  - "CPT default corrigido de 'imovel' para 'imoveis' em todo o snippet e documentacao"
metrics:
  duration: 205s
  completed: 2026-05-02T01:54:42Z
  tasks_completed: 2
  files_modified: 2
---

# Phase quick-260501-vnn Plan 01: Corrigir Snippet Final Imoveis Summary

**One-liner:** Snippet PHP corrigido com fallback `codigo-do-imovel` (JetEngine real) como prioridade e CPT default `imoveis` em todas as ocorrencias.

---

## What Was Done

Duas correcoes cirurgicas no snippet PHP `yziws-webhook-imoveis.php` antes da instalacao no WordPress da Jurema Brokers, sem alterar nenhuma outra logica do arquivo.

---

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Corrigir snippet PHP — fallback codigo-do-imovel + CPT default imoveis | `7700468` | yziws-webhook-imoveis.php |
| 2 | Atualizar INSTALACAO.md — CPT default imoveis | `16f90fc` | INSTALACAO.md |

---

## Changes Summary

### Task 1 — yziws-webhook-imoveis.php

**Correcao 1: `yziws_get_cpt`**

```diff
- *   // Opcional: define('YZIWS_CPT', 'imovel'); // default 'imovel'
+ *   // Opcional: define('YZIWS_CPT', 'imoveis'); // default 'imoveis'

- * Retorna o CPT configurado, com fallback para 'imovel'.
+ * Retorna o CPT configurado, com fallback para 'imoveis'.

- return defined( 'YZIWS_CPT' ) ? YZIWS_CPT : 'imovel';
+ return defined( 'YZIWS_CPT' ) ? YZIWS_CPT : 'imoveis';
```

**Correcao 2: `yziws_get_id_imovel`**

```diff
- * Tenta: meta 'id_imovel' → slug do post → 'post-{ID}'.
+ * Tenta na ordem: meta 'codigo-do-imovel' (JetEngine real) →
+ * meta 'id_imovel' (legacy) → meta '_id_imovel' (legacy underscore) →
+ * slug do post → 'post-{ID}'.

- function yziws_get_id_imovel( $post ) {
-     $meta = get_post_meta( $post->ID, 'id_imovel', true );
-
-     if ( ! empty( $meta ) ) {
-         return substr( (string) $meta, 0, 100 );
-     }
-
-     if ( ! empty( $post->post_name ) ) {
-         return substr( $post->post_name, 0, 100 );
-     }
-
-     return 'post-' . $post->ID;
- }
+ function yziws_get_id_imovel( $post ) {
+     $candidates = array(
+         get_post_meta( $post->ID, 'codigo-do-imovel', true ),
+         get_post_meta( $post->ID, 'id_imovel', true ),
+         get_post_meta( $post->ID, '_id_imovel', true ),
+     );
+
+     foreach ( $candidates as $candidate ) {
+         if ( $candidate === null || $candidate === false ) {
+             continue;
+         }
+         $value = trim( (string) $candidate );
+         if ( $value !== '' ) {
+             return substr( $value, 0, 100 );
+         }
+     }
+
+     if ( ! empty( $post->post_name ) ) {
+         return substr( $post->post_name, 0, 100 );
+     }
+
+     return 'post-' . $post->ID;
+ }
```

**Preservado (nao alterado):**
- `YZIWS_TENANT_ID = '82cc7aa9-fc6e-4f37-8d8e-8a71c1691361'`
- Payload com campo `'evento'` (linha 246)
- Funcoes `yziws_to_float_or_null`, `yziws_to_string_or_null`, `yziws_build_data_payload`
- Hooks `save_post`, `transition_post_status`, `before_delete_post`
- `yziws_can_send`, `yziws_send_webhook`

### Task 2 — INSTALACAO.md

4 substituicoes pontuais (singular `imovel` → plural `imoveis` como CPT default):

| Secao | Linha | Antes | Depois |
|-------|-------|-------|--------|
| Pre-requisitos | 15 | CPT `imovel` | CPT `imoveis` |
| Constantes (secao 2) | 35 | NAO for `'imovel'` | NAO for `'imoveis'` |
| Constantes (secao 2) | 36 | `'imovel'` | `'imoveis'` |
| Customizar CPT (secao 4) | 63 | CPT `imovel` | CPT `imoveis` |
| Customizar CPT (secao 4) | 71 | usa `imovel` | usa `imoveis` |

**Preservado:** Troubleshooting, comandos curl, secao 7 (Limitacoes), secao 8 (Proximo passo).

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Known Stubs

None — snippet pronto para instalacao no WordPress da Jurema Brokers.

---

## Verification Results

- PHP syntax: verificado manualmente (PHP nao disponivel no ambiente de CI; logica correta confirmada por leitura do codigo)
- `grep 'codigo-do-imovel'`: 2 ocorrencias corretas (phpdoc + dentro de `$candidates`)
- `grep "'imoveis'"`: 3 ocorrencias corretas (header, phpdoc, return)
- `grep "'imovel'"` (como CPT default): 0 ocorrencias
- `grep "'evento'"`: 1 ocorrencia preservada no payload
- INSTALACAO.md: 0 matches de CPT singular `imovel` como default

## Self-Check: PASSED

- SUMMARY.md: presente em `.planning/quick/260501-vnn-corrigir-snippet-final-im-veis/260501-vnn-SUMMARY.md`
- Commit `7700468`: yziws-webhook-imoveis.php corrigido
- Commit `16f90fc`: INSTALACAO.md alinhado
