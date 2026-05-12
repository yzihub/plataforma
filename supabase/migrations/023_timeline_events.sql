-- Timeline operacional unificada do YZI IMOB
-- Memoria persistida por tenant, com separacao clara entre operacao e auth/auditoria.

CREATE TABLE IF NOT EXISTS timeline_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id      UUID REFERENCES leads(id) ON DELETE SET NULL,
  deal_id      UUID,
  contract_id  UUID REFERENCES contracts(id) ON DELETE SET NULL,
  imovel_id    UUID REFERENCES imoveis(id) ON DELETE SET NULL,
  corretor_id  UUID REFERENCES corretores(id) ON DELETE SET NULL,
  event_type   TEXT NOT NULL,
  event_label  TEXT NOT NULL,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT timeline_events_event_type_check CHECK (
    event_type IN (
      'lead_created',
      'lead_assigned',
      'lead_qualified',
      'contract_generated',
      'contract_sent',
      'contract_signed',
      'property_reserved',
      'property_sold',
      'commission_created',
      'payment_confirmed'
    )
  )
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'jurema_deals'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'timeline_events_deal_id_fkey'
    ) THEN
      ALTER TABLE timeline_events
        ADD CONSTRAINT timeline_events_deal_id_fkey
        FOREIGN KEY (deal_id)
        REFERENCES jurema_deals(id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_timeline_events_tenant_created
  ON timeline_events(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_timeline_events_tenant_lead
  ON timeline_events(tenant_id, lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_timeline_events_tenant_contract
  ON timeline_events(tenant_id, contract_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_timeline_events_tenant_imovel
  ON timeline_events(tenant_id, imovel_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_timeline_events_tenant_corretor
  ON timeline_events(tenant_id, corretor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_timeline_events_tenant_event_type
  ON timeline_events(tenant_id, event_type, created_at DESC);

ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timeline_events_select" ON timeline_events
  FOR SELECT USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "timeline_events_insert" ON timeline_events
  FOR INSERT WITH CHECK (is_global_admin() OR tenant_id = auth_tenant_id());
