# Requirements: YZIHUB YZI-OS Growth Engine

**Defined:** 2026-03-31
**Core Value:** Um cliente fecha contrato, recebe acesso ao Cockpit em 24h, e o agente de IA já está qualificando leads no WhatsApp — sem intervenção manual de infra.

## v1 Requirements

### Access Provisioning

- [ ] **PROV-01**: Admin pode inserir perfil de novo tenant na tabela `profiles` com tenant_id vinculado
- [ ] **PROV-02**: juremabrokers@gmail.com tem acesso ao Cockpit com tenant_id correto (Jurema Brokers)
- [ ] **PROV-03**: contatocafecompam@gmail.com tem acesso ao Cockpit com tenant_id correto (Café com Pam)
- [ ] **PROV-04**: Usuário sem e-mail em `profiles` é redirecionado para `/unauthorized`

### Auth & Routing

- [ ] **AUTH-01**: proxy.ts lê tenant_id do perfil logado ao proteger rotas `/dashboard` e `/cockpit`
- [ ] **AUTH-02**: Usuário só enxerga dados do seu próprio tenant (isolamento por tenant_id)
- [ ] **AUTH-03**: Admin (Eric) tem acesso ao `/control` sem restrição de tenant
- [ ] **AUTH-04**: Sessão persiste entre refreshes de browser

### Cockpit — Leads

- [ ] **LEAD-01**: LeadsDataTable exibe leads do tenant logado via Supabase real
- [ ] **LEAD-02**: Tabela tem busca, filtros por stage e ordenação
- [ ] **LEAD-03**: Drawer lateral abre com detalhes completos do lead ao clicar na linha
- [ ] **LEAD-04**: CommandButtons (QUALIFICAR, IA ASSUMIR, etc.) disparam action flow

### Cockpit — Pipeline

- [ ] **PIPE-01**: Kanban exibe colunas do pipeline específico do tenant logado
- [ ] **PIPE-02**: Café com Pam vê stages: Lead→Agendado→Atendimento→Pago→Concluído
- [ ] **PIPE-03**: Jurema Brokers vê stages: Lead→Agendado→Visita→Proposta→Contrato→Fechado
- [ ] **PIPE-04**: Drag & drop entre colunas atualiza stage no Supabase
- [ ] **PIPE-05**: CommandButtons contextuais por stage disparam action flow

### Cockpit — Imóveis (Jurema Brokers)

- [ ] **IMOV-01**: Página `/cockpit/imoveis` renderiza data table de listings de imóveis
- [ ] **IMOV-02**: Drawer lateral com detalhes do imóvel (endereço, valor, status)
- [ ] **IMOV-03**: Módulo visível apenas para tenants com feature_flag `imoveis` ativo
- [ ] **IMOV-04**: Segue Lei da Variedade Visual: Data Table + Drawer (não Kanban, não charts)

### Cockpit — Financeiro

- [ ] **FIN-01**: Página `/cockpit/financeiro` renderiza tabela de transações do tenant
- [ ] **FIN-02**: KPI cards no topo: faturamento total, ticket médio, conversão
- [ ] **FIN-03**: Filtro por período (semana, mês, custom)
- [ ] **FIN-04**: Segue Lei da Variedade Visual: Tabela de transações + KPI cards

### Action Flow

- [ ] **ACT-01**: POST `/api/actions/execute` recebe payload `{tenant_id, action, lead_id}`
- [ ] **ACT-02**: API endpoint insere job na tabela `job_queue` do Supabase
- [ ] **ACT-03**: Webhook n8n é disparado ao novo job na `job_queue`
- [ ] **ACT-04**: n8n processa ação e atualiza status do lead/pipeline via Supabase

### YZI FACTORY

- [ ] **FACT-01**: Botão "Ativar Projeto" no YZI CONTROL dispara webhook n8n de provisionamento
- [ ] **FACT-02**: n8n cria instância Evolution API e vincula ao tenant_id
- [ ] **FACT-03**: Agente IA (Nina/Luana) fica ativo no WhatsApp Business Cloud após provisionamento
- [ ] **FACT-04**: Admin vê status de provisionamento em tempo real no YZI CONTROL

### Deploy & Infra

- [ ] **DEPL-01**: Deploy Vercel estável com todas env vars corretas para produção
- [ ] **DEPL-02**: Migrations Supabase rodadas em produção (004 Café com Pam + 005 Jurema Brokers)
- [ ] **DEPL-03**: Supabase RLS policies validadas para isolamento por tenant_id

## v2 Requirements

### Notificações

- **NOTF-01**: Tenant recebe notificação in-app quando novo lead chega
- **NOTF-02**: Tenant recebe e-mail de resumo diário de leads
- **NOTF-03**: Admin recebe alerta quando provisionamento falha

### Analytics Avançado

- **ANLX-01**: Funil de conversão visual por período
- **ANLX-02**: Comparativo de performance entre períodos
- **ANLX-03**: Export de relatório em CSV/PDF

### Multi-Agente

- **AGNT-01**: Tenant pode configurar personalidade do agente via UI
- **AGNT-02**: Tenant pode adicionar base de conhecimento ao agente
- **AGNT-03**: Histórico de conversas do agente visualizável no Cockpit

## Out of Scope

| Feature | Reason |
|---------|--------|
| Billing/pagamento integrado | Eric gerencia cobranças fora da plataforma — fora do MVP |
| Multi-idioma (i18n) | Todos os tenants são BR por ora |
| App mobile nativo | PWA suficiente no MVP |
| OAuth login (Google, GitHub) | Email/password via Supabase suficiente para v1 |
| 2FA | Complexidade não justificada no MVP |
| Módulo de relatórios avançados | Analytics do Dashboard são suficientes para v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROV-01 | Phase 1 | Pending |
| PROV-02 | Phase 1 | Pending |
| PROV-03 | Phase 1 | Pending |
| PROV-04 | Phase 1 | Pending |
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| LEAD-01 | Phase 2 | Pending |
| LEAD-02 | Phase 2 | Pending |
| LEAD-03 | Phase 2 | Pending |
| LEAD-04 | Phase 2 | Pending |
| PIPE-01 | Phase 2 | Pending |
| PIPE-02 | Phase 2 | Pending |
| PIPE-03 | Phase 2 | Pending |
| PIPE-04 | Phase 2 | Pending |
| PIPE-05 | Phase 2 | Pending |
| IMOV-01 | Phase 3 | Pending |
| IMOV-02 | Phase 3 | Pending |
| IMOV-03 | Phase 3 | Pending |
| IMOV-04 | Phase 3 | Pending |
| FIN-01 | Phase 3 | Pending |
| FIN-02 | Phase 3 | Pending |
| FIN-03 | Phase 3 | Pending |
| FIN-04 | Phase 3 | Pending |
| ACT-01 | Phase 4 | Pending |
| ACT-02 | Phase 4 | Pending |
| ACT-03 | Phase 4 | Pending |
| ACT-04 | Phase 4 | Pending |
| FACT-01 | Phase 5 | Pending |
| FACT-02 | Phase 5 | Pending |
| FACT-03 | Phase 5 | Pending |
| FACT-04 | Phase 5 | Pending |
| DEPL-01 | Phase 6 | Pending |
| DEPL-02 | Phase 6 | Pending |
| DEPL-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 36 total
- Mapped to phases: 36
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after initial definition*
