---
phase: quick
plan: 260408-jhi
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/yzihub/ImoveisClient.tsx
autonomous: true
requirements: [IMOV-01]

must_haves:
  truths:
    - "Pagina /cockpit/imoveis exibe imoveis reais da tabela 'imoveis' do Supabase"
    - "Apenas imoveis com status_publicacao = 'Publicado' e tenant_id correto aparecem"
    - "Cards e tabela mostram titulo, bairro, preco, quartos, vagas e foto corretamente"
    - "Imagem fallback aparece quando foto_principal e null"
  artifacts:
    - path: "src/components/yzihub/ImoveisClient.tsx"
      provides: "Fetch da tabela imoveis com transformacao para Property type"
  key_links:
    - from: "src/components/yzihub/ImoveisClient.tsx"
      to: "supabase.imoveis"
      via: "createClient().from('imoveis').select()"
      pattern: "from.*imoveis"
---

<objective>
Conectar a pagina de imoveis do frontend a tabela real `imoveis` do Supabase, substituindo o fetch atual que aponta para `properties`. Transformar os campos da tabela `imoveis` (titulo_comercial, bairro, valor, quartos, vagas, foto_principal) para o formato Property esperado pelos componentes existentes (PropertyCard, PropertyTable, PropertyDrawer, PropertyKanban).

Purpose: Os dados reais de imoveis da Jurema Brokers estao na tabela `imoveis` (populada pelo workflow n8n Ler Imoveis JetEngine). O frontend ainda busca da tabela `properties` que esta vazia/desatualizada.
Output: ImoveisClient.tsx atualizado com fetch correto + transformacao + fallbacks seguros.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@src/components/yzihub/ImoveisClient.tsx
@src/types/properties.ts
@src/components/yzihub/PropertyCard.tsx
@src/components/yzihub/PropertyTable.tsx

<interfaces>
<!-- Tabela `imoveis` no Supabase (18 campos reais, conforme workflow 260408-2i3): -->
<!-- tenant_id, id_imovel, titulo_comercial, titulo_seo, descricao_imovel, bairro, -->
<!-- tipo_de_imovel, finalidade, valor, condominio, metragem, quartos, suites, vagas, -->
<!-- foto_principal, link_do_imovel, link_redes_sociais, status_publicacao -->

<!-- tenant_id Jurema Brokers: 82cc7aa9-fc6e-4f37-8d8e-8a71c1691361 -->

<!-- foto_principal e um campo JSON com estrutura { url: string, ... } -->

<!-- Mapeamento exigido pelo usuario: -->
<!-- titulo_comercial -> title (Property.title) -->
<!-- bairro -> neighborhood (Property.neighborhood) -->
<!-- valor -> price (Property.price) -->
<!-- quartos -> Property (exibir como info adicional) -->
<!-- vagas -> Property (exibir como info adicional) -->
<!-- foto_principal.url -> photo_url (Property.photo_url) -->

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
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Reescrever fetch do ImoveisClient para tabela imoveis com transformacao</name>
  <files>src/components/yzihub/ImoveisClient.tsx</files>
  <action>
Alterar APENAS o useEffect de fetch em ImoveisClient.tsx. NAO alterar layout, NAO criar componentes, NAO refatorar arquitetura.

1. Trocar `.from("properties")` por `.from("imoveis")`.

2. Trocar `.eq("tenant_id", tenant!.id)` por `.eq("tenant_id", "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361")` (hardcoded conforme instrucao do usuario — tenant Jurema Brokers).

3. Adicionar filtro `.eq("status_publicacao", "Publicado")`.

4. Manter `.order("created_at", { ascending: false })`.

5. Selecionar apenas os campos necessarios no `.select()`:
   `id, tenant_id, titulo_comercial, bairro, valor, quartos, suites, vagas, metragem, tipo_de_imovel, finalidade, foto_principal, link_do_imovel, status_publicacao, descricao_imovel, created_at`

6. Criar funcao `mapImoveisToProperty` DENTRO do mesmo arquivo (acima do componente) que transforma cada row da tabela `imoveis` para o tipo Property:
   ```typescript
   interface ImoveisRow {
     id: string;
     tenant_id: string;
     titulo_comercial: string | null;
     bairro: string | null;
     valor: number | null;
     quartos: number | null;
     suites: number | null;
     vagas: number | null;
     metragem: number | null;
     tipo_de_imovel: string | null;
     finalidade: string | null;
     foto_principal: { url?: string } | string | null;
     link_do_imovel: string | null;
     status_publicacao: string | null;
     descricao_imovel: string | null;
     created_at: string | null;
   }

   function mapImoveisToProperty(row: ImoveisRow): Property {
     // Extrair URL da foto_principal (pode ser JSON object ou string)
     let photoUrl: string | null = null;
     if (row.foto_principal) {
       if (typeof row.foto_principal === 'string') {
         try {
           const parsed = JSON.parse(row.foto_principal);
           photoUrl = parsed?.url ?? null;
         } catch {
           photoUrl = row.foto_principal; // pode ser URL direta
         }
       } else if (typeof row.foto_principal === 'object' && row.foto_principal !== null) {
         photoUrl = (row.foto_principal as { url?: string }).url ?? null;
       }
     }

     return {
       id: row.id,
       tenant_id: row.tenant_id,
       title: row.titulo_comercial ?? "Sem titulo",
       photo_url: photoUrl,
       price: row.valor ?? 0,
       location: row.bairro ?? "Localizacao nao informada",
       area_sqm: row.metragem ?? null,
       status: "available" as const,
       link: row.link_do_imovel ?? null,
       notes: row.descricao_imovel ?? null,
       created_at: row.created_at ?? new Date().toISOString(),
       updated_at: row.created_at ?? new Date().toISOString(),
       property_type: row.tipo_de_imovel ?? null,
       construction_status: null,
       publication_status: row.status_publicacao ?? null,
       tags: [
         row.quartos != null ? `${row.quartos}Q` : null,
         row.suites != null && row.suites > 0 ? `${row.suites}S` : null,
         row.vagas != null ? `${row.vagas}V` : null,
       ].filter((t): t is string => t !== null),
       neighborhood: row.bairro ?? null,
       purpose: row.finalidade ?? null,
       external_id: null,
       source: null,
       description: row.descricao_imovel ?? null,
       images: null,
       features: null,
       score: null,
       priority: null,
       kanban_stage: null,
     };
   }
   ```

7. No useEffect, apos receber `data`, mapear: `setProperties((data as ImoveisRow[]).map(mapImoveisToProperty))`.

8. Garantir que TODOS os campos tem fallback seguro (sem undefined). O `?? 0`, `?? null`, `?? "Sem titulo"` cobrem isso.

9. NAO alterar nenhum outro aspecto do componente: filtros, views, toggle, skeleton, JSX, imports de sub-componentes.

10. O PropertyDrawer salva em `properties` — isso esta OK por enquanto pois o drawer e read-mostly neste contexto. NAO alterar o drawer.
  </action>
  <verify>
    <automated>cd D:/dev/plataforma && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>ImoveisClient.tsx busca da tabela `imoveis` filtrada por tenant_id e status_publicacao='Publicado', transforma campos (titulo_comercial->title, bairro->neighborhood, valor->price, foto_principal.url->photo_url, quartos/vagas como tags), todos com fallback seguro. TypeScript compila sem erros. Layout e componentes inalterados.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Fetch da tabela imoveis conectado ao frontend com transformacao de campos e fallbacks seguros.</what-built>
  <how-to-verify>
    1. Abrir http://localhost:3000/cockpit/imoveis
    2. Verificar que a tabela carrega imoveis reais (titulos como "Apartamento Cabo Branco", precos em BRL, fotos)
    3. Verificar que filtro por bairro funciona
    4. Clicar em um imovel — drawer deve abrir com dados corretos
    5. Alternar para view "Grade" — cards devem mostrar foto, titulo, preco, tags (3Q, 2V etc)
    6. Verificar que imoveis com status_publicacao diferente de "Publicado" NAO aparecem
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` compila sem erros
- Pagina /cockpit/imoveis renderiza dados reais da tabela `imoveis`
- Apenas imoveis Publicados do tenant Jurema aparecem
- Nenhum undefined visivel na UI
- Foto fallback (placeholder) aparece para imoveis sem foto_principal
</verification>

<success_criteria>
- Tabela, grid e kanban exibem imoveis reais da tabela `imoveis` do Supabase
- Campos mapeados corretamente: titulo_comercial->title, bairro->bairro, valor->preco, foto_principal.url->photo_url
- Filtro tenant_id e status_publicacao aplicados
- Zero erros TypeScript
- Zero undefined na UI
</success_criteria>

<output>
After completion, create `.planning/quick/260408-jhi-conectar-tabela-imoveis-ao-frontend-yzi/260408-jhi-SUMMARY.md`
</output>
