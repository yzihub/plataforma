# CLAUDE.md — YZI OS Frontend

## Objetivo

Este arquivo é a fonte de contexto para o Claude Code trabalhar no frontend do YZI OS.

Antes de qualquer alteração no código, o Claude Code deve ler este documento inteiro.

Regra central:

> O frontend não deve duplicar regra de negócio dos agentes.
> O backend Agno/YZI OS é a fonte da verdade para estado, score, progressão de funil, decisões de pagamento, agendamento, imóveis, matches e handoff.

---

# 1. Arquitetura geral

```text
Cursor + Claude Code = desenvolvimento do frontend
Vercel = deploy do frontend
Agno/YZI OS = backend dos agentes
Supabase = banco principal
n8n = integrações operacionais
Asaas = pagamento Café com Pam
Google Calendar/Meet = agendamento Café com Pam
```

## Responsabilidades do frontend

O frontend deve:

- exibir interfaces, dashboards, funis e detalhes;
- chamar APIs do backend;
- ler dados públicos/autorizados do Supabase;
- tratar loading, erro e sucesso;
- exibir estados vindos do backend.

O frontend NÃO deve:

- calcular máquina de estados;
- calcular score;
- decidir avanço de etapa;
- decidir quando mostrar imóveis;
- criar pagamentos diretamente;
- criar agendamentos diretamente;
- chamar n8n diretamente para ações sensíveis;
- usar `service_role`;
- duplicar lógica da Nina ou da Ju.

## Responsabilidades do backend Agno/YZI OS

O backend é responsável por:

- lógica dos agentes;
- criação/atualização de leads;
- criação/atualização de projetos/deals;
- cálculo de estágio;
- cálculo de campos faltantes;
- cálculo de score;
- decisão de avanço de funil;
- feature flags;
- eventos/métricas;
- exposição dos endpoints `/agent/nina`, `/agent/jurema` e `/agent/ju`.

## Responsabilidades do n8n

O n8n é responsável por integrações operacionais:

- gerar link Asaas;
- salvar pagamentos em `cafe_pam_payments`;
- atualizar pagamento em `cafe_pam_projects`;
- receber webhook de pagamento;
- criar/reagendar evento no Google Calendar;
- salvar dados de agendamento;
- devolver payload final para backend/Nina quando aplicável.

O n8n não deve ser chamado diretamente pelo usuário final no frontend, salvo endpoints explicitamente públicos e seguros.

---

# 2. Variáveis de ambiente do frontend

Use `.env.local`.

```env
NEXT_PUBLIC_YZI_API_URL=https://yzi-os.yzihub.com

NEXT_PUBLIC_CAFE_PAM_TENANT_ID=b179ae75-3d56-4de8-8840-fc9c4d9ec21e
NEXT_PUBLIC_DEFAULT_TENANT_ID=b179ae75-3d56-4de8-8840-fc9c4d9ec21e

NEXT_PUBLIC_JUREMA_TENANT_ID=82cc7aa9-fc6e-4f37-8d8e-8a71c1691361

NEXT_PUBLIC_SUPABASE_URL=https://dwmbklfkrtumfaxrbxio.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=COLOCAR_ANON_KEY_AQUI
```

Nunca colocar no frontend:

```text
SUPABASE_SERVICE_ROLE_KEY
ASAAS_API_KEY
tokens privados do n8n
tokens privados de Google/Calendar
secrets de backend
```

---

# 3. Tenants

## Nina / Café com Pam

```text
tenant_id = b179ae75-3d56-4de8-8840-fc9c4d9ec21e
```

## Ju / Jurema Brokers

```text
tenant_id = 82cc7aa9-fc6e-4f37-8d8e-8a71c1691361
```

Regra:

> Não misturar tenants. A Nina usa o tenant do Café com Pam. A Ju usa o tenant da Jurema Brokers.

---

# 4. Nina / Café com Pam

## Estado atual

A Nina foi migrada para o backend Agno/YZI OS.

Endpoint principal:

```http
POST https://yzi-os.yzihub.com/agent/nina
```

O frontend NÃO deve implementar a lógica da Nina diretamente.

## Payload base

```json
{
  "message": "Oi, quero fazer uma consultoria do Café com Pam",
  "phone": "5585988880000",
  "tenant_id": "b179ae75-3d56-4de8-8840-fc9c4d9ec21e"
}
```

## Payload vindo do site com plano

```json
{
  "message": "Olá! Vim pelo site do Café com Pam e tenho interesse na consultoria para dois ambientes.",
  "phone": "5585988880000",
  "tenant_id": "b179ae75-3d56-4de8-8840-fc9c4d9ec21e",
  "source": "site",
  "entrypoint": "pricing_card_2_ambientes",
  "plan_interest": "2_ambientes"
}
```

## Resposta esperada da Nina

```json
{
  "mode": "reply",
  "messages": ["Mensagem da Nina para o cliente"],
  "metadata": {
    "agent": "nina",
    "lead_id": "uuid",
    "project_id": "uuid",
    "briefing_id": "uuid",
    "cadastro_atualizado": false,
    "briefing_atualizado": false,
    "media_received": false,
    "media_status": "pendente",
    "project_stage": "qualificacao",
    "briefing_missing_fields": [],
    "briefing_block_sent": false,
    "feature_flags": {}
  }
}
```

## Estados principais da Nina

```text
qualificacao
cadastro
briefing
midias
pagamento
agendamento
```

O front deve usar `metadata.project_stage`.

## Tabelas Café com Pam

### `leads`

Tabela global de leads.

### `cafe_pam_projects`

Campos importantes:

```text
id
tenant_id
lead_id
project_stage
payment_status
booking_status
media_status
client_name
client_phone
payment_link_sent_at
payment_paid_at
booked_at
metadata
created_at
updated_at
```

Campos importantes dentro de `metadata`:

```text
lead_source_context
entrypoint
plan_interest
briefing_complete
briefing_missing_fields
briefing_block_sent
id_agendamento
meet_link
```

### `cafe_pam_briefings`

Usada para briefing da consultoria.

### `cafe_pam_payments`

Campos:

```text
id
tenant_id
project_id
provider
external_payment_id
asaas_payment_id
payment_link
payment_method
amount
status
payment_status
due_date
paid_at
failed_at
raw_payload
metadata
created_at
updated_at
```

Regras:

- `id` é UUID interno do pagamento;
- ID do Asaas deve ir em `external_payment_id` e/ou `asaas_payment_id`;
- nunca usar `pay_xxx` como UUID;
- link de pagamento fica em `payment_link`;
- status recomendados: `pendente`, `link_enviado`, `pago`, `cancelado`, `falhou`, `expirado`.

## Fluxo de pagamento Café com Pam

O frontend não cria pagamento direto no banco.

```text
1. Nina/backend decide que pode cobrar.
2. Backend ou n8n gera link Asaas.
3. n8n insere linha em cafe_pam_payments.
4. n8n atualiza cafe_pam_projects:
   - payment_status = link_enviado
   - project_stage = pagamento
   - payment_link_sent_at = now()
5. Front exibe o link salvo em cafe_pam_payments.payment_link.
```

## Fluxo de agendamento Café com Pam

O frontend não cria agenda direto no banco.

```text
1. Pagamento confirmado.
2. Projeto vai para project_stage = agendamento.
3. n8n cria evento no Google Calendar.
4. n8n salva:
   - booking_status = agendado
   - booked_at
   - metadata.id_agendamento
   - metadata.meet_link
5. Front exibe status e link do Meet quando necessário.
```

## CTAs Café com Pam

### 1 ambiente

```json
{
  "message": "Olá! Vim pelo site do Café com Pam e tenho interesse na consultoria para um ambiente.",
  "source": "site",
  "entrypoint": "pricing_card_1_ambiente",
  "plan_interest": "1_ambiente"
}
```

### 2 ambientes

```json
{
  "message": "Olá! Vim pelo site do Café com Pam e tenho interesse na consultoria para dois ambientes.",
  "source": "site",
  "entrypoint": "pricing_card_2_ambientes",
  "plan_interest": "2_ambientes"
}
```

### 3 ambientes

```json
{
  "message": "Olá! Vim pelo site do Café com Pam e tenho interesse na consultoria para três ambientes.",
  "source": "site",
  "entrypoint": "pricing_card_3_ambientes",
  "plan_interest": "3_ambientes"
}
```

## Client TypeScript sugerido para Nina

```ts
export type NinaRequest = {
  message: string;
  phone: string;
  tenant_id?: string;
  source?: string;
  entrypoint?: string;
  plan_interest?: string;
  context?: Record<string, unknown>;
};

export type NinaResponse = {
  mode: "reply" | string;
  messages: string[];
  metadata: {
    agent?: string;
    lead_id?: string;
    project_id?: string;
    briefing_id?: string;
    cadastro_atualizado?: boolean;
    briefing_atualizado?: boolean;
    media_received?: boolean;
    media_status?: string;
    project_stage?: string;
    briefing_missing_fields?: string[];
    briefing_block_sent?: boolean;
    feature_flags?: Record<string, unknown>;
    [key: string]: unknown;
  };
};

const API_URL = process.env.NEXT_PUBLIC_YZI_API_URL;
const CAFE_PAM_TENANT_ID =
  process.env.NEXT_PUBLIC_CAFE_PAM_TENANT_ID ||
  process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;

export async function sendMessageToNina(
  payload: NinaRequest
): Promise<NinaResponse> {
  if (!API_URL) throw new Error("NEXT_PUBLIC_YZI_API_URL não configurada");
  if (!payload.tenant_id && !CAFE_PAM_TENANT_ID) {
    throw new Error("NEXT_PUBLIC_CAFE_PAM_TENANT_ID não configurada");
  }

  const response = await fetch(`${API_URL}/agent/nina`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      tenant_id: payload.tenant_id || CAFE_PAM_TENANT_ID,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Erro ao chamar Nina: ${response.status} ${errorText}`);
  }

  return response.json();
}
```

---

# 5. Ju / Jurema Brokers

## Estado atual

A Ju/Jurema já foi implementada no backend Agno/YZI OS.

Endpoints:

```http
POST https://yzi-os.yzihub.com/agent/jurema
POST https://yzi-os.yzihub.com/agent/ju
```

A Ju está funcionando como MVP com:

```text
lead → deal → stage → score → missing_fields → próxima pergunta certa
```

O frontend NÃO deve implementar a lógica da Ju diretamente.

O backend é a fonte da verdade para:

- criação/recuperação de lead;
- criação/recuperação de deal;
- máquina de estados;
- lead score;
- campos faltantes;
- qualificação;
- busca de imóveis;
- matches enviados;
- handoff para corretor.

## Payload frio

```json
{
  "message": "Oi, estou procurando um imóvel",
  "phone": "5585988811150",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361"
}
```

## Payload vindo do site

```json
{
  "message": "Quero comprar um apartamento no Bessa com 3 quartos até 700 mil",
  "phone": "5585988811120",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "source": "site",
  "entrypoint": "property_search"
}
```

## Payload de imóvel específico

```json
{
  "message": "Tenho interesse nesse imóvel.",
  "phone": "5585988811132",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "source": "site",
  "entrypoint": "property_detail",
  "property_id": "JP009"
}
```

## Resposta esperada da Ju

```json
{
  "mode": "reply",
  "messages": ["Mensagem da Ju"],
  "metadata": {
    "agent": "jurema",
    "lead_id": "uuid",
    "deal_id": "uuid",
    "deal_stage": "qualificacao",
    "qualification_status": "incompleto",
    "lead_score": 0,
    "missing_fields": [],
    "feature_flags": {},
    "imoveis_count": 0
  }
}
```

## Funil da Ju

```text
qualificacao
perfil_busca
score
curadoria
corretor
visita
proposta
fechamento
nutricao
perdido
```

O frontend deve usar `metadata.deal_stage`.

## Regras críticas da Ju

A Ju não mostra imóveis para lead frio.

Catálogo só pode aparecer quando o backend permitir:

```text
metadata.profile_complete = true no backend
deal_stage em curadoria/corretor
lead pediu opções explicitamente
```

A palavra “imóvel” sozinha NÃO dispara catálogo.

Exemplo que NÃO pode mostrar imóveis:

```text
Oi, estou procurando um imóvel
```

Resposta correta:

```text
Olá, seja bem-vindo à Jurema Brokers. Eu sou a Ju e vou acompanhar seu atendimento por aqui.

Pra eu te direcionar melhor, me conta: você está buscando comprar, alugar ou investir em um imóvel?
```

Gatilhos seguros para pedir catálogo:

```text
pode separar algumas opções
quero ver opções
manda algumas opções
catálogo
lista
```

O frontend não deve duplicar essa regra. O backend já faz isso.

## Tabelas Jurema

### `leads`

Tabela global.

Campos importantes:

```text
id
tenant_id
name
email
phone
phone_normalized
source
status
score
metadata
ai_status
ai_temperature
ai_last_summary
ai_last_intent
ai_qualified_at
ai_hot_at
corretor_id
created_at
updated_at
```

### `jurema_deals`

Tabela principal da oportunidade imobiliária.

Campos principais:

```text
id
tenant_id
lead_id
deal_stage
qualification_status
client_name
client_phone
client_email
intent
property_type
location_preference
budget_min
budget_max
bedrooms
suites
parking_spots
purpose
timeline
payment_method
entry_amount
fgts_available
financing_approved
decision_maker
motivation
pain_point
lead_score
assigned_broker_id
broker_status
metadata
raw_payload
created_at
updated_at
```

Stages permitidos:

```text
qualificacao
perfil_busca
score
curadoria
corretor
visita
proposta
fechamento
nutricao
perdido
```

Qualification status:

```text
incompleto
frio
morno
quente
desqualificado
```

Broker status:

```text
nao_atribuido
aguardando_corretor
atribuido
em_atendimento
encerrado
```

### `jurema_property_matches`

Guarda imóveis enviados/sugeridos pela Ju.

Campos principais:

```text
id
tenant_id
deal_id
property_id
property_source
match_score
match_reason
status
metadata
raw_payload
created_at
updated_at
```

Status permitidos:

```text
sugerido
enviado
interessado
descartado
visitado
```

Exemplo validado:

```text
property_id = JP009
property_source = imoveis
match_score = 95
status = enviado
```

### `jurema_appointments`

Tabela criada para visitas/agendamentos futuros.

Campos principais:

```text
id
tenant_id
deal_id
property_id
broker_id
appointment_type
appointment_status
scheduled_at
scheduled_end_at
location_type
location_details
calendar_event_id
meet_link
metadata
raw_payload
created_at
updated_at
```

Tipos:

```text
visita
ligacao
videochamada
reuniao
```

Status:

```text
solicitada
agendada
reagendada
cancelada
realizada
nao_compareceu
```

### `imoveis`

Fonte real de imóveis da Jurema.

Tenant dos imóveis:

```text
82cc7aa9-fc6e-4f37-8d8e-8a71c1691361
```

Campos usados:

```text
id
tenant_id
id_imovel
titulo_comercial
titulo_seo
descricao_imovel
tipo_de_imovel
finalidade
bairro
quartos
suites
vagas
metragem
valor
foto_principal
link_do_imovel
link_sanitizado
imagem_card
status_publicacao
status_operacional
metadata
```

A busca usa:

```text
tenant_id
status_operacional = disponivel
status_publicacao = Publicado
tipo_de_imovel
bairro
valor
finalidade
```

Observação:

`quartos` é texto no schema atual. Por isso, a Ju ainda não filtra quartos diretamente na query. Ela pode exibir imóvel próximo ao perfil mesmo com divergência de quartos. O frontend deve exibir essa informação com transparência.

### `agent_feature_flags`

Registro esperado da Ju:

```text
tenant_id = 82cc7aa9-fc6e-4f37-8d8e-8a71c1691361
agent_name = jurema
tts_enabled = false
stt_enabled = false
translation_enabled = false
voice_reply_mode = off
```

### `agent_metrics_events`

Eventos já implementados:

```text
message_received
stage_changed
property_options_requested
property_search_failed
handoff_requested
```

O campo `project_id` é usado como `deal_id`.

## Campos mínimos de perfil da Ju

```text
intent
property_type
location_preference
budget_max
bedrooms
timeline
```

Enquanto faltar qualquer um, a Ju não deve mostrar catálogo.

## Lead scoring da Ju

```text
+20 intenção clara
+15 região definida
+15 orçamento definido
+15 tipo de imóvel definido
+10 quartos definido
+10 prazo curto/médio
+10 forma de pagamento/financiamento/entrada
+5 decisor identificado
```

Classificação:

```text
0 = incompleto
1–39 = frio
40–69 = morno
70–100 = quente
```

## Fluxos validados da Ju

### Saudação fria

```json
{
  "message": "Oi, estou procurando um imóvel",
  "phone": "5585988811140",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361"
}
```

Resultado esperado:

```text
deal_stage = qualificacao
qualification_status = incompleto
lead_score = 0
imoveis_count = 0
```

### Qualificação de compra

```json
{
  "message": "Quero comprar um apartamento no Bessa com 3 quartos até 700 mil",
  "phone": "5585988811120",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "source": "site",
  "entrypoint": "property_search"
}
```

Resultado:

```text
intent = comprar
property_type = apartamento
location_preference = Bessa
budget_max = 700000
bedrooms = 3
missing_fields = timeline
lead_score = 75
qualification_status = quente
deal_stage = perfil_busca
```

### Completar prazo e financiamento

```json
{
  "message": "Quero avançar nos próximos 60 dias e pretendo financiar.",
  "phone": "5585988811120",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "source": "site",
  "entrypoint": "property_search"
}
```

Resultado:

```text
timeline = 60 dias
payment_method = financiamento
missing_fields = []
lead_score = 95
qualification_status = quente
deal_stage = corretor
```

### Pedir opções

```json
{
  "message": "Pode separar algumas opções pra mim.",
  "phone": "5585988811120",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "source": "site",
  "entrypoint": "property_search"
}
```

Resultado validado:

```text
imoveis_count = 1
property_id = JP009 salvo em jurema_property_matches
```

Resposta validada:

```text
Separei algumas opções que podem fazer sentido com o seu perfil:

1. APARTAMENTO PARA VENDA NO BESSA
Apartamento — Bessa — R$ 525.000,00 — 2 quarto(s) — 59 m²
https://juremabksimoveis.com.br/imoveis/apartamento-para-venda-no-bessa/

Alguma delas chamou sua atenção ou você quer que eu ajuste a busca?
```

### Handoff corretor

```json
{
  "message": "Quero falar com um corretor.",
  "phone": "5585988811120",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "source": "site",
  "entrypoint": "property_search"
}
```

Resultado:

```text
deal_stage = corretor
broker_status = aguardando_corretor
event_type = handoff_requested
```

Resposta:

```text
Perfeito. Vou te encaminhar para um corretor da Jurema Brokers com seu perfil já organizado, assim o atendimento fica mais direto e assertivo.
```

## Client TypeScript sugerido para Ju

```ts
export type JuremaRequest = {
  message: string;
  phone: string;
  tenant_id?: string;
  source?: string;
  entrypoint?: string;
  property_id?: string;
  id_imovel?: string;
  intent?: string;
  context?: Record<string, unknown>;
};

export type JuremaResponse = {
  mode: "reply" | string;
  messages: string[];
  metadata: {
    agent?: "jurema" | string;
    lead_id?: string;
    deal_id?: string;
    deal_stage?: string;
    qualification_status?: string;
    lead_score?: number;
    missing_fields?: string[];
    imoveis_count?: number;
    feature_flags?: Record<string, unknown>;
    [key: string]: unknown;
  };
};

const API_URL = process.env.NEXT_PUBLIC_YZI_API_URL;
const JUREMA_TENANT_ID = process.env.NEXT_PUBLIC_JUREMA_TENANT_ID;

export async function sendMessageToJurema(
  payload: JuremaRequest
): Promise<JuremaResponse> {
  if (!API_URL) throw new Error("NEXT_PUBLIC_YZI_API_URL não configurada");
  if (!payload.tenant_id && !JUREMA_TENANT_ID) {
    throw new Error("NEXT_PUBLIC_JUREMA_TENANT_ID não configurada");
  }

  const response = await fetch(`${API_URL}/agent/jurema`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      tenant_id: payload.tenant_id || JUREMA_TENANT_ID,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Erro ao chamar Ju: ${response.status} ${errorText}`);
  }

  return response.json();
}
```

---

# 6. Telas recomendadas para o frontend

## Ordem GSD recomendada

```text
1. Diagnóstico do projeto atual
2. Client/API da Ju e da Nina
3. Tela interna de teste da Ju
4. Kanban da Jurema
5. Detalhe do deal da Jurema
6. Tela de imóveis
7. Tela de matches
8. Parar antes de contratos
```

## Tela interna de teste da Ju

Rota sugerida:

```text
/admin/jurema/teste
```

A tela deve ter:

- input de telefone;
- textarea de mensagem;
- campo `source` opcional;
- campo `entrypoint` opcional;
- campo `property_id` opcional;
- botão “Enviar para Ju”;
- área mostrando `messages`;
- área mostrando `metadata` formatada;
- loading;
- erro.

Use `sendMessageToJurema`.

Não implementar regra de funil no front.

## Kanban da Jurema

Ler `jurema_deals` agrupados por `deal_stage`.

Colunas:

```text
qualificacao
perfil_busca
curadoria
corretor
visita
proposta
fechamento
nutricao
perdido
```

Cada card deve mostrar:

```text
client_name ou client_phone
lead_score
qualification_status
intent
property_type
location_preference
budget_max
bedrooms
broker_status
```

Inicialmente somente leitura.

Não permitir arrastar card.

Não permitir mudar stage manualmente.

## Detalhe do deal

Mostrar:

- dados principais do deal;
- dados do lead relacionado;
- `lead_score`;
- `qualification_status`;
- `deal_stage`;
- `broker_status`;
- campos coletados;
- `missing_fields` vindo de `metadata`;
- matches enviados de `jurema_property_matches`;
- eventos recentes de `agent_metrics_events` onde:
  - `agent_name = jurema`
  - `project_id = deal_id`.

Somente leitura inicialmente.

## Tela de imóveis

Ler tabela `imoveis` filtrando:

```text
tenant_id = NEXT_PUBLIC_JUREMA_TENANT_ID
```

Mostrar:

```text
imagem_card ou foto_principal
titulo_comercial
tipo_de_imovel
finalidade
bairro
quartos
metragem
valor
status_operacional
status_publicacao
link_do_imovel
```

## Tela de matches

Ler `jurema_property_matches`.

Mostrar:

```text
deal_id
property_id
match_score
status
match_reason
metadata
created_at
```

---

# 7. Contratos

Não implementar contratos ainda.

A área de contratos depende de revisão de backend.

Antes de qualquer tela de contratos, validar:

```text
1. existe tabela de contratos?
2. contrato é para venda, locação ou ambos?
3. quem gera o contrato: backend, n8n, Google Docs, Clicksign, ZapSign ou outro?
4. qual status do contrato?
5. contrato pertence a deal, lead, imóvel ou proposta?
6. precisa de assinatura digital?
7. precisa salvar PDF/link?
8. qual é o schema final?
9. qual é a relação com jurema_deals?
10. qual é a relação com imoveis?
```

Regra:

> O Claude Code não deve inventar fluxo de contratos. Parar antes de contratos e pedir validação técnica.

---

# 8. Prompts GSD para Claude Code

## Etapa 1 — Diagnóstico inicial

```text
GSD — Etapa 1: Diagnóstico inicial

Leia o arquivo CLAUDE.md inteiro antes de qualquer coisa.

Não altere nenhum arquivo nesta etapa.

Depois de ler, me responda apenas com:

1. O que você entendeu sobre Nina/Café com Pam.
2. O que você entendeu sobre Ju/Jurema Brokers.
3. Quais rotas/páginas já existem no frontend.
4. Quais componentes parecem relacionados a dashboard, leads, imóveis, CRM ou agentes.
5. Quais arquivos fazem chamadas para API, Supabase, n8n ou backend.
6. Quais variáveis de ambiente existem e quais faltam.
7. Onde você sugere conectar a Ju/Jurema.
8. Quais arquivos você recomenda alterar nas próximas etapas.

Regras:
- Não implemente nada.
- Não crie arquivos.
- Não altere código.
- Não mexa em contratos.
- Não duplique regra de negócio da Nina nem da Ju no frontend.
```

## Etapa 2 — Client da Ju

```text
GSD — Etapa 2: Client da Ju

Com base no CLAUDE.md e no diagnóstico anterior, implemente apenas a conexão com o backend da Ju.

Objetivo:
Criar ou ajustar um client para chamar:

POST https://yzi-os.yzihub.com/agent/jurema

Tarefas:
1. Criar ou ajustar o arquivo de API client seguindo o padrão do projeto.
2. Criar tipos TypeScript para JuremaRequest e JuremaResponse.
3. Criar função sendMessageToJurema.
4. Usar NEXT_PUBLIC_YZI_API_URL.
5. Usar NEXT_PUBLIC_JUREMA_TENANT_ID.
6. Garantir tratamento de erro conforme o padrão do projeto.

Regras:
- Não criar tela ainda.
- Não alterar dashboard ainda.
- Não mexer em contratos.
- Não usar service_role.
- Não calcular lead_score no front.
- Não calcular deal_stage no front.
- Não calcular missing_fields no front.
- O backend é a fonte da verdade.

Antes de alterar, liste os arquivos que você vai editar.
Depois implemente.
Ao final, mostre o diff/resumo das alterações.
```

## Etapa 3 — Tela interna de teste da Ju

```text
GSD — Etapa 3: Tela interna de teste da Ju

Use o client criado na etapa anterior.

Objetivo:
Criar uma tela simples para testar a Ju pelo frontend.

A tela deve ter:
1. Campo telefone.
2. Campo mensagem.
3. Campo source opcional.
4. Campo entrypoint opcional.
5. Campo property_id opcional.
6. Botão Enviar.
7. Área de resposta com messages.
8. Área de metadata formatada.
9. Estados de loading e erro.

Payload padrão:
tenant_id deve vir de NEXT_PUBLIC_JUREMA_TENANT_ID.

Regras:
- Não implementar Kanban ainda.
- Não implementar contratos.
- Não chamar n8n direto.
- Não usar service_role.
- Não duplicar lógica da Ju no front.
- Não mostrar catálogo por regra do front; apenas exibir o que o backend responder.

Antes de alterar, liste os arquivos.
Depois implemente.
Ao final, informe como testar a tela.
```

## Etapa 4 — Kanban da Jurema

```text
GSD — Etapa 4: Kanban da Jurema

Objetivo:
Criar uma tela de Kanban somente leitura para jurema_deals.

Antes de implementar, verifique no projeto como Supabase é usado no frontend.

A tela deve agrupar deals por deal_stage:
- qualificacao
- perfil_busca
- curadoria
- corretor
- visita
- proposta
- fechamento
- nutricao
- perdido

Cada card deve mostrar:
- client_name ou client_phone
- lead_score
- qualification_status
- intent
- property_type
- location_preference
- budget_max
- bedrooms
- broker_status

Regras:
- Somente leitura.
- Não permitir arrastar card.
- Não permitir mudar stage manualmente.
- Não calcular score no front.
- Não chamar n8n.
- Não mexer em contratos.

Antes de alterar, liste os arquivos.
Depois implemente.
Ao final, explique como testar.
```

## Etapa 5 — Detalhe do Deal da Jurema

```text
GSD — Etapa 5: Detalhe do Deal da Jurema

Objetivo:
Criar a tela de detalhe de um jurema_deal.

Ela deve mostrar:
1. Dados principais do deal.
2. Dados do lead relacionado, se o padrão atual permitir join ou segunda consulta.
3. lead_score.
4. qualification_status.
5. deal_stage.
6. broker_status.
7. campos coletados.
8. missing_fields vindo de metadata.
9. matches enviados de jurema_property_matches.
10. eventos recentes de agent_metrics_events onde agent_name = jurema e project_id = deal_id.

Regras:
- Somente leitura.
- Não alterar stage.
- Não mexer em contratos.
- Não criar proposta.
- Não criar visita ainda.
- Não duplicar regra do backend.

Antes de alterar, liste os arquivos.
Depois implemente.
Ao final, explique como acessar a tela.
```

## Etapa 6 — Tela de imóveis e matches

```text
GSD — Etapa 6: Tela de imóveis e matches

Objetivo:
Criar ou ajustar telas para visualizar imóveis da Jurema e matches enviados.

Parte A — Imóveis:
Ler tabela imoveis filtrando tenant_id = NEXT_PUBLIC_JUREMA_TENANT_ID.
Mostrar:
- imagem_card ou foto_principal
- titulo_comercial
- tipo_de_imovel
- finalidade
- bairro
- quartos
- metragem
- valor
- status_operacional
- status_publicacao
- link_do_imovel

Parte B — Matches:
Ler jurema_property_matches.
Mostrar:
- deal_id
- property_id
- match_score
- status
- match_reason
- metadata
- created_at

Regras:
- Somente leitura.
- Não implementar edição de imóvel.
- Não implementar contrato.
- Não implementar proposta.
- Não chamar n8n.
- Não usar service_role.

Antes de alterar, liste os arquivos.
Depois implemente.
Ao final, explique como testar.
```

## Etapa 7 — Parada técnica

```text
GSD — Etapa 7: Parada técnica

Pare aqui.

Não implemente contratos ainda.

Antes de qualquer tela ou fluxo de contratos, precisamos revisar o backend com o responsável técnico.

Liste apenas:
1. O que foi implementado até agora.
2. Quais arquivos foram alterados.
3. Quais telas existem.
4. Quais pendências técnicas ficaram.
5. Quais dúvidas existem para contratos.

Não altere código nesta etapa.
```

---

# 9. Regras finais para Claude Code

Sempre seguir:

```text
1. Ler CLAUDE.md antes de alterar.
2. Trabalhar em etapas pequenas.
3. Listar arquivos antes de editar.
4. Não mexer em contratos sem validação.
5. Não usar service_role no frontend.
6. Não duplicar regra de negócio no frontend.
7. Não calcular estado, score ou missing_fields no frontend.
8. Não chamar n8n direto para ações sensíveis.
9. O backend Agno/YZI OS é a fonte da verdade.
10. Ao final de cada etapa, informar o que mudou e como testar.
```
