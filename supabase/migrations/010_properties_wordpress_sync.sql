-- YZIHUB — Migration 010: Properties WordPress Sync
-- Adds external_id, source, description, images, features, score, priority, kanban_stage
-- Creates upsert function for ingesting properties from WordPress or other external sources

-- ============================================================
-- Extend properties table for external source integration
-- ============================================================

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS external_id  TEXT,
  ADD COLUMN IF NOT EXISTS source       TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS description  TEXT,
  ADD COLUMN IF NOT EXISTS images       JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS features     JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS score        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS priority     TEXT NOT NULL DEFAULT 'normal'
                                          CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  ADD COLUMN IF NOT EXISTS kanban_stage TEXT;

-- ============================================================
-- Unique constraint: prevent duplicate properties per external source
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_external_source
  ON properties(external_id, source)
  WHERE external_id IS NOT NULL;

-- ============================================================
-- Upsert function: idempotent ingestion from external sources
-- ============================================================

CREATE OR REPLACE FUNCTION upsert_property_from_external(
  p_tenant_id       UUID,
  p_external_id     TEXT,
  p_source          TEXT,
  p_title           TEXT,
  p_price           NUMERIC,
  p_neighborhood    TEXT,
  p_status          TEXT    DEFAULT 'available',
  p_description     TEXT    DEFAULT NULL,
  p_images          JSONB   DEFAULT '[]'::jsonb,
  p_features        JSONB   DEFAULT '{}'::jsonb,
  p_location        TEXT    DEFAULT NULL,
  p_photo_url       TEXT    DEFAULT NULL,
  p_property_type   TEXT    DEFAULT NULL,
  p_area_sqm        NUMERIC DEFAULT NULL,
  p_link            TEXT    DEFAULT NULL
)
RETURNS SETOF properties
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO properties (
    tenant_id,
    external_id,
    source,
    title,
    price,
    neighborhood,
    kanban_stage,
    status,
    description,
    images,
    features,
    location,
    photo_url,
    property_type,
    area_sqm,
    link,
    updated_at
  )
  VALUES (
    p_tenant_id,
    p_external_id,
    p_source,
    p_title,
    p_price,
    p_neighborhood,
    p_neighborhood,   -- kanban_stage defaults to neighborhood on insert
    p_status,
    p_description,
    COALESCE(p_images, '[]'::jsonb),
    COALESCE(p_features, '{}'::jsonb),
    COALESCE(p_location, p_neighborhood),
    p_photo_url,
    p_property_type,
    p_area_sqm,
    p_link,
    NOW()
  )
  ON CONFLICT (external_id, source)
    WHERE external_id IS NOT NULL
  DO UPDATE SET
    title          = EXCLUDED.title,
    price          = EXCLUDED.price,
    neighborhood   = EXCLUDED.neighborhood,
    status         = EXCLUDED.status,
    description    = EXCLUDED.description,
    images         = EXCLUDED.images,
    features       = EXCLUDED.features,
    location       = EXCLUDED.location,
    photo_url      = EXCLUDED.photo_url,
    property_type  = EXCLUDED.property_type,
    area_sqm       = EXCLUDED.area_sqm,
    link           = EXCLUDED.link,
    updated_at     = NOW()
  RETURNING *;
END;
$$;

-- Grant execute to authenticated users (RLS on properties table already enforces tenant isolation)
GRANT EXECUTE ON FUNCTION upsert_property_from_external TO authenticated;
