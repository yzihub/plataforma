---
phase: quick-260414-olz
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/014_brokers_table.sql
  - src/app/api/brokers/route.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - "Corretor pode ser criado, listado e editado via UI sem erro de tabela inexistente"
    - "Dados de corretores são isolados por tenant_id"
    - "API GET /api/brokers retorna corretores do tenant autenticado"
  artifacts:
    - path: "supabase/migrations/014_brokers_table.sql"
      provides: "Tabela brokers com RLS habilitado"
      contains: "ALTER TABLE brokers ENABLE ROW LEVEL SECURITY"
    - path: "src/app/api/brokers/route.ts"
      provides: "Endpoint GET para leitura de corretores por tenant"
      exports: ["GET"]
  key_links:
    - from: "src/components/yzihub/CorretoresClient.tsx"
      to: "supabase brokers table"
      via: "supabase.from('brokers').select(...).eq('tenant_id', ...)"
      pattern: "brokers.*tenant_id"
---

<objective>
Ativar o CRUD de corretores aplicando a migration pendente no Supabase (com RLS) e criando o API route GET /api/brokers.

Purpose: O frontend (CorretoresClient, CorretorDrawer, page) já está completo. A migration 014 existe mas não foi aplicada. Sem a tabela no Supabase, toda operação de corretor falha silenciosamente.
Output: Tabela `brokers` live no Supabase com RLS, e endpoint GET /api/brokers para consumo pelo n8n/Luana.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

# Contexto existente (não recriar)
# - src/types/brokers.ts — Broker, BrokerInput já definidos
# - src/components/yzihub/CorretoresClient.tsx — lê/escreve diretamente no Supabase via client SDK
# - src/components/yzihub/CorretorDrawer.tsx — formulário full_name, phone, email, role
# - src/app/cockpit/corretores/page.tsx — monta CorretoresClient
# - supabase/migrations/014_brokers_table.sql — SQL da tabela já escrito, falta aplicar + RLS

# Padrão de API route (copiar estrutura do GET /api/imoveis):
# @src/app/api/imoveis/route.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Aplicar migration brokers + adicionar RLS</name>
  <files>supabase/migrations/014_brokers_table.sql</files>
  <action>
    O arquivo supabase/migrations/014_brokers_table.sql já tem o CREATE TABLE correto.
    Adicionar ao final do arquivo (após o CREATE INDEX):

    ```sql
    -- RLS: isolar corretores por tenant do usuário autenticado
    ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "tenant_brokers_select"
      ON brokers FOR SELECT
      USING (
        tenant_id = (
          SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
      );

    CREATE POLICY "tenant_brokers_insert"
      ON brokers FOR INSERT
      WITH CHECK (
        tenant_id = (
          SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
      );

    CREATE POLICY "tenant_brokers_update"
      ON brokers FOR UPDATE
      USING (
        tenant_id = (
          SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
      );
    ```

    Depois aplicar via Supabase CLI:
    ```bash
    rtk npx supabase db push
    ```

    Se não houver CLI configurado localmente, executar o SQL completo (014_brokers_table.sql) diretamente no Supabase Studio > SQL Editor do projeto de produção.
    URL: https://app.supabase.com — projeto YZIHUB > SQL Editor.

    Confirmar que a tabela `brokers` aparece em Table Editor com as colunas: id, tenant_id, full_name, phone, email, role, created_at, updated_at.
  </action>
  <verify>
    Testar no Supabase Studio > SQL Editor:
    SELECT COUNT(*) FROM brokers;
    -- deve retornar 0 sem erro (tabela existe, vazia)

    SELECT policyname FROM pg_policies WHERE tablename = 'brokers';
    -- deve retornar 3 policies: tenant_brokers_select, tenant_brokers_insert, tenant_brokers_update
  </verify>
  <done>Tabela brokers existe no Supabase com RLS ativo e 3 policies de isolamento por tenant_id.</done>
</task>

<task type="auto">
  <name>Task 2: Criar GET /api/brokers</name>
  <files>src/app/api/brokers/route.ts</files>
  <action>
    Criar src/app/api/brokers/route.ts seguindo exatamente o padrão de GET /api/imoveis/route.ts:
    - Autenticar via supabase.auth.getUser()
    - Buscar tenant_id do profile do usuário
    - Consultar brokers WHERE tenant_id = profile.tenant_id ORDER BY created_at DESC
    - Retornar array de brokers como JSON (sem envelope n8n — brokers é módulo interno, não integração de agente)
    - Campos a retornar: id, tenant_id, full_name, phone, email, role, created_at, updated_at
    - Em erros: 401 se não autenticado, 500 se query falhar

    Estrutura do arquivo:
    ```typescript
    import { NextResponse } from "next/server";
    import { createClient } from "@/lib/supabase/server";

    export async function GET() {
      try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
        }
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("id", user.id)
          .single();
        if (profileError || !profile?.tenant_id) {
          return NextResponse.json({ error: "Perfil nao encontrado" }, { status: 401 });
        }
        const { data: brokers, error: brokersError } = await supabase
          .from("brokers")
          .select("id, tenant_id, full_name, phone, email, role, created_at, updated_at")
          .eq("tenant_id", profile.tenant_id)
          .order("created_at", { ascending: false });
        if (brokersError) {
          console.error("[GET /api/brokers] query error:", brokersError);
          return NextResponse.json({ error: "Erro ao buscar corretores" }, { status: 500 });
        }
        return NextResponse.json(brokers ?? [], { status: 200 });
      } catch (err) {
        console.error("[GET /api/brokers] unexpected error:", err);
        return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
      }
    }
    ```
  </action>
  <verify>
    rtk tsc --noEmit
    -- zero erros de type relacionados a brokers/route.ts

    Após Task 1 (tabela criada), testar autenticado:
    curl -s http://localhost:3000/api/brokers
    -- retorna [] ou array de brokers (não um erro 500)
  </verify>
  <done>GET /api/brokers retorna array JSON de corretores do tenant autenticado com status 200.</done>
</task>

</tasks>

<verification>
1. Supabase: `SELECT COUNT(*) FROM brokers;` retorna sem erro
2. Supabase: `SELECT policyname FROM pg_policies WHERE tablename = 'brokers';` retorna 3 policies
3. `rtk tsc --noEmit` sem erros
4. Acessar /cockpit/corretores no browser — tabela carrega (vazia ou com dados), botão "Novo Corretor" abre drawer, formulário salva sem erro 42P01 (table not found)
</verification>

<success_criteria>
- Tabela brokers existe no Supabase com RLS isolando por tenant_id
- CRUD completo funcional: criar e editar corretor via drawer persiste no Supabase
- GET /api/brokers responde 200 com array JSON
- Nenhum erro de TypeScript
</success_criteria>

<output>
After completion, create `.planning/quick/260414-olz-criar-crud-simples-de-corretores-por-ten/260414-olz-SUMMARY.md`
</output>
