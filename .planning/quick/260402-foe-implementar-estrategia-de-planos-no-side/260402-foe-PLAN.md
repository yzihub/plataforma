---
phase: quick
plan: 260402-foe
type: execute
wave: 1
depends_on: []
files_modified:
  - src/layout/AppSidebar.tsx
  - src/components/yzihub/UpgradeCard.tsx
  - src/components/yzihub/UpgradeModal.tsx
autonomous: true
requirements: [PRD-6-tiers]
must_haves:
  truths:
    - "Starter tenant sees PRO badge on Radar and Trafego Pago, GROWTH badge on Conteudo IA"
    - "Growth tenant sees only GROWTH badge on Conteudo IA — Radar and Trafego are navigable"
    - "Enterprise tenant sees no badges — all items navigable"
    - "UpgradeCard shows contextual message per tenant plan tier"
    - "UpgradeModal shows correct target tier and benefits based on what was clicked"
  artifacts:
    - path: "src/layout/AppSidebar.tsx"
      provides: "requiredPlan gating with two-level badges"
      contains: "requiredPlan"
    - path: "src/components/yzihub/UpgradeCard.tsx"
      provides: "Contextual upgrade CTA per plan"
      contains: "tenantPlan"
    - path: "src/components/yzihub/UpgradeModal.tsx"
      provides: "Tier-aware modal with correct benefits"
      contains: "requiredPlan"
  key_links:
    - from: "src/layout/AppSidebar.tsx"
      to: "src/components/yzihub/UpgradeModal.tsx"
      via: "requiredPlan prop passed on locked item click"
      pattern: "requiredPlan"
---

<objective>
Refine the sidebar plan-gating from a single `proOnly` boolean to a two-level `requiredPlan` system matching PRD Section 6 tiers.

Purpose: The previous implementation (260402-fab) blocks all three premium items identically for starter plans. The PRD defines TWO gate levels: growth-gated (Radar, Trafego Pago) and enterprise-gated (Conteudo IA). This task corrects the gating logic, badges, UpgradeCard messaging, and UpgradeModal content to reflect the real tier structure.

Output: Three updated files with correct two-level gating.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@PRD.md (Section 6 — tier definitions)
@src/lib/control/types.ts (TenantPlan type: 'starter' | 'growth' | 'enterprise')
@src/layout/AppSidebar.tsx (current sidebar with proOnly flag)
@src/components/yzihub/UpgradeCard.tsx (current static upgrade card)
@src/components/yzihub/UpgradeModal.tsx (current static modal)

<interfaces>
From src/lib/control/types.ts:
```typescript
export type TenantPlan = 'starter' | 'growth' | 'enterprise'
```

From src/context/TenantContext (used by useTenant hook):
```typescript
// tenant.plan is TenantPlan
// tenant.name is string
// tenant.activeModules is ActiveModule[]
```

PRD tier mapping (display name -> DB value):
- Basico = starter: CRM + Catalogo only
- Pro = growth: + Radar + Trafego Pago
- Growth = enterprise: + Conteudo IA + Social Media
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Refactor AppSidebar gating from proOnly to requiredPlan</name>
  <files>src/layout/AppSidebar.tsx</files>
  <action>
In the NavItem type definition, replace `proOnly?: true` with `requiredPlan?: 'growth' | 'enterprise'`.

In the SECTIONS menu definition, update the three gated items:
- Radar: replace `proOnly: true` with `requiredPlan: 'growth'`
- Trafego Pago: replace `proOnly: true` with `requiredPlan: 'growth'`
- Conteudo IA: replace `proOnly: true` with `requiredPlan: 'enterprise'`

Create a plan hierarchy helper constant (above the component):
```typescript
const PLAN_RANK: Record<TenantPlan, number> = { starter: 0, growth: 1, enterprise: 2 };
```

Replace the `isLockedForStarter` function with a new `isLockedForPlan` function:
```typescript
const isLockedForPlan = (item: NavItem): boolean => {
  if (!item.requiredPlan || !tenant) return false;
  return PLAN_RANK[tenant.plan] < PLAN_RANK[item.requiredPlan];
};
```

Remove the `isStarterPlan` const. Instead derive plan status where needed from `tenant?.plan`.

In the `isVisible` callback, replace the `proOnly` check with: if `item.requiredPlan`, return true (always show gated items with badge, same logic as before).

Update the locked item button rendering:
- Change `isLockedForStarter(item)` to `isLockedForPlan(item)`
- The onClick should pass the required plan to the modal: change `setUpgradeModalOpen(true)` to set state with the requiredPlan. Add a new state: `const [upgradeTarget, setUpgradeTarget] = useState<'growth' | 'enterprise' | null>(null)`. When a locked item is clicked: `setUpgradeTarget(item.requiredPlan!); setUpgradeModalOpen(true)`.
- Update badge text: instead of hardcoded "PRO", show `item.requiredPlan === 'enterprise' ? 'GROWTH' : 'PRO'` (since display name for enterprise tier is "Growth" per PRD).

Update the UpgradeCard section at the bottom: show for any tenant that is NOT enterprise (i.e., starter or growth). Replace `isStarterPlan` check with `tenant.plan !== 'enterprise'`.

Pass `tenantPlan={tenant.plan}` to UpgradeCard.

Pass `requiredPlan={upgradeTarget ?? 'growth'}` to UpgradeModal. On close, also clear upgradeTarget: `onClose={() => { setUpgradeModalOpen(false); setUpgradeTarget(null); }}`.

Update the tenant badge padding logic: replace `isStarterPlan` with `tenant.plan !== 'enterprise'` for the conditional className.

Import TenantPlan type: `import type { TenantPlan } from '@/lib/control/types'`.
  </action>
  <verify>
    <automated>cd D:/dev/plataforma && npx tsc --noEmit src/layout/AppSidebar.tsx 2>&1 | head -20</automated>
  </verify>
  <done>AppSidebar uses requiredPlan with two-level gating. Radar/Trafego show "PRO" badge when locked, Conteudo IA shows "GROWTH" badge when locked. Growth tenants can navigate Radar/Trafego but see Conteudo IA locked. Enterprise tenants see nothing locked.</done>
</task>

<task type="auto">
  <name>Task 2: Update UpgradeCard and UpgradeModal for tier-aware messaging</name>
  <files>src/components/yzihub/UpgradeCard.tsx, src/components/yzihub/UpgradeModal.tsx</files>
  <action>
**UpgradeCard.tsx:**
Add a `tenantPlan` prop to the interface:
```typescript
interface UpgradeCardProps {
  onUpgradeClick: () => void;
  tenantPlan: 'starter' | 'growth';
}
```
(Only starter and growth tenants see this card, so the prop type is narrowed.)

Update the messaging based on `tenantPlan`:
- If `starter`: title = "Evolua seu Growth", description = "Desbloqueie o Radar e Trafego Pago no Plano Pro", button = "Ver Plano Pro"
- If `growth`: title = "Escale com Automacao", description = "Desbloqueie Conteudo IA e Social Media no Plano Growth", button = "Ver Plano Growth"

**UpgradeModal.tsx:**
Add `requiredPlan` prop:
```typescript
interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredPlan: 'growth' | 'enterprise';
}
```

Replace the static BENEFITS array with tier-specific benefits:
```typescript
const TIER_CONFIG = {
  growth: {
    title: 'Desbloqueie o Plano Pro',
    benefits: [
      'Radar de Oportunidades',
      'Gestao de Trafego Pago',
      'Relatorios de Performance',
      'Suporte Prioritario',
    ],
    cta: 'Quero o Plano Pro',
    whatsappText: 'Quero%20conhecer%20o%20Plano%20Pro',
  },
  enterprise: {
    title: 'Desbloqueie o Plano Growth',
    benefits: [
      'Automacao de Conteudo IA',
      'Social Media Manager',
      'Todas as features Pro incluidas',
      'Suporte Dedicado',
    ],
    cta: 'Quero o Plano Growth',
    whatsappText: 'Quero%20conhecer%20o%20Plano%20Growth',
  },
} as const;
```

Use `TIER_CONFIG[requiredPlan]` to render the title, benefits list, CTA button text, and WhatsApp link dynamically.

Keep all existing styling and structure — only the data sources change.
  </action>
  <verify>
    <automated>cd D:/dev/plataforma && npx tsc --noEmit src/components/yzihub/UpgradeCard.tsx src/components/yzihub/UpgradeModal.tsx 2>&1 | head -20</automated>
  </verify>
  <done>UpgradeCard shows contextual message per tenant plan. UpgradeModal shows tier-specific title, benefits, and CTA matching the requiredPlan prop. Both components compile without errors.</done>
</task>

</tasks>

<verification>
1. TypeScript compiles: `npx tsc --noEmit` passes with no errors on all three files
2. Visual check: starter tenant sees PRO badge on Radar/Trafego, GROWTH badge on Conteudo IA, upgrade card says "Ver Plano Pro"
3. Visual check: growth tenant sees GROWTH badge only on Conteudo IA, upgrade card says "Ver Plano Growth", Radar/Trafego are navigable links
4. Visual check: enterprise tenant sees no badges, no upgrade card, all items navigable
5. Modal check: clicking locked Radar (from starter) shows Pro benefits; clicking locked Conteudo IA shows Growth benefits
</verification>

<success_criteria>
- Two-level plan gating matches PRD Section 6 exactly
- Badge text correctly shows PRO vs GROWTH per tier requirement
- UpgradeCard and UpgradeModal are contextual to tenant plan and clicked item
- All files compile, no regressions in sidebar navigation
</success_criteria>

<output>
After completion, create `.planning/quick/260402-foe-implementar-estrategia-de-planos-no-side/260402-foe-SUMMARY.md`
</output>
