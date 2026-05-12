-- Add AI configuration columns to tenants table
-- Used by Control dashboard (src/lib/control/queries.ts)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS system_prompt TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS knowledge_rag_xml TEXT;
