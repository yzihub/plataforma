-- YZIHUB — Migration 009: Extend properties table for Jurema Brokers

-- ============================================================
-- Add new columns to properties table
-- ============================================================

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS property_type        TEXT,
  ADD COLUMN IF NOT EXISTS construction_status  TEXT,
  ADD COLUMN IF NOT EXISTS publication_status   TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS tags                 TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS neighborhood         TEXT,
  ADD COLUMN IF NOT EXISTS purpose              TEXT;

-- ============================================================
-- Seed: Update Jurema Brokers properties
-- tenant_id = 'aaaaaaaa-0002-0002-0002-000000000002'
-- ============================================================

-- 1. Apartamento Alto Padrão — Meireles
UPDATE properties
SET
  property_type       = 'Apartamento',
  construction_status = 'Pronto',
  publication_status  = 'published',
  purpose             = 'Venda',
  neighborhood        = 'Meireles',
  tags                = '{Alto Padrão,Disponível}'
WHERE tenant_id = 'aaaaaaaa-0002-0002-0002-000000000002'
  AND title = 'Apartamento Alto Padrão — Meireles';

-- 2. Casa em Condomínio — Eusébio
UPDATE properties
SET
  property_type       = 'Casa',
  construction_status = 'Pronto',
  publication_status  = 'published',
  purpose             = 'Venda',
  neighborhood        = 'Eusébio',
  tags                = '{Condomínio}'
WHERE tenant_id = 'aaaaaaaa-0002-0002-0002-000000000002'
  AND title = 'Casa em Condomínio — Eusébio';

-- 3. Cobertura Duplex — Aldeota
UPDATE properties
SET
  property_type       = 'Cobertura',
  construction_status = 'Pronto',
  publication_status  = 'archived',
  purpose             = 'Venda',
  neighborhood        = 'Aldeota',
  tags                = '{Vendido,Duplex}'
WHERE tenant_id = 'aaaaaaaa-0002-0002-0002-000000000002'
  AND title = 'Cobertura Duplex — Aldeota';

-- 4. Studio Moderno — Varjota
UPDATE properties
SET
  property_type       = 'Studio',
  construction_status = 'Pronto',
  publication_status  = 'published',
  purpose             = 'Venda',
  neighborhood        = 'Varjota',
  tags                = '{Moderno}'
WHERE tenant_id = 'aaaaaaaa-0002-0002-0002-000000000002'
  AND title = 'Studio Moderno — Varjota';

-- 5. Casa com Piscina — Aquiraz
UPDATE properties
SET
  property_type       = 'Casa',
  construction_status = 'Pronto',
  publication_status  = 'published',
  purpose             = 'Venda',
  neighborhood        = 'Aquiraz',
  tags                = '{Piscina,Premium}'
WHERE tenant_id = 'aaaaaaaa-0002-0002-0002-000000000002'
  AND title = 'Casa com Piscina — Aquiraz';

-- 6. Sala Comercial — Faria Lima
UPDATE properties
SET
  property_type       = 'Sala Comercial',
  construction_status = 'Pronto',
  publication_status  = 'published',
  purpose             = 'Venda',
  neighborhood        = 'Faria Lima',
  tags                = '{Comercial}'
WHERE tenant_id = 'aaaaaaaa-0002-0002-0002-000000000002'
  AND title = 'Sala Comercial — Faria Lima';
