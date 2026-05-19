# Ju Runtime Evolution Plan

## Contexto

O projeto Jurema Brokers evoluiu rapidamente e hoje tem uma base operacional consolidada:

- Frontend em Next.js com TailAdmin e cockpit operacional.
- Supabase como source of truth, com RLS multi-tenant.
- Timeline, state operacional, leads, contratos, financeiro e cockpit ja existentes.
- Integracoes com Evolution API, n8n e OpenAI.

O gargalo principal atual esta na camada cognitiva/orquestradora da Ju dentro do n8n. O objetivo deste plano nao e trocar a stack nem reescrever o sistema, mas estabilizar e profissionalizar a camada AI-native sem quebrar o que ja funciona.

## Principio Arquitetural

A Ju deve deixar de ser um workflow cognitivo concentrado no n8n e passar a ser um runtime operacional AI-native, com responsabilidades bem separadas:

```text
n8n = borda operacional, eventos, integracoes e automacoes
Python = runtime cognitivo, memoria, contexto, tools e orquestracao
Supabase = source of truth operacional
Frontend/Cockpit = controle humano, operacao e observabilidade
```

## Runtime Topology

```text
WhatsApp / Evolution
        |
        v
n8n
- recebe eventos
- normaliza payload bruto
- baixa midia quando necessario
- chama runtime Ju
- executa automacoes simples
        |
        v
Python Runtime Ju
- entende intencao
- monta contexto
- decide plano
- chama tools/actions
- controla memoria
- aplica regras
- faz retries/degradacao
- retorna resposta/acoes
        |
        v
Supabase
- source of truth
- leads
- conversas
- timeline
- contratos
- financeiro
- estado operacional
- audit/replay
        |
        v
Frontend Cockpit
- operacao humana
- observabilidade
- timeline
- controle de estado
- intervencao/manual override
```

## Boundaries

### n8n

Deve continuar responsavel por:

- Webhooks Evolution/WhatsApp.
- Normalizacao inicial de eventos.
- Download ou resolucao simples de midia.
- Trigger de rotinas externas.
- Envio final por WhatsApp/Evolution.
- Automacoes deterministicas simples.
- Agendamento, fan-out e integracoes low-code.

Nao deve ser o runtime principal para:

- Memoria conversacional complexa.
- Planejamento de acoes.
- Context engine.
- Multimodal robusto.
- Regras de negocio evolutivas.
- Retries inteligentes.
- Replay/debug semantico.
- Orquestracao de tools.

### Python Runtime

Deve assumir:

- Runtime da Ju/Nina/agentes.
- Interpretacao multimodal.
- Context engine.
- Memory engine.
- Policy/enforcement engine.
- Tool router.
- Action planner.
- Retry/degradation manager.
- Structured tracing.
- Replay deterministico.
- Testes unitarios e contratuais da cognicao.

### Supabase

Permanece como:

- Fonte oficial de estado.
- Historico operacional.
- Timeline.
- Memoria persistente.
- Registros de leads, contratos, financeiro, imoveis e followups.
- Audit trail.
- Estado de conversas.
- Feature flags e configuracoes por tenant.

### Frontend / Cockpit

Permanece como:

- Superficie operacional.
- Revisao humana.
- Observabilidade.
- Pausar/retomar IA.
- Ver timeline.
- Corrigir estado.
- Disparar acoes.
- Inspecionar decisoes.

## Funcionamento Correto da Ju

Fluxo ideal:

```text
1. Evento chega.
2. n8n normaliza evento bruto.
3. Midia e resolvida para asset operacional.
4. Evento e registrado no Supabase.
5. Python carrega estado + contexto.
6. Ju classifica intencao.
7. Ju monta plano.
8. Ju decide se responde, cria tarefa, atualiza lead, agenda, gera contrato etc.
9. Tools executam acoes com idempotencia.
10. Resultado vira timeline/eventos.
11. Resposta volta para n8n.
12. n8n envia mensagem final.
13. Cockpit mostra rastreabilidade.
```

A Ju deve operar com tres camadas cognitivas claras:

```text
Input Understanding
- texto
- audio
- imagem
- documento
- tipo do evento
- origem
- identidade do lead

Operational Context
- lead
- conversa
- status
- ultimos eventos
- imoveis relacionados
- contratos
- tarefas
- regras do tenant

Decision / Action
- responder
- perguntar follow-up
- atualizar lead
- acionar corretor
- criar timeline event
- criar tarefa
- iniciar contrato
- degradar para humano
```

## Multimodal

O multimodal deve virar uma etapa explicita, nao um branch espalhado.

Estrutura recomendada:

```text
media_assets
- id
- tenant_id
- conversation_id
- message_id
- type: audio/image/video/document
- storage_url
- mime_type
- file_name
- size
- status: received/resolved/transcribed/failed
- extracted_text
- metadata
- error
```

Fluxo de audio:

```text
WhatsApp audio
 -> n8n resolve midia
 -> salva asset ou passa binario
 -> Python/transcription service transcreve
 -> Supabase registra transcript
 -> Ju processa texto transcrito
```

Transcricao nao deve ser memoria. Transcricao e extracao de input. Depois disso, a Ju trabalha com um evento textual normalizado.

Fallback correto:

- Se transcricao falha por quota, timeout ou formato, registrar `media_transcription_failed`.
- Criar timeline event.
- Responder com fallback curto ou encaminhar para humano, conforme regra do tenant.
- Nunca travar a conversa inteira.

## Memoria

Separar memoria em quatro tipos:

```text
1. Conversation Memory
Ultimas mensagens relevantes da conversa.

2. Operational Memory
Estado real do lead/deal/contrato/tarefa no Supabase.

3. Long-Term Preferences
Preferencias persistentes do cliente ou tenant.

4. Episodic Timeline
Eventos imutaveis: mensagens, decisoes, acoes, falhas, handoffs.
```

Redis pode continuar como buffer temporario/debounce, mas nao deve ser a memoria operacional persistente. Supabase deve continuar sendo a fonte da verdade.

Estruturas recomendadas:

```text
conversation_messages
timeline_events
agent_runs
agent_run_steps
media_assets
tool_calls
lead_memory_facts
tenant_ai_config
```

## Context Engine

O contexto deve ser montado por um componente dedicado no Python, nao por prompt espalhado no n8n.

Entrada:

```json
{
  "tenant_id": "...",
  "conversation_id": "...",
  "lead_id": "...",
  "message_id": "...",
  "normalized_input": "..."
}
```

Saida:

```json
{
  "lead": {},
  "conversation": {},
  "recent_messages": [],
  "timeline_summary": "",
  "active_tasks": [],
  "business_rules": [],
  "available_actions": [],
  "risk_flags": []
}
```

Esse engine deve ser testavel e versionado.

## Tools / Actions

Tools devem ser funcoes explicitas com contrato estavel.

Exemplos:

```text
update_lead_status
create_followup
assign_broker
search_properties
create_contract_draft
send_broker_notification
pause_ai
resume_ai
register_timeline_event
```

Cada tool precisa ter:

- Schema de input.
- Schema de output.
- Idempotency key.
- `tenant_id` obrigatorio.
- Autorizacao.
- Log em `tool_calls`.
- Erro estruturado.
- Retry policy.

O LLM nao deve escrever direto no banco. Ele escolhe uma intencao ou acao; o runtime valida e executa.

## Rules / Enforcement

Criar uma camada de regras antes e depois do LLM.

Antes:

- IA pausada?
- Lead bloqueado?
- Tenant ativo?
- Mensagem duplicada?
- Evento velho?
- Tipo de midia suportado?
- Horario permitido?

Depois:

- Acao permitida?
- Dados suficientes?
- Precisa humano?
- Resposta contem promessa indevida?
- Contrato/financeiro exige confirmacao?
- Update sensivel precisa cockpit?

Isso evita que a inteligencia vire o lugar onde regra de negocio fica escondida.

## Observabilidade / Replay

Toda execucao cognitiva deve gerar um `agent_run`.

```text
agent_runs
- id
- tenant_id
- conversation_id
- lead_id
- input_event_id
- status
- model
- started_at
- finished_at
- latency_ms
- final_decision
- error
```

```text
agent_run_steps
- run_id
- step_type: context/load/transcribe/llm/tool/policy/fallback
- input_summary
- output_summary
- status
- error
- duration_ms
```

Isso permite:

- Replay de decisao.
- Debug de edge-case.
- Auditoria.
- Comparar versoes de prompt/runtime.
- Saber se falhou midia, contexto, LLM, tool ou envio.

## Retries e Degradacao

Retries devem ser por camada:

```text
Midia:
- retry download/transcription
- fallback para "nao consegui ouvir o audio"

LLM:
- retry curto
- downgrade model
- fallback resposta segura
- handoff humano

Tools:
- retry idempotente
- registrar pending action
- alerta no cockpit

Envio WhatsApp:
- retry Evolution
- registrar outbound_failed
```

Falha de uma camada nao deve corromper estado nem travar o pipeline.

## Compatibilidade com o Sistema Atual

A transicao deve preservar os contratos atuais.

Inicialmente, o n8n chama o Python runtime via HTTP:

```text
POST /ju/runtime/process-event
```

Payload compativel:

```json
{
  "tenant_id": "...",
  "event": {},
  "lead": {},
  "conversation": {},
  "message": {},
  "media": {}
}
```

Resposta:

```json
{
  "status": "ok",
  "reply": "texto para enviar",
  "actions": [],
  "timeline_events": [],
  "fallback": false
}
```

O frontend nao precisa mudar no comeco. Ele continua lendo Supabase/timeline.

## Roadmap de Migracao

### Fase 1: Estabilizacao sem quebrar nada

- Documentar fluxo atual.
- Congelar contratos criticos.
- Adicionar logs estruturados no n8n.
- Garantir fallback de audio, OpenAI e Evolution.
- Criar tabelas `agent_runs`, `agent_run_steps`, `tool_calls`, `media_assets`.
- Nao migrar decisao ainda.

### Fase 2: Python runtime em shadow mode

- Criar runtime Python.
- n8n continua decidindo oficialmente.
- Python recebe copia dos eventos e gera decisao shadow.
- Comparar decisao atual vs decisao nova.
- Sem impacto no usuario final.

### Fase 3: Migrar context engine

- Python passa a montar contexto.
- n8n chama Python para contexto.
- Prompt atual ainda pode continuar no n8n temporariamente.
- Validar equivalencia.

### Fase 4: Migrar decisao da Ju

- Python assume classificacao, intencao e plano.
- n8n vira executor de integracao.
- Tools criticas ainda podem continuar chamando APIs existentes.

### Fase 5: Migrar tools/actions

- Tools passam a ser Python/Next APIs com contratos.
- n8n mantem apenas envio, webhooks e automacoes externas.
- Cockpit ganha visao de agent runs.

### Fase 6: Runtime institucional

- Versionamento de prompts.
- Replay.
- Testes de regressao.
- Suites de casos reais.
- Politicas por tenant.
- Observabilidade operacional completa.

## Riscos

Principais riscos:

- Tentar migrar tudo de uma vez.
- Duplicar source of truth entre Python e Supabase.
- Transformar Python em outro workflow desorganizado.
- Deixar regras dentro de prompt.
- Nao criar replay desde cedo.
- Nao manter compatibilidade com n8n durante transicao.
- Subestimar multimodal e falhas de provedor.

Mitigacao:

- Migracao gradual.
- Contratos JSON estaveis.
- Supabase sempre como fonte oficial.
- Shadow mode antes de producao.
- Logs estruturados desde a fase 1.
- Tools com idempotencia.

## Estrategia de Transicao

A transicao deve ser incremental e reversivel:

1. Manter o workflow atual funcionando.
2. Adicionar observabilidade e tabelas de runtime.
3. Rodar Python em shadow mode.
4. Migrar contexto antes de migrar decisao.
5. Migrar decisao antes de migrar tools.
6. Promover cada etapa somente depois de comparar com casos reais.

O objetivo final e transformar a Ju em um agente operacional versionavel, observavel, testavel e evolutivo, mantendo frontend, Supabase, cockpit e timeline como fundacao consolidada do sistema.
