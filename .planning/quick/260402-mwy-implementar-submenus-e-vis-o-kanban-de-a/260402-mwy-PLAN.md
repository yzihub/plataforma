---
phase: quick
plan: 260402-mwy
type: execute
wave: 1
depends_on: []
files_modified:
  - src/layout/AppSidebar.tsx
  - src/components/yzihub/LeadsKanban.tsx
  - src/components/yzihub/FinanceiroClient.tsx
  - src/app/cockpit/leads/page.tsx
autonomous: true
requirements: [SIDEBAR-SUBMENU, LEADS-KANBAN, FINANCEIRO-COMISSOES]
must_haves:
  truths:
    - "Sidebar items Leads, Imoveis, and Financeiro expand/collapse as submenus with chevron animation"
    - "Leads page has a tab/toggle to switch between DataTable view and Kanban view"
    - "Kanban board shows rich cards with Score Luana, VGV, Corretor across Novo/Qualificado/Visita/Contrato stages"
    - "Financeiro page has a Comissoes tab with donut chart showing market share por bairro"
    - "Active submenu icons use the primary theme color"
  artifacts:
    - path: "src/layout/AppSidebar.tsx"
      provides: "Collapsible submenu sections for CRM items"
    - path: "src/components/yzihub/LeadsKanban.tsx"
      provides: "Kanban board with rich lead cards and framer-motion drag"
    - path: "src/components/yzihub/FinanceiroClient.tsx"
      provides: "Comissoes tab with donut chart"
  key_links:
    - from: "src/layout/AppSidebar.tsx"
      to: "Submenu items"
      via: "ChevronDownIcon rotation + height animation on collapsible groups"
    - from: "src/app/cockpit/leads/page.tsx"
      to: "src/components/yzihub/LeadsKanban.tsx"
      via: "Tab toggle in LeadsClient passing view mode"
---

<objective>
Implement collapsible sidebar submenus, a Kanban view for Leads with rich cards, and a Comissoes donut chart tab in Financeiro.

Purpose: Increase information density and visual variety in the Cockpit -- submenus declutter navigation, Kanban provides pipeline visualization (Lei da Variedade Visual), and Comissoes chart adds financial insight per bairro.
Output: Updated AppSidebar with submenus, new LeadsKanban.tsx component, updated FinanceiroClient with tabs.
</objective>

<execution_context>
@.claude/skills/yzihub-patterns/SKILL.md
</execution_context>

<context>
@CLAUDE.md
@src/layout/AppSidebar.tsx
@src/components/yzihub/LeadsClient.tsx
@src/components/yzihub/FinanceiroClient.tsx
@src/components/yzihub/KanbanBoard.tsx
@src/lib/crm/types.ts

<interfaces>
From src/lib/crm/types.ts:
```typescript
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'meeting' | 'proposal' | 'negotiation' | 'won' | 'lost'
export interface Lead {
  id: string; tenant_id: string; stage_id: string | null; name: string;
  email: string | null; phone: string | null; company: string | null;
  source: string | null; status: LeadStatus; score: number | null;
  value: number | null; notes: string | null; assigned_to: string | null;
  last_action_at: string | null; created_at: string;
}
```

From src/types/finance.ts:
```typescript
export interface FinanceRecord {
  id: string; tenant_id: string; final_amount: number;
  financial_alert: boolean; priority_flag: boolean;
  description: string | null; status: string | null; created_at: string;
}
```

framer-motion and react-dnd are already in package.json.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Collapsible Sidebar Submenus + Leads Kanban View</name>
  <files>src/layout/AppSidebar.tsx, src/components/yzihub/LeadsKanban.tsx, src/components/yzihub/LeadsClient.tsx</files>
  <action>
**AppSidebar.tsx -- Collapsible Submenus:**

1. Extend the `NavItem` type to support children: add an optional `children?: NavItem[]` field. Items with `children` become collapsible group headers (no `path` needed on parent).

2. Restructure the SECTIONS menu definition:
   - "CRM" section: Convert "Leads" into a parent with children: `[{ name: "Lista", path: "/cockpit/leads" }, { name: "Kanban", path: "/cockpit/leads?view=kanban" }]`. Keep "CRM / Pipeline" as a flat item.
   - Add "Imoveis" parent under CRM with children: `[{ name: "Catalogo", path: "/cockpit/imoveis" }]`.
   - Add "Financeiro" parent under a new "Gestao" section with children: `[{ name: "Comissoes", path: "/cockpit/financeiro?tab=comissoes" }, { name: "Geral", path: "/cockpit/financeiro" }]`.

3. Add `openSubmenus` state: `const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({})`. Auto-open the submenu whose child matches current pathname.

4. Create a ChevronDownIcon inline SVG (simple 12px chevron, `transition-transform duration-200`). When submenu is open, rotate 180deg.

5. Render logic: For items with `children`, render a `<button>` that toggles the submenu. Below it, render a `<div>` with `overflow-hidden` and animate max-height (use CSS transition: `max-height 200ms ease-in-out`, closed=0, open=`${children.length * 40}px`). Children render as indented links (pl-10) with smaller text (text-xs).

6. Active state: Parent item icon gets `text-brand-500` (primary theme color) when ANY child is active. Child links get `text-brand-400 font-medium` when active.

7. Ensure collapsed sidebar (not expanded, not hovered) hides submenu text but keeps parent icons visible. Submenu expansion only works when `showLabel` is true.

**LeadsKanban.tsx -- New Component:**

1. Create `src/components/yzihub/LeadsKanban.tsx` as a "use client" component.

2. Props: `{ leads: Lead[] }`.

3. Define 4 Jurema pipeline stages as constants:
   ```
   const STAGES = [
     { id: "novo", label: "Novo", status: "new", color: "#3B82F6" },
     { id: "qualificado", label: "Qualificado", status: "qualified", color: "#F59E0B" },
     { id: "visita", label: "Visita", status: "meeting", color: "#8B5CF6" },
     { id: "contrato", label: "Contrato", status: "negotiation", color: "#10B981" },
   ]
   ```

4. Use `useState` to manage local board state (leads grouped by stage). Initialize by mapping `leads` into columns by their `status` field.

5. Each column: vertical scroll, header with stage name + count badge + colored left border.

6. Rich Card design for each lead:
   - Top: Lead name (font-semibold, text-sm), source badge (text-[10px])
   - Middle row: "Score Luana: {lead.score ?? 0}" with colored indicator (green >=70, amber >=40, red <40)
   - Middle row: "VGV: {brlFormatter.format(lead.value ?? 0)}" 
   - Bottom: "Corretor: {lead.assigned_to ?? 'Sem corretor'}" in text-xs text-gray-400
   - Card style: rounded-xl, border, dark theme compatible, hover:shadow-md transition

7. Drag-and-drop: Use framer-motion's `Reorder.Group` and `Reorder.Item` for reordering WITHIN a column. For cross-column drag, use a simple `onDragEnd` with framer-motion's `drag` prop — detect which column the card was dropped on via pointer position. If cross-column DnD proves complex, implement a simpler approach: each card has a dropdown/button to move to another stage (like a quick-action menu). Prioritize working UI over perfect DnD.

8. Export default the component.

**LeadsClient.tsx -- View Toggle:**

1. Add a `view` state: `const [view, setView] = useState<"table" | "kanban">("table")`. Read initial value from URL searchParams if `?view=kanban`.

2. Add toggle buttons above the search bar: two icon buttons (TableIcon / KanbanIcon) with active state highlighting.

3. When `view === "table"`, render the existing SearchBar + LeadsDataTable.
4. When `view === "kanban"`, render `<LeadsKanban leads={filteredLeads} />`.

5. Import LeadsKanban dynamically or statically from `@/components/yzihub/LeadsKanban`.
  </action>
  <verify>
    <automated>cd D:/dev/plataforma && npx next build 2>&1 | tail -20</automated>
  </verify>
  <done>
    - Sidebar shows collapsible submenus for Leads (Lista/Kanban), Imoveis (Catalogo), Financeiro (Comissoes/Geral)
    - Chevron icon animates on expand/collapse
    - Active submenu parent icons use brand-500 color
    - LeadsKanban.tsx exists in src/components/yzihub/ with rich cards showing Score, VGV, Corretor
    - LeadsClient has table/kanban toggle, kanban view renders the new component
    - Build passes with no type errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Financeiro Comissoes Tab with Donut Chart</name>
  <files>src/components/yzihub/FinanceiroClient.tsx, src/app/cockpit/financeiro/page.tsx</files>
  <action>
**FinanceiroClient.tsx -- Add Tabs + Donut Chart:**

1. Add tab state: `const [activeTab, setActiveTab] = useState<"geral" | "comissoes">("geral")`. Read initial from URL param `?tab=comissoes`.

2. Render tab bar at the top (below the header h1): Two tab buttons "Geral" and "Comissoes". Active tab: `border-b-2 border-brand-500 text-brand-500 font-semibold`. Inactive: `text-gray-400 hover:text-gray-600`.

3. When `activeTab === "geral"`, render the existing content (summary strip + bar chart + search + table) -- wrap in a fragment, no changes.

4. When `activeTab === "comissoes"`, render a new section:

   a. **Mock data for market share by bairro** (Jurema Brokers context -- Fortaleza neighborhoods):
   ```typescript
   const BAIRRO_DATA = [
     { bairro: "Meireles", value: 42, color: "#6366F1" },
     { bairro: "Aldeota", value: 28, color: "#8B5CF6" },
     { bairro: "Cocó", value: 15, color: "#A78BFA" },
     { bairro: "Mucuripe", value: 10, color: "#C4B5FD" },
     { bairro: "Outros", value: 5, color: "#DDD6FE" },
   ]
   ```

   b. **SVG Donut Chart** -- Build a pure SVG donut (no chart library needed):
   - viewBox="0 0 200 200", circle center (100,100), radius 70, strokeWidth 30
   - Use `stroke-dasharray` and `stroke-dashoffset` to create segments
   - Calculate each segment: circumference = 2 * PI * 70 = ~440. Each segment's dasharray = (value/100) * circumference. Offset each segment by the cumulative offset of previous segments.
   - Center text inside the donut: total count or "Market Share" label
   - Animate segments on mount with CSS transition on stroke-dashoffset (0.5s ease)

   c. **Legend** below the donut: horizontal flex-wrap list with colored dots + bairro name + percentage.

   d. **Summary cards** below: Total Comissoes (sum), Maior Bairro (name + %), Bairros Ativos (count).

5. Use `useTenant()` context -- if tenant exists, show tenant name in the Comissoes header: "Market Share por Bairro — {tenant.name}".

**financeiro/page.tsx -- No structural changes needed** (FinanceiroClient already receives initialRecords, tab switching is client-side only).
  </action>
  <verify>
    <automated>cd D:/dev/plataforma && npx next build 2>&1 | tail -20</automated>
  </verify>
  <done>
    - Financeiro page shows "Geral" and "Comissoes" tabs
    - Comissoes tab renders SVG donut chart with 5 bairro segments (Meireles, Aldeota, Coco, Mucuripe, Outros)
    - Legend shows colored dots with bairro names and percentages
    - Summary cards show Total, Maior Bairro, Bairros Ativos
    - Tenant name appears in the Comissoes header via TenantContext
    - Build passes with no type errors
  </done>
</task>

</tasks>

<verification>
1. `npx next build` completes without errors
2. Navigate to /cockpit -- sidebar shows collapsible submenus with chevron animation
3. Click Leads submenu -- shows Lista and Kanban children
4. Navigate to /cockpit/leads -- DataTable view is default
5. Toggle to Kanban view -- rich cards with Score/VGV/Corretor visible in 4 columns
6. Navigate to /cockpit/financeiro -- Geral tab shows existing content
7. Switch to Comissoes tab -- donut chart renders with bairro data
8. Active submenu parent icons use brand-500 color
</verification>

<success_criteria>
- Sidebar has 3 collapsible submenu groups (Leads, Imoveis, Financeiro) with animated chevrons
- LeadsKanban.tsx in src/components/yzihub/ with rich cards (Score, VGV, Corretor)
- FinanceiroClient has Comissoes tab with SVG donut chart for bairro market share
- All active states use brand primary color
- TenantContext (Jurema) used for data filtering
- No build errors
</success_criteria>

<output>
After completion, create `.planning/quick/260402-mwy-implementar-submenus-e-vis-o-kanban-de-a/260402-mwy-SUMMARY.md`
</output>
