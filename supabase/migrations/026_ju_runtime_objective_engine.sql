-- Objective governance para o runtime state-driven da Ju.
-- Mantem exatamente um objetivo operacional ativo por conversation.

ALTER TABLE ju_runtime_states
  ADD COLUMN IF NOT EXISTS objective_priority INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_output TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS valid_objective_transition BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS objective_payload JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE ju_runtime_transition_logs
  ADD COLUMN IF NOT EXISTS previous_objective_state TEXT,
  ADD COLUMN IF NOT EXISTS objective_state TEXT,
  ADD COLUMN IF NOT EXISTS objective_priority INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_output TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS valid_objective_transition BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS objective_trace JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ju_runtime_states_objective_state_check'
  ) THEN
    ALTER TABLE ju_runtime_states DROP CONSTRAINT ju_runtime_states_objective_state_check;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ju_runtime_transition_logs_objective_state_check'
  ) THEN
    ALTER TABLE ju_runtime_transition_logs DROP CONSTRAINT ju_runtime_transition_logs_objective_state_check;
  END IF;
END $$;

ALTER TABLE ju_runtime_states
  ADD CONSTRAINT ju_runtime_states_objective_state_check CHECK (
    objective_state IN (
      'qualificar_intencao',
      'qualificar_budget',
      'qualificar_bairro',
      'apresentar_imoveis',
      'agendar_visita',
      'confirmar_visita',
      'followup_visita',
      'recuperar_lead',
      'cobrar_documentacao',
      'negociar',
      'encaminhar_corretor',
      'responder_duvida',
      'aguardar_resposta',
      'tratar_falha_midia'
    )
  );

ALTER TABLE ju_runtime_transition_logs
  ADD CONSTRAINT ju_runtime_transition_logs_objective_state_check CHECK (
    objective_state IS NULL OR objective_state IN (
      'qualificar_intencao',
      'qualificar_budget',
      'qualificar_bairro',
      'apresentar_imoveis',
      'agendar_visita',
      'confirmar_visita',
      'followup_visita',
      'recuperar_lead',
      'cobrar_documentacao',
      'negociar',
      'encaminhar_corretor',
      'responder_duvida',
      'aguardar_resposta',
      'tratar_falha_midia'
    )
  );

CREATE INDEX IF NOT EXISTS idx_ju_runtime_states_tenant_objective
  ON ju_runtime_states(tenant_id, objective_state, objective_priority DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ju_runtime_transition_logs_objective
  ON ju_runtime_transition_logs(tenant_id, objective_state, created_at DESC);
