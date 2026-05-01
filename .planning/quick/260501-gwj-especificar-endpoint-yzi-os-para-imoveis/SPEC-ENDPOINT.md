# SPEC-ENDPOINT — POST /webhook/imoveis (YZI OS)

---

## 1. Identificação

| Campo             | Valor                                                          |
|-------------------|----------------------------------------------------------------|
| Nome do endpoint  | POST /webhook/imoveis                                          |
| Backend destino   | YZI OS (Python / FastAPI / Agno) — host `https://yzi-os.yzihub.com` |
| Versão da spec    | v1                                                             |
| Data              | 2026-05-01                                                     |
| Status            | PROPOSTA — endpoint não implementado ainda                     |
| Owner             | Backend YZI OS                                                 |

---

## 2. Propósito

**Frase-chave:** Receber eventos de imóveis vindos de fontes externas (n8n, WordPress JetEngine, importadores) e refletir o estado correto na tabela `imoveis` do Supabase, multi-tenant.

### Motivação

Atualmente, o n8n grava imóveis diretamente no Supabase via REST API. Essa abordagem tem três problemas:

1. Regra de negócio (upsert, merge de metadata, idempotência, whitelist de tenants) fica espalhada em nós do workflow n8n, sem versionamento e sem testes.
2. Qualquer mudança de schema exige atualizar o workflow manualmente.
3. Não há log estruturado por evento, dificultando auditoria e debug.

O endpoint `POST /webhook/imoveis` centraliza essa responsabilidade no backend YZI OS, tornando o n8n um produtor de eventos simples — sem conhecimento de banco.

### Posicionamento

```
n8n (WordPress JetEngine / importador CSV / admin) 
  → POST /webhook/imoveis (YZI OS)
    → Supabase tabela `imoveis`
```

**`api.yzihub.com` (n8n gateway) NÃO é alternativa válida para este endpoint.** Ele é infraestrutura de integração operacional, não a camada de regra de negócio do backend.

---

## 3. Rota e Método

| Campo        | Valor                                          |
|--------------|------------------------------------------------|
| Método       | POST                                           |
| Path         | `/webhook/imoveis`                             |
| URL completa | `https://yzi-os.yzihub.com/webhook/imoveis`    |

### Idempotência

O endpoint DEVE ser idempotente para a chave de negócio `(tenant_id, id_imovel, evento)`. Reenviar o mesmo payload não duplica linha, não gera erro, e retorna `200` com o mesmo shape de resposta.

Para `imovel.upsert`: reenvio com dados idênticos resulta em UPDATE no banco que preserva os valores — sem efeito observável. Reenvio com dados diferentes aplica o merge parcial descrito na seção 7.

---

## 4. Headers Obrigatórios

| Header               | Obrigatório | Exemplo                                    | Descrição                                                                                     |
|----------------------|-------------|-------------------------------------------|-----------------------------------------------------------------------------------------------|
| `Content-Type`       | Sim         | `application/json`                        | Obrigatório. Qualquer outro valor retorna 415.                                                |
| `Authorization`      | Sim         | `Bearer eyJhbGc...`                       | Bearer token estático compartilhado entre n8n e YZI OS. Validado contra env var no backend. |
| `X-Idempotency-Key`  | Não (v1)    | `550e8400-e29b-41d4-a716-446655440000`    | UUID v4 gerado pelo chamador. Reservado para deduplicação client-side em v2.                 |
| `X-Source`           | Não         | `n8n.jetengine`                           | String curta identificando a origem do evento. Salvo no log. Ex: `n8n.import_csv`, `manual_admin`. |

### Regra de Autenticação — v1

DECISÃO v1: validação por bearer token estático.

- O backend lê a env var `WEBHOOK_IMOVEIS_SECRET` na inicialização.
- Em cada request, compara `Authorization: Bearer <token>` contra o secret armazenado.
- Comparação deve usar comparação segura (constant-time) para evitar timing attack.
- Se ausente ou inválido: retorna 401 com `{ "ok": false, "error": "unauthorized" }`.
- Rotação do secret exige atualização manual da env var e reinicialização do serviço. JWT / HMAC ficam para v2 (ver seção 11).

---

## 5. Payload Aceito (v1)

### Envelope comum

```json
{
  "evento": "imovel.upsert",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "id_imovel": "JP009",
  "data": { },
  "_extras": { }
}
```

### Campos do envelope

| Campo       | Tipo    | Obrigatório  | Regras                                                                                           |
|-------------|---------|--------------|--------------------------------------------------------------------------------------------------|
| `evento`    | string  | Sim          | Enum fechado: `imovel.upsert`, `imovel.delete`, `imovel.unpublish`. Qualquer outro valor → 422. |
| `tenant_id` | string  | Sim          | UUID v4. Deve estar na whitelist de tenants (ver seção 6, regra 5).                              |
| `id_imovel` | string  | Sim          | String não vazia, máximo 100 caracteres. Chave de negócio externa. Ex: `"JP009"`.               |
| `data`      | objeto  | Só em upsert | Para `imovel.upsert`: obrigatório, pode estar vazio `{}`. Para as demais ações: ignorado.       |
| `_extras`   | objeto  | Não          | **IGNORADO na v1.** Qualquer chave dentro de `_extras` (raiz do envelope) é descartada antes da persistência. Não é erro enviá-las. |

### Nota sobre `data._extras`

Campos dentro de `data._extras` também são **IGNORADOS na v1**. O endpoint descarta silenciosamente tanto `_extras` no envelope raiz quanto qualquer sub-objeto `_extras` dentro de `data`. Nenhum desses campos é persistido no banco. Não é erro enviá-los.

---

### Exemplo 1: imovel.upsert — payload completo com todos os 18 campos

```json
{
  "evento": "imovel.upsert",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "id_imovel": "JP009",
  "data": {
    "titulo_comercial": "Apartamento para Venda no Bessa",
    "titulo_seo": "apartamento-para-venda-no-bessa",
    "descricao_imovel": "Apartamento com 2 quartos, 59m², localizado no Bessa, João Pessoa.",
    "tipo_de_imovel": "Apartamento",
    "finalidade": "venda",
    "bairro": "Bessa",
    "quartos": "2",
    "suites": "1",
    "vagas": "1",
    "metragem": 59.0,
    "valor": 525000.00,
    "foto_principal": "https://juremabksimoveis.com.br/wp-content/uploads/jp009-principal.jpg",
    "link_do_imovel": "https://juremabksimoveis.com.br/imoveis/apartamento-para-venda-no-bessa/",
    "link_sanitizado": "apartamento-para-venda-no-bessa",
    "imagem_card": "https://juremabksimoveis.com.br/wp-content/uploads/jp009-card.jpg",
    "status_publicacao": "Publicado",
    "status_operacional": "disponivel",
    "metadata": {
      "source_system": "jetengine",
      "wp_post_id": 1234
    }
  },
  "_extras": {
    "raw_jetengine_fields": {}
  }
}
```

---

### Exemplo 2: imovel.delete — envelope mínimo

```json
{
  "evento": "imovel.delete",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "id_imovel": "JP009"
}
```

`data` e `_extras` são ignorados mesmo se presentes.

---

### Exemplo 3: imovel.unpublish — envelope mínimo

```json
{
  "evento": "imovel.unpublish",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "id_imovel": "JP009"
}
```

`data` e `_extras` são ignorados mesmo se presentes.

---

## 6. Regras de Validação

As regras são avaliadas na ordem. A primeira violação interrompe a avaliação e retorna o erro correspondente.

| # | Regra                                                                                   | Código de erro              | HTTP |
|---|-----------------------------------------------------------------------------------------|-----------------------------|------|
| 1 | Header `Authorization` presente e token válido contra `WEBHOOK_IMOVEIS_SECRET`          | `unauthorized`              | 401  |
| 2 | Header `Content-Type` é `application/json`                                              | `unsupported_media_type`    | 415  |
| 3 | Body é JSON válido e parseável                                                          | `malformed_json`            | 400  |
| 4 | Campo `evento` presente e valor está em `{imovel.upsert, imovel.delete, imovel.unpublish}` | `invalid_event`             | 422  |
| 5 | Campo `tenant_id` presente, formato UUID v4 válido, e na whitelist: `b179ae75-3d56-4de8-8840-fc9c4d9ec21e` (Café com Pam) ou `82cc7aa9-fc6e-4f37-8d8e-8a71c1691361` (Jurema Brokers) | `invalid_tenant`            | 422  |
| 6 | Campo `id_imovel` presente, string não vazia, comprimento ≤ 100 caracteres              | `invalid_id_imovel`         | 422  |
| 7 | Para `imovel.upsert`: campo `data` presente e é um objeto (pode ser `{}`)               | `missing_data`              | 422  |
| 8 | Para `imovel.upsert`: campos conhecidos em `data` têm tipos compatíveis (ver tabela seção 7) | `invalid_field_type`     | 422  |

**Campos extras desconhecidos** em `data` (que não constam nas 18 colunas canônicas da seção 7) são ignorados silenciosamente. Não geram erro. Apenas tipos errados em campos conhecidos disparam 422.

---

## 7. Regra de Upsert — Mapeamento das 18 Colunas

`tenant_id` e `id_imovel` são extraídos do **envelope** (campos de raiz), não de `data`. Eles formam a chave única do upsert. Os 18 campos abaixo são mapeados de `data.<campo>` para a coluna correspondente na tabela `imoveis`.

| #  | Campo no payload (`data.X`)  | Coluna em `imoveis`    | Tipo no banco | Obrigatório no upsert? | Default se ausente (merge parcial) |
|----|------------------------------|------------------------|---------------|------------------------|------------------------------------|
| 1  | `titulo_comercial`           | `titulo_comercial`     | text          | Não                    | preserva valor anterior            |
| 2  | `titulo_seo`                 | `titulo_seo`           | text          | Não                    | preserva valor anterior            |
| 3  | `descricao_imovel`           | `descricao_imovel`     | text          | Não                    | preserva valor anterior            |
| 4  | `tipo_de_imovel`             | `tipo_de_imovel`       | text          | Não                    | preserva valor anterior            |
| 5  | `finalidade`                 | `finalidade`           | text          | Não                    | preserva valor anterior            |
| 6  | `bairro`                     | `bairro`               | text          | Não                    | preserva valor anterior            |
| 7  | `quartos`                    | `quartos`              | text          | Não                    | preserva valor anterior            |
| 8  | `suites`                     | `suites`               | text          | Não                    | preserva valor anterior            |
| 9  | `vagas`                      | `vagas`                | text          | Não                    | preserva valor anterior            |
| 10 | `metragem`                   | `metragem`             | numeric       | Não                    | preserva valor anterior            |
| 11 | `valor`                      | `valor`                | numeric       | Não                    | preserva valor anterior            |
| 12 | `foto_principal`             | `foto_principal`       | text (URL)    | Não                    | preserva valor anterior            |
| 13 | `link_do_imovel`             | `link_do_imovel`       | text (URL)    | Não                    | preserva valor anterior            |
| 14 | `link_sanitizado`            | `link_sanitizado`      | text          | Não                    | preserva valor anterior            |
| 15 | `imagem_card`                | `imagem_card`          | text (URL)    | Não                    | preserva valor anterior            |
| 16 | `status_publicacao`          | `status_publicacao`    | text          | Não                    | preserva valor anterior            |
| 17 | `status_operacional`         | `status_operacional`   | text          | Não                    | preserva valor anterior            |
| 18 | `metadata`                   | `metadata`             | jsonb         | Não                    | merge (não substituição)           |

**Nota sobre `quartos`, `suites`, `vagas`:** O schema atual da tabela `imoveis` armazena esses campos como `text`. O payload pode enviar strings (`"2"`) ou inteiros (`2`) — o backend converte para string antes de persistir.

**Nota sobre `metragem` e `valor`:** O banco usa `numeric`. O payload deve enviar número (inteiro ou decimal). String numérica (`"525000"`) deve ser rejeitada com `invalid_field_type`.

### Pseudo-SQL do upsert

```sql
INSERT INTO imoveis (tenant_id, id_imovel, titulo_comercial, titulo_seo, ..., updated_at)
VALUES (:tenant_id, :id_imovel, :titulo_comercial, :titulo_seo, ..., now())
ON CONFLICT (tenant_id, id_imovel) DO UPDATE
  SET
    titulo_comercial   = COALESCE(EXCLUDED.titulo_comercial,   imoveis.titulo_comercial),
    titulo_seo         = COALESCE(EXCLUDED.titulo_seo,         imoveis.titulo_seo),
    -- ... demais colunas com COALESCE para merge parcial ...
    metadata           = imoveis.metadata || EXCLUDED.metadata,  -- jsonb merge
    updated_at         = now()
```

### Política de merge parcial

DECISÃO v1: **merge parcial por presença de chave.**

- Chave **ausente** em `data`: coluna correspondente **não é tocada**. O `COALESCE` preserva o valor anterior.
- Chave presente com **valor não-nulo**: sobrescreve a coluna.
- Chave presente com **valor `null` explícito**: limpa a coluna (seta `NULL`).

### Regras adicionais

- `id` (UUID interno gerado pelo banco) nunca é recebido no payload e nunca é tocado em UPDATE.
- `created_at` é setado apenas na inserção inicial; nunca atualizado.
- `updated_at` é atualizado em todo upsert, seja insert ou update.
- `metadata` (jsonb): usa MERGE via concatenação jsonb (`||`). O objeto recebido em `data.metadata` é mesclado no objeto existente no banco. Chaves com `null` explícito são removidas via `jsonb_strip_nulls` após o merge. O objeto inteiro nunca é substituído por completo — alinhado com o padrão estabelecido em quick-260408-rzc.
- O índice único `UNIQUE (tenant_id, id_imovel)` precisa existir na tabela. Se não existir, a migration correspondente deve ser aplicada antes do deploy deste endpoint.

---

## 8. Comportamento por Ação

### 8.1 imovel.upsert

Aplica a regra de upsert descrita na seção 7.

**Resposta em caso de insert (imóvel novo):**

```json
{
  "ok": true,
  "action": "upserted",
  "created": true,
  "id_imovel": "JP009",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "imovel_id": "3f1e8a00-a1b2-4c3d-9e4f-556677889900"
}
```

`imovel_id` é o UUID interno da linha na tabela `imoveis`.

**Resposta em caso de update (imóvel já existia):**

```json
{
  "ok": true,
  "action": "upserted",
  "created": false,
  "id_imovel": "JP009",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "imovel_id": "3f1e8a00-a1b2-4c3d-9e4f-556677889900"
}
```

---

### 8.2 imovel.delete

DELETE físico da linha onde `tenant_id = :tenant_id AND id_imovel = :id_imovel`.

`data` e `_extras` são ignorados mesmo se presentes no payload.

DECISÃO v1: hard delete (remoção física). Soft delete (flag `deleted_at`) fica para v2 se necessário (ver seção 11).

**Resposta quando linha existia e foi removida:**

```json
{
  "ok": true,
  "action": "delete",
  "found": true,
  "id_imovel": "JP009",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361"
}
```

**Resposta quando linha NÃO existia (idempotente):**

```json
{
  "ok": true,
  "action": "delete",
  "found": false,
  "id_imovel": "JP009",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361"
}
```

O endpoint NUNCA retorna 404 para delete de imóvel inexistente. Ambos os casos retornam 200 — o chamador não precisa tratar essa distinção como erro.

---

### 8.3 imovel.unpublish

UPDATE setando `status_publicacao = 'Despublicado'` e `status_operacional = 'indisponivel'` onde `tenant_id = :tenant_id AND id_imovel = :id_imovel`. Não remove a linha do banco.

`data` e `_extras` são ignorados mesmo se presentes no payload.

**Resposta quando linha existia e foi atualizada:**

```json
{
  "ok": true,
  "action": "unpublish",
  "found": true,
  "id_imovel": "JP009",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361"
}
```

**Resposta quando linha NÃO existia (idempotente):**

```json
{
  "ok": true,
  "action": "unpublish",
  "found": false,
  "id_imovel": "JP009",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361"
}
```

---

## 9. Respostas HTTP

### Tabela canônica

| Status HTTP | Quando                                          | Shape do body                                                                   |
|-------------|------------------------------------------------|---------------------------------------------------------------------------------|
| 200         | Sucesso em qualquer ação                        | `{ "ok": true, "action": "...", "id_imovel": "...", "tenant_id": "...", ... }` |
| 400         | Body não é JSON válido                          | `{ "ok": false, "error": "malformed_json", "message": "..." }`                 |
| 401         | Authorization ausente ou token inválido         | `{ "ok": false, "error": "unauthorized" }`                                     |
| 415         | Content-Type diferente de application/json      | `{ "ok": false, "error": "unsupported_media_type" }`                           |
| 422         | Validação semântica falhou                      | `{ "ok": false, "error": "<code>", "message": "...", "details": { "field": "...", "reason": "..." } }` |
| 500         | Erro interno (banco, runtime)                   | `{ "ok": false, "error": "internal_error", "trace_id": "<uuid>" }`             |

Todas as respostas têm `ok: true` ou `ok: false` no campo de topo. O consumidor (n8n) deve checar `ok` antes de processar qualquer outro campo.

---

### Exemplos completos (request + response)

#### Upsert — sucesso, imóvel criado (created: true)

**Request:**
```
POST https://yzi-os.yzihub.com/webhook/imoveis
Authorization: Bearer s3cr3t_token_aqui
Content-Type: application/json
```
```json
{
  "evento": "imovel.upsert",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "id_imovel": "JP009",
  "data": {
    "titulo_comercial": "Apartamento para Venda no Bessa",
    "tipo_de_imovel": "Apartamento",
    "finalidade": "venda",
    "bairro": "Bessa",
    "quartos": "2",
    "metragem": 59.0,
    "valor": 525000.00,
    "status_publicacao": "Publicado",
    "status_operacional": "disponivel"
  }
}
```

**Response (200):**
```json
{
  "ok": true,
  "action": "upserted",
  "created": true,
  "id_imovel": "JP009",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "imovel_id": "3f1e8a00-a1b2-4c3d-9e4f-556677889900"
}
```

---

#### Upsert — sucesso, imóvel atualizado (created: false)

**Response (200):**
```json
{
  "ok": true,
  "action": "upserted",
  "created": false,
  "id_imovel": "JP009",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "imovel_id": "3f1e8a00-a1b2-4c3d-9e4f-556677889900"
}
```

---

#### Upsert — 422 por tipo inválido em `valor`

**Request:**
```json
{
  "evento": "imovel.upsert",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "id_imovel": "JP009",
  "data": {
    "valor": "quinhentos e vinte cinco mil"
  }
}
```

**Response (422):**
```json
{
  "ok": false,
  "error": "invalid_field_type",
  "message": "Campo 'valor' deve ser numérico.",
  "details": {
    "field": "data.valor",
    "reason": "expected numeric, got string"
  }
}
```

---

#### Delete idempotente — imóvel não encontrado (found: false)

**Request:**
```json
{
  "evento": "imovel.delete",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "id_imovel": "JP_INEXISTENTE"
}
```

**Response (200):**
```json
{
  "ok": true,
  "action": "delete",
  "found": false,
  "id_imovel": "JP_INEXISTENTE",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361"
}
```

---

#### Unpublish — sucesso (found: true)

**Request:**
```json
{
  "evento": "imovel.unpublish",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "id_imovel": "JP009"
}
```

**Response (200):**
```json
{
  "ok": true,
  "action": "unpublish",
  "found": true,
  "id_imovel": "JP009",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361"
}
```

---

#### 401 — Authorization ausente

**Request sem header Authorization:**
```
POST https://yzi-os.yzihub.com/webhook/imoveis
Content-Type: application/json
```
```json
{ "evento": "imovel.upsert", "tenant_id": "...", "id_imovel": "JP009", "data": {} }
```

**Response (401):**
```json
{
  "ok": false,
  "error": "unauthorized"
}
```

---

## 10. Logs Mínimos Esperados

Para cada request, o backend DEVE registrar um log estruturado em JSON com os campos abaixo.

| Campo         | Tipo    | Exemplo                                        | Obrigatório |
|---------------|---------|------------------------------------------------|-------------|
| `timestamp`   | string  | `"2026-05-01T14:32:00.000Z"` (ISO 8601 UTC)   | Sim         |
| `level`       | string  | `"info"` / `"warn"` / `"error"`               | Sim         |
| `event`       | string  | `"webhook.imoveis.upserted"`                  | Sim         |
| `tenant_id`   | string  | `"82cc7aa9-fc6e-4f37-8d8e-8a71c1691361"`      | Sim         |
| `id_imovel`   | string  | `"JP009"`                                      | Sim         |
| `evento`      | string  | `"imovel.upsert"` (ação recebida no payload)   | Sim         |
| `http_status` | int     | `200`                                          | Sim         |
| `duration_ms` | float   | `42.7`                                         | Sim         |
| `source`      | string  | `"n8n.jetengine"` (do header `X-Source`)       | Não         |
| `error_code`  | string  | `"invalid_tenant"` (apenas em falhas)          | Não         |
| `trace_id`    | string  | UUID gerado por request (retornado no body em 5xx) | Sim    |

### Valores de `event` por situação

| Situação                    | `event`                             | `level`  |
|-----------------------------|-------------------------------------|----------|
| Request recebido (início)   | `webhook.imoveis.received`          | `info`   |
| Upsert concluído            | `webhook.imoveis.upserted`          | `info`   |
| Delete concluído            | `webhook.imoveis.deleted`           | `info`   |
| Unpublish concluído         | `webhook.imoveis.unpublished`       | `info`   |
| Validação rejeitou request  | `webhook.imoveis.rejected`          | `warn`   |
| Auth inválida               | `webhook.imoveis.auth_failed`       | `warn`   |
| Erro interno                | `webhook.imoveis.error`             | `error`  |

**Importante:** NÃO logar o payload completo em nível `info` (risco de PII e volume excessivo). Logar payload apenas em `debug`. Em `info`, logar apenas os campos da tabela acima.

---

## 11. Fora de Escopo na v1 (Anti-escopo)

Os itens abaixo foram deliberadamente excluídos da v1 para manter o escopo implementável. Qualquer adição deve ser discutida antes da implementação.

| Item                                   | Motivo da exclusão                                            |
|----------------------------------------|---------------------------------------------------------------|
| `data._extras` persistido              | Campos extras são ignorados na v1; schema não suporta campo livre |
| Autenticação por HMAC / JWT            | Aumenta complexidade de setup; bearer estático é suficiente para v1 interno |
| Rotação automática de secret           | Rotação manual é aceitável no volume atual                    |
| Soft delete (`deleted_at`)             | Hard delete é suficiente para v1; soft delete requer mudanças de schema e queries |
| Callback webhook ao chamador           | n8n não precisa de confirmação assíncrona neste fluxo         |
| Versionamento via header (`X-API-Version`) | Apenas v1 implícita; versioning explícito fica para v2     |
| Rate limiting                          | Volume atual é baixo; adicionar junto com auth melhorada em v2 |
| Batch upsert (múltiplos imóveis)       | 1 evento = 1 imóvel na v1; batch fica v2                      |
| Dead-letter queue / reprocessamento    | Responsabilidade do chamador (n8n tem retry nativo)           |
| Validação de URL nos campos de link    | Formato aceito como string; validação de URL fica v2          |

---

## 12. Checklist de Implementação para o Dev Backend

Lista de verificação para o responsável pela implementação no YZI OS.

- [ ] Rota `POST /webhook/imoveis` registrada no router FastAPI do YZI OS
- [ ] Middleware ou `Depends()` valida bearer token contra env var `WEBHOOK_IMOVEIS_SECRET` (comparação constant-time)
- [ ] Env var `WEBHOOK_IMOVEIS_SECRET` documentada no README do YZI OS e listada no `.env.example`
- [ ] Pydantic models para o envelope (`WebhookImoveisRequest`) e para cada shape de `data` por evento
- [ ] Whitelist de `tenant_id` implementada (constantes no código ou query à tabela `tenants`)
- [ ] Função `upsert_imovel` com `ON CONFLICT (tenant_id, id_imovel) DO UPDATE` e merge parcial via COALESCE
- [ ] Merge jsonb para coluna `metadata` (não substituição total do objeto)
- [ ] Confirmar que índice único `UNIQUE (tenant_id, id_imovel)` existe na tabela `imoveis`; aplicar migration se necessário
- [ ] Função `delete_imovel` idempotente: retorna `found: true/false` sem 404
- [ ] Função `unpublish_imovel` idempotente: retorna `found: true/false` sem 404
- [ ] Logger estruturado (JSON) com os 11 campos da seção 10
- [ ] `trace_id` gerado por request e retornado no body de respostas 5xx
- [ ] Payload completo não logado em `info` (apenas em `debug`)
- [ ] Testes unitários / de integração:
  - [ ] Happy path: upsert insert (created: true)
  - [ ] Happy path: upsert update (created: false)
  - [ ] Happy path: delete com found: true
  - [ ] Happy path: delete idempotente com found: false
  - [ ] Happy path: unpublish com found: true
  - [ ] Caso 401: Authorization ausente
  - [ ] Caso 401: token inválido
  - [ ] Caso 422: `evento` inválido
  - [ ] Caso 422: `tenant_id` fora da whitelist
  - [ ] Caso 422: `valor` com tipo errado (string)

---

## 13. Glossário Rápido

| Termo           | Definição                                                                                                       |
|-----------------|-----------------------------------------------------------------------------------------------------------------|
| `tenant_id`     | UUID que identifica o tenant (cliente/organização) dono dos dados. Isola dados de diferentes clientes no mesmo banco. |
| `id_imovel`     | Identificador de negócio externo do imóvel (ex: `"JP009"`). Gerado pela fonte (WordPress, planilha). Chave de negócio para upsert. |
| `upsert`        | Operação que insere a linha se não existir ou atualiza se já existir, usando uma chave de conflito. Equivale a `INSERT ... ON CONFLICT DO UPDATE`. |
| `idempotente`   | Propriedade de uma operação que produz o mesmo resultado independentemente de quantas vezes é executada com o mesmo input. |
| `hard delete`   | Remoção física da linha do banco. Sem possibilidade de recuperação via banco (apenas backup).                   |
| `jsonb merge`   | Estratégia de atualização de campo jsonb que combina o objeto existente com o novo, preservando chaves não presentes no novo objeto. Implementado via operador `||` no PostgreSQL. |

---

*Não implementei nada. Apenas especifiquei o endpoint YZI OS.*
