-- ============================================================
-- YZIHUB — Migration 011: Contracts Table
-- Tabela de contratos com RLS por tenant_id
-- Storage bucket para arquivos de contratos
-- Seed para Jurema Brokers
-- ============================================================

-- ─── Tabela contracts ─────────────────────────────────────────

CREATE TABLE contracts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id       UUID REFERENCES leads(id) ON DELETE SET NULL,
  lead_name     TEXT NOT NULL,
  project_id    UUID REFERENCES properties(id) ON DELETE SET NULL,
  project_name  TEXT,
  corretor_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  corretor_name TEXT,
  title         TEXT,
  type          TEXT NOT NULL DEFAULT 'venda' CHECK (type IN ('venda','locacao','servico','parceria')),
  status        TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','pendente','assinado','cancelado','expirado')),
  value         NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes         TEXT,
  file_url      TEXT,
  file_name     TEXT,
  signed_at     TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────

CREATE INDEX idx_contracts_tenant_id ON contracts(tenant_id);
CREATE INDEX idx_contracts_lead_id   ON contracts(lead_id);
CREATE INDEX idx_contracts_status    ON contracts(tenant_id, status);

-- ─── updated_at trigger ───────────────────────────────────────

CREATE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts_select" ON contracts
  FOR SELECT USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "contracts_all" ON contracts
  FOR ALL USING (is_global_admin() OR tenant_id = auth_tenant_id());

-- ─── Storage bucket para arquivos de contratos ────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: usuarios podem fazer upload e ler arquivos na pasta do seu tenant
CREATE POLICY "contracts_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'contracts'
    AND (
      is_global_admin()
      OR (storage.foldername(name))[1] = (auth_tenant_id())::text
    )
  );

CREATE POLICY "contracts_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'contracts'
    AND (
      is_global_admin()
      OR (storage.foldername(name))[1] = (auth_tenant_id())::text
    )
  );

CREATE POLICY "contracts_storage_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'contracts'
    AND (
      is_global_admin()
      OR (storage.foldername(name))[1] = (auth_tenant_id())::text
    )
  );

-- ─── Seed: Jurema Brokers ─────────────────────────────────────
-- tenant_id: aaaaaaaa-0002-0002-0002-000000000002
-- Leads reais (de migration 003):
--   cccc0002-0002-0002-0002-000000000006 = Natalia Barros (520000)
--   cccc0002-0002-0002-0002-000000000007 = Osvaldo Lima   (450000)
--   cccc0002-0002-0002-0002-000000000005 = Marcos Vieira  (680000)
--   cccc0002-0002-0002-0002-000000000004 = Larissa Melo   (350000)
--   cccc0002-0002-0002-0002-000000000003 = Kleber Santos  (420000)

INSERT INTO contracts (
  id, tenant_id, lead_id, lead_name, project_name, corretor_name,
  title, type, status, value, notes, signed_at, expires_at
) VALUES
  (
    'dddd0002-0002-0002-0002-000000000001',
    'aaaaaaaa-0002-0002-0002-000000000002',
    'cccc0002-0002-0002-0002-000000000007',
    'Osvaldo Lima',
    'Apto 3 Qtos Vista Mar - Meireles',
    'Luana Azevedo',
    'Compra e Venda — Osvaldo Lima',
    'venda',
    'assinado',
    450000.00,
    'Cliente muito satisfeito. Financiamento aprovado pela CEF.',
    NOW() - INTERVAL '15 days',
    NOW() + INTERVAL '30 days'
  ),
  (
    'dddd0002-0002-0002-0002-000000000002',
    'aaaaaaaa-0002-0002-0002-000000000002',
    'cccc0002-0002-0002-0002-000000000005',
    'Marcos Vieira',
    'Casa Duplex Aldeota',
    'Luana Azevedo',
    'Compra e Venda — Marcos Vieira (Construtora MV)',
    'venda',
    'pendente',
    680000.00,
    'Aguardando aprovação de financiamento corporativo.',
    NULL,
    NOW() + INTERVAL '45 days'
  ),
  (
    'dddd0002-0002-0002-0002-000000000003',
    'aaaaaaaa-0002-0002-0002-000000000002',
    'cccc0002-0002-0002-0002-000000000006',
    'Natalia Barros',
    'Studio Premium Coco',
    'Luana Azevedo',
    'Compra e Venda — Natalia Barros',
    'venda',
    'pendente',
    520000.00,
    'Contrato em revisão pelo advogado do cliente.',
    NULL,
    NOW() + INTERVAL '20 days'
  ),
  (
    'dddd0002-0002-0002-0002-000000000004',
    'aaaaaaaa-0002-0002-0002-000000000002',
    'cccc0002-0002-0002-0002-000000000004',
    'Larissa Melo',
    NULL,
    'Luana Azevedo',
    'Locacao Residencial — Larissa Melo',
    'locacao',
    'rascunho',
    350000.00,
    NULL,
    NULL,
    NULL
  ),
  (
    'dddd0002-0002-0002-0002-000000000005',
    'aaaaaaaa-0002-0002-0002-000000000002',
    'cccc0002-0002-0002-0002-000000000003',
    'Kleber Santos',
    'Cobertura Duplex Papicu',
    'Luana Azevedo',
    'Compra e Venda — Kleber Santos',
    'venda',
    'cancelado',
    420000.00,
    'Cliente desistiu devido a mudança de cidade.',
    NULL,
    NULL
  )
ON CONFLICT (id) DO NOTHING;
