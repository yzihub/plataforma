# YZIHUB Patterns

## CommandButton — padrão de botão de ação
Todo botão que dispara automação segue:
1. onClick → POST /api/actions/execute
2. body: { action, lead_id, tenant_id }
3. Inserir em job_queue
4. UI mostra Spinner enquanto processa
5. Badge do lead atualiza com novo status

## ActionPanel — painel de ações do lead
Componente em src/components/yzihub/ActionPanel.tsx
Contém os CommandButtons do lead:
- QUALIFICAR, ENVIAR PROPOSTA, AGENDAR, FECHAR, IA ASSUMIR

## Multi-tenant
- Sempre filtrar por tenant_id
- Nunca expor dados de outros tenants
- Supabase RLS ativo em todas as tabelas
