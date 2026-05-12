# Entidades Oficiais

Este documento registra a estrutura oficial do YZI IMOB depois da consolidacao do baseline.
O objetivo e manter a separacao clara entre auth, operacao comercial e dominio do negocio.

## Auth

### `profiles`
Identidade autenticada do usuario no Supabase Auth.

Uso:
- membership de tenant
- permissao interna
- auditoria
- `created_by`, `updated_by` e `triggered_by` quando o ator e um usuario autenticado

Relaciona com:
- `tenants.id`
- `auth.users.id`

## Operacao

### `corretores`
Entidade comercial oficial.

Uso:
- atribuicao de leads
- responsavel por visitas
- responsavel por contratos
- comissao
- dashboard operacional

Regra:
- qualquer FK operacional deve apontar para `corretores.id`

### `imoveis`
Catalogo oficial de imoveis.

Uso:
- oferta comercial
- contrato
- timeline operacional
- financeiro derivado

Regra:
- o status operacional oficial e `disponivel | em_negociacao | vendido`

## Negocio

### `leads`
Entrada comercial do funil.

Relacionamentos relevantes:
- `assigned_to` -> `corretores.id`
- `corretor_id` -> `corretores.id`
- `stage_id` -> `pipeline_stages.id`

### `jurema_deals`
Snapshot operacional do deal da Jurema.

Uso:
- acompanhamento do funil comercial
- score
- qualificacao
- snapshot de operacao

Campos-chave:
- `lead_id`
- `assigned_broker_id`
- `deal_stage`
- `qualification_status`
- `lead_score`

### `contracts`
Snapshot juridico e contrato operacional.

Relacionamentos relevantes:
- `lead_id` -> `leads.id`
- `imovel_id` -> `imoveis.id`
- `project_id` -> `imoveis.id` legado de compatibilidade
- `broker_id` -> `corretores.id`

Campos-chave:
- `type`
- `status`
- `value`
- `commission_percentage`
- `commission_amount`
- `metadata`

### `financeiro`
Livro operacional do negocio.

Uso:
- lancamentos derivados de contratos assinados
- comissao pendente
- movimento de entrada e saida
- base do cockpit financeiro

### `timeline_events`
Memoria operacional persistida.

Uso:
- rastrear eventos do negocio por tenant
- montar timeline unificada do fluxo

### `appointments`
Agenda operacional.

Uso:
- visita
- reuniao
- retorno
- consulta

### `visitas`
Registro operacional especifico de visitas imobiliarias.

### `comissoes`
Snapshot financeiro da comissao do corretor.

### `job_queue`
Fila operacional para automacoes e n8n.

### `action_logs`
Auditoria funcional de acoes do sistema.

## Lifecycles oficiais

### Imoveis
- `disponivel`
- `em_negociacao`
- `vendido`

### Contratos
- `draft`
- `sent`
- `signed`

### Financeiro
- `previsto`
- `confirmado`

## Nomenclatura consolidada

Oficiais:
- `corretores`
- `imoveis`

Legado:
- `brokers`
- `properties`

Regras de consolidacao:
- `brokers` e `properties` nao devem ser tratados como nomes canonicos
- novas migrations devem usar `corretores` e `imoveis`
- `profiles` continua exclusivo para auth e auditoria

## Drift encontrado

- migrations antigas ainda apontam para `brokers` e `properties`
- alguns trechos do frontend e rotas legadas ainda leem nomes antigos
- `project_id` ainda existe em contratos para compatibilidade
- `status_publicacao` ainda tem valores historicos misturados no legado

## Regra de ouro

Depois do baseline:
- nenhuma mudanca manual no banco
- toda alteracao deve virar migration versionada
- qualquer novo relacionamento operacional deve preferir `corretores.id`
- qualquer relacionamento de auth/auditoria deve continuar em `profiles.id`

