# YZI OS / Ju Lightweight Rearchitecture Plan

## Decisao Oficial

Agno esta fora do hot-path operacional da Ju.

O hot-path oficial da Ju e:

```text
Evolution
  -> n8n
  -> Redis hot memory
  -> retrieval minimo
  -> tools
  -> GPT-4.1
  -> response governance
  -> persistence
  -> Evolution
```

Agno nao deve ser usado para orchestration, runtime, routing, memory, context
building, decision layer ou conversa operacional em tempo real.

Agno pode permanecer somente para:

- R&D.
- shadow runtime futuro.
- testes multi-agent.
- workflows avancados futuros.

## Baseline Atual

O Runtime Gateway institucional foi validado e continua valioso para auditoria,
replay, persistence, governance e investigacao. O problema identificado foi o
uso de runtime-heavy architecture no caminho principal do WhatsApp.

Problemas do desenho anterior:

- dupla orquestracao.
- context rebuilding.
- state duplication.
- token inflation.
- orchestration inflation.
- reasoning multicamada.
- tool spam.
- retrieval spam.
- latencia alta.
- custo alto.
- quota exhaustion.

Um caso real chegou a `78199 TPM` em conversa simples. Isso confirmou que a Ju
precisa de simplicidade operacional.

## Principios

A IA nao deve pensar o sistema inteiro. O sistema deve reduzir o que a IA
precisa pensar.

YZI OS deve ser:

- memory-centric.
- retrieval-minimal.
- XML-governed.
- tool-contract driven.
- operational-first.
- lightweight.

YZI OS nao deve ser:

- Agno-centric.
- runtime-heavy.
- state-machine-first.
- reasoning-heavy.
- LLM-orchestrated.
- tool-obsessed.

## Responsabilidades Finais

### n8n

- recebe webhooks Evolution.
- normaliza payload.
- usa Redis para debounce/continuidade curta.
- chama tools operacionais.
- chama GPT-4.1 para linguagem.
- envia WhatsApp.
- persiste inbound/outbound.

n8n e a camada de execucao, nao um runtime cognitivo paralelo.

### Redis

- memoria quente.
- ultimos turnos uteis.
- ultima pergunta.
- ultimo imovel/card enviado.
- continuidade curta.

Redis nao e fonte da verdade.

### Supabase

- leads.
- deals.
- conversations.
- conversation_messages.
- imoveis.
- follow-ups.
- corretor responsavel.
- persistence operacional.

Supabase e fonte da verdade.

### Supabase Vector

- memoria semantica.
- preferencias consolidadas.
- bairros.
- historico operacional resumido.
- retrieval consultivo.

Vector nao substitui tool transacional.

### Tools

- `consultar_imoveis`: unica fonte de verdade para imoveis, cards e URLs.
- `conhecimento_estrategico_luana1`: duvidas consultivas e conhecimento institucional.
- `atualizar_qualificacao`: dados operacionais novos.
- `setar_lead_quente`: visita, corretor, ligacao ou avancar.

### GPT-4.1

- linguagem.
- adaptacao humana.
- resposta curta.
- conversa natural.

GPT-4.1 nao deve reconstruir URL, planejar sistema inteiro, decidir estado
complexo ou substituir tools.

### Runtime Gateway

Fora do hot-path obrigatorio.

Pode permanecer para:

- auditoria.
- replay.
- investigacao.
- shadow evaluation.
- fallback futuro.
- casos complexos fora da conversa comum.

## Super XML V1

O XML operacional e contrato comprimido, nao prompt gigante.

```xml
<yzi_os tenant="jurema_brokers" agent="ju" version="light-1">
  <identity>
    <role>consultora imobiliaria no WhatsApp</role>
    <tone>calma, segura, experiente, contextual, profissional</tone>
    <avoid>chatbot, formulario, bullets, markdown, agressividade</avoid>
  </identity>

  <funnel>
    <stage id="novo">entender origem e intencao minima</stage>
    <stage id="qualificacao">coletar apenas dados uteis</stage>
    <stage id="busca">buscar e apresentar imoveis</stage>
    <stage id="visita">conduzir visita ou corretor</stage>
    <stage id="followup">retomar contexto sem requalificar</stage>
    <stage id="handoff">passar para humano quando necessario</stage>
  </funnel>

  <memory_contract>
    <remember>origem,cidade,estado,bairro,tipo_imovel,quartos,faixa_valor,intencao,timing,stage,corretor,followup,ultimo_imovel</remember>
    <ignore>emocao_inferida,psicologia,telemetria_cognitiva,estado_abstrato,reasoning</ignore>
    <authority>supabase_state &gt; redis_hot_memory &gt; vector_memory &gt; transcript</authority>
  </memory_contract>

  <retrieval_governance>
    <use_when>duvida consultiva, bairro, followup sem memoria quente, conhecimento institucional</use_when>
    <avoid_when>cumprimento, confirmacao simples, busca de imovel, link quebrado, reenvio</avoid_when>
    <max_chunks>2</max_chunks>
  </retrieval_governance>

  <tool_governance>
    <tool name="consultar_imoveis" truth="imoveis,cards,urls"/>
    <rule>reenvio ou link quebrado exige consultar_imoveis novamente</rule>
    <rule>nunca reconstruir slug ou URL</rule>
  </tool_governance>

  <response_governance>
    <style>texto corrido, curto, humano, sem lista</style>
    <url>somente URL retornada pela tool, em linha propria para preview</url>
  </response_governance>
</yzi_os>
```

## ju_light_context

Contexto minimo:

```json
{
  "message": "texto atual",
  "profile": {
    "name": "Cliente",
    "city": "Joao Pessoa",
    "state": "PB"
  },
  "requirements": {
    "bairro": "Bessa",
    "tipo_imovel": "casa",
    "quartos": "3",
    "faixa_valor": "ate 900 mil",
    "intencao": "morar",
    "timing": "proximos meses"
  },
  "operation": {
    "stage": "busca",
    "assigned_broker_id": null,
    "followup_due": null
  },
  "memory": {
    "useful_summary": "Procura casa no Bessa e aceita Intermares.",
    "last_question_asked": "faixa de valor",
    "last_properties_sent": ["JP1842"],
    "avoid_reasking": ["tipo_imovel", "bairro"]
  }
}
```

Nao incluir telemetria cognitiva, estados abstratos, transcript gigante,
emocao inferida ou reasoning.

## Light Routing Policy

- cumprimento: resposta direta, sem retrieval, sem tool.
- dado novo: salvar/considerar dado, resposta curta.
- pedido de imovel: `consultar_imoveis`.
- reenvio/link quebrado: `consultar_imoveis` obrigatorio.
- duvida consultiva: vector retrieval max 2 chunks.
- visita/corretor/ligacao: `setar_lead_quente` ou handoff.
- follow-up: Redis primeiro, vector somente se Redis nao bastar.

## Shadow Mode

Runtime Gateway e Agno podem existir em shadow fora do hot-path, sem afetar a
resposta oficial.

Comparar:

- tokens.
- latencia.
- tool calls.
- retrieval calls.
- naturalidade.
- conversao.
- UX WhatsApp.

## Metricas

Metas:

- reduzir TPM drasticamente.
- manter mensagens simples com zero tool calls.
- usar retrieval apenas quando necessario.
- manter uma tool principal por turno transacional.
- preservar URL integrity.
- preservar cards e preview WhatsApp.
- reduzir latencia.
- reduzir custo.
- manter GPT-4.1 viavel operacionalmente.

## Dependencias Restantes De Agno

Nenhuma dependencia Agno e permitida no hot-path da Ju.

Dependencias aceitaveis:

- documentacao historica.
- .env opcional para R&D/shadow.
- experimentos futuros fora de producao.

Qualquer chamada Agno no workflow principal, API de conversa operacional,
context builder de producao ou roteamento do WhatsApp deve ser tratada como
regressao arquitetural.
