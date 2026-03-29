# YZIHUB Plataforma

## Visão
SaaS multi-tenant de automação comercial com IA.
Uma base, múltiplos clientes. Entrega em 1-5 dias via YZI FACTORY.

## Stack
- Next.js 15 + TypeScript + Tailwind CSS v4
- Supabase (auth + DB — fonte única de dados)
- n8n (automações e workflows)
- Evolution API → WhatsApp Business Cloud API
- TailAdmin (base visual)

## Interfaces
- YZI CONTROL → painel Eric (admin global)
- YZI COCKPIT → painel do cliente
- YZI FACTORY → provisioning automático via n8n

## CRM — Painel de Comando Operacional
O CRM não é só visualização. Cada lead tem botões de ação direta:
- [QUALIFICAR] → dispara n8n → agente IA inicia conversa
- [ENVIAR PROPOSTA] → n8n → gera e envia PDF
- [AGENDAR] → n8n → cria evento + WhatsApp
- [FECHAR] → n8n → gera contrato + Stripe
- [IA ASSUMIR] → agente assume o lead via WhatsApp

Fluxo de cada botão:
POST /api/actions/execute
→ { action, lead_id, tenant_id }
→ insere job_queue
→ n8n webhook executa
→ UI atualiza badge do lead

## YZI FACTORY — Módulos de Provisionamento
Acionado pelo botão "ATIVAR PROJETO" no CONTROL:
- crm_setup → cria tenant, pipeline, campos
- sdr_setup → ativa atendimento, conecta WhatsApp, vincula IA
- radar_setup → inicia captação de leads (opcional)
- social_setup → automação de conteúdo (opcional)
- ia_onboarding → IA continua onboarding via WhatsApp (opcional)

## Regras absolutas
- SEMPRE multi-tenant com tenant_id
- NUNCA hardcode de credentials
- NUNCA criar componentes fora do padrão TailAdmin
- Ler src/components/ ANTES de criar qualquer tela
- Novos componentes APENAS em src/components/yzihub/
- Supabase é a ÚNICA fonte de dados
- Um step de cada vez, commit após cada etapa

## Componentes existentes
src/components/
├── auth/
├── calendar/
├── charts/
├── common/
├── ecommerce/
├── form/
├── header/
├── tables/
├── ui/ → alert, avatar, badge, button, dropdown, modal, table, video
├── user-profile/
└── videos/

## Componentes a criar em src/components/yzihub/
Cards, Tabs, List, Kanban, Task, Ribbons,
Notification, Popovers, Tooltips, Progressbar,
Spinners, Pagination, Breadcrumb, ButtonGroup,
Chat, AIAssistant, CommandButton, ActionPanel

## Clientes ativos
- Café com Pam (design de interiores) → agente Nina
- Jurema Brokers (imobiliária, João Pessoa) → agente Luana

## Metodologia
1. Ler contexto e CLAUDE.md
2. Planejar o step
3. Executar
4. Confirmar com Eric
5. Commit
6. Próximo step
