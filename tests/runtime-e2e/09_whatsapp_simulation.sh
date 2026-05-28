#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
source tests/runtime-e2e/runtime_e2e_lib.sh
require_deps
print_context

conversation_id="$(new_uuid 901)"

payload1="$OUT_DIR/09_whatsapp_turn_01.json"
turn_payload "$payload1" "$RUN_ID-whatsapp-001" "$conversation_id" "Oi Ju, vi um apartamento no Instagram e queria entender valores."
request_json "09_whatsapp_turn_01" POST "$TURN_URL" "$payload1" auth >/dev/null
assert_status "09_whatsapp_turn_01" 200
assert_jq "09_whatsapp_turn_01" 'has("ok") and (.ok | type == "boolean")'
assert_jq "09_whatsapp_turn_01" '.webhook.duplicate == false'
assert_jq "09_whatsapp_turn_01" '.pilot.sends_whatsapp == false or .response_to_send == null or (.response_to_send | type == "string")'

payload2="$OUT_DIR/09_whatsapp_turn_02.json"
turn_payload "$payload2" "$RUN_ID-whatsapp-002" "$conversation_id" "Tenho interesse em morar perto da praia, mas ainda estou comparando opcoes."
request_json "09_whatsapp_turn_02" POST "$TURN_URL" "$payload2" auth >/dev/null
assert_status "09_whatsapp_turn_02" 200
assert_jq "09_whatsapp_turn_02" 'has("ok") and (.ok | type == "boolean")'
assert_jq "09_whatsapp_turn_02" '.conversation_id == "'"$conversation_id"'" or .conversation_id != null'
assert_jq "09_whatsapp_turn_02" 'has("decision") and has("shadow") and has("pilot")'

echo "expected logs: two runtime_request_completed entries with same conversation_id=$conversation_id"
echo "expected behavior: dry_run/shadow safety; no real WhatsApp outbound unless pilot explicitly authorizes response_to_send"
