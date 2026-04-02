---
phase: quick
plan: 260402-fab
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/yzihub/UpgradeCard.tsx
  - src/components/yzihub/UpgradeModal.tsx
  - src/layout/AppSidebar.tsx
autonomous: true
requirements: [UPSELL-CARD, FEATURE-LOCK, UPGRADE-MODAL]
must_haves:
  truths:
    - "Sidebar exibe card de upsell no final quando tenant plan e starter"
    - "Menus Radar, Trafego Pago e Conteudo IA mostram badge PRO quando modulo nao esta ativo"
    - "Clicar em modulo bloqueado abre modal de upgrade em vez de navegar"
    - "Tenant no plano growth ou enterprise nao ve card de upsell nem badges PRO"
  artifacts:
    - path: "src/components/yzihub/UpgradeCard.tsx"
      provides: "Card visual de upsell no sidebar"
    - path: "src/components/yzihub/UpgradeModal.tsx"
      provides: "Modal de oferta de upgrade ao clicar em modulo bloqueado"
    - path: "src/layout/AppSidebar.tsx"
      provides: "Sidebar com logica de badge PRO e bloqueio de navegacao"
  key_links:
    - from: "src/layout/AppSidebar.tsx"
      to: "src/components/yzihub/UpgradeCard.tsx"
      via: "import and render at sidebar bottom"
    - from: "src/layout/AppSidebar.tsx"
      to: "src/components/yzihub/UpgradeModal.tsx"
      via: "state-driven modal open on locked menu click"
    - from: "src/layout/AppSidebar.tsx"
      to: "useTenant().tenant.plan"
      via: "plan check for starter to show badges and card"
---

<objective>
Implementar upsell card no sidebar e logica de bloqueio visual com badge PRO para modulos que exigem plano superior, com modal de upgrade ao clicar.

Purpose: Monetizar upgrades mostrando modulos trancados com oferta visual no Cockpit.
Output: UpgradeCard.tsx, UpgradeModal.tsx, AppSidebar.tsx atualizado.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@src/layout/AppSidebar.tsx
@src/context/TenantContext.tsx
@src/layout/SidebarWidget.tsx

<interfaces>
<!-- TenantContext types the executor needs -->

From src/context/TenantContext.tsx:
```typescript
export type ActiveModule = "crm" | "sdr" | "radar" | "social" | "ia_onboarding";
export type TenantPlan = "starter" | "growth" | "enterprise";

export type TenantData = {
  id: string;
  name: string;
  plan: TenantPlan;
  activeModules: ActiveModule[];
  settings: Record<string, unknown>;
};
```

From src/layout/AppSidebar.tsx:
```typescript
type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
  module?: string;   // required module key — omit = always visible
  adminOnly?: true;
};
```

IMPORTANT: The existing AppSidebar HIDES menu items when their module is not in activeModules (isVisible function, line 121-128). The new behavior must SHOW these items but with a PRO badge and block navigation. The NavItem type needs a new optional field `proOnly?: true` to flag items that show locked when plan is "starter".

The existing SidebarWidget.tsx at src/layout/SidebarWidget.tsx is a TailAdmin placeholder — it is NOT currently rendered in AppSidebar. The new UpgradeCard replaces it conceptually.

The tenant badge is rendered at the bottom of AppSidebar (lines 205-213) — the UpgradeCard should render ABOVE this badge, only when plan is "starter".
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Criar UpgradeCard e UpgradeModal</name>
  <files>src/components/yzihub/UpgradeCard.tsx, src/components/yzihub/UpgradeModal.tsx</files>
  <action>
1. Criar src/components/yzihub/UpgradeCard.tsx:
   - Componente "use client" que recebe prop `onUpgradeClick: () => void`
   - Visual: rounded-2xl, bg-gradient sutil (de brand-500/10 para brand-500/5), borda brand-500/20
   - Padrao TailAdmin dark (dark:bg-white/[0.03] fallback)
   - Titulo: "Evolua seu Growth" (text-sm font-semibold text-white)
   - Subtitulo: "Desbloqueie o Radar e Trafego Pago no Plano Pro" (text-xs text-gray-400)
   - Botao: "Upgrade Plan" (bg-brand-500 hover:bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-medium w-full)
   - Botao chama onUpgradeClick ao clicar
   - Exportar como default

2. Criar src/components/yzihub/UpgradeModal.tsx:
   - Componente "use client" que recebe props: `isOpen: boolean`, `onClose: () => void`
   - Quando isOpen=false, retorna null
   - Overlay: fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center
   - Modal card: bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md mx-4 border border-gray-200 dark:border-gray-800
   - Titulo: "Desbloqueie o Plano Pro" (text-xl font-bold text-gray-900 dark:text-white)
   - Lista de beneficios com checkmarks verdes: "Radar de Oportunidades", "Gestao de Trafego Pago", "Conteudo IA Automatizado", "Suporte Prioritario"
   - Botao CTA: "Falar com Consultor" (bg-brand-500 hover:bg-brand-600 text-white rounded-lg px-6 py-3 text-sm font-medium w-full)
   - Botao CTA abre WhatsApp: window.open("https://wa.me/5511999999999?text=Quero%20conhecer%20o%20Plano%20Pro")
   - Botao secundario: "Agora nao" (text-gray-400 hover:text-gray-300 text-sm) chama onClose
   - Click no overlay tambem fecha (onClose)
   - Exportar como default
  </action>
  <verify>
    <automated>cd D:/dev/plataforma && npx tsc --noEmit src/components/yzihub/UpgradeCard.tsx src/components/yzihub/UpgradeModal.tsx 2>&1 | head -20</automated>
  </verify>
  <done>UpgradeCard renderiza card visual com botao de upgrade. UpgradeModal renderiza modal com lista de beneficios e CTA WhatsApp. Ambos compilam sem erros TS.</done>
</task>

<task type="auto">
  <name>Task 2: Atualizar AppSidebar com badges PRO, bloqueio e UpgradeCard</name>
  <files>src/layout/AppSidebar.tsx</files>
  <action>
Modificar src/layout/AppSidebar.tsx com tres mudancas:

**A. Adicionar campo proOnly ao NavItem e aos itens do menu:**
- Adicionar `proOnly?: true` ao type NavItem
- Marcar os seguintes itens com `proOnly: true`: Radar, Trafego Pago, e adicionar novo item "Conteudo IA" (icon: DocsIcon, path: "/cockpit/conteudo", module: "ia_content", proOnly: true) na secao "Modulos"
- Nos itens que ja tem `module` E `proOnly`, o module continua servindo para visibility em planos superiores

**B. Alterar a logica de visibilidade (isVisible) e renderizacao:**
- Mudar isVisible: se item.proOnly e true e tenant.plan e "starter", o item DEVE continuar visivel (nao filtrar). Remover a condicao que esconde items com module nao ativo APENAS quando proOnly e true.
- Na renderizacao de cada item (dentro do `<li>`), verificar: se item.proOnly e tenant?.plan === "starter", entao:
  - Em vez de `<Link>`, renderizar um `<button>` com onClick que abre o modal (setUpgradeModalOpen(true))
  - Ao lado do nome, adicionar badge: `<span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">PRO</span>`
  - O badge so aparece quando showLabel e true (sidebar expandido)
  - O button deve ter mesmas classes CSS que o Link (menu-item, etc)
- Items que NAO sao proOnly mantêm comportamento normal

**C. Adicionar UpgradeCard e UpgradeModal ao sidebar:**
- Importar UpgradeCard de "@/components/yzihub/UpgradeCard"
- Importar UpgradeModal de "@/components/yzihub/UpgradeModal"
- Adicionar state: `const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)`
- Renderizar UpgradeCard ACIMA do tenant badge (acima da div com "mt-auto pb-6"), somente quando: showLabel e true, tenant existe, e tenant.plan === "starter"
- Renderizar UpgradeModal no final do aside: `<UpgradeModal isOpen={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} />`
- UpgradeCard recebe onUpgradeClick={() => setUpgradeModalOpen(true)}

**ATENCAO:**
- NAO remover nenhuma funcionalidade existente (admin items, active state, collapsed state)
- O item "Conteudo IA" deve ser adicionado APOS "AI Assistant" na secao Modulos
- Manter o import de useState no topo (ja existe React import, adicionar useState ao destructure se necessario)
  </action>
  <verify>
    <automated>cd D:/dev/plataforma && npx tsc --noEmit src/layout/AppSidebar.tsx 2>&1 | head -30</automated>
  </verify>
  <done>Sidebar mostra items Radar, Trafego Pago e Conteudo IA com badge PRO quando tenant.plan e "starter". Clicar neles abre UpgradeModal. UpgradeCard aparece no fundo do sidebar para tenants starter. Tenants growth/enterprise nao veem badges nem card.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` compila sem erros
2. Navegar ao Cockpit como tenant starter: sidebar mostra Radar, Trafego Pago, Conteudo IA com badge PRO
3. Clicar em modulo bloqueado abre modal de upgrade (nao navega)
4. UpgradeCard visivel no fundo do sidebar com botao "Upgrade Plan"
5. Tenant growth/enterprise: menus normais sem badges, sem UpgradeCard
</verification>

<success_criteria>
- UpgradeCard.tsx e UpgradeModal.tsx criados em src/components/yzihub/
- AppSidebar renderiza badges PRO em items bloqueados para tenant starter
- Click em item bloqueado abre modal, nao navega
- UpgradeCard visivel apenas para tenant starter quando sidebar expandido
- Compilacao TypeScript sem erros
</success_criteria>

<output>
After completion, create `.planning/quick/260402-fab-implementar-sidebar-upsell-card-e-logica/260402-fab-SUMMARY.md`
</output>
</task_parameter>
