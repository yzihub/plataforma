-- ============================================================
-- YZIHUB — Migration 020: Corrigir FK contracts.imovel_id
-- De: properties(id)  →  Para: imoveis(id)
-- ============================================================

-- 1. Dropar FK existente (aponta para properties) — pelo nome exato
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_imovel_id_fkey;

-- 2. Zerar imovel_id orfao (UUIDs que nao existem em imoveis)
UPDATE contracts
SET imovel_id = NULL
WHERE imovel_id IS NOT NULL
  AND imovel_id NOT IN (SELECT id FROM imoveis);

-- 3. Recriar FK apontando para imoveis
ALTER TABLE contracts
  ADD CONSTRAINT contracts_imovel_id_fkey
  FOREIGN KEY (imovel_id) REFERENCES imoveis(id) ON DELETE SET NULL;
