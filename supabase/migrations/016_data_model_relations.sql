-- ============================================================
-- YZIHUB — Migration 016: Data Model Relations
-- Wiring completo das 7 entidades do dominio YZI OS:
-- lead, imovel (properties), corretor (brokers), visita,
-- contrato, comissao, financeiro
-- ============================================================
-- Idempotente: pode ser executada multiplas vezes sem erros
-- Requer: migrations 001-015 aplicadas
-- ============================================================

-- ─── PARTE 1: Estender `leads` com FKs centrais ───────────────

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS broker_id UUID REFERENCES brokers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS imovel_id UUID REFERENCES properties(id) ON DELETE SET NULL;

-- NOTA: assigned_to (REFERENCES profiles) e mantido como legado
-- PipelineDashboardClient.tsx ainda usa esse campo.
-- broker_id e o campo canonico daqui pra frente.
-- Migrar gradually — ver DATA_MODEL.md secao Decisoes.

CREATE INDEX IF NOT EXISTS idx_leads_broker_id ON leads(tenant_id, broker_id);
CREATE INDEX IF NOT EXISTS idx_leads_imovel_id ON leads(tenant_id, imovel_id);

-- ─── PARTE 2: Corrigir `contracts.corretor_id` → brokers ──────

-- 2a. Dropar a FK existente (aponta para profiles(id))
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'contracts'::regclass
      AND contype = 'f'
      AND conname LIKE '%corretor%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE contracts DROP CONSTRAINT ' || quote_ident(conname)
      FROM pg_constraint
      WHERE conrelid = 'contracts'::regclass
        AND contype = 'f'
        AND conname LIKE '%corretor%'
      LIMIT 1
    );
  END IF;
END $$;

-- 2b. Dados orfaos: UUID que nao existem em brokers -> NULL
--     (ex: corretor_id apontando para profiles que nao sao brokers)
UPDATE contracts
SET corretor_id = NULL
WHERE corretor_id IS NOT NULL
  AND corretor_id NOT IN (SELECT id FROM brokers);

-- 2c. Recriar FK apontando para brokers
ALTER TABLE contracts
  ADD CONSTRAINT contracts_corretor_id_fkey
  FOREIGN KEY (corretor_id) REFERENCES brokers(id) ON DELETE SET NULL;

-- ─── PARTE 3: Tabela `visitas` ────────────────────────────────

CREATE TABLE IF NOT EXISTS visitas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id       UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  imovel_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  broker_id     UUID REFERENCES brokers(id) ON DELETE SET NULL,
  scheduled_at  TIMESTAMPTZ NOT NULL,
  completed_at  TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitas_tenant_id    ON visitas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visitas_lead_id      ON visitas(tenant_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_visitas_imovel_id    ON visitas(tenant_id, imovel_id);
CREATE INDEX IF NOT EXISTS idx_visitas_broker_id    ON visitas(tenant_id, broker_id);
CREATE INDEX IF NOT EXISTS idx_visitas_scheduled_at ON visitas(tenant_id, scheduled_at DESC);

-- ─── PARTE 4: Tabela `comissoes` ─────────────────────────────

CREATE TABLE IF NOT EXISTS comissoes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contract_id   UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  broker_id     UUID NOT NULL REFERENCES brokers(id) ON DELETE RESTRICT,
  percentual    NUMERIC(5,2) NOT NULL CHECK (percentual >= 0 AND percentual <= 100),
  valor         NUMERIC(14,2) NOT NULL CHECK (valor >= 0),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  paid_at       TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTA: broker_id usa ON DELETE RESTRICT (nao CASCADE) para preservar
-- historico de comissoes mesmo se corretor for removido do sistema.
-- Forcar arquivamento do corretor antes de excluir.

CREATE INDEX IF NOT EXISTS idx_comissoes_tenant_id   ON comissoes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_contract_id ON comissoes(tenant_id, contract_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_broker_id   ON comissoes(tenant_id, broker_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_status      ON comissoes(tenant_id, status);

-- ─── PARTE 5: Tabela `financeiro` ────────────────────────────

CREATE TABLE IF NOT EXISTS financeiro (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  comissao_id   UUID REFERENCES comissoes(id) ON DELETE SET NULL,
  contract_id   UUID REFERENCES contracts(id) ON DELETE SET NULL,
  tipo          TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  categoria     TEXT NOT NULL,  -- ex: 'comissao','aluguel','marketing','salario','outros'
  descricao     TEXT NOT NULL,
  valor         NUMERIC(14,2) NOT NULL CHECK (valor >= 0),
  data_evento   DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'confirmado'
                  CHECK (status IN ('previsto', 'confirmado', 'cancelado')),
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financeiro_tenant_id   ON financeiro(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_data_evento ON financeiro(tenant_id, data_evento DESC);
CREATE INDEX IF NOT EXISTS idx_financeiro_tipo        ON financeiro(tenant_id, tipo, status);

-- ─── PARTE 6: Triggers updated_at ────────────────────────────

CREATE OR REPLACE TRIGGER trg_visitas_updated_at
  BEFORE UPDATE ON visitas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_comissoes_updated_at
  BEFORE UPDATE ON comissoes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_financeiro_updated_at
  BEFORE UPDATE ON financeiro
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── PARTE 7: Row Level Security ─────────────────────────────

-- visitas
ALTER TABLE visitas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visitas_select" ON visitas
  FOR SELECT USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "visitas_all" ON visitas
  FOR ALL USING (is_global_admin() OR tenant_id = auth_tenant_id());

-- comissoes
ALTER TABLE comissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comissoes_select" ON comissoes
  FOR SELECT USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "comissoes_all" ON comissoes
  FOR ALL USING (is_global_admin() OR tenant_id = auth_tenant_id());

-- financeiro
ALTER TABLE financeiro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financeiro_select" ON financeiro
  FOR SELECT USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "financeiro_all" ON financeiro
  FOR ALL USING (is_global_admin() OR tenant_id = auth_tenant_id());

-- END migration 016
