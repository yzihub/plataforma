---
phase: quick
plan: 260402-mgb
type: execute
wave: 1
depends_on: []
files_modified:
  - src/context/TenantContext.tsx
  - src/components/yzihub/LeadsClient.tsx
  - src/components/yzihub/LeadsDataTable.tsx
  - src/components/yzihub/FinanceiroClient.tsx
  - src/app/cockpit/financeiro/page.tsx
  - src/app/cockpit/leads/page.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Visiting /cockpit/leads shows the LeadsDataTable with mock data including Score, VGV (value), and Status columns"
    - "Visiting /cockpit/financeiro shows commission bar chart and pulsating ATRASADO alerts"
    - "Visiting /cockpit/ai-agent shows the AI Assistant chat interface"
    - "No auth redirect occurs — all cockpit pages load without Supabase session"
  artifacts:
    - path: "src/context/TenantContext.tsx"
      provides: "Dev bypass that returns mock tenant when no Supabase session"
    - path: "src/components/yzihub/FinanceiroClient.tsx"
      provides: "Bar chart for commissions and pulsating ATRASADO badges"
    - path: "src/app/cockpit/leads/page.tsx"
      provides: "Leads page with high-density data table"
  key_links:
    - from: "src/context/TenantContext.tsx"
      to: "src/app/cockpit/layout.tsx"
      via: "TenantProvider returns mock tenant in dev"
      pattern: "DEV_BYPASS"
---

<objective>
Bypass auth temporarily and build high-density screens for /cockpit/leads, /cockpit/financeiro, and verify /cockpit/ai-agent loads.

Purpose: Auth is blocking local development. The user needs to see fully functional screens on localhost immediately. Auth will be re-enabled during polish.
Output: All three cockpit screens render with rich mock data, no auth wall.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@src/context/TenantContext.tsx
@src/app/cockpit/layout.tsx
@src/app/cockpit/leads/page.tsx
@src/app/cockpit/financeiro/page.tsx
@src/app/cockpit/ai-agent/page.tsx
@src/components/yzihub/LeadsDataTable.tsx
@src/components/yzihub/LeadsClient.tsx
@src/components/yzihub/FinanceiroClient.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Dev auth bypass in TenantContext + enrich Leads page</name>
  <files>src/context/TenantContext.tsx, src/app/cockpit/leads/page.tsx</files>
  <action>
1. In `src/context/TenantContext.tsx`, inside `fetchTenant`, after the `if (!user)` block (line ~62), instead of returning with null tenant, add a dev bypass:
   - If `!user` AND `process.env.NODE_ENV === 'development'`, set a mock tenant:
     ```
     { id: "dev-tenant", name: "Jurema Brokers (DEV)", plan: "growth", activeModules: ["crm", "sdr", "ia_onboarding"], settings: { agent_name: "Luana", primary_color: "#465FFF" } }
     ```
   - Mark with `// DEV_BYPASS: remove when auth is re-enabled` comment for easy grep later.
   - Set `setIsGlobalAdmin(false)` and return early (skip profile/tenant DB calls).

2. In `src/app/cockpit/leads/page.tsx`, the `fetchLeads` function already falls back to `cafePamData.leads` when no user. Verify this works. Add 5 more mock leads to the existing mock-data with realistic Jurema Brokers data (imobiliario context): include diverse scores (35, 62, 78, 85, 92), VGV values between R$180k-R$2.5M, and varied statuses (new, contacted, qualified, proposal, won).
   - Check where `cafePamData` comes from (`@/lib/crm/mock-data`). If leads there are minimal, add richer entries with score, value, and status diversity.
  </action>
  <verify>
    <automated>cd D:/dev/plataforma && npx next build --no-lint 2>&1 | tail -20</automated>
  </verify>
  <done>Cockpit loads without auth wall in dev mode. Leads page shows 10+ leads with Score, VGV, Status columns populated.</done>
</task>

<task type="auto">
  <name>Task 2: Financeiro bar chart + pulsating ATRASADO alerts</name>
  <files>src/components/yzihub/FinanceiroClient.tsx, src/app/cockpit/financeiro/page.tsx</files>
  <action>
1. In `src/app/cockpit/financeiro/page.tsx`, expand `MOCK_FINANCE` to 8-10 records representing real estate commissions. Include:
   - Mix of statuses: "pendente", "em_andamento", "concluido", "atrasado"
   - At least 3 records with `status: "atrasado"` and `financial_alert: true`
   - Descriptions like "Comissao Apt 302 Meireles", "Comissao Casa Eusebio Lote 14", etc.
   - Values between R$3,500 and R$125,000

2. In `src/components/yzihub/FinanceiroClient.tsx`, add a horizontal bar chart section ABOVE the table:
   - Use pure CSS/Tailwind bars (no chart library needed) — a simple `<div>` per record with width proportional to `final_amount / maxAmount * 100%`.
   - Each bar shows the description on the left, amount on the right.
   - Bar color: green for "concluido", yellow for "em_andamento", blue for "pendente", RED with `animate-pulse` for "atrasado".
   - Section title: "Comissoes por Status"

3. In the table rows, for records with `status === "atrasado"`, replace the status text with a red pulsating badge:
   ```
   <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-500 animate-pulse">
     ATRASADO
   </span>
   ```

4. Add a summary strip at the top showing: Total Comissoes (sum), A Receber (pendente + em_andamento sum), Atrasados count with pulsating red dot.
  </action>
  <verify>
    <automated>cd D:/dev/plataforma && npx next build --no-lint 2>&1 | tail -20</automated>
  </verify>
  <done>Financeiro page shows bar chart of commissions by status, pulsating ATRASADO badges in both chart and table, summary strip with totals.</done>
</task>

</tasks>

<verification>
1. `npm run dev` starts without errors
2. Navigate to `http://localhost:3001/cockpit/leads` — DataTable renders with 10+ leads, Score/VGV/Status columns visible
3. Navigate to `http://localhost:3001/cockpit/financeiro` — Bar chart visible, ATRASADO rows pulse red, summary strip shows totals
4. Navigate to `http://localhost:3001/cockpit/ai-agent` — Chat interface loads (already works with mock via useTenant dev bypass)
</verification>

<success_criteria>
All three cockpit screens (/leads, /financeiro, /ai-agent) render on localhost without any auth wall. Leads shows high-density data table. Financeiro shows bar chart + pulsating alerts. AI Agent chat loads with Luana greeting.
</success_criteria>

<output>
After completion, create `.planning/quick/260402-mgb-ignorar-auth-tempor-rio-e-construir-tela/260402-mgb-SUMMARY.md`
</output>
