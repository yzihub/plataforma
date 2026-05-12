-- Expansao oficial da timeline operacional do YZI IMOB.
-- Mantem compatibilidade com eventos legados e passa a normalizar
-- categoria, titulo e descricao diretamente no banco.

ALTER TABLE timeline_events
  ADD COLUMN IF NOT EXISTS event_category TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'timeline_events_event_type_check'
  ) THEN
    ALTER TABLE timeline_events DROP CONSTRAINT timeline_events_event_type_check;
  END IF;
END $$;

ALTER TABLE timeline_events
  ADD CONSTRAINT timeline_events_event_type_check CHECK (
    event_type IN (
      'lead_created',
      'lead_assigned',
      'lead_qualified',
      'lead_lost',
      'property_presented',
      'property_reserved',
      'property_sold',
      'contract_draft',
      'contract_generated',
      'contract_sent',
      'contract_signed',
      'financial_created',
      'commission_created',
      'payment_confirmed'
    )
  );

ALTER TABLE timeline_events
  ADD CONSTRAINT timeline_events_event_category_check CHECK (
    event_category IN ('lead', 'property', 'contract', 'financial')
  );

CREATE OR REPLACE FUNCTION timeline_event_category_for_type(p_event_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE p_event_type
    WHEN 'lead_created', 'lead_assigned', 'lead_qualified', 'lead_lost' THEN
      RETURN 'lead';
    WHEN 'property_presented', 'property_reserved', 'property_sold' THEN
      RETURN 'property';
    WHEN 'contract_draft', 'contract_generated', 'contract_sent', 'contract_signed' THEN
      RETURN 'contract';
    WHEN 'financial_created', 'commission_created', 'payment_confirmed' THEN
      RETURN 'financial';
    ELSE
      RETURN 'contract';
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION timeline_event_title_for_type(p_event_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE p_event_type
    WHEN 'lead_created' THEN RETURN 'Lead criado';
    WHEN 'lead_assigned' THEN RETURN 'Lead atribuido';
    WHEN 'lead_qualified' THEN RETURN 'Lead qualificado';
    WHEN 'lead_lost' THEN RETURN 'Lead perdido';
    WHEN 'property_presented' THEN RETURN 'Imovel apresentado';
    WHEN 'property_reserved' THEN RETURN 'Imovel reservado';
    WHEN 'property_sold' THEN RETURN 'Imovel vendido';
    WHEN 'contract_draft' THEN RETURN 'Contrato em rascunho';
    WHEN 'contract_generated' THEN RETURN 'Contrato gerado';
    WHEN 'contract_sent' THEN RETURN 'Contrato enviado';
    WHEN 'contract_signed' THEN RETURN 'Contrato assinado';
    WHEN 'financial_created' THEN RETURN 'Lancamento financeiro criado';
    WHEN 'commission_created' THEN RETURN 'Comissao criada';
    WHEN 'payment_confirmed' THEN RETURN 'Pagamento confirmado';
    ELSE RETURN INITCAP(REPLACE(p_event_type, '_', ' '));
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION timeline_event_description_for_type(p_event_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE p_event_type
    WHEN 'lead_created' THEN RETURN 'Novo lead registrado na operacao.';
    WHEN 'lead_assigned' THEN RETURN 'Lead direcionado para corretor responsavel.';
    WHEN 'lead_qualified' THEN RETURN 'Lead avançado para qualificacao.';
    WHEN 'lead_lost' THEN RETURN 'Lead marcado como perdido na operacao.';
    WHEN 'property_presented' THEN RETURN 'Imovel apresentado em visita ou demonstracao.';
    WHEN 'property_reserved' THEN RETURN 'Imovel movido para reserva operacional.';
    WHEN 'property_sold' THEN RETURN 'Imovel concluido como vendido.';
    WHEN 'contract_draft' THEN RETURN 'Contrato salvo como rascunho.';
    WHEN 'contract_generated' THEN RETURN 'Contrato gerado a partir do fluxo operacional.';
    WHEN 'contract_sent' THEN RETURN 'Contrato enviado para formalizacao.';
    WHEN 'contract_signed' THEN RETURN 'Contrato assinado e consolidado.';
    WHEN 'financial_created' THEN RETURN 'Lancamento financeiro criado automaticamente.';
    WHEN 'commission_created' THEN RETURN 'Comissao criada automaticamente.';
    WHEN 'payment_confirmed' THEN RETURN 'Pagamento confirmado operacionalmente.';
    ELSE RETURN 'Evento operacional registrado.';
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION timeline_events_apply_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.event_category := COALESCE(
    NULLIF(BTRIM(NEW.event_category), ''),
    timeline_event_category_for_type(NEW.event_type)
  );
  NEW.title := COALESCE(
    NULLIF(BTRIM(NEW.title), ''),
    timeline_event_title_for_type(NEW.event_type)
  );
  NEW.description := COALESCE(
    NULLIF(BTRIM(NEW.description), ''),
    timeline_event_description_for_type(NEW.event_type)
  );
  NEW.event_label := COALESCE(
    NULLIF(BTRIM(NEW.event_label), ''),
    NEW.title
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_timeline_events_defaults ON timeline_events;
CREATE TRIGGER trg_timeline_events_defaults
BEFORE INSERT OR UPDATE ON timeline_events
FOR EACH ROW
EXECUTE FUNCTION timeline_events_apply_defaults();

UPDATE timeline_events
SET
  event_category = timeline_event_category_for_type(event_type),
  title = timeline_event_title_for_type(event_type),
  description = timeline_event_description_for_type(event_type),
  event_label = COALESCE(NULLIF(BTRIM(event_label), ''), timeline_event_title_for_type(event_type))
WHERE event_category IS NULL
   OR title IS NULL
   OR description IS NULL
   OR event_label IS NULL
   OR BTRIM(event_label) = '';

ALTER TABLE timeline_events
  ALTER COLUMN event_category SET NOT NULL,
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN description SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_timeline_events_tenant_category
  ON timeline_events(tenant_id, event_category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_timeline_events_tenant_category_type
  ON timeline_events(tenant_id, event_category, event_type, created_at DESC);
