-- ============================================================
-- YZIHUB — Migration 018: Expand job_queue.action constraint
-- Adds 'gerar_contrato' to allowed action values so the
-- contract generation flow can enqueue jobs distinctly
-- from lead proposal actions.
-- ============================================================

-- Step 1: Drop existing CHECK constraint on action column
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'job_queue'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%action%'
  LOOP
    EXECUTE 'ALTER TABLE job_queue DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- Step 2: Add new constraint including 'gerar_contrato'
ALTER TABLE job_queue
  ADD CONSTRAINT job_queue_action_check
  CHECK (action IN (
    'qualify',
    'send_proposal',
    'schedule',
    'close',
    'ai_takeover',
    'factory_activate',
    'gerar_contrato'
  ));
