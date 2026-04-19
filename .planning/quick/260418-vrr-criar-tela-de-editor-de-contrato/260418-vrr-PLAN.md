---
phase: quick-260418-vrr
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/types/contract-templates.ts
  - src/lib/contracts/templates.ts
  - src/app/api/contracts/templates/route.ts
  - src/app/api/contracts/draft/route.ts
  - src/app/api/contracts/[id]/pdf/route.ts
  - src/app/cockpit/contratos/novo/page.tsx
  - src/components/yzihub/Contratos/ContratoEditor.tsx
  - src/components/yzihub/Contratos/ContratoEditorPreview.tsx
  - src/components/yzihub/Contratos/ContratoEditorSidebar.tsx
  - src/components/yzihub/Contratos/GerarContratoDrawer.tsx
autonomous: true
requirements:
  - QUICK-260418-VRR-01  # Tela editor completa em /cockpit/contratos/novo
  - QUICK-260418-VRR-02  # Templates carregaveis (compra_venda, locacao, exclusividade)
  - QUICK-260418-VRR-03  # Pre-preenchimento real de lead/imovel/corretor/valor/comissao
  - QUICK-260418-VRR-04  # Edicao manual + preview lateral
  - QUICK-260418-VRR-05  # Acoes salvar rascunho, gerar PDF, gerar e enviar
  - QUICK-260418-VRR-06  # Substituir/adaptar GerarContratoDrawer para abrir nova tela

must_haves:
  truths:
    - "Usuario navega para /cockpit/contratos/novo?lead_id=X&property_id=Y&broker_id=Z e ve a tela do editor"
    - "Usuario seleciona um template (compra_venda_padrao, locacao, exclusividade) e o texto base e carregado no editor"
    - "Campos comprador, imovel, corretor, valor e comissao 5% aparecem pre-preenchidos com dados reais do banco"
    - "Usuario pode editar livremente o texto do contrato no textarea"
    - "Preview lateral atualiza em tempo real conforme o usuario edita"
    - "Botao 'Salvar Rascunho' persiste o contrato em contracts com status='rascunho' e o body editado em notes/conteudo"
    - "Botao 'Gerar e Enviar' enfileira no job_queue (action='gerar_contrato') com o body final"
    - "GerarContratoDrawer existente passa a redirecionar para /cockpit/contratos/novo em vez de submeter direto"
    - "Contrato gerado fica indexado em lead_id, project_id (imovel) e broker_id"
  artifacts:
    - path: "src/types/contract-templates.ts"
      provides: "ContractTemplate type + CONTRACT_TEMPLATES catalog (id, label, body com placeholders {{comprador}}, {{imovel}}, {{valor}}, etc)"
      min_lines: 40
    - path: "src/lib/contracts/templates.ts"
      provides: "Helper renderTemplate(templateId, vars) que substitui placeholders pelo dado real"
      min_lines: 20
    - path: "src/app/api/contracts/templates/route.ts"
      provides: "GET endpoint que lista templates disponiveis"
      exports: ["GET"]
    - path: "src/app/api/contracts/draft/route.ts"
      provides: "POST endpoint que salva rascunho em contracts com body editado"
      exports: ["POST"]
    - path: "src/app/cockpit/contratos/novo/page.tsx"
      provides: "Rota Next.js que monta ContratoEditor com searchParams (lead_id, property_id, broker_id)"
      contains: "ContratoEditor"
    - path: "src/components/yzihub/Contratos/ContratoEditor.tsx"
      provides: "Componente principal do editor — tres colunas (sidebar, textarea, preview), padrao TailAdmin dark"
      min_lines: 150
    - path: "src/components/yzihub/Contratos/ContratoEditorSidebar.tsx"
      provides: "Painel esquerdo com seletor de template + dados pre-preenchidos readonly"
      min_lines: 60
    - path: "src/components/yzihub/Contratos/ContratoEditorPreview.tsx"
      provides: "Painel direito com preview formatado do texto do contrato"
      min_lines: 40
  key_links:
    - from: "src/app/cockpit/contratos/novo/page.tsx"
      to: "src/components/yzihub/Contratos/ContratoEditor.tsx"
      via: "import default + searchParams pass-through"
      pattern: "import.*ContratoEditor"
    - from: "src/components/yzihub/Contratos/ContratoEditor.tsx"
      to: "/api/contracts/templates"
      via: "fetch GET no useEffect inicial"
      pattern: "fetch.*api/contracts/templates"
    - from: "src/components/yzihub/Contratos/ContratoEditor.tsx"
      to: "/api/leads/[id], /api/imoveis, /api/brokers/[id]"
      via: "fetch paralelo no useEffect para hidratar lead/imovel/corretor"
      pattern: "fetch.*api/(leads|imoveis|brokers)"
    - from: "src/components/yzihub/Contratos/ContratoEditor.tsx"
      to: "/api/contracts/draft (rascunho) e /api/contracts/generate (gerar+enviar)"
      via: "fetch POST nos botoes do footer"
      pattern: "fetch.*api/contracts/(draft|generate)"
    - from: "src/components/yzihub/Contratos/GerarContratoDrawer.tsx"
      to: "/cockpit/contratos/novo"
      via: "router.push com query params (lead_id, property_id, broker_id)"
      pattern: "router\\.push.*contratos/novo"
---

<objective>
Substituir o fluxo atual de `GerarContratoDrawer` (drawer com formulario rigido) por uma tela completa de editor de contrato em `/cockpit/contratos/novo`. A tela carrega templates, pre-preenche dados reais (lead, imovel, corretor, valor, comissao 5%), permite edicao livre do texto, mostra preview ao lado, e oferece tres acoes: Salvar Rascunho, Gerar PDF, Gerar e Enviar.

Purpose: Hoje o operador nao consegue revisar nem ajustar o texto do contrato antes de enviar. A tela de editor da poder de revisao ao corretor sem perder o pre-preenchimento automatico.

Output: Nova rota `/cockpit/contratos/novo`, componente `ContratoEditor` (3 colunas), API de templates, API de draft, e GerarContratoDrawer convertido em "trampolim" para a nova tela.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md
@src/components/yzihub/Contratos/GerarContratoDrawer.tsx
@src/components/yzihub/Contratos/ContractsClient.tsx
@src/app/api/contracts/route.ts
@src/app/api/contracts/generate/route.ts
@src/types/contracts.ts
@src/lib/crm/types.ts
@src/types/n8n-payloads.ts

<interfaces>
<!-- Contratos jah existem no schema. Reaproveitar tipos. -->

From src/types/contracts.ts:
```typescript
export type ContractStatus = 'pendente' | 'assinado' | 'cancelado' | 'rascunho' | 'expirado'
export type ContractType   = 'venda' | 'locacao' | 'servico' | 'parceria'

export interface Contract {
  id: string
  tenant_id: string
  lead_id: string
  lead_name: string
  project_id?: string | null
  project_name?: string | null
  corretor_id?: string | null
  corretor_name?: string | null
  title?: string | null
  type: ContractType
  status: ContractStatus
  value: number
  notes?: string | null
  // ...
}
```

From src/lib/crm/types.ts:
```typescript
export interface Lead {
  id: string
  tenant_id: string
  name: string
  email: string | null
  phone: string | null
  value: number
  imovel_ref?: string | null    // id do imovel vinculado
  // ...
}
```

From src/app/api/contracts/generate/route.ts (POST endpoint que ja faz insert + job_queue):
- Aceita: { lead_id, property_id, broker_id, modelo, comprador, vendedor, imovel, corretor, valor, forma_pagamento, comissao, observacoes, canais }
- Insere em `contracts` com commission_percentage=5, commission_amount=value*0.05
- Insere em `job_queue` com action='gerar_contrato'
- A nova tela deve continuar usando este endpoint para "Gerar e Enviar"

GerarContratoDrawer atual:
- Recebe props: { isOpen, onClose, lead, brokerId, brokerName, propertyId, propertyTitle }
- Usa Tailwind dark + classes (inputCls, labelCls, readonlyCls) — REUTILIZAR no editor
</interfaces>

NOTA: A tabela `contracts` ja existe e tem coluna `notes` (text). Usar `notes` para armazenar o corpo editado do contrato (sem precisar de migration). Caso haja necessidade de coluna dedicada `body`/`content`, deixar TODO no codigo e usar `notes` por enquanto.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Criar templates de contrato + API de templates + API de draft</name>
  <files>src/types/contract-templates.ts, src/lib/contracts/templates.ts, src/app/api/contracts/templates/route.ts, src/app/api/contracts/draft/route.ts</files>
  <action>
Criar a infraestrutura de dados/endpoints que o editor vai consumir. NAO mexer ainda na UI.

**1. `src/types/contract-templates.ts`** — declarar tipos e catalogo:
```typescript
export interface ContractTemplate {
  id: string;            // 'compra_venda_padrao' | 'locacao' | 'exclusividade'
  label: string;         // 'Compra e Venda — Padrao'
  type: 'venda' | 'locacao' | 'servico' | 'parceria';
  body: string;          // texto com placeholders {{comprador}}, {{imovel}}, {{valor}}, {{corretor}}, {{comissao}}, {{data}}
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  { id: 'compra_venda_padrao', label: 'Compra e Venda — Padrao', type: 'venda',   body: '...' },
  { id: 'locacao',             label: 'Locacao Residencial',     type: 'locacao', body: '...' },
  { id: 'exclusividade',       label: 'Exclusividade de Venda',  type: 'servico', body: '...' },
];
```
Cada `body` deve ter ~30-60 linhas de texto juridico-base com placeholders `{{var}}`. Texto pode ser generico ("CONTRATO PARTICULAR DE COMPRA E VENDA DE IMOVEL... O VENDEDOR... O COMPRADOR {{comprador}}... pelo valor de R$ {{valor}}... corretor responsavel: {{corretor}}, comissao de R$ {{comissao}}...") — nao precisa ser revisado por advogado, e ponto de partida editavel.

**2. `src/lib/contracts/templates.ts`** — helper de render:
```typescript
import { CONTRACT_TEMPLATES, type ContractTemplate } from '@/types/contract-templates';

export function getTemplate(id: string): ContractTemplate | null {
  return CONTRACT_TEMPLATES.find(t => t.id === id) ?? null;
}

export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}
```

**3. `src/app/api/contracts/templates/route.ts`** — GET endpoint:
- Sem auth gating (templates sao estaticos, mesmos para todos os tenants)
- Retorna `{ templates: ContractTemplate[] }` (lista do catalogo, sem o body completo — apenas id, label, type — para reduzir payload)
- Adicionar query param opcional `?id=X` que retorna template completo COM body

**4. `src/app/api/contracts/draft/route.ts`** — POST endpoint:
- Auth + tenant lookup (copiar pattern de `src/app/api/contracts/route.ts`)
- Body esperado: `{ lead_id, property_id, broker_id, modelo, comprador, imovel, corretor, valor, comissao, body }` (body = texto editado)
- Validar lead_id, property_id, broker_id obrigatorios (mesma regra do /generate)
- Calcular `commission_amount = valor * 0.05`
- Insert em `contracts` com:
  - status='rascunho'
  - lead_id, project_id=property_id, broker_id, lead_name, project_name, corretor_name, title, type, value, commission_percentage=5, commission_amount
  - notes = body (texto editado completo)
- NAO inserir em job_queue (rascunho nao dispara n8n)
- Retornar contrato criado em N8nEnvelope (usar `buildN8nEnvelope` + `toN8nContract` igual `route.ts`)
- Status 201 em sucesso

REGRAS:
- Componentes/codigo apenas em paths existentes (sem criar pastas raiz novas)
- Usar `createClient` de `@/lib/supabase/server`
- Seguir o padrao de tratamento de erro/log (`console.error("[POST /api/contracts/draft] ...")`)
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
    Manual: `curl http://localhost:3000/api/contracts/templates` retorna `{ templates: [...] }` com 3 entradas (compra_venda_padrao, locacao, exclusividade). `curl http://localhost:3000/api/contracts/templates?id=compra_venda_padrao` retorna o template completo com body.
  </verify>
  <done>
    - Tipos exportados sem erro de TS
    - GET /api/contracts/templates retorna 3 templates
    - GET /api/contracts/templates?id=X retorna body completo
    - POST /api/contracts/draft cria registro em contracts com status='rascunho' e notes=body editado
    - Contrato criado tem lead_id, project_id, broker_id reais (rejeita se faltar)
  </done>
</task>

<task type="auto">
  <name>Task 2: Construir tela do editor — pagina /cockpit/contratos/novo + componente ContratoEditor (3 colunas)</name>
  <files>src/app/cockpit/contratos/novo/page.tsx, src/components/yzihub/Contratos/ContratoEditor.tsx, src/components/yzihub/Contratos/ContratoEditorSidebar.tsx, src/components/yzihub/Contratos/ContratoEditorPreview.tsx</files>
  <action>
Construir a tela completa do editor. Padrao visual TailAdmin dark, layout em 3 colunas (sidebar fixa esquerda + editor central + preview direito).

**1. `src/app/cockpit/contratos/novo/page.tsx`** — rota Next.js:
```tsx
"use client";
import { useSearchParams } from "next/navigation";
import ContratoEditor from "@/components/yzihub/Contratos/ContratoEditor";

export default function NovoContratoPage() {
  const params = useSearchParams();
  return (
    <ContratoEditor
      leadId={params.get("lead_id")}
      propertyId={params.get("property_id")}
      brokerId={params.get("broker_id")}
    />
  );
}
```

**2. `src/components/yzihub/Contratos/ContratoEditor.tsx`** — componente principal:
- Props: `{ leadId: string | null, propertyId: string | null, brokerId: string | null }`
- State:
  - `selectedTemplateId: string` (default '')
  - `templates: { id, label, type }[]` (lista do GET /api/contracts/templates)
  - `currentBody: string` (texto editado)
  - `lead: Lead | null`
  - `property: { id, titulo_comercial, bairro, valor } | null`
  - `broker: { id, full_name, email, phone } | null`
  - `loading: boolean`, `error: string | null`, `successMessage: string | null`
- useEffect inicial: paralelo
  - GET /api/contracts/templates -> setTemplates
  - if (leadId) GET /api/leads/${leadId} -> setLead (use mesmo padrao de fetch que LeadDrawer)
  - if (propertyId) GET /api/imoveis (filtra por id no client) ou criar endpoint dedicado se necessario; FALLBACK: usar lead.imovel_ref e tabela imoveis
  - if (brokerId) GET /api/brokers/${brokerId} -> setBroker
- Quando `selectedTemplateId` muda: GET /api/contracts/templates?id=X, depois `renderTemplate(template.body, vars)` onde vars = { comprador: lead.name, imovel: property.titulo_comercial, valor: formatBRL(lead.value), corretor: broker.full_name, comissao: formatBRL(lead.value*0.05), data: format(now) } → setCurrentBody
- Layout (Tailwind, padrao TailAdmin dark, mobile-first mas otimizado pra desktop):
  ```
  <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
    {/* Header */}
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <h1>Editor de Contrato</h1>
      <div className="flex gap-2">
        <button onClick={handleSaveDraft}>Salvar Rascunho</button>
        <button onClick={handleGeneratePDF}>Gerar PDF</button>
        <button onClick={handleGenerateAndSend} className="bg-brand-500">Gerar e Enviar</button>
      </div>
    </div>
    {/* 3 colunas */}
    <div className="grid grid-cols-[280px_1fr_360px] flex-1 min-h-0">
      <ContratoEditorSidebar templates={templates} selected={selectedTemplateId} onSelect={...} lead={lead} property={property} broker={broker} />
      <textarea value={currentBody} onChange={...} className="font-mono text-sm p-6 bg-white dark:bg-gray-900 resize-none focus:outline-none" />
      <ContratoEditorPreview body={currentBody} />
    </div>
  </div>
  ```
- Handlers:
  - `handleSaveDraft()` — POST /api/contracts/draft com `{ lead_id, property_id, broker_id, modelo: selectedTemplateId, comprador: lead.name, imovel: property.titulo_comercial, corretor: broker.full_name, valor: lead.value, comissao: lead.value*0.05, body: currentBody }`. Em sucesso: `setSuccessMessage("Rascunho salvo")`.
  - `handleGenerateAndSend()` — POST /api/contracts/generate com mesmo payload + canais default `{ whatsapp: true, email: true }` e `observacoes: ""`. Em sucesso: redirect para `/cockpit/contratos`.
  - `handleGeneratePDF()` — placeholder por enquanto: `alert("Geracao de PDF em breve")` OU criar `/api/contracts/[id]/pdf` stub que retorna 501 "Not Implemented" (preferir o segundo, mais limpo). Criar arquivo `src/app/api/contracts/[id]/pdf/route.ts` com GET que retorna `{ error: "Geracao de PDF nao implementada" }` status 501. Na UI, chamar `alert("Salve o rascunho primeiro")` se contrato nao foi salvo, senao window.open(`/api/contracts/${draftId}/pdf`).

**3. `src/components/yzihub/Contratos/ContratoEditorSidebar.tsx`** — painel esquerdo:
- Props: `{ templates, selectedTemplateId, onSelectTemplate, lead, property, broker }`
- Renderizar:
  - Bloco "Template": `<select>` com opcoes de templates (label visivel)
  - Bloco "Dados pre-preenchidos" (readonly, pattern `readonlyCls` do GerarContratoDrawer atual):
    - Comprador: lead.name
    - Imovel: property.titulo_comercial + bairro
    - Corretor: broker.full_name
    - Valor: formatBRL(lead.value)
    - Comissao 5%: formatBRL(lead.value * 0.05)
  - Mostrar `<span className="text-red-400">Faltando</span>` em campos null
- Padrao visual: copiar `inputCls`, `labelCls`, `readonlyCls` do GerarContratoDrawer.tsx (linhas 51-54)

**4. `src/components/yzihub/Contratos/ContratoEditorPreview.tsx`** — painel direito:
- Props: `{ body: string }`
- Renderiza um `<div>` com `whitespace-pre-wrap font-serif text-sm leading-relaxed p-6 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 overflow-y-auto`
- Exibe `body` como texto formatado (paragrafos preservados via whitespace-pre-wrap)
- Header: "Preview" pequeno cinza no topo
- Empty state: se body vazio, mostrar "Selecione um template para ver o preview"

REGRAS:
- TODOS os componentes em `src/components/yzihub/Contratos/`
- TailAdmin dark — reusar classes do GerarContratoDrawer existente
- NAO redesenhar sistema inteiro — apenas a tela nova
- Dados reais via APIs existentes (`/api/leads/[id]`, `/api/imoveis`, `/api/brokers/[id]`)
- Se algum endpoint nao existir ou retornar 404, exibir banner de erro mas permitir editar template generico (fallback gracioso)
  </action>
  <verify>
    <automated>npx tsc --noEmit && npx next build 2>&1 | grep -E "(error|Error)" | head -5</automated>
    Manual:
    1. `npm run dev` (com `--webpack` se necessario, conforme MEMORY)
    2. Visitar http://localhost:3000/cockpit/contratos/novo?lead_id=ID&property_id=ID&broker_id=ID com IDs reais do banco Jurema
    3. Tela deve montar com 3 colunas, dados pre-preenchidos no sidebar
    4. Selecionar template "Compra e Venda — Padrao" deve carregar texto no centro com placeholders substituidos
    5. Editar texto deve atualizar preview em tempo real
    6. Botao "Salvar Rascunho" deve criar registro em `contracts` com status='rascunho' e mostrar feedback de sucesso
    7. Botao "Gerar e Enviar" deve enfileirar em `job_queue` e redirecionar para /cockpit/contratos
  </verify>
  <done>
    - Build do Next.js passa sem erro
    - Rota /cockpit/contratos/novo carrega sem 500/crash
    - 3 colunas visiveis (sidebar 280px, editor flex, preview 360px)
    - Template selecionado carrega texto base com placeholders preenchidos com dados reais
    - Edicao no textarea reflete em tempo real no preview
    - "Salvar Rascunho" cria contrato status='rascunho' com notes=body editado, indexado por lead_id/project_id/broker_id
    - "Gerar e Enviar" cria contrato + entrada em job_queue
  </done>
</task>

<task type="auto">
  <name>Task 3: Adaptar GerarContratoDrawer para abrir nova tela em vez de submeter</name>
  <files>src/components/yzihub/Contratos/GerarContratoDrawer.tsx</files>
  <action>
Converter o `GerarContratoDrawer` atual em um "trampolim" para a nova tela `/cockpit/contratos/novo`. NAO deletar o componente — manter para compatibilidade com chamadas existentes (LeadDrawer + ContractsClient).

Mudancas pontuais:

1. **Importar `useRouter`** de `next/navigation` no topo.

2. **Substituir o body do drawer** (todo o `<form>` com 8 campos) por uma versao MINIMAL:
   - Manter header (titulo "Gerar Contrato" + nome do lead + close button)
   - Substituir form por um bloco simples com:
     - Card resumo dos dados que serao passados (lead.name, propertyTitle, brokerName, valor formatado)
     - Mensagem: "Voce sera levado ao editor completo do contrato, com escolha de template e edicao de texto."
     - Botao primario "Abrir Editor" que executa:
       ```typescript
       const params = new URLSearchParams();
       if (lead?.id) params.set("lead_id", lead.id);
       if (propertyId) params.set("property_id", propertyId);
       if (brokerId) params.set("broker_id", brokerId);
       router.push(`/cockpit/contratos/novo?${params.toString()}`);
       onClose();
       ```
     - Botao secundario "Cancelar" que so chama `onClose()`
   - Validar antes de habilitar "Abrir Editor": exigir lead && propertyId && brokerId (mostrar mensagens vermelhas se faltar, igual ao drawer atual faz no canSubmit)

3. **Remover state desnecessario**: form, submitting, success, useEffect de re-init. Manter apenas erro de validacao basico se quiser (opcional — pode remover tudo).

4. **Remover fetch para /api/contracts/generate** — nao acontece mais no drawer.

5. **Manter assinatura de props** identica (`isOpen, onClose, lead, brokerId, brokerName, propertyId, propertyTitle`) — para nao quebrar chamadores.

6. **Manter padrao visual** (backdrop, drawer fixed right, classes Tailwind) igual ao atual — so o conteudo do body muda.

REGRAS:
- NAO mexer em outros componentes que importam GerarContratoDrawer
- NAO deletar o arquivo
- Manter export default
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
    Manual:
    1. Abrir um lead no LeadDrawer (ou onde quer que GerarContratoDrawer seja invocado)
    2. Clicar no botao que abre o GerarContratoDrawer
    3. Drawer abre com card-resumo dos dados (nao com form de 8 campos)
    4. Clicar "Abrir Editor" navega para /cockpit/contratos/novo?lead_id=...&property_id=...&broker_id=... e fecha o drawer
    5. Editor carrega com dados pre-preenchidos
  </verify>
  <done>
    - GerarContratoDrawer mostra card resumo + botao "Abrir Editor"
    - Clique no botao redireciona para /cockpit/contratos/novo com query params corretos
    - Drawer fecha apos navegar
    - Sem regressao: assinatura de props inalterada, chamadores existentes seguem compilando
    - Sem chamadas residuais para /api/contracts/generate de dentro do drawer
  </done>
</task>

</tasks>

<verification>
**Build & types:**
- `npx tsc --noEmit` passa sem erro
- `npx next build` passa (warnings ok, errors nao)

**Fluxo end-to-end (Jurema Brokers):**
1. Login no cockpit como Jurema, abrir /cockpit/leads
2. Selecionar um lead com imovel + corretor vinculados
3. Acionar "Gerar Contrato" — drawer abre com card resumo
4. Clicar "Abrir Editor" — navega para /cockpit/contratos/novo com query params
5. Editor monta em 3 colunas, sidebar com dados reais (nome do lead, imovel real, corretor real, valor real, comissao 5% calculada)
6. Selecionar template "Compra e Venda — Padrao" — texto carrega no editor com placeholders substituidos
7. Editar texto — preview lateral atualiza
8. Clicar "Salvar Rascunho" — toast de sucesso, registro criado em `contracts` (status='rascunho', notes=body)
9. Clicar "Gerar e Enviar" — registro criado + job_queue enfileirado, redireciona para /cockpit/contratos

**DB asserts (Supabase SQL):**
- `select id, status, lead_id, project_id, broker_id, length(notes) from contracts where status = 'rascunho' order by created_at desc limit 1;` — retorna registro com IDs nao-null e notes nao-vazio
- `select * from job_queue where action='gerar_contrato' order by created_at desc limit 1;` — entrada criada na geracao

**Regressao:**
- /cockpit/contratos (lista) continua funcionando
- ContractDrawer (visualizacao de contrato existente) inalterado
- LeadDrawer abre/fecha normalmente
</verification>

<success_criteria>
- Tela /cockpit/contratos/novo existe e renderiza em 3 colunas (sidebar 280px / editor / preview 360px) no padrao TailAdmin dark
- 3 templates selecionaveis: compra_venda_padrao, locacao, exclusividade
- Dados de lead, imovel, corretor, valor e comissao 5% sao carregados do banco e exibidos pre-preenchidos
- Edicao manual do texto funciona em textarea, com preview atualizado em tempo real
- Acoes "Salvar Rascunho" e "Gerar e Enviar" persistem no banco (contracts) e a segunda enfileira em job_queue
- Contrato fica indexado em lead_id, project_id, broker_id (nao apenas em lead_name/project_name strings)
- GerarContratoDrawer existente foi adaptado para abrir a nova tela em vez de submeter direto
- Componente ContratoEditor + sidebar + preview vivem em src/components/yzihub/Contratos/
- Sem regressao: build passa, ContractsClient e ContractDrawer continuam funcionando
- Acao "Gerar PDF" e placeholder limpo (501 endpoint ou alert) — nao bloqueia o fluxo principal
</success_criteria>

<output>
After completion, create `.planning/quick/260418-vrr-criar-tela-de-editor-de-contrato/260418-vrr-SUMMARY.md` documentando:
- Arquivos criados/modificados
- Templates de contrato adicionados (com sample do body)
- Endpoints novos (templates, draft) e seus contratos
- Como o GerarContratoDrawer mudou (antes/depois resumido)
- Caminho do PDF (placeholder atual, TODO futuro)
- Screenshots/print da tela do editor (se possivel)
</output>
