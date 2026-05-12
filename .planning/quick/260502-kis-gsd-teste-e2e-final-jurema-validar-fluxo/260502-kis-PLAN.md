---
phase: quick-260502-kis
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: false
requirements: [E2E-JU-01, E2E-JU-02, E2E-JU-03]
must_haves:
  truths:
    - "Endpoint POST https://yzi-os.yzihub.com/agent/jurema responde com sucesso (HTTP 200) para as 4 mensagens em sequência usando o mesmo telefone novo"
    - "Lead é criado em leads com tenant_id=82cc7aa9-fc6e-4f37-8d8e-8a71c1691361 e phone_normalized correspondente ao telefone de teste"
    - "Deal é criado/atualizado em jurema_deals e progride pelos estágios esperados (qualificacao → perfil_busca → corretor) conforme cada mensagem"
    - "Pelo menos 1 registro é gravado em jurema_property_matches após a 4ª mensagem (pedido de opções)"
    - "Eventos relevantes (message_received, stage_changed, property_options_requested) aparecem em agent_metrics_events com agent_name=jurema e project_id=deal_id"
    - "As 6 rotas do cockpit (/cockpit/leads, /cockpit/jurema, /cockpit/imoveis, /cockpit/contratos/novo, /cockpit/contratos, /cockpit/financeiro) carregam sem erro 500/crash"
    - "Relatório final E2E-REPORT.md existe com payloads, responses, IDs criados, screenshots/observações das rotas e veredito PASS/FAIL por checkpoint"
  artifacts:
    - path: ".planning/quick/260502-kis-gsd-teste-e2e-final-jurema-validar-fluxo/E2E-REPORT.md"
      provides: "Relatório completo do teste E2E com payloads, responses, IDs e veredito"
      min_lines: 80
  key_links:
    - from: "POST /agent/jurema (msg 1)"
      to: "leads + jurema_deals (stage=qualificacao, score=0)"
      via: "tenant_id + phone_normalized"
      pattern: "deal_stage.*qualificacao"
    - from: "POST /agent/jurema (msg 2)"
      to: "jurema_deals (stage=perfil_busca, intent=comprar, location=Bessa, budget_max=700000, bedrooms=3)"
      via: "deal_id"
      pattern: "deal_stage.*perfil_busca"
    - from: "POST /agent/jurema (msg 3)"
      to: "jurema_deals (timeline preenchido, payment_method=financiamento, missing_fields=[])"
      via: "deal_id"
      pattern: "missing_fields.*\\[\\]"
    - from: "POST /agent/jurema (msg 4)"
      to: "jurema_property_matches (status=enviado/sugerido) + agent_metrics_events (property_options_requested)"
      via: "deal_id"
      pattern: "property_id"
---

<objective>
Executar teste end-to-end do agente Ju (Jurema Brokers) ponta a ponta, sem alterar nenhum código de produção. O fluxo simula um lead novo conversando com a Ju via 4 mensagens sequenciais, valida persistência no Supabase e checa as rotas do cockpit que dependem desses dados.

Purpose: Garantir que o backend Agno/YZI OS, o Supabase e o cockpit estão operacionais e integrados — pré-requisito antes de avançar para fluxos de contrato.

Output:
- Relatório E2E-REPORT.md completo com payloads, responses, IDs, dados Supabase observados, status das rotas e veredito PASS/FAIL.
- Nenhum arquivo de código modificado, nenhum commit de código.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md

<interfaces>
<!-- Endpoint principal -->
POST https://yzi-os.yzihub.com/agent/jurema
Headers: Content-Type: application/json

<!-- Payload base -->
{
  "message": "<texto>",
  "phone": "<E.164 sem +>",
  "tenant_id": "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361",
  "source": "site",
  "entrypoint": "property_search"
}

<!-- Resposta esperada -->
{
  "mode": "reply",
  "messages": ["..."],
  "metadata": {
    "agent": "jurema",
    "lead_id": "uuid",
    "deal_id": "uuid",
    "deal_stage": "qualificacao | perfil_busca | curadoria | corretor | ...",
    "qualification_status": "incompleto | frio | morno | quente | desqualificado",
    "lead_score": 0-100,
    "missing_fields": ["..."],
    "imoveis_count": 0
  }
}

<!-- Tabelas Supabase para validação (tenant Jurema) -->
Tenant Jurema: 82cc7aa9-fc6e-4f37-8d8e-8a71c1691361

leads: id, tenant_id, name, phone, phone_normalized, status, score, created_at
jurema_deals: id, tenant_id, lead_id, deal_stage, qualification_status, intent, property_type, location_preference, budget_max, bedrooms, timeline, payment_method, lead_score, broker_status, missing_fields(metadata), created_at, updated_at
jurema_property_matches: id, tenant_id, deal_id, property_id, property_source, match_score, status, created_at
agent_metrics_events: id, tenant_id, agent_name, event_type, project_id (=deal_id), payload, created_at

<!-- Rotas do cockpit a verificar (smoke) -->
http://localhost:3000/cockpit/leads
http://localhost:3000/cockpit/jurema
http://localhost:3000/cockpit/imoveis
http://localhost:3000/cockpit/contratos/novo
http://localhost:3000/cockpit/contratos
http://localhost:3000/cockpit/financeiro
</interfaces>

<test_constants>
TENANT_ID = 82cc7aa9-fc6e-4f37-8d8e-8a71c1691361
API_URL   = https://yzi-os.yzihub.com
PHONE_TEST = 5585911110099   <!-- ESTE PLANO USA ESTE NÚMERO. Se já existir lead com esse phone_normalized, gerar outro do tipo 558591111XXXX e registrar no relatório -->

MSG 1: "Oi, estou procurando um imóvel"
MSG 2: "Quero comprar um apartamento no Bessa com 3 quartos até 700 mil"
MSG 3: "Quero avançar nos próximos 60 dias e pretendo financiar"
MSG 4: "Pode separar algumas opções pra mim"
</test_constants>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Executar 4 chamadas em sequência ao endpoint /agent/jurema e validar Supabase</name>
  <files>
    .planning/quick/260502-kis-gsd-teste-e2e-final-jurema-validar-fluxo/E2E-REPORT.md (criar)
  </files>
  <action>
    NÃO ALTERAR código de produção. NÃO fazer commit de código. Esta task somente faz chamadas HTTP e leituras Supabase, e escreve UM arquivo de relatório dentro do diretório do plano.

    Passo 0 — Pré-condições:
    - Confirmar PHONE_TEST=5585911110099. Antes da MSG 1, consultar via Supabase MCP (`list_tables` se necessário, depois SELECT) se já existe lead com `phone_normalized='5585911110099' AND tenant_id='82cc7aa9-fc6e-4f37-8d8e-8a71c1691361'`. Se existir, escolher outro número do padrão 558591111XXXX que não tenha registro e usá-lo como PHONE_TEST. Registrar o número escolhido no topo do E2E-REPORT.md.

    Passo 1 — Disparar 4 chamadas HTTP, em ordem, com a MESMA `phone` (PHONE_TEST escolhido) e tenant_id=82cc7aa9-fc6e-4f37-8d8e-8a71c1691361:

      (a) MSG 1 — saudação fria
          curl -s -X POST "https://yzi-os.yzihub.com/agent/jurema" \
            -H "Content-Type: application/json" \
            -d '{"message":"Oi, estou procurando um imóvel","phone":"<PHONE_TEST>","tenant_id":"82cc7aa9-fc6e-4f37-8d8e-8a71c1691361"}'

      (b) MSG 2 — qualificação compra
          payload extra: "source":"site","entrypoint":"property_search"
          message: "Quero comprar um apartamento no Bessa com 3 quartos até 700 mil"

      (c) MSG 3 — prazo + financiamento
          message: "Quero avançar nos próximos 60 dias e pretendo financiar"

      (d) MSG 4 — pedir opções
          message: "Pode separar algumas opções pra mim"

      Para cada chamada: capturar HTTP status, response body completo (JSON), tempo de resposta. Salvar TUDO no relatório.

    Passo 2 — Validar Supabase via MCP supabase (preferir ferramentas MCP `mcp__supabase__execute_sql` se disponíveis; se não, instruir uso do dashboard / cli). Executar queries somente-leitura, filtrando por `tenant_id='82cc7aa9-fc6e-4f37-8d8e-8a71c1691361'` e `phone_normalized='<PHONE_TEST>'`/`lead_id`/`deal_id`:

      Q1) SELECT id, name, phone, phone_normalized, status, score, created_at FROM leads WHERE tenant_id='...' AND phone_normalized='<PHONE_TEST>';
      Q2) SELECT id, lead_id, deal_stage, qualification_status, intent, property_type, location_preference, budget_max, bedrooms, timeline, payment_method, lead_score, broker_status, metadata, created_at, updated_at FROM jurema_deals WHERE tenant_id='...' AND lead_id='<LEAD_ID_DA_Q1>';
      Q3) SELECT id, deal_id, property_id, property_source, match_score, status, created_at FROM jurema_property_matches WHERE tenant_id='...' AND deal_id='<DEAL_ID_DA_Q2>' ORDER BY created_at DESC;
      Q4) SELECT id, agent_name, event_type, project_id, payload, created_at FROM agent_metrics_events WHERE tenant_id='...' AND agent_name='jurema' AND project_id='<DEAL_ID>' ORDER BY created_at DESC LIMIT 30;

    Passo 3 — Conferir checkpoints esperados (registrar PASS/FAIL no relatório por item):

      [C1] Após MSG 1: deal_stage='qualificacao', qualification_status='incompleto', lead_score=0, imoveis_count=0
      [C2] Após MSG 2: intent='comprar', property_type='apartamento', location_preference contém 'Bessa', budget_max=700000, bedrooms=3, deal_stage='perfil_busca' (ou superior), missing_fields inclui 'timeline'
      [C3] Após MSG 3: timeline preenchido (~"60 dias"), payment_method='financiamento', missing_fields=[] ou vazio, lead_score>=70 (quente), deal_stage avança a 'corretor' ou 'curadoria'
      [C4] Após MSG 4: imoveis_count >= 1, pelo menos 1 linha em jurema_property_matches com property_source='imoveis' e status em ('sugerido','enviado'), evento 'property_options_requested' presente em agent_metrics_events
      [C5] Estados intermediários: pelo menos 1 evento 'message_received' por chamada e ao menos 1 'stage_changed' entre as mensagens

    Passo 4 — Escrever .planning/quick/260502-kis-gsd-teste-e2e-final-jurema-validar-fluxo/E2E-REPORT.md com seções obrigatórias:

      ## Constantes do teste (TENANT, PHONE_TEST, timestamp ISO)
      ## Mensagem 1 — saudação fria
        - Request payload (JSON pretty)
        - HTTP status, latência ms
        - Response body (JSON pretty)
        - metadata extraída (lead_id, deal_id, deal_stage, lead_score, qualification_status, missing_fields, imoveis_count)
        - Checkpoint C1: PASS/FAIL + observações
      ## Mensagem 2 — qualificação compra (mesmas subseções + C2)
      ## Mensagem 3 — prazo + financiamento (mesmas subseções + C3)
      ## Mensagem 4 — pedir opções (mesmas subseções + C4)
      ## Estado final no Supabase
        - Q1 leads → tabela com colunas
        - Q2 jurema_deals → tabela
        - Q3 jurema_property_matches → tabela
        - Q4 agent_metrics_events → tabela
      ## Checkpoint C5 (eventos): PASS/FAIL
      ## Resumo Parcial Task 1: PASS/FAIL global

    Regras estritas:
    - NÃO usar service_role.
    - NÃO inserir/alterar dados manualmente no Supabase para "consertar" o teste.
    - Se alguma chamada HTTP falhar (status != 200), registrar tudo (status, headers relevantes, body) e marcar checkpoint correspondente como FAIL — continuar com as próximas chamadas mesmo assim.
    - NÃO criar arquivos fora do diretório `.planning/quick/260502-kis-gsd-teste-e2e-final-jurema-validar-fluxo/`.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const p='.planning/quick/260502-kis-gsd-teste-e2e-final-jurema-validar-fluxo/E2E-REPORT.md';const t=fs.readFileSync(p,'utf8');const need=['Mensagem 1','Mensagem 2','Mensagem 3','Mensagem 4','Estado final no Supabase','Checkpoint','PHONE_TEST'];const miss=need.filter(s=>!t.includes(s));if(miss.length){console.error('MISSING:',miss);process.exit(1)}console.log('ok',t.length,'chars')"</automated>
  </verify>
  <done>
    E2E-REPORT.md existe com as 4 seções de mensagens, payloads completos, responses, dados do Supabase e veredito por checkpoint (C1..C5). PHONE_TEST utilizado está documentado.
  </done>
</task>

<task type="auto">
  <name>Task 2: Smoke test das 6 rotas do cockpit e finalização do relatório</name>
  <files>
    .planning/quick/260502-kis-gsd-teste-e2e-final-jurema-validar-fluxo/E2E-REPORT.md (apêndice)
  </files>
  <action>
    Continuar SEM alterar código. Esta task verifica que as rotas do cockpit carregam (smoke) e consolida o veredito final.

    Passo 1 — Subir o servidor de desenvolvimento (caso ainda não esteja rodando) e identificar a base URL.
      - Verificar se existe processo Next dev rodando (porta 3000 padrão). Se não, instruir o usuário a rodar `pnpm dev` em outro terminal e aguardar (ou rodar via `run_in_background` se disponível).
      - Confirmar base URL: BASE=http://localhost:3000 (ou a porta apontada pelo servidor).
      - Se não houver servidor disponível e o usuário não puder subir, REGISTRAR isso no relatório e marcar a Task 2 como SKIPPED (não como FAIL) para as rotas, mas a Task 1 ainda deve estar PASS para o veredito global.

    Passo 2 — Para cada rota da lista abaixo, fazer GET e capturar HTTP status + tamanho do HTML retornado + presença de strings indicativas de erro ("Application error", "Internal Server Error", "Unhandled", "TypeError"). Não exigir login: usar o bypass dev já existente; não tocar em variáveis de ambiente.

      Rotas:
      - GET ${BASE}/cockpit/leads
      - GET ${BASE}/cockpit/jurema
      - GET ${BASE}/cockpit/imoveis
      - GET ${BASE}/cockpit/contratos/novo
      - GET ${BASE}/cockpit/contratos
      - GET ${BASE}/cockpit/financeiro

      Para cada rota: registrar status, tamanho do body (bytes), presença/ausência de strings de erro, e classificar como:
        OK     → status 2xx e nenhuma string de erro
        WARN   → status 2xx mas alguma string de erro detectada
        FAIL   → status 4xx/5xx ou exceção
        SKIP   → servidor indisponível

    Passo 3 — Apender ao mesmo arquivo `E2E-REPORT.md` (não recriar) as seções:

      ## Smoke das rotas do cockpit
        - BASE URL utilizada
        - Tabela: rota | status HTTP | bytes | erros detectados | classificação
        - Observações por rota com problema

      ## Bugs / Anomalias encontrados
        - Lista numerada (1..N) de problemas reais detectados em Task 1 ou Task 2, com:
          - Onde aparece (mensagem N, rota X, query Y)
          - Sintoma observado
          - Severidade sugerida (baixa/média/alta)
          - Hipótese (se houver)

      ## Veredito Final
        - Tabela: Checkpoint | Resultado
          - C1 Saudação fria
          - C2 Qualificação compra
          - C3 Prazo + financiamento
          - C4 Pedido de opções (matches gerados)
          - C5 Eventos
          - Smoke cockpit (6 rotas)
        - Status global: PASS / PASS-COM-RESSALVAS / FAIL
        - Próximas ações recomendadas (opcional, no máximo 5 bullets)

    Passo 4 — NÃO fazer git commit do código. Permitido (e esperado) commit dos arquivos do plano (PLAN + REPORT) caso o orquestrador rode etapa de commit no final; mas esta task em si não executa `git commit`.

    Regras estritas:
    - Não modificar nenhum arquivo em `src/`.
    - Não modificar nenhum arquivo em `prisma/`, `migrations/`, ou `package.json`.
    - Apenas leitura de rotas + escrita no E2E-REPORT.md.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const p='.planning/quick/260502-kis-gsd-teste-e2e-final-jurema-validar-fluxo/E2E-REPORT.md';const t=fs.readFileSync(p,'utf8');const need=['Smoke das rotas do cockpit','Veredito Final','/cockpit/leads','/cockpit/jurema','/cockpit/imoveis','/cockpit/contratos/novo','/cockpit/contratos','/cockpit/financeiro'];const miss=need.filter(s=>!t.includes(s));if(miss.length){console.error('MISSING:',miss);process.exit(1)}console.log('ok',t.length,'chars')"</automated>
  </verify>
  <done>
    E2E-REPORT.md contém a seção "Smoke das rotas do cockpit" com as 6 rotas listadas e classificadas, a seção "Bugs / Anomalias encontrados" (mesmo que vazia, indicando "nenhum"), e a seção "Veredito Final" com tabela de checkpoints e status global.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Revisão humana do relatório E2E</name>
  <what-built>
    Relatório completo do teste E2E da Ju em
    .planning/quick/260502-kis-gsd-teste-e2e-final-jurema-validar-fluxo/E2E-REPORT.md
    contendo: 4 chamadas /agent/jurema com payloads e responses, validação Supabase (leads, jurema_deals, jurema_property_matches, agent_metrics_events), smoke das 6 rotas do cockpit e veredito PASS/FAIL.
  </what-built>
  <how-to-verify>
    1. Abrir o arquivo E2E-REPORT.md no diretório do plano.
    2. Conferir se o telefone de teste está documentado e é novo (não usado anteriormente).
    3. Ler as 4 seções de mensagens — checar se as responses da Ju fazem sentido com os checkpoints C1..C4.
    4. Conferir a tabela final de "Estado final no Supabase" — IDs de lead/deal devem existir e bater com os retornados pelo endpoint.
    5. Conferir a tabela "Smoke das rotas do cockpit" — todas 6 rotas listadas com status.
    6. Ler "Bugs / Anomalias encontrados" — confirmar se algum item bloqueia avanço para próxima fase (contratos).
    7. Confirmar "Veredito Final": status global está coerente com os checkpoints.
  </how-to-verify>
  <resume-signal>Digite "approved" se o relatório está completo e o veredito é aceitável, ou descreva quais seções precisam ser refeitas/expandidas.</resume-signal>
</task>

</tasks>

<verification>
- E2E-REPORT.md existe e tem todas as seções obrigatórias (4 mensagens + Supabase + Smoke + Bugs + Veredito).
- Nenhum arquivo de código em src/ foi modificado (validar com `git status` antes de fechar — apenas arquivos dentro de `.planning/quick/260502-kis-.../` devem aparecer como modificados/criados).
- Telefone de teste é único e não estava previamente em uso no tenant Jurema.
- Veredito final indica claramente PASS, PASS-COM-RESSALVAS ou FAIL com justificativa.
</verification>

<success_criteria>
- 4 chamadas HTTP ao endpoint /agent/jurema executadas e documentadas com request + response completos.
- Estado do Supabase após o fluxo verificado nas 4 tabelas relevantes (leads, jurema_deals, jurema_property_matches, agent_metrics_events).
- 6 rotas do cockpit testadas com status HTTP e classificação OK/WARN/FAIL/SKIP.
- Bugs reais (se houver) listados com severidade e hipótese.
- Veredito final escrito de forma inequívoca.
- Zero alterações em código de produção, zero commits de código.
</success_criteria>

<output>
After completion, the artifact is the E2E-REPORT.md inside this plan directory. No SUMMARY.md required for quick test tasks unless the orchestrator's commit step generates one.
</output>
