---
phase: quick-260415-nfv
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/yzihub/PropertyCard.tsx
  - src/components/yzihub/ImoveisClient.tsx
autonomous: true
requirements: [QUICK-260415-NFV]
must_haves:
  truths:
    - "PropertyCard renderiza foto h-44 com pill finalidade no top-right e badge tipo no bottom-left"
    - "PropertyCard exibe RoomStrip com ícones 🛏🚿🚗📐 ao invés de tags cinza"
    - "PropertyCard exibe preço + link compacto [↗ Site] na mesma linha (sem botão VER NO SITE full-width)"
    - "PropertyCard sem foto exibe ícone casa + 'Sem imagem'; price=0 exibe 'Sob consulta'"
    - "ImoveisClient renderiza faixa de 6 MetricCards ANTES do filter bar"
    - "Métricas calculam: total, valor médio (BRL), para venda, para aluguel, top bairro, sem foto"
  artifacts:
    - path: "src/components/yzihub/PropertyCard.tsx"
      provides: "Card redesenhado com FINALIDADE_CONFIG, RoomStrip e fallbacks"
      contains: "FINALIDADE_CONFIG"
    - path: "src/components/yzihub/ImoveisClient.tsx"
      provides: "Faixa de 6 métricas acima do filter bar"
      contains: "MetricCard"
  key_links:
    - from: "src/components/yzihub/ImoveisClient.tsx"
      to: "src/components/yzihub/PropertyCard.tsx"
      via: "import default PropertyCard (grid view)"
      pattern: "PropertyCard"
    - from: "src/components/yzihub/ImoveisClient.tsx"
      to: "useMemo metrics + MetricCard"
      via: "render grid grid-cols-6 antes do filter bar"
      pattern: "MetricCard"
---

<objective>
Redesign do PropertyCard (8 campos elegantes) e adição de faixa de 6 métricas no ImoveisClient.

Purpose: substituir card genérico por layout de impacto (pill finalidade colorida, RoomStrip com ícones, link compacto) e dar visão macro do portfólio via métricas acima dos filtros.
Output: PropertyCard.tsx reescrito + ImoveisClient.tsx com métricas.
</objective>

<context>
@CLAUDE.md
@src/components/yzihub/PropertyCard.tsx
@src/components/yzihub/ImoveisClient.tsx
@src/types/properties.ts

<interfaces>
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
  tags: string[] | null;       // ["3Q", "2S", "2V"]
  neighborhood: string | null;
  purpose: string | null;       // "Venda" | "Aluguel" | "Temporada"
  property_type: string | null;
  link: string | null;
  // ... outros campos
}
```

Fluxo de dados (ImoveisClient -> PropertyCard):
- tags vêm de mapImoveisToProperty: ["{quartos}Q", "{suites}S", "{vagas}V"] (filtrados)
- purpose vem direto de row.finalidade (string bruta como "Venda")
- area_sqm vem de row.metragem (number | null)
- neighborhood vem de row.bairro
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Redesign PropertyCard com 8 campos elegantes</name>
  <files>src/components/yzihub/PropertyCard.tsx</files>
  <action>
Reescrever `src/components/yzihub/PropertyCard.tsx` completamente conforme spec aprovada.

**Remover:**
- STATUS_CONFIG e toda lógica de status badge "Disponível" (redundante — fetch já filtra publicados)
- Botão CTA full-width "VER NO SITE" e o placeholder div vazio
- Bloco de tags cinza renderizando `property.tags.map`
- Linha separada de `area_sqm` (será absorvida pelo RoomStrip)

**Adicionar (no mesmo arquivo, acima do export default):**

```typescript
const FINALIDADE_CONFIG: Record<string, { label: string; cls: string }> = {
  Venda:     { label: "VENDA",     cls: "bg-emerald-500/80 text-white" },
  Aluguel:   { label: "ALUGUEL",   cls: "bg-sky-500/80 text-white" },
  Temporada: { label: "TEMPORADA", cls: "bg-purple-500/80 text-white" },
};

function RoomStrip({ tags, area }: { tags: string[] | null; area: number | null }) {
  const parse = (suffix: string) => {
    const t = tags?.find(t => t.endsWith(suffix));
    return t ? parseInt(t) : null;
  };
  const quartos = parse("Q");
  const suites  = parse("S");
  const vagas   = parse("V");

  const items = [
    quartos != null && { icon: "🛏", value: quartos, label: "qts" },
    suites  != null && suites > 0 && { icon: "🚿", value: suites,  label: "sts" },
    vagas   != null && { icon: "🚗", value: vagas,   label: "vgs" },
    area    != null && { icon: "📐", value: area,    label: "m²"  },
  ].filter(Boolean) as { icon: string; value: number; label: string }[];

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
      {items.map(({ icon, value, label }) => (
        <span key={label} className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <span>{icon}</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">{value}</span>
          <span>{label}</span>
        </span>
      ))}
    </div>
  );
}
```

**Manter:** `formatPrice`, import de `Image`, re-export de `Property`.

**JSX do card (substituir todo o return do export default):**

```tsx
export default function PropertyCard({ property, onClick }: { property: Property; onClick?: (p: Property) => void }) {
  const finalidade = property.purpose ? FINALIDADE_CONFIG[property.purpose] : null;

  return (
    <div
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-gray-800 dark:bg-white/[0.03] cursor-pointer"
      onClick={() => onClick?.(property)}
    >
      {/* Foto h-44 */}
      <div className="relative h-44 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
        {property.photo_url ? (
          <Image
            src={property.photo_url}
            alt={property.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-gray-300 dark:text-gray-700">
            <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21H3V9.75z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
            </svg>
            <span className="text-[10px]">Sem imagem</span>
          </div>
        )}

        {/* Finalidade pill top-right */}
        {finalidade && (
          <span className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold backdrop-blur-sm ${finalidade.cls}`}>
            {finalidade.label}
          </span>
        )}

        {/* Tipo imóvel bottom-left */}
        {property.property_type && (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            {property.property_type}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-800 dark:text-white/90">
            {property.title}
          </h3>
          {property.neighborhood && (
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
              <svg className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0L6.343 16.657a8 8 0 1111.314 0z" />
                <circle cx="12" cy="11" r="3" />
              </svg>
              {property.neighborhood}
            </p>
          )}
        </div>

        <RoomStrip tags={property.tags} area={property.area_sqm} />

        <div className="mt-auto flex items-end justify-between">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {property.price > 0 ? formatPrice(property.price) : "Sob consulta"}
          </p>
          {property.link && (
            <a
              href={property.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[10px] font-medium text-gray-500 transition-colors hover:border-brand-500 hover:text-brand-500 dark:border-gray-700 dark:text-gray-400"
            >
              <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Site
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Fallbacks obrigatórios (já codificados acima, confirmar):**
- sem foto → div cinza + ícone casa + "Sem imagem" text-[10px] ✓
- price=0 → "Sob consulta" ✓
- sem area_sqm + sem tags → RoomStrip retorna null ✓
- sem neighborhood → linha 📍 não renderiza ✓
- sem link → botão [↗ Site] não renderiza ✓
- e.stopPropagation no link → evita abrir drawer ✓
  </action>
  <verify>
    <automated>rtk tsc --noEmit 2>&1 | grep -i "PropertyCard" || echo "OK: no TS errors in PropertyCard"</automated>
  </verify>
  <done>PropertyCard.tsx contém FINALIDADE_CONFIG, RoomStrip, JSX com h-44, pill finalidade top-right, tipo bottom-left, RoomStrip com ícones, link compacto [↗ Site] na linha do preço. Sem STATUS_CONFIG, sem botão full-width "VER NO SITE", sem tags cinza. TypeScript passa sem erros.</done>
</task>

<task type="auto">
  <name>Task 2: Adicionar faixa de 6 métricas no ImoveisClient</name>
  <files>src/components/yzihub/ImoveisClient.tsx</files>
  <action>
Editar `src/components/yzihub/ImoveisClient.tsx` — APENAS 3 adições cirúrgicas. NÃO tocar em: fetch, filter bar, view toggle, drawer, PropertyTable, PropertyKanban, selects de filtro, count line.

**1. Adicionar helper `formatBRL` no topo do arquivo**, logo APÓS os imports e ANTES de `interface ImoveisRow`:

```typescript
function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
```

**2. Adicionar função `MetricCard` inline ANTES do `export default function ImoveisClient`** (por ex., logo após o `KanbanIcon` existente):

```tsx
function MetricCard({
  label, value, sub, accent = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "default" | "green" | "amber" | "brand" | "sky";
}) {
  const accentCls = {
    default: "bg-gray-100 dark:bg-gray-800",
    green:   "bg-emerald-50 dark:bg-emerald-900/20",
    amber:   "bg-amber-50 dark:bg-amber-900/20",
    brand:   "bg-brand-50 dark:bg-brand-900/20",
    sky:     "bg-sky-50 dark:bg-sky-900/20",
  }[accent];
  const valueCls = {
    default: "text-gray-900 dark:text-white",
    green:   "text-emerald-600 dark:text-emerald-400",
    amber:   "text-amber-600 dark:text-amber-400",
    brand:   "text-brand-600 dark:text-brand-400",
    sky:     "text-sky-600 dark:text-sky-400",
  }[accent];

  return (
    <div className={`rounded-2xl border border-gray-200 p-4 dark:border-gray-800 ${accentCls}`}>
      <p className={`text-xl font-bold leading-none ${valueCls}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-gray-400">{sub}</p>}
      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
```

**3. Adicionar `useMemo metrics` dentro do componente ImoveisClient, junto com os outros useMemos existentes** (logo após o useMemo `filtered`, por exemplo):

```typescript
const metrics = useMemo(() => {
  const total = properties.length;
  const ticketMedio = total > 0
    ? properties.reduce((s, p) => s + p.price, 0) / total
    : 0;
  const paraVenda   = properties.filter(p => p.purpose === "Venda").length;
  const paraAluguel = properties.filter(p => p.purpose === "Aluguel").length;
  const semFoto     = properties.filter(p => !p.photo_url).length;

  const bairroCount = properties.reduce<Record<string, number>>((acc, p) => {
    const b = p.neighborhood ?? "Sem bairro";
    acc[b] = (acc[b] ?? 0) + 1;
    return acc;
  }, {});
  const sorted = Object.entries(bairroCount).sort((a, b) => b[1] - a[1]);
  const topBairro  = sorted[0]?.[0] ?? "—";
  const topBairroN = sorted[0]?.[1] ?? 0;

  return { total, ticketMedio, paraVenda, paraAluguel, semFoto, topBairro, topBairroN };
}, [properties]);
```

**4. Inserir o grid JSX dentro do return do ImoveisClient, LOGO ANTES do bloco `{/* Filter bar + view toggle */}`** (primeira coisa dentro de `<div className="space-y-6">`):

```tsx
{/* Metrics strip */}
<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
  <MetricCard label="Total de Imóveis" value={metrics.total} />
  <MetricCard label="Valor Médio"       value={formatBRL(metrics.ticketMedio)} accent="brand" />
  <MetricCard label="Para Venda"        value={metrics.paraVenda}   accent="green" />
  <MetricCard label="Para Aluguel"      value={metrics.paraAluguel} accent="sky" />
  <MetricCard label="Top Bairro"        value={metrics.topBairro}   sub={`${metrics.topBairroN} imóveis`} />
  <MetricCard label="Sem Foto"          value={metrics.semFoto}     accent={metrics.semFoto > 0 ? "amber" : "default"} />
</div>
```

**CRÍTICO — não tocar em:**
- lógica de fetch Supabase (useEffect)
- mapImoveisToProperty
- propertyTypes / neighborhoods / filtered useMemos existentes
- selectClass
- loading skeleton
- filter bar (selects)
- view toggle (table/grid/kanban)
- count paragraph
- PropertyTable / PropertyKanban / PropertyDrawer renders
- estados existentes (filterType, filterNeighborhood, etc.)
  </action>
  <verify>
    <automated>rtk tsc --noEmit 2>&1 | grep -i "ImoveisClient" || echo "OK: no TS errors in ImoveisClient"</automated>
  </verify>
  <done>ImoveisClient.tsx contém: helper formatBRL, função MetricCard, useMemo metrics calculando 6 valores (total, ticketMedio, paraVenda, paraAluguel, topBairro, semFoto), e grid de 6 MetricCards renderizado ANTES do filter bar (primeiro filho de space-y-6). Fetch, filtros, views, drawer intactos. TypeScript passa sem erros.</done>
</task>

</tasks>

<verification>
- `rtk tsc --noEmit` passa sem erros novos nos dois arquivos
- Abrir `/cockpit/imoveis` (ou rota equivalente) manualmente: faixa de 6 métricas aparece no topo, filter bar intacto logo abaixo, view grid mostra cards redesenhados com pill VENDA/ALUGUEL, RoomStrip com ícones, link compacto no canto direito do preço
- Card sem foto exibe placeholder "Sem imagem"; card sem link não mostra botão Site; card com price=0 mostra "Sob consulta"
</verification>

<success_criteria>
- PropertyCard.tsx: 0 menções a STATUS_CONFIG/status badge/VER NO SITE; contém FINALIDADE_CONFIG e RoomStrip
- ImoveisClient.tsx: contém formatBRL, MetricCard, useMemo metrics, grid lg:grid-cols-6
- Build Next.js passa (`rtk next build` ou `rtk tsc --noEmit`)
- Nenhum arquivo além dos 2 listados em files_modified foi alterado
</success_criteria>

<output>
After completion, create `.planning/quick/260415-nfv-redesign-propertycard-com-8-campos-elega/260415-nfv-SUMMARY.md` documenting what was changed in each file.
</output>
