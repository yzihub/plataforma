# YZIHUB Plataforma — Documentação de Estado
> Atualizado em: 2026-03-31

---

## Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js | ^16.1.6 |
| UI Runtime | React | ^19.2.0 |
| Linguagem | TypeScript | ^5.9.3 |
| Estilização | Tailwind CSS | ^4.1.17 |
| Componentes base | TailAdmin (free) | 2.2.3 |
| Auth + DB | Supabase (`@supabase/ssr` + `@supabase/supabase-js`) | 0.9.0 / 2.100.1 |
| Animações | Framer Motion | ^12.38.0 |
| Gráficos | ApexCharts + react-apexcharts | 4.7.0 / 1.8.0 |
| Drag & Drop | react-dnd + react-dnd-html5-backend | ^16.0.1 |
| Calendário | FullCalendar (daygrid, timegrid, list) | ^6.1.19 |
| Engine de automação | n8n + Evolution API | (externo) |
| WhatsApp | Evolution API via WhatsApp Business Cloud | (externo) |

---

## Interfaces

### YZI CONTROL (`/control`)
Painel exclusivo do admin global (Eric). Visão de todos os tenants, projetos, job_queue em tempo real e action_logs. Acesso protegido por role `admin` no middleware.

### YZI COCKPIT (`/cockpit` e rotas dentro de `/(admin)`)
Dashboard do cliente (tenant). Contém Dashboard KPIs, Pipeline Kanban, CRM Grid, Leads Table e AI Agent. Cada rota é filtrada por `tenant_id` via `TenantContext`.

### YZI FACTORY
Não é uma interface de página — é o fluxo de provisionamento automático disparado pelo botão **Ativar Projeto** em `/control/tenants`. Executa via `job_queue` → webhook n8n.

---

## Estrutura de Pastas Principais

```
src/
├── app/
│   ├── (admin)/                  # Layout com sidebar + TenantProvider
│   │   ├── layout.tsx            # TenantProvider + AppSidebar + AppHeader
│   │   ├── page.tsx              # Redirect ou dashboard TailAdmin base
│   │   ├── (others-pages)/       # Páginas auxiliares TailAdmin (calendar, profile, charts, forms, tables)
│   │   └── (ui-elements)/        # Componentes UI demo (alerts, avatars, badge, buttons…)
│   ├── (full-width-pages)/
│   │   ├── (auth)/               # signin, signup, reset-password
│   │   └── (error-pages)/        # error-404
│   ├── cockpit/                  # YZI COCKPIT — painel do cliente
│   │   ├── page.tsx              # Dashboard KPIs + gráficos
│   │   ├── pipeline/page.tsx     # Kanban Board YZIHUB
│   │   ├── crm/page.tsx          # CRM Grid (tabela + kanban)
│   │   ├── leads/page.tsx        # Leads Table
│   │   └── ai-agent/page.tsx     # Chat UI com agente SDR
│   ├── control/                  # YZI CONTROL — admin global
│   │   ├── page.tsx              # Dashboard global (ControlDashboard)
│   │   └── tenants/page.tsx      # Tabela de tenants + modal Novo Tenant
│   ├── api/
│   │   └── actions/execute/      # POST → enfileira job_queue → n8n
│   └── unauthorized/page.tsx     # Redirect de acesso negado
├── components/
│   ├── yzihub/                   # Componentes YZIHUB (ver seção abaixo)
│   └── ui/                       # TailAdmin: badge, table, modal, button…
├── context/
│   ├── SidebarContext.tsx
│   └── TenantContext.tsx         # Provê tenant ativo para o cockpit
├── hooks/
│   └── useTenant.ts              # Consume TenantContext
├── layout/
│   ├── AppHeader.tsx
│   ├── AppSidebar.tsx            # Sidebar COCKPIT com module-gate por item
│   ├── ControlSidebar.tsx        # Sidebar CONTROL
│   ├── Backdrop.tsx
│   └── SidebarWidget.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # createBrowserClient
│   │   ├── server.ts             # createServerClient (cookies)
│   │   └── admin.ts              # createAdminClient (service_role)
│   ├── control/
│   │   ├── types.ts              # ControlTenant, ControlProject, Job, ActionLog…
│   │   ├── queries.ts            # getControlDashboard() — busca Supabase
│   │   ├── tenant-actions.ts     # Server Actions: createTenant, updateTenantBrain, enqueueFactoryActivate
│   │   └── mock-data.ts          # Mock para dev sem Supabase
│   ├── crm/
│   │   ├── types.ts              # Lead, LeadStatus, PipelineStage
│   │   ├── queries.ts
│   │   └── mock-data.ts          # cafePamData + juremaData
│   └── auth/
│       └── actions.ts            # signIn, signUp, signOut (Server Actions)
├── proxy.ts                      # Lógica de middleware (auth + role guard)
└── types/                        # Tipos globais adicionais
```

---

## Páginas Implementadas

| Rota | Arquivo | Status | Dados |
|------|---------|--------|-------|
| `/cockpit` | `cockpit/page.tsx` | ✅ Funcional | Mock (substituir por Supabase) |
| `/cockpit/pipeline` | `cockpit/pipeline/page.tsx` | ✅ Funcional | Mock `cafePamData` |
| `/cockpit/crm` | `cockpit/crm/page.tsx` | ✅ Funcional | Mock `cafePamData` |
| `/cockpit/leads` | `cockpit/leads/page.tsx` | ✅ Funcional | Mock |
| `/cockpit/ai-agent` | `cockpit/ai-agent/page.tsx` | ✅ Funcional (simulado) | Mock + module gate |
| `/control` | `control/page.tsx` | ✅ Funcional | Supabase (fallback mock) |
| `/control/tenants` | `control/tenants/page.tsx` | ✅ Funcional | Supabase real |
| `/signin` | `(auth)/signin/page.tsx` | ✅ TailAdmin base | Supabase Auth |
| `/signup` | `(auth)/signup/page.tsx` | ✅ TailAdmin base | Supabase Auth |
| `/reset-password` | `(auth)/reset-password/page.tsx` | ✅ TailAdmin base | Supabase Auth |
| `/unauthorized` | `unauthorized/page.tsx` | ✅ Funcional | — |
| `/error-404` | `(error-pages)/error-404/page.tsx` | ✅ TailAdmin base | — |

### Páginas TailAdmin (herdadas, não YZIHUB)
`/calendar`, `/profile`, `/bar-chart`, `/line-chart`, `/form-elements`, `/basic-tables`, `/blank`, `/alerts`, `/avatars`, `/badge`, `/buttons`, `/images`, `/modals`, `/videos`

---

## Componentes em `src/components/yzihub/`

| Arquivo | Descrição |
|---------|-----------|
| `CommandButton.tsx` | Botão de ação CRM (contact, schedule, send_proposal, close, lose). Dispara `POST /api/actions/execute` → `job_queue`. Estados: idle / loading / success / error. |
| `TenantsTable.tsx` | Tabela de tenants para CONTROL. Modal Novo Tenant, modal Brain (system_prompt + knowledge_rag_xml), botão Ativar Projeto. |
| `ActivateProjectModal.tsx` | Modal de confirmação para `enqueueFactoryActivate`. |
| `ControlDashboard.tsx` | Dashboard global admin: stats cards, job feed, action logs, lista de tenants. |
| `JobQueueFeed.tsx` | Feed em tempo real dos jobs da fila (status badges, retry info). |
| `ActionLogTable.tsx` | Tabela de logs de ação com canal (web/whatsapp/n8n/system). |
| `TenantCard.tsx` | Card de tenant para listagem no CONTROL. |
| `KanbanBoard.tsx` | Board Kanban YZIHUB (6 colunas). Usado em `/cockpit/pipeline`. |
| `KanbanColumn.tsx` | Coluna individual do Kanban com header, progress bar e drop zone. |
| `LeadCard.tsx` | Card arrastável de lead: avatar, nome, origem, score bar, CommandButtons, tempo no stage. |
| `LeadDrawer.tsx` | Drawer lateral de detalhe do lead. Abre ao clicar em LeadCard. |
| `LeadsView.tsx` | Tabela de leads com filtros (usado em `/cockpit/leads`). |
| `ConsultoriasView.tsx` | View de consultorias/serviços (cockpit). |

---

## Schema Supabase (Tabelas)

> Inferido do código. Migrations não verificadas — confirmar no Supabase Dashboard.

### `tenants`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid | PK |
| name | text | Nome do cliente |
| slug | text | Único, `[a-z0-9-]+` |
| plan | text | `starter` \| `growth` \| `enterprise` |
| status | text | `active` \| `inactive` \| `suspended` |
| system_prompt | text | Prompt do agente IA (Brain) |
| knowledge_rag_xml | text | Base de conhecimento XML (Brain) |
| settings | jsonb | Configurações livres (agent_name, primary_color…) |
| created_at | timestamptz | |

### `profiles`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid | FK → auth.users |
| tenant_id | uuid | FK → tenants |
| role | text | `admin` \| `client` |
| email | text | |

### `projects`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants |
| name | text | |
| type | text | `crm` \| `sdr` \| `radar` \| `social` \| `ia_onboarding` |
| status | text | `pending` \| `provisioning` \| `active` \| `error` \| `paused` |
| agent_name | text | Nome do agente IA vinculado |
| agent_phone | text | Número WhatsApp do agente |

### `job_queue`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants |
| lead_id | uuid | nullable |
| action | text | Ex: `factory_activate`, `qualify`, `send_proposal`… |
| status | text | `pending` \| `processing` \| `done` \| `failed` |
| payload | jsonb | Dados para o worker n8n |
| attempts | int | Contagem de retries |
| error | text | Mensagem de erro (nullable) |
| scheduled_at | timestamptz | |
| started_at | timestamptz | nullable |
| finished_at | timestamptz | nullable |
| created_at | timestamptz | |

### `action_logs`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants |
| lead_id | uuid | nullable |
| job_id | uuid | nullable |
| action | text | Ex: `qualify`, `send_proposal`, `ai_takeover`… |
| channel | text | `web` \| `whatsapp` \| `n8n` \| `system` |
| summary | text | Descrição legível do evento |
| created_at | timestamptz | |

---

## Agentes Claude Code (`.claude/agents/`)

| Agente | Model | Descrição |
|--------|-------|-----------|
| `architect.md` | **sonnet** | Arquiteto principal. Lê CLAUDE.md, divide em módulos, aciona @database/@frontend/@automation via Task tool em paralelo. |
| `automation.md` | **sonnet** | Engenheiro de automação. Cria workflows n8n para YZI FACTORY (provisioning) e CRM operacional (ações de lead). Output: JSON de workflow n8n. |
| `frontend.md` | **haiku** | Frontend builder. Cria telas seguindo padrão TailAdmin estrito. Componentes APENAS em `src/components/yzihub/`. |
| `database.md` | **haiku** | Engenheiro de banco. Schemas Supabase, migrations e queries. `tenant_id` obrigatório em todas as tabelas. |

---

## Variáveis de Ambiente (`.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=          # URL do projeto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Chave pública anon
SUPABASE_SERVICE_ROLE_KEY=         # Chave service_role (server-side only)
NEXT_PUBLIC_APP_URL=               # URL base da aplicação
FACTORY_N8N_WEBHOOK_URL=           # Webhook n8n para YZI FACTORY
```

---

## Fluxo YZI FACTORY (Botão "Ativar Projeto")

```
[CONTROL /tenants]
  → Usuário clica "Ativar Projeto" em um tenant
  → ActivateProjectModal confirma
  → enqueueFactoryActivate(tenantId) [Server Action]
      → Busca system_prompt + knowledge_rag_xml do tenant
      → INSERT job_queue { action: "factory_activate", status: "pending", payload: { system_prompt, knowledge_rag_xml } }
      → revalidatePath("/control/tenants")
  → n8n worker (FACTORY_N8N_WEBHOOK_URL) consome job
      → crm_setup → cria tenant, pipeline, campos
      → sdr_setup → conecta WhatsApp, vincula agente IA
      → radar_setup → captação (opcional)
      → social_setup → conteúdo (opcional)
      → ia_onboarding → IA assume onboarding via WhatsApp
  → Job marcado como "done", action_log registrado
```

### Fluxo CommandButton (ações de lead no Cockpit)
```
[COCKPIT /pipeline ou /crm]
  → Usuário clica CommandButton (ex: "ENTRAR EM CONTATO")
  → POST /api/actions/execute { action, lead_id, tenant_id }
  → INSERT job_queue com action correspondente
  → Resposta: { job_id }
  → n8n worker executa (qualify_lead, send_proposal, schedule, close_deal, ia_takeover)
  → action_log registrado com canal e summary
```

---

## Lei de Design — Sem Redundância Visual

Cada interface usa um padrão visual único e diferente:

| Interface | Padrão Visual | Componente principal |
|-----------|--------------|---------------------|
| Dashboard (`/cockpit`) | Gráficos + KPI Cards | ApexCharts (area, bar, donut) |
| Leads (`/cockpit/leads`) | Data Table + Drawer | `LeadsView` + `LeadDrawer` |
| Pipeline (`/cockpit/pipeline`) | Kanban Board + Drag & Drop | `KanbanBoard` (HTML5 DnD nativo) |
| CRM (`/cockpit/crm`) | Grid/Tabela com status inline | `CommandButton` em cada linha |
| AI Agent (`/cockpit/ai-agent`) | Chat Thread UI | `AIAgentChat` (bubble messages) |
| Control Dashboard (`/control`) | Admin stats + job feed | `ControlDashboard` + `JobQueueFeed` |
| Tenants (`/control/tenants`) | Admin Table + Modais | `TenantsTable` |

---

## Clientes Ativos (Mock de Desenvolvimento)

### Café com Pam
- **Slug:** `cafepam` | **Plano:** growth | **Status:** active
- **Projetos:** CRM, SDR, IA Onboarding (todos `active`)
- **Agente:** Nina | **Phone:** +5511999990001
- **Stats mock:** 12 leads, 8 ativos, R$ 340.000 pipeline, 16,7% conversão
- **Criado:** 30 dias atrás

### Jurema Brokers
- **Slug:** `jurema` | **Plano:** growth | **Status:** active
- **Projetos:** CRM, SDR, Radar (todos `active`)
- **Agente:** Luana | **Phone:** +5583999990002
- **Stats mock:** 10 leads, 7 ativos, R$ 2.850.000 pipeline, 10% conversão
- **Criado:** 45 dias atrás

### Nexus Consultoria *(em provisionamento)*
- **Slug:** `nexus` | **Plano:** starter | **Status:** active
- **Projetos:** CRM (`provisioning`)
- **Stats mock:** 3 leads, R$ 45.000 pipeline, 0% conversão
- **Criado:** 5 dias atrás

---

## Próximos Steps

### Crítico (backend real)
- [ ] Conectar `/cockpit` a queries Supabase reais (substituir mocks de leads/pipeline)
- [ ] Implementar `POST /api/actions/execute` completo (hoje só enfileira, falta validação de tenant)
- [ ] Criar migrations Supabase para todas as tabelas (tenants, profiles, projects, job_queue, action_logs)
- [ ] Configurar RLS (Row Level Security) por `tenant_id`

### COCKPIT
- [ ] `/cockpit/leads` — conectar a Supabase (hoje usa mock)
- [ ] `/cockpit/crm` — conectar a Supabase (hoje usa `cafePamData`)
- [ ] `/cockpit/pipeline` — conectar a Supabase (hoje usa `cafePamData`)
- [ ] `/cockpit/ai-agent` — conectar a Evolution API (hoje simulado)

### CONTROL
- [ ] `ControlDashboard` — conectar jobs/logs em tempo real (Supabase Realtime)
- [ ] Filtros e paginação em `/control/tenants`

### Infra
- [ ] Configurar webhook n8n (`FACTORY_N8N_WEBHOOK_URL`) em produção
- [ ] Configurar Evolution API (instância WhatsApp por tenant)
- [ ] Deploy Vercel + variáveis de ambiente de produção
