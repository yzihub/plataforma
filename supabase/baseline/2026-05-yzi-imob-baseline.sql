-- ============================================================
-- YZI IMOB - Official Baseline Snapshot
-- Date: 2026-05
--
-- Canonical naming:
--   - corretores
--   - imoveis
--
-- Legacy names kept only as historical drift:
--   - brokers
--   - properties
--
-- This file is a frozen structural baseline of the platform.
-- Future changes should be expressed as versioned migrations.
-- ============================================================

-- Extensions --------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums -------------------------------------------------------
DO $$
BEGIN
  CREATE TYPE tenant_plan_enum AS ENUM ('starter', 'growth', 'enterprise');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE tenant_status_enum AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE profile_role_enum AS ENUM ('owner', 'admin', 'member');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE project_type_enum AS ENUM ('crm', 'sdr', 'radar', 'social', 'ia_onboarding');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE project_status_enum AS ENUM ('pending', 'provisioning', 'active', 'error', 'paused');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE lead_status_enum AS ENUM ('new', 'contacted', 'qualified', 'meeting', 'proposal', 'negotiation', 'won', 'lost');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE property_operational_status_enum AS ENUM ('disponivel', 'em_negociacao', 'vendido');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE contract_status_enum AS ENUM ('draft', 'sent', 'signed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE contract_type_enum AS ENUM ('venda', 'locacao', 'servico', 'parceria');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE financeiro_tipo_enum AS ENUM ('entrada', 'saida');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE financeiro_status_enum AS ENUM ('previsto', 'confirmado', 'cancelado');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE appointment_type_enum AS ENUM ('visita', 'reuniao', 'retorno', 'consulta', 'outro');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE appointment_status_enum AS ENUM ('agendado', 'confirmado', 'realizado', 'cancelado', 'reagendado');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE integration_provider_enum AS ENUM ('google_calendar', 'n8n');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE integration_status_enum AS ENUM ('pendente', 'configurado', 'sincronizado', 'erro');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE job_queue_action_enum AS ENUM (
    'qualify',
    'send_proposal',
    'schedule',
    'close',
    'ai_takeover',
    'factory_activate',
    'gerar_contrato'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE job_queue_status_enum AS ENUM ('pending', 'processing', 'done', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE timeline_event_type_enum AS ENUM (
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
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE action_channel_enum AS ENUM ('web', 'whatsapp', 'n8n', 'system');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Functions ---------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_global_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'global_admin'
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Core auth / tenancy ----------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  plan           tenant_plan_enum NOT NULL DEFAULT 'starter',
  status         tenant_status_enum NOT NULL DEFAULT 'active',
  settings       JSONB NOT NULL DEFAULT '{}'::jsonb,
  system_prompt  TEXT,
  knowledge_rag_xml TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name   TEXT,
  avatar_url  TEXT,
  role        profile_role_enum NOT NULL DEFAULT 'member',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);

CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        project_type_enum NOT NULL,
  status      project_status_enum NOT NULL DEFAULT 'pending',
  config      JSONB NOT NULL DEFAULT '{}'::jsonb,
  agent_name  TEXT,
  agent_phone TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects(tenant_id);

-- Operational catalog ----------------------------------------
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#465fff',
  position    INTEGER NOT NULL DEFAULT 0,
  is_won      BOOLEAN NOT NULL DEFAULT FALSE,
  is_lost     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_tenant_id ON pipeline_stages(tenant_id);

CREATE TABLE IF NOT EXISTS corretores (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  phone             TEXT,
  email             TEXT,
  role              TEXT,
  tipo              TEXT,
  cpf               TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  address           TEXT,
  city              TEXT,
  state             TEXT,
  zip_code          TEXT,
  bank              TEXT,
  bank_agency       TEXT,
  bank_account      TEXT,
  bank_account_type TEXT,
  pix_key           TEXT,
  pix_key_type      TEXT,
  pix_beneficiary   TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corretores_tenant_id ON corretores(tenant_id);

CREATE TABLE IF NOT EXISTS imoveis (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  id_imovel            TEXT,
  external_id          TEXT,
  titulo_comercial     TEXT NOT NULL,
  titulo_seo           TEXT,
  tipo_de_imovel       TEXT,
  finalidade           TEXT,
  bairro               TEXT,
  quartos              INTEGER NOT NULL DEFAULT 0,
  suites               INTEGER NOT NULL DEFAULT 0,
  vagas                INTEGER NOT NULL DEFAULT 0,
  metragem             NUMERIC(10, 2),
  valor                NUMERIC(14, 2) NOT NULL DEFAULT 0,
  descricao_imovel     TEXT,
  descricao_juridica   TEXT,
  foto_principal       JSONB,
  imagem_card          TEXT,
  link_do_imovel       TEXT,
  link_sanitizado      TEXT,
  referencia_unica     TEXT,
  status_publicacao    TEXT NOT NULL DEFAULT 'Publicado',
  status_operacional   property_operational_status_enum NOT NULL DEFAULT 'disponivel',
  metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_imoveis_tenant_id ON imoveis(tenant_id);
CREATE INDEX IF NOT EXISTS idx_imoveis_status_operacional ON imoveis(tenant_id, status_operacional);
CREATE INDEX IF NOT EXISTS idx_imoveis_status_publicacao ON imoveis(tenant_id, status_publicacao);
CREATE UNIQUE INDEX IF NOT EXISTS idx_imoveis_referencia_unica
  ON imoveis(tenant_id, referencia_unica)
  WHERE referencia_unica IS NOT NULL;

CREATE TABLE IF NOT EXISTS leads (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stage_id         UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  email            TEXT,
  phone            TEXT,
  phone_normalized TEXT,
  company          TEXT,
  source           TEXT,
  status           lead_status_enum NOT NULL DEFAULT 'new',
  score            INTEGER NOT NULL DEFAULT 0,
  value            NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes            TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  assigned_to      UUID REFERENCES corretores(id) ON DELETE SET NULL,
  corretor_id      UUID REFERENCES corretores(id) ON DELETE SET NULL,
  last_action_at   TIMESTAMPTZ,
  ai_status        TEXT,
  ai_temperature   NUMERIC(4, 2),
  ai_last_summary  TEXT,
  ai_last_intent   TEXT,
  ai_qualified_at  TIMESTAMPTZ,
  ai_hot_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage_id ON leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(tenant_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_corretor_id ON leads(tenant_id, corretor_id);

-- Business domain --------------------------------------------
CREATE TABLE IF NOT EXISTS jurema_deals (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id              UUID REFERENCES leads(id) ON DELETE SET NULL,
  assigned_broker_id   UUID REFERENCES corretores(id) ON DELETE SET NULL,
  deal_stage           TEXT,
  qualification_status  TEXT,
  client_name          TEXT,
  client_phone         TEXT,
  intent               TEXT,
  property_type        TEXT,
  location_preference   TEXT,
  budget_max           NUMERIC(14, 2),
  bedrooms             INTEGER,
  lead_score           INTEGER NOT NULL DEFAULT 0,
  broker_status        TEXT,
  metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jurema_deals_tenant_id ON jurema_deals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jurema_deals_lead_id ON jurema_deals(tenant_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_jurema_deals_assigned_broker_id ON jurema_deals(tenant_id, assigned_broker_id);
CREATE INDEX IF NOT EXISTS idx_jurema_deals_stage ON jurema_deals(tenant_id, deal_stage);

CREATE TABLE IF NOT EXISTS contracts (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id              UUID REFERENCES leads(id) ON DELETE SET NULL,
  lead_name            TEXT NOT NULL,
  project_id           UUID REFERENCES imoveis(id) ON DELETE SET NULL,
  imovel_id            UUID REFERENCES imoveis(id) ON DELETE SET NULL,
  project_name         TEXT,
  broker_id            UUID REFERENCES corretores(id) ON DELETE SET NULL,
  corretor_name        TEXT,
  title                TEXT,
  type                 contract_type_enum NOT NULL DEFAULT 'venda',
  status               contract_status_enum NOT NULL DEFAULT 'draft',
  value                NUMERIC(14, 2) NOT NULL DEFAULT 0,
  commission_percentage NUMERIC(6, 2),
  commission_amount    NUMERIC(14, 2),
  notes                TEXT,
  conteudo             TEXT,
  metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
  file_url             TEXT,
  file_name            TEXT,
  signed_at            TIMESTAMPTZ,
  expires_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_lead_id ON contracts(lead_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_broker_id ON contracts(tenant_id, broker_id);
CREATE INDEX IF NOT EXISTS idx_contracts_imovel_id ON contracts(tenant_id, imovel_id);
CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON contracts(tenant_id, project_id);

CREATE TABLE IF NOT EXISTS comissoes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  broker_id   UUID NOT NULL REFERENCES corretores(id) ON DELETE RESTRICT,
  percentual  NUMERIC(5, 2) NOT NULL CHECK (percentual >= 0 AND percentual <= 100),
  valor       NUMERIC(14, 2) NOT NULL CHECK (valor >= 0),
  status      financeiro_status_enum NOT NULL DEFAULT 'previsto',
  paid_at     TIMESTAMPTZ,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comissoes_tenant_id ON comissoes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_contract_id ON comissoes(tenant_id, contract_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_broker_id ON comissoes(tenant_id, broker_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_status ON comissoes(tenant_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_comissoes_contract_broker_unique
  ON comissoes(tenant_id, contract_id, broker_id);

CREATE TABLE IF NOT EXISTS financeiro (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  comissao_id UUID REFERENCES comissoes(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  tipo        financeiro_tipo_enum NOT NULL,
  categoria   TEXT NOT NULL,
  descricao   TEXT NOT NULL,
  valor       NUMERIC(14, 2) NOT NULL CHECK (valor >= 0),
  data_evento DATE NOT NULL,
  status      financeiro_status_enum NOT NULL DEFAULT 'confirmado',
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financeiro_tenant_id ON financeiro(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_data_evento ON financeiro(tenant_id, data_evento DESC);
CREATE INDEX IF NOT EXISTS idx_financeiro_tipo ON financeiro(tenant_id, tipo, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_financeiro_contract_categoria_tipo_data_unique
  ON financeiro(tenant_id, contract_id, categoria, tipo, data_evento);

CREATE TABLE IF NOT EXISTS appointments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  appointment_type      appointment_type_enum NOT NULL,
  status                appointment_status_enum NOT NULL DEFAULT 'agendado',
  lead_id               UUID REFERENCES leads(id) ON DELETE SET NULL,
  broker_id             UUID REFERENCES corretores(id) ON DELETE SET NULL,
  start_at              TIMESTAMPTZ NOT NULL,
  end_at                TIMESTAMPTZ,
  location              TEXT,
  description           TEXT,
  integration_provider  integration_provider_enum,
  integration_status    integration_status_enum NOT NULL DEFAULT 'pendente',
  external_event_id     TEXT,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_start_at ON appointments(tenant_id, start_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_lead_id ON appointments(tenant_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_broker_id ON appointments(tenant_id, broker_id);

CREATE TABLE IF NOT EXISTS visitas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id       UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  imovel_id     UUID NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
  broker_id     UUID REFERENCES corretores(id) ON DELETE SET NULL,
  scheduled_at  TIMESTAMPTZ NOT NULL,
  completed_at  TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitas_tenant_id ON visitas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visitas_lead_id ON visitas(tenant_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_visitas_imovel_id ON visitas(tenant_id, imovel_id);
CREATE INDEX IF NOT EXISTS idx_visitas_broker_id ON visitas(tenant_id, broker_id);
CREATE INDEX IF NOT EXISTS idx_visitas_scheduled_at ON visitas(tenant_id, scheduled_at DESC);

CREATE TABLE IF NOT EXISTS job_queue (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id       UUID REFERENCES leads(id) ON DELETE SET NULL,
  action        job_queue_action_enum NOT NULL,
  status        job_queue_status_enum NOT NULL DEFAULT 'pending',
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  result        JSONB,
  error         TEXT,
  attempts      INTEGER NOT NULL DEFAULT 0,
  max_attempts  INTEGER NOT NULL DEFAULT 3,
  scheduled_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at    TIMESTAMPTZ,
  finished_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_queue_tenant_id ON job_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_job_queue_lead_id ON job_queue(lead_id);

CREATE TABLE IF NOT EXISTS action_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id       UUID REFERENCES leads(id) ON DELETE SET NULL,
  job_id        UUID REFERENCES job_queue(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  triggered_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  channel       action_channel_enum NOT NULL DEFAULT 'web',
  summary       TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_logs_tenant_id ON action_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_lead_id ON action_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON action_logs(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS timeline_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id      UUID REFERENCES leads(id) ON DELETE SET NULL,
  deal_id      UUID REFERENCES jurema_deals(id) ON DELETE SET NULL,
  contract_id  UUID REFERENCES contracts(id) ON DELETE SET NULL,
  imovel_id    UUID REFERENCES imoveis(id) ON DELETE SET NULL,
  corretor_id  UUID REFERENCES corretores(id) ON DELETE SET NULL,
  event_type   timeline_event_type_enum NOT NULL,
  event_label  TEXT NOT NULL,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- Updated_at triggers ----------------------------------------
CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_corretores_updated_at
  BEFORE UPDATE ON corretores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_imoveis_updated_at
  BEFORE UPDATE ON imoveis
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_pipeline_stages_updated_at
  BEFORE UPDATE ON pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_jurema_deals_updated_at
  BEFORE UPDATE ON jurema_deals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_comissoes_updated_at
  BEFORE UPDATE ON comissoes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_financeiro_updated_at
  BEFORE UPDATE ON financeiro
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_visitas_updated_at
  BEFORE UPDATE ON visitas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS ---------------------------------------------------------
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE corretores ENABLE ROW LEVEL SECURITY;
ALTER TABLE imoveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurema_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_select" ON tenants FOR SELECT
  USING (is_global_admin() OR id = auth_tenant_id());
CREATE POLICY "tenants_update" ON tenants FOR UPDATE
  USING (is_global_admin() OR id = auth_tenant_id());
CREATE POLICY "tenants_insert" ON tenants FOR INSERT
  WITH CHECK (is_global_admin());

CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (is_global_admin() OR tenant_id = auth_tenant_id());
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (is_global_admin() OR tenant_id = auth_tenant_id());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (is_global_admin() OR (tenant_id = auth_tenant_id() AND id = auth.uid()));

CREATE POLICY "projects_select" ON projects FOR SELECT
  USING (is_global_admin() OR tenant_id = auth_tenant_id());
CREATE POLICY "projects_all" ON projects FOR ALL
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "corretores_select" ON corretores FOR SELECT
  USING (is_global_admin() OR tenant_id = auth_tenant_id());
CREATE POLICY "corretores_all" ON corretores FOR ALL
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "imoveis_select" ON imoveis FOR SELECT
  USING (is_global_admin() OR tenant_id = auth_tenant_id());
CREATE POLICY "imoveis_all" ON imoveis FOR ALL
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "pipeline_stages_select" ON pipeline_stages FOR SELECT
  USING (is_global_admin() OR tenant_id = auth_tenant_id());
CREATE POLICY "pipeline_stages_all" ON pipeline_stages FOR ALL
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "leads_select" ON leads FOR SELECT
  USING (is_global_admin() OR tenant_id = auth_tenant_id());
CREATE POLICY "leads_all" ON leads FOR ALL
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "jurema_deals_select" ON jurema_deals FOR SELECT
  USING (is_global_admin() OR tenant_id = auth_tenant_id());
CREATE POLICY "jurema_deals_all" ON jurema_deals FOR ALL
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "contracts_select" ON contracts FOR SELECT
  USING (is_global_admin() OR tenant_id = auth_tenant_id());
CREATE POLICY "contracts_all" ON contracts FOR ALL
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "comissoes_select" ON comissoes FOR SELECT
  USING (is_global_admin() OR tenant_id = auth_tenant_id());
CREATE POLICY "comissoes_all" ON comissoes FOR ALL
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "financeiro_select" ON financeiro FOR SELECT
  USING (is_global_admin() OR tenant_id = auth_tenant_id());
CREATE POLICY "financeiro_all" ON financeiro FOR ALL
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "appointments_select" ON appointments FOR SELECT
  USING (is_global_admin() OR tenant_id = auth_tenant_id());
CREATE POLICY "appointments_all" ON appointments FOR ALL
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "visitas_select" ON visitas FOR SELECT
  USING (is_global_admin() OR tenant_id = auth_tenant_id());
CREATE POLICY "visitas_all" ON visitas FOR ALL
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "job_queue_select" ON job_queue FOR SELECT
  USING (is_global_admin() OR tenant_id = auth_tenant_id());
CREATE POLICY "job_queue_insert" ON job_queue FOR INSERT
  WITH CHECK (is_global_admin() OR tenant_id = auth_tenant_id());
CREATE POLICY "job_queue_update" ON job_queue FOR UPDATE
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "action_logs_select" ON action_logs FOR SELECT
  USING (is_global_admin() OR tenant_id = auth_tenant_id());
CREATE POLICY "action_logs_insert" ON action_logs FOR INSERT
  WITH CHECK (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "timeline_events_select" ON timeline_events FOR SELECT
  USING (is_global_admin() OR tenant_id = auth_tenant_id());
CREATE POLICY "timeline_events_insert" ON timeline_events FOR INSERT
  WITH CHECK (is_global_admin() OR tenant_id = auth_tenant_id());

-- Legacy naming notes ----------------------------------------
-- brokers   -> corretores
-- properties -> imoveis
-- project_id remains as a compatibility column on contracts
-- status_publicacao is intentionally left as text because historical values
-- are mixed in the live system; operational lifecycle is status_operacional.
