---
phase: quick-260501-vnn
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/yziws-webhook-imoveis.php
  - .planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/INSTALACAO.md
autonomous: true
requirements:
  - VNN-01
  - VNN-02
  - VNN-03

must_haves:
  truths:
    - "Snippet resolve id_imovel preferindo o meta JetEngine 'codigo-do-imovel' antes de qualquer fallback"
    - "Quando 'codigo-do-imovel' esta vazio, o snippet cai para 'id_imovel', depois '_id_imovel', depois slug, depois 'post-{ID}'"
    - "Constante YZIWS_CPT tem 'imoveis' como valor padrao (nao 'imovel')"
    - "Payload enviado ao endpoint usa o campo 'evento' (nao 'event' nem 'type')"
    - "INSTALACAO.md descreve o CPT padrao como 'imoveis' e nao menciona o fallback antigo de id_imovel"
  artifacts:
    - path: ".planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/yziws-webhook-imoveis.php"
      provides: "Snippet PHP corrigido com fallback codigo-do-imovel + CPT default imoveis"
      contains: "codigo-do-imovel"
    - path: ".planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/INSTALACAO.md"
      provides: "Documentacao alinhada ao snippet corrigido"
  key_links:
    - from: "yziws_get_id_imovel"
      to: "get_post_meta(post_id, 'codigo-do-imovel')"
      via: "primeira tentativa antes de fallbacks"
      pattern: "codigo-do-imovel"
    - from: "yziws_get_cpt"
      to: "constante YZIWS_CPT"
      via: "default 'imoveis' quando constante ausente"
      pattern: "'imoveis'"
---

<objective>
Corrigir o snippet PHP `yziws-webhook-imoveis.php` antes de instalar no WordPress.

Purpose: O snippet final precisa refletir o nome real do meta field do JetEngine
(`codigo-do-imovel`) e o nome real do CPT no WordPress da Jurema Brokers (`imoveis`).
Sem essa correcao, o snippet vai gerar IDs errados (caindo no slug ou em `post-{ID}`)
e nao vai disparar para o CPT correto.

Output: snippet PHP corrigido + INSTALACAO.md alinhado, prontos para instalacao via
plugin Code Snippets no WordPress da Jurema.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/yziws-webhook-imoveis.php
@.planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/INSTALACAO.md

<interfaces>
<!-- Trechos load-bearing do snippet atual que serao modificados. -->

Funcao a corrigir (linhas 73-85 do snippet atual):
```php
function yziws_get_id_imovel( $post ) {
    $meta = get_post_meta( $post->ID, 'id_imovel', true );

    if ( ! empty( $meta ) ) {
        return substr( (string) $meta, 0, 100 );
    }

    if ( ! empty( $post->post_name ) ) {
        return substr( $post->post_name, 0, 100 );
    }

    return 'post-' . $post->ID;
}
```

Funcao a corrigir (linha 35-37 do snippet atual):
```php
function yziws_get_cpt() {
    return defined( 'YZIWS_CPT' ) ? YZIWS_CPT : 'imovel';
}
```

Confirmacoes (NAO alterar):
- Linha 234 do snippet usa `'evento' => $evento` — ja correto.
- Linhas 357-360 registram os hooks save_post / transition_post_status / before_delete_post — ja corretos.
- Constante YZIWS_TENANT_ID = '82cc7aa9-fc6e-4f37-8d8e-8a71c1691361' — ja correta para Jurema.
</interfaces>

Tenant Jurema Brokers (ja hardcoded no snippet): `82cc7aa9-fc6e-4f37-8d8e-8a71c1691361`
Endpoint alvo: `POST https://plataforma.yzihub.com/api/webhook/imoveis`
CPT real do JetEngine na Jurema: `imoveis` (plural)
Meta field real do JetEngine para id externo: `codigo-do-imovel` (com hifens)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Corrigir snippet PHP — fallback de id_imovel + CPT default imoveis</name>
  <files>.planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/yziws-webhook-imoveis.php</files>
  <action>
Aplicar duas correcoes cirurgicas no snippet PHP. NAO alterar nada alem do escopo abaixo.

**Correcao 1 — Funcao `yziws_get_cpt` (linhas ~30-37):**

Trocar o valor default da constante `YZIWS_CPT` de `'imovel'` para `'imoveis'`.

Atualizar tambem o comentario de exemplo no header do arquivo (linha ~12), de:
```
// Opcional: define('YZIWS_CPT', 'imovel'); // default 'imovel'
```
para:
```
// Opcional: define('YZIWS_CPT', 'imoveis'); // default 'imoveis'
```

E atualizar o phpdoc da funcao (linha ~32) para refletir o novo default `imoveis`.

Codigo final esperado:
```php
function yziws_get_cpt() {
    return defined( 'YZIWS_CPT' ) ? YZIWS_CPT : 'imoveis';
}
```

**Correcao 2 — Funcao `yziws_get_id_imovel` (linhas ~65-85):**

Substituir a resolucao atual pela cadeia completa de fallback, na ordem:
1. meta `codigo-do-imovel` (campo real do JetEngine — PRIORIDADE)
2. meta `id_imovel` (legacy / fallback antigo)
3. meta `_id_imovel` (legacy underscore — meta interno)
4. slug do post (`$post->post_name`)
5. ultimo recurso: `'post-' . $post->ID`

Cada candidato deve passar por `trim` e `! empty` antes de aceitar. Truncar para 100 caracteres no retorno final.

Atualizar o phpdoc da funcao para refletir a nova cadeia de fallback.

Codigo final esperado:
```php
/**
 * Resolve o identificador unico do imovel.
 * Tenta na ordem: meta 'codigo-do-imovel' (JetEngine real) →
 * meta 'id_imovel' (legacy) → meta '_id_imovel' (legacy underscore) →
 * slug do post → 'post-{ID}'.
 * Trunca para no maximo 100 caracteres.
 *
 * @param WP_Post $post Objeto do post WordPress.
 * @return string Identificador do imovel.
 */
function yziws_get_id_imovel( $post ) {
    $candidates = array(
        get_post_meta( $post->ID, 'codigo-do-imovel', true ),
        get_post_meta( $post->ID, 'id_imovel', true ),
        get_post_meta( $post->ID, '_id_imovel', true ),
    );

    foreach ( $candidates as $candidate ) {
        if ( $candidate === null || $candidate === false ) {
            continue;
        }
        $value = trim( (string) $candidate );
        if ( $value !== '' ) {
            return substr( $value, 0, 100 );
        }
    }

    if ( ! empty( $post->post_name ) ) {
        return substr( $post->post_name, 0, 100 );
    }

    return 'post-' . $post->ID;
}
```

**NAO mexer em:**
- payload do `yziws_send_webhook` (campo `'evento'` ja correto)
- `YZIWS_TENANT_ID` (ja correto)
- registro dos hooks WordPress (`save_post`, `transition_post_status`, `before_delete_post`)
- funcoes `yziws_to_float_or_null`, `yziws_to_string_or_null`, `yziws_build_data_payload`
- estrutura do `yziws_can_send` e dos callbacks dos hooks
  </action>
  <verify>
    <automated>cd "D:\dev\plataforma" && php -l ".planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/yziws-webhook-imoveis.php"</automated>

Checks adicionais (manual, rapidos via grep):
- `grep -n "codigo-do-imovel" yziws-webhook-imoveis.php` deve retornar 1 ocorrencia (dentro de yziws_get_id_imovel).
- `grep -n "'imoveis'" yziws-webhook-imoveis.php` deve retornar pelo menos 1 ocorrencia (default da yziws_get_cpt).
- `grep -n "'imovel'" yziws-webhook-imoveis.php` NAO deve mais aparecer como default da yziws_get_cpt.
- `grep -n "'evento'" yziws-webhook-imoveis.php` continua aparecendo (preservado).
  </verify>
  <done>
- Snippet passa em `php -l` sem erro de sintaxe.
- `yziws_get_id_imovel` tenta `codigo-do-imovel` PRIMEIRO, depois `id_imovel`, depois `_id_imovel`, depois slug, depois `post-{ID}`.
- `yziws_get_cpt` retorna `'imoveis'` como default.
- Comentario de exemplo no header e phpdoc das funcoes atualizados.
- Nenhum outro trecho do snippet foi modificado.
  </done>
</task>

<task type="auto">
  <name>Task 2: Atualizar INSTALACAO.md — CPT default imoveis</name>
  <files>.planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/INSTALACAO.md</files>
  <action>
Alinhar a documentacao ao snippet corrigido. Apenas substituicoes pontuais — NAO reescrever o documento.

**Substituicoes a aplicar:**

1. Linha ~15 (Pre-requisitos): trocar
   `Plugin JetEngine configurado com o CPT \`imovel\` (ou o nome customizado do seu CPT).`
   por
   `Plugin JetEngine configurado com o CPT \`imoveis\` (ou o nome customizado do seu CPT).`

2. Linha ~36 (Constantes obrigatorias): trocar o comentario
   `// Opcional — somente se o CPT do JetEngine NAO for 'imovel':`
   por
   `// Opcional — somente se o CPT do JetEngine NAO for 'imoveis':`
   E o exemplo logo abaixo:
   `// define('YZIWS_CPT', 'imovel');`
   por
   `// define('YZIWS_CPT', 'imoveis');`

3. Linha ~63 (Customizar o CPT): trocar
   `Por padrao, o snippet escuta apenas posts do CPT \`imovel\`.`
   por
   `Por padrao, o snippet escuta apenas posts do CPT \`imoveis\`.`

4. Linha ~71 (final da secao 4): trocar
   `Sem essa constante, o snippet usa \`imovel\` como valor padrao.`
   por
   `Sem essa constante, o snippet usa \`imoveis\` como valor padrao.`

5. Linha ~79 (validacao manual, secao 5.1): trocar
   `Acessar \`wp-admin\` > **Imoveis** (ou o menu do CPT configurado).`
   — manter como esta (ja diz "Imoveis" capitalizado, refere-se ao label do menu, nao ao slug do CPT).

**NAO alterar:**
- Secao 6 (Troubleshooting) — nenhuma das mensagens de erro menciona fallback de id_imovel.
- Secao 7 (Limitacoes) — tenant fixo continua o mesmo.
- Comandos curl da secao 5.2 — `id_imovel: TESTE_INEXISTENTE` e apenas exemplo.
- Nenhuma referencia a fallback antigo (slug → post-ID) precisa ser removida — INSTALACAO.md
  nao documenta o algoritmo interno de resolucao do id_imovel.
  </action>
  <verify>
    <automated>cd "D:\dev\plataforma" && grep -n "imoveis" ".planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/INSTALACAO.md" && echo "---" && grep -nE "CPT \`imovel\`|'imovel'|usa \`imovel\`" ".planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/INSTALACAO.md" || echo "OK: nenhum imovel-singular como CPT default restante"</automated>

Esperado:
- Pelo menos 4 ocorrencias de `imoveis` (nas posicoes corrigidas).
- Zero matches de `CPT \`imovel\``, `'imovel'` ou `usa \`imovel\`` (usos como CPT default).
- Outras palavras como "imoveis" no plural ou "Imoveis" como label de menu permanecem intactas.
  </verify>
  <done>
- INSTALACAO.md descreve consistentemente o CPT padrao como `imoveis` (plural).
- Nenhuma referencia ao CPT default antigo `imovel` (singular) sobrou no texto.
- Estrutura, comandos curl e secoes de troubleshooting preservados.
  </done>
</task>

</tasks>

<verification>
Apos as duas tasks:

1. `php -l yziws-webhook-imoveis.php` retorna `No syntax errors detected`.
2. Diff do snippet mostra apenas alteracoes em:
   - comentario do header (linha ~12)
   - phpdoc + corpo de `yziws_get_cpt`
   - phpdoc + corpo de `yziws_get_id_imovel`
3. Diff do INSTALACAO.md mostra apenas as 4 substituicoes pontuais (singular → plural).
4. Os campos do payload (`evento`, `tenant_id`, `id_imovel`, `data`) continuam intactos.
5. O tenant Jurema (`82cc7aa9-fc6e-4f37-8d8e-8a71c1691361`) continua hardcoded.

NAO executar:
- Instalacao no WordPress.
- Chamadas ao endpoint `/api/webhook/imoveis`.
- Alteracoes em qualquer outro arquivo do projeto.
</verification>

<success_criteria>
- Snippet PHP corrigido com fallback `codigo-do-imovel` → `id_imovel` → `_id_imovel` → slug → `post-{ID}`.
- `YZIWS_CPT` default = `'imoveis'`.
- Payload preserva campo `evento` e tenant Jurema.
- INSTALACAO.md descreve CPT default como `imoveis`.
- Snippet pronto para copiar/colar no plugin Code Snippets do WordPress da Jurema.
</success_criteria>

<output>
After completion, create `.planning/quick/260501-vnn-corrigir-snippet-final-im-veis/260501-vnn-SUMMARY.md`
listing exatamente o que mudou no snippet e no INSTALACAO.md, com diffs resumidos das 2 funcoes corrigidas.
</output>
