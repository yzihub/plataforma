#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
source tests/runtime-e2e/runtime_e2e_lib.sh
require_deps
print_context

payload_array="$OUT_DIR/03_invalid_array.json"
printf '[]\n' > "$payload_array"
request_json "03_payload_validation_array" POST "$TURN_URL" "$payload_array" auth >/dev/null
assert_status "03_payload_validation_array" 400
assert_jq "03_payload_validation_array" '.ok == false and has("error")'

payload_missing_id="$OUT_DIR/03_missing_message_id.json"
jq -n --arg tenant_id "$TENANT_ID" --arg conversation_id "$(new_uuid 302)" '{
  tenant_id: $tenant_id,
  conversation_id: $conversation_id,
  data: {
    key: { remoteJid: "5583999990002@s.whatsapp.net", fromMe: false },
    message: { conversation: "payload sem id de mensagem" }
  }
}' > "$payload_missing_id"
request_json "03_payload_validation_missing_message_id" POST "$TURN_URL" "$payload_missing_id" auth >/dev/null
assert_status "03_payload_validation_missing_message_id" 400
assert_jq "03_payload_validation_missing_message_id" '.ok == false and .error == "message_id is required"'

echo "expected logs: runtime_request_completed status_code=400"
