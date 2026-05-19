# Auditoria Institucional do Runtime Cognitivo da Ju

## Escopo

Esta auditoria mapeia o runtime cognitivo atual da Ju antes de qualquer decisao de endurecer o fluxo atual, reorganizar a orquestracao ou migrar cognicao para Python.

O objetivo nao e propor rebuild. O objetivo e entender por que a Ju degrada operacionalmente mesmo ja tendo Supabase, timeline, cockpit, RAG, tools, memoria, multimodal e persistencia.

Observacao de fonte: a leitura abaixo usa como fonte primaria efetivamente disponivel o export local do workflow `cj4V6DW0Qy6el0PM`, que contem os prompts, build_context, branches, tools, RAG/XML e regras que compoem o runtime em producao. A tentativa de validar o workflow live via API nao foi concluida porque `N8N_API` e `N8N_API_KEY` no `.env.local` estao preenchidos como token JWT, sem URL base HTTP valida para a chamada. Fontes auditadas:

- `n8n/production/workflow-jurema-main.final-hardened.json`
- `n8n/production/workflow-jurema-consultar-imoveis.final-hardened.json`
- `clientes/jurema-brokers/prompts.md`
- `clientes/jurema-brokers/knowledge.xml`
- `docs/architecture/entities.md`

## Diagnostico Executivo

A Ju nao esta degradando por falta de contexto. O runtime atual ja monta contexto operacional, busca lead/deal/conversation, persiste mensagens, usa memoria Postgres, possui RAG via Supabase Vector Store e expoe tools para qualificacao, imoveis e lead quente.

O problema central e que o contexto existe, mas nao governa. A informacao chega ao modelo como material textual, nao como contrato operacional. O agente recebe estado, historico, regras e tools, mas a decisao final de perguntar, consultar imoveis, atualizar qualificacao ou encerrar uma etapa fica quase toda dentro do LLM.

Isso cria cinco efeitos estruturais:

- O estado operacional nao tem autoridade suficiente sobre o transcript.
- O transcript recente compete com os dados oficiais do lead/deal.
- As regras sao instrucionais, nao executaveis.
- As tools sao opcionais para o agente, nao gates de runtime.
- Nao existe `next_action` explicito e auditavel.

Resultado operacional observado:

- A Ju pergunta demais.
- Reabre filtros ja resolvidos.
- Requalifica informacoes presentes no deal.
- Usa pouco `consultar_imoveis`.
- Trata historico conversacional como fonte de estado.
- Gasta tokens reinterpretando dados ja resolvidos.
- Depende de prompt monolitico para corrigir comportamento que deveria ser governado por estado.

## 1. Runtime Topology Atual

Topologia real do workflow principal:

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
       texto curto
         -> Texto curto Memory1
         -> REDIS
         -> Wait4
         -> REDIS3
         -> UNIFICA REDIS
         -> IF-COMPARA
       audio
         -> Normalize Audio Payload
         -> Audio Media Valid?
         -> Normalize Audio Binary Metadata
         -> Audio Binary OpenAI Compatible?
         -> OpenAI1
         -> Audio Memory1
         -> REDIS...
       imagem/video
         -> upload/persistencia de midia
  -> Detecta Finalizacao1
  -> Build Context1
  -> Atendente1
  -> Salvar Outbound Supabase
  -> ArrayResposta
  -> Split Out
  -> Evolution API
```

Componentes cognitivos acoplados ao `Atendente1`:

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

O runtime atual e um agent loop dentro do n8n. O n8n faz ingestao, normalizacao, persistencia e chama o agente; o agente decide autonomamente quais tools usar e como responder. O Supabase funciona como fonte operacional, mas o comando de fluxo ainda esta concentrado no prompt e no julgamento do LLM.

## 2. Anatomia do Build Context

O contexto chega ao agente como:

```text
Mensagem do Cliente: {{ $json.mensagemCliente }}

{{ $json._context }}
```

O `Atendente1` tambem recebe um system prompt monolitico com:

- identidade da Ju;
- tom de WhatsApp;
- regra de responder intencao imediata;
- lista de blocos obrigatorios;
- anti-loop;
- qualificacao;
- quando consultar imoveis;
- como apresentar cards;
- regras criticas;
- saida final.

O build_context real e distribuido:

- `Code in JavaScript` monta ou recupera lead/deal/conversation, persiste inbound, carrega mensagens recentes e constroi `_context`.
- `Dados do Lead1` repacota dados do lead/deal/conversation para o caminho cognitivo.
- `Build Context1` adiciona `<regras_de_comportamento>`.
- `postgres1` adiciona memoria conversacional pela LangChain Postgres Chat Memory.
- `conhecimento_estrategico_luana1` injeta RAG quando acionado como tool.

### Blocos esperados pelo prompt

O system prompt declara que a Ju deve usar:

```text
<estado_atual>
<dados_coletados>
<campos_faltantes>
<historico_recente>
<mensagem_atual>
<regras_de_comportamento>
```

Esses blocos sao tratados como "fonte oficial da conversa", mas nao possuem uma hierarquia formal. O modelo ve todos como texto. Nao existe uma camada anterior que diga, por exemplo:

```text
state_authority: deal > lead > qualification > memory_summary > transcript
next_action: consultar_imoveis
blocked_questions: ["bairro", "quartos"]
resolved_fields: ["bairro", "quartos", "finalidade"]
```

### O que esta correto

A fundacao e boa:

- Existe separacao nominal entre estado, dados coletados, campos faltantes e historico.
- O Supabase ja atua como source of truth operacional.
- O inbound/outbound ja e persistido.
- O runtime ja consegue reunir contexto suficiente para agir.
- O workflow ja possui ferramentas operacionais reais.

### O que degrada

A anatomia do contexto ainda mistura quatro camadas que deveriam ter autoridades diferentes:

- Estado operacional: lead, deal, qualification, status, atendimento pausado.
- Memoria: preferencias, requisitos, restricoes e sinais recorrentes.
- Transcript: mensagens recentes em linguagem natural.
- Regras: comportamento, tom, anti-loop, uso de tools.

Como tudo e entregue ao modelo em texto, o LLM precisa reinterpretar o estado a cada turno. Isso aumenta custo, variancia e risco de reabrir etapas.

## 3. Uso do Transcript

O transcript aparece em pelo menos duas frentes:

- `_context`, por meio de `historico_recente`.
- `postgres1`, com `contextWindowLength: 100` na tabela `n8n_chat_histories_jurema`.

Essa configuracao e uma das principais fontes de degradacao cognitiva.

### Problema 1: transcript como estado

O transcript e uma evidenciacao do que foi dito, nao o estado operacional consolidado. Quando ele entra com peso alto, o modelo tende a:

- reprocessar perguntas antigas;
- tratar hesitacoes como requisitos;
- considerar fallback de audio como fala real;
- confundir perguntas da Ju com preferencias do cliente;
- reabrir filtros ja resolvidos.

### Problema 2: janela de memoria grande

`contextWindowLength: 100` e agressivo para atendimento operacional. Em uma conversa de WhatsApp, 100 mensagens podem conter:

- cumprimentos;
- interrupcoes;
- respostas curtas;
- confirmacoes;
- erros de transcricao;
- mensagens de sistema;
- fallback de midia;
- perguntas repetidas feitas pela propria Ju.

Isso cria um loop de reforco: se a Ju perguntou mal antes, a pergunta ruim entra na memoria e aumenta a chance de o modelo continuar naquele caminho.

### Problema 3: contexto emocional em excesso

O prompt orienta naturalidade, elegancia, acolhimento e comportamento premium. Isso e importante para tom, mas hoje compete com a necessidade operacional de decidir. O contexto emocional nao deveria ter o mesmo peso de:

- stage atual;
- campos resolvidos;
- proxima acao;
- tools obrigatorias;
- bloqueios de pergunta.

Quando tom e estado entram no mesmo nivel, a Ju tende a "conversar melhor" em vez de "operar melhor".

## 4. Governanca do Estado Operacional

O runtime possui estado, mas nao possui um state engine explicito.

Estados reais inferidos pelo fluxo:

- lead novo ou existente;
- atendimento bloqueado ou liberado;
- IA pausada ou ativa;
- qualificacao incompleta;
- qualificacao parcial;
- imovel pesquisavel;
- lead pronto para visita/corretor;
- follow-up;
- finalizacao/encerramento.

Esses estados aparecem como dados e regras, mas nao como contrato de transicao.

### Ausencia de `next_action`

O ponto mais importante: nao ha `next_action` canonico antes do agente.

O modelo recebe instrucoes como:

- use `consultar_imoveis` quando houver contexto suficiente;
- use `atualizar_qualificacao` quando descobrir dados;
- use `setar_lead_quente` quando aceitar visita;
- faca uma pergunta por vez;
- nao repita.

Mas isso nao vira uma decisao estruturada:

```text
next_action: ask_missing_budget
reason: bairro e quartos resolvidos, valor faltante
allowed_tools: ["atualizar_qualificacao"]
blocked_tools: ["consultar_imoveis"]
blocked_questions: ["bairro", "quartos"]
```

Sem esse contrato, o LLM escolhe a partir do texto inteiro. Essa escolha e probabilistica e pode variar conforme transcript, memoria e RAG.

### Requalificacao indevida

A requalificacao acontece quando dados ja presentes no deal ou em `dados_coletados` nao recebem prioridade sobre o historico.

Exemplo estrutural:

- O lead ja informou bairro.
- O deal ja possui bairro.
- O transcript inclui uma pergunta antiga da Ju sobre bairro.
- O prompt diz para qualificar naturalmente.

Sem `resolved_fields` e `blocked_questions`, o modelo pode perguntar bairro novamente, porque ve a pergunta antiga no historico e entende que o fluxo ainda esta naquela etapa.

### Finalizacao fraca

Existe `Detecta Finalizacao1`, mas a decisao cognitiva principal ainda ocorre no agente. O runtime precisa distinguir:

- finalizacao de mensagem;
- finalizacao de etapa;
- finalizacao de atendimento;
- lead quente;
- handoff;
- follow-up.

Hoje esses conceitos parecem espalhados entre prompt, nodes e tools. Isso favorece comportamento hesitante: a Ju continua conversando quando deveria agir, ou pergunta quando deveria consultar.

## 5. RAG/XML

O RAG existe como `conhecimento_estrategico_luana1`, conectado a Supabase Vector Store e embeddings OpenAI. A descricao da tool diz:

```text
Contains all the information about prices and andress that you can check to answer user questions.
```

Ha tambem `clientes/jurema-brokers/knowledge.xml`, com conhecimento de negocio, regioes, comportamento e integracoes.

### O que esta correto

- RAG esta separado como tool, nao colado integralmente no prompt principal.
- Existe base XML/estrategica para conhecimento institucional.
- O agente tem acesso a informacao de negocio sem precisar hardcodar tudo no system prompt.

### Problemas estruturais

1. A descricao da tool e fraca e com erro semantico (`andress`). Isso reduz a qualidade de chamada e deixa o modelo sem um contrato claro de quando usar RAG.

2. RAG parece competir com estado operacional. Conhecimento estrategico deve responder duvidas sobre Jurema, bairros, posicionamento e regras comerciais. Ele nao deve decidir etapa de qualificacao nem substituir dados do Supabase.

3. XML/RAG pode gerar policy leakage. Se a base contem regras de comportamento, integracoes e instrucoes internas, o modelo pode misturar conhecimento institucional com resposta ao cliente.

4. Retrieval pouco governado aumenta tokens sem necessariamente melhorar acao. Se a pergunta e "tem apartamento no Bessa com 3 quartos?", a tool prioritaria deveria ser `consultar_imoveis`, nao RAG estrategico.

### Separacao desejada de autoridade

Sem implementar ainda, a auditoria indica esta ordem conceitual:

```text
Supabase state/deal/lead = verdade operacional
Tools operacionais = acoes e dados transacionais
RAG/XML = conhecimento institucional e explicacao consultiva
Transcript = evidencia recente, baixa autoridade
Prompt = estilo e limites
```

Hoje essa ordem nao esta explicita para o modelo.

## 6. Tool System

Tools observadas no agente:

```text
atualizar_qualificacao
setar_lead_quente
consultar_imoveis
cadastro_inicial1
SUPORTE1
conhecimento_estrategico_luana1
Think1
```

### `consultar_imoveis`

Descricao atual:

```text
Busca informacoes tecnicas, valores e disponibilidade de imoveis.
Use sempre que o lead citar um codigo JP, bairro ou tipologia.
Retorna o 'suco' para convencer o lead.
```

O contrato e intuitivo, mas nao e operacionalmente coercitivo. A frase "Use sempre" esta dentro do prompt/tool description, nao em um gate de runtime.

Consequencia:

- O modelo pode continuar perguntando mesmo com bairro/tipologia/quartos suficientes.
- O modelo pode consultar tarde.
- O modelo pode nao consultar em conversas onde o cliente ja demonstrou intencao concreta.

### `atualizar_qualificacao`

Descricao atual:

```text
Use para salvar o perfil, prazo e financeiro do lead.
Chame assim que descobrir se ele quer morar/investir e como vai pagar.
```

Problema: o contrato diz quando usar, mas nao explicita quais campos devem ser extraidos, quais campos sao opcionais e se a tool deve ser chamada mesmo com dados parciais.

Sem schema de decisao antes da chamada, a Ju pode:

- perguntar de novo em vez de salvar;
- salvar tarde;
- salvar so quando tiver contexto perfeito;
- nao atualizar dados pequenos, mas importantes.

### `setar_lead_quente`

Descricao atual:

```text
Use APENAS quando o lead aceitar visita ou cafe na Jurema.
```

Aqui a regra e mais clara. Ainda assim, deveria estar ligada a sinais estruturados:

- pediu corretor;
- pediu ligacao;
- aceitou visita;
- pediu endereco;
- mandou disponibilidade;
- quer avancar rapido.

Hoje esses sinais ficam no julgamento textual do LLM.

### `Think1`

`Think1` pode ajudar raciocinio interno, mas tambem pode incentivar deliberacao invisivel sem registrar uma decisao operacional estruturada. Se o runtime nao persiste `decision_trace`, o "pensar" nao vira governanca.

### Falha central de tool governance

As tools sao capacidades, nao politicas. O runtime atual diz ao agente o que ele pode fazer, mas nao decide quando ele deve fazer.

Isso explica a perda de autonomia operacional: a Ju pergunta quando deveria agir porque a acao ainda depende de convencimento por prompt.

## 7. Fluxo Real de Orchestration

O fluxo real de orquestracao pode ser descrito assim:

```text
1. Recebe evento Evolution.
2. Normaliza payload e identifica tipo de mensagem.
3. Verifica atendimento/bloqueio/pausa.
4. Busca ou cria entidades operacionais no Supabase.
5. Persiste inbound.
6. Carrega mensagens recentes.
7. Monta contexto textual.
8. Faz branch multimodal.
9. Agrega mensagens via Redis/debounce.
10. Injeta regras adicionais.
11. Entrega tudo ao agente.
12. Agente decide resposta e tools.
13. Persiste outbound.
14. Envia via Evolution.
```

A orquestracao do n8n esta cumprindo bem funcoes de integracao e automacao. A fragilidade esta entre os passos 7 e 12.

No passo 7, o runtime converte estado em texto. No passo 12, espera que o LLM reconverta texto em decisao. Essa ida e volta e cara e instavel.

O que falta entre 10 e 11:

```text
Context Compiler
  -> resolve autoridade dos dados
  -> calcula stage
  -> calcula next_action
  -> define allowed_tools
  -> define blocked_questions
  -> define token budget
  -> entrega contexto minimo ao agente
```

Isso nao exige nova stack nesta etapa. E uma conclusao arquitetural sobre onde o runtime degrada.

## 8. Gargalos Cognitivos

### Gargalo 1: prompts monoliticos

O system prompt tenta resolver identidade, tom, qualificacao, anti-loop, tool use, links, cards e saida final em um bloco unico. Isso concentra responsabilidades distintas:

- politica de conversa;
- politica operacional;
- politica de tool;
- politica de apresentacao;
- politica de seguranca;
- memoria.

Quanto mais o prompt cresce, mais dificil fica garantir prioridade. Regras criticas competem com exemplos, estilo e contexto historico.

### Gargalo 2: ausencia de hierarchy

Nao ha hierarquia explicita entre:

- Supabase state;
- deal;
- qualification;
- transcript;
- memory;
- RAG;
- prompt;
- tool outputs.

Sem hierarquia, o modelo pode dar peso indevido ao elemento mais recente ou mais verbalmente saliente, mesmo que operacionalmente seja menos confiavel.

### Gargalo 3: anti-loop textual

O prompt diz "nunca repita a mesma pergunta". Isso ajuda, mas nao impede repeticao sem uma lista estruturada de perguntas bloqueadas.

Anti-loop efetivo exige dados como:

```text
last_questions_asked
answered_fields
blocked_questions
max_retries_per_field
fallback_next_action
```

Hoje o anti-loop depende de o modelo lembrar e obedecer.

### Gargalo 4: excesso de autonomia conversacional

A Ju foi instruida a ser humana, consultiva e natural. Isso melhora tom, mas tambem aumenta tendencia a conversar antes de operar.

Para uma corretora operacional, naturalidade deve ser camada de expressao, nao de decisao. A decisao deveria vir do estado.

### Gargalo 5: multimodal entra como conversa

Audio, imagem e video passam por branches de normalizacao, upload e memoria. O pipeline tecnico esta evoluindo, mas o runtime cognitivo ainda precisa classificar a saida multimodal:

- transcript confiavel;
- transcript parcial;
- falha tecnica;
- midia recebida mas nao compreendida;
- imagem/video persistido;
- acao esperada apos midia.

Sem isso, fallback ou descricao tecnica pode entrar no historico como se fosse fala do cliente.

## 9. Gargalos de Token

Fontes principais de consumo:

- system prompt longo;
- `_context` com estado e historico;
- `historico_recente` com ate 12 mensagens no build_context;
- `postgres1` com janela de 100 mensagens;
- tool schemas;
- RAG quando acionado;
- exemplos e regras repetidas;
- possivel duplicacao de mensagem atual.

### Desperdicio 1: transcript duplicado

O mesmo conteudo conversacional pode aparecer em:

- `_context`;
- Postgres Chat Memory;
- Redis aggregation;
- mensagem atual;
- persistencia de `conversation_messages`.

Nem toda persistencia precisa virar prompt. Persistir e diferente de injetar.

### Desperdicio 2: regras repetidas

O system prompt ja traz regras de comportamento. `Build Context1` injeta novo bloco `<regras_de_comportamento>`. Algumas regras se repetem semanticamente:

- responder intencao imediata;
- nao repetir pergunta;
- fazer uma pergunta por vez;
- conduzir qualificacao.

Repeticao aumenta tokens, mas nao cria enforcement. O ganho marginal e baixo.

### Desperdicio 3: reasoning no contexto

Quando o contexto inclui historico, regras e instrucoes de como pensar, o modelo gasta tokens decidindo o que ja deveria estar decidido:

- qual campo falta;
- se deve usar tool;
- se deve perguntar;
- se deve consultar imoveis;
- se deve atualizar qualificacao.

Esse e o maior desperdicio: nao e apenas tamanho de prompt, e decisao repetida a cada turno.

### Desperdicio 4: RAG nao priorizado

RAG institucional e util quando o cliente pergunta sobre bairro, empresa, mercado, processo ou duvida consultiva. Para busca transacional de imoveis, `consultar_imoveis` deveria ter precedencia. Sem politica de retrieval, RAG pode consumir tokens em casos onde a tool operacional resolveria melhor.

## 10. Mistura Entre State, Memory, Transcript, Reasoning e Rules

### State

Deveria responder:

- quem e o lead;
- qual deal esta ativo;
- em qual etapa esta;
- quais campos estao resolvidos;
- quais campos faltam;
- qual e a proxima acao.

Hoje parte disso existe, mas e entregue como texto.

### Memory

Deveria conter:

- preferencias estaveis;
- restricoes declaradas;
- sinais de urgencia;
- historico resumido;
- decisoes ja tomadas.

Hoje memoria se confunde com transcript e historico recente.

### Transcript

Deveria ser evidencia de curto prazo, com baixa autoridade. Hoje pode competir com estado.

### Reasoning

Deveria ocorrer fora do prompt final ou ser persistido como trace operacional. Hoje o modelo raciocina implicitamente dentro do agent loop, sem expor uma decisao estruturada.

### Rules

Deveriam ser divididas entre:

- regras de estilo;
- regras de seguranca;
- regras de negocio;
- regras de tool;
- regras de estado.

Hoje elas vivem majoritariamente no prompt e em `<regras_de_comportamento>`, misturadas.

## 11. Onde a Ju Perde Autonomia Operacional

A Ju perde autonomia quando o runtime a coloca para "decidir conversando" em vez de "executar com estado".

Padroes de perda:

- Pergunta bairro mesmo quando bairro ja existe.
- Pergunta quartos mesmo quando quartos ja foram informados.
- Pede mais contexto antes de consultar imoveis.
- Explica em vez de acionar tool.
- Continua qualificando quando ja deveria apresentar opcoes.
- Usa tom consultivo para adiar acao.
- Trata incerteza pequena como bloqueio.

Esse comportamento nao e falha moral do prompt. E consequencia da arquitetura: a proxima acao nao e uma entrada obrigatoria do agente.

## 12. Problemas Estruturais Identificados

### P0 - Falta de `next_action`

Sem `next_action`, o runtime nao sabe se a resposta esperada e:

- responder duvida simples;
- pedir campo faltante;
- atualizar qualificacao;
- consultar imoveis;
- apresentar resultado de tool;
- acionar handoff;
- encerrar;
- fallback tecnico.

Tudo isso fica implito.

### P0 - Tools sem enforcement

As tools existem, mas nao ha politica externa ao modelo dizendo:

- tool obrigatoria quando condicao X;
- tool proibida quando condicao Y;
- maximo de perguntas antes de tool;
- campos minimos para cada tool;
- campos que nao podem ser perguntados novamente.

### P0 - Transcript com autoridade alta demais

O transcript deveria explicar o contexto recente, nao governar o estado. Hoje ele pode induzir loops.

### P1 - Memoria tripla

Supabase, Redis e Postgres Chat Memory cumprem papeis diferentes, mas todos podem influenciar a cognicao. Sem papeis claros:

- Supabase deveria ser estado oficial.
- Redis deveria ser buffer/debounce operacional.
- Postgres Chat Memory deveria ser resumo conversacional limitado ou ser substituido por contexto controlado.

### P1 - RAG pouco governado

RAG/XML esta disponivel, mas sem criterio explicito de quando usar, quando nao usar e qual autoridade tem frente a Supabase/tools.

### P1 - Prompt monolitico

O prompt tenta compensar ausencia de runtime policy. Ele melhorou o comportamento, mas nao resolve governanca.

### P2 - Falta de trace de decisao

Sem `decision_trace`, fica dificil auditar por que a Ju perguntou ou nao chamou tool.

### P2 - Falta de budget de contexto

Nao ha limite institucional visivel por camada:

- maximo de historico;
- maximo de RAG;
- maximo de regras;
- maximo de tool output;
- maximo de memoria.

## 13. Recomendacoes Prioritarias

Estas recomendacoes nao exigem trocar stack agora. Sao prioridades arquiteturais para estabilizar o runtime atual.

### Prioridade 1: Context Hierarchy

Definir uma hierarquia explicita:

```text
1. Supabase operational state
2. Current user message
3. Resolved qualification fields
4. Tool outputs
5. Memory summary
6. Recent transcript
7. RAG/XML
8. Style prompt
```

O agente deve receber essa hierarquia como contrato, nao como sugestao.

### Prioridade 2: `next_action` antes do agente

Adicionar uma decisao estruturada antes do `Atendente1`:

```json
{
  "stage": "property_search_ready",
  "next_action": "consultar_imoveis",
  "reason": "lead informou bairro e tipologia suficientes",
  "resolved_fields": ["bairro", "tipo_imovel", "quartos"],
  "missing_fields": ["valor_max"],
  "allowed_tools": ["consultar_imoveis", "atualizar_qualificacao"],
  "blocked_questions": ["bairro", "tipo_imovel", "quartos"]
}
```

Isso reduz variancia sem reescrever o sistema.

### Prioridade 3: Memory Summary

Reduzir dependencia de transcript bruto. Criar ou consolidar uma memoria resumida com:

- preferencias estaveis;
- requisitos confirmados;
- restricoes;
- sinais de urgencia;
- ultimas decisoes;
- campos que nao devem ser perguntados novamente.

Transcript bruto deve ser fallback de baixa autoridade.

### Prioridade 4: Tool Contracts

Formalizar contratos de tools:

```text
consultar_imoveis.required_when:
  - codigo_ref presente
  - bairro + tipo_imovel presentes
  - bairro + quartos presentes
  - cliente pede opcoes, disponibilidade, valor ou imovel

consultar_imoveis.forbidden_when:
  - atendimento pausado
  - lead pediu humano
  - mensagem e interrupcao identitaria simples

atualizar_qualificacao.required_when:
  - qualquer campo novo de qualificacao for extraido com confianca

setar_lead_quente.required_when:
  - lead aceita visita, ligacao, corretor ou avanco imediato
```

### Prioridade 5: Anti-loop estrutural

Trocar "nao repita" por campos operacionais:

```text
asked_fields_recently
answered_fields
blocked_questions
retry_count_by_field
fallback_question
```

### Prioridade 6: RAG Policy

Separar RAG institucional de operacao:

- RAG para conhecimento consultivo, bairros, empresa, processo e narrativa.
- `consultar_imoveis` para estoque, disponibilidade, valores e cards.
- Supabase/deal para estado oficial do lead.

### Prioridade 7: Token Budget

Definir budget por camada:

```text
system prompt: curto e estavel
state: sempre presente, compacto
memory_summary: sempre presente, compacto
recent_transcript: 3 a 6 mensagens, se necessario
RAG: somente sob demanda
tool outputs: resumidos para resposta
```

### Prioridade 8: Decision Trace

Persistir por turno:

```json
{
  "input_type": "text|audio|image|video",
  "stage_before": "qualification_partial",
  "next_action": "ask_missing_budget",
  "tools_called": [],
  "fields_updated": ["bairro"],
  "blocked_questions": ["bairro"],
  "stage_after": "qualification_partial"
}
```

Isso melhora observabilidade e replay.

## 14. O Que Ja Deve Ser Preservado

Nao ha indicacao de jogar fora a arquitetura atual. Devem ser preservados:

- Supabase como source of truth.
- Cockpit operacional.
- Timeline e `conversation_messages`.
- Multi-tenant e RLS.
- n8n como camada de integracao/eventos.
- Evolution API como gateway WhatsApp.
- Tools ja existentes.
- RAG/XML como conhecimento institucional.
- Branch multimodal, depois de corrigida aquisicao de midia.

O que precisa mudar e a governanca cognitiva entre contexto e agente.

## 15. Conclusao

A Ju degrada operacionalmente hoje porque o runtime entrega informacao demais e autoridade de menos.

O sistema ja sabe muito sobre o lead, mas nao transforma esse conhecimento em uma decisao operacional obrigatoria. O agente recebe contexto, transcript, memoria, RAG e regras, mas nao recebe um contrato claro de proxima acao.

O caminho pragmatico nao e reescrever tudo. O proximo nivel de maturidade e institucionalizar:

- hierarquia de contexto;
- `next_action`;
- contratos de tools;
- memoria resumida;
- anti-loop estrutural;
- politica de RAG;
- budget de tokens;
- trace de decisao.

Com isso, a Ju deixa de depender de prompt monolitico para se comportar bem e passa a operar como runtime AI-native governado: menos perguntas redundantes, menos requalificacao, menos tokens e mais acao consistente.

## Apendice A: Evidencias Auditadas no Workflow

Este apendice registra evidencias objetivas extraidas do workflow `cj4V6DW0Qy6el0PM`. Ele serve para separar observacao arquitetural de opiniao.

### Workflow principal

```text
Nome: Ju - n8n Supabase v1.1 pronto
ID: cj4V6DW0Qy6el0PM
Nodes: 106
Status no export local: active = true
```

### Agente cognitivo

```text
Node: Atendente1
Tipo: @n8n/n8n-nodes-langchain.agent
Entrada textual: "Mensagem do Cliente: {{ $json.mensagemCliente }}\n\n{{ $json._context }}"
System prompt: 3797 caracteres
```

Leitura arquitetural: o agente recebe a mensagem atual e `_context` como texto corrido. O prompt contem regras de tom, qualificacao, anti-loop, uso de tools, apresentacao de imoveis e saida final no mesmo bloco.

### Build context e normalizacao cognitiva

```text
Node: Code in JavaScript
Tipo: n8n-nodes-base.code
jsCode: 16421 caracteres

Node: Dados do Lead1
Tipo: n8n-nodes-base.code
jsCode: 1096 caracteres

Node: Build Context1
Tipo: n8n-nodes-base.code
jsCode: 924 caracteres
```

Leitura arquitetural: o contexto nao nasce em um unico compilador de runtime. Ele e montado em etapas, com um node grande de estado/persistencia, um node de repacotamento e um node final que adiciona regras de comportamento.

### Memoria do agente

```text
Node: postgres1
Tipo: @n8n/n8n-nodes-langchain.memoryPostgresChat
Tabela: n8n_chat_histories_jurema
Session key: Normaliza Webhook1.sessionId
Context window: 100
```

Leitura arquitetural: a janela de 100 mensagens e incompatível com um runtime que precisa tomar decisoes operacionais compactas. Ela favorece transcript bruto em excesso e aumenta a chance de repeticao, requalificacao e confusao entre fala antiga e estado atual.

### Tool de conhecimento/RAG

```text
Node: conhecimento_estrategico_luana1
Tipo: @n8n/n8n-nodes-langchain.toolVectorStore
Descricao: "Contains all the information about prices and andress that you can check to answer user questions."
```

Leitura arquitetural: a tool existe, mas a descricao e generica e mistura preco/endereco com "answer user questions". Isso nao separa claramente conhecimento institucional de busca operacional de imoveis.

### Tool de consulta de imoveis

```text
Node: consultar_imoveis
Tipo: @n8n/n8n-nodes-langchain.toolWorkflow
Workflow chamado: 0udn6N4YelE6F2Ws
Descricao: "Busca informacoes tecnicas, valores e disponibilidade de imoveis. Use sempre que o lead citar um codigo JP, bairro ou tipologia. Retorna o 'suco' para convencer o lead."
```

Leitura arquitetural: a intencao da tool esta correta, mas a obrigatoriedade fica apenas em linguagem natural. Nao ha enforcement externo dizendo que, dado bairro/tipologia/codigo, `consultar_imoveis` deve ser chamado antes de nova pergunta.

### Tool de qualificacao

```text
Node: atualizar_qualificacao
Tipo: @n8n/n8n-nodes-langchain.toolWorkflow
Workflow chamado: QKFhZQJRz8rczaYE
Descricao: "Use para salvar o perfil, prazo e financeiro do lead. Chame assim que descobrir se ele quer morar/investir e como vai pagar."
```

Leitura arquitetural: a tool tem papel operacional claro, mas ainda depende do agente decidir quando extrair e persistir. Falta contrato por campo, confianca, parcialidade e idempotencia.

### Tool de lead quente

```text
Node: setar_lead_quente
Tipo: @n8n/n8n-nodes-langchain.toolWorkflow
Workflow chamado: QZ3VcIrxE6BRtCpj
Descricao: "Use esta ferramenta APENAS quando o lead aceitar a visita ou o cafe na Jurema. Ela move o lead para o estagio final do pipeline."
```

Leitura arquitetural: esta e a tool com contrato mais restritivo. Ainda assim, os sinais que autorizam a chamada continuam inferidos pelo LLM e nao por uma camada de estado.

### Audio/multimodal

```text
Node: Normalize Audio Payload
Tipo: n8n-nodes-base.code
jsCode: 6519 caracteres

Node: OpenAI1
Tipo: @n8n/n8n-nodes-langchain.openAi
```

Leitura arquitetural: o pipeline multimodal ja possui uma camada tecnica dedicada. Para o runtime cognitivo, o ponto critico e classificar a saida multimodal antes de ela entrar como transcript ou memoria: transcricao confiavel, transcricao parcial, falha tecnica, fallback ou midia recebida sem entendimento.

## Apendice B: Auditoria Completa por Eixo

Este complemento consolida a auditoria nos eixos solicitados: `build_context`, state engine, tool governance, memory, RAG/XML, token economy, output quality, institucionalizacao e eventual migracao futura para Python.

### 1. Runtime topology atual

O runtime atual e uma composicao de tres loops:

```text
Loop de integracao
  Evolution -> Webhook -> normalizacao -> Supabase -> branch multimodal -> envio Evolution

Loop de memoria curta
  mensagem -> Redis push -> Wait -> Redis get -> comparacao -> mensagem consolidada

Loop cognitivo
  Supabase state + historico + mensagem atual + regras -> Atendente1 -> tools/RAG/memory -> resposta
```

O ponto forte e que o workflow ja diferencia integracao, persistencia, multimodal e agente. O ponto fraco e que a decisao operacional fica dentro do loop cognitivo, sem um artefato intermediario de decisao.

### 2. Anatomia completa do build_context

O `build_context` real nasce no node `Code in JavaScript`, nao no prompt. Ele executa:

- normalizacao de telefone;
- busca/criacao de `lead`;
- busca/criacao de `jurema_deals`;
- busca/criacao de `conversations`;
- gravacao idempotente de inbound em `conversation_messages`;
- leitura de `conversation_messages` recentes, limite 12;
- montagem de `_context` via `buildOperationalContext`.

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
mensagem consolidada
</mensagem_atual>
```

Depois, `Build Context1` injeta:

```text
<regras_de_comportamento>
responder intencao imediata
nao avancar etapa em interrupcoes
nao repetir pergunta
avancar qualificacao so com dado real
uma pergunta por vez
acolher indefinicao de bairro/prazo
</regras_de_comportamento>
```

Diagnostico: a estrutura nominal e boa, mas ainda e texto. O runtime nao transforma `campos_faltantes` em `next_action`, nem transforma `dados_coletados` em `blocked_questions`. Por isso o modelo precisa raciocinar novamente sobre estado a cada turno.

O que deveria virar state explicito:

- `stage`;
- `qualification_status`;
- `resolved_fields`;
- `missing_fields`;
- `blocked_questions`;
- `next_action`;
- `allowed_tools`;
- `required_tools`;
- `tool_precedence`;
- `handoff_status`;
- `media_status`.

O que deveria virar summary:

- preferencias estaveis;
- requisitos confirmados;
- historico de decisoes;
- ultimas objeções;
- bairros descartados;
- imoveis ja apresentados;
- perguntas ja feitas e respondidas.

O que deveria ser removido ou reduzido do prompt:

- transcript bruto longo;
- repeticao de regras ja presentes no system prompt;
- falhas tecnicas de audio como se fossem fala do cliente;
- exemplos extensos de comportamento quando a decisao ja deveria estar estruturada;
- qualquer reasoning operacional que possa ser calculado antes do agente.

### 3. Fluxo real de orchestration

Fluxo real observado:

```text
1. Webhook recebe evento Evolution.
2. Normaliza payload e sessionId.
3. Switch1 separa incoming/outcoming.
4. Redis verifica bloqueio manual.
5. Supabase busca/cria lead, deal e conversation.
6. Supabase grava inbound em conversation_messages.
7. Supabase carrega ultimas 12 mensagens.
8. Code node monta _context.
9. IF verifica ai_paused.
10. Switch7 roteia texto/audio/imagem/video.
11. Redis agrega mensagens curtas e audio transcrito.
12. Detecta Finalizacao tenta classificar gatilhos de envio/pagamento.
13. Build Context1 injeta regras.
14. Atendente1 decide resposta e tool calls.
15. Salvar Outbound Supabase grava resposta.
16. Array/Split/Evolution enviam resposta ao WhatsApp.
```

O fluxo de integracao e operacionalmente maduro. A fragilidade esta entre os passos 8 e 14: o contexto e montado, mas nao ha um decision node que converta estado em politica de proxima acao.

### 4. Mapa do runtime cognitivo

```text
State source
  Supabase: leads, jurema_deals, conversations, conversation_messages

Short-term buffer
  Redis: sessionId list, debounce, ultima mensagem consolidada

Agent memory
  Postgres Chat Memory: n8n_chat_histories_jurema, contextWindowLength 100

Context compiler atual
  Code in JavaScript + Dados do Lead1 + Build Context1

LLM runtime
  Atendente1 + OpenAI Chat Model3

Knowledge runtime
  conhecimento_estrategico_luana1 + Supabase Vector Store + documents

Action runtime
  atualizar_qualificacao
  consultar_imoveis
  setar_lead_quente
  cadastro_inicial1
  SUPORTE1

Persistence after response
  Salvar Outbound Supabase -> conversation_messages/conversations
```

O runtime tem todos os componentes essenciais. O que falta e hierarquia entre eles.

### 5. State engine

Stages reais inferidos:

- `incoming_received`;
- `ai_block_check`;
- `lead_loaded_or_created`;
- `deal_loaded_or_created`;
- `conversation_open`;
- `qualification_incomplete`;
- `qualification_partial`;
- `property_search_ready`;
- `property_presented`;
- `hot_lead`;
- `handoff_requested`;
- `ai_paused`;
- `media_processing`;
- `media_failed`;
- `finalization_detected`.

Transitions reais:

```text
sem lead -> criar lead -> criar deal qualificacao/incompleto
lead existente -> carregar deal -> montar contexto
conversation.ai_paused true -> encerrar IA
texto/audio -> Redis debounce -> agente
audio valido -> OpenAI1 -> transcript -> agente
audio invalido -> fallback text -> Redis -> agente
cliente aceita visita/cafe -> setar_lead_quente, se agente chamar
cliente informa dados -> atualizar_qualificacao, se agente chamar
cliente cita bairro/codigo/tipologia -> consultar_imoveis, se agente chamar
```

Next actions implicitos:

- se falta objetivo: perguntar morar/investir;
- se falta bairro: perguntar regiao;
- se falta valor: perguntar faixa;
- se tem bairro/tipologia/codigo: consultar imoveis;
- se cliente pede humano/visita: handoff ou lead quente;
- se audio falha: responder fallback;
- se IA pausada: nao responder.

Problema: esses next actions existem como inferencia humana, mas nao como campo persistido ou calculado. O LLM precisa reconstruir essa decisao.

Onde a Ju reabre etapas:

- quando `historico_recente` contem uma pergunta antiga ainda semanticamente forte;
- quando `campos_faltantes` nao distingue "faltante critico" de "faltante opcional";
- quando `dados_coletados` tem valor parcial, mas nao ha `resolved_fields`;
- quando a tool `atualizar_qualificacao` nao foi chamada no turno anterior, deixando o Supabase desatualizado;
- quando Postgres Chat Memory reintroduz conversa antiga com prioridade alta.

Onde reconfirma dados resolvidos:

- bairro, tipologia e finalidade podem aparecer em `deal` ou `metadata`, mas o prompt apenas diz para usar o contexto;
- nao ha `blocked_questions` impedindo repetir bairro/quartos/finalidade;
- `campos_faltantes` considera faixa de valor e timeline como criticos, podendo forcar pergunta mesmo quando a intencao do cliente ja permite buscar opcoes.

Onde perde direcao operacional:

- quando o cliente da informacao suficiente para busca, mas tambem ha campos faltantes;
- quando a instrucao "pergunte uma coisa por vez" compete com "use consultar_imoveis";
- quando RAG responde consultivamente em vez de acionar tool transacional;
- quando o modelo prioriza tom humano e acolhimento em vez de executar proxima acao.

### 6. Tool governance

Tools existentes no agente:

```text
atualizar_qualificacao -> workflow QKFhZQJRz8rczaYE
setar_lead_quente -> workflow QZ3VcIrxE6BRtCpj
consultar_imoveis -> workflow 0udn6N4YelE6F2Ws
cadastro_inicial1
SUPORTE1
conhecimento_estrategico_luana1
Think1
```

Contratos atuais:

- `consultar_imoveis`: usar quando lead citar codigo JP, bairro ou tipologia.
- `atualizar_qualificacao`: usar para salvar perfil, prazo e financeiro.
- `setar_lead_quente`: usar apenas quando aceitar visita ou cafe.
- `conhecimento_estrategico_luana1`: usar como conhecimento interno.

Quando deveriam ser chamadas:

- `atualizar_qualificacao`: no mesmo turno em que qualquer campo de qualificacao for extraido com confianca.
- `consultar_imoveis`: quando houver codigo, bairro, tipologia, quartos ou pedido explicito por opcoes/disponibilidade/preco.
- `setar_lead_quente`: quando houver aceite de visita, corretor, ligacao, reuniao, endereco, agenda ou avancar rapido.
- `conhecimento_estrategico_luana1`: apenas para conhecimento institucional, bairros, mercado, posicionamento e duvidas consultivas.

Onde a Ju pergunta quando deveria usar tool:

- cliente informa bairro e tipologia, mas falta valor: a Ju pode perguntar valor antes de consultar;
- cliente cita codigo: deveria consultar direto, mas pode pedir contexto;
- cliente pede opcoes: deveria consultar com filtros parciais, mas pode continuar qualificando;
- cliente sinaliza visita/corretor: deveria setar quente/handoff, mas pode continuar conversa.

Ausencia de autonomy:

- as tools sao acopladas ao agente como capacidades;
- nao ha `required_tool`;
- nao ha `tool_precedence`;
- nao ha `state gating`;
- nao ha politica de "nao perguntar se uma tool pode resolver";
- nao ha checagem pos-turno se a tool obrigatoria foi omitida.

### 7. Memory

Persistencia real:

- `conversation_messages`: historico oficial inbound/outbound no Supabase.
- `conversations`: ultimo estado de conversa, pausa, last_message.
- `leads`: dados do cliente e metadados.
- `jurema_deals`: qualificacao e funil comercial.
- Redis: buffer por `sessionId`.
- `n8n_chat_histories_jurema`: memoria LangChain com janela 100.

Problema central: ha persistencia suficiente, mas falta memoria operacional resumida.

Transcript vs memoria:

- transcript e evento;
- memoria deveria ser conclusao;
- state deveria ser verdade operacional.

Hoje transcript aparece em `historico_recente`, Redis e Postgres Chat Memory. Isso gera replay cognitivo: o modelo relê conversa antiga para deduzir informacao que ja deveria estar em `deal` ou em `memory_summary`.

Redundancias:

- `conversation_messages` ultimas 12 mensagens;
- Postgres Chat Memory ate 100 mensagens;
- Redis ultima mensagem/lista;
- mensagem atual duplicada fora e dentro de `_context`;
- fallback de audio podendo entrar como conteudo conversacional.

O que falta como memoria estruturada:

```json
{
  "requirements": {
    "bairro": "Bessa",
    "quartos": "3",
    "tipo": "apartamento"
  },
  "preferences": {
    "vista_mar": true,
    "lazer": true
  },
  "constraints": {
    "budget_max": 700000,
    "payment_method": "financiamento"
  },
  "conversation_facts": {
    "asked_fields": ["bairro", "quartos"],
    "answered_fields": ["bairro", "quartos"],
    "last_presented_property_ids": []
  }
}
```

### 8. RAG/XML

Fonte XML local:

```text
Arquivo: clientes/jurema-brokers/knowledge.xml
Tamanho: 5005 caracteres
Tokens aproximados: 1252
Topicos: business_identity, market_intelligence, neighborhoods, ai_behavior, ui_enrichment, integrations
```

Runtime RAG:

```text
conhecimento_estrategico_luana1
  -> Supabase Vector Store1
  -> tabela documents
  -> Embeddings OpenAI1
```

Problemas de retrieval:

- descricao da tool e generica e em ingles;
- RAG mistura preco/endereco com responder perguntas gerais;
- XML contem conhecimento, comportamento, UI enrichment e integracoes no mesmo corpo;
- regras de comportamento no XML podem repetir regras do prompt;
- RAG pode ser usado em pergunta transacional que deveria ir para `consultar_imoveis`;
- nao ha budget de chunks nem politica de precedencia sobre tools.

Policy leakage:

- blocos de `ai_behavior`, `integrations` e `ui_enrichment` podem vazar como raciocinio interno;
- o agente pode explicar processo ou fonte se o prompt falhar;
- conhecimento de operacao pode competir com estado oficial do Supabase.

O RAG deve permanecer, mas com fronteiras:

- RAG responde "por que Bessa?", "como funciona?", "quem e Jurema?", "qual perfil de bairro?";
- `consultar_imoveis` responde "tem?", "quanto?", "manda opcoes", "codigo JP";
- Supabase state responde "o que este lead ja informou?".

### 9. Token economy

Onde explode token:

- system prompt com 3797 caracteres;
- `_context` com estado, dados, campos faltantes, historico e mensagem atual;
- `historico_recente` com 12 mensagens;
- Postgres Chat Memory com 100 mensagens;
- schemas/descriptions de tools;
- RAG quando acionado;
- tool outputs de imoveis;
- duplicacao de mensagem atual;
- regras repetidas no prompt e em `Build Context1`.

Onde o modelo reinterpreta estado resolvido:

- transforma `dados_coletados` em decisao de campo faltante;
- decide se campo faltante bloqueia busca;
- decide se deve atualizar qualificacao;
- decide se deve consultar imoveis;
- decide se historico antigo ainda importa;
- decide se fallback de audio e fala real ou evento tecnico.

Onde transcript substitui state:

- `historico_recente` pode conter dado mais antigo que o deal;
- Postgres Memory pode reintroduzir estado obsoleto;
- perguntas anteriores da Ju podem parecer pendencias atuais;
- respostas parciais do cliente podem competir com campos consolidados.

Reasoning excessivo:

- decidir stage;
- decidir next action;
- decidir tool;
- decidir se pergunta e repetida;
- decidir se campos sao suficientes;
- decidir se RAG ou tool operacional e melhor.

Essas decisoes deveriam ser calculadas antes do LLM ou registradas como trace.

### 10. Output behavior

O prompt tenta impor:

- WhatsApp natural;
- frases curtas;
- sem markdown tecnico;
- sem listas longas;
- uma pergunta por vez;
- nao despejar imoveis;
- contextualizar cards.

O comportamento esperado e bom, mas a governanca esta no lugar errado. Output quality depende de decisao correta antes do texto.

Falhas provaveis:

- excesso de conversa para parecer humana;
- perguntas redundantes para "qualificar naturalmente";
- falta de assertividade quando ja ha filtros suficientes;
- loops quando o cliente nao responde diretamente;
- resposta consultiva quando a melhor acao era tool;
- reabertura de etapa por `campos_faltantes`;
- perda de objetividade quando RAG entra com contexto demais.

Output ideal deveria ser resultado de:

```text
state_decision -> tool_result_or_question -> response_style
```

Hoje tende a ser:

```text
prompt + transcript + memory + RAG + tools -> LLM decide tudo
```

### 11. Gargalos estruturais

Gargalos principais:

- falta de `next_action`;
- falta de `state_decision`;
- falta de `resolved_fields` e `blocked_questions`;
- tools sem contratos executaveis;
- memoria baseada em transcript bruto;
- RAG sem politica de precedencia;
- prompt monolitico compensando runtime;
- audio fallback podendo entrar como memoria;
- ausencia de decision trace;
- ausencia de budget por camada de contexto.

### 12. O que ja esta correto

Deve ser reconhecido como boa fundacao:

- Supabase como source of truth operacional;
- entidades reais de lead, deal, conversation e messages;
- persistencia inbound/outbound;
- multi-tenant;
- IA pausada via estado;
- Redis debounce para mensagens curtas;
- branch multimodal separado;
- tools operacionais reais;
- RAG separado como tool;
- cards de imoveis automatizados;
- cockpit/timeline como camada operacional;
- workflow tool `consultar_imoveis` isolado.

### 13. O que deve permanecer

Devem permanecer:

- n8n como camada de integracao e automacao;
- Evolution API como canal WhatsApp;
- Supabase como verdade operacional;
- cockpit e timeline atuais;
- workflows de tools existentes;
- persistencia em `conversation_messages`;
- branch multimodal, com aquisicao oficial de midia;
- RAG/XML, desde que governado;
- prompt de tom, mais enxuto e subordinado ao runtime.

### 14. O que deve ser institucionalizado

Institucionalizar no runtime atual:

```text
Context hierarchy
State decision
Next action
Tool contracts
Tool precedence
Blocked questions
Resolved fields
Memory summary
RAG policy
Token budget
Decision trace
Replay/debug view
Media status contract
```

Exemplo de contrato alvo:

```json
{
  "stage": "property_search_ready",
  "next_action": "consultar_imoveis",
  "required_tools": ["consultar_imoveis"],
  "allowed_tools": ["consultar_imoveis", "atualizar_qualificacao"],
  "blocked_questions": ["bairro", "tipo_imovel", "quartos"],
  "resolved_fields": ["bairro", "tipo_imovel", "quartos"],
  "missing_fields": ["valor_max"],
  "rag_allowed": false,
  "reply_mode": "contextualize_tool_result"
}
```

### 15. O que deveria migrar futuramente para runtime Python

Nao e necessario migrar tudo agora. Se houver uma evolucao futura para Python, o que faz sentido migrar e apenas a camada cognitiva/orquestradora:

- `Context Compiler`;
- `State Engine`;
- `Next Action Planner`;
- `Tool Router`;
- `Memory Summarizer`;
- `RAG Policy Engine`;
- `Decision Trace`;
- `Replay/Evaluation Harness`;
- validadores de output;
- testes de regressao conversacional.

O que nao deveria migrar por enquanto:

- frontend;
- cockpit;
- Supabase;
- RLS/multi-tenant;
- Evolution como canal;
- n8n para webhooks, automacoes e integracoes;
- workflows operacionais simples que ja funcionam.

Topologia futura pragmatica:

```text
Evolution
  -> n8n ingestion/integration
  -> Python Ju Runtime
       Context Compiler
       State Engine
       Tool Router
       Memory Summary
       RAG Policy
       LLM Call
       Decision Trace
  -> Supabase source of truth
  -> n8n delivery/actions
  -> Cockpit/timeline
```

Essa migracao so deve ocorrer depois de institucionalizar os contratos dentro do runtime atual. O objetivo nao e trocar stack; e tirar a decisao operacional de prompts monoliticos e transforma-la em runtime governado.
