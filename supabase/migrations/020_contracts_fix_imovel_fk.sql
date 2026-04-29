-- ============================================================
-- YZIHUB — Migration 020: Corrigir FK contracts.imovel_id
-- De: properties(id)  →  Para: imoveis(id)
-- ============================================================

-- 1. Dropar FK existente (aponta para properties)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'contracts'::regclass
      AND contype = 'f'
      AND conname LIKE '%imovel%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE contracts DROP CONSTRAINT ' || quote_ident(conname)
      FROM pg_constraint
      WHERE conrelid = 'contracts'::regclass
        AND contype = 'f'
        AND conname LIKE '%imovel%'
      LIMIT 1
    );
  END IF;
END $$;

-- 2. Zerar imovel_id orfao (UUIDs que nao existem em imoveis)
UPDATE contracts
SET imovel_id = NULL
WHERE imovel_id IS NOT NULL
  AND imovel_id NOT IN (SELECT id FROM imoveis);

-- 3. Recriar FK apontando para imoveis
ALTER TABLE contracts
  ADD CONSTRAINT contracts_imovel_id_fkey
  FOREIGN KEY (imovel_id) REFERENCES imoveis(id) ON DELETE SET NULL;
