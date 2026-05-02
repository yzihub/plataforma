# Instalacao — Snippet YZI Webhook Imoveis

Guia de instalacao, customizacao, validacao e troubleshooting do snippet PHP
`yziws-webhook-imoveis.php` que integra o WordPress (JetEngine) com o endpoint
`POST /api/webhook/imoveis` da plataforma YZI Hub.

---

## 1. Pre-requisitos

Antes de instalar, confirme os itens abaixo:

- **WordPress 6.x** com o plugin **Code Snippets** instalado e ativo.
  - Link: https://wordpress.org/plugins/code-snippets/
- **Plugin JetEngine** configurado com o CPT `imoveis` (ou o nome customizado do seu CPT).
- **Constantes** `YZIWS_WEBHOOK_SECRET` e `YZIWS_WEBHOOK_URL` ja definidas no `wp-config.php`
  (ver PRODUCAO.md em quick-260501-rg3 para gerir o secret na Vercel).
- **Endpoint no ar**: `POST /api/webhook/imoveis` em https://plataforma.yzihub.com.
  Validar com:
  ```bash
  curl -i -X POST https://plataforma.yzihub.com/api/webhook/imoveis
  # Esperado: HTTP 401 (sem token) — confirma que o endpoint responde
  ```

---

## 2. Constantes obrigatorias no wp-config.php

Adicionar as linhas abaixo no arquivo `wp-config.php` do WordPress,
**antes** da linha `/* That's all, stop editing! */`:

```php
define('YZIWS_WEBHOOK_SECRET', 'COLAR_O_SECRET_DA_VERCEL_AQUI');
define('YZIWS_WEBHOOK_URL', 'https://plataforma.yzihub.com/api/webhook/imoveis');
// Opcional — somente se o CPT do JetEngine NAO for 'imoveis':
// define('YZIWS_CPT', 'imoveis');
```

O valor de `YZIWS_WEBHOOK_SECRET` DEVE ser identico ao secret configurado
na variavel de ambiente `WEBHOOK_IMOVEIS_SECRET` na Vercel (referencia: PRODUCAO.md).
Se os valores divergirem, o endpoint retornara HTTP 401.

---

## 3. Instalar via Code Snippets (passo a passo)

1. Acessar `wp-admin` > **Snippets** > **Add New**.
2. Preencher o campo **Title** com: `YZI Webhook Sync — Imoveis`.
3. Em **Type** / **Scope**, selecionar **Run snippet everywhere** (opcao padrao).
4. No campo **Code**, copiar e colar o conteudo INTEGRAL do arquivo `yziws-webhook-imoveis.php`.
   - O plugin Code Snippets aceita o arquivo com ou sem a tag `<?php` de abertura.
   - Se o plugin ja inserir a tag automaticamente, remover a primeira linha `<?php` do snippet antes de colar.
5. No campo **Description** (opcional): `Dispara webhooks de imoveis para a plataforma YZI Hub`.
6. Em **Tags** (opcional): `yzi`, `webhook`, `imoveis`.
7. Clicar em **Save Changes and Activate**.

O snippet sera ativado imediatamente. Nenhum reinicio de servidor e necessario.

---

## 4. Customizar o CPT (opcional)

Por padrao, o snippet escuta apenas posts do CPT `imoveis`.
Se o JetEngine estiver configurado com outro nome de CPT, adicionar a constante abaixo
no `wp-config.php` (junto com as demais constantes da secao 2):

```php
define('YZIWS_CPT', 'meu_cpt_customizado');
```

Sem essa constante, o snippet usa `imoveis` como valor padrao.

---

## 5. Validacao — Como saber se esta funcionando

### 5.1 Teste manual: criar ou editar um imovel

1. Acessar `wp-admin` > **Imoveis** (ou o menu do CPT configurado).
2. Abrir qualquer imovel ja publicado para edicao.
3. Fazer uma pequena alteracao (ex: adicionar um espaco ao final do titulo).
4. Clicar em **Atualizar**.
5. Em menos de 30 segundos, verificar no Supabase (tabela `imoveis`):
   - O campo `updated_at` do imovel deve ter sido atualizado.
   - Os campos alterados devem refletir o novo valor.
6. Alternativamente, conferir os logs estruturados do endpoint na Vercel (ver secao 6.3).

### 5.2 Validacao end-to-end via curl

Para confirmar que o endpoint esta acessivel a partir do servidor WordPress,
executar o comando abaixo no terminal do servidor (ou de qualquer maquina com acesso):

```bash
curl -i -X POST https://plataforma.yzihub.com/api/webhook/imoveis \
  -H "Authorization: Bearer COLAR_O_SECRET_AQUI" \
  -H "Content-Type: application/json" \
  -H "X-Source: manual-test" \
  -d '{"evento":"imovel.unpublish","tenant_id":"82cc7aa9-fc6e-4f37-8d8e-8a71c1691361","id_imovel":"TESTE_INEXISTENTE"}'
```

Resposta esperada: `HTTP/2 200` com body similar a:
```json
{ "ok": true, "action": "unpublish", "found": false }
```

Se o endpoint retornar `401`, o secret esta incorreto.
Se retornar `422`, o payload esta invalido (verifique os campos `metragem` e `valor`).

### 5.3 Conferir os 3 cenarios cobertos pelo snippet

| Acao no WordPress | Evento enviado ao endpoint |
|---|---|
| Salvar imovel publicado (criar ou atualizar) | `imovel.upsert` |
| Mudar status de Publicado para Rascunho, Pendente ou Lixeira | `imovel.unpublish` |
| Deletar permanentemente da Lixeira | `imovel.delete` |

Observacao: mover para a Lixeira (trash) aciona `imovel.unpublish`.
Deletar permanentemente da Lixeira aciona `imovel.delete`.

---

## 6. Troubleshooting

### 6.1 Onde estao os logs do WordPress

Ativar o log de debug no `wp-config.php`:

```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

Os logs aparecem em: `wp-content/debug.log`.
O snippet usa `error_log()` internamente, entao todas as falhas serao registradas
nesse arquivo com o prefixo `YZIWS:`.

### 6.2 Mensagens de erro comuns

| Mensagem no debug.log | Causa provavel | Solucao |
|---|---|---|
| `YZIWS: missing constants` | `YZIWS_WEBHOOK_SECRET` ou `YZIWS_WEBHOOK_URL` nao definidos no `wp-config.php` | Adicionar as constantes conforme secao 2 e recarregar o WordPress |
| `YZIWS: HTTP 401` | Secret incorreto ou divergente do valor configurado na Vercel | Conferir que o valor em `wp-config.php` e identico ao da variavel `WEBHOOK_IMOVEIS_SECRET` na Vercel |
| `YZIWS: HTTP 422` | Payload invalido — provavel `metragem` ou `valor` com string nao numerica nos meta fields | Conferir que os meta fields `metragem` e `valor` contem apenas numeros (ex: `525000` ou `525000.00`) |
| `YZIWS: HTTP 415` | Header `Content-Type` nao foi enviado | Nao deve ocorrer — o snippet sempre envia `Content-Type: application/json`. Investigar se algum plugin intercepta os headers. |
| `YZIWS: WP_Error` | Falha de rede, DNS ou SSL ao tentar atingir o endpoint | Confirmar que o servidor WordPress consegue resolver e acessar `https://plataforma.yzihub.com` — testar com `curl` a partir do servidor |

### 6.3 Logs do endpoint (Vercel)

1. Acessar https://vercel.com/dashboard.
2. Abrir o projeto da plataforma.
3. Navegar em **Deployments** > clicar no deploy de producao > **Functions**.
4. Filtrar por `api/webhook/imoveis`.
5. Cada request gera um log JSON estruturado com campos:
   `trace_id`, `evento`, `id_imovel`, `http_status`, `duration_ms`, `source: wordpress`.

### 6.4 Desativar temporariamente

Em `wp-admin` > **Snippets**, localizar `YZI Webhook Sync — Imoveis` e clicar em **Deactivate**.
O hook deixara de ser disparado imediatamente, sem necessidade de editar codigo.
Para reativar, clicar em **Activate**.

---

## 7. Limitacoes conhecidas

- **Sem sincronizacao inicial**: o snippet NAO sincroniza imoveis ja existentes ao ser instalado
  pela primeira vez. Ele dispara webhooks apenas em mudancas futuras. Para popular o Supabase
  com o catalogo atual, realizar um update em massa via WP-CLI ou aguardar edicoes naturais.

- **Request bloqueante**: o envio e bloqueante (`blocking: true`) com timeout de 10 segundos.
  Em casos extremos de endpoint indisponivel ou latencia alta, o salvamento do post pode demorar
  ate 10s. Para ambientes com alta latencia, considerar alterar para `blocking: false`
  (fire-and-forget) na funcao `yziws_send_webhook` dentro do snippet.

- **Tenant fixo**: apenas o tenant **Jurema Brokers** (`82cc7aa9-fc6e-4f37-8d8e-8a71c1691361`)
  esta hardcoded no snippet. Para suportar outros tenants no futuro, sera necessario refatorar
  o snippet para ler o `tenant_id` de uma constante `YZIWS_TENANT_ID` no `wp-config.php`.

---

## 8. Proximo passo

Apos instalar e validar o snippet:

- Monitorar os logs da Vercel por 24h para confirmar que o volume de eventos e o esperado.
- Validar visualmente alguns imoveis na pagina `/imoveis` da plataforma para confirmar
  que os dados do Supabase estao atualizados corretamente.
- Considerar a futura migracao do workflow n8n "Ler Imoveis JetEngine" para usar este
  endpoint diretamente, eliminando o intermediario n8n para o fluxo de sincronizacao.
