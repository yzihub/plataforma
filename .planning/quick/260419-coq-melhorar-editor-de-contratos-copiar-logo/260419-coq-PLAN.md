---
phase: quick-260419-coq
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - public/images/jurema/logo-white.svg
  - public/images/jurema/logo-black.svg
  - src/components/yzihub/Contratos/ContratoEditor.tsx
  - src/components/yzihub/Contratos/ContratoEditorSidebar.tsx
  - src/components/yzihub/Contratos/ContratoEditorPreview.tsx
autonomous: true
requirements:
  - COQ-01
  - COQ-02
  - COQ-03
  - COQ-04

must_haves:
  truths:
    - "Logos Jurema Brokers (branca e preta) estao acessiveis em /images/jurema/ via URL publica"
    - "Ao abrir /cockpit/contratos/novo sem params (leadId, propertyId, brokerId null) o editor carrega automaticamente lead/imovel/corretor mock estaticos e o preview renderiza com eles"
    - "Na sidebar o usuario consegue selecionar um Lead, um Imovel e um Corretor reais via dropdown de busca alimentado pelas APIs /api/leads, /api/imoveis e /api/brokers"
    - "Ao selecionar um item real no dropdown, o ContratoEditor atualiza os estados lead/property/broker e o preview usa os dados selecionados"
    - "O preview direito aparece como uma folha branca (fundo branco mesmo no dark mode) com sombra, margem interna ~40px e logo Jurema no topo centralizada (branca no dark, preta no light)"
    - "O corpo do contrato dentro da folha usa fonte serif, whitespace-pre-wrap e tamanho legivel proximo ao de documento Word"
  artifacts:
    - path: "public/images/jurema/logo-white.svg"
      provides: "Logo Jurema Brokers branca para uso em dark mode"
    - path: "public/images/jurema/logo-black.svg"
      provides: "Logo Jurema Brokers preta para uso em light mode"
    - path: "src/components/yzihub/Contratos/ContratoEditor.tsx"
      provides: "Constantes MOCK_LEAD/MOCK_PROPERTY/MOCK_BROKER; fallback automatico quando IDs sao null; handlers onSelectLead/onSelectProperty/onSelectBroker repassados a sidebar"
    - path: "src/components/yzihub/Contratos/ContratoEditorSidebar.tsx"
      provides: "Tres dropdowns de busca (Lead/Imovel/Corretor) com fetch lazy nas APIs e callbacks de selecao"
    - path: "src/components/yzihub/Contratos/ContratoEditorPreview.tsx"
      provides: "Preview em formato 'folha de papel' com logo Jurema no topo (dark/light aware) e tipografia estilo Word"
  key_links:
    - from: "src/components/yzihub/Contratos/ContratoEditorSidebar.tsx"
      to: "/api/leads, /api/imoveis?status_publicacao=Publicado, /api/brokers"
      via: "fetch lazy ao abrir ou digitar no dropdown"
      pattern: "fetch.*api/(leads|imoveis|brokers)"
    - from: "src/components/yzihub/Contratos/ContratoEditor.tsx"
      to: "ContratoEditorSidebar (onSelectLead/onSelectProperty/onSelectBroker)"
      via: "callbacks que chamam setLead/setProperty/setBroker"
      pattern: "onSelectLead|onSelectProperty|onSelectBroker"
    - from: "src/components/yzihub/Contratos/ContratoEditorPreview.tsx"
      to: "/images/jurema/logo-white.svg e /images/jurema/logo-black.svg"
      via: "<img src=... /> com alternancia dark:hidden / hidden dark:block"
      pattern: "/images/jurema/logo-(white|black).svg"
---

<objective>
Transformar o editor de contratos de um formulario estatico em uma experiencia de autoria completa: (1) seletores reais de Lead/Imovel/Corretor vindos do banco, (2) mocks automaticos quando nao ha IDs na URL para facilitar teste visual, e (3) preview que parece uma folha de papel com a logo da Jurema Brokers no topo, simulando o documento impresso.

Purpose: hoje, quando o corretor acessa /cockpit/contratos/novo sem parametros, o editor fica "nao vinculado" e nao consegue ser testado; alem disso o preview em `<pre>` nao transmite a sensacao de documento formal. Essa entrega resolve os dois pontos e prepara terreno para gerar PDF com layout correspondente ao preview.

Output: 3 componentes atualizados + 2 assets (logos) copiados + fluxo funcional de selecao/edicao/preview.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md
@src/components/yzihub/Contratos/ContratoEditor.tsx
@src/components/yzihub/Contratos/ContratoEditorSidebar.tsx
@src/components/yzihub/Contratos/ContratoEditorPreview.tsx
@src/app/cockpit/contratos/novo/page.tsx
@src/lib/crm/types.ts

<interfaces>
<!-- Tipos ja existentes em ContratoEditor.tsx / ContratoEditorSidebar.tsx. Reutilize-os nos dropdowns e mocks. -->

From src/lib/crm/types.ts:
```typescript
export interface Lead {
  id: string
  tenant_id: string
  name: string
  email: string | null
  phone: string | null
  value: number
  status: LeadStatus
  // ... outros campos opcionais (ver arquivo)
}
```

From src/components/yzihub/Contratos/ContratoEditor.tsx (duplicar/exportar se necessario):
```typescript
interface PropertyData {
  id: string;
  titulo_comercial: string;
  bairro: string | null;
  valor: number;
}

interface BrokerData {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}
```

APIs disponiveis (GET):
- /api/leads                                  -> { leads: Lead[] } (filtrado por tenant)
- /api/leads/[id]                             -> Lead
- /api/imoveis?status_publicacao=Publicado    -> lista de imoveis (ver route.ts para shape exato; mapear para PropertyData)
- /api/imoveis/[id]                           -> PropertyData
- /api/brokers                                -> { brokers: BrokerData[] } (ativos)
- /api/brokers/[id]                           -> BrokerData

Logos origem (copiar de):
- d:/YZIHUB/CLAUDE/JUREMA BROKERS/MARCA/logobranca.svg  -> public/images/jurema/logo-white.svg
- d:/YZIHUB/CLAUDE/JUREMA BROKERS/MARCA/logopreta.svg   -> public/images/jurema/logo-black.svg
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Copiar logos Jurema Brokers para public/</name>
  <files>public/images/jurema/logo-white.svg, public/images/jurema/logo-black.svg</files>
  <action>
    Copiar os dois arquivos SVG da marca Jurema para a pasta publica do Next.js.

    1. Criar diretorio: `mkdir -p public/images/jurema`
    2. Copiar os arquivos (usar cp no bash git-bash/unix-style):
       - `cp "d:/YZIHUB/CLAUDE/JUREMA BROKERS/MARCA/logobranca.svg" public/images/jurema/logo-white.svg`
       - `cp "d:/YZIHUB/CLAUDE/JUREMA BROKERS/MARCA/logopreta.svg" public/images/jurema/logo-black.svg`
    3. NAO renomear para logobranca/logopreta — padronizar em ingles (logo-white/logo-black) para alinhar com convencao do projeto (public/images/logo/).
    4. Nao comitar os .png originais — apenas os .svg sao necessarios (escalam sem perda).

    Atencao: o arquivo origem esta no disco `d:/YZIHUB/` (fora do repo). Se o comando cp falhar por conta de espacos no path, usar aspas ao redor do path inteiro.
  </action>
  <verify>
    <automated>test -f public/images/jurema/logo-white.svg && test -f public/images/jurema/logo-black.svg && echo OK</automated>
  </verify>
  <done>Os dois arquivos SVG existem em public/images/jurema/ e podem ser servidos via URL /images/jurema/logo-white.svg e /images/jurema/logo-black.svg.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Seletores de Lead/Imovel/Corretor na Sidebar + Mocks no ContratoEditor</name>
  <files>src/components/yzihub/Contratos/ContratoEditor.tsx, src/components/yzihub/Contratos/ContratoEditorSidebar.tsx</files>
  <action>
    Transformar os campos read-only da sidebar em dropdowns com busca ligados as APIs reais, e introduzir dados mock automaticos quando nao ha IDs na URL.

    ---------- A) ContratoEditor.tsx ----------

    1. No topo do arquivo (depois dos tipos, antes do componente), adicionar constantes mock:
       ```typescript
       const MOCK_LEAD: Lead = {
         id: "mock-lead-001",
         tenant_id: "mock-tenant",
         stage_id: null,
         name: "Joao Silva (Mock)",
         email: "joao.mock@example.com",
         phone: "(21) 99999-0001",
         company: null,
         source: null,
         status: "qualified",
         score: 80,
         value: 850000,
         notes: null,
         assigned_to: null,
         last_action_at: null,
         created_at: new Date().toISOString(),
       };
       const MOCK_PROPERTY: PropertyData = {
         id: "mock-prop-001",
         titulo_comercial: "Sitio Sao Joao (Mock)",
         bairro: "Vargem Grande",
         valor: 850000,
       };
       const MOCK_BROKER: BrokerData = {
         id: "mock-broker-001",
         full_name: "Luana Corretor (Mock)",
         email: "luana.mock@juremabrokers.com",
         phone: "(21) 99999-0002",
       };
       ```
       Observacao: Lead precisa dos campos obrigatorios definidos em @src/lib/crm/types.ts — se o TS reclamar de campo ausente, preencher com null/default razoavel.

    2. Ajustar o useEffect de carregamento (loadAll):
       - Se `leadId` for null E `lead` ainda nao foi setado manualmente: `setLead(MOCK_LEAD)`.
       - Se `propertyId` for null E `property` nao foi setado: `setProperty(MOCK_PROPERTY)`.
       - Se `brokerId` for null E `broker` nao foi setado: `setBroker(MOCK_BROKER)`.
       Importante: so aplicar o mock UMA VEZ no mount inicial. Se o usuario depois selecionar um item real pelo dropdown, NAO sobrescrever. Use uma ref/flag `mocksApplied` OU: aplique os mocks sincronamente antes do `Promise.all` e, nos ifs de fetch (leadId ? ...), continue como esta — a selecao pelo dropdown vai setar lead/property/broker via callback e substituir o mock.

    3. Adicionar tres callbacks e passar para a Sidebar:
       ```typescript
       const handleSelectLead     = useCallback((l: Lead | null) => setLead(l), []);
       const handleSelectProperty = useCallback((p: PropertyData | null) => setProperty(p), []);
       const handleSelectBroker   = useCallback((b: BrokerData | null) => setBroker(b), []);
       ```

    4. Na renderizacao da `<ContratoEditorSidebar ... />` passar:
       ```tsx
       onSelectLead={handleSelectLead}
       onSelectProperty={handleSelectProperty}
       onSelectBroker={handleSelectBroker}
       ```

    5. Importante: o `valor` usado em `handleSaveDraft` / `handleGenerateAndSend` ja usa `property?.valor ?? lead?.value ?? 0` — nao precisa alterar; funcionara com os mocks (850000) e com selecao real.

    ---------- B) ContratoEditorSidebar.tsx ----------

    1. Expandir a interface `ContratoEditorSidebarProps` adicionando:
       ```typescript
       onSelectLead?: (lead: Lead | null) => void;
       onSelectProperty?: (property: PropertyData | null) => void;
       onSelectBroker?: (broker: BrokerData | null) => void;
       ```

    2. No bloco "Dados pre-preenchidos", substituir os tres `<div className={readonlyCls}>...</div>` por um componente interno `SearchSelect<T>` (pode ser simples — nao precisa extrair para arquivo separado, criar no mesmo modulo). Requisitos:
       - Input de texto com placeholder "Buscar {label}..." e valor inicial = item.name/titulo_comercial/full_name se houver item selecionado.
       - Ao focar OU digitar: faz fetch lazy na API correspondente (so a primeira vez, depois guarda em state local `items` e filtra client-side por includes/toLowerCase).
       - Dropdown `<ul>` abaixo do input com no maximo 8 items visiveis, overflow scroll.
       - Clique em item → chama `onSelect(item)` e fecha o dropdown; o input mostra o label do item.
       - Botao "x" pequeno para limpar a selecao → `onSelect(null)`.
       - Click-outside fecha o dropdown (useRef + useEffect com listener em document).

    3. Tres instancias do SearchSelect:
       - Lead → GET /api/leads → extrair `data.leads` (ou `data` se a resposta for array direto — inspecionar a rota se necessario), label = `lead.name`, mapear para Lead type. onSelect → `onSelectLead(item)`.
       - Imovel → GET /api/imoveis?status_publicacao=Publicado → extrair array de imoveis, label = `imovel.titulo_comercial`, mapear para PropertyData (campos: id, titulo_comercial, bairro, valor). onSelect → `onSelectProperty(item)`.
       - Corretor → GET /api/brokers → extrair `data.brokers`, label = `broker.full_name`, mapear para BrokerData. onSelect → `onSelectBroker(item)`.

    4. Manter os campos "Valor" e "Comissao (5% auto)" como read-only — continuam derivando de `lead?.value` (o ContratoEditor ja trata o fallback para `property?.valor`).

    5. Estilos: reaproveitar `inputCls` para o input do SearchSelect. Dropdown deve usar classes TailAdmin-dark: `absolute z-10 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg max-h-64 overflow-y-auto` + items com `px-3 py-2 hover:bg-brand-50 dark:hover:bg-brand-500/10 cursor-pointer`.

    6. Se o lead/property/broker vier das props mas o input estiver vazio (primeira renderizacao), sincronizar: `useEffect(() => setQuery(lead?.name ?? ""), [lead])` em cada SearchSelect.

    7. Importar `Lead` de `@/lib/crm/types` ja existe; importar/declarar `PropertyData` e `BrokerData` do mesmo arquivo (ja declarados no .tsx atual — mantem como esta).

    ATENCAO — Lei da Variedade Visual (CLAUDE.md): nao replicar padroes da DataTable aqui. Manter estilo proprio de combobox sidebar — pequeno, focado, limpo. Usar classes TailAdmin dark ja presentes no arquivo.

    ATENCAO — Multi-tenant: as APIs ja filtram por tenant_id server-side (ver rotas existentes). Nao adicionar filtros client-side redundantes.
  </action>
  <verify>
    <automated>npx tsc --noEmit -p . 2>&1 | head -40</automated>
    <manual>Abrir /cockpit/contratos/novo (sem params) → sidebar mostra "Joao Silva (Mock)", "Sitio Sao Joao (Mock)", "Luana Corretor (Mock)" + valor R$ 850.000,00. Clicar no input de Lead → dropdown abre com leads reais do banco; selecionar um → sidebar e preview atualizam.</manual>
  </verify>
  <done>
    - Sidebar tem 3 comboboxes funcionais (Lead/Imovel/Corretor) com fetch real das APIs.
    - Quando leadId/propertyId/brokerId sao null na URL, os mocks aparecem automaticamente (nome "(Mock)" visivel).
    - Selecionar um item real substitui o mock e atualiza o preview.
    - `npx tsc --noEmit` passa sem novos erros.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Preview estilo documento Word (folha de papel + logo Jurema)</name>
  <files>src/components/yzihub/Contratos/ContratoEditorPreview.tsx</files>
  <action>
    Transformar o preview de `<pre>` texto plano em uma "folha de papel" com logo da Jurema no topo, simulando o documento final.

    Layout alvo:
    - Container externo: fundo cinza claro (simula mesa/desktop), flex center horizontal, scroll vertical. Classes base: `flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-800 px-6 py-8`.
    - Folha (div interna):
      * Fundo branco SEMPRE (mesmo no dark mode — papel e branco): `bg-white`.
      * Largura maxima estilo A4 reduzida: `max-w-[640px] mx-auto`.
      * Min-height generoso: `min-h-[800px]`.
      * Padding interno: `px-12 py-10` (≈ 40px equivale a p-10, tem folga visual).
      * Sombra forte: `shadow-lg`.
      * Borda sutil: `border border-gray-200`.
      * Rounded suave: `rounded-sm` (papel nao tem arredondamento forte).
    - Topo da folha: bloco centralizado com:
      * Logo Jurema Brokers preta via `<img src="/images/jurema/logo-black.svg" alt="Jurema Brokers" className="h-12 mx-auto" />`.
      * Como o fundo da folha e sempre branco, usar SEMPRE a logo PRETA (logo-black.svg). Nao alternar dark/light aqui — a folha simula papel impresso, que e branco em ambos os temas.
      * Margem abaixo da logo: `mb-2`.
      * Linha decorativa fina sob a logo: `<div className="mx-auto h-px w-24 bg-gray-300 mb-6" />`.
    - Corpo do contrato: trocar `<pre>` por `<div>` com:
      * `whitespace-pre-wrap` para preservar quebras.
      * `font-serif text-[14px] leading-relaxed text-gray-900`.
      * Texto sempre preto (nao usar dark:text-... — estamos sobre papel branco).

    Codigo alvo (referencia):
    ```tsx
    return (
      <div className="flex flex-col h-full border-l border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">Preview</span>
        </div>
        <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-800 px-6 py-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-600">
          <div className="mx-auto max-w-[640px] min-h-[800px] bg-white border border-gray-200 rounded-sm shadow-lg px-12 py-10">
            {/* Cabecalho documento */}
            <div className="text-center mb-8">
              <img src="/images/jurema/logo-black.svg" alt="Jurema Brokers" className="h-12 mx-auto mb-2" />
              <div className="mx-auto h-px w-24 bg-gray-300" />
            </div>
            {/* Corpo */}
            {body ? (
              <div className="whitespace-pre-wrap font-serif text-[14px] leading-relaxed text-gray-900">
                {body}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic text-center mt-20">
                Selecione um template para ver o preview
              </p>
            )}
          </div>
        </div>
      </div>
    );
    ```

    Notas:
    - NAO usar next/image para a logo — e um SVG estatico pequeno em /public, `<img>` e mais simples e evita overhead.
    - Se o lint do projeto reclamar de `<img>` (rule @next/next/no-img-element), adicionar comentario `{/* eslint-disable-next-line @next/next/no-img-element */}` na linha acima do img.
    - Scrollbar custom ja aplicada herda do container externo.
    - Header "Preview" fica fora da folha (continua com fundo dark/light neutro).
  </action>
  <verify>
    <automated>npx tsc --noEmit -p . 2>&1 | head -40</automated>
    <manual>Abrir /cockpit/contratos/novo, selecionar um template → coluna direita exibe "folha branca" centralizada com logo Jurema preta no topo, linha decorativa e texto do contrato em fonte serif. Trocar tema (dark/light): a folha permanece branca; o fundo ao redor da folha alterna cinza claro/escuro.</manual>
  </verify>
  <done>
    - ContratoEditorPreview renderiza uma "folha" branca com shadow, padding interno amplo, logo Jurema preta centralizada no topo e corpo do contrato em serif.
    - A folha permanece branca tanto em dark quanto em light (simula papel).
    - `npx tsc --noEmit` passa sem novos erros.
  </done>
</task>

</tasks>

<verification>
- Dev server (`npm run dev` ou equivalente) compila sem erros novos.
- `npx tsc --noEmit` sem novos erros.
- Visual: preview parece folha de papel; sidebar tem 3 dropdowns funcionais; mocks aparecem quando IDs sao null.
</verification>

<success_criteria>
1. Arquivos `public/images/jurema/logo-white.svg` e `public/images/jurema/logo-black.svg` existem.
2. Abrir /cockpit/contratos/novo SEM parametros mostra Joao Silva (Mock) / Sitio Sao Joao (Mock) / Luana Corretor (Mock) automaticamente, valor R$ 850.000,00, e o preview renderiza com esses mocks.
3. Os 3 dropdowns (Lead/Imovel/Corretor) carregam itens reais do banco via GET /api/leads, /api/imoveis?status_publicacao=Publicado e /api/brokers.
4. Selecionar item real substitui o mock — sidebar e preview atualizam em tempo real.
5. Preview exibe folha branca (mesmo em dark mode) com logo Jurema preta centralizada no topo, linha decorativa, corpo em serif ~14px, shadow-lg, padding interno ~40px.
6. `npx tsc --noEmit` nao introduz erros novos.
</success_criteria>

<output>
After completion, create `.planning/quick/260419-coq-melhorar-editor-de-contratos-copiar-logo/260419-coq-SUMMARY.md` registrando:
- Arquivos modificados (3 componentes + 2 assets).
- Decisoes: logos padronizadas em ingles (logo-white/logo-black); folha sempre branca (logo preta fixa); mocks aplicados apenas quando ID=null no mount.
- Screenshots ou descricao visual do resultado final.
</output>
