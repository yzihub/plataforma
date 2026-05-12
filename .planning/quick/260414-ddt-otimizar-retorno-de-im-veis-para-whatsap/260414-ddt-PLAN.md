---
phase: quick
plan: 260414-ddt
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/260408-sub-refactor-luana-airtable-supabase/consultar_imoveis.json
autonomous: true
requirements: [QUICK-DDT]
must_haves:
  truths:
    - "Workflow consultar_imoveis retorna apenas 6 campos por imovel"
    - "SELECT do Supabase busca apenas os 6 campos necessarios (menos dados transferidos)"
    - "Formato de saida { imoveis: [...], total: N } preservado"
    - "Filtros do Prepara Busca (direta|filtro) continuam funcionando"
  artifacts:
    - path: ".planning/quick/260408-sub-refactor-luana-airtable-supabase/consultar_imoveis.json"
      provides: "JSON local sincronizado com workflow n8n"
  key_links:
    - from: "n8n workflow 0udn6N4YelE6F2Ws"
      to: "consultar_imoveis.json local"
      via: "MCP get + local write sync"
---

<objective>
Otimizar o payload de retorno do workflow `consultar_imoveis` (n8n ID: `0udn6N4YelE6F2Ws`) para WhatsApp cards.

Atualmente retorna 13+ campos por imovel (incluindo descricao longa). Reduzir para 6 campos essenciais:
1. titulo (titulo_comercial)
2. valor (preco)
3. bairro
4. quartos
5. foto_principal
6. link_do_imovel

Purpose: Cards de WhatsApp nao precisam de descricao, suites, vagas, area, cidade, tipo, finalidade, status_publicacao. Reduzir payload economiza tokens do agente e melhora a experiencia.
Output: Workflow n8n atualizado + JSON local sincronizado.
</objective>

<execution_context>
@.claude/get-shit-done/workflows/execute-plan.md
@.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/260409-06k-padronizar-consultar-imoveis-com-dados-c/260409-06k-SUMMARY.md
@.planning/quick/260408-sub-refactor-luana-airtable-supabase/consultar_imoveis.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Atualizar workflow n8n — reduzir SELECT e Formatar Imoveis para 6 campos</name>
  <files>n8n workflow 0udn6N4YelE6F2Ws (remote)</files>
  <action>
Usar MCP n8n tools para atualizar o workflow `0udn6N4YelE6F2Ws`. Duas mudancas:

**1. Node "Buscar Imoveis" (HTTP Request) — Reduzir SELECT**

Alterar o query parameter `select` de:
```
id_imovel,titulo_comercial,titulo_seo,descricao_imovel,bairro,tipo_de_imovel,finalidade,valor,metragem,quartos,suites,vagas,foto_principal,link_do_imovel,link_redes_sociais,status_publicacao
```
Para:
```
id_imovel,titulo_comercial,valor,bairro,quartos,foto_principal,link_do_imovel
```

NOTA: Manter `id_imovel` no SELECT pois o filtro client-side `tipo_busca === "direta"` filtra por `id_imovel`. Sem ele, busca direta quebra.

Manter TODOS os outros query parameters inalterados (tenant_id, status_publicacao, order).

**2. Node "Formatar Imoveis" (Code) — Simplificar mapeamento**

Substituir o jsCode inteiro por:

```javascript
const supabaseResponse = $input.first().json;
const busca = $('Prepara Busca').first().json;

// Supabase REST API retorna array diretamente
const todos = Array.isArray(supabaseResponse) ? supabaseResponse : [];

// Normaliza para 6 campos essenciais (WhatsApp cards)
const normalized = todos.map(d => ({
  id_imovel:      d.id_imovel,
  titulo:         d.titulo_comercial ?? '',
  valor:          d.valor ?? 0,
  bairro:         d.bairro ?? null,
  quartos:        d.quartos ?? 0,
  foto_principal: d.foto_principal ?? null,
  link:           d.link_do_imovel ?? null,
}));

// Aplica filtros do Prepara Busca (client-side) — logica INALTERADA
let resultado = normalized;

if (busca.tipo_busca === 'direta' && busca.id_imovel && busca.id_imovel !== 'NULL') {
  resultado = normalized.filter(i => i.id_imovel === busca.id_imovel);
} else {
  if (busca.bairro) {
    resultado = resultado.filter(i =>
      i.bairro && i.bairro.toLowerCase().includes(busca.bairro.toLowerCase())
    );
  }
  if (busca.quartos > 0) {
    resultado = resultado.filter(i => i.quartos >= busca.quartos);
  }
  // REMOVIDO: filtro valor_maximo — campo 'preco' renomeado para 'valor'
  // mas mantemos compatibilidade: valor e preco sao o mesmo
  if (busca.valor_maximo > 0) {
    resultado = resultado.filter(i => i.valor <= busca.valor_maximo);
  }
}

return [{
  json: {
    imoveis: resultado,
    total: resultado.length,
  }
}];
```

NOTA: `id_imovel` incluso no mapeamento para que filtro direta funcione. Nao e um dos 6 campos de exibicao mas e necessario para logica interna.

**NAO ALTERAR:**
- Node "When Executed by Another Workflow" (trigger)
- Node "Prepara Busca" (logica de normalizacao de input)
- Connections entre nodes
- Settings do workflow
  </action>
  <verify>
    <automated>Usar MCP para ler o workflow atualizado e confirmar: (1) SELECT tem exatamente 7 campos (id_imovel + 6 de exibicao), (2) Code node "Formatar Imoveis" mapeia apenas 7 campos (id_imovel + 6), (3) nodes Prepara Busca e trigger inalterados</automated>
  </verify>
  <done>Workflow n8n `0udn6N4YelE6F2Ws` atualizado com SELECT reduzido e Code node simplificado. Output continua no formato { imoveis: [...], total: N } mas cada imovel tem apenas titulo, valor, bairro, quartos, foto_principal, link (+ id_imovel interno).</done>
</task>

<task type="auto">
  <name>Task 2: Sincronizar consultar_imoveis.json local com workflow atualizado</name>
  <files>.planning/quick/260408-sub-refactor-luana-airtable-supabase/consultar_imoveis.json</files>
  <action>
Atualizar o arquivo JSON local para refletir as mudancas feitas no workflow n8n:

1. No node "Buscar Imoveis" — alterar o `select` query parameter para `id_imovel,titulo_comercial,valor,bairro,quartos,foto_principal,link_do_imovel`
2. No node "Formatar Imoveis" — substituir o `jsCode` pelo codigo simplificado da Task 1
3. Atualizar o `_comment` para refletir que agora retorna 6 campos de exibicao (nao mais 15)

NAO alterar nenhum outro node ou campo do JSON.
  </action>
  <verify>
    <automated>Validar que o JSON e valido: node -e "const j=require('./.planning/quick/260408-sub-refactor-luana-airtable-supabase/consultar_imoveis.json'); const sel=j.nodes.find(n=>n.name==='Buscar Imóveis').parameters.queryParameters.parameters.find(p=>p.name==='select').value; console.log('SELECT fields:', sel.split(',').length, sel); const code=j.nodes.find(n=>n.name==='Formatar Imóveis').parameters.jsCode; console.log('Has descricao:', code.includes('descricao')); console.log('Has foto_principal:', code.includes('foto_principal'));"</automated>
  </verify>
  <done>consultar_imoveis.json local sincronizado: SELECT com 7 campos, Code node com 7 campos mapeados, sem descricao/suites/vagas/area/cidade/tipo/finalidade/status_publicacao.</done>
</task>

</tasks>

<verification>
- Workflow n8n `0udn6N4YelE6F2Ws` retorna apenas 6 campos de exibicao por imovel (+ id_imovel para filtro interno)
- SELECT do HTTP Request busca 7 campos do Supabase (vs 16 anteriores — reducao de ~56%)
- Formato { imoveis: [...], total: N } preservado
- Filtros client-side (direta por id_imovel, filtro por bairro/quartos/valor_maximo) preservados
- JSON local sincronizado com workflow remoto
</verification>

<success_criteria>
- Cada imovel no array retornado tem APENAS: id_imovel, titulo, valor, bairro, quartos, foto_principal, link
- Campo `descricao` NAO aparece no retorno
- Campos suites, vagas, area, cidade, tipo, finalidade, status_publicacao NAO aparecem
- Prepara Busca inalterado (zero diff)
- Trigger inalterado (zero diff)
</success_criteria>

<output>
After completion, create `.planning/quick/260414-ddt-otimizar-retorno-de-im-veis-para-whatsap/260414-ddt-SUMMARY.md`
</output>
