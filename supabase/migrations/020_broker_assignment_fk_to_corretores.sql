-- Migração: alinhar a atribuição operacional de leads/contratos/deals com `corretores.id`
-- Idempotente: pode ser reaplicada com segurança.

DO $$
DECLARE
  fk_name text;
BEGIN
  -- leads.assigned_to -> corretores.id
  SELECT con.conname
    INTO fk_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
  WHERE rel.relname = 'leads'
    AND att.attname = 'assigned_to'
    AND con.contype = 'f'
  LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE leads DROP CONSTRAINT %I', fk_name);
  END IF;

  ALTER TABLE leads
    ADD CONSTRAINT leads_assigned_to_fkey
    FOREIGN KEY (assigned_to)
    REFERENCES corretores(id)
    ON DELETE SET NULL;
END $$;

DO $$
DECLARE
  fk_name text;
BEGIN
  -- contracts.corretor_id -> corretores.id, caso a coluna exista neste ambiente
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'contracts'
      AND column_name = 'corretor_id'
  ) THEN
    SELECT con.conname
      INTO fk_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
    WHERE rel.relname = 'contracts'
      AND att.attname = 'corretor_id'
      AND con.contype = 'f'
    LIMIT 1;

    IF fk_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE contracts DROP CONSTRAINT %I', fk_name);
    END IF;

    ALTER TABLE contracts
      ADD CONSTRAINT contracts_corretor_id_fkey
      FOREIGN KEY (corretor_id)
      REFERENCES corretores(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
DECLARE
  fk_name text;
BEGIN
  -- contracts.broker_id -> corretores.id, caso a coluna exista neste ambiente
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'contracts'
      AND column_name = 'broker_id'
  ) THEN
    SELECT con.conname
      INTO fk_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
    WHERE rel.relname = 'contracts'
      AND att.attname = 'broker_id'
      AND con.contype = 'f'
    LIMIT 1;

    IF fk_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE contracts DROP CONSTRAINT %I', fk_name);
    END IF;

    ALTER TABLE contracts
      ADD CONSTRAINT contracts_broker_id_fkey
      FOREIGN KEY (broker_id)
      REFERENCES corretores(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
DECLARE
  fk_name text;
BEGIN
  -- jurema_deals.assigned_broker_id -> corretores.id, caso a tabela/coluna existam neste ambiente
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'jurema_deals'
      AND column_name = 'assigned_broker_id'
  ) THEN
    SELECT con.conname
      INTO fk_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
    WHERE rel.relname = 'jurema_deals'
      AND att.attname = 'assigned_broker_id'
      AND con.contype = 'f'
    LIMIT 1;

    IF fk_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE jurema_deals DROP CONSTRAINT %I', fk_name);
    END IF;

    ALTER TABLE jurema_deals
      ADD CONSTRAINT jurema_deals_assigned_broker_id_fkey
      FOREIGN KEY (assigned_broker_id)
      REFERENCES corretores(id)
      ON DELETE SET NULL;
  END IF;
END $$;

