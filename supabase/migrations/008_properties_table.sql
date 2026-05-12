-- ============================================================
-- YZIHUB — Migration 008: Tabela de Imóveis
-- Módulo exclusivo para tenants do tipo imobiliária (Jurema Brokers)
-- ============================================================

CREATE TABLE properties (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  photo_url   TEXT,
  price       NUMERIC(14, 2) NOT NULL DEFAULT 0,
  location    TEXT NOT NULL,
  area_sqm    NUMERIC(8, 2),
  status      TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'reserved')),
  link        TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_properties_tenant_id ON properties(tenant_id);
CREATE INDEX idx_properties_status    ON properties(tenant_id, status);

CREATE TRIGGER trg_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties_select" ON properties FOR SELECT
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "properties_all" ON properties FOR ALL
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

-- ─── Seed: Jurema Brokers (aaaaaaaa-0002-0002-0002-000000000002) ─────────────

INSERT INTO properties (tenant_id, title, photo_url, price, location, area_sqm, status, link) VALUES
  (
    'aaaaaaaa-0002-0002-0002-000000000002',
    'Apartamento Alto Padrão — Meireles',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80',
    980000.00,
    'Meireles, Fortaleza — CE',
    120.00,
    'available',
    'https://juremabrokers.com.br/imovel/ap-meireles-01'
  ),
  (
    'aaaaaaaa-0002-0002-0002-000000000002',
    'Casa em Condomínio — Eusébio',
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80',
    650000.00,
    'Eusébio — CE',
    220.00,
    'available',
    'https://juremabrokers.com.br/imovel/casa-eusebio-01'
  ),
  (
    'aaaaaaaa-0002-0002-0002-000000000002',
    'Cobertura Duplex — Aldeota',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    1450000.00,
    'Aldeota, Fortaleza — CE',
    280.00,
    'sold',
    'https://juremabrokers.com.br/imovel/cobertura-aldeota-01'
  ),
  (
    'aaaaaaaa-0002-0002-0002-000000000002',
    'Studio Moderno — Varjota',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    320000.00,
    'Varjota, Fortaleza — CE',
    45.00,
    'reserved',
    'https://juremabrokers.com.br/imovel/studio-varjota-01'
  ),
  (
    'aaaaaaaa-0002-0002-0002-000000000002',
    'Casa com Piscina — Aquiraz',
    'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80',
    890000.00,
    'Aquiraz — CE',
    310.00,
    'available',
    'https://juremabrokers.com.br/imovel/casa-aquiraz-01'
  ),
  (
    'aaaaaaaa-0002-0002-0002-000000000002',
    'Sala Comercial — Faria Lima',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    430000.00,
    'Faria Lima, Fortaleza — CE',
    68.00,
    'available',
    'https://juremabrokers.com.br/imovel/sala-farialima-01'
  );
