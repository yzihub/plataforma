-- Captador operacional do imóvel. Nullable para preservar imóveis existentes.
ALTER TABLE imoveis
  ADD COLUMN IF NOT EXISTS captador_id UUID REFERENCES corretores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_imoveis_captador_id
  ON imoveis(tenant_id, captador_id);
