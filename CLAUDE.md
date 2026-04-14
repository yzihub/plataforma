# YZIHUB: AI First OS (Growth Engine)
> Arquitetura Multi-tenant para Automação Comercial de Alto Ticket.

## 🏗️ Visão & Interfaces
- **YZI CONTROL:** Gestão global Eric (Admin).
- **YZI COCKPIT:** Dashboard do Cliente (Growth & ROI).
- **YZI FACTORY:** Provisionamento automático via n8n (Setup em 1-5 dias).

## 🛠️ Stack Técnica (DNA YZI)
- **Frontend:** Next.js 15 + TS + Tailwind v4 + TailAdmin (Base).
- **UI de Impacto:** Componentes customizados no padrão TailAdmin dark em `src/components/yzihub/`.
- **Backend/Auth:** Supabase (Fonte única de verdade).
- **Engine:** n8n + Evolution API (WhatsApp Business Cloud).

## 🛡️ Regras de Ouro (Porteiro & Estrutura)
1. **Gatekeeper:** Acesso ao `/dashboard` exige e-mail na tabela `profiles`. Falha = Redirect `/unauthorized`.
2. **Lei da Variedade Visual (Sem Redundância):**
   - Dashboard = Gráficos/KPIs.
   - Leads = Data Table + Drawer.
   - Pipeline = Kanban Board + Drag & Drop.
   - Chat = UI Thread.
3. **Padrão de Pasta:** Novos componentes APENAS em `src/components/yzihub/`.
4. **Action Flow:** Botões (`QUALIFICAR`, `IA ASSUMIR`, etc) disparam `POST /api/actions/execute` -> `job_queue` no Supabase -> Webhook n8n.

## 👥 Clientes Ativos
- **Café com Pam** → agente Nina | pipeline: Lead→Agendado→Atendimento→Pago→Concluído
- **Jurema Brokers** → agente Luana | pipeline: Lead→Agendado→Visita→Proposta→Contrato→Fechado

## 🚀 Metodologia CLI
1. Ler este CLAUDE.md.
2. Validar tenant_id e feature_flags.
3. Step -> Executar -> Validar -> Commit.

## ⚡ Otimização de Tokens e Contexto
- Usar /compact quando contexto passar de 50%
- Subagentes de exploração usar model: haiku
- Sonnet apenas para architect e automation
- Nunca varrer projeto inteiro — ler apenas arquivos necessários
- Sempre use context7 para documentação: Next.js, Supabase, Tailwind, n8n, React
- Exemplo: "Como configurar middleware Next.js? use context7"
- Sempre prefixar comandos CLI com `rtk` para comprimir output (RTK v0.36.0+ instalado globalmente)
- Comandos críticos YZIHUB com RTK:
  - `rtk git status`, `rtk git diff`, `rtk git log` (git)
  - `rtk next build` (build Next.js)
  - `rtk tsc --noEmit` (type-check)
  - `rtk grep`, `rtk find` (busca em arquivos)
  - `rtk pnpm install`, `rtk pnpm list` (gerenciador de pacotes)
- Config global RTK em `~/.claude/CLAUDE.md` — regras detalhadas lá; aqui apenas reforço de uso

<!-- GSD:project-start source:PROJECT.md -->
## Project

**YZIHUB: YZI-OS Growth Engine**

YZI-OS é uma plataforma multi-tenant SaaS para automação comercial de alto ticket. Cada tenant recebe um cockpit privado com IA conversacional, CRM visual, pipeline kanban e agente de WhatsApp Business via Evolution API. Eric (admin) gerencia todos os tenants via YZI CONTROL. A plataforma é provisionada automaticamente via n8n em 1-5 dias.

**Core Value:** Um cliente fecha contrato, recebe acesso ao Cockpit em 24h, e o agente de IA já está qualificando leads no WhatsApp — sem intervenção manual de infra.

### Constraints

- **Tech Stack**: Next.js 15 + Supabase + Tailwind v4 — não trocar sem decisão explícita
- **Componentes**: Apenas em `src/components/yzihub/` — nunca em `src/components/` raiz
- **Gatekeeper**: `/dashboard` exige e-mail em `profiles` — falha redireciona para `/unauthorized`
- **Action Flow**: Botões de ação → POST /api/actions/execute → job_queue → webhook n8n (nunca chamar n8n diretamente do frontend)
- **Tokens**: Subagentes de exploração usam haiku; sonnet apenas para arquitetura e automação
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

## **Lei do Upsell**: Módulos Pro/Growth devem ser visíveis no Sidebar, mas marcados com cadeado (🔒) ou Badge 'PRO' se o tenant for 'Básico'. Cliques em módulos bloqueados devem disparar o Modal de Upgrade.