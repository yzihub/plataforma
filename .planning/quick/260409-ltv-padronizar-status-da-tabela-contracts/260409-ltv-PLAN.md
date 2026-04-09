---
phase: quick-260409-ltv
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: [LTV-01]
must_haves:
  truths:
    - "Coluna status da tabela contracts aceita apenas: draft, sent, signed, cancelled"
    - "Valores em português (rascunho, pendente, assinado, cancelado, expirado) são rejeitados pelo banco"
  artifacts:
    - path: "supabase/migrations/contracts_status_constraint"
      provides: "CHECK constraint atualizado na tabela contracts"
  key_links:
    - from: "tabela contracts"
      to: "coluna status"
      via: "CHECK constraint"
      pattern: "draft|sent|signed|cancelled"
---

<objective>
Corrigir o CHECK constraint da coluna `status` na tabela `contracts` no Supabase, substituindo os valores em português por valores em inglês padronizados.

Purpose: Alinhar o schema do banco com o padrão do sistema (inglês) para garantir que o workflow n8n e o frontend usem os mesmos valores de status.
Output: CHECK constraint atualizado via migration aplicada pelo Supabase MCP.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Aplicar migration para atualizar CHECK constraint de status</name>
  <files>supabase/migrations (via apply_migration MCP)</files>
  <action>
    Usar a ferramenta Supabase MCP `apply_migration` para executar o seguinte SQL:

    ```sql
    -- Remover constraint existente com valores em português
    ALTER TABLE contracts
      DROP CONSTRAINT IF EXISTS contracts_status_check;

    -- Adicionar nova constraint com valores em inglês padronizados
    ALTER TABLE contracts
      ADD CONSTRAINT contracts_status_check
      CHECK (status IN ('draft', 'sent', 'signed', 'cancelled'));
    ```

    REGRAS:
    - Não alterar nenhuma outra coluna, índice ou política RLS
    - Apenas o CHECK constraint de status deve ser modificado
    - O nome do constraint novo deve ser `contracts_status_check` (mesmo nome, substituição limpa)
    - Se o constraint atual tiver nome diferente, usar `DROP CONSTRAINT IF EXISTS` com o nome correto antes de adicionar o novo
  </action>
  <verify>
    Após aplicar a migration, verificar via SQL no Supabase:
    ```sql
    SELECT conname, pg_get_constraintdef(oid)
    FROM pg_constraint
    WHERE conrelid = 'contracts'::regclass
      AND contype = 'c'
      AND conname LIKE '%status%';
    ```
    Deve retornar a constraint com `status IN ('draft', 'sent', 'signed', 'cancelled')`.
  </verify>
  <done>
    - CHECK constraint `contracts_status_check` existe na tabela `contracts`
    - Valores aceitos: draft, sent, signed, cancelled
    - Valores rejeitados: rascunho, pendente, assinado, cancelado, expirado (qualquer outro)
    - Estrutura restante da tabela (colunas, índices, RLS) inalterada
  </done>
</task>

</tasks>

<verification>
Após aplicar a migration:
1. Testar INSERT com status válido: `INSERT INTO contracts (status, ...) VALUES ('draft', ...)` — deve aceitar
2. Testar INSERT com status inválido: `INSERT INTO contracts (status, ...) VALUES ('rascunho', ...)` — deve rejeitar com erro de CHECK constraint
</verification>

<success_criteria>
- Migration aplicada com sucesso sem erros
- CHECK constraint atualizado para `('draft', 'sent', 'signed', 'cancelled')`
- Nenhuma outra parte da tabela alterada
</success_criteria>

<output>
Após conclusão, registrar no STATE.md:
- Quick task 260409-ltv concluída
- Constraint `contracts_status_check` atualizado para inglês
</output>
