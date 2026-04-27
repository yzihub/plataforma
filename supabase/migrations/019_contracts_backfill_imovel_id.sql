-- Fase 1: backfill imovel_id a partir de project_id nos contratos existentes.
-- project_id permanece intacto (compatibilidade temporária).
UPDATE contracts
SET imovel_id = project_id
WHERE project_id IS NOT NULL
  AND imovel_id IS NULL;
