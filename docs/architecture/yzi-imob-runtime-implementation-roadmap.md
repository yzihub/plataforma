# YZI IMOB Runtime Implementation Roadmap

## Contexto

O YZI IMOB nao deve mais ser tratado como MVP, chatbot ou automacao de WhatsApp. A fundacao operacional ja existe: cockpit, CRM, leads, deals, timeline, imoveis, contratos, financeiro, Evolution, multimodal, build_context, tools, RAG/XML, follow-up e observabilidade inicial.

O objetivo agora e institucionalizar a Ju como runtime imobiliario contextual, state-driven, multi-tenant e replicavel.

## Principio Central

```text
LLM fala.
Backend decide.
Banco guarda a verdade.
```

O LLM nao decide negocio. Toda logica critica deve estar no backend, no estado persistido, nas regras explicitas e no state engine.

O modelo deve receber uma tarefa operacional delimitada:

- responder uma pergunta;
- pedir um campo faltante;
- contextualizar resultado de tool;
- conduzir handoff;
- explicar uma regra;
- gerar texto final para WhatsApp.

O modelo nao deve ser a fonte de verdade para:

- stage do funil;
- prioridade do lead;
- proxima acao critica;
- permissao de tool;
- handoff;
- escalacao;
- estado de qualificacao;
- disponibilidade de imoveis;
- regra comercial.

## Estado Atual

Ja existe boa fundacao:

- Supabase como source of truth.
- Multi-tenant e RLS.
- Cockpit operacional.
- CRM, leads, deals e timeline.
- Imoveis, contratos e financeiro.
- Evolution API.
- Multimodal.
- Build context.
- Tools.
- RAG/XML.
- Follow-up.
- Observabilidade inicial.

Problemas atuais:

- runtime cognitivo degradado;
- transcript excessivo;
- hierarchy insuficiente;
- ausencia de `next_action` explicita;
- state governance fraca;
- tool governance inconsistente;
- excesso de reasoning;
- loops conversacionais;
- requalificacao redundante;
- desperdicio de tokens.

## Topologia Alvo

```text
Entrypoint
  WhatsApp / Site / Portal / Campanha / Imovel / Cockpit
        |
        v
Ingestion
  Evolution / APIs / n8n
        |
        v
Runtime Backend
  State Engine
  Context Compiler
  Tool Router
  Retrieval Policy
  Memory Governance
  Observability
        |
        v
LLM
  gera linguagem, nao decide negocio
        |
        v
Persistence
  Supabase source of truth
        |
        v
Delivery + Cockpit
  Evolution / timeline / operador humano
```

## Boundaries

### Core Platform

Responsabilidades do core:

- orchestration;
- runtime state;
- state engine;
- context compiler;
- tool governance;
- retrieval governance;
- memory governance;
- observabilidade;
- evaluation/replay;
- contratos multi-tenant.

### Tenant Config

Responsabilidades por tenant:

- branding;
- XML/contexto;
- regras comerciais;
- funil;
- bairros;
- campanhas;
- SLAs;
- agentes;
- tom de voz;
- politicas de handoff;
- catalogo de tools habilitadas.

### n8n

Permanece responsavel por:

- webhooks;
- automacoes;
- integracoes;
- delivery;
- agendamentos;
- fan-out;
- tarefas deterministicas simples.

Nao deve ser a fonte primaria de:

- decisao de negocio;
- estado cognitivo;
- memoria semantica;
- policy engine;
- tool routing critico.

### Supabase

Permanece como:

- fonte oficial de estado;
- timeline;
- leads;
- deals;
- imoveis;
- contratos;
- financeiro;
- traces;
- replay;
- tenant config.

## Fase 1: Auditoria Institucional

Objetivo: mapear completamente o runtime atual antes de endurecer ou migrar qualquer coisa.

Escopo:

- `build_context`;
- transcript injection;
- retrieval;
- RAG/XML;
- memory;
- tools;
- loops;
- reasoning excessivo;
- token burn;
- degradacao cognitiva;
- transitions implicitas.

Entregaveis:

- runtime map;
- context map;
- retrieval map;
- tool map;
- token map;
- state map;
- hierarchy map.

Status atual:

- Documento principal: `docs/architecture/ju-runtime-audit.md`.
- O documento ja identifica ausencia de `next_action`, transcript excessivo, memory replay, tool governance fraca e RAG sem policy explicita.

Criterio de aceite:

- Todo comportamento critico atual deve estar mapeado como node, estado, prompt, tool, RAG, memoria ou branch.
- Toda recomendacao deve apontar qual parte do runtime atual sera preservada, institucionalizada ou migrada.

## Fase 2: State Engine

Objetivo: criar decisao operacional explicita antes do LLM.

Criar:

- `runtime_state`;
- `next_action`;
- `conversation_mode`;
- `allowed_tools`;
- `required_tools`;
- `blocked_questions`;
- `resolved_fields`;
- `escalation_rules`;
- `handoff_rules`;
- `media_state`;
- `entry_profile`.

Fluxo alvo:

```text
mensagem
  -> runtime_state
  -> next_action
  -> allowed_tools
  -> retrieval policy
  -> LLM response
  -> persistence
```

Stages iniciais sugeridos:

- `new_lead`;
- `qualification_incomplete`;
- `qualification_partial`;
- `property_search_ready`;
- `property_presented`;
- `visit_or_handoff`;
- `hot_lead`;
- `paused`;
- `follow_up`;
- `media_processing`;
- `media_failed`.

Exemplo de contrato:

```json
{
  "runtime_state": {
    "tenant_id": "tenant",
    "lead_id": "lead",
    "deal_id": "deal",
    "conversation_id": "conversation",
    "deal_stage": "qualification_partial",
    "conversation_mode": "sales_assistant",
    "entry_profile": "whatsapp_property_interest"
  },
  "decision": {
    "next_action": "consultar_imoveis",
    "allowed_tools": ["consultar_imoveis", "atualizar_qualificacao"],
    "required_tools": ["consultar_imoveis"],
    "blocked_questions": ["bairro", "tipo_imovel", "quartos"],
    "resolved_fields": ["bairro", "tipo_imovel", "quartos"],
    "missing_fields": ["valor_max"]
  }
}
```

Criterio de aceite:

- O LLM nao escolhe livremente o fluxo.
- Toda resposta passa por `next_action`.
- Toda tool chamada deve estar em `allowed_tools`.
- Toda pergunta deve respeitar `blocked_questions`.

## Fase 3: Context Governance

Objetivo: separar contexto em tiers e reduzir transcript inflation.

### Tier 1: Estado Critico

Sempre presente, compacto e autoritativo:

- `next_action`;
- `deal_stage`;
- `intent`;
- `lead_state`;
- corretor;
- imovel atual;
- `allowed_tools`;
- `blocked_questions`;
- `media_state`.

### Tier 2: Conversa Recente

Presente apenas quando util:

- ultimas mensagens relevantes;
- mensagens que mudaram estado;
- pergunta atual;
- ultima resposta da Ju se necessaria para anti-loop.

### Tier 3: Memoria Semantica

Resumo persistido:

- preferencias;
- bairros;
- budget;
- timing;
- objections;
- imoveis apresentados;
- campos ja perguntados;
- campos ja respondidos.

### Tier 4: RAG Contextual

Sob demanda e governado:

- imoveis;
- regras;
- XML operacional;
- conhecimento de bairro;
- contexto de campanha.

Regras:

- transcript bruto nao substitui state;
- RAG nao substitui Supabase;
- memory summary nao substitui deal;
- prompt nao substitui policy;
- tool output nao vira verdade ate ser persistido.

Criterio de aceite:

- Contexto enviado ao LLM deve ser menor, hierarquico e auditavel.
- O prompt deve indicar autoridade das fontes.
- Transcript deve ser reduzido a mensagens uteis ou summary.

## Fase 4: Tool Governance

Objetivo: transformar tools em contratos operacionais.

Toda tool deve possuir:

- nome canonico;
- descricao operacional;
- input schema;
- output schema;
- validacao;
- preconditions;
- postconditions;
- idempotencia;
- observabilidade;
- fallback;
- ownership.

Contrato minimo:

```json
{
  "tool": "consultar_imoveis",
  "required_when": ["codigo_ref_present", "property_search_ready", "lead_asks_options"],
  "forbidden_when": ["ai_paused", "handoff_only", "missing_tenant"],
  "input": {
    "tenant_id": "string",
    "bairro": "string|null",
    "tipo_imovel": "string|null",
    "quartos": "string|null",
    "valor_max": "number|null",
    "codigo_ref": "string|null"
  },
  "output": {
    "total": "number",
    "cards": "array",
    "warning": "string|null"
  }
}
```

Tools prioritarias:

- `consultar_imoveis`;
- `atualizar_qualificacao`;
- `setar_lead_quente`;
- handoff/corretor;
- suporte;
- conhecimento/RAG.

Criterio de aceite:

- O agente nao ve tools livres.
- O backend define `allowed_tools`.
- Tool obrigatoria omitida deve gerar warning ou retry.
- Tool output deve virar trace.

## Fase 5: Entrypoint Contextual

Objetivo: adaptar comportamento por origem, campanha, imovel e intencao.

Criar contratos:

- UTM contracts;
- source contracts;
- campaign contracts;
- property contracts;
- `entry_profile`.

Campos sugeridos:

```json
{
  "entry_profile": {
    "source": "whatsapp|site|portal|ads|cockpit",
    "utm_source": "string|null",
    "utm_campaign": "string|null",
    "campaign_intent": "string|null",
    "property_id": "string|null",
    "property_ref": "string|null",
    "landing_page": "string|null",
    "initial_intent": "buy|rent|invest|unknown"
  }
}
```

Comportamentos esperados:

- lead vindo de imovel especifico nao deve passar por qualificacao generica;
- lead vindo de campanha de investimento deve receber filtro e linguagem de investimento;
- lead vindo do cockpit pode ter contexto de operador;
- lead vindo de portal pode ter `property_ref` como primeira chave de busca.

Criterio de aceite:

- Primeira resposta da Ju muda conforme entrypoint.
- `next_action` considera origem e campanha.
- Imovel de entrada vira contexto de Tier 1 quando existir.

## Fase 6: Observabilidade Cognitiva

Objetivo: tornar cada decisao auditavel.

Adicionar traces:

- state transition logs;
- `next_action` traces;
- tool traces;
- retrieval traces;
- loop detection;
- token burn metrics;
- hallucination detection;
- fallback traces;
- media traces.

Tabela/evento sugerido:

```json
{
  "trace_type": "ju_runtime_decision",
  "tenant_id": "tenant",
  "conversation_id": "conversation",
  "lead_id": "lead",
  "deal_id": "deal",
  "stage_before": "qualification_partial",
  "next_action": "consultar_imoveis",
  "allowed_tools": ["consultar_imoveis"],
  "tools_called": ["consultar_imoveis"],
  "retrieval_used": false,
  "tokens_input_estimated": 1200,
  "tokens_output_estimated": 120,
  "loop_risk": "low",
  "warnings": []
}
```

Criterio de aceite:

- Cada resposta deve ser explicavel depois.
- Deve ser possivel comparar estado antes/depois.
- Deve ser possivel detectar pergunta repetida.
- Deve ser possivel ver por que uma tool foi ou nao chamada.

## Fase 7: Multi-Tenant Platform

Objetivo: separar core platform de tenant config.

Core platform:

- orchestration;
- runtime;
- state engine;
- observabilidade;
- retrieval;
- memory governance;
- tool governance;
- evaluation;
- replay.

Tenant config:

- branding;
- XML/contexto;
- regras comerciais;
- funil;
- bairros;
- campanhas;
- SLAs;
- agentes;
- templates;
- tom;
- tool permissions.

Modelo sugerido:

```text
tenant_runtime_configs
tenant_agent_configs
tenant_tool_policies
tenant_retrieval_policies
tenant_campaign_contracts
tenant_funnel_configs
```

Criterio de aceite:

- Nova imobiliaria nao exige fork do runtime.
- Tenant altera regra comercial sem alterar core.
- Tools podem ser habilitadas por tenant.
- XML/RAG e funil sao configuracao, nao codigo hardcoded.

## Roadmap de Execucao

### Milestone 1: Congelar e medir runtime atual

Entregas:

- auditoria final aprovada;
- baseline de token burn;
- baseline de tool usage;
- baseline de loops/requalificacao;
- amostras reais anonimizadas para replay.

### Milestone 2: Introduzir `runtime_state`

Entregas:

- schema inicial;
- persistencia em Supabase;
- state builder a partir de lead/deal/conversation;
- trace de state por mensagem.

### Milestone 3: Introduzir `next_action`

Entregas:

- decision node/backend function;
- `next_action` antes do LLM;
- `blocked_questions`;
- `allowed_tools`;
- testes com conversas reais.

### Milestone 4: Governar tools

Entregas:

- contratos das tools principais;
- validadores de input/output;
- tool traces;
- fallback por tool;
- deteccao de tool obrigatoria omitida.

### Milestone 5: Reduzir contexto

Entregas:

- context tiers;
- memory summary;
- limite de transcript util;
- politica de RAG;
- prompt reduzido.

### Milestone 6: Contextual entrypoints

Entregas:

- UTM/source/campaign/property contracts;
- entry_profile persistido;
- comportamento por origem;
- testes de primeira resposta.

### Milestone 7: Observabilidade e replay

Entregas:

- timeline de decisions;
- traces no cockpit;
- replay de conversa;
- loop detection;
- token dashboard.

### Milestone 8: Preparar Python runtime, se necessario

Entregas:

- boundaries consolidados;
- contratos estaveis;
- suite de testes;
- adapter n8n -> runtime;
- migracao gradual apenas da camada cognitiva.

## Riscos

Risco: criar state engine grande demais antes de medir casos reais.

Mitigacao: comecar com `runtime_state`, `next_action`, `allowed_tools` e `blocked_questions`.

Risco: duplicar regra entre prompt, backend e XML.

Mitigacao: definir autoridade por camada.

Risco: quebrar fluxo atual ao endurecer tools.

Mitigacao: rodar em shadow mode primeiro, registrando decisao proposta sem bloquear resposta.

Risco: transformar Python em novo monolito cognitivo.

Mitigacao: migrar apenas depois de contratos estaveis e manter Supabase como fonte oficial.

## Ordem Recomendada

1. Fechar auditoria institucional.
2. Implementar `runtime_state` em shadow mode.
3. Implementar `next_action` em shadow mode.
4. Comparar decisao do runtime com decisao atual do LLM.
5. Ativar `blocked_questions` e `allowed_tools`.
6. Reduzir transcript e criar memory summary.
7. Governar RAG.
8. Expor traces no cockpit.
9. Avaliar migracao da cognicao para Python.

## Definicao de Pronto

O runtime institucional da Ju esta pronto quando:

- cada mensagem possui `runtime_state`;
- cada resposta possui `next_action`;
- cada tool chamada possui contrato e trace;
- perguntas repetidas sao bloqueadas por estado;
- transcript bruto nao governa decisao;
- RAG tem policy explicita;
- token burn e medido;
- loops sao detectados;
- tenant config e separado do core;
- cockpit consegue explicar por que a Ju respondeu daquele jeito.

## Conclusao

O YZI IMOB deve evoluir de automacao conversacional para infraestrutura operacional imobiliaria AI-native. A Ju deve operar como runtime premium state-driven: contextual, governada por estado, com tools contratuais, memoria controlada, retrieval governado e observabilidade suficiente para escalar multi-tenant sem drift arquitetural.
