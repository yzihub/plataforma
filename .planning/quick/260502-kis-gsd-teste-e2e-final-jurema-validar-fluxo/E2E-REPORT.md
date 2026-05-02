# E2E Test Report — Agente Ju (Jurema Brokers)

## Constantes do teste

| Campo         | Valor                                                    |
| ------------- | -------------------------------------------------------- |
| TENANT_ID     | 82cc7aa9-fc6e-4f37-8d8e-8a71c1691361                    |
| PHONE_TEST    | **5585911110099** (verificado como inédito antes do teste) |
| API_URL       | https://yzi-os.yzihub.com/agent/jurema                   |
| SUPABASE_URL  | https://dwmbklfkrtumfaxrbxio.supabase.co                 |
| Timestamp ISO | 2026-05-02T17:50:23Z                                     |
| lead_id       | 3fda3bc3-07ad-414e-a2fe-3d3991a31dc8                    |
| deal_id       | 92c2fe92-edb3-4667-a388-f145af4e5cda                    |

Pré-condição: Antes do MSG 1, consultado o Supabase via REST API e confirmado que não havia nenhum lead com `phone_normalized='5585911110099'` AND `tenant_id='82cc7aa9-fc6e-4f37-8d8e-8a71c1691361'`. Resultado: array vazio `[]`.

---

## Mensagem 1 — Saudação fria

### Request payload

```json
{
  "message": "Oi, estou procurando um imóvel",
  "phone": "5585911110099",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361"
}
```

### HTTP status e latência

- Status: **200 OK**
- Latência: **1373ms**

### Response body (completo)

```json
{
  "mode": "reply",
  "messages": [
    "Olá, seja bem-vindo à Jurema Brokers. Eu sou a Ju e vou acompanhar seu atendimento por aqui.\n\nPra eu te direcionar melhor, me conta: você está buscando comprar, alugar ou investir em um imóvel?"
  ],
  "metadata": {
    "agent": "jurema",
    "lead_id": "3fda3bc3-07ad-414e-a2fe-3d3991a31dc8",
    "deal_id": "92c2fe92-edb3-4667-a388-f145af4e5cda",
    "deal_stage": "qualificacao",
    "qualification_status": "incompleto",
    "lead_score": 0,
    "missing_fields": [
      "intent",
      "property_type",
      "location_preference",
      "budget_max",
      "bedrooms",
      "timeline"
    ],
    "feature_flags": {
      "id": "5efa88db-3742-4cc1-a04a-f8ca3bfea2ff",
      "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
      "agent_name": "jurema",
      "tts_enabled": false,
      "stt_enabled": false,
      "translation_enabled": false,
      "voice_reply_mode": "off",
      "preferred_tts_provider": "google_gemini",
      "preferred_tts_model": "gemini-3.1-flash-tts-preview",
      "metadata": {},
      "created_at": "2026-04-24T20:17:21.657832+00:00",
      "updated_at": "2026-04-24T20:17:21.657832+00:00"
    },
    "imoveis_count": 0
  }
}
```

### Metadata extraída

| Campo                | Valor                                                              |
| -------------------- | ------------------------------------------------------------------ |
| lead_id              | 3fda3bc3-07ad-414e-a2fe-3d3991a31dc8                             |
| deal_id              | 92c2fe92-edb3-4667-a388-f145af4e5cda                             |
| deal_stage           | qualificacao                                                       |
| lead_score           | 0                                                                  |
| qualification_status | incompleto                                                         |
| missing_fields       | intent, property_type, location_preference, budget_max, bedrooms, timeline |
| imoveis_count        | 0                                                                  |

### Checkpoint C1: PASS

Critérios:
- [x] deal_stage = 'qualificacao' — **OK** (recebido: qualificacao)
- [x] qualification_status = 'incompleto' — **OK**
- [x] lead_score = 0 — **OK**
- [x] imoveis_count = 0 — **OK**
- [x] Resposta da Ju correta: saudação sem mostrar catálogo — **OK**

---

## Mensagem 2 — Qualificação compra

### Request payload

```json
{
  "message": "Quero comprar um apartamento no Bessa com 3 quartos até 700 mil",
  "phone": "5585911110099",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "source": "site",
  "entrypoint": "property_search"
}
```

### HTTP status e latência

- Status: **200 OK**
- Latência: **1022ms**

### Response body (completo)

```json
{
  "mode": "reply",
  "messages": [
    "Certo. E pensando no prazo, você quer avançar agora, nos próximos meses ou ainda está pesquisando com calma?"
  ],
  "metadata": {
    "agent": "jurema",
    "lead_id": "3fda3bc3-07ad-414e-a2fe-3d3991a31dc8",
    "deal_id": "92c2fe92-edb3-4667-a388-f145af4e5cda",
    "deal_stage": "perfil_busca",
    "qualification_status": "quente",
    "lead_score": 75,
    "missing_fields": [
      "timeline"
    ],
    "feature_flags": {
      "id": "5efa88db-3742-4cc1-a04a-f8ca3bfea2ff",
      "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
      "agent_name": "jurema",
      "tts_enabled": false,
      "stt_enabled": false,
      "translation_enabled": false,
      "voice_reply_mode": "off",
      "preferred_tts_provider": "google_gemini",
      "preferred_tts_model": "gemini-3.1-flash-tts-preview",
      "metadata": {},
      "created_at": "2026-04-24T20:17:21.657832+00:00",
      "updated_at": "2026-04-24T20:17:21.657832+00:00"
    },
    "imoveis_count": 0
  }
}
```

### Metadata extraída

| Campo                | Valor         |
| -------------------- | ------------- |
| deal_stage           | perfil_busca  |
| lead_score           | 75            |
| qualification_status | quente        |
| missing_fields       | timeline      |
| imoveis_count        | 0             |

### Checkpoint C2: PASS

Critérios:
- [x] deal_stage = 'perfil_busca' — **OK**
- [x] qualification_status = 'quente' — **OK**
- [x] lead_score >= 70 — **OK** (75)
- [x] missing_fields inclui 'timeline' — **OK** (apenas timeline restando)
- [x] Verificado em jurema_deals: intent='comprar', property_type='apartamento', location_preference='Bessa', budget_max=700000, bedrooms=3 — **OK** (confirmado via Q2 Supabase)

---

## Mensagem 3 — Prazo + financiamento

### Request payload

```json
{
  "message": "Quero avançar nos próximos 60 dias e pretendo financiar",
  "phone": "5585911110099",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "source": "site",
  "entrypoint": "property_search"
}
```

### HTTP status e latência

- Status: **200 OK**
- Latência: **1005ms**

### Response body (completo)

```json
{
  "mode": "reply",
  "messages": [
    "Perfeito. Seu perfil já está bem encaminhado. Quer que eu te conecte com um corretor ou prefere que eu separe algumas opções antes?"
  ],
  "metadata": {
    "agent": "jurema",
    "lead_id": "3fda3bc3-07ad-414e-a2fe-3d3991a31dc8",
    "deal_id": "92c2fe92-edb3-4667-a388-f145af4e5cda",
    "deal_stage": "corretor",
    "qualification_status": "quente",
    "lead_score": 95,
    "missing_fields": [],
    "feature_flags": {
      "id": "5efa88db-3742-4cc1-a04a-f8ca3bfea2ff",
      "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
      "agent_name": "jurema",
      "tts_enabled": false,
      "stt_enabled": false,
      "translation_enabled": false,
      "voice_reply_mode": "off",
      "preferred_tts_provider": "google_gemini",
      "preferred_tts_model": "gemini-3.1-flash-tts-preview",
      "metadata": {},
      "created_at": "2026-04-24T20:17:21.657832+00:00",
      "updated_at": "2026-04-24T20:17:21.657832+00:00"
    },
    "imoveis_count": 0
  }
}
```

### Metadata extraída

| Campo                | Valor    |
| -------------------- | -------- |
| deal_stage           | corretor |
| lead_score           | 95       |
| qualification_status | quente   |
| missing_fields       | []       |
| imoveis_count        | 0        |

### Checkpoint C3: PASS

Critérios:
- [x] deal_stage avança para 'corretor' — **OK**
- [x] lead_score >= 70 (quente) — **OK** (95)
- [x] missing_fields = [] — **OK**
- [x] qualification_status = 'quente' — **OK**
- [x] Verificado em jurema_deals: timeline='60 dias', payment_method='financiamento', missing_fields=[] — **OK** (confirmado via Q2 Supabase)

---

## Mensagem 4 — Pedir opções

### Request payload

```json
{
  "message": "Pode separar algumas opções pra mim",
  "phone": "5585911110099",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "source": "site",
  "entrypoint": "property_search"
}
```

### HTTP status e latência

- Status: **200 OK**
- Latência: **1124ms**

### Response body (completo)

```json
{
  "mode": "reply",
  "messages": [
    "Separei algumas opções que podem fazer sentido com o seu perfil:\n\n1. APARTAMENTO PARA VENDA NO BESSA\nApartamento — Bessa — R$ 525.000,00 — 2 quarto(s) — 59 m²\nhttps://juremabksimoveis.com.br/imoveis/apartamento-para-venda-no-bessa/\n\nAlguma delas chamou sua atenção ou você quer que eu ajuste a busca?"
  ],
  "metadata": {
    "agent": "jurema",
    "lead_id": "3fda3bc3-07ad-414e-a2fe-3d3991a31dc8",
    "deal_id": "92c2fe92-edb3-4667-a388-f145af4e5cda",
    "deal_stage": "corretor",
    "qualification_status": "quente",
    "lead_score": 95,
    "missing_fields": [],
    "feature_flags": {
      "id": "5efa88db-3742-4cc1-a04a-f8ca3bfea2ff",
      "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
      "agent_name": "jurema",
      "tts_enabled": false,
      "stt_enabled": false,
      "translation_enabled": false,
      "voice_reply_mode": "off",
      "preferred_tts_provider": "google_gemini",
      "preferred_tts_model": "gemini-3.1-flash-tts-preview",
      "metadata": {},
      "created_at": "2026-04-24T20:17:21.657832+00:00",
      "updated_at": "2026-04-24T20:17:21.657832+00:00"
    },
    "imoveis_count": 1
  }
}
```

### Metadata extraída

| Campo                | Valor    |
| -------------------- | -------- |
| deal_stage           | corretor |
| lead_score           | 95       |
| qualification_status | quente   |
| missing_fields       | []       |
| imoveis_count        | **1**    |

### Conteúdo do imóvel enviado

```
APARTAMENTO PARA VENDA NO BESSA
Apartamento — Bessa — R$ 525.000,00 — 2 quarto(s) — 59 m²
https://juremabksimoveis.com.br/imoveis/apartamento-para-venda-no-bessa/
```

### Checkpoint C4: PASS

Critérios:
- [x] imoveis_count >= 1 — **OK** (1)
- [x] Pelo menos 1 linha em jurema_property_matches com property_source='imoveis' e status='enviado' — **OK** (confirmado Q3)
- [x] Evento 'property_options_requested' presente em agent_metrics_events — **OK** (confirmado Q4)
- [x] Resposta da Ju inclui imóvel formatado com bairro, valor e link — **OK**

---

## Estado final no Supabase

### Q1 — leads

| id | name | phone | phone_normalized | status | score | tenant_id | created_at |
|----|------|-------|-----------------|--------|-------|-----------|------------|
| 3fda3bc3-07ad-414e-a2fe-3d3991a31dc8 | Cliente 0099 | 5585911110099 | 5585911110099 | new | 0 | 82cc7aa9-fc6e-4f37-8d8e-8a71c1691361 | 2026-05-02T17:52:08.915868+00:00 |

**Observações:** Lead criado corretamente. O `score` no campo `leads.score` permanece 0 (o lead_score atualizado está em `jurema_deals.lead_score`, não diretamente na tabela leads via este campo).

### Q2 — jurema_deals

| Campo | Valor |
|-------|-------|
| id | 92c2fe92-edb3-4667-a388-f145af4e5cda |
| lead_id | 3fda3bc3-07ad-414e-a2fe-3d3991a31dc8 |
| deal_stage | **corretor** |
| qualification_status | **quente** |
| intent | **comprar** |
| property_type | **apartamento** |
| location_preference | **Bessa** |
| budget_max | **700000** |
| bedrooms | **3** |
| timeline | **60 dias** |
| payment_method | **financiamento** |
| lead_score | **95** |
| broker_status | nao_atribuido |
| metadata.profile_complete | true |
| metadata.missing_fields | [] |
| created_at | 2026-05-02T17:52:09.09675+00:00 |
| updated_at | 2026-05-02T17:52:40.376016+00:00 |

**Todos os campos de perfil preenchidos corretamente.**

### Q3 — jurema_property_matches

| id | deal_id | property_id | property_source | match_score | status | created_at |
|----|---------|-------------|-----------------|-------------|--------|------------|
| 1f3a2b23-17a0-4de7-8ed0-8c1bc4e05a92 | 92c2fe92-edb3-4667-a388-f145af4e5cda | **wp-2803** | **imoveis** | 95 | **enviado** | 2026-05-02T17:52:40.61988+00:00 |

**Observação:** O property_id gravado é `wp-2803` (formato WordPress), não `JP009` como no exemplo da documentação. Isso reflete o imóvel real disponível no banco — comportamento correto.

### Q4 — agent_metrics_events

| id | agent_name | event_type | project_id | created_at |
|----|------------|------------|------------|------------|
| 3e888361... | jurema | **property_options_requested** | 92c2fe92... | 2026-05-02T17:52:40.680984+00:00 |
| 04a07057... | jurema | **message_received** | 92c2fe92... | 2026-05-02T17:52:40.234167+00:00 |
| 37c695d8... | jurema | **stage_changed** | 92c2fe92... | 2026-05-02T17:52:30.742782+00:00 |
| 951462fd... | jurema | **message_received** | 92c2fe92... | 2026-05-02T17:52:30.464911+00:00 |
| 9ae9d04b... | jurema | **stage_changed** | 92c2fe92... | 2026-05-02T17:52:20.341705+00:00 |
| 7e26e478... | jurema | **message_received** | 92c2fe92... | 2026-05-02T17:52:20.041362+00:00 |
| 01474133... | jurema | **message_received** | 92c2fe92... | 2026-05-02T17:52:09.179498+00:00 |

Total de eventos: 7 (4 message_received + 2 stage_changed + 1 property_options_requested)

**Observação sobre coluna `payload`:** A tabela `agent_metrics_events` não possui coluna `payload` (a documentação CLAUDE.md menciona esse campo mas o schema real usa `metadata` em vez de `payload`). Os dados de contexto estão em `metadata` conforme verificado na amostra do schema.

---

## Checkpoint C5 (eventos): PASS

Critérios:
- [x] Pelo menos 1 evento 'message_received' por chamada — **OK** (4 eventos message_received, um por mensagem)
- [x] Pelo menos 1 'stage_changed' entre as mensagens — **OK** (2 eventos: qualificacao→perfil_busca e perfil_busca→corretor)
- [x] Evento 'property_options_requested' presente — **OK** (presente após MSG 4)

---

## Smoke das rotas do cockpit

Base URL utilizada: **http://localhost:3002** (servidor Next.js dev iniciado localmente durante o teste; porta 3002 foi escolhida automaticamente pois 3001 estava em uso)

| Rota | Status HTTP | Bytes | Erros detectados | Classificação |
|------|-------------|-------|-----------------|---------------|
| /cockpit/leads | 200 | 32117 | Nenhum | **OK** |
| /cockpit/jurema | 200 | 37862 | Nenhum | **OK** |
| /cockpit/imoveis | 200 | 32579 | Nenhum | **OK** |
| /cockpit/contratos/novo | 200 | 32956 | Nenhum | **OK** |
| /cockpit/contratos | 200 | 32340 | Nenhum | **OK** |
| /cockpit/financeiro | 200 | 31974 | Nenhum | **OK** |

**Todas as 6 rotas carregam com HTTP 200 sem nenhuma string de erro ("Application error", "Internal Server Error", "Unhandled", "TypeError").**

Observações:
- As primeiras requisições após iniciar o servidor levam mais tempo (~30-45s) pois o Next.js 16 com Turbopack compila cada rota no primeiro acesso.
- O bypass de autenticação dev está ativo (sem necessidade de login no ambiente local).
- /cockpit/jurema retornou o maior payload (37862 bytes), indicando o Kanban com mais dados carregados.

---

## Bugs / Anomalias encontrados

1. **Campo `payload` ausente em `agent_metrics_events`**
   - Onde aparece: Q4 — query Supabase
   - Sintoma: Coluna `payload` não existe na tabela; a documentação CLAUDE.md menciona esse campo mas o schema real usa `metadata`
   - Severidade: Baixa (cosmética — documentação desatualizada, não afeta funcionamento)
   - Hipótese: O schema da tabela evoluiu e o campo foi renomeado de `payload` para `metadata` em alguma migração. A tabela funciona corretamente.

2. **Campo `leads.score` não é atualizado pelo agente Ju**
   - Onde aparece: Q1 — tabela leads
   - Sintoma: Após o fluxo completo (lead_score=95 em jurema_deals), o campo `score` na tabela `leads` permanece 0
   - Severidade: Baixa (dado existe em jurema_deals.lead_score; não quebra nada)
   - Hipótese: A sincronização do score de volta para a tabela `leads` pode não estar implementada no backend Agno. O frontend já lê lead_score de jurema_deals, então não há impacto visual.

3. **property_id usa formato wp-XXXX, não JP009**
   - Onde aparece: Q3 — jurema_property_matches
   - Sintoma: O imóvel gravado tem property_id='wp-2803' (formato WordPress), diferente do exemplo da documentação ('JP009')
   - Severidade: Baixa (comportamento esperado — documentação usa exemplo antigo; o sistema evoluiu para IDs do WordPress)
   - Hipótese: A integração do webhook WordPress foi implementada recentemente e os imóveis agora têm IDs no formato wp-XXXX. O sistema funciona corretamente com esse formato.

---

## Veredito Final

| Checkpoint | Resultado | Observação |
|------------|-----------|------------|
| C1 Saudação fria | **PASS** | deal_stage=qualificacao, score=0, sem imóveis exibidos |
| C2 Qualificação compra | **PASS** | deal_stage=perfil_busca, score=75, quente, missing=[timeline] |
| C3 Prazo + financiamento | **PASS** | deal_stage=corretor, score=95, missing=[], timeline='60 dias' |
| C4 Pedido de opções (matches) | **PASS** | imoveis_count=1, match gravado em jurema_property_matches, evento property_options_requested |
| C5 Eventos | **PASS** | 4x message_received, 2x stage_changed, 1x property_options_requested |
| Smoke cockpit (6 rotas) | **PASS** | Todas 200 OK, zero erros de Application/Server Error |

**Status global: PASS**

O fluxo completo end-to-end da Ju está operacional. O backend Agno/YZI OS, a persistência no Supabase e as 6 rotas do cockpit estão funcionando conforme esperado.

### Próximas ações recomendadas

1. Investigar sincronização de `leads.score` com `jurema_deals.lead_score` no backend (baixa prioridade)
2. Atualizar documentação CLAUDE.md para refletir que `agent_metrics_events` usa coluna `metadata` ao invés de `payload`
3. Confirmar que property_id no formato `wp-XXXX` é o padrão definitivo e atualizar exemplos na documentação
4. Prosseguir para revisão técnica de contratos conforme previsto no plano (este E2E confirma que a base de dados está estável para o próximo passo)
5. Considerar adicionar smoke test automatizado nas rotinas de CI para os 6 endpoints do cockpit
