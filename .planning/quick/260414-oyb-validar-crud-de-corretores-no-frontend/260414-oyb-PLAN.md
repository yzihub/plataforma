---
phase: quick-260414-oyb
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/yzihub/CorretoresClient.tsx
  - src/components/yzihub/CorretorDrawer.tsx
autonomous: false
requirements: [BROKERS-CRUD-VALIDATE]

must_haves:
  truths:
    - "GET /api/brokers retorna apenas corretores do tenant autenticado"
    - "Usuario pode criar um corretor e ver na lista imediatamente"
    - "Usuario pode editar um corretor existente e ver a mudanca"
    - "Usuario pode excluir um corretor e ver removido da lista"
    - "tenant_id e aplicado em todas as operacoes (select/insert/update/delete)"
    - "Loading state aparece enquanto dados carregam"
    - "Empty state aparece quando nao ha corretores"
    - "Erros de fetch/save/delete exibem feedback visual"
  artifacts:
    - path: "src/components/yzihub/CorretoresClient.tsx"
      provides: "Lista de corretores + create + edit + delete + loading/empty/error states"
      contains: "handleDelete, error state"
    - path: "src/components/yzihub/CorretorDrawer.tsx"
      provides: "Formulario create/edit + acao delete quando em modo edicao"
      contains: "onDelete"
  key_links:
    - from: "CorretoresClient.tsx"
      to: "supabase.from('brokers')"
      via: "client supabase com tenant.id filter"
      pattern: "eq\\(['\"]tenant_id['\"]"
    - from: "CorretorDrawer.tsx"
      to: "CorretoresClient.handleDelete"
      via: "onDelete prop"
      pattern: "onDelete"
---

<objective>
Validar e completar o CRUD de corretores na tela `/cockpit/corretores`. O scaffold ja existe (GET + CREATE + UPDATE com loading/empty state). Falta: acao de DELETE, tratamento de erro visivel ao usuario, e validacao end-to-end do fluxo contra Supabase com tenant_id.

Purpose: garantir que a tela funcione 100% para o usuario final sem refatorar a estrutura.
Output: CRUD completo (C-R-U-D) funcionando com fallbacks visuais e isolamento por tenant confirmado.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

<interfaces>
Tipos e contratos existentes (nao alterar):

From src/types/brokers.ts (inferido do uso):
```typescript
export interface Broker {
  id: string;
  tenant_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}
export interface BrokerInput {
  full_name: string;
  phone?: string | null;
  email?: string | null;
  role?: string | null;
}
```

From src/components/yzihub/CorretoresClient.tsx:
- Usa `createClient()` do supabase client-side (nao passa pelo /api/brokers)
- handleSave(input, id?) ja faz insert e update com eq('tenant_id', tenant.id)
- Falta handleDelete e exibicao de erro

From src/app/api/brokers/route.ts:
- Apenas GET existente (filtra por tenant via profile lookup)
- Tela NAO consome esse endpoint — usa Supabase RLS direto
- Validacao: RLS da migration 014 ja protege insert/update/delete
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Adicionar handleDelete + estado de erro no CorretoresClient</name>
  <files>src/components/yzihub/CorretoresClient.tsx</files>
  <action>
    Adicionar funcao `handleDelete(id: string)` que:
    - chama `supabase.from('brokers').delete().eq('id', id).eq('tenant_id', tenant.id)`
    - em caso de erro, seta estado `error` com mensagem amigavel ("Erro ao excluir corretor")
    - em caso de sucesso, remove o broker do state (`setBrokers(prev => prev.filter(b => b.id !== id))`) e fecha o drawer

    Adicionar estado `const [error, setError] = useState<string | null>(null)`:
    - Renderizar banner de erro (vermelho, dismissible) acima da tabela quando `error` for nao-nulo
    - Resetar `error` ao abrir drawer ou reabrir tentativa
    - Envolver handleSave em try/catch e setar `error` no catch (atualmente faz `throw` sem UI)

    Passar `onDelete={handleDelete}` ao `<CorretorDrawer>`.

    NAO refatorar estrutura existente. NAO trocar supabase client por /api/brokers.
    Garantir que cada query mantem `.eq('tenant_id', tenant.id)` — defesa em profundidade alem do RLS.
  </action>
  <verify>
    <automated>rtk tsc --noEmit</automated>
  </verify>
  <done>
    - Arquivo compila sem erro TS
    - handleDelete existe e aplica filtro tenant_id
    - Banner de erro renderiza quando error !== null
    - Prop onDelete passada ao drawer
  </done>
</task>

<task type="auto">
  <name>Task 2: Adicionar acao Excluir no CorretorDrawer (modo edicao)</name>
  <files>src/components/yzihub/CorretorDrawer.tsx</files>
  <action>
    Estender interface de props para incluir `onDelete?: (id: string) => Promise<void> | void`.

    No modo edicao (quando `broker` prop for nao-nulo):
    - Adicionar botao "Excluir" no rodape do drawer, visualmente distinto (text-red-500 ou border-red-500, alinhado a esquerda enquanto Salvar/Cancelar ficam a direita)
    - Ao clicar: disparar `window.confirm('Excluir corretor?')` — se aceito, chamar `onDelete(broker.id)` e fechar drawer
    - Botao oculto no modo criacao (quando broker === null)

    Estado de loading local (`deleting`) para desabilitar botoes durante a operacao.

    NAO alterar layout geral do drawer nem mover campos existentes.
  </action>
  <verify>
    <automated>rtk tsc --noEmit</automated>
  </verify>
  <done>
    - Botao Excluir aparece so em modo edicao
    - Confirm nativo do browser antes de excluir
    - onDelete chamado com broker.id correto
    - Compila sem erro TS
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Validacao manual end-to-end no navegador</name>
  <what-built>
    CRUD completo de corretores em `/cockpit/corretores`:
    - Listagem filtrada por tenant (GET via supabase client)
    - Criacao via drawer (INSERT com tenant_id)
    - Edicao via drawer (UPDATE com tenant_id)
    - Exclusao via botao no drawer em modo edicao (DELETE com tenant_id)
    - Loading skeleton (3 linhas) durante fetch
    - Empty state com CTA quando sem corretores
    - Banner de erro quando operacao falha
  </what-built>
  <how-to-verify>
    1. Rodar `pnpm dev` e logar como usuario de um tenant (ex: juremabrokers@gmail.com)
    2. Navegar para `/cockpit/corretores`
       - ESPERADO: skeleton rapido, depois empty state OU lista com corretor(es) do tenant
    3. Clicar "+ Novo Corretor", preencher full_name + phone + email + role, Salvar
       - ESPERADO: drawer fecha, corretor aparece no topo da lista
    4. Clicar "Editar" no corretor recem-criado, alterar nome, Salvar
       - ESPERADO: drawer fecha, nome atualizado na linha
    5. Clicar "Editar" novamente, clicar "Excluir", confirmar
       - ESPERADO: drawer fecha, linha some da lista
    6. Abrir Supabase SQL Editor e rodar: `select tenant_id, full_name from brokers order by created_at desc limit 5;`
       - ESPERADO: registros pertencem apenas ao tenant_id do usuario logado
    7. (Opcional) Logar com usuario de outro tenant — ESPERADO: lista vazia ou so corretores do outro tenant
  </how-to-verify>
  <resume-signal>Type "approved" ou descreva o que falhou (erro de console, comportamento inesperado, RLS leak)</resume-signal>
</task>

</tasks>

<verification>
- `rtk tsc --noEmit` passa sem erros
- Validacao manual (Task 3) confirma CRUD 100% funcional
- tenant_id aplicado em todas as 4 operacoes (select, insert, update, delete)
- Loading, empty e error states visualmente confirmados
</verification>

<success_criteria>
- Usuario consegue criar/listar/editar/excluir corretores no seu tenant
- Nenhum vazamento cross-tenant (confirmado via check SQL)
- TS compila limpo
- Sem refatoracao — apenas completou lacunas (DELETE + error UI)
</success_criteria>

<output>
After completion, create `.planning/quick/260414-oyb-validar-crud-de-corretores-no-frontend/260414-oyb-SUMMARY.md`
</output>
