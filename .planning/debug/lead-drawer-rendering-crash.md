---
status: awaiting_human_verify
trigger: "Sistema parou de carregar — navegação local travada. Foco em LeadDrawer, GerarContratoDrawer.tsx e /api/contracts/generate/route.ts."
created: 2026-04-18T00:00:00Z
updated: 2026-04-18T00:05:00Z
---

## Current Focus

hypothesis: CONFIRMED — dois bugs causam crash de renderização no LeadDrawer
test: Lendo código-fonte de todos os arquivos envolvidos
expecting: n/a — root cause encontrado, aplicando fix
next_action: Corrigir os dois bugs no LeadDrawer.tsx

## Symptoms

expected: Navegação carrega normalmente, drawers abrem sem travar
actual: Sistema parou de carregar — interface congela sem mostrar erro
errors: Desconhecido — erro não está visível na UI (sem ErrorBoundary)
reproduction: Abrir LeadDrawer ou tentar gerar contrato via GerarContratoDrawer
started: Após últimas alterações em GerarContratoDrawer.tsx e /api/contracts/generate/route.ts

## Eliminated

- hypothesis: Erro em GerarContratoDrawer.tsx causando crash
  evidence: GerarContratoDrawer.tsx está correto — tem try/catch, error state, validações, sem crashes
  timestamp: 2026-04-18T00:04:00Z

- hypothesis: Erro em /api/contracts/generate/route.ts causando crash frontend
  evidence: Route.ts está correto — server-side, não poderia causar crash de renderização React
  timestamp: 2026-04-18T00:04:00Z

## Evidence

- timestamp: 2026-04-18T00:03:00Z
  checked: LeadDrawer.tsx linha 859 — TabAtividades renderiza ACTIVITY_ICON[a.tipo]
  found: ACTIVITY_ICON é um Record<string, React.ComponentType> — mapeia tipo para COMPONENTE, não a string/elemento. Na linha 859, o código faz `<span className="text-base shrink-0 mt-0.5">{ACTIVITY_ICON[a.tipo]}</span>`, mas ACTIVITY_ICON[a.tipo] é uma referência de classe/função (ex: BoltIcon), não um elemento React. Isso causa React invariant violation — "Objects are not valid as a React child (found: function BoltIcon)".
  implication: Crash silencioso na renderização da aba "Atividades" — trava a interface sem erro visível

- timestamp: 2026-04-18T00:04:00Z
  checked: GerarContratoDrawer.tsx linha 62 — initForm acessa lead.value
  found: lead.value é `number` no tipo Lead (src/lib/crm/types.ts linha 40: `value: number`). O código `lead && lead.value > 0 ? String(lead.value) : ""` está sintaticamente correto para TypeScript, MAS se `lead` vier como objeto com value=undefined (do banco, campo não preenchido), `lead.value > 0` seria `undefined > 0 = false`, e retorna "". Isso não causa crash.
  implication: Não é o causa do crash — GerarContratoDrawer está seguro

- timestamp: 2026-04-18T00:05:00Z
  checked: LeadDrawer.tsx linha 117-123 — tipo ActivityIconComponent e ACTIVITY_ICON
  found: `type ActivityIconComponent = React.ComponentType<{ className?: string }>` e ACTIVITY_ICON mapeia para BoltIcon, PlugInIcon, ArrowRightIcon, UserCircleIcon. Na linha 859: `<span>{ACTIVITY_ICON[a.tipo]}</span>` passa o COMPONENTE em si como children, não um elemento. Precisa ser `<span>{React.createElement(ACTIVITY_ICON[a.tipo], { className: "w-4 h-4" })}</span>` ou usar a variável como componente JSX: `const Icon = ACTIVITY_ICON[a.tipo]; return <Icon className="w-4 h-4" />`
  implication: ROOT CAUSE CONFIRMADO — crash de renderização React toda vez que aba "Atividades" é acessada

## Resolution

root_cause: LeadDrawer.tsx linha 859 — TabAtividades passa componentes React (funções/classes) como children diretos de <span> em vez de renderizá-los como elementos JSX. `{ACTIVITY_ICON[a.tipo]}` tenta renderizar uma função de componente como valor primitivo, causando "Objects are not valid as a React child" — crash silencioso sem ErrorBoundary.
fix: Extrair o componente em variável local e renderizar como JSX: `const Icon = ACTIVITY_ICON[a.tipo]; <Icon className="w-4 h-4" />`
verification: TypeScript compilou sem erros após o fix. A lógica do map foi corrigida para extrair o componente em variável local e renderizá-lo como JSX.
files_changed: [src/components/yzihub/LeadDrawer.tsx]
