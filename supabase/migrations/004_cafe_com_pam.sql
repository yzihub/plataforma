-- ============================================================
-- YZIHUB — Migration 004: Café com Pam
-- Corrige pipeline stages para o fluxo real do cliente:
-- Lead → Agendado → Em Atendimento → Pagamento Confirmado → Concluído
-- Fonte: src/types/crm.ts (PamLeadStatus)
-- ============================================================

-- ─── Atualiza nomes dos stages existentes ───────────────────

UPDATE pipeline_stages SET
  name  = '🔥 Novo Lead',
  color = '#6366f1',
  position = 0,
  is_won = false,
  is_lost = false
WHERE id = 'bbbb0001-0001-0001-0001-000000000001';

UPDATE pipeline_stages SET
  name  = '📅 Agendado',
  color = '#f59e0b',
  position = 1,
  is_won = false,
  is_lost = false
WHERE id = 'bbbb0001-0001-0001-0001-000000000002';

UPDATE pipeline_stages SET
  name  = '💬 Em Atendimento',
  color = '#8b5cf6',
  position = 2,
  is_won = false,
  is_lost = false
WHERE id = 'bbbb0001-0001-0001-0001-000000000003';

UPDATE pipeline_stages SET
  name  = '💳 Pagamento Confirmado',
  color = '#10b981',
  position = 3,
  is_won = false,
  is_lost = false
WHERE id = 'bbbb0001-0001-0001-0001-000000000004';

UPDATE pipeline_stages SET
  name  = '✅ Concluído',
  color = '#059669',
  position = 4,
  is_won = true,
  is_lost = false
WHERE id = 'bbbb0001-0001-0001-0001-000000000005';

UPDATE pipeline_stages SET
  name  = '❌ Cancelado',
  color = '#ef4444',
  position = 5,
  is_won = false,
  is_lost = true
WHERE id = 'bbbb0001-0001-0001-0001-000000000006';

-- Remove o 7º stage (redundante — Perdido coberto por Cancelado)
DELETE FROM pipeline_stages
WHERE id = 'bbbb0001-0001-0001-0001-000000000007';

-- ─── Realoca leads que estavam no stage deletado ─────────────
-- Move para Cancelado
UPDATE leads
SET stage_id = 'bbbb0001-0001-0001-0001-000000000006',
    status   = 'lost'
WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001'
  AND stage_id  = 'bbbb0001-0001-0001-0001-000000000007';

-- ─── Atualiza status dos leads para bater com o stage ────────

UPDATE leads SET status = 'new'
WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001'
  AND stage_id  = 'bbbb0001-0001-0001-0001-000000000001';

UPDATE leads SET status = 'contacted'
WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001'
  AND stage_id  = 'bbbb0001-0001-0001-0001-000000000002';

UPDATE leads SET status = 'qualified'
WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001'
  AND stage_id  = 'bbbb0001-0001-0001-0001-000000000003';

UPDATE leads SET status = 'proposal'
WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001'
  AND stage_id  = 'bbbb0001-0001-0001-0001-000000000004';

UPDATE leads SET status = 'won'
WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001'
  AND stage_id  = 'bbbb0001-0001-0001-0001-000000000005';

UPDATE leads SET status = 'lost'
WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001'
  AND stage_id  = 'bbbb0001-0001-0001-0001-000000000006';

-- ─── Confirmação ────────────────────────────────────────────

SELECT id, name, color, position, is_won, is_lost
FROM pipeline_stages
WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001'
ORDER BY position;
