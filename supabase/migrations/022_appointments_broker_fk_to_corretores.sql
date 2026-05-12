-- Alinha appointments.broker_id com a entidade operacional `corretores`

DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT con.conname
    INTO fk_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
  WHERE rel.relname = 'appointments'
    AND att.attname = 'broker_id'
    AND con.contype = 'f'
  LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE appointments DROP CONSTRAINT %I', fk_name);
  END IF;

  ALTER TABLE appointments
    ADD CONSTRAINT appointments_broker_id_fkey
    FOREIGN KEY (broker_id)
    REFERENCES corretores(id)
    ON DELETE SET NULL;
END $$;
