-- Migration 014: Tabela brokers dedicada para gestao de corretores por tenant
-- Decisao: option-a (tabela propria, separada de profiles)
-- Refs: .planning/quick/260414-o6s-criar-m-dulo-de-corretores

CREATE TABLE IF NOT EXISTS brokers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  role        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_brokers_tenant_id ON brokers(tenant_id);

-- RLS: isolar corretores por tenant do usuario autenticado
ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_brokers_select"
  ON brokers FOR SELECT
  USING (
    tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "tenant_brokers_insert"
  ON brokers FOR INSERT
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "tenant_brokers_update"
  ON brokers FOR UPDATE
  USING (
    tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );
