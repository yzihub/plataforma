# YZIHUB: AI First OS (Growth Engine)
> Arquitetura Multi-tenant para Automação Comercial de Alto Ticket.

## 🏗️ Visão & Interfaces
- **YZI CONTROL:** Gestão global Eric (Admin).
- **YZI COCKPIT:** Dashboard do Cliente (Growth & ROI).
- **YZI FACTORY:** Provisionamento automático via n8n (Setup em 1-5 dias).

## 🛠️ Stack Técnica (DNA YZI)
- **Frontend:** Next.js 15 + TS + Tailwind v4 + TailAdmin (Base).
- **UI de Impacto:** React Bits em `src/components/yzihub/`.
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

## 🧠 Brain Integration (Obsidian)
- Documentação e briefings em `D:\dev\YZI-OS-Docs`.
- Sempre validar contexto de cliente antes de novas features.

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