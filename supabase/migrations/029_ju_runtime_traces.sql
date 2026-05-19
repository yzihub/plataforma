-- Trace layer unificada para o runtime da Ju.
-- Cada chamada ao executeJuRuntimeState gera exatamente um registro aqui.
-- Permite responder: por quê a Ju respondeu isso? qual state? qual retrieval?
-- houve replay? houve fallback? houve loop? qual tool foi decidida?
--
-- Design: append-only, sem FKs operacionais rígidas (igual ao gateway_logs),
-- tolerante a falha (runtime continua mesmo se insert falhar).

CREATE TABLE IF NOT EXISTS ju_runtime_traces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identificação da execução
  runtime_trace_id TEXT NOT NULL,
  correlation_id    TEXT NOT NULL,

  -- Identifiers operacionais (sem FK rígida — trace não pode bloquear runtime)
  tenant_id         UUID REFERENCES tenants(id) ON DELETE SET NULL,
  lead_id           UUID,
  deal_id           UUID,
  conversation_id   UUID,

  -- Timing
  started_at    TIMESTAMPTZ NOT NULL,
  completed_at  TIMESTAMPTZ,
  latency_ms    INTEGER,

  -- State snapshot
  runtime_state          TEXT,
  previous_runtime_state TEXT,
  objective_state        TEXT,
  previous_objective_state TEXT,
  next_action            TEXT,
  transition_reason      TEXT,
  valid_transition       BOOLEAN,
  valid_objective_transition BOOLEAN,

  -- Retrieval snapshot
  retrieval_policy   TEXT,
  retrieval_allowed  BOOLEAN,
  retrieval_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Tool governance snapshot
  tool_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Replay markers
  is_replay              BOOLEAN NOT NULL DEFAULT false,
  replay_marker          TEXT,
  replay_source_trace_id TEXT,

  -- Anomalias
  loop_risk        TEXT,
  loop_detected    BOOLEAN NOT NULL DEFAULT false,
  fallback_triggered BOOLEAN NOT NULL DEFAULT false,
  fallback_reason  TEXT,

  -- Snapshots completos para debug
  state_snapshot   JSONB NOT NULL DEFAULT '{}'::jsonb,
  context_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Status da execução
  status        TEXT NOT NULL DEFAULT 'ok',
  error_message TEXT,
  persisted     BOOLEAN NOT NULL DEFAULT false,

  -- Canal
  channel TEXT,
  origin  TEXT,
  source  TEXT,

  -- Metadados extras livres
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ju_runtime_traces_status_check CHECK (status IN ('ok', 'error', 'fallback'))
);

CREATE INDEX IF NOT EXISTS idx_ju_runtime_traces_runtime_trace_id
  ON ju_runtime_traces(runtime_trace_id);

CREATE INDEX IF NOT EXISTS idx_ju_runtime_traces_correlation
  ON ju_runtime_traces(correlation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ju_runtime_traces_tenant_created
  ON ju_runtime_traces(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ju_runtime_traces_conversation
  ON ju_runtime_traces(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ju_runtime_traces_status
  ON ju_runtime_traces(status, loop_detected, created_at DESC);

ALTER TABLE ju_runtime_traces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ju_runtime_traces_select" ON ju_runtime_traces;
CREATE POLICY "ju_runtime_traces_select" ON ju_runtime_traces
  FOR SELECT USING (is_global_admin() OR tenant_id = auth_tenant_id());

DROP POLICY IF EXISTS "ju_runtime_traces_insert" ON ju_runtime_traces;
CREATE POLICY "ju_runtime_traces_insert" ON ju_runtime_traces
  FOR INSERT WITH CHECK (is_global_admin() OR tenant_id = auth_tenant_id());
