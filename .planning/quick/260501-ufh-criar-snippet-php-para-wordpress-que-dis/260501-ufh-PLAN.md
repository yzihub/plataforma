---
phase: quick-260501-ufh
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/yziws-webhook-imoveis.php
  - .planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/INSTALACAO.md
autonomous: true
requirements:
  - WP-WEBHOOK-SNIPPET
  - WP-INSTALL-DOCS

must_haves:
  truths:
    - "Snippet PHP esta disponivel como arquivo standalone instalavel via Code Snippets plugin no WordPress"
    - "Snippet dispara imovel.upsert para POST /api/webhook/imoveis quando post do CPT imovel e salvo com status publish"
    - "Snippet dispara imovel.unpublish quando post sai de publish para outro status (draft, trash, pending)"
    - "Snippet dispara imovel.delete quando post e deletado permanentemente (before_delete_post)"
    - "Body enviado ao endpoint cumpre o contrato: evento, tenant_id (hardcoded Jurema), id_imovel (max 100 chars), data com tipos corretos"
    - "metragem e valor sao convertidos para float (number) antes de enviar — endpoint retorna 422 se forem string"
    - "quartos, suites, vagas sao enviados como string (compativeis com schema text do Supabase)"
    - "Header Authorization: Bearer <YZIWS_WEBHOOK_SECRET> e enviado em toda requisicao"
    - "Header X-Source: wordpress e enviado para identificacao nos logs do endpoint"
    - "Snippet e silencioso em producao: error_log apenas em falhas, nunca quebra o admin do WordPress"
    - "Loop infinito e prevenido com flag estatico (yziws_in_progress)"
    - "Snippet filtra apenas o CPT correto via constante YZIWS_CPT (default: imovel)"
    - "INSTALACAO.md documenta passo a passo: instalar via Code Snippets, customizar CPT, testar via curl, troubleshooting de logs"
  artifacts:
    - path: ".planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/yziws-webhook-imoveis.php"
      provides: "Snippet PHP standalone com hooks save_post, transition_post_status, before_delete_post"
      contains: "wp_remote_post"
      min_lines: 100
    - path: ".planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/INSTALACAO.md"
      provides: "Guia de instalacao via Code Snippets, customizacao, testes e troubleshooting"
      min_lines: 60
  key_links:
    - from: "yziws-webhook-imoveis.php"
      to: "POST https://plataforma.yzihub.com/api/webhook/imoveis"
      via: "wp_remote_post com Authorization Bearer YZIWS_WEBHOOK_SECRET"
      pattern: "wp_remote_post.*YZIWS_WEBHOOK_URL"
    - from: "yziws-webhook-imoveis.php"
      to: "wp-config.php constants"
      via: "defined() check em YZIWS_WEBHOOK_SECRET, YZIWS_WEBHOOK_URL, YZIWS_CPT"
      pattern: "defined\\(.YZIWS_"
    - from: "yziws-webhook-imoveis.php"
      to: "JetEngine meta fields"
      via: "get_post_meta($post_id, '<campo>', true) para 16 campos"
      pattern: "get_post_meta"
---

<objective>
Criar snippet PHP standalone (instalavel via Code Snippets plugin no WordPress) que integra JetEngine com o endpoint POST /api/webhook/imoveis ja implementado no Next.js. O snippet escuta hooks de save/transition/delete do CPT de imoveis e dispara webhooks com o contrato exato esperado pelo endpoint (validado em quick-260501-n24).

Purpose: Habilitar sincronizacao automatica e em tempo real do CPT de imoveis do WordPress (Jurema Brokers) com a tabela `imoveis` do Supabase, eliminando workflow n8n intermediario para esse fluxo.

Output: Dois arquivos no diretorio da quick task — snippet PHP pronto para colar no Code Snippets, e guia de instalacao em portugues.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md
@.planning/quick/260501-n24-implementar-endpoint-post-webhook-imovei/260501-n24-SUMMARY.md
@.planning/quick/260501-rg3-preparar-producao-webhook-imoveis/PRODUCAO.md

<interfaces>
<!-- Contrato HTTP do endpoint POST /api/webhook/imoveis (implementado em quick-260501-n24) -->
<!-- O snippet PHP DEVE produzir bodies que satisfazem este contrato. -->

URL: https://plataforma.yzihub.com/api/webhook/imoveis
Method: POST
Headers obrigatorios:
  Authorization: Bearer <YZIWS_WEBHOOK_SECRET>
  Content-Type: application/json
Header recomendado:
  X-Source: wordpress

Body (imovel.upsert):
{
  "evento": "imovel.upsert",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",  // Jurema Brokers — HARDCODED
  "id_imovel": "<post_slug ou meta id_imovel> (max 100 chars)",
  "data": {
    "titulo_comercial": string|null,
    "titulo_seo": string|null,
    "descricao_imovel": string|null,
    "tipo_de_imovel": string|null,
    "finalidade": string|null,
    "bairro": string|null,
    "foto_principal": string|null,
    "link_do_imovel": string|null,
    "link_sanitizado": string|null,
    "imagem_card": string|null,
    "status_publicacao": string|null,
    "status_operacional": string|null,
    "quartos": string|number|null,    // server normaliza para string
    "suites": string|number|null,
    "vagas": string|number|null,
    "metragem": number|null,           // OBRIGATORIO number — string causa 422
    "valor": number|null,              // OBRIGATORIO number — string causa 422
    "metadata": object|null
  }
}

Body (imovel.unpublish e imovel.delete):
{
  "evento": "imovel.unpublish" | "imovel.delete",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "id_imovel": "<post_slug ou meta id_imovel>"
}
// Sem campo "data" (ignorado se enviado)

Respostas esperadas:
  200 OK: { ok: true, action: "upserted"|"delete"|"unpublish", ... }
  401: token invalido
  415: Content-Type errado
  422: validacao de campos (especialmente metragem/valor como string)

Constantes lidas de wp-config.php:
  YZIWS_WEBHOOK_SECRET (string)  — bearer token
  YZIWS_WEBHOOK_URL (string)     — https://plataforma.yzihub.com/api/webhook/imoveis
  YZIWS_CPT (string, opcional)   — default 'imovel'

Tenant Jurema Brokers (constante hardcoded no snippet):
  82cc7aa9-fc6e-4f37-8d8e-8a71c1691361
</interfaces>

<wordpress_context>
- Plugin Code Snippets aceita PHP puro sem `<?php` opening tag (mas aceita com tag tambem)
- Hooks WordPress relevantes:
  - save_post (post_id, post, update) — dispara em criar/atualizar; checar wp_is_post_revision e wp_is_post_autosave
  - transition_post_status (new_status, old_status, post) — dispara em mudanca de status
  - before_delete_post (post_id) — dispara antes do delete permanente; NAO dispara em trash
- get_post_meta($post_id, 'campo', true) retorna string (vazia se nao existe)
- wp_remote_post( $url, [ 'method', 'headers', 'body', 'timeout', 'blocking' ] ) — retorna WP_Error ou response array
- Para evitar bloquear admin: usar timeout curto (10s) e capturar WP_Error com is_wp_error()
- Loop guard: variavel estatica dentro da funcao OU constante define() — preferir static dentro da funcao callback
- post_status valores comuns: publish, draft, pending, trash, auto-draft, future, private, inherit
- post_name (slug) acessivel via $post->post_name; pode ser vazio em rascunhos novos — fallback para post_id
</wordpress_context>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Criar snippet PHP yziws-webhook-imoveis.php com hooks completos</name>
  <files>.planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/yziws-webhook-imoveis.php</files>
  <action>
Criar arquivo PHP standalone com a estrutura abaixo. Seguir EXATAMENTE o contrato HTTP documentado em `<interfaces>`.

ESTRUTURA DO SNIPPET (em ordem):

1. Header de comentario PHPDoc explicando: nome (YZI Webhook Sync — Imoveis), proposito, autor (YZI Hub), versao 1.0.0, dependencias (constantes wp-config.php).

2. Guard "if (!defined('ABSPATH')) exit;" — proteger contra acesso direto.

3. Definir constante interna do tenant Jurema Brokers (hardcoded):
   `if (!defined('YZIWS_TENANT_ID')) { define('YZIWS_TENANT_ID', '82cc7aa9-fc6e-4f37-8d8e-8a71c1691361'); }`

4. Funcao helper `yziws_get_cpt()` que retorna `defined('YZIWS_CPT') ? YZIWS_CPT : 'imovel'`.

5. Funcao helper `yziws_can_send()` que retorna false se faltar YZIWS_WEBHOOK_SECRET ou YZIWS_WEBHOOK_URL — registrando warning UMA VEZ via error_log.

6. Funcao helper `yziws_get_id_imovel($post)`:
   - Tenta `get_post_meta($post->ID, 'id_imovel', true)` primeiro
   - Fallback para `$post->post_name` (slug)
   - Fallback final para `'post-' . $post->ID`
   - Trunca para max 100 chars (substr)

7. Funcao helper `yziws_to_float_or_null($value)`:
   - Se value vazio/null/string vazia → return null
   - Aceita "525.000,00" (formato BR) e "525000.00" — normalizar removendo pontos de milhar e trocando virgula por ponto
   - Retorna `(float) $normalizado` ou null se nao for numerico

8. Funcao helper `yziws_to_string_or_null($value)`:
   - Se value vazio/null → return null
   - Caso contrario, return string com trim aplicado

9. Funcao helper `yziws_build_data_payload($post_id)`:
   - Le os 16 meta fields (text e numeric) via get_post_meta
   - Constroi array com:
     - text fields (titulo_comercial, titulo_seo, descricao_imovel, tipo_de_imovel, finalidade, bairro, foto_principal, link_do_imovel, link_sanitizado, imagem_card, status_publicacao, status_operacional) → yziws_to_string_or_null()
     - quartos, suites, vagas → yziws_to_string_or_null() (manter string)
     - metragem, valor → yziws_to_float_or_null() (DEVE ser number)
     - metadata → null por padrao (nao temos meta especifico, deixar para futuro)
   - Apenas incluir chave no array se valor !== null (evita enviar lista de nulls; envia array enxuto)
   - Retornar o array (pode ser vazio {})

10. Funcao principal `yziws_send_webhook($evento, $id_imovel, $data = null)`:
    - Se !yziws_can_send() → return early (silencioso)
    - Loop guard: variavel `static $in_progress = false`. Se true, return. Setar true antes do request, false no final (use try/finally se necessario, ou via blocos sequenciais).
    - Construir body array:
      ```php
      $body = [
        'evento'    => $evento,
        'tenant_id' => YZIWS_TENANT_ID,
        'id_imovel' => $id_imovel,
      ];
      if ($evento === 'imovel.upsert' && is_array($data)) {
        $body['data'] = $data;
      }
      ```
    - Chamar wp_remote_post(YZIWS_WEBHOOK_URL, [
        'method'  => 'POST',
        'timeout' => 10,
        'blocking' => true,
        'headers' => [
          'Authorization' => 'Bearer ' . YZIWS_WEBHOOK_SECRET,
          'Content-Type'  => 'application/json',
          'X-Source'      => 'wordpress',
        ],
        'body'    => wp_json_encode($body),
      ]);
    - Tratamento de resposta:
      - is_wp_error($response) → error_log com mensagem; retorno silencioso
      - status_code >= 400 → error_log com status_code + body de resposta truncado (max 500 chars)
      - status_code 2xx → silencioso (sucesso)
    - NUNCA throw / nunca quebrar o admin

11. Callback `yziws_on_save_post($post_id, $post, $update)`:
    - Skip se wp_is_post_revision($post_id) ou wp_is_post_autosave($post_id)
    - Skip se $post->post_type !== yziws_get_cpt()
    - Skip se $post->post_status !== 'publish' (handled por transition para outros casos)
    - Chamar yziws_send_webhook('imovel.upsert', yziws_get_id_imovel($post), yziws_build_data_payload($post_id))

12. Callback `yziws_on_transition_post_status($new_status, $old_status, $post)`:
    - Skip se $post->post_type !== yziws_get_cpt()
    - Caso A: old=publish AND new !== publish → enviar imovel.unpublish
    - Caso B: new=publish AND old !== publish → o save_post ja vai disparar upsert; NAO duplicar (return)
    - Para evitar dupla mensagem com save_post, este hook trata APENAS unpublish

13. Callback `yziws_on_before_delete_post($post_id)`:
    - $post = get_post($post_id); if (!$post) return;
    - Skip se $post->post_type !== yziws_get_cpt()
    - Chamar yziws_send_webhook('imovel.delete', yziws_get_id_imovel($post))

14. Registrar hooks (no fim do arquivo):
    ```php
    add_action('save_post', 'yziws_on_save_post', 10, 3);
    add_action('transition_post_status', 'yziws_on_transition_post_status', 10, 3);
    add_action('before_delete_post', 'yziws_on_before_delete_post', 10, 1);
    ```

REGRAS DE QUALIDADE DE CODIGO:
- Prefixar TODAS as funcoes com `yziws_` (YZI Webhook Sync) — evitar colisao
- Nenhuma classe, apenas funcoes (compativel com Code Snippets)
- Nenhuma dependencia externa (composer, etc)
- Nenhum echo / print — apenas error_log
- PHP 7.4+ syntax (compativel com WordPress 6.x runtime mais comum)
- Comentarios em portugues, codigo em ingles (variaveis, funcoes)
- Code header compativel com Code Snippets plugin (PHPDoc no topo)
  </action>
  <verify>
    <automated>powershell -Command "if ((Test-Path '.planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/yziws-webhook-imoveis.php') -and ((Get-Item '.planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/yziws-webhook-imoveis.php').Length -gt 3000)) { exit 0 } else { exit 1 }"</automated>
    Conteudo verificado: arquivo PHP existe, tem mais de 3KB, contem todas as 14 secoes acima.
    Validacao manual de sintaxe: `php -l yziws-webhook-imoveis.php` deve retornar "No syntax errors" (se PHP CLI estiver disponivel).
    Validacao de chaves obrigatorias: grep retorna ocorrencias de `YZIWS_WEBHOOK_SECRET`, `YZIWS_WEBHOOK_URL`, `wp_remote_post`, `82cc7aa9-fc6e-4f37-8d8e-8a71c1691361`, `imovel.upsert`, `imovel.delete`, `imovel.unpublish`, `add_action`, `save_post`, `transition_post_status`, `before_delete_post`, `X-Source`, `wordpress`.
  </verify>
  <done>
    - Arquivo `yziws-webhook-imoveis.php` existe no diretorio da quick task
    - Arquivo contem header PHPDoc com nome, versao, autor
    - 3 hooks WordPress registrados: save_post, transition_post_status, before_delete_post
    - Loop guard via static $in_progress implementado
    - 16 meta fields lidos via get_post_meta com normalizacao correta de tipos
    - metragem e valor convertidos para float; quartos/suites/vagas convertidos para string
    - Header Authorization: Bearer + X-Source: wordpress + Content-Type: application/json enviados
    - Tenant_id Jurema Brokers hardcoded
    - Falhas registradas via error_log; nunca quebra o admin
  </done>
</task>

<task type="auto">
  <name>Task 2: Criar INSTALACAO.md com guia de instalacao, customizacao, testes e troubleshooting</name>
  <files>.planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/INSTALACAO.md</files>
  <action>
Criar arquivo Markdown com guia completo de instalacao do snippet em portugues. Estrutura obrigatoria:

# Instalacao — Snippet YZI Webhook Imoveis

## 1. Pre-requisitos
Listar:
- WordPress 6.x com plugin **Code Snippets** instalado e ativo (link: https://wordpress.org/plugins/code-snippets/)
- Plugin **JetEngine** com o CPT `imovel` configurado
- Constantes `YZIWS_WEBHOOK_SECRET` e `YZIWS_WEBHOOK_URL` ja configuradas no `wp-config.php` (ver PRODUCAO.md em quick-260501-rg3)
- Endpoint `POST /api/webhook/imoveis` no ar em https://plataforma.yzihub.com (validar via `curl -i -X POST` sem auth — deve retornar 401)

## 2. Constantes obrigatorias no wp-config.php
Mostrar bloco PHP com:
```php
define('YZIWS_WEBHOOK_SECRET', 'COLAR_O_SECRET_DA_VERCEL_AQUI');
define('YZIWS_WEBHOOK_URL', 'https://plataforma.yzihub.com/api/webhook/imoveis');
// Opcional — somente se o CPT do JetEngine NAO for 'imovel':
// define('YZIWS_CPT', 'imovel');
```
Reforcar: o secret DEVE ser identico ao configurado em WEBHOOK_IMOVEIS_SECRET na Vercel (referencia ao PRODUCAO.md).

## 3. Instalar via Code Snippets (passo a passo)
1. Acessar `wp-admin` > **Snippets** > **Add New**
2. Title: `YZI Webhook Sync — Imoveis`
3. Type/Scope: **Run snippet everywhere** (default)
4. Code: copiar e colar o conteudo INTEGRAL de `yziws-webhook-imoveis.php` (sem a tag `<?php` se o Code Snippets ja inserir automaticamente — o plugin aceita com ou sem)
5. Description (opcional): "Dispara webhooks de imoveis para a plataforma YZI Hub"
6. Tags (opcional): `yzi`, `webhook`, `imoveis`
7. Clicar em **Save Changes and Activate**

## 4. Customizar o CPT (opcional)
Se o CPT do JetEngine nao for `imovel` (default), adicionar no `wp-config.php`:
```php
define('YZIWS_CPT', 'meu_cpt_customizado');
```
Sem essa constante, o snippet escuta apenas posts do CPT `imovel`.

## 5. Validacao — Como saber se esta funcionando

### 5.1 Teste manual: criar/editar um imovel
1. Acessar `wp-admin` > **Imoveis** > **Editar** qualquer imovel publicado
2. Fazer uma pequena alteracao (ex: titulo) e clicar em **Atualizar**
3. Em <30 segundos, verificar no Supabase (tabela `imoveis`):
   - `updated_at` do imovel deve ter sido atualizado
   - Campos alterados refletidos no banco
4. Alternativamente, conferir os logs estruturados do endpoint na Vercel (ver secao Troubleshooting)

### 5.2 Validacao end-to-end via curl
Enviar manualmente um payload de teste para garantir que o endpoint esta acessivel a partir do servidor WordPress:
```bash
curl -i -X POST https://plataforma.yzihub.com/api/webhook/imoveis \
  -H "Authorization: Bearer COLAR_O_SECRET_AQUI" \
  -H "Content-Type: application/json" \
  -H "X-Source: manual-test" \
  -d '{"evento":"imovel.unpublish","tenant_id":"82cc7aa9-fc6e-4f37-8d8e-8a71c1691361","id_imovel":"TESTE_INEXISTENTE"}'
```
Esperado: `HTTP/2 200` com body `{"ok":true,"action":"unpublish","found":false,...}`.

### 5.3 Conferir os 3 cenarios cobertos pelo snippet
| Acao no WordPress | Evento esperado no endpoint |
|-------------------|----------------------------|
| Salvar imovel publicado | `imovel.upsert` |
| Mudar status de Publicado para Rascunho/Lixeira | `imovel.unpublish` |
| Deletar permanentemente da Lixeira | `imovel.delete` |

## 6. Troubleshooting

### 6.1 Onde estao os logs do WordPress
Ativar `WP_DEBUG_LOG` no `wp-config.php`:
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```
Logs aparecem em: `wp-content/debug.log`. O snippet usa `error_log()`, entao falhas serao registradas la com o prefixo `YZIWS:`.

### 6.2 Mensagens de erro comuns
| Mensagem | Causa provavel | Solucao |
|----------|----------------|---------|
| `YZIWS: missing constants` | YZIWS_WEBHOOK_SECRET ou YZIWS_WEBHOOK_URL nao definidos no wp-config.php | Adicionar as constantes conforme secao 2 |
| `YZIWS: HTTP 401` | Secret incorreto ou divergente da Vercel | Conferir que o valor em wp-config.php e identico ao da Vercel |
| `YZIWS: HTTP 422` | Payload invalido (provavel metragem/valor como string nao numerica) | Conferir que os meta fields metragem e valor contem numeros validos |
| `YZIWS: WP_Error` | Falha de rede / DNS / SSL | Conferir que o servidor WordPress consegue acessar https://plataforma.yzihub.com |

### 6.3 Logs do endpoint (Vercel)
1. Acessar https://vercel.com/dashboard
2. Abrir o projeto da plataforma
3. **Deployments** > clicar no deploy de producao > **Functions** > filtrar por `api/webhook/imoveis`
4. Cada request gera um log JSON estruturado com `trace_id`, `evento`, `id_imovel`, `http_status`, `duration_ms`, `source: wordpress`

### 6.4 Desativar temporariamente
Em **Code Snippets** > localizar `YZI Webhook Sync — Imoveis` > clicar em **Deactivate**. O hook nao sera mais disparado ate ser reativado.

## 7. Limitacoes conhecidas
- O snippet NAO sincroniza imoveis ja existentes ao ser instalado pela primeira vez — apenas dispara em mudancas futuras. Para popular o Supabase com o catalogo atual, fazer um update em massa via WP-CLI ou aguardar edicoes naturais.
- O envio e bloqueante (`blocking: true`) com timeout de 10s — em casos extremos de endpoint indisponivel, o salvamento do post pode demorar ate 10s. Em ambientes com alta latencia, considerar mudar para `blocking: false` (fire-and-forget) editando a funcao `yziws_send_webhook`.
- Apenas o tenant **Jurema Brokers** esta hardcoded. Para suportar outros tenants no futuro, sera necessario refatorar para ler de `YZIWS_TENANT_ID` em wp-config.php.

## 8. Proximo passo
Apos instalar e validar o snippet:
- Monitorar os logs da Vercel por 24h para confirmar volume de eventos esperado
- Validar visualmente alguns imoveis na pagina `/imoveis` da plataforma
- Considerar futura migracao do workflow n8n "Ler Imoveis JetEngine" para usar este endpoint diretamente
  </action>
  <verify>
    <automated>powershell -Command "if ((Test-Path '.planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/INSTALACAO.md') -and ((Get-Content '.planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/INSTALACAO.md' | Measure-Object -Line).Lines -gt 60)) { exit 0 } else { exit 1 }"</automated>
    Conteudo verificado: arquivo Markdown existe, tem >60 linhas, contem as 8 secoes obrigatorias com headings.
    Validacao de chaves: grep retorna ocorrencias de `Code Snippets`, `YZIWS_WEBHOOK_SECRET`, `YZIWS_CPT`, `wp-config.php`, `WP_DEBUG_LOG`, `wp-content/debug.log`, `Vercel`, `82cc7aa9-fc6e-4f37-8d8e-8a71c1691361`, `imovel.upsert`, `imovel.unpublish`, `imovel.delete`, `Troubleshooting`.
  </verify>
  <done>
    - Arquivo `INSTALACAO.md` existe no diretorio da quick task
    - Cobre 8 secoes: pre-requisitos, constantes wp-config, instalacao Code Snippets, customizacao CPT, validacao (3 metodos), troubleshooting (logs WP + erros comuns + logs Vercel + desativar), limitacoes, proximo passo
    - Tabela de mapeamento acao WordPress → evento documentada
    - Tabela de erros comuns documentada
    - Documento em portugues, sem emojis, formatado em Markdown valido
  </done>
</task>

</tasks>

<verification>
- Ambos os arquivos existem em `.planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/`
- Snippet PHP cobre os 3 hooks (save_post, transition_post_status, before_delete_post) com loop guard
- Snippet PHP usa wp_remote_post com headers Authorization Bearer + Content-Type + X-Source
- Snippet PHP converte metragem/valor para float e quartos/suites/vagas para string
- Snippet PHP filtra apenas o CPT correto (default: imovel) via constante customizavel
- INSTALACAO.md cobre instalacao, customizacao, validacao end-to-end via curl, e troubleshooting completo
- Nenhuma alteracao de codigo no app/src/ — output sao 2 arquivos de documentacao/snippet
</verification>

<success_criteria>
- Usuario consegue copiar `yziws-webhook-imoveis.php` direto para o Code Snippets e ativar sem erros de sintaxe
- Apos ativacao + edicao de um imovel publicado, o endpoint /api/webhook/imoveis recebe um POST com evento `imovel.upsert` e body que satisfaz o contrato (sem 422)
- Apos despublicar (publish → draft) ou deletar permanentemente, o endpoint recebe `imovel.unpublish` ou `imovel.delete` respectivamente
- INSTALACAO.md responde sozinho as duvidas: como instalar, como customizar CPT, como testar, onde ver logs em caso de falha
</success_criteria>

<output>
Apos completion, criar `.planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/260501-ufh-SUMMARY.md` documentando:
- Arquivos criados (yziws-webhook-imoveis.php + INSTALACAO.md)
- Decisoes tomadas (hardcoded tenant, blocking request, fallback de id_imovel)
- Como testar end-to-end (referencia secao 5 do INSTALACAO.md)
- Proxima quick task sugerida (instalar + monitorar 24h)
</output>
