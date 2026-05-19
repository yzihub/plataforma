# YZI IMOB Phase 1 Runtime Audit

## Escopo

Esta auditoria executa a Fase 1 do roadmap institucional do YZI IMOB: mapear o runtime operacional atual da Ju antes de endurecer state engine, reorganizar orchestration ou migrar cognicao para outro runtime.

O sistema nao esta sendo tratado como chatbot-first. A diretriz arquitetural desta auditoria e:

```text
LLM fala.
Backend decide.
Banco guarda verdade.
```

Toda decisao critica deve ser governada por backend, estado persistido, regras explicitas e runtime state-driven. O LLM deve gerar linguagem dentro de um contrato operacional, nao decidir fluxo, estado, regra de negocio ou transicao.

## Fontes Auditadas

- Workflow principal: `n8n/production/workflow-jurema-main.final-hardened.json`
- Workflow tool de imoveis: `n8n/production/workflow-jurema-consultar-imoveis.final-hardened.json`
- Auditoria base: `docs/architecture/ju-runtime-audit.md`
- Roadmap institucional: `docs/architecture/yzi-imob-runtime-implementation-roadmap.md`
- XML/RAG local: `clientes/jurema-brokers/knowledge.xml`
- Prompt legado: `clientes/jurema-brokers/prompts.md`
- Modelo operacional: `docs/architecture/entities.md`

Observacao: a validacao live via API n8n nao foi usada como fonte primaria porque as variaveis locais `N8N_API` e `N8N_API_KEY` aparecem preenchidas como token JWT, sem URL base HTTP valida. A auditoria usa o export local versionado do workflow real.

## Diagnostico Central

A Ju possui base operacional relevante, mas o runtime ainda e prompt-driven em pontos criticos.

O problema nao e ausencia de contexto. O problema e excesso de contexto sem autoridade formal:

- estado operacional sobe como texto;
- transcript sobe com peso alto;
- regras sobem como instrucao, nao enforcement;
- tools ficam livres para o agente;
- RAG nao tem policy de precedencia;
- next_action nao existe como contrato;
- memoria longa e transcript competem com Supabase;
- o modelo reinterpreta estado resolvido a cada turno.

O resultado e degradacao operacional: perguntas redundantes, reabertura de filtros, loops conversacionais, tool calling inconsistente e token burn elevado.

## Runtime Architecture Audit

### Topologia Atual

```text
Evolution / WhatsApp
  -> Webhook1
  -> Normaliza Webhook1
  -> Switch1
  -> Verificar Atendimento1
  -> Switch Block1
  -> dados do banco
  -> Code in JavaScript
  -> IF IA Pausada Supabase
  -> Dados do Lead1
  -> Switch7
       texto -> Redis debounce
       audio -> Normalize Audio Payload -> OpenAI1 -> Redis debounce
       imagem/video -> upload/persistencia
  -> Detecta Finalizacao1
  -> Build Context1
  -> Atendente1
  -> Salvar Outbound Supabase
  -> Evolution API
```

### Componentes Cognitivos

```text
Atendente1
  -> OpenAI Chat Model3
  -> postgres1 memory
  -> atualizar_qualificacao
  -> setar_lead_quente
  -> consultar_imoveis
  -> cadastro_inicial1
  -> SUPORTE1
  -> conhecimento_estrategico_luana1
  -> Think1
```

### Evidencias Objetivas

```text
Atendente1 system prompt: 3797 caracteres
Atendente1 input: "Mensagem do Cliente" + _context
Code in JavaScript: 16421 caracteres
Dados do Lead1: 1096 caracteres
Build Context1: 924 caracteres
Normalize Audio Payload: 6519 caracteres
Salvar Outbound Supabase: 2971 caracteres
Detecta Finalizacao1: 2427 caracteres
postgres1 contextWindowLength: 100
knowledge.xml: 5005 caracteres, aprox. 1252 tokens
```

### Leitura Arquitetural

O n8n faz bem ingestao, branch, integracao, multimodal e persistencia. O gargalo esta no ponto onde estado vira texto e o LLM passa a decidir fluxo.

O runtime atual tem bons blocos, mas falta um plano deterministico entre `Build Context1` e `Atendente1`:

```text
runtime_state -> next_action -> allowed_tools -> retrieval_policy -> response_contract
```

## Build Context Audit

### Estrutura Real

O `build_context` real e montado principalmente em `Code in JavaScript`. Ele:

- normaliza telefone;
- busca/cria lead por `tenant_id + phone_normalized`;
- busca/cria deal em `jurema_deals`;
- busca/cria conversation;
- grava inbound em `conversation_messages`;
- carrega as 12 mensagens recentes;
- monta `_context`;
- expõe aliases legados para nodes antigos.

O `_context` contem:

```text
<estado_atual>
tenant_id
lead_id
deal_id
conversation_id
nome
telefone
lead_status
ai_status
ai_temperature
conversation_status
ai_paused
</estado_atual>

<dados_coletados>
objetivo
finalidade
bairro_interesse
faixa_valor
tipo_imovel
timeline
pagamento
</dados_coletados>

<campos_faltantes>
objetivo/finalidade
bairro/regiao
faixa de valor
prazo/timeline
</campos_faltantes>

<historico_recente>
ultimas 12 mensagens
</historico_recente>

<mensagem_atual>
mensagem atual
</mensagem_atual>
```

`Build Context1` adiciona regras de comportamento, incluindo responder intencao imediata, nao repetir pergunta, uma pergunta por vez e nao avancar etapa em interrupcoes.

### Problemas

- Nao ha hierarquia formal entre estado, transcript, memoria e regras.
- `campos_faltantes` nao diferencia campo critico, opcional e campo que nao bloqueia acao.
- `dados_coletados` nao vira `resolved_fields`.
- `historico_recente` nao vira evidence de baixa autoridade.
- `mensagem_atual` pode aparecer duplicada fora e dentro de `_context`.
- Regras de comportamento repetem parte do system prompt.
- O prompt precisa reinterpretar o contexto em vez de receber uma decisao.

### O Que Deveria Subir

Sempre subir:

- `tenant_id`;
- `lead_id`;
- `deal_id`;
- `conversation_id`;
- `runtime_state`;
- `next_action`;
- `deal_stage`;
- `qualification_status`;
- `resolved_fields`;
- `missing_fields`;
- `blocked_questions`;
- `allowed_tools`;
- `required_tools`;
- `conversation_mode`;
- `media_state`;
- `entry_profile`.

Subir apenas quando util:

- ultimas mensagens relevantes;
- ultima pergunta da Ju;
- tool result;
- RAG contextual;
- detalhes do imovel atual;
- resumo de preferencias.

Nao deveria subir por padrao:

- 12 mensagens brutas completas;
- memoria de 100 mensagens;
- regras repetidas;
- fallback tecnico como se fosse fala do cliente;
- XML inteiro ou chunks irrelevantes;
- reasoning de como decidir fluxo.

### O Que Deveria Virar Estado Explicito

- `lead_state`;
- `deal_stage`;
- `qualification_status`;
- `runtime_state`;
- `conversation_mode`;
- `handoff_state`;
- `escalation_state`;
- `media_state`;
- `follow_up_state`;
- `entry_profile`;
- `last_next_action`;
- `last_tool_calls`;
- `asked_fields`;
- `answered_fields`.

## Context Hierarchy Audit

Hierarquia atual implicita:

```text
system prompt + _context + Postgres memory + tool descriptions + RAG + transcript
```

Hierarquia alvo:

```text
1. Supabase operational state
2. runtime_state / next_action
3. current user message
4. tool result
5. memory summary
6. useful recent transcript
7. RAG/contextual knowledge
8. style prompt
```

Sem essa hierarquia, o modelo pode dar mais peso a uma frase antiga do transcript do que ao estado oficial do deal.

## Transcript Audit

### Estrategia Atual

O transcript entra por tres caminhos:

- `conversation_messages`, ultimas 12 mensagens no `_context`;
- Redis debounce, lista por `sessionId`;
- Postgres Chat Memory, janela 100 em `n8n_chat_histories_jurema`.

### Riscos

- perguntas antigas da Ju viram contexto ativo;
- dados obsoletos competem com deal;
- hesitacoes do cliente parecem requisitos;
- fallback de audio pode virar fala;
- loops anteriores reforcam loops futuros;
- cumprimento e interrupcao ocupam budget cognitivo;
- o LLM passa a usar transcript para decidir estado.

### Separacao Recomendada

Memoria curta:

- 3 a 6 mensagens uteis;
- somente mensagens que afetam o turno atual;
- ultima pergunta da Ju para anti-loop.

Memoria operacional:

- Supabase;
- lead/deal/conversation;
- follow-up;
- visitas;
- contratos;
- timeline;
- imoveis apresentados.

Memoria semantica:

- bairros preferidos;
- budget;
- preferencias;
- perfil familiar;
- timing;
- restricoes;
- objeções.

### Objetivo de Reducao

Reduzir transcript bruto no prompt e substituir por:

```text
memory_summary + resolved_fields + blocked_questions + useful_recent_messages
```

## State Governance Audit

### Estados Implicitos Atuais

- lead novo;
- lead existente;
- deal criado;
- qualificacao incompleta;
- qualificacao parcial;
- busca de imovel possivel;
- IA pausada;
- atendimento bloqueado;
- midia recebida;
- midia falhou;
- finalizacao detectada;
- lead quente, se tool for chamada;
- follow-up, fora do loop principal.

### Campos Relevantes Ja Existentes

- `lead.status`;
- `lead.ai_status`;
- `lead.ai_temperature`;
- `deal.deal_stage`;
- `deal.qualification_status`;
- `conversation.status`;
- `conversation.ai_paused`;
- `conversation.last_message_at`;
- `conversation.last_inbound_at`;
- `conversation.last_outbound_at`.

### Falhas

- O estado existe, mas nao comanda o proximo passo.
- `qualification_status` nao vira policy de perguntas.
- `deal_stage` nao vira allowed actions.
- `ai_paused` e governado, mas outros estados nao.
- A transicao de qualificacao para busca depende do LLM.
- Handoff depende de interpretacao do agente.
- Escalacao nao aparece como state machine.

### Onde Perde Determinismo

- cliente fornece filtros suficientes, mas `campos_faltantes` ainda possui valor/prazo;
- cliente pede opcoes, mas agente decide perguntar mais;
- cliente aceita visita, mas agente pode continuar qualificando;
- cliente pergunta por codigo, mas agente pode responder sem tool;
- RAG pode entrar quando tool operacional deveria ter precedencia.

## Next Action Engine Audit

### Como Decide Hoje

Hoje a proxima acao e inferida por:

- system prompt;
- `_context`;
- `campos_faltantes`;
- transcript;
- memoria Postgres;
- descriptions das tools;
- julgamento do LLM.

Nao ha `next_action` canonico.

### Decisoes Indevidamente Feitas Pelo LLM

- perguntar qual campo falta;
- decidir se filtros sao suficientes;
- decidir se usa `consultar_imoveis`;
- decidir se atualiza qualificacao;
- decidir se lead esta quente;
- decidir se RAG e necessario;
- decidir se deve continuar qualificando ou apresentar opcoes.

### Arquitetura Proposta

```text
message
  -> state_builder
  -> state_evaluator
  -> next_action_engine
  -> tool_policy
  -> retrieval_policy
  -> response_contract
  -> LLM
  -> persistence + traces
```

Exemplo:

```json
{
  "runtime_state": {
    "lead_state": "active",
    "deal_stage": "qualification_partial",
    "qualification_status": "search_ready",
    "conversation_mode": "sales",
    "handoff_state": "none",
    "escalation_state": "none"
  },
  "decision": {
    "next_action": "consultar_imoveis",
    "required_tools": ["consultar_imoveis"],
    "allowed_tools": ["consultar_imoveis", "atualizar_qualificacao"],
    "retrieval_allowed": false,
    "blocked_questions": ["bairro", "tipo_imovel", "quartos"]
  }
}
```

## Tool Governance Audit

### Tools Mapeadas

`consultar_imoveis`

- Tipo: workflow tool.
- Workflow: `0udn6N4YelE6F2Ws`.
- Input esperado: `tenant_id`, `phone`, `codigo_ref`, `bairro`, `tipo_imovel`, `quartos`, `valor_max`.
- Output: cards, filtros usados, total, warnings.
- Side effect: consulta imoveis e pode disparar cards/estrutura para resposta.
- Problema: obrigatoriedade esta em linguagem natural, nao em policy.

`atualizar_qualificacao`

- Tipo: workflow tool.
- Workflow: `QKFhZQJRz8rczaYE`.
- Input esperado: campos de perfil, prazo e financeiro.
- Output esperado: qualificacao persistida.
- Side effect: altera estado do lead/deal.
- Problema: chamada depende de o LLM reconhecer que deve salvar dado parcial.

`setar_lead_quente`

- Tipo: workflow tool.
- Workflow: `QZ3VcIrxE6BRtCpj`.
- Input esperado: lead/deal e motivo de lead quente.
- Side effect: move estagio final do pipeline.
- Problema: sinais de lead quente nao estao formalizados em `handoff_rules`.

`cadastro_inicial1`

- Tipo: workflow tool.
- Workflow: `HR9KENCsxR7konJo`.
- Contrato atual: acionar uma vez com nome, email, CPF, cidade, telefone e como_chegou.
- Problema: parece legado ou fora do funil imobiliario principal; precisa gating contextual.

`SUPORTE1`

- Tipo: HTTP request tool.
- Problema: sem description auditavel no export resumido; risco de tool livre sem contrato operacional explicito.

`conhecimento_estrategico_luana1`

- Tipo: vector store tool.
- Input: query semantica.
- Output: chunks do vector store.
- Problema: descricao generica e sem policy de precedencia frente a tools operacionais.

`Think1`

- Tipo: tool de raciocinio.
- Problema: pode aumentar reasoning sem gerar trace operacional estruturado.

### Requisitos por Tool

Cada tool deve possuir:

- input schema;
- output schema;
- preconditions;
- postconditions;
- autorizacao contextual;
- idempotencia;
- side effects declarados;
- trace obrigatorio;
- fallback;
- owner.

### Riscos Operacionais

- tool livre demais;
- tool obrigatoria omitida;
- tool chamada com contexto insuficiente;
- tool de RAG usada no lugar de consulta transacional;
- tool com side effect chamada sem confirmacao de estado;
- output de tool nao persistido ou nao rastreado.

## Retrieval Governance Audit

### Estado Atual

RAG esta acoplado via:

```text
conhecimento_estrategico_luana1
  -> Supabase Vector Store1
  -> documents
  -> Embeddings OpenAI1
```

O XML local possui aproximadamente 5005 caracteres e inclui:

- identidade de negocio;
- inteligencia de mercado;
- bairros;
- diretrizes de comportamento;
- estrategia de conversao;
- UI enrichment;
- integracoes.

### Problemas

- contexto institucional, operacional e comportamental misturados;
- regras de comportamento repetem prompt;
- retrieval pode ocorrer em pergunta que deveria usar tool;
- RAG nao tem budget por query;
- RAG nao tem criterio de relevancia operacional;
- chunks podem carregar policy leakage;
- XML pode virar instrucao indireta concorrente ao runtime.

### Separacao Recomendada

Contexto operacional:

- vem do Supabase;
- lead, deal, conversation, timeline, follow-up.

Contexto semantico:

- preferencias, bairros, perfil, objections.

Contexto institucional:

- marca, posicionamento, regras comerciais, tom.

Contexto imobiliario:

- imoveis, estoque, disponibilidade, cards, valores.

### Retrieval Que Deveria Virar Estado

- bairro preferido;
- budget;
- finalidade;
- tipologia;
- prazo;
- origem/campanha;
- imoveis ja apresentados.

### Retrieval Lazy

- argumentos sobre bairro;
- explicacao institucional;
- duvidas sobre processo;
- comparativo de regioes;
- conteudo de campanha.

### Retrieval Que Deve Ser Removido do Prompt Base

- regras repetidas;
- detalhes de integracao;
- UI enrichment;
- instrucoes internas;
- blocos que competem com state engine.

## Memory Governance Audit

### Memoria Operacional

Deve permanecer no Supabase:

- estado;
- follow-up;
- visitas;
- contratos;
- timeline;
- conversas;
- ferramentas chamadas;
- imoveis apresentados.

### Memoria Semantica

Deve ser resumida e persistida:

- bairros;
- budget;
- preferencias;
- perfil familiar;
- timing;
- restricoes;
- objeções;
- estilo de atendimento preferido.

### Memoria Conversacional

Deve ser curta:

- ultimas mensagens uteis;
- ultima pergunta da Ju;
- ultima resposta do cliente;
- mensagem atual.

### Vazamentos e Redundancias

- Postgres Chat Memory com 100 mensagens e amplo demais.
- `historico_recente` com 12 mensagens pode ser excessivo.
- Redis duplica parte da memoria curta.
- `conversation_messages` e a fonte oficial, mas tambem vira prompt bruto.
- Fallback tecnico pode contaminar memoria conversacional.

### Proposta

Criar `memory_summary` por conversation/deal:

```json
{
  "requirements": {},
  "preferences": {},
  "constraints": {},
  "objections": [],
  "answered_fields": [],
  "asked_fields": [],
  "last_property_refs": [],
  "last_handoff_signal": null
}
```

## Token Economy Audit

### Inflation Points

- system prompt de 3797 caracteres;
- `_context` com blocos completos;
- 12 mensagens recentes;
- Postgres memory com 100 mensagens;
- tool descriptions;
- RAG chunks;
- output de tool de imoveis;
- mensagem atual duplicada;
- regras repetidas;
- reasoning implicito sobre estado.

### Custo Estrutural

Mesmo sem medir tokens live, o desenho atual força o modelo a gastar tokens para:

- descobrir stage;
- descobrir campo faltante;
- decidir se pergunta;
- decidir se consulta imovel;
- decidir se RAG entra;
- deduplicar transcript;
- interpretar memoria antiga;
- resolver conflito entre deal e historico.

### Proposta de Budget

```text
Tier 1 state: sempre, ate 1000 caracteres
Tier 2 recent useful transcript: 3 a 6 mensagens
Tier 3 memory_summary: ate 1200 caracteres
Tier 4 RAG: lazy, max chunks por policy
Tool output: resumido antes do LLM quando possivel
System prompt: estilo e limites, nao business logic
```

Metricas necessarias:

- input tokens por turno;
- output tokens por turno;
- tokens por RAG;
- tokens por transcript;
- tokens por tool result;
- custo medio por interaction;
- custo por multimodal;
- custo por tenant.

## Observability Audit

### Observabilidade Atual

Ja existe:

- timeline operacional;
- inbound/outbound em `conversation_messages`;
- estado de conversation;
- alguma persistencia de debug no workflow;
- cockpit operacional;
- follow-up engine.

### Lacunas

Faltam:

- state transition logs;
- `next_action` traces;
- retrieval traces;
- tool traces;
- loop detection;
- hallucination detection;
- token metrics;
- blocked question traces;
- required tool omitted warning;
- media state traces;
- replay cognitivo.

### Trace Alvo

```json
{
  "trace_type": "runtime_decision",
  "tenant_id": "tenant",
  "conversation_id": "conversation",
  "lead_id": "lead",
  "deal_id": "deal",
  "state_before": "qualification_partial",
  "next_action": "consultar_imoveis",
  "allowed_tools": ["consultar_imoveis"],
  "required_tools": ["consultar_imoveis"],
  "tools_called": ["consultar_imoveis"],
  "retrieval_used": false,
  "blocked_questions": ["bairro"],
  "token_estimate": {
    "input": 1200,
    "output": 120
  },
  "warnings": []
}
```

## Multi-Tenant Readiness Audit

### O Que Ja Esta Preparado

- `tenant_id` aparece no fluxo;
- Supabase e multi-tenant;
- RLS existe no sistema;
- lead/deal/conversation usam tenant;
- imoveis podem ser filtrados por tenant;
- cockpit ja opera sobre entidades multi-tenant.

### Hardcodes e Acoplamentos

- tenant default no workflow;
- nome da instancia `Jurema Brokers`;
- persona Ju;
- XML especifico da Jurema;
- prompt especifico da Jurema;
- regras comerciais no prompt;
- funil e bairros acoplados ao contexto atual;
- tool descriptions com linguagem especifica;
- endpoints/variaveis de Evolution e Supabase no workflow.

### Separacao Alvo

Core Platform:

- orchestration;
- state engine;
- context compiler;
- tool governance;
- retrieval governance;
- memory governance;
- observabilidade;
- replay/evaluation.

Tenant Config:

- branding;
- persona;
- XML;
- regras comerciais;
- funil;
- bairros;
- campanhas;
- SLAs;
- agentes;
- tools habilitadas;
- tom de voz.

## State Engine Proposal

### Runtime State Canonico

```json
{
  "runtime_state": {
    "tenant_id": "string",
    "lead_id": "string",
    "deal_id": "string|null",
    "conversation_id": "string",
    "lead_state": "new|active|paused|handoff|closed",
    "deal_stage": "new|qualification|search|visit|proposal|contract|closed",
    "qualification_status": "empty|incomplete|partial|search_ready|complete",
    "conversation_mode": "sales|support|follow_up|handoff|paused",
    "handoff_state": "none|requested|assigned|completed",
    "escalation_state": "none|required|active",
    "media_state": "none|processing|transcribed|failed",
    "entry_profile": "unknown|campaign|property|portal|cockpit|whatsapp"
  }
}
```

### Regras Iniciais

- Se `ai_paused = true`, `conversation_mode = paused`.
- Se lead pede humano/corretor/ligacao, `handoff_state = requested`.
- Se codigo de imovel existe, `next_action = consultar_imoveis`.
- Se bairro + tipologia ou bairro + quartos existem, `qualification_status = search_ready`.
- Se campo ja esta em `resolved_fields`, pergunta correspondente entra em `blocked_questions`.
- Se audio falha, `media_state = failed` e resposta deve ser fallback controlado.

## Next Action Proposal

Actions iniciais:

- `answer_direct_question`;
- `ask_missing_goal`;
- `ask_missing_location`;
- `ask_missing_budget`;
- `ask_missing_timeline`;
- `update_qualification`;
- `consultar_imoveis`;
- `contextualize_property_results`;
- `set_hot_lead`;
- `handoff_to_human`;
- `schedule_follow_up`;
- `handle_media_failure`;
- `pause_ai_no_response`;

Contrato:

```json
{
  "next_action": "consultar_imoveis",
  "reason": "lead supplied bairro and tipo_imovel",
  "allowed_tools": ["consultar_imoveis", "atualizar_qualificacao"],
  "required_tools": ["consultar_imoveis"],
  "retrieval_policy": "disabled_for_transactional_search",
  "response_mode": "short_contextual_message",
  "blocked_questions": ["bairro", "tipo_imovel"]
}
```

## Runtime Stabilization Proposal

Sequencia recomendada:

1. Criar `runtime_state` em shadow mode.
2. Criar `next_action` em shadow mode.
3. Logar diferenca entre decisao do LLM e decisao do state engine.
4. Ativar `blocked_questions`.
5. Ativar `allowed_tools`.
6. Reduzir transcript bruto.
7. Criar `memory_summary`.
8. Criar retrieval policy.
9. Criar traces no Supabase.
10. Expor traces no cockpit.

## Entregaveis da Fase 1

Runtime architecture audit:

- runtime atual mapeado por nodes, branches, memory, tools e persistence.

Context hierarchy audit:

- hierarquia atual e alvo documentadas.

Retrieval audit:

- RAG/XML, policy leakage e fronteiras de retrieval mapeadas.

Transcript audit:

- fontes de transcript e estrategia de reducao documentadas.

Tool governance audit:

- tools atuais, riscos e contratos necessarios mapeados.

Memory governance audit:

- memoria operacional, semantica e conversacional separadas.

Token economy audit:

- pontos de inflation e budget alvo definidos.

Observability audit:

- lacunas e trace alvo definidos.

State engine proposal:

- schema de runtime_state e regras iniciais definidos.

Next_action proposal:

- actions iniciais e contrato definidos.

Runtime stabilization proposal:

- sequencia de shadow mode ate enforcement definida.

Multi-tenant readiness proposal:

- core platform e tenant config separados.

## Conclusao

A Ju ja opera sobre uma base real de CRM, Supabase, timeline, Evolution, multimodal, tools e RAG. O gargalo nao e capacidade, e governanca.

A Fase 1 confirma que o runtime precisa deixar de ser prompt-driven e passar a ser state-driven. O LLM deve receber contexto hierarquico e uma tarefa delimitada. O backend deve decidir `runtime_state`, `next_action`, `allowed_tools` e retrieval policy. O banco deve guardar a verdade operacional e os traces.

Essa e a base para transformar o YZI IMOB em infraestrutura operacional imobiliaria AI-native, multi-tenant e replicavel.
