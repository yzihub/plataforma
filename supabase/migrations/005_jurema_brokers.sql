-- ============================================================
-- YZIHUB — Migration 005: Jurema Brokers
-- Corrige pipeline stages para o fluxo real do cliente:
-- Lead → Agendado → Visita → Proposta → Contrato → Fechado
-- ============================================================

-- ─── Atualiza nomes dos stages existentes ───────────────────

UPDATE pipeline_stages SET
  name  = '🔥 Lead',
  color = '#6366f1',
  position = 0,
  is_won = false,
  is_lost = false
WHERE id = 'bbbb0002-0002-0002-0002-000000000001';

UPDATE pipeline_stages SET
  name  = '📅 Agendado',
  color = '#3b82f6',
  position = 1,
  is_won = false,
  is_lost = false
WHERE id = 'bbbb0002-0002-0002-0002-000000000002';

UPDATE pipeline_stages SET
  name  = '🏠 Visita',
  color = '#f59e0b',
  position = 2,
  is_won = false,
  is_lost = false
WHERE id = 'bbbb0002-0002-0002-0002-000000000003';

UPDATE pipeline_stages SET
  name  = '💰 Proposta',
  color = '#8b5cf6',
  position = 3,
  is_won = false,
  is_lost = false
WHERE id = 'bbbb0002-0002-0002-0002-000000000004';

UPDATE pipeline_stages SET
  name  = '📋 Contrato',
  color = '#f97316',
  position = 4,
  is_won = false,
  is_lost = false
WHERE id = 'bbbb0002-0002-0002-0002-000000000005';

UPDATE pipeline_stages SET
  name  = '✅ Fechado',
  color = '#22c55e',
  position = 5,
  is_won = true,
  is_lost = false
WHERE id = 'bbbb0002-0002-0002-0002-000000000006';

UPDATE pipeline_stages SET
  name  = '❌ Perdido',
  color = '#ef4444',
  position = 6,
  is_won = false,
  is_lost = true
WHERE id = 'bbbb0002-0002-0002-0002-000000000007';

-- ─── Atualiza status dos leads para bater com o stage ────────

UPDATE leads SET status = 'new'
WHERE tenant_id = 'aaaaaaaa-0002-0002-0002-000000000002'
  AND stage_id  = 'bbbb0002-0002-0002-0002-000000000001';

UPDATE leads SET status = 'contacted'
WHERE tenant_id = 'aaaaaaaa-0002-0002-0002-000000000002'
  AND stage_id  = 'bbbb0002-0002-0002-0002-000000000002';

UPDATE leads SET status = 'qualified'
WHERE tenant_id = 'aaaaaaaa-0002-0002-0002-000000000002'
  AND stage_id  = 'bbbb0002-0002-0002-0002-000000000003';

UPDATE leads SET status = 'proposal'
WHERE tenant_id = 'aaaaaaaa-0002-0002-0002-000000000002'
  AND stage_id  = 'bbbb0002-0002-0002-0002-000000000004';

UPDATE leads SET status = 'negotiation'
WHERE tenant_id = 'aaaaaaaa-0002-0002-0002-000000000002'
  AND stage_id  = 'bbbb0002-0002-0002-0002-000000000005';

UPDATE leads SET status = 'won'
WHERE tenant_id = 'aaaaaaaa-0002-0002-0002-000000000002'
  AND stage_id  = 'bbbb0002-0002-0002-0002-000000000006';

UPDATE leads SET status = 'lost'
WHERE tenant_id = 'aaaaaaaa-0002-0002-0002-000000000002'
  AND stage_id  = 'bbbb0002-0002-0002-0002-000000000007';

-- ─── Confirmação ────────────────────────────────────────────

SELECT id, name, color, position, is_won, is_lost
FROM pipeline_stages
WHERE tenant_id = 'aaaaaaaa-0002-0002-0002-000000000002'
ORDER BY position;
