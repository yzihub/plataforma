---
phase: quick
plan: 260407-ejm
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/yzihub/PropertyTable.tsx
  - src/components/yzihub/ImoveisClient.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Imóveis são listados em tabela com colunas: Título, Bairro, Tipo, Preço, Status"
    - "Filtros de bairro e preço funcionam sem dados mock — dados vêm do Supabase via tenant_id"
    - "Badge de status (Disponível/Reservado/Vendido) aparece com cor correta na tabela"
    - "Toggle de view (Tabela / Grade / Kanban) aparece na barra de filtros"
    - "Tabela é a view padrão do módulo"
  artifacts:
    - path: "src/components/yzihub/PropertyTable.tsx"
      provides: "DataTable view para imóveis com TailAdmin Table components"
      exports: ["PropertyTable"]
    - path: "src/components/yzihub/ImoveisClient.tsx"
      provides: "Adiciona toggle 'tabela' e renderiza PropertyTable"
  key_links:
    - from: "ImoveisClient.tsx"
      to: "PropertyTable.tsx"
      via: "prop properties={filtered}"
      pattern: "view === \"table\""
---

<objective>
Adicionar view de DataTable ao módulo de Imóveis existente.

Purpose: O módulo já tem Grid (cards) e Kanban funcionando com dados reais do Supabase. Falta a view de tabela — o padrão visual canônico para listagens no YZI OS (Lei da Variedade Visual). A tabela facilita comparação rápida de imóveis por preço e bairro.

Output: PropertyTable.tsx (componente DataTable TailAdmin), ImoveisClient.tsx atualizado com toggle "Tabela" como view padrão.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/260407-ejm-implementar-m-dulo-de-im-veis-com-integr/260407-ejm-PLAN.md

Padrão de referência para DataTable: src/components/yzihub/LeadsDataTable.tsx
Tipos: src/types/properties.ts (Property interface)
ImoveisClient atual: src/components/yzihub/ImoveisClient.tsx (já tem fetch Supabase + filtros + toggle Grid/Kanban)

<interfaces>
<!-- Tipos disponíveis — não explorar o codebase, usar direto -->

From src/types/properties.ts:
```typescript
export interface Property {
  id: string;
  tenant_id: string;
  title: string;
  photo_url: string | null;
  price: number;
  location: string;
  area_sqm: number | null;
  status: "available" | "sold" | "reserved";
  link: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  property_type: string | null;
  construction_status: string | null;
  publication_status: string | null;
  tags: string[] | null;
  neighborhood: string | null;
  purpose: string | null;
  external_id: string | null;
  source: string | null;
  description: string | null;
  images: unknown[] | null;
  features: Record<string, unknown> | null;
  score: number | null;
  priority: "low" | "normal" | "high" | "urgent" | null;
  kanban_stage: string | null;
}
```

From src/components/ui/table (padrão TailAdmin):
```typescript
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
```

From src/components/ui/badge/Badge:
```typescript
import Badge from "@/components/ui/badge/Badge";
// color: "primary" | "success" | "error" | "warning" | "info" | "light" | "dark"
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Criar PropertyTable.tsx — DataTable de imóveis com badges de status</name>
  <files>src/components/yzihub/PropertyTable.tsx</files>
  <action>
Criar componente `PropertyTable` seguindo exatamente o padrão de `LeadsDataTable.tsx`.

Props:
```typescript
interface PropertyTableProps {
  properties: Property[];
  onSelect?: (p: Property) => void;
}
```

Colunas da tabela (nesta ordem):
1. **Imóvel** — photo_url como thumbnail 48x48 (rounded, object-cover) + título + location abaixo em text-xs text-gray-400. Se não tiver foto, exibir ícone casa (svg casa simples, size-8, text-gray-400).
2. **Bairro** — `neighborhood ?? location` (fallback para location se neighborhood null)
3. **Tipo** — `property_type ?? "—"`
4. **Preço** — formatado BRL: `price.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })`
5. **Status** — Badge TailAdmin com mapeamento:
   - `available` → color="success", label="Disponível"
   - `reserved` → color="warning", label="Reservado"
   - `sold` → color="dark", label="Vendido"

Header da tabela: usar `<TableHeader>` com `<TableRow>` contendo `<th>` com classe `px-5 py-3 text-xs font-medium text-left text-gray-500 uppercase tracking-wider dark:text-gray-400`.

Cada linha: `<TableRow>` com `onClick={() => onSelect?.(property)}` e `className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02]"`.

Empty state (quando properties.length === 0):
```tsx
<div className="flex flex-col items-center justify-center py-20 text-gray-400">
  <svg ...ícone casa... className="size-12 mb-3" />
  <p className="text-sm">Nenhum imóvel encontrado</p>
</div>
```

Imports necessários:
```typescript
import type { Property } from "@/types/properties";
import Badge from "@/components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
```

NÃO usar dados mock. NÃO criar estado local — componente é puramente apresentacional (recebe `properties` via prop).
  </action>
  <verify>
O arquivo src/components/yzihub/PropertyTable.tsx existe e exporta `PropertyTable` como default. Verificar: `npx tsc --noEmit 2>&1 | grep PropertyTable` — sem erros de tipo.
  </verify>
  <done>PropertyTable renderiza tabela com 5 colunas, badges coloridos por status, thumbnail ou ícone casa, linha clicável que chama onSelect.</done>
</task>

<task type="auto">
  <name>Task 2: Atualizar ImoveisClient.tsx — adicionar toggle Tabela + filtro de preço</name>
  <files>src/components/yzihub/ImoveisClient.tsx</files>
  <action>
Atualizar `ImoveisClient.tsx` com as seguintes mudanças:

1. **Importar PropertyTable:**
```typescript
import PropertyTable from "@/components/yzihub/PropertyTable";
```

2. **Mudar view padrão de "grid" para "table":**
```typescript
const [view, setView] = useState<"table" | "grid" | "kanban">("table");
```

3. **Adicionar filtro de preço máximo** (novo state e select):
```typescript
const [filterMaxPrice, setFilterMaxPrice] = useState("all");
```

Opções de preço (adicionar select após o select de publicação):
```tsx
<select value={filterMaxPrice} onChange={(e) => setFilterMaxPrice(e.target.value)} className={selectClass}>
  <option value="all">Qualquer Preço</option>
  <option value="500000">Até R$ 500 mil</option>
  <option value="1000000">Até R$ 1 milhão</option>
  <option value="2000000">Até R$ 2 milhões</option>
</select>
```

4. **Atualizar lógica de filtro** (`useMemo` de `filtered`) para incluir filtro de preço:
```typescript
if (filterMaxPrice !== "all" && p.price > Number(filterMaxPrice)) return false;
```

5. **Adicionar botão Tabela no toggle de views** — inserir ANTES do botão Grade:
```tsx
<button
  onClick={() => setView("table")}
  title="Visualização em tabela"
  className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
    view === "table"
      ? "bg-brand-500 text-white"
      : "bg-white text-gray-500 hover:text-gray-700 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:text-gray-200"
  }`}
>
  <TableIcon /> {/* SVG inline: 3 linhas horizontais representando tabela */}
  <span className="hidden sm:inline">Tabela</span>
</button>
```

SVG para TableIcon (adicionar junto dos outros ícones no topo do arquivo):
```tsx
function TableIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="9" x2="9" y2="21" />
    </svg>
  );
}
```

6. **Adicionar renderização da view tabela** — antes do bloco `{view === "grid" && ...}`:
```tsx
{view === "table" && (
  <PropertyTable
    properties={filtered}
    onSelect={(p) => setSelectedProperty(p)}
  />
)}
```

Preservar TUDO existente (fetch Supabase, PropertyCard, PropertyKanban, PropertyDrawer, skeleton de loading, filtros atuais). Apenas adicionar — não remover.
  </action>
  <verify>
`npx tsc --noEmit 2>&1 | head -20` — sem novos erros de tipo. Verificar que o arquivo importa PropertyTable e renderiza quando view === "table".
  </verify>
  <done>ImoveisClient tem 3 views (Tabela/Grade/Kanban), Tabela é a padrão, filtro de preço funciona, PropertyTable abre drawer ao clicar na linha.</done>
</task>

</tasks>

<verification>
Após execução:
1. `npx tsc --noEmit` — zero erros de TypeScript nos arquivos modificados
2. `npm run build 2>&1 | tail -20` — build sem erros
3. Navegar para /cockpit/imoveis — tabela aparece por padrão com colunas corretas
4. Filtrar bairro/preço — lista atualiza sem reload
5. Clicar numa linha da tabela — PropertyDrawer abre com dados do imóvel
</verification>

<success_criteria>
- PropertyTable.tsx criado em src/components/yzihub/ com DataTable TailAdmin
- ImoveisClient.tsx com view padrão "table", toggle 3 views, filtro de preço
- Zero dados mock — todos os dados vêm do Supabase filtrados por tenant_id
- Build Next.js sem erros
- Badges de status com cores corretas (verde=disponível, amarelo=reservado, cinza=vendido)
</success_criteria>

<output>
Após conclusão, criar `.planning/quick/260407-ejm-implementar-m-dulo-de-im-veis-com-integr/260407-ejm-SUMMARY.md` com:
- O que foi construído
- Arquivos modificados/criados
- Padrões estabelecidos
- Commit hash
</output>
