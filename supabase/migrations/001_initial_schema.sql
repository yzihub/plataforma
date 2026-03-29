-- ============================================================
-- YZIHUB Plataforma — Schema inicial
-- Multi-tenant com RLS em todas as tabelas
-- ============================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TENANTS
-- ============================================================
CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  plan          TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'enterprise')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  settings      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROFILES (usuários vinculados a tenants)
-- ============================================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name     TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_tenant_id ON profiles(tenant_id);

-- ============================================================
-- PROJECTS (projetos/módulos ativados por tenant)
-- ============================================================
CREATE TABLE projects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('crm', 'sdr', 'radar', 'social', 'ia_onboarding')),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'provisioning', 'active', 'error', 'paused')),
  config        JSONB NOT NULL DEFAULT '{}',
  agent_name    TEXT,
  agent_phone   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_tenant_id ON projects(tenant_id);

-- ============================================================
-- PIPELINE STAGES (etapas do funil por tenant)
-- ============================================================
CREATE TABLE pipeline_stages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT '#465fff',
  position      INTEGER NOT NULL DEFAULT 0,
  is_won        BOOLEAN NOT NULL DEFAULT FALSE,
  is_lost       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pipeline_stages_tenant_id ON pipeline_stages(tenant_id);

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stage_id        UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  company         TEXT,
  source          TEXT,
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  score           INTEGER DEFAULT 0,
  value           NUMERIC(12, 2) DEFAULT 0,
  notes           TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  assigned_to     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  last_action_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX idx_leads_stage_id ON leads(stage_id);
CREATE INDEX idx_leads_status ON leads(tenant_id, status);

-- ============================================================
-- JOB QUEUE (fila de ações assíncronas → n8n)
-- ============================================================
CREATE TABLE job_queue (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id       UUID REFERENCES leads(id) ON DELETE SET NULL,
  action        TEXT NOT NULL CHECK (action IN ('qualify', 'send_proposal', 'schedule', 'close', 'ai_takeover', 'factory_activate')),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  payload       JSONB NOT NULL DEFAULT '{}',
  result        JSONB,
  error         TEXT,
  attempts      INTEGER NOT NULL DEFAULT 0,
  max_attempts  INTEGER NOT NULL DEFAULT 3,
  scheduled_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at    TIMESTAMPTZ,
  finished_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_queue_tenant_id ON job_queue(tenant_id);
CREATE INDEX idx_job_queue_status ON job_queue(status, scheduled_at);
CREATE INDEX idx_job_queue_lead_id ON job_queue(lead_id);

-- ============================================================
-- ACTION LOGS (auditoria de todas as ações)
-- ============================================================
CREATE TABLE action_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id       UUID REFERENCES leads(id) ON DELETE SET NULL,
  job_id        UUID REFERENCES job_queue(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  triggered_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  channel       TEXT DEFAULT 'web' CHECK (channel IN ('web', 'whatsapp', 'n8n', 'system')),
  summary       TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_action_logs_tenant_id ON action_logs(tenant_id);
CREATE INDEX idx_action_logs_lead_id ON action_logs(lead_id);
CREATE INDEX idx_action_logs_created_at ON action_logs(tenant_id, created_at DESC);

-- ============================================================
-- FUNÇÃO: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at        BEFORE UPDATE ON tenants        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profiles_updated_at       BEFORE UPDATE ON profiles       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_projects_updated_at       BEFORE UPDATE ON projects       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pipeline_stages_updated_at BEFORE UPDATE ON pipeline_stages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_leads_updated_at          BEFORE UPDATE ON leads          FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE tenants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads           ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_queue       ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_logs     ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: retorna o tenant_id do usuário autenticado
CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Função auxiliar: verifica se o usuário é admin global (Eric)
CREATE OR REPLACE FUNCTION is_global_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'global_admin'
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ---- tenants ----
-- Admin global vê todos; owner/admin vê apenas o próprio tenant
CREATE POLICY "tenants_select" ON tenants FOR SELECT
  USING (is_global_admin() OR id = auth_tenant_id());

CREATE POLICY "tenants_update" ON tenants FOR UPDATE
  USING (is_global_admin() OR id = auth_tenant_id());

CREATE POLICY "tenants_insert" ON tenants FOR INSERT
  WITH CHECK (is_global_admin());

-- ---- profiles ----
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (is_global_admin() OR (tenant_id = auth_tenant_id() AND id = auth.uid()));

-- ---- projects ----
CREATE POLICY "projects_select" ON projects FOR SELECT
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "projects_all" ON projects FOR ALL
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

-- ---- pipeline_stages ----
CREATE POLICY "pipeline_stages_select" ON pipeline_stages FOR SELECT
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "pipeline_stages_all" ON pipeline_stages FOR ALL
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

-- ---- leads ----
CREATE POLICY "leads_select" ON leads FOR SELECT
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "leads_all" ON leads FOR ALL
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

-- ---- job_queue ----
CREATE POLICY "job_queue_select" ON job_queue FOR SELECT
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "job_queue_insert" ON job_queue FOR INSERT
  WITH CHECK (is_global_admin() OR tenant_id = auth_tenant_id());

-- Service role (n8n) pode atualizar jobs
CREATE POLICY "job_queue_update_service" ON job_queue FOR UPDATE
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

-- ---- action_logs ----
CREATE POLICY "action_logs_select" ON action_logs FOR SELECT
  USING (is_global_admin() OR tenant_id = auth_tenant_id());

CREATE POLICY "action_logs_insert" ON action_logs FOR INSERT
  WITH CHECK (is_global_admin() OR tenant_id = auth_tenant_id());

-- ============================================================
-- DADOS INICIAIS: tenant Eric (admin global)
-- ============================================================
INSERT INTO tenants (id, name, slug, plan, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'YZIHUB', 'yzihub', 'enterprise', 'active');

-- Pipeline padrão para novos tenants (referência)
INSERT INTO pipeline_stages (tenant_id, name, color, position) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Novo Lead',    '#465fff', 0),
  ('00000000-0000-0000-0000-000000000001', 'Contato',      '#f59e0b', 1),
  ('00000000-0000-0000-0000-000000000001', 'Qualificado',  '#10b981', 2),
  ('00000000-0000-0000-0000-000000000001', 'Proposta',     '#8b5cf6', 3),
  ('00000000-0000-0000-0000-000000000001', 'Negociação',   '#f97316', 4),
  ('00000000-0000-0000-0000-000000000001', 'Fechado',      '#22c55e', 5),
  ('00000000-0000-0000-0000-000000000001', 'Perdido',      '#ef4444', 6);
