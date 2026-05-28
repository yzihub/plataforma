# Ju v3 Cognitive Runtime Bridge

Workflow gerado: `workflow-jurema-main.v3-cognitive-runtime-bridge.json`

Base: `workflow-jurema-main.v2-runtime-hardened.json`

Objetivo: substituir somente o cérebro cognitivo dentro do n8n por `POST https://runtime.yzihub.com/cognitive/turn`, preservando a camada operacional existente.

## 1. Nodes Que Devem Permanecer

Permanecem todos os nodes de ingestao, normalizacao, persistencia, Redis, midia, waits, outbound e UX:

- `Webhook1`, `Normaliza Webhook1`, `Switch1`
- `Verificar Atendimento1`, `Switch Block1`, `PARA IA1`, `IF IA Pausada Supabase`, `IA Pausada - Encerrar`
- `dados do banco`, `Code in JavaScript`, `Dados do Lead`, `Sync Operational Context`, `Build Context`
- `Switch7`, `REDIS`, `Wait4`, `REDIS3`, `UNIFICA REDIS`, `IF-COMPARA`, `Detecta Finalização`
- `Normalize Audio Payload`, `Audio Media Valid?`, `Convert to audio1`, `OpenAI1`, `Persist Audio Transcript`, `Audio Memory1`
- `Montar Dados da Imagem1`, `Convert to imagens1`, `Upload Imagem no imgbb1`, `urls2`, `uploads_esperados2`, `redis2`, `Wait5`, `Redis6`, `memoria_redis2`
- `Montar Dados do video1`, `Convert to video1`, `Upload Video no Supabase1`, `urls3`, `uploads_esperados3`, `redis3`, `Wait6`, `Redis7`, `memoria_redis3`
- `Salvar Outbound Supabase`, `ArrayResposta1`, `Split Out1`, `Loop Over Items`, `Wait7`, `Evolution API`
- `Cron Follow-up Tasks`, `Buscar Follow-ups Vencidos`, `Delay Humano Follow-up`, `Marcar Follow-up Resolvido`

Observacao: `OpenAI1` foi mantido porque pertence ao pipeline de transcricao de audio, nao ao cerebro cognitivo. Remove-lo quebraria audio.

## 2. Nodes Removidos

Removidos apenas os nodes cognitivos LangChain/n8n que formavam o antigo cerebro:

- `Atendente`
- `Think1`
- `Anthropic Chat Model1`
- `postgres1`
- `OpenAI Chat Model2`
- `OpenAI Chat Model3`
- `Embeddings OpenAI1`
- `Supabase Vector Store1`
- `conhecimento_estrategico_luana1`
- `atualizar_qualificacao`
- `setar_lead_quente`
- `consultar_imoveis`
- `SUPORTE1`

Esses nodes foram removidos porque o runtime externo agora pensa, governa estado, orquestra ferramentas e decide a resposta.

## 3. Nodes Adicionados

Foram adicionados tres nodes:

- `Preparar Runtime Payload`: monta payload canonico para o runtime preservando o contexto consolidado pelo n8n.
- `Runtime Cognitivo`: HTTP Request para `POST /cognitive/turn`.
- `Normaliza Runtime Output`: transforma a resposta do runtime de volta no contrato esperado por `Salvar Outbound Supabase`.

## 4. Onde Conectar o Runtime

Conexao final:

```text
Build Context
  -> Preparar Runtime Payload
  -> Runtime Cognitivo
  -> Normaliza Runtime Output
  -> Salvar Outbound Supabase
  -> ArrayResposta1
  -> Split Out1
  -> Loop Over Items
  -> Evolution API
```

Isso preserva todo o fluxo antes do cerebro e todo o fluxo operacional depois dele.

## 5. Fallback Seguro

O node `Runtime Cognitivo` usa:

- `retryOnFail: true`
- `maxTries: 2`
- `waitBetweenTries: 3000`
- `onError: continueRegularOutput`
- timeout de 45s

O node `Normaliza Runtime Output` aplica fallback se o runtime falhar, retornar vazio ou vier com erro:

```text
Tive uma oscilacao aqui para processar sua mensagem. Vou retomar com seguranca: me confirma em uma frase o que voce quer priorizar agora?
```

Rollback simples: reativar/importar `workflow-jurema-main.v2-runtime-hardened.json` ou `workflow-jurema-main.production-stabilized.json`.

## 6. Como Manter Cards Funcionando

O n8n continua enviando mensagens pelo mesmo caminho:

```text
Salvar Outbound Supabase -> ArrayResposta1 -> Split Out1 -> Loop Over Items -> Evolution API
```

O contrato mantido e `output`. Se o runtime retornar URLs puras isoladas em linhas/mensagens, o `ArrayResposta1` continua fazendo split por `\n\n`, e o WhatsApp/Evolution continua renderizando previews/cards nativos.

Regra preservada:

- runtime decide quais imoveis e texto;
- n8n nao reconstrói URL;
- Evolution envia exatamente o texto final;
- URLs continuam vindo do runtime/ferramentas, nao de heuristica no outbound.

## 7. Como Manter Outbound Funcionando

`Normaliza Runtime Output` reidrata os campos esperados por `Salvar Outbound Supabase`:

- `output`
- `conversation_id`
- `tenant_id`
- `lead_id`
- `deal_id`
- `remoteJid`
- `telefoneCompleto`
- `sessionId`
- `event_type`
- `followup_task_id`
- `followup_task`

Assim, `Salvar Outbound Supabase`, `ArrayResposta1`, `Split Out1`, `Loop Over Items`, `Wait7`, `Evolution API` e `Marcar Follow-up Resolvido` continuam sem reescrita.

## 8. Fluxo Final Recomendado

```text
WhatsApp
 -> Evolution API
 -> n8n Webhook
 -> normalizacao inbound
 -> anti-loop/fromMe
 -> handoff humano/IA pausada
 -> persistencia Supabase
 -> Redis buffers/waits/media aggregation
 -> Build Context
 -> Runtime Cognitivo externo
 -> normalizacao da resposta
 -> salvar outbound Supabase
 -> split messages
 -> wait anti-spam
 -> Evolution outbound
 -> WhatsApp
```

## 9. Rollout Progressivo

1. Importar a v3 como workflow separado, inativo.
2. Configurar variaveis:
   - `YZI_COGNITIVE_RUNTIME_URL=https://runtime.yzihub.com/cognitive/turn`
   - `RUNTIME_COGNITIVE_WEBHOOK_SECRET` ou `EVOLUTION_WEBHOOK_SECRET`
3. Rodar com um numero QA isolado.
4. Validar texto simples.
5. Validar audio.
6. Validar imagem/video/upload.
7. Validar pedido de imovel com URLs/cards.
8. Validar handoff humano e `ai_paused`.
9. Validar follow-up cron.
10. Ativar em janela de baixo trafego.
11. Monitorar execucoes por 24h.
12. Se houver falha operacional, desativar v3 e reativar v2.

## 10. Alteracoes Exatas

Alteracoes estruturais:

- Removida conexao `Build Context -> Atendente`.
- Adicionada conexao `Build Context -> Preparar Runtime Payload`.
- Adicionada conexao `Preparar Runtime Payload -> Runtime Cognitivo`.
- Adicionada conexao `Runtime Cognitivo -> Normaliza Runtime Output`.
- Adicionada conexao `Normaliza Runtime Output -> Salvar Outbound Supabase`.
- Mantida conexao `Salvar Outbound Supabase -> ArrayResposta1`.
- Mantido todo o outbound depois de `ArrayResposta1`.

Payload enviado ao runtime inclui o contrato simples:

```json
{
  "message_id": "...",
  "conversation_id": "...",
  "tenant_id": "...",
  "phone": "...",
  "message": "..."
}
```

Tambem inclui campos adicionais de compatibilidade:

- `mensagemCliente`
- `remoteJid`
- `sessionId`
- `lead_id`
- `deal_id`
- `operational_context`
- `runtime_memory`
- `runtime_state`
- `context`
- `lead`
- `deal`
- `conversation`
- `data.key.id`
- `data.key.remoteJid`
- `data.message.conversation`

Esses campos garantem compatibilidade com o runtime atual e com evolucoes futuras sem quebrar o contrato minimo.

