-- State engine institucional da Ju/YZI IMOB.
-- O LLM gera linguagem; o backend decide fluxo; o banco guarda a verdade.

CREATE TABLE IF NOT EXISTS ju_runtime_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  deal_id UUID,
  conversation_id UUID NOT NULL,
  runtime_state TEXT NOT NULL,
  next_action TEXT NOT NULL,
  conversation_mode TEXT NOT NULL,
  escalation_state TEXT NOT NULL DEFAULT 'none',
  handoff_state TEXT NOT NULL DEFAULT 'none',
  objective_state TEXT NOT NULL DEFAULT 'unknown',
  allowed_tools TEXT[] NOT NULL DEFAULT '{}'::text[],
  required_tools TEXT[] NOT NULL DEFAULT '{}'::text[],
  retrieval_policy TEXT NOT NULL DEFAULT 'disabled',
  blocked_questions TEXT[] NOT NULL DEFAULT '{}'::text[],
  resolved_fields TEXT[] NOT NULL DEFAULT '{}'::text[],
  missing_fields TEXT[] NOT NULL DEFAULT '{}'::text[],
  loop_risk TEXT NOT NULL DEFAULT 'low',
  token_budget JSONB NOT NULL DEFAULT '{}'::jsonb,
  state_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  decision_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_transition_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ju_runtime_states_conversation_unique UNIQUE (tenant_id, conversation_id),
  CONSTRAINT ju_runtime_states_runtime_state_check CHECK (
    runtime_state IN (
      'lead_novo',
      'qualificacao',
      'buscando_imoveis',
      'aguardando_resposta',
      'visita_agendada',
      'followup_visita',
      'negociacao',
      'contrato',
      'pos_venda',
      'handoff_humano'
    )
  ),
  CONSTRAINT ju_runtime_states_next_action_check CHECK (
    next_action IN (
      'qualificar_objetivo',
      'qualificar_budget',
      'qualificar_bairro',
      'apresentar_imoveis',
      'agendar_visita',
      'followup_visita',
      'cobrar_documentacao',
      'handoff_corretor',
      'responder_duvida',
      'aguardar_resposta',
      'fallback_midia'
    )
  ),
  CONSTRAINT ju_runtime_states_conversation_mode_check CHECK (
    conversation_mode IN (
      'discovery',
      'qualification',
      'recommendation',
      'scheduling',
      'negotiation',
      'support',
      'followup',
      'escalation'
    )
  ),
  CONSTRAINT ju_runtime_states_escalation_state_check CHECK (
    escalation_state IN ('none', 'requested', 'required', 'active', 'resolved')
  ),
  CONSTRAINT ju_runtime_states_handoff_state_check CHECK (
    handoff_state IN ('none', 'requested', 'assigned', 'completed')
  ),
  CONSTRAINT ju_runtime_states_loop_risk_check CHECK (
    loop_risk IN ('low', 'medium', 'high')
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
      WHERE conname = 'ju_runtime_states_deal_id_fkey'
    ) THEN
      ALTER TABLE ju_runtime_states
        ADD CONSTRAINT ju_runtime_states_deal_id_fkey
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
      WHERE conname = 'ju_runtime_states_conversation_id_fkey'
    ) THEN
      ALTER TABLE ju_runtime_states
        ADD CONSTRAINT ju_runtime_states_conversation_id_fkey
        FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ju_runtime_transition_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  deal_id UUID,
  conversation_id UUID NOT NULL,
  previous_runtime_state TEXT,
  runtime_state TEXT NOT NULL,
  previous_next_action TEXT,
  next_action TEXT NOT NULL,
  transition_reason TEXT NOT NULL,
  valid_transition BOOLEAN NOT NULL DEFAULT true,
  allowed_tools TEXT[] NOT NULL DEFAULT '{}'::text[],
  required_tools TEXT[] NOT NULL DEFAULT '{}'::text[],
  retrieval_policy TEXT NOT NULL DEFAULT 'disabled',
  loop_risk TEXT NOT NULL DEFAULT 'low',
  tool_trace JSONB NOT NULL DEFAULT '{}'::jsonb,
  retrieval_trace JSONB NOT NULL DEFAULT '{}'::jsonb,
  fallback_trace JSONB NOT NULL DEFAULT '{}'::jsonb,
  token_trace JSONB NOT NULL DEFAULT '{}'::jsonb,
  decision_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
      WHERE conname = 'ju_runtime_transition_logs_deal_id_fkey'
    ) THEN
      ALTER TABLE ju_runtime_transition_logs
        ADD CONSTRAINT ju_runtime_transition_logs_deal_id_fkey
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
      WHERE conname = 'ju_runtime_transition_logs_conversation_id_fkey'
    ) THEN
      ALTER TABLE ju_runtime_transition_logs
        ADD CONSTRAINT ju_runtime_transition_logs_conversation_id_fkey
        FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ju_runtime_states_tenant_state
  ON ju_runtime_states(tenant_id, runtime_state, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ju_runtime_states_tenant_next_action
  ON ju_runtime_states(tenant_id, next_action, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ju_runtime_states_conversation
  ON ju_runtime_states(conversation_id);

CREATE INDEX IF NOT EXISTS idx_ju_runtime_transition_logs_tenant_created
  ON ju_runtime_transition_logs(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ju_runtime_transition_logs_conversation
  ON ju_runtime_transition_logs(conversation_id, created_at DESC);

ALTER TABLE ju_runtime_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE ju_runtime_transition_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ju_runtime_states_select" ON ju_runtime_states;
CREATE POLICY "ju_runtime_states_select" ON ju_runtime_states
  FOR SELECT USING (is_global_admin() OR tenant_id = auth_tenant_id());

DROP POLICY IF EXISTS "ju_runtime_states_insert" ON ju_runtime_states;
CREATE POLICY "ju_runtime_states_insert" ON ju_runtime_states
  FOR INSERT WITH CHECK (is_global_admin() OR tenant_id = auth_tenant_id());

DROP POLICY IF EXISTS "ju_runtime_states_update" ON ju_runtime_states;
CREATE POLICY "ju_runtime_states_update" ON ju_runtime_states
  FOR UPDATE USING (is_global_admin() OR tenant_id = auth_tenant_id())
  WITH CHECK (is_global_admin() OR tenant_id = auth_tenant_id());

DROP POLICY IF EXISTS "ju_runtime_transition_logs_select" ON ju_runtime_transition_logs;
CREATE POLICY "ju_runtime_transition_logs_select" ON ju_runtime_transition_logs
  FOR SELECT USING (is_global_admin() OR tenant_id = auth_tenant_id());

DROP POLICY IF EXISTS "ju_runtime_transition_logs_insert" ON ju_runtime_transition_logs;
CREATE POLICY "ju_runtime_transition_logs_insert" ON ju_runtime_transition_logs
  FOR INSERT WITH CHECK (is_global_admin() OR tenant_id = auth_tenant_id());
