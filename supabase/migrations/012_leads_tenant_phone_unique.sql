-- 012: Add unique constraint for lead upsert by phone
-- Enables on_conflict=tenant_id,phone in n8n workflows

-- Dedup: keep most recent lead per (tenant_id, phone) before adding constraint
DELETE FROM leads a
USING leads b
WHERE a.tenant_id = b.tenant_id
  AND a.phone = b.phone
  AND a.id < b.id;

ALTER TABLE leads
  ADD CONSTRAINT leads_tenant_phone_unique UNIQUE (tenant_id, phone);
