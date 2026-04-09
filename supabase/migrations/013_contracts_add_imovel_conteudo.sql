-- ============================================================
-- YZIHUB — Migration 013: Estender tabela contracts
-- Adiciona imovel_id (FK properties), conteudo (text) e
-- index composto (tenant_id, lead_id)
-- ============================================================

-- ─── Novas colunas ────────────────────────────────────────────

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS imovel_id UUID REFERENCES properties(id) ON DELETE SET NULL;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS conteudo TEXT;

-- ─── Index composto (tenant_id, lead_id) ──────────────────────

CREATE INDEX IF NOT EXISTS idx_contracts_tenant_lead
  ON contracts(tenant_id, lead_id);
