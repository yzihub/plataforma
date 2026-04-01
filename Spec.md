# YZIHUB: SPEC (Technical Specification)

## 1. Stack Tecnológica
- **Frontend:** Next.js 15 (Turbopack) + Tailwind v4 + TailAdmin Dark.
- **Backend/DB:** Supabase (PostgreSQL) + RLS (Row Level Security).
- **Middleware:** `proxy.ts` para proteção de rotas e isolamento de `tenant_id`.
- **Engine:** n8n (Substituindo Airtable por Supabase Nodes).

## 2. Padrões de Arquitetura
- **Database:** Padrão `snake_case` (ex: `client_name`, `property_type`).
- **UI Hierarchy:** CORE (Table, Button) > EXTENSÕES (Form, Charts) > FALLBACK (Drawer, Kanban).
- **Auth:** Google Auth consolidado com redirecionamento via `auth/callback`.

## 3. Schema de Dados Sanitizado
### Tabela: `leads`
- `id` (UUID), `tenant_id` (UUID), `stage_id` (UUID nullable), `name` (TEXT), `email` (TEXT nullable), `phone` (TEXT nullable), `company` (TEXT nullable), `source` (TEXT nullable), `status` (TEXT, enum: new/contacted/qualified/proposal/negotiation/won/lost), `score` (INTEGER, default 0), `value` (NUMERIC 12,2, default 0), `notes` (TEXT nullable), `metadata` (JSONB), `assigned_to` (UUID nullable), `last_action_at` (TIMESTAMPTZ nullable), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
### Tabela: `properties`
- `id`, `property_type`, `price`, `neighborhood`, `tags` (array), `tenant_id`.
### Tabela: `finance`
- `id`, `final_amount`, `financial_alert` (bool), `priority_flag` (bool), `tenant_id`.

## 4. Integração n8n (Action Flow)
- **job_queue:** O Cockpit insere ações (QUALIFY, ASSIGN) na tabela `job_queue`.
- **Webhook:** O Next.js dispara um POST para o n8n notificando a nova tarefa.

## 5. Ambiente de Desenvolvimento
- **Local:** `http://localhost:3001`
- **Prod:** `https://plataforma-19vciifm2-yzi.vercel.app`
- **Env:** `NEXT_PUBLIC_APP_URL` deve refletir o ambiente atual.
