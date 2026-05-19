-- Gateway logs must capture external/runtime attempts even when referenced
-- operational records are missing or not created yet.

ALTER TABLE ju_runtime_gateway_logs
  DROP CONSTRAINT IF EXISTS ju_runtime_gateway_logs_lead_id_fkey,
  DROP CONSTRAINT IF EXISTS ju_runtime_gateway_logs_deal_id_fkey,
  DROP CONSTRAINT IF EXISTS ju_runtime_gateway_logs_conversation_id_fkey;
