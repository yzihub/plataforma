-- Migration: update_contracts_status_constraint
-- Purpose: Standardize contracts.status CHECK constraint to English values
-- Replaces Portuguese values (rascunho, pendente, assinado, cancelado, expirado)
-- with English equivalents (draft, sent, signed, cancelled)

-- Step 1: Update existing rows with old Portuguese status values to English equivalents
-- Must happen BEFORE adding the new constraint to avoid violations
UPDATE contracts
SET status = CASE status
  WHEN 'rascunho'  THEN 'draft'
  WHEN 'pendente'  THEN 'draft'
  WHEN 'assinado'  THEN 'signed'
  WHEN 'cancelado' THEN 'cancelled'
  WHEN 'expirado'  THEN 'cancelled'
  ELSE status
END
WHERE status IN ('rascunho', 'pendente', 'assinado', 'cancelado', 'expirado');

-- Step 2: Drop ALL existing CHECK constraints on the status column (named or unnamed)
-- Uses a DO block to handle any auto-generated constraint names from inline CHECK declarations
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'contracts'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%'
  LOOP
    EXECUTE 'ALTER TABLE contracts DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- Step 3: Add new named CHECK constraint with English values only
ALTER TABLE contracts
  ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('draft', 'sent', 'signed', 'cancelled'));
