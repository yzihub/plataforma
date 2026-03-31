# YZIHUB: YZI-OS Growth Engine

## What This Is

YZI-OS é uma plataforma multi-tenant SaaS para automação comercial de alto ticket. Cada tenant recebe um cockpit privado com IA conversacional, CRM visual, pipeline kanban e agente de WhatsApp Business via Evolution API. Eric (admin) gerencia todos os tenants via YZI CONTROL. A plataforma é provisionada automaticamente via n8n em 1-5 dias.

## Core Value

Um cliente fecha contrato, recebe acesso ao Cockpit em 24h, e o agente de IA já está qualificando leads no WhatsApp — sem intervenção manual de infra.

## Requirements

### Validated

- ✓ Kernel YZI-OS funcional (auth + tenant context + sidebar baseada em role/módulos) — existing
- ✓ YZI CONTROL: Página de Tenants com tabela TailAdmin + modal Novo Tenant + botão Ativar Projeto — existing
- ✓ YZI COCKPIT: Dashboard com KPIs + sparklines + charts — existing
- ✓ YZI COCKPIT: Leads — Data Table + Drawer lateral + CommandButtons — existing
- ✓ YZI COCKPIT: Pipeline — Kanban + Drag & Drop + stages por tenant + CommandButtons — existing
- ✓ YZI COCKPIT: AI Agent — page com module gate + chat UI + AgentStatus — existing
- ✓ Migrations Supabase: 004 Café com Pam + 005 Jurema Brokers (pipeline stages) — existing
- ✓ Auth/proxy: proteção de rotas via proxy.ts com role guard — existing

### Active

- [ ] Provisionar acesso real: inserir juremabrokers@gmail.com e contatocafecompam@gmail.com na tabela `profiles` vinculados aos respectivos tenant_id
- [ ] Garantir que proxy.ts lê tenant_id do perfil logado para proteção de /dashboard
- [ ] Cockpit/Leads: conectar componente LeadsDataTable ao Supabase real com dados do tenant logado
- [ ] Cockpit/Pipeline: validar stages por tenant (Café com Pam e Jurema Brokers com pipelines distintos)
- [ ] Cockpit/Financeiro: página estruturada seguindo Lei da Variedade Visual (tabela de transações + KPI cards)
- [ ] Cockpit/Imóveis: página específica para Jurema Brokers (data table de imóveis + drawer de detalhes)
- [ ] YZI FACTORY: webhook n8n para provisionar novo tenant automaticamente ao clicar "Ativar Projeto"
- [ ] Action Flow: POST /api/actions/execute → job_queue Supabase → webhook n8n funcionando end-to-end
- [ ] Deploy Vercel estável com variáveis de ambiente corretas para produção

### Out of Scope

- Billing/pagamento integrado — fora do MVP; Eric gerencia cobranças fora da plataforma
- Multi-idioma (i18n) — todos os tenants são BR por ora
- App mobile nativo — PWA suficiente no MVP
- Módulo de relatórios avançados — Analytics simples no Dashboard são suficientes para v1

## Context

**Stack:** Next.js 15 + TypeScript + Tailwind v4 + TailAdmin (base UI dark). Backend/auth via Supabase. Engine de automação via n8n + Evolution API (WhatsApp Business Cloud).

**Estrutura de interfaces:**
- `/control` — YZI CONTROL (admin Eric, gestão global)
- `/cockpit` — YZI COCKPIT (cliente, growth & ROI)
- `/cockpit/leads`, `/cockpit/pipeline`, `/cockpit/ai-agent`, `/cockpit/crm` — módulos ativos

**Lei da Variedade Visual (regra de ouro):**
- Dashboard = Gráficos/KPIs
- Leads = Data Table + Drawer
- Pipeline = Kanban Board + Drag & Drop
- Chat = UI Thread
- Financeiro = Tabela de transações + KPI cards
- Imóveis = Data Table de listings + Drawer de detalhes

**Clientes ativos:**
- Café com Pam → agente Nina | pipeline: Lead→Agendado→Atendimento→Pago→Concluído
- Jurema Brokers → agente Luana | pipeline: Lead→Agendado→Visita→Proposta→Contrato→Fechado

**Padrão de componentes:** Novos componentes APENAS em `src/components/yzihub/`. Componentes customizados no padrão TailAdmin dark.

**Deploy:** Vercel — último deploy funcional: plataforma-19vciifm2-yzi.vercel.app

## Constraints

- **Tech Stack**: Next.js 15 + Supabase + Tailwind v4 — não trocar sem decisão explícita
- **Componentes**: Apenas em `src/components/yzihub/` — nunca em `src/components/` raiz
- **Gatekeeper**: `/dashboard` exige e-mail em `profiles` — falha redireciona para `/unauthorized`
- **Action Flow**: Botões de ação → POST /api/actions/execute → job_queue → webhook n8n (nunca chamar n8n diretamente do frontend)
- **Tokens**: Subagentes de exploração usam haiku; sonnet apenas para arquitetura e automação

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| proxy.ts ao invés de middleware.ts | Next.js 16 usa proxy.ts como ponto de middleware | ✓ Good |
| TailAdmin dark como base UI | Evita construir design system do zero, mantém consistência | ✓ Good |
| Supabase como fonte única de verdade | Simplifica auth multi-tenant + RLS por tenant_id | — Pending |
| n8n como engine de automação | Baixo código, visualmente debugável, flexível por tenant | — Pending |
| Lei da Variedade Visual | Cada página tem padrão UI distinto — evita redundância e melhora UX | ✓ Good |

## Evolution

Este documento evolui a cada transição de fase e milestone.

**Após cada fase** (via `/gsd:transition`):
1. Requirements invalidados? → Mover para Out of Scope com razão
2. Requirements validados? → Mover para Validated com referência de fase
3. Novos requirements emergiram? → Adicionar em Active
4. Decisões a registrar? → Adicionar em Key Decisions
5. "What This Is" ainda preciso? → Atualizar se drifted

**Após cada milestone** (via `/gsd:complete-milestone`):
1. Revisão completa de todas as seções
2. Core Value check — ainda a prioridade certa?
3. Auditoria de Out of Scope — razões ainda válidas?
4. Atualizar Context com estado atual

---
*Last updated: 2026-03-31 after initialization*
