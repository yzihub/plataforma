-- Runtime Gateway observability for machine-to-machine Ju runtime requests.

CREATE TABLE IF NOT EXISTS ju_runtime_gateway_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  deal_id UUID,
  conversation_id UUID,
  correlation_id TEXT NOT NULL,
  route TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'POST',
  source TEXT NOT NULL,
  channel TEXT,
  origin TEXT,
  authenticated BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  error_message TEXT,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  persisted BOOLEAN NOT NULL DEFAULT false,
  runtime_state TEXT,
  objective_state TEXT,
  next_action TEXT,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ju_runtime_gateway_logs_status_check CHECK (
    status IN ('ok', 'error', 'unauthorized')
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
      WHERE conname = 'ju_runtime_gateway_logs_deal_id_fkey'
    ) THEN
      ALTER TABLE ju_runtime_gateway_logs
        ADD CONSTRAINT ju_runtime_gateway_logs_deal_id_fkey
        FOREIGN KEY (deal_id)
        REFERENCES jurema_deals(id)
        ON DELETE SET NULL;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'conversations'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'ju_runtime_gateway_logs_conversation_id_fkey'
    ) THEN
      ALTER TABLE ju_runtime_gateway_logs
        ADD CONSTRAINT ju_runtime_gateway_logs_conversation_id_fkey
        FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ju_runtime_gateway_logs_correlation
  ON ju_runtime_gateway_logs(correlation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ju_runtime_gateway_logs_tenant_created
  ON ju_runtime_gateway_logs(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ju_runtime_gateway_logs_status
  ON ju_runtime_gateway_logs(status, status_code, created_at DESC);

ALTER TABLE ju_runtime_gateway_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ju_runtime_gateway_logs_select" ON ju_runtime_gateway_logs;
CREATE POLICY "ju_runtime_gateway_logs_select" ON ju_runtime_gateway_logs
  FOR SELECT USING (is_global_admin() OR tenant_id = auth_tenant_id());

DROP POLICY IF EXISTS "ju_runtime_gateway_logs_insert" ON ju_runtime_gateway_logs;
CREATE POLICY "ju_runtime_gateway_logs_insert" ON ju_runtime_gateway_logs
  FOR INSERT WITH CHECK (is_global_admin() OR tenant_id = auth_tenant_id());
