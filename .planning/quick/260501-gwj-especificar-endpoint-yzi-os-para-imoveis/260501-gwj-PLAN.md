---
phase: quick-260501-gwj
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/260501-gwj-especificar-endpoint-yzi-os-para-imoveis/SPEC-ENDPOINT.md
autonomous: true
requirements:
  - SPEC-IMOVEIS-01
must_haves:
  truths:
    - "Documento SPEC-ENDPOINT.md existe e descreve completamente o contrato HTTP de POST /webhook/imoveis"
    - "Spec define autenticação, payload, validação e respostas HTTP para as 3 ações (upsert, delete, unpublish)"
    - "Spec lista exatamente as 18 colunas da tabela imoveis que devem ser mapeadas no upsert"
    - "Spec é suficiente para um dev backend Python/FastAPI implementar o endpoint sem perguntas"
    - "Spec deixa explícito que data._extras é ignorado na v1"
  artifacts:
    - path: ".planning/quick/260501-gwj-especificar-endpoint-yzi-os-para-imoveis/SPEC-ENDPOINT.md"
      provides: "Especificação completa do endpoint POST /webhook/imoveis no YZI OS"
      contains: "POST /webhook/imoveis, imovel.upsert, imovel.delete, imovel.unpublish, tenant_id, id_imovel"
      min_lines: 200
  key_links:
    - from: "SPEC-ENDPOINT.md"
      to: "tabela imoveis (Supabase)"
      via: "mapeamento de 18 colunas no payload v1"
      pattern: "id_imovel|tenant_id|titulo_comercial|tipo_de_imovel|finalidade|bairro|quartos|suites|vagas|metragem|valor|foto_principal|link_do_imovel|status_publicacao|status_operacional"
    - from: "SPEC-ENDPOINT.md"
      to: "n8n / fontes externas (WordPress JetEngine, etc)"
      via: "contrato de payload v1 com evento + data"
      pattern: "evento.*imovel\\.(upsert|delete|unpublish)"
---

<objective>
Especificar o contrato HTTP completo do endpoint POST /webhook/imoveis que será implementado no backend YZI OS (Python/FastAPI/Agno).

Purpose: Dar ao dev backend uma especificação completa e sem ambiguidade para implementar o endpoint que recebe eventos de imóveis (upsert/delete/unpublish) vindos de fontes externas (n8n, WordPress JetEngine, importadores).

Output: Um único documento `.planning/quick/260501-gwj-especificar-endpoint-yzi-os-para-imoveis/SPEC-ENDPOINT.md` cobrindo rota, headers, payload, validação, regra de upsert, comportamento por ação, respostas HTTP e logs.

NÃO é objetivo desta tarefa: implementar o endpoint, mexer em código Python, alterar workflows n8n, ou gerar SQL de migração.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md

# Contexto adicional já presente no task_context (recapitulado para o executor):
# - Endpoint POST /webhook/imoveis NÃO existe ainda no YZI OS
# - api.yzihub.com é n8n e NÃO deve ser usado como core
# - A tabela `imoveis` no Supabase tem 18 colunas relevantes ao upsert
# - As 3 ações suportadas na v1: imovel.upsert, imovel.delete, imovel.unpublish
# - Campos obrigatórios mínimos: evento, id_imovel, tenant_id
# - data._extras deve ser IGNORADO na v1 (não validar, não persistir)
# - Tenants: Café com Pam (b179ae75...) e Jurema Brokers (82cc7aa9...)
#
# Arquivos do projeto relevantes para confirmar o schema da tabela imoveis (LEITURA APENAS, não editar):
# - .planning/quick/260407-wba-migrar-workflow-ler-im-veis-jetengine-pa/ (schema 18 campos validado)
# - .planning/quick/260408-3os-corrigir-workflow-ler-im-veis-jetengine-/ (campos reais usados)
# - CLAUDE.md seção "Tela de imóveis" lista os campos consumidos pelo frontend
#
# A spec NÃO precisa abrir esses arquivos a menos que haja dúvida sobre nome exato
# de coluna; o CLAUDE.md já tem a fonte da verdade dos 18 campos.
</context>

<interfaces>
<!-- 18 colunas canônicas da tabela `imoveis` (fonte: CLAUDE.md seção "imoveis") -->
<!-- O executor deve usar EXATAMENTE estes nomes na seção "Regra de upsert" da spec -->

Tabela: imoveis (Supabase)
Colunas mapeáveis no payload v1:
  1.  id                  (uuid, gerado pelo banco — NÃO recebido no payload)
  2.  tenant_id           (uuid, obrigatório no payload)
  3.  id_imovel           (text, obrigatório no payload — chave de negócio externa)
  4.  titulo_comercial    (text)
  5.  titulo_seo          (text)
  6.  descricao_imovel    (text)
  7.  tipo_de_imovel      (text)
  8.  finalidade          (text — venda/locacao)
  9.  bairro              (text)
  10. quartos             (text — schema atual é text, não int)
  11. suites              (text ou int)
  12. vagas               (text ou int)
  13. metragem            (numeric)
  14. valor               (numeric)
  15. foto_principal      (text — URL)
  16. link_do_imovel      (text — URL)
  17. link_sanitizado     (text — slug/URL)
  18. imagem_card         (text — URL)
  19. status_publicacao   (text — "Publicado" / outros)
  20. status_operacional  (text — "disponivel" / outros)
  21. metadata            (jsonb — opcional)

Chave única para upsert: (tenant_id, id_imovel)

NOTA: O total real são ~20 campos visíveis. O task_context fala em "18 colunas" — o executor deve documentar as 18 colunas mapeáveis no payload (excluindo `id` interno e `metadata` que é opcional jsonb), confirmando o número final na spec.
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Criar SPEC-ENDPOINT.md com contrato HTTP completo do POST /webhook/imoveis</name>
  <files>.planning/quick/260501-gwj-especificar-endpoint-yzi-os-para-imoveis/SPEC-ENDPOINT.md</files>
  <action>
    Criar o documento de especificação `.planning/quick/260501-gwj-especificar-endpoint-yzi-os-para-imoveis/SPEC-ENDPOINT.md` em português brasileiro (padrão do projeto, ver MEMORY.md feedback_language) com a estrutura abaixo. O documento é a ENTREGA desta tarefa — não é prompt, não é código, é spec lida por humano e por dev backend.

    Estrutura obrigatória do SPEC-ENDPOINT.md (use exatamente estas seções na ordem):

    ## 1. Identificação
    - Nome do endpoint: POST /webhook/imoveis
    - Backend de destino: YZI OS (Python/FastAPI/Agno) — host base `https://yzi-os.yzihub.com`
    - Versão da spec: v1
    - Data: 2026-05-01
    - Status: PROPOSTA — endpoint não implementado ainda
    - Owner: backend YZI OS

    ## 2. Propósito
    - Frase-chave: "Receber eventos de imóveis vindos de fontes externas (n8n, WordPress JetEngine, importadores) e refletir o estado correto na tabela `imoveis` do Supabase, multi-tenant".
    - Explicar que o endpoint substitui chamadas diretas n8n→Supabase, centralizando regra de negócio no backend.
    - Explicitar que api.yzihub.com (n8n) NÃO é alternativa válida.

    ## 3. Rota e método
    - Método: POST
    - Path: /webhook/imoveis
    - URL completa: https://yzi-os.yzihub.com/webhook/imoveis
    - Idempotência: o endpoint DEVE ser idempotente em (tenant_id, id_imovel, evento). Reenvio do mesmo evento não duplica linha.

    ## 4. Headers obrigatórios
    Liste cada header em tabela com nome | obrigatório | exemplo | descrição:
    - Content-Type: application/json (obrigatório)
    - Authorization: Bearer <SECRET_WEBHOOK_IMOVEIS> (obrigatório — secret compartilhado entre n8n e YZI OS, armazenado em env var no backend)
    - X-Idempotency-Key: <uuid v4> (opcional v1 — para deduplicação client-side)
    - X-Source: <string curta> (opcional — ex: "n8n.jetengine", "n8n.import_csv", "manual_admin")

    Regra de auth na v1: validação simples por bearer token estático em env var `WEBHOOK_IMOVEIS_SECRET`. Se inválido → 401. Documentar que rotação manual será necessária e que JWT/HMAC ficam para v2.

    ## 5. Payload aceito (v1)
    JSON shape canônico com exemplo para cada uma das 3 ações.

    Envelope comum:
    ```json
    {
      "evento": "imovel.upsert" | "imovel.delete" | "imovel.unpublish",
      "tenant_id": "uuid",
      "id_imovel": "string",
      "data": { ... },
      "_extras": { ... }
    }
    ```

    Documentar:
    - `evento` — string, obrigatório, enum fechado (3 valores acima). Qualquer outro valor → 422.
    - `tenant_id` — uuid v4, obrigatório, deve existir nos tenants conhecidos (whitelist v1: Café com Pam `b179ae75-3d56-4de8-8840-fc9c4d9ec21e` e Jurema Brokers `82cc7aa9-fc6e-4f37-8d8e-8a71c1691361`).
    - `id_imovel` — string não vazia, obrigatório, max 100 chars. É a chave de negócio externa (ex: "JP009").
    - `data` — objeto, obrigatório SOMENTE para `imovel.upsert`, opcional/ignorado nas outras ações.
    - `data._extras` — IGNORADO na v1. Documentar explicitamente: "qualquer chave dentro de `data._extras` ou no envelope raiz `_extras` é descartada antes da persistência. Não é erro enviá-las".

    Exemplo completo para imovel.upsert (mostrar com TODOS os 18 campos preenchidos), imovel.delete (só envelope mínimo), imovel.unpublish (só envelope mínimo). Valores realistas baseados em JP009.

    ## 6. Regras de validação (rejeitar imediatamente com 4xx)

    Tabela de regra de validação na ordem de avaliação:
    | # | Regra | Erro se violada | HTTP |
    |---|-------|-----------------|------|
    | 1 | Header Authorization presente e válido | unauthorized | 401 |
    | 2 | Content-Type application/json | unsupported_media_type | 415 |
    | 3 | Body é JSON válido | malformed_json | 400 |
    | 4 | `evento` presente e em {imovel.upsert, imovel.delete, imovel.unpublish} | invalid_event | 422 |
    | 5 | `tenant_id` presente, formato uuid, na whitelist | invalid_tenant | 422 |
    | 6 | `id_imovel` presente, string não vazia, ≤100 chars | invalid_id_imovel | 422 |
    | 7 | Para `imovel.upsert`: `data` é objeto (pode ser vazio, mas precisa existir) | missing_data | 422 |
    | 8 | Para `imovel.upsert`: tipos dos campos conhecidos compatíveis (valor numérico, metragem numérica, status_publicacao string, etc) | invalid_field_type | 422 |

    Explicitar: campos extras desconhecidos em `data` (que não estão nas 18 colunas canônicas) são IGNORADOS silenciosamente, não geram erro. Apenas tipos errados em campos conhecidos disparam 422.

    ## 7. Regra de upsert — mapeamento das 18 colunas

    Tabela 1-pra-1 com:
    | # | Campo no payload (data.X) | Coluna em `imoveis` | Tipo | Obrigatório no upsert? | Default se ausente |

    Listar EXATAMENTE 18 linhas cobrindo: titulo_comercial, titulo_seo, descricao_imovel, tipo_de_imovel, finalidade, bairro, quartos, suites, vagas, metragem, valor, foto_principal, link_do_imovel, link_sanitizado, imagem_card, status_publicacao, status_operacional, metadata.

    (As chaves `tenant_id` e `id_imovel` saem do envelope, não de `data` — explicar isso em texto antes da tabela.)

    Regra de upsert SQL-like:
    ```
    INSERT INTO imoveis (tenant_id, id_imovel, ...18 cols)
    VALUES (...)
    ON CONFLICT (tenant_id, id_imovel) DO UPDATE
    SET ...18 cols = EXCLUDED.cols, updated_at = now()
    ```

    Explicitar:
    - chave única usada: `(tenant_id, id_imovel)` — exigir migration se índice não existir.
    - `id` (uuid interno) NÃO é tocado em update.
    - `created_at` é setado só na criação; `updated_at` em todo upsert.
    - Campos AUSENTES em `data` num upsert: documentar a política. RECOMENDAÇÃO v1: "merge parcial" — só sobrescreve coluna se a chave correspondente está presente em `data`. Chaves ausentes preservam valor anterior. Chaves com valor `null` explícito limpam a coluna.
    - `metadata` (jsonb) usa MERGE (jsonb_strip_nulls + concat), NÃO substitui o objeto inteiro — alinhar com pattern já decidido em quick-260408-rzc.

    ## 8. Comportamento por ação

    ### 8.1 imovel.upsert
    - Aplica regra de upsert da seção 7.
    - Resposta de sucesso: 200 com `{ "ok": true, "action": "upserted", "id_imovel": "JP009", "tenant_id": "...", "imovel_id": "<uuid interno>" }`
    - Se imóvel novo (insert): também retornar `created: true`.
    - Se atualização: `created: false`.

    ### 8.2 imovel.delete
    - DELETE físico da linha onde `tenant_id = ? AND id_imovel = ?`.
    - Se linha não existe: 200 com `{ "ok": true, "action": "delete", "found": false }` (idempotente).
    - Se linha existe e foi removida: 200 com `{ "ok": true, "action": "delete", "found": true }`.
    - NUNCA retornar 404 para delete idempotente.
    - `data` e `_extras` são ignorados; só envelope mínimo é necessário.
    - DECISÃO v1: hard delete (não soft). Documentar que soft delete fica para v2 se necessário.

    ### 8.3 imovel.unpublish
    - UPDATE setando `status_publicacao = 'Despublicado'` e `status_operacional = 'indisponivel'` onde `tenant_id = ? AND id_imovel = ?`.
    - Não remove a linha.
    - Se linha não existe: 200 com `{ "ok": true, "action": "unpublish", "found": false }` (idempotente).
    - Se linha existe: 200 com `{ "ok": true, "action": "unpublish", "found": true }`.

    ## 9. Respostas HTTP

    Tabela canônica:
    | Status | Quando | Body shape |
    |--------|--------|------------|
    | 200 | Sucesso (qualquer ação) | `{ ok: true, action, id_imovel, tenant_id, ... }` |
    | 400 | JSON malformado | `{ ok: false, error: "malformed_json", message }` |
    | 401 | Auth ausente/inválida | `{ ok: false, error: "unauthorized" }` |
    | 415 | Content-Type errado | `{ ok: false, error: "unsupported_media_type" }` |
    | 422 | Validação semântica falhou | `{ ok: false, error: "<code>", message, details: { field, reason } }` |
    | 500 | Erro interno (DB, etc) | `{ ok: false, error: "internal_error", trace_id }` |

    Garantir que TODA resposta tem `ok: true | false` no topo para o consumidor (n8n) parsear de forma consistente.

    Exemplos completos (request + response) para:
    - upsert sucesso (created: true)
    - upsert sucesso (created: false)
    - upsert com 422 por valor inválido
    - delete idempotente (found: false)
    - unpublish sucesso (found: true)
    - 401 por bearer faltando

    ## 10. Logs mínimos esperados

    Para cada request, o backend DEVE registrar (structured log JSON):
    - timestamp ISO8601
    - level (info/warn/error)
    - event (ex: "webhook.imoveis.received", "webhook.imoveis.upserted", "webhook.imoveis.rejected")
    - tenant_id
    - id_imovel
    - evento (acao recebida)
    - http_status
    - duration_ms
    - source (do header X-Source, se presente)
    - error_code (em falhas)
    - trace_id (uuid gerado por request, retornado no body em 5xx)

    Documentar que NÃO logar payload completo em info (PII / volume); só em debug.

    ## 11. Fora de escopo na v1 (anti-escopo)
    Lista explícita do que NÃO é coberto e fica para v2+:
    - `data._extras` ignorado
    - HMAC / JWT / rotação automática de secret
    - Soft delete
    - Webhook de retorno (callback) ao chamador
    - Versionamento via header (apenas v1 implícita)
    - Rate limiting
    - Batch upsert (1 evento = 1 imóvel; envio em lote fica v2)
    - Reprocessamento de evento por dead-letter queue

    ## 12. Checklist de implementação para o dev backend
    Lista de checkboxes acionável:
    - [ ] Rota POST /webhook/imoveis registrada no FastAPI router do YZI OS
    - [ ] Middleware/dependência valida bearer contra `WEBHOOK_IMOVEIS_SECRET`
    - [ ] Pydantic models para envelope e cada `evento`
    - [ ] Whitelist de tenant_id (constantes ou query a `tenants`)
    - [ ] Função upsert com `ON CONFLICT (tenant_id, id_imovel)` — confirmar índice único existe
    - [ ] Função delete idempotente
    - [ ] Função unpublish idempotente
    - [ ] Logger estruturado (JSON) com os campos da seção 10
    - [ ] Testes: 1 happy path por ação + 1 caso 401 + 1 caso 422 + 1 idempotência delete
    - [ ] env var `WEBHOOK_IMOVEIS_SECRET` documentada no README do YZI OS

    ## 13. Glossário rápido
    - tenant_id, id_imovel, upsert, idempotente, hard delete, jsonb merge — definição de 1 linha cada.

    ---

    REGRAS DE QUALIDADE OBRIGATÓRIAS para o documento:
    - Português brasileiro do início ao fim.
    - Tom objetivo, sem floreios. É spec, não tutorial.
    - Todas as tabelas em markdown.
    - Todos os exemplos de payload em blocos ```json com indentação 2.
    - Sem TODO/FIXME — se algo é incerto, marcar "DECISÃO v1: ..." e seguir adiante com a decisão.
    - Mínimo ~200 linhas (peso real, não inflado), com exemplos completos.
    - NÃO incluir código Python real, NÃO incluir SQL de migration completo (só o pseudo-SQL do upsert).
    - NÃO especular sobre v2: a seção 11 é a única que cita futuro.

    AUTOCHECK antes de finalizar o arquivo (executor deve verificar):
    - [ ] As 3 ações estão cobertas com exemplo de payload e exemplo de resposta
    - [ ] As 18 colunas estão listadas na tabela de mapeamento
    - [ ] tenant_id whitelist menciona AMBOS os UUIDs (Café com Pam + Jurema Brokers)
    - [ ] data._extras é mencionado explicitamente como IGNORADO em pelo menos 2 lugares (seção 5 e seção 11)
    - [ ] Toda resposta documentada tem `ok: true | false`
    - [ ] Logs mínimos têm tenant_id, id_imovel e evento
    - [ ] Nenhum trecho diz "implementar X" — é spec, não plano de implementação (exceto checklist da seção 12)
  </action>
  <verify>
    <automated>test -f ".planning/quick/260501-gwj-especificar-endpoint-yzi-os-para-imoveis/SPEC-ENDPOINT.md" && wc -l ".planning/quick/260501-gwj-especificar-endpoint-yzi-os-para-imoveis/SPEC-ENDPOINT.md" | awk '{ if ($1 < 200) { print "FAIL: spec tem " $1 " linhas, esperado >=200"; exit 1 } else { print "OK: " $1 " linhas" } }' && grep -q "imovel.upsert" ".planning/quick/260501-gwj-especificar-endpoint-yzi-os-para-imoveis/SPEC-ENDPOINT.md" && grep -q "imovel.delete" ".planning/quick/260501-gwj-especificar-endpoint-yzi-os-para-imoveis/SPEC-ENDPOINT.md" && grep -q "imovel.unpublish" ".planning/quick/260501-gwj-especificar-endpoint-yzi-os-para-imoveis/SPEC-ENDPOINT.md" && grep -q "b179ae75-3d56-4de8-8840-fc9c4d9ec21e" ".planning/quick/260501-gwj-especificar-endpoint-yzi-os-para-imoveis/SPEC-ENDPOINT.md" && grep -q "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361" ".planning/quick/260501-gwj-especificar-endpoint-yzi-os-para-imoveis/SPEC-ENDPOINT.md" && grep -qi "_extras" ".planning/quick/260501-gwj-especificar-endpoint-yzi-os-para-imoveis/SPEC-ENDPOINT.md" && echo "VERIFY OK"</automated>
  </verify>
  <done>
    SPEC-ENDPOINT.md existe em `.planning/quick/260501-gwj-especificar-endpoint-yzi-os-para-imoveis/`, tem ≥200 linhas, contém as 3 ações (imovel.upsert/delete/unpublish), os 2 tenant_ids da whitelist, menção explícita a `_extras` como ignorado, mapeamento das 18 colunas em tabela markdown, todas as respostas HTTP documentadas (200/400/401/415/422/500) e checklist de implementação para o dev backend. Nenhum arquivo de código foi criado ou modificado.
  </done>
</task>

</tasks>

<verification>
- Documento `SPEC-ENDPOINT.md` existe no diretório da quick task
- Documento tem todas as 13 seções na ordem especificada
- Tabela de mapeamento de 18 colunas está completa
- Cada ação (upsert/delete/unpublish) tem exemplo de request + response
- Nenhum arquivo `.py`, `.ts`, `.sql` foi criado ou modificado
- Nenhum workflow n8n foi alterado
</verification>

<success_criteria>
- Um dev backend YZI OS consegue ler SPEC-ENDPOINT.md e implementar POST /webhook/imoveis sem precisar fazer perguntas adicionais sobre rota, auth, payload, validação, regras de upsert, comportamento por ação ou respostas HTTP.
- A spec deixa explícito o que está fora de escopo na v1 (seção 11), prevenindo scope creep.
- A spec confirma que `data._extras` é IGNORADO na v1 (pelo menos 2 menções explícitas).
- A spec lista as 18 colunas exatas da tabela `imoveis` que serão mapeadas no upsert.
- Frase de fechamento documental: "Não implementei nada. Apenas especifiquei o endpoint YZI OS."
</success_criteria>

<output>
Após completar, criar `.planning/quick/260501-gwj-especificar-endpoint-yzi-os-para-imoveis/quick-260501-gwj-01-SUMMARY.md` resumindo:
- Caminho da spec criada
- Decisões v1 tomadas (auth bearer estático, hard delete, merge parcial em upsert, jsonb merge para metadata)
- Itens explicitamente fora de escopo (lista da seção 11)
- Próxima ação recomendada: handoff da spec para o dev backend YZI OS implementar
</output>
