---
phase: quick
plan: 260407-ktd
type: execute
wave: 1
depends_on: []
files_modified: [src/layout/AppSidebar.tsx]
autonomous: true
requirements: [SIDEBAR-CLEANUP]

must_haves:
  truths:
    - "Sidebar exibe apenas modulos funcionais: Dashboard, Leads, CRM/Pipeline, Imoveis, Contratos, Financeiro"
    - "Tasks e Chat nao aparecem na sidebar"
    - "Calendar, Forms, Tables, Profile, Settings nao aparecem na sidebar (rotas nao existem)"
    - "Modulos PRO/Growth permanecem intactos com badges e modal de upgrade"
    - "Nenhum link da sidebar resulta em 404"
  artifacts:
    - path: "src/layout/AppSidebar.tsx"
      provides: "Sidebar navigation limpa para Jurema Brokers"
  key_links:
    - from: "src/layout/AppSidebar.tsx"
      to: "/cockpit/*"
      via: "SECTIONS array nav items"
      pattern: "path:.*cockpit"
---

<objective>
Limpar a sidebar do tenant Jurema Brokers removendo links para rotas que nao existem ou modulos que nao estao prontos, mantendo navegacao funcional sem 404.

Purpose: Garantir que a sidebar exiba apenas modulos funcionais, sem links quebrados.
Output: AppSidebar.tsx atualizado com navegacao limpa.
</objective>

<execution_context>
@.planning/quick/260407-ktd-ajustar-sidebar-jurema/260407-ktd-PLAN.md
</execution_context>

<context>
@src/layout/AppSidebar.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remover rotas quebradas e modulos nao prontos da sidebar</name>
  <files>src/layout/AppSidebar.tsx</files>
  <action>
Editar o array SECTIONS em src/layout/AppSidebar.tsx:

1. Secao "YZI CONTROL" — remover os items:
   - Calendar (path: "/calendar" — rota nao existe)
   - Tasks (path: "/cockpit/tasks" — pagina placeholder, nao funcional)
   - Chat (path: "/cockpit/chat" — pagina placeholder, nao funcional)
   - Manter apenas Dashboard (path: "/cockpit")
   - Renomear label da secao de "YZI CONTROL" para "Painel" (faz mais sentido para o tenant)

2. Secao "CRM" — manter intacta:
   - Leads (com submenu Lista e Kanban) — funcional
   - CRM / Pipeline — funcional
   - Imoveis (com submenu Catalogo) — funcional

3. Secao "Gestao" — manter intacta:
   - Financeiro (com submenus Comissoes, Contratos, Geral) — funcional

4. Secao "Modulos" — NAO MEXER. Todos os items PRO/Growth devem permanecer exatamente como estao (Lei do Upsell). Items com module key sao controlados por activeModules e feature_flags.

5. Secao "Sistema" — remover INTEIRA:
   - Forms (path: "/form-elements" — rota nao existe, template TailAdmin)
   - Tables (path: "/basic-tables" — rota nao existe, template TailAdmin)
   - Profile (path: "/profile" — rota nao existe)
   - Settings (path: "/settings" — rota nao existe)
   - Nenhuma dessas rotas existe. Secao inteira e residuo do template.

6. Secao "Admin" — manter intacta (controlada por adminOnly flag).

7. Remover imports nao utilizados apos a limpeza: CalenderIcon, TaskIcon, ChatIcon, ListIcon, TableIcon, UserCircleIcon, SettingsIcon (se nao usado em outro lugar).
  </action>
  <verify>
    <automated>cd D:/dev/plataforma && npx next build 2>&1 | tail -20</automated>
  </verify>
  <done>
    - Sidebar exibe apenas: Dashboard, Leads (Lista/Kanban), CRM/Pipeline, Imoveis (Catalogo), Financeiro (Comissoes/Contratos/Geral), Modulos PRO, Admin
    - Tasks, Chat, Calendar, Forms, Tables, Profile, Settings removidos
    - Build passa sem erros
    - Nenhum link da sidebar aponta para rota inexistente
  </done>
</task>

</tasks>

<verification>
- Build Next.js passa sem erros
- Nenhum item da sidebar aponta para rota 404
- Modulos PRO/Growth intactos com badges
- Secao Admin intacta (adminOnly)
</verification>

<success_criteria>
Sidebar do cockpit exibe apenas modulos funcionais. Zero links quebrados. Modulos PRO preservados.
</success_criteria>

<output>
After completion, create `.planning/quick/260407-ktd-ajustar-sidebar-jurema/260407-ktd-SUMMARY.md`
</output>
