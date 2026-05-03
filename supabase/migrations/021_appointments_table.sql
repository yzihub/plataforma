-- Migration 021: Tabela appointments genérica para o YZI OS
-- Módulo: Calendário Operacional
-- Propósito: Persistência de compromissos por tenant antes da integração Google Calendar/n8n
-- Ref: .planning/quick/260503-l3h-calend-rio-operacional-v1

COMMENT ON SCHEMA public IS 'YZI OS — Plataforma multi-tenant para automação comercial';

-- ─── Tabela principal ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS appointments (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id            UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title                TEXT        NOT NULL,
  appointment_type     TEXT        NOT NULL CHECK (appointment_type IN ('visita','reuniao','retorno','consulta','outro')),
  status               TEXT        NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado','confirmado','realizado','cancelado','reagendado')),

  -- Relacionamentos opcionais
  lead_id              UUID        REFERENCES leads(id) ON DELETE SET NULL,
  broker_id            UUID        REFERENCES brokers(id) ON DELETE SET NULL,

  -- Datas
  start_at             TIMESTAMPTZ NOT NULL,
  end_at               TIMESTAMPTZ,

  -- Detalhes
  location             TEXT,
  description          TEXT,

  -- Integração futura com Google Calendar / n8n
  integration_provider TEXT        CHECK (integration_provider IN ('google_calendar','n8n')),
  integration_status   TEXT        NOT NULL DEFAULT 'pendente' CHECK (integration_status IN ('pendente','configurado','sincronizado','erro')),
  external_event_id    TEXT,

  -- Metadados livres
  metadata             JSONB       NOT NULL DEFAULT '{}'::jsonb,

  -- Auditoria
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE appointments IS 'Módulo genérico de calendário operacional do YZI OS. Suporta visitas, reuniões, retornos e consultas por tenant. Preparado para sincronização futura com Google Calendar via n8n.';
COMMENT ON COLUMN appointments.tenant_id            IS 'Tenant dono do compromisso — RLS garante isolamento.';
COMMENT ON COLUMN appointments.appointment_type     IS 'Tipo: visita | reuniao | retorno | consulta | outro';
COMMENT ON COLUMN appointments.status               IS 'Status: agendado | confirmado | realizado | cancelado | reagendado';
COMMENT ON COLUMN appointments.lead_id              IS 'Lead relacionado — opcional.';
COMMENT ON COLUMN appointments.broker_id            IS 'Responsável (corretor) pelo compromisso — opcional.';
COMMENT ON COLUMN appointments.location             IS 'Endereço físico ou URL de Meet/Zoom.';
COMMENT ON COLUMN appointments.integration_provider IS 'Provedor de integração: google_calendar | n8n | null';
COMMENT ON COLUMN appointments.integration_status   IS 'Estado da sincronização: pendente | configurado | sincronizado | erro';
COMMENT ON COLUMN appointments.external_event_id    IS 'ID do evento no Google Calendar quando sincronizado.';

-- ─── Índices ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id
  ON appointments(tenant_id);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_start_at
  ON appointments(tenant_id, start_at DESC);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_lead_id
  ON appointments(tenant_id, lead_id);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_broker_id
  ON appointments(tenant_id, broker_id);

-- ─── Trigger updated_at ───────────────────────────────────────────────────────

-- Reutiliza função set_updated_at se já existir; caso contrário cria inline
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'set_updated_at'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.set_updated_at()
      RETURNS TRIGGER LANGUAGE plpgsql AS $body$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $body$;
    $func$;
  END IF;
END;
$$;

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_appointments_select"
  ON appointments FOR SELECT
  USING (
    tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "tenant_appointments_insert"
  ON appointments FOR INSERT
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "tenant_appointments_update"
  ON appointments FOR UPDATE
  USING (
    tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "tenant_appointments_delete"
  ON appointments FOR DELETE
  USING (
    tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );
