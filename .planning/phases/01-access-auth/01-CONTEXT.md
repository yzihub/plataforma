# Phase 1: Access & Auth - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning
**Source:** User-provided context

<domain>
## Phase Boundary

Provisionar acesso real para dois tenants (Jurema Brokers e Café com Pam), garantir que o middleware proxy.ts roteie corretamente após login vinculando email→tenant_id, isolar dados por tenant e bloquear usuários sem perfil em /unauthorized.

</domain>

<decisions>
## Implementation Decisions

### Usuários a provisionar
- Habilitar acesso para: `juremabrokers@gmail.com` (tenant: Jurema Brokers) e `contatocafecompam@gmail.com` (tenant: Café com Pam)
- Inserir registros na tabela `profiles` vinculando email → tenant_id correto para cada usuário

### Auth & Middleware
- O middleware é `proxy.ts` (Next.js 16) — não criar novo middleware, usar o existente
- O redirecionamento pós-login deve enviar o usuário para `/dashboard` (e de lá para `/cockpit`)
- O vínculo email→tenant_id é lido da tabela `profiles` pelo proxy

### DB — Verificação prévia obrigatória
- Verificar se a tabela `tenants` já possui os slugs `jurema-brokers` e `cafe-com-pam` antes de inserir profiles
- Se os slugs não existirem, criar os registros de tenant primeiro, depois os profiles

### Tenant Isolation
- Cada usuário vê apenas os dados do seu próprio tenant_id
- RLS (Row Level Security) no Supabase deve estar ativo para as tabelas relevantes

### Gatekeeper
- Qualquer email não cadastrado em `profiles` deve ser redirecionado para `/unauthorized`
- O proxy.ts é o ponto de aplicação desta regra — verificar se já implementa ou adicionar lógica

### Admin
- Admin (Eric) mantém acesso irrestrito ao `/control` sem restrição de tenant

### Claude's Discretion
- Ordem de execução das verificações no proxy (JWT decode → profiles lookup → tenant_id assignment)
- Forma de persistir tenant_id na sessão (cookie, JWT claim, ou server-side session)
- Estratégia de seed SQL vs. UI admin para inserir profiles

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Middleware & Auth
- `proxy.ts` (ou `middleware.ts`) na raiz do projeto — lógica atual de proteção de rotas
- `src/` ou `app/` — estrutura de rotas Next.js existente

### Database
- `.planning/REQUIREMENTS.md` — IDs PROV-01 a PROV-04, AUTH-01 a AUTH-04
- `.planning/ROADMAP.md` — Success criteria da Phase 1
- `.planning/STATE.md` — Decisões arquiteturais já tomadas
- Migrations Supabase em `supabase/migrations/` — entender schema atual de `profiles` e `tenants`

</canonical_refs>

<specifics>
## Specific Ideas

- **Emails concretos:**
  - `juremabrokers@gmail.com` → tenant `jurema-brokers`
  - `contatocafecompam@gmail.com` → tenant `cafe-com-pam`

- **Slugs a verificar/criar em `tenants`:**
  - `jurema-brokers`
  - `cafe-com-pam`

- **Rota de redirect pós-login:** `/dashboard` (que leva ao `/cockpit`)
- **Rota gatekeeper:** `/unauthorized`
- **Rota admin irrestrita:** `/control`

</specifics>

<deferred>
## Deferred Ideas

- Cadastro de novos tenants via UI (FACT-* — Phase 5)
- Automação de provisionamento via n8n (Phase 5)
- Notificações de acesso (v2 requirements)

</deferred>

---

*Phase: 01-access-auth*
*Context gathered: 2026-03-31 via user context*
