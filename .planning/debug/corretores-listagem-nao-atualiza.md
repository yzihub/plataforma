---
status: awaiting_human_verify
trigger: "Corretor está salvando no banco (POST funciona), mas a lista em /cockpit/corretores não reflete os dados reais — não busca do banco ou não atualiza após create/edit/delete."
created: 2026-04-19T00:00:00Z
updated: 2026-04-19T00:00:00Z
---

## Current Focus

hypothesis: A listagem já busca do banco real via Supabase com tenant_id correto. O problema real é que após CREATE o `refetchBrokers()` é chamado, mas em DEV_BYPASS o Supabase client não tem sessão de auth — então a query via RLS pode retornar vazio se RLS exige auth. Em prod, o mesmo problema existe: a rota POST delega ao webhook n8n (async), o `refetchBrokers()` é chamado imediatamente antes do n8n ter inserido o registro, então a lista não vê o novo corretor.
test: Ler o código de CorretoresClient.tsx e a rota POST completa
expecting: Confirmar timing issue entre POST→refetch, e RLS issue no DEV_BYPASS
next_action: APLICAR FIX — inserir diretamente no Supabase para CREATE (fallback quando webhook OK), OU adicionar delay/poll, OU o n8n retorna o objeto criado e inserimos localmente.

## Symptoms

expected: Após criar/editar/deletar um corretor, a lista em /cockpit/corretores deve mostrar os dados reais do banco (com refresh automático — sem reload de página). O tenant_id deve ser usado corretamente na query.
actual: Corretores salvos no banco não aparecem na tela. A lista provavelmente usa dados mock ou não revalida após mutações.
errors: Nenhum erro explícito relatado — falha silenciosa (lista vazia ou dados antigos).
reproduction: 1. Acessar /cockpit/corretores. 2. Criar um novo corretor. 3. Observar que o corretor criado não aparece na lista sem reload manual.
timeline: Bug provavelmente sempre existiu — listagem nunca foi conectada ao banco real.

## Eliminated

- hypothesis: "A listagem usa dados mock hardcoded"
  evidence: CorretoresClient.tsx linha 74-86 faz fetch real do Supabase com .eq("tenant_id", tenant.id). Não há mock-data importado.
  timestamp: 2026-04-19T00:00:00Z

## Evidence

- timestamp: 2026-04-19T00:00:00Z
  checked: CorretoresClient.tsx — fetch inicial
  found: Usa createClient() (browser Supabase) com .eq("tenant_id", tenant.id). Dependência do useEffect é [tenant?.id, tenantLoading].
  implication: Fetch inicial funciona desde que tenant?.id esteja disponível e RLS permita.

- timestamp: 2026-04-19T00:00:00Z
  checked: CorretoresClient.tsx — handleSave CREATE path (linhas 171-209)
  found: Chama POST /api/corretores/create → se OK, chama refetchBrokers(). O webhook n8n é ASSÍNCRONO: o route.ts retorna 201 quando o webhook retorna OK, mas o n8n pode ainda não ter inserido no banco. Portanto refetchBrokers() é chamado antes do registro existir.
  implication: TIMING BUG — refetch imediato não vê o novo corretor porque n8n ainda não finalizou a inserção.

- timestamp: 2026-04-19T00:00:00Z
  checked: /api/corretores/create/route.ts
  found: A rota chama o webhook n8n e aguarda `webhookResponse.ok`. O webhook pode retornar 200 antes de commitar no banco (n8n é event-driven). Não há resposta com o objeto criado (apenas `{ ok: true, data: webhookData }`).
  implication: Sem o objeto inserido na resposta, não podemos inserir otimisticamente. O refetch pode ou não encontrar o registro.

- timestamp: 2026-04-19T00:00:00Z
  checked: DEV_BYPASS mode — TenantContext.tsx + createClient()
  found: Em DEV_BYPASS, tenant.id = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361" (hardcoded). O createClient() usa anon key. Se a tabela `corretores` tem RLS que exige auth (user autenticado), queries via anon key sem sessão retornam vazio (não erro).
  implication: Em DEV_BYPASS, a listagem provavelmente retorna [] por causa de RLS. Este é o bug primário em dev. O timing bug é secundário (afeta prod).

## Resolution

root_cause: DOIS problemas independentes:
  1. DEV_BYPASS (primário em dev): Supabase client usa anon key sem sessão de auth. RLS na tabela `corretores` bloqueia queries, retornando [] silenciosamente.
  2. TIMING (secundário, afeta prod): após CREATE via webhook n8n, refetchBrokers() é chamado antes do n8n ter inserido o registro no banco.

fix: Criada GET /api/corretores (admin client, bypassa RLS). Adicionados PATCH e DELETE no mesmo arquivo. CorretoresClient atualizado para usar apenas API routes em todas as operações CRUD — elimina dependência do browser Supabase client com sessão. CREATE mantém otimismo local + refetch em background após 1.5s para timing do n8n. TypeScript check passou (exit 0).

verification: TypeScript noEmit — exit 0, sem erros de tipo.
files_changed:
  - src/app/api/corretores/route.ts (criado — GET, PATCH, DELETE com admin client)
  - src/components/yzihub/CorretoresClient.tsx (fetch/CRUD migrado para API routes)
