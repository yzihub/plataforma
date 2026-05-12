---
status: fixing
trigger: "imoveis-drawer-crash-and-data-display"
created: 2026-04-08T00:00:00Z
updated: 2026-04-08T00:01:00Z
---

## Current Focus

hypothesis: CONFIRMED — Three distinct bugs identified
test: code inspection complete
expecting: fixes applied and verified
next_action: apply fixes

## Symptoms

expected: Imoveis page displays real data from the `imoveis` table in all three views (kanban, grid, table). Clicking an imovel opens a drawer with ALL fields — not just Imóvel, Bairro, Tipo, Preço, Status.
actual: Runtime crash: `Cannot read properties of undefined (reading 'length')` at PropertyDrawer.tsx:411 — `form.tags` is undefined. The views show incomplete data.
errors: |
  TypeError: Cannot read properties of undefined (reading 'length')
  at PropertyDrawer (src/components/yzihub/PropertyDrawer.tsx:411:30)
  at ImoveisClient (src/components/yzihub/ImoveisClient.tsx:374:7)
  at ImoveisPage (src/app/cockpit/imoveis/page.tsx:17:7)
reproduction: Navigate to /cockpit/imoveis
timeline: Current — likely form state initialization missing `tags` field

## Eliminated

- hypothesis: propertyToForm() missing tags field
  evidence: propertyToForm() correctly uses `p.tags ?? []` — no bug here
  timestamp: 2026-04-08T00:01:00Z

## Evidence

- timestamp: 2026-04-08T00:01:00Z
  checked: PropertyDrawer.tsx line 128-130
  found: `useState<FormState>(property ? propertyToForm(property) : ({} as FormState))` — when property is initially null (drawer is closed), form is initialized as `{}` (empty object cast as FormState). `form.tags` is then `undefined`.
  implication: CRASH BUG — line 411 `form.tags.length` crashes because tags is undefined when property is null

- timestamp: 2026-04-08T00:01:00Z
  checked: PropertyDrawer.tsx line 211
  found: `const availableTags = ALL_TAGS.filter((t) => !form.tags?.includes(t))` — uses optional chaining `?.` to guard
  implication: line 211 is safe, but line 411 is not — inconsistent defensive coding

- timestamp: 2026-04-08T00:01:00Z
  checked: PropertyDrawer.tsx rendering logic
  found: The panel content (lines 231+) is wrapped in `{property && (...)}` BUT the `availableTags` computation at line 211 runs unconditionally (outside the guard). Lines 411 also runs inside the `{property && ...}` block — WAIT, does it?
  implication: Need to verify: line 411 is inside `{property && (...)}` at line 231. If so, it should not run when property is null...

- timestamp: 2026-04-08T00:01:00Z
  checked: PropertyDrawer.tsx lines 231 and 411
  found: Line 231 is `{property && (<>...`). Line 411 (`{form.tags.length > 0 && (`) IS inside this block. However, React renders the entire component function first — meaning line 411 is evaluated as JSX. BUT `form.tags` being undefined at initial render (when property is null) means the JSX expression IS evaluated. Wait — JSX expressions inside `{property && ...}` ARE short-circuit evaluated, so if property is null, the inner expression should NOT evaluate.
  implication: Actually the crash could happen at the TRANSITION moment — when property changes from null to a value, there may be a render cycle where property is set but the useEffect hasn't run yet and form is still the old `{} as FormState`. Let me re-examine...

- timestamp: 2026-04-08T00:01:00Z
  checked: PropertyDrawer.tsx state initialization and useEffect
  found: `useState` initializes form as `property ? propertyToForm(property) : ({} as FormState)`. The useEffect runs AFTER render. On first render when property becomes non-null, the component renders with the OLD form state ({} as FormState) BEFORE useEffect fires. During that first render with property !== null, the `{property && (...)}` block evaluates, reaching line 411 with form.tags = undefined. CRASH.
  implication: ROOT CAUSE 1 confirmed — the useState initial value of `{}` is the bug. Fix: initialize with a safe default FormState that always has tags: [].

- timestamp: 2026-04-08T00:01:00Z
  checked: ImoveisClient.tsx line 150-151
  found: Query filters `.eq("status_publicacao", "Publicado")` — this means only published items show. Also data mapping (mapImoveisToProperty) creates tags from quartos/suites/vagas fields as room count badges like "3Q", "2S", "2V". These are numeric tags, not the editorial tags the drawer expects. The `imoveis` table has NO `tags` column per the schema — the `properties` table has tags, but Jurema's live data is in `imoveis`.
  implication: ROOT CAUSE 2 — The drawer saves to `properties` table (line 172: `.from("properties")`) but the page reads from `imoveis` table. These are two different tables! The drawer is saving to the wrong table.

- timestamp: 2026-04-08T00:01:00Z
  checked: imoveis table schema vs properties table schema
  found: Migration 008/009 create the `properties` table with title, photo_url, price, location, neighborhood, tags[], property_type, construction_status, publication_status, purpose, notes. The `imoveis` table (used by ImoveisClient) has completely different column names: titulo_comercial, bairro, valor, quartos, suites, vagas, metragem, tipo_de_imovel, finalidade, foto_principal, link_do_imovel, status_publicacao, descricao_imovel. The `imoveis` table comes from n8n/WordPress sync data.
  implication: The system has two tables: `imoveis` (real n8n synced data, Portuguese column names) and `properties` (old seed data, English column names). The PropertyDrawer saves to `properties` but the page reads from `imoveis`. This mismatch means saves don't update what's displayed.

- timestamp: 2026-04-08T00:01:00Z
  checked: ImoveisClient.tsx line 150 — hardcoded tenant_id
  found: `.eq("tenant_id", "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361")` — tenant_id is hardcoded, ignoring `tenant?.id` from useTenant()
  implication: ROOT CAUSE 3 — hardcoded tenant_id instead of using dynamic tenant context. Minor bug but worth fixing.

## Resolution

root_cause: |
  Three bugs:
  1. CRASH: PropertyDrawer initializes form state as `{} as FormState` when property is null, so when property transitions from null to non-null the first render sees form.tags = undefined and crashes at line 411.
  2. TABLE MISMATCH: The drawer's handleSave() saves to `properties` table but ImoveisClient reads from `imoveis` table. These are two different tables with different schemas. The `imoveis` table doesn't have the drawer's fields (tags, construction_status, etc.), so the drawer can't properly save back to the source data.
  3. HARDCODED tenant_id: ImoveisClient hardcodes "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361" instead of using tenant?.id.

fix: |
  1. Fix crash: Change useState initialization to use a safe empty FormState with tags: [] when property is null.
  2. Fix table mismatch: Update PropertyDrawer to save to `imoveis` table using the Portuguese column names that match what ImoveisClient reads.
  3. Fix hardcoded tenant_id: Use tenant?.id from the useTenant hook.

verification:
files_changed:
  - src/components/yzihub/PropertyDrawer.tsx
  - src/components/yzihub/ImoveisClient.tsx
